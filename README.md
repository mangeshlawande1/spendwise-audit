# SpendWise — AI Spend Audit

SpendWise audits AI tool subscriptions (Cursor, Claude, ChatGPT, Copilot, etc.)
and surfaces savings opportunities in under 30 seconds — then **alerts users
automatically when pricing changes**, so recommendations never go stale.

Free. No login required. Built for [Credex](https://credex.rocks).

---

## Pages

| Route | What it does |
|---|---|
| `/` | Landing page — hero, CTA, link to admin |
| `/audit` | Audit form — tool selector, plan dropdowns, seat inputs |
| `/results/[id]` | Results — savings hero, per-tool breakdown, lead form |
| `/results/[id]?reaudit=1` | **Round 2** — auto-runs diff on load, shows old vs new side-by-side |
| `/r/[id]` | Public share view — PII-stripped, OG tags |
| `/admin` | **Round 2** — pricing change detection control panel |

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/spendwise
cd spendwise
npm install
cp .env.example .env.local   # fill in keys (see below)
npm run dev
# → http://localhost:3000
```

### Environment Variables

| Variable | Required | What it's for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key (client-side reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role (server writes) |
| `RESEND_API_KEY` | ✅ | Resend API key — for all transactional emails |
| `GEMINI_API_KEY` | ✅ | Gemini API — for AI audit summaries |
| `CRON_SECRET` | ✅ | Secret that protects `/api/detect-changes` |
| `NEXT_PUBLIC_BASE_URL` | ✅ | **Your production URL** e.g. `https://your-app.vercel.app` — without this, email links point to localhost |

> Set `NEXT_PUBLIC_BASE_URL` in **Vercel → Settings → Environment Variables**
> and redeploy. This is the most common setup mistake.

### Database Setup (Supabase)

Run this SQL in your Supabase project (**SQL Editor → New query**):

```sql
-- Audits table (Round 1 + Round 2 columns)
create table audits (
  id                   text primary key,
  created_at           timestamptz default now(),
  form_data            jsonb not null,
  tool_results         jsonb not null,
  cross_tool_findings  jsonb default '[]',
  efficiency_score     int default 80,
  total_monthly_savings numeric(10,2) default 0,
  total_annual_savings  numeric(10,2) default 0,
  savings_tier         text,
  ai_summary           text,
  user_email           text,           -- backfilled when user submits lead form
  pricing_snapshot     jsonb,          -- Round 2: pricing at time of audit
  parent_audit_id      text            -- Round 2: links re-audit to original
);

-- Leads table
create table leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  audit_id     text references audits(id),
  email        text not null,
  company_name text,
  role         text,
  team_size    int,
  ip_hash      text
);

-- Pricing events table (Round 2: dedup guard for detect-changes)
create table pricing_events (
  id             uuid primary key default gen_random_uuid(),
  detected_at    timestamptz default now(),
  snapshot_before jsonb,
  snapshot_after  jsonb,
  changed_tools   text[],
  affected_emails text[],
  emails_sent     int default 0
);
```

### Deploy

```bash
npx vercel --prod
```

Any platform supporting Node.js 20+ works. For Vercel, the `vercel.json`
cron schedule runs pricing detection automatically at 09:00 UTC daily
(requires Vercel Pro — use the `/admin` button on the free tier).

### Run Tests

```bash
npm test            # all tests
npm run test:watch  # watch mode
npm run type-check  # TypeScript only
```

---

## Architecture

```
User submits audit
  POST /api/audit
    → runAudit(formData)          deterministic rules engine
    → generateAISummary()         Claude API (non-blocking, falls back to template)
    → getCurrentSnapshot()        freeze prices at audit time
    → saveAuditToDb()             Supabase: audits table

User enters email on results page
  POST /api/leads
    → saveLeadToDb()              Supabase: leads table
    → UPDATE audits SET user_email = ?
    → sendAuditConfirmation()     Resend: HTML email with audit summary

Pricing change detected  (admin button or daily cron)
  GET /api/detect-changes?simulate=cursor&secret=…
    → getAuditsWithEmail()        only original audits, never re-audits
    → diffSnapshots()             old stored snapshot vs current pricing
    → findAffectedAudits()        filter to audits that use changed tools
    → group by email              one email per user, never per audit
    → sendPricingChangeEmail()    Resend: HTML email with diff link
    → savePricingEvent()          dedup guard: skip if notified in last 24h

User clicks email link  →  /results/[id]?reaudit=1
  useEffect detects ?reaudit=1
    → POST /api/audit/[id]/reaudit   auto-triggered, no button needed
        → runAudit(original.formData) with current prices
        → computeReauditDiff()
        → saveReauditToDb()
    → <DiffView> renders side-by-side, savings delta headline
```

---

## Round 2 Feature: Re-audit on Pricing Change

See [`ROUND2_PR.md`](./ROUND2_PR.md) for the full PR description.
See [`ROUND2_SETUP.md`](./ROUND2_SETUP.md) for step-by-step verification.
See [`ROUND2_DEVLOG.md`](./ROUND2_DEVLOG.md) for the 36-hour build log.
See [`ROUND2_REFLECTION.md`](./ROUND2_REFLECTION.md) for post-build reflection.

---

## Key Engineering Decisions

**Deterministic audit engine, not AI** — Rules are auditable and explainable
to a finance person. AI is used only for the summary paragraph.

**Supabase over custom Postgres** — Free-tier Postgres + REST API + row-level
security in under 10 minutes. The right tradeoff for a time-constrained build.

**Resend over SES** — SES requires domain verification and production approval.
Resend's free tier works immediately with a dev key.

**In-memory fallback for Supabase** — If Supabase is down or misconfigured,
audits fall back to an in-memory store so users always get results. Detection
and emails won't work, but the core audit flow does.

**Simulate mode in detect-changes** — `?simulate=cursor` patches stored
snapshots in-memory (+$5/seat) to trigger the email flow without editing any
pricing files. Safe: the DB is never mutated.

---

## Live URL

**https://creadex-web-app-git-main-mangeshlawandes-projects.vercel.app/**
