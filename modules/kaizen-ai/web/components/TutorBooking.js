'use client';

// Student-side live tutoring: browse active tutors, book an open slot (with a
// guardian-consent gate), join the video call for upcoming sessions, and rate
// completed ones. Rendered inside ProgressView. A ?bookTutor=<id> query param
// (deep-link from a public profile) opens the booking modal pre-focused on that
// tutor. No-ops gracefully when nothing is configured.
//
// Restyled onto the one system (spec: 2026-08-22-one-system-rebuild.md): the
// ink pill is the action here as it is on /pricing, the rating marks are icons
// on the shared 24px grid instead of "★" text set in the one gold hex that
// existed nowhere else in the product, and every figure is mono.

import { useState, useEffect, useCallback } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import { useHistoryLayer } from '@/lib/historyNav';
import VideoCall from '@/components/VideoCall';
import { IconX, IconStar, IconStarEmpty } from '@/components/Icons';
import BookModal from '@/components/BookModal';
import { when } from '@/lib/format';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';

export default function TutorBooking({ courses = [] }) {
  const [sessions, setSessions] = useState([]);
  const [booking, setBooking] = useState(false);
  const [preselect, setPreselect] = useState(null);
  const [call, setCall] = useState(null);
  const [review, setReview] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    const res = await authedFetch('/api/tutoring/sessions');
    if (res.ok) setSessions((await res.json()).asStudent || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Back button closes these layers instead of leaving the page.
  useHistoryLayer(booking, useCallback(() => setBooking(false), []), 'book');
  useHistoryLayer(Boolean(call), useCallback(() => setCall(null), []), 'call');
  useHistoryLayer(Boolean(review), useCallback(() => setReview(null), []), 'review');

  // Deep-links: ?bookTutor=<id> opens booking focused on a tutor; ?booking=paid|
  // cancelled reports the Stripe Checkout outcome. Strip params after reading so
  // a refresh doesn't repeat them.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('bookTutor');
    const outcome = params.get('booking');
    if (id) { setPreselect(id); setBooking(true); }
    if (outcome === 'paid') {
      // Verify against Stripe rather than trusting the redirect: reconcile
      // fulfills the paid session even if the webhook is slow/missing, so the
      // student never sees "booked" for a session that's still pending_payment.
      setNotice({ kind: 'ok', text: 'Confirming your payment…' });
      (async () => {
        try { await authedFetch('/api/billing/reconcile', { method: 'POST' }); } catch { /* fall through to load */ }
        await load();
        setNotice({ kind: 'ok', text: 'Payment received. Your session is booked. Check your email for the details.' });
      })();
    }
    if (outcome === 'cancelled') { setNotice({ kind: 'info', text: 'Checkout cancelled. The time was released, and you can book again any time.' }); }
    if (id || outcome) {
      const url = new URL(window.location.href);
      url.searchParams.delete('bookTutor');
      url.searchParams.delete('booking');
      // keep existing history state (tab/layer markers) intact
      window.history.replaceState(window.history.state || {}, '', url);
    }
  }, [load]);

  const upcoming = sessions.filter((s) => ['scheduled', 'in_progress'].includes(s.status));
  const toRate = sessions.filter((s) => s.status === 'completed' && !s.reviewed);

  // Same policy the booking sheet discloses: ≥24h out refunds in full, inside
  // 24h the seat is kept. The server enforces it; this only sets expectations.
  async function cancelSession(s) {
    const hoursOut = (new Date(s.scheduled_start).getTime() - Date.now()) / 3600000;
    const warning = hoursOut >= 24
      ? 'Cancel this session? You’ll get a full refund (or your credit back).'
      : 'This session starts in under 24 hours, so cancelling now is not refundable. Cancel anyway?';
    if (!window.confirm(warning)) return;
    const res = await authedFetch('/api/tutoring/sessions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, status: 'cancelled' }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setNotice({ kind: 'info', text: d.error || 'Could not cancel.' }); return; }
    setNotice({ kind: 'ok', text: 'Session cancelled.' });
    load();
  }

  return (
    <div className="k-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-brand text-t3 font-semibold text-ink">Live video tutoring</h2>
          <p className="mt-0.5 text-xs text-muted">Book a face-to-face session with a Kaizen tutor.</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => { setPreselect(null); setBooking(true); }}>
          Book a tutor
        </Button>
      </div>

      {notice && (
        // A failure lands in the neutral channel, never the green one: a refusal
        // painted as a confirmation is how a family stops reading.
        <Notice kind={notice.kind === 'ok' ? 'ok' : 'info'} className="mt-3 flex items-start gap-2">
          <span className="flex-1">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"
            className="shrink-0 text-muted transition-colors hover:text-ink">
            <IconX size={14} />
          </button>
        </Notice>
      )}

      {upcoming.length > 0 && (
        <div className="mt-4 divide-y divide-border border-t border-border">
          {upcoming.map((s) => {
            const soon = new Date(s.scheduled_start).getTime() - Date.now() < 15 * 60000;
            return (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{s.subject || 'Session'} · {s.tutorName}</div>
                  <div className="font-opmono text-xs tabular-nums text-muted">{when(s.scheduled_start)}</div>
                </div>
                {soon
                  ? <Button size="sm" className="shrink-0" onClick={() => setCall(s)}>Join</Button>
                  : (
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted">opens 15m before</span>
                      <button type="button" onClick={() => cancelSession(s)}
                        className="text-xs font-semibold text-bad underline-offset-2 hover:underline">
                        Cancel
                      </button>
                    </span>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {toRate.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="k-label mb-2">Rate your recent sessions</div>
          <div className="divide-y divide-border">
            {toRate.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{s.subject || 'Session'} · {s.tutorName}</div>
                  <div className="font-opmono text-xs tabular-nums text-muted">{when(s.scheduled_start)}</div>
                </div>
                <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setReview(s)}>
                  Rate <IconStar size={13} className="text-accent" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {booking && <BookModal courses={courses} preselectId={preselect} onClose={() => setBooking(false)}
        onBooked={(introFree) => {
          setBooking(false); load();
          if (introFree) setNotice({ kind: 'ok', text: 'Booked. Your first session is on us. Check your email for the details.' });
        }} />}
      {call && <VideoCall sessionId={call.id} title={`Session with ${call.tutorName}`} onClose={() => { setCall(null); load(); }} />}
      {review && <ReviewModal session={review} onClose={() => setReview(null)} onDone={() => { setReview(null); load(); }} />}
    </div>
  );
}

function ReviewModal({ session, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function submit() {
    setMsg('');
    if (!(rating >= 1 && rating <= 5)) { setMsg('Pick a star rating.'); return; }
    setBusy(true);
    const res = await authedFetch('/api/tutoring/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, rating, comment }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error || 'Could not submit review.'); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full space-y-4 rounded-t-md border border-border bg-panel p-5 shadow-lift sm:max-w-sm sm:rounded-md">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-brand text-t3 font-semibold text-ink">Rate your session</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel2 text-muted transition-colors hover:text-ink">
            <IconX size={16} />
          </button>
        </div>
        <p className="text-xs text-muted">{session.subject || 'Session'} with {session.tutorName}</p>
        {/* The marks are the glanceable part; the record stores the figure. */}
        <div className="flex justify-center gap-2 py-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}
              aria-label={`${n} out of 5`} aria-pressed={rating === n} className="transition-opacity hover:opacity-80">
              {n <= (hover || rating)
                ? <IconStar size={30} className="text-accent" />
                : <IconStarEmpty size={30} className="text-border" />}
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
          placeholder="What went well? (optional, shown publicly)"
          className="k-input resize-none px-3 py-2.5 text-sm" />
        {msg && <p className="text-xs text-bad">{msg}</p>}
        <Button block onClick={submit} disabled={busy || !rating}>
          {busy ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </div>
  );
}
