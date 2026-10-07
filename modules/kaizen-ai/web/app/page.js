// / : the front door of an in-person after-school club in Austin.
//
// WHAT THIS PAGE IS FOR. A parent arriving from "tutor near me" decides in
// about five seconds whether this is a thing she can drive to on Thursday. So
// the first facts are the city, the shape of the room, and the one purchase she
// can make today; everything else waits.
//
// WHAT CHANGED, AND WHY (docs/superpowers/specs/2026-09-02-wave2-geometry.md,
// and the audit that produced it). This page argued well for a business Kaizen
// no longer runs:
//   - It never said where it is. "Austin" appeared in ZERO user-facing strings
//     in the entire app, on the storefront of a business whose whole product is
//     being somewhere on a particular evening.
//   - The first purchase was not on it. The placement diagnostic — the seat's
//     on-ramp, credited in full against month one — had no link from here at
//     all, while the two hero actions were an explainer and the free AI.
//   - The AI was the argument by volume: half the h1 (the half in accent), two
//     whole sections against one for the seat, a price ladder on the front
//     door, and "Start free" as the closing action.
//   - Nothing above the fold changed between states, so the hero promised three
//     products in the present tense while club_enabled was false and none of
//     them could be bought; the first correction was three scrolls down.
//
// So: the club leads, in Austin, with the real cohorts a family can look at;
// the diagnostic is the primary action in every state; and the companion is one
// block, placed after the room and after the record, with its price ladder left
// on /ai and /pricing where a comparison belongs.
//
// TWO RULES THIS PAGE NOW KEEPS, because the first pass at the above kept
// neither all the way down:
//   - No sentence promises in the present tense what club_enabled is holding.
//     The a la carte line changes tense with the state, the held notice covers
//     all three club products rather than only the seat, and the diagnostic's
//     first-month credit — a windowed offer whose precondition is a seat to
//     take — renders only when there is one, gated exactly as /diagnostic gates
//     the identical claim.
//   - No demonstrative points at an empty list. With no cohorts posted (the
//     ordinary first-run state), the sentences that say "these are the rooms"
//     and "if one of these looks right" do not render at all; what stays is the
//     part that is true with zero rooms.
//
// Gating is load-bearing, not cosmetic — the rule /tutoring already follows.
// `notYetOpen` is read strictly (`!== false`), so an unreachable or ambiguous
// schedule fails closed: the hero says seats are not open yet and offers the
// list instead of a booking. The diagnostic stays reachable while held because
// /diagnostic carries its own honest gate (its own switch, app_settings
// .diagnostic_enabled) and names which of the four unavailable states applies
// rather than showing a button that fails on press.
//
// Structure (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md).
// One theme, locked: this page is paper top to bottom. No two sections share a
// layout family, and the eyebrow budget is spent once:
//   hero (the club, the city, the diagnostic) -> the marquee and its scope
//   caption -> the rooms, as cohorts -> what a seat costs -> this week and the
//   one record -> the companion, in one block -> the close.
//
// Copy discipline (docs/superpowers/plans/2026-08-21-anti-slop.md): the page
// spends its ONE contrastive construction at the companion headline, where the
// contrast with answer-machine AI is the whole point. Every other claim argues
// by mechanism, number, or concession. The Exchange transcript carries the
// argument the old copy asserted.
import Link from 'next/link';
import Shell from '@/components/dn/Shell';
import Thread from '@/components/dn/Thread';
import Exchange from '@/components/dn/Exchange';
import Reveal, { RevealGroup } from '@/components/dn/Reveal';
import Marquee from '@/components/dn/Marquee';
import InterestForm from '@/components/InterestForm';
import Button from '@/components/ui/Button';
import Section from '@/components/ui/Section';
import Eyebrow from '@/components/ui/Eyebrow';
import RoomCard from '@/components/ui/RoomCard';
import EmptyState from '@/components/ui/EmptyState';
import { IconChevronRight } from '@/components/Icons';
import { publicSchedule } from '@/lib/server/publicSchedule';
import { publicCohorts } from '@/lib/server/cohorts';
import { RETAIL, SEAT_PLAN, DIAGNOSTIC, forSale, formatPrice as dollars } from '@/lib/server/clubPricing';

