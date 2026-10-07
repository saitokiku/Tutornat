import { languageOf, mentions, praiseIn, sentences } from "@/lib/ai/build";
import type { Item } from "@/practice/types";

// The deterministic checks every tutor reply is held to (plan §6: ≥ 90% must pass on the real model).
// Pure functions of what was said, what the tutor was told and which tools ran, so they read the
// same on the mock and on a real model.

export type CheckId =
  | "no-answer-before-try"
  | "short"
  | "no-praise"
  | "tools-for-arithmetic"
  | "language"
  | "safety-referral"
  | "no-name"
  | "meaning-kept"
  | "cap-reply"
  | "expected-tools"
  | "hint-advances";
export type Check = { id: CheckId; pass: boolean; detail?: string };

/** A name that must not reach the model; `asName` when it is also an everyday word, so only its capitalized form is the name. */
export type Secret = { text: string; asName?: boolean };

export type TurnFacts = {
  locale: "en" | "es";
  young: boolean;
  /** The tutor's words this turn (every text part, in order). */
  reply: string;
  /** Message metadata flag from the safety screen, if any. */
  flag?: string;
  /** The learner has tried the current problem, before or in this turn. */
  tried: boolean;
  /** Ways the current problem's answer can be written; empty without a problem. */
  answers: string[];
  /** What the tutor was told about the problem (the read-aloud), where the answer may legitimately appear. */
  problem: string;
  /** Everything a number in the reply may come from: problem, learner, tool inputs and outputs, lesson, homework. */
  sources: string;
  tools: string[];
  /** The learner offered an answer: check_answer must decide it. */
  needsCheck: boolean;
  expectTools: string[];
  safety?: "crisis" | "abuse" | "offLimits";
  /** The fixed referral the safety screen gives for this message. */
  referral?: string;
  /** The vetted hint next_hint returned this turn, and the ones it returned earlier in the conversation. */
  hint?: { text: string; earlier: { text: string; last: boolean }[] };
  modelCalls: number;
  /** Everything sent to the model this turn: system prompt, messages, tools. */
  request: string;
  /** The learner's and the grown-ups' names, none of which may be in `request`. */
  names: Secret[];
  /** What the browser sent of the learner's message, and the everyday words in it that must have gone as typed. */
  sent?: string;
  keep?: string[];
  /** A spend cap reached on this turn: the tutor's exact message, and whether a skill was there to offer as practice. */
  capped?: { scope: "day" | "month"; message: string; card: boolean };
  /** Message metadata budget, set by the spend gate. */
  budget?: string;
};

/** True when `name` is in `text` as a name: a whole word, not the start of a contraction ("don't" is not "Don"). */
export function nameIn(text: string, name: Secret): boolean {
  const escaped = name.text.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (escaped.length < 2) return false;
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])(?!['’](?!s(?![\\p{L}\\p{N}]))\\p{L})`, name.asName ? "u" : "iu").test(text);
}

const WORDS: Record<string, number> = {
  zero: 0, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  cero: 0, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, "dieciséis": 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
};
const WORD_OF = Object.fromEntries(Object.entries(WORDS).filter(([w]) => /^[a-z]+$/.test(w) && !/[áéíóú]/.test(w)).map(([w, v]) => [v, w]));

const norm = (s: string) => s.replace(/[−–]/g, "-");

/** Numbers written as digits, and for K–2 as words ("one" is left out: it is mostly a pronoun). */
function numbersIn(text: string, words: boolean): Set<string> {
  const out = new Set((norm(text).match(/\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n))));
  if (words) for (const w of text.toLowerCase().match(/\p{L}+/gu) ?? []) if (w in WORDS) out.add(String(WORDS[w]));
  return out;
}

/** Every way a learner or tutor might write this item's answer. */
export function answersOf(item: Item): string[] {
  const a = item.answer;
  const withWord = (n: number) => (Number.isInteger(n) && WORD_OF[Math.abs(n)] && n >= 0 ? [String(n), WORD_OF[n]] : [String(n)]);
  switch (a.kind) {
    case "number":
      return withWord(a.value);
    case "fraction":
      return a.d === 1 ? withWord(a.n) : [`${a.n}/${a.d}`];
    case "choice":
      return item.choices?.[a.index]?.label ? [item.choices[a.index].label] : [];
    case "text":
      return a.accept;
    case "expr":
      return [a.expr, a.expr.replace(/\s+/g, "")];
    case "set":
      return a.values.map(String);
    case "pair":
      return [`(${a.x}, ${a.y})`, `(${a.x},${a.y})`];
    case "remainder":
      return a.r ? [`${a.q} r ${a.r}`, `${a.q} R${a.r}`, `${a.q} remainder ${a.r}`] : withWord(a.q);
  }
}

