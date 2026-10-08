import { describe, expect, it } from "vitest";
import { check } from "../answer";
import { equivalent, evaluate, parse, type Node } from "../expr";
import { gcd } from "../rng";
import { makeItem } from "../skills";
import type { Item, MathPart } from "../types";
import { MATH_8_9_MORE } from "./g8to9-more";

// Grades 8–9, second strand, checked from what the learner sees. Every key is re-derived by a route the
// generator does not take: geometry by rotation matrices, volumes in floating point, roots by brute-force
// search, sequences by repeated addition or multiplication, growth by compounding year by year, lines by
// substituting points, and every distractor is shown to be wrong. 250 seeds per level, both languages.

const SEEDS = Array.from({ length: 250 }, (_, i) => i * 7907 + 101);
const LOCALES = ["en", "es"] as const;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ascii = (s: string) => s.replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/");
const SUP_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Display text with Unicode powers to parser input: "3x² − 1" → "3x^(2) - 1". */
const fromShown = (s: string) =>
  ascii(s.replace(/⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^(${m.replace("⁻", "-").replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => String(SUP_DIGITS.indexOf(c)))})`));
/** A prompt as one string: { sup } → ^( ), { frac } → ( )/( ). */
const mathText = (parts: MathPart[]) =>
  parts
    .map((p) => (typeof p === "string" ? p : "sup" in p ? (p.sup[0] === ")" ? `)^(${p.sup[1]})` : `(${p.sup[0]})^(${p.sup[1]})`) : "frac" in p ? `(${p.frac[0]})/(${p.frac[1]})` : "?"))
    .join("");
function node(src: string): Node {
  const n = parse(fromShown(src));
  if (!n) throw new Error(`cannot parse "${src}"`);
  return n;
}
const val = (src: string, env: Record<string, number> = {}) => evaluate(node(src), env);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const num = (s: string) => Number(s.replace(/−/g, "-"));
const nums = (s: string) => (s.match(/−?\d+(?:\.\d+)?/g) ?? []).map(num);
const shown = (n: number) => (n < 0 ? `−${-n}` : String(n));
const isSquare = (n: number) => {
  for (let i = 0; i * i <= n; i++) if (i * i === n) return true;
  return false;
};
const squareFree = (k: number) => {
  for (let i = 2; i * i <= k; i++) if (k % (i * i) === 0) return false;
  return true;
};

function each(id: string, level: number, fn: (item: Item, where: string) => void, locale: "en" | "es" = "en") {
  for (const seed of SEEDS) fn(makeItem(id, level, seed, locale), `${id} L${level} seed ${seed}`);
}
const keyLabel = (item: Item) => {
  if (item.answer.kind !== "choice") throw new Error("not a choice item");
  return item.choices![item.answer.index].label;
};
const text = (item: Item) => mathText(item.prompt);

const IDS = [
  "m.irrational", "m.transform", "m.angles.triangle", "m.volume.round", "m.func.identify", "m.linear.compare", "m.best.fit", "m.eq.solutions",
  "m.abs.equation", "m.line.forms", "m.systems.elim", "m.domain.range", "m.rate.change", "m.sequences", "m.exp.growth", "m.radical.simplify", "m.quad.vertex", "m.quad.formula",
];
/** Skills whose choice labels are words, so they are translated. */
const WORD_LABELS = new Set(["m.func.identify", "m.linear.compare", "m.best.fit", "m.eq.solutions", "m.abs.equation"]);
/** Skills whose hints must name both options (two people or two functions), so a label may appear in a hint. */
const NAMES_IN_HINTS = new Set(["m.linear.compare"]);

describe("grades 8–9 second strand", () => {
  it("has the planned skills, in order, all computed math with real standards", () => {
    expect(MATH_8_9_MORE.map((s) => s.id)).toEqual(IDS);
    const seen = new Set<string>();
    for (const s of MATH_8_9_MORE) {
      expect(s.subject).toBe("math");
      expect(s.content).toBe("computed");
      expect(["8", "9"]).toContain(s.grade);
      expect(s.standard, s.id).toMatch(/^(8\.(NS|EE|F|G|SP)\.[A-C]\.\d+[a-z]?|[ANF]-[A-Z]{2,3}\.[A-D]\.\d+[a-z]?)$/);
      for (const p of s.prereqs) if (IDS.includes(p)) expect(seen.has(p), `${s.id} needs ${p} first`).toBe(true);
      seen.add(s.id);
    }
    expect(MATH_8_9_MORE.filter((s) => s.grade === "8")).toHaveLength(8);
    expect(MATH_8_9_MORE.filter((s) => s.grade === "9")).toHaveLength(10);
  });

  describe.each(MATH_8_9_MORE.map((s) => [s.id, s] as const))("%s", (id, skill) => {
    it("has complete bilingual copy, tagged mistakes, a hint ladder that holds back the answer, and steps that end on it", () => {
      for (let level = 1; level <= skill.levels; level++) {
        let withWrong = 0, typed = 0;
        for (const seed of SEEDS) {
          const [en, es] = LOCALES.map((l) => makeItem(id, level, seed, l));
          const where = `${id} L${level} seed ${seed}`;
          // Same problem in both languages; only a unit label may be translated.
          expect(es.answer, where).toEqual(en.answer);
          const noUnit = (v: Item["visual"]) => (v && "unit" in v ? { ...v, unit: "" } : v);
          expect(noUnit(es.visual), where).toEqual(noUnit(en.visual));
          expect(es.pad, where).toEqual(en.pad);
          expect(es.wrong, where).toEqual(en.wrong);
          expect(es.choices?.length, where).toBe(en.choices?.length);
          if (!WORD_LABELS.has(id)) expect(es.choices?.map((c) => c.label), where).toEqual(en.choices?.map((c) => c.label));
          expect(es.choices?.map((c) => c.why), where).toEqual(en.choices?.map((c) => c.why));
          expect(es.say, where).not.toBe(en.say);
          expect(es.hints[0], where).not.toBe(en.hints[0]);
          expect(es.hints[1], where).not.toBe(en.hints[1]);
          for (const item of [en, es]) {
            expect(item.hints, where).toHaveLength(3);
            expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
            expect(item.steps.length, where).toBeLessThanOrEqual(4);
            const spoken = [item.say, ...(item.choices ?? []).map((c) => c.say ?? "")];
            for (const s of spoken) expect(s, `${where} spoken notation: ${s}`).not.toMatch(/[\^{}√∛²³⁻×÷·≤≥<>=−|°∠ₙ]|\d\/\d/);
            const all = [...item.prompt.filter((p): p is string => typeof p === "string"), item.say, item.alt ?? "", ...item.hints, ...item.steps, ...spoken];
            for (const s of all) expect(s, `${where}: ${s}`).not.toMatch(/!|undefined|NaN|Infinity|\s{4,}$|\s\s[.,?]/);
            if (item.visual || item.picture) expect(item.alt?.trim(), where).toBeTruthy();
          }
          // Rule 16: every wrong choice names its mistake; likely wrong typed values are tagged and rejected.
          if (en.answer.kind === "choice") {
            en.choices!.forEach((c, i) => {
              if (i === (en.answer as { index: number }).index) expect(c.why, `${where} key has a tag`).toBeUndefined();
              else expect(c.why ?? "", `${where} untagged choice ${c.label}`).toMatch(KEBAB);
            });
            expect(en.wrong, where).toBeUndefined();
          } else {
            typed++;
            expect(Array.isArray(en.wrong), `${where} wrong list`).toBe(true);
            if (en.wrong!.length) withWrong++;
            for (const w of en.wrong!) {
              expect(w.why, where).toMatch(KEBAB);
              expect(check(en.answer, w.value).correct, `${where} wrong value ${w.value} is accepted`).toBe(false);
            }
            expect(new Set(en.wrong!.map((w) => w.value)).size, where).toBe(en.wrong!.length);
          }
          const a = en.answer;
          const last = en.steps[en.steps.length - 1];
          if (a.kind === "number" || a.kind === "fraction") {
            const ans = a.kind === "number" ? shown(a.value) : a.d === 1 ? shown(a.n) : `${shown(a.n)}/${a.d}`;
            expect(last, `${where} last step`).toContain(ans);
            for (const h of en.hints) {
              const tail = new RegExp(`([^:=]*)= ${esc(ans)}\\.?$`).exec(h);
              expect(!!tail && !/[a-z]/i.test(tail[1]), `${where} hint finishes the arithmetic: ${h}`).toBe(false);
            }
          } else if (a.kind === "choice") {
            const label = en.choices![a.index].label;
            expect(last, `${where} last step`).toContain(label);
            if (!NAMES_IN_HINTS.has(id)) for (const h of en.hints) expect(h, `${where} hint gives the answer`).not.toMatch(new RegExp(`(^|[^\\d.√])${esc(label)}($|[^\\d])`));
          } else if (a.kind === "set") {
            const said = a.values.map((v) => {
              const d = [1, 2, 4, 5].find((k) => Number.isInteger(Math.round(v * k * 1e9) / 1e9))!;
              return d === 1 ? shown(v) : `${shown(Math.round(v * d))}/${d}`;
            });
            for (const s of said) expect(last, `${where} last step ${last}`).toMatch(new RegExp(`(^|[^\\d])${esc(s)}($|[^\\d/])`));
            for (const h of en.hints) {
              expect(said.every((s) => h.includes(`x = ${s}`)), `${where} hint gives the answer`).toBe(false);
              expect(h, where).not.toContain(`{${said.join(", ")}}`);
            }
          } else if (a.kind === "pair") {
            expect(last, where).toContain(`(${shown(a.x)}, ${shown(a.y)})`);
            for (const h of en.hints) expect(h, where).not.toContain(`(${shown(a.x)}, ${shown(a.y)})`);
          } else if (a.kind === "expr") {
            const rhs = last.slice(last.lastIndexOf("=") + 1);
            expect(equivalent(node(rhs), node(a.expr)), `${where} last step ${last}`).toBe(true);
            for (const h of en.hints) {
              if (!h.includes("=")) continue;
              const hr = parse(fromShown(h.slice(h.lastIndexOf("=") + 1).replace(/\.$/, "")));
              if (hr) expect(equivalent(hr, node(a.expr)), `${where} hint gives the answer: ${h}`).toBe(false);
            }
          }
        }
        // Most typed items carry at least one likely wrong value.
        if (typed) expect(withWrong / typed, `${id} L${level} items with wrong values`).toBeGreaterThan(0.75);
      }
    });
  });
});

// ---------------------------------------------------------------- grade 8

/** Rational or irrational, decided from the label alone. */
function isRational(label: string): boolean {
  if (label === "π") return false;
  let m = /^√(\d+)$/.exec(label);
  if (m) return isSquare(Number(m[1]));
  m = /^\d+ \+ √(\d+)$/.exec(label);
  if (m) return isSquare(Number(m[1]));
  if (/^\d+\/\d+$/.test(label) || /^\d+\.\d+…$/.test(label) || /^\d+\.\d+$/.test(label)) return true;
  throw new Error(`unknown number ${label}`);
}

describe("m.irrational", () => {
  it("L1: exactly the keyed choice is of the kind asked for, and repeating decimals equal their fractions", () => {
    each("m.irrational", 1, (item, where) => {
      const wantRational = /\brational\b/.test(item.prompt[0] as string) && !/irrational/.test(item.prompt[0] as string);
      item.choices!.forEach((c, i) => expect(isRational(c.label) === wantRational, `${where} ${c.label}`).toBe(i === (item.answer as { index: number }).index));
      // "0.454545… = 5/11": long division of the fraction gives the repeating block.
      for (const s of item.steps) {
        const m = /^(0\.(\d+))… repeats, so it is rational: it equals (\d+)\/(\d+)\.$/.exec(s);
        if (!m) continue;
        let r = Number(m[3]) % Number(m[4]), digits = "";
        for (let k = 0; k < m[2].length; k++) {
          r *= 10;
          digits += Math.floor(r / Number(m[4]));
          r %= Number(m[4]);
        }
        expect(digits, `${where} ${s}`).toBe(m[2]);
      }
    });
  });
  it("L2: the keyed whole numbers bracket the root, and no other choice does", () => {
    each("m.irrational", 2, (item, where) => {
      const n = num(/√(\d+)/.exec(item.prompt[0] as string)![1]);
      item.choices!.forEach((c, i) => {
        const [lo, hi] = nums(c.label.replace(/√\d+/, ""));
        expect(hi - lo, where).toBe(1);
        expect(lo * lo < n && n < hi * hi, `${where} ${c.label}`).toBe(i === (item.answer as { index: number }).index);
      });
    });
  });
  it("L3: the tapped point is √n to the nearest tenth, inside the pad, on a tick", () => {
    each("m.irrational", 3, (item, where) => {
      const n = num(/√(\d+)/.exec(item.prompt[0] as string)![1]);
      if (item.answer.kind !== "number" || item.pad?.kind !== "number-line") throw new Error(where);
      expect(item.input, where).toBe("number-line");
      const t = item.answer.value;
      expect(close(t, Math.round(Math.sqrt(n) * 10) / 10), `${where} √${n} vs ${t}`).toBe(true);
      expect(Math.abs(Math.sqrt(n) - t), where).toBeLessThanOrEqual(0.05);
      const { min, max, step } = item.pad;
      expect(t >= min && t <= max, where).toBe(true);
      expect(close(Math.round((t - min) / step), (t - min) / step, 1e-6), where).toBe(true);
      for (const w of item.wrong!) expect(Number(w.value) >= min && Number(w.value) <= max, `${where} ${w.value} off the pad`).toBe(true);
    });
  });
});

describe("m.transform", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the image comes out of a rotation matrix, a mirror or a slide applied to the pictured point`, () => {
      const moves = new Set<string>();
      each("m.transform", level, (item, where) => {
        const t = item.prompt[0] as string;
        if (item.answer.kind !== "pair" || item.visual?.kind !== "coord") throw new Error(where);
        const [x, y] = nums(/\((−?\d+), (−?\d+)\)/.exec(t)![0]);
        expect(item.visual.points, where).toEqual([[x, y]]);
        let img: [number, number];
        const turn = (deg: number): [number, number] => {
          const a = (deg * Math.PI) / 180;
          return [Math.round(x * Math.cos(a) - y * Math.sin(a)), Math.round(x * Math.sin(a) + y * Math.cos(a))];
        };
        if (/counterclockwise/.test(t)) img = turn(90);
        else if (/clockwise/.test(t)) img = turn(-90);
        else if (/180°/.test(t)) img = turn(180);
        else if (/x-axis/.test(t)) img = [x, -y];
        else if (/y-axis/.test(t)) img = [-x, y];
        else {
          const h = /(\d+) units? (right|left)/.exec(t)!, v = /(\d+) units? (up|down)/.exec(t)!;
          img = [x + Number(h[1]) * (h[2] === "right" ? 1 : -1), y + Number(v[1]) * (v[2] === "up" ? 1 : -1)];
        }
        moves.add(/rotated|reflected|translated|moves/.exec(t)![0]);
        expect([item.answer.x, item.answer.y], `${where} ${t}`).toEqual(img);
        // Distance to the origin is kept by rotations and mirrors.
        if (!/translated|moves/.test(t)) expect(item.answer.x ** 2 + item.answer.y ** 2, where).toBe(x * x + y * y);
        if (item.answer.x !== item.answer.y) expect(check(item.answer, `(${item.answer.y}, ${item.answer.x})`).correct, `${where} swapped accepted`).toBe(false);
      });
      expect(moves.size, `kinds at L${level}`).toBe(level === 1 ? 3 : 1);
    });
  }
});

