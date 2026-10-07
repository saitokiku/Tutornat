"use client";

import Link from "next/link";
import { whenLabel } from "@/components/practice/status";
import { useT } from "@/i18n";
import type { Locale } from "@/lib/types";
import { fromLocalDate } from "@/planner/dates";
import type { SchoolClass, SchoolEvent } from "@/planner/types";

/** The next week of school: tests, quizzes, homework, days off. Rows, not cards. */
export function ComingUp({ events, classes, locale, now }: { events: SchoolEvent[]; classes: SchoolClass[]; locale: Locale; now: number }) {
  const t = useT();
  return (
    <section aria-labelledby="coming" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id="coming" className="font-brand text-t2 font-semibold text-ink">
          {t("today.comingUp")}
        </h2>
        <Link href="/calendar" className="inline-flex min-h-10 items-center text-sm font-medium text-muted hover:text-accent">
          {t("today.openCalendar")}
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-5 py-4 text-sm text-muted">{t("today.nothingComing")}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-panel">
          {events.slice(0, 6).map((e) => {
            const cls = classes.find((c) => c.id === e.classId);
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: cls?.color ?? "var(--color-muted)" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                  <span className="block text-xs text-muted">
                    {t(`event.${e.kind}`)}
                    {cls ? ` · ${cls.name}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">
                  {whenLabel(fromLocalDate(e.date).getTime(), now, locale)}
                  {e.time ? ` · ${e.time}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
