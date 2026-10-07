/**
 * The Claude-subscription (OAuth) wire contract for the native Anthropic
 * provider. These pin request CONSTRUCTION, which a live call does not reveal:
 * which auth header carries the credential, which identity headers ride along,
 * and — above all — that the credential-bearing request can only be addressed
 * to the canonical Anthropic Messages endpoint. No claim is made here about
 * which billing allowance a request is charged to.
 *
 * Offline: no network, no credential. A fake token with the real prefix shape
 * is enough, because every assertion is about request construction.
 */

import { describe, expect, it } from 'vitest';
import { getModel } from '@/lib/ai/providers';
import {
  CLAUDE_CODE_SYSTEM_PREFIX,
  CANONICAL_MESSAGES_URL,
  anthropicOAuthHeaders,
  assertCanonicalMessagesUrl,
  claudeCodeVersion,
  isAnthropicOAuthToken,
  withClaudeCodeIdentity,
  withClaudeCodeSystemBlock,
} from '@/lib/ai/anthropic-oauth';

const OAUTH_TOKEN = 'sk-ant-oat01-not-a-real-token';
const API_KEY = 'sk-ant-api03-not-a-real-key';

/** Capture the one request the model would send, without sending it. */
async function captureRequest(apiKey: string) {
  let captured: { url: string; init: RequestInit } | undefined;
  const { model } = getModel({
    providerId: 'anthropic',
    modelId: 'claude-opus-5',
    apiKey,
    fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
      captured = { url: String(url), init: init ?? {} };
      // A valid-but-minimal Messages response: enough for the SDK to resolve.
      return new Response(
        JSON.stringify({
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: 'claude-opus-5',
          content: [{ type: 'text', text: 'ok' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof globalThis.fetch,
  });
  const { generateText } = await import('ai');
  await generateText({ model, prompt: 'hi' });
  if (!captured) throw new Error('no request was made');
  const headers = new Headers(captured.init.headers);
  const body = JSON.parse(String(captured.init.body)) as Record<string, unknown>;
  return { url: captured.url, headers, body };
}

describe('isAnthropicOAuthToken', () => {
  it('recognizes a subscription OAuth access token', () => {
    expect(isAnthropicOAuthToken(OAUTH_TOKEN)).toBe(true);
  });

  it('does not treat an ordinary API key as OAuth', () => {
    expect(isAnthropicOAuthToken(API_KEY)).toBe(false);
    expect(isAnthropicOAuthToken('')).toBe(false);
  });
});

describe('anthropicOAuthHeaders', () => {
  it('carries both OAuth betas, the Claude Code user-agent and x-app', () => {
    const headers = anthropicOAuthHeaders();
    const betas = headers['anthropic-beta'].split(',');
    expect(betas).toContain('oauth-2025-04-20');
    expect(betas).toContain('claude-code-20250219');
    expect(headers['user-agent']).toMatch(/^claude-code\/\d[\w.-]*\s\(external, cli\)$/);
    expect(headers['x-app']).toBe('cli');
  });

  it('reports a version starting with a digit', () => {
    expect(claudeCodeVersion()).toMatch(/^\d/);
  });
});

describe('withClaudeCodeSystemBlock', () => {
  it('prepends the Claude Code identity to an existing system array', () => {
    const init = withClaudeCodeSystemBlock({
      body: JSON.stringify({ system: [{ type: 'text', text: 'You teach.' }] }),
    });
    const body = JSON.parse(String(init?.body)) as { system: { text: string }[] };
    expect(body.system[0].text).toBe(CLAUDE_CODE_SYSTEM_PREFIX);
    expect(body.system[1].text).toBe('You teach.');
  });

  it('adds the block when the request has no system of its own', () => {
    const init = withClaudeCodeSystemBlock({ body: JSON.stringify({ messages: [] }) });
    const body = JSON.parse(String(init?.body)) as { system: { text: string }[] };
    expect(body.system).toHaveLength(1);
    expect(body.system[0].text).toBe(CLAUDE_CODE_SYSTEM_PREFIX);
  });

  it('is idempotent, so a retried body is not double-prefixed', () => {
    const once = withClaudeCodeSystemBlock({ body: JSON.stringify({ messages: [] }) });
    const twice = withClaudeCodeSystemBlock(once);
    const body = JSON.parse(String(twice?.body)) as { system: unknown[] };
    expect(body.system).toHaveLength(1);
  });

  it('passes a non-JSON body through untouched rather than mangling it', () => {
    const init = { body: 'not json' };
    expect(withClaudeCodeSystemBlock(init)).toBe(init);
    expect(withClaudeCodeSystemBlock(undefined)).toBeUndefined();
  });
});

describe('the request an OAuth-authenticated claude-opus-5 actually sends', () => {
  it('goes to the native Messages endpoint with Bearer auth and no x-api-key', async () => {
    const { url, headers } = await captureRequest(OAUTH_TOKEN);
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(headers.get('authorization')).toBe(`Bearer ${OAUTH_TOKEN}`);
    // x-api-key on an OAuth token is the billing-lane bug: it must be absent.
    expect(headers.get('x-api-key')).toBeNull();
  });

  it('carries the OAuth betas and Claude Code identity on the wire', async () => {
    const { headers } = await captureRequest(OAUTH_TOKEN);
    const betas = (headers.get('anthropic-beta') ?? '').split(',');
    expect(betas).toContain('oauth-2025-04-20');
    expect(betas).toContain('claude-code-20250219');
    expect(headers.get('x-app')).toBe('cli');
    expect(headers.get('user-agent')).toContain('claude-code/');
  });

  it('leads its system blocks with the Claude Code prefix', async () => {
    const { body } = await captureRequest(OAUTH_TOKEN);
    const system = body.system as { text: string }[] | undefined;
    expect(system?.[0]?.text).toBe(CLAUDE_CODE_SYSTEM_PREFIX);
  });

  it('names claude-opus-5 as the wire model', async () => {
    const { body } = await captureRequest(OAUTH_TOKEN);
    expect(body.model).toBe('claude-opus-5');
  });

  it('still uses x-api-key for an ordinary API key, with no OAuth identity', async () => {
    const { headers, body } = await captureRequest(API_KEY);
    expect(headers.get('x-api-key')).toBe(API_KEY);
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('x-app')).toBeNull();
    const system = body.system as { text: string }[] | undefined;
    expect(system?.[0]?.text).not.toBe(CLAUDE_CODE_SYSTEM_PREFIX);
  });
});

describe('the credential-bearing destination is locked before any transfer', () => {
  // A fake token is enough: every assertion is about refusing to build the
  // request at all. No live inference, no real credential.
  const BODY = JSON.stringify({ messages: [], system: 'x' });

  it('accepts exactly the canonical Messages URL', () => {
    expect(() => assertCanonicalMessagesUrl(CANONICAL_MESSAGES_URL)).not.toThrow();
    expect(() => assertCanonicalMessagesUrl(new URL(CANONICAL_MESSAGES_URL))).not.toThrow();
    expect(CANONICAL_MESSAGES_URL).toBe('https://api.anthropic.com/v1/messages');
  });

  it('refuses every non-canonical destination, and never echoes it', () => {
    const refused: Record<string, string> = {
      'another vendor': 'https://api.openai.com/v1/messages',
      'openrouter proxy': 'https://openrouter.ai/api/v1/messages',
      'operator proxy': 'https://proxy.internal.test/api.anthropic.com/v1/messages',
      'suffix lookalike host': 'https://api.anthropic.com.evil.test/v1/messages',
      'prefix lookalike host': 'https://evil.test/api.anthropic.com/v1/messages',
      'plaintext http': 'http://api.anthropic.com/v1/messages',
      userinfo: 'https://user:pw@api.anthropic.com/v1/messages',
      'non-default port': 'https://api.anthropic.com:8443/v1/messages',
      'other path': 'https://api.anthropic.com/v1/complete',
      'path traversal': 'https://api.anthropic.com/v1/messages/../../admin',
      'query string': 'https://api.anthropic.com/v1/messages?to=evil.test',
      fragment: 'https://api.anthropic.com/v1/messages#evil.test',
      'not a url': 'not a url',
    };
    const leaks = ['evil.test', 'openrouter.ai', 'api.openai.com', 'user:pw', '8443', 'proxy.internal.test'];
    for (const [name, url] of Object.entries(refused)) {
      // the whole transform must refuse, not just the bare assertion
      expect(() => withClaudeCodeIdentity(url, { body: BODY }), name).toThrow(/refusing OAuth request/);
      let message = '';
      try {
        assertCanonicalMessagesUrl(url);
      } catch (error) {
        message = String((error as Error).message);
      }
      expect(message, name).toMatch(/refusing OAuth request/);
      for (const leak of leaks) expect(message, `${name} leaked ${leak}`).not.toContain(leak);
    }
  });

  it('refuses a redirect rather than following one to another origin', () => {
    const init = withClaudeCodeIdentity(CANONICAL_MESSAGES_URL, { body: BODY, redirect: 'follow' });
    // An already-authenticated request must not be moved by a 3xx, and a
    // caller-supplied preference cannot relax it.
    expect(init?.redirect).toBe('error');
  });

  it('only attaches the Claude Code identity once the destination is accepted', () => {
    const init = withClaudeCodeIdentity(CANONICAL_MESSAGES_URL, { body: BODY });
    const headers = new Headers(init?.headers);
    expect(headers.get('x-app')).toBe('cli');
    const system = (JSON.parse(String(init?.body)) as { system: { text: string }[] }).system;
    expect(system[0]?.text).toBe(CLAUDE_CODE_SYSTEM_PREFIX);
  });
});
