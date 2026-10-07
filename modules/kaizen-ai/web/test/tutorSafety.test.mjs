// planPull — what happens to live work when a tutor is pulled from the market.
//
// This is the decision half of pullTutorFromMarket, kept pure so it can be
// tested without a database or a Stripe key. The consequences of getting it
// wrong are asymmetric: failing to cancel leaves a minor booked onto a video
// call with an adult Kaizen has just decided it will not stand behind, while
// over-refunding costs money. So the tests below check both directions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPull } from '../lib/server/sessionStates.js';

const NOW = Date.parse('2026-08-01T12:00:00Z');
const future = (h) => new Date(NOW + h * 3600_000).toISOString();
const past = (h) => new Date(NOW - h * 3600_000).toISOString();

const paidSession = (over = {}) => ({
  id: 's1', status: 'scheduled', paid: true, refund_status: 'none',
  stripe_payment_intent_id: 'pi_1', scheduled_start: future(48), ...over,
});

test('a paid future session is cancelled AND refunded', () => {
  const { cancelSessions } = planPull({ sessions: [paidSession()], now: NOW });
  assert.equal(cancelSessions.length, 1);
  assert.equal(cancelSessions[0].refund, true);
  assert.equal(cancelSessions[0].paymentIntent, 'pi_1');
});

test('short notice does NOT reduce the refund — the platform cancelled, not the student', () => {
  // The cancellation window exists to protect a tutor's time from late
  // cancellers. It must never be used to keep a student's money for a session
  // Kaizen itself pulled.
  const { cancelSessions } = planPull({ sessions: [paidSession({ scheduled_start: future(0.5) })], now: NOW });
  assert.equal(cancelSessions[0].refund, true, 'a 30-minute-notice platform cancellation still refunds');
});

test('an unpaid hold is cancelled but not refunded', () => {
  const { cancelSessions } = planPull({
    sessions: [paidSession({ status: 'pending_payment', paid: false, stripe_payment_intent_id: null })], now: NOW,
  });
  assert.equal(cancelSessions.length, 1);
  assert.equal(cancelSessions[0].refund, false, 'refunding a hold that took no money would just log a Stripe error');
});

test('an already-refunded session is not refunded twice', () => {
  const { cancelSessions } = planPull({ sessions: [paidSession({ refund_status: 'refunded' })], now: NOW });
  assert.equal(cancelSessions[0].refund, false);
});

test('completed and cancelled sessions are left alone', () => {
  const { cancelSessions } = planPull({
    sessions: [
      paidSession({ id: 'done', status: 'completed' }),
      paidSession({ id: 'gone', status: 'cancelled' }),
      paidSession({ id: 'noshow', status: 'no_show' }),
    ],
    now: NOW,
  });
  assert.deepEqual(cancelSessions, [], 'past work is not undone by a later rejection');
});

test('a past scheduled session is not touched, but one in progress is', () => {
  const { cancelSessions } = planPull({
    sessions: [
      paidSession({ id: 'old', status: 'scheduled', scheduled_start: past(3) }),
      paidSession({ id: 'live', status: 'in_progress', scheduled_start: past(0.2) }),
    ],
    now: NOW,
  });
  assert.deepEqual(cancelSessions.map((c) => c.id), ['live'],
    'a call happening right now must be stopped; one that already lapsed is a billing question');
});

test('group rooms and their held seats are cancelled together', () => {
  const { cancelRooms, cancelSeats } = planPull({
    rooms: [{ id: 'r1', status: 'open', scheduled_start: future(24) }],
    seats: [
      { id: 'a', group_session_id: 'r1', status: 'booked', paid: true, refund_status: 'none', stripe_payment_intent_id: 'pi_a' },
      { id: 'b', group_session_id: 'r1', status: 'pending_payment', paid: false, refund_status: 'none', stripe_payment_intent_id: null },
      { id: 'c', group_session_id: 'r1', status: 'cancelled', paid: false, refund_status: 'none', stripe_payment_intent_id: null },
    ],
    now: NOW,
  });
  assert.deepEqual(cancelRooms, ['r1']);
  assert.deepEqual(cancelSeats.map((s) => s.id).sort(), ['a', 'b'], 'an already-cancelled seat is not re-cancelled');
  assert.equal(cancelSeats.find((s) => s.id === 'a').refund, true);
  assert.equal(cancelSeats.find((s) => s.id === 'b').refund, false);
});

test('seats belonging to a past room are not disturbed', () => {
  const { cancelRooms, cancelSeats } = planPull({
    rooms: [{ id: 'old', status: 'completed', scheduled_start: past(48) }],
    seats: [{ id: 'z', group_session_id: 'old', status: 'booked', paid: true, refund_status: 'none', stripe_payment_intent_id: 'pi_z' }],
    now: NOW,
  });
  assert.deepEqual(cancelRooms, []);
  assert.deepEqual(cancelSeats, []);
});

test('nothing live means nothing to do', () => {
  const plan = planPull({ now: NOW });
  assert.deepEqual(plan, { cancelSessions: [], cancelRooms: [], cancelSeats: [] });
});
