import { sttTokenResponse } from "@/lib/voice/server";

export const maxDuration = 10;

// A 30-second Deepgram token to open one listening stream. Refuses without a key, a page of ours, the
// voice pass, or a grown-up's consent for the microphone; budgets per address and per day.
export async function POST(req: Request) {
  return sttTokenResponse(req);
}
