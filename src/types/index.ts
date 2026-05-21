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
  pricePerSeat: number;
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
  toolNames: string[];
  title: string;
  description: string;
  action: string;
  monthlySavings: number;
  annualSavings: number;
  confidence: number;
  isCredex?: boolean;
}

// ─── Final Audit Result ───────────────────────────────────────────────────────

export interface AuditResult {
  id: string;
  createdAt: string;
  formData: AuditFormData;
  toolResults: ToolAuditResult[];
  crossToolFindings: CrossToolFinding[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  aiSummary: string | null;
  savingsTier: "high" | "medium" | "low" | "optimal";
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

// ─── Round 2: Pricing Change Detection ───────────────────────────────────────

export interface PricingSnapshot {
  capturedAt: string;
  tools: Array<{
    id: string;
    plans: Array<{
      id: string;
      name: string;
      pricePerSeat: number;
    }>;
  }>;
}

export interface PlanChange {
  toolId: string;
  toolName: string;
  planId: string;
  planName: string;
  oldPrice: number;
  newPrice: number;
  delta: number;
  changeType: "price_change" | "plan_added" | "plan_removed";
}

export interface SnapshotDiff {
  hasChanges: boolean;
  changes: PlanChange[];
  changedToolIds: string[];
}

export interface ToolDiffEntry {
  toolId: string;
  toolName: string;
  planName: string;
  oldRecommendationType: RecommendationType;
  newRecommendationType: RecommendationType;
  oldMonthlySavings: number;
  newMonthlySavings: number;
  savingsDelta: number;
  oldReasoning: string;
  newReasoning: string;
  changed: boolean;
}

export interface ReauditDiff {
  savingsDelta: number;
  toolDiffs: ToolDiffEntry[];
  changedToolCount: number;
  hasImprovements: boolean;
}

export interface ReauditResponse {
  newAuditId: string;
  original: AuditResult;
  fresh: AuditResult;
  diff: ReauditDiff;
}

export interface DetectChangesResponse {
  hasChanges: boolean;
  changedTools: string[];
  affectedAudits: number;
  emailsSent: number;
  eventId?: string;
  skipped?: boolean;
  skipReason?: string;
}
