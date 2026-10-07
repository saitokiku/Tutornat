// Original reading passages for grades 3–5 (draft: written for KaizenEDU, not yet reviewed by a teacher).
// Every passage has an English and a Spanish version with the same blocks in the same order, so a
// seed lands on the same passage, question and choice order in both languages. Fiction, poems and
// informational articles; the informational facts were checked against standard references.
//
// Band 1 reads like the Common Core grade 2–3 text band (about 420–820L): shorter sentences, everyday
// words, 120–230 words. Band 2 reads like the grade 4–5 band (about 740–1010L): longer sentences,
// subject words, up to 300 words. A skill's level is the band of the passages it draws from.
//
// Blocks are paragraphs (stanzas in a poem). In an article, a short block with no end punctuation is a
// heading, and a block that opens with a label ("Fast fact:", "Try it:") or lists "term: meaning" lines
// is a box set apart from the body. Dialogue is always inside “ ” so a test can tell narration from speech.

/** [English, Spanish]. */
export type Two = [en: string, es: string];

export type SkillKey = "details" | "sequence" | "character" | "features" | "mainidea" | "theme" | "pov" | "words" | "compare";

/** A wrong choice: the English and Spanish label and the misconception it shows (kebab-case). */
export type Wrong = [en: string, es: string, why: string];

export type Question = {
  skill: SkillKey;
  q: Two;
  right: Two;
  /** Most tempting first: the worked solution explains the first one. */
  wrong: Wrong[];
  /** Hint 1: a nudge that points at the part of the text that matters. */
  clue: Two;
  /** An exact quote from the passage that supports the answer (in Text 1 for a pair). */
  ev: Two;
  /** For a pair of texts: an exact quote from Text 2. */
  ev2?: Two;
  /** Hint 2 written for this question, in place of the skill's general strategy (every text-feature and compare question has one). */
  how?: Two;
};

export type Passage = {
  id: string;
  kind: "fiction" | "info" | "poem";
  band: 1 | 2;
  /** Who tells a story: a character ("first") or a narrator outside it ("third"). Stories only. */
  pov?: "first" | "third";
  /** A narration sentence (outside dialogue) that shows the point of view. Stories only. */
  povEv?: Two;
  /** Also ask "Who is telling this story?" about this story. Set on about half the stories, so that one question type stays a small share of the narrator skill. */
  whoTells?: true;
  title: Two;
  en: string[];
  es: string[];
  qs: Question[];
};

/** Two passages on one topic, read together for the compare skill. */
export type Pair = { a: string; b: string; qs: Question[] };

export const Q = (skill: SkillKey, q: Two, right: Two, wrong: Wrong[], clue: Two, ev: Two, ev2?: Two): Question => ({ skill, q, right, wrong, clue, ev, ...(ev2 ? { ev2 } : {}) });

/** A question with its own hint 2. */
export const how = (question: Question, h: Two): Question => ({ ...question, how: h });
