import { afterAll, describe, expect, it } from "vitest";
import { RULES } from "@/learning/engine";
import type { Attempt, PracticeSet } from "@/learning/types";
import { addDays, localDate } from "@/planner/dates";
import type { ReadingEntry } from "@/planner/types";
import { startOfWeek } from "./activity";
import { weekFacts } from "./family";
import {
  gradedChecks,
  lessonAnswers,
  lessonTallies,
  practicedSkills,
  recordStart,
  schoolResults,
  weekBounds,
  weekLog,
  weeklyGrowth,
  windowEnd,
  type GrowthWeek,
  type LogEntry,
  type SubjectGrowth,
} from "./growth";
import { emptyState, type StoreState } from "./store";
import type { ActivityEvent, Course, Subject } from "./types";

// Pinned to a zone whose clocks change on 1 November 2026, so the week and day maths are tested
// across a change on any machine (CI runs in UTC, which has none).
const zone = process.env.TZ;
process.env.TZ = "America/Chicago";
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const H = 3600_000, D = 24 * H;
// Wednesday 7 October 2026, 3 pm local. The eight weeks start on the Mondays from 17 August to 5 October.
const NOW = new Date(2026, 9, 7, 15, 0).getTime();
/** Tuesday 4 pm of window week i (0 = the week of 17 August, 7 = this week). */
const tue = (i: number) => new Date(2026, 7, 18 + 7 * i, 16, 0).getTime();

let n = 0;
const at = (skillId: string, t: number, correct: boolean, o: Partial<Attempt> = {}): Attempt => ({
  id: `a${n++}`,
  profileId: "ada",
  at: t,
  skillId,
  level: 1,
  seed: n,
  mode: "practice",
  correct,
  assisted: false,
  seconds: 5,
  ...o,
});
const practice = (skillId: string, t: number, right: number, size = right, setId = `p${t}`) =>
  Array.from({ length: size }, (_, i) => at(skillId, t + i * 60_000, i < right, { setId }));
const check = (skillId: string, t: number, right: number, size = RULES.checkSize) =>
  Array.from({ length: size }, (_, i) => at(skillId, t + i * 60_000, i < right, { mode: "check", setId: `c${t}` }));

const state = (patch: Partial<StoreState>): StoreState => ({ ...emptyState(), ...patch });
const of = (list: SubjectGrowth[], subject: Subject) => list.find((g) => g.subject === subject)!;
const counts = (weeks: GrowthWeek[]) => weeks.map((w) => [w.proved, w.ready, w.practicing]);
let k = 0;
const ev = (type: ActivityEvent["type"], t: number, o: Partial<ActivityEvent> = {}): ActivityEvent => ({ id: `ev${k++}`, profileId: "ada", at: t, type, courseId: "sci", lessonId: "l1", ...o });
const course = (id: string, subject: Subject): Course => ({
  id, profileId: "ada", title: id, goal: id, subject, grade: "4", locale: "en", origin: "catalogue", status: "ready", length: "short", sources: [], lessons: [], template: false, createdAt: 0, updatedAt: 0,
});
const book = (date: string, minutes: number, o: Partial<ReadingEntry> = {}): ReadingEntry => ({ id: `r-${date}-${minutes}`, profileId: "ada", date, title: "Frog and Toad", minutes, ...o });

