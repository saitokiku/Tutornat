import type { Key } from "@/i18n/en";
import type { Course, Lesson, Scene, Widget } from "@/lib/types";

// Small facts about a course and lesson that the stage shows or acts on.

export type Origin = "ai" | "sources" | "people" | "template";

/**
 * Where a course came from, always said: written by AI (passed the gates), built from real sources
 * without AI (cited), written by people (the ready-made catalogue), or a demo template outline.
 */
export function courseOrigin(course: Pick<Course, "ai" | "citations" | "origin" | "template">): Origin | null {
  if (course.ai) return "ai";
  if (course.citations?.length) return "sources";
  if (course.origin === "catalogue") return "people";
  if (course.template) return "template";
  return null;
}

export const ORIGIN_KEY: Record<Origin, Key> = {
  ai: "gen.aiWritten",
  sources: "stg.origin.sources",
  people: "stg.origin.people",
  template: "gen.template",
};

/**
 * Ready-made scenes written by AI and not yet checked by a teacher ("<catalogueId>/<lessonId>/<sceneId>").
 * The stage says so on each of them; a teacher's review takes a scene off this list.
 */
export const AWAITING_REVIEW: readonly string[] = [
  "english-story-order/my-story/s6",
  "math-add-number-line/jump-to-ten/s7",
  "math-fractions/thirds-sixths-eighths/s7",
  "math-negative/coordinate-plane/s7",
  "math-slope/tables-equations/s7",
  "science-moon/eight-phases/s4",
  "science-moon/moon-in-daytime/s7",
];

/** Is this scene one of the ready-made ones still waiting for a teacher's review? */
export const awaitingReview = (course: Pick<Course, "origin" | "catalogueId">, lessonId: string, sceneId: string) =>
  course.origin === "catalogue" && !!course.catalogueId && AWAITING_REVIEW.includes(`${course.catalogueId}/${lessonId}/${sceneId}`);

/** A widget that can say right or not yet. Without a target it is for exploring only. */
export function hasCheck(w: Widget) {
  switch (w.kind) {
    case "fraction-bar":
    case "number-line":
    case "states-of-matter":
    case "moon-phases":
    case "area-model":
    case "clock":
      return w.target !== undefined;
    default:
      return true;
  }
}

/** The checks a scene holds, by id: each quiz question, or the scene itself for a manipulative with a target. */
export const checkIds = (s: Scene): string[] =>
  s.kind === "quiz" ? s.questions.map((q) => `${s.id}:${q.id}`) : s.kind === "interactive" && hasCheck(s.widget) ? [s.id] : [];

/** Does the lesson have anything to check (a quiz, or a manipulative with a target)? */
export const lessonHasChecks = (l: Lesson) => l.scenes.some((s) => checkIds(s).length > 0);

/** How one check ended up: right the first time with no help, right after help or a miss, or not right yet. */
export type CheckResult = "own" | "help" | "missed";
export type Tally = Record<CheckResult | "untried", number>;

/**
 * A check's standing after an answer. The first right answer settles it (on their own, or helped if a
 * hint, an explanation, the tutor or an earlier miss came first); a miss stands until it is put right.
 */
export function settle(prev: CheckResult | undefined, correct: boolean, helped: boolean): CheckResult {
  if (prev === "own" || prev === "help") return prev;
  if (correct) return helped || prev === "missed" ? "help" : "own";
  return "missed";
}

/** The finish's count: every check in the lesson once, by how it ended; one never answered is "untried". */
export function tallyOf(lesson: Lesson, results: Readonly<Record<string, CheckResult>>): Tally {
  const out: Tally = { own: 0, help: 0, missed: 0, untried: 0 };
  for (const id of lesson.scenes.flatMap(checkIds)) out[results[id] ?? "untried"]++;
  return out;
}

/** Whole seconds since `start`, capped (a tab left open overnight is not two hours of learning). Event handlers only. */
export const secondsSince = (start: number, max: number) => Math.min(max, Math.max(0, Math.round((Date.now() - start) / 1000)));

/** The teaching act's ref for a lesson (contract: "<courseId>/<lessonId>"). */
export const lessonRef = (courseId: string, lessonId: string) => `${courseId}/${lessonId}`;
