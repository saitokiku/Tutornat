import { describe, expect, it } from "vitest";
import { say } from "@/components/family/say";
import type { ActivityEvent, Course } from "@/lib/types";
import type { SchoolEvent } from "@/planner/types";
import { isItWorking, nudgeKey, parseNudge, resolveActs, type OutcomeRecord, type ResolvedAct } from "./outcomes";
import { teachingProfile } from "./profile";
import type { Attempt, PracticeSet, TeachingAct } from "./types";

// A scripted history per intent: each act resolves met, missed or pending from later evidence only.

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const T0 = new Date(2026, 9, 5, 15, 0).getTime(); // Monday 5 Oct 2026, 3 pm local
const P = "kid";
const S = "m.add.20"; // 2 levels, words only

let k = 0;
const practiceSet = (id: string, seeds: number[], extra: Partial<PracticeSet> = {}): PracticeSet => ({
  id,
  profileId: P,
  createdAt: T0,
  kind: "pick",
  subject: "math",
  skillId: S,
  slots: seeds.map((seed) => ({ skillId: S, seed, role: "main" as const })),
  ...extra,
});
const ans = (setId: string | undefined, seed: number, minute: number, o: Partial<Attempt> = {}): Attempt => ({
  id: `a${k++}`,
  profileId: P,
  at: T0 + minute * MIN,
  skillId: S,
  level: 1,
  seed,
  setId,
  mode: "practice",
  correct: true,
  assisted: false,
  seconds: 8,
  ...o,
});
const act = (o: Partial<TeachingAct> & Pick<TeachingAct, "kind" | "intent">, minute = 0): TeachingAct => ({ id: `x${k++}`, profileId: P, at: T0 + minute * MIN, ...o });
const one = (a: TeachingAct, r: Partial<OutcomeRecord>, now = T0 + HOUR) => resolveActs([a], { attempts: [], sets: [], ...r }, now)[0];