describe("m.angles.triangle", () => {
  it("L1: the three angles add to 180°", () => {
    each("m.angles.triangle", 1, (item, where) => {
      const [a, b] = nums((item.prompt[0] as string).replace(/[A-Z]{3}/, ""));
      if (item.answer.kind !== "number") throw new Error(where);
      expect(a + b + item.answer.value, where).toBe(180);
      expect(item.answer.value, where).toBeGreaterThan(0);
    });
  });
  it("L2: with the third interior angle found first, the angles add to 180° and the exterior angle is its supplement", () => {
    each("m.angles.triangle", 2, (item, where) => {
      const t = item.prompt[0] as string;
      if (item.answer.kind !== "number") throw new Error(where);
      const v = item.answer.value;
      if (/Find the exterior/.test(t)) {
        const [a, b] = nums(t.split("∠A")[1]);
        const C = 180 - a - b;
        expect(180 - C, where).toBe(v);
      } else {
        const [ext, a] = nums(t.split("∠ACD")[1]);
        const C = 180 - ext;
        expect(a + v + C, where).toBe(180);
        expect(v, where).toBeGreaterThan(0);
      }
    });
  });
  it("L3: substituting the key makes every angle positive and the angle facts true, and it is the only solution", () => {
    each("m.angles.triangle", 3, (item, where) => {
      const t = item.prompt[0] as string;
      if (item.answer.kind !== "number") throw new Error(where);
      const exprs = [...t.matchAll(/= \(?([^°)]+)\)?°/g)].map((m) => m[1]);
      const at = (x: number) => exprs.map((e) => val(e, { x }));
      const x = item.answer.value;
      const angles = at(x);
      for (const g of angles) expect(g > 0 && g < 180, `${where} angle ${g}`).toBe(true);
      const fact = (vs: number[]) => (/exterior/.test(t) ? vs[2] === vs[0] + vs[1] : vs[0] + vs[1] + vs[2] === 180);
      expect(fact(angles), `${where} ${t}`).toBe(true);
      expect(fact(at(x + 1)) || fact(at(x - 1)), `${where} not unique`).toBe(false);
      if (/exterior/.test(t)) expect(180 - angles[2] + angles[0] + angles[1], where).toBe(180);
    });
  });
});

