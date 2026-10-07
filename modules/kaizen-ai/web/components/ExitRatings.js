'use client';

// EXIT RATINGS — where an hour in a room becomes a record.
//
// POST /api/tutoring/group/brief is the only code path in the product that
// turns a room into evidence: it writes group_observation rows AND confirming
// evidence with verified_by='human_tutor', assisted=false, plus the 48-hour
// check floor that stops that evening's practice from erasing the delay. It was
// finished, correct and tested, and it had no caller anywhere — the Director's
// whole job is "write the exit ratings in under two minutes" and there was no
// screen to do it on (docs/superpowers/specs/2026-09-02-wave2-audit.md).
//
// This is that screen. Five decisions carry it:
//
// 1. IT IS USED ON A PHONE, IN A ROOM, AT 8:40 PM, BY A TIRED PERSON. So it is
//    built at 375px first: one student open at a time, one tap a concept over
//    three full-width targets, nothing that needs a pointer and nothing that
//    needs a second hand. Density is not the goal; finishing is.
//
// 2. THE DRAFT SURVIVES THE INTERRUPTION. Being interrupted mid-room is the
//    normal case, not the edge one. Everything typed here is written to
//    localStorage under the room it belongs to and restored on the way back,
//    so a director who is pulled away by a student loses nothing. The old exit
//    form kept four fields in useState alone, and opening a second student's
//    form destroyed the first's.
//
// 3. THE SCREEN SAYS WHAT THE RATING DOES. A rating is not a form field: it is
//    the strongest single signal this system takes, and it books the delayed
//    unaided check that is the only thing able to confirm a concept. A director
//    who thinks they are filling in a form will skip it. One who knows it is
//    the product will not.
//
// 4. IT NEVER SENDS THE SAME OBSERVATION TWICE. Evidence rows are append-only
//    by trigger (migration 0034) and appendEvidence does not de-duplicate, so a
//    second Save that re-posted everything would inflate the ledger the whole
//    business is sold on. The screen seeds itself from what the SERVER says is
//    already on record for this room, not only from this device's draft — one
//    Director with a phone and a laptop was otherwise all it took — and sends
//    only what neither knows about. Changing a rating re-arms it, because a
//    correction is a new row.
//
// 5. IT NEVER NEEDS THE AI TO WORK. It asks the brief endpoint for the roster
//    ALONE (`snapshot=1`), which answers before the entitlement check, the rate
//    limit and the model call. Rating a room is the write the business depends
//    on; it must not stop working because a paragraph could not be afforded.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import { TUTOR_RATINGS } from '@/lib/engine/types';
import { roomDateTime } from '@/lib/roomTime';
import {
  ratingsKey, readDraft, writeDraft, dropDraft,
  pendingObservations, pruneToStudents, fillMissing, orderConcepts,
} from '@/lib/exitRatings';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import EmptyState from '@/components/ui/EmptyState';
import { IconCheck } from '@/components/Icons';

// ── The vocabulary ───────────────────────────────────────────────────────────
// The ids come from TUTOR_RATINGS in lib/engine/types.js, which has a CHECK
// constraint standing behind it. Retyping them here is how a fourth rating gets
// added to the engine and silently stays untappable in the room; this map only
// dresses whatever the engine says exists.
const RATING_LOOK = {
  got_it: { label: 'Got it', hint: 'unaided', cls: 'border-good/40 bg-good/10 text-good' },
  shaky: { label: 'Shaky', hint: 'needed a nudge', cls: 'border-warn/40 bg-warn/10 text-warn' },
  not_yet: { label: 'Not yet', hint: 'not there', cls: 'border-bad/40 bg-bad/10 text-bad' },
};
const RATINGS = TUTOR_RATINGS.map((id) => ({ id, ...(RATING_LOOK[id] || { label: id, hint: '', cls: 'border-border bg-panel2 text-ink' }) }));

// The route slices `observations` to 40 per request and says nothing about the
// rest. A Homework Hall of eight with eight concepts each would silently lose
// half, so the client batches to the same number rather than trusting a limit
// it cannot see.
const MAX_PER_POST = 40;

// How many concepts a student shows before "show the rest". Three is what a
// 75-minute room actually covers, and the fourth tap is where a director on a
// phone starts scrolling instead of finishing.
const CONCEPTS_SHOWN = 3;

