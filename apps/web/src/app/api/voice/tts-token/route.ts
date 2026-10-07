import { ttsTokenResponse } from "@/lib/voice/server";

export const maxDuration = 10;

// A single-use ElevenLabs token for one read-aloud stream. Refuses without a key, a page of ours, the
// voice pass, or (under 13) a grown-up's consent; budgets per address and per day.
export async function POST(req: Request) {
  return ttsTokenResponse(req);
}
