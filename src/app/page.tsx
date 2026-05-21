import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-surface-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display text-xl text-brand-400">SpendWise</span>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-slate-400 hover:text-white border border-surface-border hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Admin / Detect Changes
            </Link>
            <a
              href="https://credex.rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Credex →
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Free · No login required · Results in 30 seconds
        </div>

        <h1 className="font-display text-5xl md:text-7xl text-white mb-6 leading-tight">
          You&apos;re probably
          <br />
          <span className="text-brand-400">overpaying for AI.</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          SpendWise audits your AI tool stack and shows exactly where you&apos;re
          overspending — then alerts you automatically when pricing changes,
          so your recommendations never go stale.
        </p>

        <Link
          href="/audit"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-black font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 active:scale-100 shadow-lg shadow-brand-500/20"
        >
          Audit my AI spend →
        </Link>
        <p className="mt-4 text-sm text-slate-500">
          Takes 2 minutes. Shows savings before asking for anything.
        </p>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-t border-surface-border py-10 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { n: "$480", label: "avg monthly savings found" },
            { n: "8",    label: "AI tools audited" },
            { n: "2 min", label: "to complete an audit" },
          ].map(({ n, label }) => (
            <div key={label}>
              <div className="font-display text-3xl text-brand-400 mb-1">{n}</div>
              <div className="text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-border py-5 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-xs text-slate-600">
            A free tool by{" "}
            <a href="https://credex.rocks" className="text-slate-500 hover:text-white transition-colors">
              Credex
            </a>{" "}
            — discounted AI infrastructure credits for startups.
          </p>
          <Link href="/admin" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Admin →
          </Link>
        </div>
      </footer>

    </main>
  );
}
