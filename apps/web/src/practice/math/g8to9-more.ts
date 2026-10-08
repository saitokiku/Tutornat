import type { Locale } from "@/lib/types";
import { check } from "../answer";
import { gcd, lcm, type Rng } from "../rng";
import { sayFrac, sayNum, show, tr } from "../text";
import type { Answer, Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 8–9, second strand. Grade 8: rational and irrational numbers, estimating roots, transformations,
// triangle angles, volume of round solids, functions, comparing linear functions, lines of best fit, and
// equations with no or many solutions. Grade 9: absolute value, standard form, elimination, domain and range,
// average rate of change, sequences, exponential models, radicals, the vertex and the quadratic formula.
// Every problem is built backward from an exact answer (integers, or whole hundredths for decimals), and
// every wrong choice or likely wrong value names the mistake it stands for.

const NAMES = ["Maya", "Diego", "Aisha", "Kenji", "Priya", "Luis", "Amara", "Sofía", "Noah", "Mei", "Omar", "Grace", "Tomás", "Zoe", "Ravi", "Lena", "Kwame", "Yuki", "Fatima", "Mateo"];

const SUPS: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "−": "⁻", "+": "⁺" };
/** Superscript text for hints, steps and choices: sup(-3) → "⁻³". */
const sup = (e: number | string) => String(e).replace(/[-−+\d]/g, (c) => SUPS[c]);
/** After an operation sign a negative number goes in parentheses: 5 − (−3). */
const par = (n: number) => (n < 0 ? `(${show(n)})` : String(n));
/** A nonzero integer in [lo, hi]. */
const nz = (r: Rng, lo: number, hi: number) => {
  let n = 0;
  while (n === 0) n = r.int(lo, hi);
  return n;
};
const reduce = (n: number, d: number): [number, number] => {
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return [(s * n) / g, (s * d) / g];
};
/** A reduced fraction for display: −3/2, or a whole number. */
const fracShow = (n: number, d: number) => {
  const [a, b] = reduce(n, d);
  return b === 1 ? show(a) : `${show(a)}/${b}`;
};
/** A reduced fraction as a learner types it: "-3/2". */
const fracTyped = (n: number, d: number) => {
  const [a, b] = reduce(n, d);
  return b === 1 ? String(a) : `${a}/${b}`;
};
const pt = (x: number, y: number) => `(${show(x)}, ${show(y)})`;
const ptTyped = (x: number, y: number) => `(${x}, ${y})`;
const sayPt = (x: number, y: number, l: Locale) => `${sayNum(x, l)}, ${sayNum(y, l)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Exact decimal text of n ÷ 10^k without trailing zeros: dec(40192) → "401.92", dec(-25, 1) → "−2.5". */
function dec(n: number, k = 2): string {
  const s = String(Math.abs(n)).padStart(k + 1, "0");
  const fp = s.slice(s.length - k).replace(/0+$/, "");
  const ip = s.slice(0, s.length - k);
  return `${n < 0 ? "−" : ""}${ip}${fp ? `.${fp}` : ""}`;
}
/** The same number as typed on a keypad: "-2.5". */
const decTyped = (n: number, k = 2) => dec(n, k).replace("−", "-");

/** Up to four distinct choices, the right one in a random place. */
function choose(r: Rng, right: Choice, wrong: Choice[]): Pick<ItemBody, "choices" | "input" | "answer"> {
  const list = [right];
  for (const w of wrong) if (list.length < 4 && !list.some((c) => c.label === w.label)) list.push(w);
  const choices = r.shuffle(list);
  return { choices, input: "choices", answer: { kind: "choice", index: choices.indexOf(right) } };
}

/** Likely wrong typed answers, each with its misconception; never one the checker would accept. */
function wrongs(answer: Answer, list: [value: string, why: string][]): { value: string; why: string }[] {
  const out: { value: string; why: string }[] = [];
  for (const [value, why] of list) if (!check(answer, value).correct && !out.some((w) => w.value === value)) out.push({ value, why });
  return out;
}

function sayPow(base: string, e: number, locale: Locale) {
  if (e === 2) return tr(locale, `${base} squared`, `${base} al cuadrado`);
  if (e === 3) return tr(locale, `${base} cubed`, `${base} al cubo`);
  return tr(locale, `${base} to the power of ${sayNum(e, "en")}`, `${base} elevado a la ${sayNum(e, "es")}`);
}

// Terms are [coefficient, variable ("" for a number), power]. One formatter serves prompts, hints,
// typed answer keys and read-aloud so they never disagree.
type Term = [coef: number, v: string, p: number];

/** "3x² − 5x + 2" for display, or "3x^2-5x+2" (ascii) for an answer key. */
function fmt(ts: Term[], ascii = false): string {
  const t = ts.filter(([c]) => c !== 0);
  if (!t.length) return "0";
  return t
    .map(([c, v, p], i) => {
      const mag = Math.abs(c);
      const body = (v && mag === 1 ? "" : String(mag)) + (v ? v + (p >= 2 ? (ascii ? `^${p}` : sup(p)) : "") : "");
      if (ascii) return (c < 0 ? "-" : i ? "+" : "") + body;
      return (i ? (c < 0 ? " − " : " + ") : c < 0 ? "−" : "") + body;
    })
    .join("");
}

/** "3 x squared minus 5 x plus 2". */
function sayTerms(ts: Term[], locale: Locale): string {
  const t = ts.filter(([c]) => c !== 0);
  if (!t.length) return "0";
  return t
    .map(([c, v, p], i) => {
      const mag = Math.abs(c);
      const sign = c < 0 ? tr(locale, "minus ", "menos ") : i ? tr(locale, "plus ", "más ") : "";
      const num = v && mag === 1 ? "" : `${mag}${v ? " " : ""}`;
      return sign + num + (v ? (p >= 2 ? sayPow(v, p, locale) : v) : "");
    })
    .join(" ");
}

const lin = (m: number, b: number, v = "x") => fmt([[m, v, 1], [b, "", 0]]);
const sayLin = (m: number, b: number, locale: Locale, v = "x") => sayTerms([[m, v, 1], [b, "", 0]], locale);
/** A sentence read aloud: degrees, angle names and the true minus sign in words. */
const spoken = (s: string, locale: Locale) =>
  s
    .replace(/∠([A-Z]+)/g, (_, n: string) => `${tr(locale, "angle", "el ángulo")} ${n.split("").join(" ")}`)
    .replace(/°/g, tr(locale, " degrees", " grados"))
    .replace(/−(\d)/g, `${tr(locale, "minus", "menos")} $1`)
    .replace(/ − /g, ` ${tr(locale, "minus", "menos")} `)
    .replace(/ \+ /g, ` ${tr(locale, "plus", "más")} `)
    .replace(/ = /g, ` ${tr(locale, "equals", "es igual a")} `)
    .replace(/(\d)([a-z])\b/g, "$1 $2")
    .replace(/[()]/g, "");

// ---------------------------------------------------------------- irrational numbers and roots

type Num = { label: string; say: (l: Locale) => string; why: string; explain: (l: Locale) => string };

const RATIONAL_KINDS = ["square", "fraction", "repeating", "terminating"] as const;

function rationalNum(r: Rng, kind: (typeof RATIONAL_KINDS)[number]): Num {
  if (kind === "square") {
    const k = r.int(2, 12), n = k * k;
    return {
      label: `√${n}`,
      say: (l) => tr(l, `the square root of ${n}`, `la raíz cuadrada de ${n}`),
      why: "thought-every-root-irrational",
      explain: (l) => tr(l, `√${n} = ${k}, a whole number, so it is rational.`, `√${n} = ${k}, un número entero, así que es racional.`),
    };
  }
  if (kind === "fraction") {
    const d = r.pick([3, 7, 9, 11, 13]);
    let n = r.int(1, d - 1);
    while (gcd(n, d) !== 1) n = r.int(1, d - 1);
    return {
      label: `${n}/${d}`,
      say: (l) => sayFrac(n, d, l),
      why: "thought-fractions-irrational",
      explain: (l) => tr(l, `${n}/${d} is a fraction of two integers, so it is rational.`, `${n}/${d} es una fracción de dos enteros, así que es racional.`),
    };
  }
  if (kind === "repeating") {
    const two = r.bool(0.6);
    // 0.999… is 1, a true but distracting fact, so a single repeating digit stops at 8.
    const a = r.int(1, two ? 9 : 8);
    let b = r.int(0, 9);
    while (two && a === b) b = r.int(0, 9);
    const block = two ? `${a}${b}` : `${a}`;
    const [n, d] = reduce(two ? 10 * a + b : a, two ? 99 : 9);
    const label = `0.${block.repeat(two ? 3 : 4)}…`;
    const digits = block.split("").join(" ");
    return {
      label,
      say: (l) => tr(l, `0 point ${digits}, with ${digits} repeating forever`, `0 punto ${digits}, con ${digits} repitiéndose sin fin`),
      why: "thought-repeating-decimal-irrational",
      explain: (l) => tr(l, `${label} repeats, so it is rational: it equals ${n}/${d}.`, `${label} se repite, así que es racional: es igual a ${n}/${d}.`),
    };
  }
  let k = r.int(101, 999);
  if (k % 10 === 0) k += 1;
  const w = r.int(0, 3);
  const label = dec(w * 1000 + k, 3);
  const [ip, fp] = label.split(".");
  return {
    label,
    say: (l) => `${ip} ${tr(l, "point", "punto")} ${fp.split("").join(" ")}`,
    why: "thought-decimals-irrational",
    explain: (l) => tr(l, `${label} ends, so it is rational: it equals ${w * 1000 + k}/1000.`, `${label} termina, así que es racional: es igual a ${w * 1000 + k}/1000.`),
  };
}

const isSquare = (n: number) => Number.isInteger(Math.sqrt(n));

function irrationalNums(r: Rng): Num[] {
  let n = 0, m = 0;
  do {
    n = r.int(2, 99);
    m = r.int(2, 30);
  } while (isSquare(n) || isSquare(m) || n === m);
  const a = r.int(1, 9);
  const floorRoot = (v: number) => Math.floor(Math.sqrt(v));
  const f = floorRoot(n);
  return [
    {
      label: `√${n}`,
      say: (l) => tr(l, `the square root of ${n}`, `la raíz cuadrada de ${n}`),
      why: "thought-every-root-rational",
      explain: (l) =>
        tr(l, `${f}² = ${f * f} and ${f + 1}² = ${(f + 1) ** 2}, so ${n} is not a perfect square and √${n} is irrational.`, `${f}² = ${f * f} y ${f + 1}² = ${(f + 1) ** 2}, así que ${n} no es un cuadrado perfecto y √${n} es irracional.`),
    },
    {
      label: "π",
      say: (l) => tr(l, "pi", "pi"),
      why: "thought-pi-is-rational",
      explain: (l) => tr(l, "π has a decimal that never ends and never repeats, so it is irrational. 3.14 is only an estimate.", "π tiene un decimal que nunca termina ni se repite, así que es irracional. 3.14 es solo una aproximación."),
    },
    {
      label: `${a} + √${m}`,
      say: (l) => tr(l, `${a} plus the square root of ${m}`, `${a} más la raíz cuadrada de ${m}`),
      why: "thought-every-root-rational",
      explain: (l) => tr(l, `√${m} is irrational, and a whole number plus an irrational number is irrational, so ${a} + √${m} is irrational.`, `√${m} es irracional, y un entero más un número irracional es irracional, así que ${a} + √${m} es irracional.`),
    },
  ];
}

function irrationalL1(r: Rng, locale: Locale): ItemBody {
  const findIrrational = r.bool();
  const irr = r.shuffle(irrationalNums(r));
  const kinds = r.shuffle(RATIONAL_KINDS);
  const rat = kinds.map((k) => rationalNum(r, k));
  const right = findIrrational ? irr[0] : rat[0];
  const wrong = findIrrational ? rat.slice(0, 3) : irr;
  const asChoice = (n: Num, isRight: boolean): Choice => ({ label: n.label, say: n.say(locale), ...(isRight ? {} : { why: n.why }) });
  const rightChoice = asChoice(right, true);
  const picked = choose(r, rightChoice, wrong.map((n) => asChoice(n, false)));
  const verdict = findIrrational ? tr(locale, `${right.label} is the irrational number.`, `${right.label} es el número irracional.`) : tr(locale, `${right.label} is the rational number.`, `${right.label} es el número racional.`);
  return {
    prompt: [findIrrational ? tr(locale, "Which number is irrational?", "¿Qué número es irracional?") : tr(locale, "Which number is rational?", "¿Qué número es racional?")],
    say: findIrrational ? tr(locale, "Which of these numbers is irrational?", "¿Cuál de estos números es irracional?") : tr(locale, "Which of these numbers is rational?", "¿Cuál de estos números es racional?"),
    ...picked,
    hints: [
      tr(locale, "A rational number can be written as a fraction of two integers. Its decimal either ends or repeats.", "Un número racional se puede escribir como fracción de dos enteros. Su decimal termina o se repite."),
      tr(locale, "Check each choice: is it a fraction, a decimal that ends or repeats, or the square root of a perfect square?", "Revisa cada opción: ¿es una fracción, un decimal que termina o se repite, o la raíz cuadrada de un cuadrado perfecto?"),
      wrong[0].explain(locale),
    ],
    steps: [...wrong.slice(0, 2).map((n) => n.explain(locale)), right.explain(locale), verdict],
    seconds: 25,
  };
}

function rootBetween(r: Rng, locale: Locale): ItemBody {
  const k = r.int(1, 11);
  const n = r.int(k * k + 1, (k + 1) ** 2 - 1);
  const span = (a: number): Choice => ({ label: `${a} < √${n} < ${a + 1}`, say: tr(locale, `between ${a} and ${a + 1}`, `entre ${a} y ${a + 1}`) });
  const right = span(k);
  const half = Math.floor(n / 2);
  const wrong: Choice[] = [];
  if (half > k + 2) wrong.push({ ...span(half), why: "halved-instead-of-root" });
  wrong.push({ ...span(k + 1), why: "used-wrong-perfect-squares" }, { ...span(k - 1), why: "used-wrong-perfect-squares" }, { ...span(k + 2), why: "used-wrong-perfect-squares" });
  return {
    prompt: [tr(locale, `Between which two whole numbers is √${n}?`, `¿Entre qué dos números enteros está √${n}?`)],
    say: tr(locale, `Between which two whole numbers is the square root of ${n}?`, `¿Entre qué dos números enteros está la raíz cuadrada de ${n}?`),
    ...choose(r, right, wrong),
    hints: [
      tr(locale, `Which perfect squares are closest to ${n}, one below it and one above it?`, `¿Qué cuadrados perfectos están más cerca de ${n}, uno por debajo y otro por encima?`),
      tr(locale, "If a < n < b, then √a < √n < √b. The square root of a perfect square is a whole number.", "Si a < n < b, entonces √a < √n < √b. La raíz cuadrada de un cuadrado perfecto es un número entero."),
      tr(locale, `${k}² = ${k * k}, which is less than ${n}.`, `${k}² = ${k * k}, que es menor que ${n}.`),
    ],
    steps: [tr(locale, `${k}² = ${k * k} and ${k + 1}² = ${(k + 1) ** 2}`, `${k}² = ${k * k} y ${k + 1}² = ${(k + 1) ** 2}`), `${k * k} < ${n} < ${(k + 1) ** 2}`, right.label],
    seconds: 20,
  };
}

function rootTenth(r: Rng, locale: Locale): ItemBody {
  let k = 0, n = 0, A = 0, t = 0;
  do {
    k = r.int(1, 9);
    n = r.int(k * k + 1, (k + 1) ** 2 - 1);
    // A is the tenths just below √n: A² ≤ 100n < (A + 1)², found with whole numbers only.
    A = Math.floor(Math.sqrt(100 * n));
    while ((A + 1) ** 2 <= 100 * n) A++;
    while (A * A > 100 * n) A--;
    // 100n − A² and (A + 1)² − 100n are never equal (their sum is odd), so one tenth is strictly closer.
    t = 100 * n - A * A < (A + 1) ** 2 - 100 * n ? A : A + 1;
  } while (t % 10 === 0);
  const low = dec(A, 1), high = dec(A + 1, 1);
  const lowSq = dec(A * A, 2), highSq = dec((A + 1) ** 2, 2);
  const answer: Answer = { kind: "number", value: t / 10 };
  const d = n - k * k;
  return {
    prompt: [tr(locale, `√${n} is between ${k} and ${k + 1}. Tap where it goes on the number line, to the nearest tenth.`, `√${n} está entre ${k} y ${k + 1}. Toca dónde va en la recta numérica, a la décima más cercana.`)],
    say: tr(locale, `The square root of ${n} is between ${k} and ${k + 1}. Tap where it goes on the number line, to the nearest tenth.`, `La raíz cuadrada de ${n} está entre ${k} y ${k + 1}. Toca dónde va en la recta numérica, a la décima más cercana.`),
    // The pad is the line from k to k + 1 in tenths; it sends the tapped point as "7.2".
    input: "number-line",
    pad: { kind: "number-line", min: k, max: k + 1, step: 0.1 },
    answer,
    wrong: wrongs(answer, [
      [decTyped(t === A ? A + 1 : A, 1), "rounded-to-wrong-tenth"],
      ...(d <= 9 ? [[decTyped(10 * k + d, 1), "used-difference-as-tenths"] as [string, string]] : []),
    ]),
    hints: [
      tr(locale, `${k}² = ${k * k} and ${k + 1}² = ${(k + 1) ** 2}. Is ${n} nearer the start or the end of that gap?`, `${k}² = ${k * k} y ${k + 1}² = ${(k + 1) ** 2}. ¿${n} está más cerca del principio o del final de ese tramo?`),
      tr(locale, `Square tenths such as ${k}.1, ${k}.2 and so on until you pass ${n}. Then pick the tenth whose square is closer to ${n}.`, `Eleva al cuadrado décimas como ${k}.1, ${k}.2 y así hasta pasar ${n}. Luego elige la décima cuyo cuadrado está más cerca de ${n}.`),
      // When the tenth below √n is k itself, hint 1 has already squared k, so the last hint squares k.1.
      A % 10 === 0
        ? tr(locale, `${high}² = ${highSq}, which is more than ${n}.`, `${high}² = ${highSq}, que es mayor que ${n}.`)
        : tr(locale, `${low}² = ${lowSq}, which is less than ${n}.`, `${low}² = ${lowSq}, que es menor que ${n}.`),
    ],
    steps: [
      tr(locale, `${low}² = ${lowSq} and ${high}² = ${highSq}`, `${low}² = ${lowSq} y ${high}² = ${highSq}`),
      `${n} − ${lowSq} = ${dec(100 * n - A * A, 2)};   ${highSq} − ${n} = ${dec((A + 1) ** 2 - 100 * n, 2)}`,
      tr(locale, `${n} is closer to ${dec(t * t, 2)}, so √${n} ≈ ${dec(t, 1)}`, `${n} está más cerca de ${dec(t * t, 2)}, así que √${n} ≈ ${dec(t, 1)}`),
    ],
    seconds: 45,
  };
}

// ---------------------------------------------------------------- transformations

type Move = "translate" | "refl-x" | "refl-y" | "ccw" | "cw" | "half";

function transform(r: Rng, level: number, locale: Locale): ItemBody {
  let x = 0, y = 0;
  // Nonzero coordinates of different sizes, so a swap or a sign slip always lands somewhere else.
  do {
    x = nz(r, -6, 6);
    y = nz(r, -6, 6);
  } while (Math.abs(x) === Math.abs(y));
  const P = r.pick(["A", "B", "P", "Q", "K"]);
  const move: Move = level === 1 ? r.pick<Move>(["translate", "translate", "refl-x", "refl-y"]) : r.pick<Move>(["ccw", "cw", "half"]);
  const visual = { kind: "coord" as const, points: [[x, y]] as [number, number][] };
  const alt = tr(locale, `A coordinate grid with point ${P} at ${pt(x, y)}.`, `Un plano de coordenadas con el punto ${P} en ${pt(x, y)}.`);
  const ask = tr(locale, "Write its image as (x, y).", "Escribe su imagen como (x, y).");
  const askSaid = tr(locale, "Write its image as the ordered pair x, y.", "Escribe su imagen como el par ordenado x, y.");
  const common = { visual, alt, input: "text" as const, seconds: level === 1 ? 25 : 35 };

  if (move === "translate") {
    let a = 0, b = 0;
    do {
      a = nz(r, -6, 6);
      b = nz(r, -6, 6);
    } while (Math.abs(x + a) > 9 || Math.abs(y + b) > 9 || a === b || x + a === 0 || y + b === 0);
    const [ax, ay] = [x + a, y + b];
    const units = (n: number, l: Locale) => tr(l, `${Math.abs(n)} ${Math.abs(n) === 1 ? "unit" : "units"}`, `${Math.abs(n)} ${Math.abs(n) === 1 ? "unidad" : "unidades"}`);
    const how = (l: Locale) =>
      tr(l, `${units(a, l)} ${a > 0 ? "right" : "left"} and ${units(b, l)} ${b > 0 ? "up" : "down"}`, `${units(a, l)} a la ${a > 0 ? "derecha" : "izquierda"} y ${units(b, l)} hacia ${b > 0 ? "arriba" : "abajo"}`);
    const game = r.bool(0.4);
    const q = (l: Locale, said: boolean) => {
      const where = said ? sayPt(x, y, l) : pt(x, y);
      if (game) return tr(l, `In a board game, a piece sits at ${where}. It moves ${how(l)}.`, `En un juego de mesa, una ficha está en ${where}. Se mueve ${how(l)}.`);
      return tr(l, `Point ${P}${said ? ` ${where}` : where} is translated ${how(l)}.`, `El punto ${P}${said ? ` ${where}` : where} se traslada ${how(l)}.`);
    };
    const answer: Answer = { kind: "pair", x: ax, y: ay };
    const sign = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`);
    return {
      ...common,
      prompt: [`${q(locale, false)} ${game ? tr(locale, "Where does it land? Write the point as (x, y).", "¿Dónde queda? Escribe el punto como (x, y).") : ask}`],
      say: `${q(locale, true)} ${game ? tr(locale, "Where does it land? Write the point as the ordered pair x, y.", "¿Dónde queda? Escribe el punto como el par ordenado x, y.") : askSaid}`,
      answer,
      wrong: wrongs(answer, [
        [ptTyped(x - a, y - b), "moved-wrong-direction"],
        [ptTyped(x + b, y + a), "mixed-up-horizontal-and-vertical"],
      ]),
      hints: [
        tr(locale, "A translation slides the point. Moving right or left changes x; moving up or down changes y.", "Una traslación desliza el punto. Moverse a la derecha o a la izquierda cambia x; moverse hacia arriba o hacia abajo cambia y."),
        tr(locale, "Right adds to x and left subtracts from x. Up adds to y and down subtracts from y.", "A la derecha se suma a x y a la izquierda se resta de x. Hacia arriba se suma a y, y hacia abajo se resta de y."),
        tr(locale, `New x: ${show(x)} ${sign(a)} = ${show(ax)}.`, `Nueva x: ${show(x)} ${sign(a)} = ${show(ax)}.`),
      ],
      steps: [`x: ${show(x)} ${sign(a)} = ${show(ax)}`, `y: ${show(y)} ${sign(b)} = ${show(ay)}`, pt(ax, ay)],
    };
  }

  const [ax, ay] = { "refl-x": [x, -y], "refl-y": [-x, y], ccw: [-y, x], cw: [y, -x], half: [-x, -y] }[move];
  const what = {
    "refl-x": ["is reflected over the x-axis", "se refleja sobre el eje x", "is reflected over the x axis", "se refleja sobre el eje x"],
    "refl-y": ["is reflected over the y-axis", "se refleja sobre el eje y", "is reflected over the y axis", "se refleja sobre el eje y"],
    ccw: ["is rotated 90° counterclockwise about the origin", "se rota 90° en sentido contrario a las manecillas del reloj alrededor del origen", "is rotated 90 degrees counterclockwise about the origin", "se rota 90 grados en sentido contrario a las manecillas del reloj alrededor del origen"],
    cw: ["is rotated 90° clockwise about the origin", "se rota 90° en el sentido de las manecillas del reloj alrededor del origen", "is rotated 90 degrees clockwise about the origin", "se rota 90 grados en el sentido de las manecillas del reloj alrededor del origen"],
    half: ["is rotated 180° about the origin", "se rota 180° alrededor del origen", "is rotated 180 degrees about the origin", "se rota 180 grados alrededor del origen"],
  }[move];
  const rule = { "refl-x": "(x, y) → (x, −y)", "refl-y": "(x, y) → (−x, y)", ccw: "(x, y) → (−y, x)", cw: "(x, y) → (y, −x)", half: "(x, y) → (−x, −y)" }[move];
  const answer: Answer = { kind: "pair", x: ax, y: ay };
  const mistakes: Record<Move, [string, string][]> = {
    translate: [],
    "refl-x": [[ptTyped(-x, y), "reflected-over-wrong-axis"], [ptTyped(-x, -y), "changed-both-signs"], [ptTyped(y, x), "swapped-coordinates"]],
    "refl-y": [[ptTyped(x, -y), "reflected-over-wrong-axis"], [ptTyped(-x, -y), "changed-both-signs"], [ptTyped(y, x), "swapped-coordinates"]],
    ccw: [[ptTyped(y, -x), "rotated-wrong-direction"], [ptTyped(-x, -y), "used-180-rule"], [ptTyped(y, x), "swapped-without-changing-sign"]],
    cw: [[ptTyped(-y, x), "rotated-wrong-direction"], [ptTyped(-x, -y), "used-180-rule"], [ptTyped(y, x), "swapped-without-changing-sign"]],
    half: [[ptTyped(-x, y), "changed-only-one-sign"], [ptTyped(x, -y), "changed-only-one-sign"], [ptTyped(-y, x), "used-90-rule"]],
  };
  const nudge = {
    "refl-x": tr(locale, "Reflecting over the x-axis flips the point to the other side of the x-axis, the same distance away.", "Reflejar sobre el eje x pasa el punto al otro lado del eje x, a la misma distancia."),
    "refl-y": tr(locale, "Reflecting over the y-axis flips the point to the other side of the y-axis, the same distance away.", "Reflejar sobre el eje y pasa el punto al otro lado del eje y, a la misma distancia."),
    ccw: tr(locale, "A 90° counterclockwise rotation turns the point a quarter turn around the origin, against the direction of a clock's hands.", "Una rotación de 90° en sentido contrario a las manecillas del reloj gira el punto un cuarto de vuelta alrededor del origen."),
    cw: tr(locale, "A 90° clockwise rotation turns the point a quarter turn around the origin, the way a clock's hands move.", "Una rotación de 90° en el sentido de las manecillas del reloj gira el punto un cuarto de vuelta alrededor del origen."),
    half: tr(locale, "A 180° rotation is a half turn: the point ends up on the opposite side of the origin.", "Una rotación de 180° es media vuelta: el punto queda del lado opuesto del origen."),
  }[move];
  const how = {
    "refl-x": tr(locale, "x stays the same and y changes sign.", "La coordenada x queda igual y la coordenada y cambia de signo."),
    "refl-y": tr(locale, "x changes sign and y stays the same.", "La coordenada x cambia de signo y la coordenada y queda igual."),
    ccw: tr(locale, "Swap the coordinates, then change the sign of the new first coordinate.", "Intercambia las coordenadas y luego cambia el signo de la nueva primera coordenada."),
    cw: tr(locale, "Swap the coordinates, then change the sign of the new second coordinate.", "Intercambia las coordenadas y luego cambia el signo de la nueva segunda coordenada."),
    half: tr(locale, "Change the sign of both coordinates.", "Cambia el signo de las dos coordenadas."),
  }[move];
  const first = {
    "refl-x": tr(locale, `The x-coordinate stays ${show(x)}.`, `La coordenada x sigue siendo ${show(x)}.`),
    "refl-y": tr(locale, `The y-coordinate stays ${show(y)}.`, `La coordenada y sigue siendo ${show(y)}.`),
    ccw: tr(locale, `The new x-coordinate is the opposite of ${show(y)}.`, `La nueva coordenada x es el opuesto de ${show(y)}.`),
    cw: tr(locale, `The new x-coordinate is the old y-coordinate, ${show(y)}.`, `La nueva coordenada x es la antigua coordenada y, ${show(y)}.`),
    half: tr(locale, `The new x-coordinate is the opposite of ${show(x)}.`, `La nueva coordenada x es el opuesto de ${show(x)}.`),
  }[move];
  return {
    ...common,
    prompt: [`${tr(locale, `Point ${P}${pt(x, y)} ${what[0]}.`, `El punto ${P}${pt(x, y)} ${what[1]}.`)} ${ask}`],
    say: `${tr(locale, `Point ${P} ${sayPt(x, y, "en")} ${what[2]}.`, `El punto ${P} ${sayPt(x, y, "es")} ${what[3]}.`)} ${askSaid}`,
    answer,
    wrong: wrongs(answer, mistakes[move]),
    hints: [nudge, `${tr(locale, "Rule", "Regla")}: ${rule}. ${how}`, first],
    steps: [rule, `${pt(x, y)} → ${pt(ax, ay)}`],
  };
}

