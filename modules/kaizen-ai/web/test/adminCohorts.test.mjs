// The Director's console, from the two questions it could not answer (spec W2,
// docs/superpowers/specs/2026-09-02-wave2-geometry.md; evidence in
// 2026-09-02-wave2-audit.md).
//
// The audit's finding about /admin was that it had sixteen panels and none of
// them was tonight: `ClassesSection` is the only room surface and its route
// filters `.gt('scheduled_start', now)`, so a room IN PROGRESS was invisible —
// the console modelled the CATALOGUE of rooms and never the OCCASION. The
// second finding was that migration 0038 added the `cohort` table and
// `group_session_series.cohort_id` and nothing in the product wrote either one,
// so the standing seat — the business's only recurring product — still existed
// as two unrelated weekly series that a person had to remember to link.
//
// HOW THIS FILE IS SPLIT, AND WHY.
// Most of it is UNIT TESTS against the routes' own exported helpers, with a
// PostgREST-shaped stub, because the defects this console keeps producing are
// all the same defect: a read that FAILED rendering as a fact that is merely
// small. "No rooms tonight", "no tutor on this room", "0 of 4 places taken" and
// "we could not ask" look identical on a screen and are told apart by one flag,
// so every read here is exercised twice — once answering rows, once answering
// `{ data: null, error }` the way supabase-js actually does (it RESOLVES its
// errors; it does not throw).
// The rest is source assertions, and only where there is no runtime seam:
// /admin is a client component with JSX and this rig has no renderer, and the
// route handlers themselves resolve a caller through Supabase before they do
// anything. Those assertions are kept narrow and each one says what it cannot
// see.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND_DEFAULTS, SEAT_PLAN, SALE_STATUS, forSale } from '@/lib/server/clubPricing.js';
import { CLUB_TIMEZONE } from '@/lib/roomTime.js';
import { tonightBoard, tonightResponse } from '@/app/api/admin/classes/route.js';
import {
  attachRefusal, adoptionPatch, placesTaken, validateSlots, validateCohort,
} from '@/app/api/admin/cohorts/route.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const cohorts = src('app/api/admin/cohorts/route.js');
const classes = src('app/api/admin/classes/route.js');
const grant = src('app/api/admin/grant-plan/route.js');
const adminPage = src('app/admin/page.js');
const migration0033 = fs.readFileSync(
  path.join(webRoot, '..', 'supabase', 'migrations', '0033_standing_seat.sql'), 'utf8',
);

// ── A PostgREST-shaped stub ──────────────────────────────────────────────────
// Enough of the supabase-js chain for the reads under test, and — the point of
// the whole file — able to answer `{ data: null, error }` rather than throwing.
// Every call is recorded so a test can assert the QUERY that was issued and not
// merely the answer that came back.
function stubSvc(handlers = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, select: null, eq: {}, in: {}, gte: {}, lt: {}, order: [], limit: null };
      calls.push(call);
      const run = () => {
        const h = handlers[table];
        return Promise.resolve(typeof h === 'function' ? h(call) : h).then((r) => {
          if (r && !Array.isArray(r) && typeof r === 'object' && ('data' in r || 'error' in r)) {
            return { data: r.data ?? null, error: r.error ?? null };
          }
          return { data: r ?? [], error: null };
        });
      };
      const chain = {
        select(cols) { call.select = cols ?? null; return chain; },
        eq(c, v) { call.eq[c] = v; return chain; },
        in(c, v) { call.in[c] = v; return chain; },
        gte(c, v) { call.gte[c] = v; return chain; },
        lt(c, v) { call.lt[c] = v; return chain; },
        order(c, o) { call.order.push({ column: c, ...(o || {}) }); return chain; },
        limit(n) { call.limit = n; return chain; },
        maybeSingle() {
          return run().then((r) => ({
            data: Array.isArray(r.data) ? (r.data[0] ?? null) : (r.data ?? null),
            error: r.error,
          }));
        },
        then(ok, no) { return run().then(ok, no); },
      };
      return chain;
    },
  };
}

const READ_FAILED = { data: null, error: { message: 'connection reset' } };
const callTo = (svc, table) => svc.calls.find((c) => c.table === table);
const rejectsWith = (fn, message) => assert.rejects(fn, (err) => {
  assert.equal(err?.message, message);
  return true;
});

// The lineup both the route and the picker derive. Written once here so the
// test asserts the DECISION, and then asserts that neither file has gone back
// to typing it out.
const GRANT_PLANS = [
  'free',
  ...Object.keys(SALE_STATUS).filter(forSale),
  ...Object.keys(SALE_STATUS).filter((p) => !forSale(p)),
  'student', 'family', 'internal',
];

// ── The plan a family actually pays for is grantable ─────────────────────────

test('the one recurring product on sale can be granted', () => {
  // This is the whole defect: `seat` was in neither the picker nor the route's
  // PLANS array, so the plan a standing-seat family holds was the one plan a
  // director could not put on an account — every comp, every refund fix and
  // every "put them on it while Stripe catches up" needed hand-written SQL.
  assert.ok(GRANT_PLANS.includes('seat'), 'seat must be grantable');
  assert.ok(forSale('seat'), 'and it is the plan that is actually for sale');
});

