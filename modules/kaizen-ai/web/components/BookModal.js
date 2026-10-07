'use client';

// The 1:1 booking sheet, extracted from TutorBooking so every surface books
// through the same flow: the dashboard card, the public tutor profile
// (signed in), and the parent /family dashboard (childId set). One modal,
// one POST /api/tutoring/sessions — pricing, guardian gates, and the intro
// offer live server-side and cannot drift between entry points.
//
// The rate on each tutor row is QUOTED, never typed: this sheet used to print
// a hand-written 30-minute/hourly pair that had never existed in
// clubPricing.js, so the point of sale under-quoted what the server charges
// (audit 2026-08-18, H6). Retail rides along on the tutors payload
// (`pricing`), exactly as the tutor profile renders it; a member sees their
// own rate, derived from the same pricing law the booking route applies —
// which prices against the CALLER's plan even when a parent books for a teen.

// The guardian refusal is rendered here rather than echoed from the server.
// The server's copy for `guardian_consent_required` says "We emailed them a
// link" — true for a teen who gave us a guardian address at signup, and a flat
// falsehood for the accounts that carry no birth year and no guardian at all
// (migration 0007 backfilled birth_year as NULL, so that is every account older
// than the column). Those users were told to chase an email nobody had sent. So
// this sheet reads what is actually on file and offers the real next step:
// add a guardian address, re-send to the one we have, or — if they are an adult
// whose row simply predates the birth_year column — state their birth year once
// in Settings.
//
// Restyled onto the one system (spec: 2026-08-22-one-system-rebuild.md). The
// change that matters: "Continue to payment" is now the ink pill, the same
// primary action as /pricing and /billing, so the color of the button that
// takes money no longer depends on which surface you reached it from. Rose is
// left where it belongs, marking the selected tutor and the selected slot.

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { authedFetch, supabase } from '@/lib/supabaseClient';
import { when } from '@/lib/format';
import { IconCheck, IconX, IconArrowRight } from '@/components/Icons';
import { RETAIL, privateQuote, formatPrice as dollars } from '@/lib/server/clubPricing';
import Button from '@/components/ui/Button';

