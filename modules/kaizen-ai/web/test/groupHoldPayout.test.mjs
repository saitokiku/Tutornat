// The unpaid-tutor hole, and the hold that used to hide it.
//
// completeGroupSessions refuses to pay a group room that ended with no
// tutor-side record (a room going in_progress only proves a STUDENT joined),
// holds it for a week, then closes it unpaid. The ship check found the hold
// resting on two paths that did not exist: the tutor workspace dropped the room
// after 24 hours, and there was no admin accrual at all — so a tutor who taught
// a Hall and forgot the roster was silently never paid, recoverable only by
// hand-written SQL. It also found the hold could starve the sweep: held rooms
// sort to the front of a fixed window every tick, so once enough of them piled
// up the tutors who DID close their rosters stopped being paid too.
//
// Splitting the query into two batches only moved that starvation into the
// loop: the batch that MUST close was the tail, so a tick that ran out of
// budget — the normal case for a job that runs fifth behind two Stripe-bound
// sweeps — closed none of them. So the order the budget is spent in is pinned
// here too, with a deadline, which is the only way to see it.
//
// This file pins the closure: the payout rule, the two-batch query AND the
// order it is walked in, what the admin queue admits it cannot see, the two
// human paths, and the T-15 alignment of the 1:1 completion floor.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  groupRoomPayout, completeGroupSessions, accrueGroupRoom,
  settleGroupRoomUnowed, unpaidGroupRooms, UNVERIFIED_ROOM_MS,
} from '@/lib/server/maintenance.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const HOUR = 3600 * 1000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

/**
 * Enough in-memory PostgREST for these sweeps: filters, ordering, limits, a
 * conditional update, and the 0017 unique index on tutor_earnings(group_session_id)
 * — which is the real guard behind every "pay once" claim here.
 */
function db(tables) {
  const t = (name) => (tables[name] ||= []);
  const log = { selects: [] };
  const svc = {
    from(table) {
      const filters = [];
      let patch = null; let op = 'select'; let order = null; let cap = null; let inserted = null;
      const match = (row) => filters.every(([kind, k, v]) => {
        const cell = row[k];
        if (kind === 'eq') return cell === v;
        if (kind === 'neq') return cell !== v;
        if (kind === 'in') return v.includes(cell);
        if (kind === 'lt') return cell < v;
        if (kind === 'gt') return cell > v;
        if (kind === 'gte') return cell >= v;
        return true;
      });
      const resolve = async () => {
        if (op === 'insert') {
          const row = inserted;
          if (table === 'tutor_earnings' && row.group_session_id
            && t(table).some((r) => r.group_session_id === row.group_session_id)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
          }
          t(table).push({ id: `${table}-${t(table).length + 1}`, status: 'accrued', ...row });
          return { data: null, error: null };
        }
        const hit = t(table).filter(match);
        if (op === 'update') {
          for (const row of hit) Object.assign(row, patch);
          return { data: hit.map((r) => ({ ...r })), error: null };
        }
        log.selects.push({ table, filters: [...filters], order, limit: cap });
        const rows = [...hit];
        if (order) {
          rows.sort((a, b) => (a[order.k] < b[order.k] ? -1 : a[order.k] > b[order.k] ? 1 : 0));
          if (!order.asc) rows.reverse();
        }
        return { data: (cap == null ? rows : rows.slice(0, cap)).map((r) => ({ ...r })), error: null };
      };
      const chain = {
        select: () => chain,
        eq: (k, v) => { filters.push(['eq', k, v]); return chain; },
        neq: (k, v) => { filters.push(['neq', k, v]); return chain; },
        in: (k, v) => { filters.push(['in', k, v]); return chain; },
        lt: (k, v) => { filters.push(['lt', k, v]); return chain; },
        gt: (k, v) => { filters.push(['gt', k, v]); return chain; },
        gte: (k, v) => { filters.push(['gte', k, v]); return chain; },
        order: (k, o) => { order = { k, asc: o?.ascending !== false }; return chain; },
        limit: (n) => { cap = n; return chain; },
        update: (p) => { op = 'update'; patch = p; return chain; },
        insert: (row) => { op = 'insert'; inserted = row; return resolve(); },
        maybeSingle: async () => ({ data: (await resolve()).data[0] ?? null, error: null }),
        then: (ok, no) => resolve().then(ok, no),
      };
      return chain;
    },
  };
  return { svc, tables, log };
}

