import { connection } from "next/server";
import { z } from "zod";
import { renderConfirm, renderWeekly, WeeklyInput } from "@/lib/email/render";
import { addressTag, emailConfigured, sendEmail, tokenFor, verifyToken } from "@/lib/email/server";
import { log } from "@/lib/server/log";
import { limited } from "@/lib/server/rate";

// The weekly family email. GET says whether this site can send (Resend configured) or only preview.
// POST actions:
//   confirm  email the confirmation link to an address (double opt-in; the address must click it)
//   verify   check a token from that link
//   send     render and send one week's email, only to an address whose token checks out
// Nothing is stored here and no address or content is logged.

export const maxDuration = 20;

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm"), to: email, locale: z.enum(["en", "es"]) }),
  z.object({ action: z.literal("verify"), to: email, token: z.string().min(20).max(100) }),
  z.object({ action: z.literal("send"), to: email, token: z.string().min(20).max(100), week: WeeklyInput }),
]);

// ponytail: in-memory per instance, like lib/server/rate.ts; a shared store once there is traffic.
const lastConfirm = new Map<string, number>();
const sentWeeks = new Set<string>();
const CONFIRM_GAP_MS = 10 * 60_000;

const origin = (req: Request) => process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;

export async function GET() {
  await connection();
  return Response.json({ mode: emailConfigured() ? "send" : "preview" }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  if (!emailConfigured()) return Response.json({ error: "preview" }, { status: 503 });
  if (limited(req, "email", 6)) return Response.json({ error: "rate" }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const body = parsed.data;
  const tag = await addressTag(body.to);

  if (body.action === "verify") return Response.json({ ok: await verifyToken(body.to, body.token) });

  if (body.action === "confirm") {
    const now = Date.now();
    if (now - (lastConfirm.get(tag) ?? 0) < CONFIRM_GAP_MS) return Response.json({ error: "rate" }, { status: 429 });
    lastConfirm.set(tag, now);
    if (lastConfirm.size > 5000) lastConfirm.clear();
    // In the fragment, so the token never reaches a server log or a Referer header.
    const link = `${origin(req)}/settings#weekly=${await tokenFor(body.to)}`;
    const sent = await sendEmail(body.to, renderConfirm(body.locale, link), `confirm:${tag}:${Math.floor(now / CONFIRM_GAP_MS)}`);
    log(sent.ok ? "info" : "warn", sent.ok ? "email_confirm_sent" : "email_confirm_failed", sent.ok ? {} : { status: sent.status });
    return sent.ok ? Response.json({ ok: true }) : Response.json({ error: "send_failed" }, { status: 502 });
  }

  if (!(await verifyToken(body.to, body.token))) return Response.json({ error: "unconfirmed" }, { status: 403 });
  const key = `weekly:${tag}:${body.week.weekStart}`;
  if (sentWeeks.has(key)) return Response.json({ ok: true, duplicate: true });
  const sent = await sendEmail(body.to, renderWeekly(body.week, origin(req)), key);
  if (sent.ok) {
    sentWeeks.add(key);
    if (sentWeeks.size > 20_000) sentWeeks.clear();
  }
  log(sent.ok ? "info" : "warn", sent.ok ? "email_weekly_sent" : "email_weekly_failed", { learners: body.week.learners.length, locale: body.week.locale, ...(sent.ok ? {} : { status: sent.status }) });
  return sent.ok ? Response.json({ ok: true }) : Response.json({ error: "send_failed" }, { status: 502 });
}
