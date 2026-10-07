"use client";

import { Badge } from "@/components/ui";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";

/** Shown when a course is in a different language from the learner's. */
export function LangTag({ course, learner }: { course: Locale; learner: Locale }) {
  const t = useT();
  if (course === learner) return null;
  return <Badge tone="accent">{t(course === "en" ? "course.inEnglish" : "course.inSpanish")}</Badge>;
}
