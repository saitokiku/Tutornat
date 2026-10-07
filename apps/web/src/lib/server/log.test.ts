import { afterEach, describe, expect, it, vi } from "vitest";
import { log, logRequestError, scrub, scrubPath, scrubText } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("scrubText", () => {
  it("masks emails but keeps the domain for debugging", () => {
    expect(scrubText("send failed for maria.lopez+kids@example.com today")).toBe("send failed for [email example.com] today");
    expect(scrubText("A@B.CO and x_y@mail.school.k12.us")).toBe("[email B.CO] and [email mail.school.k12.us]");
  });

  it("masks phone and card numbers in every common format", () => {
    for (const phone of ["(555) 123-4567", "555-123-4567", "555.123.4567", "+1 555 123 4567", "+52 55 1234 5678", "5551234567"])
      expect(scrubText(`call ${phone} now`), phone).toBe("call [number] now");
    expect(scrubText("card 4242 4242 4242 4242 declined")).toBe("card [number] declined");
  });

  it("keeps dates, versions, counts and stack positions readable", () => {
    const s = "2026-10-07 next 16.4.0 at render (page.tsx:12:34) 3 of 10 sets 1234567";
    expect(scrubText(s)).toBe(s);
  });

  it("masks API keys and bearer tokens", () => {
    expect(scrubText("key sk-ant-api03-abcdefghijk leaked")).toBe("key [secret] leaked");
    expect(scrubText("resend re_AbCdEf123456 bad")).toBe("resend [secret] bad");
    expect(scrubText("Authorization: Bearer abc.def.ghi123")).toBe("Authorization: [secret]");
  });

  it("caps very long text", () => {
    const out = scrubText("x".repeat(5000));
    expect(out.length).toBeLessThan(1100);
    expect(out).toMatch(/more\]$/);
  });
});

describe("scrub", () => {
  it("drops names, transcripts, answers and messages by key, at any depth", () => {
    const out = scrub({
      route: "/api/tutor",
      status: 502,
      nickname: "Ada",
      learner: { displayName: "Maria", grade: "4" },
      thread: { lines: [{ role: "learner", text: "my name is Ada" }], surface: "talk" },
      messages: [{ content: "hello" }],
      answer: "3/4",
      email: "maria@example.com",
      password: "hunter22",
    }) as Record<string, unknown>;
    expect(out).toEqual({
      route: "/api/tutor",
      status: 502,
      nickname: "[redacted]",
      learner: "[redacted]",
      thread: { lines: "[redacted]", surface: "talk" },
      messages: "[redacted]",
      answer: "[redacted]",
      email: "[redacted]",
      password: "[redacted]",
    });
    expect(JSON.stringify(out)).not.toMatch(/Ada|Maria|hunter|3\/4|hello/);
  });

  it("masks free text in values it keeps", () => {
    expect(scrub({ detail: "bounce from kid@example.com", list: ["555-123-4567", 4] })).toEqual({ detail: "bounce from [email example.com]", list: ["[number]", 4] });
  });

  it("describes errors without their causes' personal data", () => {
    const e = Object.assign(new Error("Resend 422 for ana@example.com"), { digest: "abc123" });
    const out = scrub(e) as { name: string; message: string; digest: string; stack: string };
    expect(out.name).toBe("Error");
    expect(out.message).toBe("Resend 422 for [email example.com]");
    expect(out.digest).toBe("abc123");
    expect(out.stack).not.toContain("ana@example.com");
  });

  it("survives cycles, depth and huge arrays", () => {
    const a: Record<string, unknown> = { id: 1 };
    a.self = a;
    expect(scrub(a)).toEqual({ id: 1, self: "[circular]" });
    const deep = { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } };
    expect(JSON.stringify(scrub(deep))).toContain("[deep]");
    const big = scrub(Array.from({ length: 80 }, (_, i) => i)) as unknown[];
    expect(big).toHaveLength(51);
    expect(big.at(-1)).toBe("[30 more]");
  });
});

describe("scrubPath", () => {
  it("removes every query value", () => {
    expect(scrubPath("/api/know/wiki?q=Ada%20Lopez&lang=es")).toBe("/api/know/wiki?q=[redacted]&lang=[redacted]");
    expect(scrubPath("/family/123")).toBe("/family/123");
    expect(scrubPath("/settings?")).toBe("/settings");
  });
});

describe("log and logRequestError", () => {
  it("writes one parseable JSON line with no personal data", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const line = logRequestError(
      new Error("Cannot read properties of undefined (reading 'nickname') for maria@example.com"),
      { path: "/api/email/weekly?to=maria@example.com", method: "POST", headers: { cookie: "session=1", "x-vercel-id": "iad1::abc", "user-agent": "x" } },
      { routerKind: "App Router", routePath: "/api/email/weekly", routeType: "route", renderSource: undefined },
    );
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: "error", event: "request_error", method: "POST", path: "/api/email/weekly?to=[redacted]", route: "/api/email/weekly", routeType: "route", requestId: "iad1::abc" });
    expect(parsed.error.message).toContain("[email example.com]");
    expect(line).not.toMatch(/maria@|session=1|user-agent/);
  });

  it("routes levels to the matching console method", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    log("info", "email_sent", { learners: 2 }, new Date("2026-10-07T12:00:00Z"));
    log("warn", "email_failed", { status: 403 });
    expect(JSON.parse(info.mock.calls[0][0] as string)).toEqual({ ts: "2026-10-07T12:00:00.000Z", level: "info", event: "email_sent", learners: 2 });
    expect(warn).toHaveBeenCalledOnce();
  });

  it("handles non-Error throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const parsed = JSON.parse(logRequestError("boom 555-123-4567", { path: "/", method: "GET", headers: {} }, {}));
    expect(parsed.error).toEqual({ thrown: "boom [number]" });
    expect(JSON.parse(logRequestError({ nickname: "Ada" }, { path: "/", method: "GET", headers: {} }, {})).error).toEqual({ thrown: "object" });
  });
});
