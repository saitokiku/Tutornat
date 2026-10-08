import "server-only";
import { sql } from "drizzle-orm";
import { assertPrincipalLive, LearningAuthorizationError, principalOf } from "./authorize";
import { getDb } from "./db/client";

/** The abort signal reaches server providers; cancellation of a direct vendor socket is separate. */
export async function startAuthorityWork(req: Request) {
  const principal = principalOf(req);
  if (!principal) throw new LearningAuthorizationError(403, "capability");
  const db = await getDb(), controller = new AbortController();
  let closed = false, checking = false;
  const assert = async () => {
    if (controller.signal.aborted) throw controller.signal.reason;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${principal.accountId}, 0))`);
      await assertPrincipalLive(tx, principal);
    });
  };
  await assert();
  const abort = () => controller.abort(req.signal.reason ?? new DOMException("Cancelled", "AbortError"));
  req.signal.addEventListener("abort", abort, { once: true });
  if (req.signal.aborted) abort();
  const timer = setInterval(async () => {
    if (closed || checking) return;
    checking = true;
    try { await assert(); } catch (e) { controller.abort(e); }
    finally { checking = false; }
  }, 1000);
  const close = () => { closed = true; clearInterval(timer); req.signal.removeEventListener("abort", abort); };
  return { signal: controller.signal, assert, close, abort: (reason?: unknown) => controller.abort(reason) };
}
export async function withLiveAuthority<T>(req: Request, work: (control: Awaited<ReturnType<typeof startAuthorityWork>>) => Promise<T>): Promise<T> {
  const control = await startAuthorityWork(req);
  try { const answer = await work(control); await control.assert(); return answer; }
  catch (e) { if (control.signal.aborted) throw control.signal.reason; throw e; }
  finally { control.close(); }
}
export function remoteFailure(error: unknown) {
  if (error instanceof LearningAuthorizationError) return error.response();
  return Response.json({ error: error instanceof Error && error.name === "AbortError" ? "aborted" : "model" }, { status: 502 });
}
