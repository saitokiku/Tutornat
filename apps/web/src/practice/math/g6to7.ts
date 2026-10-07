import type { Locale } from "@/lib/types";
import { gcd, lcm, type Rng } from "../rng";
import { sayFrac, show, tr } from "../text";
import type { Choice, ItemBody, MathPart, Skill } from "../types";

// Grades 6–7: fraction division, factors and multiples, ratios and percents, integers, expressions,
// equations and inequalities, area and circles. Every problem is built backward from its answer (pick
// the solution, then compute the constants), money is counted in whole cents and decimals in whole
// hundredths, so no key depends on floating-point rounding.

const NAMES = ["Maya", "Diego", "Aisha", "Kenji", "Priya", "Luis", "Amara", "Sofía", "Noah", "Mei", "Omar", "Grace", "Tomás", "Zoe", "Ravi", "Lena"];
/** Letters for unknowns. Not "a" or "y": read aloud in Spanish they sound like words ("to", "and"). */
const VARS = ["x", "n", "k", "m", "t", "p"];

const frac = (n: number | string, d: number | string): MathPart => ({ frac: [n, d] });
const mixedParts = (w: number, n: number, d: number): MathPart[] => (w ? [String(w), frac(n, d)] : [frac(n, d)]);
const mixedText = (w: number, n: number, d: number) => (w ? `${w} ${n}/${d}` : `${n}/${d}`);
/** A fraction read aloud; in Spanish a numerator of 1 is "un" ("un tercio"), not "uno". */
const sayF = (n: number, d: number, locale: Locale) => (locale === "es" && n === 1 ? sayFrac(n, d, locale).replace(/^1 /, "un ") : sayFrac(n, d, locale));
const sayMixed = (w: number, n: number, d: number, locale: Locale) => (w ? `${w} ${tr(locale, "and", "y")} ${sayF(n, d, locale)}` : sayF(n, d, locale));
/** After an operation sign a negative number goes in parentheses: 5 − (−3). */
const par = (n: number) => (n < 0 ? `(${show(n)})` : String(n));
/** How a signed number is read in class: "negative 3" / "menos 3". */
const sayInt = (n: number, locale: Locale) => (n < 0 ? tr(locale, `negative ${-n}`, `menos ${-n}`) : String(n));
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const supText = (n: number) => [...String(n)].map((c) => SUP[Number(c)]).join("");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function nonzero(r: Rng, min: number, max: number) {
  let n = 0;
  while (n === 0) n = r.int(min, max);
  return n;
}

/** Whole hundredths as a decimal without trailing zeros: 7850 → "78.5", 25 → "0.25". */
function dec(hundredths: number) {
  const a = Math.abs(hundredths);
  const rest = String(a % 100).padStart(2, "0").replace(/0+$/, "");
  return `${hundredths < 0 ? "−" : ""}${Math.floor(a / 100)}${rest ? `.${rest}` : ""}`;
}
/** Whole cents as a price: 450 → "$4.50", 4000 → "$40". */
const money = (cents: number) => `$${Math.floor(cents / 100)}${cents % 100 ? `.${String(cents % 100).padStart(2, "0")}` : ""}`;
function sayMoney(cents: number, locale: Locale) {
  const d = Math.floor(cents / 100), c = cents % 100;
  const dollars = tr(locale, d === 1 ? "1 dollar" : `${d} dollars`, d === 1 ? "1 dólar" : `${d} dólares`);
  const pennies = tr(locale, c === 1 ? "1 cent" : `${c} cents`, c === 1 ? "1 centavo" : `${c} centavos`);
  if (!c) return dollars;
  if (!d) return pennies;
  return `${dollars} ${tr(locale, "and", "con")} ${pennies}`;
}
/** The read-aloud version of a sentence with prices and percents: "$4.50" → "4 dollars and 50 cents", "20%" → "20 percent". */
const spoken = (s: string, locale: Locale) =>
  s
    .replace(/\$(\d+)(?:\.(\d\d))?/g, (_, d: string, c?: string) => sayMoney(Number(d) * 100 + Number(c ?? 0), locale))
    .replace(/(\d+)%/g, (_, n: string) => `${n} ${tr(locale, "percent", "por ciento")}`);

function withChoices(r: Rng, right: Choice, wrong: Choice[]): Pick<ItemBody, "choices" | "input" | "answer"> {
  const list = [right];
  for (const w of wrong) if (list.length < 4 && !list.some((c) => c.label === w.label)) list.push(w);
  const choices = r.shuffle(list);
  return { choices, input: "choices", answer: { kind: "choice", index: choices.findIndex((c) => c.label === right.label) } };
}

/** A coefficient and a variable ("" for a plain number). */
type Term = [number, string];
const termBody = ([c, v]: Term) => (v ? (Math.abs(c) === 1 ? v : `${Math.abs(c)}${v}`) : String(Math.abs(c)));
/** Signed terms as written: [[3,"x"],[-5,""]] → "3x − 5". Zero terms are dropped. */
function terms(list: Term[]) {
  const kept = list.filter(([c]) => c !== 0);
  if (!kept.length) return "0";
  return kept.map((t, i) => (i === 0 ? `${t[0] < 0 ? "−" : ""}${termBody(t)}` : `${t[0] < 0 ? "−" : "+"} ${termBody(t)}`)).join(" ");
}
/** The same terms read aloud: "3 x minus 5". With `more`, the first term also gets its "plus" or "minus". */
function sayTerms(list: Term[], locale: Locale, more = false) {
  const minus = tr(locale, "minus", "menos"), plus = tr(locale, "plus", "más");
  return list
    .filter(([c]) => c !== 0)
    .map(([c, v], i) => {
      const body = v ? (Math.abs(c) === 1 ? v : `${Math.abs(c)} ${v}`) : String(Math.abs(c));
      if (i === 0 && !more) return c < 0 ? `${tr(locale, "negative", "menos")} ${body}` : body;
      return `${c < 0 ? minus : plus} ${body}`;
    })
    .join(" ");
}

type Unit = { en: string; es: string; word: [string, string]; sq: [string, string] };
const UNITS: Unit[] = [
  { en: "cm", es: "cm", word: ["centimeters", "centímetros"], sq: ["square centimeters", "centímetros cuadrados"] },
  { en: "m", es: "m", word: ["meters", "metros"], sq: ["square meters", "metros cuadrados"] },
  { en: "in", es: "pulg", word: ["inches", "pulgadas"], sq: ["square inches", "pulgadas cuadradas"] },
  { en: "ft", es: "pies", word: ["feet", "pies"], sq: ["square feet", "pies cuadrados"] },
];
/** Unit wording: lengths written ("8 cm") or spoken ("8 centimeters"); the area unit always in words, "square centimeters". */
function unitWords(u: Unit, locale: Locale) {
  const ab = tr(locale, u.en, u.es);
  return {
    ab,
    len: (n: number, said: boolean) => `${n} ${said ? tr(locale, u.word[0], u.word[1]) : ab}`,
    sq: tr(locale, u.sq[0], u.sq[1]),
  };
}

// ---------- m.frac.div ----------

function properFrac(r: Rng, dens: number[]): [number, number] {
  const d = r.pick(dens);
  let n = r.int(1, d - 1);
  while (gcd(n, d) !== 1) n = r.int(1, d - 1);
  return [n, d];
}

/** The closing lines of a fraction answer n/m: reduced, and as a mixed number when that changes it. */
function fracResult(n: number, m: number, locale: Locale): string[] {
  const g = gcd(n, m), a = n / g, b = m / g;
  const mixed = b !== 1 && a > b ? ` = ${Math.floor(a / b)} ${a % b}/${b}` : "";
  if (g === 1) return [`= ${n}/${m}${mixed}`];
  return [`= ${n}/${m}`, `${tr(locale, "Simplify", "Simplifica")}: ${n}/${m} = ${b === 1 ? a : `${a}/${b}`}${mixed}`];
}

const DIV_STORIES = [
  {
    en: (who: string, many: boolean) => [`${who} has `, " cups of flour. Each batch of muffins uses ", ` ${many ? "cups" : "cup"}. How many batches can ${who} make?`],
    es: (who: string, many: boolean) => [`${who} tiene `, " tazas de harina. Cada tanda de panecillos lleva ", ` ${many ? "tazas" : "de taza"}. ¿Cuántas tandas puede hacer ${who}?`],
    unit: ["batches", "tandas"],
  },
  {
    en: (who: string, many: boolean) => ["A ribbon is ", ` feet long. ${who} cuts it into pieces that are each `, ` ${many ? "feet" : "foot"} long. How many pieces does ${who} get?`],
    es: (who: string, many: boolean) => ["Una cinta mide ", ` pies. ${who} la corta en trozos de `, ` ${many ? "pies" : "de pie"} cada uno. ¿Cuántos trozos obtiene ${who}?`],
    unit: ["pieces", "trozos"],
  },
  {
    en: (who: string, many: boolean) => [`${who} has `, " gallons of paint. Each section of the fence needs ", ` ${many ? "gallons" : "gallon"}. How many sections can ${who} paint?`],
    es: (who: string, many: boolean) => [`${who} tiene `, " galones de pintura. Cada sección de la cerca necesita ", ` ${many ? "galones" : "de galón"}. ¿Cuántas secciones puede pintar ${who}?`],
    unit: ["sections", "secciones"],
  },
];

function fracDiv(r: Rng, level: number, locale: Locale): ItemBody {
  const simplest = tr(locale, "Write the answer in simplest form.", "Escribe la respuesta en su forma más simple.");
  const by = tr(locale, "divided by", "dividido entre");
  if (level === 1) {
    const dens = [2, 3, 4, 5, 6, 8, 9, 10];
    const [a, b] = properFrac(r, dens);
    let [c, d] = properFrac(r, dens);
    while (a * d === b * c) [c, d] = properFrac(r, dens);
    const n = a * d, m = b * c, g = gcd(n, m);
    return {
      prompt: [`${tr(locale, "Divide.", "Divide.")} ${simplest} `, frac(a, b), " ÷ ", frac(c, d), " = ", { blank: true }],
      say: `${sayF(a, b, locale)} ${by} ${sayF(c, d, locale)}. ${simplest}`,
      input: "fraction",
      answer: { kind: "fraction", n: n / g, d: m / g, simplest: true },
      hints: [
        tr(locale, `How many groups of ${c}/${d} fit in ${a}/${b}?`, `¿Cuántos grupos de ${c}/${d} caben en ${a}/${b}?`),
        tr(locale, `Dividing by ${c}/${d} is the same as multiplying by its reciprocal, ${d}/${c}.`, `Dividir entre ${c}/${d} es lo mismo que multiplicar por su recíproco, ${d}/${c}.`),
        `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c}`,
      ],
      steps: [`${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c}`, ...fracResult(n, m, locale)],
      seconds: 30,
    };
  }
  if (r.bool(0.3)) {
    // A story with a whole-number answer: the amount is k groups of the divisor.
    const who = r.pick(NAMES);
    const story = r.pick(DIV_STORIES);
    const w2 = r.bool(0.35) ? 1 : 0;
    // A plain half is never the divisor: "un medio de taza" is not how a Spanish speaker says half a cup.
    const [n2, d2] = properFrac(r, w2 ? [2, 3, 4] : [3, 4]);
    const B = w2 * d2 + n2;
    let k = r.int(2, 9);
    while ((k * B) % d2 === 0 || k * B <= d2) k = r.int(2, 9);
    const A = k * B; // the amount is A/d2
    const g1 = gcd(A % d2, d2);
    const w1 = Math.floor(A / d2), n1 = (A % d2) / g1, d1 = d2 / g1, A1 = A / g1;
    const dvd = mixedText(w1, n1, d1), dvs = mixedText(w2, n2, d2);
    const [pre, mid, post] = locale === "es" ? story.es(who, w2 > 0) : story.en(who, w2 > 0);
    return {
      prompt: [pre, ...mixedParts(w1, n1, d1), mid, ...mixedParts(w2, n2, d2), post],
      say: `${pre}${sayMixed(w1, n1, d1, locale)}${mid}${sayMixed(w2, n2, d2, locale)}${post}`,
      input: "fraction",
      answer: { kind: "fraction", n: k, d: 1, simplest: true },
      hints: [
        tr(locale, `How many groups of ${dvs} fit in ${dvd}?`, `¿Cuántos grupos de ${dvs} caben en ${dvd}?`),
        tr(locale, `Divide ${dvd} by ${dvs}: write both as fractions, then multiply by the reciprocal of ${dvs}.`, `Divide ${dvd} entre ${dvs}: escribe los dos como fracciones y multiplica por el recíproco de ${dvs}.`),
        `${dvd} ÷ ${dvs} = ${A1}/${d1} × ${d2}/${B}`,
      ],
      steps: [`${dvd} ÷ ${dvs} = ${A1}/${d1} × ${d2}/${B}`, ...fracResult(A1 * d2, d1 * B, locale), `${k} ${tr(locale, story.unit[0], story.unit[1])}`],
      seconds: 60,
    };
  }
  const dens = [2, 3, 4, 5, 6, 8];
  const [n1, d1] = properFrac(r, dens), w1 = r.int(1, 4);
  const [n2, d2] = properFrac(r, dens), w2 = r.bool() ? r.int(1, 3) : 0;
  const A = w1 * d1 + n1, B = w2 * d2 + n2;
  const n = A * d2, m = d1 * B, g = gcd(n, m);
  const dvd = mixedText(w1, n1, d1), dvs = mixedText(w2, n2, d2);
  return {
    prompt: [`${tr(locale, "Divide.", "Divide.")} ${simplest} `, ...mixedParts(w1, n1, d1), " ÷ ", ...mixedParts(w2, n2, d2), " = ", { blank: true }],
    say: `${sayMixed(w1, n1, d1, locale)} ${by} ${sayMixed(w2, n2, d2, locale)}. ${simplest}`,
    input: "fraction",
    answer: { kind: "fraction", n: n / g, d: m / g, simplest: true },
    hints: [
      tr(locale, `How many groups of ${dvs} fit in ${dvd}?`, `¿Cuántos grupos de ${dvs} caben en ${dvd}?`),
      w2
        ? tr(locale, "Write both mixed numbers as improper fractions. Then multiply by the reciprocal of the divisor.", "Escribe los dos números mixtos como fracciones impropias. Luego multiplica por el recíproco del divisor.")
        : tr(locale, `Write ${dvd} as an improper fraction. Then multiply by the reciprocal of ${dvs}.`, `Escribe ${dvd} como fracción impropia. Luego multiplica por el recíproco de ${dvs}.`),
      w2 ? tr(locale, `${dvd} = ${A}/${d1} and ${dvs} = ${B}/${d2}.`, `${dvd} = ${A}/${d1} y ${dvs} = ${B}/${d2}.`) : `${dvd} = ${A}/${d1}`,
    ],
    steps: [`${dvd} ÷ ${dvs} = ${A}/${d1} ÷ ${B}/${d2}`, `= ${A}/${d1} × ${d2}/${B}`, ...fracResult(n, m, locale)],
    seconds: 45,
  };
}

// ---------- m.gcf.lcm ----------

const factorsOf = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((f) => n % f === 0);
function multiplesTo(n: number, top: number) {
  const k = top / n;
  return k <= 8 ? Array.from({ length: k }, (_, i) => n * (i + 1)).join(", ") : `${n}, ${2 * n}, ${3 * n}, …, ${top}`;
}

