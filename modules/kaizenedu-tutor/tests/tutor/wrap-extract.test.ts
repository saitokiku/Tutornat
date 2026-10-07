/**
 * WRAP (spec §5.2, §5.5, §5.9) and problem extraction (spec R3): the summary
 * and profile stages, the deterministic fallback when the model is unusable,
 * minute settlement, the `session` evidence row, and the upload gate.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ streamLLM: vi.fn(), callLLM: vi.fn() }));
vi.mock('@/lib/ai/llm', () => ({ streamLLM: mocks.streamLLM, callLLM: mocks.callLLM }));

import { POST as extractRoute } from '@/app/(learner)/api/tutor/problem-extract/route';
import { POST as createSessionRoute } from '@/app/(learner)/api/tutor/session/route';
import { POST as wrapRoute } from '@/app/(learner)/api/tutor/wrap/route';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { acceptUpload, MAX_UPLOAD_BYTES, mediaTypeOf, parseExtraction } from '@/lib/tutor/extract';
import { resetRateLimitsForTests } from '@/lib/tutor/guards';
import { fallbackSummary, mergeProfile, parseSummaryReply } from '@/lib/tutor/wrap';
import type { CreateSessionResponse, ProblemExtractResponse, WrapResponse } from '@/lib/tutor/wire';

import { call } from './_api';
import { testDb } from './_db';
import { setUpLearner, type Learner } from './_turn-helpers';

let db: TutorDb;
let learner: Learner;
let other: Learner;

/** The shape `callLLM` answers; `tutorCallLLM` reads `.text` and the usage. */
function reply(text: string) {
  return { text, totalUsage: { inputTokens: 400, outputTokens: 150 }, usage: undefined };
}

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('DEFAULT_MODEL', 'google:gemini-3.5-flash');
  vi.stubEnv('GOOGLE_API_KEY', 'test-key-not-used');
  db = await testDb();
  learner = await setUpLearner(db, 'wrap-a@example.com');
  other = await setUpLearner(db, 'wrap-b@example.com');
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  resetRateLimitsForTests();
  mocks.callLLM.mockReset();
});

async function startedSession(who: Learner = learner): Promise<string> {
  // Each wrap settles twelve minutes; the trial is thirty, so reset the meter
  // rather than let case order decide whether a session may start.
  await db.query(`UPDATE subscriptions SET trial_minutes_used = 0 WHERE account_id = $1`, [
    who.accountId,
  ]);
  const created = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
    cookie: who.cookie,
    body: { mode: 'text', skillId: 'F8' },
  });
  const sessionId = created.body.session.id;
  await db.query(
    `UPDATE sessions SET phase = 'work', started_at = now() - interval '12 minutes',
       state = jsonb_set(
         jsonb_set(state, '{lastMeteredAt}', to_jsonb((now() - interval '12 minutes')::text)),
         '{checks}', '{"count": 3, "correct": 2}'::jsonb)
     WHERE id = $1`,
    [sessionId],
  );
  await db.query(
    `UPDATE sessions SET state = jsonb_set(state, '{skillsTouched}', '["F8"]'::jsonb) WHERE id = $1`,
    [sessionId],
  );
  return sessionId;
}

describe('the summary parser', () => {
  const counters = { skillsTouched: ['F8'], checks: 3, checksCorrect: 2 };

  it('reads a well-formed reply and carries the counters', () => {
    const summary = parseSummaryReply(
      '{"recap":"We added unlike denominators.","practice":["Do two more."],"tutorNote":"The learner answered 2 of 3 checks."}',
      counters,
    );
    expect(summary).toMatchObject({
      recap: 'We added unlike denominators.',
      practice: ['Do two more.'],
      checks: 3,
      checksCorrect: 2,
      skillsTouched: ['F8'],
    });
  });

  it('rejects a reply with no note and falls back to the counters', () => {
    expect(parseSummaryReply('{"recap":"ok"}', counters)).toBeNull();
    const fallback = fallbackSummary({
      ...counters,
      minutes: 12,
      openMisconceptions: ['add_across'],
    });
    expect(fallback.recap).toContain('12 minutes');
    expect(fallback.tutorNote).toContain('The learner');
    expect(fallback.tutorNote).toContain('add_across');
  });

  it('writes the parent-facing note in the third person, never as a person s words', () => {
    const fallback = fallbackSummary({
      skillsTouched: ['F8'],
      checks: 2,
      checksCorrect: 2,
      minutes: 9,
      openMisconceptions: [],
    });
    expect(fallback.tutorNote.startsWith('The learner')).toBe(true);
    expect(fallback.tutorNote).not.toMatch(/\bI\b|\bmy\b/);
  });
});

