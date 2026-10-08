import { remoteFailure, withLiveAuthority } from "@/lib/server/authority-work";
import { learningGate } from "@/lib/server/authorize";
import { aiMode, model } from "@/lib/ai/config";
import { ExtractRequest, readSchoolDocument } from "@/lib/ai/build";
import { IntakeRequest, readIntake } from "@/lib/ai/extract";
import { safeTextFields, screen } from "@/lib/ai/safety";
import { spendGate } from "@/lib/server/budget";
import { limited } from "@/lib/server/rate";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (aiMode() === "demo") return Response.json({ error: "demo" }, { status: 503 });
  const denied = await learningGate(req, "generation");
  if (denied) return denied;
  const { meter, spendGate } = await import("@/lib/server/budget");
  const body: unknown = await req.json().catch(() => null);
  if ((body as { kind?: unknown } | null)?.kind === "intake") return intake(req, body, meter(req));
  if (limited(req, "extract", 10)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = ExtractRequest.safeParse(body);
  if (!parsed.success || (!parsed.data.text && !parsed.data.file)) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!safeTextFields(parsed.data, parsed.data.locale)) return Response.json({ error: "topic" }, { status: 422 });
  const capped = await spendGate(req, "extract", parsed.data.locale);
  if (capped) return capped;
  const m = await model("build", meter(req));
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  try {
    return await withLiveAuthority(req, async ({ signal }) => Response.json(await readSchoolDocument(parsed.data, m, signal)));
  } catch (error) {
    return remoteFailure(error);
  }
}

/** The magic box: one request, photo or PDF. Typed text uses the quick model; a file needs the reader. */
async function intake(req: Request, body: unknown, metered: Parameters<typeof model>[1]) {
  const parsed = IntakeRequest.safeParse(body);
  if (limited(req, "intake", 20)) return Response.json({ error: "rate" }, { status: 429 });
  if (!parsed.success || (!parsed.data.text && !parsed.data.file)) return Response.json({ error: "bad_request" }, { status: 400 });
  // The safety screen runs before any model call, here as in the tutor.
  if (parsed.data.text && screen(parsed.data.text, parsed.data.locale).kind !== "ok") return Response.json({ error: "topic" }, { status: 422 });
  const capped = await spendGate(req, "extract", parsed.data.locale);
  if (capped) return capped;
  const m = await model(parsed.data.file ? "build" : "quick", metered);
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  try {
    return await withLiveAuthority(req, async ({ signal }) => Response.json(await readIntake(parsed.data, m, signal)));
  } catch (error) {
    return remoteFailure(error);
  }
}
