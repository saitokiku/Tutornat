/**
 * Preview mode exists so the product can be walked through before any
 * database exists. Two properties make that safe rather than misleading, and
 * both are asserted here: reads answer with the sample fixture, writes are
 * refused instead of silently dropped, and — the one that matters most — the
 * whole mode is off the instant a database is configured, so it can never
 * stand in for a real account or expose a real learner's rows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setTutorDbForTests, type TutorDb } from '@/lib/tutor/db';
import { isPreviewMode, PREVIEW_ACCOUNT_ID } from '@/lib/tutor/preview';

import { testDb } from './_db';

async function call(handler: (r: Request) => Promise<Response>, path: string, init?: RequestInit) {
  const response = await handler(new Request(`https://preview.test${path}`, init));
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe('preview mode', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('TUTOR_MODE', '1');
    vi.stubEnv('DATABASE_URL', '');
    await setTutorDbForTests(null);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await setTutorDbForTests(null);
  });

  it('is on when the product is on and no database is configured', () => {
    expect(isPreviewMode()).toBe(true);
  });

  it('turns itself off the moment DATABASE_URL is set', () => {
    // The production condition: a configured deployment has the variable, and
    // that alone must end preview mode, before any connection is attempted.
    vi.stubEnv('DATABASE_URL', 'postgres://user:pw@example.invalid:5432/app');
    expect(isPreviewMode()).toBe(false);
  });

  // Booting Postgres in WASM takes seconds, and more when the machine is
  // busy. This assertion is the safety net for the whole mode, so it gets
  // room to finish rather than being allowed to flake.
  it('turns itself off when a real database is connected', async () => {
    let db: TutorDb | undefined;
    try {
      db = await testDb();
      expect(isPreviewMode()).toBe(false);
    } finally {
      await db?.end();
      await setTutorDbForTests(null);
    }
  }, 30_000);

  it('is off when the product itself is off, whatever the database says', () => {
    vi.stubEnv('TUTOR_MODE', '');
    expect(isPreviewMode()).toBe(false);
  });

  it('answers a parent report from the sample learner, labelled as generated', async () => {
    const { GET } = await import('@/app/(parent)/api/parent/report/route');
    const res = await call(GET, '/api/parent/report?learnerId=lrn_preview');
    expect(res.status).toBe(200);
    const report = res.body.report as { learnerId: string; skills: unknown[] };
    expect(report.learnerId).toBe('lrn_preview');
    expect(report.skills.length).toBeGreaterThan(0);
    expect(String(res.body.generatedLabel)).toMatch(/generated/i);
  });

  it('lists the sample learner and keeps the under-13 gate shut', async () => {
    const { GET } = await import('@/app/(parent)/api/parent/learners/route');
    const res = await call(GET, '/api/parent/learners');
    expect(res.status).toBe(200);
    expect((res.body.learners as Array<{ accountId: string }>)[0]?.accountId).toBe(
      PREVIEW_ACCOUNT_ID,
    );
    expect(res.body.under13Open).toBe(false);
  });

  it('refuses to add a learner rather than pretending it saved one', async () => {
    const { POST } = await import('@/app/(parent)/api/parent/learners/route');
    const res = await call(POST, '/api/parent/learners', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: 'Sam', birthYear: 2014 }),
    });
    expect(res.status).toBe(503);
    expect(res.body.errorCode).toBe('PREVIEW_READ_ONLY');
    expect(String(res.body.error)).toContain('DATABASE_URL');
  });

  it('refuses consent writes, which must never be faked', async () => {
    const { POST } = await import('@/app/(parent)/api/parent/consent/route');
    const res = await call(POST, '/api/parent/consent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        learnerId: 'lrn_preview',
        camera: false,
        noticeVersion: '1',
        policyVersion: '1',
        method: 'checkbox',
      }),
    });
    expect(res.status).toBe(503);
    expect(res.body.errorCode).toBe('PREVIEW_READ_ONLY');
  });
});
