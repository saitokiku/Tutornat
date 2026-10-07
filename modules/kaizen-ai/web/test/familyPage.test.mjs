// The payer's page — /family and the two routes that feed it.
//
// This surface answers to the person handing over a standing seat's monthly
// price, and the Wave 2 audit found it selling her a retired membership, a cut
// private session and a free trial, while the one number that makes the seat
// legible — confirmed concepts, computed and exported by `familySummary` — was
// dropped at the last inch.
//
// HOW THIS FILE IS SPLIT, AND WHY.
// The first two thirds are UNIT TESTS with a PostgREST-shaped stub: every
// helper the page depends on for a true answer is called, with a client that
// returns rows, and with a client whose read FAILS — because the whole class of
// defect here is a failed read rendering as a confident fact ("Sessions this
// month 0" at a family that came every week; "nothing on the calendar" at a
// family whose seat is reserved). A test that only greps for a try/catch cannot
// tell those apart.
// The last third is source assertions, and only for the things with no runtime
// seam: /family is a client component with JSX and no renderer in this rig, so
// what it RENDERS can only be read off the file. Those are kept narrow — an
// offer that comes back, a formatter in the reader's timezone, a confirmation
// that stops saying what it does not cancel.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEAT_PLAN, SALE_STATUS } from '@/lib/server/clubPricing.js';
import { cloudConfigured } from '@/lib/server/context.js';
import { clubAllowances } from '@/lib/server/clubBilling.js';
import { mySeat } from '@/lib/server/cohorts.js';
import { masterySummary, masteryLead } from '@/lib/server/familySummary.js';
import { CONFIRM_THRESHOLD } from '@/lib/engine/types.js';
import { monthAttendance, nextSeatSession } from '@/app/api/family/summary/route.js';
import { GET as entitlementsGET } from '@/app/api/entitlements/me/route.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const page = read('app/family/page.js');
const summaryRoute = read('app/api/family/summary/route.js');
const entitlementsRoute = read('app/api/entitlements/me/route.js');

// Comments in these files legitimately describe what was REMOVED ("it offered
// Book 1:1", "sold your membership's included visits"). The bans below are
// about what the page renders, so they run against the code with comments
// stripped — same technique as claims.test.mjs.
const stripComments = (src) => src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const rendered = stripComments(page);

// ── A PostgREST-shaped stub ──────────────────────────────────────────────────
// Enough of the supabase-js chain for the reads under test, and — the point of
// the whole file — able to answer `{ data: null, error }` the way the real
// client does. supabase-js RESOLVES its errors; it does not throw. Every call
// is recorded so a test can assert the QUERY that was issued (which statuses,
// which window) and not merely the answer that came back.
function stubSvc(handlers = {}, calls = []) {
  return {
    calls,
    from(table) {
      const call = { table, select: null, eq: {}, in: {}, gte: {}, lt: {}, order: null, limit: null };
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
        order(c, o) { call.order = { column: c, ...(o || {}) }; return chain; },
        limit(n) { call.limit = n; return chain; },
        maybeSingle() {
          return run().then((r) => ({
            data: Array.isArray(r.data) ? (r.data[0] ?? null) : (r.data ?? null),
            error: r.error,
          }));
        },
        then(ok, bad) { return run().then(ok, bad); },
      };
      return chain;
    },
  };
}

const READ_FAILED = { data: null, error: { message: 'connection reset' } };
const callTo = (svc, table) => svc.calls.find((c) => c.table === table);

// ── The month's attendance: a failed read is not a zero ──────────────────────

const MID_MONTH = Date.parse('2026-09-17T15:00:00Z');
const room = (start, status = 'completed', kind = 'standing_seat') => ({
  status: 'attended', group_session: { kind, scheduled_start: start, status },
});

