// GET /api/family/summary?studentId=… — the parent's read-only window into a
// linked student. The active parent↔student link is verified here server-side
// (grades live in courses/homework_items, which have no parent RLS policy —
// this endpoint is the deliberate seam). The aggregation itself lives in
// lib/server/familySummary.js, shared with the monthly summary email.
//
// WHAT THIS ROUTE ANSWERS, IN THE PARENT'S OWN ORDER
// (docs/superpowers/specs/2026-09-02-wave2-geometry.md). A payer asks three
// questions: when and where does my child's seat meet, what can they now do
// that they could not last month, and how is the rest of it going.
// `summarizeStudent` answers the second (its `mastery` block) and the third.
// It cannot answer the first, because a seat is a room and not a grade — so
// the seat is joined on here, from `mySeat`, which folds the two weekly
// standing rows a family holds back into the one thing they actually bought.
//
// The seat and the month's attendance are ADDITIVE and independently guarded:
// if either read fails the record still returns, because a parent opening this
// page during a bad minute for one table should still see their child's
// concepts rather than an error.
//
// A FAILED READ IS A STATE, AND IT HAS TO BE ONE IN THE DATA. Both helpers
// below check `.error` on every query rather than relying on a throw: the
// supabase-js client RESOLVES `{ data, error }` and does not reject, so a
// helper that only wraps its reads in try/catch reports a failure as an empty
// list — which is how "we could not read this" becomes a confident zero and an
// empty calendar. `monthAttendance` answers null and `nextSeatSession` answers
// `{ unavailable: true }`, and the page renders each as the state it is.

import { getCaller, isAdminCaller, serviceClient } from '@/lib/server/context';
import { summarizeStudent } from '@/lib/server/familySummary';
import { mySeat } from '@/lib/server/cohorts';

export const runtime = 'nodejs';

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Family links need a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  const studentId = String(new URL(req.url).searchParams.get('studentId') || '');
  if (!studentId) return Response.json({ error: 'studentId required.' }, { status: 400 });

  if (!isAdminCaller(caller)) {
    const { data: link } = await svc.from('parent_student_relationships')
      .select('id').eq('parent_id', caller.user.id).eq('student_id', studentId)
      .eq('status', 'active').maybeSingle();
    if (!link) return Response.json({ error: 'No active link to this student.' }, { status: 403 });
  }

  const [summary, seat, attendance] = await Promise.all([
    summarizeStudent(svc, studentId),
    mySeat(svc, studentId),
    monthAttendance(svc, studentId),
  ]);

  return Response.json({
    ...summary,
    // Three answers travel intact. null: this family has no standing seat yet,
    // which is a state, not a failure. { unavailable: true }: the read failed,
    // and the page says so rather than printing "no standing seat yet" to a
    // family that has one. Otherwise the seat, with its next occasion.
    seat: seat?.unavailable
      ? { unavailable: true }
      : (seat ? { ...seat, next: await nextSeatSession(svc, seat) } : null),
    attendance,
  });
}

/**
 * The next occasion of this family's seat, in the ROOM's own zone — the page
 * formats it with lib/roomTime, never in the reader's.
 *
 * It reads the cohort's rooms rather than the child's booked seats on purpose:
 * a standing seat is reserved for the month whether or not the weekly sweep
 * has written this Thursday's `group_seat` row yet, so asking the booking
 * would tell a seat family they have nothing coming up every Monday morning.
 *
 * Three distinguishable answers, because the page says a different sentence to
 * each: an occasion, `null` (nothing on the calendar yet), and
 * `{ unavailable: true }` (we could not look). Collapsing the last two — which
 * is what dropping `error` on the floor does — tells a family with a seat that
 * nothing is scheduled, on the one line they drive by.
 *
 * @returns {Promise<null | {unavailable: true} | {start: string, venue: string|null, timezone: string|null}>}
 */
export async function nextSeatSession(svc, seat, { now = Date.now() } = {}) {
  if (!seat?.seriesIds?.length) return null;
  try {
    const { data, error } = await svc.from('group_session')
      .select('id,scheduled_start,venue,timezone,status')
      .in('series_id', seat.seriesIds)
      .gte('scheduled_start', new Date(now).toISOString())
      // A cancelled or already-finished room is not the next one.
      .in('status', ['open', 'confirmed', 'in_progress'])
      .order('scheduled_start', { ascending: true })
      .limit(1);
    if (error) {
      console.error('[family/summary] next session read failed:', error.message);
      return { unavailable: true };
    }
    const room = (data || [])[0];
    if (!room) return null;
    return {
      start: room.scheduled_start,
      // The instance's own venue and zone win where it has them (a one-off
      // room move is set on the instance — the column 0033 added for exactly
      // this); the cohort answers otherwise. The card renders THIS venue, so a
      // Thursday moved to the annex reaches the person driving there.
      venue: room.venue || seat.venue || null,
      timezone: room.timezone || seat.timezone || null,
    };
  } catch (err) {
    console.error('[family/summary] next session read failed:', err?.message);
    return { unavailable: true };
  }
}

/**
 * How many club rooms this student has had a place in since the 1st.
 *
 * Deliberately ONE number and deliberately not called "attended": the query
 * behind it counts settled seats in rooms that completed, which is what the
 * club delivered, not what the child did in it. Attendance as a fact about the
 * child is the Director's exit rating, and it belongs to the record above, not
 * to a counter.
 *
 * Null means we could not read it — the page then says nothing rather than
 * printing a confident zero at a family that came every week. That answer is
 * only reachable because the `.error` is checked here: this used to call
 * `sessionsInWindow`, which drops `{ error }` and returns zeros, so a failed
 * read rendered as "Sessions this month 0". Reading `group_seat` directly also
 * drops the second query `sessionsInWindow` makes — completed 1:1 sessions,
 * a cut product this route never counted.
 *
 * @returns {Promise<null | {sessionsThisMonth: number, since: string}>}
 */
export async function monthAttendance(svc, studentId, { now = Date.now() } = {}) {
  const from = new Date(now);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);

  try {
    const { data, error } = await svc.from('group_seat')
      .select('status,group_session(kind,scheduled_start,status)')
      .eq('student_id', studentId)
      .in('status', ['booked', 'attended']);
    if (error) {
      console.error('[family/summary] month attendance read failed:', error.message);
      return null;
    }

    let sessionsThisMonth = 0;
    for (const seat of data || []) {
      const room = seat.group_session;
      // Only a room that actually ran counts; a booked place in next
      // Thursday's room is not a session the club has delivered.
      if (!room || room.status !== 'completed') continue;
      const start = new Date(room.scheduled_start);
      // `new Date(null)` is the epoch, not an error — an undated room must not
      // fall inside a window by accident.
      if (!room.scheduled_start || Number.isNaN(start.getTime())) continue;
      if (start < from || start >= to) continue;
      sessionsThisMonth += 1;
    }
    return { sessionsThisMonth, since: from.toISOString() };
  } catch (err) {
    console.error('[family/summary] month attendance read failed:', err?.message);
    return null;
  }
}
