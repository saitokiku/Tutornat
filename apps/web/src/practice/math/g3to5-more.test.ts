import { describe, expect, it } from "vitest";
import { linePoints } from "@/components/practice/pad-math";
import { answerText, check } from "../answer";
import { evaluate, parse } from "../expr";
import { makeItem } from "../skills";
import type { Answer, Item } from "../types";
import { MATH_3_5 } from "./g3to5";
import { MATH_3_5_MORE, SYMMETRY_COUNT, SYMMETRY_YES_NO } from "./g3to5-more";

// Every key in this strand is re-derived here from what the learner sees — the prompt text, the
// picture and the touch pad — by a different route than the generator: re-solving each word problem
// from its English wording, column arithmetic digit by digit, clock arithmetic in minutes, integer
// thousandths for decimals, cross-multiplying fractions, and brute-force reflections for symmetry.
// Misconception tags are checked too: a tagged wrong value must never be accepted as right.

const SEEDS = Array.from({ length: 240 }, (_, i) => i * 104729 + 7);
const LOCALES = ["en", "es"] as const;
type Loc = (typeof LOCALES)[number];

const skill = (id: string) => MATH_3_5_MORE.find((s) => s.id === id)!;
const levels = (id: string) => Array.from({ length: skill(id).levels }, (_, i) => i + 1);
const items = (id: string, level: number, locale: Loc = "en") => SEEDS.map((seed) => makeItem(id, level, seed, locale));

