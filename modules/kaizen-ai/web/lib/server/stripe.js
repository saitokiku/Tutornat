// Stripe server helper. STRIPE_SECRET_KEY never leaves the server.
// Unconfigured Stripe degrades gracefully: getStripe() returns null and
// billing routes answer 501 with a clear message.

import Stripe from 'stripe';

let cached = null;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!cached) cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  return cached;
}

// Plan ↔ price mapping is env-driven — no hardcoded price ids.
//
// DO NOT create Stripe Prices from the figures in this comment. The only price
// truth is lib/server/clubPricing.js (CLUB_PLANS/AI_PLANS priceCents), pinned by
// test/priceTruth.test.mjs. This comment stated the pre-repricing $39/$69/$99
// and $15/$19 figures until 2026-08-28 — three repricings stale — which is
// exactly the trap docs/archive/LAUNCH_RUNBOOK.md §3 warns about, since Stripe Prices
// are immutable and a wrong one is replaced, not edited.
//
// The club lineup (0022, repriced 2026-08-12): 'club' · 'plus' (the hero) ·
// 'max'. 'plus' has been REUSED across repricings — there were no live
// subscribers when the lineup changed, and the marketing name is literally
// "Plus".
// 'student' ("AI Student") and 'family' ("Study Circle") are retired from sale
// (their Stripe Products were archived 2026-08-28) but stay mapped so
// planByPrice still resolves stray Stripe events on old price ids — an existing
// subscription must never resolve to plan = null.
export const PRICE_BY_PLAN = {
  // The standing seat (STRATEGY §5.1) — the one recurring Local product.
  seat: process.env.STRIPE_PRICE_SEAT || null,
  // Retired from sale 2026-09-02 (clubPricing.SALE_STATUS); kept so planByPrice
  // resolves any event on their live Price ids.
  club: process.env.STRIPE_PRICE_CLUB || null,
  plus: process.env.STRIPE_PRICE_PLUS || null,
  max: process.env.STRIPE_PRICE_MAX || null,
  // AI ladder — amounts live in clubPricing.AI_PLANS, never here.
  ai_solo: process.env.STRIPE_PRICE_AI_SOLO || null,
  ai_hall: process.env.STRIPE_PRICE_AI_HALL || null,
  student: process.env.STRIPE_PRICE_STUDENT || null,
  family: process.env.STRIPE_PRICE_FAMILY || null,
};

// One-time SKUs. NOT plans: nothing recurs, nothing is metered, and
// planByPrice must never resolve one of these to a subscription plan — which
// is why they live in their own map. The amount is clubPricing.DIAGNOSTIC.
export const ONE_TIME_PRICES = {
  diagnostic: process.env.STRIPE_PRICE_DIAGNOSTIC || null,
};

export function planByPrice(priceId) {
  if (!priceId) return null;
  for (const [plan, price] of Object.entries(PRICE_BY_PLAN)) {
    if (price && price === priceId) return plan;
  }
  return null;
}

// Plans checkout will start a subscription for. Retired plans are NOT here —
// SALE_STATUS in clubPricing is the sale truth and this list must agree with it
// (test/stripe.test.mjs pins that).
export const PAID_PLANS = ['seat', 'ai_solo', 'ai_hall'];

// Base URL for redirect targets. APP_URL env wins.
//
// The request Origin/Host headers are attacker-controlled, and this value ends
// up in Stripe `success_url` / `cancel_url` / billing-portal `return_url`. With
// APP_URL unset, `Origin: https://evil.tld` sent a real paying customer to an
// attacker's page immediately after a genuine charge — a high-conversion
// credential-harvest window. So header fallback is now allowed ONLY for
// localhost during development, never in production.
export function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    // Fail loudly rather than mint a redirect to whatever the caller asked for.
    throw new Error('APP_URL is not set — refusing to derive payment redirect URLs from request headers.');
  }

  try {
    const host = req.headers.get('host') || '';
    if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  } catch { /* fall through */ }
  return 'http://localhost:3000';
}

// Map Stripe subscription status → our subscriptions.status enum
export function mapStripeStatus(s) {
  if (s === 'active') return 'active';
  if (s === 'trialing') return 'trialing';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  return 'cancelled'; // canceled | incomplete | incomplete_expired | paused
}
