"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CourseArt } from "@/components/courses/CourseArt";
import { NotFound } from "@/components/courses/NotFound";
import { OriginBadge } from "@/components/courses/Origin";
import { isYoung } from "@/components/courses/Path";
import { useTitle } from "@/components/LangSync";
import { IconArrowLeft, IconArrowRight, IconCheck, IconMinus, IconRefresh, IconX } from "@/components/icons";
import { Button, Notice, Spinner, SubjectDot, btn } from "@/components/ui";
import { gradeLabel, useT } from "@/i18n";
import { aiStatus } from "@/lib/ai/client";
import { screen, type Screen } from "@/lib/ai/safety";
import { addFromCatalogue, finishDraft, getCourse, removeCourse, saveCourse } from "@/lib/courses";
import { KIND_TAG } from "@/lib/files";
import { generateOutline } from "@/lib/generate";
import { recentSkills } from "@/lib/practice";
import { addNote, currentLearner } from "@/lib/profiles";
import { isReviewed } from "@/lib/review";
import { buildSourceCourse, keepCitations, knowFetchers, namesOnAccount, readyMadeMatch, sourcesUsed, topicOf, type Fetchers, type SourceStep } from "@/lib/source-course";
import { read, useStore } from "@/lib/store";
import type { Course, Lesson, Profile } from "@/lib/types";
import { getSkill } from "@/practice/skills";
import { OutlineEditor } from "./OutlineEditor";
import { sourceLine, type StepLine } from "./steps";

type Step = StepLine & { at: number };
/** auto: the AI writer when connected, else real sources. sources / template: what the family picked. */
type Mode = "auto" | "sources" | "template";
/** What the page has to say after a build: offline, nothing found, or something broke. */
type Note = "offline" | "nothing" | "error" | null;
type Stop = Exclude<Screen, { kind: "ok" }>;

const STEP_ICON = { found: IconCheck, none: IconMinus, failed: IconX } as const;
const STEP_TONE = { found: "text-good", none: "text-muted", failed: "text-warn" } as const;

/**
 * The course builder: reads the request, screens it, then builds the outline (the AI writer when this
 * deployment has one, real sources otherwise or when the writer's lessons fail its gates, a template
 * when there is nothing to look up), says what each step found, and lets the family edit and create it.
 * `fetchers` is injectable for tests; the page uses the browser's /api/know.
 */
