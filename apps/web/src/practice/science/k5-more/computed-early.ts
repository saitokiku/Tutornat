import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody } from "../../types";
import { cap, choose, NAMES, numChoice, wrongValues } from "./util";

// Computed K–2 science: weather tallies (K-ESS2-1), daylight through the year (1-ESS1-2) and a
// living-things survey of habitats (2-LS4-1). The numbers are picked per seed; the key is worked out
// from them. Each item shows the counts as dots (one dot per day, hour or kind) that a child can tap
// to mark while counting.

const SAME_PIC = "⚖️";

// ── Weather tallies (K) ──────────────────────────────────────────────────────────────────────
type Kind = { en: string; es: string; pic: string };
const KINDS: Kind[] = [
  { en: "sunny", es: "soleados", pic: "☀️" },
  { en: "rainy", es: "lluviosos", pic: "🌧️" },
  { en: "cloudy", es: "nublados", pic: "☁️" },
  { en: "snowy", es: "con nieve", pic: "❄️" },
  { en: "windy", es: "con viento", pic: "🌬️" },
];
const days = (k: Kind, locale: Locale) => tr(locale, `${k.en} days`, `días ${k.es}`);

export function weatherChart(r: Rng, level: number, locale: Locale): ItemBody {
  const [ka, kb] = r.shuffle(KINDS).slice(0, 2);
  let a = r.int(2, 10), b = r.int(2, 10);
  while (level === 1 ? Math.abs(a - b) < 2 : a === b) [a, b] = [r.int(2, 10), r.int(2, 10)];
  const setup = tr(
    locale,
    `A class drew a dot for each day. The first group is ${ka.en} days. The second group is ${kb.en} days.`,
    `Una clase dibujó un punto por cada día. El primer grupo son los ${days(ka, locale)}. El segundo grupo son los ${days(kb, locale)}.`,
  );
  const visual = { visual: { kind: "dots" as const, groups: [a, b] }, markable: true };
  // The description names the groups but not their sizes: counting is the task. Each dot is a
  // button, so a child using a screen reader counts by moving from dot to dot.
  const alt = tr(
    locale,
    `Two groups of dots to count. The first group is for ${ka.en} days. The second group is for ${kb.en} days.`,
    `Dos grupos de puntos para contar. El primer grupo es de los ${days(ka, locale)}. El segundo grupo es de los ${days(kb, locale)}.`,
  );
  if (level === 1) {
    const [more, less, mn, ln] = a > b ? [ka, kb, a, b] : [kb, ka, b, a];
    const q = tr(locale, "Which kind of day happened more?", "¿Qué tipo de día hubo más veces?");
    const label = (k: Kind) => cap(days(k, locale));
    return {
      prompt: [`${setup} ${q}`],
      say: `${setup} ${q}`,
      ...visual,
      alt,
      ...choose(r, { label: label(more), say: label(more), picture: more.pic }, [
        { label: label(less), say: label(less), picture: less.pic, why: "picked-the-smaller-group" },
        { label: tr(locale, "Both the same", "Los dos igual"), say: tr(locale, "Both the same", "Los dos igual"), picture: SAME_PIC, why: "thinks-groups-are-equal" },
      ]),
      hints: [
        tr(locale, "Count the dots in each group.", "Cuenta los puntos de cada grupo."),
        tr(locale, "The group with more dots shows the weather that happened more.", "El grupo con más puntos muestra el tiempo que hubo más veces."),
        tr(locale, `The first group has ${a} dots.`, `El primer grupo tiene ${a} puntos.`),
      ],
      steps: [
        tr(locale, `${cap(ka.en)} days: ${a}. ${cap(kb.en)} days: ${b}.`, `${cap(days(ka, locale))}: ${a}. ${cap(days(kb, locale))}: ${b}.`),
        tr(locale, `${mn} is more than ${ln}. There were more ${more.en} days.`, `${mn} es más que ${ln}. Hubo más ${days(more, locale)}.`),
      ],
      seconds: 15,
    };
  }
  const askFirst = r.bool();
  const [kind, n, other] = askFirst ? [ka, a, b] : [kb, b, a];
  const which = tr(locale, askFirst ? "first" : "second", askFirst ? "primer" : "segundo");
  const q = tr(locale, `How many ${kind.en} days were there?`, `¿Cuántos ${days(kind, locale)} hubo?`);
  const near = r.shuffle([n - 1, n + 1]).find((v) => v >= 1 && v !== other && v !== a + b)!;
  const wrong: Choice[] = [
    numChoice(other, "counted-the-other-group"),
    numChoice(a + b, "counted-every-dot"),
    numChoice(near, near < n ? "skipped-a-dot" : "counted-a-dot-twice"),
  ];
  return {
    prompt: [`${setup} ${q}`],
    say: `${setup} ${q}`,
    ...visual,
    alt,
    ...choose(r, numChoice(n), wrong),
    hints: [
      tr(locale, `Find the group for ${kind.en} days.`, `Busca el grupo de los ${days(kind, locale)}.`),
      tr(locale, "Touch each dot once as you count.", "Toca cada punto una vez mientras cuentas."),
      tr(locale, `The ${which} group is the ${kind.en} days.`, `El ${which} grupo son los ${days(kind, locale)}.`),
    ],
    steps: [
      tr(locale, `The ${which} group is the ${kind.en} days.`, `El ${which} grupo son los ${days(kind, locale)}.`),
      tr(locale, `Count its dots. There were ${n} ${kind.en} days.`, `Cuenta sus puntos. Hubo ${n} ${days(kind, locale)}.`),
    ],
    seconds: 12,
  };
}

