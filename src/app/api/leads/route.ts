import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveLeadToDb, isRateLimited, getAuditFromDb } from "@/lib/supabase";
import { getAudit } from "@/lib/audit-store";
import { sendAuditConfirmation } from "@/lib/email";
import { hashIP, getClientIP } from "@/lib/ip";
import type { ApiResponse } from "@/types";

// ─── Zod validation schema ────────────────────────────────────────────────────

const LeadSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),
  companyName: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  teamSize: z.number().int().min(1).max(100000).optional(),
  auditId: z.string().min(1, "Audit ID is required").max(50),
  website: z.string().max(0, "Bot detected").optional(), // honeypot
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Honeypot — bots fill the hidden "website" field
    if (body.website) {
      return NextResponse.json<ApiResponse<{ success: true }>>({
        data: { success: true },
      });
    }

    // 2. Zod validation
    const parsed = LeadSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json<ApiResponse<never>>(
        { error: firstError?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { email, companyName, role, teamSize, auditId } = parsed.data;

    // 3. Rate limiting — max 3 submissions per IP per hour
    const ip = getClientIP(req);
    const ipHash = await hashIP(ip);
    const limited = await isRateLimited(ipHash);

    if (limited) {
      return NextResponse.json<ApiResponse<never>>(
        { error: "Too many requests — please try again later." },
        { status: 429 }
      );
    }

    // 4. Save to Supabase
    await saveLeadToDb({ email, companyName, role, teamSize, auditId, ipHash });

    // 5. Send confirmation email — fire and forget, never blocks response
    const audit = (await getAuditFromDb(auditId)) ?? getAudit(auditId) ?? null;
    if (audit) {
      sendAuditConfirmation(email, audit).catch((err) =>
        console.error("[/api/leads] Email send failed:", err)
      );
    }

    return NextResponse.json<ApiResponse<{ success: true }>>({
      data: { success: true },
    });
  } catch (err) {
    console.error("[/api/leads] Error:", err);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
