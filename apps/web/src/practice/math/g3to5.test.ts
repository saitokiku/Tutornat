import { describe, expect, it } from "vitest";
import { answerText, check, parseNumber } from "../answer";
import { evaluate, parse } from "../expr";
import { gcd } from "../rng";
import { makeItem } from "../skills";
import type { Answer, Item } from "../types";
import { MATH_3_5 } from "./g3to5";

// Every answer key in grades 3–5 is re-derived here by a different route than the generator used:
// counting the picture, multiplying back, cross-multiplying, comparing with floating point,
// or evaluating the displayed expression with the answer checker's own parser.

const SEEDS = Array.from({ length: 240 }, (_, i) => i * 104729 + 7);
const LOCALES = ["en", "es"] as const;
type Loc = (typeof LOCALES)[number];

const items = (id: string, level: number, locale: Loc = "en") => SEEDS.map((seed) => ({ seed, item: makeItem(id, level, seed, locale) }));
const levels = (id: string) => Array.from({ length: MATH_3_5.find((s) => s.id === id)!.levels }, (_, i) => i + 1);

const text = (it: Item) => it.prompt.filter((p): p is string => typeof p === "string").join("");
const fracs = (it: Item) => it.prompt.flatMap((p) => (typeof p === "object" && "frac" in p ? [p.frac] : []));
const ints = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const close = (x: number, y: number) => Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
/** Evaluates arithmetic as displayed ("4 + 3 × 5", "(9 − 2) ÷ 7") with expr.ts, after swapping in ASCII operators. */
const shown = (s: string) => evaluate(parse(s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-"))!, {});

function numberOf(a: Answer) {
  if (a.kind !== "number") throw new Error(`expected a number answer, got ${a.kind}`);
  return a.value;
}
function fractionOf(a: Answer) {
  if (a.kind !== "fraction") throw new Error(`expected a fraction answer, got ${a.kind}`);
  return a;
}
function choiceLabel(it: Item) {
  if (it.answer.kind !== "choice") throw new Error(`expected a choice answer, got ${it.answer.kind}`);
  return it.choices![it.answer.index].label;
}
const isPrime = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((k) => n % k === 0).length === 2;
const cmpLabel = (diff: number) => (Math.abs(diff) < 1e-12 ? "=" : diff < 0 ? "<" : ">");

/** Integer equations shown to the learner ("80 × 3 = 240", "13 − 3 = 10") outside fractions and remainders. */
const EQUATION = /(?<![\d./])(\d+(?:\.\d+)?(?!\d|\/|\.\d)(?:\s*[+−×÷]\s*\d+(?:\.\d+)?(?!\d|\/|\.\d))+)\s*=\s*(\d+(?:\.\d+)?)(?!\d|\/|\.\d)/g;
function equations(line: string) {
  const out: { left: string; right: number }[] = [];
  for (const m of line.matchAll(EQUATION)) {
    const rest = line.slice(m.index! + m[0].length);
    if (/^,?\s*(with\b|y\b|R\b)/.test(rest)) continue; // "22 ÷ 8 = 2, with 6 left over", "13 ÷ 6 = 2 R 1"
    out.push({ left: m[1], right: Number(m[2]) });
  }
  return out;
}

describe("grades 3–5 math: every item", () => {
  it("has the shape the brief asks for, the same answer in both languages, and no false arithmetic", () => {
    for (const skill of MATH_3_5) {
      expect(skill.subject).toBe("math");
      expect(skill.content).toBe("computed");
      for (const level of levels(skill.id)) {
        const prompts = new Set<string>();
        for (const seed of SEEDS) {
          const [en, es] = LOCALES.map((l) => makeItem(skill.id, level, seed, l));
          const where = `${skill.id} L${level} seed ${seed}`;
          expect(es.answer, `${where} answer differs by language`).toEqual(en.answer);
          // Unit labels are translated ("ft" / "pies"); everything else in the picture must match.
          const shape = (it: Item) => (it.visual && "unit" in it.visual ? { ...it.visual, unit: "" } : it.visual);
          expect(shape(es), `${where} visual differs by language`).toEqual(shape(en));
          expect(es.choices?.length, where).toBe(en.choices?.length);
          prompts.add(JSON.stringify([en.prompt, en.visual]));
          for (const it of [en, es]) {
            expect(it.hints.length, `${where} hints`).toBe(3);
            expect(it.steps.length, `${where} steps`).toBeGreaterThanOrEqual(1);
            expect(it.steps.length, `${where} steps`).toBeLessThanOrEqual(4);
            const copy = [text(it), it.say, it.alt ?? "", ...it.hints, ...it.steps, ...(it.choices ?? []).map((c) => c.label)];
            for (const line of copy) expect(line, `${where} exclamation`).not.toMatch(/[!¡]/);
            const last = it.steps[it.steps.length - 1];
            if (!last.startsWith("=")) for (const h of it.hints) expect(h.includes(last), `${where} hint gives the final step: ${h}`).toBe(false);
            for (const line of [...it.hints, ...it.steps]) {
              for (const e of equations(line)) expect(close(shown(e.left), e.right), `${where} false equation "${line}"`).toBe(true);
            }
          }
        }
        expect(prompts.size, `${skill.id} L${level} variety`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("keeps fact practice fast", () => {
    for (const id of ["m.mult.easy", "m.mult.facts", "m.div.facts"])
      for (const level of levels(id))
        for (const { item } of items(id, level)) {
          expect(item.seconds).toBeGreaterThanOrEqual(4);
          expect(item.seconds).toBeLessThanOrEqual(6);
        }
  });
});

describe("m.mult.groups", () => {
  it("level 1: the answer is the number of dots in the picture", () => {
    for (const { item } of items("m.mult.groups", 1)) {
      const v = item.visual!;
      let count = 0;
      if (v.kind === "array") for (let row = 0; row < v.rows; row++) count += v.cols;
      else if (v.kind === "dots") for (const g of v.groups) count += g;
      else throw new Error(`unexpected visual ${v.kind}`);
      expect(numberOf(item.answer)).toBe(count);
      const [a, b] = /(\d+) × (\d+) = $/.exec(text(item))!.slice(1);
      expect(shown(`${a} × ${b}`)).toBe(count);
    }
  });
  it("level 2: the story's two numbers, added group by group", () => {
    for (const locale of LOCALES)
      for (const { item } of items("m.mult.groups", 2, locale)) {
        const n = ints(text(item));
        expect(n.length).toBe(2);
        let total = 0;
        for (let g = 0; g < n[0]; g++) total += n[1];
        expect(numberOf(item.answer)).toBe(total);
      }
  });
});

describe("multiplication and division facts", () => {
  const fact = /^(\d+) × (\d+) = $/;
  it("m.mult.easy: one factor is 0, 1, 2, 5 or 10", () => {
    for (const { item } of items("m.mult.easy", 1)) {
      const [a, b] = fact.exec(text(item))!.slice(1).map(Number);
      expect([a, b].some((f) => [0, 1, 2, 5, 10].includes(f))).toBe(true);
      expect(numberOf(item.answer)).toBe(shown(`${a} × ${b}`));
    }
  });
  it("m.mult.facts: ×3 ×4, then ×6–×9, then mixed to 10 × 10", () => {
    const want = [[3, 4], [6, 7, 8, 9]];
    for (const level of [1, 2, 3])
      for (const { item } of items("m.mult.facts", level)) {
        const [a, b] = fact.exec(text(item))!.slice(1).map(Number);
        if (level < 3) expect([a, b].some((f) => want[level - 1].includes(f))).toBe(true);
        expect(Math.max(a, b)).toBeLessThanOrEqual(10);
        expect(numberOf(item.answer)).toBe(shown(`${a} × ${b}`));
      }
  });
  it("m.div.facts: multiplying back gives the dividend", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.div.facts", level)) {
        const [n, d] = /^(\d+) ÷ (\d+) = $/.exec(text(item))!.slice(1).map(Number);
        const q = numberOf(item.answer);
        expect(q * d).toBe(n);
        expect(q).toBeLessThanOrEqual(10);
        if (level === 1) expect([2, 5, 10]).toContain(d);
      }
  });
});

describe("m.round", () => {
  it("is the nearest multiple, with halfway rounding up", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.round", level)) {
        const unit = level === 1 ? 10 : 100;
        const n = ints(text(item))[0];
        const got = numberOf(item.answer);
        expect(got % unit).toBe(0);
        const dist = Math.abs(got - n);
        expect(dist).toBeLessThanOrEqual(unit / 2);
        if (dist === unit / 2) expect(got).toBeGreaterThan(n);
        const v = item.visual!;
        if (v.kind !== "number-line") throw new Error("expected a number line");
        expect(v.marker).toBe(n);
        expect(v.min <= n && n <= v.max).toBe(true);
      }
  });
});

describe("fractions as numbers (grade 3)", () => {
  it("m.frac.unit: the answer names the shaded part of the bar", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.frac.unit", level)) {
        const v = item.visual!;
        if (v.kind !== "fraction") throw new Error("expected a fraction bar");
        const a = fractionOf(item.answer);
        expect(close(a.n / a.d, v.shaded / v.parts)).toBe(true);
        expect(check(item.answer, `${v.shaded * 2}/${v.parts * 2}`).correct).toBe(true);
        if (level === 1) expect(v.shaded).toBe(1);
        else expect(v.shaded).toBeGreaterThan(1);
      }
  });
  it("m.frac.numberline: the answer is where the dot sits, and nothing printed gives it away", () => {
    for (const level of [1, 2])
      for (const locale of LOCALES)
        for (const { item } of items("m.frac.numberline", level, locale)) {
          const v = item.visual!;
          if (v.kind !== "number-line") throw new Error("expected a number line");
          const a = fractionOf(item.answer);
          expect(close(a.n / a.d, v.marker!)).toBe(true);
          expect(v.max).toBe(level);
          expect(Number.isInteger(Math.round(v.marker! * v.denominator! * 1e9) / 1e9)).toBe(true);
          expect(v.marks).not.toContain(v.marker);
          expect(item.alt).not.toContain(`${a.n}/${a.d}`);
          expect(item.alt).not.toContain(answerText(item.answer));
        }
  });
});

describe("m.area.rect", () => {
  it("level 1: counting unit squares row by row", () => {
    for (const { item } of items("m.area.rect", 1)) {
      const v = item.visual!;
      if (v.kind !== "rect") throw new Error("expected a rectangle");
      let squares = 0;
      for (let row = 0; row < v.h; row++) for (let col = 0; col < v.w; col++) squares++;
      expect(numberOf(item.answer)).toBe(squares);
    }
  });
  it("level 2: perimeter is the four sides; a missing side times the known side is the area", () => {
    for (const locale of LOCALES)
      for (const { item } of items("m.area.rect", 2, locale)) {
        const v = item.visual;
        if (v?.kind === "rect") expect(numberOf(item.answer)).toBe([v.w, v.h, v.w, v.h].reduce((s, x) => s + x, 0));
        else {
          const [area, side] = ints(text(item));
          expect(numberOf(item.answer) * side).toBe(area);
        }
      }
  });
});

describe("m.mult.multi", () => {
  it("matches BigInt multiplication and the digit sizes for each level", () => {
    const sizes = [[2, 1], [3, 1], [2, 2]];
    for (const level of [1, 2, 3])
      for (const { item } of items("m.mult.multi", level)) {
        const v = item.visual!;
        if (v.kind !== "column") throw new Error("expected a column");
        expect(v.op).toBe("×");
        expect([String(v.top).length, String(v.bottom).length]).toEqual(sizes[level - 1]);
        expect(BigInt(numberOf(item.answer))).toBe(BigInt(v.top) * BigInt(v.bottom));
        expect(numberOf(item.answer)).toBe(shown(text(item).replace(" = ", "")));
      }
  });
});

describe("m.div.long", () => {
  it("quotient × divisor + remainder is the dividend", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.div.long", level)) {
        const [n, d] = /^(\d+) ÷ (\d+) = $/.exec(text(item))!.slice(1).map(Number);
        expect(n).toBeLessThanOrEqual(999);
        if (level === 1) {
          const q = numberOf(item.answer);
          expect(q * d).toBe(n);
          expect(q).toBeGreaterThanOrEqual(10);
        } else {
          const a = item.answer;
          if (a.kind !== "remainder") throw new Error("expected a remainder answer");
          expect(a.q * d + a.r).toBe(n);
          expect(a.r).toBeGreaterThan(0);
          expect(a.r).toBeLessThan(d);
          expect(check(a, `${a.q} R ${a.r}`).correct).toBe(true);
          expect(check(a, `${a.q} R ${a.r + 1}`)).toEqual({ correct: false, form: "remainder" });
        }
      }
  });
});

