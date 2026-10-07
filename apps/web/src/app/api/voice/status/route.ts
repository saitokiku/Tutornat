import { connection } from "next/server";
import { voiceStatusResponse } from "@/lib/voice/server";

// Which voice vendors this deployment has, read at request time so a new key takes effect without a rebuild.
export async function GET() {
  await connection();
  return voiceStatusResponse();
}
