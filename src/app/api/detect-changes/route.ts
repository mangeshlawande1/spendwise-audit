import { NextRequest, NextResponse } from "next/server";
import {
  getAuditsWithEmail,
  getRecentPricingEvent,
  savePricingEvent,
} from "@/lib/supabase";
import {
  getCurrentSnapshot,
  findAffectedAudits,
} from "@/lib/pricing-diff";
import { sendPricingChangeEmail } from "@/lib/email";
import type {
  ApiResponse,
  DetectChangesResponse,
  PlanChange,
  PricingSnapshot,
} from "@/types";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────────
    const secret = req.headers.get("x-cron-secret");
    const expected = process.env.CRON_SECRET;
    if (expected && secret !== expected) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const simulateTool = url.searchParams.get("simulate");

    // ── Current snapshot (real pricing) ───────────────────────────────────────
    const currentSnapshot = getCurrentSnapshot();

    // ── Load audits with email + snapshot from DB ──────────────────────────────
    let audits = await getAuditsWithEmail();

    if (audits.length === 0) {
      return NextResponse.json<ApiResponse<DetectChangesResponse>>({
        data: {
          hasChanges: false,
          changedTools: [],
          affectedAudits: 0,
          emailsSent: 0,
          skipReason: "No audits with email found",
        },
      });
    }

    // ── SIMULATE MODE ──────────────────────────────────────────────────────────
    // When ?simulate=<toolId> is passed, we patch the stored snapshots of all
    // matching audits to look like they were created at old (higher) prices.
    // This makes diffSnapshots() detect a real delta vs current pricing.
    // Safe: only modifies the in-memory audit objects for this request.
    if (simulateTool) {
      audits = audits.map((audit) => {
        if (!audit.pricing_snapshot) return audit;
        // Check if this audit uses the tool we're simulating
        const usesTool = audit.form_data.tools.some(
          (t) => t.toolId === simulateTool
        );
        if (!usesTool) return audit;

        // Patch the stored snapshot to show the price was $5 higher in the past
        const patchedSnapshot: PricingSnapshot = {
          ...audit.pricing_snapshot,
          tools: audit.pricing_snapshot.tools.map((t) => {
            if (t.id !== simulateTool) return t;
            return {
              ...t,
              plans: t.plans.map((p, idx) => {
                if (idx !== 0) return p; // only patch the first plan
                return { ...p, pricePerSeat: p.pricePerSeat + 5 };
              }),
            };
          }),
        };

        console.log(
          `[detect-changes] SIMULATE: audit ${audit.id} — patched stored ` +
          `${simulateTool} plan[0] +$5 to fake an old snapshot`
        );

        return { ...audit, pricing_snapshot: patchedSnapshot };
      });
    }

    // ── Detect which audits are affected ───────────────────────────────────────
    const affected = findAffectedAudits(audits, currentSnapshot);

    if (affected.length === 0) {
      return NextResponse.json<ApiResponse<DetectChangesResponse>>({
        data: {
          hasChanges: false,
          changedTools: [],
          affectedAudits: 0,
          emailsSent: 0,
          skipReason: simulateTool
            ? `No audits in DB use the tool "${simulateTool}" — submit an audit with that tool first`
            : "No pricing changes detected",
        },
      });
    }

    // ── Collect changed tool IDs ───────────────────────────────────────────────
    const allChangedToolIds = Array.from(
      new Set<string>(affected.flatMap((a) => a.changes.map((c) => c.toolId)))
    );

    // ── Deduplication (skip in simulate mode) ─────────────────────────────────
    if (!simulateTool) {
      const alreadySent = await getRecentPricingEvent(allChangedToolIds);
      if (alreadySent) {
        return NextResponse.json<ApiResponse<DetectChangesResponse>>({
          data: {
            hasChanges: true,
            changedTools: allChangedToolIds,
            affectedAudits: affected.length,
            emailsSent: 0,
            skipped: true,
            skipReason: "Already notified in last 24h",
          },
        });
      }
    }

    // ── Group by email — one email per user ────────────────────────────────────
    const byEmail = new Map<
      string,
      { auditId: string; toolNames: string[]; changes: PlanChange[] }
    >();

    for (const a of affected) {
      const existing = byEmail.get(a.email);
      const toolNames = Array.from(new Set<string>(a.changes.map((c) => c.toolName)));

      if (!existing) {
        byEmail.set(a.email, { auditId: a.id, toolNames, changes: a.changes });
      } else {
        existing.toolNames = Array.from(
          new Set<string>([...existing.toolNames, ...toolNames])
        );
        existing.changes = [...existing.changes, ...a.changes];
      }
    }

    // ── Send emails ────────────────────────────────────────────────────────────
    let emailsSent = 0;
    const notifiedEmails: string[] = [];

    for (const [email, payload] of Array.from(byEmail.entries())) {
      const sent = await sendPricingChangeEmail(
        email,
        payload.auditId,
        payload.toolNames,
        payload.changes
      );
      if (sent) {
        emailsSent++;
        notifiedEmails.push(email);
      }
    }

    // ── Log pricing event (dedup guard for future calls) ─────────────────────
    const beforeSnapshot: PricingSnapshot =
      audits[0].pricing_snapshot ?? {
        capturedAt: new Date(Date.now() - 86400000).toISOString(),
        tools: [],
      };

    const eventId = await savePricingEvent({
      snapshotBefore: beforeSnapshot,
      snapshotAfter: currentSnapshot,
      changedTools: allChangedToolIds,
      affectedEmails: notifiedEmails,
      emailsSent,
    });

    return NextResponse.json<ApiResponse<DetectChangesResponse>>({
      data: {
        hasChanges: true,
        changedTools: allChangedToolIds,
        affectedAudits: affected.length,
        emailsSent,
        eventId: eventId ?? undefined,
      },
    });
  } catch (err) {
    console.error("[/api/detect-changes] Error:", err);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET handler: browser-friendly test trigger ───────────────────────────────
// Visit http://localhost:3000/api/detect-changes?simulate=cursor&secret=test123
// This lets you test without curl.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Unauthorized — add ?secret=YOUR_CRON_SECRET to the URL" },
      { status: 401 }
    );
  }

  // Reuse POST logic by forwarding to POST handler with same URL
  // but inject x-cron-secret header from query param
  const headers = new Headers(req.headers);
  if (secret) headers.set("x-cron-secret", secret);

  const syntheticReq = new NextRequest(req.url, {
    method: "POST",
    headers,
  });

  // Re-invoke the POST handler
  return POST(syntheticReq);
}
