// Email abstraction. Resend when configured; console output in dev.
//
// CAN-SPAM posture: every message to a known account carries an unsubscribe
// footer + List-Unsubscribe headers. `kind` controls suppression:
//   'essential' (default) — transactional/relationship mail (receipts, booking
//     confirmations, guardian consent, security). Sent even after opt-out, as
//     CAN-SPAM permits for transactional content.
//   'promo' — anything promotional (welcome/onboarding nudges, digests).
//     Suppressed entirely once the recipient opts out.
// Recipients without a profile (e.g. a guardian's first email) get no footer —
// those messages are one-off transactional notices.

import { createClient } from '@supabase/supabase-js';

// HTML-escape for anything user-controlled that lands in an email body or a
// server-rendered HTML page (audit SEC-003 — an account named `<a href=…>`
// must never inject live markup through our trusted sender).
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function appUrl() { return (process.env.APP_URL || '').replace(/\/$/, ''); }

async function recipientPrefs(to) {
  const db = svc();
  if (!db) return { optOut: false, token: null };
  try {
    const { data } = await db.from('profiles')
      .select('email_opt_out,unsubscribe_token')
      .eq('email', String(to).toLowerCase()).maybeSingle();
    return { optOut: data?.email_opt_out === true, token: data?.unsubscribe_token || null };
  } catch {
    return { optOut: false, token: null }; // pre-0007 schema — send without footer
  }
}

// `attachments`: [{ filename, content }] with content as plain text (e.g. an
// .ics from lib/server/ics.js) — base64-encoded here for the Resend payload.
export async function sendEmail({ to, subject, html, kind = 'essential', attachments = [] }) {
  const { optOut, token } = await recipientPrefs(to);
  if (kind === 'promo' && optOut) return { sent: false, suppressed: true };

  const unsubUrl = token ? `${appUrl()}/api/email/unsubscribe?t=${token}` : null;
  // Footer styles are inlined (no Tailwind in email clients). The hex values
  // ARE the live tokens from tailwind.config.js: #756E67 = muted,
  // #E8E3DA = border.
  const footer = unsubUrl
    ? `<p style="font-size:11px;color:#756E67;margin-top:24px;border-top:1px solid #E8E3DA;padding-top:12px">
         Kaizen Academy LLC · <a href="${appUrl()}/privacy" style="color:#756E67">Privacy</a> ·
         <a href="${unsubUrl}" style="color:#756E67">Unsubscribe from non-essential email</a>
       </p>`
    : '';
  const body = `${html || ''}${footer}`;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Rule 6 makes this a designed deployment state, not a dev-only branch, so
    // this line lands in a real log stream. It must therefore carry nothing
    // that identifies a person or grants access: the body holds live guardian
    // consent links and unsubscribe tokens, and `to` is often a minor's or a
    // guardian's address (audit A6). Domain only — same redaction the
    // send-failure path below already uses.
    console.log(`[email:dev] not configured (RESEND_API_KEY unset) — not sent: kind=${kind} to=@${String(to).split('@')[1] || '?'} subject="${subject}"`);
    return { sent: false, dev: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        // Fallback matches the live domain (kaizenedu.net) — the old
        // kaizentutors.com fallback predated the brand decision. Production
        // should still set EMAIL_FROM explicitly to the Resend-verified sender.
        from: process.env.EMAIL_FROM || 'Kaizen <reports@kaizenedu.net>',
        to, subject, html: body,
        ...(attachments.length ? {
          attachments: attachments
            .filter((a) => a && a.filename && a.content)
            .map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString('base64') })),
        } : {}),
        ...(unsubUrl ? {
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        } : {}),
      }),
    });
    if (!res.ok) {
      // Callers fire-and-forget; without this line a failed consent or booking
      // email is invisible (audit REL-006). Domain only — never log the address.
      console.error(`[email] send failed (${res.status}) kind=${kind} to=@${String(to).split('@')[1] || '?'} subject="${subject}"`);
    }
    return { sent: res.ok };
  } catch (err) {
    console.error(`[email] send error kind=${kind} to=@${String(to).split('@')[1] || '?'}:`, err?.message);
    return { sent: false, error: err?.message };
  }
}
