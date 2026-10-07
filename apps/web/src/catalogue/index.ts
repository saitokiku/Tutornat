import type { Grade, Locale, Subject } from "@/lib/types";
import argument from "./english-argument";
import mainIdea from "./english-main-idea";
import rhetoric from "./english-rhetoric";
import storyOrder from "./english-story-order";
import addNumberLine from "./math-add-number-line";
import fractions from "./math-fractions";
import fractionsEs from "./math-fractions-es";
import negative from "./math-negative";
import slope from "./math-slope";
import changes from "./science-changes";
import matter from "./science-matter";
import moon from "./science-moon";
import type { CatalogueEntry } from "./types";

export type { CatalogueEntry };
export type Band = "k2" | "35" | "68" | "9" | "adult";

// Ordered by grade, then subject (math, science, English).
export const CATALOGUE: CatalogueEntry[] = [
  storyOrder, addNumberLine, matter,
  fractions, fractionsEs, moon, mainIdea,
  negative, changes, argument,
  slope, rhetoric,
];

export function bandOf(grade: Grade): Band {
  if (grade === "adult") return "adult";
  const n = grade === "K" ? 0 : Number(grade);
  return n <= 2 ? "k2" : n <= 5 ? "35" : n <= 8 ? "68" : "9";
}

/** Entries for a learner: their band first, their language preferred when both exist. */
export function catalogueFor(grade: Grade, locale: Locale): CatalogueEntry[] {
  const band = bandOf(grade);
  const sameLang = CATALOGUE.filter((c) => c.locale === locale);
  const otherLang = CATALOGUE.filter((c) => c.locale !== locale && !sameLang.some((s) => sameTopic(s, c)));
  const pool = [...sameLang, ...otherLang];
  const rank = (c: CatalogueEntry) => (bandOf(c.grade) === band ? 0 : 1);
  return pool.sort((a, b) => rank(a) - rank(b));
}

// Translations share an id prefix: "math-fractions" and "math-fractions-es".
const sameTopic = (a: CatalogueEntry, b: CatalogueEntry) => a.id.replace(/-es$/, "") === b.id.replace(/-es$/, "");

export const catalogueEntry = (id: string) => CATALOGUE.find((c) => c.id === id) ?? null;

/** The ready-made course closest to a learner's request: same subject, nearest grade, their language. */
export function relatedEntry(subject: Subject, grade: Grade, locale: Locale): CatalogueEntry | null {
  const n = (g: Grade) => (g === "K" ? 0 : g === "adult" ? 10 : Number(g));
  const pool = catalogueFor(grade, locale).filter((c) => subject === "other" || c.subject === subject);
  return [...pool].sort((a, b) => Math.abs(n(a.grade) - n(grade)) - Math.abs(n(b.grade) - n(grade)))[0] ?? null;
}