describe("weekBounds", () => {
  it("gives the Mondays of the last eight weeks and the Monday after, at local midnight", () => {
    const b = weekBounds(NOW, 8);
    expect(b).toHaveLength(9);
    expect(b.map(localDate)).toEqual(["2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(b[7]).toBe(startOfWeek(NOW));
  });

  it("stays on calendar weeks across a clock change", () => {
    // The zone really does change its clocks inside these weeks.
    expect(new Date(2026, 10, 2).getTimezoneOffset()).not.toBe(new Date(2026, 9, 26).getTimezoneOffset());
    const b = weekBounds(new Date(2026, 10, 10, 9).getTime(), 4);
    expect(b.map(localDate)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(b.every((t) => new Date(t).getHours() === 0 && new Date(t).getDay() === 1)).toBe(true);
    // The week with the change is an hour longer than seven days of 24 hours.
    expect(b[2] - b[1]).toBe(7 * D + H);
  });
});

describe("windowEnd: earlier windows of eight weeks", () => {
  it("is now for the current weeks, and the last moment before the next window for earlier ones", () => {
    expect(windowEnd(NOW, 0)).toBe(NOW);
    const end = windowEnd(NOW, 1);
    expect(end + 1).toBe(weekBounds(NOW, 8)[0]);
    expect(localDate(end)).toBe("2026-08-16");
    expect(weekBounds(end, 8).map(localDate)).toEqual(["2026-06-22", "2026-06-29", "2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17"]);
    expect(windowEnd(NOW, 2) + 1).toBe(weekBounds(end, 8)[0]);
  });

  it("replays an earlier window with only the evidence up to its end", () => {
    const june = new Date(2026, 6, 7, 16).getTime();
    const s = state({ attempts: [...practice("m.add.5", june, 3), ...practice("m.add.5", tue(2), 10)] });
    const before = of(weeklyGrowth(s, "ada", windowEnd(NOW, 1)), "math");
    expect(counts(before.weeks).at(-1)).toEqual([0, 0, 1]);
    expect(before.weeks.reduce((sum, w) => sum + w.minutes, 0)).toBe(1);
    expect(counts(of(weeklyGrowth(s, "ada", NOW), "math").weeks).at(-1)).toEqual([0, 1, 0]);
  });
});

describe("recordStart", () => {
  it("is the learner's first answer, lesson, reading or school result; adding a course is not a start", () => {
    const s = state({
      attempts: [at("m.add.5", tue(3), true), at("m.add.5", tue(0), true, { profileId: "bo" })],
      activity: [ev("course_added", tue(0) - D, { lessonId: undefined }), ev("lesson_started", tue(2))],
      reading: [book("2026-08-26", 10)],
      results: [{ id: "x", profileId: "ada", title: "Spelling", date: "2026-08-25", score: 9, outOf: 10 }],
    });
    expect(localDate(recordStart(s, "ada")!)).toBe("2026-08-25");
    expect(recordStart(s, "nobody")).toBeUndefined();
  });
});

describe("weeklyGrowth replays the mastery law at each week's end", () => {
  const attempts = [
    ...practice("m.add.5", tue(3), 5), // practicing
    ...practice("m.add.5", tue(4), 10), // ready for a check
    ...check("m.add.5", tue(5), 5), // passed 1 of 2
    ...check("m.add.5", tue(6), 4), // passed again, 7 days later: proved
    ...practice("m.count.10", tue(6), 1, 3), // practicing
    ...check("m.count.10", tue(6) + H, 1), // a check not passed
    ...check("m.count.10", tue(6) + 2 * H, 4, 4), // four answers: not a whole check, not graded
    at("m.add.5", tue(7), true, { profileId: "bo" }), // another learner
  ];
  const math = of(weeklyGrowth(state({ attempts }), "ada", NOW), "math");

  it("counts skills proved, ready for a check and practicing as they stood each Monday", () => {
    expect(counts(math.weeks)).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 1, 0],
      [1, 0, 1],
      [1, 0, 1],
    ]);
    expect(math.any).toBe(true);
  });

  it("counts whole checks only, in the week they were taken", () => {
    expect(math.weeks.map((w) => w.checks)).toEqual([
      ...Array(5).fill({ passed: 0, taken: 0 }),
      { passed: 1, taken: 1 },
      { passed: 1, taken: 2 },
      { passed: 0, taken: 0 },
    ]);
  });

  it("adds up practice time per week, rounded up to whole minutes", () => {
    // Week 6: a check (25 s), three answers (15 s), a failed check (25 s), four check answers (20 s).
    expect(math.weeks.map((w) => w.minutes)).toEqual([0, 0, 0, 1, 1, 1, 2, 0]);
  });

  it("keeps a skill proved before the window proved in every week", () => {
    const early = new Date(2026, 5, 2, 16).getTime();
    const g = of(weeklyGrowth(state({ attempts: [...practice("m.add.5", early, 10), ...check("m.add.5", early + D, 5), ...check("m.add.5", early + 8 * D, 5)] }), "ada", NOW), "math");
    expect(counts(g.weeks)).toEqual(Array(8).fill([1, 0, 0]));
    expect(g.weeks.every((w) => w.minutes === 0 && w.checks.taken === 0)).toBe(true);
  });

  it("puts a proved skill that needs a refresh back with the skills waiting for a check", () => {
    const early = new Date(2026, 5, 2, 16).getTime();
    const proved = [...practice("m.add.5", early, 10), ...check("m.add.5", early + D, 5), ...check("m.add.5", early + 8 * D, 5)];
    const misses = [at("m.add.5", tue(5), false, { mode: "review" }), at("m.add.5", tue(5) + 1, false, { mode: "review" })];
    const g = of(weeklyGrowth(state({ attempts: [...proved, ...misses] }), "ada", NOW), "math");
    expect(counts(g.weeks).slice(4)).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ]);
  });

  it("does not count a skill touched only by placement probes or tutor help as practicing", () => {
    const probes = [at("m.add.5", tue(5), true, { mode: "placement", setId: "pl" }), at("m.count.10", tue(5) + 1, false, { mode: "placement", setId: "pl" })];
    const help = at("m.add.10", tue(7), false, { mode: "tutor", assisted: true, seconds: 0 });
    const g = of(weeklyGrowth(state({ attempts: [...probes, help] }), "ada", NOW), "math");
    expect(counts(g.weeks)).toEqual(Array(8).fill([0, 0, 0]));
    // The probes were still time spent here; the tutor row was not.
    expect(g.weeks.map((w) => w.minutes)).toEqual([0, 0, 0, 0, 0, 1, 0, 0]);
    expect(g.any).toBe(true);
    expect(of(weeklyGrowth(state({ attempts: [help] }), "ada", NOW), "math").any).toBe(false);
    expect([...practicedSkills([...probes, help])]).toEqual([]);
  });

  it("starts counting a probed skill from its first practice answer", () => {
    const list = [at("m.add.5", tue(2), true, { mode: "placement", setId: "pl" }), ...practice("m.add.5", tue(5), 3)];
    const g = of(weeklyGrowth(state({ attempts: list }), "ada", NOW), "math");
    expect(g.weeks.map((w) => w.practicing)).toEqual([0, 0, 0, 0, 0, 1, 1, 1]);
    expect([...practicedSkills(list)]).toEqual(["m.add.5"]);
  });

  it("is empty for a learner with no record", () => {
    const list = weeklyGrowth(state({ attempts }), "nobody", NOW);
    expect(list.map((g) => g.subject)).toEqual(["math", "english", "science", "other"]);
    expect(list.every((g) => !g.any && !g.lessons.length && g.weeks.every((w) => w.proved + w.ready + w.practicing + w.minutes + w.lessons === 0))).toBe(true);
  });
});

