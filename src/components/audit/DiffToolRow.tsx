"use client";
import { useState } from "react";
import type { ToolDiff, ToolAuditResult } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ChangedProps {
  diff: ToolDiff;
  defaultOpen?: boolean;
}

interface UnchangedProps {
  unchanged: ToolAuditResult;
  defaultOpen?: boolean;
}

type Props = ChangedProps | UnchangedProps;

function isChanged(props: Props): props is ChangedProps {
  return "diff" in props;
}

export function DiffToolRow(props: Props) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);

  if (isChanged(props)) {
    const { diff } = props;
    const savingsImproved = diff.newMonthlySavings > diff.oldMonthlySavings;
    const savingsDelta = diff.newMonthlySavings - diff.oldMonthlySavings;

    return (
      <div className="border border-amber-500/40 bg-amber-950/20 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-amber-950/30 transition-colors"
        >
          <span className="text-amber-400 text-lg">⚡</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{diff.toolName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide font-medium">
                Changed
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5 truncate">
              {diff.oldRecommendation} → {diff.newRecommendation}
              {savingsDelta !== 0 && (
                <span
                  className={`ml-2 font-medium ${
                    savingsImproved ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {savingsImproved ? "↑" : "↓"}{" "}
                  {formatCurrency(Math.abs(savingsDelta))}/mo
                </span>
              )}
            </p>
          </div>
          <span className="text-slate-500 text-sm">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-3 border-t border-amber-500/20 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                  Before
                </p>
                <p className="text-sm font-medium text-slate-300 capitalize">
                  {diff.oldRecommendation.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {formatCurrency(diff.oldMonthlySavings)}/mo savings
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {diff.oldReasoning}
                </p>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-xs text-emerald-500 uppercase tracking-wide mb-1">
                  Now
                </p>
                <p className="text-sm font-medium text-white capitalize">
                  {diff.newRecommendation.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-emerald-400 mt-1">
                  {formatCurrency(diff.newMonthlySavings)}/mo savings
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {diff.newReasoning}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unchanged tool row
  const { unchanged } = props;

  return (
    <div className="border border-slate-700/50 bg-slate-800/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <span className="text-slate-500 text-lg">✓</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">
              {unchanged.toolName}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500 border border-slate-700/50 uppercase tracking-wide font-medium">
              Unchanged
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {unchanged.recommendationType === "optimal"
              ? "Still optimal"
              : `${formatCurrency(unchanged.monthlySavings)}/mo savings — same recommendation`}
          </p>
        </div>
        <span className="text-slate-600 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-700/30 pt-3">
          <p className="text-sm text-slate-400">{unchanged.reasoning}</p>
        </div>
      )}
    </div>
  );
}
