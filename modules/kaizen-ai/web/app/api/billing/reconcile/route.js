// POST /api/billing/reconcile — verify billing state against Stripe.
// Called from the /billing?status=success and /dashboard?booking=paid return
// screens so entitlement/payment reflects VERIFIED Stripe state, not an
// optimistic redirect. Grants a just-purchased subscription even if the webhook
// never fired, and fulfills any tutoring session Stripe already charged.
// Safe to call repeatedly (idempotent) and safe when Stripe is unconfigured.

import { getCaller, serviceClient } from '@/lib/server/context';
import { getStripe } from '@/lib/server/stripe';
import { reconcileUserBilling } from '@/lib/server/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ ok: true, plan: 'free', reconciled: false });

  const stripe = getStripe();
  const svc = serviceClient();
  if (!stripe || !svc) return Response.json({ ok: true, reconciled: false });

  try {
    const result = await reconcileUserBilling(svc, stripe, {
      userId: caller.user.id,
      email: caller.user.email || null,
    });
    // Read back the authoritative plan after reconciliation.
    const { data: prof } = await svc.from('profiles').select('plan').eq('id', caller.user.id).maybeSingle();
    return Response.json({ ok: true, reconciled: true, plan: prof?.plan || 'free', ...result });
  } catch (e) {
    console.error('[billing/reconcile]', caller.user.id, e?.message);
    return Response.json({ error: 'Could not verify billing yet — try again in a moment.' }, { status: 502 });
  }
}