const GCF_STORIES = [
  {
    en: (who: string, a: number, b: number) => `${who} has ${a} pencils and ${b} erasers to pack into identical kits, with nothing left over. What is the greatest number of kits ${who} can make?`,
    es: (who: string, a: number, b: number) => `${who} tiene ${a} lápices y ${b} borradores para armar paquetes iguales, sin que sobre nada. ¿Cuál es el mayor número de paquetes que puede armar?`,
    done: (g: number, x: number, y: number) => [`${g} kits, each with ${x} pencils and ${y} erasers.`, `${g} paquetes, cada uno con ${x} lápices y ${y} borradores.`],
  },
  {
    en: (_: string, a: number, b: number) => `A florist has ${a} roses and ${b} daisies. Every bouquet must be the same, with no flowers left over. What is the greatest number of bouquets the florist can make?`,
    es: (_: string, a: number, b: number) => `Una florista tiene ${a} rosas y ${b} margaritas. Todos los ramos deben ser iguales y no debe sobrar ninguna flor. ¿Cuál es el mayor número de ramos que puede hacer?`,
    done: (g: number, x: number, y: number) => [`${g} bouquets, each with ${x} roses and ${y} daisies.`, `${g} ramos, cada uno con ${x} rosas y ${y} margaritas.`],
  },
  {
    en: (who: string, a: number, b: number) => `${who} has ${a} crackers and ${b} grapes for snack bags. Every bag must be the same, with nothing left over. What is the greatest number of bags ${who} can fill?`,
    es: (who: string, a: number, b: number) => `${who} tiene ${a} galletas saladas y ${b} uvas para bolsitas de merienda. Todas las bolsitas deben ser iguales y no debe sobrar nada. ¿Cuál es el mayor número de bolsitas que puede llenar?`,
    done: (g: number, x: number, y: number) => [`${g} bags, each with ${x} crackers and ${y} grapes.`, `${g} bolsitas, cada una con ${x} galletas y ${y} uvas.`],
  },
];

const LCM_STORIES = [
  {
    en: (_: string, a: number, b: number) => `One light blinks every ${a} seconds. Another light blinks every ${b} seconds. They just blinked at the same time. In how many seconds will they next blink together?`,
    es: (_: string, a: number, b: number) => `Una luz parpadea cada ${a} segundos. Otra luz parpadea cada ${b} segundos. Acaban de parpadear al mismo tiempo. ¿En cuántos segundos volverán a parpadear juntas?`,
    done: (L: number) => [`They blink together again in ${L} seconds.`, `Vuelven a parpadear juntas en ${L} segundos.`],
  },
  {
    en: (_: string, a: number, b: number) => `The red bus leaves the station every ${a} minutes. The blue bus leaves every ${b} minutes. Both just left together. In how many minutes will they next leave together?`,
    es: (_: string, a: number, b: number) => `El autobús rojo sale de la estación cada ${a} minutos. El azul sale cada ${b} minutos. Acaban de salir juntos. ¿En cuántos minutos volverán a salir juntos?`,
    done: (L: number) => [`They leave together again in ${L} minutes.`, `Vuelven a salir juntos en ${L} minutos.`],
  },
  {
    en: (who: string, a: number, b: number) => `Hot dogs come in packs of ${a} and buns come in packs of ${b}. ${who} wants exactly as many hot dogs as buns. What is the least number of hot dogs ${who} can buy?`,
    es: (who: string, a: number, b: number) => `Las salchichas vienen en paquetes de ${a} y los panes en paquetes de ${b}. ${who} quiere tener exactamente tantas salchichas como panes. ¿Cuál es el menor número de salchichas que puede comprar?`,
    done: (L: number, a: number, b: number) => [`${L} hot dogs: ${L / a} packs of hot dogs and ${L / b} packs of buns.`, `${L} salchichas: ${L / a} paquetes de salchichas y ${L / b} paquetes de panes.`],
  },
];

function gcfLcm(r: Rng, level: number, locale: Locale): ItemBody {
  const who = r.pick(NAMES);
  if (level === 1) {
    const word = r.bool(0.35);
    let g: number, p: number, q: number;
    do {
      g = r.int(2, 12);
      p = r.int(word ? 2 : 1, 9);
      q = r.int(2, 9);
    } while (p === q || gcd(p, q) !== 1 || g * Math.max(p, q) > 100);
    const [a, b] = r.bool() ? [g * p, g * q] : [g * q, g * p];
    const story = word ? r.pick(GCF_STORIES) : null;
    const question = story
      ? tr(locale, story.en(who, a, b), story.es(who, a, b))
      : tr(locale, `What is the greatest common factor of ${a} and ${b}?`, `¿Cuál es el máximo común divisor de ${a} y ${b}?`);
    const list = (n: number) => tr(locale, `Factors of ${n}: ${factorsOf(n).join(", ")}`, `Divisores de ${n}: ${factorsOf(n).join(", ")}`);
    const done = story?.done(g, a / g, b / g);
    return {
      prompt: [question],
      say: question,
      input: "keypad",
      answer: { kind: "number", value: g },
      hints: [
        story
          ? tr(locale, `The number of groups has to divide both ${a} and ${b} with nothing left over.`, `El número de grupos tiene que dividir a ${a} y a ${b} sin que sobre nada.`)
          : tr(locale, `Which numbers divide both ${a} and ${b} with no remainder?`, `¿Qué números dividen a ${a} y a ${b} sin residuo?`),
        tr(locale, "List the factors of each number. Find the greatest one that is on both lists.", "Escribe los divisores de cada número. Busca el mayor que esté en las dos listas."),
        `${list(a)}.`,
      ],
      steps: [list(a), list(b), tr(locale, `The greatest common factor is ${g}.`, `El máximo común divisor es ${g}.`), ...(done ? [tr(locale, done[0], done[1])] : [])],
      seconds: story ? 50 : 30,
    };
  }
  const word = r.bool(0.4);
  let a: number, b: number;
  do {
    a = r.int(2, 12);
    b = r.int(2, 15);
  } while (a === b || lcm(a, b) > 120 || ((a % b === 0 || b % a === 0) && (word || r.bool(0.8))));
  const L = lcm(a, b), big = Math.max(a, b), small = Math.min(a, b);
  const story = word ? r.pick(LCM_STORIES) : null;
  const question = story
    ? tr(locale, story.en(who, a, b), story.es(who, a, b))
    : tr(locale, `What is the least common multiple of ${a} and ${b}?`, `¿Cuál es el mínimo común múltiplo de ${a} y ${b}?`);
  const list = (n: number) => tr(locale, `Multiples of ${n}: ${multiplesTo(n, L)}`, `Múltiplos de ${n}: ${multiplesTo(n, L)}`);
  const done = story?.done(L, a, b);
  return {
    prompt: [question],
    say: question,
    input: "keypad",
    answer: { kind: "number", value: L },
    hints: [
      story
        ? tr(locale, `You need a number that is a multiple of both ${a} and ${b}.`, `Necesitas un número que sea múltiplo de ${a} y también de ${b}.`)
        : tr(locale, `Which numbers are multiples of both ${a} and ${b}?`, `¿Qué números son múltiplos de ${a} y también de ${b}?`),
      tr(locale, `List the multiples of ${big} until you reach one that is also a multiple of ${small}.`, `Escribe los múltiplos de ${big} hasta llegar a uno que también sea múltiplo de ${small}.`),
      tr(locale, `Multiples of ${big}: ${big}, ${2 * big}, ${3 * big}, …`, `Múltiplos de ${big}: ${big}, ${2 * big}, ${3 * big}, …`),
    ],
    steps: [list(a), list(b), tr(locale, `The least common multiple is ${L}.`, `El mínimo común múltiplo es ${L}.`), ...(done ? [tr(locale, done[0], done[1])] : [])],
    seconds: story ? 50 : 30,
  };
}

// ---------- m.ratio.equiv ----------

const RATIO_STORIES = [
  {
    en: (A: number, B: number, C: number) => `A paint color uses ${A} cups of blue for every ${B} cups of white. How many cups of white go with ${C} cups of blue?`,
    es: (A: number, B: number, C: number) => `Un color de pintura usa ${A} tazas de azul por cada ${B} tazas de blanco. ¿Cuántas tazas de blanco van con ${C} tazas de azul?`,
    unit: ["cups of white", "tazas de blanco"],
  },
  {
    en: (A: number, B: number, C: number) => `A lemonade recipe uses ${A} lemons for every ${B} cups of water. How many cups of water go with ${C} lemons?`,
    es: (A: number, B: number, C: number) => `Una receta de limonada usa ${A} limones por cada ${B} tazas de agua. ¿Cuántas tazas de agua van con ${C} limones?`,
    unit: ["cups of water", "tazas de agua"],
  },
  {
    en: (A: number, B: number, C: number) => `A trail mix has ${A} cups of nuts for every ${B} cups of raisins. How many cups of raisins go with ${C} cups of nuts?`,
    es: (A: number, B: number, C: number) => `Una mezcla de frutos secos tiene ${A} tazas de nueces por cada ${B} tazas de pasas. ¿Cuántas tazas de pasas van con ${C} tazas de nueces?`,
    unit: ["cups of raisins", "tazas de pasas"],
  },
  {
    en: (A: number, B: number, C: number) => `A garden has ${A} tomato plants for every ${B} pepper plants. How many pepper plants go with ${C} tomato plants?`,
    es: (A: number, B: number, C: number) => `Un huerto tiene ${A} plantas de tomate por cada ${B} plantas de pimiento. ¿Cuántas plantas de pimiento van con ${C} plantas de tomate?`,
    unit: ["pepper plants", "plantas de pimiento"],
  },
];

function ratioEquiv(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const a = r.int(1, 9);
    let b = r.int(1, 12);
    while (b === a) b = r.int(1, 12);
    const k = r.int(2, 9);
    const down = r.bool(0.3); // the big pair comes first, so the factor divides
    const [x1, y1, x2, y2] = down ? [k * a, k * b, a, b] : [a, b, k * a, k * b];
    const hideFirst = r.bool(0.4);
    const want = hideFirst ? x2 : y2;
    const [from, to, other] = hideFirst ? [y1, y2, x1] : [x1, x2, y1];
    return {
      prompt: hideFirst ? [`${x1} : ${y1} = `, { blank: true }, ` : ${y2}`] : [`${x1} : ${y1} = ${x2} : `, { blank: true }],
      say: hideFirst
        ? tr(locale, `${x1} to ${y1} is the same as what number to ${y2}?`, `¿${x1} es a ${y1} como qué número es a ${y2}?`)
        : tr(locale, `${x1} to ${y1} is the same as ${x2} to what number?`, `¿${x1} es a ${y1} como ${x2} es a qué número?`),
      input: "keypad",
      answer: { kind: "number", value: want },
      hints: [
        down ? tr(locale, `What do you divide ${from} by to get ${to}?`, `¿Entre qué número divides ${from} para obtener ${to}?`) : tr(locale, `What do you multiply ${from} by to get ${to}?`, `¿Por qué número multiplicas ${from} para obtener ${to}?`),
        down
          ? tr(locale, "To keep a ratio equivalent, divide both parts by the same number.", "Para que la razón sea equivalente, divide las dos partes entre el mismo número.")
          : tr(locale, "To keep a ratio equivalent, multiply both parts by the same number.", "Para que la razón sea equivalente, multiplica las dos partes por el mismo número."),
        down
          ? tr(locale, `${from} ÷ ${k} = ${to}, so divide ${other} by ${k} too.`, `${from} ÷ ${k} = ${to}, así que divide ${other} entre ${k} también.`)
          : tr(locale, `${from} × ${k} = ${to}, so multiply ${other} by ${k} too.`, `${from} × ${k} = ${to}, así que multiplica ${other} por ${k} también.`),
      ],
      steps: down ? [`${from} ÷ ${k} = ${to}`, `${other} ÷ ${k} = ${want}`, `${x1} : ${y1} = ${x2} : ${y2}`] : [`${from} × ${k} = ${to}`, `${other} × ${k} = ${want}`, `${x1} : ${y1} = ${x2} : ${y2}`],
      seconds: 20,
    };
  }
  // The second pair is not a whole-number multiple of the first, so the learner goes through the simplest ratio.
  let p: number, q: number, m: number, n: number;
  do {
    p = r.int(1, 6);
    q = r.int(1, 6);
  } while (p === q || gcd(p, q) !== 1);
  do {
    m = r.int(2, 5);
    n = r.int(1, 8);
  } while (gcd(m, n) !== 1 || n * Math.min(p, q) < 2);
  const A = m * p, B = m * q, C = n * p, want = n * q;
  const story = r.pick(RATIO_STORIES);
  const question = tr(locale, story.en(A, B, C), story.es(A, B, C));
  return {
    prompt: [question],
    say: question,
    input: "keypad",
    answer: { kind: "number", value: want },
    hints: [
      tr(locale, `You can't get from ${A} to ${C} by multiplying by a whole number. Find a simpler ratio first.`, `No puedes pasar de ${A} a ${C} multiplicando por un número entero. Busca primero una razón más simple.`),
      tr(locale, `Divide both parts of ${A} : ${B} by the same number to get the simplest ratio. Then scale it up to ${C}.`, `Divide las dos partes de ${A} : ${B} entre el mismo número para obtener la razón más simple. Luego auméntala hasta ${C}.`),
      tr(locale, `${A} : ${B} = ${p} : ${q} (divide both by ${m}).`, `${A} : ${B} = ${p} : ${q} (divide las dos entre ${m}).`),
    ],
    steps: [`${A} : ${B} = ${p} : ${q}`, `${p} × ${n} = ${C}, ${q} × ${n} = ${want}`, `${want} ${tr(locale, story.unit[0], story.unit[1])}`],
    seconds: 45,
  };
}

// ---------- m.ratio.unit ----------

type RateStory = {
  u: [number, number];
  n: [number, number];
  pay?: boolean;
  en: (who: string, total: string, n: number) => string;
  es: (who: string, total: string, n: number) => string;
  per: [string, string];
  one: [string, string];
  many: [string, string];
};
const RATE_STORIES: RateStory[] = [
  {
    u: [30, 65], n: [2, 6],
    en: (_, T, n) => `A car travels ${T} miles in ${n} hours at a steady speed. How many miles per hour is that?`,
    es: (_, T, n) => `Un carro recorre ${T} millas en ${n} horas a velocidad constante. ¿Cuántas millas por hora son?`,
    per: ["miles per hour", "millas por hora"], one: ["hour", "hora"], many: ["hours", "horas"],
  },
  {
    u: [8, 30], n: [3, 7],
    en: (who, T, n) => `${who} reads ${T} pages in ${n} days, the same number each day. How many pages per day is that?`,
    es: (who, T, n) => `${who} lee ${T} páginas en ${n} días, la misma cantidad cada día. ¿Cuántas páginas por día son?`,
    per: ["pages per day", "páginas por día"], one: ["day", "día"], many: ["days", "días"],
  },
  {
    u: [20, 45], n: [2, 5],
    en: (who, T, n) => `${who} types ${T} words in ${n} minutes at a steady pace. How many words per minute is that?`,
    es: (who, T, n) => `${who} escribe ${T} palabras en ${n} minutos a un ritmo constante. ¿Cuántas palabras por minuto son?`,
    per: ["words per minute", "palabras por minuto"], one: ["minute", "minuto"], many: ["minutes", "minutos"],
  },
  {
    u: [10, 18], n: [3, 8], pay: true,
    en: (who, T, n) => `${who} earns ${T} for ${n} hours of work. How many dollars per hour is that?`,
    es: (who, T, n) => `${who} gana ${T} por ${n} horas de trabajo. ¿Cuántos dólares por hora son?`,
    per: ["dollars per hour", "dólares por hora"], one: ["hour", "hora"], many: ["hours", "horas"],
  },
  {
    u: [3, 9], n: [4, 12],
    en: (_, T, n) => `A hose fills a ${T}-gallon tank in ${n} minutes. How many gallons per minute is that?`,
    es: (_, T, n) => `Una manguera llena un tanque de ${T} galones en ${n} minutos. ¿Cuántos galones por minuto son?`,
    per: ["gallons per minute", "galones por minuto"], one: ["minute", "minuto"], many: ["minutes", "minutos"],
  },
];

