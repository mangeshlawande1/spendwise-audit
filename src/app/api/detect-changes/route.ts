import { NextRequest, NextResponse } from "next/server";
import {
  getAuditsWithEmail,
  getRecentPricingEvent,
  savePricingEvent,
} from "@/lib/supabase";
import {
  getCurrentSnapshot,
  diffSnapshots,
  findAffectedAudits,
} from "@/lib/pricing-diff";
import { sendPricingChangeEmail } from "@/lib/email";
import { TOOL_MAP } from "@/lib/pricing-data";
import type { ApiResponse, ToolId } from "@/types";

interface DetectChangesResult {
  hasChanges: boolean;
  changedTools: string[];
  affectedAudits: number;
  emailsSent: number;
  eventId?: string;
  skipped?: boolean;
  skipReason?: string;
}

export async function POST(req: NextRequest) {
  // ── Auth: require x-cron-secret header ────────────────────────────────────
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // ── Optional: simulate a price change for demo purposes ────────────────
    // GET /api/detect-changes?simulate=cursor bumps cursor_business by $5 in memory.
    // REMOVE before production.
    const url = new URL(req.url);
    const simulateToolId = url.searchParams.get("simulate");

    const currentSnapshot = getCurrentSnapshot();

    if (simulateToolId) {
      const tool = currentSnapshot.tools.find((t) => t.id === simulateToolId);
      if (tool && tool.plans.length > 0) {
        // Bump first non-zero plan by $5 for simulation
        const plan = tool.plans.find((p) => p.pricePerSeat > 0);
        if (plan) plan.pricePerSeat += 5;
      }
    }

    // ── 1. Load all audits with a stored email ────────────────────────────
    const audits = await getAuditsWithEmail();

    if (audits.length === 0) {
      return NextResponse.json<ApiResponse<DetectChangesResult>>({
        data: {
          hasChanges: false,
          changedTools: [],
          affectedAudits: 0,
          emailsSent: 0,
          skipReason: "No audits with email found",
        },
      });
    }

    // ── 2. Diff each audit's stored snapshot against current pricing ──────
    // Collect global changed tool IDs (union across all audits)
    const globalChangedToolIds = new Set<string>();
    const auditDiffs = new Map<
      string,
      { changedToolIds: string[]; auditCreatedAt: string }
    >();

    for (const audit of audits) {
      if (!audit.pricing_snapshot) continue;
      const diff = diffSnapshots(audit.pricing_snapshot, currentSnapshot);
      if (diff.hasChanges) {
        diff.changedToolIds.forEach((id) => globalChangedToolIds.add(id));
        auditDiffs.set(audit.id, {
          changedToolIds: diff.changedToolIds,
          auditCreatedAt: audit.created_at,
        });
      }
    }

    const changedToolIds = [...globalChangedToolIds];

    if (changedToolIds.length === 0) {
      return NextResponse.json<ApiResponse<DetectChangesResult>>({
        data: {
          hasChanges: false,
          changedTools: changedToolIds,
          affectedAudits: 0,
          emailsSent: 0,
        },
      });
    }

    // ── 3. Deduplication: skip if already notified in last 24h ────────────
    const alreadyNotified = await getRecentPricingEvent(changedToolIds);
    if (alreadyNotified) {
      return NextResponse.json<ApiResponse<DetectChangesResult>>({
        data: {
          hasChanges: true,
          changedTools: changedToolIds,
          affectedAudits: 0,
          emailsSent: 0,
          skipped: true,
          skipReason: "already_notified_in_last_24h",
        },
      });
    }

    // ── 4. Find affected audits and group by email ─────────────────────────
    const affectedAudits = findAffectedAudits(
      audits.map((a) => ({
        id: a.id,
        user_email: a.user_email,
        form_data: a.form_data,
        pricing_snapshot: a.pricing_snapshot,
      })),
      changedToolIds
    );

    // Group by email — one email per user (use their most recent affected audit)
    const emailToAudit = new Map<
      string,
      { auditId: string; auditCreatedAt: string }
    >();
    for (const affected of affectedAudits) {
      if (!emailToAudit.has(affected.email)) {
        const auditDiff = auditDiffs.get(affected.id);
        emailToAudit.set(affected.email, {
          auditId: affected.id,
          auditCreatedAt: auditDiff?.auditCreatedAt ?? new Date().toISOString(),
        });
      }
    }

    const affectedEmails = [...emailToAudit.keys()];

    // ── 5. Build the global changes list for the email ─────────────────────
    // Use a representative snapshot — take first audit with a snapshot
    const representativeAudit = audits.find((a) => a.pricing_snapshot);
    const globalDiff = representativeAudit?.pricing_snapshot
      ? diffSnapshots(representativeAudit.pricing_snapshot, currentSnapshot)
      : null;

    const changes = globalDiff?.changes ?? [];

    // ── 6. Send one email per unique user email ────────────────────────────
    let emailsSent = 0;
    for (const [email, { auditId, auditCreatedAt }] of emailToAudit) {
      const auditRecord = audits.find((a) => a.id === auditId);
      const toolIdsInAudit = auditRecord?.form_data.tools.map((t) => t.toolId) ?? [];
      const affectedToolNames = changedToolIds
        .filter((id) => toolIdsInAudit.includes(id as ToolId))
        .map((id) => TOOL_MAP.get(id as ToolId)?.name ?? id);

      try {
        const sent = await sendPricingChangeEmail({
          email,
          auditId,
          auditCreatedAt,
          changes,
          affectedToolNames,
        });
        if (sent) emailsSent++;
      } catch (err) {
        console.error(`[detect-changes] Failed to send email to ${email}:`, err);
        // Continue — one failure should not stop the rest
      }
    }

    // ── 7. Log the event for deduplication ────────────────────────────────
    const oldSnapshot = audits.find((a) => a.pricing_snapshot)?.pricing_snapshot!;
    const eventId = await savePricingEvent({
      snapshotBefore: oldSnapshot,
      snapshotAfter: currentSnapshot,
      changedTools: changedToolIds,
      affectedEmails,
      emailsSent,
    });

    return NextResponse.json<ApiResponse<DetectChangesResult>>({
      data: {
        hasChanges: true,
        changedTools: changedToolIds,
        affectedAudits: affectedAudits.length,
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