// The standing seat: the one recurring product Kaizen Local sells (STRATEGY
// §5.1), and whether it may be offered at all. A page never decides what the
// company sells (Hard Rule 2), so every seat block below is enumerated through
// forSale(): retire the seat and they simply stop rendering.
const SEAT = SEAT_PLAN.seat;
const SEAT_FOR_SALE = forSale('seat');
// The same division /pricing does under "A seat, by the numbers" — if two
// surfaces divide the month differently, a parent has been quoted two prices.
const SEAT_PER_SESSION = dollars(Math.round(SEAT.priceCents / SEAT.includedSeatMonthly));
const SEAT_MINUTES_MONTH = SEAT.includedSeatMonthly * SEAT.minutes;

export const metadata = {
  title: 'Kaizen Academic Club — after-school tutoring in Austin',
  // The city is in the first clause on purpose: this is the line a parent reads
  // in a result list, and "near me" is most of why she is reading it.
  description:
    'An in-person after-school club in Austin for students 13 and up. A standing seat is '
    + `tutoring twice a week — ${SEAT.minutes} minutes, ${SEAT.ratio} students to one teacher — `
    + `${dollars(SEAT.priceCents)} a month, with Homework Halls and Subject Clinics a la carte. `
    + `Start with a ${dollars(DIAGNOSTIC.priceCents)} placement diagnostic.`,
};

export const revalidate = 60;

// The homework students actually bring. Deliberately NOT a course catalog:
// tutoring is subject-agnostic (buildSocraticPrompt), verified mastery is not,
// and the caption under the strip draws that line in view.
const BRINGS = [
  'Tonight’s algebra set',
  'An essay draft',
  'AP Bio flashcards',
  'A geometry proof',
  'SAT practice sections',
  'Spanish vocab',
  'A chem lab write-up',
  'World History dates',
  'Tomorrow’s physics quiz',
  'A calculus limit',
];

// The a la carte week, from the one source of truth. Never retyped in the
// markup. Private 1:1 used to sit in this list; it is cut (STRATEGY §11) and we
// do not publish tutor availability, so advertising it here promised a booking
// no family could make. The free Community Hall took its place because it is a
// real product a family can actually turn up to.
const CLUB_ROWS = [
  {
    name: 'Homework Hall',
    blurb: 'Supervised study; a real tutor works the room while it gets done.',
    price: dollars(RETAIL.hallSeatCents),
  },
  {
    name: 'Subject Clinic',
    blurb: 'A small group taken through one topic, start to finish.',
    price: dollars(RETAIL.clinicSeatCents),
  },
  {
    name: 'Community Hall',
    blurb: 'A full Hall session, open to anyone, once a week. No card required.',
    price: dollars(RETAIL.communityCents),
  },
];

