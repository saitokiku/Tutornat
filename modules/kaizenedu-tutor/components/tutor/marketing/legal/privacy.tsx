import { PRODUCT, publicConfig } from '@/kaizen.config';
import { PRODUCT_ROUTES } from '@/lib/tutor/contracts';
import { LEGAL_VERSIONS } from '@/lib/tutor/client/legal';

import { LegalPage } from './legal-page';

const NAME = PRODUCT.workingName;
const AI_LABEL = publicConfig.product.aiLabel;

/**
 * Recipients, as the code actually calls them. The drafting notes and the
 * requirements each vendor's terms must meet are in
 * `compliance/vendor-data-flow.md`; none of them has been verified yet, which
 * is why this page says so rather than implying a completed review.
 */
const VENDORS: ReadonlyArray<{ role: string; who: string; what: string }> = [
  {
    role: 'Language models',
    who: 'Google (Gemini), Anthropic (Claude), and OpenAI, per the stage routing the operator configures',
    what: 'The text of the session turn, the learner’s skill context, and — for reading an uploaded problem — the uploaded image or PDF itself. Used to produce the tutor’s reply, grade a check, and write the session summary.',
  },
  {
    role: 'Speech to text',
    who: 'OpenAI (Whisper) by default; another configured provider if the operator routes it there',
    what: 'The learner’s voice clip for one turn, to transcribe it. The clip is discarded after transcription.',
  },
  {
    role: 'Text to speech',
    who: 'OpenAI by default; another configured provider if the operator routes it there',
    what: 'The tutor’s sentence text, to produce the audio the learner hears. Never the learner’s words.',
  },
  {
    role: 'Hosting',
    who: 'Vercel',
    what: 'Runs the application and handles every request.',
  },
  {
    role: 'Database',
    who: 'Neon (Postgres)',
    what: 'Stores accounts, profiles, transcripts, coursework text, checks, progress, consent records, and usage.',
  },
  {
    role: 'Product analytics',
    who: 'PostHog, a first-party project',
    what: 'Event names with ids, counts, timings, age band, skill id, and misconception tag. No names, transcripts, audio, images, or session recordings.',
  },
  {
    role: 'Error reports',
    who: 'Sentry',
    what: 'A scrubbed message and stack with ids as tags. No request bodies, no breadcrumbs, no session replay.',
  },
  {
    role: 'Payments',
    who: 'Stripe',
    what: 'Card details and billing address, entered on Stripe’s pages; we receive a customer id and the subscription status.',
  },
];

