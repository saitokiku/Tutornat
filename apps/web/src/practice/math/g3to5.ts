import type { Locale } from "@/lib/types";
import { gcd, lcm, type Rng } from "../rng";
import { sayFrac, tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 3–5: multiplication and division facts, multi-digit work, fractions and decimals.
// Pictures come first at level 1; hints name the strategy a teacher would use (arrays, related
// facts, benchmarks, place value). All arithmetic is on integers so an answer key is exact.

const blank: MathPart = { blank: true };
const fr = (n: number | string, d: number | string): MathPart => ({ frac: [n, d] });
/** A fraction as written in hints and steps. */
const ft = (n: number, d: number) => `${n}/${d}`;
const reduce = (n: number, d: number): [number, number] => {
  const g = gcd(n, d);
  return [n / g, d / g];
};
/** n/d the simplest way to write it: a whole number, a proper fraction or a mixed number. */
function simplest(n: number, d: number) {
  const [a, b] = reduce(n, d);
  if (b === 1) return String(a);
  return a < b ? ft(a, b) : `${Math.floor(a / b)} ${ft(a % b, b)}`;
}
/** "fourths", "cuartos": the plural name of a denominator. */
const denName = (d: number, locale: Locale) => sayFrac(2, d, locale).replace(/^2 /, "");
const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** "4, 8, 12": the first `count` multiples of `step`. */
const skipList = (step: number, count: number) => Array.from({ length: count }, (_, i) => step * (i + 1)).join(", ");
/** A skip-count start for a hint: at most three terms, so it never runs up to the answer. */
const skipStart = (step: number, groups: number) => `${skipList(step, Math.min(3, groups - 1))}, …`;
/** "y sobra 1" / "y sobran 4". */
const sobran = (n: number) => (n === 1 ? "sobra 1" : `sobran ${n}`);
/** A random proper fraction in lowest terms with denominator d. */
function properReduced(r: Rng, d: number) {
  let n = r.int(1, d - 1);
  while (gcd(n, d) !== 1) n = r.int(1, d - 1);
  return n;
}

/** Drops zeros after the decimal point that add nothing: "34.00" → "34", "3.20" → "3.2". */
const trimDec = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);

/** m ÷ 10^p written exactly, with no floating point: dec(305, 2) = "3.05", dec(37, -2) = "3700". */
function dec(m: number, p: number): string {
  if (p <= 0) return String(m * 10 ** -p);
  const s = String(m).padStart(p + 1, "0");
  return `${s.slice(0, -p)}.${s.slice(-p)}`;
}

const NAMES = ["Ava", "Mateo", "Priya", "Kenji", "Amara", "Diego", "Sofia", "Malik", "Lin", "Omar", "Grace", "Luis", "Aisha", "Noah", "Mei", "Carlos"];

type Unit = { abbr: [string, string]; sq: [string, string]; cu: [string, string] };
const UNITS: Unit[] = [
  { abbr: ["cm", "cm"], sq: ["square centimeters", "centímetros cuadrados"], cu: ["cubic centimeters", "centímetros cúbicos"] },
  { abbr: ["m", "m"], sq: ["square meters", "metros cuadrados"], cu: ["cubic meters", "metros cúbicos"] },
  { abbr: ["in", "pulg"], sq: ["square inches", "pulgadas cuadradas"], cu: ["cubic inches", "pulgadas cúbicas"] },
  { abbr: ["ft", "pies"], sq: ["square feet", "pies cuadrados"], cu: ["cubic feet", "pies cúbicos"] },
];
const un = (locale: Locale, pair: [string, string]) => tr(locale, pair[0], pair[1]);

const compareChoices = (locale: Locale): Choice[] => [
  { label: "<", say: tr(locale, "is less than", "es menor que") },
  { label: ">", say: tr(locale, "is greater than", "es mayor que") },
  { label: "=", say: tr(locale, "is equal to", "es igual a") },
];
/** Index into compareChoices for the sign of (left − right). */
const cmpIndex = (diff: number) => (diff < 0 ? 0 : diff > 0 ? 1 : 2);

/** Numbers as choices, shuffled, with the index of `want`. */
function numberChoices(r: Rng, values: number[], want: number) {
  const choices: Choice[] = r.shuffle(values).map((v) => ({ label: String(v), say: String(v) }));
  return { choices, index: choices.findIndex((c) => c.label === String(want)) };
}

/**
 * Hints and worked lines for k groups of n, built from a fact the learner already knows
 * (doubles, fives, tens, "one less than ten"). Never states k × n itself.
 */
function factPlan(k: number, n: number, locale: Locale): { hints: string[]; steps: string[] } {
  const t = (en: string, es: string) => tr(locale, en, es);
  switch (k) {
    case 0:
      return {
        hints: [
          t("One of the numbers is 0.", "Uno de los números es 0."),
          t("Think of groups with nothing in them.", "Piensa en grupos que no tienen nada."),
          n === 1 ? t("1 group of 0 has nothing in it.", "1 grupo de 0 no tiene nada.") : t(`${n} groups of 0: 0 + 0${n > 2 ? " + …" : ""}`, `${n} grupos de 0: 0 + 0${n > 2 ? " + …" : ""}`),
        ],
        steps: [t(`${n} ${pl(n, "group", "groups")} of 0 is 0.`, `${n} ${pl(n, "grupo", "grupos")} de 0 son 0.`)],
      };
    case 1:
      return {
        hints: [
          t("One of the numbers is 1.", "Uno de los números es 1."),
          t(`${n} × 1 means ${n} ${pl(n, "group", "groups")} of 1.`, `${n} × 1 son ${n} ${pl(n, "grupo", "grupos")} de 1.`),
          t(`Count one for each of the ${pl(n, "group", "groups")}.`, `Cuenta uno por cada grupo.`),
        ],
        steps: [t(`${n} ${pl(n, "group", "groups")} of 1 is ${n}.`, `${n} ${pl(n, "grupo", "grupos")} de 1 son ${n}.`)],
      };
    case 2:
      return {
        hints: [
          t("Times 2 means double.", "Multiplicar por 2 es sacar el doble."),
          t(`Add ${n} to itself: ${n} + ${n}.`, `Suma ${n} consigo mismo: ${n} + ${n}.`),
          n > 5
            ? t(`Double 5 is 10. Double ${n - 5} is ${2 * (n - 5)}.`, `El doble de 5 es 10. El doble de ${n - 5} es ${2 * (n - 5)}.`)
            : t(`Start at ${n} and count on ${n} more.`, `Empieza en ${n} y cuenta ${n} más.`),
        ],
        steps: [`${n} + ${n} = ${2 * n}`],
      };
    case 3:
      return {
        hints: [
          t("3 groups is 2 groups and 1 more group.", "3 grupos son 2 grupos y 1 grupo más."),
          t(`Find 2 × ${n}, then add one more ${n}.`, `Calcula 2 × ${n} y luego suma otro ${n}.`),
          t(`2 × ${n} = ${2 * n}. Now add ${n}.`, `2 × ${n} = ${2 * n}. Ahora suma ${n}.`),
        ],
        steps: [`2 × ${n} = ${2 * n}`, `${2 * n} + ${n} = ${3 * n}`],
      };
    case 4:
      return {
        hints: [
          t("4 is double 2.", "4 es el doble de 2."),
          t(`Double ${n}, then double again.`, `Duplica ${n} y luego vuelve a duplicar.`),
          t(`Double ${n} is ${2 * n}. Now double ${2 * n}.`, `El doble de ${n} es ${2 * n}. Ahora duplica ${2 * n}.`),
        ],
        steps: [`2 × ${n} = ${2 * n}`, `${2 * n} + ${2 * n} = ${4 * n}`],
      };
    case 5:
      return {
        hints: [
          t("5 is half of 10.", "5 es la mitad de 10."),
          t(`Find 10 × ${n}, then take half.`, `Calcula 10 × ${n} y luego saca la mitad.`),
          t(`10 × ${n} = ${10 * n}. Now take half of it.`, `10 × ${n} = ${10 * n}. Ahora saca la mitad.`),
        ],
        steps: [`10 × ${n} = ${10 * n}`, t(`Half of ${10 * n} is ${5 * n}.`, `La mitad de ${10 * n} es ${5 * n}.`)],
      };
    case 6:
      return {
        hints: [
          t("6 is 5 + 1.", "6 es 5 + 1."),
          t(`Find 5 × ${n}, then add one more ${n}.`, `Calcula 5 × ${n} y luego suma otro ${n}.`),
          t(`5 × ${n} = ${5 * n}. Now add ${n}.`, `5 × ${n} = ${5 * n}. Ahora suma ${n}.`),
        ],
        steps: [`5 × ${n} = ${5 * n}`, `${5 * n} + ${n} = ${6 * n}`],
      };
    case 7:
      return {
        hints: [
          t("7 is 5 + 2.", "7 es 5 + 2."),
          t(`Find 5 × ${n} and 2 × ${n}, then add them.`, `Calcula 5 × ${n} y 2 × ${n}, y luego súmalos.`),
          t(`5 × ${n} = ${5 * n} and 2 × ${n} = ${2 * n}.`, `5 × ${n} = ${5 * n} y 2 × ${n} = ${2 * n}.`),
        ],
        steps: [`5 × ${n} = ${5 * n}`, `2 × ${n} = ${2 * n}`, `${5 * n} + ${2 * n} = ${7 * n}`],
      };
    case 8:
      return {
        hints: [
          t("8 is double 4.", "8 es el doble de 4."),
          t(`Find 4 × ${n}, then double it.`, `Calcula 4 × ${n} y luego duplícalo.`),
          t(`4 × ${n} = ${4 * n}. Now double ${4 * n}.`, `4 × ${n} = ${4 * n}. Ahora duplica ${4 * n}.`),
        ],
        steps: [`4 × ${n} = ${4 * n}`, `${4 * n} + ${4 * n} = ${8 * n}`],
      };
    case 9:
      return {
        hints: [
          t("9 is one less than 10.", "9 es uno menos que 10."),
          t(`Find 10 × ${n}, then take away one ${n}.`, `Calcula 10 × ${n} y luego quita un ${n}.`),
          t(`10 × ${n} = ${10 * n}. Now take away ${n}.`, `10 × ${n} = ${10 * n}. Ahora quita ${n}.`),
        ],
        steps: [`10 × ${n} = ${10 * n}`, `${10 * n} − ${n} = ${9 * n}`],
      };
    default:
      return {
        hints: [
          t("Times 10 makes tens.", "Multiplicar por 10 da decenas."),
          t(`${n} × 10 is ${n} tens.`, `${n} × 10 son ${n} decenas.`),
          t(`Count by tens, ${n} times.`, `Cuenta de diez en diez, ${n} veces.`),
        ],
        steps: [t(`${n} tens = ${10 * n}`, `${n} decenas = ${10 * n}`)],
      };
  }
}

/** The easiest known fact to build from: tens, doubles, fives, then the rest. */
function planFor(a: number, b: number, order: number[]) {
  const k = order.find((f) => f === a || f === b)!;
  return { k, n: k === a ? b : a };
}
const FACT_ORDER = [10, 2, 5, 9, 3, 4, 6, 8, 7];
const EASY_ORDER = [0, 1, 10, 2, 5];

function factItem(a: number, b: number, order: number[], locale: Locale, seconds: number) {
  const { k, n } = planFor(a, b, order);
  const plan = factPlan(k, n, locale);
  return {
    prompt: [`${a} × ${b} = `, blank],
    say: tr(locale, `${a} times ${b}`, `${a} por ${b}`),
    input: "keypad" as const,
    answer: { kind: "number" as const, value: a * b },
    hints: plan.hints,
    steps: [...plan.steps, `${a} × ${b} = ${a * b}`],
    seconds,
  };
}

type Story = { en: (g: number, s: number, name: string) => string; es: (g: number, s: number, name: string) => string; unit: [string, string] };
const GROUP_STORIES: Story[] = [
  {
    en: (g, s, n) => `${n} has ${g} bags. Each bag has ${s} apples. How many apples are there in all?`,
    es: (g, s, n) => `${n} tiene ${g} bolsas. Cada bolsa tiene ${s} manzanas. ¿Cuántas manzanas hay en total?`,
    unit: ["apples", "manzanas"],
  },
  {
    en: (g, s, n) => `${n} has ${g} boxes of crayons. Each box has ${s} crayons. How many crayons are there in all?`,
    es: (g, s, n) => `${n} tiene ${g} cajas de crayones. Cada caja tiene ${s} crayones. ¿Cuántos crayones hay en total?`,
    unit: ["crayons", "crayones"],
  },
  {
    en: (g, s) => `There are ${g} tables in the library. Each table has ${s} chairs. How many chairs are there?`,
    es: (g, s) => `Hay ${g} mesas en la biblioteca. Cada mesa tiene ${s} sillas. ¿Cuántas sillas hay?`,
    unit: ["chairs", "sillas"],
  },
  {
    en: (g, s, n) => `${n} puts ${s} cookies on each of ${g} plates. How many cookies is that?`,
    es: (g, s, n) => `${n} pone ${s} galletas en cada uno de ${g} platos. ¿Cuántas galletas son en total?`,
    unit: ["cookies", "galletas"],
  },
  {
    en: (g, s) => `A garden has ${g} rows of tomato plants. Each row has ${s} plants. How many plants are there?`,
    es: (g, s) => `Un huerto tiene ${g} hileras de tomates. Cada hilera tiene ${s} plantas. ¿Cuántas plantas hay?`,
    unit: ["plants", "plantas"],
  },
  {
    en: (g, s, n) => `${n} buys ${g} packs of juice boxes. Each pack has ${s} juice boxes. How many juice boxes is that?`,
    es: (g, s, n) => `${n} compra ${g} paquetes de jugos. Cada paquete tiene ${s} jugos. ¿Cuántos jugos son en total?`,
    unit: ["juice boxes", "jugos"],
  },
  {
    en: (g, s) => `There are ${g} vans for the field trip. Each van carries ${s} students. How many students ride in the vans?`,
    es: (g, s) => `Hay ${g} camionetas para la excursión. Cada camioneta lleva ${s} estudiantes. ¿Cuántos estudiantes van en las camionetas?`,
    unit: ["students", "estudiantes"],
  },
  {
    en: (g, s, n) => `${n} has ${g} pages of stickers. Each page has ${s} stickers. How many stickers are there?`,
    es: (g, s, n) => `${n} tiene ${g} hojas de calcomanías. Cada hoja tiene ${s} calcomanías. ¿Cuántas calcomanías hay?`,
    unit: ["stickers", "calcomanías"],
  },
];

