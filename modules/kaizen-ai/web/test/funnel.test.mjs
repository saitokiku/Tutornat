// The founder's funnel board — its arithmetic, pinned.
//
// The board's whole claim is that no number on it was invented by a browser:
// every figure is computed server-side in app/api/admin/funnel/route.js. That
// claim is only worth anything if the arithmetic is itself checked, so the
// route exports its aggregation as pure functions and this file tests those.
//
// Nothing here touches a database. Each helper takes plain rows shaped exactly
// like the ones the route selects, which is also the point: if a column name or
// a status vocabulary drifts, the fixture below is where it shows up.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  periodBounds, bucketOf, splitByPeriod, trend, countByPeriod, trendLabel,
  averageStudentsPerRoom, deliveredOverScheduled, exitRatingCoverage,
  seatCommitmentGap, masteryPerStudentWeek, seatMoney, signedPrice, pctDisplay,
  foldSeats, seatRetention, billableSeats, conversionStep, interestMix,
  seatSeriesIdsOf, buildBoard, BOARD_GROUPS, SEAT_ROOM_FLOOR, DELIVERED_STATUS,
} from '@/app/api/admin/funnel/route.js';
import { SEAT_PLAN, STAFFING, directorMonthlyCents, formatPrice } from '@/lib/server/clubPricing.js';

const NOW = Date.parse('2026-09-02T12:00:00Z');
const B = periodBounds(NOW, 30);
const daysAgo = (n) => new Date(NOW - n * 24 * 3600 * 1000).toISOString();

// ── Periods ──────────────────────────────────────────────────────────────────

test('periodBounds gives two windows of equal length, back to back', () => {
  assert.equal(B.days, 30);
  assert.equal(B.currentToMs - B.currentFromMs, B.previousToMs - B.previousFromMs);
  assert.equal(B.previousToMs, B.currentFromMs, 'the previous window ends where the current one starts');
  assert.equal(B.currentTo, new Date(NOW).toISOString());
});

test('periodBounds clamps the window to a sane band', () => {
  assert.equal(periodBounds(NOW, 1).days, 7, 'a window shorter than a week is not a trend');
  assert.equal(periodBounds(NOW, 9999).days, 365);
  assert.equal(periodBounds(NOW, 'nonsense').days, 30, 'garbage falls back to the default');
});

test('bucketOf places a timestamp in exactly one window, or neither', () => {
  assert.equal(bucketOf(daysAgo(3), B), 'current');
  assert.equal(bucketOf(daysAgo(40), B), 'previous');
  assert.equal(bucketOf(daysAgo(500), B), null, 'older than both windows is counted nowhere');
  assert.equal(bucketOf(null, B), null);
  assert.equal(bucketOf('not a date', B), null);
});

test('the window boundary belongs to the newer period, never to both', () => {
  // Half-open on purpose: [from, to). A row landing exactly on the seam must
  // not be counted twice, which would show growth that did not happen.
  assert.equal(bucketOf(B.currentFromMs, B), 'current');
  assert.equal(bucketOf(B.previousToMs, B), 'current');
  assert.equal(bucketOf(B.previousFromMs, B), 'previous');
  assert.equal(bucketOf(B.currentToMs, B), null, 'the future is not this period');
});

test('splitByPeriod sorts rows by the field it is told to read', () => {
  const rows = [
    { created_at: daysAgo(1) },
    { created_at: daysAgo(2) },
    { created_at: daysAgo(45) },
    { created_at: daysAgo(400) },
    { created_at: null },
  ];
  const split = splitByPeriod(rows, 'created_at', B);
  assert.equal(split.current.length, 2);
  assert.equal(split.previous.length, 1);
});

// ── The trend comparison ─────────────────────────────────────────────────────

test('trend reports the delta and the percentage change', () => {
  assert.deepEqual(trend(12, 8), { current: 12, previous: 8, delta: 4, changePct: 50 });
  assert.deepEqual(trend(6, 8), { current: 6, previous: 8, delta: -2, changePct: -25 });
  assert.deepEqual(trend(8, 8), { current: 8, previous: 8, delta: 0, changePct: 0 });
});

test('growth from zero has a delta but no percentage', () => {
  // 0 → 3 is "up 3 from nothing". Rendering +300% or ∞ would be a number the
  // data does not contain, which is the failure mode this board exists to avoid.
  assert.deepEqual(trend(3, 0), { current: 3, previous: 0, delta: 3, changePct: null });
});

test('a stock with no history reports no previous period at all', () => {
  assert.deepEqual(trend(5, null), { current: 5, previous: null, delta: null, changePct: null });
  assert.equal(trendLabel(trend(5, null)), 'no comparable prior period');
});

test('trend rounds decimal deltas instead of leaking float noise', () => {
  assert.equal(trend(3.2, 2.8).delta, 0.4);
  assert.equal(trendLabel(trend(3.2, 2.8)), 'up 0.4 (+14%) from 2.8 last period');
});

test('trendLabel says the direction in words', () => {
  assert.equal(trendLabel(trend(12, 8)), 'up 4 (+50%) from 8 last period');
  assert.equal(trendLabel(trend(6, 8)), 'down 2 (-25%) from 8 last period');
  assert.equal(trendLabel(trend(8, 8)), 'level with 8 last period');
  assert.equal(trendLabel(trend(3, 0)), 'up 3 from 0 last period');
  assert.equal(trendLabel(null), 'no comparable prior period');
});

test('countByPeriod is the split plus the comparison', () => {
  const rows = [{ at: daysAgo(1) }, { at: daysAgo(5) }, { at: daysAgo(40) }];
  assert.deepEqual(countByPeriod(rows, 'at', B), { current: 2, previous: 1, delta: 1, changePct: 100 });
  assert.deepEqual(countByPeriod([], 'at', B), { current: 0, previous: 0, delta: 0, changePct: null });
});

// ── Occupancy: average students per seat room ────────────────────────────────

const rooms = [
  { id: 'r1', status: 'completed' },
  { id: 'r2', status: 'completed' },
];

