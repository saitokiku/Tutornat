import { checksOpen } from "@/learning/engine";
import { daysBetween, localDate } from "@/planner/dates";
import { planFor, type PlanItem } from "@/planner/plan";
import type { SchoolEvent } from "@/planner/types";
import { lessonState } from "./activity";
import { logAct } from "./acts";
import { continueTarget } from "./continue";
import { coursesOf } from "./courses";
import { settingsOf, startOf, startSet, statusesOf } from "./practice";
import { currentLearner, learnersOf } from "./profiles";
import { read, update, type StoreState } from "./store";
import type { Profile, Subject } from "./types";

// Today's plan for one learner, from the store. Screens call these; the rules live in planner/plan.ts.

const SUBJECTS: Subject[] = ["math", "english", "science", "other"];

export function todayPlan(s: StoreState, p: Profile, now: number) {
  const date = localDate(now);
  const courses = coursesOf(s, p.id);
  const events = s.activity.filter((e) => e.profileId === p.id);
  const next = continueTarget(s, p.id)[0];
  const completedToday = s.activity.find(
    (e) => e.profileId === p.id && e.type === "lesson_completed" && localDate(e.at) === date,
  );
  // A lesson finished today stays on the plan as done instead of the next one appearing.
  const lessonDone = completedToday && courses.find((c) => c.id === completedToday.courseId)?.lessons.find((l) => l.id === completedToday.lessonId);
  const lesson = lessonDone
    ? { courseId: completedToday!.courseId, lessonId: lessonDone.id, title: lessonDone.title, courseTitle: courses.find((c) => c.id === completedToday!.courseId)!.title, minutes: lessonDone.minutes }
    : next
      ? { courseId: next.course.id, lessonId: next.lesson.id, title: next.lesson.title, courseTitle: next.course.title, minutes: next.lesson.minutes }
      : undefined;
  // School work ticked off today stays on today's plan as done; the planner drops done events.
  const doneToday = new Set(s.planDone.filter((d) => d.profileId === p.id && d.date === date).map((d) => d.key));
  const plan = planFor({
    date,
    now,
    grade: p.grade,
    settings: settingsOf(p),
    statuses: statusesOf(s, p.id, now),
    starts: Object.fromEntries(SUBJECTS.map((x) => [x, startOf(p, x)])),
    events: s.events.filter((e) => e.profileId === p.id).map((e) => (e.done && doneToday.has(`due:${e.id}`) ? { ...e, done: false } : e)),
    feedback: s.feedback.filter((f) => f.profileId === p.id),
    sets: s.sets.filter((x) => x.profileId === p.id),
    done: s.planDone.filter((d) => d.profileId === p.id),
    lesson,
  });
  if (lessonDone) for (const i of [...plan.lead, ...plan.more]) if (i.kind === "lesson") i.done = lessonState(events, i.lesson!.courseId, i.lesson!.lessonId) === "done";
  return plan;
}

export function markDone(profileId: string, date: string, key: string, done = true) {
  update((s) => {
    s.planDone = s.planDone.filter((d) => !(d.profileId === profileId && d.date === date && d.key === key));
    if (done) s.planDone.push({ profileId, date, key, at: Date.now() });
    if (key.startsWith("due:")) {
      const e = s.events.find((x) => x.id === key.slice(4) && x.profileId === profileId);
      if (e) e.done = done;
    }
  });
}

/** Starts (or resumes) the set behind a plan line. Returns the set id, or null for lines without a set. */
export function startPlanItem(s: StoreState, p: Profile, item: PlanItem, date: string, now: number): string | null {
  const planKey = planRef(date, item.key);
  const kind = item.kind === "check" ? "check" : item.kind === "prep" ? "prep" : item.kind === "feedback" ? "feedback" : item.kind === "review" ? "review" : "daily";
  if (item.kind === "due" || item.kind === "lesson") return null;
  return startSet(s, { profile: p, kind, skillIds: item.skillIds, planKey, eventId: item.event?.id, now });
}

/** A plan line for the day, as sets (planKey) and teaching acts (ref) name it: "2026-10-07:daily:math". */
export const planRef = (date: string, key: string) => `${date}:${key}`;

