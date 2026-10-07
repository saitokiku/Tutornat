import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "@/instrumentation";
import { dropsKey, installConsoleScrub, log, logRequestError, scrub, scrubFreeText, scrubPath, scrubText } from "./log";

let uninstall: (() => void) | null = null;
afterEach(() => {
  uninstall?.();
  uninstall = null;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("which keys are dropped", () => {
  it("drops personal keys by their ending too, so camelCase and kebab-case names can't slip through", () => {
    for (const k of ["learnerName", "childName", "displayName", "parentEmail", "userMessage", "studentAnswer", "eventTitle", "searchQuery", "x-api-key", "set-cookie", "accessToken", "ipAddress", "promptText", "tutor_transcript", "note", "q", "to"])
      expect(dropsKey(k), k).toBe(true);
    for (const k of ["route", "routeType", "status", "requestId", "learners", "locale", "context", "contentType", "photo", "digest", "method", "path", "count"]) expect(dropsKey(k), k).toBe(false);
    expect(scrub({ learnerName: "Ada", parentEmail: "maria@example.com", details: { childName: "Bo", studentAnswer: "3/4" }, status: 500 })).toEqual({
      learnerName: "[redacted]",
      parentEmail: "[redacted]",
      details: { childName: "[redacted]", studentAnswer: "[redacted]" },
      status: 500,
    });
  });
});

describe("text nobody here wrote", () => {
  it("masks quoted text, where errors repeat their input, and keeps property names", () => {
    let parseError = "";
    try {
      JSON.parse("Ada is my name and I live at 12 Elm St");
    } catch (e) {
      parseError = (e as Error).message;
    }
    expect(parseError).toContain("Ada");
    expect(scrubFreeText(parseError)).not.toContain("Ada");
    expect(scrubFreeText(`Unexpected token 'A', "Ada is my "... is not valid JSON`)).toBe(`Unexpected token 'A', [quoted]... is not valid JSON`);
    expect(scrubFreeText("Cannot read properties of undefined (reading 'nickname')")).toBe("Cannot read properties of undefined (reading 'nickname')");
    expect(scrubFreeText("said “my name is Bo” to `Ana`")).toBe("said [quoted] to [quoted]");
  });
});

describe("installConsoleScrub", () => {
  function capture() {
    const lines: string[] = [];
    vi.spyOn(console, "error").mockImplementation((l: string) => void lines.push(l));
    vi.spyOn(console, "warn").mockImplementation((l: string) => void lines.push(l));
    vi.spyOn(console, "info").mockImplementation((l: string) => void lines.push(l));
    return lines;
  }

  it("turns Next's raw console.error(err) for an uncaught error into one scrubbed line", () => {
    const lines = capture();
    uninstall = installConsoleScrub();
    // What Next does before onRequestError: the error as thrown, own properties and cause included.
    let err: Error;
    try {
      JSON.parse("Hi, I'm Ada Lopez, my email is ada.lopez@example.com");
    } catch (e) {
      err = Object.assign(e as Error, { learnerName: "Ada", cause: { transcript: "my name is Ada" } });
    }
    console.error(err!);
    console.warn("retrying send to maria@example.com", { childName: "Bo", attempt: 2 });
    expect(lines).toHaveLength(2);
    const [e, w] = lines.map((l) => JSON.parse(l));
    expect(e).toMatchObject({ level: "error", event: "console", args: [{ name: "SyntaxError" }] });
    expect(w).toMatchObject({ level: "warn", event: "console", args: ["retrying send to [email example.com]", { childName: "[redacted]", attempt: 2 }] });
    expect(lines.join("\n")).not.toMatch(/Ada|Lopez|ada\.lopez|maria@|\bBo\b|transcript/);
  });

  it("writes log() lines once, untouched, and puts the console back when removed", () => {
    const lines = capture();
    const before = console.error;
    uninstall = installConsoleScrub();
    expect(console.error).not.toBe(before);
    log("error", "email_failed", { status: 502 }, new Date("2026-10-07T12:00:00Z"));
    expect(lines).toEqual([JSON.stringify({ ts: "2026-10-07T12:00:00.000Z", level: "error", event: "email_failed", status: 502 })]);
    // Installing twice changes nothing.
    installConsoleScrub()();
    uninstall();
    uninstall = null;
    expect(console.error).toBe(before);
  });

  it("is installed by instrumentation's register() in production only, never during the build", () => {
    capture();
    const before = console.error;
    vi.stubEnv("NODE_ENV", "development");
    register();
    expect(console.error).toBe(before);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    register();
    expect(console.error).toBe(before);
    vi.stubEnv("NEXT_PHASE", "");
    register();
    expect(console.error).not.toBe(before);
    uninstall = installConsoleScrub(); // already installed: a no-op…
    const g = globalThis as Record<symbol, unknown>;
    // …so put it back by hand.
    console.error = before;
    delete g[Symbol.for("kaizenedu.log.rawConsole")];
  });
});

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

  it("drops what a family typed: titles, goals, topics, search queries, interests", () => {
    const out = scrub({ event: { title: "Ada's spelling test", kind: "test" }, course: { goal: "fractions for Ada", topic: "Ada's dog" }, q: "Ada Lopez", query: "where does Ada live", interests: ["horses"] });
    expect(out).toEqual({ event: { title: "[redacted]", kind: "test" }, course: { goal: "[redacted]", topic: "[redacted]" }, q: "[redacted]", query: "[redacted]", interests: "[redacted]" });
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
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const line = logRequestError(
      new Error("Cannot read properties of undefined (reading 'nickname') for maria@example.com"),
      { path: "/api/email/weekly?to=maria@example.com", method: "POST", headers: { cookie: "session=1", "x-vercel-id": "iad1::abc", "user-agent": "x" } },
      { routerKind: "App Router", routePath: "/api/email/weekly", routeType: "route", renderSource: undefined },
    );
    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: "error", event: "request_error", method: "POST", path: "/api/email/weekly?to=[redacted]", route: "/api/email/weekly", routeType: "route", runtime: "nodejs", requestId: "iad1::abc" });
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
