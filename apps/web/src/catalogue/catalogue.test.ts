import { describe, expect, it } from "vitest";
import { CATALOGUE, catalogueFor } from ".";

const onStep = (v: number, min: number, step: number) => Math.abs((v - min) / step - Math.round((v - min) / step)) < 1e-9;

describe("catalogue", () => {
  it("has unique ids and four lessons per course", () => {
    expect(new Set(CATALOGUE.map((c) => c.id)).size).toBe(CATALOGUE.length);
    for (const c of CATALOGUE) expect(c.lessons, c.id).toHaveLength(4);
  });

  it("every check is answerable and every widget target reachable", () => {
    for (const c of CATALOGUE)
      for (const l of c.lessons)
        for (const s of l.scenes) {
          const where = `${c.id}/${l.id}/${s.id}`;
          if (s.kind === "quiz")
            for (const q of s.questions) expect(q.answer >= 0 && q.answer < q.choices.length, `${where}/${q.id}`).toBe(true);
          if (s.kind !== "interactive") continue;
          const w = s.widget;
          if (w.kind === "fraction-bar" && w.target) expect(w.target.shaded <= w.target.parts && w.target.parts <= 12, where).toBe(true);
          if (w.kind === "number-line" && w.target !== undefined)
            expect(w.target >= w.min && w.target <= w.max && onStep(w.target, w.min, w.step) && onStep(w.start, w.min, w.step), where).toBe(true);
          if (w.kind === "states-of-matter") expect(w.startC % 10 === 0 && w.startC >= -30 && w.startC <= 130, where).toBe(true);
          if (w.kind === "moon-phases" && w.target !== undefined) expect(w.target >= 0 && w.target <= 29, where).toBe(true);
          if (w.kind === "sorter") for (const i of w.items) expect(i.answer >= 0 && i.answer < w.categories.length, `${where}/${i.id}`).toBe(true);
        }
  });

  it("covers math, science and English in every school band", () => {
    for (const grade of ["K", "4", "7"] as const) {
      const band = catalogueFor(grade, "en").slice(0, 3).map((c) => c.subject).sort();
      expect(band, grade).toEqual(["english", "math", "science"]);
    }
  });

  it("prefers the learner's language for translated courses", () => {
    const es = catalogueFor("3", "es").map((c) => c.id);
    expect(es).toContain("math-fractions-es");
    expect(es).not.toContain("math-fractions");
  });
});
