import { z } from "zod";
import { signUp } from "@/lib/server/db/auth";
import { getDb, serverMode } from "@/lib/server/db/client";
import { authFailure, clientIp, crossSite, json, localOnly, readJson, sessionCookies } from "@/lib/server/db/http";

const Body = z.object({ email: z.string().max(400), password: z.string().max(1000), displayName: z.string().max(400), adult: z.boolean().optional() });

export async function POST(req: Request) {
  if (!serverMode()) return localOnly();
  if (crossSite(req)) return json({ error: "cross_site" }, { status: 403 });
  const body = await readJson(req, Body);
  if (body instanceof Response) return body;
  const r = await signUp(await getDb(), body, { ip: clientIp(req) });
  if (!r.ok) return authFailure(r);
  return json({ account: r.account }, { cookies: sessionCookies(req, r.token, r.account.id, r.expiresAt) });
}
