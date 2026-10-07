# Privacy policy — DRAFT, PENDING COUNSEL REVIEW

> **This is an unreviewed draft.** It has not been read by a lawyer and is not in force. Version
> `2026-09-05-draft`. Bracketed items in `[[ ]]` are facts the operator must supply; they are not
> placeholders to be guessed. Every **Mismatch** callout marks a place where this text and the code
> currently disagree — those are for counsel and the build seat, not for publication.

Published counterpart: `/legal/privacy` (`components/tutor/marketing/legal/privacy.tsx`).

---

## 1. Who we are and what this covers

Natural Tutor is operated by `[[legal entity name]]`, `[[registered address]]`,
`[[telephone number]]`, `[[privacy contact email]]`.

> **Mismatch (blocking).** The operator's legal identity, postal address and telephone number appear
> nowhere in the repository. The live page says only "operated by the company named on the pricing
> page" and directs contact to "the contact address published on the pricing page"; the code exposes
> a single `SUPPORT_EMAIL` env var used on the welcome page (`app/(learner)/welcome/page.tsx:24`).
> The COPPA online notice is believed to require the operator's name, address, telephone number and
> email address (§312.4(d)(1), unverified). This cannot be published for an under-13 audience until
> those four facts exist. See `open-questions.md` Q1.

This policy covers the website, tutor sessions, the learner and parent dashboards, and any email we
send. It is written for parents first: a learner under 18 uses the service only through a profile
that an adult account holder created and controls.

## 2. What we collect

The lists below are the actual columns the product writes. The authority is
`lib/tutor/db/schema.ts`; where a category is derived rather than supplied, that is said.

### 2.1 From the account holder (a parent, or an adult learning for themselves)

| Data | Where it lives | Why |
| --- | --- | --- |
| Email address | `accounts.email` | Sign-in identifier; account and billing correspondence |
| Display name | `accounts.display_name` | To address you in the dashboard |
| Password hash | `accounts.password_hash` | Sign-in. Never stored in clear text |
| Sign-in session token hash and expiry | `account_sessions` | To keep you signed in; to sign you out everywhere |
| Birth year (adult self-signup only) | `learners.birth_year` | The neutral age screen. Determines the age band |
| Stripe customer id, subscription id, plan, status, period, minute counters | `subscriptions` | Billing and the pooled-minutes cap |
| Consent records: method, notice version, policy version, camera flag, grant time, revoke time, evidence reference | `consents` | To show what you agreed to, when, and for which version |
| Deletion requests: ids and timestamps | `deletion_requests` | To show a right was exercised and when it completed |
| Parent settings: camera sensing on/off, which recovery-ladder steps are switched off, weekly-email preference | `parent_settings.settings` | Your controls |

### 2.2 From and about a learner profile

| Data | Where it lives | Why |
| --- | --- | --- |
| Display name, birth year, derived age band, profile status and kind | `learners` | To identify the profile and apply the right age rules |
| Teen login name and password hash | `learners.login_name`, `learners.login_hash` | So a 13–17 learner can sign in under the parent's account |
| Every turn of a session as **text** — what the learner said or typed and what the tutor replied — with turn timing, latency, the model used and the cost | `turns` | To run the session, to let the account holder read the transcript, and to meter cost |
| Session record: start, end, minutes, mode (voice or text), phase, target skill, thumbs rating, cost | `sessions` | Session history and the parent report |
| Session summary and session state | `sessions.summary`, `sessions.state` | The WRAP recap and resuming a session |
| Homework the learner uploads: the **text extracted** from a photo or PDF, the title, source and status; and an error reason if reading failed | `coursework` | So the tutor can work on the actual problem |
| Per-skill progress estimate, item and session counts, status, first and last seen | `skill_mastery` | The progress view and choosing the next skill |
| Misconception tags, open or resolved, with a clean-streak counter | `misconceptions` | So the tutor stops re-teaching what is fixed |
| A compact learner profile: subjects, recurring misconceptions, pace, explanation styles that worked | `learner_profiles.profile` | So the tutor does not start from zero each session |
| Learning-evidence events: type, an "assisted" flag, a payload, timestamp | `evidence_events` | The append-only record behind every progress claim |
| Per-turn usage lines: provider, model, quantity, unit, cents | `usage_ledger` | Metering, cost ceilings, billing |
| Safety and quality flags: kind, an optional free-text note (up to 500 characters), timestamps | `flags` | The report button; safety review |
| Per-session attention aggregates: camera-enabled flag, attention percentage, drift count, away count, recovery count | `attention_stats` | To adapt the lesson and report to you |
| Recovery events: which rung of the ladder fired, what triggered it, whether it worked | `recovery_events` | To learn which explanations lose learners |

