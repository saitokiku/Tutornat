/**
 * The tutor has to start on a host that was handed nothing but a database.
 *
 * This is not hypothetical. The first production deploy served sign-up,
 * sign-in, sessions, progress and coursework, and killed every single turn
 * with "No model could be resolved" — because the model lived in a `.env`
 * committed to the repository, and a serverless runtime populates
 * `process.env` from its own project settings, never from a file in the
 * bundle. To a parent it read as "the tutor won't start".
 *
 * So these tests fix two things in place. A model always resolves, from a
 * constant compiled into the same bundle as the code that reads it. And a key
 * that genuinely cannot be compiled in — a secret — produces a named, readable
 * refusal instead of a dead session.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TUTOR_MODELS } from '@/kaizen.config';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';

// These tests are about resolution *logic*, not about what this repository's
// `.env` happens to say today. The generated module applies the deployment's
// baked defaults the moment it is imported, which would make "a host that was
// told nothing" impossible to express here — so it is stubbed out, and the
// deployment's own baked values are asserted in
// tests/invariants/runtime-config.test.ts instead.
vi.mock('@/lib/server/runtime-config.generated', () => ({
  BAKED_KEYS: [] as readonly string[],
  applyBakedConfig: () => undefined,
}));

const SAVED = { ...process.env };

/**
 * `model-routes` and `provider-config` each cache their parse of the
 * environment in module state, so a test that only rewrites `process.env`
 * reads the previous test's answer. Every case imports through here.
 */
async function freshImports() {
  vi.resetModules();
  return {
    config: await import('@/kaizen.config'),
    status: await import('@/lib/tutor/config-status'),
    llmCall: await import('@/lib/tutor/turn/llm-call'),
  };
}

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in SAVED)) delete process.env[key];
  }
  Object.assign(process.env, SAVED);
  delete process.env.DEFAULT_MODEL;
  delete process.env.MODEL_ROUTES;
  delete process.env.GOOGLE_API_KEY;
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in SAVED)) delete process.env[key];
  }
  Object.assign(process.env, SAVED);
  vi.resetModules();
});

describe('the model the tutor runs on', () => {
  it('resolves with no DEFAULT_MODEL and no MODEL_ROUTES', async () => {
    // The production failure, verbatim: nothing configured on the host.
    const { config } = await freshImports();
    expect(config.tutorModelDefault('fast')).toBe(TUTOR_MODELS.fast);
    expect(config.tutorModelDefault('reasoning')).toBe(TUTOR_MODELS.reasoning);
  });

  it('puts the live turn on the fast model and grading on the reasoning one', async () => {
    const { llmCall } = await freshImports();
    expect(llmCall.modelRoleFor(TUTOR_LLM_SOURCES.liveTurn)).toBe('fast');
    expect(llmCall.modelRoleFor(TUTOR_LLM_SOURCES.grade)).toBe('reasoning');
    expect(llmCall.modelRoleFor(TUTOR_LLM_SOURCES.diagnose)).toBe('reasoning');
  });

  it('still lets an operator override everything with DEFAULT_MODEL', async () => {
    process.env.DEFAULT_MODEL = 'openai:gpt-5.4-mini';
    const { config } = await freshImports();
    expect(config.tutorModelDefault('fast')).toBe('openai:gpt-5.4-mini');
    expect(config.tutorModelDefault('reasoning')).toBe('openai:gpt-5.4-mini');
  });

  it('ignores a DEFAULT_MODEL that is only whitespace', async () => {
    // An env var set to an empty string is how a host reports "unset" often
    // enough that treating it as a model string is a live outage.
    process.env.DEFAULT_MODEL = '   ';
    const { config } = await freshImports();
    expect(config.tutorModelDefault('fast')).toBe(TUTOR_MODELS.fast);
  });

  it('lets a MODEL_ROUTES entry win over DEFAULT_MODEL for the live turn', async () => {
    process.env.DEFAULT_MODEL = 'openai:gpt-5.4-mini';
    process.env.MODEL_ROUTES = JSON.stringify({
      [TUTOR_LLM_SOURCES.liveTurn]: 'anthropic:claude-sonnet-5',
    });
    const { status } = await freshImports();
    const reported = status.tutorConfigStatus();
    expect(reported.llm.model).toBe('anthropic:claude-sonnet-5');
    expect(reported.llm.source).toBe('MODEL_ROUTES');
  });
});

describe('what the deploy reports about itself', () => {
  it('names the exact variable to set when the model has no key', async () => {
    // The whole point: an operator should not have to read a stack trace to
    // learn that one variable is missing.
    const { status } = await freshImports();
    const reported = status.tutorConfigStatus();
    expect(reported.ok).toBe(false);
    expect(reported.llm.provider).toBe('google');
    expect(reported.llm.keyEnv).toBe('GOOGLE_API_KEY');
    expect(reported.llm.key).toBe(false);
    expect(reported.missing).toContain('GOOGLE_API_KEY');
  });

  it('reports the key as present once it is set', async () => {
    process.env.GOOGLE_API_KEY = 'test-key-not-a-real-one';
    const { status } = await freshImports();
    const reported = status.tutorConfigStatus();
    expect(reported.llm.key).toBe(true);
    expect(reported.missing).not.toContain('GOOGLE_API_KEY');
  });

  it('reports which source the model string came from', async () => {
    const { status } = await freshImports();
    expect(status.tutorConfigStatus().llm.source).toBe('built-in');

    process.env.DEFAULT_MODEL = 'openai:gpt-5.4-mini';
    const second = await freshImports();
    expect(second.status.tutorConfigStatus().llm.source).toBe('DEFAULT_MODEL');
  });

  it('never puts a key value in what it reports', async () => {
    process.env.GOOGLE_API_KEY = 'sk-secret-value-abcdef';
    const { status } = await freshImports();
    const serialised = JSON.stringify(status.tutorConfigStatus());
    expect(serialised).not.toContain('sk-secret-value-abcdef');
    expect(serialised).not.toContain('secret-value');
  });

  it('tells the learner nothing about the missing variable', async () => {
    const { status } = await freshImports();
    // A child reading `GOOGLE_API_KEY` learns only that something is broken,
    // and half of them will think they broke it.
    expect(status.NOT_CONFIGURED_MESSAGE).not.toMatch(/API|KEY|env|google/i);
    expect(status.NOT_CONFIGURED_MESSAGE).toMatch(/grown-up/i);
  });
});
