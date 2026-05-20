import type { ReauditDiff, AuditResult } from "@/types";
import { DiffToolRow } from "./DiffToolRow";
import { SavingsDelta } from "./SavingsDelta";

interface Props {
  diff: ReauditDiff;
  original: AuditResult;
  fresh: AuditResult;
}

export function DiffView({ diff, original, fresh }: Props) {
  const changedSet = new Set(diff.toolDiffs.map((d) => d.toolId));
  const unchangedTools = fresh.toolResults.filter(
    (r) => !changedSet.has(r.toolEntry.toolId)
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
          What changed
        </h2>
        <SavingsDelta
          before={original.totalMonthlySavings}
          after={fresh.totalMonthlySavings}
        />
      </div>

      {diff.toolDiffs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400/70 mb-2">
            Updated recommendations · {diff.toolDiffs.length} tool
            {diff.toolDiffs.length !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            {diff.toolDiffs.map((td) => (
              <DiffToolRow key={td.toolId} diff={td} defaultOpen={true} />
            ))}
          </div>
        </div>
      )}

      {unchangedTools.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-2">
            Unchanged · {unchangedTools.length} tool
            {unchangedTools.length !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            {unchangedTools.map((r) => (
              <DiffToolRow
                key={r.toolEntry.toolId}
                unchanged={r}
                defaultOpen={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
