import type { CatalogueEntry } from "./types";
// Registry of ready-made courses. One import and one entry per line, so parallel branches merge.
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
import motion from "./science-motion";

// Ordered by grade, then subject (math, science, English) where it matters; the index sorts for display.
export const REGISTRY: CatalogueEntry[] = [
  argument,
  mainIdea,
  rhetoric,
  storyOrder,
  addNumberLine,
  fractions,
  fractionsEs,
  negative,
  slope,
  changes,
  matter,
  moon,
  motion,
];
