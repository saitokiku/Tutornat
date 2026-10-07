'use client';

// The tutor's group workspace — the room-running loop, and now both halves of
// it. Upcoming and recent rooms with: Join (group video), Brief (the AI roster
// brief), Ratings (the exit ratings, below), and the live Roster: every
// student's intake, a help queue sorted red, then yellow, then green (polled
// ~10s while the room is live), and the close-out flow after the end time:
// attendance plus an exit summary with a concrete next step.
//
// WAVE 2 (docs/superpowers/specs/2026-09-02-wave2-audit.md). Five findings, all
// in this file, all about the two minutes the whole business depends on:
//
// - The exit RATINGS had no screen at all. POST /api/tutoring/group/brief is
//   the only code path that turns a room into evidence and it had no caller
//   anywhere. It has one now: components/ExitRatings.js, opened from the row
//   and nagged for by an unrated room, in the same shape as the unpaid-room
//   callout — name the consequence, be the button that answers it, clear where
//   it appeared. Whether a room still owes its ratings is SERVER truth
//   (ratedStudents / rateableStudents off tutorView=1), never this device's
//   draft: a Director who rated on their phone and opened the console on a
//   laptop was told the room was unrated and invited to do it again, and every
//   re-rate appends a second copy of every observation to a ledger that is
//   append-only by trigger (0034). The draft is still read, for the one
//   sentence a device can honestly say: you left work here unsaved.
// - The local kind→label map had no `standing_seat` entry, so every $550 seat
//   room was badged "Clinic" in the console where the Director runs it. The map
//   is gone; lib/roomKinds.js owns it, through ui/KindBadge.
// - Room times were formatted in the reader's zone. They are written in the
//   ROOM's zone now, through lib/roomTime.js, which is the only formatter any
//   surface may use for a room.
// - `ended` was derived from Date.now() in the render body with nothing to
//   re-render it, so a director who sat on this page through a session never
//   saw the close-out appear. The page keeps its own clock now.
// - markAttendance fired the PATCH and never read the result. The route can
//   legitimately answer 409; that answer now reaches the person.
//
// The payout contract pinned by test/payoutSurfaces.test.mjs is untouched: both
// room.needsRoster and room.holdExpiresAt are read, the unpaid room carries the
// warn badge ON THE ROW, the callout is a button that opens that room's roster,
// and the roster panel gets needsRoster plus an onRosterChange that re-reads the
// room list so the flag is answerable where it appears.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import { money } from '@/lib/format';
import { roomDateTime, CLUB_TIMEZONE } from '@/lib/roomTime';
import VideoCall from '@/components/VideoCall';
import HallBoard from '@/components/HallBoard';
import ExitRatings from '@/components/ExitRatings';
import { ratingsOwed, ratingsProgress, readDraft, writeDraft, dropDraft } from '@/lib/exitRatings';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import KindBadge from '@/components/ui/KindBadge';
import { IconCheck, IconArrowRight } from '@/components/Icons';

// Every time on this screen belongs to a ROOM, and is written in that room's
// own zone — never in the reader's, which is how the same 6:00 PM Austin room
// came to render three different ways in three places. The formatter is
// therefore built per room, from `room.timezone`, which tutorView=1 sends on
// every row; the club's home zone is the fallback for a row that carries none,
// and nothing else. A screen-wide `when()` closed over CLUB_TIMEZONE is the
// same silent misstatement in a different costume: it renders an out-of-town
// room's start time in Chicago while the unaided-check time next to it, which
// does read the room's zone, disagrees on the same screen.
const whenIn = (room) => (iso) => roomDateTime(iso, room?.timezone || CLUB_TIMEZONE);

