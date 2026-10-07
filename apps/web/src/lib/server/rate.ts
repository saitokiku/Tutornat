import "server-only";

/** The caller's address as the platform reports it; "local" in development. */
export const clientAddress = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

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
