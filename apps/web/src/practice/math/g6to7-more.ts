import type { Locale } from "@/lib/types";
import { check } from "../answer";
import { gcd, type Rng } from "../rng";
import { sayFrac, show, tr } from "../text";
import type { Answer, Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 6–7, second strand: decimal fluency, rational numbers on the line and the plane, writing and
// rewriting expressions, inequalities, percent problems, data, volume and surface area; then signed
// fractions and decimals, proportional relationships, interest, scale, angles, two-step inequalities,
// probability and composite area. Every key is computed from whole numbers: a decimal is whole units
// ÷ 10^k (one division, so it displays exactly), a fraction is an integer pair, money is whole cents.
// Every wrong choice and every likely wrong typed value names the mistake it shows (authoring rule 16),
// and a typed wrong value is kept only when the checker really rejects it.

const NAMES = ["Maya", "Diego", "Aisha", "Kenji", "Priya", "Luis", "Amara", "Sofía", "Noah", "Mei", "Omar", "Grace", "Tomás", "Zoe", "Ravi", "Lena", "Kwame", "Yuki", "Fatima", "Mateo", "Hana", "Arjun", "Nia", "Elena", "Jamal", "Inés"];
/** Letters for unknowns. Not "a" or "y": read aloud in Spanish they sound like words ("to", "and"). */
const VARS = ["x", "n", "k", "m", "t", "p"];

const frac = (n: number | string, d: number | string): MathPart => ({ frac: [n, d] });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function nonzero(r: Rng, min: number, max: number) {
  let n = 0;
  while (n === 0) n = r.int(min, max);
  return n;
}
/** A signed number read aloud the way a class says it: "negative 2.5" / "menos 2.5". */
const sayN = (n: number, locale: Locale) => (n < 0 ? tr(locale, `negative ${-n}`, `menos ${-n}`) : String(n));
/** Digits in groups of three: 1200 → "1,200". */
const groups = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ---------- decimals: whole units and a number of places ----------

const TEN = [1, 10, 100, 1000, 10000];
/** A decimal from whole units: dv(345, 2) = 3.45. One division, so String() shows exactly 3.45. */
const dv = (units: number, places: number) => units / TEN[places];
/** A decimal with a true minus sign: −2.75. */
const showD = (v: number) => (v < 0 ? `−${String(-v)}` : String(v));
/** After an operation sign a negative number goes in parentheses: 2.5 − (−1.25). */
const parD = (v: number) => (v < 0 ? `(${showD(v)})` : showD(v));
/** Whole units with exactly `places` decimal places (the last digit is not 0). */
function decUnits(r: Rng, lo: number, hi: number, places: number) {
  let u = r.int(lo, hi);
  while (places > 0 && u % 10 === 0) u = r.int(lo, hi);
  return u;
}
/** Units at `places` written with `to` places, for lining up: padD(35, 1, 2) = "3.50". */
function padD(units: number, places: number, to: number) {
  const s = String(Math.abs(units) * TEN[to - places]).padStart(to + 1, "0");
  return `${units < 0 ? "−" : ""}${to ? `${s.slice(0, -to)}.${s.slice(-to)}` : s}`;
}

// ---------- fractions: reduced integer pairs ----------

type Q = [number, number];
function qr(n: number, d: number): Q {
  const g = gcd(n, d) || 1, s = d < 0 ? -1 : 1;
  return [(s * n) / g + 0, (s * d) / g];
}
const qAdd = (a: Q, b: Q) => qr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const qSub = (a: Q, b: Q) => qr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const qMul = (a: Q, b: Q) => qr(a[0] * b[0], a[1] * b[1]);
const qDiv = (a: Q, b: Q) => qr(a[0] * b[1], a[1] * b[0]);
const qNeg = (a: Q): Q => [-a[0] + 0, a[1]];
const qAbs = (a: Q): Q => [Math.abs(a[0]), a[1]];
const qEq = (a: Q, b: Q) => a[0] * b[1] === b[0] * a[1];
const qLess = (a: Q, b: Q) => a[0] * b[1] < b[0] * a[1];
const qVal = (a: Q) => a[0] / a[1];
/** How a learner types it: "-5/12", or "3" for a whole number. */
const qTyped = ([n, d]: Q) => (d === 1 ? String(n) : `${n}/${d}`);
/** Inline text for hints, steps and choice labels: "−3/4", "−1 2/3", "2". */
function qShow([n, d]: Q, mixed = true) {
  const sign = n < 0 ? "−" : "", a = Math.abs(n);
  if (d === 1) return `${sign}${a}`;
  if (mixed && a > d) return `${sign}${Math.floor(a / d)} ${a % d}/${d}`;
  return `${sign}${a}/${d}`;
}
/** Prompt parts with a stacked fraction: −1 2/3 → ["−1", ⅔], −3/4 → ["−", ¾]. */
function qParts([n, d]: Q, mixed = true): MathPart[] {
  const sign = n < 0 ? "−" : "", a = Math.abs(n);
  if (d === 1) return [`${sign}${a}`];
  if (mixed && a > d) return [`${sign}${Math.floor(a / d)}`, frac(a % d, d)];
  return sign ? [sign, frac(a, d)] : [frac(a, d)];
}
/** Read aloud: "negative 3 fourths", "1 and 2 thirds", "menos 1 y medio". */
function sayQ([n, d]: Q, locale: Locale, mixed = true) {
  const sign = n < 0 ? tr(locale, "negative ", "menos ") : "", a = Math.abs(n);
  if (d === 1) return `${sign}${a}`;
  if (mixed && a > d) {
    const part = locale === "es" && d === 2 ? "medio" : sayFrac(a % d, d, locale);
    return `${sign}${Math.floor(a / d)} ${tr(locale, "and", "y")} ${part}`;
  }
  return `${sign}${sayFrac(a, d, locale)}`;
}
/** The decimal for a fraction whose denominator divides 1000, else null. */
function qDec([n, d]: Q): number | null {
  for (let p = 0; p <= 3; p++) if ((TEN[p] * n) % d === 0) return dv((TEN[p] * n) / d, p);
  return null;
}

// ---------- money and read-aloud ----------

/** Whole cents as a price: 450 → "$4.50", 120000 → "$1,200". */
const money = (cents: number) => `$${groups(Math.floor(cents / 100))}${cents % 100 ? `.${String(cents % 100).padStart(2, "0")}` : ""}`;
function sayMoney(cents: number, locale: Locale) {
  const d = Math.floor(cents / 100), c = cents % 100;
  const dollars = tr(locale, d === 1 ? "1 dollar" : `${groups(d)} dollars`, d === 1 ? "1 dólar" : `${groups(d)} dólares`);
  const pennies = tr(locale, c === 1 ? "1 cent" : `${c} cents`, c === 1 ? "1 centavo" : `${c} centavos`);
  if (!c) return dollars;
  if (!d) return pennies;
  return `${dollars} ${tr(locale, "and", "con")} ${pennies}`;
}
/** A sentence as speech: prices, percents, degrees, π and negative numbers in words. */
function speak(s: string, locale: Locale) {
  return s
    .replace(/\$(\d{1,3}(?:,\d{3})*)(?:\.(\d\d))?/g, (_, d: string, c?: string) => sayMoney(Number(d.replace(/,/g, "")) * 100 + Number(c ?? 0), locale))
    .replace(/(\d+(?:\.\d+)?)%/g, (_, n: string) => `${n} ${tr(locale, "percent", "por ciento")}`)
    .replace(/Use π ≈ 3\.14/g, "Use 3.14 for pi")
    .replace(/Usa π ≈ 3\.14/g, "Usa 3.14 para pi")
    // A number of degrees: "1 degree", "−1 degree", "2.5 degrees".
    .replace(/(\d+(?:\.\d+)?) ?°([CF]?)/g, (_, n: string, u: string) => `${n} ${n === "1" ? tr(locale, "degree", "grado") : tr(locale, "degrees", "grados")}${u === "C" ? " Celsius" : u === "F" ? " Fahrenheit" : ""}`)
    .replace(/ ?°F/g, tr(locale, " degrees Fahrenheit", " grados Fahrenheit"))
    .replace(/ ?°C/g, tr(locale, " degrees Celsius", " grados Celsius"))
    .replace(/ ?°/g, tr(locale, " degrees", " grados"))
    .replace(/−(\d)/g, `${tr(locale, "negative", "menos")} $1`);
}

/**
 * Hints and steps that name the letter y. A line is text, or a function of how the letter is written:
 * "y" on screen, and "ye" in the Spanish read-aloud, where a lone "y" is heard as "and".
 */
type Lettered = string | ((Y: string) => string);
function withY(locale: Locale, hints: Lettered[], steps: Lettered[]): Pick<ItemBody, "hints" | "hintsSay" | "steps" | "stepsSay"> {
  const write = (lines: Lettered[], Y: string) => lines.map((l) => (typeof l === "string" ? l : l(Y)));
  const body = { hints: write(hints, "y"), steps: write(steps, "y") };
  return locale === "es" ? { ...body, hintsSay: write(hints, "ye"), stepsSay: write(steps, "ye") } : body;
}

// ---------- choices and tagged wrong values ----------

function withChoices(r: Rng, right: Choice, wrong: Choice[]): Pick<ItemBody, "choices" | "input" | "answer"> {
  const list = [right];
  for (const c of wrong) if (list.length < 4 && !list.some((x) => x.label === c.label)) list.push(c);
  const choices = r.shuffle(list);
  return { choices, input: "choices", answer: { kind: "choice", index: choices.findIndex((c) => c.label === right.label) } };
}

type Wrong = { value: string; why: string };
/** A likely wrong typed value: numbers as typed ("-2.5"), fractions as "n/d". */
const w = (value: number | string | Q, why: string): Wrong => ({ value: typeof value === "number" ? String(value) : typeof value === "string" ? value : qTyped(value), why });
/** Keeps the wrong values the checker really rejects, once each. */
function wrongFor(answer: Answer, list: (Wrong | false | null | undefined)[]): Wrong[] {
  const out: Wrong[] = [];
  for (const x of list) if (x && !x.value.includes("NaN") && !out.some((o) => o.value === x.value) && !check(answer, x.value).correct) out.push(x);
  return out;
}

type Unit = { en: string; es: string; word: [string, string]; one: [string, string]; sq: [string, string]; cube: [string, string] };
const UNITS: Unit[] = [
  { en: "cm", es: "cm", word: ["centimeters", "centímetros"], one: ["centimeter", "centímetro"], sq: ["square centimeters", "centímetros cuadrados"], cube: ["cubic centimeters", "centímetros cúbicos"] },
  { en: "m", es: "m", word: ["meters", "metros"], one: ["meter", "metro"], sq: ["square meters", "metros cuadrados"], cube: ["cubic meters", "metros cúbicos"] },
  { en: "in", es: "pulg", word: ["inches", "pulgadas"], one: ["inch", "pulgada"], sq: ["square inches", "pulgadas cuadradas"], cube: ["cubic inches", "pulgadas cúbicas"] },
  { en: "ft", es: "pies", word: ["feet", "pies"], one: ["foot", "pie"], sq: ["square feet", "pies cuadrados"], cube: ["cubic feet", "pies cúbicos"] },
];

// ---------- m.dec.ops ----------

const PLACE: [string, string][] = [["ones", "unidades"], ["tenths", "décimos"], ["hundredths", "centésimos"], ["thousandths", "milésimos"]];
const UNIT_RANGE: [number, number][] = [[2, 60], [11, 600], [101, 6000], [1001, 20000]];
const PLACE_PAIRS: [number, number][] = [[1, 2], [2, 1], [1, 2], [2, 1], [0, 2], [2, 0], [0, 1], [1, 1], [2, 2], [1, 3]];

/** Column by column with no regrouping: adds without carrying, or takes the smaller digit from the larger in every column. */
function noRegroup(a0: number, b0: number, add: boolean) {
  let out = 0, a = a0, b = b0;
  for (let place = 1; a > 0 || b > 0; place *= 10) {
    const x = a % 10, y = b % 10;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
    // The leftmost column is written in full (6 + 5 → 11), the way a learner who never carries writes it.
    out += (add ? (a || b ? (x + y) % 10 : x + y) : Math.abs(x - y)) * place;
  }
  return out;
}

function decAddSub(r: Rng, locale: Locale): ItemBody {
  const add = r.bool();
  let pa: number, pb: number, A: number, B: number, P: number, Ai: number, Bi: number;
  do {
    [pa, pb] = r.pick(PLACE_PAIRS);
    A = decUnits(r, ...UNIT_RANGE[pa], pa);
    B = decUnits(r, ...UNIT_RANGE[pb], pb);
    P = Math.max(pa, pb);
    Ai = A * TEN[P - pa];
    Bi = B * TEN[P - pb];
  } while ((!add && Ai <= Bi) || (pa === pb && noRegroup(Ai, Bi, add) === (add ? Ai + Bi : Ai - Bi)));
  const R = add ? Ai + Bi : Ai - Bi, res = dv(R, P);
  const a = dv(A, pa), b = dv(B, pb), op = add ? "+" : "−";
  const aP = padD(A, pa, P), bP = padD(B, pb, P);
  const answer: Answer = { kind: "number", value: res };
  const places = (k: number) => tr(locale, k === 1 ? "1 decimal place" : `${k} decimal places`, k === 1 ? "1 cifra decimal" : `${k} cifras decimales`);
  // The third hint works the column that matters: the first one (from the right) that regroups, or, when
  // none does, the column of the shorter number's last digit, which shows how the two numbers line up.
  // (The rightmost column is often a written-in zero, which teaches neither.) The leftmost column never
  // regroups: its sum is written in full.
  const digit = (u: number, i: number) => Math.floor(u / TEN[i]) % 10;
  const cols = Math.max(String(Ai).length, String(Bi).length);
  let ci = Array.from({ length: cols - 1 }, (_, i) => i).find((i) => (add ? digit(Ai, i) + digit(Bi, i) >= 10 : digit(Ai, i) < digit(Bi, i)));
  ci ??= P - Math.min(pa, pb);
  const x = digit(Ai, ci), y = digit(Bi, ci), col = tr(locale, cap(PLACE[P - ci][0]), cap(PLACE[P - ci][1]));
  return {
    prompt: [`${showD(a)} ${op} ${showD(b)} = `, { blank: true }],
    say: `${a} ${add ? tr(locale, "plus", "más") : tr(locale, "minus", "menos")} ${b}`,
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongFor(answer, [
      // 21.55 + 25 written with the 25 under the 55.
      pa !== pb && (add || pa > 0) && A !== B && w(dv(add ? A + B : Math.abs(A - B), P), "lined-up-the-last-digits"),
      // 12 − 3.75 written as 12 − 3 with the .75 copied down.
      !add && pa === 0 && w(dv((A - Math.floor(Bi / TEN[P])) * TEN[P] + (Bi % TEN[P]), P), "copied-the-decimal-digits-down"),
      w(dv(noRegroup(Ai, Bi, add), P), add ? "forgot-to-regroup" : "took-smaller-digit-from-larger"),
    ]),
    hints: [
      tr(locale, "Line up the decimal points, not the last digits.", "Alinea los puntos decimales, no las últimas cifras."),
      pa !== pb
        ? tr(locale, `Give both numbers ${places(P)} by writing zeros at the end: ${aP} and ${bP}. Then ${add ? "add" : "subtract"} as with whole numbers.`, `Escribe los dos números con ${places(P)} agregando ceros al final: ${aP} y ${bP}. Luego ${add ? "suma" : "resta"} como con números enteros.`)
        : add
          ? tr(locale, "Add column by column from the right. Regroup when a column adds up to 10 or more.", "Suma columna por columna desde la derecha. Reagrupa cuando una columna sume 10 o más.")
          : tr(locale, "Subtract column by column from the right. Regroup when the top digit is smaller.", "Resta columna por columna desde la derecha. Reagrupa cuando la cifra de arriba sea menor."),
      add
        ? `${col}: ${x} + ${y} = ${x + y}${x + y >= 10 ? tr(locale, ", so write the ones digit and regroup 1.", "; escribe las unidades y reagrupa 1.") : "."}`
        : x >= y
          ? `${col}: ${x} − ${y} = ${x - y}.`
          : digit(Ai, ci + 1) > 0
            ? tr(locale, `${col}: ${x} is less than ${y}, so regroup 1 from the next place: ${x + 10} − ${y} = ${x + 10 - y}.`, `${col}: ${x} es menor que ${y}, así que reagrupa 1 del lugar siguiente: ${x + 10} − ${y} = ${x + 10 - y}.`)
            : tr(
                locale,
                `${col}: ${x} is less than ${y}, and the next place to the left is 0, so regroup across the zeros from the first place to the left that is not 0: ${x + 10} − ${y} = ${x + 10 - y}.`,
                `${col}: ${x} es menor que ${y} y el lugar siguiente a la izquierda es 0, así que reagrupa a través de los ceros desde el primer lugar a la izquierda que no sea 0: ${x + 10} − ${y} = ${x + 10 - y}.`,
              ),
    ],
    steps: [`${aP} ${op} ${bP} = ${padD(R, P, P)}`, ...(padD(R, P, P) !== showD(res) ? [`${padD(R, P, P)} = ${showD(res)}`] : [])],
    seconds: 25,
  };
}

function decMult(r: Rng, locale: Locale): ItemBody {
  const [pa, pb] = r.pick<[number, number]>([[1, 1], [2, 1], [1, 2]]);
  const A = decUnits(r, pa === 1 ? 11 : 101, pa === 1 ? 99 : 999, pa);
  const B = decUnits(r, 2, pb === 1 ? 49 : 99, pb);
  const P = pa + pb, U = A * B, prod = dv(U, P);
  const a = dv(A, pa), b = dv(B, pb);
  const answer: Answer = { kind: "number", value: prod };
  const full = padD(U, P, P);
  return {
    prompt: [`${a} × ${b} = `, { blank: true }],
    say: `${a} ${tr(locale, "times", "por")} ${b}`,
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongFor(answer, [w(dv(U, Math.max(pa, pb)), "counted-the-places-of-one-factor"), w(U, "left-out-the-decimal-point")]),
    hints: [
      tr(locale, `How many decimal places do ${a} and ${b} have in all?`, `¿Cuántas cifras decimales tienen ${a} y ${b} en total?`),
      tr(locale, "Multiply as if there were no decimal points. Then give the product as many decimal places as the two factors have together.", "Multiplica como si no hubiera puntos decimales. Luego dale al producto tantas cifras decimales como tienen los dos factores juntos."),
      `${A} × ${B} = ${U}`,
    ],
    steps: [`${A} × ${B} = ${U}`, tr(locale, `${pa} + ${pb} = ${P} decimal places`, `${pa} + ${pb} = ${P} cifras decimales`), `${a} × ${b} = ${full}${full !== showD(prod) ? ` = ${showD(prod)}` : ""}`],
    seconds: 30,
  };
}

function decDiv(r: Rng, locale: Locale): ItemBody {
  let pd: number, D: number, pq: number, Q: number;
  do {
    pd = r.bool(0.6) ? 1 : 2;
    D = decUnits(r, 2, pd === 1 ? 49 : 99, pd);
    pq = r.bool(0.65) ? 0 : 1;
    Q = pq === 0 ? r.int(2, 40) : decUnits(r, 11, 99, 1);
  } while ((Q * D) / TEN[pq + pd] > 150);
  const dividend = dv(Q * D, pq + pd), d = dv(D, pd), q = dv(Q, pq), N = dv(Q * D, pq);
  const answer: Answer = { kind: "number", value: q };
  return {
    prompt: [`${dividend} ÷ ${d} = `, { blank: true }],
    say: `${dividend} ${tr(locale, "divided by", "dividido entre")} ${d}`,
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongFor(answer, [w(dv(Q, pq + pd), "moved-only-the-divisor-point"), w(dv(Q * 10, pq), "misplaced-the-decimal-point")]),
    hints: [
      tr(locale, `Dividing by a whole number is easier. How can you turn ${d} into a whole number?`, `Es más fácil dividir entre un número entero. ¿Cómo puedes convertir ${d} en un número entero?`),
      tr(
        locale,
        `Multiply both numbers by ${TEN[pd]}: move both decimal points ${pd} ${pd === 1 ? "place" : "places"} to the right. The quotient stays the same.`,
        `Multiplica los dos números por ${TEN[pd]}: mueve los dos puntos decimales ${pd} ${pd === 1 ? "lugar" : "lugares"} a la derecha. El cociente no cambia.`,
      ),
      `${dividend} ÷ ${d} = ${N} ÷ ${D}`,
    ],
    steps: [`${dividend} × ${TEN[pd]} = ${N}`, `${d} × ${TEN[pd]} = ${D}`, `${N} ÷ ${D} = ${q}`],
    seconds: 35,
  };
}

function decOps(r: Rng, level: number, locale: Locale): ItemBody {
  return level === 1 ? decAddSub(r, locale) : level === 2 ? decMult(r, locale) : decDiv(r, locale);
}

// ---------- m.rational.order ----------

/** A rational number and how it is written: as a fraction (or mixed number) or as a decimal. */
type RNum = { q: Q; asFrac: boolean };
const rShow = (x: RNum) => (x.asFrac ? qShow(x.q) : showD(qDec(x.q)!));
const rParts = (x: RNum): MathPart[] => (x.asFrac ? qParts(x.q) : [showD(qDec(x.q)!)]);
const rSay = (x: RNum, locale: Locale) => (x.asFrac ? sayQ(x.q, locale) : sayN(qDec(x.q)!, locale));
/** Denominators whose fractions end as decimals, so every comparison can be made exactly. */
const TERM = [2, 4, 5, 8, 10];
/** A nonzero rational with a terminating decimal, |value| ≤ max. */
function randQ(r: Rng, max: number): Q {
  const d = r.pick(TERM);
  return qr(r.int(1, max * d), d);
}
/** Decimal form when it has at most two places, otherwise a fraction. */
/** A whole number is always written as one; anything else as a fraction or a decimal. */
const asNum = (q: Q, asFrac: boolean): RNum => ({ q, asFrac: asFrac && q[1] !== 1 });
const interleave = (parts: MathPart[][], sep: string): MathPart[] => parts.flatMap((p, i) => (i ? [sep, ...p] : p));

/**
 * Read a rational number at a marked point. The line labels every whole number and has a small tick
 * every 1/S, so the reading takes counting from 0. (Placing a point on the touch pad would not test
 * this: the pad shows the value of the placed point, so the learner could move it until the readout
 * matches.)
 */
function ratPlace(r: Rng, locale: Locale): ItemBody {
  const kind = r.int(0, 2);
  const neg = r.bool(0.7);
  let v: Q, S: number, min: number, max: number, decimal: boolean;
  if (kind < 2) {
    // Halves on −4…4 or quarters on −2…2, never on a whole number.
    S = kind === 0 ? 2 : 4;
    v = qr((2 * r.int(0, 3) + 1) * (neg ? -1 : 1), S);
    [min, max, decimal] = kind === 0 ? [-4, 4, true] : [-2, 2, true];
  } else {
    S = r.pick([3, 4, 5]);
    let n = r.int(1, 2 * S - 1);
    while (gcd(n, S) !== 1) n = r.int(1, 2 * S - 1);
    v = qr(neg ? -n : n, S);
    [min, max, decimal] = [-2, 2, false];
  }
  const value = qVal(v);
  const answer: Answer = decimal ? { kind: "number", value } : { kind: "fraction", n: v[0], d: v[1] };
  const shown = decimal ? showD(value) : qShow(v);
  const ticks = Math.abs(v[0]) * (S / v[1]);
  // Counting the fraction part back from the next whole number lands on the mirror point inside the same unit.
  const whole = Math.floor(ticks / S), part = ticks % S;
  const mirror = qr((neg ? -1 : 1) * (whole * S + (S - part)), S);
  const typedQ = (q: Q) => (decimal ? String(qVal(q)) : qTyped(q));
  const lo = Math.floor(value);
  const tick = kind === 0 ? "0.5" : kind === 1 ? "0.25" : sayFrac(1, S, locale);
  const tickShown = kind === 0 ? "0.5" : kind === 1 ? "0.25" : `1/${S}`;
  const size = decimal ? showD(Math.abs(value)) : qShow(qAbs(v), false);
  const form = decimal ? tr(locale, "Write it as a decimal.", "Escríbelo como decimal.") : tr(locale, "Write it as a fraction or a mixed number.", "Escríbelo como fracción o como número mixto.");
  const side = (left: boolean) => (left ? tr(locale, "left", "izquierda") : tr(locale, "right", "derecha"));
  return {
    prompt: [tr(locale, "What number is at the dot? ", "¿Qué número está en el punto? "), form],
    say: tr(locale, `What number is at the dot on the number line? ${form}`, `¿Qué número está en el punto de la recta numérica? ${form}`),
    visual: { kind: "number-line", min, max, marks: Array.from({ length: max - min + 1 }, (_, i) => min + i), denominator: S, marker: value },
    alt: tr(
      locale,
      `A number line from ${show(min)} to ${show(max)} with every whole number labeled. Each whole is split into ${S} equal parts by small ticks. A dot sits on one of the small ticks.`,
      `Una recta numérica de ${show(min)} a ${show(max)} con todos los números enteros escritos. Cada entero está dividido en ${S} partes iguales con marcas pequeñas. Hay un punto en una de las marcas pequeñas.`,
    ),
    input: decimal ? "keypad" : "fraction",
    keys: decimal ? ["-", "."] : ["-"],
    answer,
    wrong: wrongFor(answer, [w(typedQ(qNeg(v)), "wrong-side-of-zero"), Math.abs(qVal(mirror)) <= max && w(typedQ(mirror), "counted-from-the-wrong-whole-number")]),
    hints: [
      tr(locale, "Is the dot to the left or to the right of 0?", "¿El punto está a la izquierda o a la derecha del 0?"),
      tr(locale, `Each small tick on this number line is ${tick}. Count the ticks from 0 to the dot.`, `Cada marca pequeña de esta recta numérica vale ${tick}. Cuenta las marcas desde el 0 hasta el punto.`),
      tr(locale, `The dot is between ${show(lo)} and ${show(lo + 1)}.`, `El punto está entre ${show(lo)} y ${show(lo + 1)}.`),
    ],
    steps: [
      tr(locale, `The dot is ${ticks} ${ticks === 1 ? "tick" : "ticks"} to the ${side(neg)} of 0.`, `El punto está a ${ticks} ${ticks === 1 ? "marca" : "marcas"} a la ${side(neg)} del 0.`),
      `${ticks} × ${tickShown} = ${size}`,
      tr(locale, `The dot is at ${shown}.`, `El punto está en ${shown}.`),
    ],
    seconds: 20,
  };
}

/** One line that puts two numbers in the same form: fractions as decimals, decimals padded to the same places. */
function sameForm(list: RNum[], locale: Locale): string {
  const fr = list.filter((x) => x.asFrac);
  if (fr.length) return fr.map((x) => `${qShow(x.q)} = ${showD(qDec(x.q)!)}`).join(", ");
  const places = (x: RNum) => (String(qDec(x.q)!).split(".")[1] ?? "").length;
  const most = Math.max(...list.map(places));
  const pads = list.filter((x) => places(x) < most).map((x) => `${showD(qDec(x.q)!)} = ${padD(Math.round(qDec(x.q)! * TEN[most]), most, most)}`);
  if (pads.length) return pads.join(", ");
  return list.map((x) => tr(locale, `${rShow(x)} is ${showD(Math.abs(qDec(x.q)!))} from 0`, `${rShow(x)} está a ${showD(Math.abs(qDec(x.q)!))} del 0`)).join(tr(locale, " and ", " y "));
}

function ratCompare(r: Rng, locale: Locale): ItemBody {
  const kase = r.pick(["neg", "neg", "neg", "mixed", "equal", "digits"] as const);
  let a: RNum, b: RNum;
  if (kase === "digits") {
    // 0.5 against 0.45: the longer decimal has the bigger digits but is the smaller number.
    const whole = r.int(0, 5), t = r.int(2, 9), u = r.int(1, 9);
    a = { q: qr(whole * 10 + t, 10), asFrac: false };
    b = { q: qr(whole * 100 + (t - 1) * 10 + u, 100), asFrac: false };
  } else if (kase === "equal") {
    const d = r.pick([2, 4, 5, 10]);
    let n = r.int(1, 3 * d);
    while (gcd(n, d) !== 1) n = r.int(1, 3 * d);
    const q = qr(r.bool(0.7) ? -n : n, d);
    a = { q, asFrac: true };
    b = { q, asFrac: false };
  } else {
    let p: Q, s: Q;
    do {
      p = qNeg(randQ(r, 4));
      s = kase === "neg" ? qNeg(randQ(r, 4)) : randQ(r, 3);
    } while (qEq(p, s) || (kase === "neg" && Math.abs(qVal(p) - qVal(s)) > 1) || qDec(p) === null || qDec(s) === null);
    const form = r.int(0, 3);
    a = asNum(p, form === 0 || form === 2);
    b = asNum(s, form === 1 || form === 2);
  }
  if (r.bool()) [a, b] = [b, a];
  const sym = qLess(a.q, b.q) ? "<" : qEq(a.q, b.q) ? "=" : ">";
  const symSay: Record<string, string> = { "<": tr(locale, "is less than", "es menor que"), ">": tr(locale, "is greater than", "es mayor que"), "=": tr(locale, "is equal to", "es igual a") };
  const why = (label: string) =>
    kase === "equal" ? "missed-that-they-are-equal" : label === "=" ? "thought-they-were-equal" : kase === "neg" ? "compared-as-if-positive" : kase === "mixed" ? "ignored-the-negative-sign" : "compared-digits-not-values";
  const options = ["<", ">", "="].map((label) => ({ label, say: symSay[label], ...(label === sym ? {} : { why: why(label) }) }));
  const strategy = {
    neg: tr(locale, "Write both numbers in the same form. Between two negative numbers, the one closer to 0 is greater.", "Escribe los dos números en la misma forma. Entre dos números negativos, el más cercano al 0 es el mayor."),
    mixed: tr(locale, "Every negative number is less than every positive number.", "Todo número negativo es menor que todo número positivo."),
    equal: tr(locale, "Write both numbers in the same form, then compare.", "Escribe los dos números en la misma forma y luego compáralos."),
    digits: tr(locale, "Write both decimals with the same number of decimal places, then compare.", "Escribe los dos decimales con la misma cantidad de cifras decimales y luego compáralos."),
  }[kase];
  const [lo, hi] = qLess(a.q, b.q) ? [a, b] : [b, a];
  const fact =
    kase === "mixed" && !a.asFrac && !b.asFrac
      ? tr(locale, `${rShow(lo)} is negative and ${rShow(hi)} is positive`, `${rShow(lo)} es negativo y ${rShow(hi)} es positivo`)
      : sameForm([a, b], locale);
  return {
    prompt: [...rParts(a), " ", { blank: true }, " ", ...rParts(b)],
    // "with" / "con", not "and" / "y": "compare negative 1 and negative 1 and one fifth" sounds like three numbers.
    say: tr(locale, `Compare ${rSay(a, locale)} with ${rSay(b, locale)}.`, `Compara ${rSay(a, locale)} con ${rSay(b, locale)}.`),
    ...withChoices(r, options.find((c) => c.label === sym)!, options.filter((c) => c.label !== sym)),
    hints: [
      tr(locale, "Which number is farther to the right on a number line?", "¿Qué número está más a la derecha en la recta numérica?"),
      strategy,
      // For equal numbers the conversion itself is the answer, so the hint only asks for it.
      kase === "equal" ? tr(locale, `Write ${rShow(a.asFrac ? a : b)} as a decimal.`, `Escribe ${rShow(a.asFrac ? a : b)} como decimal.`) : `${cap(fact)}.`,
    ],
    steps: [`${cap(fact)}.`, `${rShow(a)} ${sym} ${rShow(b)}`],
    seconds: 20,
  };
}

function ratOrder(r: Rng, locale: Locale): ItemBody {
  const far = r.bool(0.3);
  const wantNeg = r.bool(0.6);
  let vals: Q[];
  for (;;) {
    const negs = r.int(2, 3);
    vals = Array.from({ length: 4 }, (_, i) => (i < negs ? qNeg(randQ(r, 4)) : randQ(r, 3)));
    const abs = vals.map((q) => qVal(qAbs(q)));
    if (new Set(abs).size < 4 || vals.some((q) => qDec(q) === null)) continue;
    if (far && (qVal(vals[abs.indexOf(Math.max(...abs))]) < 0) !== wantNeg) continue;
    break;
  }
  const nums = vals.map((q) => asNum(q, r.bool(0.4)));
  const list = (xs: RNum[]) => xs.map(rShow).join(", ");
  const sayList = (xs: RNum[]) => xs.map((x) => rSay(x, locale)).join(", ");
  const fr = nums.filter((x) => x.asFrac);
  const forms = fr.length ? fr.map((x) => `${qShow(x.q)} = ${showD(qDec(x.q)!)}`).join(", ") : "";
  if (far) {
    const abs = (x: RNum) => qVal(qAbs(x.q));
    const best = nums.reduce((m, x) => (abs(x) > abs(m) ? x : m));
    const hi = nums.reduce((m, x) => (qLess(m.q, x.q) ? x : m)), lo = nums.reduce((m, x) => (qLess(x.q, m.q) ? x : m));
    const choice = (x: RNum): Choice => ({ label: rShow(x), say: rSay(x, locale), ...(x === best ? {} : { why: x === hi ? "chose-the-greatest-number" : x === lo ? "chose-the-least-number" : "misjudged-distance-from-zero" }) });
    const absText = (x: RNum) => `|${rShow(x)}| = ${x.asFrac ? qShow(qAbs(x.q)) : showD(Math.abs(qDec(x.q)!))}`;
    return {
      prompt: [tr(locale, "Which number is farthest from 0?", "¿Qué número está más lejos del 0?")],
      say: tr(locale, `Which number is farthest from 0: ${sayList(nums)}?`, `¿Qué número está más lejos del 0: ${sayList(nums)}?`),
      ...withChoices(r, choice(best), nums.filter((x) => x !== best).map(choice)),
      hints: [
        tr(locale, "Distance from 0 is absolute value, and a distance is never negative.", "La distancia al 0 es el valor absoluto, y una distancia nunca es negativa."),
        tr(locale, "Find the absolute value of each number, then compare them.", "Halla el valor absoluto de cada número y luego compáralos."),
        absText(nums[0]),
      ],
      steps: [nums.map(absText).join(", "), tr(locale, `${rShow(best)} is farthest from 0.`, `${rShow(best)} es el que está más lejos del 0.`)],
      seconds: 30,
    };
  }
  const by = (f: (a: RNum, b: RNum) => number) => [...nums].sort(f);
  const asc = by((x, y) => qVal(x.q) - qVal(y.q));
  const byAbs = by((x, y) => qVal(qAbs(x.q)) - qVal(qAbs(y.q)));
  const desc = [...asc].reverse();
  const negBack = [...asc.filter((x) => x.q[0] < 0).reverse(), ...asc.filter((x) => x.q[0] > 0)];
  let shown = r.shuffle(nums);
  while (list(shown) === list(asc)) shown = r.shuffle(nums);
  const choice = (xs: RNum[], why?: string): Choice => ({ label: list(xs), say: sayList(xs), ...(why ? { why } : {}) });
  const negs = asc.filter((x) => x.q[0] < 0);
  return {
    prompt: [tr(locale, "Which list orders these numbers from least to greatest? ", "¿Qué lista ordena estos números de menor a mayor? "), ...interleave(shown.map(rParts), ", ")],
    say: tr(locale, `Which list orders these numbers from least to greatest: ${sayList(shown)}?`, `¿Qué lista ordena estos números de menor a mayor: ${sayList(shown)}?`),
    ...withChoices(r, choice(asc), [choice(byAbs, "ordered-by-distance-from-zero"), choice(negBack, "ordered-the-negatives-backward"), choice(desc, "ordered-from-greatest-to-least")]),
    hints: [
      tr(locale, "Which numbers are negative? They come first.", "¿Qué números son negativos? Van primero."),
      tr(locale, "Write every number as a decimal. Among the negative numbers, the one farthest from 0 is the least.", "Escribe cada número como decimal. Entre los negativos, el más lejano del 0 es el menor."),
      forms ? `${forms}.` : tr(locale, `The negative numbers are ${list(negs)}.`, `Los números negativos son ${list(negs)}.`),
    ],
    steps: [
      forms || tr(locale, `Negative: ${list(negs)}. Positive: ${list(asc.filter((x) => x.q[0] > 0))}.`, `Negativos: ${list(negs)}. Positivos: ${list(asc.filter((x) => x.q[0] > 0))}.`),
      tr(locale, `Least to greatest: ${list(asc)}`, `De menor a mayor: ${list(asc)}`),
    ],
    seconds: 40,
  };
}

function ratOrderSkill(r: Rng, level: number, locale: Locale): ItemBody {
  return level === 1 ? ratPlace(r, locale) : level === 2 ? ratCompare(r, locale) : ratOrder(r, locale);
}

// ---------- m.coord.plane ----------

const pt = (x: number, y: number) => `(${show(x)}, ${show(y)})`;
const ptTyped = (x: number, y: number) => `(${x}, ${y})`;
const sayPt = (x: number, y: number, locale: Locale) => `${sayN(x, locale)}, ${sayN(y, locale)}`;
const quadrant = (x: number, y: number) => (x > 0 ? (y > 0 ? "I" : "IV") : y > 0 ? "II" : "III");
const QUAD_NUM: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

function coordRead(r: Rng, locale: Locale): ItemBody {
  if (r.bool(0.4)) {
    const x = nonzero(r, -9, 9), y = nonzero(r, -9, 9);
    const q = quadrant(x, y), swapped = quadrant(y, x);
    const choice = (label: string): Choice => ({
      label,
      say: tr(locale, `quadrant ${QUAD_NUM[label]}`, `cuadrante ${QUAD_NUM[label]}`),
      ...(label === q ? {} : { why: label === "I" ? "ignored-the-negative-signs" : label === swapped ? "swapped-x-and-y" : "mixed-up-the-quadrant-order" }),
    });
    const lr = x < 0 ? tr(locale, "left", "izquierda") : tr(locale, "right", "derecha");
    const ud = y < 0 ? tr(locale, "below", "debajo") : tr(locale, "above", "arriba");
    return {
      prompt: [tr(locale, `In which quadrant is the point ${pt(x, y)}?`, `¿En qué cuadrante está el punto ${pt(x, y)}?`)],
      say: tr(locale, `In which quadrant is the point ${sayPt(x, y, locale)}?`, `¿En qué cuadrante está el punto ${sayPt(x, y, locale)}?`),
      ...withChoices(r, choice(q), ["I", "II", "III", "IV"].filter((l) => l !== q).map(choice)),
      ...withY(
        locale,
        [
          (Y) => tr(locale, "Look at the signs. Is x positive or negative? Is y?", `Fíjate en los signos. ¿La x es positiva o negativa? ¿Y la ${Y}?`),
          tr(
            locale,
            "The quadrants are numbered I, II, III, IV counterclockwise, starting at the top right, where x and y are both positive.",
            "Los cuadrantes se numeran I, II, III, IV en sentido contrario a las manecillas del reloj, empezando arriba a la derecha, donde las dos coordenadas son positivas.",
          ),
          (Y) => tr(locale, `x = ${show(x)} is ${x < 0 ? "negative" : "positive"}, so the point is to the ${lr} of the y-axis.`, `x = ${show(x)} es ${x < 0 ? "negativa" : "positiva"}, así que el punto está a la ${lr} del eje ${Y}.`),
        ],
        [
          (Y) => tr(locale, `x ${x < 0 ? "<" : ">"} 0: ${lr} of the y-axis. y ${y < 0 ? "<" : ">"} 0: ${ud} the x-axis.`, `x ${x < 0 ? "<" : ">"} 0: a la ${lr} del eje ${Y}. ${Y} ${y < 0 ? "<" : ">"} 0: ${ud} del eje x.`),
          tr(locale, `The point is in quadrant ${q}.`, `El punto está en el cuadrante ${q}.`),
        ],
      ),
      seconds: 15,
    };
  }
  let x: number, y: number;
  do {
    x = nonzero(r, -5, 5);
    y = nonzero(r, -5, 5);
  } while (x === y || (x > 0 && y > 0 && r.bool(0.7)));
  const answer: Answer = { kind: "pair", x, y };
  const units = (k: number) => tr(locale, k === 1 ? "1 unit" : `${k} units`, k === 1 ? "1 unidad" : `${k} unidades`);
  return {
    prompt: [tr(locale, "Write the coordinates of the point as (x, y).", "Escribe las coordenadas del punto como (x, y).")],
    say: tr(locale, "Write the coordinates of the point on the grid. Give the x-coordinate first, then the y-coordinate.", "Escribe las coordenadas del punto en la cuadrícula. Primero la coordenada x y luego la coordenada ye."),
    visual: { kind: "coord", points: [[x, y]] },
    alt: tr(locale, "A coordinate grid from −6 to 6 on both axes, with one point plotted.", "Un plano de coordenadas de −6 a 6 en los dos ejes, con un punto marcado."),
    input: "text",
    answer,
    wrong: wrongFor(answer, [w(ptTyped(y, x), "swapped-x-and-y"), (x < 0 || y < 0) && w(ptTyped(Math.abs(x), Math.abs(y)), "dropped-the-negative-signs")]),
    ...withY(
      locale,
      [
        tr(locale, "Start at the origin, (0, 0). Is the point to the left or right of it? Up or down?", "Empieza en el origen, (0, 0). ¿El punto está a la izquierda o a la derecha? ¿Arriba o abajo?"),
        (Y) => tr(locale, "The x-coordinate tells how far left or right; the y-coordinate tells how far up or down. Left and down are negative.", `La coordenada x dice cuánto a la izquierda o a la derecha; la coordenada ${Y}, cuánto arriba o abajo. Izquierda y abajo son negativos.`),
        tr(locale, `The point is ${units(Math.abs(x))} to the ${x < 0 ? "left" : "right"}, so x = ${show(x)}.`, `El punto está ${units(Math.abs(x))} a la ${x < 0 ? "izquierda" : "derecha"}, así que x = ${show(x)}.`),
      ],
      [
        tr(locale, `${units(Math.abs(x))} ${x < 0 ? "left" : "right"}: x = ${show(x)}`, `${units(Math.abs(x))} a la ${x < 0 ? "izquierda" : "derecha"}: x = ${show(x)}`),
        (Y) => tr(locale, `${units(Math.abs(y))} ${y < 0 ? "down" : "up"}: y = ${show(y)}`, `${units(Math.abs(y))} hacia ${y < 0 ? "abajo" : "arriba"}: ${Y} = ${show(y)}`),
        pt(x, y),
      ],
    ),
    seconds: 15,
  };
}

const GRID_STORIES = [
  {
    en: (A: string, B: string) => `On a town map, each unit is 1 block. The library is at ${A} and the pool is at ${B}. How many blocks apart are they?`,
    es: (A: string, B: string) => `En el mapa de un pueblo, cada unidad es 1 cuadra. La biblioteca está en ${A} y la piscina en ${B}. ¿A cuántas cuadras de distancia están?`,
    unit: ["blocks", "cuadras"],
  },
  {
    en: (A: string, B: string) => `In a space game, each unit is 1 kilometer. A rocket is at ${A} and a space station is at ${B}. How many kilometers apart are they?`,
    es: (A: string, B: string) => `En un juego del espacio, cada unidad es 1 kilómetro. Un cohete está en ${A} y una estación espacial en ${B}. ¿A cuántos kilómetros de distancia están?`,
    unit: ["kilometers", "kilómetros"],
  },
  {
    en: (A: string, B: string) => `On a garden plan, each unit is 1 meter. The tomato patch is at ${A} and the water tap is at ${B}. How many meters apart are they?`,
    es: (A: string, B: string) => `En el plano de un huerto, cada unidad es 1 metro. La zona de tomates está en ${A} y la llave del agua en ${B}. ¿A cuántos metros de distancia están?`,
    unit: ["meters", "metros"],
  },
  {
    en: (A: string, B: string) => `On a board game grid, each unit is 1 square. A game piece is at ${A} and the treasure is at ${B}. How many squares apart are they?`,
    es: (A: string, B: string) => `En la cuadrícula de un juego de mesa, cada unidad es 1 casilla. Una ficha está en ${A} y el tesoro en ${B}. ¿A cuántas casillas de distancia están?`,
    unit: ["squares", "casillas"],
  },
];

function coordDistance(r: Rng, locale: Locale): ItemBody {
  const sameY = r.bool();
  const c = nonzero(r, -6, 6);
  const across = r.bool(0.6);
  let a: number, b: number;
  if (across) {
    a = -r.int(1, 8);
    b = r.int(1, 8);
  } else {
    const sign = r.bool(0.7) ? -1 : 1;
    a = sign * r.int(1, 8);
    do b = sign * r.int(1, 8);
    while (Math.abs(b - a) < 2);
  }
  if (r.bool()) [a, b] = [b, a];
  const P1: [number, number] = sameY ? [a, c] : [c, a], P2: [number, number] = sameY ? [b, c] : [c, b];
  const d = Math.abs(a - b);
  const story = r.bool() ? r.pick(GRID_STORIES) : null;
  const plain = (A: string, B: string) => tr(locale, `What is the distance between ${A} and ${B}?`, `¿Cuál es la distancia entre ${A} y ${B}?`);
  const textFor = (A: string, B: string) => (story ? tr(locale, story.en(A, B), story.es(A, B)) : plain(A, B));
  const sayP = (p: [number, number]) => tr(locale, `the point ${sayPt(p[0], p[1], locale)}`, `el punto ${sayPt(p[0], p[1], locale)}`);
  const axis = (Y: string) => (sameY ? tr(locale, "y-axis", `eje ${Y}`) : tr(locale, "x-axis", "eje x"));
  const answer: Answer = { kind: "number", value: d };
  const [big, small] = [Math.max(Math.abs(a), Math.abs(b)), Math.min(Math.abs(a), Math.abs(b))];
  return {
    prompt: [textFor(pt(...P1), pt(...P2))],
    say: textFor(sayP(P1), sayP(P2)),
    visual: { kind: "coord", points: [P1, P2] },
    alt: tr(locale, `A coordinate grid with the points ${pt(...P1)} and ${pt(...P2)} plotted.`, `Un plano de coordenadas con los puntos ${pt(...P1)} y ${pt(...P2)} marcados.`),
    input: "keypad",
    answer,
    wrong: wrongFor(answer, [
      across ? w(big - small, "subtracted-instead-of-adding") : w(big + small, "added-instead-of-subtracting"),
      w(d + 1, "counted-the-grid-points"),
    ]),
    ...withY(
      locale,
      [
        sameY
          ? (Y) => tr(locale, "Both points have the same y-coordinate, so they are on the same horizontal line.", `Los dos puntos tienen la misma coordenada ${Y}, así que están en la misma recta horizontal.`)
          : tr(locale, "Both points have the same x-coordinate, so they are on the same vertical line.", "Los dos puntos tienen la misma coordenada x, así que están en la misma recta vertical."),
        across
          ? (Y) => tr(locale, `The points are on opposite sides of the ${axis(Y)}. Add their distances from it.`, `Los puntos están en lados opuestos del ${axis(Y)}. Suma sus distancias a ese eje.`)
          : (Y) => tr(locale, `The points are on the same side of the ${axis(Y)}. Subtract their distances from it.`, `Los puntos están del mismo lado del ${axis(Y)}. Resta sus distancias a ese eje.`),
        (Y) => tr(locale, `${pt(...P1)} is ${Math.abs(a)} from the ${axis(Y)}, and ${pt(...P2)} is ${Math.abs(b)} from it.`, `${pt(...P1)} está a ${Math.abs(a)} del ${axis(Y)} y ${pt(...P2)} está a ${Math.abs(b)}.`),
      ],
      [
        `|${show(a)}| = ${Math.abs(a)}, |${show(b)}| = ${Math.abs(b)}`,
        across ? `${Math.abs(a)} + ${Math.abs(b)} = ${d}` : `${big} − ${small} = ${d}`,
        story ? `${d} ${tr(locale, story.unit[0], story.unit[1])}` : tr(locale, `${d} units`, `${d} unidades`),
      ],
    ),
    seconds: story ? 45 : 30,
  };
}

function coordReflect(r: Rng, locale: Locale): ItemBody {
  const mode = r.pick(["x", "x", "y", "y", "both"] as const);
  let x: number, y: number;
  do {
    x = nonzero(r, -6, 6);
    y = nonzero(r, -6, 6);
  } while (Math.abs(x) === Math.abs(y));
  const [ix, iy] = mode === "x" ? [x, -y] : mode === "y" ? [-x, y] : [-x, -y];
  const answer: Answer = { kind: "pair", x: ix, y: iy };
  const ask = tr(locale, " Write them as (x, y).", " Escríbelas como (x, y).");
  // `Y` is the letter y as written, or "ye" in the Spanish read-aloud, where a lone "y" is heard as "and".
  const text = (P: string, Y = "y") =>
    mode === "both"
      ? tr(locale, `The point ${P} is reflected across the x-axis, and then that image is reflected across the y-axis. What are the coordinates of the final image?`, `El punto ${P} se refleja sobre el eje x y luego esa imagen se refleja sobre el eje ${Y}. ¿Cuáles son las coordenadas de la imagen final?`)
      : tr(locale, `The point ${P} is reflected across the ${mode}-axis. What are the coordinates of its image?`, `El punto ${P} se refleja sobre el eje ${mode === "y" ? Y : "x"}. ¿Cuáles son las coordenadas de su imagen?`);
  const hints: Lettered[] =
    mode === "x"
      ? [
          tr(locale, "Reflecting across the x-axis flips the point up or down. Which coordinate changes?", "Reflejar sobre el eje x voltea el punto hacia arriba o hacia abajo. ¿Qué coordenada cambia?"),
          (Y) => tr(locale, "Keep the x-coordinate and change the sign of the y-coordinate.", `Conserva la coordenada x y cambia el signo de la coordenada ${Y}.`),
          tr(locale, `The x-coordinate stays ${show(x)}.`, `La coordenada x sigue siendo ${show(x)}.`),
        ]
      : mode === "y"
        ? [
            (Y) => tr(locale, "Reflecting across the y-axis flips the point left or right. Which coordinate changes?", `Reflejar sobre el eje ${Y} voltea el punto hacia la izquierda o la derecha. ¿Qué coordenada cambia?`),
            (Y) => tr(locale, "Keep the y-coordinate and change the sign of the x-coordinate.", `Conserva la coordenada ${Y} y cambia el signo de la coordenada x.`),
            (Y) => tr(locale, `The y-coordinate stays ${show(y)}.`, `La coordenada ${Y} sigue siendo ${show(y)}.`),
          ]
        : [
            tr(locale, "Do one reflection at a time.", "Haz un reflejo a la vez."),
            (Y) => tr(locale, "Across the x-axis, y changes sign. Across the y-axis, x changes sign.", `Sobre el eje x, la ${Y} cambia de signo. Sobre el eje ${Y}, la x cambia de signo.`),
            tr(locale, `After the first reflection the point is at ${pt(x, -y)}.`, `Después del primer reflejo el punto está en ${pt(x, -y)}.`),
          ];
  return {
    prompt: [text(pt(x, y)) + ask],
    say: text(sayPt(x, y, locale), "ye") + tr(locale, ask, " Escribe primero la x y luego la ye."),
    visual: { kind: "coord", points: [[x, y]] },
    alt: tr(locale, `A coordinate grid with the point ${pt(x, y)} plotted.`, `Un plano de coordenadas con el punto ${pt(x, y)} marcado.`),
    input: "text",
    answer,
    wrong: wrongFor(
      answer,
      mode === "both"
        ? [w(ptTyped(x, -y), "reflected-only-once"), w(ptTyped(-x, y), "reflected-only-once"), w(ptTyped(iy, ix), "swapped-x-and-y")]
        : [w(mode === "x" ? ptTyped(-x, y) : ptTyped(x, -y), "reflected-across-the-wrong-axis"), w(ptTyped(-x, -y), "changed-both-signs"), w(ptTyped(iy, ix), "swapped-x-and-y")],
    ),
    ...withY(
      locale,
      hints,
      mode === "both"
        ? [tr(locale, `Across the x-axis: ${pt(x, y)} → ${pt(x, -y)}`, `Sobre el eje x: ${pt(x, y)} → ${pt(x, -y)}`), (Y) => tr(locale, `Across the y-axis: ${pt(x, -y)} → ${pt(ix, iy)}`, `Sobre el eje ${Y}: ${pt(x, -y)} → ${pt(ix, iy)}`)]
        : [
            mode === "x"
              ? (Y) => tr(locale, `x stays ${show(x)}; y changes from ${show(y)} to ${show(iy)}.`, `x sigue siendo ${show(x)}; ${Y} cambia de ${show(y)} a ${show(iy)}.`)
              : (Y) => tr(locale, `y stays ${show(y)}; x changes from ${show(x)} to ${show(ix)}.`, `${Y} sigue siendo ${show(y)}; x cambia de ${show(x)} a ${show(ix)}.`),
            pt(ix, iy),
          ],
    ),
    seconds: mode === "both" ? 40 : 25,
  };
}

function coordPlane(r: Rng, level: number, locale: Locale): ItemBody {
  return level === 1 ? coordRead(r, locale) : level === 2 ? coordDistance(r, locale) : coordReflect(r, locale);
}

// ---------- m.expr.write ----------

type Op1 = "add" | "mul" | "pow" | "subVC" | "subCV" | "divVC" | "divCV";
const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const OP1_LABEL: Record<Op1, (v: string, c: number) => string> = {
  add: (v, c) => `${v} + ${c}`,
  mul: (v, c) => `${c}${v}`,
  pow: (v, c) => `${v}${[...String(c)].map((dg) => SUPER[Number(dg)]).join("")}`,
  subVC: (v, c) => `${v} − ${c}`,
  subCV: (v, c) => `${c} − ${v}`,
  divVC: (v, c) => `${v} ÷ ${c}`,
  divCV: (v, c) => `${c} ÷ ${v}`,
};
/** A power read aloud the way a class says it: "k cubed", "t to the fifth" / "k al cubo", "t a la quinta". */
const POW_EN: Partial<Record<number, string>> = { 2: "squared", 3: "cubed", 4: "to the fourth", 5: "to the fifth" };
const POW_ES: Partial<Record<number, string>> = { 2: "al cuadrado", 3: "al cubo", 4: "a la cuarta", 5: "a la quinta" };
function op1Say(op: Op1, v: string, c: number, locale: Locale) {
  return {
    add: tr(locale, `${v} plus ${c}`, `${v} más ${c}`),
    mul: tr(locale, `${c} times ${v}`, `${c} por ${v}`),
    pow: `${v} ${tr(locale, POW_EN[c] ?? `to the power of ${c}`, POW_ES[c] ?? `elevado a la potencia ${c}`)}`,
    subVC: tr(locale, `${v} minus ${c}`, `${v} menos ${c}`),
    subCV: tr(locale, `${c} minus ${v}`, `${c} menos ${v}`),
    divVC: tr(locale, `${v} divided by ${c}`, `${v} dividido entre ${c}`),
    divCV: tr(locale, `${c} divided by ${v}`, `${c} dividido entre ${v}`),
  }[op];
}
function op1Step(op: Op1, v: string, c: number, locale: Locale) {
  return {
    add: tr(locale, `Start with ${v} and add ${c}.`, `Empieza con ${v} y suma ${c}.`),
    mul: tr(locale, `Multiply ${v} by ${c}.`, `Multiplica ${v} por ${c}.`),
    pow: tr(locale, `Multiply ${v} by itself ${c} times.`, `Multiplica ${v} por sí mismo ${c} veces.`),
    subVC: tr(locale, `Start with ${v}, then take away ${c}.`, `Empieza con ${v} y luego quita ${c}.`),
    subCV: tr(locale, `Start with ${c}, then take away ${v}.`, `Empieza con ${c} y luego quita ${v}.`),
    divVC: tr(locale, `${v} is the number being divided.`, `${v} es el número que se divide.`),
    divCV: tr(locale, `${c} is the number being divided.`, `${c} es el número que se divide.`),
  }[op];
}
const OP_WORD: Record<Op1, [string, string]> = { add: ["add", "sumar"], mul: ["multiply", "multiplicar"], pow: ["raise to a power", "elevar a una potencia"], subVC: ["subtract", "restar"], subCV: ["subtract", "restar"], divVC: ["divide", "dividir"], divCV: ["divide", "dividir"] };

type Phrase1 = { en: (v: string, c: number) => string; es: (v: string, c: number) => string; key: [string, string]; op: Op1; wrong: [Op1, string][] };
const ADD_WRONG: [Op1, string][] = [["mul", "multiplied-instead-of-adding"], ["subVC", "subtracted-instead-of-adding"], ["divVC", "divided-instead-of-adding"]];
const SUB_WRONG: [Op1, string][] = [["subCV", "reversed-the-subtraction-order"], ["add", "added-instead-of-subtracting"], ["divVC", "divided-instead-of-subtracting"]];
// k³ for "3 times k" is the exponent read as a factor (the slip in 2³ = 6), and it keeps "means multiply" from settling the choice.
const MUL_WRONG: [Op1, string][] = [["add", "added-instead-of-multiplying"], ["pow", "wrote-a-power-not-a-product"], ["divVC", "divided-instead-of-multiplying"]];
const DIV_WRONG: [Op1, string][] = [["divCV", "reversed-the-division-order"], ["mul", "multiplied-instead-of-dividing"], ["subVC", "subtracted-instead-of-dividing"]];
const PHRASES_1: Phrase1[] = [
  // Spanish says "3 unidades más que k": "3 más que k" reads as a comparison, not as adding.
  { en: (v, c) => `${c} more than ${v}`, es: (v, c) => `${c} unidades más que ${v}`, key: ["more than", "unidades más que"], op: "add", wrong: ADD_WRONG },
  { en: (v, c) => `${v} increased by ${c}`, es: (v, c) => `${v} aumentado en ${c}`, key: ["increased by", "aumentado en"], op: "add", wrong: ADD_WRONG },
  { en: (v, c) => `the sum of ${v} and ${c}`, es: (v, c) => `la suma de ${v} y ${c}`, key: ["the sum", "la suma"], op: "add", wrong: ADD_WRONG },
  { en: (v, c) => `${c} less than ${v}`, es: (v, c) => `${c} unidades menos que ${v}`, key: ["less than", "unidades menos que"], op: "subVC", wrong: SUB_WRONG },
  { en: (v, c) => `${v} decreased by ${c}`, es: (v, c) => `${v} disminuido en ${c}`, key: ["decreased by", "disminuido en"], op: "subVC", wrong: SUB_WRONG },
  { en: (v, c) => `${c} subtracted from ${v}`, es: (v, c) => `${c} restado de ${v}`, key: ["subtracted from", "restado de"], op: "subVC", wrong: SUB_WRONG },
  { en: (v, c) => `the difference of ${v} and ${c}`, es: (v, c) => `la diferencia de ${v} y ${c}`, key: ["the difference", "la diferencia"], op: "subVC", wrong: SUB_WRONG },
  {
    en: (v, c) => `${v} less than ${c}`, es: (v, c) => `${v} unidades menos que ${c}`, key: ["less than", "unidades menos que"], op: "subCV",
    wrong: [["subVC", "reversed-the-subtraction-order"], ["add", "added-instead-of-subtracting"], ["divCV", "divided-instead-of-subtracting"]],
  },
  { en: (v, c) => `the product of ${c} and ${v}`, es: (v, c) => `el producto de ${c} y ${v}`, key: ["the product", "el producto"], op: "mul", wrong: MUL_WRONG },
  { en: (v, c) => `${c} times ${v}`, es: (v, c) => `${c} veces ${v}`, key: ["times", "veces"], op: "mul", wrong: MUL_WRONG },
  { en: (v, c) => `${v} divided by ${c}`, es: (v, c) => `${v} dividido entre ${c}`, key: ["divided by", "dividido entre"], op: "divVC", wrong: DIV_WRONG },
  { en: (v, c) => `the quotient of ${v} and ${c}`, es: (v, c) => `el cociente de ${v} entre ${c}`, key: ["the quotient", "el cociente"], op: "divVC", wrong: DIV_WRONG },
  {
    en: (v, c) => `${c} divided by ${v}`, es: (v, c) => `${c} dividido entre ${v}`, key: ["divided by", "dividido entre"], op: "divCV",
    wrong: [["divVC", "reversed-the-division-order"], ["mul", "multiplied-instead-of-dividing"], ["subCV", "subtracted-instead-of-dividing"]],
  },
];

type Phrase2 = { en: (v: string, a: number, b: number) => string; es: (v: string, a: number, b: number) => string; ans: (v: string, a: number, b: number) => string; first: (v: string, a: number, b: number, locale: Locale) => string; wrong: [(v: string, a: number, b: number) => string, string][] };
const sumFirst = (v: string, _a: number, b: number, locale: Locale) => tr(locale, `“The sum of ${v} and ${b}” is (${v} + ${b}).`, `“La suma de ${v} y ${b}” es (${v} + ${b}).`);
const prodFirst = (v: string, a: number, _b: number, locale: Locale) => tr(locale, `“The product of ${a} and ${v}” is ${a}${v}.`, `“El producto de ${a} y ${v}” es ${a}${v}.`);
/** "1 unidad", "3 unidades". */
const unidades = (b: number) => (b === 1 ? "unidad" : "unidades");
const PHRASES_2: Phrase2[] = [
  { en: (v, a, b) => `${a} times the sum of ${v} and ${b}`, es: (v, a, b) => `${a} por la suma de ${v} y ${b}`, ans: (v, a, b) => `${a}(${v} + ${b})`, first: sumFirst, wrong: [[(v, a, b) => `${a}${v} + ${b}`, "left-out-the-parentheses"]] },
  {
    en: (v, a, b) => `${b} more than the product of ${a} and ${v}`, es: (v, a, b) => `${b} ${unidades(b)} más que el producto de ${a} y ${v}`, ans: (v, a, b) => `${a}${v} + ${b}`, first: prodFirst,
    wrong: [[(v, a, b) => `${a}(${v} + ${b})`, "grouped-the-wrong-part"], [(v, a, b) => `${b}${v} + ${a}`, "mixed-up-the-numbers"]],
  },
  {
    en: (v, a, b) => `${b} less than the product of ${a} and ${v}`, es: (v, a, b) => `${b} ${unidades(b)} menos que el producto de ${a} y ${v}`, ans: (v, a, b) => `${a}${v} − ${b}`, first: prodFirst,
    wrong: [[(v, a, b) => `${b} − ${a}${v}`, "reversed-the-subtraction-order"], [(v, a, b) => `${a}(${v} − ${b})`, "grouped-the-wrong-part"]],
  },
  {
    en: (v, a, b) => `${a} times the difference of ${v} and ${b}`, es: (v, a, b) => `${a} por la diferencia de ${v} y ${b}`, ans: (v, a, b) => `${a}(${v} − ${b})`,
    first: (v, _a, b, locale) => tr(locale, `“The difference of ${v} and ${b}” is (${v} − ${b}).`, `“La diferencia de ${v} y ${b}” es (${v} − ${b}).`),
    wrong: [[(v, a, b) => `${a}${v} − ${b}`, "left-out-the-parentheses"], [(v, a, b) => `${a}(${b} − ${v})`, "reversed-the-subtraction-order"]],
  },
  {
    en: (v, a, b) => `the quotient of ${v} and ${a}, plus ${b}`, es: (v, a, b) => `el cociente de ${v} entre ${a}, más ${b}`, ans: (v, a, b) => `${v}/${a} + ${b}`,
    first: (v, a, _b, locale) => tr(locale, `“The quotient of ${v} and ${a}” is ${v}/${a}.`, `“El cociente de ${v} entre ${a}” es ${v}/${a}.`),
    wrong: [[(v, a, b) => `${v}/(${a} + ${b})`, "grouped-the-wrong-part"], [(v, a, b) => `${a}/${v} + ${b}`, "reversed-the-division-order"]],
  },
  {
    en: (v, a, b) => `the sum of ${v} and ${b}, divided by ${a}`, es: (v, a, b) => `la suma de ${v} y ${b}, dividida entre ${a}`, ans: (v, a, b) => `(${v} + ${b})/${a}`, first: sumFirst,
    wrong: [[(v, a, b) => `${v} + ${b}/${a}`, "left-out-the-parentheses"], [(v, a, b) => `${a}/(${v} + ${b})`, "reversed-the-division-order"]],
  },
  {
    en: (v, a, b) => `the product of ${a} and ${v}, decreased by ${b}`, es: (v, a, b) => `el producto de ${a} y ${v}, disminuido en ${b}`, ans: (v, a, b) => `${a}${v} − ${b}`, first: prodFirst,
    wrong: [[(v, a, b) => `${a}(${v} − ${b})`, "grouped-the-wrong-part"], [(v, a, b) => `${b} − ${a}${v}`, "reversed-the-subtraction-order"]],
  },
];

type Story3 = { kind: "plus" | "minus" | "share"; en: (a: number, b: number, who: string) => string; es: (a: number, b: number, who: string) => string; ans: (a: number, b: number) => string };
const STORIES_3: Story3[] = [
  {
    kind: "plus",
    en: (a, b) => `Tickets to a science museum cost $${a} each, plus a $${b} booking fee for the whole order. Write an expression for the total cost, in dollars, of n tickets.`,
    es: (a, b) => `Las entradas a un museo de ciencias cuestan $${a} cada una, más un cargo de reserva de $${b} por todo el pedido. Escribe una expresión para el costo total, en dólares, de n entradas.`,
    ans: (a, b) => `${a}n + ${b}`,
  },
  {
    kind: "plus",
    en: (a, b) => `A sunflower is ${b} centimeters tall and grows ${a} centimeters each week. Write an expression for its height, in centimeters, after n weeks.`,
    es: (a, b) => `Un girasol mide ${b} centímetros y crece ${a} centímetros cada semana. Escribe una expresión para su altura, en centímetros, después de n semanas.`,
    ans: (a, b) => `${b} + ${a}n`,
  },
  {
    kind: "plus",
    en: (a, b, who) => `${who}'s playlist has ${b} songs. Every week ${who} adds ${a} new songs. Write an expression for the number of songs after n weeks.`,
    es: (a, b, who) => `La lista de canciones de ${who} tiene ${b} canciones. Cada semana agrega ${a} canciones nuevas. Escribe una expresión para el número de canciones después de n semanas.`,
    ans: (a, b) => `${b} + ${a}n`,
  },
  {
    kind: "plus",
    en: (a, b) => `In a video game, you start with ${b} points and earn ${a} points for each star you collect. Write an expression for your points after you collect n stars.`,
    es: (a, b) => `En un videojuego empiezas con ${b} puntos y ganas ${a} puntos por cada estrella que recoges. Escribe una expresión para tus puntos después de recoger n estrellas.`,
    ans: (a, b) => `${b} + ${a}n`,
  },
  {
    kind: "plus",
    en: (a, b) => `An art class buys one easel for $${b} and n paint sets for $${a} each. Write an expression for the total cost in dollars.`,
    es: (a, b) => `Una clase de arte compra un caballete de $${b} y n juegos de pinturas de $${a} cada uno. Escribe una expresión para el costo total en dólares.`,
    ans: (a, b) => `${b} + ${a}n`,
  },
  {
    kind: "minus",
    en: (a, b, who) => `${who} has ${b} stickers and gives away ${a} each day. Write an expression for the number of stickers left after n days.`,
    es: (a, b, who) => `${who} tiene ${b} calcomanías y regala ${a} cada día. Escribe una expresión para el número de calcomanías que quedan después de n días.`,
    ans: (a, b) => `${b} − ${a}n`,
  },
  {
    kind: "minus",
    en: (a, b) => `A water tank holds ${b} gallons. It drains ${a} gallons each minute. Write an expression for the gallons left after n minutes.`,
    es: (a, b) => `Un tanque tiene ${b} galones de agua. Pierde ${a} galones cada minuto. Escribe una expresión para los galones que quedan después de n minutos.`,
    ans: (a, b) => `${b} − ${a}n`,
  },
  {
    kind: "minus",
    en: (a, b) => `An animal shelter has ${b} pounds of dog food. The dogs eat ${a} pounds each day. Write an expression for the pounds of food left after n days.`,
    es: (a, b) => `Un refugio de animales tiene ${b} libras de comida para perros. Los perros comen ${a} libras cada día. Escribe una expresión para las libras de comida que quedan después de n días.`,
    ans: (a, b) => `${b} − ${a}n`,
  },
  {
    kind: "share",
    en: (_a, b, who) => `${who} bakes ${b} cookies and shares them equally among n friends. Write an expression for the number of cookies each friend gets.`,
    es: (_a, b, who) => `${who} hornea ${b} galletas y las reparte en partes iguales entre n amigos. Escribe una expresión para el número de galletas que recibe cada amigo.`,
    ans: (_a, b) => `${b}/n`,
  },
  {
    kind: "share",
    en: (_a, b) => `A team of n runners shares a ${b}-mile relay race equally. Write an expression for the miles each runner covers.`,
    es: (_a, b) => `Un equipo de n corredores se reparte por igual una carrera de relevos de ${b} millas. Escribe una expresión para las millas que corre cada uno.`,
    ans: (_a, b) => `${b}/n`,
  },
];

function exprWrite(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const ph = r.pick(PHRASES_1);
    // A small factor for products, so the power distractor (k³ for "3 times k") stays a believable slip.
    const v = r.pick(VARS), c = ph.op === "mul" ? r.int(2, 5) : r.int(2, 12);
    const phrase = tr(locale, ph.en(v, c), ph.es(v, c));
    const choice = (op: Op1, why?: string): Choice => ({ label: OP1_LABEL[op](v, c), say: op1Say(op, v, c, locale), ...(why ? { why } : {}) });
    const order = ph.op.startsWith("sub") || ph.op.startsWith("div");
    // Only one choice adds, so naming the operation would settle a sum: its third hint tries a number
    // instead, one that is not c, so the learner can tell the number tried from the number in the words.
    const tryV = c === 10 ? 20 : 10;
    const tried = tr(locale, ph.en(String(tryV), c), ph.es(String(tryV), c));
    return {
      prompt: [tr(locale, "Which expression means ", "¿Qué expresión significa "), `“${phrase}”?`],
      say: tr(locale, `Which expression means: ${phrase}?`, `¿Qué expresión significa: ${phrase}?`),
      ...withChoices(r, choice(ph.op), ph.wrong.map(([op, why]) => choice(op, why))),
      hints: [
        tr(locale, `What operation do the words “${ph.key[0]}” tell you to do?`, `¿Qué operación indican las palabras “${ph.key[1]}”?`),
        order
          ? tr(locale, "Find the operation, then the order. Subtraction and division change if you switch the numbers.", "Busca la operación y luego el orden. La resta y la división cambian si intercambias los números.")
          : ph.op === "add"
            ? tr(locale, `Find the operation. To check a choice, put a number in for ${v} and see whether it matches the words.`, `Busca la operación. Para comprobar una opción, pon un número en lugar de ${v} y mira si coincide con las palabras.`)
            : tr(locale, "Find the operation. Multiplying gives the same result in either order.", "Busca la operación. Multiplicar da el mismo resultado en cualquier orden."),
        ph.op === "add"
          ? tr(locale, `Try ${v} = ${tryV}: “${phrase}” becomes “${tried}”.`, `Prueba con ${v} = ${tryV}: “${phrase}” se convierte en “${tried}”.`)
          : tr(locale, `“${ph.key[0]}” means ${OP_WORD[ph.op][0]}.`, `“${ph.key[1]}” significa ${OP_WORD[ph.op][1]}.`),
      ],
      steps: [op1Step(ph.op, v, c, locale), OP1_LABEL[ph.op](v, c)],
      seconds: 20,
    };
  }
  if (level === 2) {
    const v = r.pick(VARS), a = r.int(2, 9), b = r.int(1, 12);
    const ph = r.pick(PHRASES_2);
    const phrase = tr(locale, ph.en(v, a, b), ph.es(v, a, b));
    const ans = ph.ans(v, a, b);
    const answer: Answer = { kind: "expr", expr: ans };
    return {
      prompt: [tr(locale, "Write an expression for ", "Escribe una expresión para "), `“${phrase}”.`],
      say: tr(locale, `Write an expression for: ${phrase}.`, `Escribe una expresión para: ${phrase}.`),
      input: "expr",
      answer,
      wrong: wrongFor(answer, ph.wrong.map(([f, why]) => w(f(v, a, b), why))),
      hints: [
        tr(locale, `Which part of “${phrase}” is one quantity?`, `¿Qué parte de “${phrase}” es una sola cantidad?`),
        tr(locale, "Write that part first. When a sum or difference is multiplied or divided as a whole, put it in parentheses.", "Escribe primero esa parte. Cuando una suma o una diferencia se multiplica o se divide completa, ponla entre paréntesis."),
        ph.first(v, a, b, locale),
      ],
      steps: [ph.first(v, a, b, locale), ans],
      seconds: 40,
    };
  }
  const st = r.pick(STORIES_3), who = r.pick(NAMES);
  const a = r.int(2, 12);
  const b = st.kind === "minus" ? a * r.int(5, 12) : st.kind === "share" ? r.int(3, 12) * 4 : r.int(5, 40);
  const q = tr(locale, st.en(a, b, who), st.es(a, b, who));
  const ans = st.ans(a, b);
  const answer: Answer = { kind: "expr", expr: ans };
  const wrongs =
    st.kind === "plus"
      ? [w(`${b}n + ${a}`, "swapped-the-rate-and-the-start"), w(`${a + b}n`, "combined-the-rate-and-the-start"), w(`${a}n`, "left-out-the-start")]
      : st.kind === "minus"
        ? [w(`${a}n − ${b}`, "reversed-the-subtraction-order"), w(`${b} + ${a}n`, "added-instead-of-subtracting"), w(`${b - a}n`, "combined-the-rate-and-the-start")]
        : [w(`n/${b}`, "reversed-the-division-order"), w(`${b}n`, "multiplied-instead-of-dividing"), w(`${b} − n`, "subtracted-instead-of-dividing")];
  return {
    prompt: [q],
    say: speak(q, locale),
    input: "expr",
    answer,
    wrong: wrongFor(answer, wrongs),
    hints:
      st.kind === "share"
        ? [
            tr(locale, `What happens to the ${b} when it is shared equally?`, `¿Qué pasa con el ${b} cuando se reparte en partes iguales?`),
            tr(locale, "Sharing equally means dividing the total by the number of people.", "Repartir en partes iguales significa dividir el total entre el número de personas."),
            tr(locale, `The total, ${b}, is divided by n.`, `El total, ${b}, se divide entre n.`),
          ]
        : [
            tr(locale, "What changes with n, and what stays the same?", "¿Qué cambia con n y qué se queda igual?"),
            tr(locale, "An amount that happens for each one is multiplied by n. An amount that happens once is added or subtracted once.", "Una cantidad que se repite por cada uno se multiplica por n. Una cantidad que ocurre una sola vez se suma o se resta una vez."),
            tr(locale, `The part that changes with n is ${a}n.`, `La parte que cambia con n es ${a}n.`),
          ],
    steps:
      st.kind === "share"
        ? [tr(locale, `Total ${b}, shared among n: ${b} ÷ n`, `Total ${b}, repartido entre n: ${b} ÷ n`), ans]
        : [tr(locale, `Changes with n: ${a}n`, `Cambia con n: ${a}n`), tr(locale, `Stays the same: ${b}`, `Se queda igual: ${b}`), ans],
    seconds: 60,
  };
}

