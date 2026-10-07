'use client';

// /billing — current plan, usage vs limits, plan cards with Stripe Checkout,
// and the Billing Portal. Degrades gracefully: unconfigured Stripe shows
// "billing isn't live yet"; past_due shows a fix-payment banner.
//
// Selling state, same three-state law as /pricing: the club lineup and
// AI + Hall promise real tutoring time, so while selling is held
// (app_settings.club_enabled) those cards render first-pick capture instead of
// an Upgrade button — this page used to sell them unconditionally, which the
// launch runbook's "create Stripe Prices first" ordering turns into a live
// purchase path for visits nobody can book (audit 2026-08-18, H10). The
// checkout route holds the same line server-side (503 notYetOpen); this is the
// honest UI in front of it. ai_solo is pure software and is never gated.
//
// Restyled onto the one system (docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// the hand-written header is ui/AppHeader, the two message channels are
// ui/Notice (green ok, red bad — see the channel note above upgrade()), every
// arbitrary text-[Npx] and rounded-[Npx] is back on the shared scales, and
// every figure the page asserts is mono with tabular numerals. The Upgrade
// action is now the ink pill like every other primary action in the product,
// which is the whole point: crossing /pricing to /billing no longer changes
// the color of the button you are being asked to press on a money screen.
// Behavior is untouched — same hooks, same routes, same states, same gates.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authedFetch, cloudConfigured } from '@/lib/supabaseClient';
import { capture } from '@/lib/analytics';
import { IconArrowRight } from '@/components/Icons';
import AppHeader from '@/components/ui/AppHeader';
import AppFooter from '@/components/ui/AppFooter';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import HeldState from '@/components/ui/HeldState';
import Stat from '@/components/ui/Stat';
import { CLUB_PLANS, AI_PLANS, SEAT_PLAN, forSale, formatPrice } from '@/lib/server/clubPricing';

// Prices come straight from clubPricing.js so this page can never drift from
// the source of truth.
const PLANS = [
  { id: 'free', name: 'Free', price: formatPrice(0), blurb: 'Weekly free Community Hall + the AI companion with daily limits.' },
  { id: 'seat', name: SEAT_PLAN.seat.label, price: `${formatPrice(SEAT_PLAN.seat.priceCents)}/mo`, blurb: `A reserved in-person tutoring place: ${SEAT_PLAN.seat.sessionsPerWeek} × ${SEAT_PLAN.seat.minutes} min a week, 1:${SEAT_PLAN.seat.ratio}, member rates on everything else.`, popular: true, clubGated: true },
  { id: 'club', name: 'Club', price: `${formatPrice(CLUB_PLANS.club.priceCents)}/mo`, blurb: '4 Homework Hall visits a month + member pricing on everything else.', clubGated: true },
  { id: 'plus', name: 'Plus', price: `${formatPrice(CLUB_PLANS.plus.priceCents)}/mo`, blurb: '8 Homework Hall visits a month, about twice a school week.', clubGated: true },
  { id: 'max',  name: 'Max',  price: `${formatPrice(CLUB_PLANS.max.priceCents)}/mo`, blurb: '12 Homework Hall visits a month + the best member rates.', clubGated: true },
  // Max AI's blurb names ceilings a route actually enforces. It used to read
  // "Track your whole schedule, not two classes" — but `checkEntitlement(caller,
  // 'courses')` is called from nowhere, `courses` is absent from the FEATURES
  // list in /api/entitlements/me, and lib/cloud.js upserts every course a device
  // syncs with no gate, so a free student already tracks their whole schedule.
  // Same correction as components/AiLadder.js; if the courses ceiling is ever
  // meant to be real, gate it in the sync path first, then claim it.
  { id: 'ai_solo', name: 'Max AI',    price: `${formatPrice(AI_PLANS.ai_solo.priceCents)}/mo`, blurb: 'Five times the daily tutoring allowance; three weekly reports instead of one.' },
  { id: 'ai_hall', name: 'AI + Hall', price: `${formatPrice(AI_PLANS.ai_hall.priceCents)}/mo`, blurb: `Everything in ${AI_PLANS.ai_solo.label} plus one Homework Hall visit every month.`, clubGated: true },
].filter((p) => forSale(p.id)); // retired tiers (clubPricing.SALE_STATUS) never render

