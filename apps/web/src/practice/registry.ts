import type { Skill } from "./types";
// Registry of practice strands. One import and one entry per line, so parallel branches merge.
// Order inside a subject is teaching order; strands of one subject are listed in grade order.
import { ENGLISH_K_4 } from "./english/early";
import { ENGLISH_5_9 } from "./english/upper";
import { EARLY_MATH } from "./math/early";
import { MATH_3_5 } from "./math/g3to5";
import { MATH_6_7 } from "./math/g6to7";
import { MATH_8_9 } from "./math/g8to9";
import { SCIENCE_K_5 } from "./science/early";
import { SCIENCE_6_9 } from "./science/upper";
import { MATH_K_2_MORE } from "./math/k2-more";
import { MATH_3_5_MORE } from "./math/g3to5-more";
import { MATH_6_7_MORE } from "./math/g6to7-more";
import { MATH_8_9_MORE } from "./math/g8to9-more";
import { ENGLISH_GRAMMAR_3_5 } from "./english/grammar-35";
import { ENGLISH_READING_3_5 } from "./english/reading-35";
import { ENGLISH_GRAMMAR_6_9 } from "./english/grammar-69";
import { ENGLISH_READING_6_9 } from "./english/reading-69";
import { SCIENCE_K_5_MORE } from "./science/k5-more";
import { SCIENCE_6_9_MORE } from "./science/upper-more";

export const STRANDS: Skill[][] = [
  ENGLISH_K_4,
  ENGLISH_5_9,
  EARLY_MATH,
  MATH_3_5,
  MATH_6_7,
  MATH_8_9,
  SCIENCE_K_5,
  SCIENCE_6_9,
  MATH_K_2_MORE,
  MATH_3_5_MORE,
  MATH_6_7_MORE,
  MATH_8_9_MORE,
  ENGLISH_GRAMMAR_3_5,
  ENGLISH_READING_3_5,
  ENGLISH_GRAMMAR_6_9,
  ENGLISH_READING_6_9,
  SCIENCE_K_5_MORE,
  SCIENCE_6_9_MORE,
];
