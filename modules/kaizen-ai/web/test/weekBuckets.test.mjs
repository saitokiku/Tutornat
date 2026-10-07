// WeekStrip's pure day-bucketing: 7 buckets starting today, sessions dropped
// into their local day, everything outside the window ignored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketWeek } from '@/lib/weekBuckets.js';

const NOW = new Date('2026-08-12T15:00:00'); // local Wednesday afternoon

test('produces 7 day buckets starting today', () => {
  const days = bucketWeek([], NOW);
  assert.equal(days.length, 7);
  assert.equal(days[0].isToday, true);
  assert.equal(days.filter((d) => d.isToday).length, 1);
  assert.ok(days.every((d) => typeof d.label === 'string' && d.label.length === 3));
});

test('assigns sessions to their local day bucket, kept in time order', () => {
  const sessions = [
    { id: 'b', start: new Date('2026-08-14T16:00:00').toISOString() },
    { id: 'a', start: new Date('2026-08-14T09:00:00').toISOString() },
  ];
  const days = bucketWeek(sessions, NOW);
  const withSessions = days.filter((d) => d.sessions.length > 0);
  assert.equal(withSessions.length, 1);
  assert.deepEqual(withSessions[0].sessions.map((s) => s.id), ['a', 'b']);
});

test('a session later today lands in the today bucket', () => {
  const days = bucketWeek([{ id: 't', start: new Date('2026-08-12T18:00:00').toISOString() }], NOW);
  assert.equal(days[0].sessions.length, 1);
});

test('ignores sessions outside the 7-day window', () => {
  const days = bucketWeek(
    [
      { id: 'past', start: new Date('2026-08-11T18:00:00').toISOString() },
      { id: 'far', start: new Date('2026-08-25T18:00:00').toISOString() },
    ],
    NOW
  );
  assert.ok(days.every((d) => d.sessions.length === 0));
});