// How much of the seven-day hold is left on an unpaid room. Deliberately
// coarse: the exact minute doesn't change what the tutor has to do.
function holdLeft(iso) {
  const ms = new Date(iso || 0).getTime() - Date.now();
  if (!Number.isFinite(ms)) return '';
  if (ms <= 0) return 'the hold has run out';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left`;
  const hours = Math.max(1, Math.round(ms / 3600000));
  return `${hours} hour${hours === 1 ? '' : 's'} left`;
}

// The help queue, in tokens rather than emoji: the same three states, painted
// with the status palette so they match every other signal in the product.
const FLAG_DOT = { red: 'bg-bad', yellow: 'bg-warn', green: 'bg-good' };
const FLAG_WORD = { red: 'needs help', yellow: 'has a question', green: 'working' };

function Flag({ status }) {
  const key = FLAG_DOT[status] ? status : 'green';
  return (
    <span
      title={FLAG_WORD[key]}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${FLAG_DOT[key]}`}
    >
      <span className="sr-only">{FLAG_WORD[key]}</span>
    </span>
  );
}

/**
 * The page's own clock.
 *
 * `live`, `joinable` and `ended` are all answers about NOW, and they were all
 * computed once in the render body from a value nothing ever changed. A
 * director who opened this page before the room started and left it open never
 * saw the room end — the close-out simply never appeared, for the two minutes
 * of work the differentiator depends on. Thirty seconds is finer than any
 * decision on this screen and cheap enough to run all evening.
 */
