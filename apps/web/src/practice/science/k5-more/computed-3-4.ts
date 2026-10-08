import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody } from "../../types";
import { cap, choose, NAMES, wrongValues } from "./util";

// Computed grade 3–4 science: weather and climate data (3-ESS2-1, 3-ESS2-2), balanced forces and
// patterns of motion (3-PS2-1, 3-PS2-2), and reading a wave's amplitude and wavelength from a graph
// (4-PS4-1). Every number is picked per seed and the key is worked out from those numbers.

const opt = (label: string, why?: string): Choice => ({ label, say: label, ...(why ? { why } : {}) });

// ── Weather and climate data (grade 3) ───────────────────────────────────────────────────────
// Average daily high temperatures (°F) for January, April, July and October: the 1991–2020 normals
// (NOAA for the US cities, Environment Canada, Argentina's weather service and Australia's Bureau of
// Meteorology), rounded. Each item shows every month within 2 °F of its normal, so the numbers vary
// from seed to seed and stay true. North of the equator July is warmest; south of it, January is.
const QUARTER_MONTHS: [string, string][] = [["January", "enero"], ["April", "abril"], ["July", "julio"], ["October", "octubre"]];
type Climate = { en: string; es: string; south: boolean; highs: [jan: number, apr: number, jul: number, oct: number] };
const CLIMATES: Climate[] = [
  { en: "Minneapolis, Minnesota", es: "Minneapolis, Minnesota", south: false, highs: [24, 57, 83, 58] },
  { en: "Chicago, Illinois", es: "Chicago, Illinois", south: false, highs: [32, 59, 85, 63] },
  { en: "Toronto, Canada", es: "Toronto, Canadá", south: false, highs: [30, 54, 81, 58] },
  { en: "Montreal, Canada", es: "Montreal, Canadá", south: false, highs: [23, 52, 80, 56] },
  { en: "Winnipeg, Canada", es: "Winnipeg, Canadá", south: false, highs: [12, 50, 78, 51] },
  { en: "Buenos Aires, Argentina", es: "Buenos Aires, Argentina", south: true, highs: [86, 74, 60, 73] },
  { en: "Sydney, Australia", es: "Sídney, Australia", south: true, highs: [81, 75, 64, 74] },
  { en: "Melbourne, Australia", es: "Melbourne, Australia", south: true, highs: [80, 70, 57, 68] },
  { en: "Adelaide, Australia", es: "Adelaida, Australia", south: true, highs: [84, 73, 59, 71] },
];

