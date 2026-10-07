import { setSessionLearner } from "@/lib/server/db/auth";
import { json, readJson, withAccount } from "@/lib/server/db/http";
import { cleanText, SyncBody, syncAccount } from "@/lib/server/db/sync";
import { SYNC_LIMITS } from "@/lib/server/db/wire";

export const maxDuration = 30;

/** The device sends what changed since its last sync and gets back what changed on the server. */
export async function POST(req: Request) {
  return withAccount(req, async ({ db, accountId, session }) => {
    const body = await readJson(req, SyncBody, SYNC_LIMITS.bodyBytes);
    if (body instanceof Response) return body;
    const total = Object.values(body.push).reduce((n, list) => n + list.length, 0);
    if (total > SYNC_LIMITS.pushRecords * 2) return json({ error: "too_large" }, { status: 413 });
    // Who is using this device now, for the consent gate on AI and voice.
    if (body.learner !== undefined) await setSessionLearner(db, session, body.learner === null ? null : cleanText(body.learner));
    return json(await syncAccount(db, accountId, body));
  });
}