test('the grantable lineup is derived from clubPricing, not retyped', () => {
  // A typed array cannot follow the price sheet; that is how it fell behind in
  // the first place. Both the route that ACCEPTS a plan and the picker that
  // OFFERS one derive from the same expression, so they cannot disagree about
  // what exists. Source, because the picker is JSX and the route's list is not
  // reachable without a caller.
  for (const [label, text] of [['grant-plan route', grant], ['admin console', adminPage]]) {
    assert.match(text, /Object\.keys\(SALE_STATUS\)\.filter\(forSale\)/, label);
    assert.match(text, /Object\.keys\(SALE_STATUS\)\.filter\(\(p\) => !forSale\(p\)\)/, label);
    assert.match(text, /\{[^}]*SALE_STATUS[^}]*\} from '@\/lib\/server\/clubPricing'/, label);
    assert.doesNotMatch(
      text, /\['free', 'club', 'plus', 'max', 'student', 'family', 'internal'\]/,
      `${label} must not restate the old typed lineup`,
    );
  }
});

test('everything grantable is a plan the database will actually accept', () => {
  // The other end of the same decision. profiles.plan carries a CHECK
  // constraint (0033); a derived list that outruns it would hand the director a
  // picker whose choices 500 on save.
  const allowed = new Set(
    [...migration0033.matchAll(/check \(plan in \(([^)]*)\)\)/g)]
      .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((q) => q[1])),
  );
  assert.ok(allowed.size > 0, 'the CHECK constraint should be readable from 0033');
  for (const plan of GRANT_PLANS) {
    assert.ok(allowed.has(plan), `profiles.plan has no place for "${plan}"`);
  }
});

test('a retired tier is offered as retired, never as a sale', () => {
  // They stay grantable — /terms discloses them and a support case may need
  // one — but the picker says what they are.
  assert.match(adminPage, /SALE_STATUS\[plan\] === 'retired' \? ' · retired' : ''/);
});

// ── Tonight: the occasion, not the catalogue ─────────────────────────────────
//
// Every case below runs the real board against the stub. The room times are
// built from the board's OWN dayStart, read off a first empty call, so the
// tests mean the same thing at 4 PM and at one minute past midnight.

const MIN = 60e3;
async function dayWindow() {
  const probe = await tonightBoard(stubSvc({ group_session: [] }), 'admin-user');
  return {
    dayStart: Date.parse(probe.dayStart),
    dayEnd: Date.parse(probe.dayEnd),
    now: Date.parse(probe.now),
    probe,
  };
}

const room = (over) => ({
  id: 'r', series_id: 's', tutor_id: null, subject: 'Math', topic: null, kind: 'standing_seat',
  venue: 'Cedar Park library', timezone: CLUB_TIMEZONE, status: 'scheduled', capacity: 4,
  scheduled_start: new Date().toISOString(), scheduled_end: new Date().toISOString(), ...over,
});

test('an empty day is an empty day, and says nothing else', async () => {
  const board = await tonightBoard(stubSvc({ group_session: [] }), 'admin-user');
  assert.deepEqual(board.rooms, []);
  assert.deepEqual(board.owed, []);
  assert.equal(board.truncated, false);
  // The one flag that separates "nothing is on" from "we could not ask".
  assert.ok(!board.unavailable, 'a quiet evening is not a failure');
  assert.equal(board.timezone, CLUB_TIMEZONE);
});

test('"today" is the club\'s own day, midnight to midnight', async () => {
  // On Vercel the server's day is UTC, where a 6 PM Austin room belongs to
  // tomorrow from 7 PM onward — the same class of bug as rendering a room's
  // time in the reader's zone (lib/roomTime.js).
  const { dayStart, dayEnd } = await dayWindow();
  const wall = (ms) => new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE, hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ms));
  assert.equal(wall(dayStart), '00:00', 'the window opens at midnight in the club\'s zone');
  assert.equal(wall(dayEnd), '00:00', 'and closes at the NEXT midnight');
  // 23, 24 or 25 hours: a club day is not 24 hours twice a year, and a fixed
  // day length silently drops the rooms in the hour that moved.
  const hours = (dayEnd - dayStart) / 3600e3;
  assert.ok([23, 24, 25].includes(hours), `a club day is 23/24/25 hours, got ${hours}`);
  assert.equal(CLUB_TIMEZONE, 'America/Chicago');
});

