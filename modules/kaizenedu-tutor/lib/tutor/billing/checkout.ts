/**
 * Checkout and Customer Portal sessions (billing-23, spec R7). One Stripe
 * customer per account, created on first use and stored in
 * `subscriptions.stripe_customer_id`; the webhook later resolves the account
 * from that stored id, never from anything the browser sends.
 */
import type Stripe from 'stripe';

import { PLAN } from '@/kaizen.config';
import type { Queryable } from '@/lib/tutor/db';

import { getSubscription } from './entitlement';

export const BILLING_RETURN_PATH = '/parent/billing';

/**
 * Base URL for Stripe's redirects: APP_URL when the operator set it, else the
 * origin of the request that asked for the session. Shared with the emailed
 * links, which need the same answer.
 */
export { resolveAppUrl } from '@/lib/tutor/app-url';

interface AccountEmailRow extends Record<string, unknown> {
  email: string;
}

/**
 * Returns the account's Stripe customer id, creating the customer when the
 * subscriptions row has none. Stripe receives the account holder's email (an
 * adult; receipts and the Portal sign-in need it) and our account id as
 * metadata. Nothing about a learner goes to Stripe.
 */
export async function ensureStripeCustomer(
  db: Queryable,
  stripe: Stripe,
  accountId: string,
): Promise<string> {
  const subscription = await getSubscription(db, accountId);
  if (subscription.stripe_customer_id) return subscription.stripe_customer_id;
  const { rows } = await db.query<AccountEmailRow>(`SELECT email FROM accounts WHERE id = $1`, [
    accountId,
  ]);
  const email = rows[0]?.email;
  const customer = await stripe.customers.create({
    ...(email ? { email } : {}),
    metadata: { accountId },
  });
  await db.query(
    `UPDATE subscriptions SET stripe_customer_id = $2, updated_at = now()
     WHERE account_id = $1 AND stripe_customer_id IS NULL`,
    [accountId, customer.id],
  );
  // Another request may have won the race; the stored id is the one we honour.
  const again = await getSubscription(db, accountId);
  return again.stripe_customer_id ?? customer.id;
}

export interface CheckoutInput {
  accountId: string;
  priceId: string;
  appUrl: string;
}

/** Hosted Checkout for the one monthly plan; `client_reference_id` is our account id. */
export async function createCheckoutSession(
  db: Queryable,
  stripe: Stripe,
  input: CheckoutInput,
): Promise<string> {
  const customer = await ensureStripeCustomer(db, stripe, input.accountId);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: input.accountId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: `${input.appUrl}${BILLING_RETURN_PATH}?checkout=success`,
    cancel_url: `${input.appUrl}${BILLING_RETURN_PATH}?checkout=cancel`,
    allow_promotion_codes: true,
    metadata: {
      accountId: input.accountId,
      plan: 'monthly',
      profiles: String(PLAN.learnerProfiles),
    },
    subscription_data: { metadata: { accountId: input.accountId } },
  });
  if (!session.url) throw new Error('Stripe returned a Checkout session without a URL');
  return session.url;
}

/** Customer Portal (cancel, card changes, invoices); returns to the billing page. */
export async function createPortalSession(
  db: Queryable,
  stripe: Stripe,
  input: { accountId: string; appUrl: string },
): Promise<string> {
  const customer = await ensureStripeCustomer(db, stripe, input.accountId);
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${input.appUrl}${BILLING_RETURN_PATH}`,
  });
  return session.url;
}
