// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenFor, verifyToken } from "@/lib/email/server";
import type { WeeklyInput } from "@/lib/email/render";
import { GET, POST } from "./route";

vi.mock("next/server", () => ({ connection: async () => {} }));

const week: WeeklyInput = {
  locale: "en",
  weekStart: "2026-10-05",
  learners: [{ grade: "4", minutes: 22, lessons: 1, sets: 2, own: 7, helped: 1, missed: 1, proved: [], checksWaiting: [], helpOn: ["m.add.10"], overdue: [], stuck: [], tests: [] }],
};

let ip = 0;
const req = (body: unknown) =>
  new Request("https://kaizenedu.test/api/email/weekly", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
    body: JSON.stringify(body),
  });

let resend: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
let logs: string[] = [];

beforeEach(() => {
  resend = [];
  logs = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      resend.push({ url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
      return Response.json({ id: `email_${resend.length}` });
    }),
  );
  for (const level of ["info", "warn", "error"] as const) vi.spyOn(console, level).mockImplementation((line: string) => void logs.push(line));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("without RESEND_API_KEY", () => {
  it("reports preview mode and sends nothing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await (await GET()).json()).toEqual({ mode: "preview" });
    const res = await POST(req({ action: "confirm", to: "a@example.com", locale: "en" }));
    expect(res.status).toBe(503);
    expect(resend).toEqual([]);
  });
});

describe("with RESEND_API_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_0123456789abcdef");
    vi.stubEnv("VERCEL", "");
  });

  it("reports send mode", async () => {
    expect(await (await GET()).json()).toEqual({ mode: "send" });
  });

  it("on Vercel, stays in preview until KAIZEN_EMAIL=resend says the key is meant to send", async () => {
    vi.stubEnv("VERCEL", "1");
    expect(await (await GET()).json()).toEqual({ mode: "preview" });
    expect((await POST(req({ action: "confirm", to: "old-key@example.com", locale: "en" }))).status).toBe(503);
    expect(resend).toEqual([]);
    vi.stubEnv("KAIZEN_EMAIL", "resend");
    expect(await (await GET()).json()).toEqual({ mode: "send" });
  });

  it("emails a confirmation link whose token verifies for that address only", async () => {
    const res = await POST(req({ action: "confirm", to: " Maria@Example.com ", locale: "es" }));
    expect(await res.json()).toEqual({ ok: true });
    expect(resend).toHaveLength(1);
    const sent = resend[0];
    expect(sent.url).toBe("https://api.resend.com/emails");
    expect(sent.headers.get("authorization")).toBe("Bearer re_test_0123456789abcdef");
    expect(sent.body.to).toEqual(["maria@example.com"]);
    expect(sent.body.subject).toBe("Confirma el correo semanal de KaizenEDU");
    const token = String(sent.body.text).match(/\/settings#weekly=([A-Za-z0-9_-]+)$/m)![1];
    expect(await verifyToken("maria@example.com", token)).toBe(true);
    expect(await verifyToken("other@example.com", token)).toBe(false);
    expect(await (await POST(req({ action: "verify", to: "MARIA@example.com", token }))).json()).toEqual({ ok: true });
    expect(await (await POST(req({ action: "verify", to: "other@example.com", token }))).json()).toEqual({ ok: false });
  });

  it("won't email the same address a second link within 10 minutes", async () => {
    await POST(req({ action: "confirm", to: "twice@example.com", locale: "en" }));
    const again = await POST(req({ action: "confirm", to: "twice@example.com", locale: "en" }));
    expect(again.status).toBe(429);
    expect(resend).toHaveLength(1);
  });

  it("sends the weekly email only with a valid token, once per week", async () => {
    const to = "family@example.com";
    const bad = await POST(req({ action: "send", to, token: "x".repeat(43), week }));
    expect(bad.status).toBe(403);
    expect(resend).toEqual([]);

    const token = await tokenFor(to);
    expect(await (await POST(req({ action: "send", to, token, week }))).json()).toEqual({ ok: true });
    expect(resend).toHaveLength(1);
    expect(resend[0].body.to).toEqual([to]);
    expect(String(resend[0].body.subject)).toMatch(/^Your KaizenEDU week: Oct 5/);
    expect(String(resend[0].body.text)).toContain("Needed help with: Add within 10");
    expect(String(resend[0].body.text)).toContain("https://kaizenedu.test/family");
    expect(resend[0].headers.get("idempotency-key")).toMatch(/^weekly:[A-Za-z0-9_-]{16}:2026-10-05$/);
    expect(resend[0].headers.get("idempotency-key")).not.toContain("family@");

    expect(await (await POST(req({ action: "send", to, token, week }))).json()).toEqual({ ok: true, duplicate: true });
    expect(resend).toHaveLength(1);
  });

  it("uses APP_URL for links when it is set", async () => {
    vi.stubEnv("APP_URL", "https://kaizenedu.net/");
    const to = "app@example.com";
    await POST(req({ action: "send", to, token: await tokenFor(to), week: { ...week, weekStart: "2026-09-28" } }));
    expect(String(resend[0].body.text)).toContain("https://kaizenedu.net/family");
  });

  it("rejects malformed requests", async () => {
    const to = "x@example.com";
    const token = await tokenFor(to);
    const bad = [
      null,
      { action: "nope" },
      { action: "confirm", to: "not-an-email", locale: "en" },
      { action: "confirm", to, locale: "fr" },
      { action: "send", to, token, week: { ...week, learners: [] } },
      { action: "send", to, token, week: { ...week, weekStart: "next week" } },
      { action: "send", to, token, week: { ...week, learners: [{ ...week.learners[0], own: -1 }] } },
    ];
    for (const body of bad) expect((await POST(req(body))).status, JSON.stringify(body)).toBe(400);
    expect(resend).toEqual([]);
  });

  it("renders only from known fields: extra content a client adds is ignored", async () => {
    const to = "extra@example.com";
    const res = await POST(req({ action: "send", to, token: await tokenFor(to), html: "<b>spam</b>", week: { ...week, weekStart: "2026-09-07", subject: "Win a prize" } }));
    expect(res.status).toBe(200);
    expect(JSON.stringify(resend[0].body)).not.toMatch(/spam|prize/);
  });

  it("logs outcomes without the address or the content", async () => {
    const to = "private.parent@example.com";
    await POST(req({ action: "confirm", to, locale: "en" }));
    await POST(req({ action: "send", to, token: await tokenFor(to), week: { ...week, weekStart: "2026-09-21" } }));
    expect(logs.map((l) => JSON.parse(l).event)).toEqual(["email_confirm_sent", "email_weekly_sent"]);
    expect(logs.join("\n")).not.toMatch(/private\.parent|example\.com|Add within/);
  });

  it("says so when Resend refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));
    const to = "refused@example.com";
    const res = await POST(req({ action: "send", to, token: await tokenFor(to), week: { ...week, weekStart: "2026-09-14" } }));
    expect(res.status).toBe(502);
    expect(JSON.parse(logs[0])).toMatchObject({ level: "warn", event: "email_weekly_failed", status: 403 });
  });
});
