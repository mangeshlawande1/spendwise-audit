# User Interviews

Three conversations conducted via X DMs and college network. Each was 10–15 minutes, unstructured, starting with "walk me through what AI tools your team pays for and how you decide what to keep."

---

## Interview 1

**Name:** Arjun S.
**Role:** CTO / Co-founder
**Company stage:** Seed (~$800k raised, 6-person team)
**Date:** 2026-05-08

Arjun's team builds a B2B analytics SaaS. They were paying for Cursor Business (6 seats), Claude Team (6 seats), and ChatGPT Team (6 seats). All three for the same 4 engineers.

**Direct quotes:**
> "We added ChatGPT Team when GPT-4 came out, then Claude Team when everyone said it was better for code, then Cursor because the IDE integration is just different. We never cancelled anything — we just kept adding."

> "I genuinely don't know which one my engineers use most. I assume Cursor because it's in the editor but I've never actually checked."

> "When I see the bill I think 'I should look into this' and then a customer thing happens and I forget for another month."

**Most surprising thing they said:**
He had 6 Cursor Business seats for 4 engineers. Two of the seats were for the design co-founder and himself — he opened Cursor maybe twice a month. He had not noticed this because the billing was on the company card and nobody reviewed line items.

**What it changed about my design:**
I added a warning in the audit engine specifically for "seats > active developers" mismatches — not just plan tier, but headcount. The Cursor rule now flags if `seats > teamSize * 0.8` as a likely over-provisioning. This would have surfaced Arjun's exact situation immediately.

---

## Interview 2

**Name:** Meera T.
**Role:** Founder (solo, technical)
**Company stage:** Pre-revenue side project, 1 person
**Date:** 2026-05-09

Meera is a software engineer at a mid-size company building a side project on weekends. She was paying for Claude Pro ($20), ChatGPT Plus ($20), and Cursor Pro ($20) — $60/month total.

**Direct quotes:**
> "I signed up for all three during different hype cycles and I never got around to picking one. I use Claude for writing and thinking, Cursor for coding, and ChatGPT... honestly mostly for nothing anymore. Old habit."

> "I'd cancel ChatGPT today if someone just told me I wasn't missing anything. I don't know what it does that Claude doesn't."

> "Twenty dollars feels small so I never think about it. But $240 a year for something I don't use — that's different when you say it that way."

**Most surprising thing they said:**
The "$240 a year" reframe landed harder than "$20 a month" for the exact same spend. She literally said "oh that's actually a lot" when I said the annual number out loud. She had been looking at monthly figures and the psychological weight just was not there.

**What it changed about my design:**
This confirmed that the SavingsHero component should lead with the **annual** savings figure as the hero number, with monthly in smaller text underneath — not the other way around. I made this change on Day 3 after the interview. The visual hierarchy now reads: "$3,840 / year" in large type, "$320 / month" below it. It also reinforced why the "you're spending well" case needs to still show the annual spend total — even an optimal spender seeing "$720/year on AI tools" might reconsider.

---

## Interview 3

**Name:** Rohan K.
**Role:** Engineering Manager
**Company stage:** Series A (~$5M raised, 22-person company, 8 engineers)
**Date:** 2026-05-10

Rohan manages the engineering team at a fintech startup. They were paying for GitHub Copilot Business (8 seats), Cursor Pro (4 seats for senior engineers), and Claude Team (8 seats). Total approximately $580/month.

**Direct quotes:**
> "Finance asks me to justify the AI line item every quarter and I spend like two hours pulling together screenshots from three different billing dashboards. It's annoying."

> "I picked Copilot Business because it came with the GitHub Enterprise contract. Half my engineers use Cursor instead. I'm probably paying for both for the same people."

> "If I could show my CFO a one-page breakdown of what we're spending and why, that would save me actual work. Right now I have to build that in a Google Doc."

**Most surprising thing they said:**
He described the audit as a tool for justifying spend upward — not for finding savings. He did not lead with "I want to save money." He led with "I want to stop wasting time building a report manually every quarter." The use case I had been designing for (savings discovery) was secondary for him. His primary job-to-be-done was *internal reporting and justification*.

**What it changed about my design:**
This pushed me to make the shareable audit URL more useful as an internal document — not just a viral tweet link. The public result page now has cleaner section headers ("Current spend," "Recommended actions," "Potential savings") that read like a report, not just a consumer results page. It also made me add PDF export to my week-2 wishlist: Rohan would use that immediately. He would not share his audit on Twitter, but he would attach the PDF to a Slack message to his CFO.