export function climateData(r: Rng, level: number, locale: Locale): ItemBody {
  const kid = r.pick(NAMES);
  if (level === 3) {
    // Yearly rain in three towns: a desert, a temperate town and a rainforest.
    const [dry, mid, wet] = [r.int(3, 9), r.int(15, 45), r.int(80, 160)];
    const people = r.shuffle(NAMES.filter((n) => n !== kid)).slice(0, 3);
    const towns = r.shuffle([dry, mid, wet]).map((inches, i) => ({ who: people[i], inches }));
    const desert = r.bool();
    const byRain = [...towns].sort((p, q) => p.inches - q.inches);
    const [key, far, middle] = desert ? [byRain[0], byRain[2], byRain[1]] : [byRain[2], byRain[0], byRain[1]];
    const town = (who: string) => tr(locale, `${who}'s town`, `El pueblo de ${who}`);
    const townMid = (who: string) => tr(locale, `${who}'s town`, `el pueblo de ${who}`);
    const facts =
      tr(locale, "Here is the average rain each year.", "Esta es la lluvia promedio de cada año.") +
      " " +
      towns.map((t) => tr(locale, `${t.who}'s town gets ${t.inches} inches.`, `El pueblo de ${t.who} recibe ${t.inches} pulgadas.`)).join(" ");
    const q = desert
      ? tr(locale, "Whose town most likely has a desert climate?", "¿Qué pueblo es más probable que tenga clima de desierto?")
      : tr(locale, "Whose town most likely has a rainforest climate?", "¿Qué pueblo es más probable que tenga clima de selva tropical?");
    return {
      prompt: [`${facts} ${q}`],
      say: `${facts} ${q}`,
      ...choose(r, opt(town(key.who)), [opt(town(far.who), "reversed-climate-clue"), opt(town(middle.who), "picked-the-middle-value")]),
      hints: [
        desert ? tr(locale, "Is a desert wet or dry?", "¿Un desierto es húmedo o seco?") : tr(locale, "Is a rainforest wet or dry?", "¿Una selva tropical es húmeda o seca?"),
        tr(locale, "Climate is the usual weather of a place over many years. Rain totals show how wet or dry it is.", "El clima es el tiempo habitual de un lugar durante muchos años. La lluvia total muestra qué tan húmedo o seco es."),
        tr(locale, `Put the rain amounts in order: ${byRain.map((t) => t.inches).join(", ")}.`, `Ordena las cantidades de lluvia: ${byRain.map((t) => t.inches).join(", ")}.`),
      ],
      steps: [
        desert
          ? tr(locale, `Least rain: ${town(key.who)}, ${key.inches} inches a year.`, `Menos lluvia: ${townMid(key.who)}, ${key.inches} pulgadas al año.`)
          : tr(locale, `Most rain: ${town(key.who)}, ${key.inches} inches a year.`, `Más lluvia: ${townMid(key.who)}, ${key.inches} pulgadas al año.`),
        desert
          ? tr(locale, `Deserts get very little rain, so ${town(key.who)} most likely has a desert climate.`, `Los desiertos reciben muy poca lluvia; ${townMid(key.who)} tiene un clima de desierto.`)
          : tr(locale, `Rainforests get a lot of rain, so ${town(key.who)} most likely has a rainforest climate.`, `Las selvas tropicales reciben mucha lluvia; ${townMid(key.who)} tiene un clima de selva.`),
      ],
      seconds: 40,
    };
  }
  const { en: placeEn, es: placeEs, south, highs } = r.pick(CLIMATES);
  let temps: number[];
  do temps = highs.map((t) => t + r.int(-2, 2));
  while (temps[1] === temps[3]);
  const month = (i: number) => tr(locale, QUARTER_MONTHS[i][0], QUARTER_MONTHS[i][1]);
  /** A month as a choice label, capitalized in Spanish too. */
  const Month = (i: number) => cap(month(i));
  const order = temps.map((_, i) => i).sort((a, b) => temps[b] - temps[a]);
  const [hot, , , cold] = order;
  const where = tr(locale, `${kid} lives in ${placeEn}${south ? ", south of the equator" : ""}.`, `${kid} vive en ${placeEs}${south ? ", al sur del ecuador" : ""}.`);
  const list = (deg: string) => temps.map((t, i) => `${month(i)} ${t}${deg}`).join(", ");
  const lead = tr(locale, "Average high temperatures there:", "Temperaturas máximas promedio allí:");
  const facts = `${where} ${lead} ${list(tr(locale, "°F", " °F"))}.`;
  const factsSaid = `${where} ${lead} ${list(tr(locale, " degrees", " grados"))}.`;
  const strategy = tr(locale, "Compare all four temperatures. North of the equator, summer is in July; south of it, summer is in January.", "Compara las cuatro temperaturas. Al norte del ecuador el verano es en julio; al sur, en enero.");
  if (level === 1) {
    const warmest = r.bool();
    const key = warmest ? hot : cold;
    const far = warmest ? cold : hot;
    const q = warmest ? tr(locale, "Which of these months is warmest?", "¿Cuál de estos meses es el más caluroso?") : tr(locale, "Which of these months is coldest?", "¿Cuál de estos meses es el más frío?");
    // South of the equator, picking July as warmest (or January as coldest) is the northern-seasons mix-up.
    const farWhy = south ? "assumed-northern-seasons" : "picked-the-opposite-extreme";
    return {
      prompt: [`${facts} ${q}`],
      say: `${factsSaid} ${q}`,
      ...choose(
        r,
        opt(Month(key)),
        [0, 1, 2, 3].filter((i) => i !== key).map((i) => opt(Month(i), i === far ? farWhy : "picked-a-middle-value")),
      ),
      hints: [
        warmest ? tr(locale, "Look for the highest temperature.", "Busca la temperatura más alta.") : tr(locale, "Look for the lowest temperature.", "Busca la temperatura más baja."),
        strategy,
        tr(locale, `In order from warmest: ${order.map((i) => temps[i]).join(", ")}.`, `En orden de más caluroso a más frío: ${order.map((i) => temps[i]).join(", ")}.`),
      ],
      steps: [
        tr(locale, `The ${warmest ? "highest" : "lowest"} temperature is ${temps[key]}°F, in ${month(key)}.`, `La temperatura más ${warmest ? "alta" : "baja"} es ${temps[key]} °F, en ${month(key)}.`),
        warmest ? tr(locale, `${month(key)} is warmest.`, `${Month(key)} es el más caluroso.`) : tr(locale, `${month(key)} is coldest.`, `${Month(key)} es el más frío.`),
      ],
      seconds: 30,
    };
  }
  const d = temps[hot] - temps[cold];
  const q = tr(locale, "Of these four months, how many degrees warmer is the warmest than the coldest?", "De estos cuatro meses, ¿cuántos grados más caluroso es el más caluroso que el más frío?");
  return {
    prompt: [`${facts} ${q}`],
    say: `${factsSaid} ${q}`,
    input: "keypad",
    answer: { kind: "number", value: d },
    wrong: wrongValues(d, [
      [temps[hot] + temps[cold], "added-instead-of-subtracting"],
      [temps[hot] - temps[order[2]], "compared-the-wrong-months"],
      [d + 10, "subtraction-slip-by-ten"],
      [d - 10, "subtraction-slip-by-ten"],
    ]),
    hints: [
      tr(locale, "Find the warmest month and the coldest month first.", "Primero busca el mes más caluroso y el mes más frío."),
      tr(locale, "Subtract the lowest temperature from the highest.", "Resta la temperatura más baja de la más alta."),
      tr(locale, `The warmest month is ${month(hot)}, at ${temps[hot]}°F.`, `El mes más caluroso es ${month(hot)}, con ${temps[hot]} °F.`),
    ],
    steps: [
      tr(locale, `Warmest: ${month(hot)}, ${temps[hot]}°F. Coldest: ${month(cold)}, ${temps[cold]}°F.`, `Más caluroso: ${month(hot)}, ${temps[hot]} °F. Más frío: ${month(cold)}, ${temps[cold]} °F.`),
      `${temps[hot]} − ${temps[cold]} = ${d}`,
      tr(locale, `${month(hot)} is ${d} degrees warmer than ${month(cold)}.`, `${Month(hot)} es ${d} grados más caluroso que ${month(cold)}.`),
    ],
    seconds: 45,
  };
}

