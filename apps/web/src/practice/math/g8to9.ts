import type { Locale } from "@/lib/types";
import { gcd, type Rng } from "../rng";
import { sayNum, show, tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 8–9: exponent rules, roots, scientific notation, multi-step equations, slope and lines, the
// Pythagorean theorem, systems, inequalities, polynomials, factoring and quadratics. Every problem is
// built backward from integer answers (pick the solution, then compute the constants), so keys are exact.

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "−": "⁻", "+": "⁺" };
/** Superscript text for hints, steps and choices: sup(-3) → "⁻³". */
const sup = (e: number | string) => String(e).replace(/[-−+\d]/g, (c) => SUP[c]);
/** A power in a prompt: pw("x", 2) shows x². */
const pw = (base: string | number, e: number): MathPart => ({ sup: [String(base), show(e)] });
const par = (n: number) => (n < 0 ? `(${show(n)})` : String(n));
const minus = (a: number, b: number) => `${show(a)} − ${par(b)}`;
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
const fracShow = (n: number, d: number) => (d === 1 ? show(n) : `${show(n)}/${d}`);
const sayPt = (x: number, y: number, locale: Locale) => `${sayNum(x, locale)}, ${sayNum(y, locale)}`;

function sayPow(base: string, e: number, locale: Locale) {
  if (e === 2) return tr(locale, `${base} squared`, `${base} al cuadrado`);
  if (e === 3) return tr(locale, `${base} cubed`, `${base} al cubo`);
  return tr(locale, `${base} to the power of ${sayNum(e, "en")}`, `${base} elevado a la ${sayNum(e, "es")}`);
}

// Terms are [coefficient, variable ("" for a number), power]. One formatter serves prompts, hints,
// typed answer keys and read-aloud so the four never disagree.
type Term = [coef: number, v: string, p: number];

/** Terms of a polynomial, highest power first; poly[i] is the coefficient of x^i. */
const terms = (poly: number[], v = "x"): Term[] =>
  poly
    .map((c, i): Term => [c, i ? v : "", i])
    .reverse()
    .filter(([c]) => c !== 0);

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

