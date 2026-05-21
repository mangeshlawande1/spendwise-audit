"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { DetectChangesResponse } from "@/types";

type Status = "idle" | "running" | "done" | "error";

const TOOLS = [
  { value: "cursor",         label: "Cursor" },
  { value: "github_copilot", label: "GitHub Copilot" },
  { value: "claude",         label: "Claude" },
  { value: "chatgpt",        label: "ChatGPT" },
  { value: "windsurf",       label: "Windsurf" },
  { value: "",               label: "No simulation (use real pricing)" },
];

export default function AdminPage() {
  const [secret,   setSecret]   = useState("");
  const [simulate, setSimulate] = useState("cursor");
  const [status,   setStatus]   = useState<Status>("idle");
  const [result,   setResult]   = useState<DetectChangesResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [log,      setLog]      = useState<string[]>([]);
  const [ms,       setMs]       = useState<number | null>(null);

  // Persist the CRON_SECRET across page reloads (admin convenience only)
  useEffect(() => {
    const s = localStorage.getItem("cron_secret");
    if (s) setSecret(s);
  }, []);

  function addLog(msg: string) {
    setLog((p) => [...p, `${new Date().toLocaleTimeString()} — ${msg}`]);
  }

  async function run() {
    if (status === "running") return;
    setStatus("running");
    setResult(null);
    setErrorMsg(null);
    setLog([]);
    setMs(null);

    if (secret) localStorage.setItem("cron_secret", secret);

    const qs = new URLSearchParams();
    if (simulate) qs.set("simulate", simulate);
    if (secret)   qs.set("secret",   secret);
    const url = `/api/detect-changes?${qs}`;

    addLog(`GET ${url}`);
    const t0 = Date.now();

    try {
      const res  = await fetch(url);
      const json = await res.json();
      const dur  = Date.now() - t0;
      setMs(dur);

      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`);

      const d = json.data as DetectChangesResponse;
      setResult(d);
      setStatus("done");
      addLog(`✓ ${dur}ms · hasChanges=${d.hasChanges} · emailsSent=${d.emailsSent} · affectedAudits=${d.affectedAudits}`);
      if (d.changedTools.length) addLog(`Changed tools: ${d.changedTools.join(", ")}`);
      if (d.skipped) addLog(`⚠ Skipped — ${d.skipReason}`);
      if (d.eventId) addLog(`Event ID: ${d.eventId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setErrorMsg(msg);
      setStatus("error");
      addLog(`✗ ${msg}`);
    }
  }

  const simulateLabel = TOOLS.find((t) => t.value === simulate)?.label ?? simulate;

  return (
    <main className="min-h-screen bg-surface">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-surface-border">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl text-brand-400">SpendWise</Link>
          <div className="flex items-center gap-4">
            <Link href="/audit" className="text-sm text-slate-400 hover:text-white transition-colors">
              Submit audit →
            </Link>
            <span className="text-xs font-mono bg-surface-card border border-surface-border text-slate-500 px-2 py-1 rounded">
              admin
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div>
          <h1 className="font-display text-3xl text-white mb-2">
            Pricing Change Detector
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Run pricing change detection, trigger notification emails, and verify
            the end-to-end re-audit flow. Follow the steps below in order.
          </p>
        </div>

        {/* ── STEP 1 — Submit an audit ─────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 text-sm font-bold">1</span>
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold mb-1">Submit an audit with your email</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-3">
                Go to <Link href="/audit" className="text-brand-400 hover:underline">/audit</Link>,
                add <strong className="text-slate-200">{simulateLabel || "any tool"}</strong> to
                your stack, and submit. On the results page, scroll down to
                <em className="text-slate-300"> "Get your report by email"</em> and enter a real email
                address. This links your email to the audit so detection can find it.
              </p>
              <Link
                href="/audit"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 px-4 py-2 rounded-lg transition-colors"
              >
                Go to /audit →
              </Link>
            </div>
          </div>
        </div>

        {/* ── STEP 2 — Configure detection ─────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 text-sm font-bold">2</span>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-white font-semibold mb-1">Configure detection</h2>
                <p className="text-slate-400 text-sm">
                  Set your secret and choose which tool to simulate a price change on.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="secret" className="block text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5">
                    CRON_SECRET
                  </label>
                  <input
                    id="secret"
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Value from .env.local — e.g. test123"
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-brand-500/50"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    Must match <code className="font-mono text-slate-500">CRON_SECRET</code> in your env.
                    Leave blank if the var is unset (local dev).
                  </p>
                </div>

                <div>
                  <label htmlFor="simulate" className="block text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5">
                    Simulate price change on
                  </label>
                  <select
                    id="simulate"
                    value={simulate}
                    onChange={(e) => setSimulate(e.target.value)}
                    className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50"
                  >
                    {TOOLS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-600 mt-1">
                    Patches the stored snapshot to look $5/seat higher — triggers
                    a real diff without editing any pricing files.
                    Your audit must include this tool and have an email attached.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP 3 — Run detection ────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 text-sm font-bold">3</span>
            </div>
            <div className="flex-1">
              <h2 className="text-white font-semibold mb-1">Run detection</h2>
              <p className="text-slate-400 text-sm mb-4">
                Scans all stored audits, finds pricing changes, and sends one
                consolidated email per affected user.
              </p>

              <button
                onClick={run}
                disabled={status === "running"}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all
                  bg-brand-500 hover:bg-brand-400 text-black
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {status === "running"
                  ? <><span className="animate-spin text-base">⟳</span> Running…</>
                  : "⚡ Run Pricing Change Detection"}
              </button>

              <p className="text-xs text-slate-600 mt-2 text-center">
                Also runs automatically at 09:00 UTC daily via{" "}
                <code className="font-mono text-slate-500">vercel.json</code> cron (Vercel Pro).
                On free tier, use this button.
              </p>
            </div>
          </div>
        </div>

        {/* ── Execution log ─────────────────────────────────────────────────── */}
        {log.length > 0 && (
          <div className="bg-surface-card border border-surface-border rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Log</p>
            {log.map((l, i) => (
              <p key={i} className="font-mono text-xs text-slate-400 leading-relaxed">{l}</p>
            ))}
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {status === "error" && errorMsg && (
          <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-5 space-y-3">
            <p className="text-red-400 font-semibold text-sm">✗ Detection failed</p>
            <p className="text-red-400/70 text-xs font-mono">{errorMsg}</p>
            <div className="border-t border-red-500/10 pt-3 space-y-1 text-xs text-slate-500">
              <p className="text-slate-400 font-medium mb-1">Common causes</p>
              <p>• <strong>Unauthorized</strong> — CRON_SECRET here doesn't match your env var</p>
              <p>• <strong>No audits found</strong> — complete Step 1 first (submit audit + enter email)</p>
              <p>• <strong>Wrong tool</strong> — your audit must include the tool you're simulating</p>
              <p>• <strong>Already notified</strong> — delete the latest row in Supabase <code className="font-mono">pricing_events</code> table and retry</p>
            </div>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────────────────── */}
        {status === "done" && result && (
          <div className={`border rounded-xl p-5 space-y-5 ${
            result.emailsSent > 0
              ? "border-brand-500/30 bg-brand-500/5"
              : "border-slate-500/20 bg-slate-500/5"
          }`}>
            {/* Headline */}
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm">
                {result.emailsSent > 0
                  ? `✓ ${result.emailsSent} email${result.emailsSent !== 1 ? "s" : ""} sent`
                  : result.skipped
                  ? "⚠ Skipped — already notified recently"
                  : "✓ No pricing changes detected"}
              </p>
              {ms && <span className="text-xs font-mono text-slate-500">{ms}ms</span>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Changes",  value: result.hasChanges ? "Yes" : "No", hi: result.hasChanges },
                { label: "Audits",   value: result.affectedAudits,             hi: result.affectedAudits > 0 },
                { label: "Emails",   value: result.emailsSent,                 hi: result.emailsSent > 0 },
                { label: "Tools",    value: result.changedTools.length,         hi: result.changedTools.length > 0 },
              ].map(({ label, value, hi }) => (
                <div key={label} className="bg-surface-card border border-surface-border rounded-lg p-3 text-center">
                  <div className={`font-display text-2xl leading-none mb-1 ${hi ? "text-brand-400" : "text-slate-600"}`}>
                    {String(value)}
                  </div>
                  <div className="text-xs text-slate-600">{label}</div>
                </div>
              ))}
            </div>

            {/* Changed tools */}
            {result.changedTools.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.changedTools.map((t) => (
                  <span key={t} className="text-xs font-mono bg-surface-card border border-surface-border text-slate-300 px-2 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {result.skipReason && (
              <p className="text-xs text-slate-500">{result.skipReason}</p>
            )}

            {/* STEP 4 — what to do next */}
            {result.emailsSent > 0 && (
              <div className="border border-brand-500/20 bg-brand-500/5 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-brand-400 text-xs font-bold">4</span>
                  </div>
                  <div>
                    <p className="text-brand-300 font-semibold text-sm mb-2">
                      Check your inbox → click the link → diff appears automatically
                    </p>
                    <ol className="space-y-1 text-xs text-slate-400">
                      <li>1. Open the SpendWise pricing alert email</li>
                      <li>2. Click <strong className="text-slate-200">"⚡ See what changed in my audit →"</strong></li>
                      <li>3. You land on <code className="font-mono text-slate-300">/results/[id]?reaudit=1</code></li>
                      <li>4. Diff runs <strong className="text-white">automatically</strong> — no button, no extra steps</li>
                      <li>5. Side-by-side view: old vs new recommendations, savings delta headline</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {result.eventId && (
              <p className="text-xs font-mono text-slate-600">Event: {result.eventId}</p>
            )}
          </div>
        )}

        {/* ── ENV var reminder ──────────────────────────────────────────────── */}
        <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4">
          <p className="text-amber-400 text-xs font-semibold mb-1">
            ⚠ Email links point to localhost?
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Set <code className="font-mono text-slate-300">NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app</code>{" "}
            in <strong>Vercel → Settings → Environment Variables</strong> and redeploy.
            Without this, Vercel&apos;s auto-set <code className="font-mono text-slate-500">VERCEL_URL</code>{" "}
            is used as a fallback, but it may point to a preview URL on PRs.
          </p>
        </div>

        {/* Raw JSON */}
        {result && (
          <details className="card p-4">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors select-none">
              Raw JSON response
            </summary>
            <pre className="mt-3 text-xs font-mono text-slate-400 overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}

      </div>
    </main>
  );
}
