import type { Subject } from "@/lib/types";

/** Why an answer was given. Only "check" answers can prove a skill. */
export type Mode = "practice" | "review" | "check" | "placement" | "prep" | "tutor";

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
};

export type SetKind = "daily" | "pick" | "review" | "check" | "placement" | "prep" | "feedback";

export type Slot = {
  skillId: string;
  seed: number;
  role: "main" | "review" | "check" | "placement";
  /** Fixed for review and check slots; main slots get their level when shown (level stepping). */
  level?: number;
};

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
};
