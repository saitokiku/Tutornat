"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { IconStop } from "@/components/icons";
import { Button, btn } from "@/components/ui";
import { useT } from "@/i18n";
import type { Block, InteractiveScene, ProjectScene, QuizQuestion, Scene, SlideScene } from "@/lib/types";
import type { Segment, SpeechPos, useSpeech } from "./useSpeech";

// Narrated scenes: the voice reads a scene piece by piece, and the word being read is marked where it
// sits on screen. Segment keys tie each spoken piece to the text that shows it.

export const NarrationContext = createContext<SpeechPos | null>(null);

/** K–2 sees the picture before the words; everyone else reads in the author's order. */
export function orderBlocks(blocks: Block[], young: boolean) {
  const indexed = blocks.map((b, i) => ({ b, i }));
  return young ? [...indexed.filter((x) => x.b.type === "visual"), ...indexed.filter((x) => x.b.type !== "visual")] : indexed;
}

export function slideSegments(scene: SlideScene, young: boolean): Segment[] {
  const out: Segment[] = [{ key: "title", text: scene.title }];
  for (const { b, i } of orderBlocks(scene.blocks, young)) {
    if (b.type === "text") out.push({ key: `b${i}`, text: b.text });
    else if (b.type === "points") b.items.forEach((item, j) => out.push({ key: `b${i}.${j}`, text: item }));
    else out.push({ key: `v${i}`, text: b.alt });
  }
  return out;
}

/** "Say it with me": the lines a learner repeats (words only; picture descriptions are not chanted). */
export const repeatSegments = (scene: SlideScene, young: boolean) => slideSegments(scene, young).filter((s) => !s.key.startsWith("v"));

/** A quiz question as one spoken piece, with where the prompt and each choice sit in it. */
export function quizSpeech(q: QuizQuestion) {
  let text = q.prompt;
  const choices: number[] = [];
  q.choices.forEach((c, i) => {
    text += ` ${i + 1}. `;
    choices.push(text.length);
    text += `${c}.`;
  });
  return { text, prompt: 0, choices };
}

export function sceneSegments(scene: Scene, young: boolean, quizText: string): Segment[] {
  if (scene.kind === "slide") return slideSegments(scene, young);
  if (scene.kind === "quiz") return quizText ? [{ key: "quiz", text: quizText }] : [];
  if (scene.kind === "interactive") return interactiveSegments(scene);
  return projectSegments(scene);
}

function interactiveSegments(scene: InteractiveScene): Segment[] {
  const out: Segment[] = [
    { key: "title", text: scene.title },
    { key: "prompt", text: scene.prompt },
  ];
  const w = scene.widget;
  if (w.kind === "sorter") {
    out.push({ key: "cats", text: `${w.categories.join(", ")}.` });
    for (const it of w.items) out.push({ key: `item.${it.id}`, text: it.text });
  }
  return out;
}

const projectSegments = (scene: ProjectScene): Segment[] => [
  { key: "title", text: scene.title },
  { key: "brief", text: scene.brief },
  ...scene.steps.map((s, i) => ({ key: `step.${i}`, text: s })),
];

const WORD =
  "rounded-sm bg-accent/15 text-ink box-decoration-clone motion-safe:transition-colors motion-safe:duration-150 motion-reduce:bg-transparent motion-reduce:underline motion-reduce:decoration-accent motion-reduce:decoration-2 motion-reduce:underline-offset-4";
const PIECE = "underline decoration-accent/50 decoration-2 underline-offset-4";

/**
 * Text that can be narrated. While the voice reads it, the current word is marked (a soft rose
 * highlight, or a still underline with reduced motion); before the browser reports words, the whole
 * piece is underlined. `offset` places this text inside a longer spoken piece (a quiz question).
 */
export function Spoken({ k, text, offset = 0 }: { k: string; text: string; offset?: number }) {
  const pos = useContext(NarrationContext);
  if (!pos || pos.key !== k) return <>{text}</>;
  if (pos.start < 0)
    return (
      <span data-spoken="segment" className={PIECE}>
        {text}
      </span>
    );
  const local = pos.start - offset;
  if (local < 0 || local >= text.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let last = 0;
  let marked = false;
  for (const m of text.matchAll(/\S+/g)) {
    const s = m.index, e = s + m[0].length;
    if (s > last) parts.push(text.slice(last, s));
    if (!marked && e > local) {
      marked = true;
      parts.push(
        <span key={s} data-spoken="word" className={WORD}>
          {m[0]}
        </span>,
      );
    } else parts.push(m[0]);
    last = e;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** Is this piece being read right now (for marking pictures and showing their spoken caption)? */
export const useNarrating = (k: string) => useContext(NarrationContext)?.key === k;

const P = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const IconPlay = () => (
  <svg {...P}>
    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
  </svg>
);
const IconPause = () => (
  <svg {...P}>
    <path d="M9 5.5v13M15 5.5v13" />
  </svg>
);
const IconRepeat = () => (
  <svg {...P}>
    <path d="M5 11.5V10a3.5 3.5 0 0 1 3.5-3.5H18m-3-3 3 3-3 3M19 12.5V14a3.5 3.5 0 0 1-3.5 3.5H6m3 3-3-3 3-3" />
  </svg>
);

type Speech = ReturnType<typeof useSpeech>;

/**
 * Play / pause / stop for the scene's narration, and "Say it with me" for K–2 slides. One toggle button
 * changes between read, pause and resume so keyboard focus stays put. Hidden when the browser can't speak.
 */
export function NarrationBar({ speech, segments, repeat }: { speech: Speech; segments: Segment[]; repeat?: Segment[] }) {
  const t = useT();
  const toggle = useRef<HTMLButtonElement>(null);
  if (!speech.supported || !segments.length) return null;
  const { status } = speech;
  const label = status === "idle" ? t("stage.readAloud") : status === "paused" ? t("stg.resume") : t("stg.pause");
  const onToggle = () => (status === "idle" ? speech.narrate(segments) : status === "paused" ? speech.resume() : speech.pause());
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button ref={toggle} type="button" onClick={onToggle} aria-label={label} className={btn("secondary")}>
        {status === "idle" || status === "paused" ? <IconPlay /> : <IconPause />} {label}
      </button>
      {status === "idle" && repeat && repeat.length > 0 && (
        <Button variant="secondary" onClick={() => (speech.narrate(repeat, { repeat: true }), toggle.current?.focus())}>
          <IconRepeat /> {t("stg.sayWithMe")}
        </Button>
      )}
      {status !== "idle" && (
        <Button variant="ghost" onClick={() => (speech.stop(), toggle.current?.focus())} aria-label={t("stage.stopReading")}>
          <IconStop size={16} /> <span className="hidden sm:inline">{t("stage.stopReading")}</span>
        </Button>
      )}
      <p role="status" className={`text-sm font-medium ${status === "turn" ? "text-accent" : "text-muted"} ${status === "paused" || status === "turn" ? "" : "sr-only"}`}>
        {status === "paused" ? t("stg.paused") : status === "turn" ? t("stg.yourTurn") : ""}
      </p>
    </div>
  );
}
