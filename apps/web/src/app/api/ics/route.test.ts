// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// The route end to end with the real guard (lib/server/safe-fetch.ts); only the network is faked:
// fetch, and the DNS answers for host names (IP literals never reach a lookup).
const dns = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ ...dns, default: dns }));
type Answer = { address: string; family?: number }[];
const resolves = (table: Record<string, Answer>) =>
  dns.lookup.mockImplementation(async (host: string) => {
    if (table[host]) return table[host];
    throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: "ENOTFOUND" });
  });
beforeEach(() => {
  dns.lookup.mockReset();
});

const CAL = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:1\r\nDTSTART;VALUE=DATE:20261021\r\nSUMMARY:Unit 3 Test\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
let ip = 0;
/** A fresh caller address per request, so the rate limit only applies where a test wants it. */
const call = (body: unknown, init: { type?: string; from?: string } = {}) =>
  POST(
    new Request("http://localhost/api/ics", {
      method: "POST",
      headers: { "content-type": init.type ?? "application/json", "x-forwarded-for": init.from ?? `203.0.113.${++ip % 250}` },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const upstream = (impl: (url: string, init: RequestInit) => Promise<Response>) => {
  const f = vi.fn(impl);
  vi.stubGlobal("fetch", f);
  return f;
};

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/ics", () => {
  it("returns the calendar as an inert, uncached download", async () => {
    const f = upstream(async () => new Response(CAL, { headers: { "content-type": "text/calendar" } }));
    const res = await call({ url: "webcal://8.8.8.8/class.ics" });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(CAL);
    expect(res.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-disposition")).toMatch(/^attachment/);
    // webcal:// is read over https, without following redirects automatically.
    expect(String(f.mock.calls[0][0])).toBe("https://8.8.8.8/class.ics");
    expect(f.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  it("only takes JSON with a usable url", async () => {
    upstream(async () => new Response(CAL));
    expect((await call({ url: "https://8.8.8.8/a.ics" }, { type: "text/plain" })).status).toBe(415);
    expect((await call("{not json")).status).toBe(400);
    expect((await call({ url: 42 })).status).toBe(400);
    expect((await call({ url: "  " })).status).toBe(400);
    expect((await call({ url: `https://8.8.8.8/${"a".repeat(2001)}` })).status).toBe(400);
    expect((await call({ url: `https://8.8.8.8/${"a".repeat(5000)}` })).status).toBe(413);
    expect(await (await call({})).json()).toEqual({ error: "url" });
  });

  it("refuses plain http, credentials, odd ports and non-web schemes", async () => {
    const f = upstream(async () => new Response(CAL));
    for (const url of ["http://8.8.8.8/a.ics", "https://user:pw@8.8.8.8/a.ics", "https://8.8.8.8:8443/a.ics", "file:///etc/passwd", "javascript:alert(1)"]) {
      const res = await call({ url });
      expect(res.status, url).toBe(400);
      expect(await res.json(), url).toEqual({ error: "url" });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses private and local addresses before any request", async () => {
    const f = upstream(async () => new Response(CAL));
    for (const url of ["https://127.0.0.1/a.ics", "https://10.0.0.5/a.ics", "https://169.254.169.254/latest/meta-data", "https://[::1]/a.ics", "https://localhost/a.ics", "https://printer.local/a.ics"]) {
      const res = await call({ url });
      expect(res.status, url).toBe(400);
      expect(await res.json(), url).toEqual({ error: "blocked" });
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("looks a host name up and refuses it when any address is private, before any request", async () => {
    const f = upstream(async () => new Response(CAL));
    const private_: Record<string, Answer> = {
      "loopback.example": [{ address: "127.0.0.1" }],
      "metadata.example": [{ address: "169.254.169.254" }],
      "mixed.example": [{ address: "8.8.8.8" }, { address: "10.0.0.1" }],
      "empty.example": [],
      "v6.example": [{ address: "::1", family: 6 }],
      "ula.example": [{ address: "fd12:3456::1", family: 6 }],
      "mapped.example": [{ address: "::ffff:192.168.1.1", family: 6 }],
    };
    resolves(private_);
    for (const host of [...Object.keys(private_), "nowhere.example"]) {
      const res = await call({ url: `https://${host}/class.ics` });
      expect(res.status, host).toBe(400);
      expect(await res.json(), host).toEqual({ error: "blocked" });
    }
    expect(dns.lookup).toHaveBeenCalledWith("mixed.example", { all: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("lets a host name through when every address is public", async () => {
    resolves({ "calendar.school.example": [{ address: "8.8.8.8" }, { address: "2607:f8b0:4004:800::200e", family: 6 }] });
    const f = upstream(async () => new Response(CAL));
    const res = await call({ url: "webcal://calendar.school.example/class.ics" });
    expect(res.status).toBe(200);
    expect(String(f.mock.calls[0][0])).toBe("https://calendar.school.example/class.ics");
  });

  it("looks up the host of every redirect hop: a public feed can't bounce to a name that points inside", async () => {
    resolves({ "calendar.school.example": [{ address: "8.8.8.8" }], "intranet.example": [{ address: "10.1.2.3" }] });
    const f = upstream(async () => new Response(null, { status: 302, headers: { location: "https://intranet.example/admin.ics" } }));
    const res = await call({ url: "https://calendar.school.example/a.ics" });
    expect(await res.json()).toEqual({ error: "blocked" });
    expect(f).toHaveBeenCalledTimes(1);
    expect(dns.lookup).toHaveBeenLastCalledWith("intranet.example", { all: true });
  });

  it("checks every redirect hop: a public feed can't bounce to a private address", async () => {
    const f = upstream(async (url) => (url.toString().includes("8.8.8.8") ? new Response(null, { status: 302, headers: { location: "https://192.168.1.1/admin" } }) : new Response(CAL)));
    const res = await call({ url: "https://8.8.8.8/a.ics" });
    expect(await res.json()).toEqual({ error: "blocked" });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("follows a few public redirects, then gives up", async () => {
    upstream(async (url) => {
      const n = Number(new URL(url.toString()).pathname.slice(1));
      return n < 2 ? new Response(null, { status: 301, headers: { location: `https://8.8.4.4/${n + 1}` } }) : new Response(CAL);
    });
    expect((await call({ url: "https://8.8.8.8/0" })).status).toBe(200);
    upstream(async () => new Response(null, { status: 302, headers: { location: "https://8.8.4.4/again" } }));
    expect(await (await call({ url: "https://8.8.8.8/loop" })).json()).toEqual({ error: "status" });
  });

  it("caps the size while reading, and rejects what isn't a calendar", async () => {
    const big = new ReadableStream({
      pull(c) {
        c.enqueue(new TextEncoder().encode(`BEGIN:VCALENDAR\r\n${"X".repeat(500_000)}`));
      },
    });
    upstream(async () => new Response(big));
    const res = await call({ url: "https://8.8.8.8/huge.ics" });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "size" });
    upstream(async () => new Response("<!doctype html><title>Sign in</title>", { headers: { "content-type": "text/html" } }));
    expect(await (await call({ url: "https://8.8.8.8/login" })).json()).toEqual({ error: "format" });
  });

  it("reports a feed that times out, errors or can't be reached", async () => {
    upstream(async () => Promise.reject(Object.assign(new Error("slow"), { name: "TimeoutError" })));
    expect(await (await call({ url: "https://8.8.8.8/a.ics" })).json()).toEqual({ error: "timeout" });
    upstream(async () => new Response("nope", { status: 404 }));
    expect(await (await call({ url: "https://8.8.8.8/a.ics" })).json()).toEqual({ error: "status" });
    upstream(async () => Promise.reject(new TypeError("fetch failed")));
    const res = await call({ url: "https://8.8.8.8/a.ics" });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "status" });
  });

  it("reports a timeout that lands while the calendar is still arriving as a timeout", async () => {
    for (const name of ["TimeoutError", "AbortError"]) {
      upstream(
        async () =>
          new Response(
            new ReadableStream({
              start(c) {
                c.enqueue(new TextEncoder().encode("BEGIN:VCALENDAR\r\n"));
                c.error(new DOMException("The operation was aborted due to timeout", name));
              },
            }),
          ),
      );
      const res = await call({ url: "https://8.8.8.8/slow.ics" });
      expect(res.status, name).toBe(502);
      expect(await res.json(), name).toEqual({ error: "timeout" });
    }
  });

  it("passes a timeout signal to the request", async () => {
    const f = upstream(async () => new Response(CAL));
    await call({ url: "https://8.8.8.8/a.ics" });
    expect(f.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("limits how often one address can ask", async () => {
    upstream(async () => new Response(CAL));
    const codes: number[] = [];
    for (let i = 0; i < 21; i++) codes.push((await call({ url: "https://8.8.8.8/a.ics" }, { from: "198.51.100.7" })).status);
    expect(codes.slice(0, 20).every((c) => c === 200)).toBe(true);
    expect(codes[20]).toBe(429);
  });
});
