import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModel } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai/extract/route";
import { readIntake } from "@/lib/ai/extract";
import { getBlob, putBlob } from "./blobs";
import { builderHref, classifyIntake, keepsText, mergeGuess, parseAiRead, practiceSearchHref, readByAi, readDate, redactNames, saveSchoolItem, type IntakeGuess } from "./intake";
import { addEvent, getEvent, removeEvent, updateEvent } from "./school";
import { read, resetMemory } from "./store";

// The route asks lib/ai/config for a model; tests decide whether there is one (null = demo).
const ai = vi.hoisted(() => ({ model: null as unknown }));
vi.mock("@/lib/ai/config", () => ({ model: async () => ai.model, aiMode: () => (ai.model ? "anthropic" : "demo") }));

const TODAY = "2026-10-07"; // a Wednesday
const ctx = { today: TODAY };
const guess = (text: string, c: Parameters<typeof classifyIntake>[1] = ctx) => classifyIntake(text, c);

describe("classifyIntake: 40 ways families say it, in English and Spanish", () => {
  // [text, kind, date, a skill it should link, title]
  const cases: [string, IntakeGuess["kind"], string | undefined, string | undefined, string | undefined][] = [
    // English — school work with a day
    ["fractions worksheet due Friday", "homework", "2026-10-09", "m.frac.unit", "Fractions worksheet"],
    ["Spelling test on Thursday", "test", "2026-10-08", undefined, "Spelling test"],
    ["I have a math test tomorrow", "test", "2026-10-08", undefined, "Math test"],
    ["Multiplication quiz next Tuesday", "quiz", "2026-10-13", "m.mult.facts", "Multiplication quiz"],
    ["Science project due Oct 12", "project", "2026-10-12", undefined, "Science project"],
    ["read pages 45-46 for Monday", "homework", "2026-10-12", undefined, "Read pages 45-46"],
    ["Unit 3 exam 10/12", "test", "2026-10-12", undefined, "Unit 3 exam"],
    ["Reading log due in 3 days", "homework", "2026-10-10", undefined, "Reading log"],
    ["Chemistry quiz this Friday", "quiz", "2026-10-09", undefined, "Chemistry quiz"],
    ["Test next Friday", "test", "2026-10-16", undefined, "Test"],
    ["Book report due 2026-11-02", "homework", "2026-11-02", undefined, "Book report"],
    ["math Friday", "homework", "2026-10-09", undefined, "Math"],
    ["Science fair project, Friday Oct 16", "project", "2026-10-16", undefined, "Science fair project"],
    ["Friday's spelling test", "test", "2026-10-09", undefined, "Spelling test"],
    ["there's a long division worksheet due tmrw", "homework", "2026-10-08", "m.div.long", "Long division worksheet"],
    ["math homework", "homework", undefined, undefined, "Math homework"],
    ["The test is today", "test", "2026-10-07", undefined, "Test"],
    // English — practice and learning
    ["practice multiplication facts", "practice", undefined, "m.mult.facts", "Multiplication facts"],
    ["more practice with subtraction", "practice", undefined, undefined, "Subtraction"],
    ["quiz me on times tables", "practice", undefined, "m.mult.facts", "Times tables"],
    ["drill long division", "practice", undefined, "m.div.long", "Long division"],
    ["practice fractions tomorrow", "practice", "2026-10-08", "m.frac.unit", "Fractions"],
    ["Why is the sky blue?", "learn", undefined, undefined, "Why is the sky blue?"],
    ["how do volcanoes work", "learn", undefined, undefined, "How do volcanoes work"],
    ["teach me about the water cycle", "learn", undefined, "s.water.cycle", "Water cycle"],
    ["What is 3/4 of 12?", "learn", undefined, undefined, "What is 3/4 of 12?"],
    ["dinosaurs", "learn", undefined, undefined, "Dinosaurs"],
    // Spanish — school work with a day
    ["Tarea de fracciones para el viernes", "homework", "2026-10-09", "m.frac.unit", "Tarea de fracciones"],
    ["Examen de multiplicación el próximo martes", "test", "2026-10-13", "m.mult.facts", "Examen de multiplicación"],
    ["Prueba de ortografía el viernes", "quiz", "2026-10-09", undefined, "Prueba de ortografía"],
    ["hoja de sumas para mañana", "homework", "2026-10-08", "m.add.10", "Hoja de sumas"],
    ["proyecto de ciencias para el 12 de octubre", "project", "2026-10-12", undefined, "Proyecto de ciencias"],
    ["examen el lunes por la mañana", "test", "2026-10-12", undefined, "Examen por la mañana"],
    ["tarea de ciencias en 3 días", "homework", "2026-10-10", undefined, "Tarea de ciencias"],
    ["ejercicios de la página 20 para hoy", "homework", "2026-10-07", undefined, "Ejercicios de la página 20"],
    ["Tengo examen de ciencias pasado mañana", "test", "2026-10-09", undefined, "Examen de ciencias"],
    // Spanish — practice and learning
    ["Practicar las tablas de multiplicar", "practice", undefined, "m.mult.facts", "Tablas de multiplicar"],
    ["más fracciones", "practice", undefined, "m.frac.unit", "Fracciones"],
    ["más ejercicios de restas", "practice", undefined, "m.sub.10", "Restas"],
    ["¿Por qué cambian de color las hojas?", "learn", undefined, undefined, "¿Por qué cambian de color las hojas?"],
    ["Quiero aprender sobre los volcanes", "learn", undefined, undefined, "Volcanes"],
    ["¿Qué es la fotosíntesis?", "learn", undefined, undefined, "¿Qué es la fotosíntesis?"],
  ];

  it.each(cases)("%s", (text, kind, date, skill, title) => {
    const g = guess(text);
    expect(g.kind).toBe(kind);
    expect(g.date).toBe(date);
    if (skill) expect(g.skillIds).toContain(skill);
    if (title) expect(g.title).toBe(title);
  });

  it("covers at least 30 phrasings", () => expect(cases.length).toBeGreaterThanOrEqual(30));

  it("says why: the word or the day that decided it", () => {
    expect(guess("fractions worksheet due Friday").reason).toEqual({ rule: "homework", cue: "worksheet" });
    expect(guess("math Friday").reason).toEqual({ rule: "date", cue: "Friday" });
    expect(guess("Examen de ciencias").reason).toEqual({ rule: "test", cue: "Examen" });
    expect(guess("dinosaurs").reason).toEqual({ rule: "default" });
  });

  it("asks for practice, not a test, when it says 'quiz me' or 'test me'", () => {
    expect(guess("test me on fractions").kind).toBe("practice");
    expect(guess("quiz me on the water cycle").kind).toBe("practice");
  });

  it("keeps a learning question whole, date words and all", () => {
    expect(guess("Why is Friday the 13th unlucky?")).toMatchObject({ kind: "learn", title: "Why is Friday the 13th unlucky?" });
  });

  it("reads the line that carries the item out of a pasted note, and the skills from the rest", () => {
    const g = guess("Hi families,\nOur unit 2 math test is on Friday Oct 16.\nPlease review fractions.");
    expect(g).toMatchObject({ kind: "test", date: "2026-10-16", title: "Unit 2 math test" });
    expect(g.skillIds).toContain("m.frac.unit");
  });

  it("finds the kind on one line and the day on another", () => {
    expect(guess("Math test\nFriday Oct 16")).toMatchObject({ kind: "test", date: "2026-10-16", title: "Math test" });
  });

  it("names the class from the learner's classes, or the only class in the subject", () => {
    const classes = [
      { id: "c1", name: "Math 4B", subject: "math" as const },
      { id: "c2", name: "Science", subject: "science" as const },
    ];
    expect(guess("Math 4B quiz Friday", { today: TODAY, classes })).toMatchObject({ kind: "quiz", classId: "c1", subject: "math" });
    expect(guess("fractions worksheet due Friday", { today: TODAY, classes })).toMatchObject({ classId: "c1", subject: "math" });
    expect(guess("fractions worksheet due Friday", { today: TODAY, classes: [...classes, { id: "c3", name: "Math club", subject: "math" }] }).classId).toBeUndefined();
  });

  it("never reads the sun as Sunday, or a fraction as a date", () => {
    expect(guess("Why does the sun set?").date).toBeUndefined();
    expect(guess("1/2 + 1/4").date).toBeUndefined();
    expect(guess("Months: May has 31 days").date).toBeUndefined();
  });
});

