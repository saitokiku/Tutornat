"use client";

import Link from "next/link";
import { useState } from "react";
import type { CatalogueEntry } from "@/catalogue";
import { IconChevronDown, IconChevronUp, IconPlus } from "@/components/icons";
import { Badge, Button, SubjectDot, btn } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { courseProgress } from "@/lib/activity";
import { addFromCatalogue, moveCourse, pathOf, skillSummary, suggestNext } from "@/lib/courses";
import { statusesOf } from "@/lib/practice";
import { useStore } from "@/lib/store";
import type { ActivityEvent, Course, Profile, Subject } from "@/lib/types";
import { CourseArt } from "./CourseArt";
import { LangTag } from "./LangTag";
import { OriginBadge } from "./Origin";

const isYoung = (p: Profile) => p.grade === "K" || p.grade === "1" || p.grade === "2";

/** Puts focus back on a control after its row moved (a moved DOM node drops focus). */
function refocus(ids: string[]) {
  requestAnimationFrame(() => {
    for (const id of ids) {
      const el = document.getElementById(id) as HTMLButtonElement | HTMLAnchorElement | null;
      if (el && !(el instanceof HTMLButtonElement && el.disabled)) return el.focus();
    }
  });
}

/**
 * One subject on the learner's path: its courses in order, each with progress, the next lesson and a
 * way to continue; up/down buttons to reorder (tap or keyboard, no dragging); the skill map in one
 * line; and the ready-made course to add next.
 */
export function SubjectPath({ subject, learner, now }: { subject: Subject; learner: Profile; now: number }) {
  const t = useT();
  const path = useStore((s) => pathOf(s, learner.id, subject));
  const mine = useStore((s) => s.courses.filter((c) => c.profileId === learner.id));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id));
  const statuses = useStore((s) => statusesOf(s, learner.id, now));
  const [said, setSaid] = useState("");
  const name = t(`subject.${subject}`);
  const heading = `path-${subject}`;
  const summary = subject === "other" ? null : skillSummary(statuses, subject);
  const suggestion = suggestNext(mine, subject, learner.grade, learner.locale);

  const move = (course: Course, i: number, direction: "up" | "down") => {
    if (!moveCourse(course.id, direction)) return;
    setSaid(t("crs.moved", { title: course.title, n: direction === "up" ? i : i + 2, total: path.length, subject: name }));
    refocus([`move-${direction}-${course.id}`, `move-${direction === "up" ? "down" : "up"}-${course.id}`]);
  };
  const add = (entry: CatalogueEntry) => {
    const id = addFromCatalogue(entry.id, learner.id);
    if (id) refocus([`course-${id}`]);
  };

  return (
    <section aria-labelledby={heading} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 id={heading} className="flex items-center gap-2 font-brand text-t3 font-semibold text-ink">
          <SubjectDot subject={subject} /> {name}
        </h3>
        {summary && (
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
            <span className="font-opmono tabular-nums">{t("crs.skills", summary)}</span>
            <Link
              href={`/practice?subject=${subject}`}
              aria-label={t("crs.skillMapFor", { subject: name })}
              className="inline-flex min-h-11 items-center font-medium text-ink underline decoration-border underline-offset-4 hover:text-accent"
            >
              {t("crs.skillMap")}
            </Link>
          </p>
        )}
      </div>

      {path.length > 0 ? (
        <ol aria-label={t("crs.pathOf", { subject: name })} className="divide-y divide-border rounded-md border border-border bg-panel">
          {path.map((course, i) => (
            <PathRow key={course.id} course={course} events={events} learner={learner} first={i === 0} last={i === path.length - 1} onMove={(d) => move(course, i, d)} />
          ))}
        </ol>
      ) : (
        <p className="rounded-md border border-dashed border-border px-4 py-4 text-sm text-muted sm:px-5">{t("crs.emptySubject", { subject: name })}</p>
      )}

      {suggestion && <SuggestRow entry={suggestion} learner={learner} onAdd={() => add(suggestion)} />}
      <p role="status" className="sr-only">
        {said}
      </p>
    </section>
  );
}

function PathRow({
  course,
  events,
  learner,
  first,
  last,
  onMove,
}: {
  course: Course;
  events: ActivityEvent[];
  learner: Profile;
  first: boolean;
  last: boolean;
  onMove: (d: "up" | "down") => void;
}) {
  const t = useT();
  const p = courseProgress(course, events);
  const outlineOnly = course.lessons.every((l) => l.scenes.length === 0);
  const target = p.next ?? course.lessons[0];
  const action = p.total > 0 && p.done === p.total ? t("course.again") : p.started ? t("course.continue") : t("course.start");
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3.5 sm:flex-nowrap sm:px-5">
      <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
        <CourseArt lessons={course.lessons} subject={course.subject} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            id={`course-${course.id}`}
            href={`/courses/${course.id}`}
            lang={course.locale}
            className="block text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            {course.title}
          </Link>
          <p className="mt-0.5 font-opmono text-xs tabular-nums text-muted">
            {t("courses.progress", { done: p.done, total: p.total })}
            {outlineOnly ? ` · ${t("course.outlineOnly")}` : p.next ? ` · ` : ` · ${t("crs.allDone")}`}
            {!outlineOnly && p.next && <span lang={course.locale}>{t("crs.next", { lesson: p.next.title })}</span>}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {course.assigned && <Badge tone="good">{t("course.fromGrownUp")}</Badge>}
            <OriginBadge course={course} />
            <LangTag course={course.locale} learner={learner.locale} />
          </div>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {!outlineOnly && target && (
          <Link
            href={`/learn/${course.id}/${target.id}`}
            aria-label={t("crs.actionOn", { action, title: course.title })}
            className={btn("secondary", "md", isYoung(learner) ? "min-h-14 px-6 text-t3" : "")}
          >
            {action}
          </Link>
        )}
        <MoveButton id={`move-up-${course.id}`} label={t("gen.moveUp", { title: course.title })} disabled={first} onClick={() => onMove("up")}>
          <IconChevronUp size={18} />
        </MoveButton>
        <MoveButton id={`move-down-${course.id}`} label={t("gen.moveDown", { title: course.title })} disabled={last} onClick={() => onMove("down")}>
          <IconChevronDown size={18} />
        </MoveButton>
      </div>
    </li>
  );
}

function MoveButton({ label, children, ...props }: { id: string; label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} {...props} className="grid size-11 place-items-center rounded-full text-muted hover:bg-panel2 hover:text-ink disabled:opacity-25">
      {children}
    </button>
  );
}

function SuggestRow({ entry, learner, onAdd }: { entry: CatalogueEntry; learner: Profile; onAdd: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border px-4 py-3.5 sm:flex-nowrap sm:px-5">
      <div className="flex min-w-0 flex-1 basis-56 items-start gap-3">
        <CourseArt lessons={entry.lessons} subject={entry.subject} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            <span lang={entry.locale}>{entry.title}</span>
            <LangTag course={entry.locale} learner={learner.locale} />
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted" lang={entry.locale}>
            {entry.summary}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("crs.suggestedFor", { grade: gradeLabel(learner.locale, learner.grade) })} ·{" "}
            <span className="whitespace-nowrap font-opmono">
              {gradeLabel(learner.locale, entry.grade, true)} · {t("course.lessons", { n: entry.lessons.length })}
            </span>{" "}
            · {t("crs.origin.people")}
          </p>
        </div>
      </div>
      <Button variant="secondary" className="ml-auto" aria-label={t("crs.addNamed", { title: entry.title })} onClick={onAdd}>
        <IconPlus size={16} /> {t("crs.addToPath")}
      </Button>
    </div>
  );
}
