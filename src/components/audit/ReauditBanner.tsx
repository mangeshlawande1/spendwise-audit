"use client";

import { useState } from "react";
import type { ReauditResponse } from "@/types";

interface ReauditBannerProps {
  auditId: string;
  onDiffReady: (data: ReauditResponse) => void;
}

export function ReauditBanner({ auditId, onDiffReady }: ReauditBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReaudit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/audit/${auditId}/reaudit`, {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Re-audit failed");
      }

      onDiffReady(json.data as ReauditResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">⚡</span>
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-semibold text-sm">
            Pricing has changed on tools in this audit
          </p>
          <p className="text-amber-400/70 text-xs mt-1 leading-relaxed">
            Click below to re-run the audit against current pricing and see a
            side-by-side comparison of what changed.
          </p>

          {error && (
            <p role="alert" className="text-red-400 text-xs mt-2">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleReaudit}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <span className="animate-spin">⟳</span>
                Running audit…
              </>
            ) : (
              <>Re-run Audit →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
