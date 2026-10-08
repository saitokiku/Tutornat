import { voiceMetricResponse } from "@/lib/voice/server";

export const maxDuration = 5;

// One voice turn's latency numbers (no text, no names), logged as one JSON line for the §2.3 gates.
export async function POST(req: Request) {
  return voiceMetricResponse(req);
}
