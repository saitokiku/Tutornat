// Scheduled maintenance shared by the cron route (/api/cron/maintenance —
// primary, audit REL-005) and lazy in-request calls (backup between ticks).
// Everything here is idempotent and safe to run concurrently.

import { getStripe } from '@/lib/server/stripe';
import { sendReminderEmail, sendGroupReminderEmail, sendSeatReleasedEmail } from '@/lib/server/tutoringEmails';
import { fulfillTutoringCheckout, fulfillGroupSeatCheckout } from '@/lib/server/billing';
import { earningsSplit, groupEarnings } from '@/lib/server/sessionStates';
import { tutorPayCents } from '@/lib/server/clubPricing';
import { restoreAllowance } from '@/lib/server/clubBilling';
import { STANDING_FEATURE } from '@/lib/server/series';
import { shouldReleaseSeat, RELEASE_LEAD_MS } from '@/lib/server/occupancy';
import { notifySeatOpened } from '@/lib/server/waitlist';

const ABANDON_MS = 30 * 60000;          // unpaid holds expire after 30 minutes
const COMPLETE_GRACE_MS = 30 * 60000;   // auto-complete 30 min after scheduled end
const REMINDER_WINDOW_MS = 24 * 3600 * 1000;
// How long a group room that ended with no sign the TUTOR was there stays open
// for one to appear before it is closed unpaid. See completeGroupSessions.
// Exported because the hold is only honest if the two humans who can end it can
// SEE it for its whole length: /api/tutoring/group?tutorView=1 keeps a held room
// in the tutor's workspace for exactly this long, and /api/admin/earnings lists
// it for an admin.
export const UNVERIFIED_ROOM_MS = 7 * 24 * 3600 * 1000;
export const TRANSCRIPT_RETENTION_MONTHS = 24;  // DATA-001 retention schedule
const STRIPE_CONCURRENCY = 5;           // parallel Stripe round trips per sweep

// PostgREST reports a unique-index collision as SQLSTATE 23505; older stacks
// only carry it in the message.
const isUniqueViolation = (e) => e?.code === '23505' || /duplicate key/i.test(e?.message || '');

/**
 * The tick clock every sweep in this file accepts. Declared as a typedef so
 * `{ deadline } = {}` destructuring keeps its type — without it TypeScript
 * infers the parameter from the `{}` default and every call site fails
 * checkJs, which is what happened when the deadline threading landed.
 *
 * @typedef {{ at: number, remainingMs: () => number, expired: () => boolean }} Deadline
 * @typedef {{ deadline?: Deadline }} SweepOpts
 */

/**
 * The tick's time budget, threaded through every sweep in this file.
 *
 * A serverless invocation is killed at maxDuration with no unwinding: the cron
 * route's per-job try/catch never fires, whatever was in flight is simply gone,
 * and no response is ever written — so a starved tick is indistinguishable from
 * a healthy one in the log. That is how the audit found the hourly cron running
 * fourteen jobs inside a single 60s budget, with roughly 1.4s of serial Stripe
 * latency per stale hold in the FIRST of them: about 85 abandoned checkouts ate
 * the whole tick, and the clinic refunds, the confirm-or-release sweep and the
 * waitlist notifications behind it silently never ran — hour after hour, with
 * the next tick re-attempting the same backlog first.
 *
 * So every loop that makes a network call asks whether there is time left, and
 * stops cleanly when there is not, reporting what it deferred. Stopping early
 * is safe precisely because every job here is idempotent: the rows it did not
 * reach are picked up next hour exactly as if this tick had never started.
 *
 * Pass no deadline (the lazy in-request callers, the admin routes) and nothing
 * changes — an absent deadline never expires.
 */
export function startDeadline(budgetMs, { now = Date.now } = {}) {
  const at = now() + budgetMs;
  return {
    at,
    remainingMs: () => at - now(),
    expired: () => now() >= at,
  };
}

/**
 * Run `fn` over `items` with bounded parallelism, checking the deadline BETWEEN
 * items. An item that has started always finishes: these sweeps release a hold
 * and then expire its payment link, and stopping between those two leaves a
 * dead hold with a live payment link — precisely the resurrection REL-001 was
 * about. The check belongs between items, never inside one.
 *
 * Concurrency is what keeps the deadline from mattering most hours: five at a
 * time is well under Stripe's rate limit and turns a full 200-row backlog from
 * about five minutes of serial round trips into under a minute.
 *
 * Returns { processed, deferred } so a truncated sweep reports itself instead
 * of looking complete.
 */
/** @param {any[]} items @param {(item: any) => Promise<any>} fn
 *  @param {{ limit?: number, deadline?: Deadline }} [opts] */
export async function forEachBounded(items, fn, { limit = STRIPE_CONCURRENCY, deadline } = {}) {
  const list = items || [];
  let next = 0;
  let processed = 0;
  const worker = async () => {
    while (next < list.length) {
      if (deadline?.expired()) return;
      const item = list[next++];
      await fn(item);
      processed += 1;
    }
  };
  // allSettled rather than all: a rejection must not leave the other workers
  // running unobserved against a client that has already moved on. The first
  // failure is rethrown once everything is quiet, so the cron route still
  // records the job as failed.
  const settled = await Promise.allSettled(
    Array.from({ length: Math.min(limit, list.length) }, worker),
  );
  const failed = settled.find((r) => r.status === 'rejected');
  if (failed) throw failed.reason;
  return { processed, deferred: list.length - processed };
}

