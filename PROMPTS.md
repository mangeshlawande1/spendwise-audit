# Prompts

## AI Summary Generation

**File:** `src/lib/ai-summary.ts`
**Model:** `claude-sonnet-4-20250514`
**Max tokens:** 200
**Timeout:** 8 seconds

---

### System Prompt

```
You are a financial advisor specializing in SaaS spend optimization for startups.
You write concise, direct summaries — no fluff, no filler phrases like "great news" or "exciting opportunity."
Always use specific dollar amounts. Always be honest: if a team is spending well, say so plainly.
Never invent numbers that weren't given to you. Never use markdown formatting.
```

### User Prompt — Savings found

```
Write an 80-100 word summary for a startup AI spend audit with these results:

Team: {{teamSize}} people, primary use case: {{useCase}}
Tools audited: {{toolList}}
Total monthly savings identified: {{totalMonthlySavings}}/mo ({{totalAnnualSavings}}/yr)
Top recommendation: {{topToolName}} — {{topReasoning}}

Per-tool findings:
{{perToolFindings}}

Rules:
- Lead with the single biggest saving (tool name + exact dollar amount)
- Work through the other findings briefly
- End with one concrete next step the reader can take today
- No sign-off, no pleasantries, no "In conclusion", no markdown
```

### User Prompt — Optimal (no savings)

```
Write an 80-100 word summary for a startup AI spend audit with these results:

Team: {{teamSize}} people, primary use case: {{useCase}}
Tools audited: {{toolList}}
Result: No savings identified — all tools are on optimal plans for this team's size and use case.

Per-tool findings:
{{perToolFindings}}

Rules:
- Open by affirming the team is spending well — be specific about which tools and why
- Mention the team size and use case
- End with one forward-looking tip (e.g. revisit as team grows)
- No sign-off, no pleasantries, no "In conclusion", no markdown
```

---

### Why These Prompts

**Two separate prompts for savings vs optimal:** A single prompt produced awkward hedging when savings were zero. Splitting into two with different instructions produces cleaner, more confident output in both cases.

**Specific dollar amounts required:** Without this constraint the model wrote "significant savings" instead of "$120/month." The audit engine already computed exact numbers — the prompt must reflect them.

**"No markdown" constraint:** The summary renders as plain text in a UI card. Without this, the model bolded tool names and used bullets which appear as literal asterisks in the rendered paragraph.

**"Never invent numbers":** The model occasionally tried to extrapolate — computing ROI percentages not in the prompt. This constraint stops that.

**8-second timeout:** Anthropic typically responds in 1–3s but occasional slow responses would break the UX. 8s is generous for reliability while keeping the audit response acceptable.

---

### What Didn't Work

**Attempt 1 — no system prompt:** Model opened with "Great news! I've analyzed your AI spend..." — generic and condescending. System prompt with explicit tone guidance fixed this.

**Attempt 2 — bullet list format:** Structured output looked wrong inside the card UI paragraph element. Switched to flowing prose.

**Attempt 3 — all tool details in one block:** For 8-tool audits the input got bloated. Trimmed per-tool entries to just: name, plan, savings, one-line reason.

**Attempt 4 — "exactly 100 words":** Model stopped mid-sentence to hit the count. Switched to "80-100 words" range.

---

### Fallback Template

Used when API fails for any reason — timeout, 429, missing key, network error.
Implemented in `buildFallbackSummary()` in `src/lib/ai-summary.ts`.

Constructs a deterministic paragraph from audit data: team size → total savings → top saving with reasoning → secondary savings → call to action. Intentionally mechanical — reads like a report not a narrative, but always contains correct numbers and never shows an error state.
