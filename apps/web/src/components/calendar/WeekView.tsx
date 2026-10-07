"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconCheck, IconChevronLeft, IconChevronRight, IconPlus } from "@/components/icons";
import { t as tr, useLocale, useT } from "@/i18n";
import { classesOf } from "@/lib/school";
import { useStore } from "@/lib/store";
import type { Locale, Profile, Subject } from "@/lib/types";
import { weekOf } from "@/lib/week";
import { addDays, fromLocalDate, localDate, weekStart } from "@/planner/dates";
import type { SchoolClass, SchoolEvent } from "@/planner/types";
import type { LineStatus, WeekDay, WeekLine } from "@/planner/week";
import { getSkill } from "@/practice/skills";

const tag = (l: Locale) => (l === "es" ? "es-US" : "en-US");
const fmt = (day: string, l: Locale, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag(l), o).format(fromLocalDate(day));
/** "Friday, October 9" — the name a screen reader hears for a day. */
export const fullDay = (day: string, l: Locale) => fmt(day, l, { weekday: "long", month: "long", day: "numeric" });

/** What a plan line is called on the calendar. */
export function lineText(line: WeekLine, locale: Locale): string {
  const skill = (id?: string) => (id ? (getSkill(id)?.title[locale] ?? "") : "");
  const subject = (s?: Subject) => tr(locale, `subject.${s ?? "other"}`);
  switch (line.kind) {
    case "check":
      return tr(locale, line.opens ? "calendar.checkOpens" : "plan.check", { skill: skill(line.skillIds[0]) });
    case "prep":
      return tr(locale, "calendar.prep", { title: line.event?.title ?? "" });
    case "due":
      return line.event ? tr(locale, "cal.workOn", { title: line.event.title }) : tr(locale, "cal.workAny");
    case "feedback":
      return tr(locale, "cal.teacherNote", { skill: skill(line.skillIds[0]) });
    case "daily":
      return line.skillIds[0] ? `${subject(line.subject)}: ${skill(line.skillIds[0])}` : tr(locale, "cal.subjectSet", { subject: subject(line.subject) });
    case "review":
      return line.skillIds.length ? tr(locale, "cal.review", { n: line.skillIds.length }) : tr(locale, "practice.kind.review");
    case "lesson":
      if (line.status === "planned" && line.lesson) return tr(locale, "cal.lessonIn", { course: line.lesson.courseTitle });
      return line.lesson ? tr(locale, "cal.lesson", { title: line.lesson.title }) : tr(locale, "cal.lessonAny");
    case "set": {
      const kind = line.set?.kind ?? "pick";
      if (kind === "placement") return tr(locale, "practice.kind.placement");
      if (kind === "check") return tr(locale, "plan.check", { skill: skill(line.skillIds[0]) });
      const what = line.set?.topic ?? skill(line.skillIds[0]);
      return what ? `${tr(locale, `practice.kind.${kind}`)}: ${what}` : tr(locale, `practice.kind.${kind}`);
    }
  }
}

type Shown = { key: string; status: LineStatus; text: string; named: boolean };

/**
 * The lines a day shows. Work due on the item's own day is the school item itself, so it isn't
 * repeated; on coming days the daily sets read as one line ("Practice: Math and English"), because
 * which skill they hold can change before then.
 */
export function shownLines(day: WeekDay, locale: Locale): Shown[] {
  const lines = day.lines.filter((l) => !(l.kind === "due" && l.event?.date === day.date));
  const out: Shown[] = [];
  const planned = day.when === "future" ? lines.filter((l) => l.kind === "daily" && l.status === "planned") : [];
  for (const l of lines) {
    if (planned.includes(l)) {
      if (l !== planned[0]) continue;
      const subjects = new Intl.ListFormat(tag(locale), { type: "conjunction" }).format(planned.map((x) => tr(locale, `subject.${x.subject ?? "other"}`)));
      out.push({ key: "daily", status: "planned", text: tr(locale, "cal.practicePlanned", { subjects }), named: false });
      continue;
    }
    out.push({ key: l.key, status: l.status, text: lineText(l, locale), named: l.kind === "prep" || (l.kind === "check" && !!l.opens) });
  }
  return out;
}

const STATUS_WORD = { done: "cal.statusDone", todo: "cal.statusTodo", planned: "cal.statusPlanned" } as const;