// Reclaim slots whose checkout was never completed, and EXPIRE the Stripe
// Checkout session so the stale payment link dies with the hold (audit
// REL-001 — a link that stays payable after release is how cancelled sessions
// get resurrected).
/** @param {any} svc @param {SweepOpts} [opts] */
export async function releaseAbandoned(svc, { deadline } = {}) {
  const cutoff = new Date(Date.now() - ABANDON_MS).toISOString();
  const { data: stale } = await svc.from('tutoring_sessions')
    .select('*')
    .eq('status', 'pending_payment').lt('created_at', cutoff)
    .limit(200);   // bounded sweep (audit: no unbounded queries on scheduled jobs)
  const stripe = getStripe();
  let released = 0;
  // Two Stripe round trips per hold, bounded and parallel rather than serial —
  // this job's serial loop is what used to starve every job behind it (H12).
  const { deferred } = await forEachBounded(stale, async (s) => {
    // Before cancelling, ask Stripe whether this hold was actually PAID. A slow
    // or missing webhook must never let us cancel a session the student already
    // paid for (audit REL-001/0.2). If paid, fulfill it and leave the slot.
    if (stripe && s.stripe_checkout_session_id) {
      try {
        const cs = await stripe.checkout.sessions.retrieve(s.stripe_checkout_session_id);
        if (cs?.payment_status === 'paid') {
          await fulfillTutoringCheckout(svc, stripe, s, cs); // → paid + scheduled
          return;
        }
      } catch { /* couldn't verify — fall through to release, then expire the link */ }
    }
    if (s.availability_id) {
      await svc.from('tutor_availability').update({ status: 'open' })
        .eq('id', s.availability_id).eq('status', 'booked');
    }
    await svc.from('tutoring_sessions').update({ status: 'cancelled' }).eq('id', s.id);
    released += 1;
    if (stripe && s.stripe_checkout_session_id) {
      // Kill the stale payment link so it can't be paid after release.
      try { await stripe.checkout.sessions.expire(s.stripe_checkout_session_id); } catch { /* noop */ }
    }
  }, { deadline });
  return { released, deferred };
}

// Auto-complete sessions that demonstrably happened so tutor earnings actually
// accrue without the tutor remembering to click "Complete" (audit: paid
// sessions could stay un-payable forever). We only auto-complete 'in_progress'
// sessions (a video room was opened → the session started) past their end +
// grace; 'scheduled' sessions that never started are left for manual handling
// so we never pay out a no-show. Accrual is idempotent; pre-club rows accrue
// only when the learner paid, while club rows (flat_hourly) accrue for any
// session that ran — including $0 intro/credit hours the tutor still worked.
/** @param {any} svc @param {SweepOpts} [opts] */
export async function completeEndedSessions(svc, { deadline } = {}) {
  const cutoff = new Date(Date.now() - COMPLETE_GRACE_MS).toISOString();
  const { data: ended } = await svc.from('tutoring_sessions')
    .select('*')
    .eq('status', 'in_progress')
    .lt('scheduled_end', cutoff)
    .limit(200);
  const rows = ended || [];
  let completed = 0;
  let deferred = 0;
  for (let i = 0; i < rows.length; i++) {
    // Out of budget: the untouched rows are still 'in_progress', so next hour's
    // tick selects exactly the same set. Stopping costs nothing but an hour.
    if (deadline?.expired()) { deferred = rows.length - i; break; }
    const s = rows[i];
    // Atomic transition so a concurrent PATCH can't double-process.
    const { data: moved } = await svc.from('tutoring_sessions')
      .update({ status: 'completed' })
      .eq('id', s.id).eq('status', 'in_progress').select('id').maybeSingle();
    if (!moved) continue;
    completed += 1;
    // Accrue the tutor's cut once. Club-era rows (pay_model = flat_hourly) pay
    // the snapshotted hourly amount for any session that RAN — including intro
    // and membership-credit sessions, where the learner paid $0 but the tutor
    // still worked the hour. Pre-club rows keep the paid-only 89/11 rule.
    const flatHourly = s.pay_model === 'flat_hourly';
    const settled = flatHourly ? true : (s.paid && !s.intro_free);
    if (settled) {
      const existing = await svc.from('tutor_earnings').select('id').eq('tutoring_session_id', s.id).maybeSingle();
      if (!existing.data) {
        let tutorCut; let fee;
        if (flatHourly) {
          tutorCut = s.tutor_pay_cents
            ?? tutorPayCents(null, (new Date(s.scheduled_end).getTime() - new Date(s.scheduled_start).getTime()) / 60000);
          fee = (s.amount_cents || 0) - tutorCut;
        } else {
          ({ tutorCut, fee } = earningsSplit(s.amount_cents, s.intro_free));
        }
        if (tutorCut > 0) {
          const { error: eErr } = await svc.from('tutor_earnings')
            .insert({ tutor_id: s.tutor_id, tutoring_session_id: s.id, amount_cents: tutorCut });
          // 0031 put a unique index on tutor_earnings(tutoring_session_id), so
          // the read above is an optimisation and this is the real guard. A
          // 23505 means the tutor's own "Complete" (or an overlapping tick)
          // accrued this session first — one payout per session is the
          // invariant, so the refusal IS the correct outcome and the sweep
          // carries on. The winner recorded the fee; only the winner writes it.
          if (!eErr) {
            await svc.from('tutoring_sessions').update({ platform_fee_cents: fee }).eq('id', s.id);
          } else if (!isUniqueViolation(eErr)) {
            console.error('[maintenance] 1:1 earnings accrual failed', s.id, eErr.message);
          }
        }
      }
    }
  }
  return { completed, deferred };
}

// T-24h reminder sweep across ALL users (the cron owner). The conditional
// update claims each reminder atomically so it sends exactly once even if the
// sweep runs concurrently with a lazy call.
export async function sendDueReminders(svc) {
  const nowIso = new Date().toISOString();
  const in24hIso = new Date(Date.now() + REMINDER_WINDOW_MS).toISOString();
  const { data: due } = await svc.from('tutoring_sessions')
    .update({ reminder_sent_at: nowIso })
    .eq('status', 'scheduled')
    .is('reminder_sent_at', null)
    .gt('scheduled_start', nowIso).lt('scheduled_start', in24hIso)
    .select('id,subject,tutor_id,student_id,scheduled_start,scheduled_end');
  // Await the sends so they flush before the serverless function can freeze
  // (audit: fire-and-forget emails in a loop could be dropped mid-cron).
  await Promise.allSettled((due || []).map((s) => sendReminderEmail(svc, s)));
  return (due || []).length;
}

