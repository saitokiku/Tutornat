/**
 * Stripe webhook handling (billing-23, billing-24). Signature verification
 * happens in the route (`constructEvent`); this module receives a verified
 * `Stripe.Event`, records its id in `stripe_events` for idempotency, and
 * mirrors the subscription lifecycle into the `subscriptions` row of the
 * account it resolves from the stored customer id or the checkout session's
 * `client_reference_id` (both written by us before Checkout started), never
 * from a free body field.
 *
 * Transitions: checkout.session.completed → active with a fresh pool;
 * customer.subscription.updated → mirror status and period;
 * customer.subscription.deleted → canceled; invoice.paid for a billing cycle →
 * new period, `used_minutes` back to 0; invoice.payment_failed → past_due.
 */
import type Stripe from 'stripe';

import { PLAN } from '@/kaizen.config';
import { createLogger } from '@/lib/logger';
import type { SubscriptionStatus } from '@/lib/tutor/contracts';
import type { Queryable, TutorDb } from '@/lib/tutor/db';

const log = createLogger('tutor-billing-webhook');

export type WebhookOutcome =
  | { handled: true; accountId: string; status: SubscriptionStatus }
  | { handled: false; reason: 'duplicate' | 'unknown_customer' | 'ignored_type' | 'mismatch' };

interface AccountRow extends Record<string, unknown> {
  account_id: string;
  status: SubscriptionStatus;
}

function customerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function subscriptionId(value: string | Stripe.Subscription | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function isoFromEpoch(seconds: number | null | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

/** Stripe 22: the period lives on the subscription item, not the subscription. */
export function subscriptionPeriod(subscription: Stripe.Subscription): {
  start: string | null;
  end: string | null;
} {
  const item = subscription.items?.data?.[0];
  return {
    start: isoFromEpoch(item?.current_period_start),
    end: isoFromEpoch(item?.current_period_end),
  };
}

/** Maps Stripe's open status set onto ours; an unknown value leaves the row as it is. */
export function mapSubscriptionStatus(status: string): SubscriptionStatus | null {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled';
    default:
      return null;
  }
}

async function accountForCustomer(db: Queryable, customer: string | null): Promise<string | null> {
  if (!customer) return null;
  const { rows } = await db.query<AccountRow>(
    `SELECT account_id, status FROM subscriptions WHERE stripe_customer_id = $1`,
    [customer],
  );
  return rows[0]?.account_id ?? null;
}

/**
 * Records the event id. Returns false when the id was seen before, which
 * makes redelivery a no-op (Stripe retries until it gets a 2xx).
 */
export async function recordStripeEvent(db: Queryable, event: Stripe.Event): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO stripe_events (id, type, received_at) VALUES ($1, $2, now())
     ON CONFLICT (id) DO NOTHING RETURNING id`,
    [event.id, event.type],
  );
  return rows.length > 0;
}

function outcomeFrom(rows: AccountRow[]): WebhookOutcome {
  const row = rows[0];
  if (!row) return { handled: false, reason: 'unknown_customer' };
  return { handled: true, accountId: row.account_id, status: row.status };
}

async function activateFromCheckout(
  db: Queryable,
  session: Stripe.Checkout.Session,
): Promise<WebhookOutcome> {
  const customer = customerId(session.customer);
  const stored = await accountForCustomer(db, customer);
  const referenced = session.client_reference_id;
  if (stored && referenced && stored !== referenced) {
    log.warn(`checkout account mismatch for customer ${customer ?? 'none'}`);
    return { handled: false, reason: 'mismatch' };
  }
  const accountId = stored ?? referenced;
  if (!accountId) return { handled: false, reason: 'unknown_customer' };
  const { rows } = await db.query<AccountRow>(
    `UPDATE subscriptions
       SET status = 'active',
           stripe_customer_id = COALESCE(stripe_customer_id, $2),
           stripe_subscription_id = COALESCE($3, stripe_subscription_id),
           pooled_minutes = $4,
           used_minutes = 0,
           current_period_start = now(),
           current_period_end = now() + interval '1 month',
           updated_at = now()
     WHERE account_id = $1
     RETURNING account_id, status`,
    [accountId, customer, subscriptionId(session.subscription), PLAN.pooledMinutesMonthly],
  );
  return outcomeFrom(rows);
}

async function mirrorSubscription(
  db: Queryable,
  subscription: Stripe.Subscription,
  forced?: SubscriptionStatus,
): Promise<WebhookOutcome> {
  const accountId = await accountForCustomer(db, customerId(subscription.customer));
  if (!accountId) return { handled: false, reason: 'unknown_customer' };
  const status = forced ?? mapSubscriptionStatus(subscription.status);
  const period = subscriptionPeriod(subscription);
  const { rows } = await db.query<AccountRow>(
    `UPDATE subscriptions
       SET status = COALESCE($2, status),
           stripe_subscription_id = COALESCE($3, stripe_subscription_id),
           current_period_start = COALESCE($4::timestamptz, current_period_start),
           current_period_end = COALESCE($5::timestamptz, current_period_end),
           pooled_minutes = CASE WHEN pooled_minutes = 0 THEN $6 ELSE pooled_minutes END,
           updated_at = now()
     WHERE account_id = $1
     RETURNING account_id, status`,
    [accountId, status, subscription.id, period.start, period.end, PLAN.pooledMinutesMonthly],
  );
  return outcomeFrom(rows);
}

async function invoicePaid(db: Queryable, invoice: Stripe.Invoice): Promise<WebhookOutcome> {
  const accountId = await accountForCustomer(db, customerId(invoice.customer));
  if (!accountId) return { handled: false, reason: 'unknown_customer' };
  const reason = invoice.billing_reason ?? '';
  // Only a billing cycle opens a new period; an update or one-off invoice does
  // not hand out another pool of minutes.
  const newPeriod = reason === 'subscription_cycle' || reason === 'subscription_create';
  const subscription = subscriptionId(invoice.parent?.subscription_details?.subscription ?? null);
  const { rows } = await db.query<AccountRow>(
    `UPDATE subscriptions
       SET status = 'active',
           stripe_subscription_id = COALESCE($2, stripe_subscription_id),
           pooled_minutes = $3,
           used_minutes = CASE WHEN $4::boolean THEN 0 ELSE used_minutes END,
           current_period_start = CASE WHEN $4::boolean THEN $5::timestamptz ELSE current_period_start END,
           current_period_end = CASE WHEN $4::boolean THEN $6::timestamptz ELSE current_period_end END,
           updated_at = now()
     WHERE account_id = $1
     RETURNING account_id, status`,
    [
      accountId,
      subscription,
      PLAN.pooledMinutesMonthly,
      newPeriod,
      isoFromEpoch(invoice.period_start) ?? new Date().toISOString(),
      isoFromEpoch(invoice.period_end) ?? new Date(Date.now() + 31 * 86_400_000).toISOString(),
    ],
  );
  return outcomeFrom(rows);
}

async function invoiceFailed(db: Queryable, invoice: Stripe.Invoice): Promise<WebhookOutcome> {
  const accountId = await accountForCustomer(db, customerId(invoice.customer));
  if (!accountId) return { handled: false, reason: 'unknown_customer' };
  const { rows } = await db.query<AccountRow>(
    `UPDATE subscriptions
       SET status = CASE WHEN status = 'canceled' THEN status ELSE 'past_due' END,
           updated_at = now()
     WHERE account_id = $1
     RETURNING account_id, status`,
    [accountId],
  );
  return outcomeFrom(rows);
}

/** Applies one verified event. Does not check idempotency; see `processStripeEvent`. */
export async function handleStripeEvent(
  db: Queryable,
  event: Stripe.Event,
): Promise<WebhookOutcome> {
  switch (event.type) {
    case 'checkout.session.completed':
      return activateFromCheckout(db, event.data.object);
    case 'customer.subscription.updated':
      return mirrorSubscription(db, event.data.object);
    case 'customer.subscription.deleted':
      return mirrorSubscription(db, event.data.object, 'canceled');
    case 'invoice.paid':
      return invoicePaid(db, event.data.object);
    case 'invoice.payment_failed':
      return invoiceFailed(db, event.data.object);
    default:
      return { handled: false, reason: 'ignored_type' };
  }
}

/**
 * Idempotent entry point for the route: the event id and the state change
 * commit together, so a handler failure leaves the id unrecorded and Stripe's
 * retry gets a second chance.
 */
export async function processStripeEvent(
  db: TutorDb,
  event: Stripe.Event,
): Promise<WebhookOutcome> {
  return db.withTransaction(async (tx) => {
    const fresh = await recordStripeEvent(tx, event);
    if (!fresh) return { handled: false, reason: 'duplicate' };
    const outcome = await handleStripeEvent(tx, event);
    log.info(
      `stripe ${event.type} ${event.id}: ${
        outcome.handled ? `account ${outcome.accountId} -> ${outcome.status}` : outcome.reason
      }`,
    );
    return outcome;
  });
}
