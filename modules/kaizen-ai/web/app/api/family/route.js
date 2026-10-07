// /api/family — parent↔student linking (drives the Family plan).
// GET             → my links, both directions, enriched with the other party
// POST  {email}   → invite a student by email (caller becomes the parent)
// PATCH {id, action: 'accept'|'decline'|'revoke'}
//   accept/decline: only the invited student. revoke: either party.
// All writes go through the service role: the schema gives students SELECT on
// parent_student_relationships but no UPDATE, so accepting must happen here.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

async function requireUser(req) {
  const caller = await getCaller(req);
  if (!caller) return { error: Response.json({ error: 'Sign in first.' }, { status: 401 }) };
  if (caller.demo) return { error: Response.json({ error: 'Family links need a real account.' }, { status: 501 }) };
  const svc = serviceClient();
  if (!svc) return { error: Response.json({ error: 'Supabase not configured.' }, { status: 501 }) };
  return { caller, svc };
}

export async function GET(req) {
  const { error, caller, svc } = await requireUser(req);
  if (error) return error;
  const me = caller.user.id;

  const { data: rows, error: qErr } = await svc.from('parent_student_relationships')
    .select('*').or(`parent_id.eq.${me},student_id.eq.${me}`)
    .neq('status', 'revoked').order('created_at', { ascending: false });
  if (qErr) {
    console.error('[family] links read failed', qErr.message);
    return Response.json({ error: 'Could not load your family links — try again.' }, { status: 500 });
  }

  const otherIds = [...new Set((rows || []).map((r) => (r.parent_id === me ? r.student_id : r.parent_id)))];
  let byId = {};
  if (otherIds.length) {
    const { data: people } = await svc.from('profiles').select('id,name,email').in('id', otherIds);
    for (const p of people || []) byId[p.id] = p;
  }

  return Response.json({
    links: (rows || []).map((r) => {
      const iAmParent = r.parent_id === me;
      const other = byId[iAmParent ? r.student_id : r.parent_id] || {};
      return {
        id: r.id, status: r.status, createdAt: r.created_at,
        role: iAmParent ? 'parent' : 'student',
        studentId: r.student_id,
        otherName: other.name || null, otherEmail: other.email || null,
      };
    }),
  });
}

export async function POST(req) {
  const { error, caller, svc } = await requireUser(req);
  if (error) return error;
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const email = String(body?.email || '').trim().toLowerCase();
  if (!email) return Response.json({ error: 'Enter the student’s email.' }, { status: 400 });
  if (email === (caller.user.email || '').toLowerCase()) {
    return Response.json({ error: 'That’s your own email.' }, { status: 400 });
  }

  const { data: student } = await svc.from('profiles').select('id,name').ilike('email', email).maybeSingle();
  if (!student) return Response.json({ error: `No Kaizen account for ${email} — have them sign up first.` }, { status: 404 });

  // unique(parent_id, student_id): re-inviting after a revoke resets to pending.
  const { error: upErr } = await svc.from('parent_student_relationships').upsert(
    { parent_id: caller.user.id, student_id: student.id, status: 'pending' },
    { onConflict: 'parent_id,student_id' }
  );
  if (upErr) {
    console.error('[family] invite write failed', upErr.message);
    return Response.json({ error: 'Could not send the invite — try again.' }, { status: 500 });
  }

  await auditLog(caller.user.id, 'family.invite', student.id, { email });
  return Response.json({ ok: true, studentName: student.name || email });
}

export async function PATCH(req) {
  const { error, caller, svc } = await requireUser(req);
  if (error) return error;
  const me = caller.user.id;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body?.id || '');
  const action = String(body?.action || '');
  if (!id || !['accept', 'decline', 'revoke'].includes(action)) {
    return Response.json({ error: 'Need id and action (accept, decline, revoke).' }, { status: 400 });
  }

  const { data: row } = await svc.from('parent_student_relationships').select('*').eq('id', id).maybeSingle();
  if (!row) return Response.json({ error: 'No such invite.' }, { status: 404 });

  if ((action === 'accept' || action === 'decline')) {
    if (row.student_id !== me) return Response.json({ error: 'Only the invited student can respond.' }, { status: 403 });
    if (row.status !== 'pending') return Response.json({ error: 'This invite was already handled.' }, { status: 400 });
  }
  if (action === 'revoke' && row.parent_id !== me && row.student_id !== me) {
    return Response.json({ error: 'Not your link.' }, { status: 403 });
  }

  const status = action === 'accept' ? 'active' : 'revoked';
  const { error: upErr } = await svc.from('parent_student_relationships').update({ status }).eq('id', id);
  if (upErr) {
    console.error('[family] link update failed', id, upErr.message);
    return Response.json({ error: 'Could not update the link — try again.' }, { status: 500 });
  }

  await auditLog(me, `family.${action}`, id, { parent: row.parent_id, student: row.student_id });
  return Response.json({ ok: true, status });
}