// ── Daylight through the year (grade 1) ──────────────────────────────────────────────────────
// Sunrise to sunset on the 15th of each month near 40° north (Denver, Philadelphia, Columbus and
// Indianapolis all round to these whole hours). September (about 12½ hours) is left out because it
// does not round cleanly.
const DAYLIGHT: (number | null)[] = [10, 11, 12, 13, 14, 15, 15, 14, null, 11, 10, 9];
const MONTH_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** Winter, spring, summer, fall (months as US schools group them). */
const SEASON_PIC = ["⛄", "⛄", "🌷", "🌷", "🌷", "☀️", "☀️", "☀️", "🍂", "🍂", "🍂", "⛄"];
const SEASON = (m: number) => [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0][m];
const CITIES: [string, string][] = [["Denver", "Denver"], ["Philadelphia", "Filadelfia"], ["Columbus, Ohio", "Columbus, Ohio"], ["Indianapolis", "Indianápolis"]];
const MONTHS = DAYLIGHT.flatMap((h, m) => (h === null ? [] : [m]));
const hours = (m: number) => DAYLIGHT[m]!;

/** Months whose rounded daylight differs pairwise by at least `gap`, from different seasons. */
function months(r: Rng, n: number, gap: number): number[] {
  for (;;) {
    const ms = r.shuffle(MONTHS).slice(0, n);
    const ok = ms.every((m, i) => ms.every((o, j) => i === j || (Math.abs(hours(m) - hours(o)) >= gap && SEASON(m) !== SEASON(o))));
    if (ok) return ms;
  }
}

