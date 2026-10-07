/**
 * Claude subscription (OAuth) wire contract for the native Anthropic provider.
 *
 * A Claude Pro/Max credential is an OAuth access token (`sk-ant-oat…`), not an
 * API key. Three things are applied together, and with all three a native
 * Messages request authenticates successfully on this credential:
 *
 * 1. `Authorization: Bearer <token>` instead of `x-api-key` (handled by the
 *    AI SDK's `authToken` option). An OAuth token sent as `x-api-key` is not
 *    accepted as an API key.
 * 2. The OAuth betas plus the Claude Code client identity headers.
 * 3. The Claude Code system prefix as the FIRST system block.
 *
 * What is NOT established here: which billing allowance a request is charged
 * to, and whether any one of (1)-(3) alone caused an earlier HTTP 429. The
 * three were changed together, so this is not a causal isolation, and
 * `service_tier: standard` in a response is not evidence of subscription
 * billing. Observed fact only: with (1)-(3) the request is accepted at
 * https://api.anthropic.com/v1/messages and the response metadata reports
 * claude-opus-5.
 *
 * Only (1) is expressible through `createAnthropic` options; (2) is a static
 * header map and (3) must be injected into the serialized request body, so it
 * lives in a thin fetch wrapper rather than a fork of the provider.
 *
 * This module is server-only in effect but must stay bundler-safe: `providers.ts`
 * is also imported by client settings components, so nothing here may touch
 * `node:*`. The Claude Code version is therefore supplied by the launcher
 * through the environment rather than detected with a subprocess.
 */

/** Betas required for OAuth/subscription auth. */
const OAUTH_BETAS = ['claude-code-20250219', 'oauth-2025-04-20'] as const;

/**
 * An OAuth request whose Claude Code version is far behind the current release
 * has been observed to be rejected ("Claude Code X does not support this
 * model"), so the launcher detects the installed version and exports
 * `OPENMAIC_CLAUDE_CODE_VERSION`. This is only the floor for a deployment that
 * sets nothing; keep it current.
 */
const CLAUDE_CODE_VERSION_FALLBACK = '2.1.74';

/** Must be the first system block on an OAuth request. */
export const CLAUDE_CODE_SYSTEM_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude.";

/** Claude subscription OAuth access tokens; API keys are `sk-ant-api…`. */
export function isAnthropicOAuthToken(token: string): boolean {
  return token.startsWith('sk-ant-oat');
}

/** The version the launcher detected, else the floor. */
export function claudeCodeVersion(): string {
  const pinned = process.env.OPENMAIC_CLAUDE_CODE_VERSION?.trim();
  return pinned && /^\d/.test(pinned) ? pinned : CLAUDE_CODE_VERSION_FALLBACK;
}

/**
 * Client-level headers for an OAuth Anthropic request. The AI SDK merges these
 * with each request's own `anthropic-beta` (see getBetasFromHeaders), so the
 * per-call betas the SDK adds — `effort-2025-11-24` for a reasoning effort —
 * survive instead of being overwritten.
 */
export function anthropicOAuthHeaders(): Record<string, string> {
  return {
    'anthropic-beta': OAUTH_BETAS.join(','),
    'user-agent': `claude-code/${claudeCodeVersion()} (external, cli)`,
    'x-app': 'cli',
  };
}

/**
 * Prepend the Claude Code system block to a serialized Messages request.
 *
 * The SDK emits `system` as a text-block array (or omits it). Anything else —
 * a non-JSON body, a stream body, a parse failure — is passed through
 * untouched: a mangled request is worse than a missing prefix, and the error
 * then comes from the API rather than from here. Never logs the body.
 */
