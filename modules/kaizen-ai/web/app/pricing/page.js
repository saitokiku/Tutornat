// /pricing: the two businesses, priced, on ONE light surface.
//
// Previously this page ran a gradient bridge into a coal half so the AI ladder
// could be night-styled. One theme, locked (spec:
// docs/superpowers/specs/2026-08-22-one-system-rebuild.md): there is no
// mid-page inversion anywhere in the product, so the ladder is now light and
// the fine print sits on paper like everything above it.
//
// Rhythm comes from ui/Section, so no section invents its own padding. Each
// section is a different shape on purpose: a la carte is a framed grid, the
// memberships are ruled rows (four columns of identical boxes is the layout
// this page kept reaching for), the math is a split with one inset ledger,
// and the ladder is the shared AiLadder.
//
// Every figure renders from lib/server/clubPricing.js (the single pricing
// truth, pinned by clubPricing.test.mjs); nothing here retypes a price.
//
// CTAs are state-aware. Club tiers sell only when selling is live
// (club_enabled) AND the club Stripe envs exist; the live labels render as
// "Choose Club", "Choose Plus", "Choose Max" (analytics continuity). While
// held, every tier and ladder card links to the ONE capture section
// (#first-pick) above the fine print: exactly one email input on the page
// (founder: repeated email fields read as a bug, not a design), and the page
// renders zero /billing?plan= links, which the e2e smoke counts. The AI
// ladder gates on its own Stripe envs only.

import Link from 'next/link';
import { IconChevronRight } from '@/components/Icons';
import Shell from '@/components/dn/Shell';
import Reveal, { RevealGroup } from '@/components/dn/Reveal';
import AiLadder from '@/components/AiLadder';
import InterestForm from '@/components/InterestForm';
import Section from '@/components/ui/Section';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Eyebrow from '@/components/ui/Eyebrow';
import { publicSchedule } from '@/lib/server/publicSchedule';
import { CLUB_PLANS, RETAIL, AI_PLANS, KIND_DEFAULTS, SEAT_PLAN, DIAGNOSTIC, forSale, formatPrice as dollars } from '@/lib/server/clubPricing';

export const metadata = {
  title: 'Pricing - Kaizen Academic Club',
  description:
    `Homework Hall ${dollars(RETAIL.hallSeatCents)}, Subject Clinics ${dollars(RETAIL.clinicSeatCents)}, ` +
    `a ${dollars(DIAGNOSTIC.priceCents)} placement diagnostic, and a free Community Hall every week. ` +
    `A standing seat — tutoring twice a week, in person — is ${dollars(SEAT_PLAN.seat.priceCents)} a month. ` +
    `The AI companion is free; Max AI is ${dollars(AI_PLANS.ai_solo.priceCents)}. ` +
    'Everything a la carte forever, for students 13 and up.',
};

export const revalidate = 60;

// A la carte: what any family can buy with no membership, ever. The figure
// leads each cell, because the figure is the thing the record asserts.
const ALACARTE = [
  {
    name: 'Homework Hall',
    price: dollars(RETAIL.hallSeatCents),
    unit: 'a visit',
    body: `About an hour of supervised work with a tutor clearing blockers. Up to ${KIND_DEFAULTS.homework_hall.capacity} students per tutor.`,
  },
  {
    name: 'Subject Clinics',
    price: dollars(RETAIL.clinicSeatCents),
    unit: 'a seat',
    body: `A focused group on a single topic, up to ${KIND_DEFAULTS.clinic.capacity} students. If fewer than ${KIND_DEFAULTS.clinic.minSeats} book, the clinic cancels and every seat is refunded.`,
  },
  {
    // The first thing most families buy, and the first thing the Program
    // Director sells. It is a person's time producing a written plan, not a
    // sales appointment — which is why it is charged, and why the credit below
    // exists rather than a free assessment that costs nobody anything.
    name: 'Placement diagnostic',
    price: dollars(DIAGNOSTIC.priceCents),
    unit: 'once',
    body: (
      <>
        An adaptive assessment that finds where your child actually is, then a written report
        from the person who would teach them. Credited in full against your first month if you
        take a seat within{' '}
        <span className="font-opmono tabular-nums">{DIAGNOSTIC.creditWindowDays}</span> days.
      </>
    ),
    href: '/diagnostic',
  },
  {
    name: 'Community Hall',
    price: dollars(RETAIL.communityCents),
    unit: 'every week',
    body: 'A full Hall session, open to anyone, once a week. No card required.',
  },
];

