import "server-only";
import type { Email } from "./render";

// Sending through Resend's REST API (no SDK), and the confirmation token that proves an address
// asked for the weekly email. The token is an HMAC of the address under a key derived from the
// Resend key, so the server keeps no list: only someone who received the link can hold it.
//
//   RESEND_API_KEY  required to send anything; without it the app shows previews only
//   KAIZEN_EMAIL    on Vercel, must also be "resend", so a key left in the project by an earlier
//                   attempt stays inert until someone means to send (same rule as KAIZEN_AI)
//   EMAIL_FROM      sender, e.g. "KaizenEDU <weekly@kaizenedu.net>" (a domain verified in Resend)
//   APP_URL         origin for links in emails; defaults to the request's own origin

const RESEND = "https://api.resend.com/emails";
const DEFAULT_FROM = "KaizenEDU <weekly@kaizenedu.net>";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY) && (!process.env.VERCEL || process.env.KAIZEN_EMAIL === "resend");

export const normEmail = (email: string) => email.trim().toLowerCase();

const b64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function hmac(purpose: string, value: string) {
  const secret = process.env.RESEND_API_KEY;
  if (!secret) throw new Error("email not configured");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(`kaizenedu-email-v1:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(`${purpose}:${value}`)));
}

/** The token in a confirmation link for this address. */
export const tokenFor = (email: string) => hmac("weekly", normEmail(email));

/** Constant-time check that `token` was issued for `email`. */
export async function verifyToken(email: string, token: string) {
  const want = await tokenFor(email);
  if (token.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}

/** A stable, non-reversible tag for an address, for idempotency keys and rate limits (never logged raw). */
export const addressTag = (email: string) => hmac("tag", normEmail(email)).then((t) => t.slice(0, 16));

export type SendOutcome = { ok: true; id: string } | { ok: false; status: number };

export async function sendEmail(to: string, email: Email, idempotencyKey: string): Promise<SendOutcome> {
  const res = await fetch(RESEND, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, to: [to], subject: email.subject, text: email.text, html: email.html }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res) return { ok: false, status: 0 };
  if (!res.ok) return { ok: false, status: res.status };
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: json.id ?? "" };
}
