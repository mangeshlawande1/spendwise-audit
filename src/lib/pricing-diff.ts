import { TOOLS, TOOL_MAP } from "@/lib/pricing-data";
import type { ToolId } from "@/types";
import type {
  PricingSnapshot,
  PlanChange,
  SnapshotDiff,
  AuditFormData,
} from "@/types";

// ─── Snapshot capture ─────────────────────────────────────────────────────────

/**
 * Capture current state of TOOLS array as a storable JSON snapshot.
 * Call this at audit-creation time and store alongside the audit record.
 */
export function getCurrentSnapshot(): PricingSnapshot {
  return {
    capturedAt: new Date().toISOString(),
    tools: TOOLS.map((tool) => ({
      id: tool.id,
      plans: tool.plans.map((plan) => ({
        id: plan.id,
        pricePerSeat: plan.pricePerSeat,
      })),
    })),
  };
}

// ─── Diff logic ───────────────────────────────────────────────────────────────

/**
 * Compare a stored snapshot against the current pricing.
 * Returns a diff describing what changed.
 */
export function diffSnapshots(
  old: PricingSnapshot,
  current: PricingSnapshot
): SnapshotDiff {
  const changes: PlanChange[] = [];

  for (const currentTool of current.tools) {
    const oldTool = old.tools.find((t) => t.id === currentTool.id);
    const toolDef = TOOL_MAP.get(currentTool.id as ToolId);

    // Skip brand-new tools — not a pricing change for existing users
    if (!oldTool) continue;

    for (const currentPlan of currentTool.plans) {
      const oldPlan = oldTool.plans.find((p) => p.id === currentPlan.id);

      if (!oldPlan) {
        // New plan added to an existing tool
        const planDef = toolDef?.plans.find((p) => p.id === currentPlan.id);
        changes.push({
          toolId: currentTool.id,
          toolName: toolDef?.name ?? currentTool.id,
          planId: currentPlan.id,
          planName: planDef?.name ?? currentPlan.id,
          oldPrice: 0,
          newPrice: currentPlan.pricePerSeat,
          delta: currentPlan.pricePerSeat,
          changeType: "plan_added",
        });
        continue;
      }

      if (oldPlan.pricePerSeat !== currentPlan.pricePerSeat) {
        const planDef = toolDef?.plans.find((p) => p.id === currentPlan.id);
        changes.push({
          toolId: currentTool.id,
          toolName: toolDef?.name ?? currentTool.id,
          planId: currentPlan.id,
          planName: planDef?.name ?? currentPlan.id,
          oldPrice: oldPlan.pricePerSeat,
          newPrice: currentPlan.pricePerSeat,
          delta: currentPlan.pricePerSeat - oldPlan.pricePerSeat,
          changeType: "price_change",
        });
      }
    }

    // Check for removed plans
    for (const oldPlan of oldTool.plans) {
      const stillExists = currentTool.plans.find((p) => p.id === oldPlan.id);
      if (!stillExists) {
        const planDef = toolDef?.plans.find((p) => p.id === oldPlan.id);
        changes.push({
          toolId: currentTool.id,
          toolName: toolDef?.name ?? currentTool.id,
          planId: oldPlan.id,
          planName: planDef?.name ?? oldPlan.id,
          oldPrice: oldPlan.pricePerSeat,
          newPrice: 0,
          delta: -oldPlan.pricePerSeat,
          changeType: "plan_removed",
        });
      }
    }
  }

  const changedToolIds = [...new Set(changes.map((c) => c.toolId))];

  return {
    hasChanges: changes.length > 0,
    changes,
    changedToolIds,
  };
}

// ─── Affected audit finder ────────────────────────────────────────────────────

/**
 * Which audits reference any of the changed tool IDs?
 * Returns unique (auditId, email) pairs, skipping audits without an email.
 */
export function findAffectedAudits(
  audits: Array<{
    id: string;
    user_email: string | null;
    form_data: AuditFormData;
    pricing_snapshot: PricingSnapshot | null;
  }>,
  changedToolIds: string[]
): Array<{ id: string; email: string; snapshot: PricingSnapshot }> {
  const changedSet = new Set(changedToolIds);

  return audits
    .filter(
      (audit) =>
        audit.user_email &&
        audit.pricing_snapshot &&
        audit.form_data.tools.some((t) => changedSet.has(t.toolId))
    )
    .map((audit) => ({
      id: audit.id,
      email: audit.user_email!,
      snapshot: audit.pricing_snapshot!,
    }));
}
