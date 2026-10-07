// GET /api/admin/stats — users, usage, cost, sessions. Admin only. Audited.
import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });

  const svc = serviceClient();
  if (!svc) {
    return Response.json({ demo: true, note: 'Supabase not configured — admin data unavailable in demo mode.' });
  }

  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const sinceToday = new Date(); sinceToday.setHours(0, 0, 0, 0);

  const [{ count: userCount }, { data: usage30 }, { data: recentUsage }, { data: handoffs }, { data: supports }] = await Promise.all([
    svc.from('profiles').select('*', { count: 'exact', head: true }),
    // Bounded pull (was unbounded → silently capped at 1000 by Supabase). For
    // launch scale 10k/30d is ample; a SQL aggregate RPC is the scale follow-up.
    svc.from('usage_ledger').select('feature,quantity,est_cost_usd,user_id').gte('created_at', since30).limit(10000),
    svc.from('usage_ledger').select('feature,quantity,est_cost_usd,user_id,created_at').order('created_at', { ascending: false }).limit(50),
    svc.from('human_handoff_requests').select('*').order('created_at', { ascending: false }).limit(50),
    svc.from('support_requests').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  const byFeature = {};
  const byUser = {};
  let cost30 = 0;
  for (const r of usage30 || []) {
    byFeature[r.feature] = (byFeature[r.feature] || 0) + Number(r.quantity);
    byUser[r.user_id] = (byUser[r.user_id] || 0) + Number(r.est_cost_usd);
    cost30 += Number(r.est_cost_usd);
  }
  const topUsers = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([user_id, usd]) => ({ user_id, usd: Number(usd.toFixed(4)) }));

  const msgsToday = (usage30 || []).filter((r) => r.feature === 'tutor_message').length; // approximation; refine via query if needed

  await auditLog(caller.user.id, 'admin.view_stats', 'stats', {});

  return Response.json({
    users: userCount || 0,
    cost30d: Number(cost30.toFixed(4)),
    byFeature,
    topUsers,
    msgsApprox30d: msgsToday,
    recentUsage: recentUsage || [],
    handoffs: handoffs || [],
    supports: supports || [],
  });
}