describe("next-try-right", () => {
  const hint = act({ kind: "hint", intent: "next-try-right", skillId: S, setId: "s1", ref: "1", detail: "2" }, 1);
  const set = practiceSet("s1", [10, 11, 12]);

  it("is met when the next problem after the helped one is right on their own", () => {
    const r = one(hint, { sets: [set], attempts: [ans("s1", 10, 0.5), ans("s1", 11, 2, { assisted: true }), ans("s1", 12, 3)] });
    expect(r).toMatchObject({ status: "met", resolvedAt: T0 + 3 * MIN });
  });

  it("is missed when the next problem is wrong or helped", () => {
    expect(one(hint, { sets: [set], attempts: [ans("s1", 11, 2, { assisted: true }), ans("s1", 12, 3, { correct: false })] }).status).toBe("missed");
    expect(one(hint, { sets: [set], attempts: [ans("s1", 11, 2, { assisted: true }), ans("s1", 12, 3, { assisted: true })] }).status).toBe("missed");
  });

  it("is pending while the helped problem or the next one is still to come", () => {
    expect(one(hint, { sets: [set], attempts: [] }).status).toBe("pending");
    expect(one(hint, { sets: [set], attempts: [ans("s1", 11, 2, { assisted: true })] }, T0 + 10 * MIN).status).toBe("pending");
  });

  it("help on the last problem on the skill in a set has nothing in that set to show it: void once the set ends", () => {
    const last = act({ kind: "steps", intent: "next-try-right", skillId: S, setId: "s1", ref: "2" }, 2);
    const helped = ans("s1", 12, 3, { assisted: true });
    // A later set doesn't decide it: the intent is the next try in this set.
    expect(one(last, { sets: [{ ...set, finishedAt: T0 + 4 * MIN }], attempts: [helped, ans("s2", 20, 60 * 24)] }, T0 + 2 * DAY).status).toBe("void");
    expect(one(last, { sets: [set], attempts: [helped] }, T0 + 5 * MIN).status).toBe("pending");
    // Left partway, no answer for half a day: closed.
    expect(one(last, { sets: [set], attempts: [helped] }, T0 + 13 * HOUR).status).toBe("void");
    // Never answered at all, a week on.
    expect(one(last, { sets: [set], attempts: [] }, T0 + 8 * DAY).status).toBe("void");
  });

  it("a tutor conversation is judged by the next answer on its skill within a day", () => {
    const talk = act({ kind: "tutor", intent: "next-try-right", skillId: S, ref: "thread-1" });
    expect(one(talk, { attempts: [ans(undefined, 1, 30, { mode: "tutor", correct: false, assisted: true }), ans("s9", 2, 40)] }).status).toBe("met");
    expect(one(talk, { attempts: [ans("s9", 2, 40, { correct: false })] }).status).toBe("missed");
    expect(one(talk, { attempts: [ans("s9", 2, 40)] }, T0 + 30 * MIN).status).toBe("met");
    expect(one(talk, { attempts: [] }, T0 + 2 * HOUR).status).toBe("pending");
    expect(one(talk, { attempts: [ans("s9", 2, 25 * 60)] }, T0 + 2 * DAY).status).toBe("void");
    expect(one({ ...talk, skillId: undefined }, { attempts: [ans("s9", 2, 40)] }).status).toBe("pending");
  });

  it("a talk beside a problem skips that problem's own (helped) answer: the next problem decides", () => {
    // The drawer opened on seed 5 in set s1: a tutor help row, the talk, then the helped answer and the next problem.
    const drawer = act({ kind: "tutor", intent: "next-try-right", skillId: S, setId: "s1", ref: "thread-2", detail: "5" }, 1);
    const help = ans(undefined, 5, 0.5, { mode: "tutor", correct: false, assisted: true });
    const helped = ans("s1", 5, 3, { assisted: true });
    expect(one(drawer, { sets: [practiceSet("s1", [5, 6])], attempts: [help, helped, ans("s1", 6, 4)] })).toMatchObject({ status: "met", resolvedAt: T0 + 4 * MIN });
    expect(one(drawer, { sets: [practiceSet("s1", [5, 6])], attempts: [help, helped, ans("s1", 6, 4, { correct: false })] }).status).toBe("missed");
    expect(one(drawer, { sets: [practiceSet("s1", [5, 6])], attempts: [help, helped] }).status).toBe("pending");
  });

  it("finds the problem a talk was about from the drawer's help row when the act names only its thread", () => {
    // Logged as the tutor contract says: thread id and skill, nothing about the problem.
    const talk = act({ kind: "tutor", intent: "next-try-right", skillId: S, ref: "thread-3" }, 1);
    const help = ans(undefined, 5, 0.5, { mode: "tutor", correct: false, assisted: true });
    const helped = ans("s1", 5, 3, { assisted: true });
    expect(one(talk, { attempts: [help, helped, ans("s1", 6, 4)] })).toMatchObject({ status: "met", resolvedAt: T0 + 4 * MIN });
    expect(one(talk, { attempts: [help, helped, ans("s1", 6, 4, { correct: false })] }).status).toBe("missed");
    expect(one(talk, { attempts: [help, helped] }).status).toBe("pending");
    // A problem the drawer never opened on still decides, helped or not.
    expect(one(talk, { attempts: [help, ans("s1", 7, 3, { assisted: true })] }).status).toBe("missed");
  });

  it("keeps an outcome already on the act", () => {
    expect(one({ ...hint, outcome: "missed", resolvedAt: T0 }, {})).toMatchObject({ status: "missed", resolvedAt: T0 });
  });
});

