"use client";

import { STATUS_DOT, statusLine } from "@/components/practice/status";
import { Badge, Button } from "@/components/ui";
import { gradeLabel, useT, type Key } from "@/i18n";
import type { SkillState, Statuses } from "@/learning/engine";
import { isReviewed } from "@/lib/review";
import { useStore } from "@/lib/store";
import type { Grade, Locale } from "@/lib/types";
import { gradeIndex } from "@/practice/skills";
import type { Skill } from "@/practice/types";
import { StandardCode } from "./StandardText";

// The full skill map for one subject, by grade: a status dot and an honest status line per skill,
// the standard behind it (its wording on tap), and a way to practice any of them.

const LEGEND: [SkillState, Key][] = [
  ["new", "status.new"],
  ["practicing", "status.practicing"],
  ["ready", "pr.dot.ready"],
  ["checked", "pr.dot.checked"],
  ["proved", "pr.dot.proved"],
  ["refresh", "status.refresh"],
];

export function StatusLegend() {
  const t = useT();
  return (
    <ul aria-label={t("pr.dot.legend")} className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
      {LEGEND.map(([state, key]) => (
        <li key={state} className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[state]}`} />
          {t(key)}
        </li>
      ))}
    </ul>
  );
}

export function SkillRow({ skill, statuses, now, locale, onPractice }: { skill: Skill; statuses: Statuses; now: number; locale: Locale; onPractice: () => void }) {
  const t = useT();
  const reviewed = useStore((s) => isReviewed(s, skill));
  const status = statuses[skill.id];
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-5">
      <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[status?.state ?? "new"]}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{skill.title[locale]}</span>
        <span className="block text-xs text-muted">{statusLine(status, now, locale)}</span>
      </span>
      {!reviewed && <Badge>{t("practice.draft")}</Badge>}
      {skill.standard && <StandardCode code={skill.standard} locale={locale} />}
      <Button variant="secondary" onClick={onPractice} aria-label={`${t("practice.practiceThis")}: ${skill.title[locale]}`}>
        {t("practice.practiceThis")}
      </Button>
    </li>
  );
}

export function SkillMap({
  skills,
  statuses,
  now,
  locale,
  near,
  onPractice,
}: {
  skills: Skill[];
  statuses: Statuses;
  now: number;
  locale: Locale;
  /** The learner's grade: nearby grades start open. */
  near: Grade;
  onPractice: (skillId: string) => void;
}) {
  const t = useT();
  const byGrade = new Map<Grade, Skill[]>();
  for (const s of skills) byGrade.set(s.grade, [...(byGrade.get(s.grade) ?? []), s]);
  const home = gradeIndex(near === "adult" ? "6" : near);
  return (
    <div className="space-y-3">
      <StatusLegend />
      {[...byGrade.entries()].map(([grade, list]) => (
        <details key={grade} open={Math.abs(gradeIndex(grade) - home) <= 1} className="group rounded-lg border border-border bg-panel">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 sm:px-5">
            <span className="font-medium text-ink">{gradeLabel(locale, grade)}</span>
            <span className="font-opmono text-xs text-muted">
              {t("practice.provedCount", { n: list.filter((s) => statuses[s.id]?.state === "proved").length, total: list.length })}
            </span>
            <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {list.map((s) => (
              <SkillRow key={s.id} skill={s} statuses={statuses} now={now} locale={locale} onPractice={() => onPractice(s.id)} />
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
