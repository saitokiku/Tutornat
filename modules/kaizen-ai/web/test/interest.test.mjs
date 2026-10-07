// Interest capture ("get first pick when booking opens") — pure validation
// contract. The route wraps this with rate limiting + the service-role insert.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInterest, INTEREST_KINDS } from '@/lib/server/interest.js';

test('accepts a plain email, normalizes case and whitespace', () => {
  const r = validateInterest({ email: '  Parent@Example.COM ', kind: 'homework_hall', source: '/schedule' });
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'parent@example.com');
  assert.equal(r.value.kind, 'homework_hall');
  assert.equal(r.value.bot, false);
});

test('rejects malformed emails and oversized input', () => {
  assert.equal(validateInterest({ email: 'nope' }).ok, false);
  assert.equal(validateInterest({ email: 'a b@c.co' }).ok, false);
  assert.equal(validateInterest({ email: 'a@b.co', kind: 'x'.repeat(64) }).ok, false);
  assert.equal(validateInterest({ email: 'a@b.co', kind: 'bad kind!' }).ok, false);
  assert.equal(validateInterest({}).ok, false);
  assert.equal(validateInterest(null).ok, false);
});

test('kind and source are optional, never required', () => {
  const r = validateInterest({ email: 'a@b.co' });
  assert.equal(r.ok, true);
  assert.equal(r.value.kind, null);
  assert.equal(r.value.source, null);
});

test('the kind vocabulary is closed, and it names what the visitor wants', () => {
  // Every kind in the enum is accepted...
  for (const kind of INTEREST_KINDS) {
    assert.equal(validateInterest({ email: 'a@b.co', kind }).ok, true, kind);
  }
  // ...and the seat and the diagnostic are in it, because separating $550
  // intent from $14 intent is the only reason this column exists.
  assert.ok(INTEREST_KINDS.includes('seat'));
  assert.ok(INTEREST_KINDS.includes('diagnostic'));
});

test('anything outside the vocabulary is refused, not stored', () => {
  // These four were all being sent by live surfaces before Wave 2. Two are
  // page names, two are retired or unwired plan keys. A row nobody can
  // classify is worse than a write that fails loudly, because it silently
  // corrupts the funnel's first number.
  for (const kind of ['pricing', 'ai_plans', 'ai_solo', 'ai_hall', 'club', 'plus', 'max', '/tutoring']) {
    assert.equal(validateInterest({ email: 'a@b.co', kind }).ok, false, kind);
  }
});

test('no kind at all stays legal', () => {
  // A capture with no product in mind is a real thing to record. Defaulting it
  // to 'seat' would inflate the one number the enum protects.
  const r = validateInterest({ email: 'a@b.co' });
  assert.equal(r.ok, true);
  assert.equal(r.value.kind, null);
});

test('honeypot: non-empty company field flags the submission', () => {
  const r = validateInterest({ email: 'a@b.co', company: 'totally real' });
  assert.equal(r.ok, true);
  assert.equal(r.value.bot, true);
});
