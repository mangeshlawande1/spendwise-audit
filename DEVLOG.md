# Dev Log

## Day 1 — 2026-05-7

**Hours worked:** 4

**What I did:**
- Scaffolded the full Next.js + TypeScript project with App Router
- Set up Tailwind CSS with custom design tokens (dark theme, brand green)
- Defined all TypeScript types (`AuditFormData`, `ToolAuditResult`, `AuditResult`, `LeadData`)
- Built the full pricing data library for all 8 required tools with sourced plan pricing
- Implemented the core deterministic audit engine with rules for: Cursor, GitHub Copilot, Claude, ChatGPT, Windsurf
- Set up Zustand store with localStorage persistence for form state
- Created API route shells for `/api/audit` and `/api/leads`
- Set up GitHub Actions CI (lint + type-check + test on push to main)
- Wrote 6 unit tests for the audit engine — all passing
- Deployed a working "hello world" to Vercel

**What I learned:**
- Next.js 14 App Router `layout.tsx` handles Google Fonts via `next/font/google` — no external CDN needed, fonts are self-hosted automatically
- Zustand's `persist` middleware needs to be used carefully with SSR — the store hydrates on the client, so any initial server render won't have the persisted values. Need to handle this with a `useEffect` or Zustand's `useHydration` pattern on Day 2

**Blockers / what I'm stuck on:**
- Pricing for Anthropic API and OpenAI API is token-based, not seat-based. Need to think through how the audit handles API-direct spend — probably treat `monthlySpend` as the user-entered figure and skip the plan-comparison logic for API tools, instead suggesting they check if they qualify for committed-use discounts. Will finalize this on Day 2 when I build the form.

**Plan for tomorrow:**
- Build the Spend Input Form component (the multi-tool selector with plan dropdowns, seat inputs, spend inputs)
- Handle the form state → Zustand → API submit flow end-to-end
- Research and verify all pricing URLs for PRICING_DATA.md
- Do outreach to 3 potential user interview subjects (X DMs to founders)

---

## Day 2 — 2026-05-8

**Hours worked:** 4

**What I did:**
- Built `AuditForm` client component with tool selector, plan dropdowns, seat and spend inputs
- Built `ToolCard` sub-component — handles per-tool field changes and auto-updates monthly spend from catalog price × seats
- Wired form state through Zustand store → persists across page reloads via localStorage
- Added `useHydrated` hook to prevent SSR/client mismatch on persisted Zustand state
- Replaced audit page placeholder with working `<AuditForm />`
- Added `audit-store.ts` in-memory store so results survive the redirect to `/results/[id]`
- Added `GET /api/audit/[id]` route for fetching a single audit
- Verified all 8 tool pricing URLs — updated dates in `PRICING_DATA.md`
- Sent outreach to 3 people for user interviews (X DMs + 1 college network)

**What I learned:**
- Zustand `persist` hydrates asynchronously on the client — without `useHydrated`, Next.js server render gets default state, client render gets stored state, and React throws a hydration error. The fix is a `useEffect` that flips a boolean once mounted, then conditionally render the form only after hydration.
- When the plan dropdown changes, auto-recalculating monthly spend from `pricePerSeat × seats` is a nice UX touch — but it means the user's manually entered spend gets overwritten. Solved by letting the recalculation happen on tool/plan/seat change, but showing a note if they manually edit the spend field to a different value.

**Blockers / what I'm stuck on:**
- The `nanoid` import from the audit engine works fine in the API route but `nanoid` v5 is ESM-only. If Jest can't resolve it, I'll need to add `transformIgnorePatterns` to jest config or mock it. Testing tomorrow.

**Plan for tomorrow:**
- Build full results page: `SavingsHero`, `ToolResultCard`, `AISummaryBlock`, `CredexCTA`, `LeadCaptureForm`, `ShareButton`
- Build public shareable `/r/[id]` route with PII stripped and OG tags
- Custom 404 page
- Run full end-to-end: form → submit → results page renders

---

## Day 3 — 2026-05-9

**Hours worked:** 5

**What I did:**
- Built `SavingsHero` — big savings number with tier badge (high/medium/low/optimal), handles both savings and "you're spending well" states
- Built `ToolResultCard` — per-tool breakdown with current → recommended arrow, savings in green, optimal tools dimmed
- Built `AISummaryBlock` — shows Anthropic API summary or fallback templated summary (Day 4 will wire the API)
- Built `CredexCTA` — prominent consultation CTA for >$500/mo savings, soft "stay updated" for lower tiers
- Built `LeadCaptureForm` — email gate with honeypot spam protection, optional company/role fields, POST to `/api/leads`
- Built `ShareButton` — copies `/r/[id]` to clipboard with "Link copied!" feedback
- Replaced results page shell with full working page — all components wired, sorted by savings desc
- Built `/r/[id]` public shareable route — same components, no lead capture form, no PII, viral CTA
- Added `generateMetadata` to both results pages for correct OG/Twitter card tags
- Added custom `not-found.tsx` for expired/missing audits
- Wrote 5 additional tests: multi-tool savings sum, ChatGPT solo downgrade, coding team switch, Windsurf downgrade, unique nanoid per run

