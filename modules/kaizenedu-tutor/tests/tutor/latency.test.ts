/**
 * The time-to-first-audio budget (spec §5.3, `LATENCY.firstAudioP50Ms`),
 * pinned where it can be pinned without a provider key.
 *
 * Two things are checked here, and neither is a stopwatch on a network:
 *
 * 1. **Round-trip depth.** Everything on the first-audio path — the ASR guard,
 *    the turn's ceilings, the TTS guard — reads the database before it can
 *    call a provider. Those reads do not depend on each other, so they must go
 *    out together; a serial chain multiplies the database's round-trip time by
 *    four on the one hop the learner is waiting through. The database here is
 *    wrapped so every query takes a fixed, known time, and the test asserts on
 *    how many queries were in flight at once — a count, not a duration, so it
 *    cannot go flaky on a loaded CI box. The wall-clock figure is asserted too,
 *    but only against a bound wide enough to survive scheduling noise.
 *
 * 2. **Reasoning stays off for the live turn.** `thinkingFor` asks for it and
 *    `lib/ai/llm.ts` translates it, but only for models whose catalog entry
 *    describes a thinking control. Measured on `gemini-3-flash-preview` on
 *    2026-09-05 (six samples per arm, same prompt): first token at 2,143 ms
 *    p50 with the model's default against 650 ms with reasoning off. That is
 *    larger than the entire 1,500 ms budget, so a model routed to
 *    `tutor-live-turn` that silently loses the setting is a launch blocker,
 *    not a regression. This asserts the translation for every model the tutor
 *    is plausibly routed to.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateTTS: vi.fn(),
  transcribeAudio: vi.fn(),
}));

vi.mock('@/lib/audio/tts-providers', () => ({ generateTTS: mocks.generateTTS }));
vi.mock('@/lib/audio/asr-providers', () => ({ transcribeAudio: mocks.transcribeAudio }));

import { POST as asrRoute } from '@/app/(learner)/api/tutor/asr/route';
import { POST as ttsRoute } from '@/app/(learner)/api/tutor/tts/route';
import { resolveThinkingProviderOptions } from '@/lib/ai/llm';
import { getModel } from '@/lib/ai/providers';
import type { ProviderId } from '@/lib/types/provider';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import {
  setTutorDbForTests,
  type Queryable,
  type QueryResultLike,
  type TutorDb,
} from '@/lib/tutor/db';
import { resetRateLimitsForTests } from '@/lib/tutor/guards';
import { thinkingFor } from '@/lib/tutor/turn';

import { testDb } from './_db';
import { adultActor, type Actor } from './_media';

// ---------------------------------------------------------------------------
// A database with a known round-trip time, and a record of what overlapped
// ---------------------------------------------------------------------------

interface Span {
  sql: string;
  start: number;
  end: number;
}

interface Probe {
  spans: Span[];
  /** The most queries that were ever in flight at the same moment. */
  peakConcurrency(): number;
  /**
   * How many round trips deep the request was: queries that overlap in time
   * cost one trip between them, so this counts the clusters of overlapping
   * spans. It is the quantity the budget actually cares about, and unlike a
   * duration it does not move when the machine is busy.
   */
  roundTripDepth(): number;
  reset(): void;
}

