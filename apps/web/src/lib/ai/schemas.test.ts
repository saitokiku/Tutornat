// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "@/catalogue";
import { gateLesson, LessonSchema, widgetProblems, WidgetSchema, type LessonOut } from "./schemas";

type W = LessonOut["scenes"][number] & { kind: "interactive" };
const lessonWith = (widget: W["widget"]): LessonOut => ({
  title: "Try it",
  summary: "One manipulative and a check.",
  minutes: 8,
  scenes: [
    { kind: "slide", title: "Look", blocks: [{ type: "text", text: "Here is the idea." }] },
    { kind: "interactive", title: "Try it", prompt: "Do it.", widget },
    { kind: "quiz", title: "Check", questions: [{ prompt: "Which?", choices: ["a", "b"], answer: 0, hint: "h", explain: "e" }] },
  ],
});
/** Parsed by the writer's schema, then gated: what a model's lesson goes through. */
const gate = (widget: unknown) => {
  const parsed = LessonSchema.safeParse(lessonWith(widget as W["widget"]));
  return parsed.success ? gateLesson(parsed.data) : ["schema"];
};

const VALID: Record<string, unknown> = {
  "area-model": { kind: "area-model", rows: 1, cols: 1, target: { rows: 3, cols: 4 } },
  "place-value": { kind: "place-value", target: 143 },
  clock: { kind: "clock", h: 7, m: 0, target: { h: 7, m: 50 } },
  balance: { kind: "balance", xCount: 2, leftUnits: 3, rightUnits: 13 },
  coordinate: { kind: "coordinate", min: -5, max: 5, targets: [[-3, 2], [4, -1]] },
  sequence: { kind: "sequence", items: [{ id: "a", text: "Plant the seed" }, { id: "b", text: "Water it" }, { id: "c", text: "It sprouts" }] },
  "sentence-builder": { kind: "sentence-builder", words: ["The", "cat", "sat", "dog"], answers: [["The", "cat", "sat"]] },
  "word sort": { kind: "sorter", categories: ["Noun", "Verb"], items: [{ text: "run", answer: 1 }, { text: "cat", answer: 0 }, { text: "jump", answer: 1 }] },
};

