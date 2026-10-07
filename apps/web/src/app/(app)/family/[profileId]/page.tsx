"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { NotFound } from "@/components/courses/NotFound";
import { ChildNotes } from "@/components/family/ChildNotes";
import { ChildSettings } from "@/components/family/ChildSettings";
import { CoachNote } from "@/components/family/CoachNote";
import { HowWeTeach } from "@/components/family/HowWeTeach";
import { IsItWorking } from "@/components/family/IsItWorking";
import { ReadingLog } from "@/components/family/ReadingLog";
import { Threads } from "@/components/family/Threads";
import { CourseRecord, DraftMark, ProvedList, SchoolResults } from "@/components/family/Verified";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowLeft, IconArrowRight, IconBook } from "@/components/icons";
import { statusLine } from "@/components/practice/status";
import { Avatar } from "@/components/profiles/Avatar";
import { ComingUp } from "@/components/today/ComingUp";
import { itemTitle } from "@/components/today/TodayPlan";
import { Button, SubjectDot, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { verifiedEducation } from "@/learning/profile";
import { scrubName } from "@/lib/ai/context";
import { subjectProgress, weekFacts } from "@/lib/family";
import { todayPlan } from "@/lib/plan";
import { statusesOf } from "@/lib/practice";
import { learnersOf, selectLearner } from "@/lib/profiles";
import { classesOf, resultsOf } from "@/lib/school";
import { useStore } from "@/lib/store";
import type { Profile, Subject } from "@/lib/types";
import { localDate } from "@/planner/dates";
import { comingUp } from "@/planner/plan";
import { getSkill, SKILLS } from "@/practice/skills";

export default function ChildPage() {
  return (
    <Guard need="parent">
      <Child />
    </Guard>
  );
}

const SUBJECTS: Subject[] = ["math", "english", "science"];

function Child() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { profileId } = useParams<{ profileId: string }>();
  const child = useStore((s) => learnersOf(s).find((p) => p.id === profileId));
  useTitle(child?.nickname ?? t("family.title"));
  const [now] = useState(() => Date.now());
  if (!child) return <NotFound />;
  return <ChildView child={child} now={now} locale={locale} onOpenAs={() => (selectLearner(child.id), router.push("/home"))} t={t} />;
}

