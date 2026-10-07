"use client";

import { useRouter } from "next/navigation";
import { relatedEntry } from "@/catalogue";
import { IconArrowRight } from "@/components/icons";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import { courseProgress } from "@/lib/activity";
import { addFromCatalogue, coursesOf } from "@/lib/courses";
import { useStore } from "@/lib/store";
import type { Course, Profile } from "@/lib/types";
import { CourseArt } from "./CourseArt";
import { LangTag } from "./LangTag";

/** For outline-only courses: the closest ready-made course, so there is always something to do now. */
export function Related({ course, learner }: { course: Course; learner: Profile }) {
  const t = useT();
  const router = useRouter();
  const mine = useStore((s) => coursesOf(s, learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const entry = relatedEntry(course.subject, course.grade, learner.locale);
  if (!entry) return null;
  const start = () => {
    const have = mine.find((c) => c.catalogueId === entry.id);
    const id = have?.id ?? addFromCatalogue(entry.id, learner.id);
    const lesson = (have && courseProgress(have, events).next) ?? entry.lessons[0];
    if (id) router.push(`/learn/${id}/${lesson.id}`);
  };
  return (
    <div className="rounded-md border border-border bg-panel p-4">
      <p className="text-xs font-semibold text-muted">{t("course.meanwhile")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="w-24 shrink-0">
          <CourseArt lessons={entry.lessons} subject={entry.subject} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            <span lang={entry.locale}>{entry.title}</span>
            <LangTag course={entry.locale} learner={learner.locale} />
          </p>
          <p className="mt-1 text-xs text-muted" lang={entry.locale}>
            {entry.summary}
          </p>
        </div>
        <Button size="sm" onClick={start}>
          {t("course.start")} <IconArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}