**What is not collected anywhere:** no audio file, no camera frame, no face landmark, no facial
embedding or template, no voiceprint or other biometric identifier, no precise location, no contact
list, no device advertising identifier. No table in `lib/tutor/db/schema.ts` has a column for any of
them, and `TUTOR_TABLES` in that file is the list the invariant suite checks.

> **Mismatch (non-blocking, fix the text).** The live page hedges on uploaded images: "the operator's
> upload path decides whether the original image is kept, and this page will state that before the
> under-13 gate opens." The code has already decided.
> `app/(learner)/api/tutor/problem-extract/route.ts` reads the file into memory, hands the bytes to
> the vision stage, and stores only the extracted text on the `coursework` row. Nothing writes the
> image. The sentence should say that — and should say the image bytes are sent to the model
> provider, which the current text does not.

## 3. Voice

The microphone is used only to answer what the learner is asking. A recorded utterance is streamed
to our transcription provider, turned into text, and discarded. We do not keep audio files, we do
not use voice to identify anyone, and we do not create voiceprints or any other biometric
identifier. Only the transcript is kept, on the `turns` row.

**What we verified in our own code.** `app/(learner)/api/tutor/asr/route.ts` receives the clip as a
multipart blob, holds it in memory, passes it to the provider and lets it go. The only thing it
writes is a `usage_ledger` row counting seconds. Its log line carries the session id, a byte count
and a duration — never the audio and never the transcript. No table has an audio column. The browser
side (`lib/tutor/voice/recorder.ts`, `lib/tutor/voice/asr-client.ts`) keeps the clip as an in-memory
`Blob` handed straight to `fetch`.

> **Mismatch (blocking for under-13).** "Deleted immediately" has to be true at the transcription
> provider too, and that is a contract question we have not answered. Nothing in the repository
> evidences the provider's retention behaviour for audio. See `vendor-data-flow.md` and
> `open-questions.md` Q4.

> **Mismatch (blocking, security).** `app/api/transcription/route.ts` — the upstream OpenMAIC route,
> still mounted — accepts an `apiKey` and a `baseUrl` in the **form body** and performs no
> authentication at all. `middleware.ts` strips `x-api-key`/`x-base-url` **headers** but not form
> fields, and `isProductPath` does not cover `/api/transcription`, so the route stays reachable with
> `TUTOR_MODE=1`. A caller can therefore have audio forwarded to an endpoint of their choosing, or
> burn the server's ASR key. No policy text can be true while that route is reachable in production.
> See `open-questions.md` Q3.

## 4. Camera

**The camera is not used. There is no camera code in this product today.**

No file opens a camera: the only `getUserMedia` call in the product is
`lib/tutor/voice/recorder.ts`, and it requests audio only. `@mediapipe/tasks-vision` is not a
dependency. The `camera_sensing_enabled` switch in `app_settings` is seeded `false`, and
`lib/tutor/accounts/consents.ts` refuses to record a camera consent while it is shut.

If on-device attention sensing is ever built, it will be described here **before** it is offered to
anyone, and the conditions are fixed in advance:

- It runs entirely inside the browser. A face-landmark model estimates whether the learner is
  looking at the lesson. **No image, landmark, blendshape, embedding or template is transmitted or
  stored anywhere** — not to our servers, not to a database, not to object storage, logs, analytics
  or error reports.
- The only thing that leaves the device is a coarse state — attending, drifting, away, or no face —
  and the only thing kept is the per-session aggregate on `attention_stats`.
- A visible indicator runs whenever the camera is active, in words the learner and the parent both
  understand.
- The camera is named separately in the consent flow and is never bundled with consent to use the
  service. The parent can switch it off at any time and the tutor still works.
- It is off for ages 13 and over and for adults.
- It ships only after counsel has reviewed it against the amended COPPA Rule's biometric definition,
  Texas CUBI and Illinois BIPA — and again before it is ever default-on for younger children.

