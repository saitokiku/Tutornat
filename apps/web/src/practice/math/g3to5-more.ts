import type { Locale } from "@/lib/types";
import { check, parseNumber } from "../answer";
import { gcd, type Rng } from "../rng";
import { sayFrac, tr } from "../text";
import type { Answer, Choice, ItemBody, MathPart, Pad, Skill } from "../types";

// Grades 3–5, second strand: word problems, measurement, time, data, geometry and place value.
// Every problem is built backward from a whole-number answer (or whole hundredths, thousandths or
// eighths), so no key depends on floating point. Wrong choices and likely wrong typed answers carry a
// misconception tag; `misses` drops any tagged value the checker would accept, so a tag can never mark
// a right answer.

const blank: MathPart = { blank: true };
const fr = (n: number | string, d: number | string): MathPart => ({ frac: [n, d] });
/** A fraction as written in hints and steps. */
const ft = (n: number, d: number) => `${n}/${d}`;
function reduce(n: number, d: number): [number, number] {
  const g = gcd(n, d);
  return [n / g, d / g];
}
/** n/d the simplest way to write it: a whole number, a proper fraction or a mixed number. */
function simplest(n: number, d: number) {
  const [a, b] = reduce(n, d);
  if (b === 1) return String(a);
  return a < b ? ft(a, b) : `${Math.floor(a / b)} ${ft(a % b, b)}`;
}
const pl = (n: number, one: string, many: string) => (n === 1 ? one : many);
/** "fourths", "cuartos": the plural name of a denominator. */
const denName = (d: number, locale: Locale) => sayFrac(2, d, locale).replace(/^2 /, "");
/** US digit grouping, which US Spanish materials use too: 472519 → "472,519". */
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** m ÷ 10^p written exactly, with no floating point: dec(305, 2) = "3.05". */
function dec(m: number, p: number): string {
  if (p <= 0) return String(m * 10 ** -p);
  const s = String(m).padStart(p + 1, "0");
  return `${s.slice(0, -p)}.${s.slice(-p)}`;
}
/** Drops zeros after the point that add nothing: "34.00" → "34", "3.20" → "3.2". */
const trimDec = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
/** The shortest exact decimal for m ÷ 10^p: num(4370, 3) = "4.37". */
const num = (m: number, p: number) => trimDec(dec(m, p));
/** "5, 7 and 4" / "5, 7 y 4". */
const listOf = (items: string[], locale: Locale) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${tr(locale, "and", "y")} ${items[items.length - 1]}`);
/** Money the way it is said: "$0.25" → "25 cents", "$1.00" → "1 dollar", "$2.50" → "2 dollars and 50 cents". */
function sayMoney(dollars: number, cents: number, locale: Locale) {
  const d = `${dollars} ${tr(locale, pl(dollars, "dollar", "dollars"), pl(dollars, "dólar", "dólares"))}`;
  const c = `${cents} ${tr(locale, pl(cents, "cent", "cents"), pl(cents, "centavo", "centavos"))}`;
  return !cents ? d : !dollars ? c : `${d} ${tr(locale, "and", "y")} ${c}`;
}
/** The read-aloud form of prices and degrees: "$12" → "12 dollars", "$0.25" → "25 cents", "35°" → "35 degrees". */
const spoken = (s: string, locale: Locale) =>
  s
    .replace(/\$(\d+)(?:\.(\d\d))?/g, (_, d: string, c?: string) => sayMoney(Number(d), Number(c ?? 0), locale))
    .replace(/(\d+)°/g, (_, d: string) => `${d} ${tr(locale, d === "1" ? "degree" : "degrees", d === "1" ? "grado" : "grados")}`);
/** Capital first letter, after an opening "¿": "las uvas: 3" → "Las uvas: 3", "¿un medio…" → "¿Un medio…". */
const cap = (s: string) => s.replace(/^(¿?)(.)/u, (_, q: string, c: string) => q + c.toUpperCase());
/** Spanish "de" before a name with its article: "del fútbol", "de las uvas", "de Marte". */
const del = (s: string) => (s.startsWith("el ") ? `del ${s.slice(3)}` : `de ${s}`);
/** "y sobra 1" / "y sobran 4". */
const sobran = (n: number) => (n === 1 ? "sobra 1" : `sobran ${n}`);
/** "4, 8, 12": the first `count` multiples of `step`. */
const skipList = (step: number, count: number) => Array.from({ length: count }, (_, i) => step * (i + 1)).join(", ");
/** A skip-count start for a hint: at most three terms, so it never runs up to the answer. */
const skipStart = (step: number, groups: number) => `${skipList(step, Math.max(1, Math.min(3, groups - 1)))}, …`;
/** A random proper fraction in lowest terms with denominator d. */
function properReduced(r: Rng, d: number) {
  let n = r.int(1, d - 1);
  while (gcd(n, d) !== 1) n = r.int(1, d - 1);
  return n;
}

const NAMES = ["Ava", "Mateo", "Priya", "Kenji", "Amara", "Diego", "Sofía", "Malik", "Lin", "Omar", "Grace", "Luis", "Aisha", "Noah", "Mei", "Carlos", "Zainab", "Tomás", "Hana", "Kwame", "Ingrid", "Ravi", "Leilani", "Yusuf", "Elena", "Jamal"];
function twoNames(r: Rng): [string, string] {
  const a = r.pick(NAMES);
  let b = r.pick(NAMES);
  while (b === a) b = r.pick(NAMES);
  return [a, b];
}
type Pair = [string, string];
const say2 = (locale: Locale, pair: Pair) => tr(locale, pair[0], pair[1]);

/** A likely wrong typed answer and the misconception it shows; null or false entries are skipped. */
type Miss = readonly [value: number | string, why: string] | null | false;
/** Tagged wrong values, minus repeats, negatives and anything the checker would accept as right. */
function misses(answer: Answer, list: Miss[]): { value: string; why: string }[] {
  const out: { value: string; why: string }[] = [];
  for (const m of list) {
    if (!m) continue;
    const [v, why] = m;
    if (typeof v === "number" && !(Number.isFinite(v) && v >= 0)) continue;
    const value = String(v);
    if (!out.some((o) => o.value === value) && !check(answer, value).correct) out.push({ value, why });
  }
  return out;
}

/** Only the wrong values a touch pad can show (on the line, on a tick, within the bar's parts): a tag nobody can enter never fires. */
function onPad(pad: Pad, wrong: { value: string; why: string }[]) {
  return wrong.filter(({ value }) => {
    const v = parseNumber(value)?.value;
    if (v === undefined) return true;
    const steps = pad.kind === "number-line" ? (v - pad.min) / pad.step : pad.kind === "fraction-bar" && pad.parts ? v * pad.parts : 0;
    const top = pad.kind === "number-line" ? (pad.max - pad.min) / pad.step : pad.kind === "fraction-bar" && pad.parts ? pad.parts : 0;
    return Math.abs(steps - Math.round(steps)) < 1e-6 && steps > -1e-6 && steps < top + 1e-6;
  });
}

type Picked = Pick<ItemBody, "choices" | "input" | "answer">;
/** The right choice and up to three distinct wrong ones (each with its `why`), shuffled. */
function choose(r: Rng, right: Choice, wrong: Choice[]): Picked {
  const list: Choice[] = [right];
  for (const w of wrong) if (list.length < 4 && !list.some((c) => c.label === w.label)) list.push(w);
  const choices = r.shuffle(list);
  return { choices, input: "choices", answer: { kind: "choice", index: choices.indexOf(right) } };
}
/** <, >, = in a fixed order, for the sign of `diff`; `tag(i)` names the mistake behind wrong symbol i. */
function symbols(diff: number, tag: (i: number) => string, locale: Locale): Picked {
  const want = diff < 0 ? 0 : diff > 0 ? 1 : 2;
  const base: Choice[] = [
    { label: "<", say: tr(locale, "is less than", "es menor que") },
    { label: ">", say: tr(locale, "is greater than", "es mayor que") },
    { label: "=", say: tr(locale, "is equal to", "es igual a") },
  ];
  return { choices: base.map((c, i) => (i === want ? c : { ...c, why: tag(i) })), input: "choices", answer: { kind: "choice", index: want } };
}
const SYM = ["<", ">", "="];
const symOf = (diff: number) => SYM[diff < 0 ? 0 : diff > 0 ? 1 : 2];

/** Length units: abbreviation, word, square and cubic names, and whether the Spanish word is feminine. */
type Len = { ab: Pair; word: Pair; sq: Pair; cu: Pair; fem: boolean };
const CM: Len = { ab: ["cm", "cm"], word: ["centimeters", "centímetros"], sq: ["square centimeters", "centímetros cuadrados"], cu: ["cubic centimeters", "centímetros cúbicos"], fem: false };
const M: Len = { ab: ["m", "m"], word: ["meters", "metros"], sq: ["square meters", "metros cuadrados"], cu: ["cubic meters", "metros cúbicos"], fem: false };
const IN: Len = { ab: ["in", "pulg"], word: ["inches", "pulgadas"], sq: ["square inches", "pulgadas cuadradas"], cu: ["cubic inches", "pulgadas cúbicas"], fem: true };
const FT: Len = { ab: ["ft", "pies"], word: ["feet", "pies"], sq: ["square feet", "pies cuadrados"], cu: ["cubic feet", "pies cúbicos"], fem: false };

// ---------- clock arithmetic (minutes after 12:00 on a 12-hour face) ----------

function clock(t: number) {
  const m = ((t % 720) + 720) % 720;
  const h = Math.floor(m / 60);
  return `${h === 0 ? 12 : h}:${String(m % 60).padStart(2, "0")}`;
}
const hourOf = (t: number) => Number(clock(t).split(":")[0]);
/** Spanish "a la 1:15" / "a las 3:40", and "la 1:15" / "las 3:40". */
const aLas = (t: number) => (hourOf(t) === 1 ? "a la" : "a las");
const laLas = (t: number) => (hourOf(t) === 1 ? "la" : "las");
/** A time read as a base-ten number, the way a learner who forgets 60 minutes in an hour subtracts: 4:10 → 410. */
const hhmm = (t: number) => hourOf(t) * 100 + (((t % 60) + 60) % 60);

// ---------- column arithmetic within 1000 ----------

const PLACE3: Pair[] = [["Ones", "Unidades"], ["Tens", "Decenas"], ["Hundreds", "Centenas"]];
const digits3 = (n: number) => [n % 10, Math.floor(n / 10) % 10, Math.floor(n / 100) % 10];
const fromDigits = (d: number[]) => d.reduce((s, x, i) => s + x * 10 ** i, 0);
/** A column-by-column result with no regrouping, for the classic slips (no carry, smaller from larger). */
const columnwise = (a: number, b: number, f: (x: number, y: number) => number) => fromDigits(digits3(a).map((x, i) => f(x, digits3(b)[i])));
function carryCount(a: number, b: number) {
  const A = digits3(a), B = digits3(b);
  let c = 0, n = 0;
  for (let i = 0; i < 3; i++) {
    c = A[i] + B[i] + c >= 10 ? 1 : 0;
    n += c;
  }
  return n;
}
function borrowCount(a: number, b: number) {
  const A = digits3(a), B = digits3(b);
  let owe = 0, n = 0;
  for (let i = 0; i < 3; i++) {
    owe = A[i] - owe < B[i] ? 1 : 0;
    n += owe;
  }
  return n;
}
/** "Ones: 7 + 8 = 15. Write 5 and carry 1." for each column of a + b (sum at most 999). */
function addLines(a: number, b: number, locale: Locale) {
  const A = digits3(a), B = digits3(b);
  const lines: string[] = [];
  let c = 0;
  for (let i = 0; i < 3; i++) {
    const s = A[i] + B[i] + c;
    const sum = `${say2(locale, PLACE3[i])}: ${A[i]} + ${B[i]}${c ? " + 1" : ""} = ${s}`;
    lines.push(s >= 10 ? tr(locale, `${sum}. Write ${s - 10} and carry 1.`, `${sum}. Escribe ${s - 10} y lleva 1.`) : `${sum}.`);
    c = s >= 10 ? 1 : 0;
  }
  return lines;
}
/** The subtraction a − b column by column, trading from the next place (across a zero when needed). */
function subLines(a: number, b: number, locale: Locale) {
  const top = digits3(a), B = digits3(b);
  const lines: string[] = [];
  for (let i = 0; i < 3; i++) {
    const name = say2(locale, PLACE3[i]);
    if (top[i] >= B[i]) {
      lines.push(`${name}: ${top[i]} − ${B[i]} = ${top[i] - B[i]}.`);
      continue;
    }
    const work = `${top[i] + 10} − ${B[i]} = ${top[i] + 10 - B[i]}`;
    if (i === 0 && top[1] === 0) {
      top[2] -= 1;
      top[1] = 9;
      lines.push(
        tr(
          locale,
          `${name}: ${top[0]} is less than ${B[0]} and there are no tens, so trade 1 hundred for 10 tens, then 1 ten for 10 ones: ${work}.`,
          `${name}: ${top[0]} es menor que ${B[0]} y no hay decenas, así que cambia 1 centena por 10 decenas y luego 1 decena por 10 unidades: ${work}.`,
        ),
      );
    } else {
      top[i + 1] -= 1;
      lines.push(
        i === 0
          ? tr(locale, `${name}: ${top[0]} is less than ${B[0]}, so trade 1 ten for 10 ones: ${work}.`, `${name}: ${top[0]} es menor que ${B[0]}, así que cambia 1 decena por 10 unidades: ${work}.`)
          : tr(locale, `${name}: ${top[1]} is less than ${B[1]}, so trade 1 hundred for 10 tens: ${work}.`, `${name}: ${top[1]} es menor que ${B[1]}, así que cambia 1 centena por 10 decenas: ${work}.`),
      );
    }
  }
  return lines;
}
const smallFromLarge = (a: number, b: number) => columnwise(a, b, (x, y) => Math.abs(x - y));
/** Traded 10 into a column but never took the 1 away from the next place. */
const noPayBack = (a: number, b: number) => columnwise(a, b, (x, y) => (x < y ? x + 10 - y : x - y));
const noCarry = (a: number, b: number) => columnwise(a, b, (x, y) => (x + y) % 10);

// ---------- grade 3 word problems ----------

type Story = { en: (a: number, b: number, n: string) => string; es: (a: number, b: number, n: string) => string; unit: Pair; fixed?: number };
/** a groups of b; the answer is a × b. */
const GROUP_STORIES: Story[] = [
  {
    en: (g, s, n) => `${n} has ${g} bags of oranges. Each bag has ${s} oranges. How many oranges does ${n} have?`,
    es: (g, s, n) => `${n} tiene ${g} bolsas de naranjas. Cada bolsa tiene ${s} naranjas. ¿Cuántas naranjas tiene ${n}?`,
    unit: ["oranges", "naranjas"],
  },
  {
    en: (g, s) => `The school band marches in ${g} rows. Each row has ${s} players. How many players are in the band?`,
    es: (g, s) => `La banda de la escuela marcha en ${g} filas. Cada fila tiene ${s} músicos. ¿Cuántos músicos hay en la banda?`,
    unit: ["players", "músicos"],
  },
  { en: (g) => `A spider has 8 legs. How many legs do ${g} spiders have?`, es: (g) => `Una araña tiene 8 patas. ¿Cuántas patas tienen ${g} arañas?`, unit: ["legs", "patas"], fixed: 8 },
  { en: (g) => `An ant has 6 legs. How many legs do ${g} ants have?`, es: (g) => `Una hormiga tiene 6 patas. ¿Cuántas patas tienen ${g} hormigas?`, unit: ["legs", "patas"], fixed: 6 },
  {
    en: (g, s) => `A coach makes ${g} teams with ${s} players on each team. How many players are there?`,
    es: (g, s) => `Un entrenador forma ${g} equipos con ${s} jugadores en cada equipo. ¿Cuántos jugadores hay?`,
    unit: ["players", "jugadores"],
  },
  {
    en: (g, s) => `The art room has ${g} boxes of paint. Each box has ${s} jars. How many jars of paint are there?`,
    es: (g, s) => `El salón de arte tiene ${g} cajas de pintura. Cada caja tiene ${s} frascos. ¿Cuántos frascos de pintura hay?`,
    unit: ["jars", "frascos"],
  },
  {
    en: (g, s, n) => `${n} has ${g} sheets of star stickers. Each sheet has ${s} stickers. How many star stickers does ${n} have?`,
    es: (g, s, n) => `${n} tiene ${g} hojas de calcomanías de estrellas. Cada hoja tiene ${s} calcomanías. ¿Cuántas calcomanías de estrellas tiene ${n}?`,
    unit: ["stickers", "calcomanías"],
  },
  {
    en: (g, s) => `In a card game, each player gets ${s} cards. There are ${g} players. How many cards are dealt?`,
    es: (g, s) => `En un juego de cartas, cada jugador recibe ${s} cartas. Hay ${g} jugadores. ¿Cuántas cartas se reparten?`,
    unit: ["cards", "cartas"],
  },
  {
    en: (g, s, n) => `${n} bakes ${g} trays of muffins. Each tray holds ${s} muffins. How many muffins is that?`,
    es: (g, s, n) => `${n} hornea ${g} bandejas de panquecitos. En cada bandeja caben ${s} panquecitos. ¿Cuántos panquecitos son?`,
    unit: ["muffins", "panquecitos"],
  },
];
/** a things split by b (shared into b groups, or put in groups of b); the answer is a ÷ b. */
const SHARE_STORIES: Story[] = [
  {
    en: (t, k, n) => `${n} shares ${t} stickers equally among ${k} friends. How many stickers does each friend get?`,
    es: (t, k, n) => `${n} reparte ${t} calcomanías en partes iguales entre ${k} amigos. ¿Cuántas calcomanías recibe cada amigo?`,
    unit: ["stickers", "calcomanías"],
  },
  {
    en: (t, k) => `${t} students stand in ${k} equal rows for a class photo. How many students are in each row?`,
    es: (t, k) => `${t} estudiantes se forman en ${k} filas iguales para la foto de la clase. ¿Cuántos estudiantes hay en cada fila?`,
    unit: ["students", "estudiantes"],
  },
  {
    en: (t, k) => `A coach puts ${t} balls into bags. Each bag holds ${k} balls. How many bags does the coach fill?`,
    es: (t, k) => `Un entrenador guarda ${t} pelotas en bolsas. En cada bolsa caben ${k} pelotas. ¿Cuántas bolsas llena?`,
    unit: ["bags", "bolsas"],
  },
  { en: (t, k) => `${t} muffins are packed in boxes of ${k}. How many boxes are filled?`, es: (t, k) => `Se empacan ${t} panquecitos en cajas de ${k}. ¿Cuántas cajas se llenan?`, unit: ["boxes", "cajas"] },
  {
    en: (t, k) => `The music room has ${t} chairs in ${k} equal rows. How many chairs are in each row?`,
    es: (t, k) => `El salón de música tiene ${t} sillas en ${k} filas iguales. ¿Cuántas sillas hay en cada fila?`,
    unit: ["chairs", "sillas"],
  },
  {
    en: (t, k) => `A zookeeper shares ${t} carrots equally among ${k} rabbits. How many carrots does each rabbit get?`,
    es: (t, k) => `Una cuidadora del zoológico reparte ${t} zanahorias en partes iguales entre ${k} conejos. ¿Cuántas zanahorias recibe cada conejo?`,
    unit: ["carrots", "zanahorias"],
  },
  {
    en: (t, k, n) => `${n} reads ${t} pages in ${k} days and reads the same number of pages each day. How many pages does ${n} read each day?`,
    es: (t, k, n) => `${n} lee ${t} páginas en ${k} días y lee el mismo número de páginas cada día. ¿Cuántas páginas lee cada día?`,
    unit: ["pages", "páginas"],
  },
  { en: (t, k) => `${t} game pieces are sorted into sets of ${k}. How many sets are there?`, es: (t, k) => `Se separan ${t} fichas de juego en grupos de ${k}. ¿Cuántos grupos hay?`, unit: ["sets", "grupos"] },
];

/** A two-step story: its numbers, both languages, the two equations and the likely slips. */
type TwoStep = {
  make: (r: Rng) => number[];
  en: (x: number[], n: string) => string;
  es: (x: number[], n: string) => string;
  /** [first expression, its value, second expression, the answer]. */
  work: (x: number[]) => [string, number, string, number];
  plan: (x: number[]) => Pair;
  unit: Pair;
  wrong: (x: number[]) => Miss[];
};
const TWO_STEP: TwoStep[] = [
  {
    make: (r) => {
      const g = r.int(2, 6), s = r.int(4, 10);
      return [g, s, r.int(2, Math.min(20, g * s - 2))];
    },
    en: ([g, s, c], n) => `${n} buys ${g} packs of markers. Each pack has ${s} markers. ${n} gives ${c} markers to a friend. How many markers does ${n} have now?`,
    es: ([g, s, c], n) => `${n} compra ${g} paquetes de marcadores. Cada paquete tiene ${s} marcadores. ${n} le regala ${c} marcadores a un amigo. ¿Cuántos marcadores tiene ${n} ahora?`,
    work: ([g, s, c]) => [`${g} × ${s}`, g * s, `${g * s} − ${c}`, g * s - c],
    plan: ([g, , c]) => [`First find how many markers are in ${g} packs. Then take away the ${c} given away.`, `Primero encuentra cuántos marcadores hay en ${g} paquetes. Luego quita los ${c} que regaló.`],
    unit: ["markers", "marcadores"],
    wrong: ([g, s, c]) => [[g * s, "stopped-after-one-step"], [g * s + c, "used-the-wrong-operation"]],
  },
  {
    make: (r) => [r.int(5, 40), r.int(2, 6), r.int(3, 10)],
    en: ([c, g, s], n) => `${n} has ${c} trading cards. Then ${n} gets ${g} packs with ${s} cards in each pack. How many cards does ${n} have now?`,
    es: ([c, g, s], n) => `${n} tiene ${c} tarjetas coleccionables. Luego recibe ${g} paquetes con ${s} tarjetas en cada paquete. ¿Cuántas tarjetas tiene ${n} ahora?`,
    work: ([c, g, s]) => [`${g} × ${s}`, g * s, `${c} + ${g * s}`, c + g * s],
    plan: ([c, g]) => [`First find how many cards are in the ${g} new packs. Then add the ${c} cards from before.`, `Primero encuentra cuántas tarjetas hay en los ${g} paquetes nuevos. Luego suma las ${c} tarjetas que ya tenía.`],
    unit: ["cards", "tarjetas"],
    wrong: ([c, g, s]) => [[g * s, "stopped-after-one-step"], [c + g + s, "added-instead-of-multiplied"]],
  },
  {
    make: (r) => {
      const k = r.int(2, 6), q = r.int(4, 10);
      return [k * q, k, r.int(2, q - 2)];
    },
    en: ([t, k, c]) => `${t} cookies are shared equally on ${k} plates. Then ${c} cookies are eaten from one plate. How many cookies are left on that plate?`,
    es: ([t, k, c]) => `Se reparten ${t} galletas en partes iguales en ${k} platos. Luego se comen ${c} galletas de un plato. ¿Cuántas galletas quedan en ese plato?`,
    work: ([t, k, c]) => [`${t} ÷ ${k}`, t / k, `${t / k} − ${c}`, t / k - c],
    plan: ([, , c]) => [`First find how many cookies go on each plate. Then take away the ${c} that were eaten.`, `Primero encuentra cuántas galletas hay en cada plato. Luego quita las ${c} que se comieron.`],
    unit: ["cookies", "galletas"],
    wrong: ([t, k, c]) => [[t / k, "stopped-after-one-step"], [t / k + c, "used-the-wrong-operation"]],
  },
  {
    make: (r) => {
      const s = r.int(2, 10), g = r.int(2, 8);
      return [s, g, r.int(2, Math.min(30, s * g - 2))];
    },
    en: ([s, g, c], n) => `${n} saves $${s} each week for ${g} weeks. Then ${n} spends $${c} on a book. How much money does ${n} have left?`,
    es: ([s, g, c], n) => `${n} ahorra $${s} cada semana durante ${g} semanas. Luego gasta $${c} en un libro. ¿Cuánto dinero le queda?`,
    work: ([s, g, c]) => [`${s} × ${g}`, s * g, `${s * g} − ${c}`, s * g - c],
    plan: ([, g, c]) => [`First find how much is saved in ${g} weeks. Then take away the $${c} spent.`, `Primero encuentra cuánto ahorra en ${g} semanas. Luego quita los $${c} que gastó.`],
    unit: ["dollars", "dólares"],
    wrong: ([s, g, c]) => [[s * g, "stopped-after-one-step"], [s * g + c, "used-the-wrong-operation"]],
  },
  {
    make: (r) => {
      const g = r.int(4, 9), s = r.int(2, 4);
      return [g, s, r.int(2, Math.min(12, g * s - 2))];
    },
    en: ([g, s, c]) => `A bus has ${g} rows with ${s} seats in each row. ${c} seats are empty. How many people are sitting?`,
    es: ([g, s, c]) => `Un autobús tiene ${g} filas con ${s} asientos en cada fila. Hay ${c} asientos vacíos. ¿Cuántas personas están sentadas?`,
    work: ([g, s, c]) => [`${g} × ${s}`, g * s, `${g * s} − ${c}`, g * s - c],
    plan: ([, , c]) => [`First find how many seats the bus has. Then take away the ${c} empty seats.`, `Primero encuentra cuántos asientos tiene el autobús. Luego quita los ${c} asientos vacíos.`],
    unit: ["people", "personas"],
    wrong: ([g, s, c]) => [[g * s, "stopped-after-one-step"], [g * s + c, "used-the-wrong-operation"]],
  },
  {
    make: (r) => {
      const k = r.int(3, 6), total = k * r.int(3, 8), a = r.int(3, total - 3);
      return [a, total - a, k];
    },
    en: ([a, b, k]) => `A gym class has ${a} girls and ${b} boys. The coach makes teams of ${k}. How many teams are there?`,
    es: ([a, b, k]) => `Una clase de educación física tiene ${a} niñas y ${b} niños. El entrenador forma equipos de ${k}. ¿Cuántos equipos hay?`,
    work: ([a, b, k]) => [`${a} + ${b}`, a + b, `${a + b} ÷ ${k}`, (a + b) / k],
    plan: ([, , k]) => [`First find how many students are in the class in all. Then split them into teams of ${k}.`, `Primero encuentra cuántos estudiantes hay en total en la clase. Luego sepáralos en equipos de ${k}.`],
    unit: ["teams", "equipos"],
    wrong: ([a, b, k]) => [[a + b, "stopped-after-one-step"], [a + b - k, "subtracted-instead-of-divided"]],
  },
  {
    make: (r) => [r.int(2, 6), r.int(2, 8), r.int(2, 15)],
    en: ([g, s, c]) => `A space club has ${g} telescopes. ${s} kids look through each telescope, and ${c} more kids wait in line. How many kids are at the club?`,
    es: ([g, s, c]) => `Un club de astronomía tiene ${g} telescopios. ${s} niños miran por cada telescopio y otros ${c} niños esperan en la fila. ¿Cuántos niños hay en el club?`,
    work: ([g, s, c]) => [`${g} × ${s}`, g * s, `${g * s} + ${c}`, g * s + c],
    plan: ([, , c]) => [`First find how many kids are at the telescopes. Then add the ${c} kids in line.`, `Primero encuentra cuántos niños hay en los telescopios. Luego suma los ${c} niños de la fila.`],
    unit: ["kids", "niños"],
    wrong: ([g, s, c]) => [[g * s, "stopped-after-one-step"], [g + s + c, "added-instead-of-multiplied"]],
  },
  {
    make: (r) => {
      const k = r.int(2, 6), q = r.int(2, 9);
      return [k * q, k, r.int(2, 9)];
    },
    en: ([t, k, c]) => `The music teacher has ${t} songbooks to share equally among ${k} classes. Each class already has ${c} songbooks. How many songbooks will each class have?`,
    es: ([t, k, c]) => `La maestra de música tiene ${t} cancioneros para repartir en partes iguales entre ${k} grupos. Cada grupo ya tiene ${c} cancioneros. ¿Cuántos cancioneros tendrá cada grupo?`,
    work: ([t, k, c]) => [`${t} ÷ ${k}`, t / k, `${t / k} + ${c}`, t / k + c],
    plan: ([, , c]) => [`First find how many new songbooks each class gets. Then add the ${c} it already has.`, `Primero encuentra cuántos cancioneros nuevos recibe cada grupo. Luego suma los ${c} que ya tiene.`],
    unit: ["songbooks", "cancioneros"],
    wrong: ([t, k, c]) => [[t / k, "stopped-after-one-step"], [t + c, "skipped-the-sharing"]],
  },
];

// ---------- grade 3 fractions ----------

/** Grade 3 fraction pairs (denominators 2, 3, 4, 6, 8): the second is a multiple of the first. */
const PAIRS3: [number, number][] = [[2, 4], [2, 6], [2, 8], [3, 6], [4, 8]];
/**
 * Bars to match, [parts on top, parts below, shaded on top]: every grade 3 pair, split finer or joined coarser.
 * Items whose answer is not a single piece come twice, so halves are not most of the level.
 */
const BARS3: [number, number, number][] = [
  [2, 4, 1], [2, 6, 1], [2, 8, 1], [3, 6, 1], [4, 8, 1], [4, 2, 2], [6, 2, 3], [8, 2, 4], [6, 3, 2], [8, 4, 2],
  ...([[3, 6, 2], [4, 8, 2], [4, 8, 3], [6, 3, 4], [8, 4, 4], [8, 4, 6]] as [number, number, number][]).flatMap((x) => [x, x]),
];

// ---------- grade 3 perimeter ----------

type Place = { en: string; es: string; units: Len[] };
const PLACES: Place[] = [
  { en: "A garden", es: "Un jardín", units: [M, FT] },
  { en: "A park", es: "Un parque", units: [M, FT] },
  { en: "A goat pen", es: "Un corral de cabras", units: [M, FT] },
  { en: "A stage", es: "Un escenario", units: [M, FT] },
  { en: "A sandbox", es: "Un arenero", units: [FT, M] },
  { en: "A game board", es: "Un tablero de juego", units: [CM, IN] },
  { en: "A picture frame", es: "Un marco de fotos", units: [CM, IN] },
];
/** Polygon names by number of sides; `same` is the name used when every side has the same length. */
const POLY: Record<number, { any: Pair; same: Pair }> = {
  3: { any: ["triangle", "triángulo"], same: ["triangle", "triángulo"] },
  4: { any: ["quadrilateral", "cuadrilátero"], same: ["square", "cuadrado"] },
  5: { any: ["pentagon", "pentágono"], same: ["pentagon", "pentágono"] },
  6: { any: ["hexagon", "hexágono"], same: ["hexagon", "hexágono"] },
};
/** n side lengths from 2 to 15 that close up into a real shape: the longest is shorter than all the others together. */
function polygonSides(r: Rng, n: number) {
  for (;;) {
    const sides = Array.from({ length: n }, () => r.int(2, 15));
    if (2 * Math.max(...sides) < sides.reduce((s, x) => s + x, 0)) return sides;
  }
}
const COUNT_WORD: Record<number, Pair> = { 2: ["Two", "Dos"], 3: ["Three", "Tres"], 4: ["Four", "Cuatro"], 5: ["Five", "Cinco"] };
/** A unit with the lengths that fit a setting in that unit, from lo to hi. */
type Size = [unit: Len, lo: number, hi: number];
/** Rectangles sized for the setting; the width is at least `thin` of the length, so a poster is never a strip. */
const RECT_PLACES: { en: string; es: string; sizes: Size[]; thin: number }[] = [
  { en: "A rectangular garden", es: "Un jardín rectangular", sizes: [[M, 4, 15], [FT, 6, 20]], thin: 1 / 3 },
  { en: "A rectangular rug", es: "Un tapete rectangular", sizes: [[FT, 5, 12], [M, 3, 4]], thin: 1 / 2 },
  { en: "A rectangular poster", es: "Un cartel rectangular", sizes: [[IN, 12, 24], [CM, 30, 60]], thin: 2 / 3 },
  { en: "A rectangular patio", es: "Un patio rectangular", sizes: [[M, 3, 8], [FT, 8, 20]], thin: 1 / 2 },
];
/** [length, width] with lo ≤ length ≤ hi and thin × length ≤ width < length. */
function rectSize(r: Rng, lo: number, hi: number, thin: number): [number, number] {
  const L = r.int(lo, hi);
  return [L, r.int(Math.max(2, Math.ceil(L * thin)), L - 1)];
}

// ---------- grade 3 time ----------

const EVENTS: Pair[] = [
  ["Soccer practice", "La práctica de fútbol"],
  ["The piano lesson", "La clase de piano"],
  ["The art class", "La clase de arte"],
  ["The chess club", "El club de ajedrez"],
  ["The movie", "La película"],
  ["The planetarium show", "La función del planetario"],
  ["Swim practice", "La práctica de natación"],
  ["The baking class", "La clase de repostería"],
];
const TASKS: Pair[] = [
  ["finished a puzzle", "terminó un rompecabezas"],
  ["finished a painting", "terminó una pintura"],
  ["finished building a model rocket", "terminó de armar un cohete a escala"],
  ["finished a science poster", "terminó un cartel de ciencias"],
  ["finished practicing violin", "terminó de practicar violín"],
];

// ---------- grade 3 mass and liquid volume ----------

type Measure = { make: (r: Rng) => [number, number]; en: (a: number, b: number, n: string) => string; es: (a: number, b: number, n: string) => string; op: "+" | "−" | "×" | "÷"; unit: Pair; plan: Pair };
const MASS_ADD_SUB: Measure[] = [
  {
    make: (r) => [r.int(6, 15), r.int(1, 2)],
    en: (a, b) => `A puppy has a mass of ${a} kg. A kitten has a mass of ${b} kg. How much more mass does the puppy have?`,
    es: (a, b) => `La masa de un cachorro es de ${a} kg. La masa de un gatito es de ${b} kg. ¿Cuánta masa más tiene el cachorro?`,
    op: "−",
    unit: ["kg", "kg"],
    plan: ["To compare, subtract the smaller mass from the larger one.", "Para comparar, resta la masa menor de la mayor."],
  },
  {
    make: (r) => [r.int(2, 8), r.int(1, 4)],
    en: (a, b, n) => `A pot has ${a} L of soup. ${n} adds ${b} L of water. How many liters are in the pot now?`,
    es: (a, b, n) => `Una olla tiene ${a} L de sopa. ${n} agrega ${b} L de agua. ¿Cuántos litros hay ahora en la olla?`,
    op: "+",
    unit: ["L", "L"],
    plan: ["Water is put in, so add the two amounts.", "Se agrega agua, así que suma las dos cantidades."],
  },
  {
    make: (r) => [r.int(30, 90), r.int(5, 25)],
    en: (a, b, n) => `A fish tank holds ${a} L of water. ${n} pours out ${b} L to clean the tank. How many liters are left?`,
    es: (a, b, n) => `Una pecera tiene ${a} L de agua. ${n} saca ${b} L para limpiarla. ¿Cuántos litros quedan?`,
    op: "−",
    unit: ["L", "L"],
    plan: ["Water is taken out, so subtract.", "Se saca agua, así que resta."],
  },
  {
    make: (r) => [r.int(10, 20) * 50, r.int(120, 480)],
    en: (a, b, n) => `A bag has ${a} g of flour. ${n} uses ${b} g to make bread. How many grams of flour are left?`,
    es: (a, b, n) => `Una bolsa tiene ${a} g de harina. ${n} usa ${b} g para hacer pan. ¿Cuántos gramos de harina quedan?`,
    op: "−",
    unit: ["g", "g"],
    plan: ["Some flour is used up, so subtract.", "Se usa parte de la harina, así que resta."],
  },
  {
    make: (r) => [r.int(500, 700), r.int(150, 299)],
    en: (a, b) => `A melon has a mass of ${a} g. A bunch of grapes has a mass of ${b} g. What is their total mass?`,
    es: (a, b) => `La masa de un melón es de ${a} g. La masa de un racimo de uvas es de ${b} g. ¿Cuál es la masa total de los dos?`,
    op: "+",
    unit: ["g", "g"],
    plan: ["The total puts the two masses together, so add.", "El total junta las dos masas, así que suma."],
  },
  {
    make: (r) => [r.int(2, 9), r.int(1, 9)],
    en: (a, b) => `The art room has ${a} L of blue paint and ${b} L of red paint. How many liters of paint are there in all?`,
    es: (a, b) => `El salón de arte tiene ${a} L de pintura azul y ${b} L de pintura roja. ¿Cuántos litros de pintura hay en total?`,
    op: "+",
    unit: ["L", "L"],
    plan: ["In all means put the amounts together, so add.", "En total significa juntar las cantidades, así que suma."],
  },
  {
    make: (r) => [r.int(6, 9), r.int(2, 4)],
    en: (a, b) => `A guitar in its case has a mass of ${a} kg. The guitar alone has a mass of ${b} kg. What is the mass of the empty case?`,
    es: (a, b) => `Una guitarra dentro de su estuche tiene una masa de ${a} kg. La guitarra sola tiene una masa de ${b} kg. ¿Cuál es la masa del estuche vacío?`,
    op: "−",
    unit: ["kg", "kg"],
    plan: ["Take the guitar's mass away from the total.", "Quita la masa de la guitarra del total."],
  },
];
const MASS_MULT_DIV: Measure[] = [
  {
    make: (r) => [r.int(2, 4), r.int(3, 9)],
    en: (s, g) => `Each bottle holds ${s} L of water. How many liters do ${g} bottles hold?`,
    es: (s, g) => `En cada botella caben ${s} L de agua. ¿Cuántos litros caben en ${g} botellas?`,
    op: "×",
    unit: ["L", "L"],
    plan: ["There are equal groups, so multiply.", "Hay grupos iguales, así que multiplica."],
  },
  {
    make: (r) => [r.int(2, 5), r.int(3, 9)],
    en: (s, g) => `A bag of rice has a mass of ${s} kg. What is the mass of ${g} bags?`,
    es: (s, g) => `Una bolsa de arroz tiene una masa de ${s} kg. ¿Cuál es la masa de ${g} bolsas?`,
    op: "×",
    unit: ["kg", "kg"],
    plan: ["Each bag has the same mass, so multiply.", "Cada bolsa tiene la misma masa, así que multiplica."],
  },
  {
    make: (r) => {
      const k = r.int(2, 9);
      return [k * r.int(2, 5), k];
    },
    en: (t, k) => `${t} L of juice is poured equally into ${k} pitchers. How many liters are in each pitcher?`,
    es: (t, k) => `Se reparten ${t} L de jugo en partes iguales en ${k} jarras. ¿Cuántos litros hay en cada jarra?`,
    op: "÷",
    unit: ["L", "L"],
    plan: ["The juice is shared equally, so divide.", "El jugo se reparte en partes iguales, así que divide."],
  },
  {
    make: (r) => {
      const k = r.int(2, 9);
      return [k * r.int(2, 9), k];
    },
    en: (t, k) => `${t} kg of dog food is split equally into ${k} bins. What is the mass of the food in each bin?`,
    es: (t, k) => `Se reparten ${t} kg de comida para perro en partes iguales en ${k} recipientes. ¿Cuál es la masa de la comida en cada recipiente?`,
    op: "÷",
    unit: ["kg", "kg"],
    plan: ["The food is split equally, so divide.", "La comida se reparte en partes iguales, así que divide."],
  },
  {
    make: (r) => {
      const s = r.int(2, 5);
      return [s * r.int(2, 9), s];
    },
    en: (t, s, n) => `A watering can holds ${s} L. How many times must ${n} fill it to pour ${t} L on the garden?`,
    es: (t, s, n) => `En una regadera caben ${s} L. ¿Cuántas veces debe llenarla ${n} para echar ${t} L en el jardín?`,
    op: "÷",
    unit: ["times", "veces"],
    plan: ["Find how many groups of the can's size make the total, so divide.", "Busca cuántas regaderas llenas forman el total, así que divide."],
  },
  {
    make: (r) => [r.int(3, 9), r.int(1, 3)],
    en: (g, s, n) => `${n} makes ${g} clay pots in art class. Each pot uses ${s} kg of clay. How many kilograms of clay does ${n} use?`,
    es: (g, s, n) => `${n} hace ${g} macetas de barro en la clase de arte. Cada maceta lleva ${s} kg de barro. ¿Cuántos kilogramos de barro usa ${n}?`,
    op: "×",
    unit: ["kg", "kg"],
    plan: ["Each pot uses the same amount, so multiply.", "Cada maceta lleva la misma cantidad, así que multiplica."],
  },
];

// ---------- grade 3 graphs ----------

type Cat = Pair;
const GRAPHS: { en: string; es: string; cats: Cat[] }[] = [
  { en: "favorite fruit", es: "la fruta favorita", cats: [["apples", "las manzanas"], ["bananas", "los plátanos"], ["grapes", "las uvas"], ["oranges", "las naranjas"], ["mangoes", "los mangos"]] },
  { en: "favorite pet", es: "la mascota favorita", cats: [["dogs", "los perros"], ["cats", "los gatos"], ["fish", "los peces"], ["birds", "los pájaros"], ["rabbits", "los conejos"]] },
  { en: "favorite sport", es: "el deporte favorito", cats: [["soccer", "el fútbol"], ["basketball", "el básquetbol"], ["swimming", "la natación"], ["baseball", "el béisbol"], ["tennis", "el tenis"]] },
  { en: "favorite instrument", es: "el instrumento favorito", cats: [["piano", "el piano"], ["guitar", "la guitarra"], ["drums", "la batería"], ["violin", "el violín"], ["flute", "la flauta"]] },
  { en: "favorite planet", es: "el planeta favorito", cats: [["Mars", "Marte"], ["Jupiter", "Júpiter"], ["Saturn", "Saturno"], ["Venus", "Venus"], ["Neptune", "Neptuno"]] },
  { en: "favorite board game", es: "el juego de mesa favorito", cats: [["chess", "el ajedrez"], ["checkers", "las damas"], ["dominoes", "el dominó"], ["bingo", "el bingo"]] },
  { en: "favorite art activity", es: "la actividad de arte favorita", cats: [["painting", "la pintura"], ["drawing", "el dibujo"], ["clay", "la plastilina"], ["collage", "el collage"]] },
];

// ---------- grade 4 place value ----------

/** Place names by power of ten: [English plural, Spanish plural, English singular, Spanish singular]. */
const PLACE6: [string, string, string, string][] = [
  ["ones", "unidades", "one", "unidad"],
  ["tens", "decenas", "ten", "decena"],
  ["hundreds", "centenas", "hundred", "centena"],
  ["thousands", "unidades de millar", "thousand", "unidad de millar"],
  ["ten thousands", "decenas de millar", "ten thousand", "decena de millar"],
  ["hundred thousands", "centenas de millar", "hundred thousand", "centena de millar"],
];
const digitAt = (n: number, p: number) => Math.floor(n / 10 ** p) % 10;
/** Rounds n to the nearest 10^p, halves up. */
const roundTo = (n: number, p: number) => (p <= 0 ? n : Math.floor((n + 5 * 10 ** (p - 1)) / 10 ** p) * 10 ** p);

// ---------- grade 4 word problems ----------

type Times = { en: (s: number, k: number, a: string, b: string) => string; es: (s: number, k: number, a: string, b: string) => string; unit: Pair };
/** Find the larger amount: k times as many as s. */
const TIMES_BIGGER: Times[] = [
  {
    en: (s, k, a, b) => `${a} has ${s} stickers. ${b} has ${k} times as many stickers as ${a}. How many stickers does ${b} have?`,
    es: (s, k, a, b) => `${a} tiene ${s} calcomanías. ${b} tiene ${k} veces la cantidad de calcomanías que tiene ${a}. ¿Cuántas calcomanías tiene ${b}?`,
    unit: ["stickers", "calcomanías"],
  },
  {
    en: (s, k) => `A puppy weighs ${s} pounds. A grown dog weighs ${k} times as much as the puppy. How many pounds does the grown dog weigh?`,
    es: (s, k) => `Un cachorro pesa ${s} libras. Un perro adulto pesa ${k} veces lo que pesa el cachorro. ¿Cuántas libras pesa el perro adulto?`,
    unit: ["pounds", "libras"],
  },
  {
    en: (s, k) => `The blue rope is ${s} feet long. The red rope is ${k} times as long as the blue rope. How long is the red rope?`,
    es: (s, k) => `La cuerda azul mide ${s} pies. La cuerda roja mide ${k} veces lo que mide la cuerda azul. ¿Cuánto mide la cuerda roja?`,
    unit: ["feet", "pies"],
  },
  {
    en: (s, k, a, b) => `${a} scored ${s} points in a game. ${b} scored ${k} times as many points. How many points did ${b} score?`,
    es: (s, k, a, b) => `${a} anotó ${s} puntos en un juego. ${b} anotó ${k} veces esa cantidad de puntos. ¿Cuántos puntos anotó ${b}?`,
    unit: ["points", "puntos"],
  },
  {
    en: (s, k) => `A small telescope shows ${s} stars in one patch of sky. A large telescope shows ${k} times as many stars. How many stars does the large telescope show?`,
    es: (s, k) => `Un telescopio pequeño muestra ${s} estrellas en una parte del cielo. Un telescopio grande muestra ${k} veces esa cantidad de estrellas. ¿Cuántas estrellas muestra el telescopio grande?`,
    unit: ["stars", "estrellas"],
  },
  {
    en: (s, k) => `A song is ${s} minutes long. A concert is ${k} times as long as the song. How many minutes long is the concert?`,
    es: (s, k) => `Una canción dura ${s} minutos. Un concierto dura ${k} veces lo que dura la canción. ¿Cuántos minutos dura el concierto?`,
    unit: ["minutes", "minutos"],
  },
  { en: (s, k) => `What number is ${k} times as many as ${s}?`, es: (s, k) => `¿Qué número es ${k} veces ${s}?`, unit: ["", ""] },
];
/** Find the smaller amount: t is k times as many as it. */
const TIMES_SMALLER: Times[] = [
  {
    en: (t, k, a, b) => `${b} has ${t} marbles. That is ${k} times as many marbles as ${a} has. How many marbles does ${a} have?`,
    es: (t, k, a, b) => `${b} tiene ${t} canicas. Eso es ${k} veces la cantidad de canicas que tiene ${a}. ¿Cuántas canicas tiene ${a}?`,
    unit: ["marbles", "canicas"],
  },
  {
    en: (t, k) => `A tree is ${t} feet tall. It is ${k} times as tall as a fence. How tall is the fence?`,
    es: (t, k) => `Un árbol mide ${t} pies de alto. Mide ${k} veces lo que mide una cerca. ¿Cuánto mide la cerca?`,
    unit: ["feet", "pies"],
  },
  {
    en: (t, k) => `A model rocket is ${t} inches tall. It is ${k} times as tall as a toy astronaut. How tall is the toy astronaut?`,
    es: (t, k) => `Un cohete a escala mide ${t} pulgadas de alto. Mide ${k} veces lo que mide un astronauta de juguete. ¿Cuánto mide el astronauta de juguete?`,
    unit: ["inches", "pulgadas"],
  },
  { en: (t, k) => `${t} is ${k} times as many as what number?`, es: (t, k) => `¿${t} es ${k} veces qué número?`, unit: ["", ""] },
];
/** How many times as much: t compared with s. */
const TIMES_FACTOR: Times[] = [
  {
    en: (s, t) => `A ball costs $${s}. A board game costs $${t}. How many times as much as the ball does the board game cost?`,
    es: (s, t) => `Una pelota cuesta $${s}. Un juego de mesa cuesta $${t}. ¿Por cuánto hay que multiplicar el precio de la pelota para obtener el precio del juego?`,
    unit: ["times as much", "veces"],
  },
  {
    en: (s, t, a) => `${a} read ${s} pages on Monday and ${t} pages on Saturday. How many times as many pages did ${a} read on Saturday as on Monday?`,
    es: (s, t, a) => `${a} leyó ${s} páginas el lunes y ${t} páginas el sábado. ¿Por cuánto hay que multiplicar las páginas del lunes para obtener las del sábado?`,
    unit: ["times as many", "veces"],
  },
];

type Rem = { mode: "up" | "down" | "left"; make: (r: Rng) => { x: number[]; total: number; k: number }; en: (x: number[], n: string) => string; es: (x: number[], n: string) => string; first?: (x: number[]) => string; unit: Pair };
/** total = k·q + r with 1 ≤ r < k (at least 2 when the question asks for the leftover). */
function remSplit(r: Rng, k: number, minRem = 1) {
  return k * r.int(3, 12) + r.int(minRem, k - 1);
}
const REMAINDER_STORIES: Rem[] = [
  {
    mode: "up",
    make: (r) => {
      const k = r.int(4, 9), total = remSplit(r, k);
      return { x: [total, k], total, k };
    },
    en: ([t, k]) => `${t} students are going on a field trip. Each van holds ${k} students. How many vans are needed?`,
    es: ([t, k]) => `${t} estudiantes van de excursión. En cada camioneta caben ${k} estudiantes. ¿Cuántas camionetas se necesitan?`,
    unit: ["vans", "camionetas"],
  },
  {
    mode: "down",
    make: (r) => {
      const k = r.int(3, 9), total = remSplit(r, k);
      return { x: [total, k], total, k };
    },
    en: ([t, k], n) => `${n} has ${t} beads. Each bracelet uses ${k} beads. How many bracelets can ${n} make?`,
    es: ([t, k], n) => `${n} tiene ${t} cuentas. Cada pulsera lleva ${k} cuentas. ¿Cuántas pulseras puede hacer ${n}?`,
    unit: ["bracelets", "pulseras"],
  },
  {
    mode: "left",
    make: (r) => {
      const k = r.int(4, 9), total = remSplit(r, k, 2);
      return { x: [total, k], total, k };
    },
    en: ([t, k]) => `A baker packs ${t} cookies into boxes of ${k}. How many cookies are left over?`,
    es: ([t, k]) => `Un panadero empaca ${t} galletas en cajas de ${k}. ¿Cuántas galletas sobran?`,
    unit: ["cookies", "galletas"],
  },
  {
    mode: "up",
    make: (r) => {
      const k = r.int(4, 9), total = remSplit(r, k), a = r.int(3, total - 3);
      return { x: [a, total - a, k], total, k };
    },
    en: ([a, b, k], n) => `${n} has ${a} red marbles and ${b} blue marbles. Each bag holds ${k} marbles. How many bags does ${n} need for all the marbles?`,
    es: ([a, b, k], n) => `${n} tiene ${a} canicas rojas y ${b} canicas azules. En cada bolsa caben ${k} canicas. ¿Cuántas bolsas necesita para guardar todas las canicas?`,
    first: ([a, b]) => `${a} + ${b} = ${a + b}`,
    unit: ["bags", "bolsas"],
  },
  {
    mode: "down",
    make: (r) => {
      for (;;) {
        const g = r.int(2, 6), s = r.int(6, 12), k = r.int(4, 9);
        if ((g * s) % k !== 0 && g * s > k) return { x: [g, s, k], total: g * s, k };
      }
    },
    en: ([g, s, k]) => `A baker makes ${g} trays of muffins with ${s} muffins on each tray. A box holds ${k} muffins. How many boxes can be filled all the way?`,
    es: ([g, s, k]) => `Un panadero hace ${g} bandejas de panquecitos con ${s} panquecitos en cada bandeja. En una caja caben ${k} panquecitos. ¿Cuántas cajas se pueden llenar completas?`,
    first: ([g, s]) => `${g} × ${s} = ${g * s}`,
    unit: ["boxes", "cajas"],
  },
  {
    mode: "down",
    make: (r) => {
      const k = r.int(5, 9), total = remSplit(r, k);
      return { x: [total, k], total, k };
    },
    en: ([t, k]) => `${t} chairs are set up in rows of ${k} for a concert. How many full rows are there?`,
    es: ([t, k]) => `Se acomodan ${t} sillas en filas de ${k} para un concierto. ¿Cuántas filas completas hay?`,
    unit: ["rows", "filas"],
  },
  {
    mode: "up",
    make: (r) => {
      const k = r.int(5, 9), total = remSplit(r, k);
      return { x: [total, k], total, k };
    },
    en: ([t, k]) => `${t} kids sign up for soccer. Each team can have at most ${k} kids. How many teams are needed so that everyone plays?`,
    es: ([t, k]) => `${t} niños se inscriben en fútbol. Cada equipo puede tener como máximo ${k} niños. ¿Cuántos equipos se necesitan para que todos jueguen?`,
    unit: ["teams", "equipos"],
  },
  {
    mode: "left",
    make: (r) => {
      const k = r.int(4, 9), total = remSplit(r, k, 2), a = r.int(3, total - 3);
      return { x: [a, total - a, k], total, k };
    },
    en: ([a, b, k], n) => `${n} has ${a} stickers and buys ${b} more. ${n} shares them equally among ${k} friends. How many stickers are left over?`,
    es: ([a, b, k], n) => `${n} tiene ${a} calcomanías y compra ${b} más. Las reparte en partes iguales entre ${k} amigos. ¿Cuántas calcomanías sobran?`,
    first: ([a, b]) => `${a} + ${b} = ${a + b}`,
    unit: ["stickers", "calcomanías"],
  },
];

// ---------- grade 4 fractions and decimals ----------

const DENS4 = [2, 3, 4, 5, 6, 8, 10, 12];
/**
 * A fraction-of-a-unit story. `dens` are the denominators that fit the setting (measuring cups come in halves,
 * thirds, fourths and eighths). `sayEs` gets the whole Spanish amount ("3 cuartos de taza", "media taza").
 */
type FracStory = { en: [string, string]; es: [string, string]; sayEn: (f: string, w: number, n: string) => string; sayEs: (f: string, w: number, n: string) => string; esNoun: string; dens: number[]; unit: Amount };
/** A unit for fraction amounts: [English one, English many, Spanish one, Spanish many]. */
type Amount = [string, string, string, string];
/** "3/4 mile", "1 mile", "2 1/4 miles" / "3/4 de milla", "1 milla", "2 1/4 millas". */
function amount(n: number, d: number, u: Amount, locale: Locale) {
  const x = simplest(n, d);
  if (n < d) return tr(locale, `${x} ${u[0]}`, `${x} de ${u[2]}`);
  return n === d ? tr(locale, `1 ${u[0]}`, `1 ${u[2]}`) : tr(locale, `${x} ${u[1]}`, `${x} ${u[3]}`);
}
/** Spanish nouns that take "media" for one half: "media taza", but "medio pie". */
const FEM_ES = new Set(["taza", "milla", "hora", "pizza", "pared", "pulgada", "vuelta", "yarda", "libra", "pinta"]);
/** Spanish one half of a noun, dropping its article: "media taza de jugo?", "medio pie?", "media pizza". */
function halfEs(noun: string) {
  const bare = noun.replace(/^una? /, "");
  return `${FEM_ES.has(bare.split(/[ ?.,]/)[0]) ? "media" : "medio"} ${bare}`;
}
/** A fraction of a unit read aloud in Spanish: "3 cuartos de taza", and "media taza", not "un medio de taza". */
const ofEs = (n: number, d: number, noun: string) => (n === 1 && d === 2 ? halfEs(noun) : `${sayFrac(n, d, "es")} de ${noun}`);
/** Prompt halves around the fraction: [before, after]; {w} is the whole number, {n} a name. */
const FRAC_TIMES_STORIES: FracStory[] = [
  {
    en: ["Each bowl of oatmeal uses ", " cup of oats. How many cups of oats do {w} bowls use?"],
    es: ["Cada plato de avena lleva ", " de taza de avena. ¿Cuántas tazas de avena llevan {w} platos?"],
    sayEn: (f, w) => `Each bowl of oatmeal uses ${f} cup of oats. How many cups of oats do ${w} bowls use?`,
    sayEs: (f, w) => `Cada plato de avena lleva ${f} de avena. ¿Cuántas tazas de avena llevan ${w} platos?`,
    esNoun: "taza",
    dens: [2, 3, 4, 8],
    unit: ["cup", "cups", "taza", "tazas"],
  },
  {
    en: ["{n} runs ", " of a mile each day. How many miles does {n} run in {w} days?"],
    es: ["{n} corre ", " de milla cada día. ¿Cuántas millas corre en {w} días?"],
    sayEn: (f, w, n) => `${n} runs ${f} of a mile each day. How many miles does ${n} run in ${w} days?`,
    sayEs: (f, w, n) => `${n} corre ${f} cada día. ¿Cuántas millas corre en ${w} días?`,
    esNoun: "milla",
    dens: [2, 4, 5, 8, 10],
    unit: ["mile", "miles", "milla", "millas"],
  },
  {
    en: ["Each poster uses ", " of a jar of paint. How many jars of paint do {w} posters use?"],
    es: ["Cada cartel usa ", " de frasco de pintura. ¿Cuántos frascos de pintura usan {w} carteles?"],
    sayEn: (f, w) => `Each poster uses ${f} of a jar of paint. How many jars of paint do ${w} posters use?`,
    sayEs: (f, w) => `Cada cartel usa ${f} de pintura. ¿Cuántos frascos de pintura usan ${w} carteles?`,
    esNoun: "frasco",
    dens: [2, 3, 4, 5, 6, 8, 10],
    unit: ["jar", "jars", "frasco", "frascos"],
  },
  {
    en: ["A puppy eats ", " cup of food at each meal. How many cups of food does it eat in {w} meals?"],
    es: ["Un cachorro come ", " de taza de alimento en cada comida. ¿Cuántas tazas de alimento come en {w} comidas?"],
    sayEn: (f, w) => `A puppy eats ${f} cup of food at each meal. How many cups of food does it eat in ${w} meals?`,
    sayEs: (f, w) => `Un cachorro come ${f} de alimento en cada comida. ¿Cuántas tazas de alimento come en ${w} comidas?`,
    esNoun: "taza",
    dens: [2, 3, 4, 8],
    unit: ["cup", "cups", "taza", "tazas"],
  },
  {
    en: ["{n} practices guitar for ", " of an hour each day. How many hours does {n} practice in {w} days?"],
    es: ["{n} practica guitarra ", " de hora cada día. ¿Cuántas horas practica en {w} días?"],
    sayEn: (f, w, n) => `${n} practices guitar for ${f} of an hour each day. How many hours does ${n} practice in ${w} days?`,
    sayEs: (f, w, n) => `${n} practica guitarra ${f} cada día. ¿Cuántas horas practica en ${w} días?`,
    esNoun: "hora",
    dens: [2, 3, 4, 5, 6, 10, 12],
    unit: ["hour", "hours", "hora", "horas"],
  },
  {
    en: ["Each model rocket needs ", " of a meter of tape. How many meters of tape do {w} rockets need?"],
    es: ["Cada cohete a escala necesita ", " de metro de cinta. ¿Cuántos metros de cinta necesitan {w} cohetes?"],
    sayEn: (f, w) => `Each model rocket needs ${f} of a meter of tape. How many meters of tape do ${w} rockets need?`,
    sayEs: (f, w) => `Cada cohete a escala necesita ${f} de cinta. ¿Cuántos metros de cinta necesitan ${w} cohetes?`,
    esNoun: "metro",
    dens: [2, 4, 5, 10],
    unit: ["meter", "meters", "metro", "metros"],
  },
];
const fill = (s: string, w: number, n: string) => s.replace(/\{w\}/g, String(w)).replace(/\{n\}/g, n);

type DecCompare = { en: (a: string, x: string, b: string, y: string) => string; es: (a: string, x: string, b: string, y: string) => string; same: Pair; whole: number };
const DEC_COMPARE_STORIES: DecCompare[] = [
  { en: (a, x, b, y) => `${a} jumped ${x} m. ${b} jumped ${y} m. Who jumped farther?`, es: (a, x, b, y) => `${a} saltó ${x} m. ${b} saltó ${y} m. ¿Quién saltó más lejos?`, same: ["They jumped the same distance", "Saltaron la misma distancia"], whole: 2 },
  { en: (a, x, b, y) => `${a} drank ${x} L of water. ${b} drank ${y} L. Who drank more?`, es: (a, x, b, y) => `${a} tomó ${x} L de agua. ${b} tomó ${y} L. ¿Quién tomó más?`, same: ["They drank the same amount", "Tomaron la misma cantidad"], whole: 1 },
  {
    en: (a, x, b, y) => `${a}'s ribbon is ${x} m long. ${b}'s ribbon is ${y} m long. Whose ribbon is longer?`,
    es: (a, x, b, y) => `El listón de ${a} mide ${x} m. El listón de ${b} mide ${y} m. ¿De quién es el listón más largo?`,
    same: ["They are the same length", "Miden lo mismo"],
    whole: 2,
  },
  {
    en: (a, x, b, y) => `${a}'s sunflower grew ${x} m this month. ${b}'s sunflower grew ${y} m. Whose sunflower grew more?`,
    es: (a, x, b, y) => `El girasol de ${a} creció ${x} m este mes. El girasol de ${b} creció ${y} m. ¿El girasol de quién creció más?`,
    same: ["They grew the same amount", "Crecieron lo mismo"],
    whole: 0,
  },
  { en: (a, x, b, y) => `${a} swam ${x} km. ${b} swam ${y} km. Who swam farther?`, es: (a, x, b, y) => `${a} nadó ${x} km. ${b} nadó ${y} km. ¿Quién nadó más lejos?`, same: ["They swam the same distance", "Nadaron la misma distancia"], whole: 2 },
];

// ---------- grade 4 measurement ----------

type UnitName = [enOne: string, enMany: string, esOne: string, esMany: string, esFem: boolean];
const U = {
  ft: ["foot", "feet", "pie", "pies", false],
  inch: ["inch", "inches", "pulgada", "pulgadas", true],
  yd: ["yard", "yards", "yarda", "yardas", true],
  lb: ["pound", "pounds", "libra", "libras", true],
  oz: ["ounce", "ounces", "onza", "onzas", true],
  hr: ["hour", "hours", "hora", "horas", true],
  min: ["minute", "minutes", "minuto", "minutos", false],
  sec: ["second", "seconds", "segundo", "segundos", false],
  km: ["kilometer", "kilometers", "kilómetro", "kilómetros", false],
  m: ["meter", "meters", "metro", "metros", false],
  cm: ["centimeter", "centimeters", "centímetro", "centímetros", false],
  mm: ["millimeter", "millimeters", "milímetro", "milímetros", false],
  kg: ["kilogram", "kilograms", "kilogramo", "kilogramos", false],
  g: ["gram", "grams", "gramo", "gramos", false],
  L: ["liter", "liters", "litro", "litros", false],
  mL: ["milliliter", "milliliters", "mililitro", "mililitros", false],
  cup: ["cup", "cups", "taza", "tazas", true],
  pt: ["pint", "pints", "pinta", "pintas", true],
  qt: ["quart", "quarts", "cuarto de galón", "cuartos de galón", false],
  gal: ["gallon", "gallons", "galón", "galones", false],
} satisfies Record<string, UnitName>;
/** "1 foot", "3 feet" / "1 pie", "3 pies"; `many` forces the plural (for "how many inches"). */
const uName = (u: UnitName, n: number, locale: Locale) => tr(locale, n === 1 ? u[0] : u[1], n === 1 ? u[2] : u[3]);
const uMany = (u: UnitName, locale: Locale) => tr(locale, u[1], u[3]);
const cuantos = (u: UnitName) => (u[4] ? "Cuántas" : "Cuántos");

/** A conversion: 1 big = f small. `wf` is the factor a learner most often uses by mistake, with its tag. */
type Conv = { big: UnitName; small: UnitName; f: number; wf: number; wfWhy: string };
const CONV4: Conv[] = [
  { big: U.ft, small: U.inch, f: 12, wf: 10, wfWhy: "used-the-wrong-factor" },
  { big: U.yd, small: U.ft, f: 3, wf: 12, wfWhy: "mixed-up-the-factors" },
  { big: U.lb, small: U.oz, f: 16, wf: 12, wfWhy: "mixed-up-the-factors" },
  { big: U.hr, small: U.min, f: 60, wf: 100, wfWhy: "used-100-instead-of-60" },
  { big: U.min, small: U.sec, f: 60, wf: 100, wfWhy: "used-100-instead-of-60" },
  { big: U.km, small: U.m, f: 1000, wf: 100, wfWhy: "used-the-wrong-factor" },
  { big: U.m, small: U.cm, f: 100, wf: 1000, wfWhy: "used-the-wrong-factor" },
  { big: U.kg, small: U.g, f: 1000, wf: 100, wfWhy: "used-the-wrong-factor" },
  { big: U.L, small: U.mL, f: 1000, wf: 100, wfWhy: "used-the-wrong-factor" },
];

type ConvStory = { make: (r: Rng) => number[]; en: (x: number[], n: string) => string; es: (x: number[], n: string) => string; work: (x: number[]) => [string, number, string, number]; plan: Pair; unit: Pair; wrong: (x: number[]) => Miss[] };
const CONVERT_STORIES: ConvStory[] = [
  {
    make: (r) => {
      const n = r.int(3, 8);
      let c = r.int(5, 12 * n - 1);
      while (c % 12 === 0) c = r.int(5, 12 * n - 1);
      return [n, c];
    },
    en: ([n, c], who) => `A ribbon is ${n} feet long. ${who} cuts off ${c} inches. How many inches of ribbon are left?`,
    es: ([n, c], who) => `Un listón mide ${n} pies. ${who} corta ${c} pulgadas. ¿Cuántas pulgadas de listón quedan?`,
    work: ([n, c]) => [`${n} × 12`, 12 * n, `${12 * n} − ${c}`, 12 * n - c],
    plan: ["Change the feet to inches first: 1 foot = 12 inches. Then subtract.", "Primero cambia los pies a pulgadas: 1 pie = 12 pulgadas. Luego resta."],
    unit: ["inches", "pulgadas"],
    wrong: ([n, c]) => [[10 * n - c, "used-the-wrong-factor"], [12 * n + c, "added-instead-of-subtracted"]],
  },
  {
    make: (r) => [r.int(1, 3), r.int(1, 11) * 5],
    en: ([h, m]) => `A movie is ${h} ${pl(h, "hour", "hours")} ${m} minutes long. How many minutes long is the movie?`,
    es: ([h, m]) => `Una película dura ${h} ${pl(h, "hora", "horas")} ${m} minutos. ¿Cuántos minutos dura la película?`,
    work: ([h, m]) => [`${h} × 60`, 60 * h, `${60 * h} + ${m}`, 60 * h + m],
    plan: ["Change the hours to minutes first: 1 hour = 60 minutes. Then add the extra minutes.", "Primero cambia las horas a minutos: 1 hora = 60 minutos. Luego suma los minutos que sobran."],
    unit: ["minutes", "minutos"],
    wrong: ([h, m]) => [[100 * h + m, "used-100-instead-of-60"], [h + m, "added-without-converting"]],
  },
  {
    make: (r) => {
      const n = r.int(2, 5);
      return [n, r.int(1, 10 * n - 1) * 100 + r.int(0, 9) * 10];
    },
    en: ([n, c], who) => `A race is ${n} kilometers long. ${who} has run ${group(c)} meters. How many more meters until the finish?`,
    es: ([n, c], who) => `Una carrera mide ${n} kilómetros. ${who} ha corrido ${group(c)} metros. ¿Cuántos metros le faltan para llegar a la meta?`,
    work: ([n, c]) => [`${n} × 1,000`, 1000 * n, `${group(1000 * n)} − ${group(c)}`, 1000 * n - c],
    plan: ["Change the kilometers to meters first: 1 kilometer = 1,000 meters. Then subtract.", "Primero cambia los kilómetros a metros: 1 kilómetro = 1,000 metros. Luego resta."],
    unit: ["meters", "metros"],
    wrong: ([n, c]) => [[1000 * n + c, "added-instead-of-subtracted"], [100 * n - c, "used-the-wrong-factor"]],
  },
  {
    make: (r) => [r.int(2, 6), r.int(2, 15), r.int(3, 15)],
    en: ([n, m, c]) => `A puppy weighed ${n} pounds ${m} ounces. Then it gained ${c} ounces. How many ounces does it weigh now?`,
    es: ([n, m, c]) => `Un cachorro pesaba ${n} libras ${m} onzas. Luego subió ${c} onzas. ¿Cuántas onzas pesa ahora?`,
    work: ([n, m, c]) => [`${n} × 16`, 16 * n, `${16 * n} + ${m} + ${c}`, 16 * n + m + c],
    plan: ["Change the pounds to ounces first: 1 pound = 16 ounces. Then add all the ounces.", "Primero cambia las libras a onzas: 1 libra = 16 onzas. Luego suma todas las onzas."],
    unit: ["ounces", "onzas"],
    wrong: ([n, m, c]) => [[10 * n + m + c, "used-the-wrong-factor"], [n + m + c, "added-without-converting"]],
  },
  {
    make: (r) => {
      const n = r.int(2, 4);
      return [n, r.int(3, 10 * n - 1) * 50];
    },
    en: ([n, c], who) => `${who} has a jug with ${n} liters of water and pours out ${group(c)} milliliters. How many milliliters are left?`,
    es: ([n, c], who) => `${who} tiene una jarra con ${n} litros de agua y saca ${group(c)} mililitros. ¿Cuántos mililitros quedan?`,
    work: ([n, c]) => [`${n} × 1,000`, 1000 * n, `${group(1000 * n)} − ${group(c)}`, 1000 * n - c],
    plan: ["Change the liters to milliliters first: 1 liter = 1,000 milliliters. Then subtract.", "Primero cambia los litros a mililitros: 1 litro = 1,000 mililitros. Luego resta."],
    unit: ["milliliters", "mililitros"],
    wrong: ([n, c]) => [[1000 * n + c, "added-instead-of-subtracted"], [100 * n - c, "used-the-wrong-factor"]],
  },
  {
    make: (r) =>
      r.pick([
        [15, 4], [15, 8], [20, 3], [20, 6], [20, 9], [30, 2], [30, 4], [30, 6], [30, 8], [45, 4], [45, 8],
      ]),
    en: ([m, d], who) => `${who} practices piano for ${m} minutes each day for ${d} days. How many hours is that?`,
    es: ([m, d], who) => `${who} practica piano ${m} minutos cada día durante ${d} días. ¿Cuántas horas son en total?`,
    work: ([m, d]) => [`${m} × ${d}`, m * d, `${m * d} ÷ 60`, (m * d) / 60],
    plan: ["Find the total minutes first. Then change minutes to hours: 60 minutes = 1 hour.", "Primero encuentra el total de minutos. Luego cambia los minutos a horas: 60 minutos = 1 hora."],
    unit: ["hours", "horas"],
    wrong: ([m, d]) => [[m * d, "did-not-convert"]],
  },
  {
    make: (r) => [r.int(5, 8), r.int(1, 11) * 5],
    en: ([h, m]) => `An astronaut's spacewalk lasted ${h} hours ${m} minutes. How many minutes was that?`,
    es: ([h, m]) => `La caminata espacial de una astronauta duró ${h} horas ${m} minutos. ¿Cuántos minutos fueron?`,
    work: ([h, m]) => [`${h} × 60`, 60 * h, `${60 * h} + ${m}`, 60 * h + m],
    plan: ["Change the hours to minutes first: 1 hour = 60 minutes. Then add the extra minutes.", "Primero cambia las horas a minutos: 1 hora = 60 minutos. Luego suma los minutos que sobran."],
    unit: ["minutes", "minutos"],
    wrong: ([h, m]) => [[100 * h + m, "used-100-instead-of-60"], [h + m, "added-without-converting"]],
  },
];

