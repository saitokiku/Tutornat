// PATCH /api/admin/grant-plan — manually set a user's plan (comps, refunds,
// internal accounts). Admin only. Audited. Keeps subscriptions in sync so
// /billing shows the granted plan honestly.

import { getCaller, isAdminCaller, serviceClient, auditLog } from '@/lib/server/context';
import { SALE_STATUS, forSale } from '@/lib/server/clubPricing';

export const runtime = 'nodejs';

// What an admin may grant, DERIVED rather than retyped. The hand-typed array
// this replaces was written before the standing seat existed and never grew a
// `seat` key, so the one recurring product on sale was the one plan a director
// could not put on an account — a family paid, and the comp, the refund fix and
// the "put them on it while Stripe catches up" case all had to be done in SQL.
// A list that follows clubPricing cannot fall behind it again.
//
// For sale first (SALE_STATUS 'active'), then the retired tiers — still
// grantable, because /terms discloses them and an existing support case may
// need one — then the legacy keys that were never priced. Every key here is
// permitted by the profiles.plan CHECK constraint (migration 0033).
const PLANS = [
  'free',
  ...Object.keys(SALE_STATUS).filter(forSale),
  ...Object.keys(SALE_STATUS).filter((p) => !forSale(p)),
  'student', 'family', 'internal',
];

export async function PATCH(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!isAdminCaller(caller)) return Response.json({ error: 'Admin only.' }, { status: 403 });

  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const email = String(body?.email || '').trim().toLowerCase();
  const plan = String(body?.plan || '');
  if (!email || !PLANS.includes(plan)) {
    return Response.json({ error: `Need an email and a plan (${PLANS.join(', ')}).` }, { status: 400 });
  }

  const { data: profile } = await svc.from('profiles').select('id,email,plan').ilike('email', email).maybeSingle();
  if (!profile) return Response.json({ error: `No user with email ${email}.` }, { status: 404 });

  await svc.from('profiles').update({ plan }).eq('id', profile.id);
  await svc.from('subscriptions').upsert(
    { user_id: profile.id, plan, status: 'active' },
    { onConflict: 'user_id' }
  );
  await auditLog(caller.user?.id || null, 'admin.grant_plan', profile.id, {
    email, from: profile.plan, to: plan,
  });

  return Response.json({ ok: true, email, plan });
}
