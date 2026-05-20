# SpendWise — AI Spend Audit

SpendWise is a free tool for startup founders and engineering managers that audits their AI tool subscriptions (Cursor, Claude, ChatGPT, Copilot, etc.) and surfaces real, defensible savings opportunities in under 30 seconds. No login required. Built as a lead-generation asset for [Credex](https://credex.rocks).

## Screenshots


| Page | Preview |
|---|---|
| Landing page | `/` — headline, CTA, social proof |
| Audit form | `/audit` — tool selector with plan dropdowns and seat inputs |
| Results page | `/results/[id]` — savings hero, per-tool breakdown, Credex CTA |
| Shared audit | `/r/[id]` — public PII-stripped view with OG tags |

> Screenshots: see `/public/screenshots/` in the repo for full-resolution images.

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/spendwise
cd spendwise
npm install
cp .env.example .env.local  # fill in your keys
npm run dev
# → http://localhost:3000
```

### Environment Variables

See `.env.example` for required variables. You need:
- **Anthropic API key** — for the AI summary feature
- **Supabase** project URL + anon key + service role — for lead capture and audit storage
- **Resend API key** — for transactional confirmation emails

### Deploy

Optimized for **Vercel** (zero config with Next.js):

```bash
npx vercel --prod
```

Or any platform that supports Node.js 20+.

### Run Tests

```bash
npm test                  # run all tests
npm run test:watch        # watch mode
npm run type-check        # TypeScript only
```

---

## Decisions

1. **Next.js App Router over pages/**: Server components let us keep audit logic server-side (no client bundle bloat) and use route handlers cleanly. The RSC model also makes OG metadata per-audit URL easy to implement.

2. **Zustand with `persist` for form state**: The spec requires form state to survive page reloads. Zustand's `persist` middleware uses localStorage under the hood with zero config. Redux would be overkill; React context doesn't persist.

3. **Deterministic rules for audit engine, not AI**: The spec explicitly tests "knowing when not to use AI." Hardcoded rules are auditable, deterministic, and explainable to a finance person. AI is used only for the summary paragraph.

4. **Supabase over a custom Postgres**: Supabase gives a free-tier Postgres, a REST API, and row-level security in under 10 minutes. For a 7-day build, the alternative (Render Postgres + Drizzle ORM) adds 2+ hours of setup with no user-facing benefit.

5. **Resend over SES for transactional email**: SES requires domain verification and production approval (hours to days). Resend's free tier works immediately with a dev API key and has a React Email integration that matches our stack.

---

## Live URL

**https://creadex-web-app-git-main-mangeshlawandes-projects.vercel.app/**
