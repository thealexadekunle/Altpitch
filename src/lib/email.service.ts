import "server-only";

/**
 * Wired into the password-reset flow (lib/auth/auth.ts's sendResetPassword) and available for
 * future transactional email (admin notifications, billing receipts, etc.).
 *
 * Uses Resend's REST API directly (no SDK dependency) — inert without RESEND_API_KEY: logs to
 * the server console instead of sending, so calling this in an unconfigured environment never
 * throws or silently drops something a developer expected to see.
 */
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const DEFAULT_FROM = "Altpitch <notifications@altpitch.dev>"; // update once a verified sending domain is set up

export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email.service] RESEND_API_KEY not set — would have sent "${params.subject}" to ${params.to}`);
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: params.from ?? DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email.service] Resend API error ${res.status}: ${body}`);
    return { sent: false };
  }

  return { sent: true };
}
