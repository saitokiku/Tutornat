import "server-only";
import { CATALOGUE } from "@/catalogue";
import { RULES } from "@/learning/engine";
import type { Grade, Locale, Subject } from "@/lib/types";
import { answerText } from "@/practice/answer";
import { makeItem, SKILLS, standardAt } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { resourcesFor } from "@/resources";

// What the landing shows, computed on the server at build time from the real engine: practice items
// made by makeItem, the skill map from SKILLS, titles from the catalogue, sources from resources.
// The browser receives plain data and only the answer checker, never the generators or lesson bodies.

export type BandKey = "k2" | "35" | "69";
export const BANDS: BandKey[] = ["k2", "35", "69"];

/** One live problem per grade band; the first seed is the one a visitor meets first (7 dots, 3/4, −3). */
const PICKS: Record<BandKey, { skillId: string; level: number; seed: number }> = {
  k2: { skillId: "m.count.10", level: 2, seed: 12 },
  "35": { skillId: "m.frac.numberline", level: 1, seed: 10 },
  "69": { skillId: "m.int.numberline", level: 1, seed: 8 },
};
const POOL = 5;

export type Source = { id: string; title: string; source: string; url: string; urlEs?: string; about: Record<Locale, string> };

export type HeroSet = {
  skillId: string;
  title: Record<Locale, string>;
  grade: Grade;
  standard?: string;
  /** Same seeds in both languages, so switching language keeps the same problem. */
  items: Record<Locale, Item[]>;
  sources: Source[];
};

type Cell = { computed: number; draft: number };
export type MapRow = { grade: Grade; cells: Record<"math" | "english" | "science", Cell> };
export type CourseLine = { id: string; title: string; subject: Subject; grade: Grade; locale: Locale; lessons: number };

export type LandingData = {
  hero: Record<BandKey, HeroSet>;
  map: MapRow[];
  totals: { skills: number; courses: number };
  courses: CourseLine[];
  /** Monday to Friday, short, per language (computed here so server and browser agree). */
  weekdays: Record<Locale, string[]>;
  rules: { checkSize: number; checkPass: number; secondCheckDays: number };
};

/** The pick's seed first, then distinct answers of the same input kind until the pool is full. */
function seedsFor(band: BandKey): number[] {
  const { skillId, level, seed } = PICKS[band];
  const first = makeItem(skillId, level, seed, "en");
  const key = (it: Item) => answerText(it.answer, it.choices);
  const seen = new Set([key(first)]);
  const seeds = [seed];
  for (let s = 1; seeds.length < POOL && s < 2000; s++) {
    const it = makeItem(skillId, level, s, "en");
    if (it.input !== first.input || seen.has(key(it))) continue;
    seen.add(key(it));
    seeds.push(s);
  }
  return seeds;
}

function heroSet(band: BandKey): HeroSet {
  const { skillId, level } = PICKS[band];
  const skill = SKILLS.find((s) => s.id === skillId)!;
  const seeds = seedsFor(band);
  const items = (locale: Locale) => seeds.map((seed) => makeItem(skillId, level, seed, locale));
  return {
    skillId,
    title: skill.title,
    grade: skill.grade,
    standard: standardAt(skill, level),
    items: { en: items("en"), es: items("es") },
    sources: resourcesFor({ skillId })
      .slice(0, 2)
      .map((r) => ({ id: r.id, title: r.title, source: r.source, url: r.url, urlEs: r.urlEs, about: r.about })),
  };
}

const MAP_GRADES: Grade[] = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function landingData(): LandingData {
  const cell = (subject: Subject, grade: Grade): Cell => {
    const here = SKILLS.filter((s) => s.subject === subject && s.grade === grade);
    return { computed: here.filter((s) => s.content === "computed").length, draft: here.filter((s) => s.content === "draft").length };
  };
  // A fixed Monday (1 January 2024), formatted in UTC, so the names never depend on the clock.
  const weekdays = (locale: Locale) =>
    Array.from({ length: 5 }, (_, i) => {
      const name = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { weekday: "short", timeZone: "UTC" }).format(Date.UTC(2024, 0, 1 + i));
      return name.charAt(0).toUpperCase() + name.slice(1).replace(/\.$/, "");
    });
  return {
    hero: { k2: heroSet("k2"), "35": heroSet("35"), "69": heroSet("69") },
    map: MAP_GRADES.map((grade) => ({ grade, cells: { math: cell("math", grade), english: cell("english", grade), science: cell("science", grade) } })),
    totals: { skills: SKILLS.length, courses: new Set(CATALOGUE.map((c) => c.id.replace(/-es$/, ""))).size },
    courses: CATALOGUE.map((c) => ({ id: c.id, title: c.title, subject: c.subject, grade: c.grade, locale: c.locale, lessons: c.lessons.length })),
    weekdays: { en: weekdays("en"), es: weekdays("es") },
    rules: { checkSize: RULES.checkSize, checkPass: RULES.checkPass, secondCheckDays: Math.round(RULES.secondCheckMs / 86_400_000) },
  };
}
