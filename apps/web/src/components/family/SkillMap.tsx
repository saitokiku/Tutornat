"use client";

import { STATUS_DOT, statusLine } from "@/components/practice/status";
import { gradeLabel, useT } from "@/i18n";
import type { Statuses } from "@/learning/engine";
import type { Grade, Locale, Subject } from "@/lib/types";
import { skillsFor } from "@/practice/skills";
import type { Skill } from "@/practice/types";
import { DraftMark } from "./Verified";

/**
 * A subject's whole skill map for the grown-up, folded away: every skill in order by grade, where
 * each one stands, its standard, and whether its questions are still drafts. Read-only.
 */
export function SkillMap({ subject, statuses, locale, now }: { subject: Subject; statuses: Statuses; locale: Locale; now: number }) {
  const t = useT();
  const skills = skillsFor(subject);
  if (!skills.length) return null;
  const byGrade = new Map<Grade, Skill[]>();
  for (const s of skills) byGrade.set(s.grade, [...(byGrade.get(s.grade) ?? []), s]);
  return (
    <details className="group pl-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted hover:text-ink">
        <span aria-hidden="true" className="transition-transform group-open:rotate-90 motion-reduce:transition-none">
          ›
        </span>
        {t("lm.map.all", { n: skills.length })}
      </summary>
      <div className="space-y-3 pb-2">
        {[...byGrade.entries()].map(([grade, list]) => (
          <div key={grade}>
            <p className="text-xs font-semibold text-ink">
              {t("lm.map.grade", { grade: gradeLabel(locale, grade), proved: list.filter((s) => statuses[s.id]?.state === "proved").length, total: list.length })}
            </p>
            <ul className="mt-1 space-y-1">
              {list.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${STATUS_DOT[statuses[s.id]?.state ?? "new"]}`} />
                  <span className="font-medium text-ink">{s.title[locale]}</span>
                  <span className="text-muted">{statusLine(statuses[s.id], now, locale)}</span>
                  {s.standard && (
                    <span className="font-opmono text-muted">
                      <span className="sr-only">{t("lm.proved.code", { code: s.standard })}</span>
                      <span aria-hidden="true">{s.standard}</span>
                    </span>
                  )}
                  <DraftMark skillId={s.id} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