// ---------- m.expr.equiv ----------

const coefV = (c: number, v: string) => (c === 1 ? v : `${c}${v}`);
/** "3x + 12", "3x − 12". */
const lin = (c: number, v: string, k: number) => `${coefV(c, v)} ${k < 0 ? "−" : "+"} ${Math.abs(k)}`;
const sayLin = (c: number, v: string, k: number, locale: Locale) => `${c === 1 ? v : `${c} ${v}`} ${k < 0 ? tr(locale, "minus", "menos") : tr(locale, "plus", "más")} ${Math.abs(k)}`;

function exprEquiv(r: Rng, level: number, locale: Locale): ItemBody {
  const v = r.pick(VARS);
  if (level === 1) {
    const a = r.int(2, 9), b = r.int(1, 6);
    let c = r.int(1, 12);
    while (a === 2 && c === 2) c = r.int(1, 12); // 2 + 2 = 2 × 2 would hide the "added" mistake
    const form = r.int(0, 2); // b·v + c, b·v − c, c + b·v
    const inner = form === 2 ? `${c} + ${coefV(b, v)}` : lin(b, v, form === 1 ? -c : c);
    const sayInner = form === 2 ? `${c} ${tr(locale, "plus", "más")} ${b === 1 ? v : `${b} ${v}`}` : sayLin(b, v, form === 1 ? -c : c, locale);
    const sg = form === 1 ? -1 : 1;
    const shape = (cv: number, k: number) => (form === 2 ? `${k} + ${coefV(cv, v)}` : lin(cv, v, sg * k));
    const ans = shape(a * b, a * c);
    const answer: Answer = { kind: "expr", expr: ans, form: "expanded" };
    return {
      prompt: [tr(locale, "Use the distributive property to write an equivalent expression without parentheses: ", "Usa la propiedad distributiva para escribir una expresión equivalente sin paréntesis: "), `${a}(${inner})`],
      say: tr(locale, `Use the distributive property to write ${a} times the quantity ${sayInner} without parentheses.`, `Usa la propiedad distributiva para escribir ${a} por la cantidad ${sayInner} sin paréntesis.`),
      input: "expr",
      answer,
      wrong: wrongFor(answer, [w(shape(a * b, c), "multiplied-only-the-first-term"), w(shape(b, a * c), "multiplied-only-the-second-term"), w(shape(a * b, a + c), "added-instead-of-multiplying")]),
      hints: [
        tr(locale, `How many terms are inside the parentheses? The ${a} multiplies each one.`, `¿Cuántos términos hay dentro del paréntesis? El ${a} multiplica a cada uno.`),
        tr(
          locale,
          `Multiply ${a} by ${coefV(b, v)} and ${a} by ${c}. Keep the ${form === 1 ? "minus" : "plus"} sign between them.`,
          `Multiplica ${a} por ${coefV(b, v)} y ${a} por ${c}. Conserva el signo ${form === 1 ? "menos" : "más"} entre ellos.`,
        ),
        `${a} × ${coefV(b, v)} = ${coefV(a * b, v)}`,
      ],
      steps: [`${a} × ${coefV(b, v)} = ${coefV(a * b, v)}`, `${a} × ${c} = ${a * c}`, `${a}(${inner}) = ${ans}`],
      seconds: 30,
    };
  }
  if (level === 2) {
    // Factor out the greatest common factor; g always has a smaller factor, so "a common factor, not the greatest" is on offer.
    const g = r.pick([4, 6, 8, 9, 10, 12]);
    let p: number, q: number;
    do {
      p = r.int(1, 6);
      q = r.int(1, 9);
    } while (gcd(p, q) !== 1 || p === q || g * Math.max(p, q) > 90);
    const constFirst = r.bool(0.3);
    const P = g * p, Qn = g * q;
    const shownExpr = constFirst ? `${Qn} + ${coefV(P, v)}` : lin(P, v, Qn);
    const fact = (k: number, cp: number, cq: number) => `${k}(${constFirst ? `${cq} + ${coefV(cp, v)}` : lin(cp, v, cq)})`;
    const sayFact = (k: number, cp: number, cq: number) =>
      tr(locale, `${k} times the quantity `, `${k} por la cantidad `) + (constFirst ? `${cq} ${tr(locale, "plus", "más")} ${cp === 1 ? v : `${cp} ${v}`}` : sayLin(cp, v, cq, locale));
    const small = [2, 3, 4, 5, 6].filter((f) => g % f === 0 && f < g);
    const f = small[r.int(0, small.length - 1)];
    const option = (k: number, cp: number, cq: number, why?: string): Choice => ({ label: fact(k, cp, cq), say: sayFact(k, cp, cq), ...(why ? { why } : {}) });
    const wrong = [option(f, (g / f) * p, (g / f) * q, "used-a-common-factor-not-the-greatest"), option(g, p, Qn, "divided-only-one-term")];
    if (p > 1 && q > 1) wrong.push(option(g, P - g, Qn - g, "subtracted-the-gcf-instead-of-dividing"));
    else wrong.push(option(g, P, q, "divided-only-one-term"));
    return {
      prompt: [tr(locale, "Which expression is equal to ", "¿Qué expresión es igual a "), shownExpr, tr(locale, " and has the greatest common factor outside the parentheses?", " y tiene el máximo común divisor fuera del paréntesis?")],
      say: tr(
        locale,
        `Which expression is equal to ${constFirst ? `${Qn} plus ${P === 1 ? v : `${P} ${v}`}` : sayLin(P, v, Qn, locale)}, with the greatest common factor outside the parentheses?`,
        `¿Qué expresión es igual a ${constFirst ? `${Qn} más ${P} ${v}` : sayLin(P, v, Qn, locale)}, con el máximo común divisor fuera del paréntesis?`,
      ),
      ...withChoices(r, option(g, p, q), wrong),
      hints: [
        tr(locale, `What is the greatest number that divides both ${P} and ${Qn}?`, `¿Cuál es el mayor número que divide a ${P} y a ${Qn}?`),
        tr(locale, "Write the greatest common factor outside the parentheses. Inside, write what is left of each term after dividing by it.", "Escribe el máximo común divisor fuera del paréntesis. Adentro, escribe lo que queda de cada término al dividirlo entre él."),
        tr(locale, `The greatest common factor of ${P} and ${Qn} is ${g}.`, `El máximo común divisor de ${P} y ${Qn} es ${g}.`),
      ],
      steps: [
        tr(locale, `Greatest common factor of ${P} and ${Qn}: ${g}`, `Máximo común divisor de ${P} y ${Qn}: ${g}`),
        `${coefV(P, v)} ÷ ${g} = ${coefV(p, v)}, ${Qn} ÷ ${g} = ${q}`,
        `${shownExpr} = ${fact(g, p, q)}`,
      ],
      seconds: 40,
    };
  }
  // Distribute, then combine like terms; the distractors are the classic slips.
  const a = r.int(2, 5), b = r.int(1, 4), c = r.int(1, 9), e = r.int(1, 9);
  const form = r.int(0, 2); // a(bv + c) + ev, a(bv + c) + e, ev + a(bv + c)
  const paren = `${a}(${lin(b, v, c)})`;
  const shownExpr = form === 0 ? `${paren} + ${coefV(e, v)}` : form === 1 ? `${paren} + ${e}` : `${coefV(e, v)} + ${paren}`;
  const sayParen = `${a} ${tr(locale, "times the quantity", "por la cantidad")} ${sayLin(b, v, c, locale)}`;
  const sayE = e === 1 ? v : `${e} ${v}`;
  const said = form === 0 ? `${sayParen}, ${tr(locale, "plus", "más")} ${sayE}` : form === 1 ? `${sayParen}, ${tr(locale, "plus", "más")} ${e}` : `${sayE} ${tr(locale, "plus", "más")} ${sayParen}`;
  const vTerm = form === 1 ? 0 : e, kTerm = form === 1 ? e : 0;
  const expr = (cv: number, k: number) => (k === 0 ? coefV(cv, v) : lin(cv, v, k));
  const option = (cv: number, k: number, why?: string): Choice => ({ label: expr(cv, k), say: k === 0 ? (cv === 1 ? v : `${cv} ${v}`) : sayLin(cv, v, k, locale), ...(why ? { why } : {}) });
  const right = option(a * b + vTerm, a * c + kTerm);
  const wrong = [
    option(a * b + vTerm, c + kTerm, "multiplied-only-the-first-term"),
    option(a * b + a * c + e, 0, "combined-unlike-terms"),
    option(a * b + a * vTerm, a * c + a * kTerm, "multiplied-the-outside-term-too"),
  ];
  return {
    prompt: [tr(locale, "Which expression is equivalent to ", "¿Qué expresión es equivalente a "), shownExpr, "?"],
    say: tr(locale, `Which expression is equivalent to ${said}?`, `¿Qué expresión es equivalente a ${said}?`),
    ...withChoices(r, right, wrong),
    hints: [
      tr(locale, `What does the ${a} in front of the parentheses multiply?`, `¿A qué multiplica el ${a} que está delante del paréntesis?`),
      tr(locale, "Distribute first. Then combine like terms: terms with the variable together, numbers together.", "Primero aplica la propiedad distributiva. Luego combina los términos semejantes: los términos con variable juntos y los números juntos."),
      `${paren} = ${lin(a * b, v, a * c)}`,
    ],
    steps: [`${paren} = ${lin(a * b, v, a * c)}`, form === 1 ? `${a * c} + ${e} = ${a * c + e}` : `${coefV(a * b, v)} + ${coefV(e, v)} = ${coefV(a * b + e, v)}`, `${shownExpr} = ${right.label}`],
    seconds: 45,
  };
}

