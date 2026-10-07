import { describe, expect, it } from "vitest";
import { say } from "@/components/family/say";
import type { ActivityEvent, Course } from "@/lib/types";
import { getSkill, makeItem } from "@/practice/skills";
import type { SkillStatus } from "./engine";
import type { ResolvedAct } from "./outcomes";
import { representationOf, teachingProfile, verifiedEducation, type Fact, type ProfileInput } from "./profile";
import type { Attempt, PracticeSet, TeachingAct } from "./types";

// Each teaching fact from a scripted history: enough evidence gives a value and a sentence with the
// count behind it; too little says "not enough yet"; a grown-up's choice wins and is marked.

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const T0 = new Date(2026, 9, 5, 15, 0).getTime(); // Monday 5 Oct 2026, 3 pm local
const NOW = T0 + 3 * DAY;
const P = "kid";
const S = "m.add.20"; // words only
const LINE = "m.round"; // number line at level 1

let k = 0;
const ans = (o: Partial<Attempt> & { at: number }): Attempt => ({ id: `a${k++}`, profileId: P, skillId: S, level: 1, seed: k, mode: "practice", correct: true, assisted: false, seconds: 8, ...o });
const set = (id: string, slots: number, o: Partial<PracticeSet> = {}): PracticeSet => ({
  id,
  profileId: P,
  createdAt: T0,
  kind: "pick",
  subject: "math",
  skillId: S,
  slots: Array.from({ length: slots }, (_, i) => ({ skillId: S, seed: 1000 * id.length + i, role: "main" as const })),
  ...o,
});
const profile = (o: Partial<ProfileInput>) => teachingProfile({ attempts: [], acts: [], sets: [], ...o }, NOW);
const words = <V,>(f: Fact<V>, locale: "en" | "es" = "en") => f.says.map((s) => say(s, locale)).join(" ");

describe("hint rung", () => {
  // Problems in one set; each gets hints up to some rung, then an answer.
  const s1 = set("s1", 10);
  const hinted = (slot: number, rungs: number[], correct: boolean) => ({
    acts: rungs.map((r): TeachingAct => ({ id: `h${k++}`, profileId: P, at: T0 + slot * MIN, kind: "hint", intent: "next-try-right", skillId: S, setId: "s1", ref: String(slot), detail: String(r) })),
    answer: ans({ at: T0 + slot * MIN + 30_000, setId: "s1", seed: s1.slots[slot].seed, assisted: true, correct }),
  });
  const history = [hinted(0, [1, 2, 3], true), hinted(1, [1, 2, 3], true), hinted(2, [1, 2, 3], true), hinted(3, [1], true), hinted(4, [1, 2], false)];
  const of = (h: typeof history) => profile({ sets: [s1], acts: h.flatMap((x) => x.acts), attempts: h.map((x) => x.answer) }).hintRung;

  it("starts as high as it can without handing over a step more than a quarter of solved problems didn't need", () => {
    const f = of(history);
    expect(f).toMatchObject({ value: 3, enough: true, evidence: 4, source: "record", solved: [1, 0, 3] });
    expect(words(f)).toBe("Of 4 problems solved after a hint, 1 took the nudge, 0 the strategy and 3 the first step.");
    expect(words(f, "es")).toBe("De 4 problemas resueltos con una pista: con la pista corta, 1; con la estrategia, 0; con el primer paso, 3.");
  });

  it("stays at the nudge when the nudge alone often did it, even if the first step was needed more often", () => {
    // 3 after the nudge, 4 after the first step: starting at the first step would over-help 3 of 7.
    const mixed = [0, 1, 2].map((i) => hinted(i, [1], true)).concat([3, 4, 5, 6].map((i) => hinted(i, [1, 2, 3], true)));
    expect(of(mixed)).toMatchObject({ value: 1, solved: [3, 0, 4] });
    const strategy = [0, 1, 2, 3, 4].map((i) => hinted(i, [1, 2], true)).concat([hinted(5, [1, 2, 3], true)]);
    expect(of(strategy)).toMatchObject({ value: 2, solved: [0, 5, 1] });
  });

  it("says not enough yet below four solved problems", () => {
    const few = history.slice(0, 3);
    const f = profile({ sets: [s1], acts: few.flatMap((h) => h.acts), attempts: few.map((h) => h.answer) }).hintRung;
    expect(f).toMatchObject({ value: null, enough: false, evidence: 3 });
    expect(words(f)).toBe("Shows after 4 problems solved with a hint. So far: 3.");
  });
});