/** One stage of long division: the number being divided, its quotient digit and what is left. */
type Stage = { chunk: number; q: number; rem: number; brought?: number };
function longDivision(n: number, d: number): Stage[] {
  const digits = String(n).split("").map(Number);
  let i = 0, chunk = 0;
  while (i < digits.length && chunk < d) chunk = chunk * 10 + digits[i++];
  const stages: Stage[] = [{ chunk, q: Math.floor(chunk / d), rem: chunk % d }];
  while (i < digits.length) {
    const brought = digits[i++];
    const next = stages[stages.length - 1].rem * 10 + brought;
    stages.push({ chunk: next, q: Math.floor(next / d), rem: next % d, brought });
  }
  return stages;
}
function stageText(s: Stage, d: number, locale: Locale) {
  const left = s.rem ? tr(locale, `, with ${s.rem} left over`, `, y ${sobran(s.rem)}`) : "";
  const core = `${s.chunk} ÷ ${d} = ${s.q}${left}.`;
  return s.brought === undefined ? core : tr(locale, `Bring down the ${s.brought}: ${core}`, `Baja el ${s.brought}: ${core}`);
}

const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
const ODD_COMPOSITES = [21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 99];
const MANY_FACTORS = [12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 64, 70, 72, 75, 80, 84, 90, 96];

const DENS = [2, 3, 4, 5, 6, 8, 10, 12];

/** Place-value names, by power of ten. Spanish carries its article ("las decenas"). */
const PLACE: Record<number, [string, string]> = {
  [-3]: ["thousandths", "los milésimos"],
  [-2]: ["hundredths", "los centésimos"],
  [-1]: ["tenths", "los décimos"],
  0: ["ones", "las unidades"],
  1: ["tens", "las decenas"],
  2: ["hundreds", "las centenas"],
  3: ["thousands", "las unidades de millar"],
  4: ["ten thousands", "las decenas de millar"],
  5: ["hundred thousands", "las centenas de millar"],
};

/** Reads an expression aloud: "open parenthesis 4 plus 3 close parenthesis times 5". */
function sayExpr(text: string, locale: Locale) {
  const words: Record<string, [string, string]> = {
    "+": ["plus", "más"],
    "−": ["minus", "menos"],
    "×": ["times", "por"],
    "÷": ["divided by", "entre"],
    "(": ["open parenthesis", "abre paréntesis"],
    ")": ["close parenthesis", "cierra paréntesis"],
  };
  return (text.match(/\d+|[+−×÷()]/g) ?? []).map((tok) => (words[tok] ? un(locale, words[tok]) : tok)).join(" ");
}

/** An expression with its rewrite chain: chain[i] is the expression after the (i+1)th operation. */
type OpsExpr = { text: string; first: [string, number]; chain: string[]; value: number; rule: "pemdas" | "left-add" | "left-mul" | "parens" };

function plainExpr(r: Rng): OpsExpr {
  switch (r.int(0, 8)) {
    case 0: {
      const a = r.int(2, 20), b = r.int(2, 9), c = r.int(2, 9);
      return { text: `${a} + ${b} × ${c}`, first: [`${b} × ${c}`, b * c], chain: [`${a} + ${b * c}`, `${a + b * c}`], value: a + b * c, rule: "pemdas" };
    }
    case 1: {
      const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 20);
      return { text: `${a} × ${b} + ${c}`, first: [`${a} × ${b}`, a * b], chain: [`${a * b} + ${c}`, `${a * b + c}`], value: a * b + c, rule: "pemdas" };
    }
    case 2: {
      const b = r.int(2, 6), c = r.int(2, 6), a = b * c + r.int(1, 30);
      return { text: `${a} − ${b} × ${c}`, first: [`${b} × ${c}`, b * c], chain: [`${a} − ${b * c}`, `${a - b * c}`], value: a - b * c, rule: "pemdas" };
    }
    case 3: {
      const a = r.int(2, 9), b = r.int(2, 9), c = r.int(1, a * b - 1);
      return { text: `${a} × ${b} − ${c}`, first: [`${a} × ${b}`, a * b], chain: [`${a * b} − ${c}`, `${a * b - c}`], value: a * b - c, rule: "pemdas" };
    }
    case 4: {
      const c = r.int(2, 9), q = r.int(2, 9), b = c * q, a = r.int(1, 20);
      return { text: `${a} + ${b} ÷ ${c}`, first: [`${b} ÷ ${c}`, q], chain: [`${a} + ${q}`, `${a + q}`], value: a + q, rule: "pemdas" };
    }
    case 5: {
      const b = r.int(2, 9), q = r.int(3, 10), a = b * q, c = r.int(1, q - 1);
      return { text: `${a} ÷ ${b} − ${c}`, first: [`${a} ÷ ${b}`, q], chain: [`${q} − ${c}`, `${q - c}`], value: q - c, rule: "pemdas" };
    }
    case 6: {
      const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 9), d = r.int(2, 9);
      return {
        text: `${a} × ${b} + ${c} × ${d}`,
        first: [`${a} × ${b}`, a * b],
        chain: [`${a * b} + ${c} × ${d}`, `${a * b} + ${c * d}`, `${a * b + c * d}`],
        value: a * b + c * d,
        rule: "pemdas",
      };
    }
    case 7: {
      const a = r.int(10, 30), b = r.int(1, a - 1), c = r.int(1, 20);
      return { text: `${a} − ${b} + ${c}`, first: [`${a} − ${b}`, a - b], chain: [`${a - b} + ${c}`, `${a - b + c}`], value: a - b + c, rule: "left-add" };
    }
    default: {
      const b = r.int(2, 9), q = r.int(2, 9), a = b * q, c = r.int(2, 9);
      return { text: `${a} ÷ ${b} × ${c}`, first: [`${a} ÷ ${b}`, q], chain: [`${q} × ${c}`, `${q * c}`], value: q * c, rule: "left-mul" };
    }
  }
}

function parenExpr(r: Rng): OpsExpr {
  switch (r.int(0, 7)) {
    case 0: {
      const a = r.int(1, 9), b = r.int(1, 9), c = r.int(2, 9);
      return { text: `(${a} + ${b}) × ${c}`, first: [`${a} + ${b}`, a + b], chain: [`${a + b} × ${c}`, `${(a + b) * c}`], value: (a + b) * c, rule: "parens" };
    }
    case 1: {
      const a = r.int(2, 9), b = r.int(5, 15), c = r.int(1, b - 2);
      return { text: `${a} × (${b} − ${c})`, first: [`${b} − ${c}`, b - c], chain: [`${a} × ${b - c}`, `${a * (b - c)}`], value: a * (b - c), rule: "parens" };
    }
    case 2: {
      const c = r.int(2, 9), q = r.int(2, 9), s = c * q, a = r.int(1, s - 1), b = s - a;
      return { text: `(${a} + ${b}) ÷ ${c}`, first: [`${a} + ${b}`, s], chain: [`${s} ÷ ${c}`, `${q}`], value: q, rule: "parens" };
    }
    case 3: {
      const b = r.int(2, 20), c = r.int(2, 20), a = b + c + r.int(1, 30);
      return { text: `${a} − (${b} + ${c})`, first: [`${b} + ${c}`, b + c], chain: [`${a} − ${b + c}`, `${a - b - c}`], value: a - b - c, rule: "parens" };
    }
    case 4: {
      const a = r.int(6, 20), b = r.int(1, a - 2), c = r.int(2, 6), d = r.int(1, 20);
      return {
        text: `(${a} − ${b}) × ${c} + ${d}`,
        first: [`${a} − ${b}`, a - b],
        chain: [`${a - b} × ${c} + ${d}`, `${(a - b) * c} + ${d}`, `${(a - b) * c + d}`],
        value: (a - b) * c + d,
        rule: "parens",
      };
    }
    case 5: {
      const a = r.int(2, 6), b = r.int(1, 9), c = r.int(1, 9), d = r.int(1, a * (b + c) - 1);
      return {
        text: `${a} × (${b} + ${c}) − ${d}`,
        first: [`${b} + ${c}`, b + c],
        chain: [`${a} × ${b + c} − ${d}`, `${a * (b + c)} − ${d}`, `${a * (b + c) - d}`],
        value: a * (b + c) - d,
        rule: "parens",
      };
    }
    case 6: {
      const a = r.int(1, 6), b = r.int(1, 6), c = r.int(6, 15), d = r.int(1, c - 2);
      return {
        text: `(${a} + ${b}) × (${c} − ${d})`,
        first: [`${a} + ${b}`, a + b],
        chain: [`${a + b} × (${c} − ${d})`, `${a + b} × ${c - d}`, `${(a + b) * (c - d)}`],
        value: (a + b) * (c - d),
        rule: "parens",
      };
    }
    default: {
      const a = r.int(1, 20), b = r.int(2, 6), c = r.int(5, 15), d = r.int(1, c - 2);
      return {
        text: `${a} + ${b} × (${c} − ${d})`,
        first: [`${c} − ${d}`, c - d],
        chain: [`${a} + ${b} × ${c - d}`, `${a} + ${b * (c - d)}`, `${a + b * (c - d)}`],
        value: a + b * (c - d),
        rule: "parens",
      };
    }
  }
}

/**
 * m.frac.unit level 3, on the fraction-bar pad: split the bar into equal parts and shade a fraction of
 * it. Any equal amount is right (6/8 shows 3/4). Tagged slips: shading the rest, part-to-part.
 */
function buildFraction(r: Rng, locale: Locale): ItemBody {
  const d = r.pick([2, 3, 4, 6, 8]);
  const n = r.int(1, d - 1);
  const wrong: { value: string; why: string }[] = [];
  if (d - n !== n) wrong.push({ value: ft(d - n, d), why: "shaded-the-rest" });
  if (n + d <= 12) wrong.push({ value: ft(n, n + d), why: "part-to-part" });
  return {
    prompt: [tr(locale, "Split the bar into equal parts. Shade ", "Divide la barra en partes iguales. Sombrea "), fr(n, d), tr(locale, " of it.", " de la barra.")],
    say: tr(locale, `Split the bar into equal parts. Shade ${sayFrac(n, d, locale)} of it.`, `Divide la barra en partes iguales. Sombrea ${sayFrac(n, d, locale)} de la barra.`),
    input: "fraction-bar",
    pad: { kind: "fraction-bar", maxParts: 12 },
    answer: { kind: "fraction", n, d },
    wrong,
    hints: [
      tr(locale, "What does the bottom number of the fraction tell you?", "¿Qué te dice el número de abajo de la fracción?"),
      tr(locale, "The bottom number is how many equal parts the whole has. The top number is how many to shade.", "El número de abajo dice en cuántas partes iguales se divide el entero. El de arriba, cuántas sombrear."),
      tr(locale, `First split the bar into ${d} equal parts.`, `Primero divide la barra en ${d} partes iguales.`),
    ],
    steps: [
      tr(locale, `Split the bar into ${d} equal parts.`, `Divide la barra en ${d} partes iguales.`),
      tr(locale, `Shade ${n} of the ${d} parts.`, `Sombrea ${n} de las ${d} partes.`),
      tr(locale, `${ft(n, d)} of the bar is shaded.`, `${ft(n, d)} de la barra está sombreada.`),
    ],
    seconds: 20,
  };
}

/**
 * m.frac.numberline level 3, on the number-line pad: put a point at a fraction (3.NF.A.2 asks for both
 * reading and placing). Tagged slips: counting tick marks instead of jumps, losing the first whole.
 */
