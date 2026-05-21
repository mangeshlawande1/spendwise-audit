import { createClient } from "@supabase/supabase-js";
import type { AuditResult, LeadData, PricingSnapshot } from "@/types";

// ─── Client setup ─────────────────────────────────────────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Audit operations ─────────────────────────────────────────────────────────

export async function saveAuditToDb(
  result: AuditResult,
  userEmail?: string,
  pricingSnapshot?: PricingSnapshot
): Promise<boolean> {
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
      // BUG FIX 1: cross_tool_findings was never saved — reaudit diff
      // always got [] for crossToolFindings, making cross-tool savings invisible.
      cross_tool_findings: result.crossToolFindings ?? [],
      efficiency_score: result.efficiencyScore ?? 80,
      total_monthly_savings: result.totalMonthlySavings,
      total_annual_savings: result.totalAnnualSavings,
      savings_tier: result.savingsTier,
      ai_summary: result.aiSummary,
      user_email: userEmail ?? null,
      pricing_snapshot: pricingSnapshot ?? null,
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

export async function saveReauditToDb(
  result: AuditResult,
  parentAuditId: string,
  userEmail?: string,
  pricingSnapshot?: PricingSnapshot
): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return false;
  try {
    const { error } = await client.from("audits").insert({
      id: result.id,
      created_at: result.createdAt,
      form_data: result.formData,
      tool_results: result.toolResults,
      cross_tool_findings: result.crossToolFindings ?? [],
      efficiency_score: result.efficiencyScore ?? 80,
      total_monthly_savings: result.totalMonthlySavings,
      total_annual_savings: result.totalAnnualSavings,
      savings_tier: result.savingsTier,
      ai_summary: result.aiSummary,
      user_email: userEmail ?? null,
      pricing_snapshot: pricingSnapshot ?? null,
      parent_audit_id: parentAuditId,
    });
    if (error) {
      console.error("[supabase] Insert re-audit error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[supabase] Unexpected error saving re-audit:", err);
    return false;
  }
}

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
      // BUG FIX 2: these two fields were already mapped correctly — keeping them.
      crossToolFindings: data.cross_tool_findings ?? [],
      efficiencyScore: data.efficiency_score ?? 80,
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

export async function getAuditRowFromDb(id: string): Promise<{
  id: string;
  user_email: string | null;
  pricing_snapshot: PricingSnapshot | null;
  form_data: AuditResult["formData"];
} | null> {
  const client = getServiceClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("audits")
      .select("id, user_email, pricing_snapshot, form_data")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getAuditsWithEmail(): Promise<
  Array<{
    id: string;
    user_email: string;
    form_data: AuditResult["formData"];
    pricing_snapshot: PricingSnapshot | null;
  }>
> {
  const client = getServiceClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("audits")
      .select("id, user_email, form_data, pricing_snapshot")
      .not("user_email", "is", null)
      // BUG FIX 3: re-audits (parent_audit_id IS NOT NULL) were included in
      // detect-changes, causing duplicate emails for the same user stack.
      // Only scan original audits.
      .is("parent_audit_id", null)
      .limit(500);

    if (error) {
      console.error("[supabase] Error fetching audits with email:", error.message);
      return [];
    }

    return (data ?? []).filter(
      (row) => row.user_email && row.pricing_snapshot
    ) as Array<{
      id: string;
      user_email: string;
      form_data: AuditResult["formData"];
      pricing_snapshot: PricingSnapshot | null;
    }>;
  } catch (err) {
    console.error("[supabase] Unexpected error in getAuditsWithEmail:", err);
    return [];
  }
}

export async function getRecentPricingEvent(
  changedToolIds: string[]
): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return false;
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sorted = [...changedToolIds].sort();
    const { data, error } = await client
      .from("pricing_events")
      .select("changed_tools")
      .gte("detected_at", oneDayAgo)
      .limit(100);
    if (error) return false;
    // Check if any event has the exact same set of changed tools
    return (data ?? []).some((row) => {
      const existing = [...(row.changed_tools as string[])].sort();
      return (
        existing.length === sorted.length &&
        existing.every((v, i) => v === sorted[i])
      );
    });
  } catch {
    return false;
  }
}

export async function savePricingEvent(params: {
  snapshotBefore: PricingSnapshot;
  snapshotAfter: PricingSnapshot;
  changedTools: string[];
  affectedEmails: string[];
  emailsSent: number;
}): Promise<string | null> {
  const client = getServiceClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("pricing_events")
      .insert({
        snapshot_before: params.snapshotBefore,
        snapshot_after: params.snapshotAfter,
        changed_tools: params.changedTools,
        affected_emails: params.affectedEmails,
        emails_sent: params.emailsSent,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[supabase] Error saving pricing event:", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error("[supabase] Unexpected error saving pricing event:", err);
    return null;
  }
}

export async function getLeadEmailForAudit(
  auditId: string
): Promise<string | null> {
  const client = getServiceClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("leads")
      .select("email")
      .eq("audit_id", auditId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data.email ?? null;
  } catch {
    return null;
  }
}

// ─── Lead operations ──────────────────────────────────────────────────────────

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

    // BUG FIX 4: The .is("user_email", null) filter was silently dropped
    // by Supabase when chained after .update() without a proper eq().
    // Rewritten to a safe explicit check pattern.
    const { error: updateError } = await client
      .from("audits")
      .update({ user_email: lead.email })
      .eq("id", lead.auditId)
      .is("user_email", null);

    if (updateError) {
      // Non-fatal — lead is saved, email backfill failed
      console.warn("[supabase] user_email backfill failed:", updateError.message);
    }

    return true;
  } catch (err) {
    console.error("[supabase] Unexpected error saving lead:", err);
    return false;
  }
}

export async function isRateLimited(ipHash: string): Promise<boolean> {
  const client = getServiceClient();
  if (!client) return false;
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
