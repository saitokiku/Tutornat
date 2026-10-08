import { L1_ARGUMENTS } from "./l1-arguments";
import { L1_INFO_PRIMARY } from "./l1-info-primary";
import { L1_PAIRED } from "./l1-paired";
import { L1_POEMS_INFO } from "./l1-poems-info";
import { L1_STORIES } from "./l1-stories";
import { L2_ARGUMENTS } from "./l2-arguments";
import { L2_INFO } from "./l2-info";
import { L2_PAIRED } from "./l2-paired";
import { L2_POEMS_PRIMARY } from "./l2-poems-primary";
import { L2_STORIES } from "./l2-stories";
import type { Passage } from "./types";

// The 45 original passages for grades 6–9 reading (english/reading-69.ts), split into files by level
// and genre so no file grows past a few hundred lines. Order is fixed: a seed indexes into it.

export type { Ask, Genre, Passage, QText, Question, Structure, Tag, Text } from "./types";

export const PASSAGES: Passage[] = [...L1_STORIES, ...L1_POEMS_INFO, ...L1_INFO_PRIMARY, ...L1_ARGUMENTS, ...L1_PAIRED, ...L2_STORIES, ...L2_POEMS_PRIMARY, ...L2_INFO, ...L2_ARGUMENTS, ...L2_PAIRED];
