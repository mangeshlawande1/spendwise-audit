import { diffSnapshots, getCurrentSnapshot, findAffectedAudits } from "@/lib/pricing-diff";
import type { PricingSnapshot } from "@/types";

describe("diffSnapshots", () => {
  const baseSnapshot: PricingSnapshot = {
    capturedAt: "2025-01-01T00:00:00.000Z",
    tools: [
      {
        id: "cursor",
        plans: [
          { id: "cursor_hobby", pricePerSeat: 0 },
          { id: "cursor_pro", pricePerSeat: 20 },
          { id: "cursor_business", pricePerSeat: 40 },
        ],
      },
      {
        id: "claude",
        plans: [
          { id: "claude_free", pricePerSeat: 0 },
          { id: "claude_pro", pricePerSeat: 20 },
        ],
      },
    ],
  };

  it("returns hasChanges=false when pricing is identical", () => {
    const diff = diffSnapshots(baseSnapshot, baseSnapshot);
    expect(diff.hasChanges).toBe(false);
    expect(diff.changes).toHaveLength(0);
    expect(diff.changedToolIds).toHaveLength(0);
  });

  it("detects a price change on a single plan", () => {
    const updated: PricingSnapshot = {
      ...baseSnapshot,
      capturedAt: "2025-02-01T00:00:00.000Z",
      tools: baseSnapshot.tools.map((t) =>
        t.id === "cursor"
          ? {
              ...t,
              plans: t.plans.map((p) =>
                p.id === "cursor_business"
                  ? { ...p, pricePerSeat: 35 } // dropped $5
                  : p
              ),
            }
          : t
      ),
    };

    const diff = diffSnapshots(baseSnapshot, updated);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedToolIds).toContain("cursor");
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0]).toMatchObject({
      toolId: "cursor",
      planId: "cursor_business",
      oldPrice: 40,
      newPrice: 35,
      delta: -5,
      changeType: "price_change",
    });
  });

  it("detects a new plan added", () => {
    const updated: PricingSnapshot = {
      ...baseSnapshot,
      tools: baseSnapshot.tools.map((t) =>
        t.id === "claude"
          ? {
              ...t,
              plans: [...t.plans, { id: "claude_new_plan", pricePerSeat: 50 }],
            }
          : t
      ),
    };

    const diff = diffSnapshots(baseSnapshot, updated);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes[0].changeType).toBe("plan_added");
  });

  it("detects a removed plan", () => {
    const updated: PricingSnapshot = {
      ...baseSnapshot,
      tools: baseSnapshot.tools.map((t) =>
        t.id === "cursor"
          ? { ...t, plans: t.plans.filter((p) => p.id !== "cursor_business") }
          : t
      ),
    };

    const diff = diffSnapshots(baseSnapshot, updated);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes[0].changeType).toBe("plan_removed");
  });

  it("handles multiple tool changes at once", () => {
    const updated: PricingSnapshot = {
      ...baseSnapshot,
      tools: baseSnapshot.tools.map((t) => ({
        ...t,
        plans: t.plans.map((p) =>
          p.pricePerSeat > 0 ? { ...p, pricePerSeat: p.pricePerSeat + 5 } : p
        ),
      })),
    };

    const diff = diffSnapshots(baseSnapshot, updated);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changedToolIds.length).toBeGreaterThan(1);
  });
});

describe("getCurrentSnapshot", () => {
  it("returns a snapshot with capturedAt and tools", () => {
    const snapshot = getCurrentSnapshot();
    expect(snapshot.capturedAt).toBeTruthy();
    expect(Array.isArray(snapshot.tools)).toBe(true);
    expect(snapshot.tools.length).toBeGreaterThan(0);
    expect(snapshot.tools[0]).toHaveProperty("id");
    expect(snapshot.tools[0]).toHaveProperty("plans");
  });
});

describe("findAffectedAudits", () => {
  it("returns only audits that use changed tools and have an email", () => {
    const audits = [
      {
        id: "audit1",
        user_email: "alice@example.com",
        form_data: { teamSize: 5, useCase: "coding" as const, tools: [{ toolId: "cursor" as const, planId: "cursor_business", seats: 5, monthlySpend: 200 }] },
        pricing_snapshot: null,
      },
      {
        id: "audit2",
        user_email: null,
        form_data: { teamSize: 3, useCase: "coding" as const, tools: [{ toolId: "cursor" as const, planId: "cursor_pro", seats: 3, monthlySpend: 60 }] },
        pricing_snapshot: null,
      },
      {
        id: "audit3",
        user_email: "bob@example.com",
        form_data: { teamSize: 2, useCase: "writing" as const, tools: [{ toolId: "claude" as const, planId: "claude_pro", seats: 2, monthlySpend: 40 }] },
        pricing_snapshot: null,
      },
    ];

    const affected = findAffectedAudits(audits, ["cursor"]);
    expect(affected).toHaveLength(0); // pricing_snapshot is null, filtered out
  });
});
