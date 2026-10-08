import { describe, expect, it } from "vitest";
import type { Block, Scene } from "@/lib/types";
import { getSkill, gradeIndex } from "@/practice/skills";
import equations, { practice as equationsPractice } from "./math-equations";
import equationsEs, { practice as equationsEsPractice } from "./math-equations-es";
import linearFunctions, { practice as linearPractice } from "./math-linear-functions";
import proportional, { practice as proportionalPractice } from "./math-proportional";
import pythagorean, { practice as pythagoreanPractice } from "./math-pythagorean";
import pythagoreanEs, { practice as pythagoreanEsPractice } from "./math-pythagorean-es";
import ratios, { practice as ratiosPractice } from "./math-ratios";
import ratiosEs, { practice as ratiosEsPractice } from "./math-ratios-es";
import type { CatalogueEntry } from "./types";

const COURSES: [CatalogueEntry, Record<string, string[]>][] = [
  [ratios, ratiosPractice],
  [ratiosEs, ratiosEsPractice],
  [proportional, proportionalPractice],
  [equations, equationsPractice],
  [equationsEs, equationsEsPractice],
  [linearFunctions, linearPractice],
  [pythagorean, pythagoreanPractice],
  [pythagoreanEs, pythagoreanEsPractice],
];

const shape = (s: Scene) => {
  if (s.kind === "slide") return `${s.id}:slide:${s.blocks.map((b: Block) => (b.type === "visual" ? `visual-${b.visual.kind}` : b.type)).join(",")}`;
  if (s.kind === "quiz") return `${s.id}:quiz:${s.questions.map((q) => `${q.id}/${q.choices.length}/${q.answer}`).join(",")}`;
  if (s.kind === "interactive") return `${s.id}:interactive:${s.widget.kind}`;
  return `${s.id}:project:${s.steps.length}`;
};

describe("math 6-9 courses", () => {
  it("map every lesson to practice skills that exist, at most a grade ahead", () => {
    for (const [course, practice] of COURSES) {
      expect(Object.keys(practice).sort(), course.id).toEqual(course.lessons.map((l) => l.id).sort());
      for (const [lesson, ids] of Object.entries(practice))
        for (const id of ids) {
          const skill = getSkill(id);
          expect(skill, `${course.id}/${lesson}: ${id}`).toBeDefined();
          expect(skill!.subject, id).toBe("math");
          expect(gradeIndex(skill!.grade) - gradeIndex(course.grade), `${course.id}/${lesson}: ${id}`).toBeLessThanOrEqual(1);
        }
    }
  });

  it("keep each Spanish course in step with its English one", () => {
    for (const [en, es] of [[ratios, ratiosEs], [equations, equationsEs], [pythagorean, pythagoreanEs]]) {
      expect(es.grade, es.id).toBe(en.grade);
      expect(es.lessons.map((l) => l.id), es.id).toEqual(en.lessons.map((l) => l.id));
      en.lessons.forEach((l, i) => expect(es.lessons[i].scenes.map(shape), `${es.id}/${l.id}`).toEqual(l.scenes.map(shape)));
    }
  });

  it("draws the savings head start from the story's own numbers", () => {
    // 40 + 5w = 10 + 8w: the lead is (40 + 5w) − (10 + 8w), and it reaches 0 at the solution.
    for (const course of [equations, equationsEs]) {
      const scene = course.lessons.find((l) => l.id === "both-sides")!.scenes[0];
      const pic = scene.kind === "slide" ? scene.blocks.find((b) => b.type === "visual") : undefined;
      expect(pic?.type === "visual" && pic.visual.kind, course.id).toBe("line-graph");
      if (pic?.type !== "visual" || pic.visual.kind !== "line-graph") continue;
      for (const [w, lead] of pic.visual.points) expect(lead, `${course.id} week ${w}`).toBe(40 + 5 * w - (10 + 8 * w));
      const w = pic.visual.points.find(([, lead]) => lead === 0)?.[0];
      expect(w !== undefined && 40 + 5 * w === 10 + 8 * w, course.id).toBe(true);
    }
  });
});
