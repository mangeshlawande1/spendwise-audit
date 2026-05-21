"use client";

import { useState } from "react";
import type { AuditResult } from "@/types";
import { cn } from "@/lib/utils";

interface LeadCaptureFormProps {
  result: AuditResult;
}

export function LeadCaptureForm({ result }: LeadCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Honeypot field — bots fill this, humans don't see it
  const [honeypot, setHoneypot] = useState("");

  async function handleSubmit() {
    if (honeypot) return;
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          companyName: company.trim() || undefined,
          role: role.trim() || undefined,
          teamSize: result.formData.teamSize,
          auditId: result.id,
          website: honeypot,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="card p-6 text-center space-y-4">
        <div className="text-3xl">📬</div>
        <div>
          <h3 className="text-white font-semibold mb-1">Report sent!</h3>
          <p className="text-slate-400 text-sm">
            Check your inbox for a copy of this audit.
            {result.savingsTier === "high" && (
              <> Our team will reach out to discuss how Credex credits can help.</>
            )}
          </p>
        </div>

        {/* Pricing alert notice — explains the re-audit flow to the user */}
        <div className="border-t border-surface-border pt-4">
          <div className="flex items-start gap-3 text-left bg-brand-500/5 border border-brand-500/20 rounded-xl p-4">
            <span className="text-lg flex-shrink-0">⚡</span>
            <div>
              <p className="text-brand-300 font-semibold text-sm">
                Pricing alerts are on
              </p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                If pricing changes on any tool in your audit, we&apos;ll email you
                automatically. You&apos;ll get a one-click link to see exactly what
                changed and how it affects your recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="text-white font-semibold mb-1">Get your report by email</h3>
      <p className="text-slate-400 text-sm mb-5">
        We&apos;ll send a copy of this audit and alert you if pricing changes on
        any of your tools — so your recommendations never go stale.
        {result.savingsTier === "high" && (
          <> For high-savings cases, our team will follow up with options.</>
        )}
      </p>

      {/* Honeypot — hidden from real users */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="lead-email" className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
            Email *
          </label>
          <input
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            className="w-full bg-surface border border-surface-border text-white rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors placeholder-slate-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lead-company" className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
              Company
            </label>
            <input
              id="lead-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              autoComplete="organization"
              className="w-full bg-surface border border-surface-border text-white rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors placeholder-slate-600"
            />
          </div>
          <div>
            <label htmlFor="lead-role" className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">
              Role
            </label>
            <input
              id="lead-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="CTO, Founder…"
              autoComplete="organization-title"
              className="w-full bg-surface border border-surface-border text-white rounded-lg px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors placeholder-slate-600"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-xs">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-sm transition-all",
            "bg-brand-500 text-white shadow-md shadow-brand-500/20",
            "hover:bg-brand-600 active:scale-100",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {loading ? "Sending…" : "Send my report →"}
        </button>

        <p className="text-center text-xs text-slate-600">
          No spam. We&apos;ll only email you when pricing changes on your tools.
        </p>
      </div>
    </div>
  );
}
