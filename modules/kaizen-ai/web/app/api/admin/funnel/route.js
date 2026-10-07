// GET /api/admin/funnel?days=30 — the founder's weekly board (spec W2 in
// docs/superpowers/specs/2026-09-02-wave1-product.md, reshaped by the Wave 2
// geometry spec).
//
// One screen, read once a week, that answers ONE question: is the funnel
// working, and where is it leaking? Interest → diagnostic → seat → retained,
// with the delivery the seat pays for and the money it makes underneath.
//
// A COUNT IS NOT A FUNNEL. The first version of this board was seven absolute
// counts, each trended against itself, and not one stage-to-stage rate
// anywhere — so it could say "eleven interest forms, one diagnostic" without
// ever saying that ten families walked away between the two. The conversion
// block below is the fix, and every rate on it carries its own denominator IN
// WORDS, because a percentage with an invisible denominator is how a board
// lies to the person steering by it.
//
// EVERY NUMBER IS COMPUTED HERE. Not one of them is derived in the browser —
// including the formatted strings the page prints. A figure a parent, a payer
// or an investor is shown must be a figure the server stands behind; the moment
// the page starts doing arithmetic, the board and the database can disagree and
// nobody can tell which one is lying. The page is a renderer of `rows`,
// `conversion`, `gap` and `money`.
//
// The aggregation lives in the pure exported helpers below, and the assembly of
// the board itself in buildBoard, so both are unit-testable without a database
// (web/test/funnel.test.mjs). GET's only job is to fetch rows and hand them
// over — which is what keeps "renders with zero data and no crash" a thing a
// test can prove rather than a thing someone remembered to check.
//
// ZERO IS THE STATE THIS BOARD LIVES IN. Kaizen has no customers yet, so every
// rate here is 0 of 0 for the whole of Wave 1. That state is designed rather
// than tolerated: a rate with an empty denominator prints a dash and says which
// denominator was empty, never 0%, which would read as "nobody converts".
//
// DEGRADING HONESTLY. Two tables here may legitimately not exist yet:
//   - `diagnostic_order` arrives in migration 0036 (spec W3),
//   - the engine ledger (`evidence`) arrives in 0012/0013.
// A missing table is answered as "not provisioned" via the isMissingSchema
// idiom the rest of the app uses — never as a zero, because a zero is a claim
// and "we have not built this yet" is not the same claim as "nobody did it".
// Any OTHER read failure is reported as an error on that row alone; the rest of
// the board still renders.

import { getCaller, isAdminCaller, serviceClient } from '@/lib/server/context';
import { isMissingSchema } from '@/lib/engine/ledger';
import { isConfirming } from '@/lib/engine/types';
import { INTEREST_KINDS, readInterestKind } from '@/lib/server/interest';
import { SEAT_PLAN, directorMonthlyCents, formatPrice, STAFFING } from '@/lib/server/clubPricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A seat is only held if the student is actually on the roster; a
// pending_payment or cancelled row is not a body in the room. Mirrors the HELD
// list in app/api/admin/metrics/route.js — same word, same meaning.
export const HELD_SEAT_STATUSES = ['booked', 'attended'];

// A room counts as delivered only when someone marked it completed. A room
// still sitting in 'confirmed' a week after it ran is itself a finding.
export const DELIVERED_STATUS = 'completed';

// A diagnostic is SOLD when money was actually taken. `pending` is a Checkout
// session that nobody has paid for (0036), so an abandoned checkout is not a
// sale — it used to be counted as one, and its amount was added to the cash
// collected. `refunded` is a sale that was undone. Both are excluded, and the
// abandoned ones are reported separately, because a checkout nobody finishes is
// itself a leak and the board's job is to find leaks.
export const DIAGNOSTIC_SOLD_STATUSES = ['paid', 'scheduled', 'delivered'];

// The three questions this board asks, in the order the founder asks them. They
// are three separate questions and used to sit in one undifferentiated list, so
// "eleven interest forms" sat directly above "1.8 students a room" as if they
// were the same kind of fact. Money is its own block below the rows.
export const BOARD_GROUPS = [
  {
    key: 'funnel',
    title: 'The funnel',
    blurb: 'Who arrived, and how many took the next step.',
  },
  {
    key: 'delivery',
    title: 'Delivery',
    blurb: 'Whether the rooms we sold actually happened, and what came out of them.',
  },
];

// How many families the gap card names before it stops naming them. Long enough
// that the founder can work the whole list on a Wave 1 morning, short enough
// that the card never becomes a directory dump.
export const NAMED_FAMILY_LIMIT = 12;

// The occupancy floor, DERIVED rather than typed — and it is not a
// profitability line.
//
// It was written as a hard 3 with the note "below 3 a room does not cover the
// tutor it takes to run it", which this repo's own numbers contradict: a
// 75-minute room costs STAFFING.directorHourlyCents × 1.25 to staff, and one
// student's share of a seat month (SEAT_PLAN price ÷ includedSeatMonthly)
// already covers most of it, so two students clear it comfortably. Worse, the
// claim is the wrong shape: docs/UNIT_ECONOMICS.md treats the director's hours
// as a FIXED cost up to the dial's ceiling, so an under-filled room costs
// nothing extra at all — what it wastes is capacity, which is the scarce thing.
//
// So the floor below is the honest one: the point at which a room stops
// covering its own marginal delivery cost. The board flags a room under it as
// wasted capacity, not as a loss.
export function seatRoomFloor() {
  const perSessionCostCents = Math.round(STAFFING.directorHourlyCents * (SEAT_PLAN.seat.minutes / 60));
  const perStudentSessionCents = SEAT_PLAN.seat.priceCents / SEAT_PLAN.seat.includedSeatMonthly;
  return Math.max(1, Math.ceil(perSessionCostCents / perStudentSessionCents));
}
export const SEAT_ROOM_FLOOR = seatRoomFloor();

const DAY_MS = 24 * 3600 * 1000;

// ── Pure aggregation ─────────────────────────────────────────────────────────

/**
 * The two comparison windows. `days` back from now is the current period; the
 * same span immediately before it is the previous one, so the two are always
 * the same length and a trend means something.
 */
export function periodBounds(nowMs = Date.now(), days = 30) {
  const span = Math.min(365, Math.max(7, Math.round(Number(days) || 30)));
  const currentToMs = Number(nowMs) || Date.now();
  const currentFromMs = currentToMs - span * DAY_MS;
  const previousFromMs = currentFromMs - span * DAY_MS;
  return {
    days: span,
    currentFromMs,
    currentToMs,
    previousFromMs,
    previousToMs: currentFromMs,
    currentFrom: new Date(currentFromMs).toISOString(),
    currentTo: new Date(currentToMs).toISOString(),
    previousFrom: new Date(previousFromMs).toISOString(),
    previousTo: new Date(currentFromMs).toISOString(),
  };
}

