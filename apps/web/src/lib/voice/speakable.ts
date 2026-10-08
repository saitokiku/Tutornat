import type { Locale } from "@/lib/types";
import { fractionWords, letterWord, sayNumbers, unitWords } from "./numbers";

// What a voice should actually say for a sentence written for the screen: no markdown marks, no links,
// no emoji, math and every number said in words ("3/4" → "three fourths", "5 × 2 = 10" → "five
// times two equals ten", "$2.50" → "two dollars and fifty cents"; see ./numbers), and the learner's
// name left out of anything sent to a vendor. Works word by word so every spoken word knows which
// written word it came from — that is what lets the screen highlight along.

export type Speakable = {
  /** What to send to the voice. */
  text: string;
  /** words[k] = index of the written word (in this sentence) that spoken word k came from. */
  words: number[];
};

export { fractionWords };

const WORDS = {
  en: { times: "times", div: "divided by", plus: "plus", minus: "minus", eq: "equals", lt: "is less than", gt: "is greater than", le: "is less than or equal to", ge: "is greater than or equal to", ne: "is not equal to", approx: "is about", pm: "plus or minus" },
  es: { times: "por", div: "entre", plus: "más", minus: "menos", eq: "es igual a", lt: "es menor que", gt: "es mayor que", le: "es menor o igual que", ge: "es mayor o igual que", ne: "es distinto de", approx: "es aproximadamente", pm: "más o menos" },
} as const;

const ABBREVIATIONS: Record<Locale, Record<string, string>> = {
  en: { "e.g.": "for example", "i.e.": "that is", "etc.": "and so on", "vs.": "versus", "approx.": "about" },
  es: { "e.g.": "por ejemplo", "i.e.": "es decir", "etc.": "etcétera", "vs.": "contra", "aprox.": "aproximadamente", "ej.": "ejemplo" },
};

