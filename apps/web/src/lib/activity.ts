import { newId, update } from "./store";
import type { ActivityEvent, Course, Lesson } from "./types";

// Activity is a record of what happened. Nothing here computes mastery: completion and correct answers
// stay separate from "with a hint", and none of it is turned into a score.

export function record(e: Omit<ActivityEvent, "id" | "at">) {
  update((s) => void s.activity.push({ ...e, id: newId(), at: Date.now() }));
}

export function lessonState(events: ActivityEvent[], courseId: string, lessonId: string): "done" | "started" | "new" {
  const mine = events.filter((e) => e.courseId === courseId && e.lessonId === lessonId);
  if (mine.some((e) => e.type === "lesson_completed")) return "done";
  return mine.length ? "started" : "new";
}

export function courseProgress(course: Course, events: ActivityEvent[]) {
  const states = course.lessons.map((l) => lessonState(events, course.id, l.id));
  const done = states.filter((s) => s === "done").length;
  const next: Lesson | null = course.lessons.find((_, i) => states[i] === "started") ?? course.lessons.find((_, i) => states[i] === "new") ?? null;
  return { done, total: course.lessons.length, next, started: states.some((s) => s !== "new") };
}

const DAY = 24 * 60 * 60 * 1000;

/** Monday 00:00 local time of the week containing `at`. */
export function startOfWeek(at: number) {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export function inWeek(events: ActivityEvent[], weekStart: number) {
  // ponytail: 7×24h window; off by an hour across a DST change, fine for a weekly summary.
  return events.filter((e) => e.at >= weekStart && e.at < weekStart + 7 * DAY);
}

export function summarizeWeek(events: ActivityEvent[], weekStart: number) {
  const week = inWeek(events, weekStart);
  const quiz = week.filter((e) => e.type === "quiz_answered");
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = weekStart + i * DAY;
    return { day, events: week.filter((e) => e.at >= day && e.at < day + DAY).sort((a, b) => b.at - a.at) };
  });
  return {
    started: week.filter((e) => e.type === "lesson_started").length,
    finished: week.filter((e) => e.type === "lesson_completed").length,
    own: quiz.filter((e) => e.correct && !e.assisted).length,
    help: quiz.filter((e) => e.correct && e.assisted).length,
    missed: quiz.filter((e) => !e.correct).length,
    minutes: Math.ceil(week.reduce((n, e) => n + (e.type === "lesson_completed" ? (e.seconds ?? 0) : 0), 0) / 60),
    days,
  };
}

/** Lessons this week where a check was missed or needed a hint, most recent first. */
export function neededHelp(events: ActivityEvent[], weekStart: number) {
  const seen = new Set<string>();
  return inWeek(events, weekStart)
    .filter((e) => e.type === "quiz_answered" && (!e.correct || e.assisted))
    .sort((a, b) => b.at - a.at)
    .filter((e) => {
      const key = `${e.courseId}:${e.lessonId}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
}

export function findLesson(courses: Course[], courseId: string, lessonId?: string) {
  const course = courses.find((c) => c.id === courseId);
  return { course, lesson: course?.lessons.find((l) => l.id === lessonId) };
}

/** Where to pick up: the course touched most recently that still has a lesson to do. */
export function continueTarget(courses: Course[], events: ActivityEvent[]) {
  const ready = courses.filter((c) => c.status === "ready");
  const lastTouch = (c: Course) => Math.max(c.updatedAt, ...events.filter((e) => e.courseId === c.id).map((e) => e.at));
  for (const course of [...ready].sort((a, b) => lastTouch(b) - lastTouch(a))) {
    const p = courseProgress(course, events);
    if (p.next) return { course, lesson: p.next, progress: p };
  }
  return null;
}
