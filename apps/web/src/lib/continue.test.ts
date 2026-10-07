import { afterEach, describe, expect, it } from "vitest";
import { continueTarget } from "./continue";
import { read, resetMemory, update } from "./store";
import type { ActivityEvent, Course, Lesson } from "./types";

afterEach(() => resetMemory());

const lesson = (id: string): Lesson => ({ id, title: `Lesson ${id}`, summary: "", minutes: 8, scenes: [] });
const course = (o: Partial<Course> & { id: string }): Course => ({
  profileId: "p1",
  title: `Course ${o.id}`,
  goal: "",
  subject: "math",
  grade: "4",
  locale: "en",
  origin: "catalogue",
  status: "ready",
  length: "short",
  sources: [],
  lessons: [lesson("a"), lesson("b"), lesson("c")],
  template: false,
  createdAt: 1000,
  updatedAt: 1000,
  ...o,
});
let n = 0;
const ev = (courseId: string, type: ActivityEvent["type"], lessonId: string | undefined, at: number, profileId = "p1"): ActivityEvent => ({ id: `e${n++}`, profileId, at, type, courseId, lessonId });

function seed(courses: Course[], activity: ActivityEvent[]) {
  update((s) => {
    s.courses = courses;
    s.activity = activity;
  });
}

describe("continueTarget", () => {
  it("gives each unfinished course its next lesson: the one started, else the first not started", () => {
    seed(
      [course({ id: "c1" }), course({ id: "c2" })],
      [
        ev("c1", "lesson_started", "a", 2000),
        ev("c1", "lesson_completed", "a", 2100),
        ev("c2", "lesson_started", "a", 3000),
        ev("c2", "lesson_completed", "a", 3100),
        ev("c2", "lesson_started", "c", 3200),
      ],
    );
    const points = continueTarget(read(), "p1");
    expect(points.map((p) => [p.course.id, p.lesson.id, p.done, p.total])).toEqual([
      ["c2", "c", 1, 3],
      ["c1", "b", 1, 3],
    ]);
  });

  it("leaves out finished courses, unfinished outlines and other learners' courses", () => {
    seed(
      [
        course({ id: "done", lessons: [lesson("a")] }),
        course({ id: "draft", status: "outlining" }),
        course({ id: "theirs", profileId: "p2" }),
        course({ id: "empty", lessons: [] }),
        course({ id: "mine" }),
      ],
      [ev("done", "lesson_completed", "a", 2000), ev("theirs", "lesson_started", "a", 2000, "p2")],
    );
    expect(continueTarget(read(), "p1").map((p) => p.course.id)).toEqual(["mine"]);
  });

  it("puts courses begun and a grown-up's assignments first, most recent first, then the rest", () => {
    seed(
      [
        course({ id: "new", createdAt: 9000 }),
        course({ id: "assigned", assigned: true, createdAt: 5000 }),
        course({ id: "old-start", createdAt: 100 }),
        course({ id: "recent-start", createdAt: 100 }),
      ],
      [ev("old-start", "lesson_started", "a", 1000), ev("recent-start", "lesson_started", "b", 8000)],
    );
    const points = continueTarget(read(), "p1");
    // The assignment (5000) came after the learner last touched old-start (1000), so it sits above it.
    expect(points.map((p) => p.course.id)).toEqual(["recent-start", "assigned", "old-start", "new"]);
    expect(points.map((p) => p.started)).toEqual([true, false, true, false]);
    expect(points[0]).toMatchObject({ lesson: { id: "b" }, lastAt: 8000 });
  });

  it("leads with a fresh assignment over three courses begun weeks ago, until the learner goes back to one", () => {
    const week = 7 * 864e5;
    const started = ["c1", "c2", "c3"].map((id, i) => course({ id, createdAt: 1000 + i }));
    seed(
      [...started, course({ id: "today", assigned: true, createdAt: 3 * week })],
      started.map((c, i) => ev(c.id, "lesson_started", "a", week + i)),
    );
    expect(continueTarget(read(), "p1").map((p) => p.course.id)).toEqual(["today", "c3", "c2", "c1"]);
    update((s) => void s.activity.push(ev("c1", "lesson_completed", "a", 3 * week + 10)));
    expect(continueTarget(read(), "p1").map((p) => p.course.id)).toEqual(["c1", "today", "c3", "c2"]);
  });

  it("offers courses not begun in the learner's path order, then by date added", () => {
    seed(
      [
        course({ id: "b-later", createdAt: 3000 }),
        course({ id: "a-earlier", createdAt: 2000 }),
        course({ id: "moved-up", createdAt: 9000, order: 0 }),
        course({ id: "second", createdAt: 1000, order: 1 }),
      ],
      [],
    );
    expect(continueTarget(read(), "p1").map((p) => p.course.id)).toEqual(["moved-up", "second", "a-earlier", "b-later"]);
  });

  it("is empty for a learner with no courses", () => {
    expect(continueTarget(read(), "p1")).toEqual([]);
  });
});