export default function ExitRatings({ room, onSaved }) {
  const roomId = room?.id;
  const draftKey = ratingsKey(roomId);

  const [snapshot, setSnapshot] = useState({ loading: true });
  const [ratings, setRatings] = useState({});   // studentId -> kcId -> rating
  const [notes, setNotes] = useState({});       // studentId -> kcId -> string
  const [sent, setSent] = useState({});         // what is already on record, from here or anywhere
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(null);       // the one student showing their concepts
  const [showAll, setShowAll] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Restore after mount, never during render: the server and the first client
  // render have to agree, and localStorage exists on only one of them.
  useEffect(() => {
    const draft = readDraft(draftKey);
    if (draft) {
      setRatings(draft.ratings || {});
      setNotes(draft.notes || {});
      setSent(draft.sent || {});
    }
    setHydrated(true);
  }, [draftKey]);

  // Keep it written. Guarded on `hydrated` so the empty first render cannot
  // overwrite the draft it is about to restore.
  useEffect(() => {
    if (!hydrated) return;
    const worthKeeping = Object.keys(ratings).length > 0 || Object.keys(sent).length > 0;
    if (worthKeeping) writeDraft(draftKey, { ratings, notes, sent });
    else dropDraft(draftKey);
  }, [hydrated, ratings, notes, sent, draftKey]);

  // `snapshot=1`: the roster and what is already recorded, with no AI in the
  // path. See decision 5 at the top of this file.
  const load = useCallback(async () => {
    if (!roomId) { setSnapshot({ loading: false, failed: 'No room to rate.' }); return; }
    setSnapshot({ loading: true });
    try {
      const r = await authedFetch(`/api/tutoring/group/brief?sessionId=${encodeURIComponent(roomId)}&snapshot=1`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setSnapshot({ loading: false, failed: d.error || 'Could not read this room.', status: r.status });
        return;
      }
      setSnapshot({ loading: false, ...d, students: d.students || [], shared: d.shared || [] });
    } catch {
      setSnapshot({ loading: false, failed: 'Could not reach the server. Check your connection and try again.' });
    }
  }, [roomId]);
  useEffect(() => { load(); }, [load]);

  // Memoised because `pending` is derived from it: a fresh [] every render
  // would recompute the post list on every keystroke in a note field. Deduped
  // because the roster is built from seats, and one student holding two seats
  // in the same room would otherwise collide on a React key.
  const students = useMemo(() => {
    const seen = new Set();
    return (snapshot.students || []).filter((s) => (seen.has(s.studentId) ? false : seen.add(s.studentId)));
  }, [snapshot.students]);
  const sharedIds = useMemo(
    () => new Set((snapshot.shared || []).map((s) => s.kcId)),
    [snapshot.shared],
  );

  // Reconcile the device with the room, once both are known.
  //
  // PRUNE, because a roster changes: a seat cancelled after the draft was
  // written left a rating for somebody who is not in the room, which nothing
  // could ever save and which the console counted as work still waiting.
  //
  // SEED, because the record is not this device's to know: whatever the server
  // already holds for this room is marked as sent here, so the same Director on
  // a second phone sees what was rated instead of being invited to rate it all
  // again into an append-only ledger.
  const recorded = snapshot.recorded;
  useEffect(() => {
    if (!hydrated || !students.length) return;
    const ids = new Set(students.map((s) => s.studentId));
    const onRecord = pruneToStudents(recorded || {}, ids);
    setRatings((prev) => fillMissing(pruneToStudents(prev, ids), onRecord));
    setNotes((prev) => pruneToStudents(prev, ids));
    setSent((prev) => fillMissing(pruneToStudents(prev, ids), onRecord));
  }, [hydrated, students, recorded]);

  // Everything rated on this device that is not already on record. This is the
  // list that gets posted, and the reason a second Save cannot duplicate a
  // first one.
  const pending = useMemo(
    () => pendingObservations({ students, ratings, sent, notes }),
    [students, ratings, sent, notes],
  );

  async function save() {
    if (busy || !pending.length) return;
    setBusy(true);
    setError('');
    const accepted = [];
    let recordedCount = 0;
    let nextCheckAt = null;
    const skipped = [];
    try {
      for (let i = 0; i < pending.length; i += MAX_PER_POST) {
        const batch = pending.slice(i, i + MAX_PER_POST);
        const r = await authedFetch('/api/tutoring/group/brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: roomId, observations: batch }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(d.error || 'Could not save these ratings. Nothing is lost — they are still here.');
          break;
        }
        recordedCount += Number(d.recorded) || 0;
        nextCheckAt = d.nextCheckAt || nextCheckAt;
        for (const id of d.skipped || []) skipped.push(id);
        accepted.push(...batch);
      }
    } catch {
      setError('Could not reach the server. Nothing is lost — the ratings are still here.');
    }

    if (accepted.length) {
      // A batch the server accepted is marked sent WHOLE, including any concept
      // it skipped. A skip means that student is not studying that concept, so
      // it will be refused again forever, and re-sending the batch to chase it
      // would append a second copy of everything the server did take.
      setSent((prev) => {
        const next = { ...prev };
        for (const o of accepted) next[o.studentId] = { ...(next[o.studentId] || {}), [o.kcId]: o.rating };
        return next;
      });
      setResult({ recorded: recordedCount, nextCheckAt, skipped: [...new Set(skipped.filter(Boolean))] });
      onSaved?.({ roomId, recorded: recordedCount });
    }
    setBusy(false);
  }

  function rate(studentId, kcId, rating) {
    setRatings((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [kcId]: rating } }));
  }
  function note(studentId, kcId, value) {
    setNotes((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [kcId]: value } }));
  }

  // ── The states this screen can be in ──────────────────────────────────────
  if (snapshot.loading) {
    return <p className="mt-2.5 text-xs text-muted">Reading the room…</p>;
  }
  // The engine schema is not applied on this deployment. Say so plainly: a
  // director who cannot rate needs to know it is the system, not them.
  if (snapshot.notProvisioned) {
    return (
      <Notice kind="info" className="mt-2.5">
        The learning record isn&apos;t switched on for this deployment yet, so there is nothing to
        rate here. Mark attendance on the roster and tell your Kaizen contact.
      </Notice>
    );
  }
  // The other not-configured cause, in the same voice as the one above rather
  // than in a fourth vocabulary: no service key, or a demo account with no real
  // room behind it. Both answer 501, and neither is something to fix by
  // retrying, so neither gets a Try again.
  if (snapshot.status === 501) {
    return (
      <Notice kind="info" className="mt-2.5">
        Ratings aren&apos;t available on this deployment — it isn&apos;t connected to the club&apos;s
        database, or this is a demo account. Nothing typed here would be saved, so nothing is
        offered.
      </Notice>
    );
  }
  if (snapshot.failed) {
    return (
      <div className="mt-2.5 space-y-2">
        <Notice kind="bad">{snapshot.failed}</Notice>
        <button type="button" onClick={load}
          className="text-xs font-semibold text-accent transition-colors hover:text-ink">
          Try again
        </button>
      </div>
    );
  }
  if (!students.length) {
    return (
      <EmptyState title="Nobody to rate yet">
        No seats are held in this room, or everyone in it is marked no-show. Ratings need a
        student who was booked or marked here.
      </EmptyState>
    );
  }

  const ratedCount = students.filter((s) => Object.values(ratings[s.studentId] || {}).some(Boolean)).length;
  // The read that says what is already on record failed. Rating still works —
  // but this screen cannot promise it is not repeating itself, so it says so
  // instead of showing a confident empty slate.
  const recordUnknown = snapshot.snapshotOnly === true && recorded == null;

  return (
    <div className="mt-2.5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">What did you see tonight?</p>
        <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">
          {ratedCount}/{students.length} students
        </span>
      </div>

      {/* What the rating DOES, and the standard it is held to. Both sentences
          are load-bearing: the first is why this is worth two minutes, the
          second is the mastery law, which a rating can quietly break. */}
      <p className="text-xs leading-relaxed text-muted">
        Rate what each student did <b className="text-ink">on their own</b>. If you talked them
        through it, that isn&apos;t <i>Got it</i> — help changes what the rating means. Saving
        books an unaided check on every concept you rate, a couple of days out: work done
        unaided, on a later day, is the only evidence that can confirm anything. Your rating is
        the strongest single signal this system takes and still not enough by itself — a concept
        counts as confirmed only after several unaided passes, in more than one setting.
      </p>

      {recordUnknown && (
        <Notice kind="warn">
          We couldn&apos;t read what has already been saved for this room, so anything already
          rated here won&apos;t be marked as saved below. Nothing you write is lost — but if this
          room was rated earlier, saving it again records the same observation twice.
        </Notice>
      )}

      <div className="space-y-2">
        {students.map((s) => {
          const mine = ratings[s.studentId] || {};
          const rated = Object.values(mine).filter(Boolean).length;
          const isOpen = open === s.studentId;
          const concepts = orderConcepts(s.kcs, sharedIds);
          const visible = showAll[s.studentId] ? concepts : concepts.slice(0, CONCEPTS_SHOWN);
          const allSent = rated > 0 && Object.entries(mine)
            .every(([kcId, r]) => !r || sent[s.studentId]?.[kcId] === r);

          return (
            <div key={s.studentId} className="rounded-sm border border-border bg-panel">
              <button type="button" onClick={() => setOpen(isOpen ? null : s.studentId)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-3 py-3 text-left transition-colors hover:bg-panel2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                  {s.bring && <span className="mt-0.5 block truncate text-xs text-muted">brought: {s.bring}</span>}
                </span>
                {allSent && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-good">
                    saved<IconCheck size={12} />
                  </span>
                )}
                <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">
                  {rated}/{concepts.length}
                </span>
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-border px-3 py-3">
                  {concepts.length === 0 ? (
                    <p className="text-xs leading-relaxed text-muted">
                      No concepts on {s.name.split(' ')[0]}&apos;s map yet, so there is nothing here a
                      rating could attach to. Their concepts appear once they have worked on
                      something — a placement, an assignment, or a session with the AI.
                    </p>
                  ) : (
                    <>
                      {visible.map((c) => {
                        const chosen = mine[c.kcId] || '';
                        const isSent = sent[s.studentId]?.[c.kcId];
                        return (
                          <div key={c.kcId}>
                            <div className="flex items-baseline gap-2">
                              <span className="min-w-0 flex-1 text-sm text-ink">{c.title}</span>
                              {sharedIds.has(c.kcId) && (
                                <span className="k-badge k-badge-accent shrink-0">room</span>
                              )}
                            </div>
                            {/* The gap between what they can do with help and what
                                they can do without it is the diagnosis, and it is
                                the number the rating is about to move. */}
                            <p className="mt-0.5 font-opmono text-xs tabular-nums text-muted">
                              {Math.round((c.working || 0) * 100)}% with help · {Math.round((c.confirmed || 0) * 100)}% on their own
                            </p>
                            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                              {RATINGS.map((r) => (
                                <button key={r.id} type="button"
                                  aria-pressed={chosen === r.id}
                                  onClick={() => rate(s.studentId, c.kcId, r.id)}
                                  className={`rounded-sm border py-3 text-xs font-semibold transition-colors ${
                                    chosen === r.id ? r.cls : 'border-border text-muted hover:border-ink/25 hover:text-ink'
                                  }`}>
                                  {r.label}
                                </button>
                              ))}
                            </div>
                            {isSent && chosen && isSent !== chosen && (
                              <p className="mt-1 text-xs text-muted">
                                Changed since it was saved. It goes in as a correction — the first
                                one stays in the record.
                              </p>
                            )}
                            {/* Naming the actual blocker is what turns an hour in a
                                room into something the AI can use on Thursday.
                                Once the observation is in, the note it went in
                                with is shown rather than left editable: a note
                                typed afterwards would never reach the record,
                                because the only way to change an observation is
                                to rate the concept again. */}
                            {chosen && chosen !== 'got_it' && (
                              isSent === chosen ? (
                                notes[s.studentId]?.[c.kcId]
                                  ? <p className="mt-1.5 text-xs text-muted">Recorded: {notes[s.studentId][c.kcId]}</p>
                                  : null
                              ) : (
                                <input value={notes[s.studentId]?.[c.kcId] || ''}
                                  onChange={(e) => note(s.studentId, c.kcId, e.target.value)}
                                  maxLength={500}
                                  placeholder="What was in the way? (optional)"
                                  className="k-input mt-1.5 px-3 py-2 text-xs" />
                              )
                            )}
                          </div>
                        );
                      })}
                      {concepts.length > visible.length && (
                        <button type="button"
                          onClick={() => setShowAll((p) => ({ ...p, [s.studentId]: true }))}
                          className="text-xs font-semibold text-accent transition-colors hover:text-ink">
                          Show {concepts.length - visible.length} more concept
                          {concepts.length - visible.length === 1 ? '' : 's'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <Notice kind="bad">{error}</Notice>}

      {result && (
        <Notice kind="ok">
          Saved. <b className="font-opmono tabular-nums">{result.recorded}</b>{' '}
          {result.recorded === 1 ? 'concept' : 'concepts'} recorded.
          {result.nextCheckAt
            ? <> Their unaided check is booked for <b className="font-opmono tabular-nums">{roomDateTime(result.nextCheckAt, room?.timezone)}</b>.</>
            : null}
          {result.skipped.length > 0 && (
            <> {result.skipped.length === 1 ? 'One student' : `${result.skipped.length} students`} had a
              concept we couldn&apos;t record — they aren&apos;t studying it yet, so it is not on their
              map to rate.</>
          )}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy || !pending.length}>
          {busy ? 'Saving…' : pending.length ? `Save ${pending.length} rating${pending.length === 1 ? '' : 's'}` : 'Nothing to save'}
        </Button>
        {pending.length > 0 && !busy && (
          <span className="text-xs text-muted">Kept on this phone until you save.</span>
        )}
      </div>
    </div>
  );
}