// Plans that can't be sold before the club opens. Mirrors CLUB_GATED_PLANS in
// api/billing/checkout — that route is the enforcement; this is the copy.
const CLUB_GATED = new Set(PLANS.filter((p) => p.clubGated).map((p) => p.id));

const FEATURE_LABEL = {
  tutor_message: 'Tutor messages',
  grade: 'Understanding grades',
  syllabus_parse: 'AI intake / syllabus parses',
  tts_chars: 'Voice characters',
  report: 'Weekly reports',
  handoff: 'Human tutor requests',
};

const CLUB_LABEL = {
  // The seat's own allowance. /api/entitlements/me served every allowance
  // EXCEPT this one until Wave 2, so the row a seat family cares about could
  // not render at all — and now that it can, it needs a name here or it shows
  // a raw column key to the only recurring product's only customers.
  club_seat_included: 'Sessions in their seat',
  club_hall_included: 'Homework Hall visits',
  club_private_credit: 'Included private session',
};

// The status pill. Hue codes the kind and the foreground stays at ink (the
// k-badge doctrine): a subscription status is the one label on this page a
// parent must be able to read at a glance, so it is never a tinted whisper.
// past_due also raises the banner below, which is where the alarm belongs.
const STATUS_BADGE = {
  active:    { label: 'Active',    cls: 'bg-good/15 text-ink' },
  trialing:  { label: 'Trial',     cls: 'bg-accent/15 text-ink' },
  past_due:  { label: 'Past due',  cls: 'bg-bad/15 text-ink' },
  cancelled: { label: 'Cancelled', cls: 'bg-panel2 text-muted' },
};

// One recipe for the "quiet inline pill" a plan card shows when there is
// nothing to press: current plan, and the free row's downgrade pointer.
const QUIET_PILL = 'mt-4 text-center py-2.5 rounded-full bg-panel2 text-sm font-semibold text-muted';

