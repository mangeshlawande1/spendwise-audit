import type { ToolAuditResult } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  downgrade_plan: { label: "Downgrade plan", color: "text-amber-400" },
  reduce_seats:   { label: "Remove unused seats", color: "text-amber-400" },
  switch_tool:    { label: "Switch tool", color: "text-blue-400" },
  buy_via_credits:{ label: "Buy via credits", color: "text-brand-400" },
  optimal:        { label: "Already optimal ✓", color: "text-slate-400" },
};

interface ToolResultCardProps {
  result: ToolAuditResult;
}

export function ToolResultCard({ result }: ToolResultCardProps) {
  const rec = RECOMMENDATION_LABELS[result.recommendationType];
  const hassSavings = result.monthlySavings > 0;

  return (
    <div
      className={cn(
        "card p-5 transition-all",
        hassSavings
          ? "border-amber-500/20 hover:border-amber-500/40"
          : "border-surface-border opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: tool info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white text-sm">
              {result.toolName}
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-slate-400 text-xs">{result.planName}</span>
          </div>

          {/* Action badge */}
          <span className={cn("text-xs font-medium", rec.color)}>
            {rec.label}
          </span>

          {/* Reasoning */}
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            {result.reasoning}
          </p>
        </div>

        {/* Right: savings numbers */}
        <div className="text-right shrink-0">
          {hassSavings ? (
            <>
              <div className="text-brand-400 font-display text-xl leading-none">
                {formatCurrency(result.monthlySavings)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">/mo savings</div>
              <div className="text-xs text-slate-600 mt-1">
                {formatCurrency(result.annualSavings)}/yr
              </div>
            </>
          ) : (
            <>
              <div className="text-slate-500 font-display text-base leading-none">
                {formatCurrency(result.currentMonthlyCost)}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">/mo · optimal</div>
            </>
          )}
        </div>
      </div>

      {/* Arrow: current → recommended */}
      {hassSavings && (
        <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-2 text-xs">
          <span className="text-slate-500 line-through">
            {formatCurrency(result.currentMonthlyCost)}/mo
          </span>
          <span className="text-slate-600">→</span>
          <span className="text-brand-400 font-medium">
            {formatCurrency(result.recommendedMonthlyCost)}/mo
          </span>
          <span className="text-slate-600 ml-auto">
            Save {formatCurrency(result.annualSavings)}/yr
          </span>
        </div>
      )}
    </div>
  );
}
