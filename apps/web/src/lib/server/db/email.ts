import "server-only";
import en from "@/i18n/en";
import es from "@/i18n/es";
import type { Key } from "@/i18n/en";
import type { Locale } from "@/lib/types";

// The one way mail leaves KaizenEDU: Resend's REST API over fetch (no SDK). Configured by
// RESEND_API_KEY, sent from EMAIL_FROM (a sender on a domain verified in Resend). Nothing here logs
// an address or a link: a reset link is a key to a family's account.

export const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "KaizenEDU <no-reply@kaizenedu.net>";

export type Mail = { to: string; subject: string; text: string; html: string };
export type Delivery = "sent" | "not-configured" | "failed";
export type Sender = (mail: Mail) => Promise<Delivery>;

type Env = Record<string, string | undefined>;

export const emailConfigured = (env: Env = process.env) => Boolean(env.RESEND_API_KEY?.trim());

export function resendSender(env: Env = process.env, doFetch: typeof fetch = fetch): Sender {
  return async (mail) => {
    const key = env.RESEND_API_KEY?.trim();
    if (!key) return "not-configured";
    try {
      const res = await doFetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM?.trim() || DEFAULT_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) console.error(`[email] resend refused (${res.status})`);
      return res.ok ? "sent" : "failed";
    } catch {
      console.error("[email] resend unreachable");
      return "failed";
    }
  };
}

/** Server-side wording from the same dictionaries the screens use. */
export function tr(locale: Locale, key: Key, vars: Record<string, string | number> = {}) {
  const s = (locale === "es" ? es : en)[key] ?? en[key];
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function resetMail(to: string, link: string, locale: Locale): Mail {
  const lines = [tr(locale, "acct.mail.resetBody"), link, tr(locale, "acct.mail.resetIgnore")];
  return {
    to,
    subject: tr(locale, "acct.mail.resetSubject"),
    text: lines.join("\n\n"),
    html: `<p>${escape(lines[0])}</p><p><a href="${escape(link)}">${escape(tr(locale, "acct.mail.resetButton"))}</a></p><p>${escape(lines[2])}</p>`,
  };
}