const text = (it: Item) => it.prompt.filter((p): p is string => typeof p === "string").join("");
const fracs = (it: Item) => it.prompt.flatMap((p) => (typeof p === "object" && "frac" in p ? [p.frac.map(Number) as [number, number]] : []));
/** Numbers as written, with US grouping commas: "4,750" → 4750. */
const nums = (s: string) => (s.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) ?? []).map((x) => Number(x.replace(/,/g, "")));
const close = (x: number, y: number) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Evaluates arithmetic as displayed ("4 + 3 × 5", "2,352 ÷ 49") with expr.ts. */
const shown = (s: string) => evaluate(parse(s.replace(/,/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-"))!, {});

function numberOf(a: Answer) {
  if (a.kind !== "number") throw new Error(`expected a number answer, got ${a.kind}`);
  return a.value;
}
function fractionOf(a: Answer) {
  if (a.kind !== "fraction") throw new Error(`expected a fraction answer, got ${a.kind}`);
  return a.n / a.d;
}
function choiceLabel(it: Item) {
  if (it.answer.kind !== "choice") throw new Error(`expected a choice answer, got ${it.answer.kind}`);
  return it.choices![it.answer.index].label;
}
/** The value a learner would type, as a number (fractions and mixed numbers too). */
const valueOf = (a: Answer) => (a.kind === "number" ? a.value : a.kind === "fraction" ? a.n / a.d : NaN);

/** Integer equations shown in hints and steps ("80 × 3 = 240", "2,352 ÷ 49 = 48"), outside fractions, times and remainders. */
const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const EQUATION = new RegExp(String.raw`(?<![\d.,/:])(${NUM}(?:\s*[+−×÷]\s*${NUM})+)\s*=\s*(${NUM})(?![\d/]|[.,]\d|\s*[+−×÷(]|:\d)`, "g");
function equations(line: string) {
  const clean = line.replace(/[$°]/g, "");
  const out: { left: string; right: number }[] = [];
  for (const m of clean.matchAll(EQUATION)) {
    const rest = clean.slice(m.index! + m[0].length);
    if (/^,?\s*(with\b|y\b|R\b)/.test(rest)) continue; // "22 ÷ 8 = 2, with 6 left over", "13 ÷ 6 = 2 R 1"
    out.push({ left: m[1], right: Number(m[2].replace(/,/g, "")) });
  }
  return out;
}

/** Solves a word problem by matching its English wording; exactly one pattern must fit. */
function solve(t: string, solvers: [RegExp, (n: number[]) => number][]) {
  const hits = solvers.filter(([re]) => re.test(t));
  expect(hits.length, `no single solver for: ${t}`).toBe(1);
  const [re, f] = hits[0];
  return f(re.exec(t)!.slice(1).map((x) => Number(x.replace(/,/g, ""))));
}

// One test per skill, so a slow machine running many suites at once still finishes each well inside the timeout.
describe.each(MATH_3_5_MORE.map((s) => [s.id, s] as const))("%s: every item", (_id, s) => {
  it("has the right shape, the same problem in both languages, honest tags and no false arithmetic", () => {
    {
      expect(s.subject).toBe("math");
      expect(s.content).toBe(s.id === "m.symmetry" ? "draft" : "computed");
      expect(s.standard).toMatch(/^[3-5]\.[A-Z]+\.[A-D]\.\d+[a-z]?$/);
      for (const level of levels(s.id)) {
        const prompts = new Set<string>();
        for (const seed of SEEDS) {
          const [en, es] = LOCALES.map((l) => makeItem(s.id, level, seed, l));
          const where = `${s.id} L${level} seed ${seed}`;
          expect(es.answer, `${where} answer differs by language`).toEqual(en.answer);
          const shape = (it: Item) => (it.visual && "unit" in it.visual ? { ...it.visual, unit: "" } : it.visual);
          expect(shape(es), `${where} visual differs by language`).toEqual(shape(en));
          expect(es.pad, where).toEqual(en.pad);
          expect(es.wrong, `${where} wrong values differ by language`).toEqual(en.wrong);
          expect(es.markable, where).toBe(en.markable);
          expect(es.input, where).toBe(en.input);
          expect(es.choices?.length, where).toBe(en.choices?.length);
          expect(es.choices?.map((c) => c.why), `${where} tags differ by language`).toEqual(en.choices?.map((c) => c.why));
          // The same numbers, in the same order, in both languages: a translation never changes a problem.
          // Spanish counts "de 4 en 4" where English says "by 4".
          expect(nums(text(es).replace(/de (\d+) en \1\b/g, "$1")), `${where} numbers differ by language`).toEqual(nums(text(en)));
          expect(fracs(es), where).toEqual(fracs(en));
          prompts.add(JSON.stringify([en.prompt, en.visual]));
          for (const it of [en, es]) {
            expect(it.hints.length, `${where} hints`).toBe(3);
            expect(it.steps.length, `${where} steps`).toBeGreaterThanOrEqual(1);
            expect(it.steps.length, `${where} steps`).toBeLessThanOrEqual(4);
            expect(it.say, `${where} say has symbols`).not.toMatch(/[×÷=<>°−]/);
            const copy = [text(it), it.say, it.alt ?? "", ...it.hints, ...it.steps, ...(it.choices ?? []).map((c) => c.label)];
            for (const line of copy) {
              expect(line, `${where} exclamation`).not.toMatch(/[!¡]/);
              expect(line, `${where} unfinished template`).not.toMatch(/undefined|NaN|\{[wn]\}|\$\{/);
            }
            const last = it.steps[it.steps.length - 1];
            for (const h of it.hints) expect(h.includes(last), `${where} hint gives the final step: ${h}`).toBe(false);
            for (const line of [...it.hints, ...it.steps]) for (const e of equations(line)) expect(close(shown(e.left), e.right), `${where} false equation "${line}"`).toBe(true);
            // Rule 7: the last hint is a first step, never the answer worked out.
            const key = it.answer;
            for (const h of it.hints) {
              if (key.kind === "number") for (const e of equations(h)) expect(/÷/.test(e.left) && close(e.right, key.value), `${where} hint divides out to the key: ${h}`).toBe(false);
              if (key.kind === "remainder") expect(h, `${where} hint gives the quotient and remainder`).not.toMatch(new RegExp(`= ${key.q}(?:, | R )`));
              if (key.kind === "fraction") expect(h.includes(`= ${key.n}/${key.d}`), `${where} hint gives the fraction: ${h}`).toBe(false);
            }
            // Rule 16: every wrong choice names its misconception; the right one does not.
            if (it.choices) {
              it.choices.forEach((c, i) => {
                if (it.answer.kind === "choice" && i === it.answer.index) expect(c.why, `${where} right choice tagged`).toBeUndefined();
                else expect(c.why, `${where} wrong choice "${c.label}" has no tag`).toMatch(KEBAB);
              });
            } else {
              // Typed and touch answers list likely wrong values, never one the checker accepts.
              expect(it.wrong?.length, `${where} no tagged wrong values`).toBeGreaterThanOrEqual(1);
              const values = it.wrong!.map((w) => w.value);
              expect(new Set(values).size, where).toBe(values.length);
              for (const w of it.wrong!) {
                expect(w.why, where).toMatch(KEBAB);
                expect(check(it.answer, w.value).correct, `${where} wrong value ${w.value} is accepted`).toBe(false);
              }
            }
            if (/[/(]/.test(answerText(it.answer))) expect(it.alt ?? "", `${where} alt gives the answer`).not.toContain(answerText(it.answer));
            if (it.markable) expect(["dots", "ten-frame", "array"]).toContain(it.visual?.kind);
          }
        }
        expect(prompts.size, `${s.id} L${level} variety`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe("grades 3–5 (more): the strand", () => {
  it("uses each touch pad the way it is defined", () => {
    let pads = 0;
    for (const s of MATH_3_5_MORE)
      for (const level of levels(s.id))
        for (const it of items(s.id, level)) {
          const where = `${s.id} L${level}`;
          const touch = ["number-line", "fraction-bar", "clock"].includes(it.input);
          expect(Boolean(it.pad), where).toBe(touch);
          if (!it.pad) continue;
          pads++;
          expect(it.pad.kind, where).toBe(it.input);
          if (it.pad.kind === "clock") {
            const a = it.answer;
            if (a.kind !== "text") throw new Error(`${where}: a clock answers with text`);
            const m = /^(1[0-2]|[1-9]):([0-5]\d)$/.exec(a.accept[0]);
            expect(m, `${where} ${a.accept[0]}`).toBeTruthy();
            expect(Number(m![2]) % it.pad.stepMinutes, where).toBe(0);
          } else if (it.pad.kind === "number-line") {
            const v = valueOf(it.answer);
            expect(v >= it.pad.min && v <= it.pad.max, `${where} ${v} off the line`).toBe(true);
            const steps = (v - it.pad.min) / it.pad.step;
            expect(Math.abs(steps - Math.round(steps)) < 1e-6, `${where} ${v} between ticks`).toBe(true);
            if (it.pad.denominator) expect(close(it.pad.step * it.pad.denominator, 1), where).toBe(true);
          } else {
            const a = it.answer;
            if (a.kind !== "fraction") throw new Error(`${where}: a fraction bar answers with a fraction`);
            const parts = it.pad.parts ?? it.pad.maxParts;
            const shaded = (a.n / a.d) * parts;
            expect(Math.abs(shaded - Math.round(shaded)) < 1e-9 && shaded > 0 && shaded < parts, where).toBe(true);
            expect(parts).toBeLessThanOrEqual(it.pad.maxParts);
          }
        }
    expect(pads).toBeGreaterThan(500);
  });

  it("gives grades 3, 4 and 5 fourteen to sixteen skills each across the two grade 3–5 strands", () => {
    for (const g of ["3", "4", "5"]) {
      const n = [...MATH_3_5, ...MATH_3_5_MORE].filter((s) => s.grade === g).length;
      expect(n, `grade ${g}`).toBeGreaterThanOrEqual(14);
      expect(n, `grade ${g}`).toBeLessThanOrEqual(16);
    }
  });

  it("reads aloud like speech: a capital first, no ordered pairs, no ellipses, money in dollars and cents", () => {
    for (const s of MATH_3_5_MORE)
      for (const level of levels(s.id))
        for (const locale of LOCALES)
          for (const it of items(s.id, level, locale)) {
            const where = `${s.id} L${level} ${locale}: ${it.say}`;
            expect(it.say, where).toMatch(/^¿?[^\p{Ll}]/u);
            expect(it.say, where).not.toMatch(/…|\([^()]*,[^()]*\)|\$|\d\.\d\d (?:dollars|dólares)/);
            if (locale === "es") {
              // "media taza", "medio pie", "media vuelta"; "un medio" only as a bare number.
              expect(it.say, where).not.toMatch(/un medio de/);
              expect(it.say, where).not.toMatch(/(?<![\d,.])1 (?:galones|pies|yardas|libras|horas|minutos|tazas|pintas|cuartos de galón)\b/);
              expect(it.say, where).not.toMatch(/más masa|maqueta de cohete|modelo de cohete|cohete de modelo/);
            }
            for (const line of [it.say, ...it.hints, ...it.steps]) expect(line, where).not.toMatch(/(?<![\d,.])1 (?:steps|pasos)\b|\ba hour\b/);
          }
  });

  it("says money the way people do", () => {
    const money = items("m.dec.divide", 3).filter((it) => /stickers that cost/.test(text(it)));
    expect(money.length).toBeGreaterThan(20);
    for (const it of money) {
      const [d, s] = (text(it).match(/\$\d+\.\d\d/g) ?? []).map((x) => Math.round(Number(x.slice(1)) * 100));
      const said = (c: number) => (c % 100 === 0 ? `${c / 100} ${c === 100 ? "dollar" : "dollars"}` : c < 100 ? `${c} cents` : `${Math.floor(c / 100)} ${c < 200 ? "dollar" : "dollars"} and ${c % 100} cents`);
      expect(it.say).toContain(`has ${said(d)} to spend`);
      expect(it.say).toContain(`cost ${said(s)} each`);
    }
  });

  it("tags only the wrong answers a touch pad can actually show", () => {
    for (const s of MATH_3_5_MORE)
      for (const level of levels(s.id))
        for (const it of items(s.id, level)) {
          if (!it.pad) continue;
          const where = `${s.id} L${level}`;
          const pad = it.pad;
          const can =
            pad.kind === "number-line"
              ? (v: string) => linePoints(pad).some((p) => check({ kind: "number", value: p.value }, v).correct)
              : pad.kind === "fraction-bar"
                ? (v: string) => Array.from({ length: (pad.parts ?? pad.maxParts) + 1 }, (_, k) => `${k}/${pad.parts ?? pad.maxParts}`).some((x) => check({ kind: "number", value: shown(x) }, v).correct)
                : (v: string) => minutes(v) % pad.stepMinutes === 0;
          for (const w of it.wrong ?? []) expect(can(w.value), `${where} ${w.value} cannot be entered`).toBe(true);
        }
  });

  it("keeps numbers true to the setting", () => {
    // Kittens are small; measuring cups come in halves, thirds, fourths and eighths.
    for (const it of items("m.mass.volume", 1)) {
      const kitten = /A kitten has a mass of (\d+) kg/.exec(text(it));
      if (kitten) expect(Number(kitten[1])).toBeLessThanOrEqual(2);
    }
    for (const it of items("m.frac.times.whole", 3)) if (/ cups? /.test(text(it))) expect([2, 3, 4, 8]).toContain(fracs(it)[0][1]);
    // Rectangles are never thin strips: posters are poster-shaped, rugs at least half as wide as long.
    const shapes = [
      ...items("m.perimeter.missing", 2).filter((it) => /rectangular/.test(text(it))).map((it) => [text(it), ...nums(text(it)).slice(1), numberOf(it.answer)] as const),
      ...items("m.area.word", 1).map((it) => [text(it), ...nums(text(it)).slice(0, 2)] as const),
    ];
    for (const [t, l, w] of shapes) {
      const thin = /poster|game board/.test(t) ? 2 / 3 : /rug|patio|stage/.test(t) ? 1 / 2 : 1 / 4;
      expect(w, t).toBeLessThan(l);
      expect(w, t).toBeGreaterThanOrEqual(Math.max(2, thin * l));
    }
    // Stage platforms are low, buildings are measured in meters, and no part is a cube of 2s.
    for (const level of [1, 2])
      for (const it of items("m.volume.composite", level)) {
        const t = text(it), n = nums(t);
        const heights = level === 1 ? [n[2], n[5]] : [n[3], numberOf(it.answer)];
        if (/stage/.test(t)) for (const h of heights) expect(h, t).toBeLessThanOrEqual(4);
        if (/building/.test(t)) expect(t, t).toMatch(/\d+ m by/);
      }
  });
});

// ---------------- grade 3 ----------------

/** Column addition or subtraction done digit by digit, the way a learner writes it. */
function column(a: number, b: number, op: "+" | "−") {
  const A = String(a).split("").reverse().map(Number), B = String(b).split("").reverse().map(Number);
  const out: number[] = [];
  let carry = 0, regroups = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    let d = (A[i] ?? 0) + (op === "+" ? (B[i] ?? 0) + carry : -(B[i] ?? 0) - carry);
    carry = 0;
    if (op === "+" && d >= 10) [d, carry] = [d - 10, 1];
    if (op === "−" && d < 0) [d, carry] = [d + 10, 1];
    regroups += carry;
    out.push(d);
  }
  if (carry && op === "+") out.push(1);
  return { value: Number(out.reverse().join("")), regroups };
}

describe("m.addsub.3digit", () => {
  it("levels 1–2: the key is the column result, with at least one regrouping, and the tags name real slips", () => {
    for (const level of [1, 2])
      for (const it of items("m.addsub.3digit", level)) {
        const [, a, op, b] = /^(\d+) ([+−]) (\d+) = $/.exec(text(it))!;
        const r = column(Number(a), Number(b), op as "+" | "−");
        expect(numberOf(it.answer)).toBe(r.value);
        expect(r.regroups).toBeGreaterThanOrEqual(1);
        expect(op).toBe(level === 1 ? "+" : "−");
        expect(Number(a) >= 100 && Number(b) >= 100 && r.value <= 999 && r.value >= 0).toBe(true);
        expect(it.visual).toEqual({ kind: "column", op, top: Number(a), bottom: Number(b) });
        for (const w of it.wrong!) {
          const A = a.split("").map(Number), B = b.padStart(a.length, "0").split("").map(Number);
          const slip = (f: (x: number, y: number) => number) => Number(A.map((x, i) => f(x, B[i])).join(""));
          if (w.why === "forgot-to-carry") expect(Number(w.value)).toBe(slip((x, y) => (x + y) % 10));
          if (w.why === "subtracted-smaller-from-larger") expect(Number(w.value)).toBe(slip((x, y) => Math.abs(x - y)));
        }
      }
  });
  it("level 2 trades across a zero often", () => {
    const across = items("m.addsub.3digit", 2).filter((it) => {
      const [a, b] = nums(text(it));
      return Math.floor(a / 10) % 10 === 0 && a % 10 < b % 10;
    });
    expect(across.length).toBeGreaterThan(40);
  });
  it("level 3: putting the key in the blank makes a true equation", () => {
    for (const it of items("m.addsub.3digit", 3)) {
      const filled = it.prompt.map((p) => (typeof p === "string" ? p : String(numberOf(it.answer)))).join("");
      const [left, right] = filled.split(" = ");
      expect(shown(left)).toBe(Number(right));
    }
  });
});

describe("m.mult.props", () => {
  it("typed items: the key in the blank makes every equation true; arrays match the factors", () => {
    for (const level of [1, 2])
      for (const it of items("m.mult.props", level)) {
        if (it.input === "choices") continue;
        const filled = it.prompt.map((p) => (typeof p === "string" ? p : String(numberOf(it.answer)))).join("");
        for (const part of filled.split(/, so /)) {
          const sides = part.split(" = ").map(shown);
          for (const side of sides) expect(side, filled).toBe(sides[0]);
        }
        if (it.visual?.kind === "array") expect(it.visual.rows * it.visual.cols).toBe(shown(filled.split(" = ")[0]));
      }
  });
  it("choice items: exactly one choice has the product asked for, and it is the key", () => {
    for (const level of [1, 2])
      for (const it of items("m.mult.props", level)) {
        if (it.input !== "choices") continue;
        const target = shown(/(\d+ × \d+)\?$/.exec(text(it))![1]);
        const equal = it.choices!.filter((c) => shown(c.label) === target).map((c) => c.label);
        expect(equal).toEqual([choiceLabel(it)]);
      }
  });
  it("grouping items: the last hint regroups toward the box and never works out the missing product", () => {
    let seen = 0;
    for (const locale of LOCALES)
      for (const it of items("m.mult.props", 2, locale)) {
        const m = /^(\d+) × (\d+) × (\d+) = \1 × $/.exec(text(it));
        if (!m) continue;
        seen++;
        const [a, b, c] = m.slice(1).map(Number), last = it.hints[2];
        expect(last).toContain(`${a} × (${b} × ${c})`);
        expect(last).not.toMatch(new RegExp(`= ${b * c}(?![\\d ×(])`));
        for (const h of it.hints) for (const e of equations(h)) expect(e.right, h).not.toBe(b * c);
      }
    expect(seen).toBeGreaterThan(40);
  });
});

const TWO_STEP_SOLVERS: [RegExp, (n: number[]) => number][] = [
  [/buys (\d+) packs of markers\. Each pack has (\d+) markers\. \S+ gives (\d+) markers/, ([g, s, c]) => g * s - c],
  [/has (\d+) trading cards\. Then \S+ gets (\d+) packs with (\d+) cards/, ([c, g, s]) => c + g * s],
  [/^(\d+) cookies are shared equally on (\d+) plates\. Then (\d+) cookies are eaten/, ([t, k, c]) => t / k - c],
  [/saves \$(\d+) each week for (\d+) weeks\. Then \S+ spends \$(\d+)/, ([s, g, c]) => s * g - c],
  [/has (\d+) rows with (\d+) seats in each row\. (\d+) seats are empty/, ([g, s, c]) => g * s - c],
  [/has (\d+) girls and (\d+) boys\. The coach makes teams of (\d+)/, ([a, b, k]) => (a + b) / k],
  [/has (\d+) telescopes\. (\d+) kids look through each telescope, and (\d+) more kids/, ([g, s, c]) => g * s + c],
  [/has (\d+) songbooks to share equally among (\d+) classes\. Each class already has (\d+)/, ([t, k, c]) => t / k + c],
];

describe("m.multdiv.word", () => {
  it("level 1: the story's two numbers, added group by group", () => {
    for (const it of items("m.multdiv.word", 1)) {
      const [a, b] = nums(text(it));
      expect(nums(text(it)).length).toBe(2);
      let total = 0;
      for (let g = 0; g < a; g++) total += b;
      expect(numberOf(it.answer)).toBe(total);
    }
  });
  it("level 2: multiplying back gives the total", () => {
    for (const it of items("m.multdiv.word", 2)) {
      const [total, k] = nums(text(it));
      expect(numberOf(it.answer) * k).toBe(total);
      expect(Number.isInteger(numberOf(it.answer))).toBe(true);
    }
  });
  it("level 3: each two-step story re-solved from its wording", () => {
    for (const it of items("m.multdiv.word", 3)) {
      const want = solve(text(it), TWO_STEP_SOLVERS);
      expect(Number.isInteger(want) && want > 0).toBe(true);
      expect(numberOf(it.answer)).toBe(want);
    }
  });
});

describe("m.frac.equiv.model", () => {
  it("level 1: the shaded bar below equals the bar shown, in the pad's parts", () => {
    for (const it of items("m.frac.equiv.model", 1)) {
      const v = it.visual!;
      if (v.kind !== "fraction" || it.pad?.kind !== "fraction-bar") throw new Error("expected a fraction bar and a fraction-bar pad");
      const [[s, p]] = fracs(it);
      expect([s, p]).toEqual([v.shaded, v.parts]);
      const a = it.answer;
      if (a.kind !== "fraction") throw new Error("fraction answer");
      expect(a.d).toBe(it.pad.parts);
      expect(a.n * p).toBe(s * a.d);
      expect(it.pad.parts).not.toBe(p);
    }
  });
  it("level 2: the symbol or the winner matches a floating-point comparison of same-top or same-bottom fractions", () => {
    let story = 0;
    for (const locale of LOCALES)
      for (const it of items("m.frac.equiv.model", 2, locale)) {
        const [[a, b], [c, d]] = fracs(it);
        expect(a === c || b === d).toBe(true);
        expect([b, d].every((x) => [2, 3, 4, 6, 8].includes(x))).toBe(true);
        const diff = a / b - c / d;
        if (["<", ">", "="].includes(it.choices![0].label)) {
          expect(choiceLabel(it)).toBe(Math.abs(diff) < 1e-12 ? "=" : diff < 0 ? "<" : ">");
        } else {
          story++;
          const names = text(it).split(/\. /).slice(0, 2).map((sentence) => sentence.split(" ")[0]);
          const want = Math.abs(diff) < 1e-12 ? it.choices!.find((ch) => !names.includes(ch.label))!.label : diff > 0 ? names[0] : names[1];
          expect(choiceLabel(it)).toBe(want);
        }
      }
    expect(story).toBeGreaterThan(100);
  });
  it("level 3: equivalent fractions cross-multiply; whole numbers as fractions keep their value", () => {
    for (const it of items("m.frac.equiv.model", 3)) {
      const f = it.prompt.filter((p) => typeof p === "object" && "frac" in p).map((p) => (p as { frac: [number | string, number | string] }).frac);
      const ans = numberOf(it.answer);
      const t = text(it);
      if (f.length === 2) {
        const [[a, b], [x, y]] = f;
        const [top, bottom] = x === "?" ? [ans, Number(y)] : [Number(x), ans];
        expect(Number(a) * bottom).toBe(Number(b) * top);
        if (it.visual?.kind === "number-line") expect(close(it.visual.marker!, Number(a) / Number(b))).toBe(true);
      } else if (/^ = $/.test(t)) {
        const [[n, d]] = f;
        expect(ans * Number(d)).toBe(Number(n));
      } else {
        const w = nums(t)[0];
        const [[q, d]] = f;
        expect(q).toBe("?");
        expect(ans / Number(d)).toBe(w);
      }
    }
  });
});

const SHAPE_SIDES: Record<string, number> = { triangle: 3, quadrilateral: 4, square: 4, pentagon: 5, hexagon: 6 };
const COUNT_WORDS: Record<string, number> = { Two: 2, Three: 3, Four: 4, Five: 5 };
/** Sides can make a real (not flat) shape only if each side is shorter than all the others put together. */
const closes = (sides: number[]) => sides.every((x, i) => x < sides.reduce((s, y, j) => (j === i ? s : s + y), 0));

describe("m.perimeter.missing", () => {
  it("level 1: the key is all the sides added", () => {
    for (const it of items("m.perimeter.missing", 1)) {
      const t = text(it), ans = numberOf(it.answer);
      const listed = /Its sides are ([^.]+)\./.exec(t);
      if (listed) {
        expect(ans).toBe(nums(listed[1]).reduce((s, x) => s + x, 0));
        expect(closes(nums(listed[1])), t).toBe(true);
      }
      else if (it.visual?.kind === "rect") expect(ans).toBe([it.visual.w, it.visual.h, it.visual.w, it.visual.h].reduce((s, x) => s + x, 0));
      else {
        const [, shape, side] = /shaped like a (\w+) with all sides the same length\. Each side is (\d+)/.exec(t)!;
        let total = 0;
        for (let i = 0; i < SHAPE_SIDES[shape]; i++) total += Number(side);
        expect(ans).toBe(total);
      }
    }
  });
  it("level 2: the missing side completes the perimeter", () => {
    for (const it of items("m.perimeter.missing", 2)) {
      const t = text(it), ans = numberOf(it.answer);
      let m: RegExpExecArray | null;
      if ((m = /shaped like a (\w+)\. Its perimeter is (\d+) \w+\. (\w+) of its sides are ([^.]+)\./.exec(t))) {
        const known = nums(m[4]);
        expect(known.length).toBe(COUNT_WORDS[m[3]]);
        expect(known.length + 1).toBe(SHAPE_SIDES[m[1]]);
        expect(ans + known.reduce((s, x) => s + x, 0)).toBe(Number(m[2]));
        expect(closes([...known, ans]), t).toBe(true);
      } else if ((m = /has a perimeter of (\d+) \w+\. It is (\d+) \w+ long\. How wide/.exec(t))) {
        expect(2 * (Number(m[2]) + ans)).toBe(Number(m[1]));
        expect(ans).toBeLessThan(Number(m[2]));
      } else {
        m = /shaped like a (\w+) with all sides the same length\. Its perimeter is (\d+)/.exec(t)!;
        expect(ans * SHAPE_SIDES[m[1]]).toBe(Number(m[2]));
      }
      expect(ans).toBeGreaterThan(0);
    }
  });
});

/** "3:40" → minutes after 12:00. */
const minutes = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h % 12) * 60 + m;
};
const mod720 = (x: number) => ((x % 720) + 720) % 720;
function clockAnswer(it: Item) {
  if (it.answer.kind !== "text") throw new Error("expected a clock answer");
  return minutes(it.answer.accept[0]);
}

describe("m.time.elapsed", () => {
  it("level 1 and level 3: start + duration, or end − duration, counted in minutes", () => {
    for (const level of [1, 3])
      for (const it of items("m.time.elapsed", level)) {
        const t = text(it);
        const times = t.match(/\d{1,2}:\d\d/g)!.map(minutes), [d] = /(\d+) minutes/.exec(t)!.slice(1).map(Number);
        const shownTime = it.visual?.kind === "clock" ? mod720(it.visual.h * 60 + it.visual.m) : NaN;
        expect(shownTime).toBe(times[0]);
        if (/starts at/.test(t)) expect(clockAnswer(it)).toBe(mod720(times[0] + d));
        else expect(clockAnswer(it)).toBe(mod720(times[0] - d));
        if (level === 1) expect(it.pad).toEqual({ kind: "clock", stepMinutes: 5 });
      }
  });
  it("level 2: the minutes between the two times", () => {
    for (const it of items("m.time.elapsed", 2)) {
      const [a, b] = text(it).match(/\d{1,2}:\d\d/g)!.map(minutes);
      expect(numberOf(it.answer)).toBe(mod720(b - a));
      expect(numberOf(it.answer)).toBeGreaterThan(60 - (a % 60));
    }
  });
  it("crosses the hour in most items", () => {
    const crossing = items("m.time.elapsed", 1).filter((it) => Math.floor(clockAnswer(it) / 60) !== Math.floor(minutes(text(it).match(/\d{1,2}:\d\d/)![0]) / 60));
    expect(crossing.length).toBeGreaterThan(100);
  });
});

const MASS_SOLVERS: [RegExp, (n: number[]) => number][] = [
  [/puppy has a mass of (\d+) kg\. A kitten has a mass of (\d+) kg\. How much more/, ([a, b]) => a - b],
  [/pot has (\d+) L of soup\. \S+ adds (\d+) L of water/, ([a, b]) => a + b],
  [/fish tank holds (\d+) L of water\. \S+ pours out (\d+) L/, ([a, b]) => a - b],
  [/bag has (\d+) g of flour\. \S+ uses (\d+) g/, ([a, b]) => a - b],
  [/melon has a mass of (\d+) g\. A bunch of grapes has a mass of (\d+) g\. What is their total/, ([a, b]) => a + b],
  [/has (\d+) L of blue paint and (\d+) L of red paint/, ([a, b]) => a + b],
  [/guitar in its case has a mass of (\d+) kg\. The guitar alone has a mass of (\d+) kg/, ([a, b]) => a - b],
  [/Each bottle holds (\d+) L of water\. How many liters do (\d+) bottles/, ([s, g]) => s * g],
  [/bag of rice has a mass of (\d+) kg\. What is the mass of (\d+) bags/, ([s, g]) => s * g],
  [/^(\d+) L of juice is poured equally into (\d+) pitchers/, ([t, k]) => t / k],
  [/^(\d+) kg of dog food is split equally into (\d+) bins/, ([t, k]) => t / k],
  [/watering can holds (\d+) L\. How many times must \S+ fill it to pour (\d+) L/, ([s, t]) => t / s],
  [/makes (\d+) clay pots in art class\. Each pot uses (\d+) kg/, ([g, s]) => g * s],
];

describe("m.mass.volume", () => {
  it("each story re-solved from its wording, in whole units", () => {
    for (const level of [1, 2])
      for (const it of items("m.mass.volume", level)) {
        const want = solve(text(it), MASS_SOLVERS);
        expect(Number.isInteger(want) && want > 0).toBe(true);
        expect(numberOf(it.answer)).toBe(want);
      }
  });
});

describe("m.bargraph.scaled", () => {
  const list = (s: string) => s.split(/, | and /);
  it("level 1: counting dots in the named group, times the scale", () => {
    for (const it of items("m.bargraph.scaled", 1)) {
      const t = text(it), v = it.visual!;
      if (v.kind !== "dots") throw new Error("expected a picture graph of dots");
      expect(it.markable).toBe(true);
      const k = Number(/Each dot stands for (\d+) votes/.exec(t)![1]);
      const names = list(/the groups are (.+?)\. How/.exec(t)![1]);
      const votes = (name: string) => v.groups[names.indexOf(name)] * k;
      let m: RegExpExecArray | null;
      if ((m = /How many more votes were for (.+) than for (.+)\?$/.exec(t))) expect(numberOf(it.answer)).toBe(votes(m[1]) - votes(m[2]));
      else {
        m = /How many votes were for (.+)\?$/.exec(t)!;
        expect(numberOf(it.answer)).toBe(votes(m[1]));
      }
    }
  });
  it("level 2: reading each bar, halfway marks included", () => {
    for (const it of items("m.bargraph.scaled", 2)) {
      const t = text(it);
      const k = Number(/the scale counts by (\d+)\./.exec(t)![1]);
      const bars = new Map<string, number>();
      for (const m of t.matchAll(/The bar for (.+?) ends (?:at (\d+)|halfway between (\d+) and (\d+))\./g)) {
        if (m[2]) {
          expect(Number(m[2]) % k).toBe(0);
          bars.set(m[1], Number(m[2]));
        } else {
          expect(Number(m[4]) - Number(m[3])).toBe(k);
          expect(Number(m[3]) % k).toBe(0);
          bars.set(m[1], (Number(m[3]) + Number(m[4])) / 2);
        }
      }
      expect(bars.size).toBe(3);
      let m: RegExpExecArray | null;
      if ((m = /How many more votes were for (.+) than for (.+)\?$/.exec(t))) expect(numberOf(it.answer)).toBe(bars.get(m[1])! - bars.get(m[2])!);
      else if ((m = /How many fewer votes were for (.+) than for (.+)\?$/.exec(t))) expect(numberOf(it.answer)).toBe(bars.get(m[2])! - bars.get(m[1])!);
      else {
        m = /How many votes were for (.+) and (.+) together\?$/.exec(t)!;
        expect(numberOf(it.answer)).toBe(bars.get(m[1])! + bars.get(m[2])!);
      }
      expect(numberOf(it.answer)).toBeGreaterThan(0);
    }
  });
});

// ---------------- grade 4 ----------------

const PLACE_POWER: Record<string, number> = { ones: 0, tens: 1, hundreds: 2, thousands: 3, "ten thousands": 4, "hundred thousands": 5, thousand: 3, "ten thousand": 4, "hundred thousand": 5 };

describe("m.place.million", () => {
  it("level 1: the digit's value read from its position in the written number", () => {
    for (const it of items("m.place.million", 1)) {
      const t = text(it);
      let m: RegExpExecArray | null;
      if ((m = /value of the (\d) in ([\d,]+)\?/.exec(t))) {
        const digits = m[2].replace(/,/g, "");
        const pos = digits.length - 1 - digits.indexOf(m[1]);
        expect(digits.split(m[1]).length).toBe(2);
        expect(numberOf(it.answer)).toBe(Number(m[1] + "0".repeat(pos)));
      } else {
        m = /Which digit is in the (.+) place of ([\d,]+)\?/.exec(t)!;
        const digits = m[2].replace(/,/g, "");
        expect(numberOf(it.answer)).toBe(Number(digits[digits.length - 1 - PLACE_POWER[m[1]]]));
      }
    }
  });
  it("level 2: comparisons match the numbers; expanded form adds back up", () => {
    let compare = 0;
    for (const it of items("m.place.million", 2)) {
      const t = text(it);
      if (it.input === "choices") {
        compare++;
        const [a, b] = nums(t);
        expect(choiceLabel(it)).toBe(a < b ? "<" : a > b ? ">" : "=");
      } else {
        const parts = t.replace(/ = $/, "").split(" + ");
        for (const p of parts) expect(p.replace(/,/g, "")).toMatch(/^[1-9]0*$/);
        expect(numberOf(it.answer)).toBe(shown(parts.join(" + ")));
        expect(String(numberOf(it.answer))).toMatch(/0/);
      }
    }
    expect(compare).toBeGreaterThan(100);
  });
  it("level 3: the nearest multiple of the place, halfway rounding up", () => {
    for (const it of items("m.place.million", 3)) {
      const [, n, place] = /^Round ([\d,]+) to the nearest (.+)\.$/.exec(text(it))!;
      const N = Number(n.replace(/,/g, "")), u = 10 ** PLACE_POWER[place], got = numberOf(it.answer);
      expect(got % u).toBe(0);
      expect(Math.abs(got - N)).toBeLessThanOrEqual(u / 2);
      if (Math.abs(got - N) === u / 2) expect(got).toBeGreaterThan(N);
    }
  });
});

const REMAINDER_SOLVERS: [RegExp, (n: number[]) => number][] = [
  [/^(\d+) students are going on a field trip\. Each van holds (\d+)/, ([t, k]) => Math.ceil(t / k)],
  [/has (\d+) beads\. Each bracelet uses (\d+) beads/, ([t, k]) => Math.floor(t / k)],
  [/packs (\d+) cookies into boxes of (\d+)\. How many cookies are left over/, ([t, k]) => t % k],
  [/has (\d+) red marbles and (\d+) blue marbles\. Each bag holds (\d+)/, ([a, b, k]) => Math.ceil((a + b) / k)],
  [/makes (\d+) trays of muffins with (\d+) muffins on each tray\. A box holds (\d+)/, ([g, s, k]) => Math.floor((g * s) / k)],
  [/^(\d+) chairs are set up in rows of (\d+)/, ([t, k]) => Math.floor(t / k)],
  [/^(\d+) kids sign up for soccer\. Each team can have at most (\d+)/, ([t, k]) => Math.ceil(t / k)],
  [/has (\d+) stickers and buys (\d+) more\. \S+ shares them equally among (\d+) friends/, ([a, b, k]) => (a + b) % k],
];

describe("m.mult.compare", () => {
  it("level 1: k times as many is k equal groups", () => {
    for (const it of items("m.mult.compare", 1)) {
      const [a, b] = nums(text(it));
      expect(nums(text(it)).length).toBe(2);
      expect(numberOf(it.answer)).toBe(a * b);
    }
  });
  it("level 2: the smaller amount or the factor multiplies back to the larger amount", () => {
    for (const it of items("m.mult.compare", 2)) {
      const n = nums(text(it));
      expect(n.length).toBe(2);
      expect(numberOf(it.answer) * Math.min(...n)).toBe(Math.max(...n));
    }
  });
  it("level 3: each story re-solved, and the leftover always matters", () => {
    for (const it of items("m.mult.compare", 3)) {
      const t = text(it), want = solve(t, REMAINDER_SOLVERS);
      expect(numberOf(it.answer)).toBe(want);
      const n = nums(t), k = n[n.length - 1], total = n.length === 3 ? (/trays/.test(t) ? n[0] * n[1] : n[0] + n[1]) : n[0];
      expect(total % k).toBeGreaterThan(0);
      for (const h of it.hints) expect(h, "a hint shows the whole division").not.toMatch(/ R \d/);
    }
  });
});

describe("m.frac.times.whole", () => {
  it("the key equals the whole number times the fraction", () => {
    for (const level of [1, 2, 3])
      for (const it of items("m.frac.times.whole", level)) {
        const f = fracs(it), w = nums(text(it));
        if (it.input === "keypad") {
          const [[a, b], [one, b2]] = f;
          expect([one, b2]).toEqual([1, b]);
          expect(numberOf(it.answer) * one * b2).toBe(a * b);
        } else {
          expect(w.length).toBe(1);
          const [[a, b]] = f;
          expect(close(fractionOf(it.answer), w[0] * (a / b))).toBe(true);
        }
      }
  });
});

describe("m.dec.hundredths", () => {
  const cents = (s: string) => {
    const [whole, part = ""] = s.split(".");
    return Number(whole) * 100 + Number(part.padEnd(2, "0"));
  };
  it("levels 1–2: tenths renamed as hundredths, then added", () => {
    for (const level of [1, 2])
      for (const it of items("m.dec.hundredths", level)) {
        const [x, y] = fracs(it);
        const sum = x[0] / x[1] + y[0] / y[1];
        expect([x[1], y[1]].sort((p, q) => p - q)).toEqual([10, 100]);
        if (level === 1) expect(close(numberOf(it.answer) / 100, sum)).toBe(true);
        else expect(close(numberOf(it.answer), sum)).toBe(true);
      }
  });
  it("level 3: the winner has the larger amount, compared in whole hundredths", () => {
    let trap = 0;
    for (const locale of LOCALES)
      for (const it of items("m.dec.hundredths", 3, locale)) {
        const t = text(it);
        const [x, y] = t.match(/\d+\.\d+/g)!;
        const [s0, s1] = t.split(/\. /);
        const first = s0.split(" ").find((w) => /^[A-Z]/.test(w) && w !== "El")!.replace(/'s$/, "");
        const second = s1.split(" ").find((w) => /^[A-Z]/.test(w) && w !== "El")!.replace(/'s$/, "");
        const [a, b] = [cents(x), cents(y)];
        const same = it.choices!.find((c) => c.label !== first && c.label !== second)!.label;
        expect(choiceLabel(it)).toBe(a > b ? first : b > a ? second : same);
        if ((x.length < y.length && a > b) || (y.length < x.length && b > a)) trap++;
      }
    expect(trap).toBeGreaterThan(40);
  });
});

/** Base units for conversions, written out so the test never shares the generator's table. */
const BASE: Record<string, [string, number]> = {
  inch: ["len", 1], inches: ["len", 1], foot: ["len", 12], feet: ["len", 12], yard: ["len", 36], yards: ["len", 36],
  ounce: ["wt", 1], ounces: ["wt", 1], pound: ["wt", 16], pounds: ["wt", 16],
  second: ["time", 1], seconds: ["time", 1], minute: ["time", 60], minutes: ["time", 60], hour: ["time", 3600], hours: ["time", 3600],
  meter: ["m", 1], meters: ["m", 1], centimeter: ["m", 0.01], centimeters: ["m", 0.01], millimeter: ["m", 0.001], millimeters: ["m", 0.001], kilometer: ["m", 1000], kilometers: ["m", 1000],
  gram: ["g", 1], grams: ["g", 1], kilogram: ["g", 1000], kilograms: ["g", 1000],
  liter: ["L", 1], liters: ["L", 1], milliliter: ["L", 0.001], milliliters: ["L", 0.001],
  cup: ["vol", 1], cups: ["vol", 1], pint: ["vol", 2], pints: ["vol", 2], quart: ["vol", 4], quarts: ["vol", 4], gallon: ["vol", 16], gallons: ["vol", 16],
  km: ["m", 1000], m: ["m", 1], cm: ["m", 0.01], mm: ["m", 0.001], kg: ["g", 1000], g: ["g", 1], L: ["L", 1], mL: ["L", 0.001],
};
const inBase = (unit: string) => {
  const u = BASE[unit];
  if (!u) throw new Error(`unknown unit ${unit}`);
  return u;
};

const CONVERT_SOLVERS: [RegExp, (n: number[]) => number][] = [
  [/ribbon is (\d+) feet long\. \S+ cuts off (\d+) inches/, ([n, c]) => n * 12 - c],
  [/movie is (\d+) hours? (\d+) minutes long/, ([h, m]) => h * 60 + m],
  [/race is (\d+) kilometers long\. \S+ has run ([\d,]+) meters/, ([n, c]) => n * 1000 - c],
  [/puppy weighed (\d+) pounds (\d+) ounces\. Then it gained (\d+) ounces/, ([n, m, c]) => 16 * n + m + c],
  [/jug with (\d+) liters of water and pours out ([\d,]+) milliliters/, ([n, c]) => 1000 * n - c],
  [/practices piano for (\d+) minutes each day for (\d+) days/, ([m, d]) => (m * d) / 60],
  [/spacewalk lasted (\d+) hours (\d+) minutes/, ([h, m]) => 60 * h + m],
];

describe("m.measure.convert", () => {
  it("levels 1–2: both sides name the same amount in the test's own unit table", () => {
    for (const level of [1, 2])
      for (const it of items("m.measure.convert", level)) {
        const t = text(it).replace(/\s+/g, " ").trim(), ans = numberOf(it.answer);
        // "5 feet = inches", "3 feet 7 inches = inches", "43 inches = 3 feet inches"
        const [left, right] = t.split(" = ");
        const amount = (s: string, blankValue?: number) => {
          const parts = s.split(" ");
          let total = 0, kind = "";
          for (let i = 0; i < parts.length; i++) {
            const isNum = /^[\d,]+$/.test(parts[i]);
            const n = isNum ? Number(parts[i].replace(/,/g, "")) : blankValue!;
            const unit = isNum ? parts[++i] : parts[i];
            const [k, f] = inBase(unit);
            kind ||= k;
            expect(k).toBe(kind);
            total += n * f;
          }
          return total;
        };
        expect(close(amount(left), amount(right, ans))).toBe(true);
      }
  });
  it("level 3: each story re-solved from its wording", () => {
    for (const it of items("m.measure.convert", 3)) {
      const want = solve(text(it), CONVERT_SOLVERS);
      expect(Number.isInteger(want) && want > 0).toBe(true);
      expect(numberOf(it.answer)).toBe(want);
    }
  });
});

describe("m.area.word", () => {
  it("level 1: area by counting unit squares, perimeter by walking the edge", () => {
    for (const locale of LOCALES)
      for (const it of items("m.area.word", 1, locale)) {
        const v = it.visual!;
        if (v.kind !== "rect") throw new Error("expected a rectangle");
        const [l, w] = nums(text(it));
        expect([v.w, v.h]).toEqual([l, w]);
        let squares = 0;
        for (let r = 0; r < w; r++) for (let c = 0; c < l; c++) squares++;
        const isArea = locale === "en" ? /square|area/.test(text(it)) : /cuadrad|área/.test(text(it));
        expect(numberOf(it.answer)).toBe(isArea ? squares : l + w + l + w);
      }
  });
  it("level 2: the missing width multiplies or walks back to what was given", () => {
    for (const it of items("m.area.word", 2)) {
      const t = text(it), [given, l] = nums(t), w = numberOf(it.answer);
      if (/area|covers/.test(t)) expect(l * w).toBe(given);
      else expect(2 * (l + w)).toBe(given);
      expect(w).toBeLessThan(l);
    }
  });
});

const ANGLE_SOLVERS: [RegExp, (n: number[]) => number][] = [
  [/made of two angles that do not overlap\. One is (\d+)° and the other is (\d+)°/, ([a, b]) => a + b],
  [/right angle is split into two angles\. One is (\d+)°/, ([a]) => 90 - a],
  [/straight angle is split into two angles\. One is (\d+)°/, ([a]) => 180 - a],
  [/fill a full turn around a point\. Two of them are (\d+)° and (\d+)°/, ([a, b]) => 360 - a - b],
  [/turns (\d+)° on a skateboard, then turns (\d+)° more/, ([a, b]) => a + b],
];
/** The smaller angle between the hands, from where each hand points (degrees clockwise from 12). */
function handAngle(h: number, m: number) {
  const hour = ((h % 12) * 30 + m * 0.5) % 360, minute = m * 6;
  const d = Math.abs(hour - minute);
  return Math.min(d, 360 - d);
}

describe("m.angles", () => {
  it("level 1: the kind of angle matches its measure", () => {
    for (const it of items("m.angles", 1)) {
      const t = text(it);
      const deg = it.visual?.kind === "clock" ? handAngle(it.visual.h, it.visual.m) : Number(/measures (\d+)°/.exec(t)![1]);
      expect(deg > 0 && deg < 180).toBe(true);
      // Following the hint (jumps the short way, times 30°) lands on the true angle.
      if (it.visual?.kind === "clock") expect(30 * Number(/is (\d+) jumps?\.$/.exec(it.hints[2])![1])).toBe(deg);
      expect(choiceLabel(it)).toBe(deg < 90 ? "acute" : deg === 90 ? "right" : "obtuse");
    }
  });
  it("level 2: clock angles from the hands; parts of a turn from 360°", () => {
    for (const it of items("m.angles", 2)) {
      if (it.visual?.kind === "clock") expect(numberOf(it.answer)).toBe(handAngle(it.visual.h, it.visual.m));
      else {
        const [[n, d]] = fracs(it);
        expect(close(numberOf(it.answer), (360 * n) / d)).toBe(true);
      }
      expect(Number.isInteger(numberOf(it.answer))).toBe(true);
    }
  });
  it("level 3: each story re-solved from its wording", () => {
    for (const it of items("m.angles", 3)) {
      const want = solve(text(it), ANGLE_SOLVERS);
      expect(want).toBeGreaterThan(0);
      expect(numberOf(it.answer)).toBe(want);
    }
  });
});

/** Vertices for each shape in the bank; lines of symmetry are found by trying every mirror through the center. */
const r3 = Math.sqrt(3);
const regular = (n: number) => Array.from({ length: n }, (_, i) => [Math.cos(Math.PI / 2 + (2 * Math.PI * i) / n), Math.sin(Math.PI / 2 + (2 * Math.PI * i) / n)] as [number, number]);
const SHAPES: Record<string, [number, number][]> = {
  "a square": [[0, 0], [2, 0], [2, 2], [0, 2]],
  "a rectangle that is not a square": [[0, 0], [3, 0], [3, 2], [0, 2]],
  "a rhombus that is not a square": [[2, 0], [0, 1], [-2, 0], [0, -1]],
  "a parallelogram with no right angles and two different side lengths": [[0, 0], [4, 0], [5, 2], [1, 2]],
  "an isosceles trapezoid (its two slanted sides are the same length)": [[0, 0], [6, 0], [4, 2], [2, 2]],
  "a kite that is not a rhombus": [[0, 2], [1, 0], [0, -4], [-1, 0]],
  "an equilateral triangle": [[0, 0], [2, 0], [1, r3]],
  "an isosceles triangle that is not equilateral": [[-1, 0], [1, 0], [0, 3]],
  "a scalene triangle (all three sides different lengths)": [[0, 0], [4, 0], [1, 2]],
  "a regular pentagon": regular(5),
  "a regular hexagon": regular(6),
  "a regular octagon": regular(8),
  "a right triangle with two equal sides": [[0, 0], [2, 0], [0, 2]],
};
function linesOfSymmetry(pts: [number, number][]) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let count = 0;
  for (let k = 0; k < 1440; k++) {
    const th = (k * Math.PI) / 1440, c = Math.cos(2 * th), s = Math.sin(2 * th);
    const mirrored = pts.map(([x, y]) => [cx + (x - cx) * c + (y - cy) * s, cy + (x - cx) * s - (y - cy) * c]);
    if (mirrored.every(([x, y]) => pts.some(([px, py]) => Math.hypot(px - x, py - y) < 1e-6))) count++;
  }
  return count;
}

describe("m.symmetry (draft bank)", () => {
  it("each level has at least 12 distinct, complete items in both languages", () => {
    const yesNo = new Set(SYMMETRY_YES_NO.map((e) => e.q.en)), counts = new Set(SYMMETRY_COUNT.map((e) => e.shape.en));
    expect(yesNo.size).toBeGreaterThanOrEqual(12);
    expect(counts.size).toBeGreaterThanOrEqual(12);
    expect(new Set(SYMMETRY_YES_NO.map((e) => e.q.es)).size).toBe(yesNo.size);
    expect(new Set(SYMMETRY_COUNT.map((e) => e.shape.es)).size).toBe(counts.size);
    for (const e of SYMMETRY_YES_NO) for (const f of [e.q, e.clue, e.look, e.why]) expect(f.en.trim() && f.es.trim()).toBeTruthy();
    for (const e of SYMMETRY_COUNT) {
      for (const f of [e.shape, e.clue, e.look, e.why]) expect(f.en.trim() && f.es.trim()).toBeTruthy();
      const labels = [e.n, ...e.wrong.map(([v]) => v)];
      expect(new Set(labels).size).toBe(labels.length);
      expect(labels.length).toBeGreaterThanOrEqual(3);
    }
    expect(SYMMETRY_YES_NO.some((e) => e.yes) && SYMMETRY_YES_NO.some((e) => !e.yes)).toBe(true);
    for (const level of [1, 2]) {
      const seen = new Set(items("m.symmetry", level).map((it) => text(it)));
      expect(seen.size).toBeGreaterThanOrEqual(12);
    }
    // "Deltoide" is right but rare for a 4th grader, so the Spanish says what it looks like.
    expect(SYMMETRY_COUNT.find((e) => /kite/.test(e.shape.en))!.shape.es).toMatch(/deltoide \(con forma de cometa\)/);
  });
  it("every count in the bank matches a brute-force search for mirror lines", () => {
    for (const e of SYMMETRY_COUNT) {
      const pts = SHAPES[e.shape.en];
      expect(pts, `no coordinates for ${e.shape.en}`).toBeTruthy();
      expect(linesOfSymmetry(pts), e.shape.en).toBe(e.n);
    }
  });
  it("yes/no answers for polygons match the same search", () => {
    const polygons: Record<string, [number, number][]> = {
      "Does a square have a line of symmetry?": SHAPES["a square"],
      "Does an isosceles triangle (two sides the same length) have a line of symmetry?": [[-1, 0], [1, 0], [0, 3]],
      "Does a scalene triangle (all three sides different lengths) have a line of symmetry?": SHAPES["a scalene triangle (all three sides different lengths)"],
      "Does a parallelogram with no right angles and two different side lengths have a line of symmetry?": SHAPES["a parallelogram with no right angles and two different side lengths"],
    };
    for (const [q, pts] of Object.entries(polygons)) {
      const e = SYMMETRY_YES_NO.find((x) => x.q.en === q)!;
      expect(e, q).toBeTruthy();
      expect(linesOfSymmetry(pts) > 0, q).toBe(e.yes);
    }
  });
  it("the key is the bank's answer, in both languages", () => {
    for (const locale of LOCALES) {
      for (const it of items("m.symmetry", 1, locale)) {
        const e = SYMMETRY_YES_NO.find((x) => x.q[locale] === text(it))!;
        expect(choiceLabel(it)).toBe(e.yes ? (locale === "en" ? "Yes" : "Sí") : "No");
      }
      for (const it of items("m.symmetry", 2, locale)) {
        const e = SYMMETRY_COUNT.find((x) => text(it) === (locale === "en" ? `How many lines of symmetry does ${x.shape.en} have?` : `¿Cuántos ejes de simetría tiene ${x.shape.es}?`))!;
        expect(choiceLabel(it)).toBe(String(e.n));
      }
    }
  });
});

// ---------------- grade 5 ----------------

describe("m.div.2digit", () => {
  it("quotient × divisor (+ remainder) gives back the dividend", () => {
    for (const level of [1, 2, 3])
      for (const it of items("m.div.2digit", level)) {
        const [n, d] = nums(text(it));
        expect(d >= 11 && d <= 99).toBe(true);
        const a = it.answer;
        if (level < 3) {
          expect(BigInt(numberOf(a)) * BigInt(d)).toBe(BigInt(n));
          for (const h of it.hints) expect(h, "a hint names the quotient").not.toMatch(new RegExp(`(try|con) ${numberOf(a)}\\.`));
          if (level === 1) expect(n >= 100 && n <= 999 && numberOf(a) <= 9).toBe(true);
          else expect(n >= 1000 && n <= 9999 && numberOf(a) >= 10).toBe(true);
        } else {
          if (a.kind !== "remainder") throw new Error("expected a remainder answer");
          expect(a.q * d + a.r).toBe(n);
          expect(a.r > 0 && a.r < d).toBe(true);
        }
      }
  });
});

/** "4.07" → 4070 thousandths, from the digits rather than floating point. */
const milli = (s: string) => {
  const [whole, part = ""] = s.split(".");
  return Number(whole) * 1000 + Number(part.padEnd(3, "0"));
};

describe("m.dec.thousandths", () => {
  it("level 1: the symbol matches the numbers compared in whole thousandths", () => {
    let trap = 0;
    for (const it of items("m.dec.thousandths", 1)) {
      const [x, y] = text(it).trim().split(/\s+/);
      const [a, b] = [milli(x), milli(y)];
      expect(choiceLabel(it)).toBe(a < b ? "<" : a > b ? ">" : "=");
      if ((x.length < y.length && a > b) || (y.length < x.length && b > a)) trap++;
    }
    expect(trap).toBeGreaterThan(30);
  });
  it("level 2: the point to place is the number in the prompt, on a tick of a ten-step line", () => {
    for (const it of items("m.dec.thousandths", 2)) {
      const x = /Put ([\d.]+) on/.exec(text(it))![1];
      expect(close(numberOf(it.answer), Number(x))).toBe(true);
      if (it.pad?.kind !== "number-line") throw new Error("expected a number-line pad");
      expect(Math.round((it.pad.max - it.pad.min) / it.pad.step)).toBe(10);
    }
  });
  it("level 3: the nearest whole, tenth or hundredth, halfway rounding up", () => {
    const unit: Record<string, number> = { "whole number": 1000, tenth: 100, hundredth: 10 };
    for (const it of items("m.dec.thousandths", 3)) {
      const [, x, place] = /^Round ([\d.]+) to the nearest (.+)\.$/.exec(text(it))!;
      const X = milli(x), u = unit[place], got = Math.round(numberOf(it.answer) * 1000);
      expect(got % u).toBe(0);
      expect(Math.abs(got - X)).toBeLessThanOrEqual(u / 2);
      if (Math.abs(got - X) === u / 2) expect(got).toBeGreaterThan(X);
    }
  });
});

describe("m.dec.divide", () => {
  /** "3.50" → 350 hundredths. */
  const centi = (s: string) => {
    const [whole, part = ""] = s.split(".");
    return Number(whole) * 100 + Number(part.padEnd(2, "0"));
  };
  it("quotient × divisor gives back the dividend, in whole hundredths", () => {
    for (const level of [1, 2, 3])
      for (const it of items("m.dec.divide", level)) {
        const [D, s] = text(it).match(/\d+(?:\.\d+)?/g)!;
        const q = numberOf(it.answer);
        if (level === 1) {
          expect(Math.round(q * 100) * Number(s)).toBe(centi(D));
          expect(Number.isInteger(q)).toBe(false);
        } else {
          expect(Number.isInteger(q)).toBe(true);
          expect(q * centi(s)).toBe(centi(D));
          expect(s.includes(".")).toBe(true);
        }
      }
  });
});

const SHARE_SOLVERS: [RegExp, (n: number[]) => number][] = [
  [/^(\d+) friends share (\d+) pizzas?/, ([p, a]) => a / p],
  [/^(\d+) sandwich(?:es are| is) shared equally by (\d+) people/, ([a, p]) => a / p],
  [/cuts a ribbon (\d+) (?:foot|feet) long into (\d+) equal pieces/, ([a, p]) => a / p],
  [/^(\d+) liters? of water (?:is|are) shared equally among (\d+) astronauts/, ([a, p]) => a / p],
  [/^(\d+) classes share (\d+) pans?/, ([p, a]) => a / p],
  [/pours (\d+) cups? of paint equally into (\d+) jars/, ([a, p]) => a / p],
];

describe("m.frac.asdiv", () => {
  it("level 1: a ÷ b is the fraction a over b", () => {
    for (const it of items("m.frac.asdiv", 1)) {
      const t = text(it);
      if (it.input === "fraction") {
        const [a, b] = nums(t);
        expect(close(fractionOf(it.answer), a / b)).toBe(true);
      } else {
        const [[a, b]] = fracs(it), ans = numberOf(it.answer);
        const [x, y] = /= $/.test(t) || / ÷ $/.test(t) ? [a, ans] : [ans, nums(t)[0]];
        expect(close(x / y, a / b)).toBe(true);
      }
    }
  });
  it("level 2: each sharing story re-solved, never a whole number", () => {
    for (const it of items("m.frac.asdiv", 2)) {
      const want = solve(text(it), SHARE_SOLVERS);
      expect(Number.isInteger(want)).toBe(false);
      expect(close(fractionOf(it.answer), want)).toBe(true);
    }
  });
  it("level 3: the point sits at a ÷ b on a line split into b parts per whole", () => {
    for (const it of items("m.frac.asdiv", 3)) {
      const [a, b] = nums(text(it));
      expect(close(fractionOf(it.answer), a / b)).toBe(true);
      if (it.pad?.kind !== "number-line") throw new Error("expected a number-line pad");
      expect(it.pad.denominator).toBe(b);
    }
  });
});

describe("m.lineplot.frac", () => {
  it("each question answered from the listed measurements", () => {
    for (const level of [1, 2])
      for (const it of items("m.lineplot.frac", level)) {
        const t = text(it), c = nums(t)[0], f = fracs(it);
        const data = f.slice(0, c).map(([n, d]) => n / d);
        expect(data.length).toBe(c);
        const asked = f[c] ? f[c][0] / f[c][1] : NaN;
        const sum = data.reduce((s, x) => s + x, 0);
        const question = t.split(". ").pop()!;
        const matching = data.filter((x) => close(x, asked)).length;
        let want: number;
        if (/^How many (leaves|ribbons|glasses|beakers)/.test(question)) want = matching;
        else if (/difference/.test(question)) want = Math.max(...data) - Math.min(...data);
        else if (/shared equally/.test(question)) want = sum / c;
        else if (/that (are|have)/.test(question)) want = matching * asked;
        else want = sum;
        if (Number.isFinite(asked)) expect(matching, t).toBeGreaterThanOrEqual(1);
        expect(close(valueOf(it.answer), want), t).toBe(true);
        for (const x of data) expect(Number.isInteger(x * 8)).toBe(true);
      }
  });
});

const CONVERT5_SOLVERS: [RegExp, (n: number[]) => number][] = [
  [/uses (\d+) cups of milk for each batch\. \S+ makes (\d+) batches\. How many quarts/, ([c, b]) => (c * b) / 4],
  [/runs (\d+) laps around a (\d+)-meter track\. How many kilometers/, ([l, m]) => (l * m) / 1000],
  [/has (\d+) yards? of ribbon and cuts it into pieces that are (\d+) inches long/, ([y, p]) => (36 * y) / p],
  [/bottle with (\d+) liters? of juice fills cups that hold (\d+) milliliters/, ([l, m]) => (1000 * l) / m],
  [/(\d+)-pound bag of dog food is split into bowls of (\d+) ounces/, ([lb, oz]) => (16 * lb) / oz],
  [/exercises (\d+) minutes a day for (\d+) days\. How many hours/, ([m, d]) => (m * d) / 60],
  [/playlist has (\d+) songs\. Each song is (\d+) seconds long/, ([k, s]) => (k * s) / 60],
];

describe("m.convert.multistep", () => {
  it("levels 1–2: both sides name the same amount in the test's own unit table", () => {
    for (const level of [1, 2])
      for (const it of items("m.convert.multistep", level)) {
        const t = text(it).replace(/\s+/g, " ").trim();
        const half = fracs(it).length ? 0.5 : 0;
        const [, n, from, to] = /^([\d.,]+) (\w+) = (\w+)$/.exec(t)!;
        const [k1, f1] = inBase(from), [k2, f2] = inBase(to);
        expect(k1).toBe(k2);
        expect(close(numberOf(it.answer) * f2, (Number(n.replace(/,/g, "")) + half) * f1)).toBe(true);
      }
  });
  it("level 3: each story re-solved from its wording", () => {
    for (const it of items("m.convert.multistep", 3)) {
      const want = solve(text(it), CONVERT5_SOLVERS);
      // Exact to the thousandth, so the answer can be typed: 4.5 quarts, 1.75 kilometers.
      expect(Math.abs(want * 1000 - Math.round(want * 1000)) < 1e-6 && want > 0).toBe(true);
      expect(close(numberOf(it.answer), want)).toBe(true);
    }
  });
});

describe("m.volume.composite", () => {
  it("level 1: counting unit cubes in both parts", () => {
    for (const it of items("m.volume.composite", 1)) {
      const [a, b, c, d, e, f] = nums(text(it));
      let cubes = 0;
      for (const [l, w, h] of [[a, b, c], [d, e, f]]) for (let z = 0; z < h; z++) for (let y = 0; y < w; y++) cubes += l;
      expect(numberOf(it.answer)).toBe(cubes);
    }
  });
  it("level 2: the missing height fills the total exactly", () => {
    for (const it of items("m.volume.composite", 2)) {
      const [V, a, b, c, d, e] = nums(text(it));
      expect(a * b * c + d * e * numberOf(it.answer)).toBe(V);
    }
  });
});

const ORDINALS: Record<string, number> = { fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8 };

describe("m.patterns.coord", () => {
  const pairOf = (a: Answer) => {
    if (a.kind !== "pair") throw new Error("expected a pair");
    return [a.x, a.y];
  };
  it("level 1: the pair is the plotted point, or the moves right and up", () => {
    for (const it of items("m.patterns.coord", 1)) {
      if (it.visual?.kind === "coord") expect(pairOf(it.answer)).toEqual(it.visual.points[0]);
      else expect(pairOf(it.answer)).toEqual(/Move (\d+) units? right and (\d+) units? up/.exec(text(it))!.slice(1).map(Number));
      expect(check(it.answer, `(${pairOf(it.answer).join(", ")})`).correct).toBe(true);
    }
  });
  it("level 2: terms, the times relation and matching terms from the two rules", () => {
    for (const it of items("m.patterns.coord", 2)) {
      const t = text(it);
      const [a, b] = /adds (\d+) each time: .* adds (\d+) each time/.exec(t)!.slice(1).map(Number);
      const A = (j: number) => (j - 1) * a, B = (j: number) => (j - 1) * b;
      let m: RegExpExecArray | null;
      if ((m = /What is the (\w+) number in Pattern ([AB])\?/.exec(t))) expect(numberOf(it.answer)).toBe((m[2] === "A" ? A : B)(ORDINALS[m[1]]));
      else if (/multiply each number/.test(t)) for (let j = 2; j <= 6; j++) expect(numberOf(it.answer) * A(j)).toBe(B(j));
      else {
        m = /When Pattern A is at (\d+)/.exec(t)!;
        let j = 1;
        while (A(j) < Number(m[1])) j++;
        expect(A(j)).toBe(Number(m[1]));
        expect(numberOf(it.answer)).toBe(B(j));
      }
    }
  });
  it("level 3: the asked point pairs matching terms, and the plotted points lie on both patterns", () => {
    for (const it of items("m.patterns.coord", 3)) {
      const t = text(it);
      const [a, b] = /adds (\d+) each time: .* adds (\d+) each time/.exec(t)!.slice(1).map(Number);
      const j = ORDINALS[/What is the (\w+) point\?/.exec(t)![1]];
      expect(pairOf(it.answer)).toEqual([(j - 1) * a, (j - 1) * b]);
      if (it.visual?.kind !== "coord") throw new Error("expected a coordinate grid");
      it.visual.points.forEach(([x, y], i) => expect([x, y]).toEqual([i * a, i * b]));
    }
  });
});
