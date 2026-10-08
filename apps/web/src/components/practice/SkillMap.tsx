"use client";

import { useMemo } from "react";
import { STATUS_DOT, statusLine } from "@/components/practice/status";
import { IconEnglish, IconMath, IconScience } from "@/components/icons";
import { Hear } from "@/components/stage/hear";
import { VisualView } from "@/components/stage/visuals";
import { skillPicture } from "@/components/today/PlanPicture";
import { Badge, Button, Disclosure, SUBJECT_TINT } from "@/components/ui";
import { gradeLabel, useT, type Key } from "@/i18n";
import type { SkillState, Statuses } from "@/learning/engine";
import { isReviewed } from "@/lib/review";
import { useStore } from "@/lib/store";
import type { Grade, Locale } from "@/lib/types";
import { gradeIndex } from "@/practice/skills";
import type { Skill } from "@/practice/types";
import { HEAR } from "./targets";

// The full skill map for one subject, by grade: a status dot and an honest status line per skill, and
// a way to practice any of them. Standard codes are records, not learner UI: they print, and the
// grown-up's pages carry them; on screen a learner sees the skill's name.

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
      <span className="min-w-0 flex-1 basis-40">
        <span className="block text-sm font-medium text-ink">{skill.title[locale]}</span>
        <span className="k-meta block">
          {statusLine(status, now, locale)}
          {skill.standard && <span className="hidden print:inline"> · {skill.standard}</span>}
        </span>
      </span>
      {!reviewed && <Badge>{t("practice.draft")}</Badge>}
      <Button variant="secondary" onClick={onPractice} aria-label={`${t("practice.practiceThis")}: ${skill.title[locale]}`} className="ml-auto">
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
        <Disclosure
          key={grade}
          defaultOpen={Math.abs(gradeIndex(grade) - home) <= 1}
          className="rounded-lg"
          summary={gradeLabel(locale, grade)}
          meta={t("practice.provedCount", { n: list.filter((s) => statuses[s.id]?.state === "proved").length, total: list.length })}
        >
          <ul className="divide-y divide-border">
            {list.map((s) => (
              <SkillRow key={s.id} skill={s} statuses={statuses} now={now} locale={locale} onPractice={() => onPractice(s.id)} />
            ))}
          </ul>
        </Disclosure>
      ))}
    </div>
  );
}

const SUBJECT_ICON = { math: IconMath, english: IconEnglish, science: IconScience, other: IconMath };

/** A skill's own picture: the visual its first problem is drawn with (a fixed seed), else its subject. */
export function TilePicture({ skill, locale }: { skill: Skill; locale: Locale }) {
  const tint = SUBJECT_TINT[skill.subject];
  const { visual, picture } = useMemo(() => skillPicture(skill.id, locale), [skill.id, locale]);
  const Icon = SUBJECT_ICON[skill.subject];
  return (
    <span
      aria-hidden="true"
      className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-md p-4"
      style={{ background: `color-mix(in srgb, ${tint} 9%, var(--color-panel2))` }}
    >
      {visual ? (
        <span className="grid size-full place-items-center [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-full">
          <VisualView visual={visual} alt="" tint={tint} />
        </span>
      ) : picture ? (
        <span className="text-d1 leading-none">{picture}</span>
      ) : (
        <span className="grid size-16 place-items-center rounded-full bg-panel" style={{ color: tint }}>
          <Icon size={30} />
        </span>
      )}
    </span>
  );
}

/**
 * K–2 picture tiles: the whole tile starts the skill; the speaker in its corner reads the name. Status
 * shows only once there is some (a page of "Not started" is noise to a pre-reader).
 */
export function SkillTiles({ skills, statuses, now, locale, onPractice }: { skills: Skill[]; statuses: Statuses; now: number; locale: Locale; onPractice: (skillId: string) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {skills.map((s) => {
        const status = statuses[s.id];
        const started = status && status.state !== "new";
        return (
          <li key={s.id} className="relative">
            <button
              type="button"
              onClick={() => onPractice(s.id)}
              className="flex h-full w-full flex-col gap-2.5 rounded-lg border border-border bg-panel p-2.5 pb-18 text-left shadow-soft transition-[transform,box-shadow] duration-(--duration-quick) hover:-translate-y-0.5 hover:shadow-lift sm:p-3 sm:pb-18"
            >
              <TilePicture skill={s} locale={locale} />
              <span className="px-1 font-brand text-t3 font-semibold text-ink">{s.title[locale]}</span>
              {started && (
                <span className="k-meta flex items-center gap-2 px-1">
                  <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[status.state]}`} />
                  {statusLine(status, now, locale)}
                </span>
              )}
            </button>
            <span className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3">
              <Hear text={s.title[locale]} className={HEAR} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