describe("classifyIntake: fractions are numbers, not days", () => {
  it.each(["simplify 6/12", "5/10 + 2/10", "convert 9/10 to a percent", "add 3/10 and 4/10", "What is 7/12 as a decimal?", "homework for 1/2 of the class", "Test me on 3/4", "practice 1/10 fractions"])(
    "%s has no date",
    (text) => expect(guess(text).date).toBeUndefined(),
  );

  it("still finds the real day beside them", () => {
    expect(guess("Simplify 6/12 worksheet due Friday")).toMatchObject({ kind: "homework", date: "2026-10-09", title: "Simplify 6/12 worksheet" });
    expect(guess("worksheet on 3/4 and 1/2 due Friday").date).toBe("2026-10-09");
    expect(guess("Quiz on 3/4 and 1/2 Friday")).toMatchObject({ kind: "quiz", date: "2026-10-09" });
    expect(guess("Equivalent fractions 2/10 and 1/5 worksheet due tomorrow").date).toBe("2026-10-08");
    expect(guess("Test on 10/12").date).toBe("2026-10-12");
    expect(guess("practice 3/10 + 4/10")).toMatchObject({ kind: "practice", title: "3/10 + 4/10", date: undefined });
  });
});

describe("classifyIntake: a pasted note", () => {
  it.each([
    ["Hi families! Reading log is due Friday.\nNext week we will have a math test on Oct 20.", "test", "2026-10-20", "Math test"],
    ["Picture day is Oct 9\nMath test Friday Oct 16", "test", "2026-10-16", "Math test"],
    ["Hi families,\nReminder: picture day is Tuesday.\nOur unit 2 math test is on Friday Oct 16.", "test", "2026-10-16", "Unit 2 math test"],
    ["Dear parents, today we started fractions.\nThe quiz is next Tuesday.", "quiz", "2026-10-13", "Quiz"],
    ["Hola familias:\nEl lunes no hay clases.\nEl examen de matemáticas es el viernes 16 de octubre.", "test", "2026-10-16", "Examen de matemáticas"],
  ] as const)("%s", (text, kind, date, title) => {
    expect(guess(text, { today: TODAY, locale: text.startsWith("Hola") ? "es" : "en" })).toMatchObject({ kind, date, title });
  });

  it("names a day off or a school event as one, not as homework", () => {
    expect(guess("No school Monday")).toMatchObject({ kind: "no-school", date: "2026-10-12", title: "No school" });
    expect(guess("Field trip Friday")).toMatchObject({ kind: "event", date: "2026-10-09" });
    expect(guess("Picture day Oct 9")).toMatchObject({ kind: "event", date: "2026-10-09" });
    expect(guess("No hay clases el lunes", { today: TODAY, locale: "es" })).toMatchObject({ kind: "no-school", date: "2026-10-12" });
  });
});

