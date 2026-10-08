import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attemptIdentity } from "@/learning/evidence";
import type { Attempt, AttemptSource } from "@/learning/types";
import { sceneAttemptSource } from "./activity";
import { removeCourse } from "./courses";
import { assistanceFor, attemptFor, recordFirstMiss, recordHelp } from "./evidence";
import { exportFamily, deleteLearnerData } from "./export";
import { recordAnswer, statusesOf } from "./practice";
import { removeLearner } from "./profiles";
import { mergeRemote } from "./sync";
import { appendEvidence, applyRemote, EvidenceError, read, resetMemory, STORE_KEY, storeHealth, update, type EvidenceRow } from "./store";

const source: AttemptSource = { profileId: "p", skillId: "m.add.5", itemFingerprint: "m.add.5:1:11", contentVersion: "legacy", kind: "set-slot", setId: "set", slotId: "0" };
const NOW = 1_790_000_000_000;
const JOURNAL = "kaizenedu.evidence.v1.";
const journalKeys = () => Object.keys(localStorage).filter((k) => k.startsWith(JOURNAL));
/** localStorage refuses the document itself (a full device), but still takes small keys. */
const documentFull = () => {
  const save = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key === STORE_KEY) throw new DOMException("Full", "QuotaExceededError");
    save.call(this, key, value);
  });
};
const final = (over: Partial<Attempt> = {}): EvidenceRow => ({ list: "attempts", record: { id: "final-1", profileId: "p", skillId: "m.add.5", level: 1, seed: 11, mode: "practice", correct: true, assisted: false, seconds: 1, at: NOW, ...over } });
/** Why `fn` was refused (EvidenceError's reason). */
const refusal = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof EvidenceError) return e.reason;
    throw e;
  }
  return null;
};
const practiceSet = (kind: "pick" | "check", slots = 1) =>
  update((s) => void s.sets.push({ id: kind === "check" ? "chk" : "set", profileId: "p", createdAt: NOW, kind, subject: "math", skillId: "m.add.5", slots: Array.from({ length: slots }, (_, i) => ({ skillId: "m.add.5", seed: 11 + i, role: kind === "check" ? ("check" as const) : ("main" as const), level: 1 })) }));

beforeEach(() => {
  update((s) => {
    s.accounts.push({ id: "a", email: "parent@example.test", displayName: "Parent", salt: "", passwordHash: "", createdAt: NOW });
    s.profiles.push({ id: "p", accountId: "a", nickname: "Ada", grade: "3", locale: "en", color: "#000", createdAt: NOW });
    s.session = { accountId: "a", profileId: "p" };
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  resetMemory();
});

describe("the evidence journal", () => {
  it("is written ahead and cleared once the document holding the row is saved", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    recordHelp(source, { kind: "hint", key: "1" });
    const keys = setItem.mock.calls.map(([k]) => k);
    expect(keys.findIndex((k) => k.startsWith(JOURNAL))).toBeLessThan(keys.indexOf(STORE_KEY));
    expect(journalKeys()).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORE_KEY)!).helpExposures).toHaveLength(1);
  });

  it("keeps evidence the document couldn't hold, replays it on the next load, and clears it on the next save", () => {
    const full = documentFull();
    recordHelp(source, { kind: "hint", key: "1" });
    expect(storeHealth()).toBe("memory");
    expect(journalKeys()).toHaveLength(1);
    full.mockRestore();
    resetMemory();
    expect(read().helpExposures).toEqual([expect.objectContaining({ kind: "hint", attemptId: attemptIdentity(source) })]);
    update((s) => void (s.prefs.locale = "es"));
    expect(journalKeys()).toEqual([]);
    resetMemory();
    expect(read().helpExposures).toHaveLength(1);
  });

  it("a server correction is what stays", () => {
    appendEvidence([final()]);
    applyRemote((s) => {
      s.attempts[0].correct = false;
    });
    resetMemory();
    expect(read().attempts[0].correct).toBe(false);
  });

  it("a remote deletion cannot be resurrected by the journal", () => {
    const full = documentFull();
    appendEvidence([{ list: "activity", record: { id: "activity-1", profileId: "p", courseId: "c", lessonId: "l", type: "quiz_answered", at: NOW, correct: true } }]);
    full.mockRestore();
    resetMemory();
    applyRemote((s) => {
      s.activity = [];
    });
    resetMemory();
    expect(read().activity).toEqual([]);
  });

  it("a remote deletion arriving in the same tab, once space is freed, is not resurrected either", () => {
    const full = documentFull();
    appendEvidence([{ list: "activity", record: { id: "activity-1", profileId: "p", courseId: "c", lessonId: "l", type: "quiz_answered", at: NOW, correct: true } }]);
    full.mockRestore();
    applyRemote((s) => {
      s.activity = [];
    });
    expect(journalKeys()).toEqual([]);
    resetMemory();
    expect(read().activity).toEqual([]);
  });

  it("another tab's evidence is kept when this tab writes next", () => {
    read();
    const other = JSON.parse(localStorage.getItem(STORE_KEY)!);
    other.helpExposures.push({ id: "other-tab", attemptId: "att_x", profileId: "p", skillId: "m.add.5", kind: "hint", capturedAt: NOW, delivery: "released" });
    localStorage.setItem(STORE_KEY, JSON.stringify(other));
    recordFirstMiss(source, { response: "4" });
    expect(read().helpExposures.map((h) => h.id)).toEqual(["other-tab"]);
    expect(read().responseEvents).toHaveLength(1);
  });
});