const room = (id, over) => ({
  id, tutor_id: 'tutor-1', status: 'in_progress', kind: 'homework_hall',
  subject: 'Algebra', topic: 'Systems', pay_model: 'flat_hourly',
  tutor_pay_cents: 2500, seat_price_cents: 0, tutor_share: 0.75,
  scheduled_start: ago(3 * HOUR), scheduled_end: ago(2 * HOUR), ...over,
});
const seat = (roomId, over) => ({
  id: `seat-${Math.random().toString(36).slice(2)}`, group_session_id: roomId,
  status: 'booked', paid: true, exit: null, ...over,
});

// ── The payout rule itself ───────────────────────────────────────────────────

test('a flat-hourly room pays its snapshot only if a seat actually settled', () => {
  const r = room('r1');
  assert.equal(groupRoomPayout(r, [seat('r1')]).tutorCut, 2500);
  assert.equal(groupRoomPayout(r, []).tutorCut, 0, 'nobody came — there is no hour to pay for');
  assert.equal(groupRoomPayout(r, [seat('r1', { paid: false })]).tutorCut, 0);
});

test('tutor presence is proven by the roster, never by the room opening', () => {
  // Everything a STUDENT can write leaves tutorWasThere false: the room flips
  // to in_progress on their join, and their own PATCH only sets help_status.
  assert.equal(groupRoomPayout(room('r1'), [seat('r1')]).tutorWasThere, false);
  for (const evidence of [{ status: 'attended' }, { status: 'no_show' }, { exit: { by: 'tutor' } }]) {
    assert.equal(groupRoomPayout(room('r1'), [seat('r1', evidence)]).tutorWasThere, true,
      `roster-only evidence must count: ${JSON.stringify(evidence)}`);
  }
});

// ── The hold ─────────────────────────────────────────────────────────────────

test('inside the hold, an unverified room is neither paid NOR closed', async () => {
  const { svc, tables } = db({ group_session: [room('r1')], group_seat: [seat('r1')], tutor_earnings: [] });
  const r = await completeGroupSessions(svc);
  assert.equal(r.awaitingTutor, 1);
  assert.equal(r.completed, 0);
  assert.equal(tables.tutor_earnings.length, 0);
  assert.equal(tables.group_session[0].status, 'in_progress',
    'the room must stay reachable — closing it is what made the tutor unpayable');
});

test('the tutor closing the roster days later still gets paid on the next tick', async () => {
  // The whole point of keeping the room in their workspace for the hold.
  const tables = { group_session: [room('r1', { scheduled_end: ago(5 * 24 * HOUR) })], group_seat: [seat('r1')], tutor_earnings: [] };
  const { svc } = db(tables);
  assert.equal((await completeGroupSessions(svc)).awaitingTutor, 1);
  tables.group_seat[0].status = 'attended';          // tutor works the roster on day five
  const r = await completeGroupSessions(svc);
  assert.equal(r.completed, 1);
  assert.deepEqual(
    tables.tutor_earnings.map((e) => [e.group_session_id, e.amount_cents]),
    [['r1', 2500]],
  );
});

test('past the hold with no roster ever closed, the room closes unpaid', async () => {
  const tables = {
    group_session: [room('r1', { scheduled_end: ago(UNVERIFIED_ROOM_MS + HOUR) })],
    group_seat: [seat('r1')], tutor_earnings: [],
  };
  const { svc } = db(tables);
  const r = await completeGroupSessions(svc);
  assert.equal(r.closedUnpaid, 1);
  assert.equal(tables.group_session[0].status, 'completed');
  assert.equal(tables.tutor_earnings.length, 0, 'an unverified hour is exactly what the sweep must not pay');
  // …and it is still recoverable: closing does not end the tutor's claim.
  assert.equal((await unpaidGroupRooms(svc)).rooms[0].state, 'closed_unpaid');
});

// ── The starvation the hold used to cause ────────────────────────────────────

test('a week of held rooms cannot starve the tutors who DID close their rosters', async () => {
  // 205 rooms stuck in the hold — more than the old single 200-row window, all
  // of them older than the room that just ended, all of them re-selected every
  // hour. Oldest-first, the fresh room never came up and its tutor stopped
  // being paid too.
  const held = Array.from({ length: 205 }, (_, i) => room(`held-${i}`, {
    scheduled_end: ago(2 * HOUR + (i + 1) * 30 * 60000),
  }));
  const tables = {
    group_session: [...held, room('fresh', { scheduled_end: ago(2 * HOUR) })],
    group_seat: [...held.map((h) => seat(h.id)), seat('fresh', { status: 'attended' })],
    tutor_earnings: [],
  };
  const { svc } = db(tables);
  const r = await completeGroupSessions(svc);
  assert.deepEqual(tables.tutor_earnings.map((e) => e.group_session_id), ['fresh'],
    'the newest room is looked at first, so a verified hour is never queued behind the backlog');
  assert.ok(r.awaitingTutor > 0, 'the held rooms are still reported, just no longer in front');
});

