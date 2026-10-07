/**
 * POST /api/tutor/asr (voice-17; invariants a, b, d).
 *
 * The ASR provider is mocked — the sandbox and CI cannot reach one — so the
 * provider hop is not measured here. What is: the clip reaches the provider
 * whole, the transcript comes back, one usage line in seconds is written, and
 * no filesystem write happens anywhere near the bytes. The clip carries a
 * marker string so a write "containing the audio" is checkable rather than
 * assumed (the pattern in `tests/invariants/no-audio-persistence.test.ts`).
 */
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { setAppSetting } from '@/lib/tutor/settings';
import type { AsrResponse } from '@/lib/tutor/contracts';

import { testDb } from './_db';
import { adultActor, endedSession, parentActor, usageRows, type Actor } from './_media';

const mocks = vi.hoisted(() => ({
  transcribeAudio: vi.fn(),
  writes: [] as Array<{ api: string; args: unknown[] }>,
  logs: [] as string[],
}));

function recording(api: string) {
  return (...args: unknown[]) => {
    mocks.writes.push({ api, args });
    return undefined as never;
  };
}

vi.mock('@/lib/audio/asr-providers', () => ({ transcribeAudio: mocks.transcribeAudio }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: (...args: unknown[]) => mocks.logs.push(args.join(' ')),
    warn: (...args: unknown[]) => mocks.logs.push(args.join(' ')),
    error: (...args: unknown[]) => mocks.logs.push(args.join(' ')),
    debug: (...args: unknown[]) => mocks.logs.push(args.join(' ')),
  }),
}));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    writeFileSync: recording('fs.writeFileSync'),
    appendFileSync: recording('fs.appendFileSync'),
    createWriteStream: recording('fs.createWriteStream'),
    promises: {
      ...actual.promises,
      writeFile: recording('fs.promises.writeFile'),
      appendFile: recording('fs.promises.appendFile'),
    },
  };
});
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    writeFile: recording('fsp.writeFile'),
    appendFile: recording('fsp.appendFile'),
  };
});

let db: TutorDb;
let me: Actor;
let stranger: Actor;
let asr: (request: Request) => Promise<Response>;

const TRANSCRIPT = 'two thirds plus one sixth';

function clip(marker: string, bytes = 4_096): Blob {
  const body = new Uint8Array(bytes);
  const markerBytes = new TextEncoder().encode(marker);
  body.set(markerBytes.subarray(0, bytes), 0);
  return new Blob([body], { type: 'audio/webm' });
}

async function post(
  options: {
    cookie?: string | null;
    sessionId?: string;
    durationMs?: number;
    audio?: Blob | null;
  } = {},
): Promise<{ status: number; body: Partial<AsrResponse> & { errorCode?: string } }> {
  const form = new FormData();
  if (options.audio !== null) {
    form.set('audio', options.audio ?? clip('KAIZEN-ASR-DEFAULT'), 'clip.webm');
  }
  if (options.sessionId !== undefined) form.set('sessionId', options.sessionId);
  else form.set('sessionId', me.sessionId);
  form.set('durationMs', String(options.durationMs ?? 4_000));
  const headers = new Headers();
  const cookie = options.cookie === undefined ? me.cookie : options.cookie;
  if (cookie) headers.set('cookie', cookie);
  const response = await asr(
    new Request(`http://localhost${TUTOR_API.asr}`, { method: 'POST', headers, body: form }),
  );
  return { status: response.status, body: (await response.json()) as Partial<AsrResponse> };
}

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('ASR_OPENAI_API_KEY', 'sk-test-asr');
  db = await testDb();
  me = await adultActor(db, 'asr-owner@example.com');
  stranger = await parentActor(db, 'asr-stranger@example.com');
  ({ POST: asr } = await import('@/app/(learner)/api/tutor/asr/route'));
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  mocks.writes.length = 0;
  mocks.logs.length = 0;
  mocks.transcribeAudio.mockReset();
  mocks.transcribeAudio.mockResolvedValue({ text: TRANSCRIPT });
  await setAppSetting(db, 'ai_kill_switch', false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('ASR_OPENAI_API_KEY', 'sk-test-asr');
});

