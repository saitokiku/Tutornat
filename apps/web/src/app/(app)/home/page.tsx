"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { bandOf, catalogueFor } from "@/catalogue";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowRight, IconChat, IconClock } from "@/components/icons";
import { MagicBox } from "@/components/magic-box/MagicBox";
import { Avatar } from "@/components/profiles/Avatar";
import { Hear, HearContext } from "@/components/stage/hear";
import { ComingUp } from "@/components/today/ComingUp";
import { CoursesInProgress } from "@/components/today/CoursesInProgress";
import { PickTiles, SuggestCard } from "@/components/today/Picks";
import { StatusStrip } from "@/components/today/StatusStrip";
import { TodayPlan, usePlanStart } from "@/components/today/TodayPlan";
import { EmptyState, btn, Button } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import { continueTarget } from "@/lib/continue";
import { goalsOf } from "@/lib/family";
import { dayLabel } from "@/lib/format";
import { logPlanLines, planRef, todayPlan, todayStatus, todayViewer } from "@/lib/plan";
import { learnersOf, selectLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { localDate } from "@/planner/dates";
import { comingUp } from "@/planner/plan";

export default function HomePage() {
  return (
    <Guard need="selected">
      <Home />
    </Guard>
  );
}

/** A learner sees their own Today; a grown-up (parent session) sees one child's, read-only. */
function Home() {
  const t = useT();
  const params = useSearchParams();
  const viewer = useStore((s) => todayViewer(s, params.get("learner")));
  if (!viewer)
    return (
      <EmptyState
        title={t("family.empty")}
        action={
          <Link href="/profiles" className={btn("secondary")}>
            {t("profiles.add")}
          </Link>
        }
      />
    );
  return <Today key={viewer.learner.id} learner={viewer.learner} grownUp={viewer.grownUp} />;
}

function Today({ learner, grownUp }: { learner: Profile; grownUp: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const plan = useStore((s) => todayPlan(s, learner, now));
  const status = useStore((s) => todayStatus(s, learner, now));
  const points = useStore((s) => continueTarget(s, learner.id));
  const school = useStore((s) => comingUp(s.events.filter((e) => e.profileId === learner.id), localDate(now)));
  const classes = useStore((s) => s.classes.filter((c) => c.profileId === learner.id));
  const goals = useStore(goalsOf);
  const start = usePlanStart(learner, plan.date);
  const young = bandOf(learner.grade) === "k2";
  const tiles = young && !grownUp;
  const hello = grownUp ? t("today.forChild", { name: learner.nickname }) : t("home.hello", { name: learner.nickname });
  const date = dayLabel(now, locale);
  useTitle(grownUp ? hello : t("nav.home"));

  // Teaching acts: the lead lines the learner was shown today, once each. Never for a grown-up's look.
  const refs = plan.lead.map((i) => planRef(plan.date, i.key)).join("\n");
  useEffect(() => {
    if (!grownUp && refs) logPlanLines(learner.id, refs.split("\n"));
  }, [grownUp, learner.id, refs]);

  const timeUp = status.used >= status.budget;
  const checkLine = [...plan.lead, ...plan.more].find((i) => i.kind === "check" && !i.done);
  const strip = (
    <StatusStrip
      status={status}
      learnerId={learner.id}
      young={young}
      grownUp={grownUp}
      onStartCheck={grownUp ? undefined : () => (checkLine ? start(checkLine) : router.push("/practice"))}
    />
  );
  const planView = <TodayPlan plan={plan} learner={learner} now={now} young={young} grownUp={grownUp} timeUp={timeUp} />;
  const coming = <ComingUp events={school} classes={classes} locale={locale} now={now} times={!tiles} />;
  const courses = <CoursesInProgress points={points} locale={locale} young={young} grownUp={grownUp} />;

  if (grownUp) return <GrownUpToday learner={learner} hello={hello} date={date} strip={strip} plan={planView} coming={coming} courses={courses} />;

  const inProgress = new Set(points.map((p) => p.course.catalogueId));
  const band = catalogueFor(learner.grade, learner.locale).filter((c) => bandOf(c.grade) === bandOf(learner.grade));

  if (tiles)
    return (
      <HearContext.Provider value={{ hear: true, young: true, locale: learner.locale }}>
        <div className="space-y-10">
          <header className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{hello}</h1>
                <p className="mt-1 text-sm text-muted">{date}</p>
              </div>
              {/* Read aloud without the name: speech voices can be a network service. */}
              <Hear text={t("today.helloSay", { date })} />
            </div>
            {/* Little ones are offered the tutor first; it speaks first in Talk. */}
            <div className="flex items-center gap-3">
              <Link href="/talk" className={btn("secondary", "md", "min-h-14 px-6 text-base")}>
                <IconChat size={20} /> {t("talk.title")}
              </Link>
              <Hear text={t("talk.title")} />
            </div>
            {strip}
          </header>
          {planView}
          {courses}
          <PickTiles entries={band.filter((c) => !inProgress.has(c.id))} learner={learner} />
          {school.length > 0 && coming}
          <section aria-labelledby="grown-ups" className="space-y-3 border-t border-border pt-6">
            <h2 id="grown-ups" className="text-sm font-medium text-muted">
              {t("home.askGrownUp")}
            </h2>
            <MagicBox learner={learner} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-sm text-muted">{t("today.k2.budget", { name: learner.nickname, n: status.budget })}</p>
              <Link href="/calendar?add=test" className={btn("ghost", "md", "-ml-3 sm:ml-0")}>
                <IconClock size={16} /> {t("today.k2.addSchool")}
              </Link>
            </div>
          </section>
        </div>
      </HearContext.Provider>
    );

  const hasLesson = [...plan.lead, ...plan.more].some((i) => i.kind === "lesson");
  const pick = points.length || hasLesson ? null : (band[0] ?? catalogueFor(learner.grade, learner.locale)[0]);
  const organized = goals?.includes("organized");
  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{hello}</h1>
            <p className="mt-1 text-sm text-muted">{date}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/talk" className={btn("secondary")}>
              <IconChat size={16} /> {t("today.helpNow")}
            </Link>
            <Link href="/calendar?add=test" className={btn("secondary")}>
              {t("today.testComing")}
            </Link>
          </div>
        </div>
        {strip}
      </header>
      {organized && coming}
      {planView}
      {!organized && coming}
      {courses}
      {pick && <SuggestCard entry={pick} learner={learner} />}
      <section aria-labelledby="learn-new" className="space-y-3">
        <h2 id="learn-new" className="font-brand text-t2 font-semibold text-ink">
          {t("today.learnNew")}
        </h2>
        <MagicBox learner={learner} />
      </section>
    </div>
  );
}

/** A grown-up looking at one child's Today: the same plan and status, a way to their page, and a hand-over. */
function GrownUpToday({ learner, hello, date, strip, plan, coming, courses }: { learner: Profile; hello: string; date: string; strip: ReactNode; plan: ReactNode; coming: ReactNode; courses: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const kids = useStore(learnersOf);
  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar profile={learner} size="sm" />
          <div className="mr-auto min-w-0">
            <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{hello}</h1>
            <p className="mt-1 text-sm text-muted">{date}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/family/${learner.id}`} className={btn("secondary")}>
              {t("family.details", { name: learner.nickname })}
            </Link>
            <Button onClick={() => (selectLearner(learner.id), router.replace("/home"))}>
              {t("today.handOver", { name: learner.nickname })} <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
        {kids.length > 1 && (
          <div role="group" aria-label={t("growth.viewing")} className="flex flex-wrap gap-2">
            {kids.map((k) => (
              <button key={k.id} type="button" aria-pressed={k.id === learner.id} onClick={() => router.replace(`/home?learner=${k.id}`)} className="k-chip min-h-11 px-4">
                {k.nickname}
              </button>
            ))}
          </div>
        )}
        {strip}
      </header>
      {plan}
      {coming}
      {courses}
    </div>
  );
}
