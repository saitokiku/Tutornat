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

/** How the learner answers. keypad = digits (and − . when `keys` allows), fraction = numerator/denominator. */
export type Input = "keypad" | "fraction" | "choices" | "text" | "expr" | "remainder";

export type Choice = { label: string; say?: string; picture?: string };

export type ItemBody = {
  prompt: MathPart[];
  /** What a read-aloud says. Never contains notation like "3/4" or "x^2". */
  say: string;
  visual?: Visual;
  /** One large picture (an emoji) for pre-readers, e.g. the word being sounded out. Described by `alt`. */
  picture?: string;
  /** Text description of the visual or picture for screen readers. Required when either is set. */
  alt?: string;
  choices?: Choice[];
  input: Input;
  /** Extra keys on the keypad: "-" for negatives, "." for decimals. */
  keys?: ("-" | ".")[];
  answer: Answer;
  /** The hint ladder, smallest first: a nudge, a strategy, then the first step done. */
  hints: string[];
  /** A worked solution, shown after real attempts or on request (which marks the answer helped). */
  steps: string[];
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
