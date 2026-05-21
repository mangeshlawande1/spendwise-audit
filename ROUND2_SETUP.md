# Round 2 — Setup & Verification Guide

This file walks you through verifying all four required Round 2 features
end-to-end. Follow the steps in order.

---

## Prerequisites

All of these must be set before testing:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
ANTHROPIC_API_KEY=sk-ant-...
CRON_SECRET=test123

# Vercel → Settings → Environment Variables (not in .env.local)
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

> **Most common issue:** forgetting `NEXT_PUBLIC_BASE_URL`.
> Without it, email links point to `localhost:3000` and the re-audit link
> won't work when the email is opened on another device or browser.

---

## Feature 1 — Persistent Audit Storage

**What to verify:** Every audit is saved to Supabase with a pricing snapshot.

```
1. Go to /audit
2. Add Cursor (Pro plan, 3 seats), submit
3. Open Supabase → Table Editor → audits
4. Confirm a new row exists with:
   - id            matching the URL /results/[id]
   - form_data     JSON with your tools
   - pricing_snapshot  JSON with capturedAt + tools array
   - user_email    NULL (not set yet — set in Feature 2 below)
```

**Where the code is:**
- `src/app/api/audit/route.ts` — calls `getCurrentSnapshot()` and `saveAuditToDb()`
- `src/lib/pricing-diff.ts` — `getCurrentSnapshot()` freezes current prices
- `src/lib/supabase.ts` — `saveAuditToDb()` writes the row

---

## Feature 2 — Pricing Change Detection

**What to verify:** Detection finds audits where prices have changed and
identifies the affected users.

```
1. On the /results/[id] page from Feature 1:
   Scroll to "Get your report by email"
   Enter a real email address you can check
   Click "Send my report →"
   Confirm: "Pricing alerts are on ⚡" card appears

2. Open Supabase → audits → your row
   Confirm user_email is now set to your email

3. Go to /admin  (linked in the homepage nav: "Admin / Detect Changes")

4. Set CRON_SECRET = test123
   Set "Simulate price change on" = Cursor
   Click "⚡ Run Pricing Change Detection"

5. Check the execution log:
   ✓ ~500ms · hasChanges=true · emailsSent=1 · affectedAudits=1
```

**What's happening internally:**
```
GET /api/detect-changes?simulate=cursor&secret=test123
  → loads all audits WHERE user_email IS NOT NULL AND parent_audit_id IS NULL
  → patches cursor plan[0].pricePerSeat += 5 in memory (simulate mode)
  → diffSnapshots(stored_snapshot, current_pricing)  → detects the $5 delta
  → findAffectedAudits()  → your audit uses Cursor → affected
  → groups by email → sends 1 email
  → savePricingEvent()  → dedup guard for next 24h
```

**Where the code is:**
- `src/app/api/detect-changes/route.ts` — full detection + email orchestration
- `src/lib/pricing-diff.ts` — `diffSnapshots()`, `findAffectedAudits()`
- `src/lib/supabase.ts` — `getAuditsWithEmail()`, `savePricingEvent()`

---

## Feature 3 — Notification Emails

**What to verify:** An HTML email arrives with pricing changes and a clickable link.

```
1. After running detection (Feature 2 step 4):
   Open your inbox
   Subject: "⚡ Pricing changed on Cursor — re-check your audit"

2. Email should show:
   ┌─────────────────────────────────────────────┐
   │ SpendWise                                   │
   │                                             │
   │ Pricing just changed ⚡                     │
   │ On tools in your saved audit · May 21, 2026 │
   │                                             │
   │ WHAT CHANGED                                │
   │ Cursor · Hobby   $0 → $5/seat  ▲ +$5        │
   │                                             │
   │ YOUR AFFECTED TOOLS                         │
   │ [Cursor]                                    │
   │                                             │
   │ [⚡ See what changed in my audit →]         │
   │   Diff loads automatically — no extra steps │
   └─────────────────────────────────────────────┘

3. Confirm the button link is:
   https://your-app.vercel.app/results/[id]?reaudit=1
   NOT localhost:3000/...
```

> If you see localhost in the link: set `NEXT_PUBLIC_BASE_URL` in
> Vercel → Settings → Environment Variables and redeploy.

**Where the code is:**
- `src/lib/email.ts` — `sendPricingChangeEmail()` — HTML + plaintext, both sent

---

## Feature 4 — Diff View on Re-run

**What to verify:** Clicking the email link shows old vs new recommendations
automatically, with savings delta as the headline.

