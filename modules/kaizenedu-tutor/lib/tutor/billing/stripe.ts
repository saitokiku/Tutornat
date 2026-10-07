/**
 * Stripe client factory (billing-23). The client exists only when
 * STRIPE_SECRET_KEY is set; every caller treats `null` as the D19
 * "not configured" state and answers it explicitly instead of crashing.
 * Keys are read server-side only (invariant e).
 */
import Stripe from 'stripe';

export interface StripeConfig {
  secretKey: string | null;
  webhookSecret: string | null;
  priceMonthly: string | null;
}

export function stripeConfig(env: NodeJS.ProcessEnv = process.env): StripeConfig {
  const read = (name: string): string | null => {
    const value = env[name]?.trim();
    return value ? value : null;
  };
  return {
    secretKey: read('STRIPE_SECRET_KEY'),
    webhookSecret: read('STRIPE_WEBHOOK_SECRET'),
    priceMonthly: read('STRIPE_PRICE_MONTHLY'),
  };
}

/** All three variables present: Checkout, Portal, and the webhook can run. */
export function isStripeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const config = stripeConfig(env);
  return Boolean(config.secretKey && config.webhookSecret && config.priceMonthly);
}

const STATE_KEY = Symbol.for('natural-tutor.stripe');
interface StripeState {
  client?: Stripe;
  key?: string;
}
const state = ((globalThis as Record<symbol, unknown>)[STATE_KEY] ??= {}) as StripeState;

/** One client per process; null when STRIPE_SECRET_KEY is absent. */
export function getStripe(): Stripe | null {
  const { secretKey } = stripeConfig();
  if (!secretKey) return null;
  if (state.client && state.key === secretKey) return state.client;
  state.key = secretKey;
  state.client = new Stripe(secretKey, { typescript: true, maxNetworkRetries: 2 });
  return state.client;
}
