# Metrics

_200–500 words. Fill in by Day 6._

## North Star Metric

**Qualified leads per week** — the number of users who complete an audit AND submit their email.

_Why_: This is a B2B lead-gen tool used occasionally (not daily). DAU is meaningless. "Audits started" overstates engagement. "Emails captured" is the moment a cold visitor becomes a Credex prospect — the only metric that maps directly to revenue.

---

## 3 Input Metrics

1. **Audit completion rate** (started → submitted)
   - If this is low, the form is too long or confusing
   - Target: >60%

2. **Email capture rate** (audit shown → email submitted)
   - Measures whether the results page delivers enough perceived value
   - Target: >25% (industry benchmark for B2B tools with email gate after value)

3. **High-savings audit rate** (audits showing >$500/mo savings)
   - Determines how often we surface the Credex CTA prominently
   - Want this to be high → means targeting the right users

---

## What We'd Instrument First

1. `audit_started` — page load on `/audit`
2. `audit_submitted` — POST to `/api/audit` with tool count
3. `audit_results_viewed` — results page loaded with `auditId`
4. `email_captured` — POST to `/api/leads`
5. `credex_cta_clicked` — click on the "Book a consultation" button

All events should include: `auditId`, `savingsTier`, `toolCount`, `totalMonthlySavings` (bucketed).

---

## Pivot Trigger

If **audit completion rate < 30% after 200 sessions**: the form is the problem. Either too many fields (cut to 3 required), or the value proposition isn't clear before they start. Run a 5-second test on the landing page.

If **email capture rate < 10% after 100 completed audits**: the results page isn't delivering enough perceived value. Either the savings numbers are too low (wrong audience) or the design doesn't communicate them clearly enough.

---

## Instrumentation Plan

**Tool choice:** [Vercel Analytics](https://vercel.com/analytics) for page-level traffic (zero config, already enabled via `@vercel/analytics`) + [PostHog](https://posthog.com) free tier for custom events. PostHog free tier allows 1M events/month — more than enough for early traction. It also gives session recordings, which are invaluable for diagnosing why users drop off mid-form.

**First 5 events to instrument (in order of priority):**

```typescript
// 1. Audit started — user lands on /audit
posthog.capture('audit_started')

// 2. Audit submitted — POST to /api/audit succeeds
posthog.capture('audit_submitted', {
  tool_count: formData.tools.length,
  team_size: formData.teamSize,
  use_case: formData.useCase,
})

// 3. Results viewed — results page loads with real audit data
posthog.capture('audit_results_viewed', {
  audit_id: result.id,
  savings_tier: result.savingsTier,
  total_monthly_savings_bucket: bucket(result.totalMonthlySavings),
  // bucket: '0', '1-100', '100-500', '500+'
})

// 4. Email captured — POST to /api/leads succeeds
posthog.capture('email_captured', {
  audit_id: lead.auditId,
  savings_tier: auditResult.savingsTier,
})

// 5. Credex CTA clicked — "Book a consultation" button
posthog.capture('credex_cta_clicked', {
  audit_id: result.id,
  total_monthly_savings: result.totalMonthlySavings,
})
```

**Dashboard to build first:** A single funnel view in PostHog: `audit_started → audit_submitted → audit_results_viewed → email_captured → credex_cta_clicked`. The drop-off between each step is the product's most important number at this stage.

**Privacy note:** Never send email addresses, company names, or any PII to PostHog. `audit_id` is a random nanoid — not linkable to a person without the Supabase row. All monetary values are bucketed, not exact.
