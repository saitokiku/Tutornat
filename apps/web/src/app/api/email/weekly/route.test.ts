// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkCode, checkToken, CODE_HOURS, codeFor, issueToken, normCode, TOKEN_MAX_AGE_MS } from "@/lib/email/server";
import type { WeeklyInput } from "@/lib/email/render";
import { GET, POST } from "./route";

vi.mock("next/server", () => ({ connection: async () => {} }));

const H = 3600_000;
const D = 24 * H;
const week: WeeklyInput = {
  locale: "en",
  weekStart: "2026-10-05",
  learners: [{ grade: "4", minutes: 22, lessons: 1, sets: 2, own: 7, helped: 1, missed: 1, proved: [], checksWaiting: [], helpOn: ["m.add.10"], overdue: [], stuck: [], tests: [] }],
};

let ip = 0;
const req = (body: unknown, host = "kaizenedu.test") =>
  new Request(`https://${host}/api/email/weekly`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.${Math.floor(++ip / 250)}.${ip % 250}` },
    body: JSON.stringify(body),
  });
const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

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
    vi.stubEnv("APP_URL", "https://kaizenedu.net");
    expect(await json(await GET())).toEqual({ mode: "preview" });
    const res = await POST(req({ action: "confirm", to: "a@example.com", locale: "en" }));
    expect(res.status).toBe(503);
    expect(resend).toEqual([]);
  });
});

describe("with RESEND_API_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_0123456789abcdef");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("APP_URL", "https://kaizenedu.net/");
    vi.stubEnv("EMAIL_SECRET", "");
  });

  /** The code in a confirmation email, read the way a grown-up would: off the page. */
  const codeIn = (body: Record<string, unknown>) => String(body.text).match(/^([0-9A-Z]{4}-[0-9A-Z]{4})$/m)![1];
  async function confirmed(to: string) {
    await POST(req({ action: "confirm", to, locale: "en" }));
    const code = codeIn(resend.at(-1)!.body);
    const r = await json(await POST(req({ action: "verify", to, code })));
    return String(r.token);
  }

  it("reports send mode", async () => {
    expect(await json(await GET())).toEqual({ mode: "send" });
  });

  it("off Vercel, stays in preview without APP_URL: a request's Host can't be trusted for links", async () => {
    vi.stubEnv("APP_URL", "");
    expect(await json(await GET())).toEqual({ mode: "preview" });
    expect((await POST(req({ action: "confirm", to: "host@example.com", locale: "en" }, "evil.example"))).status).toBe(503);
    expect(resend).toEqual([]);
  });

  it("on Vercel, stays in preview until KAIZEN_EMAIL=resend says the key is meant to send, and links to the deployment", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_URL", "");
    expect(await json(await GET())).toEqual({ mode: "preview" });
    expect((await POST(req({ action: "confirm", to: "old-key@example.com", locale: "en" }))).status).toBe(503);
    expect(resend).toEqual([]);
    vi.stubEnv("KAIZEN_EMAIL", "resend");
    expect(await json(await GET())).toEqual({ mode: "send" });
    await POST(req({ action: "confirm", to: "vercel@example.com", locale: "en" }, "kaizenedu-preview.vercel.app"));
    expect(String(resend[0].body.text)).toContain("https://kaizenedu-preview.vercel.app/settings#weekly=");
  });

  it("emails a code (and a link carrying it) that verifies for that address only, in exchange for a send token", async () => {
    const res = await POST(req({ action: "confirm", to: " Maria@Example.com ", locale: "es" }, "evil.example"));
    expect(await json(res)).toEqual({ ok: true });
    expect(resend).toHaveLength(1);
    const sent = resend[0];
    expect(sent.url).toBe("https://api.resend.com/emails");
    expect(sent.headers.get("authorization")).toBe("Bearer re_test_0123456789abcdef");
    expect(sent.body.to).toEqual(["maria@example.com"]);
    expect(sent.body.subject).toBe("Confirma el correo semanal de KaizenEDU");
    const code = codeIn(sent.body);
    // The link uses APP_URL, never the request's Host.
    expect(String(sent.body.text)).toContain(`https://kaizenedu.net/settings#weekly=${code.replace("-", "")}`);
    expect(String(sent.body.text)).not.toContain("evil.example");
    expect(String(sent.body.html)).toContain(code);

    expect(await json(await POST(req({ action: "verify", to: "other@example.com", code })))).toEqual({ ok: false });
    const ok = await json(await POST(req({ action: "verify", to: "MARIA@example.com", code: code.toLowerCase() })));
    expect(ok.ok).toBe(true);
    expect(String(ok.token)).toMatch(/^w2\.[0-9a-z]+\.[A-Za-z0-9_-]{43}$/);
    expect((await checkToken("maria@example.com", String(ok.token), Date.now())).ok).toBe(true);
    expect((await checkToken("other@example.com", String(ok.token), Date.now())).ok).toBe(false);
  });

  it("won't email the same address a second code within 10 minutes, unless the first never went out", async () => {
    await POST(req({ action: "confirm", to: "twice@example.com", locale: "en" }));
    const again = await POST(req({ action: "confirm", to: "twice@example.com", locale: "en" }));
    expect(again.status).toBe(429);
    expect(resend).toHaveLength(1);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    expect((await POST(req({ action: "confirm", to: "flaky@example.com", locale: "en" }))).status).toBe(502);
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => (resend.push({ url, headers: new Headers(init.headers), body: JSON.parse(String(init.body)) }), Response.json({ id: "x" }))));
    expect(await json(await POST(req({ action: "confirm", to: "flaky@example.com", locale: "en" })))).toEqual({ ok: true });
  });

  it("sends the weekly email only with a valid token, once per week", async () => {
    const to = "family@example.com";
    for (const token of ["x".repeat(43), "t".repeat(43) /* the old unversioned shape */, await issueToken("someone-else@example.com", Date.now())]) {
      expect((await POST(req({ action: "send", to, token, week }))).status).toBe(403);
    }
    expect(resend).toEqual([]);

    const token = await confirmed(to);
    resend = [];
    expect(await json(await POST(req({ action: "send", to, token, week })))).toEqual({ ok: true });
    expect(resend).toHaveLength(1);
    expect(resend[0].body.to).toEqual([to]);
    expect(String(resend[0].body.subject)).toMatch(/^Your KaizenEDU week: Oct 5/);
    expect(String(resend[0].body.text)).toContain("Needed help with: Add within 10");
    expect(String(resend[0].body.text)).toContain("https://kaizenedu.net/family");
    expect(resend[0].headers.get("idempotency-key")).toMatch(/^weekly:[A-Za-z0-9_-]{16}:2026-10-05$/);
    expect(resend[0].headers.get("idempotency-key")).not.toContain("family@");

    expect(await json(await POST(req({ action: "send", to, token, week })))).toEqual({ ok: true, duplicate: true });
    expect(resend).toHaveLength(1);
  });

  it("refuses a token past its age, and hands back a fresh one for a token over a week old", async () => {
    const to = "aging@example.com";
    const stale = await issueToken(to, Date.now() - TOKEN_MAX_AGE_MS - D);
    expect((await POST(req({ action: "send", to, token: stale, week }))).status).toBe(403);

    const young = await issueToken(to, Date.now() - D);
    expect(await json(await POST(req({ action: "send", to, token: young, week: { ...week, weekStart: "2026-08-31" } })))).toEqual({ ok: true });

    const old = await issueToken(to, Date.now() - 8 * D);
    const r = await json(await POST(req({ action: "send", to, token: old, week: { ...week, weekStart: "2026-08-24" } })));
    expect(r.ok).toBe(true);
    expect((await checkToken(to, String(r.token), Date.now())).renew).toBe(false);
  });

  it("changing EMAIL_SECRET ends every token without touching the Resend key", async () => {
    const to = "rotate@example.com";
    const token = await confirmed(to);
    vi.stubEnv("EMAIL_SECRET", "a-new-secret-0123456789");
    expect((await POST(req({ action: "send", to, token, week: { ...week, weekStart: "2026-08-17" } }))).status).toBe(403);
  });

  it("rejects malformed requests", async () => {
    const to = "x@example.com";
    const token = await issueToken(to, Date.now());
    const bad = [
      null,
      { action: "nope" },
      { action: "confirm", to: "not-an-email", locale: "en" },
      { action: "confirm", to, locale: "fr" },
      { action: "verify", to, token },
      { action: "send", to, token, week: { ...week, learners: [] } },
      { action: "send", to, token, week: { ...week, weekStart: "next week" } },
      { action: "send", to, token, week: { ...week, learners: [{ ...week.learners[0], own: -1 }] } },
    ];
    for (const body of bad) expect((await POST(req(body))).status, JSON.stringify(body)).toBe(400);
    expect(resend).toEqual([]);
  });

  it("renders only from known fields: extra content a client adds is ignored", async () => {
    const to = "extra@example.com";
    const res = await POST(req({ action: "send", to, token: await issueToken(to, Date.now()), html: "<b>spam</b>", week: { ...week, weekStart: "2026-09-07", subject: "Win a prize" } }));
    expect(res.status).toBe(200);
    expect(JSON.stringify(resend[0].body)).not.toMatch(/spam|prize/);
  });

  it("logs outcomes without the address, the code or the content", async () => {
    const to = "private.parent@example.com";
    const token = await confirmed(to);
    await POST(req({ action: "send", to, token, week: { ...week, weekStart: "2026-09-21" } }));
    expect(logs.map((l) => JSON.parse(l).event)).toEqual(["email_confirm_sent", "email_weekly_sent"]);
    expect(logs.join("\n")).not.toMatch(/private\.parent|example\.com|Add within|w2\./);
  });

  it("says so when Resend refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));
    const to = "refused@example.com";
    const res = await POST(req({ action: "send", to, token: await issueToken(to, Date.now()), week: { ...week, weekStart: "2026-09-14" } }));
    expect(res.status).toBe(502);
    expect(JSON.parse(logs[0])).toMatchObject({ level: "warn", event: "email_weekly_failed", status: 403 });
  });
});