// Retention purge (audit DATA-001): AI chat transcripts and voice-session
// records older than the retention window are deleted. Mirrors the schedule
// disclosed in the privacy policy and docs/compliance/RETENTION.md.
/** @param {any} svc @param {SweepOpts} [opts] */
export async function purgeExpiredTranscripts(svc, { deadline } = {}) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - TRANSCRIPT_RETENTION_MONTHS);
  const iso = cutoff.toISOString();

  // Delete in bounded batches instead of one unbounded DELETE, so a large
  // backlog can't blow the cron's time budget or lock the table (audit 3.4).
  let truncated = false;
  async function purge(table, tsCol) {
    let total = 0;
    for (let i = 0; i < 40; i++) {   // hard cap: 40 × 500 = 20k rows/run
      // Retention is a schedule, not a deadline — a batch that slips to the
      // next tick is still inside the disclosed window, and the alternative is
      // starving the money jobs behind this one.
      if (deadline?.expired()) { truncated = true; break; }
      const { data } = await svc.from(table).select('id').lt(tsCol, iso).limit(500);
      const ids = (data || []).map((r) => r.id);
      if (!ids.length) break;
      await svc.from(table).delete().in('id', ids);
      total += ids.length;
      if (ids.length < 500) break;
    }
    return total;
  }

  const chats = await purge('tutor_sessions', 'updated_at');
  const voice = await purge('voice_sessions', 'created_at');
  return { chats, voice, ...(truncated ? { truncated: true } : {}) };
}


// ── Group rooms ──────────────────────────────────────────────────────────────

/**
 * Cancel-and-make-whole every held seat in a room the PLATFORM is cancelling.
 * One refund truth shared by min-fill cancellation and admin cancellation —
 * extracted so those two paths cannot diverge. (Tutor pulls make the same
 * promises through their own executor — planPull in sessionStates decides,
 * tutorSafety carries it out — because a pull spans 1:1 sessions too.)
 *   - Stripe-paid seats are refunded unconditionally (we cancelled, not them).
 *   - Membership-included seats get their visit back (negative ledger row,
 *     credited to the BOOKER whose allowance was decremented).
 *   - Free seats simply cancel.
 * A failed Stripe refund still cancels the seat and is REPORTED in the return
 * value so the caller can surface it for manual settlement — money must never
 * be silently dropped.
 *
 * Bounded parallelism, but deliberately NO deadline: by the time this runs the
 * room is already cancelled, and nothing re-scans a cancelled room for
 * unrefunded seats. Deferring a refund here would not defer it, it would drop
 * it. Speed is the only lever, which is why the cron runs the min-fill job
 * first, with the whole budget still in front of it.
 */
export async function refundHeldSeats(svc, stripe, roomId, { reason = 'platform_cancelled' } = {}) {
  // The room's kind decides which allowance a released included seat gets back.
  const { data: roomRow } = await svc.from('group_session').select('kind').eq('id', roomId).maybeSingle();
  const roomKind = roomRow?.kind || null;
  const { data: seats } = await svc.from('group_seat')
    .select('id,student_id,booked_by,booked_via,paid,stripe_payment_intent_id,refund_status')
    .eq('group_session_id', roomId)
    .in('status', ['pending_payment', 'booked']);

  const failures = [];
  await forEachBounded(seats, async (seat) => {
    let refunded = false;
    if (stripe && seat.paid && seat.stripe_payment_intent_id && seat.refund_status === 'none') {
      try {
        await stripe.refunds.create({ payment_intent: seat.stripe_payment_intent_id });
        refunded = true;
      } catch (e) {
        console.error('[group] refund failed', seat.id, e?.message);
        failures.push({ seatId: seat.id, error: e?.message });
      }
    }
    if (seat.booked_via === 'included') {
      // Restore the allowance this ROOM KIND was metered on, not a hardcoded
      // one. A standing-seat room spends club_seat_included; crediting
      // club_hall_included back for it returned a visit to an allowance the
      // seat plan carries zero of, which meant the session was simply burned.
      const feature = STANDING_FEATURE[roomKind] || 'club_hall_included';
      await restoreAllowance(svc, {
        userId: seat.booked_by || seat.student_id,
        feature,
        metadata: { kind: reason, seatId: seat.id, roomId },
      }).catch((e) => {
        console.error('[group] allowance restore failed', seat.id, e?.message);
        failures.push({ seatId: seat.id, error: `allowance: ${e?.message}` });
      });
    }
    await svc.from('group_seat').update({
      status: 'cancelled',
      ...(refunded ? { refund_status: 'refunded' } : {}),
    }).eq('id', seat.id);
  });
  return { seats: (seats || []).length, failures };
}

/**
 * Confirm rooms that made their minimum fill; cancel and refund the ones that
 * did not. Runs from the hourly cron so nobody discovers an empty room at the
 * scheduled time. Hall/community rooms are structurally exempt (cutoff_at is
 * NULL, and the RPC only sweeps rooms where it is set).
 *
 * FIRST job of the tick, and takes no deadline: the RPC has already flipped
 * those rooms to cancelled when the refunds below run, and no other sweep looks
 * for a cancelled room with money still held in it. A refund this job does not
 * make is a refund nobody makes.
 */
export async function resolveGroupFill(svc) {
  const stripe = getStripe();
  let confirmed = 0;
  let cancelled = 0;
  const failures = [];

  const { data: actions, error } = await svc.rpc('resolve_group_fill');
  if (error) return { confirmed, cancelled, error: error.message };

  for (const a of actions || []) {
    if (a.action === 'confirmed') { confirmed += 1; continue; }
    cancelled += 1;
    const r = await refundHeldSeats(svc, stripe, a.session_id, { reason: 'below_minimum_fill' });
    failures.push(...r.failures);
  }
  return { confirmed, cancelled, ...(failures.length ? { refundFailures: failures } : {}) };
}

/**
 * Release group-seat holds whose checkout was never completed — the seat
 * counterpart of releaseAbandoned. Before cancelling, verify with Stripe that
 * the hold wasn't actually PAID (slow webhook), exactly like the 1:1 sweep.
 * Without this, stale holds only die when min-fill runs — and hall/community
 * rooms never min-fill at all.
 */
