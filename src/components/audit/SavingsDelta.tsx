import { formatCurrency } from "@/lib/utils";

interface SavingsDeltaProps {
  before: number;
  after: number;
}

export function SavingsDelta({ before, after }: SavingsDeltaProps) {
  const delta = after - before;
  const improved = delta > 0;
  const same = Math.abs(delta) < 1;

  return (
    <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
          Savings comparison
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-center">
            <div className="text-slate-500 font-display text-lg leading-none line-through">
              {formatCurrency(before)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">original/mo</div>
          </div>

          <span className="text-slate-600 text-lg">→</span>

          <div className="text-center">
            <div
              className={
                same
                  ? "text-slate-400 font-display text-xl leading-none"
                  : improved
                  ? "text-brand-400 font-display text-xl leading-none"
                  : "text-red-400 font-display text-xl leading-none"
              }
            >
              {formatCurrency(after)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">updated/mo</div>
          </div>
        </div>
      </div>

      {!same && (
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
            improved
              ? "bg-brand-500/10 border-brand-500/20 text-brand-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <span className="text-base">{improved ? "↑" : "↓"}</span>
          <span>
            {improved ? "+" : ""}
            {formatCurrency(delta)}/mo {improved ? "better" : "worse"}
          </span>
        </div>
      )}

      {same && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-slate-500/10 border-slate-500/20 text-slate-400">
          <span>≈ No change in savings</span>
        </div>
      )}
    </div>
  );
}
