"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { IconArrowLeft, IconArrowRight, IconBoard, IconCheck, IconChat, IconLayers, IconSpeaker, IconStop } from "@/components/icons";
import { Button, EmptyState, Notice, SubjectDot, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { lessonState, record } from "@/lib/activity";
import { read } from "@/lib/store";
import type { Course, Lesson, Profile } from "@/lib/types";
import { InteractiveView, ProjectView, QuizView, SlideView, sceneSpeech, type OnAnswer } from "./scenes";
import { TutorPanel } from "./TutorPanel";
import { useSpeech } from "./useSpeech";

const MAX_SECONDS = 2 * 60 * 60;

export function Stage({ course, lesson, learner }: { course: Course; lesson: Lesson; learner: Profile }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [tally, setTally] = useState({ own: 0, help: 0, missed: 0 });
  const [finished, setFinished] = useState<number | null>(null); // seconds spent, once finished
  const [startedAt] = useState(() => Date.now());
  const [showScenes, setShowScenes] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [boardNote, setBoardNote] = useState(false);
  const [quizText, setQuizText] = useState("");
  const scene = lesson.scenes[index];
  const speech = useSpeech(course.locale, `${lesson.id}:${index}`);
  const base = { profileId: learner.id, courseId: course.id, lessonId: lesson.id };
  const nextLesson = course.lessons[course.lessons.findIndex((l) => l.id === lesson.id) + 1];

  // A lesson counts as started once, the first time it is opened.
  useEffect(() => {
    if (lesson.scenes.length && lessonState(read().activity, course.id, lesson.id) === "new") record({ ...base, type: "lesson_started" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per lesson
  }, [course.id, lesson.id]);

  const go = (i: number) => {
    setIndex(i);
    setVisited((v) => new Set(v).add(i));
    setShowScenes(false);
    setBoardNote(false);
  };
  const onAnswer: OnAnswer = ({ sceneId, correct, assisted }) => {
    record({ ...base, type: "quiz_answered", sceneId, correct, assisted });
    setTally((s) => (correct ? (assisted ? { ...s, help: s.help + 1 } : { ...s, own: s.own + 1 }) : { ...s, missed: s.missed + 1 }));
  };
  const finish = () => {
    const seconds = Math.min(MAX_SECONDS, Math.round((Date.now() - startedAt) / 1000));
    record({ ...base, type: "lesson_completed", seconds });
    setFinished(seconds);
    speech.stop();
  };
  const onSpeakText = useCallback((text: string) => setQuizText(text), []);

  const header = (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-panel px-4 py-3 sm:px-6">
      <Link href={`/courses/${course.id}`} className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <IconArrowLeft size={16} className="shrink-0" />
        <span className="truncate" lang={course.locale}>
          {course.title}
        </span>
      </Link>
      <div className="order-last flex w-full min-w-0 items-center gap-2 sm:order-none sm:w-auto sm:flex-1 sm:justify-center">
        <SubjectDot subject={course.subject} />
        <h1 className="truncate font-brand text-t3 font-semibold text-ink" lang={course.locale}>
          {lesson.title}
        </h1>
      </div>
      {lesson.scenes.length > 0 && !finished && (
        <div className="ml-auto flex items-center gap-1.5">
          {speech.supported &&
            (speech.speaking ? (
              <Button size="sm" variant="secondary" onClick={speech.stop}>
                <IconStop size={14} /> {t("stage.stopReading")}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => speech.speak(scene.kind === "quiz" ? quizText : sceneSpeech(scene))}>
                <IconSpeaker size={16} /> {t("stage.readAloud")}
              </Button>
            ))}
          <Button size="sm" variant="ghost" aria-pressed={false} onClick={() => setBoardNote(!boardNote)} aria-label={t("stage.whiteboard")}>
            <IconBoard size={16} />
          </Button>
          <Button size="sm" variant="ghost" className="xl:hidden" aria-expanded={showTutor} onClick={() => setShowTutor(!showTutor)} aria-label={showTutor ? t("tutor.hide") : t("tutor.show")}>
            <IconChat size={16} />
          </Button>
        </div>
      )}
    </header>
  );

  if (!lesson.scenes.length)
    return (
      <div className="min-h-dvh bg-paper">
        {header}
        <main className="mx-auto max-w-2xl px-4 py-12">
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
        </main>
      </div>
    );

  const last = index === lesson.scenes.length - 1;

  return (
    <div className="min-h-dvh bg-paper">
      {header}
      <div className="mx-auto grid max-w-[90rem] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[14rem_1fr] xl:grid-cols-[14rem_1fr_19rem]">
        <nav aria-label={t("stage.scenes")} className="lg:sticky lg:top-4 lg:self-start">
          <button
            type="button"
            aria-expanded={showScenes}
            onClick={() => setShowScenes(!showScenes)}
            className="flex w-full items-center justify-between rounded-sm border border-border bg-panel px-4 py-2.5 text-sm font-medium text-ink lg:hidden"
          >
            {t("stage.sceneOf", { n: index + 1, total: lesson.scenes.length })}
            <span className="text-xs text-muted">{t("stage.openScenes")}</span>
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
                    className={`relative flex w-full items-center gap-3 rounded-sm py-2 pl-4 pr-2 text-left text-sm transition-colors ${
                      on ? "bg-panel font-medium text-ink shadow-soft" : "text-muted hover:bg-panel/70 hover:text-ink"
                    }`}
                  >
                    <span aria-hidden="true" className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
                    <span className="w-11 shrink-0 font-opmono text-[10px] uppercase tracking-wider">{t(`stage.kind.${s.kind}` as const)}</span>
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
          <section aria-labelledby="scene-title" className="rounded-lg border border-border bg-panel shadow-soft">
            {finished !== null ? (
              <div className="px-5 py-10 text-center sm:px-10">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-good text-paper">
                  <IconCheck size={24} />
                </span>
                <h2 id="scene-title" className="mt-4 font-brand text-t1 font-semibold text-ink">
                  {t("stage.finished")}
                </h2>
                <p className="mt-2 text-sm text-muted">{t("stage.finishedBody")}</p>
                <p className="mt-5 font-opmono text-sm tabular-nums text-ink">{t("stage.checksSummary", tally)}</p>
                <p className="mt-1 font-opmono text-xs tabular-nums text-muted">{t("stage.minutesSpent", { n: Math.max(1, Math.round(finished / 60)) })}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href={`/courses/${course.id}`} className={btn("secondary")}>
                    {t("stage.backToCourse")}
                  </Link>
                  {nextLesson && (
                    <Link href={`/learn/${course.id}/${nextLesson.id}`} className={btn("primary")}>
                      {t("stage.nextLesson")} <IconArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-8">
                  <span className="font-opmono text-[11px] uppercase tracking-wider text-muted">{t(`stage.kind.${scene.kind}` as const)}</span>
                  <span className="font-opmono text-xs tabular-nums text-muted">{t("stage.sceneOf", { n: index + 1, total: lesson.scenes.length })}</span>
                </div>
                <div key={scene.id} className="min-h-[22rem] animate-fade-up space-y-6 px-5 py-7 sm:px-8 sm:py-9" lang={course.locale}>
                  <h2 id="scene-title" className="font-brand text-t1 font-semibold text-balance text-ink">
                    {scene.title}
                  </h2>
                  {boardNote && <Notice>{t("stage.whiteboardOff")}</Notice>}
                  {scene.kind === "slide" && <SlideView scene={scene} subject={course.subject} />}
                  {scene.kind === "interactive" && <InteractiveView scene={scene} subject={course.subject} onAnswer={onAnswer} lang={course.locale} />}
                  {scene.kind === "quiz" && <QuizView scene={scene} onAnswer={onAnswer} onSpeakText={onSpeakText} />}
                  {scene.kind === "project" && <ProjectView scene={scene} />}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-8">
                  <Button variant="ghost" onClick={() => go(index - 1)} disabled={index === 0}>
                    <IconArrowLeft size={16} /> {t("common.previous")}
                  </Button>
                  {last ? (
                    <Button onClick={finish}>
                      {t("stage.finish")} <IconCheck size={16} />
                    </Button>
                  ) : (
                    <Button onClick={() => go(index + 1)}>
                      {t("common.next")} <IconArrowRight size={16} />
                    </Button>
                  )}
                </div>
              </>
            )}
          </section>
        </main>

        <div className={`xl:block ${showTutor ? "block lg:col-start-2" : "hidden"} xl:sticky xl:top-4 xl:col-start-auto xl:self-start`}>
          <TutorPanel />
        </div>
      </div>
    </div>
  );
}