/** Which window a timestamp falls in, or null if it falls in neither. */
export function bucketOf(value, bounds) {
  if (!bounds) return null;
  const t = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(t)) return null;
  if (t >= bounds.currentFromMs && t < bounds.currentToMs) return 'current';
  if (t >= bounds.previousFromMs && t < bounds.previousToMs) return 'previous';
  return null;
}

/** Split rows into the two windows by one timestamp field. */
export function splitByPeriod(rows, field, bounds) {
  const out = { current: [], previous: [] };
  for (const r of rows || []) {
    const bucket = bucketOf(r?.[field], bounds);
    if (bucket) out[bucket].push(r);
  }
  return out;
}

/**
 * The trend comparison. `previous == null` means "no comparable prior figure
 * exists" — a stock with no history, for instance — and is rendered as such
 * rather than as a flat line, which would be a fabricated reassurance.
 */
export function trend(current, previous) {
  const cur = Number(current) || 0;
  if (previous == null) return { current: cur, previous: null, delta: null, changePct: null };
  const prev = Number(previous) || 0;
  // Rounded because averages are decimals: 3.2 - 2.8 is 0.4000000000000004 in
  // binary floating point, and a board that prints that has lost the reader.
  const delta = Math.round((cur - prev) * 100) / 100;
  // Growth from zero has no percentage. 0 → 3 is "up 3 from nothing", not
  // "+300%", and printing an invented multiple on a board a founder plans
  // against is exactly the kind of number this route exists to prevent.
  const changePct = prev === 0 ? null : Math.round((delta / prev) * 100);
  return { current: cur, previous: prev, delta, changePct };
}

/** Count both windows on one timestamp field and compare them. */
export function countByPeriod(rows, field, bounds) {
  const split = splitByPeriod(rows, field, bounds);
  return trend(split.current.length, split.previous.length);
}

/** One sentence a human reads without doing subtraction. */
export function trendLabel(t) {
  if (!t || t.previous == null) return 'no comparable prior period';
  if (t.delta === 0) return `level with ${t.previous} last period`;
  const dir = t.delta > 0 ? 'up' : 'down';
  const pct = t.changePct == null ? '' : ` (${t.changePct > 0 ? '+' : ''}${t.changePct}%)`;
  return `${dir} ${Math.abs(t.delta)}${pct} from ${t.previous} last period`;
}

/**
 * Average held students per seat room. `average` is null when no room ran:
 * printing 0.0 would read as "four empty rooms" rather than "no rooms".
 */
export function averageStudentsPerRoom(rooms, seats) {
  const perRoom = new Map();
  for (const r of rooms || []) perRoom.set(r.id, 0);
  for (const s of seats || []) {
    if (!perRoom.has(s?.group_session_id)) continue;
    if (!HELD_SEAT_STATUSES.includes(s.status)) continue;
    perRoom.set(s.group_session_id, perRoom.get(s.group_session_id) + 1);
  }
  const counts = [...perRoom.values()];
  const students = counts.reduce((a, b) => a + b, 0);
  return {
    rooms: counts.length,
    students,
    average: counts.length ? Math.round((students / counts.length) * 10) / 10 : null,
    belowFloor: counts.filter((c) => c < SEAT_ROOM_FLOOR).length,
  };
}

/**
 * Delivery against the calendar. Cancelled rooms stay in the denominator on
 * purpose: a family was promised that evening, and a board that quietly drops
 * the sessions we called off would report a perfect record for a bad month.
 */
export function deliveredOverScheduled(rooms) {
  const list = rooms || [];
  const delivered = list.filter((r) => r?.status === DELIVERED_STATUS).length;
  const cancelled = list.filter((r) => r?.status === 'cancelled').length;
  return {
    scheduled: list.length,
    delivered,
    cancelled,
    pct: list.length ? Math.round((delivered / list.length) * 100) : null,
  };
}

/**
 * Exit-rating discipline. The denominator is rooms DELIVERED, and the
 * numerator is rooms that got at least one rating — coverage, not volume. A
 * director who writes six ratings for one room and none for the other five has
 * not written exit ratings, and a raw row count would say they had.
 */
export function exitRatingCoverage(rooms, observations) {
  const deliveredIds = new Set((rooms || []).filter((r) => r?.status === DELIVERED_STATUS).map((r) => r.id));
  const ratedRooms = new Set();
  let written = 0;
  for (const o of observations || []) {
    if (!deliveredIds.has(o?.group_session_id)) continue;
    written += 1;
    ratedRooms.add(o.group_session_id);
  }
  return {
    delivered: deliveredIds.size,
    written,
    roomsRated: ratedRooms.size,
    pct: deliveredIds.size ? Math.round((ratedRooms.size / deliveredIds.size) * 100) : null,
  };
}

/** Which series are seat inventory. A standing seat on a Homework Hall series
 * is a member's weekly place (0029), never a seat sale, and counting one as a
 * seat would put a free Hall visit into the MRR line. */
export function seatSeriesIdsOf(seriesRows) {
  return new Set((seriesRows || []).filter((s) => s?.kind === 'standing_seat').map((s) => s.id));
}

/**
 * The seats, as objects — which is the only way to count them honestly.
 *
 * `standing_seats` is unique(series_id, student_id) and a series is ONE weekday
 * (lib/server/series.js). A seat is two sessions a week (SEAT_PLAN
 * sessionsPerWeek = 2), so ONE child in ONE cohort is TWO rows in that table.
 * Counting rows — which the money line used to do — reports every seat twice.
 *
 * So a seat is identified by the student and the cohort they sit in (0038's
 * `group_session_series.cohort_id`, passed in as a series → cohort map). Where
 * the series has not been attached to a cohort yet, every unattached seat
 * series for that child folds into one seat: it undercounts a child who really
 * does sit in two different unwired cohorts, which errs toward not inventing
 * revenue, and it is the failure the cohort id exists to end.
 */
export function foldSeats(standingRows, cohortBySeries = new Map()) {
  const bySeat = new Map();
  for (const r of standingRows || []) {
    if (!r?.student_id) continue;
    const cohortKey = cohortBySeries.get?.(r.series_id) || 'unassigned';
    const key = `${r.student_id}::${cohortKey}`;
    const startedAtMs = Date.parse(r.created_at);
    const endedAtMs = r.ended_at ? Date.parse(r.ended_at) : null;
    const seat = bySeat.get(key) || {
      key,
      payerId: null,
      studentId: r.student_id,
      cohortKey,
      active: false,
      startedAtMs: null,
      endedAtMs: null,
    };
    if (!seat.payerId && r.user_id) seat.payerId = r.user_id;
    seat.active = seat.active || Boolean(r.active);
    if (Number.isFinite(startedAtMs) && (seat.startedAtMs == null || startedAtMs < seat.startedAtMs)) {
      seat.startedAtMs = startedAtMs;
    }
    // One live half means the seat is live: a family attending on Tuesdays only
    // has not left. Otherwise the seat ended when its last half did.
    if (seat.active) seat.endedAtMs = null;
    else if (Number.isFinite(endedAtMs) && (seat.endedAtMs == null || endedAtMs > seat.endedAtMs)) {
      seat.endedAtMs = endedAtMs;
    }
    bySeat.set(key, seat);
  }
  return [...bySeat.values()];
}

