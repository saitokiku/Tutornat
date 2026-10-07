// POST /api/account/birth-year — the one-time way out of an "unknown" age.
//
// Migration 0007 added profiles.birth_year as NULL to every account that
// already existed. lib/server/context.js agePosture reads a missing year as
// 'unknown' and the guardian gate (lib/server/family.js) refuses 'unknown' the
// same way it refuses an unconsented minor — correctly, because a blank field
// is not an attestation of adulthood. What was missing was a door: birth_year
// is written only when getCaller first inserts the profile, migration 0011
// revokes client UPDATE on the column, the admin users route writes only
// { role }, and the guardian path asks for a guardian address these accounts
// were never asked to supply. Every pre-existing account was locked out of live
// booking with nothing it could do about it.
//
// This route is that door, and it is deliberately narrow: state a birth year
// ONCE, on an account that has none. Typing your birth year is exactly what
// signup already collects, so the remedy costs an attacker the same lie they
// could have told at signup — no more — while an ABSENT year still never reads
// as adult. The rule itself lives in context.js next to agePosture
// (decideSelfDeclaredBirthYear); this file is auth, the write, and the trail.
//
// The write is guarded in the WHERE clause (`.is('birth_year', null)`), not
// just by the read above it: two concurrent posts must not race into a second
// declaration.

import {
  getCaller, serviceClient, auditLog, agePosture, decideSelfDeclaredBirthYear,
} from '@/lib/server/context';
import { rateLimitResponse } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const caller = await getCaller(req);
  if (!caller) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (caller.demo) return Response.json({ error: 'Needs a real account.' }, { status: 501 });
  const svc = serviceClient();
  if (!svc) return Response.json({ error: 'Not configured.' }, { status: 501 });
  // A declaration is a once-per-account event; 5/hour is generous for typos and
  // still refuses anyone probing years against the under-13 refusal.
  const limited = await rateLimitResponse(caller, req, { limit: 5, windowMs: 3600_000 });
  if (limited) return limited;

  let body = {};
  try { body = await req.json(); } catch { /* no body — the validation below says so */ }

  // Read the row on the service role rather than trusting caller.profile: this
  // decides whether a value already exists, so it reads the authority.
  const { data: profile } = await svc.from('profiles')
    .select('id,birth_year,is_minor,guardian_email,guardian_consent_at')
    .eq('id', caller.user.id).maybeSingle();
  if (!profile) return Response.json({ error: 'No profile on this account yet.' }, { status: 404 });

  const decision = decideSelfDeclaredBirthYear(profile, body?.birthYear);
  if (!decision.ok) {
    return Response.json({ error: decision.error, code: decision.code }, { status: decision.status });
  }

  const { data: updated } = await svc.from('profiles')
    .update(decision.patch)
    .eq('id', caller.user.id)
    .is('birth_year', null)
    .select('id,birth_year,is_minor,guardian_email,guardian_consent_at')
    .maybeSingle();
  if (!updated) {
    // Someone else wrote a year between the read and the write. Same answer as
    // if we had seen it first — the value on file wins.
    return Response.json({
      error: 'Your birth year is already on file. If it’s wrong, contact support and we’ll correct it.',
      code: 'birth_year_already_set',
    }, { status: 409 });
  }

  // Self-asserted, so the record of who asserted it is the point. This is the
  // row a safety review reads next to a booking that shouldn't have happened.
  await auditLog(caller.user.id, 'profile.birth_year_declared', caller.user.id, {
    birth_year: decision.patch.birth_year,
    age: decision.age,
    is_minor: decision.patch.is_minor,
    prior_is_minor: profile.is_minor ?? null,
    via: 'self_declaration',
  });

  const posture = agePosture(updated);
  return Response.json({
    ok: true,
    birthYear: updated.birth_year,
    posture,
    // What the caller still needs, if anything: a minor is un-gated by a
    // guardian clicking the emailed link, not by this route.
    guardianEmail: updated.guardian_email || null,
    guardianConsentAt: updated.guardian_consent_at || null,
  });
}
