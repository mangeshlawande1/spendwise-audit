import { buildFallbackSummary } from "@/lib/ai-summary";
import { hashIP } from "@/lib/ip";
import type {
  AuditResult,
  ToolAuditResult,
  CrossToolFinding,
} from "@/types";

// ─── Shared fixture ───────────────────────────────────────────────────────────

function makeAudit(
  overrides: Partial<AuditResult> = {}
): AuditResult {
  const toolResults: ToolAuditResult[] = [
    {
      toolEntry: {
        toolId: "cursor",
        planId: "cursor_business",
        seats: 3,
        monthlySpend: 120,
      },

      toolName: "Cursor",
      planName: "Business",

      currentMonthlyCost: 120,

      recommendationType: "downgrade_plan",

      recommendedPlanId: "cursor_pro",
      recommendedToolId: undefined,

      recommendedMonthlyCost: 60,

      monthlySavings: 60,
      annualSavings: 720,

      reasoning:
        "Teams under 5 don't need Cursor Business SSO/admin features.",
    },
  ];

  const crossToolFindings: CrossToolFinding[] = [];

  return {
    id: "test123",

    createdAt: new Date().toISOString(),

    formData: {
      teamSize: 3,
      useCase: "coding",
      tools: [],
    },

    toolResults,

    crossToolFindings,

    totalMonthlySavings: 60,
    totalAnnualSavings: 720,

    aiSummary: null,

    savingsTier: "low",

    efficiencyScore: 82,

    ...overrides,
  };
}

// ─── Fallback summary tests ───────────────────────────────────────────────────

describe("buildFallbackSummary", () => {
  test("mentions total savings amount for non-optimal audits", () => {
    const audit = makeAudit();

    const summary = buildFallbackSummary(audit);

    expect(summary).toContain("$60");
    expect(summary).toContain("$720");
  });

  test("mentions the top tool name in the summary", () => {
    const audit = makeAudit();

    const summary = buildFallbackSummary(audit);

    expect(summary).toContain("Cursor");
  });

  test("returns positive messaging for optimal audits", () => {
    const audit = makeAudit({
      savingsTier: "optimal",

      totalMonthlySavings: 0,
      totalAnnualSavings: 0,

      toolResults: [
        {
          toolEntry: {
            toolId: "cursor",
            planId: "cursor_pro",
            seats: 1,
            monthlySpend: 20,
          },

          toolName: "Cursor",
          planName: "Pro",

          currentMonthlyCost: 20,

          recommendationType: "optimal",

          recommendedMonthlyCost: 20,

          monthlySavings: 0,
          annualSavings: 0,

          reasoning: "Well matched.",
        },
      ],

      crossToolFindings: [],

      efficiencyScore: 95,
    });

    const summary = buildFallbackSummary(audit);

    expect(summary).toMatch(/well-optimis|no action/i);
    expect(summary).not.toContain("$0/month");
  });

  test("summary is a non-empty string", () => {
    const summary = buildFallbackSummary(makeAudit());

    expect(typeof summary).toBe("string");
    expect(summary.length).toBeGreaterThan(50);
  });
});

// ─── IP hashing tests ─────────────────────────────────────────────────────────

describe("hashIP", () => {
  test("returns a 64-character hex string", async () => {
    const hash = await hashIP("192.168.1.1");

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  test("same IP always produces same hash", async () => {
    const h1 = await hashIP("10.0.0.1");
    const h2 = await hashIP("10.0.0.1");

    expect(h1).toBe(h2);
  });

  test("different IPs produce different hashes", async () => {
    const h1 = await hashIP("10.0.0.1");
    const h2 = await hashIP("10.0.0.2");

    expect(h1).not.toBe(h2);
  });

  test("handles unknown IP gracefully", async () => {
    const hash = await hashIP("unknown");

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});