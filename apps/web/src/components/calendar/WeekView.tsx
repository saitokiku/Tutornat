"use client";

import { IconChevronLeft, IconChevronRight, IconPlus } from "@/components/icons";
import { useT } from "@/i18n";
import type { Statuses } from "@/learning/engine";
import type { Locale } from "@/lib/types";
import { addDays, fromLocalDate, localDate } from "@/planner/dates";
import type { SchoolClass, SchoolEvent } from "@/planner/types";
import { getSkill } from "@/practice/skills";

type Projected = { key: string; date: string; label: string; kind: "prep" | "check" };

/** What the planner will put on each day: prep before tests, checks opening. Shown lighter than school items. */
export function projections(events: SchoolEvent[], statuses: Statuses, from: string, to: string, locale: Locale, t: (k: never, v?: Record<string, string | number>) => string, today = from): Projected[] {
  // Nothing is projected into the past: those days already happened.
  if (from < today) from = today;
  const out: Projected[] = [];
  for (const e of events) {
    if (e.done || !(e.kind === "test" || e.kind === "quiz") || !e.skillIds.some(getSkill)) continue;
    for (let k = 1; k <= 3; k++) {
      const d = addDays(e.date, -k);
      if (d >= from && d <= to) out.push({ key: `prep:${e.id}:${k}`, date: d, label: t("calendar.prep" as never, { title: e.title }), kind: "prep" });
    }
  }
  for (const s of Object.values(statuses)) {
    if (!(s.state === "ready" || s.state === "checked" || s.state === "refresh") || !s.checkOpensAt) continue;
    const d = localDate(s.checkOpensAt);
    if (d >= from && d <= to) out.push({ key: `check:${s.skillId}`, date: d, label: t("calendar.checkOpens" as never, { skill: getSkill(s.skillId)?.title[locale] ?? "" }), kind: "check" });
  }
  return out;
}

export function WeekView({
  start,
  onWeek,
  events,
  classes,
  statuses,
  locale,
  today,
  onOpen,
  onAdd,
}: {
  start: string;
  onWeek: (start: string) => void;
  events: SchoolEvent[];
  classes: SchoolClass[];
  statuses: Statuses;
  locale: Locale;
  today: string;
  onOpen: (e: SchoolEvent) => void;
  onAdd: (date: string) => void;
}) {
  const t = useT();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = days[6];
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", o).format(fromLocalDate(d));
  const proj = projections(events, statuses, start, end, locale, t as never, today);
  const color = (e: SchoolEvent) => classes.find((c) => c.id === e.classId)?.color ?? "var(--color-muted)";

  return (
    <section aria-labelledby="week" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="week" className="mr-auto font-brand text-t2 font-semibold text-ink">
          {fmt(start, { month: "long", day: "numeric" })} – {fmt(end, { month: start.slice(5, 7) === end.slice(5, 7) ? undefined : "long", day: "numeric" })}
        </h2>
        <button type="button" onClick={() => onWeek(addDays(start, -7))} aria-label={t("calendar.prevWeek")} className="grid size-10 place-items-center rounded-full border border-border bg-panel text-ink hover:bg-panel2">
          <IconChevronLeft size={18} />
        </button>
        <button type="button" onClick={() => onWeek(addDays(today, -((fromLocalDate(today).getDay() + 6) % 7)))} className="k-btn-secondary min-h-10 px-4 text-sm">
          {t("calendar.thisWeek")}
        </button>
        <button type="button" onClick={() => onWeek(addDays(start, 7))} aria-label={t("calendar.nextWeek")} className="grid size-10 place-items-center rounded-full border border-border bg-panel text-ink hover:bg-panel2">
          <IconChevronRight size={18} />
        </button>
      </div>
      <ol className="grid gap-2 lg:grid-cols-7">
        {days.map((d) => {
          const mine = events.filter((e) => e.date === d);
          const p = proj.filter((x) => x.date === d);
          const isToday = d === today;
          return (
            <li key={d} className={`flex min-h-24 flex-col rounded-md border bg-panel ${isToday ? "border-accent" : "border-border"} lg:min-h-44`}>
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <span className={`text-xs font-semibold uppercase ${isToday ? "text-accent" : "text-muted"}`}>{fmt(d, { weekday: "short" })}</span>
                <span className="font-opmono text-xs tabular-nums text-ink">{fmt(d, { day: "numeric" })}</span>
                <button type="button" onClick={() => onAdd(d)} aria-label={t("calendar.addOn", { day: fmt(d, { weekday: "long", month: "short", day: "numeric" }) })} className="ml-auto grid size-8 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
                  <IconPlus size={14} />
                </button>
              </div>
              <ul className="flex-1 space-y-1 p-1.5">
                {mine.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => onOpen(e)} className={`flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-panel2 ${e.done ? "text-muted line-through" : "text-ink"}`}>
                      <span aria-hidden="true" className="mt-1 size-2 shrink-0 rounded-full" style={{ background: color(e) }} />
                      <span className="min-w-0">
                        <span className="block font-medium leading-snug">{e.title}</span>
                        <span className="block text-muted">
                          {t(`event.${e.kind}`)}
                          {e.time ? ` · ${e.time}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {p.map((x) => (
                  <li key={x.key} className="rounded-sm border border-dashed border-border px-2 py-1.5 text-xs text-muted">
                    {x.label}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
