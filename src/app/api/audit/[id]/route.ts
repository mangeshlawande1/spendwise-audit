import { NextRequest, NextResponse } from "next/server";
import { getAudit } from "@/lib/audit-store";
import { getAuditFromDb } from "@/lib/supabase";
import type { ApiResponse, AuditResult } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Try Supabase first (persistent, survives restarts)
  const dbAudit = await getAuditFromDb(params.id);
  if (dbAudit) {
    return NextResponse.json<ApiResponse<AuditResult>>({ data: dbAudit });
  }

  // 2. Fall back to in-memory store (same-process only)
  const memAudit = getAudit(params.id);
  if (memAudit) {
    return NextResponse.json<ApiResponse<AuditResult>>({ data: memAudit });
  }

  return NextResponse.json<ApiResponse<never>>(
    { error: "Audit not found" },
    { status: 404 }
  );
}
