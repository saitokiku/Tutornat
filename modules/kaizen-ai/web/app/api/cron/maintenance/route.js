// GET /api/cron/maintenance — the scheduled sweep (audit REL-005, DATA-001).
// Wired via vercel.json crons (hourly). Fourteen independent jobs run in one
// invocation: money and start-time-critical work first, catalog and retention
// housekeeping behind it.
// Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the env var
// is set. Without CRON_SECRET the route refuses to run (fail closed).

import { timingSafeEqual } from 'node:crypto';
import { serviceClient } from '@/lib/server/context';
import {
  startDeadline,
  releaseAbandoned, completeEndedSessions, sendDueReminders, purgeExpiredTranscripts,
  resolveGroupFill, completeGroupSessions, releaseAbandonedSeats, cancelEmptyFreeRooms,
  sendDueGroupReminders, releaseUnconfirmedSeats,
} from '@/lib/server/maintenance';
import { materializeSeries, bookStandingSeats } from '@/lib/server/series';
import { expireStaleWaitlists } from '@/lib/server/waitlist';
import { sendMonthlySummaries } from '@/lib/server/parentSummary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel's ceiling for the Node runtime on Hobby (Pro allows more); the tick
// budget below is what actually governs, so raising the plan raises headroom
// without changing behaviour. It used to be 60s for fourteen jobs, one of which
// could spend all of it on Stripe round trips (H12).
export const maxDuration = 300;

// Stop handing out work with 30s left, so the job in flight can finish the row
// it started and the response can actually be written. An invocation killed at
// maxDuration logs nothing at all — a silent starved tick is the exact failure
// this budget exists to make visible.
const TICK_BUDGET_MS = (maxDuration - 30) * 1000;
// Don't start a job we cannot plausibly finish a row of.
const MIN_JOB_MS = 3000;