describe("worked example or hint first", () => {
  const helped = (kind: "hint" | "steps", slot: number, status: ResolvedAct["status"]): ResolvedAct => ({ id: `r${k++}`, profileId: P, at: T0, kind, intent: "next-try-right", setId: "s1", ref: String(slot), skillId: S, status, resolvedAt: T0 + MIN });
  const hints = (met: number, of: number) => Array.from({ length: of }, (_, i) => helped("hint", i, i < met ? "met" : "missed"));
  const examples = (met: number, of: number) => Array.from({ length: of }, (_, i) => helped("steps", 100 + i, i < met ? "met" : "missed"));

  it("leads with whichever more often leads to the next problem right on their own", () => {
    const f = profile({ resolved: [...hints(1, 3), ...examples(3, 3)] }).leadWith;
    expect(f).toMatchObject({ value: "example", enough: true, evidence: 6 });
    expect(words(f)).toBe("After a worked example, the next problem was right on their own 3 of 3 times; after a hint, 1 of 3.");
    expect(profile({ resolved: [...hints(3, 3), ...examples(1, 3)] }).leadWith.value).toBe("hint");
  });

  it("has no answer when they work about as often, and not enough below three of each", () => {
    expect(profile({ resolved: [...hints(2, 3), ...examples(2, 3)] }).leadWith).toMatchObject({ value: null, enough: true });
    const few = profile({ resolved: [...hints(3, 3), ...examples(1, 1)] }).leadWith;
    expect(few).toMatchObject({ value: null, enough: false });
    expect(words(few)).toBe("Shows after 3 of each. So far: 3 after a hint, 1 after a worked example.");
  });

  it("a grown-up's choice wins, is marked, and keeps what the record says", () => {
    const f = profile({ resolved: [...hints(1, 3), ...examples(3, 3)], prefs: { leadWith: "hint" } }).leadWith;
    expect(f).toMatchObject({ value: "hint", source: "grown-up", derived: "example" });
    expect(words(f)).toContain("3 of 3 times");
  });
});

describe("representation", () => {
  const level1 = (skillId: string, misses: number) => Array.from({ length: 6 }, (_, i) => ans({ at: T0 + k * MIN, skillId, seed: 50 + i, correct: i >= misses }));

  it("knows the picture each problem leads with", () => {
    expect(representationOf(makeItem(LINE, 1, 3, "en"))).toBe("number-line");
    expect(representationOf(makeItem("m.add.10", 1, 3, "en"))).toBe("blocks");
    expect(representationOf(makeItem("m.place.tens", 1, 3, "en"))).toBe("blocks");
    expect(representationOf(makeItem("m.frac.unit", 1, 3, "en"))).toBe("blocks");
    expect(representationOf(makeItem("m.time.clock", 1, 3, "en"))).toBe("pictures");
    expect(representationOf(makeItem("e.rhyme", 1, 3, "en"))).toBe("pictures");
    expect(representationOf(makeItem("m.add.2digit", 1, 3, "en"))).toBe("words");
    expect(representationOf(makeItem(S, 1, 3, "en"))).toBe("words");
    expect(representationOf({ input: "number-line" })).toBe("number-line");
    expect(representationOf({ input: "fraction-bar" })).toBe("blocks");
    expect(representationOf({ input: "clock" })).toBe("pictures");
  });

  it("is the kind they miss least with at the first level", () => {
    const f = profile({ attempts: [...level1(LINE, 0), ...level1(S, 3)] }).representation;
    expect(f).toMatchObject({ value: "number-line", enough: true, evidence: 12 });
    expect(words(f)).toBe("At the first level of a skill, they needed help or missed 0 of 6 with number lines and 3 of 6 with words and numbers only.");
  });

  it("counts a problem solved only with help as not landing, the way practice records it", () => {
    // Practice stores one answer per problem: solved after tries or hints is right but helped.
    const helped = (skillId: string, n: number) => Array.from({ length: 6 }, (_, i) => ans({ at: T0 + k * MIN, skillId, seed: 70 + i, correct: true, assisted: i < n }));
    const f = profile({ attempts: [...helped(LINE, 5), ...helped(S, 0)] }).representation;
    expect(f).toMatchObject({ value: "words", enough: true });
    expect(words(f)).toBe("At the first level of a skill, they needed help or missed 0 of 6 with words and numbers only and 5 of 6 with number lines.");
  });

  it("leaves out placement, which runs until a miss, and checks, which allow no help", () => {
    const placed = level1(LINE, 6).map((a) => ({ ...a, mode: "placement" as const }));
    const checked = level1(LINE, 0).map((a) => ({ ...a, mode: "check" as const }));
    expect(profile({ attempts: [...placed, ...checked, ...level1(S, 3)] }).representation.enough).toBe(false);
  });

  it("needs two kinds with enough problems each; a grown-up's choice wins", () => {
    expect(profile({ attempts: level1(S, 3) }).representation).toMatchObject({ value: null, enough: false });
    expect(profile({ attempts: [...level1(LINE, 1), ...level1(S, 1)] }).representation).toMatchObject({ value: null, enough: true });
    const set = profile({ attempts: [...level1(LINE, 0), ...level1(S, 3)], prefs: { representation: "pictures" } }).representation;
    expect(set).toMatchObject({ value: "pictures", source: "grown-up", derived: "number-line" });
  });

  it("only reads level-1 answers", () => {
    const higher = level1(S, 6).map((a) => ({ ...a, level: 2 }));
    expect(profile({ attempts: [...level1(LINE, 0), ...higher] }).representation.enough).toBe(false);
  });
});