function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default function TutorClasses() {
  const [rooms, setRooms] = useState(null);
  const [open, setOpen] = useState(null);   // room id with the roster panel open
  const [rating, setRating] = useState(null); // room id with the exit ratings open
  const [call, setCall] = useState(null);   // {sessionId, title}
  const [brief, setBrief] = useState(null); // {roomId, loading, text, error}
  const [ratingLog, setRatingLog] = useState({}); // room id -> what is unsaved on this device
  const now = useNow();

  const load = useCallback(async () => {
    const r = await authedFetch('/api/tutoring/group?tutorView=1');
    if (!r.ok) { setRooms([]); return; }
    setRooms((await r.json()).rooms || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  // What is sitting UNSAVED on this device for each room — nothing more. The
  // question of whether a room has been rated is answered by the room payload
  // (ratingsOwed), because a draft cannot see the other phone. Read after
  // mount, because it comes out of localStorage, and re-read whenever the rooms
  // change or a save lands.
  const refreshRatingLog = useCallback((list) => {
    const next = {};
    for (const room of list || []) next[room.id] = ratingsProgress(room.id);
    setRatingLog(next);
  }, []);
  // Re-read on `rating` too: opening a room's ratings reconciles its draft with
  // the roster the server just sent (a student who left the room takes their
  // half-written rating with them), so the count this list prints has to be
  // taken again when the panel closes. Otherwise the row goes on offering work
  // that the panel it opens has already dropped.
  useEffect(() => { if (rooms) refreshRatingLog(rooms); }, [rooms, rating, refreshRatingLog]);

  async function loadBrief(room) {
    setBrief({ roomId: room.id, loading: true });
    const r = await authedFetch(`/api/tutoring/group/brief?sessionId=${room.id}`);
    const d = await r.json().catch(() => ({}));
    setBrief({ roomId: room.id, loading: false, text: d.brief || d.text || '', error: r.ok ? '' : d.error || 'Could not load the brief.' });
  }

  const isHall = (k) => k === 'homework_hall' || k === 'community_free';

  // Tonight first. The API sorts by start time, which is the catalogue order,
  // not the working order: it puts last night's unclosed room above the room
  // that is running right now. So the list is re-ordered by what this person
  // has to do — the room in progress, then the rooms that ran and are still
  // owed something, then what is coming, then the settled past, newest first.
  const ordered = useMemo(() => {
    const rank = (room) => {
      const startMs = new Date(room.start).getTime();
      const endMs = new Date(room.end).getTime();
      if (startMs - 15 * 60000 < now && now < endMs + 30 * 60000) return 0;
      if (now > endMs) {
        return room.needsRoster === true || ratingsOwed(room) ? 1 : 3;
      }
      return 2;
    };
    return [...(rooms || [])].sort((a, b) => {
      const byRank = rank(a) - rank(b);
      if (byRank) return byRank;
      const aStart = new Date(a.start).getTime();
      const bStart = new Date(b.start).getTime();
      // Upcoming reads forwards, the past reads backwards: in both directions
      // the row nearest to now is the one nearest the top.
      return rank(a) === 2 ? aStart - bStart : bStart - aStart;
    });
  }, [rooms, now]);

  if (call) {
    return (
      <VideoCall group sessionId={call.sessionId} title={call.title}
        sidePanel={isHall(call.kind) ? <HallBoard sessionId={call.sessionId} role="tutor" /> : null}
        onClose={() => setCall(null)} />
    );
  }
  if (rooms === null) return <p className="px-4 py-8 text-center text-xs text-muted">Loading your classes…</p>;
  if (rooms.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-muted">
        No rooms assigned yet. An admin schedules the seat cohorts, Clinics, Homework Halls and
        the free Community Hall, and assigns their tutors.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {ordered.map((room) => {
        // This room's zone, for every instant printed in this row.
        const when = whenIn(room);
        const startMs = new Date(room.start).getTime();
        const endMs = new Date(room.end).getTime();
        const joinable = startMs - now < 15 * 60000 && endMs + 30 * 60000 > now
          && ['open', 'confirmed', 'in_progress'].includes(room.status);
        const live = startMs - 15 * 60000 < now && now < endMs + 30 * 60000;
        const ended = now > endMs;
        // The room ran, it owes this tutor money, and nothing on the roster
        // records that the tutor was in it, so the hourly sweep is holding the
        // pay and will close the room unpaid when the hold runs out. The API
        // computes this with the sweep's own rule (tutorView=1 gives
        // needsRoster); the only thing that clears it is a closed roster, below.
        const needsRoster = room.needsRoster === true;
        // The other half of the close-out, and the more important one. Whether
        // the room owes ratings is the server's answer (see ratingsOwed); the
        // draft on this device only says whether there is unsaved work sitting
        // here, which is the one thing a device can honestly know.
        const progress = ratingLog[room.id] || { sent: 0, unsent: 0 };
        const rateable = Number(room.rateableStudents) || 0;
        const ratedOnRecord = Number(room.ratedStudents) || 0;
        const needsRatings = ended && ratingsOwed(room);

        return (
          <div key={room.id} className="px-4 py-3.5">
            {/* Built at 375px first: the room says what it is on its own line
                and the actions wrap underneath, instead of four controls
                fighting a truncated title for one row. */}
            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1 basis-full sm:basis-0">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={room.kind} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{room.topic || room.subject}</span>
                  {live && <span className="k-badge k-badge-good shrink-0">Live now</span>}
                  {needsRoster && <span className="k-badge k-badge-warn shrink-0">Unpaid</span>}
                </div>
                <div className="mt-1 font-opmono text-xs tabular-nums text-muted">
                  {when(room.start)} · {room.seats}/{room.capacity} seats
                  {room.tutorPayCents ? ` · you earn ${money(room.tutorPayCents)}` : ''}
                  {room.status === 'completed' ? ' · completed' : ''}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => loadBrief(room)}
                  className="text-xs font-semibold text-accent hover:text-ink transition-colors">
                  Brief
                </button>
                <button onClick={() => setRating(rating === room.id ? null : room.id)}
                  className="k-btn-secondary px-3 py-1.5 text-xs">
                  Ratings{progress.unsent > 0 ? ' · draft' : ''}
                </button>
                <button onClick={() => setOpen(open === room.id ? null : room.id)}
                  className="k-btn-secondary px-3 py-1.5 text-xs">
                  Roster{live ? ' · live' : ''}
                </button>
                {joinable && (
                  <Button size="sm" onClick={() => setCall({ sessionId: room.id, title: room.topic || room.subject, kind: room.kind })}>
                    Join
                  </Button>
                )}
              </div>
            </div>

            {needsRoster && (
              <button type="button" onClick={() => setOpen(room.id)}
                className="mt-2.5 w-full rounded-sm border border-warn/40 bg-warn/10 px-3 py-2.5 text-left transition-colors hover:border-warn/70">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  Mark who was here to get paid for this one
                  <IconArrowRight size={14} className="shrink-0" />
                </span>
                <span className="mt-1 block text-xs text-muted leading-relaxed">
                  Nothing on the roster shows you were in this room, so this hour hasn&apos;t been paid.
                  Open the roster and mark every student <b className="text-ink">Here</b> or{' '}
                  <b className="text-ink">No-show</b>. That record is what the payout is waiting on.
                  {room.holdExpiresAt
                    ? <> Left unmarked it closes unpaid on {when(room.holdExpiresAt)} ({holdLeft(room.holdExpiresAt)}).</>
                    : <> Left unmarked it closes unpaid when the hold runs out.</>}
                </span>
              </button>
            )}

            {/* The same shape as the callout above, in the accent rather than
                the warn channel, because this one is not about money. It is
                hidden while the ratings are open: the panel is the answer, and
                on a phone the nag would only push it off the screen. */}
            {needsRatings && rating !== room.id && (
              <button type="button" onClick={() => setRating(room.id)}
                className="mt-2.5 w-full rounded-sm border border-accent/40 bg-accent/10 px-3 py-2.5 text-left transition-colors hover:border-accent/70">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {progress.unsent > 0 || ratedOnRecord > 0
                    ? 'Finish the exit ratings for this room'
                    : 'Write the exit ratings for this room'}
                  <IconArrowRight size={14} className="shrink-0" />
                </span>
                <span className="mt-1 block text-xs text-muted leading-relaxed">
                  {/* Two different facts, from two different places, and the
                      sentence says which is which: what the RECORD holds is the
                      server's count, and what is unsaved is this device's
                      draft. Both can be true at once. */}
                  {progress.unsent > 0 && (
                    <>
                      You left <b className="font-opmono tabular-nums text-ink">{progress.unsent}</b>{' '}
                      rating{progress.unsent === 1 ? '' : 's'} unsaved on this phone. They are still
                      here exactly as you left them — pick up where you stopped.{' '}
                    </>
                  )}
                  {ratedOnRecord > 0 ? (
                    <>
                      <b className="font-opmono tabular-nums text-ink">{ratedOnRecord}</b> of{' '}
                      <b className="font-opmono tabular-nums text-ink">{rateable}</b> students in
                      this room have something on record. The rest have nothing from this hour yet.
                    </>
                  ) : (
                    <>
                      Nobody in this room has been rated yet. One tap a concept —{' '}
                      <b className="text-ink">got it</b>, <b className="text-ink">shaky</b>,{' '}
                      <b className="text-ink">not yet</b> — is what turns this hour into a record of
                      what each child can now do on their own, and it books the later unaided check
                      that can confirm it. Unrated, this hour leaves nothing in their record.
                    </>
                  )}
                </span>
              </button>
            )}

            {brief?.roomId === room.id && (
              <div className="mt-2.5 rounded-sm border border-border bg-panel2 p-3">
                {brief.loading ? <p className="text-xs text-muted">Reading the room…</p>
                  : brief.error ? <p className="text-xs text-bad">{brief.error}</p>
                  : brief.text ? <pre className="whitespace-pre-wrap font-body text-xs leading-relaxed text-ink">{brief.text}</pre>
                  : <p className="text-xs text-muted leading-relaxed">No brief yet. It&apos;s generated once students with learning history have booked. The roster below shows what each student said they&apos;re bringing.</p>}
              </div>
            )}

            {rating === room.id && (
              // onSaved re-reads BOTH halves so the callout above clears the
              // moment the work is done, in the row where it asked: the room
              // list, because that is what knows the room has been rated, and
              // this device's drafts, because that is what knows nothing is
              // left unsaved. A flag you cannot answer is noise.
              <ExitRatings room={room} onSaved={() => { load(); refreshRatingLog(rooms); }} />
            )}

            {open === room.id && (
              // onRosterChange re-reads the room list so the "Unpaid" flag
              // clears the moment the roster is closed: the flag has to be
              // answerable, not just visible.
              <RosterPanel room={room} needsRoster={needsRoster} live={live} ended={ended} onRosterChange={load} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RosterPanel({ room, live, ended, needsRoster, onRosterChange }) {
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState('');
  const [busySeat, setBusySeat] = useState(null); // seat id with a write in flight
  const [writeError, setWriteError] = useState('');
  const [closing, setClosing] = useState(null); // seatId with the exit form open
  const [drafted, setDrafted] = useState({});   // seatId -> an unsaved exit summary is waiting
  const timer = useRef(null);

  const load = useCallback(async () => {
    const r = await authedFetch(`/api/tutoring/group/roster?sessionId=${room.id}`);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || 'Could not load the roster.'); return; }
    setError('');
    setRoster(d.roster || []);
  }, [room.id]);

  // Poll while the room is live: the help queue is only useful fresh.
  useEffect(() => {
    load();
    if (live) {
      timer.current = setInterval(load, 10000);
      return () => clearInterval(timer.current);
    }
    return undefined;
  }, [load, live]);

  // Which seats have an exit summary half-written on this device. Read after
  // mount, and again whenever the roster reloads, so a director who was
  // interrupted is told the work is still here rather than having to guess.
  const refreshDrafts = useCallback((list) => {
    const next = {};
    for (const s of list || []) next[s.seatId] = Boolean(readDraft(`exit.${s.seatId}`));
    setDrafted(next);
  }, []);
  useEffect(() => { if (roster) refreshDrafts(roster); }, [roster, refreshDrafts]);

  // The PATCH can legitimately answer 409 — a cancelled seat cannot take
  // attendance — and it used to be fired and forgotten, so a refusal looked
  // exactly like a success until the list failed to change. Now the button
  // waits, and the refusal is said out loud.
  async function markAttendance(seatId, attendance) {
    setBusySeat(seatId);
    setWriteError('');
    try {
      const r = await authedFetch('/api/tutoring/group/roster', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, attendance }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setWriteError(d.error || 'Could not save that — try again.'); return; }
      await load();
      onRosterChange?.();
    } catch {
      setWriteError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusySeat(null);
    }
  }

  if (error) return <p className="mt-2.5 text-xs text-bad">{error}</p>;
  if (roster === null) return <p className="mt-2.5 text-xs text-muted">Loading roster…</p>;
  if (roster.length === 0) return <p className="mt-2.5 text-xs text-muted">No booked seats yet.</p>;

  return (
    <div className="mt-2.5 space-y-2">
      {live && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Flag status="red" />Work the red flags first,</span>
          <span className="inline-flex items-center gap-1.5"><Flag status="yellow" />then yellow,</span>
          <span className="inline-flex items-center gap-1.5"><Flag status="green" />then green.</span>
          <span>Students flip their own flag from inside the video room; this list refreshes every 10 seconds.</span>
        </p>
      )}
      {needsRoster && (
        <Notice kind="warn">
          This room is still unpaid. Mark each student Here or No-show below. That record is what the
          payout is waiting on. If nobody turned up, mark them all No-show: the room then owes nothing
          and this flag clears.
        </Notice>
      )}
      {writeError && <Notice kind="bad">{writeError}</Notice>}
      {roster.map((s) => (
        <div key={s.seatId} className="rounded-sm border border-border bg-panel2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Flag status={s.helpStatus} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
              {s.name}{s.gradeLevel ? <span className="font-normal text-muted"> · grade {s.gradeLevel}</span> : null}
            </span>
            {s.status === 'attended' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-good">attended<IconCheck size={12} /></span>
            )}
            {s.status === 'no_show' && <span className="text-xs font-semibold text-bad">no-show</span>}
            {(live || ended) && s.status === 'booked' && (
              <span className="flex gap-1.5">
                <button onClick={() => markAttendance(s.seatId, 'attended')} disabled={busySeat === s.seatId}
                  className="rounded-full border border-good/30 bg-good/10 px-2.5 py-1 text-xs font-semibold text-good transition-colors hover:border-good/70 disabled:opacity-50">
                  {busySeat === s.seatId ? 'Saving…' : 'Here'}
                </button>
                <button onClick={() => markAttendance(s.seatId, 'no_show')} disabled={busySeat === s.seatId}
                  className="rounded-full border border-bad/30 bg-bad/10 px-2.5 py-1 text-xs font-semibold text-bad transition-colors hover:border-bad/70 disabled:opacity-50">
                  No-show
                </button>
              </span>
            )}
          </div>
          {(s.intake || s.bring) && (
            <div className="mt-1.5 text-xs text-muted leading-relaxed">
              {s.intake ? (
                <>
                  {s.intake.subject && <span><b className="text-ink">{s.intake.subject}</b> · </span>}
                  {s.intake.topic && <span>{s.intake.topic} · </span>}
                  {s.intake.stuck && <span>stuck: {s.intake.stuck} · </span>}
                  {s.intake.goal && <span>done = {s.intake.goal}</span>}
                </>
              ) : s.bring}
            </div>
          )}
          {s.exit?.recommendation && (
            <p className="mt-1.5 text-xs font-semibold text-accent">next step: {s.exit.recommendation}{s.exit.accomplished ? ` · did: ${s.exit.accomplished}` : ''}</p>
          )}
          {ended && s.status !== 'no_show' && !s.exit?.recommendation && (
            closing === s.seatId
              ? <ExitForm seatId={s.seatId}
                  onDone={() => { setClosing(null); load(); onRosterChange?.(); }}
                  onCancel={() => { setClosing(null); refreshDrafts(roster); }} />
              : <button onClick={() => setClosing(s.seatId)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-ink transition-colors">
                  {drafted[s.seatId] ? 'Finish exit summary · draft saved' : 'Write exit summary'}
                  <IconArrowRight size={13} className="shrink-0" />
                </button>
          )}
        </div>
      ))}
    </div>
  );
}

// The written half of the close-out: what happened, in words, for the family.
// The RATED half — what each student can now do unaided — is the panel above,
// and it is the one that reaches the record.
//
// The four fields used to live in useState alone, so an interruption cost the
// work and opening a second student's form destroyed the first's. They are kept
// per seat now, on this device, until the summary is saved.
const EMPTY_EXIT = { accomplished: '', remaining: '', understood: '', recommendation: 'rebook', note: '' };

function ExitForm({ seatId, onDone, onCancel }) {
  const key = `exit.${seatId}`;
  const [form, setForm] = useState(EMPTY_EXIT);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const draft = readDraft(key);
    if (draft?.form) setForm({ ...EMPTY_EXIT, ...draft.form });
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    const dirty = Object.entries(form).some(([k, v]) => v && v !== EMPTY_EXIT[k]);
    if (dirty) writeDraft(key, { form });
    else dropDraft(key);
  }, [hydrated, form, key]);

  async function save() {
    setBusy(true); setMsg('');
    try {
      const r = await authedFetch('/api/tutoring/group/roster', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, exit: form }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.error || 'Could not save.'); return; }
      // Only once the server has it: a draft dropped on a failed write is the
      // interruption bug with extra steps.
      dropDraft(key);
      onDone();
    } catch {
      setMsg('Could not reach the server. Your summary is still here — try again.');
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="mt-2.5 space-y-2">
      {[
        ['accomplished', 'What got done', 'e.g. finished problems 1 to 14'],
        ['remaining', 'What is left', 'e.g. word problems 15 to 18'],
        ['understood', 'What clicked (or did not)', 'e.g. distributing negatives finally landed'],
      ].map(([k, label, ph]) => (
        <label key={k} className="block">
          <span className="k-label">{label}</span>
          <input value={form[k]} onChange={set(k)} placeholder={ph} maxLength={500}
            className="k-input mt-1 px-3 py-2 text-xs" />
        </label>
      ))}
      <label className="block">
        <span className="k-label">Recommended next step</span>
        {/* Two options, because there are two things to send a family to. The
            third used to be 1:1 tutoring, which Kaizen does not sell. */}
        <select value={form.recommendation} onChange={set('recommendation')}
          className="k-input mt-1 px-3 py-2 text-xs">
          <option value="rebook">Come back as planned, on track</option>
          <option value="clinic">A Subject Clinic, needs the topic taught</option>
        </select>
      </label>
      {msg && <p className="text-xs text-bad">{msg}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save summary'}</Button>
        <button onClick={onCancel} className="text-xs text-muted hover:text-ink transition-colors">Close</button>
        <span className="text-xs text-muted">Kept on this phone until you save.</span>
      </div>
    </div>
  );
}
