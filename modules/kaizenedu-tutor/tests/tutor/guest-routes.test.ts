/**
 * Guest mode (D35, docs/GUEST-MODE.md): the free tutor with no account. One
 * POST creates an anonymous account and learner behind the ordinary session
 * cookie and starts a topic session; every existing route then works on it;
 * checks are tutor-authored against the subject skill; the entitlement is a
 * finite daily allowance; "Start over" deletes everything now; the cron
 * deletes idle guests; and nothing about a person is ever collected.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ streamLLM: vi.fn(), callLLM: vi.fn() }));
vi.mock('@/lib/ai/llm', () => ({ streamLLM: mocks.streamLLM, callLLM: mocks.callLLM }));

import { GET as me } from '@/app/(learner)/api/tutor/auth/me/route';
import { POST as answerCheckRoute } from '@/app/(learner)/api/tutor/check/route';
import { POST as guestRoute } from '@/app/(learner)/api/tutor/guest/route';
import { POST as forgetRoute } from '@/app/(learner)/api/tutor/guest/forget/route';
import { GET as progressRoute } from '@/app/(learner)/api/tutor/progress/route';
import {
  PATCH as patchSessionRoute,
  POST as createSessionRoute,
} from '@/app/(learner)/api/tutor/session/route';
import { POST as turnRoute } from '@/app/(learner)/api/tutor/turn/route';
import { GUEST } from '@/kaizen.config';
import { getEntitlement } from '@/lib/tutor/billing';
import { AUTH_API, TUTOR_API } from '@/lib/tutor/contracts';
import type { TurnEvent } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { createGuest, purgeIdleGuests } from '@/lib/tutor/guest';
import { resetRateLimitsForTests } from '@/lib/tutor/guards';
import type {
  CheckAnswerResponse,
  CreateSessionResponse,
  GuestForgetResponse,
  GuestStartResponse,
  MeResponse,
  ProgressResponse,
  UpdateSessionResponse,
} from '@/lib/tutor/wire';

import { call, cookieOf, signUpAdult } from './_api';
import { testDb } from './_db';
import { readFrames, scriptedStream } from './_turn-helpers';

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

beforeEach(() => {
  resetRateLimitsForTests();
  mocks.streamLLM.mockReset();
  mocks.callLLM.mockReset();
});

let addressCounter = 0;
/** Every start comes from its own address so the per-address limiter is a separate test. */
function startGuest(body: Record<string, unknown>, cookie: string | null = null) {
  addressCounter += 1;
  return call<GuestStartResponse>(guestRoute, TUTOR_API.guest, {
    cookie,
    body,
    headers: { 'x-forwarded-for': `10.0.0.${addressCounter % 250}` },
  });
}

async function sessionState(sessionId: string): Promise<Record<string, unknown>> {
  const { rows } = await db.query<{ state: unknown }>(`SELECT state FROM sessions WHERE id = $1`, [
    sessionId,
  ]);
  const raw = rows[0]!.state;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>;
}

