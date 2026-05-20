// ─── Tool & Plan Definitions ──────────────────────────────────────────────────

export type ToolId =
  | "cursor"
  | "github_copilot"
  | "claude"
  | "chatgpt"
  | "anthropic_api"
  | "openai_api"
  | "gemini"
  | "windsurf";

export type UseCase =
  | "coding"
  | "writing"
  | "data"
  | "research"
  | "mixed";

export interface PlanDefinition {
  id: string;
  name: string;
  pricePerSeat: number; // USD/month
  minSeats?: number;
  maxSeats?: number;
  features: string[];
  bestFor: UseCase[];
}

export interface ToolDefinition {
  id: ToolId;
  name: string;
  vendor: string;
  pricingUrl: string;
  plans: PlanDefinition[];
}

// ─── Form / Input Types ───────────────────────────────────────────────────────

export interface ToolEntry {
  toolId: ToolId;
  planId: string;
  seats: number;

  // what they ACTUALLY pay (may differ from catalog due to discounts)
  monthlySpend: number;
}

export interface AuditFormData {
  teamSize: number;
  useCase: UseCase;
  tools: ToolEntry[];
}

// ─── Recommendation Types ─────────────────────────────────────────────────────

export type RecommendationType =
  | "downgrade_plan"
  | "reduce_seats"
  | "switch_tool"
  | "buy_via_credits"
  | "optimal";

// ─── Tool Audit Result ────────────────────────────────────────────────────────

export interface ToolAuditResult {
  toolEntry: ToolEntry;

  toolName: string;
  planName: string;

  currentMonthlyCost: number;

  recommendationType: RecommendationType;

  recommendedPlanId?: string;
  recommendedToolId?: ToolId;

  recommendedMonthlyCost: number;

  monthlySavings: number;
  annualSavings: number;

  // finance-grade reasoning
  reasoning: string;
}

// ─── Cross Tool Findings ──────────────────────────────────────────────────────

export type CrossToolFindingType =
  | "overlap_coding"
  | "overlap_llm"
  | "credex_api"
  | "api_vs_subscription";

export type CrossToolSeverity =
  | "high"
  | "medium"
  | "low"
  | "opportunity";

export interface CrossToolFinding {
  type: CrossToolFindingType;

  severity: CrossToolSeverity;

  // tools involved
  toolNames: string[];

  // UI content
  title: string;
  description: string;
  action: string;

  // savings
  monthlySavings: number;
  annualSavings: number;

  // confidence score (0-100)
  confidence: number;

  // optional flags
  isCredex?: boolean;
}

// ─── Final Audit Result ───────────────────────────────────────────────────────

export interface AuditResult {
  id: string;

  createdAt: string;

  // stored without PII for shareable reports
  formData: AuditFormData;

  // per-tool recommendations
  toolResults: ToolAuditResult[];

  // stack-level findings
  crossToolFindings: CrossToolFinding[];

  totalMonthlySavings: number;
  totalAnnualSavings: number;

  // nullable if AI generation fails
  aiSummary: string | null;

  savingsTier: "high" | "medium" | "low" | "optimal";

  // 0-100 efficiency score
  efficiencyScore: number;
}

// ─── Lead Capture Types ───────────────────────────────────────────────────────

export interface LeadData {
  email: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  auditId: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
// ─── Round 2: Pricing Diff & Re-audit Types ───────────────────────────────────

export interface PricingSnapshot {
  capturedAt: string;
  tools: Array<{
    id: string;
    plans: Array<{
      id: string;
      pricePerSeat: number;
    }>;
  }>;
}

export type PlanChangeType = "price_change" | "plan_added" | "plan_removed";

export interface PlanChange {
  toolId: string;
  toolName: string;
  planId: string;
  planName: string;
  oldPrice: number;
  newPrice: number;
  delta: number; // negative = cheaper
  changeType: PlanChangeType;
}

export interface SnapshotDiff {
  hasChanges: boolean;
  changes: PlanChange[];
  changedToolIds: string[];
}

export interface ToolDiff {
  toolId: string;
  toolName: string;
  oldRecommendation: RecommendationType;
  newRecommendation: RecommendationType;
  oldMonthlySavings: number;
  newMonthlySavings: number;
  oldReasoning: string;
  newReasoning: string;
}

export interface ReauditDiff {
  changedTools: string[];
  savingsDelta: number;
  toolDiffs: ToolDiff[];
  crossToolDiffs: CrossToolFinding[];
}

export interface ReauditResponse {
  newAuditId: string;
  original: AuditResult;
  fresh: AuditResult;
  diff: ReauditDiff;
}

// Extended AuditResult stored in DB with Round 2 fields
export interface AuditResultExtended extends AuditResult {
  userEmail?: string;
  pricingSnapshot?: PricingSnapshot;
  parentAuditId?: string;
}
