import { remoteFailure, withLiveAuthority } from "@/lib/server/authority-work";
import { learningGate } from "@/lib/server/authorize";
import { aiMode, model } from "@/lib/ai/config";
import { limited } from "@/lib/server/rate";
import { tutorTurn, type TutorRequest } from "@/lib/ai/tutor";

export const maxDuration = 60;

// A photo of the problem arrives inside the request (already shrunk in the browser) and is never
// written anywhere; the conversation itself is capped so a request stays well under the platform limit.
const MAX_BODY = 4_000_000;

export async function POST(req: Request) {
  if (aiMode() === "demo") return Response.json({ error: "demo" }, { status: 503 });
  const denied = await learningGate(req, "tutor");
  if (denied) return denied;
  const { meter, spendGate } = await import("@/lib/server/budget");
  const capped = await spendGate(req, "talk");
  if (capped) return capped;
  const m = await model("talk", meter(req));
  if (!m) return Response.json({ error: "demo", mode: aiMode() }, { status: 503 });
  if (limited(req, "tutor", 30)) return Response.json({ error: "rate" }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return Response.json({ error: "photo_too_big" }, { status: 413 });
  const body = (await req.json().catch(() => null)) as TutorRequest | null;
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });
  try { return await withLiveAuthority(req, ({ signal, assert }) => tutorTurn(body, m, signal, assert)); }
  catch (error) { return remoteFailure(error); }
}