// ── Forces and patterns of motion (grade 3) ──────────────────────────────────────────────────

export function motionPatterns(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 1) return balanced(r, locale);
  if (level === 2) return nextTime(r, locale);
  return fullCycles(r, locale);
}

function balanced(r: Rng, locale: Locale): ItemBody {
  const a = r.int(2, 6);
  const b = r.int(0, 2) === 0 ? a : r.pick([2, 3, 4, 5, 6].filter((n) => n !== a));
  const rope = r.bool();
  const strategy = tr(
    locale,
    "Equal forces in opposite directions are balanced, so nothing starts moving. Unequal forces are unbalanced, so the object moves the way the stronger force acts.",
    "Fuerzas iguales en sentidos opuestos están equilibradas y nada empieza a moverse. Fuerzas desiguales están desequilibradas y el objeto se mueve hacia donde actúa la fuerza mayor.",
  );
  if (rope) {
    const q = tr(
      locale,
      `The red team has ${a} kids and the blue team has ${b} kids. Everyone pulls the rope just as hard. What happens to the rope?`,
      `El equipo rojo tiene ${a} niños y el equipo azul tiene ${b}. Todos jalan la cuerda con la misma fuerza. ¿Qué pasa con la cuerda?`,
    );
    const still = tr(locale, "It does not move", "No se mueve");
    const toRed = tr(locale, "It moves toward the red team", "Se mueve hacia el equipo rojo");
    const toBlue = tr(locale, "It moves toward the blue team", "Se mueve hacia el equipo azul");
    const [key, wrong] =
      a === b
        ? [opt(still), [opt(toRed, "thinks-balanced-forces-move"), opt(toBlue, "thinks-balanced-forces-move")]]
        : a > b
          ? [opt(toRed), [opt(toBlue, "picked-the-weaker-side"), opt(still, "thinks-unbalanced-forces-balance")]]
          : [opt(toBlue), [opt(toRed, "picked-the-weaker-side"), opt(still, "thinks-unbalanced-forces-balance")]];
    return {
      prompt: [q],
      say: q,
      ...choose(r, key, wrong),
      hints: [tr(locale, "Compare the number of kids pulling each way.", "Compara cuántos niños jalan hacia cada lado."), strategy, tr(locale, `Red: ${a} pulls. Blue: ${b} pulls.`, `Rojo: ${a} jalones. Azul: ${b} jalones.`)],
      steps: [
        a === b
          ? tr(locale, `${a} pulls against ${b} pulls: the forces are balanced.`, `${a} jalones contra ${b}: las fuerzas están equilibradas.`)
          : tr(locale, `${Math.max(a, b)} pulls against ${Math.min(a, b)} pulls: the forces are unbalanced.`, `${Math.max(a, b)} jalones contra ${Math.min(a, b)}: las fuerzas están desequilibradas.`),
        a === b ? tr(locale, "The rope does not move.", "La cuerda no se mueve.") : a > b ? tr(locale, "The rope moves toward the red team.", "La cuerda se mueve hacia el equipo rojo.") : tr(locale, "The rope moves toward the blue team.", "La cuerda se mueve hacia el equipo azul."),
      ],
      seconds: 30,
    };
  }
  const q = tr(
    locale,
    `${a} kids push a box from the left side. ${b} kids push it from the right side. Each kid pushes just as hard. What happens to the box?`,
    `${a} niños empujan una caja desde el lado izquierdo. ${b} niños la empujan desde el lado derecho. Todos empujan con la misma fuerza. ¿Qué pasa con la caja?`,
  );
  const still = tr(locale, "It stays still", "Se queda quieta");
  const right = tr(locale, "It slides to the right", "Se desliza a la derecha");
  const left = tr(locale, "It slides to the left", "Se desliza a la izquierda");
  // Pushes from the left side move the box to the right.
  const [key, wrong] =
    a === b
      ? [opt(still), [opt(right, "thinks-balanced-forces-move"), opt(left, "thinks-balanced-forces-move")]]
      : a > b
        ? [opt(right), [opt(left, "push-direction-reversed"), opt(still, "thinks-unbalanced-forces-balance")]]
        : [opt(left), [opt(right, "push-direction-reversed"), opt(still, "thinks-unbalanced-forces-balance")]];
  return {
    prompt: [q],
    say: q,
    ...choose(r, key, wrong),
    hints: [tr(locale, "A push from the left side moves the box which way?", "Un empujón desde la izquierda mueve la caja ¿hacia dónde?"), strategy, tr(locale, `Left side: ${a} pushes. Right side: ${b} pushes.`, `Lado izquierdo: ${a} empujones. Lado derecho: ${b}.`)],
    steps: [
      a === b
        ? tr(locale, `${a} pushes against ${b} pushes: the forces are balanced.`, `${a} empujones contra ${b}: las fuerzas están equilibradas.`)
        : tr(locale, `${Math.max(a, b)} pushes against ${Math.min(a, b)} pushes: the forces are unbalanced.`, `${Math.max(a, b)} empujones contra ${Math.min(a, b)}: las fuerzas están desequilibradas.`),
      a === b
        ? tr(locale, "The box stays still.", "La caja se queda quieta.")
        : a > b
          ? tr(locale, "The stronger push comes from the left, so the box slides to the right.", "El empujón mayor viene de la izquierda, así que la caja se desliza a la derecha.")
          : tr(locale, "The stronger push comes from the right, so the box slides to the left.", "El empujón mayor viene de la derecha, así que la caja se desliza a la izquierda."),
    ],
    seconds: 30,
  };
}