describe("m.volume.round", () => {
  for (const level of [1, 2, 3]) {
    it(`L${level}: the key matches the formula in floating point with π = 3.14, to the hundredth`, () => {
      each("m.volume.round", level, (item, where) => {
        const t = item.prompt[0] as string;
        if (item.answer.kind !== "number") throw new Error(where);
        const rd = /(radius|diameter) of (\d+)/.exec(t)!;
        const r = rd[1] === "radius" ? Number(rd[2]) : Number(rd[2]) / 2;
        const h = Number(/height of (\d+)/.exec(t)?.[1] ?? 0);
        const pi = 3.14;
        const V = /cylinder/.test(t) ? pi * r * r * h : /cone/.test(t) ? (pi * r * r * h) / 3 : (4 / 3) * pi * r ** 3;
        expect(/cylinder|cone|sphere/.exec(t)![0], where).toBe(["cylinder", "cone", "sphere"][level - 1]);
        expect(Math.abs(item.answer.value - V), `${where} ${t} key ${item.answer.value} vs ${V}`).toBeLessThan(0.005 + 1e-9);
        expect(check(item.answer, V.toFixed(2)).correct, `${where} ${V.toFixed(2)} rejected`).toBe(true);
        // The radius doubled (the diameter used as the radius) is far off and must be rejected.
        expect(check(item.answer, (V * (level === 3 ? 8 : 4)).toFixed(2)).correct, `${where} diameter as radius accepted`).toBe(false);
      });
    });
  }
});

