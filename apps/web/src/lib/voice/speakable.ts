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

const core = (tok: string) => tok.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").replace(/['’]s$/i, "");

function sayToken(tok: string, prev: string | undefined, next: string | undefined, first: boolean, locale: Locale): string {
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
    const w = fractionWords(Number(n), Number(d), locale);
    return w ? `${pre}${w}` : m;
  });
  return s;
}

/**
 * One sentence as the voice should say it. `names` are removed from the spoken text (matched as
 * written, case-sensitive, also with 's), with any sentence-ending mark kept.
 */
export function speakable(sentence: string, locale: Locale, names: string[] = []): Speakable {
  const toks = sentence.split(/\s+/).filter(Boolean);
  const nameWords = new Set(names.flatMap((n) => n.split(/\s+/)).map(core).filter((w) => w.length > 1));
  const out: string[] = [];
  const words: number[] = [];
  toks.forEach((tok, i) => {
    if (nameWords.size && nameWords.has(core(tok))) {
      // Keep the sentence's ending: "Hi, Ada." → "Hi."
      const end = /[.?!]+["'”’)]*$/.exec(tok)?.[0];
      if (end && out.length) out[out.length - 1] = out[out.length - 1].replace(/[,;:]+$/, "") + end;
      return;
    }
    const said = sayToken(tok, toks[i - 1], toks[i + 1], i === 0, locale);
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
