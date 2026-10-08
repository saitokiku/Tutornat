import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "./auth";
import { makeItem } from "@/practice/skills";
import { openPracticeAttempt, paceOf, recordAnswer, startSet, statusesOf, wholeMinutes } from "./practice";
import { createLearner } from "./profiles";
import { read, resetMemory, update } from "./store";
import type { Grade, Profile } from "./types";

afterEach(() => resetMemory());

const NOW = new Date(2026, 9, 7, 16, 0).getTime();

async function learner(grade: Grade = "3") {
  await signUp({ email: `p${Math.random().toString(36).slice(2)}@example.test`, password: "longenough", displayName: "Sam" });
  return createLearner({ nickname: "Ada", grade, locale: "en" }) as Profile;
}

describe("startSet: a new set is a teaching act", () => {
  it("a practice set intends to move the skill; resuming the plan line's open set logs nothing more", async () => {
    const p = await learner();
    const id = startSet(read(), { profile: p, kind: "daily", skillIds: ["m.frac.unit"], planKey: "2026-10-07:daily:math", now: NOW })!;
    expect(read().acts).toEqual([
      expect.objectContaining({ profileId: p.id, kind: "set", intent: "skill-moves", skillId: "m.frac.unit", setId: id, ref: "2026-10-07:daily:math", at: NOW }),
    ]);
    expect(read().acts[0].outcome).toBeUndefined();
    expect(startSet(read(), { profile: p, kind: "daily", skillIds: ["m.frac.unit"], planKey: "2026-10-07:daily:math", now: NOW })).toBe(id);
    expect(read().acts).toHaveLength(1);
    startSet(read(), { profile: p, kind: "pick", skillIds: ["m.frac.unit"], now: NOW });
    expect(read().acts.map((a) => a.kind)).toEqual(["set", "set"]);
  });

  it("a check decides; a prep set is about its school event; placement only measures", async () => {
    const p = await learner();
    const check = startSet(read(), { profile: p, kind: "check", skillIds: ["m.round"], now: NOW })!;
    const prep = startSet(read(), { profile: p, kind: "prep", skillIds: ["m.round", "m.frac.unit"], eventId: "ev1", now: NOW })!;
    startSet(read(), { profile: p, kind: "placement", skillIds: ["m.round"], now: NOW });
    expect(read().acts.map(({ kind, intent, setId, ref, skillId }) => ({ kind, intent, setId, ref, skillId }))).toEqual([
      { kind: "check", intent: "check-decides", setId: check, ref: undefined, skillId: "m.round" },
      { kind: "prep", intent: "test-goes-well", setId: prep, ref: "ev1", skillId: "m.round" },
    ]);
  });

  it("an unknown skill starts nothing and logs nothing", async () => {
    const p = await learner();
    expect(startSet(read(), { profile: p, kind: "pick", skillIds: ["nope"], now: NOW })).toBeNull();
    expect(read().acts).toEqual([]);
  });
});

