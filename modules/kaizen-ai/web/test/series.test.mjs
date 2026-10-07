// The weekly series engine — occurrence math pinned across DST, because
// "Tuesday 5 PM Eastern" must mean 5 PM on the family's wall clock every week
// of the year, while the UTC instant shifts by an hour twice a year.
//
// nextOccurrences is pure (`from` injected), so these tests never read the
// real clock.

import test from 'node:test';
import assert from 'node:assert/strict';
import { nextOccurrences, zonedTimeToUtc } from '@/lib/server/series.js';

const NY = 'America/New_York';

function nySeries(overrides = {}) {
  return {
    weekday: 2,                    // Tuesday
    local_start_time: '17:00:00',
    duration_minutes: 60,
    timezone: NY,
    kind: 'clinic',
    min_seats: 2,
    starts_on: '2026-01-01',
    ends_on: null,
    ...overrides,
  };
}

// What wall-clock hour does a UTC instant land on in a zone?
function hourIn(tz, date) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: '2-digit' })
    .format(date));
}

test('zonedTimeToUtc resolves winter (EST, UTC-5) and summer (EDT, UTC-4) correctly', () => {
  const winter = zonedTimeToUtc({ year: 2026, month: 1, day: 20, hour: 17, minute: 0 }, NY);
  assert.equal(winter.toISOString(), '2026-01-20T22:00:00.000Z');
  const summer = zonedTimeToUtc({ year: 2026, month: 7, day: 21, hour: 17, minute: 0 }, NY);
  assert.equal(summer.toISOString(), '2026-07-21T21:00:00.000Z');
});

test('spring-forward week: the wall clock holds 5 PM while the UTC instant shifts', () => {
  // US DST 2026 begins Sunday 2026-03-08. The Tuesday before is standard time,
  // the Tuesday after is daylight time.
  const s = nySeries();
  const occ = nextOccurrences(s, { from: new Date('2026-03-02T00:00:00Z'), horizonDays: 14 });
  assert.equal(occ.length, 2);
  const [before, after] = occ;
  assert.equal(before.start.toISOString(), '2026-03-03T22:00:00.000Z'); // EST: 17:00 = 22:00Z
  assert.equal(after.start.toISOString(), '2026-03-10T21:00:00.000Z'); // EDT: 17:00 = 21:00Z
  assert.equal(hourIn(NY, before.start), 17);
  assert.equal(hourIn(NY, after.start), 17);
});

test('fall-back week: same guarantee in the other direction', () => {
  // US DST 2026 ends Sunday 2026-11-01.
  const s = nySeries();
  const occ = nextOccurrences(s, { from: new Date('2026-10-26T00:00:00Z'), horizonDays: 14 });
  assert.equal(occ.length, 2);
  const [before, after] = occ;
  assert.equal(before.start.toISOString(), '2026-10-27T21:00:00.000Z'); // EDT
  assert.equal(after.start.toISOString(), '2026-11-03T22:00:00.000Z'); // EST
  assert.equal(hourIn(NY, before.start), 17);
  assert.equal(hourIn(NY, after.start), 17);
});

test('occurrences respect starts_on / ends_on and never include the past', () => {
  const s = nySeries({ starts_on: '2026-03-10', ends_on: '2026-03-24' });
  const occ = nextOccurrences(s, { from: new Date('2026-03-02T00:00:00Z'), horizonDays: 30 });
  // Tuesdays in [03-10 .. 03-24]: the 10th, 17th, 24th.
  assert.equal(occ.length, 3);
  assert.ok(occ.every(({ start }) => start.getTime() > new Date('2026-03-02T00:00:00Z').getTime()));

  // A `from` after some occurrences excludes them.
  const later = nextOccurrences(s, { from: new Date('2026-03-18T00:00:00Z'), horizonDays: 30 });
  assert.equal(later.length, 1);
  assert.equal(later[0].start.toISOString(), '2026-03-24T21:00:00.000Z');
});

test('the weekday is evaluated in the SERIES timezone, not the server one', () => {
  // 17:00 Tuesday in Tokyo is 08:00Z Tuesday; a UTC-naive walk near midnight
  // boundaries picks the wrong day. Pin one Tokyo series.
  const s = nySeries({ timezone: 'Asia/Tokyo' });
  const occ = nextOccurrences(s, { from: new Date('2026-06-01T00:00:00Z'), horizonDays: 7 });
  assert.equal(occ.length, 1);
  assert.equal(occ[0].start.toISOString(), '2026-06-02T08:00:00.000Z'); // JST = UTC+9
  assert.equal(hourIn('Asia/Tokyo', occ[0].start), 17);
});

test('duration produces the end time; horizon re-runs are stable (idempotency input)', () => {
  const s = nySeries({ duration_minutes: 90 });
  const [a] = nextOccurrences(s, { from: new Date('2026-01-05T00:00:00Z'), horizonDays: 7 });
  assert.equal((a.end.getTime() - a.start.getTime()) / 60000, 90);
  // Same inputs → identical instants: what makes the (series_id, scheduled_start)
  // unique index a real idempotency key for the materializer.
  const [b] = nextOccurrences(s, { from: new Date('2026-01-05T00:00:00Z'), horizonDays: 7 });
  assert.equal(a.start.toISOString(), b.start.toISOString());
});