test('occupancy averages HELD students over the rooms that ran', () => {
  const seats = [
    { group_session_id: 'r1', student_id: 'a', status: 'attended' },
    { group_session_id: 'r1', student_id: 'b', status: 'booked' },
    { group_session_id: 'r1', student_id: 'c', status: 'cancelled' },   // not a body in the room
    { group_session_id: 'r1', student_id: 'd', status: 'pending_payment' },
    { group_session_id: 'r2', student_id: 'a', status: 'attended' },
    { group_session_id: 'other', student_id: 'z', status: 'attended' }, // a room outside the window
  ];
  const occ = averageStudentsPerRoom(rooms, seats);
  assert.equal(occ.rooms, 2);
  assert.equal(occ.students, 3, 'cancelled and unpaid seats are not students in the room');
  assert.equal(occ.average, 1.5);
});

test('a room with nobody in it still counts in the denominator', () => {
  // The empty room is the expensive one; averaging only over rooms that had a
  // student would hide exactly the failure the founder is looking for.
  const occ = averageStudentsPerRoom(rooms, [{ group_session_id: 'r1', student_id: 'a', status: 'attended' }]);
  assert.equal(occ.rooms, 2);
  assert.equal(occ.average, 0.5);
});

test('no rooms means no average, not an average of zero', () => {
  const occ = averageStudentsPerRoom([], []);
  assert.equal(occ.rooms, 0);
  assert.equal(occ.average, null);
  assert.equal(occ.students, 0);
});

test('the occupancy floor is derived from the seat and the director, not typed', () => {
  // The floor answers "below how many students does a room stop covering what
  // it costs to run?" — so it has to move when either input moves. A typed 3
  // survived a director rate change and a seat reprice without noticing.
  const perSessionCost = STAFFING.directorHourlyCents * (SEAT_PLAN.seat.minutes / 60);
  const perStudentSession = SEAT_PLAN.seat.priceCents / SEAT_PLAN.seat.includedSeatMonthly;
  assert.equal(SEAT_ROOM_FLOOR, Math.ceil(perSessionCost / perStudentSession));
  assert.ok(SEAT_ROOM_FLOOR >= 1 && SEAT_ROOM_FLOOR < SEAT_PLAN.seat.ratio,
    'a floor at or above the room ratio would flag every full room');
});

test('occupancy counts the rooms that ran below the money floor', () => {
  const seats = [
    { group_session_id: 'r1', student_id: 'a', status: 'attended' },
    { group_session_id: 'r1', student_id: 'b', status: 'attended' },
    { group_session_id: 'r1', student_id: 'c', status: 'attended' },
    { group_session_id: 'r2', student_id: 'a', status: 'attended' },
  ];
  const occ = averageStudentsPerRoom(rooms, seats);
  // r2 ran with one student, which is under any floor this can derive to.
  assert.ok(SEAT_ROOM_FLOOR > 1);
  assert.equal(occ.belowFloor, 1, 'r2 ran with one student');
});

// ── Delivered over scheduled ─────────────────────────────────────────────────

test('delivered over scheduled keeps cancelled rooms in the denominator', () => {
  const d = deliveredOverScheduled([
    { id: 'a', status: 'completed' },
    { id: 'b', status: 'completed' },
    { id: 'c', status: 'cancelled' },
    { id: 'd', status: 'confirmed' },   // ran, nobody closed it out
  ]);
  assert.equal(d.scheduled, 4, 'a session we cancelled was still promised to a family');
  assert.equal(d.delivered, 2);
  assert.equal(d.cancelled, 1);
  assert.equal(d.pct, 50);
});

test('only a completed room counts as delivered', () => {
  assert.equal(DELIVERED_STATUS, 'completed');
  assert.equal(deliveredOverScheduled([{ id: 'a', status: 'in_progress' }]).delivered, 0);
});

test('nothing scheduled is a dash, not zero percent delivered', () => {
  const d = deliveredOverScheduled([]);
  assert.equal(d.scheduled, 0);
  assert.equal(d.pct, null);
  assert.equal(pctDisplay(d.pct), '—');
  assert.equal(pctDisplay(50), '50%');
});

// ── Exit ratings ─────────────────────────────────────────────────────────────

test('exit-rating coverage measures rooms rated, not ratings written', () => {
  // Six ratings for one room and none for the other is 50% coverage, not 300%.
  const observations = [
    { group_session_id: 'r1', student_id: 'a', kc_id: 'k1' },
    { group_session_id: 'r1', student_id: 'b', kc_id: 'k1' },
    { group_session_id: 'r1', student_id: 'c', kc_id: 'k2' },
  ];
  const cov = exitRatingCoverage(rooms, observations);
  assert.equal(cov.delivered, 2);
  assert.equal(cov.written, 3);
  assert.equal(cov.roomsRated, 1);
  assert.equal(cov.pct, 50);
});

test('an exit rating on a room that never completed does not count', () => {
  const cov = exitRatingCoverage(
    [{ id: 'r1', status: 'cancelled' }],
    [{ group_session_id: 'r1', student_id: 'a', kc_id: 'k1' }],
  );
  assert.equal(cov.delivered, 0);
  assert.equal(cov.written, 0);
  assert.equal(cov.pct, null);
});

// ── A seat is a child in a cohort, not a row in standing_seats ───────────────

const TUE = 'seriesTue';
const THU = 'seriesThu';
const COHORT = new Map([[TUE, 'cohortA'], [THU, 'cohortA']]);

test('the two weekdays of one cohort are ONE seat, not two', () => {
  // standing_seats is unique(series_id, student_id) and a series is one
  // weekday, so the $550 product is always two rows. Counting rows doubled the
  // MRR line of every seat ever sold.
  const seats = foldSeats([
    { series_id: TUE, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(10) },
    { series_id: THU, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(10) },
  ], COHORT);
  assert.equal(seats.length, 1);
  assert.equal(seats[0].payerId, 'payer1');
  assert.equal(seats[0].studentId, 'kid1');
  assert.ok(seats[0].active);
});

