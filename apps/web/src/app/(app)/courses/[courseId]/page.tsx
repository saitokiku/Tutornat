"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LangTag, subjectKey } from "@/components/courses/LangTag";
import { NotFound } from "@/components/courses/NotFound";
import { OriginBadge } from "@/components/courses/Origin";
import { isYoung } from "@/components/courses/Path";
import { Related } from "@/components/courses/Related";
import { CoursePractice, CourseSources } from "@/components/courses/Sources";
import { ParentGate } from "@/components/profiles/ParentGate";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowLeft, IconArrowRight, IconCheck, IconTrash } from "@/components/icons";
import { Badge, Button, Notice, SubjectDot, btn } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { courseProgress, lessonState } from "@/lib/activity";
import { courseOrigin, getCourse, removeCourse } from "@/lib/courses";
import { KIND_TAG, sizeLabel } from "@/lib/files";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function CoursePage() {
  return (
    <Guard need="learner">
      <CourseView />
    </Guard>
  );
}

function CourseView() {
  const t = useT();
  const router = useRouter();
  const { courseId } = useParams<{ courseId: string }>();
  const learner = useStore(currentLearner) as Profile;
  const course = useStore((s) => getCourse(s, courseId, learner.id));
  useTitle(course?.title ?? t("common.notFound.title"));
  const events = useStore((s) => s.activity.filter((e) => e.profileId === learner.id && e.courseId === courseId));
  const [confirm, setConfirm] = useState(false);
  const [gate, setGate] = useState(false);
  const unlocked = useStore((s) => Boolean(s.session.unlocked));

  if (!course) return <NotFound />;
  if (course.status === "outlining")
    return (
      <Notice
        tone="warn"
        action={
          <Link href={`/courses/new/${course.id}`} className={btn("primary")}>
            {t("gen.rebuild")}
          </Link>
        }
      >
        {t("gen.stale")}
      </Notice>
    );

  const p = courseProgress(course, events);
  const outlineOnly = course.lessons.every((l) => l.scenes.length === 0);
  const target = p.next ?? course.lessons[0];
  const cta = p.done === p.total ? t("course.again") : p.started ? t("course.continue") : t("course.start");

  return (
    <div className="space-y-10">
      <Link href="/courses" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink">
        <IconArrowLeft size={16} /> {t("nav.learn")}
      </Link>

      <header className="space-y-4">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <SubjectDot subject={course.subject} />
          {t(subjectKey(course.subject, course.locale))} · {gradeLabel(learner.locale, course.grade)}
          {course.assigned && <Badge tone="good">{t("course.fromGrownUp")}</Badge>}
          <OriginBadge course={course} />
          <LangTag course={course.locale} learner={learner.locale} />
        </p>
        <h1 lang={course.locale} className="font-brand text-t1 font-semibold text-balance text-ink sm:text-d3">
          {course.title}
        </h1>
        {course.goal && course.goal.trim().toLowerCase() !== course.title.toLowerCase() && (
          <p lang={course.locale} className="max-w-prose text-body text-muted">
            {course.goal}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          {!outlineOnly && (
            <Link href={`/learn/${course.id}/${target.id}`} className={btn("primary", "md", isYoung(learner) ? "min-h-14 px-7 text-t3" : "")}>
              {cta} <IconArrowRight size={16} />
            </Link>
          )}
          <span className="font-opmono text-xs tabular-nums text-muted">{t("courses.progress", { done: p.done, total: p.total })}</span>
        </div>
      </header>

      {outlineOnly && (
        <section className="space-y-3">
          <Notice>{t("course.outlineNote")}</Notice>
          <Related course={course} learner={learner} />
        </section>
      )}

      <section aria-labelledby="lessons">
        <h2 id="lessons" className="mb-3 font-brand text-t2 font-semibold text-ink">
          {t("gen.lessons")}
        </h2>
        <ol className="divide-y divide-border overflow-hidden rounded-md border border-border bg-panel">
          {course.lessons.map((l, i) => {
            const state = lessonState(events, course.id, l.id);
            return (
              <li key={l.id}>
                <Link href={`/learn/${course.id}/${l.id}`} className="group flex items-start gap-4 px-4 py-4 hover:bg-panel2/60 sm:px-5">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border font-opmono text-xs tabular-nums ${
                      state === "done" ? "border-good bg-good text-paper" : state === "started" ? "border-accent text-accent" : "border-border text-muted"
                    }`}
                  >
                    {state === "done" ? <IconCheck size={14} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span lang={course.locale} className="block text-sm font-semibold text-ink">
                      {l.title}
                    </span>
                    {l.summary && (
                      <span lang={course.locale} className="mt-0.5 block text-xs text-muted">
                        {l.summary}
                      </span>
                    )}
                    <span className="mt-1.5 block font-opmono text-xs text-muted">
                      {t(`course.lesson${state === "done" ? "Done" : state === "started" ? "Started" : "New"}` as const)} · {t("common.minutes", { n: l.minutes })} ·{" "}
                      {l.scenes.length ? t("course.scenes", { n: l.scenes.length }) : t("course.outlineOnly")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {(course.origin === "catalogue" || courseOrigin(course) === "sources" || course.lessons.some((l) => l.practice?.length)) && <CoursePractice course={course} learner={learner} />}
      <CourseSources course={course} />

      {course.sources.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted">{t("course.request")}</h2>
          <ul className="space-y-1">
            {course.sources.map((f) => (
              <li key={f.id} className="font-opmono text-xs text-muted">
                {KIND_TAG[f.kind]} · {f.name} · {sizeLabel(f.size)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-border pt-6">
        {confirm ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink">{t("course.deleteConfirm")}</p>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              {t("common.cancel")}
            </Button>
            <button
              type="button"
              autoFocus
              onClick={() => (router.push("/courses"), removeCourse(course.id))}
              className="k-btn bg-bad text-paper hover:bg-bad/90"
            >
              {t("common.confirmDelete")}
            </button>
          </div>
        ) : gate ? (
          <ParentGate onPass={() => (setGate(false), setConfirm(true))} onCancel={() => setGate(false)} />
        ) : (
          <Button variant="ghost" onClick={() => (unlocked ? setConfirm(true) : setGate(true))}>
            <IconTrash size={14} /> {t("course.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
