'use client';

// Public weekly schedule browser: the storefront's "what's on" surface, and
// the standalone booking flow. Signed out: retail prices, and Book stores a
// return path and sends the visitor to sign in; they land back HERE, not in
// dashboard onboarding. Signed in: Book opens the real booking sheet
// (DropInSessions) pre-focused on the clicked room, with the caller's own
// member pricing. Filters by kind and grade band.
//
// Three-state law (docs/superpowers/specs/2026-08-12-*.md): the API returns
// { sessions, notYetOpen } and BOTH can be truthy (preview mode: selling is
// held but the real week exists). Preview shows the exact live rows with
// first-pick capture instead of Book; live behavior is logically unchanged.
//
// Full rooms (0029) stay on the board with a quiet "Full" state instead of
// vanishing: live, the row keeps a waitlist control — signed-in callers join
// right here, signed-out visitors take the same sign-in path as Book and land
// back on this page.
//
// Rebuilt onto the one system (spec: 2026-08-22-one-system-rebuild.md). The
// board is a record, so it is a hairline list under a day heading rather than a
// stack of cards: cards are for real elevation, and forty rows of elevation is
// just noise. The three states now differ in shape as well as in copy — live
// rows carry an ink pill, preview rows carry a text link to the one capture,
// which is what "a held surface exposes zero booking affordances" looks like.
//
// The illustrative week strip that used to fill the no-rows preview is gone.
// It rendered a seven-cell calendar of invented afternoons above a "leave your
// email" card, which is fabricated precision on the one page whose whole claim
// is an honest record; its job (say what will appear here) is now one line of
// copy in the empty state.

// A ROOM'S TIME IS RENDERED IN THE ROOM'S ZONE (lib/roomTime.js), never in the
// visitor's. This board formatted with toLocaleString, so a 6:00 PM Austin room
// read "4:00 PM" to a visitor in California and could sit under the wrong day
// heading entirely (docs/superpowers/specs/2026-09-02-wave2-audit.md). The zone
// is named once, under the board, because a visitor may not be in it — and the
// kind label comes from lib/roomKinds, the one map, rather than from a second
// one that drifts.
//
// The venue rides every row now that publicSchedule returns it. "Where is the
// room" is the first question a parent asks about an in-person club, and this
// board could not answer it.
//
// A FAILED LOAD IS ITS OWN STATE. The catch below has always set state.error and
// no JSX ever read it, so an outage rendered "Nothing matches those filters this
// week": a database failure dressed as a quiet week, on the one page whose whole
// claim is an honest record.

import { useState, useEffect, useCallback } from 'react';
import { supabase, cloudConfigured, authedFetch } from '@/lib/supabaseClient';
import { IconCheck, IconX } from '@/components/Icons';
import DropInSessions from '@/components/DropInSessions';
import InterestForm from '@/components/InterestForm';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Notice from '@/components/ui/Notice';
import VenueLine from '@/components/ui/VenueLine';
import { kindLabel, ROOM_KINDS } from '@/lib/roomKinds';
import { roomTime, roomDay, roomDateTime, zoneLabel } from '@/lib/roomTime';

