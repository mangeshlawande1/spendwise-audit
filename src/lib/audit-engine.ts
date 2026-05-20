import type {
  AuditFormData,
  AuditResult,
  CrossToolFinding,
  ToolAuditResult,
  ToolEntry,
  RecommendationType,
} from "@/types";
import { TOOL_MAP, getPlan } from "./pricing-data";
import { nanoid } from "nanoid";

// ─── Per-tool audit logic ─────────────────────────────────────────────────────

function auditTool(entry: ToolEntry, formData: AuditFormData): ToolAuditResult {
  const tool = TOOL_MAP.get(entry.toolId);
  const plan = getPlan(entry.toolId, entry.planId);

  if (!tool || !plan) {
    throw new Error(`Unknown tool/plan: ${entry.toolId}/${entry.planId}`);
  }

  const currentMonthlyCost = entry.monthlySpend;

  // ── Cursor ────────────────────────────────────────────────────────────────────
  if (entry.toolId === "cursor") {
    if (entry.planId === "cursor_business" && formData.teamSize <= 4) {
      const pro = tool.plans.find((p) => p.id === "cursor_pro")!;
      const recommendedCost = pro.pricePerSeat * entry.seats;
      const savings = currentMonthlyCost - recommendedCost;
      return buildResult(entry, tool.name, plan.name, currentMonthlyCost, "downgrade_plan",
        "cursor_pro", undefined, recommendedCost, savings,
        `Teams under 5 don't need Cursor Business SSO — Pro at $${pro.pricePerSeat}/seat saves $${savings}/mo with identical AI capability.`);
    }
    if (entry.seats > formData.teamSize) {
      const correctCost = (plan.pricePerSeat || 20) * formData.teamSize;
      const savings = currentMonthlyCost - correctCost;
      return buildResult(entry, tool.name, plan.name, currentMonthlyCost, "reduce_seats",
        entry.planId, undefined, correctCost, savings,
        `You have ${entry.seats} Cursor seats but only ${formData.teamSize} team members — removing ${entry.seats - formData.teamSize} unused seats saves $${savings}/mo.`);
    }
    if (formData.useCase !== "coding" && formData.useCase !== "mixed") {
      const claudeProCost = 20 * entry.seats;
      const savings = currentMonthlyCost - claudeProCost;
      if (savings > 0) {
        return buildResult(entry, tool.name, plan.name, currentMonthlyCost, "switch_tool",
          undefined, "claude", claudeProCost, savings,
          `Cursor is IDE-focused — for ${formData.useCase} workflows, Claude Pro offers equivalent capability at $${claudeProCost}/mo total.`);
      }
    }
  }

  // ── GitHub Copilot ────────────────────────────────────────────────────────────
  if (entry.toolId === "github_copilot") {
    if (entry.planId === "copilot_enterprise" && formData.teamSize <= 10) {
      const biz = tool.plans.find((p) => p.id === "copilot_business")!;
      const recommendedCost = biz.pricePerSeat * entry.seats;
      const savings = currentMonthlyCost - recommendedCost;
      if (savings > 0) {
        return buildResult(entry, tool.name, "Enterprise", currentMonthlyCost, "downgrade_plan",
          "copilot_business", undefined, recommendedCost, savings,
          `Copilot Enterprise requires GitHub Enterprise for codebase personalization — teams under 10 rarely need this. Business at $19/seat saves $${savings}/mo.`);
      }
    }
  }

  // ── Claude ────────────────────────────────────────────────────────────────────
  if (entry.toolId === "claude") {
    if (entry.planId === "claude_team" && entry.seats < 5) {
      const pro = tool.plans.find((p) => p.id === "claude_pro")!;
      const recommendedCost = pro.pricePerSeat * entry.seats;
      const savings = currentMonthlyCost - recommendedCost;
      if (savings > 0) {
        return buildResult(entry, tool.name, "Team", currentMonthlyCost, "downgrade_plan",
          "claude_pro", undefined, recommendedCost, savings,
          `Claude Team has a 5-seat minimum at $30/seat — for ${entry.seats} users, individual Pro at $20/seat saves $${savings}/mo with the same model access.`);
      }
    }
    if ((entry.planId === "claude_max_5x" || entry.planId === "claude_max_20x") && formData.useCase === "writing") {
      const pro = tool.plans.find((p) => p.id === "claude_pro")!;
      const recommendedCost = pro.pricePerSeat * entry.seats;
      const savings = currentMonthlyCost - recommendedCost;
      if (savings > 0) {
        return buildResult(entry, tool.name, plan.name, currentMonthlyCost, "downgrade_plan",
          "claude_pro", undefined, recommendedCost, savings,
          `Claude Max is for developers hitting Pro usage limits — for writing, Pro at $20/seat covers typical usage, saving $${savings}/mo.`);
      }
    }
  }

  // ── ChatGPT ───────────────────────────────────────────────────────────────────
  if (entry.toolId === "chatgpt") {
    if (entry.planId === "chatgpt_team" && entry.seats <= 2) {
      const plus = tool.plans.find((p) => p.id === "chatgpt_plus")!;
      const recommendedCost = plus.pricePerSeat * entry.seats;
      const savings = currentMonthlyCost - recommendedCost;
      if (savings > 0) {
        return buildResult(entry, tool.name, "Team", currentMonthlyCost, "downgrade_plan",
          "chatgpt_plus", undefined, recommendedCost, savings,
          `ChatGPT Team's admin console isn't needed for ${entry.seats} user${entry.seats > 1 ? "s" : ""} — Plus at $20/seat has identical GPT-4o access, saving $${savings}/mo.`);
      }
    }
    if (formData.useCase === "coding" && entry.planId !== "chatgpt_free") {
      const cursorProCost = 20 * entry.seats;
      const savings = currentMonthlyCost - cursorProCost;
      if (savings > 0) {
        return buildResult(entry, tool.name, plan.name, currentMonthlyCost, "switch_tool",
          undefined, "cursor", cursorProCost, savings,
          `For coding teams, Cursor Pro ($20/seat) has IDE-native autocomplete vs ChatGPT's chat-only interface — same cost, purpose-built for development.`);
      }
    }
  }

  // ── Windsurf ──────────────────────────────────────────────────────────────────
  if (entry.toolId === "windsurf") {
    if (entry.planId === "windsurf_teams" && formData.teamSize < 5) {
      const pro = tool.plans.find((p) => p.id === "windsurf_pro")!;
      const recommendedCost = pro.pricePerSeat * entry.seats;
      const savings = currentMonthlyCost - recommendedCost;
      if (savings > 0) {
        return buildResult(entry, tool.name, "Teams", currentMonthlyCost, "downgrade_plan",
          "windsurf_pro", undefined, recommendedCost, savings,
          `Windsurf Teams requires 5 seats minimum — for ${entry.seats} devs, Pro at $15/seat has identical capability, saving $${savings}/mo.`);
      }
    }
  }

  return buildResult(entry, tool.name, plan.name, currentMonthlyCost, "optimal",
    undefined, undefined, currentMonthlyCost, 0,
    `${tool.name} ${plan.name} is well-matched to your team size and use case.`);
}

