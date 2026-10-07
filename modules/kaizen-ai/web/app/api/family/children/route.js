// /api/family/children — parent-created managed teen profiles (the club's
// parent-first funnel; 0022 managed_by + 0025 created_via='managed').
//
// LAUNCH SCOPE IS 13+ (repricing addendum): the age floor here matches the
// signup age gate — a parent cannot create an under-13 profile either. The
// parent-first architecture is deliberately COPPA-shaped so younger students
// can be added later behind a verifiable-parental-consent build
// (docs/legal/REVIEW_QUEUE.md), but today the floor is 13 everywhere.
//
// POST {name, birthYear, gradeLevel?, email?, password, consent:true}
//   → create a teen account the caller manages. The parent IS the guardian:
//     consent is a required checkbox, recorded as guardian_consent_at at
//     creation and audit-logged (this is what unlocks live video for minors).
// GET → my managed children.
// PATCH {childId, name?, gradeLevel?, newPassword?} → update a managed child.

import { getCaller, serviceClient, auditLog, agePosture } from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';
import { managedChildren, MAX_MANAGED_CHILDREN } from '@/lib/server/family';

export const runtime = 'nodejs';

function requireReal(caller) {
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Family accounts need a real account.' }, { status: 501 });
  return null;
}

export async function GET(req) {
  const caller = await getCaller(req);
  const gate = requireReal(caller);
  if (gate) return gate;
  const svc = serviceClient();
  if (!svc) return Response.json({ children: [] });

  const children = await managedChildren(svc, caller.user.id);

  // Upcoming bookings per child, so the parent view can show at-a-glance state.
  const ids = children.map((c) => c.id);
  const nowIso = new Date().toISOString();
  let upcoming = {};
  if (ids.length) {
    const [seatsQ, sessQ] = await Promise.all([
      svc.from('group_seat').select('student_id,group_session_id,status')
        .in('student_id', ids).in('status', ['pending_payment', 'booked']),
      svc.from('tutoring_sessions').select('student_id,status,scheduled_start')
        .in('student_id', ids).in('status', ['scheduled', 'in_progress'])
        .gt('scheduled_start', nowIso),
    ]);
    for (const s of seatsQ.data || []) upcoming[s.student_id] = (upcoming[s.student_id] || 0) + 1;
    for (const s of sessQ.data || []) upcoming[s.student_id] = (upcoming[s.student_id] || 0) + 1;
  }

  return Response.json({
    children: children.map((c) => ({ ...c, upcomingBookings: upcoming[c.id] || 0 })),
    max: MAX_MANAGED_CHILDREN,
  });
}

