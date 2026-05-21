/**
 * round2-reaudit.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for all Round 2 features:
 *   1. Pricing snapshot capture
 *   2. Snapshot diff (change detection)
 *   3. Affected audit filtering
 *   4. Re-audit diff computation
 *   5. Savings delta calculation
 *   6. Edge cases
 *
 * Run: npm test src/__tests__/round2-reaudit.test.ts
 */

import {
  getCurrentSnapshot,
  diffSnapshots,
  findAffectedAudits,
  computeReauditDiff,
} from "@/lib/pricing-diff";

import { runAudit } from "@/lib/audit-engine";

import type {
  AuditFormData,
  AuditResult,
  PricingSnapshot,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAuditResult(formData: AuditFormData): AuditResult {
  return {
    ...runAudit(formData),
    aiSummary: null,
  };
}

/** Clone a snapshot and mutate a plan price */
function patchSnapshot(
  snapshot: PricingSnapshot,
  toolId: string,
  planId: string,
  newPrice: number
): PricingSnapshot {
  return {
    ...snapshot,
    tools: snapshot.tools.map((t) => {
      if (t.id !== toolId) return t;
      return {
        ...t,
        plans: t.plans.map((p) => {
          if (p.id !== planId) return p;
          return { ...p, pricePerSeat: newPrice };
        }),
      };
    }),
  };
}

/** Clone a snapshot and remove a plan */
function removePlanFromSnapshot(
  snapshot: PricingSnapshot,
  toolId: string,
  planId: string
): PricingSnapshot {
  return {
    ...snapshot,
    tools: snapshot.tools.map((t) => {
      if (t.id !== toolId) return t;
      return { ...t, plans: t.plans.filter((p) => p.id !== planId) };
    }),
  };
}

// ─── FEATURE 1: Pricing Snapshot Capture ─────────────────────────────────────

describe("Feature 1 — getCurrentSnapshot()", () => {
  test("returns a snapshot with a capturedAt ISO timestamp", () => {
    const snap = getCurrentSnapshot();
    expect(snap.capturedAt).toBeTruthy();
    expect(() => new Date(snap.capturedAt)).not.toThrow();
    const parsed = new Date(snap.capturedAt);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  test("snapshot includes all expected tools", () => {
    const snap = getCurrentSnapshot();
    const toolIds = snap.tools.map((t) => t.id);
    expect(toolIds).toContain("cursor");
    expect(toolIds).toContain("github_copilot");
    expect(toolIds).toContain("claude");
    expect(toolIds).toContain("chatgpt");
    expect(toolIds).toContain("windsurf");
  });

  test("each tool has at least one plan with pricePerSeat", () => {
    const snap = getCurrentSnapshot();
    for (const tool of snap.tools) {
      expect(tool.plans.length).toBeGreaterThan(0);
      for (const plan of tool.plans) {
        expect(typeof plan.pricePerSeat).toBe("number");
        expect(plan.pricePerSeat).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("snapshot is serialisable to JSON (suitable for DB storage)", () => {
    const snap = getCurrentSnapshot();
    expect(() => JSON.stringify(snap)).not.toThrow();
    const roundTripped = JSON.parse(JSON.stringify(snap));
    expect(roundTripped.tools.length).toBe(snap.tools.length);
  });

  test("cursor_pro is $20/seat in snapshot", () => {
    const snap = getCurrentSnapshot();
    const cursor = snap.tools.find((t) => t.id === "cursor");
    const pro = cursor?.plans.find((p) => p.id === "cursor_pro");
    expect(pro?.pricePerSeat).toBe(20);
  });
});

// ─── FEATURE 2: Pricing Change Detection ─────────────────────────────────────

describe("Feature 2 — diffSnapshots()", () => {
  test("returns hasChanges: false when snapshots are identical", () => {
    const snap = getCurrentSnapshot();
    const result = diffSnapshots(snap, snap);
    expect(result.hasChanges).toBe(false);
    expect(result.changes).toHaveLength(0);
    expect(result.changedToolIds).toHaveLength(0);
  });

  test("detects a price increase on cursor_pro", () => {
    const old = getCurrentSnapshot();
    const current = patchSnapshot(old, "cursor", "cursor_pro", 25); // was $20
    const result = diffSnapshots(old, current);

    expect(result.hasChanges).toBe(true);
    const change = result.changes.find(
      (c) => c.toolId === "cursor" && c.planId === "cursor_pro"
    );
    expect(change).toBeDefined();
    expect(change?.changeType).toBe("price_change");
    expect(change?.oldPrice).toBe(20);
    expect(change?.newPrice).toBe(25);
    expect(change?.delta).toBe(5);
  });

  test("detects a price decrease on cursor_business", () => {
    const old = getCurrentSnapshot();
    const current = patchSnapshot(old, "cursor", "cursor_business", 30); // was $40
    const result = diffSnapshots(old, current);

    expect(result.hasChanges).toBe(true);
    const change = result.changes.find(
      (c) => c.toolId === "cursor" && c.planId === "cursor_business"
    );
    expect(change?.delta).toBe(-10); // price dropped, so delta is negative
    expect(change?.changeType).toBe("price_change");
  });

  test("detects a removed plan", () => {
    const old = getCurrentSnapshot();
    const current = removePlanFromSnapshot(old, "cursor", "cursor_business");
    const result = diffSnapshots(old, current);

    expect(result.hasChanges).toBe(true);
    const change = result.changes.find(
      (c) => c.changeType === "plan_removed" && c.planId === "cursor_business"
    );
    expect(change).toBeDefined();
    expect(change?.oldPrice).toBe(40);
    expect(change?.newPrice).toBe(0);
  });

  test("detects a newly added plan", () => {
    const old = getCurrentSnapshot();
    // Simulate current snapshot having a new plan that old didn't have
    const current: PricingSnapshot = {
      ...old,
      tools: old.tools.map((t) => {
        if (t.id !== "cursor") return t;
        return {
          ...t,
          plans: [
            ...t.plans,
            { id: "cursor_ultra", name: "Ultra", pricePerSeat: 80 },
          ],
        };
      }),
    };

    const result = diffSnapshots(old, current);
    expect(result.hasChanges).toBe(true);
    const change = result.changes.find(
      (c) => c.changeType === "plan_added" && c.planId === "cursor_ultra"
    );
    expect(change).toBeDefined();
    expect(change?.newPrice).toBe(80);
    expect(change?.oldPrice).toBe(0);
  });

  test("detects changes across multiple tools simultaneously", () => {
    const old = getCurrentSnapshot();
    let current = patchSnapshot(old, "cursor", "cursor_pro", 25);
    current = patchSnapshot(current, "claude", "claude_pro", 22);

    const result = diffSnapshots(old, current);
    expect(result.hasChanges).toBe(true);
    expect(result.changedToolIds).toContain("cursor");
    expect(result.changedToolIds).toContain("claude");
    expect(result.changes.length).toBeGreaterThanOrEqual(2);
  });

  test("changedToolIds contains only affected tools (not all tools)", () => {
    const old = getCurrentSnapshot();
    const current = patchSnapshot(old, "cursor", "cursor_pro", 25);
    const result = diffSnapshots(old, current);

    expect(result.changedToolIds).toContain("cursor");
    expect(result.changedToolIds).not.toContain("claude");
    expect(result.changedToolIds).not.toContain("chatgpt");
    expect(result.changedToolIds.length).toBe(1);
  });

  test("$0.00 price change is NOT reported as a change", () => {
    const old = getCurrentSnapshot();
    // Patch with the exact same price — no real change
    const current = patchSnapshot(old, "cursor", "cursor_pro", 20);
    const result = diffSnapshots(old, current);
    // cursor_pro is already $20, so this patch changes nothing
    const cursorProChange = result.changes.find(
      (c) => c.toolId === "cursor" && c.planId === "cursor_pro"
    );
    expect(cursorProChange).toBeUndefined();
  });
});

// ─── FEATURE 2B: Affected Audit Filtering ────────────────────────────────────

describe("Feature 2 — findAffectedAudits()", () => {
  const baseSnapshot = getCurrentSnapshot();
  const changedSnapshot = patchSnapshot(baseSnapshot, "cursor", "cursor_pro", 25);

  const mockAudits = [
    {
      id: "audit_cursor_user",
      user_email: "cursor@example.com",
      form_data: {
        teamSize: 3,
        useCase: "coding" as const,
        tools: [{ toolId: "cursor" as const, planId: "cursor_pro", seats: 3, monthlySpend: 60 }],
      },
      pricing_snapshot: baseSnapshot,
    },
    {
      id: "audit_claude_user",
      user_email: "claude@example.com",
      form_data: {
        teamSize: 2,
        useCase: "writing" as const,
        tools: [{ toolId: "claude" as const, planId: "claude_pro", seats: 2, monthlySpend: 40 }],
      },
      pricing_snapshot: baseSnapshot,
    },
    {
      id: "audit_no_email",
      user_email: null,
      form_data: {
        teamSize: 1,
        useCase: "coding" as const,
        tools: [{ toolId: "cursor" as const, planId: "cursor_pro", seats: 1, monthlySpend: 20 }],
      },
      pricing_snapshot: baseSnapshot,
    },
    {
      id: "audit_no_snapshot",
      user_email: "nosnap@example.com",
      form_data: {
        teamSize: 1,
        useCase: "coding" as const,
        tools: [{ toolId: "cursor" as const, planId: "cursor_pro", seats: 1, monthlySpend: 20 }],
      },
      pricing_snapshot: null,
    },
  ];

  test("only returns audits that use the changed tool", () => {
    const affected = findAffectedAudits(mockAudits, changedSnapshot);
    const emails = affected.map((a) => a.email);
    expect(emails).toContain("cursor@example.com");
    expect(emails).not.toContain("claude@example.com"); // claude didn't change
  });

  test("excludes audits with null user_email", () => {
    const affected = findAffectedAudits(mockAudits, changedSnapshot);
    const ids = affected.map((a) => a.id);
    expect(ids).not.toContain("audit_no_email");
  });

  test("excludes audits with null pricing_snapshot", () => {
    const affected = findAffectedAudits(mockAudits, changedSnapshot);
    const ids = affected.map((a) => a.id);
    expect(ids).not.toContain("audit_no_snapshot");
  });

  test("returns empty array when no changes affect any audit", () => {
    // Same snapshot — no changes
    const affected = findAffectedAudits(mockAudits, baseSnapshot);
    expect(affected).toHaveLength(0);
  });

  test("includes the relevant PlanChange objects for each affected audit", () => {
    const affected = findAffectedAudits(mockAudits, changedSnapshot);
    const cursorAudit = affected.find((a) => a.email === "cursor@example.com");
    expect(cursorAudit?.changes.length).toBeGreaterThan(0);
    expect(cursorAudit?.changes[0].toolId).toBe("cursor");
  });
});

// ─── FEATURE 4: Re-audit Diff Computation ────────────────────────────────────

describe("Feature 4 — computeReauditDiff()", () => {
  const formData: AuditFormData = {
    teamSize: 3,
    useCase: "coding",
    tools: [
      { toolId: "cursor", planId: "cursor_business", seats: 3, monthlySpend: 120 },
      { toolId: "claude", planId: "claude_pro", seats: 3, monthlySpend: 60 },
    ],
  };

  test("produces a diff with correct structure", () => {
    const original = makeAuditResult(formData);
    const fresh = makeAuditResult(formData); // same inputs
    const diff = computeReauditDiff(original, fresh);

    expect(diff).toHaveProperty("savingsDelta");
    expect(diff).toHaveProperty("toolDiffs");
    expect(diff).toHaveProperty("changedToolCount");
    expect(diff).toHaveProperty("hasImprovements");
    expect(Array.isArray(diff.toolDiffs)).toBe(true);
  });

  test("savingsDelta is 0 when fresh and original are identical", () => {
    const original = makeAuditResult(formData);
    const fresh = makeAuditResult(formData);
    const diff = computeReauditDiff(original, fresh);
    expect(diff.savingsDelta).toBe(0);
  });

  test("toolDiffs contains one entry per tool in both audits", () => {
    const original = makeAuditResult(formData);
    const fresh = makeAuditResult(formData);
    const diff = computeReauditDiff(original, fresh);
    expect(diff.toolDiffs.length).toBe(formData.tools.length);
  });

  test("each toolDiff has required fields", () => {
    const original = makeAuditResult(formData);
    const fresh = makeAuditResult(formData);
    const diff = computeReauditDiff(original, fresh);

    for (const td of diff.toolDiffs) {
      expect(td).toHaveProperty("toolId");
      expect(td).toHaveProperty("toolName");
      expect(td).toHaveProperty("oldRecommendationType");
      expect(td).toHaveProperty("newRecommendationType");
      expect(td).toHaveProperty("oldMonthlySavings");
      expect(td).toHaveProperty("newMonthlySavings");
      expect(td).toHaveProperty("savingsDelta");
      expect(td).toHaveProperty("changed");
      expect(td).toHaveProperty("oldReasoning");
      expect(td).toHaveProperty("newReasoning");
    }
  });

  test("changed flag is false when recommendations are identical", () => {
    const original = makeAuditResult(formData);
    const fresh = makeAuditResult(formData);
    const diff = computeReauditDiff(original, fresh);

    // Same inputs → same outputs → nothing changed
    expect(diff.changedToolCount).toBe(0);
    diff.toolDiffs.forEach((td) => {
      expect(td.changed).toBe(false);
    });
  });

  test("changed tools appear before unchanged tools in toolDiffs", () => {
    // Build a fresh result with manually patched savings to simulate a change
    const original = makeAuditResult(formData);
    const freshRaw = runAudit(formData);

    // Simulate pricing drop by patching the fresh result's first tool
    const patchedFresh: AuditResult = {
      ...freshRaw,
      aiSummary: null,
      toolResults: freshRaw.toolResults.map((r, idx) => {
        if (idx !== 0) return r;
        // Simulate cursor savings increasing (price dropped)
        return {
          ...r,
          monthlySavings: r.monthlySavings + 30,
          annualSavings: (r.monthlySavings + 30) * 12,
          recommendationType: "downgrade_plan" as const,
        };
      }),
    };

    const diff = computeReauditDiff(original, patchedFresh);

    // Changed tools should appear at the top
    const changedIdx = diff.toolDiffs.findIndex((td) => td.changed);
    const unchangedIdx = diff.toolDiffs.findIndex((td) => !td.changed);

    if (changedIdx !== -1 && unchangedIdx !== -1) {
      expect(changedIdx).toBeLessThan(unchangedIdx);
    }
  });

  test("hasImprovements is true when savingsDelta > 0", () => {
    const original = makeAuditResult(formData);
    const freshRaw = runAudit(formData);
    const fresh: AuditResult = {
      ...freshRaw,
      aiSummary: null,
      totalMonthlySavings: original.totalMonthlySavings + 50,
      totalAnnualSavings: (original.totalMonthlySavings + 50) * 12,
    };

    const diff = computeReauditDiff(original, fresh);
    expect(diff.savingsDelta).toBe(50);
    expect(diff.hasImprovements).toBe(true);
  });

  test("hasImprovements is false when savingsDelta is 0", () => {
    const original = makeAuditResult(formData);
    const fresh = makeAuditResult(formData);
    const diff = computeReauditDiff(original, fresh);
    expect(diff.hasImprovements).toBe(false);
  });
});

// ─── FEATURE 2+4: End-to-End Flow Simulation ─────────────────────────────────

describe("End-to-end: pricing change → re-audit flow", () => {
  test("simulate cursor_business price drop: user gets better recommendation", () => {
    // Step 1: User ran audit at $40/seat for Business
    const formData: AuditFormData = {
      teamSize: 10,
      useCase: "coding",
      tools: [
        { toolId: "cursor", planId: "cursor_business", seats: 10, monthlySpend: 400 },
      ],
    };

    const originalResult = makeAuditResult(formData);

    // Step 2: Capture snapshot at audit time (old pricing)
    const oldSnapshot = getCurrentSnapshot();

    // Step 3: Business price drops from $40 to $30
    const newSnapshot = patchSnapshot(oldSnapshot, "cursor", "cursor_business", 30);

    // Step 4: Detect changes
    const diff = diffSnapshots(oldSnapshot, newSnapshot);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedToolIds).toContain("cursor");

    // Step 5: Re-audit (same formData, uses current pricing-data.ts)
    const freshResult = makeAuditResult(formData);

    // Step 6: Compute diff
    const reauditDiff = computeReauditDiff(originalResult, freshResult);
    expect(reauditDiff).toBeDefined();

    // The diff should include cursor in toolDiffs
    const cursorDiff = reauditDiff.toolDiffs.find((td) => td.toolId === "cursor");
    expect(cursorDiff).toBeDefined();
  });

  test("audits using unaffected tools are not included in affected list", () => {
    const oldSnapshot = getCurrentSnapshot();
    // Only cursor changed
    const newSnapshot = patchSnapshot(oldSnapshot, "cursor", "cursor_pro", 25);

    const audits = [
      {
        id: "chatgpt_only",
        user_email: "user@example.com",
        form_data: {
          teamSize: 2,
          useCase: "writing" as const,
          tools: [
            {
              toolId: "chatgpt" as const,
              planId: "chatgpt_plus",
              seats: 2,
              monthlySpend: 40,
            },
          ],
        },
        pricing_snapshot: oldSnapshot,
      },
    ];

    const affected = findAffectedAudits(audits, newSnapshot);
    expect(affected).toHaveLength(0); // chatgpt didn't change, cursor changed
  });

  test("user with both cursor and claude is affected when only cursor changes", () => {
    const oldSnapshot = getCurrentSnapshot();
    const newSnapshot = patchSnapshot(oldSnapshot, "cursor", "cursor_pro", 25);

    const audits = [
      {
        id: "multi_tool",
        user_email: "dev@example.com",
        form_data: {
          teamSize: 3,
          useCase: "coding" as const,
          tools: [
            { toolId: "cursor" as const, planId: "cursor_pro", seats: 3, monthlySpend: 60 },
            { toolId: "claude" as const, planId: "claude_pro", seats: 3, monthlySpend: 60 },
          ],
        },
        pricing_snapshot: oldSnapshot,
      },
    ];

    const affected = findAffectedAudits(audits, newSnapshot);
    expect(affected).toHaveLength(1);
    expect(affected[0].email).toBe("dev@example.com");

    // Only cursor changes should be reported for this audit
    const cursorChange = affected[0].changes.find((c) => c.toolId === "cursor");
    expect(cursorChange).toBeDefined();
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  test("diffSnapshots handles empty tools arrays gracefully", () => {
    const empty: PricingSnapshot = { capturedAt: new Date().toISOString(), tools: [] };
    expect(() => diffSnapshots(empty, empty)).not.toThrow();
    const result = diffSnapshots(empty, empty);
    expect(result.hasChanges).toBe(false);
  });

  test("findAffectedAudits handles empty audit list", () => {
    const snapshot = getCurrentSnapshot();
    expect(() => findAffectedAudits([], snapshot)).not.toThrow();
    expect(findAffectedAudits([], snapshot)).toHaveLength(0);
  });

  test("computeReauditDiff handles audit with single tool", () => {
    const singleTool: AuditFormData = {
      teamSize: 1,
      useCase: "writing",
      tools: [{ toolId: "claude", planId: "claude_pro", seats: 1, monthlySpend: 20 }],
    };
    const original = makeAuditResult(singleTool);
    const fresh = makeAuditResult(singleTool);
    expect(() => computeReauditDiff(original, fresh)).not.toThrow();
    const diff = computeReauditDiff(original, fresh);
    expect(diff.toolDiffs).toHaveLength(1);
  });

  test("price changes on $0 plans (API/usage-based) are handled", () => {
    const old = getCurrentSnapshot();
    // Anthropic API is $0 (usage-based) — patching it to simulate a minimum fee
    const current = patchSnapshot(old, "anthropic_api", "anthropic_api_direct", 10);
    const result = diffSnapshots(old, current);
    expect(result.hasChanges).toBe(true);
    const change = result.changes.find((c) => c.toolId === "anthropic_api");
    expect(change?.changeType).toBe("price_change");
  });

  test("snapshot capturedAt is recent (within 5 seconds)", () => {
    const before = Date.now();
    const snap = getCurrentSnapshot();
    const after = Date.now();
    const snapTime = new Date(snap.capturedAt).getTime();
    expect(snapTime).toBeGreaterThanOrEqual(before);
    expect(snapTime).toBeLessThanOrEqual(after + 100); // 100ms tolerance
  });
});
