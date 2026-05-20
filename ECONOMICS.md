# Economics

## What a Converted Lead Is Worth to Credex

Credex sells discounted AI infrastructure credits — Cursor, Claude, ChatGPT Enterprise, and others — sourced from companies that overforecast or pivoted. The discount is typically 15–30% off retail.

**Reasoning through LTV:**

A startup spending $1,000/month on AI tools retail might buy $800/month through Credex (20% discount). Credex margin on resold credits is approximately 8–12% of face value (rough estimate — they are buying distressed inventory, so margins vary). Call it 10%.

- Monthly revenue per customer: $1,000 × 10% margin = $100/month
- Average customer retention: 18 months (B2B SaaS tools have high switching costs once a team is using them)
- LTV per converted customer: $100 × 18 = **$1,800**

For larger customers (Series A, $3k+/month AI spend): LTV = $300/month × 18 months = **$5,400**

Blended LTV estimate across the funnel: **~$2,200** (skewed by some high-spend customers).

---

## CAC at Each GTM Channel

| Channel | Estimated CAC | Basis |
|---|---|---|
| Show HN post | ~$0 | Time cost only; 0 paid spend. If 500 sessions → 40 emails → 4 purchases, CAC = 0 |
| r/SaaS / r/startups posts | ~$0 | Same — organic. If 100 sessions → 8 emails → 1 purchase, CAC = 0 |
| X DMs (manual outreach) | ~$15 | ~2 hours of founder time per 30 DMs → 4 replies → 1 purchase. At $30/hr opportunity cost: $60 / 4 conversions = $15 |
| Credex existing customer email | ~$5 | Email tool cost spread across list. High conversion expected (warm list). |
| Viral share loop | ~$0 | CAC is zero — driven by existing users sharing their audit URL |

**Weighted average CAC across channels (Year 1):** ~$8–15 per purchased customer.

At $2,200 LTV and $12 CAC: **LTV:CAC ratio ≈ 183:1**. This is unusually strong because the distribution channels are nearly all zero-cost organic, and the product itself is the marketing (shareable audit URLs).

---

## Conversion Funnel Math

```
Landing page visitors
  → 45% start the audit form         [industry avg for free tools]
  → 70% complete the audit           [short form, no friction]
  → 25% submit email after results   [value shown first = higher conversion]
  → 15% are "high savings" tier      [>$500/mo savings identified]
  → 10% of high-savings book a call  [prominent Credex CTA]
  → 40% of consultations purchase    [warm lead, real savings motivation]
```

**Per 1,000 landing page visitors:**
- 450 start form
- 315 complete audit
- 79 submit email (qualified leads)
- 47 are high-savings tier
- 5 book a consultation
- 2 become paying Credex customers

**Revenue per 1,000 visitors:** 2 customers × $2,200 LTV = **$4,400**

**Break-even:** The tool costs approximately $30–50/month to run (Vercel free tier + Supabase free tier + Resend free tier + Anthropic API at ~$0.01/audit × 1k audits = $10). At this scale, the unit economics are massively positive.

---

## What Would Have to Be True for $1M ARR in 18 Months

$1M ARR = $83,333/month recurring revenue to Credex from SpendWise-sourced customers.

At $100/month average margin per customer: need **833 active paying customers** at month 18.

**Working backwards:**

| Metric | Required |
|---|---|
| Active paying customers at month 18 | 833 |
| Consultations that convert to purchase (40%) | 2,083 total consultations |
| Consultation bookings per month (ramp over 18mo) | ~116/month by month 12 |
| Emails captured to generate 116 bookings/mo at 10% booking rate | 1,160 qualified leads/month |
| Audits completed to generate 1,160 emails at 25% capture rate | 4,640 audits/month |
| Landing page visitors at 31.5% overall audit completion | ~14,700 visitors/month |

**Is 14,700 visitors/month achievable in 18 months?**

Yes — but requires compounding from the viral loop. If each audit generates 0.3 shared URLs on average, and each shared URL drives 5 new visitors, that is 1.5 additional visitors per audit. At scale this becomes significant. The other driver is SEO: audit result pages indexed by Google generate long-tail traffic from "[tool name] pricing" searches over time.

**What has to be true:**
1. Show HN + Reddit launch generates 1,000+ audits in first 30 days (strong but achievable)
2. Email capture rate sustains >20% (requires results page to feel genuinely valuable)
3. Consultation-to-purchase rate holds at 35–40% (requires Credex sales to follow up quickly — within 24 hours)
4. Viral loop generates at least 0.2 new visitors per audit (the shared URL needs to be compelling enough to click)
5. Credex can actually fulfil credit purchases for the tools that generate the most savings (Cursor, Claude, ChatGPT) — product-market fit between the audit results and the Credex inventory

The biggest risk is not traffic — it is conversion from consultation to purchase. If Credex's inventory does not cover the tools surfaced in high-savings audits, the model breaks. That is the assumption to pressure-test first.