type Repeat = { en: string; es: string; whenEn: string; whenEs: string };
const REPEATS: Repeat[] = [
  { en: "A skateboard rolls back and forth on a half-pipe ramp.", es: "Una patineta va y viene en una rampa de medio tubo.", whenEn: "reaches the left edge", whenEs: "llega a la orilla izquierda" },
  { en: "A swing moves back and forth.", es: "Un columpio va y viene.", whenEn: "reaches its highest point in front", whenEs: "llega a su punto más alto adelante" },
  { en: "A long pendulum swings back and forth.", es: "Un péndulo largo va de un lado a otro.", whenEn: "reaches the left side", whenEs: "llega al lado izquierdo" },
  { en: "A seesaw goes up and down.", es: "Un subibaja sube y baja.", whenEn: "touches the ground on Jun's side", whenEs: "toca el suelo del lado de Jun" },
  { en: "A lighthouse light turns around and around.", es: "La luz de un faro gira y gira.", whenEn: "shines toward the beach", whenEs: "alumbra hacia la playa" },
];

function nextTime(r: Rng, locale: Locale): ItemBody {
  const p = r.int(2, 5);
  const t0 = r.int(1, p);
  const times = [t0, t0 + p, t0 + 2 * p];
  const next = t0 + 3 * p;
  const c = r.pick(REPEATS);
  const max = Math.ceil((t0 + 4 * p) / 5) * 5;
  const q = tr(
    locale,
    `${c.en} It ${c.whenEn} at ${times[0]}, ${times[1]} and ${times[2]} seconds. When will it next do that? Tap the time on the number line.`,
    `${c.es} ${cap(c.whenEs)} a los ${times[0]}, ${times[1]} y ${times[2]} segundos. ¿Cuándo lo hará otra vez? Toca el tiempo en la recta numérica.`,
  );
  return {
    prompt: [q],
    say: q,
    input: "number-line",
    pad: { kind: "number-line", min: 0, max, step: 1 },
    answer: { kind: "number", value: next },
    wrong: wrongValues(next, [
      [times[2] + 1, "added-one-instead-of-the-gap"],
      [times[2] + 2 * p, "skipped-a-turn"],
      [times[2], "repeated-the-last-time"],
    ]),
    hints: [
      tr(locale, "How many seconds pass between one time and the next?", "¿Cuántos segundos pasan de una vez a la siguiente?"),
      tr(locale, "Motion that repeats makes a pattern. Add the same gap to predict the next time.", "Un movimiento que se repite forma un patrón. Suma el mismo intervalo para predecir la siguiente vez."),
      `${times[1]} − ${times[0]} = ${p}`,
    ],
    steps: [
      tr(locale, `The gap is ${p} seconds each time.`, `El intervalo es de ${p} segundos cada vez.`),
      `${times[2]} + ${p} = ${next}`,
      tr(locale, `It happens next at ${next} seconds.`, `La siguiente vez es a los ${next} segundos.`),
    ],
    seconds: 40,
  };
}

