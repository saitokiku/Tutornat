// Waitlist plumbing (0029 group_waitlist) — a full room says "join the list"
// instead of vanishing, and a freed seat finds the person who wanted it.
//
// Notification, not reservation: when a seat frees we email the oldest
// waiting accounts (one per open seat) and flip them to 'notified'; the seat
// itself stays on the open market, first come first served. No holds — held
// inventory invisible to the storefront is the failure mode this table
// exists to kill. All writes are service-role (RLS: no policies).

import { pickWaitlistBatch } from '@/lib/server/occupancy';
import { sendWaitlistSeatOpenEmail } from '@/lib/server/tutoringEmails';

const HELD = ['pending_payment', 'booked', 'attended'];

/** Join. Re-joining after leaving (or after a missed notification) rearms the
 * same row back to 'waiting' — unique (session, user) keeps it one per account. */
export async function joinWaitlist(svc, { roomId, userId, studentId = null }) {
  const { data, error } = await svc.from('group_waitlist').upsert(
    {
      group_session_id: roomId, user_id: userId, student_id: studentId,
      status: 'waiting', notified_at: null,
    },
    { onConflict: 'group_session_id,user_id' },
  ).select('id').maybeSingle();
  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function leaveWaitlist(svc, { roomId, userId }) {
  await svc.from('group_waitlist')
    .update({ status: 'cancelled' })
    .eq('group_session_id', roomId).eq('user_id', userId)
    .in('status', ['waiting', 'notified']);
}

/** A waitlisted account booked the room — close the loop for the metrics. */
export async function markWaitlistConverted(svc, { roomId, userId }) {
  await svc.from('group_waitlist')
    .update({ status: 'converted' })
    .eq('group_session_id', roomId).eq('user_id', userId)
    .in('status', ['waiting', 'notified']);
}

/**
 * A seat freed in `roomId` (cancel, abandoned-hold release, confirm-or-release
 * sweep): notify the front of the line. Idempotent and race-tolerant — each
 * row is claimed with a conditional update, so two concurrent calls can't
 * double-email one account. Best-effort by design: callers are cancel paths
 * and cron sweeps that must not fail on a notification hiccup.
 */
export async function notifySeatOpened(svc, roomId) {
  try {
    const { data: room } = await svc.from('group_session')
      .select('id,subject,topic,kind,capacity,scheduled_start,scheduled_end,status,timezone,venue')
      .eq('id', roomId).maybeSingle();
    if (!room) return 0;
    // A standing-seat room is RESERVED inventory. Its places belong to the
    // families who pay for the cohort, and offering one to the waitlist would
    // sell a place that is not for sale — the same rule groupSeatQuote enforces
    // with its 'reserved' mode and the claim route enforces with a 403.
    if (room.kind === 'standing_seat') return 0;
    if (!['open', 'confirmed'].includes(room.status)) return 0;
    if (new Date(room.scheduled_start).getTime() <= Date.now()) return 0;

    const { count: held } = await svc.from('group_seat')
      .select('id', { count: 'exact', head: true })
      .eq('group_session_id', roomId).in('status', HELD);
    const seatsLeft = Math.max(0, room.capacity - (held || 0));
    if (seatsLeft <= 0) return 0;

    const { data: waiting } = await svc.from('group_waitlist')
      .select('id,user_id,created_at')
      .eq('group_session_id', roomId).eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(50);
    const batch = pickWaitlistBatch(waiting || [], seatsLeft);

    let notified = 0;
    for (const row of batch) {
      const { data: claimed } = await svc.from('group_waitlist')
        .update({ status: 'notified', notified_at: new Date().toISOString() })
        .eq('id', row.id).eq('status', 'waiting')
        .select('id').maybeSingle();
      if (!claimed) continue;
      notified += 1;
      sendWaitlistSeatOpenEmail(svc, { userId: row.user_id, room }).catch(() => {});
    }
    return notified;
  } catch (e) {
    console.error('[waitlist] notify failed', roomId, e?.message);
    return 0;
  }
}

/**
 * Housekeeping sweep: waitlist entries for rooms that started or died flip to
 * 'expired' so nobody is emailed about the past. Bounded, hourly-safe.
 */
export async function expireStaleWaitlists(svc) {
  const now = Date.now();
  const { data: rows } = await svc.from('group_waitlist')
    .select('id,group_session(scheduled_start,status)')
    .in('status', ['waiting', 'notified'])
    .limit(500);
  const dead = (rows || [])
    .filter((r) => {
      const room = r.group_session;
      return !room
        || new Date(room.scheduled_start).getTime() <= now
        || ['cancelled', 'completed', 'expired'].includes(room.status);
    })
    .map((r) => r.id);
  if (!dead.length) return 0;
  const { data: expired } = await svc.from('group_waitlist')
    .update({ status: 'expired' })
    .in('id', dead)
    .select('id');
  return (expired || []).length;
}