export function Draft({ fetchers = knowFetchers }: { fetchers?: Fetchers }) {
  const t = useT();
  useTitle(t("gen.title"));
  const router = useRouter();
  const { draftId } = useParams<{ draftId: string }>();
  const fresh = useSearchParams().get("fresh") === "1";
  const learner = useStore(currentLearner) as Profile;
  const draft = useStore((s) => getCourse(s, draftId, learner.id));
  const names = useStore((s) => namesOnAccount(s, learner.accountId));
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
  const [gates, setGates] = useState(false);
  const [stopped, setStopped] = useState<Stop | null>(null);

  const step = (line: StepLine) => setSteps((s) => [...s, { ...line, at: Date.now() }]);

  /** A request the safety screen stops never leaves the device: the fixed reply, a note for grown-ups, and no draft kept. */
  const stopForSafety = (course: Course, s: Stop) => {
    setStopped(s);
    if (s.kind !== "offLimits") addNote(learner.id, t(s.kind === "abuse" ? "crs.safetyNoteAbuse" : "crs.safetyNoteCrisis"), "safety");
    removeCourse(course.id);
  };

  /** Lessons from real sources, no AI. Nothing found stays nothing, and offline is said as offline. */
  const fromSources = async (course: Course, c: AbortController, avoid: string[]) => {
    const topic = topicOf(course.goal, avoid);
    const found: SourceStep[] = [];
    const built = await buildSourceCourse(course.goal, course.grade, course.locale, fetchers, {
      subject: course.subject,
      length: course.length,
      avoid,
      signal: c.signal,
      onStep: (s) => (found.push(s), step(sourceLine(s, topic, learner.locale))),
      reviewed: (id) => {
        const skill = getSkill(id);
        return !!skill && isReviewed(read(), skill);
      },
    });
    if (c.signal.aborted) return;
    setLessons(built.lessons);
    if (found.some((s) => "failed" in s && s.failed === "offline")) setNote("offline");
    else if (!built.lessons.length) setNote("nothing");
    if (built.lessons.length) saveCourse({ ...course, lessons: built.lessons, citations: built.citations, template: false, ai: undefined });
  };

  // Builds from the AI writer, real sources or the template; state only changes from their events, so it can run inside an effect.
  const build = async (course: Course, c: AbortController, mode: Mode = "auto") => {
    // Yield once, so a remount (strict mode runs effects twice) aborts this run before anything happens.
    await Promise.resolve();
    if (c.signal.aborted) return;
    setFailed(null);
    setSkipped([]);
    setNote(null);
    setGates(false);
    try {
      // The safety screen runs before anything leaves the device, whichever way the course is built: on
      // the goal and the attached files' names (the template and the writer both read them).
      const s = screen([course.goal, ...course.sources.map((f) => f.name)].join("\n"), learner.locale);
      if (s.kind !== "ok") return stopForSafety(course, s);
      const avoid = namesOnAccount(read(), learner.accountId);
      // Real sources need a topic to look up; a request that is only attached files gets the template.
      const searchable = topicOf(course.goal, avoid).length >= 2;
      const ai = mode === "auto" && (await aiStatus()) !== "demo";
      if (c.signal.aborted) return;
      if (searchable && (mode === "sources" || (mode === "auto" && !ai))) return await fromSources(course, c, avoid);
      const req = {
        goal: course.goal,
        grade: course.grade,
        subject: course.subject,
        length: course.length,
        locale: course.locale,
        sources: course.sources,
        // A grown-up's interest the screen would stop ("vaping") is left out, not the whole course;
        // the server screens what it gets as well and stops the request instead.
        interests: learner.interests?.filter((i) => screen(i, learner.locale).kind === "ok"),
        working: recentSkills(read(), learner.id, Date.now()).slice(0, 6),
      };
      const got: Lesson[] = [];
      let error: string | null = null;
      let skippedAny = false;
      let done = false;
      for await (const e of generateOutline(req, c.signal, 550, ai)) {
        if (e.type === "step") step({ key: `gen.step.${e.step}`, tone: "found" });
        if (e.type === "lesson") {
          got.push(e.lesson);
          setLessons([...got]);
          step({ key: "gen.lessonArrived", vars: { n: got.length }, tone: "found" });
        }
        if (e.type === "skipped") {
          skippedAny = true;
          setSkipped((x) => [...x, e.title]);
        }
        // The server's own screen stopped it (a request this page didn't screen): the same stop as above.
        if (e.type === "error" && e.error === "safety" && e.flag && e.message) return stopForSafety(course, { kind: e.flag, reply: e.message });
        if (e.type === "error") error = e.error;
        if (e.type === "done") done = true;
      }
      if (c.signal.aborted) return;
      if (got.length) {
        saveCourse({ ...course, lessons: got, template: !ai, ai: ai || undefined, citations: undefined });
        // The writer broke off (an error, or the stream ended early): keep what arrived, and say so.
        if (error || !done) setFailed(error ?? "model");
        return;
      }
      // The writer's lessons all failed its own quality gates: build from real sources instead, and say so.
      if (ai && skippedAny && !error && searchable) {
        setGates(true);
        return await fromSources(course, c, avoid);
      }
      setFailed(error ?? "model");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote("error");
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

  if (stopped) return <SafetyStop reply={stopped.reply} />;
  if (!draft) return <NotFound />;
  if (ready) return null;

  const backToBox = () => {
    ctrl.current?.abort();
    router.push(`/courses/new?goal=${encodeURIComponent(draft.goal)}`);
    if (draft.status === "outlining") removeCourse(draft.id);
  };
  const sourced = Boolean(draft.citations) && !draft.ai;
  const kept = sourced ? keepCitations(draft.citations!, lessons) : draft.citations;
  const create = () => {
    const clean = lessons.map((l) => ({ ...l, title: l.title.trim() || t("gen.newLesson") }));
    finishDraft(draft.id, learner.id, { title: title.trim() || draft.title, lessons: clean, citations: sourced ? keepCitations(draft.citations!, clean) : undefined });
    router.push(`/courses/${draft.id}`);
  };

  const searchable = topicOf(draft.goal, names).length >= 2;
  const stale = !running && lessons.length === 0 && !note && !failed;
  const match = readyMadeMatch(draft.goal, draft.subject, draft.grade, draft.locale, names);
  const useMatch = () => {
    if (!match) return;
    const id = addFromCatalogue(match.id, learner.id);
    if (!id) return;
    router.push(`/learn/${id}/${match.lessons[0].id}`);
    if (draft.status === "outlining") removeCourse(draft.id);
  };
  const elapsed = Math.max(0, Math.round(((running ? now : (steps.at(-1)?.at ?? started)) - started) / 1000));
  const used = sourced ? sourcesUsed(lessons, draft.citations!) : [];
  const usedLine = used.length
    ? [t("crs.builtFrom", { sources: new Intl.ListFormat(learner.locale, { type: "conjunction" }).format(used.map((u) => t(`crs.used.${u}`))) }), kept?.length ? t("crs.linkedOnPage") : ""]
        .filter(Boolean)
        .join(" ")
    : null;
  /** The other way to build, offered next to Try again: real sources when there is a topic to look up, else the template. */
  const otherWay = searchable ? (
    <Button variant="secondary" onClick={() => restart(draft, "sources")}>
      {t("crs.useSources")}
    </Button>
  ) : (
    <Button variant="secondary" onClick={() => restart(draft, "template")}>
      {t("gen.useTemplate")}
    </Button>
  );

  return (
    <div className="space-y-8">
      <Link href="/home" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink">
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
              <span key={f.id} className="break-all font-opmono">
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
                  <span className="min-w-0 flex-1 break-words">{t(s.key, s.vars)}</span>
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
                <Button variant="ghost" className="ml-auto" onClick={backToBox}>
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

      {gates && <Notice>{t("crs.gatesNote")}</Notice>}
      {note === "offline" && !running && (
        <Notice
          tone="warn"
          action={
            <div className="flex flex-wrap gap-2">
              {lessons.length === 0 && (
                <>
                  <Button variant="secondary" onClick={backToBox}>
                    {t("gen.editRequest")}
                  </Button>
                  <Button variant="secondary" onClick={() => restart(draft, "template")}>
                    {t("gen.useTemplate")}
                  </Button>
                </>
              )}
              <Button variant={lessons.length ? "secondary" : "primary"} onClick={() => restart(draft, "sources")}>
                <IconRefresh size={14} /> {t("common.retry")}
              </Button>
            </div>
          }
        >
          {t(lessons.length ? "crs.offlineNote" : "crs.offlineNothing")}
        </Notice>
      )}
      {(note === "nothing" || note === "error") && !running && (
        <Notice
          tone="warn"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={backToBox}>
                {t("gen.editRequest")}
              </Button>
              <Button variant="secondary" onClick={() => restart(draft, "template")}>
                {t("gen.useTemplate")}
              </Button>
              <Button onClick={() => restart(draft, note === "error" ? "auto" : "sources")}>
                <IconRefresh size={14} /> {t("common.retry")}
              </Button>
            </div>
          }
        >
          {t(note === "error" ? "crs.buildFailed" : "crs.nothing")}
        </Notice>
      )}

      {stale && (
        <Notice
          tone="warn"
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={backToBox}>
                {t("gen.editRequest")}
              </Button>
              <Button onClick={() => restart(draft)}>
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
            <Button onClick={useMatch}>
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
              <Button variant={lessons.length ? "secondary" : "primary"} onClick={() => restart(draft)}>
                {t("common.retry")}
              </Button>
              {otherWay}
            </div>
          }
        >
          {lessons.length ? t("crs.stoppedAfter", { n: lessons.length }) : t(failed === "rate" ? "gen.errRate" : "gen.errModel")}
        </Notice>
      )}
      {skipped.length > 0 && !running && <p className="text-sm text-muted">{t("gen.skipped", { titles: skipped.join(", ") })}</p>}

      {lessons.length > 0 && (
        <section aria-labelledby="outline" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="outline" className="font-brand text-t2 font-semibold text-ink">
              {t("gen.lessons")}
            </h2>
            {!running && <OriginBadge course={{ ...draft, citations: kept }} />}
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
          {!running && usedLine && <p className="text-xs text-muted">{usedLine}</p>}
          {!running && sourced && draft.length === "full" && <p className="text-xs text-muted">{t("crs.fullNote", { n: lessons.length })}</p>}
          {!running && (
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
              <Button variant="ghost" onClick={backToBox}>
                {t("gen.editRequest")}
              </Button>
              <Button onClick={create} className={isYoung(learner) ? "min-h-14 px-7 text-t3" : ""}>
                {t("gen.create")} <IconArrowRight size={16} />
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** What a stopped request sees: the safety screen's fixed reply, written by people, and a way back to learning. */
function SafetyStop({ reply }: { reply: string }) {
  const t = useT();
  return (
    <div className="space-y-8">
      <Link href="/home" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink">
        <IconArrowLeft size={16} /> {t("nav.home")}
      </Link>
      <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("nav.new")}</h1>
      <Notice
        action={
          <Link href="/courses/new" className={btn("secondary")}>
            {t("crs.askOther")}
          </Link>
        }
      >
        <p className="max-w-prose text-body">{reply}</p>
      </Notice>
    </div>
  );
}
