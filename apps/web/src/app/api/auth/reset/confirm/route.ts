import { z } from "zod";
import { confirmReset } from "@/lib/server/db/auth";
import { getDb, serverMode } from "@/lib/server/db/client";
import { authFailure, crossSite, json, localOnly, readJson, sessionCookies } from "@/lib/server/db/http";

const Body = z.object({ token: z.string().max(200), password: z.string().max(1000) });

/** Sets the new password, signs every other device out and this one in. */
export async function POST(req: Request) {
  if (!serverMode()) return localOnly();
  if (crossSite(req)) return json({ error: "cross_site" }, { status: 403 });
  const body = await readJson(req, Body);
  if (body instanceof Response) return body;
  const r = await confirmReset(await getDb(), body);
  if (!r.ok) return authFailure(r);
  return json({ account: r.account }, { cookies: sessionCookies(req, r.token, r.account.id, r.expiresAt) });
}
