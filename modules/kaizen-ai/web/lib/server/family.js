// Family helpers — the parent-first account model (0022/0025).
//
// A managed child is a real auth.users row (so every learner-keyed table and
// RLS policy works unchanged) whose profile carries managed_by = the parent's
// user id. The parent is the payer and the guardian: club entitlements meter
// the PARENT's account, consent is recorded at profile creation, and bookings
// can be made on the child's behalf.

import { serviceClient, agePosture } from '@/lib/server/context';

export const MAX_MANAGED_CHILDREN = 5;

/**
 * WHICH relationship lets this caller act for this student:
 *
 *   'self'    — the student is the caller
 *   'managed' — profiles.managed_by = the caller. The caller CREATED this
 *               account, attested in writing to being the guardian, and is the
 *               payer of record (app/api/family/children).
 *   'invite'  — an active parent_student_relationships link
 *   null      — no relationship at all; the caller may not act for this student
 *
 * The difference between the last two is child-safety logic, not bookkeeping.
 * An invite link is created by whoever knows the student's email and activated
 * by whoever controls the student account — nothing in it attests that the
 * "parent" is an adult, or a parent. `profiles` carries no adult attestation
 * either. Only the managed path has a human claiming guardianship of a specific
 * child before the account exists.
 *
 * managed_by is the AUTHORITY here, not parent_student_relationships.created_via.
 * 0025 stamps created_via='managed' on links the children route makes, but the
 * 0011 client INSERT policy constrains only parent_id and status='pending' — it
 * says nothing about created_via, so a browser holding the anon key can insert a
 * 'managed'-stamped pending link and have the student account accept it.
 * managed_by is service-role-only under the same migration's column grants,
 * which is exactly why it is the column we trust. created_via is still read, to
 * corroborate and to keep support's provenance story readable.
 */
export async function bookingRelationship(svc, bookerId, studentId) {
  const raw = String(studentId || '').trim();
  if (!raw || raw === bookerId) return 'self';

  const { data: child } = await svc.from('profiles')
    .select('id,managed_by').eq('id', raw).maybeSingle();
  if (child?.managed_by === bookerId) return 'managed';

  const { data: link } = await svc.from('parent_student_relationships')
    .select('id,created_via').eq('parent_id', bookerId).eq('student_id', raw)
    .eq('status', 'active').maybeSingle();
  // created_via can say 'managed' without managed_by backing it (see above) —
  // that combination is a forged or orphaned link and stays an invite here.
  if (link) return 'invite';

  return null;
}

/**
 * Resolve who a booking is FOR. No childId → the caller books for themself
 * (the pre-club behavior, unchanged). With childId, the caller must be the
 * child's managing parent or hold an active parent link — verified
 * server-side; the client's word is never enough to book on someone's behalf.
 *
 * Returns { studentId, onBehalf, relationship } or { error: Response }.
 * `onBehalf` stays the "is this someone else's booking" flag callers use for
 * provenance and profile lookups; `relationship` says WHICH link earned it and
 * is what guardianGateSatisfied weighs. Pass it through — do not re-derive it.
 */
export async function resolveBookingStudent(svc, caller, childId) {
  const raw = String(childId || '').trim();
  if (!raw || raw === caller.user.id) {
    return { studentId: caller.user.id, onBehalf: false, relationship: 'self' };
  }

  const relationship = await bookingRelationship(svc, caller.user.id, raw);
  if (!relationship || relationship === 'self') {
    return {
      error: Response.json(
        { error: 'You can only book for a child linked to your account.' },
        { status: 403 },
      ),
    };
  }
  return { studentId: raw, onBehalf: true, relationship };
}

/** All children this parent manages (profiles.managed_by), newest last. */
export async function managedChildren(svc, parentId) {
  const { data } = await svc.from('profiles')
    .select('id,name,email,birth_year,grade_level,is_minor,guardian_consent_at,created_at')
    .eq('managed_by', parentId).order('created_at', { ascending: true });
  return data || [];
}

/**
 * Whether a minor's live-video guardian gate is satisfied for this booking.
 * Three ways through, and only three:
 *
 *   1. the student is a verified adult (agePosture, which fails closed on a
 *      missing or implausible birth year rather than assuming 18+);
 *   2. the account carries a recorded guardian_consent_at — the emailed link
 *      was clicked, or the parent created the profile;
 *   3. the booker is the MANAGING parent. Booking it is consenting to it,
 *      because that account only exists because they made it.
 *
 * An 'invite' link is deliberately NOT a way through. It is created by whoever
 * knows the student's email and activated by whoever controls the student
 * account, so accepting it as implicit consent let a 15-year-old register a
 * second email, invite their own account as "parent", accept from the student
 * side, and book live 1:1 video with an adult — self-consent in three API
 * calls. An invite-linked parent booking for an unconsented minor now gets the
 * same guardian_consent_required refusal a self-booking teen gets: the emailed
 * link has to be clicked from the guardian's inbox.
 *
 * Callers pass `relationship` from resolveBookingStudent. A caller that passes
 * nothing fails closed for minors, which is the direction we want a mistake to
 * point. `studentProfile` must be selected with birth_year, is_minor and
 * guardian_consent_at — a profile missing birth_year reads as unverified age.
 */
export function guardianGateSatisfied({ studentProfile, relationship = null }) {
  if (!studentProfile) return false;
  if (agePosture(studentProfile) === 'adult') return true;
  if (studentProfile.guardian_consent_at) return true;
  return relationship === 'managed';
}

/** Convenience wrapper used by pages/routes that only have a request caller. */
export async function callerManagedChildren(caller) {
  const svc = serviceClient();
  if (!svc || !caller) return [];
  return managedChildren(svc, caller.user.id);
}
