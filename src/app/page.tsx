import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border max-w-6xl mx-auto w-full">
        <span className="font-display text-xl text-brand-400">SpendWise</span>
        <a
          href="https://credex.rocks"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Powered by Credex →
        </a>
      </nav>

      {/* Hero */}
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
          Most startups sign up for AI tools, never revisit the bill, and slowly
          bleed hundreds per month. SpendWise audits your stack in 30 seconds
          and shows exactly where you&apos;re overspending.
        </p>

        <Link
          href="/audit"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 active:scale-100 shadow-lg shadow-brand-500/20"
        >
          Audit my AI spend →
        </Link>

        <p className="mt-4 text-sm text-slate-500">
          Takes 2 minutes. We&apos;ll show you savings before asking for anything.
        </p>
      </section>

      {/* Social proof row */}
      <section className="border-t border-surface-border py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="font-display text-3xl text-brand-400 mb-1">$480</div>
            <div className="text-sm text-slate-400">avg monthly savings found</div>
          </div>
          <div>
            <div className="font-display text-3xl text-brand-400 mb-1">8</div>
            <div className="text-sm text-slate-400">AI tools audited</div>
          </div>
          <div>
            <div className="font-display text-3xl text-brand-400 mb-1">2 min</div>
            <div className="text-sm text-slate-400">to complete an audit</div>
          </div>
        </div>
      </section>

      <footer className="border-t border-surface-border py-6 px-6 text-center text-sm text-slate-500">
        <p>
          A free tool by{" "}
          <a href="https://credex.rocks" className="text-slate-400 hover:text-white transition-colors">
            Credex
          </a>{" "}
          — discounted AI infrastructure credits for startups.
        </p>
      </footer>
    </main>
  );
}
