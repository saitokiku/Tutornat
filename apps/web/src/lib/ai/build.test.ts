// @vitest-environment node
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { cachedCourse, courseKey, gateWritten, goalKey, writeCourse, writePractice, type CourseEvent, type CourseRequest } from "./build";
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

describe("writer gates beyond the shared ones", () => {
  const req = { grade: "3", locale: "en" as const };
  type Question = Extract<LessonOut["scenes"][number], { kind: "quiz" }>["questions"];
  const withQuiz = (questions: Question): LessonOut => ({ ...good, scenes: [good.scenes[0], good.scenes[1], { kind: "quiz", title: "Check it", questions }] });

  it("accept the lesson the writer is asked for", () => expect(gateWritten(good, req)).toEqual([]));

  it("hold the voice rules: no exclamation marks, praise, filler, emojis or links", () => {
    const loud = { ...good, summary: "Great job! Let's dive in 🍕 at www.example.com." };
    expect(gateWritten(loud, req)).toEqual(expect.arrayContaining(["exclamation mark", 'praise word "Great job"', "filler \"Let's dive in\"", "emoji", "names a website"]));
    expect(gateWritten({ ...good, summary: "Is 9 a perfect square? The Great Lakes are big. Copper is an excellent conductor." }, req)).toEqual([]);
    expect(gateWritten({ ...good, summary: "Excellent. Now shade one more part." }, req)).toContain('praise word "Excellent"');
    expect(gateWritten({ ...good, summary: "You shaded half, that's great." }, req)).toContain(`praise word "that's great"`);
    expect(gateWritten({ ...good, summary: "Perfecto. Ahora sombrea otra parte." }, { grade: "3", locale: "es" })).toContain('praise word "Perfecto"');
  });

  it("tell Spanish praise from Spanish that describes", () => {
    const es = { grade: "5", locale: "es" as const };
    const says = (summary: string) => gateWritten({ ...good, title: "Los metales", summary }, es).filter((p) => p.startsWith("praise"));
    expect(says("El cobre conduce muy bien el calor. Por eso las ollas son de metal.")).toEqual([]);
    expect(says("Es un cuento fantástico con un dragón. Lee la primera parte.")).toEqual([]);
    expect(says("Muy bien. Ahora sombrea otra parte de la barra.")).toContain('praise word "Muy bien"');
    expect(says("Genial, ahora sombrea otra parte de la barra.")).toContain('praise word "Genial"');
    expect(says("Lo hiciste muy bien con la barra de la fracción.")).toContain('praise word "Lo hiciste muy bien"');
    expect(says("Es una idea increíble para la barra de la fracción.")).toContain('praise word "increíble"');
  });

  it("keep the order: show it first, a quiz to check it, a project only at the end", () => {
    const quizFirst = { ...good, scenes: [good.scenes[2], good.scenes[0], good.scenes[1]] };
    expect(gateWritten(quizFirst, req)).toEqual(expect.arrayContaining(["does not start by showing the idea", "no quiz to check it"]));
    const project = { kind: "project" as const, title: "Use it", brief: "Fold a paper in half.", steps: ["Fold it.", "Shade one part."] };
    expect(gateWritten({ ...good, scenes: [good.scenes[0], project, good.scenes[2]] }, req)).toContain("project is not the last scene");
    expect(gateWritten({ ...good, scenes: [...good.scenes, project] }, req)).toEqual([]);
  });

  it("reject a hint that names the right choice, unless the question already shows it", () => {
    const giveaway = withQuiz([{ prompt: "Which part of a plant takes in water?", choices: ["Roots", "Petals"], answer: 0, hint: "Think about the roots under the soil.", explain: "Roots take in water." }]);
    expect(gateWritten(giveaway, req).join()).toMatch(/hint gives the answer/);
    const fine = withQuiz([{ prompt: "Is 2 more than 1?", choices: ["Yes", "No"], answer: 0, hint: "Count up from 1.", explain: "2 comes after 1." }]);
    expect(gateWritten(fine, req)).toEqual([]);
  });

  it("check that a picture's numbers agree with each other", () => {
    const slide = (visual: unknown): LessonOut => ({ ...good, scenes: [{ kind: "slide", title: "See it", blocks: [{ type: "visual", visual: visual as never, alt: "A picture" }] }, good.scenes[1], good.scenes[2]] });
    expect(gateWritten(slide({ kind: "number-line", min: 0, max: 10, marks: [12] }), req)).toContain("number line picture out of range");
    expect(gateWritten(slide({ kind: "dots", groups: [3, 2], crossed: 4 }), req)).toContain("more dots crossed out than drawn");
    expect(gateWritten(slide({ kind: "column", op: "−", top: 3, bottom: 8 }), req)).toContain("subtraction column below zero");
    expect(gateWritten(slide({ kind: "ten-frame", filled: 14 }), req)).toContain("ten-frame holds more than it has room for");
  });

  it("keep K–2 reading short and the language the one asked for", () => {
    const wordy = withQuiz([{ prompt: "Which one?", choices: ["the one with two equal parts", "Three"], answer: 1, hint: "Count.", explain: "Count them." }]);
    expect(gateWritten(wordy, { grade: "1", locale: "en" })).toContain("quiz choice too long for K–2");
    expect(gateWritten(wordy, { grade: "4", locale: "en" })).toEqual([]);
    const english = { ...good, summary: "This is what you do with the two parts of the bar." };
    expect(gateWritten(english, { grade: "3", locale: "es" })).toContain("not written in Spanish");
  });
});

