"use client";

import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { Hear } from "@/components/stage/hear";
import { useLocale, useT } from "@/i18n";
import { startOfWeek } from "@/lib/activity";
import { coursesOf } from "@/lib/courses";
import { dayLabel, shortDate, timeLabel } from "@/lib/format";
import { weekLog } from "@/lib/growth";
import { useStore } from "@/lib/store";
import { LogMark, logText } from "./events";

const DAY = 864e5;

/**
 * The record a day at a time, one week per page. Steps land mid-week and snap to Monday, so a clock
 * change never shifts the week. `young`: a K–2 learner's own view, with each day read aloud on
 * request, bigger steps, and no tallies or clock times.
 */
export function DayLog({ profileId, now, young = false }: { profileId: string; now: number; young?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [thisWeek] = useState(() => startOfWeek(now));
  const [week, setWeek] = useState(thisWeek);
  const s = useStore((x) => x);
  const days = weekLog(s, profileId, week, now).filter((d) => d.entries.length).reverse();
  const ctx = { courses: coursesOf(s, profileId), events: s.events.filter((e) => e.profileId === profileId), locale, t };
  const step = `grid place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30 ${young ? "size-14" : "size-11"}`;

  return (
    <section aria-labelledby="day-by-day" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="day-by-day" className="font-brand text-t2 font-semibold text-ink">
          {t("fam.dayByDay")}
        </h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeek(startOfWeek(week - 3 * DAY))} aria-label={t("growth.prev")} className={step}>
            <IconChevronLeft size={young ? 22 : 18} />
          </button>
          <p aria-live="polite" className="min-w-36 text-center text-sm font-medium text-ink">
            {t("growth.weekOf", { date: shortDate(week, locale) })}
          </p>
          {/* aria-disabled, not disabled: keyboard focus stays put when you step back to this week. */}
          <button
            type="button"
            onClick={() => {
              if (week < thisWeek) setWeek(startOfWeek(week + 10 * DAY));
            }}
            aria-disabled={week >= thisWeek || undefined}
            aria-label={t("growth.next")}
            className={`${step} aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:border-border`}
          >
            <IconChevronRight size={young ? 22 : 18} />
          </button>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-5 py-4 text-sm text-muted">{t("growth.empty")}</p>
      ) : (
        <ol className="space-y-5">
          {days.map((d) => {
            const lines = d.entries.map((e) => ({ e, ...logText(e, ctx) }));
            const label = dayLabel(d.day, locale);
            return (
              <li key={d.day}>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-sm font-semibold capitalize text-ink">{label}</h3>
                  {young && <Hear text={`${label}. ${lines.map((l) => l.text).join(". ")}.`} className="min-h-14 min-w-14" />}
                </div>
                <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-panel">
                  {lines.map(({ e, text, meta }) => (
                    <li key={`${e.kind}:${e.id}`} className={`flex items-start gap-3 px-4 py-3 ${young ? "text-base" : "text-sm"}`}>
                      <span className="mt-1 flex">
                        <LogMark entry={e} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-ink">{text}</span>
                        {meta && !young && <span className="block text-xs text-muted">{meta}</span>}
                      </span>
                      {/* Reading has a day, not a time. */}
                      {!young && e.kind !== "reading" && <span className="shrink-0 pt-0.5 font-opmono text-xs tabular-nums text-muted">{timeLabel(e.at, locale)}</span>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
