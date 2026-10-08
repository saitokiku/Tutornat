import { model } from "@/lib/ai/config";
import { CoachRequest, writeCoachNote } from "@/lib/ai/build";
import { screen } from "@/lib/ai/safety";
import { meter, spendGate } from "@/lib/server/budget";
import { limited } from "@/lib/server/rate";

export async function POST(req: Request) {
  const m = await model("quick", meter(req));
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "coach", 10)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = CoachRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  // The safety screen reads every word the writer would (skill names, the family's calendar titles)
  // before any model call, as on every AI route.
  const words = Object.values(parsed.data.facts).flatMap((v) => (Array.isArray(v) ? v : []));
  if (screen(words.join("\n"), parsed.data.locale).kind !== "ok") return Response.json({ error: "topic" }, { status: 422 });
  const capped = await spendGate(req, "coach", parsed.data.locale);
  if (capped) return capped;
  try {
    return Response.json({ note: await writeCoachNote(parsed.data, m) });
  } catch {
    return Response.json({ error: "model" }, { status: 502 });
  }
}
