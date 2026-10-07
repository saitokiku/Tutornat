"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { bandOf, catalogueFor, type CatalogueEntry } from "@/catalogue";
import { CourseArt } from "@/components/courses/CourseArt";
import { CourseRow } from "@/components/courses/CourseRow";
import { LangTag } from "@/components/courses/LangTag";
import { Guard } from "@/components/gate";
import { IconArrowRight } from "@/components/icons";
import { MagicBox } from "@/components/magic-box/MagicBox";
import { Hear, HearContext } from "@/components/stage/hear";
import { Button, SubjectDot, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { continueTarget, courseProgress } from "@/lib/activity";
import { addFromCatalogue, coursesOf } from "@/lib/courses";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { ActivityEvent, Course, Profile } from "@/lib/types";

export default function HomePage() {
  return (
    <Guard need="learner">
      <Home />
    </Guard>
  );
}

function Home() {
  const t = useT();
  const learner = useStore(currentLearner) as Profile;
  const courses = useStore((s) => coursesOf(s, learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const next = continueTarget(courses, events);
  const young = bandOf(learner.grade) === "k2";
  const picks = catalogueFor(learner.grade, learner.locale).filter((c) => bandOf(c.grade) === bandOf(learner.grade));
  const ready = courses.filter((c) => c.status === "ready");

  const continueCard = next && (
    <section aria-labelledby="continue" className="rounded-lg border border-border bg-panel p-4 shadow-lift sm:p-5">
      <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="w-28 shrink-0 sm:w-36">
          <CourseArt lessons={next.course.lessons} subject={next.course.subject} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="continue" className="text-sm font-medium text-muted">
            {t("home.continue")}
          </h2>
          <p className="mt-1 truncate text-sm text-muted" lang={next.course.locale}>
            {next.course.title}
          </p>
          <p className="font-brand text-t2 font-semibold text-ink" lang={next.course.locale}>
            {next.lesson.title}
          </p>
          <p className="mt-1 font-opmono text-xs tabular-nums text-muted">
            {t("courses.progress", { done: next.progress.done, total: next.progress.total })} · {t("common.minutes", { n: next.lesson.minutes })}
          </p>
        </div>
        <Link href={`/learn/${next.course.id}/${next.lesson.id}`} className={btn("primary", "md", "w-full sm:w-auto")}>
          {t("home.continueCta")} <IconArrowRight size={16} />
        </Link>
      </div>
    </section>
  );

  if (young)
    return (
      <HearContext.Provider value={{ hear: true, young: true, locale: learner.locale }}>
        <div className="space-y-10">
          <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("home.hello", { name: learner.nickname })}</h1>
          {continueCard}
          <section aria-labelledby="pick" className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 id="pick" className="font-brand text-t2 font-semibold text-ink">
                {t("home.pick")}
              </h2>
              <Hear text={t("home.pick")} />
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {picks.map((entry) => (
                <PickTile key={entry.id} entry={entry} learner={learner} courses={courses} events={events} />
              ))}
            </ul>
          </section>
          <section className="space-y-3">
            <p className="text-sm font-medium text-muted">{t("home.askGrownUp")}</p>
            <MagicBox learner={learner} />
          </section>
        </div>
      </HearContext.Provider>
    );

  const pick = next ? null : picks[0] ?? catalogueFor(learner.grade, learner.locale)[0];
  return (
    <div className="space-y-10">
      <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("home.hello", { name: learner.nickname })}</h1>
      <MagicBox learner={learner} />
      {continueCard}
      {pick && <SuggestCard entry={pick} learner={learner} />}
      {ready.length > 0 && (
        <section aria-labelledby="mine">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="mine" className="font-brand text-t2 font-semibold text-ink">
              {t("home.yourCourses")}
            </h2>
            <Link href="/courses" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-accent">
              {t("home.seeAll")}
            </Link>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-panel">
            {ready.slice(0, 4).map((c) => (
              <CourseRow key={c.id} course={c} events={events} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Adds the ready-made course if needed and opens the lesson to do next. */
function useStartCourse(learner: Profile, courses: Course[], events: ActivityEvent[]) {
  const router = useRouter();
  return (entry: CatalogueEntry) => {
    const mine = courses.find((c) => c.catalogueId === entry.id);
    const id = mine?.id ?? addFromCatalogue(entry.id, learner.id);
    if (!id) return;
    const lesson = (mine && courseProgress(mine, events).next) ?? entry.lessons[0];
    router.push(`/learn/${id}/${lesson.id}`);
  };
}

function PickTile({ entry, learner, courses, events }: { entry: CatalogueEntry; learner: Profile; courses: Course[]; events: ActivityEvent[] }) {
  const start = useStartCourse(learner, courses, events);
  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => start(entry)}
        className="flex h-full w-full flex-col gap-3 rounded-lg border border-border bg-panel p-2.5 text-left shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift sm:p-3"
      >
        <CourseArt lessons={entry.lessons} subject={entry.subject} size="lg" />
        <span className="flex items-start gap-2 px-1 pb-12 font-brand text-t3 font-semibold text-ink sm:pb-1 sm:pr-12 sm:text-t2" lang={entry.locale}>
          <span className="mt-2"><SubjectDot subject={entry.subject} /></span>
          {entry.title}
        </span>
      </button>
      <span className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
        <Hear text={entry.title} />
      </span>
    </li>
  );
}

function SuggestCard({ entry, learner }: { entry: CatalogueEntry; learner: Profile }) {
  const t = useT();
  const courses = useStore((s) => coursesOf(s, learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const start = useStartCourse(learner, courses, events);
  return (
    <section aria-labelledby="suggest" className="rounded-lg border border-border bg-panel p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <div className="w-28 shrink-0 sm:w-36">
          <CourseArt lessons={entry.lessons} subject={entry.subject} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="suggest" className="text-sm font-medium text-muted">
            {t("home.startHere")}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 font-brand text-t2 font-semibold text-ink">
            <span lang={entry.locale}>{entry.title}</span>
            <LangTag course={entry.locale} learner={learner.locale} />
          </p>
          <p className="mt-1 text-sm text-muted" lang={entry.locale}>
            {entry.summary}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => start(entry)}>
          {t("home.startCta")} <IconArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}
