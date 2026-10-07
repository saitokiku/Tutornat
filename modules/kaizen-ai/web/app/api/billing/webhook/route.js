// POST /api/billing/webhook — Stripe events drive subscriptions + profiles.plan.
// NO user auth here: the Stripe signature on the RAW body is the authentication.
// Service-role writes only; every mutation is audit-logged.

import { serviceClient, auditLog } from '@/lib/server/context';
import { getStripe } from '@/lib/server/stripe';
import { applySubscription, fulfillTutoringCheckout, fulfillGroupSeatCheckout, periodEndOf, mustWrite as must } from '@/lib/server/billing';
import { sendSubscriptionStarted, sendSubscriptionCancelled } from '@/lib/server/billingEmails';
// The diagnostic's lifecycle table has exactly one home (spec W3). Importing it
// rather than restating "pending → paid" here is what keeps a refunded order
// terminal on both sides of the money.
import { applyOrderEvent } from '@/lib/server/diagnosticOrders';

export const runtime = 'nodejs';

async function resolveUserId(svc, stripe, customerId) {
  if (!customerId) return null;
  const data = must(await svc.from('subscriptions')
    .select('user_id').eq('stripe_customer_id', customerId).maybeSingle());
  if (data?.user_id) return data.user_id;
  // fallback: customer metadata set at creation time
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer?.metadata?.kaizen_user_id || null;
  } catch {
    return null;
  }
}

async function currentSubRow(svc, userId) {
  return must(await svc.from('subscriptions')
    .select('stripe_subscription_id,status').eq('user_id', userId).maybeSingle());
}

