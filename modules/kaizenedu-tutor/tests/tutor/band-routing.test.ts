/**
 * Per-band model routing (reference §3, D30): the Gemini API's terms may
 * forbid an under-18 audience, so one variable must be able to move the
 * 13-to-17 band onto another provider's model while adults stay where they
 * are. The override beats the stage route; everything else is unchanged.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TUTOR_MODELS, tutorBandModelRoutes, tutorModelForBand } from '@/kaizen.config';
import { tutorConfigStatus } from '@/lib/tutor/config-status';
import { TUTOR_LLM_SOURCES } from '@/lib/tutor/cost/sources';
import { tutorModelSelection } from '@/lib/tutor/turn/llm-call';

const TEEN_ROUTE = '{"13-17":{"fast":"openai:gpt-5.4-mini"}}';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('TUTOR_BAND_MODEL_ROUTES', () => {
  it('parses a band and a role, and drops what it does not know', () => {
    const env = {
      TUTOR_BAND_MODEL_ROUTES:
        '{"13-17":{"fast":" openai:gpt-5.4-mini ","reasoning":7,"other":"x"},"adult":{},"99":{"fast":"y"},"4-8":"no"}',
    };
    expect(tutorBandModelRoutes(env)).toEqual({ '13-17': { fast: 'openai:gpt-5.4-mini' } });
  });

  it('treats an unparseable or absent value as no override', () => {
    expect(tutorBandModelRoutes({ TUTOR_BAND_MODEL_ROUTES: '{oops' })).toEqual({});
    expect(tutorBandModelRoutes({ TUTOR_BAND_MODEL_ROUTES: '[1]' })).toEqual({});
    expect(tutorBandModelRoutes({})).toEqual({});
  });

  it('answers the override for the routed band only', () => {
    vi.stubEnv('TUTOR_BAND_MODEL_ROUTES', TEEN_ROUTE);
    expect(tutorModelForBand('fast', '13-17')).toBe('openai:gpt-5.4-mini');
    expect(tutorModelForBand('reasoning', '13-17')).toBeNull();
    expect(tutorModelForBand('fast', 'adult')).toBeNull();
    expect(tutorModelForBand('fast', null)).toBeNull();
  });

  it('can be baked from .env like the other product switches', () => {
    // The variable is non-secret product configuration, so the build-time
    // generator must accept it; otherwise a value in .env silently never
    // reaches production (D27).
    const generator = readFileSync(
      join(process.cwd(), 'scripts', 'generate-runtime-config.mjs'),
      'utf8',
    );
    expect(generator).toContain(`'TUTOR_BAND_MODEL_ROUTES'`);
  });
});

describe('the model a stage runs on', () => {
  it('hands the stage route to resolveModel when the band has no override', () => {
    vi.stubEnv('DEFAULT_MODEL', '');
    vi.stubEnv('TUTOR_BAND_MODEL_ROUTES', '');
    expect(tutorModelSelection(TUTOR_LLM_SOURCES.liveTurn, 'adult')).toEqual({
      stage: 'tutor-live-turn',
      modelString: TUTOR_MODELS.fast,
    });
    expect(tutorModelSelection(TUTOR_LLM_SOURCES.grade, '13-17')).toEqual({
      stage: 'tutor-grade',
      modelString: TUTOR_MODELS.reasoning,
    });
  });

  it('hands the override alone, so it beats the stage route', () => {
    vi.stubEnv('TUTOR_BAND_MODEL_ROUTES', TEEN_ROUTE);
    expect(tutorModelSelection(TUTOR_LLM_SOURCES.liveTurn, '13-17')).toEqual({
      modelString: 'openai:gpt-5.4-mini',
    });
    // Adults are untouched by a teen route.
    expect(tutorModelSelection(TUTOR_LLM_SOURCES.liveTurn, 'adult').stage).toBe('tutor-live-turn');
    // The reasoning stages keep their route unless the band names one for them too.
    expect(tutorModelSelection(TUTOR_LLM_SOURCES.summary, '13-17').stage).toBe('tutor-summary');
  });
});

describe('health', () => {
  it('shows the live-turn override per band, and nothing when there is none', () => {
    vi.stubEnv('TUTOR_BAND_MODEL_ROUTES', TEEN_ROUTE);
    expect(tutorConfigStatus().llm.bandOverrides).toEqual({ '13-17': 'openai:gpt-5.4-mini' });
    vi.stubEnv('TUTOR_BAND_MODEL_ROUTES', '');
    expect(tutorConfigStatus().llm.bandOverrides).toEqual({});
  });
});
