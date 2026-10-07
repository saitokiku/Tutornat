import { afterEach, describe, expect, it } from "vitest";
import { RULES } from "@/learning/engine";
import type { Attempt } from "@/learning/types";
import { logPlanLines, markDone, minutesToday, planRef, stripLines, TEST_AHEAD_DAYS, todayPlan, todayStatus, todayViewer, type TodayStatus } from "@/lib/plan";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { addDays, localDate } from "@/planner/dates";
import type { SchoolEvent } from "@/planner/types";

// The arithmetic behind Today's status strip, the plan acts it logs, and who it is for.

afterEach(() => resetMemory());

const NOW = new Date("2026-10-07T16:00:00").getTime();
const DATE = localDate(NOW);
const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const leo: Profile = { ...ada, id: "p2", nickname: "Leo", grade: "K" };

function family(session: string | "parent" = "p1") {
  update((s) => {
    s.accounts.push({ id: "a1", email: "a@b.co", displayName: "Sam", salt: "", passwordHash: "", createdAt: 0 });
    s.profiles.push(ada, leo, { ...ada, id: "x1", accountId: "other", nickname: "Not ours" });
    s.session = { accountId: "a1", profileId: session };
  });
}
const event = (o: Partial<SchoolEvent>): SchoolEvent => ({ id: "e1", profileId: "p1", title: "Worksheet", kind: "homework", date: DATE, skillIds: [], source: "typed", createdAt: 0, ...o });
let n = 0;
const attempt = (o: Partial<Attempt>): Attempt => ({ id: `a${n++}`, profileId: "p1", at: NOW - 3600_000, skillId: "m.add.10", level: 1, seed: n, mode: "practice", correct: true, assisted: false, seconds: 30, ...o });

describe("todayStatus", () => {
  it("counts homework and projects due today that are not done", () => {
    family();
    update((s) => {
      s.events = [
        event({ id: "hw" }),
        event({ id: "proj", kind: "project", title: "Volcano" }),
        event({ id: "done", done: true }),
        event({ id: "tomorrow", date: addDays(DATE, 1) }),
        event({ id: "test", kind: "test" }),
        event({ id: "leo", profileId: "p2" }),
      ];
    });
    expect(todayStatus(read(), ada, NOW).due.map((e) => e.id)).toEqual(["hw", "proj"]);
  });

  it("finds the nearest test or quiz from today on, within two weeks", () => {
    family();
    update((s) => {
      s.events = [
        event({ id: "far", kind: "test", date: addDays(DATE, TEST_AHEAD_DAYS + 1) }),
        event({ id: "quiz", kind: "quiz", date: addDays(DATE, 5) }),
        event({ id: "test", kind: "test", date: addDays(DATE, 2) }),
        event({ id: "past", kind: "test", date: addDays(DATE, -1) }),
        event({ id: "done", kind: "test", date: addDays(DATE, 1), done: true }),
      ];
    });
    expect(todayStatus(read(), ada, NOW).test).toMatchObject({ event: { id: "test" }, inDays: 2 });
    update((s) => void (s.events = s.events.filter((e) => e.id !== "test" && e.id !== "quiz")));
    expect(todayStatus(read(), ada, NOW).test).toBeNull();
    update((s) => void s.events.push(event({ id: "today", kind: "quiz", date: DATE })));
    expect(todayStatus(read(), ada, NOW).test).toMatchObject({ event: { id: "today" }, inDays: 0 });
  });

  it("counts checks that are open now, per the mastery law", () => {
    family();
    // Ten right on their own at the top level, three days ago: the check has opened.
    update((s) => {
      s.attempts = Array.from({ length: RULES.readyWindow }, (_, i) => attempt({ skillId: "m.add.5", at: NOW - 3 * 864e5 + i * 1000, seconds: 4 }));
    });
    expect(todayStatus(read(), ada, NOW).checks).toEqual(["m.add.5"]);
  });

  it("measures minutes used today from answer time and finished lessons, and what is left of the budget", () => {
    family();
    update((s) => {
      s.attempts = [
        attempt({ seconds: 240 }),
        attempt({ seconds: 300 }),
        attempt({ seconds: 600, mode: "tutor" }), // help rows are not time on task
        attempt({ seconds: 900, at: NOW - 864e5 }), // yesterday
        attempt({ seconds: 900, profileId: "p2" }), // another learner
      ];
      s.activity = [
        { id: "l1", profileId: "p1", at: NOW - 600_000, type: "lesson_completed", courseId: "c", lessonId: "l", seconds: 360 },
        { id: "l2", profileId: "p1", at: NOW - 600_000, type: "lesson_started", courseId: "c", lessonId: "l", seconds: 999 },
      ];
    });
    expect(minutesToday(read(), "p1", NOW)).toBe(15);
    const status = todayStatus(read(), ada, NOW);
    // Grade 4 default budget: 15 minutes (lib/practice.ts BAND_MINUTES).
    expect(status).toMatchObject({ budget: 15, used: 15, left: 0 });
  });

  it("never goes below zero, and follows a grown-up's budget", () => {
    family();
    update((s) => {
      s.profiles[0].settings = { dailyMinutes: 30 };
      s.attempts = [attempt({ seconds: 3600 })];
    });
    const p = read().profiles[0];
    expect(todayStatus(read(), p, NOW)).toMatchObject({ budget: 30, used: 60, left: 0 });
  });

  it("gives a kindergartner the 10-minute default budget", () => {
    family("p2");
    expect(todayStatus(read(), leo, NOW)).toMatchObject({ budget: 10, used: 0, left: 10 });
  });
});

