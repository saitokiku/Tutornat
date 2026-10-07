// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { writeCourse, writePractice, type CourseEvent } from "./build";
import { gateLesson, type LessonOut } from "./schemas";

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
const reply = (obj: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(obj) }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] });

const good: LessonOut = {
  title: "Halves",
  summary: "Two equal parts.",
  minutes: 8,
  scenes: [
    { kind: "slide", title: "See it", blocks: [{ type: "visual", visual: { kind: "fraction", parts: 2, shaded: 1 }, alt: "A bar in two equal parts, one shaded" }] },
    { kind: "interactive", title: "Try it", prompt: "Shade one half.", widget: { kind: "fraction-bar", parts: 2, shaded: 0, target: { parts: 2, shaded: 1 } } },
    { kind: "quiz", title: "Check it", questions: [{ prompt: "How many equal parts make halves?", choices: ["2", "3"], answer: 0, hint: "Count the parts.", explain: "Halves are 2 equal parts." }] },
  ],
};

describe("quality gates", () => {
  it("accept a lesson with a picture, an action and valid keys", () => expect(gateLesson(good)).toEqual([]));
  it("reject text-only lessons and broken keys", () => {
    const textOnly: LessonOut = { ...good, scenes: [{ kind: "slide", title: "a", blocks: [{ type: "text", text: "words" }] }, { kind: "slide", title: "b", blocks: [{ type: "text", text: "more" }] }, good.scenes[2]] };
    expect(gateLesson(textOnly)).toContain("no picture or interactive");
    const badKey: LessonOut = { ...good, scenes: [good.scenes[0], good.scenes[1], { kind: "quiz", title: "c", questions: [{ prompt: "?", choices: ["a", "b"], answer: 3, hint: "h", explain: "e" }] }] };
    expect(gateLesson(badKey).join()).toMatch(/bad key/);
  });
});

describe("course writer", () => {
  it("streams an outline, then lessons that pass; a lesson failing twice is skipped and said", async () => {
    const bad = { ...good, scenes: [{ kind: "slide", title: "a", blocks: [{ type: "text", text: "x" }] }, { kind: "slide", title: "b", blocks: [{ type: "text", text: "y" }] }, { kind: "project", title: "c", brief: "b", steps: ["1", "2"] }] };
    const outline = { title: "Fractions", lessons: [{ title: "Halves", summary: "s", objective: "o", minutes: 8 }, { title: "Thirds", summary: "s", objective: "o", minutes: 8 }] };
    const queue = [outline, good, bad, bad];
    const model = new MockLanguageModelV4({ doGenerate: async () => reply(queue.shift()) });
    const events: CourseEvent[] = [];
    for await (const e of writeCourse({ goal: "fractions", grade: "3", subject: "math", length: "short", locale: "en" }, model)) events.push(e);
    expect(events.map((e) => e.type)).toEqual(["step", "outline", "step", "lesson", "skipped", "done"]);
    expect((events[3] as { lesson: { id: string } }).lesson.id).toBeTruthy();
  });

  it("drops a practice question whose key does not resolve", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () =>
        reply({
          items: [
            { prompt: "Which is a mammal?", choices: ["Whale", "Shark", "Trout"], answer: 0, hints: ["a", "b", "c"], explain: "Whales breathe air and feed milk." },
            { prompt: "Dup?", choices: ["A", "A", "B"], answer: 0, hints: ["a", "b", "c"], explain: "x" },
            { prompt: "Which is a reptile?", choices: ["Frog", "Snake", "Newt"], answer: 1, hints: ["a", "b", "c"], explain: "Snakes are reptiles." },
          ],
        }),
    });
    const items = await writePractice({ topic: "animals", grade: "3", locale: "en", count: 3 }, model);
    expect(items.map((i) => i.prompt)).toEqual(["Which is a mammal?", "Which is a reptile?"]);
  });
});