/** A rectangle story with sizes that fit it (see RECT_PLACES). */
type AreaStory = { kind: "area" | "per"; en: (l: number, w: number, u: string) => string; es: (l: number, w: number, u: string, sq: string, cu: string) => string; sizes: Size[]; thin: number };
const AREA_STORIES: AreaStory[] = [
  {
    kind: "per",
    en: (l, w, u) => `A garden is ${l} ${u} long and ${w} ${u} wide. How many ${u} of fence go all the way around it?`,
    es: (l, w, u, _sq, cu) => `Un jardín mide ${l} ${u} de largo y ${w} ${u} de ancho. ¿${cu} ${u} de cerca se necesitan para rodearlo?`,
    sizes: [[FT, 10, 40], [M, 5, 20]],
    thin: 1 / 4,
  },
  {
    kind: "area",
    en: (l, w, u) => `A rug is ${l} ${u} long and ${w} ${u} wide. What is its area in square ${u}?`,
    es: (l, w, u, sq) => `Un tapete mide ${l} ${u} de largo y ${w} ${u} de ancho. ¿Cuál es su área en ${sq}?`,
    sizes: [[FT, 5, 12]],
    thin: 1 / 2,
  },
  {
    kind: "per",
    en: (l, w, u) => `A dog pen is ${l} ${u} long and ${w} ${u} wide. How many ${u} of fence does it need all the way around?`,
    es: (l, w, u, _sq, cu) => `Un corral para perros mide ${l} ${u} de largo y ${w} ${u} de ancho. ¿${cu} ${u} de cerca necesita para rodearlo?`,
    sizes: [[FT, 8, 30], [M, 3, 12]],
    thin: 1 / 3,
  },
  {
    kind: "area",
    en: (l, w, u) => `A stage floor is ${l} ${u} long and ${w} ${u} wide. How many square ${u} of floor is that?`,
    es: (l, w, u, sq, cu) => `El piso de un escenario mide ${l} ${u} de largo y ${w} ${u} de ancho. ¿${cu} ${sq} de piso son?`,
    sizes: [[FT, 12, 30], [M, 5, 12]],
    thin: 1 / 2,
  },
  {
    kind: "per",
    en: (l, w, u) => `A poster is ${l} ${u} long and ${w} ${u} wide. How many ${u} of ribbon go around its edge?`,
    es: (l, w, u, _sq, cu) => `Un cartel mide ${l} ${u} de largo y ${w} ${u} de ancho. ¿${cu} ${u} de listón se necesitan para rodear su borde?`,
    sizes: [[IN, 12, 36], [CM, 30, 90]],
    thin: 2 / 3,
  },
  {
    kind: "area",
    en: (l, w, u) => `A game board is ${l} ${u} long and ${w} ${u} wide. What is its area in square ${u}?`,
    es: (l, w, u, sq) => `Un tablero de juego mide ${l} ${u} de largo y ${w} ${u} de ancho. ¿Cuál es su área en ${sq}?`,
    sizes: [[IN, 10, 20], [CM, 20, 40]],
    thin: 2 / 3,
  },
];

