import { FeedError, fetchFeed } from "@/lib/server/safe-fetch";

// Reads a school calendar feed (Google Classroom / Google Calendar secret address, Canvas, Schoology)
// for the browser, which can't fetch other sites directly. Returns the .ics text; parsing happens in
// the browser so the family reviews every item before anything is saved.

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  if (!body || typeof body.url !== "string" || body.url.length > 2000) return Response.json({ error: "url" }, { status: 400 });
  try {
    const text = await fetchFeed(body.url);
    return new Response(text, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" } });
  } catch (e) {
    const code = e instanceof FeedError ? e.code : "status";
    return Response.json({ error: code }, { status: code === "url" || code === "blocked" ? 400 : 502 });
  }
}
