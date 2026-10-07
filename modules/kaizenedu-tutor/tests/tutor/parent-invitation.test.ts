/**
 * A teen starts sign-up and a parent finishes it (reference §3, D30), end to
 * end through the routes. The Resend call is captured so the test can read
 * the link the parent would click.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as me } from '@/app/(learner)/api/tutor/auth/me/route';
import { POST as accept } from '@/app/(learner)/api/tutor/auth/parent-invite/accept/route';
import { GET as readInvite } from '@/app/(learner)/api/tutor/auth/parent-invite/route';
import { POST as teenInvite } from '@/app/(learner)/api/tutor/auth/teen-invite/route';
import { POST as teenSignIn } from '@/app/(learner)/api/tutor/auth/teen-sign-in/route';
import {
  ADULT_INVITE_MESSAGE,
  resetSignInThrottleForTests,
  TEEN_INVITE_SENT_MESSAGE,
  UNDER_18_SIGNUP_MESSAGE,
} from '@/lib/tutor/accounts';
import { AUTH_API, PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { RESEND_ENDPOINT } from '@/lib/tutor/email';
import type {
  AcceptParentInviteRequest,
  AcceptParentInviteResponse,
  MeResponse,
  ParentInviteResponse,
  TeenInviteRequest,
  TeenInviteResponse,
  TeenSignInResponse,
} from '@/lib/tutor/wire';

import { addLearner, birthYearForAge, call, cookieOf, PASSWORD, signUpParent } from './_api';
import { testDb } from './_db';

interface SentMail {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

let db: TutorDb;
const outbox: SentMail[] = [];

const TEEN: TeenInviteRequest = {
  displayName: 'Maya',
  birthYear: birthYearForAge(15),
  loginName: 'maya.k',
  password: 'a teen password 123',
  parentEmail: 'parent@example.com',
};

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('RESEND_API_KEY', 're_test_123');
  vi.stubEnv('EMAIL_FROM', 'Natural Tutor <hello@example.com>');
  vi.stubEnv('LOG_LEVEL', 'error');
  db = await testDb();
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
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  resetSignInThrottleForTests();
  outbox.length = 0;
});

function invite(overrides: Partial<TeenInviteRequest> = {}) {
  return call<TeenInviteResponse>(teenInvite, AUTH_API.teenInvite, {
    body: { ...TEEN, ...overrides },
  });
}

function tokenIn(mail: SentMail): string {
  const match = new RegExp(`${PRODUCT_ROUTES.parentInvite}\\?t=([A-Za-z0-9_-]+)`).exec(mail.text);
  if (!match) throw new Error('the email carries no invitation link');
  return match[1]!;
}

async function inviteToken(overrides: Partial<TeenInviteRequest> = {}): Promise<string> {
  const res = await invite(overrides);
  if (res.status !== 200 || res.body.delivery !== 'sent') {
    throw new Error(`invite failed: ${res.status} ${res.body.error ?? res.body.delivery}`);
  }
  return tokenIn(outbox[outbox.length - 1]!);
}

function read(token: string) {
  return call<ParentInviteResponse>(readInvite, AUTH_API.parentInvite, { query: { t: token } });
}

function acceptWith(body: AcceptParentInviteRequest, cookie: string | null = null) {
  return call<AcceptParentInviteResponse>(accept, AUTH_API.parentInviteAccept, { body, cookie });
}

async function inviteRows(parentEmail: string) {
  const { rows } = await db.query<{
    account_id: string | null;
    used_at: string | Date | null;
    expires_at: string | Date;
    payload: Record<string, unknown>;
  }>(
    `SELECT account_id, used_at, expires_at, payload FROM auth_tokens
     WHERE email = $1 AND purpose = 'parent_invitation' ORDER BY created_at`,
    [parentEmail],
  );
  return rows;
}

describe('POST teen-invite', () => {
  it('emails the parent a seven-day link and keeps the password only as a hash', async () => {
    const before = Date.now();
    const res = await invite({ parentEmail: '  Parent@Example.com ' });
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBe('sent');
    expect(res.body.message).toBe(TEEN_INVITE_SENT_MESSAGE);
    expect(res.body.loginName).toBe('maya.k');
    expect(outbox).toHaveLength(1);
    expect(outbox[0]!.to).toEqual(['parent@example.com']);
    expect(outbox[0]!.subject).toContain('Maya');
    expect(outbox[0]!.text).toContain('maya.k');
    expect(outbox[0]!.text).not.toContain(TEEN.password);
    const rows = await inviteRows('parent@example.com');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.account_id).toBeNull();
    expect(rows[0]!.used_at).toBeNull();
    expect(String(rows[0]!.payload.loginHash)).toMatch(/^scrypt\$/);
    expect(rows[0]!.payload).not.toHaveProperty('password');
    const expiresIn = new Date(rows[0]!.expires_at).getTime() - before;
    expect(expiresIn).toBeGreaterThan(6.9 * 24 * 3_600_000);
    expect(expiresIn).toBeLessThanOrEqual(7.1 * 24 * 3_600_000);
  });

  it('sends an adult to the ordinary form and gives an under-13 the neutral sentence', async () => {
    const adult = await invite({ birthYear: birthYearForAge(25), parentEmail: 'a@example.com' });
    expect(adult.status).toBe(403);
    expect(adult.body.error).toBe(ADULT_INVITE_MESSAGE);
    const child = await invite({ birthYear: birthYearForAge(10), parentEmail: 'c@example.com' });
    expect(child.status).toBe(403);
    expect(child.body.error).toBe(UNDER_18_SIGNUP_MESSAGE);
    expect(outbox).toEqual([]);
    expect(await inviteRows('a@example.com')).toEqual([]);
    expect(await inviteRows('c@example.com')).toEqual([]);
  });

  it('refuses a login name a profile or an open invitation already holds', async () => {
    const { cookie } = await signUpParent('holder@example.com');
    await addLearner(cookie, {
      displayName: 'Sam',
      birthYear: birthYearForAge(14),
      loginName: 'taken.name',
      password: PASSWORD,
    });
    const taken = await invite({ loginName: 'taken.name', parentEmail: 'x@example.com' });
    expect(taken.status).toBe(409);
    expect(taken.body.errorCode).toBe('LOGIN_NAME_TAKEN');

    expect((await invite({ loginName: 'held.name', parentEmail: 'y@example.com' })).status).toBe(
      200,
    );
    const held = await invite({ loginName: 'held.name', parentEmail: 'z@example.com' });
    expect(held.status).toBe(409);
    expect(held.body.errorCode).toBe('LOGIN_NAME_TAKEN');
  });

  it('refuses a malformed login name', async () => {
    const res = await invite({ loginName: 'no spaces!', parentEmail: 'm@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_REQUEST');
  });

  it('says so, and stores nothing, when this deploy cannot send email', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    try {
      const res = await invite({ parentEmail: 'unsent@example.com', loginName: 'unsent.k' });
      expect(res.status).toBe(200);
      expect(res.body.delivery).toBe('not_configured');
      expect(res.body.message).toMatch(/RESEND_API_KEY/);
      expect(await inviteRows('unsent@example.com')).toEqual([]);
    } finally {
      vi.stubEnv('RESEND_API_KEY', 're_test_123');
    }
  });
});

describe('GET parent-invite', () => {
  it('reads the invitation without consuming it, and refuses a dead link', async () => {
    const token = await inviteToken({ parentEmail: 'reader@example.com', loginName: 'reader.k' });
    const first = await read(token);
    expect(first.status).toBe(200);
    expect(first.body.teen).toEqual({ displayName: 'Maya', loginName: 'reader.k', band: '13-17' });
    expect(first.body.parentEmail).toBe('reader@example.com');
    expect(first.body.existingAccount).toBe(false);
    expect((await read(token)).status).toBe(200);
    const dead = await read('x'.repeat(43));
    expect(dead.status).toBe(400);
    expect(dead.body.errorCode).toBe('INVALID_TOKEN');
    expect((await call(readInvite, AUTH_API.parentInvite)).status).toBe(400);
  });
});

describe('POST parent-invite/accept', () => {
  it('lets a new parent create the account around the profile, once', async () => {
    const token = await inviteToken({ parentEmail: 'new@example.com', loginName: 'new.teen' });
    const res = await acceptWith({ token, displayName: 'Pat', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe('new@example.com');
    expect(res.body.principal.role).toBe('parent');
    expect(res.body.teen.kind).toBe('teen');
    expect(res.body.teen.loginName).toBe('new.teen');
    expect(res.body.teen.status).toBe('active');
    expect(res.body.learners.map((learner) => learner.id)).toEqual([res.body.teen.id]);
    const cookie = cookieOf(res.headers);
    expect((await call<MeResponse>(me, AUTH_API.me, { cookie })).status).toBe(200);

    const { rows } = await db.query<{ method: string; evidence_ref: string | null }>(
      `SELECT method, evidence_ref FROM consents WHERE learner_id = $1`,
      [res.body.teen.id],
    );
    expect(rows).toEqual([{ method: 'parent_invitation', evidence_ref: expect.any(String) }]);

    const signedIn = await call<TeenSignInResponse>(teenSignIn, AUTH_API.teenSignIn, {
      body: { loginName: 'new.teen', password: TEEN.password },
    });
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.principal.role).toBe('learner');

    expect((await read(token)).status).toBe(400);
    const again = await acceptWith({ token, displayName: 'Pat', password: PASSWORD });
    expect(again.status).toBe(400);
    expect(again.body.errorCode).toBe('INVALID_TOKEN');
    expect(await inviteRows('new@example.com')).toMatchObject([
      { account_id: res.body.account.id },
    ]);
  });

  it('attaches the profile to the account that already has the address, after sign-in', async () => {
    const { cookie, state } = await signUpParent('existing@example.com');
    const token = await inviteToken({ parentEmail: 'existing@example.com', loginName: 'ex.teen' });
    expect((await read(token)).body.existingAccount).toBe(true);

    const anonymous = await acceptWith({ token, displayName: 'Pat', password: PASSWORD });
    expect(anonymous.status).toBe(409);

    const { cookie: other } = await signUpParent('someone-else@example.com');
    const wrong = await acceptWith({ token }, other);
    expect(wrong.status).toBe(403);
    expect((await read(token)).status).toBe(200);

    const res = await acceptWith({ token }, cookie);
    expect(res.status).toBe(200);
    expect(res.body.account.id).toBe(state.account.id);
    expect(res.body.teen.loginName).toBe('ex.teen');
    expect(res.headers.get('set-cookie')).toBeNull();
    const mine = await call<MeResponse>(me, AUTH_API.me, { cookie });
    expect(mine.body.learners.map((learner) => learner.loginName)).toEqual(['ex.teen']);
  });

  it('keeps the link usable when the login name was taken in the meantime', async () => {
    const token = await inviteToken({ parentEmail: 'race@example.com', loginName: 'race.name' });
    const { cookie } = await signUpParent('faster@example.com');
    await addLearner(cookie, {
      displayName: 'Quick',
      birthYear: birthYearForAge(14),
      loginName: 'race.name',
      password: PASSWORD,
    });
    const clash = await acceptWith({ token, displayName: 'Pat', password: PASSWORD });
    expect(clash.status).toBe(409);
    expect(clash.body.errorCode).toBe('LOGIN_NAME_TAKEN');
    expect((await read(token)).status).toBe(200);
    expect(await inviteRows('race@example.com')).toMatchObject([{ used_at: null }]);
    const res = await acceptWith({
      token,
      displayName: 'Pat',
      password: PASSWORD,
      loginName: 'race.name2',
    });
    expect(res.status).toBe(200);
    expect(res.body.teen.loginName).toBe('race.name2');
  });

  it('needs a name and a password for a new parent, and refuses a short one', async () => {
    const token = await inviteToken({ parentEmail: 'strict@example.com', loginName: 'strict.k' });
    const bare = await acceptWith({ token });
    expect(bare.status).toBe(400);
    expect(bare.body.errorCode).toBe('MISSING_REQUIRED_FIELD');
    const short = await acceptWith({ token, displayName: 'Pat', password: 'short' });
    expect(short.status).toBe(400);
    expect(short.body.errorCode).toBe('INVALID_REQUEST');
    expect((await read(token)).status).toBe(200);
  });

  it('refuses an expired link', async () => {
    const token = await inviteToken({ parentEmail: 'late@example.com', loginName: 'late.k' });
    await db.query(
      `UPDATE auth_tokens SET expires_at = now() - interval '1 minute' WHERE email = $1`,
      ['late@example.com'],
    );
    expect((await read(token)).status).toBe(400);
    expect((await acceptWith({ token, displayName: 'Pat', password: PASSWORD })).status).toBe(400);
  });

  it('is a 404 with the product off', async () => {
    vi.stubEnv('TUTOR_MODE', '0');
    try {
      expect((await invite()).status).toBe(404);
      expect((await read('x'.repeat(43))).status).toBe(404);
      expect((await acceptWith({ token: 'x'.repeat(43) })).status).toBe(404);
    } finally {
      vi.stubEnv('TUTOR_MODE', '1');
    }
  });
});
