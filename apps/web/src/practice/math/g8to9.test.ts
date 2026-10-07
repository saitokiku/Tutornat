import { describe, expect, it } from "vitest";
import { answerText, check } from "../answer";
import { equivalent, evaluate, isExpanded, isFactored, parse, type Node } from "../expr";
import { gcd } from "../rng";
import { makeItem } from "../skills";
import type { Item, MathPart } from "../types";
import { MATH_8_9 } from "./g8to9";

// Grades 8–9, checked from what the learner sees: every key is re-derived by a different route than
// the generator took (substitute the answer back, expand the factored form, evaluate the prompt itself,
// test inequality choices point by point). 250 seeds per level.

const SEEDS = Array.from({ length: 250 }, (_, i) => i * 7907 + 101);
const LOCALES = ["en", "es"] as const;

const ascii = (s: string) => s.replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/");
const SUP_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Display text with Unicode powers (steps, hints) to parser input: "3x² − 1" → "3x^(2) - 1". */
const fromShown = (s: string) =>
  ascii(s.replace(/⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^(${m.replace("⁻", "-").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUP_DIGITS.indexOf(c)))})`));
/** A prompt as one parser-ready string: { sup } → ^( ), the blank → "?". */
const mathText = (parts: MathPart[]) =>
  parts
    .map((p) => (typeof p === "string" ? p : "sup" in p ? (p.sup[0] === ")" ? `)^(${p.sup[1]})` : `(${p.sup[0]})^(${p.sup[1]})`) : "frac" in p ? `(${p.frac[0]})/(${p.frac[1]})` : "?"))
    .join("");
function node(src: string): Node {
  const n = parse(ascii(src));
  if (!n) throw new Error(`cannot parse "${src}"`);
  return n;
}
const val = (src: string, env: Record<string, number> = {}) => evaluate(node(src), env);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
/** Numeric equality where 0 and −0 are the same. */
const same = (a: number, b: number) => a === b;
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const num = (s: string) => Number(s.replace(/−/g, "-"));
const nums = (s: string) => (s.match(/−?\d+/g) ?? []).map(num);
const both = (s: string) => {
  const [l, r] = s.split("=");
  return [l, r] as const;
};

function each(id: string, level: number, fn: (item: Item, where: string) => void, locale: "en" | "es" = "en") {
  for (const seed of SEEDS) fn(makeItem(id, level, seed, locale), `${id} L${level} seed ${seed}`);
}

const IDS = [
  "m.exp.rules", "m.sqrt", "m.sci.notation", "m.eq.multistep", "m.slope", "m.linear.table", "m.pythag", "m.systems",
  "m.ineq.multistep", "m.poly.addsub", "m.poly.mult", "m.factor.tri", "m.quad.solve", "m.func.eval", "m.line.equation",
];

describe("grades 8–9 strand", () => {
  it("has the planned skills, in order, all computed math", () => {
    expect(MATH_8_9.map((s) => s.id)).toEqual(IDS);
    const seen = new Set<string>();
    for (const s of MATH_8_9) {
      expect(s.subject).toBe("math");
      expect(s.content).toBe("computed");
      expect(["8", "9"]).toContain(s.grade);
      for (const p of s.prereqs) if (IDS.includes(p)) expect(seen.has(p), `${s.id} needs ${p} first`).toBe(true);
      seen.add(s.id);
    }
  });

  describe.each(MATH_8_9.map((s) => [s.id, s] as const))("%s", (id, skill) => {
    it("has complete bilingual copy, a 3-step hint ladder that holds back the answer, and steps that end on it", () => {
      for (let level = 1; level <= skill.levels; level++) {
        for (const seed of SEEDS) {
          const [en, es] = LOCALES.map((l) => makeItem(id, level, seed, l));
          const where = `${id} L${level} seed ${seed}`;
          // Same problem in both languages.
          expect(es.answer, where).toEqual(en.answer);
          // Same picture; only a unit label may be translated (ft → pies).
          const noUnit = (v: Item["visual"]) => (v && "unit" in v ? { ...v, unit: "" } : v);
          expect(noUnit(es.visual), where).toEqual(noUnit(en.visual));
          expect(es.choices?.map((c) => c.label), where).toEqual(en.choices?.map((c) => c.label));
          expect(es.say, where).not.toBe(en.say);
          expect(es.hints[0], where).not.toBe(en.hints[0]);
          expect(es.hints[1], where).not.toBe(en.hints[1]);
          for (const item of [en, es]) {
            expect(item.hints, where).toHaveLength(3);
            expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
            expect(item.steps.length, where).toBeLessThanOrEqual(4);
            const spoken = [item.say, ...(item.choices ?? []).map((c) => c.say ?? "")];
            for (const s of spoken) expect(s, `${where} spoken notation: ${s}`).not.toMatch(/[\^{}√∛²³⁻×÷·≤≥<>=−]|\d\/\d/);
            const all = [...item.prompt.filter((p): p is string => typeof p === "string"), item.say, item.alt ?? "", ...item.hints, ...item.steps, ...spoken];
            for (const s of all) expect(s, `${where}: ${s}`).not.toMatch(/!|undefined|NaN|\s{4,}$/);
            if (item.choices) for (const c of item.choices) expect(c.label, where).not.toMatch(/undefined|NaN/);
          }
          const a = en.answer;
          const last = en.steps[en.steps.length - 1];
          const shown = (n: number) => (n < 0 ? `−${-n}` : String(n));
          if (a.kind === "number" || a.kind === "fraction") {
            const ans = a.kind === "number" ? shown(a.value) : a.d === 1 ? shown(a.n) : `${shown(a.n)}/${a.d}`;
            expect(last, `${where} last step`).toContain(ans);
            // A hint may set up the last step but never finish the arithmetic that lands on the answer.
            for (const h of en.hints) {
              const tail = new RegExp(`([^:=]*)= ${esc(ans)}\\.?$`).exec(h);
              expect(!!tail && !/[a-z]/i.test(tail[1]), `${where} hint finishes the arithmetic: ${h}`).toBe(false);
              if (["m.eq.multistep", "m.sqrt"].includes(id)) expect(h, `${where} hint gives the root`).not.toMatch(new RegExp(`(^|\\W)x = ${esc(ans)}($|[^\\w/])`));
            }
          } else if (a.kind === "choice") {
            const label = en.choices![a.index].label;
            expect(last, `${where} last step`).toContain(label);
            for (const h of en.hints) expect(h, `${where} hint gives the answer`).not.toMatch(new RegExp(`(^|[^\\d.])${esc(label)}($|[^\\d])`));
          } else if (a.kind === "set") {
            for (const v of a.values) expect(last, where).toContain(`x = ${shown(v)}`);
            for (const h of en.hints) expect(a.values.every((v) => h.includes(`x = ${shown(v)}`)), `${where} hint gives the answer`).toBe(false);
          } else if (a.kind === "pair") {
            expect(last, where).toContain(`(${shown(a.x)}, ${shown(a.y)})`);
            for (const h of en.hints) expect(h, where).not.toContain(`(${shown(a.x)}, ${shown(a.y)})`);
          } else if (a.kind === "expr") {
            const rhs = last.slice(last.lastIndexOf("=") + 1);
            expect(equivalent(node(fromShown(rhs)), node(a.expr)), `${where} last step ${last}`).toBe(true);
            for (const h of en.hints) {
              if (!h.includes("=")) continue;
              const hr = parse(fromShown(h.slice(h.lastIndexOf("=") + 1).replace(/\.$/, "")));
              if (hr) expect(equivalent(hr, node(a.expr)), `${where} hint gives the answer: ${h}`).toBe(false);
            }
          }
        }
      }
    });
  });
});

describe("m.exp.rules", () => {
  it("L1: the key is one power, equal to the expression in the prompt", () => {
    each("m.exp.rules", 1, (item, where) => {
      expect(item.answer.kind).toBe("expr");
      if (item.answer.kind !== "expr") return;
      expect(item.answer.expr, where).toMatch(/^\d*[a-z]\^\d+$/);
      expect(equivalent(node(mathText(item.prompt.slice(1))), node(item.answer.expr)), where).toBe(true);
    });
  });
  it("L2: the fraction equals the prompt evaluated directly, in lowest terms", () => {
    each("m.exp.rules", 2, (item, where) => {
      if (item.answer.kind !== "fraction") throw new Error(where);
      const { n, d } = item.answer;
      expect(d, where).toBeGreaterThan(0);
      expect(gcd(Math.abs(n), d), where).toBe(1);
      expect(close(val(mathText(item.prompt.slice(1))), n / d), `${where} ${mathText(item.prompt)}`).toBe(true);
    });
  });
});

describe("m.sqrt", () => {
  it("L1: squaring the key gives the number under the root", () => {
    each("m.sqrt", 1, (item, where) => {
      const n = num((item.prompt[1] as string).replace("√", ""));
      if (item.answer.kind !== "number") throw new Error(where);
      expect(item.answer.value, where).toBeGreaterThan(0);
      expect(item.answer.value ** 2, where).toBe(n);
    });
  });
  it("L2: cube roots cube back, and both square roots satisfy x² = p", () => {
    const kinds = new Set<string>();
    each("m.sqrt", 2, (item, where) => {
      const text = mathText(item.prompt.slice(1));
      const a = item.answer;
      if (text.startsWith("∛")) {
        kinds.add("cube");
        if (a.kind !== "number") throw new Error(where);
        expect(a.value ** 3, where).toBe(num(text.replace(/[∛()]/g, "")));
      } else {
        const [l, r] = both(text);
        if (a.kind === "set") {
          kinds.add("square");
          expect(new Set(a.values).size, where).toBe(2);
          for (const v of a.values) expect(same(val(l, { x: v }), val(r)), where).toBe(true);
          expect(check(a, String(Math.abs(a.values[0]))).correct, `${where} one root only`).toBe(false);
        } else if (a.kind === "number") {
          kinds.add("cube-eq");
          expect(same(val(l, { x: a.value }), val(r)), where).toBe(true);
        } else throw new Error(where);
      }
    });
    expect([...kinds].sort()).toEqual(["cube", "cube-eq", "square"]);
  });
});

const SUPER: Record<string, string> = { "⁻": "-", "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
function sciValue(label: string) {
  const m = /^(\d+(?:\.\d+)?) × 10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(label);
  if (!m) throw new Error(`not scientific: ${label}`);
  const coef = Number(m[1]), e = Number([...m[2]].map((c) => SUPER[c]).join(""));
  return { value: coef * 10 ** e, normal: coef >= 1 && coef < 10 };
}

describe("m.sci.notation", () => {
  for (const level of [1, 2]) {
    it(`L${level}: exactly the keyed choice is both equal in value and in scientific notation`, () => {
      each("m.sci.notation", level, (item, where) => {
        const target = level === 1 ? Number((item.prompt[1] as string).replace(/,/g, "")) : val(mathText(item.prompt.slice(1)));
        if (item.answer.kind !== "choice") throw new Error(where);
        const key = item.answer.index;
        expect(item.choices!.length, where).toBe(4);
        item.choices!.forEach((c, i) => {
          const s = sciValue(c.label);
          const right = close(s.value, target) && s.normal;
          expect(right, `${where} ${c.label} vs ${target}`).toBe(i === key);
        });
      });
    });
  }
});

describe("m.eq.multistep", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the key makes both sides equal, and it is the only solution`, () => {
      each("m.eq.multistep", level, (item, where) => {
        const [l, r] = both(item.prompt[1] as string);
        if (item.answer.kind !== "number") throw new Error(where);
        const x = item.answer.value;
        expect(Number.isInteger(x), where).toBe(true);
        expect(same(val(l, { x }), val(r, { x })), `${where} ${item.prompt[1]} at x = ${x}`).toBe(true);
        expect(same(val(l, { x: x + 1 }), val(r, { x: x + 1 })), `${where} not a single solution`).toBe(false);
        if (level === 2) expect(item.prompt[1], where).toMatch(/\d\(x/);
      });
    });
  }
});

