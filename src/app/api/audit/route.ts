import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/audit-engine";
import { saveAudit } from "@/lib/audit-store";
import { generateAISummary, buildFallbackSummary } from "@/lib/ai-summary";
import { saveAuditToDb } from "@/lib/supabase";
import type { AuditFormData, ApiResponse, AuditResult } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuditFormData;

    // Basic validation
    if (!body.teamSize || !body.useCase || !Array.isArray(body.tools)) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (body.tools.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "Add at least one tool" },
        { status: 400 }
      );
    }

    // 1. Run deterministic audit (no AI, fast)
    const auditResult = runAudit(body);

    // 2. Generate AI summary — returns null on any failure, we fall back to template
    const aiSummary = await generateAISummary(auditResult);

    const fullResult: AuditResult = {
      ...auditResult,
      aiSummary: aiSummary ?? buildFallbackSummary(auditResult),
    };

    // 3. Persist to Supabase (primary) with in-memory fallback
    const saved = await saveAuditToDb(fullResult);
    if (!saved) {
      // Supabase failed — fall back to in-memory so the user still gets results
      saveAudit(fullResult);
    }

    return NextResponse.json<ApiResponse<AuditResult>>({ data: fullResult });
  } catch (err) {
    console.error("[/api/audit] Error:", err);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