/** @param {any} svc @param {SweepOpts} [opts] */
export async function releaseAbandonedSeats(svc, { deadline } = {}) {
  const cutoff = new Date(Date.now() - ABANDON_MS).toISOString();
  const { data: stale } = await svc.from('group_seat')
    .select('*')
    .eq('status', 'pending_payment').lt('created_at', cutoff)
    .limit(200);
  const stripe = getStripe();
  let released = 0;
  // Same two-Stripe-calls-per-row shape as the 1:1 sweep, bounded the same way.
  const { deferred } = await forEachBounded(stale, async (seat) => {
    if (stripe && seat.stripe_checkout_session_id) {
      try {
        const cs = await stripe.checkout.sessions.retrieve(seat.stripe_checkout_session_id);
        if (cs?.payment_status === 'paid') {
          await fulfillGroupSeatCheckout(svc, stripe, seat, cs); // → paid + booked
          return;
        }
      } catch { /* couldn't verify — fall through to release, then expire the link */ }
    }
    await svc.from('group_seat').update({ status: 'cancelled' }).eq('id', seat.id);
    released += 1;
    if (stripe && seat.stripe_checkout_session_id) {
      try { await stripe.checkout.sessions.expire(seat.stripe_checkout_session_id); } catch { /* noop */ }
    }
    // The hold's death frees a seat — tell the front of the waitlist (0029).
    await notifySeatOpened(svc, seat.group_session_id);
  }, { deadline });
  return { released, deferred };
}

/**
 * Confirm-or-release (0029): INCLUDED seats that were reminded, never
 * confirmed, and start within ~4 hours are released — the visit goes back on
 * the allowance, the seat goes to the waitlist. The policy lives in
 * occupancy.shouldReleaseSeat (paid and free seats are structurally exempt
 * there); this sweep is just the plumbing. Rooms-first query shape mirrors
 * sendDueGroupReminders so the sweep stays bounded.
 */
/** @param {any} svc @param {SweepOpts} [opts] */
export async function releaseUnconfirmedSeats(svc, { deadline } = {}) {
  const now = Date.now();
  const soonIso = new Date(now + RELEASE_LEAD_MS).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data: rooms } = await svc.from('group_session')
    .select('id,subject,topic,kind,capacity,scheduled_start,scheduled_end,status,timezone,venue')
    .in('status', ['open', 'confirmed'])
    .gt('scheduled_start', nowIso).lt('scheduled_start', soonIso)
    .limit(100);
  if (!rooms?.length) return { released: 0, deferred: 0 };
  const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));

  const { data: seats } = await svc.from('group_seat')
    .select('id,student_id,booked_by,booked_via,status,confirmed_at,reminder_sent_at,group_session_id')
    .in('group_session_id', rooms.map((r) => r.id))
    .eq('status', 'booked')
    .eq('booked_via', 'included')
    .is('confirmed_at', null);

  const candidates = seats || [];
  let released = 0;
  let deferred = 0;
  for (let i = 0; i < candidates.length; i++) {
    // The release window is ~4 hours wide and this runs hourly, so a seat left
    // for the next tick is still released well before its room starts.
    if (deadline?.expired()) { deferred = candidates.length - i; break; }
    const seat = candidates[i];
    const room = roomById[seat.group_session_id];
    if (!shouldReleaseSeat({ seat, room, now })) continue;

    // Atomic claim: only the sweep that flips booked→cancelled does the
    // restore, so a concurrent run (or a racing confirm) can't double-credit.
    const { data: moved } = await svc.from('group_seat')
      .update({ status: 'cancelled' })
      .eq('id', seat.id).eq('status', 'booked').is('confirmed_at', null)
      .select('id').maybeSingle();
    if (!moved) continue;
    released += 1;

    await restoreAllowance(svc, {
      userId: seat.booked_by || seat.student_id,
      // Same rule as the refund path. shouldReleaseSeat now refuses
      // standing_seat rooms outright, so this branch should never see one —
      // the mapping is here so that if that ever changes, the credit lands on
      // the allowance the booking actually spent.
      feature: STANDING_FEATURE[room.kind] || 'club_hall_included',
      metadata: { kind: 'unconfirmed_release', seatId: seat.id, roomId: room.id },
    }).catch((e) => console.error('[release] allowance restore failed', seat.id, e?.message));

    sendSeatReleasedEmail(svc, { seat, room }).catch(() => {});
    await notifySeatOpened(svc, room.id);
  }
  return { released, deferred };
}

/**
 * Hall/community rooms with ZERO settled seats an hour before start are
 * cancelled so a tutor is never paid to sit in an empty room. Clinics are
 * excluded — min-fill owns their go/no-go decision.
 */
/** @param {any} svc @param {SweepOpts} [opts] */
export async function cancelEmptyFreeRooms(svc, { deadline } = {}) {
  const inOneHour = new Date(Date.now() + 3600 * 1000).toISOString();
  const now = new Date().toISOString();
  const { data: rooms } = await svc.from('group_session')
    .select('id')
    .in('kind', ['homework_hall', 'community_free'])
    .eq('status', 'open')
    .gt('scheduled_start', now)
    .lt('scheduled_start', inOneHour)
    .limit(100);

  const candidates = rooms || [];
  let cancelledCount = 0;
  let deferred = 0;
  for (let i = 0; i < candidates.length; i++) {
    if (deadline?.expired()) { deferred = candidates.length - i; break; }
    const room = candidates[i];
    const { count } = await svc.from('group_seat')
      .select('id', { count: 'exact', head: true })
      .eq('group_session_id', room.id)
      .in('status', ['pending_payment', 'booked', 'attended']);
    if ((count || 0) > 0) continue;
    const { data: moved } = await svc.from('group_session')
      .update({ status: 'cancelled', cancel_reason: 'no_signups' })
      .eq('id', room.id).eq('status', 'open')
      .select('id').maybeSingle();
    if (moved) cancelledCount += 1;
  }
  return { cancelled: cancelledCount, deferred };
}

/**
 * T-24h reminders for settled group seats (the 1:1 sweep doesn't cover them;
 * group_seat.reminder_sent_at existed unused since 0017). The conditional
 * update claims each reminder atomically so it sends exactly once.
 */