test('the board sees the room that is running right now', async () => {
  // The defect the view exists for: the catalogue query is future-only, so a
  // room in progress appeared on no screen the Director has.
  const { dayStart, now } = await dayWindow();
  const start = Math.max(dayStart, now - 5 * MIN);
  const svc = stubSvc({
    group_session: [room({ id: 'live', scheduled_start: new Date(start).toISOString(), scheduled_end: new Date(now + 40 * MIN).toISOString() })],
    group_seat: [
      { group_session_id: 'live', student_id: 'a', status: 'attended' },
      { group_session_id: 'live', student_id: 'b', status: 'booked' },
      { group_session_id: 'live', student_id: 'c', status: 'cancelled' },
    ],
    group_observation: [],
  });
  const board = await tonightBoard(svc, 'admin-user');
  assert.equal(board.rooms.length, 1);
  const [r] = board.rooms;
  assert.equal(r.phase, 'now');
  // The roster is who was expected in the room: a cancelled seat was never
  // there, so it is neither booked nor somebody to rate.
  assert.equal(r.booked, 2);
  assert.equal(r.present, 1);
  assert.equal(r.attendanceMarked, true);
  assert.equal(r.needsRatings, false, 'a room still running owes nothing yet');
  // The room's own zone travels with the instant; the reader's clock never does.
  assert.equal(r.timezone, CLUB_TIMEZONE);
  assert.equal(r.venue, 'Cedar Park library');
  // And the window that found it opens at midnight rather than at `now` — the
  // stub answers whatever it is handed, so the QUERY is asserted directly.
  const q = callTo(svc, 'group_session');
  assert.equal(
    Date.parse(q.gte.scheduled_start),
    Date.parse(board.dayStart) - board.lookbackDays * 864e5,
    'the read opens at midnight minus the lookback, never at `now`',
  );
  assert.equal(Date.parse(q.lt.scheduled_start), Date.parse(board.dayEnd));
  // Newest first under the limit: an ascending read would spend the whole limit
  // on last week and cut TODAY, which is the one day this board exists to show.
  assert.deepEqual(q.order, [{ column: 'scheduled_start', ascending: false }]);
  assert.ok(q.limit > 0, 'a mis-seeded database must not hand the console thousands');
});

test('a room that ran and was not rated is what the board is for', async () => {
  const { dayStart, now } = await dayWindow();
  const start = Math.max(dayStart, now - 3 * 60 * MIN);
  const end = Math.min(now, start + 75 * MIN);
  const svc = stubSvc({
    group_session: [
      room({ id: 'done', scheduled_start: new Date(start).toISOString(), scheduled_end: new Date(end).toISOString(), status: 'completed' }),
      room({ id: 'empty', scheduled_start: new Date(start).toISOString(), scheduled_end: new Date(end).toISOString(), status: 'completed' }),
      room({ id: 'off', scheduled_start: new Date(start).toISOString(), scheduled_end: new Date(end).toISOString(), status: 'cancelled' }),
    ],
    group_seat: [
      { group_session_id: 'done', student_id: 'a', status: 'attended' },
      { group_session_id: 'done', student_id: 'b', status: 'attended' },
      { group_session_id: 'done', student_id: 'c', status: 'no_show' },
      { group_session_id: 'off', student_id: 'd', status: 'booked' },
    ],
    group_observation: [{ group_session_id: 'done', student_id: 'a' }],
  });
  const board = await tonightBoard(svc, 'admin-user');
  const by = Object.fromEntries(board.rooms.map((r) => [r.id, r]));
  assert.equal(by.done.phase, 'done');
  assert.equal(by.done.rated, 1);
  assert.equal(by.done.booked, 2, 'a marked no-show is not somebody to rate');
  assert.equal(by.done.noShow, 1);
  assert.equal(by.done.needsRatings, true);
  // A room nobody was booked into owes nobody a rating.
  assert.equal(by.empty.needsRatings, false);
  // A cancelled room is never "owed" anything, whoever was booked into it.
  assert.equal(by.off.phase, 'cancelled');
  assert.equal(by.off.needsRatings, false);
});

test('last week\'s unrated room is carried, last week\'s finished one is not', async () => {
  const { dayStart } = await dayWindow();
  const old = (id) => ({
    scheduled_start: new Date(dayStart - 3 * 864e5).toISOString(),
    scheduled_end: new Date(dayStart - 3 * 864e5 + 75 * MIN).toISOString(),
    status: 'completed', id,
  });
  const svc = stubSvc({
    group_session: [room(old('stale')), room(old('settled'))],
    group_seat: [
      { group_session_id: 'stale', student_id: 'a', status: 'attended' },
      { group_session_id: 'settled', student_id: 'b', status: 'attended' },
    ],
    group_observation: [{ group_session_id: 'settled', student_id: 'b' }],
  });
  const board = await tonightBoard(svc, 'admin-user');
  assert.deepEqual(board.rooms, [], 'earlier days are not today');
  assert.deepEqual(board.owed.map((r) => r.id), ['stale'], 'a rated Tuesday is finished business');
  assert.equal(board.lookbackDays, 7);
});

test('only the room\'s own tutor is offered the console; everyone else is told who to call', async () => {
  const { dayStart, now } = await dayWindow();
  const start = Math.max(dayStart, now - 2 * 60 * MIN);
  const at = (id, tutor) => room({
    id, tutor_id: tutor,
    scheduled_start: new Date(start).toISOString(),
    scheduled_end: new Date(Math.min(now, start + 75 * MIN)).toISOString(),
  });
  const svc = stubSvc({
    group_session: [at('mine', 't1'), at('theirs', 't2'), at('nobody', null)],
    group_seat: [{ group_session_id: 'mine', student_id: 'a', status: 'attended' }],
    group_observation: [],
    tutors: [
      { id: 't1', display_name: 'Ada', user_id: 'admin-user' },
      { id: 't2', display_name: 'Grace', user_id: 'someone-else' },
    ],
  });
  const board = await tonightBoard(svc, 'admin-user');
  const by = Object.fromEntries(board.rooms.map((r) => [r.id, r]));
  assert.equal(by.mine.yours, true);
  assert.equal(by.mine.tutorName, 'Ada');
  assert.equal(by.theirs.yours, false, 'only the tutor who was in the room writes its ratings');
  assert.equal(by.theirs.tutorName, 'Grace', 'and the board names who to call');
  assert.equal(by.nobody.tutorName, null, 'an unstaffed room genuinely has nobody on it');
  // Only the tutors actually on the board are read.
  assert.deepEqual(callTo(svc, 'tutors').in.id.sort(), ['t1', 't2']);
});

