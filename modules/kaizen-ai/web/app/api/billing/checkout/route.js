// POST /api/billing/checkout — create a Stripe Checkout session for a paid
// plan. Ensures a Stripe Customer exists (stored on subscriptions), returns
// {url} to redirect to. 501 when Stripe isn't configured.
//
// Selling memberships is gated on app_settings.club_enabled, exactly like
// booking is. Everything in the club lineup — and ai_hall, which bundles one
// real Homework Hall visit — promises live tutoring time we cannot deliver
// while the club is legally held, and the launch runbook has the operator
// create Stripe Prices BEFORE flipping the switch. Without this gate that
// window sells visits nobody can book (audit 2026-08-18, H10).

import { getCaller, serviceClient, auditLog, getSettings } from '@/lib/server/context';
import { getStripe, PRICE_BY_PLAN, PAID_PLANS, planByPrice, appUrl } from '@/lib/server/stripe';
import { trialAvailable } from '@/lib/server/trial';

export const runtime = 'nodejs';

// Plans that promise real tutoring time, so they cannot be sold before the
// club opens. ai_solo is deliberately absent.
// Anything that promises human tutoring time is club-gated. The seat is the
// club's product; memberships are retired from sale and no longer in PAID_PLANS.
const CLUB_GATED_PLANS = ['seat', 'ai_hall'];

// ── Mid-month plan switches ──────────────────────────────────────────────────
// Club allowances are CALENDAR-MONTH counters, not subscription-period ones
// (lib/server/clubBilling.js): remaining = monthly_limit(plan) − ledger usage
// since the 1st. The plan side of that subtraction jumps to the new tier the
// instant we write profiles.plan; the month keeps running regardless. So an
// in-place upgrade on the 28th handed over a WHOLE month of the higher tier's
// included Hall visits — real tutor-hours — in exchange for four days of
// prorated money (audit 2026-08-18, "in-place plan switches use
// create_prorations").
//
// The debit these helpers write is the missing half of Stripe's proration.
// Stripe charges for the days REMAINING; the ledger therefore grants the
// INCREMENTAL visits for the days remaining too. club (4 Hall visits) → max
// (12) at the halfway mark writes a ledger row of +4, so the member's month
// totals 12 − 4 = 8: half a month of Club plus half a month of Max, which is
// what they paid. Switch on the 1st and the fraction is 0 — nothing is debited
// and the full new allowance lands, as it should.
//
// A DOWNGRADE RELEASES THE DEBIT INSTEAD OF EARNING A CREDIT. The mirror-image
// credit would MINT visits (Max → Club on the 28th putting an 11-visit credit
// on top of Club's 4), so a downgrade never grants anything. But leaving the
// earlier debit standing is just as wrong in the other direction: club → max on
// the 10th debits 2 against Max's 12, and max → club on the 20th used to leave
// that 2 biting Club's 4 — deleting visits the member is paying for right now.
// The debit was a discount against an increment that no longer exists, so when
// the member lands on a plan at or below the one the debit was written against,
// the outstanding proration is released back. What they actually spent stays
// spent: consumption rows are untouched, so the month still nets out at the new
// plan's limit minus real usage, never more.
//
// INVARIANT, enforced in planSwitchLedger below: proration rows alone can never
// leave a member with fewer visits than the plan they are standing on grants.
const CLUB_FEATURES = ['club_hall_included', 'club_private_credit'];

// Every row this file writes carries a kind under this prefix — debits,
// releases, and the reversals of either. Summing the prefix gives the net
// proration currently biting the member's allowance, so the arithmetic stays
// correct no matter how many times the plan moved this month.
const PRORATION_KIND = 'plan_switch_proration';
const isProrationRow = (r) => String(r?.metadata?.kind || '').startsWith(PRORATION_KIND);