```
1. Click "⚡ See what changed in my audit →" in the email

2. Browser opens: /results/[id]?reaudit=1

3. You should see immediately (no button click required):
   ┌────────────────────────────────────────────────┐
   │  ⟳ Running updated audit…                     │
   │  Comparing your original recommendations       │
   │  against current pricing.                      │
   └────────────────────────────────────────────────┘

4. After ~1–2 seconds, diff view appears:
   ┌────────────────────────────────────────────────┐
   │  Re-audit complete                             │
   │  Comparing original audit vs. current pricing  │
   │                                                │
   │  $0/mo (original) → $X/mo (updated)  ↑ better │
   │                                                │
   │  CHANGED RECOMMENDATIONS · 1 tool              │
   │  [IMPROVED] Cursor · Hobby                     │
   │    Downgrade plan → Already optimal ✓          │
   │    $5/mo delta                                 │
   │                                                │
   │  ── original audit ──────────────────────────  │
   │  (original audit shown below for reference)   │
   └────────────────────────────────────────────────┘
```

**Where the code is:**
- `src/app/results/[id]/page.tsx` — detects `?reaudit=1`, auto-calls reaudit API
- `src/app/api/audit/[id]/reaudit/route.ts` — re-runs audit, computes diff
- `src/components/audit/DiffView.tsx` — side-by-side UI
- `src/lib/pricing-diff.ts` — `computeReauditDiff()`

---

## Cron / Automation (Bonus)

`vercel.json` schedules the detection endpoint at 09:00 UTC daily:

```json
{
  "crons": [{ "path": "/api/detect-changes", "schedule": "0 9 * * *" }]
}
```

Vercel Cron requires **Vercel Pro**. On the free tier, use the `/admin` button.
The endpoint also accepts `GET` requests so the cron can call it without a body.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `emailsSent: 0`, `affectedAudits: 1` | Check `RESEND_API_KEY` in env vars |
| `affectedAudits: 0` | Your audit doesn't have `user_email` — enter email on results page first |
| `Unauthorized` | `CRON_SECRET` in admin doesn't match your env var |
| Email link → `localhost:3000` | Set `NEXT_PUBLIC_BASE_URL` in Vercel env vars, redeploy |
| `Skipped — already notified` | Delete latest row in Supabase `pricing_events` table, retry |
| Diff doesn't appear | Check browser console for errors on `POST /api/audit/[id]/reaudit` |
| `No audits with email found` | Supabase env vars may be missing — check server logs |

---

## File Map — What Was Added for Round 2

```
src/
├── app/
│   ├── admin/
│   │   └── page.tsx               NEW  Pricing detection control panel
│   ├── api/
│   │   ├── audit/[id]/
│   │   │   └── reaudit/
│   │   │       └── route.ts       NEW  Re-run audit + compute diff
│   │   └── detect-changes/
│   │       └── route.ts           NEW  Find affected audits, send emails
│   └── results/[id]/
│       └── page.tsx               MOD  Auto-trigger diff when ?reaudit=1
├── components/audit/
│   ├── DiffView.tsx               NEW  Side-by-side diff UI
│   ├── DiffToolRow.tsx            NEW  Per-tool diff row (changed/unchanged)
│   ├── SavingsDelta.tsx           NEW  Savings delta hero card
│   └── LeadCaptureForm.tsx        MOD  Explains pricing alerts after submit
├── lib/
│   ├── email.ts                   MOD  Added sendPricingChangeEmail(), HTML emails
│   ├── pricing-diff.ts            NEW  getCurrentSnapshot, diffSnapshots,
│   │                                   findAffectedAudits, computeReauditDiff
│   └── supabase.ts                MOD  getAuditsWithEmail, savePricingEvent,
│                                       saveReauditToDb, getAuditRowFromDb
└── types/index.ts                 MOD  PricingSnapshot, PlanChange, ReauditDiff,
                                        ToolDiffEntry, ReauditResponse, DetectChangesResponse

Root:
├── README.md                      MOD  Full Round 2 architecture + setup
├── ROUND2_SETUP.md                NEW  This file — step-by-step verification
├── ROUND2_PR.md                   NEW  PR description (what/why/how/cut/risks)
├── ROUND2_DEVLOG.md               NEW  36-hour timestamped build log
├── ROUND2_REFLECTION.md           NEW  Post-build reflection (3 questions)
└── vercel.json                    NEW  Daily cron schedule
```
