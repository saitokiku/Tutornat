// /tutoring : the human business, on paper. Real tutors, real appointments,
// operational precision. Organized around the sentences families actually say;
// each row maps one sentence to the click that fixes it.
//
// WHAT THIS PAGE SELLS (docs/STRATEGY.md v0.2 §5.1). One recurring product: the
// STANDING SEAT. Everything else on the page is either a drop-in a family buys
// one at a time (Homework Hall, Subject Clinic), the free Community Hall, or
// the one-time placement diagnostic that leads to a seat. The Club/Plus/Max
// memberships this page used to sell are retired (clubPricing.SALE_STATUS), and
// private 1:1 is cut from the offer entirely — we do not publish tutor
// availability — so neither appears here in any form that reads as an offer.
// The seat is enumerated through forSale() rather than hardcoded, because a
// page never decides what the company sells (Hard Rule 2).
//
// TWO WORDS THAT MAY NEVER BLUR (docs/legal/REVIEW_QUEUE.md item 20, STRATEGY
// §7.3): the Homework Hall is SUPERVISION and the seat is TUTORING. Every rail
// a family might pay us through pays for tutoring, so the distinction is a
// compliance fact before it is a marketing one. The page says it out loud in
// three places on purpose.
//
// One theme, locked (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// this page is paper top to bottom. Every size, radius and color comes from the
// scale; the only figures set in mono are the ones the record asserts (times,
// prices, counts).
//
// Structure, no two sections sharing a layout family:
//   hero (text + the club on paper) -> the rail over this week -> the problem
//   rows -> the ladder, the seat argued, and the cohorts that argument is about
//   -> the two things a parent asks last, two columns -> the honesty pull-quote
//   -> one line out to /ai.
// The eyebrow budget is spent once, on the pull-quote.
//
// A ROOM'S TIME IS THE ROOM'S, NOT THE READER'S. This is a server component, so
// the bare toLocaleTimeString this page used to format with read the SERVER's
// zone — UTC on Vercel — and told every parent that a 6:00 PM Austin room met
// at 11:00 PM. Every time here goes through lib/roomTime.js, which takes the
// room's own zone as an argument and has no locale fallback.
//
// WHY COHORTS APPEAR ON A PAGE THAT SELLS A RESERVED PRODUCT. Seat rooms are
// filtered off the public board because nobody may buy one from a board. That
// is a rule about PURCHASABILITY, not about visibility: a family deciding on a
// month of tutoring is entitled to know that the Tuesday-and-Thursday algebra
// cohort is real, where it meets, who leads it and whether it has room. The
// cards below carry a venue, a lead tutor and places remaining, and no button.
//
// Gating is load-bearing, not cosmetic. `notYetOpen` is read strictly here
// (`!== false`), so an unreachable or ambiguous schedule fails closed: the hero
// captures interest instead of offering a booking, and every problem row that
// points at a bookable seat points at that one capture instead. The rows that
// stay reachable while held (`neverHeld`) point at pages that carry their own
// honest gate — /pricing and /diagnostic both explain what cannot be bought yet
// rather than showing a button that fails on press.
import Link from 'next/link';
import Shell from '@/components/dn/Shell';
import Thread from '@/components/dn/Thread';
import Reveal, { RevealGroup } from '@/components/dn/Reveal';
import InterestForm from '@/components/InterestForm';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Section from '@/components/ui/Section';
import Eyebrow from '@/components/ui/Eyebrow';
import RoomCard from '@/components/ui/RoomCard';
import EmptyState from '@/components/ui/EmptyState';
import { IconChevronRight } from '@/components/Icons';
import { publicSchedule } from '@/lib/server/publicSchedule';
import { publicCohorts } from '@/lib/server/cohorts';
import { CONFIRM_LEAD_MS, RELEASE_LEAD_MS } from '@/lib/server/occupancy';
import { roomWhen } from '@/lib/roomTime';
import { kindLabel } from '@/lib/roomKinds';
import {
  RETAIL,
  KIND_DEFAULTS,
  SEAT_PLAN,
  DIAGNOSTIC,
  forSale,
  formatPrice as dollars,
} from '@/lib/server/clubPricing';