export function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy policy"
      version={LEGAL_VERSIONS.privacy}
      summary={`What ${NAME} collects, from whom, why, who receives it, how long it is kept, and how to review, export, delete, or revoke.`}
      current={PRODUCT_ROUTES.legalPrivacy}
    >
      <h2>1. Who we are and what this covers</h2>
      <p>
        {NAME} is operated by the company named on the pricing page. The operator’s registered name,
        address, and telephone number are not yet published here; they will be, before any profile
        for a learner under 13 is allowed to collect anything.
      </p>
      <p>
        This policy covers the website, the tutor sessions, the learner and parent dashboards, and
        any email we send. It is written for parents first, because a learner under 18 uses the
        service only through a profile that an adult account holder created and controls.
      </p>

      <h2>2. What we collect</h2>
      <h3>From the account holder (a parent, or an adult learning for themselves)</h3>
      <ul>
        <li>
          Email address, display name, and a password hash. Passwords are never stored in clear
          text.
        </li>
        <li>
          A sign-in session token hash and its expiry, so you stay signed in and can sign out
          everywhere.
        </li>
        <li>
          Birth year for an adult who signs up for themselves — a neutral age screen. The year is
          not shown to anyone else.
        </li>
        <li>
          Subscription status, plan, period, minute counters, and a Stripe customer id. Card details
          go to Stripe directly and we never see your full card number.
        </li>
        <li>
          Consent records: which notice and policy version you agreed to, when, by which method,
          whether the camera was included, and when you revoked.
        </li>
        <li>Deletion requests: ids and timestamps, so we can show a right was exercised.</li>
        <li>
          Your settings: camera sensing on or off, which attention-recovery steps you switched off,
          and your email preference.
        </li>
      </ul>
      <h3>From and about a learner profile</h3>
      <ul>
        <li>
          Display name, birth year, and the age band derived from it. For a teen, a login name and
          password hash.
        </li>
        <li>
          Every turn of a session as text: what the learner says or types, what the tutor says, what
          is drawn on the whiteboard, check questions and answers, and the session summary.
        </li>
        <li>
          Problems the learner uploads. We keep the <em>text</em> we read out of a photo or PDF, on
          the coursework item. <strong>We do not keep the image or the PDF</strong> — the file is
          held in memory only for as long as it takes to read it. The file itself is sent to the
          model provider that reads it, as listed in section 6.
        </li>
        <li>
          A per-skill progress estimate, open and resolved misconception tags, a short profile of
          which explanations worked, and an append-only record of the evidence behind each progress
          claim.
        </li>
        <li>
          Session timing, minutes used, and the estimated cost of each turn, for metering and the
          plan cap.
        </li>
        <li>
          Reports made with the report button, including any note you or the learner typed, and the
          record that a person reviewed it.
        </li>
        <li>
          Per-session attention aggregates — an attention percentage and counts of drifts, aways,
          and recoveries — from signals such as whether the tab is in front and whether anyone has
          answered. See section 4 on the camera.
        </li>
      </ul>
      <p>
        <strong>What we never collect anywhere:</strong> no audio file, no camera image, no face
        landmark, no facial embedding or template, no voiceprint or other biometric identifier, no
        precise location, no contact list, and no advertising identifier. No table in our database
        has a column for any of them.
      </p>

      <h2>3. Voice</h2>
      <p>
        The microphone is used only to answer what the learner is asking. The recording streams to
        our transcription provider, is turned into text, and is discarded. We do not store audio
        files, we do not use voice for identification, and we do not create voice prints or any
        other biometric identifier. Only the transcript is kept.
      </p>
      <p>
        That is verified in our own systems: the clip is held in memory for one request, the only
        thing written is a count of seconds for metering, and neither the audio nor the transcript
        reaches a log line. What our transcription provider does with the clip after it arrives is
        governed by our contract with them, and that review is still in progress — see section 6.
      </p>

      <h2>4. Camera</h2>
      <p>
        <strong>The camera is not used. There is no camera feature in {NAME} today.</strong> Nothing
        in the product opens a camera, and the internal switch that would allow it is off.
      </p>
      <p>
        If on-device attention sensing is ever built, we will describe it here before it is offered
        to anyone, and these conditions are fixed in advance. It would run entirely inside the
        browser: a face-landmark model would estimate whether the learner is looking at the lesson,
        and{' '}
        <strong>
          no image, landmark, embedding, or template would ever be transmitted or stored
        </strong>
        — not to our servers, not to a database, not to logs, analytics, or error reports. The only
        thing leaving the device would be a coarse state (attending, drifting, away, no face), and
        the only thing kept would be the per-session aggregate. A visible indicator would run
        whenever the camera was active. It would be named separately in the consent flow and never
        bundled with consent to use the service, a parent could switch it off at any time, and the
        tutor would still work without it. It would be off for ages 13 and over and for adults, and
        it would ship only after a children’s-privacy lawyer had reviewed it.
      </p>

      <h2>5. Why we use the data</h2>
      <ul>
        <li>To run the session: reply, draw, grade, summarise, and pick the next skill.</li>
        <li>
          To remember across sessions what a learner struggled with, so the tutor does not start
          from zero.
        </li>
        <li>To show the account holder transcripts and the progress report.</li>
        <li>To meter minutes, enforce the plan and the cost ceilings, and bill.</li>
        <li>
          To keep learners safe: safety rules in the tutor, the report button, and human review of
          flagged sessions.
        </li>
        <li>
          To operate the service: persistent identifiers are used internally for security, metering,
          and error reports, and for nothing else.
        </li>
      </ul>
      <p>
        We do not use any learner data to train models. We do not show ads, we do not use ad
        networks or ad software, and we do not track anyone across other sites. Analytics are
        first-party events with ids and counts, never content, and a learner under 18 is never given
        a tracking cookie or browser storage for analytics.
      </p>

      <h2>6. Who receives data</h2>
      <p>
        These providers process data for us. Our terms with each of them must permit minors’ data,
        prohibit training on our inputs, limit use to our purposes, and include data-processing
        terms. <strong>That review is not finished.</strong> It will be completed, and any provider
        that fails will be replaced, before any profile for a learner under 13 is allowed to collect
        anything.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Provider</th>
            <th scope="col">What it receives</th>
          </tr>
        </thead>
        <tbody>
          {VENDORS.map((vendor) => (
            <tr key={vendor.role}>
              <td>{vendor.role}</td>
              <td>{vendor.who}</td>
              <td>{vendor.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        We do not disclose learner data to any other third party. If that ever changed, it would
        require its own separate opt-in consent, never bundled with the consent to use the service.
      </p>

      <h2>7. How long we keep it</h2>
      <p>
        Audio is never retained. Uploaded images and PDFs are never retained. Transcripts, checks,
        summaries, coursework text, and progress data are kept while the profile exists.
      </p>
      <p>
        A written retention policy setting a maximum period after a profile’s last activity is in
        draft and is <strong>not yet in force</strong>; it will be published here, and running in
        the product, before any profile for a learner under 13 is allowed to collect anything. Until
        then, data is removed when you ask for it to be removed.
      </p>
      <p>
        When you request a deletion, the profile is frozen immediately so nothing further is
        collected, and the data is erased after 30 days. The dashboard shows the date. Records of
        the deletion itself — ids and timestamps — are kept, as are billing amounts with the
        learner, session, and turn identifiers removed.
      </p>

      <h2>8. Your rights as a parent or account holder</h2>
      <ul>
        <li>Review: read every transcript and the progress data from the parent dashboard.</li>
        <li>Export: download a learner’s data as a file, from the data page.</li>
        <li>
          Delete: delete a learner profile or the whole account, from the data page. The profile
          freezes at once.
        </li>
        <li>
          Refuse further collection: revoke consent from settings, which freezes the profile
          immediately. Revoking does not itself delete what already exists — use Delete for that.
        </li>
        <li>
          A support path: write to the contact address published on the pricing page, and a person
          will answer.
        </li>
      </ul>
      <p>
        We are still extending the export so that it covers every category in section 2; today it
        covers the profile, sessions, transcripts, progress, misconceptions, evidence, and consent
        records. Ask us and we will supply anything it does not yet include.
      </p>

      <h2>9. Children under 13</h2>
      <p>
        A profile for a child under 13 — which includes the 9-to-12 band — can be created now, and
        stays locked until the parental-consent flow is live and a children’s-privacy lawyer has
        signed off. A locked profile cannot start a session, and collects nothing beyond the name
        and birth year you entered.
      </p>
      <p>
        When it opens: you receive a direct notice before anything is collected from your child; you
        give consent by an affirmative act tied to that notice’s version, followed by a verification
        step that satisfies the law’s requirements for verifiable parental consent; the microphone
        and the camera are named separately and neither is bundled; we collect only what the
        tutoring needs, and never condition your child’s use of the service on more; you can review,
        export, delete, and revoke at any time; and revoking freezes the profile.
      </p>

      <h2>10. Security</h2>
      <p>
        Data is encrypted in transit and at rest. Access is limited to what each person or system
        needs. Provider keys exist only on the server and never reach a browser. Every database
        query filters on the account that owns the row. Error reports are scrubbed of content before
        they are sent. A written security program covering key rotation, incident response, and
        vendor breach terms is in draft and will be in place before the under-13 gate opens. We will
        notify affected account holders of a breach as the law requires.
      </p>

      <h2>11. Where the data is</h2>
      <p>
        The service is hosted in the United States. If you use it from elsewhere, your data is
        transferred to and processed there.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        Changes are posted here with a new version number. A consent record always names the version
        it was given for; a material change that affects a child’s data asks the parent again.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions, requests, and complaints about privacy: write to the contact address published on
        the pricing page. The label {AI_LABEL} inside a session is also a reminder that you are
        talking to software, and that this policy applies to what you say to it.
      </p>
    </LegalPage>
  );
}