// ---------- grade 4 symmetry (draft bank) ----------

type Bi = { en: string; es: string };
/** Yes/no: does it have a line of symmetry? `tag` names the slip behind the wrong answer. */
type SymYes = { q: Bi; yes: boolean; tag: string; clue: Bi; look: Bi; why: Bi };
const letterQ = (L: string): Bi => ({
  en: `Think of the capital letter ${L} in plain block print. Does it have a line of symmetry?`,
  es: `Piensa en la letra mayúscula ${L} en letra de molde sencilla. ¿Tiene un eje de simetría?`,
});
const vertLetter = (L: string): SymYes => ({
  q: letterQ(L),
  yes: true,
  tag: "missed-the-fold-line",
  clue: { en: `Try a line from top to bottom through the middle of ${L}.`, es: `Prueba una línea de arriba abajo por el centro de la ${L}.` },
  look: { en: `Compare the left half of ${L} with the right half.`, es: `Compara la mitad izquierda de la ${L} con la mitad derecha.` },
  why: { en: `A line straight down the middle folds ${L} into two matching halves.`, es: `Una línea vertical por el centro dobla la ${L} en dos mitades iguales.` },
});
const noLetter = (L: string): SymYes => ({
  q: letterQ(L),
  yes: false,
  tag: "halves-do-not-match",
  clue: { en: `Try folding ${L} from top to bottom, and then from side to side.`, es: `Prueba doblar la ${L} de arriba abajo y luego de lado a lado.` },
  look: { en: `Compare the top half of ${L} with the bottom half, and the left half with the right half.`, es: `Compara la mitad de arriba de la ${L} con la de abajo, y la mitad izquierda con la derecha.` },
  why: { en: `No fold line makes the two halves of ${L} match.`, es: `Ningún doblez hace que las dos mitades de la ${L} coincidan.` },
});
const turnLetter = (L: string): SymYes => ({
  q: letterQ(L),
  yes: false,
  tag: "turn-symmetry-is-not-line-symmetry",
  clue: { en: `${L} looks the same after a half turn, but turning is not folding. Try folding it.`, es: `La ${L} se ve igual después de media vuelta, pero girar no es doblar. Prueba doblarla.` },
  look: { en: `Fold ${L} top to bottom, then side to side. Do the halves land on each other?`, es: `Dobla la ${L} de arriba abajo y luego de lado a lado. ¿Las mitades caen una sobre la otra?` },
  why: { en: `${L} has turn symmetry, but no fold line makes its halves match.`, es: `La ${L} tiene simetría de giro, pero ningún doblez hace coincidir sus mitades.` },
});
export const SYMMETRY_YES_NO: SymYes[] = [
  ...["A", "M", "T", "U", "V", "W", "Y"].map(vertLetter),
  ...["F", "G", "J", "L", "P", "R"].map(noLetter),
  ...["N", "S", "Z"].map(turnLetter),
  {
    q: { en: "Does a square have a line of symmetry?", es: "¿Un cuadrado tiene un eje de simetría?" },
    yes: true,
    tag: "missed-the-fold-line",
    clue: { en: "Try folding the square in half from top to bottom.", es: "Prueba doblar el cuadrado por la mitad, de arriba abajo." },
    look: { en: "Fold it top to bottom: does the top edge land on the bottom edge?", es: "Dóblalo de arriba abajo: ¿el borde de arriba cae sobre el de abajo?" },
    why: { en: "Folding a square in half makes two matching halves. It has 4 lines of symmetry.", es: "Al doblar un cuadrado por la mitad quedan dos mitades iguales. Tiene 4 ejes de simetría." },
  },
  {
    q: { en: "Does a circle have a line of symmetry?", es: "¿Un círculo tiene un eje de simetría?" },
    yes: true,
    tag: "missed-the-fold-line",
    clue: { en: "Try any line through the center of the circle.", es: "Prueba cualquier línea que pase por el centro del círculo." },
    look: { en: "Fold a circle through its center: compare the two halves.", es: "Dobla un círculo por su centro: compara las dos mitades." },
    why: { en: "Every line through the center folds a circle into matching halves.", es: "Cualquier línea que pasa por el centro dobla el círculo en dos mitades iguales." },
  },
  {
    q: { en: "Does a heart shape have a line of symmetry?", es: "¿La figura de un corazón tiene un eje de simetría?" },
    yes: true,
    tag: "missed-the-fold-line",
    clue: { en: "Try a line from the dip at the top down to the point at the bottom.", es: "Prueba una línea desde la hendidura de arriba hasta la punta de abajo." },
    look: { en: "Compare the left side of the heart with the right side.", es: "Compara el lado izquierdo del corazón con el derecho." },
    why: { en: "The line from the top dip to the bottom point folds a heart into matching halves.", es: "La línea de la hendidura de arriba a la punta de abajo dobla el corazón en dos mitades iguales." },
  },
  {
    q: { en: "Does an isosceles triangle (two sides the same length) have a line of symmetry?", es: "¿Un triángulo isósceles (con dos lados de la misma longitud) tiene un eje de simetría?" },
    yes: true,
    tag: "missed-the-fold-line",
    clue: { en: "Try the line from the corner between the two equal sides.", es: "Prueba la línea que sale de la esquina entre los dos lados iguales." },
    look: { en: "Fold along that line: the two equal sides land on each other.", es: "Dobla por esa línea: los dos lados iguales caen uno sobre el otro." },
    why: { en: "The line from the corner between the equal sides is a line of symmetry.", es: "La línea que sale de la esquina entre los lados iguales es un eje de simetría." },
  },
  {
    q: { en: "Does a scalene triangle (all three sides different lengths) have a line of symmetry?", es: "¿Un triángulo escaleno (con sus tres lados de distinta longitud) tiene un eje de simetría?" },
    yes: false,
    tag: "halves-do-not-match",
    clue: { en: "A fold would have to put one side on top of another side of the same length.", es: "Un doblez tendría que poner un lado sobre otro lado de la misma longitud." },
    look: { en: "No two sides have the same length.", es: "No hay dos lados de la misma longitud." },
    why: { en: "Every fold would put a side on a side of a different length, so the halves never match.", es: "Cualquier doblez pondría un lado sobre otro de distinta longitud, así que las mitades nunca coinciden." },
  },
  {
    q: { en: "Does a parallelogram with no right angles and two different side lengths have a line of symmetry?", es: "¿Un paralelogramo sin ángulos rectos y con lados de dos longitudes distintas tiene un eje de simetría?" },
    yes: false,
    tag: "diagonal-is-not-a-fold-line",
    clue: { en: "A diagonal cuts it into two equal pieces. Would those pieces land on each other if you folded?", es: "Una diagonal lo corta en dos piezas iguales. ¿Esas piezas caerían una sobre la otra al doblar?" },
    look: { en: "Fold along a diagonal: the corners do not land on each other.", es: "Dobla por una diagonal: las esquinas no caen una sobre la otra." },
    why: { en: "Cutting a shape into equal pieces is not the same as folding it. No fold makes its halves match.", es: "Cortar una figura en piezas iguales no es lo mismo que doblarla. Ningún doblez hace coincidir sus mitades." },
  },
];

/** How many lines of symmetry. */
type SymCount = { shape: Bi; n: number; wrong: [number, string][]; clue: Bi; look: Bi; why: Bi };
export const SYMMETRY_COUNT: SymCount[] = [
  {
    shape: { en: "a square", es: "un cuadrado" },
    n: 4,
    wrong: [[2, "forgot-the-diagonals"], [8, "counted-each-end-of-a-line"], [1, "checked-only-one-direction"]],
    clue: { en: "Try lines through the middles of opposite sides, and lines through opposite corners.", es: "Prueba líneas por la mitad de lados opuestos y líneas por esquinas opuestas." },
    look: { en: "Folding top to bottom works, and so does folding side to side.", es: "Doblar de arriba abajo funciona, y doblar de lado a lado también." },
    why: { en: "2 lines go through the middles of opposite sides and 2 go through opposite corners.", es: "2 ejes pasan por la mitad de lados opuestos y 2 pasan por esquinas opuestas." },
  },
  {
    shape: { en: "a rectangle that is not a square", es: "un rectángulo que no es cuadrado" },
    n: 2,
    wrong: [[4, "counted-the-diagonals"], [1, "checked-only-one-direction"], [0, "missed-the-fold-line"]],
    clue: { en: "Try folding top to bottom, side to side, and corner to corner.", es: "Prueba doblar de arriba abajo, de lado a lado y de esquina a esquina." },
    look: { en: "Folding along a diagonal does not work: the corners do not land on each other.", es: "Doblar por una diagonal no funciona: las esquinas no caen una sobre la otra." },
    why: { en: "Only the two lines through the middles of opposite sides work.", es: "Solo funcionan los dos ejes que pasan por la mitad de lados opuestos." },
  },
  {
    shape: { en: "a rhombus that is not a square", es: "un rombo que no es cuadrado" },
    n: 2,
    wrong: [[4, "counted-lines-that-do-not-fold-evenly"], [0, "missed-the-diagonals"], [1, "checked-only-one-direction"]],
    clue: { en: "Try lines through opposite corners.", es: "Prueba líneas que pasen por esquinas opuestas." },
    look: { en: "Folding through the middles of opposite sides does not make the halves match.", es: "Doblar por la mitad de lados opuestos no hace coincidir las mitades." },
    why: { en: "Both diagonals are lines of symmetry. Lines through the middles of the sides are not.", es: "Las dos diagonales son ejes de simetría. Las líneas por la mitad de los lados no lo son." },
  },
  {
    shape: { en: "a parallelogram with no right angles and two different side lengths", es: "un paralelogramo sin ángulos rectos y con lados de dos longitudes distintas" },
    n: 0,
    wrong: [[2, "diagonal-is-not-a-fold-line"], [1, "diagonal-is-not-a-fold-line"], [4, "counted-the-diagonals"]],
    clue: { en: "A diagonal cuts it into two equal pieces. Would they land on each other if you folded?", es: "Una diagonal lo corta en dos piezas iguales. ¿Caerían una sobre la otra al doblar?" },
    look: { en: "Fold along a diagonal: the corners do not land on each other.", es: "Dobla por una diagonal: las esquinas no caen una sobre la otra." },
    why: { en: "No fold makes the halves land on each other.", es: "Ningún doblez hace que las mitades caigan una sobre la otra." },
  },
  {
    shape: { en: "an isosceles trapezoid (its two slanted sides are the same length)", es: "un trapecio isósceles (sus dos lados inclinados miden lo mismo)" },
    n: 1,
    wrong: [[2, "midline-is-not-a-fold-line"], [0, "missed-the-fold-line"]],
    clue: { en: "Look for a line from the middle of the top side to the middle of the bottom side.", es: "Busca una línea desde la mitad del lado de arriba hasta la mitad del lado de abajo." },
    look: { en: "The top and bottom sides have different lengths, so folding top to bottom does not work.", es: "Los lados de arriba y de abajo miden distinto, así que doblar de arriba abajo no funciona." },
    why: { en: "Only the line through the middles of the two parallel sides works.", es: "Solo funciona la línea que pasa por la mitad de los dos lados paralelos." },
  },
  {
    shape: { en: "a kite that is not a rhombus", es: "un deltoide (con forma de cometa) que no es rombo" },
    n: 1,
    wrong: [[2, "counted-both-diagonals"], [0, "missed-the-fold-line"]],
    clue: { en: "Try the line through the two corners where equal sides meet.", es: "Prueba la línea que pasa por las dos esquinas donde se juntan lados iguales." },
    look: { en: "Folding along the other diagonal does not make the halves match.", es: "Doblar por la otra diagonal no hace coincidir las mitades." },
    why: { en: "Only the diagonal through the corners where equal sides meet works.", es: "Solo funciona la diagonal que pasa por las esquinas donde se juntan lados iguales." },
  },
  {
    shape: { en: "an equilateral triangle", es: "un triángulo equilátero" },
    n: 3,
    wrong: [[1, "checked-only-one-direction"], [6, "counted-each-end-of-a-line"]],
    clue: { en: "Try a line from each corner to the middle of the opposite side.", es: "Prueba una línea desde cada esquina hasta la mitad del lado opuesto." },
    look: { en: "The line from the top corner to the middle of the bottom side works.", es: "La línea desde la esquina de arriba hasta la mitad del lado de abajo funciona." },
    why: { en: "All sides are equal, so the line from every corner works.", es: "Todos los lados son iguales, así que funciona la línea desde cada esquina." },
  },
  {
    shape: { en: "an isosceles triangle that is not equilateral", es: "un triángulo isósceles que no es equilátero" },
    n: 1,
    wrong: [[3, "treated-it-as-equilateral"], [0, "missed-the-fold-line"]],
    clue: { en: "Try the line from the corner between the two equal sides.", es: "Prueba la línea que sale de la esquina entre los dos lados iguales." },
    look: { en: "Lines from the other two corners do not fold evenly.", es: "Las líneas desde las otras dos esquinas no doblan en partes iguales." },
    why: { en: "Only the line from the corner between the equal sides works.", es: "Solo funciona la línea que sale de la esquina entre los lados iguales." },
  },
  {
    shape: { en: "a scalene triangle (all three sides different lengths)", es: "un triángulo escaleno (con sus tres lados de distinta longitud)" },
    n: 0,
    wrong: [[1, "halves-do-not-match"], [3, "treated-it-as-equilateral"]],
    clue: { en: "Can a fold put one side on top of a side with a different length?", es: "¿Un doblez puede poner un lado sobre otro de distinta longitud?" },
    look: { en: "Every fold would put a side on a side of a different length.", es: "Cualquier doblez pondría un lado sobre otro de distinta longitud." },
    why: { en: "All three sides are different, so no fold works.", es: "Los tres lados son distintos, así que ningún doblez funciona." },
  },
  {
    shape: { en: "a regular pentagon", es: "un pentágono regular" },
    n: 5,
    wrong: [[10, "counted-each-end-of-a-line"], [2, "checked-only-one-direction"]],
    clue: { en: "Try a line from each corner to the middle of the opposite side.", es: "Prueba una línea desde cada esquina hasta la mitad del lado opuesto." },
    look: { en: "Every corner has one fold line through it.", es: "Cada esquina tiene un eje que pasa por ella." },
    why: { en: "Each of the 5 corners has a fold line to the middle of the opposite side.", es: "Cada una de las 5 esquinas tiene un eje hasta la mitad del lado opuesto." },
  },
  {
    shape: { en: "a regular hexagon", es: "un hexágono regular" },
    n: 6,
    wrong: [[3, "counted-only-corner-to-corner-lines"], [12, "counted-each-end-of-a-line"]],
    clue: { en: "Try lines from corner to opposite corner, and from side to opposite side.", es: "Prueba líneas de esquina a esquina opuesta y de lado a lado opuesto." },
    look: { en: "There are 3 lines from corner to opposite corner.", es: "Hay 3 líneas de esquina a esquina opuesta." },
    why: { en: "3 lines join opposite corners and 3 join the middles of opposite sides.", es: "3 ejes unen esquinas opuestas y 3 unen la mitad de lados opuestos." },
  },
  {
    shape: { en: "a regular octagon", es: "un octágono regular" },
    n: 8,
    wrong: [[4, "counted-only-corner-to-corner-lines"], [16, "counted-each-end-of-a-line"]],
    clue: { en: "Try lines from corner to opposite corner, and from side to opposite side.", es: "Prueba líneas de esquina a esquina opuesta y de lado a lado opuesto." },
    look: { en: "There are 4 lines from corner to opposite corner.", es: "Hay 4 líneas de esquina a esquina opuesta." },
    why: { en: "4 lines join opposite corners and 4 join the middles of opposite sides.", es: "4 ejes unen esquinas opuestas y 4 unen la mitad de lados opuestos." },
  },
  {
    shape: { en: "a right triangle with two equal sides", es: "un triángulo rectángulo con dos lados iguales" },
    n: 1,
    wrong: [[3, "treated-it-as-equilateral"], [0, "missed-the-fold-line"]],
    clue: { en: "Try the line from the square corner to the middle of the longest side.", es: "Prueba la línea desde la esquina recta hasta la mitad del lado más largo." },
    look: { en: "The two sides that meet at the square corner are equal.", es: "Los dos lados que se juntan en la esquina recta son iguales." },
    why: { en: "Only the line from the square corner works.", es: "Solo funciona la línea que sale de la esquina recta." },
  },
];

// ---------- grade 5 ----------

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
const round10 = (d: number) => Math.round(d / 10) * 10;

type DivStory = { en: (d: string, s: string, n: string) => string; es: (d: string, s: string, n: string) => string; unit: Pair; money?: boolean };
const DEC_DIV_STORIES: DivStory[] = [
  {
    en: (d, s, n) => `A ribbon is ${d} m long. ${n} cuts it into pieces that are ${s} m long. How many pieces does ${n} get?`,
    es: (d, s, n) => `Un listón mide ${d} m. ${n} lo corta en trozos de ${s} m. ¿Cuántos trozos obtiene?`,
    unit: ["pieces", "trozos"],
  },
  {
    en: (d, s, n) => `${n} has ${d} kg of rice and puts it into bags of ${s} kg each. How many bags does ${n} fill?`,
    es: (d, s, n) => `${n} tiene ${d} kg de arroz y lo pone en bolsas de ${s} kg cada una. ¿Cuántas bolsas llena?`,
    unit: ["bags", "bolsas"],
  },
  {
    en: (d, s) => `A jug holds ${d} L of water. Each cup holds ${s} L. How many cups can be filled?`,
    es: (d, s) => `Una jarra tiene ${d} L de agua. En cada vaso caben ${s} L. ¿Cuántos vasos se pueden llenar?`,
    unit: ["cups", "vasos"],
  },
];
const MONEY_DIV: DivStory = {
  en: (d, s, n) => `${n} has $${d} to spend on stickers that cost $${s} each. How many stickers can ${n} buy?`,
  es: (d, s, n) => `${n} tiene $${d} para comprar calcomanías que cuestan $${s} cada una. ¿Cuántas calcomanías puede comprar?`,
  unit: ["stickers", "calcomanías"],
  money: true,
};

type ShareStory = { en: (a: number, p: number, n: string) => string; es: (a: number, p: number, n: string) => string; done: (ans: string, more: boolean) => Pair };
const FRAC_SHARE_STORIES: ShareStory[] = [
  {
    en: (a, p) => `${p} friends share ${a} ${pl(a, "pizza", "pizzas")} equally. How much pizza does each friend get?`,
    es: (a, p) => `${p} amigos se reparten ${a} ${pl(a, "pizza", "pizzas")} en partes iguales. ¿Cuánta pizza le toca a cada uno?`,
    done: (x, more) => (more ? [`Each friend gets ${x} pizzas.`, `A cada amigo le tocan ${x} pizzas.`] : [`Each friend gets ${x} of a pizza.`, `A cada amigo le toca ${x} de pizza.`]),
  },
  {
    en: (a, p) => `${a} ${pl(a, "sandwich is", "sandwiches are")} shared equally by ${p} people. How much does each person get?`,
    es: (a, p) => `${pl(a, "Se reparte", "Se reparten")} ${a} ${pl(a, "sándwich", "sándwiches")} en partes iguales entre ${p} personas. ¿Cuánto le toca a cada persona?`,
    done: (x, more) => (more ? [`Each person gets ${x} sandwiches.`, `A cada persona le tocan ${x} sándwiches.`] : [`Each person gets ${x} of a sandwich.`, `A cada persona le toca ${x} de sándwich.`]),
  },
  {
    en: (a, p, n) => `${n} cuts a ribbon ${a} ${pl(a, "foot", "feet")} long into ${p} equal pieces. How long is each piece?`,
    es: (a, p, n) => `${n} corta un listón de ${a} ${pl(a, "pie", "pies")} en ${p} trozos iguales. ¿Cuánto mide cada trozo?`,
    done: (x, more) => (more ? [`Each piece is ${x} feet long.`, `Cada trozo mide ${x} pies.`] : [`Each piece is ${x} of a foot.`, `Cada trozo mide ${x} de pie.`]),
  },
  {
    en: (a, p) => `${a} ${pl(a, "liter", "liters")} of water ${pl(a, "is", "are")} shared equally among ${p} astronauts. How many liters does each astronaut get?`,
    es: (a, p) => `${pl(a, "Se reparte", "Se reparten")} ${a} ${pl(a, "litro", "litros")} de agua en partes iguales entre ${p} astronautas. ¿Cuántos litros le tocan a cada astronauta?`,
    done: (x, more) => (more ? [`Each astronaut gets ${x} liters.`, `A cada astronauta le tocan ${x} litros.`] : [`Each astronaut gets ${x} of a liter.`, `A cada astronauta le toca ${x} de litro.`]),
  },
  {
    en: (a, p) => `${p} classes share ${a} ${pl(a, "pan", "pans")} of brownies equally. How much does each class get?`,
    es: (a, p) => `${p} grupos se reparten ${a} ${pl(a, "bandeja", "bandejas")} de brownies en partes iguales. ¿Cuánto le toca a cada grupo?`,
    done: (x, more) => (more ? [`Each class gets ${x} pans.`, `A cada grupo le tocan ${x} bandejas.`] : [`Each class gets ${x} of a pan.`, `A cada grupo le toca ${x} de bandeja.`]),
  },
  {
    en: (a, p, n) => `${n} pours ${a} ${pl(a, "cup", "cups")} of paint equally into ${p} jars. How much paint goes in each jar?`,
    es: (a, p, n) => `${n} vierte ${a} ${pl(a, "taza", "tazas")} de pintura en partes iguales en ${p} frascos. ¿Cuánta pintura va en cada frasco?`,
    done: (x, more) => (more ? [`Each jar gets ${x} cups.`, `En cada frasco van ${x} tazas.`] : [`Each jar gets ${x} of a cup.`, `En cada frasco va ${x} de taza.`]),
  },
];

type Plot = { intro: (c: number, n: string) => Pair; item: Pair; unit: Amount; liquid: boolean; count: [Pair, Pair]; diff: Pair; some: [Pair, Pair]; total: Pair; share?: Pair };
const PLOTS: Plot[] = [
  {
    intro: (c, n) => [`${n} measured ${c} leaves. Their lengths in inches are `, `${n} midió ${c} hojas. Sus longitudes en pulgadas son `],
    item: ["leaves", "hojas"],
    unit: ["inch", "inches", "pulgada", "pulgadas"],
    liquid: false,
    count: [["How many leaves are ", "¿Cuántas hojas miden "], [" inch long?", " de pulgada?"]],
    diff: ["What is the difference in length between the longest leaf and the shortest leaf?", "¿Cuál es la diferencia de longitud entre la hoja más larga y la más corta?"],
    some: [["What is the total length of the leaves that are ", "¿Cuál es la longitud total de las hojas que miden "], [" inch long?", " de pulgada?"]],
    total: ["What is the total length of all the leaves?", "¿Cuál es la longitud total de todas las hojas?"],
  },
  {
    intro: (c, n) => [`${n} cut ${c} ribbons. Their lengths in feet are `, `${n} cortó ${c} listones. Sus longitudes en pies son `],
    item: ["ribbons", "listones"],
    unit: ["foot", "feet", "pie", "pies"],
    liquid: false,
    count: [["How many ribbons are ", "¿Cuántos listones miden "], [" foot long?", " de pie?"]],
    diff: ["What is the difference in length between the longest ribbon and the shortest ribbon?", "¿Cuál es la diferencia de longitud entre el listón más largo y el más corto?"],
    some: [["What is the total length of the ribbons that are ", "¿Cuál es la longitud total de los listones que miden "], [" foot long?", " de pie?"]],
    total: ["What is the total length of all the ribbons?", "¿Cuál es la longitud total de todos los listones?"],
  },
  {
    intro: (c) => [`A class poured juice into ${c} glasses. The amounts in cups are `, `Una clase sirvió jugo en ${c} vasos. Las cantidades en tazas son `],
    item: ["glasses", "vasos"],
    unit: ["cup", "cups", "taza", "tazas"],
    liquid: true,
    count: [["How many glasses have ", "¿Cuántos vasos tienen "], [" cup of juice?", " de taza de jugo?"]],
    diff: ["What is the difference between the most juice in a glass and the least juice in a glass?", "¿Cuál es la diferencia entre el vaso con más jugo y el vaso con menos jugo?"],
    some: [["How much juice is in all the glasses that have ", "¿Cuánto jugo hay en total en los vasos que tienen "], [" cup?", " de taza?"]],
    total: ["How much juice is there in all the glasses together?", "¿Cuánto jugo hay en todos los vasos juntos?"],
    share: ["If all the juice were poured together and shared equally among the glasses, how much would each glass have?", "Si se juntara todo el jugo y se repartiera en partes iguales entre los vasos, ¿cuánto tendría cada vaso?"],
  },
  {
    intro: (c) => [`A science class filled ${c} beakers with water. The amounts in liters are `, `Una clase de ciencias llenó ${c} vasos de precipitados con agua. Las cantidades en litros son `],
    item: ["beakers", "vasos de precipitados"],
    unit: ["liter", "liters", "litro", "litros"],
    liquid: true,
    count: [["How many beakers have ", "¿Cuántos vasos de precipitados tienen "], [" liter of water?", " de litro de agua?"]],
    diff: ["What is the difference between the most water in a beaker and the least water in a beaker?", "¿Cuál es la diferencia entre el vaso de precipitados con más agua y el que tiene menos agua?"],
    some: [["How much water is in all the beakers that have ", "¿Cuánta agua hay en total en los vasos de precipitados que tienen "], [" liter?", " de litro?"]],
    total: ["How much water is there in all the beakers together?", "¿Cuánta agua hay en todos los vasos de precipitados juntos?"],
    share: ["If all the water were poured together and shared equally among the beakers, how much would each beaker have?", "Si se juntara toda el agua y se repartiera en partes iguales entre los vasos de precipitados, ¿cuánta tendría cada uno?"],
  },
];

/** Metric pairs for grade 5: 1 big = f small, with abbreviations. */
type MetricPair = { big: UnitName; small: UnitName; ab: [string, string]; f: number; wf: number };
const METRIC5: MetricPair[] = [
  { big: U.km, small: U.m, ab: ["km", "m"], f: 1000, wf: 100 },
  { big: U.m, small: U.cm, ab: ["m", "cm"], f: 100, wf: 10 },
  { big: U.m, small: U.mm, ab: ["m", "mm"], f: 1000, wf: 100 },
  { big: U.cm, small: U.mm, ab: ["cm", "mm"], f: 10, wf: 100 },
  { big: U.kg, small: U.g, ab: ["kg", "g"], f: 1000, wf: 100 },
  { big: U.L, small: U.mL, ab: ["L", "mL"], f: 1000, wf: 100 },
];
const CUSTOMARY5: Conv[] = [
  { big: U.ft, small: U.inch, f: 12, wf: 10, wfWhy: "used-the-wrong-factor" },
  { big: U.yd, small: U.ft, f: 3, wf: 12, wfWhy: "mixed-up-the-factors" },
  { big: U.yd, small: U.inch, f: 36, wf: 12, wfWhy: "mixed-up-the-factors" },
  { big: U.lb, small: U.oz, f: 16, wf: 12, wfWhy: "mixed-up-the-factors" },
  { big: U.pt, small: U.cup, f: 2, wf: 4, wfWhy: "mixed-up-the-factors" },
  { big: U.qt, small: U.pt, f: 2, wf: 4, wfWhy: "mixed-up-the-factors" },
  { big: U.gal, small: U.qt, f: 4, wf: 2, wfWhy: "mixed-up-the-factors" },
  { big: U.qt, small: U.cup, f: 4, wf: 2, wfWhy: "mixed-up-the-factors" },
  { big: U.hr, small: U.min, f: 60, wf: 100, wfWhy: "used-100-instead-of-60" },
  { big: U.min, small: U.sec, f: 60, wf: 100, wfWhy: "used-100-instead-of-60" },
];

/** Multi-step conversions; the answer is a decimal string so halves stay exact. */
type ConvStory5 = { make: (r: Rng) => number[]; en: (x: number[], n: string) => string; es: (x: number[], n: string) => string; work: (x: number[]) => [string, number, string, string]; plan: Pair; unit: Pair; wrong: (x: number[]) => Miss[] };
const CONVERT_STORIES5: ConvStory5[] = [
  {
    make: (r) => {
      for (;;) {
        const c = r.int(2, 4), b = r.int(2, 8);
        if ((c * b) % 2 === 0) return [c, b];
      }
    },
    en: ([c, b], n) => `A recipe uses ${c} cups of milk for each batch. ${n} makes ${b} batches. How many quarts of milk does ${n} use?`,
    es: ([c, b], n) => `Una receta lleva ${c} tazas de leche por tanda. ${n} hace ${b} tandas. ¿Cuántos cuartos de galón de leche usa ${n}?`,
    work: ([c, b]) => [`${c} × ${b}`, c * b, `${c * b} ÷ 4`, num(c * b * 25, 2)],
    plan: ["Find the total cups first. Then change cups to quarts: 4 cups = 1 quart.", "Primero encuentra el total de tazas. Luego cambia las tazas a cuartos de galón: 4 tazas = 1 cuarto de galón."],
    unit: ["quarts", "cuartos de galón"],
    wrong: ([c, b]) => [[c * b, "did-not-convert"], [(c * b) / 2, "stopped-at-pints"]],
  },
  {
    make: (r) => [r.int(2, 12), r.pick([200, 250, 400, 500])],
    en: ([l, m], n) => `${n} runs ${l} laps around a ${m}-meter track. How many kilometers does ${n} run?`,
    es: ([l, m], n) => `${n} corre ${l} vueltas a una pista de ${m} metros. ¿Cuántos kilómetros corre?`,
    work: ([l, m]) => [`${l} × ${m}`, l * m, `${group(l * m)} ÷ 1,000`, num(l * m, 3)],
    plan: ["Find the total meters first. Then change meters to kilometers: 1,000 meters = 1 kilometer.", "Primero encuentra el total de metros. Luego cambia los metros a kilómetros: 1,000 metros = 1 kilómetro."],
    unit: ["kilometers", "kilómetros"],
    wrong: ([l, m]) => [[l * m, "did-not-convert"], [num(l * m, 2), "used-the-wrong-factor"]],
  },
  {
    make: (r) => {
      const y = r.int(1, 4);
      return [y, r.pick([3, 4, 6, 9, 12, 18].filter((p) => (36 * y) % p === 0 && 36 * y > p))];
    },
    en: ([y, p], n) => `${n} has ${y} ${pl(y, "yard", "yards")} of ribbon and cuts it into pieces that are ${p} inches long. How many pieces does ${n} get?`,
    es: ([y, p], n) => `${n} tiene ${y} ${pl(y, "yarda", "yardas")} de listón y lo corta en trozos de ${p} pulgadas. ¿Cuántos trozos obtiene?`,
    work: ([y, p]) => [`${y} × 36`, 36 * y, `${36 * y} ÷ ${p}`, String((36 * y) / p)],
    plan: ["Change the yards to inches first: 1 yard = 36 inches. Then divide into pieces.", "Primero cambia las yardas a pulgadas: 1 yarda = 36 pulgadas. Luego divide en trozos."],
    unit: ["pieces", "trozos"],
    wrong: ([y, p]) => [[36 * y, "stopped-after-converting"], (12 * y) % p === 0 && [(12 * y) / p, "used-12-inches-in-a-yard"]],
  },
  {
    make: (r) => [r.int(1, 3), r.pick([200, 250, 500])],
    en: ([l, m]) => `A bottle with ${l} ${pl(l, "liter", "liters")} of juice fills cups that hold ${m} milliliters each. How many cups can be filled?`,
    es: ([l, m]) => `Una botella con ${l} ${pl(l, "litro", "litros")} de jugo llena vasos de ${m} mililitros cada uno. ¿Cuántos vasos se pueden llenar?`,
    work: ([l, m]) => [`${l} × 1,000`, 1000 * l, `${group(1000 * l)} ÷ ${m}`, String((1000 * l) / m)],
    plan: ["Change the liters to milliliters first: 1 liter = 1,000 milliliters. Then divide into cups.", "Primero cambia los litros a mililitros: 1 litro = 1,000 mililitros. Luego divide en vasos."],
    unit: ["cups", "vasos"],
    wrong: ([l, m]) => [[1000 * l, "stopped-after-converting"], (100 * l) % m === 0 && [(100 * l) / m, "used-the-wrong-factor"]],
  },
  {
    make: (r) => [r.int(2, 5), r.pick([2, 4, 8])],
    en: ([lb, oz]) => `A ${lb}-pound bag of dog food is split into bowls of ${oz} ounces each. How many bowls can be filled?`,
    es: ([lb, oz]) => `Una bolsa de ${lb} libras de comida para perro se reparte en platos de ${oz} onzas cada uno. ¿Cuántos platos se pueden llenar?`,
    work: ([lb, oz]) => [`${lb} × 16`, 16 * lb, `${16 * lb} ÷ ${oz}`, String((16 * lb) / oz)],
    plan: ["Change the pounds to ounces first: 1 pound = 16 ounces. Then divide into bowls.", "Primero cambia las libras a onzas: 1 libra = 16 onzas. Luego divide en platos."],
    unit: ["bowls", "platos"],
    wrong: ([lb, oz]) => [[16 * lb, "stopped-after-converting"], (10 * lb) % oz === 0 && [(10 * lb) / oz, "used-the-wrong-factor"]],
  },
  {
    make: (r) => [r.pick([60, 90, 120, 150]), r.int(2, 7)],
    en: ([m, d]) => `An astronaut exercises ${m} minutes a day for ${d} days. How many hours is that?`,
    es: ([m, d]) => `Una astronauta hace ejercicio ${m} minutos al día durante ${d} días. ¿Cuántas horas son?`,
    work: ([m, d]) => [`${m} × ${d}`, m * d, `${m * d} ÷ 60`, num((m * d * 10) / 60, 1)],
    plan: ["Find the total minutes first. Then change minutes to hours: 60 minutes = 1 hour.", "Primero encuentra el total de minutos. Luego cambia los minutos a horas: 60 minutos = 1 hora."],
    unit: ["hours", "horas"],
    wrong: ([m, d]) => [[m * d, "did-not-convert"], [num(m * d, 2), "used-100-instead-of-60"]],
  },
  {
    make: (r) => [r.int(3, 12), r.pick([150, 180, 210, 240])],
    en: ([k, s]) => `A playlist has ${k} songs. Each song is ${s} seconds long. How many minutes long is the playlist?`,
    es: ([k, s]) => `Una lista de reproducción tiene ${k} canciones. Cada canción dura ${s} segundos. ¿Cuántos minutos dura la lista?`,
    work: ([k, s]) => [`${k} × ${s}`, k * s, `${group(k * s)} ÷ 60`, num((k * s * 10) / 60, 1)],
    plan: ["Find the total seconds first. Then change seconds to minutes: 60 seconds = 1 minute.", "Primero encuentra el total de segundos. Luego cambia los segundos a minutos: 60 segundos = 1 minuto."],
    unit: ["minutes", "minutos"],
    wrong: ([k, s]) => [[k * s, "did-not-convert"], [num(k * s, 2), "used-100-instead-of-60"]],
  },
];

