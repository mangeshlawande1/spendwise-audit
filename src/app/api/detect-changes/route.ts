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

// ─── Auth helper ──────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  // POST: check x-cron-secret header
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === expected) return true;

  // GET: check ?secret= query param (browser-friendly)
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === expected;
}

// ─── Core handler (shared between POST and GET) ───────────────────────────────

async function handleDetectChanges(req: NextRequest): Promise<Response> {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "Unauthorized — set x-cron-secret header or ?secret= param" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const simulateTool = url.searchParams.get("simulate");

    // ── Current snapshot (real pricing from pricing-data.ts) ──────────────────
    const currentSnapshot = getCurrentSnapshot();

    // ── Load original audits with email + snapshot from DB ────────────────────
    // getAuditsWithEmail() already filters: user_email IS NOT NULL AND parent_audit_id IS NULL
    let audits = await getAuditsWithEmail();

    if (audits.length === 0) {
      return NextResponse.json<ApiResponse<DetectChangesResponse>>({
        data: {
          hasChanges: false,
          changedTools: [],
          affectedAudits: 0,
          emailsSent: 0,
          skipReason: "No audits with email found — submit an audit and enter your email first",
        },
      });
    }

    // ── SIMULATE MODE ─────────────────────────────────────────────────────────
    // ?simulate=<toolId> patches each matching audit's stored snapshot in memory
    // to show plan[0].pricePerSeat was $5 higher at audit time. This makes
    // diffSnapshots() detect a real delta against current pricing.
    // NEVER writes to the database — safe to run as many times as needed.
    if (simulateTool) {
      audits = audits.map((audit) => {
        if (!audit.pricing_snapshot) return audit;
        const usesTool = audit.form_data.tools.some((t) => t.toolId === simulateTool);
        if (!usesTool) return audit;

        const patchedSnapshot: PricingSnapshot = {
          ...audit.pricing_snapshot,
          tools: audit.pricing_snapshot.tools.map((t) => {
            if (t.id !== simulateTool) return t;
            return {
              ...t,
              plans: t.plans.map((p, idx) => {
                if (idx !== 0) return p;
                return { ...p, pricePerSeat: p.pricePerSeat + 5 };
              }),
            };
          }),
        };

        console.log(
          `[detect-changes] SIMULATE: audit ${audit.id} — ${simulateTool} plan[0] +$5`
        );
        return { ...audit, pricing_snapshot: patchedSnapshot };
      });
    }

    // ── Detect which audits are affected by pricing changes ───────────────────
    const affected = findAffectedAudits(audits, currentSnapshot);

    if (affected.length === 0) {
      return NextResponse.json<ApiResponse<DetectChangesResponse>>({
        data: {
          hasChanges: false,
          changedTools: [],
          affectedAudits: 0,
          emailsSent: 0,
          skipReason: simulateTool
            ? `No audits in DB use "${simulateTool}" — submit an audit with that tool first`
            : "No pricing changes detected",
        },
      });
    }

    // ── Collect all changed tool IDs across affected audits ───────────────────
    const allChangedToolIds = Array.from(
      new Set<string>(affected.flatMap((a) => a.changes.map((c) => c.toolId)))
    );

    // ── Deduplication: skip if already notified in last 24h (real mode only) ──
    // Simulate mode always bypasses dedup so testing is always repeatable.
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
            skipReason: "Already notified in last 24h — delete latest pricing_events row to retry",
          },
        });
      }
    }

    // ── Group by email — exactly one email per unique user email ──────────────
    // If a user has multiple affected audits, merge their changes into one email.
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

    // ── Send emails ───────────────────────────────────────────────────────────
    // Each sendPricingChangeEmail is awaited — unlike the leads confirmation
    // email, this runs in a long-lived endpoint (not cut short by a response).
    let emailsSent = 0;
    const notifiedEmails: string[] = [];

    for (const [email, payload] of Array.from(byEmail.entries())) {
      try {
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
      } catch (err) {
        // One failure must never stop the rest. Log and continue.
        const masked = email.replace(/(^.).*(@.*$)/, "$1***$2");
        console.error(`[detect-changes] Email failed for ${masked}:`, err);      
      }
    }

    // ── Log pricing event for dedup guard ─────────────────────────────────────
    // Also log in simulate mode — useful for checking the event table in Supabase.
    const beforeSnapshot: PricingSnapshot =
      audits[0].pricing_snapshot ?? {
        capturedAt: new Date(Date.now() - 86400000).toISOString(),
        tools: [],
      };

    const eventId = simulateTool
      ? null
      : await savePricingEvent({
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

// ─── POST handler (used by Vercel Cron and curl) ──────────────────────────────
export async function POST(req: NextRequest) {
  return handleDetectChanges(req);
}

// ─── GET handler (browser-friendly — used by /admin page) ────────────────────
// Visit: /api/detect-changes?simulate=cursor&secret=test123
export async function GET(req: NextRequest) {
  return handleDetectChanges(req);
}
