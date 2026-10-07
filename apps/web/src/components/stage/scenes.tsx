"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconLightbulb } from "@/components/icons";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";
import type { InteractiveScene, ProjectScene, QuizScene, SlideScene, Subject, Widget } from "@/lib/types";
import { VisualView } from "./visuals";
import { FractionBar } from "./widgets/FractionBar";
import { MoonPhases } from "./widgets/MoonPhases";
import { NumberLineWidget } from "./widgets/NumberLine";
import { Sorter } from "./widgets/Sorter";
import { StatesOfMatter } from "./widgets/StatesOfMatter";

export const TINT: Record<Subject, string> = {
  math: "var(--color-math)",
  science: "var(--color-science)",
  english: "var(--color-english)",
  other: "var(--color-ink)",
};

/** Everything a learner checks reports here: right or not, and whether help was used. */
export type OnAnswer = (a: { sceneId: string; correct: boolean; assisted: boolean }) => void;

export function SlideView({ scene, subject }: { scene: SlideScene; subject: Subject }) {
  return (
    <div className="space-y-5">
      {scene.blocks.map((b, i) =>
        b.type === "text" ? (
          <p key={i} className="max-w-prose text-t3 font-normal leading-relaxed text-ink">
            {b.text}
          </p>
        ) : b.type === "points" ? (
          <ul key={i} className="max-w-prose space-y-2">
            {b.items.map((item) => (
              <li key={item} className="flex gap-3 text-body text-ink">
                <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full" style={{ background: TINT[subject] }} />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <figure key={i} className="flex justify-center rounded-md bg-panel2 px-4 py-6">
            <VisualView visual={b.visual} alt={b.alt} tint={TINT[subject]} />
          </figure>
        ),
      )}
    </div>
  );
}

export function WidgetView({ widget, subject, onCheck, lang }: { widget: Widget; subject: Subject; onCheck: (ok: boolean) => void; lang: string }) {
  switch (widget.kind) {
    case "fraction-bar":
      return <FractionBar widget={widget} onCheck={onCheck} tint={TINT[subject]} />;
    case "number-line":
      return <NumberLineWidget widget={widget} onCheck={onCheck} tint={TINT[subject]} />;
    case "states-of-matter":
      return <StatesOfMatter widget={widget} onCheck={onCheck} />;
    case "moon-phases":
      return <MoonPhases widget={widget} onCheck={onCheck} />;
    case "sorter":
      return <Sorter widget={widget} onCheck={onCheck} lang={lang} />;
  }
}

export function InteractiveView({ scene, subject, onAnswer, lang }: { scene: InteractiveScene; subject: Subject; onAnswer: OnAnswer; lang: string }) {
  return (
    <div className="space-y-6">
      <p className="max-w-prose text-t3 font-normal text-ink">{scene.prompt}</p>
      <WidgetView widget={scene.widget} subject={subject} lang={lang} onCheck={(correct) => onAnswer({ sceneId: scene.id, correct, assisted: false })} />
    </div>
  );
}

/** One question at a time. A hint, or reading the explanation after a miss, marks the answer as helped. */
export function QuizView({ scene, onAnswer, onSpeakText }: { scene: QuizScene; onAnswer: OnAnswer; onSpeakText: (text: string) => void }) {
  const t = useT();
  const [qi, setQi] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const [why, setWhy] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const q = scene.questions[qi];
  const assisted = hint || why;

  useEffect(() => {
    onSpeakText(`${q.prompt} ${q.choices.map((c, i) => `${i + 1}. ${c}.`).join(" ")}`);
  }, [q, onSpeakText]);

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

  return (
    <div className="space-y-5">
      <p className="font-opmono text-xs tabular-nums text-muted">{t("stage.question", { n: qi + 1, total: scene.questions.length })}</p>
      <fieldset key={q.id} className="space-y-4">
        <legend className="max-w-prose text-t3 font-semibold text-ink">{q.prompt}</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {q.choices.map((c, i) => {
            const picked = choice === i;
            const showRight = result !== null && result && i === q.answer;
            const showWrong = result === false && picked;
            return (
              <label
                key={i}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-body transition-colors ${
                  showRight ? "border-good bg-good/10" : showWrong ? "border-bad bg-bad/5" : picked ? "border-ink bg-panel" : "border-border bg-panel hover:border-ink/30"
                } ${result === true ? "pointer-events-none" : ""}`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={picked}
                  disabled={result === true}
                  onChange={() => (setChoice(i), result === false && setResult(null))}
                  className="size-4 accent-[var(--color-ink)]"
                />
                <span className="text-ink">{c}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {hint && (
        <p className="flex max-w-prose gap-2.5 rounded-sm bg-warn/10 px-4 py-3 text-sm text-ink">
          <IconLightbulb size={18} className="shrink-0 text-warn" /> {q.hint}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {result !== true && (
          <>
            <Button onClick={check} disabled={choice === null}>
              {t("stage.check")}
            </Button>
            {!hint && (
              <Button variant="ghost" onClick={() => setHint(true)}>
                <IconLightbulb size={16} /> {t("stage.hint")}
              </Button>
            )}
          </>
        )}
        <p role="status" className={`text-sm font-medium ${result === null ? "sr-only" : result ? "text-good" : "text-bad"}`}>
          {result === null ? "" : result ? (assisted ? t("stage.correctHelped") : t("stage.correct")) : t("stage.incorrect")}
        </p>
        {result === false && !why && (
          <Button variant="ghost" size="sm" onClick={() => setWhy(true)}>
            {t("stage.why")}
          </Button>
        )}
      </div>

      {(why || result === true) && <p className="max-w-prose rounded-sm bg-panel2 px-4 py-3 text-sm text-ink">{q.explain}</p>}

      {result === true && qi < scene.questions.length - 1 && (
        <Button variant="secondary" onClick={next}>
          {t("stage.nextQuestion")}
        </Button>
      )}
    </div>
  );
}

export function ProjectView({ scene }: { scene: ProjectScene }) {
  const t = useT();
  const [done, setDone] = useState<Set<number>>(new Set());
  return (
    <div className="space-y-5">
      <p className="max-w-prose text-t3 font-normal text-ink">{scene.brief}</p>
      <ol className="space-y-2.5">
        {scene.steps.map((step, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-panel px-4 py-3">
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
              <span className={`text-body ${done.has(i) ? "text-muted line-through decoration-border" : "text-ink"}`}>{step}</span>
            </label>
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

/** Text the Read aloud button speaks for a scene (quiz text comes from the current question). */
export function sceneSpeech(scene: SlideScene | InteractiveScene | ProjectScene): string {
  if (scene.kind === "slide")
    return [scene.title, ...scene.blocks.map((b) => (b.type === "text" ? b.text : b.type === "points" ? b.items.join(". ") : b.alt))].join(". ");
  if (scene.kind === "interactive") return `${scene.title}. ${scene.prompt}`;
  return [scene.title, scene.brief, ...scene.steps].join(". ");
}