// ---------- m.ineq.graph ----------

type Op = ">" | "<" | "≥" | "≤";
const FLIP: Record<Op, Op> = { ">": "<", "<": ">", "≥": "≤", "≤": "≥" };
const EDGE: Record<Op, Op> = { ">": "≥", "<": "≤", "≥": ">", "≤": "<" };
const INCLUDES = (op: Op) => op === "≥" || op === "≤";
const ABOVE = (op: Op) => op === ">" || op === "≥";
function sayOp(op: Op, locale: Locale) {
  return {
    ">": tr(locale, "is greater than", "es mayor que"),
    "<": tr(locale, "is less than", "es menor que"),
    "≥": tr(locale, "is greater than or equal to", "es mayor o igual que"),
    "≤": tr(locale, "is less than or equal to", "es menor o igual que"),
  }[op];
}

type IneqStory = { op: Op; v: string; range: [number, number]; en: (c: string) => string; es: (c: string) => string; key: [string, string] };
const INEQ_STORIES: IneqStory[] = [
  {
    op: "≥", v: "h", range: [42, 54], key: ["at least", "al menos"],
    en: (c) => `A rider must be at least ${c} inches tall to go on a roller coaster. Let h be a rider's height in inches.`,
    es: (c) => `Para subir a una montaña rusa, una persona debe medir al menos ${c} pulgadas. Sea h la estatura en pulgadas.`,
  },
  {
    op: "≤", v: "p", range: [8, 16], key: ["at most", "como máximo"],
    en: (c) => `An elevator can carry at most ${c} people. Let p be the number of people in the elevator.`,
    es: (c) => `Un elevador puede llevar como máximo ${c} personas. Sea p el número de personas en el elevador.`,
  },
  {
    op: "<", v: "t", range: [-8, 5], key: ["below", "por debajo de"],
    en: (c) => `Tonight the temperature will stay below ${c}°F. Let t be the temperature in degrees Fahrenheit.`,
    es: (c) => `Esta noche la temperatura se mantendrá por debajo de ${c} °F. Sea t la temperatura en grados Fahrenheit.`,
  },
  {
    op: ">", v: "s", range: [20, 40], key: ["more than", "más de"],
    en: (c) => `A team needs more than ${c} points to reach the finals. Let s be the team's points.`,
    es: (c) => `Un equipo necesita más de ${c} puntos para llegar a la final. Sea s el número de puntos del equipo.`,
  },
  {
    op: "≤", v: "k", range: [3, 8], key: ["no more than", "no más de"],
    en: (c) => `A space capsule can carry no more than ${c} astronauts. Let k be the number of astronauts on board.`,
    es: (c) => `Una cápsula espacial puede llevar no más de ${c} astronautas. Sea k el número de astronautas a bordo.`,
  },
  {
    op: "≥", v: "f", range: [2, 6], key: ["at least", "al menos"],
    en: (c) => `A bread recipe needs at least ${c} cups of flour. Let f be the cups of flour used.`,
    es: (c) => `Una receta de pan necesita al menos ${c} tazas de harina. Sea f el número de tazas de harina.`,
  },
  {
    op: "<", v: "n", range: [20, 32], key: ["fewer than", "menos de"],
    en: (c) => `Fewer than ${c} students can sign up for the art class. Let n be the number of students who sign up.`,
    es: (c) => `Menos de ${c} estudiantes pueden inscribirse en la clase de arte. Sea n el número de estudiantes inscritos.`,
  },
  {
    op: ">", v: "t", range: [-10, -1], key: ["above", "por encima de"],
    en: (c) => `In a trivia game, a player stays in the game while the score is above ${c} ${c === "−1" ? "point" : "points"}. Let t be the score.`,
    es: (c) => `En un juego de preguntas, un jugador sigue en el juego mientras su puntaje esté por encima de ${c} ${c === "−1" ? "punto" : "puntos"}. Sea t el puntaje.`,
  },
  {
    op: "≥", v: "m", range: [30, 60], key: ["or more", "o más"],
    en: (c) => `Each music practice must last ${c} minutes or more. Let m be the length of a practice in minutes.`,
    es: (c) => `Cada práctica de música debe durar ${c} minutos o más. Sea m la duración de una práctica, en minutos.`,
  },
  {
    op: "<", v: "x", range: [10, 14], key: ["younger than", "menores de"],
    en: (c) => `A museum gives free entry to children younger than ${c}. Let x be a child's age in years.`,
    es: (c) => `Un museo da entrada gratis a los niños menores de ${c} años. Sea x la edad de un niño, en años.`,
  },
  {
    op: "≤", v: "w", range: [20, 30], key: ["or less", "o menos"],
    en: (c) => `Dogs in the small-dog play group weigh ${c} pounds or less. Let w be a dog's weight in pounds.`,
    es: (c) => `Los perros del grupo de juego para perros pequeños pesan ${c} libras o menos. Sea w el peso de un perro, en libras.`,
  },
  {
    op: ">", v: "d", range: [100, 200], key: ["higher than", "a más de"],
    en: (c) => `To pass the launch test, a model rocket has to fly higher than ${c} meters. Let d be the height it reaches, in meters.`,
    es: (c) => `Para pasar la prueba de lanzamiento, un cohete de modelismo tiene que volar a más de ${c} metros de altura. Sea d la altura que alcanza, en metros.`,
  },
];

type PadStory = { op: Op; range: [number, number]; en: (c: string) => string; es: (c: string) => string };
const PAD_STORIES: PadStory[] = [
  {
    op: "<", range: [-6, 2],
    en: (c) => `A freezer must stay colder than ${c}°F. What is the warmest whole-degree temperature that works?`,
    es: (c) => `Un congelador debe estar más frío que ${c} °F. ¿Cuál es la temperatura más alta, en grados enteros, que sirve?`,
  },
  {
    op: "≥", range: [-6, -1],
    en: (c) => `In a quiz game, a team stays in the round while its score is at least ${c} ${c === "−1" ? "point" : "points"}. What is the lowest whole-number score that keeps the team in the round?`,
    es: (c) => `En un juego de preguntas, un equipo sigue en la ronda mientras su puntaje sea de al menos ${c} ${c === "−1" ? "punto" : "puntos"}. ¿Cuál es el puntaje entero más bajo con el que el equipo sigue en la ronda?`,
  },
  {
    // A three-season sleeping bag is rated about −1 °C to −9 °C, so a boundary under freezing is real. (A
    // winter bag, rated colder, would put the answer off the −10 to 10 line.)
    op: ">", range: [-9, -1],
    en: (c) => `A sleeping bag keeps a camper warm on nights warmer than ${c}°C. What is the coldest whole-degree night temperature at which it keeps the camper warm?`,
    es: (c) => `Una bolsa de dormir mantiene abrigado a un campista en noches con más de ${c} °C. ¿Cuál es la temperatura más baja, en grados enteros, a la que lo mantiene abrigado?`,
  },
  {
    op: "≤", range: [-8, -2],
    en: (c) => `A diver is told to stay at an elevation of ${c} meters or lower. What is the highest whole-number elevation the diver can be at?`,
    es: (c) => `A un buzo le indican que se mantenga a una elevación de ${c} metros o menos. ¿Cuál es la elevación más alta, en metros enteros, a la que puede estar el buzo?`,
  },
  {
    op: "<", range: [-3, 4],
    en: (c) => `In a golf tournament, a player wins a prize for a score below ${c}. What is the highest whole-number score that wins a prize?`,
    es: (c) => `En un torneo de golf, un jugador gana un premio con una puntuación menor que ${c}. ¿Cuál es la puntuación entera más alta que gana un premio?`,
  },
  {
    op: ">", range: [-5, -1],
    en: (c) => `A soccer team moves to the next round if its goal difference is more than ${c}. What is the lowest whole-number goal difference that moves the team on?`,
    es: (c) => `Un equipo de fútbol pasa a la siguiente ronda si su diferencia de goles es mayor que ${c}. ¿Cuál es la diferencia de goles entera más baja con la que el equipo pasa?`,
  },
  {
    op: "≥", range: [-9, -3],
    en: (c) => `A space probe's camera works at temperatures of ${c}°C or warmer. What is the coldest whole-degree temperature at which the camera works?`,
    es: (c) => `La cámara de una sonda espacial funciona a temperaturas de ${c} °C o más. ¿Cuál es la temperatura más baja, en grados enteros, a la que funciona la cámara?`,
  },
];

/** The least (for > and ≥) or greatest (for < and ≤) integer solution of x op c, and the slips around it. */
function boundary(op: Op, c: number) {
  const least = ABOVE(op);
  if (!Number.isInteger(c)) {
    const ans = (least ? Math.ceil(c) : Math.floor(c)) + 0; // + 0 turns −0 into 0
    return { least, ans, slips: [w((least ? Math.floor(c) : Math.ceil(c)) + 0, "rounded-the-wrong-way")] };
  }
  const ans = op === ">" ? c + 1 : op === "<" ? c - 1 : c;
  return {
    least,
    ans,
    slips: INCLUDES(op)
      ? [w(least ? c + 1 : c - 1, "left-out-the-boundary"), w(least ? c - 1 : c + 1, "looked-on-the-wrong-side")]
      : [w(c, "included-the-boundary"), w(least ? c - 1 : c + 1, "looked-on-the-wrong-side")],
  };
}

