/**
 * Rate limits for the priced routes (spec R9 "rate limits on generation and
 * TTS"; guard-25).
 *
 * Soft guard: a token bucket per principal and route family, in memory.
 * Vercel runs many instances and each keeps its own buckets, so the minute
 * limit is enforced per instance, not globally; it stops a runaway client,
 * not a distributed one. Hard guard: a per-learner daily counter over
 * `usage_ledger` rows (one row per priced hop), which every instance shares
 * through the database. Routes call `enforceRateLimits` (both) or
 * `enforceRateLimit` (soft only, for unpriced routes) before doing work.
 */
import type { NextResponse } from 'next/server';

import { STAFF } from '@/kaizen.config';
import { apiError } from '@/lib/server/api-response';
import type { Principal } from '@/lib/tutor/contracts';
import type { BudgetKind } from '@/lib/tutor/cost';
import type { Queryable } from '@/lib/tutor/db';

export type RouteFamily =
  | 'turn'
  | 'tts'
  | 'asr'
  | 'problem-extract'
  | 'flag'
  | 'error-report'
  | 'billing';

/** Requests per minute per principal. Sign-in limits live with auth. */
export const RATE_LIMITS_PER_MINUTE: Readonly<Record<RouteFamily, number>> = {
  turn: 30,
  tts: 120,
  asr: 60,
  'problem-extract': 10,
  flag: 10,
  'error-report': 20,
  billing: 10,
};

/** Priced hops per learner per UTC day, counted from usage_ledger rows. */
export const DAILY_HOP_LIMITS: Readonly<Record<BudgetKind, number>> = {
  llm: 600,
  tts: 2400,
  asr: 1200,
  vision: 60,
};

/** Which ledger kind a route family writes; null for unpriced routes. */
export const FAMILY_HOP: Readonly<Record<RouteFamily, BudgetKind | null>> = {
  turn: 'llm',
  tts: 'tts',
  asr: 'asr',
  'problem-extract': 'vision',
  flag: null,
  'error-report': null,
  billing: null,
};

export interface BucketDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Whole seconds until one token is back; 0 when allowed. */
  retryAfterSeconds: number;
}

export interface RateLimitDecision extends BucketDecision {
  family: RouteFamily;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const PRUNE_ABOVE = 5_000;
const IDLE_MS = 10 * 60_000;

/** Classic token bucket: capacity `perMinute`, refilled continuously. */
export class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly now: () => number = Date.now) {}

  take(key: string, perMinute: number, cost = 1): BucketDecision {
    if (!Number.isFinite(perMinute) || perMinute <= 0) {
      throw new RangeError(`perMinute must be a positive number; got ${perMinute}`);
    }
    const at = this.now();
    const refillPerMs = perMinute / 60_000;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: perMinute, updatedAt: at };
      this.buckets.set(key, bucket);
      if (this.buckets.size > PRUNE_ABOVE) this.prune();
    } else {
      const elapsed = Math.max(0, at - bucket.updatedAt);
      bucket.tokens = Math.min(perMinute, bucket.tokens + elapsed * refillPerMs);
      bucket.updatedAt = at;
    }
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        limit: perMinute,
        remaining: Math.floor(bucket.tokens),
        retryAfterSeconds: 0,
      };
    }
    const deficit = cost - bucket.tokens;
    return {
      allowed: false,
      limit: perMinute,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(deficit / refillPerMs / 1000)),
    };
  }

  /** Drops buckets idle longer than `idleMs`. */
  prune(idleMs = IDLE_MS): void {
    const at = this.now();
    for (const [key, bucket] of this.buckets) {
      if (at - bucket.updatedAt > idleMs) this.buckets.delete(key);
    }
  }

  get size(): number {
    return this.buckets.size;
  }
}

export type RateLimitPrincipal = Pick<Principal, 'accountId' | 'learnerId'> &
  Partial<Pick<Principal, 'staff'>>;

/**
 * The limit this principal is held to. Staff are multiplied, not exempted: an
 * operator testing a voice loop should never meet the limiter, and a runaway
 * client on a staff account should still meet something.
 */
