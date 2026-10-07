"use client";

import Link from "next/link";
import { IconChevronRight } from "@/components/icons";
import { whenLabel } from "@/components/practice/status";
import { useHear } from "@/components/stage/hear";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { fromLocalDate } from "@/planner/dates";
import type { SchoolClass, SchoolEvent } from "@/planner/types";
import { BigHear } from "./BigHear";

/**
 * The next week of school: tests, quizzes, homework, days off. Rows, not cards; each opens its item
 * page. With read-aloud on (K–2), every row has a speaker and every link is a 56px target; `times: false`
 * leaves clock times out for pre-readers.
 */
export function ComingUp({ events, classes, locale, now, limit = 6, times = true }: { events: SchoolEvent[]; classes: SchoolClass[]; locale: Locale; now: number; limit?: number; times?: boolean }) {
  const t = useT();
  const { young } = useHear();
  const shown = events.slice(0, limit);
  const hidden = events.length - shown.length;
  return (
    <section aria-labelledby="coming" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <h2 id="coming" className="font-brand text-t2 font-semibold text-ink">
            {t("today.comingUp")}
          </h2>
          <BigHear text={t("today.comingUp")} />
        </span>
        <Link href="/calendar" className={`inline-flex items-center text-sm font-medium text-muted hover:text-accent ${young ? "min-h-14 px-2" : "min-h-11"}`}>
          {t("today.openCalendar")}
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-5 py-4 text-sm text-muted">{t("today.nothingComing")}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-panel">
          {shown.map((e) => {
            const cls = classes.find((c) => c.id === e.classId);
            const when = `${whenLabel(fromLocalDate(e.date).getTime(), now, locale)}${times && e.time ? ` · ${e.time}` : ""}`;
            return (
              <li key={e.id} className="flex items-center gap-2 pr-2 transition-colors has-[a:hover]:bg-panel2/60 sm:pr-3">
                <Link href={`/calendar/${e.id}`} className="group flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 sm:pl-5">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: cls?.color ?? "var(--color-muted)" }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {t(`event.${e.kind}`)}
                      {cls ? ` · ${cls.name}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">{when}</span>
                  <IconChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
                <BigHear text={`${e.title}. ${t(`event.${e.kind}`)}. ${when}`} />
              </li>
            );
          })}
          {hidden > 0 && (
            <li>
              <Link href="/calendar" className={`flex items-center px-4 text-sm font-medium text-muted hover:text-accent sm:px-5 ${young ? "min-h-14" : "min-h-12"}`}>
                {t("today.moreInCalendar", { n: hidden })}
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
