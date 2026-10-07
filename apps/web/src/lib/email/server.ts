import "server-only";
import type { Email } from "./render";

// Sending through Resend's REST API (no SDK), and the two proofs behind the weekly email. The server
// keeps no list of addresses: both are HMACs under a server secret.
//   - A confirmation code (8 characters, like 4K7Q-MZ2D) for one address, made per hour and
//     accepted for 48 hours. It is emailed to the address, so only its owner can read it.
//   - A send token, given in exchange for a valid code. It carries the time it was issued and stops
//     working after TOKEN_MAX_AGE_MS; each email sent with an older-than-a-week token returns a fresh
//     one. Turning the email off forgets the token in the browser; a copy left anywhere else dies with
//     its age, and changing EMAIL_SECRET ends every token at once (without touching the Resend key).
//
//   RESEND_API_KEY  required to send anything; without it the app shows previews only
//   KAIZEN_EMAIL    on Vercel, must also be "resend", so a key left in the project by an earlier
//                   attempt stays inert until someone means to send (same rule as KAIZEN_AI)
//   APP_URL         origin for links in emails, e.g. https://kaizenedu.net. Required off Vercel: a
//                   request's own Host header can't be trusted behind every proxy. On Vercel the
//                   deployment's own address is used when it is unset.
//   EMAIL_FROM      sender, e.g. "KaizenEDU <weekly@kaizenedu.net>" (a domain verified in Resend)
//   EMAIL_SECRET    optional key for codes and tokens; defaults to one derived from the Resend key

const RESEND = "https://api.resend.com/emails";
const DEFAULT_FROM = "KaizenEDU <weekly@kaizenedu.net>";
const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const CODE_HOURS = 48;
export const TOKEN_MAX_AGE_MS = 120 * DAY;
export const TOKEN_RENEW_MS = 7 * DAY;

export const emailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY) && (!process.env.VERCEL || process.env.KAIZEN_EMAIL === "resend") && Boolean(process.env.APP_URL || process.env.VERCEL);

/** Where links in emails point. Null when it can't be trusted (then emailConfigured() is false). */
export function appOrigin(req: Request): string | null {
  const set = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (set) return set;
  return process.env.VERCEL ? new URL(req.url).origin : null;
}

export const normEmail = (email: string) => email.trim().toLowerCase();

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function hmac(purpose: string, value: string): Promise<Uint8Array> {
  const secret = process.env.EMAIL_SECRET || process.env.RESEND_API_KEY;
  if (!secret) throw new Error("email not configured");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(`kaizenedu-email-v2:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${purpose}:${value}`)));
}

/** Constant-time string comparison. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Crockford's base 32: no I, L, O or U, so a code read off a phone is hard to mistype.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** The confirmation code for an address in the hour `at` falls in: 8 characters (40 bits). */
export async function codeFor(email: string, at: number) {
  const bytes = await hmac("code", `${normEmail(email)}:${Math.floor(at / HOUR)}`);
  // 40 bits fit exactly in a double; read them 5 at a time, high first.
  let bits = 0;
  for (const b of bytes.slice(0, 5)) bits = bits * 256 + b;
  let out = "";
  for (let i = 7; i >= 0; i--) out += ALPHABET[Math.floor(bits / 32 ** i) % 32];
  return out;
}

/** "4k7q mz2d", "4K7Q-MZ2D", "4K7QMZ2O" → "4K7QMZ20"; anything else → null. */
export function normCode(code: string): string | null {
  const c = code
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(c) ? c : null;
}

/** True when `code` was issued for `email` in the last CODE_HOURS hours. */
export async function checkCode(email: string, code: string, now: number) {
  const want = normCode(code);
  if (!want) return false;
  let ok = false;
  for (let h = 0; h < CODE_HOURS; h++) ok = same(await codeFor(email, now - h * HOUR), want) || ok;
  return ok;
}

/** A send token for an address, issued at `now`: "w2.<issued, base 36 seconds>.<mac>". */
export async function issueToken(email: string, now: number) {
  const issued = Math.floor(now / 1000).toString(36);
  return `w2.${issued}.${b64url(await hmac("weekly", `${normEmail(email)}:${issued}`))}`;
}

/** Whether `token` was issued for `email` and is still young enough; `renew` when it is worth replacing. */
export async function checkToken(email: string, token: string, now: number): Promise<{ ok: boolean; renew: boolean }> {
  const no = { ok: false, renew: false };
  const m = /^w2\.([0-9a-z]{1,10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return no;
  const age = now - parseInt(m[1], 36) * 1000;
  if (age < -5 * 60_000 || age > TOKEN_MAX_AGE_MS) return no;
  const want = b64url(await hmac("weekly", `${normEmail(email)}:${m[1]}`));
  return same(m[2], want) ? { ok: true, renew: age > TOKEN_RENEW_MS } : no;
}

/** A stable, non-reversible tag for an address, for idempotency keys and rate limits (never logged raw). */
export const addressTag = (email: string) => hmac("tag", normEmail(email)).then((t) => b64url(t).slice(0, 16));

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
