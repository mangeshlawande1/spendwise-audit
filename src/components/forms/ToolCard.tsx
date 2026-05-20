"use client";

import { TOOLS } from "@/lib/pricing-data";
import type { ToolEntry, ToolId } from "@/types";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  entry: ToolEntry;
  index: number;
  onChange: (index: number, entry: ToolEntry) => void;
  onRemove: (index: number) => void;
}

const TOOL_ICONS: Record<ToolId, string> = {
  cursor: "⌨️",
  github_copilot: "🐙",
  claude: "🔮",
  chatgpt: "💬",
  anthropic_api: "🧠",
  openai_api: "⚡",
  gemini: "✨",
  windsurf: "🏄",
};

export function ToolCard({ entry, index, onChange, onRemove }: ToolCardProps) {
  const selectedTool = TOOLS.find((t) => t.id === entry.toolId);
  const selectedPlan = selectedTool?.plans.find((p) => p.id === entry.planId);
  const isApiTool = entry.toolId === "anthropic_api" || entry.toolId === "openai_api";

  function handleToolChange(toolId: ToolId) {
    const tool = TOOLS.find((t) => t.id === toolId);
    const firstPlan = tool?.plans[0];
    onChange(index, {
      toolId,
      planId: firstPlan?.id ?? "",
      seats: entry.seats,
      monthlySpend: firstPlan?.pricePerSeat
        ? firstPlan.pricePerSeat * entry.seats
        : entry.monthlySpend,
    });
  }

  function handlePlanChange(planId: string) {
    const plan = selectedTool?.plans.find((p) => p.id === planId);
    onChange(index, {
      ...entry,
      planId,
      monthlySpend: plan?.pricePerSeat
        ? plan.pricePerSeat * entry.seats
        : entry.monthlySpend,
    });
  }

  function handleSeatsChange(seats: number) {
    const plan = selectedTool?.plans.find((p) => p.id === entry.planId);
    onChange(index, {
      ...entry,
      seats,
      monthlySpend: plan?.pricePerSeat
        ? plan.pricePerSeat * seats
        : entry.monthlySpend,
    });
  }

  return (
    <div
      className={cn(
        "card p-5 transition-all duration-200",
        "border border-surface-border hover:border-brand-500/30"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TOOL_ICONS[entry.toolId]}</span>
          <span className="text-sm font-medium text-slate-300">
            Tool {index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-slate-500 hover:text-red-400 transition-colors text-sm px-2 py-1 rounded hover:bg-red-500/10"
          aria-label="Remove tool"
        >
          Remove
        </button>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tool selector */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
            Tool
          </label>
          <select
            value={entry.toolId}
            onChange={(e) => handleToolChange(e.target.value as ToolId)}
            className="w-full bg-surface border border-surface-border text-white rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
          >
            {TOOLS.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>

        {/* Plan selector */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
            Plan
          </label>
          <select
            value={entry.planId}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="w-full bg-surface border border-surface-border text-white rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
          >
            {selectedTool?.plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
                {plan.pricePerSeat > 0 ? ` — $${plan.pricePerSeat}/seat` : plan.pricePerSeat === 0 && plan.id.includes("free") ? " — Free" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Seats (hidden for API tools) */}
        {!isApiTool ? (
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
              Seats
            </label>
            <input
              type="number"
              min={1}
              max={9999}
              value={entry.seats}
              onChange={(e) => handleSeatsChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-surface border border-surface-border text-white rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
              Seats
            </label>
            <div className="w-full bg-surface/50 border border-surface-border text-slate-500 rounded-lg px-3 py-2.5 text-sm">
              Usage-based
            </div>
          </div>
        )}

        {/* Monthly spend */}
        <div className={cn(!isApiTool && "sm:col-span-2")}>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
            {isApiTool ? "Monthly Spend ($)" : "Actual Monthly Spend ($)"}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              $
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={entry.monthlySpend}
              onChange={(e) =>
                onChange(index, {
                  ...entry,
                  monthlySpend: Math.max(0, parseFloat(e.target.value) || 0),
                })
              }
              className="w-full bg-surface border border-surface-border text-white rounded-lg pl-7 pr-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
              placeholder="0"
            />
          </div>
          {selectedPlan && selectedPlan.pricePerSeat > 0 && !isApiTool && (
            <p className="text-xs text-slate-500 mt-1">
              Catalog price: ${selectedPlan.pricePerSeat * entry.seats}/mo
              {entry.monthlySpend !== selectedPlan.pricePerSeat * entry.seats && (
                <span className="text-brand-400/70 ml-1">(you entered a different amount — we&apos;ll use yours)</span>
              )}
            </p>
          )}
          {isApiTool && (
            <p className="text-xs text-slate-500 mt-1">
              Enter your last month&apos;s API invoice total
            </p>
          )}
        </div>
      </div>
    </div>
  );
}