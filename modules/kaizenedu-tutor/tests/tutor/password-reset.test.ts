/**
 * Password reset, end to end through the routes (reference §2: an account
 * with a forgotten password must not be lost). The Resend call is captured
 * so the test can read the link a person would click.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as me } from '@/app/(learner)/api/tutor/auth/me/route';
import { POST as requestReset } from '@/app/(learner)/api/tutor/auth/password-reset/request/route';
import { POST as reset } from '@/app/(learner)/api/tutor/auth/password-reset/route';
import { POST as signIn } from '@/app/(learner)/api/tutor/auth/sign-in/route';
import {
  RESET_REQUESTED_MESSAGE,
  resetSignInThrottleForTests,
  SIGN_IN_MAX_ATTEMPTS,
} from '@/lib/tutor/accounts';
import { AUTH_API, PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { RESEND_ENDPOINT } from '@/lib/tutor/email';
import type {
  MeResponse,
  RequestPasswordResetResponse,
  ResetPasswordResponse,
  SignInResponse,
} from '@/lib/tutor/wire';

import { call, cookieOf, PASSWORD, signUpParent } from './_api';
import { testDb } from './_db';

interface SentMail {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

let db: TutorDb;
const outbox: SentMail[] = [];
let sendStatus = 200;
const NEW_PASSWORD = 'a completely different one';

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  vi.stubEnv('RESEND_API_KEY', 're_test_123');
  vi.stubEnv('EMAIL_FROM', 'Natural Tutor <hello@example.com>');
  vi.stubEnv('LOG_LEVEL', 'error');
  db = await testDb();
  // Installed after the database is up, and only the Resend endpoint is
  // intercepted; anything else keeps the real fetch.
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
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  resetSignInThrottleForTests();
  outbox.length = 0;
  sendStatus = 200;
});

function requestFor(email: string, headers: Record<string, string> = {}) {
  return call<RequestPasswordResetResponse>(requestReset, AUTH_API.passwordResetRequest, {
    body: { email },
    headers,
  });
}

function resetWith(token: string, password = NEW_PASSWORD) {
  return call<ResetPasswordResponse>(reset, AUTH_API.passwordReset, { body: { token, password } });
}

function tokenIn(mail: SentMail): string {
  const match = new RegExp(`${PRODUCT_ROUTES.resetPassword}\\?t=([A-Za-z0-9_-]+)`).exec(mail.text);
  if (!match) throw new Error('the email carries no reset link');
  return match[1]!;
}

async function tokenRows(email: string) {
  const { rows } = await db.query<{
    token_hash: string;
    used_at: string | Date | null;
    expires_at: string | Date;
  }>(
    `SELECT token_hash, used_at, expires_at FROM auth_tokens
     WHERE email = $1 AND purpose = 'password_reset' ORDER BY created_at`,
    [email],
  );
  return rows;
}

describe('POST password-reset/request', () => {
  it('answers the same sentence for an unknown address and sends nothing', async () => {
    const res = await requestFor('nobody@example.com');
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBe('sent');
    expect(res.body.message).toBe(RESET_REQUESTED_MESSAGE);
    expect(outbox).toEqual([]);
    expect(await tokenRows('nobody@example.com')).toEqual([]);
  });

  it('emails a one-hour link to a known address and keeps only its hash', async () => {
    await signUpParent('known@example.com');
    const before = Date.now();
    const res = await requestFor('  Known@Example.com ');
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBe('sent');
    expect(res.body.message).toBe(RESET_REQUESTED_MESSAGE);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]!.to).toEqual(['known@example.com']);
    expect(outbox[0]!.subject).toMatch(/password/i);
    const token = tokenIn(outbox[0]!);
    expect(outbox[0]!.text).toContain(`http://localhost${PRODUCT_ROUTES.resetPassword}?t=${token}`);
    const rows = await tokenRows('known@example.com');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.used_at).toBeNull();
    expect(rows[0]!.token_hash).not.toBe(token);
    expect(rows[0]!.token_hash).not.toContain(token);
    const expiresIn = new Date(rows[0]!.expires_at).getTime() - before;
    expect(expiresIn).toBeGreaterThan(59 * 60_000);
    expect(expiresIn).toBeLessThanOrEqual(61 * 60_000);
  });

  it('voids the older link when a newer one is requested', async () => {
    await signUpParent('twice@example.com');
    await requestFor('twice@example.com');
    await requestFor('twice@example.com');
    const [first, second] = outbox.map(tokenIn);
    const stale = await resetWith(first!);
    expect(stale.status).toBe(400);
    expect(stale.body.errorCode).toBe('INVALID_TOKEN');
    const fresh = await resetWith(second!);
    expect(fresh.status).toBe(200);
  });

  it('says so, and stores nothing, when this deploy cannot send email', async () => {
    await signUpParent('unsent@example.com');
    vi.stubEnv('RESEND_API_KEY', '');
    try {
      const res = await requestFor('unsent@example.com');
      expect(res.status).toBe(200);
      expect(res.body.delivery).toBe('not_configured');
      expect(res.body.message).toMatch(/RESEND_API_KEY/);
      expect(outbox).toEqual([]);
      expect(await tokenRows('unsent@example.com')).toEqual([]);
    } finally {
      vi.stubEnv('RESEND_API_KEY', 're_test_123');
    }
  });

  it('kills the link when the sender refuses, and says the send failed', async () => {
    await signUpParent('refused@example.com');
    sendStatus = 500;
    const res = await requestFor('refused@example.com');
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBe('failed');
    const rows = await tokenRows('refused@example.com');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.used_at).not.toBeNull();
    sendStatus = 200;
    const dead = await resetWith(tokenIn(outbox[0]!));
    expect(dead.status).toBe(400);
  });

  it('throttles a flood per address, and per caller across addresses', async () => {
    for (let i = 0; i < SIGN_IN_MAX_ATTEMPTS; i += 1) {
      expect((await requestFor('flood@example.com')).status).toBe(200);
    }
    const blocked = await requestFor('flood@example.com');
    expect(blocked.status).toBe(429);
    expect(blocked.body.errorCode).toBe('RATE_LIMITED');
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);

    const caller = { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' };
    for (let i = 0; i < SIGN_IN_MAX_ATTEMPTS; i += 1) {
      expect((await requestFor(`many${i}@example.com`, caller)).status).toBe(200);
    }
    expect((await requestFor('another@example.com', caller)).status).toBe(429);
    expect((await requestFor('another@example.com')).status).toBe(200);
  });

  it('refuses a malformed address without looking anything up', async () => {
    const res = await requestFor('not-an-email');
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_REQUEST');
  });
});

describe('POST password-reset', () => {
  it('sets the new password, signs in, and signs out every other session', async () => {
    const { cookie: oldCookie } = await signUpParent('holder@example.com');
    await requestFor('holder@example.com');
    const res = await resetWith(tokenIn(outbox[0]!));
    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe('holder@example.com');
    expect(res.body.principal.role).toBe('parent');
    const newCookie = cookieOf(res.headers);

    expect((await call<MeResponse>(me, AUTH_API.me, { cookie: oldCookie })).status).toBe(401);
    expect((await call<MeResponse>(me, AUTH_API.me, { cookie: newCookie })).status).toBe(200);

    const old = await call<SignInResponse>(signIn, AUTH_API.signIn, {
      body: { email: 'holder@example.com', password: PASSWORD },
    });
    expect(old.status).toBe(401);
    const fresh = await call<SignInResponse>(signIn, AUTH_API.signIn, {
      body: { email: 'holder@example.com', password: NEW_PASSWORD },
    });
    expect(fresh.status).toBe(200);
  });

  it('refuses a link that was already used', async () => {
    await signUpParent('once@example.com');
    await requestFor('once@example.com');
    const token = tokenIn(outbox[0]!);
    expect((await resetWith(token)).status).toBe(200);
    const again = await resetWith(token, 'yet another password');
    expect(again.status).toBe(400);
    expect(again.body.errorCode).toBe('INVALID_TOKEN');
  });

  it('refuses an expired link', async () => {
    await signUpParent('late@example.com');
    await requestFor('late@example.com');
    await db.query(
      `UPDATE auth_tokens SET expires_at = now() - interval '1 minute' WHERE email = $1`,
      ['late@example.com'],
    );
    const res = await resetWith(tokenIn(outbox[0]!));
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_TOKEN');
  });

  it('refuses an unknown token and a short password without consuming anything', async () => {
    await signUpParent('careful@example.com');
    await requestFor('careful@example.com');
    const token = tokenIn(outbox[0]!);
    expect((await resetWith('x'.repeat(43))).status).toBe(400);
    const short = await resetWith(token, 'short');
    expect(short.status).toBe(400);
    expect(short.body.errorCode).toBe('INVALID_REQUEST');
    expect((await resetWith(token)).status).toBe(200);
  });

  it('is a 404 with the product off', async () => {
    vi.stubEnv('TUTOR_MODE', '0');
    try {
      expect((await requestFor('anyone@example.com')).status).toBe(404);
      expect((await resetWith('x'.repeat(43))).status).toBe(404);
    } finally {
      vi.stubEnv('TUTOR_MODE', '1');
    }
  });
});
