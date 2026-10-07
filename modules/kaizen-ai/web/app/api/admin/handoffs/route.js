// PATCH /api/admin/handoffs — mark a handoff handled. Admin only. Audited.
import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
export const runtime = 'nodejs';

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const { id, status } = body || {};
  if (!id || !['open', 'scheduled', 'handled', 'cancelled'].includes(status)) {
    return Response.json({ error: 'id + valid status required' }, { status: 400 });
  }
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  const { error } = await svc.from('human_handoff_requests').update({ status }).eq('id', id);
  if (error) return Response.json({ error: 'Update failed.' }, { status: 500 });
  await auditLog(caller.user.id, 'admin.handoff_status', id, { status });
  return Response.json({ ok: true });
}