export async function POST(req) {
  const caller = await getCaller(req);
  const gate = requireReal(caller);
  if (gate) return gate;
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  // The consent checkbox below is the whole legal basis for this child's
  // account, and every check on it used to run against SELF-ASSERTED data with
  // nothing asked of the person asserting it — a 15-year-old could mint a
  // "managed child" and become its guardian of record, which is the one
  // relationship guardianGateSatisfied still accepts as implicit consent.
  // So the creator has to be an adult by the same posture rule the gate uses
  // (lib/server/context.js agePosture): unknown age is not adult here either.
  // It is still a self-asserted age — it just costs an attacker the same lie
  // twice, and leaves the lie in the audit record next to the consent.
  const creatorPosture = agePosture(caller.profile);
  if (creatorPosture !== 'adult') {
    return Response.json({
      error: creatorPosture === 'minor'
        ? 'Only an adult can create and consent for a child’s account.'
        : 'We need your date of birth on file before you can create a child’s account — contact support and we’ll sort it out.',
      code: 'creator_not_adult',
    }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }

  const name = String(body?.name || '').trim().slice(0, 80);
  const birthYear = Math.round(Number(body?.birthYear));
  const gradeLevel = body?.gradeLevel == null || body.gradeLevel === '' ? null : Math.round(Number(body.gradeLevel));
  const password = String(body?.password || '');
  const childEmailRaw = String(body?.email || '').trim().toLowerCase();

  if (!name) return Response.json({ error: 'Give your child’s profile a name.' }, { status: 400 });

  // The consent checkbox is the load-bearing legal record — required, exact.
  if (body?.consent !== true) {
    return Response.json({
      error: 'Please confirm you are this child’s parent or guardian and consent to their participation.',
      code: 'consent_required',
    }, { status: 400 });
  }

  const thisYear = new Date().getFullYear();
  if (!Number.isFinite(birthYear) || birthYear < thisYear - 19) {
    return Response.json({ error: 'Enter your child’s birth year.' }, { status: 400 });
  }
  // Launch scope is 13+ — same floor as self-signup. Younger students come
  // later, behind a dedicated COPPA verifiable-consent build.
  if (thisYear - birthYear < 13) {
    return Response.json({
      error: 'Kaizen currently serves students ages 13 and up — support for younger students is coming.',
      code: 'under_13_unsupported',
    }, { status: 400 });
  }
  if (gradeLevel != null && (!Number.isFinite(gradeLevel) || gradeLevel < 1 || gradeLevel > 12)) {
    return Response.json({ error: 'Grade must be between 1 and 12.' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Choose a login password of at least 8 characters for your child.' }, { status: 400 });
  }
  if (childEmailRaw && childEmailRaw === (caller.user.email || '').toLowerCase()) {
    return Response.json({ error: 'Use a different email than your own (or leave it blank).' }, { status: 400 });
  }

  const existing = await managedChildren(svc, caller.user.id);
  if (existing.length >= MAX_MANAGED_CHILDREN) {
    return Response.json({ error: `You can manage up to ${MAX_MANAGED_CHILDREN} children on one account.` }, { status: 400 });
  }

  // Child email is optional: when absent, synthesize a plus-address on the
  // parent's inbox. Supabase requires an email per auth user; deliverability
  // is irrelevant because managed children are created email-confirmed and
  // opted out of all mail — the parent is the contact for the household.
  let childEmail = childEmailRaw;
  if (!childEmail) {
    const parentEmail = String(caller.user.email || '');
    const at = parentEmail.lastIndexOf('@');
    const tag = `kz-${Math.random().toString(36).slice(2, 8)}`;
    childEmail = at > 0 ? `${parentEmail.slice(0, at)}+${tag}${parentEmail.slice(at)}` : `${tag}@kaizen-child.invalid`;
  }

  const isMinor = thisYear - birthYear < 18;

  // 1) The auth user — email_confirm skips the verification dance; the parent
  //    sets (and can later reset) the password.
  const { data: created, error: authErr } = await svc.auth.admin.createUser({
    email: childEmail,
    password,
    email_confirm: true,
    user_metadata: { name, birth_year: birthYear, managed: true },
  });
  if (authErr || !created?.user) {
    const msg = /already.*registered|exists/i.test(authErr?.message || '')
      ? 'An account with that email already exists — leave the email blank or use another.'
      : (authErr?.message || 'Could not create the account.');
    return Response.json({ error: msg }, { status: 400 });
  }
  const childId = created.user.id;

  // 2) The profile row, written directly (NOT via getCaller's lazy
  //    provisioning, which would also fire welcome/guardian emails that make
  //    no sense here). guardian_consent_at = now: the parent creating the
  //    profile IS the guardian consenting.
  const nowIso = new Date().toISOString();
  const { error: profErr } = await svc.from('profiles').insert({
    id: childId,
    email: childEmail,
    name,
    role: 'student',
    plan: 'free', // club benefits meter the PARENT; AI inherits via getCaller
    birth_year: birthYear,
    is_minor: isMinor,
    grade_level: gradeLevel,
    guardian_email: caller.user.email || null,
    guardian_consent_at: nowIso,
    managed_by: caller.user.id,
    email_opt_out: true,
  });
  if (profErr) {
    // Roll the auth user back rather than strand a half-created child.
    await svc.auth.admin.deleteUser(childId).catch(() => {});
    console.error('[family/children] profile create failed', profErr.message);
    return Response.json({ error: 'Could not create the account — nothing was saved. Try again.' }, { status: 500 });
  }

  // 3) The family link, born active (created_via='managed', 0025).
  const { error: linkErr } = await svc.from('parent_student_relationships').upsert(
    { parent_id: caller.user.id, student_id: childId, status: 'active', created_via: 'managed' },
    { onConflict: 'parent_id,student_id' },
  );
  if (linkErr) {
    console.error('[family/children] link failed', linkErr.message);
  }

  // 4) First child promotes the caller to the parent role (the first product
  //    path that ever assigns it). Never demote tutors or admins.
  if (existing.length === 0) {
    await svc.from('profiles').update({ role: 'parent' })
      .eq('id', caller.user.id).eq('role', 'student');
  }

  // Provenance for the consent record: WHO consented and what we knew about
  // them at the time, not just that a box was ticked.
  await auditLog(caller.user.id, 'family.child_created', childId, {
    consent: true, birth_year: birthYear, grade_level: gradeLevel, is_minor: isMinor,
    creator_age_posture: creatorPosture,
    creator_birth_year: caller.profile?.birth_year ?? null,
  });
  return Response.json({
    ok: true,
    child: { id: childId, name, email: childEmail, birth_year: birthYear, grade_level: gradeLevel, is_minor: isMinor },
  });
}

export async function PATCH(req) {
  const caller = await getCaller(req);
  const gate = requireReal(caller);
  if (gate) return gate;
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Supabase not configured.' }, { status: 501 });
  const limited = await rateLimitResponse(caller, req);
  if (limited) return limited;

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const childId = String(body?.childId || '');
  if (!childId) return Response.json({ error: 'Which child?' }, { status: 400 });

  // Ownership check — managed_by is the authority, not the request body.
  const { data: child } = await svc.from('profiles')
    .select('id,managed_by').eq('id', childId).maybeSingle();
  if (!child || child.managed_by !== caller.user.id) {
    return Response.json({ error: 'Not a child you manage.' }, { status: 403 });
  }

  const patch = {};
  if (typeof body?.name === 'string' && body.name.trim()) patch.name = body.name.trim().slice(0, 80);
  if (body?.gradeLevel !== undefined) {
    const g = body.gradeLevel == null || body.gradeLevel === '' ? null : Math.round(Number(body.gradeLevel));
    if (g != null && (!Number.isFinite(g) || g < 1 || g > 12)) {
      return Response.json({ error: 'Grade must be between 1 and 12.' }, { status: 400 });
    }
    patch.grade_level = g;
  }
  if (Object.keys(patch).length) {
    const { error: upErr } = await svc.from('profiles').update(patch).eq('id', childId);
    if (upErr) {
      console.error('[family/children] profile update failed', childId, upErr.message);
      return Response.json({ error: 'Could not save the changes — try again.' }, { status: 500 });
    }
  }

  if (typeof body?.newPassword === 'string' && body.newPassword) {
    if (body.newPassword.length < 8) {
      return Response.json({ error: 'Passwords need at least 8 characters.' }, { status: 400 });
    }
    const { error: pwErr } = await svc.auth.admin.updateUserById(childId, { password: body.newPassword });
    if (pwErr) {
      console.error('[family/children] password update failed', childId, pwErr.message);
      return Response.json({ error: 'Could not set that password — try a different one.' }, { status: 500 });
    }
  }

  await auditLog(caller.user.id, 'family.child_updated', childId, { fields: Object.keys(patch), password: Boolean(body?.newPassword) });
  return Response.json({ ok: true });
}