export async function sendDueGroupReminders(svc) {
  const nowIso = new Date().toISOString();
  const in24hIso = new Date(Date.now() + REMINDER_WINDOW_MS).toISOString();

  // Rooms starting inside the window…
  const { data: rooms } = await svc.from('group_session')
    .select('id,subject,topic,kind,tutor_id,scheduled_start,scheduled_end,timezone,venue')
    .in('status', ['open', 'confirmed'])
    .gt('scheduled_start', nowIso).lt('scheduled_start', in24hIso)
    .limit(100);
  if (!rooms?.length) return 0;
  const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));

  // …their unsent, settled seats, claimed atomically.
  const { data: due } = await svc.from('group_seat')
    .update({ reminder_sent_at: nowIso })
    .in('group_session_id', rooms.map((r) => r.id))
    .eq('status', 'booked')
    .is('reminder_sent_at', null)
    .select('id,student_id,booked_by,booked_via,confirmed_at,group_session_id');

  // The group reminder is the confirm-or-release ask for unconfirmed included
  // seats (0029), and carries the .ics either way.
  await Promise.allSettled((due || []).map((seat) => {
    const r = roomById[seat.group_session_id];
    return sendGroupReminderEmail(svc, { seat, room: r });
  }));
  return (due || []).length;
}

/**
 * What a finished room owes its tutor, and whether the tutor left a record of
 * having been in it. One rule, three readers: the sweep below, the tutor
 * workspace (so a held room can say why it is still on screen), and the admin
 * accrual path — they must never disagree about what a room is worth.
 *
 * @param {any} room  a group_session row
 * @param {any[]} seatRows  that room's group_seat rows (status, paid, exit)
 */
export function groupRoomPayout(room, seatRows) {
  const seats = seatRows || [];

  // Seats that SETTLED: paid covers Stripe checkouts AND $0 free/included
  // seats, which book directly as paid=true ("settled, nothing owed").
  const paidSeats = seats.filter((s) => s.paid && ['booked', 'attended'].includes(s.status)).length;

  // Club rooms (pay_model = flat_hourly) pay the snapshotted hourly amount
  // whenever the room ran with at least one settled seat — a $0 community
  // hour is still a worked hour. Legacy rooms keep the revenue share their
  // row recorded, so historical payouts stay reconstructible.
  let tutorCut;
  if (room?.pay_model === 'flat_hourly') {
    tutorCut = paidSeats > 0 ? (room.tutor_pay_cents || 0) : 0;
  } else {
    tutorCut = groupEarnings(room?.seat_price_cents, paidSeats, Number(room?.tutor_share)).tutorCut;
  }

  // Attendance or an exit summary on any seat — both roster-only, both
  // tutor-or-admin-only. See the note on completeGroupSessions.
  const tutorWasThere = seats.some((s) => s.status === 'attended' || s.status === 'no_show' || s.exit);
  return { paidSeats, tutorCut, tutorWasThere };
}

/** When a room that ended with no roster stops waiting and closes unpaid. */
export function holdExpiresAt(room) {
  const end = new Date(room?.scheduled_end || 0).getTime();
  return Number.isFinite(end) && end > 0 ? new Date(end + UNVERIFIED_ROOM_MS).toISOString() : null;
}

/**
 * Accrue tutor earnings for group rooms that have ended.
 *
 * What a room pays is groupRoomPayout()'s call, not this sweep's: club rooms
 * (pay_model = flat_hourly) pay the snapshotted hourly amount when the room
 * ran; legacy rooms pay a revenue share of their PAID seats, so a half-filled
 * legacy room pays half as much. Idempotent — a room already in tutor_earnings
 * is skipped.
 *
 * WHAT COUNTS AS "THE ROOM RAN" — and why it is not the room status.
 *
 * `in_progress` was the old test, and it does not mean what it looks like.
 * /api/tutoring/group/room flips a room to in_progress on the FIRST join by
 * anyone holding a settled seat, which is usually a student: the room opening
 * is evidence a STUDENT showed up, and none at all that the tutor did. A tutor
 * who no-showed a room three students sat in still had it flipped for them, and
 * this sweep then auto-completed it and paid the flat hourly rate for an hour
 * nobody taught (audit 2026-08-18, "a tutor no-show still auto-completes and
 * pays out").
 *
 * The strongest tutor-presence signal the room and roster paths actually record
 * is on the SEATS, not the room. /api/tutoring/group/roster is the only writer
 * of `group_seat.status = attended|no_show` and of `group_seat.exit` (the exit
 * summary, stamped `by: 'tutor'`), and it accepts both only from a tutor of
 * that room — lead or 0029 co-tutor — or an admin. Nothing a student can send
 * produces either one: their own PATCH branch writes `help_status` and nothing
 * else. So one closed seat is a tutor working the room, recorded by the tutor.
 * (`daily_room_url` is not usable here for the same reason `in_progress` is
 * not: a student's join writes it.)
 *
 * A room with money at stake and no such evidence is NOT completed. It is left
 * where it is and reported as `awaitingTutor` in the cron log every hour until
 * someone acts. TWO humans can, and both paths are real — the ship check found
 * this comment claiming paths that did not exist, while a tutor who taught a
 * Hall and forgot the roster was silently never paid:
 *
 *   1. THE TUTOR. /api/tutoring/group?tutorView=1 keeps a held room in "Your
 *      classes" for the whole hold (its normal window is only 24h, which used
 *      to hide the room on day two of a seven-day hold) and flags it
 *      `needsRoster` with its `holdExpiresAt`. group/roster PATCH has no time
 *      ceiling on attendance, so closing it there is still worth the money: the
 *      room is untouched, and the next tick sees the evidence and accrues.
 *   2. AN ADMIN. /api/admin/earnings lists every unpaid room that ran —
 *      held and already-closed alike — and POST accrues one by hand at exactly
 *      the amount computed here (or records "nothing owed" for a genuine tutor
 *      no-show, so the queue can be worked to empty). Admin → Tutor payouts.
 *
 * After UNVERIFIED_ROOM_MS the room is closed unpaid, which bounds the backlog.
 * Closing it does NOT end the tutor's claim: the room stays in the admin queue
 * until it is settled one way or the other, because the sweep's evidence test
 * is deliberately conservative and a hand accrual is how a real hour gets paid.
 *
 * Rooms with nothing to pay (no settled seats, or a legacy share that computes
 * to zero) complete exactly as before: there is no payout to protect, and
 * leaving them open would only grow the queue.
 *
 * QUERY SHAPE, AND THE ORDER THE BUDGET IS SPENT IN. Held rooms stay
 * selectable every tick, so a single window ordered oldest-first would fill
 * with them and starve the newer rooms behind it — once the hold held a
 * window's worth, tutors who DID close their rosters stopped being paid too.
 * So the tick reads two bounded batches: rooms still inside the hold NEWEST
 * first (a room that just ended is the one most likely to have evidence, and is
 * never queued behind a week of holds), and a smaller batch of rooms PAST the
 * hold, oldest first, which are the only ones this sweep must resolve.
 *
 * Reserving ROWS for the second batch is not enough on its own, because rows
 * are not what runs out. This job is fifth in the tick, behind two
 * Stripe-latency-bound sweeps sharing the same budget, so it routinely starts
 * with a fraction of that budget left — and a single loop that walked the
 * in-hold batch first spent the whole remainder inside it. The past-hold rooms
 * were the tail and never came up: held rooms stayed `confirmed` for ever, the
 * in-hold batch stayed pinned at its cap, and the mechanism that bounds the
 * backlog never ran. That is the same starvation the split was written to
 * remove, moved out of the query and into the loop.
 *
 * So the past-hold batch is ITERATED first. The two are not symmetric:
 *   - Past-hold rooms RESOLVE. Every one the loop reaches leaves the window on
 *     that tick — completed here (paid, closed unpaid, or nothing owed), or
 *     already moved by a concurrent writer, in which case the conditional
 *     update simply finds nothing. Going first therefore cannot make them a
 *     standing front-of-queue: the batch drains itself, and it is capped at 50
 *     rows a tick besides.
 *   - In-hold rooms mostly do NOT resolve — an unverified room is looked at and
 *     deliberately left exactly where it was, so it is selectable again next
 *     hour in the same position.
 * Deferring either batch is safe in the same sense: nothing here is skipped,
 * only postponed to the next tick. But only one of them can be postponed
 * indefinitely without consequence, and it is the one that now goes second.
 */
