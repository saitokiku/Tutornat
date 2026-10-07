/**
 * Engine constants extracted from KaizenEdu `kaizen.config.ts` (pinned commit
 * 20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe, blob 3b6f…; see
 * tests/engine/closure-manifest.json). Only the fields the imported closure
 * reads are carried: band session lengths and the student-model v0 numbers.
 * Cost, attention, plan, staff and model routing are excluded on purpose.
 */

export type AgeBand = '4-8' | '9-12' | '13-17' | 'adult';

export interface BandDefaults {
  /** Default session length in minutes (spec §5.2 WRAP). */
  sessionMinutes: number;
  /** Silence the microphone waits through before the turn is over; kept for session/service parity. */
  thinkingPauseMs: number;
}

export const BANDS: Readonly<Record<AgeBand, BandDefaults>> = {
  '4-8': { sessionMinutes: 10, thinkingPauseMs: 1_500 },
  '9-12': { sessionMinutes: 15, thinkingPauseMs: 1_200 },
  '13-17': { sessionMinutes: 25, thinkingPauseMs: 900 },
  adult: { sessionMinutes: 25, thinkingPauseMs: 900 },
};

/** Spec §5.7 student model v0 (practice estimate parameters). */
export const STUDENT_MODEL = {
  emaAlpha: 0.3,
  masteredEstimate: 0.8,
  masteredMinItems: 4,
  masteredMinSessions: 2,
  misconceptionResolveStreak: 3,
  checkEveryMs: 10 * 60_000,
} as const;
