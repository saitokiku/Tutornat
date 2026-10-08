import type { Locale } from "@/lib/types";
import type { Rng } from "../../rng";
import { tr } from "../../text";
import type { Choice, ItemBody } from "../../types";
import { bi, dec, withChoices, type Bi } from "./shared";

// s.moon.phase: estimate the Moon's phase on a date from a reference new (or full) moon and the mean
// synodic month of 29.53 days. Each item's reference is a real new or full moon from the US Naval
// Observatory phase tables. Only events between 11:00 and 23:00 UT are kept, so the stated date is the
// same in UTC and in every US time zone, Eastern through Hawaii, with an hour to spare. The item says
// "about": a day count is used only when the mean-cycle estimate lands within half a day of one of the
// eight phases, which keeps the real Moon in that phase (the test checks every case against an orbit model).

const DAY = 86_400_000;
/** The mean synodic month in days: new moon to new moon. */
const SYNODIC = 29.53;
const EIGHTH = SYNODIC / 8;

/** [year, month, day, kind]: new and full moons 2025–2027 at 11:00–23:00 UT (USNO). */
export const MOON_EVENTS: [number, number, number, "new" | "full"][] = [
  [2025, 1, 13, "full"], [2025, 1, 29, "new"], [2025, 2, 12, "full"], [2025, 4, 27, "new"], [2025, 5, 12, "full"], [2025, 7, 10, "full"],
  [2025, 7, 24, "new"], [2025, 9, 7, "full"], [2025, 9, 21, "new"], [2025, 10, 21, "new"], [2025, 11, 5, "full"], [2026, 1, 18, "new"],
  [2026, 2, 1, "full"], [2026, 2, 17, "new"], [2026, 3, 3, "full"], [2026, 4, 17, "new"], [2026, 5, 1, "full"], [2026, 5, 16, "new"],
  [2026, 7, 29, "full"], [2026, 8, 12, "new"], [2026, 9, 26, "full"], [2026, 10, 10, "new"], [2026, 11, 24, "full"], [2027, 1, 7, "new"],
  [2027, 1, 22, "full"], [2027, 2, 6, "new"], [2027, 4, 20, "full"], [2027, 6, 4, "new"], [2027, 7, 18, "full"], [2027, 8, 31, "new"],
  [2027, 10, 15, "full"], [2027, 10, 29, "new"], [2027, 12, 13, "full"], [2027, 12, 27, "new"],
];

/** 0 new, 1 waxing crescent, 2 first quarter, 3 waxing gibbous, 4 full, 5 waning gibbous, 6 last quarter, 7 waning crescent. */
export const PHASES: { name: Bi; pic: string }[] = [
  { name: bi("New moon", "Luna nueva"), pic: "🌑" },
  { name: bi("Waxing crescent", "Luna creciente"), pic: "🌒" },
  { name: bi("First quarter", "Cuarto creciente"), pic: "🌓" },
  { name: bi("Waxing gibbous", "Luna gibosa creciente"), pic: "🌔" },
  { name: bi("Full moon", "Luna llena"), pic: "🌕" },
  { name: bi("Waning gibbous", "Luna gibosa menguante"), pic: "🌖" },
  { name: bi("Last quarter", "Cuarto menguante"), pic: "🌗" },
  { name: bi("Waning crescent", "Luna menguante"), pic: "🌘" },
];
/** Where each phase sits in the cycle, in tenths of a day (eighths of 29.53 days), as said in the steps. */
const PHASE_DAY10 = [0, 37, 74, 111, 148, 185, 221, 258];

/** The nearest of the eight phases about `days` after a new (or full) moon, by the mean cycle. */
function phaseAfter(start: "new" | "full", days: number) {
  const age = ((start === "full" ? SYNODIC / 2 : 0) + days) % SYNODIC;
  return Math.round(age / EIGHTH) % 8;
}

/** Every (reference, day count) a level can ask about, keeping only counts within half a day of a phase. */
export function moonOptions(level: number): { ev: number; n: number; p: number }[] {
  const out: { ev: number; n: number; p: number }[] = [];
  MOON_EVENTS.forEach(([, , , kind], ev) => {
    // Level 1 stays inside one cycle; level 2 crosses one or two.
    const [lo, hi] = level === 1 ? [2, kind === "new" ? 27 : 13] : [31, 60];
    for (let n = lo; n <= hi; n++) {
      const age = ((kind === "full" ? SYNODIC / 2 : 0) + n) % SYNODIC;
      if (Math.abs(age - Math.round(age / EIGHTH) * EIGHTH) <= 0.5) out.push({ ev, n, p: phaseAfter(kind, n) });
    }
  });
  return out;
}
const OPTIONS = [moonOptions(1), moonOptions(2)];

const MONTHS: Bi[] = [
  bi("January", "enero"), bi("February", "febrero"), bi("March", "marzo"), bi("April", "abril"), bi("May", "mayo"), bi("June", "junio"),
  bi("July", "julio"), bi("August", "agosto"), bi("September", "septiembre"), bi("October", "octubre"), bi("November", "noviembre"), bi("December", "diciembre"),
];
/** "March 10, 2025" / "10 de marzo de 2025"; `year: false` drops the year. */
function dateText(t: number, locale: Locale, year = true) {
  const d = new Date(t);
  const [day, month, y] = [d.getUTCDate(), MONTHS[d.getUTCMonth()][locale], d.getUTCFullYear()];
  if (locale === "es") return year ? `${day} de ${month} de ${y}` : `${day} de ${month}`;
  return year ? `${month} ${day}, ${y}` : `${month} ${day}`;
}