/**
 * Retention, which is the only stage of the funnel that cannot be sold twice.
 *
 * The denominator is the seats that were ALREADY RUNNING when this window
 * opened — not seats sold during it, which have not had a chance to leave. A
 * seat that ended inside the window is the leak this measures.
 */
export function seatRetention(seats, bounds) {
  const at = bounds?.currentFromMs;
  if (!Number.isFinite(at)) return { started: 0, retained: 0, lost: 0, pct: null };
  let started = 0;
  let retained = 0;
  for (const s of seats || []) {
    if (!Number.isFinite(s?.startedAtMs) || s.startedAtMs >= at) continue;   // not running yet
    if (s.endedAtMs != null && s.endedAtMs < at) continue;                   // already gone
    started += 1;
    if (s.active) retained += 1;
  }
  return { started, retained, lost: started - retained, pct: started ? Math.round((retained / started) * 100) : null };
}

/**
 * Committed seats against seats actually sitting in a cohort. The gap is the
 * single most useful number on this board: a family paying the seat price who
 * has not been placed in a room is the one failure mode that costs a customer
 * and a refund at once. The reverse gap matters too — a placed family with no
 * seat plan is a room being delivered for free.
 *
 * Both sides are keyed on the PAYER (standing_seats.user_id), because that is
 * who profiles.plan describes; one payer with two children is one family.
 */
export function seatCommitmentGap(payingPayerIds, placedPayerIds) {
  const paying = new Set((payingPayerIds || []).filter(Boolean));
  const placed = new Set((placedPayerIds || []).filter(Boolean));
  let both = 0;
  for (const id of paying) if (placed.has(id)) both += 1;
  return {
    paying: paying.size,
    placed: placed.size,
    payingAndPlaced: both,
    payingButUnplaced: paying.size - both,
    placedButNotPaying: placed.size - both,
  };
}

/**
 * What we are actually entitled to bill, and what we are giving away.
 *
 * ONE PAYING ACCOUNT IS ONE BILLED SEAT, because that is the only thing the
 * billing rail can currently charge:
 *
 *   - Checkout creates the seat subscription as one line item of
 *     `quantity: 1` (app/api/billing/checkout/route.js).
 *   - `profiles.plan` is a single scalar the Stripe webhook flips; it holds a
 *     plan key, not a count.
 *   - `subscriptions` (0001) has no quantity column either, so there is
 *     nowhere for a second child's charge to be recorded even if someone made
 *     it. There is nothing to cross-check against.
 *
 * So a payer with two children placed is charged ONCE. The previous rule here
 * — one billed seat per (student, cohort) placement — reported that family as
 * two seats of MRR against one seat of cash, which is the same doubling this
 * function was written to remove, moved from the weekday to the child. A board
 * whose money line disagrees with Stripe is worse than no money line.
 *
 * Only paying accounts contribute: a placed family with NO seat plan is
 * printed two cards higher as "a room being delivered for free", and free
 * delivery cannot also be MRR.
 *
 * The extra children are not thrown away — they are reported as
 * `extraPlacements`, delivery we are giving away, next to `unbilledSeats`,
 * which is the same giveaway by a family with no plan at all. When per-child
 * billing exists (a subscription quantity, or a seat row per child), the fix
 * is here and in the basis note, together.
 */
export function billableSeats(payingPayerIds, activeSeats) {
  // An array from a test, a Set from buildBoard: both are just a list of ids.
  const paying = new Set([...(payingPayerIds || [])].filter(Boolean));
  const byPayer = new Map();
  for (const s of activeSeats || []) {
    if (!s?.payerId) continue;
    byPayer.set(s.payerId, (byPayer.get(s.payerId) || 0) + 1);
  }
  let atFloor = 0;
  let extraPlacements = 0;
  for (const id of paying) {
    const held = byPayer.get(id) || 0;
    // A family that has paid and has not been placed yet is still being
    // charged, so it still bills a seat — that is the gap card's whole point.
    if (held === 0) atFloor += 1;
    // Everything past the first child is delivered and not billed.
    else if (held > 1) extraPlacements += held - 1;
  }
  let unbilledSeats = 0;
  for (const [id, held] of byPayer) if (!paying.has(id)) unbilledSeats += held;
  return { payers: paying.size, seats: paying.size, atFloor, extraPlacements, unbilledSeats };
}

/**
 * Verified mastery events per student per week. Only rows that satisfy the
 * mastery law count — isConfirming is imported from the engine, never restated
 * here, because a second copy of that predicate is how assisted work starts
 * being reported as mastery.
 *
 * The denominator says which population it is talking about, and the payload
 * carries `basis` so the board can say so out loud:
 *   'seat_cohort'     — the students we are paid to teach (the real question)
 *   'active_learners' — before any seat is placed, everyone who produced any
 *                       evidence at all, so the row is not simply blank
 */
export function masteryPerStudentWeek(evidenceRows, { cohortIds = [], days = 30 } = {}) {
  const rows = (evidenceRows || []).filter(Boolean);
  const cohort = new Set((cohortIds || []).filter(Boolean));
  const basis = cohort.size ? 'seat_cohort' : 'active_learners';
  const learners = basis === 'seat_cohort'
    ? cohort
    : new Set(rows.map((r) => r.user_id).filter(Boolean));
  const confirming = rows.filter((r) => isConfirming(r) && (basis !== 'seat_cohort' || cohort.has(r.user_id)));
  const weeks = Math.max(1, (Number(days) || 0)) / 7;
  return {
    basis,
    events: confirming.length,
    students: learners.size,
    weeks: Math.round(weeks * 10) / 10,
    perStudentPerWeek: learners.size
      ? Math.round((confirming.length / learners.size / weeks) * 100) / 100
      : null,
  };
}

