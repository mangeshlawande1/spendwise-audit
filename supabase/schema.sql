-- SpendWise — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query

-- ─── audits table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id                    text PRIMARY KEY,
  created_at            timestamptz DEFAULT now() NOT NULL,
  form_data             jsonb NOT NULL,
  tool_results          jsonb NOT NULL,
  total_monthly_savings numeric NOT NULL DEFAULT 0,
  total_annual_savings  numeric NOT NULL DEFAULT 0,
  savings_tier          text NOT NULL CHECK (savings_tier IN ('high','medium','low','optimal')),
  ai_summary            text
);

-- Public read for shareable URLs (no auth required)
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits_public_read"
  ON audits FOR SELECT
  USING (true);

CREATE POLICY "audits_service_insert"
  ON audits FOR INSERT
  WITH CHECK (true);

-- ─── leads table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now() NOT NULL,
  audit_id      text REFERENCES audits(id) ON DELETE SET NULL,
  email         text NOT NULL,
  company_name  text,
  role          text,
  team_size     int,
  ip_hash       text NOT NULL DEFAULT ''
);

-- Leads are private — only service role can read/write
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_service_only"
  ON leads FOR ALL
  USING (false);  -- blocks all anon/user access; service role bypasses RLS

-- Index for rate limiting lookups (ip_hash + time window)
CREATE INDEX IF NOT EXISTS leads_ip_hash_created_at
  ON leads (ip_hash, created_at);

-- Index for joining leads to audits
CREATE INDEX IF NOT EXISTS leads_audit_id
  ON leads (audit_id);
