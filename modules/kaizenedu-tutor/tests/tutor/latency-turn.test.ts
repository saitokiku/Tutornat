/**
 * The turn engine's own round-trip depth, and the session-start warm-up
 * (spec §5.3, `LATENCY.firstAudioP50Ms`).
 *
 * `startTurn` reads the database several times before it can open the model
 * stream, and the learner is waiting through every one of them. The reads that
 * do not depend on each other now go out together; this pins that, the same
 * way `tests/tutor/latency.test.ts` pins the two media routes — by counting
 * round trips against a database with a known, fixed round-trip time, not by
 * timing a network.
 *
 * The model is scripted (`@/lib/ai/llm` is mocked), so no provider is called
 * and nothing here depends on a key.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  streamLLM: vi.fn(),
  callLLM: vi.fn(),
}));

vi.mock('@/lib/ai/llm', () => ({
  streamLLM: mocks.streamLLM,
  callLLM: mocks.callLLM,
}));

import { POST as createSessionRoute } from '@/app/(learner)/api/tutor/session/route';
import { TUTOR_API } from '@/lib/tutor/contracts';
import {
  setTutorDbForTests,
  type Queryable,
  type QueryResultLike,
  type TutorDb,
} from '@/lib/tutor/db';
import { resetRateLimitsForTests } from '@/lib/tutor/guards';
import { startTurn } from '@/lib/tutor/turn';
import { resetWarmStateForTests, warmTurnPath } from '@/lib/tutor/turn/warm';
import type { CreateSessionResponse } from '@/lib/tutor/wire';

import { call } from './_api';
import { testDb } from './_db';
import { drain, scriptedStream, setUpLearner, type Learner } from './_turn-helpers';

interface Span {
  start: number;
  end: number;
}

interface Probe {
  spans: Span[];
  /** Clusters of overlapping queries: how many round trips deep the work was. */
  roundTripDepth(): number;
  reset(): void;
}

const RTT_MS = 25;

/**
 * Round trips a turn may be deep before the first `sentence` frame — the frame
 * the client turns into its first TTS request, so everything counted here is
 * inside the first-audio budget (spec §5.3).
 *
 * Serial, it was six: the session, the replay lookup, the entitlement, the
 * session spend, the learner's daily spend, then the prompt context. The
 * session and the replay lookup are independent of each other, and so are the
 * three entitlement/spend reads, which leaves three.
 */
const MAX_ROUND_TRIPS_TO_FIRST_SENTENCE = 3;

/** The whole turn, including the evidence and state writes after the stream. */
const MAX_ROUND_TRIPS = 10;

