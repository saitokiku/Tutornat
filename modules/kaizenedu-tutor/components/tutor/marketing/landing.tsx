import Link from 'next/link';

import { publicConfig } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { SUBJECTS } from '@/lib/tutor/graph/subjects';

import { TalkStart } from '@/components/tutor/learn/talk-start';

import { Storyboard } from './storyboard';

const AI_LABEL = publicConfig.product.aiLabel;
const TUTOR_NAME = publicConfig.product.tutorName;
const GUEST = publicConfig.guest;
const LEVELS = publicConfig.guestLevels;
const BANDS = publicConfig.bands;

/**
 * The landing page (spec R13, D35, D36). One press beside the headline is the
 * whole way in: the tutor speaks first. Under it, plain sentences about what
 * it does, what it teaches, what it will not do, and what happens to the
 * visitor's data. There is nothing to sign up for, and every number on the
 * page is read from the configuration, never typed.
 */
export function Landing({ supportEmail }: { supportEmail: string | null }) {
  return (
    <div className="flex flex-col gap-24 py-10 sm:py-16">
      <Hero />
      <HowItWorks />
      <Subjects />
      <WillNotDo />
      <Privacy />
      <Faq supportEmail={supportEmail} />
    </div>
  );
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start"
    >
      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <h1 id="hero-title" className="nt-display">
          Say what you are stuck on. {TUTOR_NAME} talks it through with you.
        </h1>
        <p className="nt-lead">
          An {AI_LABEL} that listens, draws it out on a whiteboard, and checks that you got it. Any
          subject, from the early years to adult, with grades 4 to 9 first. Free, with no account.
        </p>
      </div>
      <TalkStart />
    </section>
  );
}

