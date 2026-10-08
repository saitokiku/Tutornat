import type { Grade, Locale, Subject, Visual } from "@/lib/types";
import type { Rng } from "./rng";

// Practice is the at-home daily work: short sheets of problems built from seeds, checked
// deterministically, with a hint ladder and corrections. Items are pure functions of
// (skill, level, seed, locale), so a sheet stores seeds, not problems.

/** Inline math for prompts: plain text with stacked fractions, powers and an answer blank. */
export type MathPart = string | { frac: [number | string, number | string] } | { sup: [string, string] } | { blank: true };

export type Answer =
  | { kind: "number"; value: number; tolerance?: number }
  | { kind: "fraction"; n: number; d: number; simplest?: boolean }
  | { kind: "choice"; index: number }
  | { kind: "text"; accept: string[] }
  | { kind: "expr"; expr: string; form?: "factored" | "expanded" | "simplified" }
  | { kind: "set"; values: number[] }
  | { kind: "pair"; x: number; y: number }
  | { kind: "remainder"; q: number; r: number };

/**
 * How the learner answers. keypad = digits (and − . when `keys` allows), fraction = numerator/denominator.
 * Touch pads answer by doing: number-line = tap a point (response "3/4" or "-2"), fraction-bar = choose
 * parts and shade (response "3/4"), clock = set the hands (response "h:mm"). Each needs `pad`.
 */
export type Input = "keypad" | "fraction" | "choices" | "text" | "expr" | "remainder" | "number-line" | "fraction-bar" | "clock";

/** Settings for the touch pads. */
export type Pad =
  | { kind: "number-line"; min: number; max: number; step: number; denominator?: number }
  | { kind: "fraction-bar"; parts?: number; maxParts: number }
  | { kind: "clock"; stepMinutes: 1 | 5 | 15 | 30 | 60 };

/**
 * A choice. `why` names the misconception a wrong choice represents (kebab-case, reused across a
 * skill, e.g. "added-denominators"), so a miss becomes a diagnosis in the learner model.
 */
export type Choice = { label: string; say?: string; picture?: string; why?: string };

/** A block of a reading text: a paragraph or stanza (line breaks kept), a heading, or a box set apart (a fact box, glossary, timeline). */
export type PassageBlock = { text: string; kind?: "heading" | "box" };
/** A text to read before the question. `label` names it when two texts are read together ("Text 1"). */
export type ReadingText = { title: string; label?: string; blocks: PassageBlock[] };

export type ItemBody = {
  prompt: MathPart[];
  /** What a read-aloud says. Never contains notation like "3/4" or "x^2". */
  say: string;
  /** Reading items: the text (or two texts) to read, shown above the question; the prompt is then only the question. */
  passage?: ReadingText[];
  visual?: Visual;
  /** One large picture (an emoji) for pre-readers, e.g. the word being sounded out. Described by `alt`. */
  picture?: string;
  /** Text description of the visual or picture for screen readers. Required when either is set. */
  alt?: string;
  choices?: Choice[];
  input: Input;
  /** Extra keys on the keypad: "-" for negatives, "." for decimals. */
  keys?: ("-" | ".")[];
  /** Settings for touch pads (number-line, fraction-bar, clock inputs). */
  pad?: Pad;
  /** Counters in the visual (dots, ten-frame, array) can be tapped to mark them while counting. */
  markable?: boolean;
  /** Likely wrong typed answers and the misconception each shows, e.g. [{ value: "5/12", why: "added-denominators" }]. */
  wrong?: { value: string; why: string }[];
  answer: Answer;
  /** The hint ladder, smallest first: a nudge, a strategy, then the first step done. */
  hints: string[];
  /** What a read-aloud says for each hint, when it differs from the hint as written (Spanish says the letter y as "ye"). */
  hintsSay?: string[];
  /** A worked solution, shown after real attempts or on request (which marks the answer helped). */
  steps: string[];
  /** What a read-aloud says for the steps, when it differs from the steps as written. */
  stepsSay?: string[];
  /** A comfortable pace in seconds for a learner who knows this (Kumon's "standard time"), never a limit. */
  seconds: number;
};

export type Item = ItemBody & { id: string; skillId: string; level: number; seed: number };

export type Skill = {
  id: string;
  subject: Subject;
  /** The grade where this is usually taught (US). */
  grade: Grade;
  title: Record<Locale, string>;
  /** Common Core code where one fits. */
  standard?: string;
  /**
   * Levels of a merged skill that practise a different code than `standard`, by level: { 3: "4.OA.A.3" }.
   * Wherever a skill's standard is shown, these are shown too (`standardsOf`); one level's code is `standardAt`.
   */
  levelStandards?: Record<number, string>;
  /** Every code the skill's levels teach, when there is more than one: `standard` first, then the rest. `standardsOf` includes them. */
  standards?: string[];
  prereqs: string[];
  /** Difficulty steps inside the skill, 1-based. */
  levels: number;
  /**
   * computed: answers are calculated, so a key cannot be wrong. draft: hand-written questions not yet
   * reviewed by a teacher; they count, and every surface that reports them says "draft questions".
   */
  content: "computed" | "draft";
  generate: (r: Rng, level: number, locale: Locale) => ItemBody;
};
