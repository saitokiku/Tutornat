import LegalShell, { Contents } from '@/components/LegalShell';
export const metadata = { title: 'Privacy Policy - Kaizen' };

// The two questions a reader actually opens a privacy policy with are "what do
// they have on me" and "how do I get it back or get rid of it". So:
//
//   "What we collect" is a definition list keyed on the category, because that
//   is a reference table pretending to be a bullet list.
//
//   "Your rights" keeps its prose bullets, but every affordance is named by its
//   EXACT label in Settings ("Download my data", "Delete account & data",
//   "Privacy preferences"). Those labels are a promise: a policy that describes
//   a button the product does not have by that name is a policy nobody can act
//   on. If a label changes in Settings, it changes here in the same commit.
//
//   Retention periods are set in mono, like every other record value in the
//   product, so "24 months" reads as an asserted number rather than a phrase.
const SUBHEAD = 'font-brand font-semibold text-t3 text-ink';

const CONTENTS = [
  ['#collect', 'What we collect'],
  ['#use', 'How it’s used'],
  ['#children', 'Children and teens'],
  ['#rights', 'Your rights'],
  ['#retention', 'Where it lives and how long'],
  ['#providers', 'Service providers'],
  ['#security', 'Security and breaches'],
  ['#contact', 'Contact'],
];

// One row shape for the whole inventory: the category, then what sits under
// it. Stated once so six rows cannot drift into six layouts. The category used
// to hold an 11rem rail beside the description, which set the description to a
// measure of its own; the term sits above its entry instead, so every row reads
// at the same measure as the rest of the page.
const DL_ROW = 'gap-1 border-t border-border py-4';

