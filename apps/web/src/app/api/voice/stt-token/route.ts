import { sttTokenResponse } from "@/lib/voice/server";

export const maxDuration = 10;

// A 30-second Deepgram token to open one listening stream. Refuses without a key or the consent flag.
export async function POST(req: Request) {
  return sttTokenResponse(req);
}