// Money is never typed here: the seat price is SEAT_PLAN, the director's cost
// is directorMonthlyCents(), and both are imported (Hard Rule 2). Contribution
// is allowed to be negative — that is the whole point of showing it before the
// cohort fills — so it gets a signed formatter rather than formatPrice, which
// clamps at zero.
//
// `seatsCoveringDirector` is NOT break-even and is no longer labelled as it
// was. It is director cost ÷ seat price, and the Director is the only cost this
// repo holds as a constant: the other fixed line (insurance, software, hosting,
// phone) and the per-seat variable line (card fees, materials) live in
// docs/UNIT_ECONOMICS.md and in no module the code can import. Printing this
// figure as "seats to break even" put a 6 on the founder's board against the 8
// in the founder's own arithmetic. Until those two costs are constants
// somewhere, the honest thing to print is the one cost we hold, named as that.
export function seatMoney({
  seats = 0, payers = 0, atFloor = 0, extraPlacements = 0, unbilledSeats = 0,
  hoursPerWeek = STAFFING.directorHoursPerWeek,
} = {}) {
  const billed = Math.max(0, Math.round(Number(seats) || 0));
  const seatPriceCents = SEAT_PLAN.seat.priceCents;
  const mrrCents = billed * seatPriceCents;
  const directorCents = directorMonthlyCents(hoursPerWeek);
  return {
    seats: billed,
    payers: Math.max(0, Math.round(Number(payers) || 0)),
    atFloor: Math.max(0, Math.round(Number(atFloor) || 0)),
    extraPlacements: Math.max(0, Math.round(Number(extraPlacements) || 0)),
    unbilledSeats: Math.max(0, Math.round(Number(unbilledSeats) || 0)),
    seatPriceCents,
    mrrCents,
    directorCents,
    contributionCents: mrrCents - directorCents,
    seatsCoveringDirector: Math.ceil(directorCents / seatPriceCents),
    hoursPerWeek: Number(hoursPerWeek) || 0,
  };
}

/** formatPrice, but a loss reads as a loss instead of clamping to zero. */
export function signedPrice(cents) {
  const n = Math.round(Number(cents) || 0);
  return n < 0 ? `−${formatPrice(-n)}` : formatPrice(n);
}

/** Percent or an honest dash — never 0% when the denominator was empty. */
export function pctDisplay(pct) {
  return pct == null ? '—' : `${pct}%`;
}

/** "1 seat", "2 seats". The board is read by a person, not by a log parser. */
export function plural(n, one, many = `${one}s`) {
  return `${n} ${Math.abs(Number(n)) === 1 ? one : many}`;
}

// The interest vocabulary is a closed enum owned by lib/server/interest.js; the
// words a founder reads are here, because nothing else needs them. Anything
// outside the enum — including the legitimate null from a footer capture —
// lands in 'unspecified' rather than being dropped, so the parts always add up
// to the total.
const INTEREST_LABELS = {
  seat: 'seat',
  diagnostic: 'diagnostic',
  homework_hall: 'Homework Hall',
  clinic: 'clinic',
  community_free: 'Community Hall',
  ai: 'AI',
  unspecified: 'unspecified',
};
const interestLabel = (kind) => INTEREST_LABELS[kind] || String(kind).replace(/_/g, ' ');

// The household a capture belongs to. `club_interest.email` is NOT NULL (0027)
// and is the only identity a capture form carries, so it is the key — cased
// down, because a form field is typed by a human and Ada@ and ada@ are one
// family.
//
// A row that somehow arrives without one gets its own key rather than being
// dropped or folded in with every other emailless row. That over-counts the
// denominator, which UNDERSTATES conversion, and understating it is the safe
// direction to be wrong on the board the founder steers by.
export function interestFamilyKey(row, fallback = 'unknown') {
  const email = String(row?.email || '').trim().toLowerCase();
  return email ? `email:${email}` : `row:${row?.id ?? fallback}`;
}

/**
 * Interest, split by what the visitor actually asked for.
 *
 * `total` and `counts` are CAPTURES — rows — which is what "interest captured"
 * means. `seatIntent` is FAMILIES, and the difference matters because it is
 * the denominator of the funnel's first rate and that rate spells its
 * population out in words.
 *
 * club_interest is `unique nulls not distinct (email, kind)` (0027): the pair
 * is unique, the EMAIL is not. So one household that asks about the seat and
 * then comes back and asks about the diagnostic is two rows — and counting
 * those two rows as two families reports a leak that never happened, on the
 * same fraction whose numerator was already careful to count a family buying
 * for two children as one conversion. Both sides are families, or the fraction
 * is nonsense.
 *
 * An AI signup is a real capture and a different funnel, and folding it into
 * the denominator would report a leak every time the free product did its job.
 */
export function interestMix(rows, bounds) {
  const current = splitByPeriod(rows, 'created_at', bounds).current;
  const counts = new Map();
  const seatFamilies = new Set();
  let seatIntentRows = 0;
  current.forEach((r, i) => {
    // readInterestKind, not a bare enum test: rows written before the enum
    // existed still name the companion as ai_plans/ai_solo/ai_hall, and
    // filing those under 'unspecified' hides real captures from the board.
    const kind = readInterestKind(r?.kind) || 'unspecified';
    counts.set(kind, (counts.get(kind) || 0) + 1);
    if (kind !== 'seat' && kind !== 'diagnostic') return;
    seatIntentRows += 1;
    seatFamilies.add(interestFamilyKey(r, i));
  });
  const summary = [...INTEREST_KINDS, 'unspecified']
    .filter((k) => counts.get(k))
    .map((k) => `${interestLabel(k)} ${counts.get(k)}`)
    .join(' · ');
  return {
    total: current.length,
    seatIntent: seatFamilies.size,
    seatIntentRows,
    counts: Object.fromEntries(counts),
    summary,
  };
}

/**
 * One stage-to-stage rate, with its denominator spelled out in words.
 *
 * `unit` is what the denominator COUNTS ("families who asked about a seat or a
 * diagnostic"), and it is required, because the whole point of this block is
 * that no percentage appears without the population it is a percentage of.
 * A rate over an empty denominator is a dash and says so — never 0%.
 */
export function conversionStep({ key, label, numerator, denominator, unit, shape = null, fault = null }) {
  if (fault) {
    return {
      key, label, status: fault.status, display: '—', pct: null,
      numerator: null, denominator: null, basis: null, shape, note: fault.note,
    };
  }
  const num = Math.max(0, Math.round(Number(numerator) || 0));
  const den = Math.max(0, Math.round(Number(denominator) || 0));
  const pct = den ? Math.round((num / den) * 100) : null;
  return {
    key,
    label,
    status: den === 0 ? 'no_data' : 'ok',
    display: pctDisplay(pct),
    pct,
    // The bar the page draws is clamped, the number is not: more diagnostics
    // sold than asks captured is a real thing (a walk-in never fills a form)
    // and a 140% that renders as a full bar is honest in both places.
    barPct: pct == null ? null : Math.max(0, Math.min(100, pct)),
    numerator: num,
    denominator: den,
    basis: `${num} of ${den} ${unit}`,
    shape,
    note: null,
  };
}

// ── The board ────────────────────────────────────────────────────────────────