describe("stripLines", () => {
  const base: TodayStatus = { date: DATE, due: [], test: null, checks: [], budget: 15, used: 0, left: 15 };

  it("hides every item that is zero", () => {
    expect(stripLines({ ...base, left: 0 }, { young: false, grownUp: false })).toEqual([]);
  });

  it("lists due, test, checks and minutes, in that order", () => {
    const due = [event({})];
    const test = { event: event({ id: "t", kind: "test" }), inDays: 2 };
    const lines = stripLines({ ...base, due, test, checks: ["m.add.5", "m.add.10"], left: 7 }, { young: false, grownUp: false });
    expect(lines).toEqual([{ kind: "due", events: due }, { kind: "test", ...test }, { kind: "checks", n: 2 }, { kind: "minutes", left: 7 }]);
  });

  it("shows no minute numbers to a pre-reader, but does to their grown-up", () => {
    expect(stripLines(base, { young: true, grownUp: false })).toEqual([]);
    expect(stripLines(base, { young: true, grownUp: true })).toEqual([{ kind: "minutes", left: 15 }]);
  });
});

describe("todayPlan", () => {
  it("keeps homework ticked off today on the plan, as done; undo brings it back", () => {
    family();
    update((s) => void (s.events = [event({ id: "hw", date: addDays(DATE, 1) })]));
    markDone("p1", DATE, "due:hw");
    expect(read().events[0].done).toBe(true);
    const line = () => [...todayPlan(read(), ada, NOW).lead, ...todayPlan(read(), ada, NOW).more].find((i) => i.key === "due:hw");
    expect(line()).toMatchObject({ kind: "due", done: true });
    expect(todayPlan(read(), ada, NOW).doneCount).toBe(1);
    markDone("p1", DATE, "due:hw", false);
    expect(line()).toMatchObject({ done: false });
    expect(read().events[0].done).toBe(false);
  });

  it("homework done on another day stays off the plan", () => {
    family();
    update((s) => {
      s.events = [event({ id: "hw", date: addDays(DATE, 1), done: true })];
      s.planDone = [{ profileId: "p1", date: addDays(DATE, -1), key: "due:hw", at: NOW - 864e5 }];
    });
    expect([...todayPlan(read(), ada, NOW).lead, ...todayPlan(read(), ada, NOW).more].some((i) => i.key === "due:hw")).toBe(false);
  });
});

describe("logPlanLines", () => {
  it("records one plan act per line per day, and nothing when shown again", () => {
    family();
    const refs = [planRef(DATE, "daily:math"), planRef(DATE, "daily:english")];
    logPlanLines("p1", refs);
    logPlanLines("p1", refs);
    logPlanLines("p1", [planRef(DATE, "daily:math"), planRef(DATE, "check:m.add.5")]);
    const acts = read().acts;
    expect(acts.map((a) => a.ref)).toEqual([`${DATE}:daily:math`, `${DATE}:daily:english`, `${DATE}:check:m.add.5`]);
    expect(acts.every((a) => a.profileId === "p1" && a.kind === "plan" && a.intent === "plan-line-done" && a.outcome === undefined)).toBe(true);
  });

  it("writes nothing when every line is already logged", () => {
    family();
    logPlanLines("p1", [planRef(DATE, "daily:math")]);
    const before = read();
    logPlanLines("p1", [planRef(DATE, "daily:math")]);
    expect(read()).toBe(before);
  });
});

describe("todayViewer", () => {
  it("is the selected learner, in their own session", () => {
    family("p2");
    expect(todayViewer(read(), "p1")).toEqual({ learner: leo, grownUp: false });
  });

  it("is a grown-up looking at the child asked for, else the first; never another family's", () => {
    family("parent");
    expect(todayViewer(read(), "p2")).toEqual({ learner: leo, grownUp: true });
    expect(todayViewer(read(), null)).toEqual({ learner: ada, grownUp: true });
    expect(todayViewer(read(), "x1")).toEqual({ learner: ada, grownUp: true });
  });

  it("is no one when nobody is chosen", () => {
    family(null as never);
    expect(todayViewer(read(), "p1")).toBeNull();
  });
});
