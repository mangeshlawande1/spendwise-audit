/**
 * pricing-diff.ts
 * Round 2: Pricing change detection logic.
 *
 * getAllSnapshot()     — captures current TOOLS array as a storable snapshot
 * diffSnapshots()     — compares old (DB) vs current snapshot
 * findAffectedAudits()— filters audits that use any changed tool
 * computeReauditDiff()— produces a per-tool diff between two AuditResults
 */

import { TOOLS, TOOL_MAP } from "./pricing-data";
import type {
  AuditResult,
  AuditFormData,
  PlanChange,
  PricingSnapshot,
  ReauditDiff,
  SnapshotDiff,
  ToolDiffEntry,
  ToolId,
} from "@/types";

// ─── Snapshot capture ─────────────────────────────────────────────────────────

export function getCurrentSnapshot(): PricingSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    tools: TOOLS.map((tool) => ({
      id: tool.id,
      plans: tool.plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        pricePerSeat: plan.pricePerSeat,
      })),
    })),
  };
}

// ─── Snapshot diff ────────────────────────────────────────────────────────────

export function diffSnapshots(
  old: PricingSnapshot,
  current: PricingSnapshot
): SnapshotDiff {
  const changes: PlanChange[] = [];

  for (const currentTool of current.tools) {
    const oldTool = old.tools.find((t) => t.id === currentTool.id);
    const toolDef = TOOL_MAP.get(currentTool.id as ToolId);
    const toolName = toolDef?.name ?? currentTool.id;

    // New tool entirely — not a pricing change, skip
    if (!oldTool) continue;

    for (const currentPlan of currentTool.plans) {
      const oldPlan = oldTool.plans.find((p) => p.id === currentPlan.id);

      if (!oldPlan) {
        // Plan was added to an existing tool
        changes.push({
          toolId: currentTool.id,
          toolName,
          planId: currentPlan.id,
          planName: currentPlan.name,
          oldPrice: 0,
          newPrice: currentPlan.pricePerSeat,
          delta: currentPlan.pricePerSeat,
          changeType: "plan_added",
        });
        continue;
      }

      if (oldPlan.pricePerSeat !== currentPlan.pricePerSeat) {
        changes.push({
          toolId: currentTool.id,
          toolName,
          planId: currentPlan.id,
          planName: currentPlan.name,
          oldPrice: oldPlan.pricePerSeat,
          newPrice: currentPlan.pricePerSeat,
          delta: currentPlan.pricePerSeat - oldPlan.pricePerSeat,
          changeType: "price_change",
        });
      }
    }

    // Plans removed from existing tool
    for (const oldPlan of oldTool.plans) {
      const stillExists = currentTool.plans.find((p) => p.id === oldPlan.id);
      if (!stillExists) {
        changes.push({
          toolId: currentTool.id,
          toolName,
          planId: oldPlan.id,
          planName: oldPlan.name,
          oldPrice: oldPlan.pricePerSeat,
          newPrice: 0,
          delta: -oldPlan.pricePerSeat,
          changeType: "plan_removed",
        });
      }
    }
  }

  const changedToolIds = Array.from(new Set(changes.map((c) => c.toolId)));

  return {
    hasChanges: changes.length > 0,
    changes,
    changedToolIds,
  };
}

// ─── Find affected audits ─────────────────────────────────────────────────────

export function findAffectedAudits(
  audits: Array<{
    id: string;
    user_email: string | null;
    form_data: AuditFormData;
    pricing_snapshot: PricingSnapshot | null;
  }>,
  currentSnapshot: PricingSnapshot
): Array<{ id: string; email: string; changes: PlanChange[] }> {
  const affected: Array<{ id: string; email: string; changes: PlanChange[] }> = [];

  for (const audit of audits) {
    if (!audit.user_email) continue;
    if (!audit.pricing_snapshot) continue;

    const diff = diffSnapshots(audit.pricing_snapshot, currentSnapshot);
    if (!diff.hasChanges) continue;

    // Only flag audits that actually USE the changed tools
    const auditToolIds = new Set(audit.form_data.tools.map((t) => t.toolId));
    const relevantChanges = diff.changes.filter((c) =>
      auditToolIds.has(c.toolId as ToolId)
    );

    if (relevantChanges.length > 0) {
      affected.push({
        id: audit.id,
        email: audit.user_email,
        changes: relevantChanges,
      });
    }
  }

  return affected;
}

// ─── Compute re-audit diff ────────────────────────────────────────────────────

export function computeReauditDiff(
  original: AuditResult,
  fresh: AuditResult
): ReauditDiff {
  const toolDiffs: ToolDiffEntry[] = [];

  for (const freshResult of fresh.toolResults) {
    const toolId = freshResult.toolEntry.toolId;
    const originalResult = original.toolResults.find(
      (r) => r.toolEntry.toolId === toolId
    );

    if (!originalResult) continue;

    const savingsDelta = freshResult.monthlySavings - originalResult.monthlySavings;
    const changed =
      freshResult.recommendationType !== originalResult.recommendationType ||
      Math.abs(savingsDelta) >= 1;

    toolDiffs.push({
      toolId,
      toolName: freshResult.toolName,
      planName: freshResult.planName,
      oldRecommendationType: originalResult.recommendationType,
      newRecommendationType: freshResult.recommendationType,
      oldMonthlySavings: originalResult.monthlySavings,
      newMonthlySavings: freshResult.monthlySavings,
      savingsDelta,
      oldReasoning: originalResult.reasoning,
      newReasoning: freshResult.reasoning,
      changed,
    });
  }

  // Sort: changed tools first, then by savings delta descending
  toolDiffs.sort((a, b) => {
    if (a.changed !== b.changed) return a.changed ? -1 : 1;
    return Math.abs(b.savingsDelta) - Math.abs(a.savingsDelta);
  });

  const totalSavingsDelta =
    fresh.totalMonthlySavings - original.totalMonthlySavings;

  return {
    savingsDelta: totalSavingsDelta,
    toolDiffs,
    changedToolCount: toolDiffs.filter((d) => d.changed).length,
    hasImprovements: totalSavingsDelta > 0,
  };
}