describe("lesson writer schema: new widgets", () => {
  for (const [name, widget] of Object.entries(VALID)) it(`accepts a reachable ${name}`, () => expect(gate(widget)).toEqual([]));

  it("rejects shapes outside the schema", () => {
    for (const bad of [
      { kind: "area-model", rows: 0, cols: 4 },
      { kind: "area-model", rows: 3, cols: 13 },
      { kind: "place-value", target: 1000 },
      { kind: "clock", h: 13, m: 0 },
      { kind: "clock", h: 0, m: 0 },
      { kind: "clock", h: 3, m: 60 },
      { kind: "balance", xCount: 0, leftUnits: 1, rightUnits: 5 },
      { kind: "balance", xCount: 2, leftUnits: 1, rightUnits: 2.5 },
      { kind: "coordinate", min: -5, max: 5, targets: [] },
      { kind: "coordinate", min: -5, max: 5, targets: [[1, 2, 3]] },
      { kind: "sequence", items: [{ id: "a", text: "one" }, { id: "b", text: "two" }] },
      { kind: "sentence-builder", words: ["Hi"], answers: [["Hi"]] },
    ])
      expect(WidgetSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
  });

  it("rejects a balance that has no whole-number answer, or nothing to do", () => {
    expect(gate({ kind: "balance", xCount: 2, leftUnits: 3, rightUnits: 10 }).join()).toMatch(/no whole-number solution/);
    expect(gate({ kind: "balance", xCount: 3, leftUnits: 5, rightUnits: 5 }).join()).toMatch(/no whole-number solution/); // x = 0
    expect(gate({ kind: "balance", xCount: 1, leftUnits: 9, rightUnits: 4 }).join()).toMatch(/no whole-number solution/); // x < 0
    expect(gate({ kind: "balance", xCount: 1, leftUnits: 0, rightUnits: 4 }).join()).toMatch(/already solved/);
  });

  it("rejects coordinate targets off the grid or repeated", () => {
    expect(gate({ kind: "coordinate", min: -3, max: 3, targets: [[4, 0]] }).join()).toMatch(/outside the grid/);
    expect(gate({ kind: "coordinate", min: 0, max: 5, targets: [[1, -1]] }).join()).toMatch(/outside the grid/);
    expect(gate({ kind: "coordinate", min: -3, max: 3, targets: [[1, 1], [1, 1]] }).join()).toMatch(/repeat/);
  });

  it("rejects sentence answers that need a word the tiles don't have", () => {
    expect(gate({ kind: "sentence-builder", words: ["The", "cat", "sat"], answers: [["The", "dog", "sat"]] }).join()).toMatch(/isn't given/);
    // Only one "the" tile: an answer can't use it twice.
    expect(gate({ kind: "sentence-builder", words: ["the", "cat", "saw", "dog"], answers: [["the", "cat", "saw", "the", "dog"]] }).join()).toMatch(/isn't given/);
    expect(gate({ kind: "sentence-builder", words: ["the", "the", "cat", "saw", "dog"], answers: [["the", "cat", "saw", "the", "dog"]] })).toEqual([]);
    expect(gate({ kind: "sentence-builder", words: ["a", "b"], answers: [["a", "b"], ["a", "b"]] }).join()).toMatch(/repeat/);
  });

  it("rejects sequences with repeated ids or steps", () => {
    expect(gate({ kind: "sequence", items: [{ id: "a", text: "one" }, { id: "a", text: "two" }, { id: "c", text: "three" }] }).join()).toMatch(/ids repeat/);
    expect(gate({ kind: "sequence", items: [{ id: "a", text: "one" }, { id: "b", text: "one" }, { id: "c", text: "three" }] }).join()).toMatch(/steps repeat/);
  });

  it("rejects targets a learner can't reach or that are already showing", () => {
    expect(gate({ kind: "place-value", target: 120, max: 99 }).join()).toMatch(/above max/);
    expect(gate({ kind: "clock", h: 3, m: 30, target: { h: 3, m: 30 } }).join()).toMatch(/starts on its target/);
    expect(gate({ kind: "area-model", rows: 3, cols: 4, target: { rows: 3, cols: 4 } }).join()).toMatch(/starts on its target/);
    expect(gate({ kind: "number-line", min: 0, max: 1, step: 0.25, start: 0, target: 0.3 }).join()).toMatch(/between steps/);
    expect(gate({ kind: "states-of-matter", startC: -40 }).join()).toMatch(/out of range/);
    // The older manipulatives too: a check of the untouched start must never be the answer.
    expect(gate({ kind: "fraction-bar", parts: 4, shaded: 3, target: { parts: 4, shaded: 3 } }).join()).toMatch(/starts on its target/);
    expect(gate({ kind: "number-line", min: 0, max: 10, step: 1, start: 7, target: 7 }).join()).toMatch(/starts on its target/);
    expect(gate({ kind: "states-of-matter", startC: 20, target: "liquid" }).join()).toMatch(/starts on its target/);
    expect(gate({ kind: "states-of-matter", startC: 96, target: "gas" }).join()).toMatch(/starts on its target/); // opens on the 100 °C step
    expect(gate({ kind: "moon-phases", target: 29 }).join()).toMatch(/starts on its target/);
    for (const ok of [
      { kind: "fraction-bar", parts: 2, shaded: 1, target: { parts: 4, shaded: 3 } },
      { kind: "number-line", min: 0, max: 10, step: 1, start: 3, target: 7 },
      { kind: "states-of-matter", startC: 20, target: "gas" },
      { kind: "moon-phases", target: 14 },
    ])
      expect(gate(ok), JSON.stringify(ok)).toEqual([]);
  });
});

describe("the ready-made catalogue", () => {
  it("every manipulative passes the same gates as a written lesson", () => {
    const seen = new Set<string>();
    for (const c of CATALOGUE)
      for (const l of c.lessons)
        for (const s of l.scenes)
          if (s.kind === "interactive") {
            seen.add(s.widget.kind);
            expect(widgetProblems(s.widget), `${c.id}/${l.id}/${s.id}`).toEqual([]);
          }
    // One demonstration of each new manipulative lives in a real lesson.
    for (const k of ["area-model", "place-value", "clock", "balance", "coordinate", "sequence", "sentence-builder"]) expect(seen.has(k), k).toBe(true);
  });
});
