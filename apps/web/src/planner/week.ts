import { checksOpen, type SkillStatus } from "@/learning/engine";
import type { Attempt, PracticeSet, SetKind } from "@/learning/types";
import type { Subject } from "@/lib/types";
import { addDays, daysBetween, fromLocalDate, localDate } from "./dates";
import { PLAN_RULES, planFor, type PlanInput, type PlanItem, type PlanKind } from "./plan";
import type { Feedback, SchoolEvent } from "./types";

// The calendar's week, computed from the same record as Today and never stored:
// - past days show what was done (plan lines marked done, finished sets, finished lessons, answers);
// - today shows today's plan (planFor) plus anything else finished today;
// - coming days show the projected plan: planFor run for that date with the same inputs and no done
//   marks. It is what the plan would hold if nothing changed, so every line is "planned".
// Nothing is projected into the past. One-time lines (a check, a teacher-note set, a review) are
// planned on the first day they appear; recurring lines (daily sets, prep, work due, the lesson) on
// every day they would appear. Open checks past the plan's two-a-day cap are planned on the
// following days, two a day, the way the plan would offer them once the first ones are taken.

export type LessonRef = NonNullable<PlanItem["lesson"]>;

export type WeekInput = PlanInput & {
  /** This learner's answers (any day). */
  attempts: Attempt[];
  /** Lessons this learner finished, with when. */
  lessonsDone: (LessonRef & { at: number })[];
  /** The lesson to plan on coming days (today's `lesson` may be one finished today). When the key is absent, `lesson`. */
  nextLesson?: PlanInput["lesson"];
};

export type LineStatus = "done" | "todo" | "planned";

export type WeekLine = {
  /** The plan key ("daily:math", "prep:<eventId>"…), or "set:<id>" for a set outside the plan. */
  key: string;
  kind: PlanKind | "set";
  status: LineStatus;
  subject?: Subject;
  skillIds: string[];
  minutes?: number;
  event?: SchoolEvent;
  feedback?: Feedback;
  lesson?: LessonRef;
  /** The finished set behind a done line. */
  set?: { id: string; kind: SetKind; topic?: string };
  /** A check that opens on this day (it was not open before). */
  opens?: boolean;
  /** Waits under "if you have more time" on that day's plan. */
  more?: boolean;
};

/** Answers given that day. Right-on-own, helped and missed are kept apart; nothing here is a score. */
export type DayAnswers = { n: number; own: number; helped: number; missed: number };

export type WeekDay = {
  date: string;
  when: "past" | "today" | "future";
  /** School items dated that day, in time order. */
  events: SchoolEvent[];
  lines: WeekLine[];
  answers: DayAnswers;
};

const PLAN_KINDS: PlanKind[] = ["check", "prep", "due", "feedback", "daily", "review", "lesson"];
const ORDER: WeekLine["kind"][] = [...PLAN_KINDS, "set"];
const ONCE: WeekLine["kind"][] = ["check", "feedback", "review"];
/** How far ahead of today the one-time-line bookkeeping looks back from a later week. */
const MAX_LOOKAHEAD = 400;

const startOfDay = (day: string) => new Date(fromLocalDate(day).setHours(0, 0, 0, 0)).getTime();
const endOfDay = (day: string) => new Date(fromLocalDate(day).setHours(23, 59, 59, 999)).getTime();

const fromItem = (item: PlanItem, status: LineStatus, more: boolean): WeekLine => ({
  key: item.key,
  kind: item.kind,
  status,
  subject: item.subject,
  skillIds: item.skillIds,
  minutes: item.minutes,
  event: item.event,
  feedback: item.feedback,
  lesson: item.lesson,
  more: more || undefined,
});

/** The plan key a set fulfils on `day`, if it was started from that day's plan. */
const planKeyOn = (set: PracticeSet, day: string) => (set.planKey?.startsWith(`${day}:`) ? set.planKey.slice(day.length + 1) : undefined);

const SET_LINE: Record<SetKind, WeekLine["kind"]> = { daily: "daily", pick: "set", placement: "set", review: "review", check: "check", prep: "prep", feedback: "feedback" };