type Cycle = { en: string; es: string; askEn: string; askEs: string; nounEn: string; nounEs: string; unitEn: string; unitEs: string; minP: number; maxP: number };
const CYCLES: Cycle[] = [
  { en: "A swing makes one full swing, out and back,", es: "Un columpio hace un vaivén completo, de ida y vuelta,", askEn: "How many full swings does it make", askEs: "¿Cuántos vaivenes completos hace", nounEn: "full swings", nounEs: "vaivenes completos", unitEn: "seconds", unitEs: "segundos", minP: 2, maxP: 4 },
  { en: "A grandfather clock's pendulum makes one full swing, out and back,", es: "El péndulo de un reloj de pie hace un vaivén completo, de ida y vuelta,", askEn: "How many full swings does it make", askEs: "¿Cuántos vaivenes completos hace", nounEn: "full swings", nounEs: "vaivenes completos", unitEn: "seconds", unitEs: "segundos", minP: 2, maxP: 2 },
  { en: "A merry-go-round makes one full turn", es: "Un carrusel da una vuelta completa", askEn: "How many full turns does it make", askEs: "¿Cuántas vueltas completas da", nounEn: "full turns", nounEs: "vueltas completas", unitEn: "seconds", unitEs: "segundos", minP: 6, maxP: 12 },
  { en: "A toy train goes once around its track", es: "Un tren de juguete da una vuelta a su vía", askEn: "How many laps does it make", askEs: "¿Cuántas vueltas da", nounEn: "laps", nounEs: "vueltas", unitEn: "seconds", unitEs: "segundos", minP: 4, maxP: 9 },
  { en: "A Ferris wheel goes around once", es: "Una rueda de la fortuna da una vuelta", askEn: "How many times does it go around", askEs: "¿Cuántas vueltas da", nounEn: "turns", nounEs: "vueltas", unitEn: "minutes", unitEs: "minutos", minP: 3, maxP: 6 },
];

