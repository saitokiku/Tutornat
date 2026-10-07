"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { matchEntry } from "@/catalogue";
import { CourseArt } from "@/components/courses/CourseArt";
import { NotFound } from "@/components/courses/NotFound";
import { OriginBadge } from "@/components/courses/Origin";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { OutlineEditor } from "@/components/generation/OutlineEditor";
import { sourceLine, type StepLine } from "@/components/generation/steps";
import { IconArrowLeft, IconArrowRight, IconCheck, IconMinus, IconRefresh, IconX } from "@/components/icons";
import { Button, Notice, Spinner, SubjectDot } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { addFromCatalogue, finishDraft, getCourse, removeCourse, saveCourse } from "@/lib/courses";
import { aiStatus } from "@/lib/ai/client";
import { generateOutline } from "@/lib/generate";
import { recentSkills } from "@/lib/practice";
import { isReviewed } from "@/lib/review";
import { KIND_TAG } from "@/lib/files";
import { currentLearner } from "@/lib/profiles";
import { buildSourceCourse, knowFetchers, topicOf, type SourceStep } from "@/lib/source-course";
import { read, useStore } from "@/lib/store";
import type { Course, Lesson, Profile } from "@/lib/types";
import { getSkill } from "@/practice/skills";

export default function DraftPage() {
  return (
    <Guard need="learner">
      <Draft />
    </Guard>
  );
}

type Step = StepLine & { at: number };
/** auto: the AI writer when connected, else real sources. sources / template: what the family picked. */
type Mode = "auto" | "sources" | "template";
type Note = "gates" | "offline" | "nothing" | null;

const STEP_ICON = { found: IconCheck, none: IconMinus, failed: IconX } as const;
const STEP_TONE = { found: "text-good", none: "text-muted", failed: "text-warn" } as const;