type PriceStory = { p: [number, number]; n: [number, number]; en: (n: number, T: string) => string; es: (n: number, T: string) => string; one: [string, string]; many: [string, string] };
const PRICE_STORIES: PriceStory[] = [
  {
    p: [35, 95], n: [4, 10],
    en: (n, T) => `A pack of ${n} juice boxes costs ${T}. What is the price per juice box?`,
    es: (n, T) => `Un paquete de ${n} cajitas de jugo cuesta ${T}. ¿Cuál es el precio por cajita?`,
    one: ["juice box", "cajita"], many: ["juice boxes", "cajitas"],
  },
  {
    p: [99, 249], n: [2, 6],
    en: (n, T) => `${n} pounds of apples cost ${T}. What is the price per pound?`,
    es: (n, T) => `${n} libras de manzanas cuestan ${T}. ¿Cuál es el precio por libra?`,
    one: ["pound", "libra"], many: ["pounds", "libras"],
  },
  {
    p: [30, 80], n: [6, 12],
    en: (n, T) => `A box of ${n} granola bars costs ${T}. What is the price per bar?`,
    es: (n, T) => `Una caja de ${n} barras de granola cuesta ${T}. ¿Cuál es el precio por barra?`,
    one: ["bar", "barra"], many: ["bars", "barras"],
  },
  {
    p: [289, 449], n: [5, 12],
    en: (n, T) => `${n} gallons of gas cost ${T}. What is the price per gallon?`,
    es: (n, T) => `${n} galones de gasolina cuestan ${T}. ¿Cuál es el precio por galón?`,
    one: ["gallon", "galón"], many: ["gallons", "galones"],
  },
  {
    p: [15, 45], n: [8, 12],
    en: (n, T) => `A pack of ${n} pencils costs ${T}. What is the price per pencil?`,
    es: (n, T) => `Un paquete de ${n} lápices cuesta ${T}. ¿Cuál es el precio por lápiz?`,
    one: ["pencil", "lápiz"], many: ["pencils", "lápices"],
  },
];

function ratioUnit(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const story = r.pick(RATE_STORIES);
    const who = r.pick(NAMES);
    const u = r.int(...story.u), n = r.int(...story.n), T = u * n;
    const question = tr(locale, story.en(who, story.pay ? money(T * 100) : String(T), n), story.es(who, story.pay ? money(T * 100) : String(T), n));
    const one = tr(locale, story.one[0], story.one[1]);
    return {
      prompt: [question],
      say: spoken(question, locale),
      input: "keypad",
      answer: { kind: "number", value: u },
      hints: [
        tr(locale, `“Per ${one}” means in 1 ${one}.`, `“Por ${one}” significa en 1 ${one}.`),
        tr(locale, `Divide the total by the number of ${story.many[0]}.`, `Divide el total entre el número de ${story.many[1]}.`),
        tr(locale, `${T} ÷ ${n}: think ${n} × what number = ${T}?`, `${T} ÷ ${n}: piensa qué número por ${n} da ${T}.`),
      ],
      steps: [`${T} ÷ ${n} = ${u}`, `${u} ${tr(locale, story.per[0], story.per[1])}`],
      seconds: 30,
    };
  }
  const story = r.pick(PRICE_STORIES);
  const p = r.int(...story.p), n = r.int(...story.n), T = p * n; // cents
  const question = tr(locale, story.en(n, money(T)), story.es(n, money(T)));
  const tail = tr(locale, "Answer in dollars.", "Responde en dólares.");
  const cents = tr(locale, "cents", "centavos");
  const one = tr(locale, story.one[0], story.one[1]);
  return {
    prompt: [`${question} ${tail}`],
    say: `${spoken(question, locale)} ${tail}`,
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: p / 100 },
    hints: [
      tr(locale, `The unit price is the cost of 1 ${one}.`, `El precio unitario es lo que cuesta 1 ${one}.`),
      tr(locale, `Divide the total cost by the number of ${story.many[0]}.`, `Divide el costo total entre el número de ${story.many[1]}.`),
      tr(locale, `${money(T)} is ${T} cents, so find ${T} ÷ ${n}.`, `${money(T)} son ${T} centavos, así que calcula ${T} ÷ ${n}.`),
    ],
    steps: [`${T} ÷ ${n} = ${p} ${cents}`, `${p} ${cents} = ${money(p)}`, `${money(p)} ${tr(locale, "per", "por")} ${one}`],
    seconds: 45,
  };
}

// ---------- m.percent ----------

/** A whole-number step for amounts so p% of them, and the benchmark used to get there (10%, 25%, 50%…), are whole numbers. */
const pctUnit = (p: number) => lcm(100 / gcd(p, 100), p === 50 ? 2 : p === 25 || p === 75 ? 4 : p % 10 === 0 ? 10 : 20);

/** How to find p% of w with benchmark percents: a strategy hint, the first step, and the worked lines. */
function pctPlan(p: number, w: number, fmt: (n: number) => string, locale: Locale) {
  const part = (w * p) / 100;
  const of = (q: number, v: number) => tr(locale, `${q}% of ${fmt(w)} = ${fmt(v)}`, `${q}% de ${fmt(w)} = ${fmt(v)}`);
  const divide = (k: number) => tr(locale, `Divide ${fmt(w)} by ${k}.`, `Divide ${fmt(w)} entre ${k}.`);
  if (p === 50) return { strategy: tr(locale, "50% is one half.", "50% es la mitad."), first: divide(2), steps: ["50% = 1/2", `${fmt(w)} ÷ 2 = ${fmt(part)}`] };
  if (p === 25) return { strategy: tr(locale, "25% is one fourth.", "25% es un cuarto."), first: divide(4), steps: ["25% = 1/4", `${fmt(w)} ÷ 4 = ${fmt(part)}`] };
  if (p === 10) return { strategy: tr(locale, "10% is one tenth.", "10% es un décimo."), first: divide(10), steps: ["10% = 1/10", `${fmt(w)} ÷ 10 = ${fmt(part)}`] };
  if (p === 75)
    return {
      strategy: tr(locale, "75% is three fourths: find 25%, then take it 3 times.", "75% son tres cuartos: calcula el 25% y tómalo 3 veces."),
      first: of(25, w / 4),
      steps: [of(25, w / 4), `3 × ${fmt(w / 4)} = ${fmt(part)}`],
    };
  if (p % 10 === 0)
    return {
      strategy: tr(locale, `Find 10% first by dividing by 10. ${p}% is ${p / 10} times that.`, `Primero calcula el 10% dividiendo entre 10. El ${p}% es ${p / 10} veces eso.`),
      first: of(10, w / 10),
      steps: [of(10, w / 10), `${p / 10} × ${fmt(w / 10)} = ${fmt(part)}`],
    };
  if (p === 5) return { strategy: tr(locale, "5% is half of 10%.", "5% es la mitad del 10%."), first: of(10, w / 10), steps: [of(10, w / 10), `5%: ${fmt(w / 10)} ÷ 2 = ${fmt(part)}`] };
  if (p % 10 === 5) {
    const tens = (p - 5) / 10;
    return {
      strategy: tr(locale, `${p}% = ${p - 5}% + 5%. Find 10% first; 5% is half of it.`, `${p}% = ${p - 5}% + 5%. Primero calcula el 10%; el 5% es la mitad.`),
      first: of(10, w / 10),
      steps: [of(10, w / 10), of(5, w / 20), `${tens === 1 ? fmt(w / 10) : `${tens} × ${fmt(w / 10)}`} + ${fmt(w / 20)} = ${fmt(part)}`],
    };
  }
  return {
    strategy: tr(locale, `Find 1% first by dividing by 100. ${p}% is ${p} times that.`, `Primero calcula el 1% dividiendo entre 100. El ${p}% es ${p} veces eso.`),
    first: of(1, w / 100),
    steps: [of(1, w / 100), `${p} × ${fmt(w / 100)} = ${fmt(part)}`],
  };
}

const PCT_STORIES = [
  {
    range: [100, 800],
    en: (w: number, p: number) => `A school has ${w} students. ${p}% of them ride the bus. How many students ride the bus?`,
    es: (w: number, p: number) => `Una escuela tiene ${w} estudiantes. El ${p}% viaja en autobús. ¿Cuántos estudiantes viajan en autobús?`,
  },
  {
    range: [20, 200],
    en: (w: number, p: number) => `A garden has ${w} plants. ${p}% of them are tomato plants. How many tomato plants are there?`,
    es: (w: number, p: number) => `Un huerto tiene ${w} plantas. El ${p}% son plantas de tomate. ¿Cuántas plantas de tomate hay?`,
  },
  {
    range: [40, 400],
    en: (w: number, p: number) => `${w} people answered a survey. ${p}% of them said they like hiking. How many people is that?`,
    es: (w: number, p: number) => `${w} personas respondieron una encuesta. El ${p}% dijo que le gusta ir de excursión. ¿Cuántas personas son?`,
  },
];

function percent(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]);
    const story = r.bool(0.3) ? r.pick(PCT_STORIES) : null;
    const [lo, hi] = story ? story.range : [20, 200];
    const unit = pctUnit(p);
    const w = unit * r.int(Math.ceil(lo / unit), Math.floor(hi / unit));
    const plan = pctPlan(p, w, String, locale);
    const question = story ? tr(locale, story.en(w, p), story.es(w, p)) : "";
    return {
      prompt: story ? [question] : [tr(locale, `${p}% of ${w} = `, `${p}% de ${w} = `), { blank: true }],
      say: story ? spoken(question, locale) : tr(locale, `What is ${p} percent of ${w}?`, `¿Cuánto es el ${p} por ciento de ${w}?`),
      input: "keypad",
      answer: { kind: "number", value: (w * p) / 100 },
      hints: [tr(locale, `${p}% means ${p} out of every 100.`, `${p}% significa ${p} de cada 100.`), plan.strategy, plan.first],
      steps: plan.steps,
      seconds: story ? 45 : 25,
    };
  }
  const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90]);
  const unit = pctUnit(p);
  const w = unit * r.int(Math.ceil(20 / unit), Math.floor(200 / unit));
  const part = (w * p) / 100;
  if (r.bool()) {
    // Find the whole: scale from p% down to a benchmark s%, then up to 100%.
    const s = gcd(p, 100), atS = part / (p / s);
    const question = tr(locale, `${part} is ${p}% of what number?`, `¿${part} es el ${p}% de qué número?`);
    return {
      prompt: [question],
      say: spoken(question, locale),
      input: "keypad",
      answer: { kind: "number", value: w },
      hints: [
        tr(locale, `${p}% of the number is ${part}. What is 100% of it?`, `El ${p}% del número es ${part}. ¿Cuánto es el 100%?`),
        s === p
          ? tr(locale, `${p}% fits into 100% exactly ${100 / p} times.`, `${p}% cabe exactamente ${100 / p} veces en 100%.`)
          : tr(locale, `Find ${s}% first. Then multiply up to 100%.`, `Primero calcula el ${s}%. Luego multiplica hasta llegar al 100%.`),
        s === p
          ? tr(locale, `So the number is ${100 / p} times ${part}.`, `Entonces el número es ${100 / p} veces ${part}.`)
          : tr(locale, `${p}% → ${part}, so ${s}% → ${part} ÷ ${p / s} = ${atS}.`, `${p}% → ${part}, así que ${s}% → ${part} ÷ ${p / s} = ${atS}.`),
      ],
      steps: s === p ? [`${p}% → ${part}`, `100% → ${100 / p} × ${part} = ${w}`] : [`${p}% → ${part}`, `${s}% → ${part} ÷ ${p / s} = ${atS}`, `100% → ${atS} × ${100 / s} = ${w}`],
      seconds: 40,
    };
  }
  // Find the percent: the fraction part/whole, renamed as hundredths.
  const g = gcd(part, w), sn = part / g, sd = w / g;
  const question = tr(locale, `${part} is what percent of ${w}?`, `¿Qué porcentaje de ${w} es ${part}?`);
  return {
    prompt: [question, " ", { blank: true }, "%"],
    say: question,
    input: "keypad",
    answer: { kind: "number", value: p },
    hints: [
      tr(locale, `What fraction of ${w} is ${part}?`, `¿Qué fracción de ${w} es ${part}?`),
      tr(locale, `Write ${part}/${w}, simplify it, then rename it as hundredths.`, `Escribe ${part}/${w}, simplifícala y luego exprésala en centésimos.`),
      g > 1 ? `${part}/${w} = ${sn}/${sd}` : tr(locale, `${part}/${w}: multiply the top and bottom by ${100 / sd}.`, `${part}/${w}: multiplica arriba y abajo por ${100 / sd}.`),
    ],
    steps: [...(g > 1 ? [`${part}/${w} = ${sn}/${sd}`] : []), `${sn}/${sd} = ${p}/100`, `${p}%`],
    seconds: 40,
  };
}

// ---------- m.int.numberline ----------

