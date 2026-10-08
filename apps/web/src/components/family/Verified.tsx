"use client";

import { Badge } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import type { Verified } from "@/learning/profile";
import { shortDate } from "@/lib/format";
import { isReviewed } from "@/lib/review";
import { useStore } from "@/lib/store";
import type { Locale } from "@/lib/types";
import { fromLocalDate } from "@/planner/dates";
import { getSkill } from "@/practice/skills";

// The verified half of the learner model on the child's page: what is proved (with dates and the
// standard), courses with their check tallies, and school's own results — each kept apart.

/** "Draft questions" beside a skill whose hand-written bank no teacher has reviewed yet. */
export function DraftMark({ skillId }: { skillId: string }) {
  const t = useT();
  const draft = useStore((s) => {
    const skill = getSkill(skillId);
    return !!skill && !isReviewed(s, skill);
  });
  return draft ? <Badge>{t("practice.draft")}</Badge> : null;
}

/** A subject's proved skills, newest first, folded away under a count. */
export function ProvedList({ proved, locale }: { proved: Verified["proved"]; locale: Locale }) {
  const t = useT();
  const ui = useLocale();
  if (!proved.length) return null;
  return (
    <details className="group pl-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted hover:text-ink">
        <span aria-hidden="true" className="transition-transform group-open:rotate-90 motion-reduce:transition-none">
          ›
        </span>
        {t("lm.proved.summary", { n: proved.length })}
      </summary>
      <ul className="space-y-1.5 pb-2">
        {proved.map((p) => (
          <li key={p.skillId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-medium text-ink">{getSkill(p.skillId)?.title[locale] ?? p.skillId}</span>
            {p.standards.length > 0 && (
              <span className="font-opmono text-muted">
                <span className="sr-only">{t("lm.proved.code", { code: p.standards.join(", ") })}</span>
                <span aria-hidden="true">{p.standards.join(", ")}</span>
              </span>
            )}
            <span className="font-opmono tabular-nums text-muted">{shortDate(p.provedAt, ui)}</span>
            {p.refresh && <span className="font-medium text-warn">{t("status.refresh")}</span>}
            <DraftMark skillId={p.skillId} />
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Courses they have worked in: lessons done and the lesson-check tally. Activity, not mastery. */
export function CourseRecord({ id, courses }: { id: string; courses: Verified["courses"] }) {
  const t = useT();
  if (!courses.length) return null;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-brand text-t2 font-semibold text-ink">
        {t("lm.courses.title")}
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
        {courses.map((c) => (
          <li key={c.courseId} className="space-y-0.5 px-4 py-3 sm:px-5">
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-sm font-medium text-ink">{c.title}</span>
              <span className="font-opmono text-xs tabular-nums text-muted">{t("lm.courses.lessons", { done: c.done, total: c.total })}</span>
            </p>
            <p className="text-xs text-muted">{t("lm.courses.tally", { own: c.own, helped: c.helped, missed: c.missed })}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Scores from school, as a grown-up entered them. Labelled, and never mixed with proof. */
export function SchoolResults({ id, results }: { id: string; results: Verified["school"] }) {
  const t = useT();
  const ui = useLocale();
  if (!results.length) return null;
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="font-brand text-t2 font-semibold text-ink">
        {t("lm.school.title")}
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
        {results.slice(0, 8).map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <span className="min-w-0 flex-1 break-words text-sm text-ink">{r.title}</span>
            <span className="shrink-0 font-opmono text-xs tabular-nums text-ink">{t("lm.school.score", { score: r.score, outOf: r.outOf })}</span>
            <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">{shortDate(fromLocalDate(r.date).getTime(), ui)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{t("lm.school.note")}</p>
    </section>
  );
}