const COLLECTED = [
  {
    term: 'Account',
    body: (
      <>
        Email, name, role (student / parent / tutor), and birth year, used once to determine
        whether you&apos;re a minor. See <a href="#children">Children and teens</a> below.
      </>
    ),
  },
  {
    term: 'Learning data',
    body: (
      <>
        Your courses, uploaded materials (syllabi, worksheets, photos of homework), assignments
        and grades you enter, tutor conversations, practice results, and mastery scores.
      </>
    ),
  },
  {
    term: 'Voice',
    body: (
      <>
        If you use voice tutoring, your audio is transcribed by our speech provider and the
        transcript is used for the session. We store session length and a short summary, not the
        raw audio.
      </>
    ),
  },
  {
    term: 'Tutoring marketplace',
    body: (
      <>
        If you book a human tutor: session times, subject, your session notes, ratings and written
        reviews. If you apply to be a tutor: your application, r&eacute;sum&eacute;, and vetting
        records.
      </>
    ),
  },
  {
    term: 'Payments',
    body: (
      <>
        Handled by Stripe. We never see or store card numbers; we keep records of what was
        purchased and its status.
      </>
    ),
  },
  {
    term: 'Usage',
    body: (
      <>
        Feature counts and AI cost estimates, used for plan limits and abuse prevention. Optional,
        anonymous product analytics, which you can turn off in Settings under{' '}
        <strong>&quot;Privacy preferences&quot;</strong>.
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="August 2026">
      <p className="text-t3 text-ink">
        This policy explains what Kaizen Academy LLC (&quot;Kaizen&quot;, &quot;we&quot;) collects,
        why, and the rights you have over it.
      </p>
      <p>
        Kaizen is built for students, including teens, so we hold ourselves to a simple rule:{' '}
        <strong>
          we collect only what the product needs, we never sell or share personal information for
          advertising, and you can take or delete your data at any time.
        </strong>
      </p>

      <Contents items={CONTENTS} />

      <h2 id="collect" className="scroll-mt-24">What we collect</h2>
      <dl className="border-b border-border">
        {COLLECTED.map(({ term, body }) => (
          <div key={term} className={`grid ${DL_ROW}`}>
            <dt className="font-semibold text-ink">{term}</dt>
            <dd className="text-ink/85">{body}</dd>
          </div>
        ))}
      </dl>

      <h2 id="use" className="scroll-mt-24">How it&apos;s used</h2>
      <ul>
        <li>To run the product: your materials and mastery state personalize the tutor; your bookings run the marketplace.</li>
        <li>Tutor messages and uploaded materials are processed by our AI providers (Anthropic for tutoring; OpenAI for voice; Google only if you use image generation) solely to generate your responses.</li>
        <li>A small sample of AI conversations may be reviewed internally to improve tutoring quality and safety.</li>
        <li>We send transactional email (receipts, booking confirmations, safety notices, guardian consent). Non-essential email has an unsubscribe link and an off switch in Settings.</li>
        <li><strong>We do not sell or share your personal information for cross-context behavioral advertising, and we show no third-party ads.</strong></li>
      </ul>

      <h2 id="children" className="scroll-mt-24">Children and teens</h2>
      <div className="space-y-8">
        <div>
          <h3 className={SUBHEAD}>Under 13</h3>
          <p className="mt-2">
            Kaizen does not allow self-registration by children under 13, and we do not knowingly
            collect their personal information. If you believe a child under 13 has created an
            account, contact us and we will delete it.
          </p>
        </div>
        <div>
          <h3 className={SUBHEAD}>Ages 13 to 17</h3>
          <p className="mt-2">
            Teens may use the AI study tools. At signup we collect a parent/guardian email and
            notify them. <strong>Live video tutoring with a human tutor stays locked until the
            parent/guardian approves it</strong>{' '}
            via the emailed consent link. Parents/guardians of any minor can contact us to
            review, correct, or delete their teen&apos;s data or to withdraw consent.
          </p>
        </div>
        <div>
          <h3 className={SUBHEAD}>What a linked parent sees</h3>
          <p className="mt-2">
            Linked parents see grades, streaks, and weekly reports, never the student&apos;s chats.
            Our safety practices for live sessions are described on the{' '}
            <a href="/safety">safety page</a>.
          </p>
        </div>
      </div>

      <h2 id="rights" className="scroll-mt-24">Your rights</h2>
      <p>
        Wherever you live (including under the California Consumer Privacy Act), you can exercise
        these rights directly in the product, without emailing anyone:
      </p>
      <ul>
        <li><strong>Access and portability:</strong> in Settings, <strong>&quot;Download my data&quot;</strong> exports everything we store about you as one file.</li>
        <li><strong>Deletion:</strong> in Settings, <strong>&quot;Delete account &amp; data&quot;</strong> permanently removes your account, learning data, files, and uploaded documents. Payment records required for tax/accounting and safety-report records are retained as the law requires.</li>
        <li><strong>Correction:</strong> your profile and learning data are editable in the app; for anything else, contact us.</li>
        <li><strong>Opt-outs:</strong> non-essential email and analytics are one-tap switches in Settings under <strong>&quot;Privacy preferences&quot;</strong>. We have no &quot;sale&quot; or &quot;sharing&quot; of personal information to opt out of.</li>
        <li>We never discriminate for exercising privacy rights, and we don&apos;t use dark patterns to talk you out of them.</li>
      </ul>

      <h2 id="retention" className="scroll-mt-24">Where it lives and how long</h2>
      <p>
        Data is stored with Supabase (Postgres, US region) protected by row-level security,
        readable only by you, parents you approve, and Kaizen administrators. Files live in
        private storage buckets scoped to your account. Data is kept while your account is active
        and deleted when you delete your account; residual copies in encrypted backups roll off on
        the backup schedule.
      </p>
      <ul>
        <li><strong>Tutoring chat transcripts and voice-session records are automatically deleted after <span className="font-opmono">24 months</span></strong> of inactivity, even if you keep your account.</li>
        <li>If you redeem a free trial, we keep a one-way hashed (unreadable) record of that redemption after account deletion, solely to prevent repeat-trial abuse. It contains no readable personal information.</li>
        <li>Safety reports and our internal audit trail are retained after account deletion, as child-safety practice and law require.</li>
      </ul>

      <h2 id="providers" className="scroll-mt-24">Service providers</h2>
      <p>
        We share data only with the processors that run the product: Supabase (database/storage),
        Anthropic (AI tutoring), OpenAI (voice), Stripe (payments), Daily (video sessions), Resend
        (email), Vercel (hosting), and, if enabled, Sentry (error monitoring), Google (image
        generation) and PostHog (analytics). Each receives only what its function requires.
      </p>
      <p>
        Sentry receives crash reports only: the error message and stack, the URL of the page or API
        route it happened on, and your plan. Never your schoolwork, chats, or uploaded files.
      </p>

      <h2 id="security" className="scroll-mt-24">Security and breaches</h2>
      <p>
        Transport encryption everywhere, row-level security on every table, service keys isolated
        server-side, and audit logging on sensitive actions. If a breach affects your personal
        information, we will notify you and regulators as required by law.
      </p>

      <h2 id="contact" className="scroll-mt-24">Contact</h2>
      <p>
        Privacy questions or requests we haven&apos;t automated:{' '}
        <a href="/contact">contact page</a>{' '}
        or hello@kaizenedu.net. If we materially change this policy we&apos;ll notify account
        holders by email.
      </p>
    </LegalShell>
  );
}