describe("pace", () => {
  const usual = makeItem(S, 1, 1, "en").seconds;
  const timed = (n: number, seconds: number) => Array.from({ length: n }, (_, i) => ans({ at: T0 + i * MIN, seed: i + 1, seconds }));

  it("compares seconds a problem with the usual pace for the same problems", () => {
    const f = profile({ attempts: timed(12, usual * 2) }).pace;
    expect(f).toMatchObject({ value: "slower", evidence: 12 });
    expect(words(f)).toBe(`Usually about ${usual * 2} seconds a problem; the usual pace for the same problems is ${usual} seconds. It is never shown as a timer.`);
    expect(profile({ attempts: timed(12, usual) }).pace.value).toBe("usual");
    expect(profile({ attempts: timed(12, usual / 2) }).pace.value).toBe("quicker");
  });

  it("uses the same bounds as a finished set's pace words", () => {
    expect(profile({ attempts: timed(12, usual * 1.4) }).pace.value).toBe("slower");
    expect(profile({ attempts: timed(12, usual * 1.3) }).pace.value).toBe("usual");
  });

  it("needs ten answers", () => {
    expect(profile({ attempts: timed(9, usual) }).pace).toMatchObject({ value: null, enough: false, evidence: 9 });
  });
});

describe("how a sitting goes", () => {
  const answers = (setId: string, n: number, from: number) => Array.from({ length: n }, (_, i) => ans({ at: from + i * MIN, setId, seconds: 30 }));
  const finished = (id: string) => ({ s: set(id, 10, { finishedAt: T0 + DAY }), a: answers(id, 10, T0) });
  const left = (id: string, n: number) => ({ s: set(id, 6), a: answers(id, n, T0) });

  it("finds where they stop when they often leave a set partway", () => {
    const all = [finished("a"), finished("bb"), finished("ccc"), left("dddd", 3), left("eeeee", 5)];
    const f = profile({ sets: all.map((x) => x.s), attempts: all.flatMap((x) => x.a) }).sessions;
    expect(f).toMatchObject({ value: "stops-early", evidence: 5 });
    expect(words(f)).toBe("Stopped partway through 2 of 5 sets, usually after 4 problems (about 2 min). Sets of 6 problems or fewer: finished 0 of 2. Longer sets: 3 of 3.");
  });

  it("says when they finish, and leaves out checks and sets still under way", () => {
    const open = { s: set("open", 10), a: answers("open", 2, NOW - HOUR) };
    const check = { s: set("chk", 5, { kind: "check" }), a: answers("chk", 2, T0) };
    const all = [finished("a"), finished("bb"), finished("ccc"), finished("dddd"), open, check];
    const f = profile({ sets: all.map((x) => x.s), attempts: all.flatMap((x) => x.a) }).sessions;
    expect(f).toMatchObject({ value: "finishes", evidence: 4 });
    expect(words(f)).toBe("Finished 4 of 4 sets they started.");
    expect(profile({ sets: [finished("a").s], attempts: finished("a").a }).sessions.enough).toBe(false);
  });
});