function placeFraction(r: Rng, locale: Locale): ItemBody {
  const max = r.bool() ? 1 : 2;
  const d = max === 1 ? r.pick([2, 3, 4, 6, 8]) : r.pick([2, 3, 4, 6]);
  const n = max === 1 || !r.bool(0.65) ? r.int(1, d - 1) : r.int(d + 1, 2 * d - 1);
  const past = n > d;
  const wrong: { value: string; why: string }[] = [];
  if (n >= 2) wrong.push({ value: ft(n - 1, d), why: "counted-ticks-not-jumps" });
  if (past) wrong.push({ value: ft(n - d, d), why: "forgot-the-whole" });
  return {
    prompt: [tr(locale, "Put a point at ", "Coloca un punto en "), fr(n, d), tr(locale, " on the number line.", " en la recta numérica.")],
    say: tr(locale, `Put a point at ${sayFrac(n, d, locale)} on the number line.`, `Coloca un punto en ${sayFrac(n, d, locale)} en la recta numérica.`),
    input: "number-line",
    pad: { kind: "number-line", min: 0, max, step: 1, denominator: d },
    answer: { kind: "fraction", n, d },
    wrong,
    hints: [
      tr(locale, "How many equal parts is each whole split into?", "¿En cuántas partes iguales está dividido cada entero?"),
      tr(locale, "Each jump from one tick mark to the next is one part. Count jumps from 0, not marks.", "Cada salto de una marca a la siguiente es una parte. Cuenta saltos desde 0, no marcas."),
      past
        ? tr(locale, `1 is the same as ${ft(d, d)}. Start at 1 and count on ${n - d} more ${pl(n - d, "jump", "jumps")}.`, `1 es lo mismo que ${ft(d, d)}. Empieza en 1 y avanza ${n - d} ${pl(n - d, "salto", "saltos")} más.`)
        : tr(locale, `Each whole has ${d} equal parts, so each jump is ${ft(1, d)}.`, `Cada entero tiene ${d} partes iguales, así que cada salto es ${ft(1, d)}.`),
    ],
    steps: [
      tr(locale, `Each jump is ${ft(1, d)}.`, `Cada salto es ${ft(1, d)}.`),
      tr(locale, `Count ${n} ${pl(n, "jump", "jumps")} from 0.`, `Cuenta ${n} ${pl(n, "salto", "saltos")} desde 0.`),
      past ? tr(locale, `The point goes at ${ft(n, d)}, which is ${simplest(n, d)}.`, `El punto va en ${ft(n, d)}, que es ${simplest(n, d)}.`) : tr(locale, `The point goes at ${ft(n, d)}.`, `El punto va en ${ft(n, d)}.`),
    ],
    seconds: 20,
  };
}