test('the month counts the rooms that actually ran, inside the month', async () => {
  const svc = stubSvc({
    group_seat: [
      room('2026-09-03T23:00:00Z'),
      room('2026-09-10T23:00:00Z'),
      room('2026-09-24T23:00:00Z', 'open'),        // booked, has not happened yet
      room('2026-08-27T23:00:00Z'),                // last month
      room('2026-09-05T23:00:00Z', 'cancelled'),   // the club did not deliver it
      { status: 'attended', group_session: null }, // an orphaned seat row
    ],
  });
  const out = await monthAttendance(svc, 'kid-1', { now: MID_MONTH });
  assert.equal(out.sessionsThisMonth, 2);
  assert.equal(new Date(out.since).getDate(), 1, 'the window opens on the 1st');
});

test('a room with no date is not counted — the epoch is not September', async () => {
  // `new Date(null)` is 1970, which is not inside any month window; `new
  // Date(undefined)` is NaN, which compares false against everything. Both
  // have to be dropped deliberately rather than by luck.
  const svc = stubSvc({
    group_seat: [
      { status: 'attended', group_session: { kind: 'clinic', scheduled_start: null, status: 'completed' } },
      { status: 'attended', group_session: { kind: 'clinic', scheduled_start: 'not a date', status: 'completed' } },
    ],
  });
  assert.equal((await monthAttendance(svc, 'kid-1', { now: MID_MONTH })).sessionsThisMonth, 0);
});

test('a FAILED read answers null, never zero — the page then says nothing', async () => {
  // THE defect this helper was rewritten for. It used to wrap `sessionsInWindow`,
  // which does `for (const seat of seatsQ.data || [])` and never looks at
  // `{ error }` — so a broken read returned `{sessionsThisMonth: 0}`,
  // `Number.isFinite(0)` was true, and the page printed "Sessions this month 0"
  // at a family that came every week. The try/catch never fired, because
  // supabase-js resolves its errors instead of throwing.
  const failed = stubSvc({ group_seat: READ_FAILED });
  assert.equal(await monthAttendance(failed, 'kid-1', { now: MID_MONTH }), null);

  // And a client that genuinely throws is the same answer, not a 500 that takes
  // the child's concepts down with it.
  const exploding = { from() { throw new Error('boom'); } };
  assert.equal(await monthAttendance(exploding, 'kid-1', { now: MID_MONTH }), null);
});

test('the month asks only for seats that were held', async () => {
  const svc = stubSvc({ group_seat: [] });
  await monthAttendance(svc, 'kid-7', { now: MID_MONTH });
  const q = callTo(svc, 'group_seat');
  assert.equal(q.eq.student_id, 'kid-7');
  assert.deepEqual(q.in.status, ['booked', 'attended'], 'a cancelled place is not attendance');
});

// ── The next occasion: whose venue, whose zone, and "we could not look" ──────

const SEAT = {
  seriesIds: ['ser-tue', 'ser-thu'],
  venue: 'Westlake Library, Room 2',
  timezone: 'America/Chicago',
};

test('a one-off room move reaches the parent: the instance venue wins', async () => {
  // `group_session.venue` (0033) exists for exactly this — a Thursday moved to
  // the annex is written on the ROOM, not on the cohort. Reading only the
  // cohort's address sends a family to the wrong building.
  const svc = stubSvc({
    group_session: [{
      id: 'gs-1', scheduled_start: '2026-09-17T23:00:00Z',
      venue: 'Annex, Room 5', timezone: 'America/Chicago', status: 'confirmed',
    }],
  });
  const next = await nextSeatSession(svc, SEAT, { now: MID_MONTH });
  assert.equal(next.venue, 'Annex, Room 5');
  assert.equal(next.start, '2026-09-17T23:00:00Z');
});

test('a room with no venue of its own falls back to the cohort address and zone', async () => {
  const svc = stubSvc({
    group_session: [{
      id: 'gs-2', scheduled_start: '2026-09-17T23:00:00Z',
      venue: null, timezone: null, status: 'open',
    }],
  });
  const next = await nextSeatSession(svc, SEAT, { now: MID_MONTH });
  assert.equal(next.venue, SEAT.venue);
  assert.equal(next.timezone, SEAT.timezone, 'a room is always formatted in the room\'s zone');
});

