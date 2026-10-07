import { describe, expect, it } from "vitest";
import {
  buildCheckSlots,
  buildPracticeSlots,
  buildReviewSlots,
  defaultStart,
  levelInSet,
  nextSkill,
  placementNext,
  RULES,
  skillStatus,
} from "./engine";
import type { Attempt, Mode } from "./types";

const H = 3600_000, D = 24 * H;
const T0 = new Date("2026-09-01T16:00:00").getTime();
let n = 0;
const at = (skillId: string, t: number, correct: boolean, o: Partial<Attempt> & { mode?: Mode } = {}): Attempt => ({
  id: `a${n++}`,
  profileId: "p",
  at: t,
  skillId,
  level: 1,
  seed: n,
  mode: "practice",
  correct,
  assisted: false,
  seconds: 5,
  ...o,
});
/** k correct-on-own practice answers at a level, one minute apart, in one set. */
const run = (skillId: string, t: number, k: number, level = 1, setId = `s${t}`) =>
  Array.from({ length: k }, (_, i) => at(skillId, t + i * 60_000, true, { level, setId }));
const check = (skillId: string, t: number, right: number, level = 1) =>
  Array.from({ length: RULES.checkSize }, (_, i) => at(skillId, t + i * 60_000, i < right, { mode: "check", setId: `c${t}`, level }));

describe("skill status", () => {
  it("starts new, then practicing", () => {
    expect(skillStatus("m.add.5", [], T0).state).toBe("new");
    expect(skillStatus("m.add.5", [at("m.add.5", T0, false)], T0).state).toBe("practicing");
  });

  it("steps up a level after five right on your own, and down after two misses", () => {
    expect(skillStatus("m.add.10", run("m.add.10", T0, 5, 1), T0 + H).level).toBe(2);
    const down = [...run("m.add.10", T0, 5, 1), at("m.add.10", T0 + H, false, { level: 2 }), at("m.add.10", T0 + H + 1, false, { level: 2 })];
    expect(skillStatus("m.add.10", down, T0 + 2 * H).level).toBe(1);
  });

  it("is ready after nine of ten right on your own at the top level; the check opens the next day, or 48 h after help", () => {
    const answers = [...run("m.add.5", T0, 9), at("m.add.5", T0 + 10 * 60_000, false)];
    const s = skillStatus("m.add.5", answers, T0 + H);
    expect(s.state).toBe("ready");
    expect(s.checkOpensAt).toBe(T0 + 10 * 60_000 + RULES.practiceQuietMs);
    const helped = [at("m.add.5", T0 - H, true, { assisted: true }), ...run("m.add.5", T0, 10)];
    expect(skillStatus("m.add.5", helped, T0 + H).checkOpensAt).toBe(T0 - H + RULES.helpQuietMs);
  });

  it("is not ready when help was used on the top-level answers", () => {
    const answers = run("m.add.5", T0, 10).map((a, i) => (i < 2 ? { ...a, assisted: true } : a));
    expect(skillStatus("m.add.5", answers, T0 + H).state).toBe("practicing");
  });

  it("proves only with two passed checks on different days, six or more days apart", () => {
    const base = run("m.add.5", T0, 10);
    const first = check("m.add.5", T0 + 3 * D, 5);
    expect(skillStatus("m.add.5", [...base, ...first], T0 + 3 * D + H).state).toBe("checked");
    const tooSoon = check("m.add.5", T0 + 5 * D, 5);
    expect(skillStatus("m.add.5", [...base, ...first, ...tooSoon], T0 + 5 * D + H).state).toBe("checked");
    const second = check("m.add.5", T0 + 9 * D + H, 4);
    const s = skillStatus("m.add.5", [...base, ...first, ...second], T0 + 10 * D);
    expect(s.state).toBe("proved");
    expect(s.reviewDueAt).toBe(s.provedAt! + RULES.reviewDays[0] * D);
  });

  it("a failed check sends the skill back to practicing and needs fresh answers", () => {
    const answers = [...run("m.add.5", T0, 10), ...check("m.add.5", T0 + 3 * D, 2)];
    expect(skillStatus("m.add.5", answers, T0 + 3 * D + H).state).toBe("practicing");
    const again = [...answers, ...run("m.add.5", T0 + 4 * D, 10)];
    expect(skillStatus("m.add.5", again, T0 + 4 * D + H).state).toBe("ready");
  });

  it("needs a refresh after two review misses in a row, and a passed check restores it", () => {
    const proved = [...run("m.add.5", T0, 10), ...check("m.add.5", T0 + 3 * D, 5), ...check("m.add.5", T0 + 10 * D, 5)];
    const misses = [at("m.add.5", T0 + 20 * D, false, { mode: "review" }), at("m.add.5", T0 + 20 * D + 1, false, { mode: "review" })];
    expect(skillStatus("m.add.5", [...proved, ...misses], T0 + 21 * D).state).toBe("refresh");
    const restored = [...proved, ...misses, ...check("m.add.5", T0 + 23 * D, 5)];
    expect(skillStatus("m.add.5", restored, T0 + 24 * D).state).toBe("proved");
  });

  it("flags stuck after three sets under 60% on your own", () => {
    const set = (t: number) => [at("m.add.5", t, true, { setId: `x${t}` }), at("m.add.5", t + 1, false, { setId: `x${t}` }), at("m.add.5", t + 2, false, { setId: `x${t}` })];
    expect(skillStatus("m.add.5", [...set(T0), ...set(T0 + D), ...set(T0 + 2 * D)], T0 + 3 * D).stuck).toBe(true);
  });

  it("marks a ready skill overdue after 14 days without a check", () => {
    const s = skillStatus("m.add.5", run("m.add.5", T0, 10), T0 + 16 * D);
    expect(s.state).toBe("ready");
    expect(s.overdue).toBe(true);
  });
});

