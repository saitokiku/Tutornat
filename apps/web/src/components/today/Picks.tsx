"use client";

import { useRouter } from "next/navigation";
import type { CatalogueEntry } from "@/catalogue";
import { CourseArt } from "@/components/courses/CourseArt";
import { LangTag } from "@/components/courses/LangTag";
import { IconArrowRight } from "@/components/icons";
import { Hear, useHear } from "@/components/stage/hear";
import { Button, SubjectDot } from "@/components/ui";
import { useT } from "@/i18n";
import { courseProgress } from "@/lib/activity";
import { addFromCatalogue, coursesOf } from "@/lib/courses";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

/** Adds the ready-made course if needed and opens the lesson to do next. */
function useStartCourse(learner: Profile) {
  const router = useRouter();
  const courses = useStore((s) => coursesOf(s, learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  return (entry: CatalogueEntry) => {
    const mine = courses.find((c) => c.catalogueId === entry.id);
    const id = mine?.id ?? addFromCatalogue(entry.id, learner.id);
    if (!id) return;
    const lesson = (mine && courseProgress(mine, events).next) ?? entry.lessons[0];
    router.push(`/learn/${id}/${lesson.id}`);
  };
}

/** K–2: ready-made courses as picture tiles, each with its name read aloud. */
export function PickTiles({ entries, learner }: { entries: CatalogueEntry[]; learner: Profile }) {
  const t = useT();
  const start = useStartCourse(learner);
  const { hear } = useHear();
  if (!entries.length) return null;
  return (
    <section aria-labelledby="pick" className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 id="pick" className="font-brand text-t2 font-semibold text-ink">
          {t("home.pick")}
        </h2>
        <Hear text={t("home.pick")} />
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.id} className="relative">
            <button
              type="button"
              onClick={() => start(entry)}
              className="flex h-full min-h-14 w-full flex-col gap-3 rounded-lg border border-border bg-panel p-2.5 text-left shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lift sm:p-3"
            >
              <CourseArt lessons={entry.lessons} subject={entry.subject} size="lg" />
              <span className={`flex items-start gap-2 px-1 font-brand font-semibold text-ink ${hear ? "pb-12 text-t3 sm:pb-1 sm:pr-12 sm:text-t2" : "pb-1 text-t3"}`} lang={entry.locale}>
                <span className="mt-2">
                  <SubjectDot subject={entry.subject} />
                </span>
                {entry.title}
              </span>
            </button>
            <span className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
              <Hear text={entry.title} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Grade 3+ with no lesson under way: one ready-made course to start with. */
export function SuggestCard({ entry, learner }: { entry: CatalogueEntry; learner: Profile }) {
  const t = useT();
  const start = useStartCourse(learner);
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
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => start(entry)}>
          {t("home.startCta")} <IconArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}
