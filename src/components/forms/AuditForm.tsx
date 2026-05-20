"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStore } from "@/lib/store";
import { TOOLS } from "@/lib/pricing-data";
import { ToolCard } from "./ToolCard";
import { useHydrated } from "@/hooks/useHydrated";
import type { AuditResult, ToolId, UseCase } from "@/types";
import { cn } from "@/lib/utils";

const USE_CASES: { value: UseCase; label: string; description: string }[] = [
  { value: "coding", label: "Coding", description: "Writing, reviewing, or debugging code" },
  { value: "writing", label: "Writing", description: "Docs, content, emails, reports" },
  { value: "data", label: "Data", description: "Analysis, SQL, spreadsheets" },
  { value: "research", label: "Research", description: "Summarising, Q&A, synthesis" },
  { value: "mixed", label: "Mixed", description: "A bit of everything" },
];

export function AuditForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { formData, setTeamSize, setUseCase, addTool, updateTool, removeTool } =
    useFormStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-surface-card rounded-xl" />
        <div className="h-16 bg-surface-card rounded-xl" />
        <div className="h-32 bg-surface-card rounded-xl border border-dashed border-surface-border" />
        <div className="h-14 bg-surface-card rounded-xl" />
      </div>
    );
  }

  function handleAddTool() {
    const firstTool = TOOLS[0];
    const firstPlan = firstTool.plans[0];
    addTool({
      toolId: firstTool.id as ToolId,
      planId: firstPlan.id,
      seats: formData.teamSize || 1,
      monthlySpend: firstPlan.pricePerSeat * (formData.teamSize || 1),
    });
  }

  async function handleSubmit() {
    if (formData.tools.length === 0) {
      setError("Add at least one AI tool to audit.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = (await res.json()) as { data?: AuditResult; error?: string };

      if (!res.ok || json.error) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      sessionStorage.setItem(
        `audit_${json.data!.id}`,
        JSON.stringify(json.data)
      );

      router.push(`/results/${json.data!.id}`);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalMonthlySpend = formData.tools.reduce(
    (sum, t) => sum + t.monthlySpend,
    0
  );

  return (
    <div className="space-y-8">
      {/* Step 1: Team context */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-4">
          01 — Your Team
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="teamSize"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Team size
              <span className="text-slate-500 font-normal ml-1">(people using AI tools)</span>
            </label>
            {/* text-base prevents iOS auto-zoom on focus; inputMode triggers numeric keyboard */}
            <input
              id="teamSize"
              type="number"
              min={1}
              max={10000}
              inputMode="numeric"
              value={formData.teamSize}
              onChange={(e) =>
                setTeamSize(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full bg-surface-card border border-surface-border text-white rounded-xl px-4 py-3 text-base focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Primary use case
            </label>
            <select
              value={formData.useCase}
              onChange={(e) => setUseCase(e.target.value as UseCase)}
              className="w-full bg-surface-card border border-surface-border text-white rounded-xl px-4 py-3 text-base focus:border-brand-500 focus:outline-none transition-colors"
            >
              {USE_CASES.map((uc) => (
                <option key={uc.value} value={uc.value}>
                  {uc.label} — {uc.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Step 2: Tools */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-brand-400">
            02 — Your AI Tools
          </h2>
          {formData.tools.length > 0 && (
            <span className="text-xs text-slate-500">
              {formData.tools.length} tool{formData.tools.length !== 1 ? "s" : ""} added
            </span>
          )}
        </div>

        {formData.tools.length === 0 ? (
          <div
            className="card border-dashed border-surface-border p-8 sm:p-10 text-center cursor-pointer hover:border-brand-500/40 transition-colors"
            onClick={handleAddTool}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleAddTool()}
          >
            <div className="text-3xl mb-3">+</div>
            <p className="text-slate-400 text-sm">Add your first AI tool</p>
            <p className="text-slate-600 text-xs mt-1">
              Cursor, Claude, ChatGPT, Copilot, and more
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.tools.map((entry, index) => (
              <ToolCard
                key={index}
                entry={entry}
                index={index}
                onChange={updateTool}
                onRemove={removeTool}
              />
            ))}
          </div>
        )}

        {formData.tools.length > 0 && (
          /* min-h-[44px] meets WCAG 2.5.5 tap target size for mobile */
          <button
            type="button"
            onClick={handleAddTool}
            className="mt-3 w-full card border-dashed py-3 text-sm text-slate-400 hover:text-brand-400 hover:border-brand-500/30 transition-all min-h-[44px]"
          >
            + Add another tool
          </button>
        )}
      </section>

      {/* Spend summary bar */}
      {formData.tools.length > 0 && (
        <div className="card p-4 flex items-center justify-between gap-4 bg-surface-card/50">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Total monthly spend entered
            </p>
            <p className="text-xl sm:text-2xl font-display text-white mt-0.5 truncate">
              ${totalMonthlySpend.toLocaleString()}
              <span className="text-sm text-slate-400 font-body ml-1">/mo</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Annual</p>
            <p className="text-base sm:text-lg text-slate-300 mt-0.5">
              ${(totalMonthlySpend * 12).toLocaleString()}/yr
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Submit — min-h-[52px] for reliable thumb tap on mobile */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || formData.tools.length === 0}
        className={cn(
          "w-full py-4 rounded-xl font-semibold text-base transition-all min-h-[52px]",
          "bg-brand-500 text-white shadow-lg shadow-brand-500/20",
          "hover:bg-brand-600 hover:scale-[1.01] active:scale-100",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Running audit…
          </span>
        ) : (
          "Run my free audit →"
        )}
      </button>

      <p className="text-center text-xs text-slate-600">
        No account required. Results shown instantly before we ask for anything.
      </p>
    </div>
  );
}