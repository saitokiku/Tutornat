// The hourly tick's time budget (H12, 2026-08-18 audit).
//
// Fourteen jobs shared one 60s invocation, and the FIRST of them made two
// serial Stripe calls per stale hold against a 200-row bound. At ~85 abandoned
// checkouts that job ate the tick — and a timeout kills the invocation outright,
// so the route's per-job try/catch never fires, no response is written, and
// nothing is logged. The clinic refunds, the confirm-or-release sweep and the
// waitlist notifications behind it silently never ran, hour after hour, while
// the next tick queued up behind the same backlog.
//
// The fix has four parts and each is pinned below: a deadline the tick checks
// between jobs and between rows, bounded Stripe concurrency, money-critical
// jobs first, and a response that says which jobs it never reached.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDeadline, forEachBounded, completeEndedSessions } from '@/lib/server/maintenance.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');
const route = src('app/api/cron/maintenance/route.js');

// ── The clock ────────────────────────────────────────────────────────────────

test('a deadline expires, and an absent one never does', () => {
  let t = 1000;
  const clock = startDeadline(500, { now: () => t });
  assert.equal(clock.expired(), false);
  assert.equal(clock.remainingMs(), 500);
  t = 1499;
  assert.equal(clock.expired(), false);
  t = 1500;
  assert.equal(clock.expired(), true, 'at the deadline, not merely past it');
  // The lazy in-request callers and the admin routes pass nothing at all.
  const none = undefined;
  assert.equal(none?.expired?.() ?? false, false);
});

// ── Bounded parallelism ──────────────────────────────────────────────────────

test('forEachBounded runs at most `limit` items at once', async () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  let inFlight = 0;
  let peak = 0;
  const r = await forEachBounded(items, async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((res) => setTimeout(res, 1));
    inFlight -= 1;
  }, { limit: 5 });
  assert.equal(peak, 5, 'five Stripe round trips at a time, not one and not twenty');
  assert.deepEqual(r, { processed: 20, deferred: 0 });
});

test('it stops at the deadline and REPORTS what it left — a truncated sweep must not read as complete', async () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  let t = 0;
  const clock = startDeadline(3, { now: () => t });
  const touched = [];
  const r = await forEachBounded(items, async (i) => { touched.push(i); t += 1; }, { limit: 1, deadline: clock });
  assert.equal(touched.length, 3, 'stopped when the budget ran out');
  assert.deepEqual(r, { processed: 3, deferred: 7 });
});

test('an item that has STARTED always finishes', async () => {
  // Releasing a hold and expiring its payment link are one unit: stopping
  // between them leaves a dead hold with a live link, which is REL-001.
  let t = 0;
  const clock = startDeadline(1, { now: () => t });
  const steps = [];
  const r = await forEachBounded(['hold-1', 'hold-2'], async (id) => {
    steps.push(`release:${id}`);
    t += 1000;                       // the budget runs out mid-item
    steps.push(`expire-link:${id}`);
  }, { limit: 1, deadline: clock });
  assert.deepEqual(steps, ['release:hold-1', 'expire-link:hold-1'],
    'the deadline is checked between items, never inside one');
  assert.deepEqual(r, { processed: 1, deferred: 1 }, 'the next hold waits for the next tick');
});

test('a failing item is rethrown, but only once every worker is quiet', async () => {
  let running = 0;
  await assert.rejects(
    () => forEachBounded([1, 2, 3, 4], async (i) => {
      running += 1;
      await new Promise((res) => setTimeout(res, 2));
      running -= 1;
      if (i === 1) throw new Error('stripe exploded');
    }, { limit: 4 }),
    /stripe exploded/,
  );
  assert.equal(running, 0, 'no worker is left running against an invocation that has moved on');
});

// ── The sweep survives what the unique index now refuses ─────────────────────

/** Just enough PostgREST for completeEndedSessions: read, claim, accrue, fee. */
function sweepStub(sessions, { insertError = null } = {}) {
  const log = { inserts: [], fees: [] };
  const svc = {
    from(table) {
      const f = {};
      let patch = null;
      const resolve = async () => {
        if (table === 'tutoring_sessions') {
          if (patch?.platform_fee_cents !== undefined) {
            log.fees.push({ id: f.id, fee: patch.platform_fee_cents });
            return { data: [], error: null };
          }
          if (patch?.status === 'completed') {
            const s = sessions.find((x) => x.id === f.id && x.status === f.status);
            if (s) s.status = 'completed';
            return { data: s ? [{ id: s.id }] : [], error: null };
          }
          return { data: sessions.filter((x) => x.status === 'in_progress'), error: null };
        }
        return { data: [], error: null };   // the tutor_earnings read loses the race
      };
      const chain = {
        select: () => chain,
        eq: (k, v) => { f[k] = v; return chain; },
        lt: () => chain,
        in: () => chain,
        limit: () => chain,
        update: (p) => { patch = p; return chain; },
        insert: (row) => { log.inserts.push({ table, row }); return Promise.resolve({ data: null, error: insertError }); },
        maybeSingle: async () => ({ data: (await resolve()).data[0] ?? null, error: null }),
        then: (ok, no) => resolve().then(ok, no),
      };
      return chain;
    },
  };
  return { svc, log };
}

const ranSession = (id) => ({
  id, status: 'in_progress', tutor_id: 'tutor-1', paid: true, intro_free: false,
  pay_model: 'flat_hourly', tutor_pay_cents: 3000, amount_cents: 4000,
  scheduled_start: new Date(Date.now() - 4 * 3600000).toISOString(),
  scheduled_end: new Date(Date.now() - 3 * 3600000).toISOString(),
});

