import type { Key } from "@/i18n/en";
import type { Course, Lesson, Widget } from "@/lib/types";

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

/** Does the lesson have anything to check (a quiz, or a manipulative with a target)? */
export const lessonHasChecks = (l: Lesson) => l.scenes.some((s) => s.kind === "quiz" || (s.kind === "interactive" && hasCheck(s.widget)));

/** Whole seconds since `start`, capped (a tab left open overnight is not two hours of learning). Event handlers only. */
export const secondsSince = (start: number, max: number) => Math.min(max, Math.max(0, Math.round((Date.now() - start) / 1000)));

/** The teaching act's ref for a lesson (contract: "<courseId>/<lessonId>"). */
export const lessonRef = (courseId: string, lessonId: string) => `${courseId}/${lessonId}`;
