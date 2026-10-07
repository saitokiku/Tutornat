import { afterAll, afterEach, describe, expect, it } from "vitest";
import { RULES } from "@/learning/engine";
import type { Attempt, PracticeSet } from "@/learning/types";
import { addDays, fromLocalDate, localDate } from "@/planner/dates";
import type { SchoolEvent } from "@/planner/types";
import { lastActive } from "./family";
import { logNudges, nudgesFor, NUDGE_RULES, type Nudge } from "./nudges";
import { emptyState, read, resetMemory, subscribe, update, type StoreState } from "./store";
import type { ActivityEvent, Profile } from "./types";

afterEach(() => resetMemory());

// Pinned to a zone with clock changes, so the calendar-day maths is tested the same on every machine.
const zone = process.env.TZ;
process.env.TZ = "America/Chicago";
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const H = 3600_000, D = 24 * H;
// Wednesday 7 October 2026, 3 pm local.
const NOW = new Date(2026, 9, 7, 15, 0).getTime();
const TODAY = localDate(NOW);
const ada: Profile = { id: "ada", accountId: "acc", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: NOW - 60 * D };
const bo: Profile = { ...ada, id: "bo", nickname: "Bo" };

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
/** Ten right on their own at the top level of a one-level skill: ready for a check. */
const ready = (t: number, skillId = "m.add.5") => Array.from({ length: 10 }, (_, i) => at(skillId, t + i * 60_000, true, { setId: `s${t}` }));
const check = (t: number, right: number, skillId = "m.add.5") =>
  Array.from({ length: RULES.checkSize }, (_, i) => at(skillId, t + i * 60_000, i < right, { mode: "check", setId: `c${t}` }));
/** A practice set of `size` answers with `right` right on their own. */
const set = (t: number, right: number, size = 5, skillId = "m.add.10") =>
  Array.from({ length: size }, (_, i) => at(skillId, t + i * 1000, i < right, { setId: `p${t}` }));

const state = (patch: Partial<StoreState> = {}): StoreState => ({ ...emptyState(), profiles: [ada, bo], ...patch });
const kinds = (list: Nudge[]) => list.map((x) => x.kind);
const test = (date: string, o: Partial<SchoolEvent> = {}): SchoolEvent => ({
  id: `e-${date}`,
  profileId: "ada",
  title: "Fractions test",
  kind: "test",
  date,
  skillIds: ["m.frac.equiv"],
  source: "typed",
  createdAt: NOW - 10 * D,
  ...o,
});
/** Something done today, so the idle nudge stays out of the way of the others. */
const busyToday = (): ActivityEvent => ({ id: "busy", profileId: "ada", at: NOW - H, type: "lesson_started", courseId: "c1", lessonId: "l1" });

describe("nudge: a check waiting", () => {
  // Ready at T: the last of ten answers at T + 9 min; the check opens 20 h after the last practice.
  const T = NOW - 30 * D;
  const opens = T + 9 * 60_000 + RULES.practiceQuietMs;
  const s = state({ attempts: ready(T), activity: [busyToday()] });

  it("fires when the check has been open for the full wait, and not a millisecond before", () => {
    const due = nudgesFor(s, "ada", opens + NUDGE_RULES.checkWaitMs);
    expect(due.filter((x) => x.kind === "check")).toEqual([
      // Practice lists every open check; Today's plan holds at most two.
      { key: "check:m.add.5", kind: "check", days: 14, skillId: "m.add.5", action: { href: "/practice?subject=math", handover: true } },
    ]);
    expect(kinds(nudgesFor(s, "ada", opens + NUDGE_RULES.checkWaitMs - 1))).not.toContain("check");
  });

  it("uses the mastery law's own wait", () => {
    expect(NUDGE_RULES.checkWaitMs).toBe(RULES.overdueCheckMs);
  });

  it("counts the second check too, from when it opened", () => {
    const first = T + 2 * D;
    const s2 = state({ attempts: [...ready(T), ...check(first, 5)], activity: [busyToday()] });
    const secondOpens = first + 4 * 60_000 + RULES.secondCheckMs;
    expect(kinds(nudgesFor(s2, "ada", secondOpens + NUDGE_RULES.checkWaitMs))).toContain("check");
    expect(kinds(nudgesFor(s2, "ada", secondOpens + NUDGE_RULES.checkWaitMs - 1))).not.toContain("check");
  });

  it("goes away once the check is taken, passed or not", () => {
    const failed = state({ attempts: [...ready(T), ...check(T + 20 * D, 1)], activity: [busyToday()] });
    expect(kinds(nudgesFor(failed, "ada", NOW))).not.toContain("check");
  });
});

