'use client';

// /diagnostic — buy the placement diagnostic, sit it, read the report a person
// wrote.
//
// Four acts, in order, and never more than one on screen: THE RECORD (the
// report, once it has been written — it outranks everything else on the page),
// THE OFFER (what it is, who it is for, what it costs, what it cannot promise),
// THE PLACEMENT (one question at a time, no hints, no feedback), THE HANDOFF
// ("your written report is coming from the person who will teach your child").
//
// WHAT THIS PAGE MAY NOT DO
//   - quote a price. Every figure interpolates from clubPricing.DIAGNOSTIC
//     (Hard Rule 2); test/priceTruth.test.mjs fails the build on a literal.
//   - promise a grade, a score, or a result. Placement is assisted evidence by
//     construction (lib/engine/placement.js) and confirms nothing, so the
//     finished run reports that it is done and hands off to a human. It shows
//     the learner no percentage and no rating.
//   - pretend to sell when it cannot. Unset Stripe, an unset
//     STRIPE_PRICE_DIAGNOSTIC, an unapplied migration 0036 and a club that has
//     not opened all mean one thing to a family — we cannot take your money
//     today — so the page says that once and puts a capture form under it. The
//     four causes stay on the envelope's `reason`, for the operator.
//   - guess whose child it is. A payer with children picks one before the
//     button does anything; see the note on the picker below.
//
// WHAT CHANGED, AND WHY (docs/superpowers/specs/2026-09-02-wave2-audit.md)
//   - It wore the APP shell while every other public page wears the marketing
//     Shell, so a parent arriving from /pricing crossed a seam into what looked
//     like a different site. Same chrome as its siblings now.
//   - It POSTed an empty body, so the purchase was stamped with the PAYER's id
//     and the child's baseline evidence accumulated on the parent's account.
//   - It never showed the report. The offer sells "a written report from a
//     person" and there was no surface anywhere that served one.
//   - In the state every visitor is actually in — no Stripe key, club closed —
//     it captured nothing at all, while the route's own refusal promised
//     "leave us your details".
//   - The sales header stayed mounted through the placement, so a 14-year-old
//     answered question 7 under a price and a credit sentence.
//
// It is a client component because the placement is a loop, and it reads its
// availability from the API rather than from env: a page cannot see server env,
// and guessing is how "not configured" becomes a silent broken button.

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { authedFetch, cloudConfigured } from '@/lib/supabaseClient';
import Shell from '@/components/dn/Shell';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Eyebrow from '@/components/ui/Eyebrow';
import InterestForm from '@/components/InterestForm';
import { IconArrowRight, IconSprout } from '@/components/Icons';
import { DIAGNOSTIC, formatPrice } from '@/lib/server/clubPricing';
import { CLUB_TIMEZONE } from '@/lib/roomTime';

// The report is Markdown a person typed. The renderer is lazy so react-markdown
// and KaTeX never weigh down a page most visitors reach with nothing to read.
const MessageBody = dynamic(() => import('@/components/MessageBody'), {
  ssr: false, loading: () => <span className="text-xs text-muted">…</span>,
});

// What the family is buying, in the order a parent asks about it. The third
// line is the one that matters commercially and is also the one that has to
// stay literally true: a person writes the report.
const WHAT_YOU_GET = [
  ['An adaptive assessment', 'Ten to fifteen questions that adjust as they go, so it finds the level in a few minutes rather than an hour. No hints, and nothing is timed.'],
  ['A starting point on the record', 'The result seeds your child’s place on the concept map — what is next, and what has to come first. It is a starting point, not a verdict.'],
  ['A written report from a person', 'The teacher who would work with your child reads the run and writes it up. That part is not automated and is not instant.'],
];

// An order that is still working its way through the funnel. Only these two
// states are worth interrupting the offer for. `pending` is not one of them: it
// is an abandoned checkout, and rendering it would tell a family they had
// bought something they were never charged for.
const OPEN_STATUSES = ['paid', 'scheduled'];

