import { connection } from "next/server";
import { aiMode } from "@/lib/ai/config";

// Which AI this deployment runs, read at request time so a new key takes effect without a rebuild.
export async function GET() {
  await connection();
  return Response.json({ mode: aiMode() }, { headers: { "cache-control": "no-store" } });
}