describe("weeklyGrowth: lessons, reading and open-topic practice", () => {
  const mon = new Date(2026, 9, 5, 10).getTime();
  const activity = [
    ev("course_added", mon - 3 * D, { lessonId: undefined }),
    ev("lesson_started", mon),
    ev("quiz_answered", mon + 1, { sceneId: "q1", correct: true, assisted: false }),
    ev("quiz_answered", mon + 2, { sceneId: "q2", correct: true, assisted: true }),
    ev("quiz_answered", mon + 3, { sceneId: "q3", correct: false }),
    ev("lesson_completed", mon + 4, { id: "done1", seconds: 300 }),
    // The same lesson again: only its new answers count toward the second finish.
    ev("quiz_answered", mon + D, { sceneId: "q1", correct: true, assisted: false }),
    ev("lesson_completed", mon + D + 1, { id: "done2", seconds: 120 }),
    // A lesson not finished yet: its answers wait for the finish.
    ev("quiz_answered", mon + D + 2, { lessonId: "l2", sceneId: "q1", correct: false }),
    ev("lesson_completed", mon, { profileId: "bo", seconds: 900 }),
  ];
  const aiSet: PracticeSet = { id: "ai1", profileId: "ada", createdAt: mon, kind: "pick", subject: "science", skillId: "ai:volcanoes", slots: [], topic: "volcanoes" };
  const s = state({
    courses: [course("sci", "science"), course("cook", "other")],
    activity,
    sets: [aiSet],
    attempts: [at("ai:volcanoes", mon, true, { setId: "ai1", seconds: 30 }), at("ai:volcanoes", mon + 1, false, { setId: "ai1", seconds: 30 })],
    reading: [book("2026-10-06", 20), book("2026-10-09", 15, { title: "Logged ahead" }), book("2026-10-06", 40, { profileId: "bo" })],
  });
  const list = weeklyGrowth(s, "ada", NOW);

  it("counts finished lessons with their questions, by the course's subject", () => {
    const w = of(list, "science").weeks[7];
    expect(w.lessons).toBe(2);
    expect(w.lessonChecks).toEqual({ own: 2, helped: 1, missed: 1 });
    // 300 s + 120 s of lessons, 60 s of AI-written questions on volcanoes.
    expect(w.minutes).toBe(8);
    expect(of(list, "science").weeks.slice(0, 7).every((x) => x.lessons === 0)).toBe(true);
  });

  it("lists each finished lesson with its own tally, newest first", () => {
    expect(of(list, "science").lessons).toEqual([
      { id: "done2", at: mon + D + 1, courseId: "sci", lessonId: "l1", tally: { own: 1, helped: 0, missed: 0 } },
      { id: "done1", at: mon + 4, courseId: "sci", lessonId: "l1", tally: { own: 1, helped: 1, missed: 1 } },
    ]);
  });

  it("adds reading a grown-up logged to English, apart from practice time", () => {
    const english = of(list, "english");
    expect(english.weeks[7]).toMatchObject({ readingMinutes: 20, minutes: 0 });
    expect(english.any).toBe(true);
  });

  it("counts reading logged for today from the morning on, not from midday", () => {
    const morning = new Date(2026, 9, 7, 8).getTime();
    const english = of(weeklyGrowth(state({ reading: [book("2026-10-07", 25)] }), "ada", morning), "english");
    expect(english.any).toBe(true);
    expect(english.weeks[7].readingMinutes).toBe(25);
    // A day logged ahead waits for its date.
    expect(of(weeklyGrowth(state({ reading: [book("2026-10-08", 25)] }), "ada", morning), "english").any).toBe(false);
  });

  it("marks a subject with nothing in it as empty; adding a course is not doing anything", () => {
    expect(of(list, "other").any).toBe(false);
    expect(of(list, "math").any).toBe(false);
  });
});

