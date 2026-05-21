# Round 2 Dev Log — Re-audit on Pricing Change

Deadline: May 21, 10:00 PM IST · 36-hour window

---

## Day 1

**[10:15 AM] Read the brief, re-read Round 2 spec**
Four mandatory features are clear. Biggest risk: DB schema — everything else hangs on it. Starting there.

**[10:40 AM] Re-read my own Round 1 codebase**
Good news: `runAudit()` is pure and stateless, so re-audit is literally "call same function with same inputs." Supabase client already exists. Email (Resend) already wired. This is mostly glue work, not greenfield. Confidence up.

**[11:00 AM] Schema design**
Debated a separate `pricing_versions` table vs JSONB column on `audits`. JSONB wins: self-contained, no join needed in detect-changes, easy to inspect in Supabase dashboard. Added `user_email`, `pricing_snapshot`, `parent_audit_id` to `audits`. New `pricing_events` table for dedup.

**[11:30 AM] Wrote `supabase/schema.sql` migration**
Wrote both the fresh CREATE TABLE version and the ALTER TABLE migration for existing Round 1 deployments. Tested migration in Supabase SQL editor — ran clean.

**[12:00 PM] Wrote `src/lib/pricing-diff.ts`**
`getCurrentSnapshot()`, `diffSnapshots()`, `findAffectedAudits()`, `computeReauditDiff()`. Kept it pure — no DB calls, no side effects. Every function takes data and returns data. Makes testing trivial.

**[12:45 PM] Wrote tests first (`round2-reaudit.test.ts`)**
Test-first for the diff logic because it's the core algorithm. Wrote 34 test cases covering price increase, decrease, plan added/removed, multi-tool, dedup, edge cases. All green first run. Felt good.

**[1:30 PM] Lunch + break**

**[2:30 PM] Updated `supabase.ts`**
Extended `saveAuditToDb()` with `user_email` + `pricing_snapshot` params. Added `saveReauditToDb()`, `getAuditsWithEmail()`, `getRecentPricingEvent()`, `savePricingEvent()`. Also added backfill in `saveLeadToDb()` — when a user opts in with their email, it updates the `user_email` column on their audit row. This was the key insight: don't require email at audit time, backfill when they submit the lead form.

**[3:15 PM] Updated `/api/audit/route.ts`**
Two-line change: call `getCurrentSnapshot()`, pass it to `saveAuditToDb()`. Existing behavior unchanged.

**[4:00 PM] Built `POST /api/detect-changes`**
First draft had a TypeScript error — spreading `Set<string>` doesn't work without `downlevelIteration`. Switched all spreads to `Array.from()`. Clean.

The simulate param (`?simulate=cursor`) was an idea from the architecture doc that turned out to be essential — without it I can't demo the feature without actually changing pricing-data.ts, which I don't want to commit.

**[5:00 PM] Updated `email.ts` — `sendPricingChangeEmail()`**
Copied pattern from `sendAuditConfirmation()`. Plain text. One email per user, lists all changed tools and dollar deltas. Re-audit link at the bottom.

**[5:45 PM] Built `POST /api/audit/[id]/reaudit`**
Fetch original → `runAudit(original.formData)` → `computeReauditDiff()` → save with `parent_audit_id` → return `{ original, fresh, diff }`. Clean and short (~50 lines).

**[6:30 PM] Built frontend components**
`ReauditBanner`, `DiffView`, `DiffToolRow`, `SavingsDelta`. Took longer than expected — the `DiffToolRow` needed two variants (changed/unchanged) and the collapsed state logic was fiddly. But the result looks clean.

**[7:30 PM] Wired results page**
Added `?reaudit=1` detection, `ReauditBanner` render, `DiffView` render on diff ready. Confirmed it works end-to-end in local dev.

**[8:00 PM] `npx tsc --noEmit` → 5 errors**
All `Set<string>` spread errors. Fixed in detect-changes route and pricing-diff. Zero errors after.

**[8:15 PM] Full test run: 57/57 passing**

**[8:30 PM] Dinner**

---

## Day 2

**[9:00 AM] Wrote `ROUND2_PR.md`**
Spent more time here than expected — the "What I cut" section required honest reflection, not just listing things I skipped.

**[10:00 AM] Wrote `ROUND2_REFLECTION.md`**

**[10:30 AM] Final end-to-end test in local dev**
1. Submitted audit → checked Supabase row has pricing_snapshot ✓
2. Submitted lead form → user_email backfilled on audit row ✓
3. Curl to detect-changes with ?simulate=cursor → 200, emailsSent: 1 ✓
4. Checked Resend dashboard → email delivered ✓
5. Clicked re-audit link → ReauditBanner rendered ✓
6. Clicked Re-run → DiffView rendered with diff ✓
7. Checked Supabase → new audit row with parent_audit_id set ✓
8. Second curl to detect-changes (no simulate) → skipped: true ✓

**[11:00 AM] Updated .env.example with `CRON_SECRET`**

**[11:15 AM] Generated ZIP for submission**

---

## Blockers / wrong turns

- **Set spread TS error** — 20 minutes lost. Switched to `Array.from()` everywhere.
- **user_email timing** — originally tried to capture email at audit form submit time, which would require a frontend change. Realized I could backfill from the leads table when the user opts in — no frontend change needed at all.
- **DiffToolRow collapsed state** — spent 30 mins getting the collapse animation right before cutting it to a simple show/hide toggle to stay on schedule.
