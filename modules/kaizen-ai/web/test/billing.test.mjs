import test from 'node:test';
import assert from 'node:assert/strict';
import { periodEndOf, priceIdOf } from '@/lib/server/billing.js';

test('periodEndOf reads current_period_end from either the sub or its first item', () => {
  const unix = 1893456000; // 2030-01-01T00:00:00Z
  assert.equal(periodEndOf({ current_period_end: unix }), new Date(unix * 1000).toISOString());
  // newer Stripe API versions moved it onto the item
  assert.equal(periodEndOf({ items: { data: [{ current_period_end: unix }] } }), new Date(unix * 1000).toISOString());
  assert.equal(periodEndOf({}), null);
  assert.equal(periodEndOf(null), null);
});

test('priceIdOf reads the first line item price id', () => {
  assert.equal(priceIdOf({ items: { data: [{ price: { id: 'price_123' } }] } }), 'price_123');
  assert.equal(priceIdOf({ items: { data: [] } }), null);
  assert.equal(priceIdOf({}), null);
  assert.equal(priceIdOf(null), null);
});