function ineqGraph(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const st = r.pick(INEQ_STORIES);
    const c = r.int(...st.range);
    const q = `${tr(locale, st.en(show(c)), st.es(show(c)))} ${tr(locale, "Which inequality shows this?", "¿Qué desigualdad lo representa?")}`;
    const choice = (op: Op, why?: string): Choice => ({ label: `${st.v} ${op} ${show(c)}`, say: `${st.v} ${sayOp(op, locale)} ${sayN(c, locale)}`, ...(why ? { why } : {}) });
    const incl = INCLUDES(st.op), above = ABOVE(st.op);
    const key = tr(locale, st.key[0], st.key[1]);
    return {
      prompt: [q],
      say: speak(q, locale),
      ...withChoices(r, choice(st.op), [choice(FLIP[st.op], "reversed-the-inequality"), choice(EDGE[st.op], "mixed-up-strict-and-inclusive"), choice(FLIP[EDGE[st.op]], "reversed-and-mixed-up-strict")]),
      hints: [
        tr(locale, `Is ${show(c)} itself allowed? Look at the words “${key}”.`, `¿Se permite el ${show(c)}? Fíjate en las palabras “${key}”.`),
        tr(locale, "Decide two things: are the allowed values above or below the number, and is the number itself allowed?", "Decide dos cosas: ¿los valores permitidos están por encima o por debajo del número? ¿Se permite el número mismo?"),
        incl ? tr(locale, `${show(c)} itself is allowed.`, `El ${show(c)} sí se permite.`) : tr(locale, `${show(c)} itself is not allowed.`, `El ${show(c)} no se permite.`),
      ],
      steps: [
        tr(
          locale,
          `“${key}”: values ${above ? "above" : "below"} ${show(c)}, ${incl ? `and ${show(c)} itself` : `but not ${show(c)} itself`}.`,
          `“${key}”: valores ${above ? "por encima" : "por debajo"} de ${show(c)}, ${incl ? `y también el ${show(c)}` : `pero no el ${show(c)}`}.`,
        ),
        `${st.v} ${st.op} ${show(c)}`,
      ],
      seconds: 30,
    };
  }
  const pad = { kind: "number-line" as const, min: -10, max: 10, step: 1 };
  if (level === 2) {
    const op = r.pick<Op>([">", "<", "≥", "≤"]);
    const c = r.bool(0.3) ? r.int(-8, 7) + 0.5 : r.int(-8, 8);
    const { least, ans, slips } = boundary(op, c);
    const answer: Answer = { kind: "number", value: ans };
    const ineq = `x ${op} ${showD(c)}`;
    const side = least ? tr(locale, "right", "derecha") : tr(locale, "left", "izquierda");
    return {
      prompt: least
        ? [tr(locale, "Tap the least integer that makes ", "Toca el menor número entero que hace verdadera la desigualdad "), ineq, tr(locale, " true.", ".")]
        : [tr(locale, "Tap the greatest integer that makes ", "Toca el mayor número entero que hace verdadera la desigualdad "), ineq, tr(locale, " true.", ".")],
      say: tr(
        locale,
        `x ${sayOp(op, locale)} ${sayN(c, locale)}. Tap the ${least ? "least" : "greatest"} integer that makes this true.`,
        `x ${sayOp(op, locale)} ${sayN(c, locale)}. Toca el ${least ? "menor" : "mayor"} número entero que hace verdadera esta desigualdad.`,
      ),
      input: "number-line",
      pad,
      answer,
      wrong: wrongFor(answer, slips),
      hints: [
        tr(locale, `Are the solutions of ${ineq} to the left or to the right of ${showD(c)}?`, `¿Las soluciones de ${ineq} están a la izquierda o a la derecha de ${showD(c)}?`),
        tr(locale, "Find the boundary point and decide whether it is included. Then move toward the solutions to the first integer that works.", "Ubica el punto frontera y decide si está incluido. Luego avanza hacia las soluciones hasta el primer número entero que funcione."),
        tr(locale, `The solutions are to the ${side} of ${showD(c)}.`, `Las soluciones están a la ${side} de ${showD(c)}.`),
      ],
      steps: [
        !Number.isInteger(c)
          ? tr(locale, `${showD(c)} is not an integer. The first integer to its ${side} is ${show(ans)}.`, `${showD(c)} no es un número entero. El primer entero a su ${side} es ${show(ans)}.`)
          : INCLUDES(op)
            ? tr(locale, `${show(c)} is included, because ${op} includes “equal to”.`, `${show(c)} está incluido, porque ${op} incluye “igual a”.`)
            : tr(locale, `${show(c)} is not included, because ${op} does not include “equal to”.`, `${show(c)} no está incluido, porque ${op} no incluye “igual a”.`),
        tr(locale, `The ${least ? "least" : "greatest"} integer solution is ${show(ans)}.`, `El ${least ? "menor" : "mayor"} entero que es solución es ${show(ans)}.`),
      ],
      seconds: 20,
    };
  }
  const st = r.pick(PAD_STORIES);
  const c = r.int(...st.range);
  const { least, ans, slips } = boundary(st.op, c);
  const answer: Answer = { kind: "number", value: ans };
  const q = tr(locale, st.en(show(c)), st.es(show(c)));
  const ineq = `x ${st.op} ${show(c)}`;
  return {
    // "ese número", not "Tócala": the thing asked for is a score, a temperature or an elevation, of either gender.
    prompt: [`${q} ${tr(locale, "Tap it on the number line.", "Toca ese número en la recta numérica.")}`],
    say: `${speak(q, locale)} ${tr(locale, "Tap it on the number line.", "Toca ese número en la recta numérica.")}`,
    input: "number-line",
    pad,
    answer,
    wrong: wrongFor(answer, slips),
    hints: [
      tr(locale, `Write the condition as an inequality. Do the values that work lie above or below ${show(c)}?`, `Escribe la condición como una desigualdad. ¿Los valores que sirven están por encima o por debajo de ${show(c)}?`),
      tr(locale, "Decide whether the boundary itself works, then move toward the values that work to the first whole number.", "Decide si el punto frontera sirve y luego avanza hacia los valores que sirven hasta el primer número entero."),
      tr(locale, `The condition is ${ineq}.`, `La condición es ${ineq}.`),
    ],
    steps: [
      ineq,
      INCLUDES(st.op) ? tr(locale, `${show(c)} itself works.`, `El ${show(c)} sí sirve.`) : tr(locale, `${show(c)} itself does not work.`, `El ${show(c)} no sirve.`),
      tr(locale, `The ${least ? "least" : "greatest"} whole number that works is ${show(ans)}.`, `El ${least ? "menor" : "mayor"} número entero que sirve es ${show(ans)}.`),
    ],
    seconds: 45,
  };
}

// ---------- m.percent.whole ----------

/** A step for wholes so that p% of them, and the benchmark on the way (10%, 25%, 5%…), are whole numbers. */
const pctUnit = (p: number) => {
  const base = 100 / gcd(p, 100);
  const bench = p === 50 ? 2 : p === 25 || p === 75 ? 4 : p % 10 === 0 ? 10 : 20;
  return (base * bench) / gcd(base, bench);
};

/** How to find p% of w with benchmark percents: a strategy, the first step done, and the worked lines. */
function pctPlan(p: number, w0: number, locale: Locale) {
  const part = (w0 * p) / 100;
  const of = (q: number, v: number) => tr(locale, `${q}% of ${w0} = ${v}`, `${q}% de ${w0} = ${v}`);
  const divide = (k: number) => tr(locale, `Divide ${w0} by ${k}.`, `Divide ${w0} entre ${k}.`);
  if (p === 50) return { strategy: tr(locale, "50% is one half.", "50% es la mitad."), first: divide(2), steps: ["50% = 1/2", `${w0} ÷ 2 = ${part}`] };
  if (p === 25) return { strategy: tr(locale, "25% is one fourth.", "25% es un cuarto."), first: divide(4), steps: ["25% = 1/4", `${w0} ÷ 4 = ${part}`] };
  if (p === 10) return { strategy: tr(locale, "10% is one tenth.", "10% es un décimo."), first: divide(10), steps: ["10% = 1/10", `${w0} ÷ 10 = ${part}`] };
  if (p === 75)
    return { strategy: tr(locale, "75% is three fourths: find 25%, then take it 3 times.", "75% son tres cuartos: calcula el 25% y tómalo 3 veces."), first: of(25, w0 / 4), steps: [of(25, w0 / 4), `3 × ${w0 / 4} = ${part}`] };
  if (p % 10 === 0)
    return {
      strategy: tr(locale, `Find 10% first by dividing by 10. ${p}% is ${p / 10} times that.`, `Primero calcula el 10% dividiendo entre 10. El ${p}% es ${p / 10} veces eso.`),
      first: of(10, w0 / 10),
      steps: [of(10, w0 / 10), `${p / 10} × ${w0 / 10} = ${part}`],
    };
  if (p === 5) return { strategy: tr(locale, "5% is half of 10%.", "5% es la mitad del 10%."), first: of(10, w0 / 10), steps: [of(10, w0 / 10), `${w0 / 10} ÷ 2 = ${part}`] };
  const tens = (p - 5) / 10;
  return {
    strategy: tr(locale, `${p}% = ${p - 5}% + 5%. Find 10% first; 5% is half of it.`, `${p}% = ${p - 5}% + 5%. Primero calcula el 10%; el 5% es la mitad.`),
    first: of(10, w0 / 10),
    steps: [of(10, w0 / 10), of(5, w0 / 20), `${tens === 1 ? w0 / 10 : `${tens} × ${w0 / 10}`} + ${w0 / 20} = ${part}`],
  };
}

type PartStory = { range: [number, number]; en: (w0: number, p: number, who: string) => string; es: (w0: number, p: number, who: string) => string; unit: [string, string] };
const PART_STORIES: PartStory[] = [
  {
    range: [20, 60], unit: ["games", "partidos"],
    en: (w0, p) => `A soccer team played ${w0} games this season and won ${p}% of them. How many games did the team win?`,
    es: (w0, p) => `Un equipo de fútbol jugó ${w0} partidos esta temporada y ganó el ${p}% de ellos. ¿Cuántos partidos ganó el equipo?`,
  },
  {
    range: [20, 200], unit: ["jazz songs", "canciones de jazz"],
    en: (w0, p, who) => `${who}'s playlist has ${w0} songs, and ${p}% of them are jazz songs. How many jazz songs are on the playlist?`,
    es: (w0, p, who) => `La lista de canciones de ${who} tiene ${w0} canciones, y el ${p}% son de jazz. ¿Cuántas canciones de jazz hay en la lista?`,
  },
  {
    range: [20, 200], unit: ["cats", "gatos"],
    en: (w0, p) => `An animal shelter has ${w0} animals, and ${p}% of them are cats. How many cats are at the shelter?`,
    es: (w0, p) => `Un refugio de animales tiene ${w0} animales, y el ${p}% son gatos. ¿Cuántos gatos hay en el refugio?`,
  },
  {
    range: [40, 300], unit: ["students", "estudiantes"],
    en: (w0, p) => `${w0} students went to a space camp, and ${p}% of them chose the rocket-building workshop. How many students chose it?`,
    es: (w0, p) => `${w0} estudiantes fueron a un campamento espacial, y el ${p}% eligió el taller de construcción de cohetes. ¿Cuántos estudiantes lo eligieron?`,
  },
  {
    range: [40, 300], unit: ["muffins", "panecillos"],
    en: (w0, p) => `A bakery made ${w0} muffins, and ${p}% of them have blueberries. How many blueberry muffins did it make?`,
    es: (w0, p) => `Una panadería hizo ${w0} panecillos, y el ${p}% tiene arándanos. ¿Cuántos panecillos de arándanos hizo?`,
  },
  {
    range: [20, 200], unit: ["levels", "niveles"],
    en: (w0, p, who) => `A video game has ${w0} levels. ${who} has finished ${p}% of them. How many levels has ${who} finished?`,
    es: (w0, p, who) => `Un videojuego tiene ${w0} niveles. ${who} ha terminado el ${p}% de ellos. ¿Cuántos niveles ha terminado ${who}?`,
  },
  {
    range: [20, 200], unit: ["wide brushes", "pinceles anchos"],
    en: (w0, p) => `An art club has ${w0} paintbrushes, and ${p}% of them are wide brushes. How many wide brushes does the club have?`,
    es: (w0, p) => `Un club de arte tiene ${w0} pinceles, y el ${p}% son pinceles anchos. ¿Cuántos pinceles anchos tiene el club?`,
  },
];

type WholeStory = { range: [number, number]; money?: boolean; en: (part: string, p: number, who: string) => string; es: (part: string, p: number, who: string) => string; unit: [string, string] };
const WHOLE_STORIES: WholeStory[] = [
  {
    range: [40, 400], unit: ["pages", "páginas"],
    en: (n, p, who) => `${who} has read ${n} pages of a book. That is ${p}% of the book. How many pages does the book have?`,
    es: (n, p, who) => `${who} ha leído ${n} páginas de un libro. Eso es el ${p}% del libro. ¿Cuántas páginas tiene el libro?`,
  },
  {
    range: [20, 40], unit: ["students", "estudiantes"],
    en: (n, p) => `In a class, ${n} students walk to school. That is ${p}% of the class. How many students are in the class?`,
    es: (n, p) => `En una clase, ${n} estudiantes caminan a la escuela. Eso es el ${p}% de la clase. ¿Cuántos estudiantes hay en la clase?`,
  },
  {
    range: [40, 400], money: true, unit: ["dollars", "dólares"],
    en: (n, p, who) => `${who} has saved ${n}. That is ${p}% of the price of a music keyboard. What is the price of the keyboard, in dollars?`,
    es: (n, p, who) => `${who} ha ahorrado ${n}. Eso es el ${p}% del precio de un teclado musical. ¿Cuál es el precio del teclado, en dólares?`,
  },
  {
    range: [100, 900], unit: ["gallons", "galones"],
    en: (n, p) => `A test rocket has burned ${n} gallons of fuel. That is ${p}% of the fuel it carried. How many gallons did it carry?`,
    es: (n, p) => `Un cohete de prueba ha quemado ${n} galones de combustible. Eso es el ${p}% del combustible que llevaba. ¿Cuántos galones llevaba?`,
  },
  {
    range: [20, 80], unit: ["singers", "cantantes"],
    en: (n, p) => `A choir has ${n} sopranos. That is ${p}% of the singers in the choir. How many singers are in the choir?`,
    es: (n, p) => `Un coro tiene ${n} sopranos. Eso es el ${p}% de los cantantes del coro. ¿Cuántos cantantes hay en el coro?`,
  },
  {
    range: [20, 120], unit: ["dogs", "perros"],
    en: (n, p) => `A shelter found homes for ${n} dogs this month. That is ${p}% of the dogs it had. How many dogs did the shelter have?`,
    es: (n, p) => `Un refugio encontró hogar para ${n} perros este mes. Eso es el ${p}% de los perros que tenía. ¿Cuántos perros tenía el refugio?`,
  },
  {
    range: [20, 80], unit: ["games", "partidos"],
    en: (n, p) => `A basketball team won ${n} games, which is ${p}% of the games it played. How many games did the team play?`,
    es: (n, p) => `Un equipo de básquetbol ganó ${n} partidos, que son el ${p}% de los partidos que jugó. ¿Cuántos partidos jugó el equipo?`,
  },
];

function percentWhole(r: Rng, level: number, locale: Locale): ItemBody {
  const who = r.pick(NAMES);
  if (level === 1) {
    const st = r.pick(PART_STORIES);
    const p = r.pick([5, 15, 20, 25, 30, 35, 40, 45, 60, 65, 70, 75, 80, 85, 90]);
    const unit = pctUnit(p);
    const w0 = unit * r.int(Math.ceil(st.range[0] / unit), Math.max(Math.ceil(st.range[0] / unit), Math.floor(st.range[1] / unit)));
    const part = (w0 * p) / 100;
    const plan = pctPlan(p, w0, locale);
    const q = tr(locale, st.en(w0, p, who), st.es(w0, p, who));
    const answer: Answer = { kind: "number", value: part };
    return {
      prompt: [q],
      say: speak(q, locale),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(w0 - part, "found-the-other-part"), w(p, "used-the-percent-as-the-amount")]),
      hints: [tr(locale, `${p}% means ${p} out of every 100.`, `${p}% significa ${p} de cada 100.`), plan.strategy, plan.first],
      steps: [...plan.steps, `${part} ${tr(locale, st.unit[0], st.unit[1])}`],
      seconds: 45,
    };
  }
  const st = r.pick(WHOLE_STORIES);
  const p = level === 2 ? r.pick([5, 10, 20, 25, 50]) : r.pick([6, 8, 12, 15, 24, 30, 35, 40, 45, 60, 65, 70, 75, 80]);
  const s = gcd(p, 100), unit = 100 / s;
  let k = r.int(Math.max(1, Math.ceil(st.range[0] / unit)), Math.max(1, Math.floor(st.range[1] / unit)));
  while ((k * p) / s < 2) k++;
  const w0 = unit * k, part = (w0 * p) / 100, atS = part / (p / s);
  const fmt = (n: number) => (st.money ? money(n * 100) : String(n));
  const q = tr(locale, st.en(fmt(part), p, who), st.es(fmt(part), p, who));
  const answer: Answer = { kind: "number", value: w0 };
  return {
    prompt: [q],
    say: speak(q, locale),
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongFor(answer, [w(dv(part * p, 2), "took-the-percent-of-the-part"), w(part, "used-the-part-as-the-whole")]),
    hints: [
      tr(locale, `${p}% of the whole is ${part}. Is the whole more or less than ${part}?`, `El ${p}% del total es ${part}. ¿El total es mayor o menor que ${part}?`),
      s === p
        ? tr(locale, `${p}% fits into 100% exactly ${100 / p} times.`, `El ${p}% cabe exactamente ${100 / p} veces en el 100%.`)
        : tr(locale, `Find ${s}% first. Then multiply up to 100%.`, `Primero calcula el ${s}%. Luego multiplica hasta llegar al 100%.`),
      s === p
        ? tr(locale, `So the whole is ${100 / p} times ${part}.`, `Entonces el total es ${100 / p} veces ${part}.`)
        : tr(locale, `${p}% → ${part}, so ${s}% → ${part} ÷ ${p / s} = ${atS}.`, `${p}% → ${part}, así que ${s}% → ${part} ÷ ${p / s} = ${atS}.`),
    ],
    steps: [
      `${p}% → ${part}`,
      ...(s === p ? [`100% → ${100 / p} × ${part} = ${w0}`] : [`${s}% → ${part} ÷ ${p / s} = ${atS}`, `100% → ${atS} × ${100 / s} = ${w0}`]),
      `${st.money ? money(w0 * 100) : w0} ${st.money ? "" : tr(locale, st.unit[0], st.unit[1])}`.trim(),
    ],
    seconds: 60,
  };
}

// ---------- m.stats.center ----------

type DataStory = { range: [number, number]; en: (n: number, who: string) => string; es: (n: number, who: string) => string };
const DATA_STORIES: DataStory[] = [
  { range: [4, 30], en: (n) => `Points a basketball player scored in ${n} games`, es: (n) => `Puntos que anotó una jugadora de básquetbol en ${n} partidos` },
  { range: [10, 60], en: (n, who) => `Minutes ${who} practiced piano on ${n} days`, es: (n, who) => `Minutos que ${who} practicó piano durante ${n} días` },
  { range: [3, 25], en: (n) => `Birds counted at a feeder on ${n} mornings`, es: (n) => `Pájaros contados en un comedero durante ${n} mañanas` },
  { range: [0, 7], en: (n) => `Goals a soccer team scored in ${n} games`, es: (n) => `Goles que anotó un equipo de fútbol en ${n} partidos` },
  { range: [8, 40], en: (n, who) => `Laps ${who} swam on ${n} days`, es: (n, who) => `Vueltas que nadó ${who} durante ${n} días` },
  { range: [2, 20], en: (n) => `Tomatoes picked from a garden on ${n} days`, es: (n) => `Tomates cosechados en un huerto durante ${n} días` },
  { range: [10, 60], en: (n, who) => `Stars ${who} counted through a telescope on ${n} nights`, es: (n, who) => `Estrellas que contó ${who} con un telescopio durante ${n} noches` },
  { range: [1, 12], en: (n, who) => `Levels ${who} finished in a video game on ${n} days`, es: (n, who) => `Niveles que terminó ${who} en un videojuego durante ${n} días` },
];

type MeanStory = { range: [number, number]; en: (n: number, m: number, known: string, who: string) => string; es: (n: number, m: number, known: string, who: string) => string };
const MEAN_STORIES: MeanStory[] = [
  {
    range: [60, 100],
    en: (n, m, known, who) => `${who}'s mean score on ${n} quizzes is ${m}. ${n - 1} of the scores are ${known}. What is the missing score?`,
    es: (n, m, known, who) => `El promedio de ${who} en ${n} pruebas es ${m}. ${n - 1} de las calificaciones son ${known}. ¿Cuál es la calificación que falta?`,
  },
  {
    range: [15, 60],
    en: (n, m, known, who) => `${who} read for a mean of ${m} minutes a day over ${n} days. On ${n - 1} of the days ${who} read ${known} minutes. How many minutes did ${who} read on the other day?`,
    es: (n, m, known, who) => `${who} leyó en promedio ${m} minutos al día durante ${n} días. En ${n - 1} de esos días leyó ${known} minutos. ¿Cuántos minutos leyó el otro día?`,
  },
  {
    range: [30, 70],
    en: (n, m, known) => `A basketball team scored a mean of ${m} points per game over ${n} games. In ${n - 1} of the games it scored ${known} points. How many points did it score in the other game?`,
    es: (n, m, known) => `Un equipo de básquetbol anotó un promedio de ${m} puntos por partido en ${n} partidos. En ${n - 1} de los partidos anotó ${known} puntos. ¿Cuántos puntos anotó en el otro partido?`,
  },
];

/** "4, 7 and 9" / "4, 7 y 9". */
const andList = (xs: number[], locale: Locale) => `${xs.slice(0, -1).join(", ")} ${tr(locale, "and", "y")} ${xs[xs.length - 1]}`;

function statsCenter(r: Rng, level: number, locale: Locale): ItemBody {
  const who = r.pick(NAMES);
  if (level === 3 && r.bool()) {
    // The missing value for a given mean.
    const st = r.pick(MEAN_STORIES);
    const n = r.int(4, 6);
    const [lo, hi] = st.range;
    let m: number, known: number[], x: number;
    do {
      m = r.int(lo + Math.ceil((hi - lo) / 4), hi - Math.ceil((hi - lo) / 4));
      known = Array.from({ length: n - 1 }, () => r.int(lo, hi));
      x = n * m - known.reduce((s, v) => s + v, 0);
    } while (x < lo || x > hi || x === m);
    const K = n * m - x;
    const q = tr(locale, st.en(n, m, andList(known, locale), who), st.es(n, m, andList(known, locale), who));
    const answer: Answer = { kind: "number", value: x };
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(m, "used-the-mean-as-the-missing-value"), (n - 1) * m - K > 0 && w((n - 1) * m - K, "used-the-wrong-count"), w(n * m, "gave-the-total-not-the-value")]),
      hints: [
        tr(locale, `If the mean of ${n} values is ${m}, what is their total?`, `Si la media de ${n} valores es ${m}, ¿cuánto suman en total?`),
        tr(locale, "Total = mean × number of values. Subtract the values you know from the total.", "Total = media × número de valores. Resta del total los valores que conoces."),
        `${n} × ${m} = ${n * m}`,
      ],
      steps: [`${n} × ${m} = ${n * m}`, `${known.join(" + ")} = ${K}`, `${n * m} − ${K} = ${x}`],
      seconds: 60,
    };
  }
  const st = r.pick(DATA_STORIES);
  const [lo, hi] = st.range;
  const measure = level === 1 ? r.pick(["median", "mode", "range"] as const) : level === 2 ? "mean" : "even-median";
  let data: number[];
  if (measure === "mode") {
    // One value repeats (2 or 3 times); every other value appears once.
    const n = r.int(5, 7), reps = n === 7 && r.bool() ? 3 : 2;
    const pool = r.shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, n - reps + 1);
    data = r.shuffle([...pool, ...Array<number>(reps - 1).fill(pool[0])]);
  } else if (measure === "mean") {
    const n = r.int(4, 6);
    let m: number;
    do {
      m = r.int(lo + 1, hi - 1);
      data = Array.from({ length: n - 1 }, () => r.int(lo, hi));
      data.push(n * m - data.reduce((s, v) => s + v, 0));
    } while (data[n - 1] < lo || data[n - 1] > hi || new Set(data).size < 3);
  } else {
    const n = measure === "even-median" ? r.pick([6, 8]) : r.pick([5, 7]);
    // A median item keeps its middle value out of the middle of the unsorted list, so "did not order the
    // data" is always a distinct slip; an even count has two different middle values to average.
    const middle = (xs: number[]) => [...xs].sort((a, b) => a - b).slice((n - 1) >> 1, (n >> 1) + 1);
    do data = Array.from({ length: n }, () => r.int(lo, hi));
    while (
      new Set(data).size < n - 1 ||
      (measure === "range" && Math.min(...data) === 0) ||
      (measure === "median" && data[(n - 1) / 2] === middle(data)[0]) ||
      (measure === "even-median" && middle(data)[0] === middle(data)[1])
    );
  }
  const n = data.length, sorted = [...data].sort((a, b) => a - b);
  const label = tr(locale, st.en(n, who), st.es(n, who));
  const ask = {
    median: tr(locale, "What is the median?", "¿Cuál es la mediana?"),
    "even-median": tr(locale, "What is the median?", "¿Cuál es la mediana?"),
    mode: tr(locale, "What is the mode?", "¿Cuál es la moda?"),
    range: tr(locale, "What is the range?", "¿Cuál es el rango?"),
    mean: tr(locale, "What is the mean?", "¿Cuál es la media?"),
  }[measure];
  const q = `${label}: ${data.join(", ")}. ${ask}`;
  const ordered = tr(locale, `In order: ${sorted.join(", ")}`, `En orden: ${sorted.join(", ")}`);
  const base = { prompt: [q] as MathPart[], say: q, input: "keypad" as const };
  if (measure === "median") {
    const mid = (n - 1) / 2, med = sorted[mid];
    const answer: Answer = { kind: "number", value: med };
    const sum = data.reduce((s, v) => s + v, 0);
    return {
      ...base,
      answer,
      wrong: wrongFor(answer, [
        w(data[mid], "did-not-order-the-data"),
        sum % n === 0 && w(sum / n, "found-the-mean-not-the-median"),
        w(mid + 1, "gave-the-position-not-the-value"),
        (sorted[0] + sorted[n - 1]) % 2 === 0 && w((sorted[0] + sorted[n - 1]) / 2, "averaged-the-greatest-and-least"),
      ]),
      hints: [
        tr(locale, "The median is the middle value when the data are in order.", "La mediana es el valor del medio cuando los datos están en orden."),
        tr(locale, `Write the ${n} values from least to greatest, then find the one in the middle.`, `Escribe los ${n} valores de menor a mayor y luego busca el del medio.`),
        `${ordered}.`,
      ],
      steps: [ordered, tr(locale, `The middle value (number ${mid + 1} of ${n}) is ${med}.`, `El valor del medio (el número ${mid + 1} de ${n}) es ${med}.`)],
      seconds: 35,
    };
  }
  if (measure === "mode") {
    const counts = new Map<number, number>();
    for (const v of data) counts.set(v, (counts.get(v) ?? 0) + 1);
    const [mode, times] = [...counts].reduce((a, b) => (b[1] > a[1] ? b : a));
    const answer: Answer = { kind: "number", value: mode };
    return {
      ...base,
      answer,
      wrong: wrongFor(answer, [w(times, "gave-how-many-times-it-appears"), n % 2 === 1 && w(sorted[(n - 1) / 2], "found-the-median-not-the-mode"), w(sorted[n - 1], "gave-the-greatest-value")]),
      hints: [
        tr(locale, "The mode is the value that appears most often.", "La moda es el valor que aparece más veces."),
        tr(locale, "Put the values in order so equal values sit together, then count each one.", "Ordena los valores para que los iguales queden juntos y luego cuenta cada uno."),
        `${ordered}.`,
      ],
      steps: [ordered, tr(locale, `${mode} appears ${times} times, more than any other value.`, `${mode} aparece ${times} veces, más que cualquier otro valor.`)],
      seconds: 25,
    };
  }
  if (measure === "range") {
    const max = sorted[n - 1], min = sorted[0];
    const answer: Answer = { kind: "number", value: max - min };
    return {
      ...base,
      answer,
      wrong: wrongFor(answer, [w(max, "gave-the-greatest-value"), data[n - 1] - data[0] > 0 && w(data[n - 1] - data[0], "did-not-order-the-data"), w(max + min, "added-instead-of-subtracting")]),
      hints: [
        tr(locale, "The range tells how spread out the data are.", "El rango indica qué tan dispersos están los datos."),
        tr(locale, "Range = greatest value − least value.", "Rango = valor mayor − valor menor."),
        tr(locale, `The greatest value is ${max}.`, `El valor mayor es ${max}.`),
      ],
      steps: [tr(locale, `Greatest: ${max}. Least: ${min}.`, `Mayor: ${max}. Menor: ${min}.`), `${max} − ${min} = ${max - min}`],
      seconds: 20,
    };
  }
  if (measure === "mean") {
    const S = data.reduce((s, v) => s + v, 0), m = S / n;
    const answer: Answer = { kind: "number", value: m };
    const med2 = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    return {
      ...base,
      answer,
      keys: ["."],
      wrong: wrongFor(answer, [w(S, "forgot-to-divide"), w(med2, "found-the-median-not-the-mean"), S % (n - 1) === 0 && w(S / (n - 1), "divided-by-the-wrong-count")]),
      hints: [
        tr(locale, "The mean is the value each data point would have if the total were shared out equally.", "La media es el valor que tendría cada dato si el total se repartiera en partes iguales."),
        tr(locale, `Add the ${n} values, then divide the sum by ${n}.`, `Suma los ${n} valores y luego divide la suma entre ${n}.`),
        tr(locale, `Sum: ${data.join(" + ")} = ${S}.`, `Suma: ${data.join(" + ")} = ${S}.`),
      ],
      steps: [`${data.join(" + ")} = ${S}`, `${S} ÷ ${n} = ${m}`],
      seconds: 45,
    };
  }
  const a = sorted[n / 2 - 1], b = sorted[n / 2], med = (a + b) / 2;
  const answer: Answer = { kind: "number", value: med };
  return {
    ...base,
    answer,
    keys: ["."],
    wrong: wrongFor(answer, [
      w(a, "picked-one-middle-value"),
      w(b, "picked-one-middle-value"),
      w((data[n / 2 - 1] + data[n / 2]) / 2, "did-not-order-the-data"),
      w((sorted[0] + sorted[n - 1]) / 2, "averaged-the-greatest-and-least"),
    ]),
    hints: [
      tr(locale, `With ${n} values there is no single middle value. What can you do with the two in the middle?`, `Con ${n} valores no hay un solo valor en el medio. ¿Qué puedes hacer con los dos del medio?`),
      tr(locale, "Put the data in order. The median is the mean of the two middle values.", "Ordena los datos. La mediana es la media de los dos valores del medio."),
      `${ordered}.`,
    ],
    steps: [ordered, tr(locale, `Middle values: ${a} and ${b}`, `Valores del medio: ${a} y ${b}`), `(${a} + ${b}) ÷ 2 = ${med}`],
    seconds: 40,
  };
}

// ---------- m.volume.frac ----------

/**
 * Objects, the unit that suits each (an index into UNITS: 0 cm, 2 in, 3 ft) and the believable length of
 * an edge in that unit, from `lo` to `hi` whole units. Long-edged boxes (hi above 9) take one fractional
 * edge only, so their products stay workable by hand; `cubes` marks the boxes small enough to pack with
 * cubes of edge 1/2, 1/3 or 1/4 of a unit. `edges` gives an object of a set shape its own range for the
 * length, the width and the height (a brick is about 8 × 3 5/8 × 2 1/4 in).
 */
type Box = { en: string; es: string; unit: number; lo: number; hi: number; cubes: boolean; edges?: [number, number][] };
const BOXES: Box[] = [
  { en: "A gift box", es: "Una caja de regalo", unit: 2, lo: 3, hi: 9, cubes: false },
  { en: "A gift box", es: "Una caja de regalo", unit: 0, lo: 8, hi: 15, cubes: false },
  { en: "A jewelry box", es: "Un joyero", unit: 2, lo: 2, hi: 6, cubes: true },
  { en: "A brick", es: "Un ladrillo", unit: 2, lo: 2, hi: 8, cubes: false, edges: [[7, 8], [3, 4], [2, 3]] },
  { en: "A block of clay", es: "Un bloque de arcilla", unit: 0, lo: 3, hi: 9, cubes: false },
  { en: "A block of clay", es: "Un bloque de arcilla", unit: 2, lo: 1, hi: 4, cubes: true },
  { en: "A small fish tank", es: "Una pecera pequeña", unit: 2, lo: 8, hi: 12, cubes: false },
  { en: "A shipping crate", es: "Un cajón de envío", unit: 3, lo: 2, hi: 5, cubes: true },
  { en: "A storage chest", es: "Un baúl", unit: 3, lo: 2, hi: 4, cubes: true },
];

