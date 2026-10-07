import LegalShell, { Contents } from '@/components/LegalShell';
import Card from '@/components/ui/Card';
import { CLUB_PLANS, RETAIL, AI_PLANS, KIND_DEFAULTS, SEAT_PLAN, formatPrice as dollars } from '@/lib/server/clubPricing';
import { REFUND_WINDOW_HOURS, GROUP_REFUND_WINDOW_HOURS } from '@/lib/server/sessionStates';
import { CONFIRM_LEAD_MS, RELEASE_LEAD_MS } from '@/lib/server/occupancy';

export const metadata = { title: 'Terms of Service - Kaizen' };

// EVERY number on this page is interpolated from lib/server/clubPricing.js /
// sessionStates.js / occupancy.js — never typed here. This is the legally
// binding surface; test/priceTruth.test.mjs fails the build if a dollar
// literal sneaks back in.
// (Hard rule 2 applied to the one page where drift is a misrepresentation.)
//
// Structure: the two long sections (live sessions, and money) used to be one
// eight-item bullet list each, which is how a refund window ends up with the
// same visual weight as a note about reviews. They are broken into named
// sub-sections, and the commercial terms of each session type are lifted out of
// the parentheticals into a mono record line above the prose that explains
// them. The tier economics — price, allowance, and every member rate past it —
// are a table, because "by tier" prose forces the reader to align three lists
// in their head and get the order right. Six columns do not fit a phone,
// though, and a table that scrolls sideways with no visible edge simply hid two
// of the six rates: below md the same figures are restacked one block per tier,
// so every rate this section exists to define is legible at every width.

const TIERS = Object.values(CLUB_PLANS); // club → plus → max, the display order
const memberHourLow = dollars(Math.min(...TIERS.map((p) => p.private60Cents)));
const memberHourHigh = dollars(Math.max(...TIERS.map((p) => p.private60Cents)));
// Confirm-or-release windows, from the same module the cron sweep enforces
// them with — a forfeiture rule a machine applies has to be disclosed in the
// numbers the machine actually uses (occupancy.js).
const confirmLeadHours = Math.round(CONFIRM_LEAD_MS / 3600000);
const releaseLeadHours = Math.round(RELEASE_LEAD_MS / 3600000);

const SUBHEAD = 'font-brand font-semibold text-t3 text-ink';
// The commercial facts of a session type, stated as a record line rather than
// buried in a parenthesis: mono, because these are prices, counts and minutes.
const RECORD = 'mt-1.5 font-opmono text-sm tabular-nums text-muted';
const CELL = 'py-3 pr-5 last:pr-0';

const CONTENTS = [
  ['#service', 'The service'],
  ['#accounts', 'Accounts and age'],
  ['#use', 'Acceptable use'],
  ['#sessions', 'Live sessions and tutors'],
  ['#billing', 'Memberships, billing and refunds'],
  ['#content', 'Your content'],
  ['#liability', 'Disclaimers and liability'],
  ['#disputes', 'Disputes'],
  ['#changes', 'Changes and contact'],
];

