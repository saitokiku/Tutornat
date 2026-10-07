import { localDate } from "@/planner/dates";
import { planFor, type PlanItem } from "@/planner/plan";
import { continueTarget, lessonState } from "./activity";
import { coursesOf } from "./courses";
import { settingsOf, startOf, startSet, statusesOf } from "./practice";
import { update, type StoreState } from "./store";
import type { Profile, Subject } from "./types";

// Today's plan for one learner, from the store. Screens call these; the rules live in planner/plan.ts.

const SUBJECTS: Subject[] = ["math", "english", "science", "other"];

export function todayPlan(s: StoreState, p: Profile, now: number) {
  const date = localDate(now);
  const courses = coursesOf(s, p.id);
  const events = s.activity.filter((e) => e.profileId === p.id);
  const next = continueTarget(courses, events);
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
  const plan = planFor({
    date,
    now,
    grade: p.grade,
    settings: settingsOf(p),
    statuses: statusesOf(s, p.id, now),
    starts: Object.fromEntries(SUBJECTS.map((x) => [x, startOf(p, x)])),
    events: s.events.filter((e) => e.profileId === p.id),
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
  const planKey = `${date}:${item.key}`;
  const kind = item.kind === "check" ? "check" : item.kind === "prep" ? "prep" : item.kind === "feedback" ? "feedback" : item.kind === "review" ? "review" : "daily";
  if (item.kind === "due" || item.kind === "lesson") return null;
  return startSet(s, { profile: p, kind, skillIds: item.skillIds, planKey, eventId: item.event?.id, now });
}