function fullCycles(r: Rng, locale: Locale): ItemBody {
  const c = r.pick(CYCLES);
  const p = r.int(c.minP, c.maxP);
  const k = r.int(3, 10);
  const total = p * k;
  const unit = tr(locale, c.unitEn, c.unitEs);
  const q = tr(
    locale,
    `${c.en} every ${p} ${unit}. It keeps the same steady pattern. ${c.askEn} in ${total} ${unit}?`,
    `${c.es} cada ${p} ${unit}. Sigue el mismo patrón parejo. ${c.askEs} en ${total} ${unit}?`,
  );
  return {
    prompt: [q],
    say: q,
    input: "keypad",
    answer: { kind: "number", value: k },
    wrong: wrongValues(k, [
      [total * p, "multiplied-instead-of-dividing"],
      [total - p, "subtracted-instead-of-dividing"],
      [k + 1, "counted-one-extra"],
    ]),
    hints: [
      tr(locale, "How long does each one take?", "¿Cuánto tiempo toma cada vez?"),
      tr(locale, "A steady pattern repeats in equal steps. Divide the total time by the time for each one.", "Un patrón parejo se repite en pasos iguales. Divide el tiempo total entre el tiempo de cada vez."),
      tr(locale, `Skip count by ${p}: ${p}, ${2 * p}, and keep going until you reach ${total}.`, `Cuenta de ${p} en ${p}: ${p}, ${2 * p}, y sigue hasta llegar a ${total}.`),
    ],
    steps: [`${total} ÷ ${p} = ${k}`, tr(locale, `That is ${k} ${c.nounEn} in ${total} ${unit}.`, `Son ${k} ${c.nounEs} en ${total} ${unit}.`)],
    seconds: 45,
  };
}

// ── Waves: amplitude and wavelength (grade 4) ────────────────────────────────────────────────
// The wave is drawn as a zigzag through its crests, rest line and troughs, a crest at distance 0.
// Every crest lands on a labeled whole number and the height axis counts by ones (heights ≤ 6).
// Waves travel along ropes and springs, never water: water waves this steep would break.

type WaveCtx = { en: (name: string) => string; es: (name: string) => string; unit: [string, string, string, string]; restEn: string; restEs: string };
const WAVES: WaveCtx[] = [
  { en: (n) => `${n} shakes one end of a long rope.`, es: (n) => `${n} sacude la punta de una cuerda larga.`, unit: ["foot", "feet", "pie", "pies"], restEn: "the rope", restEs: "la cuerda" },
  { en: () => "A wave moves along a long toy spring.", es: () => "Una onda recorre un resorte largo de juguete.", unit: ["inch", "inches", "pulgada", "pulgadas"], restEn: "the spring", restEs: "el resorte" },
  { en: (n) => `${n} wiggles one end of a long jump rope tied to a fence.`, es: (n) => `${n} mueve la punta de una cuerda de saltar larga atada a una cerca.`, unit: ["foot", "feet", "pie", "pies"], restEn: "the jump rope", restEs: "la cuerda" },
];