// ---------------------------------------------------------------- angles in triangles

const deg = (n: number) => `${n}°`;
/** An angle written with x, in degrees: "(2x + 10)°", or "3x°". */
const degX = (c: number, k: number) => (k ? `(${lin(c, k)})°` : `${lin(c, 0)}°`);
const sayDegX = (c: number, k: number, l: Locale) => `${sayLin(c, k, l)} ${tr(l, "degrees", "grados")}`;

type Story2 = { en: (a: number, b: number) => string; es: (a: number, b: number) => string };
const TRIANGLE_STORIES: Story2[] = [
  { en: (a, b) => `A triangular sail has two angles of ${a}° and ${b}°.`, es: (a, b) => `Una vela triangular tiene dos ángulos de ${a}° y ${b}°.` },
  { en: (a, b) => `A triangular garden has two corners that measure ${a}° and ${b}°.`, es: (a, b) => `Un jardín triangular tiene dos esquinas que miden ${a}° y ${b}°.` },
  { en: (a, b) => `A team's triangular pennant has two angles of ${a}° and ${b}°.`, es: (a, b) => `El banderín triangular de un equipo tiene dos ángulos de ${a}° y ${b}°.` },
  { en: (a, b) => `In a painting, an artist draws a triangle with two angles of ${a}° and ${b}°.`, es: (a, b) => `En una pintura, una artista dibuja un triángulo con dos ángulos de ${a}° y ${b}°.` },
];

function triangleAngles(r: Rng, level: number, locale: Locale): ItemBody {
  const sum180 = tr(locale, "The three angles of every triangle add up to 180°.", "Los tres ángulos de todo triángulo suman 180°.");
  const extRule = tr(locale, "An exterior angle of a triangle equals the sum of the two interior angles that are not next to it.", "Un ángulo exterior de un triángulo es igual a la suma de los dos ángulos interiores que no están junto a él.");
  const setup = tr(locale, "In triangle ABC, side BC is extended past C to point D.", "En el triángulo ABC, el lado BC se prolonga más allá de C hasta el punto D.");
  const setupSaid = tr(locale, "In triangle A B C, side B C is extended past C to point D.", "En el triángulo A B C, el lado B C se prolonga más allá de C hasta el punto D.");
  if (level === 1) {
    let a = 0, b = 0, c = 0;
    do {
      a = r.int(20, 110);
      b = r.int(15, 100);
      c = 180 - a - b;
    } while (c < 15 || a === b || a === c || b === c);
    const story = r.bool(0.35) ? r.pick(TRIANGLE_STORIES) : null;
    const text = story
      ? `${tr(locale, story.en(a, b), story.es(a, b))} ${tr(locale, "What is the third angle, in degrees?", "¿Cuánto mide el tercer ángulo, en grados?")}`
      : tr(locale, `In triangle ABC, ∠A = ${a}° and ∠B = ${b}°. Find ∠C, in degrees.`, `En el triángulo ABC, ∠A = ${a}° y ∠B = ${b}°. Halla ∠C, en grados.`);
    const said = story
      ? spoken(text, locale)
      : tr(locale, `In triangle A B C, angle A is ${a} degrees and angle B is ${b} degrees. Find angle C, in degrees.`, `En el triángulo A B C, el ángulo A mide ${a} grados y el ángulo B mide ${b} grados. Halla el ángulo C, en grados.`);
    const answer: Answer = { kind: "number", value: c };
    return {
      prompt: [text],
      say: said,
      input: "keypad",
      answer,
      wrong: wrongs(answer, [[String(180 - a), "subtracted-only-one-angle"], [String(360 - a - b), "used-360-degrees"], [String(a + b), "added-the-two-angles"]]),
      hints: [sum180, tr(locale, "Add the two angles you know, then subtract that sum from 180°.", "Suma los dos ángulos que conoces y luego resta esa suma de 180°."), `${deg(a)} + ${deg(b)} = ${deg(a + b)}.`],
      steps: [`${deg(a)} + ${deg(b)} = ${deg(a + b)}`, `180° − ${deg(a + b)} = ${deg(c)}`],
      seconds: 20,
    };
  }
  if (level === 2) {
    let a = 0, b = 0;
    do {
      a = r.int(20, 95);
      b = r.int(20, 95);
    } while (a === b || a + b >= 170 || a + b === 90);
    const ext = a + b;
    if (r.bool()) {
      const answer: Answer = { kind: "number", value: ext };
      return {
        prompt: [`${setup} ${tr(locale, `∠A = ${a}° and ∠B = ${b}°. Find the exterior angle ∠ACD, in degrees.`, `∠A = ${a}° y ∠B = ${b}°. Halla el ángulo exterior ∠ACD, en grados.`)}`],
        say: `${setupSaid} ${tr(locale, `Angle A is ${a} degrees and angle B is ${b} degrees. Find the exterior angle A C D, in degrees.`, `El ángulo A mide ${a} grados y el ángulo B mide ${b} grados. Halla el ángulo exterior A C D, en grados.`)}`,
        input: "keypad",
        answer,
        wrong: wrongs(answer, [[String(180 - ext), "found-the-interior-angle"], [String(Math.abs(a - b)), "subtracted-the-angles"], [String(360 - ext), "used-360-degrees"]]),
        hints: [extRule, tr(locale, "∠ACD is next to ∠ACB, so the two angles not next to it are ∠A and ∠B.", "∠ACD está junto a ∠ACB, así que los dos ángulos que no están junto a él son ∠A y ∠B."), `∠ACD = ∠A + ∠B = ${deg(a)} + ${deg(b)}`],
        steps: ["∠ACD = ∠A + ∠B", `∠ACD = ${deg(a)} + ${deg(b)} = ${deg(ext)}`],
        seconds: 30,
      };
    }
    const answer: Answer = { kind: "number", value: b };
    const slips: [string, string][] = [[String(ext + a), "added-instead-of-subtracting"], [String(180 - ext - a), "treated-exterior-as-interior"], [String(180 - ext), "found-the-interior-angle"]];
    return {
      prompt: [`${setup} ${tr(locale, `The exterior angle ∠ACD = ${ext}° and ∠A = ${a}°. Find ∠B, in degrees.`, `El ángulo exterior ∠ACD = ${ext}° y ∠A = ${a}°. Halla ∠B, en grados.`)}`],
      say: `${setupSaid} ${tr(locale, `The exterior angle A C D is ${ext} degrees and angle A is ${a} degrees. Find angle B, in degrees.`, `El ángulo exterior A C D mide ${ext} grados y el ángulo A mide ${a} grados. Halla el ángulo B, en grados.`)}`,
      input: "keypad",
      answer,
      wrong: wrongs(answer, slips.filter(([v]) => Number(v) > 0)),
      hints: [extRule, tr(locale, "So ∠ACD = ∠A + ∠B. Subtract the angle you know from the exterior angle.", "Entonces ∠ACD = ∠A + ∠B. Resta el ángulo que conoces del ángulo exterior."), `${deg(ext)} = ${deg(a)} + ∠B`],
      steps: ["∠ACD = ∠A + ∠B", `${deg(ext)} = ${deg(a)} + ∠B`, `∠B = ${deg(ext)} − ${deg(a)} = ${deg(b)}`],
      seconds: 35,
    };
  }
  // Level 3: the angles are written with x. Pick x first, then the constants that make it true.
  if (r.bool()) {
    let x = 0, c1 = 0, c2 = 0, c3 = 0, k1 = 0, k2 = 0, k3 = 0;
    const ok = (c: number, k: number) => c * x + k >= 15 && c * x + k <= 140;
    do {
      x = r.int(5, 30);
      [c1, c2, c3] = [r.int(1, 4), r.int(1, 4), r.int(1, 3)];
      [k1, k2] = [r.int(-4, 6) * 5, r.int(-4, 6) * 5];
      k3 = 180 - (c1 + c2 + c3) * x - k1 - k2;
    } while (!ok(c1, k1) || !ok(c2, k2) || !ok(c3, k3) || Math.abs(k3) > 40);
    const C = c1 + c2 + c3, K = k1 + k2 + k3;
    const sumText = `${degX(c1, k1)} + ${degX(c2, k2)} + ${degX(c3, k3)}`.replace(/°/g, "");
    const answer: Answer = { kind: "number", value: x };
    const as360 = (360 - K) / C, flipped = (180 + K) / C;
    return {
      prompt: [tr(locale, `In triangle ABC, ∠A = ${degX(c1, k1)}, ∠B = ${degX(c2, k2)} and ∠C = ${degX(c3, k3)}. Find x.`, `En el triángulo ABC, ∠A = ${degX(c1, k1)}, ∠B = ${degX(c2, k2)} y ∠C = ${degX(c3, k3)}. Halla x.`)],
      say: tr(
        locale,
        `In triangle A B C, angle A is ${sayDegX(c1, k1, "en")}, angle B is ${sayDegX(c2, k2, "en")}, and angle C is ${sayDegX(c3, k3, "en")}. Find x.`,
        `En el triángulo A B C, el ángulo A mide ${sayDegX(c1, k1, "es")}, el ángulo B mide ${sayDegX(c2, k2, "es")} y el ángulo C mide ${sayDegX(c3, k3, "es")}. Halla x.`,
      ),
      input: "keypad",
      answer,
      wrong: wrongs(answer, [
        ...(Number.isInteger(as360) ? [[String(as360), "used-360-degrees"] as [string, string]] : []),
        ...(Number.isInteger(flipped) && K !== 0 ? [[String(flipped), "moved-constant-without-changing-sign"] as [string, string]] : []),
        ...[c1 * x + k1, c2 * x + k2, c3 * x + k3].map((g): [string, string] => [String(g), "gave-an-angle-not-x"]),
      ]),
      hints: [
        tr(locale, "The three angles add up to 180°, so write an equation.", "Los tres ángulos suman 180°, así que escribe una ecuación."),
        tr(locale, "Combine the x terms and the numbers, then solve for x.", "Combina los términos con x y los números; luego resuelve para x."),
        `${sumText} = 180`,
      ],
      steps: [`${sumText} = 180`, `${lin(C, K)} = 180`, ...(K ? [`${lin(C, 0)} = ${180 - K}`] : []), `x = ${x}`],
      seconds: 60,
    };
  }
  let x = 0, c1 = 0, c2 = 0, c3 = 0, k1 = 0, k2 = 0, k3 = 0;
  do {
    x = r.int(5, 30);
    [c1, c2] = [r.int(1, 3), r.int(1, 3)];
    c3 = c1 + c2 + r.int(1, 2);
    [k1, k2] = [r.int(-2, 6) * 5, r.int(-2, 6) * 5];
    k3 = k1 + k2 - (c3 - c1 - c2) * x;
  } while (c1 * x + k1 < 15 || c2 * x + k2 < 15 || c1 * x + k1 + c2 * x + k2 > 165 || k3 === 0);
  const g = c3 - c1 - c2, rhs = k1 + k2 - k3;
  const grp = (c: number, k: number) => (k ? `(${lin(c, k)})` : lin(c, 0));
  const eq = `${lin(c3, k3)} = ${grp(c1, k1)} + ${grp(c2, k2)}`;
  const answer: Answer = { kind: "number", value: x };
  const asInterior = (180 - k1 - k2 - k3) / (c1 + c2 + c3);
  return {
    prompt: [`${setup} ${tr(locale, `∠A = ${degX(c1, k1)}, ∠B = ${degX(c2, k2)} and the exterior angle ∠ACD = ${degX(c3, k3)}. Find x.`, `∠A = ${degX(c1, k1)}, ∠B = ${degX(c2, k2)} y el ángulo exterior ∠ACD = ${degX(c3, k3)}. Halla x.`)}`],
    say: `${setupSaid} ${tr(
      locale,
      `Angle A is ${sayDegX(c1, k1, "en")}, angle B is ${sayDegX(c2, k2, "en")}, and the exterior angle A C D is ${sayDegX(c3, k3, "en")}. Find x.`,
      `El ángulo A mide ${sayDegX(c1, k1, "es")}, el ángulo B mide ${sayDegX(c2, k2, "es")} y el ángulo exterior A C D mide ${sayDegX(c3, k3, "es")}. Halla x.`,
    )}`,
    input: "keypad",
    keys: ["-"],
    answer,
    wrong: wrongs(answer, [
      [String(-x), "moved-constant-without-changing-sign"],
      ...(Number.isInteger(asInterior) ? [[String(asInterior), "treated-exterior-as-interior"] as [string, string]] : []),
      [String(c3 * x + k3), "gave-an-angle-not-x"],
    ]),
    hints: [extRule, tr(locale, "Write that as an equation, combine like terms and solve for x.", "Escríbelo como una ecuación, combina términos semejantes y resuelve para x."), eq],
    steps: [eq, `${lin(c3, k3)} = ${lin(c1 + c2, k1 + k2)}`, ...(g === 1 ? [] : [`${lin(g, 0)} = ${rhs}`]), `x = ${x}`],
    seconds: 70,
  };
}

// ---------------------------------------------------------------- volume of cylinders, cones and spheres

