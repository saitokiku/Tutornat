import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import type { Skill } from "../types";
import { AIR_MASSES, DESIGN, HEAT_TRANSFER, ROCK_CYCLE } from "./upper-more/g6-earth";
import { BODY_JOBS, BODY_TOGETHER, ORG_PARTS, ORG_THEORY } from "./upper-more/g6-life";
import { MATTER_ENERGY, MIXTURES, PHOTO_IO, REACTION_SIGNS, RESOURCES } from "./upper-more/g7-banks";
import { moonItem } from "./upper-more/moon";
import { bankItem, type Bank } from "./upper-more/shared";

// Grades 6–9 science, second strand (NGSS middle school and early high school), split into files under
// ./upper-more/ so no file grows past a few hundred lines. Two kinds of skill:
// - computed: the answer is calculated in code (moon phase from a date, rates from tables and graphs,
//   population tables, energy, waves, circuits, momentum, half-life, balancing, percent composition,
//   scientific notation). Values are built backward from whole numbers of tenths or other exact
//   integers, so a key is never a floating-point accident.
// - draft: hand-written banks, not yet teacher-reviewed. Each entry keeps English and Spanish side by
//   side, so one seed picks the same question in both languages.
// Every wrong choice names the mistake it stands for, and typed answers list the likely wrong values.

/** The hand-written banks, by skill id, one per level (exported for the bank checks in the test). */
export const SCIENCE_6_9_MORE_BANKS: Record<string, Bank[]> = {
  "s.organelles": [ORG_THEORY, ORG_PARTS],
  "s.body.systems": [BODY_JOBS, BODY_TOGETHER],
  "s.air.masses": [AIR_MASSES],
  "s.rock.cycle": [ROCK_CYCLE],
  "s.heat.transfer": [HEAT_TRANSFER],
  "s.design.criteria": [DESIGN],
  "s.photo.resp": [PHOTO_IO, MATTER_ENERGY],
  "s.mixtures": [MIXTURES],
  "s.reaction.signs": [REACTION_SIGNS],
  "s.resources": [RESOURCES],
};

const fromBank = (id: string) => (r: Rng, level: number, locale: Locale) => bankItem(r, SCIENCE_6_9_MORE_BANKS[id][level - 1], locale);

// ── The strand ──────────────────────────────────────────────────────────────────────────────────

export const SCIENCE_6_9_MORE: Skill[] = [
  // Grade 6
  {
    id: "s.organelles",
    subject: "science",
    grade: "6",
    title: { en: "Cell theory and organelles", es: "La teoría celular y los organelos" },
    standard: "MS-LS1-2",
    prereqs: ["s.cells"],
    content: "draft",
    levels: 2,
    generate: fromBank("s.organelles"),
  },
  {
    id: "s.body.systems",
    subject: "science",
    grade: "6",
    title: { en: "Body systems working together", es: "Los sistemas del cuerpo trabajan juntos" },
    standard: "MS-LS1-3",
    prereqs: ["s.cells"],
    content: "draft",
    levels: 2,
    generate: fromBank("s.body.systems"),
  },
  {
    id: "s.air.masses",
    subject: "science",
    grade: "6",
    title: { en: "Air masses and weather fronts", es: "Masas de aire y frentes" },
    standard: "MS-ESS2-5",
    prereqs: ["s.water.cycle"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.air.masses"),
  },
  {
    id: "s.rock.cycle",
    subject: "science",
    grade: "6",
    title: { en: "The rock cycle", es: "El ciclo de las rocas" },
    standard: "MS-ESS2-1",
    prereqs: ["s.rocks"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.rock.cycle"),
  },
  {
    id: "s.heat.transfer",
    subject: "science",
    grade: "6",
    title: { en: "Conduction, convection and radiation", es: "Conducción, convección y radiación" },
    standard: "MS-PS3-3",
    prereqs: ["s.energy.forms"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.heat.transfer"),
  },
  {
    id: "s.design.criteria",
    subject: "science",
    grade: "6",
    title: { en: "Design criteria and constraints", es: "Criterios y restricciones de diseño" },
    standard: "MS-ETS1-1",
    prereqs: ["s.variables"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.design.criteria"),
  },
  {
    id: "s.moon.phase",
    subject: "science",
    grade: "6",
    title: { en: "The Moon's phase on a date", es: "La fase de la Luna en una fecha" },
    standard: "MS-ESS1-1",
    prereqs: ["s.earth.sun.moon"],
    content: "computed",
    levels: 2,
    generate: moonItem,
  },
  // Grade 7
  {
    id: "s.photo.resp",
    subject: "science",
    grade: "7",
    title: { en: "Photosynthesis, respiration and energy flow", es: "Fotosíntesis, respiración y flujo de energía" },
    standard: "MS-LS1-6",
    prereqs: ["s.organelles", "s.food.chains"],
    content: "draft",
    levels: 2,
    generate: fromBank("s.photo.resp"),
  },
  {
    id: "s.mixtures",
    subject: "science",
    grade: "7",
    title: { en: "Elements, compounds and mixtures", es: "Elementos, compuestos y mezclas" },
    standard: "MS-PS1-1",
    prereqs: ["s.states.matter"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.mixtures"),
  },
  {
    id: "s.reaction.signs",
    subject: "science",
    grade: "7",
    title: { en: "Signs of a chemical reaction", es: "Señales de una reacción química" },
    standard: "MS-PS1-2",
    prereqs: ["s.mixtures"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.reaction.signs"),
  },
  {
    id: "s.resources",
    subject: "science",
    grade: "7",
    title: { en: "Where natural resources come from", es: "De dónde vienen los recursos naturales" },
    standard: "MS-ESS3-1",
    prereqs: ["s.rock.cycle"],
    content: "draft",
    levels: 1,
    generate: fromBank("s.resources"),
  },
  // @@GRADE7
];