function HowItWorks() {
  const lengths = Object.values(BANDS).map((band) => band.sessionMinutes);
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  const panes = [
    {
      title: `The ${AI_LABEL}, and how you can tell what it is doing`,
      body: 'A presence, not a face: it opens while it listens, draws in while it thinks, and moves with the voice while it speaks. The label stays on screen, and it says it is an AI when asked.',
    },
    {
      title: 'The whiteboard',
      body: 'Bars, number lines, tables, and steps get drawn while the tutor speaks, in whatever subject you brought. Interrupt at any point and the drawing pauses.',
    },
    {
      title: 'The record',
      body: 'Every turn is transcribed and every check is graded and kept, so the next session picks up where this one stopped and the progress page shows what the checks found.',
    },
  ];
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="flex scroll-mt-20 flex-col gap-8"
    >
      <div className="flex flex-col gap-3">
        <h2 id="how-title" className="nt-h1">
          How a session works
        </h2>
        <p className="nt-lead">
          A session looks like a call: the tutor on one tile, the whiteboard beside it, the record
          underneath. It runs {shortest} to {longest} minutes depending on the level, and it ends on
          time.
        </p>
      </div>
      <Storyboard />
      <ol className="sb-caption grid gap-6 sm:grid-cols-3">
        {panes.map((pane, index) => (
          <li key={pane.title} className="flex flex-col gap-2">
            <span className="nt-label nt-num">{index + 1}</span>
            <h3 className="nt-h3">{pane.title}</h3>
            <p className="nt-small">{pane.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Subjects() {
  return (
    <section
      id="subjects"
      aria-labelledby="subjects-title"
      className="grid scroll-mt-20 gap-8 lg:grid-cols-[1fr_1.4fr]"
    >
      <div className="flex flex-col gap-3">
        <h2 id="subjects-title" className="nt-h1">
          What it teaches
        </h2>
        <p className="nt-lead">
          Pick a subject and say what you are working on, in your own words. The fractions to
          pre-algebra sequence has a placement check and a fixed order of twelve skills; in every
          subject, the checks are questions the tutor writes as it goes.
        </p>
      </div>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h3 className="nt-h3">Subjects</h3>
          <ul className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => (
              <li
                key={subject.id}
                className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-[length:var(--nt-text-body)] font-medium"
              >
                {subject.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="nt-h3">Levels</h3>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {LEVELS.map((level) => (
              <div key={level.id} className="flex flex-col gap-0.5">
                <dt className="text-[length:var(--nt-text-body)] font-medium">{level.label}</dt>
                <dd className="nt-small">{level.hint}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function WillNotDo() {
  const rules = [
    {
      title: 'Do the work for you.',
      body: 'On anything that looks graded, coach mode withholds the final answer until you have tried one step. After that, asking for the answer gets a worked example and a similar problem to do.',
    },
    {
      title: 'Grade its own help as mastery.',
      body: 'Every hint and every check is written down as helped or unhelped. A skill counts as learned only after a check with no help, a day or more later.',
    },
    {
      title: 'Pretend to be a person.',
      body: `The ${AI_LABEL} label stays on screen the whole session, and it says it is an AI when asked.`,
    },
  ];
  return (
    <section aria-labelledby="will-not-title" className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <h2 id="will-not-title" className="nt-h1">
        What it will not do
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {rules.map((rule) => (
          <li key={rule.title} className="flex flex-col gap-1 py-5 first:pt-0 last:pb-0">
            <p className="nt-h3">{rule.title}</p>
            <p className="nt-body text-muted-foreground">{rule.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Privacy() {
  const points = [
    'No account. Nothing is asked about you: no name, no email, no birth year.',
    'One cookie in this browser is the only thing that connects you to your work.',
    'Your voice is used to make out the words and is never stored as audio.',
    'The camera stays off.',
    'Start over, in the header, deletes everything now.',
    `Work left untouched for ${GUEST.retentionDays} days is deleted at the next weekly cleanup.`,
  ];
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-title"
      className="grid scroll-mt-20 gap-8 lg:grid-cols-[1fr_1.4fr]"
    >
      <div className="flex flex-col gap-3">
        <h2 id="privacy-title" className="nt-h1">
          Privacy in plain words
        </h2>
        <p className="nt-lead">
          The full text is on the{' '}
          <Link href={PRODUCT_ROUTES.legalPrivacy} className="underline underline-offset-4">
            privacy page
          </Link>
          . This is the short version.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {points.map((point) => (
          <li
            key={point}
            className="nt-body flex items-start gap-3 rounded-(--radius) border border-border bg-card px-4 py-3"
          >
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

const FAQ: ReadonlyArray<{
  question: string;
  answer: string;
  /** Optional follow-through for an answer that continues on another page. */
  href?: string;
  hrefLabel?: string;
}> = [
  {
    question: 'Is it for children under 13?',
    answer:
      'A grown-up should be nearby for the youngest levels. Nothing is asked about the child, and the youngest levels get shorter sessions.',
  },
  {
    question: 'What happens to my work?',
    answer: `It stays with this browser, behind one cookie, so you can pick up where you left off. Start over deletes all of it now, and anything left untouched for ${GUEST.retentionDays} days is deleted at the next weekly cleanup.`,
  },
  {
    question: 'Can I use it on my phone?',
    answer:
      'Yes. It runs in the browser on desktop and mobile, with push-to-talk on phones and a text box that always works when audio does not.',
  },
  {
    question: 'Where is the fractions sequence?',
    answer:
      'On your Learn page, under "Or pick up where you left off". It starts with a short placement check and then works through twelve skills from fractions to pre-algebra.',
  },
  {
    question: 'What is it built on?',
    answer:
      'An open-source classroom engine called OpenMAIC, plus a stack of other open-source work. The credits page lists each piece and its licence.',
    href: PRODUCT_ROUTES.legalCredits,
    hrefLabel: 'See the credits',
  },
  {
    question: 'How do I reach a person?',
    answer: 'Write to support. The form says whether a person was told, and replies come by email.',
    href: PRODUCT_ROUTES.support,
    hrefLabel: 'Write to support',
  },
];

function Faq({ supportEmail }: { supportEmail: string | null }) {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto flex w-full max-w-3xl scroll-mt-20 flex-col gap-6"
    >
      <h2 id="faq-title" className="nt-h1">
        Questions
      </h2>
      <dl className="flex flex-col divide-y divide-border">
        {FAQ.map((item) => (
          <div key={item.question} className="flex flex-col gap-2 py-5 first:pt-0 last:pb-0">
            <dt className="text-[length:var(--nt-text-lead)] font-medium">{item.question}</dt>
            <dd className="nt-body text-muted-foreground">
              {item.answer}
              {item.href ? (
                <>
                  {' '}
                  <Link href={item.href} className="underline underline-offset-4">
                    {item.hrefLabel}
                  </Link>
                  {item.href === PRODUCT_ROUTES.support && supportEmail ? (
                    <>
                      {' '}
                      or email{' '}
                      <a href={`mailto:${supportEmail}`} className="underline underline-offset-4">
                        {supportEmail}
                      </a>
                    </>
                  ) : null}
                  .
                </>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="nt-small">
        The rules in full:{' '}
        <Link href={PRODUCT_ROUTES.legalTerms} className="underline underline-offset-4">
          Terms
        </Link>
        ,{' '}
        <Link href={PRODUCT_ROUTES.legalPrivacy} className="underline underline-offset-4">
          Privacy
        </Link>
        ,{' '}
        <Link href={PRODUCT_ROUTES.legalAi} className="underline underline-offset-4">
          AI disclosure
        </Link>
        .
      </p>
    </section>
  );
}