/** Pairs from a table prompt ("x: 1, 2 … y: 3, 4") or a set prompt ("{(1, 3), (2, 4)}"). */
function pairsOf(s: string): [number, number][] {
  const t = /x: ([^;y]+?)[;\s]+y: ([^.?]+)/.exec(s);
  if (t) {
    const xs = nums(t[1]), ys = nums(t[2]);
    return xs.map((x, i) => [x, ys[i]]);
  }
  return [...s.matchAll(/\((−?\d+), (−?\d+)\)/g)].map((m) => [num(m[1]), num(m[2])]);
}
const isFunction = (ps: [number, number][]) => ps.every(([x, y]) => ps.every(([u, v]) => u !== x || v === y));

describe("m.func.identify", () => {
  it("L1: the key says function exactly when no input is paired with two outputs", () => {
    let fns = 0;
    each("m.func.identify", 1, (item, where) => {
      const ps = pairsOf(text(item));
      expect(ps, where).toHaveLength(5);
      const fn = isFunction(ps);
      if (fn) fns++;
      expect(keyLabel(item), where).toBe(fn ? "Yes" : "No");
    });
    expect(fns).toBeGreaterThan(80);
    expect(fns).toBeLessThan(170);
  });
  it("L2: exactly the keyed relation has the property asked for", () => {
    each("m.func.identify", 2, (item, where) => {
      const wantFn = !/not a function/.test(item.prompt[0] as string);
      item.choices!.forEach((c, i) => expect(isFunction(pairsOf(c.label)) === wantFn, `${where} ${c.label}`).toBe(i === (item.answer as { index: number }).index));
    });
  });
});

