// Burst rate limiter for AI routes — fixed window.
// This protects against rapid-fire abuse; it is SEPARATE from the daily plan
// caps enforced by checkEntitlement (usage_ledger).
//
// Backend (audit SEC-002): when UPSTASH_REDIS_REST_URL/TOKEN are set, counting
// happens in Redis so the limit holds across every serverless instance. Without
// them (local dev, unconfigured deploys) it falls back to the original
// per-instance Map — same interface, weaker guarantee, clearly logged once.

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

let warnedFallback = false;

// ── In-memory fallback (single warm instance) ────────────────────────────────
const buckets = new Map(); // key → { count, windowStart }
const MAX_KEYS = 10000;

function checkRateMemory(key, limit, windowMs) {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) {
      if (now - b.windowStart >= windowMs) buckets.delete(k);
      if (buckets.size <= MAX_KEYS / 2) break;
    }
  }
  let b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    b = { count: 0, windowStart: now };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.windowStart + windowMs - now) / 1000)) };
  }
  return { ok: true };
}

// ── Redis fixed window (multi-instance correct) ──────────────────────────────
async function checkRateRedis(key, limit, windowMs) {
  const windowId = Math.floor(Date.now() / windowMs);
  const rkey = `rl:${key}:${windowId}`;
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(2000),
    body: JSON.stringify([["INCR", rkey], ["PEXPIRE", rkey, String(windowMs), "NX"]]),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const out = await res.json();
  const count = Number(out?.[0]?.result || 0);
  if (count > limit) {
    const msLeft = windowMs - (Date.now() % windowMs);
    return { ok: false, retryAfter: Math.max(1, Math.ceil(msLeft / 1000)) };
  }
  return { ok: true };
}

export const AI_ROUTE_LIMIT = { limit: 20, windowMs: 60_000 }; // 20 req / 60s per user

// Async now (Redis roundtrip). Fails OPEN to the in-memory counter — an
// unreachable Redis must never take the product down.
export async function checkRate(key, { limit = 20, windowMs = 60_000 } = {}) {
  if (redisConfigured) {
    try {
      return await checkRateRedis(key, limit, windowMs);
    } catch (err) {
      console.error('[ratelimit] redis unavailable, using in-memory fallback:', err?.message);
      return checkRateMemory(key, limit, windowMs);
    }
  }
  if (!warnedFallback && process.env.NODE_ENV === 'production') {
    warnedFallback = true;
    console.warn('[ratelimit] UPSTASH_REDIS_REST_URL not set — limits are per-instance only (audit SEC-002)');
  }
  return checkRateMemory(key, limit, windowMs);
}

// Stable key for a request: user id when authenticated, client IP in demo mode.
export function rateKey(caller, req, scope = 'ai') {
  if (caller?.user?.id) return `${scope}:u:${caller.user.id}`;
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  return `${scope}:ip:${ip}`;
}

// One-liner guard for routes: returns a 429 Response, or null to proceed.
export async function rateLimitResponse(caller, req, opts = AI_ROUTE_LIMIT) {
  const r = await checkRate(rateKey(caller, req), opts);
  if (r.ok) return null;
  return new Response(
    JSON.stringify({ error: 'Whoa — too many requests at once. Give it a few seconds.' }),
    {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(r.retryAfter) },
    }
  );
}
