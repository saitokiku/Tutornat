import type { Grade, Lesson, Locale, Subject } from "@/lib/types";

/** A hand-written starter course. Added to a learner as a Course (origin: "catalogue"). */
export type CatalogueEntry = {
  id: string;
  title: string;
  summary: string;
  subject: Subject;
  grade: Grade;
  locale: Locale;
  lessons: Lesson[];
  /** Skills on the map that fit each lesson (lesson id → skill ids), offered to practice on the course page. */
  practice?: Record<string, string[]>;
};
