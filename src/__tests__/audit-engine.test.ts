import { runAudit } from "@/lib/audit-engine";
import type { AuditFormData } from "@/types";

// ─── Test 1: Cursor Business downgrade for small team ─────────────────────────
describe("Audit Engine — Cursor", () => {
  test("recommends downgrade from Business to Pro for team < 5", () => {
    const formData: AuditFormData = {
      teamSize: 3,
      useCase: "coding",
      tools: [
        { toolId: "cursor", planId: "cursor_business", seats: 3, monthlySpend: 120 },
      ],
    };
    const result = runAudit(formData);
    const cursorResult = result.toolResults[0];

    expect(cursorResult.recommendationType).toBe("downgrade_plan");
    expect(cursorResult.recommendedPlanId).toBe("cursor_pro");
    expect(cursorResult.monthlySavings).toBeGreaterThan(0);
    expect(cursorResult.monthlySavings).toBe(120 - 20 * 3); // $60 savings
  });
});

// ─── Test 2: Excess seats detection ──────────────────────────────────────────
describe("Audit Engine — Seat Reduction", () => {
  test("flags excess seats when seats > teamSize", () => {
    const formData: AuditFormData = {
      teamSize: 2,
      useCase: "coding",
      tools: [
        { toolId: "cursor", planId: "cursor_pro", seats: 5, monthlySpend: 100 },
      ],
    };
    const result = runAudit(formData);
    const cursorResult = result.toolResults[0];

    expect(cursorResult.recommendationType).toBe("reduce_seats");
    expect(cursorResult.monthlySavings).toBe(100 - 20 * 2); // $60 savings
  });
});

// ─── Test 3: Claude Team < 5 seats should go to Pro ──────────────────────────
describe("Audit Engine — Claude", () => {
  test("recommends Claude Pro over Team for < 5 users", () => {
    const formData: AuditFormData = {
      teamSize: 3,
      useCase: "writing",
      tools: [
        { toolId: "claude", planId: "claude_team", seats: 3, monthlySpend: 90 },
      ],
    };
    const result = runAudit(formData);
    const claudeResult = result.toolResults[0];

    expect(claudeResult.recommendationType).toBe("downgrade_plan");
    expect(claudeResult.recommendedPlanId).toBe("claude_pro");
    expect(claudeResult.monthlySavings).toBe(90 - 20 * 3); // $30 savings
  });
});

// ─── Test 4: Already optimal — no fake savings ────────────────────────────────
describe("Audit Engine — Optimal detection", () => {
  test("marks as optimal when plan is well-matched", () => {
    const formData: AuditFormData = {
      teamSize: 1,
      useCase: "coding",
      tools: [
        { toolId: "cursor", planId: "cursor_pro", seats: 1, monthlySpend: 20 },
      ],
    };
    const result = runAudit(formData);
    const cursorResult = result.toolResults[0];

    expect(cursorResult.recommendationType).toBe("optimal");
    expect(cursorResult.monthlySavings).toBe(0);
    expect(result.totalMonthlySavings).toBe(0);
  });
});

// ─── Test 5: Savings tier thresholds ─────────────────────────────────────────
describe("Audit Engine — Savings tiers", () => {
  test("sets savingsTier to 'high' when monthly savings >= 500", () => {
    // Claude Max (20x) = $200/seat for a writing team of 4
    // Engine recommends Pro at $20/seat → savings = ($200-$20) × 4 = $720/mo
    const formData: AuditFormData = {
      teamSize: 4,
      useCase: "writing",
      tools: [
        { toolId: "claude", planId: "claude_max_20x", seats: 4, monthlySpend: 800 },
      ],
    };
    const result = runAudit(formData);

    expect(result.totalMonthlySavings).toBeGreaterThanOrEqual(500);
    expect(result.savingsTier).toBe("high");
  });

  test("sets savingsTier to 'optimal' when no savings found", () => {
    const formData: AuditFormData = {
      teamSize: 1,
      useCase: "coding",
      tools: [
        { toolId: "cursor", planId: "cursor_pro", seats: 1, monthlySpend: 20 },
      ],
    };
    const result = runAudit(formData);

    expect(result.savingsTier).toBe("optimal");
    expect(result.totalAnnualSavings).toBe(0);
  });
});

// ─── Test 6: Annual savings = monthly × 12 ───────────────────────────────────
describe("Audit Engine — Savings math", () => {
  test("annual savings is exactly 12× monthly savings", () => {
    const formData: AuditFormData = {
      teamSize: 3,
      useCase: "coding",
      tools: [
        { toolId: "cursor", planId: "cursor_business", seats: 3, monthlySpend: 120 },
      ],
    };
    const result = runAudit(formData);

    expect(result.totalAnnualSavings).toBe(result.totalMonthlySavings * 12);
  });
});