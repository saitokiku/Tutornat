import test from 'node:test';
import assert from 'node:assert/strict';
import { trialEmailHash } from '@/lib/server/trial.js';

test('trialEmailHash is a deterministic sha256 hex digest', () => {
  const h = trialEmailHash('Student@Example.com');
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, trialEmailHash('Student@Example.com'));
});

test('trialEmailHash normalizes case and surrounding whitespace', () => {
  // Same identity → same hash, so delete-and-resignup with the same email is
  // caught regardless of how they typed it (audit SEC-005 / intro-free guard).
  assert.equal(trialEmailHash('  ADA@school.edu '), trialEmailHash('ada@school.edu'));
  assert.notEqual(trialEmailHash('ada@school.edu'), trialEmailHash('ada2@school.edu'));
});

test('trialEmailHash tolerates empty / nullish input without throwing', () => {
  assert.match(trialEmailHash(''), /^[0-9a-f]{64}$/);
  assert.match(trialEmailHash(null), /^[0-9a-f]{64}$/);
  assert.match(trialEmailHash(undefined), /^[0-9a-f]{64}$/);
});
