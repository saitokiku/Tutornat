// The Homework Hall operating loop (launch plan v2 §3, migration 0026).
//
// GET   /api/tutoring/group/roster?sessionId=  → tutor-of-room (or admin):
//       every held seat with its intake, live help status, attendance and
//       exit summary — ordered the way the tutor works the room:
//       Red → Yellow → Green, oldest raise first within a color.
// PATCH {seatId, helpStatus}                   → the student in the seat (or
//       the account that booked it) flips green/yellow/red during the session.
// PATCH {seatId, attendance?, exit?}           → tutor-of-room closes the seat:
//       attended/no_show, plus the exit summary {accomplished, remaining,
//       understood, recommendation, note}. The recommendation IS the
//       escalation ladder (rebook | clinic | private) — a next step, not an
//       upsell default.
//
// Everything here is service-role writes behind explicit caller checks (0019
// hygiene): the client never touches group_seat directly.

import { getCaller, serviceClient, auditLog, isAdminCaller } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HELP_STATUSES = ['green', 'yellow', 'red'];
const RECOMMENDATIONS = ['rebook', 'clinic', 'private'];
const HELD = ['booked', 'attended', 'no_show'];
const HELP_ORDER = { red: 0, yellow: 1, green: 2 };

async function roomAndTutor(svc, caller, sessionId) {
  const { data: room } = await svc.from('group_session').select('*').eq('id', sessionId).maybeSingle();
  if (!room) return { error: Response.json({ error: 'No such session.' }, { status: 404 }) };
  const { data: tutor } = await svc.from('tutors').select('id,display_name').eq('user_id', caller.user.id).maybeSingle();
  let isTutor = Boolean(tutor && tutor.id === room.tutor_id);
  // Co-tutors (0029 group_session_staff) work the same roster as the lead —
  // both bodies count toward the ratio, both need the queue in front of them.
  if (!isTutor && tutor) {
    const { data: staffRow } = await svc.from('group_session_staff')
      .select('tutor_id').eq('group_session_id', sessionId).eq('tutor_id', tutor.id).maybeSingle();
    isTutor = Boolean(staffRow);
  }
  return { room, isTutor };
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  const sessionId = new URL(req.url).searchParams.get('sessionId') || '';
  const { room, isTutor, error } = await roomAndTutor(svc, caller, sessionId);
  if (error) return error;
  if (!isTutor && !isAdminCaller(caller)) {
    return Response.json({ error: 'Not your session.' }, { status: 403 });
  }

  const { data: seats } = await svc.from('group_seat')
    .select('id,student_id,status,paid,booked_via,bring,intake,help_status,help_status_at,exit')
    .eq('group_session_id', sessionId)
    .in('status', HELD);

  const ids = [...new Set((seats || []).map((s) => s.student_id))];
  const { data: profiles } = ids.length
    ? await svc.from('profiles').select('id,name,grade_level').in('id', ids)
    : { data: [] };
  const nameOf = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  const roster = (seats || [])
    .map((s) => ({
      seatId: s.id,
      studentId: s.student_id,
      name: nameOf[s.student_id]?.name || 'Student',
      gradeLevel: nameOf[s.student_id]?.grade_level || null,
      status: s.status,
      paid: s.paid,
      bookedVia: s.booked_via,
      intake: s.intake || null,
      bring: s.bring || null,
      helpStatus: s.help_status || 'green',
      helpStatusAt: s.help_status_at,
      exit: s.exit || null,
    }))
    // Work the room Red → Yellow → Green; within a color, longest-waiting first.
    .sort((a, b) =>
      (HELP_ORDER[a.helpStatus] ?? 2) - (HELP_ORDER[b.helpStatus] ?? 2)
      || new Date(a.helpStatusAt || 0).getTime() - new Date(b.helpStatusAt || 0).getTime());

  return Response.json({
    session: {
      id: room.id, subject: room.subject, topic: room.topic, kind: room.kind,
      start: room.scheduled_start, end: room.scheduled_end, status: room.status,
      capacity: room.capacity,
    },
    roster,
  });
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const seatId = String(body?.seatId || '');
  if (!seatId) return Response.json({ error: 'seatId required.' }, { status: 400 });

  const { data: seat } = await svc.from('group_seat')
    .select('id,student_id,status,paid,booked_by,group_session_id,exit')
    .eq('id', seatId).maybeSingle();
  if (!seat) return Response.json({ error: 'No such seat.' }, { status: 404 });

  const { room, isTutor, error } = await roomAndTutor(svc, caller, seat.group_session_id);
  if (error) return error;

  // ── Student/parent: flip the help flag during the session ─────────────────
  if (body?.helpStatus !== undefined) {
    const helpStatus = String(body.helpStatus);
    if (!HELP_STATUSES.includes(helpStatus)) {
      return Response.json({ error: 'helpStatus must be green, yellow, or red.' }, { status: 400 });
    }
    const ownSeat = seat.student_id === caller.user.id || seat.booked_by === caller.user.id;
    if (!ownSeat) return Response.json({ error: 'Not your seat.' }, { status: 403 });
    if (!(seat.status === 'booked' || seat.status === 'attended') || !seat.paid) {
      return Response.json({ error: 'That seat isn’t active.' }, { status: 409 });
    }
    // Only meaningful while the room could plausibly be live: from 15 minutes
    // before start (same window as the join gate) until 30 past the end.
    const now = Date.now();
    if (now < new Date(room.scheduled_start).getTime() - 15 * 60000
      || now > new Date(room.scheduled_end).getTime() + 30 * 60000) {
      return Response.json({ error: 'The help flag only works during the session.' }, { status: 409 });
    }
    const { error: upErr } = await svc.from('group_seat')
      .update({ help_status: helpStatus, help_status_at: new Date().toISOString() })
      .eq('id', seatId);
    if (upErr) {
      console.error('[roster] help flag write failed', seatId, upErr.message);
      return Response.json({ error: 'Could not save the flag — try again.' }, { status: 500 });
    }
    // Just { ok } — HelpFlag updates optimistically and reads nothing else.
    return Response.json({ ok: true });
  }

  // ── Tutor: attendance + exit summary ──────────────────────────────────────
  if (!isTutor && !isAdminCaller(caller)) {
    return Response.json({ error: 'Not your session.' }, { status: 403 });
  }

  const updates = {};
  if (body?.attendance !== undefined) {
    const attendance = String(body.attendance);
    if (!['attended', 'no_show'].includes(attendance)) {
      return Response.json({ error: 'attendance must be attended or no_show.' }, { status: 400 });
    }
    if (!HELD.includes(seat.status)) {
      return Response.json({ error: 'That seat can’t take attendance.' }, { status: 409 });
    }
    updates.status = attendance;
  }
  if (body?.exit !== undefined) {
    const src = body.exit || {};
    const exit = {};
    for (const key of ['accomplished', 'remaining', 'understood', 'note']) {
      const v = String(src[key] || '').trim().slice(0, 500);
      if (v) exit[key] = v;
    }
    if (src.recommendation !== undefined && src.recommendation !== '') {
      const rec = String(src.recommendation);
      if (!RECOMMENDATIONS.includes(rec)) {
        return Response.json({ error: 'recommendation must be rebook, clinic, or private.' }, { status: 400 });
      }
      exit.recommendation = rec;
    }
    updates.exit = { ...(seat.exit || {}), ...exit, by: 'tutor', at: new Date().toISOString() };
  }
  if (!Object.keys(updates).length) {
    return Response.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error: upErr } = await svc.from('group_seat').update(updates).eq('id', seatId);
  if (upErr) {
    console.error('[roster] seat close failed', seatId, upErr.message);
    return Response.json({ error: 'Could not save the roster — try again.' }, { status: 500 });
  }
  await auditLog(caller.user.id, 'group.seat_closed', seatId, {
    sessionId: seat.group_session_id, ...updates,
  });
  return Response.json({ ok: true });
}
