// Parent-managed teen accounts (0022 managed_by / 0025 created_via) — the
// club's parent-first funnel. Two kinds of pins:
//   1. Unit tests of the pure/mockable helpers in lib/server/family.js —
//      resolveBookingStudent is the authorization boundary for booking on a
//      child's behalf, so its refusal paths get direct coverage.
//   2. Source assertions on the routes (repo style, see authz.test.mjs):
//      the consent checkbox, the 13+ floor, and the on-behalf provenance are
//      load-bearing legal/safety records — a refactor that drops one should
//      fail CI, not a code review.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBookingStudent, guardianGateSatisfied, MAX_MANAGED_CHILDREN } from '@/lib/server/family.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

// ── A tiny PostgREST-shaped stub ─────────────────────────────────────────────
// Just enough of the supabase-js chain for resolveBookingStudent: from()
// .select().eq()...maybeSingle(). Handlers are keyed by table name and receive
// the collected eq() filters.
function stubSvc(handlers) {
  return {
    from(table) {
      const filters = {};
      const chain = {
        select() { return chain; },
        eq(col, val) { filters[col] = val; return chain; },
        async maybeSingle() {
          const data = handlers[table] ? await handlers[table](filters) : null;
          return { data, error: null };
        },
      };
      return chain;
    },
  };
}

const CALLER = { user: { id: 'parent-1', email: 'parent@example.com' } };
const THIS_YEAR = new Date().getFullYear();
const ADULT_YEAR = THIS_YEAR - 40;
const TEEN_YEAR = THIS_YEAR - 15;

test('no childId (or the caller’s own id) books for the caller — the pre-club path unchanged', async () => {
  const svc = stubSvc({});
  for (const childId of [undefined, null, '', 'parent-1']) {
    const r = await resolveBookingStudent(svc, CALLER, childId);
    assert.deepEqual(r, { studentId: 'parent-1', onBehalf: false, relationship: 'self' });
  }
});

test('a managed child (profiles.managed_by) resolves on-behalf', async () => {
  const svc = stubSvc({
    profiles: async (f) => (f.id === 'kid-1' ? { id: 'kid-1', managed_by: 'parent-1' } : null),
  });
  const r = await resolveBookingStudent(svc, CALLER, 'kid-1');
  assert.deepEqual(r, { studentId: 'kid-1', onBehalf: true, relationship: 'managed' });
});

test('an active parent link resolves on-behalf; pending/absent links refuse with 403', async () => {
  const links = { 'teen-linked': 'active' };
  const svc = stubSvc({
    profiles: async () => null, // not managed
    parent_student_relationships: async (f) => (
      links[f.student_id] === 'active' && f.parent_id === 'parent-1' && f.status === 'active'
        ? { id: 'link-1' } : null
    ),
  });
  const ok = await resolveBookingStudent(svc, CALLER, 'teen-linked');
  assert.deepEqual(ok, { studentId: 'teen-linked', onBehalf: true, relationship: 'invite' });

  const refused = await resolveBookingStudent(svc, CALLER, 'stranger-teen');
  assert.ok(refused.error, 'booking for an unlinked student must refuse');
  assert.equal(refused.error.status, 403);
});

test('a child managed by SOMEONE ELSE refuses — managed_by is the authority, not the request', async () => {
  const svc = stubSvc({
    profiles: async (f) => (f.id === 'kid-2' ? { id: 'kid-2', managed_by: 'other-parent' } : null),
    parent_student_relationships: async () => null,
  });
  const r = await resolveBookingStudent(svc, CALLER, 'kid-2');
  assert.ok(r.error);
  assert.equal(r.error.status, 403);
});

// The full gate matrix lives in test/guardianGate.test.mjs; this is the
// smoke check that the two helpers still compose the way the routes use them.
test('guardianGateSatisfied: verified adults pass; consented minors pass; unconsented minors need the MANAGING parent', () => {
  const adult = { birth_year: ADULT_YEAR, is_minor: false };
  const teen = { birth_year: TEEN_YEAR, is_minor: true, guardian_consent_at: null };
  assert.ok(guardianGateSatisfied({ studentProfile: adult, relationship: 'self' }));
  assert.ok(guardianGateSatisfied({ studentProfile: { ...teen, guardian_consent_at: '2026-01-01' }, relationship: 'self' }));
  assert.ok(guardianGateSatisfied({ studentProfile: teen, relationship: 'managed' }),
    'the managing parent booking IS the guardian approving');
  assert.ok(!guardianGateSatisfied({ studentProfile: teen, relationship: 'invite' }),
    'an invite link is created and accepted by the students themselves — not consent');
  assert.ok(!guardianGateSatisfied({ studentProfile: teen, relationship: 'self' }),
    'a self-booking unconsented minor must stay blocked');
});