describe("m.factors", () => {
  it("level 1: exactly one choice divides the number, and it is the key", () => {
    for (const { item } of items("m.factors", 1)) {
      const N = ints(text(item))[0];
      const divides = item.choices!.filter((c) => N % Number(c.label) === 0).map((c) => c.label);
      expect(divides).toEqual([choiceLabel(item)]);
    }
  });
  it("level 2: primes by counting divisors; multiples by remainder", () => {
    for (const locale of LOCALES)
      for (const { item } of items("m.factors", 2, locale)) {
        const t = text(item);
        if (/prime|primo/.test(t)) {
          const N = ints(t)[0];
          expect(choiceLabel(item)).toBe(isPrime(N) ? (locale === "en" ? "prime" : "primo") : locale === "en" ? "composite" : "compuesto");
        } else {
          const k = ints(t)[0];
          const multiples = item.choices!.filter((c) => Number(c.label) % k === 0).map((c) => c.label);
          expect(multiples).toEqual([choiceLabel(item)]);
        }
      }
  });
  it("level 2 asks about both primes and composites", () => {
    const keys = new Set(items("m.factors", 2).filter(({ item }) => /prime/.test(text(item))).map(({ item }) => choiceLabel(item)));
    expect(keys).toEqual(new Set(["prime", "composite"]));
  });
});

