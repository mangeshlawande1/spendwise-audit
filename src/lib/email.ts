import type { AuditResult, PlanChange } from "@/types";
import { formatCurrency } from "@/lib/utils";

// ─── Base URL resolution ──────────────────────────────────────────────────────
// Priority: explicit env var → Vercel auto URL → localhost (dev only)
// ACTION REQUIRED: set NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
// in Vercel → Settings → Environment Variables, then redeploy.
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// ─── Shared HTML shell ────────────────────────────────────────────────────────
function buildHtml(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>SpendWise</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;color:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}&zwnj;&nbsp;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:20px;">
          <span style="font-size:19px;font-weight:700;color:#22c55e;letter-spacing:-0.3px;">SpendWise</span>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:28px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:16px;text-align:center;">
          <p style="color:#334155;font-size:11px;margin:0;">
            SpendWise &middot; A free tool by <a href="https://credex.rocks" style="color:#475569;text-decoration:none;">Credex</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Send via Resend ──────────────────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping");
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
        to: [to],
        subject,
        html,   // HTML version — what email clients render
        text,   // Plaintext fallback for clients that block HTML
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend ${res.status}:`, body);
      return false;
    }
    console.log(`[email] Sent "${subject}" → ${to}`);
    return true;
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return false;
  }
}

// ─── 1. Audit confirmation email (sent after lead capture) ────────────────────
export async function sendAuditConfirmation(
  email: string,
  audit: AuditResult
): Promise<boolean> {
  const BASE_URL = getBaseUrl();
  const auditUrl = `${BASE_URL}/results/${audit.id}`;

  const isHigh = audit.savingsTier === "high";
  const isOptimal = audit.savingsTier === "optimal";

  const subject = isHigh
    ? `Your SpendWise audit — ${formatCurrency(audit.totalMonthlySavings)}/mo in savings found`
    : isOptimal
    ? "Your SpendWise audit — your stack looks good ✓"
    : `Your SpendWise audit — ${formatCurrency(audit.totalMonthlySavings)}/mo in savings available`;

  const topTools = [...audit.toolResults]
    .filter((r) => r.monthlySavings > 0)
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 3);

  const toolRowsHtml = topTools.length > 0
    ? topTools.map((r) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e293b;font-size:14px;color:#cbd5e1;">
          <strong>${r.toolName}</strong>
          <span style="color:#64748b;font-size:12px;"> · ${r.planName}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1e293b;text-align:right;font-size:14px;">
          <strong style="color:#22c55e;">${formatCurrency(r.monthlySavings)}/mo</strong>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="2" style="padding:10px 0;color:#64748b;font-size:14px;">All tools are already on optimal plans.</td></tr>`;

  const toolRowsText = topTools.length > 0
    ? topTools.map((r) => `  • ${r.toolName} (${r.planName}): save ${formatCurrency(r.monthlySavings)}/mo`).join("\n")
    : "  • All tools are already on optimal plans.";

  const html = buildHtml(
    `${formatCurrency(audit.totalMonthlySavings)}/mo in savings identified for your team`,
    `
    <h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:0 0 4px;">
      ${isOptimal ? "You&rsquo;re spending efficiently ✓" : `${formatCurrency(audit.totalMonthlySavings)}<span style="font-size:16px;color:#94a3b8;">/mo in savings</span>`}
    </h1>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px;">
      ${audit.formData.teamSize}-person team &middot; ${audit.formData.useCase}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1e293b;margin-bottom:24px;">
      ${toolRowsHtml}
    </table>

    ${isHigh ? `
    <div style="background:#052e16;border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;color:#86efac;font-size:13px;">
        Our team will follow up to discuss how Credex credits can accelerate these savings.
      </p>
    </div>` : ""}

    <a href="${auditUrl}"
       style="display:block;text-align:center;background:#22c55e;color:#000;font-weight:700;font-size:14px;padding:13px 0;border-radius:8px;text-decoration:none;margin-bottom:20px;">
      View full audit →
    </a>

    <p style="color:#475569;font-size:12px;margin:0;line-height:1.5;">
      ⚡ <strong style="color:#64748b;">Pricing alerts on</strong> — if pricing changes on any of your tools, 
      we'll email you with a one-click link to see the updated recommendations.
    </p>
    `
  );

  const text = `SpendWise Audit Report
${"─".repeat(42)}

Team: ${audit.formData.teamSize} people  |  Use case: ${audit.formData.useCase}

TOTAL SAVINGS IDENTIFIED
  Monthly : ${formatCurrency(audit.totalMonthlySavings)}/mo
  Annual  : ${formatCurrency(audit.totalAnnualSavings)}/yr

TOP RECOMMENDATIONS
${toolRowsText}

View your full audit:
  ${auditUrl}

─────────────────────────────────────────
Pricing alerts are ON. We'll notify you if pricing changes
on any tool in your audit.
SpendWise · credex.rocks`;

  return sendEmail(email, subject, html, text);
}