describe("classifyIntake: a day makes it school work, in the plan's order", () => {
  it.each([
    ["Write a paragraph about how plants grow for Monday", "2026-10-12"],
    ["Read chapter 3 by Friday and explain why the war started", "2026-10-09"],
    ["Explain photosynthesis in 5 sentences by Thursday", "2026-10-08"],
    ["Book report Friday, explain the main character", "2026-10-09"],
    ["How many pages is the reading for Friday", "2026-10-09"],
  ])("%s", (text, date) => {
    const g = guess(text);
    expect(g.kind).toBe("homework");
    expect(g.date).toBe(date);
  });

  it("unless the words open as a request to the app or a question", () => {
    expect(guess("Lab report on how magnets work, Oct 14")).toMatchObject({ date: "2026-10-14" });
    expect(["homework", "project"]).toContain(guess("Lab report on how magnets work, Oct 14").kind);
    expect(guess("practice fractions tomorrow").kind).toBe("practice");
    expect(guess("Why is Friday the 13th unlucky?").kind).toBe("learn");
    expect(guess("teach me about volcanoes tomorrow").kind).toBe("learn");
  });
});

describe("classifyIntake: subjects and classes from whole words", () => {
  const classes = [
    { id: "m", name: "Math", subject: "math" as const },
    { id: "r", name: "Reading", subject: "english" as const },
    { id: "s", name: "Science", subject: "science" as const },
  ];
  const es = (text: string) => guess(text, { today: TODAY, locale: "es", classes });
  const en = (text: string) => guess(text, { today: TODAY, classes });
  it("never finds a subject inside another word", () => {
    expect(es("tarea de ciencias para el viernes")).toMatchObject({ subject: "science", classId: "s" });
    expect(es("tarea de ortografía")).toMatchObject({ subject: "english", classId: "r" });
    expect(es("tarea de inglés")).toMatchObject({ subject: "english", classId: "r" });
    expect(en("history test Friday")).toMatchObject({ subject: undefined, classId: undefined });
    expect(en("Write a paragraph about plants for Monday")).toMatchObject({ subject: "english", classId: "r" });
  });

  it("lets the AI reader's subject replace a class the rules only guessed, never one the family named", () => {
    const ai = { kind: "homework" as const, title: "Plant growth paragraph", subject: "science" as const, skillIds: [], notes: [] };
    expect(mergeGuess(en("Write a paragraph about plants for Monday"), ai, { today: TODAY, classes }).classId).toBe("s");
    expect(mergeGuess(en("Reading: paragraph about plants for Monday"), ai, { today: TODAY, classes }).classId).toBe("r");
  });
});

