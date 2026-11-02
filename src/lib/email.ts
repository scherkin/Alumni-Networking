import "server-only";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SCHOOL = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Our High School";

/** Addresses we must never send to: reserved example domains and sample profiles. */
export function isDeliverable(email: string | null | undefined, isSample = false) {
  if (!email || isSample) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !/(^|\.)example\.(com|org|net)$/.test(domain);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(heading: string, inner: string) {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#152038">
  <p style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#a87400;margin:0 0 8px">${escapeHtml(SCHOOL)} alumni network</p>
  <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(heading)}</h1>${inner}
  <p style="font-size:12px;color:#5b6478;margin-top:24px">You're getting this because your contact details are listed in the ${escapeHtml(SCHOOL)} alumni network.</p></div>`;
}

async function send(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is not set; skipped email to", to);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

export function sendMessageEmail(opts: {
  to: string; senderName: string; senderLine: string; body: string; conversationId: string; joinNeeded: boolean;
}) {
  const link = `${SITE}/messages/${opts.conversationId}`;
  const cta = opts.joinNeeded
    ? `Sign in to the network and claim your profile to reply`
    : `Reply on the network`;
  const html = layout(`New message from ${opts.senderName}`, `
    <p style="margin:0 0 4px;color:#5b6478;font-size:14px">${escapeHtml(opts.senderLine)}</p>
    <blockquote style="margin:12px 0;padding:12px 14px;background:#f5f6f8;border-radius:10px;white-space:pre-wrap">${escapeHtml(opts.body)}</blockquote>
    <p><a href="${link}" style="display:inline-block;background:#1d3a8a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${cta}</a></p>
    <p style="font-size:13px;color:#5b6478">Replies to this email aren't delivered. Use the link to answer.</p>`);
  const text = `New message from ${opts.senderName} (${opts.senderLine}):\n\n${opts.body}\n\n${cta}: ${link}\nReplies to this email aren't delivered.`;
  return send(opts.to, `${opts.senderName} sent you a message on the ${SCHOOL} alumni network`, html, text);
}

export function sendClaimCodeEmail(opts: { to: string; profileName: string; requesterName: string; code: string }) {
  const html = layout("Your profile claim code", `
    <p>${escapeHtml(opts.requesterName)} asked to claim the alumni profile for <b>${escapeHtml(opts.profileName)}</b>.</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:.2em;margin:16px 0">${opts.code}</p>
    <p>Enter this code on the claim page within 15 minutes. If this wasn't you, ignore this email and the profile stays unclaimed.</p>`);
  const text = `${opts.requesterName} asked to claim the alumni profile for ${opts.profileName}.\n\nCode: ${opts.code}\n\nEnter it within 15 minutes. If this wasn't you, ignore this email.`;
  return send(opts.to, `Your claim code: ${opts.code}`, html, text);
}
