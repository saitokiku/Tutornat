import { afterEach, describe, expect, it, vi } from "vitest";
import { resetMemory, update } from "@/lib/store";
import { aiBudget, aiHeaders, aiStatus, scrubName } from "./client";

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

  it("leaves ordinary words alone", () => {
    expect(scrubName("will it work if I add them?", "Will")).toBe("will it work if I add them?");
    expect(scrubName("Adam and Canada", "Ada")).toBe("Adam and Canada");
    expect(scrubName("anything", "A")).toBe("anything");
  });
});
