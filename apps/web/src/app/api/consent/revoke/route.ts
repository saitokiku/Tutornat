import { z } from "zod";
import { listReceipts, revokeConsent } from "@/lib/server/db/consent";
import { authFailure, clientIp, json, readJson, withAccount } from "@/lib/server/db/http";

const Body = z.object({ id: z.string().min(1).max(100), password: z.string().min(1).max(1000) });

/** Ends a consent, with the account password. The receipt stays, with the time it ended. */
export async function POST(req: Request) {
  return withAccount(req, async ({ db, accountId }) => {
    const body = await readJson(req, Body);
    if (body instanceof Response) return body;
    const r = await revokeConsent(db, accountId, body, { ip: clientIp(req) });
    if (!r.ok) return r.error === "rate" ? authFailure(r) : json({ error: r.error }, { status: r.error === "not_found" ? 404 : 403 });
    return json({ receipts: await listReceipts(db, accountId) });
  });
}
