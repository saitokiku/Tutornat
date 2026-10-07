// The club booking flow — source-assertion pins on the group route's quote
// discipline and the allowance lifecycle. These are the invariants that keep
// the money honest:
//   1. The quote is computed by groupSeatQuote BEFORE any Stripe call; routes
//      never do price math.
//   2. Free/included seats settle with NO Stripe object, and that branch
//      precedes the fail-closed !stripe check — community sessions and
//      membership visits must work on a deployment with no payment keys.
//   3. An included booking decrements the allowance SYNCHRONOUSLY and rolls
//      the seat back if the ledger write fails.
//   4. Every cancellation path restores the included visit to the BOOKER.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => fs.readFileSync(path.join(webRoot, p), 'utf8');

const route = src('app/api/tutoring/group/route.js');
const claim = route.slice(route.indexOf('async function claimSeat'), route.indexOf('async function hostRoom'));

test('the quote decides the price, and it is computed before any Stripe interaction', () => {
  assert.ok(/groupSeatQuote\(/.test(claim), 'the route must price through the shared quote function');
  assert.ok(claim.indexOf('groupSeatQuote') < claim.indexOf('getStripe()'),
    'quote first, Stripe later — free/included bookings must never need payment config');
  assert.ok(/unit_amount: quote\.amountCents/.test(claim),
    'the checkout must charge the quoted amount, never a locally derived price');
});

test('free/included seats book instantly and the fail-closed check comes after that branch', () => {
  assert.ok(/settlesFree/.test(claim));
  const freeBranch = claim.indexOf('if (settlesFree)');
  const failClosed = claim.indexOf('if (!stripe)');
  assert.ok(freeBranch > -1 && failClosed > -1 && freeBranch < failClosed,
    'the free/included branch must precede the !stripe refusal');
  const branch = claim.slice(freeBranch, failClosed);
  assert.ok(/paid: true/.test(branch), "a settled $0 seat is paid:true — 'settled, nothing owed'");
  assert.ok(!/checkout\.sessions\.create/.test(branch), 'no Stripe object may exist for a free/included seat');
});

test('an included booking spends the allowance synchronously and rolls back on failure', () => {
  const branch = claim.slice(claim.indexOf('if (settlesFree)'), claim.indexOf('if (!stripe)'));
  assert.ok(/await consumeAllowance\(/.test(branch), 'the decrement must be awaited, not fire-and-forget');
  assert.ok(/catch[\s\S]*status: 'cancelled'/.test(branch),
    'a failed ledger write must cancel the seat, not gift untracked inventory');
});

test('group booking meters its own key, not the shared handoff budget', () => {
  assert.ok(/checkEntitlement\(caller, 'group_seat'\)/.test(claim));
  assert.ok(!/checkEntitlement\(caller, 'handoff'\)/.test(claim),
    'a $0 community seat must not consume the same budget as a paid 1:1 escalation');
});

test('booking on behalf goes through resolveBookingStudent, and provenance is recorded', () => {
  assert.ok(/resolveBookingStudent\(svc, caller, body\?\.childId\)/.test(claim));
  assert.ok(/p_student: studentId/.test(claim), 'the RPC must claim for the RESOLVED student');
  assert.ok(/booked_by: caller\.user\.id/.test(claim), 'who actually booked must be recorded');
});

test('DELETE restores an included visit to the booker, inside the window', () => {
  const del = route.slice(route.indexOf('export async function DELETE'));
  assert.ok(/booked_via === 'included'/.test(del));
  assert.ok(/restoreAllowance\(/.test(del));
  assert.ok(/booked_by \|\| seat\.student_id/.test(del),
    'the restore goes to whoever was decremented — a parent booking spends the parent allowance');
});

test('every platform cancellation path shares one make-whole function', () => {
  const maintenance = src('lib/server/maintenance.js');
  assert.ok(/export async function refundHeldSeats/.test(maintenance));
  const fill = maintenance.slice(maintenance.indexOf('export async function resolveGroupFill'));
  assert.ok(/refundHeldSeats\(/.test(fill), 'min-fill cancellation uses the shared path');
  const adminClasses = src('app/api/admin/classes/route.js');
  assert.ok(/refundHeldSeats\(/.test(adminClasses), 'admin instance-cancel uses the shared path');
  assert.ok(/restoreAllowance\(/.test(maintenance.slice(
    maintenance.indexOf('export async function refundHeldSeats'),
    maintenance.indexOf('export async function resolveGroupFill'),
  )), 'the shared path returns included visits');
  const tutorSafety = src('lib/server/tutorSafety.js');
  assert.ok(/restoreAllowance\(/.test(tutorSafety), 'pulling a tutor also returns included visits');
});

test('reconcile verifies group seats too — ?dropin=paid never has to trust the redirect', () => {
  const billing = src('lib/server/billing.js');
  const rec = billing.slice(billing.indexOf('export async function reconcileUserBilling'));
  assert.ok(/fulfillGroupSeatCheckout\(/.test(rec));
  assert.ok(/booked_by\.eq\./.test(rec), 'a parent who paid for a child seat can reconcile it');
});

test('the club gate fails closed and the sessions/directory/group routes agree on it', () => {
  for (const file of [
    'app/api/tutoring/group/route.js',
    'app/api/tutoring/sessions/route.js',
  ]) {
    assert.ok(/club_enabled === true/.test(src(file)), `${file} must gate on club_enabled === true (fail closed)`);
  }
  assert.ok(/club_enabled !== true/.test(src('app/api/tutoring/directory/route.js')),
    'the public directory must not advertise tutors while selling is gated');
});

test('the stale-seat sweep verifies payment with Stripe before releasing', () => {
  const maintenance = src('lib/server/maintenance.js');
  const sweep = maintenance.slice(
    maintenance.indexOf('export async function releaseAbandonedSeats'),
    maintenance.indexOf('export async function cancelEmptyFreeRooms'),
  );
  assert.ok(/payment_status === 'paid'/.test(sweep), 'a slow webhook must never cost a paid student their seat');
  assert.ok(/fulfillGroupSeatCheckout/.test(sweep));
  assert.ok(/sessions\.expire/.test(sweep), 'the stale payment link must die with the hold');
});