describe("skill-moves", () => {
  const start = act({ kind: "set", intent: "skill-moves", skillId: S, setId: "s1" });
  const alternating = (setId: string, from: number) => [0, 1, 2, 3].map((i) => ans(setId, from + i, from + i, { correct: i % 2 === 0 }));

  it("is met when the level rises within the set", () => {
    const attempts = [1, 2, 3, 4, 5].map((i) => ans("s1", i, i));
    expect(one(start, { sets: [practiceSet("s1", [1, 2, 3, 4, 5])], attempts })).toMatchObject({ status: "met", resolvedAt: T0 + 5 * MIN });
  });

  it("is missed after three finished sets without a level up or ready", () => {
    const sets = ["s1", "s2", "s3"].map((id) => practiceSet(id, [], { finishedAt: T0 + DAY }));
    const attempts = [...alternating("s1", 10), ...alternating("s2", 20), ...alternating("s3", 30)];
    expect(one(start, { sets, attempts }, T0 + 2 * DAY).status).toBe("missed");
  });

  it("is pending until three sets have happened", () => {
    expect(one(start, { sets: [practiceSet("s1", [], { finishedAt: T0 + DAY })], attempts: alternating("s1", 10) }, T0 + 2 * DAY).status).toBe("pending");
  });

  it("a set on a skill that was already ready or proved has nothing to move: void, never met", () => {
    // Five right at level 1 step up to level 2; ten right at the top level make it ready for a check.
    const ready = [...[0, 1, 2, 3, 4].map((i) => ans("p0", i, -100 + i)), ...Array.from({ length: 10 }, (_, i) => ans("p0", 10 + i, -90 + i, { level: 2 }))];
    const review = act({ kind: "set", intent: "skill-moves", skillId: S, setId: "r1" });
    const after = [0, 1, 2].map((i) => ans("r1", 50 + i, 1 + i, { level: 2, assisted: i === 2 }));
    expect(one(review, { sets: [practiceSet("r1", [50, 51, 52], { kind: "review", finishedAt: T0 + 5 * MIN })], attempts: [...ready, ...after] }, T0 + DAY).status).toBe("void");
  });
});

describe("check-decides", () => {
  const check = act({ kind: "check", intent: "check-decides", skillId: S, setId: "c1" });
  const answers = (own: number, total = 5) => Array.from({ length: total }, (_, i) => ans("c1", 100 + i, i + 1, { mode: "check", level: 2, correct: i < own }));

  it("passed is met, not yet is missed, with the count", () => {
    expect(one(check, { attempts: answers(4) })).toMatchObject({ status: "met", score: { n: 4, of: 5 } });
    expect(one(check, { attempts: answers(3) })).toMatchObject({ status: "missed", score: { n: 3, of: 5 } });
  });

  it("is pending until all five are answered", () => {
    expect(one(check, { attempts: answers(3, 3) }).status).toBe("pending");
  });

  it("a check left partway is not passed; one opened and never answered is left out", () => {
    expect(one(check, { attempts: answers(3, 3) }, T0 + 13 * HOUR)).toMatchObject({ status: "missed", score: { n: 3, of: 3 } });
    expect(one(check, { sets: [practiceSet("c1", [1, 2, 3, 4, 5], { kind: "check", finishedAt: T0 + 5 * MIN })], attempts: answers(2, 2) })).toMatchObject({ status: "missed", score: { n: 2, of: 2 } });
    expect(one(check, { attempts: [] }, T0 + 13 * HOUR).status).toBe("void");
    expect(one(check, { attempts: [] }, T0 + HOUR).status).toBe("pending");
  });
});

describe("test-goes-well", () => {
  const event: SchoolEvent = { id: "e1", profileId: P, title: "Addition quiz", kind: "quiz", date: "2026-10-09", skillIds: [S], source: "typed", createdAt: T0 };
  const prep = act({ kind: "prep", intent: "test-goes-well", ref: "e1" });
  // Five right at level 1 step up to level 2; ten right at the top level make it ready for a check.
  const ready = [...[0, 1, 2, 3, 4].map((i) => ans("p1", i, i)), ...Array.from({ length: 10 }, (_, i) => ans("p1", 10 + i, 10 + i, { level: 2 }))];
  const testDay = new Date(2026, 9, 9, 10).getTime();

  it("is met when every linked skill is secure going into the test day", () => {
    expect(one(prep, { events: [event], attempts: ready }, testDay)).toMatchObject({ status: "met", score: { n: 1, of: 1 }, about: "Addition quiz" });
  });

  it("is missed when a linked skill isn't, and pending before the day", () => {
    expect(one(prep, { events: [event], attempts: ready.slice(0, 3) }, testDay)).toMatchObject({ status: "missed", score: { n: 0, of: 1 } });
    expect(one(prep, { events: [event], attempts: ready }, new Date(2026, 9, 8, 20).getTime()).status).toBe("pending");
  });

  it("is missed when a linked skill was proved but needs a refresh going into the test", () => {
    const minute = (day: number, i = 0) => day * 24 * 60 + i;
    const check = (setId: string, day: number) => Array.from({ length: 5 }, (_, i) => ans(setId, 100 + day * 10 + i, minute(day, i), { level: 2, mode: "check" }));
    const proved = [...ready, ...check("c1", 3), ...check("c2", 10)];
    const slipped = [...proved, ...[0, 1].map((i) => ans(undefined, 900 + i, minute(20, i), { level: 2, mode: "review", correct: false }))];
    const later: SchoolEvent = { ...event, date: "2026-10-30" };
    const day = new Date(2026, 9, 30, 10).getTime();
    expect(one(prep, { events: [later], attempts: proved }, day)).toMatchObject({ status: "met", score: { n: 1, of: 1 } });
    expect(one(prep, { events: [later], attempts: slipped }, day)).toMatchObject({ status: "missed", score: { n: 0, of: 1 } });
  });

  it("shows a school result beside the outcome, never instead of it", () => {
    const results = [{ id: "r1", profileId: P, title: "addition quiz ", date: "2026-10-09", score: 18, outOf: 20 }];
    expect(one(prep, { events: [event], attempts: ready.slice(0, 3), results }, testDay)).toMatchObject({ status: "missed", school: { score: 18, outOf: 20 } });
  });
});

