import { startAuthorityWork } from "@/lib/server/authority-work";
import { safeTextFields } from "@/lib/ai/safety";
import { learningGate, LearningAuthorizationError } from "@/lib/server/authorize";
import { aiMode, model } from "@/lib/ai/config";
import { cachedCourse, CourseRequest, writeCourse, type CourseEvent } from "@/lib/ai/build";
import { capMessage, meter, overSpend, spendGate } from "@/lib/server/budget";
import { limited } from "@/lib/server/rate";

export const maxDuration = 300;

function ndjson(events: (signal: AbortSignal) => AsyncIterable<CourseEvent> | Iterable<CourseEvent>, req: Request) {
  const enc = new TextEncoder();
  let work: Awaited<ReturnType<typeof startAuthorityWork>> | null = null;
  const body = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`));
      try {
        work = await startAuthorityWork(req);
        for await (const e of events(work.signal)) { await work.assert(); send(e); }
      } catch (err) {
        if (!req.signal.aborted) send({ type: "error", error: err instanceof LearningAuthorizationError ? "authority" : (err as Error).name === "AbortError" ? "aborted" : "model" });
      } finally { work?.close(); controller.close(); }
    },
    cancel(reason) { work?.abort(reason); work?.close(); },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}

// Streams one JSON event per line: steps, the outline, each lesson that passed the gates, skips, done.
// A course another family already got for the same request comes straight from the cache: no model
// call and nothing counted against the spend caps. Over a cap, the stream is one error event with the
// family's message (error "budget"); a course that reaches a cost cap partway stops the same way.
export async function POST(req: Request) {
  if (aiMode() === "demo") return Response.json({ error: "demo" }, { status: 503 });
  const denied = await learningGate(req, "generation");
  if (denied) return denied;
  if (limited(req, "course", 6)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = CourseRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!safeTextFields(parsed.data, parsed.data.locale)) return Response.json({ error: "topic" }, { status: 422 });
  const hit = cachedCourse(parsed.data);
  if (hit) return ndjson(() => hit, req);
  const capped = await spendGate(req, "course", parsed.data.locale);
  if (capped) return capped;
  const m = await model("build", meter(req));
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  // A file's name can hold a family name ("Ada's worksheet.pdf"). Only a browser that took those out
  // (aiFetch, which also sends the opaque ids) gets its file names to the writer; otherwise the
  // writer hears that a file of that kind was attached.
  const scrubbed = req.headers.has("x-kaizen-account") || req.headers.has("x-kaizen-learner");
  const course = scrubbed ? parsed.data : { ...parsed.data, sources: parsed.data.sources?.map((s) => ({ name: `a ${s.kind} file`, kind: s.kind })) };
  const spent = async () => {
    const scope = await overSpend(req);
    return scope && { scope, message: capMessage("course", scope, parsed.data.locale) };
  };
  return ndjson((signal) => writeCourse(course, m, signal, spent), req);
}