function intNumberLine(r: Rng, level: number, locale: Locale): ItemBody {
  const units = (k: number) => (k === 1 ? tr(locale, "1 unit", "1 unidad") : tr(locale, `${k} units`, `${k} unidades`));
  const place = (n: number) =>
    n < 0 ? tr(locale, `${units(-n)} to the left of 0`, `${units(-n)} a la izquierda del 0`) : n > 0 ? tr(locale, `${units(n)} to the right of 0`, `${units(n)} a la derecha del 0`) : tr(locale, "at 0", "en el 0");
  if (level === 1) {
    if (r.bool()) {
      // An odd number halfway between two labels, so the label itself never gives the answer.
      const m = r.bool(0.7) ? -(2 * r.int(0, 4) + 1) : 2 * r.int(0, 4) + 1;
      const q = tr(locale, "What number is at the dot?", "¿Qué número está en el punto?");
      return {
        prompt: [q],
        say: q,
        visual: { kind: "number-line", min: -10, max: 10, marks: [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10], marker: m },
        alt: tr(locale, "A number line from −10 to 10 with labels every 2. A dot sits between two labels.", "Una recta numérica de −10 a 10 con marcas cada 2. Hay un punto entre dos marcas."),
        input: "keypad",
        keys: ["-"],
        answer: { kind: "number", value: m },
        hints: [
          tr(locale, "Find 0 first. Numbers to the left of 0 are negative.", "Busca primero el 0. Los números a la izquierda del 0 son negativos."),
          tr(locale, "The labels go up by 2, so the dot is halfway between two labels.", "Las marcas van de 2 en 2, así que el punto está a la mitad entre dos marcas."),
          tr(locale, `The dot is between ${show(m - 1)} and ${show(m + 1)}.`, `El punto está entre ${show(m - 1)} y ${show(m + 1)}.`),
        ],
        steps: [tr(locale, `Halfway between ${show(m - 1)} and ${show(m + 1)} is ${show(m)}.`, `A la mitad entre ${show(m - 1)} y ${show(m + 1)} está el ${show(m)}.`)],
        seconds: 12,
      };
    }
    const a = nonzero(r, -20, 20);
    let b: number;
    if (r.bool(0.3)) b = -a;
    else
      do b = r.int(-20, 20);
      while (b === a || (a > 0 && b >= 0));
    const sym = a < b ? "<" : a > b ? ">" : "=";
    const options: Choice[] = [
      { label: "<", say: tr(locale, "is less than", "es menor que") },
      { label: ">", say: tr(locale, "is greater than", "es mayor que") },
      { label: "=", say: tr(locale, "is equal to", "es igual a") },
    ];
    return {
      prompt: [`${show(a)} `, { blank: true }, ` ${show(b)}`],
      say: tr(locale, `Compare ${sayInt(a, locale)} and ${sayInt(b, locale)}.`, `Compara ${sayInt(a, locale)} y ${sayInt(b, locale)}.`),
      visual: { kind: "number-line", min: -20, max: 20, marks: [-20, -15, -10, -5, 0, 5, 10, 15, 20] },
      alt: tr(locale, "A number line from −20 to 20 with labels every 5.", "Una recta numérica de −20 a 20 con marcas cada 5."),
      ...withChoices(r, options.find((c) => c.label === sym)!, options.filter((c) => c.label !== sym)),
      hints: [
        tr(locale, "On a number line, numbers get greater as you move to the right.", "En la recta numérica, los números aumentan hacia la derecha."),
        tr(locale, "Negative numbers are to the left of 0. The farther left a number is, the smaller it is.", "Los números negativos están a la izquierda del 0. Cuanto más a la izquierda, menor es el número."),
        `${show(a)}: ${place(a)}. ${show(b)}: ${place(b)}.`,
      ],
      steps: [
        tr(locale, `${show(a)} is to the ${a < b ? "left" : "right"} of ${show(b)} on the number line.`, `${show(a)} está a la ${a < b ? "izquierda" : "derecha"} de ${show(b)} en la recta numérica.`),
        `${show(a)} ${sym} ${show(b)}`,
      ],
      seconds: 10,
    };
  }
  const kind = r.int(0, 9);
  if (kind < 4) {
    const n = r.int(1, 30) * (r.bool(0.75) ? -1 : 1);
    return {
      prompt: [`|${show(n)}| = `, { blank: true }],
      say: tr(locale, `What is the absolute value of ${sayInt(n, locale)}?`, `¿Cuál es el valor absoluto de ${sayInt(n, locale)}?`),
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: Math.abs(n) },
      hints: [
        tr(locale, "Absolute value is a distance: how far a number is from 0.", "El valor absoluto es una distancia: qué tan lejos está un número del 0."),
        tr(locale, `Count how far ${show(n)} is from 0. A distance is never negative.`, `Cuenta qué tan lejos está ${show(n)} del 0. Una distancia nunca es negativa.`),
        tr(locale, `Start at 0 and count the steps to ${show(n)} on a number line.`, `Empieza en 0 y cuenta los pasos hasta ${show(n)} en la recta numérica.`),
      ],
      steps: [tr(locale, `${show(n)} is ${units(Math.abs(n))} from 0.`, `${show(n)} está a ${units(Math.abs(n))} del 0.`), `|${show(n)}| = ${Math.abs(n)}`],
      seconds: 8,
    };
  }
  if (kind < 6) {
    const n = nonzero(r, -25, 25);
    const symbolic = n < 0 && r.bool();
    // In words, the opposite is found on a number line (6.NS.C.6a): −10 to 10, symmetric so its ends
    // give nothing away, and short enough that every point is a fair tap on a phone. Larger numbers
    // are typed.
    const line = !symbolic && Math.abs(n) <= 10;
    return {
      prompt: symbolic
        ? [`−(${show(n)}) = `, { blank: true }]
        : line
          ? [tr(locale, `Put a point at the opposite of ${show(n)}.`, `Coloca un punto en el opuesto de ${show(n)}.`)]
          : [tr(locale, `What is the opposite of ${show(n)}?`, `¿Cuál es el opuesto de ${show(n)}?`)],
      say: line
        ? tr(locale, `Put a point at the opposite of ${sayInt(n, locale)} on the number line.`, `Coloca un punto en el opuesto de ${sayInt(n, locale)} sobre la recta numérica.`)
        : tr(locale, `What is the opposite of ${sayInt(n, locale)}?`, `¿Cuál es el opuesto de ${sayInt(n, locale)}?`),
      ...(line
        ? { input: "number-line" as const, pad: { kind: "number-line" as const, min: -10, max: 10, step: 1 } }
        : { input: "keypad" as const, keys: ["-" as const] }),
      wrong: [{ value: String(n), why: "kept-the-sign" }],
      answer: { kind: "number", value: -n },
      hints: [
        symbolic
          ? tr(locale, `−(${show(n)}) means the opposite of ${show(n)}.`, `−(${show(n)}) significa el opuesto de ${show(n)}.`)
          : tr(locale, "Opposites are the same distance from 0, on opposite sides.", "Los opuestos están a la misma distancia del 0, en lados contrarios."),
        tr(locale, "To find the opposite, keep the distance from 0 and change the side.", "Para hallar el opuesto, conserva la distancia al 0 y cambia de lado."),
        tr(locale, `${show(n)} is ${place(n)}.`, `${show(n)} está ${place(n)}.`),
      ],
      steps: [tr(locale, `${show(n)} is ${place(n)}. Its opposite is ${place(-n)}.`, `${show(n)} está ${place(n)}. Su opuesto está ${place(-n)}.`), show(-n)],
      // Placing a point takes a few seconds longer than typing a remembered fact.
      seconds: line ? 12 : 8,
    };
  }
  if (kind < 8) {
    const sub = r.bool();
    const d = sub ? r.int(5, 60) : r.int(3, 30);
    const q = sub
      ? tr(locale, `A submarine is at ${show(-d)} meters. Sea level is 0 meters. How many meters is the submarine from sea level?`, `Un submarino está a ${show(-d)} metros. El nivel del mar está a 0 metros. ¿A cuántos metros está el submarino del nivel del mar?`)
      : tr(locale, `The temperature is ${show(-d)}°F. How many degrees is that from 0°F?`, `La temperatura es de ${show(-d)} °F. ¿A cuántos grados está de 0 °F?`);
    return {
      prompt: [q],
      say: sub
        ? tr(locale, `A submarine is at ${sayInt(-d, locale)} meters. Sea level is 0 meters. How many meters is the submarine from sea level?`, `Un submarino está a ${sayInt(-d, locale)} metros. El nivel del mar está a 0 metros. ¿A cuántos metros está el submarino del nivel del mar?`)
        : tr(locale, `The temperature is ${sayInt(-d, locale)} degrees Fahrenheit. How many degrees is that from 0 degrees?`, `La temperatura es de ${sayInt(-d, locale)} grados Fahrenheit. ¿A cuántos grados está de 0 grados?`),
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: d },
      hints: [
        tr(locale, "A distance from 0 is an absolute value.", "La distancia al 0 es un valor absoluto."),
        tr(locale, `Find |${show(-d)}|. A distance is never negative.`, `Calcula |${show(-d)}|. Una distancia nunca es negativa.`),
        tr(locale, `Count from 0 down to ${show(-d)}.`, `Cuenta desde 0 hacia abajo hasta ${show(-d)}.`),
      ],
      steps: [`|${show(-d)}| = ${d}`, sub ? tr(locale, `The submarine is ${d} meters from sea level.`, `El submarino está a ${d} metros del nivel del mar.`) : tr(locale, `It is ${d} degrees from 0°F.`, `Está a ${d} grados de 0 °F.`)],
      seconds: 20,
    };
  }
  // Which absolute value is greater? Usually the negative one is farther from 0, so "the bigger number" is the trap.
  let a: number, b: number;
  if (r.bool(0.7)) {
    a = -r.int(6, 20);
    b = r.int(1, -a - 1);
  } else
    do {
      a = nonzero(r, -20, 20);
      b = nonzero(r, -20, 20);
    } while (Math.abs(a) === Math.abs(b) || (a > 0 && b > 0));
  const [first, second] = r.bool() ? [a, b] : [b, a];
  const big = Math.abs(first) > Math.abs(second) ? first : second;
  const label = (n: number): Choice => ({ label: `|${show(n)}|`, say: tr(locale, `the absolute value of ${sayInt(n, locale)}`, `el valor absoluto de ${sayInt(n, locale)}`) });
  return {
    prompt: [tr(locale, "Which is greater?", "¿Cuál es mayor?")],
    say: tr(
      locale,
      `Which is greater: the absolute value of ${sayInt(first, locale)}, or the absolute value of ${sayInt(second, locale)}?`,
      `¿Cuál es mayor: el valor absoluto de ${sayInt(first, locale)} o el valor absoluto de ${sayInt(second, locale)}?`,
    ),
    ...withChoices(r, label(big), [label(big === first ? second : first)]),
    hints: [
      tr(locale, "Find each absolute value first.", "Primero calcula cada valor absoluto."),
      tr(locale, "Absolute value is distance from 0, so it is never negative.", "El valor absoluto es la distancia al 0, así que nunca es negativo."),
      `|${show(first)}| = ${Math.abs(first)}`,
    ],
    steps: [
      `|${show(first)}| = ${Math.abs(first)}, |${show(second)}| = ${Math.abs(second)}`,
      tr(locale, `${Math.abs(big)} is greater, so |${show(big)}| is greater.`, `${Math.abs(big)} es mayor, así que |${show(big)}| es mayor.`),
    ],
    seconds: 12,
  };
}

// ---------- m.exp.whole ----------

const POWERS: [number, number][] = [[2, 7], [3, 5], [4, 4], [5, 4], [6, 3], [7, 3], [8, 3], [9, 3], [10, 6], [11, 2], [12, 2]];
const ORD_ES: Record<number, string> = { 4: "cuarta", 5: "quinta", 6: "sexta", 7: "séptima" };

function expWhole(r: Rng, _level: number, locale: Locale): ItemBody {
  const [b, top] = r.pick(POWERS);
  const e = r.int(2, top);
  const value = b ** e;
  const said = e === 2 ? tr(locale, `${b} squared`, `${b} al cuadrado`) : e === 3 ? tr(locale, `${b} cubed`, `${b} al cubo`) : tr(locale, `${b} to the ${e}th power`, `${b} a la ${ORD_ES[e]} potencia`);
  const chain: string[] = [];
  for (let k = 2, acc = b; k <= e; k++, acc *= b) chain.push(`${acc} × ${b} = ${acc * b}`);
  return {
    prompt: [{ sup: [String(b), String(e)] }, " = ", { blank: true }],
    say: tr(locale, `What is ${said}?`, `¿Cuánto es ${said}?`),
    input: "keypad",
    answer: { kind: "number", value },
    hints: [
      tr(locale, `The exponent ${e} tells how many times ${b} is used as a factor.`, `El exponente ${e} indica cuántas veces se usa ${b} como factor.`),
      b === 10
        ? tr(locale, "Each factor of 10 adds one zero.", "Cada factor de 10 agrega un cero.")
        : tr(locale, `Write ${b} as a factor ${e} times and multiply from left to right.`, `Escribe ${b} como factor ${e} veces y multiplica de izquierda a derecha.`),
      e === 2 ? `${b}² = ${b} × ${b}` : tr(locale, `${b} × ${b} = ${b * b}. Keep multiplying by ${b}.`, `${b} × ${b} = ${b * b}. Sigue multiplicando por ${b}.`),
    ],
    steps: [`${b}${supText(e)} = ${Array(e).fill(b).join(" × ")}`, ...(e > 2 ? [chain.join(", ")] : []), `${b}${supText(e)} = ${value}`],
    seconds: e <= 3 ? 12 : 20,
  };
}

// ---------- m.expr.eval ----------

type EvalForm = { x: number; parts: MathPart[]; text: string; said: string; sub: string; value: number; meaning?: string; mid?: string; tip?: string };

function exprEval(r: Rng, level: number, locale: Locale): ItemBody {
  const v = r.pick(VARS);
  const plus = tr(locale, "plus", "más"), minus = tr(locale, "minus", "menos"), over = tr(locale, "divided by", "dividido entre");
  const one: (() => EvalForm)[] = [
    () => {
      const a = r.int(2, 12), x = r.int(2, 12);
      return { x, parts: [`${a}${v}`], text: `${a}${v}`, said: `${a} ${v}`, sub: `${a} × ${x}`, value: a * x, meaning: tr(locale, `${a}${v} means ${a} × ${v}.`, `${a}${v} significa ${a} × ${v}.`) };
    },
    () => {
      const b = r.int(2, 30), x = r.int(1, 30);
      return { x, parts: [`${v} + ${b}`], text: `${v} + ${b}`, said: `${v} ${plus} ${b}`, sub: `${x} + ${b}`, value: x + b, meaning: tr(locale, `${v} + ${b} means add ${b} to ${v}.`, `${v} + ${b} significa sumarle ${b} a ${v}.`) };
    },
    () => {
      const b = r.int(2, 20), x = b + r.int(1, 30);
      return { x, parts: [`${v} − ${b}`], text: `${v} − ${b}`, said: `${v} ${minus} ${b}`, sub: `${x} − ${b}`, value: x - b, meaning: tr(locale, `${v} − ${b} means take ${b} away from ${v}.`, `${v} − ${b} significa quitarle ${b} a ${v}.`) };
    },
    () => {
      const b = r.int(15, 50), x = r.int(1, b - 1);
      return { x, parts: [`${b} − ${v}`], text: `${b} − ${v}`, said: `${b} ${minus} ${v}`, sub: `${b} − ${x}`, value: b - x, meaning: tr(locale, `${b} − ${v} means take ${v} away from ${b}.`, `${b} − ${v} significa quitarle ${v} a ${b}.`) };
    },
    () => {
      const a = r.int(2, 10), x = a * r.int(2, 12);
      return { x, parts: [frac(v, a)], text: `${v}/${a}`, said: `${v} ${over} ${a}`, sub: `${x} ÷ ${a}`, value: x / a, meaning: tr(locale, `The fraction bar means divide: ${v} ÷ ${a}.`, `La barra de fracción significa dividir: ${v} ÷ ${a}.`) };
    },
    () => {
      const x = r.int(2, 12);
      return { x, parts: [{ sup: [v, "2"] }], text: `${v}²`, said: `${v} ${tr(locale, "squared", "al cuadrado")}`, sub: `${x} × ${x}`, value: x * x, meaning: tr(locale, `${v}² means ${v} × ${v}.`, `${v}² significa ${v} × ${v}.`) };
    },
  ];
  const two: (() => EvalForm)[] = [
    () => {
      const a = r.int(2, 9), x = r.int(2, 12), b = r.int(1, 20);
      return { x, parts: [`${a}${v} + ${b}`], text: `${a}${v} + ${b}`, said: `${a} ${v} ${plus} ${b}`, sub: `${a} × ${x} + ${b}`, mid: `${a * x} + ${b}`, value: a * x + b, tip: tr(locale, "multiply before you add.", "multiplica antes de sumar.") };
    },
    () => {
      const a = r.int(2, 9), x = r.int(2, 12), b = r.int(1, a * x - 1);
      return { x, parts: [`${a}${v} − ${b}`], text: `${a}${v} − ${b}`, said: `${a} ${v} ${minus} ${b}`, sub: `${a} × ${x} − ${b}`, mid: `${a * x} − ${b}`, value: a * x - b, tip: tr(locale, "multiply before you subtract.", "multiplica antes de restar.") };
    },
    () => {
      const x = r.int(2, 10), b = r.int(1, 30);
      return { x, parts: [{ sup: [v, "2"] }, ` + ${b}`], text: `${v}² + ${b}`, said: `${v} ${tr(locale, "squared", "al cuadrado")} ${plus} ${b}`, sub: `${x}² + ${b}`, mid: `${x * x} + ${b}`, value: x * x + b, tip: tr(locale, "exponents come before addition.", "las potencias van antes que la suma.") };
    },
    () => {
      const x = r.int(3, 10), b = r.int(1, x * x - 1);
      return { x, parts: [{ sup: [v, "2"] }, ` − ${b}`], text: `${v}² − ${b}`, said: `${v} ${tr(locale, "squared", "al cuadrado")} ${minus} ${b}`, sub: `${x}² − ${b}`, mid: `${x * x} − ${b}`, value: x * x - b, tip: tr(locale, "exponents come before subtraction.", "las potencias van antes que la resta.") };
    },
    () => {
      const a = r.int(2, 9), x = r.int(1, 12), b = r.int(1, 9);
      return {
        x, parts: [`${a}(${v} + ${b})`], text: `${a}(${v} + ${b})`, said: tr(locale, `${a} times the quantity ${v} plus ${b}`, `${a} por la cantidad ${v} más ${b}`),
        sub: `${a}(${x} + ${b})`, mid: `${a} × ${x + b}`, value: a * (x + b), tip: tr(locale, "work inside the parentheses first.", "resuelve primero lo que está dentro del paréntesis."),
      };
    },
    () => {
      const a = r.int(2, 9), b = r.int(1, 9), x = b + r.int(1, 10);
      return {
        x, parts: [`${a}(${v} − ${b})`], text: `${a}(${v} − ${b})`, said: tr(locale, `${a} times the quantity ${v} minus ${b}`, `${a} por la cantidad ${v} menos ${b}`),
        sub: `${a}(${x} − ${b})`, mid: `${a} × ${x - b}`, value: a * (x - b), tip: tr(locale, "work inside the parentheses first.", "resuelve primero lo que está dentro del paréntesis."),
      };
    },
    () => {
      const a = r.int(2, 9), q = r.int(2, 10), b = r.int(1, 20), x = a * q;
      return { x, parts: [frac(v, a), ` + ${b}`], text: `${v}/${a} + ${b}`, said: `${v} ${over} ${a}, ${plus} ${b}`, sub: `${x} ÷ ${a} + ${b}`, mid: `${q} + ${b}`, value: q + b, tip: tr(locale, "divide before you add.", "divide antes de sumar.") };
    },
    () => {
      const a = r.int(2, 5), x = r.int(2, 8);
      return { x, parts: [String(a), { sup: [v, "2"] }], text: `${a}${v}²`, said: `${a} ${v} ${tr(locale, "squared", "al cuadrado")}`, sub: `${a} × ${x}²`, mid: `${a} × ${x * x}`, value: a * x * x, tip: tr(locale, "square first, then multiply.", "primero eleva al cuadrado y luego multiplica.") };
    },
    () => {
      const x = r.int(1, 8), b = r.int(1, 12 - x);
      return {
        x, parts: [{ sup: [`(${v} + ${b})`, "2"] }], text: `(${v} + ${b})²`, said: tr(locale, `the quantity ${v} plus ${b}, squared`, `la cantidad ${v} más ${b}, al cuadrado`),
        sub: `(${x} + ${b})²`, mid: `${x + b}²`, value: (x + b) ** 2, tip: tr(locale, "work inside the parentheses, then square.", "resuelve el paréntesis y luego eleva al cuadrado."),
      };
    },
  ];
  const f = r.pick(level === 1 ? one : two)();
  const base = {
    prompt: [`${tr(locale, "If", "Si")} ${v} = ${f.x}, `, ...f.parts, " = ", { blank: true }] as MathPart[],
    say: tr(locale, `If ${v} is ${f.x}, what is ${f.said}?`, `Si ${v} vale ${f.x}, ¿cuánto vale ${f.said}?`),
    input: "keypad" as const,
    answer: { kind: "number" as const, value: f.value },
  };
  const swap = tr(locale, `Replace ${v} with ${f.x}.`, `Cambia ${v} por ${f.x}.`);
  if (level === 1) return { ...base, hints: [swap, f.meaning!, `${f.text} = ${f.sub}`], steps: [`${f.text} = ${f.sub}`, `${f.sub} = ${f.value}`], seconds: 15 };
  return {
    ...base,
    hints: [swap, tr(locale, `Then use the order of operations: ${f.tip}`, `Luego sigue el orden de las operaciones: ${f.tip}`), `${f.sub} = ${f.mid}`],
    steps: [`${f.text} = ${f.sub}`, `= ${f.mid}`, `= ${f.value}`],
    seconds: 30,
  };
}

