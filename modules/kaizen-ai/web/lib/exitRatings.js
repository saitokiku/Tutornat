// The exit-rating screen's pure parts: the per-room draft store, the accounting
// that decides what a Save actually sends, and the order concepts are offered
// in. `components/ExitRatings.js` is the screen; this is everything about it
// that can be reasoned about without a browser.
//
// WHY THEY LIVE HERE. node:test cannot parse JSX, so nothing exported from a
// component file can ever be executed by a test — it can only be matched as
// source text, and a regex over a source file cannot tell a working dedupe
// guard from a broken one. These three are exactly the parts that must be run:
//
// - `pendingObservations` is the guard that keeps a second Save from re-posting
//   the first. Evidence rows are append-only by trigger (migration 0034) and
//   `appendEvidence` does not de-duplicate, so a Save that re-sent what the
//   server already accepted would append a second copy of every observation and
//   inflate the one number the business is sold on.
// - `readDraft`/`writeDraft` are the whole of "the draft survives the
//   interruption", including the version guard that drops a draft of an older
//   shape rather than restoring half of somebody's work.
// - `ratingsProgress` is the count the console prints back to the Director.
//
// Pure apart from localStorage, and every access to that is wrapped: it throws
// outright in a locked-down browser or a private window, and a console that
// crashes because it could not remember a draft is worse than one that forgets.

// Namespaced so the console's drafts are greppable in a browser store.
export const DRAFT_NS = 'kaizen.tutorDraft.';
export const DRAFT_VERSION = 1;

