import { learningGate } from "@/lib/server/authorize";
import { connection } from "next/server";
import { aiMode } from "@/lib/ai/config";
import { overCap } from "@/lib/server/budget";

// Which AI this deployment runs, read at request time so a new key takes effect without a rebuild,
// and whether the learner asking (lib/ai/client.ts aiHeaders) has reached a spend cap: "day",
// "month" or null. Demo deployments have no caps.
export async function GET(req: Request) {
  await connection();
  const mode = aiMode();
  if (mode !== "demo") { const denied = await learningGate(req, "tutor"); if (denied) return denied; }
  return Response.json({ mode, budget: mode === "demo" ? null : await overCap(req) }, { headers: { "cache-control": "no-store" } });
}
