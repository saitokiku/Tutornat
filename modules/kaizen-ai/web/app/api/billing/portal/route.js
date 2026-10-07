// POST /api/billing/portal — open the Stripe Billing Portal for the caller's
// existing customer. 400 when they have no billing account yet.

import { getCaller, serviceClient } from '@/lib/server/context';
import { getStripe, appUrl } from '@/lib/server/stripe';

export const runtime = 'nodejs';

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) {
    return Response.json({ error: 'Billing needs a real account — this deployment runs in demo mode.' }, { status: 501 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: "Billing isn't live yet — you're on the free plan." }, { status: 501 });
  }
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Database not configured.' }, { status: 501 });

  const { data: sub } = await svc.from('subscriptions')
    .select('stripe_customer_id').eq('user_id', caller.user.id).maybeSingle();
  if (!sub?.stripe_customer_id) {
    return Response.json({ error: 'No billing account yet — upgrade to a plan first.' }, { status: 400 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl(req)}/billing`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[billing/portal]', err?.message);
    return Response.json({ error: 'Could not open the billing portal. Try again in a minute.' }, { status: 502 });
  }
}