test('every failed read on the board is a failure, not a quiet evening', async () => {
  // Hard Rule 6, and the reason this test enumerates all four reads: three of
  // them were checked and the fourth was not, so a dropped tutors read printed
  // "No tutor on this room" on EVERY room and took the console link away from
  // the person standing in it.
  const { dayStart, now } = await dayWindow();
  const rows = [room({
    id: 'x', tutor_id: 't1',
    scheduled_start: new Date(Math.max(dayStart, now - 5 * MIN)).toISOString(),
    scheduled_end: new Date(now + 40 * MIN).toISOString(),
  })];
  const ok = {
    group_session: rows,
    group_seat: [{ group_session_id: 'x', student_id: 'a', status: 'attended' }],
    group_observation: [],
    tutors: [{ id: 't1', display_name: 'Ada', user_id: 'admin-user' }],
  };
  for (const table of ['group_session', 'group_seat', 'group_observation', 'tutors']) {
    const board = await tonightBoard(stubSvc({ ...ok, [table]: READ_FAILED }), 'admin-user');
    assert.equal(board.unavailable, true, `a failed ${table} read must say so`);
    assert.deepEqual(board.rooms, [], `a failed ${table} read must not shape rooms`);
    assert.deepEqual(board.owed, []);
  }
  // …and the same board with every read answering is not flagged.
  const good = await tonightBoard(stubSvc(ok), 'admin-user');
  assert.ok(!good.unavailable);
  assert.equal(good.rooms.length, 1);
  assert.equal(good.rooms[0].tutorName, 'Ada');
});

test('an unreachable board is a failed response, not a 200 with nothing in it', async () => {
  // The flag alone was not enough: wrapped in a 200 it is a footnote, and a
  // caller that checks `res.ok` renders a well-formed board with no rooms in it
  // — which is exactly the empty evening the flag exists to prevent.
  const failed = await tonightBoard(stubSvc({ group_session: READ_FAILED }), 'admin-user');
  const res = tonightResponse(failed);
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.match(body.error, /could not be read/i);
  assert.equal(body.tonight.unavailable, true);
  // A real board is a plain 200 and carries no error sentence.
  const fine = tonightResponse(await tonightBoard(stubSvc({ group_session: [] }), 'admin-user'));
  assert.equal(fine.status, 200);
  const okBody = await fine.json();
  assert.equal(okBody.error, undefined);
  assert.deepEqual(okBody.tonight.rooms, []);
});

