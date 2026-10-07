// Occupancy mechanics (0029) — the pure rules behind the storefront sort, the
// confirm-or-release sweep, the waitlist batch picker, and the community
// supervision cap. These are the mechanisms of "occupancy discipline by
// default"; if one drifts, rooms spread thin or someone's seat is released
// when it shouldn't be — so every rule is pinned here.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKeyInZone, herdingCompare, emptiestCompare,
  shouldReleaseSeat, confirmedAtBooking, pickWaitlistBatch,
  CONFIRM_LEAD_MS, RELEASE_LEAD_MS,
} from '@/lib/server/occupancy.js';
import { communityCapacity, STUDENTS_PER_STAFF, KIND_DEFAULTS } from '@/lib/server/clubPricing.js';
import { sessionIcs } from '@/lib/server/ics.js';

const CT = 'America/Chicago';
const room = (start, seatsLeft, tz = CT) => ({ start, seatsLeft, timezone: tz });

// ── Day bucketing ────────────────────────────────────────────────────────────

test('dayKeyInZone buckets by the FAMILY’s local day, not UTC', () => {
  // 01:30 UTC on the 14th is still the evening of the 13th in Austin.
  assert.equal(dayKeyInZone('2026-08-14T01:30:00Z', CT), '2026-08-13');
  assert.equal(dayKeyInZone('2026-08-14T14:00:00Z', CT), '2026-08-14');
});

// ── Herding sort (fullest-first within a day) ────────────────────────────────

test('herding: days stay chronological, fullest room leads within a day', () => {
  const emptier = room('2026-08-13T21:00:00Z', 6);
  const fuller = room('2026-08-13T23:00:00Z', 1);
  const nextDay = room('2026-08-14T21:00:00Z', 0);
  const sorted = [emptier, nextDay, fuller].sort(herdingCompare);
  assert.deepEqual(sorted, [fuller, emptier, nextDay]);
});

test('herding: full rooms stay visible but sort AFTER bookable ones that day', () => {
  const full = room('2026-08-13T21:00:00Z', 0);
  const open = room('2026-08-13T23:00:00Z', 3);
  assert.deepEqual([full, open].sort(herdingCompare), [open, full]);
});

test('herding: equal fill falls back to start time', () => {
  const later = room('2026-08-13T23:00:00Z', 2);
  const earlier = room('2026-08-13T21:00:00Z', 2);
  assert.deepEqual([later, earlier].sort(herdingCompare), [earlier, later]);
});

test('emptiest-first is the rebooking order', () => {
  const a = room('2026-08-13T21:00:00Z', 1);
  const b = room('2026-08-13T22:00:00Z', 7);
  assert.deepEqual([a, b].sort(emptiestCompare), [b, a]);
});

// ── Confirm-or-release ───────────────────────────────────────────────────────

const NOW = Date.parse('2026-08-13T12:00:00Z');
const in2h = new Date(NOW + 2 * 3600 * 1000).toISOString();
const in6h = new Date(NOW + 6 * 3600 * 1000).toISOString();
const releasable = {
  status: 'booked', booked_via: 'included', confirmed_at: null,
  reminder_sent_at: new Date(NOW - 20 * 3600 * 1000).toISOString(),
};

test('release: unconfirmed, reminded, included seat inside T-4h releases', () => {
  assert.equal(shouldReleaseSeat({ seat: releasable, room: { scheduled_start: in2h }, now: NOW }), true);
});

test('release: outside the window, nothing happens yet', () => {
  assert.equal(shouldReleaseSeat({ seat: releasable, room: { scheduled_start: in6h }, now: NOW }), false);
});

test('release: a confirmed seat is never released', () => {
  const seat = { ...releasable, confirmed_at: new Date(NOW - 3600_000).toISOString() };
  assert.equal(shouldReleaseSeat({ seat, room: { scheduled_start: in2h }, now: NOW }), false);
});