test('"nothing scheduled" and "we could not look" are different answers', async () => {
  // They render as different sentences, and they must: telling a family whose
  // seat is reserved that nothing is coming up is the one lie this line can
  // tell. The old code destructured `{ data }` only, so a failed query was
  // indistinguishable from an empty calendar.
  assert.equal(await nextSeatSession(stubSvc({ group_session: [] }), SEAT, { now: MID_MONTH }), null);
  assert.deepEqual(
    await nextSeatSession(stubSvc({ group_session: READ_FAILED }), SEAT, { now: MID_MONTH }),
    { unavailable: true },
  );
  assert.deepEqual(
    await nextSeatSession({ from() { throw new Error('boom'); } }, SEAT, { now: MID_MONTH }),
    { unavailable: true },
  );
  // A family with no seat has no calendar to check, which is neither.
  assert.equal(await nextSeatSession(stubSvc({}), { seriesIds: [] }, { now: MID_MONTH }), null);
});

test('the next occasion is asked of the cohort\'s rooms, and only live future ones', async () => {
  // Reading the child's booked seats instead would tell a seat family they have
  // nothing coming up every Monday, before the weekly sweep runs.
  const svc = stubSvc({ group_session: [] });
  await nextSeatSession(svc, SEAT, { now: MID_MONTH });
  const q = callTo(svc, 'group_session');
  assert.deepEqual(q.in.series_id, SEAT.seriesIds);
  assert.deepEqual(q.in.status, ['open', 'confirmed', 'in_progress'], 'a cancelled room is not the next one');
  assert.equal(q.gte.scheduled_start, new Date(MID_MONTH).toISOString());
  assert.equal(q.order.column, 'scheduled_start');
  assert.equal(q.order.ascending, true);
  assert.equal(q.limit, 1);
});

// ── The seat is ONE object, and ending it ends only the seat ─────────────────

function seatStub({ standing, series }) {
  return stubSvc({
    standing_seats: standing,
    group_session_series: (call) => series.filter((s) => (call.in.id || []).includes(s.id)),
    cohort: [{
      id: 'co-1', title: 'Algebra I', subject: 'Algebra I', venue: 'Westlake Library, Room 2',
      timezone: 'America/Chicago', capacity: 4, lead_tutor_id: 'tut-1',
    }],
    tutors: [{ display_name: 'Ms Rivera', status: 'active', vetting_status: 'cleared' }],
  });
}

const seatSeries = (id, weekday) => ({
  id, cohort_id: 'co-1', title: 'Algebra I', subject: 'Algebra I', weekday,
  local_start_time: '18:00:00', duration_minutes: 75, kind: 'standing_seat',
  timezone: 'America/Chicago', venue: 'Westlake Library, Room 2', tutor_id: 'tut-1',
});

test('ending the seat can only reach the seat — a weekly Hall is not in it', async () => {
  // A family often holds a standing Homework Hall alongside the seat. Both are
  // `standing_seats` rows, so an unscoped fold handed the page every id it
  // held and one "End this seat" silently cancelled the Hall too — behind a
  // confirmation that promised only to stop the seat's weeks.
  const svc = seatStub({
    standing: [
      { id: 'st-tue', series_id: 'ser-tue', student_id: 'kid-1', active: true },
      { id: 'st-thu', series_id: 'ser-thu', student_id: 'kid-1', active: true },
      { id: 'st-hall', series_id: 'ser-hall', student_id: 'kid-1', active: true },
    ],
    series: [
      seatSeries('ser-tue', 2),
      seatSeries('ser-thu', 4),
      { id: 'ser-hall', cohort_id: null, title: 'Homework Hall', weekday: 1,
        local_start_time: '16:00:00', duration_minutes: 90, kind: 'homework_hall',
        timezone: 'America/Chicago', venue: null, tutor_id: null },
    ],
  });
  const seat = await mySeat(svc, 'kid-1');
  assert.deepEqual(seat.standingIds.sort(), ['st-thu', 'st-tue']);
  assert.deepEqual(seat.seriesIds.sort(), ['ser-thu', 'ser-tue']);
  assert.equal(seat.slots.length, 2, 'one card, two evenings — not two cards');
  assert.equal(seat.venue, 'Westlake Library, Room 2');
  assert.equal(seat.leadTutorName, 'Ms Rivera');
});

