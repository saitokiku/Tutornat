/**
 * A long-lived server must not pin a rotated-out Claude subscription token.
 *
 * The confirmed failure this pins: the launcher captures an OAuth access token
 * into the server environment once at boot, openmaic.yml interpolates it once
 * per process, and after the issuer rotates it every generation and chat call
 * returns HTTP 401 "OAuth access token has been revoked" until the server is
 * restarted. Rotation is SIMULATED here — offline, with fake tokens that only
 * share the real prefix shape — because getting this right for an unattended
 * rotation matters more than one restart happening to work.
 *
 * No network and no real credential. The resolver children that do run are
 * local `node -e` processes printing a fake payload, so nothing contacts a
 * provider or reads the real credential store.
 */

import { readFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  currentOAuthToken,
  isAnthropicOAuthToken,
  withClaudeCodeIdentity,
  CANONICAL_MESSAGES_URL,
} from '@/lib/ai/anthropic-oauth';
import { acceptResolvedToken, refreshOnce } from '@/lib/server/anthropic-oauth-refresh';

/** Fake tokens with the real prefix shape. Neither is a credential. */
const OLD_TOKEN = `sk-ant-oat01-${'o'.repeat(32)}`;
const NEW_TOKEN = `sk-ant-oat01-${'n'.repeat(32)}`;
const API_KEY = `sk-ant-api03-${'k'.repeat(32)}`;

const resolverPayload = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    provider: 'anthropic',
    api_key: NEW_TOKEN,
    base_url: '',
    source: 'test',
    api_mode: 'anthropic_messages',
    ...over,
  });

/**
 * The Authorization header the wire would actually send, for a request the SDK
 * built while the process still held `builtWith`.
 */