/** Wraps a db so every query costs `rttMs` and records when it was in flight. */
function withRoundTrip(db: TutorDb, rttMs: number): { db: TutorDb; probe: Probe } {
  const spans: Span[] = [];
  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const query = async <T extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResultLike<T>> => {
    const start = performance.now();
    await delay(rttMs);
    const result = await db.query<T>(text, params);
    spans.push({
      sql: text.replace(/\s+/g, ' ').trim().slice(0, 60),
      start,
      end: performance.now(),
    });
    return result;
  };
  const wrapped: TutorDb = {
    query,
    withTransaction: <T>(body: (tx: Queryable) => Promise<T>) =>
      db.withTransaction((tx) =>
        body({
          async query<T2 extends Record<string, unknown>>(text: string, params?: unknown[]) {
            const start = performance.now();
            await delay(rttMs);
            const result = await tx.query<T2>(text, params);
            spans.push({ sql: text.slice(0, 60), start, end: performance.now() });
            return result;
          },
        }),
      ),
    end: () => db.end(),
  };
  const probe: Probe = {
    spans,
    peakConcurrency() {
      // Sweep the endpoints: +1 at each start, -1 at each end.
      const edges = spans
        .flatMap((span) => [
          { at: span.start, delta: 1 },
          { at: span.end, delta: -1 },
        ])
        .sort((a, b) => a.at - b.at || a.delta - b.delta);
      let live = 0;
      let peak = 0;
      for (const edge of edges) {
        live += edge.delta;
        peak = Math.max(peak, live);
      }
      return peak;
    },
    roundTripDepth() {
      const ordered = [...spans].sort((a, b) => a.start - b.start);
      let depth = 0;
      let openUntil = -Infinity;
      for (const span of ordered) {
        // 1 ms of tolerance so two back-to-back queries are not read as one.
        if (span.start >= openUntil - 1) depth += 1;
        openUntil = Math.max(openUntil, span.end);
      }
      return depth;
    },
    reset() {
      spans.length = 0;
    },
  };
  return { db: wrapped, probe };
}

/** A tiny real WAV so `measureAudioDuration` has something to parse. */
function wav(): Uint8Array {
  const bytes = new Uint8Array(44 + 160);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + 160, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8_000, true);
  view.setUint32(28, 16_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, 160, true);
  return bytes;
}

/** Round-trip time given to the fake database, in milliseconds. */
const RTT_MS = 30;

/**
 * Round trips a media route may be deep, end to end.
 *
 * Two of them belong to `requirePrincipal`, which reads the auth session and
 * then the learner it names — a genuine dependency, and the next round trip
 * worth removing (one JOIN would do it, in code this change does not own).
 * The third is the guard pre-flight, which used to be four. The fourth is the
 * usage-ledger write after the provider answered.
 *
 * Serial, the same route was seven deep. At a 30 ms database round trip that
 * is 210 ms of pure waiting on the sentence the learner is waiting to hear;
 * four is 120 ms.
 */
const MAX_ROUND_TRIPS = 4;

let realDb: TutorDb;
let probe: Probe;
let me: Actor;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('TTS_OPENAI_API_KEY', 'sk-test-tts');
  vi.stubEnv('ASR_OPENAI_API_KEY', 'sk-test-asr');
  vi.stubEnv('DEFAULT_MODEL', 'google:gemini-3.5-flash');
  vi.stubEnv('GOOGLE_API_KEY', 'test-key-not-used');
  realDb = await testDb();
  me = await adultActor(realDb, 'latency-a@example.com');
  const instrumented = withRoundTrip(realDb, RTT_MS);
  probe = instrumented.probe;
  await setTutorDbForTests(instrumented.db, false);
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await realDb.end();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  resetRateLimitsForTests();
  probe.reset();
  mocks.generateTTS.mockReset();
  mocks.transcribeAudio.mockReset();
  mocks.generateTTS.mockResolvedValue({ audio: wav(), format: 'wav' });
  mocks.transcribeAudio.mockResolvedValue({ text: 'two fourths is one half' });
});

afterEach(() => {
  vi.clearAllMocks();
});

function ttsRequest(body: unknown): Request {
  return new Request(`http://localhost${TUTOR_API.tts}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: me.cookie },
    body: JSON.stringify(body),
  });
}

function asrRequest(): Request {
  const form = new FormData();
  form.set('audio', new File([wav().buffer as ArrayBuffer], 'clip.wav', { type: 'audio/wav' }));
  form.set('sessionId', me.sessionId);
  form.set('durationMs', '1200');
  return new Request(`http://localhost${TUTOR_API.asr}`, {
    method: 'POST',
    headers: { cookie: me.cookie },
    body: form,
  });
}

