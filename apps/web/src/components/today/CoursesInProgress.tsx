"use client";

import Link from "next/link";
import { CourseArt } from "@/components/courses/CourseArt";
import { LangTag } from "@/components/courses/LangTag";
import { IconArrowRight } from "@/components/icons";
import { Badge, btn } from "@/components/ui";
import { useT } from "@/i18n";
import type { ContinuePoint } from "@/lib/continue";
import type { Course, Locale } from "@/lib/types";
import { BigHear } from "./BigHear";

const lessonHref = (p: ContinuePoint) => `/learn/${p.course.id}/${p.lesson.id}`;

/**
 * What a course is, said wherever it shows on Today: its language when it is not the reader's, a
 * grown-up's assignment, and what wrote it (AI, or the demo template) — never left off a picture tile.
 */
export function CourseTags({ course, locale, assigned = true }: { course: Course; locale: Locale; assigned?: boolean }) {
  const t = useT();
  return (
    <>
      <LangTag course={course.locale} learner={locale} />
      {assigned && course.assigned && <Badge tone="good">{t("course.fromGrownUp")}</Badge>}
      {course.ai ? <Badge>{t("gen.aiWritten")}</Badge> : course.template ? <Badge tone="warn">{t("gen.template")}</Badge> : null}
    </>
  );
}

/**
 * The first few points, plus every grown-up's assignment not begun yet, so an assignment is never pushed
 * off Today by older courses.
 */
export function shownPoints(points: ContinuePoint[], max: number) {
  return [...points.slice(0, max), ...points.slice(max).filter((p) => p.course.assigned && !p.started)];
}

/**
 * The learner's courses, each with where it picks up: Continue for one under way, Start for one not
 * begun. One tap opens that lesson. K–2 see picture tiles with read-aloud; a grown-up sees the same list
 * without anything to open on the child's behalf.
 */
export function CoursesInProgress({ points, locale, young, grownUp }: { points: ContinuePoint[]; locale: Locale; young: boolean; grownUp: boolean }) {
  const t = useT();
  if (!points.length) return null;
  const tiles = young && !grownUp;
  const shown = shownPoints(points, tiles ? 4 : 3);
  const heading = (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <h2 id="in-progress" className="font-brand text-t2 font-semibold text-ink">
          {t("home.yourCourses")}
        </h2>
        <BigHear text={t("home.yourCourses")} />
      </span>
      {!grownUp && (
        <Link href="/courses" className={`inline-flex items-center text-sm font-medium text-muted hover:text-accent ${tiles ? "min-h-14 px-2" : "min-h-11"}`}>
          {t("home.seeAll")}
        </Link>
      )}
    </div>
  );

  if (tiles)
    return (
      <section aria-labelledby="in-progress">
        {heading}
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {shown.map((p) => {
            const next = t("today.courseNext", { lesson: p.lesson.title });
            return (
              <li key={p.course.id} className="relative">
                <Link
                  href={lessonHref(p)}
                  className="flex h-full min-h-14 flex-col gap-3 rounded-lg border border-border bg-panel p-2.5 shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift sm:p-3"
                >
                  <CourseArt lessons={p.course.lessons} subject={p.course.subject} size="lg" />
                  <span className="min-w-0 break-words px-1 font-brand text-t3 font-semibold text-ink" lang={p.course.locale}>
                    {p.course.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 px-1 empty:hidden">
                    <CourseTags course={p.course} locale={locale} />
                  </span>
                  {/* Room for the 56px speaker: its own row on a phone, beside the text from `sm` up. */}
                  <span className="mt-auto min-w-0 break-words px-1 pb-16 text-sm text-muted sm:min-h-14 sm:pb-1 sm:pr-16">
                    {next}
                  </span>
                </Link>
                <span className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
                  <BigHear text={`${p.course.title}. ${next}`} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <section aria-labelledby="in-progress">
      {heading}
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-panel">
        {shown.map((p) => (
          <li key={p.course.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <CourseArt lessons={p.course.lessons} subject={p.course.subject} size="sm" />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
              <span className="min-w-0 flex-1 basis-40">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink" lang={p.course.locale}>
                    {p.course.title}
                  </span>
                  <CourseTags course={p.course} locale={locale} />
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {t("today.courseNext", { lesson: p.lesson.title })}
                </span>
                <span className="mt-0.5 block font-opmono text-xs tabular-nums text-muted">{t("courses.progress", { done: p.done, total: p.total })}</span>
              </span>
              {!grownUp && (
                <Link href={lessonHref(p)} className={btn("secondary")} aria-label={`${t(p.started ? "course.continue" : "course.start")}, ${p.course.title}`}>
                  {t(p.started ? "course.continue" : "course.start")} <IconArrowRight size={16} />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
