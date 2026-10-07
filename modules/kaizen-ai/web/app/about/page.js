// /about : the editorial page. Who Kaizen Academy LLC is, what the two halves of
// the product are, and the standard both are held to.
//
// One theme, locked (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md):
// paper top to bottom, every size and radius from the scale, and the only figures
// set in mono are the ones the record asserts.
//
// It reads on the prose measure, so the rhythm has to come from the section
// families rather than from the grid. No two share one:
//   hero (label, headline, one line, one action) -> two paragraphs of plain prose
//   -> the teaching contract as a numbered ledger -> the standard, alone at
//   display size -> who it is for, closing on the three numbers.
// The eyebrow budget is spent once, in the hero.
//
// Every figure interpolates from clubPricing. Nothing here is hand-typed, and
// nothing here promises an outcome: the page describes the shape of the offer
// and lets /pricing carry the rest.
import Link from 'next/link';
import Shell from '@/components/dn/Shell';
import Reveal, { RevealGroup } from '@/components/dn/Reveal';
import Section from '@/components/ui/Section';
import Eyebrow from '@/components/ui/Eyebrow';
import Button from '@/components/ui/Button';
import Stat from '@/components/ui/Stat';
import { IconChevronRight } from '@/components/Icons';
import { RETAIL, SEAT_PLAN, formatPrice as dollars } from '@/lib/server/clubPricing';

export const metadata = {
  title: 'About - Kaizen',
  description: 'Kaizen Academy LLC: an after-school academic club for students 13 and up, paired with a personal AI study companion.',
};

// The teaching contract, as it is actually written: six clauses that bind a
// tutor and the companion equally. Numbered because it is a contract, not a
// feature list, and a reader should be able to cite a line by its number.
const CONTRACT = [
  'One question at a time.',
  'Hints before answers.',
  'Mastery updated only on evidence.',
  'Escalation to a human after repeated struggle.',
  'Concise in voice, precise in text, warm always.',
  'The work stays in the student’s hands, whether the helper is human or AI.',
];

export default function About() {
  // The three numbers a family actually weighs, in the order they meet them.
  const NUMBERS = [
    { value: dollars(RETAIL.communityCents), label: 'Free help every week at Community Hall.' },
    { value: dollars(RETAIL.hallSeatCents), label: 'Sessions start here. No membership required.' },
    // The one recurring product (docs/STRATEGY.md §5.1). It replaced the
    // retired Club membership figure here on 2026-09-02: the memberships are
    // no longer for sale, so a page may not quote one as the way in.
    { value: dollars(SEAT_PLAN.seat.priceCents), label: 'A standing seat: tutoring twice a week, in person.' },
  ];

  return (
    <Shell active="" tone="day">
      {/* 1 · The name is the thesis, so the hero spends its four elements on it
          and hands the reader straight to the club. */}
      <Section width="prose" lead>
        <RevealGroup>
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-3 font-brand font-semibold text-ink text-d3 sm:text-d2">
            Small steps, every day.
          </h1>
          <p className="mt-5 text-t3 text-muted">
            改善, kaizen: continuous improvement, compounding into mastery. That
            philosophy runs through everything here.
          </p>
          <div className="mt-8">
            <Button href="/tutoring" size="lg">How the club works</Button>
          </div>
        </RevealGroup>
      </Section>

      {/* 2 · Plain prose. Two paragraphs, one for each half of the product, on
          the reading measure with nothing else competing for the column. */}
      <Section width="prose" space="tight">
        <Reveal className="border-t border-border pt-10 sm:pt-12">
          <h2 className="font-brand font-semibold text-ink text-t1">What we’re building</h2>
          <p className="mt-5 text-body text-ink/80">
            Kaizen Academy LLC is an after-school academic club. The one thing we sell by the
            month is a standing seat: tutoring twice a week, in person, with the same small group
            and the same teacher. Around it, a family can buy a Homework Hall visit or a Subject
            Clinic one at a time, and one community hour every week is free.
          </p>
          <p className="mt-4 text-body text-ink/80">
            It comes paired with a personal AI study companion that handles the daily loop
            between sessions: homework tracking, Socratic teaching, spaced-repetition
            review, honest mastery scores.
          </p>
        </Reveal>
      </Section>

      {/* 3 · The contract as a ledger: hairline rows, the clause on the left and
          its number in the margin. Grouped by rules, not by cards. */}
      <Section width="prose" space="tight">
        <Reveal className="border-t border-border pt-10 sm:pt-12">
          <h2 className="font-brand font-semibold text-ink text-t1">The teaching contract</h2>
          <ol className="mt-6 divide-y divide-border">
            {CONTRACT.map((clause, i) => (
              <li key={clause} className="flex items-baseline gap-5 py-4">
                <span className="font-opmono text-xs text-muted tabular-nums">
                  0{i + 1}
                </span>
                <p className="text-body text-ink/80">{clause}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </Section>

      {/* 4 · The standard, alone. No heading: the one section on the page that
          is a single sentence at display size.
          It used to be the only section without the opening hairline, and with
          `loose` under it that left 240px of empty column between it and the
          next heading — at 1440 the page read as if it had ended, and the
          sentence floated rather than landing. It takes the same rule and the
          same rhythm as its neighbours now, so the emphasis comes from the type
          and the short measure instead of from a hole in the page.
          The size steps with the viewport for the same reason: at 390 a d3
          sentence ran four lines directly under a d3 h1 and out-shouted it, so
          the statement opens a step below the headline and grows into display
          size only where there is a column to carry it. */}
      <Section width="prose" space="tight">
        <Reveal className="border-t border-border pt-10 sm:pt-12">
          <p className="font-brand font-semibold text-ink text-t1 sm:text-d3 max-w-[26ch]">
            One design, one standard: good enough that a student would rather use it
            than not.
          </p>
        </Reveal>
      </Section>

      {/* 5 · Who it is for, closing on the three numbers. A stat row, not three
          cards: these are figures the record asserts, so they are set in mono and
          separated by hairlines rather than boxed. Same rhythm as every other
          section: the close earns its weight from the numbers, not from extra
          padding around them. */}
      <Section width="prose" space="tight">
        <Reveal className="border-t border-border pt-10 sm:pt-12">
          <h2 className="font-brand font-semibold text-ink text-t1">Who it’s for</h2>
          <p className="mt-5 text-body text-ink/80">
            US students <strong className="font-semibold text-ink">ages 13 and up</strong>:
            middle schoolers who qualify, high schoolers, and early college. These three numbers
            are where a family starts, and nothing on the way in costs anything.
          </p>

          <div className="mt-8 grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            {NUMBERS.map((n) => (
              <Stat
                key={n.label}
                value={n.value}
                label={n.label}
                className="py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0"
              />
            ))}
          </div>

          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            Full pricing
            <IconChevronRight size={15} />
          </Link>
        </Reveal>
      </Section>
    </Shell>
  );
}