export function waveShape(r: Rng, level: number, locale: Locale): ItemBody {
  if (level === 3) return compareWaves(r, locale);
  const ctx = r.pick(WAVES);
  const c = r.pick([3, 4]);
  const amp = r.int(1, c === 3 ? 3 : 2);
  const wl = r.int(2, 5);
  const n = Math.floor(10 / wl);
  const points: [number, number][] = Array.from({ length: 4 * n + 1 }, (_, i) => [(i * wl) / 4, c + amp * [1, 0, -1, 0][i % 4]]);
  const units = (v: number) => tr(locale, v === 1 ? ctx.unit[0] : ctx.unit[1], v === 1 ? ctx.unit[2] : ctx.unit[3]);
  const crests = Array.from({ length: n + 1 }, (_, i) => i * wl);
  const name = r.pick(NAMES);
  const setup = tr(locale, ctx.en(name), ctx.es(name));
  const rest = tr(locale, `When it is still, ${ctx.restEn} rests at a height of ${c} ${units(c)}.`, `En reposo, ${ctx.restEs} queda a una altura de ${c} ${units(c)}.`);
  const visual = {
    kind: "line-graph" as const,
    points,
    xLabel: tr(locale, `Distance (${ctx.unit[1]})`, `Distancia (${ctx.unit[3]})`),
    yLabel: tr(locale, `Height (${ctx.unit[1]})`, `Altura (${ctx.unit[3]})`),
  };
  const alt = tr(
    locale,
    `A zigzag graph of the wave. Its high points are at a height of ${c + amp} and its low points at ${c - amp}. The high points are at distances ${crests.join(", ")}.`,
    `Una gráfica en zigzag de la onda. Sus puntos altos están a una altura de ${c + amp} y los bajos a ${c - amp}. Los puntos altos están a las distancias ${crests.join(", ")}.`,
  );
  if (level === 1) {
    const q = tr(locale, `What is the wave's amplitude, in ${ctx.unit[1]}?`, `¿Cuál es la amplitud de la onda, en ${ctx.unit[3]}?`);
    return {
      prompt: [`${setup} ${rest} ${q}`],
      say: `${setup} ${rest} ${q}`,
      visual,
      alt,
      input: "keypad",
      answer: { kind: "number", value: amp },
      wrong: wrongValues(amp, [
        [2 * amp, "measured-crest-to-trough"],
        [c + amp, "read-crest-height-not-amplitude"],
        [wl, "mixed-up-amplitude-and-wavelength"],
      ]),
      hints: [
        tr(locale, "Find a crest, a high point of the wave.", "Busca una cresta, un punto alto de la onda."),
        tr(locale, "Amplitude is the height from the rest line up to a crest.", "La amplitud es la altura desde la línea de reposo hasta una cresta."),
        tr(locale, `A crest is at height ${c + amp}. The rest line is at ${c}.`, `Una cresta está a una altura de ${c + amp}. La línea de reposo está en ${c}.`),
      ],
      steps: [`${c + amp} − ${c} = ${amp}`, tr(locale, `The amplitude is ${amp} ${units(amp)}.`, `La amplitud es ${amp} ${units(amp)}.`)],
      seconds: 40,
    };
  }
  const q = tr(locale, `What is the wave's wavelength, in ${ctx.unit[1]}?`, `¿Cuál es la longitud de onda, en ${ctx.unit[3]}?`);
  return {
    prompt: [`${setup} ${rest} ${q}`],
    say: `${setup} ${rest} ${q}`,
    visual,
    alt,
    input: "keypad",
    answer: { kind: "number", value: wl },
    wrong: wrongValues(wl, [
      [wl / 2, "measured-crest-to-trough"],
      [n, "counted-the-waves"],
      [n * wl, "measured-the-whole-wave-train"],
      [amp, "mixed-up-amplitude-and-wavelength"],
    ]),
    hints: [
      tr(locale, "Find two crests next to each other.", "Busca dos crestas seguidas."),
      tr(locale, "Wavelength is the distance from one crest to the next crest.", "La longitud de onda es la distancia de una cresta a la siguiente."),
      tr(locale, `One crest is at distance 0. Find where the next crest is.`, `Una cresta está en la distancia 0. Busca dónde está la siguiente.`),
    ],
    steps: [`${wl} − 0 = ${wl}`, tr(locale, `The wavelength is ${wl} ${units(wl)}.`, `La longitud de onda es ${wl} ${units(wl)}.`)],
    seconds: 40,
  };
}