/** The same terms as prompt parts, with powers as { sup }. */
function parts(ts: Term[]): MathPart[] {
  const out: MathPart[] = [];
  let buf = "";
  ts.filter(([c]) => c !== 0).forEach(([c, v, p], i) => {
    const mag = Math.abs(c);
    buf += (i ? (c < 0 ? " − " : " + ") : c < 0 ? "−" : "") + (v && mag === 1 ? "" : String(mag));
    if (v && p >= 2) {
      if (buf) out.push(buf);
      out.push({ sup: [v, String(p)] });
      buf = "";
    } else buf += v;
  });
  if (buf) out.push(buf);
  return out.length ? out : ["0"];
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
const sayLin = (m: number, b: number, locale: Locale) => sayTerms([[m, "x", 1], [b, "", 0]], locale);
/** "3 × (−2) + 4": a rule evaluated at a number, before the arithmetic. */
const plugIn = (m: number, x: number, b: number) => `${show(m)} × ${par(x)}${b ? (b < 0 ? ` − ${-b}` : ` + ${b}`) : ""}`;
/** "3x · (−2x)": a product of two single terms. */
const mulShow = (a: Term, b: Term) => `${fmt([a])} · ${b[0] < 0 ? `(${fmt([b])})` : fmt([b])}`;

/**
 * Solve Ax + B = Cx + D (A ≠ C) the way it is taught: move the x terms to the side with the larger
 * coefficient so it stays positive, then undo the number, then divide.
 */
function solveLinear(A: number, B: number, C: number, D: number, locale: Locale) {
  const left = A > C;
  const k = Math.abs(A - C);
  const moved = left ? C : A;
  const move =
    moved > 0
      ? tr(locale, `Subtract ${fmt([[moved, "x", 1]])} from both sides`, `Resta ${fmt([[moved, "x", 1]])} a ambos lados`)
      : tr(locale, `Add ${fmt([[-moved, "x", 1]])} to both sides`, `Suma ${fmt([[-moved, "x", 1]])} a ambos lados`);
  const collected = left ? `${lin(k, B)} = ${show(D)}` : `${show(B)} = ${lin(k, D)}`;
  const c = left ? D - B : B - D;
  const lines = [collected];
  if ((left ? B : D) !== 0) lines.push(left ? `${lin(k, 0)} = ${show(c)}` : `${show(c)} = ${lin(k, 0)}`);
  const final = `x = ${show(c / k)}`;
  if (lines[lines.length - 1] !== final) lines.push(final);
  return { move, collected, lines };
}

// ---------------------------------------------------------------- exponents and roots

function expRulesVar(r: Rng, locale: Locale): ItemBody {
  const v = r.pick(["x", "y", "n", "m"]);
  const kind = r.pick(["product", "product", "quotient", "power"] as const);
  const instr = tr(locale, "Simplify. Use one exponent: ", "Simplifica. Usa un solo exponente: ");
  const P = (e: number | string) => `${v}${sup(e)}`;
  if (kind === "product") {
    const a = r.int(2, 7), b = r.int(2, 7);
    const coef = r.bool(0.4);
    const c1 = coef ? r.int(2, 6) : 1, c2 = coef ? r.int(2, 6) : 1;
    const e = a + b, k = c1 * c2;
    const mono = (c: number, p: number) => `${c === 1 ? "" : `${c} `}${sayPow(v, p, locale)}`;
    return {
      prompt: [instr, ...(coef ? [String(c1)] : []), pw(v, a), " · ", ...(coef ? [String(c2)] : []), pw(v, b)],
      say: tr(locale, `Simplify ${mono(c1, a)} times ${mono(c2, b)}. Use one exponent.`, `Simplifica ${mono(c1, a)} por ${mono(c2, b)}. Usa un solo exponente.`),
      input: "expr",
      answer: { kind: "expr", expr: `${k === 1 ? "" : k}${v}^${e}` },
      hints: [
        tr(locale, `Both powers have the base ${v}, so they can be combined.`, `Las dos potencias tienen base ${v}, así que se pueden combinar.`),
        coef
          ? tr(locale, "Multiply the numbers in front. For the same base, add the exponents.", "Multiplica los números de adelante. Para la misma base, suma los exponentes.")
          : tr(locale, "To multiply powers with the same base, keep the base and add the exponents.", "Para multiplicar potencias de la misma base, conserva la base y suma los exponentes."),
        coef
          ? tr(locale, `${c1} × ${c2} = ${k}. For the exponent, add ${a} + ${b}.`, `${c1} × ${c2} = ${k}. Para el exponente, suma ${a} + ${b}.`)
          : `${P(a)} · ${P(b)} = ${P(`${a}+${b}`)}`,
      ],
      steps: coef ? [`${c1} × ${c2} = ${k}`, `${P(a)} · ${P(b)} = ${P(`${a}+${b}`)} = ${P(e)}`, `${k}${P(e)}`] : [`${P(a)} · ${P(b)} = ${P(`${a}+${b}`)}`, `= ${P(e)}`],
      seconds: coef ? 20 : 12,
    };
  }
  if (kind === "quotient") {
    const a = r.int(6, 12), b = r.int(2, a - 2), e = a - b;
    return {
      prompt: [instr, pw(v, a), " ÷ ", pw(v, b)],
      say: tr(locale, `Simplify ${sayPow(v, a, "en")} divided by ${sayPow(v, b, "en")}. Use one exponent.`, `Simplifica ${sayPow(v, a, "es")} entre ${sayPow(v, b, "es")}. Usa un solo exponente.`),
      input: "expr",
      answer: { kind: "expr", expr: `${v}^${e}` },
      hints: [
        tr(locale, `Write both as products of ${v}'s. How many factors cancel?`, `Escribe las dos como productos de ${v}. ¿Cuántos factores se cancelan?`),
        tr(locale, "To divide powers with the same base, keep the base and subtract the exponents: first minus second.", "Para dividir potencias de la misma base, conserva la base y resta los exponentes: el primero menos el segundo."),
        `${P(a)} ÷ ${P(b)} = ${P(`${a}−${b}`)}`,
      ],
      steps: [`${P(a)} ÷ ${P(b)} = ${P(`${a}−${b}`)}`, `= ${P(e)}`],
      seconds: 12,
    };
  }
  const coef = r.bool(0.35);
  const a = r.int(2, 5), b = coef ? r.int(2, 3) : r.int(2, 4);
  const c = coef ? r.int(2, 3) : 1;
  const e = a * b, k = c ** b;
  const inner = `${c === 1 ? "" : c}${P(a)}`;
  const all = b === 2 ? tr(locale, "all squared", "todo al cuadrado") : b === 3 ? tr(locale, "all cubed", "todo al cubo") : tr(locale, `all to the power of ${b}`, `todo elevado a la ${b}`);
  return {
    prompt: [instr, "(", ...(coef ? [String(c)] : []), pw(v, a), { sup: [")", String(b)] }],
    say: tr(locale, `Simplify ${c === 1 ? "" : `${c} `}${sayPow(v, a, "en")}, ${all}. Use one exponent.`, `Simplifica ${c === 1 ? "" : `${c} `}${sayPow(v, a, "es")}, ${all}. Usa un solo exponente.`),
    input: "expr",
    answer: { kind: "expr", expr: `${k === 1 ? "" : k}${v}^${e}` },
    hints: [
      tr(locale, `(${inner})${sup(b)} means ${inner} used as a factor ${b} times.`, `(${inner})${sup(b)} significa ${inner} usado como factor ${b} veces.`),
      coef
        ? tr(locale, "Raise the number to the power, and multiply the exponents of the base.", "Eleva el número a la potencia y multiplica los exponentes de la base.")
        : tr(locale, "For a power of a power, keep the base and multiply the exponents.", "Para una potencia de una potencia, conserva la base y multiplica los exponentes."),
      coef
        ? tr(locale, `${c}${sup(b)} = ${k}. The exponent is ${a} × ${b}.`, `${c}${sup(b)} = ${k}. El exponente es ${a} × ${b}.`)
        : tr(locale, `The exponent is ${a} × ${b}.`, `El exponente es ${a} × ${b}.`),
    ],
    steps: coef ? [`${c}${sup(b)} = ${k}`, `(${P(a)})${sup(b)} = ${P(e)}`, `${k}${P(e)}`] : [`${a} × ${b} = ${e}`, `(${P(a)})${sup(b)} = ${P(e)}`],
    seconds: coef ? 20 : 12,
  };
}

/** Largest power used for each base, so values stay small enough to work out by hand. */
const MAX_POW: Record<number, number> = { 2: 5, 3: 4, 4: 3, 5: 3, 10: 3 };

function expRulesNum(r: Rng, locale: Locale): ItemBody {
  const kind = r.pick(["neg", "zero", "product", "quotient"] as const);
  const instr = tr(locale, "Find the value. Write it as a whole number or a fraction in simplest form: ", "Halla el valor. Escríbelo como número entero o como fracción en su mínima expresión: ");
  const common = { input: "fraction" as const, keys: ["-" as const], seconds: 25 };
  const valueOf = (b: number, e: number): [number, number] => (e >= 0 ? [b ** e, 1] : reduce(1, b ** -e));
  const valueStep = (b: number, e: number) =>
    e > 0 ? `${b}${sup(e)} = ${b ** e}` : e === 0 ? `${b}⁰ = 1` : `${b}${sup(e)} = 1/${b}${sup(-e)} = 1/${b ** -e}`;

  if (kind === "neg") {
    const b = r.pick([2, 3, 4, 5, 10, -2, -3]);
    const n = r.int(2, b === -3 ? 3 : MAX_POW[Math.abs(b)]);
    const bs = b < 0 ? `(${show(b)})` : String(b);
    const bSay = b < 0 ? tr(locale, `minus ${-b} in parentheses,`, `menos ${-b} entre paréntesis,`) : String(b);
    const [num, den] = valueOf(b, -n);
    return {
      ...common,
      prompt: [instr, { sup: [bs, show(-n)] }],
      say: tr(locale, `Find the value of ${sayPow(bSay, -n, "en")}.`, `Halla el valor de ${sayPow(bSay, -n, "es")}.`),
      answer: { kind: "fraction", n: num, d: den, simplest: true },
      hints: [
        tr(locale, "A negative exponent means the reciprocal: 1 over the power.", "Un exponente negativo indica el recíproco: 1 entre la potencia."),
        tr(locale, `Rewrite it as 1 over ${bs}${sup(n)}, then work out the power.`, `Escríbelo como 1 entre ${bs}${sup(n)} y luego calcula la potencia.`),
        `${bs}${sup(n)} = ${Array.from({ length: n }, () => bs).join(" × ")}`,
      ],
      steps: [`${bs}${sup(-n)} = 1/${bs}${sup(n)}`, `${bs}${sup(n)} = ${show(b ** n)}`, b ** n < 0 ? `1/${par(b ** n)} = ${fracShow(num, den)}` : `${bs}${sup(-n)} = ${fracShow(num, den)}`],
    };
  }
  if (kind === "zero") {
    const b = r.int(3, 12) * (r.bool(0.3) ? -1 : 1), c = r.int(2, 9);
    const bs = b < 0 ? `(${show(b)})` : String(b);
    const bSay = b < 0 ? tr(locale, `minus ${-b} in parentheses,`, `menos ${-b} entre paréntesis,`) : String(b);
    return {
      ...common,
      prompt: [instr, { sup: [bs, "0"] }, " + ", pw(c, -1)],
      say: tr(locale, `Find the value of ${sayPow(bSay, 0, "en")}, plus ${sayPow(String(c), -1, "en")}.`, `Halla el valor de ${sayPow(bSay, 0, "es")}, más ${sayPow(String(c), -1, "es")}.`),
      answer: { kind: "fraction", n: c + 1, d: c, simplest: true },
      hints: [
        tr(locale, "What is any nonzero number to the power of 0?", "¿Cuánto es cualquier número distinto de cero elevado a la 0?"),
        tr(locale, "Find each power on its own, then add.", "Calcula cada potencia por separado y luego suma."),
        `${c}${sup(-1)} = 1/${c}`,
      ],
      steps: [`${bs}⁰ = 1`, `${c}${sup(-1)} = 1/${c}`, `1 + 1/${c} = ${c + 1}/${c}`],
    };
  }
  const b = r.pick([2, 3, 4, 5, 10]);
  const deep = Math.min(MAX_POW[b], 4);
  if (kind === "product") {
    const e = r.bool(0.85) ? r.int(-deep, 0) : 2;
    const m = r.int(Math.max(1, e + 1), 6), n = m - e;
    const [num, den] = valueOf(b, e);
    const negFirst = r.bool(0.3);
    return {
      ...common,
      prompt: negFirst ? [instr, pw(b, -n), " · ", pw(b, m)] : [instr, pw(b, m), " · ", pw(b, -n)],
      say: negFirst
        ? tr(locale, `Find the value of ${sayPow(String(b), -n, "en")} times ${sayPow(String(b), m, "en")}.`, `Halla el valor de ${sayPow(String(b), -n, "es")} por ${sayPow(String(b), m, "es")}.`)
        : tr(locale, `Find the value of ${sayPow(String(b), m, "en")} times ${sayPow(String(b), -n, "en")}.`, `Halla el valor de ${sayPow(String(b), m, "es")} por ${sayPow(String(b), -n, "es")}.`),
      answer: { kind: "fraction", n: num, d: den, simplest: true },
      hints: [
        tr(locale, "The bases match, so add the exponents first.", "Las bases son iguales, así que primero suma los exponentes."),
        tr(locale, "Then read the new exponent: 0 gives 1, and a negative exponent gives a reciprocal.", "Luego interpreta el nuevo exponente: 0 da 1 y un exponente negativo da un recíproco."),
        tr(locale, `${m} + (${show(-n)}) = ${show(e)}, so this is ${b}${sup(e)}.`, `${m} + (${show(-n)}) = ${show(e)}, así que es ${b}${sup(e)}.`),
      ],
      steps: [`${b}${sup(m)} · ${b}${sup(-n)} = ${b}${sup(e)}`, valueStep(b, e)],
    };
  }
  const e = r.int(-deep, 0);
  const m = r.int(1, 5), n = m - e;
  const [num, den] = valueOf(b, e);
  return {
    ...common,
    prompt: [instr, pw(b, m), " ÷ ", pw(b, n)],
    say: tr(locale, `Find the value of ${sayPow(String(b), m, "en")} divided by ${sayPow(String(b), n, "en")}.`, `Halla el valor de ${sayPow(String(b), m, "es")} entre ${sayPow(String(b), n, "es")}.`),
    answer: { kind: "fraction", n: num, d: den, simplest: true },
    hints: [
      tr(locale, "The bases match, so subtract the exponents: first minus second.", "Las bases son iguales, así que resta los exponentes: el primero menos el segundo."),
      tr(locale, "A result of 0 means the value is 1. A negative result means a reciprocal.", "Si el resultado es 0, el valor es 1. Si es negativo, es un recíproco."),
      tr(locale, `${m} − ${n} = ${show(e)}, so this is ${b}${sup(e)}.`, `${m} − ${n} = ${show(e)}, así que es ${b}${sup(e)}.`),
    ],
    steps: [`${b}${sup(m)} ÷ ${b}${sup(n)} = ${b}${sup(e)}`, valueStep(b, e)],
  };
}

function rootsL2(r: Rng, locale: Locale): ItemBody {
  const kind = r.pick(["cube", "square-eq", "square-eq", "cube-eq"] as const);
  const or = tr(locale, "or", "o");
  if (kind === "square-eq") {
    const k = r.int(2, 12), p = k * k;
    return {
      prompt: [tr(locale, "Solve. Give both solutions, separated by a comma: ", "Resuelve. Da las dos soluciones separadas por una coma: "), pw("x", 2), ` = ${p}`],
      say: tr(locale, `Solve x squared equals ${p}. Give both solutions.`, `Resuelve x al cuadrado igual a ${p}. Da las dos soluciones.`),
      input: "text",
      answer: { kind: "set", values: [k, -k] },
      hints: [
        tr(locale, `Which numbers times themselves make ${p}? There are two.`, `¿Qué números multiplicados por sí mismos dan ${p}? Hay dos.`),
        tr(locale, "Take the square root of both sides. Keep the positive and the negative root.", "Saca la raíz cuadrada en ambos lados. Conserva la raíz positiva y la negativa."),
        `x = √${p} ${or} x = −√${p}`,
      ],
      steps: [`x = √${p} ${or} x = −√${p}`, `x = ${k} ${or} x = −${k}`],
      seconds: 15,
    };
  }
  const k = r.int(2, kind === "cube" ? 6 : 5) * (r.bool(0.35) ? -1 : 1);
  const n = k ** 3;
  const root = `∛${n < 0 ? `(${show(n)})` : n}`;
  const below = Math.abs(k) - 1;
  const cubes = `${par(k)} × ${par(k)} × ${par(k)} = ${show(n)}`;
  if (kind === "cube") {
    return {
      prompt: [tr(locale, "Find the value: ", "Halla el valor: "), root],
      say: tr(locale, `What is the cube root of ${sayNum(n, "en")}?`, `¿Cuál es la raíz cúbica de ${sayNum(n, "es")}?`),
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: k },
      hints: [
        tr(locale, `Which number, used as a factor 3 times, makes ${show(n)}?`, `¿Qué número, usado como factor 3 veces, da ${show(n)}?`),
        n < 0
          ? tr(locale, "A negative number cubed is negative. Find the cube root without the sign, then make it negative.", "Un número negativo al cubo es negativo. Halla la raíz cúbica sin el signo y luego hazla negativa.")
          : tr(locale, "Cube small numbers in order, 1, 2, 3 and so on, until you reach the number.", "Eleva al cubo números pequeños en orden, 1, 2, 3 y así, hasta llegar al número."),
        tr(locale, `${below} × ${below} × ${below} = ${below ** 3}, which is less than ${Math.abs(n)}.`, `${below} × ${below} × ${below} = ${below ** 3}, que es menos que ${Math.abs(n)}.`),
      ],
      steps: [cubes, `${root} = ${show(k)}`],
      seconds: 12,
    };
  }
  return {
    prompt: [tr(locale, "Solve: ", "Resuelve: "), pw("x", 3), ` = ${show(n)}`],
    say: tr(locale, `Solve x cubed equals ${sayNum(n, "en")}.`, `Resuelve x al cubo igual a ${sayNum(n, "es")}.`),
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value: k },
    hints: [
      tr(locale, "Undo cubing: take the cube root of both sides.", "Deshaz el cubo: saca la raíz cúbica en ambos lados."),
      tr(locale, `Find the number that, used as a factor 3 times, makes ${show(n)}.`, `Busca el número que, usado como factor 3 veces, da ${show(n)}.`),
      `x = ${root}`,
    ],
    steps: [`x = ${root}`, cubes, `x = ${show(k)}`],
    seconds: 15,
  };
}

