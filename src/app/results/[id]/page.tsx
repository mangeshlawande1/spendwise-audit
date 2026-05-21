"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { AuditResult, ReauditResponse } from "@/types";
import { SavingsHero } from "@/components/audit/SavingsHero";
import { ToolResultCard } from "@/components/audit/ToolResultCard";
import { AISummaryBlock } from "@/components/audit/AISummaryBlock";
import { CredexCTA } from "@/components/audit/CredexCTA";
import { LeadCaptureForm } from "@/components/audit/LeadCaptureForm";
import { ShareButton } from "@/components/audit/ShareButton";
import { DiffView } from "@/components/audit/DiffView";

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-audit state — only active when ?reaudit=1 is in the URL
  const isReauditMode = searchParams.get("reaudit") === "1";
  const [reauditData, setReauditData] = useState<ReauditResponse | null>(null);
  const [reauditLoading, setReauditLoading] = useState(false);
  const [reauditError, setReauditError] = useState<string | null>(null);

  // Trigger the re-audit API — called automatically when ?reaudit=1
  const runReaudit = useCallback(async (auditId: string) => {
    setReauditLoading(true);
    setReauditError(null);
    try {
      const res = await fetch(`/api/audit/${auditId}/reaudit`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Re-audit failed");
      setReauditData(json.data as ReauditResponse);
    } catch (e) {
      setReauditError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setReauditLoading(false);
    }
  }, []);

  // Load the original audit, then auto-trigger re-audit if ?reaudit=1
  useEffect(() => {
    if (!id) return;

    // Try sessionStorage first (avoids a round-trip on same-session loads)
    const cached = sessionStorage.getItem(`audit_${id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AuditResult;
        setAudit(parsed);
        setLoading(false);
        if (isReauditMode) runReaudit(parsed.id);
        return;
      } catch {
        sessionStorage.removeItem(`audit_${id}`);
      }
    }

    fetch(`/api/audit/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setAudit(json.data);
          sessionStorage.setItem(`audit_${id}`, JSON.stringify(json.data));
          if (isReauditMode) runReaudit(json.data.id);
        } else {
          router.replace("/audit?expired=1");
        }
      })
      .catch(() => router.replace("/audit?expired=1"))
      .finally(() => setLoading(false));
  }, [id, router, isReauditMode, runReaudit]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen">
        <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border max-w-3xl mx-auto">
          <Link href="/" className="font-display text-xl text-brand-400">SpendWise</Link>
        </nav>
        <div className="max-w-2xl mx-auto px-6 py-20 space-y-4 animate-pulse">
          <div className="h-40 bg-surface-card rounded-2xl" />
          <div className="h-20 bg-surface-card rounded-2xl" />
          <div className="h-28 bg-surface-card rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!audit) return null;

  const toolsWithSavings = audit.toolResults.filter((r) => r.monthlySavings > 0);
  const toolsOptimal    = audit.toolResults.filter((r) => r.monthlySavings === 0);

  return (
    <main className="min-h-screen">

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-surface-border max-w-3xl mx-auto">
        <Link href="/" className="font-display text-xl text-brand-400">SpendWise</Link>
        <div className="flex items-center gap-3">
          <ShareButton auditId={audit.id} />
          <Link href="/audit" className="text-sm text-slate-400 hover:text-white transition-colors">
            New audit →
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pb-20 pt-6">

        {/* ── RE-AUDIT MODE: banner + diff ───────────────────────────────────
            Shown only when user arrives via ?reaudit=1 (email link).
            The diff auto-runs. Original audit shown below for reference.     */}
        {isReauditMode && (
          <>
            {/* Loading state */}
            {reauditLoading && !reauditData && (
              <div className="mb-8 border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <span className="text-xl animate-spin inline-block">⟳</span>
                  <div>
                    <p className="text-amber-300 font-semibold text-sm">Running updated audit…</p>
                    <p className="text-amber-400/60 text-xs mt-0.5">
                      Comparing your original recommendations against current pricing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {reauditError && !reauditLoading && (
              <div className="mb-8 border border-red-500/30 bg-red-500/5 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">⚠</span>
                  <div className="flex-1">
                    <p className="text-red-400 font-semibold text-sm">Re-audit failed</p>
                    <p className="text-red-400/60 text-xs mt-1 font-mono">{reauditError}</p>
                    <button
                      type="button"
                      onClick={() => runReaudit(audit.id)}
                      className="mt-3 text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg transition-colors"
                    >
                      Retry →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Diff view — the main Round 2 feature */}
            {reauditData && !reauditLoading && (
              <div className="mb-8">
                <DiffView
                  original={reauditData.original}
                  fresh={reauditData.fresh}
                  diff={reauditData.diff}
                />
              </div>
            )}

            {/* Divider before original audit */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 border-t border-surface-border" />
              <span className="text-xs text-slate-600 font-mono uppercase tracking-widest px-2">
                original audit
              </span>
              <div className="flex-1 border-t border-surface-border" />
            </div>
          </>
        )}

        {/* ── Original audit content (always shown) ─────────────────────── */}
        <SavingsHero result={audit} />

        <div className="border-t border-surface-border my-6" />

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

        {/* Only show lead form if NOT in re-audit mode (they already gave email) */}
        {!isReauditMode && (
          <section className="mb-6">
            <LeadCaptureForm result={audit} />
          </section>
        )}

        <p className="text-center text-xs text-slate-700 mt-4">
          Audit ID: <code className="font-mono text-slate-600">{audit.id}</code>
        </p>

      </div>
    </main>
  );
}