describe("nudge: a stuck skill", () => {
  const t = (k: number) => NOW - (5 - k) * D;

  it("fires after three practice sets in a row under the engine's share right on their own, and opens that skill on Practice", () => {
    const s = state({ attempts: [...set(t(0), 2), ...set(t(1), 1), ...set(t(2), 2)], activity: [busyToday()] });
    expect(nudgesFor(s, "ada", NOW)).toEqual([
      { key: "stuck:m.add.10", kind: "stuck", days: 0, skillId: "m.add.10", action: { href: "/practice?subject=math&again=m.add.10", handover: true } },
    ]);
  });

  it("counts prep sets too: a skill can go stuck off the plan, so the action does not rely on Today", () => {
    const prep = (k: number, right: number) => set(t(k), right).map((a) => ({ ...a, mode: "prep" as const, skillId: "m.frac.equiv" }));
    const s = state({ attempts: [...prep(0, 1), ...prep(1, 2), ...prep(2, 1)], activity: [busyToday()] });
    expect(nudgesFor(s, "ada", NOW)).toMatchObject([{ key: "stuck:m.frac.equiv", action: { href: "/practice?subject=math&again=m.frac.equiv" } }]);
  });

  it("fires while the skill was practiced within the last two weeks, and not after", () => {
    const hard = [...set(t(0), 2), ...set(t(1), 1), ...set(t(2), 2)];
    const last = hard.at(-1)!.at;
    const end = last + NUDGE_RULES.stuckRecentMs;
    // Something else done the day before, so the idle nudge stays out of the way.
    const s = state({ attempts: hard, activity: [{ ...busyToday(), at: end - D }] });
    expect(NUDGE_RULES.stuckRecentMs).toBe(14 * D);
    expect(kinds(nudgesFor(s, "ada", end))).toEqual(["stuck"]);
    expect(kinds(nudgesFor(s, "ada", end + 1))).toEqual([]);
  });

  it("does not fire after only two hard sets", () => {
    const s = state({ attempts: [...set(t(1), 1), ...set(t(2), 2)], activity: [busyToday()] });
    expect(nudgesFor(s, "ada", NOW)).toEqual([]);
  });

  it("does not fire when one of the three reaches the share exactly", () => {
    expect(RULES.stuckShare).toBe(0.6);
    const s = state({ attempts: [...set(t(0), 2), ...set(t(1), 3), ...set(t(2), 2)], activity: [busyToday()] });
    expect(nudgesFor(s, "ada", NOW)).toEqual([]);
  });

  it("clears when the latest set goes well", () => {
    const s = state({ attempts: [...set(t(0), 1), ...set(t(1), 1), ...set(t(2), 1), ...set(t(3), 5)], activity: [busyToday()] });
    expect(nudgesFor(s, "ada", NOW)).toEqual([]);
  });
});