test('two children in the same cohort are two seats', () => {
  const seats = foldSeats([
    { series_id: TUE, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(10) },
    { series_id: TUE, user_id: 'payer1', student_id: 'kid2', active: true, created_at: daysAgo(10) },
  ], COHORT);
  assert.equal(seats.length, 2, 'a family paying for two children holds two seats');
});

test('one child in two cohorts is two seats', () => {
  const seats = foldSeats([
    { series_id: TUE, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(10) },
    { series_id: 'mathTue', user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(3) },
  ], new Map([[TUE, 'cohortA'], ['mathTue', 'cohortB']]));
  assert.equal(seats.length, 2);
});

test('series with no cohort attached fold into one seat rather than doubling', () => {
  // The cohort id is nullable (0038) and Wave 1 rooms predate it. Folding the
  // unattached ones together undercounts a child who genuinely sits in two
  // unwired cohorts — which errs toward not inventing revenue.
  const seats = foldSeats([
    { series_id: TUE, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(10) },
    { series_id: THU, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(10) },
  ], new Map());
  assert.equal(seats.length, 1);
});

test('a seat is live while either weekday is live, and ends when the last one does', () => {
  const half = foldSeats([
    { series_id: TUE, user_id: 'p', student_id: 'kid1', active: false, created_at: daysAgo(40), ended_at: daysAgo(5) },
    { series_id: THU, user_id: 'p', student_id: 'kid1', active: true, created_at: daysAgo(40) },
  ], COHORT);
  assert.equal(half[0].active, true, 'attending Thursdays only is not leaving');
  assert.equal(half[0].endedAtMs, null);

  const gone = foldSeats([
    { series_id: TUE, user_id: 'p', student_id: 'kid1', active: false, created_at: daysAgo(40), ended_at: daysAgo(9) },
    { series_id: THU, user_id: 'p', student_id: 'kid1', active: false, created_at: daysAgo(40), ended_at: daysAgo(5) },
  ], COHORT);
  assert.equal(gone[0].active, false);
  assert.equal(gone[0].endedAtMs, Date.parse(daysAgo(5)), 'the seat ended when its last half did');
  assert.equal(gone[0].startedAtMs, Date.parse(daysAgo(40)));
});

test('only a standing_seat series is seat inventory', () => {
  const ids = seatSeriesIdsOf([
    { id: 'a', kind: 'standing_seat' },
    { id: 'b', kind: 'homework_hall' },
  ]);
  assert.ok(ids.has('a'));
  assert.ok(!ids.has('b'));
});

// ── Retention ────────────────────────────────────────────────────────────────

test('retention divides by the seats that were already running, not the ones just sold', () => {
  const seats = foldSeats([
    // running before the window opened, still running
    { series_id: TUE, user_id: 'p1', student_id: 'k1', active: true, created_at: daysAgo(90) },
    // running before the window opened, left during it
    { series_id: TUE, user_id: 'p2', student_id: 'k2', active: false, created_at: daysAgo(90), ended_at: daysAgo(4) },
    // sold inside the window: no chance to leave, so not in the denominator
    { series_id: TUE, user_id: 'p3', student_id: 'k3', active: true, created_at: daysAgo(3) },
    // gone before the window opened: not ours to retain this period
    { series_id: TUE, user_id: 'p4', student_id: 'k4', active: false, created_at: daysAgo(200), ended_at: daysAgo(120) },
  ], COHORT);
  const r = seatRetention(seats, B);
  assert.equal(r.started, 2);
  assert.equal(r.retained, 1);
  assert.equal(r.lost, 1);
  assert.equal(r.pct, 50);
});

test('no seats running at the start of the window is a dash, not zero retention', () => {
  assert.equal(seatRetention([], B).pct, null);
  assert.equal(seatRetention(null, B).started, 0);
});

// ── The paying-but-unplaced gap ──────────────────────────────────────────────

test('the gap names families paying for a seat they are not sitting in', () => {
  const gap = seatCommitmentGap(['payer1', 'payer2', 'payer3'], ['payer1']);
  assert.equal(gap.paying, 3);
  assert.equal(gap.placed, 1);
  assert.equal(gap.payingAndPlaced, 1);
  assert.equal(gap.payingButUnplaced, 2, 'two families are paying and have no room');
  assert.equal(gap.placedButNotPaying, 0);
});

test('the gap runs both ways — a placed family with no seat plan is free delivery', () => {
  const gap = seatCommitmentGap(['payer1'], ['payer1', 'payer9']);
  assert.equal(gap.payingButUnplaced, 0);
  assert.equal(gap.placedButNotPaying, 1);
});

test('the gap counts payers, not placements — one family with two children is one family', () => {
  const gap = seatCommitmentGap(['payer1'], ['payer1', 'payer1']);
  assert.equal(gap.placed, 1);
  assert.equal(gap.payingButUnplaced, 0);
});

test('an empty funnel produces zeros, never a crash', () => {
  assert.deepEqual(seatCommitmentGap([], []), {
    paying: 0, placed: 0, payingAndPlaced: 0, payingButUnplaced: 0, placedButNotPaying: 0,
  });
  assert.deepEqual(seatCommitmentGap(null, undefined), {
    paying: 0, placed: 0, payingAndPlaced: 0, payingButUnplaced: 0, placedButNotPaying: 0,
  });
});

// ── Verified mastery per student per week ────────────────────────────────────

const confirming = (userId) => ({ user_id: userId, kind: 'check', assisted: false, verified_by: 'symbolic' });
const assisted = (userId) => ({ user_id: userId, kind: 'check', assisted: true, verified_by: 'symbolic' });
const chatter = (userId) => ({ user_id: userId, kind: 'chat_signal', assisted: false, verified_by: 'model' });

test('only evidence the mastery law admits is counted', () => {
  const m = masteryPerStudentWeek(
    [confirming('s1'), assisted('s1'), chatter('s1'), confirming('s1')],
    { cohortIds: ['s1'], days: 28 },
  );
  assert.equal(m.events, 2, 'assisted work and chat signals never count as verified mastery');
  assert.equal(m.students, 1);
  assert.equal(m.weeks, 4);
  assert.equal(m.perStudentPerWeek, 0.5);
});