describe("durable question evidence", () => {
  it("a synced learner tombstone purges every new local evidence collection", () => {
    recordHelp(source, { kind: "hint", key: "1" });
    recordFirstMiss(source, { response: "3" });
    applyRemote((s) => mergeRemote(s, { changes: { profiles: [{ id: "p", deleted: true }] } }, "a", () => false));
    resetMemory();
    expect(read().profiles).toEqual([]);
    expect(read().attemptContexts).toEqual([]);
    expect(read().helpExposures).toEqual([]);
    expect(read().responseEvents).toEqual([]);
  });

  it("a question's source is written once, with its first help or miss, and every row points at it by a short id", () => {
    expect(attemptFor(source).help).toEqual([]);
    expect(read().attemptContexts).toEqual([]);
    recordHelp(source, { kind: "hint", key: "1" });
    recordFirstMiss(source, { response: "4" });
    const id = attemptIdentity(source);
    expect(read().attemptContexts).toEqual([expect.objectContaining({ ...source, id })]);
    expect([...read().helpExposures, ...read().responseEvents].map((r) => r.attemptId)).toEqual([id, id]);
    for (const r of [...read().attemptContexts, ...read().helpExposures, ...read().responseEvents]) expect(r.id.length).toBeLessThanOrEqual(100);
    expect(attemptFor({ ...source, itemFingerprint: "m.add.5:1:12" }).id).not.toBe(id);
  });

  it("saving the same help again writes nothing and keeps the store's snapshot", () => {
    recordHelp(source, { kind: "hint", key: "1" });
    const snapshot = read();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    recordHelp(source, { kind: "hint", key: "1" });
    expect(read()).toBe(snapshot);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("help_survives_reload_and_abandon and restarts the skill's quiet period", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    recordHelp(source, { kind: "hint", key: "1", detail: "1" });
    resetMemory();
    expect(assistanceFor(attemptIdentity(source))).toEqual({ assisted: true, exposureIds: [`${attemptIdentity(source)}:hint:1`], lastHelpAt: NOW });
    expect(attemptFor(source).help).toEqual([expect.objectContaining({ kind: "hint", delivery: "released", detail: "1" })]);
    expect(statusesOf(read(), "p", NOW + 1000)["m.add.5"].lastHelpAt).toBe(NOW);
  });

  it("miss_survives_reload, cannot be replaced, and is not help to the mastery law", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(NOW);
    practiceSet("pick", 2);
    const first = recordFirstMiss(source, { response: "4" });
    expect(first).toMatchObject({ correct: false, assisted: false, response: "4" });
    resetMemory();
    expect(recordFirstMiss(source, { response: "5" })).toEqual(first);
    expect(read().responseEvents).toHaveLength(1);
    // Another problem answered on the learner's own: the miss on the first starts no 48-hour wait.
    now.mockReturnValue(NOW + 1000);
    recordAnswer("set", { slot: 1, level: 1, correct: true, assisted: false, seconds: 3, response: "6" });
    expect(statusesOf(read(), "p", NOW + 2000)["m.add.5"]).toMatchObject({ lastHelpAt: undefined, totals: { own: 1, helped: 0, missed: 0 } });
    // The right answer after the miss is helped, and that answer is the help the law reads.
    now.mockReturnValue(NOW + 3000);
    recordAnswer("set", { slot: 0, level: 1, correct: true, assisted: false, seconds: 3, response: "5" });
    expect(statusesOf(read(), "p", NOW + 4000)["m.add.5"]).toMatchObject({ lastHelpAt: NOW + 3000, totals: { own: 1, helped: 1, missed: 0 } });
  });

  it("an id held by another question is stale, and admits nothing", () => {
    appendEvidence([{ list: "helpExposures", record: { id: "turn-1", attemptId: "att_a", profileId: "p", skillId: "m.add.5", kind: "tutor", capturedAt: NOW, delivery: "latched" } }]);
    expect(refusal(() => appendEvidence([{ list: "helpExposures", record: { id: "turn-1", attemptId: "att_b", profileId: "p", skillId: "m.add.5", kind: "tutor", capturedAt: NOW, delivery: "latched" } }]))).toBe("stale");
    expect(assistanceFor("att_b").assisted).toBe(false);
  });

  it("exports the ledger, and a deleted learner's evidence stays deleted", () => {
    const full = documentFull();
    recordHelp(source, { kind: "hint", key: "1" });
    full.mockRestore();
    resetMemory();
    expect(exportFamily(read(), "a")?.data.helpExposures).toEqual([expect.objectContaining({ kind: "hint" })]);
    deleteLearnerData("p");
    expect(journalKeys()).toEqual([]);
    resetMemory();
    expect(read().helpExposures).toEqual([]);
    expect(read().attemptContexts).toEqual([]);
    expect(refusal(() => recordHelp(source, { kind: "hint", key: "2" }))).toBe("stale");
  });

  it("removing a learner clears the evidence lists", () => {
    recordHelp(source, { kind: "hint", key: "1" });
    recordFirstMiss(source, { response: "3" });
    removeLearner("p");
    resetMemory();
    expect(read().attemptContexts).toEqual([]);
    expect(read().helpExposures).toEqual([]);
    expect(read().responseEvents).toEqual([]);
  });

  it("removing a course removes its lessons' answers, help and first answers, and they don't come back", () => {
    const lesson = sceneAttemptSource("p", "course-1", "l1", "s2", "s2:q1");
    update((s) => void s.courses.push({ id: "course-1", profileId: "p", title: "Sun", goal: "", subject: "science", grade: "3", locale: "en", lessons: [], createdAt: NOW, updatedAt: NOW } as never));
    const full = documentFull();
    recordHelp(lesson, { kind: "hint" });
    appendEvidence([{ list: "activity", record: { id: `${attemptIdentity(lesson)}:right`, profileId: "p", courseId: "course-1", lessonId: "l1", sceneId: "s2:q1", type: "quiz_answered", correct: true, assisted: true, at: NOW } }]);
    full.mockRestore();
    resetMemory();
    expect(read().activity).toHaveLength(1);
    removeCourse("course-1");
    update((s) => void (s.prefs.locale = "es"));
    resetMemory();
    expect(read().activity).toEqual([]);
    expect(read().helpExposures).toEqual([]);
    expect(read().attemptContexts).toEqual([]);
    expect(journalKeys()).toEqual([]);
  });

  it("a course removed once space is freed, in the same tab with no reload, stays removed with its journal", () => {
    const lesson = sceneAttemptSource("p", "course-1", "l1", "s2", "s2:q1");
    update((s) => void s.courses.push({ id: "course-1", profileId: "p", title: "Sun", goal: "", subject: "science", grade: "3", locale: "en", lessons: [], createdAt: NOW, updatedAt: NOW } as never));
    const full = documentFull();
    recordHelp(lesson, { kind: "hint" });
    appendEvidence([{ list: "activity", record: { id: `${attemptIdentity(lesson)}:right`, profileId: "p", courseId: "course-1", lessonId: "l1", sceneId: "s2:q1", type: "quiz_answered", correct: true, assisted: true, at: NOW } }]);
    expect(journalKeys()).toHaveLength(2);
    // The grown-up frees space, as the notice says, and deletes the course.
    full.mockRestore();
    removeCourse("course-1");
    expect(journalKeys()).toEqual([]);
    resetMemory();
    expect(read().courses).toEqual([]);
    expect(read().activity).toEqual([]);
    expect(read().helpExposures).toEqual([]);
    expect(read().attemptContexts).toEqual([]);
  });
});

