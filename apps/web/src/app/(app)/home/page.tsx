"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bandOf, catalogueFor, type CatalogueEntry } from "@/catalogue";
import { CourseArt } from "@/components/courses/CourseArt";
import { CourseRow } from "@/components/courses/CourseRow";
import { LangTag } from "@/components/courses/LangTag";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowRight } from "@/components/icons";
import { MagicBox } from "@/components/magic-box/MagicBox";
import { ComingUp } from "@/components/today/ComingUp";
import { TodayPlan } from "@/components/today/TodayPlan";
import { Hear, HearContext, useHear } from "@/components/stage/hear";
import { Button, SubjectDot, btn } from "@/components/ui";
import { IconChat } from "@/components/icons";
import { goalsOf } from "@/lib/family";
import { useT } from "@/i18n";
import { courseProgress } from "@/lib/activity";
import { dayLabel } from "@/lib/format";
import { todayPlan } from "@/lib/plan";
import { addFromCatalogue, coursesOf } from "@/lib/courses";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { ActivityEvent, Course, Profile } from "@/lib/types";
import { localDate } from "@/planner/dates";
import { comingUp } from "@/planner/plan";

export default function HomePage() {
  return (
    <Guard need="learner">
      <Home />
    </Guard>
  );
}

function Home() {
  const t = useT();
  useTitle(t("nav.home"));
  const learner = useStore(currentLearner) as Profile;
  const [now] = useState(() => Date.now());
  const courses = useStore((s) => coursesOf(s, learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const plan = useStore((s) => todayPlan(s, learner, now));
  const school = useStore((s) => comingUp(s.events.filter((e) => e.profileId === learner.id), localDate(now)));
  const classes = useStore((s) => s.classes.filter((c) => c.profileId === learner.id));
  const young = bandOf(learner.grade) === "k2";
  const goals = useStore(goalsOf);
  const picks = catalogueFor(learner.grade, learner.locale).filter((c) => bandOf(c.grade) === bandOf(learner.grade));
  const ready = courses.filter((c) => c.status === "ready");
  const hasLesson = [...plan.lead, ...plan.more].some((i) => i.kind === "lesson");

  const greeting = (
    <header className="flex flex-wrap items-end gap-3">
      <div className="mr-auto">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("home.hello", { name: learner.nickname })}</h1>
        <p className="mt-1 text-sm text-muted">{dayLabel(now, learner.locale)}</p>
      </div>
      {!young && (
        <div className="flex flex-wrap gap-2">
          <Link href="/talk" className={btn(goals?.includes("help") ? "primary" : "secondary", "md")}>
            <IconChat size={16} /> {t("today.helpNow")}
          </Link>
          <Link href="/calendar?add=test" className={btn("secondary", "md")}>
            {t("today.testComing")}
          </Link>
        </div>
      )}
    </header>
  );

  if (young)
    return (
      <HearContext.Provider value={{ hear: true, young: true, locale: learner.locale }}>
        <div className="space-y-10">
          {greeting}
          <TodayPlan plan={plan} learner={learner} now={now} young />
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
          {school.length > 0 && <ComingUp events={school} classes={classes} locale={learner.locale} now={now} />}
          <section className="space-y-3">
            <p className="text-sm font-medium text-muted">{t("home.askGrownUp")}</p>
            <MagicBox learner={learner} />
          </section>
        </div>
      </HearContext.Provider>
    );

  const pick = hasLesson ? null : picks[0] ?? catalogueFor(learner.grade, learner.locale)[0];
  return (
    <div className="space-y-10">
      {greeting}
      {goals?.includes("organized") && <ComingUp events={school} classes={classes} locale={learner.locale} now={now} />}
      <TodayPlan plan={plan} learner={learner} now={now} young={false} />
      {!goals?.includes("organized") && <ComingUp events={school} classes={classes} locale={learner.locale} now={now} />}
      <section aria-labelledby="learn-new" className="space-y-3">
        <h2 id="learn-new" className="font-brand text-t2 font-semibold text-ink">
          {t("today.learnNew")}
        </h2>
        <MagicBox learner={learner} />
      </section>
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
  const { hear } = useHear();
  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => start(entry)}
        className="flex h-full w-full flex-col gap-3 rounded-lg border border-border bg-panel p-2.5 text-left shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift sm:p-3"
      >
        <CourseArt lessons={entry.lessons} subject={entry.subject} size="lg" />
        <span className={`flex items-start gap-2 px-1 font-brand font-semibold text-ink ${hear ? "pb-12 text-t3 sm:pb-1 sm:pr-12 sm:text-t2" : "pb-1 text-t3"}`} lang={entry.locale}>
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
