import { courseProgress } from "./activity";
import { coursesOf } from "./courses";
import type { StoreState } from "./store";
import type { Course, Lesson } from "./types";

// Where each course picks up. Computed from the learner's courses and activity every time; nothing
// is stored, so it cannot drift from what actually happened.

export type ContinuePoint = {
  course: Course;
  /** The lesson to open: the first one started and not finished, else the first one not started. */
  lesson: Lesson;
  done: number;
  total: number;
  /** A lesson in it has been opened. */
  started: boolean;
  /** Latest activity on the course, or when it was added. */
  lastAt: number;
};

/**
 * Every ready course with a lesson still to do, each with its next lesson. Courses already begun come
 * first, most recently touched first; then ones not begun yet, a grown-up's assignments before the rest.
 * Finished courses and unfinished outlines are left out.
 */
export function continueTarget(s: StoreState, profileId: string): ContinuePoint[] {
  const events = s.activity.filter((e) => e.profileId === profileId);
  const out: ContinuePoint[] = [];
  for (const course of coursesOf(s, profileId)) {
    if (course.status !== "ready") continue;
    const mine = events.filter((e) => e.courseId === course.id);
    const p = courseProgress(course, mine);
    if (!p.next) continue;
    out.push({ course, lesson: p.next, done: p.done, total: p.total, started: p.started, lastAt: Math.max(course.createdAt, ...mine.map((e) => e.at)) });
  }
  const rank = (x: ContinuePoint) => (x.started ? 0 : x.course.assigned ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || b.lastAt - a.lastAt);
}