describe("m.linear.compare", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the key has the greater rate or initial value, read back from the words or equation and the table, and the trap tag fits the loser`, () => {
      const tags = new Set<string>();
      each("m.linear.compare", level, (item, where) => {
        const t = item.prompt[0] as string;
        const table = /— [^:]+: ([^;]+); [^:]+: ([^.]+)\./.exec(t)!;
        const xs = nums(table[1]), ys = nums(table[2]);
        const rate = (ys[1] - ys[0]) / (xs[1] - xs[0]);
        for (let i = 1; i < 4; i++) expect(close((ys[i] - ys[0]) / (xs[i] - xs[0]), rate), `${where} table not linear`).toBe(true);
        const B = { m: rate, b: ys[0] - rate * xs[0], table: true, step: xs[1] - xs[0], first: ys[0], x0: xs[0] };
        let A: typeof B, nameA: string, nameB: string;
        if (level === 1) {
          const [s0, m0] = nums(t.split(". ")[0]);
          A = { m: m0, b: s0, table: false, step: 1, first: s0, x0: 0 };
          nameA = t.split(" ")[0];
          nameB = item.choices!.map((c) => c.label).find((l) => l !== nameA)!;
        } else {
          const e = /Function A: y = ([^.]+)\./.exec(t)![1];
          A = { m: val(e, { x: 1 }) - val(e, { x: 0 }), b: val(e, { x: 0 }), table: false, step: 1, first: 0, x0: 0 };
          [nameA, nameB] = ["Function A", "Function B"];
        }
        const askRate = level === 1 ? !/ at \w+ 0\?$/.test(t) : /rate of change/.test(t);
        const pick = (f: (s: typeof A) => number) => (f(A) > f(B) ? [nameA, A, B] : [nameB, B, A]) as [string, typeof A, typeof A];
        const [winner, W, L] = pick(askRate ? (s) => s.m : (s) => s.b);
        expect(askRate ? W.m !== L.m : W.b !== L.b, where).toBe(true);
        expect(keyLabel(item), `${where} ${t}`).toBe(winner);
        const why = item.choices!.find((c) => c.label !== winner)!.why!;
        tags.add(why);
        const fits: Record<string, boolean> = {
          "compared-initial-values": L.b > W.b,
          "used-change-per-row-not-per-unit": L.table && L.step === 2 && 2 * L.m > W.m,
          "compared-absolute-values": Math.abs(L.m) > Math.abs(W.m),
          "compared-rates-instead": L.m > W.m,
          "read-first-table-value-as-start": L.table && L.x0 !== 0 && L.first > W.b,
        };
        expect(fits[why], `${where} tag ${why} does not fit`).toBe(true);
      });
      expect(tags.size).toBeGreaterThanOrEqual(level === 1 ? 4 : 5);
    });
  }
});

describe("m.best.fit", () => {
  for (const level of [1, 2]) {
    it(`L${level}: slope, intercept, prediction and meaning all follow from the two stated points on the line`, () => {
      const kinds = new Set<string>();
      each("m.best.fit", level, (item, where) => {
        const t = item.prompt[0] as string;
        const [x1, y1, x2, y2] = nums(/passes through \((\d+), (\d+)\) and \((\d+), (\d+)\)/.exec(t)![0]);
        const m = (y2 - y1) / (x2 - x1), b = y1 - m * x1;
        if (item.visual?.kind !== "coord") throw new Error(where);
        expect(item.visual.line, where).toBe(true);
        expect(item.visual.points.slice(0, 2), where).toEqual([[x1, y1], [x2, y2]]);
        const data = item.visual.points.slice(2);
        expect(data.length, where).toBeGreaterThanOrEqual(3);
        for (const [x, y] of data) {
          expect(x >= 0 && y >= 0, where).toBe(true);
          expect(Math.abs(y - (m * x + b)), `${where} (${x}, ${y}) is far from the line`).toBeLessThanOrEqual(1.5);
        }
        const a = item.answer;
        if (/What is the slope/.test(t)) {
          kinds.add("slope");
          if (a.kind !== "fraction") throw new Error(where);
          expect(close(a.n / a.d, m) && gcd(Math.abs(a.n), a.d) === 1, where).toBe(true);
        } else if (/y-intercept of/.test(t)) {
          kinds.add("intercept");
          expect(a, where).toEqual({ kind: "number", value: b });
        } else if (/predict/.test(t)) {
          kinds.add("predict");
          const X = num(/x = (\d+)\./.exec(t)![1]);
          expect(X > Math.max(...data.map((p) => p[0])), `${where} not a prediction`).toBe(true);
          expect(a, where).toEqual({ kind: "number", value: m * X + b });
        } else {
          kinds.add("meaning");
          const label = keyLabel(item);
          expect(label, where).toMatch(new RegExp(` ${esc(String(m))} [a-z ]+ each (week|month|hour)\\.$`));
          for (const c of item.choices!) {
            if (c.why === "confused-slope-and-intercept") expect(c.label, where).toMatch(/at (week|month|hour) 0\.$/);
            if (c.why === "reversed-the-variables") expect(c.label, where).toMatch(/takes about/);
            if (c.why === "used-intercept-as-rate") expect(c.label, where).toContain(` ${b} `);
          }
        }
      });
      expect(kinds.size).toBe(2);
    });
  }
});

describe("m.eq.solutions", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the keyed count matches what is left when both sides are evaluated as lines in x`, () => {
      const counts = [0, 0, 0];
      each("m.eq.solutions", level, (item, where) => {
        const [l, r] = (item.prompt[1] as string).split(" = ");
        const f = (x: number) => val(l, { x }) - val(r, { x });
        const slope = f(1) - f(0), c = f(0);
        const kind = Math.abs(slope) > 1e-9 ? 0 : Math.abs(c) > 1e-9 ? 1 : 2;
        counts[kind]++;
        expect(item.answer, `${where} ${item.prompt[1]}`).toEqual({ kind: "choice", index: kind });
        if (kind === 0) expect(item.steps[item.steps.length - 1], where).toContain(`x = ${shown(-c / slope)}`);
        if (level === 2) expect(item.prompt[1], where).toMatch(/\d\(x/);
      });
      for (const n of counts) expect(n).toBeGreaterThan(50);
    });
  }
});

