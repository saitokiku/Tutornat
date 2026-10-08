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

/** Entries for a learner: their band first, their language preferred when both exist. */
export function catalogueFor(grade: Grade, locale: Locale): CatalogueEntry[] {
  const band = bandOf(grade);
  const sameLang = CATALOGUE.filter((c) => c.locale === locale);
  const otherLang = CATALOGUE.filter((c) => c.locale !== locale && !sameLang.some((s) => sameTopic(s, c)));
  const pool = [...sameLang, ...otherLang];
  const rank = (c: CatalogueEntry) => (bandOf(c.grade) === band ? 0 : 1);
  const sorted = pool.sort((a, b) => rank(a) - rank(b));
  const inBand = sorted.filter((c) => rank(c) === 0);
  // The learner's own language first, then the other; each takes turns by subject.
  return [...takeTurns(inBand.filter((c) => c.locale === locale), grade), ...takeTurns(inBand.filter((c) => c.locale !== locale), grade), ...sorted.filter((c) => rank(c) === 1)];
}

/**
 * The learner's band, nearest grade first, taking turns by subject: each round offers every subject's
 * nearest remaining course once (their own grade first, then a step up before a step back), so a
 * learner is never offered three math courses in a row. Order within a subject is kept.
 */
function takeTurns(list: CatalogueEntry[], grade: Grade): CatalogueEntry[] {
  const dist = (c: CatalogueEntry) => Math.abs(N(c.grade) - N(grade)) * 2 + (N(c.grade) < N(grade) ? 1 : 0);
  const groups = new Map<string, CatalogueEntry[]>();
  for (const c of [...list].sort((a, b) => dist(a) - dist(b))) groups.set(c.subject, [...(groups.get(c.subject) ?? []), c]);
  const out: CatalogueEntry[] = [];
  while ([...groups.values()].some((g) => g.length)) {
    const heads = [...groups.entries()].filter(([, g]) => g.length).map(([s, g]) => [s, g[0]] as const);
    heads.sort(([sa, a], [sb, b]) => dist(a) - dist(b) || SUBJECT_ORDER.indexOf(sa) - SUBJECT_ORDER.indexOf(sb));
    for (const [s] of heads) out.push(groups.get(s)!.shift()!);
  }
  return out;
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
