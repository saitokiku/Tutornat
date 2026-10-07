/**
 * The server-side boundaries this private candidate depends on, exercised
 * against the real resolution path with the candidate's own openmaic.yml.
 *
 * These are refusals, not happy paths: a client must not be able to name its
 * own model, key, endpoint or provider type, and a locked-off capability must
 * stay off. Each test states the breach it prevents.
 *
 * Offline: no network and no credential beyond a shape-correct fake.
 */

import { beforeAll, describe, expect, it } from 'vitest';

const TOKEN = 'sk-ant-oat01-not-a-real-token';

beforeAll(() => {
  process.env.ANTHROPIC_AUTH_TOKEN = TOKEN;
  process.env.OPENMAIC_CONFIG = '../delivery/fullstack/native/openmaic.yml';
});

/** The candidate's runtime view of its own configuration. */
async function runtime() {
  return import('@/lib/server/model-config/runtime');
}

describe('requestProvidersAllowed under the candidate configuration', () => {
  it('is false, so request-named models are refused everywhere', async () => {
    const { requestProvidersAllowed } = await runtime();
    expect(requestProvidersAllowed()).toBe(false);
  });
});

describe('resolveModel refuses what a client sends', () => {
  it('refuses a request that names its own model with no stage', async () => {
    const { resolveModel, REQUEST_PROVIDERS_REFUSED } = await import(
      '@/lib/server/resolve-model'
    );
    // The verify-model shape: no stage, model from the request. Under
    // allowWorkspaceProviders:false there is nothing legitimate to resolve.
    await expect(
      resolveModel({ modelString: 'openai/gpt-5.5', apiKey: 'sk-attacker', workspaceId: null }),
    ).rejects.toThrow(REQUEST_PROVIDERS_REFUSED);
  });

  it('ignores a client model/key/endpoint on a real generation stage', async () => {
    const { resolveModel } = await import('@/lib/server/resolve-model');
    // A stage resolves through its slot; the request's own fields are dropped
    // rather than honoured, so this must come back as the pinned Opus.
    const resolved = await resolveModel({
      stage: 'scene-content',
      workspaceId: null,
      modelString: 'openai/gpt-5.5',
      apiKey: 'sk-attacker',
      baseUrl: 'https://attacker.example/v1',
      providerType: 'openai',
    });
    expect(resolved.providerId).toBe('anthropic');
    expect(resolved.modelId).toBe('claude-opus-5');
    expect(resolved.apiKey).toBe(TOKEN);
    // Not the attacker's endpoint, and not an endpoint at all: the provider
    // default (api.anthropic.com) applies.
    expect(resolved.baseUrl ?? '').not.toContain('attacker.example');
    expect(resolved.serverManaged).toBe(true);
  });

  it('ignores a per-stage user route that tries to redirect a stage', async () => {
    const { resolveModel } = await import('@/lib/server/resolve-model');
    const resolved = await resolveModel({
      stage: 'scene-outlines-stream',
      workspaceId: null,
      userRoutes: {
        'scene-outlines-stream': {
          model: 'openai/gpt-5.5',
          apiKey: 'sk-attacker',
          baseUrl: 'https://attacker.example/v1',
        },
      } as never,
    });
    expect(resolved.modelString).toBe('anthropic:claude-opus-5');
  });

  it('resolves every generation stage to the same pinned model', async () => {
    const { resolveModel } = await import('@/lib/server/resolve-model');
    const { STAGE_SLOTS } = await import('@/lib/config/model-slots');
    for (const stage of Object.keys(STAGE_SLOTS)) {
      const resolved = await resolveModel({ stage: stage as never, workspaceId: null });
      expect(resolved.modelString, stage).toBe('anthropic:claude-opus-5');
    }
  });

  it('arms no fallback, so a failure cannot reach another model', async () => {
    const { resolveModel } = await import('@/lib/server/resolve-model');
    const { attachedModelFallback } = await import('@/lib/ai/model-fallbacks');
    const resolved = await resolveModel({ stage: 'scene-content', workspaceId: null });
    const attached = attachedModelFallback(resolved.model);
    // A slot with no `fallback` attaches a resolver that answers null.
    expect(attached === undefined || (await attached()) === null).toBe(true);
  });
});