describe("lesson-checks-pass", () => {
  const course: Course = {
    id: "c",
    profileId: P,
    title: "Adding",
    goal: "",
    subject: "math",
    grade: "1",
    locale: "en",
    origin: "catalogue",
    status: "ready",
    length: "short",
    sources: [],
    template: false,
    createdAt: T0,
    updatedAt: T0,
    lessons: [
      {
        id: "l1",
        title: "Make ten",
        summary: "",
        minutes: 10,
        scenes: [{ id: "q", kind: "quiz", title: "Check", questions: Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, prompt: "?", choices: ["a", "b"], answer: 0, hint: "", explain: "" })) }],
      },
    ],
  };
  const lesson = act({ kind: "lesson", intent: "lesson-checks-pass", ref: "c/l1" });
  const ev = (type: ActivityEvent["type"], minute: number, o: Partial<ActivityEvent> = {}): ActivityEvent => ({ id: `e${k++}`, profileId: P, at: T0 + minute * MIN, type, courseId: "c", lessonId: "l1", ...o });
  const quiz = (own: number) => Array.from({ length: 5 }, (_, i) => ev("quiz_answered", i + 1, { sceneId: `q:${i}`, correct: i < own, assisted: false }));

  it("is met when 4 of 5 checks are right on their own", () => {
    expect(one(lesson, { courses: [course], activity: [...quiz(4), ev("lesson_completed", 9)] })).toMatchObject({ status: "met", score: { n: 4, of: 5 }, about: "Make ten" });
  });

  it("is missed below that, or when the lesson is left for two weeks", () => {
    expect(one(lesson, { courses: [course], activity: [...quiz(3), ev("lesson_completed", 9)] }).status).toBe("missed");
    expect(one(lesson, { courses: [course], activity: quiz(4).slice(0, 2) }, T0 + 15 * DAY)).toMatchObject({ status: "missed", score: { n: 2, of: 5 } });
  });

  it("is pending while the lesson is under way", () => {
    expect(one(lesson, { courses: [course], activity: quiz(4).slice(0, 2) }).status).toBe("pending");
  });
});

describe("plan-line-done", () => {
  const line = act({ kind: "plan", intent: "plan-line-done", ref: "2026-10-05:daily:math" });
  const evening = new Date(2026, 9, 5, 20).getTime();

  it("is met when the line was marked done, its set finished, or its lesson finished that day", () => {
    expect(one(line, { planDone: [{ profileId: P, date: "2026-10-05", key: "daily:math", at: T0 + MIN }] }, evening).status).toBe("met");
    expect(one(line, { sets: [practiceSet("s1", [], { planKey: "2026-10-05:daily:math", finishedAt: T0 + 9 * MIN })] }, evening)).toMatchObject({ status: "met", resolvedAt: T0 + 9 * MIN });
    const lessonLine = act({ kind: "plan", intent: "plan-line-done", ref: "2026-10-05:lesson:c:l1" });
    const done: ActivityEvent = { id: "e", profileId: P, at: T0 + 5 * MIN, type: "lesson_completed", courseId: "c", lessonId: "l1" };
    expect(one(lessonLine, { activity: [done] }, evening).status).toBe("met");
  });

  it("is missed once the day is over, pending until then", () => {
    expect(one(line, {}, evening).status).toBe("pending");
    expect(one(line, {}, new Date(2026, 9, 6, 8).getTime())).toMatchObject({ status: "missed", resolvedAt: new Date(2026, 9, 6).getTime() });
    // A set finished the next day doesn't count for this day's line.
    expect(one(line, { sets: [practiceSet("s1", [], { planKey: "2026-10-05:daily:math", finishedAt: new Date(2026, 9, 6, 9).getTime() })] }, new Date(2026, 9, 6, 10).getTime()).status).toBe("missed");
  });
});

