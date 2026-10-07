import { describe, expect, it } from "vitest";
import { answerText, check } from "../answer";
import { equivalent, evaluate, isExpanded, parse } from "../expr";
import { gcd } from "../rng";
import { makeItem } from "../skills";
import type { Item, MathPart } from "../types";
import { MATH_6_7 } from "./g6to7";

// Grades 6–7, checked by a different route than the generators use: every key is re-derived from what
// the learner sees (the prompt text, the picture), by substituting back, cross-multiplying, brute force
// or floating-point arithmetic on the shown numbers.

const SEEDS = Array.from({ length: 220 }, (_, i) => i * 104729 + 11);
const LOCALES = ["en", "es"] as const;

/** The prompt as plain text a parser can read: stacked fractions as (n)/(d), powers as (b)^(e), the blank as "?". */
const text = (parts: MathPart[]) =>
  parts.map((p) => (typeof p === "string" ? p : "frac" in p ? `(${p.frac[0]})/(${p.frac[1]})` : "sup" in p ? `(${p.sup[0]})^(${p.sup[1]})` : "?")).join("");
const ascii = (s: string) => s.replace(/[−–]/g, "-");
const nums = (s: string) => (ascii(s).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

function value(item: Item): number {
  if (item.answer.kind !== "number") throw new Error(`expected a number answer, got ${item.answer.kind}`);
  return item.answer.value;
}
function chosen(item: Item): string {
  if (item.answer.kind !== "choice") throw new Error("expected a choice answer");
  return item.choices![item.answer.index].label;
}
function at(src: string, env: Record<string, number>): number {
  const node = parse(src);
  if (!node) throw new Error(`cannot parse ${src}`);
  return evaluate(node, env);
}
/** The one single-letter unknown in an expression. */
const unknown = (src: string) => (ascii(src).replace(/sqrt|pi/g, "").match(/[a-z]/i) ?? ["x"])[0].toLowerCase();

/** Fraction operands in display order; a whole number just before a fraction makes it a mixed number. */
function fracOperands(parts: MathPart[]): number[] {
  const out: number[] = [];
  parts.forEach((p, i) => {
    if (typeof p === "object" && "frac" in p) {
      const prev = parts[i - 1];
      const whole = typeof prev === "string" && /^\d+$/.test(prev) ? Number(prev) : 0;
      out.push(whole + Number(p.frac[0]) / Number(p.frac[1]));
    }
  });
  return out;
}

/** Solves "lhs = rhs" (as shown after "Solve: ") at the key, and checks the key is the only solution nearby. */
function checkEquation(item: Item, where: string) {
  const eq = text(item.prompt).replace(/^(Solve|Resuelve): /, "");
  const [lhs, rhs] = eq.split(" = ");
  const v = unknown(eq);
  const x = value(item);
  expect(Number.isInteger(x), where).toBe(true);
  expect(near(at(lhs, { [v]: x }), at(rhs, { [v]: x })), `${where}: ${eq} at ${v} = ${x}`).toBe(true);
  expect(near(at(lhs, { [v]: x + 1 }), at(rhs, { [v]: x + 1 })), `${where}: ${eq} also true at ${x + 1}`).toBe(false);
}

const OPS: Record<string, (a: number, b: number) => boolean> = {
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  "≥": (a, b) => a >= b,
  "≤": (a, b) => a <= b,
};

type Verify = (item: Item, level: number, where: string) => void;

const VERIFY: Record<string, Verify> = {
  "m.frac.div": (item, _l, where) => {
    const a = item.answer;
    if (a.kind !== "fraction") throw new Error(where);
    const ops = fracOperands(item.prompt);
    expect(ops.length, where).toBe(2);
    expect(Math.abs(a.n / a.d - ops[0] / ops[1]), where).toBeLessThan(1e-9);
    expect(gcd(a.n, a.d), `${where} not reduced`).toBe(1);
    expect(a.simplest, where).toBe(true);
    // The same amount, unreduced, is flagged as "not simplest", not accepted.
    expect(check(a, `${a.n * 2}/${a.d * 2}`), where).toEqual({ correct: false, form: "simplest" });
  },

  "m.gcf.lcm": (item, level, where) => {
    const [a, b] = nums(text(item.prompt));
    expect(nums(text(item.prompt)).length, where).toBe(2);
    if (level === 1) {
      let g = 1;
      for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) g = d;
      expect(value(item), where).toBe(g);
    } else {
      let m = Math.max(a, b);
      while (m % a || m % b) m++;
      expect(value(item), where).toBe(m);
    }
  },

  "m.ratio.equiv": (item, level, where) => {
    const t = text(item.prompt);
    const x = value(item);
    if (level === 1) {
      const m = /^(\d+) : (\d+) = (\d+|\?) : (\d+|\?)$/.exec(t);
      expect(m, `${where} ${t}`).not.toBeNull();
      const [a, b] = [Number(m![1]), Number(m![2])];
      const c = m![3] === "?" ? x : Number(m![3]), d = m![4] === "?" ? x : Number(m![4]);
      expect(a * d, where).toBe(b * c);
    } else {
      const [A, B, C] = nums(t);
      expect(A * x, where).toBe(B * C);
      expect(Number.isInteger(C / A), `${where} needs no simpler ratio`).toBe(false);
    }
  },

  "m.ratio.unit": (item, _l, where) => {
    const t = text(item.prompt);
    const price = /\$(\d+(?:\.\d\d)?)/.exec(t);
    const total = price ? Math.round(Number(price[1]) * 100) : Number(nums(t)[0]) * 100;
    const count = price ? nums(t.replace(price[0], ""))[0] : nums(t)[1];
    const cents = Math.round(value(item) * 100);
    expect(near(cents, value(item) * 100), `${where} not whole cents`).toBe(true);
    expect(cents * count, `${where} ${t}`).toBe(total);
    if (!Number.isInteger(value(item))) expect(item.keys, where).toContain(".");
  },

  "m.percent": (item, level, where) => {
    const t = text(item.prompt);
    const pct = /(\d+)%/.exec(t);
    const x = value(item);
    if (level === 1 || pct) {
      const p = Number(pct![1]);
      const other = nums(t.replace(pct![0], ""))[0];
      // Level 1: x is p% of the other number. Level 2: the other number is p% of x.
      if (level === 1) expect(x * 100, `${where} ${t}`).toBe(p * other);
      else expect(other * 100, `${where} ${t}`).toBe(p * x);
    } else {
      const [part, whole] = nums(t).sort((a, b) => a - b);
      expect(part * 100, `${where} ${t}`).toBe(x * whole);
    }
  },

  "m.int.numberline": (item, level, where) => {
    const t = ascii(text(item.prompt));
    if (item.answer.kind === "choice") {
      if (level === 1) {
        const [a, b] = nums(t);
        expect(chosen(item), where).toBe(a < b ? "<" : a > b ? ">" : "=");
      } else {
        const sizes = item.choices!.map((c) => Math.abs(nums(c.label)[0]));
        expect(Math.abs(nums(chosen(item))[0]), where).toBe(Math.max(...sizes));
        expect(new Set(sizes).size, where).toBe(sizes.length);
      }
      return;
    }
    const x = value(item);
    if (item.visual?.kind === "number-line" && item.visual.marker !== undefined) {
      expect(x, where).toBe(item.visual.marker);
      expect(item.visual.marks, `${where} the dot sits on a label`).not.toContain(x);
      expect(item.alt, `${where} alt gives it away`).not.toMatch(new RegExp(`(^|[^\\d−])${show(x)}(?!\\d)`));
      return;
    }
    const n = nums(t)[0];
    if (/opposite|opuesto|^-\(/.test(t)) expect(x, `${where} ${t}`).toBe(-n);
    else expect(x, `${where} ${t}`).toBe(Math.abs(n));
  },

  "m.exp.whole": (item, _l, where) => {
    const sup = item.prompt.find((p): p is { sup: [string, string] } => typeof p === "object" && "sup" in p)!;
    let product = 1;
    for (let i = 0; i < Number(sup.sup[1]); i++) product *= Number(sup.sup[0]);
    expect(value(item), where).toBe(product);
    expect(Number(sup.sup[1]), where).toBeGreaterThanOrEqual(2);
  },

  "m.expr.eval": (item, _l, where) => {
    const m = /^(?:If|Si) ([a-z]) = (\d+), (.+) = \?$/.exec(text(item.prompt));
    expect(m, `${where} ${text(item.prompt)}`).not.toBeNull();
    const got = at(m![3], { [m![1]]: Number(m![2]) });
    expect(near(got, value(item)), `${where} ${m![3]}`).toBe(true);
    expect(Number.isInteger(value(item)) && value(item) >= 0, where).toBe(true);
  },

  "m.eq.onestep": (item, _l, where) => {
    checkEquation(item, where);
    expect(value(item), `${where} whole-number solution`).toBeGreaterThanOrEqual(0);
  },

  "m.area.poly": (item, level, where) => {
    const t = text(item.prompt);
    const x = value(item);
    if (level === 1) {
      if (item.visual?.kind !== "triangle") throw new Error(`${where} no triangle`);
      expect(x * 2, where).toBe(item.visual.base * item.visual.height);
      expect(nums(t).slice(0, 2), where).toEqual([item.visual.base, item.visual.height]);
      return;
    }
    const n = nums(t);
    if (/parallelogram|paralelogramo/.test(t)) {
      const [b, slant, h] = n;
      expect(x, where).toBe(b * h);
      expect(slant, where).toBeGreaterThan(h);
    } else if (/trapezoid|trapecio/.test(t)) {
      // A rectangle on the short side plus a triangle on the overhang.
      const [b1, b2, h] = n;
      expect(x, where).toBe(Math.min(b1, b2) * h + (Math.abs(b2 - b1) * h) / 2);
    } else if (/on top|encima/.test(t)) {
      const [w, h1, h2] = n;
      expect(x, where).toBe(w * h1 + (w * h2) / 2);
    } else {
      // A cut corner leaves an L: split it into two rectangles instead of subtracting.
      const [W, H, cw, ch] = n;
      expect(x, where).toBe(W * (H - ch) + (W - cw) * ch);
    }
    expect(Number.isInteger(x), where).toBe(true);
  },

  "m.int.addsub": (item, _l, where) => {
    const t = ascii(text(item.prompt));
    if (/°F/.test(t)) {
      const [hi, lo] = nums(t);
      expect(value(item), where).toBe(hi - lo);
      return;
    }
    expect(at(t.replace(/ = \?$/, ""), {}), `${where} ${t}`).toBe(value(item));
    expect(nums(t).some((n) => n < 0) || value(item) < 0, `${where} no negative`).toBe(true);
  },

  "m.int.multdiv": (item, _l, where) => {
    const t = ascii(text(item.prompt)).replace(/ = \?$/, "");
    expect(at(t, {}), `${where} ${t}`).toBe(value(item));
    if (t.includes("÷")) {
      const [n, d] = nums(t);
      expect(value(item) * d, where).toBe(n);
    }
  },

  "m.expr.simplify": (item, _l, where) => {
    const shown = text(item.prompt).replace(/^(Simplify|Simplifica): /, "");
    if (item.answer.kind !== "expr") throw new Error(where);
    const want = item.answer.expr;
    expect(equivalent(parse(shown)!, parse(want)!), `${where} ${shown} vs ${want}`).toBe(true);
    expect(isExpanded(want), where).toBe(true);
    const termsIn = (s: string) => ascii(s).replace(/^-/, "").split(/ [+-] /).length;
    expect(termsIn(want), `${where} ${want}`).toBeLessThanOrEqual(2);
    expect(termsIn(shown) > termsIn(want) || shown.includes("("), `${where} already simple`).toBe(true);
    expect(item.answer.form, where).toBe("expanded");
    expect(check(item.answer, `${want} + 1`).correct, where).toBe(false);
  },

  "m.eq.twostep": (item, level, where) => {
    checkEquation(item, where);
    if (level === 2) expect(nums(text(item.prompt)).some((n) => n < 0) || value(item) < 0, `${where} no negative`).toBe(true);
  },

  "m.proportion": (item, level, where) => {
    const x = value(item);
    if (level === 1) {
      const fr = item.prompt.filter((p): p is { frac: [number | string, number | string] } => typeof p === "object" && "frac" in p);
      const [[a, b], [c, d]] = fr.map((f) => f.frac.map((v) => (v === "x" ? x : Number(v))));
      expect(a * d, where).toBe(b * c);
      expect(fr.flatMap((f) => f.frac).filter((v) => v === "x").length, where).toBe(1);
    } else {
      const [A, B, C] = nums(text(item.prompt));
      expect(A * x, `${where} ${text(item.prompt)}`).toBe(B * C);
    }
    expect(Number.isInteger(x) && x > 0, where).toBe(true);
  },

  "m.percent.change": (item, level, where) => {
    const t = text(item.prompt);
    const x = value(item);
    if (level === 1) {
      const price = Number(/\$(\d+)/.exec(t)![1]);
      const p = Number(/(\d+)%/.exec(t)![1]);
      const down = /off|descuento/.test(t);
      expect(Math.abs(x - price * (1 + (down ? -p : p) / 100)), `${where} ${t}`).toBeLessThan(1e-9);
      expect(near(Math.round(x * 100), x * 100), `${where} not whole cents`).toBe(true);
      expect(item.keys, where).toContain(".");
    } else {
      const [from, to] = nums(t);
      const up = /increase|aumento/.test(t);
      expect(up, where).toBe(to > from);
      expect(near(x, (Math.abs(to - from) / from) * 100), `${where} ${t}`).toBe(true);
    }
  },

  "m.ineq.onestep": (item, level, where) => {
    const m = /(?:of|de) (.+)\?$/.exec(ascii(text(item.prompt)));
    expect(m, where).not.toBeNull();
    const [lhs, op, rhs] = m![1].split(/ ([<>≤≥]) /);
    const truth = (t: number) => OPS[op](at(lhs, { x: t }), at(rhs, { x: t }));
    const holds = (label: string) => {
      const [, o, k] = /^x ([<>≤≥]) (-?\d+)$/.exec(ascii(label))!;
      return (t: number) => OPS[o](t, Number(k));
    };
    // Every half step from −80 to 80, which covers every boundary (|k| ≤ 48) with room on both sides.
    const grid = Array.from({ length: 321 }, (_, i) => -80 + i * 0.5);
    const right = holds(chosen(item));
    for (const t of grid) expect(right(t), `${where} ${m![1]} at x = ${t}`).toBe(truth(t));
    for (const c of item.choices!) if (c.label !== chosen(item)) expect(grid.some((t) => holds(c.label)(t) !== truth(t)), `${where} ${c.label} is also right`).toBe(true);
    if (level === 2 && /^-\d+x|^-\(x\)/.test(lhs)) {
      // The classic mistake (not flipping) must be offered.
      const flipped = { ">": "<", "<": ">", "≥": "≤", "≤": "≥" }[ascii(chosen(item)).split(" ")[1]]!;
      expect(item.choices!.map((c) => c.label), where).toContain(chosen(item).replace(/[<>≤≥]/, flipped));
    }
  },

  "m.circle": (item, level, where) => {
    if (item.visual?.kind !== "circle") throw new Error(`${where} no circle`);
    const r = item.visual.r;
    const x = value(item);
    const approx = level === 1 ? 3.14 * 2 * r : 3.14 * r * r;
    const exact = level === 1 ? Math.PI * 2 * r : Math.PI * r * r;
    expect(Math.abs(x - approx), where).toBeLessThan(1e-9);
    expect(Math.abs(x - exact) / exact, where).toBeLessThan(0.001);
    expect(text(item.prompt), where).toContain("3.14");
    expect(nums(text(item.prompt))[0], where).toBe(item.visual.show === "d" ? 2 * r : r);
    if (item.answer.kind === "number") expect(item.answer.tolerance, where).toBe(0.05);
  },
};

const show = (n: number) => (n < 0 ? `−${-n}` : String(n));

const TABLE: [string, string, string, string[], number][] = [
  ["m.frac.div", "6", "6.NS.A.1", ["m.frac.mult", "m.frac.divunit"], 2],
  ["m.gcf.lcm", "6", "6.NS.B.4", ["m.factors"], 2],
  ["m.ratio.equiv", "6", "6.RP.A.3", ["m.frac.equiv"], 2],
  ["m.ratio.unit", "6", "6.RP.A.2", ["m.div.long", "m.dec.mult"], 2],
  ["m.percent", "6", "6.RP.A.3c", ["m.dec.mult", "m.ratio.equiv"], 2],
  ["m.int.numberline", "6", "6.NS.C.6", ["m.compare.100"], 2],
  ["m.exp.whole", "6", "6.EE.A.1", ["m.mult.facts"], 1],
  ["m.expr.eval", "6", "6.EE.A.2c", ["m.order.ops", "m.exp.whole"], 2],
  ["m.eq.onestep", "6", "6.EE.B.7", ["m.expr.eval", "m.missing.addend"], 2],
  ["m.area.poly", "6", "6.G.A.1", ["m.area.rect"], 2],
  ["m.int.addsub", "7", "7.NS.A.1", ["m.int.numberline"], 2],
  ["m.int.multdiv", "7", "7.NS.A.2", ["m.int.addsub", "m.mult.facts"], 1],
  ["m.expr.simplify", "7", "7.EE.A.1", ["m.expr.eval", "m.int.addsub"], 2],
  ["m.eq.twostep", "7", "7.EE.B.4a", ["m.eq.onestep", "m.int.multdiv"], 2],
  ["m.proportion", "7", "7.RP.A.2", ["m.ratio.equiv", "m.eq.onestep"], 2],
  ["m.percent.change", "7", "7.RP.A.3", ["m.percent"], 2],
  ["m.ineq.onestep", "7", "7.EE.B.4b", ["m.eq.onestep", "m.int.multdiv"], 2],
  ["m.circle", "7", "7.G.B.4", ["m.dec.mult"], 2],
];

describe("grades 6–7 math strand", () => {
  it("matches the skill table, in teaching order", () => {
    expect(MATH_6_7.map((s) => [s.id, s.grade, s.standard, s.prereqs, s.levels])).toEqual(TABLE);
    for (const s of MATH_6_7) expect([s.subject, s.content], s.id).toEqual(["math", "computed"]);
  });

  it("has an independent check for every skill", () => {
    expect(Object.keys(VERIFY).sort()).toEqual(MATH_6_7.map((s) => s.id).sort());
  });

  describe.each(MATH_6_7.map((s) => [s.id, s] as const))("%s", (id, skill) => {
    it(`keys survive an independent check (${SEEDS.length} seeds per level, both languages)`, () => {
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of SEEDS)
          for (const locale of LOCALES) {
            const item = makeItem(id, level, seed, locale);
            VERIFY[id](item, level, `${id} L${level} seed ${seed} ${locale}`);
          }
    });

    it("follows the copy rules and asks the same problem in both languages", () => {
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of SEEDS) {
          const [en, es] = LOCALES.map((l) => makeItem(id, level, seed, l));
          const where = `${id} L${level} seed ${seed}`;
          expect(es.answer, `${where} answer differs by language`).toEqual(en.answer);
          expect(es.choices?.map((c) => c.label), where).toEqual(en.choices?.map((c) => c.label));
          expect(es.say, `${where} Spanish say missing`).not.toBe(en.say);
          expect(es.hints[1], `${where} Spanish hint missing`).not.toBe(en.hints[1]);
          for (const item of [en, es]) {
            expect(item.hints.length, where).toBe(3);
            expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
            expect(item.steps.length, where).toBeLessThanOrEqual(4);
            for (const s of [...item.hints, ...item.steps]) expect(s.trim(), where).not.toBe("");
            const copy = [item.say, item.alt ?? "", ...item.hints, ...item.steps, ...item.prompt.filter((p): p is string => typeof p === "string")];
            for (const s of copy) expect(s, `${where} exclamation or praise`).not.toMatch(/!|great job|good job|awesome|¡/i);
            // Read-aloud is speech: no symbols a voice would spell out.
            expect(item.say, `${where} say has symbols: ${item.say}`).not.toMatch(/[−×÷$|²³π%^{}/]|\d\/\d|°/);
            // The hint ladder never states the final answer as its last step.
            const key = answerText(item.answer, item.choices);
            expect(item.hints[2].endsWith(`= ${key}`) || item.hints[2].endsWith(`= ${key}.`), `${where} hint gives ${key}`).toBe(false);
            if (item.answer.kind === "number" && item.input === "keypad") {
              if (item.answer.value < 0) expect(item.keys, `${where} needs the minus key`).toContain("-");
              if (!Number.isInteger(item.answer.value)) expect(item.keys, `${where} needs the decimal key`).toContain(".");
            }
            expect(item.seconds, where).toBeGreaterThanOrEqual(8);
            expect(item.seconds, where).toBeLessThanOrEqual(90);
          }
        }
    });
  });
});
