import { describe, expect, it } from "vitest";
import { answerText } from "@/practice/answer";
import { makeItem, SKILLS } from "@/practice/skills";
import type { Locale } from "@/lib/types";
import { recheck, type CheckedAttempt } from "./recheck";

const right = (skillId: string, level: number, seed: number, locale: Locale = "en") => {
  const item = makeItem(skillId, level, seed, locale);
  return answerText(item.answer, item.choices);
};
const attempt = (a: Partial<CheckedAttempt> & Pick<CheckedAttempt, "skillId" | "seed">): CheckedAttempt => ({ level: 1, mode: "practice", correct: true, ...a });
const en = { locales: ["en", "es"] as Locale[], set: null };

describe("server re-check", () => {
  it("accepts a right answer it rebuilds itself, for every kind of answer", () => {
    for (const skillId of ["m.add.10", "m.count.10", "m.frac.addlike", "e.rhyme"]) {
      for (const seed of [1, 99, 123_456]) {
        const a = attempt({ skillId, seed, response: right(skillId, 1, seed) });
        expect(recheck(a, en), `${skillId} ${seed}`).toEqual({ correct: true, verdict: "verified" });
      }
    }
  });

  it("stores a forged 'right' as wrong", () => {
    const seed = 42;
    const truth = Number(right("m.add.10", 1, seed));
    expect(recheck(attempt({ skillId: "m.add.10", seed, response: String(truth + 1) }), en)).toEqual({ correct: false, verdict: "forged" });
    expect(recheck(attempt({ skillId: "m.add.10", seed }), en)).toEqual({ correct: false, verdict: "forged" });
    // A choice label that is not the right one.
    const item = makeItem("m.count.10", 1, seed, "en");
    const wrongLabel = item.choices!.find((c) => c.label !== answerText(item.answer, item.choices))!.label;
    expect(recheck(attempt({ skillId: "m.count.10", seed, response: wrongLabel }), en).verdict).toBe("forged");
  });

  it("rebuilds at the level and language the learner saw", () => {
    const skill = SKILLS.find((s) => s.id === "m.add.10")!;
    const top = skill.levels;
    const seed = 777;
    if (right("m.add.10", top, seed) !== right("m.add.10", 1, seed))
      expect(recheck(attempt({ skillId: "m.add.10", seed, level: 1, response: right("m.add.10", top, seed) }), en).verdict).toBe("forged");
    // A Spanish learner's choice label checks out even if the profile is English now.
    const es = right("e.rhyme", 1, 5, "es");
    expect(recheck(attempt({ skillId: "e.rhyme", seed: 5, response: es }), en).verdict).toBe("verified");
  });

  it("keeps wrong answers wrong and refuses a 'right' tutor turn", () => {
    expect(recheck(attempt({ skillId: "m.add.10", seed: 1, correct: false, response: "x" }), en)).toEqual({ correct: false, verdict: "wrong" });
    expect(recheck(attempt({ skillId: "m.add.10", seed: 1, mode: "tutor", response: right("m.add.10", 1, 1) }), en).verdict).toBe("forged");
  });

  it("ties answers to the set they came from: a check needs a check set and the problem must be in it", () => {
    const seed = 31;
    const response = right("m.add.10", 1, seed);
    const practice = { kind: "daily" as const, slots: [{ skillId: "m.add.10", seed, role: "main" as const }] };
    const checkSet = { kind: "check" as const, slots: [{ skillId: "m.add.10", seed, role: "check" as const, level: 1 }] };
    expect(recheck(attempt({ skillId: "m.add.10", seed, mode: "check", response }), { locales: ["en"], set: practice }).verdict).toBe("forged");
    expect(recheck(attempt({ skillId: "m.add.10", seed, mode: "check", response }), { locales: ["en"], set: null }).verdict).toBe("forged");
    expect(recheck(attempt({ skillId: "m.add.10", seed, mode: "check", response }), { locales: ["en"], set: checkSet }).verdict).toBe("verified");
    expect(recheck(attempt({ skillId: "m.add.10", seed: seed + 1, response: right("m.add.10", 1, seed + 1) }), { locales: ["en"], set: practice }).verdict).toBe("forged");
  });

  it("leaves open-topic answers unchecked and refuses unknown skills", () => {
    expect(recheck(attempt({ skillId: "ai:volcanoes", seed: 1, response: "Magma" }), en)).toEqual({ correct: true, verdict: "unchecked" });
    expect(recheck(attempt({ skillId: "m.made.up", seed: 1, response: "3" }), en).verdict).toBe("forged");
  });
});