describe("parent-acts", () => {
  const event: SchoolEvent = { id: "e1", profileId: P, title: "Quiz", kind: "quiz", date: "2026-10-09", skillIds: [S], source: "typed", createdAt: T0 };
  const nudge = (ref: string) => act({ kind: "nudge", intent: "parent-acts", ref });

  it("reads suggestion keys tolerantly, the kind from the act's detail when it names one", () => {
    expect(parseNudge(nudgeKey("check", S))).toEqual({ kind: "check", skillId: S });
    expect(parseNudge(`overdue:${S}`)).toEqual({ kind: "check", skillId: S });
    expect(parseNudge(`stuck:${S}`)).toEqual({ kind: "stuck", skillId: S });
    expect(parseNudge("noprep:e1", [event])).toEqual({ kind: "prep", eventId: "e1" });
    expect(parseNudge("idle")).toEqual({ kind: "idle" });
    expect(parseNudge("idle:2026-10-05")).toEqual({ kind: "idle" });
    expect(parseNudge("x:2026-10-05", [], "idle")).toEqual({ kind: "idle" });
    expect(parseNudge("waiting", [], "check", S)).toEqual({ kind: "check", skillId: S });
  });

  it("can't tell what a suggestion was about when its skill or test is not on the record", () => {
    expect(parseNudge("check:no.such.skill")).toBeNull();
    expect(parseNudge("gone:e9")).toBeNull();
    expect(parseNudge("prep:e9", [], "prep")).toEqual({ kind: "prep", eventId: "e9" });
    // A test deleted before any prep: whether the suggestion was acted on can't be known, so it isn't counted.
    expect(one({ ...nudge("prep:e9"), detail: "prep" }, {}, T0 + 8 * DAY).status).toBe("void");
    expect(one(nudge("check:no.such.skill"), {}, T0 + 8 * DAY).status).toBe("void");
    // Prep done before the test was deleted still counts.
    const prepped = { sets: [practiceSet("p1", [1], { kind: "prep" as const, eventId: "e9" })], attempts: [ans("p1", 1, 90)] };
    expect(one({ ...nudge("prep:e9"), detail: "prep" }, prepped, T0 + 8 * DAY).status).toBe("met");
  });

  it("is met when the suggested action happens within a week", () => {
    expect(one(nudge(`check:${S}`), { attempts: [ans("c1", 1, 60 * 48, { mode: "check", level: 2 })] }, T0 + 3 * DAY)).toMatchObject({ status: "met", resolvedAt: T0 + 2 * DAY });
    expect(one(nudge(`stuck:${S}`), { attempts: [ans(undefined, 1, 60 * 24, { mode: "tutor", correct: false, assisted: true })] }, T0 + 3 * DAY).status).toBe("met");
    expect(one(nudge("prep:e1"), { events: [event], sets: [practiceSet("p1", [1], { kind: "prep", eventId: "e1" })], attempts: [ans("p1", 1, 90)] }, T0 + DAY).status).toBe("met");
    expect(one(nudge("idle"), { reading: [{ id: "r", profileId: P, date: "2026-10-06", title: "Frog and Toad", minutes: 15 }] }, T0 + 3 * DAY).status).toBe("met");
  });

  it("a stuck skill counts once new work shows it isn't stuck", () => {
    // Three hard sets in a row: stuck. A fourth, all right on their own, ends it.
    const hard = ["h1", "h2", "h3"].flatMap((id, j) => [0, 1, 2].map((i) => ans(id, 10 * j + i, -300 + 10 * j + i, { correct: i === 0 })));
    const better = [0, 1, 2, 3, 4].map((i) => ans("h4", 100 + i, 60 + i));
    expect(one(nudge(`stuck:${S}`), { attempts: [...hard, ...better] }, T0 + 2 * DAY)).toMatchObject({ status: "met", resolvedAt: T0 + 60 * MIN });
    expect(one(nudge(`stuck:${S}`), { attempts: hard }, T0 + 2 * DAY).status).toBe("pending");
  });

  it("is missed after a week without it, pending before", () => {
    expect(one(nudge(`check:${S}`), {}, T0 + 8 * DAY)).toMatchObject({ status: "missed", resolvedAt: T0 + 7 * DAY });
    expect(one(nudge(`check:${S}`), { attempts: [ans("c1", 1, 60 * 24 * 8, { mode: "check" })] }, T0 + 9 * DAY).status).toBe("missed");
    expect(one(nudge("idle"), {}, T0 + 2 * DAY).status).toBe("pending");
  });
});