function money(cents) { return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(0)}`; }

// The day a room falls on, in the ROOM's zone: "Thursday 4 Sep". The long
// weekday and the date come out of the same module the row's time does, so the
// heading and the rows under it can never disagree about which day it is.
function dayHeading(s) {
  const weekday = roomDay(s.start, s.timezone, { long: true });
  const [date = ''] = roomDateTime(s.start, s.timezone).split(' · ');
  const dayMonth = date.split(' ').slice(1).join(' ');
  return weekday && dayMonth ? `${weekday} ${dayMonth}` : weekday || dayMonth;
}

const KINDS = [
  ['', 'Everything'],
  ['homework_hall', 'Homework Hall'],
  ['clinic', 'Subject Clinics'],
  ['community_free', 'Community Hall'],
];
const GRADES = [['', 'All grades'], ['7-8', 'Middle school (13+)'], ['9-12', 'Grades 9-12'], ['college', 'College']];

// Hue codes the kind. Text, not a pill: the row already has a heading and a
// price, and three chips per row was two too many. Every value is a token.
//
// KEYED ON THE TONE, NOT THE KIND. This was a kind->class map, which made it a
// second opinion about what a room IS — and it disagreed with lib/roomKinds.js
// on two of the three it listed (community_free `warn` where the canonical map
// says `muted`) and had no `standing_seat` entry at all, so its
// `|| KIND_TONE.clinic` fallback painted a $550 seat room in clinic accent. The
// same page renders RoomCard, which reads the canonical map, so one room got two
// colours depending on which component drew it.
//
// Now roomKinds decides the tone and this only decides how a tone looks as text.
// The map has to be written out rather than interpolated because Tailwind only
// ships classes it can find as whole strings in the source.
const TONE_TEXT = {
  accent: 'text-accent',
  good: 'text-good',
  warn: 'text-warn',
  muted: 'text-muted',
};

export default function ScheduleBrowser({ initialSubject = '', initialKind = '' }) {
  const [kind, setKind] = useState(KINDS.some(([id]) => id === initialKind) ? initialKind : '');
  const [grade, setGrade] = useState('');
  const [state, setState] = useState({ loading: true });
  const [signedIn, setSignedIn] = useState(false);
  const [bookSession, setBookSession] = useState(null); // room id -> open booking sheet
  // One channel, two states. It carries failures as well as confirmations
  // ("Could not join the list…"), and a failure painted in success green reads
  // as done — the parent stops, and the seat quietly goes at T-4h. Notice
  // derives role="alert" from kind="bad", so the split survives verbatim.
  const [notice, setNotice] = useState(null);   // { ok, text } | null
  const [waitBusy, setWaitBusy] = useState(null);        // room id mid-waitlist
  const [waitlisted, setWaitlisted] = useState(() => new Set()); // joined this visit

  useEffect(() => {
    if (!cloudConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data?.session?.user))).catch(() => {});
  }, []);

  // Stripe Checkout comes back here (?dropin=paid|cancelled) when booking
  // started on this page. Reconcile server-side rather than trusting the
  // redirect, same as the dashboard does.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('dropin');
    if (!outcome) return;
    if (outcome === 'paid') {
      setNotice({ ok: true, text: 'Confirming your payment…' });
      (async () => {
        try { await authedFetch('/api/billing/reconcile', { method: 'POST' }); } catch { /* notice still updates */ }
        setNotice({ ok: true, text: 'Payment received. Your seat is booked; check your email for the details.' });
      })();
    } else {
      setNotice({ ok: false, text: 'Checkout cancelled. The seat was released; you can book again any time.' });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('dropin');
    window.history.replaceState(window.history.state || {}, '', url);
  }, []);

  function bookCta(s) {
    if (signedIn) { setBookSession(s.id); return; }
    try { sessionStorage.setItem('kaizen.returnTo', '/schedule'); } catch { /* private mode */ }
    window.location.assign('/dashboard');
  }

  // Full room: signed-out visitors take the same sign-in path as Book (they
  // land back here to click again); signed-in callers join the waitlist
  // directly through the authed group route.
  async function waitlistCta(s) {
    if (!signedIn) { bookCta(s); return; }
    if (waitBusy) return;
    setWaitBusy(s.id);
    try {
      const r = await authedFetch('/api/tutoring/group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'waitlist', sessionId: s.id }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setWaitlisted((prev) => new Set(prev).add(s.id));
        setNotice({ ok: true, text: d.message || 'You’re on the list. We’ll email you the moment a seat opens.' });
      } else {
        setNotice({ ok: false, text: d.error || 'Could not join the list. Try again in a moment.' });
        if (d.code === 'seats_open') load(); // a seat freed since this page loaded
      }
    } catch {
      setNotice({ ok: false, text: 'Could not join the list. Try again in a moment.' });
    } finally {
      setWaitBusy(null);
    }
  }

  const load = useCallback(async () => {
    setState({ loading: true });
    try {
      const qs = new URLSearchParams();
      if (kind) qs.set('kind', kind);
      if (grade) qs.set('grade', grade);
      const r = await fetch(`/api/club/schedule?${qs}`);
      const d = await r.json().catch(() => ({}));
      // A refusal (rate limit, 500) used to fall through as a successful load
      // with no sessions, which the board then rendered as a quiet week. It
      // carries its own message where the route sends one.
      if (!r.ok) {
        setState({ loading: false, sessions: [], error: d.error || 'The schedule didn’t load. Try again in a moment.' });
        return;
      }
      setState({ loading: false, ...d });
    } catch {
      setState({ loading: false, sessions: [], error: 'The schedule didn’t load. Try again in a moment.' });
    }
  }, [kind, grade]);
  useEffect(() => { load(); }, [load]);

  const subjectFilter = String(initialSubject || '').toLowerCase();
  const sessions = (state.sessions || []).filter((s) => (
    !subjectFilter || String(s.subject || '').toLowerCase().includes(subjectFilter)
  ));

  // Preview mode: real rows, selling held. Rows render exactly as live, with
  // the Book affordance swapped for first-pick capture.
  const preview = Boolean(state.notYetOpen);

  // The zone the board is written in — the first room's own, since the club
  // runs in one city. Disclosed once at the foot rather than on every row.
  const boardZone = sessions.find((r) => r.timezone)?.timezone || null;

  // Group by calendar day for the "Happening today / this week" reading. The
  // day is the ROOM's day: grouping in the visitor's zone put a 6:00 PM room on
  // Wednesday for a reader five hours east of it.
  const byDay = new Map();
  for (const s of sessions) {
    // Every row here has a scheduled start (publicSchedule filters on it), so
    // this fallback is a guard, not a state a visitor should ever meet.
    const day = dayHeading(s) || 'This week';
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(s);
  }

  return (
    <div>
      {notice && (
        <Notice kind={notice.ok ? 'ok' : 'bad'} className="mb-6 flex items-start gap-3">
          <span className="flex-1">{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 text-muted transition-colors hover:text-ink"
          >
            <IconX size={14} />
          </button>
        </Notice>
      )}
      {bookSession && (
        <DropInSessions initialSessionId={bookSession} onClose={() => { setBookSession(null); load(); }} />
      )}

      {/* Two axes, one pill recipe. The grade row used to carry the ghost
          variant, which on paper is borderless text: eight controls where four
          looked like buttons and four looked like a stylesheet that had not
          loaded. What separates the axes is the label in front of each row, not
          a missing hairline. Rose marks the chosen filter on both. */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="k-label shrink-0 sm:w-20">Sessions</span>
          <div role="group" aria-label="Session kind" className="flex flex-wrap gap-2">
            {KINDS.map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={kind === id ? 'accent' : 'secondary'}
                aria-pressed={kind === id}
                onClick={() => setKind(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="k-label shrink-0 sm:w-20">Grades</span>
          <div role="group" aria-label="Grade band" className="flex flex-wrap gap-2">
            {GRADES.map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={grade === id ? 'accent' : 'secondary'}
                aria-pressed={grade === id}
                onClick={() => setGrade(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {state.loading && <p className="text-sm text-muted py-12 text-center">Loading this week…</p>}

      {/* The load failed. Say so, and offer the one thing that can help —
          rather than showing an empty board, which reads as "nothing is on". */}
      {!state.loading && state.error && (
        <Notice kind="bad" className="mt-8 flex flex-wrap items-center gap-3">
          <span className="flex-1">{state.error}</span>
          <Button type="button" size="sm" variant="secondary" onClick={load}>Try again</Button>
        </Notice>
      )}

      {/* Preview with a real week: one capture, quiet, above the rows it
          describes. Every held row below links back to this anchor rather than
          embedding a second form. */}
      {!state.loading && !state.error && preview && sessions.length > 0 && (
        <Card id="schedule-interest" variant="inset" pad="md" className="mt-8 scroll-mt-24">
          <p className="font-brand font-semibold text-ink text-t3">Booking opens soon.</p>
          <p className="mt-1.5 text-sm text-muted">
            The schedule below is real. Leave an email and you&apos;ll hear first.
          </p>
          <InterestForm kind={kind || null} source="/schedule" inline className="mt-4" />
        </Card>
      )}

      {/* Preview with no rows yet: the capture is the whole board. No
          illustrative week, because inventing one is inventing a record. */}
      {!state.loading && !state.error && preview && sessions.length === 0 && (
        <Card variant="raised" pad="lg" className="mt-8 text-center">
          <p className="font-brand font-semibold text-ink text-t2">The weekly schedule opens here soon.</p>
          <p className="mt-2 mx-auto max-w-[44ch] text-sm text-muted">
            Days, times, tutors and seat prices post on this board when booking opens.
            Leave an email and you&apos;ll hear first.
          </p>
          <InterestForm kind={kind || null} source="/schedule" inline className="mt-5 max-w-narrow mx-auto text-left" />
        </Card>
      )}

      {!state.loading && !state.error && !preview && sessions.length === 0 && (
        <Card variant="inset" pad="md" className="mt-8">
          <p className="text-sm text-muted">
            Nothing matches those filters this week. New times get posted through the week.
          </p>
        </Card>
      )}

      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="mt-10">
          <h2 className="font-brand font-semibold text-ink text-t2">{day}</h2>
          <ul className="mt-2">
            {list.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 border-t border-border py-4"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className={`text-xs font-semibold ${TONE_TEXT[ROOM_KINDS[s.kind]?.tone] || TONE_TEXT.muted}`}>
                      {kindLabel(s.kind)}
                    </span>
                    {s.gradeBand && s.gradeBand !== 'all' && (
                      <span className="text-xs text-muted">
                        {s.gradeBand === 'college' ? 'College' : `Grades ${s.gradeBand}`}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 truncate text-body font-semibold text-ink">{s.topic || s.subject}</p>
                  {/* The record line: only the figures are mono. */}
                  <p className="mt-1 text-xs text-muted">
                    <span className="font-opmono tabular-nums">{roomTime(s.start, s.timezone)}</span>
                    {' · '}{s.tutorName}
                    {s.isFull ? ' · Full' : (
                      <>
                        {' · '}
                        <span className="font-opmono tabular-nums">{s.seatsLeft}</span>
                        {` ${s.seatsLeft === 1 ? 'spot' : 'spots'} left`}
                      </>
                    )}
                    {/* Supervision is a selling point for the free hall (0029). */}
                    {s.kind === 'community_free' && s.staffCount >= 2 && (
                      <>
                        {' · '}
                        <span className="font-opmono tabular-nums">{s.staffCount}</span>
                        {' tutors'}
                      </>
                    )}
                  </p>
                  {/* Where it is. A public surface passes no `missing` line:
                      a room with no venue set is an operations problem, and a
                      family should see nothing rather than a blank address. */}
                  <VenueLine venue={s.venue} className="mt-1" />
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-opmono tabular-nums text-t3 ${s.seatPriceCents === 0 ? 'text-good' : 'text-ink'}`}>
                    {money(s.seatPriceCents)}
                  </p>
                  <div className="mt-2 flex justify-end">
                    {preview ? (
                      <a
                        href="#schedule-interest"
                        className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
                      >
                        Get first pick
                      </a>
                    ) : s.isFull ? (
                      waitlisted.has(s.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-good">
                          On the list <IconCheck size={14} />
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => waitlistCta(s)}
                          disabled={waitBusy === s.id}
                        >
                          {waitBusy === s.id ? 'Joining…' : 'Join the list'}
                        </Button>
                      )
                    ) : (
                      <Button type="button" size="sm" onClick={() => bookCta(s)}>Book</Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* The board's one footnote. It used to explain a membership's included
          visits to a reader who cannot buy a membership: Club, Plus and Max are
          retired from sale. What is sold is the standing seat, whose rooms are
          reserved inventory — which is why a family will not find one here.
          It rides the rows: with nothing above it, "every price above" is a
          sentence about nothing, and the empty and failed states say their own
          piece already.

          THREE THINGS THIS SENTENCE MAY NOT SAY. (1) That the printed price is
          what EVERYONE pays: the board always prints retail, and a seat holder
          pays SEAT_PLAN.seat.memberHallCents on a Hall visit — the sheet
          applies it at booking, this row cannot. (2) "No membership, now or
          ever": a forward promise about the business, with no CLAIMS_MATRIX
          row, on a site whose /terms page still documents Club, Plus and Max
          for the metering rail. What is true is a fact about today's prices,
          not a vow about tomorrow's catalogue. (3) Both at once — the previous
          version denied memberships in one clause and charged "member rates"
          in the next. */}
      {sessions.length > 0 && (
        <p className="mt-12 border-t border-border pt-5 text-xs text-muted">
          Prices above are the no-membership rate. A standing seat pays member rates on Hall
          visits and clinics — yours shows when you book. Seat rooms are reserved, so they are
          not on this board.
          {boardZone ? ` All times are ${zoneLabel(boardZone)}.` : ''}
        </p>
      )}
    </div>
  );
}