test('a family that holds only a weekly Hall has no seat, and is told so as a state', async () => {
  const svc = seatStub({
    standing: [{ id: 'st-hall', series_id: 'ser-hall', student_id: 'kid-2', active: true }],
    series: [{ id: 'ser-hall', cohort_id: null, title: 'Homework Hall', weekday: 1,
      local_start_time: '16:00:00', duration_minutes: 90, kind: 'homework_hall' }],
  });
  assert.equal(await mySeat(svc, 'kid-2'), null, 'a Hall is a different product and a different card');
});

// ── The allowance a month card can render ────────────────────────────────────

function allowanceStub(ents) {
  return stubSvc({ plan_entitlements: ents, usage_ledger: [] });
}

test('an allowance the plan has NO row for is 0, never unlimited', async () => {
  // The three states, at the source. `remaining()` reads a missing row as 0
  // (fail toward charging), so a free account has no seat allowance at all —
  // and /api/entitlements/me now agrees rather than serializing the absence as
  // null, which meant "unlimited/unknown" and would have printed a seat row on
  // every free account's page the moment the seat allowance joined the view.
  const free = await clubAllowances(allowanceStub([]), { userId: 'u1', plan: 'free' });
  assert.equal(free.seatRemaining, 0);
  assert.equal('club_seat_included' in free.monthlyLimits, false, 'no row means no key');
});

test('a row of 0 is an allowance of 0, and a NULL limit is unlimited', async () => {
  const zero = await clubAllowances(
    allowanceStub([{ feature: 'club_seat_included', monthly_limit: 0 }]),
    { userId: 'u1', plan: 'ai_solo' },
  );
  assert.equal(zero.seatRemaining, 0);
  assert.equal(zero.monthlyLimits.club_seat_included, 0, 'a provisioned zero is not a missing row');

  const unlimited = await clubAllowances(
    allowanceStub([{ feature: 'club_seat_included', monthly_limit: null }]),
    { userId: 'u1', plan: 'internal' },
  );
  assert.equal(unlimited.seatRemaining, Infinity);
  assert.equal(unlimited.monthlyLimits.club_seat_included, null, 'NULL still means unlimited');
});

test('the month spends the allowance, and a grace credit gives it back', async () => {
  const svc = stubSvc({
    plan_entitlements: [{ feature: 'club_seat_included', monthly_limit: 8 }],
    usage_ledger: [
      { feature: 'club_seat_included', quantity: 1 },
      { feature: 'club_seat_included', quantity: 1 },
      // A discretionary grace visit is a negative ledger row — the same
      // arithmetic as a refund, and never a stored balance.
      { feature: 'club_seat_included', quantity: -1 },
    ],
  });
  const out = await clubAllowances(svc, { userId: 'u1', plan: 'seat' });
  assert.equal(out.seatRemaining, 7);
  assert.equal(out.usedThisMonth.club_seat_included, 1);
});

test('the seat allowance is actually served, not only defined', async () => {
  // CLUB_VIEW omitted `club_seat_included`, so /family's month card could never
  // render for the only recurring product Kaizen sells: the card only draws
  // features this response carries. Asserted end to end through the route's one
  // path that runs without a database.
  assert.ok(!cloudConfigured, 'the unit suite runs against a bare environment (no SUPABASE_* set)');
  const res = await entitlementsGET(new Request('http://localhost/api/entitlements/me'));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(Object.keys(body.club).includes('club_seat_included'), 'the seat allowance is in the served view');
  assert.ok(Object.keys(body.club).includes('club_hall_included'));
});

