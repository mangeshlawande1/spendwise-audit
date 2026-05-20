import type { AuditResult } from "@/types";
import { formatCurrency } from "@/lib/utils";

/**
 * Sends the audit confirmation email via Resend.
 * Never throws — email failure must never break the leads API response.
 * Returns true on success, false on any failure.
 */
export async function sendAuditConfirmation(
  email: string,
  audit: AuditResult
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email");
    return false;
  }

  const isHighSavings = audit.savingsTier === "high";

  const subject = isHighSavings
    ? `Your SpendWise audit: ${formatCurrency(audit.totalMonthlySavings)}/mo in savings identified`
    : audit.savingsTier === "optimal"
    ? "Your SpendWise audit: your AI stack is well-optimised"
    : `Your SpendWise audit: ${formatCurrency(audit.totalMonthlySavings)}/mo in savings available`;

  const topSavings = [...audit.toolResults]
    .filter((r) => r.monthlySavings > 0)
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 3);

  const toolBreakdown =
    topSavings.length > 0
      ? topSavings
          .map(
            (r) =>
              `• ${r.toolName} (${r.planName}): save ${formatCurrency(r.monthlySavings)}/mo — ${r.reasoning}`
          )
          .join("\n")
      : "• All tools are on optimal plans for your team size and use case.";

  const credexSection = isHighSavings
    ? `\nBecause your audit shows ${formatCurrency(audit.totalMonthlySavings)}/mo in savings, a member of the Credex team will reach out shortly. Credex sources discounted AI infrastructure credits — same tools, 20–40% less — from companies that overforecast.\n\nIf you'd like to fast-track, book a 15-minute call: https://credex.rocks\n`
    : `\nCredex sells discounted AI credits for Cursor, Claude, ChatGPT Enterprise, and more. If your stack changes, come back for a new audit: ${process.env.NEXT_PUBLIC_BASE_URL ?? "https://creadex-web-app-git-main-mangeshlawandes-projects.vercel.app"}\n`;

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://creadex-web-app-git-main-mangeshlawandes-projects.vercel.app"}/r/${audit.id}`;

  const text = `SpendWise Audit Report
${"─".repeat(40)}

Team: ${audit.formData.teamSize} people · Use case: ${audit.formData.useCase}
Audit ID: ${audit.id}

TOTAL SAVINGS IDENTIFIED
Monthly: ${formatCurrency(audit.totalMonthlySavings)}/mo
Annual:  ${formatCurrency(audit.totalAnnualSavings)}/yr

TOP RECOMMENDATIONS
${toolBreakdown}
${credexSection}
SHARE YOUR AUDIT
${shareUrl}

─────────────────────────────────────────
SpendWise · A free tool by Credex · credex.rocks
To unsubscribe from future emails, reply with "unsubscribe".`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "SpendWise <onboarding@resend.dev>",
        to: [email],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend error ${res.status}:`, body);
      return false;
    }

    console.log(`[email] Confirmation sent to ${email} for audit ${audit.id}`);
    return true;
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return false;
  }
}