// ---------- m.eq.onestep ----------

function eqOneStep(r: Rng, level: number, locale: Locale): ItemBody {
  const v = r.pick(VARS);
  const equals = tr(locale, "equals", "es igual a"), plus = tr(locale, "plus", "más"), minus = tr(locale, "minus", "menos");
  const undo = {
    add: (a: number) => [tr(locale, `${a} is added to ${v}. What undoes adding ${a}?`, `A ${v} se le suma ${a}. ¿Qué deshace sumar ${a}?`), tr(locale, `Subtract ${a} from both sides.`, `Resta ${a} en ambos lados.`)],
    sub: (a: number) => [tr(locale, `${a} is subtracted from ${v}. What undoes subtracting ${a}?`, `A ${v} se le resta ${a}. ¿Qué deshace restar ${a}?`), tr(locale, `Add ${a} to both sides.`, `Suma ${a} en ambos lados.`)],
    mul: (a: number) => [tr(locale, `${v} is multiplied by ${a}. What undoes multiplying by ${a}?`, `${v} se multiplica por ${a}. ¿Qué deshace multiplicar por ${a}?`), tr(locale, `Divide both sides by ${a}.`, `Divide ambos lados entre ${a}.`)],
    div: (a: number) => [tr(locale, `${v} is divided by ${a}. What undoes dividing by ${a}?`, `${v} se divide entre ${a}. ¿Qué deshace dividir entre ${a}?`), tr(locale, `Multiply both sides by ${a}.`, `Multiplica ambos lados por ${a}.`)],
  };
  type Form = { x: number; parts: MathPart[]; said: string; ladder: string[]; line: string; check: string };
  const forms: (() => Form)[] =
    level === 1
      ? [
          () => {
            const x = r.int(1, 40), a = r.int(2, 30), b = x + a;
            return { x, parts: [`${v} + ${a} = ${b}`], said: `${v} ${plus} ${a} ${equals} ${b}`, ladder: undo.add(a), line: `${v} + ${a} − ${a} = ${b} − ${a}`, check: `${x} + ${a} = ${b}` };
          },
          () => {
            const x = r.int(1, 40), a = r.int(2, 30), b = x + a;
            return { x, parts: [`${a} + ${v} = ${b}`], said: `${a} ${plus} ${v} ${equals} ${b}`, ladder: undo.add(a), line: `${a} + ${v} − ${a} = ${b} − ${a}`, check: `${a} + ${x} = ${b}` };
          },
          () => {
            const a = r.int(2, 30), b = r.int(1, 40), x = a + b;
            return { x, parts: [`${v} − ${a} = ${b}`], said: `${v} ${minus} ${a} ${equals} ${b}`, ladder: undo.sub(a), line: `${v} − ${a} + ${a} = ${b} + ${a}`, check: `${x} − ${a} = ${b}` };
          },
          () => {
            const x = r.int(1, 40), a = r.int(2, 30), b = x + a;
            return { x, parts: [`${b} = ${v} + ${a}`], said: `${b} ${equals} ${v} ${plus} ${a}`, ladder: undo.add(a), line: `${b} − ${a} = ${v} + ${a} − ${a}`, check: `${b} = ${x} + ${a}` };
          },
        ]
      : [
          () => {
            const a = r.int(2, 12), x = r.int(2, 15), b = a * x;
            return { x, parts: [`${a}${v} = ${b}`], said: `${a} ${v} ${equals} ${b}`, ladder: undo.mul(a), line: `${a}${v} ÷ ${a} = ${b} ÷ ${a}`, check: `${a} × ${x} = ${b}` };
          },
          () => {
            const a = r.int(2, 10), b = r.int(2, 12), x = a * b;
            return { x, parts: [frac(v, a), ` = ${b}`], said: `${v} ${tr(locale, "divided by", "dividido entre")} ${a} ${equals} ${b}`, ladder: undo.div(a), line: `${v}/${a} × ${a} = ${b} × ${a}`, check: `${x} ÷ ${a} = ${b}` };
          },
          () => {
            const a = r.int(2, 12), x = r.int(2, 15), b = a * x;
            return { x, parts: [`${b} = ${a}${v}`], said: `${b} ${equals} ${a} ${v}`, ladder: undo.mul(a), line: `${b} ÷ ${a} = ${a}${v} ÷ ${a}`, check: `${b} = ${a} × ${x}` };
          },
        ];
  const f = r.pick(forms)();
  return {
    prompt: [tr(locale, "Solve: ", "Resuelve: "), ...f.parts],
    say: `${tr(locale, "Solve", "Resuelve")} ${f.said}.`,
    input: "keypad",
    answer: { kind: "number", value: f.x },
    hints: [f.ladder[0], f.ladder[1], f.line],
    steps: [f.line, `${tr(locale, "Check", "Comprueba")}: ${f.check}`, `${v} = ${f.x}`],
    seconds: level === 1 ? 15 : 20,
  };
}

// ---------- m.area.poly ----------

function areaPoly(r: Rng, level: number, locale: Locale): ItemBody {
  const u = r.pick(UNITS);
  const { ab, len, sq } = unitWords(u, locale);
  if (level === 1) {
    const b = r.int(3, 20);
    let h = r.int(2, 14);
    if ((b * h) % 2) h = h === 14 ? 12 : h + 1;
    const text = (s: boolean) =>
      tr(locale, `The triangle has a base of ${len(b, s)} and a height of ${len(h, s)}. Find its area in ${sq}.`, `El triángulo tiene una base de ${len(b, s)} y una altura de ${len(h, s)}. Halla su área en ${sq}.`);
    return {
      prompt: [text(false)],
      say: text(true),
      visual: { kind: "triangle", base: b, height: h, unit: ab },
      alt: tr(
        locale,
        `A triangle with a base of ${b} ${ab} along the bottom and a dashed height of ${h} ${ab} from the base up to the top corner.`,
        `Un triángulo con una base de ${b} ${ab} abajo y una altura punteada de ${h} ${ab} desde la base hasta el vértice de arriba.`,
      ),
      input: "keypad",
      answer: { kind: "number", value: (b * h) / 2 },
      hints: [
        tr(locale, "A triangle is half of a rectangle with the same base and height.", "Un triángulo es la mitad de un rectángulo con la misma base y altura."),
        tr(locale, "Area = 1/2 × base × height.", "Área = 1/2 × base × altura."),
        tr(locale, `The rectangle would be ${b} × ${h} = ${b * h}.`, `El rectángulo sería ${b} × ${h} = ${b * h}.`),
      ],
      steps: [`A = 1/2 × ${b} × ${h}`, `= 1/2 × ${b * h}`, `= ${(b * h) / 2} ${ab}²`],
      seconds: 30,
    };
  }
  const shape = r.int(0, 9);
  const area = tr(locale, "Area", "Área");
  if (shape < 3) {
    // Parallelogram, with the slanted side given as a distractor.
    const b = r.int(4, 18), h = r.int(2, 12), s = h + r.int(1, 4);
    const text = (sp: boolean) =>
      tr(
        locale,
        `A parallelogram has a base of ${len(b, sp)}, a slanted side of ${len(s, sp)}, and a height of ${len(h, sp)}. Find its area in ${sq}.`,
        `Un paralelogramo tiene una base de ${len(b, sp)}, un lado inclinado de ${len(s, sp)} y una altura de ${len(h, sp)}. Halla su área en ${sq}.`,
      );
    return {
      prompt: [text(false)],
      say: text(true),
      input: "keypad",
      answer: { kind: "number", value: b * h },
      hints: [
        tr(locale, "Cut a triangle off one end and slide it to the other end. What shape do you get?", "Corta un triángulo de un extremo y muévelo al otro extremo. ¿Qué figura obtienes?"),
        tr(locale, "Area = base × height. The slanted side is not the height.", "Área = base × altura. El lado inclinado no es la altura."),
        tr(locale, `The rectangle is ${b} ${ab} by ${h} ${ab}.`, `El rectángulo mide ${b} ${ab} por ${h} ${ab}.`),
      ],
      steps: [tr(locale, `${area} = base × height`, `${area} = base × altura`), `= ${b} × ${h}`, `= ${b * h} ${ab}²`],
      seconds: 45,
    };
  }
  if (shape < 6) {
    const b1 = r.int(3, 12), b2 = b1 + r.int(2, 8);
    let h = r.int(3, 10); // with a height of 2 the first step, b1 + b2, would already be the answer
    if (((b1 + b2) * h) % 2) h = h === 10 ? 8 : h + 1;
    const text = (sp: boolean) =>
      tr(
        locale,
        `A trapezoid has parallel sides of ${len(b1, sp)} and ${len(b2, sp)}. The height between them is ${len(h, sp)}. Find its area in ${sq}.`,
        `Un trapecio tiene lados paralelos de ${len(b1, sp)} y ${len(b2, sp)}. La altura entre ellos es de ${len(h, sp)}. Halla su área en ${sq}.`,
      );
    return {
      prompt: [text(false)],
      say: text(true),
      input: "keypad",
      answer: { kind: "number", value: ((b1 + b2) * h) / 2 },
      hints: [
        tr(locale, "Two copies of this trapezoid, one flipped, fit together into a parallelogram.", "Dos copias de este trapecio, una volteada, forman un paralelogramo."),
        tr(locale, "Area = 1/2 × (base 1 + base 2) × height.", "Área = 1/2 × (base 1 + base 2) × altura."),
        `${b1} + ${b2} = ${b1 + b2}`,
      ],
      steps: [`A = 1/2 × (${b1} + ${b2}) × ${h}`, `= 1/2 × ${b1 + b2} × ${h}`, `= ${((b1 + b2) * h) / 2} ${ab}²`],
      seconds: 50,
    };
  }
  if (shape < 8) {
    // A house shape: a rectangle with a triangle on top.
    const w = r.int(4, 14), h1 = r.int(3, 10);
    let h2 = r.int(2, 8);
    if ((w * h2) % 2) h2 = h2 === 8 ? 6 : h2 + 1;
    const R = w * h1, T = (w * h2) / 2;
    const text = (sp: boolean) =>
      tr(
        locale,
        `A shape is a rectangle ${len(w, sp)} wide and ${len(h1, sp)} tall with a triangle on top. The triangle's base is the top of the rectangle, and its height is ${len(h2, sp)}. Find the total area in ${sq}.`,
        `Una figura es un rectángulo de ${len(w, sp)} de ancho y ${len(h1, sp)} de alto con un triángulo encima. La base del triángulo es el lado de arriba del rectángulo y su altura es de ${len(h2, sp)}. Halla el área total en ${sq}.`,
      );
    return {
      prompt: [text(false)],
      say: text(true),
      input: "keypad",
      answer: { kind: "number", value: R + T },
      hints: [
        tr(locale, "Split the shape into a rectangle and a triangle.", "Divide la figura en un rectángulo y un triángulo."),
        tr(locale, "Find each area, then add them.", "Calcula cada área y luego súmalas."),
        tr(locale, `Rectangle: ${w} × ${h1} = ${R}.`, `Rectángulo: ${w} × ${h1} = ${R}.`),
      ],
      steps: [tr(locale, `Rectangle: ${w} × ${h1} = ${R}`, `Rectángulo: ${w} × ${h1} = ${R}`), tr(locale, `Triangle: 1/2 × ${w} × ${h2} = ${T}`, `Triángulo: 1/2 × ${w} × ${h2} = ${T}`), `${R} + ${T} = ${R + T} ${ab}²`],
      seconds: 60,
    };
  }
  // A rectangle with a corner cut out.
  const W = r.int(6, 16), H = r.int(5, 12), cw = r.int(2, W - 2), ch = r.int(2, H - 2);
  const text = (sp: boolean) =>
    tr(
      locale,
      `A rectangle ${len(W, sp)} by ${len(H, sp)} has a ${len(cw, sp)} by ${len(ch, sp)} rectangle cut out of one corner. Find the area of the shape that is left, in ${sq}.`,
      `A un rectángulo de ${len(W, sp)} por ${len(H, sp)} se le quita un rectángulo de ${len(cw, sp)} por ${len(ch, sp)} en una esquina. Halla el área de la figura que queda, en ${sq}.`,
    );
  return {
    prompt: [text(false)],
    say: text(true),
    input: "keypad",
    answer: { kind: "number", value: W * H - cw * ch },
    hints: [
      tr(locale, "Think of the full rectangle, then take away the missing corner.", "Piensa en el rectángulo completo y luego quita la esquina que falta."),
      tr(locale, "Area of the big rectangle − area of the cut-out.", "Área del rectángulo grande − área del recorte."),
      tr(locale, `Big rectangle: ${W} × ${H} = ${W * H}.`, `Rectángulo grande: ${W} × ${H} = ${W * H}.`),
    ],
    steps: [tr(locale, `Big rectangle: ${W} × ${H} = ${W * H}`, `Rectángulo grande: ${W} × ${H} = ${W * H}`), tr(locale, `Cut-out: ${cw} × ${ch} = ${cw * ch}`, `Recorte: ${cw} × ${ch} = ${cw * ch}`), `${W * H} − ${cw * ch} = ${W * H - cw * ch} ${ab}²`],
    seconds: 50,
  };
}

// ---------- m.int.addsub ----------

