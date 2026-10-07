import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { ItemBody, MathPart } from "../../types";
import { bi, dec, misses, NAMES, r2, type Bi } from "./shared";

// Computed data skills: rates from tables and line graphs (s.graph.rates), population tables
// (s.population.growth), and scientific notation with unit conversions (s.sci.notation).
// Every value is a whole number of tenths (or a power of ten times a short decimal), so keys are exact.

/** A unit: the symbol on screen and the words read aloud, [one, many]. */
type Unit = { s: Bi; w: [Bi, Bi] };
const unit = (s: string, en: [string, string], es: [string, string], sEs = s): Unit => ({ s: bi(s, sEs), w: [bi(en[0], es[0]), bi(en[1], es[1])] });
const MIN = unit("min", ["minute", "minutes"], ["minuto", "minutos"]);
const HR = unit("h", ["hour", "hours"], ["hora", "horas"]);
const SEC = unit("s", ["second", "seconds"], ["segundo", "segundos"]);
const DAYS = unit("days", ["day", "days"], ["día", "días"], "días");
const DEG = unit("°C", ["degree Celsius", "degrees Celsius"], ["grado Celsius", "grados Celsius"]);
const CM = unit("cm", ["centimeter", "centimeters"], ["centímetro", "centímetros"]);
const MM = unit("mm", ["millimeter", "millimeters"], ["milímetro", "milímetros"]);
const LIT = unit("L", ["liter", "liters"], ["litro", "litros"]);
const MET = unit("m", ["meter", "meters"], ["metro", "metros"]);
const KM = unit("km", ["kilometer", "kilometers"], ["kilómetro", "kilómetros"]);

/** A context sentence with the learner's name put in. */
const swap = (b: Bi, name: string): Bi => bi(b.en.replace("{name}", name), b.es.replace("{name}", name));

// ── s.graph.rates ───────────────────────────────────────────────────────────────────────────────

/**
 * A steady change over time. `l1` is the level 1 rate range in tenths and `start` the first reading;
 * `grid`, `sx` and `rate` shape the level 2 graph: gridline spacings, x steps, and the allowed rates.
 */