/** @param {any} svc @param {SweepOpts} [opts] */
export async function completeGroupSessions(svc, { deadline } = {}) {
  const now = Date.now();
  const cutoff = new Date(now - COMPLETE_GRACE_MS).toISOString();
  const holdFloor = new Date(now - UNVERIFIED_ROOM_MS).toISOString();
  const fields = 'id,tutor_id,seat_price_cents,tutor_share,status,pay_model,tutor_pay_cents,scheduled_end';

  // Inside the hold, newest first: whatever else is stuck, the rooms that just
  // ended always get looked at. Past the hold, oldest first and a smaller
  // window: those are the rooms that must close, so they are read alongside but
  // iterated ahead of the in-hold batch (see the ordering note above).
  const [{ data: inHold }, { data: pastHold }] = await Promise.all([
    svc.from('group_session').select(fields)
      .in('status', ['confirmed', 'in_progress'])
      .lt('scheduled_end', cutoff).gte('scheduled_end', holdFloor)
      .order('scheduled_end', { ascending: false })
      .limit(150),
    svc.from('group_session').select(fields)
      .in('status', ['confirmed', 'in_progress'])
      .lt('scheduled_end', holdFloor)
      .order('scheduled_end', { ascending: true })
      .limit(50),
  ]);

  // Must-close first. Whatever slice of the tick this job gets, it is spent on
  // the rooms whose hold has run out before the ones that are only waiting.
  const rows = [...(pastHold || []), ...(inHold || [])];
  let completed = 0;
  let awaitingTutor = 0;
  let closedUnpaid = 0;
  let deferred = 0;
  for (let i = 0; i < rows.length; i++) {
    // Untouched rooms keep their confirmed/in_progress status, so the next tick
    // selects the same set — accrual is deferred, never skipped. What the tail
    // holds is in-hold rooms, which lose an hour by waiting; the rooms with a
    // deadline were at the head.
    if (deadline?.expired()) { deferred = rows.length - i; break; }
    const room = rows[i];

    // One read answers both questions: what settled (the payout basis) and
    // whether a tutor closed anything (the evidence). Rooms hold at most a
    // couple of dozen seats, so this is cheaper than the two counts it replaces.
    const { data: seats } = await svc.from('group_seat')
      .select('status,paid,exit')
      .eq('group_session_id', room.id);

    const { tutorCut, tutorWasThere } = groupRoomPayout(room, seats || []);
    const overdue = Date.now() - new Date(room.scheduled_end).getTime() > UNVERIFIED_ROOM_MS;

    if (tutorCut > 0 && !tutorWasThere && !overdue) {
      awaitingTutor += 1;
      continue;
    }

    const { data: moved } = await svc.from('group_session')
      .update({ status: 'completed' })
      .eq('id', room.id).in('status', ['confirmed', 'in_progress'])
      .select('id').maybeSingle();
    if (!moved) continue;
    completed += 1;

    if (tutorCut > 0 && !tutorWasThere) {
      // Overdue with no roster ever closed. Close the room so it stops being
      // re-read every hour, and pay nothing: an unverified hour is exactly the
      // thing this sweep must not pay for. Loud, because a tutor who really
      // worked it is owed a manual accrual — the room stays in
      // unpaidGroupRooms() (Admin → Tutor payouts) until a human settles it.
      closedUnpaid += 1;
      console.warn('[maintenance] group room closed with no tutor attendance record — not paid', room.id, {
        tutor_id: room.tutor_id, scheduled_end: room.scheduled_end, would_have_paid_cents: tutorCut,
      });
      continue;
    }
    if (tutorCut <= 0) continue;

    const existing = await svc.from('tutor_earnings')
      .select('id').eq('group_session_id', room.id).maybeSingle();
    if (existing.data) continue;

    const { error: eErr } = await svc.from('tutor_earnings').insert({
      tutor_id: room.tutor_id,
      group_session_id: room.id,
      amount_cents: tutorCut,
    });
    // 0017's unique index on tutor_earnings(group_session_id) is the real
    // guard; the read above only saves a round trip. A collision means someone
    // accrued this room first, which is the outcome we wanted — not a failure.
    if (eErr && !isUniqueViolation(eErr)) {
      console.error('[maintenance] group earnings accrual failed', room.id, eErr.message);
    }
  }
  return { completed, awaitingTutor, closedUnpaid, deferred };
}

