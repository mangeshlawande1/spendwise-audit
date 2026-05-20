import { createClient } from "@supabase/supabase-js";
import type { AuditResult, LeadData } from "@/types";

// ─── Client setup ─────────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// ─── Supabase table SQL (run once in Supabase SQL editor) ─────────────────────
/*
CREATE TABLE IF NOT EXISTS audits (
  id                    text PRIMARY KEY,
  created_at            timestamptz DEFAULT now(),
  form_data             jsonb NOT NULL,
  tool_results          jsonb NOT NULL,
  total_monthly_savings numeric NOT NULL DEFAULT 0,
  total_annual_savings  numeric NOT NULL DEFAULT 0,
  savings_tier          text NOT NULL,
  ai_summary            text
);

CREATE TABLE IF NOT EXISTS leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz DEFAULT now(),
  audit_id      text REFERENCES audits(id),
  email         text NOT NULL,
  company_name  text,
  role          text,
  team_size     int,
  ip_hash       text
);

-- Index for rate limiting lookups
CREATE INDEX IF NOT EXISTS leads_ip_hash_created_at
  ON leads (ip_hash, created_at);
*/

// ─── Audit operations ─────────────────────────────────────────────────────────

/**
 * Persist an audit result to Supabase.
 * Returns true on success, false on any failure.
 * Never throws — caller falls back to in-memory store.
 */
export async function saveAuditToDb(result: AuditResult): Promise<boolean> {
  const client = getServiceClient();
  if (!client) {
    console.warn("[supabase] No client — SUPABASE env vars missing");
    return false;
  }

  try {
    const { error } = await client.from("audits").insert({
      id: result.id,
      created_at: result.createdAt,
      form_data: result.formData,
      tool_results: result.toolResults,
      total_monthly_savings: result.totalMonthlySavings,
      total_annual_savings: result.totalAnnualSavings,
      savings_tier: result.savingsTier,
      ai_summary: result.aiSummary,
    });

    if (error) {
      console.error("[supabase] Insert audit error:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[supabase] Unexpected error saving audit:", err);
    return false;
  }
}

/**
 * Fetch a single audit by ID from Supabase.
 * Returns null if not found or on error.
 */
export async function getAuditFromDb(id: string): Promise<AuditResult | null> {
  const client = getServiceClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("audits")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      formData: data.form_data,
      toolResults: data.tool_results,
      totalMonthlySavings: data.total_monthly_savings,
      totalAnnualSavings: data.total_annual_savings,
      savingsTier: data.savings_tier,
      aiSummary: data.ai_summary,
    } as AuditResult;
  } catch (err) {
    console.error("[supabase] Error fetching audit:", err);
    return null;
  }
}

// ─── Lead operations ──────────────────────────────────────────────────────────

/**
 * Save a lead to Supabase.
 * Returns true on success, false on failure.
 */
export async function saveLeadToDb(
  lead: LeadData & { ipHash: string }
): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return false;

  try {
    const { error } = await client.from("leads").insert({
      audit_id: lead.auditId,
      email: lead.email,
      company_name: lead.companyName ?? null,
      role: lead.role ?? null,
      team_size: lead.teamSize ?? null,
      ip_hash: lead.ipHash,
    });

    if (error) {
      console.error("[supabase] Insert lead error:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[supabase] Unexpected error saving lead:", err);
    return false;
  }
}

/**
 * Rate limit check: has this IP submitted more than 3 leads in the last hour?
 * Returns true if rate limited (should block), false if OK to proceed.
 */
export async function isRateLimited(ipHash: string): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return false; // no DB = no rate limiting, allow through

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await client
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (error) return false;
    return (count ?? 0) >= 3;
  } catch {
    return false;
  }
}