export default function BookModal({
  courses = [],
  preselectId = null,
  childId = null,       // parent booking on a managed/linked child's behalf
  returnPath = null,    // where Stripe Checkout should land back (local path)
  onClose,
  onBooked,
}) {
  const [tutors, setTutors] = useState(null);
  const [pricing, setPricing] = useState(null);   // house retail, from the tutors payload
  const [plan, setPlan] = useState(null);         // the caller's plan → their member rate
  const [tutor, setTutor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [subject, setSubject] = useState(courses[0]?.name || '');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const pickTutor = useCallback(async (t) => {
    setTutor(t); setSlotId(''); setSlots([]);
    const r = await authedFetch(`/api/tutoring/availability?tutorId=${t.id}`);
    if (r.ok) setSlots((await r.json()).slots || []);
  }, []);

  useEffect(() => {
    authedFetch('/api/tutoring/tutors').then(async (r) => {
      const d = r.ok ? await r.json() : {};
      const list = d.tutors || [];
      setTutors(list);
      if (d.pricing) setPricing(d.pricing);
      if (preselectId) {
        const match = list.find((t) => t.id === preselectId);
        if (match) pickTutor(match);
      }
    });
  }, [preselectId, pickTutor]);

  // The caller's plan, for a member quote. Failing to read it just means the
  // sheet quotes retail — the honest high number, never a low one.
  useEffect(() => {
    authedFetch('/api/entitlements/me')
      .then(async (r) => { if (r.ok) setPlan((await r.json()).plan || null); })
      .catch(() => { /* retail it is */ });
  }, []);

  // What the row prints. Member plans quote their own 1:1 rate; everyone else
  // gets the retail the server sent (falling back to the same constant the
  // server built it from). privateQuote is pure — the exact function the
  // booking route prices with.
  const rate = useMemo(() => {
    const retail = {
      c30: pricing?.private30Cents ?? RETAIL.private30Cents,
      c60: pricing?.private60Cents ?? RETAIL.private60Cents,
      member: false,
    };
    if (!plan) return retail;
    const q30 = privateQuote({ plan, minutes: 30 });
    const q60 = privateQuote({ plan, minutes: 60 });
    if (q30.mode !== 'member' && q60.mode !== 'member') return retail;
    // ai_hall quotes 1:1 at plain retail (an AI subscriber is not a member),
    // so only call it member pricing when the number actually differs.
    const c30 = q30.amountCents;
    const c60 = q60.amountCents;
    return { c30, c60, member: c30 !== retail.c30 || c60 !== retail.c60 };
  }, [pricing, plan]);

  // What the guardian gate refused, and what this account can actually do about
  // it. `guardian` is null until we've looked; {} means we couldn't look.
  const [needsGuardian, setNeedsGuardian] = useState(false);
  const [guardian, setGuardian] = useState(null);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  // The gated party is the STUDENT. When a parent books for a linked teen we
  // can't read that teen's row (0011 grants select on your own profile only),
  // and we shouldn't pretend to — the teen's own account is where this gets
  // fixed, so say that instead of guessing.
  const loadGuardianState = useCallback(async () => {
    if (childId) { setGuardian({ forChild: true }); return; }
    if (!supabase) { setGuardian({}); return; }
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { setGuardian({}); return; }
      const { data } = await supabase.from('profiles')
        .select('birth_year,is_minor,guardian_email,guardian_consent_at')
        .eq('id', auth.user.id).maybeSingle();
      setGuardian(data || {});
    } catch { setGuardian({}); }
  }, [childId]);

  async function book() {
    setMsg(''); setNeedsGuardian(false); setResendMsg('');
    if (!tutor || !slotId) { setMsg('Pick a tutor and a time.'); return; }
    if (!consent) { setMsg('Guardian consent is required for a live session.'); return; }
    setBusy(true);
    const res = await authedFetch('/api/tutoring/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutorId: tutor.id, slotId, subject, note, guardianConsent: true,
        ...(childId ? { childId } : {}),
        ...(returnPath ? { returnPath } : {}),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (d.code === 'guardian_consent_required') {
        // Deliberately NOT surfacing d.error — see the note at the top of this
        // file. The panel below says what is true for this particular account.
        setNeedsGuardian(true);
        setGuardian(null);
        loadGuardianState();
      } else {
        setMsg(d.error || 'Could not book.');
      }
      return;
    }
    if (d.url) { window.location.href = d.url; return; } // pay-per-session checkout
    onBooked(d.introFree);
  }

  // One call for both cases: with an address it sets the guardian and sends;
  // without one it re-sends to whoever is already on file. The route reports
  // whether an email actually went out, so this never claims one did.
  async function sendGuardian(email) {
    setResendMsg('Sending…');
    const r = await authedFetch('/api/family/guardian-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(email ? { guardianEmail: email } : {}),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setResendMsg(d.error || 'Could not send.'); return; }
    if (d.sentTo) setGuardian((g) => ({ ...(g || {}), guardian_email: d.sentTo }));
    setResendMsg(d.alreadyConsented
      ? '✓ Already approved. Try booking again.'
      : `✓ Approval email sent to ${d.sentTo}. Book again once they've clicked it.`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full space-y-4 overflow-y-auto rounded-t-md border border-border bg-panel p-5 shadow-lift sm:max-w-md sm:rounded-md">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-brand text-t3 font-semibold text-ink">{childId ? 'Book a tutor for your teen' : 'Book a live tutor'}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel2 text-muted transition-colors hover:text-ink">
            <IconX size={15} />
          </button>
        </div>

        {tutors === null ? (
          <p className="py-4 text-center text-sm text-muted">Loading tutors…</p>
        ) : tutors.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No tutors are available yet. Check back soon.</p>
        ) : (
          <>
            {rate.member && (
              <p className="text-xs text-muted">Rates shown are your member pricing.</p>
            )}
            <div className="space-y-2">
              {tutors.map((t) => (
                <button key={t.id} type="button" onClick={() => pickTutor(t)}
                  aria-pressed={tutor?.id === t.id}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${tutor?.id === t.id ? 'border-accent bg-accent/5' : 'border-border bg-panel2'}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{t.display_name}</span>
                    {/* Quoted, never typed: both figures come from the pricing law. */}
                    <span className="shrink-0 font-opmono text-xs tabular-nums text-muted">{dollars(rate.c30)}/30 min · {dollars(rate.c60)}/hr</span>
                  </div>
                  {(t.headline || t.bio) && <p className="mt-1 line-clamp-2 text-xs text-muted">{t.headline || t.bio}</p>}
                  {t.subjects?.length > 0 && <div className="mt-1 text-xs text-accent">{t.subjects.join(' · ')}</div>}
                </button>
              ))}
            </div>

            {tutor && (
              <>
                <div>
                  <span className="text-sm font-medium text-ink">Time</span>
                  {slots.length === 0 ? (
                    <p className="mt-1 text-xs text-muted">No open slots for {tutor.display_name} right now.</p>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      {slots.map((s) => (
                        <button key={s.id} type="button" onClick={() => setSlotId(s.id)}
                          aria-pressed={slotId === s.id}
                          className={`rounded-sm border px-2 py-2 font-opmono text-xs tabular-nums transition-colors ${slotId === s.id ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-border text-ink hover:border-ink/30'}`}>
                          {when(s.start_at)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject / topic"
                  className="k-input px-3 py-2.5 text-sm" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What do you want help with? (optional)"
                  className="k-input resize-none px-3 py-2.5 text-sm" />

                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 shrink-0 accent-accent" />
                  <span>
                    {childId
                      ? <>I&apos;m this student&apos;s parent/guardian and I approve this live video session.</>
                      : <>If I&apos;m under 18, my parent/guardian has approved this live video session.</>}{' '}
                    Sessions are private 1:1 video and are <b className="font-semibold text-ink">not recorded</b>. You can report any
                    concern from inside the session or at any time from the safety page.
                  </span>
                </label>

                <p className="k-card-sm px-3 py-2.5 text-xs text-muted">
                  <b className="font-semibold text-ink">Your first session is free</b>, applied automatically at booking. After that, payment is
                  collected securely at checkout. Cancel for a <b className="font-semibold text-ink">full refund up to 24 hours</b> before your
                  session; cancellations within 24 hours aren’t refundable.
                </p>

                {msg && <p className="text-xs text-bad">{msg}</p>}
                {needsGuardian && (
                  <div className="space-y-2 rounded-sm border border-bad/30 bg-bad/10 px-3 py-3">
                    <p className="text-sm font-semibold text-ink">
                      Live video needs a parent or guardian&apos;s approval first.
                    </p>

                    {guardian === null ? (
                      <p className="text-xs text-muted">Checking what&apos;s on file…</p>
                    ) : guardian.forChild ? (
                      <p className="text-xs text-muted">
                        This student&apos;s account isn&apos;t approved for live video yet, and only their own
                        account can start that. Ask them to open Settings and add a parent or guardian
                        email. We&apos;ll send the approval link there.
                      </p>
                    ) : guardian.guardian_email ? (
                      <>
                        <p className="text-xs text-muted">
                          We have <b className="font-semibold text-ink">{guardian.guardian_email}</b> on file. We&apos;ll email
                          them a link. Ask them to click <b className="font-semibold text-ink">Approve live tutoring</b>, then book again.
                        </p>
                        <button type="button" onClick={() => sendGuardian(null)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline">
                          Send the approval email <IconArrowRight size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted">
                          We don&apos;t have a parent or guardian email for your account, so{' '}
                          <b className="font-semibold text-ink">nothing has been sent yet</b>. Add one and we&apos;ll email them a link to
                          approve live 1:1 video.
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)}
                            type="email" placeholder="Parent or guardian's email"
                            className="k-input min-w-0 flex-1 px-3 py-2 text-xs"
                          />
                          <Button size="sm" variant="secondary" className="shrink-0"
                            onClick={() => sendGuardian(guardianEmail.trim())} disabled={!guardianEmail.trim()}>
                            Send
                          </Button>
                        </div>
                      </>
                    )}

                    {/* `=== null` rather than `== null`: an unreadable profile
                        comes back as {} and must not be told what's on file. */}
                    {guardian && !guardian.forChild && guardian.birth_year === null && (
                      <p className="text-xs text-muted">
                        18 or older? We have no birth year on file for your account. Accounts made
                        before we started asking never gave one, and we won&apos;t assume. Confirm it once
                        in{' '}
                        <Link href="/settings" className="font-semibold text-accent underline underline-offset-2">Settings</Link>{' '}
                        and live tutoring unlocks without a guardian.
                      </p>
                    )}

                    {/* A leading "✓" on the message marks success; it renders as the icon. */}
                    {resendMsg && (
                      <p className={`flex items-start gap-1.5 text-xs ${resendMsg.startsWith('✓') ? 'text-good' : 'text-muted'}`}>
                        {resendMsg.startsWith('✓') && <IconCheck size={13} className="mt-0.5 shrink-0" />}
                        <span>{resendMsg.replace(/^✓\s*/, '')}</span>
                      </p>
                    )}
                  </div>
                )}
                <Button block onClick={book} disabled={busy || !slotId || !consent}>
                  {busy ? 'Booking…' : 'Continue to payment'}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
