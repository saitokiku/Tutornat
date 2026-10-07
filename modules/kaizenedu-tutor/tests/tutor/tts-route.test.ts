/**
 * POST /api/tutor/tts (voice-16; invariants a, b, d).
 *
 * The provider is mocked — `api.openai.com` is unreachable from CI and from
 * the sandbox this was built in, so the provider hop itself is not exercised
 * here and is not claimed to be. What is exercised is everything this route
 * owns: authentication, ownership, the kill switch, the cost ceiling, the
 * response headers, the usage line, and — the point of invariant (b) — that
 * not one filesystem write happens while audio bytes are in flight, and that
 * the sentence never reaches a log line.
 */
import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { setAppSetting } from '@/lib/tutor/settings';

import { call } from './_api';
import { testDb } from './_db';
import { adultActor, endedSession, parentActor, usageRows, type Actor } from './_media';

const mocks = vi.hoisted(() => ({
  generateTTS: vi.fn(),
  writes: [] as Array<{ api: string; args: unknown[] }>,
  logs: [] as string[],
}));

function recording(api: string) {
  return (...args: unknown[]) => {
    mocks.writes.push({ api, args });
    return undefined as never;
  };
}

vi.mock('@/lib/audio/tts-providers', () => ({ generateTTS: mocks.generateTTS }));
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

/** A tiny but real WAV so `measureAudioDuration` has something to parse. */
function wav(sampleCount: number, marker: string): Uint8Array {
  const sampleRate = 8_000;
  const dataSize = sampleCount * 2;
  const markerBytes = new TextEncoder().encode(marker);
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      bytes[offset + index] = text.charCodeAt(index);
    }
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataSize, true);
  bytes.set(markerBytes.subarray(0, dataSize), 44);
  return bytes;
}

let db: TutorDb;
let me: Actor;
let stranger: Actor;
let tts: (request: Request) => Promise<Response>;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('TTS_OPENAI_API_KEY', 'sk-test-tts');
  db = await testDb();
  me = await adultActor(db, 'tts-owner@example.com');
  stranger = await parentActor(db, 'tts-stranger@example.com');
  ({ POST: tts } = await import('@/app/(learner)/api/tutor/tts/route'));
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  mocks.writes.length = 0;
  mocks.logs.length = 0;
  mocks.generateTTS.mockReset();
  mocks.generateTTS.mockResolvedValue({ audio: wav(8_000, 'x'), format: 'wav' });
  await setAppSetting(db, 'ai_kill_switch', false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('TTS_OPENAI_API_KEY', 'sk-test-tts');
});

const body = (over: Record<string, unknown> = {}) => ({
  text: 'Two thirds is bigger than one half.',
  sessionId: me.sessionId,
  ...over,
});

/** A success answers audio, not JSON, so the shared `call` helper cannot read it. */
function post(payload: unknown, cookie: string = me.cookie): Promise<Response> {
  return tts(
    new Request(`http://localhost${TUTOR_API.tts}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(payload),
    }),
  );
}

describe('authentication and ownership', () => {
  it('answers 401 without a cookie', async () => {
    const response = await tts(
      new Request(`http://localhost${TUTOR_API.tts}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body()),
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.generateTTS).not.toHaveBeenCalled();
  });

  it('answers 404 for a session that belongs to another account', async () => {
    const response = await call(tts, TUTOR_API.tts, {
      cookie: me.cookie,
      body: body({ sessionId: stranger.sessionId }),
    });
    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('NOT_FOUND');
    expect(mocks.generateTTS).not.toHaveBeenCalled();
  });

  it('answers 404 for a session id that does not exist', async () => {
    const response = await call(tts, TUTOR_API.tts, {
      cookie: me.cookie,
      body: body({ sessionId: 'ses_nope' }),
    });
    expect(response.status).toBe(404);
  });

  it('refuses a session that has ended', async () => {
    const finished = await endedSession(db, me);
    const response = await call(tts, TUTOR_API.tts, {
      cookie: me.cookie,
      body: body({ sessionId: finished }),
    });
    expect(response.status).toBe(403);
    expect(mocks.generateTTS).not.toHaveBeenCalled();
  });
});

