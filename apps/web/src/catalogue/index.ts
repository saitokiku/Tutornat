import type { Grade, Locale } from "@/lib/types";
import fractions from "./math-fractions";
import type { CatalogueEntry } from "./types";

export type { CatalogueEntry };
export type Band = "k2" | "35" | "68" | "9" | "adult";

export const CATALOGUE: CatalogueEntry[] = [fractions];

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
