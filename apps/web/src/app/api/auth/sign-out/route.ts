import { endSession } from "@/lib/server/db/auth";
import { getDb, serverMode } from "@/lib/server/db/client";
import { clearedCookies, crossSite, json, localOnly, readCookie, SESSION_COOKIE } from "@/lib/server/db/http";

export async function POST(req: Request) {
  if (!serverMode()) return localOnly();
  if (crossSite(req)) return json({ error: "cross_site" }, { status: 403 });
  await endSession(await getDb(), readCookie(req, SESSION_COOKIE));
  return json({ ok: true }, { cookies: clearedCookies(req) });
}
