// What kind of room this is — the most load-bearing noun in the business, and
// until Wave 2 the system had no primitive for it.
//
// The kind→label→colour map was retyped in EIGHT places with THREE different
// labels for the same room ("Community Hall", "Community Hall · Free",
// "Free · Community Hall"), and TutorClasses had no entry for `standing_seat`
// at all, so it fell through to the clinic default and badged every $550 seat
// room "Clinic" in the console where the Director runs it
// (docs/superpowers/specs/2026-09-02-wave2-audit.md).
//
// One map, one place. The hue codes the kind and only its darkness changes —
// the k-badge doctrine — and the label is never the only carrier of meaning,
// because the kind also decides what the row beneath it is allowed to say.

// The vocabulary, in the order the ladder climbs: free, supervised, taught,
// reserved. `label` is what a parent reads; `short` is for a dense console row.
export const ROOM_KINDS = {
  community_free: { label: 'Community Hall', short: 'Community', tone: 'muted', taught: false },
  homework_hall: { label: 'Homework Hall', short: 'Hall', tone: 'good', taught: false },
  clinic: { label: 'Subject Clinic', short: 'Clinic', tone: 'accent', taught: true },
  standing_seat: { label: 'Standing Seat', short: 'Seat', tone: 'accent', taught: true },
};

/** The label a surface should print for a room kind. Never a bare key. */
export function kindLabel(kind, { short = false } = {}) {
  const k = ROOM_KINDS[kind];
  if (!k) return 'Session';
  return short ? k.short : k.label;
}

/**
 * Is this kind TUTORING, or is it supervision?
 *
 * Review-queue item 20: every payment rail pays for academic tutoring, the
 * Homework Hall is supervised study, and no surface may blur them. Having the
 * answer in the same module as the label is what stops a future row from
 * calling a Hall a lesson.
 */
export function isTaught(kind) {
  return ROOM_KINDS[kind]?.taught === true;
}
