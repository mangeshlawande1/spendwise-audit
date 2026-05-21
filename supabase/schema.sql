-- SpendWise — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query

-- ─── audits table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audits (
  id                    text PRIMARY KEY,
  created_at            timestamptz DEFAULT now() NOT NULL,
  form_data             jsonb NOT NULL,
  tool_results          jsonb NOT NULL,
  cross_tool_findings   jsonb NOT NULL DEFAULT '[]',
  total_monthly_savings numeric NOT NULL DEFAULT 0,
  total_annual_savings  numeric NOT NULL DEFAULT 0,
  efficiency_score      int NOT NULL DEFAULT 80,
  savings_tier          text NOT NULL CHECK (savings_tier IN ('high','medium','low','optimal')),
  ai_summary            text,

  -- Round 2: pricing change detection
  user_email            text,
  pricing_snapshot      jsonb,
  parent_audit_id       text REFERENCES audits(id) ON DELETE SET NULL
);

-- Public read for shareable URLs (no auth required)
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audits_public_read"
  ON audits FOR SELECT
  USING (true);

CREATE POLICY "audits_service_insert"
  ON audits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audits_service_update"
  ON audits FOR UPDATE
  USING (true);

-- Index for email lookups (detect-changes)
CREATE INDEX IF NOT EXISTS audits_user_email
  ON audits (user_email)
  WHERE user_email IS NOT NULL;

-- Index for audit lineage (original → re-audits)
CREATE INDEX IF NOT EXISTS audits_parent_id
  ON audits (parent_audit_id)
  WHERE parent_audit_id IS NOT NULL;

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

-- ─── pricing_events table (Round 2) ──────────────────────────────────────────
-- Tracks each time pricing changes are detected and emails sent.
-- Prevents duplicate notifications if detect-changes is called multiple times.
CREATE TABLE IF NOT EXISTS pricing_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at     timestamptz DEFAULT now() NOT NULL,
  snapshot_before jsonb NOT NULL,
  snapshot_after  jsonb NOT NULL,
  changed_tools   text[] NOT NULL,
  affected_emails text[] NOT NULL,
  emails_sent     int NOT NULL DEFAULT 0
);

ALTER TABLE pricing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_events_service_only"
  ON pricing_events FOR ALL
  USING (false);  -- service role only

-- ─── Migration: add Round 2 columns to existing audits table ─────────────────
-- Run these if you already have an audits table from Round 1:
--
-- ALTER TABLE audits
--   ADD COLUMN IF NOT EXISTS user_email        text,
--   ADD COLUMN IF NOT EXISTS pricing_snapshot  jsonb,
--   ADD COLUMN IF NOT EXISTS parent_audit_id   text REFERENCES audits(id) ON DELETE SET NULL,
--   ADD COLUMN IF NOT EXISTS cross_tool_findings jsonb NOT NULL DEFAULT '[]',
--   ADD COLUMN IF NOT EXISTS efficiency_score  int NOT NULL DEFAULT 80;
--
-- CREATE INDEX IF NOT EXISTS audits_user_email
--   ON audits (user_email) WHERE user_email IS NOT NULL;
--
-- CREATE INDEX IF NOT EXISTS audits_parent_id
--   ON audits (parent_audit_id) WHERE parent_audit_id IS NOT NULL;
