import { z } from "zod";
import { confirmAdultSelf } from "@/lib/server/authorize";
import { authFailure, clientIp, json, readJson, withAccount } from "@/lib/server/db/http";

const Body = z.object({ profileId: z.string().min(1).max(100), password: z.string().min(1).max(1000), self: z.literal(true), adult: z.literal(true), noticeVersion: z.string().max(60) }).strict();

/** Password-confirmed self learning for this owned adult profile and this browser session. */
export async function POST(req: Request) {
  return withAccount(req, async ({ db, session }) => {
    const body = await readJson(req, Body);
    if (body instanceof Response) return body;
    const result = await confirmAdultSelf(db, session, body, { ip: clientIp(req) });
    if (!result.ok) return "status" in result ? authFailure(result) : json({ error: result.error }, { status: 403 });
    return json(result);
  });
}
