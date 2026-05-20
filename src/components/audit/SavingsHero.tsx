import type { AuditResult } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface SavingsHeroProps {
  result: AuditResult;
}

export function SavingsHero({ result }: SavingsHeroProps) {
  const { totalMonthlySavings, totalAnnualSavings, savingsTier } = result;
  const isOptimal = savingsTier === "optimal";

  if (isOptimal) {
    return (
      <div className="text-center py-10 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 mb-5">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-3">
          You&apos;re spending well.
        </h1>
        <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
          Your current AI tool stack is well-matched to your team size and use
          case. No savings opportunities identified at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-10 px-4">
      {/* Tier badge */}
      <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
        {savingsTier === "high"
          ? "Significant overspend detected"
          : savingsTier === "medium"
          ? "Moderate savings available"
          : "Small optimisation available"}
      </div>

      {/* Big number — responsive so it never clips on 375px screens */}
      <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white mb-2 leading-none break-words">
        {formatCurrency(totalMonthlySavings)}
        <span className="text-slate-400 text-xl sm:text-2xl font-body ml-2">/mo</span>
      </h1>

      <p className="text-slate-400 text-sm sm:text-base mb-1">
        in identified savings ·{" "}
        <span className="text-brand-400 font-semibold whitespace-nowrap">
          {formatCurrency(totalAnnualSavings)} per year
        </span>
      </p>

      <p className="text-slate-600 text-xs mt-3 leading-relaxed">
        Based on {result.formData.tools.length} tool
        {result.formData.tools.length !== 1 ? "s" : ""} audited ·{" "}
        {result.formData.teamSize} person team ·{" "}
        {result.formData.useCase} use case
      </p>
    </div>
  );
}