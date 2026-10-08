import type { Locale, Visual } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody, MathPart } from "../../types";

// Shared shape and builder for the K–5 science question banks (strand SCIENCE_K_5_MORE).
// K–2 entries are picture-first: a picture on every question and on every choice, and every line can
// be read aloud, so a child who cannot read yet answers by looking and listening. Every wrong choice
// carries a kebab-case `why` tag naming the mistake it stands for; the key never carries one.

/** An English / Spanish pair. A seed picks the same entry in both languages. */
export type Pair = readonly [en: string, es: string];
/** A choice. `why` is set on every wrong choice and never on the key. */
export type Option = { t: Pair; say?: Pair; pic?: string; why?: string };
export type Entry = {
  /** The prompt; "▢" marks the answer blank. */
  q: Pair;
  /** The read-aloud line when the prompt has symbols. Defaults to `q`. */
  say?: Pair;
  pic?: string;
  visual?: Visual;
  alt?: Pair;
  /** The choices; the first is the key. They are shuffled per seed. */
  a: readonly Option[];
  /** Hint 1 (a nudge) and hint 3 (the first step). Hint 2, the strategy, comes from the level unless `strat` is set. */
  h: readonly [Pair, Pair];
  strat?: Pair;
  /** The worked solution, ending with the answer. */
  s: readonly Pair[];
};
export type BankLevel = { strat: Pair; seconds: number; items: readonly Entry[] };

/** The key. */
export const k = (en: string, es: string, pic?: string): Option => (pic ? { t: [en, es], pic } : { t: [en, es] });
/** A wrong choice and the misconception it stands for. */
export const x = (why: string, en: string, es: string, pic?: string): Option => (pic ? { t: [en, es], pic, why } : { t: [en, es], why });
/** A shared choice used as a wrong answer, tagged for this entry. */
export const as = (why: string, o: Option): Option => ({ ...o, why });

/** Prompt text to parts, turning each "▢" into the answer blank. */
function parts(text: string): MathPart[] {
  const out: MathPart[] = [];
  text.split("▢").forEach((piece, i) => {
    if (i > 0) out.push({ blank: true });
    if (piece) out.push(piece);
  });
  return out;
}

export function fromBank(r: Rng, level: BankLevel, locale: Locale): ItemBody {
  const e = r.pick(level.items);
  const t = (p: Pair) => tr(locale, p[0], p[1]);
  const order = r.shuffle(e.a.map((_, i) => i));
  const choices: Choice[] = order.map((i) => {
    const c = e.a[i];
    return { label: t(c.t), say: t(c.say ?? c.t), ...(c.pic ? { picture: c.pic } : {}), ...(c.why ? { why: c.why } : {}) };
  });
  return {
    prompt: parts(t(e.q)),
    say: t(e.say ?? e.q),
    ...(e.pic ? { picture: e.pic } : {}),
    ...(e.visual ? { visual: e.visual } : {}),
    ...(e.alt ? { alt: t(e.alt) } : {}),
    choices,
    input: "choices",
    answer: { kind: "choice", index: order.indexOf(0) },
    hints: [t(e.h[0]), t(e.strat ?? level.strat), t(e.h[1])],
    steps: e.s.map(t),
    seconds: level.seconds,
  };
}

export const SAME = "⚖️";
export const NONE = "🚫";