/** An edge from `lo` to `hi` units: a whole number (at least 2), or a mixed number with denominator 2, 3 or 4 below `hi`. */
function edge(r: Rng, fractional: boolean, lo: number, hi: number): Q {
  if (!fractional) return [r.int(Math.max(2, lo), hi), 1];
  const d = r.pick([2, 3, 4]);
  let n = r.int(1, d - 1);
  while (gcd(n, d) !== 1) n = r.int(1, d - 1);
  return qr(r.int(lo, hi - 1) * d + n, d);
}
/** An edge read aloud with its unit: "2 and one half inches", "2 pies y medio", "1 pulgada y 3 cuartos". */
function sayEdge(e: Q, u: Unit, locale: Locale) {
  const [n, d] = e, whole = Math.floor(n / d), part = n % d;
  if (!part) return `${whole} ${whole === 1 ? tr(locale, u.one[0], u.one[1]) : tr(locale, u.word[0], u.word[1])}`;
  if (locale === "en") return `${whole} and ${sayFrac(part, d, "en")} ${u.word[0]}`;
  const fem = u.es === "pulg";
  const tail = d === 2 ? (fem ? "media" : "medio") : sayFrac(part, d, "es");
  return `${whole} ${whole === 1 ? u.one[1] : u.word[1]} y ${tail}`;
}

function volumeFrac(r: Rng, level: number, locale: Locale): ItemBody {
  const cubes = level === 2 && r.bool(0.4);
  const box = r.pick(cubes ? BOXES.filter((b) => b.cubes) : level === 1 ? BOXES : BOXES.filter((b) => b.hi <= 9));
  const u = UNITS[box.unit];
  const [boxEn, boxEs] = [box.en, box.es];
  const ab = tr(locale, u.en, u.es);
  if (cubes) {
    // Pack the box with small cubes of edge 1/k and count them: the count × (1/k)³ is the volume.
    // Edges run from the box's least length up to 4 units, so the count stays a few thousand at most.
    const k = r.pick([2, 3, 4]), top = Math.min(box.hi, 4);
    const m = [r.int(box.lo * k + 1, top * k), r.int(box.lo * k, (top - 1) * k), r.int(box.lo * k + 1, top * k)];
    while (m.every((x) => x % k === 0)) m[0] -= 1;
    const edges = m.map((x) => qr(x, k));
    const count = m[0] * m[1] * m[2];
    const V = qr(count, k ** 3);
    const sizes = tr(locale, `${sayEdge(edges[0], u, locale)} long, ${sayEdge(edges[1], u, locale)} wide and ${sayEdge(edges[2], u, locale)} tall`, `${sayEdge(edges[0], u, locale)} de largo, ${sayEdge(edges[1], u, locale)} de ancho y ${sayEdge(edges[2], u, locale)} de alto`);
    const one = tr(locale, u.one[0], u.one[1]);
    const prompt: MathPart[] = [
      tr(locale, `${boxEn} is `, `${boxEs} mide `),
      ...qParts(edges[0]),
      tr(locale, ` ${ab} long, `, ` ${ab} de largo, `),
      ...qParts(edges[1]),
      tr(locale, ` ${ab} wide and `, ` ${ab} de ancho y `),
      ...qParts(edges[2]),
      tr(locale, ` ${ab} tall. How many cubes with edges of `, ` ${ab} de alto. ¿Cuántos cubos de `),
      frac(1, k),
      tr(locale, ` ${one} fill it exactly?`, ` ${one} de arista caben exactamente dentro?`),
    ];
    const answer: Answer = { kind: "number", value: count };
    const Vk = qMul(V, [k, 1]);
    return {
      prompt,
      say: tr(
        locale,
        `${boxEn} is ${sizes}. How many cubes with edges of ${sayFrac(1, k, "en")} ${one} fill it exactly?`,
        `${boxEs} mide ${sizes}. ¿Cuántos cubos de ${k === 2 ? `${u.es === "pulg" ? "media" : "medio"} ${one}` : `${sayFrac(1, k, "es")} de ${one}`} de arista caben exactamente dentro?`,
      ),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [V[1] === 1 && w(V[0], "gave-the-volume-not-the-cube-count"), Vk[1] === 1 && w(Vk[0], "divided-by-the-edge-not-the-cube"), w(m[0] + m[1] + m[2], "added-instead-of-multiplying")]),
      hints: [
        tr(locale, `How many cubes with edges of 1/${k} ${one} fit along each edge?`, `¿Cuántos cubos de 1/${k} ${one} de arista caben a lo largo de cada arista?`),
        tr(locale, "Count the cubes along the length, the width and the height, then multiply the three counts.", "Cuenta los cubos a lo largo del largo, del ancho y del alto, y luego multiplica los tres números."),
        tr(locale, `Along the length: ${qShow(edges[0])} ÷ 1/${k} = ${m[0]} cubes.`, `A lo largo del largo: ${qShow(edges[0])} ÷ 1/${k} = ${m[0]} cubos.`),
      ],
      steps: [
        tr(locale, `Cubes along each edge: ${m[0]}, ${m[1]} and ${m[2]}`, `Cubos en cada arista: ${m[0]}, ${m[1]} y ${m[2]}`),
        `${m[0]} × ${m[1]} × ${m[2]} = ${count}`,
        tr(locale, `Check: ${count} × 1/${k ** 3} = ${qShow(V)} ${tr(locale, u.cube[0], u.cube[1])}`, `Comprobación: ${count} × 1/${k ** 3} = ${qShow(V)} ${u.cube[1]}`),
      ],
      seconds: 60,
    };
  }
  // Level 1: one fractional edge. Level 2: two or three. A whole-number volume is drawn again: the prompt
  // asks for a fraction or a mixed number, and the skill is about fractional edges.
  const fracCount = level === 1 ? 1 : r.int(2, 3);
  let edges: Q[], V: Q;
  do {
    const which = r.shuffle([0, 1, 2]).slice(0, fracCount);
    edges = [0, 1, 2].map((i) => {
      const [lo, hi] = box.edges?.[i] ?? [box.lo, box.hi];
      return edge(r, which.includes(i), lo, hi);
    });
    V = qMul(qMul(edges[0], edges[1]), edges[2]);
  } while (V[1] === 1);
  const answer: Answer = { kind: "fraction", n: V[0], d: V[1] };
  const wholes = edges.map((e) => Math.floor(e[0] / e[1]));
  const sum = qAdd(qAdd(edges[0], edges[1]), edges[2]);
  const first = edges.find((e) => e[1] !== 1)!;
  const imp = (e: Q) => (e[1] === 1 ? String(e[0]) : `${e[0]}/${e[1]}`);
  const N = edges.reduce((p, e) => p * e[0], 1), D = edges.reduce((p, e) => p * e[1], 1);
  const cube = tr(locale, u.cube[0], u.cube[1]);
  return {
    prompt: [
      tr(locale, `${boxEn} is `, `${boxEs} mide `),
      ...qParts(edges[0]),
      tr(locale, ` ${ab} long, `, ` ${ab} de largo, `),
      ...qParts(edges[1]),
      tr(locale, ` ${ab} wide and `, ` ${ab} de ancho y `),
      ...qParts(edges[2]),
      tr(locale, ` ${ab} tall. What is its volume in ${cube}? Write a fraction or a mixed number.`, ` ${ab} de alto. ¿Cuál es su volumen en ${cube}? Escribe una fracción o un número mixto.`),
    ],
    say: tr(
      locale,
      `${boxEn} is ${sayEdge(edges[0], u, locale)} long, ${sayEdge(edges[1], u, locale)} wide and ${sayEdge(edges[2], u, locale)} tall. What is its volume in ${cube}?`,
      `${boxEs} mide ${sayEdge(edges[0], u, locale)} de largo, ${sayEdge(edges[1], u, locale)} de ancho y ${sayEdge(edges[2], u, locale)} de alto. ¿Cuál es su volumen en ${cube}?`,
    ),
    input: "fraction",
    answer,
    wrong: wrongFor(answer, [w(wholes[0] * wholes[1] * wholes[2], "ignored-the-fraction-parts"), w(sum, "added-the-edges")]),
    hints: [
      tr(locale, "Volume of a rectangular prism = length × width × height.", "Volumen de un prisma rectangular = largo × ancho × alto."),
      tr(locale, "Write each mixed number as an improper fraction, then multiply the three edges.", "Escribe cada número mixto como fracción impropia y luego multiplica las tres aristas."),
      `${qShow(first)} = ${imp(first)}`,
    ],
    steps: [
      `V = ${edges.map((e) => qShow(e)).join(" × ")}`,
      `= ${edges.map(imp).join(" × ")} = ${N}/${D}`,
      `= ${qShow(V)} ${ab}³`,
    ],
    seconds: level === 1 && box.hi <= 9 ? 50 : 70,
  };
}

// ---------- m.surface.area ----------

const TRIPLES: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];

function surfaceArea(r: Rng, level: number, locale: Locale): ItemBody {
  const u = r.pick(UNITS);
  const ab = tr(locale, u.en, u.es), sq = tr(locale, u.sq[0], u.sq[1]);
  if (level === 1) {
    const s = r.int(2, 12), face = s * s, SA = 6 * face;
    const answer: Answer = { kind: "number", value: SA };
    const q = (sp: boolean) => {
      const side = sp ? `${s} ${tr(locale, u.word[0], u.word[1])}` : `${s} ${ab}`;
      return tr(
        locale,
        `The net of a cube is made of 6 squares. Each square has sides of ${side}. What is the surface area of the cube, in ${sq}?`,
        `La red de un cubo está formada por 6 cuadrados. Cada cuadrado mide ${side} de lado. ¿Cuál es el área de superficie del cubo, en ${sq}?`,
      );
    };
    return {
      prompt: [q(false)],
      say: q(true),
      visual: { kind: "prism", l: s, w: s, h: s, unit: ab },
      alt: tr(locale, `A cube with each edge labeled ${s} ${ab}.`, `Un cubo con cada arista marcada ${s} ${ab}.`),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(s ** 3, "found-the-volume"), w(6 * s, "forgot-to-square-the-side"), w(4 * face, "counted-only-four-faces")]),
      hints: [
        tr(locale, "How many faces does a cube have, and what shape is each one?", "¿Cuántas caras tiene un cubo y qué forma tiene cada una?"),
        tr(locale, "Find the area of one square face, then multiply by the number of faces.", "Halla el área de una cara cuadrada y luego multiplícala por el número de caras."),
        tr(locale, `One face: ${s} × ${s} = ${face}.`, `Una cara: ${s} × ${s} = ${face}.`),
      ],
      steps: [`${s} × ${s} = ${face}`, `6 × ${face} = ${SA} ${ab}²`],
      seconds: 30,
    };
  }
  if (level === 2) {
    let l: number, wd: number, h: number;
    do {
      l = r.int(3, 12);
      wd = r.int(2, 10);
      h = r.int(2, 10);
    } while (l === wd || l === h || wd === h);
    const lw = l * wd, lh = l * h, wh = wd * h, SA = 2 * (lw + lh + wh);
    const answer: Answer = { kind: "number", value: SA };
    const q = (sp: boolean) => {
      const L = (n: number) => (sp ? `${n} ${tr(locale, u.word[0], u.word[1])}` : `${n} ${ab}`);
      return tr(
        locale,
        `A rectangular prism is ${L(l)} long, ${L(wd)} wide and ${L(h)} tall. Its net has 6 rectangles. What is its surface area, in ${sq}?`,
        `Un prisma rectangular mide ${L(l)} de largo, ${L(wd)} de ancho y ${L(h)} de alto. Su red tiene 6 rectángulos. ¿Cuál es su área de superficie, en ${sq}?`,
      );
    };
    return {
      prompt: [q(false)],
      say: q(true),
      visual: { kind: "prism", l, w: wd, h, unit: ab },
      alt: tr(locale, `A rectangular prism ${l} ${ab} long, ${wd} ${ab} wide and ${h} ${ab} tall.`, `Un prisma rectangular de ${l} ${ab} de largo, ${wd} ${ab} de ancho y ${h} ${ab} de alto.`),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(l * wd * h, "found-the-volume"), w(lw + lh + wh, "counted-each-pair-once"), w(2 * (lw + lh), "left-out-two-faces")]),
      hints: [
        tr(locale, "The net has 3 pairs of matching rectangles: top and bottom, front and back, left and right.", "La red tiene 3 pares de rectángulos iguales: arriba y abajo, adelante y atrás, izquierda y derecha."),
        tr(locale, "Find the area of one rectangle from each pair, add the three areas, then double the sum.", "Halla el área de un rectángulo de cada par, suma las tres áreas y luego duplica la suma."),
        `${l} × ${wd} = ${lw}, ${l} × ${h} = ${lh}, ${wd} × ${h} = ${wh}`,
      ],
      steps: [`${lw} + ${lh} + ${wh} = ${lw + lh + wh}`, `2 × ${lw + lh + wh} = ${SA} ${ab}²`],
      seconds: 50,
    };
  }
  if (r.bool(0.55)) {
    const b = r.int(2, 12);
    const h = r.int(Math.floor(b / 2) + 1, 15);
    const base = b * b, tri = 2 * b * h, SA = base + tri;
    const answer: Answer = { kind: "number", value: SA };
    const q = (sp: boolean) => {
      const L = (n: number) => (sp ? `${n} ${tr(locale, u.word[0], u.word[1])}` : `${n} ${ab}`);
      return tr(
        locale,
        `The net of a square pyramid has a square base with sides of ${L(b)} and 4 identical triangles. Each triangle has a base of ${L(b)} and a height of ${L(h)}. What is the surface area, in ${sq}?`,
        `La red de una pirámide de base cuadrada tiene una base cuadrada de ${L(b)} de lado y 4 triángulos iguales. Cada triángulo tiene una base de ${L(b)} y una altura de ${L(h)}. ¿Cuál es el área de superficie, en ${sq}?`,
      );
    };
    return {
      prompt: [q(false)],
      say: q(true),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(base + 4 * b * h, "forgot-to-halve-the-triangles"), w(tri, "left-out-the-base"), (b * h) % 2 === 0 && w(base + (b * h) / 2, "counted-one-triangle")]),
      hints: [
        tr(locale, "The net has 1 square and 4 triangles. Find the area of each kind.", "La red tiene 1 cuadrado y 4 triángulos. Halla el área de cada tipo."),
        tr(locale, "Triangle area = 1/2 × base × height. Add the square and all 4 triangles.", "Área del triángulo = 1/2 × base × altura. Suma el cuadrado y los 4 triángulos."),
        tr(locale, `Square: ${b} × ${b} = ${base}.`, `Cuadrado: ${b} × ${b} = ${base}.`),
      ],
      steps: [
        tr(locale, `Square: ${b} × ${b} = ${base}`, `Cuadrado: ${b} × ${b} = ${base}`),
        tr(locale, `Triangles: 4 × 1/2 × ${b} × ${h} = ${tri}`, `Triángulos: 4 × 1/2 × ${b} × ${h} = ${tri}`),
        `${base} + ${tri} = ${SA} ${ab}²`,
      ],
      seconds: 60,
    };
  }
  const [a, b, c] = r.pick(TRIPLES);
  const L = r.int(2, 12);
  const tris = a * b, rects = (a + b + c) * L, SA = tris + rects;
  const answer: Answer = { kind: "number", value: SA };
  const q = (sp: boolean) => {
    const len = (n: number) => (sp ? `${n} ${tr(locale, u.word[0], u.word[1])}` : `${n} ${ab}`);
    // Spoken, a length before "sides" is a compound adjective: "the 8-meter and 15-meter sides".
    const sideLen = (n: number) => (sp ? `${n}-${u.one[0]}` : `${n} ${ab}`);
    return tr(
      locale,
      `The net of a triangular prism has 2 right triangles and 3 rectangles. Each triangle has sides of ${a}, ${b} and ${len(c)}, with the right angle between the ${sideLen(a)} and ${sideLen(b)} sides. The prism is ${len(L)} long. What is its surface area, in ${sq}?`,
      `La red de un prisma triangular tiene 2 triángulos rectángulos y 3 rectángulos. Cada triángulo tiene lados de ${a}, ${b} y ${len(c)}, con el ángulo recto entre los lados de ${len(a)} y ${len(b)}. El prisma mide ${len(L)} de largo. ¿Cuál es su área de superficie, en ${sq}?`,
    );
  };
  return {
    prompt: [q(false)],
    say: q(true),
    input: "keypad",
    answer,
    wrong: wrongFor(answer, [w(tris / 2 + rects, "counted-one-triangle"), w(rects, "left-out-the-triangles"), w(2 * tris + rects, "forgot-to-halve-the-triangles")]),
    hints: [
      tr(locale, "The net has 2 triangles and 3 rectangles. Find the area of each piece.", "La red tiene 2 triángulos y 3 rectángulos. Halla el área de cada pieza."),
      tr(locale, `Each triangle is 1/2 × ${a} × ${b}. Each rectangle is ${L} long and as wide as one side of the triangle.`, `Cada triángulo mide 1/2 × ${a} × ${b}. Cada rectángulo mide ${L} de largo y tiene el ancho de un lado del triángulo.`),
      tr(locale, `Both triangles: 2 × 1/2 × ${a} × ${b} = ${tris}.`, `Los dos triángulos: 2 × 1/2 × ${a} × ${b} = ${tris}.`),
    ],
    steps: [
      tr(locale, `Triangles: 2 × 1/2 × ${a} × ${b} = ${tris}`, `Triángulos: 2 × 1/2 × ${a} × ${b} = ${tris}`),
      tr(locale, `Rectangles: (${a} + ${b} + ${c}) × ${L} = ${rects}`, `Rectángulos: (${a} + ${b} + ${c}) × ${L} = ${rects}`),
      `${tris} + ${rects} = ${SA} ${ab}²`,
    ],
    seconds: 70,
  };
}

// ---------- m.rational.addsub ----------

/** A signed decimal in hundredths with one or two decimal places, 0 < |v| ≤ 20. */
function signedHundredths(r: Rng, neg: boolean) {
  const units = r.bool() ? decUnits(r, 1, 199, 1) * 10 : decUnits(r, 1, 1999, 2);
  return neg ? -units : units;
}
const absText = (v: number) => showD(Math.abs(v));

function ratAddSubDec(r: Rng, locale: Locale): ItemBody {
  const sub = r.bool(0.45);
  let A: number, B: number;
  do {
    A = signedHundredths(r, r.bool(0.6));
    B = signedHundredths(r, r.bool(0.55));
  } while ((!sub && A > 0 && B > 0) || (sub && A > 0 && B > 0 && A > B) || A + (sub ? -B : B) === 0 || Math.abs(A) === Math.abs(B));
  const a = dv(A, 2), b = dv(B, 2), R = sub ? A - B : A + B, res = dv(R, 2);
  const op = sub ? "−" : "+";
  const expr = `${showD(a)} ${op} ${parD(b)}`;
  const answer: Answer = { kind: "number", value: res };
  const differ = !sub && A < 0 !== B < 0;
  const bigger = Math.abs(A) > Math.abs(B) ? a : b;
  const slips = [
    w(-res, "took-the-wrong-sign"),
    differ && w(dv(Math.sign(bigger) * (Math.abs(A) + Math.abs(B)), 2), "added-when-signs-differ"),
    !sub && !differ && w(dv(-Math.abs(Math.abs(A) - Math.abs(B)), 2), "subtracted-when-signs-match"),
    sub && w(dv(A + B, 2), B < 0 ? "did-not-add-the-opposite" : "added-instead-of-subtracting"),
  ];
  const hints = sub
    ? [
        tr(locale, `What is the opposite of ${showD(b)}?`, `¿Cuál es el opuesto de ${showD(b)}?`),
        tr(locale, "Subtracting a number is the same as adding its opposite.", "Restar un número es lo mismo que sumar su opuesto."),
        `${expr} = ${showD(a)} + ${parD(-b)}`,
      ]
    : differ
      ? [
          tr(locale, "One number is negative and one is positive. Which one is farther from 0?", "Un número es negativo y el otro positivo. ¿Cuál está más lejos del 0?"),
          tr(locale, "Subtract the smaller distance from the larger one. The answer has the sign of the number farther from 0.", "Resta la distancia menor de la mayor. La respuesta lleva el signo del número más lejano del 0."),
          tr(locale, `|${showD(a)}| = ${absText(a)} and |${showD(b)}| = ${absText(b)}.`, `|${showD(a)}| = ${absText(a)} y |${showD(b)}| = ${absText(b)}.`),
        ]
      : [
          tr(locale, "Both numbers are negative. Will the sum be positive or negative?", "Los dos números son negativos. ¿La suma será positiva o negativa?"),
          tr(locale, "Add the distances from 0 and keep the negative sign.", "Suma las distancias al 0 y conserva el signo negativo."),
          `|${showD(a)}| + |${showD(b)}| = ${absText(a)} + ${absText(b)}`,
        ];
  const [hiA, loA] = Math.abs(A) > Math.abs(B) ? [A, B] : [B, A];
  const steps = sub
    ? [`${expr} = ${showD(a)} + ${parD(-b)}`, `= ${showD(res)}`]
    : differ
      ? [`${absText(dv(hiA, 2))} − ${absText(dv(loA, 2))} = ${absText(res)}`, tr(locale, `${showD(bigger)} is farther from 0, so the sum is ${res < 0 ? "negative" : "positive"}.`, `${showD(bigger)} está más lejos del 0, así que la suma es ${res < 0 ? "negativa" : "positiva"}.`), `${expr} = ${showD(res)}`]
      : [`${absText(a)} + ${absText(b)} = ${absText(res)}`, `${expr} = ${showD(res)}`];
  return {
    prompt: [`${expr} = `, { blank: true }],
    say: `${sayN(a, locale)} ${sub ? tr(locale, "minus", "menos") : tr(locale, "plus", "más")} ${sayN(b, locale)}`,
    input: "keypad",
    keys: ["-", "."],
    answer,
    wrong: wrongFor(answer, slips),
    hints,
    steps,
    seconds: 30,
  };
}

/** A signed fraction for prompts: after an operation sign a negative one goes in parentheses. */
const qOperand = (q: Q, after: boolean, mixed = true): MathPart[] => (after && q[0] < 0 ? ["(", ...qParts(q, mixed), ")"] : qParts(q, mixed));
const qOperandText = (q: Q, after: boolean, mixed = true) => (after && q[0] < 0 ? `(${qShow(q, mixed)})` : qShow(q, mixed));

function ratAddSubFrac(r: Rng, locale: Locale, mixed: boolean): ItemBody {
  const sub = mixed ? r.bool(0.7) : r.bool(0.4);
  const dens = mixed ? [2, 3, 4, 5, 6, 8] : [2, 3, 4, 5, 6, 8, 10, 12];
  let a: Q, b: Q, res: Q;
  const pick = (neg: boolean): Q => {
    const d = r.pick(dens);
    let n = r.int(1, d - 1);
    while (gcd(n, d) !== 1) n = r.int(1, d - 1);
    const whole = mixed ? r.int(1, 3) : 0;
    return qr((neg ? -1 : 1) * (whole * d + n), d);
  };
  do {
    a = pick(r.bool(0.65));
    b = pick(r.bool(0.5));
    res = sub ? qSub(a, b) : qAdd(a, b);
    // A whole-number result is drawn again: these items practice a fraction answer in simplest form.
  } while ((a[0] > 0 && b[0] > 0 && !sub) || (a[0] > 0 && b[0] > 0 && sub && qLess(b, a)) || res[1] === 1 || (a[1] === b[1] && r.bool(0.7)));
  const answer: Answer = { kind: "fraction", n: res[0], d: res[1], simplest: true };
  const op = sub ? "−" : "+";
  const L = (a[1] * b[1]) / gcd(a[1], b[1]);
  const an = a[0] * (L / a[1]), bn = b[0] * (L / b[1]);
  const total = sub ? an - bn : an + bn;
  const sumAbs = qAdd(qAbs(a), qAbs(b)), bigger = qLess(qAbs(a), qAbs(b)) ? b : a;
  const slips = [
    w(qNeg(res), "took-the-wrong-sign"),
    !mixed && w(qr(sub ? a[0] - b[0] : a[0] + b[0], a[1] + b[1]), "added-the-denominators"),
    sub && w(qAdd(a, b), b[0] < 0 ? "did-not-add-the-opposite" : "added-instead-of-subtracting"),
    !sub && a[0] < 0 !== b[0] < 0 && w(bigger[0] < 0 ? qNeg(sumAbs) : sumAbs, "added-when-signs-differ"),
    !sub && a[0] < 0 && b[0] < 0 && w(qNeg(qAbs(qSub(qAbs(a), qAbs(b)))), "subtracted-when-signs-match"),
  ];
  const simplest = tr(locale, "Write the answer in simplest form.", "Escribe la respuesta en su forma más simple.");
  const signed = (n: number) => (n < 0 ? `(${show(n)})` : String(n));
  // Only the fractions that change are rewritten: a new denominator, or a mixed number made improper.
  const changes = (q: Q) => q[1] !== L || Math.abs(q[0]) > q[1];
  const lines = [changes(a) && `${qShow(a)} = ${show(an)}/${L}`, changes(b) && `${qShow(b)} = ${show(bn)}/${L}`].filter((x): x is string => !!x);
  const rewrite = lines.length ? lines.join(tr(locale, " and ", " y ")) : tr(locale, `Both fractions already have the denominator ${L}`, `Las dos fracciones ya tienen denominador ${L}`);
  return {
    prompt: [`${simplest} `, ...qOperand(a, false), ` ${op} `, ...qOperand(b, true), " = ", { blank: true }],
    say: `${sayQ(a, locale)} ${sub ? tr(locale, "minus", "menos") : tr(locale, "plus", "más")} ${sayQ(b, locale)}. ${simplest}`,
    input: "fraction",
    keys: ["-"],
    answer,
    wrong: wrongFor(answer, slips),
    hints: [
      a[1] === b[1]
        ? tr(locale, `Both fractions have the denominator ${a[1]}. What do you do with the numerators?`, `Las dos fracciones tienen denominador ${a[1]}. ¿Qué haces con los numeradores?`)
        : tr(locale, `The denominators are ${a[1]} and ${b[1]}. What is their least common multiple?`, `Los denominadores son ${a[1]} y ${b[1]}. ¿Cuál es su mínimo común múltiplo?`),
      sub
        ? lines.length
          ? tr(locale, `Rewrite both with the denominator ${L}. Subtracting is adding the opposite, so watch the signs.`, `Reescribe las dos con denominador ${L}. Restar es sumar el opuesto, así que cuida los signos.`)
          : tr(locale, `Keep the denominator ${L} and subtract the numerators. Subtracting is adding the opposite, so watch the signs.`, `Conserva el denominador ${L} y resta los numeradores. Restar es sumar el opuesto, así que cuida los signos.`)
        : lines.length
          ? tr(locale, `Rewrite both with the denominator ${L}, then add the numerators, keeping their signs.`, `Reescribe las dos con denominador ${L} y luego suma los numeradores con sus signos.`)
          : tr(locale, `Keep the denominator ${L} and add the numerators, keeping their signs.`, `Conserva el denominador ${L} y suma los numeradores con sus signos.`),
      // With nothing to rewrite, the first step is putting the numerators together over the denominator.
      lines.length ? `${rewrite}.` : `${qShow(a)} ${op} ${qOperandText(b, true)} = (${show(an)} ${op} ${signed(bn)})/${L}`,
    ],
    steps: [rewrite, `(${show(an)} ${op} ${signed(bn)})/${L} = ${show(total)}/${L}`, ...(gcd(total, L) !== 1 || Math.abs(total) > L ? [`= ${qShow(res)}`] : [])],
    seconds: mixed ? 60 : 45,
  };
}

type DecStory = { sign: 1 | -1; start: [boolean, number, number]; en: (s: string, d: string, who: string) => string; es: (s: string, d: string, who: string) => string; unit: [string, string]; diff?: boolean; below?: boolean };
const DEC_STORIES: DecStory[] = [
  {
    sign: 1, start: [true, 150, 1275], unit: ["°F", "°F"],
    en: (s, d) => `At 6 a.m. the temperature was ${s}°F. By noon it had risen ${d}°F. What was the temperature at noon, in °F?`,
    es: (s, d) => `A las 6 a. m. la temperatura era de ${s} °F. Al mediodía había subido ${d} °F. ¿Cuál era la temperatura al mediodía, en °F?`,
  },
  {
    sign: -1, start: [false, 50, 800], unit: ["°F", "°F"],
    en: (s, d) => `The temperature was ${s}°F at sunset and fell ${d}°F overnight. What was the temperature in the morning, in °F?`,
    es: (s, d) => `La temperatura era de ${s} °F al atardecer y bajó ${d} °F durante la noche. ¿Cuál era la temperatura en la mañana, en °F?`,
  },
  {
    sign: 1, start: [true, 500, 2500], unit: ["m", "m"], below: true,
    en: (s, d) => `A diver is at an elevation of ${s} meters. The diver swims up ${d} meters. What is the diver's new elevation, in meters?`,
    es: (s, d) => `Un buzo está a una elevación de ${s} metros. Sube nadando ${d} metros. ¿Cuál es su nueva elevación, en metros?`,
  },
  {
    sign: -1, start: [false, 200, 1500], unit: ["m", "m"],
    en: (s, d) => `A hiker starts at an elevation of ${s} meters and walks down ${d} meters into a canyon. What is the hiker's new elevation, in meters?`,
    es: (s, d) => `Una excursionista empieza a una elevación de ${s} metros y baja ${d} metros hacia un cañón. ¿Cuál es su nueva elevación, en metros?`,
  },
  {
    sign: -1, diff: true, start: [false, 50, 900], unit: ["°C", "°C"],
    en: (s, d) => `On a winter day the high temperature was ${s}°C and the low was ${d}°C. How many degrees warmer was the high than the low?`,
    es: (s, d) => `Un día de invierno la temperatura máxima fue de ${s} °C y la mínima de ${d} °C. ¿Cuántos grados más alta fue la máxima que la mínima?`,
  },
];

function ratAddSubStory(r: Rng, locale: Locale): ItemBody {
  const st = r.pick(DEC_STORIES), who = r.pick(NAMES);
  const [negStart, lo, hi] = st.start;
  // Values in hundredths. Elevations may use two places (to the centimeter); temperatures are read to tenths of a degree.
  const tenths = st.unit[0].startsWith("°");
  const amount = (from: number, to: number) => (tenths || r.bool() ? decUnits(r, Math.ceil(from / 10), Math.floor(to / 10), 1) * 10 : decUnits(r, from, to, 2));
  const S = (negStart ? -1 : 1) * amount(lo, hi);
  let D: number, R: number;
  if (st.diff) {
    // high − low, with the low below 0.
    D = -amount(100, 1200);
    R = S - D;
  } else {
    do D = amount(200, 1600);
    while ((st.sign === -1 && S - D >= 0) || (st.below && S + D >= 0) || S + st.sign * D === 0);
    R = S + st.sign * D;
  }
  const s = dv(S, 2), d = dv(D, 2), res = dv(R, 2);
  const q = tr(locale, st.en(showD(s), showD(d), who), st.es(showD(s), showD(d), who));
  const expr = st.diff ? `${showD(s)} − ${parD(d)}` : `${showD(s)} ${st.sign > 0 ? "+" : "−"} ${showD(d)}`;
  const answer: Answer = { kind: "number", value: res };
  const unit = tr(locale, st.unit[0], st.unit[1]);
  return {
    prompt: [q],
    say: speak(q, locale),
    input: "keypad",
    keys: ["-", "."],
    answer,
    wrong: wrongFor(answer, [w(-res, "took-the-wrong-sign"), w(dv(st.diff ? S + D : S - st.sign * D, 2), st.diff ? "did-not-add-the-opposite" : "used-the-wrong-operation")]),
    hints: [
      st.diff
        ? tr(locale, "How far is it from the low temperature up to the high one?", "¿Cuánto hay desde la temperatura mínima hasta la máxima?")
        : tr(locale, `Does the value go up or down from ${showD(s)}?`, `¿El valor sube o baja desde ${showD(s)}?`),
      st.diff
        ? tr(locale, "Subtract: high − low. Subtracting a negative number is adding its opposite.", "Resta: máxima − mínima. Restar un número negativo es sumar su opuesto.")
        : tr(locale, "Going up means adding; going down means subtracting. Picture a vertical number line.", "Subir es sumar; bajar es restar. Imagina una recta numérica vertical."),
      st.diff ? `${expr} = ${showD(s)} + ${showD(-d)}` : tr(locale, `Write it as ${expr}.`, `Escríbelo como ${expr}.`),
    ],
    steps: [`${expr} = ${showD(res)}`, `${showD(res)}${unit.startsWith("°") ? (locale === "es" ? " " : "") : " "}${unit}`],
    seconds: 50,
  };
}

