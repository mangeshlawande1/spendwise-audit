/**
 * Temporary in-memory store for audit results.
 * Day 5: Replace with Supabase persistence.
 *
 * In Next.js serverless functions, this resets per cold start — that's fine
 * for development. For production, Supabase is required.
 */
import type { AuditResult } from "@/types";

// Module-level map persists across requests in the same process instance
const store = new Map<string, AuditResult>();

export function saveAudit(result: AuditResult): void {
  store.set(result.id, result);
}

export function getAudit(id: string): AuditResult | undefined {
  return store.get(id);
}