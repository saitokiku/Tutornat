import { describe, expect, it } from "vitest";
import { catalogueEntry } from ".";
import type { CatalogueEntry } from "./types";

// QuizView and Sorter show choices and items in the order they are written, so these courses must not let
// position or length give an answer away.
const IDS = [
  "english-paragraph",
  "english-paragraph-es",
  "english-context-clues",
  "english-fallacies",
  "english-fallacies-es",
  "english-theme-pov",
  "english-thesis",
  "english-thesis-es",
];

const course = (id: string): CatalogueEntry => {
  const c = catalogueEntry(id);
  if (!c) throw new Error(`missing course ${id}`);
  return c;
};
const questionsOf = (id: string) => course(id).lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "quiz" ? s.questions : [])));

describe("English 6-9 writing and reading courses", () => {
  it.each(IDS)("%s spreads its quiz answers over the positions", (id) => {
    const qs = questionsOf(id);
    const counts = [0, 0, 0, 0];
    for (const q of qs) counts[q.answer]++;
    expect(Math.max(...counts), counts.join("/")).toBeLessThanOrEqual(qs.length / 2);
  });

  // QuizView marks each answer as it goes. If a quiz never repeats a position, the last answer falls out by
  // elimination, so most quizzes must reuse one.
  it.each(IDS)("%s repeats an answer position in all but at most one quiz", (id) => {
    const quizzes = course(id).lessons.flatMap((l) => l.scenes.flatMap((s) => (s.kind === "quiz" ? [s.questions.map((q) => q.answer)] : [])));
    const allDifferent = quizzes.filter((a) => a.length >= 3 && new Set(a).size === a.length);
    expect(allDifferent.length, allDifferent.map((a) => a.join("")).join(" ")).toBeLessThanOrEqual(1);
  });

  it.each(IDS)("%s doesn't make the right choice the longest one", (id) => {
    const qs = questionsOf(id);
    const longest = qs.filter((q) => q.choices.every((c, i) => i === q.answer || c.length < q.choices[q.answer].length));
    expect(longest.length, longest.map((q) => q.prompt).join(" | ")).toBeLessThanOrEqual(qs.length / 3);
  });

  it.each(IDS)("%s explains answers without pointing at a position, and hints don't quote the answer", (id) => {
    for (const q of questionsOf(id)) {
      expect(q.explain, q.prompt).not.toMatch(/\b(first|second|third|fourth|last) (choice|option|reply|answer)\b/i);
      expect(q.explain, q.prompt).not.toMatch(/\b(primera|segunda|tercera|cuarta|última) (opción|respuesta)\b/i);
      expect(q.hint.toLowerCase().includes(q.choices[q.answer].toLowerCase()), q.prompt).toBe(false);
    }
  });

  it.each(IDS)("%s doesn't list sorter items in category order or a fixed cycle", (id) => {
    for (const l of course(id).lessons)
      for (const s of l.scenes) {
        if (s.kind !== "interactive" || s.widget.kind !== "sorter") continue;
        const a = s.widget.items.map((i) => i.answer);
        const k = s.widget.categories.length;
        const where = `${id}/${l.id}/${s.id}: ${a.join("")}`;
        expect(a.every((x, i) => i === 0 || x >= a[i - 1]), where).toBe(false);
        expect(a.every((x, i) => x === a[i % k]), where).toBe(false);
      }
  });
});
