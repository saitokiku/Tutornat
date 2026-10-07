// The Community Hall vote board.
//   GET   ?sessionId=  → { totalStudents, parties: [{id,title,status,voters,asks}] }
//   POST  {sessionId, text} → student ask: fast-tier router compresses it and
//         either votes an existing party or founds a new one
//   PATCH {sessionId, topicId, status} → tutor marks a party covered/reopened
//
// Authorization mirrors /api/tutoring/group/room: a SETTLED seat (booked/
// attended + paid) or a tutor working the room — lead or co-tutor. Pure logic
// lives in lib/server/hallBoard.js (tested); this file is I/O and guardrails.
import { getCaller, serviceClient } from '@/lib/server/context';
import { MODELS } from '@/lib/server/models';
import { meteredCall } from '@/lib/server/aiCall';
import { checkRate, rateKey } from '@/lib/server/ratelimit';
import { validateAsk, routerMessages, parseRouterReply, shapeBoard } from '@/lib/server/hallBoard';

export const runtime = 'nodejs';

// Settled-participant check shared by all three verbs. Returns
// { room, isTutor } or a Response to bounce with.
async function authorize(svc, caller, sessionId) {
  const { data: room } = await svc.from('group_session')
    .select('id,tutor_id,subject,topic,kind,status')
    .eq('id', sessionId).maybeSingle();
  if (!room) return Response.json({ error: 'No such session.' }, { status: 404 });
  if (['cancelled', 'expired'].includes(room.status)) {
    return Response.json({ error: 'This session is closed.' }, { status: 409 });
  }

  // Who is the caller as a tutor? Resolve their tutor row once, then accept
  // either the room lead or a co-tutor: 0029 lets a Hall be staffed by more
  // than one body (the storefront sells "N tutors"), and every co-tutor
  // admitted to the video and the roster needs this board in front of them too.
  const { data: tutor } = await svc.from('tutors')
    .select('id').eq('user_id', caller.user.id).maybeSingle();
  let isTutor = Boolean(tutor && tutor.id === room.tutor_id);
  if (!isTutor && tutor) {
    const { data: staffRow } = await svc.from('group_session_staff')
      .select('tutor_id').eq('group_session_id', sessionId).eq('tutor_id', tutor.id).maybeSingle();
    isTutor = Boolean(staffRow);
  }

  if (!isTutor) {
    const { data: seat } = await svc.from('group_seat')
      .select('id,status,paid')
      .eq('group_session_id', sessionId).eq('student_id', caller.user.id)
      .in('status', ['booked', 'attended'])
      .maybeSingle();
    if (!seat || !seat.paid) {
      return Response.json({ error: 'You don’t have a seat in this session.' }, { status: 403 });
    }
  }
  return { room, isTutor };
}

async function loadBoard(svc, sessionId) {
  const [{ data: topics }, { data: asks }, { count }] = await Promise.all([
    svc.from('hall_topics').select('id,title,status,created_at').eq('group_session_id', sessionId),
    svc.from('hall_asks').select('topic_id,student_id,text,created_at').eq('group_session_id', sessionId),
    svc.from('group_seat').select('id', { count: 'exact', head: true })
      .eq('group_session_id', sessionId).in('status', ['booked', 'attended']),
  ]);
  return shapeBoard(topics || [], asks || [], { totalStudents: count || 0 });
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  const sessionId = new URL(req.url).searchParams.get('sessionId') || '';
  if (!sessionId) return Response.json({ error: 'Session id required.' }, { status: 400 });

  const auth = await authorize(svc, caller, sessionId);
  if (auth instanceof Response) return auth;

  return Response.json(await loadBoard(svc, sessionId));
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  // Burst limit: a room of teens hammering one endpoint is the normal case,
  // not an attack — but one student can't flood the router.
  const rate = await checkRate(rateKey(caller, req, 'hall'), { limit: 10, windowMs: 60_000 });
  if (!rate.ok) return Response.json({ error: 'Give it a few seconds.' }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const sessionId = String(body?.sessionId || '');
  if (!sessionId) return Response.json({ error: 'Session id required.' }, { status: 400 });

  const v = validateAsk(body);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });

  const auth = await authorize(svc, caller, sessionId);
  if (auth instanceof Response) return auth;

  const { data: topics } = await svc.from('hall_topics')
    .select('id,title').eq('group_session_id', sessionId).eq('status', 'open');

  // Route the ask. The board must never lose a student's question to an AI
  // hiccup: on any router failure the raw text founds its own party.
  let routed = null;
  try {
    const result = await meteredCall({
      caller,
      model: MODELS.fast,
      tier: 'fast',
      feature: 'hall_ask',
      maxTokens: 160,
      messages: routerMessages({ topics: topics || [], subject: auth.room.subject, text: v.text }),
      meta: { sessionId },
    });
    if (result?.text) routed = parseRouterReply(result.text, (topics || []).map((t) => t.id));
  } catch { /* fall through to the raw-text party */ }
  if (!routed) routed = { topicId: null, newTitle: v.text.slice(0, 60), ask: v.text };

  let topicId = routed.topicId;
  if (!topicId) {
    const { data: created, error: topicErr } = await svc.from('hall_topics')
      .insert({ group_session_id: sessionId, title: routed.newTitle })
      .select('id').single();
    if (topicErr) return Response.json({ error: 'Could not save that. Try again.' }, { status: 500 });
    topicId = created.id;
  }

  const { error: askErr } = await svc.from('hall_asks').insert({
    group_session_id: sessionId,
    topic_id: topicId,
    student_id: caller.user.id,
    text: routed.ask,
  });
  if (askErr) return Response.json({ error: 'Could not save that. Try again.' }, { status: 500 });

  return Response.json(await loadBoard(svc, sessionId));
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const sessionId = String(body?.sessionId || '');
  const topicId = String(body?.topicId || '');
  const status = String(body?.status || '');
  if (!sessionId || !topicId || !['open', 'covered'].includes(status)) {
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }

  const auth = await authorize(svc, caller, sessionId);
  if (auth instanceof Response) return auth;
  // Lead or co-tutor: whoever is working the room can retire a party.
  if (!auth.isTutor) return Response.json({ error: 'Only a tutor working this room can do that.' }, { status: 403 });

  await svc.from('hall_topics').update({ status })
    .eq('id', topicId).eq('group_session_id', sessionId);

  return Response.json(await loadBoard(svc, sessionId));
}