describe("classifyIntake: dates the way each language writes them", () => {
  const es = (text: string) => guess(text, { today: TODAY, locale: "es" }).date;
  it("reads day/month in Spanish and month/day in English", () => {
    expect(es("examen de matemáticas el 12/10")).toBe("2026-10-12");
    expect(es("tarea para el 5/11")).toBe("2026-11-05");
    expect(es("examen final 15/10")).toBe("2026-10-15");
    expect(es("examen viernes 16/10")).toBe("2026-10-16");
    expect(guess("Unit 3 exam 10/12").date).toBe("2026-10-12");
  });

  it("leaves the day out when a weekday beside it disagrees", () => {
    expect(guess("math test Thursday 10/16").date).toBeUndefined(); // Oct 16 is a Friday
  });

  it("reads a day of the month alone, and short weekday names", () => {
    expect(es("tarea para el 15")).toBe("2026-10-15");
    expect(es("examen el día 12")).toBe("2026-10-12");
    expect(es("examen de mate el vie")).toBe("2026-10-09");
    expect(es("prueba el mié")).toBe("2026-10-14");
    expect(guess("test on the 12th").date).toBe("2026-10-12");
    expect(guess("Spelling test Friday the 16th").date).toBe("2026-10-16");
    expect(guess("do the 12 problems on page 4").date).toBeUndefined();
  });
});

describe("classifyIntake: titles a parent doesn't have to retype", () => {
  it.each([
    ["mi hija tiene examen de matemáticas el viernes", "Examen de matemáticas"],
    ["My son has a quiz on decimals Thursday", "Quiz on decimals"],
    ["la tarea es para el viernes", "Tarea"],
    ["Maria here: Ada's test is Friday", "Ada's test"],
    ["Mrs. Lee says the fractions quiz is on Friday", "Fractions quiz"],
    ["practice multiplication facts tonight please", "Multiplication facts"],
  ])("%s", (text, title) => expect(guess(text, { today: TODAY, locale: /[ñí]|tarea|hija/.test(text) ? "es" : "en" }).title).toBe(title));
});

