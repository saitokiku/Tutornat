/**
 * Subjects for topic sessions (D35). The fractions graph (`graph.ts`) is the
 * only sequence with a diagnostic, bank items and prerequisites; a learner who
 * brings any other subject still needs checks, a mastery row and a WRAP that
 * names what they worked on. Each subject is therefore also a synthetic skill
 * with the id `S-<subject>`, no prerequisites and no bank, so every existing
 * path that keys on a skill id keeps working. Estimates on these rows are
 * coarse by design: "checks answered unaided in science", not a claim about a
 * named skill, and the progress screen words them that way.
 */
import type { SkillNode, SubjectId } from '@/lib/tutor/contracts';

export interface Subject {
  id: SubjectId;
  /** What the picker shows. */
  label: string;
  /** How the tutor names it in speech. */
  spoken: string;
  /** One example a learner might type, shown as a placeholder. */
  example: string;
}

export const SUBJECTS: readonly Subject[] = [
  { id: 'math', label: 'Math', spoken: 'math', example: 'Long division with remainders' },
  {
    id: 'reading',
    label: 'Reading',
    spoken: 'reading',
    example: 'Chapter 3 of the book I am reading',
  },
  { id: 'writing', label: 'Writing', spoken: 'writing', example: 'A paragraph about my weekend' },
  { id: 'science', label: 'Science', spoken: 'science', example: 'Why the moon has phases' },
  {
    id: 'social-studies',
    label: 'History and social studies',
    spoken: 'history',
    example: 'Causes of the American Revolution',
  },
  { id: 'language', label: 'Languages', spoken: 'a language', example: 'Spanish past tense' },
  { id: 'test-prep', label: 'Test prep', spoken: 'test prep', example: 'SAT reading practice' },
  { id: 'computing', label: 'Computing', spoken: 'computing', example: 'What a for loop does' },
  {
    id: 'other',
    label: 'Something else',
    spoken: 'this',
    example: 'Anything you are curious about',
  },
] as const;

export const SUBJECT_SLICE = 'subjects';
const SUBJECT_PREFIX = 'S-';
const BY_ID = new Map(SUBJECTS.map((subject) => [subject.id, subject]));

export function isSubjectId(value: unknown): value is SubjectId {
  return typeof value === 'string' && BY_ID.has(value as SubjectId);
}

export function subjectById(id: SubjectId): Subject {
  return BY_ID.get(id)!;
}

/** `math` → `S-math`. */
export function subjectSkillId(subject: SubjectId): string {
  return `${SUBJECT_PREFIX}${subject}`;
}

/** `S-math` → `math`; null for any other string. */
export function subjectOfSkillId(skillId: unknown): SubjectId | null {
  if (typeof skillId !== 'string' || !skillId.startsWith(SUBJECT_PREFIX)) return null;
  const subject = skillId.slice(SUBJECT_PREFIX.length);
  return isSubjectId(subject) ? subject : null;
}

export function isSubjectSkillId(value: unknown): value is string {
  return subjectOfSkillId(value) !== null;
}

/** The synthetic skill node for a subject: no prerequisites, no tags, its own slice. */
export function subjectSkillNode(subject: SubjectId): SkillNode {
  return {
    id: subjectSkillId(subject),
    name: subjectById(subject).label,
    prereqs: [],
    tags: [],
    slice: SUBJECT_SLICE,
  };
}

/**
 * Misconception tags a tutor-authored item may carry in any subject. The
 * fractions tags stay in the graph; these name the shape of a mistake rather
 * than a fractions-specific belief, so a re-teach move still has something
 * to go on outside the launch slice.
 */
export const GENERIC_MISCONCEPTION_TAGS: readonly string[] = [
  'misread',
  'vocabulary',
  'procedure',
  'concept',
  'sign_error',
  'guess',
];

export const GENERIC_RETEACH: Readonly<Record<string, string>> = {
  misread:
    'misread the question or a detail in it; have them read it back and name what is being asked before any work',
  vocabulary:
    'a term they do not know; define it with one concrete example, then return to the question',
  procedure:
    'knows the idea but slipped in the steps; walk one step at a time and have them do the next one',
  concept: 'the underlying idea is missing; go back to a concrete example before any procedure',
  sign_error:
    'a sign or direction error; check the sign or the direction first, then the arithmetic',
  guess: 'answered without working; ask for the first step and wait',
};