export default function Billing() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyPlan, setBusyPlan] = useState('');
  const [authed, setAuthed] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);  // plan chosen on /pricing, carried here
  const [clubHeld, setClubHeld] = useState(true);        // fail closed until the schedule says otherwise

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/entitlements/me');
      if (res.status === 401) { setAuthed(false); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load your plan.');
      setAuthed(true);
      setMe(data);
    } catch (e) {
      setError(e.message);
      setAuthed(true);
    }
  }, []);

  // Is selling open? The public schedule carries the same `notYetOpen` flag
  // every storefront surface reads (it derives from app_settings.club_enabled),
  // so /billing, /pricing, and the booking routes can never disagree. Starts
  // held and stays held if the call fails — never the other way around.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/club/schedule?days=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setClubHeld(d.notYetOpen !== false); })
      .catch(() => { /* held is the safe answer */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let isSuccess = false;
    try { isSuccess = new URLSearchParams(window.location.search).get('status') === 'success'; } catch { /* noop */ }
    if (!isSuccess) { load(); return; }

    // Returned from Checkout: VERIFY against Stripe instead of trusting the
    // redirect (the webhook may be slow or never fire). Reconcile grants the
    // plan directly; retry a couple times while the payment settles.
    capture('checkout_completed');
    try { window.history.replaceState({}, '', '/billing'); } catch { /* noop */ }
    setNotice('Confirming your upgrade…');
    let cancelled = false;
    (async () => {
      let verified = false;
      for (let i = 0; i < 3 && !verified && !cancelled; i++) {
        try {
          const res = await authedFetch('/api/billing/reconcile', { method: 'POST' });
          const data = await res.json();
          if (res.ok && data.plan && data.plan !== 'free') verified = true;
        } catch { /* keep trying */ }
        await load();
        if (!verified && !cancelled) await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        setNotice(verified
          ? "You're upgraded! 🎉 Your new limits are live."
          : "Payment received. We're finalizing your upgrade. It'll show here within a minute; refresh if it doesn't.");
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  // A plan chosen on /pricing arrives as ?plan= (or, after a sign-in detour,
  // from sessionStorage). Remember it, strip the URL.
  useEffect(() => {
    const PAID = ['club', 'plus', 'max', 'ai_solo', 'ai_hall'];
    let p = null;
    try {
      p = new URLSearchParams(window.location.search).get('plan');
      if (!PAID.includes(p)) p = sessionStorage.getItem('kaizen.intendedPlan');
    } catch { /* noop */ }
    if (PAID.includes(p)) {
      setPendingPlan(p);
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('plan')) { url.searchParams.delete('plan'); window.history.replaceState({}, '', url); }
      } catch { /* noop */ }
    }
  }, []);

  // Once auth resolves: authed → start checkout for the chosen plan; not authed
  // → stash it so the dashboard can bring them back here after they sign in.
  useEffect(() => {
    if (!pendingPlan || authed === null) return;
    if (authed) {
      try { sessionStorage.removeItem('kaizen.intendedPlan'); } catch { /* noop */ }
      const wanted = pendingPlan;
      setPendingPlan(null);
      // A held plan never auto-starts checkout — the card below explains why.
      if (clubHeld && CLUB_GATED.has(wanted)) return;
      if (me && me.plan !== wanted) upgrade(wanted);
    } else {
      try { sessionStorage.setItem('kaizen.intendedPlan', pendingPlan); } catch { /* noop */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, pendingPlan, me, clubHeld]);

  // Two channels, and the split is about outcome, not severity: `notice` is
  // green because something actually changed for the better; `error` is red
  // because the click did NOT do what the button promised. A refusal — billing
  // unconfigured, or the club still held — belongs in the red one. Painted
  // green it reads as a confirmation, and the visitor walks away believing
  // they upgraded.
  async function upgrade(plan) {
    setBusyPlan(plan);
    setError('');
    setNotice('');
    capture('upgrade_clicked', { plan });
    try {
      const res = await authedFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.status === 501) { setError(data.error || "Billing isn't live yet, so you're still on Free."); return; }
      // 503 = selling is held server-side. Reflect it and re-render the cards.
      if (res.status === 503) { setClubHeld(true); setError(data.error || "That plan isn't open yet. Nothing was charged."); return; }
      if (res.ok && data.switched) {
        // In-place plan switch (prorated) — no redirect needed.
        setNotice(`You're on the new plan! 🎉 The prorated difference lands on your next invoice.`);
        capture('plan_switched', { plan: data.plan });
        await load();
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyPlan('');
    }
  }

  async function managePortal() {
    setError('');
    setNotice('');
    try {
      const res = await authedFetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (res.status === 501) { setError(data.error || "Billing isn't live yet, so there's no portal to open."); return; }
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open the billing portal.');
      window.location.href = data.url;
    } catch (e) {
      setError(e.message);
    }
  }

  // What the card is allowed to assert. `demo` is an internal token for an
  // account with no subscription behind it, so printing it as a plan name told
  // a parent they were on something called Demo — and the green ACTIVE pill
  // beside it then asserted that the nonexistent thing was live. No
  // subscription: no internal token, no status pill, and the card says so in
  // words. (Rendering only — nothing about the fetch or its parsing moves.)
  const noMembership = Boolean(me?.demo) || me?.plan === 'demo' || !me?.plan;
  const badge = noMembership ? null : STATUS_BADGE[me?.status] || null;
  const currentPlanName = noMembership
    ? 'No membership yet'
    : PLANS.find((p) => p.id === me?.plan)?.name || (me?.plan === 'internal' ? 'Internal' : 'Free');
  // Held selling sends every plan action to the first-pick capture, never to a
  // /billing?plan= link that would start a purchase for time nobody can book.
  const plansHref = clubHeld ? '/pricing#first-pick' : '/pricing';

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* The membership on this page is the parent's, and the allowances below
          are spent on their teens — but /family, where that spending happens,
          was linked from nowhere in the account surface. The shared interior
          header carries it as a sibling link. */}
      <AppHeader width="prose" links={[{ href: '/family', label: 'Family' }]} />

      {/* One container for the whole page: header, body and footer on the same
          rail, so the wordmark, the h1 and the copyright line share one left
          edge. The reading measure is kept by constraining the column INSIDE
          the rail rather than by re-centering the body, which is what put the
          h1 204px to the right of the wordmark above it. */}
      <Section as="main" width="wide" space="tight" className="flex-1">
        <div className="max-w-prose space-y-6">
          {/* One title size across the interior. */}
          <h1 className="font-brand font-semibold text-d3 sm:text-d2">Billing</h1>

          {/* The one held-state message, in the one place every interior page
              puts it: under the title, above the first card, so a parent reads
              "Billing" before they read what is closed on it. It replaces the
              "everything is unlocked in this browser" aside, which spoke to
              whoever deployed the app rather than to the person reading a
              billing page. */}
          {(me?.demo || !cloudConfigured) && <HeldState kind="billing" />}

          {/* Two channels, kept apart on purpose: something changed for the
              better, or the click did not do what the button promised. */}
          <Notice kind="ok">{notice}</Notice>
          <Notice kind="bad">{error}</Notice>

          {me?.status === 'past_due' && (
            <div className="rounded-md border border-bad/30 bg-bad/10 px-4 py-3.5 flex items-center gap-3">
              <p className="flex-1 text-sm text-ink">
                <span className="font-semibold">Your last payment didn&apos;t go through.</span>{' '}
                Update your payment method to keep your plan.
              </p>
              <button
                onClick={managePortal}
                className="shrink-0 inline-flex items-center justify-center rounded-full bg-bad text-paper
                           px-4 py-2 text-sm font-semibold transition-[background-color,transform] duration-150
                           hover:bg-bad/90 active:scale-[0.98]"
              >
                Fix payment
              </button>
            </div>
          )}

          {authed === false && (
            // The same gate /settings and /tutors/apply use: a heading, one
            // sentence, one ink pill. Not a rose underline inside prose.
            <Card as="section" pad="lg">
              <h2 className="font-brand font-semibold text-ink text-t1">Sign in to manage billing</h2>
              <p className="mt-2 text-sm text-muted max-w-[52ch]">
                Your plan, your usage, and your invoices live on your account.
              </p>
              <Button href="/dashboard" className="mt-6">
                Sign in or create an account
                <IconArrowRight size={15} />
              </Button>
            </Card>
          )}

          {me && (
            <>
              {/* Current plan */}
              <Card as="section">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="k-label">{noMembership ? 'Membership' : 'Current plan'}</p>
                    <p className="font-brand font-semibold text-t1 mt-1">{currentPlanName}</p>
                    {noMembership && (
                      <p className="text-sm text-muted mt-1.5 max-w-[52ch]">
                        There is no subscription on this account, so nothing is being charged.
                      </p>
                    )}
                  </div>
                  {badge && (
                    <span className={`shrink-0 font-opmono text-micro font-medium uppercase px-3 py-1.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                {me.currentPeriodEnd && (
                  <Stat
                    className="mt-5 border-t border-border pt-4"
                    value={new Date(me.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    label="Renews"
                  />
                )}
                {!me.demo && (
                  <button
                    onClick={managePortal}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-ink transition-colors"
                  >
                    Manage billing <IconArrowRight size={14} />
                  </button>
                )}
              </Card>

              {/* This month's club allowances — only shown when the plan has any */}
              {me.club && Object.values(me.club).some((u) => u.limit !== 0) && (
                <section>
                  {/* Section headings are plain headings, not eyebrows: the
                      page carried three mono kickers across four sections,
                      which is both over the ration and, stacked, the page's
                      dominant texture. One mono label survives, the "Current
                      plan" field label inside the card above. */}
                  <h2 className="font-brand font-semibold text-t2 mb-3">This month&apos;s membership</h2>
                  <Card pad="none" className="divide-y divide-border overflow-hidden">
                    {Object.entries(me.club).filter(([, u]) => u.limit !== 0).map(([feature, u]) => (
                      <div key={feature} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <span className="text-sm font-medium">{CLUB_LABEL[feature] || feature}</span>
                        {/* An allowance we cannot resolve is not an unlimited
                            one. A whole column reading "unlimited" was both a
                            promise a metered product should not make on a
                            billing page and, read as a column, plain empty
                            scaffolding. The placeholder says what is true: no
                            number is on the record yet — and it says it in the
                            text face, because mono carries figures, not
                            three-word English sentences. */}
                        {u.limit == null ? (
                          <span className="text-xs text-muted shrink-0">Not recorded</span>
                        ) : (
                          <span className="font-opmono text-xs text-muted tabular-nums shrink-0">
                            {`${u.used} used / ${u.limit} included`}
                          </span>
                        )}
                      </div>
                    ))}
                  </Card>
                  {['club', 'plus', 'max'].includes(me.plan) ? (
                    <p className="text-xs text-muted mt-2">Included visits reset on the 1st of each month. Miss a week? Ask us about a grace visit. Extras beyond them book at your member price.</p>
                  ) : me.plan === 'ai_hall' ? (
                    <p className="text-xs text-muted mt-2">Your included visit resets on the 1st of each month and doesn&apos;t carry over.</p>
                  ) : null}
                </section>
              )}

              {/* Usage today */}
              <section>
                <h2 className="font-brand font-semibold text-t2 mb-3">Today&apos;s usage</h2>
                <Card pad="none" className="divide-y divide-border overflow-hidden">
                  {Object.entries(me.usageToday || {}).map(([feature, u]) => {
                    const pct = u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0;
                    return (
                      <div key={feature} className="px-5 py-3.5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium">{FEATURE_LABEL[feature] || feature}</span>
                          {/* The count is a figure and stays mono; the missing
                              limit is prose and does not. Shorter, too: the old
                              placeholder wrapped three labels onto two lines at
                              390. */}
                          <span className="text-xs text-muted shrink-0">
                            <span className="font-opmono tabular-nums">{u.used}</span>
                            {u.limit != null
                              ? <span className="font-opmono tabular-nums">{` / ${u.limit}`}</span>
                              : ' · Not recorded'}
                          </span>
                        </div>
                        {u.limit != null && (
                          <div className="mt-2 h-1.5 rounded-full bg-panel2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-bad' : pct >= 80 ? 'bg-warn' : 'bg-accent'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
              </section>

              {/* Plans */}
              {!me.demo && me.plan !== 'internal' && (
                <section>
                  <h2 className="font-brand font-semibold text-t2 mb-3">Plans</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PLANS.map((p) => {
                      const isCurrent = me.plan === p.id;
                      const held = clubHeld && CLUB_GATED.has(p.id);
                      return (
                        <div key={p.id} className={`rounded-md border bg-panel shadow-soft p-5 ${p.popular && !isCurrent ? 'border-accent' : 'border-border'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-brand font-semibold text-t3">{p.name}</h3>
                            {p.popular && !isCurrent && (
                              <span className="k-badge k-badge-accent shrink-0">Our pick</span>
                            )}
                          </div>
                          <p className="font-opmono text-t1 font-semibold tabular-nums mt-1">{p.price}</p>
                          <p className="text-xs text-muted mt-1">{p.blurb}</p>
                          {isCurrent ? (
                            <div className={QUIET_PILL}>Current plan</div>
                          ) : p.id === 'free' ? (
                            <div className={QUIET_PILL}>
                              Downgrade via Manage billing
                            </div>
                          ) : held ? (
                            // Held: the club isn't open, so this plan's tutoring
                            // time can't be delivered and nothing is charged for
                            // it. Same capture path /pricing sends people down.
                            <>
                              <Button
                                href="/pricing#first-pick"
                                variant="secondary"
                                size="sm"
                                block
                                className="mt-4"
                              >
                                Get first pick
                              </Button>
                              <p className="text-xs text-muted mt-2 text-center">Opens when the club opens for booking.</p>
                            </>
                          ) : (
                            // Ink acts, rose marks: the same pill /pricing hands
                            // people, so the action does not change color mid-purchase.
                            <Button
                              onClick={() => upgrade(p.id)}
                              disabled={Boolean(busyPlan)}
                              size="sm"
                              block
                              className="mt-4"
                            >
                              {busyPlan === p.id && <span className="w-3.5 h-3.5 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />}
                              Upgrade
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted text-center mt-4">
                    Payments are handled securely by Stripe. Memberships are month-to-month at the price
                    shown: no trial gimmicks, no contracts. Cancel any time from Manage billing (effective
                    at the end of the period you&apos;ve paid for), and you&apos;re always welcome back.
                  </p>
                </section>
              )}

              {/* Study Circle */}
              {!me.demo && <CircleSection plan={me.plan} onChanged={load} />}

              {/* The page was eight rows of data and nothing to press: a parent
                  could read their plan but not change it, and had nowhere to
                  take a question. One primary action, one quiet way to reach a
                  person. The action points at /pricing, which is public and
                  safe on every selling state; while the club is held it lands
                  on the first-pick capture, never on a ?plan= purchase link for
                  time nobody can book yet. */}
              <section className="border-t border-border pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <h2 className="font-brand font-semibold text-t2">Change your plan</h2>
                    <p className="text-sm text-muted mt-1">
                      See what each membership includes side by side before you switch.
                    </p>
                  </div>
                  <Button href={plansHref} className="shrink-0">
                    Compare memberships
                    <IconArrowRight size={15} />
                  </Button>
                </div>
                <p className="text-xs text-muted mt-5">
                  A question about a charge, an invoice, or a refund?{' '}
                  <Link href="/contact" className="text-accent underline underline-offset-2">Get in touch</Link>.
                </p>
              </section>
            </>
          )}
        </div>
      </Section>

      <AppFooter />
    </div>
  );
}

// ── Study Circle: a retired legacy tier, closed to new members. Existing
// circles stay visible (owners can view/remove members, members can leave),
// but the invite code and join affordances are gone — the API 410s new joins.
function CircleSection({ plan, onChanged }) {
  const [circle, setCircle] = useState(null);
  const [msg, setMsg] = useState('');

  const loadCircle = useCallback(async () => {
    const res = await authedFetch('/api/circle');
    if (res.ok) setCircle(await res.json());
    else setCircle({ role: null });
  }, []);
  useEffect(() => { loadCircle(); }, [loadCircle]);

  async function removeMember(memberId) {
    await authedFetch('/api/circle', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId }) });
    loadCircle();
  }

  async function leave() {
    if (!confirm('Leave this Study Circle? You’ll go back to the Free plan.')) return;
    await authedFetch('/api/circle', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setMsg('You left the circle.');
    loadCircle(); onChanged?.();
  }

  if (!circle) return null;
  // The plan is closed to new members: no join box for outsiders, no circle
  // creation. Only people already inside a circle (or legacy family-plan
  // owners) still see this section.
  if (circle.role === null && plan !== 'family') return null;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <h2 className="font-brand font-semibold text-t2">Study Circle</h2>
        <span className="k-badge k-badge-muted">Legacy plan</span>
      </div>
      <Card className="space-y-3">

        {circle.role === 'owner' && (
          <>
            <p className="text-sm text-muted">
              Study Circle is a legacy plan closed to new members. Your current members keep
              their benefits while your subscription stays active, but no one new can join.
            </p>
            {!circle.active && <p className="text-xs text-warn">Your circle is inactive. It unlocks for members while your Study Circle plan is active.</p>}
            <div className="divide-y divide-border">
              {(circle.members || []).map((m) => (
                <div key={m.id} className="py-2.5 flex items-center gap-3">
                  <span className="flex-1 text-sm font-medium truncate">{m.name}</span>
                  <span className="font-opmono text-xs text-muted tabular-nums">joined {new Date(m.joined).toLocaleDateString()}</span>
                  <button onClick={() => removeMember(m.id)} className="text-xs text-muted hover:text-bad transition-colors">Remove</button>
                </div>
              ))}
              {(circle.members || []).length === 0 && <p className="py-2 text-xs text-muted">No one joined before the plan closed.</p>}
            </div>
          </>
        )}

        {circle.role === 'member' && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium">You&apos;re in {circle.ownerName}&apos;s Study Circle</p>
              <p className="text-xs text-muted">{circle.active ? "Features from the circle owner's plan are unlocked." : 'The circle is paused. Features return when their plan is active.'}</p>
            </div>
            <button onClick={leave} className="text-xs text-muted hover:text-bad transition-colors shrink-0">Leave</button>
          </div>
        )}

        {circle.role === null && plan === 'family' && (
          <p className="text-sm text-muted">
            Study Circle is a legacy plan closed to new members, so new circles can&apos;t be
            created. Your own plan benefits are unaffected.
          </p>
        )}

        {msg && <p className={`text-xs ${msg.startsWith('✓') ? 'text-good' : 'text-bad'}`}>{msg}</p>}
      </Card>
    </section>
  );
}