// ── The human fallbacks behind the hold ──────────────────────────────────────
// completeGroupSessions refuses to pay a room with no tutor-side record, and
// closes it unpaid once the hold runs out. That is only defensible if a person
// can see the room and settle it, so these three functions are the promise the
// sweep's comment makes: LIST what ran and was never paid, ACCRUE one by hand,
// or record that nothing is owed. All three are admin-only at the route; none
// of them takes an amount from the caller — the money comes from the same
// groupRoomPayout() the sweep uses, so a hand accrual can never pay a different
// number than the automatic one would have.

const UNPAID_LOOKBACK_MS = 90 * 24 * 3600 * 1000;
const UNPAID_SCAN_LIMIT = 300;   // rooms examined per call, newest end first
// Rooms per seat read. Seats are read for candidates in CHUNKS so a long queue
// cannot put thousands of rows through one request, where PostgREST's row
// ceiling (1000 by default) would silently truncate them and make an unpaid
// room look like it owed nothing. Every seat row of a room is read, cancelled
// ones included, because that is what completeGroupSessions reads and the two
// must never compute a different payout — so the bound is not capacity (16 at
// the widest) but every seat the room ever held. 20 rooms leaves room for 50
// rows apiece.
const UNPAID_SEAT_CHUNK = 20;

/**
 * Rooms that ran, owe their tutor something, and have no ledger row yet.
 *
 * Covers the whole life of the problem, not just the hold: rooms still waiting
 * for a roster (`awaiting_tutor`), rooms the sweep has not reached yet
 * (`awaiting_sweep`), and rooms it already closed unpaid (`closed_unpaid`) —
 * the last of which is the case that used to be invisible everywhere.
 *
 * WHAT IT RETURNS, AND WHY IT IS NOT A BARE ARRAY. The promise this queue makes
 * — a room stays listed until it is settled — is one this function can only
 * keep inside two limits it used to hide: it looks back `lookbackDays` and no
 * further, and it returns at most `limit` rooms. A bare array made a cut list
 * indistinguishable from an empty one. So:
 *
 *   { rooms, total, truncated, lookbackDays }
 *
 *   rooms         the page, newest end first, at most `limit` of them
 *   total         how many owed rooms this scan found — the real count behind
 *                 the page, computed by evaluating every candidate, not by
 *                 counting the page
 *   truncated     true when `rooms` is NOT the whole queue: either the page was
 *                 cut, or the scan window itself filled, in which case `total`
 *                 is a floor and older unpaid rooms may exist unlooked-at
 *   lookbackDays  the window that was searched, stated rather than assumed
 *
 * @param {any} svc
 * @param {{ lookbackMs?: number, limit?: number }} [opts]
 */
export async function unpaidGroupRooms(svc, { lookbackMs = UNPAID_LOOKBACK_MS, limit = 50 } = {}) {
  const now = Date.now();
  const lookbackDays = Math.round(lookbackMs / (24 * 3600 * 1000));
  const empty = (truncated = false) => ({ rooms: [], total: 0, truncated, lookbackDays });

  const { data: rooms } = await svc.from('group_session')
    .select('id,tutor_id,subject,topic,kind,seat_price_cents,tutor_share,status,pay_model,tutor_pay_cents,scheduled_start,scheduled_end')
    .in('status', ['confirmed', 'in_progress', 'completed'])
    .gte('scheduled_end', new Date(now - lookbackMs).toISOString())
    .lt('scheduled_end', new Date(now - COMPLETE_GRACE_MS).toISOString())
    .order('scheduled_end', { ascending: false })
    .limit(UNPAID_SCAN_LIMIT);
  const scanned = rooms || [];
  // A full scan window means rooms that ended before the oldest row here were
  // never examined at all: everything below is a floor, not the whole truth.
  const scanCapped = scanned.length >= UNPAID_SCAN_LIMIT;
  if (!scanned.length) return empty();

  // Ledger first, seats second, and only for what is left: almost every room in
  // the scan was paid the hour it ended. A zero-cent row is the "nothing owed"
  // marker settleGroupRoomUnowed writes: that room is settled and must not come
  // back onto the queue either.
  const { data: earned } = await svc.from('tutor_earnings')
    .select('group_session_id').in('group_session_id', scanned.map((r) => r.id));
  const settled = new Set((earned || []).map((r) => r.group_session_id));
  const candidates = scanned.filter((r) => !settled.has(r.id));
  if (!candidates.length) return empty(scanCapped);

  // Every candidate is evaluated, not just the first page: a room owes nothing
  // until its seats say so, so a `total` counted before this loop would count
  // rooms that owe nothing as debts. The cost is bounded by the scan, not by
  // the queue — at most 300/20 = 15 reads however long the backlog gets, and
  // one read in the normal case where almost nothing is unpaid.
  const out = [];
  let total = 0;
  for (let i = 0; i < candidates.length; i += UNPAID_SEAT_CHUNK) {
    const chunk = candidates.slice(i, i + UNPAID_SEAT_CHUNK);
    const { data: seats } = await svc.from('group_seat')
      .select('group_session_id,status,paid,exit')
      .in('group_session_id', chunk.map((r) => r.id));
    const seatsByRoom = {};
    for (const s of seats || []) (seatsByRoom[s.group_session_id] ||= []).push(s);

    for (const room of chunk) {
      const { tutorCut, tutorWasThere, paidSeats } = groupRoomPayout(room, seatsByRoom[room.id] || []);
      if (tutorCut <= 0) continue;   // nothing was ever owed for this room
      total += 1;
      if (out.length >= limit) continue;   // counted, just past the page
      const overdue = now - new Date(room.scheduled_end).getTime() > UNVERIFIED_ROOM_MS;
      out.push({
        roomId: room.id,
        tutorId: room.tutor_id,
        tutorName: 'Tutor',            // filled in below, for the page only
        subject: room.subject,
        topic: room.topic,
        kind: room.kind,
        start: room.scheduled_start,
        end: room.scheduled_end,
        status: room.status,
        seats: paidSeats,
        rosterClosed: tutorWasThere,
        wouldPayCents: tutorCut,
        holdExpiresAt: holdExpiresAt(room),
        state: room.status === 'completed' ? 'closed_unpaid'
          : (tutorWasThere || overdue) ? 'awaiting_sweep' : 'awaiting_tutor',
      });
    }
  }

  // Names for the rooms actually returned — the rows past the page are only
  // counted, so nobody pays for their lookup.
  const tutorIds = [...new Set(out.map((r) => r.tutorId).filter(Boolean))];
  const { data: tutors } = tutorIds.length
    ? await svc.from('tutors').select('id,display_name').in('id', tutorIds)
    : { data: [] };
  const nameOf = Object.fromEntries((tutors || []).map((t) => [t.id, t.display_name]));
  for (const row of out) row.tutorName = nameOf[row.tutorId] || 'Tutor';

  return { rooms: out, total, truncated: total > out.length || scanCapped, lookbackDays };
}