export function limitFor(base: number, principal: RateLimitPrincipal): number {
  return principal.staff ? base * STAFF.rateLimitMultiplier : base;
}

export function rateLimitKey(principal: RateLimitPrincipal, family: RouteFamily): string {
  return `${family}:${principal.accountId}:${principal.learnerId ?? 'account'}`;
}

const STATE_KEY = Symbol.for('natural-tutor.rate-limit');
interface LimiterState {
  limiter?: TokenBucketLimiter;
}
const state = ((globalThis as Record<symbol, unknown>)[STATE_KEY] ??= {}) as LimiterState;

export function defaultLimiter(): TokenBucketLimiter {
  return (state.limiter ??= new TokenBucketLimiter());
}

export function resetRateLimitsForTests(): void {
  state.limiter = undefined;
}

export function checkRateLimit(
  principal: RateLimitPrincipal,
  family: RouteFamily,
  limiter: TokenBucketLimiter = defaultLimiter(),
): RateLimitDecision {
  const decision = limiter.take(
    rateLimitKey(principal, family),
    limitFor(RATE_LIMITS_PER_MINUTE[family], principal),
  );
  return { ...decision, family };
}

/** 429 with Retry-After, in the repo's error shape. */
export function rateLimitedResponse(decision: RateLimitDecision): NextResponse {
  const response = apiError(
    'RATE_LIMITED',
    429,
    `Too many ${decision.family} requests. Try again in ${decision.retryAfterSeconds} s.`,
  );
  response.headers.set('Retry-After', String(decision.retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(decision.limit));
  response.headers.set('X-RateLimit-Remaining', String(decision.remaining));
  return response;
}

/** Soft guard only. Null means proceed. */
export function enforceRateLimit(
  principal: RateLimitPrincipal,
  family: RouteFamily,
  limiter?: TokenBucketLimiter,
): NextResponse | null {
  const decision = checkRateLimit(principal, family, limiter);
  return decision.allowed ? null : rateLimitedResponse(decision);
}

export interface DailyHopDecision {
  allowed: boolean;
  kind: BudgetKind | null;
  count: number;
  limit: number | null;
}

/** Hard guard: priced hops this learner already made today, from the shared ledger. */
export async function checkDailyHopCount(
  db: Queryable,
  principal: RateLimitPrincipal,
  family: RouteFamily,
): Promise<DailyHopDecision> {
  const kind = FAMILY_HOP[family];
  if (!kind || !principal.learnerId) return { allowed: true, kind, count: 0, limit: null };
  const limit = limitFor(DAILY_HOP_LIMITS[kind], principal);
  const { rows } = await db.query<{ n: number | string }>(
    `SELECT count(*)::int AS n FROM usage_ledger
     WHERE account_id = $1 AND learner_id = $2 AND kind = $3
       AND ts >= date_trunc('day', now() AT TIME ZONE 'UTC')`,
    [principal.accountId, principal.learnerId, kind],
  );
  const count = Number(rows[0]?.n ?? 0);
  return { allowed: count < limit, kind, count, limit };
}

export function secondsUntilUtcMidnight(now = Date.now()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now) / 1000));
}

export function dailyLimitResponse(decision: DailyHopDecision, now = Date.now()): NextResponse {
  const retryAfter = secondsUntilUtcMidnight(now);
  const response = apiError(
    'RATE_LIMITED',
    429,
    `This learner reached today's limit of ${decision.limit ?? 0} ${decision.kind ?? ''} requests. It resets at midnight UTC.`,
  );
  response.headers.set('Retry-After', String(retryAfter));
  return response;
}

/** Soft then hard guard. Null means proceed. */
export async function enforceRateLimits(
  db: Queryable,
  principal: RateLimitPrincipal,
  family: RouteFamily,
  limiter?: TokenBucketLimiter,
): Promise<NextResponse | null> {
  const soft = enforceRateLimit(principal, family, limiter);
  if (soft) return soft;
  const hard = await checkDailyHopCount(db, principal, family);
  return hard.allowed ? null : dailyLimitResponse(hard);
}
