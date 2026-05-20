import type { AuditResult } from "@/types";
import type { PlanChange } from "@/types";
import { formatCurrency } from "@/lib/utils";

// ─── Shared Resend helper ─────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "SpendWise <onboarding@resend.dev>",
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend error ${res.status}:`, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return false;
  }
}

// ─── Audit confirmation ───────────────────────────────────────────────────────

/**
 * Sends the audit confirmation email via Resend.
 * Never throws — email failure must never break the leads API response.
 */
export async function sendAuditConfirmation(
  email: string,
  audit: AuditResult
): Promise<boolean> {
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

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://creadex-web-app-git-main-mangeshlawandes-projects.vercel.app";

  const credexSection = isHighSavings
    ? `\nBecause your audit shows ${formatCurrency(audit.totalMonthlySavings)}/mo in savings, a member of the Credex team will reach out shortly. Credex sources discounted AI infrastructure credits — same tools, 20–40% less — from companies that overforecast.\n\nIf you'd like to fast-track, book a 15-minute call: https://credex.rocks\n`
    : `\nCredex sells discounted AI credits for Cursor, Claude, ChatGPT Enterprise, and more. If your stack changes, come back for a new audit: ${baseUrl}\n`;

  const shareUrl = `${baseUrl}/r/${audit.id}`;

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

  const ok = await sendEmail({ to: email, subject, text });
  if (ok) {
    console.log(`[email] Confirmation sent to ${email} for audit ${audit.id}`);
  }
  return ok;
}

// ─── Pricing change notification (Round 2) ────────────────────────────────────

/**
 * Notify a user that pricing has changed on tools in their audit.
 * One email per unique user email, regardless of how many audits they have.
 */
export async function sendPricingChangeEmail(opts: {
  email: string;
  auditId: string;
  auditCreatedAt: string;
  changes: PlanChange[];
  affectedToolNames: string[];
}): Promise<boolean> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://creadex-web-app-git-main-mangeshlawandes-projects.vercel.app";

  const auditDate = new Date(opts.auditCreatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format each price change as a bullet
  const changeLines = opts.changes
    .filter((c) => c.changeType === "price_change")
    .map((c) => {
      const direction = c.delta < 0 ? "−" : "+";
      return `• ${c.toolName} ${c.planName}: $${c.oldPrice}/seat → $${c.newPrice}/seat (${direction}$${Math.abs(c.delta)}/seat)`;
    })
    .join("\n");

  const affectedList = opts.affectedToolNames
    .map((name) => `• ${name}`)
    .join("\n");

  const reauditUrl = `${baseUrl}/results/${opts.auditId}?reaudit=1`;

  const text = `⚡ Pricing changed on tools in your AI audit
${"─".repeat(45)}

Hi,

Pricing has changed on AI tools you're using, and your audit
from ${auditDate} may no longer reflect the best recommendations.

WHAT CHANGED
${"─".repeat(33)}
${changeLines || "• Pricing structure updated on your tools"}

YOUR AFFECTED TOOLS
${"─".repeat(33)}
These tools appear in your audit:
${affectedList}

RE-RUN YOUR AUDIT
${"─".repeat(33)}
Click below to see updated recommendations with a side-by-side
comparison of old vs new:

${reauditUrl}

This link runs a fresh analysis against current pricing and
shows exactly what changed.

${"─".repeat(45)}
SpendWise · A free tool by Credex · credex.rocks
Reply "unsubscribe" to opt out.`;

  const ok = await sendEmail({
    to: opts.email,
    subject: "⚡ Pricing changed on tools in your AI audit",
    text,
  });

  if (ok) {
    console.log(
      `[email] Pricing change notification sent to ${opts.email} for audit ${opts.auditId}`
    );
  }
  return ok;
}
