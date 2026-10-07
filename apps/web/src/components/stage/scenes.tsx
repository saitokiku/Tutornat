"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconCheck, IconLightbulb } from "@/components/icons";
import { Button, SUBJECT_TINT } from "@/components/ui";
import { useT } from "@/i18n";
import type { InteractiveScene, ProjectScene, QuizScene, SlideScene, Subject, Widget } from "@/lib/types";
import { Hear, bigButton, useHear } from "./hear";
import { orderBlocks, quizSpeech, Spoken, useNarrating } from "./narration";
import type { Segment } from "./useSpeech";
import { VisualView } from "./visuals";
import { AreaModel } from "./widgets/AreaModel";
import { Balance, equationText } from "./widgets/Balance";
import { ClockWidget } from "./widgets/Clock";
import { Coordinate } from "./widgets/Coordinate";
import { FractionBar } from "./widgets/FractionBar";
import { MoonPhases } from "./widgets/MoonPhases";
import { NumberLineWidget } from "./widgets/NumberLine";
import { PlaceValue } from "./widgets/PlaceValue";
import { SentenceBuilder, bankOrder } from "./widgets/SentenceBuilder";
import { Sequence, startOrder } from "./widgets/Sequence";
import { Sorter } from "./widgets/Sorter";
import { StatesOfMatter } from "./widgets/StatesOfMatter";
import { Act } from "./widgets/Stepper";

export const TINT: Record<Subject, string> = SUBJECT_TINT;

/** Everything a learner checks reports here: right or not, and whether help was used. */
export type OnAnswer = (a: { sceneId: string; correct: boolean; assisted: boolean }) => void;
/** Reports that help was shown for a check (a hint), so a later answer counts as helped. */
export type OnHelp = (sceneId: string) => void;
/** Reports what the scene body has on screen for narration, as it changes (see sceneSegments). */
export type OnSay = (segments: Segment[]) => void;

/** Body copy sized for the learner: larger for K–2. */
function useBody() {
  const { young } = useHear();
  return young ? "text-t2 font-normal leading-snug" : "text-t3 font-normal leading-relaxed";
}

function Figure({ k, children, alt }: { k: string; children: ReactNode; alt: string }) {
  const on = useNarrating(k);
  return (
    <figure className={`flex flex-col items-center gap-3 rounded-md bg-panel2 px-4 py-6 ${on ? "ring-2 ring-accent/60" : ""}`}>
      {children}
      {/* While the picture is being described aloud, the words show too (the picture keeps its own label). */}
      {on && (
        <figcaption aria-hidden="true" className="max-w-prose text-center text-sm text-ink">
          <Spoken k={k} text={alt} />
        </figcaption>
      )}
      <Hear text={alt} />
    </figure>
  );
}

