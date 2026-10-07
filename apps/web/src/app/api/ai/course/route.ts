import { model } from "@/lib/ai/config";
import { CourseRequest, writeCourse } from "@/lib/ai/build";
import { limited } from "@/lib/server/rate";

export const maxDuration = 300;

// Streams one JSON event per line: steps, the outline, each lesson that passed the gates, skips, done.
export async function POST(req: Request) {
  const m = await model("build");
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "course", 6)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = CourseRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (e: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`));
      try {
        for await (const e of writeCourse(parsed.data, m, req.signal)) send(e);
      } catch (err) {
        if (!req.signal.aborted) send({ type: "error", error: (err as Error).name === "AbortError" ? "aborted" : "model" });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