/** `cube` is the volume unit in worked steps: cm³ and m³ in both languages, the words for US units in Spanish. */
type Unit3 = { en: string; es: string; word: [string, string]; cubic: [string, string]; cube: [string, string] };
const UNITS3: Unit3[] = [
  { en: "cm", es: "cm", word: ["centimeters", "centímetros"], cubic: ["cubic centimeters", "centímetros cúbicos"], cube: ["cm³", "cm³"] },
  { en: "m", es: "m", word: ["meters", "metros"], cubic: ["cubic meters", "metros cúbicos"], cube: ["m³", "m³"] },
  { en: "in", es: "pulg", word: ["inches", "pulgadas"], cubic: ["cubic inches", "pulgadas cúbicas"], cube: ["in³", "pulgadas cúbicas"] },
  { en: "ft", es: "pies", word: ["feet", "pies"], cubic: ["cubic feet", "pies cúbicos"], cube: ["ft³", "pies cúbicos"] },
];
type Solid = "cylinder" | "cone" | "sphere";
/** An everyday object of each shape, with sizes that make sense for it: [unit, r min, r max, h min, h max]. */
type Thing = { en: string; es: string; size: [number, number, number, number, number] };
const THINGS: Record<Solid, Thing[]> = {
  cylinder: [
    { en: "A soup can", es: "Una lata de sopa", size: [2, 2, 3, 4, 6] },
    { en: "A drum", es: "Un tambor", size: [2, 5, 10, 6, 14] },
    { en: "A water tank", es: "Un tanque de agua", size: [3, 2, 5, 4, 10] },
    { en: "A candle", es: "Una vela", size: [0, 2, 5, 5, 15] },
  ],
  cone: [
    { en: "A paper cup", es: "Un vaso de papel", size: [0, 2, 4, 6, 12] },
    { en: "A party hat", es: "Un gorro de fiesta", size: [2, 3, 4, 6, 9] },
    { en: "A pile of sand", es: "Un montón de arena", size: [3, 2, 6, 3, 6] },
    { en: "A kitchen funnel", es: "Un embudo de cocina", size: [0, 2, 3, 9, 12] },
  ],
  sphere: [
    { en: "A ball", es: "Una pelota", size: [2, 3, 6, 0, 0] },
    { en: "A globe", es: "Un globo terráqueo", size: [0, 10, 15, 0, 0] },
    { en: "A model of a planet", es: "Un modelo de un planeta", size: [0, 4, 10, 0, 0] },
    { en: "An orange", es: "Una naranja", size: [0, 3, 5, 0, 0] },
  ],
};
/** n ÷ d rounded to the nearest whole number, halves up, in whole-number arithmetic (n, d > 0). */
const roundDiv = (n: number, d: number) => Math.floor((2 * n + d) / (2 * d));

function volume(r: Rng, level: number, locale: Locale): ItemBody {
  const solid: Solid = level === 1 ? "cylinder" : level === 2 ? "cone" : "sphere";
  const thing = r.bool(0.5) ? r.pick(THINGS[solid]) : null;
  const unit = thing ? UNITS3[thing.size[0]] : r.pick(UNITS3);
  let rad = 0, h = 0;
  do {
    rad = thing ? r.int(thing.size[1], thing.size[2]) : r.int(2, solid === "sphere" ? 10 : 9);
    h = solid === "sphere" ? 0 : thing ? r.int(thing.size[3], thing.size[4]) : r.int(2, 18);
    // A cone's volume in hundredths, 314 r² h ÷ 3, is exact only when 3 divides r² h.
  } while (solid === "cone" && (rad * rad * h) % 3 !== 0);
  const d = 2 * rad;
  const byD = r.bool(level === 2 ? 0.3 : 0.4);
  const ab = tr(locale, unit.en, unit.es);
  const len = (n: number, said: boolean) => `${n} ${said ? tr(locale, unit.word[0], unit.word[1]) : ab}`;
  const cubic = tr(locale, unit.cubic[0], unit.cubic[1]);
  const shape = { cylinder: ["cylinder", "cilindro"], cone: ["cone", "cono"], sphere: ["sphere", "esfera"] }[solid];
  const given = (s: boolean) => (byD ? tr(locale, `a diameter of ${len(d, s)}`, `un diámetro de ${len(d, s)}`) : tr(locale, `a radius of ${len(rad, s)}`, `un radio de ${len(rad, s)}`));
  const height = (s: boolean) => (h ? tr(locale, ` and a height of ${len(h, s)}`, ` y una altura de ${len(h, s)}`) : "");
  const subject = thing ? tr(locale, `${thing.en} shaped like a ${shape[0]}`, `${thing.es} con forma de ${shape[1]}`) : tr(locale, `A ${shape[0]}`, `Un${solid === "sphere" ? "a" : ""} ${shape[1]}`);
  const q = (s: boolean) => tr(locale, `${subject} has ${given(s)}${height(s)}. Find its volume in ${cubic}.`, `${subject} tiene ${given(s)}${height(s)}. Halla su volumen en ${cubic}.`);
  const round = solid === "sphere" ? tr(locale, " Round to the nearest hundredth.", " Redondea a la centésima más cercana.") : "";
  // Volumes in hundredths of a cubic unit, from π ≈ 3.14 = 314/100.
  const r2 = rad * rad, r3 = rad ** 3;
  const N = solid === "cylinder" ? 314 * r2 * h : solid === "cone" ? (314 * r2 * h) / 3 : roundDiv(1256 * r3, 3);
  const exact = solid !== "sphere" || (1256 * r3) % 3 === 0;
  const answer: Answer = { kind: "number", value: N / 100, tolerance: 0.05 };
  const halve = byD ? [`r = ${d} ÷ 2 = ${rad} ${ab}`] : [];
  const out = `${dec(N)} ${tr(locale, unit.cube[0], unit.cube[1])}`;
  // A calculator's π key instead of 3.14, rounded to the hundredth (only a likely wrong value, never a key).
  const piKey = Math.round((solid === "cylinder" ? Math.PI * r2 * h : solid === "cone" ? (Math.PI * r2 * h) / 3 : (4 / 3) * Math.PI * r3) * 100);
  const mistakes: [string, string][] =
    solid === "cylinder"
      ? [[decTyped(314 * rad * h), "forgot-to-square-radius"], ...(byD ? [[decTyped(314 * d * d * h), "used-diameter-as-radius"] as [string, string]] : []), [decTyped(314 * d * h), "used-circumference-times-height"]]
      : solid === "cone"
        ? [[decTyped(314 * r2 * h), "forgot-one-third"], ...(byD ? [[decTyped((314 * d * d * h) / 3), "used-diameter-as-radius"] as [string, string]] : []), [decTyped(roundDiv(314 * rad * h, 3)), "forgot-to-square-radius"]]
        : [
            [decTyped(roundDiv(1256 * r2, 3)), "squared-instead-of-cubed"],
            [decTyped(314 * r3), "forgot-four-thirds"],
            ...(byD ? [[decTyped(roundDiv(1256 * d ** 3, 3)), "used-diameter-as-radius"] as [string, string]] : []),
            // 4/3 rounded to 1.33 first: 1.33 × 3.14 × r³, in hundredths.
            [decTyped(roundDiv(133 * 314 * r3, 100)), "rounded-four-thirds-early"],
          ];
  mistakes.push([decTyped(piKey), "used-pi-key-not-3-14"]);
  const formula = { cylinder: "V = π × r² × h", cone: "V = 1/3 × π × r² × h", sphere: "V = 4/3 × π × r³" }[solid];
  const nudge = {
    cylinder: tr(locale, "The volume of a cylinder is the area of its circular base times its height.", "El volumen de un cilindro es el área de su base circular por su altura."),
    cone: tr(locale, "A cone holds one third as much as a cylinder with the same base and height.", "Un cono tiene un tercio del volumen de un cilindro con la misma base y la misma altura."),
    sphere: tr(locale, "The volume of a sphere depends only on its radius.", "El volumen de una esfera depende solo de su radio."),
  }[solid];
  const third = byD
    ? `r = ${d} ÷ 2 = ${rad} ${ab}`
    : solid === "sphere"
      ? `r³ = ${rad} × ${rad} × ${rad} = ${r3}`
      : `r² = ${rad} × ${rad} = ${r2}`;
  const steps =
    solid === "cylinder"
      ? [...halve, `V = 3.14 × ${rad}² × ${h}`, `V = 3.14 × ${r2} × ${h} = ${out}`]
      : solid === "cone"
        ? [...halve, `V = 1/3 × 3.14 × ${rad}² × ${h}`, `V = 3.14 × ${r2} × ${h} ÷ 3 = ${out}`]
        : [...halve, `V = 4/3 × 3.14 × ${rad}³`, `${rad}³ = ${r3}`, `V = 4 × 3.14 × ${r3} ÷ 3 ${exact ? "=" : "≈"} ${out}`];
  return {
    prompt: [`${q(false)} ${tr(locale, "Use π ≈ 3.14.", "Usa π ≈ 3.14.")}${round}`],
    say: `${q(true)} ${tr(locale, "Use 3.14 for pi.", "Usa 3.14 para pi.")}${round}`,
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongs(answer, mistakes),
    hints: [
      nudge,
      byD ? tr(locale, `${formula}. The radius is half the diameter.`, `${formula}. El radio es la mitad del diámetro.`) : tr(locale, `${formula}. Use 3.14 for π.`, `${formula}. Usa 3.14 para π.`),
      third,
    ],
    steps,
    seconds: solid === "cylinder" ? 45 : 60,
  };
}

// ---------------------------------------------------------------- functions from tables and lists

/** Pairs of a relation: a function (every x once) or not (one x twice, with two different y-values). */
function relation(r: Rng, size: number, fn: boolean, repeatY: boolean): { pairs: [number, number][]; dup?: number } {
  for (;;) {
    const xs = r.shuffle(Array.from({ length: 15 }, (_, i) => i - 5)).slice(0, fn ? size : size - 1);
    const ys = xs.map(() => r.int(-5, 12));
    const pairs: [number, number][] = xs.map((x, i) => [x, ys[i]]);
    let dup: number | undefined;
    if (!fn) {
      const [x, y] = r.pick(pairs);
      let y2 = r.int(-5, 12);
      while (y2 === y) y2 = r.int(-5, 12);
      dup = x;
      pairs.splice(r.int(0, pairs.length), 0, [x, y2]);
    }
    const yset = new Set(pairs.map((p) => p[1]));
    if (fn && repeatY && yset.size === pairs.length) {
      const [i, j] = r.shuffle(pairs.map((_, k) => k)).slice(0, 2);
      pairs[j] = [pairs[j][0], pairs[i][1]];
    }
    const repeats = new Set(pairs.map((p) => p[1])).size < pairs.length;
    if (fn && repeatY !== repeats) continue;
    return { pairs, dup };
  }
}
const pairsText = (ps: [number, number][]) => `{${ps.map(([x, y]) => pt(x, y)).join(", ")}}`;
const sayPairs = (ps: [number, number][], l: Locale) => `${tr(l, "the pairs", "los pares")} ${ps.map(([x, y]) => `${sayNum(x, l)} ${tr(l, "and", "y")} ${sayNum(y, l)}`).join(", ")}`;

function funcIdentify(r: Rng, level: number, locale: Locale): ItemBody {
  const rule = tr(locale, "A relation is a function when each input x has exactly one output y.", "Una relación es una función cuando cada entrada x tiene exactamente una salida y.");
  if (level === 1) {
    const fn = r.bool();
    const repeatY = fn && r.bool(0.6);
    const { pairs, dup } = relation(r, 5, fn, repeatY);
    const xs = pairs.map(([x]) => show(x)).join(", "), ys = pairs.map(([, y]) => show(y)).join(", ");
    const yes: Choice = { label: tr(locale, "Yes", "Sí"), say: tr(locale, "yes", "sí") };
    const no: Choice = { label: "No", say: "no" };
    const choices = fn ? [yes, { ...no, why: repeatY ? "thought-repeated-y-breaks-function" : "thought-a-function-needs-a-pattern" }] : [{ ...yes, why: "missed-repeated-input" }, no];
    const outs = dup === undefined ? [] : pairs.filter(([x]) => x === dup).map(([, y]) => show(y));
    const repeatedY = pairs.find(([, y], i) => pairs.findIndex(([, z]) => z === y) !== i)?.[1];
    return {
      prompt: [tr(locale, "Is y a function of x?", "¿Es y una función de x?"), `   x: ${xs}   y: ${ys}`],
      say: tr(
        locale,
        `Is y a function of x? The pairs are: ${pairs.map(([x, y]) => `x ${sayNum(x, "en")} with y ${sayNum(y, "en")}`).join(", ")}.`,
        `¿Es y una función de x? Los pares son: ${pairs.map(([x, y]) => `x ${sayNum(x, "es")} con y ${sayNum(y, "es")}`).join(", ")}.`,
      ),
      choices,
      input: "choices",
      answer: { kind: "choice", index: fn ? 0 : 1 },
      hints: [
        rule,
        tr(locale, "Look for an x-value that appears more than once. If one does, compare its y-values.", "Busca un valor de x que aparezca más de una vez. Si lo hay, compara sus valores de y."),
        dup !== undefined
          ? tr(locale, `Look at x = ${show(dup)}.`, `Fíjate en x = ${show(dup)}.`)
          : repeatedY !== undefined
            ? tr(locale, `The output ${show(repeatedY)} appears twice. Outputs are allowed to repeat; only inputs matter here.`, `La salida ${show(repeatedY)} aparece dos veces. Las salidas pueden repetirse; aquí solo importan las entradas.`)
            : tr(locale, `The x-values are ${xs}. Check whether any of them repeats.`, `Los valores de x son ${xs}. Revisa si alguno se repite.`),
      ],
      steps:
        dup !== undefined
          ? [tr(locale, `x = ${show(dup)} is paired with y = ${outs[0]} and with y = ${outs[1]}.`, `x = ${show(dup)} está emparejado con y = ${outs[0]} y con y = ${outs[1]}.`), tr(locale, "No: one input has two outputs, so y is not a function of x.", "No: una entrada tiene dos salidas, así que y no es una función de x.")]
          : [tr(locale, `Each x-value appears once: ${xs}.`, `Cada valor de x aparece una sola vez: ${xs}.`), tr(locale, "Yes: each input has exactly one output, so y is a function of x.", "Sí: cada entrada tiene exactamente una salida, así que y es una función de x.")],
      seconds: 25,
    };
  }
  const findFn = r.bool();
  let sets: { pairs: [number, number][]; dup?: number }[] = [];
  // Four lists with different first pairs, so a hint can name a list by how it starts.
  do {
    sets = [relation(r, 4, findFn, findFn && r.bool(0.7)), ...[0, 1, 2].map(() => relation(r, 4, !findFn, !findFn))];
  } while (new Set(sets.map((s) => pt(...s.pairs[0]))).size < 4 || new Set(sets.map((s) => pairsText(s.pairs))).size < 4);
  const [key, ...others] = sets;
  const right: Choice = { label: pairsText(key.pairs), say: sayPairs(key.pairs, locale) };
  const wrong: Choice[] = others.map((s) => ({ label: pairsText(s.pairs), say: sayPairs(s.pairs, locale), why: findFn ? "missed-repeated-input" : "thought-repeated-y-breaks-function" }));
  const lead = pt(...others[0].pairs[0]);
  const keyDupOuts = key.dup === undefined ? [] : key.pairs.filter(([x]) => x === key.dup).map(([, y]) => show(y));
  return {
    prompt: [findFn ? tr(locale, "Which relation is a function?", "¿Qué relación es una función?") : tr(locale, "Which relation is not a function?", "¿Qué relación no es una función?")],
    say: findFn ? tr(locale, "Which of these relations is a function?", "¿Cuál de estas relaciones es una función?") : tr(locale, "Which of these relations is not a function?", "¿Cuál de estas relaciones no es una función?"),
    ...choose(r, right, wrong),
    hints: [
      rule,
      tr(locale, "In each list, look for an x-value that is paired with two different y-values.", "En cada lista, busca un valor de x que esté emparejado con dos valores de y distintos."),
      findFn
        ? tr(locale, `In the list that starts with ${lead}, x = ${show(others[0].dup!)} has two different y-values.`, `En la lista que empieza con ${lead}, x = ${show(others[0].dup!)} tiene dos valores de y distintos.`)
        : tr(locale, `In the list that starts with ${lead}, a y-value repeats, but every x appears once.`, `En la lista que empieza con ${lead}, un valor de y se repite, pero cada x aparece una sola vez.`),
    ],
    steps: findFn
      ? [tr(locale, "Each of the other lists pairs one x-value with two different y-values.", "Cada una de las otras listas empareja un valor de x con dos valores de y distintos."), tr(locale, `${right.label} is a function: every x appears once.`, `${right.label} es una función: cada x aparece una sola vez.`)]
      : [tr(locale, `x = ${show(key.dup!)} has two outputs here, ${keyDupOuts[0]} and ${keyDupOuts[1]}.`, `Aquí x = ${show(key.dup!)} tiene dos salidas, ${keyDupOuts[0]} y ${keyDupOuts[1]}.`), tr(locale, `${right.label} is not a function.`, `${right.label} no es una función.`)],
    seconds: 40,
  };
}

// ---------------------------------------------------------------- compare linear functions

type CompareStory = {
  /** Starting amount and rate ranges: s min, s max, m min, m max. */
  range: [number, number, number, number];
  money: boolean;
  x: [string, string];
  /** The x unit in the plural. */
  xp: [string, string];
  y: [string, string];
  per: [string, string];
  words: (who: string, s: string, m: string, l: Locale) => string;
  title: (who: string, l: Locale) => string;
  rateQ: [string, string];
  startQ: [string, string];
};
const COMPARE_STORIES: CompareStory[] = [
  {
    range: [10, 80, 3, 15], money: true, x: ["week", "semana"], xp: ["weeks", "semanas"], y: ["dollars", "dólares"], per: ["per week", "por semana"],
    words: (w, s, m, l) => tr(l, `${w} has ${s} and saves ${m} each week.`, `${w} tiene ${s} y ahorra ${m} cada semana.`),
    title: (w, l) => tr(l, `${w}'s savings`, `Ahorros de ${w}`),
    rateQ: ["Who saves more each week?", "¿Quién ahorra más cada semana?"], startQ: ["Who had more money at week 0?", "¿Quién tenía más dinero en la semana 0?"],
  },
  {
    range: [20, 120, 10, 40], money: false, x: ["day", "día"], xp: ["days", "días"], y: ["pages", "páginas"], per: ["pages per day", "páginas por día"],
    words: (w, s, m, l) => tr(l, `${w} has already read ${s} pages of a book and reads ${m} pages each day.`, `${w} ya leyó ${s} páginas de un libro y lee ${m} páginas cada día.`),
    title: (w, l) => tr(l, `Pages ${w} has read`, `Páginas que ${w} ha leído`),
    rateQ: ["Who reads more pages each day?", "¿Quién lee más páginas cada día?"], startQ: ["Who had read more pages at day 0?", "¿Quién había leído más páginas en el día 0?"],
  },
  {
    range: [50, 300, 20, 60], money: false, x: ["level", "nivel"], xp: ["levels", "niveles"], y: ["points", "puntos"], per: ["points per level", "puntos por nivel"],
    words: (w, s, m, l) => tr(l, `${w} has ${s} points in a game and earns ${m} points each level.`, `${w} tiene ${s} puntos en un juego y gana ${m} puntos en cada nivel.`),
    title: (w, l) => tr(l, `${w}'s points`, `Puntos de ${w}`),
    rateQ: ["Who earns more points each level?", "¿Quién gana más puntos en cada nivel?"], startQ: ["Who had more points at level 0?", "¿Quién tenía más puntos en el nivel 0?"],
  },
  {
    range: [2, 15, 2, 6], money: false, x: ["month", "mes"], xp: ["months", "meses"], y: ["songs", "canciones"], per: ["songs per month", "canciones por mes"],
    words: (w, s, m, l) => tr(l, `${w} can already play ${s} songs on the guitar and learns ${m} new songs each month.`, `${w} ya sabe tocar ${s} canciones en la guitarra y aprende ${m} canciones nuevas cada mes.`),
    title: (w, l) => tr(l, `Songs ${w} can play`, `Canciones que ${w} sabe tocar`),
    rateQ: ["Who learns more songs each month?", "¿Quién aprende más canciones cada mes?"], startQ: ["Who could play more songs at month 0?", "¿Quién sabía tocar más canciones en el mes 0?"],
  },
];

type Line = { m: number; b: number; table: boolean; x0: number; step: number };
/** "46 − 40", with a negative second number in parentheses. */
const minus2 = (a: number, b: number) => `${show(a)} − ${par(b)}`;
type Trap = "initial" | "per-row" | "absolute" | "rate" | "first-value";
const TRAP_WHY: Record<Trap, string> = {
  initial: "compared-initial-values",
  "per-row": "used-change-per-row-not-per-unit",
  absolute: "compared-absolute-values",
  rate: "compared-rates-instead",
  "first-value": "read-first-table-value-as-start",
};

