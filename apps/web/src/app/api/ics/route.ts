import { FeedError, fetchFeed } from "@/lib/server/safe-fetch";
import { limited } from "@/lib/server/rate";

// Reads a school calendar feed (Google Classroom / Google Calendar secret address, Canvas, Schoology)
// for the browser, which can't fetch other sites directly. Returns the .ics text; parsing happens in
// the browser so the family reviews every item before anything is saved.
//
// The guard lives in lib/server/safe-fetch.ts: https (or webcal) only, no credentials or odd ports,
// every hop's address checked against private ranges, redirects followed by hand (at most 4), a 2 MB
// cap read as a stream, a 10 s timeout, and the body must be an iCalendar document. Here: JSON
// requests only (a cross-site form can't send one without a CORS preflight), a small request body, a
// per-address rate limit, and the answer served as an inert calendar download that is never cached.

const MAX_REQUEST = 4096;

export async function POST(req: Request) {
  if (!/^application\/json\b/i.test(req.headers.get("content-type") ?? "")) return Response.json({ error: "url" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST) return Response.json({ error: "url" }, { status: 413 });
  if (limited(req, "ics", 20)) return Response.json({ error: "rate" }, { status: 429 });
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_REQUEST) return Response.json({ error: "url" }, { status: 413 });
  let body: { url?: unknown } | null = null;
  try {
    body = JSON.parse(raw);
  } catch {}
  if (!body || typeof body.url !== "string" || !body.url.trim() || body.url.length > 2000) return Response.json({ error: "url" }, { status: 400 });
  try {
    const text = await fetchFeed(body.url);
    return new Response(text, {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="calendar.ics"',
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    const code = e instanceof FeedError ? e.code : "status";
    return Response.json({ error: code }, { status: code === "url" || code === "blocked" ? 400 : 502 });
  }
}
