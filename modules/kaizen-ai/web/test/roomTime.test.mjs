// The room's time, in the room's zone. These pins exist because the product
// shipped four different answers to "when is the Thursday room" — server-side
// UTC on /tutoring and the landing strip, the visitor's browser zone on
// /schedule — for a business whose whole proposition is being somewhere on a
// particular evening (docs/superpowers/specs/2026-09-02-wave2-audit.md).
//
// The class of bug is a silent fallback to the reader's locale, so the tests
// below assert on an EXPLICIT zone and on the DST weeks, the same way
// series.test.mjs pins the recurrence maths.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  roomTime, roomDay, roomWhen, roomDateTime, slotWhen, cohortDays, zoneLabel, zoneAbbrev,
  CLUB_TIMEZONE,
} from '@/lib/roomTime.js';

const AUSTIN = 'America/Chicago';

// 2026-09-03 is a Thursday. 23:00 UTC is 18:00 CDT (UTC-5) the same day.
const THU_6PM_CDT = '2026-09-03T23:00:00.000Z';
// 2026-12-03 is a Thursday. 00:00 UTC Friday is 18:00 CST (UTC-6) Thursday —
// the case where the reader's zone and the room's zone disagree about the DAY.
const THU_6PM_CST = '2026-12-04T00:00:00.000Z';

test('a room reads in its own zone, not the runtime’s', () => {
  assert.equal(roomTime(THU_6PM_CDT, AUSTIN), '6:00 PM');
  assert.equal(roomDay(THU_6PM_CDT, AUSTIN), 'Thu');
  // The bug this file exists for: formatted as UTC it is 11:00 PM, and on
  // Vercel that is what every server-rendered surface printed.
  assert.equal(roomTime(THU_6PM_CDT, 'UTC'), '11:00 PM');
});

test('the day is the room’s day even when UTC has rolled over', () => {
  // In UTC this instant is Friday. To an Austin family it is Thursday evening,
  // and Thursday is the answer that gets them to the right room.
  assert.equal(roomDay(THU_6PM_CST, AUSTIN), 'Thu');
  assert.equal(roomDay(THU_6PM_CST, 'UTC'), 'Fri');
  assert.equal(roomTime(THU_6PM_CST, AUSTIN), '6:00 PM');
});

test('6 PM stays 6 PM across the DST transition', () => {
  // Both instants are 18:00 local in Austin; the UTC offset differs by an hour.
  // A parent's calendar does not move, so neither does the rendered time.
  assert.equal(roomTime(THU_6PM_CDT, AUSTIN), roomTime(THU_6PM_CST, AUSTIN));
});

test('roomWhen and roomDateTime compose the parts', () => {
  assert.equal(roomWhen(THU_6PM_CDT, AUSTIN), 'Thu 6:00 PM');
  assert.equal(roomWhen(THU_6PM_CDT, AUSTIN, { long: true }), 'Thursday 6:00 PM');
  assert.equal(roomDateTime(THU_6PM_CDT, AUSTIN), 'Thu 3 Sep · 6:00 PM');
});

test('midnight and noon are not am/pm zeroes', () => {
  // 05:00 UTC is midnight CDT; 17:00 UTC is noon CDT.
  assert.equal(roomTime('2026-09-04T05:00:00.000Z', AUSTIN), '12:00 AM');
  assert.equal(roomTime('2026-09-03T17:00:00.000Z', AUSTIN), '12:00 PM');
});

test('an absent zone falls back to the club’s own, never to the reader’s', () => {
  assert.equal(CLUB_TIMEZONE, 'America/Chicago');
  assert.equal(roomTime(THU_6PM_CDT, null), roomTime(THU_6PM_CDT, CLUB_TIMEZONE));
  assert.equal(roomTime(THU_6PM_CDT, ''), '6:00 PM');
});

test('an unreadable instant renders as nothing, not as "Invalid Date"', () => {
  for (const bad of ['', null, undefined, 'not-a-date', NaN]) {
    assert.equal(roomTime(bad, AUSTIN), '');
    assert.equal(roomDay(bad, AUSTIN), '');
    assert.equal(roomWhen(bad, AUSTIN), '');
    assert.equal(roomDateTime(bad, AUSTIN), '');
  }
});

// ── The recurring slot, from the series row ──────────────────────────────────

test('a series slot reads from its stored wall-clock time, unconverted', () => {
  // The series stores the time a parent reads off their calendar, so there is
  // nothing to convert. Converting it would be the same bug in reverse.
  assert.equal(slotWhen(2, '18:00'), 'Tue 6:00 PM');
  assert.equal(slotWhen(4, '17:30', { long: true }), 'Thursday 5:30 PM');
  assert.equal(slotWhen(0, '09:05'), 'Sun 9:05 AM');
});

test('a malformed slot degrades to whatever half is readable', () => {
  assert.equal(slotWhen(9, '18:00'), '6:00 PM');
  assert.equal(slotWhen(2, ''), 'Tue');
  assert.equal(slotWhen(null, null), '');
});

// ── The cohort's days, which is the sentence a parent needs ──────────────────

test('a cohort says which days it meets, in order, as a phrase', () => {
  assert.equal(cohortDays([2, 4]), 'Tuesdays and Thursdays');
  assert.equal(cohortDays([4, 2]), 'Tuesdays and Thursdays', 'order of the rows must not matter');
  assert.equal(cohortDays([1, 3, 5]), 'Mondays, Wednesdays and Fridays');
  assert.equal(cohortDays([2]), 'Tuesdays');
  assert.equal(cohortDays([2, 2]), 'Tuesdays', 'two series on one day is one day');
  assert.equal(cohortDays([2, 4], { long: false }), 'Tue and Thu');
});

test('a cohort with no series says nothing rather than something wrong', () => {
  for (const bad of [[], null, undefined, [7], ['x']]) {
    assert.equal(cohortDays(bad), '');
  }
});

test('a zone is named for a person, only where it needs naming', () => {
  assert.equal(zoneLabel('America/Chicago'), 'Chicago time');
  assert.equal(zoneLabel('America/New_York'), 'New York time');
  assert.equal(zoneLabel(null), 'Chicago time');
});

// The transactional mail is the surface that keeps being wrong longest: a page
// gets corrected, an inbox does not. sendGroupReminderEmail and its siblings
// formatted with `toLocaleString` and NO timeZone — the server's zone, UTC on
// Vercel — so every confirmation told a family a 6:00 PM Austin room met at
// 11:00 PM. They now go through roomDateTime, and disclose the zone, because an
// email is read on a phone in another state.
test('an email names the zone the room is in, for the instant it is in', () => {
  assert.equal(zoneAbbrev(THU_6PM_CDT, AUSTIN), 'CDT');
  assert.equal(zoneAbbrev(THU_6PM_CST, AUSTIN), 'CST', 'the abbreviation follows daylight saving');
  // Same guard as every other reader here: absent input is not the epoch.
  assert.equal(zoneAbbrev(null, AUSTIN), '');
  assert.equal(zoneAbbrev('', AUSTIN), '');
  assert.equal(zoneAbbrev('not a date', AUSTIN), '');
  // A missing zone falls back to the club's, never to the runtime's.
  assert.equal(zoneAbbrev(THU_6PM_CDT, null), zoneAbbrev(THU_6PM_CDT, CLUB_TIMEZONE));
});
