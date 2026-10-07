import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttemptSource } from "@/learning/types";
import { assistanceFor, openOrResumeAttempt, recordFirstResponse, recordHelpExposure } from "./evidence";
import { exportFamily, deleteLearnerData } from "./export";
import { statusesOf } from "./practice";
import { removeLearner } from "./profiles";
import { mergeRemote } from "./sync";
import { appendEvidence, applyRemote, read, resetMemory, STORE_KEY, update } from "./store";

const source: AttemptSource = { profileId: "p", skillId: "m.add.5", itemFingerprint: "m.add.5:1:11", contentVersion: "legacy", kind: "set-slot", setId: "set", slotId: "0" };
const NOW = 1_790_000_000_000;

beforeEach(() => {
  update((s) => {
    s.accounts.push({ id: "a", email: "parent@example.test", displayName: "Parent", salt: "", passwordHash: "", createdAt: NOW });
    s.profiles.push({ id: "p", accountId: "a", nickname: "Ada", grade: "3", locale: "en", color: "#000", createdAt: NOW });
    s.session = { accountId: "a", profileId: "p" };
  });
});
afterEach(() => { vi.restoreAllMocks(); resetMemory(); });

describe("durable question evidence", () => {
  it("a synced learner tombstone purges every new local evidence collection", () => {
    const a = openOrResumeAttempt(source);
    recordHelpExposure({ attemptId: a.id, kind: "hint" });
    recordFirstResponse({ attemptId: a.id, response: "3", correct: true });
    applyRemote((s) => mergeRemote(s, { changes: { profiles: [{ id: "p", deleted: true }] } }, "a", () => false));
    resetMemory();
    expect(read().profiles).toEqual([]);
    expect(read().attemptContexts).toEqual([]);
    expect(read().helpExposures).toEqual([]);
    expect(read().responseEvents).toEqual([]);
  });

  it("a server correction survives failure during journal reconciliation", () => {
    appendEvidence("attempts", { id: "final-1", profileId: "p", skillId: "m.add.5", level: 1, seed: 11, mode: "practice", correct: true, assisted: false, seconds: 1, at: NOW, provenance: "local-recorded" });
    const save = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith("kaizenedu.evidence.v1.attempts:")) throw new DOMException("Full", "QuotaExceededError");
      save.call(this, key, value);
    });
    applyRemote((s) => { s.attempts[0].correct = false; });
    resetMemory();
    expect(read().attempts[0].correct).toBe(false);
  });

  it("a canonical journal correction also survives an older tab's document save", () => {
    appendEvidence("attempts", { id: "final-1", profileId: "p", skillId: "m.add.5", level: 1, seed: 11, mode: "practice", correct: true, assisted: false, seconds: 1, at: NOW, provenance: "local-recorded" });
    const stale = localStorage.getItem(STORE_KEY)!;
    applyRemote((s) => { s.attempts[0].correct = false; });
    localStorage.setItem(STORE_KEY, stale);
    resetMemory();
    expect(read().attempts[0].correct).toBe(false);
  });

  it("a server correction replaces the provisional final answer in the journal too", () => {
    appendEvidence("attempts", { id: "final-1", profileId: "p", skillId: "m.add.5", level: 1, seed: 11, mode: "practice", correct: true, assisted: false, seconds: 1, at: NOW, provenance: "local-recorded" });
    applyRemote((s) => { s.attempts[0].correct = false; });
    resetMemory();
    expect(read().attempts[0].correct).toBe(false);
    update((s) => void (s.prefs.locale = "es"));
    resetMemory();
    expect(read().attempts[0].correct).toBe(false);
  });

  it("a remote deletion cannot be resurrected by the journal", () => {
    appendEvidence("activity", { id: "activity-1", profileId: "p", courseId: "c", lessonId: "l", type: "quiz_answered", at: NOW, correct: true });
    applyRemote((s) => { s.activity = []; });
    resetMemory();
    expect(read().activity).toEqual([]);
  });

  it("opens one identity before a response, resumes it, and distinguishes a fresh item", () => {
    const a = openOrResumeAttempt(source);
    expect(read().attempts).toEqual([]);
    resetMemory();
    const resumed = openOrResumeAttempt(source);
    expect(resumed.id).toBe(a.id);
    expect(openOrResumeAttempt({ ...source, itemFingerprint: "m.add.5:1:12" }).id).not.toBe(a.id);
    expect(read().attemptContexts).toHaveLength(2);
  });

  it("resuming unchanged work preserves the external-store snapshot", () => {
    openOrResumeAttempt(source);
    const snapshot = read();
    openOrResumeAttempt(source);
    expect(read()).toBe(snapshot);
  });

  it("help_survives_reload_and_abandon and restarts the skill's quiet period", () => {
    const a = openOrResumeAttempt(source);
    recordHelpExposure({ attemptId: a.id, id: "hint-1", kind: "hint", detail: "1", capturedAt: NOW });
    resetMemory();
    const resumed = openOrResumeAttempt(source);
    expect(assistanceFor(resumed.id)).toEqual({ assisted: true, exposureIds: ["hint-1"], lastHelpAt: NOW });
    expect(resumed.help).toEqual([expect.objectContaining({ id: "hint-1", delivery: "released", itemFingerprint: "m.add.5:1:11" })]);
    expect(statusesOf(read(), "p", NOW + 1000)["m.add.5"].lastHelpAt).toBe(NOW);
  });

  it("miss_survives_reload and cannot be replaced by a successful correction", () => {
    const a = openOrResumeAttempt(source);
    const first = recordFirstResponse({ attemptId: a.id, id: "response-1", response: "4", correct: false, capturedAt: NOW });
    expect(first.assisted).toBe(false);
    resetMemory();
    const correction = recordFirstResponse({ attemptId: a.id, id: "response-2", response: "3", correct: true, capturedAt: NOW + 1000 });
    expect(correction).toEqual(first);
    expect(assistanceFor(a.id)).toMatchObject({ assisted: true, lastHelpAt: NOW });
    expect(read().responseEvents).toHaveLength(1);
  });

  it("stale two-tab saves cannot erase help or the first response", () => {
    const a = openOrResumeAttempt(source);
    const staleTab = localStorage.getItem(STORE_KEY)!;
    recordHelpExposure({ attemptId: a.id, id: "hint-1", kind: "hint", capturedAt: NOW });
    recordFirstResponse({ attemptId: a.id, id: "response-1", response: "3", correct: true, capturedAt: NOW + 1000 });
    // A tab that loaded before both events completes its whole-document save last.
    localStorage.setItem(STORE_KEY, staleTab);
    resetMemory();
    expect(openOrResumeAttempt(source).id).toBe(a.id);
    expect(assistanceFor(a.id).assisted).toBe(true);
    expect(read().responseEvents).toEqual([expect.objectContaining({ response: "3", assisted: true })]);
    update((s) => void (s.prefs.locale = "es"));
    resetMemory();
    expect(assistanceFor(a.id).exposureIds).toEqual(["hint-1"]);
  });

  it("repeat event IDs are idempotent and immutable", () => {
    const a = openOrResumeAttempt(source);
    const first = recordHelpExposure({ attemptId: a.id, id: "hint-1", kind: "hint", capturedAt: NOW });
    expect(recordHelpExposure({ attemptId: a.id, id: "hint-1", kind: "steps", capturedAt: NOW + 1000 })).toEqual(first);
    resetMemory();
    expect(read().helpExposures).toEqual([first]);
  });

  it("refuses to release help when it cannot be saved", () => {
    const a = openOrResumeAttempt(source);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    expect(() => recordHelpExposure({ attemptId: a.id, kind: "hint", capturedAt: NOW })).toThrow(/save/i);
    expect(assistanceFor(a.id).assisted).toBe(false);
  });

  it("exports the ledger and deletion prevents its local journal from resurrecting it", () => {
    const a = openOrResumeAttempt(source);
    recordHelpExposure({ attemptId: a.id, id: "hint-1", kind: "hint", capturedAt: NOW });
    expect(exportFamily(read(), "a")?.data.helpExposures).toEqual([expect.objectContaining({ id: "hint-1" })]);
    deleteLearnerData("p");
    resetMemory();
    expect(read().helpExposures).toEqual([]);
    expect(read().attemptContexts).toEqual([]);
    expect(() => recordHelpExposure({ attemptId: a.id, kind: "hint", capturedAt: NOW })).toThrow();
  });

  it("removing a learner clears the evidence lists and their journal", () => {
    const a = openOrResumeAttempt(source);
    recordHelpExposure({ attemptId: a.id, kind: "hint", capturedAt: NOW });
    recordFirstResponse({ attemptId: a.id, response: "3", correct: true, capturedAt: NOW + 1 });
    removeLearner("p");
    resetMemory();
    expect(read().attemptContexts).toEqual([]);
    expect(read().helpExposures).toEqual([]);
    expect(read().responseEvents).toEqual([]);
  });

  it("an event ID from another question cannot admit unrecorded help", () => {
    const a = openOrResumeAttempt(source);
    const b = openOrResumeAttempt({ ...source, slotId: "1", itemFingerprint: "other" });
    recordHelpExposure({ attemptId: a.id, id: "turn-1", kind: "tutor" });
    expect(() => recordHelpExposure({ attemptId: b.id, id: "turn-1", kind: "tutor" })).toThrow();
    expect(assistanceFor(b.id).assisted).toBe(false);
  });
});
