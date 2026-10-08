import { afterEach, describe, expect, it, vi } from "vitest";
import { signUp } from "./auth";
import { recordFirstMiss, recordHelp } from "./evidence";
import { openPracticeAttempt, practiceSource, recordAnswer, startSet } from "./practice";
import { createLearner } from "./profiles";
import { STORE_KEY, read, resetMemory, storeHealth, update } from "./store";
import type { Profile } from "./types";

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

// Ceilings for a family's history: what one answered problem costs in this browser's storage, and how
// many times one answer reads the whole saved document. Before durable evidence (T02) a plain problem
// took about 395 bytes and one answer one read; codex 02b84e3 took 3,730 bytes and 11 reads.
describe("ceilings", () => {
  const docBytes = () => localStorage.getItem(STORE_KEY)!.length + Object.keys(localStorage).filter((k) => k.startsWith("kaizenedu.evidence.")).reduce((n, k) => n + k.length + localStorage.getItem(k)!.length, 0);
  async function family() {
    await signUp({ email: `c${Math.random().toString(36).slice(2)}@example.test`, password: "longenough", displayName: "Sam" });
    return createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
  }
  /** Plays a set the way the runner does: each problem is shown (its level pinned), then answered. */
  function play(p: Profile, help: (setId: string, i: number) => void = () => {}) {
    const setId = startSet(read(), { profile: p, kind: "pick", skillIds: ["m.add.10"], now: Date.now() })!;
    read().sets.find((s) => s.id === setId)!.slots.forEach((_, i) => {
      openPracticeAttempt(setId, i, 1);
      help(setId, i);
      recordAnswer(setId, { slot: i, level: 1, correct: true, assisted: false, seconds: 9, response: "12" });
    });
    return setId;
  }
  /** Whole-document reads of the saved store while `fn` runs. */
  function reads(fn: () => void) {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    fn();
    const n = getItem.mock.calls.filter(([k]) => k === STORE_KEY).length;
    getItem.mockRestore();
    return n;
  }

  it("a plain answered problem stays close to 400 bytes; one with a hint and a miss under 1,250", async () => {
    const p = await family();
    const before = docBytes();
    for (let i = 0; i < 10; i++) play(p);
    // The parent's row, plus the answer's question id and provenance (about 70 bytes).
    expect((docBytes() - before) / 100).toBeLessThanOrEqual(480);
    const mid = docBytes();
    for (let i = 0; i < 5; i++)
      play(p, (setId, slot) => {
        const source = practiceSource(read().sets.find((s) => s.id === setId)!, slot, 1);
        recordHelp(source, { kind: "hint", key: "1", detail: "1" });
        recordFirstMiss(source, { response: "11" });
      });
    // Its question's source once, the hint and the miss, each pointing at it by id (codex 02b84e3: about 4,500).
    expect((docBytes() - mid) / 50).toBeLessThanOrEqual(1250);
  });

  it("with about 2,000 problems of history, an answered problem reads the document at most twice, and a repeat answer not at all", async () => {
    const p = await family();
    const setId = play(p);
    // Copies of real rows, as if this learner had answered 2,000 problems before.
    update((s) => {
      const set = s.sets.find((x) => x.id === setId)!;
      const rows = s.attempts.filter((a) => a.setId === setId);
      for (let n = 0; n < 200; n++) {
        const id = `old-${n}`;
        s.sets.push({ ...structuredClone(set), id, finishedAt: Date.now() });
        for (const a of rows) s.attempts.push({ ...a, id: a.id.replace(setId, id), setId: id, attemptId: `att_${n}${a.attemptId}` });
      }
    });
    expect(read().attempts.length).toBeGreaterThanOrEqual(2000);
    resetMemory();
    const next = startSet(read(), { profile: p, kind: "pick", skillIds: ["m.add.10"], now: Date.now() })!;
    read();
    expect(reads(() => {
      openPracticeAttempt(next, 0, 1);
      recordAnswer(next, { slot: 0, level: 1, correct: true, assisted: false, seconds: 9, response: "12" });
    })).toBeLessThanOrEqual(2);
    expect(reads(() => recordAnswer(next, { slot: 0, level: 1, correct: true, assisted: false, seconds: 9, response: "12" }))).toBe(0);
    // A hint and a miss on the next problem: one read each.
    const source = practiceSource(read().sets.find((s) => s.id === next)!, 1, 1);
    expect(reads(() => recordHelp(source, { kind: "hint", key: "1" }))).toBeLessThanOrEqual(1);
    expect(reads(() => recordFirstMiss(source, { response: "11" }))).toBeLessThanOrEqual(1);
  });
});