test('the denominator is the seat cohort, including students who did nothing', () => {
  // A student who produced no evidence still divides the total: the question is
  // "are the families we are paid to teach getting verified mastery", and
  // dropping the silent ones would answer a much easier question.
  const m = masteryPerStudentWeek([confirming('s1'), confirming('s1')], { cohortIds: ['s1', 's2'], days: 14 });
  assert.equal(m.basis, 'seat_cohort');
  assert.equal(m.students, 2);
  assert.equal(m.weeks, 2);
  assert.equal(m.perStudentPerWeek, 0.5);
});

test('evidence from outside the seat cohort is excluded from the cohort figure', () => {
  const m = masteryPerStudentWeek([confirming('s1'), confirming('outsider')], { cohortIds: ['s1'], days: 7 });
  assert.equal(m.events, 1);
  assert.equal(m.students, 1);
});

test('with no seat placed yet the row falls back to active learners and says so', () => {
  const m = masteryPerStudentWeek([confirming('s1'), confirming('s2'), chatter('s3')], { cohortIds: [], days: 7 });
  assert.equal(m.basis, 'active_learners');
  assert.equal(m.students, 3, 'anyone who produced evidence is an active learner');
  assert.equal(m.events, 2);
});

test('no students at all is a dash, not a division by zero', () => {
  const m = masteryPerStudentWeek([], { cohortIds: [], days: 30 });
  assert.equal(m.students, 0);
  assert.equal(m.events, 0);
  assert.equal(m.perStudentPerWeek, null);
});

// ── What we may actually bill ────────────────────────────────────────────────

const seatOf = (payerId, studentId) => ({ payerId, studentId, active: true, key: `${studentId}::c` });

test('a second child placed under one payer bills nothing, because Stripe charges once', () => {
  // Checkout creates the seat subscription as one line item of quantity 1
  // (app/api/billing/checkout/route.js), profiles.plan is a single scalar, and
  // `subscriptions` (0001) has no quantity column. So the card is charged once
  // however many children sit in a room, and an MRR line that counted the
  // children would print double the money the bank will see.
  const b = billableSeats(['payer1'], [seatOf('payer1', 'kid1'), seatOf('payer1', 'kid2')]);
  assert.equal(b.payers, 1);
  assert.equal(b.seats, 1, 'one paying account is one seat subscription');
  assert.equal(b.extraPlacements, 1, 'the second child is delivery given away, and the board says so');
  assert.equal(b.atFloor, 0);
  assert.equal(seatMoney(b).mrrCents, SEAT_PLAN.seat.priceCents, 'one charge, one seat price');
});

test('a family that has paid and has not been placed is still billed for one seat', () => {
  const b = billableSeats(['payer1'], []);
  assert.equal(b.seats, 1);
  assert.equal(b.atFloor, 1, 'the board says how many were counted that way');
  assert.equal(b.extraPlacements, 0);
});

test('billed seats track paying accounts, never the number of placements', () => {
  const seats = [
    seatOf('payer1', 'kid1'), seatOf('payer1', 'kid2'), seatOf('payer1', 'kid3'),
    seatOf('payer2', 'kid4'),
  ];
  const b = billableSeats(['payer1', 'payer2', 'payer3'], seats);
  assert.equal(b.seats, 3, 'three accounts, three subscriptions');
  assert.equal(b.payers, 3);
  assert.equal(b.extraPlacements, 2, "payer1's other two children are delivered, not billed");
  assert.equal(b.atFloor, 1, 'payer3 has paid and has nobody in a room yet');
  assert.equal(seatMoney(b).mrrCents, 3 * SEAT_PLAN.seat.priceCents);
});

test('a placement with no seat plan behind it is never revenue', () => {
  // The board prints this same family two cards higher as "a room being
  // delivered for free". Free delivery cannot also be MRR.
  const b = billableSeats([], [seatOf('freeloader', 'kid9')]);
  assert.equal(b.payers, 0);
  assert.equal(b.seats, 0);
  assert.equal(b.unbilledSeats, 1);
  assert.equal(b.extraPlacements, 0, 'a family with no plan at all is the other giveaway, counted separately');
  assert.equal(seatMoney(b).mrrCents, 0);
});

// ── The two money lines ──────────────────────────────────────────────────────

test('seat MRR is the billed seat count times the pinned seat price, never a typed figure', () => {
  const money = seatMoney({ seats: 4, payers: 3 });
  assert.equal(money.seatPriceCents, SEAT_PLAN.seat.priceCents);
  assert.equal(money.mrrCents, 4 * SEAT_PLAN.seat.priceCents);
  assert.equal(money.directorCents, directorMonthlyCents());
  assert.equal(money.contributionCents, money.mrrCents - money.directorCents);
});

test('the coverage figure is the Director only, and is not called break-even', () => {
  // ceil(director ÷ seat price) omits every cost that is not the Director, so
  // it is smaller than the break-even in docs/UNIT_ECONOMICS.md. It is printed
  // as what it is; the label and the note carry that, and no field on the
  // payload claims break-even.
  const money = seatMoney({ seats: 0 });
  assert.equal(money.mrrCents, 0);
  assert.equal(money.seatsCoveringDirector, Math.ceil(directorMonthlyCents() / SEAT_PLAN.seat.priceCents));
  assert.equal(money.breakEvenSeats, undefined, 'no field may claim break-even');
  assert.ok(money.contributionCents < 0, 'with no seats sold the director is a pure cost');
});

test('the director dial moves the cost line and nothing else', () => {
  const lean = seatMoney({ seats: 2, hoursPerWeek: 10 });
  const full = seatMoney({ seats: 2, hoursPerWeek: 20 });
  assert.equal(lean.mrrCents, full.mrrCents);
  assert.ok(full.directorCents > lean.directorCents);
  assert.equal(lean.directorCents, directorMonthlyCents(10));
});

test('a negative contribution renders as a loss instead of clamping to zero', () => {
  // formatPrice clamps at zero, which would print a month of pure cost as $0.
  assert.equal(signedPrice(-1000), `−${formatPrice(1000)}`);
  assert.equal(signedPrice(1000), formatPrice(1000));
  assert.equal(signedPrice(0), formatPrice(0));
});

