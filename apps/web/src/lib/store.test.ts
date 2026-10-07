import { afterEach, describe, expect, it, vi } from "vitest";
import { STORE_KEY, read, resetMemory, storeHealth, update } from "./store";

afterEach(() => {
  vi.restoreAllMocks();
  resetMemory();
});

describe("store", () => {
  it("persists updates", () => {
    update((s) => void (s.prefs.locale = "es"));
    resetMemory();
    expect(read().prefs.locale).toBe("es");
  });

  it("recovers from corrupt store", () => {
    localStorage.setItem(STORE_KEY, "{bad");
    expect(read().accounts).toEqual([]);
    expect(storeHealth()).toBe("reset");
  });

  it("resets a document whose session or prefs have the wrong shape", () => {
    localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, accounts: [], session: null }));
    expect(read().session).toEqual({ accountId: null, profileId: null });
    expect(storeHealth()).toBe("reset");
  });

  it("does not undo a change made in another tab", () => {
    update((s) => void s.notes.push({ id: "a", profileId: "p", at: 1, text: "from tab A" }));
    // Tab B writes straight to storage while this tab still holds its cached copy.
    const saved = JSON.parse(localStorage.getItem(STORE_KEY)!);
    saved.notes.push({ id: "b", profileId: "p", at: 2, text: "from tab B" });
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    update((s) => void (s.prefs.locale = "es"));
    expect(read().notes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("falls back to memory when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(read().profiles).toEqual([]);
    update((s) => void (s.prefs.locale = "es"));
    expect(read().prefs.locale).toBe("es");
    expect(storeHealth()).toBe("memory");
  });
});