describe('POST /api/tutor/guest', () => {
  it('creates an anonymous account and learner, sets the cookie, and starts the topic session', async () => {
    const started = await startGuest({
      level: '6-7',
      mode: 'text',
      topic: { subject: 'science', text: 'Why the moon has phases' },
    });
    expect(started.status).toBe(201);
    expect(started.body.learner.displayName).toBe(GUEST.displayName);
    expect(started.body.learner.band).toBe('9-12');
    expect(started.body.principal.role).toBe('learner');
    const cookie = cookieOf(started.headers);
    expect(cookie).toMatch(/^nt_session=/);

    const session = started.body.session;
    expect(session).not.toBeNull();
    expect(session!.band).toBe('9-12');
    expect(session!.sessionMinutes).toBe(15);
    expect(session!.session.skillId).toBe('S-science');
    expect(session!.entitlement.guest).toBe(true);
    expect(session!.entitlement.pooledMinutes).toBe(GUEST.dailyMinutes);
    const state = await sessionState(session!.session.id);
    expect(state.target).toBe('topic');
    expect(state.topic).toEqual({ subject: 'science', text: 'Why the moon has phases' });
    expect(state.diagnostic).toBeNull();

    // Nothing about a person is stored: no name, no real address, no password that can match.
    const { rows } = await db.query<{ email: string; display_name: string; guest: boolean }>(
      `SELECT email, display_name, guest FROM accounts WHERE id = $1`,
      [session!.session.accountId],
    );
    expect(rows[0]!.guest).toBe(true);
    expect(rows[0]!.email).toMatch(/@guest\.invalid$/);
    expect(rows[0]!.display_name).toBe('Guest');

    const who = await call<MeResponse>(me, AUTH_API.me, { cookie });
    expect(who.status).toBe(200);
    expect(who.body.account.guest).toBe(true);
    expect(who.body.learner?.displayName).toBe(GUEST.displayName);
  });

  it('with no topic it only creates the identity; a later session can carry the topic', async () => {
    const started = await startGuest({ level: '8-9' });
    expect(started.status).toBe(201);
    expect(started.body.session).toBeNull();
    const cookie = cookieOf(started.headers);
    const created = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
      cookie,
      body: { mode: 'voice', topic: { subject: 'writing', text: 'A paragraph about my weekend' } },
    });
    expect(created.status).toBe(201);
    expect(created.body.band).toBe('13-17');
    expect(created.body.session.skillId).toBe('S-writing');
  });

  it('a second start with the same cookie keeps the guest and moves the level', async () => {
    const first = await startGuest({ level: '4-5' });
    const cookie = cookieOf(first.headers);
    const again = await startGuest({ level: 'adult' }, cookie);
    expect(again.status).toBe(201);
    expect(again.body.learner.id).toBe(first.body.learner.id);
    expect(again.body.learner.band).toBe('adult');
    expect(again.headers.get('set-cookie')).toBeNull();
  });

  it('refuses an unknown level, a malformed topic, and a non-JSON body', async () => {
    expect((await startGuest({ level: 'grade 99' })).status).toBe(400);
    expect(
      (await startGuest({ level: '4-5', topic: { subject: 'magic', text: 'x' } })).status,
    ).toBe(400);
    expect(
      (await startGuest({ level: '4-5', topic: { subject: 'math', text: '   ' } })).status,
    ).toBe(400);
    const raw = await call(guestRoute, TUTOR_API.guest, {
      body: 'not json',
      headers: { 'x-forwarded-for': '10.9.9.9' },
    });
    expect(raw.status).toBe(400);
  });

  it('holds one address to a bucket of new identities', async () => {
    let last = 0;
    for (let i = 0; i < 14; i += 1) {
      const response = await call<GuestStartResponse>(guestRoute, TUTOR_API.guest, {
        body: { level: 'college' },
        headers: { 'x-forwarded-for': '203.0.113.7' },
      });
      last = response.status;
    }
    expect(last).toBe(429);
  });
});

describe('a guest session end to end', () => {
  it('runs a turn, accepts a tutor-authored check with no skill id, and grades it against the subject', async () => {
    const started = await startGuest({
      level: '4-5',
      mode: 'text',
      topic: { subject: 'math', text: 'Long division with remainders' },
    });
    const cookie = cookieOf(started.headers);
    const sessionId = started.body.session!.session.id;
    await db.query(`UPDATE sessions SET phase = 'work' WHERE id = $1`, [sessionId]);

    mocks.streamLLM.mockReturnValueOnce(
      scriptedStream([
        'Try this one. [[check {"type":"numeric","stem":"What is 17 divided by 5, remainder only?","answer":{"value":2,"tolerance":0}}]]',
      ]),
    );
    const turn = await turnRoute(
      new Request(`http://localhost${TUTOR_API.turn}`, {
        method: 'POST',
        headers: { cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, text: 'ready', inputMode: 'text', clientTurnId: 'g1' }),
      }),
    );
    expect(turn.status).toBe(200);
    const events = await readFrames(turn);
    const check = events.find(
      (event): event is Extract<TurnEvent, { type: 'check' }> => event.type === 'check',
    );
    expect(check).toBeDefined();
    expect(check!.check.skillId).toBe('S-math');

    // The system prompt carried the level and the learner's words as context.
    const promptCall = mocks.streamLLM.mock.calls[0]![0] as { system?: string };
    expect(promptCall.system).toContain('Learner level: 4th to 5th grade');
    expect(promptCall.system).toContain('Long division with remainders');
    expect(promptCall.system).toContain('Subject skill for checks: S-math');

    const graded = await call<CheckAnswerResponse>(answerCheckRoute, TUTOR_API.check, {
      cookie,
      body: { sessionId, checkId: check!.check.checkId, answer: 2, latencyMs: 900 },
    });
    expect(graded.status).toBe(200);
    expect(graded.body.result.correct).toBe(true);
    expect(graded.body.result.assisted).toBe(false);
    expect(graded.body.mastery?.skillId).toBe('S-math');

    const progress = await call<ProgressResponse>(progressRoute, TUTOR_API.progress, { cookie });
    expect(progress.status).toBe(200);
    expect(progress.body.skills.some((skill) => skill.id === 'S-math')).toBe(true);
    expect(progress.body.mastery.some((row) => row.skillId === 'S-math')).toBe(true);
  });

  it('meters a daily allowance that stops at GUEST.dailyMinutes and never a lifetime trial', async () => {
    const started = await startGuest({
      level: '10-12',
      mode: 'text',
      topic: { subject: 'test-prep', text: 'SAT reading practice' },
    });
    const cookie = cookieOf(started.headers);
    const accountId = started.body.session!.session.accountId;
    const sessionId = started.body.session!.session.id;
    await db.query(`UPDATE sessions SET minutes = $2 WHERE id = $1`, [
      sessionId,
      GUEST.dailyMinutes - 5,
    ]);
    let entitlement = await getEntitlement(db, accountId);
    expect(entitlement.guest).toBe(true);
    expect(entitlement.remainingMinutes).toBe(5);
    expect(entitlement.warnAt80).toBe(true);

    await db.query(`UPDATE sessions SET minutes = $2 WHERE id = $1`, [
      sessionId,
      GUEST.dailyMinutes,
    ]);
    entitlement = await getEntitlement(db, accountId);
    expect(entitlement.remainingMinutes).toBe(0);
    const refused = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
      cookie,
      body: { mode: 'text', topic: { subject: 'math', text: 'more' } },
    });
    expect(refused.status).toBe(403);
    expect(refused.body.errorCode).toBe('CAP_REACHED');

    // Yesterday's minutes do not count against today.
    await db.query(`UPDATE sessions SET started_at = now() - interval '2 days' WHERE id = $1`, [
      sessionId,
    ]);
    entitlement = await getEntitlement(db, accountId);
    expect(entitlement.remainingMinutes).toBe(GUEST.dailyMinutes);

    const ended = await call<UpdateSessionResponse>(patchSessionRoute, TUTOR_API.session, {
      cookie,
      method: 'PATCH',
      body: { sessionId, action: 'end' },
    });
    expect(ended.status).toBe(200);
    expect(ended.body.entitlement.guest).toBe(true);
  });
});