// ---------------------------------------------------------------- scientific notation

/** Exact decimal text for m × 10^e (m a positive integer): (45, 3) → "45,000", (32, −4) → "0.0032". */
function decimal(m: number, e: number): string {
  let s = String(m);
  if (e >= 0) s += "0".repeat(e);
  else {
    const k = -e;
    s = s.length > k ? `${s.slice(0, s.length - k)}.${s.slice(s.length - k)}` : `0.${"0".repeat(k - s.length)}${s}`;
    s = s.replace(/0+$/, "").replace(/\.$/, "");
  }
  const [ip, fp] = s.split(".");
  const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fp ? `${grouped}.${fp}` : grouped;
}
const sci = (coef: string, e: number) => `${coef} × 10${sup(e)}`;
const saySci = (coef: string, e: number, locale: Locale) => tr(locale, `${coef} times 10 to the power of ${sayNum(e, "en")}`, `${coef} por 10 elevado a la ${sayNum(e, "es")}`);
const sciChoice = (coef: string, e: number, locale: Locale): Choice => ({ label: sci(coef, e), say: saySci(coef, e, locale) });

function sciL1(r: Rng, locale: Locale): ItemBody {
  const len = r.pick([1, 2, 2, 3]);
  let D = len === 1 ? r.int(2, 9) : len === 2 ? r.int(11, 99) : r.int(101, 999);
  if (D % 10 === 0) D += 1;
  const ds = String(D);
  const big = r.bool();
  const E = big ? r.int(3, 8) : -r.int(2, 6);
  const std = decimal(D, E - (ds.length - 1));
  const coef = ds.length > 1 ? `${ds[0]}.${ds.slice(1)}` : ds;
  // Mistakes: counting zeros instead of places, the wrong sign, a first number that is not between 1 and 10.
  const notOneDigit = ds.length > 1 ? `${ds.slice(0, 2)}${ds.length > 2 ? `.${ds.slice(2)}` : ""}` : `0.${ds}`;
  const wrong: Choice[] = [
    sciChoice(coef, big ? E - 1 : E + 1, locale),
    sciChoice(coef, -E, locale),
    sciChoice(notOneDigit, ds.length > 1 ? E - 1 : E + 1, locale),
  ];
  const right = sciChoice(coef, E, locale);
  const choices = r.shuffle([right, ...wrong]);
  const places = Math.abs(E);
  return {
    prompt: [tr(locale, "Which is this number in scientific notation? ", "¿Cuál es este número en notación científica? "), std],
    say: tr(locale, `Which choice shows ${std} in scientific notation?`, `¿Qué opción muestra ${std} en notación científica?`),
    choices,
    input: "choices",
    answer: { kind: "choice", index: choices.indexOf(right) },
    hints: [
      tr(locale, "In scientific notation, the first number is at least 1 and less than 10.", "En notación científica, el primer número es mayor o igual que 1 y menor que 10."),
      big
        ? tr(locale, "Move the decimal point left until one digit is in front of it. The number of places is the exponent.", "Mueve el punto decimal a la izquierda hasta que quede una sola cifra delante. El número de lugares es el exponente.")
        : tr(locale, "Move the decimal point right until it is just after the first nonzero digit. Count the places; the exponent is negative.", "Mueve el punto decimal a la derecha hasta que quede justo después de la primera cifra distinta de cero. Cuenta los lugares; el exponente es negativo."),
      tr(locale, `The first number is ${coef}.`, `El primer número es ${coef}.`),
    ],
    steps: [
      big
        ? tr(locale, `The decimal point moves ${places} places to the left.`, `El punto decimal se mueve ${places} lugares a la izquierda.`)
        : tr(locale, `The decimal point moves ${places} places to the right.`, `El punto decimal se mueve ${places} lugares a la derecha.`),
      `${std} = ${sci(coef, E)}`,
    ],
    seconds: 25,
  };
}

function sciL2(r: Rng, locale: Locale): ItemBody {
  const a = r.int(2, 9);
  const B = r.pick([15, 20, 25, 30, 40, 50, 60, 70, 80]); // the second number, in tenths
  const P10 = a * B; // the product of the two numbers, in tenths
  const shift = P10 >= 100 ? 1 : 0;
  const m = r.int(2, 9), n = r.bool(0.3) ? -r.int(2, 8) : r.int(2, 9);
  const E = m + n + shift;
  const bShow = decimal(B, -1), pShow = decimal(P10, -1), C = decimal(P10, -1 - shift);
  const right = sciChoice(C, E, locale);
  // Mistakes: multiplying the exponents, not adjusting the exponent (or adjusting it when not needed),
  // leaving a first number of 10 or more, adding the numbers instead of multiplying.
  const candidates: Choice[] = [
    sciChoice(C, m * n + shift, locale),
    shift ? sciChoice(C, m + n, locale) : sciChoice(C, E + 1, locale),
    shift ? sciChoice(pShow, m + n, locale) : sciChoice(decimal(a * 10 + B, -1), m + n, locale),
    sciChoice(C, E - 1, locale),
    sciChoice(C, -E, locale),
  ];
  const wrong: Choice[] = [];
  for (const c of candidates) if (c.label !== right.label && !wrong.some((w) => w.label === c.label) && wrong.length < 3) wrong.push(c);
  const choices = r.shuffle([right, ...wrong]);
  const tens = (e: number) => `10${sup(e)}`;
  return {
    prompt: [
      tr(locale, "Multiply. Which choice is the product in scientific notation? ", "Multiplica. ¿Qué opción es el producto en notación científica? "),
      `(${a} × `,
      pw(10, m),
      `) × (${bShow} × `,
      pw(10, n),
      ")",
    ],
    say: tr(
      locale,
      `Multiply: ${a} times 10 to the power of ${m}, times ${bShow} times 10 to the power of ${sayNum(n, "en")}. Which choice is the product in scientific notation?`,
      `Multiplica: ${a} por 10 elevado a la ${m}, multiplicado por ${bShow} por 10 elevado a la ${sayNum(n, "es")}. ¿Qué opción es el producto en notación científica?`,
    ),
    choices,
    input: "choices",
    answer: { kind: "choice", index: choices.indexOf(right) },
    hints: [
      tr(locale, "Multiply the first numbers together, and multiply the powers of 10 together.", "Multiplica los primeros números entre sí y las potencias de 10 entre sí."),
      tr(locale, "Powers of 10 multiply by adding the exponents. If the first number ends up 10 or more, rewrite it.", "Las potencias de 10 se multiplican sumando los exponentes. Si el primer número queda en 10 o más, reescríbelo."),
      `${a} × ${bShow} = ${pShow}`,
    ],
    steps: [
      `${a} × ${bShow} = ${pShow}`,
      `${tens(m)} × ${tens(n)} = ${tens(m + n)}`,
      shift ? `${pShow} × ${tens(m + n)} = ${sci(C, E)}` : sci(C, E),
    ],
    seconds: 45,
  };
}

// ---------------------------------------------------------------- equations

function eqL1(r: Rng, locale: Locale): ItemBody {
  let a: number, c: number, b: number, d: number, x0: number;
  // Both constants stay nonzero, so collecting the x terms never already reads "x = …" (hint 3).
  do {
    a = nz(r, -4, 9);
    c = nz(r, -4, 9);
    x0 = r.int(-9, 9);
    b = r.int(-12, 12);
    d = (a - c) * x0 + b;
  } while (a === c || (a < 0 && c < 0) || b === 0 || d === 0 || Math.abs(d) > 40);
  const s = solveLinear(a, b, c, d, locale);
  return {
    prompt: [tr(locale, "Solve for x: ", "Resuelve para x: "), `${lin(a, b)} = ${lin(c, d)}`],
    say: tr(locale, `Solve for x: ${sayLin(a, b, "en")} equals ${sayLin(c, d, "en")}.`, `Resuelve para x: ${sayLin(a, b, "es")} es igual a ${sayLin(c, d, "es")}.`),
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value: x0 },
    hints: [
      tr(locale, "Get all the x terms on one side first.", "Primero junta todos los términos con x en un mismo lado."),
      tr(locale, `${s.move}. Then solve the two-step equation that is left.`, `${s.move}. Luego resuelve la ecuación de dos pasos que queda.`),
      tr(locale, `After that step: ${s.collected}.`, `Después de ese paso queda: ${s.collected}.`),
    ],
    steps: s.lines,
    seconds: 45,
  };
}

function eqL2(r: Rng, locale: Locale): ItemBody {
  let form = r.pick(["left", "right", "both"] as const);
  let p = 0, q = 0, c = 0, d = 0, x0 = 0;
  if (form === "both") {
    // p(x + q) = s(x + t): pick x, s, t and p, then q must come out a nonzero integer.
    let s = 0, t = 0, ok = false;
    for (let tries = 0; tries < 60 && !ok; tries++) {
      x0 = r.int(-6, 6);
      p = r.int(2, 5) * (r.bool(0.3) ? -1 : 1);
      s = r.int(2, 5) * (r.bool(0.3) ? -1 : 1);
      t = nz(r, -6, 6);
      const top = s * (x0 + t);
      q = top % p === 0 ? top / p - x0 : 0;
      ok = p !== s && q !== 0 && q !== t && Math.abs(q) <= 9;
    }
    if (ok) {
      const A = p, B = p * q, C = s, D = s * t;
      const sol = solveLinear(A, B, C, D, locale);
      return eqL2Body(`${show(p)}(${lin(1, q)}) = ${show(s)}(${lin(1, t)})`, `${lin(A, B)} = ${lin(C, D)}`, x0, sol.lines, locale, [
        [p, q],
        [s, t],
      ]);
    }
    form = "left";
  }
  do {
    p = r.int(2, 6) * (r.bool(0.3) ? -1 : 1);
    q = nz(r, -7, 7);
    c = nz(r, -4, 8);
    x0 = r.int(-8, 8);
    d = p * (x0 + q) - c * x0;
  } while (c === p || Math.abs(d) > 50);
  const grouped = `${show(p)}(${lin(1, q)})`;
  if (form === "left") {
    const sol = solveLinear(p, p * q, c, d, locale);
    return eqL2Body(`${grouped} = ${lin(c, d)}`, `${lin(p, p * q)} = ${lin(c, d)}`, x0, sol.lines, locale, [[p, q]], [c, d]);
  }
  const sol = solveLinear(c, d, p, p * q, locale);
  return eqL2Body(`${lin(c, d)} = ${grouped}`, `${lin(c, d)} = ${lin(p, p * q)}`, x0, sol.lines, locale, [[p, q]], [c, d], true);
}