describe("m.frac.equiv", () => {
  it("level 1: the filled-in fraction cross-multiplies to the given one", () => {
    for (const { item } of items("m.frac.equiv", 1)) {
      const [[a, b], [x, y]] = fracs(item);
      const ans = numberOf(item.answer);
      const [top, bottom] = x === "?" ? [ans, Number(y)] : [Number(x), ans];
      expect(Number(a) * bottom).toBe(Number(b) * top);
    }
  });
  it("level 2: simplest form, equal value, and the unsimplified fraction is not accepted", () => {
    for (const locale of LOCALES)
      for (const { item } of items("m.frac.equiv", 2, locale)) {
        const [[n, d]] = fracs(item).map(([p, q]) => [Number(p), Number(q)]);
        const a = fractionOf(item.answer);
        expect(a.simplest).toBe(true);
        expect(text(item)).toMatch(locale === "en" ? /simplest form/ : /forma más simple/);
        expect(a.n * d).toBe(a.d * n);
        expect(gcd(a.n, a.d)).toBe(1);
        expect(check(a, `${n}/${d}`)).toEqual({ correct: false, form: "simplest" });
      }
  });
});

describe("m.frac.compare", () => {
  it("the symbol matches a floating-point comparison", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.frac.compare", level)) {
        const [[a, b], [c, d]] = fracs(item).map(([p, q]) => [Number(p), Number(q)]);
        expect(choiceLabel(item)).toBe(cmpLabel(a / b - c / d));
        if (level === 1) expect(a === c || b === d).toBe(true);
        else expect(a !== c && b !== d).toBe(true);
      }
  });
  it("level 2 includes equal pairs", () => {
    expect(items("m.frac.compare", 2).some(({ item }) => choiceLabel(item) === "=")).toBe(true);
  });
});