describe("m.slope", () => {
  it("L1: rise over run from the pictured points, simplest form, and it matches the prompt", () => {
    let negative = 0;
    each("m.slope", 1, (item, where) => {
      if (item.visual?.kind !== "coord" || item.answer.kind !== "fraction") throw new Error(where);
      const [[x1, y1], [x2, y2]] = item.visual.points;
      const { n, d } = item.answer;
      expect(close((y2 - y1) / (x2 - x1), n / d), where).toBe(true);
      expect(d > 0 && gcd(Math.abs(n), d) === 1, where).toBe(true);
      for (const [x, y] of item.visual.points) expect(item.prompt[0], where).toContain(`(${x < 0 ? `−${-x}` : x}, ${y < 0 ? `−${-y}` : y})`);
      if (n < 0) negative++;
      const [ry, rx] = [Math.abs(y2 - y1), Math.abs(x2 - x1)];
      if (gcd(ry, rx) > 1) expect(check(item.answer, `${n < 0 ? "-" : ""}${ry}/${rx}`).form, `${where} unsimplified`).toBe("simplest");
    });
    expect(negative).toBeGreaterThan(50);
  });
  it("L2: every pair of table columns gives the same slope as the key", () => {
    each("m.slope", 2, (item, where) => {
      const m = /x: ([^.]+)\. y: ([^.]+)\./.exec(item.prompt[0] as string);
      if (!m || item.answer.kind !== "fraction") throw new Error(where);
      const xs = nums(m[1]), ys = nums(m[2]);
      const { n, d } = item.answer;
      expect(xs.length, where).toBe(4);
      for (let i = 1; i < 4; i++) expect(close((ys[i] - ys[0]) / (xs[i] - xs[0]), n / d), where).toBe(true);
      expect(gcd(Math.abs(n), d), where).toBe(1);
    });
  });
});

