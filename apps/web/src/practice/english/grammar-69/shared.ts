import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody, MathPart, Skill } from "../../types";

// The machinery shared by the grades 6–9 grammar, usage, vocabulary and rhetoric strand. Every item comes
// from a hand-written bank (draft: not yet reviewed by a teacher). Each entry has an English and a Spanish
// version. The Spanish one teaches the Spanish-language skill with Spanish examples (concordancia,
// "mismo" and "consigo", especificativas and explicativas, raya, dequeísmo, modos verbales,
// subordinadas…), not a translation of an English-only rule. The entry is picked before anything else,
// so a seed lands on the same entry in both languages.
//
// Every wrong choice carries a kebab-case misconception tag (`why`), reused across its skill, so a miss
// becomes a diagnosis in the learner model.

export type Bi<T> = { en: T; es: T };
export const lang = <T>(locale: Locale, b: Bi<T>): T => (locale === "es" ? b.es : b.en);

/** Quotes a word or sentence inside learner copy. */
export const q = (s: string) => `“${s}”`;
/** Joins the parts of a prompt; a renderer that keeps line breaks shows them as paragraphs. */
const para = (...lines: string[]) => lines.join("\n\n");

/** A wrong choice and the misconception it shows. */
export type W = [label: string, why: string];

/**
 * One bank entry: the text shown (a sentence with ___ for a blank, a passage, or "" when the question
 * says it all), the right choice, the wrong ones with their tags, the clue (hint 3: the first step, never
 * the answer), the explanation (the first worked step), and the words the question points at ({t}).
 */
export type Entry = [shown: string, right: string, wrong: W[], clue: string, explain: string, target?: string];

export type Level = {
  bank: Bi<Entry>[];
  /** The question. {t} is replaced by the entry's target words, quoted. */
  ask: Bi<string>;
  /** Hints 1 and 2 (a nudge and the strategy); the entry's clue is hint 3. */
  hints: Bi<[string, string]>;
  seconds: number;
  /** Category answers (moods, clause types…) keep one fixed order so the buttons stay put. */
  order?: Bi<string[]>;
};

/** A sentence with ___ becomes prompt parts with an answer blank. */
function blanked(sentence: string): MathPart[] {
  const [before, after] = sentence.split("___");
  return [...(before ? [before] : []), { blank: true }, ...(after ? [after] : [])];
}
const sayBlank = (locale: Locale, sentence: string) => sentence.replace("___", tr(locale, "blank", "espacio en blanco"));
/**
 * The shown text as it is read aloud before the question: a word pair "finger : hand" becomes "finger and
 * hand" ("e" before an i sound in Spanish: "valiente e intrépido"), and a bare word or pair gets a full
 * stop so the voice pauses before the question.
 */
const spoken = (locale: Locale, shown: string) => {
  const s = shown.replace(/ : (?=(\p{L}+))/gu, (_, next: string) => (locale === "en" ? " and " : /^h?[ií](?![aeiouáéíóú])/i.test(next) ? " e " : " y "));
  return /[\p{L}\p{N}]$/u.test(s) ? `${s}.` : s;
};
const fill = (sentence: string, word: string) => {
  const out = sentence.replace("___", word);
  return out.charAt(0).toUpperCase() + out.slice(1);
};

function build(r: Rng, locale: Locale, level: Level): ItemBody {
  const [shown, right, allWrong, clue, explain, target] = lang(locale, r.pick(level.bank));
  // Category levels with more than four names show the answer and three others.
  const wrong = allWrong.length > 3 ? r.shuffle(allWrong).slice(0, 3) : allWrong;
  const order = level.order ? lang(locale, level.order) : null;
  const labels = order ? order.filter((l) => l === right || wrong.some(([w]) => w === l)) : r.shuffle([right, ...wrong.map(([w]) => w)]);
  const choices: Choice[] = labels.map((label) => {
    const miss = wrong.find(([w]) => w === label);
    return miss ? { label, why: miss[1] } : { label };
  });
  const ask = lang(locale, level.ask).replace("{t}", target ? q(target) : "");
  const blank = shown.includes("___");
  const prompt: MathPart[] = blank ? [`${ask}\n\n`, ...blanked(shown)] : [shown ? para(shown, ask) : ask];
  const say = blank ? `${ask} ${sayBlank(locale, shown)}` : shown ? `${spoken(locale, shown)} ${ask}` : ask;
  const [nudge, strategy] = lang(locale, level.hints);
  return {
    prompt,
    say,
    choices,
    input: "choices",
    answer: { kind: "choice", index: labels.indexOf(right) },
    hints: [nudge, strategy, clue],
    steps: [explain, blank ? fill(shown, right) : tr(locale, `Answer: ${right}`, `Respuesta: ${right}`)],
    seconds: level.seconds,
  };
}

/** Every level of every skill in this strand, by skill id (index 0 = level 1), so the tests can check every entry. */
export const GRAMMAR_LEVELS: Record<string, Level[]> = {};

type Meta = Pick<Skill, "id" | "grade" | "title" | "standard" | "prereqs">;
export function skill(meta: Meta, levels: Level[]): Skill {
  GRAMMAR_LEVELS[meta.id] = levels;
  return { ...meta, subject: "english", content: "draft", levels: levels.length, generate: (r, level, locale) => build(r, locale, levels[level - 1]) };
}

/** A category entry: the text, the right category, the clue, the explanation and the target words. */
export type Cat<K extends string> = [shown: string, key: K, clue: string, explain: string, target?: string];

/**
 * Turns category entries into ordinary entries. Picking category k when the answer is `key` is tagged
 * "key-as-k" (e.g. "gerund-as-participle": a gerund taken for a participle).
 */
export function cats<K extends string>(names: Bi<Partial<Record<K, string>>>, keys: Bi<readonly K[]>, bank: Bi<Cat<K>>[]): Pick<Level, "bank" | "order"> {
  const one = (l: Locale, [shown, key, clue, explain, target]: Cat<K>): Entry => [
    shown,
    names[l][key]!,
    keys[l].filter((k) => k !== key).map((k): W => [names[l][k]!, `${key}-as-${k}`]),
    clue,
    explain,
    target,
  ];
  return {
    bank: bank.map((b) => ({ en: one("en", b.en), es: one("es", b.es) })),
    order: { en: keys.en.map((k) => names.en[k]!), es: keys.es.map((k) => names.es[k]!) },
  };
}

/** The job a phrase, clause or verbal does in its sentence (used in grades 7 and 8). */
export type GroupJob = "noun" | "adjective" | "adverb";

export const CHOOSE: Bi<string> = { en: "Choose the word that completes the sentence.", es: "Elige la palabra que completa la oración." };
export const PUNCTUATED: Bi<string> = { en: "Which sentence is punctuated correctly?", es: "¿Qué oración está bien puntuada?" };
