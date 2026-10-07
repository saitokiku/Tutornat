// Native Anthropic Messages transport. Node stdlib only (global fetch + AbortSignal),
// no SDK, no dependency to install. Used by BOTH the local server and the Vercel
// deployment, so cloud and local run the identical prompt, schema and grading path.
//
// Why streaming: the prior maximum-reasoning run was a NON-streaming request with a
// 32768-token ceiling and an unbounded "max" effort, and it hit the 180s deadline twice.
//
// UNPROVEN CAUSE — this is a HYPOTHESIS, not a verified diagnosis. No live generation has
// yet completed on this route (the control call was rate-limited at 429), so nothing here
// proves streaming repairs the timeout. What IS established by reading the old path:
//   * thinking tokens count against max_tokens, and 32768 is ~1/4 of the 128000 ceiling
//     the provider itself states for this model (verify-native/capability-probe.mjs), so
//     the prior budget could starve a maximum-reasoning run;
//   * a non-streaming reply is buffered until the whole completion finishes, so a client
//     cannot tell "slow" from "starved" from "hung" before its deadline fires.
// Streaming is therefore chosen for OBSERVABILITY — time-to-first-token, wire identity,
// real thinking usage, and a deadline enforceable mid-generation — not as a proven fix.
// Confirming or refuting the cause needs a completed live run; see the handoff.
//
// Credentials are read by the CALLER from the server environment and passed in. This
// module never touches process.env, never logs, and never returns the key.

const VERSION = '2023-06-01';
const DEFAULT_BASE = 'https://api.anthropic.com';
// Anthropic routes a Claude Pro/Max SUBSCRIPTION credential differently from a Console
// API key, and the two are not interchangeable:
//   sk-ant-api…  -> Console API key   -> x-api-key
//   sk-ant-oat…, eyJ… (JWT), cc-…     -> subscription OAuth -> Authorization: Bearer,
//      plus these betas and a claude-code User-Agent. Anthropic routes OAuth by user
//      agent; without it the call fails even with a valid token.
// Sending a subscription token as x-api-key returns 401 "API key is invalid", which
// reads as a bad credential when it is really the wrong auth scheme.
const OAUTH_BETAS = 'oauth-2025-04-20,claude-code-20250219';
const OAUTH_UA = 'claude-code/2.1.0';

// Mirrors agent/anthropic_credentials.py:_is_oauth_token. An sk-ant-api* value is a
// Console key; every other sk-ant-*, a JWT, or a cc-* value is a subscription token.
export function isOauthToken(key) {
  const k = String(key || '');
  if (!k || k.startsWith('sk-ant-api')) return false;
  return k.startsWith('sk-ant-') || k.startsWith('eyJ') || k.startsWith('cc-');
}

// The auth headers this credential actually needs. Exported so a deployment can report
// WHICH scheme it is using without ever exposing the credential.
export function authHeaders(apiKey) {
  return isOauthToken(apiKey)
    ? { authorization: `Bearer ${apiKey}`, 'anthropic-beta': OAUTH_BETAS, 'user-agent': OAUTH_UA }
    : { 'x-api-key': apiKey };
}
export const credentialScheme = (apiKey) => (isOauthToken(apiKey) ? 'oauth_subscription' : 'api_key');

export class ProviderError extends Error {
  constructor(error, message, { status = 502, retryable = true } = {}) {
    super(message);
    this.error = error; this.status = status; this.retryable = retryable;
  }
}