function ratAddSub(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) return ratAddSubDec(r, locale);
  if (level === 2) return ratAddSubFrac(r, locale, false);
  return r.bool() ? ratAddSubStory(r, locale) : ratAddSubFrac(r, locale, true);
}

// ---------- m.rational.multdiv ----------

function ratMultDivDec(r: Rng, locale: Locale): ItemBody {
  const div = r.bool(0.45);
  const [sx, sy] = r.pick<[number, number]>([[-1, 1], [1, -1], [-1, -1], [-1, 1]]);
  // Whole units and places for x, y and the answer, so every value is one exact division.
  let X: number, xp: number, Y: number, yp: number, A: number, ap: number;
  if (!div) {
    X = decUnits(r, 2, 99, 1);
    xp = 1;
    [Y, yp] = r.bool() ? [r.int(2, 12), 0] : [decUnits(r, 2, 30, 1), 1];
    [A, ap] = [X * Y, xp + yp];
  } else {
    // Build the quotient first: dividend = quotient × divisor.
    const qd = r.bool();
    const [Qn, qp] = qd ? [decUnits(r, 11, 99, 1), 1] : [r.int(2, 12), 0];
    [Y, yp] = !qd || r.bool() ? [decUnits(r, 2, 40, 1), 1] : [r.int(2, 9), 0];
    [X, xp] = [Qn * Y, qp + yp];
    [A, ap] = [Qn, qp];
  }
  const x = dv(sx * X, xp), y = dv(sy * Y, yp), ans = dv(sx * sy * A, ap);
  const op = div ? "÷" : "×";
  const expr = `${showD(x)} ${op} ${parD(y)}`;
  const answer: Answer = { kind: "number", value: ans };
  const signLine =
    sx === sy
      ? tr(locale, "The signs are the same, so the answer is positive.", "Los signos son iguales, así que la respuesta es positiva.")
      : tr(locale, "The signs are different, so the answer is negative.", "Los signos son diferentes, así que la respuesta es negativa.");
  return {
    prompt: [`${expr} = `, { blank: true }],
    say: div ? tr(locale, `${sayN(x, locale)} divided by ${sayN(y, locale)}`, `${sayN(x, locale)} dividido entre ${sayN(y, locale)}`) : tr(locale, `${sayN(x, locale)} times ${sayN(y, locale)}`, `${sayN(x, locale)} por ${sayN(y, locale)}`),
    input: "keypad",
    keys: ["-", "."],
    answer,
    wrong: wrongFor(answer, [w(-ans, "used-the-wrong-sign-rule"), w(ap ? dv(sx * sy * A, ap - 1) : sx * sy * A * 10, "misplaced-the-decimal-point")]),
    hints: [
      tr(locale, "Count the negative signs.", "Cuenta los signos negativos."),
      div
        ? tr(locale, "Divide without the signs, then choose the sign: same signs give a positive answer, different signs give a negative one.", "Divide sin los signos y luego elige el signo: signos iguales dan positivo, signos diferentes dan negativo.")
        : tr(locale, "Multiply without the signs, then choose the sign: same signs give a positive answer, different signs give a negative one.", "Multiplica sin los signos y luego elige el signo: signos iguales dan positivo, signos diferentes dan negativo."),
      signLine,
    ],
    steps: [`${showD(Math.abs(x))} ${op} ${showD(Math.abs(y))} = ${showD(Math.abs(ans))}`, signLine, `${expr} = ${showD(ans)}`],
    seconds: 30,
  };
}

function ratMultDivFrac(r: Rng, locale: Locale): ItemBody {
  const div = r.bool(0.5);
  const pick = (sign: number): Q => {
    const d = r.int(2, 9);
    let n = r.int(1, 2 * d - 1);
    while (gcd(n, d) !== 1 || n === d) n = r.int(1, 2 * d - 1);
    return [sign * n, d];
  };
  let a: Q, b: Q, res: Q;
  do {
    const [sa, sb] = r.pick<[number, number]>([[-1, 1], [1, -1], [-1, -1], [-1, 1]]);
    a = pick(sa);
    b = pick(sb);
    res = div ? qDiv(a, b) : qMul(a, b);
    // A whole-number result is drawn again: these items practice a fraction answer in simplest form.
  } while (Math.abs(res[0]) > 60 || res[1] > 60 || res[1] === 1);
  const answer: Answer = { kind: "fraction", n: res[0], d: res[1], simplest: true };
  const recip = qr(b[1], b[0]);
  const op = div ? "÷" : "×";
  const signLine =
    a[0] < 0 === b[0] < 0
      ? tr(locale, "The signs are the same, so the answer is positive.", "Los signos son iguales, así que la respuesta es positiva.")
      : tr(locale, "The signs are different, so the answer is negative.", "Los signos son diferentes, así que la respuesta es negativa.");
  const simplest = tr(locale, "Write the answer in simplest form.", "Escribe la respuesta en su forma más simple.");
  const second = div ? recip : b;
  const rawN = Math.abs(a[0] * second[0]), rawD = a[1] * second[1], neg = a[0] < 0 !== second[0] < 0;
  const product = `${qShow(a, false)} × ${qOperandText(second, true, false)} = ${neg ? "−" : ""}${rawN}/${rawD}`;
  return {
    prompt: [`${simplest} `, ...qOperand(a, false, false), ` ${op} `, ...qOperand(b, true, false), " = ", { blank: true }],
    say: `${sayQ(a, locale, false)} ${div ? tr(locale, "divided by", "dividido entre") : tr(locale, "times", "por")} ${sayQ(b, locale, false)}. ${simplest}`,
    input: "fraction",
    keys: ["-"],
    answer,
    wrong: wrongFor(answer, [
      w(qNeg(res), "used-the-wrong-sign-rule"),
      div && w(qMul(a, b), "did-not-flip-the-divisor"),
      div && w(qr(res[1], res[0]), "flipped-the-wrong-fraction"),
      !div && w(qr(a[0] * b[1], a[1] * b[0]), "cross-multiplied"),
    ]),
    hints: div
      ? [
          tr(locale, "Will the quotient be positive or negative?", "¿El cociente será positivo o negativo?"),
          tr(locale, `Dividing by ${qShow(b, false)} is the same as multiplying by its reciprocal, ${qShow(recip, false)}.`, `Dividir entre ${qShow(b, false)} es lo mismo que multiplicar por su recíproco, ${qShow(recip, false)}.`),
          `${qShow(a, false)} ÷ ${qOperandText(b, true, false)} = ${qShow(a, false)} × ${qOperandText(recip, true, false)}`,
        ]
      : [
          tr(locale, "Will the product be positive or negative?", "¿El producto será positivo o negativo?"),
          tr(locale, "Multiply the numerators and multiply the denominators. Then simplify and give the answer its sign.", "Multiplica los numeradores entre sí y los denominadores entre sí. Luego simplifica y ponle el signo a la respuesta."),
          signLine,
        ],
    steps: [product, signLine, `= ${qShow(res, false)}`],
    seconds: 40,
  };
}

/** `rate` is the range of the rate in tenths. */
type RateStory = { per: boolean; rate: [number, number]; en: (rate: string, t: number, who: string) => string; es: (rate: string, t: number, who: string) => string };
const RATE_STORIES_7: RateStory[] = [
  {
    per: false, rate: [10, 45],
    en: (rate, t) => `A diver descends at a steady rate of ${rate} feet per second. What is the diver's change in elevation after ${t} seconds?`,
    es: (rate, t) => `Un buzo desciende a un ritmo constante de ${rate} pies por segundo. ¿Cuál es el cambio en su elevación después de ${t} segundos?`,
  },
  {
    per: false, rate: [5, 30],
    en: (rate, t) => `The temperature fell ${rate}°F each hour for ${t} hours. What was the total change in temperature, in °F?`,
    es: (rate, t) => `La temperatura bajó ${rate} °F cada hora durante ${t} horas. ¿Cuál fue el cambio total de temperatura, en °F?`,
  },
  {
    per: false, rate: [10, 60],
    en: (rate, t, who) => `In a game, ${who} loses ${rate} points for each wrong answer and gives ${t} wrong answers. What is the total change in ${who}'s score?`,
    es: (rate, t, who) => `En un juego, ${who} pierde ${rate} puntos por cada respuesta incorrecta y da ${t} respuestas incorrectas. ¿Cuál es el cambio total en su puntaje?`,
  },
  {
    per: false, rate: [10, 60],
    en: (rate, t) => `A water tank drains at ${rate} gallons per minute. What is the change in the amount of water after ${t} minutes?`,
    es: (rate, t) => `Un tanque de agua se vacía a razón de ${rate} galones por minuto. ¿Cuál es el cambio en la cantidad de agua después de ${t} minutos?`,
  },
  {
    per: true, rate: [5, 95],
    en: (total, t) => `A submarine's elevation changed by ${total} meters over ${t} minutes at a steady rate. What was the change in elevation each minute?`,
    es: (total, t) => `La elevación de un submarino cambió ${total} metros en ${t} minutos a un ritmo constante. ¿Cuánto cambió su elevación cada minuto?`,
  },
  {
    per: true, rate: [10, 60],
    en: (total, t) => `A hot-air balloon's height changed by ${total} meters in ${t} minutes as it came down at a steady rate. What was the change in height per minute?`,
    es: (total, t) => `La altura de un globo aerostático cambió ${total} metros en ${t} minutos mientras bajaba a un ritmo constante. ¿Cuánto cambió su altura por minuto?`,
  },
];

function ratRateStory(r: Rng, locale: Locale): ItemBody {
  const st = r.pick(RATE_STORIES_7), who = r.pick(NAMES);
  const rateU = decUnits(r, ...st.rate, 1); // tenths
  const t = r.int(2, 12);
  const rate = dv(rateU, 1), totalU = rateU * t, total = dv(totalU, 1);
  const ans = st.per ? -rate : -total;
  const q = st.per ? tr(locale, st.en(showD(-total), t, who), st.es(showD(-total), t, who)) : tr(locale, st.en(showD(rate), t, who), st.es(showD(rate), t, who));
  const tail = tr(locale, "Use a negative number for a decrease.", "Usa un número negativo para una disminución.");
  const answer: Answer = { kind: "number", value: ans };
  const ansU = st.per ? -rateU : -totalU;
  return {
    prompt: [`${q} ${tail}`],
    say: `${speak(q, locale)} ${tail}`,
    input: "keypad",
    keys: ["-", "."],
    answer,
    wrong: wrongFor(answer, [w(-ans, "forgot-the-negative-sign"), w(dv(ansU, 2), "misplaced-the-decimal-point"), st.per && w(-dv(totalU * t, 1), "multiplied-instead-of-dividing")]),
    hints: [
      tr(locale, "Is this an increase or a decrease? That gives the sign of the answer.", "¿Es un aumento o una disminución? Eso da el signo de la respuesta."),
      st.per
        ? tr(locale, `Divide the total change by the number of minutes, ${t}.`, `Divide el cambio total entre el número de minutos, ${t}.`)
        : tr(locale, `Multiply the change each time by the number of times, ${t}.`, `Multiplica el cambio de cada vez por el número de veces, ${t}.`),
      st.per ? `${showD(-total)} ÷ ${t}` : `${t} × (${showD(-rate)})`,
    ],
    steps: [st.per ? `${showD(total)} ÷ ${t} = ${showD(rate)}` : `${t} × ${showD(rate)} = ${showD(total)}`, tr(locale, "It is a decrease, so the change is negative.", "Es una disminución, así que el cambio es negativo."), showD(ans)],
    seconds: 50,
  };
}

function ratMultDiv(r: Rng, level: number, locale: Locale): ItemBody {
  return level === 1 ? ratMultDivDec(r, locale) : level === 2 ? ratMultDivFrac(r, locale) : ratRateStory(r, locale);
}

// ---------- m.prop.constant ----------

/** k in hundredths for tables, whole k for graphs (so every point sits on a grid line). */
type PropCtx = { x: [string, string]; y: [string, string]; per: [string, string]; ks: number[]; whole: number[] };
const PROP_CTX: PropCtx[] = [
  { x: ["hours biked", "horas en bicicleta"], y: ["miles", "millas"], per: ["miles per hour", "millas por hora"], ks: [750, 800, 900, 1050, 1200, 1250], whole: [5, 6, 7, 8, 9] },
  { x: ["cups of flour", "tazas de harina"], y: ["muffins", "panecillos"], per: ["muffins per cup", "panecillos por taza"], ks: [600, 800, 900, 1000, 1200], whole: [6, 8, 9, 10, 12] },
  { x: ["pounds of apples", "libras de manzanas"], y: ["cost in dollars", "costo en dólares"], per: ["dollars per pound", "dólares por libra"], ks: [125, 150, 175, 225, 250], whole: [2, 3] },
  { x: ["minutes", "minutos"], y: ["meters swum", "metros nadados"], per: ["meters per minute", "metros por minuto"], ks: [2000, 2250, 2500, 2750, 3000], whole: [20, 25, 30] },
  { x: ["packs", "paquetes"], y: ["stickers", "calcomanías"], per: ["stickers per pack", "calcomanías por paquete"], ks: [400, 600, 800, 1000, 1200], whole: [4, 5, 6, 8] },
  { x: ["minutes", "minutos"], y: ["pages read", "páginas leídas"], per: ["pages per minute", "páginas por minuto"], ks: [50, 150, 200, 250], whole: [2, 3] },
  { x: ["weeks", "semanas"], y: ["centimeters a plant grows", "centímetros que crece una planta"], per: ["centimeters per week", "centímetros por semana"], ks: [150, 250, 300, 350], whole: [2, 3, 4] },
  { x: ["songs", "canciones"], y: ["minutes of music", "minutos de música"], per: ["minutes per song", "minutos por canción"], ks: [250, 300, 350, 400], whole: [3, 4, 5] },
];

/** `y` is the letter as written: "y" on screen, "ye" read aloud in Spanish, where a lone "y" is heard as "and". */
type EqStory = { money: boolean; ks: number[]; en: (T: string, n: number, who: string) => string; es: (T: string, n: number, who: string, y: string) => string };
const EQ_STORIES: EqStory[] = [
  {
    money: true, ks: [125, 150, 175, 225, 250, 350],
    en: (T, n, who) => `${who} pays ${T} for ${n} notebooks. Which equation gives the cost y, in dollars, of x notebooks?`,
    es: (T, n, who, y) => `${who} paga ${T} por ${n} cuadernos. ¿Qué ecuación da el costo ${y}, en dólares, de x cuadernos?`,
  },
  {
    money: false, ks: [50, 75, 150, 250],
    en: (T, n) => `A recipe uses ${T} cups of sugar for ${n} batches of cookies. Which equation gives the cups of sugar y for x batches?`,
    es: (T, n, _who, y) => `Una receta usa ${T} tazas de azúcar para ${n} tandas de galletas. ¿Qué ecuación da las tazas de azúcar ${y} para x tandas?`,
  },
  {
    money: false, ks: [850, 1050, 1150, 1250],
    en: (T, n) => `A cyclist rides ${T} miles in ${n} hours at a steady speed. Which equation gives the distance y, in miles, after x hours?`,
    es: (T, n, _who, y) => `Una ciclista recorre ${T} millas en ${n} horas a velocidad constante. ¿Qué ecuación da la distancia ${y}, en millas, después de x horas?`,
  },
  {
    money: false, ks: [1200, 1500, 1800, 2400],
    en: (T, n) => `A printer prints ${T} pages in ${n} minutes. Which equation gives the number of pages y printed in x minutes?`,
    es: (T, n, _who, y) => `Una impresora imprime ${T} páginas en ${n} minutos. ¿Qué ecuación da el número de páginas ${y} impresas en x minutos?`,
  },
  {
    money: true, ks: [450, 550, 650, 750, 850],
    en: (T, n) => `${n} tickets to a planetarium show cost ${T}. Which equation gives the cost y, in dollars, of x tickets?`,
    es: (T, n, _who, y) => `${n} boletos para una función del planetario cuestan ${T}. ¿Qué ecuación da el costo ${y}, en dólares, de x boletos?`,
  },
  {
    money: false, ks: [150, 250, 350],
    en: (T, n) => `A dog eats ${T} cups of food in ${n} days. Which equation gives the cups of food y the dog eats in x days?`,
    es: (T, n, _who, y) => `Un perro come ${T} tazas de comida en ${n} días. ¿Qué ecuación da las tazas de comida ${y} que come en x días?`,
  },
];

function propConstant(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 3) {
    const st = r.pick(EQ_STORIES), who = r.pick(NAMES);
    const kU = r.pick(st.ks), n = r.int(2, 8);
    const k = dv(kU, 2), T = dv(kU * n, 2);
    const Tshown = st.money ? money(kU * n) : showD(T);
    const q = tr(locale, st.en(Tshown, n, who), st.es(Tshown, n, who, "y"));
    const eq = tr(locale, "equals", "es igual a"), plus = tr(locale, "plus", "más"), y = tr(locale, "y", "ye");
    const option = (label: string, said: string, why?: string): Choice => ({ label, say: said, ...(why ? { why } : {}) });
    return {
      prompt: [q],
      say: speak(tr(locale, q, st.es(Tshown, n, who, "ye")), locale),
      ...withChoices(r, option(`y = ${k}x`, `${y} ${eq} ${k} x`), [
        option(`x = ${k}y`, `x ${eq} ${k} ${y}`, "inverted-the-ratio"),
        option(`y = ${T}x`, `${y} ${eq} ${T} x`, "used-the-total-not-the-unit-rate"),
        option(`y = x + ${k}`, `${y} ${eq} x ${plus} ${k}`, "added-instead-of-multiplying"),
      ]),
      ...withY(
        locale,
        [
          tr(locale, "What is the unit rate, the amount for 1?", "¿Cuál es la tasa unitaria, la cantidad que corresponde a 1?"),
          (Y) => tr(locale, "In y = kx, k is the unit rate. Divide the total by the number of items.", `En ${Y} = kx, k es la tasa unitaria. Divide el total entre el número de elementos.`),
          `k = ${T} ÷ ${n}`,
        ],
        [`k = ${T} ÷ ${n} = ${k}`, (Y) => `${Y} = ${k}x`],
      ),
      seconds: 45,
    };
  }
  const c = r.pick(PROP_CTX);
  const xL = tr(locale, c.x[0], c.x[1]), yL = tr(locale, c.y[0], c.y[1]), per = tr(locale, c.per[0], c.per[1]);
  if (level === 2) {
    const k = r.pick(c.whole);
    const points: [number, number][] = [[0, 0], [2, 2 * k], [4, 4 * k], [6, 6 * k]];
    const q = tr(locale, `The graph shows a proportional relationship between ${xL} and ${yL}. What is the constant of proportionality, in ${per}?`, `La gráfica muestra una relación proporcional entre ${xL} y ${yL}. ¿Cuál es la constante de proporcionalidad, en ${per}?`);
    const answer: Answer = { kind: "number", value: k };
    return {
      prompt: [q],
      say: q,
      visual: { kind: "line-graph", points, xLabel: cap(xL), yLabel: cap(yL) },
      alt: tr(
        locale,
        `A straight line graph that starts at (0, 0) and passes through (2, ${2 * k}), (4, ${4 * k}) and (6, ${6 * k}). The horizontal axis shows ${xL}; the vertical axis shows ${yL}.`,
        `Una gráfica de una recta que empieza en (0, 0) y pasa por (2, ${2 * k}), (4, ${4 * k}) y (6, ${6 * k}). El eje horizontal muestra ${xL}; el eje vertical, ${yL}.`,
      ),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(2 * k, "read-a-y-value-not-the-ratio"), w(6 * k, "read-a-y-value-not-the-ratio")]),
      ...withY(
        locale,
        [
          tr(locale, "Pick a point on the line where you can read both coordinates.", "Elige un punto de la recta donde puedas leer las dos coordenadas."),
          (Y) => tr(locale, "k = y ÷ x for any point on the line except (0, 0). It is also the y-value where x = 1.", `k = ${Y} ÷ x para cualquier punto de la recta excepto (0, 0). También es el valor de ${Y} cuando x = 1.`),
          tr(locale, `The line passes through (2, ${2 * k}).`, `La recta pasa por (2, ${2 * k}).`),
        ],
        [`${2 * k} ÷ 2 = ${k}`, `k = ${k} ${per}`],
      ),
      seconds: 30,
    };
  }
  const kU = r.pick(c.ks);
  const xs = r.shuffle([2, 3, 4, 5, 6, 8, 10]).slice(0, 3).sort((a, b) => a - b);
  const ys = xs.map((x) => dv(kU * x, 2));
  const k = dv(kU, 2);
  // Spanish read-aloud says the letter "ye": a lone "y" is heard as "and".
  const q = (said: boolean) =>
    tr(
      locale,
      `This proportional relationship pairs ${xL} (x) with ${yL} (y). x: ${xs.join(", ")}. y: ${ys.join(", ")}. What is the constant of proportionality, k, in ${said ? "y equals k times x" : "y = kx"}?`,
      said
        ? `En esta relación proporcional, x representa ${xL} y la letra ye representa ${yL}. Valores de x: ${xs.join(", ")}. Valores de ye: ${ys.join(", ")}. ¿Cuál es la constante de proporcionalidad, k, en ye es igual a k por x?`
        : `En esta relación proporcional, x representa ${xL} e y representa ${yL}. x: ${xs.join(", ")}. y: ${ys.join(", ")}. ¿Cuál es la constante de proporcionalidad, k, en y = kx?`,
    );
  const answer: Answer = { kind: "number", value: k };
  const inv = qDec(qr(100, kU));
  return {
    prompt: [q(false)],
    say: q(true),
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongFor(answer, [
      xs[1] - xs[0] !== 1 && w(dv(kU * (xs[1] - xs[0]), 2), "used-the-change-between-rows"),
      xs[2] - xs[1] !== 1 && w(dv(kU * (xs[2] - xs[1]), 2), "used-the-change-between-rows"),
      w(ys[0], "read-a-y-value-not-the-ratio"),
      inv !== null && w(inv, "divided-x-by-y"),
      kU * xs[0] - 100 * xs[0] > 0 && w(dv(kU * xs[0] - 100 * xs[0], 2), "subtracted-instead-of-dividing"),
    ]),
    ...withY(
      locale,
      [
        (Y) => tr(locale, "In a proportional relationship, y ÷ x is the same for every pair.", `En una relación proporcional, ${Y} ÷ x es igual para todos los pares.`),
        (Y) => tr(locale, "Divide a y-value by its matching x-value. Check with a second pair.", `Divide un valor de ${Y} entre su valor de x correspondiente. Comprueba con otro par.`),
        tr(locale, `Use the first pair: ${ys[0]} ÷ ${xs[0]}.`, `Usa el primer par: ${ys[0]} ÷ ${xs[0]}.`),
      ],
      [`${ys[0]} ÷ ${xs[0]} = ${k}`, `${ys[1]} ÷ ${xs[1]} = ${k}`, `k = ${k}`],
    ),
    seconds: 40,
  };
}

// ---------- m.interest.simple ----------

type InterestCtx = {
  pay: boolean;
  en: (P: string, r: number, who: string) => string;
  es: (P: string, r: number, who: string) => string;
  total: [string, string];
};
const INTEREST_CTX: InterestCtx[] = [
  {
    pay: false, total: ["How much money will be in the account after", "¿Cuánto dinero habrá en la cuenta después de"],
    en: (P, rr, who) => `${who} puts ${P} in a savings account that pays ${rr}% simple interest per year.`,
    es: (P, rr, who) => `${who} deposita ${P} en una cuenta de ahorros que paga un interés simple del ${rr}% anual.`,
  },
  {
    pay: true, total: ["How much will the family pay back in all after", "¿Cuánto pagará la familia en total después de"],
    en: (P, rr) => `A family borrows ${P} to buy a used piano. The loan charges ${rr}% simple interest per year.`,
    es: (P, rr) => `Una familia pide prestados ${P} para comprar un piano usado. El préstamo cobra un interés simple del ${rr}% anual.`,
  },
  {
    pay: false, total: ["How much money will the club have after", "¿Cuánto dinero tendrá el club después de"],
    en: (P, rr) => `A school robotics club invests ${P} at ${rr}% simple interest per year.`,
    es: (P, rr) => `El club de robótica de una escuela invierte ${P} a un interés simple del ${rr}% anual.`,
  },
  {
    pay: false, total: ["How much money will the bond be worth after", "¿Cuánto valdrá el bono después de"],
    en: (P, rr, who) => `${who}'s grandparents put ${P} in a savings bond that pays ${rr}% simple interest per year.`,
    es: (P, rr, who) => `Los abuelos de ${who} ponen ${P} en un bono de ahorro que paga un interés simple del ${rr}% anual.`,
  },
];

function interestSimple(r: Rng, level: number, locale: Locale): ItemBody {
  const c = r.pick(INTEREST_CTX), who = r.pick(NAMES);
  const P = r.int(2, 25) * 100, rate = r.pick([2, 3, 4, 5, 6, 8]), t = r.int(2, 6);
  const yearly = (P * rate) / 100; // whole dollars
  const setup = tr(locale, c.en(money(P * 100), rate, who), c.es(money(P * 100), rate, who));
  const dollars = tr(locale, "Answer in dollars.", "Responde en dólares.");
  const earnQ = (time: string) =>
    c.pay ? tr(locale, `How much interest does the family pay in ${time}?`, `¿Cuánto interés paga la familia en ${time}?`) : tr(locale, `How much interest is earned in ${time}?`, `¿Cuánto interés se gana en ${time}?`);
  const years = (n: number) => tr(locale, n === 1 ? "1 year" : `${n} years`, n === 1 ? "1 año" : `${n} años`);
  const kind = level === 1 ? "interest" : r.pick(["total", "total", "months", "rate"] as const);
  if (kind === "rate") {
    const I = yearly * t;
    const q = c.pay
      ? tr(locale, `A family paid ${money(I * 100)} in simple interest on a loan of ${money(P * 100)} over ${years(t)}. What was the yearly interest rate?`, `Una familia pagó ${money(I * 100)} de interés simple por un préstamo de ${money(P * 100)} en ${years(t)}. ¿Cuál fue la tasa de interés anual?`)
      : tr(locale, `${who} earned ${money(I * 100)} in simple interest on ${money(P * 100)} over ${years(t)}. What was the yearly interest rate?`, `${who} ganó ${money(I * 100)} de interés simple sobre ${money(P * 100)} en ${years(t)}. ¿Cuál fue la tasa de interés anual?`);
    const answer: Answer = { kind: "number", value: rate };
    return {
      prompt: [q, " ", { blank: true }, "%"],
      say: speak(q, locale),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(rate * t, "forgot-to-divide-by-the-time"), w(yearly, "gave-the-yearly-interest-not-the-rate")]),
      hints: [
        tr(locale, "How much interest is there for one year?", "¿Cuánto interés corresponde a un año?"),
        tr(locale, "Find the interest for one year, then write it as a percent of the principal.", "Halla el interés de un año y luego escríbelo como porcentaje del capital."),
        tr(locale, `One year: ${money(I * 100)} ÷ ${t} = ${money(yearly * 100)}.`, `Un año: ${money(I * 100)} ÷ ${t} = ${money(yearly * 100)}.`),
      ],
      steps: [`${I} ÷ ${t} = ${yearly}`, `${yearly} ÷ ${P} = ${dv(rate, 2)}`, `${dv(rate, 2)} = ${rate}%`],
      seconds: 60,
    };
  }
  if (kind === "months") {
    const m = r.pick([6, 9, 18, 30]);
    const cents = (P * rate * m) / 12; // P dollars × rate% × m/12 years, in cents
    const q = `${setup} ${earnQ(tr(locale, `${m} months`, `${m} meses`))} ${dollars}`;
    const answer: Answer = { kind: "number", value: cents / 100 };
    const yrs = dv((m * 100) / 12, 2);
    return {
      prompt: [q],
      say: speak(q, locale),
      input: "keypad",
      keys: ["."],
      answer,
      wrong: wrongFor(answer, [w(yearly * m, "used-months-as-years"), w(yearly, "found-one-year-only")]),
      hints: [
        tr(locale, `The rate is per year. What part of a year is ${m} months?`, `La tasa es anual. ¿Qué parte de un año son ${m} meses?`),
        tr(locale, "Write the time in years, then use interest = principal × rate × time.", "Escribe el tiempo en años y luego usa interés = capital × tasa × tiempo."),
        tr(locale, `${m} months = ${m} ÷ 12 = ${yrs} years.`, `${m} meses = ${m} ÷ 12 = ${yrs} años.`),
      ],
      steps: [`I = ${P} × ${dv(rate, 2)} × ${yrs}`, `= ${yearly} × ${yrs}`, `= ${money(cents)}`],
      seconds: 60,
    };
  }
  const I = yearly * t;
  if (kind === "total") {
    const q = `${setup} ${tr(locale, `${c.total[0]} ${years(t)}?`, `${c.total[1]} ${years(t)}?`)} ${dollars}`;
    const answer: Answer = { kind: "number", value: P + I };
    return {
      prompt: [q],
      say: speak(q, locale),
      input: "keypad",
      keys: ["."],
      answer,
      wrong: wrongFor(answer, [w(I, "gave-the-interest-not-the-total"), w(P + yearly, "found-one-year-only")]),
      hints: [
        tr(locale, "The total is the principal plus all the interest.", "El total es el capital más todo el interés."),
        tr(locale, "Find the interest with interest = principal × rate × time, then add the principal.", "Calcula el interés con interés = capital × tasa × tiempo y luego suma el capital."),
        tr(locale, `One year of interest: ${rate}% of ${money(P * 100)} = ${money(yearly * 100)}.`, `Interés de un año: ${rate}% de ${money(P * 100)} = ${money(yearly * 100)}.`),
      ],
      steps: [`I = ${P} × ${dv(rate, 2)} × ${t} = ${I}`, `${P} + ${I} = ${P + I}`, money((P + I) * 100)],
      seconds: 60,
    };
  }
  const q = `${setup} ${earnQ(years(t))} ${dollars}`;
  const answer: Answer = { kind: "number", value: I };
  return {
    prompt: [q],
    say: speak(q, locale),
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongFor(answer, [w(yearly, "found-one-year-only"), w(P + I, "gave-the-total-not-the-interest")]),
    hints: [
      tr(locale, "Simple interest is the same amount every year.", "El interés simple es la misma cantidad cada año."),
      tr(locale, `Interest = principal × rate × time. Write ${rate}% as a decimal: ${dv(rate, 2)}.`, `Interés = capital × tasa × tiempo. Escribe ${rate}% como decimal: ${dv(rate, 2)}.`),
      tr(locale, `One year: ${rate}% of ${money(P * 100)} = ${money(yearly * 100)}.`, `Un año: ${rate}% de ${money(P * 100)} = ${money(yearly * 100)}.`),
    ],
    steps: [`I = ${P} × ${dv(rate, 2)} × ${t}`, `= ${yearly} × ${t}`, `= ${money(I * 100)}`],
    seconds: 50,
  };
}