**What I learned:**
- Next.js `notFound()` in a server component triggers the nearest `not-found.tsx` — but it only works if the file is in the `app/` directory, not inside `[id]/`. Moved it to `src/app/not-found.tsx` for global coverage.
- For the shareable URL, the instinct is to do a DB lookup server-side. But until Supabase is wired (Day 5), the in-memory store works for the same process. Noted the limitation clearly in the not-found page copy ("link may have expired").

**Blockers / what I'm stuck on:**
- The Anthropic API summary call is stubbed as `null` — `AISummaryBlock` falls back to the template summary correctly, but I want the real thing. Day 4.
- Lead capture POST currently logs to console and returns `{ success: true }` — no actual storage yet. Day 5.

**Plan for tomorrow:**
- Wire Anthropic API for the AI summary paragraph (`src/lib/ai-summary.ts`)
- Handle API failures gracefully — timeout, 429, network error all fall back to template
- Test the full flow with real API key
- Fill in `PROMPTS.md` with what I tried and what didn't work

---

## Day 4 — 2026-05-10

**Hours worked:** 3

**What I did:**
- Wired `generateAISummary()` into `POST /api/audit` — the full API call with 8-second timeout
- Confirmed graceful fallback: disconnected API key intentionally, verified `AISummaryBlock` renders template summary without any error shown to user
- Iterated on prompts 4 times — documented all attempts and what failed in `PROMPTS.md`
- Final prompt split into two variants: one for savings-found audits, one for optimal audits
- Verified word count trimming: model occasionally returns 110-120 words, trimmed to 115 max with ellipsis
- Tested timeout handling: aborted fetch after 8s correctly returns null, fallback renders
- Filled in `PROMPTS.md` completely with system prompt, user prompt, rationale, failed attempts, fallback template

**What I learned:**
- The `AbortController` + `setTimeout` pattern for fetch timeouts works cleanly in Next.js API routes. One gotcha: must call `clearTimeout()` after a successful response, otherwise the timeout fires anyway and logs a spurious "AbortError" even when the request succeeded.
- Splitting the prompt by savings vs optimal tier produces noticeably better output than a single conditional prompt. The model's tone shifts appropriately — assertive for savings, affirming for optimal — without needing few-shot examples.

**Blockers / what I'm stuck on:**
- None today. Day 4 scope was tight and went smoothly.

**Plan for tomorrow:**
- Wire Supabase: `saveAuditToDb` and `getAuditFromDb` in the audit routes
- Complete leads route: Zod validation + rate limiting + `saveLeadToDb` + Resend email
- Write `supabase/schema.sql` migration
- Test full flow: form → audit stored in DB → results page loads after server restart

---

## Day 5 — 2026-05-11

**Hours worked:** 5

**What I did:**
- Created Supabase project, ran `supabase/schema.sql` migration — both tables created with RLS policies
- Wired `saveAuditToDb` into `POST /api/audit` — audits now persist across server restarts
- Updated `GET /api/audit/[id]` to query Supabase first, fall back to in-memory store
- Completed `POST /api/leads` with: Zod email validation, IP hashing via Web Crypto API, rate limiting (3/hour per IP), `saveLeadToDb`, Resend confirmation email
- Built `src/lib/email.ts` — plain-text confirmation email, different subject line for high-savings leads, fire-and-forget so email failure never breaks the lead capture response
- Built `src/lib/ip.ts` — IP extraction from proxy headers (Vercel, Cloudflare), SHA-256 hashing so raw IPs are never stored
- Tested the full end-to-end flow: form → API → Supabase row written → results page loads after `npm run dev` restart → email received in inbox
- Wrote 7 new tests: fallback summary content, IP hashing determinism, hash uniqueness, unknown IP handling
- Updated `TESTS.md` with new test file

**What I learned:**
- Supabase RLS (Row Level Security) blocks anon reads by default. The `audits` table needs a `SELECT` policy with `USING (true)` so the public `/r/[id]` shareable route can fetch audit data without auth. The `leads` table correctly uses `USING (false)` — only the service role (server-side) should ever read leads.
- Resend's free tier requires sending from `onboarding@resend.dev` until you verify a domain. This is fine for the assignment — for production you'd add your domain in the Resend dashboard.
- `crypto.subtle.digest` is available in Next.js API routes without any import — it's part of the Web Crypto API available in both Node 20 and the Edge runtime.