type RateCtx = {
  intro: Bi; xName: Bi; yName: Bi; xu: Unit; yu: Unit; q: Bi; per: Bi; dir: 1 | -1;
  l1: [number, number]; start: [number, number]; xs: number[];
  grid: number[]; sx: number[]; rate: [number, number]; lift: boolean;
};
const RATES: RateCtx[] = [
  {
    intro: bi("Water is heated on a stove.", "Se calienta agua en una estufa."), xName: bi("Time", "Tiempo"), yName: bi("Temperature", "Temperatura"), xu: MIN, yu: DEG,
    q: bi("By how many degrees Celsius does the temperature rise each minute?", "¿Cuántos grados Celsius sube la temperatura cada minuto?"), per: bi("°C per minute", "°C por minuto"), dir: 1,
    l1: [20, 120], start: [15, 25], xs: [1, 2], grid: [5, 10], sx: [1, 2], rate: [2.5, 20], lift: true,
  },
  {
    intro: bi("A bean plant is measured as it grows.", "Se mide una planta de frijol mientras crece."), xName: bi("Time", "Tiempo"), yName: bi("Height", "Altura"), xu: DAYS, yu: CM,
    q: bi("How many centimeters does the plant grow each day?", "¿Cuántos centímetros crece la planta cada día?"), per: bi("cm per day", "cm por día"), dir: 1,
    l1: [5, 35], start: [0, 6], xs: [1, 2, 3], grid: [1, 2, 4], sx: [1, 2], rate: [0.5, 4], lift: false,
  },
  {
    intro: bi("Snow piles up steadily during a storm.", "La nieve se acumula de forma constante durante una tormenta."), xName: bi("Time", "Tiempo"), yName: bi("Snow depth", "Profundidad de la nieve"), xu: HR, yu: CM,
    q: bi("By how many centimeters does the snow get deeper each hour?", "¿Cuántos centímetros aumenta la profundidad de la nieve cada hora?"), per: bi("cm per hour", "cm por hora"), dir: 1,
    l1: [5, 40], start: [0, 10], xs: [1, 2], grid: [1, 2, 5], sx: [1, 2], rate: [1, 5], lift: false,
  },
  {
    intro: bi("A candle burns at a steady rate.", "Una vela se consume a un ritmo constante."), xName: bi("Time", "Tiempo"), yName: bi("Candle height", "Altura de la vela"), xu: HR, yu: CM,
    q: bi("By how many centimeters does the candle get shorter each hour?", "¿Cuántos centímetros se acorta la vela cada hora?"), per: bi("cm per hour", "cm por hora"), dir: -1,
    l1: [5, 30], start: [18, 30], xs: [1, 2], grid: [2, 4], sx: [1, 2], rate: [1, 4], lift: false,
  },
  {
    intro: bi("A hose fills a water tank.", "Una manguera llena un tanque de agua."), xName: bi("Time", "Tiempo"), yName: bi("Water in the tank", "Agua en el tanque"), xu: MIN, yu: LIT,
    q: bi("How many liters flow into the tank each minute?", "¿Cuántos litros entran al tanque cada minuto?"), per: bi("L per minute", "L por minuto"), dir: 1,
    l1: [40, 250], start: [0, 50], xs: [1, 2, 5], grid: [5, 10, 20], sx: [1, 2], rate: [5, 40], lift: false,
  },
  {
    intro: bi("{name} runs at a steady pace.", "{name} corre a un ritmo constante."), xName: bi("Time", "Tiempo"), yName: bi("Distance", "Distancia"), xu: SEC, yu: MET,
    q: bi("How many meters does {name} run each second?", "¿Cuántos metros corre {name} cada segundo?"), per: bi("m per second", "m por segundo"), dir: 1,
    l1: [30, 80], start: [0, 0], xs: [2, 5, 10], grid: [10, 20], sx: [2, 5], rate: [3, 10], lift: false,
  },
  {
    intro: bi("{name} rides toward the finish of a bike race at a steady speed.", "{name} va en bicicleta hacia la meta de una carrera a una rapidez constante."), xName: bi("Time", "Tiempo"), yName: bi("Distance left", "Distancia que falta"), xu: HR, yu: KM,
    q: bi("How many kilometers does {name} ride each hour?", "¿Cuántos kilómetros recorre {name} cada hora?"), per: bi("km per hour", "km por hora"), dir: -1,
    l1: [100, 200], start: [60, 90], xs: [1], grid: [5, 10], sx: [1], rate: [10, 20], lift: false,
  },
  {
    intro: bi("Rain falls steadily into a rain gauge.", "La lluvia cae de forma constante en un pluviómetro."), xName: bi("Time", "Tiempo"), yName: bi("Rain collected", "Lluvia acumulada"), xu: HR, yu: MM,
    q: bi("How many millimeters of rain fall each hour?", "¿Cuántos milímetros de lluvia caen cada hora?"), per: bi("mm per hour", "mm por hora"), dir: 1,
    l1: [10, 80], start: [0, 5], xs: [1, 2], grid: [2, 5], sx: [1, 2], rate: [1, 10], lift: false,
  },
];

/** Level 2 graphs whose points sit exactly on gridlines: the top point is 6 gridlines up, the line climbs k per step. */
function graphPlans(c: RateCtx) {
  const out: { g: number; sx: number; k: number; n: number; b: number }[] = [];
  for (const g of c.grid)
    for (const sx of c.sx)
      for (let k = 1; k <= 3; k++)
        for (let n = 2; n <= 6; n++) {
          const b = 6 - k * n;
          const rate = (k * g) / sx;
          if (b < 0 || n * sx > 10 || n < 3 - (k > 1 ? 1 : 0) || rate < c.rate[0] || rate > c.rate[1]) continue;
          if (c.lift && c.dir === 1 && b === 0) continue; // heated water does not start at 0 °C
          out.push({ g, sx, k, n, b });
        }
  return out;
}

