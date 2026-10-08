import { remoteFailure, withLiveAuthority } from "@/lib/server/authority-work";
import { safeTextFields } from "@/lib/ai/safety";
import { learningGate } from "@/lib/server/authorize";
import { aiMode, model } from "@/lib/ai/config";
import { CoachRequest, writeCoachNote } from "@/lib/ai/build";
import { meter, spendGate } from "@/lib/server/budget";
import { limited } from "@/lib/server/rate";

export async function POST(req: Request) {
  if (aiMode() === "demo") return Response.json({ error: "demo" }, { status: 503 });
  const denied = await learningGate(req, "generation");
  if (denied) return denied;
  if (limited(req, "coach", 10)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = CoachRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!safeTextFields(parsed.data, parsed.data.locale)) return Response.json({ error: "topic" }, { status: 422 });
  const capped = await spendGate(req, "coach", parsed.data.locale);
  if (capped) return capped;
  const m = await model("quick", meter(req));
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  try {
    return await withLiveAuthority(req, async ({ signal }) => Response.json({ note: await writeCoachNote(parsed.data, m, signal) }));
  } catch (error) {
    return remoteFailure(error);
  }
}