// ─── 2. Pricing change notification (Round 2 core feature) ────────────────────
export async function sendPricingChangeEmail(
  email: string,
  auditId: string,
  affectedTools: string[],
  pricingChanges: PlanChange[]
): Promise<boolean> {
  const BASE_URL = getBaseUrl();
  // ?reaudit=1 tells the results page to auto-run the diff on load
  const reauditUrl = `${BASE_URL}/results/${auditId}?reaudit=1`;

  const toolLabel = affectedTools.slice(0, 2).join(" & ") + (affectedTools.length > 2 ? ` +${affectedTools.length - 2} more` : "");
  const subject = `⚡ Pricing changed on ${toolLabel} — re-check your audit`;

  const changeRowsHtml = pricingChanges.map((c) => {
    const delta = c.changeType === "price_change"
      ? (c.delta > 0
          ? `<span style="color:#f87171;font-size:12px;">▲ +$${Math.abs(c.delta)}</span>`
          : `<span style="color:#22c55e;font-size:12px;">▼ -$${Math.abs(c.delta)}</span>`)
      : "";
    const priceStr = c.changeType === "price_change"
      ? `$${c.oldPrice} → $${c.newPrice}/seat`
      : c.changeType === "plan_added"
      ? `New plan at $${c.newPrice}/seat`
      : "Plan removed";
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1e293b;font-size:14px;color:#cbd5e1;">
          <strong>${c.toolName}</strong>
          <span style="color:#64748b;font-size:12px;"> · ${c.planName}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #1e293b;text-align:right;font-size:13px;color:#94a3b8;">
          ${priceStr} ${delta}
        </td>
      </tr>`;
  }).join("");

  const changeRowsText = pricingChanges.map((c) => {
    if (c.changeType === "price_change") {
      const dir = c.delta > 0 ? "increased" : "decreased";
      return `  • ${c.toolName} — ${c.planName}: $${c.oldPrice} → $${c.newPrice}/seat ($${Math.abs(c.delta)} ${dir})`;
    }
    if (c.changeType === "plan_added") return `  • ${c.toolName} — new plan: ${c.planName} at $${c.newPrice}/seat`;
    return `  • ${c.toolName} — plan removed: ${c.planName}`;
  }).join("\n");

  const affectedBadgesHtml = affectedTools
    .map((t) => `<span style="display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:4px;padding:3px 9px;font-size:12px;color:#cbd5e1;margin:2px 4px 2px 0;">${t}</span>`)
    .join("");

  const html = buildHtml(
    `Pricing changed on ${affectedTools.join(", ")} — your audit recommendations may need updating`,
    `
    <h1 style="font-size:22px;font-weight:700;color:#f1f5f9;margin:0 0 4px;">
      Pricing just changed ⚡
    </h1>
    <p style="color:#64748b;font-size:13px;margin:0 0 24px;">
      On tools in your saved audit &middot; ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
    </p>

    <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 4px;">What changed</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1e293b;margin-bottom:20px;">
      ${changeRowsHtml}
    </table>

    <p style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 8px;">Your affected tools</p>
    <div style="margin-bottom:24px;">${affectedBadgesHtml}</div>

    <p style="color:#94a3b8;font-size:13px;margin:0 0 16px;line-height:1.5;">
      These tools appear in your saved audit. Your recommendations may no longer reflect the best plan for your team.
    </p>

    <!-- CTA -->
    <a href="${reauditUrl}"
       style="display:block;text-align:center;background:#22c55e;color:#000000;font-weight:700;font-size:15px;padding:14px 0;border-radius:8px;text-decoration:none;margin-bottom:12px;">
      ⚡ See what changed in my audit →
    </a>
    <p style="text-align:center;color:#475569;font-size:11px;margin:0 0 20px;">
      Diff loads automatically — old vs new, side by side. No account needed.
    </p>

    <hr style="border:none;border-top:1px solid #1e293b;margin-bottom:16px;"/>
    <p style="color:#334155;font-size:11px;margin:0;">
      Reply &ldquo;unsubscribe&rdquo; to stop pricing alerts for this audit.
    </p>
    `
  );

  const text = `SpendWise — Pricing Update Alert
${"─".repeat(42)}

Pricing changed on tools in your saved audit.
${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

WHAT CHANGED
${changeRowsText}

YOUR AFFECTED TOOLS
${affectedTools.map((t) => `  • ${t}`).join("\n")}

Your previous recommendations may no longer be accurate.

RE-RUN YOUR AUDIT (diff loads automatically — no extra steps)
  ${reauditUrl}

${"─".repeat(42)}
SpendWise · credex.rocks
Reply "unsubscribe" to opt out of pricing alerts.`;

  return sendEmail(email, subject, html, text);
}
