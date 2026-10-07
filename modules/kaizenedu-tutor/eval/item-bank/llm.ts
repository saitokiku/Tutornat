/**
 * Model access for the item-bank pipeline: server-side key resolution, one
 * `callLLM` wrapper with an on-disk cache of raw outputs (so a rerun resumes
 * without spending), a per-call usage ledger, retries with backoff, a health
 * check, and a small concurrency pool. Keys are resolved through
 * `@/lib/server/provider-config` and never logged or written.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { LanguageModel } from 'ai';

import { callLLM } from '@/lib/ai/llm';
import { getModel, parseModelString } from '@/lib/ai/providers';
import { resolveApiKey } from '@/lib/server/provider-config';
import type { ThinkingConfig } from '@/lib/types/provider';
import { normalizeUsage } from '@/lib/usage/normalize';

import type { UsageRecord } from './types';

/** Source labels for the usage ledger (`callLLM`'s second argument). */
export const GEN_SOURCE = 'tutor-item-gen';
export const SOLVE_SOURCE = 'tutor-item-solve';

export interface Llm {
  modelString: string;
  providerId: string;
  modelId: string;
  model: LanguageModel;
}

export function resolveLlm(modelString: string): Llm {
  const { providerId, modelId } = parseModelString(modelString);
  const apiKey = resolveApiKey(providerId, '');
  if (!apiKey) {
    throw new Error(
      `No server-side API key is configured for provider "${providerId}" (needed for ${modelString}).`,
    );
  }
  const { model } = getModel({ providerId, modelId, apiKey });
  return { modelString, providerId, modelId, model };
}

export type ThinkingDepth = 'minimal' | 'low' | 'medium' | 'high';

/**
 * One unified config; `callLLM`'s adapter keeps the field the model
 * understands (a Gemini thinking level or an Anthropic effort).
 */
function thinkingConfig(depth: ThinkingDepth): ThinkingConfig {
  return { mode: 'enabled', level: depth, effort: depth === 'minimal' ? 'low' : depth };
}