// One row shape, so the page can map over `rows` without knowing what any of
// them mean. `status` decides the tone: 'not_provisioned' is a build state,
// 'error' is a read failure, 'ok' is a number. `group` decides which of the
// board's three questions it answers.
function boardRow({ key, label, source, display, group = 'funnel', note = null, detail = [], t = null, status = 'ok' }) {
  return {
    key,
    label,
    source,
    group,
    status,
    display,
    value: t ? t.current : null,
    previous: t ? t.previous : null,
    delta: t ? t.delta : null,
    changePct: t ? t.changePct : null,
    trend: t ? trendLabel(t) : null,
    note,
    detail: detail.filter(Boolean),
  };
}

// A read that came back empty because the table is not there yet is a
// different answer from a read that came back empty because nothing happened,
// and the board must never blur the two. Any other failure is reported as a
// failure rather than swallowed into a zero.
function readFault(result, missingNote) {
  const err = result?.error;
  if (!err) return null;
  return isMissingSchema(err)
    ? { status: 'not_provisioned', note: missingNote }
    : { status: 'error', note: err.message };
}

function unreadable(result, { label, key, source, group, missingNote }) {
  const fault = readFault(result, missingNote);
  if (!fault) return null;
  return boardRow({ key, label, source, group, display: '—', status: fault.status, note: fault.note });
}

const rowsOf = (result) => (result && Array.isArray(result.data) ? result.data : []);

// The sentences a not-provisioned row prints, in one place because the
// conversion block and the counts block both need them and they must not drift.
const MISSING = {
  interest: 'The club_interest table is not in this database yet.',
  diagnostic: 'The diagnostic_order table is not in this database yet (migration 0036). '
    + 'Nothing has been sold because nothing can be.',
  profiles: 'The profiles table is not in this database yet.',
  standing: 'The standing_seats table is not in this database yet (migration 0029).',
  series: 'The group_session_series table is not in this database yet.',
  rooms: 'The group_session table is not in this database yet.',
  seats: 'The group_seat table is not in this database yet.',
  observations: 'The group_observation table is not in this database yet.',
  evidence: 'The engine ledger is not in this database yet (migrations 0012/0013), '
    + 'so no evidence can have been recorded.',
};

/** The name a founder can read off the board and act on. */
export function familyEntry(id, directory) {
  const p = directory?.get?.(id) || null;
  const name = (p?.name || '').trim();
  const email = (p?.email || '').trim() || null;
  return {
    id,
    // A truncated id is a poor name, but it is a real handle: it is what the
    // audit log and the Users panel show, so a founder can still find them.
    label: name || email || `account ${String(id).slice(0, 8)}`,
    email: name && email ? email : null,
  };
}

function namedFamilies(ids, directory) {
  const all = [...new Set((ids || []).filter(Boolean))];
  return {
    families: all.slice(0, NAMED_FAMILY_LIMIT).map((id) => familyEntry(id, directory)),
    overflow: Math.max(0, all.length - NAMED_FAMILY_LIMIT),
  };
}

/**
 * The whole board, from raw query results to the JSON the page renders.
 *
 * Separated from GET so the assembly — including every degraded state — is
 * testable without a database. Each argument is a PostgREST result
 * (`{ data, error }`); an absent one is treated as an empty read, which is why
 * the board renders with zero data instead of throwing.
 */