test('a fractional or negative seat count cannot invent revenue', () => {
  assert.equal(seatMoney({ seats: -3 }).mrrCents, 0);
  assert.equal(seatMoney({ seats: 2.6 }).seats, 3);
  assert.equal(seatMoney().mrrCents, 0, 'called with nothing at all, it is still a number');
});

// ── Conversion: the rates that make this a funnel ────────────────────────────

test('a rate states its denominator in words', () => {
  const step = conversionStep({
    key: 'k', label: 'Interest → diagnostic', numerator: 2, denominator: 5,
    unit: 'families who asked about a seat or a diagnostic',
  });
  assert.equal(step.display, '40%');
  assert.equal(step.basis, '2 of 5 families who asked about a seat or a diagnostic');
  assert.equal(step.status, 'ok');
});

test('an empty denominator is a dash and says which population was empty', () => {
  // This is the state the founder lives in for the whole of Wave 1. 0% would
  // read as "nobody converts"; 0 of 0 reads as "nobody has arrived".
  const step = conversionStep({ key: 'k', label: 'x', numerator: 0, denominator: 0, unit: 'families who bought a diagnostic' });
  assert.equal(step.display, '—');
  assert.equal(step.pct, null);
  assert.equal(step.barPct, null, 'no bar at all — an empty track reads as zero');
  assert.equal(step.status, 'no_data');
  assert.equal(step.basis, '0 of 0 families who bought a diagnostic');
});

test('a rate over 100% keeps its number and clamps only the bar', () => {
  const step = conversionStep({ key: 'k', label: 'x', numerator: 7, denominator: 5, unit: 'asks' });
  assert.equal(step.display, '140%');
  assert.equal(step.barPct, 100);
});

test('a rate whose table does not exist reports that instead of a number', () => {
  const step = conversionStep({
    key: 'k', label: 'x', numerator: 3, denominator: 4, unit: 'asks',
    fault: { status: 'not_provisioned', note: 'migration 0036' },
  });
  assert.equal(step.status, 'not_provisioned');
  assert.equal(step.display, '—');
  assert.equal(step.basis, null, 'a denominator nobody could read is not a denominator');
  assert.match(step.note, /0036/);
});

// ── Interest, split by what was actually asked for ───────────────────────────

test('interest is split by kind, and the seat funnel counts only seat intent', () => {
  const mix = interestMix([
    { id: 'i1', email: 'a@example.com', kind: 'seat', created_at: daysAgo(2) },
    { id: 'i2', email: 'b@example.com', kind: 'diagnostic', created_at: daysAgo(3) },
    { id: 'i3', email: 'c@example.com', kind: 'ai', created_at: daysAgo(4) },
    { id: 'i4', email: 'd@example.com', kind: null, created_at: daysAgo(5) },
    { id: 'i5', email: 'e@example.com', kind: 'nonsense', created_at: daysAgo(6) },
    { id: 'i6', email: 'f@example.com', kind: 'seat', created_at: daysAgo(40) },   // previous window
  ], B);
  assert.equal(mix.total, 5);
  assert.equal(mix.seatIntent, 2, 'an AI signup is a real capture and a different funnel');
  assert.equal(mix.counts.unspecified, 2, 'a null kind and an unknown kind are both unclassified');
  assert.match(mix.summary, /seat 1/);
});

test('one household asking twice is two captures and one family', () => {
  // club_interest is unique nulls not distinct (email, kind) (0027): the PAIR
  // is unique, the email is not. A family that asks about the seat and then
  // about the diagnostic is two rows, and counting them as two families would
  // report a leak that never happened on the denominator of the first rate —
  // the same defect the numerator already guards against.
  const mix = interestMix([
    { id: 'i1', email: 'Ada@Example.com', kind: 'seat', created_at: daysAgo(9) },
    { id: 'i2', email: 'ada@example.com', kind: 'diagnostic', created_at: daysAgo(8) },
  ], B);
  assert.equal(mix.total, 2, 'both captures are real and both are counted as captures');
  assert.equal(mix.seatIntentRows, 2);
  assert.equal(mix.seatIntent, 1, 'the address is the household, and case is not a second household');
});

test('a capture with no email counts as its own family rather than vanishing', () => {
  // club_interest.email is NOT NULL, so this should not happen — but folding
  // every emailless row into one key would shrink the denominator and flatter
  // the rate, and dropping them would do it worse.
  const mix = interestMix([
    { id: 'i1', kind: 'seat', created_at: daysAgo(9) },
    { id: 'i2', kind: 'seat', created_at: daysAgo(8) },
    { id: 'i3', email: '   ', kind: 'diagnostic', created_at: daysAgo(7) },
  ], B);
  assert.equal(mix.seatIntent, 3, 'over-counting the denominator understates conversion, which is the safe way to be wrong');
});

// ── The board as a whole ─────────────────────────────────────────────────────
//
// buildBoard turns raw PostgREST results into the JSON the page prints. These
// cover the states the page must survive: an empty database, a table that does
// not exist yet, and a read that failed.

const rowOf = (board, key) => board.rows.find((r) => r.key === key);

// The spec's seven rows plus the placements flow beneath committed seats, which
// carries the trend the paying-seat stock cannot (profiles has no plan history).
const BOARD_ROW_COUNT = 8;

test('the board renders with no data at all and no crash', () => {
  const board = buildBoard({ bounds: B });
  assert.equal(board.rows.length, BOARD_ROW_COUNT, 'every row is present even with nothing behind it');
  assert.equal(board.windowDays, 30);
  assert.equal(board.gap.paying, 0);
  assert.equal(board.gap.payingButUnplaced, 0);
  assert.equal(board.money.mrrCents, 0);
  for (const r of board.rows) {
    assert.equal(r.status, 'no_data', `${r.key} should report nothing yet, not a measurement`);
    assert.ok(typeof r.display === 'string' && r.display.length > 0, `${r.key} needs something to print`);
  }
});

