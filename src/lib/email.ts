/**
 * Minimal transactional email over Resend's HTTP API (no SDK needed). Without RESEND_API_KEY and
 * EMAIL_FROM it does nothing, so the store works fine before an email provider is chosen.
 * Returns true if the provider accepted the message.
 */
export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("email send failed", res.status);
    return res.ok;
  } catch (e) {
    console.error("email send failed", e);
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
