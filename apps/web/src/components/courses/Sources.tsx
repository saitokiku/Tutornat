"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { catalogueEntry } from "@/catalogue";
import { STATUS_DOT, statusLine } from "@/components/practice/status";
import { Badge, Button } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { startSet, statusesOf } from "@/lib/practice";
import { isReviewed } from "@/lib/review";
import { catalogueSkillsFor, citationGroups, isWebLink, practiceSkillsFor, topicOf } from "@/lib/source-course";
import { read, useStore } from "@/lib/store";
import type { Course, Profile } from "@/lib/types";
import { getSkill, gradeIndex } from "@/practice/skills";

type Citation = NonNullable<Course["citations"]>[number];

/** Wikipedia's text licence; attribution links to it. */
const LICENSE = "https://creativecommons.org/licenses/by-sa/4.0/";

function SourceLink({ c, lang }: { c: Citation; lang?: string }) {
  const t = useT();
  if (!isWebLink(c.url))
    return (
      <span lang={lang} className="inline-flex min-h-11 items-center text-sm text-ink">
        {c.title}
      </span>
    );
  return (
    <a href={c.url} target="_blank" rel="noopener noreferrer" lang={lang} className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-border underline-offset-4 hover:text-accent">
      {c.title}{" "}
      <span className="sr-only">{t("crs.newTab")}</span>
    </a>
  );
}

function Group({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <h3 className="text-xs font-semibold text-muted">{title}</h3>
      <div className="mt-1">{children}</div>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

/** Every link a source-built course was made from, grouped by where it came from. */
export function CourseSources({ course }: { course: Course }) {
  const t = useT();
  if (!course.citations?.length) return null;
  const g = citationGroups(course.citations);
  return (
    <section aria-labelledby="sources" className="space-y-3">
      <div>
        <h2 id="sources" className="font-brand text-t2 font-semibold text-ink">
          {t("crs.sourcesTitle")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">{t("crs.sourcesBody")}</p>
      </div>
      <div className="divide-y divide-border rounded-md border border-border bg-panel">
        {g.article && (
          <Group title={t("crs.wikiFrom")} note={t("crs.wikiLicense")}>
            <p className="flex flex-wrap gap-x-5">
              <SourceLink c={g.article} lang={course.locale} />
              <SourceLink c={{ title: t("crs.licenseLink"), url: LICENSE, source: "" }} />
            </p>
          </Group>
        )}
        {g.words.length > 0 && (
          <Group title={t("crs.wordsFrom")}>
            <ul className="flex flex-wrap gap-x-5">
              {g.words.map((c) => (
                <li key={c.url}>
                  <SourceLink c={c} lang="en" />
                </li>
              ))}
            </ul>
          </Group>
        )}
        {g.books.length > 0 && (
          <Group title={t("crs.booksFrom")}>
            <ul>
              {g.books.map((c) => (
                <li key={c.url}>
                  <SourceLink c={c} />
                </li>
              ))}
            </ul>
          </Group>
        )}
        {g.sites.length > 0 && (
          <Group title={t("crs.sitesFrom")}>
            <ul>
              {g.sites.map((c) => (
                <li key={c.url} className="flex flex-wrap items-baseline gap-x-2">
                  <SourceLink c={c} />
                  <span className="text-xs text-muted">{c.source}</span>
                </li>
              ))}
            </ul>
          </Group>
        )}
      </div>
    </section>
  );
}

/**
 * The skills on the map that fit a course, with where each stands and a way to practice it: the ones its
 * lessons name, else the ones a ready-made course names for its lessons, else the ones that match a
 * source-built course's topic.
 */
export function CoursePractice({ course, learner }: { course: Course; learner: Profile }) {
  const t = useT();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const statuses = useStore((s) => statusesOf(s, learner.id, now));
  const store = useStore((s) => s);
  const article = course.citations ? citationGroups(course.citations).article?.title : undefined;
  const named = [...new Set(course.lessons.flatMap((l) => l.practice ?? []))];
  const near = (id: string) => Math.abs(gradeIndex(getSkill(id)?.grade ?? course.grade) - gradeIndex(course.grade)) <= 2;
  const entry = !named.length && course.origin === "catalogue" && course.catalogueId ? catalogueEntry(course.catalogueId) : null;
  const matches = named.length
    ? named.map((skillId) => ({ skillId, fits: near(skillId) }))
    : entry
      ? catalogueSkillsFor(entry)
      : practiceSkillsFor(topicOf(course.goal), article, course.subject, course.grade);
  const skills = matches.flatMap((m) => {
    const skill = getSkill(m.skillId);
    return skill ? [{ skill, fits: m.fits }] : [];
  });
  if (!skills.length) return null;
  const go = (skillId: string) => {
    const id = startSet(read(), { profile: learner, kind: "pick", skillIds: [skillId], now });
    if (id) router.push(`/practice/${id}`);
  };
  return (
    <section aria-labelledby="practice" className="space-y-3">
      <div>
        <h2 id="practice" className="font-brand text-t2 font-semibold text-ink">
          {t("crs.practiceTitle")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">{t("crs.practiceBody")}</p>
      </div>
      <ul className="divide-y divide-border rounded-md border border-border bg-panel">
        {skills.map(({ skill, fits }) => (
          <li key={skill.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[statuses[skill.id]?.state ?? "new"]}`} />
            <span className="min-w-0 flex-1 basis-40">
              <span className="block text-sm font-medium text-ink">{skill.title[learner.locale]}</span>
              <span className="block text-xs text-muted">{statusLine(statuses[skill.id], now, learner.locale)}</span>
              {!fits && <span className="block text-xs text-muted">{t("crs.skillGrade", { grade: gradeLabel(learner.locale, skill.grade) })}</span>}
            </span>
            {!isReviewed(store, skill) && <Badge>{t("practice.draft")}</Badge>}
            <Button variant="secondary" aria-label={t("crs.practiceNamed", { skill: skill.title[learner.locale] })} onClick={() => go(skill.id)}>
              {t("practice.practiceThis")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
