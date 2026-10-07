import type { Locale } from "@/lib/types";

// What a voice should actually say for a sentence written for the screen: no markdown marks, no links,
// no emoji, math said in words ("3/4" → "three fourths", "5 × 2 = 10" → "5 times 2 equals 10"), and
// the learner's name left out of anything sent to a vendor. Works word by word so every spoken word
// knows which written word it came from — that is what lets the screen highlight along.

export type Speakable = {
  /** What to send to the voice. */
  text: string;
  /** words[k] = index of the written word (in this sentence) that spoken word k came from. */
  words: number[];
};

const FRACTIONS: Record<Locale, Record<number, [string, string]>> = {
  en: {
    2: ["half", "halves"], 3: ["third", "thirds"], 4: ["fourth", "fourths"], 5: ["fifth", "fifths"], 6: ["sixth", "sixths"],
    7: ["seventh", "sevenths"], 8: ["eighth", "eighths"], 9: ["ninth", "ninths"], 10: ["tenth", "tenths"], 11: ["eleventh", "elevenths"],
    12: ["twelfth", "twelfths"], 100: ["hundredth", "hundredths"],
  },
  es: {
    2: ["medio", "medios"], 3: ["tercio", "tercios"], 4: ["cuarto", "cuartos"], 5: ["quinto", "quintos"], 6: ["sexto", "sextos"],
    7: ["séptimo", "séptimos"], 8: ["octavo", "octavos"], 9: ["noveno", "novenos"], 10: ["décimo", "décimos"], 11: ["onceavo", "onceavos"],
    12: ["doceavo", "doceavos"], 100: ["centésimo", "centésimos"],
  },
};

const WORDS = {
  en: { times: "times", div: "divided by", plus: "plus", minus: "minus", eq: "equals", lt: "is less than", gt: "is greater than", le: "is less than or equal to", ge: "is greater than or equal to", ne: "is not equal to", sq: "squared", cube: "cubed", pow: "to the power of", one: "one" },
  es: { times: "por", div: "entre", plus: "más", minus: "menos", eq: "es igual a", lt: "es menor que", gt: "es mayor que", le: "es menor o igual que", ge: "es mayor o igual que", ne: "no es igual a", sq: "al cuadrado", cube: "al cubo", pow: "a la potencia", one: "un" },
} as const;

/** "1/2" → "one half", "3/4" → "3 fourths"; null for denominators a child wouldn't hear as a fraction. */
export function fractionWords(n: number, d: number, locale: Locale): string | null {
  const w = FRACTIONS[locale][d];
  if (!w || n < 0 || n > 99) return null;
  return n === 1 ? `${WORDS[locale].one} ${w[0]}` : `${n} ${w[1]}`;
}

