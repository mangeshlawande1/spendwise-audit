import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/audit-engine";
import { generateAISummary, buildFallbackSummary } from "@/lib/ai-summary";
import { saveAuditToDb, getAuditExtendedFromDb, getAuditFromDb } from "@/lib/supabase";
import { saveAudit, getAudit } from "@/lib/audit-store";
import { getCurrentSnapshot } from "@/lib/pricing-diff";
import type {
  ApiResponse,
  AuditResult,
  ReauditResponse,
  ReauditDiff,
  ToolDiff,
} from "@/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const originalId = params.id;

    // ── 1. Fetch original audit ────────────────────────────────────────────
    const original =
      (await getAuditExtendedFromDb(originalId)) ??
      (await getAuditFromDb(originalId)) ??
      getAudit(originalId);

    if (!original) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "Original audit not found" },
        { status: 404 }
      );
    }

    // ── 2. Re-run audit with same formData (different pricing snapshot) ────
    const freshResult = runAudit(original.formData);

    // ── 3. Generate AI summary for fresh result ────────────────────────────
    const aiSummary = await generateAISummary(freshResult);
    const fullFresh: AuditResult = {
      ...freshResult,
      aiSummary: aiSummary ?? buildFallbackSummary(freshResult),
    };

    // ── 4. Save fresh audit linked to original ─────────────────────────────
    const pricingSnapshot = getCurrentSnapshot();
    const saved = await saveAuditToDb(fullFresh, {
      userEmail: (original as any).userEmail,
      pricingSnapshot,
      parentAuditId: originalId,
    });
    if (!saved) {
      saveAudit(fullFresh);
    }

    // ── 5. Compute diff ────────────────────────────────────────────────────
    const toolDiffs: ToolDiff[] = [];

    for (const freshTool of fullFresh.toolResults) {
      const origTool = original.toolResults.find(
        (r) => r.toolEntry.toolId === freshTool.toolEntry.toolId
      );
      if (!origTool) continue;

      const recChanged =
        origTool.recommendationType !== freshTool.recommendationType;
      const savingsChanged =
        Math.abs(origTool.monthlySavings - freshTool.monthlySavings) >= 1;

      if (recChanged || savingsChanged) {
        toolDiffs.push({
          toolId: freshTool.toolEntry.toolId,
          toolName: freshTool.toolName,
          oldRecommendation: origTool.recommendationType,
          newRecommendation: freshTool.recommendationType,
          oldMonthlySavings: origTool.monthlySavings,
          newMonthlySavings: freshTool.monthlySavings,
          oldReasoning: origTool.reasoning,
          newReasoning: freshTool.reasoning,
        });
      }
    }

    const savingsDelta =
      fullFresh.totalMonthlySavings - original.totalMonthlySavings;

    const diff: ReauditDiff = {
      changedTools: toolDiffs.map((d) => d.toolId),
      savingsDelta,
      toolDiffs,
      crossToolDiffs: [],
    };

    const response: ReauditResponse = {
      newAuditId: fullFresh.id,
      original,
      fresh: fullFresh,
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