export function rateItem(r: Rng, level: number, locale: Locale): ItemBody {
  const c = r.pick(RATES);
  const name = r.pick(NAMES);
  const intro = swap(c.intro, name)[locale], q = swap(c.q, name)[locale];
  let pts: [number, number][]; // x, y in tenths of the y unit
  if (level === 1) {
    const sx = r.pick(c.xs), r10 = r.int(c.l1[0], c.l1[1]), b = r.int(c.start[0], c.start[1]);
    pts = [0, 1, 2, 3].map((i) => [i * sx, 10 * b + c.dir * r10 * i * sx]);
  } else {
    const plans = graphPlans(c);
    const { g, sx, k, n, b } = r.pick(plans);
    pts = Array.from({ length: n + 1 }, (_, i) => [i * sx, 10 * g * (c.dir === 1 ? b + k * i : 6 - k * i)]);
  }
  const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
  const dy = Math.abs(y1 - y0), dx = x1 - x0;
  const rate10 = dy / dx; // tenths of the y unit per x unit, a whole number by construction
  const xU = c.xu.s[locale], yU = c.yu.s[locale];
  const axis = (n: Bi, u: Unit) => `${n[locale]} (${u.s[locale]})`;
  // A table row is read aloud as its heading and its numbers: "Time in minutes: 0, 2, 4, 6."
  const row = (n: Bi, u: Unit, values: string[], spoken: boolean) =>
    spoken ? `${n[locale]} ${tr(locale, "in", "en")} ${u.w[1][locale]}: ${values.join(", ")}.` : `${axis(n, u)}: ${values.join(", ")}`;
  const table = (spoken: boolean) =>
    [row(c.xName, c.xu, pts.map(([x]) => String(x)), spoken), row(c.yName, c.yu, pts.map(([, y]) => dec(y)), spoken)].join(spoken ? " " : "\n");
  const shows = level === 1 ? tr(locale, "The table shows the readings.", "La tabla muestra las medidas.") : tr(locale, "The graph shows the readings.", "La gráfica muestra las medidas.");
  const prompt: MathPart[] = level === 1 ? [`${intro} ${shows}\n${table(false)}\n${q}`] : [`${intro} ${shows} ${q}`];
  const say = level === 1 ? `${intro} ${shows} ${table(true)} ${q}` : `${intro} ${shows} ${q}`;
  const visual =
    level === 2 ? { kind: "line-graph" as const, points: pts.map(([x, y]) => [x, y / 10] as [number, number]), xLabel: axis(c.xName, c.xu), yLabel: axis(c.yName, c.yu) } : undefined;
  const alt =
    level === 2
      ? tr(
          locale,
          `Line graph of ${c.yName.en.toLowerCase()} in ${c.yu.w[1].en} against time in ${c.xu.w[1].en}. The points ${pts.map(([x, y]) => `(${x}, ${dec(y)})`).join(", ")} lie on a straight line.`,
          `Gráfica de líneas de ${c.yName.es.toLowerCase()} en ${c.yu.w[1].es} contra el tiempo en ${c.xu.w[1].es}. Los puntos ${pts.map(([x, y]) => `(${x}, ${dec(y)})`).join(", ")} están sobre una línea recta.`,
        )
      : undefined;
  const Y0 = `${dec(y0)} ${yU}`, Y1 = `${dec(y1)} ${yU}`;
  const change = c.dir === 1 ? `${dec(y1)} − ${dec(y0)}` : `${dec(y0)} − ${dec(y1)}`;
  const read = tr(locale, `At ${x0} ${xU} the reading is ${Y0}; at ${x1} ${xU} it is ${Y1}.`, `En ${x0} ${xU} la medida es ${Y0}; en ${x1} ${xU} es ${Y1}.`);
  const step = pts[1][0] - x0;
  return {
    prompt,
    say,
    ...(visual ? { visual, alt } : {}),
    input: "keypad",
    keys: ["."],
    answer: { kind: "number", value: rate10 / 10 },
    wrong: misses(rate10 / 10, [
      [dy / 10, "found-total-change"],
      [r2(dx / (dy / 10)), "divided-wrong-way"],
      [y0 ? r2(y1 / 10 / x1) : NaN, "used-end-value"],
      [step !== 1 ? (rate10 * step) / 10 : NaN, "change-per-step"],
    ]),
    hints: [
      tr(locale, `How much does the reading change, and over how many ${c.xu.w[1].en}?`, `¿Cuánto cambia la medida y en cuánto tiempo?`),
      tr(locale, `Rate = change in ${c.yName.en.toLowerCase()} ÷ change in time. Use the first and last readings.`, `Tasa = cambio en ${c.yName.es.toLowerCase()} ÷ cambio en el tiempo. Usa la primera y la última medida.`),
      read,
    ],
    steps: [
      read,
      tr(locale, `Change: ${change} = ${dec(dy)} ${yU} in ${x1} − ${x0} = ${dx} ${xU}.`, `Cambio: ${change} = ${dec(dy)} ${yU} en ${x1} − ${x0} = ${dx} ${xU}.`),
      tr(locale, `Rate: ${dec(dy)} ÷ ${dx} = ${dec(rate10)} ${c.per.en}`, `Tasa: ${dec(dy)} ÷ ${dx} = ${dec(rate10)} ${c.per.es}`),
    ],
    seconds: level === 1 ? 40 : 50,
  };
}