function Draft() {
  const t = useT();
  useTitle(t("gen.title"));
  const router = useRouter();
  const { draftId } = useParams<{ draftId: string }>();
  const fresh = useSearchParams().get("fresh") === "1";
  const learner = useStore(currentLearner) as Profile;
  const draft = useStore((s) => getCourse(s, draftId, learner.id));
  const [lessons, setLessons] = useState<Lesson[]>(draft?.lessons ?? []);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [running, setRunning] = useState(Boolean(fresh && draft?.status === "outlining" && !draft.lessons.length));
  const [steps, setSteps] = useState<Step[]>([]);
  const [started, setStarted] = useState(() => Date.now());
  const [now, setNow] = useState(started);
  const ctrl = useRef<AbortController | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [note, setNote] = useState<Note>(null);

  const step = (line: StepLine) => setSteps((s) => [...s, { ...line, at: Date.now() }]);

  /** Lessons from real sources, no AI. Nothing found stays nothing: the page says so. */
  const fromSources = async (course: Course, c: AbortController) => {
    const topic = topicOf(course.goal, [learner.nickname]);
    const found: SourceStep[] = [];
    const built = await buildSourceCourse(course.goal, course.grade, course.locale, knowFetchers, {
      subject: course.subject,
      length: course.length,
      avoid: [learner.nickname],
      signal: c.signal,
      onStep: (s) => (found.push(s), step(sourceLine(s, topic))),
      reviewed: (id) => {
        const skill = getSkill(id);
        return !!skill && isReviewed(read(), skill);
      },
    });
    if (c.signal.aborted) return;
    setLessons(built.lessons);
    if (!built.lessons.length) return setNote("nothing");
    if (found.some((s) => "failed" in s && s.failed === "offline")) setNote((n) => n ?? "offline");
    saveCourse({ ...course, lessons: built.lessons, citations: built.citations, template: false, ai: undefined });
  };

  // Reads the outline stream or builds from sources; state only changes from their events, so it can run inside an effect.
  const build = async (course: Course, c: AbortController, mode: Mode = "auto") => {
    setFailed(null);
    setSkipped([]);
    setNote(null);
    try {
      const ai = mode === "auto" && (await aiStatus()) !== "demo";
      if (c.signal.aborted) return;
      // Real sources need a topic to look up; a request that is only attached files gets the template.
      const searchable = topicOf(course.goal, [learner.nickname]).length >= 2;
      if (searchable && (mode === "sources" || (mode === "auto" && !ai))) return await fromSources(course, c);
      const req = {
        goal: course.goal,
        grade: course.grade,
        subject: course.subject,
        length: course.length,
        locale: course.locale,
        sources: course.sources,
        interests: learner.interests,
        working: recentSkills(read(), learner.id, Date.now()).slice(0, 6),
      };
      const got: Lesson[] = [];
      let error: string | null = null;
      let skippedAny = false;
      for await (const e of generateOutline(req, c.signal, 550, ai)) {
        if (e.type === "step") step({ key: `gen.step.${e.step}`, tone: "found" });
        if (e.type === "lesson") {
          got.push(e.lesson);
          setLessons([...got]);
          step({ key: "gen.lessonArrived", vars: { n: got.length }, tone: "found" });
        }
        if (e.type === "skipped") {
          skippedAny = true;
          setSkipped((s) => [...s, e.title]);
        }
        if (e.type === "error") error = e.error;
      }
      if (c.signal.aborted) return;
      if (got.length) return saveCourse({ ...course, lessons: got, template: !ai, ai: ai || undefined, citations: undefined });
      // The writer failed its own quality gates on every lesson: build from real sources instead, and say so.
      if (ai && skippedAny && !error) {
        setNote("gates");
        return await fromSources(course, c);
      }
      if (error) setFailed(error);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote("nothing");
    } finally {
      if (!c.signal.aborted) setRunning(false);
    }
  };

  const restart = (course: Course, mode: Mode = "auto") => {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setLessons([]);
    setSteps([]);
    setRunning(true);
    setStarted(Date.now());
    void build(course, ctrl.current, mode);
  };

  // Start automatically when arriving from the magic box; abort if the page goes away.
  useEffect(() => {
    if (!(fresh && draft && draft.status === "outlining" && draft.lessons.length === 0)) return;
    const c = (ctrl.current = new AbortController());
    void build(draft, c);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per arrival
  }, [draftId, fresh]);

  // A course that was already created is not a draft any more (e.g. reached again with Back).
  const ready = draft?.status === "ready";
  useEffect(() => {
    if (ready) router.replace(`/courses/${draftId}`);
  }, [ready, draftId, router]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!draft) return <NotFound />;
  if (ready) return null;

  const backToBox = () => {
    ctrl.current?.abort();
    router.push(`/courses/new?goal=${encodeURIComponent(draft.goal)}`);
    if (draft.status === "outlining") removeCourse(draft.id);
  };
  const create = () => {
    const clean = lessons.map((l) => ({ ...l, title: l.title.trim() || t("gen.newLesson") }));
    finishDraft(draft.id, learner.id, { title: title.trim() || draft.title, lessons: clean });
    router.push(`/courses/${draft.id}`);
  };

  const stale = !running && lessons.length === 0 && note !== "nothing" && !failed;
  const match = matchEntry(draft.goal, draft.grade, learner.locale);
  const useMatch = () => {
    if (!match) return;
    const id = addFromCatalogue(match.id, learner.id);
    if (!id) return;
    router.push(`/learn/${id}/${match.lessons[0].id}`);
    if (draft.status === "outlining") removeCourse(draft.id);
  };
  const elapsed = Math.max(0, Math.round(((running ? now : (steps.at(-1)?.at ?? started)) - started) / 1000));
  const sourced = Boolean(draft.citations) && !draft.ai;

  return (
    <div className="space-y-8">
      <Link href="/home" className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink">
        <IconArrowLeft size={16} /> {t("nav.home")}
      </Link>

      <header className="space-y-4">
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("gen.title")}</h1>
        <div className="rounded-md border border-border bg-panel2 px-5 py-4">
          <p className="text-xs font-medium text-muted">{t("gen.request")}</p>
          <p className="mt-1 whitespace-pre-line break-words text-body text-ink">{draft.goal || "—"}</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <SubjectDot subject={draft.subject} /> {t(`subject.${draft.subject}` as const)}
            </span>
            <span>{gradeLabel(learner.locale, draft.grade)}</span>
            <span>{t(`box.length.${draft.length}` as const)}</span>
            <span>{t(`lang.${draft.locale}` as const)}</span>
            {draft.sources.map((f) => (
              <span key={f.id} className="font-opmono">
                {KIND_TAG[f.kind]} {f.name}
              </span>
            ))}
          </p>
        </div>
      </header>

      {(running || steps.length > 0) && (
        <section aria-label={t("gen.title")} className="rounded-md border border-border bg-panel px-5 py-4">
          <ol className="space-y-1.5">
            {steps.map((s, i) => {
              const Icon = STEP_ICON[s.tone];
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink animate-fade-up">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${STEP_TONE[s.tone]}`} />
                  <span className="min-w-0 flex-1">{t(s.key, s.vars)}</span>
                  <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">{Math.round((s.at - started) / 1000)}s</span>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
            {running ? (
              <>
                <Spinner className="text-accent" />
                <span className="font-opmono text-xs tabular-nums text-muted">{elapsed}s</span>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={backToBox}>
                  {t("gen.cancel")}
                </Button>
              </>
            ) : (
              lessons.length > 0 && <p className="text-sm text-ink">{t("gen.done")}</p>
            )}
          </div>
          <p role="status" className="sr-only">
            {steps.length ? t(steps.at(-1)!.key, steps.at(-1)!.vars) : ""}
          </p>
        </section>
      )}

      {note === "gates" && <Notice>{t("crs.gatesNote")}</Notice>}
      {note === "offline" && !running && (
        <Notice
          tone="warn"
          action={
            <Button size="sm" variant="secondary" onClick={() => restart(draft, "sources")}>
              <IconRefresh size={14} /> {t("common.retry")}
            </Button>
          }
        >
          {t("crs.offlineNote")}
        </Notice>
      )}
      {note === "nothing" && !running && (
        <Notice
          tone="warn"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={backToBox}>
                {t("gen.editRequest")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => restart(draft, "template")}>
                {t("gen.useTemplate")}
              </Button>
              <Button size="sm" onClick={() => restart(draft, "sources")}>
                <IconRefresh size={14} /> {t("common.retry")}
              </Button>
            </div>
          }
        >
          {t("crs.nothing")}
        </Notice>
      )}

      {stale && (
        <Notice
          tone="warn"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={backToBox}>
                {t("gen.editRequest")}
              </Button>
              <Button size="sm" onClick={() => restart(draft)}>
                <IconRefresh size={14} /> {t("gen.rebuild")}
              </Button>
            </div>
          }
        >
          {t("gen.stale")}
        </Notice>
      )}

      {match && !running && (
        <section aria-labelledby="match" className="rounded-md border border-good/30 bg-good/5 p-4">
          <h2 id="match" className="text-sm font-semibold text-ink">
            {t("gen.match")}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <div className="w-24 shrink-0">
              <CourseArt lessons={match.lessons} subject={match.subject} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink" lang={match.locale}>
                {match.title}
              </p>
              <p className="mt-1 text-xs text-muted" lang={match.locale}>
                {match.summary}
              </p>
            </div>
            <Button size="sm" onClick={useMatch}>
              {t("gen.useMatch")} <IconArrowRight size={14} />
            </Button>
          </div>
        </section>
      )}

      {failed && !running && (
        <Notice
          tone="warn"
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => restart(draft)}>
                {t("common.retry")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => restart(draft, "sources")}>
                {t("crs.useSources")}
              </Button>
            </div>
          }
        >
          {t(failed === "rate" ? "gen.errRate" : "gen.errModel")}
        </Notice>
      )}
      {skipped.length > 0 && !running && <p className="text-sm text-muted">{t("gen.skipped", { titles: skipped.join(", ") })}</p>}

      {lessons.length > 0 && (
        <section aria-labelledby="outline" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="outline" className="font-brand text-t2 font-semibold text-ink">
              {t("gen.lessons")}
            </h2>
            {!running && <OriginBadge course={draft} />}
          </div>
          {!running && (
            <div className="space-y-1.5">
              <label htmlFor="course-title" className="block text-sm font-medium text-ink">
                {t("gen.courseTitle")}
              </label>
              <input id="course-title" className="k-input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}
          <OutlineEditor lessons={lessons} onChange={setLessons} locked={running} />
          {!running && draft.template && !sourced && <p className="text-xs text-muted">{t("gen.templateNote")}</p>}
          {!running && sourced && <p className="text-xs text-muted">{t("crs.sourcesNote")}</p>}
          {!running && (
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
              <Button variant="ghost" onClick={backToBox}>
                {t("gen.editRequest")}
              </Button>
              <Button onClick={create}>
                {t("gen.create")} <IconArrowRight size={16} />
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