describe("course-finished", () => {
  const lesson = (id: string) => ({ id, title: id, summary: "", minutes: 5, scenes: [] });
  const course: Course = { id: "c", profileId: P, title: "Moon", goal: "", subject: "science", grade: "3", locale: "en", origin: "catalogue", status: "ready", length: "short", sources: [], template: false, createdAt: T0, updatedAt: T0, lessons: [lesson("l1"), lesson("l2")] };
  const added = act({ kind: "course", intent: "course-finished", ref: "c" });
  const done = (lessonId: string, day: number): ActivityEvent => ({ id: `e${k++}`, profileId: P, at: T0 + day * DAY, type: "lesson_completed", courseId: "c", lessonId });

  it("is met when every lesson is done", () => {
    expect(one(added, { courses: [course], activity: [done("l1", 1), done("l2", 3)] }, T0 + 4 * DAY)).toMatchObject({ status: "met", resolvedAt: T0 + 3 * DAY, about: "Moon" });
  });

  it("is missed after a month with no lessons, pending before", () => {
    expect(one(added, { courses: [course], activity: [done("l1", 1)] }, T0 + 40 * DAY)).toMatchObject({ status: "missed", resolvedAt: T0 + 31 * DAY });
    expect(one(added, { courses: [course], activity: [done("l1", 1)] }, T0 + 10 * DAY).status).toBe("pending");
    expect(one(added, { courses: [] }, T0 + 40 * DAY).status).toBe("pending");
  });
});

