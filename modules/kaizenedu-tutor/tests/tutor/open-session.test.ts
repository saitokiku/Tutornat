/**
 * The open session (D36): one press with no subject, the tutor asks, and a
 * `[[topic]]` tag from the model sets the subject and moves the session's
 * skill to it. Also the prompt lines that make the tutor speak first, say
 * its name, and check in without teaching (D37, D38).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  streamLLM: vi.fn(),
  callLLM: vi.fn(),
}));

vi.mock('@/lib/ai/llm', () => ({
  streamLLM: mocks.streamLLM,
  callLLM: mocks.callLLM,
}));

import { POST as guestRoute } from '@/app/(learner)/api/tutor/guest/route';
import { POST as createSessionRoute } from '@/app/(learner)/api/tutor/session/route';
import { POST as turnRoute } from '@/app/(learner)/api/tutor/turn/route';
import { PRODUCT } from '@/kaizen.config';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { buildSystemPrompt, type PromptContext } from '@/lib/tutor/prompts/build';
import { normalizeState } from '@/lib/tutor/session/state';
import type { CreateSessionResponse, GuestStartResponse } from '@/lib/tutor/wire';

import { call } from './_api';
import { testDb } from './_db';
import { readFrames, scriptedStream, setUpLearner } from './_turn-helpers';

let db: TutorDb;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('MODEL_ROUTES', '');
  vi.stubEnv('DEFAULT_MODEL', 'google:gemini-3.5-flash');
  vi.stubEnv('GOOGLE_API_KEY', 'test-key-not-used');
  db = await testDb();
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

async function sessionRow(id: string) {
  const { rows } = await db.query<{ skill_id: string | null; state: unknown }>(
    `SELECT skill_id, state FROM sessions WHERE id = $1`,
    [id],
  );
  return rows[0]!;
}

function cookieOf(headers: Headers): string {
  const header = headers.get('set-cookie') ?? '';
  return header.split(';')[0] ?? '';
}

async function turn(cookie: string, sessionId: string, chunks: readonly string[], text: string) {
  mocks.streamLLM.mockReturnValueOnce(scriptedStream(chunks));
  const response = await turnRoute(
    new Request(`http://test${TUTOR_API.turn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        sessionId,
        text,
        inputMode: 'text',
        clientTurnId: `open-${text.replace(/[^A-Za-z0-9]/g, '').slice(0, 24) || 'greet'}-${Date.now()}`,
      }),
    }),
  );
  if (response.status !== 200) throw new Error(`turn ${response.status}: ${await response.text()}`);
  return readFrames(response);
}

describe('an open session', () => {
  it('starts from one press with no subject and the catch-all skill', async () => {
    const started = await call<GuestStartResponse>(guestRoute, TUTOR_API.guest, {
      body: { level: '6-7', mode: 'voice', open: true },
    });
    expect(started.status).toBe(201);
    const session = started.body.session;
    expect(session).not.toBeNull();
    expect(session!.session.skillId).toBe('S-other');
    const row = await sessionRow(session!.session.id);
    const state = normalizeState(row.state, session!.band, new Date());
    expect(state.target).toBe('topic');
    expect(state.topic).toEqual({ subject: 'other', text: '' });
    expect(state.skillsTouched).toEqual(['S-other']);
  });

  it('takes the subject and the words from the topic tag and moves the skill', async () => {
    const started = await call<GuestStartResponse>(guestRoute, TUTOR_API.guest, {
      body: { level: '4-5', mode: 'text', open: true },
    });
    const cookie = cookieOf(started.headers);
    const id = started.body.session!.session.id;
    // The greeting: no tag yet, the tutor asks.
    await turn(cookie, id, ['Hi, I am here. What are you working on today?'], '');
    expect((await sessionRow(id)).skill_id).toBe('S-other');
    // The answer: the model names the subject; a second tag in the same turn is dropped.
    const frames = await turn(
      cookie,
      id,
      [
        'Long division. [[topic {"subject":"math","text":"long division with remainders"}]]Where does it stop making sense?',
        '[[topic {"subject":"science","text":"no"}]]',
      ],
      'long division, I get lost with remainders',
    );
    const spoken = frames
      .filter((frame) => frame.type === 'text_delta')
      .map((frame) => (frame as { text: string }).text)
      .join('');
    expect(spoken).not.toContain('[[topic');
    const row = await sessionRow(id);
    expect(row.skill_id).toBe('S-math');
    const state = normalizeState(row.state, '9-12', new Date());
    expect(state.topic).toEqual({ subject: 'math', text: 'long division with remainders' });
    expect(state.skillsTouched).toEqual(['S-other', 'S-math']);
    // The second tag was dropped, and the drop is counted on the state.
    expect(state.droppedActions).toBe(1);
  });

  it('never moves a graph skill: the tag is dropped on a fractions session', async () => {
    const learner = await setUpLearner(db, 'open-graph@example.com');
    const created = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      body: { mode: 'text', skillId: 'F3' },
    });
    expect(created.status).toBe(201);
    const id = created.body.session.id;
    await turn(
      learner.cookie,
      id,
      ['Sure. [[topic {"subject":"science","text":"moon phases"}]]Let us look at thirds.'],
      'can we do science instead',
    );
    const row = await sessionRow(id);
    expect(row.skill_id).toBe('F3');
    expect(normalizeState(row.state, '13-17', new Date()).topic).toBeNull();
  });

  it('refuses a malformed tag and an unknown subject', async () => {
    const started = await call<GuestStartResponse>(guestRoute, TUTOR_API.guest, {
      body: { level: 'adult', mode: 'text', open: true },
    });
    const cookie = cookieOf(started.headers);
    const id = started.body.session!.session.id;
    await turn(cookie, id, ['Hello.'], '');
    await turn(
      cookie,
      id,
      ['Okay. [[topic {"subject":"astrology","text":"x"}]][[topic not json]]Go on.'],
      'stars',
    );
    const row = await sessionRow(id);
    expect(row.skill_id).toBe('S-other');
    expect(normalizeState(row.state, 'adult', new Date()).topic).toEqual({
      subject: 'other',
      text: '',
    });
  });
});

describe('the prompt for an open session', () => {
  function context(overrides: Partial<PromptContext> = {}): PromptContext {
    return {
      band: '9-12',
      phase: 'greet',
      remainingMs: 15 * 60_000,
      target: 'topic',
      topic: { subject: 'other', text: '' },
      level: '6th to 7th grade',
      skill: {
        id: 'S-other',
        name: 'Something else',
        estimate: 0.5,
        status: 'not_started',
        nItems: 0,
      },
      prereqs: [],
      openMisconceptions: [],
      profile: null,
      coursework: null,
      boardLines: [],
      pendingCheck: null,
      lastCheckResult: null,
      checkDue: null,
      diagnostic: null,
      delayedCheck: null,
      coach: { attempts: 0, showMeUnlocked: false, answerShown: false, askedForAnswer: false },
      reteachUsed: [],
      silence: false,
      greet: true,
      wrap: { due: false, softContinueAvailable: false, extended: false },
      learnerTurnsSoFar: 0,
      breakDue: false,
      ...overrides,
    };
  }

  it('says the name, asks what they are working on, and asks for the topic tag', () => {
    const system = buildSystemPrompt(context());
    expect(system).toContain(`Your name is ${PRODUCT.tutorName}`);
    expect(system).toContain('Subject: not known yet');
    expect(system).toContain('[[topic {"subject":"...","text":"..."}]]');
    expect(system).toContain('Say your name once in the greeting');
    expect(system).not.toContain('What the learner said they want to work on');
  });

  it('a check-in checks in and does not teach', () => {
    const system = buildSystemPrompt(context({ greet: false, silence: true, phase: 'work' }));
    expect(system).toContain('Check in, do not teach');
    expect(system).toContain('No new content, no hint, no next step');
  });
});