export const MATH_3_5: Skill[] = [
  {
    id: "m.mult.groups",
    subject: "math",
    grade: "3",
    title: { en: "Multiply with equal groups", es: "Multiplicar con grupos iguales" },
    standard: "3.OA.A.1",
    prereqs: ["m.skip.count", "m.add.2digit"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      if (level === 1) {
        const rows = r.int(2, 5), cols = r.int(2, 6);
        const isArray = r.bool();
        const p = rows * cols;
        return {
          prompt: [isArray ? tr(locale, `${rows} rows of ${cols}. `, `${rows} filas de ${cols}. `) : tr(locale, `${rows} groups of ${cols}. `, `${rows} grupos de ${cols}. `), `${rows} × ${cols} = `, blank],
          say: isArray
            ? tr(locale, `${rows} rows of ${cols}. How many in all?`, `${rows} filas de ${cols}. ¿Cuántos hay en total?`)
            : tr(locale, `${rows} groups of ${cols}. How many in all?`, `${rows} grupos de ${cols}. ¿Cuántos hay en total?`),
          ...(isArray
            ? { visual: { kind: "array" as const, rows, cols }, alt: tr(locale, `An array with ${rows} rows and ${cols} in each row`, `Un arreglo con ${rows} filas y ${cols} en cada fila`) }
            : {
                visual: { kind: "dots" as const, groups: Array<number>(rows).fill(cols) },
                alt: tr(locale, `${rows} groups of dots with ${cols} dots in each group`, `${rows} grupos de puntos con ${cols} puntos en cada grupo`),
              }),
          input: "keypad",
          answer: { kind: "number", value: p },
          hints: [
            isArray
              ? tr(locale, `Each row has ${cols}. How many rows are there?`, `Cada fila tiene ${cols}. ¿Cuántas filas hay?`)
              : tr(locale, `Each group has ${cols}. How many groups are there?`, `Cada grupo tiene ${cols}. ¿Cuántos grupos hay?`),
            isArray
              ? tr(locale, `Count by ${cols}, once for each row.`, `Cuenta de ${cols} en ${cols}, una vez por cada fila.`)
              : tr(locale, `Count by ${cols}, once for each group.`, `Cuenta de ${cols} en ${cols}, una vez por cada grupo.`),
            tr(locale, `Count by ${cols}: ${skipStart(cols, rows)}`, `Cuenta de ${cols} en ${cols}: ${skipStart(cols, rows)}`),
          ],
          steps: [tr(locale, `Count by ${cols}, ${rows} times: ${skipList(cols, rows)}.`, `Cuenta de ${cols} en ${cols}, ${rows} veces: ${skipList(cols, rows)}.`), `${rows} × ${cols} = ${p}`],
          seconds: 15,
        };
      }
      const g = r.int(2, 6), s = r.pick([2, 3, 4, 5, 6, 10]);
      const story = r.pick(GROUP_STORIES), name = r.pick(NAMES);
      const text = tr(locale, story.en(g, s, name), story.es(g, s, name));
      const p = g * s;
      return {
        prompt: [text],
        say: text,
        input: "keypad",
        answer: { kind: "number", value: p },
        hints: [
          tr(locale, "How many groups are there? How many are in each group?", "¿Cuántos grupos hay? ¿Cuántos hay en cada grupo?"),
          tr(locale, `${g} groups of ${s} is ${g} × ${s}.`, `${g} grupos de ${s} es ${g} × ${s}.`),
          tr(locale, `Count by ${s}: ${skipStart(s, g)}`, `Cuenta de ${s} en ${s}: ${skipStart(s, g)}`),
        ],
        steps: [
          tr(locale, `${g} groups of ${s} is ${g} × ${s}.`, `${g} grupos de ${s} es ${g} × ${s}.`),
          tr(locale, `Count by ${s}: ${skipList(s, g)}.`, `Cuenta de ${s} en ${s}: ${skipList(s, g)}.`),
          `${p} ${un(locale, story.unit)}`,
        ],
        seconds: 45,
      };
    },
  },
  {
    id: "m.mult.easy",
    subject: "math",
    grade: "3",
    title: { en: "Multiply by 0, 1, 2, 5 and 10", es: "Multiplicar por 0, 1, 2, 5 y 10" },
    standard: "3.OA.C.7",
    prereqs: ["m.mult.groups"],
    content: "computed",
    levels: 1,
    generate(r, _level, locale) {
      const s = r.pick([0, 1, 2, 5, 10]);
      const m = r.int(s === 0 ? 1 : 0, 10);
      const [a, b] = r.bool() ? [s, m] : [m, s];
      return factItem(a, b, EASY_ORDER, locale, 4);
    },
  },
  {
    id: "m.mult.facts",
    subject: "math",
    grade: "3",
    title: { en: "Multiplication facts to 10 × 10", es: "Tablas de multiplicar hasta 10 × 10" },
    standard: "3.OA.C.7",
    prereqs: ["m.mult.easy"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const k = level === 1 ? r.pick([3, 4]) : level === 2 ? r.pick([6, 7, 8, 9]) : r.int(2, 10);
      const n = r.int(2, 10);
      const [a, b] = r.bool() ? [k, n] : [n, k];
      return factItem(a, b, FACT_ORDER, locale, level === 1 ? 5 : 6);
    },
  },
  {
    id: "m.div.facts",
    subject: "math",
    grade: "3",
    title: { en: "Division facts", es: "Divisiones básicas" },
    standard: "3.OA.C.7",
    prereqs: ["m.mult.facts"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const d = level === 1 ? r.pick([2, 5, 10]) : r.int(2, 10);
      const q = r.int(1, 10);
      const n = d * q;
      const anchor =
        q === 1
          ? tr(locale, `${d} × 2 = ${2 * d}. That is too much, so use fewer groups.`, `${d} × 2 = ${2 * d}. Es demasiado, así que usa menos grupos.`)
          : q === 2
            ? tr(locale, `Count by ${d}s: ${d}, … How many ${d}s make ${n}?`, `Cuenta de ${d} en ${d}: ${d}, … ¿Cuántos ${d} forman ${n}?`)
            : q <= 5
              ? tr(locale, `${d} × 2 = ${2 * d}. Count on by ${d}s from there.`, `${d} × 2 = ${2 * d}. Sigue contando de ${d} en ${d} desde ahí.`)
              : tr(locale, `${d} × 5 = ${5 * d}. Count on by ${d}s from there.`, `${d} × 5 = ${5 * d}. Sigue contando de ${d} en ${d} desde ahí.`);
      return {
        prompt: [`${n} ÷ ${d} = `, blank],
        say: tr(locale, `${n} divided by ${d}`, `${n} entre ${d}`),
        input: "keypad",
        answer: { kind: "number", value: q },
        hints: [
          tr(locale, `Think: ${d} times what number is ${n}?`, `Piensa: ¿${d} por qué número da ${n}?`),
          tr(locale, `Division undoes multiplication. Find the missing number in ${d} × ? = ${n}.`, `La división deshace la multiplicación. Busca el número que falta en ${d} × ? = ${n}.`),
          anchor,
        ],
        steps: [`${d} × ${q} = ${n}`, tr(locale, `So ${n} ÷ ${d} = ${q}.`, `Así que ${n} ÷ ${d} = ${q}.`)],
        seconds: level === 1 ? 5 : 6,
      };
    },
  },
  {
    id: "m.round",
    subject: "math",
    grade: "3",
    title: { en: "Round to the nearest 10 or 100", es: "Redondear a la decena o centena más cercana" },
    standard: "3.NBT.A.1",
    prereqs: ["m.addsub.1000"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const tens = level === 1;
      const unit = tens ? 10 : 100;
      const n = tens ? (r.bool(0.4) ? r.int(1, 9) : r.int(10, 99)) * 10 + r.int(1, 9) : r.int(1, 9) * 100 + (r.bool(0.15) ? 50 : r.int(1, 99));
      const lo = n - (n % unit), hi = lo + unit, half = lo + unit / 2;
      const digit = tens ? n % 10 : Math.floor((n % 100) / 10);
      const up = n >= half;
      const want = up ? hi : lo;
      const marks = Array.from({ length: 11 }, (_, i) => lo + (i * unit) / 10);
      return {
        prompt: [tens ? tr(locale, `Round ${n} to the nearest ten.`, `Redondea ${n} a la decena más cercana.`) : tr(locale, `Round ${n} to the nearest hundred.`, `Redondea ${n} a la centena más cercana.`)],
        say: tens ? tr(locale, `Round ${n} to the nearest ten.`, `Redondea ${n} a la decena más cercana.`) : tr(locale, `Round ${n} to the nearest hundred.`, `Redondea ${n} a la centena más cercana.`),
        visual: { kind: "number-line", min: lo, max: hi, marks, marker: n },
        alt: tr(locale, `A number line from ${lo} to ${hi} with a dot at ${n}`, `Una recta numérica de ${lo} a ${hi} con un punto en ${n}`),
        input: "keypad",
        answer: { kind: "number", value: want },
        hints: [
          tens ? tr(locale, `Which two tens is ${n} between?`, `¿Entre qué dos decenas está ${n}?`) : tr(locale, `Which two hundreds is ${n} between?`, `¿Entre qué dos centenas está ${n}?`),
          tr(locale, `${n} is between ${lo} and ${hi}. Halfway is ${half}.`, `${n} está entre ${lo} y ${hi}. La mitad del camino es ${half}.`),
          tens
            ? tr(locale, `Look at the ones digit: ${digit}. Is it 5 or more?`, `Mira la cifra de las unidades: ${digit}. ¿Es 5 o más?`)
            : tr(locale, `Look at the tens digit: ${digit}. Is it 5 or more?`, `Mira la cifra de las decenas: ${digit}. ¿Es 5 o más?`),
        ],
        steps: [
          tr(locale, `${n} is between ${lo} and ${hi}.`, `${n} está entre ${lo} y ${hi}.`),
          up
            ? tr(locale, `The ${tens ? "ones" : "tens"} digit is ${digit}, which is 5 or more, so round up.`, `La cifra de las ${tens ? "unidades" : "decenas"} es ${digit}, que es 5 o más, así que redondea hacia arriba.`)
            : tr(locale, `The ${tens ? "ones" : "tens"} digit is ${digit}, which is less than 5, so round down.`, `La cifra de las ${tens ? "unidades" : "decenas"} es ${digit}, que es menos de 5, así que redondea hacia abajo.`),
          tr(locale, `${n} rounds to ${want}.`, `${n} se redondea a ${want}.`),
        ],
        seconds: tens ? 12 : 15,
      };
    },
  },
  {
    id: "m.frac.unit",
    subject: "math",
    grade: "3",
    title: { en: "Name the fraction", es: "Nombrar la fracción" },
    standard: "3.NF.A.1",
    prereqs: ["m.mult.groups"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3) return buildFraction(r, locale);
      const d = level === 1 ? r.pick([2, 3, 4, 6, 8]) : r.pick([3, 4, 5, 6, 8]);
      const n = level === 1 ? 1 : r.int(2, d - 1);
      return {
        prompt: [tr(locale, "What fraction of the bar is shaded?", "¿Qué fracción de la barra está sombreada?")],
        say: tr(locale, "What fraction of the bar is shaded?", "¿Qué fracción de la barra está sombreada?"),
        visual: { kind: "fraction", parts: d, shaded: n },
        alt: tr(locale, `A bar split into ${d} equal parts. ${n} ${pl(n, "part is", "parts are")} shaded.`, `Una barra dividida en ${d} partes iguales. ${n} ${pl(n, "parte está sombreada", "partes están sombreadas")}.`),
        input: "fraction",
        answer: { kind: "fraction", n, d },
        hints: [
          tr(locale, "How many equal parts is the whole bar split into?", "¿En cuántas partes iguales está dividida la barra?"),
          tr(locale, "The number of equal parts goes on the bottom. The number of shaded parts goes on top.", "El número de partes iguales va abajo. El número de partes sombreadas va arriba."),
          tr(locale, `The bar has ${d} equal parts, so the bottom number is ${d}.`, `La barra tiene ${d} partes iguales, así que el número de abajo es ${d}.`),
        ],
        steps: [
          tr(locale, `${d} equal parts: the bottom number is ${d}.`, `${d} partes iguales: el número de abajo es ${d}.`),
          tr(locale, `${n} ${pl(n, "part is", "parts are")} shaded: the top number is ${n}.`, `${n} ${pl(n, "parte sombreada", "partes sombreadas")}: el número de arriba es ${n}.`),
          tr(locale, `${ft(n, d)} of the bar is shaded.`, `${ft(n, d)} de la barra está sombreada.`),
        ],
        seconds: level === 1 ? 10 : 12,
      };
    },
  },
  {
    id: "m.frac.numberline",
    subject: "math",
    grade: "3",
    title: { en: "Fractions on a number line", es: "Fracciones en la recta numérica" },
    standard: "3.NF.A.2",
    prereqs: ["m.frac.unit"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      if (level === 3) return placeFraction(r, locale);
      const max = level === 1 ? 1 : 2;
      const d = level === 1 ? r.pick([2, 3, 4, 6, 8]) : r.pick([2, 3, 4, 6]);
      const n = level === 1 || !r.bool(0.65) ? r.int(1, d - 1) : r.int(d + 1, 2 * d - 1);
      const past = n > d;
      return {
        prompt: [tr(locale, "What fraction is at the dot?", "¿Qué fracción está en el punto?")],
        say: tr(locale, "What fraction is at the dot on the number line?", "¿Qué fracción está en el punto de la recta numérica?"),
        visual: { kind: "number-line", min: 0, max, marks: max === 1 ? [0, 1] : [0, 1, 2], denominator: d, marker: n / d },
        alt:
          max === 1
            ? tr(locale, `A number line from 0 to 1, split into ${d} equal parts, with a dot on one of the marks`, `Una recta numérica de 0 a 1, dividida en ${d} partes iguales, con un punto en una de las marcas`)
            : tr(
                locale,
                `A number line from 0 to 2. Each whole is split into ${d} equal parts. A dot is on a mark between ${past ? "1 and 2" : "0 and 1"}.`,
                `Una recta numérica de 0 a 2. Cada entero está dividido en ${d} partes iguales. Hay un punto en una marca entre ${past ? "1 y 2" : "0 y 1"}.`,
              ),
        input: "fraction",
        answer: { kind: "fraction", n, d },
        hints: [
          tr(locale, "How many equal parts are between 0 and 1?", "¿Cuántas partes iguales hay entre 0 y 1?"),
          tr(locale, "Count the jumps from 0 to the dot. That number goes on top.", "Cuenta los saltos desde 0 hasta el punto. Ese número va arriba."),
          past
            ? tr(locale, `1 is the same as ${ft(d, d)}. Count on from 1, one part at a time.`, `1 es lo mismo que ${ft(d, d)}. Sigue contando desde 1, una parte a la vez.`)
            : tr(locale, `There are ${d} equal parts between 0 and 1, so the bottom number is ${d}.`, `Hay ${d} partes iguales entre 0 y 1, así que el número de abajo es ${d}.`),
        ],
        steps: [
          tr(locale, `Each part is ${ft(1, d)}.`, `Cada parte es ${ft(1, d)}.`),
          tr(locale, `The dot is ${n} ${pl(n, "part", "parts")} from 0.`, `El punto está a ${n} ${pl(n, "parte", "partes")} de 0.`),
          past ? tr(locale, `The dot is at ${ft(n, d)}, which is ${simplest(n, d)}.`, `El punto está en ${ft(n, d)}, que es ${simplest(n, d)}.`) : tr(locale, `The dot is at ${ft(n, d)}.`, `El punto está en ${ft(n, d)}.`),
        ],
        seconds: level === 1 ? 15 : 20,
      };
    },
  },
  {
    id: "m.area.rect",
    subject: "math",
    grade: "3",
    title: { en: "Area and perimeter of rectangles", es: "Área y perímetro de rectángulos" },
    standard: "3.MD.C.7",
    prereqs: ["m.mult.facts"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const unit = r.pick(UNITS);
      const abbr = un(locale, unit.abbr), sq = un(locale, unit.sq);
      const rectAlt = (w: number, h: number) => tr(locale, `A rectangle ${w} ${abbr} long and ${h} ${abbr} wide`, `Un rectángulo de ${w} ${abbr} de largo y ${h} ${abbr} de ancho`);
      if (level === 1) {
        const w = r.int(2, 10), h = r.int(2, 10), area = w * h;
        return {
          prompt: [tr(locale, "Find the area of the rectangle. ", "Encuentra el área del rectángulo. "), tr(locale, "Area = ", "Área = "), blank, ` ${sq}`],
          say: tr(locale, `Find the area of the rectangle in ${sq}.`, `Encuentra el área del rectángulo en ${sq}.`),
          visual: { kind: "rect", w, h, unit: abbr },
          alt: rectAlt(w, h),
          input: "keypad",
          answer: { kind: "number", value: area },
          hints: [
            tr(locale, "Area is the number of unit squares that cover the rectangle.", "El área es el número de cuadrados de una unidad que cubren el rectángulo."),
            tr(locale, `Think of it as ${h} rows with ${w} squares in each row.`, `Piénsalo como ${h} filas con ${w} cuadrados en cada fila.`),
            tr(locale, `Count by ${w} for each row: ${skipStart(w, h)}`, `Cuenta de ${w} en ${w} por cada fila: ${skipStart(w, h)}`),
          ],
          steps: [tr(locale, "Area = length × width", "Área = largo × ancho"), `${w} × ${h} = ${area}`, tr(locale, `The area is ${area} ${sq}.`, `El área es ${area} ${sq}.`)],
          seconds: 15,
        };
      }
      if (r.bool()) {
        const w = r.int(3, 15), h = r.int(2, w), per = 2 * (w + h);
        return {
          prompt: [tr(locale, "Find the perimeter of the rectangle. ", "Encuentra el perímetro del rectángulo. "), tr(locale, "Perimeter = ", "Perímetro = "), blank, ` ${abbr}`],
          say: tr(locale, "Find the perimeter of the rectangle.", "Encuentra el perímetro del rectángulo."),
          visual: { kind: "rect", w, h, unit: abbr },
          alt: rectAlt(w, h),
          input: "keypad",
          answer: { kind: "number", value: per },
          hints: [
            tr(locale, "Perimeter is the distance all the way around.", "El perímetro es la distancia alrededor de toda la figura."),
            tr(locale, `Add all four sides. Two sides are ${w} ${abbr} and two are ${h} ${abbr}.`, `Suma los cuatro lados. Dos lados miden ${w} ${abbr} y dos miden ${h} ${abbr}.`),
            tr(locale, `One long side and one short side: ${w} + ${h} = ${w + h}.`, `Un lado largo y un lado corto: ${w} + ${h} = ${w + h}.`),
          ],
          steps: [`${w} + ${h} + ${w} + ${h}`, `= ${per} ${abbr}`],
          seconds: 30,
        };
      }
      const s = r.int(2, 10), o = r.int(2, 10), area = s * o;
      return {
        prompt: [
          tr(
            locale,
            `A rectangle has an area of ${area} ${sq}. One side is ${s} ${abbr} long. How long is the other side?`,
            `Un rectángulo tiene un área de ${area} ${sq}. Un lado mide ${s} ${abbr}. ¿Cuánto mide el otro lado?`,
          ),
        ],
        say: tr(
          locale,
          `A rectangle has an area of ${area} ${sq}. One side is ${s} ${abbr} long. How long is the other side?`,
          `Un rectángulo tiene un área de ${area} ${sq}. Un lado mide ${s} ${abbr}. ¿Cuánto mide el otro lado?`,
        ),
        input: "keypad",
        answer: { kind: "number", value: o },
        hints: [
          tr(locale, "Area = length × width.", "Área = largo × ancho."),
          tr(locale, `${s} × ? = ${area}. You can divide: ${area} ÷ ${s}.`, `${s} × ? = ${area}. Puedes dividir: ${area} ÷ ${s}.`),
          tr(locale, `Count by ${s} until you reach ${area}: ${skipStart(s, o)}`, `Cuenta de ${s} en ${s} hasta llegar a ${area}: ${skipStart(s, o)}`),
        ],
        steps: [`${s} × ? = ${area}`, `${area} ÷ ${s} = ${o}`, tr(locale, `The other side is ${o} ${abbr}.`, `El otro lado mide ${o} ${abbr}.`)],
        seconds: 40,
      };
    },
  },
  {
    id: "m.mult.multi",
    subject: "math",
    grade: "4",
    title: { en: "Multiply larger numbers", es: "Multiplicar números de varias cifras" },
    standard: "4.NBT.B.5",
    prereqs: ["m.mult.facts", "m.addsub.1000"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      let a: number, b: number;
      if (level === 1) {
        a = r.int(1, 9) * 10 + r.int(1, 9);
        b = r.int(2, 9);
      } else if (level === 2) {
        a = r.int(1, 9) * 100 + r.int(0, 9) * 10 + r.int(1, 9);
        b = r.int(2, 9);
      } else {
        a = r.int(11, 99);
        b = r.int(1, 9) * 10 + r.int(1, 9);
      }
      const p = a * b;
      const base = {
        prompt: [`${a} × ${b} = `, blank],
        say: tr(locale, `${a} times ${b}`, `${a} por ${b}`),
        visual: { kind: "column" as const, op: "×" as const, top: a, bottom: b },
        alt: tr(locale, `${a} written above ${b}, lined up to multiply`, `${a} escrito encima de ${b}, alineados para multiplicar`),
        input: "keypad" as const,
        answer: { kind: "number" as const, value: p },
      };
      if (level < 3) {
        // Split the big number by place value: 347 = 300 + 40 + 7 (zero places are skipped).
        const parts = String(a)
          .split("")
          .map((digit, i, all) => Number(digit) * 10 ** (all.length - 1 - i))
          .filter((v) => v > 0);
        return {
          ...base,
          hints: [
            tr(locale, `Split ${a} by place value: ${parts.join(" + ")}.`, `Separa ${a} por valor posicional: ${parts.join(" + ")}.`),
            tr(locale, `Multiply each part by ${b}, then add the products.`, `Multiplica cada parte por ${b} y luego suma los productos.`),
            `${parts[0]} × ${b} = ${parts[0] * b}.`,
          ],
          steps: [...parts.map((v) => `${v} × ${b} = ${v * b}`), `${parts.map((v) => v * b).join(" + ")} = ${p}`],
          seconds: level === 1 ? 25 : 35,
        };
      }
      const bt = Math.floor(b / 10) * 10, bo = b % 10;
      return {
        ...base,
        hints: [
          tr(locale, `Split ${b} into ${bt} and ${bo}.`, `Separa ${b} en ${bt} y ${bo}.`),
          tr(locale, `Multiply ${a} by ${bo}, then ${a} by ${bt}, then add.`, `Multiplica ${a} por ${bo}, luego ${a} por ${bt}, y suma.`),
          `${a} × ${bo} = ${a * bo}.`,
        ],
        steps: [`${a} × ${bo} = ${a * bo}`, `${a} × ${bt} = ${a * bt}`, `${a * bo} + ${a * bt} = ${p}`],
        seconds: 60,
      };
    },
  },
  {
    id: "m.div.long",
    subject: "math",
    grade: "4",
    title: { en: "Long division", es: "División larga" },
    standard: "4.NBT.B.6",
    prereqs: ["m.div.facts", "m.mult.multi"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const d = r.int(2, 9);
      // At least a two-digit quotient, so the first stage is never the whole answer.
      const rem = level === 1 ? 0 : r.int(1, d - 1);
      const q = r.int(10, Math.floor((999 - rem) / d));
      const n = q * d + rem;
      const stages = longDivision(n, d);
      const lines = stages.map((s) => stageText(s, d, locale));
      return {
        prompt: [`${n} ÷ ${d} = `, blank],
        say: tr(locale, `${n} divided by ${d}`, `${n} entre ${d}`),
        input: level === 1 ? "keypad" : "remainder",
        answer: level === 1 ? { kind: "number", value: q } : { kind: "remainder", q, r: rem },
        hints: [
          tr(locale, `How many ${d}s fit in ${stages[0].chunk}?`, `¿Cuántas veces cabe ${d} en ${stages[0].chunk}?`),
          tr(locale, "Divide, multiply, subtract, bring down the next digit. Repeat.", "Divide, multiplica, resta y baja la siguiente cifra. Repite."),
          lines[0],
        ],
        steps: [
          ...lines,
          level === 1
            ? tr(locale, `${n} ÷ ${d} = ${q} (check: ${q} × ${d} = ${n})`, `${n} ÷ ${d} = ${q} (comprueba: ${q} × ${d} = ${n})`)
            : tr(locale, `${n} ÷ ${d} = ${q} R ${rem} (check: ${q} × ${d} + ${rem} = ${n})`, `${n} ÷ ${d} = ${q} R ${rem} (comprueba: ${q} × ${d} + ${rem} = ${n})`),
        ],
        seconds: level === 1 ? 40 : 50,
      };
    },
  },
  {
    id: "m.factors",
    subject: "math",
    grade: "4",
    title: { en: "Factors, multiples and primes", es: "Factores, múltiplos y números primos" },
    standard: "4.OA.B.4",
    prereqs: ["m.mult.facts"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      if (level === 1) {
        const N = r.pick(MANY_FACTORS);
        const divisors = Array.from({ length: N - 2 }, (_, i) => i + 2).filter((f) => N % f === 0);
        const small = divisors.filter((f) => f <= 12);
        const f = r.bool(0.75) && small.length ? r.pick(small) : r.pick(divisors);
        const misses = r.shuffle(Array.from({ length: 13 }, (_, i) => i + 3).filter((v) => N % v !== 0));
        // A multiple of N is the classic mix-up between factors and multiples.
        const wrong = r.bool(0.4) ? [2 * N, ...misses.slice(0, 2)] : misses.slice(0, 3);
        const { choices, index } = numberChoices(r, [f, ...wrong], f);
        const probe = misses[0];
        return {
          prompt: [tr(locale, `Which number is a factor of ${N}?`, `¿Qué número es factor de ${N}?`)],
          say: tr(locale, `Which number is a factor of ${N}?`, `¿Qué número es factor de ${N}?`),
          choices,
          input: "choices",
          answer: { kind: "choice", index },
          hints: [
            tr(locale, `A factor of ${N} divides ${N} with nothing left over.`, `Un factor de ${N} divide a ${N} sin que sobre nada.`),
            tr(locale, `Try each choice: does ${N} ÷ that number come out even?`, `Prueba cada opción: ¿${N} entre ese número da exacto?`),
            tr(
              locale,
              `${N} ÷ ${probe} = ${Math.floor(N / probe)} with ${N % probe} left over, so ${probe} is not a factor.`,
              `${N} ÷ ${probe} = ${Math.floor(N / probe)} y ${sobran(N % probe)}, así que ${probe} no es factor.`,
            ),
          ],
          steps: [`${f} × ${N / f} = ${N}`, tr(locale, `So ${f} is a factor of ${N}.`, `Así que ${f} es factor de ${N}.`)],
          seconds: 20,
        };
      }
      if (r.bool()) {
        const prime = r.bool();
        const N = prime ? r.pick(PRIMES) : r.bool(0.6) ? r.pick(ODD_COMPOSITES) : r.int(6, 49) * 2;
        let p = 2;
        while (N % p !== 0) p++;
        const choices: Choice[] = [
          { label: tr(locale, "prime", "primo"), say: tr(locale, "prime", "primo") },
          { label: tr(locale, "composite", "compuesto"), say: tr(locale, "composite", "compuesto") },
        ];
        return {
          prompt: [tr(locale, `Is ${N} prime or composite?`, `¿${N} es primo o compuesto?`)],
          say: tr(locale, `Is ${N} prime or composite?`, `¿${N} es primo o compuesto?`),
          choices,
          input: "choices",
          answer: { kind: "choice", index: p === N ? 0 : 1 },
          hints: [
            tr(locale, "A prime number has exactly two factors: 1 and itself.", "Un número primo tiene exactamente dos factores: 1 y él mismo."),
            tr(locale, `Try dividing ${N} by 2, 3, 5 and 7.`, `Prueba a dividir ${N} entre 2, 3, 5 y 7.`),
            N % 2 ? tr(locale, `${N} is odd, so 2 is not a factor. Try 3 next.`, `${N} es impar, así que 2 no es factor. Ahora prueba con 3.`) : tr(locale, `Start with 2: is ${N} even?`, `Empieza con 2: ¿${N} es par?`),
          ],
          steps:
            p === N
              ? [
                  tr(locale, `${N} does not divide evenly by 2, 3, 5 or 7.`, `${N} no se divide exactamente entre 2, 3, 5 ni 7.`),
                  tr(locale, `Its only factors are 1 and ${N}, so it is prime.`, `Sus únicos factores son 1 y ${N}, así que es primo.`),
                ]
              : [`${N} = ${p} × ${N / p}`, tr(locale, `${N} has a factor other than 1 and itself, so it is composite.`, `${N} tiene un factor además de 1 y él mismo, así que es compuesto.`)],
          seconds: 20,
        };
      }
      const k = r.int(3, 9), m = r.int(5, 12), M = k * m;
      const { choices, index } = numberChoices(r, [M, ...r.shuffle([M - 2, M - 1, M + 1, M + 2]).slice(0, 3)], M);
      return {
        prompt: [tr(locale, `Which number is a multiple of ${k}?`, `¿Qué número es múltiplo de ${k}?`)],
        say: tr(locale, `Which number is a multiple of ${k}?`, `¿Qué número es múltiplo de ${k}?`),
        choices,
        input: "choices",
        answer: { kind: "choice", index },
        hints: [
          tr(locale, `Multiples of ${k} are the numbers you say when you count by ${k}.`, `Los múltiplos de ${k} son los números que dices al contar de ${k} en ${k}.`),
          tr(locale, `A multiple of ${k} divides by ${k} with nothing left over.`, `Un múltiplo de ${k} se divide entre ${k} sin que sobre nada.`),
          tr(locale, `Count by ${k}: ${skipList(k, 4)}, …`, `Cuenta de ${k} en ${k}: ${skipList(k, 4)}, …`),
        ],
        steps: [`${k} × ${m} = ${M}`, tr(locale, `So ${M} is a multiple of ${k}.`, `Así que ${M} es múltiplo de ${k}.`)],
        seconds: 15,
      };
    },
  },
  {
    id: "m.frac.equiv",
    subject: "math",
    grade: "4",
    title: { en: "Equivalent fractions", es: "Fracciones equivalentes" },
    standard: "4.NF.A.1",
    prereqs: ["m.frac.unit", "m.mult.facts"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      if (level === 1) {
        const [b, c] = r.pick([[2, 4], [2, 6], [2, 8], [2, 10], [2, 12], [3, 6], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [6, 12], [10, 100]] as const);
        const k = c / b;
        const a = r.int(1, b - 1);
        const topBlank = r.bool(0.65);
        return {
          prompt: topBlank ? [fr(a, b), " = ", fr("?", c)] : [fr(a, b), " = ", fr(a * k, "?")],
          say: topBlank
            ? tr(locale, `${sayFrac(a, b, locale)} is equal to how many ${denName(c, locale)}?`, `¿${sayFrac(a, b, locale)} es igual a cuántos ${denName(c, locale)}?`)
            : tr(locale, `${sayFrac(a, b, locale)} is equal to ${a * k} over what number?`, `¿${sayFrac(a, b, locale)} es igual a ${a * k} sobre qué número?`),
          input: "keypad",
          answer: { kind: "number", value: topBlank ? a * k : c },
          hints: topBlank
            ? [
                tr(locale, `What do you multiply ${b} by to get ${c}?`, `¿Por cuánto multiplicas ${b} para obtener ${c}?`),
                tr(locale, "Multiply the top and the bottom by the same number.", "Multiplica el número de arriba y el de abajo por el mismo número."),
                tr(locale, `${b} × ${k} = ${c}. Now do the same to the top: ${a} × ${k}.`, `${b} × ${k} = ${c}. Ahora haz lo mismo arriba: ${a} × ${k}.`),
              ]
            : [
                tr(locale, `What do you multiply ${a} by to get ${a * k}?`, `¿Por cuánto multiplicas ${a} para obtener ${a * k}?`),
                tr(locale, "Multiply the top and the bottom by the same number.", "Multiplica el número de arriba y el de abajo por el mismo número."),
                tr(locale, `${a} × ${k} = ${a * k}. Now do the same to the bottom: ${b} × ${k}.`, `${a} × ${k} = ${a * k}. Ahora haz lo mismo abajo: ${b} × ${k}.`),
              ],
          steps: [
            tr(locale, `Multiply the top and bottom by ${k}.`, `Multiplica arriba y abajo por ${k}.`),
            `${a} × ${k} = ${a * k}, ${b} × ${k} = ${c}`,
            `${ft(a, b)} = ${ft(a * k, c)}`,
          ],
          seconds: 15,
        };
      }
      const q = r.pick([2, 3, 4, 5, 6, 8, 10]);
      const p = properReduced(r, q);
      const k = r.int(2, 6);
      const [n, d] = [p * k, q * k];
      return {
        prompt: [tr(locale, "Write in simplest form: ", "Escribe en su forma más simple: "), fr(n, d), " = ", blank],
        say: tr(locale, `Write ${sayFrac(n, d, locale)} in simplest form.`, `Escribe ${sayFrac(n, d, locale)} en su forma más simple.`),
        input: "fraction",
        answer: { kind: "fraction", n: p, d: q, simplest: true },
        hints: [
          tr(locale, `What number divides both ${n} and ${d}?`, `¿Qué número divide a ${n} y a ${d}?`),
          tr(locale, "Divide the top and bottom by the biggest number that goes into both.", "Divide arriba y abajo entre el número más grande que cabe exacto en los dos."),
          tr(locale, `The biggest number that goes into ${n} and ${d} is ${k}.`, `El número más grande que cabe exacto en ${n} y en ${d} es ${k}.`),
        ],
        steps: [
          tr(locale, `The biggest number that divides ${n} and ${d} is ${k}.`, `El número más grande que divide a ${n} y a ${d} es ${k}.`),
          `${n} ÷ ${k} = ${p}, ${d} ÷ ${k} = ${q}`,
          `${ft(n, d)} = ${ft(p, q)}`,
        ],
        seconds: 20,
      };
    },
  },
  {
    id: "m.frac.compare",
    subject: "math",
    grade: "4",
    title: { en: "Compare fractions", es: "Comparar fracciones" },
    standard: "4.NF.A.2",
    prereqs: ["m.frac.equiv"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      let a: number, b: number, c: number, d: number;
      const choices = compareChoices(locale);
      const finish = (hints: string[], steps: string[]) => {
        const want = cmpIndex(a * d - c * b);
        return {
          prompt: [fr(a, b), " ", blank, " ", fr(c, d)],
          say: tr(locale, `Compare ${sayFrac(a, b, locale)} and ${sayFrac(c, d, locale)}.`, `Compara ${sayFrac(a, b, locale)} y ${sayFrac(c, d, locale)}.`),
          choices,
          input: "choices" as const,
          answer: { kind: "choice" as const, index: want },
          hints,
          steps: [...steps, `${ft(a, b)} ${choices[want].label} ${ft(c, d)}`],
          seconds: level === 1 ? 10 : 25,
        };
      };
      if (level === 1) {
        if (r.bool()) {
          b = d = r.pick([3, 4, 5, 6, 8, 10, 12]);
          a = r.int(1, b - 1);
          c = r.int(1, b - 1);
          while (c === a) c = r.int(1, b - 1);
          const name = denName(b, locale);
          return finish(
            [
              tr(locale, "The bottom numbers are the same, so the pieces are the same size.", "Los números de abajo son iguales, así que las partes son del mismo tamaño."),
              tr(locale, "With same-size pieces, more pieces is more.", "Con partes del mismo tamaño, más partes es más."),
              tr(locale, `Compare the top numbers: ${a} and ${c}.`, `Compara los números de arriba: ${a} y ${c}.`),
            ],
            [
              tr(locale, `Both are ${name}.`, `Los dos son ${name}.`),
              a < c
                ? tr(locale, `${sayFrac(a, b, locale)} is fewer pieces than ${sayFrac(c, d, locale)}.`, `${sayFrac(a, b, locale)} son menos partes que ${sayFrac(c, d, locale)}.`)
                : tr(locale, `${sayFrac(a, b, locale)} is more pieces than ${sayFrac(c, d, locale)}.`, `${sayFrac(a, b, locale)} son más partes que ${sayFrac(c, d, locale)}.`),
            ],
          );
        }
        a = c = r.int(1, 4);
        const ok = DENS.filter((v) => v > a);
        [b, d] = r.shuffle(ok).slice(0, 2);
        const [big, small] = [Math.min(b, d), Math.max(b, d)];
        return finish(
          [
            tr(locale, "The top numbers are the same. Look at the size of the pieces.", "Los números de arriba son iguales. Fíjate en el tamaño de las partes."),
            tr(locale, "The more equal parts a whole is cut into, the smaller each part is.", "Mientras más partes iguales tiene un entero, más pequeña es cada parte."),
            tr(locale, `A whole cut into ${big} parts has bigger parts than a whole cut into ${small}.`, `Un entero dividido en ${big} partes tiene partes más grandes que uno dividido en ${small}.`),
          ],
          [
            tr(locale, `${ft(1, big)} is bigger than ${ft(1, small)}.`, `${ft(1, big)} es más grande que ${ft(1, small)}.`),
            tr(locale, "The same number of pieces, so the bigger pieces make more.", "El mismo número de partes, así que las partes más grandes dan más."),
          ],
        );
      }
      if (r.bool(0.2)) {
        const q = r.pick([2, 3, 4, 5, 6]);
        const p = properReduced(r, q);
        const k = r.int(2, Math.floor(12 / q));
        [[a, b], [c, d]] = r.shuffle([[p, q], [p * k, q * k]]);
      } else {
        do {
          [b, d] = r.shuffle(DENS).slice(0, 2);
          a = properReduced(r, b);
          c = properReduced(r, d);
        } while (a === c || a * d === c * b);
      }
      const side = (x: number, y: number) => Math.sign(2 * x - y);
      if (side(a, b) * side(c, d) < 0) {
        const vs = (x: number, y: number) =>
          side(x, y) < 0
            ? tr(locale, `${ft(x, y)} is less than one half: ${x} is less than half of ${y}.`, `${ft(x, y)} es menos que un medio: ${x} es menos que la mitad de ${y}.`)
            : tr(locale, `${ft(x, y)} is more than one half: ${x} is more than half of ${y}.`, `${ft(x, y)} es más que un medio: ${x} es más que la mitad de ${y}.`);
        return finish(
          [
            tr(locale, "Is each fraction more or less than one half?", "¿Cada fracción es más o menos que un medio?"),
            tr(locale, "A fraction is more than one half when its top is more than half of its bottom.", "Una fracción es más que un medio cuando el número de arriba es más que la mitad del de abajo."),
            vs(a, b),
          ],
          [vs(a, b), vs(c, d)],
        );
      }
      const L = lcm(b, d), A = (a * L) / b, C = (c * L) / d;
      const renames = [b !== L ? `${ft(a, b)} = ${ft(A, L)}` : "", d !== L ? `${ft(c, d)} = ${ft(C, L)}` : ""].filter(Boolean);
      // Name the multiplier, not the renamed fraction: for an equal pair the rename is the whole answer.
      const [x, y] = b !== L ? [a, b] : [c, d];
      return finish(
        [
          tr(locale, "Make the bottom numbers the same.", "Haz que los números de abajo sean iguales."),
          tr(locale, `Use ${L} as the common denominator.`, `Usa ${L} como denominador común.`),
          tr(locale, `To rename ${ft(x, y)}, multiply its top and bottom by ${L / y}.`, `Para escribir ${ft(x, y)} con ${L} abajo, multiplica arriba y abajo por ${L / y}.`),
        ],
        [
          ...renames,
          A === C
            ? tr(locale, `${ft(A, L)} and ${ft(C, L)} are the same.`, `${ft(A, L)} y ${ft(C, L)} son iguales.`)
            : tr(locale, `${ft(A, L)} is ${A < C ? "less" : "more"} than ${ft(C, L)}.`, `${ft(A, L)} es ${A < C ? "menos" : "más"} que ${ft(C, L)}.`),
        ],
      );
    },
  },
  {
    id: "m.frac.addlike",
    subject: "math",
    grade: "4",
    title: { en: "Add and subtract fractions with like denominators", es: "Sumar y restar fracciones con el mismo denominador" },
    standard: "4.NF.B.3",
    prereqs: ["m.frac.unit"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const d = r.pick([3, 4, 5, 6, 8, 10, 12]);
      const add = level === 1 || r.bool();
      let a: number, b: number;
      if (level === 1) {
        a = r.int(1, d - 2);
        b = r.int(1, d - 1 - a);
      } else if (add) {
        a = r.int(2, d - 1);
        b = r.int(d - a + 1, d - 1);
      } else {
        a = r.int(2, d - 1);
        b = r.int(1, a - 1);
      }
      const s = add ? a + b : a - b;
      const name = denName(d, locale);
      const op = add ? "+" : "−";
      return {
        prompt: [fr(a, d), ` ${op} `, fr(b, d), " = ", blank],
        say: add ? tr(locale, `${sayFrac(a, d, locale)} plus ${sayFrac(b, d, locale)}`, `${sayFrac(a, d, locale)} más ${sayFrac(b, d, locale)}`) : tr(locale, `${sayFrac(a, d, locale)} minus ${sayFrac(b, d, locale)}`, `${sayFrac(a, d, locale)} menos ${sayFrac(b, d, locale)}`),
        input: "fraction",
        answer: { kind: "fraction", n: s, d },
        hints: [
          tr(locale, `Both fractions are ${name}, so the pieces are the same size.`, `Las dos fracciones son ${name}, así que las partes son del mismo tamaño.`),
          add
            ? tr(locale, `Add the top numbers. The bottom stays ${d}, because the size of the pieces does not change.`, `Suma los números de arriba. El de abajo sigue siendo ${d}, porque el tamaño de las partes no cambia.`)
            : tr(locale, `Subtract the top numbers. The bottom stays ${d}, because the size of the pieces does not change.`, `Resta los números de arriba. El de abajo sigue siendo ${d}, porque el tamaño de las partes no cambia.`),
          add ? tr(locale, `Keep ${d} on the bottom. Add the tops: ${a} + ${b}.`, `Deja ${d} abajo. Suma los de arriba: ${a} + ${b}.`) : tr(locale, `Keep ${d} on the bottom. Subtract the tops: ${a} − ${b}.`, `Deja ${d} abajo. Resta los de arriba: ${a} − ${b}.`),
        ],
        steps: [`${ft(a, d)} ${op} ${ft(b, d)} = ${ft(s, d)}`, ...(s > d ? [tr(locale, `${ft(s, d)} is the same as ${simplest(s, d)}.`, `${ft(s, d)} es lo mismo que ${simplest(s, d)}.`)] : [])],
        seconds: level === 1 ? 12 : 20,
      };
    },
  },
  {
    id: "m.frac.mixed",
    subject: "math",
    grade: "4",
    title: { en: "Mixed numbers and improper fractions", es: "Números mixtos y fracciones impropias" },
    standard: "4.NF.B.3b",
    prereqs: ["m.frac.addlike"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      // Single-digit denominators keep the typed mixed number unambiguous ("2 3/4").
      const d = r.pick([2, 3, 4, 5, 6, 8]);
      const rest = properReduced(r, d);
      const w = r.int(1, 5), n = w * d + rest;
      const name = denName(d, locale);
      if (level === 1) {
        return {
          prompt: [tr(locale, "Write as a mixed number: ", "Escribe como número mixto: "), fr(n, d), " = ", blank],
          say: tr(locale, `Write ${sayFrac(n, d, locale)} as a mixed number.`, `Escribe ${sayFrac(n, d, locale)} como número mixto.`),
          input: "text",
          // The fraction checker would also accept 11/4 itself, so the mixed form is matched as text.
          answer: { kind: "text", accept: [`${w} ${rest}/${d}`, `${w} ${rest} / ${d}`, `${w} and ${rest}/${d}`, `${w} y ${rest}/${d}`] },
          hints: [
            tr(locale, `How many ${name} make 1 whole?`, `¿Cuántos ${name} forman 1 entero?`),
            tr(locale, `Take out as many wholes as you can. Each whole is ${d} ${name}.`, `Saca todos los enteros que puedas. Cada entero son ${d} ${name}.`),
            tr(locale, `${w} ${pl(w, "whole uses", "wholes use")} ${w * d} ${name}. ${w + 1} wholes would need ${(w + 1) * d}.`, `${w} ${pl(w, "entero usa", "enteros usan")} ${w * d} ${name}. ${w + 1} enteros necesitarían ${(w + 1) * d}.`),
          ],
          steps: [
            `${n} ÷ ${d} = ${w} R ${rest}`,
            tr(locale, `${w} ${pl(w, "whole", "wholes")} and ${sayFrac(rest, d, locale)} left over`, `${w} ${pl(w, "entero", "enteros")} y ${rest === 1 ? "sobra" : "sobran"} ${sayFrac(rest, d, locale)}`),
            `${ft(n, d)} = ${w} ${ft(rest, d)}`,
          ],
          seconds: 20,
        };
      }
      return {
        prompt: [tr(locale, "Write as a fraction: ", "Escribe como fracción: "), `${w}`, fr(rest, d), " = ", fr("?", d)],
        say: tr(locale, `${w} and ${sayFrac(rest, d, locale)} is how many ${name}?`, `¿${w} y ${sayFrac(rest, d, locale)} son cuántos ${name}?`),
        input: "keypad",
        answer: { kind: "number", value: n },
        hints: [
          tr(locale, `How many ${name} make 1 whole?`, `¿Cuántos ${name} forman 1 entero?`),
          tr(locale, `Change the ${pl(w, "whole", "wholes")} to ${name}, then add ${sayFrac(rest, d, locale)}.`, `Cambia ${pl(w, "el entero", "los enteros")} a ${name} y luego suma ${sayFrac(rest, d, locale)}.`),
          tr(locale, `${w} ${pl(w, "whole", "wholes")} = ${w} × ${d} = ${w * d} ${name}.`, `${w} ${pl(w, "entero", "enteros")} = ${w} × ${d} = ${w * d} ${name}.`),
        ],
        steps: [`${w} × ${d} = ${w * d}`, `${w * d} + ${rest} = ${n}`, `${w} ${ft(rest, d)} = ${ft(n, d)}`],
        seconds: 20,
      };
    },
  },
  {
    id: "m.dec.tenths",
    subject: "math",
    grade: "4",
    title: { en: "Tenths and hundredths as decimals", es: "Décimos y centésimos como decimales" },
    standard: "4.NF.C.6",
    prereqs: ["m.frac.equiv"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      if (level === 1) {
        const kind = r.int(0, 3);
        const hundredths = kind % 2 === 1;
        const n = hundredths ? (r.bool(0.3) ? r.int(1, 9) : r.int(1, 9) * 10 + r.int(1, 9)) : r.int(1, 9);
        const str = dec(n, hundredths ? 2 : 1);
        const tenthsPart = Math.floor(n / 10), hPart = n % 10;
        if (kind < 2) {
          // Fraction to decimal.
          const den = hundredths ? 100 : 10;
          return {
            prompt: [tr(locale, "Write as a decimal: ", "Escribe como decimal: "), fr(n, den), " = ", blank],
            say: tr(locale, `Write ${sayFrac(n, den, locale)} as a decimal.`, `Escribe ${sayFrac(n, den, locale)} como decimal.`),
            ...(hundredths ? {} : { visual: { kind: "fraction" as const, parts: 10, shaded: n }, alt: tr(locale, `A bar split into 10 equal parts with ${n} shaded`, `Una barra dividida en 10 partes iguales con ${n} sombreadas`) }),
            input: "keypad",
            keys: ["."],
            answer: { kind: "number", value: Number(str) },
            hints: hundredths
              ? [
                  tr(locale, "The second place after the decimal point is hundredths.", "El segundo lugar después del punto decimal son los centésimos."),
                  tr(locale, `Split ${n} hundredths into tenths and hundredths.`, `Separa ${n} centésimos en décimos y centésimos.`),
                  tr(locale, `${n} hundredths = ${tenthsPart} tenths and ${hPart} hundredths.`, `${n} centésimos = ${tenthsPart} décimos y ${hPart} centésimos.`),
                ]
              : [
                  tr(locale, "The first place after the decimal point is tenths.", "El primer lugar después del punto decimal son los décimos."),
                  tr(locale, `${n} tenths means a ${n} in the tenths place.`, `${n} décimos significa un ${n} en el lugar de los décimos.`),
                  tr(locale, "There are no whole ones, so start with 0 and the decimal point.", "No hay enteros, así que empieza con 0 y el punto decimal."),
                ],
            steps: hundredths
              ? [tr(locale, `${ft(n, 100)} = ${tenthsPart} tenths and ${hPart} hundredths`, `${ft(n, 100)} = ${tenthsPart} décimos y ${hPart} centésimos`), `${ft(n, 100)} = ${str}`]
              : [tr(locale, `${ft(n, 10)} is ${n} tenths.`, `${ft(n, 10)} son ${n} décimos.`), `${ft(n, 10)} = ${str}`],
            seconds: 10,
          };
        }
        // Decimal to a number of tenths or hundredths.
        const den = hundredths ? 100 : 10;
        return {
          prompt: [`${str} = `, fr("?", den)],
          say: hundredths ? tr(locale, `${str} is how many hundredths?`, `¿${str} son cuántos centésimos?`) : tr(locale, `${str} is how many tenths?`, `¿${str} son cuántos décimos?`),
          input: "keypad",
          answer: { kind: "number", value: n },
          hints: hundredths
            ? [
                tr(locale, "Two places after the decimal point means hundredths.", "Dos lugares después del punto decimal son centésimos."),
                tr(locale, "One tenth is the same as 10 hundredths.", "Un décimo es lo mismo que 10 centésimos."),
                tr(locale, `${str} is ${tenthsPart} tenths and ${hPart} hundredths.`, `${str} son ${tenthsPart} décimos y ${hPart} centésimos.`),
              ]
            : [
                tr(locale, "What is the first place after the decimal point called?", "¿Cómo se llama el primer lugar después del punto decimal?"),
                tr(locale, "The first place after the point is tenths.", "El primer lugar después del punto son los décimos."),
                tr(locale, `0.1 is one tenth. How many tenths make ${str}?`, `0.1 es un décimo. ¿Cuántos décimos forman ${str}?`),
              ],
          steps: hundredths
            ? [tr(locale, `${str} = ${tenthsPart} tenths and ${hPart} hundredths = ${n} hundredths`, `${str} = ${tenthsPart} décimos y ${hPart} centésimos = ${n} centésimos`), `${str} = ${ft(n, 100)}`]
            : [tr(locale, `${str} is ${n} tenths.`, `${str} son ${n} décimos.`), `${str} = ${ft(n, 10)}`],
          seconds: 10,
        };
      }
      // Compare two decimals, in hundredths. Often a tenths number against a longer but smaller one (0.5 vs 0.45).
      const whole = r.int(0, 3) * 100;
      const style = r.next();
      let A: number, B: number, pa: number, pb: number;
      if (style < 0.15) {
        A = B = whole + r.int(1, 9) * 10;
        [pa, pb] = r.shuffle([1, 2]);
      } else if (style < 0.55) {
        A = whole + r.int(1, 9) * 10;
        B = whole + r.int(0, 9) * 10 + r.int(1, 9);
        [pa, pb] = [1, 2];
        if (r.bool()) [A, B, pa, pb] = [B, A, pb, pa];
      } else {
        A = whole + r.int(0, 9) * 10 + r.int(1, 9);
        B = whole + r.int(0, 9) * 10 + r.int(1, 9);
        while (B === A) B = whole + r.int(0, 9) * 10 + r.int(1, 9);
        pa = pb = 2;
      }
      const sa = dec(pa === 1 ? A / 10 : A, pa), sb = dec(pb === 1 ? B / 10 : B, pb);
      const la = dec(A, 2), lb = dec(B, 2);
      const choices = compareChoices(locale);
      const want = cmpIndex(A - B);
      return {
        prompt: [`${sa} `, blank, ` ${sb}`],
        say: tr(locale, `Compare ${sa} and ${sb}.`, `Compara ${sa} y ${sb}.`),
        choices,
        input: "choices",
        answer: { kind: "choice", index: want },
        hints: [
          tr(locale, "Line up the decimal points and compare place by place.", "Alinea los puntos decimales y compara lugar por lugar."),
          tr(locale, "Give both numbers two decimal places, then compare them as hundredths.", "Escribe los dos números con dos lugares decimales y compáralos como centésimos."),
          pa === pb ? tr(locale, `Compare the tenths first: ${Math.floor(A / 10) % 10} and ${Math.floor(B / 10) % 10}.`, `Compara primero los décimos: ${Math.floor(A / 10) % 10} y ${Math.floor(B / 10) % 10}.`) : tr(locale, `Write them as ${la} and ${lb}.`, `Escríbelos como ${la} y ${lb}.`),
        ],
        steps: [
          ...(pa === pb ? [] : [`${sa} = ${la}, ${sb} = ${lb}`]),
          tr(locale, `${la} is ${A} hundredths and ${lb} is ${B} hundredths.`, `${la} son ${A} centésimos y ${lb} son ${B} centésimos.`),
          `${sa} ${choices[want].label} ${sb}`,
        ],
        seconds: 12,
      };
    },
  },
  {
    id: "m.frac.addunlike",
    subject: "math",
    grade: "5",
    title: { en: "Add and subtract fractions with unlike denominators", es: "Sumar y restar fracciones con distinto denominador" },
    standard: "5.NF.A.1",
    prereqs: ["m.frac.equiv", "m.frac.addlike"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      let b: number, d: number;
      if (level === 1) {
        [b, d] = r.shuffle(r.pick([[2, 4], [2, 6], [2, 8], [2, 10], [2, 12], [3, 6], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [6, 12]]));
      } else {
        do {
          [b, d] = r.shuffle(DENS).slice(0, 2);
        } while (b % d === 0 || d % b === 0 || lcm(b, d) > 30);
      }
      const add = r.bool();
      let a = properReduced(r, b), c = properReduced(r, d);
      while (a * d === c * b) {
        a = properReduced(r, b);
        c = properReduced(r, d);
      }
      if (!add && a * d < c * b) [a, b, c, d] = [c, d, a, b];
      const L = lcm(b, d), A = (a * L) / b, C = (c * L) / d;
      const S = add ? A + C : A - C;
      const [n, m] = reduce(S, L);
      const op = add ? "+" : "−";
      const renames = [b !== L ? `${ft(a, b)} = ${ft(A, L)}` : "", d !== L ? `${ft(c, d)} = ${ft(C, L)}` : ""].filter(Boolean);
      return {
        prompt: [tr(locale, "Write the answer in simplest form. ", "Escribe la respuesta en su forma más simple. "), fr(a, b), ` ${op} `, fr(c, d), " = ", blank],
        say: tr(
          locale,
          `${sayFrac(a, b, locale)} ${add ? "plus" : "minus"} ${sayFrac(c, d, locale)}. Write the answer in simplest form.`,
          `${sayFrac(a, b, locale)} ${add ? "más" : "menos"} ${sayFrac(c, d, locale)}. Escribe la respuesta en su forma más simple.`,
        ),
        input: "fraction",
        answer: { kind: "fraction", n, d: m, simplest: true },
        hints: [
          tr(locale, "The pieces are different sizes. Make the bottom numbers the same first.", "Las partes son de distinto tamaño. Primero haz que los números de abajo sean iguales."),
          tr(locale, `Rename both fractions with ${L} on the bottom.`, `Escribe las dos fracciones con ${L} abajo.`),
          `${renames[0]}.`,
        ],
        steps: [
          renames.join(tr(locale, " and ", " y ")),
          `${ft(A, L)} ${op} ${ft(C, L)} = ${ft(S, L)}`,
          ...(simplest(S, L) !== ft(S, L) ? [`${ft(S, L)} = ${simplest(S, L)}`] : []),
        ],
        seconds: level === 1 ? 30 : 40,
      };
    },
  },
  {
    id: "m.frac.mult",
    subject: "math",
    grade: "5",
    title: { en: "Multiply fractions", es: "Multiplicar fracciones" },
    standard: "5.NF.B.4",
    prereqs: ["m.frac.equiv", "m.mult.facts"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const ask = tr(locale, "Write the answer in simplest form. ", "Escribe la respuesta en su forma más simple. ");
      const askSay = tr(locale, "Write the answer in simplest form.", "Escribe la respuesta en su forma más simple.");
      if (level === 1) {
        const w = r.int(2, 9), b = r.pick(DENS), a = properReduced(r, b);
        const wholeFirst = r.bool();
        const P = w * a;
        const [n, m] = reduce(P, b);
        return {
          prompt: wholeFirst ? [ask, `${w} × `, fr(a, b), " = ", blank] : [ask, fr(a, b), ` × ${w} = `, blank],
          say: wholeFirst ? tr(locale, `${w} times ${sayFrac(a, b, locale)}. ${askSay}`, `${w} por ${sayFrac(a, b, locale)}. ${askSay}`) : tr(locale, `${sayFrac(a, b, locale)} times ${w}. ${askSay}`, `${sayFrac(a, b, locale)} por ${w}. ${askSay}`),
          input: "fraction",
          answer: { kind: "fraction", n, d: m, simplest: true },
          hints: [
            tr(locale, `${w} × ${ft(a, b)} means ${w} groups of ${ft(a, b)}.`, `${w} × ${ft(a, b)} son ${w} grupos de ${ft(a, b)}.`),
            tr(locale, `Multiply the whole number by the top number. The bottom stays ${b}. Then simplify.`, `Multiplica el número entero por el de arriba. El de abajo sigue siendo ${b}. Luego simplifica.`),
            `${w} × ${a} = ${P}.`,
          ],
          steps: [`${w} × ${ft(a, b)} = ${ft(P, b)}`, ...(simplest(P, b) !== ft(P, b) ? [`${ft(P, b)} = ${simplest(P, b)}`] : [])],
          seconds: 20,
        };
      }
      const b = r.pick([2, 3, 4, 5, 6, 8, 10]), d = r.pick([2, 3, 4, 5, 6, 8, 10]);
      const a = properReduced(r, b), c = properReduced(r, d);
      const [n, m] = reduce(a * c, b * d);
      return {
        prompt: [ask, fr(a, b), " × ", fr(c, d), " = ", blank],
        say: tr(locale, `${sayFrac(a, b, locale)} times ${sayFrac(c, d, locale)}. ${askSay}`, `${sayFrac(a, b, locale)} por ${sayFrac(c, d, locale)}. ${askSay}`),
        input: "fraction",
        answer: { kind: "fraction", n, d: m, simplest: true },
        hints: [
          tr(locale, `${ft(a, b)} × ${ft(c, d)} means ${ft(a, b)} of ${ft(c, d)}.`, `${ft(a, b)} × ${ft(c, d)} significa ${ft(a, b)} de ${ft(c, d)}.`),
          tr(locale, "Multiply the tops, multiply the bottoms, then simplify.", "Multiplica los de arriba, multiplica los de abajo y luego simplifica."),
          tr(locale, `Top: ${a} × ${c} = ${a * c}. Bottom: ${b} × ${d} = ${b * d}.`, `Arriba: ${a} × ${c} = ${a * c}. Abajo: ${b} × ${d} = ${b * d}.`),
        ],
        steps: [`${ft(a, b)} × ${ft(c, d)} = ${ft(a * c, b * d)}`, ...(simplest(a * c, b * d) !== ft(a * c, b * d) ? [`${ft(a * c, b * d)} = ${simplest(a * c, b * d)}`] : [])],
        seconds: 25,
      };
    },
  },
  {
    id: "m.frac.divunit",
    subject: "math",
    grade: "5",
    title: { en: "Divide with unit fractions", es: "Dividir con fracciones unitarias" },
    standard: "5.NF.B.7",
    prereqs: ["m.frac.mult"],
    content: "computed",
    levels: 1,
    generate(r, _level, locale) {
      const story = r.bool();
      if (r.bool()) {
        // A unit fraction shared by a whole number: 1/b ÷ w = 1/(b × w).
        const b = r.int(2, 6), w = r.int(2, 6), den = b * w;
        const prompt: MathPart[] = story
          ? [
              tr(locale, `${w} friends share `, `${w} amigos se reparten en partes iguales `),
              fr(1, b),
              tr(locale, " of a pizza equally. What fraction of the whole pizza does each friend get?", " de una pizza. ¿Qué fracción de la pizza entera le toca a cada uno?"),
            ]
          : [fr(1, b), ` ÷ ${w} = `, blank];
        return {
          prompt,
          say: story
            ? tr(locale, `${w} friends share ${sayFrac(1, b, locale)} of a pizza equally. What fraction of the whole pizza does each friend get?`, `${w} amigos se reparten en partes iguales ${sayFrac(1, b, locale)} de una pizza. ¿Qué fracción de la pizza entera le toca a cada uno?`)
            : tr(locale, `${sayFrac(1, b, locale)} divided by ${w}`, `${sayFrac(1, b, locale)} entre ${w}`),
          input: "fraction",
          answer: { kind: "fraction", n: 1, d: den },
          hints: [
            tr(locale, `Split ${ft(1, b)} into ${w} equal parts. Each part is smaller than ${ft(1, b)}.`, `Divide ${ft(1, b)} en ${w} partes iguales. Cada parte es más pequeña que ${ft(1, b)}.`),
            tr(locale, `Dividing by ${w} is the same as multiplying by ${ft(1, w)}.`, `Dividir entre ${w} es lo mismo que multiplicar por ${ft(1, w)}.`),
            tr(locale, `If each of the ${b} parts of the whole is split into ${w}, how many small parts does the whole have?`, `Si cada una de las ${b} partes del entero se divide en ${w}, ¿cuántas partes pequeñas tiene el entero?`),
          ],
          steps: [`${ft(1, b)} ÷ ${w} = ${ft(1, b)} × ${ft(1, w)}`, `= ${ft(1, den)}`],
          seconds: story ? 45 : 25,
        };
      }
      // A whole number split into unit-fraction pieces: w ÷ 1/b = w × b.
      const w = r.int(2, 8), b = r.int(2, 8), total = w * b;
      const prompt: MathPart[] = story
        ? [tr(locale, "How many ", "¿Cuántas porciones de "), fr(1, b), tr(locale, `-cup scoops are in ${w} cups of rice?`, ` de taza hay en ${w} tazas de arroz?`)]
        : [`${w} ÷ `, fr(1, b), " = ", blank];
      return {
        prompt,
        say: story
          ? tr(locale, `How many ${sayFrac(1, b, locale)} cup scoops are in ${w} cups of rice?`, `¿Cuántas porciones de ${sayFrac(1, b, locale)} de taza hay en ${w} tazas de arroz?`)
          : tr(locale, `${w} divided by ${sayFrac(1, b, locale)}`, `${w} entre ${sayFrac(1, b, locale)}`),
        input: "keypad",
        answer: { kind: "number", value: total },
        hints: [
          tr(locale, `How many ${ft(1, b)} pieces fit in 1 whole?`, `¿Cuántas partes de ${ft(1, b)} caben en 1 entero?`),
          tr(locale, `Find how many fit in 1 whole, then multiply by ${w}.`, `Encuentra cuántas caben en 1 entero y luego multiplica por ${w}.`),
          tr(locale, `1 whole is ${ft(b, b)}, so ${b} pieces fit in each whole.`, `1 entero es ${ft(b, b)}, así que caben ${b} partes en cada entero.`),
        ],
        steps: [tr(locale, `${b} pieces of ${ft(1, b)} fit in 1 whole.`, `En 1 entero caben ${b} partes de ${ft(1, b)}.`), `${w} × ${b} = ${total}`],
        seconds: story ? 45 : 25,
      };
    },
  },
  {
    id: "m.dec.addsub",
    subject: "math",
    grade: "5",
    title: { en: "Add and subtract decimals", es: "Sumar y restar decimales" },
    standard: "5.NBT.B.7",
    prereqs: ["m.dec.tenths", "m.addsub.1000"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      // Values are whole hundredths; p is how many decimal places each is written with.
      const value = (p: number) => {
        if (p === 0) return r.int(2, 15) * 100;
        if (p === 1) return (r.int(1, level === 1 ? 9 : 19) * 10 + r.int(1, 9)) * 10;
        return (r.int(1, level === 1 ? 9 : 19) * 10 + r.int(0, 9)) * 10 + r.int(1, 9);
      };
      const add = r.bool();
      let [pa, pb] = level === 1 ? Array<number>(2).fill(r.pick([1, 2])) : r.pick([[1, 2], [2, 1], [0, 2], [2, 0], [0, 1], [1, 0]]);
      let A = value(pa), B = value(pb);
      while (A === B) B = value(pb);
      if (!add && A < B) [A, B, pa, pb] = [B, A, pb, pa];
      const S = add ? A + B : A - B;
      const p = Math.max(pa, pb), scale = 10 ** (2 - p);
      const show = (v: number, places: number) => dec(v / 10 ** (2 - places), places);
      const sa = show(A, pa), sb = show(B, pb), padA = show(A, p), padB = show(B, p), padS = show(S, p);
      const op = add ? "+" : "−";
      const da = (A / scale) % 10, db = (B / scale) % 10;
      const place = p === 2 ? tr(locale, "Hundredths", "Centésimos") : tr(locale, "Tenths", "Décimos");
      const first = add
        ? da + db >= 10
          ? tr(locale, `${place}: ${da} + ${db} = ${da + db}. Write ${da + db - 10} and carry 1.`, `${place}: ${da} + ${db} = ${da + db}. Escribe ${da + db - 10} y lleva 1.`)
          : `${place}: ${da} + ${db} = ${da + db}.`
        : da < db
          ? tr(locale, `${place}: ${da} is less than ${db}, so trade 1 from the next place: ${da + 10} − ${db} = ${da + 10 - db}.`, `${place}: ${da} es menor que ${db}, así que pide 1 al lugar siguiente: ${da + 10} − ${db} = ${da + 10 - db}.`)
          : `${place}: ${da} − ${db} = ${da - db}.`;
      const short = pa < pb ? [sa, padA] : [sb, padB];
      return {
        prompt: [`${sa} ${op} ${sb} = `, blank],
        say: tr(locale, `${sa} ${add ? "plus" : "minus"} ${sb}`, `${sa} ${add ? "más" : "menos"} ${sb}`),
        input: "keypad",
        keys: ["."],
        answer: { kind: "number", value: Number(padS) },
        hints: [
          tr(locale, "Line up the decimal points.", "Alinea los puntos decimales."),
          pa === pb
            ? tr(locale, "Work with the same places: hundredths with hundredths, tenths with tenths, ones with ones.", "Trabaja con los mismos lugares: centésimos con centésimos, décimos con décimos, unidades con unidades.")
            : tr(locale, `Write ${short[0]} as ${short[1]} so both numbers have the same places.`, `Escribe ${short[0]} como ${short[1]} para que los dos números tengan los mismos lugares.`),
          first,
        ],
        steps: [tr(locale, `Line up the points: ${padA} ${op} ${padB}`, `Alinea los puntos: ${padA} ${op} ${padB}`), `${padA} ${op} ${padB} = ${padS}`],
        seconds: level === 1 ? 20 : 30,
      };
    },
  },
  {
    id: "m.dec.mult",
    subject: "math",
    grade: "5",
    title: { en: "Multiply decimals", es: "Multiplicar decimales" },
    standard: "5.NBT.B.7",
    prereqs: ["m.dec.addsub", "m.mult.multi"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const places = (p: number) => (p === 1 ? tr(locale, "1 decimal place", "1 lugar decimal") : tr(locale, `${p} decimal places`, `${p} lugares decimales`));
      if (level === 1) {
        const p = r.pick([1, 2]);
        const A = p === 1 ? r.int(0, 9) * 10 + r.int(1, 9) : r.int(1, 49) * 10 + r.int(1, 9);
        const w = r.int(2, 9), P = A * w;
        const sa = dec(A, p), raw = dec(P, p), ans = String(Number(raw));
        const wholeFirst = r.bool();
        return {
          prompt: [wholeFirst ? `${w} × ${sa} = ` : `${sa} × ${w} = `, blank],
          say: wholeFirst ? tr(locale, `${w} times ${sa}`, `${w} por ${sa}`) : tr(locale, `${sa} times ${w}`, `${sa} por ${w}`),
          input: "keypad",
          keys: ["."],
          answer: { kind: "number", value: Number(raw) },
          hints: [
            tr(locale, "Multiply as if there were no decimal point.", "Multiplica como si no hubiera punto decimal."),
            tr(locale, `${sa} has ${places(p)}, so the answer has ${places(p)} too.`, `${sa} tiene ${places(p)}, así que la respuesta también tiene ${places(p)}.`),
            `${A} × ${w} = ${P}.`,
          ],
          steps: [`${A} × ${w} = ${P}`, tr(locale, `Put back ${places(p)}: ${raw}`, `Vuelve a poner ${places(p)}: ${raw}`), ...(ans !== raw ? [`${raw} = ${ans}`] : [])],
          seconds: 25,
        };
      }
      const A = r.int(0, 4) * 10 + r.int(1, 9), B = r.int(0, 1) * 10 + r.int(1, 9);
      const P = A * B, sa = dec(A, 1), sb = dec(B, 1), raw = dec(P, 2), ans = String(Number(raw));
      return {
        prompt: [`${sa} × ${sb} = `, blank],
        say: tr(locale, `${sa} times ${sb}`, `${sa} por ${sb}`),
        input: "keypad",
        keys: ["."],
        answer: { kind: "number", value: Number(raw) },
        hints: [
          tr(locale, "Multiply as if there were no decimal points.", "Multiplica como si no hubiera puntos decimales."),
          tr(locale, "Each number has 1 decimal place, so the answer has 2.", "Cada número tiene 1 lugar decimal, así que la respuesta tiene 2."),
          `${A} × ${B} = ${P}.`,
        ],
        steps: [`${A} × ${B} = ${P}`, tr(locale, `Put back 2 decimal places: ${raw}`, `Vuelve a poner 2 lugares decimales: ${raw}`), ...(ans !== raw ? [`${raw} = ${ans}`] : [])],
        seconds: 30,
      };
    },
  },
  {
    id: "m.order.ops",
    subject: "math",
    grade: "5",
    title: { en: "Order of operations", es: "Orden de las operaciones" },
    standard: "5.OA.A.1",
    prereqs: ["m.mult.facts", "m.div.facts"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const e = level === 1 ? plainExpr(r) : parenExpr(r);
      const rule =
        e.rule === "parens"
          ? tr(locale, "Work inside the parentheses first. Then multiply and divide, then add and subtract.", "Resuelve primero lo que está dentro de los paréntesis. Luego multiplica y divide, y después suma y resta.")
          : e.rule === "left-add"
            ? tr(locale, "There is only adding and subtracting, so work from left to right.", "Solo hay sumas y restas, así que resuelve de izquierda a derecha.")
            : e.rule === "left-mul"
              ? tr(locale, "There is only multiplying and dividing, so work from left to right.", "Solo hay multiplicaciones y divisiones, así que resuelve de izquierda a derecha.")
              : tr(locale, "Multiply and divide before you add and subtract.", "Multiplica y divide antes de sumar y restar.");
      return {
        prompt: [`${e.text} = `, blank],
        say: sayExpr(e.text, locale),
        input: "keypad",
        answer: { kind: "number", value: e.value },
        hints: [
          e.rule === "parens" ? tr(locale, "Look for parentheses.", "Busca los paréntesis.") : tr(locale, "Which part do you work out first?", "¿Qué parte resuelves primero?"),
          rule,
          tr(locale, `${e.first[0]} = ${e.first[1]}, so now it is ${e.chain[0]}.`, `${e.first[0]} = ${e.first[1]}, así que ahora queda ${e.chain[0]}.`),
        ],
        steps: [e.text, ...e.chain.map((c) => `= ${c}`)],
        seconds: level === 1 ? 20 : 30,
      };
    },
  },
  {
    id: "m.pow10",
    subject: "math",
    grade: "5",
    title: { en: "Multiply and divide by 10, 100 and 1000", es: "Multiplicar y dividir entre 10, 100 y 1000" },
    standard: "5.NBT.A.2",
    prereqs: ["m.dec.tenths"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const times = r.bool();
      const k = r.int(1, 3);
      const factor = 10 ** k;
      // The number shown is M ÷ 10^p; M never ends in 0, so no trailing zeros appear.
      let M: number, p: number, kk = k;
      if (level === 1) {
        p = 0;
        M = times ? r.int(2, k === 3 ? 99 : 999) : r.int(2, k === 3 ? 99 : 999) * factor;
      } else if (times) {
        p = r.pick([1, 2]);
        M = r.int(0, 99) * 10 + r.int(1, 9);
      } else {
        p = r.pick([0, 1]);
        M = r.int(0, 99) * 10 + r.int(1, 9);
        kk = Math.min(k, 3 - p);
      }
      const f = 10 ** kk;
      const x = dec(M, p);
      const result = trimDec(times ? dec(M, p - kk) : dec(M, p + kk));
      const sup = level === 2 && kk >= 2 && r.bool(0.35);
      const factorPart: MathPart = sup ? { sup: ["10", String(kk)] } : String(f);
      const factorSay = sup ? tr(locale, `10 to the power of ${kk}`, `10 elevado a la ${kk}`) : String(f);
      const lead = String(M).length - 1 - p;
      const to = times ? lead + kk : lead - kk;
      const digit = String(M)[0];
      const dir = times ? tr(locale, "left", "a la izquierda") : tr(locale, "right", "a la derecha");
      const moves = kk === 1 ? tr(locale, "1 place", "1 lugar") : tr(locale, `${kk} places`, `${kk} lugares`);
      return {
        prompt: [`${x} ${times ? "×" : "÷"} `, factorPart, " = ", blank],
        say: times ? tr(locale, `${x} times ${factorSay}`, `${x} por ${factorSay}`) : tr(locale, `${x} divided by ${factorSay}`, `${x} entre ${factorSay}`),
        input: "keypad",
        ...(level === 2 ? { keys: ["." as const] } : {}),
        answer: { kind: "number", value: Number(result) },
        hints: [
          sup
            ? tr(locale, `10 to the power of ${kk} is ${f}. Count its zeros.`, `10 elevado a la ${kk} es ${f}. Cuenta sus ceros.`)
            : tr(locale, `How many zeros does ${f} have?`, `¿Cuántos ceros tiene ${f}?`),
          times
            ? tr(locale, `Multiplying by ${f} moves every digit ${moves} to the left.`, `Multiplicar por ${f} mueve cada cifra ${moves} a la izquierda.`)
            : tr(locale, `Dividing by ${f} moves every digit ${moves} to the right.`, `Dividir entre ${f} mueve cada cifra ${moves} a la derecha.`),
          tr(locale, `The ${digit} in the ${PLACE[lead][0]} place moves to the ${PLACE[to][0]} place.`, `El ${digit} de ${PLACE[lead][1]} pasa a ${PLACE[to][1]}.`),
        ],
        steps: [
          tr(locale, `${f} has ${kk} ${pl(kk, "zero", "zeros")}: move each digit ${moves} ${dir}.`, `${f} tiene ${kk} ${pl(kk, "cero", "ceros")}: mueve cada cifra ${moves} ${dir}.`),
          `${x} ${times ? "×" : "÷"} ${f} = ${result}`,
        ],
        seconds: level === 1 ? 10 : 15,
      };
    },
  },
  {
    id: "m.volume",
    subject: "math",
    grade: "5",
    title: { en: "Volume of a box", es: "Volumen de una caja" },
    standard: "5.MD.C.5",
    prereqs: ["m.mult.multi"],
    content: "computed",
    levels: 1,
    generate(r, _level, locale) {
      const unit = r.pick(UNITS);
      const abbr = un(locale, unit.abbr), cu = un(locale, unit.cu);
      const l = r.int(2, 10), w = r.int(2, 6), h = r.int(2, 8);
      const base = l * w, v = base * h;
      return {
        prompt: [tr(locale, "Find the volume of the box. ", "Encuentra el volumen de la caja. "), "V = ", blank, ` ${cu}`],
        say: tr(locale, `Find the volume of the box in ${cu}.`, `Encuentra el volumen de la caja en ${cu}.`),
        visual: { kind: "prism", l, w, h, unit: abbr },
        alt: tr(locale, `A box ${l} ${abbr} long, ${w} ${abbr} wide and ${h} ${abbr} tall`, `Una caja de ${l} ${abbr} de largo, ${w} ${abbr} de ancho y ${h} ${abbr} de alto`),
        input: "keypad",
        answer: { kind: "number", value: v },
        hints: [
          tr(locale, "Volume is the number of unit cubes that fill the box.", "El volumen es el número de cubos de una unidad que llenan la caja."),
          tr(locale, "Find the cubes in the bottom layer, then multiply by the number of layers.", "Encuentra los cubos de la capa de abajo y luego multiplica por el número de capas."),
          tr(locale, `Bottom layer: ${l} × ${w} = ${base} cubes.`, `Capa de abajo: ${l} × ${w} = ${base} cubos.`),
        ],
        steps: [
          tr(locale, `Bottom layer: ${l} × ${w} = ${base}`, `Capa de abajo: ${l} × ${w} = ${base}`),
          tr(locale, `${h} layers: ${base} × ${h} = ${v}`, `${h} capas: ${base} × ${h} = ${v}`),
          `V = ${v} ${cu}`,
        ],
        seconds: 30,
      };
    },
  },
];