// The canonical Anthropic endpoint is the ONLY place this credential is ever sent.
//
// An earlier version accepted any https URL with any path, which made one mistyped or
// hostile ANTHROPIC_BASE_URL enough to POST a Claude Pro/Max subscription token to
// another origin — and the transport would have reported that as a normal lesson. There
// is no legitimate alternative host for this route, so there is no silent alternative:
// only the documented base, optionally written with its /v1 suffix, resolves. Anything
// else — another hostname, userinfo, a port, a query, a fragment, a different path, or
// plaintext — is a configuration failure and dispatches nothing.
const CANONICAL_HOST = 'api.anthropic.com';
export function resolveBase(baseUrl) {
  const raw = (baseUrl || '').trim();
  if (!raw) return DEFAULT_BASE;
  const reject = (why) => { throw new ProviderError('ProviderMisconfigured', `ANTHROPIC_BASE_URL ${why}.`, { retryable: false }); };
  let u;
  try { u = new URL(raw); } catch { return reject('is not a URL'); }
  if (u.protocol !== 'https:') reject('must be https');
  if (u.hostname.toLowerCase() !== CANONICAL_HOST) reject(`must be the canonical ${CANONICAL_HOST} endpoint`);
  if (u.username || u.password) reject('must not carry credentials in the URL');
  if (u.port) reject('must not set a port');
  if (u.search || u.hash) reject('must not carry a query or fragment');
  // Accept only the bare origin or its documented /v1 spelling; appending /v1/messages
  // to a base that already ends in /v1 would build .../v1/v1/messages — a 404 reported
  // as a provider failure, which sends the owner debugging the model, not the config.
  if (!/^\/*(v1\/*)?$/.test(u.pathname)) reject('must not add a path');
  return DEFAULT_BASE;
}

// A provider-supplied error type is untrusted text. Only a short machine token may reach
// a learner-facing message or a log line; anything else becomes the bare status.
const safeType = (t, status) => (typeof t === 'string' && /^[a-z0-9_.-]{1,64}$/i.test(t) ? t : `http_${status}`);

// The wire name is dated (claude-opus-5-20260810) but must still BE the requested model.
const sameModel = (wire, requested) => wire === requested || wire.startsWith(`${requested}-`);

/**
 * One streamed Messages call. Exactly one attempt — no retry, no fallback model. A
 * failure is reported as a failure, which is the only way provenance stays honest.
 *
 * Returns { text, wireModel, stopReason, usage, ttfbMs, elapsedMs }.
 * `wireModel` is what the PROVIDER said in message_start, never the requested name:
 * if the wire never identified itself it comes back null and the caller must report the
 * identity as unproved.
 */
export async function callAnthropic({
  apiKey, baseUrl, model, system, prompt,
  maxTokens = 16000, thinkingBudget = 10000, deadlineMs = 180_000, maxChars = 262_144,
  fetchImpl = fetch,
} = {}) {
  if (!apiKey) throw new ProviderError('ProviderUnconfigured', 'No Anthropic credential is configured on this server.', { status: 503, retryable: false });
  if (!model) throw new ProviderError('ProviderMisconfigured', 'No model is configured.', { retryable: false });
  // Extended thinking needs headroom for the answer on top of the thinking budget;
  // without this the model spends the whole allowance thinking and returns nothing,
  // which reads as an empty success rather than the starvation it is.
  const thinking = thinkingBudget >= 1024 && maxTokens > thinkingBudget + 1024
    ? { type: 'enabled', budget_tokens: thinkingBudget }
    : null;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), deadlineMs);
  const started = Date.now();
  let ttfbMs = null;
  try {
    const res = await fetchImpl(`${resolveBase(baseUrl)}/v1/messages`, {
      method: 'POST',
      signal: ac.signal,
      // fetch follows redirects by default and re-sends the auth header, so a 302 from
      // the endpoint would hand this credential to whatever Location named. Refuse.
      redirect: 'manual',
      headers: {
        ...authHeaders(apiKey),
        'anthropic-version': VERSION,
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model, max_tokens: maxTokens, stream: true,
        ...(system ? { system } : {}),
        ...(thinking ? { thinking } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      // Provider error bodies carry a type and message and no credential material, but
      // we still forward only the short type — never a raw body into a user response.
      let type = `http_${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.error?.type === 'string') type = safeType(body.error.type, res.status);
      } catch { /* non-JSON error body */ }
      const status = res.status === 401 || res.status === 403 ? 503
        : res.status === 429 ? 429 : 502;
      // A rate limit is transient and the provider says when to come back. Surfacing it
      // is the difference between "retry in 60s" and a dead end that looks like a bug.
      const retryAfter = res.headers?.get?.('retry-after') ?? null;
      // retry-after is provider text too: only a plain number may be quoted at a learner.
      const retrySecs = /^\d{1,6}$/.test(String(retryAfter ?? '')) ? String(retryAfter) : null;
      const err = new ProviderError(
        res.status === 401 || res.status === 403 ? 'ProviderUnauthorized'
          : res.status === 429 ? 'ProviderRateLimited' : 'ProviderFailure',
        res.status === 429
          ? `The model provider is rate limiting this account${retrySecs ? ` (retry after ${retrySecs}s)` : ''}.`
            + ' Nothing was saved — try again shortly.'
          : `The model provider refused the request (${res.status} ${type}).`,
        { status, retryable: res.status === 429 || res.status >= 500 },
      );
      err.providerStatus = res.status;
      err.providerType = type;
      err.retryAfter = retryAfter;
      throw err;
    }
    if (!res.body) throw new ProviderError('ProviderFailure', 'The model provider returned no stream.');

    let wireModel = null; let stopReason = null; let usage = null;
    let text = ''; let thinkingChars = 0; let buf = '';
    const decoder = new TextDecoder();

    for await (const chunk of res.body) {
      if (ttfbMs === null) ttfbMs = Date.now() - started;
      buf += decoder.decode(chunk, { stream: true });
      // SSE frames are blank-line separated; keep the tail, it may be a partial frame.
      const frames = buf.split('\n\n');
      buf = frames.pop() ?? '';
      for (const frame of frames) {
        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        let ev;
        try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (ev.type === 'message_start') {
          if (typeof ev.message?.model === 'string') wireModel = ev.message.model;
          if (ev.message?.usage) usage = { ...ev.message.usage };
        } else if (ev.type === 'content_block_delta') {
          if (ev.delta?.type === 'text_delta') text += ev.delta.text ?? '';
          else if (ev.delta?.type === 'thinking_delta') thinkingChars += (ev.delta.thinking ?? '').length;
        } else if (ev.type === 'message_delta') {
          if (typeof ev.delta?.stop_reason === 'string') stopReason = ev.delta.stop_reason;
          if (ev.usage) usage = { ...(usage || {}), ...ev.usage };
        } else if (ev.type === 'error') {
          throw new ProviderError('ProviderFailure', `The model stream failed (${ev.error?.type || 'error'}).`);
        }
        if (text.length > maxChars) throw new ProviderError('ProviderOutputTooLarge', 'The model returned too much data.', { retryable: false });
      }
    }
    // A reply truncated by the token ceiling is a STARVED run, not a short answer: the
    // JSON contract cannot survive it, so say so instead of handing a fragment onward.
    if (stopReason === 'max_tokens') {
      throw new ProviderError('ProviderTruncated',
        `The model ran out of its ${maxTokens}-token allowance before finishing. Nothing was saved — try a narrower goal.`,
        { retryable: false });
    }
    // Provenance is proved by the WIRE, never by what we asked for. A stream that never
    // identified itself, or identified itself as a different model, cannot back a lesson
    // provenance claim — and a stream that ended with no stop_reason never completed.
    if (!wireModel) {
      throw new ProviderError('ProviderIdentityUnproved',
        'The model provider never identified which model answered, so this reply cannot be attributed. Nothing was saved — try again.',
        { retryable: false });
    }
    if (!sameModel(wireModel, model)) {
      throw new ProviderError('ProviderIdentityMismatch',
        'The model provider answered with a different model than the one configured. Nothing was saved.',
        { retryable: false });
    }
    if (!stopReason) {
      throw new ProviderError('ProviderStreamIncomplete',
        'The model stream ended before the answer was complete. Nothing was saved — try again.');
    }
    return { text: text.trim(), wireModel, stopReason, usage, thinkingChars,
      ttfbMs, elapsedMs: Date.now() - started };
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e?.name === 'AbortError' || ac.signal.aborted) {
      throw new ProviderError('Timeout',
        // We abandon the HTTP request locally; we cannot cancel work already running at
        // the provider, and it may finish (and be billed) after we stop listening.
        // Saying "cancelled" would promise a provider-side stop we never performed.
        `The model did not answer within ${Math.round(deadlineMs / 1000)}s, so waiting here was cancelled.`
        + ' The provider may still be finishing that request. Nothing was saved and nothing'
        + ' was lost — your answers are still on screen, so try again.',
        { status: 504 });
    }
    // Never surface a raw network exception: it can carry the URL and headers.
    throw new ProviderError('ProviderUnreachable', 'Could not reach the model provider.');
  } finally {
    clearTimeout(timer);
  }
}