// A finished run that could NOT be attached to its order, said honestly.
//
// /api/engine/placement refuses to attach a run to an order it does not belong
// to and NAMES the refusal (placementBinding). The one that matters is
// `not_the_student`: a payer may pay, only the student may sit, because the run
// is written to whoever is signed in and a parent's answers are not evidence
// about a child. The page hides the button from a payer; the route is what
// enforces it, and this is what the page says when the route has.
//
// It replaces the handoff promise rather than sitting under it: no report was
// queued, so "your written report is coming" would be untrue.
const UNATTACHED = {
  not_the_student: 'This run stays on your own record. The assessment belongs to the student it was bought for — it only means anything if the answers are theirs — so ask them to sign in and open this page, and it will be waiting. Nothing more has been charged.',
  not_paid: 'This run isn’t attached to a paid assessment, so no report has been queued. Nothing has been charged.',
  refunded: 'That assessment was refunded, so no report has been queued and nothing more has been charged.',
};

function unattachedCopy(order) {
  if (!order || order.attached !== false) return '';
  return UNATTACHED[order.reason]
    || 'We couldn’t attach this run to your assessment, so no report has been queued yet. Nothing more has been charged — tell us and we’ll put it right.';
}

// A delivery is a Kaizen event, so it is dated in the club's own zone and not
// in whichever one the reader's laptop is set to — the same law lib/roomTime.js
// encodes for a room. A report delivered late on a Thursday in Austin should
// not read as Friday to a parent travelling.
function deliveredOn(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLUB_TIMEZONE, month: 'long', day: 'numeric', year: 'numeric',
  }).format(d);
}

// What a PARENT is told when the page cannot take money today.
//
// There used to be four strings here and every one of them was written for
// whoever deployed the site: "on this deployment", "isn't priced for online
// payment", "STRIPE_PRICE_DIAGNOSTIC". That is an engineering task handed to
// someone who came here to book an assessment for their kid. There are only two
// things a family can do about any of it — come back, or leave an address — so
// there are two answers.
//
// The cause is not lost, but be exact about where it went, because "the console
// reads it" would be a lie: /api/diagnostic returns `reason` on the raw
// envelope, and NO surface renders it as text — not this page, not the admin
// console, not /api/health. An operator standing a deployment up reads it by
// asking the endpoint (GET /api/diagnostic answers a signed-out caller too), or
// off the held block below, which carries it as `data-reason` for whoever has
// the page open with devtools. Putting it in the admin console is a follow-up.
function heldCopy(envelope) {
  if (!envelope) return '';
  if (envelope.reason === 'unreachable') {
    return 'Something went wrong at our end just now — nothing was charged. Reload in a moment, or leave your email below and we’ll come back to you.';
  }
  if (!envelope.configured) {
    return 'We can’t take payment for the diagnostic online yet. Leave your email and we’ll tell you the day it opens.';
  }
  if (envelope.notYetOpen) {
    return 'The diagnostic opens when the club opens, and nothing is charged in the meantime. Leave your email and we’ll tell you the day.';
  }
  return '';
}