/** The shared body for a distribution equation. `groups` are the p(x + q) factors; `plain` is a cx + d side. */
function eqL2Body(eq: string, expanded: string, x0: number, lines: string[], locale: Locale, groups: [number, number][], plain?: [number, number], plainFirst = false): ItemBody {
  const sayGroup = ([p, q]: [number, number], l: Locale) => tr(l, `${sayNum(p, "en")} times the quantity ${sayLin(1, q, "en")}`, `${sayNum(p, "es")} por la cantidad ${sayLin(1, q, "es")}`);
  const sides = (l: Locale) => {
    const g = groups.map((x) => sayGroup(x, l));
    const all = plain ? (plainFirst ? [sayLin(plain[0], plain[1], l), g[0]] : [g[0], sayLin(plain[0], plain[1], l)]) : g;
    return all.join(tr(l, " equals ", " es igual a "));
  };
  const distribute = groups.map(([p]) => show(p)).join(tr(locale, " and the ", " y el "));
  return {
    prompt: [tr(locale, "Solve for x: ", "Resuelve para x: "), eq],
    say: tr(locale, `Solve for x: ${sides("en")}.`, `Resuelve para x: ${sides("es")}.`),
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value: x0 },
    hints: [
      tr(locale, `Clear the parentheses first: distribute the ${distribute}.`, `Primero quita los paréntesis: distribuye el ${distribute}.`),
      tr(locale, "After distributing, move the x terms to one side, then solve the two-step equation.", "Después de distribuir, pasa los términos con x a un lado y resuelve la ecuación de dos pasos."),
      tr(locale, `After distributing: ${expanded}.`, `Al distribuir queda: ${expanded}.`),
    ],
    steps: [expanded, ...lines],
    seconds: 60,
  };
}

// ---------------------------------------------------------------- slope and lines

function slopeL1(r: Rng, locale: Locale): ItemBody {
  const dx = r.int(2, 5);
  const x1 = r.int(-5, 5 - dx), y1 = r.int(-5, 5);
  const dy = nz(r, -5 - y1, 5 - y1);
  const P: [number, number] = [x1, y1], Q: [number, number] = [x1 + dx, y1 + dy];
  const [A, B] = r.bool() ? [Q, P] : [P, Q];
  const ry = B[1] - A[1], rx = B[0] - A[0];
  const [n, d] = reduce(ry, rx);
  const pt = ([x, y]: [number, number]) => `(${show(x)}, ${show(y)})`;
  return {
    prompt: [tr(locale, `Find the slope of the line through ${pt(A)} and ${pt(B)}. Write it in simplest form.`, `Halla la pendiente de la recta que pasa por ${pt(A)} y ${pt(B)}. Escríbela en su mínima expresión.`)],
    say: tr(
      locale,
      `Find the slope of the line through the point ${sayPt(A[0], A[1], "en")} and the point ${sayPt(B[0], B[1], "en")}. Write it in simplest form.`,
      `Halla la pendiente de la recta que pasa por el punto ${sayPt(A[0], A[1], "es")} y el punto ${sayPt(B[0], B[1], "es")}. Escríbela en su mínima expresión.`,
    ),
    visual: { kind: "coord", points: [A, B], line: true },
    alt: tr(locale, `A coordinate grid with a straight line through the points ${pt(A)} and ${pt(B)}`, `Un plano de coordenadas con una recta que pasa por los puntos ${pt(A)} y ${pt(B)}`),
    input: "fraction",
    keys: ["-"],
    answer: { kind: "fraction", n, d, simplest: true },
    hints: [
      tr(locale, "Slope is rise over run: the change in y divided by the change in x.", "La pendiente es el cambio en y dividido entre el cambio en x."),
      tr(locale, "Subtract the y-values and the x-values in the same order, then divide and simplify.", "Resta los valores de y y los de x en el mismo orden; luego divide y simplifica."),
      tr(locale, `Change in y: ${minus(B[1], A[1])} = ${show(ry)}. Now find the change in x.`, `Cambio en y: ${minus(B[1], A[1])} = ${show(ry)}. Ahora halla el cambio en x.`),
    ],
    steps: [
      tr(locale, `Change in y: ${minus(B[1], A[1])} = ${show(ry)}`, `Cambio en y: ${minus(B[1], A[1])} = ${show(ry)}`),
      tr(locale, `Change in x: ${minus(B[0], A[0])} = ${show(rx)}`, `Cambio en x: ${minus(B[0], A[0])} = ${show(rx)}`),
      tr(locale, `Slope: ${show(ry)} ÷ ${par(rx)} = ${fracShow(n, d)}`, `Pendiente: ${show(ry)} ÷ ${par(rx)} = ${fracShow(n, d)}`),
    ],
    seconds: 30,
  };
}

function slopeL2(r: Rng, locale: Locale): ItemBody {
  const sx = r.int(1, 3), sy = nz(r, -6, 6), x0 = r.int(-3, 2), y0 = r.int(-8, 8);
  const xs = [0, 1, 2, 3].map((i) => x0 + i * sx), ys = [0, 1, 2, 3].map((i) => y0 + i * sy);
  const [n, d] = reduce(sy, sx);
  const list = (v: number[]) => v.map(show).join(", ");
  const sayList = (v: number[], l: Locale) => v.map((x) => sayNum(x, l)).join(", ");
  return {
    prompt: [
      tr(
        locale,
        `This table shows a linear function. x: ${list(xs)}. y: ${list(ys)}. What is the slope? Write it in simplest form.`,
        `Esta tabla muestra una función lineal. x: ${list(xs)}. y: ${list(ys)}. ¿Cuál es la pendiente? Escríbela en su mínima expresión.`,
      ),
    ],
    say: tr(
      locale,
      `This table shows a linear function. When x is ${sayList(xs, "en")}, y is ${sayList(ys, "en")}. What is the slope? Write it in simplest form.`,
      `Esta tabla muestra una función lineal. Cuando x es ${sayList(xs, "es")}, y es ${sayList(ys, "es")}. ¿Cuál es la pendiente? Escríbela en su mínima expresión.`,
    ),
    input: "fraction",
    keys: ["-"],
    answer: { kind: "fraction", n, d, simplest: true },
    hints: [
      tr(locale, "In a linear table, y changes by the same amount each time x goes up by the same amount.", "En una tabla lineal, y cambia lo mismo cada vez que x aumenta lo mismo."),
      tr(locale, "Slope = change in y ÷ change in x. Use two columns next to each other.", "Pendiente = cambio en y ÷ cambio en x. Usa dos columnas seguidas."),
      tr(locale, `From x = ${show(xs[0])} to x = ${show(xs[1])}, x goes up by ${sx}.`, `De x = ${show(xs[0])} a x = ${show(xs[1])}, x aumenta ${sx}.`),
    ],
    steps: [
      tr(locale, `Each time x goes up by ${sx}, y changes by ${show(sy)}.`, `Cada vez que x aumenta ${sx}, y cambia ${show(sy)}.`),
      tr(locale, `Slope: ${show(sy)} ÷ ${sx} = ${fracShow(n, d)}`, `Pendiente: ${show(sy)} ÷ ${sx} = ${fracShow(n, d)}`),
    ],
    seconds: 35,
  };
}

// ---------------------------------------------------------------- the Pythagorean theorem

const TRIPLES: [number, number, number][] = [
  [3, 4, 5], [6, 8, 10], [9, 12, 15], [12, 16, 20], [15, 20, 25], [5, 12, 13], [10, 24, 26], [8, 15, 17], [7, 24, 25],
];
const UNITS = [
  { en: ["cm", "centimeters"], es: ["cm", "centímetros"] },
  { en: ["m", "meters"], es: ["m", "metros"] },
  { en: ["in", "inches"], es: ["pulg", "pulgadas"] },
  { en: ["ft", "feet"], es: ["pies", "pies"] },
];