test('release: paid and free seats are structurally exempt', () => {
  for (const booked_via of ['stripe', 'free', null, undefined]) {
    const seat = { ...releasable, booked_via };
    assert.equal(shouldReleaseSeat({ seat, room: { scheduled_start: in2h }, now: NOW }), false,
      `booked_via=${booked_via} must never auto-release`);
  }
});

test('release: never without a reminder having been sent (no silent releases)', () => {
  const seat = { ...releasable, reminder_sent_at: null };
  assert.equal(shouldReleaseSeat({ seat, room: { scheduled_start: in2h }, now: NOW }), false);
});

test('release: a room already started is left alone', () => {
  const started = new Date(NOW - 60_000).toISOString();
  assert.equal(shouldReleaseSeat({ seat: releasable, room: { scheduled_start: started }, now: NOW }), false);
});

test('booking inside 24h auto-confirms; earlier bookings must confirm later', () => {
  assert.equal(confirmedAtBooking({ scheduledStart: in6h, now: NOW }), true);
  const in3d = new Date(NOW + 3 * 24 * 3600 * 1000).toISOString();
  assert.equal(confirmedAtBooking({ scheduledStart: in3d, now: NOW }), false);
  assert.ok(RELEASE_LEAD_MS < CONFIRM_LEAD_MS, 'the ask must come before the consequence');
});

// ── Waitlist batch ───────────────────────────────────────────────────────────

test('waitlist: oldest waiting rows get the seats, one per open seat', () => {
  const rows = [
    { id: 'b', created_at: '2026-08-12T10:00:00Z' },
    { id: 'a', created_at: '2026-08-11T10:00:00Z' },
    { id: 'c', created_at: '2026-08-13T10:00:00Z' },
  ];
  assert.deepEqual(pickWaitlistBatch(rows, 2).map((r) => r.id), ['a', 'b']);
  assert.deepEqual(pickWaitlistBatch(rows, 0), []);
  assert.deepEqual(pickWaitlistBatch([], 3), []);
});

// ── Community supervision cap ────────────────────────────────────────────────

test('community capacity derives from staffing: 8 per cleared staff member', () => {
  assert.equal(STUDENTS_PER_STAFF, 8);
  assert.equal(KIND_DEFAULTS.community_free.capacity, 16, 'default assumes two staff, not 30:1');
  assert.equal(communityCapacity(1), 8, 'one tutor alone caps at 8');
  assert.equal(communityCapacity(2), 16, 'two staff carry the default 16');
  assert.equal(communityCapacity(2, 30), 16, 'asking for 30 with two staff still caps at 16');
  assert.equal(communityCapacity(4, 30), 30, 'the DB bound (30) stays the outer wall');
  assert.equal(communityCapacity(2, 10), 10, 'a smaller ask is honored');
  assert.equal(communityCapacity(0), 8, 'garbage staffing counts as one');
});

// ── .ics generation ──────────────────────────────────────────────────────────

test('ics: one well-formed UTC event, escaped text', () => {
  const ics = sessionIcs({
    uid: 'seat-1@kaizenedu.net',
    title: 'Algebra; Hall, part 1',
    start: '2026-08-13T21:00:00Z',
    end: '2026-08-13T22:00:00Z',
    url: 'https://kaizenedu.net/schedule',
  });
  assert.equal(ics.filename, 'kaizen-session.ics');
  assert.match(ics.content, /BEGIN:VCALENDAR\r\n/);
  assert.match(ics.content, /DTSTART:20260813T210000Z/);
  assert.match(ics.content, /DTEND:20260813T220000Z/);
  assert.match(ics.content, /SUMMARY:Algebra\\; Hall\\, part 1/);
  assert.match(ics.content, /END:VCALENDAR$/);
});

test('ics: unusable times mean no attachment, not a crash', () => {
  assert.equal(sessionIcs({ title: 'x', start: 'not-a-date' }), null);
});