function intAddSub(r: Rng, level: number, locale: Locale): ItemBody {
  const dir = (n: number) => (n > 0 ? tr(locale, "right", "derecha") : tr(locale, "left", "izquierda"));
  const move = (from: number, by: number) => tr(locale, `Start at ${show(from)} and move ${Math.abs(by)} to the ${dir(by)}.`, `Empieza en ${show(from)} y muévete ${Math.abs(by)} a la ${dir(by)}.`);
  if (level === 1) {
    let a: number, b: number;
    do {
      a = nonzero(r, -20, 20);
      b = nonzero(r, -20, 20);
    } while ((a > 0 && b > 0) || Math.abs(a + b) > 20);
    const sum = a + b, expr = `${show(a)} + ${par(b)}`;
    const differ = a > 0 !== b > 0;
    const small = Math.min(Math.abs(a), Math.abs(b)), big = Math.max(Math.abs(a), Math.abs(b));
    const rest = big - small, neg = sum < 0;
    const left =
      sum === 0
        ? tr(locale, "Nothing is left over.", "No sobra nada.")
        : rest === 1
          ? tr(locale, `1 ${neg ? "negative" : "positive"} is left over.`, `Sobra 1 ${neg ? "negativo" : "positivo"}.`)
          : tr(locale, `${rest} ${neg ? "negatives" : "positives"} are left over.`, `Sobran ${rest} ${neg ? "negativos" : "positivos"}.`);
    return {
      prompt: [`${expr} = `, { blank: true }],
      say: tr(locale, `${sayInt(a, locale)} plus ${sayInt(b, locale)}`, `${sayInt(a, locale)} más ${sayInt(b, locale)}`),
      visual: { kind: "number-line", min: -20, max: 20, marks: [-20, -15, -10, -5, 0, 5, 10, 15, 20], marker: a },
      alt: tr(locale, `A number line from −20 to 20 with a dot at ${show(a)}.`, `Una recta numérica de −20 a 20 con un punto en ${show(a)}.`),
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: sum },
      hints: differ
        ? [
            tr(locale, "One number is positive and one is negative. Which one is farther from 0?", "Un número es positivo y el otro negativo. ¿Cuál está más lejos del 0?"),
            tr(locale, "Make zero pairs: each 1 and −1 together make 0. What is left over is the answer.", "Forma pares cero: cada 1 con un −1 suman 0. Lo que sobra es la respuesta."),
            move(a, b),
          ]
        : [
            tr(locale, "Both numbers are negative. Will the sum be positive or negative?", "Los dos números son negativos. ¿La suma será positiva o negativa?"),
            tr(locale, "Adding a negative number moves you left on the number line.", "Sumar un número negativo te mueve a la izquierda en la recta numérica."),
            move(a, b),
          ],
      steps: differ
        ? [
            tr(locale, `${small} zero pairs make 0.`, `${small} pares cero suman 0.`),
            left,
            `${expr} = ${show(sum)}`,
          ]
        : [tr(locale, `Both are negative, so add the distances from 0: ${-a} + ${-b} = ${-sum}.`, `Los dos son negativos: suma las distancias al 0: ${-a} + ${-b} = ${-sum}.`), `${expr} = ${show(sum)}`],
      seconds: 15,
    };
  }
  if (r.bool(0.25)) {
    const hi = r.int(1, 25), lo = -r.int(1, 15), drop = hi - lo;
    return {
      prompt: [tr(locale, `At noon the temperature was ${hi}°F. By midnight it was ${show(lo)}°F. How many degrees did the temperature drop?`, `Al mediodía la temperatura era de ${hi} °F. A la medianoche era de ${show(lo)} °F. ¿Cuántos grados bajó la temperatura?`)],
      say: tr(
        locale,
        `At noon the temperature was ${hi} degrees. By midnight it was ${sayInt(lo, locale)} degrees. How many degrees did the temperature drop?`,
        `Al mediodía la temperatura era de ${hi} grados. A la medianoche era de ${sayInt(lo, locale)} grados. ¿Cuántos grados bajó la temperatura?`,
      ),
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: drop },
      hints: [
        tr(locale, `The drop is the distance from ${hi}°F down to ${show(lo)}°F.`, `La bajada es la distancia de ${hi} °F hasta ${show(lo)} °F.`),
        tr(locale, `Subtract: ${hi} − (${show(lo)}). Subtracting a negative is the same as adding its opposite.`, `Resta: ${hi} − (${show(lo)}). Restar un negativo es lo mismo que sumar su opuesto.`),
        `${hi} − (${show(lo)}) = ${hi} + ${-lo}`,
      ],
      steps: [`${hi} − (${show(lo)}) = ${hi} + ${-lo}`, `= ${drop}`, tr(locale, `The temperature dropped ${drop}°F.`, `La temperatura bajó ${drop} °F.`)],
      seconds: 45,
    };
  }
  const form = r.int(0, 9);
  let a: number, b: number;
  if (form < 5) {
    a = nonzero(r, -15, 15);
    b = -r.int(1, 15);
  } else if (form < 8) {
    a = -r.int(1, 15);
    b = r.int(1, 15);
  } else {
    a = r.int(1, 10);
    b = r.int(a + 1, 20);
  }
  const diff = a - b, expr = `${show(a)} − ${par(b)}`;
  return {
    prompt: [`${expr} = `, { blank: true }],
    say: tr(locale, `${sayInt(a, locale)} minus ${sayInt(b, locale)}`, `${sayInt(a, locale)} menos ${sayInt(b, locale)}`),
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value: diff },
    hints: [
      tr(locale, `What is the opposite of ${show(b)}?`, `¿Cuál es el opuesto de ${show(b)}?`),
      tr(locale, "Subtracting a number is the same as adding its opposite.", "Restar un número es lo mismo que sumar su opuesto."),
      `${expr} = ${show(a)} + ${par(-b)}`,
    ],
    steps: [`${expr} = ${show(a)} + ${par(-b)}`, move(a, -b), `${expr} = ${show(diff)}`],
    seconds: 20,
  };
}

// ---------- m.int.multdiv ----------

function intMultDiv(r: Rng, _level: number, locale: Locale): ItemBody {
  let a: number, b: number;
  do {
    a = r.int(-12, 12);
    b = r.int(-12, 12);
  } while (Math.abs(a) < 2 || Math.abs(b) < 2 || (a > 0 && b > 0));
  const div = r.bool(0.45);
  const [x, y, ans] = div ? [a * b, b, a] : [a, b, a * b];
  const op = div ? "÷" : "×";
  const expr = `${show(x)} ${op} ${par(y)}`;
  const same = x > 0 === y > 0;
  const signLine = same
    ? tr(locale, "The signs are the same, so the answer is positive.", "Los signos son iguales, así que la respuesta es positiva.")
    : tr(locale, "The signs are different, so the answer is negative.", "Los signos son diferentes, así que la respuesta es negativa.");
  return {
    prompt: [`${expr} = `, { blank: true }],
    say: div
      ? tr(locale, `${sayInt(x, locale)} divided by ${sayInt(y, locale)}`, `${sayInt(x, locale)} dividido entre ${sayInt(y, locale)}`)
      : tr(locale, `${sayInt(x, locale)} times ${sayInt(y, locale)}`, `${sayInt(x, locale)} por ${sayInt(y, locale)}`),
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value: ans },
    hints: [
      tr(locale, "Count the negative signs.", "Cuenta los signos negativos."),
      div
        ? tr(locale, "Divide without the signs, then choose the sign: same signs give a positive answer, different signs give a negative one.", "Divide sin los signos y luego elige el signo: signos iguales dan positivo, signos diferentes dan negativo.")
        : tr(locale, "Multiply without the signs, then choose the sign: same signs give a positive answer, different signs give a negative one.", "Multiplica sin los signos y luego elige el signo: signos iguales dan positivo, signos diferentes dan negativo."),
      signLine,
    ],
    steps: [`${Math.abs(x)} ${op} ${Math.abs(y)} = ${Math.abs(ans)}`, signLine, `${expr} = ${show(ans)}`],
    seconds: 12,
  };
}

// ---------- m.expr.simplify ----------

function exprSimplify(r: Rng, level: number, locale: Locale): ItemBody {
  const v = r.pick(VARS);
  const simplify = tr(locale, "Simplify: ", "Simplifica: ");
  if (level === 1) {
    let c1: number, c2: number, k1: number, k2: number;
    do {
      c1 = r.int(1, 9);
      c2 = nonzero(r, -9, 9);
      k1 = nonzero(r, -12, 12);
      k2 = nonzero(r, -12, 12);
    } while (c1 + c2 === 0 || k1 + k2 === 0); // a zero constant would make hint 3 the whole answer
    const list = r.shuffle<Term>([[c1, v], [c2, v], [k1, ""], [k2, ""]]);
    const xs = list.filter((t) => t[1]), ks = list.filter((t) => !t[1]);
    const cx = c1 + c2, k = k1 + k2;
    const ans = terms([[cx, v], [k, ""]]);
    return {
      prompt: [simplify, terms(list)],
      say: `${tr(locale, "Simplify", "Simplifica")} ${sayTerms(list, locale)}.`,
      input: "expr",
      answer: { kind: "expr", expr: ans, form: "expanded" },
      hints: [
        tr(locale, `Like terms have the same variable part. Which terms have ${v}?`, `Los términos semejantes tienen la misma parte variable. ¿Qué términos tienen ${v}?`),
        tr(locale, `Combine the ${v}-terms, then combine the numbers.`, `Combina los términos con ${v} y luego combina los números.`),
        `${terms(xs)} = ${terms([[cx, v]])}`,
      ],
      steps: [`${terms(xs)} = ${terms([[cx, v]])}`, `${terms(ks)} = ${show(k)}`, ans],
      seconds: 40,
    };
  }
  const form = r.int(0, 2);
  const a = r.int(2, 6), b = r.int(1, 5), c = nonzero(r, -9, 9);
  const inner = terms([[b, v], [c, ""]]);
  let d: number, e: number;
  do {
    d = form === 2 ? r.int(1, 12) : nonzero(r, -9, 9);
    e = form === 1 || r.bool(0.4) ? nonzero(r, -12, 12) : 0;
  } while ((form === 0 && a * b + d === 0) || (form === 2 && d === a * b));
  const lead = form === 2 ? -a : a;
  const dist = terms([[lead * b, v], [lead * c, ""]]);
  const tail = terms([[form === 1 ? 0 : d, v], [e, ""]]);
  const rest: Term[] = [[form === 1 ? 0 : d, v], [e, ""]];
  const restText = rest.some(([k]) => k !== 0) ? tail : "";
  // How the tail reads after the parentheses: "+ 4x − 5".
  const after = restText ? ` ${restText.startsWith("−") ? `− ${restText.slice(1)}` : `+ ${restText}`}` : "";
  const shown = form === 2 ? `${terms([[d, v]])} − ${a}(${inner})${e ? ` ${e < 0 ? "−" : "+"} ${Math.abs(e)}` : ""}` : `${a}(${inner})${after}`;
  const expanded = form === 2 ? terms([[d, v], [-a * b, v], [-a * c, ""], [e, ""]]) : terms([[a * b, v], [a * c, ""], ...rest]);
  const cx = form === 2 ? d - a * b : a * b + (form === 1 ? 0 : d);
  const k = lead * c + e;
  const ans = terms([[cx, v], [k, ""]]);
  const quantity = tr(locale, "times the quantity", "por la cantidad");
  const said =
    form === 2
      ? `${sayTerms([[d, v]], locale)} ${tr(locale, "minus", "menos")} ${a} ${quantity} ${sayTerms([[b, v], [c, ""]], locale)}${e ? `, ${sayTerms([[e, ""]], locale, true)}` : ""}`
      : `${a} ${quantity} ${sayTerms([[b, v], [c, ""]], locale)}${restText ? `, ${sayTerms(rest, locale, true)}` : ""}`;
  return {
    prompt: [simplify, shown],
    say: `${tr(locale, "Simplify", "Simplifica")} ${said}.`,
    input: "expr",
    answer: { kind: "expr", expr: ans, form: "expanded" },
    hints: [
      form === 2
        ? tr(locale, `The −${a} multiplies every term inside the parentheses, signs included.`, `El −${a} multiplica cada término dentro del paréntesis, incluidos los signos.`)
        : tr(locale, `The ${a} multiplies every term inside the parentheses.`, `El ${a} multiplica cada término dentro del paréntesis.`),
      tr(locale, "Distribute first, then combine like terms.", "Primero aplica la propiedad distributiva y luego combina los términos semejantes."),
      `${form === 2 ? `−${a}` : a}(${inner}) = ${dist}`,
    ],
    steps: [`${form === 2 ? `−${a}` : a}(${inner}) = ${dist}`, expanded, `= ${ans}`],
    seconds: 60,
  };
}

// ---------- m.eq.twostep ----------

function eqTwoStep(r: Rng, level: number, locale: Locale): ItemBody {
  const v = r.pick(VARS);
  const equals = tr(locale, "equals", "es igual a");
  const undo = (b: number) => (b > 0 ? tr(locale, `subtract ${b} from both sides`, `resta ${b} en ambos lados`) : tr(locale, `add ${-b} to both sides`, `suma ${-b} en ambos lados`));
  const did = (b: number) => (b > 0 ? tr(locale, `${b} is added`, `se suma ${b}`) : tr(locale, `${-b} is subtracted`, `se resta ${-b}`));
  const first = tr(locale, "Which step do you undo first?", "¿Qué paso deshaces primero?");
  // Level 1: a·x + b, a·x − b, x/a + b, all positive. Level 2: a·x + b, p(x + q), x/a + b, each with a
  // negative coefficient, a negative solution or a negative right-hand side.
  const form = r.int(0, 2);
  if (form === 0 || (level === 1 && form === 1)) {
    // a·x + b = c
    let a: number, x: number, b: number;
    if (level === 1) {
      a = r.int(2, 9);
      x = r.int(1, 12);
      b = form === 0 ? r.int(1, 20) : -r.int(1, a * x - 1);
    } else
      do {
        a = r.int(2, 9) * (r.bool(0.4) ? -1 : 1);
        x = nonzero(r, -12, 12);
        b = nonzero(r, -20, 20);
      } while (a > 0 && x > 0 && a * x + b >= 0);
    const c = a * x + b, ax = terms([[a, v]]);
    return {
      prompt: [tr(locale, "Solve: ", "Resuelve: "), `${terms([[a, v], [b, ""]])} = ${show(c)}`],
      say: `${tr(locale, "Solve", "Resuelve")} ${sayTerms([[a, v], [b, ""]], locale)} ${equals} ${sayInt(c, locale)}.`,
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: x },
      hints: [
        tr(locale, `${v} is multiplied by ${show(a)}, then ${did(b)}. ${first}`, `${v} se multiplica por ${show(a)} y luego ${did(b)}. ${first}`),
        tr(locale, `Undo in reverse order: ${undo(b)}, then divide both sides by ${show(a)}.`, `Deshaz en orden inverso: ${undo(b)} y luego divide ambos lados entre ${show(a)}.`),
        `${cap(undo(b))}: ${ax} = ${show(c - b)}.`,
      ],
      steps: [`${cap(undo(b))}: ${ax} = ${show(c - b)}`, `${tr(locale, "Divide both sides by", "Divide ambos lados entre")} ${show(a)}: ${v} = ${show(c - b)} ÷ ${par(a)}`, `${v} = ${show(x)}`],
      seconds: level === 1 ? 40 : 60,
    };
  }
  if (form === 1) {
    // p(x + q) = c, level 2 only
    const p = r.int(2, 6) * (r.bool(0.3) ? -1 : 1);
    const q = nonzero(r, -9, 9);
    let x: number;
    do x = nonzero(r, -12, 12);
    while (x + q === 0 || (p > 0 && x > 0 && x + q > 0));
    const c = p * (x + q), inner = terms([[1, v], [q, ""]]);
    const back = q > 0 ? tr(locale, `subtract ${q}`, `resta ${q}`) : tr(locale, `add ${-q}`, `suma ${-q}`);
    return {
      prompt: [tr(locale, "Solve: ", "Resuelve: "), `${show(p)}(${inner}) = ${show(c)}`],
      say: `${tr(locale, "Solve", "Resuelve")} ${sayInt(p, locale)} ${tr(locale, "times the quantity", "por la cantidad")} ${sayTerms([[1, v], [q, ""]], locale)}, ${equals} ${sayInt(c, locale)}.`,
      input: "keypad",
      keys: ["-"],
      answer: { kind: "number", value: x },
      hints: [
        q > 0
          ? tr(locale, `First ${q} is added to ${v}, then the result is multiplied by ${show(p)}. ${first}`, `Primero a ${v} se le suma ${q} y luego el resultado se multiplica por ${show(p)}. ${first}`)
          : tr(locale, `First ${-q} is subtracted from ${v}, then the result is multiplied by ${show(p)}. ${first}`, `Primero a ${v} se le resta ${-q} y luego el resultado se multiplica por ${show(p)}. ${first}`),
        tr(locale, `Undo in reverse order: divide both sides by ${show(p)}, then ${back} on both sides.`, `Deshaz en orden inverso: divide ambos lados entre ${show(p)} y luego ${back} en ambos lados.`),
        tr(locale, `Divide both sides by ${show(p)}: ${inner} = ${show(c / p)}.`, `Divide ambos lados entre ${show(p)}: ${inner} = ${show(c / p)}.`),
      ],
      steps: [
        tr(locale, `Divide both sides by ${show(p)}: ${inner} = ${show(c / p)}`, `Divide ambos lados entre ${show(p)}: ${inner} = ${show(c / p)}`),
        `${cap(back)}: ${v} = ${show(c / p)} ${q > 0 ? "−" : "+"} ${Math.abs(q)}`,
        `${v} = ${show(x)}`,
      ],
      seconds: 60,
    };
  }
  // x/a + b = c
  const a = r.int(2, level === 1 ? 6 : 5);
  let q: number, b: number;
  if (level === 1) {
    q = r.int(1, 10);
    b = r.int(1, 15);
  } else
    do {
      q = nonzero(r, -8, 8);
      b = nonzero(r, -15, 15);
    } while (q > 0 && q + b >= 0);
  const x = a * q, c = q + b;
  return {
    prompt: [tr(locale, "Solve: ", "Resuelve: "), frac(v, a), ` ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${show(c)}`],
    say: `${tr(locale, "Solve", "Resuelve")} ${v} ${tr(locale, "divided by", "dividido entre")} ${a}, ${sayTerms([[b, ""]], locale, true)}, ${equals} ${sayInt(c, locale)}.`,
    input: "keypad",
    keys: ["-"],
    answer: { kind: "number", value: x },
    hints: [
      tr(locale, `${v} is divided by ${a}, then ${did(b)}. ${first}`, `${v} se divide entre ${a} y luego ${did(b)}. ${first}`),
      tr(locale, `Undo in reverse order: ${undo(b)}, then multiply both sides by ${a}.`, `Deshaz en orden inverso: ${undo(b)} y luego multiplica ambos lados por ${a}.`),
      `${cap(undo(b))}: ${v}/${a} = ${show(c - b)}.`,
    ],
    steps: [`${cap(undo(b))}: ${v}/${a} = ${show(c - b)}`, `${tr(locale, "Multiply both sides by", "Multiplica ambos lados por")} ${a}: ${v} = ${show(c - b)} × ${a}`, `${v} = ${show(x)}`],
    seconds: level === 1 ? 40 : 60,
  };
}