function authorizationSent(builtWith: string): string {
  const init = withClaudeCodeIdentity(CANONICAL_MESSAGES_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${builtWith}` },
    body: JSON.stringify({ model: 'claude-opus-5', messages: [] }),
  });
  return new Headers(init?.headers).get('authorization') ?? '';
}

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.ANTHROPIC_AUTH_TOKEN;
  process.env.ANTHROPIC_AUTH_TOKEN = OLD_TOKEN;
});

afterEach(() => {
  if (saved === undefined) delete process.env.ANTHROPIC_AUTH_TOKEN;
  else process.env.ANTHROPIC_AUTH_TOKEN = saved;
});

describe('a rotated token reaches the wire without a restart', () => {
  it('sends the token captured at boot while nothing has rotated', () => {
    expect(authorizationSent(OLD_TOKEN)).toBe(`Bearer ${OLD_TOKEN}`);
  });

  it('re-stamps a model built with the OLD token once the process holds the NEW one', () => {
    // The model, the provider and openmaic.yml are all untouched here: this is
    // exactly the state a server is in after a mid-flight rotation.
    process.env.ANTHROPIC_AUTH_TOKEN = NEW_TOKEN;
    expect(authorizationSent(OLD_TOKEN)).toBe(`Bearer ${NEW_TOKEN}`);
    expect(currentOAuthToken()).toBe(NEW_TOKEN);
  });

  it('adopts a rotated token end to end, through the real refresh path', async () => {
    // A real resolver child, offline: node printing the payload on stdout, the
    // same contract delivery/preview-native/resolve-runtime.py satisfies. This
    // exercises spawn -> validate -> adopt, not just the parser.
    const argv = [process.execPath, '-e', `process.stdout.write(${JSON.stringify(resolverPayload())})`];
    expect(await refreshOnce(argv)).toBe(true);
    expect(process.env.ANTHROPIC_AUTH_TOKEN).toBe(NEW_TOKEN);
    // The request the SDK built with the OLD token now goes out with the NEW one.
    expect(authorizationSent(OLD_TOKEN)).toBe(`Bearer ${NEW_TOKEN}`);
    // Idempotent: an unchanged token is not re-adopted or re-announced.
    expect(await refreshOnce(argv)).toBe(false);
  });

  it('refuses a rotated token the resolver answers with the wrong provider', async () => {
    const argv = [
      process.execPath,
      '-e',
      `process.stdout.write(${JSON.stringify(resolverPayload({ provider: 'openrouter' }))})`,
    ];
    expect(await refreshOnce(argv)).toBe(false);
    expect(process.env.ANTHROPIC_AUTH_TOKEN).toBe(OLD_TOKEN);
  });
});

describe('both credential-bearing paths are covered by the same seam', () => {
  // Generation (course.content, N calls per lesson) and classroom chat resolve
  // through resolveStageModel -> getModel -> the anthropic case, and both send
  // through withClaudeCodeIdentity. One re-stamp therefore covers both; these
  // assert the shared seam is what each path's request shape goes through.
  it.each([
    ['generation scene-content request', { model: 'claude-opus-5', system: 'generate a scene' }],
    ['classroom chat request', { model: 'claude-opus-5', messages: [{ role: 'user' }] }],
  ])('%s is re-stamped with the current token', (_name, body) => {
    process.env.ANTHROPIC_AUTH_TOKEN = NEW_TOKEN;
    const init = withClaudeCodeIdentity(CANONICAL_MESSAGES_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${OLD_TOKEN}` },
      body: JSON.stringify(body),
    });
    expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${NEW_TOKEN}`);
  });
});

describe('the re-stamp cannot widen what is sent', () => {
  // The safety here is STRUCTURAL, not a header inspection: providers.ts
  // installs this transform only for an OAuth-subscription Anthropic client
  // (an API-key deployment gets plain transportFetch), so it is only ever
  // reached for a request the SDK already authenticated with that credential.
  // Reading the incoming Authorization header to double-check is forbidden by
  // tests/server/identity/cookie-guard.test.ts, so these pin the structure.
  it('is installed only on the OAuth path, never for an API key', async () => {
    const providers = await readFile(
      new URL('../../lib/ai/providers.ts', import.meta.url),
      'utf8',
    );
    // The only withClaudeCodeIdentity call site sits in the oauthSubscription
    // branch, whose else-branch is the untransformed transport.
    const callSites = providers.match(/withClaudeCodeIdentity\(/g) ?? [];
    expect(callSites).toHaveLength(1);
    const at = providers.indexOf('withClaudeCodeIdentity(url, init)');
    expect(at).toBeGreaterThan(0);
    const branch = providers.slice(Math.max(0, at - 1200), at);
    expect(branch).toContain('else if (oauthSubscription)');
    expect(providers).toContain('anthropicOptions.fetch = transportFetch;');
  });

  it('only ever writes an OAuth access token, never anything else', () => {
    // A non-OAuth value in the environment is not adopted, so the credential
    // the SDK built the request with is what goes out.
    process.env.ANTHROPIC_AUTH_TOKEN = API_KEY;
    expect(currentOAuthToken()).toBe('');
    expect(authorizationSent(OLD_TOKEN)).toBe(`Bearer ${OLD_TOKEN}`);

    process.env.ANTHROPIC_AUTH_TOKEN = 'sk-or-v1-another-vendor';
    expect(currentOAuthToken()).toBe('');
    expect(authorizationSent(OLD_TOKEN)).toBe(`Bearer ${OLD_TOKEN}`);

    delete process.env.ANTHROPIC_AUTH_TOKEN;
    expect(currentOAuthToken()).toBe('');
    expect(authorizationSent(OLD_TOKEN)).toBe(`Bearer ${OLD_TOKEN}`);
  });

  it('refuses a non-canonical destination BEFORE re-stamping', () => {
    process.env.ANTHROPIC_AUTH_TOKEN = NEW_TOKEN;
    for (const url of [
      'https://api.anthropic.com.evil.test/v1/messages',
      'https://user:pw@api.anthropic.com/v1/messages',
      'https://api.anthropic.com:8443/v1/messages',
      'http://api.anthropic.com/v1/messages',
      'https://router.example/v1/messages',
    ]) {
      expect(() =>
        withClaudeCodeIdentity(url, { headers: { authorization: `Bearer ${OLD_TOKEN}` } }),
      ).toThrow(/canonical Anthropic Messages endpoint/);
    }
  });
});

describe('a bad resolver answer is refused, and the current token is kept', () => {
  const refusals: Record<string, string> = {
    'wrong provider': resolverPayload({ provider: 'openrouter' }),
    'wrong api_mode': resolverPayload({ api_mode: 'openai_chat' }),
    'empty api_mode': resolverPayload({ api_mode: '' }),
    'router base': resolverPayload({ base_url: 'https://router.example/v1' }),
    'suffix lookalike': resolverPayload({ base_url: 'https://api.anthropic.com.evil.test' }),
    'non-default port': resolverPayload({ base_url: 'https://api.anthropic.com:8443' }),
    userinfo: resolverPayload({ base_url: 'https://user:pw@api.anthropic.com' }),
    'an api key, not an oauth token': resolverPayload({ api_key: API_KEY }),
    'another vendor key': resolverPayload({ api_key: 'sk-or-v1-abcdef' }),
    'empty credential': resolverPayload({ api_key: '' }),
    'not json': 'resolver blew up',
    'not an object': '["anthropic"]',
  };

  it.each(Object.entries(refusals))('refuses %s', (_name, payload) => {
    expect(() => acceptResolvedToken(payload)).toThrow();
  });

  it('accepts the canonical base spelled explicitly, and with a trailing slash', () => {
    expect(acceptResolvedToken(resolverPayload({ base_url: 'https://api.anthropic.com' }))).toBe(
      NEW_TOKEN,
    );
    expect(acceptResolvedToken(resolverPayload({ base_url: 'https://api.anthropic.com/' }))).toBe(
      NEW_TOKEN,
    );
  });

  it('keeps the current token when the resolver cannot run — never blanks it', async () => {
    // A resolver that fails must not clear the credential or substitute one:
    // there is no fallback provider, so a blanked token fails every request.
    expect(await refreshOnce(['/nonexistent/resolver-that-cannot-start'])).toBe(false);
    expect(process.env.ANTHROPIC_AUTH_TOKEN).toBe(OLD_TOKEN);
    expect(authorizationSent(OLD_TOKEN)).toBe(`Bearer ${OLD_TOKEN}`);
  });

  it('never echoes a credential or a rejected endpoint in a refusal message', () => {
    const leaks = [NEW_TOKEN, API_KEY, 'sk-or-v1-abcdef', 'router.example', 'user:pw', 'evil.test'];
    for (const [name, payload] of Object.entries(refusals)) {
      let message = '';
      try {
        acceptResolvedToken(payload);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).not.toBe('');
      for (const leak of leaks) {
        expect(message, `${name} leaked ${leak.slice(0, 12)}…`).not.toContain(leak);
      }
    }
  });
});

describe('token shape', () => {
  it('distinguishes a subscription OAuth token from an API key', () => {
    expect(isAnthropicOAuthToken(OLD_TOKEN)).toBe(true);
    expect(isAnthropicOAuthToken(API_KEY)).toBe(false);
  });
});