function Mark({ status }: { status: LineStatus }) {
  if (status === "done")
    return (
      <span aria-hidden="true" className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full bg-good text-paper xl:size-3">
        <IconCheck size={9} strokeWidth={3} />
      </span>
    );
  return <span aria-hidden="true" className={`mt-0.5 size-3.5 shrink-0 rounded-full border xl:size-3 ${status === "todo" ? "border-ink/50" : "border-dashed border-muted"}`} />;
}

function EventRow({ e, classes, today, locale }: { e: SchoolEvent; classes: SchoolClass[]; today: string; locale: Locale }) {
  const t = useT();
  const cls = classes.find((c) => c.id === e.classId);
  const noPrep = !e.done && (e.kind === "test" || e.kind === "quiz") && e.date >= today && !e.skillIds.some(getSkill);
  return (
    <li>
      <Link href={`/calendar/${e.id}`} className="flex min-h-11 items-start gap-2 rounded-sm px-1.5 py-1.5 hover:bg-panel2 xl:gap-1 xl:px-0.5">
        <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: cls?.color ?? "var(--color-muted)" }} />
        <span className="min-w-0 hyphens-auto break-words">
          <span className={`block text-sm font-medium leading-snug xl:text-xs ${e.done ? "text-muted line-through" : "text-ink"}`}>{e.title}</span>
          <span className="block text-xs text-muted">
            {t(`event.${e.kind}`)}
            {e.time ? ` · ${e.time}` : ""}
            {cls ? <span className="xl:hidden"> · {cls.name}</span> : null}
            {e.done ? ` · ${t("cal.statusDone")}` : ""}
          </span>
          {noPrep && <span className="block text-xs text-warn">{t("cal.noPrep")}</span>}
          <span className="sr-only">{fullDay(e.date, locale)}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * One learner's week: each day's school items and its plan. Past days show what was done, today shows
 * today's plan, coming days show the plan as it stands now, marked planned. A 7-column week on wide
 * screens, a day list on phones. Arrow keys move between days; Page Up / Page Down change the week.
 */