/** Length, width and height ranges [lo, hi] for one part of a composite figure. */
type Box = [l: [number, number], w: [number, number], h: [number, number]];
/** Two-box figures, each with the sizes that fit it: platforms are low, buildings are meters tall, planters are small. */
const COMPOSITES: { en: string; es: string; sizes: [Len, Box][] }[] = [
  { en: "A toy castle is made of two block towers.", es: "Un castillo de juguete está hecho de dos torres de bloques.", sizes: [[CM, [[4, 10], [4, 10], [6, 20]]], [IN, [[2, 5], [2, 5], [3, 9]]]] },
  { en: "A planter box is made of two rectangular parts.", es: "Una jardinera está hecha de dos partes rectangulares.", sizes: [[IN, [[10, 24], [6, 10], [6, 10]]], [FT, [[2, 6], [2, 3], [2, 3]]]] },
  { en: "A stage is built from two rectangular platforms.", es: "Un escenario está hecho de dos plataformas rectangulares.", sizes: [[FT, [[4, 12], [4, 8], [2, 4]]]] },
  { en: "An aquarium has two connected tanks shaped like boxes.", es: "Un acuario tiene dos tanques conectados con forma de caja.", sizes: [[IN, [[10, 24], [6, 12], [8, 16]]]] },
  { en: "A building is made of two rectangular blocks.", es: "Un edificio está formado por dos bloques rectangulares.", sizes: [[M, [[6, 20], [5, 15], [3, 12]]]] },
];

const ORDINAL: Record<number, Pair> = { 4: ["fourth", "cuarto"], 5: ["fifth", "quinto"], 6: ["sixth", "sexto"], 7: ["seventh", "séptimo"], 8: ["eighth", "octavo"] };