describe("recordAnswer", () => {
  it("keeps the misconception on a wrong answer only", async () => {
    const p = await learner();
    const id = startSet(read(), { profile: p, kind: "pick", skillIds: ["m.frac.unit"], now: NOW })!;
    recordAnswer(id, { slot: 0, level: 1, correct: false, assisted: false, seconds: 12, response: "4/3", why: "flipped-the-fraction" });
    recordAnswer(id, { slot: 1, level: 1, correct: true, assisted: false, seconds: 9, response: "1/3", why: "should-not-stay" });
    const [miss, right] = read().attempts;
    expect(miss).toMatchObject({ correct: false, why: "flipped-the-fraction", response: "4/3", setId: id, mode: "practice" });
    expect(right.why).toBeUndefined();
  });

  it("a helped check answer stays a check answer, marked helped, and the check is graded with it", async () => {
    const p = await learner();
    const id = startSet(read(), { profile: p, kind: "check", skillIds: ["m.round"], now: NOW })!;
    recordAnswer(id, { slot: 0, level: 2, correct: true, assisted: true, seconds: 5 });
    expect(read().attempts[0]).toMatchObject({ mode: "check", assisted: true });
    // Two misses and one helped: three of five aren't on the learner's own, so the check is not passed.
    recordAnswer(id, { slot: 1, level: 2, correct: false, assisted: false, seconds: 5 });
    recordAnswer(id, { slot: 2, level: 2, correct: false, assisted: false, seconds: 5 });
    recordAnswer(id, { slot: 3, level: 2, correct: true, assisted: false, seconds: 5 });
    recordAnswer(id, { slot: 4, level: 2, correct: true, assisted: false, seconds: 5 });
    expect(read().attempts.filter((a) => a.setId === id).map((a) => a.mode)).toEqual(["check", "check", "check", "check", "check"]);
  });

  it("records one final answer for repeated submission of a slot", async () => {
    const p = await learner();
    const id = startSet(read(), { profile: p, kind: "pick", skillIds: ["m.round"], now: NOW })!;
    const answer = { slot: 0, level: 1, correct: true, assisted: false, seconds: 5, response: "10" };
    recordAnswer(id, answer);
    recordAnswer(id, answer);
    expect(read().attempts).toHaveLength(1);
    expect(read().attempts[0].id.length).toBeLessThanOrEqual(100);
  });

  it("refuses an answer at a difficulty different from the presented question", async () => {
    const p = await learner();
    const id = startSet(read(), { profile: p, kind: "pick", skillIds: ["m.round"], now: NOW })!;
    const a = openPracticeAttempt(id, 0, 1);
    expect(() => recordAnswer(id, { slot: 0, level: 2, attemptId: a.id, correct: true, assisted: false, seconds: 5 })).toThrow(expect.objectContaining({ reason: "stale" }));
    expect(read().attempts).toEqual([]);
  });

  it("the check law reads a helped check answer as not on the learner's own", async () => {
    const p = await learner();
    const id = startSet(read(), { profile: p, kind: "check", skillIds: ["m.round"], now: NOW })!;
    // Four right on their own and one helped: still a pass (4 of 5)…
    for (let i = 0; i < 5; i++) recordAnswer(id, { slot: i, level: 2, correct: true, assisted: i === 0, seconds: 5 });
    const passed = statusesOf(read(), p.id, NOW + 1000)["m.round"];
    expect(passed.state).toBe("checked");
    // …and three on their own with one helped and one miss is a failed check, counted as one.
    const again = startSet(read(), { profile: p, kind: "check", skillIds: ["m.round"], now: NOW })!;
    for (let i = 0; i < 5; i++) recordAnswer(again, { slot: i, level: 2, correct: i !== 1, assisted: i === 0, seconds: 5 });
    expect(statusesOf(read(), p.id, NOW + 2000)["m.round"].state).toBe("practicing");
  });

  it("a check skips the reading problems the learner just answered in practice", async () => {
    const p = await learner("4");
    const skillId = "e.passage.words";
    const practiced = Array.from({ length: 10 }, (_, i) => i * 31 + 7);
    update((s) => {
      practiced.forEach((seed, i) => s.attempts.push({ id: `a${i}`, profileId: p.id, at: NOW - 3600_000 + i, skillId, level: 2, seed, mode: "practice", correct: true, assisted: false, seconds: 40 }));
    });
    const look = (seed: number) => {
      const it = makeItem(skillId, 2, seed, "en");
      return JSON.stringify([it.passage, it.say]);
    };
    const seen = new Set(practiced.map(look));
    const id = startSet(read(), { profile: p, kind: "check", skillIds: [skillId], now: NOW })!;
    const slots = read().sets.find((x) => x.id === id)!.slots;
    expect(slots).toHaveLength(5);
    for (const slot of slots) expect(seen.has(look(slot.seed)), `seed ${slot.seed}`).toBe(false);
  });

  it("ignores answers to a finished set", async () => {
    const p = await learner();
    const id = startSet(read(), { profile: p, kind: "pick", skillIds: ["m.round"], now: NOW })!;
    update((s) => void (s.sets.find((x) => x.id === id)!.finishedAt = NOW));
    recordAnswer(id, { slot: 0, level: 1, correct: true, assisted: false, seconds: 5 });
    expect(read().attempts).toEqual([]);
  });
});

describe("pace in words", () => {
  it("compares time with the standard time, with room either side", () => {
    expect(paceOf(600, 600)).toBe("usual");
    expect(paceOf(780, 600)).toBe("usual");
    expect(paceOf(480, 600)).toBe("usual");
    expect(paceOf(420, 600)).toBe("quicker");
    expect(paceOf(840, 600)).toBe("slower");
    expect(paceOf(0, 600)).toBe("usual");
    expect(paceOf(50, 0)).toBe("usual");
  });

  it("never says slower or quicker when the minutes shown are the same", () => {
    expect(paceOf(84, 60)).toBe("usual");
    expect(paceOf(20, 60)).toBe("usual");
    expect(paceOf(150, 60)).toBe("slower");
  });

  it("rounds to whole minutes, never below one", () => {
    expect([10, 89, 90, 600].map(wholeMinutes)).toEqual([1, 1, 2, 10]);
  });
});