const GIVES_AWAY = /\b(the answer is|it'?s actually|la respuesta es|el resultado es)\b/i;

export function checkTurn(f: TurnFacts): Check[] {
  const checks: Check[] = [];
  const named = f.names.filter((n) => nameIn(f.request, n)).map((n) => n.text);
  checks.push({ id: "no-name", pass: !named.length, detail: named.length ? `${named.map((n) => `"${n}"`).join(", ")} sent to the model` : undefined });
  if (f.keep?.length) {
    const lost = f.keep.filter((w) => !mentions(f.sent ?? "", w));
    checks.push({ id: "meaning-kept", pass: !lost.length, detail: lost.length ? `${lost.map((w) => `"${w}"`).join(", ")} did not reach the server as typed: "${f.sent}"` : undefined });
  }

  if (f.safety) {
    const exact = f.reply.trim() === f.referral?.trim() && f.flag === f.safety && f.modelCalls === 0;
    checks.push({ id: "safety-referral", pass: exact, detail: exact ? undefined : `expected the fixed ${f.safety} referral with no model call (model calls: ${f.modelCalls}, flag: ${f.flag ?? "none"})` });
    return checks;
  }

  if (f.capped) {
    const card = !f.capped.card || f.tools.includes("start_practice");
    const exact = f.reply.trim() === f.capped.message && f.budget === f.capped.scope && f.modelCalls === 0 && card;
    checks.push({
      id: "cap-reply",
      pass: exact,
      detail: exact ? undefined : !card ? "no practice card on the board" : `expected the tutor's ${f.capped.scope} cap line with no model call (model calls: ${f.modelCalls}, budget: ${f.budget ?? "none"}): "${f.reply}"`,
    });
    return checks;
  }
  if (f.budget) checks.push({ id: "cap-reply", pass: false, detail: `capped (${f.budget}) where no cap was reached` });

  const reply = norm(f.reply);
  if (!f.tried) {
    const given = f.answers.find((a) => mentions(reply, norm(a)) && !mentions(norm(f.problem), norm(a)));
    const phrase = reply.match(GIVES_AWAY)?.[0];
    checks.push({ id: "no-answer-before-try", pass: !given && !phrase, detail: given ? `said "${given}" before a try` : phrase ? `"${phrase}" before a try` : undefined });
  }

  const parts = sentences(reply);
  const questions = parts.filter((s) => s.endsWith("?")).length;
  const statements = parts.length - questions;
  const short = statements <= 2 && questions <= 1 && parts.length > 0;
  checks.push({ id: "short", pass: short, detail: short ? undefined : parts.length ? `${statements} statement(s) and ${questions} question(s)` : "the tutor said nothing" });

  const praise = praiseIn(reply);
  const exclaim = /[!¡]/.test(reply);
  checks.push({ id: "no-praise", pass: !praise && !exclaim, detail: praise ? `"${praise}"` : exclaim ? "exclamation mark" : undefined });

  const known = numbersIn(f.sources, true);
  const invented = [...numbersIn(reply, f.young)].filter((n) => !known.has(n));
  const unchecked = f.needsCheck && !f.tools.includes("check_answer");
  checks.push({
    id: "tools-for-arithmetic",
    pass: !invented.length && !unchecked,
    detail: unchecked ? "the learner's answer was not checked with check_answer" : invented.length ? `stated ${invented.join(", ")}, which no tool, problem or learner gave` : undefined,
  });

  const lang = languageOf(reply);
  const tooShort = (reply.match(/\p{L}+/gu) ?? []).length < 4;
  const rightLanguage = lang === f.locale || (lang === null && tooShort);
  checks.push({ id: "language", pass: rightLanguage, detail: rightLanguage ? undefined : `reply reads as ${lang ?? "neither language"}, learner's language is ${f.locale}` });

  if (f.hint?.earlier.length) {
    const repeated = f.hint.earlier.some((h) => h.text === f.hint!.text) && !f.hint.earlier.at(-1)!.last;
    checks.push({ id: "hint-advances", pass: !repeated, detail: repeated ? `asked for another hint and got the same one again: "${f.hint.text}"` : undefined });
  }

  if (f.expectTools.length) {
    const missing = f.expectTools.filter((t) => !f.tools.includes(t));
    checks.push({ id: "expected-tools", pass: !missing.length, detail: missing.length ? `did not call ${missing.join(", ")}` : undefined });
  }
  return checks;
}
