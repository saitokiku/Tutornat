'use client';

// /family — the page that belongs to the person paying for a standing seat.
//
// WHAT IT IS FOR (docs/superpowers/specs/2026-09-02-wave2-geometry.md).
// A parent opens this page with three questions, in this order: is my child's
// seat on Thursday and where is the room; what can they now do that they could
// not last month; and how is everything else going. So the page is built in
// that order — the seat, then the record, then the supporting lines — and the
// booking controls come last, because a family already in a room is not
// shopping.
//
// WHAT IT USED TO BE, AND WHY THAT WAS THE WORST SURFACE IN THE PRODUCT.
// It sold "your membership's included visits" to a payer whose membership is
// retired; it summarised the month as Homework Hall visits and an "included
// private session" — one retired product and one cut one; it offered "Book
// 1:1" and "your first session is on us" (both cut); its plan name had no key
// for `seat`, so a seat holder's own page could not name what they bought; and
// /api/family/summary already returned the confirmed-mastery block that makes
// $550 legible while this page rendered GPA, streak and open work instead. The
// number was computed, exported, and dropped at the last inch.
//
// The seat now arrives as ONE object (`mySeat` → /api/family/summary), not as
// N weekly rows with N one-way delete buttons, and ending it asks first and
// says what it does and does not cancel. Every room time is rendered with
// lib/roomTime in the ROOM's zone, never the reader's.
//
// Unchanged on purpose: the ?confirmSeat= deep link and its signed-out replay
// path, the Stripe return reconcile, the two message channels (a refusal
// painted green reads as a confirmation), and the guardian-consent flow in the
// add-a-teen form.

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { IconCheck, IconX, IconPlus, IconArrowRight } from '@/components/Icons';
import { authedFetch, cloudConfigured } from '@/lib/supabaseClient';
import { roomDateTime, slotWhen } from '@/lib/roomTime';
import { SEAT_PLAN } from '@/lib/server/clubPricing';
import DropInSessions from '@/components/DropInSessions';
import AppHeader from '@/components/ui/AppHeader';
import AppFooter from '@/components/ui/AppFooter';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import HeldState from '@/components/ui/HeldState';
import Stat from '@/components/ui/Stat';
import RoomCard from '@/components/ui/RoomCard';
import MasteryLine from '@/components/ui/MasteryLine';
import EmptyState from '@/components/ui/EmptyState';

// Only allowances this page has a sentence for are shown. `club_private_credit`
// is deliberately absent: the private 1:1 it meters is a cut product, and an
// allowance row is an offer whether or not it is worded as one.
const CLUB_LABEL = {
  club_seat_included: 'Sessions in their seat',
  club_hall_included: 'Homework Hall visits',
};

// What the payer is on. `seat` and `ai_solo` are the two things Kaizen sells,
// and neither had a name here — a standing-seat family's own page could not
// say what they had bought. The retired memberships keep their names because a
// legacy account still has to be able to read its own plan.
const PLAN_NAME = {
  seat: 'Standing Seat',
  ai_solo: 'Max AI',
  free: 'Free',
  club: 'Club',
  plus: 'Plus',
  max: 'Max',
  internal: 'Internal',
};

// One recipe for the "go to the other surface" link, same as /settings.
const JUMP = 'inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-ink transition-colors shrink-0';