describe("mistakes that come back", () => {
  const F = "m.frac.addunlike";
  const wrong = (setId: string, why: string, response: string) => ans({ at: T0 + k * MIN, skillId: F, setId, correct: false, why, response });

  it("lists tagged mistakes seen in more than one set, most frequent first", () => {
    const attempts = [wrong("a", "added-denominators", "2/5"), wrong("a", "added-denominators", "3/8"), wrong("b", "added-denominators", "2/7"), wrong("a", "flipped", "5/3")];
    const f = profile({ attempts }).misconceptions;
    expect(f.value).toEqual([{ tag: "added-denominators", count: 3, sets: 2, skillIds: [F], example: "2/7" }]);
    expect(words(f)).toBe(`“added the denominators”: 3 times in 2 sets, in ${getSkill(F)!.title.en}. Last time they answered 2/7.`);
    expect(words(f, "es")).toBe(`“sumó los denominadores”: 3 veces en 2 prácticas, en ${getSkill(F)!.title.es}. La última vez contestó 2/7.`);
  });

  it("names a mistake in the reader's language: the author's words in English, a plain phrase where no translation exists", () => {
    const attempts = [wrong("a", "flipped-the-fraction", "5/3"), wrong("b", "flipped-the-fraction", "7/2"), wrong("b", "flipped-the-fraction", "9/4")];
    const f = profile({ attempts }).misconceptions;
    expect(words(f)).toBe(`“flipped the fraction”: 3 times in 2 sets, in ${getSkill(F)!.title.en}. Last time they answered 9/4.`);
    expect(words(f, "es")).toBe(`Un error que se repite: 3 veces en 2 prácticas, en ${getSkill(F)!.title.es}. La última vez contestó 9/4.`);
  });

  it("says when none came back, and not enough below three", () => {
    const same = [wrong("a", "flipped", "1"), wrong("a", "flipped", "2"), wrong("a", "flipped", "3")];
    expect(profile({ attempts: same }).misconceptions).toMatchObject({ value: null, enough: true });
    expect(words(profile({ attempts: same }).misconceptions)).toBe("None of the 3 tagged mistakes has come back in a second set.");
    expect(profile({ attempts: same.slice(0, 2) }).misconceptions).toMatchObject({ value: null, enough: false });
  });
});

describe("time of day and day of the week", () => {
  const at = (day: number, hour: number, i: number) => new Date(2026, 9, day, hour, i).getTime();
  const block = (day: number, hour: number, n: number, own: number) => Array.from({ length: n }, (_, i) => ans({ at: at(day, hour, i), correct: i < own }));

  it("finds the time of day they are right on their own most, only with enough answers at two times", () => {
    const f = profile({ attempts: [...block(5, 9, 15, 14), ...block(5, 19, 15, 6)] }).timeOfDay;
    expect(f).toMatchObject({ value: "morning", evidence: 30 });
    expect(words(f)).toBe("Right on their own 14 of 15 times in the morning and 6 of 15 times in the evening.");
    expect(profile({ attempts: [...block(5, 9, 15, 10), ...block(5, 19, 15, 10)] }).timeOfDay).toMatchObject({ value: null, enough: true });
    expect(profile({ attempts: [...block(5, 9, 14, 14), ...block(5, 19, 15, 6)] }).timeOfDay.enough).toBe(false);
  });

  it("names no best time when the top two are as good as each other, however poor the rest", () => {
    const f = profile({ attempts: [...block(5, 9, 15, 14), ...block(5, 14, 15, 14), ...block(5, 19, 15, 6)] }).timeOfDay;
    expect(f).toMatchObject({ value: null, enough: true, evidence: 45 });
    expect(words(f)).toBe("Right on their own 14 of 15 times in the morning, 14 of 15 times in the afternoon, and 6 of 15 times in the evening.");
  });

  it("finds the weekday the same way, and leaves out placement", () => {
    const placed = block(9, 10, 10, 10).map((a) => ({ ...a, mode: "placement" as const }));
    const f = profile({ attempts: [...block(5, 16, 10, 9), ...block(9, 16, 10, 3), ...placed] }).weekday;
    expect(f).toMatchObject({ value: 1, evidence: 20 });
    expect(words(f)).toBe("Right on their own 9 of 10 times on Mondays and 3 of 10 times on Fridays.");
    expect(words(f, "es")).toBe("Bien por su cuenta 9 de 10 veces los lunes y 3 de 10 veces los viernes.");
  });
});

