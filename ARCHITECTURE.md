# Architecture

## System Diagram

```mermaid
graph TD
    A[User: cold visitor] -->|lands on| B[Landing Page /]
    B -->|clicks CTA| C[Audit Form /audit]
    C -->|form state persisted| D[(localStorage via Zustand)]
    C -->|submits| E[POST /api/audit]
    E -->|runs deterministic rules| F[Audit Engine]
    F -->|returns ToolAuditResult\[\]| E
    E -->|calls if needed| G[Anthropic API\nclaude-3-5-sonnet]
    G -->|~100 word summary| E
    E -->|stores audit| H[(Supabase Postgres)]
    E -->|returns AuditResult| I[Results Page /results/\[id\]]
    I -->|shows savings| J[User sees audit]
    J -->|email gate| K[POST /api/leads]
    K -->|stores lead| H
    K -->|sends confirmation| L[Resend Transactional Email]
    I -->|shareable| M[Public URL /r/\[id\]\nPII stripped, OG tags]
```

## Data Flow

1. **Input** → User fills the spend form. State is stored in localStorage via Zustand `persist` — survives page reloads.
2. **Audit** → On submit, `POST /api/audit` receives `AuditFormData`. The audit engine runs a set of deterministic, finance-grade rules per tool. No AI is used here — hardcoded logic is auditable and explainable.
3. **Summary** → After audit rules run, the Anthropic API generates a ~100-word personalized paragraph. If it fails (timeout, rate limit, etc.), we fall back to a templated summary — no user-facing error.
4. **Storage** → The full `AuditResult` is stored in Supabase. A `nanoid`-based ID is generated at audit creation time — this becomes the shareable URL slug.
5. **Lead Capture** → After results are shown, the user optionally provides their email. This is stored separately in Supabase (linked by `auditId`). A Resend transactional email confirms the audit.
6. **Share** → `/r/[id]` serves the public-safe version of the audit (tools and savings shown, PII stripped). Open Graph meta tags are set server-side for clean link previews.

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | RSC for SEO + OG meta; API routes; zero-config Vercel deploy |
| Language | TypeScript (strict) | Type safety across engine + API + UI without extra tooling |
| Styling | Tailwind CSS | Utility-first; fast iteration; no runtime CSS-in-JS |
| State | Zustand + persist | Minimal, localStorage persistence built-in |
| Database | Supabase | Free tier Postgres + RLS + instant REST API |
| Email | Resend | Works on free tier without domain approval delays |
| AI | Anthropic API (claude-3-5-sonnet) | Natural choice for an Anthropic-adjacent product |
| Tests | Jest + ts-jest | Standard in Next.js ecosystem |
| CI | GitHub Actions | Free, integrates with repo |
| Deploy | Vercel | Zero config for Next.js; free tier sufficient for assignment |

## What Changes at 10k Audits/Day

- **Database**: Add a connection pool (PgBouncer via Supabase) and read replicas for the shareable audit fetches. Audit writes are the hot path.
- **API route**: Move the Anthropic summary generation to a background job (Inngest or Trigger.dev) — return the audit immediately, stream the summary update via SSE or polling.
- **Rate limiting**: Move from per-request honeypot to Redis-backed rate limiting (Upstash) keyed by IP + fingerprint.
- **Caching**: Cache the public `/r/[id]` response at the CDN edge (Vercel's `cache: 'force-cache'`) — it's immutable after creation.
- **Audit engine**: Extract to a standalone service if we add more tools — it's pure TypeScript with no side effects, easy to isolate.
