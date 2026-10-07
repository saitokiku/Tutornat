'use client';

// The club schedule — Subject Clinics, Homework Hall, and the weekly free
// Community Hall — plus "My sessions" (join the video room, cancel a seat).
//
// Pricing psychology, per the shop plan: a member should see "Included with
// your membership" where a price tag would otherwise be — the server sends a
// per-room quote for THIS caller, so the UI never does price math.
//
// Honest up front rather than at cancellation:
//   - the min-fill rule on clinics ("runs once N join")
//   - the 12-hour refund window, and WHY it is stricter than 1:1
//
// Guardian consent is required in the UI and re-checked server-side; the
// checkbox here is a prompt, not the control. A parent booking for a managed
// teen passes childId — the server verifies the relationship.
//
// Occupancy (0029): full rooms stay visible with "Full. Join the list"; a
// seat that fills mid-checkout offers the list inline; included seats ask for
// a confirm tap (unconfirmed ones release ~4h before start, visit returned);
// a cancel offers the emptiest same-kind rooms to rebook into.
//
// Restyled onto the one system (spec: 2026-08-22-one-system-rebuild.md): one
// palette, one type scale, one radius scale, and the ink pill as the primary
// action so crossing /pricing into a booking sheet does not change the action
// color. Figures (times, prices, counts) are set in mono, because those are
// the parts of a seat the record actually asserts. Behavior is untouched.

import { useState, useEffect, useCallback } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import { IconCheck, IconX, IconCalendar } from '@/components/Icons';
import { money } from '@/lib/format';
import { GROUP_REFUND_WINDOW_HOURS } from '@/lib/server/sessionStates';
import VideoCall from '@/components/VideoCall';
import HallBoard from '@/components/HallBoard';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Field from '@/components/ui/Field';
import KindBadge from '@/components/ui/KindBadge';
import { roomDateTime, CLUB_TIMEZONE } from '@/lib/roomTime';

// IN THE ROOM'S ZONE, NEVER THE READER'S.
//
// This was `new Date(iso).toLocaleString([], …)` with an empty locale array and
// no timeZone — i.e. whatever zone the browser happens to be in. On the page a
// parent actually books from, a 6:00 PM Austin room read 7:00 PM to a family
// visiting Atlanta and 4:00 PM to one in California. lib/roomTime.js exists to
// kill exactly this and every other surface was migrated to it in wave 2; this
// component was missed because its rows carry the zone and never read it.
//
// The fallback is the CLUB's zone, not the reader's: a room with no zone on the
// row is a club room, and the club is in Austin.
function when(iso, timezone) {
  return roomDateTime(iso, timezone || CLUB_TIMEZONE);
}

function duration(a, b) {
  const mins = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  return mins >= 60 ? `${Math.round(mins / 60 * 10) / 10}h` : `${mins}m`;
}

// How far out a seat is, said the way a person would say it — the warning has
// to be checkable against the clock in the student's head, not a decimal.
function hoursOutLabel(hours) {
  if (hours < 1) return 'in under an hour';
  const h = Math.round(hours);
  if (h < 48) return `in about ${h} ${h === 1 ? 'hour' : 'hours'}`;
  return `in about ${Math.round(hours / 24)} days`;
}

// What THIS seat actually has at stake — read by BOTH the question asked before
// a release and the answer shown after it, so the two cannot say different
// things about the same seat. They did: the dialog branched on what the seat
// cost, the notice underneath it echoed the server's DELETE message, which is
// written for a seat that cost money, and a free Community Hall seat was told
// the truth and then contradicted a beat later in the same view.
//
// Branch on what the seat COST, never on `paid` alone: a free Community Hall
// seat settles with paid=true meaning "settled, nothing owed", so reading that
// flag as money would tell the student a payment they never made is forfeited
// — the opposite of the truth, and of the carve-out /terms discloses, on the
// one club product that is live and free today.
function releaseStake(seat) {
  const hoursOut = (new Date(seat.start).getTime() - Date.now()) / 3600000;
  const free = seat.bookedVia === 'free' || seat.kind === 'community_free';
  return {
    hoursOut,
    // Exactly what groupRefundEligible decides server-side, from the same
    // constant, so the sentence and the refund can't drift apart.
    refundable: hoursOut >= GROUP_REFUND_WINDOW_HOURS,
    free,
    // null = nothing was ever taken, so there is nothing to give back and
    // nothing to forfeit. Saying "not refunded" there is a scare, not a
    // disclosure.
    stake: free ? null
      : seat.bookedVia === 'included' ? 'included visit'
      : seat.paid ? 'payment'
      : null,
  };
}