export default function DiagnosticPage() {
  const [envelope, setEnvelope] = useState(null);   // availability + this family's orders
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Whose diagnostic this is. Deliberately starts empty: a purchase that
  // defaults to somebody is the defect this picker exists to close. The
  // refusal for "you haven't said" lives beside the button, not in the page's
  // status channel, because the picker is the context.
  const [studentId, setStudentId] = useState('');
  const [pickError, setPickError] = useState('');

  // Placement run state. `run` is whatever the route last returned: a question,
  // or the completion payload. `runOrderId` is the order it belongs to, held
  // separately because the order list is re-read while a run is in progress.
  const [run, setRun] = useState(null);
  const [runOrderId, setRunOrderId] = useState(null);
  const [choice, setChoice] = useState(null);
  const [draft, setDraft] = useState('');
  const [placing, setPlacing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/diagnostic');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'unreachable');
      setEnvelope(data);
    } catch {
      // Held is the safe answer: never render a Buy button off a failed read.
      // The reason is what the page renders — a raw fetch message would be one
      // more sentence written for an engineer.
      setEnvelope({ configured: false, reason: 'unreachable', notYetOpen: true, signedIn: false, students: [], orders: [] });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Back from Checkout. A redirect is not a payment — the webhook is what marks
  // the order paid — so this reports what the redirect said and re-reads the
  // record rather than asserting anything about money.
  //
  // It re-reads a FEW times, because the webhook usually lands within a second
  // or two of the redirect and occasionally does not. One read left a family
  // who had just been charged looking at a page with nothing on it but the buy
  // button they had already pressed. Five reads over fifteen seconds, then it
  // stops: a page that polls forever is a page that is lying about what it is
  // waiting for.
  useEffect(() => {
    let outcome = null;
    try { outcome = new URLSearchParams(window.location.search).get('order'); } catch { /* noop */ }
    if (!outcome) return undefined;
    try { window.history.replaceState({}, '', '/diagnostic'); } catch { /* noop */ }
    if (outcome === 'cancelled') {
      setError('Checkout was cancelled. Nothing was charged.');
      return undefined;
    }
    if (outcome !== 'paid') return undefined;
    setNotice('That went through. It can take a moment to reach us — the assessment appears below as soon as it does.');
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      load();
      if (tries >= 5) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [load]);

  const students = envelope?.students || [];
  const orders = envelope?.orders || [];
  const openOrders = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const held = Boolean(envelope) && (!envelope.configured || envelope.notYetOpen);
  const mustPick = students.length > 0 && !studentId;

  async function buy() {
    // The product's submit rule, from InterestForm and /contact: a submit is
    // always live and validates on press, and `disabled` means one thing only,
    // in flight. So an unanswered picker refuses here and says why, rather than
    // leaving a dead pill the parent has to guess at.
    if (mustPick) {
      setPickError('Choose who this is for — the diagnostic stays attached to the student who sits it.');
      return;
    }
    setPickError('');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await authedFetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId || null }),
      });
      const data = await res.json().catch(() => ({}));
      // 409 already_paid is the one refusal that is GOOD news: the route will
      // not open a second Checkout against an order Stripe has already taken
      // money for. Painted red it reads as a failure and invites a second
      // press, which is the thing being prevented.
      if (data.code === 'already_paid') {
        setNotice(data.error || 'That one is already paid for.');
        await load();
        return;
      }
      // 501 unconfigured / 503 held / 400 no child: all refusals, and a refusal
      // belongs in the red channel. Painted green it reads as a confirmation.
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not start checkout — nothing was charged.');
        await load();
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not start checkout — nothing was charged. Try again.');
    } finally {
      setBusy(false);
    }
  }

  // ── The placement loop ─────────────────────────────────────────────────────
  // Every request carries the order id, so a bought run is attached to the
  // order that paid for it and the order moves to 'scheduled' on completion.
  // The route refuses that transition on an unpaid order, so sending it is
  // never a way to skip the till.
  async function startPlacement(order) {
    setPlacing(true);
    setError('');
    try {
      const q = order ? `?orderId=${encodeURIComponent(order.id)}` : '';
      const res = await authedFetch(`/api/engine/placement${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || data.error || 'Could not start the assessment.'); return; }
      if (data.notProvisioned) { setError('We couldn’t open the assessment just now. Nothing more was charged — try again in a few minutes, and tell us if it keeps happening.'); return; }
      setRun(data);
      setRunOrderId(order?.id || null);
      setChoice(null);
      setDraft('');
    } catch {
      setError('Could not start the assessment.');
    } finally {
      setPlacing(false);
    }
  }

  async function answer() {
    if (!run?.attemptId) return;
    setPlacing(true);
    setError('');
    const response = run.item?.kind === 'mc' ? { choice } : { text: draft };
    try {
      const res = await authedFetch('/api/engine/placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: run.sessionId,
          attemptId: run.attemptId,
          orderId: runOrderId,
          response,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'That didn’t save — try again.'); return; }
      setRun(data);
      setChoice(null);
      setDraft('');
      if (data.done) await load();
    } catch {
      setError('That didn’t save — try again.');
    } finally {
      setPlacing(false);
    }
  }

  const answered = run?.item?.kind === 'mc' ? choice != null : draft.trim().length > 0;
  const price = formatPrice(DIAGNOSTIC.priceCents);
  // The sales header comes down the moment a run starts. A student answering
  // question seven should not be reading a price and a credit window over the
  // top of it; the h1 stays so the document still has one.
  const selling = !run;
  // Whether the finished run reached the order that paid for it. Empty is the
  // normal case: attached, or no order in play at all.
  const unattached = run?.done ? unattachedCopy(run.order) : '';

  return (
    <Shell active="diagnostic" tone="day">
      <Section width="prose" lead>
        <div className="space-y-6">
          <div>
            {selling && <Eyebrow>One-time</Eyebrow>}
            <h1 className="font-brand font-semibold text-d3 sm:text-d2 mt-2">{DIAGNOSTIC.label}</h1>
            {selling && (
              <p className="mt-3 text-body text-muted max-w-[56ch]">{DIAGNOSTIC.blurb}</p>
            )}
            {/* The credit belongs HERE, on the page where a family decides,
                not only on the price sheet. It is also why charging for a
                diagnostic at all is honest when every franchise nearby gives
                one away: this is a person's time, and it comes off the first
                month if they stay. Both figures interpolate — the window is a
                constant so the promise and the code that honours it cannot
                drift apart. */}
            {selling && DIAGNOSTIC.creditsTowardFirstMonth && (
              <p className="mt-3 text-sm text-muted max-w-[56ch]">
                <span className="font-opmono tabular-nums">{price}</span>, and it is credited in full
                against your first month if you take a standing seat within{' '}
                <span className="font-opmono tabular-nums">{DIAGNOSTIC.creditWindowDays}</span> days.
              </p>
            )}
          </div>

          <Notice kind="ok">{notice}</Notice>
          <Notice kind="bad">{error}</Notice>
          {!cloudConfigured && (
            <Notice kind="info">This is a preview. Your work stays in this browser.</Notice>
          )}

          {/* ── The placement, once it is running ───────────────────────────── */}
          {run && !run.done && run.item && (
            <Card as="section" pad="lg">
              <p className="k-label">
                Question <span className="font-opmono tabular-nums">{(run.answered || 0) + 1}</span>
                {' · '}about <span className="font-opmono tabular-nums">{run.maxItems}</span> in all
                {run.resumed ? ' · picking up where you left off' : ''}
              </p>
              <p className="mt-4 text-body font-medium text-ink">{run.item.body}</p>

              {run.item.kind === 'mc' ? (
                <div className="mt-4 space-y-2">
                  {(run.item.choices || []).map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setChoice(i)}
                      className={`w-full text-left rounded-sm border px-3.5 py-2.5 text-sm text-ink transition-colors ${
                        choice === i ? 'border-accent bg-accent/5' : 'border-border hover:border-ink/30'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Your answer…"
                  className="k-input bg-panel2 mt-4 py-2.5 text-sm resize-none"
                />
              )}

              <Button onClick={answer} disabled={!answered || placing} block className="mt-5">
                {placing ? 'Saving…' : 'Next question'}
              </Button>
              {/* Placement is measurement. Saying so removes the sting of a hard
                  question, which is the whole point of targeting ~50%. */}
              <p className="mt-3 text-xs text-muted text-center">
                No hints and no marking as you go — this is finding the level, not testing you.
                Some of these are meant to be too hard.
              </p>
            </Card>
          )}

          {/* ── The handoff ─────────────────────────────────────────────────── */}
          {run?.done && (
            <Card as="section" pad="lg">
              <div className="flex justify-center text-accent"><IconSprout size={28} /></div>
              <h2 className="mt-3 font-brand font-semibold text-t1 text-center">That’s the assessment done.</h2>
              {unattached ? (
                <p className="mt-3 text-sm text-ink text-center max-w-[52ch] mx-auto">{unattached}</p>
              ) : (
                <p className="mt-3 text-sm text-muted text-center max-w-[52ch] mx-auto">
                  Your written report is coming from the person who will teach your child. They read
                  the run themselves and write it up — so it takes a few days, not a few seconds.
                  It appears on this page when it is ready.
                </p>
              )}
              <p className="mt-4 text-xs text-muted text-center">
                <span className="font-opmono tabular-nums">{run.answered}</span> questions
                {' · '}<span className="font-opmono tabular-nums">{run.kcsSampled}</span> concepts sampled.
                Nothing here counts as mastery yet — that takes work done without help, later.
              </p>
              <Button href="/dashboard" variant="secondary" block className="mt-6">
                Back to the app <IconArrowRight size={15} />
              </Button>
            </Card>
          )}

          {selling && (
            <>
              {/* ── The record ───────────────────────────────────────────────
                  A delivered report outranks the offer, the price and every
                  other thing on this page: it is the thing that was bought.
                  publicOrder withholds report_md by design, so /api/diagnostic
                  releases it separately — delivered only, payer or student
                  only. See familyOrder in the route. */}
              {deliveredOrders.map((o) => (
                <Card key={o.id} as="section" pad="lg">
                  <p className="k-label">Your report</p>
                  <h2 className="mt-2 font-brand font-semibold text-t1">
                    {o.forViewer ? 'Your placement report' : `${o.studentName || 'Your child'}’s placement report`}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Delivered <span className="font-opmono tabular-nums">{deliveredOn(o.deliveredAt || o.createdAt)}</span>
                    {' · '}written by the person who read the run, not generated.
                  </p>
                  {o.report ? (
                    <div className="mt-5 text-sm border-t border-border pt-5"><MessageBody content={o.report} /></div>
                  ) : (
                    // Delivery requires a report (the admin route refuses to
                    // deliver without one), so an empty one here means
                    // something went wrong on our side, not theirs.
                    <Notice kind="info" className="mt-5">
                      This report isn’t showing up here.{' '}
                      <Link href="/contact" className="underline underline-offset-2">Tell us</Link>{' '}
                      and we’ll send it over.
                    </Notice>
                  )}
                </Card>
              ))}

              {/* ── Bought, not yet sat ─────────────────────────────────────
                  One card per order, because a family with two children has two
                  of these and two identical cards would be useless. */}
              {openOrders.map((o) => (
                <Card key={o.id} as="section" pad="lg">
                  <p className="k-label">{o.status === 'paid' ? 'Paid' : 'Assessment done'}</p>
                  <h2 className="mt-2 font-brand font-semibold text-t1">
                    {o.forViewer ? 'Your placement' : `${o.studentName || 'Your child'}’s placement`}
                  </h2>
                  {o.status === 'paid' ? (
                    o.forViewer ? (
                      <>
                        <p className="mt-2 text-sm text-muted max-w-[52ch]">
                          It takes a few minutes and can be sat now. Nothing is timed.
                        </p>
                        <Button onClick={() => startPlacement(o)} disabled={placing} block className="mt-4">
                          {placing ? 'Starting…' : 'Start the assessment'}
                        </Button>
                      </>
                    ) : (
                      // The run is written to whoever is signed in, so a parent
                      // sitting it would put their own answers on the child's
                      // baseline — and there would be nothing honest to write a
                      // report about.
                      <p className="mt-2 text-sm text-muted max-w-[52ch]">
                        {o.studentName || 'Your child'} sits this on their own account, signed in as
                        themselves — it only means anything if the answers are theirs. Ask them to
                        open this page and it will be waiting.
                      </p>
                    )
                  ) : (
                    <p className="mt-2 text-sm text-muted max-w-[52ch]">
                      The assessment is done. The written report is with the teacher now — it takes
                      a few days, not a few seconds, and it appears on this page when it is ready.
                    </p>
                  )}
                </Card>
              ))}

              {/* ── The offer ───────────────────────────────────────────────── */}
              <Card as="section" pad="lg">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="k-label">What it costs</p>
                  <p className="font-opmono text-d3 font-semibold tabular-nums">{price}</p>
                </div>
                <p className="mt-2 text-sm text-muted max-w-[52ch]">
                  Once. Not a membership, nothing recurs, and nothing is charged again.
                </p>

                <dl className="mt-6 border-t border-border divide-y divide-border">
                  {WHAT_YOU_GET.map(([term, body]) => (
                    <div key={term} className="py-4">
                      <dt className="text-sm font-semibold text-ink">{term}</dt>
                      <dd className="mt-1 text-sm text-muted max-w-[56ch]">{body}</dd>
                    </div>
                  ))}
                </dl>

                {envelope === null && <p className="mt-6 text-sm text-muted">Checking availability…</p>}

                {/* The page cannot take money today. Say so once, in the place
                    where the button would have been, and give the family the
                    one thing they can actually do — which is what the route's
                    own refusal already promises them. */}
                {held && (
                  // data-reason is the operator's copy of the cause and the
                  // only place any surface renders it: the family reads
                  // heldCopy, whoever is standing the deployment up reads this
                  // (or the envelope itself). It is an attribute rather than
                  // text because "price_unconfigured" is not a sentence for a
                  // parent.
                  <div className="mt-6 border-t border-border pt-6" data-reason={envelope.reason || (envelope.notYetOpen ? 'not_yet_open' : 'unknown')}>
                    <p className="text-sm text-ink max-w-[52ch]">{heldCopy(envelope)}</p>
                    <InterestForm
                      kind="diagnostic"
                      source="/diagnostic"
                      buttonLabel="Tell me when it opens"
                      className="mt-4"
                    />
                  </div>
                )}

                {envelope && !held && !envelope.signedIn && (
                  <Button href="/dashboard" block className="mt-6">
                    Sign in to book the diagnostic <IconArrowRight size={15} />
                  </Button>
                )}

                {envelope && !held && envelope.signedIn && (
                  <div className="mt-6">
                    {/* WHO IT IS FOR, chosen out loud. The page used to post an
                        empty body, which the route read as "the payer", so a
                        parent bought a placement recorded against her own
                        account and the child's baseline landed on the wrong
                        ledger. Nothing is preselected — with one child that is
                        one extra tap, and it buys an attachment nobody has to
                        unpick later. */}
                    {students.length > 0 && (
                      <fieldset className="border-t border-border pt-5">
                        <legend className="k-label">Who is this for?</legend>
                        <p className="mt-2 text-sm text-muted max-w-[52ch]">
                          The assessment and the report stay attached to the student who sits it.
                        </p>
                        <div className="mt-3 space-y-2">
                          {students.map((s) => (
                            <label
                              key={s.id}
                              className={`flex items-center gap-3 rounded-sm border px-3.5 py-2.5 text-sm text-ink cursor-pointer transition-colors ${
                                studentId === s.id ? 'border-accent bg-accent/5' : 'border-border hover:border-ink/30'
                              }`}
                            >
                              <input
                                type="radio"
                                name="diagnostic-student"
                                value={s.id}
                                checked={studentId === s.id}
                                onChange={() => { setStudentId(s.id); setPickError(''); }}
                                className="accent-accent"
                              />
                              {s.name}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    <Button onClick={buy} disabled={busy} block className="mt-5">
                      {busy ? 'Opening checkout…' : `Book the diagnostic · ${price}`}
                    </Button>
                    {pickError && (
                      <p role="alert" className="mt-2 text-sm text-bad">{pickError}</p>
                    )}
                  </div>
                )}
              </Card>

              {/* The limits, stated where the money is, not in a footnote. The
                  mastery law is a product promise and it constrains what a paid
                  assessment is allowed to claim. */}
              <Card as="section" variant="inset" pad="lg">
                <h2 className="font-brand font-semibold text-t2">What it does not tell you</h2>
                <p className="mt-2 text-sm text-muted max-w-[56ch]">
                  A short adaptive run says where to start. It is not a diagnosis, not a grade level,
                  and not proof of what your child can do on their own — that only comes from work
                  done unaided, verified, and repeated later. Kaizen serves students ages 13 and up.
                </p>
              </Card>
            </>
          )}
        </div>
      </Section>
    </Shell>
  );
}