export function daylight(r: Rng, level: number, locale: Locale): ItemBody {
  const [cityEn, cityEs] = r.pick(CITIES);
  const city = tr(locale, cityEn, cityEs);
  const name = (m: number) => tr(locale, MONTH_EN[m], MONTH_ES[m]);
  const Name = (m: number) => cap(name(m));
  const monthChoice = (m: number, why?: string): Choice => ({ label: Name(m), say: Name(m), picture: SEASON_PIC[m], ...(why ? { why } : {}) });
  const ms = months(r, level === 2 ? 3 : 2, level === 2 ? 2 : 3);
  const hs = ms.map(hours);
  const facts = ms
    .map((m, i) =>
      i === 0
        ? tr(locale, `In ${city}, ${Name(m)} has about ${hs[i]} hours of daylight.`, `En ${city}, ${name(m)} tiene unas ${hs[i]} horas de luz del día.`)
        : tr(locale, `${Name(m)} has about ${hs[i]} hours.`, `${Name(m)} tiene unas ${hs[i]} horas.`),
    )
    .join(" ");
  const visual = { visual: { kind: "dots" as const, groups: hs }, markable: true };
  const alt =
    tr(locale, `${ms.length === 2 ? "Two" : "Three"} groups of dots. Each dot is one hour of daylight. `, `${ms.length === 2 ? "Dos" : "Tres"} grupos de puntos. Cada punto es una hora de luz del día. `) +
    ms.map((m, i) => `${Name(m)}: ${hs[i]}.`).join(" ");
  const strategy = tr(locale, "Days are long in summer and short in winter. Compare the hours.", "Los días son largos en verano y cortos en invierno. Compara las horas.");
  const sorted = ms.map((m, i) => [m, hs[i]] as const).sort((p, q) => q[1] - p[1]);
  const [top, hi] = sorted[0];
  const [bottom, lo] = sorted[sorted.length - 1];
  if (level === 1) {
    const q = tr(locale, "Which month has more daylight?", "¿Qué mes tiene más luz del día?");
    return {
      prompt: [`${facts} ${q}`],
      say: `${facts} ${q}`,
      ...visual,
      alt,
      ...choose(r, monthChoice(top), [
        monthChoice(bottom, "picked-less-daylight"),
        { label: tr(locale, "Both the same", "Los dos igual"), say: tr(locale, "Both the same", "Los dos igual"), picture: SAME_PIC, why: "thinks-daylight-same-all-year" },
      ]),
      hints: [tr(locale, "Which group of dots is bigger?", "¿Qué grupo de puntos es más grande?"), strategy, tr(locale, `Compare ${hs[0]} and ${hs[1]}.`, `Compara ${hs[0]} y ${hs[1]}.`)],
      steps: [
        ms.map((m, i) => tr(locale, `${Name(m)}: ${hs[i]} hours.`, `${Name(m)}: ${hs[i]} horas.`)).join(" "),
        tr(locale, `${hi} is more than ${lo}, so ${Name(top)} has more daylight.`, `${hi} es más que ${lo}, así que ${name(top)} tiene más luz del día.`),
      ],
      seconds: 20,
    };
  }
  if (level === 2) {
    const most = r.bool();
    const middle = sorted[1][0];
    const [key, far] = most ? [top, bottom] : [bottom, top];
    const q = most ? tr(locale, "Which month has the most daylight?", "¿Qué mes tiene más luz del día?") : tr(locale, "Which month has the least daylight?", "¿Qué mes tiene menos luz del día?");
    return {
      prompt: [`${facts} ${q}`],
      say: `${facts} ${q}`,
      ...visual,
      alt,
      ...choose(r, monthChoice(key), [monthChoice(far, most ? "picked-least-not-most" : "picked-most-not-least"), monthChoice(middle, "picked-the-middle")]),
      hints: [
        most ? tr(locale, "Find the biggest group of dots.", "Busca el grupo de puntos más grande.") : tr(locale, "Find the smallest group of dots.", "Busca el grupo de puntos más pequeño."),
        strategy,
        tr(locale, `Put the hours in order: ${[...hs].sort((p, q) => p - q).join(", ")}.`, `Ordena las horas: ${[...hs].sort((p, q) => p - q).join(", ")}.`),
      ],
      steps: [
        tr(locale, `In order: ${sorted.map(([m, h]) => `${Name(m)} (${h} hours)`).join(", ")}.`, `En orden: ${sorted.map(([m, h]) => `${name(m)} (${h} horas)`).join(", ")}.`),
        most
          ? tr(locale, `${Name(key)} has the most daylight.`, `${Name(key)} tiene más luz del día.`)
          : tr(locale, `${Name(key)} has the least daylight.`, `${Name(key)} tiene menos luz del día.`),
      ],
      seconds: 25,
    };
  }
  const d = hi - lo;
  const q = tr(locale, `How many more hours of daylight does ${Name(top)} have than ${Name(bottom)}?`, `¿Cuántas horas más de luz del día tiene ${name(top)} que ${name(bottom)}?`);
  return {
    prompt: [`${facts} ${q}`],
    say: `${facts} ${q}`,
    ...visual,
    alt,
    input: "keypad",
    answer: { kind: "number", value: d },
    wrong: wrongValues(d, [
      [hi + lo, "added-instead-of-subtracting"],
      [hi, "gave-one-month-not-the-difference"],
      [lo, "gave-one-month-not-the-difference"],
      [d + 1, "counted-one-extra"],
    ]),
    hints: [
      tr(locale, `Which month has more hours?`, `¿Qué mes tiene más horas?`),
      tr(locale, "Find the difference. Count up from the smaller number to the bigger one.", "Busca la diferencia. Cuenta desde el número menor hasta el mayor."),
      tr(locale, `Start at ${lo} and count up to ${hi}.`, `Empieza en ${lo} y cuenta hasta ${hi}.`),
    ],
    steps: [`${hi} − ${lo} = ${d}`, tr(locale, `${Name(top)} has ${d} more hours of daylight.`, `${Name(top)} tiene ${d} horas más de luz del día.`)],
    seconds: 25,
  };
}