// The consequence of releasing THIS seat, in plain words, asked before we do it.
function releaseWarning(seat) {
  const { hoursOut, refundable, free, stake } = releaseStake(seat);

  let tail;
  if (free) {
    tail = 'This one is free, so there’s nothing to pay back and nothing to forfeit. '
      + 'Releasing it frees the seat up for another student waiting for one.';
  } else if (!stake) {
    tail = 'Nothing was charged for it, but the seat goes to the next student waiting, and you may not get it back.';
  } else if (refundable) {
    tail = `It starts ${hoursOutLabel(hoursOut)}, so your ${stake} comes back${stake === 'included visit' ? ' on your allowance' : ' in full'}.`;
  } else {
    tail = `It starts ${hoursOutLabel(hoursOut)}, inside the ${GROUP_REFUND_WINDOW_HOURS}-hour window, so your ${stake} is forfeited and does NOT come back.`;
  }
  return `Release your seat in ${seat.topic || seat.subject || 'this session'}?\n\n${tail}`;
}

// …and the answer, in the terms the question was asked in.
//
// The server's DELETE message assumes a seat that cost money — outside the
// refund window it says the payment is not refunded — so echoing it for a free
// or never-charged seat contradicts the dialog the student just agreed to. Two
// inputs, and nothing else: what the seat cost (known here) and whether money
// or a visit actually went back (`refunded`, known only to the server, which is
// the side that talked to Stripe). Where they disagree we say so rather than
// pick the happier one.
function releaseResult(seat, data) {
  const { refundable, free, stake } = releaseStake(seat);
  if (!stake) {
    return free
      ? 'Seat released. It was a free seat, so there’s nothing to refund, and it’s open now for the next student waiting.'
      : 'Seat released. Nothing was charged for it, and it’s open now for the next student waiting.';
  }
  if (data?.refunded) {
    return stake === 'included visit'
      ? 'Seat released. Your included visit is back on your allowance.'
      : 'Seat released. Your payment is refunded in full.';
  }
  if (!refundable) {
    return `Seat released. It starts inside the ${GROUP_REFUND_WINDOW_HOURS}-hour window, so your ${stake} isn’t returned. A late drop can cancel the session for the others.`;
  }
  // The dialog promised it back and the server did not confirm it: a refund
  // Stripe refused, or one already recorded against this seat. Claiming it came
  // back would be the same defect pointed the other way, and so would declaring
  // it lost — so this says exactly what is known, which is that we could not
  // confirm it.
  return `Seat released, but we couldn’t confirm your ${stake} came back. Contact support with this session and we’ll settle it.`;
}

// The price corner of a room row. The figure is mono and tabular because it is
// a record value; "Included with your membership" replaces it outright for a
// member, and the UI never computes either one.
function QuoteTag({ quote, seatPriceCents }) {
  if (!quote) {
    return <div className="font-opmono text-t3 font-semibold tabular-nums text-ink">{money(seatPriceCents)}</div>;
  }
  if (quote.mode === 'free') return <div className="text-sm font-semibold text-good">Free</div>;
  if (quote.mode === 'included') {
    return <div className="text-xs font-semibold leading-tight text-good">Included with<br />your membership</div>;
  }
  return (
    <div>
      <div className="font-opmono text-t3 font-semibold tabular-nums text-ink">{money(quote.amountCents)}</div>
      {quote.mode === 'member' && <div className="text-xs text-good">member price</div>}
      {quote.mode === 'retail' && <div className="text-xs text-muted">per seat</div>}
    </div>
  );
}

