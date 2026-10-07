/**
 * POST /api/tutor/attention (spec §5.10 B–C; D16, R29; invariant a).
 *
 * The properties this route exists to hold: samples are folded into counts and
 * the samples themselves are not stored anywhere, one `recovery_events` row is
 * written per ladder step, and neither can be written against a session the
 * caller does not own. There is no media in the request and nothing here can
 * produce a filesystem write, which is asserted rather than assumed.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import type { AttentionRequest } from '@/lib/tutor/wire';

import { call } from './_api';
import { testDb } from './_db';
import { adultActor, parentActor, type Actor } from './_media';

const mocks = vi.hoisted(() => ({
  writes: [] as Array<{ api: string; args: unknown[] }>,
}));

function recording(api: string) {
  return (...args: unknown[]) => {
    mocks.writes.push({ api, args });
    return undefined as never;
  };
}

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    writeFileSync: recording('fs.writeFileSync'),
    appendFileSync: recording('fs.appendFileSync'),
    createWriteStream: recording('fs.createWriteStream'),
  };
});

let db: TutorDb;
let me: Actor;
let stranger: Actor;
let attention: (request: Request) => Promise<Response>;

interface StatsRow extends Record<string, unknown> {
  camera_enabled: boolean;
  attending_pct: number | string;
  drift_count: number | string;
  away_count: number | string;
  recoveries: number | string;
}

async function stats(sessionId: string): Promise<StatsRow | undefined> {
  const { rows } = await db.query<StatsRow>(
    `SELECT camera_enabled, attending_pct, drift_count, away_count, recoveries
       FROM attention_stats WHERE session_id = $1`,
    [sessionId],
  );
  return rows[0];
}

async function recoveries(sessionId: string) {
  const { rows } = await db.query<{
    trigger_state: string;
    ladder_step: number | string;
    outcome: string | null;
  }>(
    `SELECT trigger_state, ladder_step, outcome FROM recovery_events
      WHERE session_id = $1 ORDER BY ts`,
    [sessionId],
  );
  return rows.map((row) => ({
    triggerState: row.trigger_state,
    ladderStep: Number(row.ladder_step),
    outcome: row.outcome,
  }));
}

const post = (body: Partial<AttentionRequest>, cookie: string | null = me.cookie) =>
  call(attention, TUTOR_API.attention, { ...(cookie ? { cookie } : {}), body });

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  db = await testDb();
  me = await adultActor(db, 'attention-owner@example.com');
  stranger = await parentActor(db, 'attention-stranger@example.com');
  ({ POST: attention } = await import('@/app/(learner)/api/tutor/attention/route'));
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  mocks.writes.length = 0;
  await db.query(`DELETE FROM recovery_events WHERE session_id = $1`, [me.sessionId]);
  await db.query(`DELETE FROM attention_stats WHERE session_id = $1`, [me.sessionId]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('TUTOR_MODE', '1');
});

describe('authentication and ownership', () => {
  it('answers 401 without a cookie', async () => {
    const response = await post({ sessionId: me.sessionId, samples: [] }, null);
    expect(response.status).toBe(401);
  });

  it('answers 404 for a session that belongs to another account', async () => {
    const response = await post({
      sessionId: stranger.sessionId,
      samples: [{ state: 'away', ts: 1, source: 'visibility' }],
    });
    expect(response.status).toBe(404);
    expect(await stats(stranger.sessionId)).toBeUndefined();
  });

  it('rejects a malformed session id', async () => {
    expect((await post({ sessionId: 'not an id!' })).status).toBe(400);
  });
});

describe('samples become counts', () => {
  it('folds a batch into drift and away counts and a percentage', async () => {
    const response = await post({
      sessionId: me.sessionId,
      samples: [
        { state: 'attending', ts: 1, source: 'idle' },
        { state: 'attending', ts: 2, source: 'idle' },
        { state: 'attending', ts: 3, source: 'idle' },
        { state: 'drifting', ts: 4, source: 'idle' },
        { state: 'away', ts: 5, source: 'visibility' },
      ],
    });
    expect(response.status).toBe(200);
    const row = await stats(me.sessionId);
    expect(Number(row?.drift_count)).toBe(1);
    expect(Number(row?.away_count)).toBe(1);
    expect(Number(row?.attending_pct)).toBe(60);
    expect(row?.camera_enabled).toBe(false);
  });

  it('adds a second batch to the first', async () => {
    await post({
      sessionId: me.sessionId,
      samples: [{ state: 'drifting', ts: 1, source: 'idle' }],
    });
    await post({
      sessionId: me.sessionId,
      samples: [
        { state: 'drifting', ts: 2, source: 'idle' },
        { state: 'away', ts: 3, source: 'visibility' },
      ],
    });
    const row = await stats(me.sessionId);
    expect(Number(row?.drift_count)).toBe(2);
    expect(Number(row?.away_count)).toBe(1);
  });

  it('takes the session-wide percentage from the client aggregate when it is sent', async () => {
    await post({
      sessionId: me.sessionId,
      samples: [{ state: 'drifting', ts: 1, source: 'idle' }],
      stats: {
        cameraEnabled: false,
        attendingPct: 92.5,
        driftCount: 3,
        awayCount: 1,
        recoveries: 2,
      },
    });
    const row = await stats(me.sessionId);
    expect(Number(row?.attending_pct)).toBe(92.5);
    expect(Number(row?.drift_count)).toBe(3);
    expect(Number(row?.recoveries)).toBe(2);
  });

  it('clamps numbers a client could have made up', async () => {
    await post({
      sessionId: me.sessionId,
      stats: {
        cameraEnabled: false,
        attendingPct: 4_000,
        driftCount: -7,
        awayCount: Number.NaN,
        recoveries: 0,
      },
    });
    const row = await stats(me.sessionId);
    expect(Number(row?.attending_pct)).toBe(100);
    expect(Number(row?.drift_count)).toBe(0);
    expect(Number(row?.away_count)).toBe(0);
  });

  it('drops a sample with a state or source it does not know', async () => {
    await post({
      sessionId: me.sessionId,
      samples: [
        { state: 'drifting', ts: 1, source: 'idle' },
        { state: 'asleep', ts: 2, source: 'idle' },
        { state: 'away', ts: 3, source: 'telepathy' },
        { state: 'away', ts: Number.NaN, source: 'visibility' },
      ] as AttentionRequest['samples'],
    });
    const row = await stats(me.sessionId);
    expect(Number(row?.drift_count)).toBe(1);
    expect(Number(row?.away_count)).toBe(0);
  });

  it('refuses an oversized batch', async () => {
    const samples = Array.from({ length: 241 }, (_, index) => ({
      state: 'attending' as const,
      ts: index,
      source: 'idle' as const,
    }));
    expect((await post({ sessionId: me.sessionId, samples })).status).toBe(400);
  });
});

describe('recovery events', () => {
  it('writes one row per ladder step and counts it', async () => {
    await post({
      sessionId: me.sessionId,
      recovery: { triggerState: 'drifting', ladderStep: 1, outcome: 'prosody_name' },
    });
    await post({
      sessionId: me.sessionId,
      recovery: { triggerState: 'away', ladderStep: 6, outcome: 'pause_notify' },
    });
    expect(await recoveries(me.sessionId)).toEqual([
      { triggerState: 'drifting', ladderStep: 1, outcome: 'prosody_name' },
      { triggerState: 'away', ladderStep: 6, outcome: 'pause_notify' },
    ]);
    expect(Number((await stats(me.sessionId))?.recoveries)).toBe(2);
  });

  it('rejects a step outside the ladder and an unknown trigger state', async () => {
    for (const recovery of [
      { triggerState: 'drifting' as const, ladderStep: 0, outcome: null },
      { triggerState: 'drifting' as const, ladderStep: 7, outcome: null },
      { triggerState: 'bored', ladderStep: 1, outcome: null },
      { triggerState: 'drifting' as const, ladderStep: 1, outcome: 'x'.repeat(100) },
    ]) {
      const response = await post({
        sessionId: me.sessionId,
        recovery: recovery as AttentionRequest['recovery'],
      });
      expect(response.status, JSON.stringify(recovery)).toBe(400);
    }
    expect(await recoveries(me.sessionId)).toEqual([]);
  });
});

describe('nothing is written to disk', () => {
  it('makes no filesystem write while recording attention', async () => {
    await post({
      sessionId: me.sessionId,
      samples: [{ state: 'away', ts: 1, source: 'visibility' }],
      recovery: { triggerState: 'away', ladderStep: 2, outcome: 'direct_question' },
    });
    expect(mocks.writes.map((write) => write.api)).toEqual([]);
  });
});
