import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import type { Skill } from "../types";
import { fromBank, type BankLevel } from "./k5-more/bank";
import { daylight, habitatSurvey, weatherChart } from "./k5-more/computed-early";
import { BANKS_K } from "./k5-more/grade-k";

// K–5 science, second strand: the NGSS performance expectations the first strand (early.ts) does not
// reach, so every grade K–5 has six to eight skills. Most skills are hand-written question banks
// ("draft": not yet reviewed by a teacher) in ./k5-more/grade-*.ts. Weather tallies, daylight, a
// habitat survey, climate data, motion patterns, wave graphs, conservation of mass and Earth's water
// are computed from numbers the generator picks (./k5-more/computed-*.ts).

export type { BankLevel, Entry, Option, Pair } from "./k5-more/bank";

export const BANKS: Record<string, readonly BankLevel[]> = { ...BANKS_K };

const fromBanks = (id: string) => (r: Rng, level: number, locale: Locale) => fromBank(r, BANKS[id][level - 1], locale);

export const SCIENCE_K_5_MORE: Skill[] = [
  // ── Kindergarten ──
  {
    id: "s.weather.chart",
    subject: "science",
    grade: "K",
    title: { en: "Weather tallies", es: "Contar el tiempo" },
    standard: "K-ESS2-1",
    prereqs: ["s.weather"],
    content: "computed",
    levels: 2,
    generate: weatherChart,
  },
  {
    id: "s.sun.warms",
    subject: "science",
    grade: "K",
    title: { en: "Sunlight warms; shade cools", es: "El sol calienta; la sombra refresca" },
    standard: "K-PS3-1",
    prereqs: ["s.weather"],
    content: "draft",
    levels: 2,
    generate: fromBanks("s.sun.warms"),
  },
  {
    id: "s.living.change",
    subject: "science",
    grade: "K",
    title: { en: "Living things change their home", es: "Los seres vivos cambian su entorno" },
    standard: "K-ESS2-2",
    prereqs: ["s.needs"],
    content: "draft",
    levels: 2,
    generate: fromBanks("s.living.change"),
  },
  {
    id: "s.weather.ready",
    subject: "science",
    grade: "K",
    title: { en: "Getting ready for storms", es: "Prepararse para las tormentas" },
    standard: "K-ESS3-2",
    prereqs: ["s.weather"],
    content: "draft",
    levels: 1,
    generate: fromBanks("s.weather.ready"),
  },
  // ── Grade 1 ──
  {
    id: "s.daylight.hours",
    subject: "science",
    grade: "1",
    title: { en: "Daylight through the year", es: "La luz del día durante el año" },
    standard: "1-ESS1-2",
    prereqs: ["s.weather.chart"],
    content: "computed",
    levels: 3,
    generate: daylight,
  },
  // ── Grade 2 ──
  {
    id: "s.habitat.survey",
    subject: "science",
    grade: "2",
    title: { en: "Counting living things in habitats", es: "Contar seres vivos en los hábitats" },
    standard: "2-LS4-1",
    prereqs: ["s.habitats"],
    content: "computed",
    levels: 3,
    generate: habitatSurvey,
  },
];
