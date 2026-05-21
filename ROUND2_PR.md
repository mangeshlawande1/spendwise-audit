# feat: add re-audit on pricing change with email notifications

## What this PR does

Extends SpendWise with a live pricing-change system. Every audit is now
persisted to Supabase with a pricing snapshot. When the user enters their
email on the results page, it is linked to that audit. A detection job
(manual via `/admin` or scheduled daily cron) compares stored snapshots
against current pricing, sends one HTML email per affected user, and when
the user clicks the link the diff view renders automatically — zero extra
clicks required.

## Why

A stale audit is worse than no audit. Cursor raised prices in 2024, Claude
added tiers in 2025. A user who ran an audit 3 months ago is making spend
decisions on wrong data. This makes audits live: users are told when their
recommendations are outdated and can see exactly what changed in one click.

## How it works

```
[/audit]  POST /api/audit
          → runAudit(formData)
          → getCurrentSnapshot()          ← capture prices at audit time
          → saveAuditToDb(result, snapshot)  ← persist to Supabase

[/results/[id]]  user fills lead capture form
          → POST /api/leads
          → saveLeadToDb()
          → UPDATE audits SET user_email = ? WHERE id = ?  ← backfill email

[/admin]  GET /api/detect-changes?simulate=cursor&secret=…
          → getAuditsWithEmail()          ← only original audits with email
          → patch stored snapshot +$5 (simulate mode)
          → findAffectedAudits()          ← diffSnapshots() per audit
          → group by email                ← 1 email per user, never per audit
          → sendPricingChangeEmail()      ← HTML + text, link = /results/[id]?reaudit=1
          → savePricingEvent()            ← 24h dedup guard

[/results/[id]?reaudit=1]
          → useEffect detects ?reaudit=1
          → auto-calls POST /api/audit/[id]/reaudit
          → runAudit(original.formData) with current prices
          → computeReauditDiff(original, fresh)
          → <DiffView> renders side-by-side, savings delta headline
```

## What I cut

- **Vercel Cron on free tier** — `vercel.json` schedules `/api/detect-changes`
  at 09:00 UTC daily, but Vercel Cron requires Pro. On free tier the `/admin`
  button is the trigger. This is clearly documented in the UI.

- **HTML unsubscribe handler** — email says reply "unsubscribe"; there's no
  inbound webhook. The 24h dedup guard limits spam. A real solution needs a
  boolean column on `audits` and a Resend inbound hook. Skipped for time.

- **Admin authentication** — `/admin` has no login gate; security is entirely
  on `CRON_SECRET` for the detect-changes endpoint. Needs HTTP basic auth in
  production. Acceptable for a reviewer-facing demo.

- **Public pricing change feed** (bonus feature) — cut to focus on getting
  the core diff flow 100% solid.

- **Diff for cross-tool findings** — `DiffView` diffs per-tool savings but
  does not diff `crossToolFindings`. Would require a second diff algorithm.
  Skipped; the per-tool diff covers the primary use case.

## How to test manually

Prerequisites: `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
Set `NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app` in Vercel env vars.

```
1. /audit
   Add Cursor (or whichever tool you'll simulate), submit.

2. /results/[id]
   Scroll to "Get your report by email", enter a real email, submit.
   Confirm card shows "Pricing alerts are on ⚡".

3. /admin  (linked in the homepage nav and footer)
   Set CRON_SECRET = your value
   Simulate = Cursor
   Click "⚡ Run Pricing Change Detection"
   Log shows: emailsSent: 1

4. Open inbox
   Email: "⚡ Pricing changed on Cursor — re-check your audit"
   Click "⚡ See what changed in my audit →"

5. Browser opens /results/[id]?reaudit=1
   Spinner: "Running updated audit…"  (auto-triggered, no button)
   DiffView appears: old vs new side-by-side, savings delta as headline
```

## What's tested

- `pricing-diff.test.ts` — diffSnapshots, findAffectedAudits, computeReauditDiff
- `audit-engine.test.ts` — core recommendation logic
- `round2-reaudit.test.ts` — reaudit API unit tests

Not covered: full integration test (detect → email → click → diff) due to
time. Would use a Supabase test project + Resend sandbox.

## Open questions / risks

- **VERCEL_URL vs NEXT_PUBLIC_BASE_URL**: `VERCEL_URL` is auto-set by Vercel
  but may point to a preview deployment on PRs. Set `NEXT_PUBLIC_BASE_URL`
  explicitly in Vercel production env to guarantee correct email links.
- **Simulate dedup**: simulate mode bypasses the 24h dedup. Real pricing
  changes respect it. If testing fails with "already notified", delete the
  latest row in Supabase `pricing_events` table.
- **Snapshot patch is in-memory only**: simulate mode never writes to the DB,
  so re-running is always safe. The stored snapshot is never mutated.
