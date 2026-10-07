import { z } from "zod";
import { resetValid } from "@/lib/server/db/auth";
import { getDb, serverMode } from "@/lib/server/db/client";
import { crossSite, json, localOnly, readJson } from "@/lib/server/db/http";

const Body = z.object({ token: z.string().max(200) });

/** Whether a reset link still works, so the page can say so before asking for a new password. */
export async function POST(req: Request) {
  if (!serverMode()) return localOnly();
  if (crossSite(req)) return json({ error: "cross_site" }, { status: 403 });
  const body = await readJson(req, Body);
  if (body instanceof Response) return body;
  return json({ valid: await resetValid(await getDb(), body.token) });
}
