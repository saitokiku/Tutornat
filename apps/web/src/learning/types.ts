import type { Subject } from "@/lib/types";

/** Why an answer was given. Only "check" answers can prove a skill. */
export type Mode = "practice" | "review" | "check" | "placement" | "prep" | "tutor";

/** Identity is frozen when work is presented, before an answer or help exists. */
type SourceFacts = {
  profileId: string;
  skillId: string;
  itemFingerprint: string;
  contentVersion: string;
  sessionId?: string;
  grantId?: string;
};
export type AttemptSource = SourceFacts & ({ kind: "set-slot"; setId: string; slotId: string } | { kind: "scene-question"; courseId: string; sceneId: string; questionId: string });
export type EvidenceSource = SourceFacts & ({ sourceKind: "set-slot"; setId: string; slotId: string } | { sourceKind: "scene-question"; courseId: string; sceneId: string; questionId: string });

export type AttemptIdentity = { id: string; profileId: string; source: AttemptSource; openedAt: number };
export type HelpExposure = EvidenceSource & {
  id: string;
  attemptId: string;
  kind: "hint" | "steps" | "tutor" | "explanation" | "demonstration";
  detail?: string;
  capturedAt: number;
  receivedAt?: number;
  /** A committed release stays assisted even if delivery is interrupted. */
  delivery: "latched" | "released";
};
export type ResponseEvent = EvidenceSource & {
  id: string;
  attemptId: string;
  capturedAt: number;
  receivedAt?: number;
  response: string;
  correct: boolean;
  assisted: boolean;
};
export type AssistanceState = { assisted: boolean; exposureIds: string[]; lastHelpAt?: number };
export type AttemptContext = AttemptIdentity & { help: HelpExposure[]; firstResponse?: ResponseEvent; assistance: AssistanceState };
export type EvidenceProvenance = "legacy-local" | "local-recorded" | "server-practice" | "server-check";

/** One answer to one problem: the evidence ledger. Append-only; nothing rewrites it. */
export type Attempt = {
  id: string;
  profileId: string;
  at: number;
  skillId: string;
  level: number;
  seed: number;
  setId?: string;
  mode: Mode;
  correct: boolean;
  /** A hint, the worked steps, the tutor, a retry after a miss, or a correction at the end of a set. */
  assisted: boolean;
  seconds: number;
  /** What the learner answered, for the grown-up's view and the tutor. */
  response?: string;
  /** The misconception the answer shows, when a wrong answer matches a tagged choice or wrong value. */
  why?: string;
  provenance?: EvidenceProvenance;
  attemptId?: string;
  contentVersion?: string;
  itemFingerprint?: string;
  receivedAt?: number;
  grantId?: string;
  slotId?: string;
};

export type SetKind = "daily" | "pick" | "review" | "check" | "placement" | "prep" | "feedback";

export type Slot = {
  skillId: string;
  seed: number;
  role: "main" | "review" | "check" | "placement";
  /** Fixed for review and check slots; main slots get their level when shown (level stepping). */
  level?: number;
};

/** A question written by a model for an open topic. Checked by index; never counts toward proving a skill. */
export type AiQuestion = { prompt: string; choices: string[]; answer: number; hints: string[]; explain: string };

export type PracticeSet = {
  id: string;
  profileId: string;
  createdAt: number;
  kind: SetKind;
  subject: Subject;
  /** The skill the set is about (for prep/feedback sets, the first of several). */
  skillId: string;
  slots: Slot[];
  startedAt?: number;
  finishedAt?: number;
  /** The plan line this set fulfils, e.g. "2026-10-07:daily:math". */
  planKey?: string;
  /** School event a prep set is for. */
  eventId?: string;
  /** Open-topic sets: the topic and its AI-written questions (slot i ↔ question i). */
  topic?: string;
  ai?: AiQuestion[];
};

/**
 * A teaching act: something we did to help, what it intended, and whether that happened.
 * The improvement loop (learning/outcomes.ts) resolves outcomes from later evidence.
 *
 * intents:
 *  next-try-right     hint, steps, similar problem, tutor turn → the next answer on that skill is right
 *  skill-moves        practice set → the skill's level rises or it becomes ready within the next sets
 *  check-decides      check → passed or failed (always resolves)
 *  test-goes-well     prep before a school test → linked skills secure by the test date
 *  lesson-checks-pass lesson → its checks right on the learner's own
 *  plan-line-done     plan line → done that day
 *  parent-acts        nudge to a grown-up → the suggested action happens within 7 days
 *  course-finished    course built or added → all lessons done
 */
export type ActKind = "hint" | "steps" | "similar" | "tutor" | "set" | "check" | "prep" | "lesson" | "plan" | "nudge" | "course";
export type Intent = "next-try-right" | "skill-moves" | "check-decides" | "test-goes-well" | "lesson-checks-pass" | "plan-line-done" | "parent-acts" | "course-finished";

export type TeachingAct = {
  id: string;
  profileId: string;
  at: number;
  kind: ActKind;
  intent: Intent;
  skillId?: string;
  setId?: string;
  /** Lesson id, plan key, nudge key, course id, event id — whatever the act was about. */
  ref?: string;
  /** Extra facts about the act, e.g. hint rung "2" or representation "number-line". */
  detail?: string;
  outcome?: "met" | "missed";
  resolvedAt?: number;
};

/** A reviewer's decision on a skill's questions (both languages, all levels). Approved = no longer "draft". */
export type SkillReview = { id: string; skillId: string; status: "approved" | "flagged"; note?: string; by: string; at: number };