const TIER_BLURBS = {
  club: 'About one supported session a week.',
  plus: 'Dependable help about twice a school week.',
  max: 'For students who need frequent support.',
};

// Membership rows are MAPPED from CLUB_PLANS, never hand-typed. Each paid tier
// carries a four-line spec sheet whose right column is nothing but figures, so
// the three tiers can be read down as one table.
// Retired tiers (clubPricing.SALE_STATUS) are filtered out here, so the page
// cannot offer a plan the company has stopped selling; un-retiring one is a
// one-line change in the price file, never in a page.
const CLUB_TIERS = Object.entries(CLUB_PLANS).filter(([key]) => forSale(key)).map(([key, p]) => ({
  key,
  label: p.label,
  price: dollars(p.priceCents),
  blurb: TIER_BLURBS[key] || '',
  featured: key === 'plus',
  // Three rows, not four: the member 1:1 rate is still in CLUB_PLANS because
  // /terms and the metering rail need it, but private 1:1 is a CUT product and
  // a row here is an offer. Today CLUB_TIERS is empty, so nothing renders —
  // which is exactly why the line had to go now rather than the day someone
  // un-retires a tier in the price file and the page quietly starts selling it.
  spec: [
    ['Hall visits each month', String(p.includedHallMonthly)],
    ['Extra Hall visit', dollars(p.memberHallCents)],
    ['Clinic seat', dollars(p.memberClinicCents)],
  ],
  note: 'Full AI companion included.',
}));

// The standing seat (docs/STRATEGY.md §5.1), every figure computed from
// SEAT_PLAN and never typed: the one recurring product Kaizen Local sells.
const SEAT = SEAT_PLAN.seat;
const SEAT_PER_SESSION = dollars(Math.round(SEAT.priceCents / SEAT.includedSeatMonthly));
const SEAT_MINUTES_MONTH = SEAT.includedSeatMonthly * SEAT.minutes;
const SEAT_ROW = {
  key: 'seat',
  label: SEAT.label,
  price: dollars(SEAT.priceCents),
  blurb: 'A reserved place, twice a week, in person. This one is tutoring.',
  spec: [
    ['Sessions a week', String(SEAT.sessionsPerWeek)],
    ['Minutes, each', String(SEAT.minutes)],
    ['Students to one tutor', `${SEAT.ratio}`],
    ['Sessions each month', String(SEAT.includedSeatMonthly)],
  ],
  note: `Member rates on drop-ins and clinics. Full AI companion included. Sessions count by calendar month and do not roll over.`,
};

