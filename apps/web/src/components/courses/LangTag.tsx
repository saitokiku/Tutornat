"use client";

import { Badge } from "@/components/ui";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import type { Locale, Subject } from "@/lib/types";

/** Shown when a course is in a different language from the learner's. */
export function LangTag({ course, learner }: { course: Locale; learner: Locale }) {
  const t = useT();
  if (course === learner) return null;
  return <Badge tone="accent">{t(course === "en" ? "course.inEnglish" : "course.inSpanish")}</Badge>;
}

/**
 * The subject a course is filed under, named by the language it teaches in: an "english" course
 * written in Spanish (Rimas y sílabas) teaches Spanish reading and writing, so it is "Lengua", not "Inglés".
 */
export const subjectKey = (subject: Subject, lang: Locale): Key => (subject === "english" && lang === "es" ? "course.spanishArts" : `subject.${subject}`);
