"use client";

import { useState } from "react";
import type { ToolDiffEntry } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const REC_LABELS: Record<string, string> = {
  downgrade_plan: "Downgrade plan",
  reduce_seats: "Remove unused seats",
  switch_tool: "Switch tool",
  buy_via_credits: "Buy via credits",
  optimal: "Already optimal ✓",
};

interface DiffToolRowProps {
  diff: ToolDiffEntry;
  defaultOpen?: boolean;
}

export function DiffToolRow({ diff, defaultOpen = true }: DiffToolRowProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!diff.changed) {
    // Unchanged tool — collapsible, muted, collapsed by default
    return (
      <div className="card border-surface-border opacity-60">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">✓</span>
            <span className="text-slate-400 text-sm font-medium">
              {diff.toolName}
            </span>
            <span className="text-slate-600 text-xs">· {diff.planName}</span>
            <span className="text-slate-600 text-xs ml-1">— unchanged</span>
          </div>
          <span className="text-slate-600 text-xs">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 pt-0 border-t border-surface-border">
            <p className="text-slate-500 text-xs leading-relaxed mt-3">
              {diff.newReasoning}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Changed tool — highlighted, shown open by default
  const improved = diff.savingsDelta > 0;
  const worsened = diff.savingsDelta < 0;

  return (
    <div
      className={cn(
        "card border transition-all",
        improved
          ? "border-brand-500/30 bg-brand-500/5"
          : worsened
          ? "border-red-500/30 bg-red-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-5 flex items-start justify-between text-left gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full",
                improved
                  ? "bg-brand-500/20 text-brand-400"
                  : worsened
                  ? "bg-red-500/20 text-red-400"
                  : "bg-amber-500/20 text-amber-400"
              )}
            >
              {improved ? "IMPROVED" : worsened ? "WORSENED" : "CHANGED"}
            </span>
            <span className="text-white text-sm font-semibold">
              {diff.toolName}
            </span>
            <span className="text-slate-400 text-xs">· {diff.planName}</span>
          </div>

          {diff.oldRecommendationType !== diff.newRecommendationType && (
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              <span className="text-slate-500 line-through">
                {REC_LABELS[diff.oldRecommendationType] ?? diff.oldRecommendationType}
              </span>
              <span className="text-slate-600">→</span>
              <span
                className={
                  improved ? "text-brand-400" : worsened ? "text-red-400" : "text-amber-400"
                }
              >
                {REC_LABELS[diff.newRecommendationType] ?? diff.newRecommendationType}
              </span>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          {diff.savingsDelta !== 0 && (
            <>
              <div
                className={cn(
                  "font-display text-lg leading-none",
                  improved ? "text-brand-400" : "text-red-400"
                )}
              >
                {improved ? "+" : ""}
                {formatCurrency(diff.savingsDelta)}/mo
              </div>
              <div className="text-xs text-slate-500 mt-0.5">savings delta</div>
            </>
          )}
          <span className="text-slate-600 text-xs mt-1 block">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-surface-border/50 space-y-3">
          {/* Before / After savings */}
          <div className="flex items-center gap-3 pt-3 text-xs flex-wrap">
            <div className="text-center">
              <div className="text-slate-500 line-through">
                {formatCurrency(diff.oldMonthlySavings)}/mo
              </div>
              <div className="text-slate-600 mt-0.5">before</div>
            </div>
            <span className="text-slate-600">→</span>
            <div className="text-center">
              <div className={improved ? "text-brand-400 font-medium" : "text-red-400"}>
                {formatCurrency(diff.newMonthlySavings)}/mo
              </div>
              <div className="text-slate-600 mt-0.5">now</div>
            </div>
          </div>

          {/* Old vs New reasoning */}
          {diff.oldReasoning !== diff.newReasoning && (
            <div className="space-y-2">
              <div className="bg-surface-card rounded-lg p-3">
                <p className="text-xs text-slate-600 font-medium mb-1 uppercase tracking-wide">
                  Previous recommendation
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {diff.oldReasoning}
                </p>
              </div>
              <div className="bg-surface-card rounded-lg p-3 border border-brand-500/10">
                <p className="text-xs text-brand-400/70 font-medium mb-1 uppercase tracking-wide">
                  Updated recommendation
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {diff.newReasoning}
                </p>
              </div>
            </div>
          )}

          {diff.oldReasoning === diff.newReasoning && (
            <p className="text-xs text-slate-400 leading-relaxed">
              {diff.newReasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