describe('the profile merge', () => {
  it('keeps the previous profile when the reply is not JSON', () => {
    const previous = {
      subjects: ['fractions'],
      recurringMisconceptions: ['add_across'],
      pace: 'steady' as const,
      explanationStylesThatWorked: ['number line'],
      notes: 'start with a bar',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(mergeProfile(previous, 'sorry, I cannot', new Date())).toEqual(previous);
  });

  it('merges the model s fields over the previous ones', () => {
    const merged = mergeProfile(
      null,
      '{"subjects":["fractions"],"pace":"fast","explanationStylesThatWorked":["bar model"],"recurringMisconceptions":[],"notes":"pick up F9 next"}',
      new Date('2026-09-04T00:00:00.000Z'),
    );
    expect(merged).toMatchObject({
      pace: 'fast',
      explanationStylesThatWorked: ['bar model'],
      notes: 'pick up F9 next',
    });
  });
});

describe('POST /api/tutor/wrap', () => {
  it('writes the summary and profile, settles minutes, and files the session evidence', async () => {
    const sessionId = await startedSession();
    mocks.callLLM
      .mockResolvedValueOnce(
        reply(
          '{"recap":"You added halves and quarters.","practice":["Try two unlike-denominator sums."],"tutorNote":"The learner answered 2 of 3 checks on adding unlike denominators."}',
        ),
      )
      .mockResolvedValueOnce(
        reply(
          '{"subjects":["fractions"],"recurringMisconceptions":["add_across"],"pace":"steady","explanationStylesThatWorked":["fraction bars"],"notes":"start from a bar next time"}',
        ),
      );

    const wrapped = await call<WrapResponse>(wrapRoute, TUTOR_API.wrap, {
      cookie: learner.cookie,
      body: { sessionId },
    });
    expect(wrapped.status).toBe(200);
    expect(wrapped.body.summary.recap).toBe('You added halves and quarters.');
    expect(wrapped.body.summary.checks).toBe(3);
    expect(wrapped.body.session.phase).toBe('ended');
    expect(wrapped.body.session.minutes).toBe(12);

    const profile = await db.query<{ profile: unknown }>(
      `SELECT profile FROM learner_profiles WHERE learner_id = $1`,
      [learner.learnerId],
    );
    expect(JSON.stringify(profile.rows[0]!.profile)).toContain('fraction bars');

    const evidence = await db.query<{ payload: unknown }>(
      `SELECT payload FROM evidence_events WHERE session_id = $1 AND type = 'session'`,
      [sessionId],
    );
    expect(evidence.rows).toHaveLength(1);
    expect(JSON.stringify(evidence.rows[0]!.payload)).toContain('"checks":3');

    const usage = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM usage_ledger WHERE session_id = $1`,
      [sessionId],
    );
    expect(Number(usage.rows[0]!.n)).toBe(2);
  });

  it('still ends the session when both model stages fail', async () => {
    const sessionId = await startedSession();
    mocks.callLLM.mockRejectedValue(new Error('provider down'));
    const wrapped = await call<WrapResponse>(wrapRoute, TUTOR_API.wrap, {
      cookie: learner.cookie,
      body: { sessionId },
    });
    expect(wrapped.status).toBe(200);
    expect(wrapped.body.session.phase).toBe('ended');
    expect(wrapped.body.summary.recap).toContain('minutes');
    expect(wrapped.body.summary.checks).toBe(3);
  });

  it('replays a stored summary without calling the model again', async () => {
    const sessionId = await startedSession();
    mocks.callLLM.mockResolvedValue(
      reply('{"recap":"Done.","practice":["Rest."],"tutorNote":"The learner finished."}'),
    );
    await call<WrapResponse>(wrapRoute, TUTOR_API.wrap, {
      cookie: learner.cookie,
      body: { sessionId },
    });
    const callsAfterFirst = mocks.callLLM.mock.calls.length;
    const again = await call<WrapResponse>(wrapRoute, TUTOR_API.wrap, {
      cookie: learner.cookie,
      body: { sessionId },
    });
    expect(again.body.summary.recap).toBe('Done.');
    expect(mocks.callLLM.mock.calls.length).toBe(callsAfterFirst);
  });

  it('answers 404 for another account s session', async () => {
    const sessionId = await startedSession();
    const wrapped = await call(wrapRoute, TUTOR_API.wrap, {
      cookie: other.cookie,
      body: { sessionId },
    });
    expect(wrapped.status).toBe(404);
  });
});

describe('the upload gate', () => {
  it('accepts the four types and reads the type from the name when the browser sent none', () => {
    expect(mediaTypeOf('image/jpeg', 'a.jpg')).toBe('image/jpeg');
    expect(mediaTypeOf('application/octet-stream', 'IMG_0042.HEIC')).toBe('image/heic');
    expect(mediaTypeOf('image/heif', 'x.heif')).toBe('image/heic');
    expect(mediaTypeOf('', 'homework.pdf')).toBe('application/pdf');
  });

  it('refuses nothing, the wrong type, and more than 8 MB', () => {
    expect(acceptUpload(null, null).ok).toBe(false);
    const gif = acceptUpload({ size: 10, type: 'image/gif', name: 'a.gif' }, new Uint8Array(10));
    expect(gif.ok).toBe(false);
    if (!gif.ok) expect(gif.rejection.code).toBe('BAD_TYPE');
    const huge = acceptUpload(
      { size: MAX_UPLOAD_BYTES + 1, type: 'image/png', name: 'a.png' },
      new Uint8Array(MAX_UPLOAD_BYTES + 1),
    );
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(huge.rejection.code).toBe('TOO_LARGE');
  });

  it('constrains extracted skill ids to the graph', () => {
    const parsed = parseExtraction(
      '{"title":"Worksheet 4","text":"Add $\\\\frac12+\\\\frac14$","skillIds":["F8","Z9","F8"]}',
    );
    expect(parsed).toMatchObject({ title: 'Worksheet 4', skillIds: ['F8'] });
    expect(parseExtraction('no json here')).toBeNull();
    expect(parseExtraction('{"title":"x","text":"","skillIds":[]}')).toBeNull();
  });
});

describe('POST /api/tutor/problem-extract', () => {
  async function upload(bytes: Uint8Array, type: string, name: string, cookie = learner.cookie) {
    const form = new FormData();
    form.set('file', new File([bytes.slice().buffer as ArrayBuffer], name, { type }), name);
    const request = new Request(`http://localhost${TUTOR_API.problemExtract}`, {
      method: 'POST',
      headers: { cookie },
      body: form,
    });
    const response = await extractRoute(request);
    return {
      status: response.status,
      body: (await response.json()) as ProblemExtractResponse & {
        success: boolean;
        errorCode?: string;
      },
    };
  }

  it('turns a readable page into a ready coursework row', async () => {
    mocks.callLLM.mockResolvedValueOnce(
      reply(
        '{"title":"Fractions worksheet 4","text":"1. Add $\\\\frac{1}{2} + \\\\frac{1}{4}$","skillIds":["F8"]}',
      ),
    );
    const result = await upload(new Uint8Array([137, 80, 78, 71]), 'image/png', 'page.png');
    expect(result.status).toBe(201);
    expect(result.body.coursework).toMatchObject({
      source: 'upload',
      status: 'ready',
      title: 'Fractions worksheet 4',
      skillIds: ['F8'],
    });
    expect(result.body.coursework.text).toContain('\\frac{1}{2}');
  });

  it('keeps a failed row with a reason so the learner can retry or type it', async () => {
    mocks.callLLM.mockResolvedValueOnce(reply('I could not see anything on that page.'));
    const result = await upload(new Uint8Array([255, 216, 255]), 'image/jpeg', 'blurry.jpg');
    expect(result.status).toBe(201);
    expect(result.body.coursework.status).toBe('failed');
    expect(result.body.coursework.text).toContain('type the problem instead');

    const { rows } = await db.query<{ extract_error: string | null }>(
      `SELECT extract_error FROM coursework WHERE id = $1`,
      [result.body.coursework.id],
    );
    expect(rows[0]!.extract_error).toBe('unreadable');
  });

  it('records a provider failure as a failed row, not a 500', async () => {
    mocks.callLLM.mockRejectedValueOnce(new Error('vision down'));
    const result = await upload(new Uint8Array([255, 216, 255]), 'image/jpeg', 'page.jpg');
    expect(result.status).toBe(201);
    expect(result.body.coursework.status).toBe('failed');
    const { rows } = await db.query<{ extract_error: string | null }>(
      `SELECT extract_error FROM coursework WHERE id = $1`,
      [result.body.coursework.id],
    );
    expect(rows[0]!.extract_error).toBe('provider_error');
  });

  it('refuses a type outside the four', async () => {
    const result = await upload(new Uint8Array([1, 2, 3]), 'image/gif', 'nope.gif');
    expect(result.status).toBe(400);
    expect(result.body.errorCode).toBe('INVALID_REQUEST');
  });
});
