import type { ToolDefinition } from "@/types";

/**
 * All pricing data is sourced from official vendor pricing pages.
 * See PRICING_DATA.md for full citations with dates.
 * Last verified: 2025-05-XX (fill in your submission date)
 */
export const TOOLS: ToolDefinition[] = [
  {
    id: "cursor",
    name: "Cursor",
    vendor: "Anysphere",
    pricingUrl: "https://cursor.sh/pricing",
    plans: [
      {
        id: "cursor_hobby",
        name: "Hobby",
        pricePerSeat: 0,
        features: ["2000 completions/month", "50 slow premium requests"],
        bestFor: ["coding"],
      },
      {
        id: "cursor_pro",
        name: "Pro",
        pricePerSeat: 20,
        features: ["Unlimited completions", "500 fast premium requests/month", "10 o1 requests/day"],
        bestFor: ["coding"],
      },
      {
        id: "cursor_business",
        name: "Business",
        pricePerSeat: 40,
        minSeats: 1,
        features: ["Everything in Pro", "SSO", "Centralized billing", "Admin dashboard"],
        bestFor: ["coding"],
      },
      {
        id: "cursor_enterprise",
        name: "Enterprise",
        pricePerSeat: 0, // custom pricing
        features: ["Custom deployment", "SLA", "Dedicated support"],
        bestFor: ["coding"],
      },
    ],
  },
  {
    id: "github_copilot",
    name: "GitHub Copilot",
    vendor: "GitHub / Microsoft",
    pricingUrl: "https://github.com/features/copilot#pricing",
    plans: [
      {
        id: "copilot_individual",
        name: "Individual",
        pricePerSeat: 10,
        features: ["Code suggestions", "Chat in IDE", "CLI assistance"],
        bestFor: ["coding"],
      },
      {
        id: "copilot_business",
        name: "Business",
        pricePerSeat: 19,
        minSeats: 1,
        features: ["Everything Individual", "Policy management", "Audit logs", "IP indemnity"],
        bestFor: ["coding"],
      },
      {
        id: "copilot_enterprise",
        name: "Enterprise",
        pricePerSeat: 39,
        minSeats: 1,
        features: ["Everything Business", "Personalized to codebase", "GitHub.com chat"],
        bestFor: ["coding"],
      },
    ],
  },
  {
    id: "claude",
    name: "Claude",
    vendor: "Anthropic",
    pricingUrl: "https://www.anthropic.com/pricing",
    plans: [
      {
        id: "claude_free",
        name: "Free",
        pricePerSeat: 0,
        features: ["Limited Claude 3.5 Sonnet", "Basic access"],
        bestFor: ["writing", "research", "mixed"],
      },
      {
        id: "claude_pro",
        name: "Pro",
        pricePerSeat: 20,
        features: ["5x more usage than Free", "Priority access", "Early features"],
        bestFor: ["writing", "research", "coding", "mixed"],
      },
      {
        id: "claude_max_5x",
        name: "Max (5×)",
        pricePerSeat: 100,
        features: ["5× Pro usage limits", "Highest priority access"],
        bestFor: ["coding", "research", "mixed"],
      },
      {
        id: "claude_max_20x",
        name: "Max (20×)",
        pricePerSeat: 200,
        features: ["20× Pro usage limits", "Highest priority access"],
        bestFor: ["coding", "research", "mixed"],
      },
      {
        id: "claude_team",
        name: "Team",
        pricePerSeat: 30,
        minSeats: 5,
        features: ["More usage than Pro", "Admin console", "SSO", "Collaboration"],
        bestFor: ["writing", "coding", "mixed"],
      },
      {
        id: "claude_enterprise",
        name: "Enterprise",
        pricePerSeat: 0, // custom
        features: ["Unlimited usage", "Custom deployment", "Expanded context"],
        bestFor: ["coding", "writing", "data", "research", "mixed"],
      },
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI",
    pricingUrl: "https://openai.com/chatgpt/pricing",
    plans: [
      {
        id: "chatgpt_free",
        name: "Free",
        pricePerSeat: 0,
        features: ["GPT-4o mini", "Limited GPT-4o"],
        bestFor: ["writing", "research", "mixed"],
      },
      {
        id: "chatgpt_plus",
        name: "Plus",
        pricePerSeat: 20,
        features: ["GPT-4o", "DALL-E", "Advanced Data Analysis", "GPTs"],
        bestFor: ["writing", "data", "research", "mixed"],
      },
      {
        id: "chatgpt_team",
        name: "Team",
        pricePerSeat: 30,
        minSeats: 2,
        features: ["Everything Plus", "Admin workspace", "Higher limits", "Data excluded from training"],
        bestFor: ["writing", "data", "research", "mixed"],
      },
      {
        id: "chatgpt_enterprise",
        name: "Enterprise",
        pricePerSeat: 0, // custom
        features: ["Unlimited GPT-4o", "SSO", "Advanced security"],
        bestFor: ["data", "research", "mixed"],
      },
    ],
  },
  {
    id: "anthropic_api",
    name: "Anthropic API",
    vendor: "Anthropic",
    pricingUrl: "https://www.anthropic.com/api",
    plans: [
      {
        id: "anthropic_api_direct",
        name: "API Direct",
        pricePerSeat: 0, // usage-based, tracked separately
        features: ["Claude 3.5 Sonnet, Haiku, Opus", "Pay per token"],
        bestFor: ["coding", "data", "research", "mixed"],
      },
    ],
  },
  {
    id: "openai_api",
    name: "OpenAI API",
    vendor: "OpenAI",
    pricingUrl: "https://openai.com/api/pricing",
    plans: [
      {
        id: "openai_api_direct",
        name: "API Direct",
        pricePerSeat: 0, // usage-based
        features: ["GPT-4o, GPT-4o-mini, o1, o3", "Pay per token"],
        bestFor: ["coding", "data", "research", "mixed"],
      },
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    vendor: "Google",
    pricingUrl: "https://gemini.google.com/advanced",
    plans: [
      {
        id: "gemini_free",
        name: "Free",
        pricePerSeat: 0,
        features: ["Gemini 1.5 Flash", "Limited access"],
        bestFor: ["writing", "research"],
      },
      {
        id: "gemini_advanced",
        name: "Advanced (Google One AI Premium)",
        pricePerSeat: 20,
        features: ["Gemini Ultra 1.0", "2TB storage", "Workspace integration"],
        bestFor: ["writing", "research", "mixed"],
      },
      {
        id: "gemini_api",
        name: "API",
        pricePerSeat: 0, // usage-based
        features: ["Gemini 1.5 Pro/Flash via API", "Pay per token"],
        bestFor: ["coding", "data", "research"],
      },
    ],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    vendor: "Codeium",
    pricingUrl: "https://codeium.com/windsurf/pricing",
    plans: [
      {
        id: "windsurf_free",
        name: "Free",
        pricePerSeat: 0,
        features: ["5 user prompt credits/day", "Unlimited autocomplete"],
        bestFor: ["coding"],
      },
      {
        id: "windsurf_pro",
        name: "Pro",
        pricePerSeat: 15,
        features: ["Unlimited prompt credits", "Priority access", "Faster responses"],
        bestFor: ["coding"],
      },
      {
        id: "windsurf_teams",
        name: "Teams",
        pricePerSeat: 35,
        minSeats: 5,
        features: ["Everything Pro", "Admin controls", "SSO", "Usage analytics"],
        bestFor: ["coding"],
      },
    ],
  },
];

export const TOOL_MAP = new Map(TOOLS.map((t) => [t.id, t]));

export function getPlan(toolId: string, planId: string) {
  const tool = TOOL_MAP.get(toolId as import("@/types").ToolId);
  if (!tool) return null;
  return tool.plans.find((p) => p.id === planId) ?? null;
}
