"use client";

import Link from "next/link";
import { useState } from "react";
import { bandOf, CATALOGUE, type Band } from "@/catalogue";
import { IconCheck, IconPlus } from "@/components/icons";
import { Button, btn } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { addFromCatalogue } from "@/lib/courses";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { CourseArt } from "./CourseArt";
import { LangTag } from "./LangTag";

const BANDS: Band[] = ["k2", "35", "68", "9"];

/** Every ready-made course, a grade band at a time (the learner's own first). Adding one puts it on the path. */
export function Catalogue({ learner }: { learner: Profile }) {
  const t = useT();
  const mine = useStore((s) => s.courses.filter((c) => c.profileId === learner.id && c.catalogueId));
  const myBand = bandOf(learner.grade);
  const [band, setBand] = useState<Band | "all">(myBand === "adult" ? "all" : myBand);
  const shown = CATALOGUE.filter((c) => band === "all" || bandOf(c.grade) === band).sort((a, b) => Number(b.locale === learner.locale) - Number(a.locale === learner.locale));

  const add = (id: string) => {
    addFromCatalogue(id, learner.id);
    // The Add button becomes an Open link; keep the keyboard where it was.
    requestAnimationFrame(() => document.getElementById(`open-${id}`)?.focus());
  };

  return (
    <section aria-labelledby="catalogue" className="space-y-4">
      <div>
        <h2 id="catalogue" className="font-brand text-t2 font-semibold text-ink">
          {t("courses.catalogue")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("courses.catalogueBody")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {BANDS.map((b) => (
          <button key={b} type="button" aria-pressed={band === b} onClick={() => setBand(b)} className="k-chip min-h-11">
            {t(`band.${b}` as const)}
          </button>
        ))}
        <button type="button" aria-pressed={band === "all"} onClick={() => setBand("all")} className="k-chip min-h-11">
          {t("courses.allBands")}
        </button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((entry) => {
          const have = mine.find((c) => c.catalogueId === entry.id);
          const titleId = `entry-${entry.id}`;
          return (
            <li key={entry.id} className="flex flex-col rounded-md border border-border bg-panel p-3">
              <CourseArt lessons={entry.lessons} subject={entry.subject} />
              <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  <span id={titleId} lang={entry.locale}>
                    {entry.title}
                  </span>
                  <LangTag course={entry.locale} learner={learner.locale} />
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted" lang={entry.locale}>
                  {entry.summary}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="font-opmono text-xs text-muted">
                    {gradeLabel(learner.locale, entry.grade, true)} · {t("course.lessons", { n: entry.lessons.length })}
                  </span>
                  {have ? (
                    <Link id={`open-${entry.id}`} href={`/courses/${have.id}`} aria-describedby={titleId} className={btn("secondary", "md", "px-4 text-xs")}>
                      <IconCheck size={14} /> {t("course.open")}
                    </Link>
                  ) : (
                    <Button variant="secondary" className="px-4 text-xs" aria-describedby={titleId} onClick={() => add(entry.id)}>
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
  );
}
