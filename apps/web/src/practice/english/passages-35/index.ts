import { BAND1_INFO } from "./band1-info";
import { BAND1_INFO_2 } from "./band1-info-2";
import { BAND1_POEMS } from "./band1-poems";
import { BAND1_POEMS_2 } from "./band1-poems-2";
import { BAND1_STORIES } from "./band1-stories";
import { BAND1_STORIES_2 } from "./band1-stories-2";
import { BAND2_INFO } from "./band2-info";
import { BAND2_POEMS } from "./band2-poems";
import { BAND2_STORIES } from "./band2-stories";
import { PAIRS as FIRST_PAIRS } from "./pairs";
import { PAIRS_2 } from "./pairs-2";
import type { Pair, Passage } from "./types";

export type { Pair, Passage, Question, SkillKey, Two, Wrong } from "./types";

/** Every passage: band 1 stories, articles and poems, then band 2 in the same order. */
export const PASSAGES: Passage[] = [...BAND1_STORIES, ...BAND1_STORIES_2, ...BAND1_INFO, ...BAND1_INFO_2, ...BAND1_POEMS, ...BAND1_POEMS_2, ...BAND2_STORIES, ...BAND2_INFO, ...BAND2_POEMS];

/** Every pair of an article with a poem or story on its topic. */
export const PAIRS: Pair[] = [...FIRST_PAIRS, ...PAIRS_2];
