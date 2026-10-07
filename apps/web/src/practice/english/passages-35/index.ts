import { BAND1_INFO } from "./band1-info";
import { BAND1_POEMS } from "./band1-poems";
import { BAND1_STORIES } from "./band1-stories";
import { BAND2_INFO } from "./band2-info";
import { BAND2_POEMS } from "./band2-poems";
import { BAND2_STORIES } from "./band2-stories";
import type { Passage } from "./types";

export { PAIRS } from "./pairs";
export type { Pair, Passage, Question, SkillKey, Two, Wrong } from "./types";

/** All 45 passages: band 1 stories, articles and poems, then band 2 in the same order. */
export const PASSAGES: Passage[] = [...BAND1_STORIES, ...BAND1_INFO, ...BAND1_POEMS, ...BAND2_STORIES, ...BAND2_INFO, ...BAND2_POEMS];