describe("nudge: a test or quiz with no prep", () => {
  const days = [0, 1, 2, 3, 4];
  const events = days.map((d) => test(addDays(TODAY, d)));
  const prepNudges = (s: StoreState) => nudgesFor(s, "ada", NOW).filter((x) => x.kind === "prep");

  it("fires from tomorrow to three days out, soonest first; its action hands over to Today, which has the prep line", () => {
    const list = prepNudges(state({ events, activity: [busyToday()] }));
    expect(list.map((x) => x.days)).toEqual([1, 2, 3]);
    expect(list[0]).toMatchObject({ key: `prep:e-${addDays(TODAY, 1)}`, action: { href: "/home", handover: true } });
  });

  it("uses the planner's prep window: not on the day of the test, when Today lists it as today's work instead", () => {
    expect(NUDGE_RULES.prepDays).toBe(3);
    expect(prepNudges(state({ events: [test(TODAY)], activity: [busyToday()] }))).toEqual([]);
  });

  it("with no skill on the map linked, says there is nothing to prep and opens the item page to link some", () => {
    const d = addDays(TODAY, 2);
    const s = state({ events: [test(d, { id: "hist", title: "History test", skillIds: [] }), test(d, { id: "odd", skillIds: ["not.a.skill"] })], activity: [busyToday()] });
    expect(nudgesFor(s, "ada", NOW).map((x) => [x.key, x.kind, x.days, x.action])).toEqual([
      ["unlinked:hist", "unlinked", 2, { href: "/calendar/hist", handover: false }],
      ["unlinked:odd", "unlinked", 2, { href: "/calendar/odd", handover: false }],
    ]);
    // Outside the window, nothing either way.
    expect(nudgesFor(state({ events: [test(addDays(TODAY, 4), { skillIds: [] })], activity: [busyToday()] }), "ada", NOW)).toEqual([]);
  });

  it("counts quizzes, but not homework, projects, done items or another learner's test", () => {
    const d = addDays(TODAY, 2);
    const s = state({
      events: [
        test(d, { id: "quiz", kind: "quiz" }),
        test(d, { id: "hw", kind: "homework" }),
        test(d, { id: "proj", kind: "project" }),
        test(d, { id: "done", done: true }),
        test(d, { id: "bo", profileId: "bo" }),
      ],
      activity: [busyToday()],
    });
    expect(prepNudges(s).map((x) => x.key)).toEqual(["prep:quiz"]);
  });

  it("does not fire once a prep set for that test is finished; an unfinished one still leaves it open", () => {
    const e = test(addDays(TODAY, 2));
    const prep = (o: Partial<PracticeSet>): PracticeSet => ({ id: "ps", profileId: "ada", createdAt: NOW - D, kind: "prep", subject: "math", skillId: "m.frac.equiv", slots: [], eventId: e.id, ...o });
    expect(prepNudges(state({ events: [e], sets: [prep({ finishedAt: NOW - H })], activity: [busyToday()] }))).toEqual([]);
    expect(prepNudges(state({ events: [e], sets: [prep({})], activity: [busyToday()] }))).toHaveLength(1);
    expect(prepNudges(state({ events: [e], sets: [prep({ finishedAt: NOW - H, eventId: "another" })], activity: [busyToday()] }))).toHaveLength(1);
  });
});

describe("nudge: nothing done in five days", () => {
  const idle = (s: StoreState) => nudgesFor(s, "ada", NOW).filter((x) => x.kind === "idle");
  const lesson = (t: number): ActivityEvent => ({ id: `l${t}`, profileId: "ada", at: t, type: "lesson_completed", courseId: "c1", lessonId: "l1", seconds: 60 });
  // Late in the day five calendar days back: still five days, even though under 5 × 24 h.
  const fiveDaysAgo = fromLocalDate(addDays(TODAY, -5)).getTime() + 11 * H;
  const fourDaysAgo = fromLocalDate(addDays(TODAY, -4)).getTime();

  it("fires on the fifth calendar day with nothing done, and not on the fourth", () => {
    expect(idle(state({ activity: [lesson(fiveDaysAgo)] }))).toEqual([
      { key: `idle:${addDays(TODAY, -5)}`, kind: "idle", days: 5, action: { href: "/home", handover: true } },
    ]);
    expect(idle(state({ activity: [lesson(fourDaysAgo)] }))).toEqual([]);
    expect(idle(state({ attempts: [at("m.add.5", fourDaysAgo, true)] }))).toEqual([]);
  });

  it("keeps the same key from one day to the next", () => {
    const s = state({ activity: [lesson(fiveDaysAgo)] });
    expect(nudgesFor(s, "ada", NOW + D).find((x) => x.kind === "idle")).toMatchObject({ key: `idle:${addDays(TODAY, -5)}`, days: 6 });
  });

  it("counts from when the learner was added if they never started", () => {
    const fresh = (ago: number) => state({ profiles: [{ ...ada, createdAt: fromLocalDate(addDays(TODAY, -ago)).getTime() }] });
    expect(idle(fresh(5))).toHaveLength(1);
    expect(idle(fresh(4))).toEqual([]);
  });

  it("does not count a course being added as doing something", () => {
    const added: ActivityEvent = { id: "add", profileId: "ada", at: NOW - H, type: "course_added", courseId: "c1" };
    expect(idle(state({ activity: [lesson(fiveDaysAgo), added] }))).toHaveLength(1);
  });

  it("ignores anything dated after now; reading logged for today counts from now", () => {
    const morning = new Date(2026, 9, 7, 8).getTime();
    const ahead = { id: "r1", profileId: "ada", date: addDays(TODAY, 1), title: "Logged ahead", minutes: 10 };
    const today = { id: "r2", profileId: "ada", date: TODAY, title: "This morning", minutes: 10 };
    expect(lastActive(state({ reading: [ahead, today] }), "ada", morning)).toBe(morning);
    expect(lastActive(state({ reading: [ahead] }), "ada", morning)).toBeUndefined();
  });

  it("counts reading, the tutor and plan lines marked done as doing something", () => {
    const s = (patch: Partial<StoreState>) => state({ activity: [lesson(fiveDaysAgo)], ...patch });
    expect(idle(s({ reading: [{ id: "r", profileId: "ada", date: addDays(TODAY, -1), title: "Frog and Toad", minutes: 20 }] }))).toEqual([]);
    expect(idle(s({ threads: [{ id: "th", profileId: "ada", startedAt: NOW - 2 * D, surface: "talk", title: "Moon", lines: [{ role: "learner", text: "why", at: NOW - 2 * D }] }] }))).toEqual([]);
    expect(idle(s({ planDone: [{ profileId: "ada", date: TODAY, key: "due:x", at: NOW - H }] }))).toEqual([]);
    expect(lastActive(s({ planDone: [{ profileId: "ada", date: TODAY, key: "due:x", at: NOW - H }] }), "ada")).toBe(NOW - H);
  });
});