export default function FamilyPage() {
  const [authed, setAuthed] = useState(null);
  const [children, setChildren] = useState(null);
  const [me, setMe] = useState(null);
  // Each teen's record, keyed by id: {loading} | {data} | {error}. Loaded with
  // the page rather than behind a "Progress" button, because the record IS the
  // page now.
  const [records, setRecords] = useState({});
  // One page-level line, two tones: a failure rendered in `good` green reads as
  // "it worked" to someone scanning, which is exactly backwards for
  // "Could not confirm that seat."
  const [msg, setMsg] = useState('');
  const [msgBad, setMsgBad] = useState(false);
  const [adding, setAdding] = useState(false);
  const [booking, setBooking] = useState(null);     // {childId, childName}
  const [openRecord, setOpenRecord] = useState(null); // the teen whose full record is open
  const [seatBump, setSeatBump] = useState(0);      // remounts each weekly-rooms section
  const [pendingConfirm, setPendingConfirm] = useState(false); // ?confirmSeat= waiting on sign-in
  const confirmedRef = useRef(false);               // one confirm per page load

  const say = useCallback((text, bad = false) => { setMsg(text); setMsgBad(Boolean(bad)); }, []);

  // The sign-in detour has to come back here. /dashboard is the student app's
  // onboarding intake; a payer creating an account to add a teen has no way
  // back to /family from inside a student syllabus flow. The breadcrumb carries
  // the query too, so an emailed ?confirmSeat= link survives the round trip and
  // finishes the confirm on return.
  const goSignIn = useCallback(() => {
    try {
      sessionStorage.setItem('kaizen.returnTo', window.location.pathname + window.location.search);
    } catch { /* private mode */ }
    window.location.assign('/dashboard');
  }, []);

  // One request per teen, in parallel, each landing on its own card. A slow or
  // failed record for one child must not blank the others.
  const loadRecords = useCallback(async (kids) => {
    await Promise.all((kids || []).map(async (c) => {
      // A refresh keeps what is already on screen. `load()` runs after every
      // action on this page, and blanking a child's seat and record back to
      // "Looking up…" because their grade was saved is a worse answer than the
      // slightly stale one it replaces.
      setRecords((r) => ({ ...r, [c.id]: { ...(r[c.id] || {}), loading: true } }));
      try {
        const res = await authedFetch(`/api/family/summary?studentId=${encodeURIComponent(c.id)}`);
        const d = await res.json().catch(() => ({}));
        setRecords((r) => ({
          ...r,
          [c.id]: res.ok ? { data: d } : {
            // 501 is the honest not-configured state — a preview deployment or
            // no database — and it is the one case where the route's own words
            // ("Supabase not configured") are written for the builder rather
            // than the buyer. The held-state voice answers it instead; every
            // other refusal is already a sentence a parent can act on.
            error: res.status === 501
              ? 'This record opens when the club opens.'
              : (d.error || 'We could not open this record just now.'),
          },
        }));
      } catch {
        setRecords((r) => ({ ...r, [c.id]: { error: 'We could not reach this record just now.' } }));
      }
    }));
  }, []);

  const load = useCallback(async () => {
    const [kidsRes, meRes] = await Promise.all([
      authedFetch('/api/family/children'),
      authedFetch('/api/entitlements/me'),
    ]);
    if (kidsRes.status === 401) { setAuthed(false); return; }
    setAuthed(true);
    let kids = [];
    if (kidsRes.ok) kids = (await kidsRes.json()).children || [];
    setChildren(kids);
    if (meRes.ok) setMe(await meRes.json());
    loadRecords(kids);
  }, [loadRecords]);
  useEffect(() => { load(); }, [load]);

  // Stripe Checkout returns here (?dropin= for group seats) when the booking
  // started on this page. Reconcile server-side rather than trusting the
  // redirect. ?booking= is still read because an older email or a bookmarked
  // return URL can still carry it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('booking') || params.get('dropin');
    if (!outcome) return;
    if (outcome === 'paid') {
      say('Confirming your payment…');
      (async () => {
        try { await authedFetch('/api/billing/reconcile', { method: 'POST' }); } catch { /* msg still updates */ }
        await load();
        say('Payment received. The session is booked, and the details are in your email.');
      })();
    } else {
      say('Checkout cancelled, so the seat was released. You can book again any time.', true);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('booking');
    url.searchParams.delete('dropin');
    window.history.replaceState(window.history.state || {}, '', url);
  }, [load, say]);

  // The confirm-or-release reminder email deep-links here (?confirmSeat=<id>):
  // confirm that seat straight away and say what happened. Idempotent
  // server-side, so a re-opened email link can't double-confirm anything.
  //
  // Auth has to resolve FIRST. Firing the authed POST while signed out 401s,
  // and stripping the param on the way out then destroys the family's only
  // handle on that seat — they tapped exactly what the email asked and the
  // seat still gets released at T-4h, with nothing on screen to say so. So:
  // wait for `authed`; when signed out, leave ?confirmSeat= in the URL, drop
  // the returnTo breadcrumb, and say plainly what has to happen next. The ref
  // keeps a re-render (or StrictMode's double invoke) from confirming twice.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (authed === null) return; // auth unresolved — consume nothing yet
    const params = new URLSearchParams(window.location.search);
    const seatId = params.get('confirmSeat');
    if (!seatId) return;
    if (!authed) {
      setPendingConfirm(true);
      try {
        sessionStorage.setItem('kaizen.returnTo', window.location.pathname + window.location.search);
      } catch { /* private mode */ }
      return;
    }
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    setPendingConfirm(false);
    (async () => {
      try {
        const res = await authedFetch('/api/tutoring/group', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm', seatId }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok) say('Confirmed. The place is held, and we will see you there.');
        else say(d.error || 'Could not confirm that place.', true);
      } catch {
        say('Could not confirm that place. Find it under your teen below and tap Confirm.', true);
      }
      setSeatBump((v) => v + 1);
    })();
    // Only now is the param spent, so a signed-out visit can still replay it.
    const url = new URL(window.location.href);
    url.searchParams.delete('confirmSeat');
    window.history.replaceState(window.history.state || {}, '', url);
  }, [authed, say]);

  if (authed === false) {
    return (
      <Shell>
        {/* The one held-state message, in the product's voice, directly above
            the surface it governs. It used to be a stranded grey line at the
            foot of the page telling the payer that this deployment needed a
            configured backend. */}
        {!cloudConfigured && <HeldState kind="family" className="mb-6" />}
        <Card pad="lg" className="text-center">
          {pendingConfirm ? (
            <>
              <p className="font-brand font-semibold text-t2">Sign in to confirm that place.</p>
              <p className="text-sm text-muted mt-2">
                We kept your link. Sign in and we&apos;ll confirm it for you the moment
                you&apos;re back. There is no need to reopen the email.
              </p>
            </>
          ) : (
            <>
              <p className="font-brand font-semibold text-t2">Sign in to manage your family.</p>
              <p className="text-sm text-muted mt-2">
                New here? Create your parent account first, then add your teens from this page.
              </p>
            </>
          )}
          <Button onClick={goSignIn} className="mt-5">Sign in</Button>
        </Card>
      </Shell>
    );
  }

  const plan = me?.plan || 'free';
  // Only allowances this page can name, and only ones the plan actually has.
  // A limit of 0 is "your plan does not include this", which is not a line
  // worth printing at the person paying for something else.
  const clubUsage = Object.entries(me?.club || {})
    .filter(([feature, u]) => CLUB_LABEL[feature] && u.limit !== 0);

  return (
    <Shell>
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            {/* One title size across the interior (see /settings, /billing and
                the dashboard sign-in). */}
            <h1 className="font-brand font-semibold text-d3 sm:text-d2">Your family</h1>
            {/* Only a plan the product has a name for is named here. `demo` is
                an internal token for an account with nothing behind it, and
                printing it told the payer they were on something called demo. */}
            <Link href="/billing" className={JUMP}>
              {PLAN_NAME[plan] ? `Plan: ${PLAN_NAME[plan]}` : 'Plan & billing'}
              <IconArrowRight size={14} />
            </Link>
          </div>
          <p className="text-sm text-muted">
            Where each teen&apos;s sessions meet, what they can now do without help, and everything
            else you might want to check.
          </p>
        </header>

        {/* The one held-state message, in the one place every interior page
            puts it: under the title, above the first card, so the payer reads
            whose page this is before they read what is closed on it. */}
        {!cloudConfigured && <HeldState kind="family" />}

        {/* Two channels, on purpose: a refusal never renders in the success
            one. It sits under the title because the things that write it —
            a payment return, an emailed confirm link — are about the page and
            not about any one card further down. */}
        {msg && (
          <Notice kind={msgBad ? 'bad' : 'ok'}>
            {!msgBad && <IconCheck size={14} className="inline align-[-2px] mr-1.5 text-good" />}{msg}
          </Notice>
        )}

        {/* Each teen: the seat, then the record, then everything else. */}
        <section className="space-y-4">
          {(children || []).map((c) => (
            <Card key={c.id} className="space-y-5">
              <div className="flex items-start gap-3">
                <span aria-hidden="true"
                  className="w-10 h-10 rounded-md bg-accent/10 text-accent font-brand font-semibold text-t3 flex items-center justify-center shrink-0">
                  {(c.name || '?').trim().slice(0, 1).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-brand font-semibold text-t3 text-ink truncate">{c.name}</p>
                  {c.grade_level && (
                    <p className="text-xs text-muted">
                      Grade <span className="font-opmono tabular-nums">{c.grade_level}</span>
                    </p>
                  )}
                </div>
              </div>

              {records[c.id]?.error ? (
                <Notice kind="bad">{records[c.id].error}</Notice>
              ) : (
                <>
                  <SeatBlock child={c} record={records[c.id]}
                    onDone={(m, bad) => { say(m, bad); load(); }} />
                  <RecordBlock record={records[c.id]} onOpen={() => setOpenRecord(c)} />
                </>
              )}

              {/* The weekly rows that are NOT the seat: a standing Homework
                  Hall, a place waiting on a confirm tap, an offer to make a
                  booked Hall weekly. */}
              <WeeklyRooms key={`${c.id}:${seatBump}`} child={c} />

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button size="sm" variant="secondary" onClick={() => setBooking({ childId: c.id, childName: c.name })}>
                  Book a drop-in
                </Button>
                <ChildEditor child={c} onSaved={() => { say('Saved.'); load(); }} />
              </div>
            </Card>
          ))}

          {children && children.length === 0 && !adding && (
            <Card pad="none">
              {/* There are no customers yet, so this is the state a real first
                  visitor actually lands on. It says what the page becomes and
                  what to press, rather than noting an absence. When the backend
                  is held the action renders disabled and the held message above
                  says why — a live-looking button over a closed door is the
                  thing this page keeps being tempted into. */}
              <EmptyState
                title="Add your first teen"
                action={
                  <Button onClick={() => setAdding(true)} disabled={!cloudConfigured}>
                    <IconPlus size={14} /> Add a teen (13+)
                  </Button>
                }
              >
                Add a profile and this page becomes their record: which evenings their seat meets and
                where, the concepts they have shown they can do without help, and the work still open.
                They get their own login; you stay the account that books and pays.
              </EmptyState>
            </Card>
          )}
          {children === null && <p className="text-sm text-muted text-center py-6">Loading…</p>}
        </section>

        {/* The account's month. It sits below the teens because it is a fact
            about the plan, not an answer to any of the three questions. */}
        {clubUsage.length > 0 && (
          <Card as="section">
            <h2 className="k-label">This month</h2>
            <div className="mt-3 space-y-2">
              {clubUsage.map(([feature, u]) => (
                <div key={feature} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{CLUB_LABEL[feature]}</span>
                  {/* An allowance we cannot resolve is not an unlimited one:
                      the placeholder says what is true rather than making a
                      promise this record cannot back. Same wording /billing
                      uses for the same case, and in the text face for the same
                      reason: mono carries figures, not English sentences. */}
                  {u.limit == null ? (
                    <span className="text-xs text-muted shrink-0">Not recorded</span>
                  ) : (
                    <span className="font-opmono text-xs tabular-nums text-muted shrink-0">
                      {`${u.used} used / ${u.limit} included`}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              These counts reset on the 1st of each month. If a week gets missed, ask us about a grace visit.
            </p>
          </Card>
        )}

        {/* Add a teen. An action that cannot work must not look like one that
            can: while family accounts are held, a full-width, full-contrast
            button 500px under "Family accounts open when the club opens" reads
            as entirely live. Same treatment the sign-in pill carries — the
            control renders disabled and says, inline, why. */}
        {(children === null || children.length > 0 || adding) && (
          <section>
            {!adding ? (
              <>
                <Button variant="secondary" block onClick={() => setAdding(true)} disabled={!cloudConfigured}>
                  <IconPlus size={14} /> Add a teen (13+)
                </Button>
                {!cloudConfigured && (
                  <p className="text-xs text-muted text-center mt-2">
                    Adding a teen opens when the club opens.
                  </p>
                )}
              </>
            ) : (
              <AddChildForm onDone={(m) => { setAdding(false); say(m); load(); }} onCancel={() => setAdding(false)} />
            )}
          </section>
        )}
      </div>

      {booking && (
        <DropInSessions childId={booking.childId} childName={booking.childName}
          onClose={() => { setBooking(null); setSeatBump((v) => v + 1); load(); }} />
      )}

      {openRecord && (
        <RecordModal child={openRecord} record={records[openRecord.id]} onClose={() => setOpenRecord(null)} />
      )}
    </Shell>
  );
}

// ── 1. The seat ──────────────────────────────────────────────────────────────
// The $550 product as ONE object. `mySeat` folds the two weekly standing rows
// a family holds back into the thing they bought, so this renders one card
// with one pattern, one venue, one named tutor and one way out — not two rows
// with two one-way delete buttons.
function SeatBlock({ child, record, onDone }) {
  // Only the FIRST read is a loading state; a refresh keeps the card it has.
  if (!record?.data) {
    return <p className="text-sm text-muted">Looking up {child.name}&apos;s seat…</p>;
  }
  const seat = record.data.seat;

  // "We could not look" is not "you have no seat". Saying the second to a
  // family paying for the first is the failure this branch exists to prevent.
  if (seat?.unavailable) {
    return (
      <div className="rounded-sm border border-dashed border-border p-4">
        <p className="text-sm font-medium text-ink">We could not check the seat just now</p>
        <p className="text-sm text-muted mt-1">
          This is a problem on our side, not a change to {child.name}&apos;s place. Nothing has been
          cancelled — reload in a moment, and tell us if it keeps saying this.
        </p>
      </div>
    );
  }

  if (!seat) {
    return (
      <div className="rounded-sm border border-dashed border-border p-4">
        <p className="text-sm font-medium text-ink">No standing seat yet</p>
        <p className="text-sm text-muted mt-1">
          A standing seat is a reserved place in the same small room —{' '}
          <span className="font-opmono tabular-nums">{SEAT_PLAN.seat.sessionsPerWeek}</span> evenings a
          week, <span className="font-opmono tabular-nums">{SEAT_PLAN.seat.minutes}</span> minutes,{' '}
          <span className="font-opmono tabular-nums">{SEAT_PLAN.seat.ratio}</span> students with one
          tutor, in person, one subject. Placement starts with a conversation, not a checkout.
        </p>
        <Link href="/tutoring" className={`${JUMP} mt-3`}>
          How the club works <IconArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const next = seat.next;
  // The badge already says "Standing Seat", so a cohort the director has not
  // titled must not print it a second time as its own subject line.
  const label = seat.subject || seat.title || '';
  const canEnd = (seat.standingIds || []).length > 0;
  // THE NEXT OCCASION OVERRIDES THE COHORT, and this is the whole point of the
  // instance carrying its own venue and zone (`group_session.venue`, 0033). A
  // Thursday moved to the annex is written on the room, not on the cohort, so a
  // card that renders only `seat.venue` sends a parent to last month's address.
  const venue = next?.venue || seat.venue || null;
  const timezone = next?.timezone || seat.timezone || null;
  return (
    <div>
      <p className="k-label">{child.name}&apos;s seat</p>
      <RoomCard
        className="mt-2"
        kind="standing_seat"
        title={label.trim().toLowerCase() === 'standing seat' ? null : label}
        slots={seat.slots}
        // The pattern ("Tuesdays and Thursdays, 6:00 PM") comes from the slots;
        // start and timezone are what a seat with no laid-out pattern falls
        // back to, and they keep that fallback in the ROOM's zone.
        start={next?.start || null}
        timezone={timezone}
        venue={venue}
        tutorName={seat.leadTutorName}
        note={seatNote(next)}
        action={canEnd ? <EndSeat seat={seat} childName={child.name} onDone={onDone} /> : null}
      />
    </div>
  );
}

// Three states, three sentences. "We could not read the calendar" and "nothing
// is on the calendar" are different facts, and printing the second when the
// first is true tells a family who pays for a reserved room that they have
// nothing coming up.
function seatNote(next) {
  if (next?.unavailable) {
    return 'We could not check the calendar just now — this line will fill in when we can reach it.';
  }
  if (!next?.start) return 'The next session shows here as soon as the room is on the calendar.';
  return (
    <>
      {/* The room's own zone, always. A 6 PM Austin room rendered "11:00 PM"
          to a server-side formatter and "4:00 PM" to a Californian, and this
          is the line a parent drives by. */}
      Next session <span className="font-opmono tabular-nums">{roomDateTime(next.start, next.timezone)}</span>
    </>
  );
}

// Ending a seat is a one-way door, so it asks first and says exactly what it
// does and does not do. The safe answer is the button; the destructive one is
// a quiet link, which is the opposite of how this used to read ("End weekly
// place", no confirmation, one tap, twice).
function EndSeat({ seat, childName, onDone }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const ids = seat.standingIds || [];
  if (!ids.length) return null;

  async function end() {
    setBusy(true); setErr('');
    let done = 0;
    try {
      // A seat is two weekly rows. They end together or the family is told
      // exactly how far it got — silently leaving one evening booked is how a
      // parent ends up driving to a room they thought they had left.
      //
      // `standingIds` is the SEAT's own rows and nothing else: `mySeat` scopes
      // them to the seat's series, so a weekly Homework Hall standing alongside
      // the seat is not in this loop. The confirmation below promises exactly
      // that, and the two have to keep saying the same thing.
      for (const standingId of ids) {
        const r = await authedFetch('/api/tutoring/group', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'unstanding', standingId }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setErr(done === 0
            ? (d.error || 'We could not end the seat, so nothing has changed.')
            : `We ended ${done} of ${ids.length} evenings and then hit a problem. Reload the page to see where it stands.`);
          return;
        }
        done += 1;
      }
      setAsking(false);
      onDone?.('Seat ended. Sessions already booked stay booked, a weekly Homework Hall place is untouched, and your billing is unchanged.');
    } catch {
      setErr('We could not reach the club just now. Nothing was changed.');
    } finally {
      setBusy(false);
    }
  }

  if (!asking) {
    return (
      <button onClick={() => setAsking(true)}
        className="text-xs text-muted underline underline-offset-2 hover:text-ink transition-colors">
        End this seat
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-border bg-panel2 p-4 space-y-3">
      <p className="text-sm font-medium text-ink">End {childName}&apos;s seat?</p>
      <p className="text-sm text-muted">
        This ends every evening of this seat and stops us booking new weeks. Sessions already booked
        stay booked, a weekly Homework Hall place is untouched, and it does not close
        your billing — write to us and we will do that with you.
      </p>
      {err && <p className="text-xs text-bad">{err}</p>}
      <div className="flex items-center gap-4">
        <Button size="sm" variant="secondary" onClick={() => { setAsking(false); setErr(''); }} disabled={busy}>
          Keep the seat
        </Button>
        <button onClick={end} disabled={busy}
          className="text-sm text-bad hover:underline underline-offset-2 disabled:opacity-40">
          {busy ? 'Ending…' : 'End the seat'}
        </button>
      </div>
    </div>
  );
}

// ── 2 and 3. What changed, then the supporting lines ─────────────────────────
// The record leads on CONFIRMED mastery and nothing else may lead here.
// Working mastery — "could do it with help" — is real, is shown to the learner
// inside the product, and never appears on a parent's page (hard rule 5); the
// server enforces that by never selecting it. GPA and streak are still
// available, one tap away, as what they are: school figures, not evidence.
function RecordBlock({ record, onOpen }) {
  if (!record?.data) return <p className="text-sm text-muted">Loading the record…</p>;
  const d = record.data;
  const m = d.mastery;
  const sessions = d.attendance?.sessionsThisMonth;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="k-label">What changed</p>
        <button onClick={onOpen} className={JUMP}>
          Full record <IconArrowRight size={14} />
        </button>
      </div>

      {m?.tracked ? (
        <MasteryLine className="mt-2" confirmed={m.confirmed} total={m.total} moved={m.moved || []} />
      ) : (
        // Not a confident zero. "0 of 0" at a parent reads as "your child has
        // learned nothing", which is the worst possible way to be wrong here.
        <p className="text-sm text-muted mt-2">
          Concept tracking is not switched on for this account yet, so there is nothing to show —
          this is not a score of zero.
        </p>
      )}

      <dl className="mt-4 border-t border-border">
        {/* The route answers `attendance: null` when it could not read the
            month, so this row is ABSENT rather than zero. "Sessions this month
            0" at a family that came every week is a lie the page would tell
            confidently, and it is the reason the count is nullable at all. */}
        {Number.isFinite(sessions) && <FactRow label="Sessions this month" value={sessions} />}
        <FactRow label="Open work" value={d.openAssignments ?? 0} />
      </dl>
    </div>
  );
}

// A row of fact, not a card of one: the system's own doctrine is that cards are
// for objects and rows of facts take a hairline. Mono on the right, because
// these are values you could check.
function FactRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-opmono text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function ChildEditor({ child, onSaved }) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState(child.grade_level || '');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  async function save() {
    setErr('');
    const res = await authedFetch('/api/family/children', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: child.id,
        gradeLevel: grade === '' ? null : Number(grade),
        ...(pw ? { newPassword: pw } : {}),
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error || 'Could not save.'); return; }
    setPw(''); setOpen(false); onSaved?.();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="text-xs text-muted underline underline-offset-2 hover:text-ink transition-colors">
        Edit grade / reset login
      </button>
    );
  }
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Labels wrap their control, so no id is invented and nothing on this
          page is labelled by its placeholder alone. */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Grade</span>
        <select value={grade} onChange={(e) => setGrade(e.target.value)}
          className="k-input text-sm py-2.5 appearance-none">
          <option value="">Not set</option>
          {[7, 8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">New password (optional)</span>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          className="k-input text-sm py-2.5" />
      </label>
      {err && <p className="sm:col-span-2 text-xs text-bad">{err}</p>}
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button size="sm" onClick={save}>Save</Button>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── The weekly rooms that are not the seat (0029) ────────────────────────────
// Rides GET /api/tutoring/group?mine=1&childId=: a standing Homework Hall with
// its end control, an included place waiting on the confirm-or-release tap, and
// the offer to make a booked Hall weekly. Membership and guardian rules are
// enforced server-side — this section renders the API's own messages rather
// than re-deciding them.
//
// The $550 seat is deliberately NOT drawn here: it is one object with its own
// card above, and drawing it twice is how the payer's own page came to show one
// purchase as two unrelated rows with two unconfirmed one-way delete buttons.
// If the record cannot be read the card above says so — an outage must not
// quietly hand back the version of this control that had no confirmation.
function WeeklyRooms({ child }) {
  const [data, setData] = useState(null); // {seats, standing} once loaded
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await authedFetch(`/api/tutoring/group?mine=1&childId=${encodeURIComponent(child.id)}`);
      const d = await r.json().catch(() => ({}));
      // Any failure (club closed, demo, not managed) just means no section.
      setData({ seats: (r.ok && d.seats) || [], standing: (r.ok && d.standing) || [] });
    } catch {
      setData({ seats: [], standing: [] });
    }
  }, [child.id]);
  useEffect(() => { load(); }, [load]);

  async function act(body, key, okMsg) {
    if (busy) return;
    setBusy(key); setNote(''); setErr('');
    try {
      const r = await authedFetch('/api/tutoring/group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || 'That didn’t go through. Try again.'); return; }
      setNote(d.message || okMsg || 'Done.');
      load();
    } finally {
      setBusy('');
    }
  }

  if (!data) return null;
  const now = Date.now();
  // standing[] spans every teen this account manages — keep this teen's rows,
  // and leave the seat to the card that owns it.
  const standing = data.standing
    .filter((s) => s.studentId === child.id)
    .filter((s) => s.kind !== 'standing_seat');
  const upcoming = data.seats.filter((s) =>
    s.sessionStatus !== 'cancelled' && s.status === 'booked' && new Date(s.start).getTime() > now);
  const needConfirm = upcoming.filter((s) => s.needsConfirm);
  const offers = [];
  if (!data.standing.some((s) => s.studentId === child.id)) {
    // A booked Hall seat that belongs to a weekly series can become a standing
    // seat (0029). seriesId rides the ?mine=1 payload, so no second fetch.
    const seen = new Set();
    for (const s of upcoming) {
      if (s.kind !== 'homework_hall' || !s.seriesId || seen.has(s.seriesId)) continue;
      seen.add(s.seriesId);
      offers.push(s);
    }
  }
  if (!standing.length && !offers.length && !needConfirm.length && !note && !err) return null;

  return (
    <Card variant="inset" pad="sm" className="space-y-3">
      <p className="k-label">Also on their week</p>
      {standing.map((s) => (
        <div key={s.standingId} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">
              {s.title || s.subject || s.kindLabel || 'Homework Hall'}
            </p>
            {/* A series stores a local wall-clock time, so this is already the
                time a parent reads off their own calendar. */}
            <p className="font-opmono text-xs tabular-nums text-muted truncate">
              {slotWhen(s.weekday, s.localStartTime, { long: true })}
            </p>
            {s.venue && <p className="text-xs text-muted truncate">{s.venue}</p>}
          </div>
          <button onClick={() => act({ action: 'unstanding', standingId: s.standingId }, s.standingId)}
            disabled={busy === s.standingId}
            className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-ink transition-colors disabled:opacity-40">
            {busy === s.standingId ? 'Ending…' : 'End weekly booking'}
          </button>
        </div>
      ))}
      {offers.map((s) => (
        <div key={s.seriesId} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{s.topic || s.subject || 'Homework Hall'}</p>
            <p className="font-opmono text-xs tabular-nums text-muted truncate">{roomDateTime(s.start)}</p>
          </div>
          <Button size="sm" variant="secondary" className="shrink-0"
            onClick={() => act({ action: 'standing', seriesId: s.seriesId, childId: child.id, guardianConsent: true }, s.seriesId)}
            disabled={busy === s.seriesId}>
            {busy === s.seriesId ? 'Setting up…' : 'Make this a weekly thing'}
          </Button>
        </div>
      ))}
      {needConfirm.map((s) => (
        <div key={s.seatId} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{s.topic || s.subject}</p>
            <p className="text-xs text-muted">
              {/* The ?mine=1 payload does not carry the room's own zone yet, so
                  this is the club's home zone, said once and on purpose —
                  never the reader's browser zone, which is the bug. */}
              <span className="font-opmono tabular-nums">{roomDateTime(s.start)}</span> · confirm to keep the place
            </p>
          </div>
          <Button size="sm" className="shrink-0"
            onClick={() => act({ action: 'confirm', seatId: s.seatId }, s.seatId, 'Confirmed. The place is held.')}
            disabled={busy === s.seatId}>
            {busy === s.seatId ? 'Confirming…' : 'Confirm'}
          </Button>
        </div>
      ))}
      {offers.length > 0 && (
        <p className="text-xs text-muted">
          A standing seat books the same Hall every week from your included visits. End it any time.
        </p>
      )}
      {/* Success and failure stay in separate channels, never one line with a tone flag. */}
      {note && (
        <p className="text-xs text-good">
          <IconCheck size={12} className="inline align-[-2px] mr-1" />{note}
        </p>
      )}
      {err && <p className="text-xs text-bad">{err}</p>}
    </Card>
  );
}

function AddChildForm({ onDone, onCancel }) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({ name: '', birthYear: '', gradeLevel: '', email: '', password: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create() {
    setErr(''); setBusy(true);
    try {
      const res = await authedFetch('/api/family/children', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, birthYear: Number(form.birthYear),
          gradeLevel: form.gradeLevel === '' ? null : Number(form.gradeLevel),
          email: form.email || undefined, password: form.password, consent,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || 'Could not create the profile.'); return; }
      onDone?.(`${d.child.name}'s profile is ready. They sign in with ${d.child.email}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section" className="space-y-4">
      <h3 className="font-brand font-semibold text-t2">Add a teen</h3>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">First name</span>
        <input value={form.name} onChange={set('name')} className="k-input text-sm py-2.5" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Birth year</span>
          <select value={form.birthYear} onChange={set('birthYear')}
            className="k-input text-sm py-2.5 appearance-none">
            <option value="">Select a year</option>
            {Array.from({ length: 7 }, (_, i) => currentYear - 13 - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Grade (optional)</span>
          <select value={form.gradeLevel} onChange={set('gradeLevel')}
            className="k-input text-sm py-2.5 appearance-none">
            <option value="">Not set</option>
            {[7, 8, 9, 10, 11, 12].map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Their email (optional)</span>
        <span className="text-xs text-muted">Leave this blank and we can make one up for them.</span>
        <input value={form.email} onChange={set('email')} type="email" className="k-input text-sm py-2.5" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Their login password</span>
        <span className="text-xs text-muted">At least 8 characters.</span>
        <input value={form.password} onChange={set('password')} type="password" className="k-input text-sm py-2.5" />
      </label>

      <label className="flex items-start gap-3 rounded-sm bg-panel2 border border-border p-4 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 shrink-0 accent-accent" />
        <span className="text-sm text-muted">
          I am this student&apos;s parent or legal guardian, and I consent to their participation,
          including live video sessions with Kaizen tutors.
        </span>
      </label>
      <p className="text-xs text-muted">Kaizen currently serves students ages 13 and up.</p>

      {err && <Notice kind="bad">{err}</Notice>}

      <div className="flex items-center gap-3">
        <Button onClick={create} disabled={!consent || busy}>
          {busy ? 'Creating…' : 'Create profile'}
        </Button>
        <button onClick={onCancel} className="text-sm text-muted hover:text-ink transition-colors">
          Cancel
        </button>
      </div>
    </Card>
  );
}

// The whole record, one tap from the card. It opens on the same confirmed
// figure the card leads with, so the two can never tell different stories, and
// the school figures sit underneath where they belong.
function RecordModal({ child, record, onClose }) {
  const loading = !record?.data && !record?.error;
  const data = record?.data;
  const error = record?.error;
  const m = data?.mastery;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/30 backdrop-blur-sm p-0 sm:p-5" onClick={onClose}>
      <div className="w-full max-w-narrow bg-panel rounded-t-md sm:rounded-md border border-border shadow-lift p-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="k-label">The record</p>
            <h2 className="font-brand font-semibold text-t2 text-ink truncate">{child.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-full bg-panel2 text-muted hover:text-ink transition-colors flex items-center justify-center shrink-0">
            <IconX size={14} />
          </button>
        </div>
        {loading && <p className="text-sm text-muted py-8 text-center">Loading…</p>}
        {!loading && !data && <p className="text-sm text-bad py-4">{error || 'Could not load the record.'}</p>}
        {!loading && data && (
          <div className="space-y-5">
            {m?.tracked ? (
              <MasteryLine size="lg" confirmed={m.confirmed} total={m.total} moved={m.moved || []} />
            ) : (
              <p className="text-sm text-muted">
                Concept tracking is not switched on for this account yet, so there is nothing to show —
                this is not a score of zero.
              </p>
            )}

            {(data.courses || []).length > 0 && (
              <div>
                <p className="k-label mb-1.5">School courses</p>
                <div className="k-card-sm p-4 space-y-2">
                  {data.courses.map((c) => (
                    <div key={c.name} className="flex items-center gap-2.5 text-sm">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="flex-1 text-ink truncate">{c.name}</span>
                      <span className="font-opmono text-xs font-semibold tabular-nums text-ink shrink-0">
                        {c.letter || '—'}{c.percent != null ? ` · ${Math.round(c.percent)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Demoted on purpose: a GPA measures a school's grading and a
                streak measures showing up. Neither is a claim about what the
                child can now do, which is what the seat is sold on. */}
            <div>
              <p className="k-label mb-1.5">Supporting figures</p>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="GPA" value={data.gpa == null ? '—' : data.gpa.toFixed(2)} />
                <MiniStat label="Streak" value={`${data.streak || 0}d`} />
                <MiniStat label="Open work" value={data.openAssignments ?? 0} />
              </div>
            </div>

            {data.latestReport ? (
              <div>
                <p className="k-label mb-1.5">
                  Latest report · <span className="tabular-nums">{new Date(data.latestReport.at).toLocaleDateString()}</span>
                </p>
                <div className="k-card-sm p-4 text-sm text-ink whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {data.latestReport.content}
                </div>
              </div>
            ) : (
              // The written summary is generated, not hand-written, so this
              // says what actually arrives and when — the claim the matrix
              // pins (the parent's window is courses, grades, homework and a
              // monthly summary by email).
              <p className="text-sm text-muted">
                No report yet. A monthly summary arrives by email once they&apos;ve been active.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// The record's figures, in the shared Stat primitive, boxed so a row of three
// reads as one strip. Same recipe as the summary strip in /settings.
function MiniStat({ label, value }) {
  return <Stat value={value} label={label} className="k-card-sm py-3 px-2 text-center" />;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <AppHeader width="prose" links={[{ href: '/schedule', label: 'Schedule' }]} />
      {/* One container for the whole page: header, body and footer on the same
          rail, so the wordmark, the h1 and the copyright line share one left
          edge. The reading measure is kept by constraining the column INSIDE
          the rail rather than by re-centering the body, which is what put the
          h1 204px to the right of the wordmark above it.
          The held message is no longer raised here: it belongs under the title,
          which is where each caller places it. */}
      <Section as="main" width="wide" space="tight" className="flex-1">
        <div className="max-w-prose">{children}</div>
      </Section>

      {/* A record should close, not trail off. */}
      <AppFooter />
    </div>
  );
}