describe("lessonTallies", () => {
  const day1 = new Date(2026, 9, 5, 16).getTime();
  const day2 = day1 + D;

  it("tallies each finished lesson from what was answered since it was last finished", () => {
    const t = lessonTallies([
      ev("quiz_answered", day1, { sceneId: "q1", correct: true, assisted: false }),
      ev("quiz_answered", day1 + 1, { sceneId: "q2", correct: false }),
      ev("lesson_completed", day1 + 2, { id: "first" }),
      ev("quiz_answered", day2, { sceneId: "q1", correct: true, assisted: false }),
      ev("lesson_completed", day2 + 1, { id: "redo" }),
    ]);
    expect(Object.fromEntries(t)).toEqual({ first: { own: 1, helped: 0, missed: 1 }, redo: { own: 1, helped: 0, missed: 0 } });
  });

  it("counts a visit left halfway and then done again once per question, as each last stood", () => {
    // Day 1: Q1 missed, then the lesson is left. Day 2: a fresh visit, both questions right.
    const t = lessonTallies([
      ev("quiz_answered", day1, { sceneId: "q1", correct: false }),
      ev("quiz_answered", day2, { sceneId: "q1", correct: true, assisted: false }),
      ev("quiz_answered", day2 + 1, { sceneId: "q2", correct: true, assisted: false }),
      ev("lesson_completed", day2 + 2, { id: "done" }),
    ]);
    expect(t.get("done")).toEqual({ own: 2, helped: 0, missed: 0 });
  });

  it("counts a question missed and then got right with help, in one visit, as right with help", () => {
    const t = lessonTallies([
      ev("quiz_answered", day1, { sceneId: "q1", correct: false }),
      ev("quiz_answered", day1 + 1, { sceneId: "q1", correct: true, assisted: true }),
      ev("lesson_completed", day1 + 2, { id: "done" }),
    ]);
    expect(t.get("done")).toEqual({ own: 0, helped: 1, missed: 0 });
  });

  it("keeps the answers of a lesson not finished yet, with no finish", () => {
    const list = lessonAnswers([
      ev("quiz_answered", day1, { sceneId: "q1", correct: false }),
      ev("quiz_answered", day1 + 1, { sceneId: "q1", correct: true, assisted: true }),
      ev("lesson_completed", day1 + 2, { id: "done" }),
      ev("quiz_answered", day2, { lessonId: "l2", sceneId: "q1", correct: false }),
    ]);
    expect(list.map((x) => [x.answer.lessonId, x.answer.correct, x.finish?.id])).toEqual([
      ["l1", true, "done"],
      ["l2", false, undefined],
    ]);
  });

  it("gives a lesson finished with no questions an empty tally", () => {
    expect(lessonTallies([ev("lesson_completed", day1, { id: "slides" })]).get("slides")).toEqual({ own: 0, helped: 0, missed: 0 });
  });

  it("keeps lessons apart", () => {
    const t = lessonTallies([
      ev("quiz_answered", day1, { lessonId: "l2", sceneId: "q1", correct: false }),
      ev("quiz_answered", day1 + 1, { sceneId: "q1", correct: true, assisted: false }),
      ev("lesson_completed", day1 + 2, { id: "l1done" }),
    ]);
    expect(t.get("l1done")).toEqual({ own: 1, helped: 0, missed: 0 });
  });
});