// ── Source assertions on the children route ──────────────────────────────────

test('creating a child requires the explicit consent checkbox, recorded at creation', () => {
  const src = read('app/api/family/children/route.js');
  assert.match(src, /consent\s*!==\s*true/, 'consent must be strictly required');
  assert.match(src, /consent_required/, 'the refusal must be machine-readable');
  assert.match(src, /guardian_consent_at:\s*nowIso/, 'consent timestamp must be recorded on the profile');
  assert.match(src, /family\.child_created/, 'creation must be audit-logged');
});

test('the 13+ launch floor is enforced server-side, matching the signup age gate', () => {
  const src = read('app/api/family/children/route.js');
  assert.match(src, /under_13_unsupported/, 'under-13 creation must refuse with a distinct code');
  assert.match(src, /thisYear - birthYear < 13/, 'the floor must be computed from birth year, not trusted from the client');
});

test('child auth users are created confirmed, opted out of email, and rolled back on failure', () => {
  const src = read('app/api/family/children/route.js');
  assert.match(src, /email_confirm:\s*true/);
  assert.match(src, /email_opt_out:\s*true/);
  assert.match(src, /admin\.deleteUser/, 'a failed profile insert must not strand a half-created auth user');
});

test('only a verified-adult creator can mint a managed child, and the posture is logged with the consent', () => {
  const src = read('app/api/family/children/route.js');
  assert.match(src, /agePosture\(caller\.profile\)/, 'the creator’s own age posture must be checked');
  assert.match(src, /creator_not_adult/, 'the refusal must be machine-readable');
  assert.match(src, /creator_age_posture/, 'the consent record must carry who consented and what we knew about them');
  assert.ok(
    src.indexOf('creatorPosture !== ') < src.indexOf('auth.admin.createUser'),
    'the creator check must run before any account is minted'
  );
});

test('the first managed child promotes the caller to the parent role — and never demotes staff', () => {
  const src = read('app/api/family/children/route.js');
  assert.match(src, /role:\s*'parent'/);
  assert.match(src, /\.eq\('role',\s*'student'\)/, 'promotion must only apply to plain student accounts');
});

test('MAX_MANAGED_CHILDREN is a small human number', () => {
  assert.ok(MAX_MANAGED_CHILDREN >= 2 && MAX_MANAGED_CHILDREN <= 10);
});

// ── Source assertions on the booking route ──────────────────────────────────

test('1:1 booking runs the shared guardian gate, not an inlined copy of it', () => {
  const src = read('app/api/tutoring/sessions/route.js');
  assert.match(src, /guardianGateSatisfied\(\{ studentProfile, relationship \}\)/,
    'the 1:1 path must use lib/server/family.js — its inline copy accepted any on-behalf booking');
  assert.match(src, /select\('id,email,birth_year,is_minor,guardian_consent_at'\)/,
    'birth_year must be selected or every profile reads as unverified age');
  assert.match(src, /guardian_consent_required/);
});

test('1:1 booking resolves the student through resolveBookingStudent before any write', () => {
  const src = read('app/api/tutoring/sessions/route.js');
  assert.match(src, /resolveBookingStudent\(svc,\s*caller,\s*body\?\.childId\)/);
  assert.match(src, /student_id:\s*studentId/, 'the insert must use the RESOLVED student, never the raw request');
  assert.match(src, /booked_by:\s*caller\.user\.id/, 'on-behalf provenance must be recorded');
  // The resolution must happen before the slot claim (writes start there).
  assert.ok(
    src.indexOf('resolveBookingStudent') < src.indexOf(".update({ status: 'booked' })"),
    'student resolution must precede the slot claim'
  );
});

test('intro-free is keyed to the student receiving the session, not the payer', () => {
  const src = read('app/api/tutoring/sessions/route.js');
  assert.match(src, /introAvailable\(svc,\s*studentEmail\)/);
  assert.match(src, /recordIntroRedemption\(svc,\s*studentEmail\)/);
});
