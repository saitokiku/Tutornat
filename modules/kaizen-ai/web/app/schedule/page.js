// /schedule - the public weekly schedule: Homework Hall, Subject Clinics, and
// the free weekly Community Hall. Browsable signed-out; booking lands in the
// dashboard where members see their own pricing. While selling is held the
// browser shows the real week in preview with first-pick capture.
//
// One theme, locked (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md).
// This page used to be a marketing masthead bolted onto a body written in the
// old app system, so it visibly changed systems below the fold. Now it is one
// measure (prose, because the board is a record you read down), one type scale,
// one radius scale, top to bottom.
//
// Two layout families and no more: a text masthead, then the board itself,
// with one closing rail for the thing the board deliberately does not carry.
// The eyebrow budget for the page is spent here, on the hero.
//
// ScheduleBrowser self-manages LIVE / HELD / EMPTY, so this wrapper does not
// read the schedule itself. It does read the cohorts, because they are not on
// the board and nothing else on this page could say so — and it reads the club
// gate, because `publicCohorts` does not.
//
// A HELD STOREFRONT MAY NOT MANUFACTURE URGENCY (Hard Rule 4). `publicSchedule`
// answers `notYetOpen` and the board renders its explicit "not open yet" state
// from it; `publicCohorts` has no gate at all, so the rail below it once
// printed live scarcity — "2 of 4 left" — for a product nobody could buy,
// directly under a board that had just said selling was not open. The gate is
// read here, once, and the rail loses its counts while it is shut. The day, the
// venue and the lead tutor stay: those are facts about a room, not inventory.
//
// RESERVED IS NOT THE SAME AS HIDDEN. `publicSchedule` filters standing-seat
// rooms off this board, and correctly: nobody may buy a seat room a session at
// a time. That was then read as a rule about visibility, and the result was a
// storefront that could not admit its own main product exists. A family may
// see that a Tuesday-and-Thursday cohort runs, where, with whom, and whether
// it has room. They may not check out into it, and no card below offers to
// let them.

import { Suspense } from 'react';
import Link from 'next/link';
import Shell from '@/components/dn/Shell';
import Reveal from '@/components/dn/Reveal';
import Section from '@/components/ui/Section';
import Eyebrow from '@/components/ui/Eyebrow';
import RoomCard from '@/components/ui/RoomCard';
import ScheduleBrowser from '@/components/ScheduleBrowser';
import { publicCohorts } from '@/lib/server/cohorts';
import { getSettings } from '@/lib/server/context';
import { IconChevronRight } from '@/components/Icons';
import { RETAIL, SEAT_PLAN, forSale, formatPrice as dollars } from '@/lib/server/clubPricing';

// What is for sale decides whether the rail exists at all; a page never makes
// that call itself (Hard Rule 2).
const SEAT_FOR_SALE = forSale('seat');

/**
 * Is selling open? The same `app_settings.club_enabled` switch `publicSchedule`
 * turns into `notYetOpen`, read directly because the cohort rail does not come
 * through `publicSchedule`.
 *
 * Fails CLOSED on every failure mode rather than only on a false value: an
 * unseeded key, an unreadable settings table, no service role at all. Held is
 * the safe answer because held only ever removes an affordance — the worst case
 * is a real cohort shown without its places-left line.
 */
async function clubOpen() {
  try {
    const settings = await getSettings();
    return settings.club_enabled === true;
  } catch (err) {
    console.error('[schedule] club gate unreadable, staying held:', err?.message);
    return false;
  }
}

// The gate is a live read, so this page cannot be prerendered into whichever
// answer happened to be true at build time (same reason /tutors is dynamic).
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'This week’s schedule - Kaizen Academic Club',
  description: `Homework Hall, Subject Clinics, and a free weekly Community Hall for students 13+. Real tutors after school, seats from ${dollars(RETAIL.hallSeatCents)}.`,
};

export default async function SchedulePage({ searchParams }) {
  const params = await searchParams;
  const subject = typeof params?.subject === 'string' ? params.subject : '';
  const kind = typeof params?.kind === 'string' ? params.kind : '';
  // Fails toward an empty list, never toward a thrown page: the board below is
  // the reason this route exists and it must render without a database. The
  // gate rides along, because what the rail may SAY depends on it.
  const [live, cohorts] = await Promise.all([
    clubOpen(),
    SEAT_FOR_SALE ? publicCohorts({ limit: 6 }).catch(() => []) : Promise.resolve([]),
  ]);
  return (
    <Shell active="" tone="day">
      <Section width="prose" lead>
        <Reveal>
          <Eyebrow>The Schedule</Eyebrow>
          <h1 className="mt-3 font-brand font-semibold text-ink text-d3 sm:text-d2 max-w-[14ch]">
            This week&apos;s schedule
          </h1>
          <p className="mt-5 text-t3 text-muted max-w-[46ch]">
            Homework Hall from {dollars(RETAIL.hallSeatCents)}, Subject Clinics, and one free
            Community Hall every week, for students 13 and up.
          </p>
        </Reveal>

        {/* The board opens on a hairline rather than in a card: it is the page,
            not a panel sitting on it. */}
        <div className="mt-10 border-t border-border pt-8">
          <Suspense fallback={<p className="text-sm text-muted py-10 text-center">Loading…</p>}>
            <ScheduleBrowser initialSubject={subject} initialKind={kind} />
          </Suspense>
        </div>
      </Section>

      {/* The closing rail: what this board is not. Sits below the week because
          the week is what the page is for, and because the sentence only makes
          sense to someone who has just read a board with no seats on it. */}
      {SEAT_FOR_SALE ? (
        <Section width="prose" space="tight">
          <Reveal>
            <div className="border-t border-border pt-8">
              <h2 className="font-brand font-semibold text-ink text-t1">
                Not on this board: the standing seats.
              </h2>
              <p className="mt-3 text-body text-muted">
                A standing seat is reserved: the same room {SEAT_PLAN.seat.sessionsPerWeek} evenings a
                week, held for one child whether or not they turn up. There is no drop-in price for
                one, so seat rooms never appear above. The cohorts themselves are not a secret.
              </p>
              {live ? null : (
                <p className="mt-3 text-body text-muted">
                  We are not placing children into them yet. So each card below says when a cohort
                  meets, where, and who leads it — and not how many places are left: a count of
                  remaining places is an invitation to hurry, and there is nothing here to hurry for
                  until the club opens.
                </p>
              )}

              {cohorts.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-4">
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
              ) : (
                <p className="mt-4 text-sm text-muted">
                  No cohort is posted yet. As each one is set, its evenings, its room and the teacher
                  who leads it appear here.
                </p>
              )}

              <Link
                href="/tutoring"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
              >
                How a seat works
                <IconChevronRight size={15} />
              </Link>
            </div>
          </Reveal>
        </Section>
      ) : null}
    </Shell>
  );
}
