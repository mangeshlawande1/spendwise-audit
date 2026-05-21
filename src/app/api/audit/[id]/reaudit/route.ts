import { NextRequest, NextResponse } from "next/server";
import { getAudit } from "@/lib/audit-store";
import { getAuditFromDb, getAuditRowFromDb, saveReauditToDb } from "@/lib/supabase";
import { runAudit } from "@/lib/audit-engine";
import { generateAISummary, buildFallbackSummary } from "@/lib/ai-summary";
import { getCurrentSnapshot, computeReauditDiff } from "@/lib/pricing-diff";
import type { ApiResponse, AuditResult, ReauditResponse } from "@/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Fetch original audit (full result for diff) + raw row (for user_email)
    const original = (await getAuditFromDb(id)) ?? getAudit(id) ?? null;
    if (!original) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "Original audit not found" },
        { status: 404 }
      );
    }

    // BUG FIX 5: Re-audits were saved without user_email, so a second
    // detect-changes run would miss re-audit rows. Carry email forward
    // from the original audit's DB row.
    const originalRow = await getAuditRowFromDb(id);
    const userEmail = originalRow?.user_email ?? undefined;

    // 2. Re-run same formData through existing engine (same logic, current prices)
    const freshRaw = runAudit(original.formData);

    // 3. AI summary (non-blocking — falls back to template on failure)
    const freshAiSummary = await generateAISummary(freshRaw);
    const fresh: AuditResult = {
      ...freshRaw,
      aiSummary: freshAiSummary ?? buildFallbackSummary(freshRaw),
    };

    // 4. Snapshot current prices
    const pricingSnapshot = getCurrentSnapshot();

    // 5. Save re-audit linked to original, carrying user_email forward
    await saveReauditToDb(fresh, id, userEmail, pricingSnapshot);

    // 6. Compute diff
    const diff = computeReauditDiff(original, fresh);

    const response: ReauditResponse = {
      newAuditId: fresh.id,
      original,
      fresh,
      diff,
    };

    return NextResponse.json<ApiResponse<ReauditResponse>>({ data: response });
  } catch (err) {
    console.error("[/api/audit/[id]/reaudit] Error:", err);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
