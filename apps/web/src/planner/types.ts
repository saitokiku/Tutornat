import type { Subject } from "@/lib/types";

// School and calendar records. Dates are local calendar days ("2026-10-21"), not timestamps, so a
// test on Thursday stays on Thursday whatever the time zone or daylight-saving change.

export type EventKind = "test" | "quiz" | "homework" | "project" | "no-school" | "event";

export type SchoolEvent = {
  id: string;
  profileId: string;
  title: string;
  kind: EventKind;
  /** YYYY-MM-DD, local. */
  date: string;
  /** HH:MM, local, when known. */
  time?: string;
  classId?: string;
  notes?: string;
  /** Skills this is about; drives test prep sets. */
  skillIds: string[];
  source: "typed" | "ics" | "paste" | "ai" | "tutor";
  /** Calendar feed UID, so a re-import updates instead of duplicating. */
  uid?: string;
  done?: boolean;
  /** What came with it: pasted text, and a photo or PDF kept in the browser's file store (lib/blobs.ts). */
  attachment?: { text?: string; blobId?: string; name?: string; mediaType?: string };
  createdAt: number;
};

export type SchoolClass = {
  id: string;
  profileId: string;
  name: string;
  subject: Subject;
  teacher?: string;
  color: string;
  /** Calendar feed (Google Classroom, Canvas, Schoology…) to refresh from. */
  feedUrl?: string;
  createdAt: number;
};

/** What a teacher said. Turned into targeted practice; never treated as a grade. */
export type Feedback = { id: string; profileId: string; at: number; classId?: string; text: string; skillIds: string[]; source: "typed" | "ai" };

/** A score from school, entered by a grown-up. Labelled "from school"; never mixed with our evidence. */
export type SchoolResult = { id: string; profileId: string; classId?: string; title: string; date: string; score: number; outOf: number };

/** A plan line marked done on a day. The plan itself is computed, never stored. */
export type PlanDone = { profileId: string; date: string; key: string; at: number };

export type ReadingEntry = { id: string; profileId: string; date: string; title: string; author?: string; minutes: number; resourceId?: string };

export type TranscriptLine = { role: "learner" | "tutor"; text: string; at: number };

/** A tutor conversation, kept so a grown-up can read it. */
export type TutorThread = {
  id: string;
  profileId: string;
  startedAt: number;
  surface: "practice" | "lesson" | "talk" | "homework";
  title: string;
  lines: TranscriptLine[];
  /** Set when the safety screen answered instead of the tutor. */
  flagged?: boolean;
};
