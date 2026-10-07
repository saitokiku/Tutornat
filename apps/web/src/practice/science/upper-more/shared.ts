import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody } from "../../types";

// Shared pieces for the second grades 6–9 science strand (see ../upper-more.ts).
// Every wrong choice names the mistake it stands for (`why`, kebab-case, reused within a skill), and
// typed answers list the likely wrong values, so a miss becomes a diagnosis.

export type Bi = { en: string; es: string };
export const bi = (en: string, es: string): Bi => ({ en, es });
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Banks ───────────────────────────────────────────────────────────────────────────────────────

/** A wrong choice and the misconception it shows. */
export type Miss = { c: Bi; why: string };
export const m = (why: string, en: string, es: string): Miss => ({ c: bi(en, es), why });
export const mx = (why: string, c: Bi): Miss => ({ c, why });

/** One hand-written question: `a` is right, each wrong choice names its mistake, `clue` is hint 3, `explain` the worked step. */
export type Entry = { q: Bi; a: Bi; wrong: Miss[]; clue: Bi; explain: Bi };
/** A level's questions. `nudge` and `strategy` are hints 1 and 2 for every entry. */
export type Bank = { nudge: Bi; strategy: Bi; seconds: number; items: Entry[] };
export const e = (q: Bi, a: Bi, wrong: Miss[], clue: Bi, explain: Bi): Entry => ({ q, a, wrong, clue, explain });

export function bankItem(r: Rng, bank: Bank, locale: Locale): ItemBody {
  const entry = r.pick(bank.items);
  const right: { c: Bi; why?: string } = { c: entry.a };
  const order = r.shuffle([right, ...entry.wrong]);
  const answer = entry.a[locale];
  return {
    prompt: [entry.q[locale]],
    say: entry.q[locale],
    choices: order.map((o) => (o.why ? { label: o.c[locale], why: o.why } : { label: o.c[locale] })),
    input: "choices",
    answer: { kind: "choice", index: order.indexOf(right) },
    hints: [bank.nudge[locale], bank.strategy[locale], entry.clue[locale]],
    steps: [entry.explain[locale], tr(locale, `Answer: ${answer}`, `Respuesta: ${answer}`)],
    seconds: bank.seconds,
  };
}

// ── Numbers for the computed skills ─────────────────────────────────────────────────────────────

/** An integer count of 10^-k units written exactly: dec(375) = "37.5", dec(40) = "4", dec(5, 2) = "0.05", dec(57300, 0) = "57,300". */
export function dec(n: number, k = 1): string {
  const s = String(Math.abs(n)).padStart(k + 1, "0");
  const whole = (k ? s.slice(0, -k) : s).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = k ? s.slice(-k).replace(/0+$/, "") : "";
  return `${n < 0 ? "−" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** The likely wrong typed values, minus any that equal the key or are not finite, without repeats. */
export function misses(right: number, list: [number, string][]): { value: string; why: string }[] {
  const out: { value: string; why: string }[] = [];
  for (const [v, why] of list) {
    if (!Number.isFinite(v) || Math.abs(v - right) < 1e-9) continue;
    const value = String(Math.round(v * 1e6) / 1e6);
    if (!out.some((o) => o.value === value)) out.push({ value, why });
  }
  return out;
}

/** Up to three wrong choices in priority order (repeats and copies of the key dropped), the key shuffled in. */
export function withChoices(r: Rng, right: Choice, wrong: Choice[]): Pick<ItemBody, "choices" | "input" | "answer"> {
  const list: Choice[] = [];
  for (const w of wrong) if (list.length < 3 && w.label !== right.label && !list.some((c) => c.label === w.label)) list.push(w);
  const choices = r.shuffle([right, ...list]);
  return { choices, input: "choices", answer: { kind: "choice", index: choices.indexOf(right) } };
}

/** "1 kilogram" but "2 kilograms": the unit word for a displayed number. */
export const plural = (n: string, one: string, many: string) => (n === "1" ? one : many);

export const NAMES = [
  "Aiko", "Diego", "Kwame", "Priya", "Luis", "Noah", "Mei", "Omar", "Jamal", "Ana", "Tariq", "Lena", "Ravi", "Camila",
  "Elena", "Mateo", "Sofia", "Kenji", "Amara", "Yusuf", "Ines", "Malik", "Hana", "Arjun", "Zara", "Chen", "Nia", "Valentina",
];

/** Spoken form of a line with units and signs: "−" is read "minus", "×" "times", "÷" "divided by", "²" "squared". */
export function spoken(s: string, locale: Locale) {
  return s
    .replace(/−(?=\d)/g, tr(locale, "minus ", "menos "))
    .replace(/ − /g, tr(locale, " minus ", " menos "))
    .replace(/ × /g, tr(locale, " times ", " por "))
    .replace(/ ÷ /g, tr(locale, " divided by ", " entre "))
    .replace(/²/g, tr(locale, " squared", " al cuadrado"))
    .replace(/°C/g, tr(locale, " degrees Celsius", " grados Celsius"));
}