/**
 * Accrue one group room's earnings by hand (admin). This is the path the sweep
 * cannot take: it pays a room whose tutor never closed a roster, on a human's
 * word that the hour was really taught.
 *
 * Idempotent by the same 0017 unique index the sweep relies on, and it will
 * never pay twice: an existing row with money in it comes back as
 * `already_accrued`. The one row it does overwrite is a zero-cent "nothing
 * owed" marker — that is how an admin corrects that call rather than being
 * locked out of the room by their own earlier decision.
 *
 * @param {any} svc @param {string} roomId
 */
export async function accrueGroupRoom(svc, roomId) {
  const { data: room } = await svc.from('group_session')
    .select('id,tutor_id,seat_price_cents,tutor_share,status,pay_model,tutor_pay_cents,scheduled_end')
    .eq('id', roomId).maybeSingle();
  if (!room) return { ok: false, code: 'not_found' };
  if (room.status === 'cancelled') return { ok: false, code: 'cancelled' };

  const { data: seats } = await svc.from('group_seat')
    .select('status,paid,exit').eq('group_session_id', room.id);
  const { tutorCut, tutorWasThere } = groupRoomPayout(room, seats || []);
  if (tutorCut <= 0) return { ok: false, code: 'nothing_owed' };

  const { data: existing } = await svc.from('tutor_earnings')
    .select('id,amount_cents,status').eq('group_session_id', room.id).maybeSingle();
  if (existing && existing.amount_cents > 0) {
    return { ok: false, code: 'already_accrued', amountCents: existing.amount_cents, status: existing.status };
  }
  if (existing) {
    // Replacing a "nothing owed" marker. Still gated on the zero amount so a
    // racing accrual can't be overwritten at a stale number.
    const { data: fixed, error } = await svc.from('tutor_earnings')
      .update({ amount_cents: tutorCut, status: 'accrued' })
      .eq('id', existing.id).eq('amount_cents', 0)
      .select('id').maybeSingle();
    if (error) return { ok: false, code: 'error', error: error.message };
    if (!fixed) return { ok: false, code: 'already_accrued' };
  } else {
    const { error } = await svc.from('tutor_earnings')
      .insert({ tutor_id: room.tutor_id, group_session_id: room.id, amount_cents: tutorCut });
    // The unique index is the real guard: a collision means the sweep (or a
    // second admin) accrued it in the same breath, which is the outcome we
    // wanted — one payout per room — so it is not an error to report.
    if (error && !isUniqueViolation(error)) return { ok: false, code: 'error', error: error.message };
    if (error) return { ok: false, code: 'already_accrued' };
  }

  // A room can only be paid once it is closed; closing it also takes it out of
  // the sweep's window for good.
  if (room.status !== 'completed') {
    await svc.from('group_session').update({ status: 'completed' })
      .eq('id', room.id).in('status', ['confirmed', 'in_progress']);
  }
  return { ok: true, code: 'accrued', amountCents: tutorCut, tutorId: room.tutor_id, rosterClosed: tutorWasThere };
}

/**
 * Record that a room owes its tutor nothing — the tutor no-show the hold exists
 * to catch. Written as a zero-cent, already-'paid' ledger row rather than a new
 * column: it is the one place both the sweep and unpaidGroupRooms() already
 * look, it costs no migration, it is idempotent through the same unique index,
 * and it adds nothing to any accrued or paid total (0 is 0 in /api/tutor/
 * earnings, the admin ledger and the CSV alike). Reversible via accrueGroupRoom.
 *
 * @param {any} svc @param {string} roomId
 */
export async function settleGroupRoomUnowed(svc, roomId) {
  const { data: room } = await svc.from('group_session')
    .select('id,tutor_id,status,pay_model,tutor_pay_cents,seat_price_cents,tutor_share')
    .eq('id', roomId).maybeSingle();
  if (!room) return { ok: false, code: 'not_found' };

  // Only an UNVERIFIED room can be written off. If the roster was closed, the
  // tutor is on record as having worked it and the sweep is about to pay them:
  // a stray click here would leave a zero-cent marker that the unique index
  // then holds against the real accrual, quietly cancelling a genuine payout.
  const { data: seatRows } = await svc.from('group_seat')
    .select('status,paid,exit').eq('group_session_id', room.id);
  if (groupRoomPayout(room, seatRows || []).tutorWasThere) {
    return { ok: false, code: 'roster_closed' };
  }

  const { data: existing } = await svc.from('tutor_earnings')
    .select('id,amount_cents').eq('group_session_id', room.id).maybeSingle();
  if (existing) {
    return existing.amount_cents > 0
      ? { ok: false, code: 'already_accrued', amountCents: existing.amount_cents }
      : { ok: true, code: 'nothing_owed' };
  }
  const { error } = await svc.from('tutor_earnings')
    .insert({ tutor_id: room.tutor_id, group_session_id: room.id, amount_cents: 0, status: 'paid' });
  if (error && !isUniqueViolation(error)) return { ok: false, code: 'error', error: error.message };
  if (room.status !== 'completed') {
    await svc.from('group_session').update({ status: 'completed' })
      .eq('id', room.id).in('status', ['confirmed', 'in_progress']);
  }
  return { ok: true, code: 'nothing_owed' };
}