function compareWaves(r: Rng, locale: Locale): ItemBody {
  const kind = r.int(0, 2); // 0 amplitude, 1 wavelength, 2 energy (same wavelength)
  // Rope waves a few inches high and several feet long, as in a classroom demonstration.
  let [a1, a2] = [r.int(2, 9), r.int(2, 9)];
  while (a1 === a2) [a1, a2] = [r.int(2, 9), r.int(2, 9)];
  let w1: number, w2: number;
  if (kind === 2) w1 = w2 = r.int(3, 12);
  else {
    // The wave with the bigger amplitude gets the shorter wavelength, so mixing them up picks the other wave.
    [w1, w2] = [r.int(3, 12), r.int(3, 12)];
    while (w1 === w2 || (a1 > a2) === (w1 > w2)) [w1, w2] = [r.int(3, 12), r.int(3, 12)];
  }
  const ft = (v: number) => tr(locale, v === 1 ? "foot" : "feet", v === 1 ? "pie" : "pies");
  const inch = (v: number) => tr(locale, v === 1 ? "inch" : "inches", v === 1 ? "pulgada" : "pulgadas");
  const facts = tr(
    locale,
    `Two waves travel along two long ropes that are just alike. Wave A has an amplitude of ${a1} ${inch(a1)} and a wavelength of ${w1} ${ft(w1)}. Wave B has an amplitude of ${a2} ${inch(a2)} and a wavelength of ${w2} ${ft(w2)}.`,
    `Dos ondas recorren dos cuerdas largas iguales. La onda A tiene una amplitud de ${a1} ${inch(a1)} y una longitud de onda de ${w1} ${ft(w1)}. La onda B tiene una amplitud de ${a2} ${inch(a2)} y una longitud de onda de ${w2} ${ft(w2)}.`,
  );
  const A = tr(locale, "Wave A", "La onda A"), B = tr(locale, "Wave B", "La onda B"), same = tr(locale, "They are the same", "Son iguales");
  const bigAmpIsA = a1 > a2;
  if (kind === 0 || kind === 2) {
    const q = kind === 0 ? tr(locale, "Which wave has the bigger amplitude?", "¿Qué onda tiene mayor amplitud?") : tr(locale, "Which wave carries more energy?", "¿Qué onda lleva más energía?");
    const [key, other] = bigAmpIsA ? [A, B] : [B, A];
    return {
      prompt: [`${facts} ${q}`],
      say: `${facts} ${q}`,
      ...choose(r, opt(key), [opt(other, kind === 0 ? "mixed-up-amplitude-and-wavelength" : "thinks-smaller-wave-has-more-energy"), opt(same, kind === 0 ? "thinks-waves-are-equal" : "thinks-energy-ignores-amplitude")]),
      hints: [
        kind === 0 ? tr(locale, "Amplitude is the height of a crest above the rest line.", "La amplitud es la altura de una cresta sobre la línea de reposo.") : tr(locale, "The wavelengths are the same. What is different?", "Las longitudes de onda son iguales. ¿Qué es diferente?"),
        kind === 0
          ? tr(locale, "Compare only the amplitudes. Ignore the wavelengths.", "Compara solo las amplitudes. No hagas caso a las longitudes de onda.")
          : tr(locale, "With the same wavelength, the wave with the bigger amplitude carries more energy.", "Con la misma longitud de onda, la onda de mayor amplitud lleva más energía."),
        tr(locale, `Amplitudes: A is ${a1}, B is ${a2}.`, `Amplitudes: A es ${a1}, B es ${a2}.`),
      ],
      steps: [
        tr(locale, `${Math.max(a1, a2)} is more than ${Math.min(a1, a2)}.`, `${Math.max(a1, a2)} es más que ${Math.min(a1, a2)}.`),
        kind === 0 ? tr(locale, `${key} has the bigger amplitude.`, `${key} tiene mayor amplitud.`) : tr(locale, `${key} has the bigger amplitude, so it carries more energy.`, `${key} tiene mayor amplitud, así que lleva más energía.`),
      ],
      seconds: 35,
    };
  }
  const q = tr(locale, "Which wave has the longer wavelength?", "¿Qué onda tiene mayor longitud de onda?");
  const [key, other] = w1 > w2 ? [A, B] : [B, A];
  return {
    prompt: [`${facts} ${q}`],
    say: `${facts} ${q}`,
    ...choose(r, opt(key), [opt(other, "mixed-up-amplitude-and-wavelength"), opt(same, "thinks-waves-are-equal")]),
    hints: [
      tr(locale, "Wavelength is the distance from one crest to the next.", "La longitud de onda es la distancia de una cresta a la siguiente."),
      tr(locale, "Compare only the wavelengths. Ignore the amplitudes.", "Compara solo las longitudes de onda. No hagas caso a las amplitudes."),
      tr(locale, `Wavelengths: A is ${w1}, B is ${w2}.`, `Longitudes de onda: A es ${w1}, B es ${w2}.`),
    ],
    steps: [tr(locale, `${Math.max(w1, w2)} is more than ${Math.min(w1, w2)}.`, `${Math.max(w1, w2)} es más que ${Math.min(w1, w2)}.`), tr(locale, `${key} has the longer wavelength.`, `${key} tiene mayor longitud de onda.`)],
    seconds: 35,
  };
}