test('rooms past the hold get a reserved slice, so they still close', async () => {
  const expired = Array.from({ length: 3 }, (_, i) => room(`old-${i}`, {
    scheduled_end: ago(UNVERIFIED_ROOM_MS + (i + 1) * HOUR),
  }));
  const inHold = Array.from({ length: 160 }, (_, i) => room(`held-${i}`, {
    scheduled_end: ago(2 * HOUR + i * 30 * 60000),
  }));
  const tables = {
    group_session: [...expired, ...inHold],
    group_seat: [...expired, ...inHold].map((x) => seat(x.id)),
    tutor_earnings: [],
  };
  const { svc } = db(tables);
  const r = await completeGroupSessions(svc);
  assert.equal(r.closedUnpaid, 3, 'the expired batch is read separately from the in-hold one');
});

// ── …and the same starvation, moved into the loop ────────────────────────────
// Reserving ROWS for the past-hold batch does nothing if the loop spends the
// budget before it reaches them. This job runs fifth in the tick behind two
// Stripe-bound sweeps, so a short remainder is the normal case, not the edge:
// with the batches concatenated in-hold-first, a tick that ran out inside batch
// A closed ZERO expired rooms, every tick, for ever.

/** A deadline with room for exactly `rooms` more items, then expired. */
function budgetFor(rooms) {
  let left = rooms;
  return { at: 0, remainingMs: () => left * 1000, expired: () => left-- <= 0 };
}

// One in-hold room per half hour, all with money at stake and no roster, so
// every one of them is a room the sweep will look at and leave alone.
const stuckPile = (n) => Array.from({ length: n }, (_, i) => room(`held-${i}`, {
  scheduled_end: ago(2 * HOUR + i * 30 * 60000),
}));

test('a tick that runs out of budget spends what it had on the rooms that must close', async () => {
  const expired = Array.from({ length: 3 }, (_, i) => room(`old-${i}`, {
    scheduled_end: ago(UNVERIFIED_ROOM_MS + (3 - i) * HOUR),   // old-0 is the oldest
  }));
  const held = stuckPile(100);
  const tables = {
    group_session: [...held, ...expired],
    group_seat: [...held, ...expired].map((x) => seat(x.id)),
    tutor_earnings: [],
  };
  const { svc } = db(tables);
  const r = await completeGroupSessions(svc, { deadline: budgetFor(3) });

  assert.equal(r.closedUnpaid, 3, 'the three rooms past the hold are what the budget bought');
  assert.equal(r.awaitingTutor, 0, 'not one of the 100 rooms that only had to WAIT went first');
  assert.equal(r.deferred, 100, 'and the postponed tail is exactly the batch that loses only an hour');
  assert.deepEqual(
    tables.group_session.filter((x) => x.status === 'completed').map((x) => x.id).sort(),
    ['old-0', 'old-1', 'old-2'],
  );
});

test('with room for one, it is the oldest expired hold that closes', async () => {
  const expired = Array.from({ length: 3 }, (_, i) => room(`old-${i}`, {
    scheduled_end: ago(UNVERIFIED_ROOM_MS + (3 - i) * HOUR),
  }));
  const held = stuckPile(20);
  const tables = {
    group_session: [...held, ...expired],
    group_seat: [...held, ...expired].map((x) => seat(x.id)),
    tutor_earnings: [],
  };
  const { svc } = db(tables);
  const r = await completeGroupSessions(svc, { deadline: budgetFor(1) });
  assert.equal(r.closedUnpaid, 1);
  assert.deepEqual(tables.group_session.filter((x) => x.status === 'completed').map((x) => x.id), ['old-0'],
    'oldest first inside the batch that must close — the longest-overdue hour is the one settled');
});