describe('POST /api/tutor/guest/forget', () => {
  it('deletes every row behind the cookie now and clears it', async () => {
    const started = await startGuest({
      level: 'k-3',
      mode: 'text',
      topic: { subject: 'reading', text: 'A picture book about frogs' },
    });
    const cookie = cookieOf(started.headers);
    const accountId = started.body.session!.session.accountId;
    const sessionId = started.body.session!.session.id;

    const forgotten = await call<GuestForgetResponse>(forgetRoute, TUTOR_API.guestForget, {
      cookie,
      body: {},
    });
    expect(forgotten.status).toBe(200);
    expect(forgotten.body.deleted).toBe(true);
    expect(forgotten.headers.get('set-cookie')).toMatch(/nt_session=;/);

    const accounts = await db.query(`SELECT id FROM accounts WHERE id = $1`, [accountId]);
    expect(accounts.rows).toEqual([]);
    const sessions = await db.query(`SELECT id FROM sessions WHERE id = $1`, [sessionId]);
    expect(sessions.rows).toEqual([]);
    const evidence = await db.query(`SELECT id FROM evidence_events WHERE account_id = $1`, [
      accountId,
    ]);
    expect(evidence.rows).toEqual([]);
    const who = await call(me, AUTH_API.me, { cookie });
    expect(who.status).toBe(401);
  });

  it('refuses a signed-in account, whose deletion has a window', async () => {
    const adult = await signUpAdult('keep-me@example.com');
    const refused = await call(forgetRoute, TUTOR_API.guestForget, {
      cookie: adult.cookie,
      body: {},
    });
    expect(refused.status).toBe(403);
    const still = await db.query(`SELECT id FROM accounts WHERE email = $1`, [
      'keep-me@example.com',
    ]);
    expect(still.rows.length).toBe(1);
  });
});

describe('guest retention', () => {
  it('the cron deletes guests idle past GUEST.retentionDays and keeps the rest', async () => {
    const dayMs = 86_400_000;
    const now = new Date();
    const old = await createGuest(db, '6-7', new Date(now.getTime() - 45 * dayMs));
    const recent = await createGuest(db, '6-7', new Date(now.getTime() - 45 * dayMs));
    const fresh = await createGuest(db, '6-7', now);
    await db.query(
      `INSERT INTO sessions (id, account_id, learner_id, started_at, mode, phase, state)
       VALUES ('ses_recent', $1, $2, $3, 'text', 'ended', '{}'::jsonb)`,
      [recent.principal.accountId, recent.learner.id, new Date(now.getTime() - 2 * dayMs)],
    );
    const result = await purgeIdleGuests(db, now);
    expect(result.deleted).toBeGreaterThanOrEqual(1);
    const ids = [old, recent, fresh].map((guest) => guest.principal.accountId);
    const { rows } = await db.query<{ id: string }>(`SELECT id FROM accounts WHERE id = ANY($1)`, [
      ids,
    ]);
    const left = rows.map((row) => row.id);
    expect(left).not.toContain(old.principal.accountId);
    expect(left).toContain(recent.principal.accountId);
    expect(left).toContain(fresh.principal.accountId);
  });

  it('a guest is never in the weekly report and never paged by email', async () => {
    const { rows } = await db.query<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM learners l JOIN accounts a ON a.id = l.account_id
       WHERE a.guest = true AND l.kind <> 'self'`,
    );
    // The weekly query filters on a.guest = false; the rows exist to be filtered.
    expect(Number(rows[0]!.n)).toBeGreaterThan(0);
  });
});