function pythag(r: Rng, level: number, locale: Locale): ItemBody {
  const ladder = level === 2 && r.bool(0.4);
  const t = r.pick(ladder ? TRIPLES.filter(([, , c]) => c <= 25) : TRIPLES);
  const unit = ladder ? UNITS[3] : r.pick(UNITS);
  const u = tr(locale, unit.en[0], unit.es[0]);
  const uSay = (l: Locale) => (l === "es" ? unit.es[1] : unit.en[1]);
  if (level === 1) {
    const [a, b, c] = r.bool() ? t : [t[1], t[0], t[2]];
    return {
      prompt: [tr(locale, `A right triangle has legs of ${a} ${u} and ${b} ${u}. How long is the hypotenuse, in ${u}?`, `Un triángulo rectángulo tiene catetos de ${a} ${u} y ${b} ${u}. ¿Cuánto mide la hipotenusa, en ${u}?`)],
      say: tr(
        locale,
        `A right triangle has legs of ${a} ${uSay("en")} and ${b} ${uSay("en")}. How long is the hypotenuse?`,
        `Un triángulo rectángulo tiene catetos de ${a} ${uSay("es")} y ${b} ${uSay("es")}. ¿Cuánto mide la hipotenusa?`,
      ),
      visual: { kind: "right-triangle", a, b, c: null, unit: u },
      alt: tr(locale, `A right triangle with legs of ${a} ${u} and ${b} ${u}. The hypotenuse is unknown.`, `Un triángulo rectángulo con catetos de ${a} ${u} y ${b} ${u}. La hipotenusa es desconocida.`),
      input: "keypad",
      answer: { kind: "number", value: c },
      hints: [
        tr(locale, "The hypotenuse is the longest side, across from the right angle. Which rule links the three sides?", "La hipotenusa es el lado más largo, opuesto al ángulo recto. ¿Qué regla relaciona los tres lados?"),
        tr(locale, "Use a² + b² = c²: square each leg, add, then take the square root.", "Usa a² + b² = c²: eleva cada cateto al cuadrado, suma y saca la raíz cuadrada."),
        `${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}`,
      ],
      steps: [`${a}² + ${b}² = c²`, `${a * a} + ${b * b} = ${c * c}`, `c = √${c * c} = ${c} ${u}`],
      seconds: 30,
    };
  }
  // Missing leg. A ladder's foot is nearer the wall than the top is high, so the known leg is the shorter one.
  const [a, b] = ladder ? [Math.min(t[0], t[1]), Math.max(t[0], t[1])] : r.bool() ? [t[0], t[1]] : [t[1], t[0]];
  const c = t[2];
  const prompt = ladder
    ? tr(locale, `A ${c} ${u} ladder leans against a wall. Its foot is ${a} ${u} from the wall. How high up the wall does it reach, in ${u}?`, `Una escalera de ${c} ${u} está apoyada en una pared. Su base está a ${a} ${u} de la pared. ¿A qué altura de la pared llega, en ${u}?`)
    : tr(locale, `A right triangle has a hypotenuse of ${c} ${u} and one leg of ${a} ${u}. How long is the other leg, in ${u}?`, `Un triángulo rectángulo tiene una hipotenusa de ${c} ${u} y un cateto de ${a} ${u}. ¿Cuánto mide el otro cateto, en ${u}?`);
  const say = ladder
    ? tr(locale, `A ${c} foot ladder leans against a wall. Its foot is ${a} feet from the wall. How high up the wall does it reach?`, `Una escalera de ${c} pies está apoyada en una pared. Su base está a ${a} pies de la pared. ¿A qué altura de la pared llega?`)
    : tr(
        locale,
        `A right triangle has a hypotenuse of ${c} ${uSay("en")} and one leg of ${a} ${uSay("en")}. How long is the other leg?`,
        `Un triángulo rectángulo tiene una hipotenusa de ${c} ${uSay("es")} y un cateto de ${a} ${uSay("es")}. ¿Cuánto mide el otro cateto?`,
      );
  return {
    prompt: [prompt],
    say,
    visual: { kind: "right-triangle", a, b: null, c, unit: u },
    alt: ladder
      ? tr(locale, `A ladder leaning on a wall makes a right triangle. The ladder is ${c} ${u} long and its foot is ${a} ${u} from the wall. The height on the wall is unknown.`, `Una escalera apoyada en una pared forma un triángulo rectángulo. La escalera mide ${c} ${u} y su base está a ${a} ${u} de la pared. La altura en la pared es desconocida.`)
      : tr(locale, `A right triangle with one leg of ${a} ${u} and a hypotenuse of ${c} ${u}. The other leg is unknown.`, `Un triángulo rectángulo con un cateto de ${a} ${u} y una hipotenusa de ${c} ${u}. El otro cateto es desconocido.`),
    input: "keypad",
    answer: { kind: "number", value: b },
    hints: [
      ladder
        ? tr(locale, "The ladder is the hypotenuse. The ground and the wall are the legs.", "La escalera es la hipotenusa. El suelo y la pared son los catetos.")
        : tr(locale, "You know the hypotenuse, the longest side. The missing side is a leg.", "Conoces la hipotenusa, el lado más largo. El lado que falta es un cateto."),
      tr(locale, "Start from a² + b² = c² and subtract: b² = c² − a².", "Parte de a² + b² = c² y resta: b² = c² − a²."),
      `${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}`,
    ],
    steps: [`b² = ${c}² − ${a}²`, `b² = ${c * c} − ${a * a} = ${b * b}`, `b = √${b * b} = ${b} ${u}`],
    seconds: ladder ? 60 : 40,
  };
}

// ---------------------------------------------------------------- systems

function systems(r: Rng, locale: Locale): ItemBody {
  const kind = r.pick(["sub", "sub", "equal", "addsub"] as const);
  const so = tr(locale, "so", "así que");
  const sayEq = (lhs: string, rhs: string, l: Locale) => `${lhs} ${tr(l, "equals", "es igual a")} ${rhs}`;
  let x0 = 0, y0 = 0;
  let eq1: string, eq2: string, hints: string[], steps: string[];
  let say1: (l: Locale) => string, say2: (l: Locale) => string;
  const point = () => `(${show(x0)}, ${show(y0)})`;
  if (kind === "sub") {
    let m = 0, k = 0, a = 0, b = 0;
    do {
      x0 = r.int(-6, 6);
      y0 = r.int(-6, 6);
      m = nz(r, -4, 4);
      k = y0 - m * x0;
      a = r.int(1, 5);
      b = nz(r, -4, 4);
    } while (Math.abs(k) > 12 || a + b * m === 0);
    const c = a * x0 + b * y0;
    const second = fmt([[a, "x", 1], [b, "y", 1]]);
    eq1 = `y = ${lin(m, k)}`;
    eq2 = `${second} = ${show(c)}`;
    say1 = (l) => sayEq("y", sayLin(m, k, l), l);
    say2 = (l) => sayEq(sayTerms([[a, "x", 1], [b, "y", 1]], l), sayNum(c, l), l);
    const subbed = `${fmt([[a, "x", 1]])} ${b < 0 ? "−" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}(${lin(m, k)}) = ${show(c)}`;
    hints = [
      tr(locale, "The first equation already says what y equals.", "La primera ecuación ya dice cuánto vale y."),
      tr(locale, `Replace y in the second equation with ${lin(m, k)}, then solve for x.`, `Sustituye y en la segunda ecuación por ${lin(m, k)} y resuelve para x.`),
      tr(locale, `After substituting: ${subbed}.`, `Al sustituir queda: ${subbed}.`),
    ];
    steps = [subbed, `${lin(a + b * m, b * k)} = ${show(c)}, ${so} x = ${show(x0)}`, `y = ${plugIn(m, x0, k)} = ${show(y0)}`, point()];
  } else if (kind === "equal") {
    let m1 = 0, m2 = 0, k1 = 0, k2 = 0;
    do {
      x0 = r.int(-6, 6);
      y0 = r.int(-6, 6);
      m1 = nz(r, -5, 5);
      m2 = nz(r, -5, 5);
      k1 = y0 - m1 * x0;
      k2 = y0 - m2 * x0;
    } while (m1 === m2 || Math.abs(k1) > 12 || Math.abs(k2) > 12);
    eq1 = `y = ${lin(m1, k1)}`;
    eq2 = `y = ${lin(m2, k2)}`;
    say1 = (l) => sayEq("y", sayLin(m1, k1, l), l);
    say2 = (l) => sayEq("y", sayLin(m2, k2, l), l);
    hints = [
      tr(locale, "Both equations say what y equals, so those two expressions are equal.", "Las dos ecuaciones dicen cuánto vale y, así que esas dos expresiones son iguales."),
      tr(locale, "Set them equal and solve for x. Then put x into either equation to find y.", "Iguálalas y resuelve para x. Luego sustituye x en cualquiera de las ecuaciones para hallar y."),
      `${lin(m1, k1)} = ${lin(m2, k2)}`,
    ];
    steps = [`${lin(m1, k1)} = ${lin(m2, k2)}`, `${lin(m1 - m2, 0)} = ${show(k2 - k1)}, ${so} x = ${show(x0)}`, `y = ${plugIn(m1, x0, k1)} = ${show(y0)}`, point()];
  } else {
    do {
      x0 = r.int(-6, 6);
      y0 = nz(r, -6, 6);
    } while (x0 === y0);
    const s = x0 + y0, dd = x0 - y0;
    eq1 = `x + y = ${show(s)}`;
    eq2 = `x − y = ${show(dd)}`;
    say1 = (l) => sayEq(tr(l, "x plus y", "x más y"), sayNum(s, l), l);
    say2 = (l) => sayEq(tr(l, "x minus y", "x menos y"), sayNum(dd, l), l);
    hints = [
      tr(locale, "Look at the y terms: one is +y and the other is −y.", "Mira los términos con y: uno es +y y el otro es −y."),
      tr(locale, "Add the two equations so y cancels. Solve for x, then find y.", "Suma las dos ecuaciones para que y se cancele. Resuelve para x y luego halla y."),
      tr(locale, `Adding gives 2x = ${show(s + dd)}.`, `Al sumar queda 2x = ${show(s + dd)}.`),
    ];
    steps = [
      tr(locale, `Add the equations: 2x = ${show(s + dd)}, so x = ${show(x0)}`, `Suma las ecuaciones: 2x = ${show(s + dd)}, así que x = ${show(x0)}`),
      `${show(x0)} + y = ${show(s)}, ${so} y = ${show(y0)}`,
      point(),
    ];
  }
  return {
    prompt: [tr(locale, "Solve the system. Write the answer as (x, y). ", "Resuelve el sistema. Escribe la respuesta como (x, y). "), eq1, ";   ", eq2],
    say: tr(
      locale,
      `Solve the system. First equation: ${say1("en")}. Second equation: ${say2("en")}. Write the answer as the ordered pair x, y.`,
      `Resuelve el sistema. Primera ecuación: ${say1("es")}. Segunda ecuación: ${say2("es")}. Escribe la respuesta como el par ordenado x, y.`,
    ),
    input: "text",
    answer: { kind: "pair", x: x0, y: y0 },
    hints,
    steps,
    seconds: 90,
  };
}

// ---------------------------------------------------------------- inequalities

type Op = "<" | ">" | "≤" | "≥";
const FLIP: Record<Op, Op> = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };
const sayOp = (op: Op, l: Locale) =>
  ({
    "<": tr(l, "is less than", "es menor que"),
    ">": tr(l, "is greater than", "es mayor que"),
    "≤": tr(l, "is less than or equal to", "es menor o igual que"),
    "≥": tr(l, "is greater than or equal to", "es mayor o igual que"),
  })[op];

