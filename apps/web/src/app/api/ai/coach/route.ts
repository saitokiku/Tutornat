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
  // before any model call, as on every AI route. One the screen stops is left out of the note, never
  // sent: a school calendar is full of them ("Red Ribbon Week: drug-free pledge"), and refusing the
  // whole note would fail it every week that item is still coming up.
  const passes = (words: string) => screen(words, parsed.data.locale).kind === "ok";
  const facts = Object.fromEntries(Object.entries(parsed.data.facts).map(([k, v]) => [k, Array.isArray(v) ? v.filter(passes) : v])) as typeof parsed.data.facts;
  const capped = await spendGate(req, "coach", parsed.data.locale);
  if (capped) return capped;
  try {
    return Response.json({ note: await writeCoachNote({ ...parsed.data, facts }, m) });
  } catch {
    return Response.json({ error: "model" }, { status: 502 });
  }
}
