import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { aiBudget, aiFetch, aiHeaders, aiStatus, capNotice, scrubName, scrubNames, useAiBudget } from "./client";

afterEach(() => {
  resetMemory();
  vi.unstubAllGlobals();
});

describe("what the browser tells the AI routes", () => {
  it("sends one-way hashes of the account and learner, never the ids themselves, and the local date", async () => {
    update((s) => void (s.session = { accountId: "acct-123", profileId: "kid-456" }));
    const h = await aiHeaders();
    expect(h["x-kaizen-account"]).toMatch(/^[a-f0-9]{32}$/);
    expect(h["x-kaizen-learner"]).toMatch(/^[a-f0-9]{32}$/);
    expect(h["x-kaizen-learner"]).not.toBe(h["x-kaizen-account"]);
    expect(JSON.stringify(h)).not.toMatch(/acct-123|kid-456/);
    expect(h["x-kaizen-day"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Stable, so the server counts the same learner across requests.
    expect((await aiHeaders())["x-kaizen-learner"]).toBe(h["x-kaizen-learner"]);
  });

  it("sends no learner for a grown-up, unless asked about a child", async () => {
    update((s) => void (s.session = { accountId: "acct-123", profileId: "parent" }));
    expect(await aiHeaders()).not.toHaveProperty("x-kaizen-learner");
    expect(await aiHeaders("kid-456")).toHaveProperty("x-kaizen-learner");
  });

  it("asks the status route with those headers and reads the mode and the budget", async () => {
    update((s) => void (s.session = { accountId: "acct-9", profileId: "kid-9" }));
    const fetchMock = vi.fn(async () => Response.json({ mode: "anthropic", budget: "day" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await aiStatus()).toBe("anthropic");
    expect(await aiBudget()).toBe("day");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toHaveProperty("x-kaizen-learner");
  });
});

describe("scrubName", () => {
  it("takes a child's own name out of what they type", () => {
    expect(scrubName("My name is Ada and I need help with 3/4", "Ada")).toBe("My name is [name] and I need help with 3/4");
    expect(scrubName("im ada. can you help", "Ada")).toBe("im [name]. can you help");
    expect(scrubName("Me llamo Ada", "Ada")).toBe("Me llamo [name]");
    expect(scrubName("Ada's worksheet, question 2", "Ada")).toBe("[name]'s worksheet, question 2");
  });

  it("catches a name typed in lowercase, unless the name is an everyday word", () => {
    expect(scrubName("ada thinks it's 8", "Ada")).toBe("[name] thinks it's 8");
    expect(scrubName("SOFÍA needs a hint", "Sofía")).toBe("[name] needs a hint");
    expect(scrubName("Will is stuck", "Will")).toBe("[name] is stuck");
    expect(scrubName("my name is will", "Will")).toBe("my name is [name]");
  });

  it("leaves ordinary words alone", () => {
    expect(scrubName("will it work if I add them?", "Will")).toBe("will it work if I add them?");
    expect(scrubName("a ray of light", "Ray")).toBe("a ray of light");
    expect(scrubName("Adam and Canada", "Ada")).toBe("Adam and Canada");
    expect(scrubName("anything", "A")).toBe("anything");
  });
});

describe("scrubNames", () => {
  it("takes every family name out of every string a request carries, however deep", () => {
    const body = {
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "Leo and Ada Lovelace are stuck" }] }],
      context: { homework: { title: "Ada's science project", notes: "lovelace family poster" }, interests: ["Leo's dog"], working: ["m.frac.addlike"] },
      goal: "fractions for ada",
    };
    expect(scrubNames(body, ["Ada Lovelace", "Leo"])).toEqual({
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "[name] and [name] are stuck" }] }],
      context: { homework: { title: "[name]'s science project", notes: "[name] family poster" }, interests: ["[name]'s dog"], working: ["m.frac.addlike"] },
      goal: "fractions for [name]",
    });
  });

  it("leaves ids, enums, dates and attached files exactly as they are", () => {
    const photo = "data:image/png;base64,QWRhIEFkYQ==/Ada+Ada";
    const body = { kind: "syllabus", today: "2026-10-07", file: photo, locale: "en", grade: "4", skillId: "Ada", extra: photo };
    expect(scrubNames(body, ["Ada"])).toEqual(body);
    expect(scrubNames({ text: "hi" }, [])).toEqual({ text: "hi" });
  });
});

const kid = (id: string, nickname: string): Profile => ({ id, accountId: "acct-1", nickname, grade: "3", locale: "en", color: "#3E6E8E", createdAt: 0 });

describe("aiFetch", () => {
  it("sends the opaque ids and takes every family name out of the body", async () => {
    update((s) => {
      s.session = { accountId: "acct-1", profileId: "kid-1" };
      s.profiles.push(kid("kid-1", "Ada"), kid("kid-2", "Leo"));
      s.accounts.push({ id: "acct-1", email: "m@example.test", displayName: "Maria Lopez", salt: "", passwordHash: "", createdAt: 0 });
    });
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await aiFetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "Ada asked Leo, and Mrs Lopez helped" }] }] }) });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/tutor");
    const headers = init.headers as Headers;
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-kaizen-learner")).toMatch(/^[a-f0-9]{32}$/);
    expect(headers.get("x-kaizen-account")).toMatch(/^[a-f0-9]{32}$/);
    expect(init.body).toBe(JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "[name] asked [name], and Mrs [name] helped" }] }] }));
    expect(init.method).toBe("POST");
  });

  it("scrubs a body that is not JSON as text, and sends no body when there is none", async () => {
    update((s) => void s.profiles.push(kid("kid-1", "Ada")));
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await aiFetch("/api/ai/extract", { method: "POST", body: "Ada: test Friday" });
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBe("[name]: test Friday");
    await aiFetch("/api/ai/status");
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBeUndefined();
  });
});

describe("over a spend cap", () => {
  it("capNotice reads the cap message and nothing else", async () => {
    const capped = Response.json({ error: "budget", scope: "day", message: "The lesson writer is done for today." }, { status: 429 });
    expect(await capNotice(capped)).toBe("The lesson writer is done for today.");
    // The response can still be read afterwards.
    expect(((await capped.json()) as { scope: string }).scope).toBe("day");
    expect(await capNotice(Response.json({ error: "rate" }, { status: 429 }))).toBeNull();
    expect(await capNotice(new Response("slow down", { status: 429 }))).toBeNull();
    expect(await capNotice(Response.json({ error: "model" }, { status: 502 }))).toBeNull();
    expect(await capNotice(null)).toBeNull();
  });

  it("useAiBudget says which cap the learner has reached", async () => {
    update((s) => void (s.session = { accountId: "acct-cap", profileId: "kid-cap" }));
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ mode: "anthropic", budget: "month" })));
    const { result } = renderHook(() => useAiBudget());
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe("month"));
  });
});
