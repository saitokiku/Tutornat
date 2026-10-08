import type { Grade, Locale, Subject } from "@/lib/types";
import { REGISTRY } from "./registry";
import type { CatalogueEntry } from "./types";

export type { CatalogueEntry };
export type Band = "k2" | "35" | "68" | "9" | "adult";

const N = (g: Grade) => (g === "K" ? 0 : g === "adult" ? 10 : Number(g));
const SUBJECT_ORDER = ["math", "science", "english", "other"];
/** Every ready-made course, by grade then subject. */
export const CATALOGUE: CatalogueEntry[] = [...REGISTRY].sort((a, b) => N(a.grade) - N(b.grade) || SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject));

export function bandOf(grade: Grade): Band {
  if (grade === "adult") return "adult";
  const n = grade === "K" ? 0 : Number(grade);
  return n <= 2 ? "k2" : n <= 5 ? "35" : n <= 8 ? "68" : "9";
}

/**
 * Entries for a learner: their band first, their language preferred when both exist. Inside the band the
 * subjects take turns, each starting from its course nearest the learner's grade, so the first picks
 * (the home page suggests the first one) are one of each subject and at the learner's own grade when
 * one is written, not every grade-6 math course before any science.
 */
export function catalogueFor(grade: Grade, locale: Locale): CatalogueEntry[] {
  const band = bandOf(grade);
  const sameLang = CATALOGUE.filter((c) => c.locale === locale);
  const otherLang = CATALOGUE.filter((c) => c.locale !== locale && !sameLang.some((s) => sameTopic(s, c)));
  const away = (c: CatalogueEntry) => Math.abs(N(c.grade) - N(grade));
  const turns = (list: CatalogueEntry[]) => {
    const bySubject = SUBJECT_ORDER.map((s) => list.filter((c) => c.subject === s && bandOf(c.grade) === band).sort((a, b) => away(a) - away(b)));
    const rounds = Array.from({ length: Math.max(...bySubject.map((l) => l.length)) }, (_, k) => bySubject.flatMap((l) => l[k] ?? []));
    return rounds.flatMap((round) => round.sort((a, b) => away(a) - away(b)));
  };
  const rest = [...sameLang, ...otherLang].filter((c) => bandOf(c.grade) !== band);
  return [...turns(sameLang), ...turns(otherLang), ...rest];
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

/** A ready-made course that already covers what was asked for, if one does (word match on title/summary). */
export function matchEntry(goal: string, grade: Grade, locale: Locale): CatalogueEntry | null {
  const words = goal.toLowerCase().match(/[a-záéíóúñü]{4,}/g) ?? [];
  if (!words.length) return null;
  const stem = (w: string) => w.replace(/(es|s)$/, "");
  const hits = catalogueFor(grade, locale)
    .map((c) => {
      const text = `${c.title} ${c.summary}`.toLowerCase();
      return { c, score: words.filter((w) => text.includes(stem(w))).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return hits[0]?.c ?? null;
}
