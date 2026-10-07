/**
 * Invariant (e): provider keys exist only server-side and no client bundle
 * contains them (CLAUDE.md; spec R8).
 *
 * Route half: the one route that describes server providers to the browser is
 * called with canary secrets in the environment and its JSON is walked for
 * secret-looking keys or the canary values. Source half: no NEXT_PUBLIC_
 * variable may carry a secret-looking name (upstream's persistence dev token
 * is documented as non-secret and is removed by auth-21). The built bundle is
 * scanned separately by scripts/audit-client-bundle.mjs in CI.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { grepFiles, listFiles, walkJson } from './_helpers';

const CANARY = 'sk-kaizen-canary-3f9c1b2e';
const SECRET_KEY_NAME = /api[_-]?key|secret|token|authorization|password|base[_-]?url|proxy/i;

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

describe('invariant (e): /api/server-providers never returns credentials', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('OPENAI_API_KEY', CANARY);
    vi.stubEnv('OPENAI_BASE_URL', 'https://gateway.internal.example/v1');
    vi.stubEnv('TTS_OPENAI_API_KEY', `${CANARY}-tts`);
    vi.stubEnv('ASR_OPENAI_API_KEY', `${CANARY}-asr`);
    vi.stubEnv('ANTHROPIC_API_KEY', `${CANARY}-anthropic`);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists the configured providers without any key, base URL, or proxy', async () => {
    const { GET } = await import('@/app/api/server-providers/route');
    const response = await GET();
    expect(response.status).toBe(200);
    // apiSuccess spreads its payload: { success: true, providers, tts, ... }
    const payload = (await response.json()) as { providers?: Record<string, unknown> };
    expect(Object.keys(payload.providers ?? {})).toContain('openai');

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(CANARY);
    expect(serialized).not.toContain('gateway.internal.example');

    const secretLookingKeys: string[] = [];
    walkJson(payload, (path, key) => {
      if (SECRET_KEY_NAME.test(key)) secretLookingKeys.push(path);
    });
    expect(secretLookingKeys).toEqual([]);
  });
});

describe('invariant (e): no NEXT_PUBLIC_ variable carries a secret', () => {
  const ALLOWED_PUBLIC_TOKEN_NAMES = new Set([
    // Documented as non-secret in lib/persistence/server-auth.ts; deleted by auth-21.
    'NEXT_PUBLIC_PERSISTENCE_TOKEN',
  ]);

  it('source, config, and env templates only use allowlisted public token names', () => {
    const files = [
      ...['lib', 'components', 'app'].flatMap((root) =>
        listFiles(root, { extensions: ['.ts', '.tsx'] }),
      ),
      ...listFiles('.', {
        extensions: ['.env.example', 'docker-compose.yml', 'next.config.ts', 'Dockerfile'],
      }),
      'kaizen.config.ts',
    ];
    const hits = grepFiles(files, /NEXT_PUBLIC_[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD)\b/);
    const names = new Set<string>();
    for (const hit of hits) {
      for (const match of hit.text.matchAll(
        /NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD)\b/g,
      )) {
        names.add(match[0]);
      }
    }
    const disallowed = [...names].filter((name) => !ALLOWED_PUBLIC_TOKEN_NAMES.has(name));
    expect(disallowed, 'public env names that look like secrets').toEqual([]);
  });
});