function inequality(r: Rng, locale: Locale): ItemBody {
  const op = r.pick(["<", ">", "≤", "≥"] as const);
  const k = nz(r, -8, 8);
  const form = r.pick(["one", "both", "dist"] as const);
  let shown: string, said: (l: Locale) => string, coef: number, first: string;
  const lines: string[] = [];
  if (form === "one") {
    const a = r.int(2, 6) * (r.bool(0.6) ? -1 : 1), b = nz(r, -10, 10), c = a * k + b;
    coef = a;
    shown = `${lin(a, b)} ${op} ${show(c)}`;
    said = (l) => `${sayLin(a, b, l)} ${sayOp(op, l)} ${sayNum(c, l)}`;
    lines.push(`${lin(a, 0)} ${op} ${show(c - b)}`);
    first = tr(locale, `${b > 0 ? `Subtract ${b} from` : `Add ${-b} to`} both sides: ${lines[0]}.`, `${b > 0 ? `Resta ${b}` : `Suma ${-b}`} a ambos lados: ${lines[0]}.`);
  } else if (form === "both") {
    let a = 0, c = 0;
    do {
      a = nz(r, -5, 6);
      c = nz(r, -5, 6);
    } while (Math.abs(a - c) < 2);
    const b = r.int(-10, 10), d = (a - c) * k + b;
    coef = a - c;
    shown = `${lin(a, b)} ${op} ${lin(c, d)}`;
    said = (l) => `${sayLin(a, b, l)} ${sayOp(op, l)} ${sayLin(c, d, l)}`;
    lines.push(`${lin(a - c, 0)} ${op} ${show(d - b)}`);
    first = tr(locale, `Move the x terms to the left and the numbers to the right: ${lines[0]}.`, `Pasa los términos con x a la izquierda y los números a la derecha: ${lines[0]}.`);
  } else {
    const p = r.int(2, 5) * (r.bool(0.6) ? -1 : 1), q = nz(r, -6, 6), c = p * (k + q);
    coef = p;
    shown = `${show(p)}(${lin(1, q)}) ${op} ${show(c)}`;
    said = (l) => `${tr(l, `${sayNum(p, "en")} times the quantity ${sayLin(1, q, "en")}`, `${sayNum(p, "es")} por la cantidad ${sayLin(1, q, "es")}`)} ${sayOp(op, l)} ${sayNum(c, l)}`;
    lines.push(`${lin(p, p * q)} ${op} ${show(c)}`, `${lin(p, 0)} ${op} ${show(c - p * q)}`);
    first = tr(locale, `Distribute: ${lines[0]}.`, `Distribuye: ${lines[0]}.`);
  }
  const sol: Op = coef < 0 ? FLIP[op] : op;
  const stmt = (o: Op, v: number): Choice => ({ label: `x ${o} ${show(v)}`, say: `x ${sayOp(o, locale)} ${sayNum(v, locale)}` });
  // Wrong choices: forgetting (or adding) the sign flip, and the boundary with the wrong sign.
  const right = stmt(sol, k);
  const choices = r.shuffle([right, stmt(FLIP[sol], k), stmt(sol, -k), stmt(FLIP[sol], -k)]);
  lines.push(
    coef < 0
      ? tr(locale, `Divide by ${show(coef)} and flip the sign: x ${sol} ${show(k)}`, `Divide entre ${show(coef)} e invierte el signo: x ${sol} ${show(k)}`)
      : tr(locale, `Divide by ${coef}: x ${sol} ${show(k)}`, `Divide entre ${coef}: x ${sol} ${show(k)}`),
  );
  return {
    prompt: [tr(locale, "Solve the inequality: ", "Resuelve la desigualdad: "), shown],
    say: tr(locale, `Solve the inequality: ${said("en")}.`, `Resuelve la desigualdad: ${said("es")}.`),
    choices,
    input: "choices",
    answer: { kind: "choice", index: choices.indexOf(right) },
    hints: [
      tr(locale, "Solve it like an equation, one step at a time.", "Resuélvela como una ecuación, paso a paso."),
      tr(locale, "If you multiply or divide both sides by a negative number, flip the inequality sign.", "Si multiplicas o divides ambos lados entre un número negativo, invierte el signo de la desigualdad."),
      first,
    ],
    steps: lines,
    seconds: 60,
  };
}

// ---------------------------------------------------------------- polynomials

function polyAddSub(r: Rng, locale: Locale): ItemBody {
  let p: number[], q: number[], sub: boolean, res: number[];
  do {
    p = [r.int(-9, 9), r.int(-9, 9), nz(r, -6, 6)];
    q = [r.int(-9, 9), r.int(-9, 9), r.bool(0.75) ? nz(r, -6, 6) : 0];
    sub = r.bool(0.6);
    res = [0, 1, 2].map((i) => p[i] + (sub ? -q[i] : q[i]));
  } while (q.filter((v) => v !== 0).length < 2 || res.every((v) => v === 0));
  const qq = sub ? q.map((v) => -v) : q;
  const vp = ["", "x", "x²"];
  const grouped = [2, 1, 0]
    .filter((i) => p[i] || qq[i])
    .map((i) => `(${show(p[i])} + ${par(qq[i])})${vp[i]}`)
    .join(" + ");
  const opened = fmt([...terms(p), ...terms(qq)]);
  return {
    prompt: [tr(locale, "Simplify: ", "Simplifica: "), "(", ...parts(terms(p)), ")", sub ? " − " : " + ", "(", ...parts(terms(q)), ")"],
    say: tr(
      locale,
      `Simplify: the quantity ${sayTerms(terms(p), "en")}, ${sub ? "minus" : "plus"} the quantity ${sayTerms(terms(q), "en")}.`,
      `Simplifica: la cantidad ${sayTerms(terms(p), "es")}, ${sub ? "menos" : "más"} la cantidad ${sayTerms(terms(q), "es")}.`,
    ),
    input: "expr",
    answer: { kind: "expr", expr: fmt(terms(res), true), form: "expanded" },
    hints: sub
      ? [
          tr(locale, "Subtracting a polynomial means subtracting every one of its terms.", "Restar un polinomio significa restar cada uno de sus términos."),
          tr(locale, "Change the sign of every term in the second polynomial, then combine like terms.", "Cambia el signo de cada término del segundo polinomio y luego combina términos semejantes."),
          tr(locale, `Without the parentheses: ${opened}.`, `Sin los paréntesis: ${opened}.`),
        ]
      : [
          tr(locale, "Combine like terms: x² terms together, x terms together, numbers together.", "Combina términos semejantes: los términos con x², los términos con x y los números, cada uno por su lado."),
          tr(locale, "Add the coefficients of each kind of term.", "Suma los coeficientes de cada tipo de término."),
          tr(locale, `Group like terms: ${grouped}.`, `Agrupa términos semejantes: ${grouped}.`),
        ],
    steps: sub ? [opened, grouped, fmt(terms(res))] : [grouped, fmt(terms(res))],
    seconds: 45,
  };
}

function polyMult(r: Rng, level: number, locale: Locale): ItemBody {
  const instr = tr(locale, "Multiply: ", "Multiplica: ");
  if (level === 1) {
    const k = r.pick([-5, -4, -3, -2, -1, 2, 3, 4, 5, 6]), e = r.pick([1, 1, 2]);
    const b = r.int(1, 5) * (r.bool(0.2) ? -1 : 1), c = nz(r, -9, 9);
    const mono: Term = [k, "x", e];
    const bin = terms([c, b]);
    const res = Array.from({ length: e + 2 }, () => 0);
    res[e + 1] = k * b;
    res[e] = k * c;
    return {
      prompt: [instr, ...parts([mono]), "(", ...parts(bin), ")"],
      say: tr(locale, `Multiply: ${sayTerms([mono], "en")} times the quantity ${sayTerms(bin, "en")}.`, `Multiplica: ${sayTerms([mono], "es")} por la cantidad ${sayTerms(bin, "es")}.`),
      input: "expr",
      answer: { kind: "expr", expr: fmt(terms(res), true), form: "expanded" },
      hints: [
        tr(locale, `Multiply ${fmt([mono])} by each term inside the parentheses.`, `Multiplica ${fmt([mono])} por cada término dentro del paréntesis.`),
        tr(locale, "Multiply the coefficients and add the exponents of x.", "Multiplica los coeficientes y suma los exponentes de x."),
        `${mulShow(mono, [b, "x", 1])} = ${fmt([[k * b, "x", e + 1]])}`,
      ],
      steps: [`${mulShow(mono, [b, "x", 1])} = ${fmt([[k * b, "x", e + 1]])}`, `${mulShow(mono, [c, "", 0])} = ${fmt([[k * c, "x", e]])}`, fmt(terms(res))],
      seconds: 30,
    };
  }
  const a = r.pick([1, 1, 1, 2, 3]), c = r.pick([1, 1, 2]), b = nz(r, -9, 9), d = nz(r, -9, 9);
  const f1 = terms([b, a]), f2 = terms([d, c]);
  const res = [b * d, a * d + b * c, a * c];
  const four = fmt([[a * c, "x", 2], [a * d, "x", 1], [b * c, "x", 1], [b * d, "", 0]]);
  return {
    prompt: [instr, "(", ...parts(f1), ")(", ...parts(f2), ")"],
    say: tr(locale, `Multiply: the quantity ${sayTerms(f1, "en")}, times the quantity ${sayTerms(f2, "en")}.`, `Multiplica: la cantidad ${sayTerms(f1, "es")}, por la cantidad ${sayTerms(f2, "es")}.`),
    input: "expr",
    answer: { kind: "expr", expr: fmt(terms(res), true), form: "expanded" },
    hints: [
      tr(locale, "Each term in the first parentheses multiplies each term in the second: four products.", "Cada término del primer paréntesis multiplica a cada término del segundo: cuatro productos."),
      tr(locale, "Write the four products, then combine the two x terms.", "Escribe los cuatro productos y luego combina los dos términos con x."),
      tr(locale, `First terms: ${mulShow([a, "x", 1], [c, "x", 1])} = ${fmt([[a * c, "x", 2]])}.`, `Primeros términos: ${mulShow([a, "x", 1], [c, "x", 1])} = ${fmt([[a * c, "x", 2]])}.`),
    ],
    steps: [four, fmt(terms(res))],
    seconds: 60,
  };
}

/** "(x − 3)" for the factor with root 3; "(x + 2)" for root −2; "x" for root 0. */
const rootFactor = (root: number) => (root === 0 ? "x" : `(x ${root > 0 ? "−" : "+"} ${Math.abs(root)})`);

