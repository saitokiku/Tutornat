import { afterEach, describe, expect, it, vi } from "vitest";
import type { SkillStatus } from "@/learning/engine";
import type { Attempt, PracticeSet } from "@/learning/types";
import type { LearnerSettings } from "@/lib/types";
import { addDays, fromLocalDate, localDate, weekStart } from "./dates";
import type { SchoolEvent } from "./types";
import { planForWeek, type WeekDay, type WeekInput } from "./week";

// A scripted week. Today is Wednesday 2026-10-07, 4 pm; the week shown starts Monday the 5th.
const NOW = new Date("2026-10-07T16:00:00").getTime();
const TODAY = localDate(NOW);
const MON = weekStart(TODAY);
const at = (day: string, hour: number) => new Date(fromLocalDate(day).setHours(hour, 0, 0, 0)).getTime();
const settings: LearnerSettings = { dailyMinutes: 15, subjects: ["math", "english"], timer: true, voiceInput: false };

const input = (o: Partial<WeekInput> = {}): WeekInput => ({
  date: TODAY,
  now: NOW,
  grade: "3",
  settings,
  statuses: {},
  starts: {},
  events: [],
  feedback: [],
  sets: [],
  done: [],
  attempts: [],
  lessonsDone: [],
  ...o,
});
const test = (o: Partial<SchoolEvent>): SchoolEvent => ({ id: "t1", profileId: "p", title: "Multiplication test", kind: "test", date: addDays(TODAY, 5), skillIds: ["m.mult.facts"], source: "typed", createdAt: 0, ...o });
const status = (o: Partial<SkillStatus> & { skillId: string }): SkillStatus => ({ state: "ready", level: 1, overdue: false, stuck: false, totals: { own: 0, helped: 0, missed: 0 }, ...o });
const day = (week: WeekDay[], date: string) => week.find((d) => d.date === date)!;
const keys = (d: WeekDay) => d.lines.map((l) => l.key);

afterEach(() => vi.useRealTimers());