describe("adding, subtracting and renaming fractions", () => {
  const sumOf = (it: Item) => {
    const [[a, b], [c, d]] = fracs(it).map(([p, q]) => [Number(p), Number(q)]);
    return { a, b, c, d, value: text(it).includes("+") ? a / b + c / d : a / b - c / d };
  };
  it("m.frac.addlike: the key equals the sum or difference", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.frac.addlike", level)) {
        const { b, d, value } = sumOf(item);
        const a = fractionOf(item.answer);
        expect(b).toBe(d);
        expect(close(a.n / a.d, value)).toBe(true);
        expect(value).toBeGreaterThan(0);
        if (level === 1) expect(value).toBeLessThan(1);
        else expect(value > 1 || text(item).includes("−")).toBe(true);
      }
  });
  it("m.frac.addunlike: the key equals the sum or difference, in simplest form", () => {
    for (const level of [1, 2])
      for (const locale of LOCALES)
        for (const { item } of items("m.frac.addunlike", level, locale)) {
          const { b, d, value } = sumOf(item);
          const a = fractionOf(item.answer);
          expect(close(a.n / a.d, value)).toBe(true);
          expect(value).toBeGreaterThan(0);
          expect(a.simplest).toBe(true);
          expect(gcd(a.n, a.d)).toBe(1);
          expect(text(item)).toMatch(locale === "en" ? /simplest form/ : /forma más simple/);
          expect(b).not.toBe(d);
          if (level === 1) expect(b % d === 0 || d % b === 0).toBe(true);
          else expect(b % d !== 0 && d % b !== 0).toBe(true);
          expect(check(a, `${a.n * 2}/${a.d * 2}`).correct).toBe(false);
        }
  });
  it("m.frac.mixed: the mixed number and the improper fraction are the same amount", () => {
    for (const { item } of items("m.frac.mixed", 1)) {
      const [[n, d]] = fracs(item).map(([p, q]) => [Number(p), Number(q)]);
      const a = item.answer;
      if (a.kind !== "text") throw new Error("expected a text answer");
      const typed = parseNumber(a.accept[0])!;
      expect(close(typed.value, n / d)).toBe(true);
      const [w, rest, den] = a.accept[0].match(/\d+/g)!.map(Number);
      expect(w).toBeGreaterThanOrEqual(1);
      expect(rest).toBeLessThan(den);
      expect(gcd(rest, den)).toBe(1);
      // The unconverted fraction is not an answer to "write as a mixed number".
      expect(check(a, `${n}/${d}`).correct).toBe(false);
      for (const t of [`${w} ${rest}/${den}`, `${w} y ${rest}/${den}`, `${w} and ${rest}/${den}`]) expect(check(a, t).correct).toBe(true);
    }
    for (const { item } of items("m.frac.mixed", 2)) {
      const w = Number(item.prompt.find((p) => typeof p === "string" && /^\d+$/.test(p)));
      const [[rest, d], [q, d2]] = fracs(item);
      expect(q).toBe("?");
      expect(d2).toBe(d);
      expect(close(numberOf(item.answer) / Number(d), w + Number(rest) / Number(d))).toBe(true);
    }
  });
});

