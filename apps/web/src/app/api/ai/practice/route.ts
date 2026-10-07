import { model } from "@/lib/ai/config";
import { PracticeRequest, writePractice } from "@/lib/ai/build";
import { screen } from "@/lib/ai/safety";
import { meter, spendGate } from "@/lib/server/budget";
import { limited } from "@/lib/server/rate";

export const maxDuration = 120;

export async function POST(req: Request) {
  const m = await model("talk", meter(req));
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "practice", 10)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = PracticeRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (screen(parsed.data.topic, parsed.data.locale).kind !== "ok") return Response.json({ error: "topic" }, { status: 422 });
  const capped = await spendGate(req, "practice", parsed.data.locale);
  if (capped) return capped;
  try {
    return Response.json({ items: await writePractice(parsed.data, m) });
  } catch {
    return Response.json({ error: "model" }, { status: 502 });
  }
}