function factorTri(r: Rng, level: number, locale: Locale): ItemBody {
  let p: number, q: number;
  if (level === 1) {
    p = r.int(1, 8);
    q = r.int(1, 8);
  } else {
    do {
      p = nz(r, -9, 9);
      q = nz(r, -9, 9);
    } while ((p > 0 && q > 0) || Math.abs(p * q) > 60);
  }
  [p, q] = [Math.min(p, q), Math.max(p, q)];
  const pq = p * q, s = p + q;
  const poly = [pq, s, 1];
  const fac = (n: number) => `(x ${n < 0 ? "−" : "+"} ${Math.abs(n)})`;
  const facAscii = (n: number) => `(x${n < 0 ? "-" : "+"}${Math.abs(n)})`;
  const m = Math.abs(pq);
  const pairs: string[] = [];
  for (let i = 1; i * i <= m; i++) if (m % i === 0) pairs.push(`${i} × ${m / i}`);
  const note = pq < 0 ? tr(locale, " One of the two numbers is negative.", " Uno de los dos números es negativo.") : s < 0 ? tr(locale, " Both numbers are negative.", " Los dos números son negativos.") : "";
  return {
    prompt: [tr(locale, "Factor: ", "Factoriza: "), ...parts(terms(poly))],
    say: tr(locale, `Factor ${sayTerms(terms(poly), "en")}.`, `Factoriza ${sayTerms(terms(poly), "es")}.`),
    input: "expr",
    answer: { kind: "expr", expr: `${facAscii(p)}${facAscii(q)}`, form: "factored" },
    hints: [
      tr(locale, "The answer has the form (x + a)(x + b) for two integers a and b.", "La respuesta tiene la forma (x + a)(x + b) para dos números enteros a y b."),
      tr(locale, `Find two numbers that multiply to ${show(pq)} and add to ${show(s)}.`, `Busca dos números que multiplicados den ${show(pq)} y sumados den ${show(s)}.`),
      tr(locale, `Factor pairs of ${m}: ${pairs.join(", ")}.${note}`, `Pares de factores de ${m}: ${pairs.join(", ")}.${note}`),
    ],
    steps: [
      tr(locale, `${show(p)} × ${par(q)} = ${show(pq)} and ${show(p)} + ${par(q)} = ${show(s)}`, `${show(p)} × ${par(q)} = ${show(pq)} y ${show(p)} + ${par(q)} = ${show(s)}`),
      `${fmt(terms(poly))} = ${fac(p)}${fac(q)}`,
    ],
    seconds: level === 1 ? 45 : 60,
  };
}

function quadSolve(r: Rng, locale: Locale): ItemBody {
  const twice = r.bool(0.15);
  let r1: number, r2: number;
  do {
    r1 = r.int(-9, 9);
    r2 = twice ? r1 : r.int(-9, 9);
  } while (twice ? r1 === 0 : r1 === r2 || Math.abs(r1 * r2) > 60);
  [r1, r2] = [Math.min(r1, r2), Math.max(r1, r2)];
  const b = -(r1 + r2), c = r1 * r2;
  const moved = c !== 0 && r.bool(0.3);
  const lhs = moved ? terms([0, b, 1]) : terms([c, b, 1]);
  const rhs = moved ? -c : 0;
  const zeroForm = `${fmt(terms([c, b, 1]))} = 0`;
  // A zero root gives the factor x, written first: x(x − 5).
  const [f1, f2] = r2 === 0 ? [r2, r1] : [r1, r2];
  const factored = twice ? `${rootFactor(r1)}² = 0` : `${rootFactor(f1)}${rootFactor(f2)} = 0`;
  const zeroEq = (root: number) => (root === 0 ? "x = 0" : `x ${root > 0 ? "−" : "+"} ${Math.abs(root)} = 0`);
  const or = tr(locale, "or", "o");
  return {
    prompt: [tr(locale, "Solve by factoring. Give every solution, separated by commas: ", "Resuelve factorizando. Da todas las soluciones separadas por comas: "), ...parts(lhs), ` = ${show(rhs)}`],
    say: tr(locale, `Solve by factoring: ${sayTerms(lhs, "en")} equals ${sayNum(rhs, "en")}.`, `Resuelve factorizando: ${sayTerms(lhs, "es")} es igual a ${sayNum(rhs, "es")}.`),
    input: "text",
    answer: { kind: "set", values: twice ? [r1] : [r1, r2] },
    hints: [
      moved ? tr(locale, "Get 0 on one side first.", "Primero deja 0 en un lado.") : tr(locale, "Factor the left side.", "Factoriza el lado izquierdo."),
      tr(locale, "A product is 0 only when one of its factors is 0. Set each factor equal to 0.", "Un producto es 0 solo cuando uno de sus factores es 0. Iguala cada factor a 0."),
      moved
        ? tr(locale, `${c > 0 ? `Add ${c} to` : `Subtract ${-c} from`} both sides: ${zeroForm}.`, `${c > 0 ? `Suma ${c}` : `Resta ${-c}`} a ambos lados: ${zeroForm}.`)
        : tr(locale, `It factors as ${factored}.`, `Se factoriza así: ${factored}.`),
    ],
    steps: [
      ...(moved ? [zeroForm] : []),
      factored,
      ...(twice ? [] : [`${zeroEq(r1)} ${or} ${zeroEq(r2)}`]),
      twice ? `x = ${show(r1)}` : `x = ${show(r1)} ${or} x = ${show(r2)}`,
    ],
    seconds: 60,
  };
}

// ---------------------------------------------------------------- functions

function funcEval(r: Rng, level: number, locale: Locale): ItemBody {
  const name = r.pick(["f", "g", "h"]);
  const poly = level === 1 ? [nz(r, -10, 10), nz(r, -6, 9)] : [r.int(-9, 9), r.int(-6, 6), r.pick([1, 1, 2, -1, 3])];
  const v = level === 1 ? nz(r, -6, 8) : r.bool(0.8) ? -r.int(1, 5) : r.int(2, 4);
  const ts = terms(poly);
  const termValues = ts.map(([c, , p]) => c * v ** p);
  const value = termValues.reduce((s, t) => s + t, 0);
  const subbed = ts
    .map(([c, x, p], i) => (i ? (c < 0 ? " − " : " + ") : c < 0 ? "−" : "") + (x && Math.abs(c) === 1 ? "" : String(Math.abs(c))) + (x ? `(${show(v)})${p >= 2 ? sup(p) : ""}` : ""))
    .join("");
  const call = `${name}(${show(v)})`;
  return {
    prompt: [`${name}(x) = `, ...parts(ts), tr(locale, `. Find ${call}.`, `. Halla ${call}.`)],
    say: tr(locale, `${name} of x equals ${sayTerms(ts, "en")}. Find ${name} of ${sayNum(v, "en")}.`, `${name} de x es igual a ${sayTerms(ts, "es")}. Halla ${name} de ${sayNum(v, "es")}.`),
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value },
    hints: [
      tr(locale, `${call} means: put ${show(v)} in place of every x.`, `${call} significa: pon ${show(v)} en lugar de cada x.`),
      level === 1
        ? tr(locale, "Multiply first, then add or subtract.", "Primero multiplica y luego suma o resta.")
        : tr(locale, "Keep the number in parentheses. Square first, then multiply, then add or subtract.", "Deja el número entre paréntesis. Primero eleva al cuadrado, luego multiplica y después suma o resta."),
      `${call} = ${subbed}`,
    ],
    steps: [`${call} = ${subbed}`, `= ${fmt(termValues.map((t): Term => [t, "", 0]))}`, `= ${show(value)}`],
    seconds: level === 1 ? 20 : 35,
  };
}

function lineEquation(r: Rng, level: number, locale: Locale): ItemBody {
  // Level 2 points are drawn on a grid, so they stay within ±9.
  let m: number, b: number, x1: number, dx: number;
  do {
    m = level === 1 ? nz(r, -5, 5) : nz(r, -3, 3);
    b = level === 1 ? r.int(-9, 9) : r.int(-5, 5);
    x1 = level === 1 ? nz(r, -4, 5) : r.int(-4, 3);
    dx = r.int(1, 4);
  } while (level === 1 ? Math.abs(m * x1 + b) > 15 : Math.abs(m * x1 + b) > 9 || Math.abs(m * (x1 + dx) + b) > 9);
  const y1 = m * x1 + b;
  const pt = (x: number, y: number) => `(${show(x)}, ${show(y)})`;
  const form = tr(locale, "Write its equation in the form y = mx + b.", "Escribe su ecuación en la forma y = mx + b.");
  const sayForm = tr(locale, "Write its equation in the form y equals m x plus b.", "Escribe su ecuación en la forma y igual a m x más b.");
  const so = tr(locale, "so", "así que");
  const answer = { kind: "expr" as const, expr: fmt([[m, "x", 1], [b, "", 0]], true), form: "expanded" as const };
  const solveB = `${show(y1)} = ${show(m)}(${show(x1)}) + b, ${so} b = ${show(b)}`;
  if (level === 1) {
    return {
      prompt: [tr(locale, `A line has slope ${show(m)} and passes through ${pt(x1, y1)}. ${form}`, `Una recta tiene pendiente ${show(m)} y pasa por ${pt(x1, y1)}. ${form}`)],
      say: tr(locale, `A line has slope ${sayNum(m, "en")} and passes through the point ${sayPt(x1, y1, "en")}. ${sayForm}`, `Una recta tiene pendiente ${sayNum(m, "es")} y pasa por el punto ${sayPt(x1, y1, "es")}. ${sayForm}`),
      input: "expr",
      answer,
      hints: [
        tr(locale, "In y = mx + b, m is the slope and b is the y-intercept.", "En y = mx + b, m es la pendiente y b es la intersección con el eje y."),
        tr(locale, `Put m = ${show(m)}, x = ${show(x1)} and y = ${show(y1)} into y = mx + b, then solve for b.`, `Sustituye m = ${show(m)}, x = ${show(x1)} e y = ${show(y1)} en y = mx + b y despeja b.`),
        `${show(y1)} = ${show(m)}(${show(x1)}) + b`,
      ],
      steps: [`${show(y1)} = ${show(m * x1)} + b`, `b = ${minus(y1, m * x1)} = ${show(b)}`, `y = ${lin(m, b)}`],
      seconds: 40,
    };
  }
  const x2 = x1 + dx, y2 = m * x2 + b, dy = y2 - y1;
  return {
    prompt: [tr(locale, `A line passes through ${pt(x1, y1)} and ${pt(x2, y2)}. ${form}`, `Una recta pasa por ${pt(x1, y1)} y ${pt(x2, y2)}. ${form}`)],
    say: tr(
      locale,
      `A line passes through the point ${sayPt(x1, y1, "en")} and the point ${sayPt(x2, y2, "en")}. ${sayForm}`,
      `Una recta pasa por el punto ${sayPt(x1, y1, "es")} y el punto ${sayPt(x2, y2, "es")}. ${sayForm}`,
    ),
    visual: { kind: "coord", points: [[x1, y1], [x2, y2]], line: true },
    alt: tr(locale, `A coordinate grid with a straight line through ${pt(x1, y1)} and ${pt(x2, y2)}`, `Un plano de coordenadas con una recta que pasa por ${pt(x1, y1)} y ${pt(x2, y2)}`),
    input: "expr",
    answer,
    hints: [
      tr(locale, "Find the slope first, then b.", "Primero halla la pendiente y luego b."),
      tr(locale, "Slope = change in y ÷ change in x. Then put one point into y = mx + b to find b.", "Pendiente = cambio en y ÷ cambio en x. Luego sustituye un punto en y = mx + b para hallar b."),
      tr(locale, `Slope: (${minus(y2, y1)}) ÷ (${minus(x2, x1)}) = ${show(dy)} ÷ ${dx}.`, `Pendiente: (${minus(y2, y1)}) ÷ (${minus(x2, x1)}) = ${show(dy)} ÷ ${dx}.`),
    ],
    steps: [`m = ${show(dy)} ÷ ${dx} = ${show(m)}`, solveB, `y = ${lin(m, b)}`],
    seconds: 60,
  };
}