describe("readDate", () => {
  const day = (text: string) => readDate(text, TODAY)?.date;
  it("resolves relative words against today", () => {
    expect(day("today")).toBe("2026-10-07");
    expect(day("tonight")).toBe("2026-10-07");
    expect(day("tomorrow")).toBe("2026-10-08");
    expect(day("the day after tomorrow")).toBe("2026-10-09");
    expect(day("in 3 days")).toBe("2026-10-10");
    expect(day("in two weeks")).toBe("2026-10-21");
    expect(day("en una semana")).toBe("2026-10-14");
    expect(day("dentro de 5 días")).toBe("2026-10-12");
    expect(day("hoy")).toBe("2026-10-07");
    expect(day("mañana")).toBe("2026-10-08");
    expect(day("manana")).toBe("2026-10-08");
    expect(day("pasado mañana")).toBe("2026-10-09");
  });

  it("reads weekdays: bare and 'this' are the coming one, 'next' is the one in the week after", () => {
    expect(day("Friday")).toBe("2026-10-09");
    expect(day("Wednesday")).toBe("2026-10-14"); // today is Wednesday: a bare weekday means the next one
    expect(day("this Wednesday")).toBe("2026-10-07");
    expect(day("next Tuesday")).toBe("2026-10-13");
    expect(day("next Friday")).toBe("2026-10-16");
    expect(day("Friday next week")).toBe("2026-10-16");
    expect(day("fri")).toBe("2026-10-09");
    expect(day("el viernes")).toBe("2026-10-09");
    expect(day("el próximo martes")).toBe("2026-10-13");
    expect(day("el martes que viene")).toBe("2026-10-13");
    expect(day("el viernes de la próxima semana")).toBe("2026-10-16");
    expect(day("miércoles")).toBe("2026-10-14");
    expect(day("este miércoles")).toBe("2026-10-07");
  });

  it("reads absolute dates through the planner's reader, and they beat weekday words", () => {
    expect(day("Oct 12")).toBe("2026-10-12");
    expect(day("October 12th, 2027")).toBe("2027-10-12");
    expect(day("12 de octubre")).toBe("2026-10-12");
    expect(day("due 10/12")).toBe("2026-10-12");
    expect(day("10/12/2026")).toBe("2026-10-12");
    expect(day("2026-11-02")).toBe("2026-11-02");
    expect(day("Friday, Oct 16")).toBe("2026-10-16");
    expect(day("Sept 3")).toBe("2027-09-03"); // past by more than 30 days: next year
  });

  it("finds nothing where nothing names a day", () => {
    expect(readDate("next week", TODAY)).toBeNull();
    expect(readDate("examen por la mañana", TODAY)).toBeNull();
    expect(readDate("3/4 of a pizza", TODAY)).toBeNull();
    expect(readDate("monster trucks", TODAY)).toBeNull();
  });
});

describe("names never go to a model", () => {
  it("swaps each learner's name for a token and puts it back on the device", () => {
    const r = redactNames("Ada's fractions test, and Bo has spelling", ["Ada", "Bo", "Ad"]);
    expect(r.text).toBe("[name1]'s fractions test, and [name2] has spelling");
    expect(r.restore("Fractions test for [name1]")).toBe("Fractions test for Ada");
  });

  it("matches a name with or without its accent, but never inside another word", () => {
    expect(redactNames("sofia tiene examen", ["Sofía"]).text).toBe("[name1] tiene examen");
    expect(redactNames("Adam and Bob", ["Ada", "Bo"]).text).toBe("Adam and Bob");
    expect(redactNames("anything", ["A"]).text).toBe("anything");
  });
});

