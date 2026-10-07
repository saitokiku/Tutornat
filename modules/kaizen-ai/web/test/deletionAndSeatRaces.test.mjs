// The 2026-08-18 audit's three race/cascade defects, pinned at the source.
//
// All three are shapes rather than values — "refuse before you destroy",
// "claim before you refund", "transition on the status you read" — so they are
// asserted against the route text the way the safety gates in
// groupSessions.test.mjs are. A unit test with a fake Supabase client would
// pass against the broken ordering too; the ordering IS the fix.
//
// The database half lives in supabase/migrations/0031_audit_hardening.sql and
// is asserted here as well, because a route that relies on RESTRICT or on a
// unique index is only correct while those exist.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');
const sql0031 = fs.readFileSync(path.join(webRoot, '..', 'supabase/migrations/0031_audit_hardening.sql'), 'utf8');

// ── C1: deleting an account must not delete other people's money ────────────

test('the cascade is stopped at the database, not merely in the route', () => {
  assert.ok(/alter table tutors add constraint tutors_user_id_fkey[\s\S]*?on delete restrict/i.test(sql0031),
    'a tutor deleting their own account must not be able to erase the rooms they taught');
  assert.ok(/alter table group_session add constraint group_session_tutor_id_fkey[\s\S]*?on delete restrict/i.test(sql0031),
    'nor the seats other families hold in them');
});

test('account deletion refuses BEFORE anything irreversible happens', () => {
  const route = src('app/api/account/delete/route.js');
  // Scoped to POST: purgeStorage is DEFINED above it, so a whole-file indexOf
  // would compare against the wrong occurrence and pass for free.
  const post = route.slice(route.indexOf('export async function POST'));
  const guard = post.indexOf('await hasSharedRecords(svc, userId)');
  assert.ok(guard > 0, 'the shared-records check must exist');
  assert.ok(guard < post.indexOf('await purgeStorage(svc, userId)'),
    'the storage purge cannot run for a deletion we are going to refuse');
  assert.ok(guard < post.indexOf('subscriptions.cancel'),
    'and neither can the Stripe cancel — a refused deletion must leave the account whole');
  assert.ok(guard < post.indexOf('auth.admin.deleteUser'));
});

test('the refusal names both shapes: any tutor account, and settled money', () => {
  const route = src('app/api/account/delete/route.js');
  const fn = route.slice(route.indexOf('async function hasSharedRecords'), route.indexOf('function isForeignKeyRefusal'));

  // ANY tutor row refuses, not just one with sessions or earnings. 0031 made
  // tutors.user_id ON DELETE RESTRICT, so a never-activated applicant is
  // undeletable too — and counting their work first let exactly that account
  // through the guard into the destructive half (storage purged, subscription
  // cancelled) before hitting the FK wall. Checking the tutor row alone is
  // strictly stronger than enumerating the tables that hang off it.
  assert.ok(/from\('tutors'\)[\s\S]{0,200}?if \(tutor\?\.id\) return true;/.test(fn),
    'a tutor account is refused on existence alone, before anything destructive runs');

  // The payer side still has to be enumerated: a student is deletable in
  // principle, so only settled money stops it.
  for (const table of ['group_seat', 'tutoring_sessions']) {
    assert.ok(fn.includes(`from('${table}')`), `${table} must be checked before deletion`);
  }
  assert.ok(/booked_by\.eq\./.test(fn),
    'a parent who paid for a child’s seat owns that payment record too');
  assert.ok(/if \(r\.error\) throw r\.error/.test(fn),
    'a failed count must never read as "nothing found" — that is how the data loss happened');
});

test('a foreign-key refusal becomes the same human message, not a 500', () => {
  const route = src('app/api/account/delete/route.js');
  assert.ok(/23503/.test(route), 'the raw FK code');
  assert.ok(/database error deleting user/i.test(route), 'and GoTrue’s opaque wrapper for it');
  assert.equal((route.match(/OFFBOARD_MESSAGE, needsOffboarding: true \}, \{ status: 409 \}/g) || []).length, 3,
    'pre-check, deleteUser error, and the catch must all answer identically');
});

// ── H1: a seat cancel is a claim, not an announcement ───────────────────────

test('an attended seat cannot be cancelled by the student', () => {
  const route = src('app/api/tutoring/group/route.js');
  assert.ok(/const CANCELLABLE_SEAT = \['pending_payment', 'booked'\]/.test(route),
    'attended is deliberately absent — cancelling it zeroes the tutor’s flat-hourly pay');
  const del = route.slice(route.indexOf('export async function DELETE'));
  assert.ok(/!CANCELLABLE_SEAT\.includes\(seat\.status\)[\s\S]*?status: 409/.test(del),
    'a session that already ran is refused, not silently rewritten');
});

test('the seat is claimed atomically before any refund or allowance restore', () => {
  const route = src('app/api/tutoring/group/route.js');
  const del = route.slice(route.indexOf('export async function DELETE'));
  const claim = del.indexOf(".update({ status: 'cancelled' })");
  assert.ok(claim > 0);
  assert.ok(/\.eq\('id', seatId\)\.eq\('status', seat\.status\)\.in\('status', CANCELLABLE_SEAT\)/.test(del),
    'gated on the status we read AND on the releasable set — the same lock releaseUnconfirmedSeats uses');
  assert.ok(/if \(!claimed\)[\s\S]*?status: 409/.test(del), 'losing the race is a 409, not a second refund');
  assert.ok(claim < del.indexOf('refunds.create'), 'refund only after the claim');
  assert.ok(claim < del.indexOf('restoreAllowance'),
    'two parallel cancels restoring the same included visit is how free Hall visits were minted');
});

// ── H2: completing a 1:1 pays the tutor once ────────────────────────────────

test('one earnings row per 1:1 session is enforced by the database', () => {
  assert.ok(/create unique index if not exists tutor_earnings_session_idx[\s\S]*?on tutor_earnings \(tutoring_session_id\)/i.test(sql0031),
    'the 1:1 mirror of 0017’s group_session_id index');
});

test('the 1:1 status transition is a conditional claim, and a lost earnings race is a no-op', () => {
  const route = src('app/api/tutoring/sessions/route.js');
  const patch = route.slice(route.indexOf('export async function PATCH'));
  const claim = patch.indexOf(".update({ status })");
  assert.ok(claim > 0);
  assert.ok(/\.eq\('id', id\)\.eq\('status', session\.status\)/.test(patch),
    'canTransition read a status a double-click may already have moved on from');
  assert.ok(/if \(!moved\)[\s\S]*?status: 409/.test(patch));
  assert.ok(claim < patch.indexOf('refunds.create'), 'refund after the claim, so it happens once');
  assert.ok(claim < patch.indexOf("from('tutor_earnings').insert"), 'and so does the accrual');
  assert.ok(/earnErr\.code !== '23505'/.test(patch),
    'the unique violation means the tutor is already paid — that is success, not a 500');
});
