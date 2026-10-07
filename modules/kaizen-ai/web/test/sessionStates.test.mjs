import test from 'node:test';
import assert from 'node:assert/strict';
import { TRANSITIONS, canTransition, refundEligible, earningsSplit } from '@/lib/server/sessionStates.js';

const HOUR = 3600000;
const now = Date.parse('2026-07-22T12:00:00Z');
const startIn = (hours) => new Date(now + hours * HOUR).toISOString();

test('the lifecycle graph is exactly the documented one', () => {
  assert.deepEqual(Object.keys(TRANSITIONS).sort(), [
    'cancelled', 'completed', 'in_progress', 'no_show', 'pending_payment', 'scheduled',
  ]);
  assert.ok(canTransition('pending_payment', 'scheduled'));
  assert.ok(canTransition('pending_payment', 'cancelled'));
  assert.ok(canTransition('scheduled', 'in_progress'));
  assert.ok(canTransition('scheduled', 'no_show'));
  assert.ok(canTransition('in_progress', 'completed'));
});

test('terminal states allow no transitions and bad states never pass', () => {
  for (const s of ['completed', 'cancelled', 'no_show']) {
    for (const to of Object.keys(TRANSITIONS)) assert.equal(canTransition(s, to), false);
  }
  assert.equal(canTransition('pending_payment', 'completed'), false); // no skipping payment
  assert.equal(canTransition('completed', 'scheduled'), false);       // no resurrection
  assert.equal(canTransition('nonsense', 'scheduled'), false);
  assert.equal(canTransition(undefined, 'scheduled'), false);
});

test('refunds: tutor-cancel always refunds an upcoming session', () => {
  assert.ok(refundEligible({ status: 'scheduled', scheduledStart: startIn(1), byTutor: true, now }));
  assert.ok(refundEligible({ status: 'in_progress', scheduledStart: startIn(-1), byTutor: true, now }));
});

test('refunds: student-cancel needs ≥24h notice', () => {
  assert.ok(refundEligible({ status: 'scheduled', scheduledStart: startIn(25), byTutor: false, now }));
  assert.ok(refundEligible({ status: 'scheduled', scheduledStart: startIn(24), byTutor: false, now }));
  assert.equal(refundEligible({ status: 'scheduled', scheduledStart: startIn(23.9), byTutor: false, now }), false);
  assert.equal(refundEligible({ status: 'scheduled', scheduledStart: startIn(-1), byTutor: false, now }), false);
});

test('refunds: never for sessions that already resolved', () => {
  for (const status of ['completed', 'no_show', 'cancelled', 'pending_payment']) {
    assert.equal(refundEligible({ status, scheduledStart: startIn(100), byTutor: true, now }), false);
  }
});

test('earningsSplit gives tutors 89% and the parts always sum to gross', () => {
  assert.deepEqual(earningsSplit(10000), { gross: 10000, tutorCut: 8900, fee: 1100 });
  const odd = earningsSplit(9999);
  assert.equal(odd.tutorCut + odd.fee, odd.gross);   // rounding never creates or loses a cent
  assert.equal(odd.tutorCut, 8899);
});

test('earningsSplit: free intro sessions accrue nothing; junk amounts clamp to zero', () => {
  assert.deepEqual(earningsSplit(10000, true), { gross: 0, tutorCut: 0, fee: 0 });
  assert.deepEqual(earningsSplit(-500), { gross: 0, tutorCut: 0, fee: 0 });
  assert.deepEqual(earningsSplit(undefined), { gross: 0, tutorCut: 0, fee: 0 });
});