export async function POST(req) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return Response.json({ error: 'Billing webhook not configured.' }, { status: 501 });
  }
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Database not configured.' }, { status: 501 });

  const raw = await req.text();
  const signature = req.headers.get('stripe-signature');
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error('[billing/webhook] bad signature:', err?.message);
    return Response.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // The one-time diagnostic (0036). Dispatched first among the metadata
        // branches because it is the only one that is NOT a subscription and
        // not a seat: an order id here means every path below is wrong for this
        // event. Idempotent by construction — Stripe retries, and
        // applyOrderEvent refuses to walk an order backwards or to revive a
        // refunded one.
        const diagnosticOrderId = session.metadata?.diagnostic_order_id;
        if (diagnosticOrderId) {
          // `completed` is not `paid`. For a delayed-notification method the
          // session completes with payment_status 'unpaid' and the money may
          // never arrive — so both sibling branches below gate on this same
          // field (lib/server/billing.js `fulfillTutoringCheckout` /
          // `fulfillGroupSeatCheckout` each open with it), and so does this
          // one. Without the gate a family who reaches the Stripe redirect
          // gets a diagnostic we were never paid for.
          if (session.payment_status !== 'paid') {
            console.warn('[billing/webhook] diagnostic session completed unpaid', diagnosticOrderId, session.payment_status);
            break;
          }
          const order = must(await svc.from('diagnostic_order')
            .select('id,payer_id,status,amount_cents').eq('id', diagnosticOrderId).maybeSingle());
          if (!order) break;
          const next = applyOrderEvent(order.status, 'paid');
          if (next.changed) {
            must(await svc.from('diagnostic_order').update({
              status: next.status,
              stripe_session_id: session.id,
              // What Stripe actually collected, not what we quoted.
              ...(Number.isFinite(Number(session.amount_total)) ? { amount_cents: Number(session.amount_total) } : {}),
            }).eq('id', diagnosticOrderId));
            await auditLog(order.payer_id, 'diagnostic.order_paid', diagnosticOrderId, {
              stripe_session_id: session.id, amount_total: session.amount_total, from: order.status,
            });
          }
          break;
        }

        // Pay-per-session tutoring: dispatch on metadata before the
        // subscription path. Marks the held session paid + scheduled.
        // Group drop-in seat. Dispatched before the 1:1 path and before the
        // subscription path, because all three arrive on the same event type
        // and are told apart only by metadata.
        const groupSeatId = session.metadata?.group_seat_id;
        if (groupSeatId) {
          // Shared with reconcile (lib/server/billing.js): marks paid+booked,
          // or refunds a late payment against an already-released seat.
          const seat = must(await svc.from('group_seat').select('*').eq('id', groupSeatId).maybeSingle());
          await fulfillGroupSeatCheckout(svc, stripe, seat, session);
          break;
        }

        const tutoringSessionId = session.metadata?.tutoring_session_id;
        if (tutoringSessionId) {
          // Shared with reconcile: marks paid+scheduled, or refunds a late
          // payment against an already-released hold (audit REL-001).
          const sess = must(await svc.from('tutoring_sessions').select('*').eq('id', tutoringSessionId).maybeSingle());
          await fulfillTutoringCheckout(svc, stripe, sess, session);
          break;
        }

        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const userId = await resolveUserId(svc, stripe, customerId);
        if (!userId) break;
        const sub = session.subscription
          ? await stripe.subscriptions.retrieve(typeof session.subscription === 'string' ? session.subscription : session.subscription.id)
          : null;
        const subEmail = session.customer_details?.email || session.customer_email || null;
        const applied = await applySubscription(svc, {
          userId, customerId, sub,
          forceStatus: sub ? null : 'active',
          email: subEmail,
        });
        await auditLog(userId, 'billing.checkout_completed', applied.plan || 'unknown', {
          stripe_customer_id: customerId, status: applied.status,
        });
        if (applied.plan && ['active', 'trialing'].includes(applied.status)) {
          sendSubscriptionStarted(subEmail, applied.plan, { trialing: applied.status === 'trialing' }).catch(() => {});
        }
        break;
      }

      // A delayed-notification payment that never cleared. The session
      // completed 'unpaid' (handled above by breaking early), so the order is
      // still `pending`; this closes it out rather than leaving a row that
      // looks like a family waiting on a report they never paid for.
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        const diagnosticOrderId = session.metadata?.diagnostic_order_id;
        if (!diagnosticOrderId) break;
        const order = must(await svc.from('diagnostic_order')
          .select('id,payer_id,status').eq('id', diagnosticOrderId).maybeSingle());
        if (!order) break;
        const closed = applyOrderEvent(order.status, 'refunded');
        if (!closed.changed) break;
        must(await svc.from('diagnostic_order')
          .update({ status: closed.status, stripe_session_id: session.id })
          .eq('id', diagnosticOrderId));
        await auditLog(order.payer_id, 'diagnostic.order_payment_failed', diagnosticOrderId, {
          stripe_session_id: session.id,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const userId = await resolveUserId(svc, stripe, customerId);
        if (!userId) break;
        // Stripe does not guarantee event order: a trailing event from an OLD
        // subscription must not clobber a live newer one (cancel → resubscribe).
        const row = await currentSubRow(svc, userId);
        if (row?.stripe_subscription_id && row.stripe_subscription_id !== sub.id
            && ['active', 'trialing'].includes(row.status)) {
          break; // stale event for a previous subscription — ignore
        }
        const applied = await applySubscription(svc, { userId, customerId, sub });
        await auditLog(userId, 'billing.subscription_updated', applied.plan || 'unchanged', {
          stripe_customer_id: customerId, status: applied.status,
        });
        break;
      }

      case 'invoice.payment_failed': {
        // Immediate past_due signal (subscription.updated follows later, but
        // the fix-payment banner should appear as soon as the charge fails).
        const invoice = event.data.object;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        const userId = await resolveUserId(svc, stripe, customerId);
        if (!userId) break;
        must(await svc.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('user_id', userId).eq('stripe_customer_id', customerId));
        await auditLog(userId, 'billing.payment_failed', invoice.id || 'invoice', {
          stripe_customer_id: customerId, amount_due: invoice.amount_due,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
        const userId = await resolveUserId(svc, stripe, customerId);
        if (!userId) break;
        // Only the subscription we currently track may downgrade the user —
        // an out-of-order deletion of an older sub must not zero a live plan.
        const row = await currentSubRow(svc, userId);
        if (row?.stripe_subscription_id && row.stripe_subscription_id !== sub.id) {
          break;
        }
        must(await svc.from('subscriptions').upsert({
          user_id: userId,
          plan: 'free',
          status: 'cancelled',
          stripe_customer_id: customerId,
          stripe_subscription_id: sub?.id || null,
          current_period_end: periodEndOf(sub),
        }, { onConflict: 'user_id' }));
        must(await svc.from('profiles').update({ plan: 'free' }).eq('id', userId));
        await auditLog(userId, 'billing.subscription_cancelled', 'free', { stripe_customer_id: customerId });
        try {
          const { data: prof } = await svc.from('profiles').select('email').eq('id', userId).maybeSingle();
          if (prof?.email) sendSubscriptionCancelled(prof.email).catch(() => {});
        } catch { /* email is best-effort */ }
        break;
      }

      default:
        // Unhandled event types are fine — acknowledge so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error('[billing/webhook]', event.type, err?.message);
    return Response.json({ error: 'Webhook handling failed.' }, { status: 500 });
  }

  return Response.json({ received: true });
}
