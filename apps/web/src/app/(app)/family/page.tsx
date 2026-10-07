"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { catalogueFor } from "@/catalogue";
import { Guard } from "@/components/gate";
import { IconArrowRight, IconTrash } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { Button, EmptyState, Notice, btn } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { findLesson, neededHelp, startOfWeek, summarizeWeek } from "@/lib/activity";
import { addFromCatalogue } from "@/lib/courses";
import { relativeDay, shortDate } from "@/lib/format";
import { addNote, learnersOf, removeNote, selectLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function FamilyPage() {
  return (
    <Guard need="parent">
      <Family />
    </Guard>
  );
}

function Family() {
  const t = useT();
  const kids = useStore(learnersOf);
  const [now] = useState(() => Date.now());
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("family.title")}</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">{t("family.body")}</p>
      </div>
      {kids.length === 0 ? (
        <EmptyState
          title={t("family.empty")}
          action={
            <Link href="/profiles" className={btn("secondary")}>
              {t("profiles.add")}
            </Link>
          }
        />
      ) : (
        kids.map((k) => <ChildCard key={k.id} child={k} now={now} />)
      )}
    </div>
  );
}

function ChildCard({ child, now }: { child: Profile; now: number }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const events = useStore((s) => s.activity.filter((e) => e.profileId === child.id));
  const courses = useStore((s) => s.courses.filter((c) => c.profileId === child.id));
  const notes = useStore((s) => s.notes.filter((n) => n.profileId === child.id).sort((a, b) => b.at - a.at));
  const [note, setNote] = useState("");
  const [assignId, setAssignId] = useState("");
  const [assigned, setAssigned] = useState(false);

  const week = startOfWeek(now);
  const w = summarizeWeek(events, week);
  const help = neededHelp(events, week).slice(0, 4);
  const last = events.reduce((m, e) => Math.max(m, e.at), 0);
  const options = catalogueFor(child.grade, child.locale).filter((c) => !courses.some((x) => x.catalogueId === c.id));

  return (
    <article aria-labelledby={`child-${child.id}`} className="rounded-lg border border-border bg-panel shadow-soft">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
        <Avatar profile={child} size="sm" />
        <div className="min-w-0">
          <h2 id={`child-${child.id}`} className="font-brand text-t3 font-semibold text-ink">
            {child.nickname}
          </h2>
          <p className="text-xs text-muted">
            {gradeLabel(locale, child.grade)} · {last ? t("family.lastActive", { when: relativeDay(last, now, locale) }) : t("family.never")}
          </p>
        </div>
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => (selectLearner(child.id), router.push("/home"))}>
          {t("family.openAs", { name: child.nickname })} <IconArrowRight size={14} />
        </Button>
      </header>

      <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
        <section className="space-y-4">
          {w.started + w.finished + w.own + w.help + w.missed === 0 ? (
            <p className="text-sm text-muted">{t("family.quiet")}</p>
          ) : (
            <dl className="grid grid-cols-4 gap-2">
              {(
                [
                  ["growth.finished", w.finished],
                  ["growth.own", w.own],
                  ["growth.help", w.help],
                  ["growth.missed", w.missed],
                ] as const
              ).map(([label, n]) => (
                <div key={label} className="flex flex-col-reverse rounded-sm bg-panel2 px-3 py-2">
                  <dt className="text-[11px] leading-tight text-muted">{t(label)}</dt>
                  <dd className="font-opmono text-t2 font-semibold tabular-nums text-ink">{n}</dd>
                </div>
              ))}
            </dl>
          )}
          <div>
            <h3 className="text-xs font-semibold text-muted">{t("family.neededHelp")}</h3>
            {help.length === 0 ? (
              <p className="mt-1 text-sm text-muted">{t("family.noHelp")}</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {help.map((e) => {
                  const { course, lesson } = findLesson(courses, e.courseId, e.lessonId);
                  return (
                    <li key={e.id} className="text-sm text-ink">
                      {lesson?.title ?? course?.title} <span className="text-muted">· {course?.title}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Link href={`/growth?learner=${child.id}`} className="inline-flex text-sm font-medium text-muted underline decoration-border underline-offset-4 hover:text-ink">
            {t("family.growth")}
          </Link>

          {options.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <label htmlFor={`assign-${child.id}`} className="block text-xs font-semibold text-muted">
                {t("family.assign")}
              </label>
              <div className="flex flex-wrap gap-2">
                <select id={`assign-${child.id}`} className="k-input min-w-0 flex-1 py-2.5 text-sm" value={assignId} onChange={(e) => (setAssignId(e.target.value), setAssigned(false))}>
                  <option value="">{t("family.choose")}</option>
                  {options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({gradeLabel(locale, c.grade, true)})
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" disabled={!assignId} onClick={() => (addFromCatalogue(assignId, child.id), setAssignId(""), setAssigned(true))}>
                  {t("family.assignTo", { name: child.nickname })}
                </Button>
              </div>
              {assigned && <Notice tone="good">{t("family.assigned", { name: child.nickname })}</Notice>}
            </div>
          )}
        </section>

        <section aria-labelledby={`notes-${child.id}`} className="space-y-3">
          <h3 id={`notes-${child.id}`} className="text-xs font-semibold text-muted">
            {t("family.notes")}
          </h3>
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
            <Button type="submit" size="sm" disabled={!note.trim()}>
              {t("family.addNote")}
            </Button>
          </form>
          {notes.length > 0 && (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start gap-3 rounded-sm bg-panel2 px-4 py-3">
                  <p className="min-w-0 flex-1 whitespace-pre-line break-words text-sm text-ink">{n.text}</p>
                  <span className="shrink-0 font-opmono text-xs text-muted">{shortDate(n.at, locale)}</span>
                  <button
                    type="button"
                    aria-label={t("family.deleteNote")}
                    onClick={() => removeNote(n.id)}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-panel hover:text-bad"
                  >
                    <IconTrash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
