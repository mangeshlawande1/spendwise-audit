-- ─────────────────────────────────────────────────────────────────────────────
-- SpendWise — Supabase Schema + Round 2 Re-Audit Migration
-- Run in Supabase SQL Editor ONCE
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── audits table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audits (
  id text PRIMARY KEY,

  created_at timestamptz NOT NULL DEFAULT now(),

  form_data jsonb NOT NULL,
  tool_results jsonb NOT NULL,

  total_monthly_savings numeric NOT NULL DEFAULT 0,
  total_annual_savings numeric NOT NULL DEFAULT 0,

  savings_tier text NOT NULL
    CHECK (savings_tier IN ('high', 'medium', 'low', 'optimal')),

  ai_summary text,

  -- Round 2 additions
  user_email text,
  pricing_snapshot jsonb,
  parent_audit_id text REFERENCES audits(id) ON DELETE SET NULL,
  cross_tool_findings jsonb,
  efficiency_score int
);


-- ─── audits indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS audits_user_email
  ON audits (user_email)
  WHERE user_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS audits_parent_id
  ON audits (parent_audit_id)
  WHERE parent_audit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audits_created_at
  ON audits (created_at DESC);


-- ─── audits RLS ──────────────────────────────────────────────────────────────

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Public read for shareable report URLs
CREATE POLICY "audits_public_read"
  ON audits
  FOR SELECT
  USING (true);

-- Service role inserts
CREATE POLICY "audits_service_insert"
  ON audits
  FOR INSERT
  WITH CHECK (true);


-- ─── leads table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  created_at timestamptz NOT NULL DEFAULT now(),

  audit_id text REFERENCES audits(id) ON DELETE SET NULL,

  email text NOT NULL,

  company_name text,
  role text,
  team_size int,

  ip_hash text NOT NULL DEFAULT ''
);


-- ─── leads indexes ───────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS leads_ip_hash_created_at
  ON leads (ip_hash, created_at);

CREATE INDEX IF NOT EXISTS leads_audit_id
  ON leads (audit_id);

CREATE INDEX IF NOT EXISTS leads_email
  ON leads (email);


-- ─── leads RLS ───────────────────────────────────────────────────────────────

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "leads_service_only"
  ON leads
  FOR ALL
  USING (false);


-- ─── pricing_events table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  detected_at timestamptz NOT NULL DEFAULT now(),

  snapshot_before jsonb NOT NULL,
  snapshot_after jsonb NOT NULL,

  changed_tools text[] NOT NULL,
  affected_emails text[] NOT NULL,

  emails_sent int NOT NULL DEFAULT 0
);


-- ─── pricing_events RLS ──────────────────────────────────────────────────────

ALTER TABLE pricing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_events_service_only"
  ON pricing_events
  FOR ALL
  USING (false);


-- ─── Optional backfill ───────────────────────────────────────────────────────

-- Run AFTER deployment if needed

-- UPDATE audits
-- SET user_email = leads.email
-- FROM leads
-- WHERE leads.audit_id = audits.id
--   AND audits.user_email IS NULL;