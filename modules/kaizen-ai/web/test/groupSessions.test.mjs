// Group rooms under the club model: refund policy, the race-free claim, the
// safety gates, and the legacy-economics reconstruction guarantee.
//
// The pre-club revenue-share economics (groupEarnings & friends) are KEPT and
// pinned as the historical-reconstruction spec: a payout dispute about an old
// room is settled from its stored tutor_share, so those functions must keep
// producing exactly the numbers they produced when the rooms ran. NEW rooms
// are flat_hourly and their spec lives in clubPricing.test.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  groupEarnings, groupViable, groupRefundEligible, GROUP_DEFAULTS,
} from '@/lib/server/sessionStates.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

// ── Legacy economics: reconstruction, not pricing ────────────────────────────

test('HISTORICAL: the revenue split reconstructs from a stored share, not a live constant', () => {
  // Old rooms carry tutor_share on the row; completeGroupSessions still uses
  // it for pay_model='revenue_share' rows. These exact numbers are what those
  // tutors were told they earned.
  assert.equal(groupEarnings(1500, 4, 0.75).tutorCut, 4500);
  assert.equal(groupEarnings(1500, 4, 0.80).tutorCut, 4800);
  assert.equal(groupEarnings(1500, 4, 0.70).tutorCut, 4200);
  const g = groupEarnings(1500, 3, 0.75);
  assert.equal(g.tutorCut + g.fee, g.gross, 'the split must always sum to gross');
});

test('HISTORICAL: unpaid seats earn nobody anything, junk input clamps', () => {
  const g = groupEarnings(1500, 0);
  assert.equal(g.gross, 0);
  assert.equal(g.tutorCut, 0);
  assert.equal(groupEarnings(-500, -3).tutorCut, 0);
});

test('min-fill viability math is unchanged for clinics', () => {
  assert.equal(groupViable(0), false);
  assert.equal(groupViable(1), false);
  assert.equal(groupViable(2), true);
  assert.equal(GROUP_DEFAULTS.minSeats, 2);
});

// ── Refunds ──────────────────────────────────────────────────────────────────

test('a platform cancellation always refunds, whatever the notice', () => {
  const inTenMinutes = new Date(Date.now() + 10 * 60000).toISOString();
  assert.equal(groupRefundEligible({ status: 'booked', scheduledStart: inTenMinutes, byPlatform: true }), true);
});

test('group cancellation is stricter than 1:1, because a late drop can cancel the room', () => {
  const now = Date.now();
  const in24h = new Date(now + 24 * 3600e3).toISOString();
  const in6h = new Date(now + 6 * 3600e3).toISOString();

  assert.equal(groupRefundEligible({ status: 'booked', scheduledStart: in24h, now }), true);
  assert.equal(groupRefundEligible({ status: 'booked', scheduledStart: in6h, now }), false,
    'under 12h a drop can push the room below minimum for the other students');
  // A session that already happened is never refundable here.
  assert.equal(groupRefundEligible({ status: 'attended', scheduledStart: in24h, now }), false);
  assert.equal(groupRefundEligible({ status: 'cancelled', scheduledStart: in24h, now }), false);
});

// ── Safety gates: identical to 1:1, checked at the source ────────────────────

test('the vetting gate is re-checked at booking, not trusted from the browse list', () => {
  const route = src('app/api/tutoring/group/route.js');
  const claim = route.slice(route.indexOf('async function claimSeat'), route.indexOf('async function hostRoom'));
  assert.ok(/vetting_status !== 'cleared'/.test(claim),
    'a group room puts a minor with an adult AND other minors — the gate cannot be advisory');
  assert.ok(/status !== 'active'/.test(claim));
});

test('a minor cannot join a group room without guardian approval (parent booking counts)', () => {
  const route = src('app/api/tutoring/group/route.js');
  assert.ok(/guardianGateSatisfied\(/.test(route),
    'the shared gate helper must decide — self-booking minors need account consent; a managing parent booking IS consent');
  assert.ok(/guardian_consent_required/.test(route));
});

test('the group video room admits only settled seats, and re-vets the tutor at join time', () => {
  const room = src('app/api/tutoring/group/room/route.js');
  assert.ok(/\.in\('status', \['booked', 'attended'\]\)/.test(room),
    'a pending_payment hold must not admit — abandoning checkout must not yield a live session');
  assert.ok(/!seat\.paid/.test(room), 'unsettled seats are refused with 402');
  assert.ok(/vetting_status !== 'cleared'/.test(room), 'the join-time re-vetting gate is the one that protects sessions already on the calendar');
  assert.ok(/tutor_on_hold/.test(room));
  assert.ok(/capacity \|\| 8\) \+ 1/.test(room), 'the Daily room is sized to capacity + the tutor');
});

test('only a cleared, active tutor can host a room', () => {
  const route = src('app/api/tutoring/group/route.js');
  const host = route.slice(route.indexOf('async function hostRoom'));
  assert.ok(/vetting_status !== 'cleared'/.test(host));
});

test('seat claiming is race-free — two students cannot take the last seat', () => {
  const sql = fs.readFileSync(path.join(webRoot, '..', 'supabase/migrations/0017_group_sessions.sql'), 'utf8');
  const fn = sql.slice(sql.indexOf('function claim_group_seat'), sql.indexOf('resolve_group_fill'));
  assert.ok(/for update/i.test(fn), 'the room row must be locked before counting seats');
  assert.ok(/v_taken >= v_cap/.test(fn), 'and capacity checked inside that lock');
  assert.ok(/on conflict .*do nothing/i.test(fn), 'double-booking one student must be impossible');
});

test('a late payment against a released seat refunds instead of resurrecting it', () => {
  // The logic moved to the shared fulfiller so the webhook and reconcile can
  // never diverge — the guarantee is pinned where it now lives.
  const billing = src('lib/server/billing.js');
  const fn = billing.slice(billing.indexOf('function fulfillGroupSeatCheckout'), billing.indexOf('reconcileUserBilling'));
  assert.ok(/status === 'cancelled'/.test(fn) && /refunds\.create/.test(fn),
    'the seat may already have been resold');
  const hook = src('app/api/billing/webhook/route.js');
  assert.ok(/fulfillGroupSeatCheckout/.test(hook), 'the webhook must use the shared fulfiller');
});

// ── Min-fill exemption is structural ─────────────────────────────────────────

test('hall/community rooms are exempt from min-fill via cutoff_at NULL', () => {
  // 0020's sweep predicate only touches rooms with a cutoff; the series
  // materializer only sets one for clinics with a real minimum.
  const sql = fs.readFileSync(path.join(webRoot, '..', 'supabase/migrations/0020_fill_counts_paid_seats.sql'), 'utf8');
  assert.ok(/cutoff_at is not null/i.test(sql), 'the RPC must skip rooms with no cutoff');
  const series = src('lib/server/series.js');
  assert.ok(/kind !== 'clinic'\) return null/.test(series), 'hall/community series must materialize with cutoff_at NULL');
});
