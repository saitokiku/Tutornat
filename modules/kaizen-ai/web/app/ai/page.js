// /ai: the AI companion, and the one dark surface in the product. Coal top to
// bottom, header and footer included; there is no mid-page inversion and no
// paper bridge at the end (the page links out to /tutoring in the dark).
//
// Structure: the Exchange transcript leads, so the demo argues before any copy
// asserts; then where it fits, the rules it teaches by, the record it shares
// with the tutors, and the plans. One capture form on the whole page, at
// #ai-capture, which every held ladder card links to.

import Shell from '@/components/dn/Shell';
import Thread from '@/components/dn/Thread';
import Exchange from '@/components/dn/Exchange';
import Reveal, { RevealGroup } from '@/components/dn/Reveal';
import AiLadder from '@/components/AiLadder';
import InterestForm from '@/components/InterestForm';
import Section from '@/components/ui/Section';
import Button from '@/components/ui/Button';
import Eyebrow from '@/components/ui/Eyebrow';
import { publicSchedule } from '@/lib/server/publicSchedule';

export const revalidate = 60;

export const metadata = {
  title: 'AI Study Companion - Kaizen',
  description:
    'A Socratic AI study companion for students 13 and up. It asks one question at a time, hints before full answers, and confirms mastery only on checks passed alone, days after the lesson. Free tier with daily limits.',
};

// The teaching contract. Each body states the mechanism; the enforcement
// lives in buildSocraticPrompt (1, 2) and lib/engine (3, 4 — the ledger's
// human_recommended flag, which surfaces to tutors in the session brief,
// not as a message in chat).
const CONTRACT = [
  {
    pre: '',
    key: 'One question',
    post: ' at a time',
    body: 'Each reply asks one thing back and waits. The student talks through the step; the companion checks it.',
  },
  {
    pre: '',
    key: 'Hints',
    post: ' before answers',
    body: 'A nudge comes first. The full solution appears in review, after a real attempt, with the why attached.',
  },
  {
    pre: 'Mastery on ',
    key: 'evidence',
    post: '',
    body: 'A concept is confirmed by short checks the student passes alone, more than once, each at least two days after the last lesson on it, graded on our servers. Work done with help still counts toward the picture, at a discount, and is marked as assisted.',
  },
  {
    pre: '',
    key: 'A human',
    post: ' when it matters',
    body: 'When the same concept keeps failing checks without help, the record flags it for human time, and the session brief a tutor starts from shows that flag.',
  },
];

// Four ordinary moments; usage examples, not a time-of-day identity.
const MOMENTS = [
  ['In class', 'A concept slips past. Ask right there; one question back usually catches the thinking before it hardens.'],
  ['At homework', 'Stuck at 9 PM: a hint first, then a smaller question, then, after a real attempt, the worked example.'],
  ['Before a test', 'It drills whatever still wobbles, one problem at a time, until the student can do the last one alone.'],
  ['With the parent', 'The family view shows the week as it happened: what was practiced, what improved, what still needs work.'],
];

// One record: what it holds, who sees it, what counts.
const RECORD = [
  ['What it holds.', 'Due dates, courses, practice, and mastery, working and confirmed, in one place the student and the companion both read.'],
  ['Who sees it.', 'The parent’s side is a read-only window on the same record — courses, grades, homework — plus a summary by email at the start of each month. A tutor who takes a session starts from the record, too.'],
  ['What counts.', 'Confirmed mastery appears only where our item bank can actually check it; the rest shows as working progress, labeled plainly.'],
];