test('the route distinguishes a missing allowance row from a NULL limit', () => {
  // NO RUNTIME SEAM: the mapping is inline in a GET whose caller resolution
  // needs a live Supabase, and the demo path above short-circuits before it.
  // So this asserts the one decision that cannot be re-derived — that the route
  // asks whether the row EXISTS — without pinning the expression's spelling.
  assert.match(entitlementsRoute, /hasOwnProperty\.call\(\s*allowances\.monthlyLimits/);
  assert.doesNotMatch(
    entitlementsRoute, /monthlyLimits\[f\]\s*\?\?\s*null/,
    'a missing row serialized as null is "unlimited", which is how a free account gets a seat row',
  );
});

// ── Hard rule 5: only confirmed mastery leaves the product ───────────────────

test('the server never even ASKS the database for working mastery', async () => {
  // "Could do it with help" is real, is shown to the learner, and is not a
  // thing to tell a parent their child has learned. The guarantee is structural
  // — no code path from this module selects the column — so the test reads the
  // columns the aggregation actually asked for.
  const svc = stubSvc({
    learner_kc: [{ kc_id: 'k1', local_title: 'Dividing fractions' }],
    kc_estimate: [{ kc_id: 'k1', confirmed: CONFIRM_THRESHOLD + 0.01 }],
    evidence: [],
    kc: [],
  });
  const out = await masterySummary(svc, 'kid-1', { now: MID_MONTH });
  assert.equal(out.tracked, true);
  assert.equal(out.confirmed, 1);
  assert.equal(out.total, 1);
  // Guard against a vacuous pass: this asserts columns, so there have to be
  // columns. The estimate read is the one that could carry the field.
  assert.equal(callTo(svc, 'kc_estimate').select, 'kc_id,confirmed');
  assert.ok(svc.calls.length >= 2);
  for (const call of svc.calls) {
    assert.ok(call.select, `${call.table} was read with no column list — the spy has nothing to check`);
    assert.doesNotMatch(call.select, /working/, `${call.table} must not read working mastery`);
  }
});

test('the mastery block a parent receives carries no working figure at all', () => {
  const lead = masteryLead({
    links: [{ kc_id: 'k1', local_title: 'Dividing fractions' }],
    estimates: [{ kc_id: 'k1', confirmed: CONFIRM_THRESHOLD + 0.01, working: 0.99 }],
    now: MID_MONTH,
  });
  assert.equal('working' in lead, false, 'not even as a field the page could accidentally render');
  assert.equal(lead.confirmed, 1);
});

test('an unprovisioned engine is a stated state, not a confident zero', async () => {
  const failed = stubSvc({ learner_kc: READ_FAILED, kc_estimate: READ_FAILED });
  const out = await masterySummary(failed, 'kid-1', { now: MID_MONTH });
  assert.equal(out.tracked, false, '"0 of 0" at a parent reads as "your child has learned nothing"');
  // And the page branches on it rather than printing the zeros it carries.
  assert.match(rendered, /m\?\.tracked/);
  assert.match(rendered, /not a score of zero/, 'and says so in words');
});

// ── Source assertions: what the page RENDERS (no renderer in this rig) ───────

test('the seat is rendered before the record, and the record before the school figures', () => {
  // "On every surface the room outranks the price — and once a family is
  // enrolled, the record outranks both" (the geometry spec). The old page led
  // with a drop-in button and put the seat in 12px grey underneath.
  const seat = rendered.indexOf('<SeatBlock');
  const record = rendered.indexOf('<RecordBlock');
  const dropIn = rendered.indexOf('Book a drop-in');
  const gpa = rendered.indexOf('GPA');
  assert.ok(seat > 0, 'the page must render a seat block');
  assert.ok(record > seat, 'the record follows the seat');
  assert.ok(gpa > record, 'GPA is a supporting figure, never the headline');
  assert.ok(dropIn > record, 'a drop-in offer never outranks the seat a family already has');
});

test('the seat card renders the room a family is actually driving to', () => {
  // The counterpart of the unit tests above: `nextSeatSession` resolves the
  // instance's venue and zone, and the card has to READ them. It passed
  // `venue={seat.venue}` — the cohort's address — so a one-off room move
  // reached the API and stopped there.
  const block = rendered.slice(rendered.indexOf('function SeatBlock'));
  const card = block.slice(block.indexOf('<RoomCard'), block.indexOf('/>', block.indexOf('<RoomCard')));
  assert.match(card, /venue=\{venue\}/);
  assert.match(card, /timezone=\{timezone\}/, 'a slot-less seat still formats in the room\'s zone');
  assert.match(block, /const venue = next\?\.venue \|\| seat\.venue/);
  assert.match(block, /const timezone = next\?\.timezone \|\| seat\.timezone/);
  // And the three states of `next` are three sentences.
  assert.match(rendered, /next\?\.unavailable/);
  assert.match(rendered, /could not check the calendar/);
  assert.match(rendered, /as soon as the room is on the calendar/);
});

test('the weekly-rooms section leaves the seat to the card that owns it', () => {
  // A seat is two series and two standing rows. Drawing them again underneath
  // the seat card is the defect `mySeat` exists to fix.
  assert.match(rendered, /const seat = record\.data\.seat/, 'the page renders the folded seat object');
  assert.match(rendered, /filter\(\(s\) => s\.kind !== 'standing_seat'\)/);
});

test('the record leads with the shared mastery primitive, and names what moved', () => {
  assert.match(page, /from '@\/components\/ui\/MasteryLine'/, 'the shared primitive, not a local redraw');
  const line = rendered.match(/<MasteryLine[\s\S]{0,300}?\/>/);
  assert.ok(line, 'the record is rendered, not merely fetched');
  assert.match(line[0], /confirmed=\{m\.confirmed\}/);
  assert.match(line[0], /total=\{m\.total\}/);
  assert.match(line[0], /moved=\{m\.moved/, 'concepts that moved are named, not just counted');
});

test('the cut and retired products are gone from the payer\'s page', () => {
  const banned = [
    [/Book 1:1/i, 'private 1:1 is cut'],
    [/first session is on us/i, 'free trials are cut'],
    [/BookModal/, 'the 1:1 booking sheet is cut'],
    [/Included private session/i, 'the private credit meters a cut product'],
    [/club_private_credit/, 'the private-credit allowance must not render here'],
    [/membership/i, 'Club/Plus/Max are retired from sale'],
    [/CLUB_PLANS/, 'no retired-membership pricing on the seat holder\'s page'],
    [/Compare memberships/i, 'the Plus upsell is retired'],
  ];
  for (const [pattern, why] of banned) {
    assert.doesNotMatch(rendered, pattern, why);
  }
  // And the retirement is a fact in the price file, not an opinion here.
  assert.equal(SALE_STATUS.plus, 'retired');
  assert.equal(SALE_STATUS.seat, 'active');
});

test('the month card can only draw allowances this page has a sentence for', () => {
  // The other end of the private-credit ban: the route serves three club
  // features and the page picks the two it can name. A row is an offer whether
  // or not it is worded as one, and a limit of 0 is "your plan does not include
  // this" — not a line worth printing at the person paying for something else.
  const label = rendered.match(/const CLUB_LABEL = \{[\s\S]*?\};/);
  assert.ok(label, 'the label map is what decides which allowances render');
  assert.doesNotMatch(label[0], /club_private_credit/);
  assert.match(label[0], /club_seat_included/);
  assert.match(rendered, /CLUB_LABEL\[feature\] && u\.limit !== 0/);
});

test('the plan a family actually bought has a name on their own page', () => {
  // PLAN_NAME had no `seat` key, so a standing-seat holder's own page could not
  // say what they had bought — it fell through to a generic billing link.
  assert.match(page, /seat:\s*'Standing Seat'/, 'the seat is nameable');
  assert.match(page, /ai_solo:\s*'Max AI'/, 'so is the one AI upgrade');
  assert.match(page, /club_seat_included: '/, 'and the seat allowance has a sentence');
});

test('no room time is formatted in the reader\'s timezone', () => {
  // A 6:00 PM Austin room read "Tue 11:00 PM" server-side and "4:00 PM" in
  // California. lib/roomTime is the only formatter allowed near a room.
  assert.match(page, /from '@\/lib\/roomTime'/);
  assert.doesNotMatch(rendered, /toLocaleTimeString/);
  assert.doesNotMatch(page, /\bwhen\b.*from '@\/lib\/format'/, 'lib/format.when formats in the browser zone');
  // The one remaining locale format is a written report's DATE, which belongs
  // to the reader and not to a room.
  const locale = [...rendered.matchAll(/toLocale\w+\(/g)].map((m) => m[0]);
  assert.deepEqual(locale, ['toLocaleDateString('], 'only the report date may use the reader locale');
});

test('ending a seat asks first, and says exactly what it does and does not touch', () => {
  // It used to be a single unconfirmed tap, twice — once per weekly row. And
  // the copy has to match the SCOPED behaviour pinned by the mySeat test above:
  // the ids it writes are the seat's own, so the Hall promise is one this page
  // can keep.
  const end = rendered.indexOf('function EndSeat');
  assert.ok(end > 0, 'the seat has one way out, in one place');
  const body = rendered.slice(end, end + 3000);
  assert.match(body, /setAsking\(true\)/, 'the tap opens a confirmation instead of writing');
  assert.match(body, /action: 'unstanding'/, 'and the write is behind it');
  assert.ok(
    body.indexOf('setAsking(true)') < body.indexOf('End the seat'),
    'the destructive control only exists inside the confirmation',
  );
  // The question and the answer say the same three things. Asserted on the
  // confirmation and on the completion message SEPARATELY, because either one
  // alone would satisfy a search of the whole component — and a promise made
  // only after the write is not a promise the parent got to read.
  const ask = body.indexOf('End {childName}&apos;s seat?');
  assert.ok(ask > 0, 'the confirmation asks a question');
  for (const [where, text] of [['the confirmation', body.slice(ask)], ['the completion message', body.slice(0, ask)]]) {
    assert.match(text, /Sessions already booked\s+stay booked/, `${where} says what it does not undo`);
    assert.match(text, /Homework Hall place is untouched/, `${where} says it ends the seat and nothing else`);
    assert.match(text, /(does not close\s+your billing|your billing is unchanged)/, `${where} says what it does not cancel`);
  }
});

test('the first-use state says what a parent gets and what happens next', () => {
  // "No teens added yet" was one grey sentence. An empty state that does not
  // say what to do next is a dead end with better typography.
  assert.match(page, /from '@\/components\/ui\/EmptyState'/);
  assert.match(rendered, /<EmptyState[\s\S]{0,400}action=/, 'the empty state carries the action');
  assert.doesNotMatch(rendered, /No teens added yet/);
});

test('a family with no seat is told what a seat is, from the price file', () => {
  // Never a retyped number: the shape of the product is read from SEAT_PLAN so
  // it cannot drift out of the copy that describes it (hard rule 2's habit,
  // applied to the non-price figures that sit beside the price).
  assert.match(rendered, /SEAT_PLAN\.seat\.sessionsPerWeek/);
  assert.match(rendered, /SEAT_PLAN\.seat\.minutes/);
  assert.match(rendered, /SEAT_PLAN\.seat\.ratio/);
  assert.equal(SEAT_PLAN.seat.sessionsPerWeek, 2);
  assert.equal(SEAT_PLAN.seat.ratio, 4);
});

test('the seat and the month join the record without being able to take it down', () => {
  // The behaviour is pinned by the unit tests above; what is asserted here is
  // that the route still joins them ADDITIVELY — three independent reads, so a
  // bad minute for one table costs a card and not the page.
  assert.match(summaryRoute, /mySeat\(svc, studentId\)/);
  assert.match(summaryRoute, /monthAttendance\(svc, studentId\)/);
  assert.match(summaryRoute, /nextSeatSession\(svc, seat\)/);
  assert.match(summaryRoute, /seat:\s*seat\s*\?/, 'and no seat is served as an explicit null');
});