// ---------- m.scale.drawing ----------

type ScaleCtx = {
  ks: number[];
  L: [number, number];
  one: [string, string];
  d: [string, string];
  unit: [string, string];
  scale: (k: number, locale: Locale) => string;
  en: (L: string) => string;
  es: (L: string) => string;
};
const SCALE_CTX: ScaleCtx[] = [
  {
    ks: [2, 3, 4, 5], L: [2, 8], one: ["centimeter", "centímetro"], d: ["centimeters", "centímetros"], unit: ["meters", "metros"],
    scale: (k, l) => tr(l, `On a floor plan, 1 centimeter represents ${k} meters.`, `En un plano, 1 centímetro representa ${k} metros.`),
    en: (L) => `A wall is ${L} centimeters long on the plan. How long is the real wall, in meters?`,
    es: (L) => `Una pared mide ${L} centímetros en el plano. ¿Cuánto mide la pared real, en metros?`,
  },
  {
    ks: [2, 3, 4, 5], L: [2, 8], one: ["inch", "pulgada"], d: ["inches", "pulgadas"], unit: ["feet", "pies"],
    scale: (k, l) => tr(l, `In a scale drawing of a skate park, 1 inch represents ${k} feet.`, `En un dibujo a escala de un parque de patinaje, 1 pulgada representa ${k} pies.`),
    en: (L) => `A ramp is ${L} inches long in the drawing. How long is the real ramp, in feet?`,
    es: (L) => `Una rampa mide ${L} pulgadas en el dibujo. ¿Cuánto mide la rampa real, en pies?`,
  },
  {
    ks: [5, 10, 20, 25, 50], L: [2, 12], one: ["inch", "pulgada"], d: ["inches", "pulgadas"], unit: ["miles", "millas"],
    scale: (k, l) => tr(l, `On a map, 1 inch represents ${k} miles.`, `En un mapa, 1 pulgada representa ${k} millas.`),
    en: (L) => `Two towns are ${L} inches apart on the map. What is the real distance between them, in miles?`,
    es: (L) => `Dos pueblos están a ${L} pulgadas de distancia en el mapa. ¿Cuál es la distancia real entre ellos, en millas?`,
  },
  {
    ks: [2, 3, 5], L: [2, 10], one: ["centimeter", "centímetro"], d: ["centimeters", "centímetros"], unit: ["kilometers", "kilómetros"],
    scale: (k, l) => tr(l, `On a trail map, 1 centimeter represents ${k} kilometers.`, `En un mapa de senderos, 1 centímetro representa ${k} kilómetros.`),
    en: (L) => `A trail is ${L} centimeters long on the map. How long is the real trail, in kilometers?`,
    es: (L) => `Un sendero mide ${L} centímetros en el mapa. ¿Cuánto mide el sendero real, en kilómetros?`,
  },
  {
    ks: [2, 3], L: [2, 10], one: ["centimeter", "centímetro"], d: ["centimeters", "centímetros"], unit: ["meters", "metros"],
    scale: (k, l) => tr(l, `On a garden plan, 1 centimeter represents ${k} meters.`, `En el plano de un huerto, 1 centímetro representa ${k} metros.`),
    en: (L) => `A row of beans is ${L} centimeters long on the plan. How long is the real row, in meters?`,
    es: (L) => `Una hilera de frijoles mide ${L} centímetros en el plano. ¿Cuánto mide la hilera real, en metros?`,
  },
];

const REAL_THINGS: [string, string][] = [["hallway", "Un pasillo"], ["bridge", "Un puente"], ["train", "Un tren"], ["fence", "Una cerca"], ["mural", "Un mural"]];
/** Rooms on a floor plan and the longest real side that is believable for each, in meters. */
const ROOMS: { en: string; es: string; max: number }[] = [
  { en: "classroom", es: "Un salón de clases", max: 15 },
  { en: "kitchen", es: "Una cocina", max: 8 },
  { en: "garden", es: "Un huerto", max: 30 },
  { en: "playground", es: "Un patio de juegos", max: 50 },
];

function scaleDrawing(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const c = r.pick(SCALE_CTX), k = r.pick(c.ks);
    const half = k % 2 === 0 && r.bool(0.3);
    const LU = half ? r.int(c.L[0], c.L[1] - 1) * 10 + 5 : r.int(c.L[0], c.L[1]) * 10; // tenths of a drawing unit
    const L = dv(LU, 1), real = dv(LU * k, 1);
    const q = `${c.scale(k, locale)} ${tr(locale, c.en(showD(L)), c.es(showD(L)))}`;
    const answer: Answer = { kind: "number", value: real };
    const div = qDec(qr(LU, 10 * k));
    const one = tr(locale, c.one[0], c.one[1]), du = tr(locale, c.d[0], c.d[1]), au = tr(locale, c.unit[0], c.unit[1]);
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      keys: ["."],
      answer,
      wrong: wrongFor(answer, [div !== null && w(div, "divided-by-the-scale"), w(dv(LU + 10 * k, 1), "added-the-scale")]),
      hints: [
        tr(locale, `What real length does 1 ${one} on the drawing stand for?`, `¿Qué longitud real representa 1 ${one} del dibujo?`),
        tr(locale, `Multiply the drawing length by ${k}.`, `Multiplica la longitud del dibujo por ${k}.`),
        tr(locale, `${L} ${du} on the drawing stand for ${L} × ${k} ${au}.`, `${L} ${du} del dibujo representan ${L} × ${k} ${au}.`),
      ],
      steps: [`${L} × ${k} = ${real}`, `${real} ${au}`],
      seconds: 30,
    };
  }
  if (level === 2) {
    let a: number, b: number;
    do {
      a = r.int(2, 4);
      b = r.pick([3, 5, 7, 9, 10]);
    } while (gcd(a, b) !== 1);
    const m = r.int(2, 8), real = b * m, draw = a * m;
    const [thingEn, thingEs] = r.pick(REAL_THINGS);
    const q = tr(
      locale,
      `In a scale drawing, ${a} centimeters represent ${b} meters. A real ${thingEn} is ${real} meters long. How long is it in the drawing, in centimeters?`,
      `En un dibujo a escala, ${a} centímetros representan ${b} metros. ${thingEs} real mide ${real} metros de largo. ¿Cuánto mide en el dibujo, en centímetros?`,
    );
    const answer: Answer = { kind: "number", value: draw };
    const inv = qDec(qr(real * b, a));
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      keys: ["."],
      answer,
      wrong: wrongFor(answer, [inv !== null && w(inv, "inverted-the-scale"), w(m, "used-only-one-part-of-the-scale"), w(real * a, "multiplied-by-the-drawing-number")]),
      hints: [
        tr(locale, `Every ${b} m in real life is ${a} cm in the drawing. How many groups of ${b} m are in ${real} m?`, `Cada ${b} m en la realidad son ${a} cm en el dibujo. ¿Cuántos grupos de ${b} m hay en ${real} m?`),
        tr(locale, `Divide the real length by ${b}, then multiply by ${a}.`, `Divide la longitud real entre ${b} y luego multiplica por ${a}.`),
        `${real} ÷ ${b} = ${m}`,
      ],
      steps: [`${real} ÷ ${b} = ${m}`, `${m} × ${a} = ${draw}`, `${draw} cm`],
      seconds: 45,
    };
  }
  const room = r.pick(ROOMS);
  let k: number, wd: number, h: number;
  do {
    k = r.int(2, 6);
    wd = r.int(2, 9);
    h = r.int(2, 9);
  } while (wd === h || wd * k > room.max || h * k > room.max);
  const q = tr(
    locale,
    `On a floor plan, 1 centimeter represents ${k} meters. A ${room.en} is ${wd} centimeters by ${h} centimeters on the plan. What is the area of the real ${room.en}, in square meters?`,
    `En un plano, 1 centímetro representa ${k} metros. ${room.es} mide ${wd} centímetros por ${h} centímetros en el plano. ¿Cuál es el área real, en metros cuadrados?`,
  );
  const W = wd * k, H = h * k;
  const answer: Answer = { kind: "number", value: W * H };
  return {
    prompt: [q],
    say: q,
    input: "keypad",
    answer,
    wrong: wrongFor(answer, [w(wd * h * k, "scaled-the-area-by-the-length-scale"), w(wd * h, "used-the-drawing-area"), w(2 * (W + H), "found-the-perimeter")]),
    hints: [
      tr(locale, "Find the real length and width first.", "Primero halla el largo y el ancho reales."),
      tr(locale, `Multiply each drawing length by ${k}, then multiply length × width.`, `Multiplica cada medida del dibujo por ${k} y luego multiplica largo × ancho.`),
      tr(locale, `Real length: ${wd} × ${k} = ${W} m.`, `Largo real: ${wd} × ${k} = ${W} m.`),
    ],
    steps: [`${wd} × ${k} = ${W} m, ${h} × ${k} = ${H} m`, `${W} × ${H} = ${W * H} m²`],
    seconds: 50,
  };
}

// ---------- m.angles.pairs ----------

function anglesPairs(r: Rng, level: number, locale: Locale): ItemBody {
  const deg = (n: number) => `${n}°`;
  if (level === 1) {
    const comp = r.bool(0.45);
    const S = comp ? 90 : 180;
    let a = comp ? r.int(5, 85) : r.int(15, 165);
    while (2 * a === S) a += 1;
    const kind = comp ? tr(locale, "complementary", "complementarios") : tr(locale, "supplementary", "suplementarios");
    const q = tr(locale, `Two angles are ${kind}. One angle measures ${deg(a)}. What is the measure of the other angle?`, `Dos ángulos son ${kind}. Uno mide ${deg(a)}. ¿Cuánto mide el otro ángulo?`);
    const answer: Answer = { kind: "number", value: S - a };
    return {
      prompt: [q, " ", { blank: true }, "°"],
      say: speak(q, locale),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [comp ? w(180 - a, "mixed-up-complementary-and-supplementary") : 90 - a > 0 && w(90 - a, "mixed-up-complementary-and-supplementary"), w(360 - a, "used-a-full-turn")]),
      hints: [
        tr(locale, `What do two ${kind} angles add up to?`, `¿Cuánto suman dos ángulos ${kind}?`),
        tr(locale, `${cap(kind)} angles add up to ${deg(S)}. Subtract the angle you know from ${deg(S)}.`, `Los ángulos ${kind} suman ${deg(S)}. Resta el ángulo que conoces de ${deg(S)}.`),
        `${deg(a)} + ? = ${deg(S)}`,
      ],
      steps: [`${S} − ${a} = ${S - a}`, deg(S - a)],
      seconds: 15,
    };
  }
  if (level === 2) {
    let a = r.int(20, 160);
    while (a === 90) a = r.int(20, 160);
    const vertical = r.bool();
    const setting = r.pick<[string, string]>([
      ["Two lines intersect and form four angles.", "Dos rectas se cortan y forman cuatro ángulos."],
      ["Two straight paths cross in a park and form four angles.", "Dos caminos rectos se cruzan en un parque y forman cuatro ángulos."],
      ["Two straight roads cross and form four angles.", "Dos carreteras rectas se cruzan y forman cuatro ángulos."],
    ]);
    const q = vertical
      ? tr(locale, `${setting[0]} One angle measures ${deg(a)}. What is the measure of the angle directly across from it (its vertical angle)?`, `${setting[1]} Uno mide ${deg(a)}. ¿Cuánto mide el ángulo opuesto a él por el vértice?`)
      : tr(locale, `${setting[0]} One angle measures ${deg(a)}. What is the measure of an angle next to it, along the same line (a linear pair)?`, `${setting[1]} Uno mide ${deg(a)}. ¿Cuánto mide un ángulo adyacente a él, sobre la misma recta (un par lineal)?`);
    const ans = vertical ? a : 180 - a;
    const answer: Answer = { kind: "number", value: ans };
    return {
      prompt: [q, " ", { blank: true }, "°"],
      say: speak(q, locale),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [w(vertical ? 180 - a : a, "mixed-up-vertical-and-adjacent"), w(360 - a, "used-a-full-turn"), !vertical && 90 - a > 0 && w(90 - a, "mixed-up-complementary-and-supplementary")]),
      hints: vertical
        ? [
            tr(locale, "Vertical angles sit across from each other where two lines cross. How do they compare?", "Los ángulos opuestos por el vértice están uno frente al otro donde se cruzan dos rectas. ¿Cómo son entre sí?"),
            tr(locale, "Vertical angles always have the same measure.", "Los ángulos opuestos por el vértice siempre miden lo mismo."),
            // The step that matters is ruling out the linear pair: the angle across does not share a side.
            tr(
              locale,
              `The angle across from the ${deg(a)} angle does not share a side with it, so the two are not a linear pair and do not add up to 180°.`,
              `El ángulo que está frente al de ${deg(a)} no comparte ningún lado con él, así que los dos no forman un par lineal y no suman 180°.`,
            ),
          ]
        : [
            tr(locale, "The two angles together make a straight line. What does a straight angle measure?", "Los dos ángulos juntos forman una línea recta. ¿Cuánto mide un ángulo llano?"),
            tr(locale, "Angles in a linear pair are supplementary: they add up to 180°.", "Los ángulos de un par lineal son suplementarios: suman 180°."),
            `${deg(a)} + ? = 180°`,
          ],
      steps: vertical
        ? [tr(locale, "Vertical angles are equal.", "Los ángulos opuestos por el vértice son iguales."), deg(a)]
        : [`180 − ${a} = ${ans}`, deg(ans)],
      seconds: 20,
    };
  }
  const xTerm = (p: number, q: number) => `${p === 1 ? "" : p}x ${q < 0 ? "−" : "+"} ${Math.abs(q)}`;
  if (r.bool(0.6)) {
    const comp = r.bool();
    const S = comp ? 90 : 180;
    let x: number, p: number, q: number;
    do {
      p = r.int(1, 4);
      x = r.int(5, comp ? 25 : 45);
      q = S - (1 + p) * x;
    } while (q === 0 || Math.abs(q) > 60 || p * x + q <= 0);
    const kind = comp ? tr(locale, "complementary", "complementarios") : tr(locale, "supplementary", "suplementarios");
    const second = `(${xTerm(p, q)})°`;
    const qText = tr(locale, `Two angles are ${kind}. One measures x° and the other measures ${second}. What is the value of x?`, `Dos ángulos son ${kind}. Uno mide x° y el otro mide ${second}. ¿Cuál es el valor de x?`);
    const other = 270 - S; // the other angle sum
    const answer: Answer = { kind: "number", value: x };
    return {
      prompt: [qText],
      say: speak(qText.replace(/\((\d*)x ([+−]) (\d+)\)°/, (_, c: string, s: string, k: string) => `${c ? `${c} x` : "x"} ${s === "+" ? tr(locale, "plus", "más") : tr(locale, "minus", "menos")} ${k} ${tr(locale, "degrees", "grados")}`), locale),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [(other - q) % (1 + p) === 0 && (other - q) / (1 + p) > 0 && w((other - q) / (1 + p), "used-the-wrong-angle-sum"), w(p * x + q, "gave-the-angle-instead-of-x")]),
      hints: [
        tr(locale, `What do the two angles add up to?`, `¿Cuánto suman los dos ángulos?`),
        tr(locale, `Write an equation: x + (${xTerm(p, q)}) = ${S}. Combine like terms, then solve.`, `Escribe una ecuación: x + (${xTerm(p, q)}) = ${S}. Combina términos semejantes y luego resuelve.`),
        `${1 + p}x ${q < 0 ? "−" : "+"} ${Math.abs(q)} = ${S}`,
      ],
      steps: [`x + ${xTerm(p, q)} = ${S}`, `${1 + p}x = ${S - q}`, `x = ${x}`],
      seconds: 60,
    };
  }
  let a: number, c: number, x: number, b: number, d: number;
  do {
    a = r.int(2, 7);
    c = r.int(2, 7);
    x = r.int(3, 25);
    b = r.int(-20, 40);
    d = a * x + b - c * x;
    // The angle never equals x, so "gave the angle instead of x" is always a distinct slip.
  } while (a === c || b === 0 || d === 0 || a * x + b <= 0 || a * x + b >= 180 || Math.abs(d) > 60 || a * x + b === x);
  const q = tr(
    locale,
    `Two lines intersect. Two vertical angles measure (${xTerm(a, b)})° and (${xTerm(c, d)})°. What is the value of x?`,
    `Dos rectas se cortan. Dos ángulos opuestos por el vértice miden (${xTerm(a, b)})° y (${xTerm(c, d)})°. ¿Cuál es el valor de x?`,
  );
  const sayTerm = (p: number, k: number) => `${p} x ${k < 0 ? tr(locale, "minus", "menos") : tr(locale, "plus", "más")} ${Math.abs(k)}`;
  const answer: Answer = { kind: "number", value: x };
  const sum = 180 - b - d, coef = a + c;
  const [big, small, kb, ks] = a > c ? [a, c, b, d] : [c, a, d, b];
  return {
    prompt: [q],
    say: tr(
      locale,
      `Two lines intersect. Two vertical angles measure ${sayTerm(a, b)} degrees and ${sayTerm(c, d)} degrees. What is the value of x?`,
      `Dos rectas se cortan. Dos ángulos opuestos por el vértice miden ${sayTerm(a, b)} grados y ${sayTerm(c, d)} grados. ¿Cuál es el valor de x?`,
    ),
    input: "keypad",
    answer,
    wrong: wrongFor(answer, [sum % coef === 0 && sum / coef > 0 && w(sum / coef, "added-to-180-instead-of-setting-equal"), w(a * x + b, "gave-the-angle-instead-of-x")]),
    hints: [
      tr(locale, "How do vertical angles compare?", "¿Cómo son entre sí los ángulos opuestos por el vértice?"),
      tr(locale, "Vertical angles are equal, so set the two expressions equal to each other and solve for x.", "Los ángulos opuestos por el vértice son iguales, así que iguala las dos expresiones y despeja x."),
      `${xTerm(a, b)} = ${xTerm(c, d)}`,
    ],
    steps: [`${xTerm(a, b)} = ${xTerm(c, d)}`, `${big - small}x = ${ks - kb}`, `x = ${x}`],
    seconds: 60,
  };
}

// ---------- m.ineq.twostep ----------

type BudgetStory = { op: "≤" | "≥"; lose?: boolean; en: (B: number, F: number, R: number, who: string) => string; es: (B: number, F: number, R: number, who: string) => string; rate: [number, number]; start: [number, number]; money?: boolean };
const BUDGET_STORIES: BudgetStory[] = [
  {
    op: "≤", money: true, rate: [3, 9], start: [5, 15],
    en: (B, F, R, who) => `${who} has $${B} to spend at a craft fair. ${who} buys a sketchbook for $${F} and wants paint tubes that cost $${R} each. What is the greatest number of paint tubes ${who} can buy?`,
    es: (B, F, R, who) => `${who} tiene $${B} para gastar en una feria de artesanías. Compra un cuaderno de dibujo de $${F} y quiere tubos de pintura de $${R} cada uno. ¿Cuál es el mayor número de tubos de pintura que puede comprar?`,
  },
  {
    op: "≥", money: true, rate: [3, 9], start: [200, 350],
    en: (B, F, R) => `A sports camp counselor earns $${F} per week plus $${R} for each new camper who signs up. What is the least number of sign-ups needed to earn at least $${B} in a week?`,
    es: (B, F, R) => `Un consejero de un campamento deportivo gana $${F} por semana más $${R} por cada campista nuevo que se inscribe. ¿Cuál es el menor número de inscripciones que necesita para ganar al menos $${B} en una semana?`,
  },
  {
    op: "≥", lose: true, rate: [5, 15], start: [10, 40],
    en: (B, F, R) => `In a game you start with ${B} points and lose ${R} points for each mistake. You must keep at least ${F} points to win a badge. What is the greatest number of mistakes you can make and still win the badge?`,
    es: (B, F, R) => `En un juego empiezas con ${B} puntos y pierdes ${R} puntos por cada error. Debes conservar al menos ${F} puntos para ganar una insignia. ¿Cuál es el mayor número de errores que puedes cometer y aún ganar la insignia?`,
  },
  {
    op: "≤", rate: [20, 50], start: [150, 200],
    en: (B, F, R) => `An elevator can carry at most ${B} pounds. A worker who weighs ${F} pounds rides with boxes that weigh ${R} pounds each. What is the greatest number of boxes the worker can bring?`,
    es: (B, F, R) => `Un elevador puede llevar como máximo ${B} libras. Un trabajador que pesa ${F} libras sube con cajas de ${R} libras cada una. ¿Cuál es el mayor número de cajas que puede llevar?`,
  },
  {
    op: "≥", money: true, rate: [5, 12], start: [20, 120],
    en: (B, F, R) => `A rocket club has $${F} and needs at least $${B} for a launch kit. Members earn $${R} for each car they wash. What is the least number of cars they need to wash?`,
    es: (B, F, R) => `Un club de cohetes tiene $${F} y necesita al menos $${B} para un kit de lanzamiento. Los miembros ganan $${R} por cada carro que lavan. ¿Cuál es el menor número de carros que necesitan lavar?`,
  },
  {
    op: "≥", rate: [25, 60], start: [100, 600],
    en: (B, F, R, who) => `${who} has already swum ${F} meters and swims ${R} meters each minute. What is the least number of more minutes ${who} must swim to reach at least ${B} meters in all?`,
    es: (B, F, R, who) => `${who} ya nadó ${F} metros y nada ${R} metros por minuto. ¿Cuál es el menor número de minutos más que debe nadar para llegar a por lo menos ${B} metros en total?`,
  },
];

function ineqTwoStep(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 3) {
    const st = r.pick(BUDGET_STORIES), who = r.pick(NAMES);
    const R = r.int(...st.rate), F = r.int(...st.start), n = r.int(2, 12);
    const exact = r.bool(0.3), extra = exact ? 0 : r.int(1, R - 1);
    // greatest: n + extra/R units fit; least: just past n − 1.
    const greatest = st.op === "≤" || st.lose;
    const room = greatest ? R * n + extra : R * (n - 1) + (exact ? R : extra);
    const B = F + room;
    const ans = greatest ? Math.floor(room / R) : Math.ceil(room / R);
    const q = tr(locale, st.en(B, F, R, who), st.es(B, F, R, who));
    const ineq = st.lose ? `${B} − ${R}n ≥ ${F}` : `${F} + ${R}n ${st.op} ${B}`;
    const bound = `${room}/${R}`;
    const whole = Math.floor(room / R), rem = room % R;
    const value = rem ? `${whole} ${rem / gcd(rem, R)}/${R / gcd(rem, R)}` : String(whole);
    const answer: Answer = { kind: "number", value: ans };
    const skipStart = greatest ? Math.floor(B / R) : Math.ceil(B / R);
    return {
      prompt: [q],
      say: speak(q, locale),
      input: "keypad",
      answer,
      wrong: wrongFor(answer, [
        rem ? w(greatest ? ans + 1 : ans - 1, "rounded-the-wrong-way") : w(greatest ? ans - 1 : ans + 1, "left-out-the-boundary"),
        w(skipStart, "ignored-the-starting-amount"),
      ]),
      hints: [
        tr(locale, "Write an inequality with n for the unknown number. What stays the same, and what changes with each one?", "Escribe una desigualdad con n para el número desconocido. ¿Qué se queda igual y qué cambia con cada uno?"),
        tr(locale, "Solve it like a two-step equation. Then decide which whole number works: round to the side that keeps the condition true.", "Resuélvela como una ecuación de dos pasos. Luego decide qué número entero sirve: redondea hacia el lado que mantiene verdadera la condición."),
        ineq,
      ],
      steps: [ineq, `n ${greatest ? "≤" : "≥"} ${bound} = ${value}`, tr(locale, `The ${greatest ? "greatest" : "least"} whole number that works is ${ans}.`, `El ${greatest ? "mayor" : "menor"} número entero que sirve es ${ans}.`)],
      seconds: 80,
    };
  }
  const op = r.pick<Op>([">", "<", "≥", "≤"]);
  const neg = level === 2;
  const p = r.int(2, 9), k = neg ? nonzero(r, -8, 10) : r.int(-8, 10), q = nonzero(r, -15, 15);
  const form = neg && r.bool(0.4) ? "front" : "back"; // q − px  or  −px + q
  const coef = neg ? -p : p;
  const rhs = coef * k + q;
  const lhs = neg ? (form === "front" ? `${q < 0 ? "−" : ""}${Math.abs(q)} − ${p}x` : `−${p}x ${q < 0 ? "−" : "+"} ${Math.abs(q)}`) : `${p}x ${q < 0 ? "−" : "+"} ${Math.abs(q)}`;
  const sol: Op = neg ? FLIP[op] : op;
  const choice = (o: Op, kk: number, why?: string): Choice => ({ label: `x ${o} ${show(kk)}`, say: `x ${sayOp(o, locale)} ${sayN(kk, locale)}`, ...(why ? { why } : {}) });
  const undo = q > 0 ? tr(locale, `Subtract ${q} from both sides`, `Resta ${q} de ambos lados`) : tr(locale, `Add ${-q} to both sides`, `Suma ${-q} a ambos lados`);
  const mid = `${neg ? "−" : ""}${p}x ${op} ${show(rhs - q)}`;
  const saidLhs = neg
    ? form === "front"
      ? `${sayN(q, locale)} ${tr(locale, "minus", "menos")} ${p} x`
      : `${tr(locale, "negative", "menos")} ${p} x ${q < 0 ? tr(locale, "minus", "menos") : tr(locale, "plus", "más")} ${Math.abs(q)}`
    : `${p} x ${q < 0 ? tr(locale, "minus", "menos") : tr(locale, "plus", "más")} ${Math.abs(q)}`;
  const wrong = neg
    ? [choice(op, k, "forgot-to-flip-the-sign"), choice(sol, -k, "dropped-a-negative-sign"), choice(EDGE[sol], k, "mixed-up-strict-and-inclusive")]
    : [
        choice(FLIP[op], k, "flipped-the-sign-without-a-reason"),
        (rhs + q) % p === 0 && (rhs + q) / p !== k ? choice(op, (rhs + q) / p, "used-the-wrong-inverse-operation") : choice(op, rhs - q, "forgot-to-divide"),
        choice(EDGE[op], k, "mixed-up-strict-and-inclusive"),
      ];
  return {
    prompt: [tr(locale, "Which is the solution of ", "¿Cuál es la solución de "), `${lhs} ${op} ${show(rhs)}`, "?"],
    say: tr(locale, `Solve ${saidLhs} ${sayOp(op, locale)} ${sayN(rhs, locale)}. Which statement is the solution?`, `Resuelve ${saidLhs} ${sayOp(op, locale)} ${sayN(rhs, locale)}. ¿Qué enunciado es la solución?`),
    ...withChoices(r, choice(sol, k), wrong),
    hints: neg
      ? [
          tr(locale, `After you undo the ${Math.abs(q)}, you divide by −${p}. What does dividing by a negative number do to the inequality sign?`, `Después de deshacer el ${Math.abs(q)}, divides entre −${p}. ¿Qué le pasa al signo de la desigualdad al dividir entre un número negativo?`),
          tr(locale, `${undo}. Then divide both sides by −${p} and flip the inequality sign.`, `${undo}. Luego divide ambos lados entre −${p} e invierte el signo de la desigualdad.`),
          mid,
        ]
      : [
          tr(locale, "Undo the steps in reverse order, as in an equation. What was done to x last?", "Deshaz los pasos en orden inverso, como en una ecuación. ¿Qué se le hizo a x al final?"),
          tr(locale, `${undo}, then divide both sides by ${p}. Dividing by a positive number keeps the sign.`, `${undo} y luego divide ambos lados entre ${p}. Dividir entre un número positivo no cambia el signo.`),
          mid,
        ],
    steps: neg
      ? [mid, tr(locale, `Divide by −${p} and flip the sign: x ${sol} ${show(k)}`, `Divide entre −${p} e invierte el signo: x ${sol} ${show(k)}`)]
      : [mid, `x ${sol} ${show(k)}`],
    seconds: neg ? 50 : 40,
  };
}

// ---------- m.prob.simple ----------

type BagStory = { names: [string, string][]; en: (c: number[], pick: string) => string; es: (c: number[], pick: string) => string; items: [string, string] };
const BAG_STORIES: BagStory[] = [
  {
    names: [["red", "roja"], ["blue", "azul"], ["green", "verde"]], items: ["marbles", "canicas"],
    en: (c, x) => `A bag has ${c[0]} red marbles, ${c[1]} blue marbles and ${c[2]} green marbles. You pick one marble without looking. What is the probability that it is ${x}?`,
    es: (c, x) => `Una bolsa tiene ${c[0]} canicas rojas, ${c[1]} canicas azules y ${c[2]} canicas verdes. Sacas una canica sin mirar. ¿Cuál es la probabilidad de que sea ${x}?`,
  },
  {
    names: [["a pop song", "de pop"], ["a rock song", "de rock"], ["a jazz song", "de jazz"]], items: ["songs", "canciones"],
    en: (c, x) => `A playlist has ${c[0]} pop songs, ${c[1]} rock songs and ${c[2]} jazz songs. It plays one song at random. What is the probability that it is ${x}?`,
    es: (c, x) => `Una lista tiene ${c[0]} canciones de pop, ${c[1]} de rock y ${c[2]} de jazz. Se reproduce una canción al azar. ¿Cuál es la probabilidad de que sea ${x}?`,
  },
  {
    names: [["a cat card", "de gatos"], ["a dog card", "de perros"], ["a bird card", "de pájaros"]], items: ["cards", "cartas"],
    en: (c, x) => `A deck has ${c[0]} cat cards, ${c[1]} dog cards and ${c[2]} bird cards. You draw one card at random. What is the probability of drawing ${x}?`,
    es: (c, x) => `Un mazo tiene ${c[0]} cartas de gatos, ${c[1]} de perros y ${c[2]} de pájaros. Sacas una carta al azar. ¿Cuál es la probabilidad de sacar una carta ${x}?`,
  },
  {
    names: [["an apple", "una manzana"], ["an orange", "una naranja"], ["a pear", "una pera"]], items: ["pieces of fruit", "frutas"],
    en: (c, x) => `A basket has ${c[0]} apples, ${c[1]} oranges and ${c[2]} pears. You take one piece of fruit without looking. What is the probability that it is ${x}?`,
    es: (c, x) => `Una canasta tiene ${c[0]} manzanas, ${c[1]} naranjas y ${c[2]} peras. Tomas una fruta sin mirar. ¿Cuál es la probabilidad de que sea ${x}?`,
  },
  {
    names: [["a star sticker", "de estrellas"], ["a planet sticker", "de planetas"], ["a rocket sticker", "de cohetes"]], items: ["stickers", "calcomanías"],
    en: (c, x) => `A jar has ${c[0]} star stickers, ${c[1]} planet stickers and ${c[2]} rocket stickers. You pull one out without looking. What is the probability that it is ${x}?`,
    es: (c, x) => `Un frasco tiene ${c[0]} calcomanías de estrellas, ${c[1]} de planetas y ${c[2]} de cohetes. Sacas una sin mirar. ¿Cuál es la probabilidad de que sea ${x}?`,
  },
];

type Event = { en: string; es: string; test: (v: number) => boolean; edge?: "gt" | "ge" | "lt" };
function numberEvent(r: Rng, N: number): Event {
  const kind = r.int(0, 5);
  if (kind === 0) {
    const k = r.int(2, N - 2);
    return { en: `a number greater than ${k}`, es: `un número mayor que ${k}`, test: (v) => v > k, edge: "gt" };
  }
  if (kind === 1) {
    const k = r.int(3, N - 1);
    return { en: `a number less than ${k}`, es: `un número menor que ${k}`, test: (v) => v < k, edge: "lt" };
  }
  if (kind === 2) {
    const k = r.int(2, N - 1);
    return { en: `a number greater than or equal to ${k}`, es: `un número mayor o igual que ${k}`, test: (v) => v >= k, edge: "ge" };
  }
  if (kind === 3) return { en: "an even number", es: "un número par", test: (v) => v % 2 === 0 };
  if (kind === 4) return { en: "an odd number", es: "un número impar", test: (v) => v % 2 === 1 };
  const m = r.pick(N >= 10 ? [3, 4, 5] : [2, 3]);
  return { en: `a multiple of ${m}`, es: `un múltiplo de ${m}`, test: (v) => v % m === 0 };
}