describe("the AI reader's answer", () => {
  const rules = guess("fractions worksheet due Friday", { today: TODAY, classes: [{ id: "c1", name: "Math", subject: "math" }] });

  it("is checked before it is trusted", () => {
    expect(parseAiRead(null)).toBeNull();
    expect(parseAiRead({ kind: "essay", title: "x" })).toBeNull();
    expect(
      parseAiRead({ kind: "test", title: " Unit  3 test ", date: "2026-02-30x", subject: "math", topic: "fractions", skillIds: ["m.frac.unit", "nope", 3], notes: ["Assumed this year.", 4] }),
    ).toEqual({
      kind: "test",
      title: "Unit 3 test",
      date: undefined,
      subject: "math",
      topic: "fractions",
      skillIds: ["m.frac.unit"],
      notes: ["Assumed this year."],
    });
  });

  it("is folded into the rules' guess: its kind and title, but the day the words name wins", () => {
    const merged = mergeGuess(rules, { kind: "test", title: "Fractions check", date: "2026-10-30", subject: "math", skillIds: ["m.frac.equiv"], notes: [] }, { today: TODAY });
    expect(merged).toMatchObject({ kind: "test", title: "Fractions check", date: "2026-10-09", classId: "c1", reason: { rule: "ai" } });
    expect(merged.skillIds).toEqual(["m.frac.equiv", "m.frac.unit"]);
    const photo = mergeGuess(guess(""), { kind: "homework", title: "Worksheet", date: "2026-10-12", skillIds: [], notes: [] }, { today: TODAY });
    expect(photo.date).toBe("2026-10-12");
  });

  it("labels a saved item as read by the AI only when its kind, name and day are all the reader's", () => {
    const read = { kind: "test" as const, title: "Unit 2  test", date: "2026-10-16", skillIds: [], notes: [] };
    expect(readByAi(read, { kind: "test", title: "Unit 2 test", date: "2026-10-16" })).toBe(true);
    expect(readByAi(read, { kind: "quiz", title: "Unit 2 test", date: "2026-10-16" })).toBe(false);
    expect(readByAi(read, { kind: "test", title: "Math test", date: "2026-10-16" })).toBe(false);
    expect(readByAi({ ...read, date: undefined }, { kind: "test", title: "Unit 2 test", date: "2026-10-16" })).toBe(false); // the family picked the day
    expect(readByAi(null, { kind: "test", title: "Unit 2 test", date: "2026-10-16" })).toBe(false);
  });

  it("takes the grown-up's own name out too, word by word", () => {
    const r = redactNames("Maria Lopez here: Ada's test, Lopez family", ["Ada", "Maria Lopez"]);
    expect(r.text).toBe("[name1] here: [name3]'s test, [name2] family");
    expect(r.restore(r.text)).toBe("Maria Lopez here: Ada's test, Lopez family");
  });
});