function linearCompare(r: Rng, level: number, locale: Locale): ItemBody {
  const story = level === 1 ? r.pick(COMPARE_STORIES) : null;
  const askRate = r.bool();
  const trap: Trap = askRate ? r.pick<Trap>(level === 1 ? ["initial", "per-row"] : ["initial", "per-row", "absolute"]) : r.pick<Trap>(["rate", "first-value"]);
  const draw = (): Line => {
    const [s0, s1, m0, m1] = story ? story.range : [-10, 10, -6, 6];
    return { m: story ? r.int(m0, m1) : nz(r, m0, m1), b: r.int(s0, s1), table: false, x0: 0, step: 1 };
  };
  let W: Line, L: Line;
  for (;;) {
    W = draw();
    L = draw();
    const x0 = trap === "first-value" ? r.int(1, 2) : 0;
    const ok = askRate
      ? W.m > L.m && (trap === "initial" ? L.b > W.b : trap === "per-row" ? L.m > 0 && 2 * L.m > W.m : L.m < 0 && -L.m > Math.abs(W.m) && W.m > 0)
      : W.b > L.b && (trap === "rate" ? L.m > W.m : L.m > 0 && L.b + L.m * x0 > W.b);
    if (!ok) continue;
    const lTable = trap === "per-row" || trap === "first-value" || r.bool();
    L.table = lTable;
    W.table = !lTable;
    const T = lTable ? L : W;
    T.step = trap === "per-row" ? 2 : 1;
    T.x0 = trap === "first-value" ? x0 : !story && askRate ? r.int(-2, 1) : 0;
    break;
  }
  const A = W.table ? L : W, B = W.table ? W : L; // A is described in words or by an equation, B by a table
  const xs = [0, 1, 2, 3].map((i) => B.x0 + i * B.step), ys = xs.map((x) => B.m * x + B.b);
  const [nameA, nameB] = r.shuffle(NAMES).slice(0, 2);
  const label = (side: Line) => (story ? (side === A ? nameA : nameB) : side === A ? tr(locale, "Function A", "Función A") : tr(locale, "Function B", "Función B"));
  const right: Choice = { label: label(W) };
  const wrong: Choice = { label: label(L), why: TRAP_WHY[trap] };
  const amt = (n: number, said: boolean) => (story?.money ? (said ? `${n} ${tr(locale, "dollars", "dólares")}` : `$${n}`) : String(n));
  const xw = story ? tr(locale, story.x[0], story.x[1]) : "x", yw = story ? tr(locale, story.y[0], story.y[1]) : "y";
  const per = story ? tr(locale, story.per[0], story.per[1]) : "";
  // "Greater rate" means the greater signed number (2 beats −5), so the question says "number", not "faster".
  const q = story
    ? tr(locale, ...(askRate ? story.rateQ : story.startQ))
    : askRate
      ? tr(locale, "Which function's rate of change is the greater number?", "¿Qué función tiene la tasa de cambio con el mayor valor?")
      : tr(locale, "Which function has the greater initial value (y-intercept)?", "¿Qué función tiene el mayor valor inicial (la intersección con el eje y)?");
  const qSaid = story || askRate ? q : tr(locale, "Which function has the greater initial value, its y-intercept?", "¿Qué función tiene el mayor valor inicial, su intersección con el eje y?");
  const tableText = story
    ? `${story.title(nameB, locale)} — ${xw}: ${xs.join(", ")}; ${yw}: ${ys.join(", ")}.`
    : `${tr(locale, "Function B", "Función B")} — x: ${xs.map(show).join(", ")}; y: ${ys.map(show).join(", ")}.`;
  const tableSaid = story
    ? `${story.title(nameB, locale)}: ${xs.map((x, i) => `${xw} ${x}, ${amt(ys[i], true)}${story.money ? "" : ` ${yw}`}`).join("; ")}.`
    : `${tr(locale, "Function B has these values", "La función B tiene estos valores")}: ${xs.map((x, i) => `x ${sayNum(x, locale)}, y ${sayNum(ys[i], locale)}`).join("; ")}.`;
  const first = story
    ? story.words(nameA, amt(A.b, false), amt(A.m, false), locale)
    : `${tr(locale, "Function A", "Función A")}: y = ${lin(A.m, A.b)}.`;
  const firstSaid = story
    ? story.words(nameA, amt(A.b, true), amt(A.m, true), locale)
    : `${tr(locale, "Function A is y equals", "La función A es y igual a")} ${sayLin(A.m, A.b, locale)}.`;
  const nameOfA = label(A), nameOfB = label(B);
  const at0 = story ? `(${xw} 0)` : "(x = 0)";
  const val = (n: number) => (story ? amt(n, false) : show(n));
  const bRate = `${nameOfB}: (${minus2(ys[1], ys[0])}) ÷ (${minus2(xs[1], xs[0])}) = ${story ? `${amt(B.m, false)} ${per}` : show(B.m)}`;
  const bStart = B.x0 === 0 ? `${nameOfB}: ${val(B.b)} ${at0}` : `${nameOfB}: ${show(ys[0])} − ${B.x0} × ${par(B.m)} = ${val(B.b)} ${at0}`;
  const aLine = askRate ? `${nameOfA}: ${story ? `${amt(A.m, false)} ${per}` : `m = ${show(A.m)}`}` : `${nameOfA}: ${val(A.b)} ${at0}`;
  const last = askRate
    ? tr(locale, `${right.label} has the greater rate: ${show(W.m)} > ${show(L.m)}`, `${right.label} tiene la mayor tasa: ${show(W.m)} > ${show(L.m)}`)
    : tr(locale, `${right.label} has the greater initial value: ${show(W.b)} > ${show(L.b)}`, `${right.label} tiene el mayor valor inicial: ${show(W.b)} > ${show(L.b)}`);
  const hintA = askRate
    ? story
      ? tr(locale, `${nameA}'s rate is ${amt(A.m, false)} ${per}.`, `La tasa de ${nameA} es ${amt(A.m, false)} ${per}.`)
      : tr(locale, `Function A's rate of change is ${show(A.m)}.`, `La tasa de cambio de la función A es ${show(A.m)}.`)
    : story
      ? tr(locale, `${nameA} starts with ${amt(A.b, false)}.`, `${nameA} empieza con ${amt(A.b, false)}.`)
      : tr(locale, `Function A's initial value is ${show(A.b)}.`, `El valor inicial de la función A es ${show(A.b)}.`);
  return {
    prompt: [`${first} ${tableText} ${q}`],
    say: `${firstSaid} ${tableSaid} ${qSaid}`,
    ...choose(r, right, [wrong]),
    hints: [
      askRate
        ? story
          ? tr(locale, `The rate is how much the amount changes in one ${xw}.`, `La tasa es cuánto cambia la cantidad en un${story.x[1] === "semana" ? "a" : ""} ${xw}.`)
          : tr(locale, "The rate of change is how much y changes when x goes up by 1.", "La tasa de cambio es cuánto cambia y cuando x aumenta 1.")
        : story
          ? tr(locale, `The starting amount is the value at ${xw} 0.`, `La cantidad inicial es el valor en ${story.x[1] === "semana" ? "la" : "el"} ${xw} 0.`)
          : tr(locale, "The initial value is the value of y when x = 0.", "El valor inicial es el valor de y cuando x = 0."),
      askRate
        ? story
          ? tr(locale, `For ${nameB}, pick two of the listed values and divide the change in ${yw} by the number of ${story.xp[0]} between them.`, `Para ${nameB}, elige dos de los valores de la lista y divide el cambio en ${yw} entre el número de ${story.xp[1]} que hay entre ellos.`)
          : tr(locale, "For Function B, divide the change in y by the change in x between two of its values.", "Para la función B, divide el cambio en y entre el cambio en x de dos de sus valores.")
        : story
          ? tr(locale, `If ${nameB}'s values do not start at ${xw} 0, work back from the first one using the rate.`, `Si los valores de ${nameB} no empiezan en ${story.x[1] === "semana" ? "la" : "el"} ${xw} 0, retrocede desde el primero usando la tasa.`)
          : tr(locale, "If Function B's values do not start at x = 0, work back from the first one using the rate.", "Si los valores de la función B no empiezan en x = 0, retrocede desde el primero usando la tasa."),
      hintA,
    ],
    steps: [aLine, askRate ? bRate : bStart, last],
    seconds: level === 1 ? 50 : 60,
  };
}

// ---------------------------------------------------------------- lines of best fit

type FitStory = {
  intro: [string, string];
  /** The least sensible starting value: a puppy never weighs 0 pounds. */
  minB: number;
  rate: (m: string, l: Locale) => string;
  start: (m: string, l: Locale) => string;
  reversed: (m: string, l: Locale) => string;
};
// The number put into these sentences is never exactly 1 (meaning items use slopes other than 1 and
// starting values of 2 or 3), so the plural units always read right.
const FIT_STORIES: FitStory[] = [
  {
    intro: ["The scatter plot shows the height of a bean plant in centimeters (y) after a number of weeks (x).", "El diagrama de dispersión muestra la altura de una planta de frijol en centímetros (y) después de cierto número de semanas (x)."],
    minB: 0,
    rate: (m, l) => tr(l, `The plant grows about ${m} cm each week.`, `La planta crece aproximadamente ${m} cm cada semana.`),
    start: (m, l) => tr(l, `The plant was about ${m} cm tall at week 0.`, `La planta medía aproximadamente ${m} cm en la semana 0.`),
    reversed: (m, l) => tr(l, `The plant takes about ${m} weeks to grow 1 cm.`, `La planta tarda aproximadamente ${m} semanas en crecer 1 cm.`),
  },
  {
    intro: ["The scatter plot shows a puppy's weight in pounds (y) at different ages in months (x).", "El diagrama de dispersión muestra el peso de un cachorro en libras (y) a distintas edades en meses (x)."],
    minB: 1,
    rate: (m, l) => tr(l, `The puppy gains about ${m} pounds each month.`, `El cachorro gana aproximadamente ${m} libras cada mes.`),
    start: (m, l) => tr(l, `The puppy weighed about ${m} pounds at month 0.`, `El cachorro pesaba aproximadamente ${m} libras en el mes 0.`),
    reversed: (m, l) => tr(l, `The puppy takes about ${m} months to gain 1 pound.`, `El cachorro tarda aproximadamente ${m} meses en ganar 1 libra.`),
  },
  {
    intro: ["The scatter plot shows the depth of snow on the ground in inches (y) after a number of hours of a storm (x).", "El diagrama de dispersión muestra la profundidad de la nieve en el suelo en pulgadas (y) después de cierto número de horas de una tormenta (x)."],
    minB: 0,
    rate: (m, l) => tr(l, `About ${m} inches of snow fall each hour.`, `Caen aproximadamente ${m} pulgadas de nieve cada hora.`),
    start: (m, l) => tr(l, `There were about ${m} inches of snow on the ground at hour 0.`, `Había aproximadamente ${m} pulgadas de nieve en el suelo en la hora 0.`),
    reversed: (m, l) => tr(l, `It takes about ${m} hours for 1 inch of snow to fall.`, `Se necesitan aproximadamente ${m} horas para que caiga 1 pulgada de nieve.`),
  },
  {
    intro: ["The scatter plot shows how many songs students in a music class can play (y) after a number of weeks of lessons (x).", "El diagrama de dispersión muestra cuántas canciones saben tocar los estudiantes de una clase de música (y) después de cierto número de semanas de clases (x)."],
    minB: 0,
    rate: (m, l) => tr(l, `A student learns about ${m} songs each week.`, `Un estudiante aprende aproximadamente ${m} canciones cada semana.`),
    start: (m, l) => tr(l, `A student could play about ${m} songs at week 0.`, `Un estudiante sabía tocar aproximadamente ${m} canciones en la semana 0.`),
    reversed: (m, l) => tr(l, `A student takes about ${m} weeks to learn 1 song.`, `Un estudiante tarda aproximadamente ${m} semanas en aprender 1 canción.`),
  },
];
/** Slopes of the fitted line as [numerator, denominator]: 1/2, 1, 3/2, 2. */
const FIT_SLOPES: [number, number][] = [[1, 2], [1, 1], [3, 2], [2, 1]];

function bestFit(r: Rng, level: number, locale: Locale): ItemBody {
  const story = r.pick(FIT_STORIES);
  const kind = level === 1 ? r.pick(["slope", "intercept"] as const) : r.pick(["predict", "predict", "predict", "meaning", "meaning"] as const);
  let n = 1, q = 1, b = 0, xmax = 0, x1 = 0, x2 = 0, data: [number, number][] = [];
  for (;;) {
    [n, q] = r.pick(FIT_SLOPES);
    b = r.int(kind === "meaning" ? 2 : story.minB, 3);
    // For "what does the slope mean", the slope must differ from 1 (or reading it backward gives the same number) and from b.
    if (kind === "meaning" && (n === q || b * q === n)) continue;
    xmax = Math.min(9, Math.floor(((12 - b) * q) / n));
    const starts = Array.from({ length: xmax + 1 }, (_, x) => x).filter((x) => x % q === 0 && (kind !== "intercept" || x >= 1));
    x1 = r.pick(starts);
    const ends = starts.filter((x) => x - x1 >= 2);
    if (!ends.length) continue;
    x2 = r.pick(ends);
    const free = r.shuffle(Array.from({ length: xmax }, (_, i) => i + 1).filter((x) => x !== x1 && x !== x2)).slice(0, 5);
    if (free.length < 3) continue;
    data = free.sort((u, v) => u - v).map((x) => [x, Math.max(0, Math.round((b * q + n * x) / q) + r.int(-1, 1))]);
    break;
  }
  const at = (x: number) => b + (n * x) / q;
  const [y1, y2] = [at(x1), at(x2)];
  const dy = y2 - y1, dx = x2 - x1;
  const mText = fracShow(n, q), mDec = dec((10 * n) / q, 1);
  const P1 = pt(x1, y1), P2 = pt(x2, y2);
  const through = tr(locale, `The line of best fit passes through ${P1} and ${P2}.`, `La recta de mejor ajuste pasa por ${P1} y ${P2}.`);
  const throughSaid = tr(locale, `The line of best fit passes through the point ${sayPt(x1, y1, "en")} and the point ${sayPt(x2, y2, "en")}.`, `La recta de mejor ajuste pasa por el punto ${sayPt(x1, y1, "es")} y el punto ${sayPt(x2, y2, "es")}.`);
  const intro = tr(locale, story.intro[0], story.intro[1]);
  const visual = { kind: "coord" as const, points: [[x1, y1], [x2, y2], ...data] as [number, number][], line: true, firstQuadrant: true };
  const alt = tr(
    locale,
    `A scatter plot of ${data.length + 2} points in the first quadrant, with a line of best fit drawn through ${P1} and ${P2}.`,
    `Un diagrama de dispersión de ${data.length + 2} puntos en el primer cuadrante, con una recta de mejor ajuste trazada por ${P1} y ${P2}.`,
  );
  const base = { visual, alt };
  const slopeStep = tr(locale, `Slope: ${dy} ÷ ${dx} = ${mText}`, `Pendiente: ${dy} ÷ ${dx} = ${mText}`);
  const back = x1 === 0 ? `b = ${b}` : `b = ${y1} − ${mText} × ${x1} = ${b}`;
  const twoPoints = tr(locale, `From ${P1} to ${P2}, y changes by ${dy} while x changes by ${dx}.`, `De ${P1} a ${P2}, y cambia ${dy} mientras x cambia ${dx}.`);

  if (kind === "slope") {
    const answer: Answer = { kind: "fraction", n, d: q, simplest: true };
    const ask = tr(locale, "What is the slope of the line of best fit? Write it as a whole number or a fraction in simplest form.", "¿Cuál es la pendiente de la recta de mejor ajuste? Escríbela como número entero o como fracción en su mínima expresión.");
    return {
      ...base,
      prompt: [`${intro} ${through} ${ask}`],
      say: `${intro} ${throughSaid} ${ask}`,
      // Half these slopes are whole numbers: on the fraction pad a whole number goes on top, the bottom left empty.
      input: "fraction",
      answer,
      wrong: wrongs(answer, [[fracTyped(dx, dy), "inverted-rise-over-run"], [String(dy), "forgot-to-divide-by-run"]]),
      hints: [
        tr(locale, "Use the two points the line passes through, not the other data points.", "Usa los dos puntos por los que pasa la recta, no los demás datos."),
        tr(locale, "Slope = change in y ÷ change in x between the two points on the line.", "Pendiente = cambio en y ÷ cambio en x entre los dos puntos de la recta."),
        tr(locale, `From ${P1} to ${P2}, y changes by ${dy}.`, `De ${P1} a ${P2}, y cambia ${dy}.`),
      ],
      steps: [tr(locale, `Change in y: ${y2} − ${y1} = ${dy}`, `Cambio en y: ${y2} − ${y1} = ${dy}`), tr(locale, `Change in x: ${x2} − ${x1} = ${dx}`, `Cambio en x: ${x2} − ${x1} = ${dx}`), slopeStep],
      seconds: 40,
    };
  }
  if (kind === "intercept") {
    const answer: Answer = { kind: "number", value: b };
    return {
      ...base,
      prompt: [`${intro} ${through} ${tr(locale, "What is the y-intercept of the line of best fit?", "¿Cuál es la intersección de la recta de mejor ajuste con el eje y?")}`],
      say: `${intro} ${throughSaid} ${tr(locale, "What is the y-intercept of the line of best fit?", "¿Cuál es la intersección de la recta de mejor ajuste con el eje y?")}`,
      input: "keypad",
      answer,
      wrong: wrongs(answer, [[String(y1), "used-a-point-not-the-intercept"], [String(data[0][1]), "read-a-data-point-instead-of-the-line"]]),
      hints: [
        tr(locale, "The y-intercept is where the line crosses the y-axis, at x = 0.", "La intersección con el eje y es donde la recta cruza el eje y, en x = 0."),
        tr(locale, "Find the slope from the two points, then work back from one point to x = 0.", "Halla la pendiente con los dos puntos y luego retrocede desde un punto hasta x = 0."),
        tr(locale, `The slope is ${dy} ÷ ${dx}.`, `La pendiente es ${dy} ÷ ${dx}.`),
      ],
      steps: [slopeStep, back, tr(locale, `y-intercept: ${b}`, `Intersección con el eje y: ${b}`)],
      seconds: 45,
    };
  }
  if (kind === "predict") {
    const lo = Math.ceil((xmax + 1) / q), hi = Math.floor(16 / q);
    const X = q * r.int(lo, hi), Y = at(X);
    const answer: Answer = { kind: "number", value: Y };
    const inverted = b + (X * q) / n;
    return {
      ...base,
      prompt: [`${intro} ${through} ${tr(locale, `Use the line of best fit to predict y when x = ${X}.`, `Usa la recta de mejor ajuste para predecir y cuando x = ${X}.`)}`],
      say: `${intro} ${throughSaid} ${tr(locale, `Use the line of best fit to predict y when x is ${X}.`, `Usa la recta de mejor ajuste para predecir y cuando x es ${X}.`)}`,
      input: "keypad",
      answer,
      wrong: wrongs(answer, [
        [String((n * X) / q), "forgot-the-intercept"],
        [String(b + dy * X), "used-rise-not-slope"],
        ...(Number.isInteger(inverted) ? [[String(inverted), "inverted-rise-over-run"] as [string, string]] : []),
      ]),
      hints: [
        tr(locale, "Write the equation of the line of best fit first, in the form y = mx + b.", "Primero escribe la ecuación de la recta de mejor ajuste, en la forma y = mx + b."),
        tr(locale, `Find the slope m and the y-intercept b, then put x = ${X} into y = mx + b.`, `Halla la pendiente m y la intersección b; luego sustituye x = ${X} en y = mx + b.`),
        twoPoints,
      ],
      steps: [slopeStep, back, `y = ${mText} × ${X} + ${b} = ${Y}`],
      seconds: 60,
    };
  }
  const right: Choice = { label: story.rate(mDec, locale) };
  const wrong: Choice[] = [
    { label: story.start(mDec, locale), why: "confused-slope-and-intercept" },
    { label: story.reversed(mDec, locale), why: "reversed-the-variables" },
    { label: story.rate(String(b), locale), why: "used-intercept-as-rate" },
  ];
  return {
    ...base,
    prompt: [`${intro} ${through} ${tr(locale, "What does the slope of the line of best fit mean here?", "¿Qué significa aquí la pendiente de la recta de mejor ajuste?")}`],
    say: `${intro} ${throughSaid} ${tr(locale, "What does the slope of the line of best fit mean here?", "¿Qué significa aquí la pendiente de la recta de mejor ajuste?")}`,
    ...choose(r, right, wrong),
    hints: [
      tr(locale, "The slope tells how much y changes each time x goes up by 1.", "La pendiente indica cuánto cambia y cada vez que x aumenta 1."),
      tr(locale, "Find the slope from the two points on the line, then say it with the units of y per unit of x.", "Halla la pendiente con los dos puntos de la recta y exprésala en unidades de y por cada unidad de x."),
      twoPoints,
    ],
    steps: [slopeStep, q === 1 ? right.label : tr(locale, `${mText} = ${mDec}, so: ${right.label}`, `${mText} = ${mDec}, así que: ${right.label}`)],
    seconds: 45,
  };
}

// ---------------------------------------------------------------- equations with one, none or infinitely many solutions

type Count = "one" | "none" | "infinite";

