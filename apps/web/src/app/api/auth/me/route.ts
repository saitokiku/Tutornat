import { connection } from "next/server";
import { accountById } from "@/lib/server/db/auth";
import { json, withAccount } from "@/lib/server/db/http";

/** The signed-in account, so a browser whose saved data was cleared can pick its family back up. */
export async function GET(req: Request) {
  await connection();
  return withAccount(req, async ({ db, accountId }) => {
    const account = await accountById(db, accountId);
    return account ? json({ account }) : json({ error: "signed_out" }, { status: 401 });
  });
}