describe("readIntake (server)", () => {
  const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } };
  const reply = (obj: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(obj) }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] });
  const out = {
    kind: "homework",
    title: "Fractions  worksheet",
    date: "2026-10-09",
    subject: "math",
    topic: "fractions",
    skillIds: ["m.frac.unit", "made.up"],
    notes: ["Friday read as this coming Friday."],
  };

  it("keeps only real skills and real days, and passes the file to the model", async () => {
    let prompt = "";
    const model = new MockLanguageModelV4({
      doGenerate: async (opts) => {
        prompt = JSON.stringify(opts.prompt);
        return reply(out);
      },
    });
    const r = await readIntake({ kind: "intake", text: "fractions worksheet due Friday", file: "data:image/jpeg;base64,AAAA", today: TODAY, locale: "en", grade: "4" }, model);
    expect(r).toMatchObject({ kind: "homework", title: "Fractions worksheet", date: "2026-10-09", skillIds: ["m.frac.unit"] });
    expect(prompt).toContain("Wednesday 2026-10-07");
    expect(prompt).toContain("image/jpeg");
    const bad = await readIntake({ kind: "intake", text: "x", today: TODAY, locale: "en", grade: "4" }, new MockLanguageModelV4({ doGenerate: async () => reply({ ...out, date: "2026-13-40" }) }));
    expect(bad.date).toBeNull();
  });

  describe("POST /api/ai/extract", () => {
    const post = (body: unknown) => POST(new Request("http://x/api/ai/extract", { method: "POST", body: JSON.stringify(body) }));
    const intake = { kind: "intake", text: "fractions worksheet due Friday", today: TODAY, locale: "en", grade: "4" };
    afterEach(() => (ai.model = null));

    it("says demo when no AI is connected, for both readers", async () => {
      expect((await post(intake)).status).toBe(503);
      expect((await post({ kind: "syllabus", text: "x", today: TODAY, locale: "en", grade: "4" })).status).toBe(503);
    });

    it("runs the safety screen before any model call", async () => {
      const doGenerate = vi.fn(async () => reply(out));
      ai.model = new MockLanguageModelV4({ doGenerate }) as unknown as LanguageModel;
      const res = await post({ ...intake, text: "i want to die" });
      expect(res.status).toBe(422);
      expect(doGenerate).not.toHaveBeenCalled();
    });

    it("reads an intake request, and turns away one with nothing in it", async () => {
      ai.model = new MockLanguageModelV4({ doGenerate: async () => reply(out) }) as unknown as LanguageModel;
      const res = await post(intake);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ kind: "homework", skillIds: ["m.frac.unit"] });
      expect((await post({ ...intake, text: undefined })).status).toBe(400);
      expect((await post({ ...intake, text: "   " })).status).toBe(400);
      // Only a photo or a PDF as a base64 data URL ever reaches the model.
      expect((await post({ ...intake, text: undefined, file: "not a file" })).status).toBe(400);
      expect((await post({ ...intake, file: "data:text/html;base64,PGI+" })).status).toBe(400);
      expect((await post({ ...intake, file: "data:application/pdf;base64,JVBERg==" })).status).toBe(200);
    });

    it("still reads school documents for the calendar import", async () => {
      ai.model = new MockLanguageModelV4({
        doGenerate: async () => reply({ events: [{ title: "Unit test", date: "2026-10-21", kind: "test" }], topics: [], skillIds: [], notes: [] }),
      }) as unknown as LanguageModel;
      const res = await post({ kind: "syllabus", text: "Unit test Oct 21", today: TODAY, locale: "en", grade: "4" });
      expect(res.status).toBe(200);
      expect((await res.json()).events).toHaveLength(1);
    });
  });
});