export function readDraft(key) {
  try {
    const raw = window.localStorage.getItem(DRAFT_NS + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A draft from an older shape is dropped rather than half-read: restoring
    // half of someone's work is worse than restoring none of it.
    return parsed && parsed.v === DRAFT_VERSION ? parsed : null;
  } catch { return null; }
}

export function writeDraft(key, value) {
  try {
    window.localStorage.setItem(
      DRAFT_NS + key,
      JSON.stringify({ ...value, v: DRAFT_VERSION, at: new Date().toISOString() }),
    );
  } catch { /* a full, disabled or private store is not worth a crash */ }
}

export function dropDraft(key) {
  try { window.localStorage.removeItem(DRAFT_NS + key); } catch { /* as above */ }
}

/** One draft per room, not one global scratchpad. */
export const ratingsKey = (roomId) => `ratings.${roomId}`;

/**
 * What THIS DEVICE has in hand for a room: how many of its ratings the server
 * has already accepted, and how many are still sitting here unsent.
 *
 * Deliberately a local answer, and the only sentence built on it is the one
 * about an unsaved draft — "you left N ratings unsaved on this phone" is a
 * thing a device can know. Whether the ROOM has been rated is a different
 * question with a different source: `ratedStudents` / `rateableStudents` off
 * /api/tutoring/group?tutorView=1, which is true across a second phone and a
 * cleared browser. Answering that one from here is how a Director gets invited
 * to re-rate a room they already rated, and every re-rate appends a second copy
 * of every observation to an append-only ledger.
 */
export function ratingsProgress(roomId) {
  const draft = readDraft(ratingsKey(roomId));
  if (!draft) return { sent: 0, unsent: 0, at: null };
  let sent = 0;
  let unsent = 0;
  for (const [studentId, byKc] of Object.entries(draft.ratings || {})) {
    for (const [kcId, rating] of Object.entries(byKc || {})) {
      if (!rating) continue;
      if (draft.sent?.[studentId]?.[kcId] === rating) sent += 1;
      else unsent += 1;
    }
  }
  return { sent, unsent, at: draft.at || null };
}

/**
 * Does this room still owe its two minutes?
 *
 * Both numbers come from /api/tutoring/group?tutorView=1 and are server truth:
 * `rateableStudents` is how many students a rating can attach to (booked or
 * attended — the same set the brief endpoint builds its roster from), and
 * `ratedStudents` is how many of them have any observation on record.
 *
 * Three things this deliberately is not:
 *
 * - It is not `seats`, which also counts no-shows. A room where everybody
 *   no-showed has seats and nothing to rate, so a callout drawn from seats can
 *   never be cleared: it asks for ratings, and the screen it opens answers
 *   "Nobody to rate yet". A flag you cannot answer is noise, and this one also
 *   pins the room above the room running tonight.
 * - It is not "nothing rated yet". One student rated out of four leaves three
 *   hours of the room unrecorded; the room still owes them.
 * - It is not a draft on a device. A Director who rated on their phone and
 *   opened the console on a laptop was told the room was unrated and invited to
 *   do it again — and evidence is append-only by trigger (0034), so doing it
 *   again is a second copy of every observation, not an overwrite.
 *
 * A payload carrying neither count answers false: no nag, rather than a nag
 * nobody can answer.
 */
export function ratingsOwed(room) {
  const rateable = Number(room?.rateableStudents) || 0;
  const rated = Number(room?.ratedStudents) || 0;
  return rateable > 0 && rated < rateable;
}

/**
 * Everything rated on this device that the server has not already accepted —
 * the list a Save posts, and the reason a second Save cannot repeat a first.
 *
 * Restricted to students actually on the current roster, so a draft left over
 * from a student who has since left the room cannot be counted as work waiting
 * to be saved by a button that has nothing to send.
 *
 * A rating CHANGED after it was accepted is pending again on purpose: an
 * observation cannot be edited, so a correction is a new row.
 */
export function pendingObservations({ students, ratings, sent, notes } = {}) {
  const out = [];
  for (const s of students || []) {
    const studentId = s?.studentId;
    if (!studentId) continue;
    for (const [kcId, rating] of Object.entries(ratings?.[studentId] || {})) {
      if (!rating) continue;
      if (sent?.[studentId]?.[kcId] === rating) continue;
      const note = String(notes?.[studentId]?.[kcId] || '').trim();
      out.push({ studentId, kcId, rating, note: note || null });
    }
  }
  return out;
}

/**
 * Drop the students a per-student map holds that are no longer in the room.
 *
 * Returns the SAME object when there is nothing to drop, so a caller can hand
 * the result straight to setState without writing a new draft on every render.
 */
export function pruneToStudents(map, studentIds) {
  const keep = studentIds instanceof Set ? studentIds : new Set(studentIds || []);
  const source = map || {};
  const stale = Object.keys(source).filter((id) => !keep.has(id));
  if (!stale.length) return source;
  const next = {};
  for (const [id, value] of Object.entries(source)) if (keep.has(id)) next[id] = value;
  return next;
}

/**
 * Fill in what a per-student, per-concept map does not already hold from
 * another one — used to seed this device from what the server says is already
 * on record for the room. Local entries always win: they may be a correction
 * typed here and not yet sent, and the server's copy is the thing being
 * corrected.
 *
 * Returns the SAME object when nothing was missing, for the reason above.
 */
export function fillMissing(map, source) {
  const from = source || {};
  const into = map || {};
  let changed = false;
  const next = {};
  for (const [studentId, byKc] of Object.entries(from)) {
    const mine = into[studentId] || {};
    const merged = { ...mine };
    for (const [kcId, value] of Object.entries(byKc || {})) {
      if (merged[kcId] === undefined && value) { merged[kcId] = value; changed = true; }
    }
    next[studentId] = merged;
  }
  if (!changed) return into;
  return { ...into, ...next };
}

/**
 * Shared centre of gravity first — the concept the room was taught around is
 * the one the tutor just watched four people try — then weakest first, which is
 * the order the brief endpoint already sorts them in.
 *
 * Copies before sorting: the caller's array comes out of the snapshot and is
 * rendered elsewhere.
 */
export function orderConcepts(kcs, sharedIds) {
  const shared = sharedIds instanceof Set ? sharedIds : new Set(sharedIds || []);
  const list = Array.isArray(kcs) ? [...kcs] : [];
  return list.sort((a, b) => {
    const byShared = (shared.has(b?.kcId) ? 1 : 0) - (shared.has(a?.kcId) ? 1 : 0);
    if (byShared) return byShared;
    return (Number(a?.confirmed) || 0) - (Number(b?.confirmed) || 0);
  });
}