describe("planForWeek", () => {
  it("gives seven days: past, today and planned days", () => {
    const week = planForWeek(input(), MON);
    expect(week.map((d) => d.date)).toEqual(Array.from({ length: 7 }, (_, i) => addDays(MON, i)));
    expect(week.map((d) => d.when)).toEqual(["past", "past", "today", "future", "future", "future", "future"]);
    // Today is today's plan: one daily set per subject, still to do.
    expect(day(week, TODAY).lines.filter((l) => l.kind === "daily").map((l) => [l.subject, l.status])).toEqual([
      ["math", "todo"],
      ["english", "todo"],
    ]);
    // Every coming day carries the projected plan, marked planned.
    for (const d of week.filter((x) => x.when === "future")) {
      expect(d.lines.filter((l) => l.kind === "daily").map((l) => l.subject)).toEqual(["math", "english"]);
      expect(d.lines.every((l) => l.status === "planned")).toBe(true);
    }
  });

  it("puts prep for a test on day 5 on days 2, 3 and 4, and the test itself on day 5", () => {
    const week = planForWeek(input({ events: [test({})] }), TODAY);
    const prepDays = week.filter((d) => d.lines.some((l) => l.kind === "prep")).map((d) => d.date);
    expect(prepDays).toEqual([addDays(TODAY, 2), addDays(TODAY, 3), addDays(TODAY, 4)]);
    const prep = day(week, addDays(TODAY, 2)).lines.find((l) => l.kind === "prep")!;
    expect(prep).toMatchObject({ key: "prep:t1", status: "planned", skillIds: ["m.mult.facts"], event: { title: "Multiplication test" } });
    expect(day(week, addDays(TODAY, 5)).events.map((e) => e.id)).toEqual(["t1"]);
    expect(keys(day(week, addDays(TODAY, 5)))).toContain("due:t1");
  });

  it("plans no prep for a test with no linked skill, and none once it is marked done", () => {
    expect(planForWeek(input({ events: [test({ skillIds: [] })] }), TODAY).some((d) => d.lines.some((l) => l.kind === "prep"))).toBe(false);
    expect(planForWeek(input({ events: [test({ done: true })] }), TODAY).some((d) => d.lines.some((l) => l.kind === "prep"))).toBe(false);
  });

  it("shows what was done on a past day: plan lines marked done, finished sets, lessons, answers", () => {
    const mon = MON;
    const hw = test({ id: "h1", kind: "homework", title: "Worksheet 4", date: addDays(MON, 1), skillIds: [] });
    const set: PracticeSet = { id: "s1", profileId: "p", createdAt: at(mon, 15), kind: "daily", subject: "math", skillId: "m.mult.facts", slots: [], planKey: `${mon}:daily:math`, finishedAt: at(mon, 16) };
    const attempts: Attempt[] = [
      { id: "a1", profileId: "p", at: at(mon, 15), skillId: "m.mult.facts", level: 1, seed: 1, setId: "s1", mode: "practice", correct: true, assisted: false, seconds: 5 },
      { id: "a2", profileId: "p", at: at(mon, 15), skillId: "m.mult.facts", level: 1, seed: 2, setId: "s1", mode: "practice", correct: true, assisted: true, seconds: 5 },
      { id: "a3", profileId: "p", at: at(mon, 15), skillId: "m.mult.facts", level: 1, seed: 3, setId: "s1", mode: "practice", correct: false, assisted: false, seconds: 5 },
      { id: "a4", profileId: "p", at: at(mon, 17), skillId: "m.mult.facts", level: 1, seed: 4, mode: "tutor", correct: false, assisted: true, seconds: 0 },
    ];
    const week = planForWeek(
      input({
        events: [hw],
        sets: [set],
        attempts,
        done: [{ profileId: "p", date: mon, key: "due:h1", at: at(mon, 18) }],
        lessonsDone: [{ courseId: "c1", lessonId: "l2", title: "Halves", courseTitle: "Fractions", at: at(mon, 19) }],
      }),
      MON,
    );
    const past = day(week, mon);
    expect(past.when).toBe("past");
    expect(past.lines.map((l) => [l.key, l.kind, l.status])).toEqual([
      ["due:h1", "due", "done"],
      ["daily:math", "daily", "done"],
      ["lesson:c1:l2", "lesson", "done"],
    ]);
    expect(past.lines[0].event?.title).toBe("Worksheet 4");
    expect(past.lines[1].set).toMatchObject({ id: "s1", kind: "daily" });
    // Tutor help is not an answer.
    expect(past.answers).toEqual({ n: 3, own: 1, helped: 1, missed: 1 });
    // A past day with nothing done shows nothing — no plan is projected onto it.
    expect(day(week, addDays(MON, 1)).lines).toEqual([]);
  });

  it("projects nothing into the past", () => {
    // A test tomorrow would put prep on the three days before it; only today and later may show it.
    const week = planForWeek(input({ events: [test({ date: addDays(TODAY, 1) })], statuses: { "m.add.5": status({ skillId: "m.add.5", checkOpensAt: at(addDays(TODAY, -1), 9) }) } }), MON);
    for (const d of week.filter((x) => x.when === "past")) {
      expect(d.lines).toEqual([]);
      expect(d.lines.some((l) => l.status !== "done")).toBe(false);
    }
    expect(keys(day(week, TODAY))).toContain("prep:t1");
  });

  it("names a check on the day it opens, from the engine's status dates, and plans it once", () => {
    const opens = at(addDays(TODAY, 3), 10);
    const week = planForWeek(input({ statuses: { "m.add.5": status({ skillId: "m.add.5", checkOpensAt: opens }) } }), TODAY);
    const withCheck = week.filter((d) => d.lines.some((l) => l.kind === "check"));
    expect(withCheck.map((d) => d.date)).toEqual([addDays(TODAY, 3)]);
    expect(withCheck[0].lines.find((l) => l.kind === "check")).toMatchObject({ key: "check:m.add.5", status: "planned", opens: true });
  });

  it("keeps a check that is open today on today only, still to do", () => {
    const week = planForWeek(input({ statuses: { "m.add.5": status({ skillId: "m.add.5", checkOpensAt: NOW - 864e5 }) } }), MON);
    const withCheck = week.filter((d) => d.lines.some((l) => l.kind === "check"));
    expect(withCheck.map((d) => d.date)).toEqual([TODAY]);
    const line = withCheck[0].lines.find((l) => l.kind === "check")!;
    expect(line.status).toBe("todo");
    expect(line.opens).toBeUndefined();
    // Looking at next week, it is not planned there either: it is today's.
    expect(planForWeek(input({ statuses: { "m.add.5": status({ skillId: "m.add.5", checkOpensAt: NOW - 864e5 }) } }), addDays(MON, 7)).some((d) => d.lines.some((l) => l.kind === "check"))).toBe(false);
  });

  it("names a check that opens later today as planned", () => {
    const week = planForWeek(input({ statuses: { "m.add.5": status({ skillId: "m.add.5", checkOpensAt: at(TODAY, 20) }) } }), TODAY, 1);
    expect(week[0].lines.find((l) => l.kind === "check")).toMatchObject({ status: "planned", opens: true });
  });

  it("plans a review on the day it falls due", () => {
    const due = at(addDays(TODAY, 2), 9);
    const week = planForWeek(input({ statuses: { "m.add.5": status({ skillId: "m.add.5", state: "proved", provedAt: NOW - 30 * 864e5, reviewDueAt: due }) } }), TODAY);
    expect(week.filter((d) => d.lines.some((l) => l.kind === "review")).map((d) => d.date)).toEqual([addDays(TODAY, 2)]);
  });

  it("marks a lesson finished today as done and plans the next one on coming days", () => {
    const done = { courseId: "c1", lessonId: "l1", title: "Halves", courseTitle: "Fractions", minutes: 8 };
    const next = { courseId: "c1", lessonId: "l2", title: "Quarters", courseTitle: "Fractions", minutes: 8 };
    const week = planForWeek(input({ lesson: done, nextLesson: next, lessonsDone: [{ ...done, at: at(TODAY, 10) }] }), TODAY, 2);
    expect(week[0].lines.find((l) => l.kind === "lesson")).toMatchObject({ status: "done", lesson: { lessonId: "l1" } });
    expect(week[1].lines.find((l) => l.kind === "lesson")).toMatchObject({ status: "planned", lesson: { lessonId: "l2" } });
  });

  it("lists a set finished today outside the plan as done", () => {
    const set: PracticeSet = { id: "s9", profileId: "p", createdAt: NOW - 3600_000, kind: "pick", subject: "math", skillId: "m.time.clock", slots: [], finishedAt: NOW - 1000 };
    const line = planForWeek(input({ sets: [set] }), TODAY, 1)[0].lines.find((l) => l.key === "set:s9");
    expect(line).toMatchObject({ kind: "set", status: "done", skillIds: ["m.time.clock"], set: { kind: "pick" } });
  });

  it("is pure: the clock does not change the week", () => {
    const a = planForWeek(input({ events: [test({})] }), MON);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00"));
    expect(planForWeek(input({ events: [test({})] }), MON)).toEqual(a);
  });
});
