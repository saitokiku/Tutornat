"use client";

import Link from "next/link";
import { useState } from "react";
import { bandOf, CATALOGUE, type Band } from "@/catalogue";
import { CourseArt } from "@/components/courses/CourseArt";
import { CourseRow } from "@/components/courses/CourseRow";
import { LangTag } from "@/components/courses/LangTag";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconCheck, IconPlus } from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { courseProgress } from "@/lib/activity";
import { addFromCatalogue, coursesOf } from "@/lib/courses";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function CoursesPage() {
  return (
    <Guard need="learner">
      <Courses />
    </Guard>
  );
}

type Filter = "all" | "active" | "done";
const BANDS: Band[] = ["k2", "35", "68", "9"];

function Courses() {
  const t = useT();
  useTitle(t("courses.title"));
  const learner = useStore(currentLearner) as Profile;
  const courses = useStore((s) => coursesOf(s, learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const [filter, setFilter] = useState<Filter>("all");
  const myBand = bandOf(learner.grade);
  const [band, setBand] = useState<Band | "all">(myBand === "adult" ? "all" : myBand);

  const shown = courses.filter((c) => {
    if (filter === "all") return true;
    const p = courseProgress(c, events);
    return filter === "done" ? p.total > 0 && p.done === p.total : p.started && p.done < p.total;
  });
  const catalogue = CATALOGUE.filter((c) => band === "all" || bandOf(c.grade) === band).sort(
    (a, b) => Number(b.locale === learner.locale) - Number(a.locale === learner.locale),
  );

  return (
    <div className="space-y-12">
      <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("courses.title")}</h1>

      <section aria-labelledby="mine" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mine" className="font-brand text-t2 font-semibold text-ink">
            {t("courses.mine")}
          </h2>
          {courses.length > 0 && (
            <div className="flex gap-2">
              {(["all", "active", "done"] as const).map((f) => (
                <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className="k-chip">
                  {t(`courses.filter.${f}` as const)}
                </button>
              ))}
            </div>
          )}
        </div>
        {courses.length === 0 ? (
          <EmptyState title={t("courses.empty")} />
        ) : shown.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-5 py-6 text-center text-sm text-muted">{t("courses.emptyFilter")}</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-panel">
            {shown.map((c) => (
              <CourseRow key={c.id} course={c} events={events} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="catalogue" className="space-y-4">
        <div>
          <h2 id="catalogue" className="font-brand text-t2 font-semibold text-ink">
            {t("courses.catalogue")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("courses.catalogueBody")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <button key={b} type="button" aria-pressed={band === b} onClick={() => setBand(b)} className="k-chip">
              {t(`band.${b}` as const)}
            </button>
          ))}
          <button type="button" aria-pressed={band === "all"} onClick={() => setBand("all")} className="k-chip">
            {t("courses.allBands")}
          </button>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogue.map((entry) => {
            const mine = courses.find((c) => c.catalogueId === entry.id);
            return (
              <li key={entry.id} className="flex flex-col rounded-md border border-border bg-panel p-3">
                <CourseArt lessons={entry.lessons} subject={entry.subject} />
                <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    <span lang={entry.locale}>{entry.title}</span>
                    <LangTag course={entry.locale} learner={learner.locale} />
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted" lang={entry.locale}>
                    {entry.summary}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="font-opmono text-xs text-muted">
                      {gradeLabel(learner.locale, entry.grade, true)} · {t("course.lessons", { n: entry.lessons.length })}
                    </span>
                    {mine ? (
                      <Link href={`/courses/${mine.id}`} className="k-btn-secondary min-h-9 px-3.5 text-xs">
                        <IconCheck size={14} /> {t("course.open")}
                      </Link>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => addFromCatalogue(entry.id, learner.id)}>
                        <IconPlus size={14} /> {t("courses.add")}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
