import { connection } from "next/server";
import { readCapability } from "@/lib/server/capabilities";
import { json, withAccount } from "@/lib/server/db/http";

export async function GET(req: Request) {
  await connection();
  return withAccount(req, async ({ db, session }) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id || id.length > 100) return json({ error: "bad_request" }, { status: 400 });
    return json(await readCapability(db, session, id));
  });
}
