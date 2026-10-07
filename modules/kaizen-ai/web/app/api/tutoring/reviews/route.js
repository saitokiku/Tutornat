// POST /api/tutoring/reviews { sessionId, rating 1-5, comment }
// One review per completed session, written by that session's student.
// Reviews are public reads (they fuel /tutors) — creation is verified here.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Reviews need a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const sessionId = String(body?.sessionId || '');
  const rating = Math.round(Number(body?.rating));
  if (!sessionId || !(rating >= 1 && rating <= 5)) {
    return Response.json({ error: 'Need a session and a 1–5 rating.' }, { status: 400 });
  }

  const { data: session } = await svc.from('tutoring_sessions')
    .select('id,student_id,tutor_id,status').eq('id', sessionId).maybeSingle();
  if (!session) return Response.json({ error: 'No such session.' }, { status: 404 });
  if (session.student_id !== caller.user.id) return Response.json({ error: 'Not your session.' }, { status: 403 });
  if (session.status !== 'completed') return Response.json({ error: 'You can review once the session is completed.' }, { status: 400 });

  const { error } = await svc.from('tutor_reviews').insert({
    tutoring_session_id: sessionId,
    student_id: caller.user.id,
    tutor_id: session.tutor_id,
    rating,
    comment: String(body?.comment || '').slice(0, 1000) || null,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return Response.json({ error: 'You already reviewed this session.' }, { status: 409 });
    }
    console.error('[reviews] insert failed', error.message);
    return Response.json({ error: 'Could not save the review — try again.' }, { status: 500 });
  }

  await auditLog(caller.user.id, 'tutoring.reviewed', sessionId, { rating });
  return Response.json({ ok: true });
}
