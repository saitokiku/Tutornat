import { describe, expect, it } from "vitest";
import { makeItem, SKILLS } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { answerSpots, hintSpot } from "./spot-hints";
import { isSpotId } from "./spotlight";

const ladder = (item: Item) => item.hints.map((_, i) => hintSpot(item, i));
const both = (skillId: string, level = 1, seed = 1) => (["en", "es"] as const).map((l) => ladder(makeItem(skillId, level, seed, l)));

describe("hintSpot", () => {
  it("follows place value through a column sum: ones first, then the tens", () => {
    for (const l of both("m.add.2digit")) expect(l).toEqual(["visual.column.ones", "visual.column.tens", "visual.column.tens"]);
    expect(both("m.addsub.1000")[0]).toEqual(["visual.column.ones", null, "visual.column.hundreds"]);
  });

  it("points at the tens rods when the hint counts tens", () => {
    for (const l of both("m.place.tens")) expect(l).toEqual([null, "visual.baseten.tens", null]);
  });

  it("names the clock hand the hint is about", () => {
    for (const l of both("m.time.clock")) expect(l).toEqual(["visual.clock.hour", "visual.clock.minute", "visual.clock.minute"]);
  });

  it("finds a fraction's top or bottom only when one fraction can be meant", () => {
    // 1/4 = ?/8: "the top and the bottom" of the given fraction, then its top.
    for (const l of both("m.frac.equiv")) expect(l).toEqual([null, "practice.prompt.part.0", "practice.prompt.part.0.top"]);
    // 1/12 ? 1/2: "the top numbers" — two fractions, so no guess.
    for (const l of both("m.frac.compare")) expect(l[0]).toBeNull();
    // The bar, then where the bottom number goes in the answer.
    for (const l of both("m.frac.unit")) expect(l).toEqual(["visual.fraction", "visual.fraction", "practice.pad.fraction.bottom"]);
    for (const l of both("m.frac.numberline")) expect(l).toEqual(["visual.numberline", "visual.numberline.marker", "practice.pad.fraction.bottom"]);
  });

  it("points at the one exponent, the empty boxes, the top row", () => {
    for (const l of both("m.exp.whole")) expect(l[0]).toBe("practice.prompt.part.0.exp");
    for (const l of both("m.make.10")) expect(l[0]).toBe("visual.tenframe.empty");
    for (const l of both("m.count.10")) expect(l[1]).toBe("visual.dots.row.0");
  });

  it("is null for a rung that does not exist", () => {
    expect(hintSpot(makeItem("m.add.2digit", 1, 1, "en"), 9)).toBeNull();
  });

  it("across every skill: a valid id or null, the same in both languages, and never a choice", () => {
    const allowed = /^(visual\.(column|baseten)\.(ones|tens|hundreds|thousands)|visual\.clock\.(hour|minute)|visual\.numberline(\.marker)?|visual\.fraction|visual\.tenframe\.empty|visual\.dots\.row\.0|practice\.pad\.fraction\.(top|bottom)|practice\.prompt\.part\.\d+(\.(top|bottom|exp))?)$/;
    let found = 0;
    for (const skill of SKILLS)
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of [1, 2, 3]) {
          const [en, es] = both(skill.id, level, seed);
          expect(es, `${skill.id} L${level} seed ${seed}`).toEqual(en);
          for (const id of en.filter((x): x is string => x !== null)) {
            found++;
            expect(isSpotId(id)).toBe(true);
            expect(id, skill.id).toMatch(allowed);
          }
        }
    expect(found).toBeGreaterThan(40);
  });
});

describe("answerSpots", () => {
  it("guards the correct choice", () => {
    const item = makeItem("m.compare.10", 1, 4, "en");
    expect(item.answer.kind).toBe("choice");
    expect(answerSpots(item)).toEqual([`practice.choice.${(item.answer as { index: number }).index}`]);
  });

  it("guards the answer's tick on a number-line pad", () => {
    const item = { ...makeItem("m.frac.numberline", 1, 1, "en"), input: "number-line", pad: { kind: "number-line", min: 0, max: 1, step: 0.25 }, answer: { kind: "fraction", n: 3, d: 4 } } as Item;
    expect(answerSpots(item)).toEqual(["practice.pad.numberline.tick.3"]);
    expect(answerSpots(makeItem("m.add.10", 1, 1, "en"))).toEqual([]);
  });
});