test('the sweep accrues once and records the platform fee', async () => {
  const { svc, log } = sweepStub([ranSession('s-1')]);
  const r = await completeEndedSessions(svc);
  assert.deepEqual(r, { completed: 1, deferred: 0 });
  assert.equal(log.inserts.length, 1);
  assert.deepEqual(log.fees, [{ id: 's-1', fee: 1000 }]);
});

test('a duplicate-earnings refusal is the CORRECT outcome, not a crash', async () => {
  // 0031 put a unique index on tutor_earnings(tutoring_session_id). The read
  // above the insert is an optimisation; the index is the guard, and it fires
  // when the tutor's own "Complete" (or an overlapping tick) got there first.
  const sessions = [ranSession('s-1'), ranSession('s-2')];
  const { svc, log } = sweepStub(sessions, {
    insertError: { code: '23505', message: 'duplicate key value violates unique constraint "tutor_earnings_session_idx"' },
  });
  const r = await completeEndedSessions(svc);
  assert.deepEqual(r, { completed: 2 , deferred: 0 }, 'the collision must not abort the rest of the sweep');
  assert.deepEqual(log.fees, [], 'the row that actually accrued owns the fee; we do not overwrite it');
});

test('out of budget, the sweep stops and says how many rows it left', async () => {
  const { svc, log } = sweepStub([ranSession('s-1'), ranSession('s-2'), ranSession('s-3')]);
  const r = await completeEndedSessions(svc, { deadline: startDeadline(0) });
  assert.deepEqual(r, { completed: 0, deferred: 3 });
  assert.equal(log.inserts.length, 0);
  // Untouched rows are still 'in_progress', so next hour selects the same set.
});

// ── The tick: order, budget, and an honest report ────────────────────────────

test('maxDuration is raised, and the tick stops itself before the platform does', () => {
  const max = Number(route.match(/export const maxDuration = (\d+)/)?.[1]);
  assert.ok(max >= 300, 'a 60s ceiling for fourteen jobs is what starved them');
  const budget = route.match(/const TICK_BUDGET_MS = \(maxDuration - (\d+)\) \* 1000/);
  assert.ok(budget, 'the tick budget must be derived from maxDuration, not typed twice');
  assert.ok(Number(budget[1]) > 0, 'with headroom left to write the response');
  assert.ok(/clock\.remainingMs\(\) < MIN_JOB_MS/.test(route), 'and it is consulted between jobs');
});

test('money-critical jobs come first', () => {
  const at = (name) => {
    const i = route.indexOf(`name: '${name}'`);
    assert.ok(i > 0, `${name} must still be in the tick`);
    return i;
  };
  // Refunds owed to families lead: nothing re-scans a cancelled room.
  for (const later of ['sendDueReminders', 'materializeSeries', 'purgeExpiredTranscripts', 'sendMonthlySummaries']) {
    assert.ok(at('resolveGroupFill') < at(later), `resolveGroupFill must precede ${later}`);
  }
  // Then the holds whose payment link must die, then earnings.
  assert.ok(at('releaseAbandoned') < at('completeEndedSessions'));
  assert.ok(at('completeEndedSessions') < at('materializeSeries'));
  assert.ok(at('completeGroupSessions') < at('purgeExpiredTranscripts'));
  // Retention and the monthly summary are the only things that may be dropped.
  assert.ok(at('purgeExpiredTranscripts') > at('releaseUnconfirmedSeats'));

  // Two orderings are correctness, not priority, and must survive any reshuffle.
  assert.ok(at('sendDueGroupReminders') < at('releaseUnconfirmedSeats'),
    'nobody may be released from a seat without first having been asked to confirm it');
  assert.ok(at('materializeSeries') < at('bookStandingSeats'),
    'standing seats book into rooms materializeSeries creates');

  assert.equal((route.match(/\bname: '/g) || []).length, 14, 'all fourteen jobs still run');
});

test('every job that can stop early is handed the clock', () => {
  for (const job of [
    'releaseAbandoned', 'releaseAbandonedSeats', 'completeEndedSessions',
    'completeGroupSessions', 'cancelEmptyFreeRooms', 'releaseUnconfirmedSeats',
    'purgeExpiredTranscripts',
  ]) {
    assert.ok(new RegExp(`${job}\\(svc, \\{ deadline \\}\\)`).test(route), `${job} must honour the deadline`);
  }
  // resolveGroupFill deliberately does not: by the time its refunds run the
  // rooms are already cancelled, and no other sweep looks for a cancelled room
  // with money still held in it. Deferring there would drop the refund.
  assert.ok(/resolveGroupFill\(svc\)/.test(route));
  const fill = src('lib/server/maintenance.js');
  assert.ok(/A refund this job does not\n \* make is a refund nobody makes\./.test(fill),
    'and the reason is written down where the next person will change it');
});

test('a truncated tick reports itself instead of looking healthy', () => {
  assert.ok(/skipped\.push\(job\.name\)/.test(route), 'the jobs never reached are named');
  assert.ok(/failures\.length \|\| truncated \? 207 : 200/.test(route),
    'a 200 that quietly skipped half the tick is indistinguishable from a healthy one');
  assert.ok(/ok: failures\.length === 0 && !truncated/.test(route));
  assert.ok(/skipped=\$\{skipped\.join\(','\) \|\| 'none'\}/.test(route), 'and it lands in the cron log');
});