const NUMERIC_END = /[\p{N})²³]$/u;
const NUMERIC_START = /^[(\p{N}√−-]/u;
const VAR = /^[a-zA-Z]$/;
const SIGN = /^[=+×÷·*<>≤≥≠±−–-]$/;
const OPS: Record<string, keyof (typeof WORDS)["en"]> = { "<": "lt", ">": "gt", "≤": "le", "≥": "ge", "≠": "ne" };

/** Replaces until nothing changes, so "2×3×4" converts both signs. */
function all(s: string, re: RegExp, to: string | ((...m: string[]) => string)): string {
  for (let i = 0; i < 6; i++) {
    const next = s.replace(re, to as string);
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
// A sentence that gives a number to call or text: its long numbers are read digit by digit ("988").
const PHONE = /\b(call|text|dial|phone|hotline|llama|llamar|marca|marcar|mensaje|telefono|linea)\b/;

function looksLikeDate(n: number, d: number, prev: string | undefined, calendar: boolean): boolean {
  if (n > 12 || d > 31 || !prev) return false;
  const p = fold(core(prev));
  return DATE_BEFORE.has(p) || (calendar && DATE_PREP.has(p));
}

const WHOLE = /^[−-]?\d+$/;
/** "1/2", "3/4." — a fraction smaller than one, as the second half of "2 1/2". */
const properFraction = (tok: string | undefined) => {
  const m = /^(\d{1,3})\/(\d{1,4})[.,!?;:)]*$/.exec(tok ?? "");
  return !!m && Number(m[1]) < Number(m[2]) && Number(m[2]) >= 2;
};
const TRAIL = /[.,!?;:)]+$/;
/** "5 cm", "3 in by 4 in": a unit after a number. "in" counts only where it can't be the word "in". */
function unitAfter(tok: string, prev: string | undefined, next: string | undefined, prev2?: string): boolean {
  if (!prev || !/[\d²³]$/.test(prev.replace(/,$/, ""))) return false;
  const u = tok.replace(TRAIL, "");
  if (u === "in") return /^(by|x|×|long|wide|tall|high|deep|of)$/i.test(next ?? "") || /^(by|x|×|por)$/i.test(prev2 ?? "");
  return /^(mm|cm|m|km|mg|g|kg|mL|ml|L|ft|yd|mi|lbs?|oz)(²|³)?$/.test(u);
}

type Ctx = { prev?: string; next?: string; prev2?: string; next2?: string; first: boolean; locale: Locale; calendar: boolean; phone: boolean };

function sayToken(tok: string, { prev, next, prev2, next2, first, locale, calendar, phone }: Ctx): string {
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
    .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
    .replace(/\\pi/g, "π")
    .replace(/\\[()[\]]/g, "");
  // Markdown
  s = s.replace(/\*\*|__|~~|`/g, "");
  if (first && /^(#{1,6}|>|[-*•+]|\d{1,2}[.)])$/.test(s)) return "";
  s = s.replace(/^#{1,6}(?=\S)/, "").replace(/\]\([^)\s]*\)?/g, "").replace(/^\[/, "").replace(/\]$/, "");
  s = s.replace(/^[*_]+(?=\S)/, "").replace(/([^\s*_])[*_]+([.,!?;:]*)$/, "$1$2");
  s = s.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu, "");
  // Arrows, bars and bullets carry no words; a table's pipes neither.
  s = s.replace(/[→⇒←|•]+/g, " ").trim();
  if (!s) return "";
  // Abbreviations a voice would spell out: e.g., i.e., etc., p. ej.
  const abbr = /^(\(?)([a-zA-Z.]+\.)([,;:)]*)$/.exec(s);
  if (abbr) {
    const key = abbr[2].toLowerCase();
    if (locale === "es" && key === "p." && /^ej\./i.test(next ?? "")) return `${abbr[1]}por`;
    const said = key === "ej." && prev?.toLowerCase() !== "p." ? undefined : (ABBREVIATIONS[locale][key] ?? ABBREVIATIONS.en[key]);
    if (said) return `${abbr[1]}${said}${key === "etc." && !abbr[3] ? "." : abbr[3]}`;
  }
  // Two sentences glued at a full stop ("that.Your") are said as two.
  s = s.replace(/(\p{Ll}{2,})([.?!])(\p{Lu}\p{Ll})/gu, "$1$2 $3");
  // A unit after a number: "5 cm", "1 kg"
  if (unitAfter(s, prev, next, prev2)) {
    const unit = unitWords(s.replace(TRAIL, ""), locale, /^[−-]?1$/.test(prev ?? ""));
    if (unit) return unit.words + (TRAIL.exec(s)?.[0] ?? "");
  }
  // A sign standing alone between two numbers (or a number and a letter like x).
  const between = !!prev && !!next && (NUMERIC_END.test(prev) || VAR.test(trimMarks(prev))) && (NUMERIC_START.test(next) || VAR.test(trimMarks(next)));
  if (/^[×·*]$/.test(s) || (/^[xX]$/.test(s) && between && NUMERIC_END.test(prev!) && /^[(\p{N}]/u.test(next!))) return between ? W.times : "";
  if (/^[÷/]$/.test(s)) return between ? W.div : s === "/" ? "" : W.div;
  if (/^[−-]$/.test(s)) return between ? W.minus : "";
  if (/^[—–]$/.test(s)) return between && s === "–" ? W.minus : "";
  if (s === "+") return W.plus;
  if (s === "=") return W.eq;
  if (OPS[s]) return W[OPS[s]];
  if (s === "≈") return W.approx;
  if (s === "±") return W.pm;
  // Signs inside one written word: 3×4=12, 7−2, 3x4
  const before = s;
  const hasEq = s.includes("=");
  s = all(s, /([\p{N})a-z])[×·*]([(\p{N}a-z√])/gu, `$1 ${W.times} $2`);
  s = all(s, /(\p{N})[xX](\p{N})/gu, `$1 ${W.times} $2`);
  s = all(s, /([\p{N})])÷([(\p{N}])/gu, `$1 ${W.div} $2`);
  s = all(s, /([\p{N})a-z²³])\+([(\p{N}a-z√])/gu, `$1 ${W.plus} $2`);
  s = all(s, hasEq ? /([\p{N})a-z²³])[−-]([(\p{N}a-z√])/gu : /([\p{N})²³])−([(\p{N}√])/gu, `$1 ${W.minus} $2`);
  s = all(s, /([^\s=<>≠])=([^\s=])/gu, `$1 ${W.eq} $2`);
  s = all(s, /([\p{N})a-z])([<>≤≥≠])([(\p{N}a-z])/gu, (_m, a, op, b) => `${a} ${W[OPS[op]]} ${b}`);
  // A letter standing for a number, said the language's way ("x" is "equis" in Spanish).
  const math = s !== before || SIGN.test(prev ?? "") || SIGN.test(next ?? "");
  if (locale === "es")
    s = s
      .split(" ")
      .map((w) => {
        const l = trimMarks(w);
        return VAR.test(l) && (l.toLowerCase() === "x" || math) ? w.replace(l, letterWord(l, locale)) : w;
      })
      .join(" ");
  // Every number: dates, fractions, mixed numbers, times, money, percent, ordinals, powers, units, phone numbers.
  const dm = /^\(?(\d{1,2})\/(\d{1,2})(?![\d/])/.exec(s);
  const date = !!dm && looksLikeDate(Number(dm[1]), Number(dm[2]), prev, calendar);
  const nextUnit = next && unitAfter(next, s, next2, prev) ? unitWords(next.replace(TRAIL, ""), locale, /^[−-]?1$/.test(s))?.words : undefined;
  const wholeOfMixed = WHOLE.test(s) && properFraction(next);
  const mixed = properFraction(s) && WHOLE.test(prev ?? "");
  return sayNumbers(s, locale, { prev, next: nextUnit ?? next, mixed, wholeOfMixed, phone, date });
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
  const folded = fold(sentence);
  const ctx = (i: number): Ctx => ({ prev: toks[i - 1], next: toks[i + 1], prev2: toks[i - 2], next2: toks[i + 2], first: i === 0, locale, calendar: CALENDAR.test(folded), phone: PHONE.test(folded) });
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
        said = sayToken(rest, ctx(i));
      }
    }
    said ??= sayToken(tok, ctx(i));
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