export function SlideView({ scene, subject }: { scene: SlideScene; subject: Subject }) {
  const body = useBody();
  const { young } = useHear();
  return (
    <div className="space-y-5">
      {orderBlocks(scene.blocks, young).map(({ b, i }) =>
        b.type === "text" ? (
          <div key={i} className="flex max-w-prose items-start gap-3">
            <p className={`max-w-prose text-ink ${body}`}>
              <Spoken k={`b${i}`} text={b.text} />
            </p>
            <Hear text={b.text} />
          </div>
        ) : b.type === "points" ? (
          <ul key={i} className="max-w-prose space-y-2">
            {b.items.map((item, j) => (
              <li key={item} className={`flex items-start gap-3 text-ink ${young ? "text-t2" : "text-body"}`}>
                <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full" style={{ background: TINT[subject] }} />
                <span className="flex-1">
                  <Spoken k={`b${i}.${j}`} text={item} />
                </span>
                <Hear text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <Figure key={i} k={`v${i}`} alt={b.alt}>
            <VisualView visual={b.visual} alt={b.alt} tint={TINT[subject]} />
          </Figure>
        ),
      )}
    </div>
  );
}

export function WidgetView({ widget, subject, onCheck, onSay, lang }: { widget: Widget; subject: Subject; onCheck: (ok: boolean) => void; onSay?: OnSay; lang: string }) {
  const tint = TINT[subject];
  switch (widget.kind) {
    case "fraction-bar":
      return <FractionBar widget={widget} onCheck={onCheck} tint={tint} />;
    case "number-line":
      return <NumberLineWidget widget={widget} onCheck={onCheck} tint={tint} />;
    case "states-of-matter":
      return <StatesOfMatter widget={widget} onCheck={onCheck} />;
    case "moon-phases":
      return <MoonPhases widget={widget} onCheck={onCheck} />;
    case "sorter":
      return <Sorter widget={widget} onCheck={onCheck} lang={lang} />;
    case "area-model":
      return <AreaModel widget={widget} onCheck={onCheck} tint={tint} />;
    case "place-value":
      return <PlaceValue widget={widget} onCheck={onCheck} tint={tint} />;
    case "clock":
      return <ClockWidget widget={widget} onCheck={onCheck} tint={tint} />;
    case "balance":
      return <Balance widget={widget} onCheck={onCheck} tint={tint} />;
    case "coordinate":
      return <Coordinate widget={widget} onCheck={onCheck} tint={tint} />;
    case "sequence":
      return <Sequence widget={widget} onCheck={onCheck} onSay={onSay} lang={lang} />;
    case "sentence-builder":
      return <SentenceBuilder widget={widget} onCheck={onCheck} onSay={onSay} lang={lang} />;
  }
}

export function InteractiveView({ scene, subject, onAnswer, onSay, lang }: { scene: InteractiveScene; subject: Subject; onAnswer: OnAnswer; onSay?: OnSay; lang: string }) {
  const body = useBody();
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <p className={`max-w-prose text-ink ${body}`}>
          <Spoken k="prompt" text={scene.prompt} />
        </p>
        <Hear text={scene.prompt} />
      </div>
      <WidgetView widget={scene.widget} subject={subject} lang={lang} onSay={onSay} onCheck={(correct) => onAnswer({ sceneId: scene.id, correct, assisted: false })} />
    </div>
  );
}

/**
 * One question at a time. A hint, reading the explanation after a miss, or the tutor open beside the
 * question (`helped`) marks the answer as helped, and the verdict says so.
 * Focus never drops to the page: Check stays in place (dimmed until a new choice), a hint or an
 * explanation takes focus when it opens, and the next question's prompt takes focus when it comes.
 */
export function QuizView({ scene, onAnswer, onSay, onHelp, helped = false }: { scene: QuizScene; onAnswer: OnAnswer; onSay?: OnSay; onHelp?: OnHelp; helped?: boolean }) {
  const t = useT();
  const { young } = useHear();
  const [qi, setQi] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [why, setWhy] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const prompt = useRef<HTMLSpanElement>(null);
  const hintBox = useRef<HTMLDivElement>(null);
  const whyBox = useRef<HTMLDivElement>(null);
  const q = scene.questions[qi];
  const assisted = hint || why || helped;
  const spoken = quizSpeech(q);

  useEffect(() => {
    onSay?.([{ key: "quiz", text: quizSpeech(q).text }]);
  }, [q, onSay]);
  useEffect(() => {
    if (qi > 0) prompt.current?.focus();
  }, [qi]);
  useEffect(() => {
    if (hint) hintBox.current?.focus();
  }, [hint]);
  useEffect(() => {
    if (why) whyBox.current?.focus();
  }, [why]);

  const check = () => {
    if (choice === null) return;
    const correct = choice === q.answer;
    setResult(correct);
    onAnswer({ sceneId: `${scene.id}:${q.id}`, correct, assisted });
  };
  const next = () => {
    setQi(qi + 1);
    setChoice(null);
    setHint(false);
    setWhy(false);
    setResult(null);
  };
  const verdict = result === null ? "" : result ? (assisted ? t("stg.rightHelped") : t("stage.correct")) : t("stage.incorrect");

  return (
    <div className="space-y-5">
      <p className="font-opmono text-xs tabular-nums text-muted">{t("stage.question", { n: qi + 1, total: scene.questions.length })}</p>
      <fieldset key={q.id} className="space-y-4">
        <legend className="flex items-start gap-3">
          <span ref={prompt} tabIndex={-1} className={`max-w-prose font-semibold text-ink focus:outline-none ${young ? "text-t2" : "text-t3"}`}>
            <Spoken k="quiz" text={q.prompt} offset={spoken.prompt} />
          </span>
          <Hear text={q.prompt} />
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {q.choices.map((c, i) => {
            const picked = choice === i;
            const showRight = result === true && i === q.answer;
            const showWrong = result === false && picked;
            return (
              <div key={i} className="flex items-center gap-2">
                <label
                  className={`flex flex-1 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors ${young ? "min-h-16 text-t3" : "min-h-14 text-body"} ${
                    showRight ? "border-good bg-good/10" : showWrong ? "border-bad bg-bad/5" : picked ? "border-ink bg-panel" : "border-border bg-panel hover:border-ink/30"
                  } ${result === true ? "pointer-events-none" : ""}`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={picked}
                    disabled={result === true}
                    onChange={() => (setChoice(i), result === false && setResult(null))}
                    className={`shrink-0 accent-[var(--color-ink)] ${young ? "size-5" : "size-4"}`}
                  />
                  <span className="text-ink">
                    <Spoken k="quiz" text={c} offset={spoken.choices[i]} />
                  </span>
                </label>
                <Hear text={c} />
              </div>
            );
          })}
        </div>
      </fieldset>

      {hint && (
        <div ref={hintBox} tabIndex={-1} className="flex max-w-prose items-start gap-2.5 rounded-sm bg-warn/10 px-4 py-3 text-sm text-ink focus:outline-none">
          <IconLightbulb size={18} className="mt-0.5 shrink-0 text-warn" />
          <p className={`flex-1 ${young ? "text-body" : ""}`}>{q.hint}</p>
          <Hear text={q.hint} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Act variant="primary" onClick={check} off={choice === null || result !== null}>
          {t("stage.check")}
        </Act>
        {result !== true && !hint && (
          <Button variant="ghost" onClick={() => (setHint(true), onHelp?.(`${scene.id}:${q.id}`))} className={bigButton(young)}>
            <IconLightbulb size={16} /> {t("stage.hint")}
          </Button>
        )}
        <p role="status" className={`font-medium ${young ? "text-body" : "text-sm"} ${result === null ? "sr-only" : result ? "text-good" : "text-bad"}`}>
          {verdict}
        </p>
        {verdict && <Hear text={verdict} />}
        {result === false && !why && (
          <Button variant="ghost" onClick={() => (setWhy(true), onHelp?.(`${scene.id}:${q.id}`))} className={bigButton(young)}>
            {t("stage.why")}
          </Button>
        )}
      </div>

      {(why || result === true) && (
        <div ref={whyBox} tabIndex={-1} className="flex max-w-prose items-start gap-3 rounded-sm bg-panel2 px-4 py-3 text-sm text-ink focus:outline-none">
          <p className={`flex-1 ${young ? "text-body" : ""}`}>{q.explain}</p>
          <Hear text={q.explain} />
        </div>
      )}

      {result === true && qi < scene.questions.length - 1 && (
        <Button variant="secondary" onClick={next} className={bigButton(young)}>
          {t("stage.nextQuestion")}
        </Button>
      )}
    </div>
  );
}

export function ProjectView({ scene }: { scene: ProjectScene }) {
  const t = useT();
  const body = useBody();
  const [done, setDone] = useState<Set<number>>(new Set());
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <p className={`max-w-prose text-ink ${body}`}>
          <Spoken k="brief" text={scene.brief} />
        </p>
        <Hear text={scene.brief} />
      </div>
      <ol className="space-y-2.5">
        {scene.steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2">
            <label className="flex min-h-12 flex-1 cursor-pointer items-start gap-3 rounded-md border border-border bg-panel px-4 py-3">
              <input
                type="checkbox"
                checked={done.has(i)}
                onChange={() => {
                  const next = new Set(done);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  setDone(next);
                }}
                className="mt-1 size-4 shrink-0 accent-[var(--color-ink)]"
              />
              <span className={`text-body ${done.has(i) ? "text-muted line-through decoration-border" : "text-ink"}`}>
                <Spoken k={`step.${i}`} text={step} />
              </span>
            </label>
            <Hear text={step} />
          </li>
        ))}
      </ol>
      <p className="flex items-center gap-1.5 font-opmono text-xs tabular-nums text-muted">
        {done.size === scene.steps.length && <IconCheck size={14} className="text-good" />}
        {t("stage.stepsDone", { done: done.size, total: scene.steps.length })}
      </p>
    </div>
  );
}

/**
 * What is on screen, in words, for the tutor beside the lesson. It describes where a manipulative starts
 * and never carries its answer key: no target, no right order, no right sentence.
 */
export function sceneSpeech(scene: SlideScene | InteractiveScene | ProjectScene): string {
  if (scene.kind === "slide")
    return [scene.title, ...scene.blocks.map((b) => (b.type === "text" ? b.text : b.type === "points" ? b.items.join(". ") : b.alt))].join(". ");
  if (scene.kind === "interactive") return [scene.title, scene.prompt, ...widgetWords(scene.widget)].join(". ");
  return [scene.title, scene.brief, ...scene.steps].join(". ");
}

function widgetWords(w: Widget): string[] {
  switch (w.kind) {
    case "sorter":
      return [`${w.categories.join(", ")}.`, ...w.items.map((it, i) => `${i + 1}. ${it.text}`)];
    case "balance":
      return [equationText({ a: w.xCount, l: w.leftUnits, r: w.rightUnits })];
    case "sequence":
      return startOrder(w).map((id, i) => `${i + 1}. ${w.items.find((it) => it.id === id)?.text ?? ""}`);
    case "sentence-builder":
      return [bankOrder(w).map((i) => w.words[i]).join(" / ")];
    case "area-model":
      return [`${w.rows} × ${w.cols}`];
    case "clock":
      return [`${w.h}:${String(w.m).padStart(2, "0")}`];
    case "coordinate":
      return [`x, y: ${w.min}…${w.max}`];
    default:
      return [];
  }
}
