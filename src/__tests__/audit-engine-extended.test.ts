import { runAudit } from "@/lib/audit-engine";
import type { AuditFormData } from "@/types";

describe("Audit Engine — multi-tool", () => {
  test("correctly sums savings across multiple tools", () => {
    const formData: AuditFormData = {
      teamSize: 3,
      useCase: "coding",
      tools: [
        // Cursor Business for 3 → should downgrade to Pro ($60 savings)
        { toolId: "cursor", planId: "cursor_business", seats: 3, monthlySpend: 120 },
        // Claude Team for 3 → should downgrade to Pro ($30 savings)
        { toolId: "claude", planId: "claude_team", seats: 3, monthlySpend: 90 },
      ],
    };

    const result = runAudit(formData);

    expect(result.toolResults).toHaveLength(2);
    // Cursor: $120 - (3 × $20) = $60 savings
    // Claude: $90 - (3 × $20) = $30 savings
    expect(result.totalMonthlySavings).toBe(90);
    expect(result.totalAnnualSavings).toBe(90 * 12);
    expect(result.savingsTier).toBe("low"); // $90 < $100
  });

  test("ChatGPT Team for solo user → downgrade to Plus", () => {
    const formData: AuditFormData = {
      teamSize: 1,
      useCase: "writing",
      tools: [
        { toolId: "chatgpt", planId: "chatgpt_team", seats: 1, monthlySpend: 30 },
      ],
    };
    const result = runAudit(formData);
    const r = result.toolResults[0];

    expect(r.recommendationType).toBe("downgrade_plan");
    expect(r.recommendedPlanId).toBe("chatgpt_plus");
    expect(r.monthlySavings).toBe(10); // $30 - $20
  });

  test("coding team on ChatGPT Plus → switch to Cursor Pro", () => {
    const formData: AuditFormData = {
      teamSize: 3,
      useCase: "coding",
      tools: [
        { toolId: "chatgpt", planId: "chatgpt_plus", seats: 3, monthlySpend: 75 },
      ],
    };
    const result = runAudit(formData);
    const r = result.toolResults[0];

    // ChatGPT Plus for 3 devs = $75, Cursor Pro = $60 → $15 savings
    expect(r.recommendationType).toBe("switch_tool");
    expect(r.recommendedToolId).toBe("cursor");
    expect(r.monthlySavings).toBe(15);
  });

  test("Windsurf Teams for small team → downgrade to Pro", () => {
    const formData: AuditFormData = {
      teamSize: 2,
      useCase: "coding",
      tools: [
        { toolId: "windsurf", planId: "windsurf_teams", seats: 2, monthlySpend: 70 },
      ],
    };
    const result = runAudit(formData);
    const r = result.toolResults[0];

    expect(r.recommendationType).toBe("downgrade_plan");
    expect(r.recommendedPlanId).toBe("windsurf_pro");
    expect(r.monthlySavings).toBe(70 - 15 * 2); // $40
  });

  test("audit result has a unique nanoid each run", () => {
    const formData: AuditFormData = {
      teamSize: 1,
      useCase: "coding",
      tools: [{ toolId: "cursor", planId: "cursor_pro", seats: 1, monthlySpend: 20 }],
    };

    const r1 = runAudit(formData);
    const r2 = runAudit(formData);

    expect(r1.id).not.toBe(r2.id);
    expect(r1.id).toHaveLength(10);
  });
});
