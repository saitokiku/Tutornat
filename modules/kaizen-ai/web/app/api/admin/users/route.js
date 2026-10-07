// /api/admin/users — user management for the ops console. Admin only.
// GET  ?q=<search>&limit=50   → list/search users (profile + subscription + 30d spend)
// PATCH { userId, role }      → change a user's role (student|parent|tutor|admin)

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';

export const runtime = 'nodejs';

const ROLES = ['student', 'parent', 'tutor', 'admin'];

async function requireAdmin(req) {
  const caller = await getCaller(req);
  if (!caller) return { error: Response.json({ error: 'Sign in first.' }, { status: 401 }) };
  if (!isAdminCaller(caller)) return { error: Response.json({ error: 'Admin only.' }, { status: 403 }) };
  const svc = serviceClient();
  if (!svc) return { error: Response.json({ error: 'Supabase not configured.' }, { status: 501 }) };
  return { caller, svc };
}

export async function GET(req) {
  const { error, svc } = await requireAdmin(req);
  if (error) return error;

  const url = new URL(req.url);
  const q = String(url.searchParams.get('q') || '').trim();
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);

  let query = svc.from('profiles')
    .select('id,email,name,role,plan,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (q) query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%`);

  const { data: profiles, error: pErr } = await query;
  if (pErr) {
    console.error('[admin/users] list failed', pErr.message);
    return Response.json({ error: 'Could not load users — try again.' }, { status: 500 });
  }

  const ids = (profiles || []).map((p) => p.id);
  let subsById = {}, spendById = {};
  if (ids.length) {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [subsQ, usageQ] = await Promise.all([
      svc.from('subscriptions').select('user_id,status,current_period_end').in('user_id', ids),
      svc.from('usage_ledger').select('user_id,est_cost_usd').in('user_id', ids).gte('created_at', since),
    ]);
    for (const s of subsQ.data || []) subsById[s.user_id] = s;
    for (const u of usageQ.data || []) {
      spendById[u.user_id] = (spendById[u.user_id] || 0) + Number(u.est_cost_usd || 0);
    }
  }

  return Response.json({
    users: (profiles || []).map((p) => ({
      ...p,
      subscription_status: subsById[p.id]?.status || null,
      period_end: subsById[p.id]?.current_period_end || null,
      cost30d: Math.round((spendById[p.id] || 0) * 100) / 100,
    })),
  });
}

export async function PATCH(req) {
  const { error, caller, svc } = await requireAdmin(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const userId = String(body?.userId || '');
  const role = String(body?.role || '');
  if (!userId || !ROLES.includes(role)) {
    return Response.json({ error: `Need userId and a role (${ROLES.join(', ')}).` }, { status: 400 });
  }

  const { data: target } = await svc.from('profiles').select('id,email,role').eq('id', userId).maybeSingle();
  if (!target) return Response.json({ error: 'No such user.' }, { status: 404 });
  // Guard the last admin: demoting the final admin locks everyone out of ops.
  if (target.role === 'admin' && role !== 'admin') {
    const { count } = await svc.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if ((count || 0) <= 1) return Response.json({ error: 'Cannot demote the last admin.' }, { status: 400 });
  }

  const { error: upErr } = await svc.from('profiles').update({ role }).eq('id', userId);
  if (upErr) {
    console.error('[admin/users] role change failed', userId, upErr.message);
    return Response.json({ error: 'Could not change the role — try again.' }, { status: 500 });
  }

  await auditLog(caller.user?.id || null, 'admin.set_role', userId, {
    email: target.email, from: target.role, to: role,
  });
  return Response.json({ ok: true, userId, role });
}