describe("codes and tokens", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_0123456789abcdef");
    vi.stubEnv("EMAIL_SECRET", "");
  });

  it("a code is 8 unambiguous characters, forgiving of case, dashes and O/0, I/1 mix-ups", async () => {
    const code = await codeFor("a@example.com", Date.UTC(2026, 9, 7, 10));
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(normCode(` ${code.slice(0, 4).toLowerCase()}-${code.slice(4)} `)).toBe(code);
    expect(normCode("OIL0-ABCD")).toBe("0110ABCD");
    expect(normCode("ABCU-ABCD")).toBeNull();
    expect(normCode("ABC")).toBeNull();
  });

  it(`a code works for ${CODE_HOURS} hours, for its own address only`, async () => {
    const now = Date.UTC(2026, 9, 7, 10, 30);
    const code = await codeFor("a@example.com", now - (CODE_HOURS - 1) * H);
    expect(await checkCode("A@example.com ", code, now)).toBe(true);
    expect(await checkCode("b@example.com", code, now)).toBe(false);
    expect(await checkCode("a@example.com", await codeFor("a@example.com", now - (CODE_HOURS + 1) * H), now)).toBe(false);
    expect(await checkCode("a@example.com", "not a code", now)).toBe(false);
  });

  it("a token proves its address and age; one from the future is refused", async () => {
    const now = Date.UTC(2026, 9, 7, 10);
    const token = await issueToken("a@example.com", now);
    expect(await checkToken("a@example.com", token, now)).toEqual({ ok: true, renew: false });
    expect(await checkToken("a@example.com", token, now + 8 * D)).toEqual({ ok: true, renew: true });
    expect(await checkToken("a@example.com", token, now + TOKEN_MAX_AGE_MS + 1)).toEqual({ ok: false, renew: false });
    expect(await checkToken("a@example.com", await issueToken("a@example.com", now + D), now)).toEqual({ ok: false, renew: false });
    // Changing the issue time breaks the mac.
    const [v, , mac] = token.split(".");
    expect((await checkToken("a@example.com", `${v}.${Math.floor((now + 1000) / 1000).toString(36)}.${mac}`, now + 2000)).ok).toBe(false);
  });
});