test('an already-expired deadline touches nothing and says how much it left', async () => {
  // The other half of the contract: stopping early must be a clean stop, not a
  // partial write. Every room is still selectable next tick, in the same order.
  const expired = [room('old-0', { scheduled_end: ago(UNVERIFIED_ROOM_MS + HOUR) })];
  const held = stuckPile(5);
  const tables = {
    group_session: [...held, ...expired],
    group_seat: [...held, ...expired].map((x) => seat(x.id)),
    tutor_earnings: [],
  };
  const { svc } = db(tables);
  const r = await completeGroupSessions(svc, { deadline: budgetFor(0) });
  assert.deepEqual([r.completed, r.closedUnpaid, r.awaitingTutor, r.deferred], [0, 0, 0, 6]);
  assert.equal(tables.group_session.every((x) => x.status === 'in_progress'), true);
  assert.equal(tables.tutor_earnings.length, 0);
});

// ── The admin fallback the sweep's comment promises ──────────────────────────

test('an admin accrual pays exactly what the sweep would have, and only once', async () => {
  const tables = {
    group_session: [room('r1', { status: 'completed', scheduled_end: ago(8 * 24 * HOUR) })],
    group_seat: [seat('r1')], tutor_earnings: [],
  };
  const { svc } = db(tables);
  const first = await accrueGroupRoom(svc, 'r1');
  assert.deepEqual([first.ok, first.amountCents, first.rosterClosed], [true, 2500, false]);
  assert.equal(tables.tutor_earnings.length, 1);
  const second = await accrueGroupRoom(svc, 'r1');
  assert.deepEqual([second.ok, second.code], [false, 'already_accrued'], 'a room is paid once');
  assert.equal(tables.tutor_earnings.length, 1);
});

test('accruing a held room also closes it', async () => {
  const tables = { group_session: [room('r1')], group_seat: [seat('r1')], tutor_earnings: [] };
  const { svc } = db(tables);
  assert.equal((await accrueGroupRoom(svc, 'r1')).ok, true);
  assert.equal(tables.group_session[0].status, 'completed');
});

test('"nothing owed" retires a room without paying, and is reversible', async () => {
  const tables = { group_session: [room('r1')], group_seat: [seat('r1')], tutor_earnings: [] };
  const { svc } = db(tables);
  assert.equal((await settleGroupRoomUnowed(svc, 'r1')).ok, true);
  assert.deepEqual(
    tables.tutor_earnings.map((e) => [e.amount_cents, e.status]), [[0, 'paid']],
    'a zero-cent settled row: it clears the queue and adds nothing to any total',
  );
  assert.deepEqual((await unpaidGroupRooms(svc)).rooms, [], 'the queue can be worked to empty');
  // An admin who called it wrong is not locked out by their own decision.
  const fixed = await accrueGroupRoom(svc, 'r1');
  assert.deepEqual([fixed.ok, fixed.amountCents], [true, 2500]);
  assert.deepEqual(tables.tutor_earnings.map((e) => [e.amount_cents, e.status]), [[2500, 'accrued']]);
});

test('"nothing owed" is refused for a room whose roster WAS closed', async () => {
  // The zero-cent marker is held against the room by the unique index, so a
  // stray click on a verified room would quietly cancel a real payout.
  const tables = {
    group_session: [room('r1')], group_seat: [seat('r1', { status: 'attended' })], tutor_earnings: [],
  };
  const { svc } = db(tables);
  const r = await settleGroupRoomUnowed(svc, 'r1');
  assert.deepEqual([r.ok, r.code], [false, 'roster_closed']);
  assert.equal(tables.tutor_earnings.length, 0);
  // …and the sweep pays it, exactly as it was going to.
  await completeGroupSessions(svc);
  assert.deepEqual(tables.tutor_earnings.map((e) => e.amount_cents), [2500]);
});

test('the admin queue shows what is owed and nothing that is not', async () => {
  const tables = {
    group_session: [
      room('held', { scheduled_end: ago(3 * HOUR) }),
      room('paid-already', { status: 'completed', scheduled_end: ago(4 * HOUR) }),
      room('empty', { scheduled_end: ago(5 * HOUR) }),          // no settled seat → owes nothing
    ],
    group_seat: [seat('held'), seat('paid-already'), seat('empty', { paid: false })],
    tutor_earnings: [{ id: 'e1', group_session_id: 'paid-already', amount_cents: 2500, status: 'accrued' }],
    tutors: [{ id: 'tutor-1', display_name: 'Ada' }],
  };
  const { svc } = db(tables);
  const { rooms: queue, total, truncated } = await unpaidGroupRooms(svc);
  assert.deepEqual(queue.map((q) => q.roomId), ['held']);
  assert.deepEqual([total, truncated], [1, false], 'one room owed, and the list is all of it');
  assert.equal(queue[0].tutorName, 'Ada');
  assert.equal(queue[0].wouldPayCents, 2500);
  assert.equal(queue[0].state, 'awaiting_tutor');
  assert.ok(queue[0].holdExpiresAt > new Date().toISOString(), 'the tutor still has time to close it');
});

