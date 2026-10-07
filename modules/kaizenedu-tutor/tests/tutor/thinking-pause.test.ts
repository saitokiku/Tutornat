/**
 * How long a learner gets to think before the microphone decides they have
 * finished. It is thinking room and latency at the same time: every
 * millisecond is one the tutor cannot start in, and cutting a child off
 * mid-thought is the worse of the two failures.
 *
 * So it is not a constant. The band sets a default, one operator row retunes
 * every band without a deploy, and the bounds mean a bad row cannot silence
 * the microphone or make the tutor feel broken.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BANDS } from '@/kaizen.config';
import type { TutorDb } from '@/lib/tutor/db';
import { thinkingPauseFor } from '@/lib/tutor/session/service';
import { getNumberSetting, setAppSetting } from '@/lib/tutor/settings';

import { testDb } from './_db';

let db: TutorDb;

beforeAll(async () => {
  db = await testDb();
});

afterAll(async () => {
  await db.end();
});

describe('the thinking pause', () => {
  it('gives younger learners more room than older ones', () => {
    // A child who pauses inside a sentence should not be interrupted by the
    // thing that is supposed to be listening to them.
    expect(BANDS['4-8'].thinkingPauseMs).toBeGreaterThan(BANDS['9-12'].thinkingPauseMs);
    expect(BANDS['9-12'].thinkingPauseMs).toBeGreaterThan(BANDS['13-17'].thinkingPauseMs);
    expect(BANDS['13-17'].thinkingPauseMs).toBeGreaterThan(BANDS.adult.thinkingPauseMs);
  });

  it('falls back to the band default when no operator row exists', async () => {
    await db.query(`DELETE FROM app_settings WHERE key = 'thinking_pause_ms'`);
    expect(await thinkingPauseFor(db, '9-12')).toBe(BANDS['9-12'].thinkingPauseMs);
    expect(await thinkingPauseFor(db, 'adult')).toBe(BANDS.adult.thinkingPauseMs);
  });

  it('lets one operator row retune every band live', async () => {
    await db.query(
      `INSERT INTO app_settings (key, value) VALUES ('thinking_pause_ms', '1800'::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    );
    expect(await thinkingPauseFor(db, '9-12')).toBe(1800);
    expect(await thinkingPauseFor(db, 'adult')).toBe(1800);
  });

  it('clamps a value that would break the session either way', async () => {
    for (const [stored, expected] of [
      ['50', 300],
      ['99000', 4000],
    ] as const) {
      await db.query(
        `INSERT INTO app_settings (key, value) VALUES ('thinking_pause_ms', $1::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [stored],
      );
      expect(await thinkingPauseFor(db, '9-12')).toBe(expected);
    }
  });

  it('ignores a row that is not a number rather than silencing the microphone', async () => {
    await db.query(
      `INSERT INTO app_settings (key, value) VALUES ('thinking_pause_ms', '"soon"'::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    );
    expect(await thinkingPauseFor(db, '9-12')).toBe(BANDS['9-12'].thinkingPauseMs);
  });

  it('refuses to read a gate as a number, so a switch cannot become a duration', async () => {
    await setAppSetting(db, 'billing_enabled', true);
    expect(await getNumberSetting(db, 'billing_enabled', 42, { min: 0, max: 100 })).toBe(42);
  });
});
