// POST /api/support — the public contact form (/contact). Deliberately usable
// while signed out, so it is NOT auth-gated — but it writes a row that surfaces
// in the admin console, so it is rate-limited by user id when signed in and by
// IP otherwise. An authenticated caller can no longer attach someone else's
// address: their account email wins over anything in the body.
import { getCaller, serviceClient } from '@/lib/server/context';
import { checkRate, rateKey } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const caller = await getCaller(req);

  // Was the only route in the app with no limiter AND no auth — unbounded
  // 4KB inserts with an attacker-chosen `email`, rendered to admins as if real.
  const rate = await checkRate(rateKey(caller, req, 'support'), { limit: 5, windowMs: 3600_000 });
  if (!rate.ok) {
    return Response.json(
      { error: 'You’ve sent a few messages already — we’ll reply to those first.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } }
    );
  }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const message = String(body?.message || '').slice(0, 4000);
  if (message.trim().length < 5) return Response.json({ error: 'Tell us a bit more.' }, { status: 422 });

  // Signed in → trust the account, never the payload. The old order let the
  // body override, so a ticket could be filed under an arbitrary address.
  const email = caller?.user?.email
    ? String(caller.user.email).slice(0, 200)
    : String(body?.email || '').slice(0, 200);

  // /privacy routes CCPA deletion requests here and /safety points reports at
  // the same desk, so a message this route cannot store is not a message we can
  // cheerfully acknowledge (audit H11, rule 6). Both failure modes below answer
  // with a real status and no `ok`, and the page turns that into the direct
  // address so the person still gets helped. Nothing about the message itself
  // is logged — it is exactly the content we promised to handle carefully.
  const svc = serviceClient();
  if (!svc) {
    console.error('[support] no service client — message not stored, sender redirected to email');
    return Response.json(
      {
        error: 'Our message desk isn’t reachable on this deployment. Email hello@kaizenedu.net and we’ll pick it up there.',
        unconfigured: true,
      },
      { status: 503 }
    );
  }

  const { error } = await svc.from('support_requests').insert({
    user_id: caller?.user?.id || null,
    email,
    topic: String(body?.topic || 'general').slice(0, 100),
    message,
    metadata: {
      ua: (req.headers.get('user-agent') || '').slice(0, 300),
      verified_sender: Boolean(caller?.user?.email),
    },
  });
  if (error) {
    console.error('[support] insert failed:', error.message);
    return Response.json(
      { error: 'Could not save that just now — email hello@kaizenedu.net or try again shortly.' },
      { status: 500 }
    );
  }
  return Response.json({ ok: true });
}