function eqSolutions(r: Rng, level: number, locale: Locale): ItemBody {
  const count = r.pick<Count>(["one", "none", "infinite"]);
  let A = 0, B = 0, C = 0, D = 0, x0 = 0, left = "", right = "", leftSaid = "", rightSaid = "";
  const withConst = (s: string, k: number) => (k ? `${s} ${k < 0 ? "−" : "+"} ${Math.abs(k)}` : s);
  const withConstSaid = (s: string, k: number, l: Locale) => (k ? `${s}, ${k < 0 ? tr(l, "minus", "menos") : tr(l, "plus", "más")} ${Math.abs(k)},` : s);
  for (;;) {
    // Level 2 starts from p(x + q) + e on the left, so A = p and B = pq + e.
    A = level === 2 ? r.pick([-3, -2, 2, 3, 4, 5]) : nz(r, -6, 9);
    const qq = nz(r, -6, 6), e = r.int(-9, 9);
    B = level === 2 ? A * qq + e : r.int(-12, 12);
    C = count === "one" ? nz(r, -6, 9) : A;
    if (count === "one" && C === A) continue;
    if (count === "infinite") D = B;
    else if (count === "none") D = nz(r, -12, 12) + B;
    else {
      // Half the one-solution equations keep the same constant on both sides, so x = 0: a classic trap.
      x0 = r.bool(0.5) ? 0 : nz(r, -6, 6);
      D = (A - C) * x0 + B;
    }
    if (Math.abs(D) > 40) continue;
    if (level === 1) {
      // Split A into two like terms on the left: a1x + B + a2x.
      const a2 = nz(r, -4, 4), a1 = A - a2;
      if (a1 === 0) continue;
      left = `${lin(a1, B)} ${a2 < 0 ? "−" : "+"} ${Math.abs(a2) === 1 ? "" : Math.abs(a2)}x`;
      leftSaid = `${sayLin(a1, B, locale)} ${a2 < 0 ? tr(locale, "minus", "menos") : tr(locale, "plus", "más")} ${Math.abs(a2) === 1 ? "" : `${Math.abs(a2)} `}x`;
      right = lin(C, D);
      rightSaid = sayLin(C, D, locale);
    } else {
      left = withConst(`${show(A)}(${lin(1, qq)})`, e);
      leftSaid = withConstSaid(tr(locale, `${sayNum(A, "en")} times the quantity ${sayLin(1, qq, "en")}`, `${sayNum(A, "es")} por la cantidad ${sayLin(1, qq, "es")}`), e, locale);
      // The right side is Cx + D, or C(x + t) + f when C is a small multiplier.
      const t = nz(r, -5, 5), f = D - C * t;
      const grouped = [-3, -2, 2, 3, 4, 5].includes(C) && Math.abs(f) <= 12 && r.bool(0.6);
      right = grouped ? withConst(`${show(C)}(${lin(1, t)})`, f) : lin(C, D);
      rightSaid = grouped
        ? withConstSaid(tr(locale, `${sayNum(C, "en")} times the quantity ${sayLin(1, t, "en")}`, `${sayNum(C, "es")} por la cantidad ${sayLin(1, t, "es")}`), f, locale)
        : sayLin(C, D, locale);
      if (right === left) {
        right = lin(C, D);
        rightSaid = sayLin(C, D, locale);
      }
    }
    break;
  }
  const labels: Record<Count, string> = {
    one: tr(locale, "One solution", "Una solución"),
    none: tr(locale, "No solution", "Ninguna solución"),
    infinite: tr(locale, "Infinitely many solutions", "Infinitas soluciones"),
  };
  const why: Record<Count, Partial<Record<Count, string>>> = {
    one: { none: x0 === 0 ? "thought-x-equals-0-means-no-solution" : "expected-x-terms-to-cancel", infinite: B === D ? "same-constants-means-infinitely-many" : "expected-x-terms-to-cancel" },
    none: { one: "expected-one-solution-always", infinite: "same-x-terms-means-infinitely-many" },
    infinite: { one: "read-true-statement-as-x-equals-0", none: "x-terms-canceled-means-no-solution" },
  };
  const order: Count[] = ["one", "none", "infinite"];
  const choices: Choice[] = order.map((c) => ({ label: labels[c], ...(c === count ? {} : { why: why[count][c] }) }));
  const simplified = `${lin(A, B)} = ${lin(C, D)}`;
  // A grouped right side ends in a spoken pause (", plus 6,"); the sentence ends there instead.
  rightSaid = rightSaid.replace(/,$/, "");
  const steps =
    count === "one"
      ? [simplified, `${lin(A - C, 0)} = ${show(D - B)}`, `${labels.one}: x = ${show(x0)}`]
      : count === "none"
        ? [simplified, tr(locale, `The x terms cancel: ${show(B)} = ${show(D)}, which is never true.`, `Los términos con x se cancelan: ${show(B)} = ${show(D)}, que nunca es cierto.`), labels.none]
        : [simplified, tr(locale, `The x terms cancel: ${show(B)} = ${show(D)}, which is always true.`, `Los términos con x se cancelan: ${show(B)} = ${show(D)}, que siempre es cierto.`), labels.infinite];
  return {
    prompt: [tr(locale, "How many solutions does this equation have? ", "¿Cuántas soluciones tiene esta ecuación? "), `${left} = ${right}`],
    say: tr(locale, `How many solutions does this equation have? ${leftSaid} equals ${rightSaid}.`, `¿Cuántas soluciones tiene esta ecuación? ${leftSaid} es igual a ${rightSaid}.`),
    choices,
    input: "choices",
    answer: { kind: "choice", index: order.indexOf(count) },
    hints: [
      level === 1
        ? tr(locale, "Combine like terms on each side first.", "Primero combina los términos semejantes de cada lado.")
        : tr(locale, "Simplify each side first: distribute, then combine like terms.", "Primero simplifica cada lado: distribuye y luego combina términos semejantes."),
      tr(locale, "Then compare the x terms. If they cancel, what is left is either always true or never true.", "Luego compara los términos con x. Si se cancelan, lo que queda o siempre es cierto o nunca lo es."),
      tr(locale, `Simplified, the equation is ${simplified}.`, `Simplificada, la ecuación queda ${simplified}.`),
    ],
    steps,
    seconds: level === 1 ? 35 : 50,
  };
}

// ---------------------------------------------------------------- absolute value equations

/** "|x − 3|" and its read-aloud form. */
const absShow = (p: number) => `|${lin(1, p)}|`;
const absSay = (p: number, l: Locale) => tr(l, `the absolute value of ${sayLin(1, p, "en")}`, `el valor absoluto de ${sayLin(1, p, "es")}`);

function absEquation(r: Rng, level: number, locale: Locale): ItemBody {
  const or = tr(locale, "or", "o");
  const p = nz(r, -9, 9);
  const a = level === 1 ? 1 : r.int(1, 4);
  const c = level === 1 ? 0 : nz(r, -9, 9);
  let q: number;
  if (level === 3) {
    const kind = r.pick(["two", "one", "none"] as const);
    q = kind === "two" ? r.int(1, 9) : kind === "one" ? 0 : -r.int(1, 9);
  } else q = level === 2 && r.bool(0.12) ? 0 : r.int(1, level === 1 ? 12 : 10);
  const d = a * q + c;
  const lhs = c ? `${a === 1 ? "" : a}${absShow(p)} ${c < 0 ? "−" : "+"} ${Math.abs(c)}` : `${a === 1 ? "" : a}${absShow(p)}`;
  const lhsSaid = (l: Locale) => {
    const core = a === 1 ? absSay(p, l) : `${a} ${tr(l, "times", "por")} ${absSay(p, l)}`;
    return c ? `${core}, ${c < 0 ? tr(l, "minus", "menos") : tr(l, "plus", "más")} ${Math.abs(c)},` : core;
  };
  const isolate: string[] = [];
  if (c) isolate.push(`${a === 1 ? "" : a}${absShow(p)} = ${show(d - c)}`);
  if (a !== 1) isolate.push(`${absShow(p)} = ${show(q)}`);
  const inner = lin(1, p);
  const getAlone = tr(locale, "Get the absolute value by itself first.", "Primero deja sola la expresión con valor absoluto.");

  if (level === 3) {
    const kind = q > 0 ? "two" : q === 0 ? "one" : "none";
    const labels = { two: tr(locale, "Two solutions", "Dos soluciones"), one: tr(locale, "One solution", "Una solución"), none: tr(locale, "No solution", "Ninguna solución") };
    // "Saw a negative" only fits when a negative number is on screen.
    const why: Record<string, Record<string, string>> = {
      two: { one: "only-solved-the-positive-case", none: c < 0 || d < 0 ? "saw-a-negative-and-said-no-solution" : "thought-it-has-no-solution" },
      one: { two: "expected-two-solutions-always", none: "thought-zero-means-no-solution" },
      none: { two: "forgot-absolute-value-is-never-negative", one: "forgot-absolute-value-is-never-negative" },
    };
    const order = ["two", "one", "none"] as const;
    const reason = {
      two: tr(locale, `${q} is positive, so ${inner} = ${q} or ${inner} = −${q}.`, `${q} es positivo, así que ${inner} = ${q} o ${inner} = −${q}.`),
      one: tr(locale, `Only 0 is 0 away from 0, so ${inner} = 0.`, `Solo el 0 está a distancia 0 del 0, así que ${inner} = 0.`),
      none: tr(locale, `An absolute value is never negative, so it cannot equal ${show(q)}.`, `Un valor absoluto nunca es negativo, así que no puede ser igual a ${show(q)}.`),
    }[kind];
    return {
      prompt: [tr(locale, "How many solutions does this equation have? ", "¿Cuántas soluciones tiene esta ecuación? "), `${lhs} = ${show(d)}`],
      say: tr(locale, `How many solutions does this equation have? ${lhsSaid("en")} equals ${sayNum(d, "en")}.`, `¿Cuántas soluciones tiene esta ecuación? ${lhsSaid("es")} es igual a ${sayNum(d, "es")}.`),
      choices: order.map((k) => ({ label: labels[k], ...(k === kind ? {} : { why: why[kind][k] }) })),
      input: "choices",
      answer: { kind: "choice", index: order.indexOf(kind) },
      hints: [
        getAlone,
        tr(locale, "An absolute value is a distance, so it is never negative. Compare what it equals with 0.", "Un valor absoluto es una distancia, así que nunca es negativo. Compara su valor con 0."),
        isolate[0] ?? `${absShow(p)} = ${show(q)}`,
      ],
      steps: [...isolate, reason, labels[kind]].slice(-4),
      seconds: 35,
    };
  }
  const roots = q === 0 ? [-p] : [-p + q, -p - q];
  const answer: Answer = { kind: "set", values: roots };
  const two = q === 0 ? `${inner} = 0` : `${inner} = ${q} ${or} ${inner} = −${q}`;
  const last = q === 0 ? `x = ${show(-p)}` : `x = ${show(-p + q)} ${or} x = ${show(-p - q)}`;
  const typed = (vs: number[]) => vs.join(", ");
  return {
    prompt: [tr(locale, "Solve. Give every solution, separated by commas: ", "Resuelve. Da todas las soluciones separadas por comas: "), `${lhs} = ${show(d)}`],
    say: tr(locale, `Solve: ${lhsSaid("en")} equals ${sayNum(d, "en")}. Give every solution.`, `Resuelve: ${lhsSaid("es")} es igual a ${sayNum(d, "es")}. Da todas las soluciones.`),
    input: "text",
    answer,
    wrong: wrongs(answer, [
      ...(q ? [[String(-p + q), "only-solved-the-positive-case"] as [string, string]] : []),
      [typed(q ? [p + q, p - q] : [p]), "dropped-the-sign-inside"],
      ...(c ? [[typed([-p + d, -p - d]), "solved-before-isolating"] as [string, string]] : []),
      ...(a > 1 && q ? [[typed([-p + d - c, -p - d + c]), "forgot-to-divide"] as [string, string]] : []),
    ]),
    hints:
      level === 1
        ? [
            tr(locale, `An absolute value is a distance from 0. Which two numbers are ${q} away from 0?`, `Un valor absoluto es una distancia al 0. ¿Qué dos números están a ${q} del 0?`),
            tr(locale, `So ${inner} can be ${q} or −${q}. Write two equations and solve each one.`, `Entonces ${inner} puede ser ${q} o −${q}. Escribe dos ecuaciones y resuelve cada una.`),
            two,
          ]
        : [
            getAlone,
            q === 0
              ? tr(locale, "Undo the adding or subtracting, then the multiplying. If the absolute value equals 0, what is inside it equals 0.", "Deshaz la suma o la resta y luego la multiplicación. Si el valor absoluto es igual a 0, lo que está adentro es igual a 0.")
              : tr(locale, "Undo the adding or subtracting, then the multiplying. Then write two equations, one for each sign.", "Deshaz la suma o la resta y luego la multiplicación. Después escribe dos ecuaciones, una para cada signo."),
            isolate[0],
          ],
    steps: [...isolate, ...(q === 0 ? [] : [two]), last].slice(-4),
    seconds: level === 1 ? 30 : 50,
  };
}

// ---------------------------------------------------------------- standard form and slope-intercept form

/** A slope-intercept line for display, "−(2/3)x + 4", and as typed, "-(2/3)x+4": a fraction slope in parentheses, never the ambiguous "2/3x". */
function slopeIntercept(mn: number, md: number, b: number) {
  const [n, d] = reduce(mn, md);
  const mag = Math.abs(n) === 1 && d === 1 ? "" : d === 1 ? String(Math.abs(n)) : `(${Math.abs(n)}/${d})`;
  const shownTxt = `${n < 0 ? "−" : ""}${mag}x${b ? ` ${b < 0 ? "−" : "+"} ${Math.abs(b)}` : ""}`;
  const typedTxt = `${n < 0 ? "-" : ""}${mag}x${b ? `${b < 0 ? "-" : "+"}${Math.abs(b)}` : ""}`;
  return { shown: shownTxt, typed: typedTxt };
}
/** Ax + By = C with A > 0 and no common factor, so equal lines get equal labels. */
function standard(A: number, B: number, C: number): [number, number, number] {
  const g = gcd(gcd(Math.abs(A), Math.abs(B)), Math.abs(C)) || 1;
  const s = A < 0 || (A === 0 && B < 0) ? -1 : 1;
  return [(s * A) / g, (s * B) / g, (s * C) / g];
}
const stdShow = ([A, B, C]: [number, number, number]) => `${fmt([[A, "x", 1], [B, "y", 1]])} = ${show(C)}`;
const staySay = ([A, B, C]: [number, number, number], l: Locale) => `${sayTerms([[A, "x", 1], [B, "y", 1]], l)} ${tr(l, "equals", "es igual a")} ${sayNum(C, l)}`;

function lineForms(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    let A = 0, B = 0, b = 0;
    do {
      A = r.int(1, 9);
      B = r.pick([-5, -4, -3, -2, -1, 2, 3, 4, 5]);
      b = r.int(-8, 8);
    } while (gcd(gcd(A, Math.abs(B)), Math.abs(B * b)) !== 1);
    const C = B * b;
    const key = slopeIntercept(-A, B, b);
    const answer: Answer = { kind: "expr", expr: key.typed, form: "expanded" };
    const eq = `${fmt([[A, "x", 1], [B, "y", 1]])} = ${show(C)}`;
    const byOnly = `${fmt([[B, "y", 1]])} = ${lin(-A, C)}`;
    return {
      prompt: [tr(locale, `Write ${eq} in slope-intercept form, y = mx + b.`, `Escribe ${eq} en la forma pendiente-intersección, y = mx + b.`)],
      say: tr(
        locale,
        `Write ${sayTerms([[A, "x", 1], [B, "y", 1]], "en")} equals ${sayNum(C, "en")} in slope-intercept form, y equals m x plus b.`,
        `Escribe ${sayTerms([[A, "x", 1], [B, "y", 1]], "es")} es igual a ${sayNum(C, "es")} en la forma pendiente-intersección, y igual a m x más b.`,
      ),
      input: "expr",
      answer,
      wrong: wrongs(answer, [
        [slopeIntercept(A, B, b).typed, "forgot-to-change-sign-when-moving"],
        [slopeIntercept(-A, B, C).typed, "divided-only-the-x-term"],
        [slopeIntercept(-B, A, b).typed, "divided-by-the-wrong-coefficient"],
      ]),
      hints: [
        tr(locale, "Get y by itself on one side of the equation.", "Deja y sola en un lado de la ecuación."),
        tr(locale, `Subtract ${fmt([[A, "x", 1]])} from both sides, then divide every term by ${show(B)}.`, `Resta ${fmt([[A, "x", 1]])} a ambos lados y luego divide cada término entre ${show(B)}.`),
        byOnly,
      ],
      steps: [byOnly, `y = ${key.shown}`],
      seconds: 45,
    };
  }
  let mn = 0, md = 1, b = 0;
  do {
    md = r.pick([1, 2, 2, 3, 3, 4, 5]);
    mn = nz(r, -6, 6);
    b = nz(r, -8, 8);
  } while (gcd(Math.abs(mn), md) !== 1);
  const right = standard(-mn, md, md * b);
  const asChoice = (t: [number, number, number], why?: string): Choice => ({ label: stdShow(t), say: staySay(t, locale), ...(why ? { why } : {}) });
  const wrong = [
    asChoice(standard(mn, md, md * b), "forgot-to-change-sign-when-moving"),
    asChoice(standard(-mn, md, b), "did-not-multiply-every-term"),
    asChoice(standard(-mn, md, -md * b), "moved-the-constant-without-changing-sign"),
    asChoice(standard(md, -mn, md * b), "swapped-x-and-y-coefficients"),
  ].filter((c) => c.label !== stdShow(right));
  const sign = mn < 0 ? "−" : "";
  const tail = ` ${b < 0 ? "−" : "+"} ${Math.abs(b)}`;
  const shownLine: MathPart[] = md === 1 ? [`y = ${lin(mn, b)}`] : [`y = ${sign}`, { frac: [Math.abs(mn), md] }, `x${tail}`];
  const sayLine = (l: Locale) => `y ${tr(l, "equals", "es igual a")} ${md === 1 ? sayLin(mn, b, l) : `${mn < 0 ? tr(l, "minus ", "menos ") : ""}${sayFrac(Math.abs(mn), md, l)} x ${b < 0 ? tr(l, "minus", "menos") : tr(l, "plus", "más")} ${Math.abs(b)}`}`;
  const cleared = `${md === 1 ? "" : md}y = ${lin(mn, md * b)}`;
  const moved = `${fmt([[-mn, "x", 1], [md, "y", 1]])} = ${show(md * b)}`;
  return {
    prompt: [tr(locale, "Which equation is ", "¿Qué ecuación es "), ...shownLine, tr(locale, " in standard form, Ax + By = C, with whole numbers and A positive?", " en forma estándar, Ax + By = C, con números enteros y A positivo?")],
    say: tr(
      locale,
      `The line is ${sayLine("en")}. Which equation is this line in standard form, A x plus B y equals C, with whole numbers and A positive?`,
      `La recta es ${sayLine("es")}. ¿Qué ecuación es esta recta en forma estándar, A x más B y igual a C, con números enteros y A positivo?`,
    ),
    ...choose(r, asChoice(right), wrong),
    hints: [
      tr(locale, "Standard form has the x and y terms on the left, a number on the right, and whole-number coefficients.", "La forma estándar tiene los términos con x y con y a la izquierda, un número a la derecha y coeficientes enteros."),
      md === 1
        ? tr(locale, "Move the x term to the left side. If its coefficient is negative, multiply every term by −1.", "Pasa el término con x al lado izquierdo. Si su coeficiente es negativo, multiplica cada término por −1.")
        : tr(locale, `Multiply every term by ${md} to clear the fraction, then move the x term to the left.`, `Multiplica cada término por ${md} para quitar la fracción y luego pasa el término con x a la izquierda.`),
      md === 1
        ? tr(locale, `Move ${fmt([[mn, "x", 1]])} to the left side by doing the opposite operation on both sides.`, `Pasa ${fmt([[mn, "x", 1]])} al lado izquierdo haciendo la operación opuesta en ambos lados.`)
        : tr(locale, `Multiplying by ${md} gives ${cleared}.`, `Al multiplicar por ${md} queda ${cleared}.`),
    ],
    steps: [
      ...(md === 1 ? [] : [cleared]),
      md === 1 ? tr(locale, `Move ${fmt([[mn, "x", 1]])} to the left: ${moved}`, `Pasa ${fmt([[mn, "x", 1]])} a la izquierda: ${moved}`) : moved,
      ...(moved === stdShow(right) ? [] : [tr(locale, `Multiply every term by −1: ${stdShow(right)}`, `Multiplica cada término por −1: ${stdShow(right)}`)]),
    ],
    seconds: 50,
  };
}

// ---------------------------------------------------------------- systems by elimination

