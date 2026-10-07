// The seat cohort, end to end from the director's side (spec W1,
// docs/superpowers/specs/2026-09-02-wave1-product.md).
//
// Kaizen Local sells exactly one recurring product, and until 2026-09-02 the
// API that places a family in it refused to: createStandingSeatAction only
// accepted `homework_hall` series and gated on `club_hall_included`, an
// allowance the seat plan deliberately carries zero of (0033). A family paying
// for a standing seat could not be put in the cohort they were paying for.
//
// The fix is a mapping — room kind → the allowance that kind is metered on.
// It exists ONCE, exported from lib/server/series.js, and both routes that
// enrol somebody import it. That is deliberate: duplication that drifts would
// be worse than the bug it replaced (enrol on one allowance, spend another,
// and the parent's Thursday silently never books), so the tests below assert
// the mapping's own behaviour and then assert that no second copy has been
// declared anywhere.
//
// The rest is source-pinning in the spirit of hallOps.test.mjs: these routes
// are DB-bound, so what is pinned is the contract — the closed enums, the
// authorization checks, and the invariants that make a $550/month reserved
// room safe to run.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND_DEFAULTS, SEAT_PLAN, groupSeatQuote } from '@/lib/server/clubPricing.js';
import { STANDING_FEATURE } from '@/lib/server/series.js';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const series = src('lib/server/series.js');
const group = src('app/api/tutoring/group/route.js');
const classes = src('app/api/admin/classes/route.js');
const seats = src('app/api/admin/seats/route.js');
const adminPage = src('app/admin/page.js');

// ── The allowance mapping, as a value ────────────────────────────────────────
// Imported, not parsed. There used to be three copies of this map — one in the
// weekly sweep and one in each route that enrols somebody — and this test
// existed to prove the copies agreed. They now cannot disagree, because
// series.js exports the only one and the routes import it, so the test asserts
// the decision itself and then asserts that no second literal has crept back.

// The decision under test, in the shape every caller uses it: a lookup whose
// MISS means "this kind has no standing product", not "default to something".
const allowanceForKind = (map, kind) => map[kind] || null;

test('a standing booking draws the allowance its ROOM KIND is metered on', () => {
  // The seat plan's own allowance (0033: seat = 9/month, hall = 0). This one
  // line is the whole defect the console was built to fix: gate a seat room on
  // the hall allowance and every seat holder is refused at the front door.
  assert.equal(allowanceForKind(STANDING_FEATURE, 'standing_seat'), 'club_seat_included');
  // The retired memberships' allowance, still honoured for existing halls.
  assert.equal(allowanceForKind(STANDING_FEATURE, 'homework_hall'), 'club_hall_included');
  // Everything else has no standing product: a clinic and the free community
  // hall are booked one room at a time, and an unknown kind must fall through
  // to nothing rather than to somebody's inventory.
  for (const kind of ['clinic', 'community_free', 'private', '', 'undefined']) {
    assert.equal(allowanceForKind(STANDING_FEATURE, kind), null, kind || '(empty)');
  }
});

