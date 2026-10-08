import { learningGate } from "@/lib/server/authorize";
import { setSessionLearner } from "@/lib/server/db/auth";
import { json, readJson, withAccount } from "@/lib/server/db/http";
import { cleanText, SyncBody, syncAccount } from "@/lib/server/db/sync";
import { SYNC_LIMITS } from "@/lib/server/db/wire";

export const maxDuration = 30;

/** The device sends what changed since its last sync and gets back what changed on the server. */
export async function POST(req: Request) {
  const denied = await learningGate(req, "sync");
  if (denied) return denied;
  return withAccount(req, async ({ db, accountId, session }) => {
    const body = await readJson(req, SyncBody, SYNC_LIMITS.bodyBytes);
    if (body instanceof Response) return body;
    const total = Object.values(body.push).reduce((n, list) => n + list.length, 0);
    if (total > SYNC_LIMITS.pushRecords * 2) return json({ error: "too_large" }, { status: 413 });
    const answer = await syncAccount(db, accountId, body);
    // A newly pushed learner must exist before selecting; selection still grants no processor access.
    if (body.learner !== undefined && !(await setSessionLearner(db, session, body.learner === null ? null : cleanText(body.learner)))) return json({ error: "learner" }, { status: 403 });
    return json(answer);
  });
}