// The one recurring product, and whether it may be offered at all. Computed at
// module scope because SALE_STATUS is static data: if the seat is ever retired,
// every list below simply loses its seat entry and the page keeps working.
const SEAT = SEAT_PLAN.seat;
const SEAT_FOR_SALE = forSale('seat');
const SEAT_PER_SESSION = dollars(Math.round(SEAT.priceCents / SEAT.includedSeatMonthly));
// Confirm-or-release, in the hours the cron sweep actually enforces
// (occupancy.js) rather than two typed numbers that drift away from it — the
// same interpolation /terms does, for the same reason: a rule a machine applies
// to a family's booking has to be disclosed in the machine's own numbers.
const CONFIRM_LEAD_HOURS = Math.round(CONFIRM_LEAD_MS / 3600000);
const RELEASE_LEAD_HOURS = Math.round(RELEASE_LEAD_MS / 3600000);

export const metadata = {
  title: 'Tutoring - Kaizen Academic Club',
  description:
    `A standing seat is ${dollars(SEAT.priceCents)} a month: tutoring twice a week, ${SEAT.minutes} minutes a session, `
    + `${SEAT.ratio} students to one teacher, in person. Around it, a la carte: Homework Hall ${dollars(RETAIL.hallSeatCents)} `
    + `(supervised study, not tutoring), Subject Clinics ${dollars(RETAIL.clinicSeatCents)}, a free Community Hall every week, `
    + `and a ${dollars(DIAGNOSTIC.priceCents)} placement diagnostic. For students 13 and up.`,
};

export const revalidate = 60;

// "I need..." mapped to the one click that solves it. The seat leads, because
// it is the answer to the sentence families say most often and the only thing
// here that is bought by the month.
const PROBLEMS = [
  SEAT_FOR_SALE && {
    say: '“My kid needs steady help every week.”',
    body: `A standing seat: the same ${SEAT.ratio} students, the same teacher, the same two evenings, in a room, every week. `
      + `${SEAT.minutes} minutes a session, one subject, a named lead tutor. The seat is your child’s whether or not they turn up — `
      + 'that is what makes it a seat and not a booking.',
    price: `${dollars(SEAT.priceCents)}/mo`,
    href: '/pricing',
    cta: 'See the seat',
    neverHeld: true,
  },
  {
    say: '“I need help with my homework.”',
    body: `Homework Hall is supervised study, not tutoring: at most ${KIND_DEFAULTS.homework_hall.capacity} students with one tutor working the room. `
      + 'Bring what’s due, tell us where you’re stuck, leave with it done or a plan for what’s left.',
    price: `${dollars(RETAIL.hallSeatCents)} a visit`,
    href: '/schedule?kind=homework_hall',
    cta: 'Find a Hall',
  },
  {
    say: '“I have a test coming up.”',
    body: `A Subject Clinic is taught: one topic, up to ${KIND_DEFAULTS.clinic.capacity} students, drop in for the one you need. `
      + 'Tell the tutor the test date and the topic; that’s the whole session plan.',
    price: `${dollars(RETAIL.clinicSeatCents)} a seat`,
    href: '/schedule?kind=clinic',
    cta: 'See clinics',
  },
  {
    say: '“I don’t understand this subject at all.”',
    body: 'Start with a weekly Subject Clinic in that subject. If two clinics in it still isn’t clicking, the honest answer is a '
      + 'standing seat: the same teacher twice a week, who remembers what happened last Tuesday. Your tutor will say so, and tutors '
      + 'are paid the same flat hourly rate either way, so the recommendation carries no commission.',
    price: `Clinics ${dollars(RETAIL.clinicSeatCents)}`,
    href: '/schedule?kind=clinic',
    cta: 'Find a clinic',
  },
  {
    say: '“I don’t know what my child needs.”',
    body: `Start with the placement diagnostic: an adaptive assessment, then a written report from the person who would teach your child. `
      + `Take a seat within ${DIAGNOSTIC.creditWindowDays} days and it is credited in full against your first month.`,
    price: `${dollars(DIAGNOSTIC.priceCents)} once`,
    href: '/diagnostic',
    cta: 'Start there',
    neverHeld: true,
  },
  {
    say: '“I just want to try it first.”',
    body: 'One Community Homework Hall is free every single week: a full session, a tutor in the room, no card, no trial clock. '
      + 'Come once, see how it works, decide later.',
    price: 'Free · every week',
    href: '/schedule?kind=community_free',
    cta: 'Grab a seat',
  },
].filter(Boolean);