describe("m.linear.table", () => {
  it("the key is the rule evaluated at the asked x, and the shown table values follow the rule", () => {
    let tables = 0;
    each("m.linear.table", 1, (item, where) => {
      const text = mathText(item.prompt);
      const rule = /y = ([^.]+)\./.exec(text)![1];
      if (item.answer.kind !== "number") throw new Error(where);
      const want = item.answer.value;
      if (item.prompt.some((p) => typeof p === "object" && "blank" in p)) {
        tables++;
        const t = /x: (.+?)\s{2,}y: (.+)$/.exec(text)!;
        const xs = nums(t[1]), ys = t[2].split(", ");
        expect(ys.filter((y) => y === "?"), where).toHaveLength(1);
        ys.forEach((y, i) => expect(same(val(rule, { x: xs[i] }), y === "?" ? want : num(y)), `${where} column ${i}`).toBe(true));
      } else {
        const x = num(/x = (−?\d+)\?/.exec(text)![1]);
        expect(same(val(rule, { x }), want), where).toBe(true);
      }
    });
    expect(tables).toBeGreaterThan(50);
  });
});

describe("m.pythag", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the pictured sides with the key filled in satisfy a² + b² = c²`, () => {
      each("m.pythag", level, (item, where) => {
        if (item.visual?.kind !== "right-triangle" || item.answer.kind !== "number") throw new Error(where);
        const v = item.answer.value;
        const { a, b, c } = item.visual;
        expect([a, b, c].filter((s) => s === null), where).toHaveLength(1);
        expect(level === 1 ? c : b, where).toBeNull();
        const [A, B, C] = [a ?? v, b ?? v, c ?? v];
        expect(A * A + B * B, where).toBe(C * C);
        for (const s of [a, b, c]) if (s !== null) expect(item.prompt[0], where).toContain(String(s));
      });
    });
  }
});

describe("m.systems", () => {
  it("the pair satisfies both equations, and the system has exactly one solution", () => {
    each("m.systems", 1, (item, where) => {
      if (item.answer.kind !== "pair") throw new Error(where);
      const { x, y } = item.answer;
      expect(item.prompt[0], where).toContain("(x, y)");
      const rows = [item.prompt[1], item.prompt[3]].map((eq) => {
        const [l, r] = both(eq as string);
        const f = (px: number, py: number) => val(l, { x: px, y: py }) - val(r, { x: px, y: py });
        expect(same(f(x, y), 0), `${where} ${eq}`).toBe(true);
        return [f(1, 0) - f(0, 0), f(0, 1) - f(0, 0)];
      });
      expect(same(rows[0][0] * rows[1][1], rows[1][0] * rows[0][1]), `${where} parallel lines`).toBe(false);
      if (x !== y) expect(check(item.answer, `(${y}, ${x})`).correct, `${where} swapped`).toBe(false);
    });
  });
});

describe("m.ineq.multistep", () => {
  it("the keyed statement agrees with the inequality at every test point; each other choice fails somewhere", () => {
    let flipped = 0;
    each("m.ineq.multistep", 1, (item, where) => {
      const text = item.prompt[1] as string;
      const op = /[<>≤≥]/.exec(text)![0];
      const [l, r] = text.split(op);
      const holds = (a: number, b: number, o: string) => (o === "<" ? a < b : o === ">" ? a > b : o === "≤" ? a <= b : a >= b);
      const truth = (x: number) => holds(val(l, { x }), val(r, { x }), op);
      const parsed = item.choices!.map((c) => {
        const m = /^x ([<>≤≥]) (−?\d+)$/.exec(c.label)!;
        return { o: m[1], k: num(m[2]) };
      });
      const points = parsed.flatMap(({ k }) => [k - 3, k - 1, k - 0.5, k, k + 0.5, k + 1, k + 3]).concat([-100, 100]);
      if (item.answer.kind !== "choice") throw new Error(where);
      const key = item.answer.index;
      parsed.forEach(({ o, k }, i) => {
        const agrees = points.every((x) => holds(x, k, o) === truth(x));
        expect(agrees, `${where} ${text} vs ${item.choices![i].label}`).toBe(i === key);
      });
      if (item.steps.some((s) => /flip|invierte/.test(s))) flipped++;
    });
    expect(flipped).toBeGreaterThan(80);
  });
});

describe("polynomials", () => {
  for (const [id, levels] of [["m.poly.addsub", 1], ["m.poly.mult", 2]] as const) {
    for (let level = 1; level <= levels; level++) {
      it(`${id} L${level}: the key equals the prompt and is written out with no parentheses`, () => {
        each(id, level, (item, where) => {
          if (item.answer.kind !== "expr") throw new Error(where);
          const shown = mathText(item.prompt.slice(1));
          expect(item.answer.form, where).toBe("expanded");
          expect(isExpanded(item.answer.expr), where).toBe(true);
          expect(equivalent(node(shown), node(item.answer.expr)), `${where} ${shown} vs ${item.answer.expr}`).toBe(true);
          if (id === "m.poly.mult") expect(check(item.answer, ascii(shown)).correct, `${where} unexpanded accepted`).toBe(false);
        });
      });
    }
  }

  for (const level of [1, 2]) {
    it(`m.factor.tri L${level}: expanding the factored key gives the trinomial`, () => {
      each("m.factor.tri", level, (item, where) => {
        if (item.answer.kind !== "expr") throw new Error(where);
        const key = node(item.answer.expr);
        const tri = mathText(item.prompt.slice(1));
        expect(item.answer.form, where).toBe("factored");
        expect(isFactored(key), where).toBe(true);
        expect(equivalent(key, node(tri)), `${where} ${tri} vs ${item.answer.expr}`).toBe(true);
        expect(check(item.answer, answerText(item.answer)).correct, where).toBe(true);
        expect(check(item.answer, ascii(tri)).form, `${where} trinomial typed back`).toBe("factored");
        if (level === 1) expect(item.answer.expr, where).toMatch(/^\(x\+\d\)\(x\+\d\)$/);
        else expect(item.answer.expr, where).toContain("-");
      });
    });
  }
});

describe("m.quad.solve", () => {
  it("every key root satisfies the equation, and the count matches the discriminant", () => {
    let repeated = 0;
    each("m.quad.solve", 1, (item, where) => {
      if (item.answer.kind !== "set") throw new Error(where);
      const [l, r] = both(mathText(item.prompt.slice(1)));
      const f = (x: number) => val(l, { x }) - val(r, { x });
      for (const v of item.answer.values) {
        expect(Number.isInteger(v), where).toBe(true);
        expect(same(f(v), 0), `${where} root ${v}`).toBe(true);
      }
      const c = f(0), b = (f(1) - f(-1)) / 2, a = (f(1) + f(-1)) / 2 - c;
      const disc = b * b - 4 * a * c;
      expect(disc, where).toBeGreaterThanOrEqual(0);
      expect(new Set(item.answer.values).size, where).toBe(disc === 0 ? 1 : 2);
      if (disc === 0) repeated++;
      else expect(check(item.answer, String(item.answer.values[0])).correct, `${where} one root of two`).toBe(false);
    });
    expect(repeated).toBeGreaterThan(10);
  });
});

describe("m.func.eval", () => {
  for (const level of [1, 2]) {
    it(`L${level}: evaluating the shown function at the input gives the key`, () => {
      each("m.func.eval", level, (item, where) => {
        expect(item.prompt[0], where).toMatch(/^[fgh]\(x\) = $/);
        const body = mathText(item.prompt.slice(1, -1));
        const x = num(/\((−?\d+)\)\.$/.exec(item.prompt[item.prompt.length - 1] as string)![1]);
        if (item.answer.kind !== "number") throw new Error(where);
        expect(same(val(body, { x }), item.answer.value), `${where} ${body} at ${x}`).toBe(true);
        if (level === 2) expect(body, where).toContain("^(2)");
      });
    });
  }
});

describe("m.line.equation", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the key line passes through the given point(s) with the given slope`, () => {
      each("m.line.equation", level, (item, where) => {
        if (item.answer.kind !== "expr") throw new Error(where);
        const text = item.prompt[0] as string;
        const pts = [...text.matchAll(/\((−?\d+), (−?\d+)\)/g)].map((m) => [num(m[1]), num(m[2])]);
        expect(pts, where).toHaveLength(level);
        const line = node(item.answer.expr);
        for (const [x, y] of pts) expect(same(evaluate(line, { x }), y), `${where} ${item.answer.expr} at ${x}`).toBe(true);
        if (level === 1) expect(same(evaluate(line, { x: 1 }) - evaluate(line, { x: 0 }), num(/slope (−?\d+)/.exec(text)![1])), where).toBe(true);
        else {
          expect(item.visual?.kind === "coord" && item.visual.points, where).toEqual(pts);
          for (const [x, y] of pts) expect(Math.abs(x) <= 9 && Math.abs(y) <= 9, `${where} off the grid`).toBe(true);
        }
        expect(check(item.answer, `y = ${item.answer.expr}`).correct, where).toBe(true);
      });
    });
  }
});
