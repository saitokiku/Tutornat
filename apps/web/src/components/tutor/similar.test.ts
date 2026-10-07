// @vitest-environment node
import { describe, expect, it } from "vitest";
import { makeItem, SKILLS } from "@/practice/skills";
import { sameNumbers, sameProblem, similarItem } from "./similar";

// "One like it, worked out" must never be the learner's own problem: its steps would be their answer.

describe("sameProblem", () => {
  it("is the same question with the same answer, however it was drawn", () => {
    const a = makeItem("m.add.5", 1, 11, "en");
    expect(sameProblem(a, makeItem("m.add.5", 1, 11, "en"))).toBe(true);
    const other = Array.from({ length: 50 }, (_, i) => makeItem("m.add.5", 1, 100 + i, "en")).find((b) => b.say !== a.say)!;
    expect(sameProblem(a, other)).toBe(false);
  });
});

describe("similarItem", () => {
  // Small skills repeat often from a fresh seed: count to 10 about one draw in four.
  const SMALL = ["m.count.10", "m.add.5", "m.next.number", "m.frac.unit", "e.letter.sounds", "e.rhyme", "e.capitals", "s.living"];

  it("never hands back the problem on screen, whatever the seed", () => {
    for (const id of SMALL) {
      const mine = makeItem(id, 1, 1, "en");
      for (let seed = 1; seed <= 150; seed++) {
        const like = similarItem(id, 1, "en", seed, { item: mine });
        expect(like, `${id} seed ${seed}`).not.toBeNull();
        expect(sameProblem(like!, mine), `${id} seed ${seed}`).toBe(false);
        expect(like!.skillId).toBe(id);
      }
    }
  });

  it("is a plain fresh problem when there is nothing to avoid, and the same one for the same seed", () => {
    expect(similarItem("m.frac.addunlike", 2, "es", 77)).toEqual(makeItem("m.frac.addunlike", 2, 77, "es"));
  });

  it("works for every skill on the map", () => {
    for (const s of SKILLS) {
      const mine = makeItem(s.id, 1, 5, "en");
      const like = similarItem(s.id, 1, "en", 5, { item: mine });
      expect(like && !sameProblem(like, mine), s.id).toBe(true);
    }
  });
});

describe("sameNumbers", () => {
  it("knows a typed problem by its numbers, in any order", () => {
    const sum = Array.from({ length: 200 }, (_, i) => makeItem("m.add.10", 1, i + 1, "en")).find((x) => x.prompt.join("").includes("6 + 2"))!;
    expect(sameNumbers(sum, "6 + 2")).toBe(true);
    expect(sameNumbers(sum, "what is 2 + 6?")).toBe(true);
    expect(sameNumbers(sum, "6 + 3")).toBe(false);
    expect(sameNumbers(sum, "how do I add")).toBe(false);
  });

  it("re-draws a worked example that would solve any problem they typed", () => {
    for (let seed = 1; seed <= 150; seed++) {
      const like = similarItem("m.add.5", 1, "en", seed, { typed: ["3 + 1", "hello", "2 + 2"] })!;
      expect(sameNumbers(like, "3 + 1"), `seed ${seed}`).toBe(false);
      expect(sameNumbers(like, "2 + 2"), `seed ${seed}`).toBe(false);
    }
  });
});