// ---------- m.proportion ----------

type PropStory = { p: [number, number]; q: [number, number]; en: (who: string, A: number, B: number, C: number) => string; es: (who: string, A: number, B: number, C: number) => string; unit: [string, string] };
// In every story the third number has the same units as the first, and the answer has the units of the second.
const PROP_STORIES: PropStory[] = [
  {
    p: [1, 3], q: [5, 25],
    en: (_, A, B, C) => `On a map, ${A} inches stand for ${B} miles. How many miles do ${C} inches stand for?`,
    es: (_, A, B, C) => `En un mapa, ${A} pulgadas representan ${B} millas. ¿Cuántas millas representan ${C} pulgadas?`,
    unit: ["miles", "millas"],
  },
  {
    p: [2, 4], q: [1, 3],
    en: (_, A, B, C) => `For every ${A} people, a recipe uses ${B} cups of rice. How many cups of rice are needed for ${C} people?`,
    es: (_, A, B, C) => `Por cada ${A} personas, una receta usa ${B} tazas de arroz. ¿Cuántas tazas de arroz se necesitan para ${C} personas?`,
    unit: ["cups of rice", "tazas de arroz"],
  },
  {
    p: [20, 35], q: [1, 1],
    en: (_, A, B, C) => `A car goes ${A} miles on ${B} gallons of gas. How many gallons does it need to go ${C} miles?`,
    es: (_, A, B, C) => `Un carro recorre ${A} millas con ${B} galones de gasolina. ¿Cuántos galones necesita para recorrer ${C} millas?`,
    unit: ["gallons", "galones"],
  },
  {
    p: [1, 3], q: [9, 18],
    en: (who, A, B, C) => `For ${A} hours of work, ${who} earns $${B}. How much does ${who} earn for ${C} hours, in dollars?`,
    es: (who, A, B, C) => `Por ${A} horas de trabajo, ${who} gana $${B}. ¿Cuánto gana por ${C} horas, en dólares?`,
    unit: ["dollars", "dólares"],
  },
  {
    p: [1, 2], q: [1, 5],
    en: (_, A, B, C) => `In a scale drawing, ${A} centimeters stand for ${B} meters. A wall is ${C} centimeters long in the drawing. How long is the real wall, in meters?`,
    es: (_, A, B, C) => `En un dibujo a escala, ${A} centímetros representan ${B} metros. Una pared mide ${C} centímetros en el dibujo. ¿Cuánto mide la pared real, en metros?`,
    unit: ["meters", "metros"],
  },
];

function proportion(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    let p: number, q: number, m: number, n: number;
    do {
      p = r.int(1, 9);
      q = r.int(2, 9);
    } while (p === q || gcd(p, q) !== 1);
    do {
      m = r.int(1, 6);
      n = r.int(2, 9);
    } while (gcd(m, n) !== 1 || m * p < 2); // every shown number is at least 2, so no step reads "1 × x"
    const vals = [m * p, m * q, n * p, n * q];
    const hide = r.int(0, 3);
    const shown = vals.map((x, i) => (i === hide ? "x" : String(x)));
    // x times its partner across the diagonal equals the other diagonal's product.
    const partner = vals[3 - hide];
    const [k1, k2] = hide === 0 || hide === 3 ? [vals[1], vals[2]] : [vals[0], vals[3]];
    const sayRatio = (a: string, b: string) => `${a} ${tr(locale, "over", "sobre")} ${b}`;
    return {
      prompt: [tr(locale, "Solve for x: ", "Halla el valor de x: "), frac(shown[0], shown[1]), " = ", frac(shown[2], shown[3])],
      say: tr(locale, `Solve for x: ${sayRatio(shown[0], shown[1])} equals ${sayRatio(shown[2], shown[3])}.`, `Halla el valor de x: ${sayRatio(shown[0], shown[1])} es igual a ${sayRatio(shown[2], shown[3])}.`),
      input: "keypad",
      answer: { kind: "number", value: vals[hide] },
      hints: [
        tr(locale, "In a proportion, the cross products are equal.", "En una proporción, los productos cruzados son iguales."),
        tr(locale, "Multiply across, then divide both sides by the number that multiplies x.", "Multiplica en cruz y luego divide ambos lados entre el número que multiplica a x."),
        `${partner} × x = ${k1} × ${k2} = ${k1 * k2}`,
      ],
      steps: [`${partner} × x = ${k1} × ${k2}`, `${partner}x = ${k1 * k2}`, `x = ${k1 * k2} ÷ ${partner} = ${vals[hide]}`],
      seconds: 40,
    };
  }
  const story = r.pick(PROP_STORIES);
  const who = r.pick(NAMES);
  let p: number, q: number, m: number, n: number;
  do {
    p = r.int(...story.p);
    q = r.int(...story.q);
  } while (gcd(p, q) !== 1);
  do {
    m = r.int(2, 4);
    n = r.int(1, 9);
  } while (gcd(m, n) !== 1 || n * p < 2 || n * q < 2);
  const A = m * p, B = m * q, C = n * p, want = n * q;
  const question = tr(locale, story.en(who, A, B, C), story.es(who, A, B, C));
  return {
    prompt: [question],
    say: spoken(question, locale),
    input: "keypad",
    answer: { kind: "number", value: want },
    hints: [
      tr(locale, "Write two equal ratios, with matching units in the same places.", "Escribe dos razones iguales, con las mismas unidades en los mismos lugares."),
      tr(locale, `${A}/${B} = ${C}/x. Cross-multiply, then divide.`, `${A}/${B} = ${C}/x. Multiplica en cruz y luego divide.`),
      `${A} × x = ${B} × ${C} = ${B * C}`,
    ],
    steps: [`${A}/${B} = ${C}/x`, `${A}x = ${B} × ${C} = ${B * C}`, `x = ${B * C} ÷ ${A} = ${want}`, `${want} ${tr(locale, story.unit[0], story.unit[1])}`],
    seconds: 60,
  };
}

// ---------- m.percent.change ----------

const SALE_ITEMS: [string, string][] = [["jacket", "Una chaqueta"], ["backpack", "Una mochila"], ["pair of sneakers", "Un par de tenis"], ["lamp", "Una lámpara"], ["board game", "Un juego de mesa"]];
const TAX_ITEMS: [string, string][] = [["book", "Un libro"], ["bike helmet", "Un casco de bicicleta"], ["desk lamp", "Una lámpara de escritorio"]];

type ChangeStory = { range: [number, number]; price?: boolean; en: (o: string, n: string) => string; es: (o: string, n: string) => string };
const CHANGE_STORIES: ChangeStory[] = [
  { range: [20, 200], price: true, en: (o, n) => `The price of a concert ticket went from ${o} to ${n}.`, es: (o, n) => `El precio de un boleto de concierto pasó de ${o} a ${n}.` },
  { range: [40, 400], en: (o, n) => `A library had ${o} members last year and ${n} members this year.`, es: (o, n) => `Una biblioteca tenía ${o} socios el año pasado y ${n} socios este año.` },
  { range: [20, 200], en: (o, n) => `A team scored ${o} points last season and ${n} points this season.`, es: (o, n) => `Un equipo anotó ${o} puntos la temporada pasada y ${n} puntos esta temporada.` },
];

function percentChange(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const kind = r.pick(["off", "tip", "tax"] as const);
    const who = r.pick(NAMES);
    const P = r.int(12, 120), W = P * 100; // whole dollars, so every percent of it is whole cents
    const p = kind === "off" ? r.pick([10, 15, 20, 25, 30, 40, 50]) : kind === "tip" ? r.pick([10, 15, 20, 25]) : r.pick([5, 6, 7, 8, 10]);
    const ch = P * p, total = kind === "off" ? W - ch : W + ch;
    const plan = pctPlan(p, W, money, locale);
    let question: string;
    if (kind === "off") {
      const [en, es] = r.pick(SALE_ITEMS);
      question = tr(locale, `A ${en} costs ${money(W)}. It is on sale for ${p}% off. What is the sale price?`, `${es} cuesta ${money(W)}. Está en oferta con ${p}% de descuento. ¿Cuál es el precio de oferta?`);
    } else if (kind === "tip") {
      question = tr(locale, `A meal costs ${money(W)}. ${who} leaves a ${p}% tip. What is the total cost?`, `Una comida cuesta ${money(W)}. ${who} deja ${p}% de propina. ¿Cuál es el costo total?`);
    } else {
      const [en, es] = r.pick(TAX_ITEMS);
      question = tr(locale, `A ${en} costs ${money(W)} before tax. The sales tax is ${p}%. What is the total cost?`, `${es} cuesta ${money(W)} antes de impuestos. El impuesto sobre la venta es de ${p}%. ¿Cuál es el costo total?`);
    }
    const tail = tr(locale, "Answer in dollars.", "Responde en dólares.");
    const what = { off: tr(locale, "the discount", "el descuento"), tip: tr(locale, "the tip", "la propina"), tax: tr(locale, "the tax", "el impuesto") }[kind];
    return {
      prompt: [`${question} ${tail}`],
      say: `${spoken(question, locale)} ${tail}`,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: total / 100 },
      hints: [
        tr(locale, `First find ${what}: ${p}% of ${money(W)}.`, `Primero calcula ${what}: ${p}% de ${money(W)}.`),
        `${plan.strategy} ${kind === "off" ? tr(locale, "Then subtract it from the price.", "Luego resta esa cantidad del precio.") : tr(locale, "Then add it to the price.", "Luego suma esa cantidad al precio.")}`,
        tr(locale, `${p}% of ${money(W)} = ${money(ch)}.`, `${p}% de ${money(W)} = ${money(ch)}.`),
      ],
      steps: [...plan.steps, `${money(W)} ${kind === "off" ? "−" : "+"} ${money(ch)} = ${money(total)}`],
      seconds: 60,
    };
  }
  const up = r.bool();
  const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]);
  const story = r.pick(CHANGE_STORIES);
  const unit = 100 / gcd(p, 100);
  let o = 100;
  // From exactly 100 the change is the percent itself, so hint 3 would give the answer away.
  while (o === 100) o = unit * r.int(Math.ceil(story.range[0] / unit), Math.floor(story.range[1] / unit));
  const ch = (o * p) / 100, n = up ? o + ch : o - ch;
  const fmt = (k: number) => (story.price ? money(k * 100) : String(k));
  const question = `${tr(locale, story.en(fmt(o), fmt(n)), story.es(fmt(o), fmt(n)))} ${up ? tr(locale, "What is the percent increase?", "¿Cuál es el porcentaje de aumento?") : tr(locale, "What is the percent decrease?", "¿Cuál es el porcentaje de disminución?")}`;
  const [hi, lo] = up ? [n, o] : [o, n];
  return {
    prompt: [question, " ", { blank: true }, "%"],
    say: spoken(question, locale),
    input: "keypad",
    answer: { kind: "number", value: p },
    hints: [
      up
        ? tr(locale, "How much did it go up? Compare that change with the original amount.", "¿Cuánto aumentó? Compara ese cambio con la cantidad original.")
        : tr(locale, "How much did it go down? Compare that change with the original amount.", "¿Cuánto disminuyó? Compara ese cambio con la cantidad original."),
      tr(locale, `Percent change = change ÷ original × 100. Use the original amount, ${fmt(o)}, not the new one.`, `Cambio porcentual = cambio ÷ original × 100. Usa la cantidad original, ${fmt(o)}, no la nueva.`),
      tr(locale, `Change: ${fmt(hi)} − ${fmt(lo)} = ${fmt(ch)}.`, `Cambio: ${fmt(hi)} − ${fmt(lo)} = ${fmt(ch)}.`),
    ],
    steps: [tr(locale, `Change: ${fmt(hi)} − ${fmt(lo)} = ${fmt(ch)}`, `Cambio: ${fmt(hi)} − ${fmt(lo)} = ${fmt(ch)}`), `${ch} ÷ ${o} = ${dec(p)}`, `${dec(p)} = ${p}%`],
    seconds: 60,
  };
}

// ---------- m.ineq.onestep ----------

type Op = ">" | "<" | "≥" | "≤";
const FLIP: Record<Op, Op> = { ">": "<", "<": ">", "≥": "≤", "≤": "≥" };
const EDGE: Record<Op, Op> = { ">": "≥", "<": "≤", "≥": ">", "≤": "<" };