export function withClaudeCodeSystemBlock(init?: RequestInit): RequestInit | undefined {
  if (!init || typeof init.body !== 'string') return init;
  let body: unknown;
  try {
    body = JSON.parse(init.body);
  } catch {
    return init;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return init;
  const record = body as { system?: unknown };
  const prefix = { type: 'text', text: CLAUDE_CODE_SYSTEM_PREFIX };
  const existing = record.system;
  if (Array.isArray(existing)) {
    const first = existing[0] as { text?: unknown } | undefined;
    if (first && typeof first === 'object' && first.text === CLAUDE_CODE_SYSTEM_PREFIX) {
      return init; // already identified (a retry of the same body)
    }
    record.system = [prefix, ...existing];
  } else if (typeof existing === 'string' && existing) {
    record.system = [prefix, { type: 'text', text: existing }];
  } else if (existing == null) {
    record.system = [prefix];
  } else {
    return init; // unknown shape: leave it alone
  }
  return { ...init, body: JSON.stringify(body) };
}

/** The ONE destination a Claude subscription credential may be sent to. */
export const CANONICAL_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Exact-match the destination of a credential-bearing request.
 *
 * The configured `baseUrl` label is not sufficient: this runs at the last hop,
 * where the URL the SDK actually built is known. Anything but the canonical
 * Messages URL — another vendor, a proxy, a userinfo/port/query/fragment
 * variant, a suffix lookalike host — is refused, never normalized. The
 * rejected value is NOT echoed: an error carrying it would put an operator- or
 * resolver-supplied endpoint into a log line next to a credential.
 */
export function assertCanonicalMessagesUrl(url: RequestInfo | URL): void {
  const raw = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('refusing OAuth request: destination is not a URL');
  }
  const canonical = new URL(CANONICAL_MESSAGES_URL);
  const exact =
    u.protocol === canonical.protocol &&
    u.hostname === canonical.hostname &&
    u.port === '' &&
    u.username === '' &&
    u.password === '' &&
    u.pathname === canonical.pathname &&
    u.search === '' &&
    u.hash === '';
  if (!exact) {
    throw new Error('refusing OAuth request: destination is not the canonical Anthropic Messages endpoint');
  }
}

/**
 * The OAuth access token this process may use RIGHT NOW, or '' when there is
 * none to prefer.
 *
 * A Claude subscription token is rotated out from under a long-lived server.
 * The launcher resolves one into the environment at boot and the deployment
 * layer interpolates it ONCE — openmaic.yml is loaded per process by design —
 * so a server that outlives a rotation keeps presenting a token the issuer has
 * since revoked, and every request fails with "OAuth access token has been
 * revoked": generation and chat alike, because both reach the wire here.
 *
 * `ANTHROPIC_AUTH_TOKEN` in the process environment is the one copy kept
 * current in place (lib/server/anthropic-oauth-refresh.ts, started from
 * instrumentation.ts, opt-in). Reading it at the last hop is what lets an
 * already-built model send the current credential without rebuilding the
 * model, re-reading the configuration or restarting the server. An env read
 * only: this module stays bundler-safe.
 */
export function currentOAuthToken(): string {
  const token = process.env.ANTHROPIC_AUTH_TOKEN?.trim() ?? '';
  return isAnthropicOAuthToken(token) ? token : '';
}

/**
 * Re-stamp `Authorization` with the current OAuth access token.
 *
 * Set, never read: the incoming-credential guard
 * (tests/server/identity/cookie-guard.test.ts) forbids reading an
 * `Authorization` header outside the host auth methods, and that invariant is
 * worth more than an allowlist entry here. Nothing is inspected — this is only
 * reached through {@link withClaudeCodeIdentity}, which providers.ts installs
 * ONLY for an OAuth-subscription Anthropic client, where the SDK has already
 * put that same credential on the request via `authToken`. Writing the current
 * token can therefore never attach a credential to a request that did not
 * already carry one, nor turn an API-key deployment into an OAuth one.
 */
function withCurrentOAuthToken(headers: Headers): Headers {
  const current = currentOAuthToken();
  if (current) headers.set('authorization', `Bearer ${current}`);
  return headers;
}

/**
 * The complete OAuth transform applied at the last hop before the wire:
 * the destination is verified FIRST (a credential is attached to this request,
 * so a non-canonical destination must never be transformed and sent), then the
 * Claude Code identity headers (the SDK stamps its own user-agent over the
 * client config, so it must be forced here), the current access token, and the
 * Claude Code system block.
 *
 * `redirect: 'error'` so a 3xx cannot move an already-authenticated request to
 * another origin, and the caller's own redirect preference cannot relax it.
 */
export function withClaudeCodeIdentity(
  url: RequestInfo | URL,
  init?: RequestInit,
): RequestInit | undefined {
  assertCanonicalMessagesUrl(url);
  const withSystem = withClaudeCodeSystemBlock(init) ?? {};
  const headers = new Headers(withSystem.headers);
  for (const [name, value] of Object.entries(anthropicOAuthHeaders())) {
    // The SDK already merged the betas from the client config with its own
    // per-request ones; keep that union rather than replacing it.
    if (name === 'anthropic-beta' && headers.has(name)) continue;
    headers.set(name, value);
  }
  // After the identity headers and after the destination is known good: the
  // token the model was BUILT with may have been rotated out since.
  return { ...withSystem, headers: withCurrentOAuthToken(headers), redirect: 'error' };
}