const NUMERIC_END = /[\p{N})]$/u;
const NUMERIC_START = /^[(\p{N}]/u;
const VAR = /^[a-zA-Z]$/;

/** Replaces until nothing changes, so "2×3×4" converts both signs. */
function all(s: string, re: RegExp, to: string): string {
  for (let i = 0; i < 6; i++) {
    const next = s.replace(re, to);
    if (next === s) return s;
    s = next;
  }
  return s;
}

const trimMarks = (tok: string) => tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
const core = (tok: string) => trimMarks(tok).replace(/['’]s$/i, "");
/** Lowercase without accents: "Sofía" and "SOFIA" are the same name. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// "Your test is on 10/12" is a date, not ten twelfths. A small fraction reads as a date after a day or
// month word, or after on/by/el/para… in a sentence that talks about a test, homework or the calendar.
const DAYS = "monday tuesday wednesday thursday friday saturday sunday lunes martes miercoles jueves viernes sabado domingo";
const MONTH_NAMES = "january february march april may june july august september october november december enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre";
const DATE_BEFORE = new Set(`due ${DAYS} ${MONTH_NAMES}`.split(" "));
const DATE_PREP = new Set("on by until till before after from el del para hasta antes desde".split(" "));
const CALENDAR = new RegExp(`\\b(test|quiz|exam|due|homework|project|assignment|calendar|date|examen|prueba|tarea|entrega|proyecto|calendario|fecha|${DAYS.replace(/ /g, "|")}|${MONTH_NAMES.replace(/ /g, "|")})\\b`);

function looksLikeDate(n: number, d: number, prev: string | undefined, calendar: boolean): boolean {
  if (n > 12 || d > 31 || !prev) return false;
  const p = fold(core(prev));
  return DATE_BEFORE.has(p) || (calendar && DATE_PREP.has(p));
}

function sayToken(tok: string, prev: string | undefined, next: string | undefined, first: boolean, locale: Locale, calendar = false): string {
  const W = WORDS[locale];
  let s = tok;
  if (/^[(<[]?(https?:\/\/|www\.)/i.test(s)) return "";
  // LaTeX a model may still write
  s = s
    .replace(/\$(?!\d)/g, "") // math delimiters, not money
    .replace(/\\[dt]?frac\{(\d+)\}\{(\d+)\}/g, "$1/$2")
    .replace(/\\(times|cdot)/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\leq?/g, "≤")
    .replace(/\\geq?/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\[()[\]]/g, "");
  // Markdown
  s = s.replace(/\*\*|__|~~|`/g, "");
  if (first && /^(#{1,6}|>|[-*•+]|\d{1,2}[.)])$/.test(s)) return "";
  s = s.replace(/^#{1,6}(?=\S)/, "").replace(/\]\([^)\s]*\)?/g, "").replace(/^\[/, "").replace(/\]$/, "");
  s = s.replace(/^[*_]+(?=\S)/, "").replace(/([^\s*_])[*_]+([.,!?;:]*)$/, "$1$2");
  s = s.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu, "");
  if (!s) return "";
  // A sign standing alone between two numbers (or a number and a letter like x).
  const between = !!prev && !!next && (NUMERIC_END.test(prev) || VAR.test(prev)) && (NUMERIC_START.test(next) || VAR.test(next));
  if (/^[×·*]$/.test(s)) return between ? W.times : "";
  if (/^[÷/]$/.test(s)) return between ? W.div : s === "/" ? "" : W.div;
  if (/^[−-]$/.test(s)) return between ? W.minus : "";
  if (/^[—–]$/.test(s)) return between && s === "–" ? W.minus : "";
  if (s === "+") return W.plus;
  if (s === "=") return W.eq;
  if (s === "<") return W.lt;
  if (s === ">") return W.gt;
  if (s === "≤") return W.le;
  if (s === "≥") return W.ge;
  if (s === "≠") return W.ne;
  // Signs inside one written word: 3×4=12, 7−2, x^2
  const hasEq = s.includes("=");
  s = all(s, /([\p{N})a-z])[×·*]([(\p{N}a-z])/gu, `$1 ${W.times} $2`);
  s = all(s, /([\p{N})])÷([(\p{N}])/gu, `$1 ${W.div} $2`);
  s = all(s, /([\p{N})a-z])\+([(\p{N}a-z])/gu, `$1 ${W.plus} $2`);
  s = all(s, hasEq ? /([\p{N})a-z])[−-]([(\p{N}a-z])/gu : /([\p{N})])−([(\p{N}])/gu, `$1 ${W.minus} $2`);
  s = all(s, /([^\s=<>])=([^\s=])/gu, `$1 ${W.eq} $2`);
  s = s.replace(/\^2(?!\d)|²/g, ` ${W.sq}`).replace(/\^3(?!\d)|³/g, ` ${W.cube}`).replace(/\^\(?(\d+)\)?/g, ` ${W.pow} $1`);
  s = s.replace(/(^|[^\p{N}/.])(\d{1,2})\/(\d{1,3})(?![\p{N}/])/gu, (m, pre: string, n: string, d: string) => {
    if (looksLikeDate(Number(n), Number(d), prev, calendar)) return m;
    const w = fractionWords(Number(n), Number(d), locale);
    return w ? `${pre}${w}` : m;
  });
  return s;
}

// Names that are everyday words too ("Will you try?", "in June", "el mar"): taken out only where they
// address the learner ("Nice work, Will.", "Will, try this.", "Hi Will").
const COMMON_NAMES = new Set(
  "will may mark hope grace joy faith rose sky river summer autumn ray bill pat art dawn sunny star april june august luz sol paz mar cruz rosa flor dulce blanca alba abril pilar angel".split(" "),
);
const GREETINGS = new Set("hi hello hey bye goodbye thanks thank hola adios gracias chao oye".split(" "));
const DASHES = /([—–/-])/;

type NameMatcher = (part: string) => boolean;

/** Is this word (without punctuation) one of the learner's names? Case and accents don't matter, except that an all-lowercase word isn't a capitalized name ("sky" for a learner called Sky). */
function nameMatcher(names: string[]): NameMatcher | null {
  const known = new Map<string, boolean>(); // folded name word → written with a capital
  for (const n of names)
    for (const w of n.split(/[\s—–/-]+/).map(core))
      if (w.length > 1) known.set(fold(w), (known.get(fold(w)) ?? false) || /\p{Lu}/u.test(w));
  if (!known.size) return null;
  return (part) => {
    const w = core(part);
    if (!known.has(fold(w))) return false;
    return !(known.get(fold(w)) && w === w.toLowerCase());
  };
}

/** Does any word of `text` match one of `names`, ignoring case and accents? (Strict: for text that leaves the device as data, like recognizer hints.) */
export function hasName(text: string, names: string[]): boolean {
  const known = new Set(names.flatMap((n) => n.split(/[\s—–/-]+/)).map((w) => fold(core(w))).filter((w) => w.length > 1));
  return text.split(/[\s—–/-]+/).some((w) => known.has(fold(core(w))));
}

/** Is the name at toks[i] addressing the learner? */
function addressing(toks: string[], i: number): boolean {
  const tok = toks[i];
  const prev = toks[i - 1];
  if (/^[^,]*,["'”’)]*$/.test(tok) && (i === 0 || /[.?!]["'”’)]*$/.test(prev ?? ""))) return true; // "Will, try this."
  if (prev && /,["'”’)]*$/.test(prev)) return true; // "Nice work, Will."
  return !!prev && GREETINGS.has(fold(core(prev))); // "Hi Will"
}

/**
 * One sentence as the voice should say it. `names` (the learner's) are taken out: matched without
 * regard to case or accents, also inside "Ada—now" and as "Ada's" (said "your"), keeping any
 * sentence-ending mark. Names that are everyday words go only where they address the learner.
 */
export function speakable(sentence: string, locale: Locale, names: string[] = []): Speakable {
  const toks = sentence.split(/\s+/).filter(Boolean);
  const isName = nameMatcher(names);
  const calendar = CALENDAR.test(fold(sentence));
  const out: string[] = [];
  const words: number[] = [];
  const dropName = (tok: string) => {
    // Keep the sentence's ending: "Hi, Ada." → "Hi."
    const end = /[.?!]+["'”’)]*$/.exec(tok)?.[0];
    if (end && out.length) out[out.length - 1] = out[out.length - 1].replace(/[,;:]+$/, "") + end;
  };
  toks.forEach((tok, i) => {
    let said: string | null = null;
    if (isName) {
      const parts = tok.split(DASHES);
      if (parts.length === 1 && isName(tok)) {
        const word = trimMarks(tok);
        if (/['’]s$/i.test(word)) {
          if (locale !== "en") return dropName(tok);
          said = tok.replace(word, "your"); // "Ada's turn" → "your turn"
        } else if (!COMMON_NAMES.has(fold(word)) || addressing(toks, i)) return dropName(tok);
      } else if (parts.length > 1 && parts.some((p, k) => k % 2 === 0 && isName(p) && !COMMON_NAMES.has(fold(core(p))))) {
        // "Ada—now" → "now": the name and its dash go.
        const kept = parts.filter((p, k) => !(k % 2 === 0 && isName(p) && !COMMON_NAMES.has(fold(core(p))))).join("");
        const rest = kept.replace(/^[—–/-]+|[—–/-]+$/g, "");
        if (!/[\p{L}\p{N}]/u.test(rest)) return dropName(tok);
        said = sayToken(rest, toks[i - 1], toks[i + 1], i === 0, locale, calendar);
      }
    }
    said ??= sayToken(tok, toks[i - 1], toks[i + 1], i === 0, locale, calendar);
    for (const w of said.split(/\s+/).filter(Boolean)) {
      out.push(w);
      words.push(i);
    }
  });
  return { text: out.join(" "), words };
}

/** The spoken word index at a character offset of `text` (for browser boundary events). */
export function wordAt(text: string, charIndex: number): number {
  const before = text.slice(0, Math.max(0, charIndex));
  const n = before.split(/\s+/).filter(Boolean).length;
  // Mid-word offsets belong to the word they're in.
  return /\S$/.test(before) ? Math.max(0, n - 1) : n;
}