describe("m.dec.tenths", () => {
  it("level 1: fraction and decimal name the same number", () => {
    for (const { item } of items("m.dec.tenths", 1)) {
      const [[n, den]] = fracs(item);
      if (n === "?") {
        const shownDecimal = Number(/^([\d.]+) = $/.exec(text(item))![1]);
        expect(close(numberOf(item.answer) / Number(den), shownDecimal)).toBe(true);
      } else {
        expect(close(numberOf(item.answer) * Number(den), Number(n))).toBe(true);
        expect(item.keys).toEqual(["."]);
      }
    }
  });
  it("level 2: the symbol matches comparing the numbers, and the 0.5-vs-0.45 trap appears", () => {
    let trap = 0;
    for (const { item } of items("m.dec.tenths", 2)) {
      const [x, y] = text(item).match(/\d+\.\d+/g)!;
      expect(choiceLabel(item)).toBe(cmpLabel(Number(x) - Number(y)));
      const longerIsSmaller = (x.length < y.length && Number(x) > Number(y)) || (y.length < x.length && Number(y) > Number(x));
      if (longerIsSmaller) trap++;
    }
    expect(trap).toBeGreaterThan(10);
  });
});

describe("multiplying and dividing fractions", () => {
  it("m.frac.mult: the key equals the product, in simplest form", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.frac.mult", level)) {
        const fs = fracs(item).map(([p, q]) => Number(p) / Number(q));
        const whole = ints(text(item).replace(/^[^.]*\./, ""));
        const product = level === 1 ? fs[0] * whole[0] : fs[0] * fs[1];
        if (level === 1) expect(whole.length).toBe(1);
        const a = fractionOf(item.answer);
        expect(close(a.n / a.d, product)).toBe(true);
        expect(a.simplest).toBe(true);
        expect(gcd(a.n, a.d)).toBe(1);
      }
  });
  it("m.frac.divunit: multiplying back gives the starting amount", () => {
    for (const locale of LOCALES)
      for (const { item } of items("m.frac.divunit", 1, locale)) {
        const [[one, b]] = fracs(item);
        expect(one).toBe(1);
        const w = ints(text(item));
        expect(w.length).toBe(1);
        if (item.answer.kind === "fraction") expect(close((item.answer.n / item.answer.d) * w[0], 1 / Number(b))).toBe(true);
        else expect(close(numberOf(item.answer) * (1 / Number(b)), w[0])).toBe(true);
      }
  });
});

