// Server-side fetch for public knowledge APIs: one place for timeouts, a user agent that says who we
// are, size caps and a small cache. Nothing about the learner ever goes out — only the query.
// ponytail: in-memory cache per server instance; Vercel's CDN caches the routes a day on top.

const cache = new Map<string, { at: number; value: unknown }>();
const MAX = 2000;

export class KnowError extends Error {
  constructor(public code: "status" | "timeout" | "size" | "format") {
    super(code);
  }
}

export async function cachedJson<T>(url: string, { ttlMs = 24 * 3600_000, timeoutMs = 8000, maxBytes = 400_000 } = {}): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json", "user-agent": "KaizenEDU/0.1 (https://kaizenedu.net; learning app)" } });
  } catch (e) {
    throw new KnowError((e as Error).name === "TimeoutError" ? "timeout" : "status");
  }
  if (!res.ok) throw new KnowError("status");
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new KnowError("size");
  const text = await res.text();
  if (text.length > maxBytes) throw new KnowError("size");
  let value: T;
  try {
    value = JSON.parse(text) as T;
  } catch {
    throw new KnowError("format");
  }
  if (cache.size >= MAX) cache.delete(cache.keys().next().value!);
  cache.set(url, { at: Date.now(), value });
  return value;
}

export const clearKnowCache = () => cache.clear();

/** Plain text from a short HTML snippet (search results carry <span> highlights). */
export const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();

/** A query a child typed: trimmed, capped, no control characters. */
export function cleanQuery(q: unknown, max = 120): string | null {
  if (typeof q !== "string") return null;
  const s = q.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return s.length >= 2 ? s : null;
}