test('with no customers every rate is 0 of 0, and the board says so once', () => {
  const board = buildBoard({ bounds: B });
  assert.equal(board.conversion.steps.length, 3);
  for (const s of board.conversion.steps) {
    assert.equal(s.display, '—');
    assert.equal(s.status, 'no_data');
    assert.match(s.basis, /^0 of 0 /, 'the denominator is named even when it is empty');
  }
  assert.equal(board.conversion.allEmpty, true);
  assert.match(board.conversion.emptyNote, /Nobody has entered the funnel/);
});

test('with nobody sold, the gap card says so rather than congratulating anyone', () => {
  // "Every paying family is in a room" is true of zero families and reads as
  // reassurance, which is the opposite of what an empty funnel means.
  const empty = buildBoard({ bounds: B });
  assert.match(empty.gap.settled, /No seat has been sold yet/);
  const settled = buildBoard({
    bounds: B,
    series: { data: [{ id: TUE, kind: 'standing_seat', cohort_id: 'cohortA' }] },
    standing: { data: [{ id: 's1', series_id: TUE, user_id: 'p1', student_id: 'k1', active: true, created_at: daysAgo(9) }] },
    paying: { data: [{ id: 'p1' }] },
  });
  assert.match(settled.gap.settled, /Every paying family is in a room/);
});

test('every row belongs to a group the board describes', () => {
  const board = buildBoard({ bounds: B });
  const known = new Set(BOARD_GROUPS.map((g) => g.key));
  assert.deepEqual(board.groups, BOARD_GROUPS);
  for (const r of board.rows) {
    assert.ok(known.has(r.group), `${r.key} is in group "${r.group}", which the page has no heading for`);
  }
  assert.equal(rowOf(board, 'interest').group, 'funnel');
  assert.equal(rowOf(board, 'mastery').group, 'delivery');
});

test('a table that does not exist yet reads as "not built", never as zero', () => {
  const missing = { error: { code: '42P01', message: 'relation "diagnostic_order" does not exist' } };
  const board = buildBoard({ bounds: B, diagnostic: missing, evidence: missing });
  const diagnostics = rowOf(board, 'diagnostics');
  const mastery = rowOf(board, 'mastery');
  assert.equal(diagnostics.status, 'not_provisioned');
  assert.equal(diagnostics.display, '—', 'a dash, because zero would be a claim about behaviour');
  assert.match(diagnostics.note, /0036/, 'the row names the migration that would fix it');
  assert.equal(mastery.status, 'not_provisioned');
  assert.equal(mastery.value, null);
  // Both rates that read diagnostic_order say the same thing, rather than one
  // of them quietly printing 0%.
  for (const key of ['interest_to_diagnostic', 'diagnostic_to_seat']) {
    const step = board.conversion.steps.find((s) => s.key === key);
    assert.equal(step.status, 'not_provisioned');
    assert.match(step.note, /0036/);
  }
  assert.equal(board.conversion.steps.find((s) => s.key === 'seat_to_retained').status, 'no_data',
    'retention does not depend on the diagnostic and still answers');
});

test('a read that simply failed is reported as a failure, not as a build state', () => {
  const board = buildBoard({ bounds: B, evidence: { error: { code: '57014', message: 'canceling statement due to statement timeout' } } });
  const mastery = rowOf(board, 'mastery');
  assert.equal(mastery.status, 'error');
  assert.match(mastery.note, /timeout/);
  // The rest of the board still renders — one bad query is not a blank page.
  assert.equal(rowOf(board, 'interest').status, 'no_data');
});

test('a failed profiles read takes the money and the seat rates with it', () => {
  // A zero MRR and a full month of director cost, printed off a statement
  // timeout, is the most reassuring possible way to be wrong.
  const board = buildBoard({ bounds: B, paying: { error: { code: '57014', message: 'statement timeout' } } });
  assert.equal(board.money, null);
  assert.equal(board.gap, null);
  for (const key of ['diagnostic_to_seat', 'seat_to_retained']) {
    assert.equal(board.conversion.steps.find((s) => s.key === key).status, 'error');
  }
});

test('only standing_seat cohorts count as seat inventory', () => {
  // A standing seat on a Homework Hall series is a member's weekly place
  // (0029), not a seat sale, and must not appear in the seat numbers.
  const board = buildBoard({
    bounds: B,
    series: { data: [{ id: 'seatSeries', kind: 'standing_seat' }, { id: 'hallSeries', kind: 'homework_hall' }] },
    standing: {
      data: [
        { id: 's1', series_id: 'seatSeries', user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(4) },
        { id: 's2', series_id: 'hallSeries', user_id: 'payer2', student_id: 'kid2', active: true, created_at: daysAgo(4) },
      ],
    },
    paying: { data: [{ id: 'payer1' }, { id: 'payer2' }] },
  });
  assert.equal(board.gap.paying, 2);
  assert.equal(board.gap.placed, 1, 'only the standing_seat cohort places a family');
  assert.equal(board.gap.payingButUnplaced, 1);
  assert.equal(rowOf(board, 'placements').value, 1);
});

test('a two-evening cohort is one seat on the board and one seat in the MRR', () => {
  const board = buildBoard({
    bounds: B,
    series: {
      data: [
        { id: TUE, kind: 'standing_seat', cohort_id: 'cohortA' },
        { id: THU, kind: 'standing_seat', cohort_id: 'cohortA' },
      ],
    },
    standing: {
      data: [
        { id: 's1', series_id: TUE, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(4) },
        { id: 's2', series_id: THU, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(4) },
      ],
    },
    paying: { data: [{ id: 'payer1', email: 'a@example.com' }] },
  });
  assert.equal(rowOf(board, 'placements').value, 1, 'two weekdays, one seat started');
  assert.equal(board.money.seats, 1);
  assert.equal(board.money.mrrCents, SEAT_PLAN.seat.priceCents);
});

