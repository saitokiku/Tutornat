/**
 * Safety paging (reference §5; docs/SAFETY-RUNBOOK.md): a crisis match and an
 * unsafe report each reach a person, with ids and never the learner's words;
 * nothing is paged without the variables; a paging failure never reaches the
 * turn that is answering the learner.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  streamLLM: vi.fn(),
  callLLM: vi.fn(),
}));

vi.mock('@/lib/ai/llm', () => ({
  streamLLM: mocks.streamLLM,
  callLLM: mocks.callLLM,
}));

import { POST as flagRoute } from '@/app/(learner)/api/tutor/flag/route';
import { POST as createSessionRoute } from '@/app/(learner)/api/tutor/session/route';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { RESEND_ENDPOINT } from '@/lib/tutor/email';
import { resetRateLimitsForTests } from '@/lib/tutor/guards';
import {
  pageSafetyEvent,
  safetyPagingStatus,
  webhookPayload,
  type SafetyEvent,
} from '@/lib/tutor/safety';
import { startTurn } from '@/lib/tutor/turn';
import type { CreateSessionResponse, FlagResponse } from '@/lib/tutor/wire';

import { call } from './_api';
import { testDb } from './_db';
import { drain, setUpLearner, type Learner } from './_turn-helpers';

interface SentMail {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

const WEBHOOK = 'https://hooks.example.test/safety';
const APP = 'https://tutor.example.test';
const HOLDER = 'paging-a@example.com';

let db: TutorDb;
let learner: Learner;
const outbox: SentMail[] = [];
const hooks: Array<Record<string, string | null>> = [];
let transportStatus = 200;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('RESEND_API_KEY', 're_test_123');
  vi.stubEnv('EMAIL_FROM', 'Natural Tutor <hello@example.com>');
  vi.stubEnv('SAFETY_ALERT_EMAILS', 'oncall@example.com, second@example.com');
  vi.stubEnv('ALERT_WEBHOOK_URL', WEBHOOK);
  vi.stubEnv('APP_URL', APP);
  vi.stubEnv('LOG_LEVEL', 'error');
  db = await testDb();
  learner = await setUpLearner(db, HOLDER);
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === RESEND_ENDPOINT) {
      outbox.push(JSON.parse(String(init?.body)) as SentMail);
      return new Response(JSON.stringify({ id: `em_${outbox.length}` }), {
        status: transportStatus,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(url) === WEBHOOK) {
      hooks.push(JSON.parse(String(init?.body)) as Record<string, string | null>);
      return new Response('ok', { status: transportStatus });
    }
    return realFetch(url, init);
  });
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  outbox.length = 0;
  hooks.length = 0;
  transportStatus = 200;
  resetRateLimitsForTests();
  mocks.streamLLM.mockReset();
});

function event(overrides: Partial<SafetyEvent> = {}): SafetyEvent {
  return {
    flagId: 'flg_test',
    accountId: learner.accountId,
    learnerId: learner.learnerId,
    sessionId: 'ses_test',
    category: 'self_harm',
    severity: 'critical',
    source: 'screen',
    at: new Date('2026-09-05T20:00:00Z'),
    ...overrides,
  };
}

describe('pageSafetyEvent', () => {
  it('pages every staff address, the webhook and the account holder on a critical event, with ids only', async () => {
    const outcome = await pageSafetyEvent(db, event());
    expect(outcome).toEqual({
      staff: { addresses: 2, sent: 2 },
      webhook: 'sent',
      accountHolder: 'sent',
    });
    expect(outbox.map((mail) => mail.to[0]).sort()).toEqual(
      ['oncall@example.com', 'second@example.com', HOLDER].sort(),
    );

    const page = outbox.find((mail) => mail.to[0] === 'oncall@example.com')!;
    expect(page.subject).toContain('Safety event, critical: self-harm');
    expect(page.text).toContain('flg_test');
    expect(page.text).toContain(learner.accountId);
    expect(page.text).toContain('one hour');

    const notice = outbox.find((mail) => mail.to[0] === HOLDER)!;
    expect(notice.subject).toBe('A Natural Tutor session ended early today');
    expect(notice.text).toContain('988');
    expect(notice.text).toContain(`${APP}/parent`);
    expect(notice.text).toContain('A person on our side has been told');
    expect(notice.text).not.toContain('flg_test');

    expect(hooks).toEqual([webhookPayload(event())]);
    expect(hooks[0]!.text).toContain('flag=flg_test');
  });

  it('skips the account holder on a high-severity report', async () => {
    const outcome = await pageSafetyEvent(
      db,
      event({ severity: 'high', source: 'report', category: 'report' }),
    );
    expect(outcome.accountHolder).toBe('skipped');
    expect(outbox).toHaveLength(2);
    expect(outbox[0]!.subject).toContain('high: a report from the button');
    expect(outbox[0]!.text).toContain('the same day');
  });

  it('pages nobody without the variables, and the status says which are missing', async () => {
    const outcome = await pageSafetyEvent(db, event(), { env: {} });
    expect(outcome).toEqual({
      staff: { addresses: 0, sent: 0 },
      webhook: 'unset',
      accountHolder: 'not_configured',
    });
    expect(outbox).toHaveLength(0);
    expect(hooks).toHaveLength(0);

    const unset = safetyPagingStatus({});
    expect(unset.configured).toBe(false);
    expect(unset.staffAddresses).toBe(0);
    expect(unset.webhook).toBe(false);
    expect(unset.missing).toEqual(
      expect.arrayContaining(['RESEND_API_KEY', 'EMAIL_FROM', 'SAFETY_ALERT_EMAILS']),
    );
    expect(unset.missing).toHaveLength(3);
    expect(
      safetyPagingStatus({
        RESEND_API_KEY: 're_x',
        EMAIL_FROM: 'a@b.test',
        SAFETY_ALERT_EMAILS: 'oncall@b.test',
      }),
    ).toEqual({ configured: true, staffAddresses: 1, webhook: false, missing: [] });
  });

  it('reports a transport failure instead of throwing', async () => {
    transportStatus = 500;
    const outcome = await pageSafetyEvent(db, event());
    expect(outcome).toEqual({
      staff: { addresses: 2, sent: 0 },
      webhook: 'failed',
      accountHolder: 'failed',
    });
  });
});

describe('the paths that page', () => {
  it('a crisis turn pages a person, and no message carries the disclosure', async () => {
    const created = await call<CreateSessionResponse>(createSessionRoute, TUTOR_API.session, {
      cookie: learner.cookie,
      body: { mode: 'text', skillId: 'F8' },
    });
    expect(created.status).toBe(201);
    const sessionId = created.body.session.id;
    await db.query(`UPDATE sessions SET phase = 'work' WHERE id = $1`, [sessionId]);

    const started = await startTurn({
      db,
      principal: learner.principal,
      body: {
        sessionId,
        text: 'sometimes I want to hurt myself',
        inputMode: 'text',
        clientTurnId: 'ct-paging-1',
      },
      baseUrl: APP,
    });
    if (!started.ok) throw new Error(`turn refused: ${started.code}`);
    const events = await drain(started.events);
    expect(events.at(-1)).toMatchObject({ type: 'done', phase: 'ended' });
    expect(mocks.streamLLM).not.toHaveBeenCalled();

    const flags = await db.query<{ id: string }>(`SELECT id FROM flags WHERE session_id = $1`, [
      sessionId,
    ]);
    const flagId = flags.rows[0]!.id;
    expect(hooks).toHaveLength(1);
    expect(hooks[0]).toMatchObject({
      flagId,
      sessionId,
      learnerId: learner.learnerId,
      category: 'self_harm',
      severity: 'critical',
      source: 'screen',
    });
    expect(outbox).toHaveLength(3);
    for (const mail of outbox) {
      expect(mail.subject).not.toMatch(/hurt/i);
      expect(mail.text).not.toMatch(/hurt/i);
      expect(mail.html).not.toMatch(/hurt/i);
    }
    const staffMails = outbox.filter((mail) => mail.to[0] !== HOLDER);
    expect(staffMails).toHaveLength(2);
    expect(staffMails[0]!.text).toContain(flagId);
    expect(outbox.find((mail) => mail.to[0] === HOLDER)!.text).toContain(`${APP}/parent`);
  });

  it('an unsafe report from the button pages staff without the note; a wrong one pages nobody', async () => {
    const unsafe = await call<FlagResponse>(flagRoute, TUTOR_API.flag, {
      cookie: learner.cookie,
      body: { kind: 'unsafe', note: 'the tutor said something odd about my family' },
    });
    expect(unsafe.status).toBe(201);
    expect(hooks).toHaveLength(1);
    expect(hooks[0]).toMatchObject({
      flagId: unsafe.body.flagId,
      severity: 'high',
      source: 'report',
      category: 'report',
    });
    expect(outbox).toHaveLength(2);
    for (const mail of outbox) {
      expect(mail.text).not.toContain('odd');
      expect(mail.html).not.toContain('odd');
    }

    outbox.length = 0;
    hooks.length = 0;
    const wrong = await call<FlagResponse>(flagRoute, TUTOR_API.flag, {
      cookie: learner.cookie,
      body: { kind: 'wrong', note: 'the answer was five sixths' },
    });
    expect(wrong.status).toBe(201);
    expect(outbox).toHaveLength(0);
    expect(hooks).toHaveLength(0);
  });
});
