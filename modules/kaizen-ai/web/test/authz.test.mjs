// Regression tests for the authorization fail-open defects.
//
// Context: before this suite, zero of the ~46 route handlers and none of the
// auth helpers had a single test. CI builds with no env vars, so the ONLY path
// automated checks ever exercised was demo mode — which was also the fail-open
// path (isAdminCaller returned true for everyone). Each test below pins a
// specific hole shut.

import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminCaller } from '@/lib/server/context.js';
import { appUrl } from '@/lib/server/stripe.js';

// ── isAdminCaller must fail CLOSED ───────────────────────────────────────────

test('a demo caller is NEVER an admin', () => {
  // Was `if (caller.demo) return true`. A deployment that lost its Supabase env
  // vars served an unauthenticated, fully-open admin API.
  assert.equal(isAdminCaller({ demo: true }), false);
});

test('a missing or malformed caller is never an admin', () => {
  assert.equal(isAdminCaller(null), false);
  assert.equal(isAdminCaller(undefined), false);
  assert.equal(isAdminCaller({}), false);
  assert.equal(isAdminCaller({ user: {} }), false);
  assert.equal(isAdminCaller({ user: { email: '' } }), false);
  assert.equal(isAdminCaller({ profile: {} }), false);
});

test('an ordinary signed-in user is not an admin', () => {
  assert.equal(
    isAdminCaller({ user: { id: 'u1', email: 'student@example.com' }, profile: { role: 'student' } }),
    false
  );
  // 'tutor' is a self-serve role (POST /api/tutoring/tutors sets it) — it must
  // never imply admin.
  assert.equal(
    isAdminCaller({ user: { id: 'u2', email: 'tutor@example.com' }, profile: { role: 'tutor' } }),
    false
  );
});

test('admin comes from profiles.role or ADMIN_EMAILS, and email match is exact', () => {
  assert.equal(
    isAdminCaller({ user: { id: 'a1', email: 'x@example.com' }, profile: { role: 'admin' } }),
    true
  );

  const prev = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = 'Boss@Example.com , second@example.com';
  try {
    // case-insensitive + whitespace-tolerant
    assert.equal(isAdminCaller({ user: { email: 'boss@example.com' } }), true);
    assert.equal(isAdminCaller({ user: { email: 'BOSS@EXAMPLE.COM' } }), true);
    assert.equal(isAdminCaller({ user: { email: 'second@example.com' } }), true);
    // but not a substring or lookalike
    assert.equal(isAdminCaller({ user: { email: 'boss@example.com.evil.tld' } }), false);
    assert.equal(isAdminCaller({ user: { email: 'notboss@example.com' } }), false);
    // and an empty email must not match an empty entry
    process.env.ADMIN_EMAILS = 'boss@example.com,,';
    assert.equal(isAdminCaller({ user: { email: '' } }), false);
    assert.equal(isAdminCaller({ user: {} }), false);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prev;
  }
});

// ── appUrl must not take payment redirect targets from request headers ───────

const reqWith = (headers) => ({ headers: { get: (k) => headers[k.toLowerCase()] ?? null } });

test('APP_URL always wins and its trailing slash is trimmed', () => {
  const prev = process.env.APP_URL;
  process.env.APP_URL = 'https://kaizen.example/';
  try {
    assert.equal(appUrl(reqWith({ origin: 'https://evil.tld' })), 'https://kaizen.example');
  } finally {
    if (prev === undefined) delete process.env.APP_URL; else process.env.APP_URL = prev;
  }
});

test('a spoofed Origin/Host can never become a Stripe redirect target', () => {
  // This value lands in Stripe success_url / cancel_url / portal return_url.
  // Honouring Origin sent a real paying customer to an attacker's page right
  // after a genuine charge.
  const prevUrl = process.env.APP_URL;
  const prevEnv = process.env.NODE_ENV;
  delete process.env.APP_URL;
  try {
    process.env.NODE_ENV = 'production';
    assert.throws(
      () => appUrl(reqWith({ origin: 'https://evil.tld', host: 'evil.tld' })),
      /APP_URL is not set/,
      'production with no APP_URL must fail closed, not trust the caller'
    );

    // Development may fall back, but ONLY to loopback — never to a remote host.
    process.env.NODE_ENV = 'development';
    assert.equal(appUrl(reqWith({ host: 'localhost:3000' })), 'http://localhost:3000');
    assert.equal(appUrl(reqWith({ host: '127.0.0.1:3210' })), 'http://127.0.0.1:3210');
    assert.equal(appUrl(reqWith({ origin: 'https://evil.tld', host: 'evil.tld' })), 'http://localhost:3000');
    // a host that merely *contains* localhost is not loopback
    assert.equal(appUrl(reqWith({ host: 'localhost.evil.tld' })), 'http://localhost:3000');
  } finally {
    if (prevUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = prevUrl;
    process.env.NODE_ENV = prevEnv;
  }
});