function ineqOneStep(r: Rng, level: number, locale: Locale): ItemBody {
  const sayOp = (o: Op) =>
    ({
      ">": tr(locale, "is greater than", "es mayor que"),
      "<": tr(locale, "is less than", "es menor que"),
      "≥": tr(locale, "is greater than or equal to", "es mayor o igual que"),
      "≤": tr(locale, "is less than or equal to", "es menor o igual que"),
    })[o];
  const op = r.pick<Op>([">", "<", "≥", "≤"]);
  const nudge = tr(locale, "Solve it like an equation. What is being done to x?", "Resuélvela como una ecuación. ¿Qué operación se le aplica a x?");
  const keep = tr(locale, "keeps the inequality sign the same", "no cambia el signo de la desigualdad");
  type Plan = { parts: MathPart[]; said: string; sol: Op; k: number; wrong: [Op, number][]; hints: string[]; steps: string[] };
  const other = (k: number, list: number[]) => list.find((c) => c !== k)!;
  let plan: Plan;
  if (level === 1) {
    const form = r.int(0, 3);
    if (form === 0) {
      const a = r.int(1, 15), k = r.int(-10, 15), b = k + a;
      plan = {
        parts: [`x + ${a} ${op} ${show(b)}`], said: `x ${tr(locale, "plus", "más")} ${a} ${sayOp(op)} ${sayInt(b, locale)}`, sol: op, k,
        wrong: [[FLIP[op], k], [EDGE[op], k], [op, b + a]],
        hints: [nudge, tr(locale, `Subtract ${a} from both sides. Subtracting ${keep}.`, `Resta ${a} en ambos lados. Restar ${keep}.`), `x + ${a} − ${a} ${op} ${show(b)} − ${a}`],
        steps: [`x ${op} ${show(b)} − ${a}`, `x ${op} ${show(k)}`],
      };
    } else if (form === 1) {
      const a = r.int(1, 15), k = r.int(-5, 20), b = k - a;
      plan = {
        parts: [`x − ${a} ${op} ${show(b)}`], said: `x ${tr(locale, "minus", "menos")} ${a} ${sayOp(op)} ${sayInt(b, locale)}`, sol: op, k,
        wrong: [[FLIP[op], k], [EDGE[op], k], [op, b - a]],
        hints: [nudge, tr(locale, `Add ${a} to both sides. Adding ${keep}.`, `Suma ${a} en ambos lados. Sumar ${keep}.`), `x − ${a} + ${a} ${op} ${show(b)} + ${a}`],
        steps: [`x ${op} ${show(b)} + ${a}`, `x ${op} ${show(k)}`],
      };
    } else if (form === 2) {
      const a = r.int(2, 9), k = r.int(-6, 10), b = a * k;
      plan = {
        parts: [`${a}x ${op} ${show(b)}`], said: `${a} x ${sayOp(op)} ${sayInt(b, locale)}`, sol: op, k,
        wrong: [[FLIP[op], k], [EDGE[op], k], [op, other(k, [b - a, -k, k + 1])]],
        hints: [nudge, tr(locale, `Divide both sides by ${a}. Dividing by a positive number ${keep}.`, `Divide ambos lados entre ${a}. Dividir entre un número positivo ${keep}.`), `${a}x ÷ ${a} ${op} ${show(b)} ÷ ${a}`],
        steps: [`x ${op} ${show(b)} ÷ ${a}`, `x ${op} ${show(k)}`],
      };
    } else {
      const a = r.int(2, 6), b = r.int(-5, 8), k = a * b;
      plan = {
        parts: [frac("x", a), ` ${op} ${show(b)}`], said: `x ${tr(locale, "divided by", "dividido entre")} ${a} ${sayOp(op)} ${sayInt(b, locale)}`, sol: op, k,
        wrong: [[FLIP[op], k], [EDGE[op], k], [op, other(k, [b, -k, k + 1])]],
        hints: [nudge, tr(locale, `Multiply both sides by ${a}. Multiplying by a positive number ${keep}.`, `Multiplica ambos lados por ${a}. Multiplicar por un número positivo ${keep}.`), `x/${a} × ${a} ${op} ${show(b)} × ${a}`],
        steps: [`x ${op} ${show(b)} × ${a}`, `x ${op} ${show(k)}`],
      };
    }
  } else if (r.bool(0.7)) {
    // A negative coefficient: the solution flips the sign. Keeping the sign is the classic mistake.
    if (r.bool(0.7)) {
      const a = r.int(2, 9), k = r.int(-8, 8), b = -a * k;
      plan = {
        parts: [`${show(-a)}x ${op} ${show(b)}`], said: `${sayInt(-a, locale)} x ${sayOp(op)} ${sayInt(b, locale)}`, sol: FLIP[op], k,
        wrong: [[op, k], [FLIP[op], other(k, [-k, k + a])], [EDGE[FLIP[op]], k]],
        hints: [
          tr(locale, `To get x alone, you divide by ${show(-a)}. What does dividing by a negative number do to the inequality sign?`, `Para dejar sola la x, divides entre ${show(-a)}. ¿Qué le pasa al signo de la desigualdad al dividir entre un número negativo?`),
          tr(locale, `Divide both sides by ${show(-a)} and flip the inequality sign.`, `Divide ambos lados entre ${show(-a)} e invierte el signo de la desigualdad.`),
          `${show(b)} ÷ (${show(-a)}) = ${show(k)}`,
        ],
        steps: [tr(locale, `Divide by ${show(-a)} and flip the sign: x ${FLIP[op]} ${show(b)} ÷ (${show(-a)})`, `Divide entre ${show(-a)} e invierte el signo: x ${FLIP[op]} ${show(b)} ÷ (${show(-a)})`), `x ${FLIP[op]} ${show(k)}`],
      };
    } else {
      const a = r.int(2, 6), b = r.int(-6, 6), k = -a * b;
      plan = {
        parts: ["−", frac("x", a), ` ${op} ${show(b)}`], said: `${tr(locale, "negative x over", "menos x sobre")} ${a} ${sayOp(op)} ${sayInt(b, locale)}`, sol: FLIP[op], k,
        wrong: [[op, k], [FLIP[op], other(k, [-k, k + a])], [EDGE[FLIP[op]], k]],
        hints: [
          tr(locale, `To get x alone, you multiply by −${a}. What does multiplying by a negative number do to the inequality sign?`, `Para dejar sola la x, multiplicas por −${a}. ¿Qué le pasa al signo de la desigualdad al multiplicar por un número negativo?`),
          tr(locale, `Multiply both sides by −${a} and flip the inequality sign.`, `Multiplica ambos lados por −${a} e invierte el signo de la desigualdad.`),
          `${show(b)} × (−${a}) = ${show(k)}`,
        ],
        steps: [tr(locale, `Multiply by −${a} and flip the sign: x ${FLIP[op]} ${show(b)} × (−${a})`, `Multiplica por −${a} e invierte el signo: x ${FLIP[op]} ${show(b)} × (−${a})`), `x ${FLIP[op]} ${show(k)}`],
      };
    }
  } else {
    // A positive coefficient with a negative number: here flipping is the mistake.
    const a = r.int(2, 9), k = -r.int(1, 9), b = a * k;
    plan = {
      parts: [`${a}x ${op} ${show(b)}`], said: `${a} x ${sayOp(op)} ${sayInt(b, locale)}`, sol: op, k,
      wrong: [[FLIP[op], k], [op, -k], [EDGE[op], k]],
      hints: [
        nudge,
        tr(locale, `Divide both sides by ${a}. ${a} is positive, so the sign stays the same, even though ${show(b)} is negative.`, `Divide ambos lados entre ${a}. ${a} es positivo, así que el signo no cambia, aunque ${show(b)} sea negativo.`),
        `${a}x ÷ ${a} ${op} ${show(b)} ÷ ${a}`,
      ],
      steps: [`x ${op} ${show(b)} ÷ ${a}`, `x ${op} ${show(k)}`],
    };
  }
  const choice = ([o, k]: [Op, number]): Choice => ({ label: `x ${o} ${show(k)}`, say: `x ${sayOp(o)} ${sayInt(k, locale)}` });
  return {
    prompt: [tr(locale, "Which is the solution of ", "¿Cuál es la solución de "), ...plan.parts, "?"],
    say: tr(locale, `Solve ${plan.said}. Which statement is the solution?`, `Resuelve ${plan.said}. ¿Qué enunciado es la solución?`),
    ...withChoices(r, choice([plan.sol, plan.k]), plan.wrong.map(choice)),
    hints: plan.hints,
    steps: plan.steps,
    seconds: level === 1 ? 30 : 40,
  };
}

// ---------- m.circle ----------

function circle(r: Rng, level: number, locale: Locale): ItemBody {
  const u = r.pick(UNITS);
  const { ab, len, sq } = unitWords(u, locale);
  const rad = r.int(2, 12), d = 2 * rad, byD = r.bool(0.4);
  const given = (s: boolean) => (byD ? tr(locale, `a diameter of ${len(d, s)}`, `un diámetro de ${len(d, s)}`) : tr(locale, `a radius of ${len(rad, s)}`, `un radio de ${len(rad, s)}`));
  const pi = tr(locale, "Use π ≈ 3.14.", "Usa π ≈ 3.14.");
  const piSaid = tr(locale, "Use 3.14 for pi.", "Usa 3.14 para pi.");
  const visual = { kind: "circle" as const, r: rad, show: byD ? ("d" as const) : ("r" as const), unit: ab };
  const alt = byD
    ? tr(locale, `A circle with its diameter drawn and labeled ${d} ${ab}.`, `Un círculo con su diámetro trazado y marcado ${d} ${ab}.`)
    : tr(locale, `A circle with its radius drawn and labeled ${rad} ${ab}.`, `Un círculo con su radio trazado y marcado ${rad} ${ab}.`);
  if (level === 1) {
    const C = 314 * d; // hundredths
    const q = (s: boolean) => tr(locale, `A circle has ${given(s)}. Find its circumference in ${tr(locale, u.word[0], u.word[1])}.`, `Un círculo tiene ${given(s)}. Halla su circunferencia en ${tr(locale, u.word[0], u.word[1])}.`);
    return {
      prompt: [`${q(false)} ${pi}`],
      say: `${q(true)} ${piSaid}`,
      visual,
      alt,
      input: "keypad",
      keys: ["."],
      answer: { kind: "number", value: C / 100, tolerance: 0.05 },
      hints: [
        tr(locale, "Circumference is the distance around the circle.", "La circunferencia es la distancia alrededor del círculo."),
        byD ? tr(locale, "C = π × d. Use 3.14 for π.", "C = π × d. Usa 3.14 para π.") : tr(locale, "C = π × d, and the diameter is 2 times the radius.", "C = π × d, y el diámetro es 2 veces el radio."),
        byD ? `C = 3.14 × ${d}` : `d = 2 × ${rad} = ${d} ${ab}`,
      ],
      steps: [...(byD ? [] : [`d = 2 × ${rad} = ${d} ${ab}`]), `C = 3.14 × ${d}`, `C = ${dec(C)} ${ab}`],
      seconds: 40,
    };
  }
  const A = 314 * rad * rad; // hundredths
  const q = (s: boolean) => tr(locale, `A circle has ${given(s)}. Find its area in ${sq}.`, `Un círculo tiene ${given(s)}. Halla su área en ${sq}.`);
  return {
    prompt: [`${q(false)} ${pi}`],
    say: `${q(true)} ${piSaid}`,
    visual,
    alt,
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: A / 100, tolerance: 0.05 },
    hints: [
      tr(locale, "Area is the space inside the circle, in square units.", "El área es el espacio dentro del círculo, en unidades cuadradas."),
      byD ? tr(locale, "A = π × r × r. The radius is half the diameter.", "A = π × r × r. El radio es la mitad del diámetro.") : tr(locale, "A = π × r × r. Use 3.14 for π.", "A = π × r × r. Usa 3.14 para π."),
      byD ? `r = ${d} ÷ 2 = ${rad} ${ab}` : `r × r = ${rad} × ${rad} = ${rad * rad}`,
    ],
    steps: [...(byD ? [`r = ${d} ÷ 2 = ${rad} ${ab}`] : []), `A = 3.14 × ${rad} × ${rad} = 3.14 × ${rad * rad}`, `A = ${dec(A)} ${ab}²`],
    seconds: 45,
  };
}

export const MATH_6_7: Skill[] = [
  { id: "m.frac.div", subject: "math", grade: "6", title: { en: "Divide fractions", es: "Dividir fracciones" }, standard: "6.NS.A.1", prereqs: ["m.frac.mult", "m.frac.divunit"], content: "computed", levels: 2, generate: fracDiv },
  {
    id: "m.gcf.lcm", subject: "math", grade: "6", title: { en: "Greatest common factor and least common multiple", es: "Máximo común divisor y mínimo común múltiplo" },
    standard: "6.NS.B.4", prereqs: ["m.factors"], content: "computed", levels: 2, generate: gcfLcm,
  },
  { id: "m.ratio.equiv", subject: "math", grade: "6", title: { en: "Equivalent ratios", es: "Razones equivalentes" }, standard: "6.RP.A.3", prereqs: ["m.frac.equiv"], content: "computed", levels: 2, generate: ratioEquiv },
  {
    id: "m.ratio.unit", subject: "math", grade: "6", title: { en: "Unit rates and unit prices", es: "Tasas unitarias y precios unitarios" },
    standard: "6.RP.A.2", prereqs: ["m.div.long", "m.dec.mult"], content: "computed", levels: 2, generate: ratioUnit,
  },
  { id: "m.percent", subject: "math", grade: "6", title: { en: "Percents", es: "Porcentajes" }, standard: "6.RP.A.3c", prereqs: ["m.dec.mult", "m.ratio.equiv"], content: "computed", levels: 2, generate: percent },
  {
    id: "m.int.numberline", subject: "math", grade: "6", title: { en: "Integers on the number line", es: "Enteros en la recta numérica" },
    standard: "6.NS.C.6", prereqs: ["m.compare.100"], content: "computed", levels: 2, generate: intNumberLine,
  },
  { id: "m.exp.whole", subject: "math", grade: "6", title: { en: "Exponents", es: "Potencias y exponentes" }, standard: "6.EE.A.1", prereqs: ["m.mult.facts"], content: "computed", levels: 1, generate: expWhole },
  {
    id: "m.expr.eval", subject: "math", grade: "6", title: { en: "Evaluate expressions", es: "Evaluar expresiones" },
    standard: "6.EE.A.2c", prereqs: ["m.order.ops", "m.exp.whole"], content: "computed", levels: 2, generate: exprEval,
  },
  {
    id: "m.eq.onestep", subject: "math", grade: "6", title: { en: "One-step equations", es: "Ecuaciones de un paso" },
    standard: "6.EE.B.7", prereqs: ["m.expr.eval", "m.missing.addend"], content: "computed", levels: 2, generate: eqOneStep,
  },
  {
    id: "m.area.poly", subject: "math", grade: "6", title: { en: "Area of triangles and polygons", es: "Área de triángulos y polígonos" },
    standard: "6.G.A.1", prereqs: ["m.area.rect"], content: "computed", levels: 2, generate: areaPoly,
  },
  {
    id: "m.int.addsub", subject: "math", grade: "7", title: { en: "Add and subtract integers", es: "Sumar y restar enteros" },
    standard: "7.NS.A.1", prereqs: ["m.int.numberline"], content: "computed", levels: 2, generate: intAddSub,
  },
  {
    id: "m.int.multdiv", subject: "math", grade: "7", title: { en: "Multiply and divide integers", es: "Multiplicar y dividir enteros" },
    standard: "7.NS.A.2", prereqs: ["m.int.addsub", "m.mult.facts"], content: "computed", levels: 1, generate: intMultDiv,
  },
  {
    id: "m.expr.simplify", subject: "math", grade: "7", title: { en: "Simplify expressions", es: "Simplificar expresiones" },
    standard: "7.EE.A.1", prereqs: ["m.expr.eval", "m.int.addsub"], content: "computed", levels: 2, generate: exprSimplify,
  },
  {
    id: "m.eq.twostep", subject: "math", grade: "7", title: { en: "Two-step equations", es: "Ecuaciones de dos pasos" },
    standard: "7.EE.B.4a", prereqs: ["m.eq.onestep", "m.int.multdiv"], content: "computed", levels: 2, generate: eqTwoStep,
  },
  { id: "m.proportion", subject: "math", grade: "7", title: { en: "Proportions", es: "Proporciones" }, standard: "7.RP.A.2", prereqs: ["m.ratio.equiv", "m.eq.onestep"], content: "computed", levels: 2, generate: proportion },
  {
    id: "m.percent.change", subject: "math", grade: "7", title: { en: "Percent change, tax, tip and discount", es: "Cambio porcentual, impuestos, propinas y descuentos" },
    standard: "7.RP.A.3", prereqs: ["m.percent"], content: "computed", levels: 2, generate: percentChange,
  },
  {
    id: "m.ineq.onestep", subject: "math", grade: "7", title: { en: "One-step inequalities", es: "Desigualdades de un paso" },
    standard: "7.EE.B.4b", prereqs: ["m.eq.onestep", "m.int.multdiv"], content: "computed", levels: 2, generate: ineqOneStep,
  },
  { id: "m.circle", subject: "math", grade: "7", title: { en: "Circumference and area of circles", es: "Circunferencia y área del círculo" }, standard: "7.G.B.4", prereqs: ["m.dec.mult"], content: "computed", levels: 2, generate: circle },
];