/** Wrong phases by how a learner slips: waxing for waning, half a cycle off, a quarter off, an eighth off. */
function phaseMisses(p: number): [number, string][] {
  return [
    [(8 - p) % 8, "mixed-up-waxing-waning"],
    [(p + 4) % 8, "half-cycle-off"],
    [(p + 2) % 8, "off-by-a-quarter"],
    [(p + 6) % 8, "off-by-a-quarter"],
    [(p + 1) % 8, "off-by-an-eighth"],
  ];
}

export function moonItem(r: Rng, level: number, locale: Locale): ItemBody {
  const all = OPTIONS[level === 1 ? 0 : 1];
  // Every phase that can turn up is equally likely; new-moon starts are more common at level 1.
  const p = r.pick([...new Set(all.map((o) => o.p))]);
  const starts = all.filter((o) => o.p === p);
  const kinds = [...new Set(starts.map((o) => MOON_EVENTS[o.ev][3]))];
  const kind = kinds.length > 1 && level === 1 ? (r.bool(0.7) ? "new" : "full") : r.pick(kinds);
  const { ev, n } = r.pick(starts.filter((o) => MOON_EVENTS[o.ev][3] === kind));
  const [y, mo, d] = MOON_EVENTS[ev];
  const t0 = Date.UTC(y, mo - 1, d), t1 = t0 + n * DAY;
  const sameYear = new Date(t1).getUTCFullYear() === y;
  const D0 = dateText(t0, locale), D1 = dateText(t1, locale);
  const d0 = dateText(t0, locale, !sameYear), d1 = dateText(t1, locale, !sameYear);
  const full = kind === "full";
  const ref = full ? bi("full moon", "luna llena") : bi("new moon", "luna nueva");
  const q = tr(
    locale,
    `A moon calendar shows a ${ref.en} on ${D0}. About what phase does it show for ${D1}?`,
    `Un calendario lunar marca ${ref.es} el ${D0}. ¿Aproximadamente qué fase marca para el ${D1}?`,
  );

  // The worked count in tenths of a day, with 29.5-day cycles taken away.
  const total10 = (full ? 148 : 0) + 10 * n;
  const cycles = Math.floor(total10 / 295);
  const x10 = total10 - 295 * cycles;
  const [T, X] = [dec(total10), dec(x10)];
  const days = tr(locale, `From ${d0} to ${d1} is ${n} days.`, `Del ${d0} al ${d1} hay ${n} días.`);
  const parts: string[] = [];
  if (full) parts.push(tr(locale, `A full moon is about 14.8 days into the cycle, so 14.8 + ${n} = ${T} days.`, `La luna llena está a unos 14.8 días del inicio del ciclo, así que 14.8 + ${n} = ${T} días.`));
  if (cycles) {
    const whole = dec(295 * cycles);
    parts.push(
      tr(
        locale,
        `Take away ${cycles === 1 ? "one cycle of about 29.5 days" : `${cycles} cycles (${whole} days)`}: ${T} − ${whole} = ${X} days into a new cycle.`,
        `Quita ${cycles === 1 ? "un ciclo de unos 29.5 días" : `${cycles} ciclos (${whole} días)`}: ${T} − ${whole} = ${X} días de un nuevo ciclo.`,
      ),
    );
  }
  if (!parts.length) parts.push(tr(locale, `So the Moon is about ${n} days into its cycle of about 29.5 days.`, `Así que la Luna lleva unos ${n} días de su ciclo de unos 29.5 días.`));
  const name = PHASES[p].name[locale];
  const near =
    p === 0
      ? x10 > 148
        ? tr(locale, `${X} days is close to a whole cycle of 29.5 days, so it is about a new moon.`, `${X} días es casi un ciclo completo de 29.5 días, así que es casi luna nueva.`)
        : tr(locale, `${X} days is close to the start of a cycle: a new moon.`, `${X} días es casi el inicio de un ciclo: luna nueva.`)
      : tr(locale, `${X} days is closest to ${name.toLowerCase()}, at about ${dec(PHASE_DAY10[p])} days.`, `${X} días está más cerca de ${name.toLowerCase()}, a unos ${dec(PHASE_DAY10[p])} días.`);
  const right: Choice = { label: name, picture: PHASES[p].pic };
  const wrong = phaseMisses(p).map(([i, why]) => ({ label: PHASES[i].name[locale], picture: PHASES[i].pic, why }));
  return {
    prompt: [q],
    say: q,
    ...withChoices(r, right, wrong),
    hints: [
      tr(locale, `How many days after the ${ref.en} is ${d1}?`, `¿Cuántos días después de la ${ref.es} es el ${d1}?`),
      tr(
        locale,
        "The phases repeat about every 29.5 days: first quarter about 7.4 days after a new moon, full moon at about 14.8, last quarter at about 22.1, then new again.",
        "Las fases se repiten cada 29.5 días, más o menos: cuarto creciente unos 7.4 días después de la luna nueva, luna llena a los 14.8, cuarto menguante a los 22.1 y otra vez luna nueva.",
      ),
      days,
    ],
    steps: [days, parts.join(" "), near, tr(locale, `Answer: ${name}`, `Respuesta: ${name}`)],
    seconds: level === 1 ? 45 : 75,
  };
}
