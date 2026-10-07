import { gradeLabel } from "@/i18n";
import type { Key } from "@/i18n/en";
import type { Failure, SourceStep } from "@/lib/source-course";
import type { Locale } from "@/lib/types";

/** One line of the build log: what happened, in words, and whether it found something. */
export type StepLine = { key: Key; vars?: Record<string, string | number>; tone: "found" | "none" | "failed" };

const failed = (f: Failure, source: string): StepLine => ({ key: f === "offline" ? "crs.step.offline" : "crs.step.down", vars: { source }, tone: "failed" });
const list = (locale: Locale, items: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
const quoted = (locale: Locale, titles: string[]) => list(locale, titles.map((x) => `“${x}”`));

/** Says what each part of a source build found, including what it didn't find and why, in the reader's language. */
export function sourceLine(s: SourceStep, topic: string, locale: Locale): StepLine {
  switch (s.part) {
    case "article":
      if (s.title && s.withheld) return { key: "crs.step.articleWithheld", vars: { title: s.title }, tone: "none" };
      if (s.title) return { key: "crs.step.article", vars: { title: s.title }, tone: "found" };
      return s.failed ? failed(s.failed, "Wikipedia") : { key: "crs.step.noArticle", vars: { topic }, tone: "none" };
    case "terms":
      if (s.englishOnly) return { key: "crs.step.termsEs", tone: "none" };
      if (s.count) return { key: "crs.step.terms", vars: { n: s.count }, tone: "found" };
      return s.failed ? failed(s.failed, "Datamuse") : { key: "crs.step.noTerms", tone: "none" };
    case "lesson":
      if (!s.titles.length) return { key: "crs.step.noLesson", tone: "none" };
      if (s.leftOut) return { key: "crs.step.lessonLeftOut", vars: { titles: quoted(locale, s.titles.slice(0, 1)) }, tone: "none" };
      return { key: "crs.step.lesson", vars: { titles: quoted(locale, s.titles), n: s.titles.length }, tone: "found" };
    case "practice":
      if (!s.skills.length) return { key: "crs.step.noPractice", tone: "none" };
      if (s.grade) return { key: "crs.step.practiceAbove", vars: { skills: s.skills[0], grade: gradeLabel(locale, s.grade) }, tone: "none" };
      return { key: s.questions ? "crs.step.practice" : "crs.step.practiceLink", vars: { skills: list(locale, s.skills) }, tone: "found" };
    case "books":
      if (s.count) return { key: "crs.step.books", vars: { n: s.count }, tone: "found" };
      return s.failed ? failed(s.failed, "Open Library") : { key: "crs.step.noBooks", tone: "none" };
  }
}
