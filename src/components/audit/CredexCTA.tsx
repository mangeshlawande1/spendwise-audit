import type { AuditResult } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface CredexCTAProps {
  result: AuditResult;
}

export function CredexCTA({ result }: CredexCTAProps) {
  const { savingsTier, totalMonthlySavings } = result;

  // High savings (>$500/mo): prominent Credex consultation CTA
  if (savingsTier === "high") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-brand-900/60 to-brand-800/20 border border-brand-500/30 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-lg">
            💡
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-base mb-1">
              Capture even more with Credex credits
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              You&apos;re leaving{" "}
              <span className="text-brand-400 font-medium">
                {formatCurrency(totalMonthlySavings)}/mo
              </span>{" "}
              on the table from plan inefficiencies alone. Credex sources
              discounted AI infrastructure credits — Cursor, Claude, ChatGPT
              Enterprise — from companies that overforecast. Same tools, 20–40%
              less.
            </p>
            <a
              href="https://credex.rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 active:scale-100 shadow-lg shadow-brand-500/20"
            >
              Book a free Credex consultation →
            </a>
            <p className="text-slate-600 text-xs mt-2">
              No commitment. 15-minute call to see if credits apply to your stack.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Low savings or optimal: soft "stay updated" prompt
  return (
    <div className="rounded-2xl border border-surface-border p-5 bg-surface-card/40">
      <p className="text-sm text-slate-400 mb-3">
        {savingsTier === "optimal"
          ? "Your stack is well-optimised right now. Want a heads-up when new savings apply to your tools?"
          : "Want to be notified when better deals appear for your stack?"}
      </p>
      <a
        href="https://credex.rocks"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
      >
        Learn about Credex AI credits →
      </a>
    </div>
  );
}