test('nobody has re-declared the mapping instead of importing it', () => {
  for (const [label, text] of [['tutoring/group', group], ['admin/seats', seats]]) {
    assert.doesNotMatch(
      text, /const STANDING_FEATURE\s*=\s*\{/,
      `${label} must import STANDING_FEATURE from lib/server/series.js, not restate it — `
      + 'a second copy is how the front door enrols a family on one allowance while the '
      + 'weekly sweep spends another.',
    );
    assert.match(text, /STANDING_FEATURE.*from '@\/lib\/server\/series'/);
  }
});

test('the mapping matches what clubPricing actually meters a seat room on', () => {
  // Not a restatement: this is the OTHER end of the same decision. The quote
  // engine hands the claim route a feature key; the standing path must spend
  // the same one, or a seat is booked against an allowance nobody decremented.
  const quote = groupSeatQuote({ plan: 'seat', kind: 'standing_seat', seatRemaining: 9 });
  assert.equal(quote.feature, STANDING_FEATURE.standing_seat);
});

// ── The blocking defect, in the route that had it ────────────────────────────

test('createStandingSeatAction no longer refuses everything but a Hall', () => {
  assert.ok(
    !group.includes("series.kind !== 'homework_hall'"),
    'the hall-only refusal is the W1 defect — the kind check is the STANDING_FEATURE lookup now',
  );
  assert.match(group, /const feature = STANDING_FEATURE\[series\.kind\];/);
  // And the entitlement read follows the mapping instead of a fixed key.
  assert.match(group, /\.eq\('feature', feature\)/);
  assert.ok(
    !group.includes(".eq('feature', 'club_hall_included')"),
    'the standing gate must not hard-code the Hall allowance',
  );
});

test('the guardian gate still stands in front of a standing booking', () => {
  // A seat is a recurring, in-person booking of a minor. The gate runs at the
  // front door AND on every sweep (series.js re-derives it), and neither the
  // kind fix nor the admin console may weaken it.
  assert.match(group, /if \(!body\?\.guardianConsent\)/);
  assert.match(group, /guardianGateSatisfied\(\{ studentProfile, relationship \}\)/);
  assert.match(group, /guardian_consent_required/);
  assert.match(series, /guardianGateSatisfied\(\{ studentProfile: student, relationship \}\)/);
});

// ── /api/admin/classes: laying out the cohort ────────────────────────────────

test('the catalog admits the seat kind', () => {
  assert.match(classes, /const KINDS = \['clinic', 'homework_hall', 'community_free', 'standing_seat'\]/);
  // The refusal message is generated from KINDS, so a future kind cannot ship
  // with a message that forgets to mention it.
  assert.match(classes, /Kind must be one of \$\{KINDS\.join\(', '\)\}/);
});

test('a seat room may never carry a price, on create or on edit', () => {
  // $0 on a seat room is a REFUSAL to sell (groupSeatQuote answers 'reserved'),
  // not a giveaway. A posted price there is a price nobody can pay — and the
  // one road to selling a reserved place as a drop-in.
  assert.equal(KIND_DEFAULTS.standing_seat.seatPriceCents, 0);
  assert.match(classes, /fields\.kind === 'standing_seat' && seatPrice !== 0/);
  assert.match(classes, /finalKind === 'standing_seat' && finalPrice !== 0/);
  const refusals = classes.match(/reserved for seat holders, not sold at the door/g) || [];
  assert.equal(refusals.length, 2, 'both the create and the edit path must refuse a priced seat room');
});

test('the seat cohort defaults to 75 minutes and holds the 1:4 ratio', () => {
  assert.equal(KIND_DEFAULTS.standing_seat.minutes, SEAT_PLAN.seat.minutes);
  assert.equal(KIND_DEFAULTS.standing_seat.capacity, SEAT_PLAN.seat.ratio);
  // The duration default follows the kind rather than the hour…
  assert.match(classes, /const kindDefault = KIND_DEFAULTS\[out\.kind\]\?\.minutes \?\? 60;/);
  assert.match(classes, /Number\(body\.durationMinutes \?\? kindDefault\)/);
  // …and 75 is inside the range the validator allows, so the seat's own length
  // is creatable without touching the bounds.
  assert.ok(SEAT_PLAN.seat.minutes >= 30 && SEAT_PLAN.seat.minutes <= 120);
  assert.match(classes, /Duration must be 30–120 minutes\./);
  // Capacity is capped at the ratio on both paths, the way community capacity is.
  assert.match(classes, /if \(fields\.kind === 'standing_seat'\) capacity = Math\.min\(capacity, defaults\.capacity\);/);
  assert.match(classes, /KIND_DEFAULTS\.standing_seat\.capacity\)/);
});

