// POST /api/tutoring/room { sessionId } → { roomUrl, token }
// Verifies the caller is this session's student or tutor, creates (or reuses)
// the Daily room, marks the session in_progress, and mints a scoped join token
// (tutor = owner). 501 when Daily isn't configured.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { getSettings } from '@/lib/server/context';
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

  const { data: session } = await svc.from('tutoring_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (!session) return Response.json({ error: 'No such session.' }, { status: 404 });
  if (['cancelled', 'completed', 'no_show'].includes(session.status)) {
    return Response.json({ error: 'This session is closed.' }, { status: 409 });
  }
  // Must be paid (or the free intro) before a room can open — otherwise a
  // student could abandon checkout and still get a live session (audit: the
  // pending_payment state slipped through the room gate).
  if (session.status === 'pending_payment' || (!session.paid && !session.intro_free)) {
    return Response.json({ error: 'This session isn’t paid yet — complete checkout to open the room.' }, { status: 402 });
  }

  // ── One authoritative read: the SESSION's tutor, not the caller's own row ────
  // The tutor a guardian consented to must still be a tutor Kaizen stands behind
  // AT JOIN TIME. status/vetting_status can change between booking and the
  // session — a vetting rejection, a Stripe identity failure, an abuse report.
  // Booking-time gates protect new bookings; this protects the ones already on
  // the calendar, which is precisely the case that matters most.
  //
  // Reading the session's tutor rather than the caller's makes the gate
  // unavoidable and identical whichever side asks for a token: if the tutor is
  // no longer bookable, neither party gets a room. `isTutor` is derived from the
  // same row, so there is no second lookup to disagree with it.
  const { data: owner } = await svc.from('tutors')
    .select('id,user_id,display_name,status,vetting_status')
    .eq('id', session.tutor_id).maybeSingle();

  const isTutor = Boolean(owner && owner.user_id === caller.user.id);
  const isStudent = session.student_id === caller.user.id;
  if (!isTutor && !isStudent) return Response.json({ error: 'Not your session.' }, { status: 403 });

  if (!owner || owner.status !== 'active' || owner.vetting_status !== 'cleared') {
    await auditLog(caller.user.id, 'tutoring.room_blocked_unvetted', sessionId, {
      tutor_id: session.tutor_id,
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
  if (new Date(session.scheduled_start).getTime() - Date.now() > 15 * 60000) {
    return Response.json({ error: 'The room opens 15 minutes before your session.' }, { status: 425 });
  }

  const roomName = `kaizen-${sessionId}`;
  try {
    const room = await ensureRoom({ name: roomName, endsAt: session.scheduled_end });
    const token = await meetingToken({
      roomName,
      userName: isTutor ? (owner.display_name || 'Tutor') : (caller.user.email?.split('@')[0] || 'Student'),
      isOwner: isTutor,
    });
    if (!session.daily_room_url || session.status === 'scheduled') {
      await svc.from('tutoring_sessions')
        .update({ daily_room_name: roomName, daily_room_url: room.url, status: 'in_progress' })
        .eq('id', sessionId);
    }
    return Response.json({ roomUrl: room.url, token });
  } catch (err) {
    console.error('[tutoring/room]', err?.message);
    return Response.json({ error: 'Could not open the video room. Try again in a moment.' }, { status: 502 });
  }
}
