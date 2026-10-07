/**
 * The weekly report (spec R18; parent-comms skill): sent once per learner per
 * week and only when something happened; the headline counts confirmed skills
 * and never calls an estimate mastered; the opt-out link works on the first
 * click. The Resend call is captured so the test can read what a parent gets.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as cronRoute } from '@/app/(learner)/api/tutor/cron/weekly-email/route';
import {
  GET as unsubscribeLink,
  POST as unsubscribeOneClick,
} from '@/app/(learner)/api/tutor/email/unsubscribe/route';
import { getParentSettings, updateParentSettings } from '@/lib/tutor/accounts/settings';
import { CRON_API, TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { RESEND_ENDPOINT } from '@/lib/tutor/email';
import { sendWeeklyEmails, weekLabel, weeklyPeriod } from '@/lib/tutor/email/weekly';
import { ensureGraphSeeded } from '@/lib/tutor/graph/seed';
import { GENERATED_LABEL } from '@/lib/tutor/report/parent-report';
import { headlineFor, weeklyLead } from '@/lib/tutor/report/lead';

import { call } from './_api';
import { testDb } from './_db';
import { setUpLearner, type Learner } from './_turn-helpers';

interface SentMail {
  to: string[];
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

const APP = 'https://tutor.example.test';
/** A Monday, three hours after the week of 31 August ended. */
const NOW = new Date('2026-09-07T03:00:00Z');
const NOTE =
  'Sam worked through adding unlike fractions and got the last two right without a hint.';

let db: TutorDb;
let sam: Learner;
const outbox: SentMail[] = [];

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('RESEND_API_KEY', 're_test_123');
  vi.stubEnv('EMAIL_FROM', 'Natural Tutor <hello@example.com>');
  vi.stubEnv('APP_URL', APP);
  vi.stubEnv('LOG_LEVEL', 'error');
  db = await testDb();
  await ensureGraphSeeded(db);
  sam = await setUpLearner(db, 'weekly-a@example.com');
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) !== RESEND_ENDPOINT) return realFetch(url, init);
    outbox.push(JSON.parse(String(init?.body)) as SentMail);
    return new Response(JSON.stringify({ id: `em_${outbox.length}` }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
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
});

let sessionCounter = 0;
/** A finished session inside the reported week, with a tutor note and a thumbs-up. */
async function sessionInWeek(
  who: Learner,
  startedAt: string,
  note: string | null,
): Promise<string> {
  sessionCounter += 1;
  const id = `ses_weekly_${sessionCounter}`;
  await db.query(
    `INSERT INTO sessions (id, account_id, learner_id, started_at, ended_at, minutes, mode, phase, summary, thumbs)
     VALUES ($1, $2, $3, $4, $4, 25, 'text', 'ended', $5::jsonb, 'up')`,
    [
      id,
      who.accountId,
      who.learnerId,
      startedAt,
      note
        ? JSON.stringify({ recap: '', practice: [], tutorNote: note, skillsTouched: ['F7'] })
        : null,
    ],
  );
  return id;
}

async function logRow(who: Learner): Promise<{ status: string } | undefined> {
  const { rows } = await db.query<{ status: string }>(
    `SELECT status FROM email_log WHERE account_id = $1 AND learner_id = $2 AND kind = 'weekly_report' AND period = '2026-08-31'`,
    [who.accountId, who.learnerId],
  );
  return rows[0];
}

describe('the period', () => {
  it('reports the Monday-to-Monday week that ended, inside 48 hours of its end', () => {
    const period = weeklyPeriod(NOW);
    expect(period.period).toBe('2026-08-31');
    expect(period.to.toISOString()).toBe('2026-09-07T00:00:00.000Z');
    expect(period.inWindow).toBe(true);
    expect(weekLabel(period.from)).toBe('31 August');
    expect(weeklyPeriod(new Date('2026-09-10T03:00:00Z')).inWindow).toBe(false);
  });
});

