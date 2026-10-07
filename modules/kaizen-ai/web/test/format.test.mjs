import test from 'node:test';
import assert from 'node:assert/strict';
import { money, when } from '@/lib/format.js';

test('money renders whole dollars by default and cents on request', () => {
  assert.equal(money(2500), '$25');
  assert.equal(money(2550, { decimals: 2 }), '$25.50');
  assert.equal(money(0), '$0');
  assert.equal(money(null), '$0');
  assert.equal(money(undefined), '$0');
});

test('when never throws on junk input', () => {
  assert.equal(typeof when('not-a-date'), 'string');
  assert.equal(typeof when(null), 'string');
  const s = when('2026-07-22T15:30:00Z');
  assert.ok(s.length > 0);
});