describe("language, voice and the note", () => {
  it("comes from settings and says so", () => {
    const f = profile({ learner: { locale: "es", grade: "K", settings: { voiceInput: true } } }).language;
    expect(f).toMatchObject({ value: { locale: "es", readAloud: true, mic: true }, source: "settings" });
    expect(words(f)).toBe("Learns in Spanish. The tutor reads its replies aloud unless it's turned off. They may talk to the tutor with the microphone.");
    expect(profile({ learner: { locale: "en", grade: "6" } }).language.value).toEqual({ locale: "en", readAloud: false, mic: false });
  });

  it("carries the grown-up's note", () => {
    expect(profile({ prefs: { note: "  Loves drawing " } }).note).toBe("Loves drawing");
    expect(profile({ prefs: { note: "  " } }).note).toBeUndefined();
  });
});

describe("turned off", () => {
  it("works nothing out from the record, keeps no choice or note, and says it is off", () => {
    const attempts = Array.from({ length: 12 }, (_, i) => ans({ at: T0 + i * MIN, seed: i + 1, seconds: 30 }));
    const f = profile({ attempts, prefs: { off: true, representation: "pictures", note: "x" } });
    expect(f.off).toBe(true);
    expect(f.note).toBeUndefined();
    for (const fact of [f.hintRung, f.leadWith, f.representation, f.pace, f.sessions, f.misconceptions, f.timeOfDay, f.weekday, f.language])
      expect(fact).toMatchObject({ value: null, enough: false, evidence: 0, says: [] });
  });
});

describe("verified education", () => {
  const status = (skillId: string, o: Partial<SkillStatus>): SkillStatus => ({ skillId, state: "practicing", level: 1, overdue: false, stuck: false, totals: { own: 0, helped: 0, missed: 0 }, ...o });
  const ev = (type: ActivityEvent["type"], courseId: string, o: Partial<ActivityEvent> = {}): ActivityEvent => ({ id: `e${k++}`, profileId: P, at: T0, type, courseId, ...o });
  const course = (id: string, o: Partial<Course> = {}): Course => ({
    id,
    profileId: P,
    title: `Course ${id}`,
    goal: "",
    subject: "math",
    grade: "3",
    locale: "en",
    origin: "catalogue",
    status: "ready",
    length: "short",
    sources: [],
    template: false,
    createdAt: T0,
    updatedAt: T0,
    lessons: [
      { id: "l1", title: "One", summary: "", minutes: 5, scenes: [] },
      { id: "l2", title: "Two", summary: "", minutes: 5, scenes: [] },
    ],
    ...o,
  });

  it("lists proof with dates and standards, courses with their check tallies, and school results apart", () => {
    const v = verifiedEducation({
      statuses: {
        [S]: status(S, { state: "proved", provedAt: T0 }),
        [LINE]: status(LINE, { state: "refresh", provedAt: T0 + DAY }),
        "m.add.10": status("m.add.10", {}),
      },
      activity: [ev("lesson_completed", "a", { lessonId: "l1" }), ev("quiz_answered", "a", { correct: true }), ev("quiz_answered", "a", { correct: true, assisted: true }), ev("quiz_answered", "a", { correct: false })],
      courses: [course("a"), course("b"), course("c", { status: "outlining" })],
      results: [
        { id: "r1", profileId: P, title: "Quiz 1", date: "2026-09-30", score: 8, outOf: 10 },
        { id: "r2", profileId: P, title: "Quiz 2", date: "2026-10-02", score: 9, outOf: 10 },
      ],
    });
    expect(v.proved).toEqual([
      { skillId: LINE, provedAt: T0 + DAY, standard: getSkill(LINE)!.standard, refresh: true },
      { skillId: S, provedAt: T0, standard: getSkill(S)!.standard, refresh: false },
    ]);
    expect(v.courses).toEqual([{ courseId: "a", title: "Course a", done: 1, total: 2, own: 1, helped: 1, missed: 1 }]);
    expect(v.school.map((r) => r.id)).toEqual(["r2", "r1"]);
  });
});