/** What was done on a day: finished sets, plan lines marked done, finished lessons. */
function doneOn(input: WeekInput, day: string): WeekLine[] {
  const lines = new Map<string, WeekLine>();
  const event = (id?: string) => (id ? input.events.find((e) => e.id === id) : undefined);
  const feedback = (id?: string) => (id ? input.feedback.find((f) => f.id === id) : undefined);

  for (const set of input.sets) {
    if (!set.finishedAt || localDate(set.finishedAt) !== day) continue;
    const planned = planKeyOn(set, day);
    const kind = planned && PLAN_KINDS.includes(planned.split(":")[0] as PlanKind) ? (planned.split(":")[0] as PlanKind) : SET_LINE[set.kind];
    const key = planned ?? `set:${set.id}`;
    if (lines.has(key)) continue;
    const several = set.kind === "prep" || set.kind === "feedback" || set.kind === "review";
    lines.set(key, {
      key,
      kind,
      status: "done",
      subject: set.subject,
      skillIds: several ? [...new Set(set.slots.map((s) => s.skillId))] : [set.skillId],
      event: event(set.eventId),
      feedback: kind === "feedback" ? feedback(planned?.split(":")[1]) : undefined,
      set: { id: set.id, kind: set.kind, topic: set.topic },
    });
  }

  for (const d of input.done) {
    if (d.date !== day || lines.has(d.key)) continue;
    const [prefix, ...rest] = d.key.split(":");
    const kind = PLAN_KINDS.includes(prefix as PlanKind) ? (prefix as PlanKind) : null;
    if (!kind) continue;
    const ref = rest.join(":");
    const lesson = kind === "lesson" ? input.lessonsDone.find((l) => `${l.courseId}:${l.lessonId}` === ref) : undefined;
    lines.set(d.key, {
      key: d.key,
      kind,
      status: "done",
      subject: kind === "daily" ? (ref as Subject) : undefined,
      skillIds: kind === "check" ? [ref] : [],
      event: kind === "due" || kind === "prep" ? event(ref) : undefined,
      feedback: kind === "feedback" ? feedback(ref) : undefined,
      lesson: lesson && { courseId: lesson.courseId, lessonId: lesson.lessonId, title: lesson.title, courseTitle: lesson.courseTitle },
    });
  }

  for (const l of input.lessonsDone) {
    const key = `lesson:${l.courseId}:${l.lessonId}`;
    if (localDate(l.at) !== day || lines.has(key)) continue;
    lines.set(key, { key, kind: "lesson", status: "done", skillIds: [], lesson: { courseId: l.courseId, lessonId: l.lessonId, title: l.title, courseTitle: l.courseTitle } });
  }

  return [...lines.values()].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

function answersOn(attempts: Attempt[], day: string): DayAnswers {
  const mine = attempts.filter((a) => a.mode !== "tutor" && localDate(a.at) === day);
  return {
    n: mine.length,
    own: mine.filter((a) => a.correct && !a.assisted).length,
    helped: mine.filter((a) => a.correct && a.assisted).length,
    missed: mine.filter((a) => !a.correct).length,
  };
}

/** Checks whose clock opens inside [from, to]: the engine's own status dates. */
const opening = (statuses: Record<string, SkillStatus>, from: number, to: number) =>
  Object.values(statuses).filter((s) => (s.state === "ready" || s.state === "checked" || s.state === "refresh") && s.checkOpensAt !== undefined && s.checkOpensAt >= from && s.checkOpensAt <= to);

const checkLine = (s: SkillStatus, opens = true): WeekLine => ({ key: `check:${s.skillId}`, kind: "check", status: "planned", skillIds: [s.skillId], minutes: 3, opens: opens || undefined });

function todayLines(input: WeekInput): WeekLine[] {
  const plan = planFor(input);
  const lines = [...plan.lead.map((i) => fromItem(i, i.done ? "done" : "todo", false)), ...plan.more.map((i) => fromItem(i, i.done ? "done" : "todo", true))];
  // A lesson finished today stays on the plan as done (as on Today).
  for (const l of lines)
    if (l.kind === "lesson" && l.lesson && input.lessonsDone.some((x) => x.courseId === l.lesson!.courseId && x.lessonId === l.lesson!.lessonId && localDate(x.at) === input.date)) l.status = "done";
  for (const x of doneOn(input, input.date)) if (!lines.some((l) => l.key === x.key)) lines.push(x);
  // A check that opens later today.
  for (const s of opening(input.statuses, input.now + 1, endOfDay(input.date))) if (!lines.some((l) => l.key === `check:${s.skillId}`)) lines.push(checkLine(s));
  return lines;
}

function projected(input: WeekInput, day: string): WeekLine[] {
  const lesson = "nextLesson" in input ? input.nextLesson : input.lesson;
  const plan = planFor({ ...input, date: day, now: endOfDay(day), done: [], lesson });
  const opensToday = new Set(opening(input.statuses, startOfDay(day), endOfDay(day)).map((s) => s.skillId));
  const lines = [...plan.lead.map((i) => fromItem(i, "planned", false)), ...plan.more.map((i) => fromItem(i, "planned", true))];
  for (const l of lines) if (l.kind === "check" && opensToday.has(l.skillIds[0])) l.opens = true;
  // Every check that opens this day is named, even past the plan's two-check cap.
  for (const id of opensToday) if (!lines.some((l) => l.key === `check:${id}`)) lines.push(checkLine(input.statuses[id]));
  return lines;
}

const onceKey = (l: WeekLine) => `${l.key}|${[...l.skillIds].sort().join(",")}`;

/**
 * The week from `from` for `days` days. `input.date`/`input.now` are today. Pure: same input, same week.
 */
export function planForWeek(input: WeekInput, from: string, days = 7): WeekDay[] {
  const out: WeekDay[] = [];
  const last = addDays(from, days - 1);
  // Lines still waiting (to do or planned) on an earlier day from today on; one-time ones aren't planned twice.
  const waiting = new Set<string>();
  const remember = (lines: WeekLine[]) => lines.forEach((l) => l.status !== "done" && ONCE.includes(l.kind) && waiting.add(onceKey(l)));
  const fresh = (lines: WeekLine[]) => lines.filter((l) => !(ONCE.includes(l.kind) && waiting.has(onceKey(l))));

  // Open checks past the plan's daily cap wait their turn: each coming day plans the next ones, as the
  // plan would once the earlier checks are taken.
  const queued = (lines: WeekLine[], day: string) => {
    const room = PLAN_RULES.maxChecks - lines.filter((l) => l.kind === "check").length;
    const next = checksOpen(input.statuses, endOfDay(day)).filter((s) => !waiting.has(onceKey(checkLine(s))) && !lines.some((l) => l.key === `check:${s.skillId}`));
    return room > 0 ? [...next.slice(0, room).map((s) => checkLine(s, false)), ...lines] : lines;
  };

  let cursor = input.date;
  if (from > input.date && daysBetween(input.date, from) > MAX_LOOKAHEAD) cursor = from;
  const byDay = new Map<string, WeekLine[]>();
  if (cursor === input.date && last >= input.date) {
    const lines = todayLines(input);
    remember(lines);
    byDay.set(input.date, lines);
    cursor = addDays(cursor, 1);
  }
  for (; cursor <= last; cursor = addDays(cursor, 1)) {
    const lines = queued(fresh(projected(input, cursor)), cursor);
    remember(lines);
    if (cursor >= from) byDay.set(cursor, lines);
  }

  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const when = date < input.date ? "past" : date === input.date ? "today" : "future";
    out.push({
      date,
      when,
      events: input.events.filter((e) => e.date === date).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "") || a.title.localeCompare(b.title)),
      lines: when === "past" ? doneOn(input, date) : (byDay.get(date) ?? []),
      answers: when === "future" ? { n: 0, own: 0, helped: 0, missed: 0 } : answersOn(input.attempts, date),
    });
  }
  return out;
}
