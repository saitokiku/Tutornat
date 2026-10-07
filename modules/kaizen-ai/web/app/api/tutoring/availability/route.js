// /api/tutoring/availability — a tutor's own bookable slots, plus a student's
// read of a given tutor's open slots.
// GET  (as tutor)            → my slots
// GET  ?tutorId=… (student)  → that tutor's OPEN future slots
// POST {start_at, end_at}    → add a slot (tutor)
// DELETE {id}                → remove an OPEN slot (tutor)

import { getCaller, serviceClient } from '@/lib/server/context';

export const runtime = 'nodejs';

async function myTutor(svc, userId) {
  const { data } = await svc.from('tutors').select('*').eq('user_id', userId).maybeSingle();
  return data;
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ slots: [] });

  const tutorId = new URL(req.url).searchParams.get('tutorId');
  if (tutorId) {
    const { data } = await svc.from('tutor_availability')
      .select('id,start_at,end_at')
      .eq('tutor_id', tutorId).eq('status', 'open')
      .gt('start_at', new Date().toISOString())
      .order('start_at', { ascending: true });
    return Response.json({ slots: data || [] });
  }

  const tutor = await myTutor(svc, caller.user.id);
  if (!tutor) return Response.json({ slots: [], tutor: null });
  const { data } = await svc.from('tutor_availability')
    .select('*').eq('tutor_id', tutor.id).order('start_at', { ascending: true });
  return Response.json({ slots: data || [], tutor });
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  const tutor = await myTutor(svc, caller.user.id);
  if (!tutor) return Response.json({ error: 'Become a tutor first.' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const start = new Date(body?.start_at), end = new Date(body?.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return Response.json({ error: 'Give a valid start and end time.' }, { status: 400 });
  }
  if (start < new Date()) return Response.json({ error: 'Slot must be in the future.' }, { status: 400 });

  const { data, error } = await svc.from('tutor_availability')
    .insert({ tutor_id: tutor.id, start_at: start.toISOString(), end_at: end.toISOString() })
    .select().maybeSingle();
  if (error) {
    console.error('[availability] slot insert failed', error.message);
    return Response.json({ error: 'Could not add the slot — try again.' }, { status: 500 });
  }
  return Response.json({ ok: true, slot: data });
}

export async function DELETE(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  const tutor = await myTutor(svc, caller.user.id);
  if (!tutor) return Response.json({ error: 'Not a tutor.' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body?.id || '');
  const { error } = await svc.from('tutor_availability')
    .delete().eq('id', id).eq('tutor_id', tutor.id).eq('status', 'open');
  if (error) {
    console.error('[availability] slot delete failed', id, error.message);
    return Response.json({ error: 'Could not remove the slot — try again.' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
