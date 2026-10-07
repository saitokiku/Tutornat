/**
 * The session, check, progress, and coursework routes (spec R3, R4, R7, R12).
 * Creation gates, replay after a reload, heartbeat metering, grading against
 * the server-side key, and account scoping on every read.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ streamLLM: vi.fn(), callLLM: vi.fn() }));
vi.mock('@/lib/ai/llm', () => ({ streamLLM: mocks.streamLLM, callLLM: mocks.callLLM }));

import {
  DELETE as deleteCourseworkRoute,
  GET as listCourseworkRoute,
  PATCH as patchCourseworkRoute,
  POST as createCourseworkRoute,
} from '@/app/(learner)/api/tutor/coursework/route';
import { GET as progressRoute } from '@/app/(learner)/api/tutor/progress/route';
import { POST as answerCheckRoute } from '@/app/(learner)/api/tutor/check/route';
import {
  GET as getSessionRoute,
  PATCH as patchSessionRoute,
  POST as createSessionRoute,
} from '@/app/(learner)/api/tutor/session/route';
import { PLAN } from '@/kaizen.config';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { resetRateLimitsForTests } from '@/lib/tutor/guards';
import { setAppSetting } from '@/lib/tutor/settings';
import { startTurn } from '@/lib/tutor/turn';
import type {
  CheckAnswerResponse,
  CourseworkItemResponse,
  CreateSessionResponse,
  GetSessionResponse,
  ListCourseworkResponse,
  ProgressResponse,
  UpdateSessionResponse,
} from '@/lib/tutor/wire';

import { call } from './_api';
import { testDb } from './_db';
import { drain, scriptedStream, setUpLearner, type Learner } from './_turn-helpers';

let db: TutorDb;
let learner: Learner;
let other: Learner;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('DEFAULT_MODEL', 'google:gemini-3.5-flash');
  vi.stubEnv('GOOGLE_API_KEY', 'test-key-not-used');
  db = await testDb();
  learner = await setUpLearner(db, 'routes-a@example.com');
  other = await setUpLearner(db, 'routes-b@example.com');
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  resetRateLimitsForTests();
  mocks.streamLLM.mockReset();
});

async function createSession(who: Learner = learner, body: Record<string, unknown> = {}) {
  return call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
    cookie: who.cookie,
    body: { mode: 'voice', ...body },
  });
}

describe('POST /api/tutor/session', () => {
  it('creates a session with the band, the entitlement, and the band session length', async () => {
    const created = await createSession();
    expect(created.status).toBe(201);
    expect(created.body.band).toBe('13-17');
    expect(created.body.sessionMinutes).toBe(25);
    expect(created.body.session.phase).toBe('greet');
    expect(created.body.entitlement.remainingMinutes).toBe(PLAN.trialMinutes13Plus);
    // The learner comes from the principal, never from the body.
    expect(created.body.session.learnerId).toBe(learner.learnerId);
  });

  it('refuses with GATE_CLOSED when the AI kill switch is on', async () => {
    await setAppSetting(db, 'ai_kill_switch', true);
    const created = await createSession();
    await setAppSetting(db, 'ai_kill_switch', false);
    expect(created.status).toBe(503);
    expect(created.body.errorCode).toBe('GATE_CLOSED');
  });

  it('refuses with LEARNER_LOCKED when the profile is not active', async () => {
    await db.query(`UPDATE learners SET status = 'locked' WHERE id = $1`, [learner.learnerId]);
    const created = await createSession();
    await db.query(`UPDATE learners SET status = 'active' WHERE id = $1`, [learner.learnerId]);
    expect(created.status).toBe(403);
    expect(created.body.errorCode).toBe('LEARNER_LOCKED');
  });

  it('refuses with CAP_REACHED and hands back the entitlement when the minutes are gone', async () => {
    await db.query(`UPDATE subscriptions SET trial_minutes_used = $2 WHERE account_id = $1`, [
      learner.accountId,
      PLAN.trialMinutes13Plus,
    ]);
    const created = await createSession();
    await db.query(`UPDATE subscriptions SET trial_minutes_used = 0 WHERE account_id = $1`, [
      learner.accountId,
    ]);
    expect(created.status).toBe(403);
    expect(created.body.errorCode).toBe('CAP_REACHED');
    const body = created.body as unknown as { entitlement: { remainingMinutes: number } };
    expect(body.entitlement.remainingMinutes).toBe(0);
  });
});

describe('GET /api/tutor/session', () => {
  it('replays the turns and the board for a reload', async () => {
    const created = await createSession(learner, { mode: 'text', skillId: 'F8' });
    const sessionId = created.body.session.id;
    await db.query(`UPDATE sessions SET phase = 'work' WHERE id = $1`, [sessionId]);
    mocks.streamLLM.mockReturnValueOnce(
      scriptedStream([
        'Here is the bar. [[wb {"type":"wb_draw_shape","shape":"rectangle","x":40,"y":40,"width":300,"height":60,"elementId":"bar1"}]]',
      ]),
    );
    const started = await startTurn({
      db,
      principal: learner.principal,
      body: { sessionId, text: 'show me', inputMode: 'text', clientTurnId: 'ct-reload' },
    });
    if (!started.ok) throw new Error('expected a stream');
    await drain(started.events);

    const read = await call<GetSessionResponse>(getSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      query: { id: sessionId },
    });
    expect(read.status).toBe(200);
    expect(read.body.turns).toHaveLength(2);
    expect(read.body.board).toHaveLength(1);
    expect(read.body.board[0]).toMatchObject({ type: 'wb_draw_shape', elementId: 'bar1' });
  });

  it('answers 404 for another account s session', async () => {
    const created = await createSession();
    const read = await call<GetSessionResponse>(getSessionRoute, TUTOR_API.session, {
      cookie: other.cookie,
      query: { id: created.body.session.id },
    });
    expect(read.status).toBe(404);
    expect(read.body.errorCode).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/tutor/session', () => {
  it('meters whole minutes on a heartbeat and answers the entitlement', async () => {
    const created = await createSession();
    const sessionId = created.body.session.id;
    // Six minutes of wall clock since the session was last metered.
    await db.query(
      `UPDATE sessions SET started_at = now() - interval '6 minutes',
         state = jsonb_set(state, '{lastMeteredAt}', to_jsonb((now() - interval '6 minutes')::text))
       WHERE id = $1`,
      [sessionId],
    );
    const beat = await call<UpdateSessionResponse>(patchSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      method: 'PATCH',
      body: { sessionId, action: 'heartbeat' },
    });
    expect(beat.status).toBe(200);
    expect(beat.body.session.minutes).toBe(6);
    expect(beat.body.entitlement.usedMinutes).toBe(6);
    expect(beat.body.entitlement.remainingMinutes).toBe(PLAN.trialMinutes13Plus - 6);
    await db.query(`UPDATE subscriptions SET trial_minutes_used = 0 WHERE account_id = $1`, [
      learner.accountId,
    ]);
  });

  it('records thumbs and ends the session', async () => {
    const created = await createSession();
    const sessionId = created.body.session.id;
    const thumbs = await call<UpdateSessionResponse>(patchSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      method: 'PATCH',
      body: { sessionId, action: 'thumbs', thumbs: 'up' },
    });
    expect(thumbs.body.session.thumbs).toBe('up');
    const ended = await call<UpdateSessionResponse>(patchSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      method: 'PATCH',
      body: { sessionId, action: 'end' },
    });
    expect(ended.body.session.phase).toBe('ended');
    expect(ended.body.session.endedAt).not.toBeNull();
  });

  it('answers 404 for another account s session', async () => {
    const created = await createSession();
    const patched = await call(patchSessionRoute, TUTOR_API.session, {
      cookie: other.cookie,
      method: 'PATCH',
      body: { sessionId: created.body.session.id, action: 'end' },
    });
    expect(patched.status).toBe(404);
  });
});

describe('POST /api/tutor/check', () => {
  async function sessionWithPendingCheck(): Promise<string> {
    const created = await createSession(learner, { mode: 'text', skillId: 'F8' });
    const sessionId = created.body.session.id;
    await db.query(`UPDATE sessions SET phase = 'work' WHERE id = $1`, [sessionId]);
    mocks.streamLLM.mockReturnValueOnce(
      scriptedStream([
        'Try this. [[check {"type":"numeric","stem":"What is one half plus one quarter?","answer":{"value":0.75,"tolerance":0.01},"skillId":"F8"}]]',
      ]),
    );
    const started = await startTurn({
      db,
      principal: learner.principal,
      body: { sessionId, text: 'ready', inputMode: 'text', clientTurnId: `ct-${sessionId}` },
    });
    if (!started.ok) throw new Error('expected a stream');
    await drain(started.events);
    return sessionId;
  }

  async function pendingCheckId(sessionId: string): Promise<string> {
    const { rows } = await db.query<{ state: unknown }>(
      `SELECT state FROM sessions WHERE id = $1`,
      [sessionId],
    );
    const state = (
      typeof rows[0]!.state === 'string' ? JSON.parse(rows[0]!.state as string) : rows[0]!.state
    ) as { pendingCheck: { checkId: string } };
    return state.pendingCheck.checkId;
  }

  it('grades a correct numeric answer and updates the model', async () => {
    const sessionId = await sessionWithPendingCheck();
    const checkId = await pendingCheckId(sessionId);
    const graded = await call<CheckAnswerResponse>(answerCheckRoute, TUTOR_API.check, {
      cookie: learner.cookie,
      body: { sessionId, checkId, answer: 0.75, latencyMs: 4200 },
    });
    expect(graded.status).toBe(200);
    expect(graded.body.result.correct).toBe(true);
    expect(graded.body.result.assisted).toBe(false);
    expect(graded.body.mastery?.skillId).toBe('F8');
    expect(graded.body.mastery?.nItems).toBe(1);
  });

  it('marks the check assisted when a hint came first (strategy law 1)', async () => {
    const created = await createSession(learner, { mode: 'text', skillId: 'F8' });
    const sessionId = created.body.session.id;
    await db.query(`UPDATE sessions SET phase = 'work' WHERE id = $1`, [sessionId]);
    mocks.streamLLM.mockReturnValueOnce(scriptedStream(['[[hint]]Rename the quarters first. ']));
    const hinted = await startTurn({
      db,
      principal: learner.principal,
      body: { sessionId, text: 'stuck', inputMode: 'text', clientTurnId: `ct-hint-${sessionId}` },
    });
    if (!hinted.ok) throw new Error('expected a stream');
    await drain(hinted.events);

    mocks.streamLLM.mockReturnValueOnce(
      scriptedStream([
        'Now you. [[check {"type":"numeric","stem":"What is one half plus one quarter?","answer":{"value":0.75,"tolerance":0.01},"skillId":"F8"}]]',
      ]),
    );
    const asked = await startTurn({
      db,
      principal: learner.principal,
      body: { sessionId, text: 'ok', inputMode: 'text', clientTurnId: `ct-check-${sessionId}` },
    });
    if (!asked.ok) throw new Error('expected a stream');
    await drain(asked.events);

    const checkId = await pendingCheckId(sessionId);
    const graded = await call<CheckAnswerResponse>(answerCheckRoute, TUTOR_API.check, {
      cookie: learner.cookie,
      body: { sessionId, checkId, answer: 0.75 },
    });
    expect(graded.body.result.correct).toBe(true);
    expect(graded.body.result.assisted).toBe(true);
  });

  it('answers 409 when nothing is pending and 404 across accounts', async () => {
    const sessionId = await sessionWithPendingCheck();
    const checkId = await pendingCheckId(sessionId);
    const mine = await call(answerCheckRoute, TUTOR_API.check, {
      cookie: other.cookie,
      body: { sessionId, checkId, answer: 0.75 },
    });
    expect(mine.status).toBe(404);

    await call(answerCheckRoute, TUTOR_API.check, {
      cookie: learner.cookie,
      body: { sessionId, checkId, answer: 0.75 },
    });
    const again = await call(answerCheckRoute, TUTOR_API.check, {
      cookie: learner.cookie,
      body: { sessionId, checkId, answer: 0.75 },
    });
    expect(again.status).toBe(409);
    expect(again.body.errorCode).toBe('CONFLICT');
  });
});

describe('/api/tutor/coursework', () => {
  it('creates, lists, patches, and deletes, scoped to the learner', async () => {
    const created = await call<CourseworkItemResponse>(
      createCourseworkRoute,
      TUTOR_API.coursework,
      {
        cookie: learner.cookie,
        body: { title: 'Worksheet 4', text: 'Add $\\frac{1}{2} + \\frac{1}{4}$', skillIds: ['F8'] },
      },
    );
    expect(created.status).toBe(201);
    expect(created.body.item).toMatchObject({ source: 'text', status: 'ready', skillIds: ['F8'] });

    const listed = await call<ListCourseworkResponse>(listCourseworkRoute, TUTOR_API.coursework, {
      cookie: learner.cookie,
    });
    expect(listed.body.items.map((item) => item.id)).toContain(created.body.item.id);

    const mine = await call<ListCourseworkResponse>(listCourseworkRoute, TUTOR_API.coursework, {
      cookie: other.cookie,
    });
    expect(mine.body.items.map((item) => item.id)).not.toContain(created.body.item.id);

    const patched = await call<CourseworkItemResponse>(patchCourseworkRoute, TUTOR_API.coursework, {
      cookie: learner.cookie,
      method: 'PATCH',
      body: { id: created.body.item.id, title: 'Worksheet four' },
    });
    expect(patched.body.item.title).toBe('Worksheet four');

    const stolen = await call(patchCourseworkRoute, TUTOR_API.coursework, {
      cookie: other.cookie,
      method: 'PATCH',
      body: { id: created.body.item.id, title: 'mine now' },
    });
    expect(stolen.status).toBe(404);

    const removed = await call(deleteCourseworkRoute, TUTOR_API.coursework, {
      cookie: learner.cookie,
      method: 'DELETE',
      body: { id: created.body.item.id },
    });
    expect(removed.status).toBe(200);
  });

  it('refuses an empty problem', async () => {
    const created = await call(createCourseworkRoute, TUTOR_API.coursework, {
      cookie: learner.cookie,
      body: { title: 'Nothing', text: '   ' },
    });
    expect(created.status).toBe(400);
  });
});

describe('GET /api/tutor/progress', () => {
  it('answers the graph, the estimates, and the checks that are due', async () => {
    await db.query(
      `INSERT INTO skill_mastery (account_id, learner_id, skill_id, estimate, n_items, n_sessions, status, next_check_at)
       VALUES ($1, $2, 'F3', 0.9, 5, 2, 'mastered', now() - interval '1 hour')
       ON CONFLICT (learner_id, skill_id) DO UPDATE SET status = 'mastered', next_check_at = EXCLUDED.next_check_at`,
      [learner.accountId, learner.learnerId],
    );
    const progress = await call<ProgressResponse>(progressRoute, TUTOR_API.progress, {
      cookie: learner.cookie,
    });
    expect(progress.status).toBe(200);
    expect(progress.body.skills.length).toBeGreaterThanOrEqual(12);
    expect(progress.body.dueChecks.map((due) => due.skillId)).toContain('F3');
    expect(progress.body.nextSkill?.id).toBeTruthy();
    expect(progress.body.sessions).toBeGreaterThan(0);
  });

  it('shows another account nothing of this learner s mastery', async () => {
    const progress = await call<ProgressResponse>(progressRoute, TUTOR_API.progress, {
      cookie: other.cookie,
    });
    expect(progress.body.mastery.every((row) => row.learnerId === other.learnerId)).toBe(true);
  });
});
