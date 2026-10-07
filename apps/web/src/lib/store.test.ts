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
