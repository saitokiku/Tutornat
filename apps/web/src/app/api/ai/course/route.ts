import { model } from "@/lib/ai/config";
import { cachedCourse, CourseRequest, writeCourse, type CourseEvent } from "@/lib/ai/build";
import { screen } from "@/lib/ai/safety";
import { capMessage, meter, overSpend, spendGate } from "@/lib/server/budget";
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
// call and nothing counted against the spend caps. Over a cap, the stream is one error event with the
// family's message (error "budget"); a course that reaches a cost cap partway stops the same way.
// A goal the safety screen stops is one error event (error "safety") with the tutor's fixed reply.
export async function POST(req: Request) {
  const m = await model("build", meter(req));
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "course", 6)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = CourseRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  // The safety screen reads the learner's goal before anything else, as in the tutor: no model call,
  // no shared course and nothing counted against the caps. The browser screens it too (Draft.tsx).
  const said = screen(parsed.data.goal, parsed.data.locale);
  if (said.kind !== "ok") return ndjson([{ type: "error", error: "safety", flag: said.kind, message: said.reply }], req.signal);
  const hit = cachedCourse(parsed.data);
  if (hit) return ndjson(hit, req.signal);
  const capped = await spendGate(req, "course", parsed.data.locale);
  if (capped) return capped;
  // A file's name can hold a family name ("Ada's worksheet.pdf"). Only a browser that took those out
  // (aiFetch, which also sends the opaque ids) gets its file names to the writer; otherwise the
  // writer hears that a file of that kind was attached.
  const scrubbed = req.headers.has("x-kaizen-account") || req.headers.has("x-kaizen-learner");
  const course = scrubbed ? parsed.data : { ...parsed.data, sources: parsed.data.sources?.map((s) => ({ name: `a ${s.kind} file`, kind: s.kind })) };
  const spent = () => {
    const scope = overSpend(req);
    return scope && { scope, message: capMessage("course", scope, parsed.data.locale) };
  };
  return ndjson(writeCourse(course, m, req.signal, spent), req.signal);
}
