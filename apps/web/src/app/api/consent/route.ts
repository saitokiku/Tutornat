import { connection } from "next/server";
import { z } from "zod";
import { grantConsent, listReceipts, methodsFor } from "@/lib/server/db/consent";
import { authFailure, clientIp, json, readJson, withAccount } from "@/lib/server/db/http";
import { CONSENT_NOTICE_VERSION, CONSENT_SCOPES } from "@/lib/server/db/policy";

/** The account's consent receipts and the ways consent can be given on this deployment. */
export async function GET(req: Request) {
  await connection();
  return withAccount(req, async ({ db, accountId }) =>
    json({
      receipts: await listReceipts(db, accountId),
      methods: methodsFor().map((m) => ({ id: m.id, verified: m.verified, forUnder13: m.forUnder13 })),
      noticeVersion: CONSENT_NOTICE_VERSION,
    }),
  );
}

const Body = z.object({
  profileId: z.string().min(1).max(100),
  scope: z.array(z.enum(CONSENT_SCOPES)).min(1).max(CONSENT_SCOPES.length),
  method: z.string().min(1).max(60),
  under13: z.boolean(),
  noticeVersion: z.string().min(1).max(60),
  /** The account password: only the account holder gives consent, whoever has the device. */
  password: z.string().min(1).max(1000),
  /** What a vendor's own flow handed back, for a verified method to confirm (consent.ts). */
  proof: z.string().max(500).optional(),
});

/** A grown-up gives consent for one learner. Answers the receipt and every receipt on the account. */
export async function POST(req: Request) {
  return withAccount(req, async ({ db, accountId }) => {
    const body = await readJson(req, Body);
    if (body instanceof Response) return body;
    const r = await grantConsent(db, accountId, body, { ip: clientIp(req) });
    if (!r.ok) return r.error === "rate" ? authFailure(r) : json({ error: r.error }, { status: r.error === "learner" ? 404 : r.error === "password" ? 403 : 400 });
    return json({ receipt: r.receipt, receipts: await listReceipts(db, accountId) });
  });
}