test('venue is accepted, trimmed, and persisted on the series', () => {
  // 0033 put `venue` on group_session_series and group_session; NULL = online.
  // Without this the in-person product has nowhere to say where it happens.
  assert.match(classes, /if \(body\.venue !== undefined\) \{/);
  assert.match(classes, /out\.venue = String\(body\.venue \|\| ''\)\.trim\(\)\.slice\(0, 200\) \|\| null;/);
  // validateSeriesPatch's output is spread straight into the insert and used
  // as the update patch, so landing in `out` IS being persisted — on create…
  assert.match(classes, /\.insert\(\{\s*\n\s*\.\.\.fields,/);
  // …and on edit.
  assert.match(classes, /\.update\(patch\)\.eq\('id', id\)/);
  const migration = fs.readFileSync(
    path.join(webRoot, '..', 'supabase', 'migrations', '0033_standing_seat.sql'), 'utf8');
  assert.match(migration, /alter table group_session_series add column if not exists venue text;/);
});

test('an un-applied migration is answered honestly, never as a generic failure', () => {
  assert.match(classes, /import \{ isMissingSchema \} from '@\/lib\/engine\/ledger'/);
  assert.match(classes, /if \(isMissingSchema\(insErr\)\)/);
  assert.match(classes, /migration 0033/);
});

// ── /api/admin/seats: the director enrolling a family ────────────────────────

test('the seat console is admin-only, service-role, and audited on every write', () => {
  assert.match(seats, /export const runtime = 'nodejs';/);
  assert.match(seats, /export const dynamic = 'force-dynamic';/);
  assert.match(seats, /if \(!isAdminCaller\(caller\)\) return \{ error: Response\.json\(\{ error: 'Admin only\.' \}, \{ status: 403 \}\) \};/);
  assert.match(seats, /const svc = serviceClient\(\);/);
  assert.match(seats, /Supabase not configured\./);
  assert.match(seats, /auditLog\(caller\.user\.id, 'seats\.enrolled'/);
  assert.match(seats, /auditLog\(caller\.user\.id, 'seats\.ended'/);
});

test('enrolling writes the same row the family-facing action writes', () => {
  // One shape, one unique key (0029: unique (series_id, student_id)) — so the
  // director enrolling a family that already enrolled itself re-activates the
  // row instead of colliding.
  const shape = /\{ series_id: [\w.]+, user_id: [\w.]+, student_id: [\w.]+, active: true, ended_at: null \}/;
  assert.match(group, shape, 'the family path writes this shape');
  assert.match(seats, shape, 'the admin path must write the same shape');
  assert.match(seats, /onConflict: 'series_id,student_id'/);
  assert.match(group, /onConflict: 'series_id,student_id'/);
  // And it books this month's rooms immediately, like the family path does.
  assert.match(seats, /bookStandingSeats\(svc, \{ standingId: row\?\.id \}\)/);
});

test('the console refuses a cohort that is not a seat cohort, or is paused, or is full', () => {
  assert.match(seats, /if \(series\.kind !== SEAT_KIND\)/);
  assert.match(seats, /if \(!series\.active\)/);
  assert.match(seats, /\(existing \|\| \[\]\)\.length >= roomCapacity/);
  // Refusals a person reads, not a stack trace: each names the cohort and the
  // next action. (The director is at a table with the parent.)
  for (const phrase of ['Resume it in Classes first.', 'End an enrolment, or open another cohort.']) {
    assert.ok(seats.includes(phrase), `missing readable refusal: ${phrase}`);
  }
});

test('enrolment is a record, never a booking or a consent', () => {
  // The admin route must not book a seat itself: bookStandingSeats is the only
  // path into group_seat, and it re-checks the guardian gate and the allowance
  // on every run. An admin console that wrote seats directly would be a way to
  // put a minor in a live room with nobody's approval.
  assert.ok(!seats.includes("from('group_seat')"), 'the seat console must never write a seat row directly');
  assert.ok(!seats.includes('claim_group_seat'), 'the seat console must never claim a seat directly');
  assert.ok(!seats.includes('guardian_consent_at:'), 'the seat console must never stamp consent');
  // It reports the two things that will silently stop the booking instead.
  assert.match(seats, /guardianGateSatisfied\(\{ studentProfile: student, relationship \}\)/);
  assert.match(seats, /payerOnSeatPlan/);
  assert.match(seats, /includes no seat sessions/);
});

test('ending an enrolment deactivates it and leaves booked weeks alone', () => {
  // 0029 deactivates rather than deletes so "why did my Thursday stop" stays
  // answerable, and rooms already on the calendar are staffed commitments.
  assert.match(seats, /\.update\(\{ active: false, ended_at: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(seats, /\.eq\('id', standingId\)\.eq\('active', true\)/);
  assert.ok(seats.includes('Sessions already on the calendar stay booked'));
});

// ── The console screen ───────────────────────────────────────────────────────

test('the classes grid offers the seat kind, a venue, and no price for a seat', () => {
  assert.match(adminPage, /\{ id: 'standing_seat', label: 'Standing seat \(reserved\)' \}/);
  assert.match(adminPage, /venue: ''/);
  assert.match(adminPage, /value=\{form\.venue\} onChange=\{set\('venue'\)\}/);
  // The duration picker carries the seat's length from clubPricing, not typed.
  assert.match(adminPage, /const DURATIONS = \[45, 60, KIND_DEFAULTS\.standing_seat\.minutes, 90\];/);
  assert.match(adminPage, /durationMinutes: KIND_DEFAULTS\[e\.target\.value\]\?\.minutes \?\? 60,/);
  // There is no seat-price input anywhere in the console today, which is how a
  // seat room stays unpriceable from this screen. If one is ever added, it must
  // be hidden for standing_seat — that is what this assertion is guarding.
  assert.ok(
    !adminPage.includes('seatPriceCents'),
    'a price input reached the admin console: exclude it for standing_seat rooms (reserved inventory has no price)',
  );
  // A $0 seat room is reserved, not free, and the row must not say "free".
  assert.match(adminPage, /s\.kind === 'standing_seat' \? ' reserved'/);
});

// ── The gate that does not bend for a director ───────────────────────────────

test('the seat console fails closed on the club master switch', () => {
  // Hard Rule 4: club_enabled gates BOOKING until counsel clears REVIEW_QUEUE
  // 10-15, and an enrolment row is booked into live rooms by the ungated hourly
  // cron — so writing one while selling is shut puts a minor in a room the gate
  // exists to hold back. Being an admin is not a way around a legal gate.
  assert.match(seats, /import \{[^}]*getSettings[^}]*\} from '@\/lib\/server\/context'/);
  assert.match(seats, /settings\.club_enabled === true/, 'the switch must be read as explicitly true');
  // Read the POST body only, so a gate that drifted onto GET (or off POST
  // entirely) fails here rather than in production.
  const post = seats.slice(seats.indexOf('export async function POST'), seats.indexOf('export async function DELETE'));
  assert.match(post, /if \(!await clubOpen\(\)\)/, 'POST must refuse to enrol while selling is closed');
  assert.match(post, /code: 'notYetOpen'/);
  assert.match(post, /status: 503/);
  // The refusal comes BEFORE any write — the enrol call sequence in POST must
  // start with the gate, not with the upsert.
  assert.ok(
    post.indexOf('clubOpen()') < post.indexOf("from('standing_seats')"),
    'the club gate must be checked before the enrolment row is written',
  );
  // Reading the roster and ending an enrolment sell nothing, so neither is
  // gated: a closed club must not trap a family in a cohort.
  const del = seats.slice(seats.indexOf('export async function DELETE'));
  assert.ok(!del.includes('clubOpen()'), 'ending an enrolment must stay available while selling is closed');
});

// ── The console the director actually uses ───────────────────────────────────

test('the admin page drives /api/admin/seats — list, enrol, end', () => {
  // A route nothing fetches is not a console. The headline outcome of W1 is a
  // director putting a paying family in a cohort, and this is the screen that
  // does it.
  assert.match(adminPage, /function SeatsSection\(\)/);
  assert.match(adminPage, /<SeatsSection \/>/, 'the panel must be mounted on the page');
  assert.match(adminPage, /authedFetch\('\/api\/admin\/seats'\)/, 'the cohort list');
  assert.match(adminPage, /method: 'POST'[\s\S]{0,200}seriesId: cohort\.id/, 'the enrol call');
  assert.match(adminPage, /method: 'DELETE'[\s\S]{0,200}standingId: holder\.standingId/, 'the end-enrolment call');
});

test('the console asks for emails, never UUIDs', () => {
  // The director is at a table with a parent; the only identifier either of
  // them can read is the address on the parent's screen.
  assert.match(adminPage, /placeholder="Payer’s email \(holds the seat plan\)"/);
  assert.match(adminPage, /placeholder="Student’s email"/);
  assert.match(adminPage, /payer: form\.payer\.trim\(\), student: form\.student\.trim\(\)/);
  // And the route resolves them the way every other admin lookup does.
  assert.match(seats, /\.ilike\('email', rawEmail\)\.maybeSingle\(\)/);
  assert.match(seats, /id: body\?\.payerId, email: body\?\.payer/);
  assert.match(seats, /id: body\?\.studentId, email: body\?\.student/);
});

test('the console shows the two flags that decide whether anything books', () => {
  // payerOnSeatPlan and guardianApproved are the only two ways an enrolment can
  // look finished and book nothing — the sweep skips such a family in silence.
  assert.match(seats, /guardianApproved: guardianOk\[h\.id\] === true/);
  assert.match(seats, /bookingRelationship\(svc, h\.user_id, h\.student_id\)/);
  assert.match(adminPage, /h\.payerOnSeatPlan \? 'seat plan' : 'no seat plan'/);
  assert.match(adminPage, /h\.guardianApproved \? 'guardian ok' : 'no guardian approval'/);
  // Plus the cohort facts a director needs before enrolling anyone into it.
  for (const field of ['c.seatsTaken', 'c.capacity', 'c.venue', 'c.staffed']) {
    assert.ok(adminPage.includes(field), `the cohort card must show ${field}`);
  }
});

test('ending a place says plainly that the money keeps running', () => {
  // The seat plan is a Stripe subscription this route cannot touch. A director
  // who ends the weekly place and assumes the billing stopped costs a departing
  // family another month.
  assert.match(adminPage, /does NOT cancel the seat plan/);
});

// ── Reserved inventory stays reserved ────────────────────────────────────────

test('a signed-in browse never lists a seat room', () => {
  // The seriesId a standing booking is made against is the key to a
  // $550-a-month cohort. lib/server/publicSchedule.js has always withheld it
  // from the signed-out board; the signed-in browse handed it out.
  const publicBoard = src('lib/server/publicSchedule.js');
  assert.match(publicBoard, /\.neq\('kind', 'standing_seat'\)/);
  assert.match(group, /\.neq\('kind', 'standing_seat'\)/,
    'the signed-in browse must exclude reserved rooms exactly as the public board does');
});

test('a full cohort refuses a fifth standing booking at BOTH doors', () => {
  // Without this the row is written, the family is told "that's your standing
  // seat now", and claim_group_seat later drops whoever the weekly sweep
  // reaches last. Same guard, same fallback, both doors.
  for (const [label, text] of [['tutoring/group', group], ['admin/seats', seats]]) {
    assert.match(text, /\.eq\('series_id', seriesId\)\.eq\('active', true\)/, label);
    assert.match(text, /alreadyIn/, `${label}: re-activating an existing row is not taking a new place`);
    assert.match(text, /Number\(series\.capacity\)/, label);
    assert.match(text, /KIND_DEFAULTS(\[series\.kind\]\?)?\.(standing_seat\.)?capacity/, label);
    assert.match(text, /is full at \$\{roomCapacity\} students/, `${label}: the refusal must name the number`);
  }
  // 1:4 is the product, so the fallback for a capacity-less legacy row is the
  // ratio the price sheet states — never zero (which would refuse everyone).
  assert.equal(KIND_DEFAULTS.standing_seat.capacity, SEAT_PLAN.seat.ratio);
});

// ── Prices are never typed, not even into a picker label ─────────────────────

test('the kind picker interpolates its prices from clubPricing', () => {
  // Hard Rule 2. These two labels were hand-typed until 2026-09-02, and the day
  // RETAIL.clinicSeatCents moved the picker started quoting a price the
  // checkout would not honour. priceTruth.test.mjs catches the general class;
  // this pins the specific surface so it cannot come back as "just a label".
  assert.match(adminPage, /label: `Subject Clinic \(\$\{dollars\(RETAIL\.clinicSeatCents\)\}\)`/);
  assert.match(adminPage, /label: `Homework Hall \(\$\{dollars\(RETAIL\.hallSeatCents\)\}\)`/);
  assert.match(adminPage, /import \{[^}]*RETAIL[^}]*\} from '@\/lib\/server\/clubPricing'/);
  // Nothing in the picker — labels or the comment above it — nor in the classes
  // route's header may carry a typed figure. "$0" is exempt everywhere here: on
  // a reserved room it is the REFUSAL to sell, not a price, and there is no
  // clubPricing figure it could drift away from. priceTruth.test.mjs polices
  // both files as a whole; this pins the two spots that actually drifted.
  const typedPrices = (text) => [...text.matchAll(/\$\d[\d,]*(?:\.\d+)?/g)]
    .map((m) => m[0]).filter((f) => f !== '$0');
  const picker = adminPage.slice(
    adminPage.lastIndexOf('//', adminPage.indexOf('const KIND_OPTIONS = [')),
    adminPage.indexOf('const DURATIONS'),
  );
  assert.deepEqual(typedPrices(picker), [],
    `the kind picker must interpolate, not type: ${typedPrices(picker).join(', ')}`);
  const header = classes.slice(0, classes.indexOf('import '));
  assert.deepEqual(typedPrices(header), [],
    `the classes route header must not quote a price: ${typedPrices(header).join(', ')}`);
});
