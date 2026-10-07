import { connection } from "next/server";
import { z } from "zod";
import { renderConfirm, renderWeekly, WeeklyInput } from "@/lib/email/render";
import { addressTag, appOrigin, checkCode, checkToken, codeFor, emailConfigured, issueToken, sendEmail } from "@/lib/email/server";
import { log } from "@/lib/server/log";
import { limited } from "@/lib/server/rate";

// The weekly family email. GET says whether this site can send (Resend configured) or only preview.
// POST actions:
//   confirm  email a confirmation code (and a link carrying it) to an address: double opt-in
//   verify   exchange a code from that email for a send token
//   send     render and send one week's email, only to an address whose token checks out; a token
//            more than a week old comes back replaced
// Nothing is stored here and no address or content is logged.

export const maxDuration = 20;

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const token = z.string().min(20).max(120);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), to: email, locale: z.enum(["en", "es"]) }),
  z.object({ action: z.literal("verify"), to: email, code: z.string().min(8).max(12) }),
  z.object({ action: z.literal("send"), to: email, token, week: WeeklyInput }),
]);

// ponytail: in-memory per instance, like lib/server/rate.ts; a shared store once there is traffic.
const lastConfirm = new Map<string, number>();
const sentWeeks = new Set<string>();
const CONFIRM_GAP_MS = 10 * 60_000;

export async function GET() {
  await connection();
  return Response.json({ mode: emailConfigured() ? "send" : "preview" }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const origin = appOrigin(req);
  if (!emailConfigured() || !origin) return Response.json({ error: "preview" }, { status: 503 });
  if (limited(req, "email", 6)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;
  const tag = await addressTag(body.to);
  const now = Date.now();

  if (body.action === "verify") {
    if (!(await checkCode(body.to, body.code, now))) return Response.json({ ok: false });
    return Response.json({ ok: true, token: await issueToken(body.to, now) });
  }

  if (body.action === "confirm") {
    if (now - (lastConfirm.get(tag) ?? 0) < CONFIRM_GAP_MS) return Response.json({ error: "rate" }, { status: 429 });
    lastConfirm.set(tag, now); // held while sending, so a double click sends one email
    if (lastConfirm.size > 5000) lastConfirm.clear();
    const code = await codeFor(body.to, now);
    // In the fragment, so the code never reaches a server log or a Referer header.
    const sent = await sendEmail(body.to, renderConfirm(body.locale, `${origin}/settings#weekly=${code}`, code), `confirm:${tag}:${Math.floor(now / CONFIRM_GAP_MS)}`);
    if (!sent.ok) lastConfirm.delete(tag); // nothing went out: "send again" must work at once
    log(sent.ok ? "info" : "warn", sent.ok ? "email_confirm_sent" : "email_confirm_failed", sent.ok ? {} : { status: sent.status });
    return sent.ok ? Response.json({ ok: true }) : Response.json({ error: "send_failed" }, { status: 502 });
  }

  const check = await checkToken(body.to, body.token, now);
  if (!check.ok) return Response.json({ error: "unconfirmed" }, { status: 403 });
  const fresh = check.renew ? { token: await issueToken(body.to, now) } : {};
  const key = `weekly:${tag}:${body.week.weekStart}`;
  if (sentWeeks.has(key)) return Response.json({ ok: true, duplicate: true, ...fresh });
  const sent = await sendEmail(body.to, renderWeekly(body.week, origin), key);
  if (sent.ok) {
    sentWeeks.add(key);
    if (sentWeeks.size > 20_000) sentWeeks.clear();
  }
  log(sent.ok ? "info" : "warn", sent.ok ? "email_weekly_sent" : "email_weekly_failed", { learners: body.week.learners.length, locale: body.week.locale, ...(sent.ok ? {} : { status: sent.status }) });
  return sent.ok ? Response.json({ ok: true, ...fresh }) : Response.json({ error: "send_failed" }, { status: 502 });
}
