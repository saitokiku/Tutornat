// Reading passages for grades 6–9 comprehension (used by english/reading-69.ts). Every passage is
// original, written for KaizenEDU: stories, poems, informational articles, arguments, imagined
// historical documents (each one says it is imagined) and paired texts on one topic. Each passage has
// an English and a Spanish version with the same paragraphs (stanzas for poems), so "paragraph 3" means
// the same place in both. Questions name the passage quotes that settle them. Draft: not yet reviewed
// by a teacher. Facts in the informational and historical passages were checked when written; see the
// strand's report for anything left out because it could not be confirmed.

export type Structure = "chronological" | "compare-contrast" | "cause-effect" | "problem-solution";

/** What a question asks. The part before the dot is the skill it practises. */
export type Ask =
  | "central.idea"
  | "central.summary"
  | "infer.what"
  | "infer.support"
  | "words.figurative"
  | "words.connotation"
  | "words.tone"
  | "structure.section"
  | "theme.statement"
  | "theme.develop"
  | "pov.view"
  | "pov.purpose"
  | "pov.response"
  | "pov.reveal"
  | "argument.claim"
  | "argument.evidence"
  | "argument.reasoning"
  | "compare.differ"
  | "compare.agree"
  | "compare.approach";

/** The misconception a wrong choice shows (rule 16). */
export type Tag =
  | "not-in-text"
  | "contradicts-text"
  | "too-narrow"
  | "too-broad"
  | "adds-opinion"
  | "misses-key-point"
  | "overgeneralizes"
  | "wrong-character"
  | "off-point-evidence"
  | "too-literal"
  | "ignores-connotation"
  | "opposite-tone"
  | "topic-not-tone"
  | "wrong-context-meaning"
  | "misread-as-chronological"
  | "misread-as-compare-contrast"
  | "misread-as-cause-effect"
  | "misread-as-problem-solution"
  | "wrong-section-role"
  | "topic-not-theme"
  | "plot-not-theme"
  | "misses-the-change"
  | "confuses-speaker-author"
  | "misses-author-stance"
  | "overstates-view"
  | "wrong-purpose"
  | "evidence-not-claim"
  | "counterclaim-not-claim"
  | "anecdote-as-proof"
  | "opinion-as-evidence"
  | "misjudges-relevance"
  | "not-a-flaw"
  | "swaps-texts"
  | "one-text-only"
  | "same-not-different";

/** One text: a title and its paragraphs (for a poem, stanzas with lines split by "\n"). */
export type Text = { title: string; paras: string[] };

/**
 * A question in one language: what is asked, the key, the wrong choices (in the order of `tags`), the
 * passage quotes that settle it, and why the key is right.
 */
export type QText = [ask: string, right: string, wrong: string[], evidence: string[], explain: string];

export type Question = { ask: Ask; tags: Tag[]; en: QText; es: QText };

export type Genre = "story" | "poem" | "informational" | "argument" | "primary" | "paired";

export type Passage = {
  id: string;
  /** 1: grades 6–7 complexity; 2: grades 8–9 (longer sentences, more implied meaning). */
  level: 1 | 2;
  genre: Genre;
  /** Shown under the title of an imagined document, so no one mistakes it for a real one. */
  note?: { en: string; es: string };
  /** Informational passages with one clear overall structure get a "How is it organized?" question. */
  structure?: { kind: Structure; en: [signals: string[], explain: string]; es: [signals: string[], explain: string] };
  en: Text[];
  es: Text[];
  qs: Question[];
};

/** Builds a question; the tags name the wrong choices in order. */
export const q = (ask: Ask, tags: Tag[], en: QText, es: QText): Question => ({ ask, tags, en, es });