> **Mismatch (fix the text).** The live page describes camera sensing in the present tense ("it runs
> entirely inside the browser"). Nothing runs. A policy must not describe a feature that does not
> exist; the conditional form above replaces it.

## 5. Why we use each category, and on what basis

| Purpose | Data used | Basis (US) | Basis if GDPR/UK GDPR applies — **counsel to confirm** |
| --- | --- | --- | --- |
| Run the session: reply, draw, grade, summarise, pick the next skill | Turns, coursework, skill graph, student model | Performing the service you asked for | Contract, Art. 6(1)(b) |
| Remember across sessions what a learner struggled with | `skill_mastery`, `misconceptions`, `learner_profiles` | Performing the service | Contract |
| Show the account holder transcripts and the progress report | Turns, sessions, mastery | Performing the service | Contract |
| Meter minutes, enforce cost ceilings, bill | `usage_ledger`, `subscriptions` | Performing the service; our records | Contract; legal obligation for tax records |
| Keep learners safe: safety rules, the report button, human review of flagged sessions | `flags`, the flagged session's turns | Protecting the learner | Legitimate interests / vital interests |
| Operate and secure the service: persistent identifiers used internally for security, metering, and error reports | Ids, session tokens, error events | Internal operations | Legitimate interests |
| Understand product usage in aggregate | First-party analytics events (ids, counts, timings) | Internal operations | Legitimate interests, with the child-specific limits below |

> **Open question.** Which legal-basis column actually applies is unanswered because nobody has
> decided whether the service is offered in the EU or the UK, or which US state's law is the home
> jurisdiction. See `open-questions.md` Q2. The GDPR column above is written as a hypothesis, not a
> determination.

**We do not use any learner data to train models.** We do not show advertising, we use no ad network
or ad SDK, and we do not track anyone across other sites. `check-compliance-gate.mjs` scans product
code for known tracker hosts on every run.

## 6. Who receives data

Every recipient is listed by name in `vendor-data-flow.md`, which is the controlling document and
which records that **none of these relationships has been verified yet**. Summary:

| Role | Provider | What it receives |
| --- | --- | --- |
| Language models | Configured per stage by the operator (`MODEL_ROUTES` / `DEFAULT_MODEL`); the intended set is Google (Gemini), Anthropic (Claude) and OpenAI | The text of the conversation, the problem the learner brought including the uploaded image bytes for the reading stage, and a compact summary of the learner's skills and past misconceptions |
| Speech to text | Default `openai-whisper` (`app/(learner)/api/tutor/asr/route.ts`); overridable by `TUTOR_ASR_PROVIDER` | One utterance of the learner's voice, to transcribe it |
| Text to speech | Default `openai-tts` (`app/(learner)/api/tutor/tts/route.ts`); overridable by `TUTOR_TTS_PROVIDER` | The tutor's sentence text, to produce the audio the learner hears |
| Hosting | Vercel | Runs the application and handles every request |
| Database | Neon (Postgres) | Everything in section 2 |
| Product analytics | PostHog, first-party project | Event names with ids, counts, timings, band, skill id, misconception tag. No names, transcripts, audio or images; no session recording, autocapture, heatmaps or surveys |
| Error reports | Sentry | A scrubbed message and stack, ids as tags, the account id as the user id. No request bodies, no breadcrumbs, no replay |
| Payments | Stripe | Card details and billing address, entered on Stripe's own pages. We receive a customer id and subscription status |

> **Mismatch (blocking).** The live page names ElevenLabs and Azure for text-to-speech; the code
> defaults to `openai-tts` with the `alloy` voice. Naming every recipient is believed to be a COPPA
> online-notice requirement (§312.4(d), unverified), so the published list must match what the
> service actually calls.

> **Mismatch (blocking, architectural).** Model routing is entirely env-driven. `MODEL_ROUTES` can
> point any stage at any provider `lib/ai/llm` supports, without a code change and without a policy
> change. A notice that must name every recipient cannot be kept true by an environment variable.
> Counsel and the build seat need a mechanism — an allowlist checked at boot, or a published list
> generated from configuration. See `open-questions.md` Q5.

> **Mismatch (fix before publishing).** This policy and the live page refer to "the emails we send",
> and `parent_settings.weeklyEmail` defaults to `true`. There is no email provider anywhere in the
> repository — no Resend, SendGrid, Postmark or SMTP client. Either the setting is inert and the
> text must not promise email, or an unlisted sub-processor is about to be added. See
> `open-questions.md` Q11.

We do not disclose learner data to any other third party. If that ever changed it would require its
own separate opt-in consent, never bundled with consent to use the service.

## 7. How long we keep it

The controlling document is `retention-policy.md`, which also records where the code does not yet
implement what this section says. In summary: transcripts, checks, summaries and progress data are
kept while the profile is active and for a fixed window after its last activity, then deleted; audio
is never retained; uploaded images are never retained; a deletion you request is honoured on the
schedule stated in the retention policy.

> **Mismatch (blocking).** The live page states data is deleted 12 months after last activity. **No
> code implements inactivity-based deletion.** `runDeletionJob` in `lib/tutor/accounts/deletion.ts`
> only completes explicit deletion requests. `RETENTION_MONTHS_AFTER_LAST_ACTIVITY = 12` in
> `lib/tutor/client/legal.ts` is a display constant with no job behind it. Publishing a retention
> promise the system does not keep is worse than publishing none.

> **Mismatch (blocking).** `runDeletionJob` is exported from `lib/tutor/accounts/index.ts` and
> called by nothing — no route, no script, no cron. `vercel.json` declares no `crons`. Today, a
> deletion request freezes the profile and then nothing else ever happens.

## 8. Your rights as a parent or account holder

- **Review.** Read every transcript and the progress data from the parent dashboard.
- **Export.** Download a learner's data as a file, from the data page.
- **Delete.** Delete a learner profile or the whole account, from the data page. Filing the request
  freezes the profile immediately, so nothing further is collected.
- **Refuse further collection.** Revoke consent from settings. Revoking freezes the profile at once
  (`lib/tutor/accounts/consents.ts` `revokeConsent`).
- **A person to talk to.** `[[privacy contact email]]`, answered by a person.

> **Mismatch (blocking for the review right).** The export
> (`lib/tutor/accounts/export.ts` `exportLearnerData`) returns the learner row, sessions, turns,
> mastery, misconceptions, evidence events and consents. It **omits** `coursework` — including
> `coursework.text`, the content of the child's own homework; `learner_profiles.profile` — the
> derived description of the child; `attention_stats`; `recovery_events`; and `flags`, including a
> free-text `note` of up to 500 characters. The parental review right is believed to cover all
> personal information collected from the child (§312.6, unverified).

## 9. Children under 13

**Today, no under-13 profile can collect anything.** A parent may create a profile for a child, but
`lib/tutor/accounts/consents.ts` `resolveLearnerStatus` returns `locked` for any child profile while
`app_settings.under13_gate` is false, and a locked profile cannot start a session. Until the gate
opens, the only child data that exists is the display name and birth year the parent typed.

Note that "child" here means **under 13, which includes the 9–12 band** — `kindForBand` in
`lib/tutor/accounts/learners.ts` classifies both 4–8 and 9–12 as `child`.

When the gate opens, this is how it will work:

1. You receive a **direct notice** (`parent-direct-notice.md`) before anything is collected from
   your child.
2. You give consent by an affirmative act tied to that notice's version, followed by a verification
   step that satisfies the Rule's requirements for verifiable parental consent.
3. The microphone is named separately from the camera, and neither is bundled with consent to use
   the service.
4. We collect only what the tutoring itself needs. Your child's use of the service is never
   conditioned on giving us more than that.
5. You can review, export, delete and revoke at any time. Revoking freezes the profile.
6. We disclose your child's information to no third party beyond the service providers listed in
   section 6, who process it only for us.

> **Mismatch (blocking, top priority).** Verifiable parental consent is **not implemented**.
> `lib/tutor/accounts/validate.ts` accepts `method: 'checkbox' | 'checkbox_card'`, but
> `components/tutor/parent/consent.tsx:243` hard-codes `method: 'checkbox'`. No code path produces
> `checkbox_card`; no Stripe transaction is tied to a consent record; `evidence_ref` holds the HTTP
> request id, not a transaction id. An affirmative checkbox on its own is not an approved
> verification method for collection that is disclosed to service providers. See
> `open-questions.md` Q6.

> **Mismatch (blocking, top priority).** Age banding can misclassify a 12-year-old as a teen for up
> to eleven months. `ageBandForBirthYear` in `kaizen.config.ts` computes
> `age = now.getUTCFullYear() - birthYear`. A child born in December 2013 is treated as `13-17` from
> 1 January 2026, while actually 12. That profile is routed around the under-13 gate, given a teen
> self-login, and offered the no-card trial — i.e. a child's personal information is collected with
> no parental consent. See `open-questions.md` Q7.

## 10. Security

Data is encrypted in transit and at rest. Access is limited to what each person or system needs.
Provider keys exist only on the server and never reach a browser. Every database query filters on
the account id that owns the row, and the invariant suite tests that no API route can read another
account's data. Error reports are scrubbed of content before they are sent
(`lib/tutor/errors/scrub.ts` removes email addresses, keys, bearer tokens, long opaque tokens and
quoted passages, then truncates).

> **Mismatch (blocking).** Checklist item 9 requires a *written security program* — encryption, least
> privilege, key rotation, incident response, vendor breach clauses. The paragraph above is a summary
> of intent. `compliance/security-program.md` does not exist.

## 11. Where the data is

The service is hosted in the United States. If you use it from elsewhere, your data is transferred
to and processed there. Which sub-processors process where is in `vendor-data-flow.md`.

## 12. Changes to this policy

Changes are posted with a new version number. A consent record always names the version it was given
for. A change that materially affects a child's data asks the parent again.

## 13. Contact

`[[privacy contact email]]` · `[[postal address]]` · `[[telephone]]`.