function elimination(r: Rng, level: number, locale: Locale): ItemBody {
  const names = ["x", "y"];
  let e1 = [0, 0], e2 = [0, 0], sol = [0, 0], k = 1;
  for (;;) {
    sol = [r.int(-6, 6), r.int(-6, 6)];
    // (0, 0) makes both right sides 0, and swapping or flipping a sign gives the same pair.
    if (!sol[0] && !sol[1]) continue;
    if (level === 1) {
      const b1 = nz(r, -5, 5), form = r.pick(["opp", "same", "mult"] as const);
      const b2 = form === "opp" ? -b1 : form === "same" ? b1 : r.pick([2, 3, -2, -3]) * b1;
      e1 = [nz(r, -5, 5), b1];
      e2 = [nz(r, -5, 5), b2];
      k = 1;
      // Half the time the matching coefficients are on x instead of y.
      if (r.bool()) {
        e1 = [e1[1], e1[0]];
        e2 = [e2[1], e2[0]];
        k = 0;
      }
    } else {
      const c = () => r.int(2, 6) * (r.bool(0.35) ? -1 : 1);
      e1 = [c(), c()];
      e2 = [c(), c()];
      const apart = (u: number, v: number) => Math.abs(u) % Math.abs(v) !== 0 && Math.abs(v) % Math.abs(u) !== 0;
      if (!apart(e1[0], e2[0]) || !apart(e1[1], e2[1])) continue;
      k = lcm(Math.abs(e1[1]), Math.abs(e2[1])) <= lcm(Math.abs(e1[0]), Math.abs(e2[0])) ? 1 : 0;
    }
    if (e1[0] * e2[1] - e2[0] * e1[1] === 0) continue;
    const c1 = e1[0] * sol[0] + e1[1] * sol[1], c2 = e2[0] * sol[0] + e2[1] * sol[1];
    if (Math.abs(c1) > 40 || Math.abs(c2) > 40) continue;
    break;
  }
  const j = 1 - k;
  const c1 = e1[0] * sol[0] + e1[1] * sol[1], c2 = e2[0] * sol[0] + e2[1] * sol[1];
  const L = lcm(Math.abs(e1[k]), Math.abs(e2[k]));
  const m1 = L / Math.abs(e1[k]), m2 = (-Math.sign(e1[k]) * Math.sign(e2[k]) * L) / Math.abs(e2[k]);
  const K = m1 * e1[j] + m2 * e2[j], R = m1 * c1 + m2 * c2;
  const eqShow = (e: number[], c: number) => `${fmt([[e[0], "x", 1], [e[1], "y", 1]])} = ${show(c)}`;
  const eqSay = (e: number[], c: number, l: Locale) => `${sayTerms([[e[0], "x", 1], [e[1], "y", 1]], l)} ${tr(l, "equals", "es igual a")} ${sayNum(c, l)}`;
  const how =
    m1 === 1 && m2 === 1
      ? tr(locale, "Add the two equations", "Suma las dos ecuaciones")
      : m1 === 1 && m2 === -1
        ? tr(locale, "Subtract the second equation from the first", "Resta la segunda ecuación de la primera")
        : m1 === 1
          ? tr(locale, `Multiply the second equation by ${show(m2)}, then add`, `Multiplica la segunda ecuación por ${show(m2)} y luego suma`)
          : m2 === 1
            ? tr(locale, `Multiply the first equation by ${m1}, then add`, `Multiplica la primera ecuación por ${m1} y luego suma`)
            : m2 === -1
              ? tr(locale, `Multiply the first equation by ${m1}, then subtract the second equation`, `Multiplica la primera ecuación por ${m1} y luego resta la segunda ecuación`)
              : tr(locale, `Multiply the first equation by ${m1} and the second by ${show(m2)}, then add`, `Multiplica la primera ecuación por ${m1} y la segunda por ${show(m2)}, y luego suma`);
  const v = names[j], u = names[k];
  const combined = `${fmt([[K, v, 1]])} = ${show(R)}`;
  const known = `${e1[j] === 1 ? "" : e1[j] === -1 ? "−" : show(e1[j])}(${show(sol[j])})`, unknown = fmt([[e1[k], u, 1]]);
  const ordered = j === 0 ? [known, unknown] : [unknown, known];
  const back = `${ordered[0]} ${ordered[1].startsWith("−") ? `− ${ordered[1].slice(1)}` : `+ ${ordered[1]}`} = ${show(c1)}`;
  const so = tr(locale, "so", "así que");
  const answer: Answer = { kind: "pair", x: sol[0], y: sol[1] };
  return {
    prompt: [tr(locale, "Solve the system by elimination. Write the answer as (x, y). ", "Resuelve el sistema por eliminación. Escribe la respuesta como (x, y). "), eqShow(e1, c1), ";   ", eqShow(e2, c2)],
    say: tr(
      locale,
      `Solve the system by elimination. First equation: ${eqSay(e1, c1, "en")}. Second equation: ${eqSay(e2, c2, "en")}. Write the answer as the ordered pair x, y.`,
      `Resuelve el sistema por eliminación. Primera ecuación: ${eqSay(e1, c1, "es")}. Segunda ecuación: ${eqSay(e2, c2, "es")}. Escribe la respuesta como el par ordenado x, y.`,
    ),
    input: "text",
    answer,
    wrong: wrongs(answer, [
      [ptTyped(sol[1], sol[0]), "swapped-x-and-y"],
      [ptTyped(j === 0 ? sol[0] : -sol[0], j === 0 ? -sol[1] : sol[1]), "sign-error-in-back-substitution"],
    ]),
    hints: [
      level === 1
        ? tr(locale, "Look for a variable whose coefficients in the two equations are the same, opposites, or one a multiple of the other.", "Busca una variable cuyos coeficientes en las dos ecuaciones sean iguales, opuestos o uno múltiplo del otro.")
        : tr(locale, "Neither variable cancels yet. Pick one and multiply so its coefficients become opposites.", "Todavía no se cancela ninguna variable. Elige una y multiplica para que sus coeficientes queden opuestos."),
      tr(locale, `${how} so that ${u} cancels. Solve for ${v}, then substitute back to find ${u}.`, `${how} para que ${u} se cancele. Resuelve para ${v}. Luego sustituye para hallar ${u}.`),
      tr(locale, `That gives ${combined}.`, `Eso da ${combined}.`),
    ],
    steps: [K === 1 ? `${how}: ${combined}` : `${how}: ${combined}, ${so} ${v} = ${show(sol[j])}`, `${back}, ${so} ${u} = ${show(sol[k])}`, pt(sol[0], sol[1])],
    seconds: level === 1 ? 75 : 100,
  };
}

// ---------------------------------------------------------------- domain and range

const setShow = (vs: number[]) => `{${vs.map(show).join(", ")}}`;
const uniqSorted = (vs: number[]) => [...new Set(vs)].sort((a, b) => a - b);
/**
 * "f(−2) = (−2)² + 1": a rule with the input put in, before the arithmetic. The input goes in
 * parentheses after a coefficient or a minus sign, and when it is 0 or negative: 3(2), −(2)², (−2)², (0).
 * Never "−2²", which many learners read as (−2)².
 */
function substitute(ts: Term[], x: number) {
  return ts
    .filter(([c]) => c !== 0)
    .map(([c, v, p], i) => {
      const mag = Math.abs(c);
      const sign = i ? (c < 0 ? " − " : " + ") : c < 0 ? "−" : "";
      if (!v) return sign + mag;
      const input = x <= 0 || mag !== 1 || c < 0 ? `(${show(x)})` : show(x);
      return sign + (mag === 1 ? "" : mag) + input + (p >= 2 ? sup(p) : "");
    })
    .join("");
}
const evalTerms = (ts: Term[], x: number) => ts.reduce((s, [c, v, p]) => s + c * (v ? x ** p : 1), 0);

function domainRange(r: Rng, level: number, locale: Locale): ItemBody {
  const listNote = tr(locale, " List the values separated by commas.", " Escribe los valores separados por comas.");
  const listNoteSaid = tr(locale, " List the values, separated by commas.", " Escribe los valores, separados por comas.");
  const rule = tr(locale, "The domain is the set of inputs (x-values). The range is the set of outputs (y-values).", "El dominio es el conjunto de entradas (valores de x). El rango es el conjunto de salidas (valores de y).");
  const typedList = (vs: number[]) => vs.join(", ");
  if (level === 1) {
    const { pairs } = relation(r, r.int(4, 5), true, r.bool(0.7));
    const askDomain = r.bool(0.4);
    const xs = pairs.map((p) => p[0]), ys = pairs.map((p) => p[1]);
    const want = uniqSorted(askDomain ? xs : ys), other = uniqSorted(askDomain ? ys : xs);
    const answer: Answer = { kind: "set", values: want };
    const asTable = r.bool();
    const what = askDomain ? tr(locale, "domain", "dominio") : tr(locale, "range", "rango");
    const given = asTable
      ? tr(locale, `A function pairs these x-values with these y-values, in order. x: ${xs.map(show).join(", ")}; y: ${ys.map(show).join(", ")}.`, `Una función empareja estos valores de x con estos valores de y, en orden. x: ${xs.map(show).join(", ")}; y: ${ys.map(show).join(", ")}.`)
      : tr(locale, `A function is the set of pairs ${pairsText(pairs)}.`, `Una función es el conjunto de pares ${pairsText(pairs)}.`);
    const givenSaid = tr(locale, `A function pairs ${pairs.map(([x, y]) => `x ${sayNum(x, "en")} with y ${sayNum(y, "en")}`).join(", ")}.`, `Una función empareja ${pairs.map(([x, y]) => `x ${sayNum(x, "es")} con y ${sayNum(y, "es")}`).join(", ")}.`);
    const [fx, fy] = pairs[0];
    return {
      prompt: [`${given} ${tr(locale, `What is its ${what}?`, `¿Cuál es su ${what}?`)}${listNote}`],
      say: `${givenSaid} ${tr(locale, `What is its ${what}?`, `¿Cuál es su ${what}?`)}${listNoteSaid}`,
      input: "text",
      answer,
      wrong: wrongs(answer, [[typedList(other), "swapped-domain-and-range"], [typedList(uniqSorted([...xs, ...ys])), "listed-every-number"]]),
      hints: [
        rule,
        askDomain
          ? tr(locale, "List each x-value once, from least to greatest.", "Escribe cada valor de x una sola vez, de menor a mayor.")
          : tr(locale, "List each y-value once, even if it appears more than once.", "Escribe cada valor de y una sola vez, aunque aparezca más de una vez."),
        tr(locale, `The pair ${pt(fx, fy)} puts ${show(askDomain ? fx : fy)} in the ${what}.`, `El par ${pt(fx, fy)} pone ${show(askDomain ? fx : fy)} en el ${what}.`),
      ],
      steps: [
        askDomain ? tr(locale, `The x-values are ${xs.map(show).join(", ")}.`, `Los valores de x son ${xs.map(show).join(", ")}.`) : tr(locale, `The y-values are ${ys.map(show).join(", ")}.`, `Los valores de y son ${ys.map(show).join(", ")}.`),
        `${cap(what)}: ${setShow(want)}`,
      ],
      seconds: 30,
    };
  }
  const square = r.bool();
  let ts: Term[], dom: number[], vals: number[];
  // The range must differ from the domain: f(x) = x, or −x on a balanced domain, would give it away.
  do {
    ts = square ? [[r.pick([1, 1, -1, 2]), "x", 2], [r.int(-5, 5), "", 0]] : [[nz(r, -4, 4), "x", 1], [r.int(-6, 6), "", 0]];
    do {
      dom = uniqSorted(r.shuffle(Array.from({ length: 9 }, (_, i) => i - 4)).slice(0, 4));
    } while (square && r.bool(0.7) && !dom.some((v) => v > 0 && dom.includes(-v)));
    vals = dom.map((x) => evalTerms(ts, x));
  } while (uniqSorted(vals).join() === dom.join());
  const want = uniqSorted(vals);
  const answer: Answer = { kind: "set", values: want };
  const rule2 = fmt(ts);
  const negSquared = dom.map((x) => evalTerms(ts, x) - (x < 0 ? 2 * ts[0][0] * x * x : 0));
  return {
    prompt: [tr(locale, `f(x) = ${rule2}, with domain ${setShow(dom)}. What is the range?`, `f(x) = ${rule2}, con dominio ${setShow(dom)}. ¿Cuál es el rango?`), listNote],
    say: tr(
      locale,
      `f of x equals ${sayTerms(ts, "en")}, with domain ${dom.map((v) => sayNum(v, "en")).join(", ")}. What is the range?${listNoteSaid}`,
      `f de x es igual a ${sayTerms(ts, "es")}, con dominio ${dom.map((v) => sayNum(v, "es")).join(", ")}. ¿Cuál es el rango?${listNoteSaid}`,
    ),
    input: "text",
    answer,
    wrong: wrongs(answer, [[typedList(dom), "gave-the-domain"], ...(square ? [[typedList(uniqSorted(negSquared)), "squared-negative-as-negative"] as [string, string]] : [])]),
    hints: [
      rule,
      tr(locale, "Put each number of the domain into f. The outputs make the range; list each one once.", "Sustituye cada número del dominio en f. Las salidas forman el rango; escribe cada una una sola vez."),
      `f(${show(dom[0])}) = ${substitute(ts, dom[0])}`,
    ],
    steps: [dom.map((x, i) => `f(${show(x)}) = ${show(vals[i])}`).join(";  "), `${tr(locale, "Range", "Rango")}: ${setShow(want)}`],
    seconds: 45,
  };
}

// ---------------------------------------------------------------- average rate of change

function rateOfChange(r: Rng, level: number, locale: Locale): ItemBody {
  const meaning = tr(locale, "Average rate of change = change in the output ÷ change in the input.", "Tasa de cambio promedio = cambio en la salida ÷ cambio en la entrada.");
  if (level === 1) {
    const rocket = r.bool(0.35);
    const x0 = rocket ? 0 : r.int(-2, 1);
    const xs = Array.from({ length: 6 }, (_, i) => x0 + i);
    const v = r.pick([30, 35, 40, 45, 50]);
    const ys = rocket ? xs.map((t) => v * t - 5 * t * t) : xs.map(() => r.int(-10, 20));
    let i = 0, j = 0;
    do {
      i = r.int(0, 4);
      j = r.int(i + 1, 5);
      // Two zero outputs leave no likely wrong value but 0 itself.
    } while ((!rocket && j - i < 2) || (ys[i] === 0 && ys[j] === 0));
    const [a, b, fa, fb] = [xs[i], xs[j], ys[i], ys[j]];
    const dy = fb - fa, dx = b - a;
    const [n, d] = reduce(dy, dx);
    const answer: Answer = { kind: "fraction", n, d, simplest: true };
    const f = rocket ? "h" : "f", v0 = rocket ? "t" : "x";
    const table = `${v0}: ${xs.map(show).join(", ")}; ${f}(${v0}): ${ys.map(show).join(", ")}.`;
    const tableSaid = (l: Locale) => xs.map((x, k) => `${v0} ${sayNum(x, l)}, ${sayNum(ys[k], l)}`).join("; ");
    // The values are listed as text (inputs, then outputs), not drawn as a table, so the words say "values".
    const intro = rocket
      ? tr(locale, `A model rocket is launched. These values give its height h, in meters, t seconds after launch. ${table}`, `Se lanza un cohete de juguete. Estos valores dan su altura h, en metros, t segundos después del lanzamiento. ${table}`)
      : tr(locale, `A function f has these values. ${table}`, `Una función f tiene estos valores. ${table}`);
    const introSaid = rocket
      ? tr(locale, `A model rocket is launched. These values give its height in meters, t seconds after launch: ${tableSaid("en")}.`, `Se lanza un cohete de juguete. Estos valores dan su altura en metros, t segundos después del lanzamiento: ${tableSaid("es")}.`)
      : tr(locale, `A function f has these values: ${tableSaid("en")}.`, `Una función f tiene estos valores: ${tableSaid("es")}.`);
    // The fraction pad takes a whole number on top with the bottom left empty, so every key can be entered.
    const form = tr(locale, "Write it as a whole number or a fraction in simplest form.", "Escríbela como número entero o como fracción en su mínima expresión.");
    const q = rocket
      ? tr(locale, `What is the average rate of change of the height from t = ${a} to t = ${b}, in meters per second? ${form}`, `¿Cuál es la tasa de cambio promedio de la altura desde t = ${a} hasta t = ${b}, en metros por segundo? ${form}`)
      : tr(locale, `What is the average rate of change of f from x = ${show(a)} to x = ${show(b)}? ${form}`, `¿Cuál es la tasa de cambio promedio de f desde x = ${show(a)} hasta x = ${show(b)}? ${form}`);
    const qSaid = rocket
      ? tr(locale, `What is the average rate of change of the height from t equals ${a} to t equals ${b}, in meters per second? ${form}`, `¿Cuál es la tasa de cambio promedio de la altura desde t igual a ${a} hasta t igual a ${b}, en metros por segundo? ${form}`)
      : tr(locale, `What is the average rate of change of f from x equals ${sayNum(a, "en")} to x equals ${sayNum(b, "en")}? ${form}`, `¿Cuál es la tasa de cambio promedio de f desde x igual a ${sayNum(a, "es")} hasta x igual a ${sayNum(b, "es")}? ${form}`);
    return {
      prompt: [`${intro} ${q}`],
      say: `${introSaid} ${qSaid}`,
      input: "fraction",
      keys: ["-"],
      answer,
      wrong: wrongs(answer, [
        ...(dy ? [[fracTyped(dx, dy), "inverted-rise-over-run"] as [string, string], [fracTyped(-dy, dx), "subtracted-in-different-orders"] as [string, string]] : []),
        [String(dy), "forgot-to-divide-by-change-in-x"],
        [fracTyped(fb + fa, dx), "added-instead-of-subtracting"],
      ]),
      hints: [
        meaning,
        tr(locale, `Find ${f}(${show(a)}) and ${f}(${show(b)}) in the list. Subtract them in the same order as the inputs, then divide.`, `Busca ${f}(${show(a)}) y ${f}(${show(b)}) en la lista de valores. Réstalos en el mismo orden que las entradas y luego divide.`),
        tr(locale, `${f}(${show(b)}) = ${show(fb)} and ${f}(${show(a)}) = ${show(fa)}.`, `${f}(${show(b)}) = ${show(fb)} y ${f}(${show(a)}) = ${show(fa)}.`),
      ],
      steps: [`${f}(${show(b)}) − ${f}(${show(a)}) = ${show(fb)} − ${par(fa)} = ${show(dy)}`, `${show(b)} − ${par(a)} = ${dx}`, `${show(dy)} ÷ ${dx} = ${fracShow(dy, dx)}`],
      seconds: 40,
    };
  }
  const ts: Term[] = [[r.pick([1, -1, 2, -2, 3]), "x", 2], [r.int(-6, 6), "x", 1], [r.int(-9, 9), "", 0]];
  let p = 0, q = 0;
  do {
    p = r.int(-4, 3);
    q = r.int(p + 1, 5);
    // A rate of 0 leaves no likely wrong value a keypad can type: −0 and the unscaled change are 0 too.
  } while ((q - p === 1 && r.bool(0.7)) || evalTerms(ts, q) === evalTerms(ts, p));
  const fp = evalTerms(ts, p), fq = evalTerms(ts, q);
  const dy = fq - fp, dx = q - p, ans = dy / dx;
  const answer: Answer = { kind: "number", value: ans };
  // (−3)² taken as −9: the x² term keeps the sign of x.
  const negSq = (x: number) => ts[0][0] * x * Math.abs(x) + ts[1][0] * x + ts[2][0];
  const ifWhole = (n: number, why: string): [string, string][] => (Number.isInteger(n) ? [[String(n), why]] : []);
  return {
    prompt: [tr(locale, `f(x) = ${fmt(ts)}. Find the average rate of change of f from x = ${show(p)} to x = ${show(q)}.`, `f(x) = ${fmt(ts)}. Halla la tasa de cambio promedio de f desde x = ${show(p)} hasta x = ${show(q)}.`)],
    say: tr(
      locale,
      `f of x equals ${sayTerms(ts, "en")}. Find the average rate of change of f from x equals ${sayNum(p, "en")} to x equals ${sayNum(q, "en")}.`,
      `f de x es igual a ${sayTerms(ts, "es")}. Halla la tasa de cambio promedio de f desde x igual a ${sayNum(p, "es")} hasta x igual a ${sayNum(q, "es")}.`,
    ),
    input: "keypad",
    keys: ["-"],
    answer,
    wrong: wrongs(answer, [
      ...(dx !== 1 ? [[String(dy), "forgot-to-divide-by-change-in-x"] as [string, string]] : []),
      [String(-ans), "subtracted-in-different-orders"],
      ...ifWhole((fq + fp) / dx, "added-instead-of-subtracting"),
      ...ifWhole((negSq(q) - negSq(p)) / dx, "squared-negative-as-negative"),
    ]),
    hints: [
      meaning,
      tr(locale, `Find f(${show(p)}) and f(${show(q)}), subtract, then divide by ${show(q)} − ${par(p)}.`, `Halla f(${show(p)}) y f(${show(q)}), réstalos y luego divide entre ${show(q)} − ${par(p)}.`),
      `f(${show(q)}) = ${substitute(ts, q)}`,
    ],
    steps: [`f(${show(q)}) = ${show(fq)};  f(${show(p)}) = ${show(fp)}`, `(${show(fq)} − ${par(fp)}) ÷ (${show(q)} − ${par(p)}) = ${show(dy)} ÷ ${dx}`, `= ${show(ans)}`],
    seconds: 60,
  };
}

// ---------------------------------------------------------------- arithmetic and geometric sequences

const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const subN = (n: number | string) => String(n).replace(/\d/g, (c) => SUBS[Number(c)]);
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;