function probSimple(r: Rng, level: number, locale: Locale): ItemBody {
  const simplest = tr(locale, "Write it as a fraction in simplest form.", "Escríbela como fracción en su forma más simple.");
  if (level === 1 && r.bool(0.25)) {
    // Likelihood: which probability fits an unlikely (or likely) event?
    const likely = r.bool();
    const small = r.pick<Q>([[1, 5], [1, 8], [2, 9], [3, 10], [1, 4], [1, 3]]);
    const big = r.pick<Q>([[4, 5], [7, 8], [7, 9], [7, 10], [3, 4], [2, 3]]);
    const option = (q: Q, why?: string): Choice => ({ label: qTyped(q), say: q[0] === 0 ? "0" : q[1] === 1 ? "1" : sayFrac(q[0], q[1], locale), ...(why ? { why } : {}) });
    const right = option(likely ? big : small);
    const wrong = [option(likely ? small : big, "mixed-up-likely-and-unlikely"), option([1, 2], "chose-an-even-chance"), option(likely ? [1, 1] : [0, 1], likely ? "chose-certain-not-likely" : "chose-impossible-not-unlikely")];
    const q = likely
      ? tr(locale, "Which probability could belong to an event that is likely, but not certain?", "¿Qué probabilidad podría tener un evento probable, pero no seguro?")
      : tr(locale, "Which probability could belong to an event that is unlikely, but not impossible?", "¿Qué probabilidad podría tener un evento poco probable, pero no imposible?");
    return {
      prompt: [q],
      say: q,
      ...withChoices(r, right, wrong),
      hints: [
        tr(locale, "Probabilities go from 0, impossible, to 1, certain.", "Las probabilidades van del 0, imposible, al 1, seguro."),
        tr(locale, "An unlikely event has a probability between 0 and 1/2. A likely event has a probability between 1/2 and 1.", "Un evento poco probable tiene una probabilidad entre 0 y 1/2. Un evento probable tiene una probabilidad entre 1/2 y 1."),
        tr(locale, "A probability of 1/2 means the event is just as likely to happen as not.", "Una probabilidad de 1/2 significa que el evento tiene la misma posibilidad de ocurrir que de no ocurrir."),
      ],
      steps: [likely ? `1/2 < ${right.label} < 1` : `0 < ${right.label} < 1/2`, likely ? tr(locale, "So the event is likely.", "Así que el evento es probable.") : tr(locale, "So the event is unlikely.", "Así que el evento es poco probable.")],
      seconds: 20,
    };
  }
  if (level === 1) {
    const st = r.pick(BAG_STORIES);
    const c = [r.int(2, 9), r.int(2, 9), r.int(2, 9)];
    const i = r.int(0, 2), total = c[0] + c[1] + c[2], fav = c[i];
    const q = `${tr(locale, st.en(c, st.names[i][0]), st.es(c, st.names[i][1]))} ${simplest}`;
    const P = qr(fav, total);
    const answer: Answer = { kind: "fraction", n: P[0], d: P[1], simplest: true };
    const items = tr(locale, st.items[0], st.items[1]);
    return {
      prompt: [q],
      say: q,
      input: "fraction",
      answer,
      wrong: wrongFor(answer, [total - fav > 0 && w(qr(fav, total - fav), "compared-with-the-other-outcomes"), w(qr(total - fav, total), "found-the-probability-of-not"), w(fav, "gave-the-count-not-the-probability")]),
      hints: [
        tr(locale, `How many ${items} are there in all?`, `¿Cuántas ${items} hay en total?`),
        tr(locale, "Probability = favorable outcomes ÷ all possible outcomes, when every outcome is equally likely.", "Probabilidad = resultados favorables ÷ todos los resultados posibles, cuando todos son igual de probables."),
        tr(locale, `There are ${total} ${items} in all.`, `Hay ${total} ${items} en total.`),
      ],
      steps: [`${c[0]} + ${c[1]} + ${c[2]} = ${total}`, `P = ${fav}/${total}`, ...(P[1] !== total ? [`= ${qTyped(P)}`] : [])],
      seconds: 30,
    };
  }
  if (level === 2) {
    const setup = r.int(0, 2);
    const N = setup === 0 ? 6 : setup === 1 ? r.pick([10, 12, 15, 20]) : r.pick([8, 10, 12]);
    const ev = numberEvent(r, N);
    const outcomes = Array.from({ length: N }, (_, i) => i + 1);
    const hits = outcomes.filter(ev.test);
    const P = qr(hits.length, N);
    const intro = [
      tr(locale, "You roll a number cube with faces numbered 1 to 6.", "Lanzas un dado con caras numeradas del 1 al 6."),
      tr(locale, `You pick one card at random from cards numbered 1 to ${N}.`, `Sacas una carta al azar de un grupo de cartas numeradas del 1 al ${N}.`),
      tr(locale, `You spin a spinner with ${N} equal sections numbered 1 to ${N}.`, `Giras una ruleta con ${N} secciones iguales numeradas del 1 al ${N}.`),
    ][setup];
    const q = `${intro} ${tr(locale, `What is the probability of getting ${ev.en}?`, `¿Cuál es la probabilidad de obtener ${ev.es}?`)} ${simplest}`;
    const answer: Answer = { kind: "fraction", n: P[0], d: P[1], simplest: true };
    return {
      prompt: [q],
      say: q,
      input: "fraction",
      answer,
      wrong: wrongFor(answer, [
        ev.edge === "gt" && w(qr(hits.length + 1, N), "included-the-boundary"),
        ev.edge === "lt" && w(qr(hits.length + 1, N), "included-the-boundary"),
        ev.edge === "ge" && w(qr(hits.length - 1, N), "left-out-the-boundary"),
        w(qr(N - hits.length, N), "found-the-probability-of-not"),
        w(hits.length, "gave-the-count-not-the-probability"),
      ]),
      hints: [
        tr(locale, `How many outcomes are possible, and are they all equally likely?`, `¿Cuántos resultados son posibles y son todos igual de probables?`),
        tr(locale, `List the outcomes that match, count them, then divide by ${N}.`, `Haz una lista de los resultados que cumplen, cuéntalos y luego divide entre ${N}.`),
        tr(locale, `The outcomes that match: ${hits.join(", ")}.`, `Los resultados que cumplen: ${hits.join(", ")}.`),
      ],
      steps: [tr(locale, `${hits.length} of the ${N} outcomes match.`, `${hits.length} de los ${N} resultados cumplen.`), `P = ${hits.length}/${N}`, ...(P[1] !== N ? [`= ${qTyped(P)}`] : [])],
      seconds: 40,
    };
  }
  // Level 3: predict how often an outcome happens in many tries.
  const setup = r.int(0, 2);
  let fav: number, N: number, q: string, other: number;
  const T0 = r.int(2, 10);
  if (setup === 0) {
    N = r.pick([4, 5, 6, 8, 10]);
    fav = r.int(1, N - 1);
    other = N - fav;
    const color = r.pick<[string, string, string]>([["blue", "azules", "azul"], ["red", "rojas", "roja"], ["yellow", "amarillas", "amarilla"], ["green", "verdes", "verde"]]);
    const T = T0 * N;
    q = tr(
      locale,
      `A spinner has ${N} equal sections, and ${fav} of them ${fav === 1 ? "is" : "are"} ${color[0]}. If you spin it ${T} times, about how many times should you expect it to land on ${color[0]}?`,
      `Una ruleta tiene ${N} secciones iguales, y ${fav === 1 ? `1 es ${color[2]}` : `${fav} son ${color[1]}`}. Si la giras ${T} veces, ¿aproximadamente cuántas veces debería caer en una sección ${color[2]}?`,
    );
  } else if (setup === 1) {
    N = 6;
    const ev = r.pick([
      { en: "a number greater than 4", es: "un número mayor que 4", f: 2 },
      { en: "an even number", es: "un número par", f: 3 },
      { en: "a 6", es: "un 6", f: 1 },
      { en: "a number less than 3", es: "un número menor que 3", f: 2 },
      { en: "a number greater than 1", es: "un número mayor que 1", f: 5 },
    ]);
    fav = ev.f;
    other = N - fav;
    const T = T0 * N;
    q = tr(locale, `You roll a number cube numbered 1 to 6 a total of ${T} times. About how many times should you expect to roll ${ev.en}?`, `Lanzas un dado numerado del 1 al 6 un total de ${T} veces. ¿Aproximadamente cuántas veces deberías sacar ${ev.es}?`);
  } else {
    fav = r.int(1, 6);
    other = r.int(1, 6);
    N = fav + other;
    const T = T0 * N;
    q = tr(
      locale,
      `A bag has ${fav} yellow tiles and ${other} purple tiles. You pick a tile, write down its color and put it back, ${T} times in all. About how many times should you expect to pick a yellow tile?`,
      `Una bolsa tiene ${fav} fichas amarillas y ${other} fichas moradas. Sacas una ficha, anotas su color y la regresas, ${T} veces en total. ¿Aproximadamente cuántas veces deberías sacar una ficha amarilla?`,
    );
  }
  const T = T0 * N;
  const ans = T0 * fav;
  const answer: Answer = { kind: "number", value: ans };
  return {
    prompt: [q],
    say: q,
    input: "keypad",
    answer,
    wrong: wrongFor(answer, [(T * fav) % other === 0 && w((T * fav) / other, "used-part-to-part"), w(T - ans, "found-the-other-outcome"), w(T * fav, "forgot-to-divide-by-the-total")]),
    hints: [
      tr(locale, "What is the probability of the outcome on one try?", "¿Cuál es la probabilidad del resultado en un solo intento?"),
      tr(locale, "Expected number = probability × number of tries.", "Número esperado = probabilidad × número de intentos."),
      `P = ${fav}/${N}`,
    ],
    steps: [`P = ${fav}/${N}`, `${fav}/${N} × ${T} = ${ans}`, tr(locale, `About ${ans} times`, `Aproximadamente ${ans} veces`)],
    seconds: 45,
  };
}

// ---------- m.area.composite ----------

/** Area in hundredths with π ≈ 3.14: 314 × r². */
const circ = (rad: number) => 314 * rad * rad;
/** The units that suit each composite shape (indexes into UNITS: 0 cm, 1 m, 2 in, 3 ft). */
const SHAPE_UNITS = [[2, 0], [3, 1], [3, 1], [3], [3, 1], [2, 0], [3, 1], [2, 0]];

function areaComposite(r: Rng, level: number, locale: Locale): ItemBody {
  const kind = level === 1 ? r.int(0, 2) : level === 2 ? r.int(3, 4) : r.int(5, 7);
  const u = UNITS[r.pick(SHAPE_UNITS[kind])];
  const ab = tr(locale, u.en, u.es), sq = tr(locale, u.sq[0], u.sq[1]);
  /** A length written ("8 ft") or spoken ("8 feet"). */
  const U = (n: number, sp: boolean) => `${n} ${sp ? tr(locale, n === 1 ? u.one[0] : u.word[0], n === 1 ? u.one[1] : u.word[1]) : ab}`;
  /** A side named by its length: "one 8-ft side" / "uno de los lados de 8 pies". */
  const side = (n: number, sp: boolean) => tr(locale, `one ${n}-${sp ? u.one[0] : ab} side`, `uno de los lados de ${U(n, sp)}`);
  const pi = tr(locale, "Use π ≈ 3.14.", "Usa π ≈ 3.14.");
  type Shape = { q: (sp: boolean) => string; ans: number; wrong: (Wrong | false)[]; hints: string[]; steps: string[] };
  let s: Shape;
  const A = (h: number) => dv(h, 2); // hundredths → value
  if (kind === 0) {
    // Picture frame: outer rectangle − picture.
    const wd = r.int(4, 14), h = r.int(4, 14), b = r.int(1, 3);
    const W = wd + 2 * b, H = h + 2 * b, ans = W * H - wd * h;
    s = {
      q: (sp) => tr(locale, `A painting is ${U(wd, sp)} by ${U(h, sp)}. It has a frame that is ${U(b, sp)} wide all the way around. What is the area of the frame alone, in ${sq}?`, `Una pintura mide ${U(wd, sp)} por ${U(h, sp)}. Tiene un marco de ${U(b, sp)} de ancho alrededor de toda la pintura. ¿Cuál es el área del marco solo, en ${sq}?`),
      ans: ans * 100,
      wrong: [w((wd + b) * (h + b) - wd * h, "added-the-border-to-one-side-only"), w(W * H, "forgot-to-subtract-the-inside")],
      hints: [
        tr(locale, "How long and how wide is the outside edge of the frame?", "¿Cuánto mide de largo y de ancho el borde exterior del marco?"),
        tr(locale, "Find the area of the outer rectangle, then subtract the area of the painting.", "Halla el área del rectángulo exterior y luego resta el área de la pintura."),
        tr(locale, `Outer rectangle: ${wd} + 2 × ${b} = ${W} by ${h} + 2 × ${b} = ${H}.`, `Rectángulo exterior: ${wd} + 2 × ${b} = ${W} por ${h} + 2 × ${b} = ${H}.`),
      ],
      steps: [`${W} × ${H} = ${W * H}`, `${wd} × ${h} = ${wd * h}`, `${W * H} − ${wd * h} = ${ans} ${ab}²`],
    };
  } else if (kind === 1) {
    // Lawn with a flower bed cut out.
    const L = r.int(10, 30), W = r.int(8, 20), a = r.int(2, Math.min(8, L - 2)), b = r.int(2, Math.min(6, W - 2));
    const ans = L * W - a * b;
    s = {
      q: (sp) => tr(locale, `A rectangular lawn is ${U(L, sp)} by ${U(W, sp)}. A rectangular flower bed ${U(a, sp)} by ${U(b, sp)} sits inside it. What is the area of the grass, in ${sq}?`, `Un jardín rectangular de pasto mide ${U(L, sp)} por ${U(W, sp)}. Dentro hay un macizo de flores rectangular de ${U(a, sp)} por ${U(b, sp)}. ¿Cuál es el área del pasto, en ${sq}?`),
      ans: ans * 100,
      wrong: [w(L * W + a * b, "added-the-cut-out"), w(L * W, "forgot-to-subtract-the-inside")],
      hints: [
        tr(locale, "The grass is the whole lawn except the flower bed.", "El pasto es todo el jardín menos el macizo de flores."),
        tr(locale, "Find the area of the lawn, then subtract the area of the flower bed.", "Halla el área del jardín y luego resta el área del macizo de flores."),
        tr(locale, `Lawn: ${L} × ${W} = ${L * W}.`, `Jardín: ${L} × ${W} = ${L * W}.`),
      ],
      steps: [`${L} × ${W} = ${L * W}`, `${a} × ${b} = ${a * b}`, `${L * W} − ${a * b} = ${ans} ${ab}²`],
    };
  } else if (kind === 2) {
    // A rectangle with a right triangle on one side.
    const wd = r.int(4, 14);
    let h = r.int(3, 10), t = r.int(2, 8);
    while (h === wd) h = r.int(3, 10);
    if ((h * t) % 2) t = t === 8 ? 6 : t + 1;
    const R = wd * h, T = (h * t) / 2;
    s = {
      q: (sp) =>
        tr(
          locale,
          `A patio is made of a rectangle ${U(wd, sp)} long and ${U(h, sp)} wide, and a right triangle attached to ${side(h, sp)}. The triangle's legs are ${U(h, sp)} and ${U(t, sp)}. What is the area of the patio, in ${sq}?`,
          `Un patio está formado por un rectángulo de ${U(wd, sp)} de largo y ${U(h, sp)} de ancho, y un triángulo rectángulo unido a ${side(h, sp)}. Los catetos del triángulo miden ${U(h, sp)} y ${U(t, sp)}. ¿Cuál es el área del patio, en ${sq}?`,
        ),
      ans: (R + T) * 100,
      wrong: [w(R + h * t, "forgot-to-halve-the-triangle"), w(R, "left-out-the-triangle")],
      hints: [
        tr(locale, "Split the patio into a rectangle and a triangle.", "Divide el patio en un rectángulo y un triángulo."),
        tr(locale, "Find each area, then add them. Triangle area = 1/2 × leg × leg.", "Halla cada área y luego súmalas. Área del triángulo = 1/2 × cateto × cateto."),
        tr(locale, `Rectangle: ${wd} × ${h} = ${R}.`, `Rectángulo: ${wd} × ${h} = ${R}.`),
      ],
      steps: [tr(locale, `Rectangle: ${wd} × ${h} = ${R}`, `Rectángulo: ${wd} × ${h} = ${R}`), tr(locale, `Triangle: 1/2 × ${h} × ${t} = ${T}`, `Triángulo: 1/2 × ${h} × ${t} = ${T}`), `${R} + ${T} = ${R + T} ${ab}²`],
    };
  } else if (kind === 3) {
    // Window: a rectangle with a half circle on top.
    const rad = r.int(1, 4), wd = 2 * rad, h = r.int(2, 6);
    const R = wd * h * 100, half = circ(rad) / 2;
    s = {
      q: (sp) => `${tr(locale, `A window is a rectangle ${U(wd, sp)} wide and ${U(h, sp)} tall with a half circle on top. The half circle's diameter is the top of the rectangle. What is the area of the window, in ${sq}?`, `Una ventana es un rectángulo de ${U(wd, sp)} de ancho y ${U(h, sp)} de alto con un semicírculo encima. El diámetro del semicírculo es el lado de arriba del rectángulo. ¿Cuál es el área de la ventana, en ${sq}?`)} ${pi}`,
      ans: R + half,
      wrong: [w(A(R + circ(rad)), "used-a-whole-circle"), w(A(R + circ(wd) / 2), "used-the-diameter-as-the-radius")],
      hints: [
        tr(locale, "Split the window into a rectangle and a half circle.", "Divide la ventana en un rectángulo y un semicírculo."),
        tr(locale, "Half circle area = 1/2 × π × r × r. The radius is half the diameter.", "Área del semicírculo = 1/2 × π × r × r. El radio es la mitad del diámetro."),
        tr(locale, `Rectangle: ${wd} × ${h} = ${wd * h}.`, `Rectángulo: ${wd} × ${h} = ${wd * h}.`),
      ],
      steps: [`${wd} × ${h} = ${wd * h}`, `r = ${rad}: 1/2 × 3.14 × ${rad} × ${rad} = ${showD(A(half))}`, `${wd * h} + ${showD(A(half))} = ${showD(A(R + half))} ${ab}²`],
    };
  } else if (kind === 4) {
    // A field: a rectangle with a half circle on each short end.
    const rad = r.int(2, 8), wd = 2 * rad, L = r.int(wd + 2, 30);
    const R = L * wd * 100;
    s = {
      q: (sp) => `${tr(locale, `A field is shaped like a rectangle ${U(L, sp)} long and ${U(wd, sp)} wide, with a half circle on each ${wd}-${sp ? u.one[0] : ab} end. What is the area of the field, in ${sq}?`, `Un campo tiene forma de rectángulo de ${U(L, sp)} de largo y ${U(wd, sp)} de ancho, con un semicírculo en cada extremo de ${U(wd, sp)}. ¿Cuál es el área del campo, en ${sq}?`)} ${pi}`,
      ans: R + circ(rad),
      wrong: [w(A(R + circ(rad) / 2), "counted-only-one-half-circle"), w(A(R + circ(wd)), "used-the-diameter-as-the-radius")],
      hints: [
        tr(locale, "The two half circles together make one whole circle.", "Los dos semicírculos juntos forman un círculo completo."),
        tr(locale, "Area = rectangle + one circle whose radius is half the width.", "Área = rectángulo + un círculo cuyo radio es la mitad del ancho."),
        tr(locale, `Rectangle: ${L} × ${wd} = ${L * wd}.`, `Rectángulo: ${L} × ${wd} = ${L * wd}.`),
      ],
      steps: [`${L} × ${wd} = ${L * wd}`, `3.14 × ${rad} × ${rad} = ${showD(A(circ(rad)))}`, `${L * wd} + ${showD(A(circ(rad)))} = ${showD(A(R + circ(rad)))} ${ab}²`],
    };
  } else if (kind === 5) {
    // A square tile with the largest circle that fits painted on it.
    const rad = r.int(2, 10), sideLen = 2 * rad;
    const S = sideLen * sideLen * 100;
    s = {
      q: (sp) => `${tr(locale, `A square tile is ${U(sideLen, sp)} on each side. A circle that touches all four sides is painted on it. What is the area of the tile outside the circle, in ${sq}?`, `Un azulejo cuadrado mide ${U(sideLen, sp)} de lado. Tiene pintado un círculo que toca los cuatro lados. ¿Cuál es el área del azulejo fuera del círculo, en ${sq}?`)} ${pi}`,
      ans: S - circ(rad),
      wrong: [w(A(S + circ(rad)), "added-instead-of-subtracting"), w(A(circ(rad)), "found-only-the-circle")],
      hints: [
        tr(locale, "The part outside the circle is the square minus the circle.", "La parte fuera del círculo es el cuadrado menos el círculo."),
        tr(locale, `The circle touches all four sides, so its diameter is ${sideLen} ${ab} and its radius is half of that.`, `El círculo toca los cuatro lados, así que su diámetro mide ${sideLen} ${ab} y su radio es la mitad.`),
        tr(locale, `Square: ${sideLen} × ${sideLen} = ${sideLen * sideLen}.`, `Cuadrado: ${sideLen} × ${sideLen} = ${sideLen * sideLen}.`),
      ],
      steps: [`${sideLen} × ${sideLen} = ${sideLen * sideLen}`, `r = ${rad}: 3.14 × ${rad} × ${rad} = ${showD(A(circ(rad)))}`, `${sideLen * sideLen} − ${showD(A(circ(rad)))} = ${showD(A(S - circ(rad)))} ${ab}²`],
    };
  } else if (kind === 6) {
    // A ring: a circular garden around a pond.
    const R = r.int(4, 12), rad = r.int(1, R - 2);
    s = {
      q: (sp) => `${tr(locale, `A garden is a circle with a radius of ${U(R, sp)}. A circular pond with a radius of ${U(rad, sp)} is in the middle. What is the area of the garden around the pond, in ${sq}?`, `Un jardín es un círculo con un radio de ${U(R, sp)}. En el centro hay un estanque circular con un radio de ${U(rad, sp)}. ¿Cuál es el área del jardín alrededor del estanque, en ${sq}?`)} ${pi}`,
      ans: circ(R) - circ(rad),
      wrong: [w(A(circ(R - rad)), "subtracted-the-radii-first"), w(A(circ(R)), "forgot-to-subtract-the-inside")],
      hints: [
        tr(locale, "The garden around the pond is the big circle minus the small one.", "El jardín alrededor del estanque es el círculo grande menos el pequeño."),
        tr(locale, "Find the area of each circle with A = π × r × r, then subtract.", "Halla el área de cada círculo con A = π × r × r y luego resta."),
        tr(locale, `Big circle: 3.14 × ${R} × ${R} = ${showD(A(circ(R)))}.`, `Círculo grande: 3.14 × ${R} × ${R} = ${showD(A(circ(R)))}.`),
      ],
      steps: [`3.14 × ${R} × ${R} = ${showD(A(circ(R)))}`, `3.14 × ${rad} × ${rad} = ${showD(A(circ(rad)))}`, `${showD(A(circ(R)))} − ${showD(A(circ(rad)))} = ${showD(A(circ(R) - circ(rad)))} ${ab}²`],
    };
  } else {
    // A board with a half circle cut out of one long side.
    const rad = r.int(2, 6), d = 2 * rad, L = r.int(d + 2, 24), W = r.int(rad + 1, 14);
    const R = L * W * 100, half = circ(rad) / 2;
    s = {
      q: (sp) => `${tr(locale, `A wooden board is ${U(L, sp)} by ${U(W, sp)}. A half circle with a diameter of ${U(d, sp)} is cut out of ${side(L, sp)}. What is the area of the board that is left, in ${sq}?`, `Una tabla de madera mide ${U(L, sp)} por ${U(W, sp)}. Se le corta un semicírculo de ${U(d, sp)} de diámetro en ${side(L, sp)}. ¿Cuál es el área de la tabla que queda, en ${sq}?`)} ${pi}`,
      ans: R - half,
      wrong: [R - circ(rad) > 0 && w(A(R - circ(rad)), "used-a-whole-circle"), R - circ(d) / 2 > 0 && w(A(R - circ(d) / 2), "used-the-diameter-as-the-radius"), w(A(R + half), "added-instead-of-subtracting")],
      hints: [
        tr(locale, "The board that is left is the rectangle minus the half circle.", "La tabla que queda es el rectángulo menos el semicírculo."),
        tr(locale, "Half circle area = 1/2 × π × r × r, and the radius is half the diameter.", "Área del semicírculo = 1/2 × π × r × r, y el radio es la mitad del diámetro."),
        tr(locale, `Rectangle: ${L} × ${W} = ${L * W}.`, `Rectángulo: ${L} × ${W} = ${L * W}.`),
      ],
      steps: [`${L} × ${W} = ${L * W}`, `r = ${rad}: 1/2 × 3.14 × ${rad} × ${rad} = ${showD(A(half))}`, `${L * W} − ${showD(A(half))} = ${showD(A(R - half))} ${ab}²`],
    };
  }
  const answer: Answer = kind >= 3 ? { kind: "number", value: A(s.ans), tolerance: 0.05 } : { kind: "number", value: A(s.ans) };
  return {
    prompt: [s.q(false)],
    say: speak(s.q(true), locale),
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongFor(answer, s.wrong),
    hints: s.hints,
    steps: s.steps,
    seconds: kind >= 3 ? 75 : 55,
  };
}

// ---------- the strand ----------

export const MATH_6_7_MORE: Skill[] = [
  {
    id: "m.dec.ops", subject: "math", grade: "6", title: { en: "Add, subtract, multiply and divide decimals", es: "Sumar, restar, multiplicar y dividir decimales" },
    standard: "6.NS.B.3", prereqs: ["m.dec.addsub", "m.dec.mult", "m.div.long"], content: "computed", levels: 3, generate: decOps,
  },
  {
    id: "m.rational.order", subject: "math", grade: "6", title: { en: "Compare and order rational numbers", es: "Comparar y ordenar números racionales" },
    standard: "6.NS.C.7", prereqs: ["m.int.numberline", "m.frac.compare", "m.dec.tenths"], content: "computed", levels: 3, generate: ratOrderSkill,
  },
  {
    id: "m.coord.plane", subject: "math", grade: "6", title: { en: "The coordinate plane", es: "El plano de coordenadas" },
    standard: "6.NS.C.8", prereqs: ["m.int.numberline"], content: "computed", levels: 3, generate: coordPlane,
  },
  {
    id: "m.expr.write", subject: "math", grade: "6", title: { en: "Write expressions from words", es: "Escribir expresiones a partir de palabras" },
    standard: "6.EE.A.2a", prereqs: ["m.expr.eval"], content: "computed", levels: 3, generate: exprWrite,
  },
  {
    id: "m.expr.equiv", subject: "math", grade: "6", title: { en: "Equivalent expressions", es: "Expresiones equivalentes" },
    standard: "6.EE.A.3", prereqs: ["m.expr.eval", "m.gcf.lcm"], content: "computed", levels: 3, generate: exprEquiv,
  },
  {
    id: "m.ineq.graph", subject: "math", grade: "6", title: { en: "Inequalities on the number line", es: "Desigualdades en la recta numérica" },
    standard: "6.EE.B.8", prereqs: ["m.int.numberline", "m.expr.write"], content: "computed", levels: 3, generate: ineqGraph,
  },
  {
    id: "m.percent.whole", subject: "math", grade: "6", title: { en: "Percent problems: part and whole", es: "Problemas de porcentaje: parte y total" },
    standard: "6.RP.A.3c", prereqs: ["m.percent"], content: "computed", levels: 3, generate: percentWhole,
  },
  {
    id: "m.stats.center", subject: "math", grade: "6", title: { en: "Mean, median, mode and range", es: "Media, mediana, moda y rango" },
    standard: "6.SP.B.5c", prereqs: ["m.div.long", "m.dec.ops"], content: "computed", levels: 3, generate: statsCenter,
  },
  {
    id: "m.volume.frac", subject: "math", grade: "6", title: { en: "Volume with fractional edges", es: "Volumen con aristas fraccionarias" },
    standard: "6.G.A.2", prereqs: ["m.volume", "m.frac.mult"], content: "computed", levels: 2, generate: volumeFrac,
  },
  {
    id: "m.surface.area", subject: "math", grade: "6", title: { en: "Surface area from nets", es: "Área de superficie con redes" },
    standard: "6.G.A.4", prereqs: ["m.area.poly"], content: "computed", levels: 3, generate: surfaceArea,
  },
  {
    id: "m.rational.addsub", subject: "math", grade: "7", title: { en: "Add and subtract rational numbers", es: "Sumar y restar números racionales" },
    standard: "7.NS.A.1d", prereqs: ["m.int.addsub", "m.frac.addunlike", "m.dec.ops"], content: "computed", levels: 3, generate: ratAddSub,
  },
  {
    id: "m.rational.multdiv", subject: "math", grade: "7", title: { en: "Multiply and divide rational numbers", es: "Multiplicar y dividir números racionales" },
    standard: "7.NS.A.2c", prereqs: ["m.int.multdiv", "m.frac.div", "m.dec.ops"], content: "computed", levels: 3, generate: ratMultDiv,
  },
  {
    id: "m.prop.constant", subject: "math", grade: "7", title: { en: "Constant of proportionality", es: "Constante de proporcionalidad" },
    standard: "7.RP.A.2b", prereqs: ["m.ratio.unit", "m.proportion"], content: "computed", levels: 3, generate: propConstant,
  },
  {
    id: "m.interest.simple", subject: "math", grade: "7", title: { en: "Simple interest", es: "Interés simple" },
    standard: "7.RP.A.3", prereqs: ["m.percent.change"], content: "computed", levels: 2, generate: interestSimple,
  },
  {
    id: "m.scale.drawing", subject: "math", grade: "7", title: { en: "Scale drawings", es: "Dibujos a escala" },
    standard: "7.G.A.1", prereqs: ["m.proportion"], content: "computed", levels: 3, generate: scaleDrawing,
  },
  {
    id: "m.angles.pairs", subject: "math", grade: "7", title: { en: "Complementary, supplementary and vertical angles", es: "Ángulos complementarios, suplementarios y opuestos por el vértice" },
    standard: "7.G.B.5", prereqs: ["m.eq.twostep"], content: "computed", levels: 3, generate: anglesPairs,
  },
  {
    id: "m.ineq.twostep", subject: "math", grade: "7", title: { en: "Two-step inequalities", es: "Desigualdades de dos pasos" },
    standard: "7.EE.B.4b", prereqs: ["m.ineq.onestep", "m.eq.twostep"], content: "computed", levels: 3, generate: ineqTwoStep,
  },
  {
    id: "m.prob.simple", subject: "math", grade: "7", title: { en: "Probability of simple events", es: "Probabilidad de eventos simples" },
    standard: "7.SP.C.7a", prereqs: ["m.ratio.equiv"], content: "computed", levels: 3, generate: probSimple,
  },
  {
    id: "m.area.composite", subject: "math", grade: "7", title: { en: "Area of composite figures", es: "Área de figuras compuestas" },
    standard: "7.G.B.6", prereqs: ["m.area.poly", "m.circle"], content: "computed", levels: 3, generate: areaComposite,
  },
];
