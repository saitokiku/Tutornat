// POST /api/safety/under13 — logs a blocked under-13 signup attempt to
// safety_events (COPPA mitigation trail). Anonymous by design: the visitor
// never became a user, and we deliberately store no identifying data.

import { serviceClient } from '@/lib/server/context';
import { checkRate, rateKey } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const rate = await checkRate(rateKey(null, req, 'safety'), { limit: 5, windowMs: 60_000 });
  if (!rate.ok) return Response.json({ ok: true }); // silently absorb spam

  const svc = serviceClient();
  if (svc) {
    await svc.from('safety_events').insert({
      kind: 'under13_signup_blocked',
      detail: 'Signup blocked at the age gate; parent-consent explainer shown.',
      metadata: { source: 'signup' },
    }).then(() => {}, () => {});
  }
  return Response.json({ ok: true });
}