test('a cut queue says it was cut, and counts what is behind the page', async () => {
  // The promise is that a room stays listed until it is settled. A bare array
  // sliced to the limit broke it silently: 45 unpaid rooms and 10 on screen
  // looked exactly like 10 unpaid rooms. (45 rooms also spans three seat-read
  // chunks, so this pins that rooms past the first chunk are still counted.)
  const owed = Array.from({ length: 45 }, (_, i) => room(`owed-${i}`, {
    status: 'completed', scheduled_end: ago(2 * HOUR + i * HOUR),
  }));
  const tables = {
    group_session: owed,
    group_seat: owed.map((r) => seat(r.id)),
    tutor_earnings: [],
    tutors: [{ id: 'tutor-1', display_name: 'Ada' }],
  };
  const { svc } = db(tables);
  const page = await unpaidGroupRooms(svc, { limit: 10 });
  assert.equal(page.rooms.length, 10, 'the page is the page');
  assert.equal(page.total, 45, 'and the total is the truth behind it');
  assert.equal(page.truncated, true);
  assert.equal(page.lookbackDays, 90, 'the window searched is stated, not assumed');
  assert.equal(page.rooms[0].tutorName, 'Ada', 'names are resolved for the rooms actually returned');
});

test('the lookback is a real edge, and the queue says how far back it looked', async () => {
  const tables = {
    group_session: [
      room('recent', { status: 'completed', scheduled_end: ago(3 * HOUR) }),
      room('ancient', { status: 'completed', scheduled_end: ago(120 * 24 * HOUR) }),
    ],
    group_seat: [seat('recent'), seat('ancient')],
    tutor_earnings: [],
  };
  const { svc } = db(tables);
  const all = await unpaidGroupRooms(svc);
  assert.deepEqual(all.rooms.map((r) => r.roomId), ['recent'],
    'a room older than the lookback is not scanned — which is why the window is reported');
  assert.deepEqual([all.total, all.truncated, all.lookbackDays], [1, false, 90]);
  // Widen the window and the older room is there, with the new window named.
  const wide = await unpaidGroupRooms(svc, { lookbackMs: 200 * 24 * HOUR });
  assert.deepEqual(wide.rooms.map((r) => r.roomId), ['recent', 'ancient']);
  assert.equal(wide.lookbackDays, 200);
});

// ── The two surfaces, pinned in source ───────────────────────────────────────

test('the tutor workspace keeps a held room for as long as it is held', () => {
  const group = src('app/api/tutoring/group/route.js');
  assert.match(group, /UNVERIFIED_ROOM_MS/, 'the workspace window must track the hold, not 24 hours');
  assert.match(group, /needsRoster/);
  assert.match(group, /holdExpiresAt/);
  // The held query is its own bounded read, so a week of past rooms cannot
  // crowd the upcoming ones out of the 40-row workspace list.
  assert.match(group, /\.lt\('scheduled_end', nowIso\)\.gte\('scheduled_end', holdFloor\)/);
});

test('the admin route can settle a room, admin-only, and never takes an amount', () => {
  const route = src('app/api/admin/earnings/route.js');
  assert.match(route, /export async function POST/);
  assert.match(route, /accrueGroupRoom|settleGroupRoomUnowed/);
  assert.ok(route.includes("if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });"));
  assert.doesNotMatch(route, /body\?\.(amount|amountCents|amount_cents)/,
    'the payout is recomputed from the room, never typed by the caller');
  assert.match(route, /earnings\.room_accrued/, 'a hand accrual is audited');
});

test('the 1:1 completion floor agrees with the room-open gate', () => {
  const sessions = src('app/api/tutoring/sessions/route.js');
  const roomRoute = src('app/api/tutoring/room/route.js');
  // The product opens the room at T-15 and calls that the session starting;
  // the floor refused in_progress until T+0 with an error naming a future time.
  assert.match(roomRoute, /scheduled_start\)\.getTime\(\) - Date\.now\(\) > 15 \* 60000/);
  assert.match(sessions, /const ROOM_OPEN_LEAD_MS = 15 \* 60000;/);
  assert.match(sessions, /const opensAt = startsAt - ROOM_OPEN_LEAD_MS;/);
  assert.match(sessions, /Date\.now\(\) < opensAt/);
  assert.doesNotMatch(sessions, /Date\.now\(\) < startsAt/);
});