export interface CallRequest {
  stage: 'generate' | 'solve' | 'judge' | 'health';
  key: string;
  system?: string;
  prompt: string;
  maxOutputTokens: number;
  thinking: ThinkingDepth;
  /** Bumps the cache key so a retry after a parse failure gets a fresh sample. */
  attempt?: number;
  noCache?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export interface CallResponse {
  text: string;
  cached: boolean;
  usage: TokenUsage;
  ms: number;
}

interface CacheEntry {
  model: string;
  stage: string;
  key: string;
  attempt: number;
  promptSha: string;
  text: string;
  usage: TokenUsage;
  ms: number;
  at: string;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export class LlmClient {
  readonly ledger: UsageRecord[] = [];

  constructor(
    readonly llm: Llm,
    private readonly source: string,
    private readonly cacheDir: string,
    private readonly usageLogPath: string,
  ) {
    mkdirSync(cacheDir, { recursive: true });
  }

  private cachePath(request: CallRequest, promptSha: string): string {
    const id = sha256(
      [this.llm.modelString, request.stage, request.key, request.attempt ?? 1, promptSha].join('|'),
    );
    return join(this.cacheDir, `${request.stage}-${id.slice(0, 32)}.json`);
  }

  async call(request: CallRequest): Promise<CallResponse> {
    const promptSha = sha256(
      `${request.system ?? ''}\n---\n${request.prompt}\n---\n${request.thinking}|${request.maxOutputTokens}`,
    );
    const path = this.cachePath(request, promptSha);
    if (!request.noCache && existsSync(path)) {
      const entry = JSON.parse(readFileSync(path, 'utf8')) as CacheEntry;
      this.record(request, promptSha, entry.usage, entry.ms, true);
      return { text: entry.text, cached: true, usage: entry.usage, ms: entry.ms };
    }

    const started = Date.now();
    const result = await callLLM(
      {
        model: this.llm.model,
        system: request.system,
        prompt: request.prompt,
        maxOutputTokens: request.maxOutputTokens,
        // KAIZEN: the AI SDK's own default (maxRetries: 2, i.e. 3 attempts on
        // its own short backoff) was silently firing up to 3 real requests
        // per call() before an error ever reached withRetry above, which
        // defeated its quota-aware backoff by tripping the free-tier limit
        // faster than that backoff could let it recover. withRetry is the
        // only retry layer this pipeline wants; the SDK makes exactly one
        // attempt per call() now.
        maxRetries: 0,
      },
      this.source,
      undefined,
      thinkingConfig(request.thinking),
    );
    const ms = Date.now() - started;
    const normalized = normalizeUsage(result.totalUsage ?? result.usage);
    const usage: TokenUsage = {
      inputTokens: normalized.inputTokens + normalized.cacheReadTokens,
      outputTokens: normalized.outputTokens,
      reasoningTokens: normalized.reasoningTokens,
    };
    if (!request.noCache) {
      const entry: CacheEntry = {
        model: this.llm.modelString,
        stage: request.stage,
        key: request.key,
        attempt: request.attempt ?? 1,
        promptSha,
        text: result.text,
        usage,
        ms,
        at: new Date().toISOString(),
      };
      writeFileSync(path, JSON.stringify(entry, null, 2));
    }
    this.record(request, promptSha, usage, ms, false);
    return { text: result.text, cached: false, usage, ms };
  }

  private record(
    request: CallRequest,
    promptSha: string,
    usage: TokenUsage,
    ms: number,
    cached: boolean,
  ): void {
    const record: UsageRecord = {
      stage: request.stage,
      key: request.key,
      attempt: request.attempt ?? 1,
      promptSha,
      model: this.llm.modelString,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      ms,
      cached,
      at: new Date().toISOString(),
    };
    this.ledger.push(record);
    appendFileSync(this.usageLogPath, `${JSON.stringify(record)}\n`);
  }
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * KAIZEN: a free-tier provider quota error ("You exceeded your current
 * quota... limit: 20") is not a transient blip the normal 2/4/8 s backoff can
 * ride out — Google's own 429 body names a ~55-60 s reset. Retrying inside
 * that window (as the plain exponential backoff below does) only spends more
 * of the same exhausted quota and reliably fails several cells in a row.
 * Detected empirically running this pipeline for the first time against a
 * free-tier Gemini key (spec §5.8 / R12 / content-15); every other error
 * shape keeps the original fast backoff.
 */
const RATE_LIMIT_PATTERN = /quota|rate.?limit|429|RESOURCE_EXHAUSTED/i;
const RATE_LIMIT_BACKOFF_MS = 65_000;
/**
 * KAIZEN: two full 30-attempt rounds (≈65 min total) against this key's
 * `gemini-3.6-flash` bucket, run back to back on the same fixed 65 s
 * spacing, produced zero successes — and the provider's own retry-after
 * hint kept bouncing between ~9 s and ~55 s rather than trending toward 0
 * across both rounds. A fixed interval landing on the same phase every
 * time is exactly what you'd see if this key's other concurrent traffic is
 * itself retrying on a roughly fixed cadence: every requester's fixed
 * clock stays in the same relative phase forever, so whichever requests
 * happened to collide keep colliding. ± a third of the base interval
 * pushes each retry to a different point in the cycle than the last,
 * so a persistently bad phase alignment cannot repeat run after run.
 */
const RATE_LIMIT_JITTER_MS = 22_000;

/**
 * KAIZEN: the plain 3-try exponential backoff was not enough headroom against
 * a free-tier Gemini quota this pipeline shares with other traffic on the
 * same key — it was observed staying exceeded across single, cleanly-spaced
 * requests for several minutes at a stretch, then opening up. `attempts` is
 * now the ceiling for that specific, detected failure shape only: a provider
 * that keeps saying "quota exceeded" gets up to `attempts` tries, `RATE_LIMIT_BACKOFF_MS`
 * apart, to catch the opening. Every OTHER failure (a malformed reply, a
 * genuinely broken key, a one-off network blip) still gives up after
 * `NON_QUOTA_RETRY_LIMIT` tries on the original fast backoff — a provider
 * that has no credit at all should fail in seconds, not spend the same
 * multi-minute budget a rate limit deserves.
 *
 * 8 (≈8.7 min) was still not enough: a live run saw 8 single, 65 s-spaced
 * requests all rejected while the provider's own retry-after hint kept
 * bouncing between ~9 s and ~55 s rather than trending toward 0 — the
 * signature of contention from other traffic on the same key, not a bucket
 * this process is slowly draining on its own. A 429 is free (no tokens are
 * billed for a rejected request), so the only cost of more attempts is
 * wall-clock time, and the observed 9 s low points mean a real opening
 * exists; this just needs enough tries to land in one.
 */
export const QUOTA_RETRY_ATTEMPTS = 30;
const NON_QUOTA_RETRY_LIMIT = 3;

/**
 * Retries `fn` until it succeeds, a non-quota failure has been tried
 * `NON_QUOTA_RETRY_LIMIT` times, or a quota failure has been tried `attempts`
 * times (`attempts` should be `QUOTA_RETRY_ATTEMPTS` unless a caller
 * deliberately wants a smaller quota ceiling too). The callback receives the
 * 1-based attempt so callers can vary the cache key.
 */
export async function withRetry<T>(
  label: string,
  attempts: number,
  fn: (attempt: number) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  let nonQuotaTries = 0;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const message = errorMessage(error).replace(/\s+/g, ' ').slice(0, 200);
      console.warn(`  [${label}] attempt ${attempt}/${attempts} failed: ${message}`);
      const rateLimited = RATE_LIMIT_PATTERN.test(message);
      if (!rateLimited) {
        nonQuotaTries++;
        if (nonQuotaTries >= NON_QUOTA_RETRY_LIMIT) break;
      }
      if (attempt < attempts) {
        const backoff = rateLimited
          ? RATE_LIMIT_BACKOFF_MS + (Math.random() * 2 - 1) * RATE_LIMIT_JITTER_MS
          : 2000 * 2 ** (nonQuotaTries - 1);
        await sleep(backoff);
      }
    }
  }
  throw lastError;
}

/** A tiny uncached call, retried with backoff; tells the runner whether a provider is usable now. */
export async function healthCheck(client: LlmClient): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await withRetry(`health ${client.llm.modelString}`, QUOTA_RETRY_ATTEMPTS, () =>
      client.call({
        stage: 'health',
        key: 'health',
        prompt: 'Reply with the single word OK.',
        maxOutputTokens: 64,
        thinking: 'minimal',
        noCache: true,
      }),
    );
    if (!response.text.trim()) return { ok: false, error: 'empty response' };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

/** Runs `worker` over `items` with at most `concurrency` in flight; results keep input order. */
export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const lanes = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    },
  );
  await Promise.all(lanes);
  return results;
}
