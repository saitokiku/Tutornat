import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@/lib/ai/safety";
import { resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { aiBudget, aiFetch, aiHeaders, aiStatus, capNotice, forgetStatus, namesToScrub, scrubBody, scrubName, scrubNames, sendAi, useAiBudget } from "./client";

afterEach(() => {
  cleanup();
  resetMemory();
  forgetStatus();
  vi.unstubAllGlobals();
  vi.useRealTimers();
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

  it("asks again after five minutes, and after the learner's midnight", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 7, 23, 50));
    update((s) => void (s.session = { accountId: "acct-t", profileId: "kid-t" }));
    const fetchMock = vi.fn(async () => Response.json({ mode: "anthropic", budget: "day" }));
    vi.stubGlobal("fetch", fetchMock);
    await aiBudget();
    vi.setSystemTime(new Date(2026, 9, 7, 23, 54));
    await aiBudget();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(2026, 9, 7, 23, 56)); // six minutes on
    await aiBudget();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.setSystemTime(new Date(2026, 9, 8, 0, 0, 30)); // under five minutes on, but a new day
    await aiBudget();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.setSystemTime(new Date(2026, 9, 8, 0, 2));
    await aiBudget();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("scrubName", () => {
  it("takes a child's own name out of what they type", () => {
    expect(scrubName("My name is Ada and I need help with 3/4", "Ada")).toBe("My name is [name] and I need help with 3/4");
    expect(scrubName("im ada. can you help", "Ada")).toBe("im [name]. can you help");
    expect(scrubName("Me llamo Ada", "Ada")).toBe("Me llamo [name]");
    expect(scrubName("Ada's worksheet, question 2", "Ada")).toBe("[name]'s worksheet, question 2");
    expect(scrubName("Ada’s worksheet", "Ada")).toBe("[name]’s worksheet");
  });

  it("catches a longer name typed in lowercase, and any name after 'my name is' or 'I'm', with either apostrophe", () => {
    expect(scrubName("SOFÍA needs a hint", "Sofía")).toBe("[name] needs a hint");
    expect(scrubName("sofía needs a hint", "Sofía")).toBe("[name] needs a hint");
    expect(scrubName("Will is stuck", "Will")).toBe("[name] is stuck");
    expect(scrubName("my name is will", "Will")).toBe("my name is [name]");
    expect(scrubName("I’m will", "Will")).toBe("I’m [name]");
    expect(scrubName("my name’s leo", "Leo")).toBe("my name’s [name]");
    expect(scrubName("soy leo", "Leo")).toBe("soy [name]");
  });

  it("leaves everyday words alone when a short name or a word-name is written in lowercase", () => {
    expect(scrubName("will it work if I add them?", "Will")).toBe("will it work if I add them?");
    expect(scrubName("a ray of light", "Ray")).toBe("a ray of light");
    expect(scrubName("no leo bien esta palabra", "Leo")).toBe("no leo bien esta palabra");
    expect(scrubName("Leo needs help", "Leo")).toBe("[name] needs help");
    expect(scrubName("vamos al parque", "Al")).toBe("vamos al parque");
    expect(scrubName("dan dos vueltas", "Dan")).toBe("dan dos vueltas");
    expect(scrubName("my art class homework", "Art")).toBe("my art class homework");
    expect(scrubName("I drew a picture", "Drew")).toBe("I drew a picture");
    expect(scrubName("how many miles is it", "Miles")).toBe("how many miles is it");
    expect(scrubName("la luna cambia de forma", "Luna")).toBe("la luna cambia de forma");
    expect(scrubName("Adam and Canada", "Ada")).toBe("Adam and Canada");
    expect(scrubName("anything", "A")).toBe("anything");
  });

  it("never reads a contraction as a name", () => {
    expect(scrubName("I don't want to live anymore", "Don")).toBe("I don't want to live anymore");
    expect(scrubName("Don’t tell me", "Don")).toBe("Don’t tell me");
    expect(scrubName("Don's book", "Don")).toBe("[name]'s book");
    expect(scrubName("i can't", "Can")).toBe("i can't");
  });

  it("never takes out what children call their grown-ups", () => {
    expect(scrubName("my mom hits me", "Mom")).toBe("my mom hits me");
    expect(scrubName("Mamá me ayuda", "Mamá")).toBe("Mamá me ayuda");
    expect(scrubName("my mom and dad help", "Mom and Dad")).toBe("my mom and dad help");
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

  it("splits a grown-up's full name only at its capitalized words, never particles or family words", () => {
    expect(namesToScrub(["Ana Dos Santos", "Juan Del Valle", "Ludwig van Beethoven", "Mom and Dad", "Mom", "Maria"])).toEqual([
      "Ludwig van Beethoven",
      "Ana Dos Santos",
      "Juan Del Valle",
      "Beethoven",
      "Santos",
      "Ludwig",
      "Valle",
      "Maria",
      "Juan",
      "Ana",
    ]);
    expect(scrubNames({ text: "¿es dos?" }, ["Ana Dos Santos"])).toEqual({ text: "¿es dos?" });
    expect(scrubNames({ text: "el área del triángulo" }, ["Juan Del Valle"])).toEqual({ text: "el área del triángulo" });
    expect(scrubNames({ text: "I added 3 and 4" }, ["Mom and Dad"])).toEqual({ text: "I added 3 and 4" });
    expect(scrubNames({ text: "los números de Ana" }, ["Ana de los Santos"])).toEqual({ text: "los números de [name]" });
  });

  it("leaves ids, enums, dates and attached files exactly as they are", () => {
    const photo = "data:image/png;base64,QWRhIEFkYQ==/Ada+Ada";
    const body = { kind: "syllabus", today: "2026-10-07", file: photo, locale: "en", grade: "4", skillId: "Ada", extra: photo };
    expect(scrubNames(body, ["Ada"])).toEqual(body);
    expect(scrubNames({ text: "hi" }, [])).toEqual({ text: "hi" });
  });
});

const said = (...texts: string[]) => JSON.stringify({ messages: texts.map((text, i) => ({ id: `m${i}`, role: i % 2 ? "assistant" : "user", parts: [{ type: "text", text }] })), context: { locale: "en" } });
const lastSent = (body: string) => (JSON.parse(body) as { messages: { parts: { text: string }[] }[] }).messages.at(-1)!.parts[0].text;

describe("scrubBody", () => {
  it("sends a message the safety screen catches exactly as typed, so a name can't hide it", () => {
    // A coach's name is an everyday word ("my coach hits me"): taken out, the screen would miss it.
    expect(screen(scrubNames("my coach hits me", ["Coach Taylor"]), "en").kind).toBe("ok");
    const body = scrubBody(said("Coach Taylor said hi", "Hello.", "my coach hits me"), ["Coach Taylor"]);
    expect(lastSent(body)).toBe("my coach hits me");
    expect(screen(lastSent(body), "en").kind).toBe("abuse");
    // Earlier messages are still scrubbed.
    expect(body).toContain("[name] said hi");
    expect(body).not.toContain("Taylor");
  });

  it("keeps crisis words whole for a child whose name collides with them", () => {
    for (const [name, text] of [
      ["Don", "I don't want to live anymore"],
      ["Mom", "my mom hits me"],
      ["Myself", "I want to kill myself"],
      ["Morir", "me quiero morir"],
    ]) {
      const body = scrubBody(said(text), [name]);
      expect(lastSent(body), name).toBe(text);
      expect(screen(lastSent(body), "en").kind, name).not.toBe("ok");
    }
  });

  it("scrubs everything else, and a body that is not JSON as text", () => {
    expect(lastSent(scrubBody(said("My name is Ada"), ["Ada"]))).toBe("My name is [name]");
    expect(scrubBody("Ada: test Friday", ["Ada"])).toBe("[name]: test Friday");
    expect(scrubBody("Ada says: i want to die", ["Ada"])).toBe("Ada says: i want to die");
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

  it("runs on what it is given (sendAi): the names, the id headers and where to send", async () => {
    const send = vi.fn<typeof fetch>(async () => new Response("{}"));
    await sendAi("/api/ai/course", { method: "POST", body: JSON.stringify({ goal: "fractions for Ada" }) }, ["Ada"], { "x-kaizen-learner": "a".repeat(32) }, send);
    const init = send.mock.calls[0][1]!;
    expect(init.body).toBe(JSON.stringify({ goal: "fractions for [name]" }));
    expect((init.headers as Headers).get("x-kaizen-learner")).toBe("a".repeat(32));
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

  it("useAiBudget changes as soon as a capped reply arrives, without a reload", async () => {
    update((s) => void (s.session = { accountId: "acct-mid", profileId: "kid-mid" }));
    let budget: string | null = null;
    const fetchMock = vi.fn(async (url: RequestInfo | URL) =>
      String(url) === "/api/ai/status" ? Response.json({ mode: "anthropic", budget }) : new Response("data: {}\n\n", { headers: { "x-kaizen-budget": "day" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAiBudget());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
    budget = "day";
    await act(async () => void (await aiFetch("/api/tutor", { method: "POST", body: said("one more") })));
    await waitFor(() => expect(result.current).toBe("day"));
  });
});
