// /api/tutoring/tutors
// GET               → active tutor roster (public to signed-in users)
// POST {display_name, bio, subjects[], timezone}
//                   → onboard the caller as a tutor (self-serve, starts pending)
// Admin activates a pending tutor by changing their role/status via the console.
//
// HOUSE PRICING (club model): tutors no longer set a public hourly rate — the
// company sets retail (lib/server/clubPricing.js) and pays tutors a flat
// hourly rate an admin records on the tutor row (pay_rate_cents, 0023).
// hourly_rate_cents survives for historical reconstruction only and is neither
// accepted nor returned here.

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { RETAIL } from '@/lib/server/clubPricing';

export const runtime = 'nodejs';

function slugify(name) {
  const base = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${base || 'tutor'}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ tutors: [] });

  const { data } = await svc.from('tutors')
    .select('id,display_name,bio,subjects,timezone,status,slug,headline,photo_url')
    .eq('status', 'active').eq('vetting_status', 'cleared').order('created_at', { ascending: true });
  // House retail pricing rides along so booking UIs never invent numbers.
  return Response.json({ tutors: data || [], pricing: { ...RETAIL } });
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Tutoring needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const display_name = String(body?.display_name || '').trim();
  if (!display_name) return Response.json({ error: 'A display name is required.' }, { status: 400 });

  // Preserve an existing slug; mint one on first onboard so the tutor gets a
  // public /tutors/<slug> page as soon as an admin activates them.
  const existing = (await svc.from('tutors').select('slug').eq('user_id', caller.user.id).maybeSingle()).data;

  const row = {
    user_id: caller.user.id,
    display_name,
    bio: String(body?.bio || '').slice(0, 2000) || null,
    subjects: Array.isArray(body?.subjects) ? body.subjects.map((s) => String(s).slice(0, 60)).slice(0, 20) : [],
    timezone: String(body?.timezone || '').slice(0, 60) || null,
    headline: String(body?.headline || '').slice(0, 120) || null,
    slug: existing?.slug || slugify(display_name),
  };
  if (typeof body?.photo_url === 'string') row.photo_url = body.photo_url.slice(0, 500) || null;
  const { data, error } = await svc.from('tutors').upsert(row, { onConflict: 'user_id' }).select().maybeSingle();
  if (error) {
    console.error('[tutors] profile save failed', caller.user.id, error.message);
    return Response.json({ error: 'Could not save your tutor profile — try again.' }, { status: 500 });
  }

  // Reflect the tutor role so role-gated UI (the tutor dashboard) opens for them.
  await svc.from('profiles').update({ role: 'tutor' }).eq('id', caller.user.id)
    .neq('role', 'admin'); // never demote an admin
  await auditLog(caller.user.id, 'tutor.onboard', data?.id || caller.user.id, { display_name });
  return Response.json({ ok: true, tutor: data });
}
