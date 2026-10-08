"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconBoard, IconCheck, IconCheckCircle, IconChat, IconEye, IconHand, IconHome, IconLayers } from "@/components/icons";
import { Button, EmptyState, Notice, SubjectDot, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { Related } from "@/components/courses/Related";
import { logAct } from "@/lib/acts";
import { StoreHealthNotice } from "@/components/gate";
import { SaveNotice } from "@/components/practice/SaveNotice";
import type { HelpGate } from "@/components/tutor/TutorChat";
import { checkMemory, lessonAnswerId, lessonState, record, sceneAttemptSource } from "@/lib/activity";
import { attemptFor, evidenceProblem, recordHelp } from "@/lib/evidence";
import { read, reload, storeHealth, useStore } from "@/lib/store";
import type { Course, Lesson, Profile, Scene } from "@/lib/types";
import { InteractiveView, ProjectView, QuizView, SlideView, type OnAnswer, type QuizProgress } from "./scenes";
import { useTitle } from "@/components/LangSync";
import { Finish } from "./Finish";
import { Hear, HearContext, bigButton } from "./hear";
import { awaitingReview, checkIds, courseOrigin, lessonHasChecks, lessonRef, ORIGIN_KEY, secondsSince, settle, tallyOf, type CheckResult } from "./lesson";
import { NarrationBar, NarrationContext, repeatSegments, sceneSegments, Spoken } from "./narration";
import { TutorPanel } from "./TutorPanel";
import { useSpeech, type Segment } from "./useSpeech";

const MAX_SECONDS = 2 * 60 * 60;
const KIND_ICON: Record<Scene["kind"], typeof IconEye> = { slide: IconEye, interactive: IconHand, quiz: IconCheckCircle, project: IconHome };
const isYoung = (p: Profile) => p.grade === "K" || p.grade === "1" || p.grade === "2";

export function Stage({ course, lesson, learner }: { course: Course; lesson: Lesson; learner: Profile }) {
  const t = useT();
  useTitle(lesson.title);
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [finished, setFinished] = useState<number | null>(null); // seconds spent, once finished
  const [startedAt] = useState(() => Date.now());
  const [showScenes, setShowScenes] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [boardNote, setBoardNote] = useState(false);
  // Why the last save didn't happen, until the next one does (SaveNotice says it).
  const [problem, setProblem] = useState<"storage" | "stale" | null>(null);
  // What the scene body says about itself for narration (the quiz question on screen, a manipulative's
  // steps or word tiles in their current order), tagged with the scene it came from.
  const [live, setLive] = useState<{ sceneId: string; segs: Segment[] } | null>(null);
  const scene = lesson.scenes[index];
  const said = scene && live?.sceneId === scene.id ? live.segs : [];
  // Narration stops on a new scene, a new quiz question, or the finish.
  const quizKey = scene?.kind === "quiz" ? said.map((s) => s.text).join("|") : "";
  const speech = useSpeech(course.locale, `${lesson.id}:${index}:${quizKey}:${finished !== null}`);
  const base = { profileId: learner.id, courseId: course.id, lessonId: lesson.id };
  const nextLesson = course.lessons[course.lessons.findIndex((l) => l.id === lesson.id) + 1];
  const origin = courseOrigin(course);
  const young = isYoung(learner);
  const sceneId = scene?.id ?? "";

  // A lesson counts as started once, the first time it is opened. Each sitting with checks is a
  // teaching act whose intent is that its checks come out right on the learner's own (once a day).
  useEffect(() => {
    if (!lesson.scenes.length) return;
    if (lessonState(read().activity, course.id, lesson.id) === "new") record({ ...base, type: "lesson_started" });
    if (lessonHasChecks(lesson)) logAct({ profileId: learner.id, kind: "lesson", intent: "lesson-checks-pass", ref: lessonRef(course.id, lesson.id) }, { once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per lesson
  }, [course.id, lesson.id]);

  // Move focus to the new scene's title after it renders (never after the stage has gone away).
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const focusTitle = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => document.getElementById("scene-title")?.focus());
  };
  // This lesson's saved answers: what a reload, or a later visit, starts from. A check answered before
  // is not asked again, and keeps the help it had.
  const history = useStore((s) => s.activity.filter((e) => e.courseId === course.id && e.lessonId === lesson.id && e.profileId === learner.id));
  const remembered: Record<string, CheckResult> = {};
  for (const e of history) if (e.type === "quiz_answered" && e.sceneId) remembered[e.sceneId] = settle(remembered[e.sceneId], !!e.correct, !!e.assisted);
  const memory = useRef(checkMemory(history));
  const sourceFor = useCallback(
    (id: string) => sceneAttemptSource(learner.id, course.id, lesson.id, lesson.scenes.find((s) => checkIds(s).includes(id))?.id ?? id.split(":")[0], id),
    [learner.id, course.id, lesson],
  );
  /** A save that didn't happen: say why; another tab's change is read again. Anything else is a bug. */
  const failed = useCallback((e: unknown) => {
    const p = evidenceProblem(e);
    setProblem(p);
    if (p === "stale") reload();
    return p;
  }, []);
  const saved = useStore((s) => {
    const progress: QuizProgress = {};
    if (scene?.kind !== "quiz") return progress;
    for (const q of scene.questions) {
      const id = `${scene.id}:${q.id}`;
      const a = attemptFor(sourceFor(id), s);
      const answers = s.activity.filter((e) => e.attemptId === a.id && e.type === "quiz_answered");
      const answered = answers.find((e) => e.correct) ?? answers.find((e) => !e.correct);
      progress[id] = {
        hint: a.help.some((h) => h.kind === "hint"),
        why: a.help.some((h) => h.kind === "explanation"),
        result: answered ? !!answered.correct : null,
        choice: answered?.choice ?? null,
        assisted: a.assistance.assisted || answers.some((e) => e.assisted || !e.correct),
      };
    }
    return progress;
  });
  /** The tutor beside a scene is help on its checks, the same rule as Practice: saved when it opens on a scene, and before each reply. */
  const tutorHelps = (s: Scene | undefined): ReturnType<HelpGate> => {
    if (!s) return true;
    try {
      for (const id of checkIds(s)) {
        memory.current.help(id);
        recordHelp(sourceFor(id), { kind: "tutor", delivery: "latched" });
      }
      return true;
    } catch (e) {
      return failed(e);
    }
  };
  const go = (i: number) => {
    focusTitle();
    setIndex(i);
    setVisited((v) => new Set(v).add(i));
    setShowScenes(false);
    setBoardNote(false);
    if (showTutor) tutorHelps(lesson.scenes[i]);
  };
  const toggleTutor = () => {
    if (!showTutor) tutorHelps(scene);
    setShowTutor(!showTutor);
  };
  // An answer is saved before its feedback shows: the first one (on own or not yet), and a right one
  // after a miss or help, each once.
  const onAnswer: OnAnswer = ({ sceneId, correct, assisted: shown, response, choice }) => {
    try {
      const source = sourceFor(sceneId);
      const a = attemptFor(source);
      const { record: fresh, assisted } = memory.current.judge(sceneId, correct, shown || a.assistance.assisted);
      if (fresh)
        record(
          { ...base, type: "quiz_answered", sceneId, correct, assisted, attemptId: a.id, ...(response !== undefined ? { response } : {}), ...(choice !== undefined ? { choice } : {}) },
          lessonAnswerId(source, correct),
        );
      setResults((r) => ({ ...r, [sceneId]: settle(r[sceneId], correct, assisted) }));
      setProblem(null);
      return true;
    } catch (e) {
      // The memory judged an answer that wasn't kept: it goes back to what is saved.
      memory.current = checkMemory(read().activity.filter((x) => x.courseId === course.id && x.lessonId === lesson.id && x.profileId === learner.id));
      failed(e);
      return false;
    }
  };
  const onHelp = useCallback(
    (id: string, kind: "hint" | "explanation" = "hint") => {
      try {
        recordHelp(sourceFor(id), { kind });
        memory.current.help(id);
        setProblem(null);
        return true;
      } catch (e) {
        failed(e);
        return false;
      }
    },
    [sourceFor, failed],
  );
  const onSay = useCallback((segs: Segment[]) => setLive({ sceneId, segs }), [sceneId]);
  // Finishing records the lesson and shows the finish. It never opens the next lesson.
  const finish = () => {
    const seconds = secondsSince(startedAt, MAX_SECONDS);
    record({ ...base, type: "lesson_completed", seconds });
    setFinished(seconds);
    speech.stop();
    focusTitle();
  };

  const header = (
    <header className="flex items-center gap-2 border-b border-border bg-panel px-2 py-2 sm:gap-4 sm:px-6 sm:py-3">
      <Link
        href={`/courses/${course.id}`}
        aria-label={t("stage.backToCourse")}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink sm:max-w-64 sm:justify-start"
      >
        <IconArrowLeft size={16} className="shrink-0" />
        <span className="hidden truncate sm:inline" lang={course.locale}>
          {course.title}
        </span>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 sm:justify-center">
          <SubjectDot subject={course.subject} />
          <h1 className="truncate font-brand text-t3 font-semibold text-ink" lang={course.locale}>
            {lesson.title}
          </h1>
        </div>
        {origin && <p className="truncate text-xs text-muted sm:text-center">{t(ORIGIN_KEY[origin])}</p>}
      </div>
      {lesson.scenes.length > 0 && finished === null && (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" className="min-w-11 px-3" onClick={() => setBoardNote(!boardNote)} aria-label={t("stage.whiteboard")}>
            <IconBoard size={16} />
          </Button>
          <Button variant={showTutor ? "secondary" : "ghost"} className="min-w-11 px-3" aria-expanded={showTutor} onClick={toggleTutor} aria-label={showTutor ? t("tutor.hide") : t("tutor.show")}>
            <IconChat size={16} /> <span className="hidden sm:inline">{t("tutor.title")}</span>
          </Button>
        </div>
      )}
    </header>
  );

  if (!lesson.scenes.length)
    return (
      <div className="min-h-dvh bg-paper">
        {header}
        <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
          <EmptyState
            art={<IconLayers size={28} className="mb-3 text-muted" />}
            title={t("stage.lessonNotReady")}
            body={`${lesson.summary} ${t("stage.empty")}`}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link href={`/courses/${course.id}`} className={btn("secondary")}>
                  {t("stage.backToCourse")}
                </Link>
                {nextLesson && (
                  <Link href={`/learn/${course.id}/${nextLesson.id}`} className={btn("primary")}>
                    {t("stage.nextLesson")} <IconArrowRight size={16} />
                  </Link>
                )}
              </div>
            }
          />
          <Related course={course} learner={learner} />
        </main>
      </div>
    );

  const last = index === lesson.scenes.length - 1;
  const segments = sceneSegments(scene, young, said);
  const repeat = young && scene.kind === "slide" ? repeatSegments(scene, young) : undefined;
  const draft = awaitingReview(course, lesson.id, scene.id);

  return (
    <HearContext.Provider value={{ hear: young, young, big: young, locale: course.locale }}>
    <div className="min-h-dvh bg-paper">
      {header}
      <div className={`mx-auto grid max-w-[90rem] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[14rem_1fr] ${showTutor ? "xl:grid-cols-[14rem_1fr_19rem]" : ""}`}>
        <nav aria-label={t("stage.scenes")} className="lg:sticky lg:top-4 lg:self-start">
          <button
            type="button"
            aria-expanded={showScenes}
            onClick={() => setShowScenes(!showScenes)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border border-border bg-panel px-4 py-2.5 text-sm font-medium text-ink lg:hidden"
          >
            <span className="min-w-0 truncate text-left" lang={course.locale}>
              <span className="font-opmono text-xs text-muted">{index + 1}/{lesson.scenes.length}</span> {scene?.title}
            </span>
            <span className="shrink-0 text-xs text-muted">{t("stage.scenes")}</span>
          </button>
          <ol className={`mt-2 space-y-0.5 lg:mt-0 lg:block ${showScenes ? "block" : "hidden"}`}>
            {lesson.scenes.map((s, i) => {
              const on = i === index;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={on ? "step" : undefined}
                    onClick={() => go(i)}
                    disabled={finished !== null}
                    className={`relative flex min-h-11 w-full items-center gap-3 rounded-sm py-2 pl-4 pr-2 text-left text-sm transition-colors ${
                      on ? "bg-panel font-medium text-ink shadow-soft" : "text-muted hover:bg-panel/70 hover:text-ink"
                    }`}
                  >
                    <span aria-hidden="true" className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
                    {(() => {
                      const Icon = KIND_ICON[s.kind];
                      return <Icon size={16} className={`shrink-0 ${on ? "text-accent" : "text-muted"}`} />;
                    })()}
                    <span className="sr-only">{t(`stage.kind.${s.kind}` as const)}:</span>
                    <span className="min-w-0 flex-1 truncate" lang={course.locale}>
                      {s.title}
                    </span>
                    {visited.has(i) && !on && <IconCheck size={14} className="shrink-0 text-good" />}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="min-w-0">
          <div className="mb-4 space-y-3 empty:hidden">
            {/* A K–2 learner can't read the grown-up's notice: they hear that a grown-up is needed. */}
            {young && problem !== "storage" && storeHealth() === "memory" && <SaveNotice problem="unsaved" young locale={learner.locale} />}
            <StoreHealthNotice />
            {problem && <SaveNotice problem={problem} young={young} locale={learner.locale} />}
          </div>
          <section aria-labelledby="scene-title" className="rounded-lg border border-border bg-panel shadow-soft">
            {finished !== null ? (
              <Finish course={course} lesson={lesson} learner={learner} tally={tallyOf(lesson, { ...remembered, ...results })} seconds={finished} next={nextLesson} />
            ) : (
              <NarrationContext.Provider value={speech.pos}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-8">
                  <div className="min-w-0">
                    <span className="font-opmono text-[11px] uppercase tracking-wider text-muted">{t(`stage.kind.${scene.kind}` as const)}</span>
                    {draft && <p className="text-xs text-muted">{t("stg.draftScene")}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <NarrationBar speech={speech} segments={segments} repeat={repeat} />
                    <span className="hidden font-opmono text-xs tabular-nums text-muted lg:inline">{t("stage.sceneOf", { n: index + 1, total: lesson.scenes.length })}</span>
                  </div>
                </div>
                <div key={scene.id} className="min-h-[22rem] animate-fade-up space-y-6 px-5 py-7 sm:px-8 sm:py-9" lang={course.locale}>
                  <div className="flex items-start gap-3">
                    <h2 id="scene-title" tabIndex={-1} className={`font-brand font-semibold text-balance text-ink focus:outline-none ${young ? "text-d3" : "text-t1"}`}>
                      <Spoken k="title" text={scene.title} />
                    </h2>
                    <Hear text={scene.title} />
                  </div>
                  {boardNote && <Notice>{t("stage.whiteboardOff")}</Notice>}
                  {scene.kind === "slide" && <SlideView scene={scene} subject={course.subject} />}
                  {scene.kind === "interactive" && <InteractiveView scene={scene} subject={course.subject} onAnswer={onAnswer} onSay={onSay} lang={course.locale} />}
                  {scene.kind === "quiz" && <QuizView scene={scene} onAnswer={onAnswer} onSay={onSay} onHelp={onHelp} saved={saved} helped={showTutor} />}
                  {scene.kind === "project" && <ProjectView scene={scene} />}
                </div>
                {/* Labels never break inside a button; on a narrow phone the primary moves to its own line. K–2 phones show Previous as its arrow. */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-8">
                  <Button variant="ghost" onClick={() => go(index - 1)} disabled={index === 0} className={`whitespace-nowrap ${bigButton(young)}`}>
                    <IconArrowLeft size={16} /> <span className={young ? "max-sm:sr-only" : ""}>{t("common.previous")}</span>
                  </Button>
                  {last ? (
                    <Button onClick={finish} className={`ml-auto whitespace-nowrap ${bigButton(young)}`}>
                      {t("stage.finish")} <IconCheck size={16} />
                    </Button>
                  ) : (
                    <Button onClick={() => go(index + 1)} className={`ml-auto whitespace-nowrap ${bigButton(young)}`}>
                      {t("common.next")} <IconArrowRight size={16} />
                    </Button>
                  )}
                </div>
              </NarrationContext.Provider>
            )}
          </section>
        </main>

        {showTutor && (
          <div className="lg:col-start-2 xl:sticky xl:top-4 xl:col-start-auto xl:self-start">
            <TutorPanel learner={learner} lessonTitle={lesson.title} scene={scene ?? lesson.scenes[0]} beforeHelp={() => tutorHelps(scene)} />
          </div>
        )}
      </div>
    </div>
    </HearContext.Provider>
  );
}