describe('locked-off capabilities stay off', () => {
  it('refuses every non-chat capability the configuration set to null', async () => {
    const { lookupSlot } = await runtime();
    for (const slot of ['tts', 'asr', 'image', 'video', 'webSearch', 'document'] as const) {
      const resolution = await lookupSlot(slot, null);
      // `null` in openmaic.yml means disabled-and-locked, never "unassigned",
      // which is what would let a user pick a provider in the settings UI.
      expect(resolution.configured.status, slot).toBe('disabled');
    }
  });
});

describe('the pinned model keeps maximum supported reasoning on the wire', () => {
  it('sends adaptive thinking at max effort for the reasoning that plans a lesson', async () => {
    const { resolveModel } = await import('@/lib/server/resolve-model');
    const { resolveThinkingProviderOptions } = await import('@/lib/ai/llm');
    // course.outline decides WHAT to teach; it keeps the maximum the model
    // supports. The live tutor (classroom) inherits the same from llm.
    for (const stage of ['scene-outlines-stream', 'chat-adapter'] as const) {
      const resolved = await resolveModel({ stage, workspaceId: null });
      const options = resolveThinkingProviderOptions(resolved.model, resolved.thinkingConfig);
      expect(options?.anthropic, stage).toMatchObject({
        thinking: { type: 'adaptive' },
        effort: 'max',
      });
    }
  });

  it('renders per-scene content at max effort too — depth is not a latency lever', async () => {
    const { resolveModel } = await import('@/lib/server/resolve-model');
    const { resolveThinkingProviderOptions } = await import('@/lib/ai/llm');
    // scene-content is called once per scene (11x for an 11-scene lesson), so
    // it is where latency is felt: one scene exceeded 8 minutes at `max`. The
    // owner requires maximum supported reasoning, so that cost is reported, not
    // traded away — `high` is only the model's catalogue DEFAULT, below its
    // declared maximum. This assertion is what stops a silent downgrade.
    const resolved = await resolveModel({ stage: 'scene-content', workspaceId: null });
    const options = resolveThinkingProviderOptions(resolved.model, resolved.thinkingConfig);
    expect(options?.anthropic).toMatchObject({ thinking: { type: 'adaptive' }, effort: 'max' });
    expect(resolved.modelString).toBe('anthropic:claude-opus-5');
  });

  it('proves `max` is the model capability maximum, not an invented value', async () => {
    const { getCatalogThinkingCapability } = await import('@/lib/ai/model-metadata');
    const capability = getCatalogThinkingCapability('anthropic', 'claude-opus-5');
    const values = capability?.effortValues ?? [];
    // Upstream's own capability declaration is the proof. `max` is last, and
    // the catalogue default ('high') is strictly below it.
    expect(values).toContain('max');
    expect(values.at(-1)).toBe('max');
    expect(capability?.defaultEffort).toBe('high');
  });

  it('drops the configured effort on the agent slot, which cannot carry one with tools', async () => {
    const { resolveModel } = await import('@/lib/server/resolve-model');
    const { resolveThinkingProviderOptions } = await import('@/lib/ai/llm');
    const resolved = await resolveModel({ stage: 'maic-agent-driver', workspaceId: null });
    const options = resolveThinkingProviderOptions(resolved.model, resolved.thinkingConfig);
    const anthropic = options?.anthropic as { effort?: unknown } | undefined;
    // The slot declares noThinkingEffort, so the `max` configured on llm is
    // NOT inherited here. What remains is the model catalogue's own default
    // effort ('high' for claude-opus-5), which upstream still applies — a
    // documented upstream behaviour, not a configuration leak. Thinking itself
    // stays enabled either way.
    expect(resolved.thinkingConfig?.effort).toBeUndefined();
    expect(anthropic?.effort).not.toBe('max');
  });
});