test('two children under one payer is one seat of MRR, and the extra child is named as a giveaway', () => {
  // The billing rail can only charge this family once, so the money line may
  // only claim one charge. The second child is real delivery and is reported
  // as delivery, not as revenue.
  const board = buildBoard({
    bounds: B,
    series: {
      data: [
        { id: TUE, kind: 'standing_seat', cohort_id: 'cohortA' },
        { id: THU, kind: 'standing_seat', cohort_id: 'cohortB' },
      ],
    },
    standing: {
      data: [
        { id: 's1', series_id: TUE, user_id: 'payer1', student_id: 'kid1', active: true, created_at: daysAgo(20) },
        { id: 's2', series_id: THU, user_id: 'payer1', student_id: 'kid2', active: true, created_at: daysAgo(20) },
      ],
    },
    paying: { data: [{ id: 'payer1', email: 'ada@example.com' }] },
  });
  assert.equal(board.money.payers, 1);
  assert.equal(board.money.seats, 1, 'one subscription, not one per child');
  assert.equal(board.money.mrrCents, SEAT_PLAN.seat.priceCents);
  assert.equal(board.money.mrrDisplay, formatPrice(SEAT_PLAN.seat.priceCents));
  assert.equal(board.money.extraPlacements, 1);
  assert.match(board.money.basisNote, /one seat subscription per paying account/);
  assert.match(board.money.basisNote, /1 further child .*delivered, not billed/);
  // The rooms are still real, and the placement row still counts both.
  assert.equal(rowOf(board, 'placements').value, 2, 'two children were placed; only one is billed');
  assert.equal(board.gap.payingButUnplaced, 0);
});

test('a room delivered for free is named, and is worth nothing', () => {
  const board = buildBoard({
    bounds: B,
    series: { data: [{ id: TUE, kind: 'standing_seat', cohort_id: 'cohortA' }] },
    standing: {
      data: [{ id: 's1', series_id: TUE, user_id: 'ghost', student_id: 'kid1', active: true, created_at: daysAgo(4) }],
    },
    paying: { data: [] },
    people: { data: [{ id: 'ghost', name: 'The Nguyen family', email: 'nguyen@example.com' }] },
  });
  assert.equal(board.money.mrrCents, 0, 'an unpaid placement is not revenue');
  assert.equal(board.money.unbilledSeats, 1);
  assert.match(board.money.basisNote, /no seat plan behind them/);
  assert.equal(board.gap.freeDelivery[0].label, 'The Nguyen family');
  assert.equal(board.gap.freeDelivery[0].email, 'nguyen@example.com');
});

test('the gap names the families to call and links to the console that enrols them', () => {
  // You cannot enrol an integer. The card used to say "enrol them before the
  // next billing date" and name nobody.
  const board = buildBoard({
    bounds: B,
    paying: {
      data: [
        { id: 'payer1', name: 'Ada Okafor', email: 'ada@example.com' },
        { id: 'payer2', name: null, email: 'no-name@example.com' },
        { id: 'payer3' },
      ],
    },
  });
  assert.equal(board.gap.payingButUnplaced, 3);
  assert.deepEqual(board.gap.unplaced.map((f) => f.label),
    ['Ada Okafor', 'no-name@example.com', 'account payer3']);
  assert.equal(board.gap.unplaced[0].email, 'ada@example.com');
  assert.equal(board.gap.unplaced[1].email, null, 'the email is the label already — do not print it twice');
  assert.equal(board.gap.consoleHref, '/admin');
  assert.match(board.gap.action, /Seat cohorts/);
});

test('the committed-seats row refuses to invent a previous period', () => {
  const board = buildBoard({ bounds: B, paying: { data: [{ id: 'payer1' }, { id: 'payer2' }] } });
  const seats = rowOf(board, 'seats');
  assert.equal(seats.value, 2);
  assert.equal(seats.previous, null);
  assert.equal(seats.trend, 'no comparable prior period');
  assert.match(seats.note, /not the date they moved onto it/);
});

test('the diagnostic-to-seat rate follows the same families, one by one', () => {
  const board = buildBoard({
    bounds: B,
    diagnostic: {
      data: [
        { id: 'd1', payer_id: 'payer1', status: 'delivered', amount_cents: 5900, created_at: daysAgo(20) },
        { id: 'd2', payer_id: 'payer2', status: 'paid', amount_cents: 5900, created_at: daysAgo(10) },
        { id: 'd3', payer_id: 'payer3', status: 'refunded', amount_cents: 5900, created_at: daysAgo(9) },
        { id: 'd4', payer_id: 'payer4', status: 'pending', amount_cents: 5900, created_at: daysAgo(8) },
      ],
    },
    interest: {
      data: [
        { id: 'i1', email: 'one@example.com', kind: 'seat', created_at: daysAgo(25) },
        { id: 'i2', email: 'two@example.com', kind: 'diagnostic', created_at: daysAgo(24) },
        { id: 'i3', email: 'three@example.com', kind: 'ai', created_at: daysAgo(23) },
        { id: 'i4', email: 'four@example.com', kind: 'seat', created_at: daysAgo(22) },
      ],
    },
    paying: { data: [{ id: 'payer1', email: 'one@example.com' }] },
  });
  const first = board.conversion.steps.find((s) => s.key === 'interest_to_diagnostic');
  assert.equal(first.numerator, 2, 'a refunded order and an abandoned checkout are not sales');
  assert.equal(first.denominator, 3, 'the AI signup is not in the seat funnel');
  assert.equal(first.display, '67%');
  assert.equal(rowOf(board, 'diagnostics').value, 2);
  assert.ok(rowOf(board, 'diagnostics').detail.some((d) => /never paid/.test(d)),
    'an abandoned checkout is itself a leak and is reported as one');

  const second = board.conversion.steps.find((s) => s.key === 'diagnostic_to_seat');
  assert.equal(second.denominator, 2);
  assert.equal(second.numerator, 1, 'one of the two buyers is on a seat plan today');
  assert.equal(second.display, '50%');
});

