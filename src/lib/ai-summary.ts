import OpenAI from "openai";
import type { AuditResult, ToolAuditResult } from "@/types";
import { formatCurrency } from "@/lib/utils";

// ─── OpenAI-compatible Gemini client ──────────────────────────────────────────

const openai = process.env.GEMINI_API_KEY
  ? new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL:
        "https://generativelanguage.googleapis.com/v1beta/openai/",
    })
  : null;

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a financial advisor specializing in SaaS spend optimization for startups.

You write concise, direct summaries.

No fluff.
No hype.
No markdown.
No filler phrases.

Always use exact dollar amounts.
Never invent numbers.
Keep summaries between 80-100 words.`;
}

function buildUserPrompt(
  result: Omit<AuditResult, "aiSummary">
): string {
  const {
    formData,
    toolResults,
    totalMonthlySavings,
    totalAnnualSavings,
    savingsTier,
  } = result;

  const toolList = formData.tools
    .map((t) => {
      const r = toolResults.find(
        (r) => r.toolEntry.toolId === t.toolId
      );

      return r
        ? `${r.toolName} ${r.planName}`
        : t.toolId;
    })
    .join(", ");

  const topResult = [...toolResults]
    .filter((r) => r.monthlySavings > 0)
    .sort(
      (a, b) => b.monthlySavings - a.monthlySavings
    )[0];

  const perToolFindings = toolResults
    .map((r: ToolAuditResult) => {
      if (r.monthlySavings > 0) {
        return `- ${r.toolName}: saves ${formatCurrency(r.monthlySavings)}/mo because ${r.reasoning}`;
      }

      return `- ${r.toolName}: no changes needed`;
    })
    .join("\n");

  if (savingsTier === "optimal") {
    return `Generate an 80-100 word SaaS spend audit summary.

Team size:
${formData.teamSize}

Primary use case:
${formData.useCase}

Tools:
${toolList}

Result:
No savings identified.

Per-tool findings:
${perToolFindings}

Requirements:
- Mention team size
- Mention tools
- Explain stack is already optimized
- End with one practical future recommendation`;
  }

  return `Generate an 80-100 word SaaS spend audit summary.

Team size:
${formData.teamSize}

Primary use case:
${formData.useCase}

Tools:
${toolList}

Monthly savings:
${formatCurrency(totalMonthlySavings)}

Annual savings:
${formatCurrency(totalAnnualSavings)}

Top recommendation:
${
  topResult
    ? `${topResult.toolName}: ${topResult.reasoning}`
    : "Review plan tiers"
}

Per-tool findings:
${perToolFindings}

Requirements:
- Lead with biggest savings opportunity
- Mention exact dollar amounts
- Mention additional opportunities
- End with one practical next step`;
}

// ─── Fallback summary ─────────────────────────────────────────────────────────

export function buildFallbackSummary(
  result: Omit<AuditResult, "aiSummary">
): string {
  const {
    formData,
    toolResults,
    totalMonthlySavings,
    totalAnnualSavings,
    savingsTier,
  } = result;

  const toolCount = formData.tools.length;

  if (savingsTier === "optimal") {
    return `Your team of ${formData.teamSize} is running a well-optimised AI stack across ${toolCount} tool${toolCount !== 1 ? "s" : ""}. Every plan is matched to your team size and ${formData.useCase} use case — no overages, no seat waste, no plan mismatches. No action needed today. Revisit this audit when your team grows or you add new tools.`;
  }

  const topResult = [...toolResults]
    .filter((r) => r.monthlySavings > 0)
    .sort(
      (a, b) => b.monthlySavings - a.monthlySavings
    )[0];

  let summary = `Your team of ${formData.teamSize} has ${formatCurrency(totalMonthlySavings)}/month (${formatCurrency(totalAnnualSavings)}/year) in identified AI spend savings. `;

  if (topResult) {
    summary += `The biggest opportunity is ${topResult.toolName}: ${topResult.reasoning} `;
  }

  summary += `Start with the highest-impact savings first.`;

  return summary;
}

// ─── Main AI summary generator ────────────────────────────────────────────────

export async function generateAISummary(
  result: Omit<AuditResult, "aiSummary">
): Promise<string | null> {
  if (!openai) {
    console.warn(
      "[ai-summary] GEMINI_API_KEY missing"
    );

    return null;
  }

  try {
    const completion =
      await openai.chat.completions.create({
        model: "gemini-3.5-flash",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: buildUserPrompt(result),
          },
        ],
        temperature: 0.4,
        max_tokens: 180,
      });

    const text =
      completion.choices[0]?.message?.content?.trim();

    if (!text) {
      console.warn(
        "[ai-summary] Empty AI response"
      );

      return null;
    }

    const words = text.split(/\s+/);

    if (words.length > 120) {
      return (
        words.slice(0, 115).join(" ") + "…"
      );
    }

    return text;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("429")
    ) {
      console.warn(
        "[ai-summary] Gemini quota exceeded — using fallback"
      );
    } else {
      console.error(
        "[ai-summary] Gemini/OpenAI error:",
        err
      );
    }

    return null;
  }
}