// ── Living-things survey (grade 2) ───────────────────────────────────────────────────────────
// A child counts how many different kinds of living things they find. Busy natural places get
// bigger counts than paved ones; two natural places can come out either way.
type Place = { en: string; es: string; pic: string; min: number; max: number; rich: boolean };
const PLACES: Place[] = [
  { en: "the pond", es: "el estanque", pic: "🦆", min: 8, max: 16, rich: true },
  { en: "the forest", es: "el bosque", pic: "🌲", min: 10, max: 18, rich: true },
  { en: "the meadow", es: "la pradera", pic: "🌼", min: 8, max: 15, rich: true },
  { en: "the garden", es: "el jardín", pic: "🌻", min: 6, max: 12, rich: true },
  { en: "the tide pool", es: "la poza de marea", pic: "🦀", min: 6, max: 12, rich: true },
  { en: "the parking lot", es: "el estacionamiento", pic: "🚗", min: 1, max: 4, rich: false },
  { en: "the sidewalk", es: "la acera", pic: "🚶", min: 1, max: 4, rich: false },
  { en: "the mowed lawn", es: "el césped cortado", pic: "🌱", min: 2, max: 5, rich: false },
  { en: "the blacktop", es: "el patio de asfalto", pic: "🏀", min: 1, max: 3, rich: false },
];

/** `n` places and counts, counts pairwise at least 2 apart. */
function survey(r: Rng, n: number): [Place, number][] {
  for (;;) {
    const rich = r.shuffle(PLACES.filter((p) => p.rich));
    const poor = r.shuffle(PLACES.filter((p) => !p.rich));
    const nPoor = n === 2 ? (r.bool() ? 1 : 0) : 1;
    const ps = r.shuffle([...rich.slice(0, n - nPoor), ...poor.slice(0, nPoor)]);
    const counts = ps.map((p) => r.int(p.min, p.max));
    if (counts.every((c, i) => counts.every((o, j) => i === j || Math.abs(c - o) >= 2))) return ps.map((p, i) => [p, counts[i]]);
  }
}