// ---------------------------------------------------------------- grade 9

describe("m.abs.equation", () => {
  const parseAbs = (s: string) => {
    const m = /^(\d*)\|x ([+−]) (\d+)\|(?: ([+−]) (\d+))? = (−?\d+)$/.exec(s)!;
    const a = Number(m[1] || 1), p = (m[2] === "−" ? -1 : 1) * Number(m[3]), c = m[4] ? (m[4] === "−" ? -1 : 1) * Number(m[5]) : 0, d = num(m[6]);
    return { f: (x: number) => a * Math.abs(x + p) + c, d, a, c };
  };
  /** Every integer solution in a wide window, found by trying them all. */
  const search = (f: (x: number) => number, d: number) => Array.from({ length: 201 }, (_, i) => i - 100).filter((x) => f(x) === d);
  for (const level of [1, 2]) {
    it(`L${level}: the keyed solutions are exactly the ones a search finds`, () => {
      let single = 0;
      each("m.abs.equation", level, (item, where) => {
        const { f, d, a, c } = parseAbs(item.prompt[1] as string);
        expect(Number.isInteger((d - c) / a), where).toBe(true);
        if (item.answer.kind !== "set") throw new Error(where);
        expect([...item.answer.values].sort((u, v) => u - v), `${where} ${item.prompt[1]}`).toEqual(search(f, d));
        if (item.answer.values.length === 1) single++;
        else expect(check(item.answer, String(item.answer.values[0])).correct, `${where} one root of two`).toBe(false);
      });
      if (level === 2) expect(single).toBeGreaterThan(10);
    });
  }
  it("L3: the keyed count is the number of solutions a search finds", () => {
    const seen = [0, 0, 0];
    each("m.abs.equation", 3, (item, where) => {
      const { f, d, a, c } = parseAbs(item.prompt[1] as string);
      if ((d - c) / a >= 0) expect(Number.isInteger((d - c) / a), where).toBe(true);
      const count = search(f, d).length;
      seen[count]++;
      expect(item.answer, `${where} ${item.prompt[1]}`).toEqual({ kind: "choice", index: 2 - count });
    });
    for (const n of seen) expect(n).toBeGreaterThan(50);
  });
});

describe("m.line.forms", () => {
  it("L1: points on the keyed line satisfy the standard-form equation", () => {
    each("m.line.forms", 1, (item, where) => {
      const m = /^Write (.+) = (−?\d+) in slope-intercept form/.exec(item.prompt[0] as string)!;
      if (item.answer.kind !== "expr") throw new Error(where);
      const line = node(item.answer.expr);
      for (const x of [-3, -1, 0, 2, 5]) expect(close(val(m[1], { x, y: evaluate(line, { x }) }), num(m[2])), `${where} x = ${x}`).toBe(true);
      expect(check(item.answer, `y = ${item.answer.expr}`).correct, where).toBe(true);
    });
  });
  it("L2: only the keyed choice is the same line, with whole-number coefficients, A positive and no common factor", () => {
    each("m.line.forms", 2, (item, where) => {
      const rhs = /y = (.+?) in standard form/.exec(text(item))![1];
      const y = (x: number) => val(rhs, { x });
      item.choices!.forEach((c, i) => {
        const [l, r] = c.label.split(" = ");
        const g = (x: number, yy: number) => val(l, { x, y: yy }) - val(r);
        const same = [-2, 0, 1, 3].every((x) => close(g(x, y(x)), 0));
        const isKey = i === (item.answer as { index: number }).index;
        expect(same, `${where} ${c.label} vs y = ${rhs}`).toBe(isKey);
        if (isKey) {
          const [A, B, C] = [g(1, 0) - g(0, 0), g(0, 1) - g(0, 0), -g(0, 0)];
          expect([A, B, C].every(Number.isInteger) && A > 0, where).toBe(true);
          expect(gcd(gcd(Math.abs(A), Math.abs(B)), Math.abs(C)), where).toBe(1);
        }
      });
    });
  });
});