// ---------------------------------------------------------------- the strand

export const MATH_8_9: Skill[] = [
  {
    id: "m.exp.rules",
    subject: "math",
    grade: "8",
    title: { en: "Exponent rules", es: "Leyes de los exponentes" },
    standard: "8.EE.A.1",
    prereqs: ["m.exp.whole", "m.int.multdiv"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => (level === 1 ? expRulesVar(r, locale) : expRulesNum(r, locale)),
  },
  {
    id: "m.sqrt",
    subject: "math",
    grade: "8",
    title: { en: "Square roots and cube roots", es: "Raíces cuadradas y cúbicas" },
    standard: "8.EE.A.2",
    prereqs: ["m.exp.whole"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      if (level === 2) return rootsL2(r, locale);
      const k = r.int(2, 15), n = k * k;
      const ref = k <= 7 ? (k === 5 ? 4 : 5) : k === 10 ? 9 : 10;
      return {
        prompt: [tr(locale, "Find the value: ", "Halla el valor: "), `√${n}`],
        say: tr(locale, `What is the square root of ${n}?`, `¿Cuál es la raíz cuadrada de ${n}?`),
        input: "keypad",
        answer: { kind: "number", value: k },
        hints: [
          tr(locale, `Which number times itself makes ${n}?`, `¿Qué número multiplicado por sí mismo da ${n}?`),
          tr(locale, `Start from a square you know, like ${ref} × ${ref} = ${ref * ref}, and adjust.`, `Parte de un cuadrado que conozcas, como ${ref} × ${ref} = ${ref * ref}, y ajusta.`),
          tr(locale, `${n} is between ${(k - 1) ** 2} and ${(k + 1) ** 2}.`, `${n} está entre ${(k - 1) ** 2} y ${(k + 1) ** 2}.`),
        ],
        steps: [`${k} × ${k} = ${n}`, `√${n} = ${k}`],
        seconds: 6,
      };
    },
  },
  {
    id: "m.sci.notation",
    subject: "math",
    grade: "8",
    title: { en: "Scientific notation", es: "Notación científica" },
    standard: "8.EE.A.3",
    prereqs: ["m.pow10", "m.exp.rules"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => (level === 1 ? sciL1(r, locale) : sciL2(r, locale)),
  },
  {
    id: "m.eq.multistep",
    subject: "math",
    grade: "8",
    title: { en: "Multi-step equations", es: "Ecuaciones de varios pasos" },
    standard: "8.EE.C.7",
    prereqs: ["m.eq.twostep", "m.expr.simplify"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => (level === 1 ? eqL1(r, locale) : eqL2(r, locale)),
  },
  {
    id: "m.slope",
    subject: "math",
    grade: "8",
    title: { en: "Slope", es: "Pendiente" },
    standard: "8.F.B.4",
    prereqs: ["m.int.multdiv", "m.frac.equiv"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => (level === 1 ? slopeL1(r, locale) : slopeL2(r, locale)),
  },
  {
    id: "m.linear.table",
    subject: "math",
    grade: "8",
    title: { en: "Linear functions and tables", es: "Funciones lineales y tablas" },
    standard: "8.F.A.3",
    prereqs: ["m.expr.eval", "m.slope"],
    content: "computed",
    levels: 1,
    generate(r, _level, locale) {
      const m = nz(r, -5, 5), b = nz(r, -9, 9);
      const rule = lin(m, b);
      const keypad = { input: "keypad" as const, keys: ["-" as const] };
      const solve = (x: number) => [`y = ${plugIn(m, x, b)}`, `y = ${show(m * x)} ${b < 0 ? "−" : "+"} ${Math.abs(b)}`, `y = ${show(m * x + b)}`];
      if (r.bool()) {
        const x = nz(r, -5, 6);
        return {
          prompt: [tr(locale, `The rule is y = ${rule}. What is y when x = ${show(x)}?`, `La regla es y = ${rule}. ¿Cuánto vale y cuando x = ${show(x)}?`)],
          say: tr(locale, `The rule is y equals ${sayLin(m, b, "en")}. What is y when x is ${sayNum(x, "en")}?`, `La regla es y igual a ${sayLin(m, b, "es")}. ¿Cuánto vale y cuando x es ${sayNum(x, "es")}?`),
          ...keypad,
          answer: { kind: "number", value: m * x + b },
          hints: [
            tr(locale, `Put ${show(x)} in place of x.`, `Pon ${show(x)} en lugar de x.`),
            tr(locale, "Multiply first, then add or subtract.", "Primero multiplica y luego suma o resta."),
            `${show(m)} × ${par(x)} = ${show(m * x)}`,
          ],
          steps: solve(x),
          seconds: 20,
        };
      }
      const x0 = r.int(-2, 2), j = r.int(0, 3);
      const xs = [0, 1, 2, 3].map((i) => x0 + i);
      const ys: MathPart[] = [];
      xs.forEach((x, i) => {
        if (i) ys.push(", ");
        ys.push(i === j ? { blank: true } : show(m * x + b));
      });
      const x = xs[j];
      return {
        prompt: [tr(locale, `The rule is y = ${rule}. Find the missing value.   `, `La regla es y = ${rule}. Halla el valor que falta.   `), `x: ${xs.map(show).join(", ")}   y: `, ...ys],
        say: tr(
          locale,
          `The rule is y equals ${sayLin(m, b, "en")}. The table has x values ${xs.map((v) => sayNum(v, "en")).join(", ")}. Find the missing y value, for x equals ${sayNum(x, "en")}.`,
          `La regla es y igual a ${sayLin(m, b, "es")}. La tabla tiene los valores de x ${xs.map((v) => sayNum(v, "es")).join(", ")}. Halla el valor de y que falta, para x igual a ${sayNum(x, "es")}.`,
        ),
        ...keypad,
        answer: { kind: "number", value: m * x + b },
        hints: [
          tr(locale, `The missing value is in the column where x = ${show(x)}.`, `El valor que falta está en la columna donde x = ${show(x)}.`),
          tr(locale, `Put ${show(x)} in place of x in the rule. Multiply first, then add or subtract.`, `Pon ${show(x)} en lugar de x en la regla. Primero multiplica y luego suma o resta.`),
          `${show(m)} × ${par(x)} = ${show(m * x)}`,
        ],
        steps: solve(x),
        seconds: 25,
      };
    },
  },
  {
    id: "m.pythag",
    subject: "math",
    grade: "8",
    title: { en: "The Pythagorean theorem", es: "El teorema de Pitágoras" },
    standard: "8.G.B.7",
    prereqs: ["m.sqrt"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => pythag(r, level, locale),
  },
  {
    id: "m.systems",
    subject: "math",
    grade: "8",
    title: { en: "Systems of linear equations", es: "Sistemas de ecuaciones lineales" },
    standard: "8.EE.C.8",
    prereqs: ["m.eq.multistep"],
    content: "computed",
    levels: 1,
    generate: (r, _level, locale) => systems(r, locale),
  },
  {
    id: "m.ineq.multistep",
    subject: "math",
    grade: "9",
    title: { en: "Multi-step inequalities", es: "Desigualdades de varios pasos" },
    standard: "A-REI.B.3",
    prereqs: ["m.ineq.onestep", "m.eq.multistep"],
    content: "computed",
    levels: 1,
    generate: (r, _level, locale) => inequality(r, locale),
  },
  {
    id: "m.poly.addsub",
    subject: "math",
    grade: "9",
    title: { en: "Add and subtract polynomials", es: "Sumar y restar polinomios" },
    standard: "A-APR.A.1",
    prereqs: ["m.expr.simplify"],
    content: "computed",
    levels: 1,
    generate: (r, _level, locale) => polyAddSub(r, locale),
  },
  {
    id: "m.poly.mult",
    subject: "math",
    grade: "9",
    title: { en: "Multiply polynomials", es: "Multiplicar polinomios" },
    standard: "A-APR.A.1",
    prereqs: ["m.poly.addsub", "m.exp.rules"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => polyMult(r, level, locale),
  },
  {
    id: "m.factor.tri",
    subject: "math",
    grade: "9",
    title: { en: "Factor trinomials", es: "Factorizar trinomios" },
    standard: "A-SSE.A.2",
    prereqs: ["m.poly.mult", "m.factors"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => factorTri(r, level, locale),
  },
  {
    id: "m.quad.solve",
    subject: "math",
    grade: "9",
    title: { en: "Solve quadratics by factoring", es: "Resolver cuadráticas factorizando" },
    standard: "A-REI.B.4b",
    prereqs: ["m.factor.tri"],
    content: "computed",
    levels: 1,
    generate: (r, _level, locale) => quadSolve(r, locale),
  },
  {
    id: "m.func.eval",
    subject: "math",
    grade: "9",
    title: { en: "Evaluate functions", es: "Evaluar funciones" },
    standard: "F-IF.A.2",
    prereqs: ["m.expr.eval", "m.int.multdiv"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => funcEval(r, level, locale),
  },
  {
    id: "m.line.equation",
    subject: "math",
    grade: "9",
    title: { en: "Write the equation of a line", es: "Escribir la ecuación de una recta" },
    standard: "F-LE.A.2",
    prereqs: ["m.slope"],
    content: "computed",
    levels: 2,
    generate: (r, level, locale) => lineEquation(r, level, locale),
  },
];
