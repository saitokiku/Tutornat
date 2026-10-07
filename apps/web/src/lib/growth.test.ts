import { describe, expect, it } from "vitest";
import { RULES } from "@/learning/engine";
import type { Attempt, PracticeSet } from "@/learning/types";
import { addDays, localDate } from "@/planner/dates";
import { startOfWeek } from "./activity";
import { gradedChecks, lessonTallies, schoolResults, weekBounds, weekLog, weeklyGrowth, type GrowthWeek, type SubjectGrowth } from "./growth";
import { emptyState, type StoreState } from "./store";
import type { ActivityEvent, Course, Subject } from "./types";

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

describe("weekBounds", () => {
  it("gives the Mondays of the last eight weeks and the Monday after, at local midnight", () => {
    const b = weekBounds(NOW, 8);
    expect(b).toHaveLength(9);
    expect(b.map(localDate)).toEqual(["2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(b[7]).toBe(startOfWeek(NOW));
  });

  it("stays on calendar weeks across a clock change", () => {
    const b = weekBounds(new Date(2026, 10, 10, 9).getTime(), 4);
    expect(b.map(localDate)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(b.every((t) => new Date(t).getHours() === 0 && new Date(t).getDay() === 1)).toBe(true);
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

  it("does not count tutor help as time, though it is evidence of help", () => {
    const g = of(weeklyGrowth(state({ attempts: [at("m.add.10", tue(7), false, { mode: "tutor", assisted: true, seconds: 0 })] }), "ada", NOW), "math");
    expect(g.weeks[7]).toMatchObject({ practicing: 1, minutes: 0 });
  });

  it("is empty for a learner with no record", () => {
    const list = weeklyGrowth(state({ attempts }), "nobody", NOW);
    expect(list.map((g) => g.subject)).toEqual(["math", "english", "science", "other"]);
    expect(list.every((g) => !g.any && g.weeks.every((w) => w.proved + w.ready + w.practicing + w.minutes + w.lessons === 0))).toBe(true);
  });
});

describe("weeklyGrowth: lessons, reading and open-topic practice", () => {
  const course = (id: string, subject: Subject): Course => ({
    id, profileId: "ada", title: id, goal: id, subject, grade: "4", locale: "en", origin: "catalogue", status: "ready", length: "short", sources: [], lessons: [], template: false, createdAt: 0, updatedAt: 0,
  });
  let k = 0;
  const ev = (type: ActivityEvent["type"], t: number, o: Partial<ActivityEvent> = {}): ActivityEvent => ({ id: `ev${k++}`, profileId: "ada", at: t, type, courseId: "sci", lessonId: "l1", ...o });
  const mon = new Date(2026, 9, 5, 10).getTime();
  const activity = [
    ev("course_added", mon - 3 * D, { lessonId: undefined }),
    ev("lesson_started", mon),
    ev("quiz_answered", mon + 1, { correct: true, assisted: false }),
    ev("quiz_answered", mon + 2, { correct: true, assisted: true }),
    ev("quiz_answered", mon + 3, { correct: false }),
    ev("lesson_completed", mon + 4, { seconds: 300 }),
    // The same lesson again: only its new answers count toward the second finish.
    ev("quiz_answered", mon + D, { correct: true, assisted: false }),
    ev("lesson_completed", mon + D + 1, { seconds: 120 }),
    // A lesson not finished yet: its answers wait for the finish.
    ev("quiz_answered", mon + D + 2, { lessonId: "l2", correct: false }),
    ev("lesson_completed", mon, { profileId: "bo", seconds: 900 }),
  ];
  const aiSet: PracticeSet = { id: "ai1", profileId: "ada", createdAt: mon, kind: "pick", subject: "science", skillId: "ai:volcanoes", slots: [], topic: "volcanoes" };
  const s = state({
    courses: [course("sci", "science"), course("cook", "other")],
    activity,
    sets: [aiSet],
    attempts: [at("ai:volcanoes", mon, true, { setId: "ai1", seconds: 30 }), at("ai:volcanoes", mon + 1, false, { setId: "ai1", seconds: 30 })],
    reading: [
      { id: "r1", profileId: "ada", date: "2026-10-06", title: "Frog and Toad", minutes: 20 },
      { id: "r2", profileId: "ada", date: "2026-10-09", title: "Logged ahead", minutes: 15 },
      { id: "r3", profileId: "bo", date: "2026-10-06", title: "Not Ada's", minutes: 40 },
    ],
  });
  const list = weeklyGrowth(s, "ada", NOW);

  it("counts finished lessons with the checks answered in them, by the course's subject", () => {
    const w = of(list, "science").weeks[7];
    expect(w.lessons).toBe(2);
    expect(w.lessonChecks).toEqual({ own: 2, helped: 1, missed: 1 });
    // 300 s + 120 s of lessons, 60 s of AI-written questions on volcanoes.
    expect(w.minutes).toBe(8);
    expect(of(list, "science").weeks.slice(0, 7).every((x) => x.lessons === 0)).toBe(true);
  });

  it("adds reading a grown-up logged to English, apart from practice time", () => {
    const english = of(list, "english");
    expect(english.weeks[7]).toMatchObject({ readingMinutes: 20, minutes: 0 });
    expect(english.any).toBe(true);
  });

  it("marks a subject with nothing in it as empty; adding a course is not doing anything", () => {
    expect(of(list, "other").any).toBe(false);
    expect(of(list, "math").any).toBe(false);
  });

  it("tallies each finished lesson from its own visit", () => {
    const t = lessonTallies(activity.filter((e) => e.profileId === "ada"));
    expect([...t.values()]).toEqual([
      { own: 1, helped: 1, missed: 1 },
      { own: 1, helped: 0, missed: 0 },
    ]);
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
  it("keeps scores from school apart, with their class's subject, newest first", () => {
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
  });
});

describe("weekLog", () => {
  const mon = new Date(2026, 9, 5, 18).getTime();
  const proofAt = new Date(2026, 9, 6, 16).getTime();
  const attempts = [
    ...practice("m.add.5", tue(5), 10),
    ...check("m.add.5", tue(6) - D, 5),
    ...check("m.add.5", proofAt, 5),
    at("m.count.10", mon, true, { setId: "d1" }),
    at("m.count.10", mon + 1, true, { setId: "d1" }),
    at("m.count.10", mon + 2, true, { setId: "d1", assisted: true }),
  ];
  const set = (id: string, kind: PracticeSet["kind"], finishedAt?: number): PracticeSet => ({ id, profileId: "ada", createdAt: mon, kind, subject: "math", skillId: "m.count.10", slots: [], finishedAt });
  const lesson: ActivityEvent = { id: "done", profileId: "ada", at: new Date(2026, 9, 7, 10).getTime(), type: "lesson_completed", courseId: "c", lessonId: "l" };
  const s = state({
    attempts,
    sets: [set("d1", "daily", mon + 3), set(`c${proofAt}`, "check", proofAt + 5 * 60_000), set("empty", "daily", mon + 4), set("open", "daily")],
    activity: [lesson],
  });
  const days = weekLog(s, "ada", startOfWeek(NOW), NOW);

  it("lists seven days of sets, checks, proofs and lessons; a proof sits above the check that made it", () => {
    expect(days.map((d) => localDate(d.day))).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(days.map((d) => d.entries.map((e) => e.kind))).toEqual([["set"], ["proved", "check"], ["activity"], [], [], [], []]);
    expect(days[0].entries[0]).toMatchObject({ kind: "set", tally: { own: 2, helped: 1, missed: 0 } });
    expect(days[1].entries[1]).toMatchObject({ kind: "check", skillId: "m.add.5", passed: true });
  });

  it("starts each day at local midnight", () => {
    expect(days.every((d, i) => localDate(d.day) === addDays("2026-10-05", i) && new Date(d.day).getHours() === 0)).toBe(true);
  });
});