describe('sendWeeklyEmails', () => {
  it('sends one report for the week that ended, leading with what was confirmed, and never twice', async () => {
    const sessionId = await sessionInWeek(sam, '2026-09-02T18:00:00Z', NOTE);
    await db.query(
      `UPDATE skill_mastery SET status = 'confirmed' WHERE learner_id = $1 AND skill_id = 'F7'`,
      [sam.learnerId],
    );
    await db.query(
      `INSERT INTO evidence_events (id, account_id, learner_id, session_id, type, assisted, payload, ts)
       VALUES ('evd_weekly_1', $1, $2, $3, 'mastery_change', false, $4::jsonb, '2026-09-02T18:20:00Z')`,
      [
        sam.accountId,
        sam.learnerId,
        sessionId,
        JSON.stringify({ skillId: 'F7', from: 'mastered', to: 'confirmed' }),
      ],
    );
    await db.query(
      `INSERT INTO misconceptions (account_id, learner_id, tag, status, first_seen_at, resolved_at)
       VALUES ($1, $2, 'add_across', 'resolved', '2026-08-20T10:00:00Z', '2026-09-03T10:00:00Z')`,
      [sam.accountId, sam.learnerId],
    );
    const skillName = (await db.query<{ name: string }>(`SELECT name FROM skills WHERE id = 'F7'`))
      .rows[0]!.name;

    const result = await sendWeeklyEmails(db, { now: NOW, baseUrl: APP });
    expect(result).toMatchObject({
      period: '2026-08-31',
      inWindow: true,
      configured: true,
      considered: 1,
      sent: 1,
      empty: 0,
      suppressed: 0,
      failed: 0,
    });
    expect(outbox).toHaveLength(1);
    const mail = outbox[0]!;
    expect(mail.to).toEqual(['weekly-a@example.com']);
    expect(mail.subject).toBe('Sam — week of 31 August');
    expect(mail.text).toContain('1 of 1 skill confirmed, 1 this week');
    expect(mail.text).toContain(`Confirmed this week: ${skillName}.`);
    expect(mail.text).toContain('1 session, 25 minutes');
    expect(mail.text).toContain('Cleared up this week: Add across.');
    expect(mail.text).toContain(NOTE);
    expect(mail.text).toContain('rated the session up');
    expect(mail.text).toContain(GENERATED_LABEL);
    expect(mail.text).toContain(`${APP}/parent`);
    expect(mail.text).toContain(`${APP}${TUTOR_API.unsubscribe}?t=`);
    expect(mail.html).toContain(skillName);
    expect(mail.headers?.['List-Unsubscribe']).toMatch(
      /^<https:\/\/tutor\.example\.test\/api\/tutor\/email\/unsubscribe\?t=/,
    );
    expect(mail.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(mail.subject).not.toMatch(/master/i);
    expect(mail.text).not.toMatch(/!/);
    expect(await logRow(sam)).toEqual({ status: 'sent' });

    const again = await sendWeeklyEmails(db, { now: NOW, baseUrl: APP });
    expect(again).toMatchObject({ considered: 0, sent: 0 });
    expect(outbox).toHaveLength(1);
  });

  it('sends nothing for a learner whose week was empty, and logs it so the week is settled', async () => {
    const quiet = await setUpLearner(db, 'weekly-b@example.com');
    const result = await sendWeeklyEmails(db, { now: NOW, baseUrl: APP });
    expect(result).toMatchObject({ considered: 1, sent: 0, empty: 1 });
    expect(outbox).toHaveLength(0);
    expect(await logRow(quiet)).toEqual({ status: 'empty' });
  });

  it('respects the opt-out at send time', async () => {
    const optedOut = await setUpLearner(db, 'weekly-c@example.com');
    await sessionInWeek(optedOut, '2026-09-01T18:00:00Z', null);
    await updateParentSettings(db, optedOut.accountId, { weeklyEmail: false });
    const result = await sendWeeklyEmails(db, { now: NOW, baseUrl: APP });
    expect(result).toMatchObject({ considered: 1, sent: 0, suppressed: 1 });
    expect(outbox).toHaveLength(0);
    expect(await logRow(optedOut)).toEqual({ status: 'suppressed' });
  });

  it('sends nothing outside the window or without an email sender, and logs nothing either', async () => {
    const late = await setUpLearner(db, 'weekly-d@example.com');
    await sessionInWeek(late, '2026-09-01T18:00:00Z', null);
    const outside = await sendWeeklyEmails(db, {
      now: new Date('2026-09-10T03:00:00Z'),
      baseUrl: APP,
    });
    expect(outside).toMatchObject({ inWindow: false, considered: 0, sent: 0 });
    const unconfigured = await sendWeeklyEmails(db, { now: NOW, baseUrl: APP, send: { env: {} } });
    expect(unconfigured).toMatchObject({ configured: false, considered: 0, sent: 0 });
    expect(await logRow(late)).toBeUndefined();
    expect(outbox).toHaveLength(0);
  });
});

describe('the lead', () => {
  const windowStart = new Date('2026-08-31T00:00:00Z');
  const windowEnd = new Date('2026-09-07T00:00:00Z');

  it('counts only confirmed skills and never calls an estimate mastered', () => {
    const lead = weeklyLead({
      skills: [
        { skillId: 'F1', name: 'Halves', status: 'mastered' },
        { skillId: 'F2', name: 'Thirds', status: 'in_progress' },
        { skillId: 'F3', name: 'Quarters', status: 'not_started' },
      ],
      changes: [{ skillId: 'F1', to: 'mastered', at: '2026-09-02T10:00:00Z' }],
      windowStart,
      windowEnd,
    });
    expect(lead).toEqual({
      tracked: 2,
      confirmed: 0,
      moved: [],
      headline: 'No skills confirmed yet, 2 in progress',
    });
    expect(lead.headline).not.toMatch(/master/i);
  });

  it('names what moved only when the change is inside the window and still holds', () => {
    const lead = weeklyLead({
      skills: [
        { skillId: 'F1', name: 'Halves', status: 'confirmed' },
        { skillId: 'F2', name: 'Thirds', status: 'confirmed' },
        { skillId: 'F4', name: 'Fifths', status: 'in_progress' },
      ],
      changes: [
        { skillId: 'F1', to: 'confirmed', at: '2026-09-02T10:00:00Z' },
        { skillId: 'F2', to: 'confirmed', at: '2026-08-20T10:00:00Z' },
        { skillId: 'F4', to: 'confirmed', at: '2026-09-03T10:00:00Z' },
      ],
      windowStart,
      windowEnd,
    });
    expect(lead.moved.map((skill) => skill.name)).toEqual(['Halves']);
    expect(lead.headline).toBe('2 of 3 skills confirmed, 1 this week');
    expect(headlineFor(0, 0, 0)).toBe('No skills tracked yet');
    expect(headlineFor(4, 4, 0)).toBe('4 of 4 skills confirmed');
  });
});

describe('the cron route', () => {
  it('refuses without the secret, refuses the wrong one, and runs with the right one', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const unset = await call(cronRoute, CRON_API.weeklyEmail, {
      headers: { authorization: 'Bearer anything' },
    });
    expect(unset.status).toBe(503);

    vi.stubEnv('CRON_SECRET', 'a-long-random-string');
    const wrong = await call(cronRoute, CRON_API.weeklyEmail, {
      headers: { authorization: 'Bearer nope' },
    });
    expect(wrong.status).toBe(401);
    const missing = await call(cronRoute, CRON_API.weeklyEmail);
    expect(missing.status).toBe(401);

    const right = await call<{ period: string; inWindow: boolean }>(
      cronRoute,
      CRON_API.weeklyEmail,
      {
        headers: { authorization: 'Bearer a-long-random-string' },
      },
    );
    expect(right.status).toBe(200);
    expect(right.body.period).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof right.body.inWindow).toBe('boolean');
  });
});