// ── s.population.growth ─────────────────────────────────────────────────────────────────────────

/** A population that doubles every `every` units of time in an experiment; `start` counts are × `step`. */
type Grower = { what: Bi; every: number; u: Unit; start: [number, number]; step: number };
const GROWERS: Grower[] = [
  { what: bi("bacteria in a lab dish", "bacterias en un plato de laboratorio"), every: 20, u: MIN, start: [5, 40], step: 10 },
  { what: bi("yeast cells in a flask of sugar water", "células de levadura en un matraz con agua azucarada"), every: 2, u: HR, start: [2, 20], step: 50 },
  { what: bi("duckweed plants on a pond", "plantas de lenteja de agua en un estanque"), every: 3, u: DAYS, start: [10, 60], step: 1 },
  { what: bi("algae cells in a tank", "células de algas en un tanque"), every: 1, u: DAYS, start: [5, 50], step: 100 },
];

/** Wild populations; `size` is the starting count range in tens. */
type Herd = { name: Bi; young: Bi; size: [number, number] };
const HERDS: Herd[] = [
  { name: bi("deer in a forest", "venados en un bosque"), young: bi("fawns are born", "nacen cervatillos"), size: [20, 90] },
  { name: bi("rabbits in a meadow", "conejos en una pradera"), young: bi("young are born", "nacen crías"), size: [10, 40] },
  { name: bi("bison in a park", "bisontes en un parque"), young: bi("calves are born", "nacen becerros"), size: [20, 90] },
  { name: bi("wolves in a national park", "lobos en un parque nacional"), young: bi("pups are born", "nacen cachorros"), size: [4, 12] },
  { name: bi("prairie dogs in a colony", "perritos de la pradera en una colonia"), young: bi("pups are born", "nacen crías"), size: [20, 90] },
];

const n0 = (n: number) => dec(n, 0);

