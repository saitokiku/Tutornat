import { checksOpen, isSecure, nextSkill, reviewsDue, type Statuses } from "@/learning/engine";
import type { PracticeSet } from "@/learning/types";
import type { Grade, LearnerSettings, Subject } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { addDays, daysBetween } from "./dates";
import type { Feedback, PlanDone, SchoolEvent } from "./types";

// The day's plan, computed fresh every time from the record — never stored, so it cannot go stale.
// Order is the rule from the spec: open checks, school prep, school work due, teacher feedback, the
// daily set per subject, reviews, then the lesson in progress. The minutes budget decides what leads;
// the rest waits under "if you have more time". Nothing piles up: yesterday's undone work simply is
// still the next thing.

export type PlanKind = "check" | "prep" | "due" | "feedback" | "daily" | "review" | "lesson";

export type PlanItem = {
  /** Stable for the day; prefixed with the date when used as a set's planKey. */
  key: string;
  kind: PlanKind;
  minutes: number;
  subject?: Subject;
  skillIds: string[];
  event?: SchoolEvent;
  feedback?: Feedback;
  lesson?: { courseId: string; lessonId: string; title: string; courseTitle: string };
  /** Days until the school event, for prep and due work. */
  inDays?: number;
  done: boolean;
  /** A set already started for this line today. */
  setId?: string;
};

export type Plan = { date: string; lead: PlanItem[]; more: PlanItem[]; budget: number; leadMinutes: number; doneCount: number };

export type PlanInput = {
  date: string;
  now: number;
  grade: Grade;
  settings: LearnerSettings;
  statuses: Statuses;
  starts: Partial<Record<Subject, string>>;
  events: SchoolEvent[];
  feedback: Feedback[];
  /** This learner's sets (any day). */
  sets: PracticeSet[];
  done: PlanDone[];
  lesson?: PlanItem["lesson"] & { minutes: number };
};

const SUBJECT_ORDER: Subject[] = ["math", "english", "science", "other"];
const young = (g: Grade) => g === "K" || g === "1" || g === "2";

export const PLAN_RULES = { prepDays: 3, dueDays: 2, maxChecks: 2, feedbackDays: 14 };

export function planFor(input: PlanInput): Plan {
  const { date, now, grade, settings, statuses, starts } = input;
  const setMinutes = young(grade) ? 5 : 8;
  const items: PlanItem[] = [];
  const doneKeys = new Set(input.done.filter((d) => d.date === date).map((d) => d.key));
  const todaySets = input.sets.filter((s) => s.planKey?.startsWith(`${date}:`));
  const setFor = (key: string) => todaySets.find((s) => s.planKey === `${date}:${key}`);
  const add = (item: Omit<PlanItem, "done" | "setId">) => {
    const set = setFor(item.key);
    items.push({ ...item, setId: set?.id, done: doneKeys.has(item.key) || !!set?.finishedAt });
  };

  // 1. Checks that are open. They outrank new work; a check done today stays on the list as done.
  const checkedToday = todaySets.filter((s) => s.kind === "check").map((s) => s.skillId);
  const open = checksOpen(statuses, now).map((s) => s.skillId).filter((id) => !checkedToday.includes(id));
  for (const id of [...new Set([...checkedToday, ...open])].slice(0, PLAN_RULES.maxChecks))
    add({ key: `check:${id}`, kind: "check", minutes: 3, subject: getSkill(id)?.subject, skillIds: [id] });

  // 2. Test and quiz prep in the days before.
  const upcoming = [...input.events].filter((e) => !e.done).sort((a, b) => a.date.localeCompare(b.date));
  for (const e of upcoming) {
    const inDays = daysBetween(date, e.date);
    if ((e.kind === "test" || e.kind === "quiz") && inDays >= 1 && inDays <= PLAN_RULES.prepDays && e.skillIds.some(getSkill))
      add({ key: `prep:${e.id}`, kind: "prep", minutes: setMinutes, subject: getSkill(e.skillIds.find(getSkill)!)?.subject, skillIds: e.skillIds.filter(getSkill), event: e, inDays });
  }
  // 3. School work due soon (and a test or quiz that is today).
  for (const e of upcoming) {
    const inDays = daysBetween(date, e.date);
    if ((e.kind === "homework" || e.kind === "project" || ((e.kind === "test" || e.kind === "quiz") && inDays === 0)) && inDays >= 0 && inDays <= PLAN_RULES.dueDays)
      add({ key: `due:${e.id}`, kind: "due", minutes: e.kind === "project" ? 25 : 15, skillIds: e.skillIds, event: e, inDays });
  }

  // 4. Teacher feedback turned into practice (once per note).
  const usedFeedback = new Set(input.sets.filter((s) => s.kind === "feedback" && s.finishedAt).map((s) => s.planKey?.split(":feedback:")[1]));
  for (const f of input.feedback) {
    if (!f.skillIds.some(getSkill) || usedFeedback.has(f.id)) continue;
    if (now - f.at > PLAN_RULES.feedbackDays * 864e5) continue;
    add({ key: `feedback:${f.id}`, kind: "feedback", minutes: setMinutes, skillIds: f.skillIds.filter(getSkill), feedback: f });
  }

  // 5. The daily set for each subject: the next skill on its map.
  for (const subject of SUBJECT_ORDER.filter((s) => settings.subjects.includes(s))) {
    const already = setFor(`daily:${subject}`);
    const id = already?.skillId ?? nextSkill(subject, statuses, starts[subject]);
    if (id) add({ key: `daily:${subject}`, kind: "daily", minutes: setMinutes, subject, skillIds: [id] });
  }

  // 6. Reviews of proved skills that are due.
  const due = reviewsDue(statuses, now).map((s) => s.skillId);
  if (due.length || setFor("review")) add({ key: "review", kind: "review", minutes: 4, skillIds: setFor("review")?.slots.map((x) => x.skillId) ?? due.slice(0, 3) });

  // 7. The lesson in progress.
  if (input.lesson) add({ key: `lesson:${input.lesson.courseId}:${input.lesson.lessonId}`, kind: "lesson", minutes: input.lesson.minutes, lesson: input.lesson, skillIds: [] });

  // The budget decides what leads. The first undone item always leads, even over budget.
  const budget = settings.dailyMinutes;
  const lead: PlanItem[] = [];
  const more: PlanItem[] = [];
  let used = 0;
  for (const item of items) {
    if (used < budget || lead.length === 0) {
      lead.push(item);
      used += item.minutes;
    } else more.push(item);
  }
  return { date, lead, more, budget, leadMinutes: used, doneCount: items.filter((i) => i.done).length };
}

/** Upcoming school items for the next `days` days, for Today's "coming up" strip. */
export function comingUp(events: SchoolEvent[], date: string, days = 7) {
  const end = addDays(date, days);
  return events.filter((e) => !e.done && e.date >= date && e.date <= end).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

/** Skills linked to a school event that are not yet secure — what prep should focus on. */
export const prepFocus = (e: SchoolEvent, statuses: Statuses) => e.skillIds.filter((id) => getSkill(id) && !isSecure(statuses[id] ?? ({ state: "new" } as never)));
