import type { Skill } from "../types";
import { CONFUSED_WORDS, NONRESTRICTIVE } from "./grammar-69/g6-asides-spelling";
import { INTENSIVE_PRONOUNS, VAGUE_PRONOUNS } from "./grammar-69/g6-pronouns";
import { CONNOTATION, MULTIPLE_MEANINGS, ROOTS } from "./grammar-69/g6-vocabulary";
import { COMBINING, PHRASES_CLAUSES } from "./grammar-69/g7-clauses";
import { COORDINATE_ADJECTIVES, MODIFIERS } from "./grammar-69/g7-modifiers";
import { ANALOGIES, FORMAL_STYLE, WORDINESS } from "./grammar-69/g7-style";
import { ALLUSION, IRONY_PUNS } from "./grammar-69/g8-figures";
import { ELLIPSIS_DASH, VERB_SHIFT } from "./grammar-69/g8-pauses-shifts";
import { VERB_MOODS, VERBALS } from "./grammar-69/g8-verbs";
import { COUNTERCLAIMS, LOADED_LANGUAGE } from "./grammar-69/g9-argument";
import { AUDIENCE_PURPOSE, DEPENDENT_CLAUSES, TONE } from "./grammar-69/g9-clauses-tone";
import { EVIDENCE_QUALITY, MLA_CITATION } from "./grammar-69/g9-evidence-mla";
import { PARALLEL, SEMICOLON_COLON } from "./grammar-69/g9-sentences";

// Grades 6–9 grammar, usage, vocabulary and rhetoric: pronouns, punctuation for asides and pauses,
// confusable words, roots, connotation, phrases and clauses, modifiers, verbals and moods, parallel
// structure, tone, audience, counterclaims, bias, evidence and MLA citations. The banks live in
// ./grammar-69/ (one file per pair of skills, by grade); ./grammar-69/shared.ts builds the items.

export { GRAMMAR_LEVELS, type Bi, type Entry, type Level, type W } from "./grammar-69/shared";
export { WORKS_CITED_SETS, type Source } from "./grammar-69/g9-evidence-mla";

/** Teaching order inside each grade; prerequisites always come earlier in the skill map. */
export const ENGLISH_GRAMMAR_6_9: Skill[] = [
  INTENSIVE_PRONOUNS,
  VAGUE_PRONOUNS,
  NONRESTRICTIVE,
  CONFUSED_WORDS,
  ROOTS,
  MULTIPLE_MEANINGS,
  CONNOTATION,
  PHRASES_CLAUSES,
  COMBINING,
  MODIFIERS,
  COORDINATE_ADJECTIVES,
  WORDINESS,
  ANALOGIES,
  FORMAL_STYLE,
  VERBALS,
  VERB_MOODS,
  ELLIPSIS_DASH,
  VERB_SHIFT,
  IRONY_PUNS,
  ALLUSION,
  PARALLEL,
  SEMICOLON_COLON,
  DEPENDENT_CLAUSES,
  TONE,
  AUDIENCE_PURPOSE,
  COUNTERCLAIMS,
  LOADED_LANGUAGE,
  EVIDENCE_QUALITY,
  MLA_CITATION,
];