export function populationItem(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) {
    const g = r.pick(GROWERS);
    const N = r.int(g.start[0], g.start[1]) * g.step;
    const j = r.int(1, 3); // doublings past the last column
    const cols = [0, 1, 2].map((i) => [i * g.every, N * 2 ** i]);
    const T = (2 + j) * g.every, want = N * 2 ** (2 + j);
    const U = g.u.s[locale];
    const tableText = `${tr(locale, "Time", "Tiempo")} (${U}): ${cols.map(([t]) => t).join(", ")}\n${tr(locale, "Count", "Cantidad")}: ${cols.map(([, c]) => n0(c)).join(", ")}`;
    const spokenTable = tr(locale, `Time in ${g.u.w[1].en}: ${cols.map(([t]) => t).join(", ")}. Count: ${cols.map(([, c]) => n0(c)).join(", ")}.`, `Tiempo en ${g.u.w[1].es}: ${cols.map(([t]) => t).join(", ")}. Cantidad: ${cols.map(([, c]) => n0(c)).join(", ")}.`);
    const head = tr(locale, `A scientist counts ${g.what.en}. The number doubles every ${g.every === 1 ? "" : `${g.every} `}${g.u.w[g.every === 1 ? 0 : 1].en}.`, `Una científica cuenta ${g.what.es}. La cantidad se duplica cada ${g.every === 1 ? "" : `${g.every} `}${g.u.w[g.every === 1 ? 0 : 1].es}.`);
    const ask = tr(locale, `If the pattern continues, how many will there be after ${T} ${U}?`, `Si el patrón continúa, ¿cuántas habrá a los ${T} ${U}?`);
    const askSaid = tr(locale, `If the pattern continues, how many will there be after ${T} ${g.u.w[1].en}?`, `Si el patrón continúa, ¿cuántas habrá a los ${T} ${g.u.w[1].es}?`);
    const last = 4 * N;
    const chain = [last];
    for (let i = 0; i < j; i++) chain.push(chain[chain.length - 1] * 2);
    return {
      prompt: [`${head}\n${tableText}\n${ask}`],
      say: `${head} ${spokenTable} ${askSaid}`,
      input: "keypad",
      answer: { kind: "number", value: want },
      wrong: misses(want, [
        [last + j * 2 * N, "added-same-amount"],
        [want / 2, "one-doubling-too-few"],
        [want * 2, "one-doubling-too-many"],
        [last * 2 * j, "multiplied-by-steps"],
      ]),
      hints: [
        tr(locale, `How many doubling times fit between ${cols[2][0]} ${U} and ${T} ${U}?`, `¿Cuántos tiempos de duplicación caben entre ${cols[2][0]} ${U} y ${T} ${U}?`),
        tr(locale, "Each doubling time, multiply the count by 2. The count does not grow by the same amount each time.", "En cada tiempo de duplicación, multiplica la cantidad por 2. La cantidad no aumenta lo mismo cada vez."),
        tr(locale, `From ${cols[2][0]} to ${T} ${U} is ${j} doubling ${j === 1 ? "time" : "times"} of ${g.every === 1 ? `one ${g.u.w[0].en}` : `${g.every} ${U}`}.`, `De ${cols[2][0]} a ${T} ${U} ${j === 1 ? "hay 1 tiempo" : `hay ${j} tiempos`} de duplicación de ${g.every === 1 ? `un ${g.u.w[0].es}` : `${g.every} ${U}`}.`),
      ],
      steps: [
        tr(locale, `From ${cols[2][0]} to ${T} ${U} is ${j} doubling ${j === 1 ? "time" : "times"}.`, `De ${cols[2][0]} a ${T} ${U} ${j === 1 ? "hay 1 tiempo" : `hay ${j} tiempos`} de duplicación.`),
        chain.map(n0).join(" → "),
      ],
      seconds: 40,
    };
  }
  const h = r.pick(HERDS);
  if (r.bool(0.55)) {
    // Births, deaths and (often) migration over one year.
    const N = r.int(h.size[0], h.size[1]) * 10;
    const B = r.int(Math.ceil(N / 50), Math.floor((N * 2) / 25)) * 5; // 10–40 % of N
    const D = r.int(Math.ceil(N / 100), Math.floor(N / 20)) * 5; // 5–25 % of N
    const move = r.bool(0.65);
    const most = Math.max(1, Math.floor(N / 100)); // movers stay small next to the population
    const I = move ? r.int(1, most) * 5 : 0, E = move ? r.int(1, most) * 5 : 0;
    const want = N + B - D + I - E;
    const what = h.name[locale];
    const moveText = move
      ? tr(locale, ` ${I} move in and ${E} move out.`, ` Llegan ${I} de otros lugares y se van ${E}.`)
      : tr(locale, " None move in or out.", " Ninguno llega ni se va.");
    const q = tr(
      locale,
      `A count finds ${n0(N)} ${what} at the start of a year. During the year, ${B} ${h.young.en} and ${D} die.${moveText} How many are there at the end of the year?`,
      `Un conteo encuentra ${n0(N)} ${what} al inicio de un año. Durante el año ${h.young.es.replace("nacen", `nacen ${B}`)} y mueren ${D}.${moveText} ¿Cuántos hay al final del año?`,
    );
    const sum = move ? `${n0(N)} + ${B} − ${D} + ${I} − ${E}` : `${n0(N)} + ${B} − ${D}`;
    return {
      prompt: [q],
      say: q,
      input: "keypad",
      answer: { kind: "number", value: want },
      wrong: misses(want, [
        [N + B + I - E, "ignored-deaths"],
        [N + B + D + I - E, "added-deaths"],
        [move ? N + B - D - I + E : NaN, "swapped-migration"],
        [move ? N + B - D : NaN, "ignored-migration"],
      ]),
      hints: [
        tr(locale, "Which numbers add animals to the population, and which take them away?", "¿Qué números agregan animales a la población y cuáles los quitan?"),
        tr(locale, "Births and animals moving in add; deaths and animals moving out subtract.", "Los nacimientos y los que llegan suman; las muertes y los que se van restan."),
        tr(locale, `Start with ${n0(N)}, add the ${B} births, and subtract the ${D} deaths.`, `Empieza con ${n0(N)}, suma los ${B} nacimientos y resta las ${D} muertes.`),
      ],
      steps: [tr(locale, "end = start + births − deaths + moved in − moved out", "final = inicio + nacimientos − muertes + llegadas − salidas"), `${sum} = ${n0(want)}`],
      seconds: 45,
    };
  }
  // Percent change from births and deaths; a decrease is negative.
  const N = r.int(h.size[0], h.size[1]) * 10;
  const pct = r.pick([-10, -5, -4, 2, 4, 5, 6, 8, 10, 12, 15, 20].filter((p) => (N * Math.abs(p)) % 100 === 0));
  const net = (N * pct) / 100;
  const D = r.int(Math.ceil(N / 100), Math.floor(N / 40)) * 5 + (net < 0 ? -net : 0); // 5–12 % of N, plus any loss
  const B = D + net;
  const what = h.name[locale];
  const q = tr(
    locale,
    `A group of ${n0(N)} ${what} has ${n0(B)} births and ${n0(D)} deaths in a year, and none move in or out. By what percent does the population change? Give a decrease as a negative number.`,
    `Un grupo de ${n0(N)} ${what} tiene ${n0(B)} nacimientos y ${n0(D)} muertes en un año, y ninguno llega ni se va. ¿En qué porcentaje cambia la población? Da una disminución como número negativo.`,
  );
  return {
    prompt: [q, " ", { blank: true }, " %"],
    say: q,
    input: "keypad",
    keys: ["-", "."],
    answer: { kind: "number", value: pct },
    wrong: misses(pct, [
      [r2((B / N) * 100), "forgot-deaths"],
      [net / N, "forgot-to-multiply-by-100"],
      [-pct, "flipped-sign"],
      [net, "gave-count-not-percent"],
    ]),
    hints: [
      tr(locale, "First find how many animals the population gained or lost.", "Primero encuentra cuántos animales ganó o perdió la población."),
      tr(locale, "Percent change = (births − deaths) ÷ starting population × 100.", "Cambio porcentual = (nacimientos − muertes) ÷ población inicial × 100."),
      tr(locale, `Births − deaths: ${n0(B)} − ${n0(D)} = ${net < 0 ? "−" : ""}${n0(Math.abs(net))}.`, `Nacimientos − muertes: ${n0(B)} − ${n0(D)} = ${net < 0 ? "−" : ""}${n0(Math.abs(net))}.`),
    ],
    steps: [
      `${n0(B)} − ${n0(D)} = ${net < 0 ? "−" : ""}${n0(Math.abs(net))}`,
      `${net < 0 ? "−" : ""}${n0(Math.abs(net))} ÷ ${n0(N)} × 100 = ${pct < 0 ? "−" : ""}${Math.abs(pct)}`,
      tr(locale, `The population changes by ${pct < 0 ? "−" : ""}${Math.abs(pct)} %.`, `La población cambia en ${pct < 0 ? "−" : ""}${Math.abs(pct)} %.`),
    ],
    seconds: 60,
  };
}