// The tier economics, defined once and rendered two ways: as a comparison
// table where six columns fit, and as one block per tier where they do not.
// Both readings come from this list, so a phone can never be shown a subset.
const TIER_FIELDS = [
  ['Per month', (p) => dollars(p.priceCents)],
  ['Included Hall visits', (p) => String(p.includedHallMonthly)],
  ['Extra Hall', (p) => dollars(p.memberHallCents)],
  ['Subject Clinic', (p) => dollars(p.memberClinicCents)],
  ['Private hour', (p) => dollars(p.private60Cents)],
];
const TIER_NOTE =
  'Membership price, the Homework Hall visits it includes each month, and the member rate for everything past that allowance.';

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="August 2026">
      <p className="text-t3 text-ink">
        These terms govern your use of Kaizen, operated by Kaizen Academy LLC (&quot;Kaizen&quot;,
        &quot;we&quot;). By creating an account or booking a session you agree to them.
      </p>
      <p>
        If you are under 18, your parent or guardian agrees to these terms on your behalf by
        permitting your use.
      </p>

      <Contents items={CONTENTS} />

      <h2 id="service" className="scroll-mt-24">The service</h2>
      <p>
        Kaizen is an after-school academic club for students ages 13+: live online <strong>Homework
        Hall</strong> study sessions, small-group <strong>Subject Clinics</strong>, private 1:1 video
        tutoring, a free weekly Community Hall, and an AI study companion with study planning,
        mastery and grade tracking.
      </p>
      <p>
        AI output can be wrong: verify important answers, especially before exams. Kaizen
        supplements your school&apos;s instruction; it does not replace it, and it is not therapy,
        medical, or crisis care. If you are in crisis, call or text{' '}
        <span className="font-opmono">988</span> (US).
      </p>

      <h2 id="accounts" className="scroll-mt-24">Accounts and age</h2>
      <ul>
        <li>Kaizen is for users <strong>13 and older</strong>. Children under 13 may not register, and we delete under-13 accounts we discover.</li>
        <li>Users 13&ndash;17 must provide a parent/guardian email at signup. <strong>Live video tutoring requires that parent/guardian&apos;s approval</strong>, recorded via the emailed consent link. A guardian may withdraw approval at any time.</li>
        <li>You&apos;re responsible for keeping your credentials secure and for the accuracy of what you tell us (including your birth year).</li>
      </ul>

      <h2 id="use" className="scroll-mt-24">Acceptable use</h2>
      <ul>
        <li>No harassment, hate, sexual content, or attempts to obtain such content. This is a platform used by minors and we enforce this strictly.</li>
        <li>No attempting to move students or tutors off-platform, and no soliciting personal contact information from a minor.</li>
        <li>No scraping, probing, reselling, or attempting to extract system prompts or other users&apos; data.</li>
        <li>No using the tutor to produce work you submit as your own in violation of your school&apos;s rules. See our <a href="/academic-integrity">Academic Integrity policy</a>. We may decline requests that are clearly cheating.</li>
        <li>We may suspend or terminate accounts that violate these rules, and we report child-safety violations to the authorities as required by law.</li>
      </ul>

      <h2 id="sessions" className="scroll-mt-24">Live sessions and tutors</h2>
      <div className="space-y-9">
        <div>
          <h3 className={SUBHEAD}>Who the tutors are</h3>
          <p className="mt-2">
            Tutors are <strong>independent contractors</strong>, not employees of Kaizen. Every
            tutor is reviewed and approved by Kaizen staff before becoming bookable. Kaizen sets
            the session prices families see and pays tutors an agreed hourly rate.{' '}
            <strong>We do not currently run third-party criminal background checks</strong>; we
            will state clearly on this page when that changes. Guardians should exercise their own
            judgement and supervise live sessions involving minors.
          </p>
        </div>

        <div>
          <h3 className={SUBHEAD}>Homework Hall</h3>
          <p className={RECORD}>
            {dollars(RETAIL.hallSeatCents)} &middot; about 60 minutes &middot; up to{' '}
            {KIND_DEFAULTS.homework_hall.capacity} students per tutor
          </p>
          <p className="mt-3">
            Homework Hall is <em>shared academic support</em>, not private tutoring performed for
            several people at once: students work independently on their own assignments and the
            tutor rotates through the room clearing blockers. We do not promise a specific number
            of one-on-one minutes per student; students who need extended individual instruction
            are referred to a Subject Clinic or a private session. One <strong>free Community
            Hall</strong> runs every week and is open to any eligible student, member or not.
          </p>
        </div>

        <div>
          <h3 className={SUBHEAD}>Subject Clinics</h3>
          <p className={RECORD}>
            {dollars(RETAIL.clinicSeatCents)} retail &middot; up to {KIND_DEFAULTS.clinic.capacity}{' '}
            students &middot; 45&ndash;60 minutes
          </p>
          <p className="mt-3">
            A clinic teaches one focused topic. It runs only once at least{' '}
            <strong>{KIND_DEFAULTS.clinic.minSeats} seats</strong> are filled; if it does not reach
            that minimum by roughly 2 hours before the start, it is cancelled automatically and
            everyone is made whole (payment refunded, or the included visit returned).
          </p>
        </div>

        <div>
          <h3 className={SUBHEAD}>Private tutoring</h3>
          <p className={RECORD}>
            {dollars(RETAIL.private30Cents)} per 30 minutes &middot;{' '}
            {dollars(RETAIL.private60Cents)} per hour, retail &middot; members{' '}
            {memberHourLow}&ndash;{memberHourHigh} per hour
          </p>
          <p className="mt-3">
            Retail is the same price with every tutor. Members pay their tier&apos;s rates instead.
            A student&apos;s first private session is free, applied automatically.
          </p>
        </div>

        <div>
          <h3 className={SUBHEAD}>Supervision, recording and reviews</h3>
          <p className="mt-2">
            Because a group session places minors together with an adult on live video, the
            supervision guidance on the <a href="/safety">safety page</a> applies. Sessions are
            live video and are <strong>not recorded</strong>. Either participant can report a
            concern from inside the session; reports alert our safety team immediately.
          </p>
          <p className="mt-3">
            Reviews may only be written by the student of a completed session.
          </p>
        </div>
      </div>

      <h2 id="billing" className="scroll-mt-24">Memberships, billing and refunds</h2>
      <div className="space-y-9">
        <div>
          <h3 className={SUBHEAD}>The standing seat</h3>
          <p>
            A standing seat is a reserved, recurring place in an in-person tutoring room:{' '}
            {SEAT_PLAN.seat.sessionsPerWeek} sessions a week of {SEAT_PLAN.seat.minutes} minutes each, at
            most {SEAT_PLAN.seat.ratio} students to one tutor, counted as{' '}
            {SEAT_PLAN.seat.includedSeatMonthly} sessions per calendar month. Seat sessions do not
            roll over. Seat rooms are not sold as drop-ins. A seat holder pays member rates on
            Homework Hall, Subject Clinics and private sessions, listed in the table below
            under the Plus column.
          </p>
          <p className={RECORD}>
            {dollars(SEAT_PLAN.seat.priceCents)} per month &middot; {SEAT_PLAN.seat.sessionsPerWeek} &times;{' '}
            {SEAT_PLAN.seat.minutes} min a week &middot; 1:{SEAT_PLAN.seat.ratio} &middot; in person
          </p>
          <p>
            The seat is priced the same for every family regardless of how it is paid for.
            Billing, renewal, cancellation and refund terms for the seat follow the membership
            terms below until seat-specific terms are published here.
          </p>

          <h3 className={SUBHEAD}>Memberships</h3>
          <p className="mt-2">
            Memberships are month-to-month with <strong>no free trial, no contract, and no
            cancellation penalty</strong>. Cancel any time from the <a href="/billing">billing
            page</a>; cancelling takes effect at the end of the paid period, and you&apos;re always
            welcome back. À-la-carte purchasing stays available to everyone, member or not.
          </p>
          <p className="mt-5 text-sm text-muted">{TIER_NOTE}</p>

          {/* Narrow: one block per tier, every figure on its own labelled row. */}
          <div className="mt-4 space-y-3 md:hidden">
            {TIERS.map((p) => (
              <Card key={p.label} variant="inset" pad="sm">
                <p className="font-brand font-semibold text-t3 text-ink">{p.label}</p>
                <dl className="mt-2 divide-y divide-border">
                  {TIER_FIELDS.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-4 py-2 last:pb-0">
                      <dt className="text-sm text-muted">{label}</dt>
                      <dd className="font-opmono text-sm tabular-nums text-ink">{value(p)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>

          {/* Wide: the same figures as a comparison across tiers. */}
          <table className="mt-4 hidden w-full text-left text-sm md:table">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={`${CELL} font-opmono text-micro font-medium uppercase text-muted`}>
                  Tier
                </th>
                {TIER_FIELDS.map(([label]) => (
                  <th key={label} scope="col" className={`${CELL} font-opmono text-micro font-medium uppercase text-muted`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIERS.map((p) => (
                <tr key={p.label} className="border-b border-border">
                  <th scope="row" className={`${CELL} font-semibold text-ink`}>{p.label}</th>
                  {TIER_FIELDS.map(([label, value]) => (
                    <td key={label} className={`${CELL} font-opmono tabular-nums text-ink`}>{value(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className={SUBHEAD}>Included visits</h3>
          <p className="mt-2">
            Included visits reset on the 1st of each calendar month and do not carry over, bank, or
            convert to any stored value. If your student misses a week, contact us: we may, at our
            discretion, credit a grace visit as a courtesy. A courtesy credit is not a purchased
            balance and has no cash value. Beyond your included visits, extra Homework Halls,
            Subject Clinics and private hours are charged at your tier&apos;s member rates in the
            table above. Membership prices renew at the price shown until cancelled; we&apos;ll
            notify you before any price increase.
          </p>
        </div>

        <div>
          <h3 className={SUBHEAD}>Confirm-or-release on included visits</h3>
          <p className="mt-2">
            A seat booked with an included visit is held for you only if you confirm it. About{' '}
            <span className="font-opmono">{confirmLeadHours} hours</span> before the session we
            email a reminder with a one-tap confirm link (booking inside that window counts as
            confirming). If a reminded seat is still unconfirmed about{' '}
            <span className="font-opmono">{releaseLeadHours} hours</span> before the start, we
            release it to the next student on the waitlist and <strong>put the included visit back
            on your membership</strong> for the rest of that calendar month. An empty chair should
            never cost you a visit, and it should not cost another family a seat either. Seats you
            paid for and free Community Hall seats are never released this way.
          </p>
        </div>

        <div>
          <h3 className={SUBHEAD}>AI plans</h3>
          <p className={RECORD}>
            {AI_PLANS.ai_solo.label} {dollars(AI_PLANS.ai_solo.priceCents)}/mo &middot;{' '}
            {AI_PLANS.ai_hall.label} {dollars(AI_PLANS.ai_hall.priceCents)}/mo, including{' '}
            {AI_PLANS.ai_hall.includedHallMonthly} Homework Hall visit each month
          </p>
          <p className="mt-3">
            AI plans are month-to-month on the same no-trial, cancel-any-time terms. They are not
            club memberships: they carry no member discounts, and any sessions beyond an included
            visit are charged at retail.
          </p>
        </div>

        <div>
          <h3 className={SUBHEAD}>Cancellations and refunds</h3>
          <p className="mt-2">
            Pay-per-session purchases are charged when you reserve.
          </p>
          <ul className="mt-3">
            <li>
              <strong>Private sessions:</strong> cancel{' '}
              <strong><span className="font-opmono">{REFUND_WINDOW_HOURS} hours</span> or more</strong>{' '}
              before the start for a full automatic refund; within{' '}
              <span className="font-opmono">{REFUND_WINDOW_HOURS} hours</span> and no-shows are not
              refunded. If the <em>tutor</em> cancels you are always refunded in full.
            </li>
            <li>
              <strong>Group seats (Hall or Clinic):</strong> cancel{' '}
              <strong><span className="font-opmono">{GROUP_REFUND_WINDOW_HOURS} hours</span> or more</strong>{' '}
              before the start for a full refund. The shorter window exists because a late drop can
              push a clinic below its minimum and cancel it for everyone else.
            </li>
            <li>A seat covered by an included visit follows the same windows, returning the visit instead of money.</li>
            <li>If Kaizen cancels a session for any reason (under-filled clinic, tutor unavailable, safety review), every seat is automatically made whole regardless of notice.</li>
            <li>Did something go wrong in a session (tech failure, tutor no-show)? Contact us within 7 days and we&apos;ll make it right.</li>
          </ul>
        </div>

        <div>
          <h3 className={SUBHEAD}>Legacy plans</h3>
          <p className="mt-2">
            AI Student and Study Circle are no longer sold. Existing subscribers keep their
            recorded terms until they cancel or switch.
          </p>
        </div>
      </div>

      <h2 id="content" className="scroll-mt-24">Your content</h2>
      <p>
        You own what you upload. You grant Kaizen a license to process it solely to provide the
        service (for example, sending a syllabus to our AI provider to organize it). We claim no
        rights to your schoolwork and never use your content to advertise.
      </p>

      <h2 id="liability" className="scroll-mt-24">Disclaimers and liability</h2>
      <p>
        The service is provided &quot;as is.&quot; To the maximum extent permitted by law, Kaizen
        Academy LLC&apos;s total liability for any claim is limited to the amount you paid us in
        the 12 months before the claim, and we are not liable for indirect or consequential
        damages. Nothing in these terms limits liability that cannot be limited by law, including
        for gross negligence or willful misconduct.
      </p>

      <h2 id="disputes" className="scroll-mt-24">Disputes</h2>
      <p>
        These terms are governed by the laws of the U.S. state in which Kaizen Academy LLC is
        organized. Before filing any claim, contact us: most issues resolve in one email. Either
        party may bring qualifying claims in small claims court.
      </p>

      <h2 id="changes" className="scroll-mt-24">Changes and contact</h2>
      <p>
        If we materially change these terms we&apos;ll notify account holders by email before the
        change takes effect. Questions: <a href="/contact">contact page</a>.
      </p>
    </LegalShell>
  );
}