describe("when storage fails", () => {
  it("storage blocked from the start: practice keeps working in memory and nothing is wiped", () => {
    resetMemory();
    localStorage.clear();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    update((s) => {
      s.accounts.push({ id: "a", email: "parent@example.test", displayName: "Parent", salt: "", passwordHash: "", createdAt: NOW });
      s.profiles.push({ id: "p", accountId: "a", nickname: "Ada", grade: "3", locale: "en", color: "#000", createdAt: NOW });
      s.session = { accountId: "a", profileId: "p" };
    });
    practiceSet("pick");
    recordHelp(source, { kind: "hint", key: "1" });
    recordFirstMiss(source, { response: "4" });
    recordAnswer("set", { slot: 0, level: 1, correct: true, assisted: false, seconds: 3, response: "5" });
    expect(storeHealth()).toBe("memory");
    expect(read().profiles).toHaveLength(1);
    expect(read().session.profileId).toBe("p");
    expect(read().attempts).toEqual([expect.objectContaining({ correct: true, assisted: true })]);
  });

  it("storage full: changes made in memory since are kept when evidence is saved", () => {
    documentFull();
    update((s) => void s.profiles.push({ id: "p2", accountId: "a", nickname: "Bo", grade: "K", locale: "en", color: "#000", createdAt: NOW }));
    expect(storeHealth()).toBe("memory");
    recordHelp(source, { kind: "hint", key: "1" });
    recordFirstMiss(source, { response: "4" });
    expect(read().profiles.map((p) => p.id)).toEqual(["p", "p2"]);
    expect(read().helpExposures).toHaveLength(1);
  });

  it("a check answer this device can't keep is not taken", () => {
    practiceSet("check");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    expect(refusal(() => recordAnswer("chk", { slot: 0, level: 1, correct: true, assisted: false, seconds: 3, response: "5" }))).toBe("storage");
    expect(read().attempts).toEqual([]);
  });

  it("a check answer is kept when only the document can't be saved: its journal entry holds it", () => {
    practiceSet("check");
    documentFull();
    recordAnswer("chk", { slot: 0, level: 1, correct: true, assisted: false, seconds: 3, response: "5" });
    vi.restoreAllMocks();
    resetMemory();
    expect(read().attempts).toEqual([expect.objectContaining({ mode: "check", correct: true })]);
  });
});

describe("provenance", () => {
  it("is set on answers recorded here, kept through a sync round, and left unknown on another device's rows", () => {
    practiceSet("pick");
    recordAnswer("set", { slot: 0, level: 1, correct: true, assisted: false, seconds: 3, response: "5" });
    const mine = read().attempts[0];
    expect(mine).toMatchObject({ provenance: "local-recorded", attemptId: attemptIdentity(source) });
    // The server keeps fixed columns: its copy of this row comes back without them.
    const server: Partial<Attempt> = { ...mine };
    delete server.provenance;
    delete server.attemptId;
    const elsewhere = { ...server, id: "other-device-1", seed: 12 };
    applyRemote((s) => mergeRemote(s, { changes: { attempts: [{ id: mine.id, data: server }, { id: elsewhere.id, data: elsewhere }] } }, "a", () => false));
    resetMemory();
    expect(read().attempts.find((a) => a.id === mine.id)).toMatchObject({ provenance: "local-recorded", attemptId: attemptIdentity(source) });
    expect(read().attempts.find((a) => a.id === elsewhere.id)?.provenance).toBeUndefined();
  });
});
