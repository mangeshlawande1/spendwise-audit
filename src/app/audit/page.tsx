import Link from "next/link";
import type { Metadata } from "next";
import { AuditForm } from "@/components/forms/AuditForm";

export const metadata: Metadata = {
  title: "Audit Your AI Spend — SpendWise",
  description:
    "Tell us what AI tools you use and we'll show exactly where you're overspending.",
};

export default function AuditPage({
  searchParams,
}: {
  searchParams: { expired?: string };
}) {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border max-w-3xl mx-auto">
        <Link href="/" className="font-display text-xl text-brand-400">
          SpendWise
        </Link>
        <span className="text-sm text-slate-500">Free · No login required</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {searchParams.expired && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm px-4 py-3 rounded-xl">
            That audit link expired — the server restarted. Your form data is still saved below. Just hit <strong>Run audit</strong> again.
          </div>
        )}

        <div className="mb-10">
          <h1 className="font-display text-4xl md:text-5xl text-white mb-3 leading-tight">
            What AI tools does
            <br />
            your team use?
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Add each tool, plan, and what you currently pay. We&apos;ll show
            overspend and savings opportunities instantly — no signup required.
          </p>
        </div>

        <AuditForm />
      </div>
    </main>
  );
}