function withRoundTrip(db: TutorDb, rttMs: number): { db: TutorDb; probe: Probe } {
  const spans: Span[] = [];
  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
  const timed = async <T>(run: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    await delay(rttMs);
    const result = await run();
    spans.push({ start, end: performance.now() });
    return result;
  };
  const wrapped: TutorDb = {
    query: <T extends Record<string, unknown>>(text: string, params?: unknown[]) =>
      timed<QueryResultLike<T>>(() => db.query<T>(text, params)),
    withTransaction: <T>(body: (tx: Queryable) => Promise<T>) =>
      db.withTransaction((tx) =>
        body({
          query: <T2 extends Record<string, unknown>>(text: string, params?: unknown[]) =>
            timed<QueryResultLike<T2>>(() => tx.query<T2>(text, params)),
        }),
      ),
    end: () => db.end(),
  };
  const probe: Probe = {
    spans,
    roundTripDepth() {
      const ordered = [...spans].sort((a, b) => a.start - b.start);
      let depth = 0;
      let openUntil = -Infinity;
      for (const span of ordered) {
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

let realDb: TutorDb;
let instrumented: TutorDb;
let probe: Probe;
let learner: Learner;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('DEFAULT_MODEL', 'google:gemini-3.5-flash');
  vi.stubEnv('GOOGLE_API_KEY', 'test-key-not-used');
  realDb = await testDb();
  learner = await setUpLearner(realDb, 'latency-turn@example.com');
  const wrapped = withRoundTrip(realDb, RTT_MS);
  instrumented = wrapped.db;
  probe = wrapped.probe;
}, 60_000);

afterAll(async () => {
  await setTutorDbForTests(null);
  await realDb.end();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  resetRateLimitsForTests();
  resetWarmStateForTests();
  mocks.streamLLM.mockReset();
  mocks.callLLM.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

async function newSession(): Promise<string> {
  await setTutorDbForTests(realDb, false);
  const created = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
    cookie: learner.cookie,
    body: { mode: 'voice', skillId: 'F8' },
  });
  if (created.status !== 201) throw new Error(`create session failed: ${created.body.error}`);
  return created.body.session.id;
}

describe('the reads in front of the model stream go out together', () => {
  it('one turn stays inside its round-trip budget', async () => {
    const sessionId = await newSession();
    mocks.streamLLM.mockReturnValue(
      scriptedStream(['Good question. ', 'Two fourths is one half.']),
    );
    probe.reset();

    const started = await startTurn({
      db: instrumented,
      principal: learner.principal,
      body: {
        sessionId,
        clientTurnId: 'ct-latency-1',
        inputMode: 'voice',
        text: 'Why is two fourths one half?',
      },
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    // The depth that matters is the one paid before the learner hears
    // anything, so it is snapshotted at the first `sentence` frame — the frame
    // the playback queue turns into a TTS request.
    let depthAtFirstSentence: number | null = null;
    const events = [];
    for await (const event of started.events) {
      if (event.type === 'sentence' && depthAtFirstSentence === null) {
        depthAtFirstSentence = probe.roundTripDepth();
      }
      events.push(event);
    }
    console.log(
      `turn engine: ${probe.spans.length} queries, depth ${probe.roundTripDepth()} for the whole turn, ${String(depthAtFirstSentence)} before the first sentence, at a ${RTT_MS} ms round trip`,
    );

    expect(events.at(-1)?.type).toBe('done');
    expect(depthAtFirstSentence).not.toBeNull();
    expect(depthAtFirstSentence ?? 99).toBeLessThanOrEqual(MAX_ROUND_TRIPS_TO_FIRST_SENTENCE);
    expect(probe.roundTripDepth()).toBeLessThanOrEqual(MAX_ROUND_TRIPS);
  });

  it('a replayed clientTurnId still costs no model call', async () => {
    const sessionId = await newSession();
    mocks.streamLLM.mockReturnValue(scriptedStream(['One half. ']));
    const body = {
      sessionId,
      clientTurnId: 'ct-latency-replay',
      inputMode: 'voice' as const,
      text: 'Say it again?',
    };
    const first = await startTurn({ db: instrumented, principal: learner.principal, body });
    expect(first.ok).toBe(true);
    if (first.ok) await drain(first.events);

    mocks.streamLLM.mockClear();
    const second = await startTurn({ db: instrumented, principal: learner.principal, body });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const events = await drain(second.events);
    expect(mocks.streamLLM).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === 'text_delta')).toBe(true);
  });

  it("another account's turn row is never replayed", async () => {
    const stranger = await (async () => {
      await setTutorDbForTests(realDb, false);
      return setUpLearner(realDb, 'latency-turn-other@example.com');
    })();
    const sessionId = await newSession();
    mocks.streamLLM.mockReturnValue(scriptedStream(['Mine. ']));
    const body = {
      sessionId,
      clientTurnId: 'ct-latency-shared',
      inputMode: 'voice' as const,
      text: 'Hello?',
    };
    const mine = await startTurn({ db: instrumented, principal: learner.principal, body });
    if (mine.ok) await drain(mine.events);

    const theirs = await startTurn({
      db: instrumented,
      principal: stranger.principal,
      body,
    });
    expect(theirs.ok).toBe(false);
    if (!theirs.ok) expect(theirs.code).toBe('NOT_FOUND');
  });
});

/** Warming must never reach a real host from a test. */
const noNetwork: typeof fetch = () => Promise.reject(new Error('no network in tests'));

describe('the session-start warm-up', () => {
  it('resolves the live-turn model once and never throws', async () => {
    const first = await warmTurnPath('13-17', { fetchImpl: noNetwork });
    expect(first.prompts).toBe(true);
    expect(first.model).toBe(true);

    const second = await warmTurnPath('13-17', { fetchImpl: noNetwork });
    expect(second.prompts).toBe(false);
    expect(second.model).toBe(false);
  });

  it('still resolves a model when the host configures none', async () => {
    // This used to assert the opposite, and the opposite is what shipped: on a
    // host with no DEFAULT_MODEL the warm-up quietly gave up and every turn
    // then died with "No model could be resolved". The model now comes from a
    // constant compiled into the bundle, so there is no such host.
    vi.stubEnv('DEFAULT_MODEL', '');
    resetWarmStateForTests();
    const result = await warmTurnPath('adult', { fetchImpl: noNetwork });
    expect(result.model).toBe(true);
    // The connection still fails, because warming a socket needs a network and
    // this test has none. A warm-up that throws would take the session with it.
    expect(result.connection).toBe(false);
    vi.stubEnv('DEFAULT_MODEL', 'google:gemini-3.5-flash');
  });
});
