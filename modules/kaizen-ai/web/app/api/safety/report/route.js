// POST /api/safety/report — anyone signed in can report a safety concern
// (tutor conduct, disturbing content, anything). Writes a safety_events row
// for the admin triage queue and alerts the admin by email immediately.
// PATCH (admin) — triage: {id, status: open|reviewing|resolved}.

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { sendEmail } from '@/lib/server/email';

export const runtime = 'nodejs';

const KINDS = new Set(['tutor_conduct', 'content', 'safety', 'other']);

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Reporting needs an account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req, { limit: 10, windowMs: 3600_000 });
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const kind = KINDS.has(body?.kind) ? body.kind : 'other';
  const detail = String(body?.detail || '').trim().slice(0, 2000);
  if (detail.length < 5) return Response.json({ error: 'Tell us what happened (a sentence is enough).' }, { status: 400 });
  const sessionId = String(body?.sessionId || '') || null;

  // If the report references a session, resolve the tutor for the triage queue.
  let reportedTutorId = null;
  if (sessionId) {
    const { data: s } = await svc.from('tutoring_sessions').select('tutor_id,student_id').eq('id', sessionId).maybeSingle();
    if (s && (s.student_id === caller.user.id || s.tutor_id)) reportedTutorId = s.tutor_id || null;
  }

  const { data: row, error } = await svc.from('safety_events').insert({
    user_id: caller.user.id,
    kind: `report_${kind}`,
    detail,
    status: 'open',
    tutoring_session_id: sessionId,
    reported_tutor_id: reportedTutorId,
    metadata: { reporter_email: caller.user.email || null },
  }).select().maybeSingle();
  if (error) {
    console.error('[safety] report insert failed', error.message);
    return Response.json({ error: 'Could not file the report — try again, or reach us through the contact page.' }, { status: 500 });
  }

  await auditLog(caller.user.id, 'safety.reported', row?.id || 'report', { kind });

  // Immediate admin alert — safety reports are never quiet.
  const admin = (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim();
  if (admin) {
    sendEmail({
      to: admin,
      subject: `⚠️ Safety report: ${kind}`,
      html: `<p><b>${caller.user.email || caller.user.id}</b> filed a safety report (${kind}).</p>
             <p style="white-space:pre-wrap">${detail.replace(/</g, '&lt;')}</p>
             ${sessionId ? `<p>Session: ${sessionId}</p>` : ''}
             <p>Triage it in the <a href="${process.env.APP_URL || ''}/admin">admin console</a>.</p>`,
    }).catch(() => {});
  }

  return Response.json({ ok: true, id: row?.id });
}

// GET (admin) — the triage queue: open/reviewing reports newest-first.
export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ events: [] });

  const { data } = await svc.from('safety_events')
    .select('*').neq('status', 'resolved')
    .order('created_at', { ascending: false }).limit(100);
  return Response.json({ events: data || [] });
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body?.id || '');
  const status = String(body?.status || '');
  if (!id || !['open', 'reviewing', 'resolved'].includes(status)) {
    return Response.json({ error: 'Need id and a status (open, reviewing, resolved).' }, { status: 400 });
  }
  const { error } = await svc.from('safety_events').update({ status }).eq('id', id);
  if (error) {
    console.error('[safety] triage update failed', id, error.message);
    return Response.json({ error: 'Could not update the report status — try again.' }, { status: 500 });
  }
  await auditLog(caller.user.id, 'safety.triage', id, { status });
  return Response.json({ ok: true });
}
