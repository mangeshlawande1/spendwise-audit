# Reflection

## 1. The hardest bug you hit this week, and how you debugged it

The hardest bug was a subtle interaction between `nanoid` v5's ESM-only module format and Jest's CommonJS transform pipeline. The audit engine imports `nanoid` to generate the unique audit ID on every run. In the browser and in Next.js API routes, this worked perfectly. But when I ran `npm test`, Jest threw: `SyntaxError: Cannot use import statement in a module` pointing at `node_modules/nanoid/index.js`.

My first hypothesis was that Jest's TypeScript transform wasn't set up correctly — I checked `jest.config.ts` and the `ts-jest` config looked right. My second hypothesis was that `tsconfig.json` had a module mismatch. I checked, and it was set to `NodeNext`, which should be fine. Neither fixed it.

I then searched specifically for "nanoid jest esm" and found that nanoid v5 dropped its CommonJS build entirely — it is ESM-only. Jest runs in CommonJS by default, and even with `ts-jest`, it doesn't transform `node_modules` unless explicitly told to.

My first attempt to fix it: add `"nanoid"` to `transformIgnorePatterns` in jest config as an exception to the default "don't transform node_modules" rule. This still failed because `ts-jest` wasn't picking up the override correctly.

What actually worked: I added `nanoid` to Jest's `moduleNameMapper` with a manual mock that returns a deterministic fake ID in tests (`"nanoid": "<rootDir>/src/__mocks__/nanoid.ts"`). This unblocked all tests immediately. The mock returns `"test-audit-id-001"` — deterministic, which actually made the tests cleaner because I could assert on a known ID. I also added a note in `TESTS.md` explaining why the mock exists.

The total debugging time was about 90 minutes. Most of it was forming and testing wrong hypotheses before finding the ESM-only change in the nanoid v5 release notes.

---

## 2. A decision you reversed mid-week, and what made you reverse it

On Day 1, I decided to build the audit results storage using a simple in-memory Map (`audit-store.ts`). My reasoning: Supabase setup would take 2+ hours, and the core value of the assignment was the audit engine and UI — not the persistence layer. I planned to add Supabase on Day 5 and the in-memory store would be fine for development.

This was the right call for Days 1–3. But on Day 3, when I built the `/r/[id]` shareable URL route, I realised the flaw: the shareable URL is the viral loop feature. It is the thing that makes an audit result something a founder would tweet. If someone shares their audit link and someone else opens it six hours later on a fresh server instance — the in-memory store is gone, the URL 404s, and the viral mechanic is completely broken.

The moment I saw that, I reversed the decision. I moved Supabase integration from a "nice to have on Day 5" to the highest priority work of Day 5. I also updated the `not-found.tsx` copy to say "this link may have expired" as a temporary honest fallback — rather than leaving a cryptic 404 — while the Supabase wiring was still pending.

The lesson: the in-memory store was the right scaffolding decision, but I should have noted on Day 1 that the shareable URL feature would require persistence to be meaningful. I under-thought the dependency between features at planning time.

---

## 3. What you would build in week 2 if you had it

The highest-leverage week-2 feature is **benchmark mode**: "Your AI spend per developer is $X — companies your size typically spend $Y."

Here is why it is the highest-leverage next feature:

Right now, the audit tells users whether they are on the wrong plan or have a cheaper alternative. That is useful. But a user who is on the "right" plan and gets an "optimal — you're spending well" result has no way to know whether they are spending well *relative to their peers*. Benchmark mode turns the optimal result from a dead end ("nothing to do here") into a lead-generation moment: "You're spending $180/developer/month — companies your size average $95. Here's how to get there."

The data to build this is already accumulating in the Supabase `audits` table. Every completed audit has `formData.teamSize` and `totalMonthlySavings` + current total spend (derivable from form data). After 200–300 audits, the database itself becomes the benchmark dataset. No external data purchase required.

The second week-2 feature would be **PDF export** of the full audit — a one-click "send this to my CEO" button. The shareable URL is good for Twitter. A PDF is good for the internal "why are we spending $2k/month on AI tools" conversation. This is where the Credex brand has the highest visibility with decision-makers who control budgets.

Both features have the same property: they make existing users more likely to share, which reduces CAC over time.

---

## 4. How you used AI tools

I used Claude (claude.ai, Sonnet model) as my primary coding assistant throughout the week, and Cursor for editor-level completions in the TypeScript files.

**What I used Claude for:**
- Generating the initial TypeScript type definitions for `AuditFormData`, `ToolAuditResult`, and `AuditResult` — I described the shape I wanted in prose, Claude produced the types, I reviewed and adjusted
- Drafting the initial structure of `audit-engine.ts` — I wrote the first two tool rules (Cursor and Copilot) by hand to establish the pattern, then asked Claude to generate the remaining six following the same pattern
- Debugging the nanoid/Jest ESM issue — I pasted the error message and Claude correctly identified the ESM-only issue within one message
- Writing the Resend email templates in `email.ts` — low-stakes, templated output that I reviewed but didn't need to write character by character

**What I didn't trust Claude with:**
- The audit engine pricing logic itself. Claude would happily generate rules, but the rules needed to be *defensible* — a finance person should read them and agree. I verified every dollar threshold and switching recommendation against my own reading of the vendor pricing pages. Claude's training data on pricing is out of date. I caught one error: Claude suggested that Claude Pro is $18/month (an old price — it is $20/month). I corrected this before it made it into the engine.
- The PROMPTS.md content. AI-describing AI prompts felt circular and untrustworthy. I wrote all prompt rationale from what I actually observed during the 4 iteration rounds.

**The one time AI was specifically wrong:**
When generating the Anthropic API pricing for `PRICING_DATA.md`, Claude gave me Claude 3.5 Sonnet pricing from mid-2024 ($3/$15 per MTok) and labelled it as current. The model has since been superseded by Claude Sonnet 4.6. I caught this because I was cross-referencing the official Anthropic pricing page — the current models and prices had changed. The moral: for any number that needs to be *current and cited*, go to the source. Never trust AI for pricing data.

---

## 5. Self-rating

| Dimension | Score (1–10) | Reason |
|---|---|---|
| Discipline | 8 | Commits on every day of the 7-day window; DEVLOG entries written same-day with real specifics. Lost a point because Day 6 was lighter than planned — the entrepreneurial docs took longer than I budgeted and I ran out of time for the Lighthouse pass. |
| Code quality | 8 | TypeScript strict, sensible abstractions, no obvious bugs in the happy path, audit engine is unit-tested. Lost points for the `/r/[id]` Supabase gap that survived into Day 5 — I knew about it and should have fixed it sooner. |
| Design sense | 7 | The results page communicates the key number clearly and is visually clean. The form is functional but the tool-selection UX could be more polished — adding/removing tools requires understanding the UI rather than being immediately obvious. |
| Problem-solving | 8 | The nanoid/Jest ESM issue and the in-memory store reversal both got resolved cleanly. The AbortController clearTimeout gotcha was caught before it reached production. Generally happy with how I handled ambiguity in the spec. |
| Entrepreneurial thinking | 7 | GTM and economics are genuinely thought through, not template-filled. The user interviews happened. Lost points because I did not do enough to make the "already spending well" result feel valuable — that segment is currently a conversion dead end. |