/**
 * Records that Today showed these plan lines to the learner: one teaching act per line per day. Whether
 * each got done that day is worked out later from the record (learning/outcomes.ts), never here.
 */
export function logPlanLines(profileId: string, refs: string[]) {
  const acts = read().acts;
  for (const ref of refs)
    if (!acts.some((a) => a.profileId === profileId && a.kind === "plan" && a.ref === ref))
      logAct({ profileId, kind: "plan", intent: "plan-line-done", ref }, { once: true });
}

// ----- the status strip -----

/** How far ahead a test or quiz shows in Today's status. */
export const TEST_AHEAD_DAYS = 14;

export type TodayStatus = {
  date: string;
  /** Homework and projects due today, not done. */
  due: SchoolEvent[];
  /** The nearest test or quiz from today on, within TEST_AHEAD_DAYS. */
  test: { event: SchoolEvent; inDays: number } | null;
  /** Skills whose check is open now. */
  checks: string[];
  /** The learner's daily minutes. */
  budget: number;
  /** Minutes measured today: time on answers plus finished lessons. */
  used: number;
  left: number;
};

/** Minutes actually spent today: answer time (not tutor-help rows) plus lessons finished today. */
export function minutesToday(s: StoreState, profileId: string, now: number) {
  const day = new Date(now);
  const from = day.setHours(0, 0, 0, 0);
  const to = day.setDate(day.getDate() + 1);
  const today = (at: number) => at >= from && at < to;
  let seconds = 0;
  for (const a of s.attempts) if (a.profileId === profileId && a.mode !== "tutor" && today(a.at)) seconds += a.seconds;
  for (const e of s.activity) if (e.profileId === profileId && e.type === "lesson_completed" && today(e.at)) seconds += e.seconds ?? 0;
  return Math.round(seconds / 60);
}

export function todayStatus(s: StoreState, p: Profile, now: number): TodayStatus {
  const date = localDate(now);
  const open = s.events.filter((e) => e.profileId === p.id && !e.done);
  const tests = open
    .filter((e) => (e.kind === "test" || e.kind === "quiz") && e.date >= date)
    .map((event) => ({ event, inDays: daysBetween(date, event.date) }))
    .filter((x) => x.inDays <= TEST_AHEAD_DAYS)
    .sort((a, b) => a.inDays - b.inDays || (a.event.time ?? "").localeCompare(b.event.time ?? ""));
  const budget = settingsOf(p).dailyMinutes;
  const used = minutesToday(s, p.id, now);
  return {
    date,
    due: open.filter((e) => (e.kind === "homework" || e.kind === "project") && e.date === date),
    test: tests[0] ?? null,
    checks: checksOpen(statusesOf(s, p.id, now), now).map((x) => x.skillId),
    budget,
    used,
    left: Math.max(0, budget - used),
  };
}

export type StripLine =
  | { kind: "due"; events: SchoolEvent[] }
  | { kind: "test"; event: SchoolEvent; inDays: number }
  | { kind: "checks"; n: number }
  | { kind: "minutes"; left: number };

/** What the status strip shows: only what is non-zero. Pre-readers see no minute numbers; their grown-up does. */
export function stripLines(status: TodayStatus, opts: { young: boolean; grownUp: boolean }): StripLine[] {
  const out: StripLine[] = [];
  if (status.due.length) out.push({ kind: "due", events: status.due });
  if (status.test) out.push({ kind: "test", ...status.test });
  if (status.checks.length) out.push({ kind: "checks", n: status.checks.length });
  if (status.left > 0 && (!opts.young || opts.grownUp)) out.push({ kind: "minutes", left: status.left });
  return out;
}

// ----- who is looking -----

/**
 * Who Today is for, decided the way the app shell decides: a selected learner sees their own Today; a
 * grown-up (the parent session) looks at one child — the one asked for, else the first.
 */
export function todayViewer(s: StoreState, learnerId: string | null): { learner: Profile; grownUp: boolean } | null {
  const me = currentLearner(s);
  if (me) return { learner: me, grownUp: false };
  if (s.session.profileId !== "parent") return null;
  const kids = learnersOf(s);
  const child = kids.find((k) => k.id === learnerId) ?? kids[0];
  return child ? { learner: child, grownUp: true } : null;
}