function sequences(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const story = r.bool(0.4) ? r.pick(["seats", "points"] as const) : null;
    let a1 = 0, d = 0, n = 0, ans = 0;
    do {
      a1 = story === "seats" ? r.int(10, 24) : story === "points" ? r.int(2, 10) * 5 : r.int(-10, 20);
      d = story === "seats" ? r.int(2, 4) : story === "points" ? r.int(1, 3) * 5 : nz(r, -7, 9);
      n = r.int(8, story ? 20 : 30);
      ans = a1 + (n - 1) * d;
    } while (ans === d || ans === a1);
    const first4 = [0, 1, 2, 3].map((i) => a1 + i * d);
    const terms4 = `${first4.map(show).join(", ")}, …`;
    const q =
      story === "seats"
        ? tr(locale, `The first row of a concert hall has ${a1} seats. Each row has ${d} more seats than the row in front of it. How many seats are in row ${n}?`, `La primera fila de una sala de conciertos tiene ${a1} asientos. Cada fila tiene ${d} asientos más que la fila de adelante. ¿Cuántos asientos hay en la fila ${n}?`)
        : story === "points"
          ? tr(locale, `A video game gives ${a1} points for level 1 and ${d} more points for each new level. How many points does level ${n} give?`, `Un videojuego da ${a1} puntos por el nivel 1 y ${d} puntos más por cada nivel nuevo. ¿Cuántos puntos da el nivel ${n}?`)
          : tr(locale, `Find the ${ordinal(n)} term of the arithmetic sequence ${terms4}`, `Halla el término ${n} de la sucesión aritmética ${terms4}`);
    const qSaid = story ? q : tr(locale, `Find term number ${n} of the arithmetic sequence ${first4.map((v) => sayNum(v, "en")).join(", ")}, and so on.`, `Halla el término ${n} de la sucesión aritmética ${first4.map((v) => sayNum(v, "es")).join(", ")}, y así sucesivamente.`);
    const answer: Answer = { kind: "number", value: ans };
    return {
      prompt: [q],
      say: qSaid,
      input: "keypad",
      keys: ["-"],
      answer,
      wrong: wrongs(answer, [[String(a1 + n * d), "off-by-one-term"], [String(n * d), "forgot-the-first-term"]]),
      hints: [
        story ? tr(locale, `The numbers go up by the same amount each time: ${terms4}`, `Los números aumentan lo mismo cada vez: ${terms4}`) : tr(locale, "Find the common difference: subtract a term from the next one.", "Halla la diferencia común: resta un término del siguiente."),
        tr(locale, "The nth term is aₙ = a₁ + d(n − 1): start at the first term and add the difference n − 1 times.", "El término n es aₙ = a₁ + d(n − 1): empieza en el primer término y suma la diferencia n − 1 veces."),
        tr(locale, `a₁ = ${show(a1)} and d = ${show(d)}.`, `a₁ = ${show(a1)} y d = ${show(d)}.`),
      ],
      steps: [`d = ${show(first4[1])} − ${par(a1)} = ${show(d)}`, `a${subN(n)} = ${show(a1)} + ${par(d)}(${n} − 1)`, `= ${show(a1)} + ${par((n - 1) * d)} = ${show(ans)}`],
      seconds: 40,
    };
  }
  if (level === 2) {
    const ratio = r.pick(["2", "3", "-2", "1/2"] as const);
    const story = ratio === "1/2" ? r.bool(0.5) : ratio === "3" && r.bool(0.4);
    let a1 = 0, n = 0;
    if (ratio === "1/2") {
      n = r.int(5, 7);
      a1 = r.int(1, 5) * 2 ** (n - 1);
    } else {
      n = ratio === "3" ? r.int(5, 7) : r.int(5, 9);
      a1 = r.int(story ? 2 : 1, ratio === "3" ? 4 : 5);
    }
    // Every term as a whole number: a1 · r^(i − 1), with the halves exact by the choice of a1.
    const term = (i: number) => (ratio === "1/2" ? a1 / 2 ** (i - 1) : a1 * Number(ratio) ** (i - 1));
    const ans = term(n);
    const first4 = [1, 2, 3, 4].map(term);
    const terms4 = `${first4.map(show).join(", ")}, …`;
    const rShow = ratio === "1/2" ? "1/2" : show(Number(ratio));
    const rPar = ratio === "1/2" ? "(1/2)" : Number(ratio) < 0 ? `(${rShow})` : rShow;
    const q = story
      ? ratio === "1/2"
        ? tr(locale, `A ball bounces so that each bounce reaches half the height of the one before. The first bounce reaches ${a1} cm. How high, in centimeters, does bounce ${n} reach?`, `Una pelota rebota de modo que cada rebote alcanza la mitad de la altura del anterior. El primer rebote alcanza ${a1} cm. ¿Qué altura, en centímetros, alcanza el rebote ${n}?`)
        : tr(locale, `${a1} people share a new song on day 1. Each day, 3 times as many people share it as the day before. How many people share it on day ${n}?`, `${a1} personas comparten una canción nueva el día 1. Cada día la comparte el triple de personas que el día anterior. ¿Cuántas personas la comparten el día ${n}?`)
      : tr(locale, `Find the ${ordinal(n)} term of the geometric sequence ${terms4}`, `Halla el término ${n} de la sucesión geométrica ${terms4}`);
    const qSaid = story
      ? q.replace(/ cm\./, tr(locale, " centimeters.", " centímetros."))
      : tr(locale, `Find term number ${n} of the geometric sequence ${first4.map((v) => sayNum(v, "en")).join(", ")}, and so on.`, `Halla el término ${n} de la sucesión geométrica ${first4.map((v) => sayNum(v, "es")).join(", ")}, y así sucesivamente.`);
    const answer: Answer = { kind: "number", value: ans };
    const offByOne = ratio === "1/2" ? fracTyped(a1, 2 ** n) : String(a1 * Number(ratio) ** n);
    const power = ratio === "1/2" ? 2 ** (n - 1) : Number(ratio) ** (n - 1);
    return {
      prompt: [q],
      say: qSaid,
      input: "keypad",
      keys: ["-"],
      answer,
      wrong: wrongs(answer, [[offByOne, "off-by-one-exponent"], ...(ratio === "1/2" ? [] : [[String(a1 + (n - 1) * Number(ratio)), "added-instead-of-multiplied"] as [string, string]])]),
      hints: [
        tr(locale, "Find the common ratio: divide a term by the one before it.", "Halla la razón común: divide un término entre el anterior."),
        tr(locale, "The nth term is aₙ = a₁ · rⁿ⁻¹: start at the first term and multiply by the ratio n − 1 times.", "El término n es aₙ = a₁ · rⁿ⁻¹: empieza en el primer término y multiplica por la razón n − 1 veces."),
        tr(locale, `a₁ = ${show(a1)} and r = ${rShow}.`, `a₁ = ${show(a1)} y r = ${rShow}.`),
      ],
      steps: [
        `r = ${show(first4[1])} ÷ ${par(first4[0])} = ${rShow}`,
        `a${subN(n)} = ${show(a1)} · ${rPar}${sup(n - 1)}`,
        ratio === "1/2" ? `= ${show(a1)} ÷ ${power} = ${show(ans)}` : `= ${show(a1)} · ${par(power)} = ${show(ans)}`,
      ],
      seconds: 45,
    };
  }
  const arith = r.bool();
  const a1 = arith ? r.int(2, 9) : r.int(2, 5);
  const k = arith ? r.pick([2, 3, 4, 5, 6, 7, 8, 9, -2, -3, -4]) : r.pick([2, 3, 4, -2, -3]);
  const first4 = [0, 1, 2, 3].map((i) => (arith ? a1 + i * k : a1 * k ** i));
  const addRule = (a: number, dd: number, tail: string) => `aₙ = ${a} ${dd < 0 ? "−" : "+"} ${Math.abs(dd)}${tail}`;
  const sayAdd = (a: number, dd: number, tail: "n-1" | "n", l: Locale) =>
    `${tr(l, "a sub n equals", "a sub n es igual a")} ${a} ${dd < 0 ? tr(l, "minus", "menos") : tr(l, "plus", "más")} ${Math.abs(dd)} ${tail === "n" ? tr(l, "times n", "por n") : tr(l, "times the quantity n minus 1", "por la cantidad n menos 1")}`;
  const mulRule = (a: number, base: number, exp: "n-1" | "n") => `aₙ = ${a} · ${base < 0 ? `(${show(base)})` : base}${exp === "n" ? "ⁿ" : "ⁿ⁻¹"}`;
  const sayMul = (a: number, base: number, exp: "n-1" | "n", l: Locale) =>
    `${tr(l, "a sub n equals", "a sub n es igual a")} ${a} ${tr(l, "times", "por")} ${sayNum(base, l)} ${exp === "n" ? tr(l, "to the power of n", "elevado a la n") : tr(l, "to the power of n minus 1", "elevado a la n menos 1")}`;
  const right: Choice = arith ? { label: addRule(a1, k, "(n − 1)"), say: sayAdd(a1, k, "n-1", locale) } : { label: mulRule(a1, k, "n-1"), say: sayMul(a1, k, "n-1", locale) };
  const wrong: Choice[] = arith
    ? [
        { label: addRule(a1, k, "n"), say: sayAdd(a1, k, "n", locale), why: "off-by-one-term" },
        ...(Math.abs(k) !== a1 && k > 0 ? [{ label: addRule(k, a1, "(n − 1)"), say: sayAdd(k, a1, "n-1", locale), why: "swapped-first-term-and-difference" }] : []),
        ...(k > 1 ? [{ label: mulRule(a1, k, "n-1"), say: sayMul(a1, k, "n-1", locale), why: "mixed-up-arithmetic-and-geometric" }] : []),
        { label: addRule(a1, -k, "(n − 1)"), say: sayAdd(a1, -k, "n-1", locale), why: "wrong-sign-on-difference" },
      ]
    : [
        { label: mulRule(a1, k, "n"), say: sayMul(a1, k, "n", locale), why: "off-by-one-exponent" },
        ...(k > 0 && k !== a1 ? [{ label: mulRule(k, a1, "n-1"), say: sayMul(k, a1, "n-1", locale), why: "swapped-first-term-and-ratio" }] : []),
        { label: addRule(a1, k, "(n − 1)"), say: sayAdd(a1, k, "n-1", locale), why: "mixed-up-arithmetic-and-geometric" },
      ];
  const terms4 = `${first4.map(show).join(", ")}, …`;
  return {
    prompt: [tr(locale, `Which rule gives the nth term of the sequence ${terms4}?`, `¿Qué regla da el término n de la sucesión ${terms4}?`)],
    say: tr(locale, `Which rule gives term number n of the sequence ${first4.map((v) => sayNum(v, "en")).join(", ")}, and so on?`, `¿Qué regla da el término n de la sucesión ${first4.map((v) => sayNum(v, "es")).join(", ")}, y así sucesivamente?`),
    ...choose(r, right, wrong),
    hints: [
      tr(locale, "Check whether you add the same number each time or multiply by the same number each time.", "Revisa si cada vez se suma el mismo número o se multiplica por el mismo número."),
      tr(locale, "Arithmetic rule: aₙ = a₁ + d(n − 1). Geometric rule: aₙ = a₁ · rⁿ⁻¹.", "Regla aritmética: aₙ = a₁ + d(n − 1). Regla geométrica: aₙ = a₁ · rⁿ⁻¹."),
      arith
        ? k > 0
          ? tr(locale, `Each term is ${k} more than the one before.`, `Cada término es ${k} más que el anterior.`)
          : tr(locale, `Each term is ${-k} less than the one before.`, `Cada término es ${-k} menos que el anterior.`)
        : tr(locale, `Each term is ${show(k)} times the one before.`, `Cada término es ${show(k)} veces el anterior.`),
    ],
    steps: [
      arith ? `${show(first4[1])} − ${par(first4[0])} = ${show(k)}` : `${show(first4[1])} ÷ ${par(first4[0])} = ${show(k)}`,
      arith ? tr(locale, `First term ${a1}, common difference ${show(k)}`, `Primer término ${a1}, diferencia común ${show(k)}`) : tr(locale, `First term ${a1}, common ratio ${show(k)}`, `Primer término ${a1}, razón común ${show(k)}`),
      right.label,
    ],
    seconds: 35,
  };
}

// ---------------------------------------------------------------- exponential growth and decay

/** Whole cents as dollars: 92610 → "$926.10", 121000 → "$1210". */
const money = (cents: number) => `$${Math.floor(cents / 100)}${cents % 100 ? `.${String(cents % 100).padStart(2, "0")}` : ""}`;
const sayMoney = (cents: number, l: Locale) => {
  const d = Math.floor(cents / 100), c = cents % 100;
  const dollars = `${d} ${tr(l, d === 1 ? "dollar" : "dollars", d === 1 ? "dólar" : "dólares")}`;
  return c ? `${dollars} ${tr(l, "and", "con")} ${c} ${tr(l, c === 1 ? "cent" : "cents", c === 1 ? "centavo" : "centavos")}` : dollars;
};

function expGrowth(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const kind = r.pick(["double", "triple", "half", "rule"] as const);
    const b = kind === "double" ? 2 : kind === "triple" ? 3 : kind === "half" ? 0.5 : r.pick([2, 3, 4]);
    const t = kind === "triple" ? r.int(2, 4) : kind === "rule" ? r.int(2, b === 4 ? 3 : 4) : r.int(2, 5);
    const a = kind === "double" ? r.pick([50, 100, 150, 200, 250, 300, 400, 500]) : kind === "triple" ? r.int(2, 9) * 10 : kind === "half" ? r.int(5, 25) * 2 ** t : r.int(2, 5);
    const ans = kind === "half" ? a / 2 ** t : a * b ** t;
    const answer: Answer = { kind: "number", value: ans };
    const factor = kind === "half" ? "(1/2)" : String(b);
    const periods = { double: ["hours", "horas"], triple: ["months", "meses"], half: ["days", "días"], rule: ["", ""] }[kind];
    const prompt: MathPart[] =
      kind === "rule"
        ? [`f(x) = ${a} · `, { sup: [String(b), "x"] }, tr(locale, `. Find f(${t}).`, `. Halla f(${t}).`)]
        : [
            {
              double: tr(locale, `A colony of bacteria starts with ${a} bacteria and doubles every hour. How many bacteria are there after ${t} hours?`, `Una colonia de bacterias empieza con ${a} bacterias y se duplica cada hora. ¿Cuántas bacterias hay después de ${t} horas?`),
              triple: tr(locale, `A new online game has ${a} players. The number of players triples every month. How many players will it have after ${t} months?`, `Un juego en línea nuevo tiene ${a} jugadores. El número de jugadores se triplica cada mes. ¿Cuántos jugadores tendrá después de ${t} meses?`),
              half: tr(locale, `A lab sample has ${a} grams of a substance that loses half of its mass every day. How many grams are left after ${t} days?`, `Una muestra de laboratorio tiene ${a} gramos de una sustancia que pierde la mitad de su masa cada día. ¿Cuántos gramos quedan después de ${t} días?`),
            }[kind],
          ];
    const say =
      kind === "rule"
        ? tr(locale, `f of x equals ${a} times ${b} to the power of x. Find f of ${t}.`, `f de x es igual a ${a} por ${b} elevado a la x. Halla f de ${t}.`)
        : (prompt[0] as string);
    const linear = kind === "half" ? a - (a / 2) * t : a + a * (b - 1) * t;
    return {
      prompt,
      say,
      input: "keypad",
      answer,
      wrong: wrongs(answer, [
        [String(kind === "half" ? (a / 2) * t : a * b * t), "multiplied-by-time-instead-of-power"],
        [String(kind === "half" ? a / 2 ** (t - 1) : a * b ** (t - 1)), "off-by-one-exponent"],
        ...(linear > 0 ? [[String(linear), "used-linear-growth"] as [string, string]] : []),
      ]),
      hints: [
        kind === "half"
          ? tr(locale, "Losing half each day means multiplying by 1/2 each day.", "Perder la mitad cada día significa multiplicar por 1/2 cada día.")
          : kind === "rule"
            ? tr(locale, `The exponent tells how many times to multiply by ${b}.`, `El exponente indica cuántas veces se multiplica por ${b}.`)
            : tr(locale, `The amount is multiplied by ${b} in each time period; it does not grow by the same number each time.`, `La cantidad se multiplica por ${b} en cada período; no aumenta lo mismo cada vez.`),
        kind === "rule"
          ? tr(locale, `Work out ${b}${sup(t)} first, then multiply by ${a}.`, `Primero calcula ${b}${sup(t)} y luego multiplica por ${a}.`)
          : tr(locale, `After ${t} ${periods[0]}, the amount is the starting amount times ${factor}${sup(t)}.`, `Después de ${t} ${periods[1]}, la cantidad es la cantidad inicial por ${factor}${sup(t)}.`),
        kind === "half" ? `${a} × (1/2)${sup(t)} = ${a} ÷ ${2 ** t}` : `${a} × ${b}${sup(t)} = ${a} × ${b ** t}`,
      ],
      steps: [
        kind === "half" ? `(1/2)${sup(t)} = 1/${2 ** t}` : `${b}${sup(t)} = ${b ** t}`,
        kind === "half" ? `${a} ÷ ${2 ** t} = ${ans}` : `${a} × ${b ** t} = ${ans}`,
      ],
      seconds: 35,
    };
  }
  const kind = r.pick(["savings", "value", "town"] as const);
  let t = 0, p = 0, start = 0;
  // A town's count is accepted one person either way, so a town whose simple-growth count lands that
  // close (3,500 people at 2% for 2 years: 3,641 compound, 3,640 simple) is drawn again; otherwise the
  // strand's main mistake would be marked right. Money is never this close (8 cents or more).
  do {
    t = kind === "town" ? r.int(2, 5) : r.int(2, 4);
    p = kind === "savings" ? r.pick([2, 3, 4, 5, 6, 8, 10]) : kind === "value" ? r.pick([10, 15, 20, 25]) : r.pick([2, 3, 4, 5]);
    start = kind === "savings" ? r.pick([200, 500, 800, 1000, 1500, 2000]) : kind === "value" ? r.pick([300, 400, 500, 600, 800]) : r.int(4, 18) * 500;
  } while (kind === "town" && Math.abs(roundDiv(start * (100 + p) ** t, 100 ** t) - (start * (100 + p * t)) / 100) <= 1);
  const up = kind !== "value";
  const f = up ? 100 + p : 100 - p;
  // Exact value = start · f^t / 100^t; money is rounded to whole cents, people to whole people.
  const N = start * f ** t;
  const toUnits = (num: number, per: number) => roundDiv(num, per);
  const money2 = kind !== "town";
  const units = money2 ? toUnits(N, 100 ** (t - 1)) : toUnits(N, 100 ** t);
  const exact = money2 ? N % 100 ** (t - 1) === 0 : N % 100 ** t === 0;
  // Rounding once at the end gives the key. Rounding every year, as a bank does with cents, can land a
  // cent or a person away, so one either way is accepted (0.015 leaves room for floating point).
  const answer: Answer = { kind: "number", value: money2 ? units / 100 : units, tolerance: money2 ? 0.015 : 1 };
  const showVal = (u: number) => (money2 ? money(u) : String(u));
  const typedVal = (u: number) => (money2 ? decTyped(u, 2) : String(u));
  const factor = dec(f, 2);
  const q = {
    savings: [
      `${money(start * 100)} is put in a savings account that earns ${p}% interest each year, added once a year. How much is in the account after ${t} years? Round to the nearest cent.`,
      `Se depositan ${money(start * 100)} en una cuenta de ahorros que gana ${p}% de interés al año, sumado una vez al año. ¿Cuánto hay en la cuenta después de ${t} años? Redondea al centavo más cercano.`,
    ],
    value: [
      `A new bike costs ${money(start * 100)}. Its value drops by ${p}% each year. What is it worth after ${t} years? Round to the nearest cent.`,
      `Una bicicleta nueva cuesta ${money(start * 100)}. Su valor baja ${p}% cada año. ¿Cuánto vale después de ${t} años? Redondea al centavo más cercano.`,
    ],
    town: [
      `A town has ${start} people. Its population grows by ${p}% each year. About how many people will live there after ${t} years? Round to the nearest whole number.`,
      `Un pueblo tiene ${start} habitantes. Su población crece ${p}% cada año. ¿Aproximadamente cuántas personas vivirán allí después de ${t} años? Redondea al número entero más cercano.`,
    ],
  }[kind];
  const text = tr(locale, q[0], q[1]);
  const said = text
    .replace(/\$(\d+)/g, (_, d: string) => sayMoney(Number(d) * 100, locale))
    .replace(/(\d+)%/g, (_, n: string) => `${n} ${tr(locale, "percent", "por ciento")}`);
  const simpleUnits = money2 ? start * 100 + (up ? 1 : -1) * start * p * t : start + (up ? 1 : -1) * ((start * p * t) / 100);
  const otherWay = money2 ? toUnits(start * (up ? 100 - p : 100 + p) ** t, 100 ** (t - 1)) : toUnits(start * (100 - p) ** t, 100 ** t);
  const offByOne = money2 ? toUnits(start * f ** (t - 1), 100 ** (t - 2)) : toUnits(start * f ** (t - 1), 100 ** (t - 1));
  return {
    prompt: [text],
    say: said,
    input: "keypad",
    keys: ["."],
    answer,
    wrong: wrongs(answer, [
      ...(Number.isInteger(simpleUnits) ? [[typedVal(simpleUnits), "used-simple-growth-not-compound"] as [string, string]] : []),
      [typedVal(otherWay), up ? "decayed-instead-of-grew" : "grew-instead-of-decayed"],
      [typedVal(offByOne), "off-by-one-exponent"],
    ]),
    hints: [
      up
        ? tr(locale, "Each year the amount is multiplied by the same growth factor.", "Cada año la cantidad se multiplica por el mismo factor de crecimiento.")
        : tr(locale, "Each year the value is multiplied by the same decay factor.", "Cada año el valor se multiplica por el mismo factor de decaimiento."),
      up
        ? tr(locale, `Growing by ${p}% means multiplying by 1 + ${dec(p, 2)} = ${factor}. Do it once for each year.`, `Crecer ${p}% significa multiplicar por 1 + ${dec(p, 2)} = ${factor}. Hazlo una vez por cada año.`)
        : tr(locale, `Dropping by ${p}% means multiplying by 1 − ${dec(p, 2)} = ${factor}. Do it once for each year.`, `Bajar ${p}% significa multiplicar por 1 − ${dec(p, 2)} = ${factor}. Hazlo una vez por cada año.`),
      `${money2 ? money(start * 100) : start} × ${factor}${sup(t)}`,
    ],
    steps: [
      up ? tr(locale, `Growth factor: ${factor}`, `Factor de crecimiento: ${factor}`) : tr(locale, `Decay factor: ${factor}`, `Factor de decaimiento: ${factor}`),
      `${money2 ? money(start * 100) : start} × ${factor}${sup(t)} = ${money2 ? "$" : ""}${dec(N, 2 * t)}`,
      `${exact ? "=" : "≈"} ${showVal(units)}`,
    ],
    seconds: 60,
  };
}

// ---------------------------------------------------------------- simplify square roots

const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];
/** n = s² · k with k square-free. */
function rootParts(n: number): [number, number] {
  for (let s = Math.floor(Math.sqrt(n)) + 1; s >= 1; s--) if (n % (s * s) === 0) return [s, n / (s * s)];
  return [1, n];
}
const rootShow = (c: number, k: number) => (k === 1 ? String(c) : `${c === 1 ? "" : c}√${k}`);
const rootSay = (c: number, k: number, l: Locale) => (k === 1 ? String(c) : `${c === 1 ? "" : `${c} ${tr(l, "times", "por")} `}${tr(l, "the square root of", "la raíz cuadrada de")} ${k}`);

