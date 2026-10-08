"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { catalogueFor } from "@/catalogue";
import { IconArrowRight, IconTrash } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { itemTitle } from "@/components/today/TodayPlan";
import { Badge, Button, Notice, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { findLesson, neededHelp, startOfWeek } from "@/lib/activity";
import { addFromCatalogue } from "@/lib/courses";
import { lastActive, weekFacts } from "@/lib/family";
import { relativeDay, shortDate } from "@/lib/format";
import { nudgesFor } from "@/lib/nudges";
import { todayPlan } from "@/lib/plan";
import { addNote, removeNote } from "@/lib/profiles";
import { isReviewed } from "@/lib/review";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { useHandover } from "./Handover";
import { NudgeList } from "./NudgeList";

// One child at a glance, for the grown-up: anything that needs them, today's status and next step,
// the week in counted numbers, and the way into everything else. Nothing here is a score.

export function FamilyCard({ child, now }: { child: Profile; now: number }) {
  const t = useT();
  const locale = useLocale();
  const s = useStore((x) => x);
  const { facts, plan, nudges, last, help } = useMemo(
    () => ({
      facts: weekFacts(s, child.id, now),
      plan: todayPlan(s, child, now),
      nudges: nudgesFor(s, child.id, now),
      last: lastActive(s, child.id, now),
      help: neededHelp(s.activity.filter((e) => e.profileId === child.id), startOfWeek(now)),
    }),
    [s, child, now],
  );
  const safety = s.notes.filter((n) => n.profileId === child.id && n.from === "safety").sort((a, b) => b.at - a.at);
  const items = [...plan.lead, ...plan.more];
  const next = items.find((i) => !i.done);
  const handover = useHandover(child.id);
  const skill = (id: string) => getSkill(id)?.title[locale] ?? id;
  const courses = s.courses.filter((c) => c.profileId === child.id);

  const figures = [
    ["child.minutesSpent", facts.minutes + facts.readingMinutes],
    ["fam.sets", facts.sets],
    ["growth.finished", facts.lessons],
    ["growth.own", facts.own + facts.lessonChecks.own],
    ["fam.withHelp", facts.helped + facts.lessonChecks.helped],
    ["growth.missed", facts.missed + facts.lessonChecks.missed],
  ] as const;
  const quiet = figures.every(([, n]) => n === 0);
  const helpOn = [
    ...facts.helpOn.map(skill),
    ...help.slice(0, 3).map((e) => {
      const { course, lesson } = findLesson(courses, e.courseId, e.lessonId);
      const title = lesson?.title ?? course?.title;
      return title ? `“${title}”` : "";
    }),
  ].filter(Boolean);

  return (
    <article aria-labelledby={`child-${child.id}`} className="rounded-lg border border-border bg-panel shadow-soft">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
        <Avatar profile={child} size="sm" />
        <div className="mr-auto min-w-0">
          <h2 id={`child-${child.id}`} className="font-brand text-t3 font-semibold text-ink">
            {child.nickname}
          </h2>
          <p className="text-xs text-muted">
            {gradeLabel(locale, child.grade)} · {last ? t("family.lastActive", { when: relativeDay(last, now, locale) }) : t("family.never")}
          </p>
        </div>
        <Link href={`/family/${child.id}`} className={btn("secondary", "sm", "min-h-11")}>
          {t("family.details", { name: child.nickname })} <IconArrowRight size={14} />
        </Link>
      </header>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {safety.map((n) => (
          <p key={n.id} className="rounded-md border border-accent/60 px-4 py-3 text-sm text-ink">
            <span className="mr-1 font-semibold">{t("child.fromSafety")}</span>
            {n.text} <span className="font-opmono text-xs text-muted">· {shortDate(n.at, locale)}</span>
          </p>
        ))}

        <NudgeList child={child} nudges={nudges} />

        <section aria-labelledby={`today-${child.id}`} className="space-y-2">
          <h3 id={`today-${child.id}`} className="text-xs font-semibold text-muted">
            {t("child.today")}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="min-w-0 flex-1 basis-56 text-sm text-ink">
              {items.length === 0 ? (
                t("fam.todayNone")
              ) : (
                <>
                  {t("plan.progress", { done: plan.doneCount, total: items.length })}
                  {" · "}
                  {next ? t("child.nextUp", { what: itemTitle(next, locale) }) : t("fam.todayDone")}
                </>
              )}
            </p>
            <Link href="/home" onNavigate={handover("/home")} className={btn("secondary", "sm", "min-h-11")}>
              {t("fam.act.handover", { name: child.nickname })}
            </Link>
          </div>
        </section>

        <section aria-labelledby={`week-${child.id}`} className="space-y-3">
          <h3 id={`week-${child.id}`} className="text-xs font-semibold text-muted">
            {t("child.week")}
          </h3>
          {quiet ? (
            <p className="text-sm text-muted">{t("family.quiet")}</p>
          ) : (
            <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {figures.map(([label, n]) => (
                <div key={label} className="flex min-w-0 flex-col-reverse justify-end rounded-sm bg-panel2 px-3 py-2">
                  <dt className="text-xs leading-tight text-muted">{t(label)}</dt>
                  <dd className="font-opmono text-t2 font-semibold tabular-nums text-ink">{n}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="space-y-1.5 text-sm">
            {facts.proved.length > 0 && (
              <Line dot="bg-good" label={t("child.provedWeek")}>
                {facts.proved.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ", "}
                    {skill(id)}
                    {getSkill(id) && !isReviewed(s, getSkill(id)!) && (
                      <>
                        {" "}
                        <Badge>{t("practice.draft")}</Badge>
                      </>
                    )}
                  </span>
                ))}
              </Line>
            )}
            {facts.checksWaiting.length > 0 && <Line dot="bg-accent" label={t("child.checksWaiting")}>{facts.checksWaiting.map(skill).join(", ")}</Line>}
            {helpOn.length > 0 && <Line dot="bg-border" label={t("child.helpOn")}>{helpOn.join(", ")}</Line>}
          </ul>
          <Link href={`/growth?learner=${child.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-muted underline decoration-border underline-offset-4 hover:text-ink">
            {t("family.growth")}
          </Link>
        </section>

        <Extras child={child} />
      </div>
    </article>
  );
}

function Line({ dot, label, children }: { dot: string; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className={`mt-2 size-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0">
        <span className="font-medium text-ink">{label}: </span>
        <span className="text-ink">{children}</span>
      </span>
    </li>
  );
}

/** Notes for the family and assigning a ready-made course: there when wanted, folded away otherwise. */
function Extras({ child }: { child: Profile }) {
  const t = useT();
  const locale = useLocale();
  const notes = useStore((s) => s.notes.filter((n) => n.profileId === child.id).sort((a, b) => b.at - a.at));
  const taken = useStore((s) => s.courses.filter((c) => c.profileId === child.id && c.catalogueId).map((c) => c.catalogueId!).join("|"));
  const options = catalogueFor(child.grade, child.locale).filter((c) => !taken.split("|").includes(c.id));
  const [note, setNote] = useState("");
  const [assignId, setAssignId] = useState("");
  const [assigned, setAssigned] = useState(false);

  return (
    <details className="group rounded-md border border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-ink">
        {t("fam.extras")}
        {notes.length > 0 && <span className="font-opmono text-xs tabular-nums text-muted">· {t("fam.notesCount", { n: notes.length })}</span>}
        <span aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="grid gap-6 border-t border-border px-4 py-4 lg:grid-cols-2">
        <section aria-labelledby={`notes-${child.id}`} className="space-y-3">
          <h4 id={`notes-${child.id}`} className="text-xs font-semibold text-muted">
            {t("family.notes")}
          </h4>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              addNote(child.id, note);
              setNote("");
            }}
          >
            <label htmlFor={`note-${child.id}`} className="sr-only">
              {t("family.addNote")}
            </label>
            <textarea
              id={`note-${child.id}`}
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("family.notePlaceholder")}
              className="k-input resize-none text-sm"
            />
            <Button type="submit" size="sm" className="min-h-11" disabled={!note.trim()}>
              {t("family.addNote")}
            </Button>
          </form>
          {notes.length > 0 && (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 rounded-sm px-4 py-3 ${n.from === "safety" ? "border border-accent/60" : "bg-panel2"}`}>
                  <p className="min-w-0 flex-1 whitespace-pre-line break-words text-sm text-ink">
                    {n.from && <span className="mr-1 font-semibold">{t(n.from === "safety" ? "child.fromSafety" : "child.fromTutor")}</span>}
                    {n.text}
                  </p>
                  <span className="shrink-0 font-opmono text-xs text-muted">{shortDate(n.at, locale)}</span>
                  <button
                    type="button"
                    aria-label={t("family.deleteNote")}
                    onClick={() => removeNote(n.id)}
                    className="-my-1.5 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel hover:text-bad"
                  >
                    <IconTrash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {options.length > 0 && (
          <section className="space-y-2">
            <label htmlFor={`assign-${child.id}`} className="block text-xs font-semibold text-muted">
              {t("family.assign")}
            </label>
            <div className="flex flex-wrap gap-2">
              <select id={`assign-${child.id}`} className="k-input min-w-0 flex-1 basis-48 py-2.5 text-sm" value={assignId} onChange={(e) => (setAssignId(e.target.value), setAssigned(false))}>
                <option value="">{t("family.choose")}</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({gradeLabel(locale, c.grade, true)})
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary" className="min-h-11" disabled={!assignId} onClick={() => (addFromCatalogue(assignId, child.id, { assigned: true }), setAssignId(""), setAssigned(true))}>
                {t("family.assignTo", { name: child.nickname })}
              </Button>
            </div>
            {assigned && <Notice tone="good">{t("family.assigned", { name: child.nickname })}</Notice>}
          </section>
        )}
      </div>
    </details>
  );
}