describe("decimals (grade 5)", () => {
  /** "4.07" → 407 hundredths, read from the digits, not through floating point. */
  const hundredths = (s: string) => {
    const [whole, part = ""] = s.split(".");
    return Number(whole) * 100 + Number(part.padEnd(2, "0"));
  };
  it("m.dec.addsub: whole-hundredths arithmetic agrees with the key", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.dec.addsub", level)) {
        const [, a, op, b] = /^([\d.]+) ([+−]) ([\d.]+) = $/.exec(text(item))!;
        const cents = op === "+" ? hundredths(a) + hundredths(b) : hundredths(a) - hundredths(b);
        expect(cents).toBeGreaterThan(0);
        expect(Math.round(numberOf(item.answer) * 100)).toBe(cents);
        expect(close(numberOf(item.answer), op === "+" ? Number(a) + Number(b) : Number(a) - Number(b))).toBe(true);
        const places = (s: string) => (s.split(".")[1] ?? "").length;
        if (level === 1) expect(places(a)).toBe(places(b));
        else expect(places(a)).not.toBe(places(b));
        expect(item.keys).toEqual(["."]);
      }
  });
  it("m.dec.mult: the key equals the floating-point product", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.dec.mult", level)) {
        const [, a, b] = /^([\d.]+) × ([\d.]+) = $/.exec(text(item))!;
        expect(close(numberOf(item.answer), Number(a) * Number(b))).toBe(true);
        if (level === 1) expect([a, b].filter((s) => s.includes(".")).length).toBe(1);
        else expect([a, b].every((s) => /^\d+\.\d$/.test(s))).toBe(true);
      }
  });
  it("m.pow10: the key equals the number scaled by the power of ten", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.pow10", level)) {
        const [x, factor] = item.prompt.slice(0, 2);
        const [, value, op] = /^([\d.]+) ([×÷]) $/.exec(x as string)!;
        const f = typeof factor === "string" ? Number(factor) : "sup" in factor ? 10 ** Number(factor.sup[1]) : NaN;
        expect([10, 100, 1000]).toContain(f);
        const want = op === "×" ? Number(value) * f : Number(value) / f;
        expect(close(numberOf(item.answer), want)).toBe(true);
        expect(String(numberOf(item.answer)).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
        if (level === 1) expect(Number.isInteger(numberOf(item.answer)) && !value.includes(".")).toBe(true);
      }
  });
});

describe("m.order.ops", () => {
  it("the key equals the displayed expression, and every step keeps its value", () => {
    for (const level of [1, 2])
      for (const { item } of items("m.order.ops", level)) {
        const expr = text(item).replace(/ = $/, "");
        const value = numberOf(item.answer);
        expect(shown(expr)).toBe(value);
        expect(Number.isInteger(value) && value >= 0).toBe(true);
        expect(expr.includes("(")).toBe(level === 2);
        for (const step of item.steps.slice(1)) expect(shown(step.replace(/^= /, ""))).toBe(value);
      }
  });
});

describe("m.volume", () => {
  it("counting unit cubes layer by layer gives the key", () => {
    for (const { item } of items("m.volume", 1)) {
      const v = item.visual!;
      if (v.kind !== "prism") throw new Error("expected a prism");
      let cubes = 0;
      for (let layer = 0; layer < v.h; layer++) for (let row = 0; row < v.w; row++) cubes += v.l;
      expect(numberOf(item.answer)).toBe(cubes);
    }
  });
});
