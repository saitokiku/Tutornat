// POST /api/tutoring/group/room { sessionId } → { roomUrl, token }
// The group counterpart of /api/tutoring/room, modeled on it line for line —
// including its at-join-time re-vetting posture. Verifies the caller holds a
// settled seat in this room (or is its tutor), creates/reuses the Daily room
// sized to capacity, marks the room in_progress, and mints a scoped join token
// (tutor = owner). 501 when Daily isn't configured.

import { getCaller, serviceClient, auditLog, getSettings } from '@/lib/server/context';
import { dailyConfigured, ensureRoom, meetingToken } from '@/lib/server/daily';

export const runtime = 'nodejs';

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!dailyConfigured()) return Response.json({ error: 'Video calls aren’t configured: set DAILY_API_KEY.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  const settings = await getSettings();
  if (settings.tutor_enabled === false) return Response.json({ error: 'Tutoring is temporarily disabled.' }, { status: 503 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const sessionId = String(body?.sessionId || '');
  if (!sessionId) return Response.json({ error: 'Session id required.' }, { status: 400 });

  const { data: room } = await svc.from('group_session').select('*').eq('id', sessionId).maybeSingle();
  if (!room) return Response.json({ error: 'No such session.' }, { status: 404 });
  if (['cancelled', 'completed', 'expired'].includes(room.status)) {
    return Response.json({ error: 'This session is closed.' }, { status: 409 });
  }

  // ── One authoritative read: the ROOM's tutor, not the caller's own row ──────
  // The tutor a guardian consented to must still be a tutor Kaizen stands
  // behind AT JOIN TIME — status can change between booking and the session.
  const { data: owner } = await svc.from('tutors')
    .select('id,user_id,display_name,status,vetting_status')
    .eq('id', room.tutor_id).maybeSingle();

  const isLead = Boolean(owner && owner.user_id === caller.user.id);

  // Co-tutors (0029 group_session_staff) join as staff — personally re-vetted
  // at join time, exactly like the lead below: a body only counts toward the
  // supervision ratio if Kaizen still stands behind it.
  let isTutor = isLead;
  let coName = null;
  let coStaffCount = 0;
  {
    const { count } = await svc.from('group_session_staff')
      .select('tutor_id', { count: 'exact', head: true })
      .eq('group_session_id', sessionId);
    coStaffCount = count || 0;
  }
  if (!isLead) {
    const { data: myTutor } = await svc.from('tutors')
      .select('id,display_name,status,vetting_status').eq('user_id', caller.user.id).maybeSingle();
    if (myTutor && myTutor.status === 'active' && myTutor.vetting_status === 'cleared') {
      const { data: staffRow } = await svc.from('group_session_staff')
        .select('tutor_id').eq('group_session_id', sessionId).eq('tutor_id', myTutor.id).maybeSingle();
      if (staffRow) { isTutor = true; coName = myTutor.display_name; }
    }
  }

  // A student needs a SETTLED seat: booked (paid via Stripe, membership, or
  // free) or already marked attended. A pending_payment hold does not admit —
  // abandoning checkout must not yield a live session.
  let seat = null;
  if (!isTutor) {
    seat = (await svc.from('group_seat')
      .select('id,status,paid')
      .eq('group_session_id', sessionId).eq('student_id', caller.user.id)
      .in('status', ['booked', 'attended'])
      .maybeSingle()).data;
    if (!seat) return Response.json({ error: 'You don’t have a seat in this session.' }, { status: 403 });
    if (!seat.paid) {
      return Response.json({ error: 'This seat isn’t settled yet — complete checkout to join.' }, { status: 402 });
    }
  }

  if (!owner || owner.status !== 'active' || owner.vetting_status !== 'cleared') {
    await auditLog(caller.user.id, 'group.room_blocked_unvetted', sessionId, {
      tutor_id: room.tutor_id,
      status: owner?.status ?? null,
      vetting: owner?.vetting_status ?? null,
    }).catch(() => {});
    return Response.json({
      error: 'This session is on hold while our team completes a review, and will not run as scheduled. '
           + 'You have not been charged for a session that does not run — we will be in touch.',
      code: 'tutor_on_hold',
    }, { status: 403 });
  }

  // Don't open the room more than 15 min before the start.
  if (new Date(room.scheduled_start).getTime() - Date.now() > 15 * 60000) {
    return Response.json({ error: 'The room opens 15 minutes before the session.' }, { status: 425 });
  }

  const roomName = `kaizen-group-${sessionId}`;
  try {
    const daily = await ensureRoom({
      name: roomName,
      endsAt: room.scheduled_end,
      maxParticipants: (room.capacity || 8) + 1 + coStaffCount, // + lead + co-tutors
    });
    const token = await meetingToken({
      roomName,
      userName: isTutor
        ? ((isLead ? owner.display_name : coName) || 'Tutor')
        : (caller.profile?.name || caller.user.email?.split('@')[0] || 'Student'),
      isOwner: isTutor,
    });
    // First join flips the room live and stores the URL for ?mine=1 surfaces.
    if (!room.daily_room_url || ['open', 'confirmed'].includes(room.status)) {
      await svc.from('group_session')
        .update({ daily_room_name: roomName, daily_room_url: daily.url, status: 'in_progress' })
        .eq('id', sessionId);
    }
    return Response.json({ roomUrl: daily.url, token });
  } catch (err) {
    console.error('[group/room]', err?.message);
    return Response.json({ error: 'Could not open the video room. Try again in a moment.' }, { status: 502 });
  }
}