// ─── Cross-tool rules (overlap, Credex, API vs subscription) ─────────────────

function runCrossToolRules(
  formData: AuditFormData
): CrossToolFinding[] {
  const findings: CrossToolFinding[] = [];
  const tools = formData.tools;

  // ── Rule A: Overlapping coding assistants ─────────────────────────────────
  const CODING_TOOLS = ["cursor", "github_copilot", "windsurf"];
  const activeCodingTools = tools.filter(
    (t) => CODING_TOOLS.includes(t.toolId) && t.monthlySpend > 0
  );
  if (activeCodingTools.length >= 2) {
    const sorted = [...activeCodingTools].sort((a, b) => b.monthlySpend - a.monthlySpend);
    const redundant = sorted.slice(1);
    const savings = redundant.reduce((s, t) => s + t.monthlySpend, 0);
    const keepTool = TOOL_MAP.get(sorted[0].toolId)!;
    const redundantNames = redundant.map((t) => TOOL_MAP.get(t.toolId)?.name ?? t.toolId);
    findings.push({
      type: "overlap_coding",
      severity: "high",
      toolNames: activeCodingTools.map((t) => TOOL_MAP.get(t.toolId)?.name ?? t.toolId),
      title: `${activeCodingTools.length} overlapping coding assistants`,
      description: `You're paying for ${activeCodingTools.map((t) => TOOL_MAP.get(t.toolId)?.name).join(", ")}. These tools have near-identical core functionality — most engineers use exactly one. Consolidate to ${keepTool.name}, your highest-spend tool, and cancel the rest.`,
      action: `Cancel ${redundantNames.join(", ")} — save $${savings}/mo`,
      monthlySavings: savings,
      annualSavings: savings * 12,
      confidence: 95,
    });
  }

  // ── Rule B: Overlapping LLM front-ends ───────────────────────────────────
  const LLM_TOOLS = ["claude", "chatgpt", "gemini"];
  const activeLLMs = tools.filter(
    (t) => LLM_TOOLS.includes(t.toolId) && t.monthlySpend > 0
  );
  if (activeLLMs.length >= 2 && formData.useCase !== "mixed") {
    const sorted = [...activeLLMs].sort((a, b) => b.monthlySpend - a.monthlySpend);
    const redundant = sorted.slice(1);
    const savings = redundant.reduce((s, t) => s + t.monthlySpend, 0);
    if (savings >= 15) {
      const keepTool = TOOL_MAP.get(sorted[0].toolId)!;
      const redundantNames = redundant.map((t) => TOOL_MAP.get(t.toolId)?.name ?? t.toolId);
      findings.push({
        type: "overlap_llm",
        severity: "medium",
        toolNames: activeLLMs.map((t) => TOOL_MAP.get(t.toolId)?.name ?? t.toolId),
        title: "Duplicate LLM subscriptions",
        description: `You're paying for ${activeLLMs.map((t) => TOOL_MAP.get(t.toolId)?.name).join(" + ")} for ${formData.useCase} tasks. These are largely interchangeable for most workflows — pick the one that fits your primary use case and cancel the others.`,
        action: `Consolidate to ${keepTool.name} — cancel ${redundantNames.join(", ")}`,
        monthlySavings: savings,
        annualSavings: savings * 12,
        confidence: 75,
      });
    }
  }

  // ── Rule C: Credex credits for high API spend ─────────────────────────────
  const API_TOOLS = ["anthropic_api", "openai_api"];
  const apiSpend = tools
    .filter((t) => API_TOOLS.includes(t.toolId))
    .reduce((s, t) => s + t.monthlySpend, 0);
  if (apiSpend >= 200) {
    const credexSavings = Math.round(apiSpend * 0.3);
    findings.push({
      type: "credex_api",
      severity: "opportunity",
      toolNames: ["Anthropic API", "OpenAI API"],
      title: `Save ~30% on $${apiSpend}/mo API spend with discounted credits`,
      description: `Your $${apiSpend}/mo API spend qualifies for Credex's discounted credit program. Startups using Credex purchase AI credits at 20–35% below retail pricing — no commitments, no minimums. Same models, better price.`,
      action: "Explore Credex discounted credits",
      monthlySavings: credexSavings,
      annualSavings: credexSavings * 12,
      confidence: 80,
      isCredex: true,
    });
  }

  // ── Rule D: Claude subscription vs API for dev teams ─────────────────────
  const claudeSub = tools.find((t) => t.toolId === "claude" && t.monthlySpend > 0);
  const hasAnthropicApi = tools.some((t) => t.toolId === "anthropic_api" && t.monthlySpend > 0);
  if (claudeSub && !hasAnthropicApi && formData.teamSize >= 5 && formData.useCase === "coding") {
    const apiEstimate = claudeSub.seats * 8; // ~$8/dev/mo for typical coding API usage
    const savings = claudeSub.monthlySpend - apiEstimate;
    if (savings > 0) {
      findings.push({
        type: "api_vs_subscription",
        severity: "medium",
        toolNames: ["Claude"],
        title: "API access cheaper than Claude.ai for your dev team",
        description: `For a ${formData.teamSize}-person engineering team using Claude for coding tasks, direct API access through a shared proxy (LiteLLM or PortKey) typically costs 40–60% less than per-seat subscriptions. You get full model access with usage-based billing.`,
        action: "Migrate to Anthropic API + shared proxy (est. $8/dev/mo)",
        monthlySavings: savings,
        annualSavings: savings * 12,
        confidence: 70,
      });
    }
  }

  return findings;
}

