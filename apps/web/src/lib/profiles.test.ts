import { afterEach, describe, expect, it } from "vitest";
import { logAct, resolvedActsOf } from "./acts";
import { signUp } from "./auth";
import { createLearner, setTeaching, teachingOf, TEACHING_NOTE_MAX, updateLearner } from "./profiles";
import { read, resetMemory, update } from "./store";
import type { Profile } from "./types";

afterEach(() => resetMemory());

async function kid() {
  await signUp({ email: "p@example.com", password: "longenough", displayName: "Sam" });
  return createLearner({ nickname: "Ada", grade: "3", locale: "en" }) as Profile;
}
const teachingOfAda = () => read().profiles[0].teaching;

describe("setTeaching", () => {
  it("stores a grown-up's choices, cleaned", async () => {
    const a = await kid();
    setTeaching(a.id, { representation: "pictures", leadWith: "example", note: "  likes   drawing \n\n\n\n  no timers " });
    expect(teachingOfAda()).toEqual({ representation: "pictures", leadWith: "example", note: "likes drawing\n\nno timers" });
    setTeaching(a.id, { note: "x".repeat(TEACHING_NOTE_MAX + 50) });
    expect(teachingOfAda()?.note).toHaveLength(TEACHING_NOTE_MAX);
  });

  it("replaces what was there; a missing choice goes back to the record, and {} clears every edit", async () => {
    const a = await kid();
    setTeaching(a.id, { representation: "pictures", leadWith: "hint" });
    setTeaching(a.id, { representation: "words" });
    expect(teachingOfAda()).toEqual({ representation: "words" });
    setTeaching(a.id, {});
    expect(read().profiles[0]).not.toHaveProperty("teaching");
  });

  it("drops values that aren't choices", async () => {
    const a = await kid();
    setTeaching(a.id, { representation: "sticks" as never, leadWith: "lecture" as never, note: "   " });
    expect(read().profiles[0]).not.toHaveProperty("teaching");
  });

  it("turns the profile off, deleting choices and note, and back on", async () => {
    const a = await kid();
    setTeaching(a.id, { representation: "pictures", note: "likes drawing" });
    setTeaching(a.id, { off: true, representation: "words", note: "kept?" });
    expect(teachingOfAda()).toEqual({ off: true });
    const off = teachingOf(read(), read().profiles[0], Date.now());
    expect(off.off).toBe(true);
    expect(off.note).toBeUndefined();
    setTeaching(a.id, {});
    expect(read().profiles[0]).not.toHaveProperty("teaching");
  });

  it("only changes a learner in the signed-in family", async () => {
    const a = await kid();
    await signUp({ email: "other@example.com", password: "longenough", displayName: "Lee" });
    setTeaching(a.id, { representation: "pictures" });
    expect(read().profiles.find((p) => p.id === a.id)).not.toHaveProperty("teaching");
  });
});

describe("renaming a learner", () => {
  it("carries the new name into the note for the tutor, so the old one can't slip past the scrub", async () => {
    await signUp({ email: "p@example.com", password: "longenough", displayName: "Sam" });
    const kid = createLearner({ nickname: "Isabella", grade: "3", locale: "en" }) as Profile;
    setTeaching(kid.id, { note: "Isabella gets anxious with timers; isabella's sister helps" });
    expect(updateLearner(kid.id, { nickname: "Bella", grade: "3", locale: "en" })).toBeNull();
    expect(read().profiles[0]).toMatchObject({ nickname: "Bella", teaching: { note: "Bella gets anxious with timers; Bella's sister helps" } });
    // Same name: the note is left exactly as written.
    updateLearner(kid.id, { nickname: "Bella", grade: "4", locale: "en" });
    expect(read().profiles[0].teaching?.note).toBe("Bella gets anxious with timers; Bella's sister helps");
  });
});

describe("teachingOf and resolvedActsOf", () => {
  it("read this learner's record with their grown-up's choices, cached until the record changes", async () => {
    const a = await kid();
    setTeaching(a.id, { representation: "blocks" });
    const now = Date.now();
    const ada = read().profiles[0];
    const first = teachingOf(read(), ada, now);
    expect(first.representation).toMatchObject({ value: "blocks", source: "grown-up" });
    expect(teachingOf(read(), ada, now)).toBe(first);
    logAct({ profileId: a.id, kind: "tutor", intent: "next-try-right", skillId: "m.add.20", ref: "t1" });
    expect(teachingOf(read(), read().profiles[0], now)).not.toBe(first);
    expect(resolvedActsOf(read(), a.id, now)).toMatchObject([{ kind: "tutor", status: "pending" }]);
    expect(resolvedActsOf(read(), "someone-else", now)).toEqual([]);
  });

  it("an answer after a tutor talk resolves its act", async () => {
    const a = await kid();
    const at = Date.now() - 3600_000;
    logAct({ profileId: a.id, kind: "tutor", intent: "next-try-right", skillId: "m.add.20", ref: "t1" }, { at });
    update((s) => void s.attempts.push({ id: "x", profileId: a.id, at: at + 60_000, skillId: "m.add.20", level: 1, seed: 3, setId: "s", mode: "practice", correct: true, assisted: false, seconds: 7 }));
    expect(resolvedActsOf(read(), a.id, Date.now())[0]).toMatchObject({ status: "met", resolvedAt: at + 60_000 });
  });
});
