import { model } from "@/lib/ai/config";
import { ExtractRequest, readSchoolDocument } from "@/lib/ai/build";
import { limited } from "@/lib/server/rate";

export const maxDuration = 120;

export async function POST(req: Request) {
  const m = await model("build");
  if (!m) return Response.json({ error: "demo" }, { status: 503 });
  if (limited(req, "extract", 10)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = ExtractRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.text && !parsed.data.file)) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json(await readSchoolDocument(parsed.data, m));
  } catch {
    return Response.json({ error: "model" }, { status: 502 });
  }
}