export default async function AIPage() {
  let sessions = [];
  let notYetOpen = true;
  try {
    ({ sessions, notYetOpen } = await publicSchedule({ days: 7 }));
  } catch {
    // Renders without a database; the Thread falls back to illustrative kinds.
  }
  const state = notYetOpen ? (sessions.length ? 'held' : 'empty') : 'live';
  // One boolean per SKU — see the note in components/AiLadder.js.
  const buyable = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_AI_SOLO
  );
  const aiHallSellable = state === 'live' && Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_AI_HALL
  );
  // The capture section has to exist whenever ANY card links to it. It used to
  // render only while ai_solo was held, so the moment that tier was wired the
  // AI + Hall card went on pointing at #ai-capture and the anchor was gone.
  const anyHeld = !buyable || !aiHallSellable;

  return (
    <Shell active="ai" tone="night">
      {/* 1 · Hero. Four elements, one action. The single ambient glow is the
          ember token at a low alpha, so it tints the coal rather than lighting
          the page up like a toy. */}
      <Section width="prose" lead className="relative overflow-hidden text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] max-w-none -translate-x-1/2 -translate-y-1/3"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--c-ember) / 0.08), transparent)' }}
        />
        <RevealGroup className="relative">
          <Eyebrow tone="night">AI study companion</Eyebrow>
          <h1 className="font-brand font-semibold text-paper text-d2 sm:text-d1 mt-5">
            Ask it for the answer. It asks <span className="italic text-ember">one back</span>.
          </h1>
          <p className="text-t3 text-nightmuted max-w-narrow mx-auto mt-5">
            For students 13 and up. Hints come before answers, and mastery counts only on
            checks passed alone, days later.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <Button href="/dashboard" tone="night" size="lg">Start free</Button>
            <Button href="#plans" variant="secondary" tone="night" size="lg">See plans</Button>
          </div>
        </RevealGroup>
      </Section>

      {/* 2 · Watch it teach. The transcript carries the argument, so it gets the
          wide half of the split and the copy stays a caption. */}
      <Section width="wide">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16 lg:items-center">
          <Reveal>
            <h2 className="font-brand font-semibold text-paper text-d3 sm:text-d2">
              Watch it teach.
            </h2>
            <p className="text-body text-nightmuted mt-4">
              Asked to skip to the answer, it turns the request into one guided step.
              The full solution comes later, in review, after a real attempt.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Exchange tone="night" />
          </Reveal>
        </div>
      </Section>

      {/* 3 · Where it fits: four moments in one framed grid, hairlines only. */}
      <Section width="wide">
        <Reveal>
          <h2 className="font-brand font-semibold text-paper text-d3 sm:text-d2">
            Where it fits.
          </h2>
          <p className="text-body text-nightmuted mt-4 max-w-prose">
            Four ordinary moments, one job: keep the student thinking.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 grid gap-px sm:grid-cols-2 bg-nightline border border-nightline rounded-md overflow-hidden">
            {MOMENTS.map(([moment, line]) => (
              <div key={moment} className="bg-coal2 p-6 sm:p-8">
                <h3 className="font-brand font-semibold text-paper text-t2">{moment}</h3>
                <p className="text-sm text-nightmuted mt-3">{line}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* 4 · The teaching contract: four numbered rules, ruled like a record. */}
      <Section width="prose">
        <Reveal>
          <h2 className="font-brand font-semibold text-paper text-d3 sm:text-d2">
            The teaching contract.
          </h2>
          <p className="text-body text-nightmuted mt-4">
            The same rules our human tutors work by.
          </p>
        </Reveal>
        <div className="mt-10 border-b border-nightline">
          {CONTRACT.map(({ pre, key, post, body }, i) => (
            <Reveal key={key} delay={i * 0.06}>
              <div className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-t border-nightline py-7">
                {/* A count, so it is set in mono. */}
                <span className="font-opmono text-xs tabular-nums text-ember pt-2">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-brand font-semibold text-paper text-t1">
                    {pre}
                    <span className="text-ember">{key}</span>
                    {post}
                  </h3>
                  <p className="text-body text-nightmuted mt-2">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          {/* The page's one flat assertion, spent after the four mechanisms. */}
          <p className="font-brand font-semibold text-paper text-t1 mt-10">
            Nobody here, human or AI, does the work for the student.
          </p>
        </Reveal>
      </Section>

      {/* 5 · The Thread: the rail, with the week resting on it. */}
      <Section width="wide">
        <Reveal>
          <h2 className="font-brand font-semibold text-paper text-d3 sm:text-d2">
            Real sessions, on the same record.
          </h2>
          <p className="text-body text-nightmuted mt-4 max-w-prose">
            When it points to a Hall visit, a clinic, or a session in a standing seat, the
            tutor walks in knowing what the record shows.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <Thread sessions={sessions} state={state} tone="night" className="mt-10" />
        </Reveal>
      </Section>

      {/* 6 · Plans. Held cards link down to the one shared capture form. */}
      <Section id="plans" width="wide" className="scroll-mt-20">
        <Reveal>
          <h2 className="font-brand font-semibold text-paper text-d3 sm:text-d2">
            The plans.
          </h2>
          <p className="text-body text-nightmuted mt-4 max-w-prose">
            The price shown is the price charged; both read from one table.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <AiLadder
            buyable={buyable}
            hallSellable={aiHallSellable}
            tone="night"
            source="/ai"
            captureHref="#ai-capture"
            className="mt-12"
          />
          {/* Visit terms. This is the disclosure that keeps "includes one
              Homework Hall visit" honest, so it is set in the secondary token
              (6.1:1 on coal) rather than at a whisper opacity. */}
          <p className="text-sm text-nightmuted mt-8 max-w-prose">
            AI + Hall includes one Homework Hall visit each calendar month; it doesn&apos;t
            bank. The free tier has daily limits.
          </p>
        </Reveal>
      </Section>

      {/* 7 · The one capture form on the page: every held card above links
          here rather than embedding a second email field. Renders only while a
          plan is held, and says WHICH — "plans open soon" is untrue once the
          one upgrade a family can buy is on sale. */}
      {anyHeld && (
        <Section id="ai-capture" width="narrow" space="tight" className="scroll-mt-24">
          <Reveal>
            <div className="text-center">
              <p className="text-t3 text-paper">
                {buyable
                  ? 'AI + Hall isn’t open yet. Leave an email and you’ll hear when it is.'
                  : 'Plans open soon. Leave an email and you’ll hear first.'}
              </p>
              <InterestForm kind="ai" source="/ai" inline tone="night" className="mt-6 text-left" />
            </div>
          </Reveal>
        </Section>
      )}

      {/* 8 · One record: three statements, grouped by space alone. */}
      <Section width="prose">
        <Reveal>
          <h2 className="font-brand font-semibold text-paper text-d3 sm:text-d2">
            One student, one record.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 space-y-6">
            {RECORD.map(([lead, rest]) => (
              <p key={lead} className="text-body">
                <span className="font-semibold text-ember">{lead}</span>{' '}
                <span className="text-nightmuted">{rest}</span>
              </p>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* 9 · The way out, in the dark. The product is light everywhere else,
          but this page does not change theme to say so. */}
      <Section width="prose" space="tight">
        <Reveal>
          <div className="border-t border-nightline pt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-brand font-semibold text-paper text-t1">
              When it&apos;s time for a human, you&apos;re already home.
            </p>
            <Button href="/tutoring" variant="secondary" tone="night" className="shrink-0">
              Explore tutoring
            </Button>
          </div>
        </Reveal>
      </Section>
    </Shell>
  );
}
