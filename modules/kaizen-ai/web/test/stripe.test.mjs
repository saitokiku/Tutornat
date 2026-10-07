// Stripe plan wiring — the AI ladder must be purchasable the moment its env
// prices exist, and every sellable plan must reverse-map for webhook events.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PAID_PLANS, PRICE_BY_PLAN } from '@/lib/server/stripe.js';
import { SALE_STATUS } from '@/lib/server/clubPricing.js';

test('AI ladder plans are purchasable and env-mapped', () => {
  assert.ok(PAID_PLANS.includes('seat'));
  assert.ok(PAID_PLANS.includes('ai_solo'));
  assert.ok(PAID_PLANS.includes('ai_hall'));
  // Retired memberships may not be sold; PAID_PLANS is exactly the active set.
  for (const tier of ['club', 'plus', 'max']) assert.ok(!PAID_PLANS.includes(tier), `${tier} is retired from sale`);
  assert.ok('ai_solo' in PRICE_BY_PLAN);
  assert.ok('ai_hall' in PRICE_BY_PLAN);
});

test('every paid plan has a PRICE_BY_PLAN slot (webhooks can always resolve)', () => {
  for (const plan of PAID_PLANS) assert.ok(plan in PRICE_BY_PLAN, `${plan} missing from PRICE_BY_PLAN`);
});

test('PAID_PLANS is exactly the plans clubPricing marks active', () => {
  const active = Object.entries(SALE_STATUS).filter(([, v]) => v === 'active').map(([k]) => k).sort();
  assert.deepEqual([...PAID_PLANS].sort(), active);
});
