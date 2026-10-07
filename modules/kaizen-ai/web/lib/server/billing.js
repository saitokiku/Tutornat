// Shared billing state-transition logic (audit: money moves — reconciliation).
// Both the Stripe webhook AND the /api/billing/reconcile route apply state
// through these helpers, so entitlement/payment never depends on a single
// webhook delivery. Every DB write goes through mustWrite(): error → throw, so
// a failed write becomes a 500 the caller (Stripe or the browser) retries,
// never a silent lost upgrade.

import { auditLog } from '@/lib/server/context';
import { planByPrice, mapStripeStatus } from '@/lib/server/stripe';
import { recordTrialRedemption } from '@/lib/server/trial';
import { sendBookingEmails, sendGroupSeatEmails } from '@/lib/server/tutoringEmails';

export function mustWrite({ data, error }) {
  if (error) throw new Error(error.message || 'database write failed');
  return data;
}

// current_period_end moved into items on newer Stripe API versions — read both.
export function periodEndOf(sub) {
  const unix = sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || null;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

export function priceIdOf(sub) {
  return sub?.items?.data?.[0]?.price?.id || null;
}

// Write a subscription + profile.plan from a Stripe subscription object.
// Idempotent: safe to call from the webhook and from reconcile for the same sub.
// When the sub is genuinely trialing and we know the email, record the trial
// redemption HERE (on conversion), not at checkout creation — so an abandoned
// checkout never burns the customer's one free trial (audit SEC-005 timing).
export async function applySubscription(svc, { userId, customerId, sub, forcePlan = null, forceStatus = null, email = null }) {
  const status = forceStatus || mapStripeStatus(sub?.status);
  const plan = forcePlan || planByPrice(priceIdOf(sub));

  const subRow = {
    user_id: userId,
    status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub?.id || null,
    current_period_end: periodEndOf(sub),
  };
  const planShouldApply = plan && (status === 'active' || status === 'trialing');
  if (planShouldApply || forcePlan) subRow.plan = forcePlan || plan;

  mustWrite(await svc.from('subscriptions').upsert(subRow, { onConflict: 'user_id' }));
  if (planShouldApply || forcePlan) {
    mustWrite(await svc.from('profiles').update({ plan: forcePlan || plan }).eq('id', userId));
  }
  if (status === 'trialing' && email) recordTrialRedemption(svc, email).catch(() => {});
  return { status, plan: forcePlan || plan };
}

// Fulfill (or refund) a per-session tutoring payment from its Stripe Checkout
// Session. Shared by the webhook and reconcile so a slow/missing webhook can't
// leave a paid student with a cancelled slot and no refund (audit REL-001).
//   sessRow         — the tutoring_sessions row
//   checkoutSession — the Stripe Checkout Session (payment_status, payment_intent)
export async function fulfillTutoringCheckout(svc, stripe, sessRow, checkoutSession) {
  if (!sessRow) return { action: 'missing' };
  const paid = checkoutSession?.payment_status === 'paid';
  const paymentIntentId = typeof checkoutSession?.payment_intent === 'string'
    ? checkoutSession.payment_intent
    : checkoutSession?.payment_intent?.id || sessRow.stripe_payment_intent_id || null;

  // Late-payment guard: the hold was already released (slot possibly rebooked).
  // Never resurrect it — refund a real charge instead.
  if (sessRow.status === 'cancelled') {
    if (paid && paymentIntentId && sessRow.refund_status === 'none') {
      await stripe.refunds.create({ payment_intent: paymentIntentId }); // throws → caller 500s → retried
      mustWrite(await svc.from('tutoring_sessions').update({
        refund_status: 'refunded', stripe_payment_intent_id: paymentIntentId,
      }).eq('id', sessRow.id));
      await auditLog(sessRow.student_id, 'tutoring.late_payment_refunded', sessRow.id, { payment_intent: paymentIntentId });
      return { action: 'refunded' };
    }
    return { action: 'already_cancelled' };
  }

  if (paid && !sessRow.paid) {
    mustWrite(await svc.from('tutoring_sessions').update({
      paid: true, status: 'scheduled', stripe_payment_intent_id: paymentIntentId,
    }).eq('id', sessRow.id));
    sendBookingEmails(svc, { ...sessRow, paid: true, stripe_payment_intent_id: paymentIntentId }, { paid: true }).catch(() => {});
    await auditLog(sessRow.student_id, 'tutoring.paid', sessRow.id, { amount_cents: sessRow.amount_cents });
    return { action: 'fulfilled' };
  }
  return { action: paid ? 'already_paid' : 'unpaid' };
}

// Fulfill (or refund) a GROUP SEAT payment from its Stripe Checkout Session.
// Shared by the webhook and reconcile — the same one-truth principle as
// fulfillTutoringCheckout, so /dashboard?dropin=paid can VERIFY instead of
// assume when the webhook is slow or never fires.
export async function fulfillGroupSeatCheckout(svc, stripe, seat, checkoutSession) {
  if (!seat) return { action: 'missing' };
  const paid = checkoutSession?.payment_status === 'paid';
  const pi = typeof checkoutSession?.payment_intent === 'string'
    ? checkoutSession.payment_intent
    : checkoutSession?.payment_intent?.id || seat.stripe_payment_intent_id || null;

  if (!paid) return { action: 'unpaid' };
  if (seat.paid) return { action: 'already_paid' };

  // A seat released before payment landed must never be resurrected — it may
  // already have been resold. Refund instead.
  if (seat.status === 'cancelled') {
    if (pi && seat.refund_status === 'none') {
      await stripe.refunds.create({ payment_intent: pi }); // throws → caller retries
      mustWrite(await svc.from('group_seat')
        .update({ refund_status: 'refunded', stripe_payment_intent_id: pi })
        .eq('id', seat.id));
      await auditLog(seat.student_id, 'group.late_payment_refunded', seat.id, {});
      return { action: 'refunded' };
    }
    return { action: 'already_cancelled' };
  }

  mustWrite(await svc.from('group_seat').update({
    paid: true, status: 'booked', stripe_payment_intent_id: pi,
  }).eq('id', seat.id));
  await auditLog(seat.student_id, 'group.seat_paid', seat.id, {
    amount_cents: seat.amount_cents, session: seat.group_session_id,
  });
  // Confirmation email now that the seat is settled. Best-effort; the seat is
  // paid whether or not the email lands.
  try {
    const { data: room } = await svc.from('group_session')
      .select('id,subject,topic,kind,tutor_id,scheduled_start,scheduled_end,timezone,venue')
      .eq('id', seat.group_session_id).maybeSingle();
    if (room) sendGroupSeatEmails(svc, { seat, room, mode: 'paid' }).catch(() => {});
  } catch { /* best-effort */ }
  return { action: 'fulfilled' };
}

// User-initiated reconciliation: called on the billing/booking return screens so
// state is VERIFIED against Stripe rather than assumed from an optimistic
// redirect. Grants the subscription the user just bought (even if the webhook
// never fired) and fulfills any of their tutoring sessions or group seats that
// Stripe shows paid.
export async function reconcileUserBilling(svc, stripe, { userId, email }) {
  const result = { subscription: null, sessionsFulfilled: 0, seatsFulfilled: 0 };

  // 1) Subscription: find the user's Stripe customer, apply their newest sub.
  const subRow = mustWrite(await svc.from('subscriptions')
    .select('stripe_customer_id').eq('user_id', userId).maybeSingle());
  const customerId = subRow?.stripe_customer_id || null;
  if (customerId) {
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 3 });
      // Prefer an active/trialing sub; else the most recent.
      const live = subs.data.find((s) => ['active', 'trialing'].includes(s.status)) || subs.data[0] || null;
      if (live) {
        const applied = await applySubscription(svc, { userId, customerId, sub: live, email });
        result.subscription = applied;
      }
    } catch (e) {
      console.error('[billing/reconcile] subscription list failed', userId, e?.message);
    }
  }

  // 2) Per-session tutoring: fulfill anything Stripe already charged.
  const pending = mustWrite(await svc.from('tutoring_sessions')
    .select('*').eq('student_id', userId).eq('paid', false)
    .not('stripe_checkout_session_id', 'is', null)
    .in('status', ['pending_payment']).limit(10)) || [];
  for (const sess of pending) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(sess.stripe_checkout_session_id);
      const r = await fulfillTutoringCheckout(svc, stripe, sess, cs);
      if (r.action === 'fulfilled') result.sessionsFulfilled += 1;
    } catch (e) {
      console.error('[billing/reconcile] session fulfill failed', sess.id, e?.message);
    }
  }

  // 3) Group seats the user booked or paid for (their own, or as the booking
  //    parent — booked_by covers on-behalf checkouts).
  const { data: pendingSeats } = await svc.from('group_seat')
    .select('*')
    .or(`student_id.eq.${userId},booked_by.eq.${userId}`)
    .eq('paid', false)
    .not('stripe_checkout_session_id', 'is', null)
    .in('status', ['pending_payment']).limit(10);
  for (const seat of pendingSeats || []) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(seat.stripe_checkout_session_id);
      const r = await fulfillGroupSeatCheckout(svc, stripe, seat, cs);
      if (r.action === 'fulfilled') result.seatsFulfilled += 1;
    } catch (e) {
      console.error('[billing/reconcile] seat fulfill failed', seat.id, e?.message);
    }
  }
  return result;
}