function ChildView({ child, now, locale, onOpenAs, t }: { child: Profile; now: number; locale: Profile["locale"]; onOpenAs: () => void; t: ReturnType<typeof useT> }) {
  const facts = useStore((s) => weekFacts(s, child.id, now));
  const plan = useStore((s) => todayPlan(s, child, now));
  const statuses = useStore((s) => statusesOf(s, child.id, now));
  const school = useStore((s) => comingUp(s.events.filter((e) => e.profileId === child.id), localDate(now), 14));
  const classes = useStore((s) => classesOf(s, child.id));
  const verified = useStore((s) =>
    verifiedEducation({ statuses, activity: s.activity.filter((e) => e.profileId === child.id), courses: s.courses.filter((c) => c.profileId === child.id), results: resultsOf(s, child.id) }),
  );
  const items = [...plan.lead, ...plan.more];
  const next = items.find((i) => !i.done);
  const title = (id: string) => getSkill(id)?.title[child.locale] ?? id;
  const list = (ids: string[]) => ids.map(title).join(", ");

  return (
    <div className="space-y-10">
      <Link href="/family" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> {t("family.title")}
      </Link>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar profile={child} />
        <div className="min-w-0">
          <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{child.nickname}</h1>
          <p className="text-sm text-muted">{gradeLabel(locale, child.grade)}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={`/family/${child.id}/records`} className={btn("secondary")}>
            <IconBook size={16} /> {t("child.records")}
          </Link>
          <Button onClick={onOpenAs}>
            {t("family.openAs", { name: child.nickname })} <IconArrowRight size={16} />
          </Button>
        </div>
      </header>

      <section aria-labelledby="today" className="space-y-3">
        <h2 id="today" className="font-brand text-t2 font-semibold text-ink">
          {t("child.today")}
        </h2>
        <p className="text-sm text-ink">
          {t("plan.progress", { done: plan.doneCount, total: items.length })} · {t("plan.budget", { n: plan.budget })}
          {next && (
            <>
              {" · "}
              {t("child.nextUp", { what: itemTitle(next, child.locale) })}
            </>
          )}
        </p>
      </section>

      <section aria-labelledby="week" className="space-y-4">
        <h2 id="week" className="font-brand text-t2 font-semibold text-ink">
          {t("child.week")}
        </h2>
        {facts.own + facts.helped + facts.missed + facts.lessons + facts.readingMinutes === 0 ? (
          <p className="text-sm text-muted">{t("family.quiet")}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["child.minutesSpent", facts.minutes + facts.readingMinutes],
                ["growth.own", facts.own],
                ["growth.help", facts.helped],
                ["growth.missed", facts.missed],
              ] as const
            ).map(([k, n]) => (
              <div key={k} className="flex flex-col-reverse rounded-md border border-border bg-panel px-4 py-3">
                <dt className="text-xs text-muted">{t(k)}</dt>
                <dd className="font-opmono text-t1 font-semibold tabular-nums text-ink">{n}</dd>
              </div>
            ))}
          </dl>
        )}
        <ul className="space-y-2 text-sm">
          <Fact label={t("child.provedWeek")} value={facts.proved.length ? list(facts.proved) : t("child.none")} good={facts.proved.length > 0} />
          <Fact label={t("child.checksWaiting")} value={facts.checksWaiting.length ? list(facts.checksWaiting) : t("child.none")} />
          {facts.overdue.length > 0 && <Fact label={t("child.overdue")} value={list(facts.overdue)} warn />}
          {facts.stuck.length > 0 && <Fact label={t("child.stuck")} value={list(facts.stuck)} warn />}
          <Fact label={t("child.helpOn")} value={facts.helpOn.length ? list(facts.helpOn) : t("child.none")} />
        </ul>
        {/* School titles are free text and can carry the child's name; it never goes to a model. */}
        <CoachNote facts={facts} locale={child.locale} comingUp={school.map((e) => scrubName(`${e.title} (${e.date})`, child.nickname))} />
        <p className="text-xs text-muted">{t("child.honest")}</p>
      </section>

      <section aria-labelledby="skills" className="space-y-3">
        <h2 id="skills" className="font-brand text-t2 font-semibold text-ink">
          {t("child.skills")}
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
          {SUBJECTS.map((subject) => {
            const p = subjectProgress(statuses, subject, SKILLS);
            if (!p.total) return null;
            const working = Object.values(statuses).filter((x) => getSkill(x.skillId)?.subject === subject && x.state !== "proved" && x.state !== "new").slice(0, 3);
            return (
              <li key={subject} className="space-y-1 px-4 py-3.5 sm:px-5">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-ink">
                  <SubjectDot subject={subject} /> {t(`subject.${subject}`)}
                  <span className="ml-auto font-opmono text-xs tabular-nums text-muted">{t("child.progressLine", { proved: p.proved, checking: p.checking, practicing: p.practicing, total: p.total })}</span>
                </p>
                {working.map((w) => (
                  <p key={w.skillId} className="flex flex-wrap items-center gap-x-2 pl-5 text-xs text-muted">
                    <span>
                      {title(w.skillId)} · {statusLine(w, now, child.locale)}
                    </span>
                    <DraftMark skillId={w.skillId} />
                  </p>
                ))}
                <ProvedList proved={verified.proved.filter((x) => getSkill(x.skillId)?.subject === subject)} locale={child.locale} />
              </li>
            );
          })}
        </ul>
      </section>

      <CourseRecord id={`courses-${child.id}`} courses={verified.courses} />
      <ComingUp events={school} classes={classes} locale={child.locale} now={now} />
      <SchoolResults id={`school-${child.id}`} results={verified.school} />
      <HowWeTeach child={child} now={now} />
      <IsItWorking child={child} now={now} />
      <ChildNotes child={child} />
      <Threads child={child} />
      <ReadingLog child={child} now={now} />
      <ChildSettings child={child} />
    </div>
  );
}

function Fact({ label, value, good, warn }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${good ? "bg-good" : warn ? "bg-warn" : "bg-border"}`} />
      <span>
        <span className="font-medium text-ink">{label}: </span>
        <span className="text-ink">{value}</span>
      </span>
    </li>
  );
}
