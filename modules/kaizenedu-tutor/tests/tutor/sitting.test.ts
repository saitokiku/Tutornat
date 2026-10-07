/**
 * The sitting clock (reference §5, California SB 243): three sessions in an
 * evening can cross three hours even though one session cannot, and the
 * reminder fires once per boundary, never on every turn after it.
 */
import { describe, expect, it } from 'vitest';

import {
  BREAK_REMINDER_EVERY_MS,
  breakReminderDue,
  SITTING_GAP_MS,
  sittingClock,
  sittingStateFrom,
} from '@/lib/tutor/session/sitting';

const MIN = 60_000;
const H = 60 * MIN;
const T0 = Date.parse('2026-09-05T18:00:00Z');

describe('sittingClock', () => {
  it('opens a fresh sitting when nothing happened within the gap', () => {
    expect(sittingClock([], { now: T0 })).toEqual({
      startedAt: T0,
      previousAt: null,
      fresh: true,
      elapsedMs: 0,
      breakDue: false,
    });
    const long = sittingClock([T0 - SITTING_GAP_MS - MIN], { now: T0 });
    expect(long.fresh).toBe(true);
    expect(long.previousAt).toBe(T0 - SITTING_GAP_MS - MIN);
  });

  it('chains turns less than a gap apart into one sitting, across sessions', () => {
    // Three 25-minute sessions with 10-minute breaks: one sitting of ~1h35.
    const times: number[] = [];
    for (const start of [0, 35 * MIN, 70 * MIN]) {
      for (let m = 0; m <= 25; m += 5) times.push(T0 + start + m * MIN);
    }
    const now = T0 + 95 * MIN + 2 * MIN;
    const sitting = sittingClock(times, { now });
    expect(sitting.fresh).toBe(false);
    expect(sitting.startedAt).toBe(T0);
    expect(sitting.elapsedMs).toBe(97 * MIN);
    expect(sitting.breakDue).toBe(false);
  });

  it('is due exactly on the turn that crosses three hours, and not on the turns after', () => {
    const times = Array.from({ length: 36 }, (_, i) => T0 + i * 5 * MIN); // 0 … 2h55
    const crossing = sittingClock(times, { now: T0 + 3 * H + MIN });
    expect(crossing.breakDue).toBe(true);
    const after = sittingClock([...times, T0 + 3 * H + MIN], { now: T0 + 3 * H + 3 * MIN });
    expect(after.breakDue).toBe(false);
    const sixHours = sittingClock(
      Array.from({ length: 72 }, (_, i) => T0 + i * 5 * MIN),
      { now: T0 + 6 * H + MIN },
    );
    expect(sixHours.breakDue).toBe(true);
  });

  it('ignores null, zero and future timestamps', () => {
    const sitting = sittingClock([0, Number.NaN, T0 + H, T0 - 2 * MIN], { now: T0 });
    expect(sitting.startedAt).toBe(T0 - 2 * MIN);
    expect(sitting.fresh).toBe(false);
  });
});

describe("the session's sitting state", () => {
  it('starts with the boundaries the sitting had already crossed', () => {
    const fresh = sittingStateFrom(sittingClock([], { now: T0 }));
    expect(fresh).toEqual({ startedAt: new Date(T0).toISOString(), remindersGiven: 0 });
    const times = Array.from({ length: 40 }, (_, i) => T0 + i * 5 * MIN); // up to 3h15
    const late = sittingStateFrom(sittingClock(times, { now: T0 + 3 * H + 20 * MIN }));
    expect(late.startedAt).toBe(new Date(T0).toISOString());
    expect(late.remindersGiven).toBe(1);
  });

  it('owes one reminder per boundary and records it', () => {
    const sitting = { startedAt: new Date(T0).toISOString(), remindersGiven: 0 };
    expect(breakReminderDue(sitting, T0 + 2 * H)).toEqual({ due: false, boundary: 0 });
    expect(breakReminderDue(sitting, T0 + BREAK_REMINDER_EVERY_MS + MIN)).toEqual({
      due: true,
      boundary: 1,
    });
    expect(breakReminderDue({ ...sitting, remindersGiven: 1 }, T0 + 4 * H)).toEqual({
      due: false,
      boundary: 1,
    });
    expect(breakReminderDue({ ...sitting, remindersGiven: 1 }, T0 + 6 * H + MIN)).toEqual({
      due: true,
      boundary: 2,
    });
    expect(breakReminderDue({ startedAt: 'nonsense', remindersGiven: 0 }, T0)).toEqual({
      due: false,
      boundary: 0,
    });
  });
});
