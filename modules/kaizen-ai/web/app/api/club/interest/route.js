// POST /api/club/interest — "get first pick when booking opens" capture for
// the held storefront. Public (no auth), burst-limited, honeypotted. Answers
// {ok:true} for any valid, *stored* address whether or not it was already on
// the list — that sameness is the anti-enumeration property and must survive
// any change here. What it no longer does is answer {ok:true} when nothing was
// stored: the form promises "you're on the list", so a dropped write has to
// come back as a real failure the visitor can act on (rule 6).
import { serviceClient } from '@/lib/server/context';
import { validateInterest } from '@/lib/server/interest';
import { checkRate, rateKey } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const rate = await checkRate(rateKey(null, req, 'interest'), { limit: 5, windowMs: 60_000 });
  if (!rate.ok) {
    return Response.json({ error: 'Too many requests. Give it a minute.' }, { status: 429 });
  }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const v = validateInterest(body);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  if (v.value.bot) return Response.json({ ok: true }); // honeypot: swallow silently

  const svc = serviceClient();
  if (!svc) {
    return Response.json(
      { error: 'The list isn’t set up on this deployment yet. Email hello@kaizenedu.net and we’ll add you by hand.' },
      { status: 503 }
    );
  }

  // Upsert on (email, kind): repeat submissions are idempotent, not errors —
  // ON CONFLICT DO NOTHING reports no error and returns no row, so reading the
  // error tells us the write failed without telling the caller whether the
  // address was already known.
  const { error } = await svc.from('club_interest').upsert(
    { email: v.value.email, kind: v.value.kind, source: v.value.source },
    { onConflict: 'email,kind', ignoreDuplicates: true }
  );
  if (error) {
    console.error('[club:interest] upsert failed:', error.message);
    return Response.json(
      { error: 'Couldn’t save that just now. Try again in a moment, or email hello@kaizenedu.net.' },
      { status: 500 }
    );
  }
  return Response.json({ ok: true });
}