describe("what comes next", () => {
  it("starts a grade below by default", () => {
    expect(defaultStart("math", "K")).toBe("m.count.10");
    expect(defaultStart("math", "1")).toBe("m.count.10");
    expect(defaultStart("math", "2")).toBe("m.add.10");
  });

  it("walks the map in order and waits for prerequisites", () => {
    expect(nextSkill("math", {}, "m.count.10")).toBe("m.count.10");
    const ready = { "m.count.10": skillStatus("m.count.10", run("m.count.10", T0, 10, 2), T0 + H) };
    expect(ready["m.count.10"].state).toBe("ready");
    expect(nextSkill("math", ready, "m.count.10")).toBe("m.count.20");
    // Skills before the start count as known prerequisites.
    expect(nextSkill("math", {}, "m.add.20")).toBe("m.add.20");
  });

  it("placement ends within 12 problems and starts at the last skill answered right", () => {
    const answers: { skillId: string; correct: boolean }[] = [];
    for (let k = 0; k < 30; k++) {
      const next = placementNext("math", "1", answers);
      if ("done" in next) {
        expect(answers.length).toBeLessThanOrEqual(12);
        expect(next.start).toBeTruthy();
        return;
      }
      answers.push({ skillId: next.skillId, correct: answers.length < 3 });
    }
    throw new Error("placement never finished");
  });
});

describe("building sets", () => {
  const seed = (() => {
    let s = 1;
    return () => s++;
  })();

  it("practice sets are sized by grade and interleave due reviews", () => {
    expect(buildPracticeSlots({ skillId: "m.add.10", grade: "1", statuses: {}, now: T0, seed })).toHaveLength(6);
    const slots = buildPracticeSlots({ skillId: "m.add.2digit", grade: "3", statuses: {}, now: T0, seed, recent: ["m.add.20", "m.sub.20"] });
    expect(slots).toHaveLength(10);
    expect(slots[3]).toMatchObject({ skillId: "m.add.20", role: "review" });
    expect(slots[7]).toMatchObject({ skillId: "m.sub.20", role: "review" });
  });

  it("checks use the top level and fresh seeds", () => {
    const slots = buildCheckSlots("m.add.10", seed);
    expect(slots).toHaveLength(RULES.checkSize);
    expect(new Set(slots.map((s) => s.seed)).size).toBe(RULES.checkSize);
    expect(slots.every((s) => s.level === 2 && s.role === "check")).toBe(true);
  });

  it("review sets interleave skills", () => {
    expect(buildReviewSlots(["m.add.5", "m.sub.5"], {}, seed).map((s) => s.skillId)).toEqual(["m.add.5", "m.sub.5", "m.add.5", "m.sub.5", "m.add.5", "m.sub.5"]);
  });

  it("levels step inside a set", () => {
    const right = { correct: true, assisted: false };
    expect(levelInSet(1, 3, Array(5).fill(right))).toBe(2);
    expect(levelInSet(2, 3, [{ correct: false, assisted: false }, { correct: false, assisted: false }])).toBe(1);
    expect(levelInSet(1, 1, Array(9).fill(right))).toBe(1);
  });
});