export default async function PricingPage() {
  // Selling state: fail closed. If the schedule cannot be read, the page
  // still renders and the club tiers stay in first-pick capture.
  let notYetOpen = true;
  try {
    const res = await publicSchedule({ days: 1 });
    notYetOpen = res.notYetOpen === true;
  } catch { /* page must render without a database */ }

  // One boolean per SKU. The free tier is the AI product; the paid upgrade is
  // ai_solo. ai_hall bundles a Hall visit, so it needs its own price AND an
  // open club, and it must never be able to hold ai_solo in capture state.
  const aiBuyable = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_AI_SOLO
  );
  const aiHallSellable = !notYetOpen && Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_AI_HALL
  );
  // The seat is club-gated (it promises human time) and needs its own Price.
  const seatBuyable = !notYetOpen && Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_SEAT
  );
  // Memberships are retired from sale; CLUB_TIERS is empty unless the price
  // file un-retires one, and only then does this matter.
  const clubBuyable = CLUB_TIERS.length > 0 && !notYetOpen && Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_CLUB &&
    process.env.STRIPE_PRICE_PLUS &&
    process.env.STRIPE_PRICE_MAX
  );
  // Anything still held means at least one "Get first pick" pill links to
  // #first-pick, so the capture section must exist.
  const anyHeld = !seatBuyable || !clubBuyable && CLUB_TIERS.length > 0 || !aiBuyable || !aiHallSellable;

  return (
    <Shell active="pricing" tone="day">
      {/* 1 · Hero. Four elements, one action, the page's only eyebrow. */}
      <Section width="wide" lead>
        <RevealGroup>
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="font-brand font-semibold text-d2 sm:text-d1 max-w-prose mt-5">
            Priced like a <span className="italic text-accent">club</span>, not a rescue.
          </h1>
          <p className="text-t3 text-muted max-w-narrow mt-5">
            Everything is a la carte, forever. A plan is worth buying only when the math
            below says so.
          </p>
          <div className="mt-8">
            <Button href="/dashboard" size="lg">Start free</Button>
          </div>
        </RevealGroup>
      </Section>

      {/* 2 · The club, a la carte: four offers in one hairline-framed grid.
          No membership required for any of it, now or later. */}
      <Section width="wide">
        <Reveal>
          <h2 className="font-brand font-semibold text-d3 sm:text-d2">
            Every week: <span className="italic">the club.</span>
          </h2>
          <p className="text-body text-muted max-w-prose mt-4">
            Live tutors on a weekly schedule, open to any family, membership or not.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 grid gap-px sm:grid-cols-2 bg-border border border-border rounded-md overflow-hidden">
            {ALACARTE.map((s) => (
              <div key={s.name} className="bg-panel p-6 sm:p-8">
                <h3 className="font-brand font-semibold text-t2">{s.name}</h3>
                <p className="mt-3">
                  <span className="font-opmono text-t1 font-semibold tabular-nums">{s.price}</span>
                  <span className="ml-2 text-xs text-muted">{s.unit}</span>
                </p>
                <p className="text-sm text-muted mt-3">{s.body}</p>
                {/* Only the diagnostic has somewhere to go: it is the one item
                    here a family buys on its own page rather than from the
                    schedule. Without this link the page priced a product with
                    no way to reach it. */}
                {s.href && (
                  <Link
                    href={s.href}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline underline-offset-4"
                  >
                    Start with a diagnostic
                    <IconChevronRight size={15} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* 3 · Memberships as ruled rows, not four boxes. Free is described,
          because it is a different kind of thing; the paid tiers are specified,
          so their figures line up and can be read straight down. Plus is the
          only row that carries the accent rule, the larger figure and the ink
          action. */}
      <Section width="wide">
        <Reveal>
          <h2 className="font-brand font-semibold text-d3 sm:text-d2">
            Or hold a standing seat.
          </h2>
          <p className="text-body text-muted max-w-prose mt-4">
            The same place every week, a tutor who knows the student, and member pricing
            on everything else. Month to month; cancel anytime from your billing page.
          </p>
        </Reveal>

        <div className="mt-12 border-t border-border">
          {/* Free: the real starting tier, and deliberately the quietest row. */}
          <Reveal>
            <div className="border-b border-border py-8 md:border-l-2 md:border-l-transparent md:pl-6">
              <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] md:items-start md:gap-10">
                <div>
                  <h3 className="font-brand font-semibold text-t1">Free</h3>
                  <p className="mt-2 font-opmono text-d3 font-semibold tabular-nums">{dollars(0)}</p>
                  <p className="text-sm text-muted mt-2">Free for as long as you want it.</p>
                </div>
                <p className="text-sm text-muted max-w-prose md:pt-1">
                  The weekly Community Hall, the AI companion with daily limits, the homework
                  calendar, the gradebook, and mastery tracking. Book anything a la carte
                  whenever you need it.
                </p>
                <Button href="/dashboard" variant="secondary" className="md:justify-self-end">
                  Start free
                </Button>
              </div>
            </div>
          </Reveal>

          {/* The seat: one row, the only recurring Local product. Rendered from
              SEAT_ROW (computed above), same five cells as a membership row so
              the eye reads one table. */}
          <Reveal delay={0.05}>
            <div className="border-b border-border py-8 md:border-l-2 md:pl-6 md:border-l-accent">
              <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] md:items-start md:gap-10">
                <div>
                  <p className="text-xs font-medium text-accent mb-1.5">In person</p>
                  <h3 className="font-brand font-semibold text-t1">{SEAT_ROW.label}</h3>
                  <p className="mt-2 font-opmono tabular-nums">
                    <span className="font-semibold text-d2">{SEAT_ROW.price}</span>
                    <span className="ml-1.5 text-xs text-muted">/mo</span>
                  </p>
                  <p className="text-sm text-muted mt-2">{SEAT_ROW.blurb}</p>
                </div>
                <div className="md:pt-1">
                  <dl className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
                    {SEAT_ROW.spec.map(([term, figure]) => (
                      <div key={term} className="flex items-baseline justify-between gap-4">
                        <dt className="text-sm text-muted">{term}</dt>
                        <dd className="font-opmono text-sm tabular-nums">{figure}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-sm text-muted mt-3">{SEAT_ROW.note}</p>
                </div>
                {seatBuyable ? (
                  <Button href="/billing?plan=seat" variant="primary" className="md:justify-self-end">
                    Hold a seat
                  </Button>
                ) : (
                  <Button href="#first-pick" variant="secondary" className="md:justify-self-end">
                    Get first pick
                  </Button>
                )}
              </div>
            </div>
          </Reveal>

          {/* Any un-retired membership renders here; today none does. */}
          {CLUB_TIERS.map((p, i) => (
            <Reveal key={p.key} delay={0.05 * (i + 1)}>
              <div
                className={`border-b border-border py-8 md:border-l-2 md:pl-6 ${
                  p.featured ? 'md:border-l-accent' : 'md:border-l-transparent'
                }`}
              >
                <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] md:items-start md:gap-10">
                  <div>
                    {p.featured ? (
                      <p className="text-xs font-medium text-accent mb-1.5">Our pick</p>
                    ) : null}
                    <h3 className="font-brand font-semibold text-t1">{p.label}</h3>
                    <p className="mt-2 font-opmono tabular-nums">
                      <span className={`font-semibold ${p.featured ? 'text-d2' : 'text-d3'}`}>
                        {p.price}
                      </span>
                      <span className="ml-1.5 text-xs text-muted">/mo</span>
                    </p>
                    <p className="text-sm text-muted mt-2">{p.blurb}</p>
                  </div>

                  <div className="md:pt-1">
                    <dl className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
                      {p.spec.map(([term, figure]) => (
                        <div key={term} className="flex items-baseline justify-between gap-4">
                          <dt className="text-sm text-muted">{term}</dt>
                          <dd className="font-opmono text-sm tabular-nums">{figure}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-sm text-muted mt-3">{p.note}</p>
                  </div>

                  {clubBuyable ? (
                    <Button
                      href={`/billing?plan=${p.key}`}
                      variant={p.featured ? 'primary' : 'secondary'}
                      className="md:justify-self-end"
                    >
                      {`Choose ${p.label}`}
                    </Button>
                  ) : (
                    // Held: link to the one capture section, never an embedded form.
                    <Button href="#first-pick" variant="secondary" className="md:justify-self-end">
                      Get first pick
                    </Button>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 4 · The arithmetic, as a split: the argument in prose, the ledger in
          one inset panel. Every figure computed from CLUB_PLANS and RETAIL. */}
      <Section width="wide">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16 lg:items-start">
          <Reveal>
            <h2 className="font-brand font-semibold text-d3 sm:text-d2">
              A seat, by the numbers.
            </h2>
            <p className="text-body text-muted mt-5">
              One price for every family, however they pay. What it buys is time with a
              tutor at a fixed ratio, on a schedule that does not move.
            </p>
            <p className="text-body text-muted mt-4">
              That works out to roughly{' '}
              <span className="font-opmono tabular-nums text-ink">{SEAT_PER_SESSION}</span> for each
              session, with member pricing on Hall drop-ins and clinics.
            </p>
            <p className="text-body text-muted mt-4">
              If you only need us before the occasional test, don&apos;t join: book a single
              session and we&apos;ll see you next time.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <Card variant="inset" pad="lg">
              <dl>
                <div className="flex items-baseline justify-between gap-6 border-b border-border pb-3">
                  <dt className="text-sm text-muted">Sessions each month</dt>
                  <dd className="font-opmono text-sm tabular-nums">{SEAT.includedSeatMonthly}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 border-b border-border py-3">
                  <dt className="text-sm text-muted">Minutes with a tutor</dt>
                  <dd className="font-opmono text-sm tabular-nums">
                    {SEAT_MINUTES_MONTH}
                    <span className="ml-1.5 text-xs text-muted">a month</span>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 pt-4">
                  <dt className="text-sm font-semibold text-ink">Each session</dt>
                  <dd className="font-opmono text-t2 font-semibold tabular-nums text-accent">
                    {SEAT_PER_SESSION}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted mt-5">
                Sessions count by calendar month and do not roll over. The Homework Hall and
                Subject Clinics stay a la carte for everyone.
              </p>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* 5 · The companion: the AI ladder, now on paper like the rest of the
          product. The anchor stays #ai because other surfaces link to it. */}
      <Section id="ai" width="wide" className="scroll-mt-20">
        <Reveal>
          <h2 className="font-brand font-semibold text-d3 sm:text-d2">
            The <span className="italic">companion.</span>
          </h2>
          <p className="text-body text-muted max-w-prose mt-4">
            In class, at home, before a test: the companion works from your student&apos;s
            record. The parent&apos;s side is a read-only window: courses, grades, homework,
            and a monthly summary by email.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <AiLadder
            buyable={aiBuyable}
            hallSellable={aiHallSellable}
            source="/pricing"
            captureHref="#first-pick"
            className="mt-12"
          />
        </Reveal>
      </Section>

      {/* 6 · First pick: the page's ONE capture form. Every held "Get first
          pick" pill on the page links here. Rendered only while anything is
          held; when everything sells live, no anchor points at it and it
          disappears. */}
      {anyHeld && (
        <Section id="first-pick" width="prose" space="tight" className="scroll-mt-24">
          <Reveal>
            <div className="border-t border-border pt-10">
              <p className="text-t3 text-ink max-w-narrow">
                Booking and plans open soon. Leave an email and you&apos;ll hear first.
              </p>
              <InterestForm kind="seat" source="/pricing" inline className="mt-6 max-w-narrow" />
            </div>
          </Reveal>
        </Section>
      )}

      {/* 7 · Fine print, on paper, before the footer. Set in the body face at
          the secondary token: it is prose a parent has to be able to read, not
          a record figure, so it is not mono and it is not a whisper. */}
      <Section width="prose" space="tight">
        <div className={anyHeld ? '' : 'border-t border-border pt-10'}>
          <p className="text-xs text-muted">
            Kaizen serves students ages 13 and up. A seat or an AI plan renews monthly at the
            price shown until you cancel from your{' '}
            <Link href="/billing" className="text-accent underline underline-offset-2">
              billing page
            </Link>
            , effective at period end; we email before any price change. Sessions and included
            visits count by calendar month and reset on the 1st. Miss a week? Ask us about a grace
            visit — a courtesy we may extend, never a balance you bank.
          </p>
          <p className="text-xs text-muted mt-3">
            AI + Hall includes one Homework Hall visit each calendar month. It doesn&apos;t bank or
            carry over. The free tier includes the AI study companion with daily limits. A clinic
            that doesn&apos;t fill is cancelled and refunded in full.
          </p>
        </div>
      </Section>
    </Shell>
  );
}