test('the console reads the flag as a failure, not as data', () => {
  // Source, because /admin is JSX and this rig has no renderer: what the panel
  // RENDERS can only be read off the file. The behaviour above makes the 200
  // impossible; this makes the panel safe even if it comes back.
  assert.match(adminPage, /if \(!res\.ok \|\| !d\.tonight \|\| d\.tonight\.unavailable\) \{/);
  assert.match(adminPage, /fail\(d\.error \|\| 'Today’s rooms could not be loaded\.', d\.tonight\);/);
  // fail() clears the two stat cards rather than leaving a measured-looking 0.
  assert.match(adminPage, /const fail = \(why, seed\) => \{[\s\S]{0,400}?onLoad\?\.\(null\);/);
  assert.match(adminPage, /tonight \? tonight\.roomsToday : '—'/);
  assert.match(adminPage, /tonight \? tonight\.ratingsOwed : '—'/);
  // The empty state is only ever reached on a board that was actually read.
  assert.match(adminPage, /const nothing = board && !board\.unavailable/);
});

test('the weekly grid is not told to create a catalogue it failed to read', () => {
  // Source: the handler resolves an admin caller first. The same rule as the
  // board, one panel down — a dropped read rendered as an empty grid under the
  // sentence "No series yet. Create the weekly grid above.", which is an
  // instruction to duplicate every room that already exists.
  assert.match(classes, /if \(seriesQ\.error \|\| tutorQ\.error\) \{/);
  assert.match(classes, /if \(instErr\) \{/);
  assert.match(adminPage, /setData\(\{ series: \[\], tutors: \[\], unavailable: true \}\);/);
  assert.match(adminPage, /\{data && !data\.unavailable && \(data\.series \|\| \[\]\)\.length === 0 &&/);
});

test('the catalogue view stays future-only', () => {
  // Its only action is CANCEL, which refunds every held seat; offering that on
  // a room that already ran would refund an evening that happened. The occasion
  // got its own view instead of loosening that window.
  assert.match(classes, /searchParams\.get\('view'\) === 'tonight'/);
  assert.match(classes, /\.gt\('scheduled_start', new Date\(\)\.toISOString\(\)\)/);
});

test('the console never dresses a tutor rating as mastery', () => {
  // The mastery law (CLAUDE.md rule 5, docs/ENGINE.md): only unassisted,
  // verified, delayed evidence confirms a skill. An exit rating is a person's
  // observation — evidence, never confirmation — so no surface may print it as
  // mastery, least of all the one the ratings are written from.
  assert.doesNotMatch(adminPage, /master(y|ed)/i);
  assert.doesNotMatch(classes, /master(y|ed)/i);
});

// ── The cohort: one object, both evenings, in one action ─────────────────────

const bodyOf = (r) => r.error.json();

test('a cohort is every evening the product is sold as, each on its own night', async () => {
  // A seat is 2 × 75 minutes a week. One evening is a different product at the
  // seat's price; two rooms on one night is one evening twice, and it would
  // make every sentence the product writes ("Tuesdays and Thursdays") wrong.
  assert.equal(SEAT_PLAN.seat.sessionsPerWeek, 2);
  const good = validateSlots([
    { weekday: 4, localStartTime: '16:30' },
    { weekday: 2, localStartTime: '16:30' },
  ]);
  assert.equal(good.error, undefined);
  assert.deepEqual(good.slots.map((s) => s.weekday), [2, 4], 'sorted, so the week reads forward');
  assert.equal(good.slots[0].durationMinutes, KIND_DEFAULTS.standing_seat.minutes);

  const tooFew = validateSlots([{ weekday: 2, localStartTime: '16:30' }]);
  assert.equal(tooFew.error.status, 400);
  assert.match((await bodyOf(tooFew)).error, /sessions a week/);

  const sameNight = validateSlots([
    { weekday: 2, localStartTime: '16:30' },
    { weekday: 2, localStartTime: '18:00' },
  ]);
  assert.equal(sameNight.error.status, 400);
  assert.match((await bodyOf(sameNight)).error, /different weekday/);

  for (const slop of [
    [{ weekday: 9, localStartTime: '16:30' }, { weekday: 2, localStartTime: '16:30' }],
    [{ weekday: 2, localStartTime: '4:30' }, { weekday: 4, localStartTime: '16:30' }],
    [{ weekday: 2, localStartTime: '16:30', durationMinutes: 200 }, { weekday: 4, localStartTime: '16:30' }],
  ]) {
    assert.equal(validateSlots(slop).error.status, 400);
  }
});

test('a cohort cannot quietly be sold as a roomier product', async () => {
  // 1:4 is the product (SEAT_PLAN.ratio, mirrored in KIND_DEFAULTS), not a
  // preference, so the ask is capped rather than honoured.
  const cap = KIND_DEFAULTS.standing_seat.capacity;
  assert.equal(cap, SEAT_PLAN.seat.ratio);
  assert.equal(validateCohort({ title: 'Algebra I', subject: 'Math', capacity: 40 }).out.capacity, cap);
  assert.equal(validateCohort({ title: 'Algebra I', subject: 'Math' }).out.capacity, cap);
  assert.equal(validateCohort({ title: 'Algebra I', subject: 'Math', capacity: 2 }).out.capacity, 2);
  assert.equal(validateCohort({ title: 'Algebra I', subject: 'Math', capacity: 0 }).error.status, 400);
  // A room in a zone nobody can format is a room with no time on it.
  const zone = validateCohort({ title: 'A', subject: 'Math', timezone: 'Mars/Olympus' });
  assert.equal(zone.error.status, 400);
  assert.match((await bodyOf(zone)).error, /IANA/);
  assert.equal(validateCohort({ title: '  ', subject: 'Math' }).error.status, 400);
  // A partial edit touches only what it names — this is what lets a director
  // fix a venue without restating the whole product.
  assert.deepEqual(validateCohort({ venue: 'Cedar Park library' }, { partial: true }).out, {
    venue: 'Cedar Park library',
  });
});

test('a place is a family, not a booking: one student in both evenings is one place', async () => {
  // Counted per series, a full four-place cohort reads as eight. That fold is
  // the whole reason the cohort object exists.
  const svc = stubSvc({
    standing_seats: [
      { series_id: 'tue', student_id: 'kid-1' },
      { series_id: 'thu', student_id: 'kid-1' },
      { series_id: 'tue', student_id: 'kid-2' },
      { series_id: 'other', student_id: 'kid-9' },
    ],
  });
  const held = await placesTaken(svc, { tue: 'c1', thu: 'c1', other: 'c2' });
  assert.deepEqual(held, { c1: 2, c2: 1 });
  // Only ACTIVE enrolments hold a place.
  assert.equal(callTo(svc, 'standing_seats').eq.active, true);
  assert.deepEqual(await placesTaken(svc, {}), {}, 'no series is no read');
});

test('a failed enrolment read is never reported as an empty cohort', async () => {
  // Swallowed, this printed "0/4 places taken" on every cohort and a confident
  // 0 on the console's "Seats filled" card — at a club with families in it. It
  // throws so the GET's catch renders the failure the panel already has.
  await rejectsWith(() => placesTaken(stubSvc({ standing_seats: READ_FAILED }), { tue: 'c1' }), 'connection reset');
});

test('the GET checks every read it makes, including the tutors it names', () => {
  // Source: the handler resolves an admin caller through Supabase before any of
  // this, so there is no seam to call it through. A dropped tutors read empties
  // the name map and every properly staffed cohort then warns that its lead is
  // not cleared — a sentence about a person's vetting, invented by a dropped
  // connection.
  for (const q of ['cohortQ', 'seriesQ', 'tutorQ']) {
    assert.match(cohorts, new RegExp(`if \\(${q}\\.error\\) throw ${q}\\.error;`), q);
  }
  assert.match(classes, /if \(tutorQ\.error\) throw tutorQ\.error;/);
});

test('a cohort’s rooms are reserved inventory, at the seat’s own ratio', () => {
  // Source: the insert payload. A posted price on reserved inventory is a price
  // nobody can ever pay (groupSeatQuote answers 'reserved'), and this is the
  // only other door that can now create a seat room.
  assert.match(cohorts, /kind: SEAT_KIND/);
  assert.match(cohorts, /seat_price_cents: 0/);
  assert.match(cohorts, /const SLOTS_PER_COHORT = SEAT_PLAN\.seat\.sessionsPerWeek/);
  assert.equal(KIND_DEFAULTS.standing_seat.minutes, SEAT_PLAN.seat.minutes);
});

test('a half-made cohort is never left behind', () => {
  // PostgREST gives no transaction, so the compensation is explicit: a cohort
  // whose evenings failed to insert is a draft nobody asked for that would sit
  // in the console forever, showing as a cohort with no rooms.
  assert.match(cohorts, /from\('cohort'\)\.delete\(\)\.eq\('id', cohort\.id\)/);
  assert.match(cohorts, /rollback failed — orphan cohort/);
});

test('the cohort read is the shared one, so console and storefront agree', () => {
  // lib/server/cohorts.js owns what a cohort IS. The console adds the four
  // things only an operator needs (paused, unstaffed, places taken, the series
  // ids) and re-derives nothing.
  assert.match(cohorts, /import \{ shapeCohort \} from '@\/lib\/server\/cohorts'/);
  assert.match(cohorts, /\.\.\.shapeCohort\(row, mine, nameOf\[row\.lead_tutor_id\] \|\| null, held\[row\.id\] \|\| 0\)/);
});

test('only a cleared, active tutor leads a cohort or is named by it', () => {
  // The same gate every other surface applies before printing a person's name
  // next to a child.
  assert.match(cohorts, /t\.status !== 'active' \|\| t\.vetting_status !== 'cleared'/);
  assert.match(cohorts, /\.filter\(\(t\) => t\.status === 'active' && t\.vetting_status === 'cleared'\)/);
});

test('every write to a cohort is admin-only and audited', () => {
  for (const verb of ['GET', 'POST', 'PATCH']) {
    assert.match(cohorts, new RegExp(`export async function ${verb}\\(req\\) \\{\\n  const \\{ error`), verb);
  }
  assert.match(cohorts, /if \(!isAdminCaller\(caller\)\) return \{ error: Response\.json\(\{ error: 'Admin only\.' \}, \{ status: 403 \}\) \}/);
  for (const action of ['cohorts.created', 'cohorts.updated', 'cohorts.series_attached']) {
    assert.ok(cohorts.includes(action), `${action} must reach the audit log`);
  }
  // No DELETE: a cohort with families in it must not be removable, and pausing
  // is the reversible act that stops it making rooms.
  assert.doesNotMatch(cohorts, /export async function DELETE/);
});

test('a cohort is a plan, so the selling gate is not this route’s job', () => {
  // Hard Rule 4 fails SELLING closed: /api/admin/seats refuses to ENROL while
  // club_enabled is off, because an enrolment becomes a booked room within the
  // hour. Laying out an evening charges nobody and places nobody, so gating it
  // would only stop the director preparing for the day counsel clears the
  // queue. The distinction is written down in the route so the next reader does
  // not "fix" it.
  assert.doesNotMatch(cohorts, /getSettings/);
  assert.match(cohorts, /THE CLUB GATE DOES NOT APPLY HERE, DELIBERATELY/);
});

test('an unmigrated database is told the migration number', () => {
  assert.match(cohorts, /migration 0038/);
  assert.match(cohorts, /notProvisioned: true/);
  assert.match(cohorts, /import \{ isMissingSchema \} from '@\/lib\/engine\/ledger'/);
});

// ── Adoption: the other door into the same object ────────────────────────────

const seat = (over = {}) => ({ id: 'thu', kind: 'standing_seat', cohort_id: null, weekday: 4, ...over });

test('a seat series that predates cohorts can be adopted', () => {
  // They hold real families (enrolment is per series), so the console offers
  // them for adoption rather than hiding what it cannot render.
  assert.equal(attachRefusal(seat(), 'c1', [{ id: 'tue', weekday: 2 }]), null);
  assert.equal(attachRefusal(seat(), 'c1', []), null, 'a cohort may be built by adoption alone');
  // Re-attaching where it already is is a no-op, not a second evening.
  assert.equal(attachRefusal(seat({ cohort_id: 'c1' }), 'c1', [{ id: 'thu', weekday: 4 }]), null);
});

test('adoption refuses everything creating a cohort refuses', async () => {
  // This is the defect: the POST path holds the seat's shape through
  // validateSlots and adoption walked straight around it, so a director could
  // attach a third and a fourth evening, or a second series on a night the
  // cohort already meets — and shapeCohort feeds publicCohorts and mySeat, so
  // the storefront would then advertise three nights for a two-night product.
  const full = Array.from({ length: SEAT_PLAN.seat.sessionsPerWeek }, (_, i) => ({ id: `s${i}`, weekday: i }));
  const third = attachRefusal(seat({ weekday: 5 }), 'c1', full);
  assert.equal(third.status, 409);
  assert.match(third.error, /sessions a week/);

  const clash = attachRefusal(seat({ weekday: 2 }), 'c1', [{ id: 'tue', weekday: 2 }]);
  assert.equal(clash.status, 409);
  assert.match(clash.error, /two rooms on one night/);
  // A string weekday off the wire is the same Tuesday.
  assert.equal(attachRefusal(seat({ weekday: '2' }), 'c1', [{ id: 'tue', weekday: 2 }]).status, 409);

  assert.equal(attachRefusal(null, 'c1', []).status, 404);
  const drop = attachRefusal(seat({ kind: 'homework_hall' }), 'c1', []);
  assert.equal(drop.status, 409);
  assert.match(drop.error, /drop-in room/);
  const owned = attachRefusal(seat({ cohort_id: 'c2' }), 'c1', []);
  assert.equal(owned.status, 409);
  assert.match(owned.error, /already belongs to another cohort/);
});

test('an adopted evening is described by the cohort that adopted it', () => {
  // Every surface renders the COHORT's venue and lead for ALL of its evenings
  // (shapeCohort → publicCohorts, mySeat, the console card) while the rooms
  // materialize from the SERIES. An adopted Thursday that kept its own venue
  // and its own tutor therefore made three screens wrong about where a family
  // should be on Thursday.
  const patch = adoptionPatch({
    id: 'c1', title: 'Algebra I', subject: 'Math', venue: 'Cedar Park library',
    timezone: CLUB_TIMEZONE, grade_band: '9-12', capacity: 4, lead_tutor_id: 't1',
  });
  assert.deepEqual(patch, {
    cohort_id: 'c1', title: 'Algebra I', subject: 'Math', venue: 'Cedar Park library',
    timezone: CLUB_TIMEZONE, grade_band: '9-12', capacity: 4, tutor_id: 't1',
  });
});

test('adoption fills gaps and never digs them', () => {
  // Propagating a blank is destructive in a way propagating a value is not: a
  // null tutor_id unstaffs a room that holds real families and silently stops
  // it materializing, and a blanked venue leaves them with no address. The
  // cohort card warns about both instead.
  const bare = adoptionPatch({ id: 'c1', title: 'Algebra I', venue: '', grade_band: null, lead_tutor_id: null });
  assert.equal(bare.cohort_id, 'c1');
  assert.ok(!('tutor_id' in bare), 'an unled cohort must not unstaff the evening it adopts');
  assert.ok(!('venue' in bare), 'and must not erase the address the room already has');
  assert.ok(!('grade_band' in bare));
  // Number(null) is 0, and a zero-capacity room books nobody.
  assert.ok(!('capacity' in bare), 'a cohort with no capacity must not impose one');
  assert.equal(adoptionPatch({ id: 'c1', capacity: 4 }).capacity, 4);
});

test('the adoption door refuses on a read it could not make', () => {
  // Source: PATCH resolves an admin caller first. Both reads the refusal is
  // computed from are checked, because attaching a third Tuesday on the
  // assumption that a cohort has no evenings is the same defect as the one
  // above, arrived at from the other side.
  assert.match(cohorts, /const refusal = attachRefusal\(series, id, siblings \|\| \[\]\);/);
  assert.match(cohorts, /if \(sibErr\) \{/);
  assert.match(cohorts, /Could not read this cohort’s evenings, so nothing was attached/);
  assert.match(cohorts, /\.select\('id,weekday'\)\.eq\('cohort_id', id\)\.eq\('kind', SEAT_KIND\)/);
  // And a failed read of the cohort itself is not the answer "no such cohort".
  assert.match(cohorts, /Could not read that cohort, so nothing was changed/);
  // The console offers the action only where the route would accept it, and
  // says what the adoption will move.
  assert.match(adminPage, /Seat rooms with no cohort/);
  assert.match(adminPage, /const cannotAdopt = \(c, u\) => \{/);
  assert.match(adminPage, /disabled=\{Boolean\(why\)\}/);
});

test('a cohort edit reaches its evenings, and says so when it does not', () => {
  // This is what makes the cohort ONE object rather than a label over two
  // unrelated rows: move the venue and the Thursday moves too. A propagation
  // that fails is a PARTIAL result and never renders green.
  assert.match(cohorts, /if \(patch\.venue !== undefined\) seriesPatch\.venue = patch\.venue/);
  assert.match(cohorts, /status: 207/);
  assert.match(cohorts, /partial: true/);
  assert.match(adminPage, /msg\.startsWith\('⚠'\) \? 'warn'/);
  // Days and times deliberately do NOT travel: an evening belongs to its own
  // series, and moving both at once is how a Thursday becomes a second Tuesday.
  assert.doesNotMatch(cohorts, /seriesPatch\.weekday/);
  assert.doesNotMatch(cohorts, /seriesPatch\.local_start_time/);
});

// ── The console's own geometry ───────────────────────────────────────────────

test('the page is ordered by how often the work happens', () => {
  const at = (needle) => {
    const i = adminPage.indexOf(needle);
    assert.notEqual(i, -1, `expected the console to contain ${needle}`);
    return i;
  };
  // Tonight first: it is the only panel that answers the question the Director
  // has at four o'clock.
  const tonight = at('<TonightSection');
  assert.ok(tonight < at('title="Safety reports"'), 'Tonight comes first');
  // Then the weekly work — the cohort, the families in it, the grid.
  assert.ok(at('<CohortsSection') < at('<SeatsSection'));
  assert.ok(at('<SeatsSection') < at('<ClassesSection'));
  assert.ok(at('<ClassesSection') < at('<DiagnosticsSection'));
  // Hiring happens twice a year and used to sit above all of it.
  const hiring = at('title="Tutor applications"');
  assert.ok(at('<DiagnosticsSection') < hiring, 'hiring drops below the rooms');
  assert.ok(at('title="Tutors · vetting and activation"') > at('<ClassesSection'));
});

test('the numbers at the top are the numbers this business runs on', () => {
  // Users / AI cost / open handoffs / open support was the AI-first product's
  // stat row surviving verbatim into a business that sells evenings.
  for (const label of ['Seats filled', 'Active cohorts', 'Rooms today', 'Exit ratings owed']) {
    assert.ok(adminPage.includes(`label="${label}"`), `the stat row must carry ${label}`);
  }
  assert.doesNotMatch(adminPage, /<Metric label="Open handoffs"/);
  assert.doesNotMatch(adminPage, /<Metric label="AI cost · 30d"/);
  // Nothing was lost: each retired figure now sits in the header of the panel
  // that lists it, where it can be acted on.
  assert.match(adminPage, /title="Users" action=\{<span className="k-label">\{data\.users\} total<\/span>\}/);
  assert.match(adminPage, /\{\(data\.handoffs \|\| \[\]\)\.filter\(\(h\) => h\.status === 'open'\)\.length\} open/);
  assert.match(adminPage, /\{\(data\.supports \|\| \[\]\)\.filter\(\(s\) => s\.status === 'open'\)\.length\} open/);
});

test('the founder’s membership card counts the product that is on sale', () => {
  // It printed Club / Plus / Max — the three RETIRED tiers — and never the
  // seat, so the board counted the business Kaizen used to be. The keys are
  // derived, so retiring or adding a tier moves the card with it.
  assert.match(adminPage, /m\.membership\.byTier\.seat/);
  assert.match(adminPage, /Object\.keys\(CLUB_PLANS\)/);
  assert.doesNotMatch(adminPage, /Club <Num/);
  assert.match(adminPage, /Retired tiers:/);
});

test('a kill switch reports what the SERVER did, not what was clicked', () => {
  // It flipped local state, awaited the fetch and ignored the result: a 501, a
  // 400 or an expired session all left the switch showing a position the server
  // had never taken — on the switches that gate selling and safety.
  assert.match(adminPage, /if \(!res\.ok\) \{\n\s*setSettings\(\(s\) => \(\{ \.\.\.s, \[key\]: before \}\)\);/);
  assert.match(adminPage, /It is still \$\{before \? 'on' : 'off'\}/);
  // A dropped network is the same class of lie and reverts the same way.
  assert.match(adminPage, /The network dropped that change/);
  // And a switch panel that cannot be read says so rather than vanishing.
  assert.match(adminPage, /The kill switches could not be read/);
});

test('a kill switch is a switch to a screen reader', () => {
  // Seven bare <button>s whose only child was a positioning span: no name, no
  // role, no state.
  assert.match(adminPage, /role="switch"/);
  assert.match(adminPage, /aria-checked=\{on\}/);
  assert.match(adminPage, /aria-labelledby=\{`switch-\$\{s\.key\}`\}/);
  assert.match(adminPage, /type="button"/);
});

test('the console has a loading state and one empty state', () => {
  // Between mount and the first response the page rendered a heading and blank
  // space, which on a slow connection is indistinguishable from a console with
  // nothing in it.
  assert.match(adminPage, /<ConsoleSkeleton \/>/);
  assert.match(adminPage, /role="status">Loading the console…/);
  assert.match(adminPage, /motion-reduce:animate-none/);
  // EmptyState was defined twice in this product, locally, differently. The
  // console's local `Empty` is now the shared one.
  assert.match(adminPage, /import EmptyState from '@\/components\/ui\/EmptyState'/);
  assert.match(adminPage, /function Empty\(\{ children \}\) \{\s+return <EmptyState>\{children\}<\/EmptyState>;/);
});

test('a room on this screen is drawn by the shared primitive', () => {
  // The kind→label map was retyped in eight places with three labels for the
  // same room, and this console badged every seat room "Clinic".
  assert.match(adminPage, /import RoomCard from '@\/components\/ui\/RoomCard'/);
  assert.match(adminPage, /import \{ CLUB_TIMEZONE, roomTime, slotWhen, zoneLabel \} from '@\/lib\/roomTime'/);
  // Never the reader's clock: the room's own zone travels with the instant.
  assert.match(adminPage, /roomTime\(r\.end, r\.timezone\)/);
  assert.match(adminPage, /timezone=\{r\.timezone\}/);
});
