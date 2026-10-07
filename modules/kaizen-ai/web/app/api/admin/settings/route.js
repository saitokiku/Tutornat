// GET/PATCH /api/admin/settings — kill switches. Admin only. Audited.
import { getCaller, isAdminCaller, serviceClient, auditLog, bustSettingsCache, getSettings } from '@/lib/server/context';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });
  return Response.json({ settings: await getSettings() });
}

const ALLOWED = ['tutor_enabled', 'voice_enabled', 'expensive_models_enabled', 'maintenance_mode', 'signups_enabled', 'club_enabled', 'diagnostic_enabled'];

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const { key, value } = body || {};
  if (!ALLOWED.includes(key) || typeof value !== 'boolean') {
    return Response.json({ error: 'Invalid setting.' }, { status: 400 });
  }
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  await svc.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  bustSettingsCache();
  await auditLog(caller.user.id, 'admin.setting_change', key, { value });
  return Response.json({ ok: true });
}