describe("gradedChecks", () => {
  it("grades full checks only, and only answers right on their own count toward passing", () => {
    const t = tue(2);
    const helped = check("m.add.5", t + D, 5).map((a, i) => (i < 2 ? { ...a, assisted: true } : a));
    expect(gradedChecks([...check("m.add.5", t, 4), ...check("m.add.5", t + H, 5, 4), ...helped])).toEqual([
      { skillId: "m.add.5", setId: `c${t}`, at: t + 4 * 60_000, passed: true },
      { skillId: "m.add.5", setId: `c${t + D}`, at: t + D + 4 * 60_000, passed: false },
    ]);
  });
});

describe("schoolResults", () => {
  it("keeps scores from school apart, with their class's subject, newest first, inside the dates asked for", () => {
    const s = state({
      classes: [{ id: "m4", profileId: "ada", name: "Math 4", subject: "math", color: "#000", createdAt: 0 }],
      results: [
        { id: "r1", profileId: "ada", classId: "m4", title: "Unit 2 test", date: "2026-10-01", score: 18, outOf: 20 },
        { id: "r2", profileId: "ada", title: "Spelling", date: "2026-09-01", score: 9, outOf: 10 },
        { id: "r3", profileId: "ada", classId: "m4", title: "Too old", date: "2026-08-01", score: 5, outOf: 10 },
        { id: "r4", profileId: "bo", title: "Bo's", date: "2026-10-01", score: 1, outOf: 1 },
      ],
    });
    expect(schoolResults(s, "ada", "2026-08-17")).toEqual([
      { id: "r1", title: "Unit 2 test", date: "2026-10-01", score: 18, outOf: 20, subject: "math", className: "Math 4" },
      { id: "r2", title: "Spelling", date: "2026-09-01", score: 9, outOf: 10, subject: "other", className: undefined },
    ]);
    expect(schoolResults(s, "ada", "2026-06-22", "2026-08-16").map((r) => r.id)).toEqual(["r3"]);
  });
});

