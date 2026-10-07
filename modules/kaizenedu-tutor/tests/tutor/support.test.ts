/**
 * The support inbox (reference §5): one message reaches a person with the
 * visitor as reply-to, or the form says plainly that it did not.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as supportRoute } from '@/app/(learner)/api/tutor/support/route';
import { resetSignInThrottleForTests, SIGN_IN_MAX_ATTEMPTS } from '@/lib/tutor/accounts';
import { TUTOR_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { RESEND_ENDPOINT } from '@/lib/tutor/email';
import {
  SUPPORT_DELIVERED_MESSAGE,
  SUPPORT_SAVED_MESSAGE,
  SUPPORT_SEND_FAILED_MESSAGE,
  supportInboxStatus,
} from '@/lib/tutor/support';
import type { SupportResponse } from '@/lib/tutor/wire';

import { call, signUpParent } from './_api';
import { testDb } from './_db';

interface SentMail {
  to: string[];
  subject: string;
  text: string;
  html: string;
  reply_to?: string;
}

interface StoredRequest extends Record<string, unknown> {
  account_id: string | null;
  email: string;
  page: string | null;
  delivered_at: string | Date | null;
}

let db: TutorDb;
const outbox: SentMail[] = [];
let sendStatus = 200;
const MESSAGE = 'My daughter cannot sign in since yesterday. The page says the password is wrong.';

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('RESEND_API_KEY', 're_test_123');
  vi.stubEnv('EMAIL_FROM', 'Natural Tutor <hello@example.com>');
  vi.stubEnv('SUPPORT_EMAIL', 'help@example.com');
  vi.stubEnv('LOG_LEVEL', 'error');
  db = await testDb();
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) !== RESEND_ENDPOINT) return realFetch(url, init);
    outbox.push(JSON.parse(String(init?.body)) as SentMail);
    return new Response(JSON.stringify({ id: `em_${outbox.length}` }), {
      status: sendStatus,
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
  sendStatus = 200;
  resetSignInThrottleForTests();
});

async function stored(reference: string): Promise<StoredRequest> {
  const { rows } = await db.query<StoredRequest>(
    `SELECT account_id, email, page, delivered_at FROM support_requests WHERE id = $1`,
    [reference],
  );
  if (!rows[0]) throw new Error(`no row for ${reference}`);
  return rows[0];
}

describe('POST /api/tutor/support', () => {
  it("delivers a stranger's message to the support address with their address as reply-to, and keeps the row", async () => {
    const res = await call<SupportResponse>(supportRoute, TUTOR_API.support, {
      body: { email: 'Visitor@Example.com', message: MESSAGE, page: '/sign-in' },
      headers: { 'user-agent': 'TestBrowser/1.0' },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ delivered: true, message: SUPPORT_DELIVERED_MESSAGE });
    expect(res.body.reference).toMatch(/^sup_/);

    expect(outbox).toHaveLength(1);
    const mail = outbox[0]!;
    expect(mail.to).toEqual(['help@example.com']);
    expect(mail.reply_to).toBe('visitor@example.com');
    expect(mail.subject).toContain(res.body.reference);
    expect(mail.text).toContain(MESSAGE);
    expect(mail.text).toContain('/sign-in');
    expect(mail.text).toContain('TestBrowser/1.0');
    expect(mail.text).toContain('not signed in');

    const row = await stored(res.body.reference);
    expect(row).toMatchObject({ account_id: null, email: 'visitor@example.com', page: '/sign-in' });
    expect(row.delivered_at).not.toBeNull();
  });

  it('attaches the account when the caller is signed in', async () => {
    const parent = await signUpParent('support-parent@example.com');
    const res = await call<SupportResponse>(supportRoute, TUTOR_API.support, {
      cookie: parent.cookie,
      body: { email: 'support-parent@example.com', message: MESSAGE },
    });
    expect(res.status).toBe(201);
    const row = await stored(res.body.reference);
    expect(row.account_id).toBe(parent.state.account.id);
    expect(outbox[0]!.text).toContain(parent.state.account.id);
  });

  it('refuses a bad address and a message that says nothing', async () => {
    const badEmail = await call(supportRoute, TUTOR_API.support, {
      body: { email: 'nope', message: MESSAGE },
    });
    expect(badEmail.status).toBe(400);
    const tooShort = await call(supportRoute, TUTOR_API.support, {
      body: { email: 'v@example.com', message: 'hi' },
    });
    expect(tooShort.status).toBe(400);
    expect(tooShort.body.error).toContain('at least 10');
    const tooLong = await call(supportRoute, TUTOR_API.support, {
      body: { email: 'v@example.com', message: 'x'.repeat(2001) },
    });
    expect(tooLong.status).toBe(400);
    expect(outbox).toHaveLength(0);
  });

  it('says plainly when this deployment cannot deliver, and still keeps the message', async () => {
    vi.stubEnv('SUPPORT_EMAIL', '');
    try {
      const res = await call<SupportResponse>(supportRoute, TUTOR_API.support, {
        body: { email: 'v2@example.com', message: MESSAGE },
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ delivered: false, message: SUPPORT_SAVED_MESSAGE });
      expect(outbox).toHaveLength(0);
      expect((await stored(res.body.reference)).delivered_at).toBeNull();
    } finally {
      vi.stubEnv('SUPPORT_EMAIL', 'help@example.com');
    }
  });

  it('says plainly when the send fails just now', async () => {
    sendStatus = 500;
    const res = await call<SupportResponse>(supportRoute, TUTOR_API.support, {
      body: { email: 'v3@example.com', message: MESSAGE },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ delivered: false, message: SUPPORT_SEND_FAILED_MESSAGE });
    expect((await stored(res.body.reference)).delivered_at).toBeNull();
  });

  it('throttles one address after ten messages', async () => {
    for (let i = 0; i < SIGN_IN_MAX_ATTEMPTS; i += 1) {
      const res = await call(supportRoute, TUTOR_API.support, {
        body: { email: 'busy@example.com', message: `${MESSAGE} (${i})` },
      });
      expect(res.status).toBe(201);
    }
    const refused = await call(supportRoute, TUTOR_API.support, {
      body: { email: 'busy@example.com', message: MESSAGE },
    });
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toMatch(/^\d+$/);
  });

  it('the status names what is missing', () => {
    expect(supportInboxStatus({})).toEqual({
      configured: false,
      missing: expect.arrayContaining(['RESEND_API_KEY', 'EMAIL_FROM', 'SUPPORT_EMAIL']),
    });
    expect(
      supportInboxStatus({
        RESEND_API_KEY: 'x',
        EMAIL_FROM: 'a@b.test',
        SUPPORT_EMAIL: 'h@b.test',
      }),
    ).toEqual({ configured: true, missing: [] });
  });
});