// How much of the calendar month is already spent. The 1st is 0.0 (a switch on
// the 1st buys the whole month); the last day of a 31-day month is 30/31.
function elapsedMonthFraction(now = new Date()) {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (now.getDate() - 1) / daysInMonth;
}

/**
 * PURE. Given both plans' limits for one feature, the proration already
 * outstanding this month, and how much of the month is gone, decide the ledger
 * adjustment: > 0 debits, < 0 releases, 0 writes nothing.
 *
 * @param {{before: number|null, after: number|null, outstanding: number, fraction: number}} input
 */
function planSwitchLedger({ before, after, outstanding, fraction }) {
  // Unlimited on either side (internal): no finite delta to prorate, and
  // nothing an outstanding debit could sensibly bite, so let it go.
  if (before == null || after == null) return -outstanding;

  // Rounded, not floored: floor would systematically round in the member's
  // favour, which is the direction of the leak this closes. The residual is at
  // most one visit either way. Only an UPGRADE adds; a downgrade adds nothing.
  const debit = after > before ? Math.max(0, Math.round((after - before) * fraction)) : 0;

  // Where the net proration should stand once this switch is done. A DOWNGRADE
  // leaves no increment for the old debit to sit against, so it goes to zero.
  // An upgrade — or a sideways move onto the same limit, where the increment is
  // still in force — carries the outstanding debit forward and adds its own,
  // capped at the new plan's whole grant so proration can never drive an
  // allowance negative. Either way the member keeps at least what the plan they
  // are standing on entitles them to, minus what they actually spent.
  const target = after >= before
    ? Math.max(0, Math.min(outstanding + debit, after))
    : 0;
  return target - outstanding;
}

/**
 * Reconcile the ledger with a mid-month plan switch, and return the rows
 * written plus an `undo()` that appends their exact negatives — so the caller
 * can write this BEFORE touching Stripe and reverse it if the switch does not
 * go through.
 *
 * Throws if the adjustment cannot be written — a switch that cannot be metered
 * must not happen, exactly as consumeAllowance fails a booking it cannot record.
 */