describe("m.systems.elim", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the pair satisfies both equations, the lines cross once, and level 2 needs both equations multiplied`, () => {
      each("m.systems.elim", level, (item, where) => {
        if (item.answer.kind !== "pair") throw new Error(where);
        const { x, y } = item.answer;
        const rows = [item.prompt[1], item.prompt[3]].map((eq) => {
          const [l, r] = (eq as string).split(" = ");
          const f = (px: number, py: number) => val(l, { x: px, y: py }) - val(r);
          expect(close(f(x, y), 0), `${where} ${eq}`).toBe(true);
          return [f(1, 0) - f(0, 0), f(0, 1) - f(0, 0)];
        });
        expect(close(rows[0][0] * rows[1][1], rows[1][0] * rows[0][1]), `${where} parallel lines`).toBe(false);
        const divides = (u: number, v: number) => Math.abs(u) % Math.abs(v) === 0 || Math.abs(v) % Math.abs(u) === 0;
        if (level === 2) expect(divides(rows[0][0], rows[1][0]) || divides(rows[0][1], rows[1][1]), `${where} one equation is enough`).toBe(false);
        else expect(divides(rows[0][0], rows[1][0]) || divides(rows[0][1], rows[1][1]), `${where} level 1 needs no more than one multiplier`).toBe(true);
      });
    });
  }
});

describe("m.domain.range", () => {
  it("L1: the key is the set of x-values or y-values read straight from the pairs", () => {
    each("m.domain.range", 1, (item, where) => {
      const t = item.prompt[0] as string;
      const ps = pairsOf(t);
      const want = [...new Set(ps.map((p) => (/domain\?/.test(t) ? p[0] : p[1])))].sort((u, v) => u - v);
      expect(item.answer, where).toEqual({ kind: "set", values: want });
      expect(isFunction(ps), where).toBe(true);
    });
  });
  it("L2: the key is the rule evaluated at every number of the domain", () => {
    each("m.domain.range", 2, (item, where) => {
      const t = text(item);
      const m = /f\(x\) = (.+), with domain \{([^}]+)\}/.exec(t)!;
      const outs = [...new Set(nums(m[2]).map((x) => val(m[1], { x })))].sort((u, v) => u - v);
      expect(item.answer, where).toEqual({ kind: "set", values: outs });
    });
  });
});

describe("m.rate.change", () => {
  it("L1: the fraction is the change in the table's outputs over the change in inputs, in lowest terms", () => {
    each("m.rate.change", 1, (item, where) => {
      const t = item.prompt[0] as string;
      const m = /([xt]): ([^;]+); [fh]\([xt]\): ([^.]+)\./.exec(t)!;
      const xs = nums(m[2]), ys = nums(m[3]);
      const [a, b] = nums(/from [xt] = (−?\d+) to [xt] = (−?\d+)/.exec(t)![0]);
      const f = (x: number) => ys[xs.indexOf(x)];
      if (item.answer.kind !== "fraction") throw new Error(where);
      expect(close(item.answer.n / item.answer.d, (f(b) - f(a)) / (b - a)), where).toBe(true);
      expect(item.answer.d > 0 && gcd(Math.abs(item.answer.n), item.answer.d) === 1, where).toBe(true);
      if (m[1] === "t") for (const h of ys) expect(h, `${where} a rocket below the ground`).toBeGreaterThanOrEqual(0);
    });
  });
  it("L2: the key is the slope of the secant through the two points of the curve", () => {
    each("m.rate.change", 2, (item, where) => {
      const t = item.prompt[0] as string;
      const rule = /f\(x\) = (.+)\. Find/.exec(t)![1];
      const [a, b] = nums(/from x = (−?\d+) to x = (−?\d+)/.exec(t)![0]);
      if (item.answer.kind !== "number") throw new Error(where);
      expect(close(item.answer.value, (val(rule, { x: b }) - val(rule, { x: a })) / (b - a)), `${where} ${rule}`).toBe(true);
    });
  });
});

describe("m.sequences", () => {
  /** The nth term by stepping from the first term, one term at a time. */
  const walk = (first: number, step: (v: number) => number, n: number) => {
    let v = first;
    for (let i = 1; i < n; i++) v = step(v);
    return v;
  };
  it("L1: stepping by the common difference reaches the key", () => {
    each("m.sequences", 1, (item, where) => {
      const t = item.prompt[0] as string;
      let first: number, d: number, n: number;
      if (/concert hall/.test(t)) [first, d, n] = nums(t);
      else if (/video game/.test(t)) [first, , d, n] = nums(t);
      else {
        n = num(/(\d+)(st|nd|rd|th) term/.exec(t)![1]);
        const terms = nums(t.split("sequence")[1]);
        d = terms[1] - terms[0];
        terms.forEach((v, i) => expect(v, where).toBe(terms[0] + i * d));
        first = terms[0];
      }
      expect(item.answer, where).toEqual({ kind: "number", value: walk(first, (v) => v + d, n) });
    });
  });
  it("L2: multiplying by the common ratio reaches the key", () => {
    each("m.sequences", 2, (item, where) => {
      const t = item.prompt[0] as string;
      let first: number, ratio: number, n: number;
      if (/ball bounces/.test(t)) {
        [first, n] = nums(t);
        ratio = 0.5;
      } else if (/share a new song/.test(t)) [first, , ratio, n] = nums(t);
      else {
        n = num(/(\d+)(st|nd|rd|th) term/.exec(t)![1]);
        const terms = nums(t.split("sequence")[1]);
        ratio = terms[1] / terms[0];
        terms.forEach((v, i) => expect(close(v, terms[0] * ratio ** i), where).toBe(true));
        first = terms[0];
      }
      const want = walk(first, (v) => v * ratio, n);
      expect(Number.isInteger(want), `${where} not whole`).toBe(true);
      expect(item.answer, where).toEqual({ kind: "number", value: want });
    });
  });
  it("L3: only the keyed rule reproduces the first four terms", () => {
    each("m.sequences", 3, (item, where) => {
      const terms = nums((item.prompt[0] as string).split("sequence")[1]);
      item.choices!.forEach((c, i) => {
        const rule = c.label.replace("aₙ = ", "").replace(/ⁿ⁻¹/g, "^(n-1)").replace(/ⁿ/g, "^(n)");
        const fits = terms.every((v, k) => close(val(rule, { n: k + 1 }), v));
        expect(fits, `${where} ${c.label} vs ${terms}`).toBe(i === (item.answer as { index: number }).index);
      });
    });
  });
});

describe("m.exp.growth", () => {
  it("L1: multiplying period by period gives the key", () => {
    each("m.exp.growth", 1, (item, where) => {
      const t = text(item);
      if (item.answer.kind !== "number") throw new Error(where);
      let want: number;
      const rule = /f\(x\) = (.+)\. Find f\((\d+)\)/.exec(t);
      if (rule) want = val(rule[1], { x: Number(rule[2]) });
      else {
        const [start, periods] = nums(t);
        const factor = /doubles/.test(t) ? 2 : /triples/.test(t) ? 3 : 0.5;
        want = start;
        for (let i = 0; i < periods; i++) want *= factor;
      }
      expect(Number.isInteger(want), where).toBe(true);
      expect(item.answer.value, `${where} ${t}`).toBe(want);
    });
  });
  it("L2: compounding year by year in floating point, then rounding as asked, gives the key", () => {
    each("m.exp.growth", 2, (item, where) => {
      const t = item.prompt[0] as string;
      if (item.answer.kind !== "number") throw new Error(where);
      const [start, p, years] = nums(t);
      let v = start;
      for (let i = 0; i < years; i++) v *= 1 + ((/drops/.test(t) ? -1 : 1) * p) / 100;
      const cents = /nearest cent/.test(t);
      expect(Math.abs(item.answer.value - v), `${where} ${t}: ${item.answer.value} vs ${v}`).toBeLessThanOrEqual((cents ? 0.005 : 0.5) + 1e-9);
      expect(close(Math.round(item.answer.value * (cents ? 100 : 1)), item.answer.value * (cents ? 100 : 1), 1e-12), where).toBe(true);
    });
  });
});

describe("m.radical.simplify", () => {
  const value = (s: string) => {
    const terms = s.split(" · ").map((x) => /^(\d*)√(\d+)$/.exec(x)!);
    return { v: terms.reduce((acc, m) => acc * Number(m[1] || 1) * Math.sqrt(Number(m[2])), 1), k: Number(terms[terms.length - 1][2]) };
  };
  for (const level of [1, 2]) {
    it(`L${level}: only the keyed choice equals the expression with a square-free radicand`, () => {
      each("m.radical.simplify", level, (item, where) => {
        const shownExpr = /(?:Simplify|Multiply and simplify:) ([^.]+)\./.exec(item.prompt[0] as string)![1];
        const target = value(shownExpr).v;
        item.choices!.forEach((c, i) => {
          const { v, k } = value(c.label);
          expect(close(v, target, 1e-12) && squareFree(k), `${where} ${c.label} vs ${shownExpr}`).toBe(i === (item.answer as { index: number }).index);
        });
      });
    });
  }
});

describe("m.quad.vertex", () => {
  for (const level of [1, 2]) {
    it(`L${level}: the keyed point is on the parabola and the curve is symmetric about it`, () => {
      each("m.quad.vertex", level, (item, where) => {
        const rule = /y = (.+?)(\?|\.) (Write|Escr)/.exec(text(item))![1];
        const f = (x: number) => val(rule, { x });
        if (item.answer.kind !== "pair") throw new Error(where);
        const { x: h, y: k } = item.answer;
        expect(close(f(h), k), `${where} ${rule} at ${h}`).toBe(true);
        for (const d of [1, 2, 3]) expect(close(f(h + d), f(h - d)), `${where} not symmetric`).toBe(true);
        expect(close(f(h + 1), f(h)), `${where} flat`).toBe(false);
      });
    });
  }
});

describe("m.quad.formula", () => {
  const coefs = (lhs: string) => {
    const f = (x: number) => val(lhs, { x });
    const c = f(0), b = (f(1) - f(-1)) / 2, a = (f(1) + f(-1)) / 2 - c;
    return { f, a, b, c };
  };
  for (const level of [1, 2]) {
    it(`L${level}: every keyed root makes the polynomial 0, and the count matches the discriminant`, () => {
      let fractional = 0;
      each("m.quad.formula", level, (item, where) => {
        const { f, a, b, c } = coefs((item.prompt[1] as string).replace(" = 0", ""));
        if (item.answer.kind !== "set") throw new Error(where);
        for (const v of item.answer.values) expect(Math.abs(f(v)), `${where} root ${v}`).toBeLessThan(1e-9);
        const disc = b * b - 4 * a * c;
        expect(disc, where).toBeGreaterThanOrEqual(0);
        expect(isSquare(disc), `${where} irrational roots`).toBe(true);
        expect(new Set(item.answer.values).size, where).toBe(disc === 0 ? 1 : 2);
        if (item.answer.values.some((v) => !Number.isInteger(v))) fractional++;
        if (level === 1) expect(a, where).toBe(1);
      });
      if (level === 2) expect(fractional).toBe(SEEDS.length);
    });
  }
  it("L3: both roots of the keyed choice make the polynomial 0, and every other choice misses", () => {
    each("m.quad.formula", 3, (item, where) => {
      const { f, b, c } = coefs((item.prompt[1] as string).replace(" = 0", ""));
      expect(isSquare(b * b - 4 * c), `${where} rational roots`).toBe(false);
      item.choices!.forEach((ch, i) => {
        const m = /^x = (?:(−?\d+) )?± ?(\d*)(?:√(\d+))?$/.exec(ch.label)!;
        const center = m[1] ? num(m[1]) : 0, coef = Number(m[2] || 1), rad = m[3] ? Math.sqrt(Number(m[3])) : 1;
        const roots = [center + coef * rad, center - coef * rad];
        const ok = roots.every((x) => Math.abs(f(x)) < 1e-9);
        expect(ok, `${where} ${ch.label}`).toBe(i === (item.answer as { index: number }).index);
        if (i === (item.answer as { index: number }).index && m[3]) expect(squareFree(Number(m[3])), where).toBe(true);
      });
    });
  });
});
