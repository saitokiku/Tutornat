import type { Key } from "@/i18n/en";
import type { Failure, SourceStep } from "@/lib/source-course";

/** One line of the build log: what happened, in words, and whether it found something. */
export type StepLine = { key: Key; vars?: Record<string, string | number>; tone: "found" | "none" | "failed" };

const failed = (f: Failure, source: string): StepLine => ({ key: f === "offline" ? "crs.step.offline" : "crs.step.down", vars: { source }, tone: "failed" });

/** Says what each part of a source build found, including what it didn't find and why. */
export function sourceLine(s: SourceStep, topic: string): StepLine {
  switch (s.part) {
    case "article":
      if (s.title) return { key: "crs.step.article", vars: { title: s.title }, tone: "found" };
      return s.failed ? failed(s.failed, "Wikipedia") : { key: "crs.step.noArticle", vars: { topic }, tone: "none" };
    case "terms":
      if (s.englishOnly) return { key: "crs.step.termsEs", tone: "none" };
      if (s.count) return { key: "crs.step.terms", vars: { n: s.count }, tone: "found" };
      return s.failed ? failed(s.failed, "Datamuse") : { key: "crs.step.noTerms", tone: "none" };
    case "lesson":
      return s.title ? { key: "crs.step.lesson", vars: { title: s.title }, tone: "found" } : { key: "crs.step.noLesson", tone: "none" };
    case "practice":
      if (!s.skill) return { key: "crs.step.noPractice", tone: "none" };
      return { key: s.questions ? "crs.step.practice" : "crs.step.practiceLink", vars: { skill: s.skill }, tone: "found" };
    case "books":
      if (s.count) return { key: "crs.step.books", vars: { n: s.count }, tone: "found" };
      return s.failed ? failed(s.failed, "Open Library") : { key: "crs.step.noBooks", tone: "none" };
  }
}
