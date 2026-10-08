import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody, MathPart, Skill } from "../../types";

// Shared pieces of the K–2 phonics strand. Every skill is a hand-written bank (content "draft"). An
// entry has an English and a Spanish question in the same slot; the Spanish one teaches the matching
// Spanish skill with Spanish words (sílabas, ch / ll / rr, h muda, qu / gu / gü…), not a translation.
//
// Audio scripts: `say` is what the browser reads aloud. Browser speech cannot say a lone phoneme, so
// a sound is always named through a whole word ("the sound at the start of sun") or a letter name.
// Spanish syllables (ma, pe, tro) are said as written, since Spanish speech reads them reliably.
//
// Every wrong choice carries a kebab-case `why` tag (rule 16); the key carries none.

/** One question in one language. `choices[0]` is the key; the generator shuffles. */
export type Q = { prompt: string; say: string; picture?: string; alt?: string; choices: Choice[]; hints: string[]; steps: string[] };
export type Entry = Record<Locale, Q>;

/** Pairs the English and Spanish lists slot by slot, so a seed picks the same slot in both. */
export function both<T, U>(en: T[], es: U[], buildEn: (d: T) => Q, buildEs: (d: U) => Q): Entry[] {
  if (en.length !== es.length) throw new Error(`English has ${en.length} items, Spanish ${es.length}`);
  return en.map((d, i) => ({ en: buildEn(d), es: buildEs(es[i]) }));
}
/** Same data shape in both languages, one builder that takes the locale. */
export const same = <T>(en: T[], es: T[], build: (locale: Locale, d: T) => Q) => both(en, es, (d) => build("en", d), (d) => build("es", d));

/** "___" in a prompt becomes the answer blank. */
export const toParts = (s: string): MathPart[] => s.split("___").flatMap((p, i): MathPart[] => (i ? [{ blank: true }, p] : [p])).filter((p) => p !== "");
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** The screen-reader text for a picture of a word. */
export const altFor = (locale: Locale, w: string) => tr(locale, `${/^[aeiou]/.test(w) ? "An" : "A"} ${w}`, `Imagen: ${w}`);

/** A picture choice a pre-reader can hear: the word is the label and the spoken line. */
export const pic = (label: string, picture: string, why?: string): Choice => ({ label, say: label, picture, ...(why ? { why } : {}) });
/** A written choice that is not read aloud (reading it is the skill). */
export const word = (label: string, why?: string): Choice => ({ label, ...(why ? { why } : {}) });
/** A choice read aloud with its own spoken line (letter names, sound anchors). */
export const voiced = (label: string, say: string, why?: string): Choice => ({ label, say, ...(why ? { why } : {}) });

/** English vowel letters as read aloud: the letter with a word that starts with its short sound. */
export const EN_VOWEL_SAY: Record<string, string> = { a: "a, as in apple", e: "e, as in egg", i: "i, as in itch", o: "o, as in octopus", u: "u, as in up" };
/** Spanish vowels are read by name, which is also their sound. */
export const ES_VOWEL_SAY: Record<string, string> = { a: "a", e: "e", i: "i", o: "o", u: "u" };

export function fromBank(bank: Entry[][], seconds: number[]): Skill["generate"] {
  return (r: Rng, level: number, locale: Locale): ItemBody => {
    const q = r.pick(bank[level - 1])[locale];
    const order = r.shuffle(q.choices.map((_, i) => i));
    return {
      prompt: toParts(q.prompt),
      say: q.say,
      ...(q.picture ? { picture: q.picture, alt: q.alt } : {}),
      choices: order.map((i) => q.choices[i]),
      input: "choices",
      answer: { kind: "choice", index: order.indexOf(0) },
      hints: q.hints,
      steps: q.steps,
      seconds: seconds[Math.min(level, seconds.length) - 1],
    };
  };
}

export type Meta = Pick<Skill, "id" | "grade" | "title" | "standard" | "prereqs">;
export const skill = (meta: Meta, bank: Entry[][], seconds: number[]): Skill => ({
  ...meta,
  subject: "english",
  content: "draft",
  levels: bank.length,
  generate: fromBank(bank, seconds),
});