describe('the opt-out link', () => {
  it('turns the weekly report off on the first click, again on the second, and refuses a bad token', async () => {
    const parent = await setUpLearner(db, 'weekly-e@example.com');
    await sessionInWeek(parent, '2026-09-01T18:00:00Z', null);
    await sendWeeklyEmails(db, { now: NOW, baseUrl: APP });
    // The run also settles the learner the previous case left unsent; pick this parent's mail.
    const mail = outbox.find((sent) => sent.to[0] === 'weekly-e@example.com');
    if (!mail) throw new Error('no mail for the parent');
    const link = /https:\S+\/api\/tutor\/email\/unsubscribe\?t=([A-Za-z0-9_%-]+)/.exec(mail.text);
    if (!link) throw new Error('no opt-out link in the mail');
    const token = decodeURIComponent(link[1]!);
    expect((await getParentSettings(db, parent.accountId)).weeklyEmail).toBe(true);

    const clicked = await unsubscribeLink(
      new Request(`http://localhost${TUTOR_API.unsubscribe}?t=${encodeURIComponent(token)}`),
    );
    expect(clicked.status).toBe(303);
    expect(clicked.headers.get('location')).toBe(`${APP}/unsubscribed?state=off`);
    expect((await getParentSettings(db, parent.accountId)).weeklyEmail).toBe(false);

    const oneClick = await unsubscribeOneClick(
      new Request(`http://localhost${TUTOR_API.unsubscribe}?t=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click',
      }),
    );
    expect(oneClick.status).toBe(200);

    const bad = await unsubscribeLink(
      new Request(`http://localhost${TUTOR_API.unsubscribe}?t=nonsense`),
    );
    expect(bad.headers.get('location')).toBe(`${APP}/unsubscribed?state=invalid`);
    const badClick = await unsubscribeOneClick(
      new Request(`http://localhost${TUTOR_API.unsubscribe}?t=nonsense`, { method: 'POST' }),
    );
    expect(badClick.status).toBe(400);
  });
});
