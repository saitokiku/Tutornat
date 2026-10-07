import { z } from "zod";
import { listReceipts, revokeConsent } from "@/lib/server/db/consent";
import { json, readJson, withAccount } from "@/lib/server/db/http";

const Body = z.object({ id: z.string().min(1).max(100) });

/** Ends a consent. The receipt stays, with the time it ended. */
export async function POST(req: Request) {
  return withAccount(req, async ({ db, accountId }) => {
    const body = await readJson(req, Body);
    if (body instanceof Response) return body;
    if (!(await revokeConsent(db, accountId, body.id))) return json({ error: "not_found" }, { status: 404 });
    return json({ receipts: await listReceipts(db, accountId) });
  });
}
