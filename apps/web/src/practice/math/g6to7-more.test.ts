import { describe, expect, it } from "vitest";
import { answerText, check, parseNumber } from "../answer";
import { equivalent, evaluate, isExpanded, parse } from "../expr";
import { gcd } from "../rng";
import { makeItem } from "../skills";
import type { Item, MathPart } from "../types";
import { MATH_6_7_MORE } from "./g6to7-more";

// Grades 6–7, second strand. Every key is re-derived from what the learner sees (the prompt text in
// either language, the picture, the choices) by a different route than the generator: evaluating the
// shown expression, brute-force search over whole numbers, distance by the Pythagorean formula, the
// product multiplied back, and word-to-math tables written here independently in English and Spanish.

const SEEDS = Array.from({ length: 220 }, (_, i) => i * 104729 + 7);
const LOCALES = ["en", "es"] as const;

const ascii = (s: string) => s.replace(/[−–]/g, "-");
/** Numbers as they appear, with thousands separators removed: "$1,100" → 1100, "−2.5" → −2.5. */
const nums = (s: string) => (ascii(s).replace(/(\d),(\d{3})/g, "$1$2").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** The prompt as plain text: a stacked fraction becomes (n/d), and a whole number just before one makes a mixed number. */
function toExpr(parts: MathPart[]): string {
  let s = "";
  for (const p of parts) {
    if (typeof p === "string") s += p;
    else if ("frac" in p) {
      const f = `${p.frac[0]}/${p.frac[1]}`;
      const m = /([−-])?(\d+)$/.exec(s);
      if (m && !/[\d.]$/.test(s.slice(0, m.index))) s = `${s.slice(0, m.index)}${m[1] ? "-" : ""}(${m[2]} + ${f})`;
      else s += `(${f})`;
    } else if ("sup" in p) s += `(${p.sup[0]})^(${p.sup[1]})`;
    else s += "?";
  }
  return ascii(s);
}
/** Every number in the prompt in order, mixed numbers and fractions as one value each. */
function values(parts: MathPart[]): number[] {
  const out: number[] = [];
  const re = /(-)?\((\d+) \+ (\d+)\/(\d+)\)|(-)?\((\d+)\/(\d+)\)|(-?\d+(?:\.\d+)?)/g;
  for (const m of toExpr(parts).matchAll(re)) {
    if (m[2]) out.push((m[1] ? -1 : 1) * (Number(m[2]) + Number(m[3]) / Number(m[4])));
    else if (m[6]) out.push((m[5] ? -1 : 1) * (Number(m[6]) / Number(m[7])));
    else out.push(Number(m[8]));
  }
  return out;
}
const words = (item: Item) => item.prompt.filter((p): p is string => typeof p === "string").join(" ");
/** A choice label as the parser reads it: superscript digits become a power ("k³" → "k^3"). */
const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const unsup = (label: string) => label.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^${[...m].map((ch) => SUPERSCRIPT.indexOf(ch)).join("")}`);

function at(src: string, env: Record<string, number> = {}): number {
  const node = parse(src);
  if (!node) throw new Error(`cannot parse ${src}`);
  return evaluate(node, env);
}
const same = (a: string, b: string) => equivalent(parse(a)!, parse(b)!);

/** The value of a number, fraction or pair-free key. */
function keyValue(item: Item): number {
  const a = item.answer;
  if (a.kind === "number") return a.value;
  if (a.kind === "fraction") return a.n / a.d;
  throw new Error(`no single value for ${a.kind}`);
}
function chosen(item: Item): string {
  if (item.answer.kind !== "choice") throw new Error("expected a choice answer");
  return item.choices![item.answer.index].label;
}
function pair(item: Item): [number, number] {
  if (item.answer.kind !== "pair") throw new Error("expected a pair");
  return [item.answer.x, item.answer.y];
}
function exprKey(item: Item): string {
  if (item.answer.kind !== "expr") throw new Error("expected an expression");
  return item.answer.expr;
}
/** A fraction key must be reduced, and the same amount unreduced is flagged "not simplest". */
function simplestFraction(item: Item, where: string) {
  const a = item.answer;
  if (a.kind !== "fraction") throw new Error(where);
  expect(a.simplest, where).toBe(true);
  expect(gcd(a.n, a.d), `${where} not reduced`).toBe(1);
  if (a.d !== 1) expect(check(a, `${a.n * 3}/${a.d * 3}`), where).toEqual({ correct: false, form: "simplest" });
}

/** First match of a phrase table against a text (longest phrases are listed first). */
function lookup<T>(text: string, table: [RegExp, T][], where: string): T {
  const hit = table.find(([re]) => re.test(text));
  if (!hit) throw new Error(`${where}: no phrase matched in "${text}"`);
  return hit[1];
}

const OPS: Record<string, (a: number, b: number) => boolean> = { ">": (a, b) => a > b, "<": (a, b) => a < b, "≥": (a, b) => a >= b, "≤": (a, b) => a <= b };
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

type Verify = (item: Item, level: number, where: string, locale: "en" | "es") => void;

// ---------- word tables, written independently of the generators ----------

/** "5 more than n" → "n + 5" and so on, in both languages. */
const PHRASE_1: [RegExp, (v: string, c: string) => string][] = [
  [/^(\d+) (?:more than|unidades más que) ([a-z])$/, (c, v) => `${v} + ${c}`],
  [/^([a-z]) (?:increased by|aumentado en) (\d+)$/, (v, c) => `${v} + ${c}`],
  [/^(?:the sum of|la suma de) ([a-z]) (?:and|y) (\d+)$/, (v, c) => `${v} + ${c}`],
  [/^(\d+) (?:less than|unidades menos que) ([a-z])$/, (c, v) => `${v} - ${c}`],
  [/^([a-z]) (?:less than|unidades menos que) (\d+)$/, (v, c) => `${c} - ${v}`],
  [/^([a-z]) (?:decreased by|disminuido en) (\d+)$/, (v, c) => `${v} - ${c}`],
  [/^(\d+) (?:subtracted from|restado de) ([a-z])$/, (c, v) => `${v} - ${c}`],
  [/^(?:the difference of|la diferencia de) ([a-z]) (?:and|y) (\d+)$/, (v, c) => `${v} - ${c}`],
  [/^(?:the product of|el producto de) (\d+) (?:and|y) ([a-z])$/, (c, v) => `${c}*${v}`],
  [/^(\d+) (?:times|veces) ([a-z])$/, (c, v) => `${c}*${v}`],
  [/^([a-z]) (?:divided by|dividido entre) (\d+)$/, (v, c) => `${v}/${c}`],
  [/^(?:the quotient of|el cociente de) ([a-z]) (?:and|entre) (\d+)$/, (v, c) => `${v}/${c}`],
  [/^(\d+) (?:divided by|dividido entre) ([a-z])$/, (c, v) => `${c}/${v}`],
];
const PHRASE_2: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^(\d+) (?:times the sum of|por la suma de) ([a-z]) (?:and|y) (\d+)$/, (m) => `${m[1]}*(${m[2]} + ${m[3]})`],
  [/^(\d+) (?:times the difference of|por la diferencia de) ([a-z]) (?:and|y) (\d+)$/, (m) => `${m[1]}*(${m[2]} - ${m[3]})`],
  [/^(\d+) (?:more than the product of|unidades más que el producto de) (\d+) (?:and|y) ([a-z])$/, (m) => `${m[2]}*${m[3]} + ${m[1]}`],
  [/^(\d+) (?:less than the product of|unidades menos que el producto de) (\d+) (?:and|y) ([a-z])$/, (m) => `${m[2]}*${m[3]} - ${m[1]}`],
  [/^(?:the quotient of|el cociente de) ([a-z]) (?:and|entre) (\d+), (?:plus|más) (\d+)$/, (m) => `${m[1]}/${m[2]} + ${m[3]}`],
  [/^(?:the sum of|la suma de) ([a-z]) (?:and|y) (\d+), (?:divided by|dividida entre) (\d+)$/, (m) => `(${m[1]} + ${m[2]})/${m[3]}`],
  [/^(?:the product of|el producto de) (\d+) (?:and|y) ([a-z]), (?:decreased by|disminuido en) (\d+)$/, (m) => `${m[1]}*${m[2]} - ${m[3]}`],
];
/** Word problems: the regex reads the two numbers, the function writes the expression in n. */
const STORY_3: [RegExp, (a: number, b: number) => string][] = [
  [/cost \$(\d+) each, plus a \$(\d+) booking fee|cuestan \$(\d+) cada una, más un cargo de reserva de \$(\d+)/, (rate, fee) => `${rate}n + ${fee}`],
  [/is (\d+) centimeters tall and grows (\d+) centimeters|mide (\d+) centímetros y crece (\d+) centímetros/, (start, rate) => `${start} + ${rate}n`],
  [/has (\d+) songs\. Every week \S+ adds (\d+)|tiene (\d+) canciones\. Cada semana agrega (\d+)/, (start, rate) => `${start} + ${rate}n`],
  [/start with (\d+) points and earn (\d+) points|empiezas con (\d+) puntos y ganas (\d+) puntos/, (start, rate) => `${start} + ${rate}n`],
  [/one easel for \$(\d+) and n paint sets for \$(\d+)|un caballete de \$(\d+) y n juegos de pinturas de \$(\d+)/, (start, rate) => `${start} + ${rate}n`],
  [/has (\d+) stickers and gives away (\d+)|tiene (\d+) calcomanías y regala (\d+)/, (start, rate) => `${start} - ${rate}n`],
  [/holds (\d+) gallons\. It drains (\d+)|tiene (\d+) galones de agua\. Pierde (\d+)/, (start, rate) => `${start} - ${rate}n`],
  [/has (\d+) pounds of dog food\. The dogs eat (\d+)|tiene (\d+) libras de comida para perros\. Los perros comen (\d+)/, (start, rate) => `${start} - ${rate}n`],
  [/bakes (\d+) cookies and shares them equally()|hornea (\d+) galletas y las reparte en partes iguales()/, (total) => `${total}/n`],
  [/shares a (\d+)-mile relay race()|carrera de relevos de (\d+) millas()/, (total) => `${total}/n`],
];

const IN_WORDS: [RegExp, string][] = [
  [/no more than|no más de/i, "≤"],
  [/at least|al menos/i, "≥"],
  [/at most|como máximo/i, "≤"],
  [/or more|o más/i, "≥"],
  [/or less|o menos/i, "≤"],
  [/fewer than|menos de/i, "<"],
  [/younger than|menores de/i, "<"],
  [/higher than|a más de/i, ">"],
  [/more than|más de/i, ">"],
  [/below|por debajo de/i, "<"],
  [/above|por encima de/i, ">"],
];
const PAD_WORDS: [RegExp, string][] = [
  [/colder than|más frío que/, "<"],
  [/or warmer|o más\./, "≥"],
  [/warmer than|noches con más de/, ">"],
  [/or lower|o menos\./, "≤"],
  [/at least|al menos/, "≥"],
  [/below|menor que/, "<"],
  [/more than|mayor que/, ">"],
];

// ---------- the checks ----------

const VERIFY: Record<string, Verify> = {
  "m.dec.ops": (item, level, where) => {
    const t = toExpr(item.prompt).replace(/ = \?$/, "");
    expect(t, where).toMatch(level === 1 ? /^\d+(\.\d+)? [+-] \d+(\.\d+)?$/ : level === 2 ? /×/ : /÷/);
    const x = keyValue(item);
    expect(near(at(t), x), `${where} ${t} = ${x}`).toBe(true);
    expect(x, where).toBeGreaterThan(0);
    const [a, b] = nums(t);
    if (level === 3) expect(near(x * b, a), `${where} multiply back`).toBe(true);
    if (level === 2) expect(String(a).includes(".") && String(b).includes("."), `${where} two decimals`).toBe(true);
    if (level === 1 && t.includes("+") && (String(a).split(".")[1] ?? "").length === (String(b).split(".")[1] ?? "").length) {
      // Same places: at least one column must regroup, or the item is only digit facts.
      const places = (String(a).split(".")[1] ?? "").length;
      const digits = (v: number) => String(Math.round(v * 10 ** places)).split("").reverse().map(Number);
      const [da, db] = [digits(a), digits(b)];
      expect(da.some((d, i) => d + (db[i] ?? 0) >= 10), `${where} no regrouping`).toBe(true);
    }
    expect(item.keys, where).toContain(".");
  },

  "m.rational.order": (item, level, where) => {
    if (level === 1) {
      // Read the point: the key is where the picture puts the dot, on a small tick between labelled wholes.
      const v = item.visual;
      if (v?.kind !== "number-line" || v.marker === undefined || !v.denominator) throw new Error(`${where} needs a number line with a dot and ticks`);
      const x = keyValue(item);
      expect(near(x, v.marker), `${where} key ${x}, dot at ${v.marker}`).toBe(true);
      expect(Number.isInteger(x), `${where} lands on a whole number`).toBe(false);
      expect(v.marker > v.min && v.marker < v.max, `${where} dot off the line`).toBe(true);
      expect(near(v.marker * v.denominator, Math.round(v.marker * v.denominator)), `${where} dot between ticks`).toBe(true);
      // Every whole number is labelled, and nothing else is, so no label reads the dot for the learner.
      expect(v.marks, where).toEqual(Array.from({ length: v.max - v.min + 1 }, (_, i) => v.min + i));
      // No number in the question: the dot is the only place the value appears.
      expect(nums(words(item)), `${where} the prompt gives the value`).toEqual([]);
      expect(nums(item.say), where).toEqual([]);
      const decimal = /decimal/.test(words(item));
      expect(item.answer.kind, where).toBe(decimal ? "number" : "fraction");
      expect(item.input, where).toBe(decimal ? "keypad" : "fraction");
      if (item.answer.kind === "fraction") expect(item.answer.d, where).toBe(v.denominator);
      return;
    }
    if (level === 2) {
      const [left, right] = toExpr(item.prompt).split(" ? ");
      const [a, b] = [at(left), at(right)];
      expect(chosen(item), `${where} ${left} ? ${right}`).toBe(near(a, b) ? "=" : a < b ? "<" : ">");
      expect(item.choices!.map((c) => c.label).sort(), where).toEqual(["<", "=", ">"]);
      return;
    }
    const list = (label: string) => label.split(", ").map((s) => parseNumber(ascii(s))!.value);
    if (/farthest|más lejos/.test(words(item))) {
      const sizes = item.choices!.map((c) => Math.abs(list(c.label)[0]));
      expect(Math.abs(list(chosen(item))[0]), where).toBe(Math.max(...sizes));
      expect(new Set(sizes).size, `${where} a tie`).toBe(sizes.length);
      return;
    }
    const shown = sorted(values(item.prompt));
    const right = list(chosen(item));
    expect(right, `${where} not least to greatest`).toEqual(sorted(right));
    for (const c of item.choices!) {
      expect(sorted(list(c.label)).every((v, i) => near(v, shown[i])), `${where} ${c.label} is not the same numbers`).toBe(true);
      if (c.label !== chosen(item)) expect(list(c.label), `${where} ${c.label} is also in order`).not.toEqual(sorted(list(c.label)));
    }
  },

  "m.coord.plane": (item, level, where) => {
    const t = ascii(words(item));
    const points = [...t.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])] as [number, number]);
    if (level === 1) {
      if (item.answer.kind === "choice") {
        const [[x, y]] = points;
        const q = x > 0 && y > 0 ? "I" : x < 0 && y > 0 ? "II" : x < 0 ? "III" : "IV";
        expect(chosen(item), `${where} (${x}, ${y})`).toBe(q);
        return;
      }
      if (item.visual?.kind !== "coord") throw new Error(`${where} needs a grid`);
      expect(pair(item), where).toEqual(item.visual.points[0]);
      const [x, y] = pair(item);
      expect(ascii(item.alt ?? ""), `${where} alt gives the point away`).not.toContain(`(${x}, ${y})`);
      return;
    }
    if (level === 2) {
      const [[x1, y1], [x2, y2]] = points;
      expect(x1 === x2 || y1 === y2, `${where} not on a grid line`).toBe(true);
      expect(near(keyValue(item), Math.hypot(x1 - x2, y1 - y2)), where).toBe(true);
      if (item.visual?.kind !== "coord") throw new Error(`${where} needs a grid`);
      expect(item.visual.points, where).toEqual([[x1, y1], [x2, y2]]);
      return;
    }
    const [[x, y]] = points;
    const acrossX = /x-axis|eje x/.test(t), acrossY = /y-axis|eje y/.test(t);
    // A reflection is a matrix: across the x-axis (x, y) → (x, −y); across the y-axis (x, y) → (−x, y).
    const image: [number, number] = [acrossY ? -x : x, acrossX ? -y : y];
    expect(pair(item), `${where} ${t}`).toEqual(image);
    expect(acrossX || acrossY, where).toBe(true);
  },

  "m.expr.write": (item, level, where) => {
    const quoted = /“(.+)”/.exec(words(item))?.[1];
    if (level === 1) {
      const m = PHRASE_1.map(([re, f]) => [re.exec(quoted!), f] as const).find(([x]) => x);
      if (!m) throw new Error(`${where}: unknown phrase ${quoted}`);
      const want = m[1](m[0]![1], m[0]![2]);
      expect(same(unsup(chosen(item)), want), `${where} "${quoted}" → ${chosen(item)}, expected ${want}`).toBe(true);
      for (const c of item.choices!) if (c.label !== chosen(item)) expect(same(unsup(c.label), want), `${where} ${c.label} also right`).toBe(false);
      return;
    }
    if (level === 2) {
      const m = PHRASE_2.map(([re, f]) => [re.exec(quoted!), f] as const).find(([x]) => x);
      if (!m) throw new Error(`${where}: unknown phrase ${quoted}`);
      const want = m[1](m[0]!);
      expect(same(exprKey(item), want), `${where} "${quoted}" → ${exprKey(item)}, expected ${want}`).toBe(true);
      return;
    }
    const t = words(item);
    const hit = STORY_3.map(([re, f]) => [re.exec(t), f] as const).find(([x]) => x);
    if (!hit) throw new Error(`${where}: unknown story ${t}`);
    const [a, b] = hit[0]!.slice(1).filter((x) => x !== undefined && x !== "").map(Number);
    const want = hit[1](a, b);
    expect(same(exprKey(item), want), `${where} ${exprKey(item)} vs ${want}`).toBe(true);
  },

  "m.expr.equiv": (item, level, where) => {
    const shown = ascii(item.prompt[1] as string);
    if (level === 1) {
      const key = exprKey(item);
      expect(same(shown, key), `${where} ${shown} vs ${key}`).toBe(true);
      expect(isExpanded(key), where).toBe(true);
      expect(check(item.answer, shown), `${where} parentheses still accepted`).toEqual({ correct: false, form: "expanded" });
      return;
    }
    const right = ascii(chosen(item));
    expect(same(shown, right), `${where} ${shown} vs ${right}`).toBe(true);
    for (const c of item.choices!) if (c.label !== chosen(item) && level === 3) expect(same(shown, ascii(c.label)), `${where} ${c.label} also right`).toBe(false);
    if (level === 2) {
      const [p, q] = nums(shown);
      let g = 1;
      for (let d = 1; d <= Math.min(p, q); d++) if (p % d === 0 && q % d === 0) g = d;
      const outside = (label: string) => Number(/^(\d+)\(/.exec(ascii(label))![1]);
      expect(outside(right), `${where} not the greatest common factor`).toBe(g);
      // The coefficients left inside (an unwritten 1 counts) share no factor.
      const inside = /\((.*)\)/.exec(right)![1].split(" + ").map((term) => (/^[a-z]$/.test(term) ? 1 : parseInt(term, 10)));
      expect(inside.reduce((a, b) => gcd(a, b)), `${where} inside still shares a factor`).toBe(1);
      for (const c of item.choices!) if (c.label !== chosen(item)) expect(!same(shown, ascii(c.label)) || outside(c.label) < g, `${where} ${c.label} is also right`).toBe(true);
    }
  },

  "m.ineq.graph": (item, level, where) => {
    const t = words(item);
    if (level === 1) {
      const op = lookup(t, IN_WORDS, where);
      const c = nums(t)[0];
      const [, o, k] = /^[a-z] ([<>≤≥]) (-?\d+)$/.exec(ascii(chosen(item)))!;
      expect([o, Number(k)], `${where} ${t}`).toEqual([op, c]);
      expect(new Set(item.choices!.map((x) => x.label.split(" ")[1])).size, where).toBe(item.choices!.length);
      return;
    }
    const pad = item.pad;
    if (pad?.kind !== "number-line") throw new Error(`${where} needs a number-line pad`);
    expect(item.input, where).toBe("number-line");
    let op: string, c: number, least: boolean;
    if (level === 2) {
      const m = /x ([<>≤≥]) (-?\d+(?:\.\d+)?)/.exec(ascii(t))!;
      [op, c] = [m[1], Number(m[2])];
      least = /least|menor/.test(t);
    } else {
      op = lookup(t, PAD_WORDS, where);
      c = nums(t)[0];
      least = /lowest|coldest|más baj[ao]/.test(t);
      expect(/warmest|highest|más alt[ao]/.test(t), `${where} asks for neither end`).toBe(!least);
    }
    // Brute force over every tick on the pad.
    const fits = Array.from({ length: pad.max - pad.min + 1 }, (_, i) => pad.min + i).filter((v) => OPS[op](v, c));
    expect(keyValue(item), `${where} ${op} ${c}`).toBe(least ? Math.min(...fits) : Math.max(...fits));
    expect(fits.length > 0 && fits.length < pad.max - pad.min + 1, `${where} the edge of the pad decides`).toBe(true);
  },

  "m.percent.whole": (item, level, where) => {
    const t = words(item);
    const pct = /(\d+)%/.exec(t)!;
    const p = Number(pct[1]);
    const other = nums(t.replace(pct[0], ""))[0];
    const x = keyValue(item);
    if (level === 1) expect(x * 100, `${where} ${t}`).toBe(p * other);
    else expect(other * 100, `${where} ${t}`).toBe(p * x);
    expect(Number.isInteger(x) && Number.isInteger(other), where).toBe(true);
    if (level === 3) expect([5, 10, 20, 25, 50].includes(p), `${where} benchmark at level 3`).toBe(false);
  },

  "m.stats.center": (item, _level, where) => {
    const t = words(item);
    const x = keyValue(item);
    const list = /: ([\d, ]+)\./.exec(t);
    if (!list) {
      // The missing value: n values with a known mean; the third number says how many are listed.
      const n = nums(t);
      const k = n[2], known = n.slice(3);
      expect(known.length, `${where} ${t}`).toBe(k);
      const mean0 = n[0] === k + 1 ? n[1] : n[0];
      expect(known.reduce((s, v) => s + v, 0) + x, `${where} ${t}`).toBe((k + 1) * mean0);
      return;
    }
    const data = list[1].split(", ").map(Number);
    const s = sorted(data), n = data.length;
    if (/median|mediana/.test(t)) expect(x, where).toBe(n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2);
    else if (/mode|moda/.test(t)) {
      const counts = data.map((v) => data.filter((u) => u === v).length);
      const top = Math.max(...counts);
      expect(new Set(data.filter((_, i) => counts[i] === top)).size, `${where} two modes`).toBe(1);
      expect(x, where).toBe(data[counts.indexOf(top)]);
      expect(top, where).toBeGreaterThan(1);
    } else if (/range|rango/.test(t)) expect(x, where).toBe(Math.max(...data) - Math.min(...data));
    else {
      expect(/mean|media/.test(t), where).toBe(true);
      expect(near(x, mean(data)), where).toBe(true);
      expect(Number.isInteger(x), where).toBe(true);
    }
  },

  "m.volume.frac": (item, level, where) => {
    const v = values(item.prompt);
    const [l, w, h] = v;
    if (item.answer.kind === "number") {
      // Packing with cubes of edge e: count × e³ is the volume, and the count is whole.
      expect(level, where).toBe(2);
      const e = v[3];
      expect(near(item.answer.value * e ** 3, l * w * h), `${where} ${toExpr(item.prompt)}`).toBe(true);
      expect(Number.isInteger(item.answer.value), where).toBe(true);
      return;
    }
    expect(near(keyValue(item), l * w * h), `${where} ${toExpr(item.prompt)}`).toBe(true);
    const fractional = [l, w, h].filter((e) => !Number.isInteger(e)).length;
    if (level === 1) expect(fractional, where).toBe(1);
    else expect(fractional, where).toBeGreaterThanOrEqual(2);
  },

  "m.surface.area": (item, level, where) => {
    const t = words(item);
    const n = nums(t);
    const x = keyValue(item);
    if (level === 1) {
      // A cube's net: six s × s squares.
      const s = n[1];
      expect(x, where).toBe(Array.from({ length: 6 }, () => s * s).reduce((a, b) => a + b));
      if (item.visual?.kind !== "prism") throw new Error(where);
      expect([item.visual.l, item.visual.w, item.visual.h], where).toEqual([s, s, s]);
      return;
    }
    if (level === 2) {
      if (item.visual?.kind !== "prism") throw new Error(where);
      const { l, w, h } = item.visual;
      expect([l, w, h], where).toEqual(n.slice(0, 3));
      const faces = [l * w, l * w, l * h, l * h, w * h, w * h];
      expect(x, where).toBe(faces.reduce((a, b) => a + b));
      return;
    }
    if (/pyramid|pirámide/.test(t)) {
      const [b, , , h] = n;
      expect(h > b / 2, `${where} the triangles cannot meet`).toBe(true);
      expect(x, where).toBe(b * b + 4 * ((b * h) / 2));
    } else {
      const [, , a, b, c] = n, L = n[n.length - 1];
      expect(a * a + b * b, `${where} not a right triangle`).toBe(c * c);
      expect(x, where).toBe(2 * ((a * b) / 2) + a * L + b * L + c * L);
    }
  },

  "m.rational.addsub": (item, level, where) => {
    const x = keyValue(item);
    const t = toExpr(item.prompt);
    if (/ = \?$/.test(t)) {
      const expr = t.split(". ").pop()!.replace(/ = \?$/, "");
      expect(near(at(expr), x), `${where} ${expr} = ${x}`).toBe(true);
      expect(values(item.prompt).some((v) => v < 0) || x < 0, `${where} no negative number`).toBe(true);
      if (item.answer.kind === "fraction") simplestFraction(item, where);
      if (level === 1) expect(item.answer.kind, where).toBe("number");
      return;
    }
    expect(level, where).toBe(3);
    const n = nums(t.replace(/6 a\. ?m\./, ""));
    const [s, d] = n;
    const want = /risen|swims up|había subido|Sube nadando/.test(t) ? s + d : /warmer was the high|más alta fue la máxima/.test(t) ? s - d : s - d;
    expect(/fell|walks down|bajó|baja |warmer|más alta/.test(t) || /risen|swims up|subido|Sube/.test(t), `${where} unknown story`).toBe(true);
    expect(near(x, want), `${where} ${t}`).toBe(true);
    if (/diver|buzo/.test(t)) expect(x, `${where} the diver is above the water`).toBeLessThan(0);
  },

  "m.rational.multdiv": (item, level, where) => {
    const x = keyValue(item);
    const t = toExpr(item.prompt);
    if (level < 3) {
      const expr = t.split(". ").pop()!.replace(/ = \?$/, "");
      expect(near(at(expr), x), `${where} ${expr} = ${x}`).toBe(true);
      expect(values(item.prompt).some((v) => v < 0), `${where} no negative number`).toBe(true);
      if (level === 2) simplestFraction(item, where);
      if (/÷/.test(expr) && level === 1) {
        const [a, b] = nums(expr.replace(/[()]/g, ""));
        expect(near(x * b, a), `${where} multiply back`).toBe(true);
      }
      return;
    }
    const n = nums(t);
    // A total change given (negative) is shared per minute; otherwise a decrease repeats.
    const want = n[0] < 0 ? n[0] / n[1] : -(n[0] * n[1]);
    expect(near(x, want), `${where} ${t}`).toBe(true);
    expect(x, where).toBeLessThan(0);
  },

  "m.prop.constant": (item, level, where) => {
    const t = words(item);
    if (level === 1) {
      const xs = /x: ([\d., ]+)\./.exec(t)![1].split(", ").map(Number);
      const ys = /y: ([\d., ]+)\./.exec(t)![1].split(", ").map(Number);
      for (let i = 0; i < xs.length; i++) expect(near(ys[i] / xs[i], keyValue(item)), `${where} ${t}`).toBe(true);
      expect(xs.includes(1), `${where} the unit rate is shown`).toBe(false);
      return;
    }
    if (level === 2) {
      if (item.visual?.kind !== "line-graph") throw new Error(where);
      for (const [px, py] of item.visual.points) if (px) expect(near(py / px, keyValue(item)), where).toBe(true);
      expect(item.visual.points[0], where).toEqual([0, 0]);
      return;
    }
    const n = nums(t);
    const [total, count] = /tickets|boletos/.test(t) ? [n[1], n[0]] : [n[0], n[1]];
    const k = (label: string) => {
      const m = /^y = (\d+(?:\.\d+)?)x$/.exec(label);
      return m ? Number(m[1]) : NaN;
    };
    expect(near(k(chosen(item)) * count, total), `${where} ${t} → ${chosen(item)}`).toBe(true);
    for (const c of item.choices!) if (c.label !== chosen(item)) expect(near(k(c.label) * count, total), `${where} ${c.label} also right`).toBe(false);
  },

  "m.interest.simple": (item, _level, where) => {
    const t = words(item);
    const x = keyValue(item);
    if (/rate\?|tasa de interés anual/.test(t)) {
      const [I, P, years] = nums(t);
      expect(near(x, (I / (P * years)) * 100), `${where} ${t}`).toBe(true);
      return;
    }
    const P = Number(/\$([\d,]+)/.exec(t)![1].replace(/,/g, ""));
    const rate = Number(/(\d+)%/.exec(t)![1]) / 100;
    const months = /(\d+) (?:months|meses)/.exec(t);
    const years = months ? Number(months[1]) / 12 : Number(/(\d+) (?:years|year|años|año)/.exec(t)![1]);
    const I = P * rate * years;
    const total = /How much money|pay back|worth|¿Cuánto dinero|pagará la familia en total|valdrá/.test(t);
    expect(near(x, total ? P + I : I), `${where} ${t}`).toBe(true);
    expect(near(Math.round(x * 100), x * 100), `${where} not whole cents`).toBe(true);
  },

  "m.scale.drawing": (item, level, where) => {
    const n = nums(words(item));
    const x = keyValue(item);
    if (level === 1) {
      const [one, k, L] = n;
      expect(one, where).toBe(1);
      expect(near(x, L * k), `${where} ${words(item)}`).toBe(true);
    } else if (level === 2) {
      const [a, b, real] = n;
      expect(near(x * b, real * a), `${where} ${words(item)}`).toBe(true);
    } else {
      const [, k, w, h] = n;
      expect(x, `${where} ${words(item)}`).toBe(w * k * (h * k));
    }
  },

  "m.angles.pairs": (item, level, where) => {
    const t = words(item);
    const x = keyValue(item);
    if (level === 1) {
      const S = /supplementary|suplementarios/.test(t) ? 180 : 90;
      expect(/complementary|complementarios|supplementary|suplementarios/.test(t), where).toBe(true);
      expect(x + nums(t)[0], `${where} ${t}`).toBe(S);
      expect(x, where).toBeGreaterThan(0);
      return;
    }
    if (level === 2) {
      const a = nums(t)[0];
      const vertical = /vertical angle|por el vértice/.test(t);
      expect(vertical || /linear pair|par lineal/.test(t), where).toBe(true);
      expect(x, `${where} ${t}`).toBe(vertical ? a : 180 - a);
      return;
    }
    const exprs = [...ascii(t).matchAll(/\(([^()]*x[^()]*)\)°/g)].map((m) => m[1]);
    const angle = (e: string, v: number) => at(e, { x: v });
    if (/vertical|por el vértice/.test(t)) {
      expect(exprs.length, where).toBe(2);
      expect(near(angle(exprs[0], x), angle(exprs[1], x)), `${where} ${exprs}`).toBe(true);
      expect(near(angle(exprs[0], x + 1), angle(exprs[1], x + 1)), `${where} not unique`).toBe(false);
      expect(angle(exprs[0], x) > 0 && angle(exprs[0], x) < 180, where).toBe(true);
    } else {
      const S = /supplementary|suplementarios/.test(t) ? 180 : 90;
      expect(exprs.length, where).toBe(1);
      expect(near(x + angle(exprs[0], x), S), `${where} ${exprs[0]} at ${x}`).toBe(true);
      expect(angle(exprs[0], x), where).toBeGreaterThan(0);
    }
    expect(Number.isInteger(x) && x > 0, where).toBe(true);
  },

  "m.ineq.twostep": (item, level, where) => {
    const t = words(item);
    if (level < 3) {
      const m = /(?:of|de) (.+)\?$/.exec(ascii(toExpr(item.prompt)))!;
      const [lhs, op, rhs] = m[1].split(/ ([<>≤≥]) /);
      const truth = (v: number) => OPS[op](at(lhs, { x: v }), at(rhs, { x: v }));
      const holds = (label: string) => {
        const [, o, k] = /^x ([<>≤≥]) (-?\d+)$/.exec(ascii(label))!;
        return (v: number) => OPS[o](v, Number(k));
      };
      const grid = Array.from({ length: 401 }, (_, i) => -100 + i * 0.5);
      for (const v of grid) expect(holds(chosen(item))(v), `${where} ${m[1]} at x = ${v}`).toBe(truth(v));
      for (const c of item.choices!) if (c.label !== chosen(item)) expect(grid.some((v) => holds(c.label)(v) !== truth(v)), `${where} ${c.label} also right`).toBe(true);
      if (level === 2) expect(/-\s*\d*x/.test(lhs), `${where} no negative coefficient`).toBe(true);
      return;
    }
    const n = nums(t);
    // [the condition on n, greatest or least] for each story, read from its numbers in order.
    const story: [RegExp, (v: number) => boolean, boolean][] = [
      [/craft fair|feria de artesanías/, (v) => n[1] + n[2] * v <= n[0], true],
      [/counselor|consejero/, (v) => n[0] + n[1] * v >= n[2], false],
      [/lose|pierdes/, (v) => n[0] - n[1] * v >= n[2], true],
      [/elevator|elevador/, (v) => n[1] + n[2] * v <= n[0], true],
      [/rocket club|club de cohetes/, (v) => n[0] + n[2] * v >= n[1], false],
      [/swum|nadó/, (v) => n[0] + n[1] * v >= n[2], false],
    ];
    const [, ok, greatest] = story.find(([re]) => re.test(t))!;
    const fits = Array.from({ length: 300 }, (_, i) => i).filter(ok);
    expect(keyValue(item), `${where} ${t}`).toBe(greatest ? Math.max(...fits) : Math.min(...fits));
    expect(keyValue(item), where).toBeGreaterThan(0);
  },

  "m.prob.simple": (item, level, where, locale) => {
    const t = words(item);
    if (item.answer.kind === "choice") {
      const v = (label: string) => parseNumber(label)!.value;
      const likely = /likely, but not certain|probable, pero no seguro/.test(t);
      const fits = (p: number) => (likely ? p > 0.5 && p < 1 : p > 0 && p < 0.5);
      expect(fits(v(chosen(item))), `${where} ${chosen(item)}`).toBe(true);
      for (const c of item.choices!) if (c.label !== chosen(item)) expect(fits(v(c.label)), `${where} ${c.label} also fits`).toBe(false);
      return;
    }
    const x = keyValue(item);
    const n = nums(t);
    if (level === 1) {
      const NAMES_EN = [["is red", "is blue", "is green"], ["a pop song", "a rock song", "a jazz song"], ["cat card", "dog card", "bird card"], ["apple", "orange", "pear"], ["star sticker", "planet sticker", "rocket sticker"]];
      const NAMES_ES = [["sea roja", "sea azul", "sea verde"], ["sea de pop", "sea de rock", "sea de jazz"], ["carta de gatos", "carta de perros", "carta de pájaros"], ["una manzana", "una naranja", "una pera"], ["sea de estrellas", "sea de planetas", "sea de cohetes"]];
      const question = t.slice(t.search(/probability|probabilidad/));
      const table = locale === "en" ? NAMES_EN : NAMES_ES;
      const i = table.map((names) => names.findIndex((name) => question.includes(name))).find((k) => k >= 0)!;
      const counts = n.slice(0, 3);
      expect(near(x, counts[i] / (counts[0] + counts[1] + counts[2])), `${where} ${t}`).toBe(true);
      simplestFraction(item, where);
      return;
    }
    if (level === 2) {
      const N = Number(/(?:1 to|del 1 al) (\d+)/.exec(t)![1]);
      const k = n[n.length - 1];
      const test: (v: number) => boolean = /greater than or equal|mayor o igual/.test(t)
        ? (v) => v >= k
        : /greater than|mayor que/.test(t)
          ? (v) => v > k
          : /less than|menor que/.test(t)
            ? (v) => v < k
            : /multiple of|múltiplo de/.test(t)
              ? (v) => v % k === 0
              : /odd|impar/.test(t)
                ? (v) => v % 2 === 1
                : (v) => v % 2 === 0;
      const hits = Array.from({ length: N }, (_, i) => i + 1).filter(test).length;
      expect(near(x, hits / N), `${where} ${t}`).toBe(true);
      simplestFraction(item, where);
      return;
    }
    let p: number, T: number;
    if (/spinner|ruleta/.test(t)) [p, T] = [n[1] / n[0], n[2]];
    else if (/tiles|fichas/.test(t)) [p, T] = [n[0] / (n[0] + n[1]), n[2]];
    else {
      T = n[2];
      const ev = t.slice(t.lastIndexOf(String(T)) + String(T).length);
      const k = nums(ev)[0];
      const test: (v: number) => boolean = /greater than|mayor que/.test(ev) ? (v) => v > k : /less than|menor que/.test(ev) ? (v) => v < k : /even|par/.test(ev) ? (v) => v % 2 === 0 : (v) => v === k;
      p = [1, 2, 3, 4, 5, 6].filter(test).length / 6;
    }
    expect(near(x, p * T), `${where} ${t}`).toBe(true);
    expect(Number.isInteger(x), where).toBe(true);
  },

  "m.area.composite": (item, level, where) => {
    const t = words(item);
    const n = nums(t.replace(/3\.14/, ""));
    const x = keyValue(item);
    const pi = 3.14;
    let want: number;
    if (/painting|pintura/.test(t)) want = (n[0] + 2 * n[2]) * (n[1] + 2 * n[2]) - n[0] * n[1];
    else if (/lawn|macizo de flores/.test(t)) want = n[0] * n[1] - n[2] * n[3];
    else if (/patio/.test(t)) want = n[0] * n[1] + (n[1] * n[n.length - 1]) / 2;
    else if (/window|ventana/.test(t)) want = n[0] * n[1] + (pi * (n[0] / 2) ** 2) / 2;
    else if (/field|campo/.test(t)) want = n[0] * n[1] + pi * (n[1] / 2) ** 2;
    else if (/tile|azulejo/.test(t)) want = n[0] ** 2 - pi * (n[0] / 2) ** 2;
    else if (/pond|estanque/.test(t)) want = pi * (n[0] ** 2 - n[1] ** 2);
    else want = n[0] * n[1] - (pi * (n[2] / 2) ** 2) / 2;
    expect(near(x, want), `${where} ${t}: ${x} vs ${want}`).toBe(true);
    if (level === 1) expect(Number.isInteger(x), where).toBe(true);
    else {
      expect(t, where).toContain("3.14");
      if (item.answer.kind === "number") expect(item.answer.tolerance, where).toBe(0.05);
    }
  },
};

const TABLE: [string, string, string, string[], number][] = [
  ["m.dec.ops", "6", "6.NS.B.3", ["m.dec.addsub", "m.dec.mult", "m.div.long"], 3],
  ["m.rational.order", "6", "6.NS.C.7", ["m.int.numberline", "m.frac.compare", "m.dec.tenths"], 3],
  ["m.coord.plane", "6", "6.NS.C.8", ["m.int.numberline"], 3],
  ["m.expr.write", "6", "6.EE.A.2a", ["m.expr.eval"], 3],
  ["m.expr.equiv", "6", "6.EE.A.3", ["m.expr.eval", "m.gcf.lcm"], 3],
  ["m.ineq.graph", "6", "6.EE.B.8", ["m.int.numberline", "m.expr.write"], 3],
  ["m.percent.whole", "6", "6.RP.A.3c", ["m.percent"], 3],
  ["m.stats.center", "6", "6.SP.B.5c", ["m.div.long", "m.dec.ops"], 3],
  ["m.volume.frac", "6", "6.G.A.2", ["m.volume", "m.frac.mult"], 2],
  ["m.surface.area", "6", "6.G.A.4", ["m.area.poly"], 3],
  ["m.rational.addsub", "7", "7.NS.A.1d", ["m.int.addsub", "m.frac.addunlike", "m.dec.ops"], 3],
  ["m.rational.multdiv", "7", "7.NS.A.2c", ["m.int.multdiv", "m.frac.div", "m.dec.ops"], 3],
  ["m.prop.constant", "7", "7.RP.A.2b", ["m.ratio.unit", "m.proportion"], 3],
  ["m.interest.simple", "7", "7.RP.A.3", ["m.percent.change"], 2],
  ["m.scale.drawing", "7", "7.G.A.1", ["m.proportion"], 3],
  ["m.angles.pairs", "7", "7.G.B.5", ["m.eq.twostep"], 3],
  ["m.ineq.twostep", "7", "7.EE.B.4b", ["m.ineq.onestep", "m.eq.twostep"], 3],
  ["m.prob.simple", "7", "7.SP.C.7a", ["m.ratio.equiv"], 3],
  ["m.area.composite", "7", "7.G.B.6", ["m.area.poly", "m.circle"], 3],
];

const TAG = /^[a-z]+(?:-[a-z0-9]+)*$/;

describe("grades 6–7 math strand, part two", () => {
  it("matches the skill table, in teaching order", () => {
    expect(MATH_6_7_MORE.map((s) => [s.id, s.grade, s.standard, s.prereqs, s.levels])).toEqual(TABLE);
    for (const s of MATH_6_7_MORE) expect([s.subject, s.content], s.id).toEqual(["math", "computed"]);
  });

  it("has an independent check for every skill", () => {
    expect(Object.keys(VERIFY).sort()).toEqual(MATH_6_7_MORE.map((s) => s.id).sort());
  });

  describe.each(MATH_6_7_MORE.map((s) => [s.id, s] as const))("%s", (id, skill) => {
    it(`keys survive an independent check (${SEEDS.length} seeds per level, both languages)`, () => {
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of SEEDS)
          for (const locale of LOCALES) {
            const item = makeItem(id, level, seed, locale);
            VERIFY[id](item, level, `${id} L${level} seed ${seed} ${locale}`, locale);
          }
    });

    it("tags every wrong choice and every likely wrong value with a misconception", () => {
      const uses = new Map<string, number>();
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of SEEDS)
          for (const locale of LOCALES) {
            const item = makeItem(id, level, seed, locale);
            const where = `${id} L${level} seed ${seed} ${locale}`;
            if (item.input === "choices") {
              item.choices!.forEach((c, i) => {
                if (i === (item.answer as { index: number }).index) expect(c.why, `${where} the right choice has a tag`).toBeUndefined();
                else {
                  expect(c.why, `${where} ${c.label} has no tag`).toMatch(TAG);
                  expect(c.why!.length, `${where} tag ${c.why} is over 40 characters`).toBeLessThanOrEqual(40);
                  uses.set(c.why!, (uses.get(c.why!) ?? 0) + 1);
                }
              });
              expect(item.wrong, where).toBeUndefined();
              continue;
            }
            const wrong = item.wrong ?? [];
            expect(wrong.length, `${where} no likely wrong values`).toBeGreaterThanOrEqual(1);
            expect(new Set(wrong.map((x) => x.value)).size, `${where} repeated wrong values`).toBe(wrong.length);
            for (const { value, why } of wrong) {
              expect(why, where).toMatch(TAG);
              expect(why.length, where).toBeLessThanOrEqual(40);
              uses.set(why, (uses.get(why) ?? 0) + 1);
              expect(check(item.answer, value).correct, `${where} wrong value ${value} is accepted`).toBe(false);
              // Every wrong value can actually be entered with this item's input.
              if (item.answer.kind === "number" || item.answer.kind === "fraction") {
                expect(parseNumber(value), `${where} ${value} does not parse`).not.toBeNull();
                if (item.input === "keypad") {
                  expect(value, where).toMatch(/^-?\d+(\.\d+)?$/);
                  if (value.includes("-")) expect(item.keys, `${where} ${value} needs the minus key`).toContain("-");
                  if (value.includes(".")) expect(item.keys, `${where} ${value} needs the decimal key`).toContain(".");
                }
                if (item.input === "fraction") {
                  expect(value, where).toMatch(/^-?\d+(\/\d+)?$/);
                  if (value.includes("-")) expect(item.keys, `${where} ${value} needs the minus key`).toContain("-");
                }
                if (item.input === "number-line" && item.pad?.kind === "number-line") {
                  const v = parseNumber(value)!.value, { min, max, step } = item.pad;
                  expect(v >= min && v <= max, `${where} ${value} is off the pad`).toBe(true);
                  expect(near((v - min) / step, Math.round((v - min) / step)), `${where} ${value} is between ticks`).toBe(true);
                }
              }
              if (item.answer.kind === "expr") expect(parse(value), `${where} ${value} does not parse`).not.toBeNull();
              if (item.answer.kind === "pair") expect(value, where).toMatch(/^\(-?\d+, -?\d+\)$/);
            }
          }
      // Tags name recurring mistakes, so each one shows up across many items, not once.
      for (const [why, n] of uses) expect(n, `${id}: tag ${why} used once`).toBeGreaterThan(1);
    });

    it("uses the touch pads correctly", () => {
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of SEEDS) {
          const item = makeItem(id, level, seed, "en");
          const where = `${id} L${level} seed ${seed}`;
          if (item.input !== "number-line") {
            expect(item.pad, where).toBeUndefined();
            continue;
          }
          const pad = item.pad;
          if (pad?.kind !== "number-line") throw new Error(`${where} number-line input without its pad`);
          expect(["number", "fraction"], where).toContain(item.answer.kind);
          const v = keyValue(item);
          expect(pad.min < pad.max && v >= pad.min && v <= pad.max, `${where} the key is off the pad`).toBe(true);
          expect(near((v - pad.min) / pad.step, Math.round((v - pad.min) / pad.step)), `${where} the key is between ticks`).toBe(true);
          // The pad answers by tapping, so the typed form of the key must be what a tap sends.
          expect(check(item.answer, answerText(item.answer)).correct, where).toBe(true);
          expect(item.visual, `${where} a picture would show the answer`).toBeUndefined();
        }
    });

    it("follows the copy rules and asks the same problem in both languages", () => {
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of SEEDS) {
          const [en, es] = LOCALES.map((l) => makeItem(id, level, seed, l));
          const where = `${id} L${level} seed ${seed}`;
          expect(es.answer, `${where} answer differs by language`).toEqual(en.answer);
          expect(es.choices?.map((c) => c.label), where).toEqual(en.choices?.map((c) => c.label));
          expect(es.choices?.map((c) => c.why), where).toEqual(en.choices?.map((c) => c.why));
          expect(es.wrong, `${where} wrong values differ by language`).toEqual(en.wrong);
          expect(es.pad, where).toEqual(en.pad);
          expect(es.say, `${where} Spanish say missing`).not.toBe(en.say);
          expect(es.hints[1], `${where} Spanish hint missing`).not.toBe(en.hints[1]);
          for (const item of [en, es]) {
            expect(item.hints.length, where).toBe(3);
            expect(item.steps.length, where).toBeGreaterThanOrEqual(1);
            expect(item.steps.length, where).toBeLessThanOrEqual(4);
            for (const s of [...item.hints, ...item.steps]) expect(s.trim(), where).not.toBe("");
            const copy = [item.say, item.alt ?? "", ...item.hints, ...item.steps, ...item.prompt.filter((p): p is string => typeof p === "string"), ...(item.choices ?? []).map((c) => c.say ?? "")];
            for (const s of copy) {
              expect(s, `${where} exclamation or praise`).not.toMatch(/!|great job|good job|awesome|¡|excellent|excelente/i);
              expect(s, `${where} undefined or NaN in copy`).not.toMatch(/undefined|NaN|null/);
            }
            // Read-aloud is speech: no symbols or unit abbreviations a voice would spell out.
            expect(item.say, `${where} say has symbols: ${item.say}`).not.toMatch(/[−×÷$|²³π%^{}/≈<>≤≥]|\d\/\d|°/);
            expect(item.say, `${where} say has a unit abbreviation: ${item.say}`).not.toMatch(/\d (?:cm|km|ft|mi|pulg)(?=[\s.,;?]|$)/);
            for (const c of item.choices ?? []) expect(c.say ?? "", `${where} choice say: ${c.say}`).not.toMatch(/[−×÷$|²³π%^{}/≈<>≤≥]|\d\/\d|°/);
            // The hint ladder never states the final answer as its last step.
            const key = answerText(item.answer, item.choices);
            expect(item.hints[2].endsWith(`= ${key}`) || item.hints[2].endsWith(`= ${key}.`), `${where} hint gives ${key}`).toBe(false);
            if (item.answer.kind === "number" && item.input === "keypad") {
              if (item.answer.value < 0) expect(item.keys, `${where} needs the minus key`).toContain("-");
              if (!Number.isInteger(item.answer.value)) expect(item.keys, `${where} needs the decimal key`).toContain(".");
            }
            if (item.answer.kind === "fraction" && item.answer.n < 0 && item.input === "fraction") expect(item.keys, `${where} needs the minus key`).toContain("-");
            if (item.visual) expect(item.alt?.trim(), `${where} alt`).toBeTruthy();
            expect(item.seconds, where).toBeGreaterThanOrEqual(8);
            expect(item.seconds, where).toBeLessThanOrEqual(90);
          }
        }
    });
  });
});

// ---------- rare cases, over many more seeds ----------

/** Rare items (a whole-number fraction key, a median with equal middle values) slip through 220 seeds. */
const WIDE = Array.from({ length: 3000 }, (_, i) => i * 7727 + 3);

describe("grades 6–7 math strand, part two, over 3000 seeds", () => {
  describe.each(MATH_6_7_MORE.map((s) => [s.id, s] as const))("%s", (id, skill) => {
    it("every fraction-pad key can be entered on the pad, and every typed item names a likely wrong value", () => {
      for (let level = 1; level <= skill.levels; level++)
        for (const seed of WIDE) {
          const item = makeItem(id, level, seed, "en");
          const where = `${id} L${level} seed ${seed}`;
          if (item.input !== "choices") expect(item.wrong?.length ?? 0, `${where} no likely wrong values`).toBeGreaterThanOrEqual(1);
          if (item.input === "fraction") {
            // The fraction pad always sends "n/d" or "w n/d": a whole-number key could never be marked right.
            if (item.answer.kind !== "fraction") throw new Error(`${where} fraction input without a fraction key`);
            const { n, d } = item.answer;
            expect(d / gcd(Math.abs(n), d), `${where} the key ${n}/${d} is a whole number`).not.toBe(1);
            expect(check(item.answer, `${n}/${d}`).correct, where).toBe(true);
            if (Math.abs(n) > d) expect(check(item.answer, `${n < 0 ? "-" : ""}${Math.floor(Math.abs(n) / d)} ${Math.abs(n) % d}/${d}`).correct, `${where} mixed`).toBe(true);
          }
          if (id === "m.stats.center" && /median/.test(words(item))) {
            const data = /: ([\d, ]+)\./.exec(words(item))![1].split(", ").map(Number);
            const s = sorted(data), k = data.length;
            // An even count has two different middle values; an odd count does not keep its median in the middle unsorted.
            if (k % 2 === 0) expect(s[k / 2 - 1], `${where} equal middle values`).not.toBe(s[k / 2]);
            else expect(data[(k - 1) / 2], `${where} the median is already in the middle`).not.toBe(s[(k - 1) / 2]);
          }
        }
    });
  });
});

// ---------- the wording and realism fixes ----------

const PLACES: Record<string, number> = { ones: 0, tenths: 1, hundredths: 2, thousandths: 3, unidades: 0, décimos: 1, centésimos: 2, milésimos: 3 };
const OP_CHOICES: [RegExp, RegExp][] = [
  [/means add|significa sumar/, /\+/],
  [/means subtract|significa restar/, /−/],
  [/means multiply|significa multiplicar/, /^\d+[a-z]$|[⁰¹²³⁴⁵⁶⁷⁸⁹]/],
  [/means divide|significa dividir/, /÷/],
];

describe("grades 6–7 math strand, part two: wording and believable numbers", () => {
  const each = (id: string, level: number, f: (item: Item, where: string, locale: "en" | "es") => void) => {
    for (const seed of SEEDS) for (const locale of LOCALES) f(makeItem(id, level, seed, locale), `${id} L${level} seed ${seed} ${locale}`, locale);
  };

  it("m.dec.ops: the third hint works a column that regroups, or shows how the numbers line up, never a written-in zero alone", () => {
    each("m.dec.ops", 1, (item, where) => {
      const t = toExpr(item.prompt).replace(/ = \?$/, "");
      const [sa, op, sb] = t.split(" ");
      const places = (x: string) => (x.split(".")[1] ?? "").length;
      const P = Math.max(places(sa), places(sb));
      // place: 0 ones, 1 tenths…; a number with fewer decimal places has a written-in zero there.
      const digitAt = (x: string, place: number) => {
        if (place > places(x)) return { d: 0, padded: true };
        const units = Math.round(Number(x) * 10 ** places(x));
        return { d: Math.floor(units / 10 ** (places(x) - place)) % 10, padded: false };
      };
      const m = /^(\p{L}+): (\d)(?: [+−] | is less than | es menor que )(\d)/u.exec(item.hints[2]);
      if (!m) throw new Error(`${where} hint 3 is not a column: ${item.hints[2]}`);
      const place = PLACES[m[1].toLowerCase()];
      expect(place, `${where} ${m[1]}`).toBeLessThanOrEqual(P);
      const [x, y] = [digitAt(sa, place), digitAt(sb, place)];
      expect([x.d, y.d], `${where} ${item.hints[2]} vs ${t}`).toEqual([Number(m[2]), Number(m[3])]);
      const regroups = (u: number, v: number) => (op === "+" ? u + v >= 10 : u < v);
      if (x.padded || y.padded) expect(regroups(x.d, y.d), `${where} a written-in zero column that does not regroup: ${item.hints[2]}`).toBe(true);
      // Every column to its right goes through without regrouping, so this is the first one to think about.
      for (let q = place + 1; q <= P; q++) expect(regroups(digitAt(sa, q).d, digitAt(sb, q).d), `${where} an earlier column regroups`).toBe(false);
    });
  });

  it("m.rational.order: the read-aloud compares two numbers, and an equal pair's third hint stops at the conversion", () => {
    each("m.rational.order", 2, (item, where) => {
      expect(item.say, where).toMatch(/^(?:Compare .+ with .+\.|Compara .+ con .+\.)$/);
      if (chosen(item) === "=") expect(item.hints[2], `${where} hint 3 shows they are equal`).not.toMatch(/=/);
    });
  });

  it("m.expr.write: when the third hint names an operation, more than one choice uses it", () => {
    each("m.expr.write", 1, (item, where) => {
      for (const [word, uses] of OP_CHOICES)
        if (word.test(item.hints[2])) expect(item.choices!.filter((c) => uses.test(c.label)).length, `${where} ${item.hints[2]}`).toBeGreaterThanOrEqual(2);
      // The Spanish keeps the "less than" trap without reading as a comparison ("3 menos que k").
      expect(words(item), where).not.toMatch(/“\d+ (?:más|menos) que [a-z]”|“[a-z] menos que \d+”/);
    });
    each("m.expr.write", 2, (item, where) => expect(words(item), where).not.toMatch(/\d (?:más|menos) que el producto/));
  });

  it("read-aloud and prompts agree in number and gender, and Spanish speech names the letter y", () => {
    for (const s of MATH_6_7_MORE)
      for (let level = 1; level <= s.levels; level++)
        each(s.id, level, (item, where, locale) => {
          // One degree, one point: singular (an angle written "3x + 1" is still "3 x plus 1 degrees").
          for (const t of [item.say, words(item), ...(item.choices ?? []).map((c) => c.say ?? "")])
            expect(t, where).not.toMatch(/(?<![\d.])(?<!x (?:plus|minus|más|menos) )1 (?:degrees|grados|points|puntos)\b|Tócala/);
          if (locale === "es") {
            // Text-to-speech reads a lone "y" as "and": the variable is spoken "ye".
            expect(item.say, `${where} ${item.say}`).not.toMatch(/(?:eje|coordenada|costo|distancia|páginas|azúcar|comida) y\b|\by (?:es igual a|=)/);
            for (const c of item.choices ?? []) expect(c.say ?? "", where).not.toMatch(/^y |\by$/);
          }
          if (s.id === "m.surface.area") expect(item.say, where).not.toMatch(/\d+ (?:meters|inches|feet|centimeters) and \d+ \w+ sides/);
        });
  });

  it("the stories use believable sizes, speeds, temperatures and pay", () => {
    each("m.volume.frac", 1, (item, where) => {
      const edges = values(item.prompt).slice(0, 3);
      if (/fish tank|pecera/.test(words(item))) for (const e of edges) expect(e, `${where} a tiny fish tank`).toBeGreaterThanOrEqual(8);
      if (/ cm /.test(words(item))) for (const e of edges) expect(e, `${where} a box under 3 cm`).toBeGreaterThanOrEqual(3);
    });
    for (const level of [1, 2]) each("m.volume.frac", level, (item, where) => expect(values(item.prompt).slice(0, 3).every((e) => e >= 1), where).toBe(true));
    each("m.rational.addsub", 3, (item, where) => {
      if (/°/.test(words(item))) for (const v of nums(words(item).replace(/6 a\. ?m\./, ""))) expect(near(Math.round(v * 10), v * 10), `${where} temperature in hundredths`).toBe(true);
    });
    for (const level of [1, 2, 3])
      each("m.prop.constant", level, (item, where) => {
        if (/meters swum|metros nadados/.test(words(item))) expect(words(item), `${where} swim speed per second`).not.toMatch(/second|segundo/);
      });
    each("m.stats.center", 3, (item, where) => expect(words(item), where).not.toMatch(/quarter|cuarto/));
    each("m.ineq.twostep", 3, (item, where) => {
      if (/counselor|consejero/.test(words(item))) expect(nums(words(item))[0], `${where} weekly pay`).toBeGreaterThanOrEqual(200);
    });
    each("m.ineq.graph", 3, (item, where) => {
      expect(words(item), where).not.toMatch(/seed|semillas/);
      if (/sleeping bag|bolsa de dormir/.test(words(item))) expect(nums(words(item))[0], `${where} a rating above freezing`).toBeLessThan(0);
    });
  });
});
