// GET/POST /api/email/unsubscribe?t=<token> — one-click opt-out from
// non-essential email (CAN-SPAM). GET serves a friendly confirmation page;
// POST supports RFC 8058 List-Unsubscribe-Post one-click from mail clients.
// Token is a per-profile random uuid — no auth required by design (mail
// clients click these links without a session).

import { serviceClient } from '@/lib/server/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function optOut(token) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return false;
  const svc = serviceClient();
  if (!svc) return false;
  const { data } = await svc.from('profiles')
    .update({ email_opt_out: true })
    .eq('unsubscribe_token', token)
    .select('id').maybeSingle();
  return Boolean(data);
}

function page(ok) {
  const body = ok
    ? `<h1>You're unsubscribed 🌸</h1>
       <p>You won't receive non-essential email from Kaizen anymore. We'll still send the
       messages your account needs — receipts, booking confirmations, and safety notices.</p>
       <p>Changed your mind? You can turn emails back on in <a href="/settings">Settings</a>.</p>`
    : `<h1>That link didn't work</h1>
       <p>The unsubscribe link looks expired or invalid. You can manage email preferences in
       <a href="/settings">Settings</a>, or contact us via the <a href="/contact">contact page</a>.</p>`;
  // Standalone page, no Tailwind: inline hexes are the live tokens from
  // app/globals.css :root (--c-paper: 250 250 249 = #FAFAF9;
  // --c-ink: 26 25 23 = #1A1917). These are hardcoded because mail clients
  // do not load a stylesheet, and they were WRONG: the comment claimed they
  // came from the config while shipping #FCFBF9/#211D1A, a palette from
  // before the 2026-08-22 rebuild. If the tokens move, move these too.
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Kaizen — email preferences</title>
     <body style="font-family:-apple-system,Segoe UI,sans-serif;background:#FAFAF9;color:#1A1917;
       display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0">
       <div style="max-width:420px;padding:32px;text-align:center;line-height:1.6;font-size:15px">${body}</div>
     </body>`,
    { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(req) {
  const ok = await optOut(new URL(req.url).searchParams.get('t'));
  return page(ok);
}

// RFC 8058 one-click (mail clients POST with no body we need to read)
export async function POST(req) {
  const ok = await optOut(new URL(req.url).searchParams.get('t'));
  return Response.json({ ok });
}