// ORDER IS THE POINT. Every job here is idempotent and resumable, so a tick
// that runs out of time simply stops and the next one picks up the same rows;
// what matters is WHAT it got through first. Money the platform owes a family,
// holds whose payment link must die before it can be paid again, and earnings a
// tutor is owed come before catalog maintenance and the retention purge. The
// audit found the previous order spending a whole 60s tick on abandoned
// checkouts and never reaching the clinic refunds at all.
//
// Two orderings are load-bearing rather than merely sensible, and are marked
// where they occur: reminders before confirm-or-release, and materializeSeries
// before bookStandingSeats.
const JOBS = [
  // ── Money and start-time-critical ──────────────────────────────────────────
  // Under-filled clinics: confirm the ones that made their minimum, cancel and
  // refund the ones that did not. First because the RPC has already cancelled
  // those rooms by the time the refunds run, and nothing else ever looks for a
  // cancelled room with money still held in it.
  { key: 'groupFill', name: 'resolveGroupFill', run: (svc) => resolveGroupFill(svc) },
  // Abandoned holds: free the slot/seat and expire the stale payment link
  // before it can be paid (REL-001). Both verify with Stripe first, so they are
  // also the backstop for a webhook that never arrived.
  { key: 'released', name: 'releaseAbandoned', run: (svc, deadline) => releaseAbandoned(svc, { deadline }) },
  { key: 'seatsReleased', name: 'releaseAbandonedSeats', run: (svc, deadline) => releaseAbandonedSeats(svc, { deadline }) },
  // Earnings for the sessions and rooms that actually ran.
  { key: 'completed', name: 'completeEndedSessions', run: (svc, deadline) => completeEndedSessions(svc, { deadline }) },
  { key: 'groupCompleted', name: 'completeGroupSessions', run: (svc, deadline) => completeGroupSessions(svc, { deadline }) },
  // A free room with nobody in it an hour out is cancelled, so a tutor is never
  // paid to sit in an empty one. After the release sweeps, which is what makes
  // the seat count true.
  { key: 'emptyRooms', name: 'cancelEmptyFreeRooms', run: (svc, deadline) => cancelEmptyFreeRooms(svc, { deadline }) },

  // ── Notifications inside a fixed window ────────────────────────────────────
  { key: 'reminders', name: 'sendDueReminders', run: (svc) => sendDueReminders(svc) },
  { key: 'groupReminders', name: 'sendDueGroupReminders', run: (svc) => sendDueGroupReminders(svc) },
  // Confirm-or-release (0029) MUST stay behind the group reminders: the
  // reminder IS the ask, and nobody may be released without having been asked.
  { key: 'unconfirmed', name: 'releaseUnconfirmedSeats', run: (svc, deadline) => releaseUnconfirmedSeats(svc, { deadline }) },

  // ── Catalog and housekeeping ───────────────────────────────────────────────
  // Materialize the coming two weeks of every active, staffed series into
  // bookable rooms (idempotent — a re-run inserts nothing).
  { key: 'series', name: 'materializeSeries', run: (svc) => materializeSeries(svc) },
  // Standing member seats book into this month's fresh rooms (0029) — a booking
  // like any other: allowance-metered, guardian-gated, never charged. Behind
  // materializeSeries, which is what creates the rooms it books into.
  { key: 'standing', name: 'bookStandingSeats', run: (svc) => bookStandingSeats(svc) },
  { key: 'waitlistSwept', name: 'expireStaleWaitlists', run: (svc) => expireStaleWaitlists(svc) },
  // Retention (DATA-001): a batch that slips an hour is still inside the
  // disclosed window.
  { key: 'purged', name: 'purgeExpiredTranscripts', run: (svc, deadline) => purgeExpiredTranscripts(svc, { deadline }) },
  // Monthly parent summaries: self-gates to the first 48h of each month and is
  // idempotent per parent/child/month, so hourly firing is harmless — and so is
  // slipping an hour, which is why it is last.
  { key: 'summaries', name: 'sendMonthlySummaries', run: (svc) => sendMonthlySummaries(svc) },
];

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'CRON_SECRET not configured.' }, { status: 501 });
  const given = Buffer.from(req.headers.get('authorization') || '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Database not configured.' }, { status: 501 });

  // Each job is isolated. Previously the first four were awaited with no catch,
  // so a single Stripe blip inside completeEndedSessions aborted the whole tick
  // BEFORE resolveGroupFill ran — meaning under-filled rooms were never
  // cancelled and the students in them were never refunded. The jobs are
  // independent; one failing must not silence the rest.
  //
  // Failures are reported rather than swallowed: a 200 that quietly did nothing
  // is indistinguishable from a healthy tick, and this runs unattended hourly.
  // The clock closes the one hole that try/catch cannot: a timeout kills the
  // invocation outright, so the tick has to stop itself before the platform
  // does, and say which jobs it never reached.
  const startedAt = Date.now();
  const clock = startDeadline(TICK_BUDGET_MS);
  const failures = [];
  const skipped = [];
  const results = {};

  for (const job of JOBS) {
    if (clock.remainingMs() < MIN_JOB_MS) { skipped.push(job.name); continue; }
    try {
      results[job.key] = await job.run(svc, clock);
    } catch (e) {
      failures.push({ job: job.name, error: e?.message || String(e) });
      console.error(`[cron/maintenance] ${job.name} failed:`, e?.message);
      results[job.key] = null;
    }
  }

  const summary = Object.entries(results)
    .map(([k, v]) => `${k}=${v !== null && typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' ');
  console.log(`[cron/maintenance] ${summary} skipped=${skipped.join(',') || 'none'} failures=${failures.length} ms=${Date.now() - startedAt}`);

  // 207 Multi-Status: some jobs ran, some did not — whether because they failed
  // or because the tick ran out of budget before reaching them. Vercel surfaces
  // the non-200 in the cron log, which is the only place anyone would notice.
  const truncated = skipped.length > 0;
  return Response.json(
    {
      ok: failures.length === 0 && !truncated,
      failures, skipped, truncated, durationMs: Date.now() - startedAt,
      ...results,
    },
    { status: failures.length || truncated ? 207 : 200 },
  );
}
