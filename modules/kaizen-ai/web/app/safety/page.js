import LegalShell, { Contents } from '@/components/LegalShell';
import Card from '@/components/ui/Card';
export const metadata = { title: 'Safety - Kaizen' };

// Three structural decisions, all in service of a parent scanning this page in
// under a minute:
//
//   1. The crisis resources are the only thing on this page that could ever be
//      urgent, so they open it and they carry the strongest treatment on it: a
//      lifted card with a rose hairline, ABOVE the contents list rather than
//      below it. They had been a white card on off-white paper sitting under a
//      grey table of contents, which ranked the one urgent block last. Every
//      number is a real dial link (the text line is an sms: link) with a 44px
//      tap target, because the reader most likely to need this is holding a
//      phone and should not have to transcribe a number.
//   2. The honest negative disclosure (no third-party criminal background
//      checks yet) sits in an inset block of its own instead of being the third
//      bullet of four. It is the fact a guardian most needs to see, so it is
//      not allowed to read like a footnote.
//   3. A contents list, because this page answers five separate questions and a
//      reader usually arrives with one of them. It lists only what is BELOW it.
//      The crisis card is above it and already the first thing on the page, so
//      an entry for it would be the one link in the list pointing backwards.
const SUBHEAD = 'font-brand font-semibold text-t3 text-ink';

const CONTENTS = [
  ['#vetting', 'How human tutors are vetted'],
  ['#sessions', 'How live sessions work'],
  ['#reporting', 'Reporting a concern'],
  ['#ai', 'The AI tutor’s guardrails'],
  ['#parents', 'For parents'],
];

// href carries the scheme each line actually answers on: 741741 is a text
// line, so dialling it would reach nobody.
const CRISIS = [
  ['988', 'tel:988', 'Suicide & Crisis Lifeline. Call or text, free, 24/7.'],
  ['741741', 'sms:741741', 'Crisis Text Line. Text HOME to this number.'],
  ['911', 'tel:911', 'Emergency services, for an emergency in progress.'],
  ['1-800-422-4453', 'tel:1-800-422-4453', 'Childhelp, for abuse or neglect.'],
];

export default function Safety() {
  return (
    <LegalShell title="Safety at Kaizen" updated="July 2026">
      <p className="text-t3 text-ink">
        Most Kaizen users are students, many of them minors. That shapes everything about how the
        platform is built. This page explains our safety practices in plain language, for
        students, parents, and tutors.
      </p>

      <Card pad="lg" className="border-accent/40 shadow-lift">
        <h2 id="crisis" className="scroll-mt-24">If you&apos;re in crisis</h2>
        <p className="mt-3">
          Kaizen is a study tool, not crisis care. If you or someone you know is struggling, these
          lines are staffed by people who can help right now.
        </p>
        <dl className="mt-5 divide-y divide-border">
          {CRISIS.map(([number, href, what]) => (
            <div key={number} className="grid gap-x-5 py-1 sm:grid-cols-[11rem_1fr] sm:items-center">
              <dt>
                <a href={href} className="inline-flex min-h-11 items-center font-opmono text-t2 tabular-nums">
                  {number}
                </a>
              </dt>
              <dd className="pb-3 text-sm text-muted sm:pb-0">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-muted">
          The AI tutor is instructed to share these resources and stop tutoring if a student
          appears to be in distress.
        </p>
      </Card>

      <Contents items={CONTENTS} />

      <h2 id="vetting" className="scroll-mt-24">How human tutors are vetted</h2>
      <ul>
        <li>Every tutor application is reviewed by a person.</li>
        <li>Before a tutor can ever be booked, a Kaizen administrator must interview them and record an approval. This gate is enforced by the platform: an unapproved tutor cannot appear in the directory or be booked, full stop.</li>
        <li>Tutors who fail screening, or who violate our conduct rules, are removed immediately.</li>
      </ul>
      <Card variant="inset" pad="md">
        <h3 className={SUBHEAD}>What we don&apos;t do yet</h3>
        <p className="mt-2 text-body text-ink/85">
          <strong>We do not currently run third-party criminal background checks.</strong> We are
          working to add them and will update this page the moment that changes. Until then,
          please supervise live sessions involving minors and use the in-session report button if
          anything concerns you.
        </p>
      </Card>

      <h2 id="sessions" className="scroll-mt-24">How live sessions work</h2>
      <ul>
        <li>Sessions run as private 1:1 video rooms, small Subject Clinics (up to 6 students), Homework Hall study sessions (<strong>up to 8 students per tutor</strong>), and a larger free weekly Community Hall. Rooms open 15 minutes before the booked time and expire afterward. Only the tutor and the students who booked that specific session can enter. Any group session places minors together with an adult on live video: please supervise, as you would 1:1.</li>
        <li>Sessions are <strong>not recorded</strong> by Kaizen.</li>
        <li>Students under 18 need a parent/guardian&apos;s approval (recorded via an emailed consent link) before any live session can be booked.</li>
        <li>Tutors may never request a student&apos;s personal contact information, communicate with students off-platform, or arrange in-person meetings. Violations are grounds for immediate removal.</li>
      </ul>

      <h2 id="reporting" className="scroll-mt-24">Reporting a concern</h2>
      <div className="space-y-8">
        <div>
          <h3 className={SUBHEAD}>During a session</h3>
          <p className="mt-2">
            There&apos;s a <strong>&quot;Report a concern&quot;</strong> button inside every video
            session. Reports alert the Kaizen safety team immediately.
          </p>
        </div>
        <div>
          <h3 className={SUBHEAD}>Any other time</h3>
          <p className="mt-2">
            You can also report anything, about a session, the AI, or another user, from this
            page: email <strong>hello@kaizenedu.net</strong>{' '}
            with the subject &quot;SAFETY&quot;. Safety email is monitored with priority.
          </p>
        </div>
        <div>
          <h3 className={SUBHEAD}>What happens next</h3>
          <p className="mt-2">
            We investigate every report, and we cooperate with law enforcement. Content that
            endangers a child is reported to the National Center for Missing &amp; Exploited
            Children (NCMEC) as US law requires.
          </p>
        </div>
      </div>

      <h2 id="ai" className="scroll-mt-24">The AI tutor&apos;s guardrails</h2>
      <ul>
        <li>The AI is clearly labeled as an AI in every chat, and will say so if asked. It is instructed to keep all content age-appropriate, refuse romantic/sexual conversation, never request personal information, and never suggest off-platform contact.</li>
        <li>If a student expresses thoughts of self-harm or describes an unsafe situation, the AI is instructed to stop tutoring, respond with care, and point to the crisis resources above.</li>
        <li>The AI teaches rather than doing work for students. See our <a href="/academic-integrity">Academic Integrity policy</a>.</li>
      </ul>

      <h2 id="parents" className="scroll-mt-24">For parents</h2>
      <ul>
        <li>You&apos;ll get an email when your teen signs up, and live tutoring stays locked until you approve it.</li>
        <li>Link to your student&apos;s account from the Family tab in Settings to see grades, streaks, and weekly reports.</li>
        <li>You can withdraw live-session approval, request your teen&apos;s data, or have their account deleted at any time. Email us, or reply to any Kaizen message.</li>
      </ul>
    </LegalShell>
  );
}
