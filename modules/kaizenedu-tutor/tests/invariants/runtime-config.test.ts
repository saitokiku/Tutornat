/**
 * The product's defaults have to survive the trip to a serverless host.
 *
 * They did not. `DEFAULT_MODEL` sat in the tracked `.env`, `.env` was traced
 * into every function bundle, and the runtime still saw nothing — a Vercel
 * function's working directory is not the project root the trace was written
 * relative to, so the loader in `instrumentation.ts` read a path that does not
 * exist there. Every turn on production died with "No model could be
 * resolved", and `/api/tutor/health` reported the model as `built-in` on a
 * deploy whose `.env` plainly named one.
 *
 * `scripts/generate-runtime-config.mjs` moves that resolution to build time,
 * where the working directory is known. These tests hold three things in
 * place: that the generated module stays in step with `.env`, that it can
 * never carry a credential, and that a value set on the host still wins.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { TUTOR_MODELS } from '@/kaizen.config';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import { BAKED_KEYS } from '@/lib/server/runtime-config.generated';

const ROOT = process.cwd();
const GENERATED = join(ROOT, 'lib', 'server', 'runtime-config.generated.ts');
const GENERATOR = join(ROOT, 'scripts', 'generate-runtime-config.mjs');

const before = readFileSync(GENERATED, 'utf8');

afterAll(() => {
  // The drift check below regenerates the file. Put back exactly what was
  // committed so a test run never shows up as a working-tree change.
  execFileSync('node', [GENERATOR], { cwd: ROOT, stdio: 'ignore' });
});

describe('the baked runtime config', () => {
  it('is in step with .env', () => {
    // The file is committed so that tsc, eslint and this suite — all of which
    // run before `next build` — have something to import. Committed means it
    // can go stale, so regenerating it must be a no-op.
    execFileSync('node', [GENERATOR], { cwd: ROOT, stdio: 'ignore' });
    expect(readFileSync(GENERATED, 'utf8')).toBe(before);
  });

  it('carries the product switches the runtime cannot otherwise get', () => {
    expect(BAKED_KEYS).toContain('TUTOR_MODE');
    expect(BAKED_KEYS).toContain('DEFAULT_MODEL');
    expect(BAKED_KEYS).toContain('TUTOR_STAFF_EMAILS');
  });

  it('carries nothing shaped like a credential', () => {
    // Two fences in the generator: an allowlist of names, and a deny pattern
    // that rejects credential-shaped keys even if one is added to `.env` by
    // mistake. This asserts the outcome of both.
    for (const key of BAKED_KEYS) {
      expect(key).not.toMatch(/_API_KEY$|_SECRET$|_TOKEN$|_PASSWORD$|_ACCESS_KEY$/);
      expect(key).not.toBe('DATABASE_URL');
    }
  });

  it('never opens .env.local', () => {
    // `.env.local` holds real provider credentials. The generator must read
    // only the tracked, non-secret file; this is the line that keeps a secret
    // out of a build artifact.
    const source = readFileSync(GENERATOR, 'utf8');
    const reads = source.match(/join\(ROOT, '[^']+'\)/g) ?? [];
    expect(reads.some((call) => call.includes('.env.local'))).toBe(false);
  });

  it('never routes the live turn to a model that blows the latency budget', () => {
    // Caught in review, not in theory: baking `.env` into the bundle started
    // actually delivering DEFAULT_MODEL, and DEFAULT_MODEL was the *strong*
    // model. Fixing the delivery bug therefore moved the live turn from 674 ms
    // to first token onto one measured at 4,803-6,893 ms — a latency
    // regression created by fixing an outage, which is exactly the kind that
    // ships. The live turn is on the speech path; it takes the fast model.
    const routes = JSON.parse(
      readFileSync(join(ROOT, '.env'), 'utf8')
        .split('\n')
        .find((line) => line.startsWith('MODEL_ROUTES='))!
        .slice('MODEL_ROUTES='.length),
    ) as Record<string, string>;
    expect(routes[TUTOR_LLM_SOURCES.liveTurn]).toBe(TUTOR_MODELS.fast);
  });

  it('is inert when imported by a test', () => {
    // The bug this catches shipped once. The generated module is imported by
    // provider-config.ts, so a suite that touched anything server-side also
    // picked up this deployment's MODEL_ROUTES — and adding five tutor stages
    // to .env broke tests/server/config-validation.test.ts, which counts the
    // config warnings at boot. A unit suite must see the environment it set
    // up, which is the same reason tests/setup-env.ts refuses .env.local.
    for (const key of BAKED_KEYS) {
      if (key === 'TUTOR_MODE' || key === 'NEXT_PUBLIC_TUTOR_MODE') continue;
      expect(process.env[key], `${key} leaked into the test environment`).toBeUndefined();
    }
  });

  it('leaves a variable the host already set alone', async () => {
    // The migration path off this file: move a value into the Vercel dashboard
    // and it must override the baked copy without a code change.
    const key = 'TUTOR_MODE';
    const saved = process.env[key];
    process.env[key] = 'host-wins';
    const baked = await import('@/lib/server/runtime-config.generated');
    baked.applyBakedConfig();
    expect(process.env[key]).toBe('host-wins');
    if (saved === undefined) delete process.env[key];
    else process.env[key] = saved;
  });
});
