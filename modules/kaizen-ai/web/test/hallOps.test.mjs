// Homework Hall operations (launch plan v2 §3, migration 0026): the intake →
// help queue → exit summary loop. These are source-pinning tests in the same
// spirit as groupSessions.test.mjs — the routes are DB-bound, so what we pin
// is the contract: the enums, the authorization checks, and the invariants
// that make the queue safe. If a refactor drops one of these, the test names
// exactly what disappeared.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const roster = src('app/api/tutoring/group/roster/route.js');
const group = src('app/api/tutoring/group/route.js');
const sessions = src('app/api/tutoring/sessions/route.js');
const migration = fs.readFileSync(
  path.join(webRoot, '..', 'supabase', 'migrations', '0026_hall_operations.sql'), 'utf8');

// ── Migration 0026 ───────────────────────────────────────────────────────────

test('0026 adds intake, help_status (green/yellow/red, DB-checked), and exit to group_seat', () => {
  assert.match(migration, /add column if not exists intake jsonb/);
  assert.match(migration, /add column if not exists help_status text not null default 'green'/);
  assert.match(migration, /check \(help_status in \('green','yellow','red'\)\)/);
  assert.match(migration, /add column if not exists help_status_at timestamptz/);
  assert.match(migration, /add column if not exists exit jsonb/);
});

// ── Roster route: the help queue's contract ──────────────────────────────────

test('help statuses and recommendations are closed enums', () => {
  assert.match(roster, /HELP_STATUSES = \['green', 'yellow', 'red'\]/);
  assert.match(roster, /RECOMMENDATIONS = \['rebook', 'clinic', 'private'\]/);
  // The escalation ladder is enforced, not advisory.
  assert.match(roster, /recommendation must be rebook, clinic, or private/);
});

test('the queue sorts Red → Yellow → Green, oldest raise first', () => {
  assert.match(roster, /HELP_ORDER = \{ red: 0, yellow: 1, green: 2 \}/);
  assert.match(roster, /helpStatusAt \|\| 0/);
});

test('roster reads are tutor-of-room (or admin) only', () => {
  // GET must reject a caller who is neither the room's tutor nor an admin —
  // the roster contains student names and intake.
  assert.match(roster, /if \(!isTutor && !isAdminCaller\(caller\)\)/);
  assert.ok(roster.includes("Response.json({ error: 'Not your session.' }, { status: 403 })"));
});

test('a student can only flip their OWN seat, only while it could be live', () => {
  assert.match(roster, /seat\.student_id === caller\.user\.id \|\| seat\.booked_by === caller\.user\.id/);
  assert.ok(roster.includes("Response.json({ error: 'Not your seat.' }, { status: 403 })"));
  // The join-gate window: 15 minutes before start to 30 past end.
  assert.match(roster, /15 \* 60000/);
  assert.match(roster, /30 \* 60000/);
});

test('attendance only lands on held seats, with a closed enum', () => {
  assert.match(roster, /\['attended', 'no_show'\]\.includes\(attendance\)/);
  assert.match(roster, /HELD = \['booked', 'attended', 'no_show'\]/);
});

// ── Booking intake ───────────────────────────────────────────────────────────

test('the intake stored at booking is whitelisted to the four v2 fields', () => {
  assert.match(group, /\['subject', 'topic', 'stuck', 'goal'\]/);
  // Bounded — a 10MB "goal" never lands in the row.
  assert.match(group, /slice\(0, 300\)/);
});

// ── Checkout return paths ────────────────────────────────────────────────────

test('checkout return paths are an allowlist, never a caller-controlled URL', () => {
  // Group seats return to one of three local pages.
  assert.match(group, /\['\/dashboard', '\/schedule', '\/family'\]\.includes\(requestedReturn\)/);
  // 1:1 also allows the tutor profile that started the booking, slug-shaped only.
  assert.match(sessions, /\['\/dashboard', '\/family', '\/schedule'\]\.includes\(requestedReturn\)/);
  assert.match(sessions, /\^\\\/tutors\\\/\[a-z0-9-\]\{1,80\}\$/);
});

// ── The tutor workspace list ─────────────────────────────────────────────────

test('tutorView is gated on owning a tutor row and scoped to the tutor’s own rooms', () => {
  assert.match(group, /tutorView/);
  assert.ok(group.includes("Response.json({ error: 'Not a tutor account.' }, { status: 403 })"));
  assert.match(group, /\.eq\('tutor_id', tutorRow\.id\)/);
});