export function habitatSurvey(r: Rng, level: number, locale: Locale): ItemBody {
  const kid = r.pick(NAMES);
  const s = survey(r, level === 3 ? 3 : 2);
  const where = (p: Place) => tr(locale, p.en, p.es);
  const Where = (p: Place) => cap(where(p));
  const placeChoice = (p: Place, why?: string): Choice => ({ label: Where(p), say: Where(p), picture: p.pic, ...(why ? { why } : {}) });
  const facts =
    tr(locale, `${kid} counted the kinds of living things in each place.`, `${kid} contó los tipos de seres vivos en cada lugar.`) +
    " " +
    s.map(([p, c]) => tr(locale, `${Where(p)} had ${c} ${c === 1 ? "kind" : "kinds"}.`, `${Where(p)} tenía ${c} ${c === 1 ? "tipo" : "tipos"}.`)).join(" ");
  const visual = { visual: { kind: "dots" as const, groups: s.map(([, c]) => c) }, markable: true };
  const alt =
    tr(locale, `${s.length === 2 ? "Two" : "Three"} groups of dots. Each dot is one kind of living thing. `, `${s.length === 2 ? "Dos" : "Tres"} grupos de puntos. Cada punto es un tipo de ser vivo. `) +
    s.map(([p, c]) => `${Where(p)}: ${c}.`).join(" ");
  const strategy = tr(
    locale,
    "Many kinds of living things in one place is called biodiversity. Compare the counts.",
    "Cuando hay muchos tipos de seres vivos en un lugar, eso se llama biodiversidad. Compara los números.",
  );
  const sorted = [...s].sort((p, q) => q[1] - p[1]);
  const [hiP, hi] = sorted[0];
  const [loP, lo] = sorted[sorted.length - 1];
  if (level === 1) {
    const q = tr(locale, "Which place has more kinds of living things?", "¿Qué lugar tiene más tipos de seres vivos?");
    return {
      prompt: [`${facts} ${q}`],
      say: `${facts} ${q}`,
      ...visual,
      alt,
      ...choose(r, placeChoice(hiP), [
        placeChoice(loP, "picked-fewer-kinds"),
        { label: tr(locale, "Both the same", "Los dos igual"), say: tr(locale, "Both the same", "Los dos igual"), picture: SAME_PIC, why: "thinks-counts-are-equal" },
      ]),
      hints: [tr(locale, "Which group of dots is bigger?", "¿Qué grupo de puntos es más grande?"), strategy, tr(locale, `Compare ${s[0][1]} and ${s[1][1]}.`, `Compara ${s[0][1]} y ${s[1][1]}.`)],
      steps: [
        s.map(([p, c]) => tr(locale, `${Where(p)}: ${c} ${c === 1 ? "kind" : "kinds"}.`, `${Where(p)}: ${c} ${c === 1 ? "tipo" : "tipos"}.`)).join(" "),
        tr(locale, `${hi} is more than ${lo}, so ${where(hiP)} has more kinds.`, `${hi} es más que ${lo}, así que ${where(hiP)} tiene más tipos.`),
      ],
      seconds: 20,
    };
  }
  if (level === 2) {
    const d = hi - lo;
    const q = tr(locale, `How many more kinds did ${where(hiP)} have than ${where(loP)}?`, `¿Cuántos tipos más tenía ${where(hiP)} que ${where(loP)}?`);
    return {
      prompt: [`${facts} ${q}`],
      say: `${facts} ${q}`,
      ...visual,
      alt,
      input: "keypad",
      answer: { kind: "number", value: d },
      wrong: wrongValues(d, [
        [hi + lo, "added-instead-of-subtracting"],
        [hi, "gave-one-count-not-the-difference"],
        [lo, "gave-one-count-not-the-difference"],
        [d + 1, "counted-one-extra"],
      ]),
      hints: [
        tr(locale, "Which place had more kinds?", "¿Qué lugar tenía más tipos?"),
        tr(locale, "Find the difference. Subtract, or count up from the smaller number.", "Busca la diferencia. Resta, o cuenta desde el número menor."),
        tr(locale, `Start at ${lo} and count up to ${hi}.`, `Empieza en ${lo} y cuenta hasta ${hi}.`),
      ],
      steps: [`${hi} − ${lo} = ${d}`, tr(locale, `${Where(hiP)} had ${d} more kinds.`, `${Where(hiP)} tenía ${d} tipos más.`)],
      seconds: 30,
    };
  }
  const most = r.bool();
  const [key, far] = most ? [hiP, loP] : [loP, hiP];
  const middle = sorted[1][0];
  const q = most ? tr(locale, "Which place has the most kinds of living things?", "¿Qué lugar tiene más tipos de seres vivos?") : tr(locale, "Which place has the fewest kinds of living things?", "¿Qué lugar tiene menos tipos de seres vivos?");
  return {
    prompt: [`${facts} ${q}`],
    say: `${facts} ${q}`,
    ...visual,
    alt,
    ...choose(r, placeChoice(key), [placeChoice(far, most ? "picked-fewest-not-most" : "picked-most-not-fewest"), placeChoice(middle, "picked-the-middle")]),
    hints: [
      most ? tr(locale, "Find the biggest group of dots.", "Busca el grupo de puntos más grande.") : tr(locale, "Find the smallest group of dots.", "Busca el grupo de puntos más pequeño."),
      strategy,
      tr(locale, `Put the counts in order: ${s.map(([, c]) => c).sort((p, q) => p - q).join(", ")}.`, `Ordena los números: ${s.map(([, c]) => c).sort((p, q) => p - q).join(", ")}.`),
    ],
    steps: [
      tr(locale, `In order: ${sorted.map(([p, c]) => `${where(p)} (${c})`).join(", ")}.`, `En orden: ${sorted.map(([p, c]) => `${where(p)} (${c})`).join(", ")}.`),
      most ? tr(locale, `${Where(key)} has the most kinds.`, `${Where(key)} tiene más tipos.`) : tr(locale, `${Where(key)} has the fewest kinds.`, `${Where(key)} tiene menos tipos.`),
    ],
    seconds: 30,
  };
}