async function meterPlanSwitch(svc, { userId, fromPlan, toPlan }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: ents, error }, { data: ledger, error: ledgerErr }] = await Promise.all([
    svc.from('plan_entitlements')
      .select('plan,feature,monthly_limit')
      .in('plan', [fromPlan, toPlan])
      .in('feature', CLUB_FEATURES),
    // Only this month's rows matter: allowances are calendar-month counters, so
    // a debit written in July stopped biting on the 1st of August.
    svc.from('usage_ledger')
      .select('feature,quantity,metadata')
      .eq('user_id', userId)
      .in('feature', CLUB_FEATURES)
      .gte('created_at', monthStart.toISOString()),
  ]);
  if (error) throw new Error(error.message);
  if (ledgerErr) throw new Error(ledgerErr.message);

  // Same reading as clubAllowances: no row means 0, null means unlimited.
  const limitOf = (planKey, feature) => {
    const row = (ents || []).find((e) => e.plan === planKey && e.feature === feature);
    return row ? row.monthly_limit : 0;
  };
  const outstandingOf = (feature) => (ledger || [])
    .filter((r) => r.feature === feature && isProrationRow(r))
    .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

  const fraction = elapsedMonthFraction();
  const rows = [];
  for (const feature of CLUB_FEATURES) {
    const outstanding = outstandingOf(feature);
    const adjust = planSwitchLedger({
      before: limitOf(fromPlan, feature),
      after: limitOf(toPlan, feature),
      outstanding,
      fraction,
    });
    if (adjust !== 0) {
      rows.push({
        user_id: userId,
        feature,
        quantity: adjust,
        est_cost_usd: 0,
        metadata: {
          kind: adjust > 0 ? PRORATION_KIND : `${PRORATION_KIND}_release`,
          from: fromPlan,
          to: toPlan,
          elapsed_fraction: Number(fraction.toFixed(4)),
          outstanding_before: outstanding,
        },
      });
    }
  }

  if (rows.length) {
    const { error: insErr } = await svc.from('usage_ledger').insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  return {
    rows,
    async undo() {
      if (!rows.length) return;
      // The reversal keeps the same kind PREFIX, so the next switch's
      // outstanding sum nets a reversed pair back to zero on its own.
      const { error: undoErr } = await svc.from('usage_ledger').insert(
        rows.map((r) => ({ ...r, quantity: -r.quantity, metadata: { ...r.metadata, kind: `${r.metadata.kind}_reversed` } })),
      );
      // A failed reversal leaves the member short of visits they are entitled
      // to — support-fixable, and the safe direction to fail. Never silent.
      if (undoErr) console.error('[billing/checkout] proration meter reversal failed', userId, undoErr.message);
    },
  };
}

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

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const plan = String(body?.plan || '');
  if (!PAID_PLANS.includes(plan)) {
    return Response.json({ error: 'Pick a plan (seat, ai_solo, or ai_hall).' }, { status: 400 });
  }
  // Fails CLOSED, same law as the booking routes: the switch must be
  // explicitly true, so an unreadable or unseeded app_settings holds the sale.
  // ai_solo is pure software — it is NOT club-gated and stays purchasable.
  if (CLUB_GATED_PLANS.includes(plan)) {
    const settings = await getSettings();
    if (settings.club_enabled !== true) {
      return Response.json(
        { error: "That plan isn\u2019t open yet \u2014 the club hasn\u2019t opened for booking.", code: 'notYetOpen' },
        { status: 503 },
      );
    }
  }

  const price = PRICE_BY_PLAN[plan];
  if (!price) {
    return Response.json({ error: `The ${plan} plan isn't configured for billing yet.` }, { status: 501 });
  }

  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Database not configured.' }, { status: 501 });

  try {
    // Ensure a Stripe Customer, persisted on subscriptions
    const { data: sub, error: subErr } = await svc.from('subscriptions')
      .select('stripe_customer_id,stripe_subscription_id,status,plan')
      .eq('user_id', caller.user.id).maybeSingle();
    if (subErr) throw new Error(subErr.message);
    let customerId = sub?.stripe_customer_id || null;

    // Already on a live subscription? A second Checkout would DOUBLE-BILL.
    // Different paid plan → switch in place with proration; anything else
    // (same plan, or a payment problem) → Billing Portal.
    if (customerId && sub?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(sub.status)) {
      let live = null;
      try { live = await stripe.subscriptions.retrieve(sub.stripe_subscription_id); } catch { /* gone in Stripe — fall through to fresh checkout */ }
      if (live && ['active', 'trialing'].includes(live.status)) {
        const item = live.items?.data?.[0];
        if (item && item.price?.id !== price) {
          // In-app plan switch. Two things have to be true before the member is
          // standing on the new plan, and they are the same fraction of the
          // month (see meterPlanSwitch above):
          //
          //   INVENTORY — the incremental included visits are metered down to
          //   the days remaining, written BEFORE the Stripe call so a switch
          //   that cannot be metered simply does not happen.
          //
          //   MONEY — 'always_invoice' invoices and collects the proration
          //   during this request instead of parking it as a pending line item.
          //   A pending proration is DISCARDED when a subscription is cancelled
          //   before its period closes, so the old behaviour let someone
          //   upgrade, use the visits, cancel, and pay nothing for either.
          //   'error_if_incomplete' means a card that cannot pay for the
          //   upgrade does not receive the upgrade: Stripe raises rather than
          //   leaving us switched-but-unpaid. On a DOWNGRADE the same setting
          //   issues the credit to the customer balance immediately, which is
          //   strictly better for the member than a pending one.
          const fromPlan = planByPrice(item.price?.id) || sub?.plan || caller.profile?.plan || 'free';
          const meter = await meterPlanSwitch(svc, { userId: caller.user.id, fromPlan, toPlan: plan });
          try {
            await stripe.subscriptions.update(live.id, {
              items: [{ id: item.id, price }],
              proration_behavior: 'always_invoice',
              payment_behavior: 'error_if_incomplete',
            });
          } catch (e) {
            // The switch did not take — give the metered visits back and say
            // why, rather than leaving the member debited for a plan they are
            // not on.
            await meter.undo();
            await auditLog(caller.user.id, 'billing.plan_switch_declined', plan, { from_plan: fromPlan, reason: e?.message || 'stripe error' });
            return Response.json({
              error: 'We couldn\u2019t charge the prorated difference for that switch. Check your card in the billing portal and try again.',
              code: 'switchPaymentFailed',
            }, { status: 402 });
          }
          const { error: swErr } = await svc.from('subscriptions')
            .update({ plan, status: 'active' }).eq('user_id', caller.user.id);
          if (swErr) throw new Error(swErr.message);
          const { error: prErr } = await svc.from('profiles')
            .update({ plan }).eq('id', caller.user.id);
          if (prErr) throw new Error(prErr.message);
          await auditLog(caller.user.id, 'billing.plan_switched', plan, {
            from_plan: fromPlan,
            from_price: item.price?.id,
            to_price: price,
            metered: meter.rows.map((r) => ({ feature: r.feature, debited: r.quantity })),  // negative = proration released
          });
          return Response.json({ switched: true, plan });
        }
      }
      if (live && ['active', 'trialing', 'past_due', 'unpaid'].includes(live.status)) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${appUrl(req)}/billing`,
        });
        await auditLog(caller.user.id, 'billing.plan_change_via_portal', plan, { reason: 'existing live subscription' });
        return Response.json({ url: portal.url, portal: true });
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: caller.user.email || undefined,
        metadata: { kaizen_user_id: caller.user.id },
      });
      customerId = customer.id;
      const { error: upErr } = await svc.from('subscriptions').upsert(
        { user_id: caller.user.id, stripe_customer_id: customerId },
        { onConflict: 'user_id' }
      );
      if (upErr) throw new Error(upErr.message);
    }

    const base = appUrl(req);
    // Club lineup: NO card trial. The free tier — real AI limits plus unlimited
    // free community sessions — IS the trial; memberships are month-to-month
    // and cancel any time, so the honest pitch is "come to a free session,
    // join when the math makes sense", not "hand us a card and remember to
    // cancel". A membership's included group sessions also make a card trial
    // instantly farmable (8 free live-tutor hours per burner card on Plus).
    //
    // The machinery stays: put a plan key back in TRIAL_PLANS to re-enable.
    // One trial per customer is enforced two ways (audit SEC-005): a prior
    // subscription on this account, OR a redemption row keyed to the hashed
    // email — which survives account deletion, so delete-and-resignup can't
    // farm trials.
    const TRIAL_DAYS = 56;              // 8 weeks, if ever re-enabled
    const TRIAL_PLANS = [];             // no card trial on club memberships
    const hadSubBefore = Boolean(sub?.stripe_subscription_id);
    const trialOk = TRIAL_PLANS.includes(plan)
      && !hadSubBefore
      && await trialAvailable(svc, caller.user.email);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      ...(trialOk ? { subscription_data: { trial_period_days: TRIAL_DAYS } } : {}),
      success_url: `${base}/billing?status=success`,
      cancel_url: `${base}/billing`,
      allow_promotion_codes: true,
    });
    // The trial redemption is recorded when the subscription actually converts
    // to 'trialing' (see lib/server/billing.applySubscription), NOT here — an
    // abandoned checkout must never burn the customer's one free trial.

    await auditLog(caller.user.id, 'billing.checkout_started', plan, { price });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[billing/checkout]', err?.message);
    return Response.json({ error: 'Could not start checkout. Try again in a minute.' }, { status: 502 });
  }
}
