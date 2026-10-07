"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { catalogueFor } from "@/catalogue";
import { CourseRow } from "@/components/courses/CourseRow";
import { Guard } from "@/components/gate";
import { IconArrowRight } from "@/components/icons";
import { MagicBox } from "@/components/magic-box/MagicBox";
import { Button, SubjectDot, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { continueTarget } from "@/lib/activity";
import { addFromCatalogue, coursesOf } from "@/lib/courses";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function HomePage() {
  return (
    <Guard need="learner">
      <Home />
    </Guard>
  );
}

function Home() {
  const t = useT();
  const router = useRouter();
  const learner = useStore(currentLearner) as Profile;
  const courses = useStore((s) => coursesOf(s, learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const next = continueTarget(courses, events);
  const pick = next ? null : catalogueFor(learner.grade, learner.locale)[0];
  const ready = courses.filter((c) => c.status === "ready");

  return (
    <div className="space-y-10">
      <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("home.hello", { name: learner.nickname })}</h1>

      <MagicBox learner={learner} />

      {next && (
        <section aria-labelledby="continue" className="rounded-lg border border-border bg-panel p-5 shadow-lift sm:p-6">
          <h2 id="continue" className="text-sm font-medium text-muted">
            {t("home.continue")}
          </h2>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-muted">
                <SubjectDot subject={next.course.subject} />
                <span className="truncate">{next.course.title}</span>
              </p>
              <p className="mt-1 font-brand text-t2 font-semibold text-ink">{next.lesson.title}</p>
              <p className="mt-1 font-opmono text-xs tabular-nums text-muted">
                {t("courses.progress", { done: next.progress.done, total: next.progress.total })} · {t("common.minutes", { n: next.lesson.minutes })}
              </p>
            </div>
            <Link href={`/learn/${next.course.id}/${next.lesson.id}`} className={btn("primary")}>
              {t("home.continueCta")} <IconArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {pick && (
        <section aria-labelledby="pick" className="rounded-lg border border-border bg-panel p-5 shadow-lift sm:p-6">
          <h2 id="pick" className="text-sm font-medium text-muted">
            {t("home.startHere")}
          </h2>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 max-w-prose">
              <p className="flex items-center gap-2 font-brand text-t2 font-semibold text-ink">
                <SubjectDot subject={pick.subject} />
                {pick.title}
              </p>
              <p className="mt-1 text-sm text-muted">{pick.summary}</p>
            </div>
            <Button
              onClick={() => {
                const id = addFromCatalogue(pick.id, learner.id);
                if (id) router.push(`/learn/${id}/${pick.lessons[0].id}`);
              }}
            >
              {t("home.startCta")} <IconArrowRight size={16} />
            </Button>
          </div>
        </section>
      )}

      {ready.length > 0 && (
        <section aria-labelledby="mine">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="mine" className="font-brand text-t2 font-semibold text-ink">
              {t("home.yourCourses")}
            </h2>
            <Link href="/courses" className="text-sm font-medium text-muted hover:text-accent">
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