// ─── Helper builder ───────────────────────────────────────────────────────────

function buildResult(
  entry: ToolEntry,
  toolName: string,
  planName: string,
  currentMonthlyCost: number,
  recommendationType: RecommendationType,
  recommendedPlanId: string | undefined,
  recommendedToolId: import("@/types").ToolId | undefined,
  recommendedMonthlyCost: number,
  monthlySavings: number,
  reasoning: string
): ToolAuditResult {
  return {
    toolEntry: entry,
    toolName,
    planName,
    currentMonthlyCost,
    recommendationType,
    recommendedPlanId,
    recommendedToolId,
    recommendedMonthlyCost,
    monthlySavings: Math.max(0, monthlySavings),
    annualSavings: Math.max(0, monthlySavings * 12),
    reasoning,
  };
}

// ─── Main audit function ──────────────────────────────────────────────────────

export function runAudit(formData: AuditFormData): Omit<AuditResult, "aiSummary"> {
  const toolResults = formData.tools.map((entry) => auditTool(entry, formData));
  const crossToolFindings = runCrossToolRules(formData);

  const toolSavings = toolResults.reduce((sum, r) => sum + r.monthlySavings, 0);
  const crossSavings = crossToolFindings.reduce((sum, f) => sum + f.monthlySavings, 0);
  const totalMonthlySavings = toolSavings + crossSavings;
  const totalAnnualSavings = totalMonthlySavings * 12;

  const totalCurrentSpend = formData.tools.reduce((s, t) => s + t.monthlySpend, 0);
  const savingsPct = totalCurrentSpend > 0 ? totalMonthlySavings / totalCurrentSpend : 0;

  const savingsTier: AuditResult["savingsTier"] =
    totalMonthlySavings >= 500
      ? "high"
      : totalMonthlySavings >= 100
      ? "medium"
      : totalMonthlySavings > 0
      ? "low"
      : "optimal";

  // Efficiency score: 100 = perfect, decreases proportionally to waste found
  const efficiencyScore =
    savingsTier === "optimal"
      ? Math.floor(Math.random() * 8) + 90 // 90-97 for optimal stacks
      : Math.max(20, Math.round(100 - savingsPct * 100));

  return {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    formData,
    toolResults,
    crossToolFindings,
    totalMonthlySavings,
    totalAnnualSavings,
    savingsTier,
    efficiencyScore,
  };
}