export function buildBoard({
  bounds,
  interest = {}, series = {}, paying = {}, standing = {},
  diagnostic = {}, evidence = {}, rooms = {}, seats = {}, observations = {}, people = {},
} = {}) {
  const rows = [];

  // Only cohorts of kind 'standing_seat' are seat inventory; a standing seat on
  // a Homework Hall series is a member's weekly place (0029), not a seat sale.
  const seriesRows = rowsOf(series);
  const seatSeriesIds = seatSeriesIdsOf(seriesRows);
  const cohortBySeries = new Map(seriesRows.filter((s) => s?.cohort_id).map((s) => [s.id, s.cohort_id]));
  const standingRows = rowsOf(standing).filter((s) => seatSeriesIds.has(s.series_id));
  const allSeats = foldSeats(standingRows, cohortBySeries);
  const activeSeats = allSeats.filter((s) => s.active);

  const roomsByPeriod = splitByPeriod(rowsOf(rooms), 'scheduled_start', bounds);
  const seatRows = rowsOf(seats);
  const observationRows = rowsOf(observations);

  // Who the founder can name and call. Paying profiles arrive with their names
  // attached; the placed-but-not-paying side is looked up separately, because
  // by definition it is not in the paying read.
  const directory = new Map();
  for (const p of [...rowsOf(paying), ...rowsOf(people)]) {
    if (p?.id) directory.set(p.id, { name: p.name || null, email: p.email || null });
  }

  // Faults, resolved once. A stage cannot be measured if any read behind it
  // failed, and the conversion block and the counts block must give the same
  // answer about why.
  const interestFault = readFault(interest, MISSING.interest);
  const diagnosticFault = readFault(diagnostic, MISSING.diagnostic);
  const payingFault = readFault(paying, MISSING.profiles);
  const standingFault = readFault(standing, MISSING.standing) || readFault(series, MISSING.series);
  const seatSideFault = payingFault || standingFault;

  const orders = rowsOf(diagnostic).filter((o) => DIAGNOSTIC_SOLD_STATUSES.includes(o?.status));
  const ordersNow = splitByPeriod(orders, 'created_at', bounds).current;
  const abandonedNow = splitByPeriod(rowsOf(diagnostic).filter((o) => o?.status === 'pending'), 'created_at', bounds).current;
  const mix = interestMix(rowsOf(interest), bounds);

  const gap = seatCommitmentGap(rowsOf(paying).map((p) => p.id), activeSeats.map((s) => s.payerId));
  const payingIds = new Set(rowsOf(paying).map((p) => p.id).filter(Boolean));

  // 1 ── Interest captured.
  if (interestFault) {
    rows.push(boardRow({
      key: 'interest', label: 'Interest captured', source: 'club_interest', group: 'funnel',
      display: '—', status: interestFault.status, note: interestFault.note,
    }));
  } else {
    const t = countByPeriod(rowsOf(interest), 'created_at', bounds);
    rows.push(boardRow({
      key: 'interest',
      label: 'Interest captured',
      source: 'club_interest',
      group: 'funnel',
      display: String(t.current),
      t,
      status: t.current === 0 && t.previous === 0 ? 'no_data' : 'ok',
      detail: [
        mix.summary || null,
        // The number the funnel's first rate divides by, said out loud beside
        // the total it came from, so nobody has to guess which asks counted —
        // and said in the unit it is actually in. The headline counts CAPTURES
        // and this counts FAMILIES, so "N of them" was wrong the moment one
        // household asked twice.
        `${plural(mix.seatIntent, 'family', 'families')} asked about a seat or a diagnostic`
          + (mix.seatIntentRows > mix.seatIntent
            ? ` (${plural(mix.seatIntentRows, 'capture')}; a household that asks twice is still one family)`
            : ''),
      ],
    }));
  }

  // 2 ── Diagnostics sold and delivered. The table lands in migration 0036
  // (spec W3); until then the row says "not built yet" rather than reporting a
  // zero anyone could mistake for "nobody bought one".
  if (diagnosticFault) {
    rows.push(boardRow({
      key: 'diagnostics', label: 'Diagnostics sold', source: 'diagnostic_order', group: 'funnel',
      display: '—', status: diagnosticFault.status, note: diagnosticFault.note,
    }));
  } else {
    // Paid, scheduled or delivered: money taken and a promise made.
    const sold = countByPeriod(orders, 'created_at', bounds);
    const delivered = countByPeriod(orders.filter((o) => o.delivered_at), 'delivered_at', bounds);
    const soldCents = ordersNow.reduce((sum, o) => sum + (Number(o.amount_cents) || 0), 0);
    rows.push(boardRow({
      key: 'diagnostics',
      label: 'Diagnostics sold',
      source: 'diagnostic_order',
      group: 'funnel',
      display: String(sold.current),
      t: sold,
      status: sold.current === 0 && sold.previous === 0 ? 'no_data' : 'ok',
      detail: [
        `${delivered.current} delivered · ${trendLabel(delivered)}`,
        `${formatPrice(soldCents)} collected`,
        sold.current > delivered.current
          ? `${sold.current - delivered.current} paid for and not yet delivered`
          : null,
        abandonedNow.length > 0
          ? `${plural(abandonedNow.length, 'family', 'families')} started a checkout and never paid`
          : null,
      ],
    }));
  }

  // 3 ── Committed seats, cross-checked against who is actually in a room.
  if (payingFault) {
    rows.push(boardRow({
      key: 'seats', label: 'Committed seats', source: "profiles.plan = 'seat'", group: 'funnel',
      display: '—', status: payingFault.status, note: payingFault.note,
    }));
  } else {
    // A stock has no previous period: profiles records the plan a family is on,
    // never the day they moved onto it, so there is no honest prior figure to
    // compare against. The placements row beneath carries the real trend,
    // because standing_seats does keep created_at and ended_at.
    rows.push(boardRow({
      key: 'seats',
      label: 'Committed seats',
      source: "profiles.plan = 'seat'",
      group: 'funnel',
      display: String(gap.paying),
      t: trend(gap.paying, null),
      status: gap.paying === 0 ? 'no_data' : 'ok',
      note: 'No trend: profiles stores the plan a family is on, not the date they moved onto it.',
      detail: [
        `${plural(gap.payingAndPlaced, 'family', 'families')} placed in a cohort`,
        `${plural(gap.payingButUnplaced, 'family', 'families')} paying and NOT placed`,
        gap.placedButNotPaying > 0 ? `${plural(gap.placedButNotPaying, 'family', 'families')} placed with no seat plan` : null,
      ],
    }));
  }

  if (standingFault) {
    rows.push(boardRow({
      key: 'placements', label: 'Seats started', source: 'standing_seats', group: 'funnel',
      display: '—', status: standingFault.status, note: standingFault.note,
    }));
  } else {
    const t = countByPeriod(allSeats, 'startedAtMs', bounds);
    rows.push(boardRow({
      key: 'placements',
      label: 'Seats started',
      source: 'standing_seats',
      group: 'funnel',
      display: String(t.current),
      t,
      status: t.current === 0 && t.previous === 0 ? 'no_data' : 'ok',
      note: 'One child in one cohort is one seat, however many evenings a week it meets.',
      detail: [`${plural(activeSeats.length, 'seat')} running right now`],
    }));
  }

  // 4, 5, 6 ── Everything the seat rooms tell us: delivery against the
  // calendar, how full the rooms were, and whether anyone wrote the exit
  // ratings. All three read the same room set, so all three fail together —
  // and when they do they each say so, rather than three rows quietly becoming
  // five on the page.
  const roomsUnreadable = unreadable(rooms, {
    key: 'delivery', label: 'Seat sessions delivered', source: "group_session, kind 'standing_seat'",
    group: 'delivery', missingNote: MISSING.rooms,
  });
  const deliveryNow = deliveredOverScheduled(roomsByPeriod.current);
  const deliveryBefore = deliveredOverScheduled(roomsByPeriod.previous);
  if (roomsUnreadable) {
    rows.push(roomsUnreadable);
    for (const [key, label, source] of [
      ['occupancy', 'Average students per seat room', 'group_seat held per room'],
      ['exit_ratings', 'Sessions with an exit rating', 'group_observation'],
    ]) {
      rows.push(boardRow({
        key, label, source, group: 'delivery', display: '—',
        status: roomsUnreadable.status,
        note: `Depends on the seat rooms, which could not be read: ${roomsUnreadable.note}`,
      }));
    }
  } else {
    rows.push(boardRow({
      key: 'delivery',
      label: 'Seat sessions delivered',
      source: "group_session, kind 'standing_seat'",
      group: 'delivery',
      display: `${deliveryNow.delivered} / ${deliveryNow.scheduled}`,
      t: trend(deliveryNow.delivered, deliveryBefore.delivered),
      status: deliveryNow.scheduled === 0 && deliveryBefore.scheduled === 0 ? 'no_data' : 'ok',
      detail: [
        `${pctDisplay(deliveryNow.pct)} of the rooms that were on the calendar`,
        deliveryNow.cancelled > 0 ? `${deliveryNow.cancelled} cancelled (still counted as promised)` : null,
      ],
    }));

    // The rooms read fine; the SEATS in them are a separate query and can fail
    // on their own. rowsOf() turns any error into [], which would render a room
    // full of students as an average of 0.0 — a plausible-looking measurement
    // built from a failed read. Say it could not be read instead.
    const seatsUnreadable = unreadable(seats, {
      key: 'occupancy', label: 'Average students per seat room', source: 'group_seat held per room',
      group: 'delivery', missingNote: MISSING.seats,
    });
    if (seatsUnreadable) { rows.push(seatsUnreadable); } else {
      const occNow = averageStudentsPerRoom(roomsByPeriod.current, seatRows);
      const occBefore = averageStudentsPerRoom(roomsByPeriod.previous, seatRows);
      rows.push(boardRow({
        key: 'occupancy',
        label: 'Average students per seat room',
        source: 'group_seat held per room',
        group: 'delivery',
        display: occNow.average == null ? '—' : occNow.average.toFixed(1),
        t: trend(occNow.average || 0, occBefore.average),
        status: occNow.rooms === 0 ? 'no_data' : 'ok',
        note: occNow.average != null && occNow.average < SEAT_ROOM_FLOOR
          ? `Under ${SEAT_ROOM_FLOOR} students a room stops covering what it costs to run — and every empty chair is capacity the dial cannot get back.`
          : null,
        detail: [
          `${plural(occNow.students, 'held place')} across ${plural(occNow.rooms, 'room')}`,
          occNow.belowFloor > 0 ? `${plural(occNow.belowFloor, 'room')} ran under ${SEAT_ROOM_FLOOR}` : null,
        ],
      }));
    }

    // Same for the ratings. "0 of 12 rated" is the single most alarming number
    // on this board and the director gets asked about it — it must never be an
    // unread query wearing a measurement's clothes.
    const observationsUnreadable = unreadable(observations, {
      key: 'exit_ratings', label: 'Sessions with an exit rating', source: 'group_observation',
      group: 'delivery', missingNote: MISSING.observations,
    });
    if (observationsUnreadable) { rows.push(observationsUnreadable); } else {
      const ratingsNow = exitRatingCoverage(roomsByPeriod.current, observationRows);
      const ratingsBefore = exitRatingCoverage(roomsByPeriod.previous, observationRows);
      rows.push(boardRow({
        key: 'exit_ratings',
        label: 'Sessions with an exit rating',
        source: 'group_observation',
        group: 'delivery',
        display: `${ratingsNow.roomsRated} / ${ratingsNow.delivered}`,
        t: trend(ratingsNow.roomsRated, ratingsBefore.roomsRated),
        status: ratingsNow.delivered === 0 && ratingsBefore.delivered === 0 ? 'no_data' : 'ok',
        detail: [
          `${pctDisplay(ratingsNow.pct)} of delivered rooms`,
          `${plural(ratingsNow.written, 'individual rating')} written`,
        ],
      }));
    }
  }

  // 7 ── Verified mastery per student per week. The mastery law decides what
  // counts, and isConfirming IS the law — imported, never restated.
  const evidenceFault = readFault(evidence, MISSING.evidence);
  if (evidenceFault) {
    rows.push(boardRow({
      key: 'mastery', label: 'Verified mastery per student per week', source: 'evidence',
      group: 'delivery', display: '—', status: evidenceFault.status, note: evidenceFault.note,
    }));
  } else {
    const cohortIds = [...new Set(activeSeats.map((s) => s.studentId).filter(Boolean))];
    const split = splitByPeriod(rowsOf(evidence), 'at', bounds);
    const now = masteryPerStudentWeek(split.current, { cohortIds, days: bounds?.days });
    const before = masteryPerStudentWeek(split.previous, { cohortIds, days: bounds?.days });
    rows.push(boardRow({
      key: 'mastery',
      label: 'Verified mastery per student per week',
      source: 'evidence (isConfirming rows only)',
      group: 'delivery',
      display: now.perStudentPerWeek == null ? '—' : now.perStudentPerWeek.toFixed(2),
      // Trend the RATE that is displayed beside it. Trending the raw event
      // count here printed "up 2 (+200%)" next to a headline of "0.70", which
      // is two different quantities in one row on a board whose only job is
      // that the reader never has to reconcile two numbers.
      t: trend(now.perStudentPerWeek, before.perStudentPerWeek),
      status: now.students === 0 ? 'no_data' : 'ok',
      note: now.basis === 'seat_cohort'
        ? 'Counted across the students holding an active seat.'
        : 'No seat is placed yet, so this counts every student who produced any evidence.',
      detail: [
        `${plural(now.events, 'confirming event')} across ${plural(now.students, 'student')} over ${now.weeks} weeks`,
        // Says what isConfirming actually checks. The predicate enforces the
        // kind of evidence, that it was unassisted, and how it was verified —
        // it does not enforce the delay. The delay is enforced where a check is
        // scheduled (check_floor_at), which is a real guarantee but a different
        // one, and overstating it on the founder's own board is how it ends up
        // overstated on a parent's.
        'Unassisted and verified only — assisted work is never counted. Retention checks are scheduled after a delay; this count does not itself re-check that.',
      ],
    }));
  }

  // ── The three rates that make this a funnel ────────────────────────────────
  //
  // Two of them follow the SAME families from one stage to the next; the first
  // cannot, because a capture form and a Checkout session share no key we
  // trust — an interest email is typed by hand and need not be the account's.
  // So it is a ratio of two counts inside one window and says so, rather than
  // implying a cohort it did not track.
  const retention = seatRetention(allSeats, bounds);
  const diagnosticBuyers = new Set(ordersNow.map((o) => o.payer_id).filter(Boolean));
  let boughtAndSeated = 0;
  for (const id of diagnosticBuyers) if (payingIds.has(id)) boughtAndSeated += 1;

  const steps = [
    conversionStep({
      key: 'interest_to_diagnostic',
      label: 'Interest → diagnostic',
      // Families on both sides of the fraction, never asks over orders: one
      // family buying a diagnostic for two children is one family converted.
      numerator: diagnosticBuyers.size,
      denominator: mix.seatIntent,
      unit: 'families who asked about a seat or a diagnostic',
      shape: 'Asks and buyers counted inside this window, not one cohort followed — a capture form and a purchase share no key.',
      fault: interestFault || diagnosticFault,
    }),
    conversionStep({
      key: 'diagnostic_to_seat',
      label: 'Diagnostic → seat',
      numerator: boughtAndSeated,
      denominator: diagnosticBuyers.size,
      unit: 'families who bought a diagnostic in this window',
      shape: 'The same families, followed: each one is on a seat plan today, or is not. A diagnostic bought this week has barely had time.',
      fault: diagnosticFault || seatSideFault,
    }),
    conversionStep({
      key: 'seat_to_retained',
      label: 'Seat → retained',
      numerator: retention.retained,
      denominator: retention.started,
      unit: 'seats that were already running when this window opened',
      shape: 'Seats sold inside the window are excluded: they have not had a chance to leave.',
      fault: seatSideFault,
    }),
  ];

  const conversion = {
    steps,
    // The state the founder lives in for the whole of Wave 1, and the one the
    // board must not fake: every denominator empty means nobody has entered the
    // funnel, which is not the same as nobody converting.
    allEmpty: steps.every((s) => s.status === 'no_data'),
    emptyNote: 'Nobody has entered the funnel yet, so every rate is 0 of 0. '
      + 'These start answering with the first interest form.',
  };

  // Money is emitted only when BOTH reads behind it succeeded. Computing it
  // from rowsOf(paying) regardless of paying.error turned a statement timeout
  // into a zero MRR and a full month of director cost, rendered as measurement
  // rather than as the failed read it was — and a fabricated number is worse
  // than a missing one on the one board the founder steers by.
  const gapReadable = !seatSideFault;
  const billable = billableSeats(payingIds, activeSeats);
  const money = gapReadable ? seatMoney(billable) : null;

  const unplaced = namedFamilies(
    [...payingIds].filter((id) => !activeSeats.some((s) => s.payerId === id)),
    directory,
  );
  const freeDelivery = namedFamilies(
    activeSeats.map((s) => s.payerId).filter((id) => id && !payingIds.has(id)),
    directory,
  );

  return {
    windowDays: bounds?.days ?? null,
    period: bounds
      ? {
          currentFrom: bounds.currentFrom,
          currentTo: bounds.currentTo,
          previousFrom: bounds.previousFrom,
          previousTo: bounds.previousTo,
        }
      : null,
    groups: BOARD_GROUPS,
    conversion,
    rows,
    // The gap card is the number this board exists for — families paying for a
    // seat who are in no room. It is emitted only when all three reads behind
    // it landed, because "0 paying with no seat in a room" printed off a failed
    // profiles read is the most reassuring possible way to be wrong.
    //
    // It NAMES them, because you cannot enrol an integer. The card used to say
    // "enrol them in a seat cohort before the next billing date" and name
    // nobody, which left the founder to go and work out who "them" was.
    gap: gapReadable
      ? {
          ...gap,
          headline: `${gap.payingButUnplaced} paying with no seat in a room`,
          unplaced: unplaced.families,
          unplacedOverflow: unplaced.overflow,
          freeDelivery: freeDelivery.families,
          freeDeliveryOverflow: freeDelivery.overflow,
          // Where the work is actually done. The enrolment console takes the
          // payer's email and the student's, which is why the card prints them.
          consoleHref: '/admin',
          consoleLabel: 'Open the console',
          action: 'Place each of them from the “Seat cohorts” panel on the console — it takes the payer’s email and the student’s.',
          freeAction: 'A seat is being delivered with no plan behind it. Either start the plan or end the placement.',
          // With nobody sold yet, "everyone is placed" is true and useless, and
          // it reads as reassurance. Say which of the two nothings this is.
          settled: gap.paying === 0 && gap.placed === 0
            ? 'No seat has been sold yet, so there is nobody to place.'
            : 'Every paying family is in a room, and every family in a room is paying.',
        }
      : null,
    money: money
      ? {
          ...money,
          seatPriceDisplay: formatPrice(money.seatPriceCents),
          mrrDisplay: formatPrice(money.mrrCents),
          directorDisplay: formatPrice(money.directorCents),
          contributionDisplay: signedPrice(money.contributionCents),
          seatLabel: `${plural(money.seats, 'seat subscription')}, one per paying account`,
          coverageNote: `${money.seatsCoveringDirector} seats cover the Program Director at ${money.hoursPerWeek} hours a week. `
            + 'That is not break-even: the other fixed costs and the per-seat variable costs are not constants in the pricing module, '
            + 'so the whole-business figure in docs/UNIT_ECONOMICS.md is higher than this one.',
          // Says what the billing rail can actually charge, because that is
          // what this line reports. Checkout creates one subscription of
          // quantity 1, profiles.plan is one plan key, and `subscriptions` has
          // no quantity column — so a second child bills nothing today, and
          // the board counts it as delivery given away rather than as revenue.
          basisNote: 'Billed off what the card is actually charged: one seat subscription per paying account. '
            + 'Checkout creates a single subscription of quantity one and profiles.plan holds one plan, '
            + 'so a second child in a room bills nothing until per-child billing exists.'
            + (money.atFloor
              ? ` ${plural(money.atFloor, 'account is', 'accounts are')} paying with nobody placed yet — still billed, still counted here.`
              : '')
            + (money.extraPlacements
              ? ` ${plural(money.extraPlacements, 'further child', 'further children')} sitting in a room beyond the one seat their family pays for: delivered, not billed.`
              : '')
            + (money.unbilledSeats ? ` Placed seats with no seat plan behind them are counted here as nothing: ${money.unbilledSeats} today.` : ''),
        }
      : null,
  };
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) {
    return Response.json(
      { error: 'Supabase is not configured, so there is no funnel to read.' },
      { status: 501 },
    );
  }

  const bounds = periodBounds(Date.now(), Number(new URL(req.url).searchParams.get('days')) || 30);

  // Pass one. Every read is bounded: this route is opened a few times a week,
  // and an unbounded scan on an admin screen is a slow page, not a feature.
  const [interest, series, paying, standing, diagnostic, evidence, rooms] = await Promise.all([
    // `email` is selected because the funnel's first rate divides by FAMILIES,
    // and club_interest is unique on (email, kind) rather than on email — the
    // address is the only thing that folds one household's two asks into one.
    svc.from('club_interest').select('id,email,kind,created_at').gte('created_at', bounds.previousFrom).limit(5000),
    svc.from('group_session_series').select('id,kind,cohort_id').limit(2000),
    // The names come back with the plan because the gap card names families;
    // an admin route is the only place this list is ever assembled.
    svc.from('profiles').select('id,email,name').eq('plan', 'seat').limit(2000),
    svc.from('standing_seats').select('id,series_id,user_id,student_id,active,created_at,ended_at').limit(2000),
    svc.from('diagnostic_order')
      .select('id,payer_id,status,amount_cents,created_at,delivered_at')
      .gte('created_at', bounds.previousFrom)
      .limit(2000),
    svc.from('evidence')
      .select('user_id,at,kind,assisted,verified_by')
      .gte('at', bounds.previousFrom)
      .limit(10000),
    // Only rooms that have already STARTED are judged: a room on next Tuesday
    // is not an undelivered session.
    svc.from('group_session')
      .select('id,status,scheduled_start,scheduled_end')
      .eq('kind', 'standing_seat')
      .gte('scheduled_start', bounds.previousFrom)
      .lt('scheduled_start', bounds.currentTo)
      .limit(2000),
  ]);

  // Pass two: what happened inside those rooms, and who is in them. Each read
  // is skipped when its `.in()` list would be empty, because `.in()` on an
  // empty list is a query with no answer.
  const roomIds = rowsOf(rooms).map((r) => r.id);
  const seatSeriesIds = seatSeriesIdsOf(rowsOf(series));
  const placedPayerIds = [...new Set(
    rowsOf(standing)
      .filter((s) => s.active && seatSeriesIds.has(s.series_id))
      .map((s) => s.user_id)
      .filter(Boolean),
  )].slice(0, 200);
  const empty = { data: [] };
  const [seats, observations, people] = await Promise.all([
    roomIds.length
      ? svc.from('group_seat').select('group_session_id,student_id,status').in('group_session_id', roomIds).limit(10000)
      : empty,
    roomIds.length
      ? svc.from('group_observation').select('group_session_id,student_id,kc_id').in('group_session_id', roomIds).limit(10000)
      : empty,
    // The placed families who are NOT in the paying read above, so the "free
    // delivery" side of the gap can be named too. A failed read here costs
    // names, never numbers.
    placedPayerIds.length
      ? svc.from('profiles').select('id,email,name').in('id', placedPayerIds).limit(200)
      : empty,
  ]);

  return Response.json(buildBoard({
    bounds, interest, series, paying, standing, diagnostic, evidence, rooms, seats, observations, people,
  }));
}