test('one family buying two diagnostics is two sales and one conversion', () => {
  const board = buildBoard({
    bounds: B,
    diagnostic: {
      data: [
        { id: 'd1', payer_id: 'payer1', status: 'paid', amount_cents: 5900, created_at: daysAgo(6) },
        { id: 'd2', payer_id: 'payer1', status: 'paid', amount_cents: 5900, created_at: daysAgo(5) },
      ],
    },
    interest: {
      data: [
        { id: 'i1', email: 'one@example.com', kind: 'seat', created_at: daysAgo(9) },
        { id: 'i2', email: 'two@example.com', kind: 'seat', created_at: daysAgo(8) },
      ],
    },
  });
  assert.equal(rowOf(board, 'diagnostics').value, 2, 'two children, two diagnostics, two sales');
  const first = board.conversion.steps.find((s) => s.key === 'interest_to_diagnostic');
  assert.equal(first.numerator, 1, 'both sides of a rate are families, or the fraction is nonsense');
  assert.equal(first.basis, '1 of 2 families who asked about a seat or a diagnostic');
});

test('one family asking twice is one family on the bottom of the rate too', () => {
  // The numerator already counted a family buying for two children as one
  // conversion; the denominator has to hold the same rule or the fraction
  // prints a leak nobody caused. 0027 makes (email, kind) unique, not email.
  const board = buildBoard({
    bounds: B,
    diagnostic: {
      data: [{ id: 'd1', payer_id: 'payer1', status: 'paid', amount_cents: 5900, created_at: daysAgo(4) }],
    },
    interest: {
      data: [
        { id: 'i1', email: 'ada@example.com', kind: 'seat', created_at: daysAgo(9) },
        { id: 'i2', email: 'ada@example.com', kind: 'diagnostic', created_at: daysAgo(8) },
      ],
    },
  });
  const first = board.conversion.steps.find((s) => s.key === 'interest_to_diagnostic');
  assert.equal(first.denominator, 1, 'two captures, one household');
  assert.equal(first.basis, '1 of 1 families who asked about a seat or a diagnostic');
  assert.equal(first.display, '100%');

  const interest = rowOf(board, 'interest');
  assert.equal(interest.display, '2', 'the headline still counts captures, which is what it says');
  assert.ok(
    interest.detail.some((d) => /^1 family asked about a seat or a diagnostic \(2 captures/.test(d)),
    'the row prints the denominator in the unit it is actually in, and says why it differs',
  );
});

test('retention reaches the board off the seats that were already running', () => {
  const board = buildBoard({
    bounds: B,
    series: { data: [{ id: TUE, kind: 'standing_seat', cohort_id: 'cohortA' }] },
    standing: {
      data: [
        { id: 's1', series_id: TUE, user_id: 'p1', student_id: 'k1', active: true, created_at: daysAgo(120) },
        { id: 's2', series_id: TUE, user_id: 'p2', student_id: 'k2', active: false, created_at: daysAgo(120), ended_at: daysAgo(2) },
      ],
    },
    paying: { data: [{ id: 'p1' }] },
  });
  const step = board.conversion.steps.find((s) => s.key === 'seat_to_retained');
  assert.equal(step.basis, '1 of 2 seats that were already running when this window opened');
  assert.equal(step.display, '50%');
});

test('every figure the page prints is a string the route already formatted', () => {
  const board = buildBoard({
    bounds: B,
    paying: { data: [{ id: 'payer1' }] },
    interest: { data: [{ created_at: daysAgo(2) }, { created_at: daysAgo(40) }] },
  });
  // The page does no arithmetic, so anything it renders must arrive ready.
  assert.equal(rowOf(board, 'interest').display, '1');
  assert.equal(rowOf(board, 'interest').trend, 'level with 1 last period');
  assert.equal(board.money.mrrDisplay, formatPrice(SEAT_PLAN.seat.priceCents));
  assert.equal(board.money.contributionDisplay, signedPrice(SEAT_PLAN.seat.priceCents - directorMonthlyCents()));
  assert.equal(board.gap.headline, '1 paying with no seat in a room');
  assert.equal(board.money.seatLabel, '1 seat subscription, one per paying account');
  assert.match(board.money.coverageNote, /not break-even/);
  for (const r of board.rows) {
    assert.equal(typeof r.display, 'string');
    for (const d of r.detail) assert.equal(typeof d, 'string');
  }
  for (const s of board.conversion.steps) {
    assert.equal(typeof s.display, 'string');
  }
});

test('delivery, occupancy and exit ratings all read the same room set', () => {
  const board = buildBoard({
    bounds: B,
    rooms: {
      data: [
        { id: 'r1', status: 'completed', scheduled_start: daysAgo(3) },
        { id: 'r2', status: 'cancelled', scheduled_start: daysAgo(5) },
        { id: 'r3', status: 'completed', scheduled_start: daysAgo(40) },  // previous period
      ],
    },
    seats: {
      data: [
        { group_session_id: 'r1', student_id: 'a', status: 'attended' },
        { group_session_id: 'r1', student_id: 'b', status: 'attended' },
        { group_session_id: 'r3', student_id: 'a', status: 'attended' },
      ],
    },
    observations: { data: [{ group_session_id: 'r1', student_id: 'a', kc_id: 'k1' }] },
  });
  assert.equal(rowOf(board, 'delivery').display, '1 / 2', 'the cancelled room stays in the denominator');
  assert.equal(rowOf(board, 'occupancy').display, '1.0', 'two students over two rooms this period');
  assert.equal(rowOf(board, 'exit_ratings').display, '1 / 1');
});

test('when the seat rooms cannot be read, every row that depends on them says so', () => {
  // Delivery, occupancy and exit ratings all read group_session. If they were
  // allowed to silently drop out, the board would go from seven rows to five
  // and nobody would notice which three questions stopped being asked.
  const board = buildBoard({
    bounds: B,
    rooms: { error: { code: '42501', message: 'permission denied for table group_session' } },
  });
  for (const key of ['delivery', 'occupancy', 'exit_ratings']) {
    const row = rowOf(board, key);
    assert.ok(row, `${key} must still be on the board`);
    assert.equal(row.status, 'error');
    assert.equal(row.display, '—');
    assert.match(row.note, /permission denied/);
  }
  assert.equal(board.rows.length, BOARD_ROW_COUNT, 'a row never disappears — it reports why it cannot answer');
});