describe("nudges together", () => {
  it("come tests first, then checks, stuck skills, then nothing done; another learner's record never leaks in", () => {
    const T = NOW - 40 * D;
    const s = state({
      profiles: [ada, bo],
      events: [test(addDays(TODAY, 3), { id: "hist", skillIds: [] }), test(addDays(TODAY, 2)), test(addDays(TODAY, 1), { id: "bo-test", profileId: "bo" })],
      attempts: [...ready(T), ...set(NOW - 8 * D, 1), ...set(NOW - 7 * D, 1), ...set(NOW - 6 * D, 1)],
    });
    expect(kinds(nudgesFor(s, "ada", NOW))).toEqual(["prep", "unlinked", "check", "stuck", "idle"]);
    expect(nudgesFor(s, "bo", NOW).map((x) => x.key)).toEqual(["prep:bo-test", `idle:${localDate(bo.createdAt)}`]);
    expect(nudgesFor(s, "nobody", NOW)).toEqual([]);
  });
});

describe("logNudges", () => {
  const nudge: Nudge = { key: "stuck:m.add.10", kind: "stuck", days: 0, skillId: "m.add.10", action: { href: "/practice?subject=math&again=m.add.10", handover: true } };
  const asParent = () =>
    update((s) => {
      s.profiles = [ada];
      s.session = { accountId: "acc", profileId: "parent", unlocked: true };
    });

  it("records a nudge act for the child, once a day, with no outcome", () => {
    asParent();
    logNudges("ada", [nudge], NOW);
    logNudges("ada", [nudge], NOW + H);
    expect(read().acts).toEqual([{ id: expect.any(String), at: NOW, profileId: "ada", kind: "nudge", intent: "parent-acts", ref: "stuck:m.add.10", detail: "stuck", skillId: "m.add.10" }]);
    logNudges("ada", [nudge], NOW + D);
    expect(read().acts).toHaveLength(2);
  });

  it("writes nothing at all when every nudge shown was already recorded today", () => {
    asParent();
    logNudges("ada", [nudge], NOW);
    let writes = 0;
    const stop = subscribe(() => void writes++);
    logNudges("ada", [nudge], NOW + H);
    expect(writes).toBe(0);
    logNudges("ada", [nudge, { key: "idle:2026-10-01", kind: "idle", days: 6, action: { href: "/home", handover: true } }], NOW + 2 * H);
    expect(writes).toBe(1);
    stop();
    expect(read().acts.map((a) => a.ref)).toEqual(["stuck:m.add.10", "idle:2026-10-01"]);
  });

  it("never records anything while a child is using the app", () => {
    update((s) => void (s.session = { accountId: "acc", profileId: "ada" }));
    logNudges("ada", [nudge], NOW);
    expect(read().acts).toEqual([]);
  });
});