describe("the shared course cache", () => {
  const outline = (title: string, count: number) => ({ title, lessons: Array.from({ length: count }, (_, i) => ({ title: `Lesson ${i + 1}`, summary: "s", objective: "o", minutes: 8 })) });
  const writer = (queue: unknown[]) => new MockLanguageModelV4({ doGenerate: async () => reply(queue.shift()) });
  const run = async (req: CourseRequest, model: MockLanguageModelV4) => {
    const events: CourseEvent[] = [];
    for await (const e of writeCourse(req, model)) events.push(e);
    return events;
  };
  const lessonIds = (events: CourseEvent[]) => events.flatMap((e) => (e.type === "lesson" ? [e.lesson.id] : []));
  const base: CourseRequest = { goal: "Halves and quarters", grade: "3", subject: "math", length: "short", locale: "en" };

  it("gives the next family a course that passed every gate, instantly and with no model call", async () => {
    const req = { ...base, goal: "I want to learn about halves and wholes!" };
    const model = writer([outline("Halves", 2), good, good]);
    const first = await run(req, model);
    expect(lessonIds(first)).toHaveLength(2);
    expect(model.doGenerateCalls).toHaveLength(3);

    const hit = cachedCourse({ ...req, goal: "halves and wholes" })!;
    expect(hit.map((e) => e.type)).toEqual(["step", "outline", "step", "lesson", "lesson", "done"]);
    expect(lessonIds(hit)).toHaveLength(2);
    expect(lessonIds(hit)).not.toEqual(lessonIds(first));
    expect((hit[3] as { lesson: LessonOut }).lesson.title).toBe("Halves");
    expect(model.doGenerateCalls).toHaveLength(3);
  });

  it("keeps a course with a skipped lesson, or one cut short, out of the cache", async () => {
    const bad = { ...good, scenes: [good.scenes[2], good.scenes[2], good.scenes[2]] };
    const req = { ...base, goal: "thirds for the cache test" };
    await run(req, writer([outline("Thirds", 2), good, bad, bad]));
    expect(cachedCourse(req)).toBeNull();
    const ctrl = new AbortController();
    for await (const e of writeCourse(req, writer([outline("Thirds", 2), good, good]), ctrl.signal)) if (e.type === "lesson") ctrl.abort();
    expect(cachedCourse(req)).toBeNull();
  });

  it("is keyed by what the writer was told: grade, language, length and interests, not recent practice", async () => {
    const req: CourseRequest = { ...base, goal: "fractions on a number line", length: "lesson", interests: ["Soccer", "dinosaurs"] };
    const model = writer([outline("Number lines", 1), good]);
    await run({ ...req, working: ["m.frac.addlike"] }, model);
    const sent = JSON.stringify(model.doGenerateCalls.map((c) => c.prompt));
    expect(sent).toContain("Soccer");
    expect(sent).not.toMatch(/Add fractions|m\.frac\.addlike/);
    expect(cachedCourse({ ...req, interests: ["dinosaurs", "soccer"] })).not.toBeNull();
    expect(cachedCourse({ ...req, working: ["m.mult.facts"] })).not.toBeNull();
    expect(cachedCourse({ ...req, interests: [] })).toBeNull();
    expect(cachedCourse({ ...req, grade: "4" })).toBeNull();
    expect(cachedCourse({ ...req, locale: "es" })).toBeNull();
    expect(cachedCourse({ ...req, length: "short" })).toBeNull();
  });

  it("writes from a family's attached files by name, and never shares that course or serves it a shared one", async () => {
    const req: CourseRequest = { ...base, goal: "help me study for my test", length: "lesson" };
    await run(req, writer([outline("Study skills", 1), good]));
    expect(cachedCourse(req)).not.toBeNull();
    const withFile: CourseRequest = { ...req, sources: [{ name: "Unit 4 Photosynthesis study guide.pdf", kind: "pdf" }] };
    // The same goal with a file attached is that family's own course: the cached one is not served.
    expect(cachedCourse(withFile)).toBeNull();
    const model = writer([outline("Photosynthesis", 1), good]);
    await run(withFile, model);
    expect(JSON.stringify(model.doGenerateCalls.map((c) => c.prompt))).toContain("Unit 4 Photosynthesis study guide.pdf");
    expect(cachedCourse(withFile)).toBeNull();
    expect((cachedCourse(req)![1] as { title: string }).title).toBe("Study skills");
  });

  it("stops before the next lesson once a cost cap is reached, says so, and caches nothing", async () => {
    const req = { ...base, goal: "quarters on a budget" };
    let spentOut = false;
    const model = writer([outline("Quarters", 3), good, good, good]);
    const events: CourseEvent[] = [];
    for await (const e of writeCourse(req, model, undefined, () => (spentOut ? { scope: "day", message: "The lesson writer is done for today." } : null))) {
      events.push(e);
      if (e.type === "lesson") spentOut = true;
    }
    expect(events.map((e) => e.type)).toEqual(["step", "outline", "step", "lesson", "error"]);
    expect(events.at(-1)).toEqual({ type: "error", error: "budget", scope: "day", message: "The lesson writer is done for today." });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(cachedCourse(req)).toBeNull();
  });

  it("forgets a course after thirty days", async () => {
    const req = { ...base, goal: "quarters that expire", length: "lesson" as const };
    await run(req, writer([outline("Quarters", 1), good]));
    expect(cachedCourse(req, Date.now() + 29 * 86_400_000)).not.toBeNull();
    expect(cachedCourse(req, Date.now() + 31 * 86_400_000)).toBeNull();
  });

  it("normalizes goals the way families type them", () => {
    expect(goalKey("I want to learn about the Water Cycle?")).toBe("water cycle");
    expect(goalKey("  water   cycle ")).toBe("water cycle");
    expect(goalKey("Quiero aprender sobre la fotosíntesis")).toBe("fotosintesis");
    expect(goalKey("What are fractions")).toBe("fractions");
    expect(courseKey({ ...base, goal: "Teach me fractions" })).toBe(courseKey({ ...base, goal: "fractions!" }));
    expect(goalKey("long-division")).toBe(goalKey("long division"));
    expect(goalKey("What is 1/2 + 1/4?")).toBe(goalKey("1/2+1/4"));
    expect(goalKey("x − 5 = 12")).toBe(goalKey("x-5=12"));
    expect(goalKey("2 * 3")).toBe(goalKey("2×3"));
    expect(goalKey("½ + ¼")).toBe(goalKey("1/2 + 1/4"));
  });

  it("keeps the math in a goal: a different sign, operation or number is a different course", () => {
    const differ = (a: string, b: string) => expect(goalKey(a), `${a} | ${b}`).not.toBe(goalKey(b));
    differ("solve x + 5 = 12", "solve x - 5 = 12");
    differ("solve x + 5 = 12", "solve x × 5 = 12");
    differ("solve x - 5 = 12", "solve x × 5 = 12");
    differ("1/2 + 1/4", "1.2 + 1.4");
    differ("-3 + 5", "3 + 5");
    differ("x > 4", "x < 4");
    differ("(2 + 3) × 4", "2 + 3 × 4");
    differ("25%", "25");
    differ("3:45", "3 45");
    expect(goalKey("solve x - 5 = 12")).toBe("solve x - 5 = 12");
    expect(goalKey("1.2 + 1.4")).toBe("1.2 + 1.4");
    expect(goalKey("??")).toBe("");
  });
});