describe('authentication and ownership', () => {
  it('answers 401 without a cookie', async () => {
    const response = await post({ cookie: null });
    expect(response.status).toBe(401);
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });

  it('answers 404 for a session that belongs to another account', async () => {
    const response = await post({ sessionId: stranger.sessionId });
    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('NOT_FOUND');
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });

  it('refuses a session that has ended', async () => {
    const response = await post({ sessionId: await endedSession(db, me) });
    expect(response.status).toBe(403);
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });
});

describe('validation and gates', () => {
  it('needs an audio part and a session id', async () => {
    expect((await post({ audio: null })).status).toBe(400);
    expect((await post({ sessionId: 'not an id!' })).status).toBe(400);
    expect((await post({ audio: new Blob([], { type: 'audio/webm' }) })).status).toBe(400);
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });

  it('refuses a clip larger than the cap', async () => {
    const response = await post({ audio: clip('big', 9 * 1024 * 1024) });
    expect(response.status).toBe(413);
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });

  it('refuses every clip while the AI kill switch is on', async () => {
    await setAppSetting(db, 'ai_kill_switch', true);
    expect((await post()).status).toBe(403);
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });
});

describe('the transcript answer', () => {
  it('hands the whole clip to the provider and answers the text and its length', async () => {
    const marker = `KAIZEN-ASR-${randomUUID()}`;
    const audio = clip(marker);
    const response = await post({ audio, durationMs: 3_500 });

    expect(response.status).toBe(200);
    expect(response.body.text).toBe(TRANSCRIPT);
    expect(response.body.seconds).toBeCloseTo(3.5);
    expect(mocks.transcribeAudio).toHaveBeenCalledTimes(1);
    const forwarded = mocks.transcribeAudio.mock.calls[0]?.[1] as Blob | undefined;
    expect(forwarded?.size).toBe(audio.size);
  });

  it('records one asr usage line in seconds', async () => {
    const before = await usageRows(db, me.sessionId);
    expect((await post({ durationMs: 6_000 })).status).toBe(200);
    const after = await usageRows(db, me.sessionId);
    expect(after).toHaveLength(before.length + 1);
    const line = after[after.length - 1];
    expect(line?.kind).toBe('asr');
    expect(line?.unit).toBe('second');
    expect(line?.quantity).toBeCloseTo(6);
    expect(line?.provider).toBe('openai-whisper');
  });

  it('answers 502 and writes no usage line when the provider fails', async () => {
    mocks.transcribeAudio.mockRejectedValue(new Error('provider exploded'));
    const before = await usageRows(db, me.sessionId);
    expect((await post()).status).toBe(502);
    expect(await usageRows(db, me.sessionId)).toHaveLength(before.length);
  });
});

describe('invariant (b): the clip and its transcript are never written anywhere', () => {
  it('makes no filesystem write while the clip is in flight', async () => {
    const marker = `KAIZEN-ASR-${randomUUID()}`;
    expect((await post({ audio: clip(marker) })).status).toBe(200);
    expect(
      mocks.writes.map((write) => write.api),
      'any filesystem write during an asr request',
    ).toEqual([]);
  });

  it('logs the session id and the size, never the transcript', async () => {
    expect((await post()).status).toBe(200);
    expect(mocks.logs.length).toBeGreaterThan(0);
    for (const line of mocks.logs) expect(line).not.toContain(TRANSCRIPT);
    expect(mocks.logs.join(' ')).toContain(`session=${me.sessionId}`);
  });

  it('stores no transcript row of its own: the turn is the turn engine’s to write', async () => {
    const before = await db.query<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM turns WHERE session_id = $1`,
      [me.sessionId],
    );
    expect((await post()).status).toBe(200);
    const after = await db.query<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM turns WHERE session_id = $1`,
      [me.sessionId],
    );
    expect(Number(after.rows[0]?.n)).toBe(Number(before.rows[0]?.n));
  });
});