describe('validation and gates', () => {
  it('rejects an empty sentence, an over-long one, and a bad session id', async () => {
    for (const patch of [{ text: '  ' }, { text: 'a'.repeat(601) }, { sessionId: 'not a id!' }]) {
      const response = await call(tts, TUTOR_API.tts, { cookie: me.cookie, body: body(patch) });
      expect(response.status, JSON.stringify(patch)).toBe(400);
    }
    expect(mocks.generateTTS).not.toHaveBeenCalled();
  });

  it('refuses every sentence while the AI kill switch is on', async () => {
    await setAppSetting(db, 'ai_kill_switch', true);
    const response = await call(tts, TUTOR_API.tts, { cookie: me.cookie, body: body() });
    expect(response.status).toBe(403);
    expect(mocks.generateTTS).not.toHaveBeenCalled();
  });

  it('stops before the provider when the session is already at its cost ceiling', async () => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO usage_ledger (id, account_id, learner_id, session_id, kind, quantity, unit, cents)
       VALUES ('use_ceiling', $1, $2, $3, 'llm', 1, 'token', 100000) RETURNING id`,
      [me.accountId, me.learnerId, me.sessionId],
    );
    expect(rows).toHaveLength(1);
    const response = await call(tts, TUTOR_API.tts, { cookie: me.cookie, body: body() });
    expect(response.status).toBe(403);
    expect(mocks.generateTTS).not.toHaveBeenCalled();
    await db.query(`DELETE FROM usage_ledger WHERE id = 'use_ceiling'`);
  });
});

describe('the audio answer', () => {
  it('streams the provider bytes back with the audio content type and no cache', async () => {
    const marker = `KAIZEN-TTS-${randomUUID()}`;
    const audio = wav(4_000, marker);
    mocks.generateTTS.mockResolvedValue({ audio, format: 'wav' });

    const response = await post(body({ turnId: 'trn_1' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(response.headers.get('cache-control')).toBe('no-store');
    // 4,000 samples at 8 kHz is half a second.
    expect(response.headers.get('x-tutor-audio-ms')).toBe('500');
    const returned = new Uint8Array(await response.arrayBuffer());
    expect(returned.byteLength).toBe(audio.byteLength);
    expect(new TextDecoder().decode(returned.subarray(44, 44 + marker.length))).toBe(marker);
  });

  it('records one tts usage line in characters, attributed to the turn', async () => {
    const before = await usageRows(db, me.sessionId);
    const response = await post(body({ text: 'Half of six.', turnId: 'trn_usage' }));
    expect(response.status).toBe(200);
    const after = await usageRows(db, me.sessionId);
    expect(after).toHaveLength(before.length + 1);
    const line = after[after.length - 1];
    expect(line?.kind).toBe('tts');
    expect(line?.unit).toBe('character');
    expect(line?.quantity).toBe('Half of six.'.length);
    expect(line?.provider).toBe('openai-tts');

    const { rows } = await db.query<{ turn_id: string | null }>(
      `SELECT turn_id FROM usage_ledger WHERE session_id = $1 ORDER BY ts DESC LIMIT 1`,
      [me.sessionId],
    );
    expect(rows[0]?.turn_id).toBe('trn_usage');
  });

  it('answers 502 and no usage line when the provider fails', async () => {
    mocks.generateTTS.mockRejectedValue(new Error('provider exploded'));
    const before = await usageRows(db, me.sessionId);
    const response = await call(tts, TUTOR_API.tts, { cookie: me.cookie, body: body() });
    expect(response.status).toBe(502);
    expect(await usageRows(db, me.sessionId)).toHaveLength(before.length);
  });
});

describe('invariant (b): the sentence and its audio are never written anywhere', () => {
  it('writes nothing to the filesystem while audio is in flight', async () => {
    const marker = `KAIZEN-TTS-${randomUUID()}`;
    mocks.generateTTS.mockResolvedValue({ audio: wav(2_000, marker), format: 'wav' });
    const response = await post(body());
    expect(response.status).toBe(200);
    expect(
      mocks.writes.map((write) => write.api),
      'any filesystem write during a tts request',
    ).toEqual([]);
  });

  it('logs ids and lengths, never the sentence', async () => {
    const sentence = 'The denominator tells you how many equal parts there are.';
    const response = await post(body({ text: sentence }));
    expect(response.status).toBe(200);
    expect(mocks.logs.length).toBeGreaterThan(0);
    for (const line of mocks.logs) {
      expect(line).not.toContain(sentence);
      expect(line).not.toContain('denominator');
    }
    expect(mocks.logs.join(' ')).toContain(`chars=${sentence.length}`);
  });
});
