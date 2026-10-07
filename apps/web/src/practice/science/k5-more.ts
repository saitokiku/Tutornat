import type { Locale } from "@/lib/types";
import type { Rng } from "../rng";
import type { Skill } from "../types";
import { fromBank, type BankLevel } from "./k5-more/bank";
import { climateData, motionPatterns, waveShape } from "./k5-more/computed-3-4";
import { daylight, habitatSurvey, weatherChart } from "./k5-more/computed-early";
import { BANKS_1 } from "./k5-more/grade-1";
import { BANKS_2 } from "./k5-more/grade-2";
import { BANKS_3 } from "./k5-more/grade-3";
import { BANKS_K } from "./k5-more/grade-k";

// K–5 science, second strand: the NGSS performance expectations the first strand (early.ts) does not
// reach, so every grade K–5 has six to eight skills. Most skills are hand-written question banks
// ("draft": not yet reviewed by a teacher) in ./k5-more/grade-*.ts. Weather tallies, daylight, a
// habitat survey, climate data, motion patterns, wave graphs, conservation of mass and Earth's water
// are computed from numbers the generator picks (./k5-more/computed-*.ts).

export type { BankLevel, Entry, Option, Pair } from "./k5-more/bank";

export const BANKS: Record<string, readonly BankLevel[]> = { ...BANKS_K, ...BANKS_1, ...BANKS_2, ...BANKS_3 };

const fromBanks = (id: string) => (r: Rng, level: number, locale: Locale) => fromBank(r, BANKS[id][level - 1], locale);

type Meta = Pick<Skill, "id" | "grade" | "standard" | "prereqs" | "levels"> & { en: string; es: string };
/** A hand-written bank skill ("draft" until a teacher reviews it). */
const draft = ({ en, es, ...m }: Meta): Skill => ({ ...m, subject: "science", title: { en, es }, content: "draft", generate: fromBanks(m.id) });
/** A skill whose answers are worked out from the numbers the generator picks. */
const computed = ({ en, es, ...m }: Meta, generate: Skill["generate"]): Skill => ({ ...m, subject: "science", title: { en, es }, content: "computed", generate });

export const SCIENCE_K_5_MORE: Skill[] = [
  // ── Kindergarten ──
  computed({ id: "s.weather.chart", grade: "K", en: "Weather tallies", es: "Contar el tiempo", standard: "K-ESS2-1", prereqs: ["s.weather"], levels: 2 }, weatherChart),
  draft({ id: "s.sun.warms", grade: "K", en: "Sunlight warms; shade cools", es: "El sol calienta; la sombra refresca", standard: "K-PS3-1", prereqs: ["s.weather"], levels: 2 }),
  draft({ id: "s.living.change", grade: "K", en: "Living things change their home", es: "Los seres vivos cambian su entorno", standard: "K-ESS2-2", prereqs: ["s.needs"], levels: 2 }),
  draft({ id: "s.weather.ready", grade: "K", en: "Getting ready for storms", es: "Prepararse para las tormentas", standard: "K-ESS3-2", prereqs: ["s.weather"], levels: 1 }),
  // ── Grade 1 ──
  draft({ id: "s.sound.vibrate", grade: "1", en: "Sound and vibration", es: "El sonido y las vibraciones", standard: "1-PS4-1", prereqs: [], levels: 1 }),
  draft({ id: "s.light.see", grade: "1", en: "Light lets us see", es: "La luz nos deja ver", standard: "1-PS4-2", prereqs: [], levels: 1 }),
  draft({ id: "s.light.through", grade: "1", en: "Light and materials", es: "La luz y los materiales", standard: "1-PS4-3", prereqs: ["s.light.see"], levels: 1 }),
  draft({ id: "s.signals", grade: "1", en: "Signals with light and sound", es: "Señales con luz y sonido", standard: "1-PS4-4", prereqs: ["s.sound.vibrate", "s.light.see"], levels: 1 }),
  draft({ id: "s.parts.jobs", grade: "1", en: "Plant and animal parts", es: "Partes de plantas y animales", standard: "1-LS1-1", prereqs: ["s.needs"], levels: 2 }),
  draft({ id: "s.parents.young", grade: "1", en: "Parents and their young", es: "Los padres y sus crías", standard: "1-LS1-2", prereqs: ["s.living"], levels: 2 }),
  draft({ id: "s.sky.patterns", grade: "1", en: "Patterns in the sky", es: "Patrones en el cielo", standard: "1-ESS1-1", prereqs: [], levels: 1 }),
  computed({ id: "s.daylight.hours", grade: "1", en: "Daylight through the year", es: "La luz del día durante el año", standard: "1-ESS1-2", prereqs: ["s.sky.patterns", "s.weather.chart"], levels: 3 }, daylight),
  // ── Grade 2 ──
  draft({ id: "s.plants.grow", grade: "2", en: "Plants: needs, seeds and pollen", es: "Las plantas: necesidades, semillas y polen", standard: "2-LS2-1", prereqs: ["s.needs", "s.parts.jobs"], levels: 3 }),
  computed({ id: "s.habitat.survey", grade: "2", en: "Counting living things in habitats", es: "Contar seres vivos en los hábitats", standard: "2-LS4-1", prereqs: ["s.habitats"], levels: 3 }, habitatSurvey),
  draft({ id: "s.landforms.water", grade: "2", en: "Landforms, water and maps", es: "Formas del terreno, agua y mapas", standard: "2-ESS2-2", prereqs: [], levels: 2 }),
  draft({ id: "s.wind.water.land", grade: "2", en: "Wind and water change land", es: "El viento y el agua cambian la tierra", standard: "2-ESS2-1", prereqs: ["s.landforms.water"], levels: 2 }),
  draft({ id: "s.heat.cool", grade: "2", en: "Heating and cooling", es: "Calentar y enfriar", standard: "2-PS1-4", prereqs: ["s.states.matter"], levels: 2 }),
  // ── Grade 3 ──
  computed({ id: "s.climate.data", grade: "3", en: "Weather and climate data", es: "Datos del tiempo y del clima", standard: "3-ESS2-1", prereqs: ["s.weather.chart"], levels: 3 }, climateData),
  draft({ id: "s.traits.inherited", grade: "3", en: "Inherited traits and environment", es: "Rasgos heredados y ambiente", standard: "3-LS3-1", prereqs: ["s.parents.young"], levels: 2 }),
  draft({ id: "s.fossils.past", grade: "3", en: "Fossils and past environments", es: "Fósiles y ambientes del pasado", standard: "3-LS4-1", prereqs: ["s.habitats"], levels: 1 }),
  draft({ id: "s.adapt.survive", grade: "3", en: "Adaptations and survival", es: "Adaptaciones y supervivencia", standard: "3-LS4-3", prereqs: ["s.traits.inherited", "s.habitats"], levels: 2 }),
  draft({ id: "s.magnets.static", grade: "3", en: "Static electricity and magnets", es: "Electricidad estática e imanes", standard: "3-PS2-3", prereqs: ["s.forces"], levels: 2 }),
  computed({ id: "s.motion.patterns", grade: "3", en: "Forces and patterns of motion", es: "Fuerzas y patrones de movimiento", standard: "3-PS2-2", prereqs: ["s.forces"], levels: 3 }, motionPatterns),
  // ── Grade 4 ──
  computed({ id: "s.wave.shape", grade: "4", en: "Wave amplitude and wavelength", es: "Amplitud y longitud de onda", standard: "4-PS4-1", prereqs: ["s.sound.vibrate"], levels: 3 }, waveShape),
];
