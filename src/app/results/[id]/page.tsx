"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { AuditResult } from "@/types";
import { SavingsHero } from "@/components/audit/SavingsHero";
import { ToolResultCard } from "@/components/audit/ToolResultCard";
import { AISummaryBlock } from "@/components/audit/AISummaryBlock";
import { CredexCTA } from "@/components/audit/CredexCTA";
import { LeadCaptureForm } from "@/components/audit/LeadCaptureForm";
import { ShareButton } from "@/components/audit/ShareButton";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // 1. Try sessionStorage first (survives hot reloads, set by AuditForm on submit)
    const cached = sessionStorage.getItem(`audit_${id}`);
    if (cached) {
      try {
        setAudit(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {
        sessionStorage.removeItem(`audit_${id}`);
      }
    }

    // 2. Fall back to server-side in-memory store via API
    // (works in same process, fails after restart — Day 5 Supabase fixes this)
    fetch(`/api/audit/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAudit(json.data);
          // Re-cache in sessionStorage for subsequent navigations
          sessionStorage.setItem(`audit_${id}`, JSON.stringify(json.data));
        } else {
          router.replace("/audit?expired=1");
        }
      })
      .catch(() => router.replace("/audit?expired=1"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border max-w-3xl mx-auto">
          <Link href="/" aria-label="SpendWise — go to homepage" className="font-display text-xl text-brand-400">SpendWise</Link>
        </nav>
        <div role="status" aria-label="Loading your audit results" className="max-w-2xl mx-auto px-6 py-20 space-y-4 animate-pulse">
          <div className="h-40 bg-surface-card rounded-2xl" />
          <div className="h-20 bg-surface-card rounded-2xl" />
          <div className="h-28 bg-surface-card rounded-2xl" />
          <div className="h-28 bg-surface-card rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!audit) return null;

  const toolsWithSavings = audit.toolResults.filter((r) => r.monthlySavings > 0);
  const toolsOptimal = audit.toolResults.filter((r) => r.monthlySavings === 0);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border max-w-3xl mx-auto">
        <Link href="/" className="font-display text-xl text-brand-400">SpendWise</Link>
        <div className="flex items-center gap-3">
          <ShareButton auditId={audit.id} />
          <Link href="/audit" className="text-sm text-slate-400 hover:text-white transition-colors">
            New audit →
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pb-20">
        <SavingsHero result={audit} />
        <div className="border-t border-surface-border mb-8" />

        <section className="mb-6">
          <AISummaryBlock result={audit} />
        </section>

        {toolsWithSavings.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
              Savings opportunities · {toolsWithSavings.length} tool{toolsWithSavings.length !== 1 ? "s" : ""}
            </h2>
            <div className="space-y-3">
              {toolsWithSavings
                .sort((a, b) => b.monthlySavings - a.monthlySavings)
                .map((r, i) => <ToolResultCard key={i} result={r} />)}
            </div>
          </section>
        )}

        <section className="mb-6">
          <CredexCTA result={audit} />
        </section>

        {toolsOptimal.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Already optimal · {toolsOptimal.length} tool{toolsOptimal.length !== 1 ? "s" : ""}
            </h2>
            <div className="space-y-3">
              {toolsOptimal.map((r, i) => <ToolResultCard key={i} result={r} />)}
            </div>
          </section>
        )}

        <section className="mb-6">
          <LeadCaptureForm result={audit} />
        </section>

        <p className="text-center text-xs text-slate-600">
          Audit ID: <code className="font-mono text-slate-500">{audit.id}</code>
        </p>
      </div>
    </main>
  );
}