// The escalation ladder, priced honestly. One column per level so a parent can
// see the whole path, and that it starts at zero. The seat is the top of it and
// the only rung bought by the month; it drops out of the ladder if it is ever
// retired, which is why the heading below carries no count.
const LADDER = [
  {
    name: 'Community Hall',
    unit: 'every week',
    // The word, not the figure: this rung is free, and "Free" is how the hero
    // card and the problem row above it already say so.
    price: 'Free',
    line: 'One free group session every week, on the calendar for good. Students drop questions into one shared feed, the room votes '
      + 'the agenda, and the tutor works the list.',
  },
  {
    name: 'Homework Hall',
    unit: 'a visit',
    price: dollars(RETAIL.hallSeatCents),
    line: `Supervised study, at most ${KIND_DEFAULTS.homework_hall.capacity} per tutor, each student on their own assignments while the `
      + 'tutor rotates through. Supervision, not a lesson.',
  },
  {
    name: 'Subject Clinic',
    unit: 'a seat',
    price: dollars(RETAIL.clinicSeatCents),
    line: `Small-group teaching on one topic: algebra, essays, chem. Up to ${KIND_DEFAULTS.clinic.capacity} students; if fewer `
      + `than ${KIND_DEFAULTS.clinic.minSeats} book, it cancels and every seat is refunded.`,
  },
  SEAT_FOR_SALE && {
    name: 'Standing seat',
    unit: 'a month',
    price: dollars(SEAT.priceCents),
    line: `${SEAT.sessionsPerWeek} sessions a week, ${SEAT.minutes} minutes each, ${SEAT.ratio} students to one certified teacher, `
      + `in person. About ${SEAT_PER_SESSION} a session.`,
  },
].filter(Boolean);

// The seat as a spec sheet: the four figures the price is made of, in the same
// order /pricing lists them, so a family crossing between the two pages reads
// one table and not two.
const SEAT_SPEC = [
  ['Sessions a week', String(SEAT.sessionsPerWeek)],
  ['Minutes, each', String(SEAT.minutes)],
  ['Students to one teacher', String(SEAT.ratio)],
  ['Sessions a month', String(SEAT.includedSeatMonthly)],
];

