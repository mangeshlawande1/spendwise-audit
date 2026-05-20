"use client";
import { useState } from "react";
import type { ReauditResponse } from "@/types";

interface Props {
  auditId: string;
  onDiffReady: (diff: ReauditResponse) => void;
}

export function ReauditBanner({ auditId, onDiffReady }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleReaudit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/${auditId}/reaudit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onDiffReady(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-amber-400/50 bg-amber-950/30 rounded-xl p-4 mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-amber-300 font-semibold">
              Pricing has changed since your audit
            </p>
            <p className="text-amber-400/70 text-sm mt-1">
              Re-run to see updated recommendations with a side-by-side
              comparison of what changed.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-600 hover:text-slate-400 transition-colors text-lg leading-none shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleReaudit}
          disabled={loading}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-lg text-sm font-semibold transition-colors"
        >
          {loading ? "Running fresh audit…" : "Re-run Audit →"}
        </button>
        {loading && (
          <p className="text-amber-400/60 text-sm">
            This usually takes a few seconds…
          </p>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm mt-2">
          Error: {error}. Please try again.
        </p>
      )}
    </div>
  );
}
