"use client";

import Link from "next/link";
import { IconChevronRight } from "@/components/icons";
import { Badge } from "@/components/ui";
import { CourseArt } from "./CourseArt";
import { useLocale, useT } from "@/i18n";
import { LangTag } from "./LangTag";
import { courseProgress } from "@/lib/activity";
import type { ActivityEvent, Course } from "@/lib/types";

export function CourseRow({ course, events }: { course: Course; events: ActivityEvent[] }) {
  const t = useT();
  const locale = useLocale();
  const p = courseProgress(course, events);
  return (
    <li>
      <Link href={`/courses/${course.id}`} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-panel2/60 sm:px-5">
        <CourseArt lessons={course.lessons} subject={course.subject} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{course.title}</span>
          <span className="mt-0.5 block font-opmono text-xs tabular-nums text-muted">{t("courses.progress", { done: p.done, total: p.total })}</span>
        </span>
        <LangTag course={course.locale} learner={locale} />
        {course.assigned && <Badge tone="good">{t("course.fromGrownUp")}</Badge>}
        {course.status === "outlining" ? (
          <Badge tone="warn">{t("course.unfinishedOutline")}</Badge>
        ) : course.origin === "catalogue" ? (
          <Badge>{t("course.readyMade")}</Badge>
        ) : course.template ? (
          <Badge tone="warn">{t("gen.template")}</Badge>
        ) : course.ai ? (
          <Badge>{t("gen.aiWritten")}</Badge>
        ) : null}
        <IconChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}
