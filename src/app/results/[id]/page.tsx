"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { AuditResult, ReauditResponse } from "@/types";
import { SavingsHero } from "@/components/audit/SavingsHero";
import { ToolResultCard } from "@/components/audit/ToolResultCard";
import { AISummaryBlock } from "@/components/audit/AISummaryBlock";
import { CredexCTA } from "@/components/audit/CredexCTA";
import { LeadCaptureForm } from "@/components/audit/LeadCaptureForm";
import { ShareButton } from "@/components/audit/ShareButton";
import { ReauditBanner } from "@/components/audit/ReauditBanner";
import { DiffView } from "@/components/audit/DiffView";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const showReauditBanner = searchParams.get("reaudit") === "1";

  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reauditData, setReauditData] = useState<ReauditResponse | null>(null);

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

    // 2. Fall back to API
    fetch(`/api/audit/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAudit(json.data);
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

  // After re-audit, show the fresh result with diff view
  const displayAudit = reauditData ? reauditData.fresh : audit;
  const toolsWithSavings = displayAudit.toolResults.filter((r) => r.monthlySavings > 0);
  const toolsOptimal = displayAudit.toolResults.filter((r) => r.monthlySavings === 0);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border max-w-3xl mx-auto">
        <Link href="/" className="font-display text-xl text-brand-400">SpendWise</Link>
        <div className="flex items-center gap-3">
          <ShareButton auditId={displayAudit.id} />
          <Link href="/audit" className="text-sm text-slate-400 hover:text-white transition-colors">
            New audit →
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pb-20">
        {/* Round 2: Re-audit banner — show when ?reaudit=1 and no diff yet */}
        {showReauditBanner && !reauditData && (
          <div className="pt-6">
            <ReauditBanner
              auditId={id}
              onDiffReady={(data) => {
                setReauditData(data);
                // Cache fresh audit in session
                sessionStorage.setItem(
                  `audit_${data.newAuditId}`,
                  JSON.stringify(data.fresh)
                );
              }}
            />
          </div>
        )}

        <SavingsHero result={displayAudit} />
        <div className="border-t border-surface-border mb-8" />

        {/* Round 2: DiffView after re-audit completes */}
        {reauditData && (
          <section className="mb-8">
            <DiffView
              diff={reauditData.diff}
              original={reauditData.original}
              fresh={reauditData.fresh}
            />
            <div className="border-t border-surface-border mt-8 mb-8" />
          </section>
        )}

        <section className="mb-6">
          <AISummaryBlock result={displayAudit} />
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
          <CredexCTA result={displayAudit} />
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
          <LeadCaptureForm result={displayAudit} />
        </section>

        <p className="text-center text-xs text-slate-600">
          Audit ID: <code className="font-mono text-slate-500">{displayAudit.id}</code>
          {reauditData && (
            <span className="ml-2 text-slate-600">
              · Re-audit of <code className="font-mono text-slate-600">{id}</code>
            </span>
          )}
        </p>
      </div>
    </main>
  );
}
