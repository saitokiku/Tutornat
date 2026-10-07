// /api/circle — Study Circles: the retired legacy 'family' plan shared by up
// to 4 students. The subscription owner got a shareable invite code; members
// on the free plan inherit benefits while the owner's subscription stays
// active (resolved in getCaller).
//
// FROZEN (2026-08): the plan is retired and closed to new members. Existing
// circles keep working — members keep inherited benefits, owners can view
// their circle and remove members — but nothing can grow: no new circles,
// no new joins.
//
// GET            → my circle: as owner {role:'owner', code, members[]},
//                  as member {role:'member', ownerName}, else {role:null}
// POST {code}    → 410 (legacy plan, closed to new members)
// POST {}        → owner: fetch the existing circle's code (no new circles)
// DELETE {memberId?} → owner removes a member; no memberId = leave (member)

import { getCaller, serviceClient, auditLog } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

const SEATS = 3; // members besides the owner → 4 students total

const LEGACY_CLOSED =
  'Study Circle is a legacy plan closed to new members. Existing circles keep working, but no one new can join.';

async function ownerHasCirclePlan(svc, userId) {
  const { data: sub } = await svc.from('subscriptions')
    .select('status,plan').eq('user_id', userId).maybeSingle();
  return Boolean(sub && ['active', 'trialing'].includes(sub.status) && sub.plan === 'family');
}

export async function GET(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ role: null });
  const svc = serviceClient();
  if (!svc) return Response.json({ role: null });

  // Owner?
  const { data: group } = await svc.from('plan_groups').select('*').eq('owner_id', caller.user.id).maybeSingle();
  if (group) {
    const { data: members } = await svc.from('plan_group_members').select('user_id,created_at').eq('group_id', group.id);
    const ids = (members || []).map((m) => m.user_id);
    const { data: profs } = ids.length
      ? await svc.from('profiles').select('id,name,email').in('id', ids)
      : { data: [] };
    const nameOf = Object.fromEntries((profs || []).map((p) => [p.id, p.name || p.email]));
    return Response.json({
      role: 'owner',
      code: group.invite_code,
      seats: SEATS,
      members: (members || []).map((m) => ({ id: m.user_id, name: nameOf[m.user_id] || 'Student', joined: m.created_at })),
      active: await ownerHasCirclePlan(svc, caller.user.id),
    });
  }

  // Member?
  const { data: membership } = await svc.from('plan_group_members')
    .select('id, group_id, plan_groups!inner(owner_id)').eq('user_id', caller.user.id).maybeSingle();
  if (membership) {
    // PostgREST returns an embedded resource as an object for a to-one
    // relationship and an array when it cannot infer cardinality. Handle both —
    // getting this wrong silently breaks Study Circle plan inheritance, which
    // is a PAID feature failing quietly.
    const embedded = /** @type {any} */ (membership.plan_groups);
    const ownerId = Array.isArray(embedded) ? embedded[0]?.owner_id : embedded?.owner_id;
    const { data: owner } = await svc.from('profiles').select('name,email').eq('id', ownerId).maybeSingle();
    return Response.json({
      role: 'member',
      ownerName: owner?.name || owner?.email || 'the owner',
      active: await ownerHasCirclePlan(svc, ownerId),
    });
  }

  return Response.json({ role: null });
}

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Circles need a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req, { limit: 10, windowMs: 3600_000 });
  if (limited) return limited;

  let body = {};
  try { body = await req.json(); } catch { /* empty = owner code fetch */ }
  const code = String(body?.code || '').trim().toUpperCase();

  if (!code) {
    // Owner path, read-only since the freeze: return the existing circle's
    // code for a legacy family-plan subscriber. New circles are never created.
    if (!(await ownerHasCirclePlan(svc, caller.user.id))) {
      return Response.json({ error: 'Study Circles belong to the legacy Study Circle plan, which is no longer sold.' }, { status: 403 });
    }
    const { data: existing } = await svc.from('plan_groups').select('invite_code').eq('owner_id', caller.user.id).maybeSingle();
    if (existing) return Response.json({ ok: true, code: existing.invite_code });
    return Response.json({ error: LEGACY_CLOSED }, { status: 410 });
  }

  // Join path: FROZEN. The retired plan must not grow — no code redemption,
  // whatever the code says. 410 Gone, friendly wording.
  return Response.json({ error: LEGACY_CLOSED }, { status: 410 });
}

export async function DELETE(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });

  let body = {};
  try { body = await req.json(); } catch { /* empty = leave */ }
  const memberId = String(body?.memberId || '');

  if (memberId) {
    // Owner removing a member.
    const { data: group } = await svc.from('plan_groups').select('id').eq('owner_id', caller.user.id).maybeSingle();
    if (!group) return Response.json({ error: 'You don’t own a circle.' }, { status: 403 });
    await svc.from('plan_group_members').delete().eq('group_id', group.id).eq('user_id', memberId);
    await auditLog(caller.user.id, 'circle.removed_member', memberId, {});
    return Response.json({ ok: true });
  }

  // Member leaving.
  await svc.from('plan_group_members').delete().eq('user_id', caller.user.id);
  await auditLog(caller.user.id, 'circle.left', caller.user.id, {});
  return Response.json({ ok: true });
}