describe("isItWorking", () => {
  const now = T0 + 10 * DAY;
  const r = (o: Partial<ResolvedAct> & Pick<ResolvedAct, "kind" | "intent" | "status">, daysAgo: number): ResolvedAct => ({
    id: `x${k++}`,
    profileId: P,
    at: now - daysAgo * DAY - HOUR,
    resolvedAt: o.status === "pending" ? undefined : now - daysAgo * DAY,
    ...o,
  });
  const helped = (kind: "hint" | "steps" | "similar", status: ResolvedAct["status"], slot: number, daysAgo = 1) => r({ kind, intent: "next-try-right", status, setId: "s1", ref: String(slot), skillId: S, detail: kind === "hint" ? "1" : undefined }, daysAgo);
  const empty = teachingProfile({ attempts: [], acts: [], sets: [] }, now);
  const words = (list: ReturnType<typeof isItWorking>) => list.map((s) => say(s, "en"));

  it("says how hints and worked examples went, one count per helped problem", () => {
    const resolved = [
      helped("hint", "met", 0),
      helped("hint", "met", 0), // a second rung on the same problem counts once
      helped("hint", "met", 1),
      helped("hint", "missed", 2),
      helped("hint", "met", 3),
      helped("steps", "met", 3), // a worked example on a problem makes it an example problem
      helped("similar", "met", 4),
      helped("hint", "pending", 5),
    ];
    expect(words(isItWorking(resolved, empty, now))).toEqual(["After a hint, the next problem was right on their own 2 of 3 times; after a worked example, 2 of 2."]);
  });

  it("says what to start with when they're stuck, and whose choice that is", () => {
    const resolved = [helped("hint", "met", 0)];
    const set = teachingProfile({ attempts: [], acts: [], sets: [], prefs: { leadWith: "example" } }, now);
    expect(words(isItWorking(resolved, set, now))[1]).toBe("When they're stuck, start with a worked example, as you chose.");
    const examplesWork = [...[0, 1, 2].map((i) => helped("hint", "missed", i)), ...[3, 4, 5].map((i) => helped("steps", "met", i))];
    const derived = teachingProfile({ attempts: [], acts: [], sets: [], resolved: examplesWork }, now);
    expect(words(isItWorking(examplesWork, derived, now))).toEqual([
      "After a hint, the next problem was right on their own 0 of 3 times; after a worked example, 3 of 3.",
      "So when they're stuck, start with a worked example.",
    ]);
  });

  it("leaves out acts that could never be decided", () => {
    const resolved = [helped("hint", "void", 0), r({ kind: "set", intent: "skill-moves", status: "void", skillId: S }, 1), r({ kind: "set", intent: "skill-moves", status: "met", skillId: S }, 1)];
    expect(words(isItWorking(resolved, empty, now))).toEqual(["1 of 1 practice sets moved their skill forward within three sets: a level up, or ready for a check."]);
  });

  it("notices hints landing less often than the week before", () => {
    const resolved = [
      ...[0, 1, 2].map((i) => helped("hint", "met", i, 10)),
      ...[3, 4, 5].map((i) => helped("hint", "missed", i, 2)),
    ];
    expect(words(isItWorking(resolved, empty, now))).toContain("Hints are landing less often than the week before.");
  });

  it("counts every other intent in plain sentences", () => {
    const resolved = [
      r({ kind: "tutor", intent: "next-try-right", status: "met", skillId: S, ref: "t1" }, 1),
      r({ kind: "set", intent: "skill-moves", status: "met", skillId: S }, 2),
      r({ kind: "set", intent: "skill-moves", status: "missed", skillId: S }, 2),
      r({ kind: "check", intent: "check-decides", status: "met", skillId: S }, 1),
      r({ kind: "prep", intent: "test-goes-well", status: "missed", ref: "e1", about: "Spelling test", score: { n: 1, of: 2 }, school: { score: 18, outOf: 20 } }, 1),
      r({ kind: "lesson", intent: "lesson-checks-pass", status: "met", ref: "c/l1", score: { n: 5, of: 5 } }, 1),
      r({ kind: "plan", intent: "plan-line-done", status: "missed", ref: "2026-10-05:daily:math" }, 3),
      r({ kind: "nudge", intent: "parent-acts", status: "met", ref: `check:${S}` }, 2),
      r({ kind: "course", intent: "course-finished", status: "met", ref: "c" }, 2),
    ];
    expect(words(isItWorking(resolved, empty, now))).toEqual([
      "After a talk with the tutor, the next problem on that skill was right on their own 1 of 1 times.",
      "1 of 2 practice sets moved their skill forward within three sets: a level up, or ready for a check.",
      "1 of 1 checks passed.",
      "Spelling test: 1 of 2 skills it covers were ready for a check or proved by the test day.",
      "From school, Spelling test: 18 of 20.",
      "1 of 1 lessons had at least 4 of every 5 checks right on their own.",
      "0 of 1 lines on Today's plan were done on their day.",
      "1 of 1 suggestions to you were acted on within a week.",
      "1 of 1 courses finished.",
    ]);
  });

  it("reads only the last two weeks, and nothing at all is an empty list", () => {
    expect(isItWorking([helped("hint", "met", 0, 20), r({ kind: "check", intent: "check-decides", status: "met" }, 15)], empty, now)).toEqual([]);
    expect(isItWorking([], empty, now)).toEqual([]);
  });
});

it("resolves acts from the whole record without crossing learners", () => {
  const hint = act({ kind: "hint", intent: "next-try-right", skillId: S, setId: "s1", ref: "0" }, 1);
  const other = { ...ans("s1", 10, 3), profileId: "someone-else" };
  const [r] = resolveActs([hint], { attempts: [ans("s1", 10, 2, { assisted: true }), other], sets: [practiceSet("s1", [10])] }, T0 + 10 * MIN);
  expect(r.status).toBe("pending");
});
