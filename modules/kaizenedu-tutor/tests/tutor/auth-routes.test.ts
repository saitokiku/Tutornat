/**
 * The auth routes (spec R5, R6, R10, D18): sign-up for parents and adults,
 * the neutral under-18 refusal, sign-in with the throttle, session state,
 * profile selection with ownership and status checks, teen sign-in, sign-out,
 * and the TUTOR_MODE and database gates.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as selectLearner } from '@/app/(learner)/api/tutor/auth/learner/route';
import { GET as me } from '@/app/(learner)/api/tutor/auth/me/route';
import { POST as signIn } from '@/app/(learner)/api/tutor/auth/sign-in/route';
import { POST as signOut } from '@/app/(learner)/api/tutor/auth/sign-out/route';
import { POST as signUp } from '@/app/(learner)/api/tutor/auth/sign-up/route';
import { POST as teenSignIn } from '@/app/(learner)/api/tutor/auth/teen-sign-in/route';
import { GET as listLearners } from '@/app/(parent)/api/parent/learners/route';
import {
  resetSignInThrottleForTests,
  SIGN_IN_MAX_ATTEMPTS,
  UNDER_18_SIGNUP_MESSAGE,
} from '@/lib/tutor/accounts';
import { AUTH_API, PARENT_API } from '@/lib/tutor/contracts';
import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import type {
  MeResponse,
  SelectLearnerResponse,
  SignInResponse,
  SignUpResponse,
  TeenSignInResponse,
} from '@/lib/tutor/wire';

import {
  addLearner,
  birthYearForAge,
  call,
  cookieOf,
  PASSWORD,
  signUpAdult,
  signUpParent,
} from './_api';
import { testDb } from './_db';

let db: TutorDb;

beforeAll(async () => {
  vi.stubEnv('TUTOR_MODE', '1');
  db = await testDb();
});

afterAll(async () => {
  await setTutorDbForTests(null);
  await db.end();
  vi.unstubAllEnvs();
});

async function countAccounts(email: string): Promise<number> {
  const { rows } = await db.query<{ n: number | string }>(
    `SELECT count(*)::int AS n FROM accounts WHERE email = $1`,
    [email],
  );
  return Number(rows[0]?.n ?? 0);
}

describe('POST sign-up', () => {
  it('creates a parent account with a trial subscription and sets the session cookie (201)', async () => {
    const res = await call<SignUpResponse>(signUp, AUTH_API.signUp, {
      body: {
        email: '  Parent@Example.com ',
        password: PASSWORD,
        displayName: 'Pat',
        kind: 'parent',
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.account.email).toBe('parent@example.com');
    expect(res.body.account.displayName).toBe('Pat');
    expect(res.body.principal).toEqual({ learnerId: null, role: 'parent', band: null });
    expect(res.body.learners).toEqual([]);
    expect(res.body.learner).toBeNull();
    expect(res.headers.get('set-cookie')).toMatch(
      /^nt_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax/,
    );
    const { rows } = await db.query<{ status: string }>(
      `SELECT status FROM subscriptions WHERE account_id = $1`,
      [res.body.account.id],
    );
    expect(rows[0]?.status).toBe('trial');
  });

  it('creates an adult learner account with its own profile selected', async () => {
    const res = await call<SignUpResponse>(signUp, AUTH_API.signUp, {
      body: {
        email: 'alex@example.com',
        password: PASSWORD,
        displayName: 'Alex',
        kind: 'adult',
        birthYear: 1990,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.learners).toHaveLength(1);
    const learner = res.body.learners[0]!;
    expect(learner).toMatchObject({
      kind: 'self',
      band: 'adult',
      status: 'active',
      loginName: null,
    });
    expect(res.body.learner?.id).toBe(learner.id);
    expect(res.body.principal).toEqual({ learnerId: learner.id, role: 'adult', band: 'adult' });
  });

  it('refuses an under-18 self-signup with a neutral message and writes nothing', async () => {
    const res = await call(signUp, AUTH_API.signUp, {
      body: {
        email: 'teen@example.com',
        password: PASSWORD,
        displayName: 'Sam',
        kind: 'adult',
        birthYear: birthYearForAge(15),
      },
    });
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('FORBIDDEN');
    expect(res.body.error).toBe(UNDER_18_SIGNUP_MESSAGE);
    expect(res.body.error).not.toMatch(/\d/);
    expect(await countAccounts('teen@example.com')).toBe(0);
  });

  it('answers 409 EMAIL_TAKEN for a duplicate email regardless of case', async () => {
    const res = await call(signUp, AUTH_API.signUp, {
      body: { email: 'PARENT@example.com', password: PASSWORD, displayName: 'Pat', kind: 'parent' },
    });
    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('EMAIL_TAKEN');
    expect(await countAccounts('parent@example.com')).toBe(1);
  });

  it('validates the body', async () => {
    const short = await call(signUp, AUTH_API.signUp, {
      body: { email: 'new@example.com', password: 'short', displayName: 'Pat', kind: 'parent' },
    });
    expect(short.status).toBe(400);
    expect(short.body.errorCode).toBe('INVALID_REQUEST');
    expect(short.body.error).toMatch(/^password:/);
    const badEmail = await call(signUp, AUTH_API.signUp, {
      body: { email: 'not-an-email', password: PASSWORD, displayName: 'Pat', kind: 'parent' },
    });
    expect(badEmail.status).toBe(400);
    const noYear = await call(signUp, AUTH_API.signUp, {
      body: { email: 'new@example.com', password: PASSWORD, displayName: 'Pat', kind: 'adult' },
    });
    expect(noYear.status).toBe(400);
    expect(noYear.body.errorCode).toBe('MISSING_REQUIRED_FIELD');
    const notJson = await call(signUp, AUTH_API.signUp, { method: 'POST', body: '{not json' });
    expect(notJson.status).toBe(400);
    expect(await countAccounts('new@example.com')).toBe(0);
  });

  it('answers 404 when TUTOR_MODE is off', async () => {
    vi.stubEnv('TUTOR_MODE', '0');
    try {
      const res = await call(signUp, AUTH_API.signUp, {
        body: { email: 'off@example.com', password: PASSWORD, displayName: 'Pat', kind: 'parent' },
      });
      expect(res.status).toBe(404);
      expect((await call(me, AUTH_API.me)).status).toBe(404);
    } finally {
      vi.stubEnv('TUTOR_MODE', '1');
    }
  });

  it("refuses to sign anyone up when there is no database, in the reader's terms", async () => {
    await setTutorDbForTests(null);
    vi.stubEnv('DATABASE_URL', '');
    try {
      const res = await call(signUp, AUTH_API.signUp, {
        body: { email: 'nodb@example.com', password: PASSWORD, displayName: 'Pat', kind: 'parent' },
      });
      expect(res.status).toBe(503);
      // With the product on and no database, the deployment is in preview
      // mode, so the refusal speaks to the visitor rather than telling them
      // to set an environment variable — while still naming it for whoever
      // runs the deployment.
      expect(res.body.errorCode).toBe('PREVIEW_READ_ONLY');
      expect(res.body.error).toContain('preview');
      expect(res.body.error).toContain('DATABASE_URL');
      // `me` is the exception: the shell needs an identity to render, so in
      // preview mode it answers with the sample account rather than a refusal.
      // It must be unmistakably the sample one, never a real address.
      const meRes = await call<MeResponse>(me, AUTH_API.me, { cookie: 'nt_session=whatever' });
      expect(meRes.status).toBe(200);
      expect(meRes.body.account.email).toContain('preview.invalid');
      expect(meRes.body.learner?.displayName).toBe('Sample learner');
    } finally {
      vi.unstubAllEnvs();
      vi.stubEnv('TUTOR_MODE', '1');
      await setTutorDbForTests(db, false);
    }
  });
});

describe('POST sign-in', () => {
  it('signs in with the right password and sets a fresh cookie', async () => {
    const res = await call<SignInResponse>(signIn, AUTH_API.signIn, {
      body: { email: 'Parent@Example.com', password: PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body.principal).toEqual({ learnerId: null, role: 'parent', band: null });
    const cookie = cookieOf(res.headers);
    const meRes = await call<MeResponse>(me, AUTH_API.me, { cookie });
    expect(meRes.status).toBe(200);
    expect(meRes.body.account.email).toBe('parent@example.com');
  });

  it('selects the self profile for an adult learner account', async () => {
    const res = await call<SignInResponse>(signIn, AUTH_API.signIn, {
      body: { email: 'alex@example.com', password: PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body.principal.role).toBe('adult');
    expect(res.body.principal.learnerId).toBe(res.body.learners[0]?.id);
    expect(res.body.learner?.kind).toBe('self');
  });

  it('answers the same 401 for a wrong password and an unknown email', async () => {
    const wrong = await call(signIn, AUTH_API.signIn, {
      body: { email: 'parent@example.com', password: 'not the password' },
    });
    const unknown = await call(signIn, AUTH_API.signIn, {
      body: { email: 'nobody@example.com', password: PASSWORD },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.headers.get('set-cookie')).toBeNull();
  });

  it('throttles an email after repeated failures (429 with retry-after)', async () => {
    resetSignInThrottleForTests();
    for (let attempt = 0; attempt < SIGN_IN_MAX_ATTEMPTS; attempt += 1) {
      const res = await call(signIn, AUTH_API.signIn, {
        body: { email: 'throttle@example.com', password: 'wrong password here' },
      });
      expect(res.status).toBe(401);
    }
    const blocked = await call(signIn, AUTH_API.signIn, {
      body: { email: 'throttle@example.com', password: 'wrong password here' },
    });
    expect(blocked.status).toBe(429);
    expect(blocked.body.errorCode).toBe('RATE_LIMITED');
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    // Another email is not affected.
    const other = await call(signIn, AUTH_API.signIn, {
      body: { email: 'parent@example.com', password: PASSWORD },
    });
    expect(other.status).toBe(200);
    resetSignInThrottleForTests();
  });
});

describe('GET me and POST learner', () => {
  let parentCookie: string;
  let otherCookie: string;
  let teenId: string;
  let childId: string;

  beforeAll(async () => {
    parentCookie = (await signUpParent('select@example.com')).cookie;
    otherCookie = (await signUpParent('other@example.com')).cookie;
    teenId = (
      await addLearner(parentCookie, {
        displayName: 'Sam',
        birthYear: birthYearForAge(15),
        loginName: 'sam_select',
        password: PASSWORD,
      })
    ).learner.id;
    childId = (
      await addLearner(parentCookie, { displayName: 'Maya', birthYear: birthYearForAge(10) })
    ).learner.id;
  });

  it('me answers 401 without a cookie and the session state with one', async () => {
    expect((await call(me, AUTH_API.me)).status).toBe(401);
    expect((await call(me, AUTH_API.me, { cookie: 'nt_session=stale' })).status).toBe(401);
    const res = await call<MeResponse>(me, AUTH_API.me, { cookie: parentCookie });
    expect(res.status).toBe(200);
    expect(res.body.learners.map((learner) => learner.id).sort()).toEqual([childId, teenId].sort());
    expect(res.body.learner).toBeNull();
  });

  it('selects an own learner and refuses a foreign one with 404', async () => {
    const res = await call<SelectLearnerResponse>(selectLearner, AUTH_API.selectLearner, {
      cookie: parentCookie,
      body: { learnerId: teenId },
    });
    expect(res.status).toBe(200);
    expect(res.body.learner.id).toBe(teenId);
    expect(res.body.principal).toEqual({ learnerId: teenId, role: 'parent', band: '13-17' });
    const meRes = await call<MeResponse>(me, AUTH_API.me, { cookie: parentCookie });
    expect(meRes.body.learner?.id).toBe(teenId);
    expect(meRes.body.principal.band).toBe('13-17');

    const foreign = await call(selectLearner, AUTH_API.selectLearner, {
      cookie: otherCookie,
      body: { learnerId: teenId },
    });
    expect(foreign.status).toBe(404);
    const otherMe = await call<MeResponse>(me, AUTH_API.me, { cookie: otherCookie });
    expect(otherMe.body.learner).toBeNull();
  });

  it('refuses a locked child profile with 409 LEARNER_LOCKED', async () => {
    const res = await call(selectLearner, AUTH_API.selectLearner, {
      cookie: parentCookie,
      body: { learnerId: childId },
    });
    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('LEARNER_LOCKED');
  });

  it('validates the body and requires a session', async () => {
    expect(
      (await call(selectLearner, AUTH_API.selectLearner, { cookie: parentCookie, body: {} }))
        .status,
    ).toBe(400);
    expect(
      (await call(selectLearner, AUTH_API.selectLearner, { body: { learnerId: teenId } })).status,
    ).toBe(401);
  });
});

describe('POST teen-sign-in', () => {
  let parentCookie: string;
  let teenId: string;

  beforeAll(async () => {
    parentCookie = (await signUpParent('teenparent@example.com')).cookie;
    teenId = (
      await addLearner(parentCookie, {
        displayName: 'Sam',
        birthYear: birthYearForAge(14),
        loginName: 'Sam_Teen',
        password: PASSWORD,
      })
    ).learner.id;
    await addLearner(parentCookie, { displayName: 'Maya', birthYear: birthYearForAge(11) });
  });

  it('signs the teen in as role learner with only its own profile visible', async () => {
    const res = await call<TeenSignInResponse>(teenSignIn, AUTH_API.teenSignIn, {
      body: { loginName: ' sam_teen ', password: PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body.principal).toEqual({ learnerId: teenId, role: 'learner', band: '13-17' });
    expect(res.body.learners.map((learner) => learner.id)).toEqual([teenId]);
    expect(res.body.learner?.loginName).toBe('sam_teen');
    const cookie = cookieOf(res.headers);

    const parentRoute = await call(listLearners, PARENT_API.learners, { cookie });
    expect(parentRoute.status).toBe(403);
    expect(parentRoute.body.errorCode).toBe('FORBIDDEN');
    const switching = await call(selectLearner, AUTH_API.selectLearner, {
      cookie,
      body: { learnerId: teenId },
    });
    expect(switching.status).toBe(403);
  });

  it('rejects a wrong password with 401 and a paused profile with 403', async () => {
    const wrong = await call(teenSignIn, AUTH_API.teenSignIn, {
      body: { loginName: 'sam_teen', password: 'not the password' },
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.errorCode).toBe('INVALID_CREDENTIALS');
    const unknown = await call(teenSignIn, AUTH_API.teenSignIn, {
      body: { loginName: 'nobody_here', password: PASSWORD },
    });
    expect(unknown.body).toEqual(wrong.body);

    await db.query(`UPDATE learners SET status = 'frozen' WHERE id = $1`, [teenId]);
    const frozen = await call(teenSignIn, AUTH_API.teenSignIn, {
      body: { loginName: 'sam_teen', password: PASSWORD },
    });
    expect(frozen.status).toBe(403);
    expect(frozen.body.errorCode).toBe('LEARNER_FROZEN');
    await db.query(`UPDATE learners SET status = 'active' WHERE id = $1`, [teenId]);
  });
});

describe('POST sign-out', () => {
  it('destroys the session and clears the cookie', async () => {
    const { cookie } = await signUpAdult('signout@example.com');
    const res = await call(signOut, AUTH_API.signOut, { method: 'POST', cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toMatch(/^nt_session=; .*Max-Age=0/);
    const after = await call(me, AUTH_API.me, { cookie });
    expect(after.status).toBe(401);
    const stale = await call(signOut, AUTH_API.signOut, { method: 'POST', cookie });
    expect(stale.status).toBe(401);
    expect(stale.headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });
});