export default async function TutoringPage() {
  // Two independent reads, each failing toward silence, because the page must
  // render without a database at all and one unreadable table must not blank
  // the other. `notYetOpen` is still read strictly (`!== false`), so an absent
  // or ambiguous answer keeps the storefront held.
  const [schedule, cohorts] = await Promise.all([
    publicSchedule({ days: 7 }).catch(() => null),
    publicCohorts({ limit: 6 }).catch(() => []),
  ]);
  const sessions = schedule?.sessions || [];
  const notYetOpen = schedule?.notYetOpen !== false;
  const state = notYetOpen ? (sessions.length ? 'held' : 'empty') : 'live';
  const live = state === 'live';
  // The seat promises human time and recurring money, so it needs BOTH the club
  // gate and its own Stripe Price before the hero may offer a checkout — the
  // same two conditions /pricing applies, for the same reason.
  const seatBuyable = SEAT_FOR_SALE && live && Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_SEAT
  );

  // Hero card: what the club costs, in one column. The seat leads it and never
  // carries a day and time, because seat rooms are reserved inventory and are
  // filtered out of the public board (publicSchedule); the three drop-in kinds
  // show a real day/time when the schedule has rows.
  const KIND_PRICE = {
    homework_hall: dollars(RETAIL.hallSeatCents),
    clinic: dollars(RETAIL.clinicSeatCents),
    community_free: 'Free',
  };
  // The NEXT room of a kind, by the clock. `sessions` arrives in the herding
  // sort — within a day, the fullest bookable room first — so taking the first
  // match returned the fullest room of the earliest day and printed it under a
  // heading that reads as "what is next". A card headed "at a glance" is
  // answering "when can we come", so it sorts by time itself.
  const nextOfKind = (kind) => sessions
    .filter((x) => x.kind === kind && x.start)
    .reduce((soonest, x) => (!soonest || new Date(x.start) < new Date(soonest.start) ? x : soonest), null);
  const heroRows = ['homework_hall', 'clinic', 'community_free'].map((kind) => {
    const s = nextOfKind(kind);
    return {
      name: kindLabel(kind),
      when: s ? roomWhen(s.start, s.timezone) : null,
      price: KIND_PRICE[kind],
      unit: null,
    };
  });
  if (SEAT_FOR_SALE) {
    heroRows.unshift({
      name: SEAT.label,
      when: `${SEAT.sessionsPerWeek}× ${SEAT.minutes} min · in person`,
      price: dollars(SEAT.priceCents),
      unit: '/mo',
    });
  }
  const heroHasReal = sessions.length > 0;

  return (
    <Shell active="tutoring" tone="day">
      {/* 1 · Hero: the human business, text left, what it costs on paper right. */}
      <Section width="wide" lead>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <RevealGroup>
              <h1 className="font-brand font-semibold text-ink text-d3 sm:text-d2 lg:text-d1 max-w-[13ch]">
                A seat that <span className="text-accent">stays yours</span>.
              </h1>
              <p className="mt-6 text-t3 text-muted max-w-[46ch]">
                Tutoring twice a week, {SEAT.minutes} minutes a session, {SEAT.ratio} students and
                one teacher, in a room. Around it: supervised Homework Hall
                at {dollars(RETAIL.hallSeatCents)}, taught clinics at {dollars(RETAIL.clinicSeatCents)},
                and one free Community Hall every week.
              </p>
              {/* Who this is for, in the first screen. It used to appear once,
                  in grey, in the second-to-last section — and being in the
                  wrong place is the most common reason a visitor is on this
                  page at all. Kaizen is one club, in one city, for one age
                  band; a family should learn all three before they read an
                  argument about price. */}
              <p className="mt-4 text-sm text-muted">
                In person in Austin, after school, for students 13 and up.
              </p>
              {seatBuyable ? (
                <div className="mt-9">
                  <Button href="/billing?plan=seat" size="lg">Hold a seat</Button>
                </div>
              ) : live ? (
                <div className="mt-9">
                  <Button href="/schedule" size="lg">See the schedule</Button>
                </div>
              ) : (
                <div id="first-pick" className="mt-9 max-w-narrow scroll-mt-28">
                  <p className="mb-3 text-sm font-semibold text-ink">Seats open soon.</p>
                  <InterestForm kind="seat" source="/tutoring" buttonLabel="Get first pick" inline />
                </div>
              )}
            </RevealGroup>
          </div>

          <div className="lg:col-span-5 lg:col-start-8">
            <Reveal>
              <Card variant="raised" pad="md">
                <p className="text-xs font-medium text-muted">The club, at a glance</p>
                <ul className="mt-3 divide-y divide-border">
                  {heroRows.map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-4 py-3.5">
                      <div>
                        <p className="font-brand font-semibold text-ink text-t3">{r.name}</p>
                        {r.when ? (
                          <p className="mt-1 font-opmono text-xs text-muted tabular-nums">{r.when}</p>
                        ) : null}
                      </div>
                      <span className="whitespace-nowrap">
                        <span className="font-opmono text-t3 text-ink tabular-nums">{r.price}</span>
                        {r.unit ? <span className="ml-1 text-xs text-muted">{r.unit}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 border-t border-border pt-3 text-xs text-muted">
                  {heroHasReal
                    ? 'The next of each, from this week’s schedule, in the room’s own time. Seat rooms are reserved, so they never appear on it.'
                    : 'The seat is bought by the month; the other three are bought a seat at a time.'}
                </p>
              </Card>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* 2 · This week, as the rail: the companion always on, the scheduled
          sessions resting on it. Thread owns the LIVE/HELD/EMPTY branch. */}
      <Section width="wide" space="tight">
        <Reveal>
          <h2 className="font-brand font-semibold text-ink text-t1">This week.</h2>
          <Thread sessions={sessions} state={state} tone="day" className="mt-6" />
        </Reveal>
      </Section>

      {/* 3 · Start from your problem: the sentences we hear, as hairline rows.
          Not cards: the rows are a list a parent reads down, and the sentence is
          the thing being scanned. */}
      <Section width="wide" space="loose">
        <Reveal>
          <h2 className="font-brand font-semibold text-ink text-d3 max-w-[18ch]">
            Start from your problem.
          </h2>
          <p className="mt-4 text-body text-muted max-w-prose">
            The sentences we hear every week, and what each one costs to fix.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <ul>
            {PROBLEMS.map((p, i) => {
              // Held surfaces expose zero booking affordances. The rows marked
              // neverHeld are the exception on purpose: they point at /pricing
              // and /diagnostic, which each state their own gate honestly
              // instead of offering a checkout that cannot complete.
              const linked = live || p.neverHeld;
              return (
                <li
                  key={p.say}
                  className="group -mx-4 grid grid-cols-1 gap-3 rounded-md border-t border-border px-4 py-7 transition-colors hover:bg-panel2/60 md:grid-cols-12 md:gap-6"
                >
                  <div className="md:col-span-5">
                    <span className="mb-2 block font-opmono text-xs text-muted tabular-nums">
                      0{i + 1}
                    </span>
                    <h3 className="font-brand font-semibold text-ink text-t2 max-w-[24ch]">
                      {p.say}
                    </h3>
                  </div>
                  <div className="md:col-span-5">
                    <p className="text-sm text-muted">{p.body}</p>
                    <Link
                      href={linked ? p.href : '#first-pick'}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
                    >
                      {linked ? p.cta : 'Get first pick'}
                      <IconChevronRight size={15} />
                    </Link>
                  </div>
                  <div className="md:col-span-2 md:flex md:items-center md:justify-end">
                    <span className="font-opmono text-xs text-ink/70 tabular-nums md:text-right">
                      {p.price}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Section>

      {/* 4 · The ladder, then the one thing on it that is not a ticket. Figures
          first: the ladder is read as a row of numbers, the seat as the reason
          the last of them is a monthly one. */}
      <Section width="wide">
        <Reveal>
          <h2 className="font-brand font-semibold text-ink text-d3 max-w-[16ch]">
            Every level, priced honestly.
          </h2>
          <p className="mt-4 text-body text-muted max-w-prose">
            Homework Hall is shared supervision — one tutor, up
            to {KIND_DEFAULTS.homework_hall.capacity} students, everyone on their own work — which is
            why it costs {dollars(RETAIL.hallSeatCents)}. A clinic is taught, so it
            costs {dollars(RETAIL.clinicSeatCents)}. The seat is taught, reserved and the same teacher
            every week, which is why it is the only thing here bought by the month.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {LADDER.map((l, i) => (
              <div key={l.name}>
                <p className="text-xs text-muted">Level {i}</p>
                <p className="mt-3 font-opmono text-d3 text-ink tabular-nums">{l.price}</p>
                <p className="mt-1.5 text-xs text-muted">{l.unit}</p>
                <h3 className="mt-4 font-brand font-semibold text-ink text-t2">{l.name}</h3>
                <p className="mt-2 text-sm text-muted">{l.line}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* The seat, argued: the prose on the left says what reservation means,
            the ruled rows on the right are the four figures the price is made
            of. Same rhythm the retired membership ledger held, because it is the
            same job — one panel of figures beside one paragraph of argument. */}
        {SEAT_FOR_SALE ? (
          <>
            <Reveal delay={0.14} className="mt-16 border-t border-border pt-10">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-5">
                  <h3 className="font-brand font-semibold text-ink text-t1 max-w-[20ch]">
                    Why it’s a seat, not a booking.
                  </h3>
                  <p className="mt-4 text-body text-muted">
                    A booking is a slot you hunt for each week. A seat is inventory we take off the
                    market for your child: the same room, the same {SEAT.ratio} students, the same
                    teacher, held whether or not they turn up. That is also why seat rooms never show
                    on the public schedule — there is no drop-in price for one.
                  </p>
                  <p className="mt-4 text-body text-muted">
                    The lead tutor on a seat is a certified teacher, and a seat is tutoring. The
                    Homework Hall is supervised study. We won’t blur the two, on this page or on an
                    invoice.
                  </p>
                  <Button href="/pricing" variant="secondary" className="mt-6">See the seat</Button>
                </div>

                <div className="lg:col-span-6 lg:col-start-7">
                  <div className="border-t border-border">
                    {SEAT_SPEC.map(([term, figure]) => (
                      <div
                        key={term}
                        className="flex items-baseline justify-between gap-6 border-b border-border py-4 md:border-l-2 md:border-l-transparent md:pl-5"
                      >
                        <p className="text-sm text-muted">{term}</p>
                        <p className="font-opmono text-t3 text-ink tabular-nums">{figure}</p>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-6 border-b border-border py-4 md:border-l-2 md:border-l-accent md:pl-5">
                      <div>
                        <h4 className="font-brand font-semibold text-ink text-t3">{SEAT.label}</h4>
                        <p className="mt-1 text-sm text-muted">
                          About{' '}
                          <span className="font-opmono text-ink tabular-nums">{SEAT_PER_SESSION}</span>{' '}
                          a session
                        </p>
                      </div>
                      <p className="font-opmono tabular-nums whitespace-nowrap">
                        <span className="text-t2 font-semibold text-ink">{dollars(SEAT.priceCents)}</span>
                        <span className="ml-1.5 text-xs text-muted">/mo</span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-5 text-xs text-muted">
                    One price for every family, however they pay. Sessions count by calendar month and
                    do not roll over. Month to month, cancel anytime; drop-ins and clinics stay a la
                    carte for everyone, seat or no seat.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* The cohorts the argument above is about. Every card carries the
                two evenings, the room, the teacher and — while selling is open —
                the places left, and no button, because a seat is placed rather
                than checked out. This is the first surface in the product that
                can name a day, a venue and a person for the thing it sells.

                THE COUNT IS GATED, THE FACTS ARE NOT. `publicCohorts` has no
                gate of its own, so this rail sat inside the SEAT_FOR_SALE branch
                and printed "2 of 4 left" while every purchase affordance on the
                page above it was correctly held — a shut storefront inventing a
                queue. Places remaining is inventory and follows `live`; the day,
                the venue and the lead tutor are facts about a room and stay. */}
            <Reveal delay={0.2} className="mt-14 border-t border-border pt-10">
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
                <h3 className="font-brand font-semibold text-ink text-t1">The cohorts we run.</h3>
                <p className="text-xs text-muted">
                  {live
                    ? 'Reserved: a seat is placed, never bought off a board.'
                    : 'Not open for placement yet.'}
                </p>
              </div>

              {cohorts.length > 0 ? (
                <>
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {cohorts.map((c) => (
                      <RoomCard
                        key={c.id}
                        kind="standing_seat"
                        title={c.subject && c.subject !== c.title ? `${c.title} · ${c.subject}` : c.title}
                        slots={c.slots}
                        venue={c.venue}
                        tutorName={c.leadTutorName}
                        placesLeft={live ? c.placesLeft : null}
                        capacity={live ? c.capacity : null}
                        note={live && c.isFull ? 'Full — ask us to tell you when a place opens.' : null}
                      />
                    ))}
                  </div>
                  <p className="mt-5 max-w-prose text-sm text-muted">
                    Two evenings a week in the same room, with the same {SEAT.ratio} students and the
                    same teacher. Which cohort a child joins is a placement decision, not a menu
                    choice, so the diagnostic is where that conversation starts.
                  </p>
                  {live ? null : (
                    <p className="mt-3 max-w-prose text-sm text-muted">
                      We are not placing children into these yet, so the cards say when and where
                      each cohort meets and who leads it, and not how many places are left. Counting
                      down places nobody can claim would be a queue we invented.{' '}
                      <Link
                        href="#first-pick"
                        className="font-semibold text-accent underline-offset-4 hover:underline"
                      >
                        Get first pick when placement opens
                      </Link>
                      .
                    </p>
                  )}
                </>
              ) : (
                // Three different things produce an empty list — no cohort laid
                // out yet, an unmigrated deployment, no database at all — and a
                // family needs the same answer to all three: not posted yet.
                // Inventing an illustrative cohort here would be inventing a
                // room, a teacher and an address.
                <EmptyState
                  title="The first cohorts post here."
                  className="mt-4"
                  action={(
                    <Button href="/diagnostic" variant="secondary" size="sm">
                      Start with the diagnostic
                    </Button>
                  )}
                >
                  A cohort is one subject, two evenings, one room and one lead teacher. As each one
                  is set, its days, its venue and the places left appear on this page.
                </EmptyState>
              )}
            </Reveal>
          </>
        ) : null}
      </Section>

      {/* 5 · The two things a parent asks after "how much": what will I see,
          and what happens when we miss. Two text columns, no cards; a hairline
          is enough grouping.
          The tutor-recruiting column that used to sit on the right is gone. A
          pay band is a hiring notice, and it belongs on /tutors/apply — not in
          half a section of the page where a family is deciding to commit a
          month of fees. The absence policy takes the column, because a
          reserved monthly commitment that never answers "we missed two weeks"
          has constructed an objection and walked away from it. */}
      <Section width="wide" space="tight">
        <Reveal>
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div className="border-t border-border pt-6">
              <h3 className="font-brand font-semibold text-ink text-t1">
                Parents: book it, see it, done.
              </h3>
              <p className="mt-3 text-body text-muted">
                Create your teen’s profile, book sessions on their behalf, and see what each
                session covered: what got done, what’s left, and what the tutor recommends next.
                A weekly report covers the rest of the week.
              </p>
              <Link
                href="/family"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
              >
                Set up a family account
                <IconChevronRight size={15} />
              </Link>
            </div>
            <div className="border-t border-border pt-6">
              <h3 className="font-brand font-semibold text-ink text-t1">
                If your child misses a week.
              </h3>
              <p className="mt-3 text-body text-muted">
                The seat stays yours. Your place is not resold while your child is away — seat rooms
                are never put on the public board at all — so it is still there the following week.
                That is what the month buys, and it is the difference between a seat and a booking.
              </p>
              {/* CONFIRM-OR-RELEASE, DISCLOSED WHERE IT IS ASKED ABOUT
                  (docs/CLAIMS_MATRIX.md row 85 names /tutoring as a surface for
                  it). A reminder still goes out for a seat session, and a
                  family who has just read "the seat stays yours" and then gets
                  an email with a confirm link deserves to know which of the two
                  is binding. The windows are interpolated from occupancy.js, the
                  module the sweep enforces them with; the seat's exemption is
                  the kind guard at the top of `shouldReleaseSeat`, and the
                  waitlist offer it used to trigger is refused by
                  `notifySeatOpened` for the same reason. */}
              <p className="mt-3 text-body text-muted">
                You will still get a reminder about{' '}
                <span className="font-opmono tabular-nums">{CONFIRM_LEAD_HOURS} hours</span> before
                each session, and telling us your child cannot make it helps the tutor plan the room.
                Answering is a courtesy here, not a condition: a seat session is never released for
                want of a reply. Confirm-or-release — where an unconfirmed place is given up about{' '}
                <span className="font-opmono tabular-nums">{RELEASE_LEAD_HOURS} hours</span> before
                the start and offered to the waitlist — applies to a visit booked against an included
                monthly allowance rather than paid for one at a time. A standing seat is reserved
                inventory and is exempt from it.
              </p>
              <p className="mt-3 text-body text-muted">
                What we can’t do is bank the sessions. They count by calendar month and start again
                on the 1st, so a session missed in one month is not added to the next and no balance
                builds up anywhere. If something real happens — a flu week, a family trip — tell the
                Program Director: we may credit a grace visit as a courtesy. It is a courtesy, not
                something you have bought; it has no cash value and we won’t promise one in advance.
              </p>
              <p className="mt-3 text-body text-muted">
                If your child will be out for a long stretch, end the seat. It is month to month,
                and we would rather you stopped paying for a room nobody is sitting in.
              </p>
              <Link
                href="/terms#billing"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
              >
                Read the seat terms
                <IconChevronRight size={15} />
              </Link>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* 6 · Honesty, as a pull-quote. The page's one eyebrow is spent here,
          because the label is what makes the concession read as a promise. */}
      <Section width="prose">
        <Reveal>
          <Eyebrow>What we won’t tell you</Eyebrow>
          <div className="mt-6 space-y-7 border-l-2 border-accent pl-6">
            <p className="font-brand font-medium text-ink text-t1 sm:text-d3">
              We won’t promise grades. Nobody honest can. Homework Hall is supervised study, not
              tutoring, and we price it that way.
            </p>
            <p className="font-brand font-medium text-ink text-t1 sm:text-d3">
              What we’re built for is kaizen: small, steady steps, week after week, compounding.
              Show up a little, often, and the emergencies mostly stop.
            </p>
          </div>
          <p className="mt-7 pl-6 text-sm text-muted">
            That’s a method, and a method is all we can promise. A seat is a real commitment: if a
            clinic before the occasional test is all your student needs, buy that instead and we’ll
            say so.
          </p>
        </Reveal>
      </Section>

      {/* 7 · One line to the other business. */}
      <Section width="wide" space="tight">
        <Reveal>
          <p className="border-t border-border pt-10 text-center text-body text-muted">
            Between every session, the companion holds the thread.{' '}
            <Link
              href="/ai"
              className="inline-flex items-center gap-1 font-semibold text-accent underline-offset-4 hover:underline"
            >
              Meet it
              <IconChevronRight size={15} />
            </Link>
          </p>
        </Reveal>
      </Section>
    </Shell>
  );
}
