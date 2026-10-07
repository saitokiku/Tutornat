import { connection } from "next/server";
import { serverMode } from "@/lib/server/db/client";
import { emailConfigured } from "@/lib/server/db/email";
import { json } from "@/lib/server/db/http";

// Whether this deployment keeps families on the server (DATABASE_URL set) or in the browser only.
// Read at request time, so connecting a database takes effect without a rebuild.
export async function GET() {
  await connection();
  return json({
    mode: serverMode() ? "server" : "local",
    resetEmail: emailConfigured(),
    production: process.env.NODE_ENV === "production",
  });
}
