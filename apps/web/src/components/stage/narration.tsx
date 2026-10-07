"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { IconStop } from "@/components/icons";
import { btn } from "@/components/ui";
import { useT } from "@/i18n";
import type { Block, ProjectScene, QuizQuestion, Scene, SlideScene } from "@/lib/types";
import { bigButton, useHear } from "./hear";
import type { Segment, SpeechPos, useSpeech } from "./useSpeech";

// Narrated scenes: the voice reads a scene piece by piece, and the word being read is marked where it
// sits on screen. Segment keys tie each spoken piece to the text that shows it.

export const NarrationContext = createContext<SpeechPos | null>(null);

/**
 * K–2 sees a picture before the words: the first picture moves to the top. Any later picture stays
 * beside the words it follows (a before / after pair keeps its sentence between them).
 */
export function orderBlocks(blocks: Block[], young: boolean) {
  const indexed = blocks.map((b, i) => ({ b, i }));
  const first = indexed.findIndex((x) => x.b.type === "visual");
  if (!young || first <= 0) return indexed;
  return [indexed[first], ...indexed.filter((_, k) => k !== first)];
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

/**
 * The pieces a scene reads aloud, in screen order. `live` is what the scene body reports about itself
 * as it changes: the quiz question on screen, or a manipulative's steps and word tiles in the order
 * they sit now.
 */
export function sceneSegments(scene: Scene, young: boolean, live: Segment[]): Segment[] {
  if (scene.kind === "slide") return slideSegments(scene, young);
  if (scene.kind === "quiz") return live;
  if (scene.kind === "interactive") {
    const out: Segment[] = [
      { key: "title", text: scene.title },
      { key: "prompt", text: scene.prompt },
    ];
    const w = scene.widget;
    if (w.kind === "sorter") {
      out.push({ key: "cats", text: `${w.categories.join(", ")}.` });
      for (const it of w.items) out.push({ key: `item.${it.id}`, text: it.text });
    }
    return [...out, ...live];
  }
  return projectSegments(scene);
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
 * piece is underlined. On a "say it with me" turn the line stays underlined with a speaking mark.
 * `offset` places this text inside a longer spoken piece (a quiz question).
 */
export function Spoken({ k, text, offset = 0 }: { k: string; text: string; offset?: number }) {
  const pos = useContext(NarrationContext);
  if (!pos || pos.key !== k) return <>{text}</>;
  if (pos.start < 0)
    return (
      <>
        <span data-spoken="segment" className={PIECE}>
          {text}
        </span>
        {pos.turn && (
          <span data-spoken="turn" aria-hidden="true" className="ml-2 inline-grid size-7 place-items-center rounded-full bg-accent/10 align-middle text-accent">
            <IconSay size={18} />
          </span>
        )}
      </>
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

const P = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const IconPlay = ({ size = 16 }: { size?: number }) => (
  <svg {...P} width={size} height={size}>
    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
  </svg>
);
const IconPause = ({ size = 16 }: { size?: number }) => (
  <svg {...P} width={size} height={size}>
    <path d="M9 5.5v13M15 5.5v13" />
  </svg>
);
const IconRepeat = ({ size = 16 }: { size?: number }) => (
  <svg {...P} width={size} height={size}>
    <path d="M5 11.5V10a3.5 3.5 0 0 1 3.5-3.5H18m-3-3 3 3-3 3M19 12.5V14a3.5 3.5 0 0 1-3.5 3.5H6m3 3-3-3 3-3" />
  </svg>
);
/** Open lips: "now you say it". */
const IconSay = ({ size = 16 }: { size?: number }) => (
  <svg {...P} width={size} height={size}>
    <path d="M3 12C6 8 9 7.5 12 9.5 15 7.5 18 8 21 12 18 16.5 15 18 12 18S6 16.5 3 12Z" />
    <path d="M6 12.3c3 1.2 9 1.2 12 0" />
  </svg>
);

type Speech = ReturnType<typeof useSpeech>;

/**
 * Play / pause / stop for the scene's narration, and "Say it with me" for K–2 slides. One toggle button
 * changes between read, pause and resume so keyboard focus stays put. Hidden when the browser can't
 * speak; if speaking fails, it says so and the words stay on screen.
 */
export function NarrationBar({ speech, segments, repeat }: { speech: Speech; segments: Segment[]; repeat?: Segment[] }) {
  const t = useT();
  const { young } = useHear();
  const toggle = useRef<HTMLButtonElement>(null);
  if (!speech.supported || !segments.length) return null;
  const { status } = speech;
  const label = status === "idle" ? t("stage.readAloud") : status === "paused" ? t("stg.resume") : t("stg.pause");
  const onToggle = () => (status === "idle" ? speech.narrate(segments) : status === "paused" ? speech.resume() : speech.pause());
  const icon = young ? 20 : 16;
  const said = status === "paused" ? t("stg.paused") : status === "turn" ? t("stg.yourTurn") : status === "idle" && speech.failed ? t("stg.speechFailed") : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button ref={toggle} type="button" onClick={onToggle} aria-label={label} className={btn("secondary", "md", bigButton(young))}>
        {status === "idle" || status === "paused" ? <IconPlay size={icon} /> : <IconPause size={icon} />} {label}
      </button>
      {status === "idle" && repeat && repeat.length > 0 && (
        <button
          type="button"
          onClick={() => (speech.narrate(repeat, { repeat: true, cue: t("stg.yourTurnCue") }), toggle.current?.focus())}
          className={btn("secondary", "md", bigButton(young))}
        >
          <IconRepeat size={icon} /> {t("stg.sayWithMe")}
        </button>
      )}
      {status !== "idle" && (
        <button type="button" onClick={() => (speech.stop(), toggle.current?.focus())} aria-label={t("stage.stopReading")} className={btn("ghost", "md", `${bigButton(young)} min-w-11`)}>
          <IconStop size={icon} /> <span className="hidden sm:inline">{t("stage.stopReading")}</span>
        </button>
      )}
      <p
        role="status"
        className={`inline-flex items-center gap-1.5 font-medium ${young ? "text-body" : "text-sm"} ${status === "turn" ? "text-accent" : "text-muted"} ${said ? "" : "sr-only"}`}
      >
        {status === "turn" && <IconSay size={young ? 22 : 18} />}
        {said}
      </p>
    </div>
  );
}