describe("weekLog", () => {
  const mon = new Date(2026, 9, 5, 18).getTime();
  const proofAt = new Date(2026, 9, 6, 16).getTime();
  const tueEve = new Date(2026, 9, 6, 19).getTime();
  const attempts = [
    ...practice("m.add.5", tue(5), 10),
    ...check("m.add.5", tue(6) - D, 5),
    ...check("m.add.5", proofAt, 5),
    at("m.count.10", mon, true, { setId: "d1" }),
    at("m.count.10", mon + 1, true, { setId: "d1" }),
    at("m.count.10", mon + 2, true, { setId: "d1", assisted: true }),
    // Tuesday evening: six of ten answered, then "I'm done for today".
    ...Array.from({ length: 6 }, (_, i) => at("m.add.10", tueEve + i * 60_000, i < 4, { setId: "left", assisted: i === 3 })),
    // A check left after two problems.
    at("m.sub.10", tueEve + H, true, { mode: "check", setId: "halfcheck" }),
    at("m.sub.10", tueEve + H + 1, true, { mode: "check", setId: "halfcheck" }),
  ];
  const set = (id: string, kind: PracticeSet["kind"], finishedAt?: number, o: Partial<PracticeSet> = {}): PracticeSet => ({
    id, profileId: "ada", createdAt: mon, kind, subject: "math", skillId: "m.count.10", slots: [], finishedAt, ...o,
  });
  const slots = (size: number, skillId: string) => Array.from({ length: size }, (_, i) => ({ skillId, seed: i, role: "main" as const }));
  const lessonAt = new Date(2026, 9, 7, 10).getTime();
  const s = state({
    attempts,
    sets: [
      set("d1", "daily", mon + 3),
      set(`c${proofAt}`, "check", proofAt + 5 * 60_000),
      set("empty", "daily", mon + 4),
      set("open", "daily"),
      set("left", "daily", undefined, { skillId: "m.add.10", slots: slots(10, "m.add.10") }),
      set("halfcheck", "check", undefined, { skillId: "m.sub.10", slots: slots(5, "m.sub.10") }),
    ],
    courses: [course("c", "science")],
    activity: [
      ev("quiz_answered", lessonAt - 2, { courseId: "c", lessonId: "l", sceneId: "q1", correct: true, assisted: false }),
      ev("quiz_answered", lessonAt - 1, { courseId: "c", lessonId: "l", sceneId: "q2", correct: false }),
      ev("lesson_completed", lessonAt, { id: "done", courseId: "c", lessonId: "l" }),
    ],
    reading: [book("2026-10-07", 20, { id: "today" }), book("2026-10-08", 15, { id: "ahead" })],
  });
  const days = weekLog(s, "ada", startOfWeek(NOW), NOW);
  const kinds = (list: LogEntry[]) => list.map((e) => e.kind);

  it("lists seven days of sets, checks, proofs, lessons and reading; a proof sits above the check that made it", () => {
    expect(days.map((d) => localDate(d.day))).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(days.map((d) => kinds(d.entries))).toEqual([["set"], ["set", "set", "proved", "check"], ["reading", "activity", "activity", "activity"], [], [], [], []]);
    expect(days[0].entries[0]).toMatchObject({ kind: "set", finished: true, tally: { own: 2, helped: 1, missed: 0 } });
    expect(days[1].entries[3]).toMatchObject({ kind: "check", skillId: "m.add.5", passed: true });
  });

  it("lists a set left before the end at its last answer, with how far it got", () => {
    expect(days[1].entries[1]).toMatchObject({ kind: "set", id: "left", finished: false, answered: 6, of: 10, at: tueEve + 5 * 60_000, tally: { own: 3, helped: 1, missed: 2 } });
  });

  it("lists a check left before its last problem apart from graded checks", () => {
    expect(days[1].entries[0]).toMatchObject({ kind: "set", id: "halfcheck", finished: false, answered: 2, of: 5 });
    expect(gradedChecks(attempts).some((c) => c.setId === "halfcheck")).toBe(false);
  });

  it("gives a finished lesson its question tally", () => {
    expect(days[2].entries.find((e) => e.kind === "activity" && e.event.type === "lesson_completed")).toMatchObject({ tally: { own: 1, helped: 0, missed: 1 } });
  });

  it("shows reading logged for today, even in the morning, and not reading logged ahead", () => {
    expect(days[2].entries[0]).toMatchObject({ kind: "reading", id: "today" });
    const morning = new Date(2026, 9, 7, 8).getTime();
    const early = weekLog(s, "ada", startOfWeek(morning), morning);
    expect(early[2].entries.map((e) => e.id)).toEqual(["today"]);
    expect(early.flatMap((d) => d.entries).some((e) => e.id === "ahead")).toBe(false);
  });

  it("is never empty for a week with answers", () => {
    const only = state({ attempts: [at("e.rhyme", tueEve, true, { setId: "x" })], sets: [set("x", "pick", undefined, { skillId: "e.rhyme", slots: slots(10, "e.rhyme") })] });
    expect(weekLog(only, "ada", startOfWeek(NOW), NOW).flatMap((d) => d.entries)).toHaveLength(1);
  });

  it("starts each day at local midnight", () => {
    expect(days.every((d, i) => localDate(d.day) === addDays("2026-10-05", i) && new Date(d.day).getHours() === 0)).toBe(true);
  });
});