export default function DropInSessions({ onClose, childId = null, childName = null, initialSessionId = null }) {
  const [tab, setTab] = useState('schedule');          // 'schedule' | 'mine'
  const [state, setState] = useState({ loading: true });
  const [mine, setMine] = useState({ loading: true });
  const [kindFilter, setKindFilter] = useState('');
  const [booking, setBooking] = useState(null);        // the room being booked
  const [consent, setConsent] = useState(false);
  const [bring, setBring] = useState('');
  // Structured Hall intake (v2 §3): the tutor's brief is only as good as what
  // the student tells us at booking, so Halls ask four pointed questions
  // instead of one blank box.
  const [intake, setIntake] = useState({ subject: '', topic: '', stuck: '', goal: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [call, setCall] = useState(null);              // {sessionId, title}
  // One channel, two states. Everything lands here — "Booked." and "Could not
  // confirm the seat." alike — so a failure in success green reads as done, the
  // family stops, and an unconfirmed included seat releases at T-4h. Same split
  // /billing keeps between its notice and error banners.
  const [notice, setNotice] = useState(null);          // { ok, text } | null
  const [jumped, setJumped] = useState(false);
  const [waitBusy, setWaitBusy] = useState(null);      // session id mid-waitlist action
  const [fullOffer, setFullOffer] = useState(false);   // seat filled mid-checkout → offer the list
  const [confirming, setConfirming] = useState(null);  // seat id mid-confirm
  const [alts, setAlts] = useState(null);              // rebooking offers after a cancel

  const load = useCallback(async () => {
    try {
      const qs = kindFilter ? `?kind=${kindFilter}` : '';
      const r = await authedFetch(`/api/tutoring/group${qs}`);
      const d = await r.json().catch(() => ({}));
      if (d.notProvisioned || d.demo) { setState({ loading: false, notProvisioned: true, demo: Boolean(d.demo) }); return; }
      if (!r.ok) { setState({ loading: false, error: d.error || 'Could not load.' }); return; }
      setState({ loading: false, sessions: d.sessions || [], hallRemaining: d.hallRemaining });
    } catch {
      setState({ loading: false, error: 'Could not load the schedule.' });
    }
  }, [kindFilter]);

  const loadMine = useCallback(async () => {
    try {
      const qs = childId ? `?mine=1&childId=${encodeURIComponent(childId)}` : '?mine=1';
      const r = await authedFetch(`/api/tutoring/group${qs}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMine({ loading: false, error: d.error || 'Could not load.' }); return; }
      setMine({ loading: false, seats: d.seats || [] });
    } catch {
      setMine({ loading: false, error: 'Could not load your sessions.' });
    }
  }, [childId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab, loadMine]);

  // Deep-link from /schedule: land straight on the confirm sheet for the room
  // the visitor clicked, instead of making them find it again.
  useEffect(() => {
    if (jumped || !initialSessionId || !state.sessions) return;
    setJumped(true);
    const s = state.sessions.find((x) => x.id === initialSessionId);
    if (s && !s.alreadyBooked && !s.isFull) openBooking(s);
  }, [state.sessions, initialSessionId, jumped]);

  function openBooking(s) {
    setBooking(s); setConsent(false); setBring(''); setError(''); setFullOffer(false);
    // Clinics have a fixed subject; Halls ask because one room spans subjects.
    setIntake({ subject: s.kind === 'clinic' ? (s.subject || '') : '', topic: '', stuck: '', goal: '' });
  }

  const isHall = (k) => k === 'homework_hall' || k === 'community_free';

  async function book() {
    if (!booking || !consent || busy) return;
    setBusy(true); setError('');
    // Halls send the structured intake; `bring` stays as the composed fallback
    // every existing surface (tutor brief, emails) already renders.
    const hall = isHall(booking.kind);
    const cleaned = Object.fromEntries(
      Object.entries(intake).map(([k, v]) => [k, String(v || '').trim().slice(0, 300)]).filter(([, v]) => v)
    );
    const composed = hall
      ? [cleaned.subject, cleaned.topic && `working on: ${cleaned.topic}`, cleaned.stuck && `stuck on: ${cleaned.stuck}`, cleaned.goal && `goal: ${cleaned.goal}`].filter(Boolean).join(' · ')
      : bring;
    try {
      const r = await authedFetch('/api/tutoring/group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: booking.id, guardianConsent: true, bring: composed,
          ...(hall && Object.keys(cleaned).length ? { intake: cleaned } : {}),
          ...(childId ? { childId } : {}),
          returnPath: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || 'Could not book that seat.');
        // The seat filled mid-checkout — the sheet offers the list right here.
        if (d.waitlistable) setFullOffer(true);
        return;
      }
      // Member/retail seats go to Stripe Checkout; free/included seats are
      // booked the moment the server says so.
      if (d.url) { window.location.href = d.url; return; }
      setBooking(null);
      setAlts(null);
      setNotice({ ok: true, text: d.mode === 'included' ? 'Booked, and an included visit was used.' : 'Booked.' });
      load();
      if (tab === 'mine') loadMine();
    } finally {
      setBusy(false);
    }
  }

  async function waitlistPost(action, sessionId) {
    const r = await authedFetch('/api/tutoring/group', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId, ...(childId ? { childId } : {}) }),
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  }

  // "Full. Join the list" / "Leave the list" on a schedule row. The server is
  // the truth on membership; reload rather than guessing locally.
  async function toggleWaitlist(s) {
    if (waitBusy) return;
    setWaitBusy(s.id);
    try {
      const action = s.alreadyWaitlisted ? 'unwaitlist' : 'waitlist';
      const { ok, d } = await waitlistPost(action, s.id);
      setNotice({
        ok,
        text: ok
          ? d.message || (action === 'waitlist'
            ? 'You’re on the list. We’ll email you the moment a seat opens.'
            : 'You’re off the list.')
          : d.error || 'Could not update the list. Try again in a moment.',
      });
      load();
    } catch {
      setNotice({ ok: false, text: 'Could not update the list. Try again in a moment.' });
    } finally {
      setWaitBusy(null);
    }
  }

  // The 409 {waitlistable} path: join the list from inside the booking sheet.
  async function joinListFromSheet() {
    if (!booking || waitBusy) return;
    setWaitBusy(booking.id);
    try {
      const { ok, d } = await waitlistPost('waitlist', booking.id);
      if (ok) {
        setBooking(null);
        setNotice({ ok: true, text: d.message || 'You’re on the list. We’ll email you the moment a seat opens.' });
        load();
      } else if (d.code === 'seats_open') {
        // A seat freed again while they read the sheet — let them book it.
        setFullOffer(false);
        setError('A seat just opened back up. Reserve it below.');
      } else {
        setError(d.error || 'Could not join the list. Try again in a moment.');
      }
    } catch {
      setError('Could not join the list. Try again in a moment.');
    } finally {
      setWaitBusy(null);
    }
  }

  // Confirm-or-release: a tap here keeps an included seat out of the T-4h
  // release sweep. Idempotent server-side.
  async function confirmSeat(seatId) {
    if (confirming) return;
    setConfirming(seatId);
    try {
      const r = await authedFetch('/api/tutoring/group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', seatId }),
      });
      const d = await r.json().catch(() => ({}));
      setNotice({ ok: r.ok, text: r.ok ? 'Confirmed. See you there.' : d.error || 'Could not confirm the seat.' });
      loadMine();
    } catch {
      setNotice({ ok: false, text: 'Could not confirm the seat.' });
    } finally {
      setConfirming(null);
    }
  }

  // Releasing a seat is irreversible and, inside the window, costs the family
  // real money — so it asks first, the way the 1:1 cancel already does. The
  // question names what THIS seat loses: a paid clinic seat and a free
  // Community Hall seat look identical in the row above, and only one of them
  // is free to change your mind about.
  async function cancelSeat(seat) {
    const seatId = seat?.seatId;
    if (!seatId) return;
    if (!window.confirm(releaseWarning(seat))) return;
    const r = await authedFetch('/api/tutoring/group', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId }),
    });
    const d = await r.json().catch(() => ({}));
    // Our own sentence, not the server's: releaseResult and releaseWarning read
    // the same seat through releaseStake, so the answer can never contradict
    // the question. On a refusal there is nothing to describe but the error.
    setNotice({
      ok: r.ok,
      text: r.ok ? releaseResult(seat, d) : (d.error || 'Could not release the seat.'),
    });
    // The canceller gets somewhere to land: same-kind rooms, emptiest first,
    // exactly as the server ordered them.
    setAlts(r.ok && Array.isArray(d.alternatives) && d.alternatives.length ? d.alternatives : null);
    loadMine(); load();
  }

  // One tap on an alternative opens the normal booking sheet (quote, consent
  // and all) — the suggestion row carries too little to book from directly.
  async function bookAlternative(id) {
    try {
      const r = await authedFetch('/api/tutoring/group');
      const d = await r.json().catch(() => ({}));
      const s = r.ok ? (d.sessions || []).find((x) => x.id === id) : null;
      if (!s || s.isFull || s.alreadyBooked) {
        setNotice({ ok: false, text: 'That room just changed. The Schedule tab has what’s open now.' });
        load();
        return;
      }
      setAlts(null);
      openBooking(s);
    } catch {
      setNotice({ ok: false, text: 'Could not load that room. Try the Schedule tab.' });
    }
  }

  if (call) {
    return (
      <VideoCall group sessionId={call.sessionId} title={call.title}
        headerExtra={call.seatId && isHall(call.kind) ? <HelpFlag seatId={call.seatId} /> : null}
        sidePanel={isHall(call.kind) ? <HallBoard sessionId={call.sessionId} role="student" /> : null}
        onClose={() => { setCall(null); loadMine(); }} />
    );
  }

  if (state.loading) {
    return <Shell onClose={onClose}><p className="py-10 text-center text-sm text-muted">Finding sessions…</p></Shell>;
  }
  if (state.notProvisioned) {
    return (
      <Shell onClose={onClose}>
        <p className="py-10 text-center text-sm text-muted">
          {state.demo
            ? 'Live sessions need a real account. This demo runs without one.'
            : 'The schedule isn’t open yet. First sessions are being set up.'}
        </p>
      </Shell>
    );
  }

  const sessions = state.sessions || [];

  // ── Booking confirmation ──────────────────────────────────────────────────
  if (booking) {
    const q = booking.quote;
    // The included branch stays one plain string: it is the sentence a member
    // reads where a price would be, and it is pinned by the member-journey e2e.
    const priceLine = q?.mode === 'free' ? 'Free'
      : q?.mode === 'included' ? 'Included with your membership'
      : (
        <>
          <span className="font-opmono tabular-nums">{money(q?.amountCents ?? booking.seatPriceCents)}</span>
          {` for ${childName ? `${childName}'s` : 'your'} seat`}
        </>
      );
    return (
      <Shell onClose={() => setBooking(null)} title={booking.topic || booking.subject}>
        <div className="space-y-4">
          <div className="k-card-sm space-y-1.5 p-4">
            <Row
              label="When"
              value={
                <>
                  <span className="font-opmono tabular-nums">{when(booking.start, booking.timezone)}</span>
                  {' · '}
                  <span className="font-opmono tabular-nums">{duration(booking.start, booking.end)}</span>
                </>
              }
            />
            <Row label="Tutor" value={booking.tutor.name} />
            <Row label="Price" value={priceLine} />
            <Row
              label="Group"
              value={<>up to <span className="font-opmono tabular-nums">{booking.capacity}</span> students</>}
            />
            {childName && <Row label="For" value={childName} />}
          </div>

          {isHall(booking.kind) ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink">
                What are you bringing?{' '}
                <span className="font-normal text-muted">(30 seconds, and it&apos;s how your tutor plans the room)</span>
              </p>
              {[
                ['subject', 'Subject', 'e.g. Algebra I'],
                ['topic', 'Assignment / topic', 'e.g. worksheet 4.2, problems 1 to 18'],
                ['stuck', 'Where you’re stuck', 'e.g. negative signs flip when I distribute'],
                ['goal', 'Done looks like…', 'e.g. all 18 problems finished'],
              ].map(([key, label, ph]) => (
                <Field
                  key={key}
                  label={label}
                  value={intake[key]}
                  onChange={(e) => setIntake((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={ph}
                  maxLength={300}
                  controlClassName="px-3 py-2 text-sm"
                />
              ))}
            </div>
          ) : (
            <Field
              as="textarea"
              label="What do you want to bring? (optional)"
              hint="Your tutor sees this before the session starts."
              value={bring}
              onChange={(e) => setBring(e.target.value)}
              rows={2}
              placeholder="e.g. tomorrow's quiz on quadratics, or question 7 I keep getting wrong"
              controlClassName="px-3 py-2 text-sm resize-none"
            />
          )}

          {/* Same consent gate as 1:1. Re-checked server-side against the
              account, because a checkbox is not consent for a minor. */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-sm border border-border bg-panel2 p-3">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 shrink-0 accent-accent" />
            <span className="text-xs text-muted">
              {childId
                ? 'I am this student’s parent/guardian and approve this live video session.'
                : 'A parent or guardian knows about and approves this live video session.'}
            </span>
          </label>

          {/* The refund window only means something to a seat that costs
              something. Telling a free Community Hall seat that "shorter notice
              isn't refunded" is the same contradiction the release flow had:
              a forfeit warned about where nothing was ever charged. */}
          <p className="text-xs text-muted">
            {booking.kind === 'homework_hall'
              ? 'Homework Hall is shared academic support: students work independently and the tutor rotates through the room clearing blockers. It isn’t private tutoring for several people at once.'
              : (booking.kind === 'community_free' || q?.mode === 'free')
                ? 'This seat is free, so there’s nothing to refund if plans change, but please release it if you can’t make it, so it goes to the next student waiting.'
                : `Free cancellation up to ${GROUP_REFUND_WINDOW_HOURS} hours before. Shorter notice isn’t refunded: a late drop can take the group below its minimum and cancel it for everyone else.`}
          </p>

          {error && <Notice kind="bad">{error}</Notice>}

          {fullOffer ? (
            <Button block onClick={joinListFromSheet} disabled={waitBusy === booking.id}>
              {waitBusy === booking.id ? 'Joining…' : 'Join the list, and we’ll email you if a seat opens'}
            </Button>
          ) : (
            <Button block onClick={book} disabled={!consent || busy}>
              {busy ? 'Booking…'
                : q?.mode === 'free' ? 'Reserve for free'
                : q?.mode === 'included' ? 'Reserve and use an included visit'
                : (
                  <>
                    Reserve for{' '}
                    <span className="font-opmono tabular-nums">
                      {money(q?.amountCents ?? booking.seatPriceCents)}
                    </span>
                  </>
                )}
            </Button>
          )}
        </div>
      </Shell>
    );
  }

  // ── Browse + my sessions ──────────────────────────────────────────────────
  return (
    <Shell onClose={onClose} title={childName ? `Sessions for ${childName}` : 'Sessions'}>
      {/* The segmented switch is ink-on-paper: it selects a view, so it is the
          same action color as every other primary control in the product. */}
      <div className="mb-3 inline-flex gap-1 rounded-full border border-border bg-panel2 p-1">
        {[['schedule', 'Schedule'], ['mine', 'My sessions']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === id ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {notice && (
        <Notice kind={notice.ok ? 'ok' : 'bad'} className="mb-3">
          <span className="flex items-start gap-2">
            {notice.ok && <IconCheck size={14} className="mt-0.5 shrink-0 text-good" />}
            <span>{notice.text}</span>
          </span>
        </Notice>
      )}

      {tab === 'mine' ? (
        <>
          {/* After a cancel: same-kind rooms with space, emptiest first. */}
          {alts && (
            <div className="k-card mb-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-ink">Other times this week</span>
                <button type="button" onClick={() => setAlts(null)} aria-label="Dismiss suggestions"
                  className="shrink-0 text-muted transition-colors hover:text-ink"><IconX size={14} /></button>
              </div>
              <div className="mt-2 space-y-2.5">
                {alts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{a.topic || a.subject}</div>
                      <div className="text-xs text-muted">
                        <span className="font-opmono tabular-nums">{when(a.start, a.timezone)}</span>
                        {' · '}
                        <span className="font-opmono tabular-nums">{a.seatsLeft}</span>
                        {a.seatsLeft === 1 ? ' seat left' : ' seats left'}
                      </div>
                    </div>
                    <Button size="sm" className="shrink-0" onClick={() => bookAlternative(a.id)}>Book</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <MySeats mine={mine} onJoin={(s) => setCall({ sessionId: s.sessionId, title: s.topic || s.subject, seatId: s.seatId, kind: s.kind })}
            onCancel={cancelSeat} onConfirm={confirmSeat} confirming={confirming} />
        </>
      ) : (
        <>
          {/* Rose marks the chosen filter. It is a selection, not an action. */}
          <div role="group" aria-label="Session kind" className="mb-3 flex flex-wrap gap-1.5">
            {[['', 'All'], ['homework_hall', 'Homework Hall'], ['clinic', 'Clinics'], ['community_free', 'Community Hall']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setKindFilter(id)} aria-pressed={kindFilter === id}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  kindFilter === id
                    ? 'border-accent bg-accent text-paper'
                    : 'border-border bg-panel2 text-muted hover:text-ink'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {Number.isFinite(state.hallRemaining) && state.hallRemaining > 0 && (
            <p className="mb-3 text-xs text-good">
              <span className="font-opmono tabular-nums">{state.hallRemaining}</span> included Homework Hall{' '}
              {state.hallRemaining === 1 ? 'visit' : 'visits'} left this month.
            </p>
          )}

          {state.error && <Notice kind="bad" className="mb-3">{state.error}</Notice>}

          {sessions.length === 0 ? (
            <div className="py-10 text-center">
              <IconCalendar size={28} className="mx-auto text-muted" />
              <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
                No sessions scheduled right now. New times get posted through the week.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((s) => {
                return (
                  <div key={s.id} className="k-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* The one kind map, from lib/roomKinds.js. The local one
                              this replaced had no `standing_seat` entry, so its
                              `|| KIND_BADGE.clinic` fallback badged a $550 seat
                              room "Clinic"; it also said "Clinic" for
                              "Subject Clinic" and toned the free Community Hall
                              `warn` where the canonical map says `muted`. */}
                          <KindBadge kind={s.kind} />
                          {s.gradeBand && s.gradeBand !== 'all' && (
                            <span className="k-badge k-badge-muted">
                              {s.gradeBand === 'college' ? 'College' : `Grades ${s.gradeBand}`}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 truncate text-body font-semibold text-ink">
                          {s.topic || s.subject}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          <span className="font-opmono tabular-nums">{when(s.start, s.timezone)} · {duration(s.start, s.end)}</span>
                          {' · '}{s.tutor.name}
                        </div>
                        {s.description && (
                          <p className="mt-1.5 line-clamp-2 text-xs text-muted">{s.description}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <QuoteTag quote={s.quote} seatPriceCents={s.seatPriceCents} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <SeatDots filled={s.filled} capacity={Math.min(s.capacity, 12)} />
                      <span className="flex-1 text-xs text-muted">
                        {s.isFull ? 'Full' : s.seatsLeft === 1 ? '1 seat left' : `${s.seatsLeft} seats left`}
                        {/* Say the min-fill rule up front, not at cancellation. */}
                        {!s.confirmed && s.filled < s.willRunAt && (
                          <span className="text-muted/70"> · runs once {s.willRunAt} join</span>
                        )}
                        {s.confirmed && s.kind === 'clinic' && s.minSeats > 1 && <span className="text-good"> · confirmed</span>}
                      </span>
                      {s.alreadyBooked ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-good">
                          You’re in <IconCheck size={13} />
                        </span>
                      ) : s.isFull ? (
                        s.alreadyWaitlisted ? (
                          <span className="shrink-0 text-right">
                            <span className="flex items-center justify-end gap-1 text-xs font-semibold text-good">
                              On the list <IconCheck size={13} />
                            </span>
                            <button type="button" onClick={() => toggleWaitlist(s)} disabled={waitBusy === s.id}
                              className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink disabled:opacity-50">
                              {waitBusy === s.id ? 'Leaving…' : 'Leave the list'}
                            </button>
                          </span>
                        ) : (
                          <Button size="sm" variant="secondary" className="shrink-0"
                            onClick={() => toggleWaitlist(s)} disabled={waitBusy === s.id}>
                            {waitBusy === s.id ? 'Joining…' : 'Full. Join the list'}
                          </Button>
                        )
                      ) : (
                        <Button size="sm" className="shrink-0" onClick={() => openBooking(s)}>Join</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

// The Hall help flag (v2 §3): green = working fine, yellow = check on me,
// red = blocked. The tutor's roster sorts Red → Yellow → Green, so flipping
// this is how a student "raises a hand" without interrupting the room.
//
// The three emoji circles are now token dots (good/warn/bad), so the flag
// carries the same status hues as every other state in the product instead of
// whatever the reader's emoji font paints.
function HelpFlag({ seatId }) {
  const [status, setStatus] = useState('green');
  const [saving, setSaving] = useState(false);

  async function flip(next) {
    if (saving || next === status) return;
    setSaving(true);
    const prev = status;
    setStatus(next);
    try {
      const r = await authedFetch('/api/tutoring/group/roster', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, helpStatus: next }),
      });
      if (!r.ok) setStatus(prev);
    } catch {
      setStatus(prev);
    } finally {
      setSaving(false);
    }
  }

  const FLAGS = [
    ['green', 'bg-good', 'Working fine'],
    ['yellow', 'bg-warn', 'Check on me'],
    ['red', 'bg-bad', 'I’m stuck'],
  ];
  return (
    <span className="ml-3 flex items-center gap-1" title="Let your tutor know how it’s going">
      {FLAGS.map(([id, dot, label]) => (
        <button key={id} type="button" onClick={() => flip(id)} aria-label={label} title={label}
          aria-pressed={status === id}
          className={`rounded-full p-1.5 transition-opacity ${status === id ? 'bg-panel2 opacity-100' : 'opacity-40 hover:opacity-80'}`}>
          <span className={`block h-2.5 w-2.5 rounded-full ${dot}`} />
        </button>
      ))}
    </span>
  );
}

function MySeats({ mine, onJoin, onCancel, onConfirm, confirming }) {
  if (mine.loading) return <p className="py-8 text-center text-sm text-muted">Loading…</p>;
  if (mine.error) return <Notice kind="bad">{mine.error}</Notice>;
  const seats = (mine.seats || []).filter((s) => s.sessionStatus !== 'cancelled');
  if (!seats.length) {
    return <p className="py-8 text-center text-sm text-muted">No booked sessions yet. The Schedule tab has this week’s times.</p>;
  }
  const now = Date.now();
  return (
    <div className="space-y-2.5">
      {seats.map((s) => {
        const startsMs = new Date(s.start).getTime();
        const joinable = s.status === 'booked' && s.paid
          && startsMs - now < 15 * 60000
          && new Date(s.end).getTime() > now - 30 * 60000;
        const upcoming = startsMs > now;
        return (
          <div key={s.seatId} className="k-card p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{s.topic || s.subject}</div>
                <div className="mt-1 text-xs text-muted">
                  <span className="font-opmono tabular-nums">{when(s.start, s.timezone)}</span> · {s.kindLabel} · {s.tutorName}
                  {s.bookedVia === 'included' && <span className="text-good"> · included visit</span>}
                  {s.bookedVia === 'free' && <span className="text-good"> · free</span>}
                  {s.confirmed && (
                    <span className="inline-flex items-center gap-1 text-good"> · confirmed <IconCheck size={12} /></span>
                  )}
                </div>
              </div>
              {joinable ? (
                <Button size="sm" className="shrink-0" onClick={() => onJoin(s)}>Join video</Button>
              ) : upcoming ? (
                <button type="button" onClick={() => onCancel(s)}
                  className="shrink-0 text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink">
                  Cancel
                </button>
              ) : (
                <span className="shrink-0 text-xs text-muted">{s.sessionStatus}</span>
              )}
            </div>
            {/* Confirm-or-release: only included seats the sweep could touch. */}
            {s.needsConfirm && upcoming && (
              <div className="mt-2.5">
                <Button size="sm" onClick={() => onConfirm(s.seatId)} disabled={confirming === s.seatId}>
                  {confirming === s.seatId ? 'Confirming…' : 'Confirm you’re coming'}
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <p className="pt-1 text-xs text-muted">
        The video room opens 15 minutes before each session. Cancelling more than{' '}
        <span className="font-opmono tabular-nums">{GROUP_REFUND_WINDOW_HOURS}</span> hours out
        refunds your payment or returns your included visit; a free seat has nothing to return either way.
        {seats.some((s) => s.needsConfirm) && (
          <> Included-visit seats ask for a quick confirm, and a seat left unconfirmed is released
          about 4 hours before start, with the visit going back on your allowance.</>
        )}
      </p>
    </div>
  );
}

function SeatDots({ filled, capacity }) {
  return (
    <span className="flex shrink-0 gap-1" aria-label={`${filled} of ${capacity} seats taken`}>
      {Array.from({ length: capacity }, (_, i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i < filled ? 'bg-accent' : 'bg-border'}`} />
      ))}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline gap-3 text-xs">
      <span className="w-14 shrink-0 text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function Shell({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-md border border-border bg-panel p-5 shadow-lift sm:rounded-md"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          {title && <h2 className="font-brand text-t3 font-semibold text-ink">{title}</h2>}
          <button type="button" onClick={onClose} aria-label="Close"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel2 text-muted transition-colors hover:text-ink">
            <IconX size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
