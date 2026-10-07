import { connection } from "next/server";
import { voiceStatusResponse } from "@/lib/voice/server";

// Which voice vendors this deployment has, read at request time so a new key takes effect without a
// rebuild. Also sets the voice pass cookie the token routes ask for.
export async function GET(req: Request) {
  await connection();
  return voiceStatusResponse(req);
}
