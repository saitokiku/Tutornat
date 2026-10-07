import { z } from "zod";
import { requestReset } from "@/lib/server/db/auth";
import { getDb, serverMode } from "@/lib/server/db/client";
import { emailConfigured, resendSender } from "@/lib/server/db/email";
import { appOrigin, authFailure, clientIp, crossSite, json, localOnly, readJson } from "@/lib/server/db/http";

const Body = z.object({ email: z.string().max(400), locale: z.enum(["en", "es"]).default("en") });

/** Asks for a reset link. The answer is the same whether or not the address has an account. */
export async function POST(req: Request) {
  if (!serverMode()) return localOnly();
  if (crossSite(req)) return json({ error: "cross_site" }, { status: 403 });
  const body = await readJson(req, Body);
  if (body instanceof Response) return body;
  const r = await requestReset(await getDb(), body, {
    ip: clientIp(req),
    origin: appOrigin(req),
    send: resendSender(),
    emailConfigured: emailConfigured(),
    production: process.env.NODE_ENV === "production",
  });
  return "ok" in r ? authFailure(r) : json(r);
}