export default async function Landing() {
  // Same sanitized source as /schedule; the page must render without a DB.
  let sessions = [];
  let notYetOpen = true;
  try {
    const data = await publicSchedule({ days: 7 });
    sessions = data.sessions || [];
    // Strict, like /tutoring: anything but an explicit false is held.
    notYetOpen = data.notYetOpen !== false;
  } catch (err) {
    // This used to be a bare `catch {}`, which made a database outage render a
    // page pixel-identical to a healthy pre-launch storefront with nothing
    // written down anywhere — so the founder could not tell an outage from a
    // quiet week (audit, part 1). The storefront still fails closed, because
    // that is the right answer for a visitor; the failure now leaves a trace
    // for the person who has to fix it.
    console.error('[landing] public schedule read failed:', err?.message);
  }
  // The seat cohorts. Reserved is a rule about PURCHASABILITY, not about
  // visibility: a family may see that a Tuesday-and-Thursday Algebra cohort
  // meets at a named place with two places left, and may not check out into it.
  // publicCohorts fails toward silence and never throws.
  const cohorts = SEAT_FOR_SALE ? await publicCohorts({ limit: 6 }) : [];
  const state = notYetOpen ? (sessions.length ? 'held' : 'empty') : 'live';
  const live = state === 'live';

  return (
    <Shell active="" tone="day">
      {/* 1 · The statement: what it is, and where. Both lines are the club —
          the AI used to hold the second one, in accent, on the front door of a
          business that sells a room. */}
      <Section width="wide" lead>
        <RevealGroup>
          <h1 className="font-brand font-semibold text-ink text-d3 sm:text-d2 lg:text-d1 max-w-[30ch]">
            <span className="block">Tutoring twice a week,</span>
            <span className="block text-accent">in a room in Austin.</span>
          </h1>
          {/* The a la carte week is stated in the tense the club is actually
              in. This sentence used to be present tense in BOTH states, so a
              held storefront promised a free weekly Community Hall above the
              fold and answered notYetOpen on the click; the held correction
              below spoke only about seats, so it did not reach these three. */}
          <p className="mt-6 text-t3 text-muted max-w-[54ch]">
            The same {SEAT.ratio} students, the same teacher, the same two evenings —
            {' '}{SEAT.minutes} minutes a session, in person.{' '}
            {live
              ? 'Around it: Homework Halls, Subject Clinics, and one free Community Hall a week.'
              : 'Around it, when we open: Homework Halls, Subject Clinics, and one free Community Hall a week.'}
            {' '}For students 13 and up.
          </p>

          {/* The state is disclosed HERE, not three scrolls down. While the
              club is held there is nothing to book, and the hero says so before
              it offers anything. */}
          <div className="mt-9">
            {live ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button href="/diagnostic" size="lg">Start with a diagnostic</Button>
                <Button href="/schedule" variant="secondary" size="lg">See this week</Button>
              </div>
            ) : (
              <>
                {/* The whole club, because club_enabled holds all three of the
                    products named above and a notice about seats alone left the
                    Halls and the Clinic reading as bookable. Scoped to the club
                    on purpose: the diagnostic has its own switch, so this line
                    must not answer for it in either direction. */}
                <p className="text-sm font-semibold text-ink">
                  The club has not opened yet — no seat, Hall or Clinic is bookable today.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button href="/diagnostic" size="lg">Start with a diagnostic</Button>
                  <Button href="#first-pick" variant="secondary" size="lg">Get first pick</Button>
                </div>
              </>
            )}
            {/* The credit is a windowed offer whose precondition is a seat to
                take, so it renders only where one can be taken: the same double
                gate /diagnostic uses (`selling && DIAGNOSTIC
                .creditsTowardFirstMonth`), plus forSale('seat') because a
                credit against a retired product is not an offer either. Held,
                the sentence keeps exactly what is true with no seat — the price,
                and what the report is. CLAIMS_MATRIX row 65 carries the rider. */}
            <p className="mt-4 max-w-[52ch] text-sm text-muted">
              The placement diagnostic is {dollars(DIAGNOSTIC.priceCents)} once: an adaptive
              assessment, then a written report from the person who would teach your child.
              {live && SEAT_FOR_SALE && DIAGNOSTIC.creditsTowardFirstMonth && (
                <>
                  {' '}Take a seat within {DIAGNOSTIC.creditWindowDays} days and it is credited
                  in full against your first month.
                </>
              )}
            </p>
          </div>
        </RevealGroup>
      </Section>

      {/* 2 · What students bring, in one quiet moving line, with the scope
          disclosure and the trademark notice directly under it: the strip names
          two College Board exams, so the reader of the strip is the reader of
          the fine print (CLAIMS_MATRIX open item 4). */}
      <Marquee tone="day" items={BRINGS} />

      <Section width="wide" space="flush" className="pt-4">
        <div className="max-w-prose space-y-1.5 text-xs text-muted">
          <p>
            A week of what students bring into the room. The companion tutors all of it between
            sessions. Verified mastery is a narrower promise: checks cover eight middle-school
            math concepts today, and the Algebra I bank is in review.
          </p>
          <p>
            SAT and AP are trademarks of the College Board, which is not affiliated with, and
            does not endorse, Kaizen.
          </p>
        </div>
      </Section>

      {/* 3 · The rooms, before the price. A parent's question order is *when
          and where* -> *who* -> *what it costs*, so the cohorts come first and
          carry the day, the venue and the named lead teacher. No purchase path
          anywhere in this section: a seat room is reserved inventory. */}
      {SEAT_FOR_SALE && (
        <Section width="wide">
          <Reveal>
            <h2 className="font-brand font-semibold text-ink text-d3 max-w-[22ch]">
              Which room, which evenings, which teacher.
            </h2>
            <p className="mt-4 text-body text-muted max-w-prose">
              A cohort is one subject, {SEAT.ratio} students and one lead teacher, meeting twice a
              week in person.{' '}
              {/* "These are the rooms" only where there are rooms: with none
                  posted the EmptyState below is the whole answer. */}
              {cohorts.length > 0 && (live
                ? 'These are the rooms running now.'
                : 'These are the first rooms; seats in them open when the club opens.')}
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-10">
            {cohorts.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cohorts.map((c) => (
                  <li key={c.id}>
                    <RoomCard
                      kind="standing_seat"
                      // The subject first, because the card already prints the
                      // evenings and a director's title often repeats them.
                      title={c.subject || c.title}
                      slots={c.slots}
                      timezone={c.timezone}
                      venue={c.venue}
                      tutorName={c.leadTutorName}
                      // Only where a place can actually be taken. /schedule and
                      // /tutoring gate these on `live` for the same reason: "1
                      // of 4 left" on a storefront that cannot sell is
                      // manufactured urgency, and it is the first thing a
                      // family would act on. `placesLeft` is also null when the
                      // enrolment read failed (shapeCohort), so an outage
                      // publishes no count either.
                      placesLeft={live ? c.placesLeft : null}
                      capacity={live ? c.capacity : null}
                      note={live && c.isFull ? 'Full — ask us to tell you when a place opens.' : null}
                      className="h-full"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              // True whether the cohorts are simply unposted or the database is
              // unreachable — the page must not describe a quiet week and an
              // outage in the same confident sentence.
              <div className="border-t border-border">
                <EmptyState
                  title="No rooms are posted right now."
                  action={
                    <Button href={live ? '/tutoring' : '#first-pick'} variant="secondary">
                      {live ? 'How the club works' : 'Get first pick'}
                    </Button>
                  }
                >
                  Each cohort posts its evenings, its room and its lead teacher here as it opens.
                </EmptyState>
              </div>
            )}
          </Reveal>

          <Reveal delay={0.14} className="mt-6">
            {/* The reserved-inventory rule is true with zero rooms and always
                renders. The demonstrative after it is not: "if one of these
                looks right" under an EmptyState points at nothing, and zero
                cohorts is the state this product is in today (0038 may not even
                be applied, in which case publicCohorts answers [] by design). */}
            <p className="max-w-prose text-sm text-muted">
              Seat rooms are reserved for the families who hold them, so they are never sold as
              drop-ins and never appear on the public schedule.
              {cohorts.length > 0 && (
                <>
                  {' '}If one of these looks right, start with the placement diagnostic: the
                  report comes from the person who would teach your child.
                </>
              )}
            </p>
          </Reveal>
        </Section>
      )}

      {/* 4 · What it costs. The standing seat is the one recurring product the
          club sells, so it carries the figure and the ledger; the rows in
          between are the a la carte week a family can buy without it. Every
          number interpolated from clubPricing. */}
      <Section width="wide">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <Reveal className="lg:col-span-4">
            {SEAT_FOR_SALE && (
              <>
                <p className="font-opmono font-semibold text-ink text-d1 tabular-nums">
                  {dollars(SEAT.priceCents)}
                </p>
                <p className="mt-3 text-sm text-muted">a month for a standing seat, in person</p>
              </>
            )}
            <Link
              href="/tutoring"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline underline-offset-4"
            >
              See how the club works
              <IconChevronRight size={15} />
            </Link>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-8">
            <h2 className="font-brand font-semibold text-ink text-d3 max-w-[20ch]">
              {SEAT_FOR_SALE ? 'A standing seat, or one visit at a time.' : 'One visit at a time.'}
            </h2>

            <ul className="mt-8 border-t border-border divide-y divide-border">
              {CLUB_ROWS.map((row) => (
                <li
                  key={row.name}
                  className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr_auto] sm:items-baseline sm:gap-6"
                >
                  <span className="font-semibold text-ink">{row.name}</span>
                  <span className="text-sm text-muted">{row.blurb}</span>
                  <span className="font-opmono text-sm text-ink tabular-nums sm:text-right">
                    {row.price}
                  </span>
                </li>
              ))}
            </ul>

            {SEAT_FOR_SALE && (
              <>
                {/* The seat's own arithmetic, as a ledger: counts and prices
                    only, so it is the one block on the page set entirely in
                    mono. The per-session figure used to be set in accent and
                    semibold, which made the loudest number on the page a unit
                    nobody can buy — seat sessions are sold by the month and
                    seat rooms are never sold singly — while the price a family
                    actually pays sat quieter above it. All three rows now read
                    at the same weight, and the month is the figure that shouts.
                    They are the three figures /pricing shows, in the same
                    order. */}
                <div className="mt-8 font-opmono text-sm tabular-nums text-muted">
                  <div className="flex items-baseline justify-between gap-4 border-t border-border py-3">
                    <span>Sessions a month, {SEAT.sessionsPerWeek} a week</span>
                    <span>{SEAT.includedSeatMonthly}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-border py-3">
                    <span>Minutes with a tutor</span>
                    <span>{SEAT_MINUTES_MONTH} a month</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-border py-3">
                    <span>Each session, {SEAT.minutes} minutes, {SEAT.ratio} students</span>
                    <span>{SEAT_PER_SESSION}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted max-w-prose">
                  Sessions count by calendar month and do not roll over.
                </p>
              </>
            )}
          </Reveal>
        </div>
      </Section>

      {/* 5 · The record: the Thread over the real week, plus the page's one
          email capture when there is nothing to book. */}
      <Section width="wide">
        <Reveal>
          <Eyebrow>One record</Eyebrow>
          <h2 className="mt-3 font-brand font-semibold text-ink text-d3 max-w-[22ch]">
            Two kinds of help.
          </h2>
          <p className="mt-4 text-body text-muted max-w-prose">
            The companion is always on. Real tutors run on a schedule. Both write to the same
            record — and a concept counts as confirmed only when a student does it unaided, on a
            later day.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-12">
          <Thread sessions={sessions} state={state} tone="day" />
        </Reveal>

        {state !== 'live' && (
          <Reveal delay={0.14} className="mt-12">
            <div id="first-pick" className="scroll-mt-24 border-t border-border pt-8">
              {/* The capture sends kind="seat", so it asks about a seat. It
                  used to say "first pick of the times", which is a drop-in
                  question filed against seat intent — and the founder's board
                  separates seat intent from drop-in intent on exactly this field. */}
              <p className="text-sm font-medium text-ink mb-1">Want a seat when the first rooms open?</p>
              <p className="text-sm text-muted mb-3 max-w-prose">
                Leave an email address and we will write when they do. You will hear first.
              </p>
              <InterestForm kind="seat" source="/" inline className="max-w-narrow" />
            </div>
          </Reveal>
        )}
      </Section>

      {/* 6 · The companion, in one block, after the room and after the record.
          This is the page's one contrastive claim, spent here because the
          contrast with do-it-for-you AI IS the pitch to parents. The transcript,
          not more assertion, carries the proof. The price ladder that used to
          sit under it belongs on /ai and /pricing, where a family is actually
          comparing tiers. */}
      <Section width="prose">
        <div className="text-center">
          <Reveal>
            <h2 className="font-brand font-semibold text-ink text-d3">
              The AI they already have will do the homework. Kaizen won’t.
            </h2>
          </Reveal>
          <Reveal delay={0.05} className="mt-6">
            <p className="text-t3 text-muted max-w-[52ch] mx-auto">
              Most parents can’t sit next to their student for every assignment. Here is the
              companion instead, mid-homework, with a student angling for the answer.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mt-10">
          <Exchange tone="day" className="text-left" />
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-8 space-y-3 border-t border-border pt-6">
            {/* Precise where "parents see everything" was vague: this names
                exactly what /api/family/summary and the monthly email carry. */}
            <p className="text-sm text-muted">
              The parent’s side is a read-only window: courses, grades, homework, and a monthly
              summary by email.
            </p>
            <p className="text-sm text-muted">
              The companion is free to use, with daily limits, and there is exactly one paid
              upgrade. It is not the product. The room is.
            </p>
          </div>
          <Link
            href="/ai"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline underline-offset-4"
          >
            Meet the companion
            <IconChevronRight size={15} />
          </Link>
        </Reveal>
      </Section>

      {/* 7 · Close: a concession, then the offer, signed across one hairline.
          The offer is the diagnostic. It used to be "Start free" into the AI
          dashboard, which closed the argument for a standing seat by handing the
          reader something else. */}
      <Section width="wide" space="tight">
        <Reveal>
          <div className="border-t border-border pt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[40ch]">
              <p className="font-brand font-semibold text-ink text-t1">
                We don’t promise grades. Nobody honest can.
              </p>
              {/* Deliberately about the room and nothing else. The confirmed-
                  mastery view a parent gets is a stage-5 deliverable and is
                  GATED in CLAIMS_MATRIX, so the front door may not hint at it
                  as an outcome we already hand over. */}
              <p className="mt-3 text-body text-muted">
                What we can show you is the room: who teaches it, when it meets, and how small
                it is.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button href="/diagnostic" size="lg">Start with a diagnostic</Button>
              {live ? (
                <Button href="/tutoring" variant="secondary" size="lg">How the club works</Button>
              ) : (
                <Button href="#first-pick" variant="secondary" size="lg">Get first pick</Button>
              )}
            </div>
          </div>
        </Reveal>
      </Section>
    </Shell>
  );
}
