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
import numbersTo10 from "./math-numbers-to-10";
import numbersTo10Es from "./math-numbers-to-10-es";
import hundredsTensOnes from "./math-hundreds-tens-ones";
import hundredsTensOnesEs from "./math-hundreds-tens-ones-es";
import multiplication from "./math-multiplication";
import multiplicationEs from "./math-multiplication-es";
import multiplyBigger from "./math-multiply-bigger";
import decimals from "./math-decimals";
import ratios from "./math-ratios";
import ratiosEs from "./math-ratios-es";
import proportional from "./math-proportional";
import equations from "./math-equations";
import equationsEs from "./math-equations-es";
import linearFunctions from "./math-linear-functions";
import pythagorean from "./math-pythagorean";
import pythagoreanEs from "./math-pythagorean-es";
import rhymesSyllables from "./english-rhymes-syllables";
import rhymesSyllablesEs from "./english-rhymes-syllables-es";
import shortWords from "./english-short-words";
import partsOfSpeech from "./english-parts-of-speech";
import partsOfSpeechEs from "./english-parts-of-speech-es";
import figurative from "./english-figurative";
import figurativeEs from "./english-figurative-es";
import factOpinion from "./english-fact-opinion";
import paragraph from "./english-paragraph";
import paragraphEs from "./english-paragraph-es";
import contextClues from "./english-context-clues";
import fallacies from "./english-fallacies";
import fallaciesEs from "./english-fallacies-es";
import themePov from "./english-theme-pov";

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
  numbersTo10,
  numbersTo10Es,
  hundredsTensOnes,
  hundredsTensOnesEs,
  multiplication,
  multiplicationEs,
  multiplyBigger,
  decimals,
  ratios,
  ratiosEs,
  proportional,
  equations,
  equationsEs,
  linearFunctions,
  pythagorean,
  pythagoreanEs,
  rhymesSyllables,
  rhymesSyllablesEs,
  shortWords,
  partsOfSpeech,
  partsOfSpeechEs,
  figurative,
  figurativeEs,
  factOpinion,
  paragraph,
  paragraphEs,
  contextClues,
  fallacies,
  fallaciesEs,
  themePov,
];