export function WeekView({ profile, now, start, onWeek, onAdd }: { profile: Profile; now: number; start: string; onWeek: (start: string) => void; onAdd: (date: string) => void }) {
  const t = useT();
  const locale = useLocale();
  const today = localDate(now);
  const days = useStore((s) => weekOf(s, profile, now, start));
  const classes = useStore((s) => classesOf(s, profile.id));
  const end = days[days.length - 1].date;
  const thisWeek = weekStart(today);
  const years = start.slice(0, 4) !== today.slice(0, 4) || end.slice(0, 4) !== start.slice(0, 4);
  const range = new Intl.DateTimeFormat(tag(locale), { month: "long", day: "numeric", year: years ? "numeric" : undefined }).formatRange(fromLocalDate(start), fromLocalDate(end));

  // Roving focus: one day is in the tab order; arrows move it. The default is today, else Monday.
  const [focus, setFocus] = useState<{ start: string; i: number } | null>(null);
  const todayIndex = days.findIndex((d) => d.date === today);
  const active = focus?.start === start ? focus.i : Math.max(0, todayIndex);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const pending = useRef<{ start: string; i: number } | null>(null);
  useEffect(() => {
    if (pending.current?.start !== start) return;
    refs.current[pending.current.i]?.focus();
    pending.current = null;
  }, [start]);

  const moveTo = (i: number) => {
    if (i >= 0 && i < days.length) {
      setFocus({ start, i });
      refs.current[i]?.focus();
      return;
    }
    const next = addDays(start, i < 0 ? -7 : 7);
    const at = i < 0 ? days.length - 1 : 0;
    goWeek(next, at);
  };
  const goWeek = (next: string, i: number) => {
    setFocus({ start: next, i });
    pending.current = { start: next, i };
    onWeek(next);
  };
  const onKey = (e: KeyboardEvent<HTMLElement>, i: number) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    const keys: Record<string, () => void> = {
      ArrowRight: () => moveTo(i + 1),
      ArrowDown: () => moveTo(i + 1),
      ArrowLeft: () => moveTo(i - 1),
      ArrowUp: () => moveTo(i - 1),
      Home: () => moveTo(0),
      End: () => moveTo(days.length - 1),
      PageDown: () => goWeek(addDays(start, 7), i),
      PageUp: () => goWeek(addDays(start, -7), i),
    };
    if (!keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
  };

  return (
    <section aria-labelledby="week" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="week" aria-live="polite" className="mr-auto font-brand text-t2 font-semibold text-ink">
          {range}
        </h2>
        <button type="button" onClick={() => onWeek(addDays(start, -7))} aria-label={t("calendar.prevWeek")} className="grid size-11 place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30">
          <IconChevronLeft size={18} />
        </button>
        <button type="button" onClick={() => onWeek(thisWeek)} aria-current={start === thisWeek ? "date" : undefined} className="k-btn-secondary px-4 aria-[current=date]:border-ink/40">
          {t("calendar.thisWeek")}
        </button>
        <button type="button" onClick={() => onWeek(addDays(start, 7))} aria-label={t("calendar.nextWeek")} className="grid size-11 place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30">
          <IconChevronRight size={18} />
        </button>
      </div>

      <ol className="grid gap-2 xl:grid-cols-7 xl:gap-1.5">
        {days.map((d, i) => {
          const isToday = d.when === "today";
          const lines = shownLines(d, locale);
          const empty = !d.events.length && !lines.length && !d.answers.n;
          const full = fullDay(d.date, locale);
          return (
            <li key={d.date} className="min-w-0">
              <section
                ref={(el) => void (refs.current[i] = el)}
                aria-labelledby={`day-${d.date}`}
                tabIndex={i === active ? 0 : -1}
                onKeyDown={(e) => onKey(e, i)}
                onFocus={(e) => e.target === e.currentTarget && setFocus({ start, i })}
                className={`flex h-full flex-col rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper xl:min-h-52 ${isToday ? "border-accent bg-panel" : d.when === "past" ? "border-border bg-panel2/40" : "border-border bg-panel"}`}
              >
                <div className="flex items-center gap-1 border-b border-border py-1 pl-3 pr-1 xl:pl-2 xl:pr-0">
                  <h3 id={`day-${d.date}`} className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                    <span aria-hidden="true" className="whitespace-nowrap">
                      <span className={`text-xs font-semibold uppercase ${isToday ? "text-accent" : "text-muted"}`}>{fmt(d.date, locale, { weekday: "short" })}</span>{" "}
                      <span className="font-opmono text-sm tabular-nums text-ink">{fmt(d.date, locale, { day: "numeric" })}</span>
                    </span>
                    <span className="sr-only">{isToday ? `${full}, ${t("cal.today")}` : full}</span>
                    {isToday && (
                      <span aria-hidden="true" className="text-xs font-medium text-accent">
                        {t("cal.today")}
                      </span>
                    )}
                  </h3>
                  <button type="button" onClick={() => onAdd(d.date)} aria-label={t("calendar.addOn", { day: full })} className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink">
                    <IconPlus size={16} />
                  </button>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-1.5 xl:p-1">
                  {d.events.length > 0 && (
                    <ul aria-label={t("cal.schoolItems")} className="space-y-0.5">
                      {d.events.map((e) => (
                        <EventRow key={e.id} e={e} classes={classes} today={today} locale={locale} />
                      ))}
                    </ul>
                  )}
                  {lines.length > 0 && (
                    <ul aria-label={t(d.when === "past" ? "cal.doneThatDay" : d.when === "today" ? "cal.planToday" : "cal.planned")} className={`space-y-0.5 ${d.events.length ? "border-t border-border pt-1" : ""}`}>
                      {lines.map((l) => (
                        <li key={l.key} className={`flex items-start gap-1.5 px-1.5 py-1 text-xs leading-snug xl:gap-1 xl:px-0.5 ${l.status === "planned" && !l.named ? "text-muted" : "text-ink"} ${l.named ? "font-medium" : ""}`}>
                          <Mark status={l.status} />
                          <span className="min-w-0 hyphens-auto break-words">
                            <span className="sr-only">{t(STATUS_WORD[l.status])}: </span>
                            {l.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {d.answers.n > 0 && <p className="px-1.5 font-opmono text-xs tabular-nums text-muted xl:px-1">{t("cal.answers", { n: d.answers.n, own: d.answers.own })}</p>}
                  {empty && <p className="px-1.5 py-1 text-xs text-muted">{t(d.when === "past" ? "cal.nothingDone" : "cal.nothingPlanned")}</p>}
                </div>
              </section>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Mark status="done" /> {t("cal.statusDone")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Mark status="todo" /> {t("cal.statusTodo")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Mark status="planned" /> {t("cal.statusPlanned")}
        </span>
        <span>{t("cal.plannedWhy")}</span>
        <span className="hidden xl:inline">{t("cal.keysHint")}</span>
      </div>
    </section>
  );
}