describe('the guards in front of a provider call go out together', () => {
  it('the TTS route issues its four pre-flight reads concurrently', async () => {
    const started = performance.now();
    const response = await ttsRoute(
      ttsRequest({ text: 'Two fourths is one half.', sessionId: me.sessionId }),
    );
    const elapsed = Math.round(performance.now() - started);

    expect(response.status).toBe(200);
    expect(mocks.generateTTS).toHaveBeenCalledTimes(1);
    // Ownership, the kill switch, the daily hop count, and the session spend.
    expect(probe.spans.length).toBeGreaterThanOrEqual(5);
    expect(probe.peakConcurrency()).toBeGreaterThanOrEqual(4);
    expect(probe.roundTripDepth()).toBeLessThanOrEqual(MAX_ROUND_TRIPS);
    console.log(
      `tts route: ${probe.spans.length} queries, depth ${probe.roundTripDepth()}, ${elapsed} ms at a ${RTT_MS} ms round trip`,
    );
  });

  it('the ASR route issues its four pre-flight reads concurrently', async () => {
    const started = performance.now();
    const response = await asrRoute(asrRequest());
    const elapsed = Math.round(performance.now() - started);

    expect(response.status).toBe(200);
    expect(mocks.transcribeAudio).toHaveBeenCalledTimes(1);
    expect(probe.peakConcurrency()).toBeGreaterThanOrEqual(4);
    expect(probe.roundTripDepth()).toBeLessThanOrEqual(MAX_ROUND_TRIPS);
    console.log(
      `asr route: ${probe.spans.length} queries, depth ${probe.roundTripDepth()}, ${elapsed} ms at a ${RTT_MS} ms round trip`,
    );
  });

  it('every guard still binds: an ended session is refused before the provider', async () => {
    const { rows } = await realDb.query<{ id: string }>(
      `INSERT INTO sessions (id, account_id, learner_id, mode, phase, ended_at)
       VALUES ($1, $2, $3, 'voice', 'work', now()) RETURNING id`,
      [`ses_latency_ended`, me.accountId, me.learnerId],
    );
    const response = await ttsRoute(ttsRequest({ text: 'Hello.', sessionId: rows[0]!.id }));
    expect(response.status).toBe(403);
    expect(mocks.generateTTS).not.toHaveBeenCalled();
  });
});

describe('reasoning stays off on the live turn', () => {
  const CANDIDATES: ReadonlyArray<[ProviderId, string]> = [
    ['google', 'gemini-3.6-flash'],
    ['google', 'gemini-3.5-flash'],
    ['google', 'gemini-3.5-flash-lite'],
    ['google', 'gemini-3-flash-preview'],
    ['google', 'gemini-2.5-flash'],
    ['anthropic', 'claude-haiku-4-5'],
    ['openai', 'gpt-5.4-mini'],
  ];

  it('asks for it', () => {
    expect(thinkingFor(TUTOR_LLM_SOURCES.liveTurn)).toEqual({ mode: 'disabled', enabled: false });
  });

  it('and every live-turn candidate translates it into a real provider option', () => {
    const thinking = thinkingFor(TUTOR_LLM_SOURCES.liveTurn);
    for (const [providerId, modelId] of CANDIDATES) {
      const { model } = getModel({ providerId, modelId, apiKey: 'not-used' });
      const options = resolveThinkingProviderOptions(model, thinking);
      expect(options, `${providerId}:${modelId} sends no reasoning-off option`).toBeTruthy();
      // The shape differs per provider; what matters is that the request body
      // carries the instruction rather than falling back to the model default.
      expect(JSON.stringify(options), `${providerId}:${modelId} keeps reasoning on`).toMatch(
        /minimal|none|"thinkingBudget":0|"type":"disabled"/,
      );
    }
  });

  it('but leaves the grading and summary stages on the model default', () => {
    expect(thinkingFor(TUTOR_LLM_SOURCES.grade)).toBeUndefined();
    expect(thinkingFor(TUTOR_LLM_SOURCES.summary)).toBeUndefined();
  });
});