describe("school items from the box", () => {
  beforeEach(() => resetMemory());
  afterEach(() => resetMemory());
  const pdf = () => new Blob(["%PDF-1.4 worksheet"], { type: "application/pdf" });

  it("saves the item with its file in the file store, and only real skills", async () => {
    const made = await saveSchoolItem("p1", {
      kind: "homework",
      title: "Fractions worksheet",
      date: "2026-10-09",
      skillIds: ["m.frac.unit", "nope"],
      text: "fractions worksheet due Friday",
      file: { blob: pdf(), name: "sheet.pdf" },
      source: "typed",
    });
    if (typeof made === "string") throw new Error(made);
    expect(made).toMatchObject({ profileId: "p1", kind: "homework", date: "2026-10-09", skillIds: ["m.frac.unit"], source: "typed" });
    // A one-line request lives in the title and date; it isn't kept twice.
    expect(made.attachment).toEqual({ blobId: made.attachment!.blobId, name: "sheet.pdf", mediaType: "application/pdf" });
    expect((await getBlob(made.attachment!.blobId!))?.name).toBe("sheet.pdf");
    expect(getEvent(read(), made.id, "p1")).toEqual(made);
  });

  it("keeps a pasted page as text", async () => {
    const note = "Hi families,\nOur unit 2 math test is on Friday Oct 16.\nPlease review fractions.";
    expect(keepsText(note)).toBe(true);
    expect(keepsText("fractions worksheet due Friday")).toBe(false);
    // Renamed by the family: the page and problem numbers would be lost, so the words are kept.
    expect(keepsText("p. 45-46 #1-19 odd, show work, due Friday", "Math homework", "P. 45-46 #1-19 odd, show work")).toBe(true);
    expect(keepsText("p. 45-46 #1-19 odd, show work, due Friday", "p. 45-46 #1-19 odd,  show work", "P. 45-46 #1-19 odd, show work")).toBe(false);
    const made = await saveSchoolItem("p1", { kind: "test", title: "Unit 2 math test", date: "2026-10-16", skillIds: [], text: note, source: "typed" });
    expect(typeof made !== "string" && made.attachment).toEqual({ text: note });
  });

  it("checks the name and day before it saves anything", async () => {
    expect(await saveSchoolItem("p1", { kind: "homework", title: " ", date: "2026-10-09", skillIds: [], source: "typed" })).toBe("err.title");
    expect(await saveSchoolItem("p1", { kind: "homework", title: "Worksheet", date: "", skillIds: [], file: { blob: pdf(), name: "a.pdf" }, source: "typed" })).toBe("err.date");
    expect(await saveSchoolItem("p1", { kind: "homework", title: "Worksheet", date: "2026-10-09", skillIds: [], file: { blob: new Blob([]), name: "empty.pdf" }, source: "typed" })).toBe("err.file");
    expect(read().events).toHaveLength(0);
  });

  it("getEvent shows an item only to the learner it belongs to", () => {
    const e = addEvent("p1", { title: "Quiz", kind: "quiz", date: "2026-10-09" })!;
    expect(getEvent(read(), e.id, "p1")?.id).toBe(e.id);
    expect(getEvent(read(), e.id, "p2")).toBeUndefined();
    expect(getEvent(read(), "nope", "p1")).toBeUndefined();
  });

  it("keeps only clean attachments, and leaves items without one unchanged", () => {
    const e = addEvent("p1", { title: "Sheet", kind: "homework", date: "2026-10-09", attachment: { text: "  ", blobId: "../../etc", name: "x", mediaType: "text/html<script>" } })!;
    expect(e.attachment).toBeUndefined();
    const f = addEvent("p1", { title: "Sheet", kind: "homework", date: "2026-10-09", attachment: { blobId: "abc-123", name: "  photo.jpg ", mediaType: "image/jpeg" } })!;
    expect(f.attachment).toEqual({ blobId: "abc-123", name: "photo.jpg", mediaType: "image/jpeg" });
    expect("attachment" in addEvent("p1", { title: "Plain", kind: "test", date: "2026-10-09" })!).toBe(false);
  });

  it("deleting an item, or taking its file off, deletes the file too", async () => {
    const id = (await putBlob(pdf(), "a.pdf"))!;
    const e = addEvent("p1", { title: "Sheet", kind: "homework", date: "2026-10-09", attachment: { blobId: id, name: "a.pdf", mediaType: "application/pdf" } })!;
    updateEvent(e.id, { attachment: undefined });
    expect(read().events[0].attachment).toBeUndefined();
    await vi.waitFor(async () => expect(await getBlob(id)).toBeNull());

    const id2 = (await putBlob(pdf(), "b.pdf"))!;
    const e2 = addEvent("p1", { title: "Sheet 2", kind: "homework", date: "2026-10-09", attachment: { blobId: id2 } })!;
    removeEvent(e2.id);
    expect(read().events.find((x) => x.id === e2.id)).toBeUndefined();
    await vi.waitFor(async () => expect(await getBlob(id2)).toBeNull());
  });

  it("updateEvent keeps its old behaviour for everything else", () => {
    const e = addEvent("p1", { title: "Quiz", kind: "quiz", date: "2026-10-09", skillIds: ["m.frac.unit"] })!;
    updateEvent(e.id, { done: true, title: "  Fractions quiz  " });
    expect(read().events[0]).toMatchObject({ done: true, title: "Fractions quiz", skillIds: ["m.frac.unit"] });
  });
});

describe("where practice and learning go", () => {
  it("builds links with the words in them", () => {
    expect(builderHref("  Why is the sky blue?  ")).toBe("/courses/new?goal=Why%20is%20the%20sky%20blue%3F");
    expect(practiceSearchHref("telling time", "math")).toBe("/practice?q=telling+time&subject=math");
    expect(practiceSearchHref("knots", "other")).toBe("/practice?q=knots");
  });
});
