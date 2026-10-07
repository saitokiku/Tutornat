import { model } from "@/lib/ai/config";
import { ExtractRequest, readSchoolDocument } from "@/lib/ai/build";
import { IntakeRequest, readIntake } from "@/lib/ai/extract";
import { screen } from "@/lib/ai/safety";
import { limited } from "@/lib/server/rate";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  if ((body as { kind?: unknown } | null)?.kind === "intake") return intake(req, body);
  const m = await model("build");
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "extract", 10)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = ExtractRequest.safeParse(body);
  if (!parsed.success || (!parsed.data.text && !parsed.data.file)) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json(await readSchoolDocument(parsed.data, m));
  } catch {
    return Response.json({ error: "model" }, { status: 502 });
  }
}

/** The magic box: one request, photo or PDF. Typed text uses the quick model; a file needs the reader. */
async function intake(req: Request, body: unknown) {
  const parsed = IntakeRequest.safeParse(body);
  const m = await model(parsed.success && parsed.data.file ? "build" : "quick");
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "intake", 20)) return Response.json({ error: "rate" }, { status: 429 });
  if (!parsed.success || (!parsed.data.text && !parsed.data.file)) return Response.json({ error: "bad_request" }, { status: 400 });
  // The safety screen runs before any model call, here as in the tutor.
  if (parsed.data.text && screen(parsed.data.text, parsed.data.locale).kind !== "ok") return Response.json({ error: "topic" }, { status: 422 });
  try {
    return Response.json(await readIntake(parsed.data, m));
  } catch {
    return Response.json({ error: "model" }, { status: 502 });
  }
}
