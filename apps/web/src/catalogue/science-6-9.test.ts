import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/types";
import atoms from "./science-atoms";
import cells from "./science-cells";
import cellsEs from "./science-cells-es";
import ecosystems from "./science-ecosystems";
import ecosystemsEs from "./science-ecosystems-es";
import heredity from "./science-heredity";
import heredityEs from "./science-heredity-es";
import weather from "./science-weather-climate";

// The grade 6-8 science courses. A quiz shows its choices and a sorter its items in the order they are
// written, so the order must not give the answer away.
const COURSES = [cells, cellsEs, weather, ecosystems, ecosystemsEs, atoms, heredity, heredityEs];
const TWINS = [
  [cells, cellsEs],
  [ecosystems, ecosystemsEs],
  [heredity, heredityEs],
] as const;

/** Everything in a lesson that decides right and wrong, without the words. */
const keys = (lessons: Lesson[]) =>
  lessons.map((l) => ({
    id: l.id,
    scenes: l.scenes.map((s) => {
      if (s.kind === "quiz") return { id: s.id, quiz: s.questions.map((q) => [q.id, q.choices.length, q.answer]) };
      if (s.kind === "slide")
        return {
          id: s.id,
          visuals: s.blocks.flatMap((b) => (b.type !== "visual" ? [] : b.visual.kind === "line-graph" ? [{ ...b.visual, xLabel: "", yLabel: "" }] : [b.visual])),
        };
      if (s.kind === "project") return { id: s.id, steps: s.steps.length };
      const w = s.widget;
      return { id: s.id, widget: w.kind === "sorter" ? { categories: w.categories.length, items: w.items.map((i) => [i.id, i.answer]) } : w };
    }),
  }));

const questions = (lessons: Lesson[]) =>
  lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "quiz" ? s.questions.map((q) => ({ ...q, where: `${l.id}/${s.id}/${q.id}` })) : [])));

describe("grade 6-8 science courses", () => {
  it("keep English and Spanish in step: same lessons, scenes, keys, widgets and pictures", () => {
    for (const [en, es] of TWINS) {
      expect(es.id).toBe(`${en.id}-es`);
      expect([es.grade, es.subject, es.locale]).toEqual([en.grade, en.subject, "es"]);
      expect(keys(es.lessons), es.id).toEqual(keys(en.lessons));
    }
  });

  it("spread quiz keys over the choices, and the key is not the one long choice", () => {
    for (const c of COURSES) {
      const qs = questions(c.lessons);
      const bySlot = [0, 1, 2, 3].map((slot) => qs.filter((q) => q.answer === slot).length);
      expect(Math.max(...bySlot), `${c.id} keys by slot: ${bySlot}`).toBeLessThanOrEqual(Math.ceil(qs.length * 0.4));
      // A key that runs well past every other choice is a cue a child can follow without reading.
      const giveaways = qs.filter((q) => {
        const key = q.choices[q.answer].length;
        const other = Math.max(...q.choices.filter((_, i) => i !== q.answer).map((x) => x.length));
        return key > 1.2 * other && key - other >= 10;
      });
      expect(giveaways.map((q) => q.where), c.id).toEqual([]);
    }
  });

  it("list sorter items out of category order", () => {
    for (const c of COURSES)
      for (const l of c.lessons)
        for (const s of l.scenes) {
          if (s.kind !== "interactive" || s.widget.kind !== "sorter") continue;
          const answers = s.widget.items.map((i) => i.answer);
          expect(answers.some((a, i) => i > 0 && a < answers[i - 1]), `${c.id}/${l.id}/${s.id}: ${answers}`).toBe(true);
        }
  });

  it("use no exclamation marks, and Spanish numbers keep their space unbroken", () => {
    for (const c of COURSES) expect(JSON.stringify(c).match(/.{0,30}[!¡]/g), c.id).toBeNull();
    // "10 000" and "25 %" take a no-break space, so a line never breaks inside the number.
    for (const c of [cellsEs, ecosystemsEs, heredityEs]) expect(JSON.stringify(c).match(/.{0,30}(\d \d{3}(?!\d)|\d %)/g), c.id).toBeNull();
  });
});
