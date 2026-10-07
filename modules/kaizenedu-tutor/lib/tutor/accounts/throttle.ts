/**
 * Sign-in throttle: at most SIGN_IN_MAX_ATTEMPTS failed attempts per key
 * (an email or a teen login name) per SIGN_IN_WINDOW_MS, counted in memory.
 * The map is per process: on serverless every instance counts on its own, so
 * this slows a brute force through one instance and is not the last line of
 * defence (passwords are scrypt hashes; see lib/tutor/auth/password).
 */
export const SIGN_IN_MAX_ATTEMPTS = 10;
export const SIGN_IN_WINDOW_MS = 15 * 60_000;
const PRUNE_ABOVE = 10_000;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

function expired(bucket: Bucket, now: number): boolean {
  return now - bucket.windowStart >= SIGN_IN_WINDOW_MS;
}

export interface ThrottleDecision {
  allowed: boolean;
  /** Seconds until the window opens again; 0 when allowed. */
  retryAfterSeconds: number;
}

export function signInThrottle(key: string, now = Date.now()): ThrottleDecision {
  const bucket = buckets.get(key);
  if (!bucket || expired(bucket, now) || bucket.count < SIGN_IN_MAX_ATTEMPTS) {
    return { allowed: true, retryAfterSeconds: 0 };
  }
  return {
    allowed: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((bucket.windowStart + SIGN_IN_WINDOW_MS - now) / 1000),
    ),
  };
}

export function recordSignInFailure(key: string, now = Date.now()): void {
  if (buckets.size > PRUNE_ABOVE) {
    for (const [otherKey, bucket] of buckets) if (expired(bucket, now)) buckets.delete(otherKey);
  }
  const bucket = buckets.get(key);
  if (!bucket || expired(bucket, now)) {
    buckets.set(key, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function clearSignInFailures(key: string): void {
  buckets.delete(key);
}

export function resetSignInThrottleForTests(): void {
  buckets.clear();
}