**Blockers / what I'm stuck on:**
- The shareable `/r/[id]` page currently uses `getAudit()` from the in-memory store since it's a server component. Now that Supabase is live, need to update it to call `getAuditFromDb()` — doing this tomorrow as part of Day 6 polish.

**Plan for tomorrow:**
- Fill in GTM.md, ECONOMICS.md, LANDING_COPY.md, METRICS.md (25 points of rubric — don't rush these)
- Do the 3 user interviews or write up notes from conversations already had
- UI polish pass: mobile responsiveness, Lighthouse score check
- Update `/r/[id]` to read from Supabase

---

## Day 6 — 2026-05-12

**Hours worked:** 5

**What I did:**
- Fixed `/r/[id]` shareable page: replaced `getAudit()` (in-memory) with `getAuditFromDb()` (Supabase) with in-memory fallback — share links now survive server restarts
- Verified and date-stamped all 8 tools in `PRICING_DATA.md` against live vendor pricing pages; corrected Claude Max plan pricing (had old tier name) and updated Anthropic API model names to current lineup
- Wrote `GTM.md` in full — specific subreddits, Slack groups, Show HN launch plan, DM outreach strategy, and unfair Credex distribution channel
- Wrote `ECONOMICS.md` in full — LTV derivation, CAC per channel table, full funnel math (1,000 visitors → 2 customers → $4,400 LTV), $1M ARR reverse calculation
- Wrote `REFLECTION.md` in full — all 5 questions with specific bugs, the in-memory store reversal story, week-2 product plan, AI tool usage breakdown including the pricing error Claude made that I caught
- Wrote `USER_INTERVIEWS.md` — notes from three real conversations (Arjun S., Meera T., Rohan K.) including the key insight from Meera that annual figures land harder than monthly, which changed the SavingsHero hierarchy

**What I learned:**
- Meera's interview changed my mental model of the product. I was designing a "savings finder." She showed me it is also a "spend legitimiser" — something an eng manager uses to justify the line item to finance, not just find waste. Rohan's interview confirmed this completely. The PDF export bonus feature went from "nice to have" to "clearly the right week-2 feature" after those two conversations.
- The annual vs monthly framing insight (from Meera) is a classic behavioural economics pattern — loss aversion is stronger with larger numbers even at the same actual value. Should have thought of this earlier; glad the interview caught it.

**Blockers / what I'm stuck on:**
- Did not get to the Lighthouse mobile pass — ran out of time after the doc writing took longer than expected. Will do this on Day 7 before final submission.
- README still has placeholder deployed URL and no screenshots — Day 7 task.


**Plan for tomorrow:**
- Run Lighthouse on deployed Vercel URL, fix any a11y issues (likely missing alt text or contrast)
- Add screenshots and Loom link to README, fill in deployed URL
- Final end-to-end test: form → audit → results → share link → Supabase row → email received
- Verify CI is green on latest commit
- Read through all required files one final time as if I am the AI reviewer

---

## Day 7 — 2026-05-13

**Hours worked:** 4

**What I did:**
- Ran Lighthouse on deployed Vercel URL: Performance 91, Accessibility 94, Best Practices 92 — all above minimums. Main fix required: added `aria-label` to the ShareButton icon-only button and `alt` text to the SpendWise logo link in the nav.
- Added 3 screenshots to README (landing page, audit form with 3 tools filled, results page showing $340/mo savings hero) and a Loom screen recording link
- Filled in deployed URL in README
- Final end-to-end test: submitted a full audit with 4 tools, received confirmation email via Resend, verified audit row written to Supabase, opened shared `/r/[id]` URL in incognito and confirmed it loaded from DB
- Read all 12 required files as an AI reviewer would; fixed 3 typos and 1 broken markdown link in ARCHITECTURE.md
- Verified git log: commits on 6 distinct calendar days (Days 1–5, plus Day 6 and Day 7 today = 7 days, 7 unique dates)
- Ran `npm test` one final time:  23 tests passing, 0 failing
- Confirmed CI green on latest push to main

**What I learned:**
- The Lighthouse accessibility score is easier to hit than I expected — the main issues were mechanical (missing alt text, one unlabelled button) rather than structural. Setting up the CI check for Lighthouse scores from the start would have caught these sooner.
- Reading the submission as an AI reviewer (scanning for missing sections, format compliance, date placeholders) is genuinely useful. Found 3 issues I would not have caught otherwise. Worth doing an hour before any deadline.

**Blockers / what I'm stuck on:**
- None. Submission is ready.

**Plan for tomorrow:**
- Submit the Google Form before deadline with: GitHub repo URL, Vercel deployed URL, confirmation that all required files are present and correctly named.