export const MATH_3_5_MORE: Skill[] = [
  // ======================= grade 3 =======================
  {
    id: "m.addsub.3digit",
    subject: "math",
    grade: "3",
    title: { en: "Add and subtract within 1000 with regrouping", es: "Sumar y restar hasta 1000 reagrupando" },
    standard: "3.NBT.A.2",
    prereqs: ["m.addsub.1000"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      if (level === 1) {
        const want = r.bool() ? 2 : 1;
        let a: number, b: number;
        do {
          a = r.int(101, 898);
          b = r.int(101, 999 - a);
        } while (carryCount(a, b) < want);
        const s = a + b, lines = addLines(a, b, locale);
        const answer: Answer = { kind: "number", value: s };
        return {
          prompt: [`${a} + ${b} = `, blank],
          say: t(`${a} plus ${b}`, `${a} más ${b}`),
          visual: { kind: "column", op: "+", top: a, bottom: b },
          alt: t(`${a} written above ${b}, lined up to add`, `${a} escrito encima de ${b}, alineados para sumar`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[noCarry(a, b), "forgot-to-carry"]]),
          hints: [
            t(`Start with the ones: ${a % 10} + ${b % 10}.`, `Empieza por las unidades: ${a % 10} + ${b % 10}.`),
            t("When a column adds up to 10 or more, write the ones digit and carry 1 to the next column.", "Cuando una columna suma 10 o más, escribe la cifra de las unidades y lleva 1 a la siguiente columna."),
            lines[0],
          ],
          steps: [...lines, `${a} + ${b} = ${s}`],
          seconds: 30,
        };
      }
      if (level === 2) {
        let a: number, b: number;
        if (r.bool(0.35)) {
          // Across a zero: 503 − 267, 600 − 248.
          const h = r.int(3, 9), o = r.int(0, 8);
          a = h * 100 + o;
          b = r.int(1, h - 1) * 100 + r.int(1, 9) * 10 + r.int(o + 1, 9);
        } else {
          do {
            a = r.int(300, 999);
            b = r.int(101, a - 50);
          } while (borrowCount(a, b) === 0);
        }
        const d = a - b, lines = subLines(a, b, locale);
        const answer: Answer = { kind: "number", value: d };
        return {
          prompt: [`${a} − ${b} = `, blank],
          say: t(`${a} minus ${b}`, `${a} menos ${b}`),
          visual: { kind: "column", op: "−", top: a, bottom: b },
          alt: t(`${a} written above ${b}, lined up to subtract`, `${a} escrito encima de ${b}, alineados para restar`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[smallFromLarge(a, b), "subtracted-smaller-from-larger"], [noPayBack(a, b), "did-not-reduce-after-trading"]]),
          hints: [
            t(`Start with the ones: ${a % 10} − ${b % 10}. Is the top digit big enough?`, `Empieza por las unidades: ${a % 10} − ${b % 10}. ¿La cifra de arriba alcanza?`),
            t("If a top digit is too small, trade 1 from the next place to the left.", "Si una cifra de arriba es muy pequeña, cambia 1 del lugar de la izquierda."),
            lines[0],
          ],
          steps: [...lines, `${a} − ${b} = ${d}`],
          seconds: 35,
        };
      }
      // Missing numbers: addition and subtraction undo each other.
      const form = r.int(0, 2);
      let a: number, b: number;
      if (form === 1) {
        do {
          a = r.int(300, 999);
          b = r.int(101, a - 50);
        } while (borrowCount(a, b) === 0);
      } else {
        do {
          a = r.int(101, 898);
          b = r.int(101, 999 - a);
        } while (carryCount(a, b) === 0);
      }
      let prompt: MathPart[], say: string, route: string, lines: string[], checkLine: string, strategy: string, ans: number, slips: Miss[];
      if (form === 0) {
        const c = a + b;
        ans = a;
        prompt = [blank, ` + ${b} = ${c}`];
        say = t(`What number plus ${b} equals ${c}?`, `¿Qué número más ${b} es igual a ${c}?`);
        route = `${c} − ${b}`;
        lines = subLines(c, b, locale);
        checkLine = `${a} + ${b} = ${c}`;
        strategy = t(`Subtract to undo the adding: ${c} − ${b}.`, `Resta para deshacer la suma: ${c} − ${b}.`);
        slips = [[c + b, "used-the-wrong-operation"], [smallFromLarge(c, b), "subtracted-smaller-from-larger"]];
      } else if (form === 1) {
        const c = a - b;
        ans = b;
        prompt = [`${a} − `, blank, ` = ${c}`];
        say = t(`${a} minus what number equals ${c}?`, `¿${a} menos qué número es igual a ${c}?`);
        route = `${a} − ${c}`;
        lines = subLines(a, c, locale);
        checkLine = `${a} − ${b} = ${c}`;
        strategy = t(`Take the result away from ${a}: ${a} − ${c}.`, `Quita el resultado de ${a}: ${a} − ${c}.`);
        slips = [[a + c, "used-the-wrong-operation"], [smallFromLarge(a, c), "subtracted-smaller-from-larger"]];
      } else {
        const s = a + b;
        ans = s;
        prompt = [blank, ` − ${b} = ${a}`];
        say = t(`What number minus ${b} equals ${a}?`, `¿Qué número menos ${b} es igual a ${a}?`);
        route = `${a} + ${b}`;
        lines = addLines(a, b, locale);
        checkLine = `${s} − ${b} = ${a}`;
        strategy = t(`Add to undo the subtracting: ${a} + ${b}.`, `Suma para deshacer la resta: ${a} + ${b}.`);
        slips = [[Math.abs(a - b), "used-the-wrong-operation"], [noCarry(a, b), "forgot-to-carry"]];
      }
      const answer: Answer = { kind: "number", value: ans };
      return {
        prompt,
        say,
        input: "keypad",
        answer,
        wrong: misses(answer, slips),
        hints: [t("Addition and subtraction undo each other.", "La suma y la resta se deshacen una a la otra."), strategy, lines[0]],
        steps: [`${route} = ${ans}`, `${t("Check", "Comprueba")}: ${checkLine}`, t(`The missing number is ${ans}.`, `El número que falta es ${ans}.`)],
        seconds: 40,
      };
    },
  },
  {
    id: "m.mult.props",
    subject: "math",
    grade: "3",
    title: { en: "Properties of multiplication", es: "Propiedades de la multiplicación" },
    standard: "3.OA.B.5",
    prereqs: ["m.mult.facts"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const missing = (n: number) => t(`The missing number is ${n}.`, `El número que falta es ${n}.`);
      if (level === 1) {
        const form = r.int(0, 3);
        if (form === 0) {
          const rows = r.int(2, 9);
          let cols = r.int(2, 9);
          while (cols === rows) cols = r.int(2, 9);
          const answer: Answer = { kind: "number", value: rows };
          return {
            prompt: [`${rows} × ${cols} = ${cols} × `, blank],
            say: t(`${rows} times ${cols} equals ${cols} times what number?`, `¿${rows} por ${cols} es igual a ${cols} por qué número?`),
            visual: { kind: "array", rows, cols },
            alt: t(`An array with ${rows} rows of ${cols} dots`, `Un arreglo con ${rows} filas de ${cols} puntos`),
            markable: true,
            input: "keypad",
            answer,
            wrong: misses(answer, [[cols, "repeated-a-factor"], [rows * cols, "wrote-the-product"]]),
            hints: [
              t("Turn the array on its side. Is the number of dots the same?", "Gira el arreglo de lado. ¿Sigue habiendo el mismo número de puntos?"),
              t("You can multiply in any order: the same two numbers give the same product.", "Puedes multiplicar en cualquier orden: los mismos dos números dan el mismo producto."),
              t(`Turned on its side, the array has ${cols} rows. How many dots are in each row now?`, `De lado, el arreglo tiene ${cols} filas. ¿Cuántos puntos hay ahora en cada fila?`),
            ],
            steps: [t(`Turned on its side, the array has ${cols} rows of ${rows}.`, `De lado, el arreglo tiene ${cols} filas de ${rows}.`), `${rows} × ${cols} = ${cols} × ${rows} = ${rows * cols}`, missing(rows)],
            seconds: 12,
          };
        }
        if (form === 1 || form === 2) {
          const n = r.int(2, 12), one = form === 1;
          const answer: Answer = { kind: "number", value: one ? 1 : 0 };
          return {
            prompt: [`${n} × `, blank, ` = ${one ? n : 0}`],
            say: t(`${n} times what number equals ${one ? n : 0}?`, `¿${n} por qué número es igual a ${one ? n : 0}?`),
            input: "keypad",
            answer,
            wrong: misses(answer, [[one ? 0 : 1, "mixed-up-zero-and-one"], [n, "copied-the-number"]]),
            hints: one
              ? [
                  t(`Which number keeps ${n} the same when you multiply by it?`, `¿Por qué número multiplicas ${n} para que no cambie?`),
                  t(`Think of ${n} groups. How many must be in each group to have ${n} in all?`, `Piensa en ${n} grupos. ¿Cuántos debe haber en cada grupo para tener ${n} en total?`),
                  t(`${n} × 0 = 0, so 0 does not work.`, `${n} × 0 = 0, así que 0 no sirve.`),
                ]
              : [
                  t("The product is 0. What makes nothing at all?", "El producto es 0. ¿Qué da como resultado nada?"),
                  t(`Think of ${n} groups. How many must be in each group to have 0 in all?`, `Piensa en ${n} grupos. ¿Cuántos debe haber en cada grupo para tener 0 en total?`),
                  t(`${n} × 1 = ${n}, so 1 does not work.`, `${n} × 1 = ${n}, así que 1 no sirve.`),
                ],
            steps: one
              ? [t("Any number times 1 is the same number.", "Cualquier número por 1 da el mismo número."), `${n} × 1 = ${n}`, missing(1)]
              : [t("Any number times 0 is 0.", "Cualquier número por 0 da 0."), `${n} × 0 = 0`, missing(0)],
            seconds: 8,
          };
        }
        const a = r.int(2, 9);
        let b = r.int(2, 9);
        while (b === a) b = r.int(2, 9);
        const right: Choice = { label: `${b} × ${a}`, say: t(`${b} times ${a}`, `${b} por ${a}`) };
        const picked = choose(r, right, [
          { label: `${a} + ${b}`, say: t(`${a} plus ${b}`, `${a} más ${b}`), why: "added-instead-of-multiplied" },
          { label: `${b} × ${b}`, say: t(`${b} times ${b}`, `${b} por ${b}`), why: "repeated-a-factor" },
          { label: `${b} × ${a + 1}`, say: t(`${b} times ${a + 1}`, `${b} por ${a + 1}`), why: "changed-a-factor" },
        ]);
        return {
          prompt: [t(`Which has the same product as ${a} × ${b}?`, `¿Cuál tiene el mismo producto que ${a} × ${b}?`)],
          say: t(`Which has the same product as ${a} times ${b}?`, `¿Cuál tiene el mismo producto que ${a} por ${b}?`),
          ...picked,
          hints: [
            t("Does changing the order of the factors change the product?", "¿Cambiar el orden de los factores cambia el producto?"),
            t(`Look for the same two numbers, ${a} and ${b}, multiplied together.`, `Busca los mismos dos números, ${a} y ${b}, multiplicados.`),
            `${a} × ${b} = ${a * b}.`,
          ],
          steps: [`${a} × ${b} = ${a * b}`, `${b} × ${a} = ${a * b}`, t(`${b} × ${a} has the same product.`, `${b} × ${a} tiene el mismo producto.`)],
          seconds: 15,
        };
      }
      const form = r.int(0, 3);
      if (form === 0) {
        const a = r.int(3, 9), b = r.int(6, 9), q = b - 5;
        const answer: Answer = { kind: "number", value: q };
        return {
          prompt: [`${a} × ${b} = ${a} × 5 + ${a} × `, blank],
          say: t(`${a} times ${b} equals ${a} times 5 plus ${a} times what number?`, `¿${a} por ${b} es igual a ${a} por 5 más ${a} por qué número?`),
          visual: { kind: "array", rows: a, cols: b },
          alt: t(`An array with ${a} rows of ${b} dots`, `Un arreglo con ${a} filas de ${b} puntos`),
          markable: true,
          input: "keypad",
          answer,
          wrong: misses(answer, [[b, "used-the-whole-factor"], [a * q, "wrote-the-product"], [5, "copied-the-other-part"]]),
          hints: [
            t(`Split each row of ${b} into 5 and the rest.`, `Separa cada fila de ${b} en 5 y lo que queda.`),
            t(`The two parts must add up to ${b}: ${b} = 5 + ?`, `Las dos partes deben sumar ${b}: ${b} = 5 + ?`),
            `${a} × 5 = ${a * 5}.`,
          ],
          steps: [`${b} = 5 + ${q}`, `${a} × 5 + ${a} × ${q} = ${a * 5} + ${a * q} = ${a * b}`, missing(q)],
          seconds: 25,
        };
      }
      if (form === 1) {
        const a = r.int(2, 9);
        const [b, c] = r.pick([[2, 5], [5, 2], [2, 3], [3, 2], [2, 4], [4, 2], [3, 3], [2, 2]] as const);
        const answer: Answer = { kind: "number", value: b * c };
        return {
          prompt: [`${a} × ${b} × ${c} = ${a} × `, blank],
          say: t(`${a} times ${b} times ${c} equals ${a} times what number?`, `¿${a} por ${b} por ${c} es igual a ${a} por qué número?`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[b + c, "added-instead-of-multiplied"], [a * b, "grouped-the-wrong-pair"], [a * b * c, "wrote-the-product"]]),
          hints: [
            t("You may group the factors any way you like: the product stays the same.", "Puedes agrupar los factores como quieras: el producto no cambia."),
            t(`Group the last two factors: ${a} × (${b} × ${c}).`, `Agrupa los dos últimos factores: ${a} × (${b} × ${c}).`),
            // The regrouping done, matched to the box; the learner still works out the product.
            t(`${a} × ${b} × ${c} = ${a} × (${b} × ${c}), so the missing number is what ${b} × ${c} makes.`, `${a} × ${b} × ${c} = ${a} × (${b} × ${c}), así que el número que falta es lo que da ${b} × ${c}.`),
          ],
          steps: [`${a} × (${b} × ${c}) = ${a} × ${b * c}`, `${a} × ${b * c} = ${a * b * c}`, missing(b * c)],
          seconds: 20,
        };
      }
      if (form === 2) {
        const a = r.int(3, 12);
        const answer: Answer = { kind: "number", value: 9 * a };
        return {
          prompt: [t(`${a} × 10 = ${10 * a}, so ${a} × 9 = `, `${a} × 10 = ${10 * a}, así que ${a} × 9 = `), blank],
          say: t(`${a} times 10 is ${10 * a}. So what is ${a} times 9?`, `${a} por 10 es ${10 * a}. Entonces, ¿cuánto es ${a} por 9?`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[10 * a - 1, "took-away-1-not-a-group"], [11 * a, "added-a-group-instead"]]),
          hints: [
            t("How is 9 groups different from 10 groups?", "¿En qué se diferencian 9 grupos de 10 grupos?"),
            t(`${a} × 9 is one group of ${a} less than ${a} × 10.`, `${a} × 9 es un grupo de ${a} menos que ${a} × 10.`),
            t(`Start at ${10 * a} and take away ${a}.`, `Empieza en ${10 * a} y quita ${a}.`),
          ],
          steps: [`${a} × 9 = ${a} × 10 − ${a}`, `${10 * a} − ${a} = ${9 * a}`],
          seconds: 15,
        };
      }
      const a = r.int(3, 9), b = r.int(6, 9), q = b - 5;
      const right: Choice = { label: `${a} × 5 + ${a} × ${q}`, say: t(`${a} times 5 plus ${a} times ${q}`, `${a} por 5 más ${a} por ${q}`) };
      const picked = choose(r, right, [
        { label: `${a} × 5 + ${q}`, say: t(`${a} times 5 plus ${q}`, `${a} por 5 más ${q}`), why: "multiplied-only-one-part" },
        { label: `${a} × 5 + ${a} × ${b}`, say: t(`${a} times 5 plus ${a} times ${b}`, `${a} por 5 más ${a} por ${b}`), why: "split-the-factor-wrong" },
      ]);
      return {
        prompt: [t(`Which is equal to ${a} × ${b}?`, `¿Cuál es igual a ${a} × ${b}?`)],
        say: t(`Which is equal to ${a} times ${b}?`, `¿Cuál es igual a ${a} por ${b}?`),
        ...picked,
        hints: [
          t(`Split ${b} into 5 and ${q}.`, `Separa ${b} en 5 y ${q}.`),
          t(`Both parts must be multiplied by ${a}.`, `Las dos partes se multiplican por ${a}.`),
          `${a} × ${b} = ${a * b}.`,
        ],
        steps: [`${b} = 5 + ${q}`, `${a} × 5 + ${a} × ${q} = ${a * 5} + ${a * q} = ${a * b}`, t(`So ${a} × 5 + ${a} × ${q} is equal to ${a} × ${b}.`, `Así que ${a} × 5 + ${a} × ${q} es igual a ${a} × ${b}.`)],
        seconds: 25,
      };
    },
  },
  {
    id: "m.multdiv.word",
    subject: "math",
    grade: "3",
    title: { en: "Multiplication and division word problems", es: "Problemas de multiplicación y división" },
    standard: "3.OA.A.3",
    prereqs: ["m.mult.facts", "m.div.facts"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const n = r.pick(NAMES);
      if (level === 1) {
        const st = r.pick(GROUP_STORIES), g = r.int(2, 9), s = st.fixed ?? r.int(2, 10), p = g * s;
        const text = t(st.en(g, s, n), st.es(g, s, n));
        const answer: Answer = { kind: "number", value: p };
        return {
          prompt: [text],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[g + s, "added-instead-of-multiplied"], [(g - 1) * s, "skipped-a-group"]]),
          hints: [
            t("How many groups are there? How many are in each group?", "¿Cuántos grupos hay? ¿Cuántos hay en cada grupo?"),
            t(`${g} groups of ${s} is ${g} × ${s}.`, `${g} grupos de ${s} es ${g} × ${s}.`),
            t(`Count by ${s}: ${skipStart(s, g)}`, `Cuenta de ${s} en ${s}: ${skipStart(s, g)}`),
          ],
          steps: [`${g} × ${s} = ${p}`, `${p} ${say2(locale, st.unit)}`],
          seconds: 40,
        };
      }
      if (level === 2) {
        const st = r.pick(SHARE_STORIES), k = r.int(2, 9), q = r.int(2, 10), total = k * q;
        const text = t(st.en(total, k, n), st.es(total, k, n));
        const answer: Answer = { kind: "number", value: q };
        return {
          prompt: [text],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[total - k, "subtracted-instead-of-divided"], [total * k, "multiplied-instead-of-divided"]]),
          hints: [
            t(`The total is ${total}. It is split into equal groups.`, `El total es ${total}. Se separa en grupos iguales.`),
            t(`Divide: ${total} ÷ ${k}. Think: ${k} × ? = ${total}.`, `Divide: ${total} ÷ ${k}. Piensa: ${k} × ? = ${total}.`),
            t(`Count by ${k}: ${skipStart(k, q)}`, `Cuenta de ${k} en ${k}: ${skipStart(k, q)}`),
          ],
          steps: [`${k} × ${q} = ${total}`, `${total} ÷ ${k} = ${q}`, `${q} ${say2(locale, st.unit)}`],
          seconds: 45,
        };
      }
      const st = r.pick(TWO_STEP), x = st.make(r);
      const text = t(st.en(x, n), st.es(x, n));
      const [e1, v1, e2, ans] = st.work(x);
      const answer: Answer = { kind: "number", value: ans };
      return {
        prompt: [text],
        say: spoken(text, locale),
        input: "keypad",
        answer,
        wrong: misses(answer, st.wrong(x)),
        hints: [t("This problem has two steps. What do you need to find first?", "Este problema tiene dos pasos. ¿Qué necesitas encontrar primero?"), say2(locale, st.plan(x)), `${e1} = ${v1}.`],
        steps: [`${e1} = ${v1}`, `${e2} = ${ans}`, `${ans} ${say2(locale, st.unit)}`],
        seconds: 75,
      };
    },
  },
  {
    id: "m.frac.equiv.model",
    subject: "math",
    grade: "3",
    title: { en: "Equivalent fractions and comparing fractions", es: "Fracciones equivalentes y comparar fracciones" },
    standard: "3.NF.A.3",
    prereqs: ["m.frac.numberline"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      if (level === 1) {
        const [p, q, s] = r.pick(BARS3);
        const up = q > p;
        const k = up ? q / p : p / q;
        const n = (s * q) / p;
        const name = denName(q, locale);
        const answer: Answer = { kind: "fraction", n, d: q };
        const pad: Pad = { kind: "fraction-bar", parts: q, maxParts: 12 };
        return {
          prompt: [t("The bar shows ", "La barra muestra "), fr(s, p), t(`. Shade the bar below in ${name} to show the same amount.`, `. Sombrea la barra de abajo en ${name} para mostrar la misma cantidad.`)],
          say: t(`The bar shows ${sayFrac(s, p, locale)}. Shade the bar below in ${name} to show the same amount.`, `La barra muestra ${sayFrac(s, p, locale)}. Sombrea la barra de abajo en ${name} para mostrar la misma cantidad.`),
          visual: { kind: "fraction", parts: p, shaded: s },
          alt: t(`A bar split into ${p} equal parts with ${s} shaded`, `Una barra dividida en ${p} partes iguales con ${s} ${pl(s, "sombreada", "sombreadas")}`),
          input: "fraction-bar",
          pad,
          answer,
          // Shading as many parts as on top fills the whole bar when it has fewer parts than that.
          wrong: onPad(pad, misses(answer, [
            [ft(Math.min(s, q), q), "shaded-the-same-number-of-parts"],
            [ft(q - n, q), "shaded-the-unshaded-part"],
            up ? [ft(s + q - p, q), "added-instead-of-multiplied"] : s > p - q && [ft(s - p + q, q), "subtracted-instead-of-divided"],
          ])),
          hints: [
            t("Equal fractions cover the same amount of the bar.", "Las fracciones equivalentes cubren la misma parte de la barra."),
            up
              ? t(`Split every part of the top bar into equal pieces, so the whole bar has ${q} pieces.`, `Divide cada parte de la barra de arriba en partes iguales, para que la barra entera tenga ${q} partes.`)
              : t(`Join the parts of the top bar into ${q} equal groups.`, `Junta las partes de la barra de arriba en ${q} grupos iguales.`),
            // The first step only: how to split or join. The learner still counts the shaded pieces.
            up
              ? t(`${q} ÷ ${p} = ${k}, so split each part into ${k} pieces. Then count the shaded pieces.`, `${q} ÷ ${p} = ${k}, así que divide cada parte en ${k} partes. Luego cuenta las partes sombreadas.`)
              : t(`${p} ÷ ${q} = ${k}, so every ${k} parts make 1 bigger part. Then count the shaded bigger parts.`, `${p} ÷ ${q} = ${k}, así que cada ${k} partes forman 1 parte más grande. Luego cuenta las partes grandes sombreadas.`),
          ],
          steps: [...new Set([up ? `${ft(1, p)} = ${ft(k, q)}` : `${ft(k, p)} = ${ft(1, q)}`, `${ft(s, p)} = ${ft(n, q)}`]), t(`Shade ${n} of the ${q} parts.`, `Sombrea ${n} de las ${q} partes.`)],
          seconds: 20,
        };
      }
      if (level === 2) {
        let a: number, b: number, c: number, d: number;
        const sameDen = r.bool();
        if (sameDen) {
          b = d = r.pick([3, 4, 6, 8]);
          a = r.int(1, b - 1);
          c = r.int(1, b - 1);
          if (!r.bool(0.1)) while (c === a) c = r.int(1, b - 1);
        } else {
          a = c = r.int(1, 3);
          [b, d] = r.shuffle([2, 3, 4, 6, 8].filter((v) => v > a)).slice(0, 2);
        }
        const diff = a * d - c * b;
        const equal = diff === 0;
        const tag = (i: number) => (equal ? "thought-they-differ" : i === 2 ? (sameDen ? "same-bottom-means-equal" : "same-top-means-equal") : sameDen ? "compared-the-tops-backwards" : "bigger-bottom-means-bigger");
        const hints = sameDen
          ? [
              t("The bottom numbers are the same, so the pieces are the same size.", "Los números de abajo son iguales, así que las partes son del mismo tamaño."),
              t("With same-size pieces, more pieces is more.", "Con partes del mismo tamaño, más partes es más."),
              t(`Compare the top numbers: ${a} and ${c}.`, `Compara los números de arriba: ${a} y ${c}.`),
            ]
          : [
              t("The top numbers are the same, so both have the same number of pieces.", "Los números de arriba son iguales, así que las dos tienen el mismo número de partes."),
              t("The more equal parts a whole is cut into, the smaller each part is.", "Mientras más partes iguales tiene un entero, más pequeña es cada parte."),
              t(`A whole cut into ${Math.min(b, d)} parts has bigger parts than a whole cut into ${Math.max(b, d)} parts.`, `Un entero dividido en ${Math.min(b, d)} partes tiene partes más grandes que uno dividido en ${Math.max(b, d)} partes.`),
            ];
        const reason = sameDen
          ? t(`Both are ${denName(b, locale)}: compare ${a} and ${c}.`, `Las dos son ${denName(b, locale)}: compara ${a} y ${c}.`)
          : t(`${ft(1, Math.min(b, d))} is bigger than ${ft(1, Math.max(b, d))}, and both have ${a} ${pl(a, "piece", "pieces")}.`, `${ft(1, Math.min(b, d))} es más grande que ${ft(1, Math.max(b, d))}, y las dos tienen ${a} ${pl(a, "parte", "partes")}.`);
        if (r.bool()) {
          return {
            prompt: [fr(a, b), " ", blank, " ", fr(c, d)],
            say: t(`Compare ${sayFrac(a, b, locale)} and ${sayFrac(c, d, locale)}.`, `Compara ${sayFrac(a, b, locale)} y ${sayFrac(c, d, locale)}.`),
            ...symbols(diff, tag, locale),
            hints,
            steps: [reason, `${ft(a, b)} ${symOf(diff)} ${ft(c, d)}`],
            seconds: 12,
          };
        }
        // The same comparison in a story, where both fractions are of the same whole.
        const [n1, n2] = twoNames(r);
        const story = r.pick([
          {
            en: ["ate ", " of a pizza.", " of a pizza of the same size. Who ate more pizza?"],
            es: ["comió ", " de una pizza.", " de una pizza del mismo tamaño. ¿Quién comió más pizza?"],
            same: ["They ate the same amount", "Comieron lo mismo"],
            sayEn: (x: string, y: string) => `${n1} ate ${x} of a pizza. ${n2} ate ${y} of a pizza of the same size. Who ate more pizza?`,
            esNoun: "una pizza",
            sayEs: (x: string, y: string) => `${n1} comió ${x}. ${n2} comió ${y} del mismo tamaño. ¿Quién comió más pizza?`,
          },
          {
            en: ["painted ", " of a wall.", " of a wall of the same size. Who painted more?"],
            es: ["pintó ", " de una pared.", " de una pared del mismo tamaño. ¿Quién pintó más?"],
            same: ["They painted the same amount", "Pintaron lo mismo"],
            sayEn: (x: string, y: string) => `${n1} painted ${x} of a wall. ${n2} painted ${y} of a wall of the same size. Who painted more?`,
            esNoun: "una pared",
            sayEs: (x: string, y: string) => `${n1} pintó ${x}. ${n2} pintó ${y} del mismo tamaño. ¿Quién pintó más?`,
          },
          {
            en: ["ran ", " of a mile.", " of a mile. Who ran farther?"],
            es: ["corrió ", " de milla.", " de milla. ¿Quién corrió más lejos?"],
            same: ["They ran the same distance", "Corrieron la misma distancia"],
            sayEn: (x: string, y: string) => `${n1} ran ${x} of a mile. ${n2} ran ${y} of a mile. Who ran farther?`,
            esNoun: "milla",
            sayEs: (x: string, y: string) => `${n1} corrió ${x}. ${n2} corrió ${y}. ¿Quién corrió más lejos?`,
          },
        ] as const);
        const words = locale === "es" ? story.es : story.en;
        const sameLabel = say2(locale, [story.same[0], story.same[1]]);
        const winner = diff > 0 ? n1 : diff < 0 ? n2 : sameLabel;
        const right: Choice = { label: winner };
        const others: Choice[] = [n1, n2, sameLabel].filter((l) => l !== winner).map((label) => ({ label, why: label === sameLabel ? tag(2) : tag(0) }));
        const picked = choose(r, right, others);
        return {
          prompt: [`${n1} ${words[0]}`, fr(a, b), `${words[1]} ${n2} ${words[0]}`, fr(c, d), words[2]],
          say: locale === "es" ? story.sayEs(ofEs(a, b, story.esNoun), ofEs(c, d, story.esNoun)) : story.sayEn(sayFrac(a, b, locale), sayFrac(c, d, locale)),
          ...picked,
          hints,
          steps: [reason, `${ft(a, b)} ${symOf(diff)} ${ft(c, d)}`, t(`Answer: ${winner}`, `Respuesta: ${winner}`)],
          seconds: 25,
        };
      }
      if (r.bool(0.7)) {
        const [b, c] = r.pick(PAIRS3);
        const k = c / b, a = r.int(1, b - 1), topBlank = r.bool(0.65);
        const answer: Answer = { kind: "number", value: topBlank ? a * k : c };
        return {
          prompt: topBlank ? [fr(a, b), " = ", fr("?", c)] : [fr(a, b), " = ", fr(a * k, "?")],
          say: topBlank
            ? cap(t(`${sayFrac(a, b, locale)} is equal to how many ${denName(c, locale)}?`, `¿${sayFrac(a, b, locale)} es igual a cuántos ${denName(c, locale)}?`))
            : cap(t(`${sayFrac(a, b, locale)} is equal to ${a * k} over what number?`, `¿${sayFrac(a, b, locale)} es igual a ${a * k} sobre qué número?`)),
          ...(topBlank
            ? {
                visual: { kind: "number-line" as const, min: 0, max: 1, marks: [0, 1], denominator: c, marker: a / b },
                alt: t(`A number line from 0 to 1 split into ${denName(c, locale)}, with a dot at ${sayFrac(a, b, locale)}`, `Una recta numérica de 0 a 1 dividida en ${denName(c, locale)}, con un punto en ${sayFrac(a, b, locale)}`),
              }
            : {}),
          input: "keypad",
          answer,
          wrong: misses(answer, topBlank ? [[a, "kept-the-same-top"], [a + c - b, "added-instead-of-multiplied"]] : [[b, "kept-the-same-bottom"], [b + a * k - a, "added-instead-of-multiplied"]]),
          hints: topBlank
            ? [
                t(`What do you multiply ${b} by to get ${c}?`, `¿Por cuánto multiplicas ${b} para obtener ${c}?`),
                t("Multiply the top and the bottom by the same number.", "Multiplica el número de arriba y el de abajo por el mismo número."),
                t(`${b} × ${k} = ${c}. Now do the same to the top.`, `${b} × ${k} = ${c}. Ahora haz lo mismo con el de arriba.`),
              ]
            : [
                t(`What do you multiply ${a} by to get ${a * k}?`, `¿Por cuánto multiplicas ${a} para obtener ${a * k}?`),
                t("Multiply the top and the bottom by the same number.", "Multiplica el número de arriba y el de abajo por el mismo número."),
                t(`${a} × ${k} = ${a * k}. Now do the same to the bottom.`, `${a} × ${k} = ${a * k}. Ahora haz lo mismo con el de abajo.`),
              ],
          steps: [t(`Multiply the top and the bottom by ${k}.`, `Multiplica arriba y abajo por ${k}.`), `${a} × ${k} = ${a * k}, ${b} × ${k} = ${c}`, `${ft(a, b)} = ${ft(a * k, c)}`],
          seconds: 15,
        };
      }
      // Whole numbers as fractions.
      const d = r.pick([2, 3, 4, 6, 8]), w = r.int(1, 4), name = denName(d, locale);
      if (r.bool()) {
        const answer: Answer = { kind: "number", value: w };
        return {
          prompt: [fr(d * w, d), " = ", blank],
          say: t(`${sayFrac(d * w, d, locale)} is how many wholes?`, `¿${sayFrac(d * w, d, locale)} son cuántos enteros?`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[d * w - d, "subtracted-the-numbers"], [d * w, "read-only-the-top"]]),
          hints: [
            t(`How many ${name} make 1 whole?`, `¿Cuántos ${name} forman 1 entero?`),
            t(`Count how many groups of ${d} ${name} are in ${d * w} ${name}.`, `Cuenta cuántos grupos de ${d} ${name} hay en ${d * w} ${name}.`),
            t(`${d} ${name} make 1 whole.`, `${d} ${name} forman 1 entero.`),
          ],
          steps: [`${d * w} ÷ ${d} = ${w}`, `${ft(d * w, d)} = ${w}`],
          seconds: 12,
        };
      }
      const answer: Answer = { kind: "number", value: w * d };
      return {
        prompt: [`${w} = `, fr("?", d)],
        say: t(`${w} ${pl(w, "whole is", "wholes are")} how many ${name}?`, `¿${w} ${pl(w, "entero es", "enteros son")} cuántos ${name}?`),
        input: "keypad",
        answer,
        wrong: misses(answer, [[w, "kept-the-same-top"], [w + d, "added-instead-of-multiplied"]]),
        hints: [
          t(`How many ${name} make 1 whole?`, `¿Cuántos ${name} forman 1 entero?`),
          t(`Each whole is ${d} ${name}. Find how many ${name} make ${w} ${pl(w, "whole", "wholes")}.`, `Cada entero son ${d} ${name}. Busca cuántos ${name} forman ${w} ${pl(w, "entero", "enteros")}.`),
          t(`1 whole = ${d} ${name}.`, `1 entero = ${d} ${name}.`),
        ],
        steps: [`${w} × ${d} = ${w * d}`, `${w} = ${ft(w * d, d)}`],
        seconds: 12,
      };
    },
  },
  {
    id: "m.perimeter.missing",
    subject: "math",
    grade: "3",
    title: { en: "Perimeter and missing sides", es: "Perímetro y lados que faltan" },
    standard: "3.MD.D.8",
    prereqs: ["m.area.rect", "m.addsub.3digit"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const kind = r.next();
      if (level === 1) {
        if (kind < 0.6) {
          const place = r.pick(PLACES), u = r.pick(place.units), ab = say2(locale, u.ab);
          const n = r.int(3, 6), sides = polygonSides(r, n), P = sides.reduce((s, x) => s + x, 0);
          const shape = say2(locale, POLY[n].any), list = listOf(sides.map((s) => `${s} ${ab}`), locale);
          const text = t(`${place.en} is shaped like a ${shape}. Its sides are ${list}. What is its perimeter?`, `${place.es} tiene forma de ${shape}. Sus lados miden ${list}. ¿Cuál es su perímetro?`);
          const answer: Answer = { kind: "number", value: P };
          return {
            prompt: [text, " ", blank, ` ${ab}`],
            say: text,
            input: "keypad",
            answer,
            wrong: misses(answer, [[P - sides[n - 1], "missed-a-side"], [P + sides[0], "counted-a-side-twice"]]),
            hints: [
              t("Perimeter is the distance all the way around the shape.", "El perímetro es la distancia alrededor de toda la figura."),
              t(`Add the lengths of all ${n} sides.`, `Suma las longitudes de los ${n} lados.`),
              `${sides[0]} + ${sides[1]} = ${sides[0] + sides[1]}.`,
            ],
            steps: [`${sides.join(" + ")} = ${P}`, t(`The perimeter is ${P} ${ab}.`, `El perímetro es de ${P} ${ab}.`)],
            seconds: 30,
          };
        }
        if (kind < 0.8) {
          const place = r.pick(PLACES), u = r.pick(place.units), ab = say2(locale, u.ab);
          const n = r.int(3, 6), s = r.int(2, 12), P = n * s, shape = say2(locale, POLY[n].same);
          const text = t(`${place.en} is shaped like a ${shape} with all sides the same length. Each side is ${s} ${ab} long. What is its perimeter?`, `${place.es} tiene forma de ${shape} con todos sus lados iguales. Cada lado mide ${s} ${ab}. ¿Cuál es su perímetro?`);
          const answer: Answer = { kind: "number", value: P };
          return {
            prompt: [text, " ", blank, ` ${ab}`],
            say: text,
            input: "keypad",
            answer,
            wrong: misses(answer, [[s, "used-one-side-only"], [n + s, "added-instead-of-multiplied"]]),
            hints: [
              t("Perimeter is the distance all the way around the shape.", "El perímetro es la distancia alrededor de toda la figura."),
              t(`A ${shape} has ${n} sides, and each one is ${s} ${ab}.`, `Un ${shape} tiene ${n} lados, y cada uno mide ${s} ${ab}.`),
              t(`Add ${s} once for each side: ${s} + ${s} + …`, `Suma ${s} una vez por cada lado: ${s} + ${s} + …`),
            ],
            steps: [`${n} × ${s} = ${P}`, t(`The perimeter is ${P} ${ab}.`, `El perímetro es de ${P} ${ab}.`)],
            seconds: 25,
          };
        }
        const u = r.pick([CM, M, IN, FT]), ab = say2(locale, u.ab);
        const w = r.int(3, 15), h = r.int(2, w - 1), P = 2 * (w + h);
        const answer: Answer = { kind: "number", value: P };
        return {
          prompt: [t("Find the perimeter of the rectangle. ", "Encuentra el perímetro del rectángulo. "), t("Perimeter = ", "Perímetro = "), blank, ` ${ab}`],
          say: t("Find the perimeter of the rectangle.", "Encuentra el perímetro del rectángulo."),
          visual: { kind: "rect", w, h, unit: ab },
          alt: t(`A rectangle ${w} ${ab} long and ${h} ${ab} wide`, `Un rectángulo de ${w} ${ab} de largo y ${h} ${ab} de ancho`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[w + h, "added-only-two-sides"], [w * h, "found-the-area"]]),
          hints: [
            t("Perimeter is the distance all the way around the shape.", "El perímetro es la distancia alrededor de toda la figura."),
            t(`A rectangle has 4 sides: two are ${w} ${ab} and two are ${h} ${ab}.`, `Un rectángulo tiene 4 lados: dos miden ${w} ${ab} y dos miden ${h} ${ab}.`),
            `${w} + ${h} = ${w + h}.`,
          ],
          steps: [`${w} + ${h} + ${w} + ${h} = ${P}`, t(`The perimeter is ${P} ${ab}.`, `El perímetro es de ${P} ${ab}.`)],
          seconds: 25,
        };
      }
      if (kind < 0.5) {
        const place = r.pick(PLACES), u = r.pick(place.units), ab = say2(locale, u.ab);
        const n = r.int(3, 6), sides = polygonSides(r, n), P = sides.reduce((s, x) => s + x, 0);
        const known = sides.slice(0, -1), sum = P - sides[n - 1], x = sides[n - 1];
        const shape = say2(locale, POLY[n].any), list = listOf(known.map((s) => `${s} ${ab}`), locale);
        const text = t(
          `${place.en} is shaped like a ${shape}. Its perimeter is ${P} ${ab}. ${COUNT_WORD[n - 1][0]} of its sides are ${list}. How long is the last side?`,
          `${place.es} tiene forma de ${shape}. Su perímetro es de ${P} ${ab}. ${COUNT_WORD[n - 1][1]} de sus lados miden ${list}. ¿Cuánto mide el lado que falta?`,
        );
        const answer: Answer = { kind: "number", value: x };
        return {
          prompt: [text, " ", blank, ` ${ab}`],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[sum, "stopped-after-adding"], [P - known[0], "subtracted-one-side-only"]]),
          hints: [
            t(`The perimeter is all ${n} sides added together.`, `El perímetro es la suma de los ${n} lados.`),
            t("Add the sides you know. Then subtract that from the perimeter.", "Suma los lados que conoces. Luego réstalo del perímetro."),
            `${known.join(" + ")} = ${sum}.`,
          ],
          steps: [`${known.join(" + ")} = ${sum}`, `${P} − ${sum} = ${x}`, t(`The last side is ${x} ${ab}.`, `El lado que falta mide ${x} ${ab}.`)],
          seconds: 45,
        };
      }
      if (kind < 0.8) {
        const place = r.pick(RECT_PLACES), [u, lo, hi] = r.pick(place.sizes), ab = say2(locale, u.ab);
        const [L, W] = rectSize(r, lo, hi, place.thin), P = 2 * (L + W);
        const text = t(`${place.en} has a perimeter of ${P} ${ab}. It is ${L} ${ab} long. How wide is it?`, `${place.es} tiene un perímetro de ${P} ${ab}. Mide ${L} ${ab} de largo. ¿Cuánto mide de ancho?`);
        const answer: Answer = { kind: "number", value: W };
        return {
          prompt: [text, " ", blank, ` ${ab}`],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[P - L, "subtracted-one-side-only"], [P - 2 * L, "forgot-to-halve"], [P / 2, "halved-only"]]),
          hints: [
            t("A rectangle has two lengths and two widths.", "Un rectángulo tiene dos largos y dos anchos."),
            t("Take both lengths away from the perimeter, then split what is left between the two widths.", "Quita los dos largos del perímetro y reparte lo que queda entre los dos anchos."),
            `${L} + ${L} = ${2 * L}.`,
          ],
          steps: [`${L} + ${L} = ${2 * L}`, `${P} − ${2 * L} = ${2 * W}`, `${2 * W} ÷ 2 = ${W}`, t(`It is ${W} ${ab} wide.`, `Mide ${W} ${ab} de ancho.`)],
          seconds: 45,
        };
      }
      const place = r.pick(PLACES), u = r.pick(place.units), ab = say2(locale, u.ab);
      const n = r.int(3, 6), s = r.int(2, 12), P = n * s, shape = say2(locale, POLY[n].same);
      const text = t(`${place.en} is shaped like a ${shape} with all sides the same length. Its perimeter is ${P} ${ab}. How long is each side?`, `${place.es} tiene forma de ${shape} con todos sus lados iguales. Su perímetro es de ${P} ${ab}. ¿Cuánto mide cada lado?`);
      const answer: Answer = { kind: "number", value: s };
      return {
        prompt: [text, " ", blank, ` ${ab}`],
        say: text,
        input: "keypad",
        answer,
        wrong: misses(answer, [[P - n, "subtracted-instead-of-divided"], n !== 2 && P % 2 === 0 && [P / 2, "divided-by-2"]]),
        hints: [
          t(`How many sides does a ${shape} have?`, `¿Cuántos lados tiene un ${shape}?`),
          t(`The ${n} equal sides add up to ${P}. Divide: ${P} ÷ ${n}.`, `Los ${n} lados iguales suman ${P}. Divide: ${P} ÷ ${n}.`),
          t(`Think: ${n} × ? = ${P}.`, `Piensa: ${n} × ? = ${P}.`),
        ],
        steps: [`${P} ÷ ${n} = ${s}`, `${t("Check", "Comprueba")}: ${n} × ${s} = ${P}`, t(`Each side is ${s} ${ab}.`, `Cada lado mide ${s} ${ab}.`)],
        seconds: 35,
      };
    },
  },
  {
    id: "m.time.elapsed",
    subject: "math",
    grade: "3",
    title: { en: "Elapsed time", es: "Tiempo transcurrido" },
    standard: "3.MD.A.1",
    prereqs: ["m.time.clock", "m.addsub.1000"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const at = (x: number) => tr(locale, clock(x), `${laLas(x)} ${clock(x)}`);
      const clockAlt = (x: number) => t(`A clock showing ${clock(x)}`, `Un reloj que marca ${laLas(x)} ${clock(x)}`);
      /** Adds d minutes from t0 by jumping to the next hour; returns hints and steps. */
      const forward = (t0: number, d: number) => {
        const t1 = t0 + d, next = Math.ceil((t0 + 1) / 60) * 60, toHour = next - t0;
        if (t1 > next) {
          const rest = t1 - next;
          return {
            hints: [
              t(`How many minutes is it from ${clock(t0)} to ${clock(next)}?`, `¿Cuántos minutos hay de ${at(t0)} a ${at(next)}?`),
              t("Jump to the next hour first, then add the minutes that are left.", "Primero salta a la siguiente hora en punto y luego suma los minutos que quedan."),
              t(`${clock(t0)} to ${clock(next)} is ${toHour} minutes, so ${rest} minutes are left.`, `De ${at(t0)} a ${at(next)} hay ${toHour} minutos, así que quedan ${rest} minutos.`),
            ],
            steps: [t(`${clock(t0)} + ${toHour} minutes = ${clock(next)}`, `${clock(t0)} + ${toHour} minutos = ${clock(next)}`), t(`${clock(next)} + ${rest} minutes = ${clock(t1)}`, `${clock(next)} + ${rest} minutos = ${clock(t1)}`)],
          };
        }
        return {
          hints: [
            t("Will the long hand pass the 12?", "¿La manecilla larga pasará por el 12?"),
            t(`Count on ${d} minutes from ${clock(t0)} by fives.`, `Cuenta ${d} minutos desde ${at(t0)} de cinco en cinco.`),
            t(`Start at ${clock(t0)}: ${clock(t0 + 5)}, ${clock(t0 + 10)}, …`, `Empieza en ${at(t0)}: ${clock(t0 + 5)}, ${clock(t0 + 10)}, …`),
          ],
          steps: [t(`${clock(t0)} + ${d} minutes = ${clock(t1)}`, `${clock(t0)} + ${d} minutos = ${clock(t1)}`)],
        };
      };
      if (level === 1) {
        const ev = r.pick(EVENTS), h0 = r.int(1, 10), d = r.int(3, 11) * 5;
        const cross = r.bool(0.6) && d >= 10;
        const m0 = cross ? r.int(Math.ceil((65 - d) / 5), 11) * 5 : r.int(0, Math.floor((55 - d) / 5)) * 5;
        const t0 = h0 * 60 + m0, t1 = t0 + d;
        const plan = forward(t0, d);
        const text = t(`${ev[0]} starts at ${clock(t0)}. It lasts ${d} minutes. Set the clock to the time it ends.`, `${ev[1]} empieza ${aLas(t0)} ${clock(t0)}. Dura ${d} minutos. Pon el reloj en la hora en que termina.`);
        const answer: Answer = { kind: "text", accept: [clock(t1)] };
        return {
          prompt: [text],
          say: text,
          visual: { kind: "clock", h: hourOf(t0), m: m0 },
          alt: clockAlt(t0),
          input: "clock",
          pad: { kind: "clock", stepMinutes: 5 },
          answer,
          wrong: misses(answer, [cross ? [clock(t1 - 60), "hour-not-changed"] : [clock(h0 * 60 + d), "set-the-duration"], [clock(t0), "set-the-start-time"]]),
          hints: plan.hints,
          steps: [...plan.steps, t(`It ends at ${clock(t1)}.`, `Termina ${aLas(t1)} ${clock(t1)}.`)],
          seconds: 30,
        };
      }
      if (level === 2) {
        const ev = r.pick(EVENTS), h0 = r.int(1, 10), m0 = r.int(1, 11) * 5;
        let d = r.int(4, 23) * 5;
        while (m0 + d <= 60) d = r.int(4, 23) * 5;
        const t0 = h0 * 60 + m0, t1 = t0 + d;
        const next = (h0 + 1) * 60, endHour = Math.floor(t1 / 60) * 60;
        const a = next - t0, hours = (endHour - next) / 60, b = t1 - endHour;
        const parts = [a, hours * 60, b].filter((x) => x > 0);
        const text = t(`${ev[0]} starts at ${clock(t0)} and ends at ${clock(t1)}. How many minutes does it last?`, `${ev[1]} empieza ${aLas(t0)} ${clock(t0)} y termina ${aLas(t1)} ${clock(t1)}. ¿Cuántos minutos dura?`);
        const answer: Answer = { kind: "number", value: d };
        return {
          prompt: [text, " ", blank, t(" minutes", " minutos")],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[hhmm(t1) - hhmm(t0), "subtracted-like-hundreds"], [a, "counted-only-to-the-hour"]]),
          hints: [
            t(`How many minutes is it from ${clock(t0)} to ${clock(next)}?`, `¿Cuántos minutos hay de ${at(t0)} a ${at(next)}?`),
            t("Jump to the next hour, then on to the end time. Add the jumps.", "Salta a la siguiente hora en punto y luego hasta la hora final. Suma los saltos."),
            t(`From ${clock(t0)} to ${clock(next)} is ${a} minutes.`, `De ${at(t0)} a ${at(next)} hay ${a} minutos.`),
          ],
          steps: [
            `${clock(t0)} → ${clock(next)}: ${a} min`,
            ...(hours > 0 ? [`${clock(next)} → ${clock(endHour)}: ${hours * 60} min`] : []),
            ...(b > 0 ? [`${clock(endHour)} → ${clock(t1)}: ${b} min`] : []),
            t(`${parts.join(" + ")} = ${d} minutes`, `${parts.join(" + ")} = ${d} minutos`),
          ],
          seconds: 45,
        };
      }
      if (r.bool()) {
        // Count back from the end time, to the minute.
        const n = r.pick(NAMES), task = r.pick(TASKS), h1 = r.int(2, 11), m1 = r.int(2, 45);
        const d = r.int(m1 + 2, Math.min(59, m1 + 45));
        const t1 = h1 * 60 + m1, t0 = t1 - d, mark = t1 - m1;
        const text = t(`${n} ${task[0]} at ${clock(t1)}. It took ${d} minutes. What time did ${n} start? Set the clock.`, `${n} ${task[1]} ${aLas(t1)} ${clock(t1)}. Le tomó ${d} minutos. ¿A qué hora empezó? Pon el reloj en esa hora.`);
        const answer: Answer = { kind: "text", accept: [clock(t0)] };
        return {
          prompt: [text],
          say: text,
          visual: { kind: "clock", h: h1, m: m1 },
          alt: clockAlt(t1),
          input: "clock",
          pad: { kind: "clock", stepMinutes: 1 },
          answer,
          wrong: misses(answer, [[clock(t0 + 60), "hour-not-changed"], [clock(t1 + d), "added-instead-of-subtracted"], [clock(t1), "set-the-end-time"]]),
          hints: [
            t("Count back from the end time.", "Cuenta hacia atrás desde la hora en que terminó."),
            t(`Jump back to ${clock(mark)} first, then back the rest of the minutes.`, `Primero salta hacia atrás hasta ${at(mark)} y luego retrocede los minutos que faltan.`),
            t(`${clock(t1)} back to ${clock(mark)} is ${m1} minutes, so ${d - m1} minutes are left.`, `De ${at(t1)} hasta ${at(mark)} hay ${m1} minutos, así que faltan ${d - m1} minutos.`),
          ],
          steps: [
            t(`${clock(t1)} − ${m1} minutes = ${clock(mark)}`, `${clock(t1)} − ${m1} minutos = ${clock(mark)}`),
            t(`${clock(mark)} − ${d - m1} minutes = ${clock(t0)}`, `${clock(mark)} − ${d - m1} minutos = ${clock(t0)}`),
            t(`${n} started at ${clock(t0)}.`, `${n} empezó ${aLas(t0)} ${clock(t0)}.`),
          ],
          seconds: 45,
        };
      }
      const ev = r.pick(EVENTS), h0 = r.int(1, 10), m0 = r.int(5, 58), d = r.int(Math.max(13, 62 - m0), 58);
      const t0 = h0 * 60 + m0, t1 = t0 + d, plan = forward(t0, d);
      const text = t(`${ev[0]} starts at ${clock(t0)}. It lasts ${d} minutes. Set the clock to the time it ends.`, `${ev[1]} empieza ${aLas(t0)} ${clock(t0)}. Dura ${d} minutos. Pon el reloj en la hora en que termina.`);
      const answer: Answer = { kind: "text", accept: [clock(t1)] };
      return {
        prompt: [text],
        say: text,
        visual: { kind: "clock", h: h0, m: m0 },
        alt: clockAlt(t0),
        input: "clock",
        pad: { kind: "clock", stepMinutes: 1 },
        answer,
        wrong: misses(answer, [[clock(t1 - 60), "hour-not-changed"], [clock(t0), "set-the-start-time"]]),
        hints: plan.hints,
        steps: [...plan.steps, t(`It ends at ${clock(t1)}.`, `Termina ${aLas(t1)} ${clock(t1)}.`)],
        seconds: 45,
      };
    },
  },
  {
    id: "m.mass.volume",
    subject: "math",
    grade: "3",
    title: { en: "Mass and liquid volume problems", es: "Problemas de masa y volumen de líquidos" },
    standard: "3.MD.A.2",
    prereqs: ["m.multdiv.word", "m.addsub.3digit"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const st = r.pick(level === 1 ? MASS_ADD_SUB : MASS_MULT_DIV), n = r.pick(NAMES);
      const [a, b] = st.make(r);
      const value = st.op === "+" ? a + b : st.op === "−" ? a - b : st.op === "×" ? a * b : a / b;
      const text = t(st.en(a, b, n), st.es(a, b, n));
      const answer: Answer = { kind: "number", value };
      const slips: Miss[] =
        st.op === "+"
          ? [[Math.abs(a - b), "used-the-wrong-operation"]]
          : st.op === "−"
            ? [[a + b, "used-the-wrong-operation"]]
            : st.op === "×"
              ? [[a + b, "added-instead-of-multiplied"]]
              : [[a * b, "multiplied-instead-of-divided"], [a - b, "subtracted-instead-of-divided"]];
      return {
        prompt: [text],
        say: text,
        input: "keypad",
        answer,
        wrong: misses(answer, slips),
        hints: [
          st.op === "+" || st.op === "−"
            ? t("Think about what happens to the amounts in the story.", "Piensa en qué pasa con las cantidades en la historia.")
            : t("Look for equal groups or equal shares.", "Busca grupos iguales o partes iguales."),
          say2(locale, st.plan),
          `${a} ${st.op} ${b} = ?`,
        ],
        steps: [`${a} ${st.op} ${b} = ${value}`, `${value} ${say2(locale, st.unit)}`],
        seconds: level === 1 ? 40 : 45,
      };
    },
  },
  {
    id: "m.bargraph.scaled",
    subject: "math",
    grade: "3",
    title: { en: "Scaled picture graphs and bar graph problems", es: "Pictogramas con escala y problemas con gráficas de barras" },
    standard: "3.MD.B.3",
    prereqs: ["m.mult.facts", "m.addsub.3digit"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const g = r.pick(GRAPHS), cats = r.shuffle(g.cats).slice(0, 3);
      if (level === 1) {
        const k = r.pick([2, 5, 10]);
        const counts = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 3);
        const [i, j] = r.shuffle([0, 1, 2]).slice(0, 2);
        const more = r.bool(0.45);
        const [hi, lo] = counts[i] > counts[j] ? [i, j] : [j, i];
        const intro = t(
          `The picture graph shows votes for the class's ${g.en}. Each dot stands for ${k} votes. From left to right, the groups are ${listOf(cats.map((c) => c[0]), "en")}.`,
          `El pictograma muestra los votos para elegir ${g.es} de la clase. Cada punto representa ${k} votos. De izquierda a derecha, los grupos son: ${listOf(cats.map((c) => c[1]), "es")}.`,
        );
        const visual = { kind: "dots" as const, groups: counts };
        const alt = t(`Three groups of dots, from left to right: ${listOf(counts.map(String), "en")}`, `Tres grupos de puntos, de izquierda a derecha: ${listOf(counts.map(String), "es")}`);
        if (!more) {
          const v = counts[i] * k;
          const q = t(`How many votes were for ${cats[i][0]}?`, `¿Cuántos votos hubo para ${cats[i][1]}?`);
          const answer: Answer = { kind: "number", value: v };
          return {
            prompt: [`${intro} ${q}`],
            say: `${intro} ${q}`,
            visual,
            alt,
            markable: true,
            input: "keypad",
            answer,
            wrong: misses(answer, [[counts[i], "counted-dots-not-votes"], [counts[i] + k, "added-the-scale"]]),
            hints: [
              t(`Count the dots for ${cats[i][0]}.`, `Cuenta los puntos ${del(cats[i][1])}.`),
              t(`Each dot stands for ${k} votes, so count by ${k}s, once for each dot.`, `Cada punto representa ${k} votos, así que cuenta de ${k} en ${k}, una vez por cada punto.`),
              t(`${cap(cats[i][0])}: ${counts[i]} ${pl(counts[i], "dot", "dots")}.`, `${cap(cats[i][1])}: ${counts[i]} ${pl(counts[i], "punto", "puntos")}.`),
            ],
            steps: [`${counts[i]} × ${k} = ${v}`, t(`${v} votes for ${cats[i][0]}`, `${v} votos para ${cats[i][1]}`)],
            seconds: 35,
          };
        }
        const dd = counts[hi] - counts[lo], v = dd * k;
        const q = t(`How many more votes were for ${cats[hi][0]} than for ${cats[lo][0]}?`, `¿Cuántos votos más hubo para ${cats[hi][1]} que para ${cats[lo][1]}?`);
        const answer: Answer = { kind: "number", value: v };
        return {
          prompt: [`${intro} ${q}`],
          say: `${intro} ${q}`,
          visual,
          alt,
          markable: true,
          input: "keypad",
          answer,
          wrong: misses(answer, [[dd, "compared-dots-not-votes"], [(counts[hi] + counts[lo]) * k, "added-instead-of-subtracted"]]),
          hints: [
            t(`Count the dots for ${cats[hi][0]} and for ${cats[lo][0]}.`, `Cuenta los puntos ${del(cats[hi][1])} y ${del(cats[lo][1])}.`),
            t(`Find how many more dots, then multiply by ${k}, because each dot is ${k} votes.`, `Encuentra cuántos puntos más hay y multiplica por ${k}, porque cada punto son ${k} votos.`),
            t(`${cap(cats[hi][0])}: ${counts[hi]} ${pl(counts[hi], "dot", "dots")}. ${cap(cats[lo][0])}: ${counts[lo]} ${pl(counts[lo], "dot", "dots")}.`, `${cap(cats[hi][1])}: ${counts[hi]} ${pl(counts[hi], "punto", "puntos")}. ${cap(cats[lo][1])}: ${counts[lo]} ${pl(counts[lo], "punto", "puntos")}.`),
          ],
          steps: [`${counts[hi]} − ${counts[lo]} = ${dd}`, `${dd} × ${k} = ${v}`, t(`${v} more votes`, `${v} votos más`)],
          seconds: 45,
        };
      }
      // Level 2 is a word problem about a bar graph: the bars are described, because the Visual union has no
      // bar graph yet. When it gets one, show the bars and scale lines here and drop the sentences.
      // Bars end on a scale line or halfway between two lines.
      const k = r.pick([2, 4, 10, 5]);
      const half = k % 2 === 0;
      const steps = r.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
      const halfAt = half ? r.int(0, 2) : -1;
      const vals = steps.map((s, i) => s * k + (i === halfAt ? k / 2 : 0));
      const bar = (i: number) =>
        i === halfAt
          ? t(`The bar for ${cats[i][0]} ends halfway between ${steps[i] * k} and ${steps[i] * k + k}.`, `La barra ${del(cats[i][1])} llega a la mitad entre ${steps[i] * k} y ${steps[i] * k + k}.`)
          : t(`The bar for ${cats[i][0]} ends at ${vals[i]}.`, `La barra ${del(cats[i][1])} llega hasta ${vals[i]}.`);
      const intro = t(`In a bar graph of votes for the class's ${g.en}, the scale counts by ${k}.`, `En una gráfica de barras de los votos para elegir ${g.es} de la clase, la escala va de ${k} en ${k}.`);
      const [i, j] = r.shuffle([0, 1, 2]).slice(0, 2);
      const kind = r.int(0, 2);
      const [hi, lo] = vals[i] > vals[j] ? [i, j] : [j, i];
      /** A halfway bar read at the line below it. */
      const lineVal = (x: number) => (x === halfAt ? steps[x] * k : vals[x]);
      let q: string, value: number, slips: Miss[], step1: string;
      if (kind === 0) {
        q = t(`How many more votes were for ${cats[hi][0]} than for ${cats[lo][0]}?`, `¿Cuántos votos más hubo para ${cats[hi][1]} que para ${cats[lo][1]}?`);
        value = vals[hi] - vals[lo];
        slips = [[vals[hi] + vals[lo], "added-instead-of-subtracted"], [lineVal(hi) - lineVal(lo), "read-the-half-as-a-line"]];
        step1 = `${vals[hi]} − ${vals[lo]} = ${value}`;
      } else if (kind === 1) {
        q = t(`How many fewer votes were for ${cats[lo][0]} than for ${cats[hi][0]}?`, `¿Cuántos votos menos hubo para ${cats[lo][1]} que para ${cats[hi][1]}?`);
        value = vals[hi] - vals[lo];
        slips = [[vals[hi] + vals[lo], "added-instead-of-subtracted"], [lineVal(hi) - lineVal(lo), "read-the-half-as-a-line"]];
        step1 = `${vals[hi]} − ${vals[lo]} = ${value}`;
      } else {
        q = t(`How many votes were for ${cats[i][0]} and ${cats[j][0]} together?`, `¿Cuántos votos hubo en total para ${cats[i][1]} y ${cats[j][1]}?`);
        value = vals[i] + vals[j];
        slips = [[Math.abs(vals[i] - vals[j]), "subtracted-instead-of-added"], [lineVal(i) + lineVal(j), "read-the-half-as-a-line"]];
        step1 = `${vals[i]} + ${vals[j]} = ${value}`;
      }
      const text = `${intro} ${bar(0)} ${bar(1)} ${bar(2)} ${q}`;
      const answer: Answer = { kind: "number", value };
      const used = kind === 2 ? [i, j] : [hi, lo];
      const halfUsed = used.find((x) => x === halfAt);
      return {
        prompt: [text],
        say: text,
        input: "keypad",
        answer,
        wrong: misses(answer, slips),
        hints: [
          t("What number does each bar in the question end at?", "¿En qué número termina cada barra de la pregunta?"),
          halfUsed !== undefined
            ? t(`Halfway between two lines is ${k / 2} more than the lower line.`, `La mitad entre dos líneas es ${k / 2} más que la línea de abajo.`)
            : kind === 2
              ? t("Add the two values.", "Suma los dos valores.")
              : t("Subtract the smaller value from the bigger one.", "Resta el valor menor del mayor."),
          halfUsed !== undefined ? t(`The bar for ${cats[halfUsed][0]} ends at ${vals[halfUsed]}.`, `La barra ${del(cats[halfUsed][1])} llega hasta ${vals[halfUsed]}.`) : t(`The bar for ${cats[used[0]][0]} ends at ${vals[used[0]]}.`, `La barra ${del(cats[used[0]][1])} llega hasta ${vals[used[0]]}.`),
        ],
        steps: [t(`${cap(cats[used[0]][0])}: ${vals[used[0]]}. ${cap(cats[used[1]][0])}: ${vals[used[1]]}.`, `${cap(cats[used[0]][1])}: ${vals[used[0]]}. ${cap(cats[used[1]][1])}: ${vals[used[1]]}.`), step1, t(`${value} votes`, `${value} votos`)],
        seconds: 60,
      };
    },
  },

  // ======================= grade 4 =======================
  {
    id: "m.place.million",
    subject: "math",
    grade: "4",
    title: { en: "Place value to a million and rounding", es: "Valor posicional hasta un millón y redondeo" },
    standard: "4.NBT.A.2",
    prereqs: ["m.round"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const P = (p: number) => t(PLACE6[p][0], PLACE6[p][1]);
      if (level === 1) {
        let N: number, p: number, digit: number;
        do {
          N = r.int(100000, 999999);
          p = r.int(1, 5);
          digit = digitAt(N, p);
        } while (digit === 0 || String(N).split(String(digit)).length !== 2);
        const placeLine = t(`The ${digit} is in the ${PLACE6[p][0]} place.`, `El ${digit} está en el lugar de las ${PLACE6[p][1]}.`);
        if (r.bool(0.7)) {
          const value = digit * 10 ** p;
          const answer: Answer = { kind: "number", value };
          const q = t(`What is the value of the ${digit} in ${group(N)}?`, `¿Cuál es el valor del ${digit} en ${group(N)}?`);
          return {
            prompt: [q],
            say: q,
            input: "keypad",
            answer,
            wrong: misses(answer, [[digit, "gave-the-digit-only"], [digit * 10 ** (p + 1), "one-place-too-far-left"], [digit * 10 ** (p - 1), "one-place-too-far-right"]]),
            hints: [
              t(`Which place is the ${digit} in?`, `¿En qué lugar está el ${digit}?`),
              t("Name the places from the right: ones, tens, hundreds, thousands, ten thousands, hundred thousands.", "Nombra los lugares desde la derecha: unidades, decenas, centenas, unidades de millar, decenas de millar, centenas de millar."),
              placeLine,
            ],
            steps: [placeLine, `${digit} × ${group(10 ** p)} = ${group(value)}`],
            seconds: 15,
          };
        }
        const answer: Answer = { kind: "number", value: digit };
        const q = t(`Which digit is in the ${PLACE6[p][0]} place of ${group(N)}?`, `¿Qué cifra está en el lugar de las ${PLACE6[p][1]} de ${group(N)}?`);
        return {
          prompt: [q],
          say: q,
          input: "keypad",
          answer,
          wrong: misses(answer, [[digitAt(N, 5 - p), "counted-places-from-the-left"], [digitAt(N, p - 1), "off-by-one-place"], p < 5 && [digitAt(N, p + 1), "off-by-one-place"]]),
          hints: [
            t("Name the places starting at the right, with the ones.", "Nombra los lugares empezando por la derecha, con las unidades."),
            t("From the right: ones, tens, hundreds, thousands, ten thousands, hundred thousands.", "Desde la derecha: unidades, decenas, centenas, unidades de millar, decenas de millar, centenas de millar."),
            t(`The ones digit of ${group(N)} is ${N % 10}.`, `La cifra de las unidades de ${group(N)} es ${N % 10}.`),
          ],
          steps: [t("Count places from the right, starting with the ones.", "Cuenta los lugares desde la derecha, empezando por las unidades."), t(`The ${PLACE6[p][0]} digit is ${digit}.`, `La cifra de las ${PLACE6[p][1]} es ${digit}.`)],
          seconds: 12,
        };
      }
      if (level === 2) {
        if (r.bool(0.6)) {
          const style = r.next();
          let A: number, B: number, trap: "digits" | "middle" | "equal", p = 0;
          if (style < 0.1) {
            A = B = r.int(10000, 999999);
            trap = "equal";
          } else if (style < 0.45) {
            A = r.int(50000, 99999);
            B = r.int(100000, 499999);
            trap = "digits";
          } else {
            p = r.int(1, 4);
            const d = Array.from({ length: 6 }, () => r.int(0, 9));
            d[5] = r.int(1, 9);
            const lo = [...d], hi = [...d];
            const x = r.int(0, 7);
            lo[p] = x;
            hi[p] = r.int(x + 1, 9);
            for (let i = 0; i < p; i++) {
              lo[i] = r.int(5, 9);
              hi[i] = r.int(0, 4);
            }
            A = fromDigits(lo);
            B = fromDigits(hi);
            trap = "middle";
          }
          if (r.bool()) [A, B] = [B, A];
          const diff = A - B;
          const tag = (i: number) => (trap === "equal" ? "thought-they-differ" : i === 2 ? "thought-they-are-equal" : trap === "digits" ? "compared-first-digits-only" : "compared-the-wrong-place");
          const hints =
            trap === "digits"
              ? [
                  t("How many digits does each number have?", "¿Cuántas cifras tiene cada número?"),
                  t("A whole number with more digits is greater. With the same number of digits, compare from the left.", "Un número entero con más cifras es mayor. Con el mismo número de cifras, compara desde la izquierda."),
                  t(`${group(A)} has ${String(A).length} digits and ${group(B)} has ${String(B).length} digits.`, `${group(A)} tiene ${String(A).length} cifras y ${group(B)} tiene ${String(B).length} cifras.`),
                ]
              : [
                  t("Both numbers have the same number of digits. Start comparing at the left.", "Los dos números tienen la misma cantidad de cifras. Empieza a comparar por la izquierda."),
                  t("Find the first place where the digits are different. That place decides.", "Busca el primer lugar donde las cifras son distintas. Ese lugar decide."),
                  trap === "equal"
                    ? t("Check every place, one at a time.", "Revisa cada lugar, uno a la vez.")
                    : t(`The digits match until the ${PLACE6[p][0]} place.`, `Las cifras son iguales hasta el lugar de las ${PLACE6[p][1]}.`),
                ];
          const why =
            trap === "digits"
              ? t(`${group(A)} has ${String(A).length} digits and ${group(B)} has ${String(B).length} digits.`, `${group(A)} tiene ${String(A).length} cifras y ${group(B)} tiene ${String(B).length} cifras.`)
              : trap === "equal"
                ? t("Every digit is the same.", "Todas las cifras son iguales.")
                : t(`In the ${PLACE6[p][0]} place: ${digitAt(A, p)} and ${digitAt(B, p)}.`, `En el lugar de las ${PLACE6[p][1]}: ${digitAt(A, p)} y ${digitAt(B, p)}.`);
          return {
            prompt: [`${group(A)} `, blank, ` ${group(B)}`],
            say: t(`Compare ${group(A)} and ${group(B)}.`, `Compara ${group(A)} y ${group(B)}.`),
            ...symbols(diff, tag, locale),
            hints,
            steps: [why, `${group(A)} ${symOf(diff)} ${group(B)}`],
            seconds: 15,
          };
        }
        const d = Array.from({ length: 6 }, () => r.int(0, 9));
        d[5] = r.int(1, 9);
        d[r.int(1, 4)] = 0;
        if (d[0] === 0 && d[1] === 0) d[0] = r.int(1, 9);
        const N = fromDigits(d);
        const parts = [5, 4, 3, 2, 1, 0].filter((i) => d[i] > 0).map((i) => d[i] * 10 ** i);
        const answer: Answer = { kind: "number", value: N };
        const squeezed = Number(parts.map((v) => String(v)[0]).join(""));
        return {
          prompt: [`${parts.map(group).join(" + ")} = `, blank],
          say: parts.map(group).join(t(" plus ", " más ")),
          input: "keypad",
          answer,
          wrong: misses(answer, [[squeezed, "skipped-a-zero-place"]]),
          hints: [
            t("Each part fills one place.", "Cada parte ocupa un lugar."),
            t("Write each digit in its place. Put a 0 in any place that has no part.", "Escribe cada cifra en su lugar. Pon un 0 en cada lugar que no tenga parte."),
            t(`${group(parts[0])} puts a ${d[5]} in the hundred thousands place.`, `${group(parts[0])} pone un ${d[5]} en el lugar de las centenas de millar.`),
          ],
          steps: [t("Places with no part get a 0.", "Los lugares sin parte llevan un 0."), `${parts.map(group).join(" + ")} = ${group(N)}`],
          seconds: 20,
        };
      }
      const p = r.pick([3, 4, 5]), u = 10 ** p;
      let N = r.int(100000, 999999);
      const style = r.next();
      if (style < 0.15) N = Math.floor(N / u) * u + u / 2;
      else if (style < 0.3) N = (p < 5 ? Math.floor(N / (10 * u)) * 10 * u : 0) + 9 * u + r.int(5, 9) * (u / 10) + r.int(0, u / 10 - 1);
      const lo = Math.floor(N / u) * u, hi = lo + u, half = lo + u / 2;
      const up = N >= half, ans = up ? hi : lo, digit = digitAt(N, p - 1);
      const answer: Answer = { kind: "number", value: ans };
      const q = t(`Round ${group(N)} to the nearest ${PLACE6[p][2]}.`, `Redondea ${group(N)} a la ${PLACE6[p][3]} más cercana.`);
      return {
        prompt: [q],
        say: q,
        visual: { kind: "number-line", min: lo, max: hi, marks: [lo, half, hi], marker: N },
        alt: t(`A number line from ${group(lo)} to ${group(hi)} with a dot at ${group(N)}`, `Una recta numérica de ${group(lo)} a ${group(hi)} con un punto en ${group(N)}`),
        input: "keypad",
        answer,
        wrong: misses(answer, [[up ? lo : hi, "rounded-the-wrong-way"], [roundTo(N, p - 1), "rounded-to-the-wrong-place"], [up ? N + u : N, "did-not-zero-the-lower-places"]]),
        hints: [
          t(`Which two ${P(p)} is ${group(N)} between?`, `¿Entre qué dos ${P(p)} está ${group(N)}?`),
          t(`${group(N)} is between ${group(lo)} and ${group(hi)}. Halfway is ${group(half)}.`, `${group(N)} está entre ${group(lo)} y ${group(hi)}. La mitad del camino es ${group(half)}.`),
          t(`Look at the ${PLACE6[p - 1][0]} digit: ${digit}. Is it 5 or more?`, `Mira la cifra de las ${PLACE6[p - 1][1]}: ${digit}. ¿Es 5 o más?`),
        ],
        steps: [
          t(`${group(N)} is between ${group(lo)} and ${group(hi)}.`, `${group(N)} está entre ${group(lo)} y ${group(hi)}.`),
          up
            ? t(`The ${PLACE6[p - 1][0]} digit is ${digit}, which is 5 or more, so round up.`, `La cifra de las ${PLACE6[p - 1][1]} es ${digit}, que es 5 o más, así que redondea hacia arriba.`)
            : t(`The ${PLACE6[p - 1][0]} digit is ${digit}, which is less than 5, so round down.`, `La cifra de las ${PLACE6[p - 1][1]} es ${digit}, que es menos de 5, así que redondea hacia abajo.`),
          t(`${group(N)} rounds to ${group(ans)}.`, `${group(N)} se redondea a ${group(ans)}.`),
        ],
        seconds: 20,
      };
    },
  },
  {
    id: "m.mult.compare",
    subject: "math",
    grade: "4",
    title: { en: "Times as many, and remainders in word problems", es: "Veces la cantidad y residuos en problemas" },
    standard: "4.OA.A.2",
    prereqs: ["m.mult.multi", "m.div.long"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const [a, b] = twoNames(r);
      const unitOf = (u: Pair, x: number) => (u[0] ? `${x} ${say2(locale, u)}` : t(`The number is ${x}.`, `El número es ${x}.`));
      if (level === 1) {
        const st = r.pick(TIMES_BIGGER), s = r.int(2, 12), k = r.int(2, 9), p = s * k;
        const text = t(st.en(s, k, a, b), st.es(s, k, a, b));
        const answer: Answer = { kind: "number", value: p };
        return {
          prompt: [text],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[s + k, "added-instead-of-multiplied"], [s * (k + 1), "added-one-more-group"]]),
          hints: [
            t("Which amount is given? How many times as big is the other one?", "¿Qué cantidad te dan? ¿Cuántas veces más grande es la otra?"),
            t(`${k} times as many means ${k} groups of ${s}: ? = ${k} × ${s}.`, `${k} veces la cantidad significa ${k} grupos de ${s}: ? = ${k} × ${s}.`),
            t(`Picture ${k} bars, each worth ${s}.`, `Imagina ${k} barras, cada una de ${s}.`),
          ],
          steps: [`${k} × ${s} = ${p}`, unitOf(st.unit, p)],
          seconds: 40,
        };
      }
      if (level === 2) {
        if (r.bool(0.65)) {
          const st = r.pick(TIMES_SMALLER), k = r.int(2, 9), q = r.int(2, 12), total = k * q;
          const text = t(st.en(total, k, a, b), st.es(total, k, a, b));
          const answer: Answer = { kind: "number", value: q };
          return {
            prompt: [text],
            say: text,
            input: "keypad",
            answer,
            wrong: misses(answer, [[total * k, "multiplied-instead-of-divided"], [total - k, "subtracted-instead-of-divided"]]),
            hints: [
              t(`Is the amount you need bigger or smaller than ${total}?`, `¿La cantidad que buscas es mayor o menor que ${total}?`),
              t(`${total} is ${k} groups of the smaller amount. Divide: ${total} ÷ ${k}.`, `${total} son ${k} grupos de la cantidad menor. Divide: ${total} ÷ ${k}.`),
              t(`Think: ${k} × ? = ${total}.`, `Piensa: ${k} × ? = ${total}.`),
            ],
            steps: [`${k} × ${q} = ${total}`, `${total} ÷ ${k} = ${q}`, unitOf(st.unit, q)],
            seconds: 45,
          };
        }
        const st = r.pick(TIMES_FACTOR), s = r.int(2, 12), k = r.int(2, 9), total = s * k;
        const text = t(st.en(s, total, a, b), st.es(s, total, a, b));
        const answer: Answer = { kind: "number", value: k };
        return {
          prompt: [text],
          say: spoken(text, locale),
          input: "keypad",
          answer,
          wrong: misses(answer, [[total - s, "found-the-difference"], [total + s, "added-the-amounts"]]),
          hints: [
            t("The question asks how many times as much, not how many more.", "La pregunta es cuántas veces, no cuánto más."),
            t(`Divide the bigger amount by the smaller one: ${total} ÷ ${s}.`, `Divide la cantidad mayor entre la menor: ${total} ÷ ${s}.`),
            t(`Think: ${s} × ? = ${total}.`, `Piensa: ${s} × ? = ${total}.`),
          ],
          steps: [`${s} × ${k} = ${total}`, `${total} ÷ ${s} = ${k}`, t(`${k} times as much`, `${k} veces`)],
          seconds: 45,
        };
      }
      const st = r.pick(REMAINDER_STORIES), n = r.pick(NAMES), { x, total, k } = st.make(r);
      const q = Math.floor(total / k), rem = total % k;
      const value = st.mode === "up" ? q + 1 : st.mode === "down" ? q : rem;
      const text = t(st.en(x, n), st.es(x, n));
      const answer: Answer = { kind: "number", value };
      const unit = say2(locale, st.unit);
      const meaning =
        st.mode === "up"
          ? t("Everyone and everything must fit, so the leftover needs one more group.", "Todos deben caber, así que lo que sobra necesita un grupo más.")
          : st.mode === "down"
            ? t("Only full groups count, so the leftover is not enough for another one.", "Solo cuentan los grupos completos, así que lo que sobra no alcanza para otro.")
            : t("The question asks how many are left over, so the answer is the remainder.", "La pregunta es cuántos sobran, así que la respuesta es el residuo.");
      const divide = `${total} ÷ ${k} = ${q} R ${rem}`;
      // A first chunk of the division, smaller than the quotient, so the hint never shows the quotient or the remainder.
      const chunk = q > 10 ? 10 : q > 5 ? 5 : 2;
      const start = t(
        `Take out ${chunk} groups of ${k} first: ${k} × ${chunk} = ${k * chunk}, and ${total} − ${k * chunk} = ${total - k * chunk} are still left.`,
        `Primero saca ${chunk} grupos de ${k}: ${k} × ${chunk} = ${k * chunk}, y todavía quedan ${total} − ${k * chunk} = ${total - k * chunk}.`,
      );
      return {
        prompt: [text],
        say: text,
        input: "keypad",
        answer,
        wrong: misses(
          answer,
          st.mode === "up" ? [[q, "dropped-the-remainder"], [rem, "gave-the-remainder"]] : st.mode === "down" ? [[q + 1, "rounded-up-the-remainder"], [rem, "gave-the-remainder"]] : [[q, "gave-the-quotient"], [k - rem, "found-how-many-more-to-fill"], [q * k, "gave-the-amount-in-full-groups"]],
        ),
        hints: [
          t("Divide first. Then decide what the leftover means in this story.", "Primero divide. Luego decide qué significa lo que sobra en esta historia."),
          meaning,
          st.first ? `${st.first(x)}.` : start,
        ],
        steps: [
          ...(st.first ? [st.first(x)] : []),
          divide,
          st.mode === "up"
            ? t(`${rem} ${pl(rem, "is", "are")} left over, so 1 more is needed: ${q} + 1 = ${q + 1}.`, `Como ${sobran(rem)}, se necesita 1 más: ${q} + 1 = ${q + 1}.`)
            : st.mode === "down"
              ? t(`${rem} left over ${pl(rem, "is", "are")} not enough for another one.`, `Lo que sobra (${rem}) no alcanza para otro más.`)
              : t(`The remainder is ${rem}.`, `El residuo es ${rem}.`),
          `${value} ${unit}`,
        ],
        seconds: 70,
      };
    },
  },
  {
    id: "m.frac.times.whole",
    subject: "math",
    grade: "4",
    title: { en: "Multiply a fraction by a whole number", es: "Multiplicar una fracción por un número entero" },
    standard: "4.NF.B.4",
    prereqs: ["m.frac.addlike", "m.frac.mixed"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const slipsFor = (w: number, a: number, b: number): Miss[] => [[ft(w * a, w * b), "multiplied-top-and-bottom"], [ft(a, w * b), "multiplied-the-bottom"], [ft(w + a, b), "added-the-whole-to-the-top"]];
      const tail = (P: number, b: number) => (simplest(P, b) !== ft(P, b) ? [`${ft(P, b)} = ${simplest(P, b)}`] : []);
      if (level === 1) {
        const b = r.pick(DENS4), w = r.int(3, 9);
        if (r.bool(0.4)) {
          // a/b as a multiple of 1/b.
          const a = r.int(3, 12);
          const answer: Answer = { kind: "number", value: a };
          return {
            prompt: [fr(a, b), " = ", blank, " × ", fr(1, b)],
            say: cap(t(`${sayFrac(a, b, locale)} equals what number times ${sayFrac(1, b, locale)}?`, `¿${sayFrac(a, b, locale)} es igual a qué número por ${sayFrac(1, b, locale)}?`)),
            input: "keypad",
            answer,
            wrong: misses(answer, [[b, "used-the-bottom-number"], [a * b, "multiplied-the-numbers"]]),
            hints: [
              t(`How many ${denName(b, locale)} are in ${ft(a, b)}?`, `¿Cuántos ${denName(b, locale)} hay en ${ft(a, b)}?`),
              t(`${ft(a, b)} is ${ft(1, b)} added again and again.`, `${ft(a, b)} es ${ft(1, b)} sumado una y otra vez.`),
              t(`Count the ${denName(b, locale)}: ${ft(1, b)}, ${ft(2, b)}, …`, `Cuenta los ${denName(b, locale)}: ${ft(1, b)}, ${ft(2, b)}, …`),
            ],
            steps: [t(`${ft(a, b)} is ${a} ${denName(b, locale)}.`, `${ft(a, b)} son ${a} ${denName(b, locale)}.`), `${ft(a, b)} = ${a} × ${ft(1, b)}`],
            seconds: 15,
          };
        }
        const answer: Answer = { kind: "fraction", n: w, d: b };
        return {
          prompt: [`${w} × `, fr(1, b), " = ", blank],
          say: t(`${w} times ${sayFrac(1, b, locale)}`, `${w} por ${sayFrac(1, b, locale)}`),
          input: "fraction",
          answer,
          wrong: misses(answer, slipsFor(w, 1, b)),
          hints: [
            t(`${w} × ${ft(1, b)} means ${w} groups of ${ft(1, b)}.`, `${w} × ${ft(1, b)} son ${w} grupos de ${ft(1, b)}.`),
            t(`Count ${w} ${denName(b, locale)}. The pieces stay the same size, so the bottom stays ${b}.`, `Cuenta ${w} ${denName(b, locale)}. Las partes no cambian de tamaño, así que el de abajo sigue siendo ${b}.`),
            `${ft(1, b)} + ${ft(1, b)} = ${ft(2, b)}.`,
          ],
          steps: [`${w} × ${ft(1, b)} = ${ft(w, b)}`, ...tail(w, b)],
          seconds: 15,
        };
      }
      const st = r.pick(FRAC_TIMES_STORIES);
      const b = r.pick(level === 3 ? st.dens : DENS4), a = properReduced(r, b), w = r.int(2, 9), P = w * a;
      const answer: Answer = { kind: "fraction", n: P, d: b };
      const hints = [
        t(`${w} × ${ft(a, b)} means ${w} groups of ${ft(a, b)}.`, `${w} × ${ft(a, b)} son ${w} grupos de ${ft(a, b)}.`),
        t(`Multiply the whole number by the top number. The pieces are still ${denName(b, locale)}, so the bottom stays ${b}.`, `Multiplica el número entero por el de arriba. Las partes siguen siendo ${denName(b, locale)}, así que el de abajo sigue siendo ${b}.`),
        `${w} × ${a} = ${P}.`,
      ];
      if (level === 2) {
        return {
          prompt: [`${w} × `, fr(a, b), " = ", blank],
          say: t(`${w} times ${sayFrac(a, b, locale)}`, `${w} por ${sayFrac(a, b, locale)}`),
          input: "fraction",
          answer,
          wrong: misses(answer, slipsFor(w, a, b)),
          hints,
          steps: [`${w} × ${ft(a, b)} = ${ft(P, b)}`, ...tail(P, b)],
          seconds: 20,
        };
      }
      const n = r.pick(NAMES);
      const parts = locale === "es" ? st.es : st.en;
      return {
        prompt: [fill(parts[0], w, n), fr(a, b), fill(parts[1], w, n)],
        say: locale === "es" ? st.sayEs(ofEs(a, b, st.esNoun), w, n) : st.sayEn(sayFrac(a, b, locale), w, n),
        input: "fraction",
        answer,
        wrong: misses(answer, slipsFor(w, a, b)),
        hints: [t(`Is this ${w} groups of ${ft(a, b)}?`, `¿Son ${w} grupos de ${ft(a, b)}?`), hints[1], hints[2]],
        steps: [`${w} × ${ft(a, b)} = ${ft(P, b)}`, ...tail(P, b), amount(P, b, st.unit, locale)],
        seconds: 50,
      };
    },
  },
  {
    id: "m.dec.hundredths",
    subject: "math",
    grade: "4",
    title: { en: "Tenths and hundredths: add and compare", es: "Décimos y centésimos: sumar y comparar" },
    standard: "4.NF.C.5",
    prereqs: ["m.dec.tenths"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      if (level < 3) {
        const a = r.int(1, 9);
        let b = r.int(1, 99);
        while (b % 10 === 0) b = r.int(1, 99);
        const flip = r.bool(0.3);
        const sum = 10 * a + b;
        const terms: MathPart[] = flip ? [fr(b, 100), " + ", fr(a, 10)] : [fr(a, 10), " + ", fr(b, 100)];
        const said = flip ? `${sayFrac(b, 100, locale)} ${t("plus", "más")} ${sayFrac(a, 10, locale)}` : `${sayFrac(a, 10, locale)} ${t("plus", "más")} ${sayFrac(b, 100, locale)}`;
        const rename = `${ft(a, 10)} = ${ft(10 * a, 100)}`;
        const hints = [
          t("Tenths and hundredths are different-sized pieces. Make them the same size first.", "Los décimos y los centésimos son partes de distinto tamaño. Primero hazlas del mismo tamaño."),
          level === 1
            ? t("1 tenth is the same as 10 hundredths.", "1 décimo es lo mismo que 10 centésimos.")
            : t("Rename the tenths as hundredths, add, then write the hundredths as a decimal with two places.", "Escribe los décimos como centésimos, suma y luego escribe los centésimos como decimal con dos lugares."),
          `${rename}.`,
        ];
        if (level === 1) {
          const answer: Answer = { kind: "number", value: sum };
          return {
            prompt: [...terms, " = ", fr("?", 100)],
            say: cap(t(`${said} equals how many hundredths?`, `¿${said} es igual a cuántos centésimos?`)),
            input: "keypad",
            answer,
            wrong: misses(answer, [[a + b, "did-not-rename-tenths"], [10 * b + a, "renamed-the-wrong-fraction"]]),
            hints,
            steps: [rename, `${ft(10 * a, 100)} + ${ft(b, 100)} = ${ft(sum, 100)}`],
            seconds: 20,
          };
        }
        const answer: Answer = { kind: "number", value: Number(dec(sum, 2)) };
        return {
          prompt: [t("Write the sum as a decimal. ", "Escribe la suma como decimal. "), ...terms, " = ", blank],
          say: cap(t(`${said}. Write the sum as a decimal.`, `${said}. Escribe la suma como decimal.`)),
          input: "keypad",
          keys: ["."],
          answer,
          wrong: misses(answer, [[dec(a + b, 2), "did-not-rename-tenths"], [sum, "left-out-the-decimal-point"]]),
          hints,
          steps: [rename, `${ft(10 * a, 100)} + ${ft(b, 100)} = ${ft(sum, 100)}`, `${ft(sum, 100)} = ${dec(sum, 2)}`],
          seconds: 25,
        };
      }
      const st = r.pick(DEC_COMPARE_STORIES);
      const [na, nb] = twoNames(r);
      const whole = r.int(0, st.whole) * 100;
      const style = r.next();
      let A: number, B: number, pa: number, pb: number;
      if (style < 0.15) {
        A = B = whole + r.int(1, 9) * 10;
        [pa, pb] = r.shuffle([1, 2]);
      } else if (style < 0.6) {
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
      const sameLabel = say2(locale, st.same);
      const winner = A > B ? na : B > A ? nb : sameLabel;
      const tagFor = (label: string) => {
        if (A === B) return "trailing-zero-changes-value";
        if (label === sameLabel) return "thought-they-are-equal";
        // The wrong person: the one with the smaller number. Was it the one written with more digits?
        const smallerLonger = A > B ? pb > pa : pa > pb;
        return smallerLonger ? "more-digits-means-bigger" : "compared-the-wrong-place";
      };
      const picked = choose(
        r,
        { label: winner },
        [na, nb, sameLabel].filter((l) => l !== winner).map((label) => ({ label, why: tagFor(label) })),
      );
      const text = t(st.en(na, sa, nb, sb), st.es(na, sa, nb, sb));
      return {
        prompt: [text],
        say: text,
        ...picked,
        hints: [
          t("Both amounts use the same unit, so compare the numbers.", "Las dos cantidades usan la misma unidad, así que compara los números."),
          t("Write both numbers with two decimal places, then compare the hundredths.", "Escribe los dos números con dos lugares decimales y luego compara los centésimos."),
          pa === pb
            ? t("Compare the ones first, then the tenths, then the hundredths.", "Compara primero las unidades, luego los décimos y luego los centésimos.")
            : A === B
              ? t(`Add a zero to the end of ${pa === 1 ? sa : sb} so both numbers have two decimal places.`, `Agrega un cero al final de ${pa === 1 ? sa : sb} para que los dos números tengan dos lugares decimales.`)
              : pa === 1
                ? `${sa} = ${la}.`
                : `${sb} = ${lb}.`,
        ],
        steps: [t(`${la} is ${A} hundredths and ${lb} is ${B} hundredths.`, `${la} son ${A} centésimos y ${lb} son ${B} centésimos.`), `${sa} ${symOf(A - B)} ${sb}`, t(`Answer: ${winner}`, `Respuesta: ${winner}`)],
        seconds: 30,
      };
    },
  },
  {
    id: "m.measure.convert",
    subject: "math",
    grade: "4",
    title: { en: "Convert measurements", es: "Convertir medidas" },
    standard: "4.MD.A.1",
    prereqs: ["m.mult.multi"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      if (level === 1) {
        const c = r.pick(CONV4), n = r.int(2, 9), v = n * c.f;
        const big = uName(c.big, n, locale), small = uMany(c.small, locale), one = uName(c.big, 1, locale);
        const answer: Answer = { kind: "number", value: v };
        return {
          prompt: [`${n} ${big} = `, blank, ` ${small}`],
          say: t(`${n} ${big} equals how many ${small}?`, `¿${n} ${big} son ${cuantos(c.small).toLowerCase()} ${small}?`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[n + c.f, "added-instead-of-multiplied"], [n * c.wf, c.wfWhy]]),
          hints: [
            t(`How many ${small} are in 1 ${one}?`, `¿${cuantos(c.small)} ${small} hay en 1 ${one}?`),
            t(`1 ${one} = ${group(c.f)} ${small}, so multiply by ${group(c.f)}.`, `1 ${one} = ${group(c.f)} ${small}, así que multiplica por ${group(c.f)}.`),
            t(`${n} ${big} is ${n} groups of ${group(c.f)}.`, `${n} ${big} son ${n} grupos de ${group(c.f)}.`),
          ],
          steps: [`1 ${one} = ${group(c.f)} ${small}`, `${n} × ${group(c.f)} = ${group(v)}`, `${n} ${big} = ${group(v)} ${small}`],
          seconds: 15,
        };
      }
      if (level === 2) {
        const c = r.pick(CONV4);
        const n = r.int(1, 9), m = r.int(1, c.f - 1), total = n * c.f + m;
        const big = uName(c.big, n, locale), small = uMany(c.small, locale), mName = uName(c.small, m, locale), one = uName(c.big, 1, locale);
        if (r.bool(0.6)) {
          const answer: Answer = { kind: "number", value: total };
          return {
            prompt: [`${n} ${big} ${m} ${mName} = `, blank, ` ${small}`],
            say: t(`${n} ${big} ${m} ${mName} equals how many ${small}?`, `¿${n} ${big} ${m} ${mName} son ${cuantos(c.small).toLowerCase()} ${small}?`),
            input: "keypad",
            answer,
            wrong: misses(answer, [[n * c.f, "forgot-the-extra-part"], [Number(`${n}${m}`), "wrote-the-numbers-side-by-side"], [n + m, "added-without-converting"]]),
            hints: [
              t(`Change the ${uMany(c.big, "en")} to ${small} first.`, `Primero cambia ${c.big[4] ? "las" : "los"} ${uMany(c.big, "es")} a ${small}.`),
              t(`1 ${one} = ${group(c.f)} ${small}. Then add the ${m} ${mName}.`, `1 ${one} = ${group(c.f)} ${small}. Luego suma ${m} ${mName} más.`),
              `${n} × ${group(c.f)} = ${group(n * c.f)}.`,
            ],
            steps: [`${n} × ${group(c.f)} = ${group(n * c.f)}`, `${group(n * c.f)} + ${m} = ${group(total)}`, `${n} ${big} ${m} ${mName} = ${group(total)} ${small}`],
            seconds: 30,
          };
        }
        const answer: Answer = { kind: "number", value: m };
        return {
          prompt: [`${group(total)} ${small} = ${n} ${big} `, blank, ` ${small}`],
          say: t(`${group(total)} ${small} equals ${n} ${big} and how many ${small}?`, `¿${group(total)} ${small} son ${n} ${big} y ${cuantos(c.small).toLowerCase()} ${small}?`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[total - n, "subtracted-the-wrong-amount"], [total - n * c.wf, c.wfWhy]]),
          hints: [
            t(`How many ${small} are in ${n} ${big}?`, `¿${cuantos(c.small)} ${small} hay en ${n} ${big}?`),
            t(`Take the ${small} in ${n} ${big} away from ${group(total)}.`, `Quita de ${group(total)} ${c.small[4] ? "las" : "los"} ${small} que hay en ${n} ${big}.`),
            `${n} × ${group(c.f)} = ${group(n * c.f)}.`,
          ],
          steps: [`${n} × ${group(c.f)} = ${group(n * c.f)}`, `${group(total)} − ${group(n * c.f)} = ${m}`, `${group(total)} ${small} = ${n} ${big} ${m} ${mName}`],
          seconds: 30,
        };
      }
      const st = r.pick(CONVERT_STORIES), n = r.pick(NAMES), x = st.make(r);
      const [e1, v1, e2, ans] = st.work(x);
      const text = t(st.en(x, n), st.es(x, n));
      const answer: Answer = { kind: "number", value: ans };
      return {
        prompt: [text],
        say: text,
        input: "keypad",
        answer,
        wrong: misses(answer, st.wrong(x)),
        hints: [t("The units are different. Change them to the same unit first.", "Las unidades son distintas. Primero cámbialas a la misma unidad."), say2(locale, st.plan), `${e1} = ${group(v1)}.`],
        steps: [`${e1} = ${group(v1)}`, `${e2} = ${group(ans)}`, `${group(ans)} ${say2(locale, st.unit)}`],
        seconds: 60,
      };
    },
  },
  {
    id: "m.area.word",
    subject: "math",
    grade: "4",
    title: { en: "Area and perimeter word problems", es: "Problemas de área y perímetro" },
    standard: "4.MD.A.3",
    prereqs: ["m.area.rect", "m.mult.multi"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      if (level === 1) {
        const st = r.pick(AREA_STORIES), [u, lo, hi] = r.pick(st.sizes);
        const [l, w] = rectSize(r, lo, hi, st.thin);
        const word = say2(locale, u.word), sq = say2(locale, u.sq), cu = u.fem ? "Cuántas" : "Cuántos";
        const text = t(st.en(l, w, word), st.es(l, w, word, sq, cu));
        const area = st.kind === "area", value = area ? l * w : 2 * (l + w);
        const answer: Answer = { kind: "number", value };
        const ab = say2(locale, u.ab);
        return {
          prompt: [text],
          say: text,
          visual: { kind: "rect", w: l, h: w, unit: ab },
          alt: t(`A rectangle ${l} ${ab} long and ${w} ${ab} wide`, `Un rectángulo de ${l} ${ab} de largo y ${w} ${ab} de ancho`),
          input: "keypad",
          answer,
          wrong: misses(answer, area ? [[2 * (l + w), "found-perimeter-not-area"], [l + w, "added-two-sides"]] : [[l * w, "found-area-not-perimeter"], [l + w, "added-only-two-sides"]]),
          hints: [
            t("Is the question about the distance around the edge, or the space inside?", "¿La pregunta es sobre la distancia alrededor del borde o sobre el espacio de adentro?"),
            area ? t("The space inside is the area: length × width.", "El espacio de adentro es el área: largo × ancho.") : t("The distance around is the perimeter: add all four sides.", "La distancia alrededor es el perímetro: suma los cuatro lados."),
            area ? t(`Think of ${w} rows with ${l} squares in each row.`, `Piensa en ${w} filas con ${l} cuadrados en cada fila.`) : `${l} + ${w} = ${l + w}.`,
          ],
          steps: area
            ? [`${l} × ${w} = ${group(value)}`, t(`The area is ${group(value)} ${sq}.`, `El área es de ${group(value)} ${sq}.`)]
            : [`${l} + ${w} + ${l} + ${w} = ${value}`, t(`The perimeter is ${value} ${word}.`, `El perímetro es de ${value} ${word}.`)],
          seconds: area && w > 9 ? 60 : 45,
        };
      }
      const u = r.pick([FT, M]), word = say2(locale, u.word), sq = say2(locale, u.sq);
      if (r.bool()) {
        const l = r.int(6, 25), w = r.int(3, Math.min(12, l - 1)), A = l * w;
        const place = r.pick([
          ["A rectangular patio has an area of", "Un patio rectangular tiene un área de"],
          ["A rectangular garden bed has an area of", "Un huerto rectangular tiene un área de"],
          ["A rectangular mural covers", "Un mural rectangular cubre"],
        ] as const);
        const text = t(`${place[0]} ${A} ${sq}. It is ${l} ${word} long. How wide is it?`, `${place[1]} ${A} ${sq}. Mide ${l} ${word} de largo. ¿Cuánto mide de ancho?`);
        const answer: Answer = { kind: "number", value: w };
        return {
          prompt: [text, " ", blank, ` ${word}`],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[A - l, "subtracted-instead-of-divided"], A % 2 === 0 && A / 2 - l > 0 && [A / 2 - l, "used-the-perimeter-rule"]]),
          hints: [
            t("Area = length × width. You know the area and the length.", "Área = largo × ancho. Conoces el área y el largo."),
            t(`Divide the area by the length: ${A} ÷ ${l}.`, `Divide el área entre el largo: ${A} ÷ ${l}.`),
            t(`Think: ${l} × ? = ${A}.`, `Piensa: ${l} × ? = ${A}.`),
          ],
          steps: [`${A} ÷ ${l} = ${w}`, `${t("Check", "Comprueba")}: ${l} × ${w} = ${A}`, t(`It is ${w} ${word} wide.`, `Mide ${w} ${word} de ancho.`)],
          seconds: 50,
        };
      }
      const l = r.int(8, 40), w = r.int(3, l - 1), P = 2 * (l + w);
      const place = r.pick([
        [`A rectangular dog pen uses ${P} ${word} of fence all the way around.`, `Un corral rectangular para perros usa ${P} ${word} de cerca alrededor.`],
        [`A rectangular field has a perimeter of ${P} ${word}.`, `Un campo rectangular tiene un perímetro de ${P} ${word}.`],
      ] as const);
      const text = t(`${place[0]} It is ${l} ${word} long. How wide is it?`, `${place[1]} Mide ${l} ${word} de largo. ¿Cuánto mide de ancho?`);
      const answer: Answer = { kind: "number", value: w };
      return {
        prompt: [text, " ", blank, ` ${word}`],
        say: text,
        input: "keypad",
        answer,
        wrong: misses(answer, [[P - l, "subtracted-one-side-only"], [P - 2 * l, "forgot-to-halve"], [P / 2, "halved-only"]]),
        hints: [
          t("The perimeter goes along two lengths and two widths.", "El perímetro recorre dos largos y dos anchos."),
          t("Take both lengths away, then split what is left between the two widths.", "Quita los dos largos y reparte lo que queda entre los dos anchos."),
          `${l} + ${l} = ${2 * l}.`,
        ],
        steps: [`${P} − ${2 * l} = ${2 * w}`, `${2 * w} ÷ 2 = ${w}`, t(`It is ${w} ${word} wide.`, `Mide ${w} ${word} de ancho.`)],
        seconds: 50,
      };
    },
  },
  {
    id: "m.angles",
    subject: "math",
    grade: "4",
    title: { en: "Measure, add and classify angles", es: "Medir, sumar y clasificar ángulos" },
    standard: "4.MD.C.7",
    prereqs: ["m.time.clock", "m.addsub.3digit"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const KINDS: [Pair, Pair][] = [
        [["acute", "agudo"], ["an acute angle", "un ángulo agudo"]],
        [["right", "recto"], ["a right angle", "un ángulo recto"]],
        [["obtuse", "obtuso"], ["an obtuse angle", "un ángulo obtuso"]],
      ];
      if (level === 1) {
        const byClock = r.bool(0.4);
        let deg: number, h = 0;
        if (byClock) {
          h = r.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11]);
          deg = 30 * Math.min(h, 12 - h);
        } else {
          const kind = r.next();
          deg = kind < 0.4 ? r.int(2, 17) * 5 : kind < 0.6 ? 90 : r.int(19, 35) * 5;
        }
        const want = deg < 90 ? 0 : deg === 90 ? 1 : 2;
        const tag = (i: number) => (want === 1 ? "missed-the-right-angle" : i === 1 ? "right-angle-is-exactly-90" : "mixed-up-acute-and-obtuse");
        const choices: Choice[] = KINDS.map(([label], i) => ({ label: say2(locale, label), say: say2(locale, label), ...(i === want ? {} : { why: tag(i) }) }));
        const k = Math.min(h, 12 - h);
        const text = byClock
          ? t(`At ${h}:00, what kind of angle is the smaller angle between the clock hands?`, `A ${laLas(h * 60)} ${h}:00, ¿qué tipo de ángulo es el ángulo más pequeño entre las manecillas del reloj?`)
          : t(`An angle measures ${deg}°. What kind of angle is it?`, `Un ángulo mide ${deg}°. ¿Qué tipo de ángulo es?`);
        return {
          prompt: [text],
          say: spoken(text, locale),
          ...(byClock ? { visual: { kind: "clock" as const, h, m: 0 }, alt: t(`A clock showing ${h}:00`, `Un reloj que marca ${laLas(h * 60)} ${h}:00`) } : {}),
          choices,
          input: "choices",
          answer: { kind: "choice", index: want },
          hints: byClock
            ? [
                t("Each number on the clock is 30° from the next one.", "Cada número del reloj está a 30° del siguiente."),
                t(
                  "Count the jumps from one number to the next, going the short way from one hand to the other, and multiply by 30°. Then compare with 90°.",
                  "Cuenta los saltos de un número al siguiente, por el camino más corto de una manecilla a la otra, y multiplica por 30°. Luego compara con 90°.",
                ),
                t(`At ${h}:00, the short way from one hand to the other is ${k} ${pl(k, "jump", "jumps")}.`, `A ${laLas(h * 60)} ${h}:00, el camino más corto de una manecilla a la otra es de ${k} ${pl(k, "salto", "saltos")}.`),
              ]
            : [
                t("Compare the angle with a right angle. A right angle is 90°.", "Compara el ángulo con un ángulo recto. Un ángulo recto mide 90°."),
                t("Less than 90° is acute. Exactly 90° is right. More than 90° and less than 180° is obtuse.", "Menos de 90° es agudo. Exactamente 90° es recto. Más de 90° y menos de 180° es obtuso."),
                deg === 90
                  ? t("Picture the corner of a sheet of paper.", "Imagina la esquina de una hoja de papel.")
                  : deg < 90
                    ? t(`${deg}° is less than 90°.`, `${deg}° es menos que 90°.`)
                    : t(`${deg}° is more than 90°.`, `${deg}° es más que 90°.`),
              ],
          steps: [
            byClock ? `${k} × 30° = ${deg}°` : deg === 90 ? t("90° is exactly a right angle.", "90° es exactamente un ángulo recto.") : deg < 90 ? t(`${deg}° is less than 90°.`, `${deg}° es menos que 90°.`) : t(`${deg}° is between 90° and 180°.`, `${deg}° está entre 90° y 180°.`),
            t(`So it is ${KINDS[want][1][0]}.`, `Así que es ${KINDS[want][1][1]}.`),
          ],
          seconds: 12,
        };
      }
      if (level === 2) {
        if (r.bool()) {
          const h = r.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11]), k = Math.min(h, 12 - h), deg = 30 * k;
          const answer: Answer = { kind: "number", value: deg };
          const text = t(`How many degrees is the smaller angle between the clock hands at ${h}:00?`, `¿Cuántos grados mide el ángulo más pequeño entre las manecillas del reloj a ${laLas(h * 60)} ${h}:00?`);
          return {
            prompt: [text, " ", blank, "°"],
            say: text,
            visual: { kind: "clock", h, m: 0 },
            alt: t(`A clock showing ${h}:00`, `Un reloj que marca ${laLas(h * 60)} ${h}:00`),
            input: "keypad",
            answer,
            wrong: misses(answer, [[5 * k, "counted-minutes-not-degrees"], [360 - deg, "measured-the-outside-angle"]]),
            hints: [
              t("A full turn around the clock is 360°.", "Una vuelta completa al reloj mide 360°."),
              t("The 12 hour marks split the full turn into 12 equal angles.", "Las 12 marcas de hora dividen la vuelta completa en 12 ángulos iguales."),
              t(`Going the short way, the hands are ${k} ${pl(k, "jump", "jumps")} apart, from one number to the next.`, `Por el camino más corto, las manecillas están a ${k} ${pl(k, "salto", "saltos")} de distancia, de un número al siguiente.`),
            ],
            steps: [`360° ÷ 12 = 30°`, `${k} × 30° = ${deg}°`],
            seconds: 20,
          };
        }
        const [n, d] = r.pick([[1, 2], [1, 4], [3, 4], [1, 3], [2, 3], [1, 6], [5, 6], [1, 8], [3, 8], [1, 12], [5, 12], [1, 10], [1, 5], [2, 5], [1, 9], [1, 36]] as const);
        const deg = (360 * n) / d;
        const answer: Answer = { kind: "number", value: deg };
        return {
          prompt: [t("How many degrees is ", "¿Cuántos grados son "), fr(n, d), t(" of a full turn?", " de una vuelta completa?"), " ", blank, "°"],
          say: t(`How many degrees is ${sayFrac(n, d, locale)} of a full turn?`, n === 1 && d === 2 ? "¿Cuántos grados son media vuelta?" : `¿Cuántos grados son ${sayFrac(n, d, locale)} de una vuelta completa?`),
          input: "keypad",
          answer,
          wrong: misses(answer, [
            n > 1 && [360 / d, "found-only-one-part"],
            [360 - deg, "found-the-rest-of-the-turn"],
            (100 * n) % d === 0 && [(100 * n) / d, "thought-a-turn-is-100-degrees"],
            (180 * n) % d === 0 && [(180 * n) / d, "used-a-half-turn-as-the-whole"],
          ]),
          hints: [
            t("A full turn is 360°.", "Una vuelta completa mide 360°."),
            t(`Find ${ft(1, d)} of 360° first${n > 1 ? `, then take ${n} of those parts` : ""}.`, `Primero encuentra ${ft(1, d)} de 360°${n > 1 ? `, luego toma ${n} de esas partes` : ""}.`),
            n > 1 ? `360° ÷ ${d} = ${360 / d}°.` : t(`${d} equal angles fill the full turn.`, `${d} ángulos iguales llenan la vuelta completa.`),
          ],
          steps: [`360° ÷ ${d} = ${360 / d}°`, ...(n > 1 ? [`${n} × ${360 / d}° = ${deg}°`] : []), t(`${ft(n, d)} of a turn is ${deg}°.`, `${ft(n, d)} de vuelta son ${deg}°.`)],
          seconds: 20,
        };
      }
      const kind = r.int(0, 4), n = r.pick(NAMES);
      let text: string, value: number, slips: Miss[], hints: string[], steps: string[];
      if (kind === 0) {
        const a = r.int(10, 85), b = r.int(10, 85);
        value = a + b;
        text = t(`Angle ABC is made of two angles that do not overlap. One is ${a}° and the other is ${b}°. What is the measure of angle ABC?`, `El ángulo ABC está formado por dos ángulos que no se superponen. Uno mide ${a}° y el otro mide ${b}°. ¿Cuánto mide el ángulo ABC?`);
        slips = [[Math.abs(a - b), "subtracted-instead-of-added"]];
        hints = [t("The whole angle is the sum of its parts.", "El ángulo completo es la suma de sus partes."), t(`Add the two parts: ${a}° + ${b}°.`, `Suma las dos partes: ${a}° + ${b}°.`), t(`Write it as an equation: ${a}° + ${b}° = x.`, `Escríbelo como ecuación: ${a}° + ${b}° = x.`)];
        steps = [`${a}° + ${b}° = ${value}°`, t(`Angle ABC measures ${value}°.`, `El ángulo ABC mide ${value}°.`)];
      } else if (kind === 1) {
        const a = r.int(10, 80);
        value = 90 - a;
        text = t(`A right angle is split into two angles. One is ${a}°. How many degrees is the other?`, `Un ángulo recto está dividido en dos ángulos. Uno mide ${a}°. ¿Cuántos grados mide el otro?`);
        slips = [[180 - a, "used-180-for-a-right-angle"], [90 + a, "added-instead-of-subtracted"]];
        hints = [t("A right angle measures 90°.", "Un ángulo recto mide 90°."), t("The two parts add up to 90°, so subtract the part you know.", "Las dos partes suman 90°, así que resta la parte que conoces."), t(`Write it as an equation: ${a}° + x = 90°.`, `Escríbelo como ecuación: ${a}° + x = 90°.`)];
        steps = [`90° − ${a}° = ${value}°`, `${t("Check", "Comprueba")}: ${a}° + ${value}° = 90°`, t(`The other angle is ${value}°.`, `El otro ángulo mide ${value}°.`)];
      } else if (kind === 2) {
        const a = r.int(20, 160);
        value = 180 - a;
        text = t(`A straight angle is split into two angles. One is ${a}°. How many degrees is the other?`, `Un ángulo llano está dividido en dos ángulos. Uno mide ${a}°. ¿Cuántos grados mide el otro?`);
        slips = [[90 - a, "used-90-for-a-straight-angle"], [360 - a, "used-360-for-a-straight-angle"]];
        hints = [t("A straight angle measures 180°.", "Un ángulo llano mide 180°."), t("The two parts add up to 180°, so subtract the part you know.", "Las dos partes suman 180°, así que resta la parte que conoces."), t(`Write it as an equation: ${a}° + x = 180°.`, `Escríbelo como ecuación: ${a}° + x = 180°.`)];
        steps = [`180° − ${a}° = ${value}°`, `${t("Check", "Comprueba")}: ${a}° + ${value}° = 180°`, t(`The other angle is ${value}°.`, `El otro ángulo mide ${value}°.`)];
      } else if (kind === 3) {
        const a = r.int(18, 34) * 5, b = r.int(Math.max(18, 38 - a / 5), 34) * 5;
        value = 360 - a - b;
        text = t(`Three angles fill a full turn around a point. Two of them are ${a}° and ${b}°. How many degrees is the third?`, `Tres ángulos completan una vuelta entera alrededor de un punto. Dos de ellos miden ${a}° y ${b}°. ¿Cuántos grados mide el tercero?`);
        slips = [[180 - a - b, "used-180-for-a-full-turn"], [a + b, "stopped-after-adding"]];
        hints = [t("A full turn measures 360°.", "Una vuelta completa mide 360°."), t("Add the two angles you know, then subtract from 360°.", "Suma los dos ángulos que conoces y luego réstalos de 360°."), `${a}° + ${b}° = ${a + b}°.`];
        steps = [`${a}° + ${b}° = ${a + b}°`, `360° − ${a + b}° = ${value}°`, t(`The third angle is ${value}°.`, `El tercer ángulo mide ${value}°.`)];
      } else {
        const [a, b] = r.pick([[90, 45], [45, 90], [90, 90], [180, 90], [90, 180], [30, 60], [60, 30], [45, 45], [135, 45], [120, 60], [180, 45], [150, 30]] as const);
        value = a + b;
        text = t(`${n} turns ${a}° on a skateboard, then turns ${b}° more in the same direction. How many degrees did ${n} turn in all?`, `${n} gira ${a}° en su patineta y luego gira ${b}° más en la misma dirección. ¿Cuántos grados giró en total?`);
        slips = [[Math.abs(a - b), "subtracted-instead-of-added"]];
        hints = [t("Turns in the same direction add up.", "Los giros en la misma dirección se suman."), t(`Add the two turns: ${a}° + ${b}°.`, `Suma los dos giros: ${a}° + ${b}°.`), t(`Write it as an equation: ${a}° + ${b}° = x.`, `Escríbelo como ecuación: ${a}° + ${b}° = x.`)];
        steps = [`${a}° + ${b}° = ${value}°`, t(`${n} turned ${value}°.`, `${n} giró ${value}°.`)];
      }
      const answer: Answer = { kind: "number", value };
      return {
        prompt: [text, " ", blank, "°"],
        say: spoken(text, locale),
        input: "keypad",
        answer,
        wrong: misses(answer, slips),
        hints,
        steps,
        seconds: 30,
      };
    },
  },
  {
    id: "m.symmetry",
    subject: "math",
    grade: "4",
    title: { en: "Lines of symmetry", es: "Ejes de simetría" },
    standard: "4.G.A.3",
    prereqs: ["m.area.rect"],
    content: "draft",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const b = (x: Bi) => tr(locale, x.en, x.es);
      const nudge = t("A line of symmetry is a fold line: both halves must match exactly.", "Un eje de simetría es una línea de doblez: las dos mitades deben coincidir exactamente.");
      if (level === 1) {
        const e = r.pick(SYMMETRY_YES_NO);
        const yes: Choice = { label: t("Yes", "Sí"), say: t("yes", "sí") }, no: Choice = { label: t("No", "No"), say: t("no", "no") };
        const choices = [e.yes ? yes : { ...yes, why: e.tag }, e.yes ? { ...no, why: e.tag } : no];
        return {
          prompt: [b(e.q)],
          say: b(e.q),
          choices,
          input: "choices",
          answer: { kind: "choice", index: e.yes ? 0 : 1 },
          hints: [nudge, b(e.clue), b(e.look)],
          steps: [b(e.why), e.yes ? t("Yes, it has a line of symmetry.", "Sí, tiene un eje de simetría.") : t("No, it has no line of symmetry.", "No, no tiene ningún eje de simetría.")],
          seconds: 15,
        };
      }
      const e = r.pick(SYMMETRY_COUNT);
      const right: Choice = { label: String(e.n), say: String(e.n) };
      const picked = choose(r, right, e.wrong.map(([v, why]) => ({ label: String(v), say: String(v), why })));
      const q = t(`How many lines of symmetry does ${e.shape.en} have?`, `¿Cuántos ejes de simetría tiene ${e.shape.es}?`);
      return {
        prompt: [q],
        say: q,
        ...picked,
        hints: [nudge, b(e.clue), b(e.look)],
        steps: [b(e.why), t(`It has ${e.n} ${pl(e.n, "line", "lines")} of symmetry.`, `Tiene ${e.n} ${pl(e.n, "eje", "ejes")} de simetría.`)],
        seconds: 20,
      };
    },
  },

  // ======================= grade 5 =======================
  {
    id: "m.div.2digit",
    subject: "math",
    grade: "5",
    title: { en: "Divide by a 2-digit number", es: "Dividir entre un número de 2 cifras" },
    standard: "5.NBT.B.6",
    prereqs: ["m.div.long", "m.mult.multi"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const twoDigit = () => {
        let d = r.int(11, 99);
        while (d % 10 === 0) d = r.int(11, 99);
        return d;
      };
      if (level === 1) {
        let d: number, q: number, R: number, est: number;
        do {
          d = twoDigit();
          q = r.int(2, 9);
          R = round10(d);
          est = Math.max(1, Math.min(9, Math.floor((d * q) / R)));
          // An estimate at most 2 away, so the worked steps can adjust one at a time and still fit.
        } while (d * q < 100 || Math.abs(est - q) > 2);
        const n = d * q;
        const work = [t(`${R} × ${est} = ${R * est}, so try ${est}.`, `${R} × ${est} = ${R * est}, así que prueba con ${est}.`)];
        for (let e = est; e !== q; e += e < q ? 1 : -1) {
          const much = d * e > n, next = much ? e - 1 : e + 1;
          work.push(t(`${d} × ${e} = ${d * e}, which is too ${much ? "much" : "little"}, so try ${next}.`, `${d} × ${e} = ${d * e}, que es ${much ? "demasiado" : "muy poco"}, así que prueba con ${next}.`));
        }
        const answer: Answer = { kind: "number", value: q };
        return {
          prompt: [`${n} ÷ ${d} = `, blank],
          say: t(`${n} divided by ${d}`, `${n} entre ${d}`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[q + 1, "estimate-not-adjusted"], [q - 1, "estimate-not-adjusted"]]),
          hints: [
            t(`${d} is close to ${R}. About how many ${R}s are in ${n}?`, `${d} se acerca a ${R}. ¿Cuántas veces cabe ${R} en ${n}, más o menos?`),
            t(`Estimate with ${R}, then multiply ${d} by your estimate and adjust.`, `Estima con ${R}, luego multiplica ${d} por tu estimación y ajusta.`),
            // The estimate only: the learner still multiplies to check it.
            t(`${R} × ${est} = ${R * est}. Now multiply ${d} by your estimate to check it.`, `${R} × ${est} = ${R * est}. Ahora multiplica ${d} por tu estimación para comprobarla.`),
          ],
          steps: work.length < 3 ? [...work, `${d} × ${q} = ${n}`, `${n} ÷ ${d} = ${q}`] : [...work, t(`${d} × ${q} = ${n}, so ${n} ÷ ${d} = ${q}`, `${d} × ${q} = ${n}, así que ${n} ÷ ${d} = ${q}`)],
          seconds: 30,
        };
      }
      let d: number, q: number, rem = 0;
      if (level === 2) {
        do {
          d = twoDigit();
          q = r.bool(0.15) ? r.int(2, 9) * 10 : r.int(11, 99);
        } while (d * q < 1000 || d * q > 9999);
      } else {
        do {
          d = twoDigit();
          q = r.int(5, 99);
          rem = r.int(1, d - 1);
        } while (d * q + rem < 100 || d * q + rem > 9999);
      }
      const n = d * q + rem, stages = longDivision(n, d), R = round10(d);
      const lines = stages.map((s) => stageText(s, d, locale));
      // With a one-digit quotient the first stage is the whole answer, so the hint stops at an estimate.
      const e = Math.max(1, Math.min(9, Math.floor(stages[0].chunk / R)));
      const firstStep = stages.length > 1 ? lines[0] : t(`Estimate with ${R}: ${R} × ${e} = ${R * e}. Try ${e}, then multiply ${d} × ${e} and adjust.`, `Estima con ${R}: ${R} × ${e} = ${R * e}. Prueba con ${e}, luego multiplica ${d} × ${e} y ajusta.`);
      const answer: Answer = rem ? { kind: "remainder", q, r: rem } : { kind: "number", value: q };
      return {
        prompt: [`${group(n)} ÷ ${d} = `, blank],
        say: t(`${group(n)} divided by ${d}`, `${group(n)} entre ${d}`),
        input: rem ? "remainder" : "keypad",
        answer,
        wrong: misses(
          answer,
          rem
            ? [[`${q - 1} R ${rem + d}`, "remainder-not-less-than-divisor"], [String(q), "dropped-the-remainder"]]
            : [q % 10 === 0 && [q / 10, "dropped-a-zero-in-the-quotient"], [q + 1, "estimate-not-adjusted"], [q - 1, "estimate-not-adjusted"]],
        ),
        hints: [
          t(`How many ${d}s fit in ${stages[0].chunk}?`, `¿Cuántas veces cabe ${d} en ${stages[0].chunk}?`),
          t(`Divide, multiply, subtract, bring down. Round ${d} to ${R} to estimate each digit.`, `Divide, multiplica, resta y baja la siguiente cifra. Redondea ${d} a ${R} para estimar cada cifra.`),
          firstStep,
        ],
        steps: [
          ...lines,
          rem
            ? t(`${group(n)} ÷ ${d} = ${q} R ${rem} (check: ${q} × ${d} + ${rem} = ${group(n)})`, `${group(n)} ÷ ${d} = ${q} R ${rem} (comprueba: ${q} × ${d} + ${rem} = ${group(n)})`)
            : t(`${group(n)} ÷ ${d} = ${q} (check: ${q} × ${d} = ${group(n)})`, `${group(n)} ÷ ${d} = ${q} (comprueba: ${q} × ${d} = ${group(n)})`),
        ],
        seconds: level === 2 ? 60 : 75,
      };
    },
  },
  {
    id: "m.dec.thousandths",
    subject: "math",
    grade: "5",
    title: { en: "Compare, place and round decimals to thousandths", es: "Comparar, ubicar y redondear decimales hasta los milésimos" },
    standard: "5.NBT.A.3",
    prereqs: ["m.dec.hundredths", "m.pow10"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const last = () => r.int(1, 9);
      if (level === 1) {
        // Values in thousandths; pa, pb are how many decimal places each is written with.
        const whole = r.int(0, 9) * 1000, style = r.next();
        let A: number, B: number, pa: number, pb: number;
        if (style < 0.15) {
          A = B = whole + r.int(1, 9) * 100 + r.int(1, 9) * 10;
          [pa, pb] = r.shuffle([2, 3]);
        } else if (style < 0.5) {
          const tenths = r.int(1, 9);
          A = whole + tenths * 100;
          B = whole + r.int(0, tenths - 1) * 100 + r.int(0, 9) * 10 + last();
          [pa, pb] = [1, 3];
          if (r.bool()) [A, B, pa, pb] = [B, A, pb, pa];
        } else if (style < 0.65) {
          const tenths = r.int(1, 8);
          A = whole + tenths * 100;
          B = whole + tenths * 100 + r.int(0, 9) * 10 + last();
          [pa, pb] = [1, 3];
          if (r.bool()) [A, B, pa, pb] = [B, A, pb, pa];
        } else {
          A = whole + r.int(0, 99) * 10 + last();
          B = whole + r.int(0, 99) * 10 + last();
          while (B === A) B = whole + r.int(0, 99) * 10 + last();
          pa = pb = 3;
        }
        const sa = dec(A / 10 ** (3 - pa), pa), sb = dec(B / 10 ** (3 - pb), pb);
        const la = dec(A, 3), lb = dec(B, 3);
        const diff = A - B;
        const tag = (i: number) => {
          if (diff === 0) return "trailing-zero-changes-value";
          if (i === 2) return "thought-they-are-equal";
          const biggerShorter = diff > 0 ? pa < pb : pb < pa;
          return biggerShorter ? "more-digits-means-bigger" : "compared-the-wrong-place";
        };
        return {
          prompt: [`${sa} `, blank, ` ${sb}`],
          say: t(`Compare ${sa} and ${sb}.`, `Compara ${sa} y ${sb}.`),
          ...symbols(diff, tag, locale),
          hints: [
            t("Line up the decimal points.", "Alinea los puntos decimales."),
            t("Write both numbers with three decimal places. Then compare place by place from the left.", "Escribe los dos números con tres lugares decimales. Luego compara lugar por lugar desde la izquierda."),
            pa === pb
              ? t("Compare the ones, then the tenths, then the hundredths.", "Compara las unidades, luego los décimos y luego los centésimos.")
              : diff === 0
                ? t(`Add a zero to the end of ${pa < pb ? sa : sb} so both numbers have three decimal places.`, `Agrega un cero al final de ${pa < pb ? sa : sb} para que los dos números tengan tres lugares decimales.`)
                : pa < pb
                  ? `${sa} = ${la}.`
                  : `${sb} = ${lb}.`,
          ],
          steps: [t(`${la} is ${A} thousandths and ${lb} is ${B} thousandths.`, `${la} son ${A} milésimos y ${lb} son ${B} milésimos.`), `${sa} ${symOf(diff)} ${sb}`],
          seconds: 15,
        };
      }
      if (level === 2) {
        const fine = r.bool();
        const p = fine ? 3 : 2;
        const base = fine ? r.int(0, 4) * 100 + r.int(1, 99) : r.int(0, 4) * 10 + r.int(1, 9);
        let k = r.int(1, 9);
        while (k === 5) k = r.int(1, 9);
        const lo = base * 10, hi = lo + 10, x = lo + k;
        const xs = dec(x, p), loS = num(lo, p), hiS = num(hi, p), stepS = fine ? "0.001" : "0.01";
        const answer: Answer = { kind: "number", value: Number(xs) };
        const unitName = fine ? t(pl(k, "thousandth", "thousandths"), pl(k, "milésimo", "milésimos")) : t(pl(k, "hundredth", "hundredths"), pl(k, "centésimo", "centésimos"));
        const q = t(`Put ${xs} on the number line.`, `Ubica ${xs} en la recta numérica.`);
        const pad: Pad = { kind: "number-line", min: Number(loS), max: Number(hiS), step: Number(stepS) };
        return {
          prompt: [q],
          say: q,
          input: "number-line",
          pad,
          answer,
          wrong: onPad(pad, misses(answer, [[dec(lo + hi - x, p), "counted-from-the-wrong-end"]])),
          hints: [
            t(`The line goes from ${loS} to ${hiS}. What is each small step worth?`, `La recta va de ${loS} a ${hiS}. ¿Cuánto vale cada paso pequeño?`),
            t(`There are 10 equal steps of ${stepS}. Count steps from ${loS}.`, `Hay 10 pasos iguales de ${stepS}. Cuenta los pasos desde ${loS}.`),
            t(`${xs} is ${loS} and ${k} ${unitName} more.`, `${xs} es ${loS} y ${k} ${unitName} más.`),
          ],
          steps: [t(`Each step is ${stepS}.`, `Cada paso vale ${stepS}.`), t(`Count ${k} ${pl(k, "step", "steps")} from ${loS} to reach ${xs}.`, `Cuenta ${k} ${pl(k, "paso", "pasos")} desde ${loS} para llegar a ${xs}.`)],
          seconds: 20,
        };
      }
      const place = r.int(0, 2), u = [1000, 100, 10][place];
      const W = r.int(0, 20) * 1000;
      let x: number;
      const trap = r.bool(0.3);
      if (trap && place === 1) x = W + r.int(0, 9) * 100 + 40 + r.int(5, 9);
      else if (trap && place === 0) x = W + 400 + r.int(5, 9) * 10 + r.int(0, 9);
      else x = W + r.int(0, 99) * 10 + last();
      if (x % 10 === 0) x += 1;
      const lo = Math.floor(x / u) * u, hi = lo + u, half = lo + u / 2, up = x >= half, ans = up ? hi : lo;
      let chain = x;
      for (let v = 10; v <= u; v *= 10) chain = Math.floor((chain + v / 2) / v) * v;
      const other = u === 1000 ? 100 : u === 100 ? 10 : 100;
      const otherRound = Math.floor((x + other / 2) / other) * other;
      const xs = dec(x, 3), ansS = num(ans, 3);
      const names: [string, string, string, string][] = [
        ["whole number", "al entero más cercano", "whole numbers", "números enteros"],
        ["tenth", "al décimo más cercano", "tenths", "décimos"],
        ["hundredth", "al centésimo más cercano", "hundredths", "centésimos"],
      ];
      const next: Pair[] = [["tenths", "décimos"], ["hundredths", "centésimos"], ["thousandths", "milésimos"]];
      const digit = Math.floor(x / (u / 10)) % 10;
      const answer: Answer = { kind: "number", value: Number(ansS) };
      const q = t(`Round ${xs} to the nearest ${names[place][0]}.`, `Redondea ${xs} ${names[place][1]}.`);
      return {
        prompt: [q],
        say: q,
        visual: { kind: "number-line", min: Number(num(lo, 3)), max: Number(num(hi, 3)), marks: (u === 10 ? [lo, hi] : [lo, half, hi]).map((v) => Number(num(v, 3))), marker: Number(xs) },
        alt: t(`A number line from ${num(lo, 3)} to ${num(hi, 3)} with a dot at ${xs}`, `Una recta numérica de ${num(lo, 3)} a ${num(hi, 3)} con un punto en ${xs}`),
        input: "keypad",
        keys: ["."],
        answer,
        wrong: misses(answer, [[num(up ? lo : hi, 3), "rounded-the-wrong-way"], [num(chain, 3), "rounded-in-steps"], [num(otherRound, 3), "rounded-to-the-wrong-place"]]),
        hints: [
          t(`Which two ${names[place][2]} is ${xs} between?`, `¿Entre qué dos ${names[place][3]} está ${xs}?`),
          t(`${xs} is between ${num(lo, 3)} and ${num(hi, 3)}. Halfway is ${num(half, 3)}.`, `${xs} está entre ${num(lo, 3)} y ${num(hi, 3)}. La mitad del camino es ${num(half, 3)}.`),
          t(`Look at the ${next[place][0]} digit: ${digit}. Is it 5 or more?`, `Mira la cifra de los ${next[place][1]}: ${digit}. ¿Es 5 o más?`),
        ],
        steps: [
          t(`${xs} is between ${num(lo, 3)} and ${num(hi, 3)}.`, `${xs} está entre ${num(lo, 3)} y ${num(hi, 3)}.`),
          up
            ? t(`The ${next[place][0]} digit is ${digit}, which is 5 or more, so round up.`, `La cifra de los ${next[place][1]} es ${digit}, que es 5 o más, así que redondea hacia arriba.`)
            : t(`The ${next[place][0]} digit is ${digit}, which is less than 5, so round down.`, `La cifra de los ${next[place][1]} es ${digit}, que es menos de 5, así que redondea hacia abajo.`),
          t(`${xs} rounds to ${ansS}.`, `${xs} se redondea a ${ansS}.`),
        ],
        seconds: 20,
      };
    },
  },
  {
    id: "m.dec.divide",
    subject: "math",
    grade: "5",
    title: { en: "Divide decimals", es: "Dividir decimales" },
    standard: "5.NBT.B.7",
    prereqs: ["m.dec.mult", "m.div.2digit"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      if (level === 1) {
        const p = r.pick([1, 2]);
        let Qi = p === 1 ? r.int(11, 99) : r.int(101, 999);
        while (Qi % 10 === 0) Qi = p === 1 ? r.int(11, 99) : r.int(101, 999);
        const w = r.int(2, 9), Di = Qi * w, D = num(Di, p), ans = dec(Qi, p);
        const place = p === 1 ? t("tenths", "décimos") : t("hundredths", "centésimos");
        const answer: Answer = { kind: "number", value: Number(ans) };
        return {
          prompt: [`${D} ÷ ${w} = `, blank],
          say: t(`${D} divided by ${w}`, `${D} entre ${w}`),
          input: "keypad",
          keys: ["."],
          answer,
          wrong: misses(answer, [[dec(Qi, p + 1), "decimal-point-too-far-left"], [String(Qi), "left-out-the-decimal-point"]]),
          hints: [
            t(`Think of ${D} as ${Di} ${place}.`, `Piensa en ${D} como ${Di} ${place}.`),
            t(`Divide the ${Di} ${place} by ${w}. The answer is in ${place} too.`, `Divide los ${Di} ${place} entre ${w}. La respuesta también está en ${place}.`),
            `${Di} ÷ ${w} = ${Qi}.`,
          ],
          steps: [`${D} = ${Di} ${place}`, `${Di} ÷ ${w} = ${Qi}`, `${Qi} ${place} = ${ans}`, `${D} ÷ ${w} = ${ans}`],
          seconds: 30,
        };
      }
      const hundredths = level === 3;
      const money = hundredths && r.bool(0.3);
      const si = money ? r.pick([5, 10, 15, 20, 25, 50]) : hundredths ? r.pick([2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 25]) : r.int(2, 9);
      const q = money ? r.int(3, 20) : r.bool(0.3) ? r.int(2, 5) * 10 : r.int(2, hundredths ? 20 : 12);
      const p = hundredths ? 2 : 1, f = hundredths ? 100 : 10;
      const Di = q * si, s = dec(si, p);
      const D = money ? dec(Di, 2) : num(Di, p);
      const story = money ? MONEY_DIV : r.bool(0.3) ? r.pick(DEC_DIV_STORIES) : null;
      const n = r.pick(NAMES);
      const answer: Answer = { kind: "number", value: q };
      const text = story ? t(story.en(D, s, n), story.es(D, s, n)) : "";
      return {
        prompt: story ? [text] : [`${D} ÷ ${s} = `, blank],
        say: story ? spoken(text, locale) : t(`${D} divided by ${s}`, `${D} entre ${s}`),
        input: "keypad",
        keys: ["."],
        answer,
        wrong: misses(answer, hundredths ? [[num(q, 2), "moved-only-one-decimal-point"], [q * 10, "moved-the-point-too-far"]] : [[num(q, 1), "moved-only-one-decimal-point"], [q * 10, "moved-the-point-too-far"]]),
        hints: [
          t("Make the divisor a whole number.", "Haz que el divisor sea un número entero."),
          t(`Multiply both numbers by ${f}. The quotient stays the same.`, `Multiplica los dos números por ${f}. El cociente no cambia.`),
          t(`${D} × ${f} = ${Di} and ${s} × ${f} = ${si}.`, `${D} × ${f} = ${Di} y ${s} × ${f} = ${si}.`),
        ],
        steps: [`${D} ÷ ${s} = ${Di} ÷ ${si}`, `${Di} ÷ ${si} = ${q}`, ...(story ? [`${q} ${say2(locale, story.unit)}`] : [])],
        seconds: story ? 50 : 30,
      };
    },
  },
  {
    id: "m.frac.asdiv",
    subject: "math",
    grade: "5",
    title: { en: "Fractions as division", es: "Las fracciones como división" },
    standard: "5.NF.B.3",
    prereqs: ["m.frac.mixed", "m.frac.times.whole"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const pair = (dens: number[], minTop: number, maxTop: (b: number) => number) => {
        for (;;) {
          const b = r.pick(dens), a = r.int(minTop, maxTop(b));
          if (a % b !== 0) return [a, b];
        }
      };
      const mixedLine = (a: number, b: number) => (a > b ? [`${ft(a, b)} = ${simplest(a, b)}`] : []);
      if (level === 1) {
        const [a, b] = pair([2, 3, 4, 5, 6, 8, 10, 12], 1, (b) => (r.bool(0.7) ? b - 1 : 3 * b));
        const form = r.int(0, 2);
        if (form === 0) {
          const answer: Answer = { kind: "fraction", n: a, d: b };
          return {
            prompt: [`${a} ÷ ${b} = `, blank],
            say: t(`${a} divided by ${b}`, `${a} entre ${b}`),
            input: "fraction",
            answer,
            wrong: misses(answer, [[ft(b, a), "flipped-the-fraction"], a > b && [String(Math.floor(a / b)), "dropped-the-remainder"]]),
            hints: [
              t("A fraction bar means divide.", "La raya de una fracción significa dividir."),
              t("The number being divided goes on top. The number you divide by goes on the bottom.", "El número que se divide va arriba. El número entre el que divides va abajo."),
              t(`The number being divided is ${a}.`, `El número que se divide es ${a}.`),
            ],
            steps: [t(`${a} divided by ${b} is ${a} over ${b}.`, `${a} entre ${b} es ${a} sobre ${b}.`), `${a} ÷ ${b} = ${ft(a, b)}`, ...mixedLine(a, b)],
            seconds: 12,
          };
        }
        const top = form === 1;
        const answer: Answer = { kind: "number", value: top ? a : b };
        return {
          prompt: top ? [fr(a, b), " = ", blank, ` ÷ ${b}`] : [fr(a, b), ` = ${a} ÷ `, blank],
          say: cap(top ? t(`${sayFrac(a, b, locale)} equals what number divided by ${b}?`, `¿${sayFrac(a, b, locale)} es igual a qué número entre ${b}?`) : t(`${sayFrac(a, b, locale)} equals ${a} divided by what number?`, `¿${sayFrac(a, b, locale)} es igual a ${a} entre qué número?`)),
          input: "keypad",
          answer,
          wrong: misses(answer, [[top ? b : a, "flipped-the-fraction"]]),
          hints: [
            t("A fraction bar means divide.", "La raya de una fracción significa dividir."),
            t("The top number is divided by the bottom number.", "El número de arriba se divide entre el de abajo."),
            top ? t(`The bottom number of ${ft(a, b)} is ${b}.`, `El número de abajo de ${ft(a, b)} es ${b}.`) : t(`The top number of ${ft(a, b)} is ${a}.`, `El número de arriba de ${ft(a, b)} es ${a}.`),
          ],
          steps: [`${ft(a, b)} = ${a} ÷ ${b}`],
          seconds: 10,
        };
      }
      if (level === 2) {
        const st = r.pick(FRAC_SHARE_STORIES), n = r.pick(NAMES);
        const [a, p] = pair([2, 3, 4, 5, 6, 8], 1, (b) => (r.bool() ? b - 1 : Math.min(12, 3 * b)));
        const text = t(st.en(a, p, n), st.es(a, p, n));
        const answer: Answer = { kind: "fraction", n: a, d: p };
        return {
          prompt: [text],
          say: text,
          input: "fraction",
          answer,
          wrong: misses(answer, [[ft(p, a), "flipped-the-fraction"], [ft(1, p), "shared-only-one-whole"], a > p && [String(Math.floor(a / p)), "dropped-the-remainder"]]),
          hints: [
            t("Sharing equally means dividing.", "Repartir en partes iguales es dividir."),
            t(`Divide the amount by the number of shares: ${a} ÷ ${p}.`, `Divide la cantidad entre el número de partes: ${a} ÷ ${p}.`),
            a === 1
              ? t(`Cut the whole into ${p} equal pieces. Each share gets 1 piece.`, `Corta el entero en ${p} partes iguales. A cada uno le toca 1 pedazo.`)
              : t(`Cut each of the ${a} wholes into ${p} equal pieces. Each share gets 1 piece from every whole.`, `Corta cada uno de los ${a} enteros en ${p} partes iguales. A cada uno le toca 1 pedazo de cada entero.`),
          ],
          steps: [`${a} ÷ ${p} = ${ft(a, p)}`, ...mixedLine(a, p), say2(locale, st.done(simplest(a, p), a > p))],
          seconds: 45,
        };
      }
      const [a, b] = pair([2, 3, 4, 5, 6, 8], 1, (b) => (r.bool(0.2) ? b - 1 : 4 * b - 1));
      const answer: Answer = { kind: "fraction", n: a, d: b };
      const w = Math.floor(a / b);
      const q = t(`Put ${a} ÷ ${b} on the number line.`, `Ubica ${a} ÷ ${b} en la recta numérica.`);
      const pad: Pad = { kind: "number-line", min: 0, max: 4, step: 1 / b, denominator: b };
      return {
        prompt: [q],
        say: t(`Put ${a} divided by ${b} on the number line.`, `Ubica ${a} entre ${b} en la recta numérica.`),
        input: "number-line",
        pad,
        answer,
        // A flipped fraction is often off the line or between ticks, so it is kept only where it can be tapped.
        wrong: onPad(pad, misses(answer, [[ft(b, a), "flipped-the-fraction"], w > 0 && [String(w), "dropped-the-remainder"], [ft(a - 1, b), "counted-ticks-not-jumps"]])),
        hints: [
          t(`${a} ÷ ${b} is the same as the fraction with ${a} on top and ${b} on the bottom.`, `${a} ÷ ${b} es lo mismo que la fracción con ${a} arriba y ${b} abajo.`),
          t(`Each whole on the line is split into ${b} equal parts. Count ${a} parts from 0.`, `Cada entero de la recta está dividido en ${b} partes iguales. Cuenta ${a} partes desde 0.`),
          w > 1 ? t(`${b} parts make 1 whole, so ${w * b} parts make ${w}.`, `${b} partes forman 1 entero, así que ${w * b} partes forman ${w}.`) : w === 1 ? t(`${b} parts make 1 whole, so the point is past 1.`, `${b} partes forman 1 entero, así que el punto está después del 1.`) : t(`${a} is less than ${b}, so the point is between 0 and 1.`, `${a} es menor que ${b}, así que el punto está entre 0 y 1.`),
        ],
        steps: [`${a} ÷ ${b} = ${ft(a, b)}`, ...mixedLine(a, b), t(`Put the point at ${simplest(a, b)}.`, `Pon el punto en ${simplest(a, b)}.`)],
        seconds: 30,
      };
    },
  },
  {
    id: "m.lineplot.frac",
    subject: "math",
    grade: "5",
    title: { en: "Measurement data in fractions", es: "Datos de medidas en fracciones" },
    standard: "5.MD.B.2",
    prereqs: ["m.frac.addunlike", "m.frac.mult"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const plot = r.pick(level === 2 && r.bool() ? PLOTS.filter((p) => p.liquid) : PLOTS), n = r.pick(NAMES);
      const share = level === 2 && plot.liquid && r.bool(0.6);
      // Data in eighths, 1..7; shown in lowest terms (2/8 → 1/4).
      let data: number[];
      for (;;) {
        const c = r.int(6, 9);
        if (share) {
          const m = r.int(2, 6);
          data = Array<number>(c).fill(m);
          for (let i = 0; i < 3 * c; i++) {
            const x = r.int(0, c - 1), y = r.int(0, c - 1), j = r.int(1, 2);
            if (x !== y && data[x] + j <= 7 && data[y] - j >= 1) {
              data[x] += j;
              data[y] -= j;
            }
          }
        } else {
          const values = r.shuffle([1, 2, 3, 4, 5, 6, 7]).slice(0, r.int(3, 4));
          data = [...values, ...Array.from({ length: c - values.length }, () => r.pick(values))];
          data = r.shuffle(data);
        }
        if (new Set(data).size >= 3) break;
      }
      const c = data.length;
      const show = (k: number) => reduce(k, 8);
      const fparts = (k: number) => fr(...show(k));
      const fText = (k: number) => ft(...show(k));
      const fSay = (k: number) => sayFrac(...show(k), locale);
      /** The asked amount read aloud with its unit: "media pulgada", not "un medio de pulgada". */
      const askSay = (k: number, post: string) => (locale === "es" && fText(k) === "1/2" && post.startsWith(" de ") ? halfEs(post.slice(4)) : `${fSay(k)}${post}`);
      const dataParts: MathPart[] = data.flatMap((k, i) => (i === 0 ? [fparts(k)] : [i === c - 1 ? t(" and ", " y ") : ", ", fparts(k)]));
      const intro = say2(locale, plot.intro(c, n));
      const dataSay = listOf(data.map(fSay), locale);
      // The data come as a list: the Visual union has no line plot (stacked Xs) yet. When it gets one, draw
      // the plot from `data` here and let the questions point at it.
      const visual = { kind: "number-line" as const, min: 0, max: 1, marks: [0, 1], denominator: 8 };
      const alt = t("A number line from 0 to 1 marked in eighths", "Una recta numérica de 0 a 1 marcada en octavos");
      const eighths = data.map((k) => ft(k, 8)).join(", ");
      const S = data.reduce((s, k) => s + k, 0);
      const naiveSum = (() => {
        const sh = data.map(show);
        return ft(sh.reduce((s, [a]) => s + a, 0), sh.reduce((s, [, b]) => s + b, 0));
      })();
      const base = { visual, alt };
      if (level === 1) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const v = r.pick(data), count = data.filter((k) => k === v).length;
          // A partial count, stopping before the last one, so the hint never gives the total.
          const lastAt = data.lastIndexOf(v), before = data.slice(0, lastAt).filter((k) => k === v).length;
          const partial =
            lastAt < 2
              ? t(`Start at the first measurement: it is ${fText(data[0])}.`, `Empieza por la primera medida: es ${fText(data[0])}.`)
              : before === 0
                ? t(`${fText(v)} does not appear in the first ${lastAt} measurements.`, `${fText(v)} no aparece en las primeras ${lastAt} medidas.`)
                : t(`In the first ${lastAt} measurements, ${fText(v)} appears ${before} ${pl(before, "time", "times")}.`, `En las primeras ${lastAt} medidas, ${fText(v)} aparece ${before} ${pl(before, "vez", "veces")}.`);
          const answer: Answer = { kind: "number", value: count };
          const [pre, post] = plot.count.map((p) => say2(locale, p));
          return {
            prompt: [intro, ...dataParts, ". ", pre, fparts(v), post],
            say: `${intro}${dataSay}. ${pre}${askSay(v, post)}`,
            ...base,
            input: "keypad",
            answer,
            wrong: misses(answer, [[c, "counted-every-piece"]]),
            hints: [
              t(`Find every ${fText(v)} in the list.`, `Busca cada ${fText(v)} en la lista.`),
              t(`Go through the list in order and make a tally mark for each ${fText(v)}.`, `Recorre la lista en orden y haz una marca de conteo por cada ${fText(v)}.`),
              partial,
            ],
            steps: [t(`${fText(v)} appears ${count} ${pl(count, "time", "times")} in the list.`, `${fText(v)} aparece ${count} ${pl(count, "vez", "veces")} en la lista.`), `${count} ${say2(locale, plot.item)}`],
            seconds: 30,
          };
        }
        if (kind === 1) {
          const hi = Math.max(...data), lo = Math.min(...data), [hn, hd] = show(hi), [ln, ld] = show(lo);
          const answer: Answer = { kind: "fraction", n: hi - lo, d: 8 };
          return {
            prompt: [intro, ...dataParts, ". ", say2(locale, plot.diff)],
            say: `${intro}${dataSay}. ${say2(locale, plot.diff)}`,
            ...base,
            input: "fraction",
            answer,
            wrong: misses(answer, [[ft(Math.abs(hn - ln), Math.max(hd, ld)), "subtracted-without-common-denominator"], [fText(hi), "gave-the-biggest-value"]]),
            hints: [
              t("Find the biggest and the smallest measurement in the list.", "Busca la medida más grande y la más pequeña de la lista."),
              t("Write both with 8 on the bottom, then subtract.", "Escribe las dos con 8 abajo y luego resta."),
              t(`The biggest is ${fText(hi)} and the smallest is ${fText(lo)}.`, `La más grande es ${fText(hi)} y la más pequeña es ${fText(lo)}.`),
            ],
            steps: [
              ...[hi, lo].filter((k) => fText(k) !== ft(k, 8)).map((k) => `${fText(k)} = ${ft(k, 8)}`),
              `${ft(hi, 8)} − ${ft(lo, 8)} = ${ft(hi - lo, 8)}`,
              amount(hi - lo, 8, plot.unit, locale),
            ],
            seconds: 45,
          };
        }
        const repeated = [...new Set(data)].filter((k) => data.filter((x) => x === k).length >= 2);
        const v = repeated.length ? r.pick(repeated) : data[0];
        const count = data.filter((k) => k === v).length, [vn, vd] = show(v);
        const answer: Answer = { kind: "fraction", n: count * v, d: 8 };
        const [pre, post] = plot.some.map((p) => say2(locale, p));
        return {
          prompt: [intro, ...dataParts, ". ", pre, fparts(v), post],
          say: `${intro}${dataSay}. ${pre}${askSay(v, post)}`,
          ...base,
          input: "fraction",
          answer,
          wrong: misses(answer, [[fText(v), "used-one-piece-only"], [ft(count * vn, count * vd), "multiplied-top-and-bottom"]]),
          hints: [
            t(`How many times does ${fText(v)} appear in the list?`, `¿Cuántas veces aparece ${fText(v)} en la lista?`),
            t(`Add ${fText(v)} once for each time it appears, or multiply.`, `Suma ${fText(v)} una vez por cada vez que aparece, o multiplica.`),
            t(`${fText(v)} appears ${count} ${pl(count, "time", "times")}.`, `${fText(v)} aparece ${count} ${pl(count, "vez", "veces")}.`),
          ],
          steps: [`${count} × ${fText(v)} = ${ft(count * vn, vd)}`, ...(simplest(count * vn, vd) !== ft(count * vn, vd) ? [`${ft(count * vn, vd)} = ${simplest(count * vn, vd)}`] : []), amount(count * vn, vd, plot.unit, locale)],
          seconds: 45,
        };
      }
      if (share) {
        const m = S / c;
        const answer: Answer = { kind: "fraction", n: m, d: 8 };
        return {
          prompt: [intro, ...dataParts, ". ", say2(locale, plot.share!)],
          say: `${intro}${dataSay}. ${say2(locale, plot.share!)}`,
          ...base,
          input: "fraction",
          answer,
          wrong: misses(answer, [[ft(S, 8), "did-not-share"], [naiveSum, "added-denominators"]]),
          hints: [
            t("First find the total amount.", "Primero encuentra la cantidad total."),
            t(`Then divide the total equally among the ${c} ${say2(locale, plot.item)}.`, `Luego divide el total en partes iguales entre los ${c} ${say2(locale, plot.item)}.`),
            t(`In eighths, the amounts are ${eighths}.`, `En octavos, las cantidades son ${eighths}.`),
          ],
          steps: [t(`Total: ${ft(S, 8)}`, `Total: ${ft(S, 8)}`), `${ft(S, 8)} ÷ ${c} = ${ft(m, 8)}`, amount(m, 8, plot.unit, locale)],
          seconds: 75,
        };
      }
      const answer: Answer = { kind: "fraction", n: S, d: 8 };
      return {
        prompt: [intro, ...dataParts, ". ", say2(locale, plot.total)],
        say: `${intro}${dataSay}. ${say2(locale, plot.total)}`,
        ...base,
        input: "fraction",
        answer,
        wrong: misses(answer, [[naiveSum, "added-denominators"], [ft(S, 8 * c), "divided-by-the-count"]]),
        hints: [
          t("Add all the measurements.", "Suma todas las medidas."),
          t("Write each one in eighths, then add the top numbers.", "Escribe cada una en octavos y luego suma los números de arriba."),
          t(`In eighths: ${eighths}.`, `En octavos: ${eighths}.`),
        ],
        steps: [t(`In eighths: ${eighths}`, `En octavos: ${eighths}`), t(`Total: ${ft(S, 8)}`, `Total: ${ft(S, 8)}`), amount(S, 8, plot.unit, locale)],
        seconds: 75,
      };
    },
  },
  {
    id: "m.convert.multistep",
    subject: "math",
    grade: "5",
    title: { en: "Convert units in multi-step problems", es: "Convertir unidades en problemas de varios pasos" },
    standard: "5.MD.A.1",
    prereqs: ["m.measure.convert", "m.pow10"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      if (level === 1) {
        const toSmall = r.bool();
        const c = r.pick(METRIC5.filter((x) => !toSmall || x.f >= 100));
        const k = Math.round(Math.log10(c.f));
        const [bigAb, smallAb] = c.ab;
        const bigW = uMany(c.big, locale), smallW = uMany(c.small, locale);
        if (toSmall) {
          const p = r.pick([1, 2].filter((x) => x <= k));
          let V = r.int(p === 1 ? 11 : 101, p === 1 ? 99 : 999);
          while (V % 10 === 0) V = r.int(p === 1 ? 11 : 101, p === 1 ? 99 : 999);
          const v = dec(V, p), ans = (V * c.f) / 10 ** p;
          const answer: Answer = { kind: "number", value: ans };
          return {
            prompt: [`${v} ${bigAb} = `, blank, ` ${smallAb}`],
            say: t(`${v} ${bigW} equals how many ${smallW}?`, `¿${v} ${bigW} son cuántos ${smallW}?`),
            input: "keypad",
            keys: ["."],
            answer,
            wrong: misses(answer, [[dec(V, p + k), "converted-the-wrong-way"], [num(V * c.wf * 10 ** (3 - p), 3), "used-the-wrong-factor"]]),
            hints: [
              t(`How many ${smallW} are in 1 ${uName(c.big, 1, locale)}?`, `¿Cuántos ${smallW} hay en 1 ${uName(c.big, 1, locale)}?`),
              t(`1 ${bigAb} = ${group(c.f)} ${smallAb}. Multiply by ${group(c.f)}: every digit moves ${k} places to the left.`, `1 ${bigAb} = ${group(c.f)} ${smallAb}. Multiplica por ${group(c.f)}: cada cifra se mueve ${k} lugares a la izquierda.`),
              `${v} × 10 = ${num(V * 10, p)}.`,
            ],
            steps: [`1 ${bigAb} = ${group(c.f)} ${smallAb}`, `${v} × ${group(c.f)} = ${group(ans)}`, `${v} ${bigAb} = ${group(ans)} ${smallAb}`],
            seconds: 20,
          };
        }
        let S = c.f === 10 ? r.int(11, 199) : r.int(2, 999) * (c.f === 1000 ? 10 : 1);
        while (S % c.f === 0 || (c.f === 10 && S % 10 === 0)) S = c.f === 10 ? r.int(11, 199) : r.int(2, 999) * (c.f === 1000 ? 10 : 1);
        const ans = num(S, k);
        const answer: Answer = { kind: "number", value: Number(ans) };
        return {
          prompt: [`${group(S)} ${smallAb} = `, blank, ` ${bigAb}`],
          say: t(`${group(S)} ${smallW} equals how many ${bigW}?`, `¿${group(S)} ${smallW} son cuántos ${bigW}?`),
          input: "keypad",
          keys: ["."],
          answer,
          wrong: misses(answer, [[S * c.f, "converted-the-wrong-way"], [num(S, Math.round(Math.log10(c.wf))), "used-the-wrong-factor"]]),
          hints: [
            t(`How many ${smallW} make 1 ${uName(c.big, 1, locale)}?`, `¿Cuántos ${smallW} forman 1 ${uName(c.big, 1, locale)}?`),
            t(`${group(c.f)} ${smallAb} = 1 ${bigAb}. Divide by ${group(c.f)}: every digit moves ${k} ${pl(k, "place", "places")} to the right.`, `${group(c.f)} ${smallAb} = 1 ${bigAb}. Divide entre ${group(c.f)}: cada cifra se mueve ${k} ${pl(k, "lugar", "lugares")} a la derecha.`),
            S < c.f
              ? t(`${group(S)} ${smallAb} is less than 1 ${bigAb}, so the answer is less than 1.`, `${group(S)} ${smallAb} es menos de 1 ${bigAb}, así que la respuesta es menor que 1.`)
              : t(`${group(S)} ${smallAb} is ${Math.floor(S / c.f)} ${bigAb} and ${S % c.f} ${smallAb}.`, `${group(S)} ${smallAb} son ${Math.floor(S / c.f)} ${bigAb} y ${S % c.f} ${smallAb}.`),
          ],
          steps: [`${group(c.f)} ${smallAb} = 1 ${bigAb}`, `${group(S)} ÷ ${group(c.f)} = ${ans}`, `${group(S)} ${smallAb} = ${ans} ${bigAb}`],
          seconds: 20,
        };
      }
      if (level === 2) {
        const c = r.pick(CUSTOMARY5);
        const small = uMany(c.small, locale), bigOne = uName(c.big, 1, locale);
        if (c.f % 2 === 0 && r.bool(0.35)) {
          // A half: 2 1/2 feet = 30 inches.
          const w = r.int(1, 5), ans = w * c.f + c.f / 2;
          const answer: Answer = { kind: "number", value: ans };
          return {
            prompt: [`${w} `, fr(1, 2), ` ${uMany(c.big, locale)} = `, blank, ` ${small}`],
            say: t(`${w} and a half ${uMany(c.big, locale)} equals how many ${small}?`, `¿${w} ${uName(c.big, w, locale)} y ${c.big[4] ? "media" : "medio"} son ${cuantos(c.small).toLowerCase()} ${small}?`),
            input: "keypad",
            answer,
            wrong: misses(answer, [[w * c.f, "forgot-the-half"], ((2 * w + 1) * c.wf) % 2 === 0 && [((2 * w + 1) * c.wf) / 2, c.wfWhy]]),
            hints: [
              t(`How many ${small} make 1 ${bigOne}?`, `¿${cuantos(c.small)} ${small} forman 1 ${bigOne}?`),
              t(`1 ${bigOne} = ${c.f} ${small}, so half ${bigOne === "hour" ? "an" : "a"} ${bigOne} is ${c.f / 2} ${uName(c.small, c.f / 2, "en")}.`, `1 ${bigOne} = ${c.f} ${small}, así que ${c.big[4] ? "media" : "medio"} ${bigOne} ${pl(c.f / 2, "es", "son")} ${c.f / 2} ${uName(c.small, c.f / 2, "es")}.`),
              `${w} × ${c.f} = ${w * c.f}.`,
            ],
            steps: [`${w} × ${c.f} = ${w * c.f}`, `${w * c.f} + ${c.f / 2} = ${ans}`, `${ans} ${small}`],
            seconds: 25,
          };
        }
        const big = r.int(2, 9), S = big * c.f;
        const answer: Answer = { kind: "number", value: big };
        return {
          prompt: [`${S} ${small} = `, blank, ` ${uMany(c.big, locale)}`],
          say: t(`${S} ${small} equals how many ${uMany(c.big, locale)}?`, `¿${S} ${small} son ${cuantos(c.big).toLowerCase()} ${uMany(c.big, locale)}?`),
          input: "keypad",
          answer,
          wrong: misses(answer, [[S * c.f, "converted-the-wrong-way"], S % c.wf === 0 && [S / c.wf, c.wfWhy]]),
          hints: [
            t(`How many ${small} make 1 ${bigOne}?`, `¿${cuantos(c.small)} ${small} forman 1 ${bigOne}?`),
            t(`${c.f} ${small} = 1 ${bigOne}. Divide by ${c.f}.`, `${c.f} ${small} = 1 ${bigOne}. Divide entre ${c.f}.`),
            t(`Think: ${c.f} × ? = ${S}.`, `Piensa: ${c.f} × ? = ${S}.`),
          ],
          steps: [`1 ${bigOne} = ${c.f} ${small}`, `${S} ÷ ${c.f} = ${big}`, `${big} ${uMany(c.big, locale)}`],
          seconds: 20,
        };
      }
      const st = r.pick(CONVERT_STORIES5), n = r.pick(NAMES), x = st.make(r);
      const [e1, v1, e2, ans] = st.work(x);
      const text = t(st.en(x, n), st.es(x, n));
      const answer: Answer = { kind: "number", value: Number(ans) };
      return {
        prompt: [text],
        say: text,
        input: "keypad",
        keys: ["."],
        answer,
        wrong: misses(answer, st.wrong(x)),
        hints: [t("This takes two steps: find the total, and change the unit.", "Esto lleva dos pasos: encontrar el total y cambiar de unidad."), say2(locale, st.plan), `${e1} = ${group(v1)}.`],
        steps: [`${e1} = ${group(v1)}`, `${e2} = ${ans}`, `${ans} ${say2(locale, st.unit)}`],
        seconds: 75,
      };
    },
  },
  {
    id: "m.volume.composite",
    subject: "math",
    grade: "5",
    title: { en: "Volume of figures made of two boxes", es: "Volumen de cuerpos formados por dos cajas" },
    standard: "5.MD.C.5c",
    prereqs: ["m.volume"],
    content: "computed",
    levels: 2,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      const ctx = r.pick(COMPOSITES), [u, box] = r.pick(ctx.sizes), ab = say2(locale, u.ab), cu = say2(locale, u.cu);
      const part = () => box.map(([lo, hi]) => r.int(lo, hi));
      const [a, b, c] = part(), [d, e, f] = part();
      const V1 = a * b * c, V2 = d * e * f, V = V1 + V2;
      const [g1, g2, gV] = [V1, V2, V].map(group);
      if (level === 1) {
        const text = t(
          `${ctx.en} One part is ${a} ${ab} by ${b} ${ab} by ${c} ${ab}. The other part is ${d} ${ab} by ${e} ${ab} by ${f} ${ab}. What is the total volume in ${cu}?`,
          `${ctx.es} Una parte mide ${a} ${ab} por ${b} ${ab} por ${c} ${ab}. La otra parte mide ${d} ${ab} por ${e} ${ab} por ${f} ${ab}. ¿Cuál es el volumen total en ${cu}?`,
        );
        const answer: Answer = { kind: "number", value: V };
        return {
          prompt: [text],
          say: text,
          input: "keypad",
          answer,
          wrong: misses(answer, [[V1, "found-one-part-only"], [a + b + c + d + e + f, "added-the-edges"]]),
          hints: [
            t("Volume adds up: find the volume of each part, then add.", "El volumen se puede sumar: encuentra el volumen de cada parte y luego súmalos."),
            t("Each part is a box: length × width × height.", "Cada parte es una caja: largo × ancho × alto."),
            `${a} × ${b} × ${c} = ${g1}.`,
          ],
          steps: [`${a} × ${b} × ${c} = ${g1}`, `${d} × ${e} × ${f} = ${g2}`, `${g1} + ${g2} = ${gV}`, `${gV} ${cu}`],
          seconds: 75,
        };
      }
      const text = t(
        `${ctx.en} The total volume is ${gV} ${cu}. One part is ${a} ${ab} by ${b} ${ab} by ${c} ${ab}. The other part is ${d} ${ab} long and ${e} ${ab} wide. How tall is the other part?`,
        `${ctx.es} El volumen total es de ${gV} ${cu}. Una parte mide ${a} ${ab} por ${b} ${ab} por ${c} ${ab}. La otra parte mide ${d} ${ab} de largo y ${e} ${ab} de ancho. ¿Cuánto mide de alto la otra parte?`,
      );
      const answer: Answer = { kind: "number", value: f };
      return {
        prompt: [text, " ", blank, ` ${ab}`],
        say: text,
        input: "keypad",
        answer,
        wrong: misses(answer, [[V2, "stopped-after-subtracting"], V % (d * e) === 0 && [V / (d * e), "forgot-to-subtract-the-first-part"]]),
        hints: [
          t("Take away the volume of the part you know.", "Quita el volumen de la parte que conoces."),
          t("What is left is the other part's volume. Divide it by that part's length × width.", "Lo que queda es el volumen de la otra parte. Divídelo entre el largo × el ancho de esa parte."),
          `${a} × ${b} × ${c} = ${g1}.`,
        ],
        steps: [`${a} × ${b} × ${c} = ${g1}`, `${gV} − ${g1} = ${g2}`, `${d} × ${e} = ${d * e}`, `${g2} ÷ ${d * e} = ${f}`],
        seconds: 90,
      };
    },
  },
  {
    id: "m.patterns.coord",
    subject: "math",
    grade: "5",
    title: { en: "Patterns and the coordinate plane", es: "Patrones y el plano de coordenadas" },
    standard: "5.OA.B.3",
    prereqs: ["m.mult.compare"],
    content: "computed",
    levels: 3,
    generate(r, level, locale) {
      const t = (en: string, es: string) => tr(locale, en, es);
      // Read-aloud lines carry no notation: "(x, y)", "(0, 0)" and "…" are said in words.
      const writeXY: Pair = ["Write it in parentheses: the x number first, then the y number.", "Escríbelo entre paréntesis: primero el número de x y después el de y."];
      if (level === 1) {
        const x = r.int(0, 5);
        let y = r.int(0, 5);
        while (y === x) y = r.int(0, 5);
        const answer: Answer = { kind: "pair", x, y };
        const wrong = misses(answer, [[`(${y}, ${x})`, "swapped-x-and-y"]]);
        if (r.bool(0.6)) {
          const q = t("What are the coordinates of the point? Write them as (x, y).", "¿Cuáles son las coordenadas del punto? Escríbelas como (x, y).");
          return {
            prompt: [q],
            say: t(
              "What are the coordinates of the point? Write them in parentheses: the x number first, then the y number.",
              "¿Cuáles son las coordenadas del punto? Escríbelas entre paréntesis: primero el número de x y después el de y.",
            ),
            visual: { kind: "coord", points: [[x, y]] },
            alt: t(`A coordinate grid with one point, ${x} ${pl(x, "unit", "units")} to the right of the origin and ${y} ${pl(y, "unit", "units")} up`, `Un plano de coordenadas con un punto a ${x} ${pl(x, "unidad", "unidades")} a la derecha del origen y ${y} ${pl(y, "unidad", "unidades")} hacia arriba`),
            input: "text",
            answer,
            wrong,
            hints: [
              t("The first number tells how far to go right. The second tells how far to go up.", "El primer número dice cuánto avanzar a la derecha. El segundo dice cuánto subir."),
              t("Start at the origin, (0, 0). Count the units across, then the units up.", "Empieza en el origen, (0, 0). Cuenta las unidades hacia la derecha y luego hacia arriba."),
              t(`The point is ${x} ${pl(x, "unit", "units")} to the right of the origin.`, `El punto está a ${x} ${pl(x, "unidad", "unidades")} a la derecha del origen.`),
            ],
            steps: [t(`Right ${x}, up ${y}.`, `${x} a la derecha, ${y} hacia arriba.`), `(${x}, ${y})`],
            seconds: 15,
          };
        }
        const q = t(`Start at the origin, (0, 0). Move ${x} ${pl(x, "unit", "units")} right and ${y} ${pl(y, "unit", "units")} up. Write the point as (x, y).`, `Empieza en el origen, (0, 0). Avanza ${x} ${pl(x, "unidad", "unidades")} a la derecha y sube ${y} ${pl(y, "unidad", "unidades")}. Escribe el punto como (x, y).`);
        return {
          prompt: [q],
          say: t(
            `Start at the origin, where x and y are both 0. Move ${x} ${pl(x, "unit", "units")} right and ${y} ${pl(y, "unit", "units")} up. ${writeXY[0]}`,
            `Empieza en el origen, donde x e y valen 0. Avanza ${x} ${pl(x, "unidad", "unidades")} a la derecha y sube ${y} ${pl(y, "unidad", "unidades")}. ${writeXY[1]}`,
          ),
          input: "text",
          answer,
          wrong,
          hints: [
            t("Moving right changes the first number. Moving up changes the second number.", "Avanzar a la derecha cambia el primer número. Subir cambia el segundo número."),
            t("Write the move to the right first, then the move up.", "Escribe primero el avance a la derecha y luego la subida."),
            t(`Moving ${x} right gives a first number of ${x}.`, `Avanzar ${x} a la derecha da ${x} como primer número.`),
          ],
          steps: [t(`Right ${x}, up ${y}.`, `${x} a la derecha, ${y} hacia arriba.`), `(${x}, ${y})`],
          seconds: 15,
        };
      }
      const a = r.int(1, level === 2 ? 5 : 4), k = r.int(2, level === 2 ? 4 : 3), b = k * a;
      const rules = t(
        `Pattern A starts at 0 and adds ${a} each time: 0, ${a}, ${2 * a}, … Pattern B starts at 0 and adds ${b} each time: 0, ${b}, ${2 * b}, …`,
        `El patrón A empieza en 0 y suma ${a} cada vez: 0, ${a}, ${2 * a}, … El patrón B empieza en 0 y suma ${b} cada vez: 0, ${b}, ${2 * b}, …`,
      );
      const rulesSay = rules.replace(/, …/g, t(", and so on.", ", y así sucesivamente."));
      if (level === 2) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const j = r.int(5, 8), useB = r.bool(), step = useB ? b : a, value = (j - 1) * step, P = useB ? "B" : "A";
          const q = t(`What is the ${ORDINAL[j][0]} number in Pattern ${P}?`, `¿Cuál es el ${ORDINAL[j][1]} número del patrón ${P}?`);
          const answer: Answer = { kind: "number", value };
          return {
            prompt: [`${rules} ${q}`],
            say: `${rulesSay} ${q}`,
            input: "keypad",
            answer,
            wrong: misses(answer, [[j * step, "off-by-one-term"], [(j - 2) * step, "off-by-one-term"]]),
            hints: [
              t(`Pattern ${P} adds ${step} each time, starting at 0.`, `El patrón ${P} suma ${step} cada vez, empezando en 0.`),
              t(`The first number is 0, so the ${ORDINAL[j][0]} number comes after ${j - 1} jumps of ${step}.`, `El primer número es 0, así que el ${ORDINAL[j][1]} número llega después de ${j - 1} saltos de ${step}.`),
              t(`List it: 0, ${step}, ${2 * step}, ${3 * step}, …`, `Escríbelo: 0, ${step}, ${2 * step}, ${3 * step}, …`),
            ],
            steps: [`${j - 1} × ${step} = ${value}`, t(`The ${ORDINAL[j][0]} number is ${value}.`, `El ${ORDINAL[j][1]} número es ${value}.`)],
            seconds: 30,
          };
        }
        if (kind === 1) {
          const q = t("What do you multiply each number in Pattern A by to get the matching number in Pattern B? (Leave out the 0s.)", "¿Por cuánto hay que multiplicar cada número del patrón A para obtener el número correspondiente del patrón B? (Sin contar los 0.)");
          const answer: Answer = { kind: "number", value: k };
          return {
            prompt: [`${rules} ${q}`],
            say: `${rulesSay} ${q.replace(/[()]/g, "")}`,
            input: "keypad",
            answer,
            wrong: misses(answer, [[b - a, "compared-by-subtracting"], [b, "gave-a-rule-not-the-relation"]]),
            hints: [
              t("Compare numbers in the same position: the second number of each pattern, then the third.", "Compara los números que están en el mismo lugar: el segundo de cada patrón y luego el tercero."),
              t("Divide a number in Pattern B by the matching number in Pattern A.", "Divide un número del patrón B entre el número correspondiente del patrón A."),
              t(`${a} and ${b} are a matching pair.`, `${a} y ${b} forman una pareja.`),
            ],
            steps: [`${b} ÷ ${a} = ${k}`, `${2 * b} ÷ ${2 * a} = ${k}`, t(`Each number in Pattern B is ${k} times the matching number in Pattern A.`, `Cada número del patrón B es ${k} veces el número correspondiente del patrón A.`)],
            seconds: 30,
          };
        }
        const m = r.int(4, 9), va = m * a, value = m * b;
        const q = t(`When Pattern A is at ${va}, what number is Pattern B at?`, `Cuando el patrón A está en ${va}, ¿en qué número está el patrón B?`);
        const answer: Answer = { kind: "number", value };
        return {
          prompt: [`${rules} ${q}`],
          say: `${rulesSay} ${q}`,
          input: "keypad",
          answer,
          wrong: misses(answer, [[va + b - a, "added-instead-of-multiplied"], [(m + 1) * b, "off-by-one-term"]]),
          hints: [
            t(`How many jumps of ${a} does it take Pattern A to reach ${va}?`, `¿Cuántos saltos de ${a} necesita el patrón A para llegar a ${va}?`),
            t(`Pattern B makes the same number of jumps, but each jump is ${b}.`, `El patrón B da el mismo número de saltos, pero cada salto es de ${b}.`),
            `${va} ÷ ${a} = ${m}.`,
          ],
          steps: [`${va} ÷ ${a} = ${m}`, `${m} × ${b} = ${value}`, t(`Pattern B is at ${value}.`, `El patrón B está en ${value}.`)],
          seconds: 35,
        };
      }
      const j = r.int(4, 7), X = (j - 1) * a, Y = (j - 1) * b;
      const q = t(
        `Pair the numbers that match to make points (A, B): (0, 0), (${a}, ${b}), (${2 * a}, ${2 * b}), … What is the ${ORDINAL[j][0]} point? Write it as (x, y).`,
        `Junta los números correspondientes para formar puntos (A, B): (0, 0), (${a}, ${b}), (${2 * a}, ${2 * b}), … ¿Cuál es el ${ORDINAL[j][1]} punto? Escríbelo como (x, y).`,
      );
      const qSay = t(
        `Pair the numbers that match to make points, with the Pattern A number first: 0 and 0, ${a} and ${b}, ${2 * a} and ${2 * b}, and so on. What is the ${ORDINAL[j][0]} point? ${writeXY[0]}`,
        `Junta los números correspondientes para formar puntos, con el número del patrón A primero: 0 y 0, ${a} y ${b}, ${2 * a} y ${2 * b}, y así sucesivamente. ¿Cuál es el ${ORDINAL[j][1]} punto? ${writeXY[1]}`,
      );
      const answer: Answer = { kind: "pair", x: X, y: Y };
      return {
        prompt: [`${rules} ${q}`],
        say: `${rulesSay} ${qSay}`,
        visual: { kind: "coord", points: [[0, 0], [a, b], [2 * a, 2 * b]] },
        alt: t(`A coordinate grid with the points (0, 0), (${a}, ${b}) and (${2 * a}, ${2 * b})`, `Un plano de coordenadas con los puntos (0, 0), (${a}, ${b}) y (${2 * a}, ${2 * b})`),
        input: "text",
        answer,
        wrong: misses(answer, [[`(${Y}, ${X})`, "swapped-x-and-y"], [`(${j * a}, ${j * b})`, "off-by-one-term"]]),
        hints: [
          t("Each point uses the matching numbers from Pattern A and Pattern B.", "Cada punto usa los números correspondientes del patrón A y del patrón B."),
          t(`The ${ORDINAL[j][0]} point comes after ${j - 1} jumps in each pattern.`, `El ${ORDINAL[j][1]} punto llega después de ${j - 1} saltos en cada patrón.`),
          t(`Pattern A after ${j - 1} jumps: ${j - 1} × ${a} = ${X}.`, `El patrón A después de ${j - 1} saltos: ${j - 1} × ${a} = ${X}.`),
        ],
        steps: [`${j - 1} × ${a} = ${X}`, `${j - 1} × ${b} = ${Y}`, `(${X}, ${Y})`],
        seconds: 45,
      };
    },
  },
];
