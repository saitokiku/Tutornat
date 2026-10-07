import { describe, expect, it } from "vitest";
import { answerText, check } from "./answer";
import { makeItem, SKILLS } from "./skills";

// Every generator, every level, many seeds, both languages: the stored answer must check as correct,
// a wrong answer must not, and the copy must be complete. One wrong key destroys trust, so this runs wide.

const SEEDS = Array.from({ length: 120 }, (_, i) => i * 7919 + 13);

describe("skill map", () => {
  it("has unique ids and prerequisites that exist and come first", () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const seen = new Set<string>();
    for (const s of SKILLS) {
      for (const p of s.prereqs) expect(seen.has(p), `${s.id} needs ${p} listed earlier`).toBe(true);
      seen.add(s.id);
      expect(s.title.en && s.title.es).toBeTruthy();
    }
  });
});

describe.each(SKILLS.map((s) => [s.id, s] as const))("%s", (id, skill) => {
  it("builds valid, checkable items at every level in English and Spanish", () => {
    for (let level = 1; level <= skill.levels; level++) {
      for (const seed of SEEDS) {
        for (const locale of ["en", "es"] as const) {
          const item = makeItem(id, level, seed, locale);
          const where = `${id} L${level} seed ${seed} ${locale}`;
          expect(item.hints.length, where).toBeGreaterThanOrEqual(2);
          expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
          expect(item.say.trim(), where).not.toBe("");
          expect(item.say, `${where} say has notation`).not.toMatch(/\^|\d\/\d|\{|\}/);
          if (item.visual || item.picture) expect(item.alt?.trim(), `${where} alt`).toBeTruthy();
          expect(item.seconds, where).toBeGreaterThan(0);
          if (item.input === "choices") {
            expect(item.choices?.length, where).toBeGreaterThanOrEqual(2);
            expect(item.answer.kind, where).toBe("choice");
            const labels = item.choices!.map((c) => c.label);
            expect(new Set(labels).size, `${where} duplicate choices ${labels}`).toBe(labels.length);
          }
          if (item.answer.kind === "choice") {
            expect(item.answer.index, where).toBeGreaterThanOrEqual(0);
            expect(item.answer.index, where).toBeLessThan(item.choices!.length);
            expect(check(item.answer, item.answer.index).correct, where).toBe(true);
          } else {
            const right = answerText(item.answer, item.choices);
            expect(check(item.answer, right).correct, `${where} key ${right}`).toBe(true);
            expect(check(item.answer, "123456789").correct, `${where} accepts junk`).toBe(false);
          }
        }
      }
    }
  });

  it("is deterministic for a seed", () => {
    expect(makeItem(id, skill.levels, 42, "en")).toEqual(makeItem(id, skill.levels, 42, "en"));
  });
});
