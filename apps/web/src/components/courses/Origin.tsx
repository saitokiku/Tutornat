"use client";

import { Badge } from "@/components/ui";
import { useT, type Key } from "@/i18n";
import { courseOrigin } from "@/lib/courses";
import { SOURCE } from "@/lib/source-course";
import type { Course } from "@/lib/types";

/** The words for where a course came from. Every course shows one of these wherever it is listed. */
export function originKey(course: Pick<Course, "origin" | "ai" | "citations">): Key {
  switch (courseOrigin(course)) {
    case "people":
      return "crs.origin.people";
    case "ai":
      return "gen.aiWritten";
    case "template":
      return "gen.template";
    case "sources":
      return course.citations?.some((c) => c.source === SOURCE.wikipedia) ? "crs.origin.sources" : "crs.origin.sourcesNoWiki";
  }
}

/** Written by people · Built from Wikipedia and real sources · Written by AI · Template outline. */
export function OriginBadge({ course }: { course: Pick<Course, "origin" | "ai" | "citations"> }) {
  const t = useT();
  const origin = courseOrigin(course);
  return <Badge tone={origin === "template" ? "warn" : "muted"}>{t(originKey(course))}</Badge>;
}