describe("weekFacts (the family card's week)", () => {
  const mon = new Date(2026, 9, 5, 16).getTime();
  const quiz = (t: number, correct: boolean, assisted = false) => ev("quiz_answered", t, { correct, assisted, sceneId: `q${t}` });

  it("counts lesson questions answered this week apart from practice answers", () => {
    const s = state({
      attempts: [at("m.add.5", mon, true), at("m.add.5", mon + 1, false)],
      activity: [quiz(mon, true), quiz(mon + 1, true, true), quiz(mon + 2, false), quiz(mon + 3, false), quiz(mon - 2 * D, true), quiz(mon + 7 * D, true)],
    });
    const f = weekFacts(s, "ada", NOW);
    expect(f.lessonChecks).toEqual({ own: 1, helped: 1, missed: 2 });
    expect([f.own, f.helped, f.missed]).toEqual([1, 0, 1]);
  });

  it("counts each lesson question once, as it last stood, the way Growth and a practice item do", () => {
    const s = state({
      activity: [
        // Monday: Q1 missed, then right with help in the same visit; Q2 missed and the lesson left.
        ev("quiz_answered", mon, { sceneId: "q1", correct: false }),
        ev("quiz_answered", mon + 1, { sceneId: "q1", correct: true, assisted: true }),
        ev("quiz_answered", mon + 2, { sceneId: "q2", correct: false }),
        // Tuesday: a fresh visit, Q2 right on her own, and the lesson finished.
        ev("quiz_answered", mon + D, { sceneId: "q2", correct: true, assisted: false }),
        ev("lesson_completed", mon + D + 1, { id: "fin" }),
      ],
    });
    expect(weekFacts(s, "ada", NOW).lessonChecks).toEqual({ own: 1, helped: 1, missed: 0 });
    expect(lessonTallies(s.activity).get("fin")).toEqual(weekFacts(s, "ada", NOW).lessonChecks);
  });

  it("counts reading by its date, and not a day logged ahead", () => {
    const s = state({ reading: [book("2026-10-05", 20), book("2026-10-07", 10), book("2026-10-09", 30), book("2026-10-04", 40)] });
    expect(weekFacts(s, "ada", NOW).readingMinutes).toBe(30);
  });

  it("ends the week at the next Monday's midnight across a clock change", () => {
    // Week of 26 October; clocks go back on Sunday 1 November.
    const wed = new Date(2026, 9, 28, 12).getTime();
    const sundayNight = new Date(2026, 10, 1, 23, 30).getTime();
    const s = state({ attempts: [at("m.add.5", sundayNight, true)] });
    expect(weekFacts(s, "ada", wed).own).toBe(1);
  });
});
