import { model } from "@/lib/ai/config";
import { cachedCourse, CourseRequest, writeCourse, type CourseEvent } from "@/lib/ai/build";
import { meter, spendGate } from "@/lib/server/budget";
import { limited } from "@/lib/server/rate";

export const maxDuration = 300;

function ndjson(events: AsyncIterable<CourseEvent> | Iterable<CourseEvent>, signal: AbortSignal) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`));
      try {
        for await (const e of events) send(e);
      } catch (err) {
        if (!signal.aborted) send({ type: "error", error: (err as Error).name === "AbortError" ? "aborted" : "model" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

// Streams one JSON event per line: steps, the outline, each lesson that passed the gates, skips, done.
// A course another family already got for the same request comes straight from the cache: no model
// call and nothing counted against the spend caps.
export async function POST(req: Request) {
  const m = await model("build", meter(req));
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "course", 6)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = CourseRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const hit = cachedCourse(parsed.data);
  if (hit) return ndjson(hit, req.signal);
  const capped = await spendGate(req, "course", parsed.data.locale);
  if (capped) return capped;
  return ndjson(writeCourse(parsed.data, m, req.signal), req.signal);
}
