"use client";

import type { AuditResult, ReauditDiff } from "@/types";
import { SavingsDelta } from "./SavingsDelta";
import { DiffToolRow } from "./DiffToolRow";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface DiffViewProps {
  original: AuditResult;
  fresh: AuditResult;
  diff: ReauditDiff;
}

export function DiffView({ original, fresh, diff }: DiffViewProps) {
  const changedDiffs = diff.toolDiffs.filter((d) => d.changed);
  const unchangedDiffs = diff.toolDiffs.filter((d) => !d.changed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h2 className="font-display text-2xl text-white mb-1">
          Re-audit complete
        </h2>
        <p className="text-slate-400 text-sm">
          Comparing original audit vs. current pricing
        </p>
      </div>

      {/* Savings delta hero */}
      <SavingsDelta
        before={original.totalMonthlySavings}
        after={fresh.totalMonthlySavings}
      />

      {/* Annual savings callout */}
      {diff.savingsDelta !== 0 && (
        <div className="text-center">
          <p className="text-slate-500 text-xs">
            That&apos;s{" "}
            <span
              className={
                diff.savingsDelta > 0 ? "text-brand-400 font-medium" : "text-red-400 font-medium"
              }
            >
              {diff.savingsDelta > 0 ? "+" : ""}
              {formatCurrency(diff.savingsDelta * 12)}/yr
            </span>{" "}
            {diff.savingsDelta > 0 ? "more savings" : "less savings"} annually
          </p>
        </div>
      )}

      {/* Changed tools */}
      {changedDiffs.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
            Changed recommendations · {changedDiffs.length} tool
            {changedDiffs.length !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-3">
            {changedDiffs.map((td) => (
              <DiffToolRow key={td.toolId} diff={td} defaultOpen={true} />
            ))}
          </div>
        </section>
      )}

      {/* Unchanged tools */}
      {unchangedDiffs.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Unchanged · {unchangedDiffs.length} tool
            {unchangedDiffs.length !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            {unchangedDiffs.map((td) => (
              <DiffToolRow key={td.toolId} diff={td} defaultOpen={false} />
            ))}
          </div>
        </section>
      )}

      {/* No changes at all */}
      {diff.changedToolCount === 0 && (
        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">✓</div>
          <p className="text-white font-semibold mb-1">
            No changes to recommendations
          </p>
          <p className="text-slate-400 text-sm">
            Pricing updates didn&apos;t affect the advice for your stack.
          </p>
        </div>
      )}

      {/* Link to fresh audit */}
      <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
            Fresh audit saved
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            ID: <code className="font-mono">{fresh.id}</code>
          </p>
        </div>
        <Link
          href={`/results/${fresh.id}`}
          className="text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium"
        >
          View full audit →
        </Link>
      </div>
    </div>
  );
}
