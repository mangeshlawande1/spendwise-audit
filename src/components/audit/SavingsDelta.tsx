import { formatCurrency } from "@/lib/utils";

interface Props {
  before: number;
  after: number;
}

export function SavingsDelta({ before, after }: Props) {
  const delta = after - before;
  const isImproved = delta > 0;
  const isUnchanged = Math.abs(delta) < 1;

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-card border border-surface-border">
      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
          Previous savings
        </p>
        <p className="text-xl font-semibold text-slate-300">
          {formatCurrency(before)}<span className="text-sm font-normal text-slate-500">/mo</span>
        </p>
      </div>

      <div className="text-slate-600 text-xl">→</div>

      <div className="text-center">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
          Updated savings
        </p>
        <p className="text-xl font-semibold text-white">
          {formatCurrency(after)}<span className="text-sm font-normal text-slate-400">/mo</span>
        </p>
      </div>

      {!isUnchanged && (
        <div
          className={`ml-auto px-3 py-1.5 rounded-full text-sm font-semibold ${
            isImproved
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {isImproved ? "↑" : "↓"} {formatCurrency(Math.abs(delta))}/mo
        </div>
      )}

      {isUnchanged && (
        <div className="ml-auto px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-700/50 text-slate-400 border border-slate-700">
          No change
        </div>
      )}
    </div>
  );
}
