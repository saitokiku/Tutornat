import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetching a URL a family pasted (their school's calendar feed) without letting it reach anything
// private: https only, every hop's address checked, redirects followed by hand, size and time capped.

const PRIVATE_V4 = [
  [0x0a000000, 8], [0x7f000000, 8], [0xa9fe0000, 16], [0xac100000, 12], [0xc0a80000, 16],
  [0x64400000, 10], [0x00000000, 8], [0xc0000000, 24], [0xc6120000, 15], [0xe0000000, 4], [0xf0000000, 4],
] as const;

export function isPublicAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const n = ip.split(".").reduce((a, b) => (a << 8) + Number(b), 0) >>> 0;
    return !PRIVATE_V4.some(([base, bits]) => n >>> (32 - bits) === base >>> (32 - bits));
  }
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return false;
    if (v.startsWith("::ffff:")) return isPublicAddress(v.slice(7));
    return !/^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v);
  }
  return false;
}

export class FeedError extends Error {
  constructor(public code: "url" | "blocked" | "status" | "size" | "timeout" | "format") {
    super(code);
  }
}

export function normalizeFeedUrl(raw: string): URL {
  const s = raw.trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    throw new FeedError("url");
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new FeedError("url");
  return url;
}

async function assertPublic(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) throw new FeedError("blocked");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => !isPublicAddress(a.address))) throw new FeedError("blocked");
}

export async function fetchFeed(raw: string, { maxBytes = 2_000_000, timeoutMs = 10_000 } = {}): Promise<string> {
  let url = normalizeFeedUrl(raw);
  const signal = AbortSignal.timeout(timeoutMs);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal, headers: { accept: "text/calendar, text/plain;q=0.8" } });
    } catch (e) {
      throw new FeedError((e as Error).name === "TimeoutError" ? "timeout" : "status");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = normalizeFeedUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok || !res.body) throw new FeedError("status");
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new FeedError("size");
      }
      chunks.push(value);
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 2000))) throw new FeedError("format");
    return text;
  }
  throw new FeedError("status");
}
