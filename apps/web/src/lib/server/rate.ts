/**
 * The caller's address as the platform reports it; "local" in development. An IPv6 address counts by
 * its /64: one household (or one abuser) holds the whole block, and privacy extensions rotate the
 * rest on their own, so keying on the full address would hand each new one a fresh budget.
 */
export const clientAddress = (req: Request) => {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first ? addressKey(first) : "local";
};

/** "2001:db8:a:b:1:2:3:4" and "2001:db8:a:b::9" are both "2001:db8:a:b::/64"; IPv4 (with or without a port) stays as it is. */
export function addressKey(raw: string): string {
  let a = raw.trim().toLowerCase();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(a);
  if (bracketed) a = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(a)) a = a.slice(0, a.lastIndexOf(":"));
  a = a.replace(/%.*$/, "");
  if (!a.includes(":")) return a;
  const v4 = /:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(a);
  if (v4) return v4[1];
  const [head, tail, extra] = a.split("::");
  if (extra !== undefined) return a;
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return a;
  return `${groups
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(":")}::/64`;
}

// Per-address request budget per minute.
// ponytail: in-memory per server instance; a shared store (KV/Redis) when there is real traffic.
const hits = new Map<string, number[]>();

export function limited(req: Request, bucket: string, perMinute: number): boolean {
  const key = `${bucket}:${clientAddress(req)}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > perMinute;
}