function radicals(r: Rng, level: number, locale: Locale): ItemBody {
  const rc = (c: number, k: number, why?: string): Choice => ({ label: rootShow(c, k), say: rootSay(c, k, locale), ...(why ? { why } : {}) });
  const largest = tr(locale, "Look for the largest perfect square that divides the number under the root.", "Busca el mayor cuadrado perfecto que divide al número dentro de la raíz.");
  const ask = tr(locale, " Write it in simplest radical form.", " Escríbelo en su forma radical más simple.");
  if (level === 1) {
    let s = 0, k = 0;
    do {
      s = r.int(2, 10);
      k = r.pick(SQUAREFREE);
    } while (s * s * k > 300);
    const n = s * s * k;
    // A proper factor t of s takes out only t², leaving n / t², which still holds a square.
    const partial = Array.from({ length: Math.max(0, s - 2) }, (_, i) => i + 2).filter((t) => s % t === 0);
    const t = partial.length ? r.pick(partial) : 0;
    // s√(sk) is a dead option when sk is itself a perfect square (8√16); leaving the root as it is stands in.
    const wrong: Choice[] = [
      rc(s * s, k, "kept-the-square-not-its-root"),
      isSquare(s * k) ? rc(1, n, "not-fully-simplified") : rc(s, s * k, "divided-by-the-root-not-the-square"),
      ...(t ? [rc(t, n / (t * t), "did-not-use-the-largest-square")] : k !== s ? [rc(k, s, "swapped-root-and-radicand")] : []),
    ];
    return {
      prompt: [tr(locale, `Simplify √${n}.`, `Simplifica √${n}.`) + ask],
      say: tr(locale, `Simplify the square root of ${n}.`, `Simplifica la raíz cuadrada de ${n}.`) + ask,
      ...choose(r, rc(s, k), wrong),
      hints: [largest, tr(locale, "√(a × b) = √a × √b. Take the root of the perfect square and leave the rest under the root.", "√(a × b) = √a × √b. Saca la raíz del cuadrado perfecto y deja el resto dentro de la raíz."), `${n} = ${s * s} × ${k}`],
      steps: [`${n} = ${s * s} × ${k}`, `√${n} = √${s * s} × √${k}`, `= ${rootShow(s, k)}`],
      seconds: 30,
    };
  }
  let s = 0, k = 0, a = 0, b = 0;
  for (;;) {
    s = r.int(2, 6);
    k = r.pick(SQUAREFREE);
    const n = s * s * k;
    const splits = Array.from({ length: 59 }, (_, i) => i + 2).filter((x) => n % x === 0 && x * x <= n && n / x <= 60 && !isSquare(x) && !isSquare(n / x));
    if (!splits.length) continue;
    a = r.pick(splits);
    b = n / a;
    break;
  }
  const n = a * b;
  const coefs = r.bool(0.5);
  const c1 = coefs ? r.int(2, 5) : 1, c2 = coefs ? r.int(2, 5) : 1;
  const C = c1 * c2;
  const shownExpr = `${rootShow(c1, a)} · ${rootShow(c2, b)}`;
  const saidExpr = `${rootSay(c1, a, locale)} ${tr(locale, "times", "por")} ${rootSay(c2, b, locale)}`;
  const sum = a + b;
  const wrong: Choice[] = [
    rc(C, n, "not-fully-simplified"),
    rc(C * s * s, k, "kept-the-square-not-its-root"),
    ...(coefs ? [rc(c1 + c2, n, "added-the-coefficients")] : isSquare(sum) ? [] : [rc(1, sum, "added-instead-of-multiplied")]),
    // C·s√(sk) is a dead option when sk is a perfect square; dropping the outside numbers stands in.
    ...(!isSquare(s * k) ? [rc(C * s, s * k, "divided-by-the-root-not-the-square")] : coefs ? [rc(s, k, "dropped-the-coefficients")] : []),
  ];
  return {
    prompt: [tr(locale, `Multiply and simplify: ${shownExpr}.`, `Multiplica y simplifica: ${shownExpr}.`) + ask],
    say: tr(locale, `Multiply and simplify: ${saidExpr}.`, `Multiplica y simplifica: ${saidExpr}.`) + ask,
    ...choose(r, rc(C * s, k), wrong),
    hints: [
      tr(locale, "Multiply the numbers outside the roots together, and the numbers inside the roots together.", "Multiplica entre sí los números de afuera de las raíces y entre sí los de adentro."),
      tr(locale, "Then simplify the new root: take out the largest perfect square factor.", "Luego simplifica la nueva raíz: saca el mayor factor que sea un cuadrado perfecto."),
      coefs ? `${c1} · ${c2} = ${C};   √${a} · √${b} = √${n}` : `√${a} · √${b} = √${n}`,
    ],
    steps: [
      ...(coefs ? [`${c1} · ${c2} = ${C}`] : []),
      `√${a} · √${b} = √${n} = √${s * s} · √${k}`,
      C === 1 ? `= ${rootShow(s, k)}` : `= ${C} · ${rootShow(s, k)} = ${rootShow(C * s, k)}`,
    ],
    seconds: 45,
  };
}

// ---------------------------------------------------------------- the vertex of a parabola

function vertex(r: Rng, level: number, locale: Locale): ItemBody {
  const ask = tr(locale, "Write it as (x, y).", "Escríbelo como (x, y).");
  const askSaid = tr(locale, "Write it as the ordered pair x, y.", "Escríbelo como el par ordenado x, y.");
  let h = 0, k = 0;
  do {
    h = nz(r, level === 1 ? -8 : -5, level === 1 ? 8 : 5);
    k = nz(r, -9, 9);
  } while (Math.abs(h) === Math.abs(k));
  const a = level === 1 ? r.pick([1, 1, -1, 2, -2, 3, -3]) : r.pick([1, 1, -1, 2, -2, 3]);
  const answer: Answer = { kind: "pair", x: h, y: k };
  if (level === 1) {
    const inner = lin(1, -h);
    const coef = a === 1 ? "" : a === -1 ? "−" : show(a);
    const kText = ` ${k < 0 ? "−" : "+"} ${Math.abs(k)}`;
    const sayA = a === 1 ? "" : a === -1 ? tr(locale, "minus ", "menos ") : `${sayNum(a, locale)} ${tr(locale, "times ", "por ")}`;
    return {
      prompt: [tr(locale, "What is the vertex of the parabola ", "¿Cuál es el vértice de la parábola "), `y = ${coef}(${inner}`, { sup: [")", "2"] }, `${kText}? `, ask],
      say: tr(
        locale,
        `What is the vertex of the parabola y equals ${sayA}the quantity ${sayLin(1, -h, "en")}, squared, ${k < 0 ? "minus" : "plus"} ${Math.abs(k)}? ${askSaid}`,
        `¿Cuál es el vértice de la parábola y igual a ${sayA}la cantidad ${sayLin(1, -h, "es")}, al cuadrado, ${k < 0 ? "menos" : "más"} ${Math.abs(k)}? ${askSaid}`,
      ),
      input: "text",
      answer,
      wrong: wrongs(answer, [[ptTyped(-h, k), "flipped-sign-of-h"], [ptTyped(h, -k), "flipped-sign-of-k"], [ptTyped(k, h), "swapped-coordinates"]]),
      hints: [
        tr(locale, "In vertex form, y = a(x − h)² + k, the vertex is the point (h, k).", "En la forma de vértice, y = a(x − h)² + k, el vértice es el punto (h, k)."),
        tr(locale, "Read h from (x − h): it has the opposite sign of the number you see inside. Read k as it is.", "Lee h en (x − h): tiene el signo opuesto al del número que ves adentro. Lee k tal como está."),
        h > 0 ? tr(locale, `${inner} already has the form x − h.`, `${inner} ya tiene la forma x − h.`) : `${inner} = x − ${par(h)}`,
      ],
      steps: [h > 0 ? `${inner}: h = ${show(h)}` : tr(locale, `${inner} = x − ${par(h)}, so h = ${show(h)}`, `${inner} = x − ${par(h)}, así que h = ${show(h)}`), `k = ${show(k)}`, pt(h, k)],
      seconds: 25,
    };
  }
  const b = -2 * a * h, c = a * h * h + k;
  const ts: Term[] = [[a, "x", 2], [b, "x", 1], [c, "", 0]];
  const f = (x: number) => evalTerms(ts, x);
  return {
    prompt: [tr(locale, `Find the vertex of the parabola y = ${fmt(ts)}. `, `Halla el vértice de la parábola y = ${fmt(ts)}. `), ask],
    say: tr(locale, `Find the vertex of the parabola y equals ${sayTerms(ts, "en")}. ${askSaid}`, `Halla el vértice de la parábola y igual a ${sayTerms(ts, "es")}. ${askSaid}`),
    input: "text",
    answer,
    wrong: wrongs(answer, [[ptTyped(-h, f(-h)), "forgot-the-negative-in-x-formula"], [ptTyped(2 * h, f(2 * h)), "forgot-to-double-a"], [ptTyped(h, c), "used-c-as-the-y-value"]]),
    hints: [
      tr(locale, "The vertex lies on the axis of symmetry, x = −b ÷ (2a).", "El vértice está en el eje de simetría, x = −b ÷ (2a)."),
      tr(locale, "Find x with −b ÷ (2a), then put that x into the equation to find y.", "Halla x con −b ÷ (2a) y luego sustituye esa x en la ecuación para hallar y."),
      tr(locale, `Here a = ${show(a)} and b = ${show(b)}.`, `Aquí a = ${show(a)} y b = ${show(b)}.`),
    ],
    steps: [`x = −(${show(b)}) ÷ (2 × ${par(a)}) = ${show(h)}`, `y = ${substitute(ts, h)} = ${show(k)}`, pt(h, k)],
    seconds: 50,
  };
}

// ---------------------------------------------------------------- the quadratic formula

function quadFormula(r: Rng, level: number, locale: Locale): ItemBody {
  const or = tr(locale, "or", "o");
  const formula = tr(locale, "x = (−b ± √(b² − 4ac)) ÷ (2a). Find b² − 4ac first.", "x = (−b ± √(b² − 4ac)) ÷ (2a). Primero halla b² − 4ac.");
  const readABC = tr(locale, "The equation is already in the form ax² + bx + c = 0. Read a, b and c, with their signs.", "La ecuación ya está en la forma ax² + bx + c = 0. Lee a, b y c con sus signos.");
  if (level <= 2) {
    let A = 1, B = 0, Cc = 0, roots: [number, number][] = [];
    for (;;) {
      if (level === 1) {
        const r1 = r.int(-9, 9), r2 = r.bool(0.1) ? r1 : r.int(-9, 9);
        // x² = 0 needs no formula.
        if (Math.abs(r1 * r2) > 60 || (r1 === 0 && r2 === 0)) continue;
        [A, B, Cc] = [1, -(r1 + r2), r1 * r2];
        roots = r1 === r2 ? [[r1, 1]] : [[r1, 1], [r2, 1]];
      } else {
        // (p x − q)(s x − t) with roots q/p and t/s in lowest terms; denominators 1, 2, 4 or 5 keep decimals exact.
        const p = r.pick([1, 2, 4, 5]), s = r.pick([2, 4, 5]);
        const q = nz(r, -9, 9), t = nz(r, -9, 9);
        if (gcd(Math.abs(q), p) !== 1 || gcd(Math.abs(t), s) !== 1 || q * s === t * p) continue;
        const raw = [p * s, -(p * t + q * s), q * t];
        const g = gcd(gcd(Math.abs(raw[0]), Math.abs(raw[1])), Math.abs(raw[2])) || 1;
        [A, B, Cc] = raw.map((v) => v / g);
        // Numbers a ninth grader can work by hand: a ≤ 10, |b| ≤ 20, and b² − 4ac ≤ 400 (a root of 20 at most).
        if (A > 10 || Math.abs(B) > 20 || Math.abs(Cc) > 40 || B * B - 4 * A * Cc > 400) continue;
        roots = [[q, p], [t, s]];
      }
      break;
    }
    roots.sort(([n1, d1], [n2, d2]) => n1 / d1 - n2 / d2);
    const D = B * B - 4 * A * Cc;
    const sq = Math.sqrt(D);
    const answer: Answer = { kind: "set", values: roots.map(([n, d]) => n / d) };
    const ts: Term[] = [[A, "x", 2], [B, "x", 1], [Cc, "", 0]];
    const typed = (list: [number, number][]) => list.map(([n, d]) => fracTyped(n, d)).join(", ");
    return {
      prompt: [tr(locale, "Solve with the quadratic formula. Give every solution, separated by commas: ", "Resuelve con la fórmula cuadrática. Da todas las soluciones separadas por comas: "), `${fmt(ts)} = 0`],
      say: tr(locale, `Solve with the quadratic formula: ${sayTerms(ts, "en")} equals 0. Give every solution.`, `Resuelve con la fórmula cuadrática: ${sayTerms(ts, "es")} es igual a 0. Da todas las soluciones.`),
      input: "text",
      answer,
      wrong: wrongs(answer, [
        [typed(roots.map(([n, d]) => [-n, d] as [number, number])), "forgot-the-negative-on-b"],
        ...(roots.length === 2 ? [[fracTyped(roots[1][0], roots[1][1]), "gave-only-one-root"] as [string, string]] : []),
        ...(A !== 1 ? [[typed(roots.map(([n, d]) => [n * A, d] as [number, number])), "divided-by-2-not-2a"] as [string, string]] : []),
      ]),
      hints: [readABC, formula, `b² − 4ac = ${par(B)}² − 4(${show(A)})(${show(Cc)})`],
      steps: [
        `a = ${show(A)}, b = ${show(B)}, c = ${show(Cc)}`,
        `b² − 4ac = ${B * B} − ${par(4 * A * Cc)} = ${D}`,
        `x = (${show(-B)} ± ${sq}) ÷ ${2 * A}`,
        roots.map(([n, d]) => `x = ${fracShow(n, d)}`).join(` ${or} `),
      ],
      seconds: level === 1 ? 70 : 90,
    };
  }
  let h = 0, c = 0, Dq = 0;
  do {
    h = r.int(-5, 5);
    c = nz(r, -10, 10);
    Dq = h * h - c;
  } while (Dq < 2 || Dq > 60 || isSquare(Dq));
  const b = -2 * h;
  const [s, k] = rootParts(Dq);
  const pm = (center: number, coef: number, rad: number) => (rad === 1 ? `x = ${show(center)} ± ${coef}` : `x = ${center === 0 ? "" : `${show(center)} `}±${center === 0 ? "" : " "}${rootShow(coef, rad)}`);
  const sayPm = (center: number, coef: number, rad: number, l: Locale) =>
    `${tr(l, "x equals", "x es igual a")} ${center === 0 ? "" : `${sayNum(center, l)} `}${tr(l, "plus or minus", "más o menos")} ${rootSay(coef, rad, l)}`;
  const ch = (center: number, coef: number, rad: number, why?: string): Choice => ({ label: pm(center, coef, rad), say: sayPm(center, coef, rad, locale), ...(why ? { why } : {}) });
  const flipped = h * h + c;
  const [fs, fk] = flipped > 0 ? rootParts(flipped) : [0, 0];
  // With b = 0 the b mistakes cannot happen, so the ± and the root are what get dropped: √10, or ±20 from (0 ± 40) ÷ 2.
  const noB: Choice[] = [
    { label: `x = ${rootShow(s, k)}`, say: `${tr(locale, "x equals", "x es igual a")} ${rootSay(s, k, locale)}`, why: "forgot-the-plus-or-minus" },
    { label: `x = ±${2 * Dq}`, say: `${tr(locale, "x equals plus or minus", "x es igual a más o menos")} ${2 * Dq}`, why: "forgot-the-square-root" },
  ];
  const wrong: Choice[] = [
    ...(h ? [ch(-h, s, k, "forgot-the-negative-on-b"), ch(2 * h, s, k, "divided-only-part-by-2a")] : noB),
    ...(flipped > 0 && flipped !== Dq ? [ch(h, fs, fk, "sign-error-in-discriminant")] : []),
    ch(h, 2 * s, k, "did-not-divide-the-root-by-2a"),
  ];
  const ts: Term[] = [[1, "x", 2], [b, "x", 1], [c, "", 0]];
  const right = ch(h, s, k);
  return {
    prompt: [tr(locale, "Solve with the quadratic formula: ", "Resuelve con la fórmula cuadrática: "), `${fmt(ts)} = 0`],
    say: tr(locale, `Solve with the quadratic formula: ${sayTerms(ts, "en")} equals 0.`, `Resuelve con la fórmula cuadrática: ${sayTerms(ts, "es")} es igual a 0.`),
    ...choose(r, right, wrong),
    hints: [readABC, tr(locale, "x = (−b ± √(b² − 4ac)) ÷ (2a). Simplify the square root, then divide every term by 2a.", "x = (−b ± √(b² − 4ac)) ÷ (2a). Simplifica la raíz cuadrada y luego divide cada término entre 2a."), `b² − 4ac = ${par(b)}² − 4(1)(${show(c)})`],
    steps: [
      `a = 1, b = ${show(b)}, c = ${show(c)}`,
      `b² − 4ac = ${b * b} − ${par(4 * c)} = ${4 * Dq}`,
      `x = (${show(-b)} ± √${4 * Dq}) ÷ 2 = (${show(-b)} ± ${rootShow(2 * s, k)}) ÷ 2`,
      right.label,
    ],
    seconds: 90,
  };
}

// ---------------------------------------------------------------- the strand

const skill = (id: string, grade: "8" | "9", en: string, es: string, standard: string, prereqs: string[], levels: number, generate: Skill["generate"]): Skill => ({
  id,
  subject: "math",
  grade,
  title: { en, es },
  standard,
  prereqs,
  levels,
  content: "computed",
  generate,
});

export const MATH_8_9_MORE: Skill[] = [
  // One standard per skill, so telling rational from irrational (8.NS.A.1) and estimating roots (8.NS.A.2)
  // are two skills, the first a step to the second.
  skill("m.irrational.identify", "8", "Rational and irrational numbers", "Números racionales e irracionales", "8.NS.A.1", ["m.sqrt", "m.dec.tenths"], 1, (r, _level, locale) => irrationalL1(r, locale)),
  skill("m.irrational", "8", "Estimate irrational square roots", "Estimar raíces cuadradas irracionales", "8.NS.A.2", ["m.irrational.identify", "m.sqrt", "m.dec.tenths"], 2, (r, level, locale) =>
    level === 1 ? rootBetween(r, locale) : rootTenth(r, locale),
  ),
  skill("m.transform", "8", "Transformations on the coordinate plane", "Transformaciones en el plano de coordenadas", "8.G.A.3", ["m.int.addsub"], 2, transform),
  skill("m.angles.triangle", "8", "Angles in triangles", "Ángulos de los triángulos", "8.G.A.5", ["m.eq.twostep"], 3, triangleAngles),
  skill("m.volume.round", "8", "Volume of cylinders, cones and spheres", "Volumen de cilindros, conos y esferas", "8.G.C.9", ["m.circle", "m.volume"], 3, volume),
  skill("m.func.identify", "8", "Functions and relations", "Funciones y relaciones", "8.F.A.1", ["m.linear.table"], 2, funcIdentify),
  skill("m.linear.compare", "8", "Compare linear functions", "Comparar funciones lineales", "8.F.A.2", ["m.slope", "m.linear.table"], 2, linearCompare),
  skill("m.best.fit", "8", "Lines of best fit", "Rectas de mejor ajuste", "8.SP.A.3", ["m.slope", "m.linear.table"], 2, bestFit),
  skill("m.eq.solutions", "8", "Equations with one, no or infinitely many solutions", "Ecuaciones con una, ninguna o infinitas soluciones", "8.EE.C.7a", ["m.eq.multistep"], 2, eqSolutions),
  skill("m.abs.equation", "9", "Absolute value equations", "Ecuaciones con valor absoluto", "A-REI.B.3", ["m.eq.multistep", "m.int.numberline"], 3, absEquation),
  skill("m.line.forms", "9", "Standard form and slope-intercept form", "Forma estándar y forma pendiente-intersección", "A-CED.A.4", ["m.line.equation"], 2, lineForms),
  skill("m.systems.elim", "9", "Solve systems by elimination", "Resolver sistemas por eliminación", "A-REI.C.6", ["m.systems", "m.gcf.lcm"], 2, elimination),
  skill("m.domain.range", "9", "Domain and range", "Dominio y rango", "F-IF.A.1", ["m.func.eval", "m.func.identify"], 2, domainRange),
  skill("m.rate.change", "9", "Average rate of change", "Tasa de cambio promedio", "F-IF.B.6", ["m.func.eval", "m.slope"], 2, rateOfChange),
  skill("m.sequences", "9", "Arithmetic and geometric sequences", "Sucesiones aritméticas y geométricas", "F-BF.A.2", ["m.func.eval", "m.exp.rules"], 3, sequences),
  skill("m.exp.growth", "9", "Exponential growth and decay", "Crecimiento y decaimiento exponencial", "F-LE.A.1c", ["m.sequences", "m.percent.change"], 2, expGrowth),
  skill("m.radical.simplify", "9", "Simplify square roots", "Simplificar raíces cuadradas", "N-RN.A.2", ["m.sqrt", "m.factors"], 2, radicals),
  skill("m.quad.vertex", "9", "The vertex of a parabola", "El vértice de una parábola", "F-IF.C.7a", ["m.func.eval", "m.poly.mult"], 2, vertex),
  skill("m.quad.formula", "9", "The quadratic formula", "La fórmula cuadrática", "A-REI.B.4b", ["m.quad.solve", "m.radical.simplify"], 3, quadFormula),
];
