# Open questions for counsel — DRAFT

> **This is an unreviewed draft.** Every question below is one an agent deliberately did **not**
> answer, because answering it would have meant guessing at law or at facts nobody has supplied. A
> clearly-marked open question is more useful to you than a confident wrong answer.
>
> Ordered by what they block. Tier A blocks the under-13 gate outright. Tier B blocks publishing an
> accurate notice. Tier C should be settled before beta but does not block the gate.

---

## Tier A — blocks the under-13 gate

### Q1. Who is the operator, and what are its name, address, telephone and email?

**Why it matters.** The COPPA online notice and the direct notice are believed to require the
operator's name, address, telephone number and email address (§312.4(d)(1), unverified). None of the
four exists anywhere in this repository. The live privacy page says only "operated by the company
named on the pricing page" and points contact at "the address published on the pricing page"; the
code has a single `SUPPORT_EMAIL` env var.

**Blocks.** Publishing either notice. Everything in Tier A and B is downstream of this.

**We need from you / the owner.** The legal entity, its registered address, a telephone number, a
monitored privacy email address, and whether a separate entity should hold the service. Also whether
the operator is an entity at all yet, or a sole proprietor.

---

### Q2. Which jurisdictions are we in?

**Why it matters.** Nothing in the repo says. Every one of these changes the drafts materially:

- **Which US state** is the home jurisdiction — governing law, venue, and which state privacy law
  attaches. The terms draft leaves §11 blank rather than guessing.
- **Texas.** The SCOPE Act adds obligations for known minors under 18 (parental tools, data limits).
  Spec §11.3 says the parent-owned account model covers most of it and that counsel confirms the
  rest before beta. Texas CUBI would also matter if a camera is ever built.
- **Illinois.** BIPA matters only if a camera is built, but it changes the design if it does.
- **EU / UK.** Do we offer the service there? If yes: GDPR/UK GDPR legal bases (the privacy draft's
  basis table is a hypothesis, not a determination), the UK Age Appropriate Design Code, an EU
  representative, transfer mechanism for US processing, and a DPIA for a children's service with
  profiling. If no, we must actually block it rather than assume it.
- **Are schools ever a customer?** If yes, FERPA and state student-privacy laws attach and the whole
  contracting model changes.

**Blocks.** The legal-basis column, the terms' governing-law clause, whether a DPIA is needed, the
state-law analysis.

**Our position, for you to correct.** The product is US, direct-to-parent, consumer, no school
channel. That is an assumption drawn from spec §9 and the parent-owned account model (D4), not a
fact anyone has stated.

---

### Q3. `/api/transcription` is unauthenticated and accepts a caller-supplied endpoint

**Why it matters.** `app/api/transcription/route.ts` — the upstream OpenMAIC route, still mounted —
reads `apiKey` and `baseUrl` from the **multipart form body**, and performs no authentication.
`middleware.ts` strips `x-api-key` / `x-base-url` **headers** but not form fields, and
`isProductPath` in `kaizen.config.ts` covers only `/api/tutor` and `/api/parent`, so the route stays
reachable with `TUTOR_MODE=1`. A caller can have audio forwarded to an endpoint of their choosing, or
spend the server's ASR key.

No statement that "your child's voice goes only to our transcription provider" can be true while this
route is reachable in production.

**Blocks.** The audio claim in the privacy policy and the direct notice; arguably the security
program.

**This is a code fix, not a legal question** — `docs/ARCHITECTURE-MAP.md` should mark the route
strip-or-gate. It is listed here because it invalidates a notice statement.

---

### Q4. Does the ASR provider delete the audio immediately?

**Why it matters.** The believed audio-file exception (§312.5(c)(9)) turns on the audio being
collected solely to respond to a specific request, not used for any other purpose, not disclosed, and
**deleted immediately**. Our own systems are verified clean (`compliance/privacy-policy.md` §3). What
the provider does after receipt is a contract term, and no contract has been read.

If the provider retains audio for abuse monitoring — even briefly, even in a separate system — the
exception may not be available, and the analysis changes from "we do not collect audio" to "we
collect a child's voice recording and a third party holds it."

**Blocks.** The microphone paragraph in both notices. This is the single most load-bearing
unverified claim in the pack.

**We need from you.** Whether "deleted immediately" must be contractual, whether a documented
zero-retention API mode is enough, and whether an abuse-monitoring window is fatal or merely
disclosable.

---

### Q5. Model routing is an environment variable, so the recipient list is not stable

**Why it matters.** `lib/server/model-routes.ts` parses `MODEL_ROUTES` as free-form JSON of
stage → model string, with `DEFAULT_MODEL` as the fallback. Any provider `lib/ai/llm` supports can be
selected with no code change, no vendor review, and no update to a notice that is believed to have to
name every recipient (§312.4(d)).

**Blocks.** Any claim that the published recipient list is complete.

**We need from you.** Whether naming a category ("our language-model providers") is ever sufficient
or whether each must be named; and, if named, we will need an allowlist enforced at boot so an env
var cannot introduce an unnamed recipient.

---

### Q6. Verifiable parental consent is not implemented

**Why it matters.** `lib/tutor/accounts/validate.ts` accepts `method: 'checkbox' | 'checkbox_card'`,
but `components/tutor/parent/consent.tsx:243` hard-codes `method: 'checkbox'`. **No code path
produces `checkbox_card`.** No Stripe transaction is tied to a consent record. `consents.evidence_ref`
holds the HTTP request id, not a transaction id. An affirmative checkbox alone is the "email plus"
shape at best, which is believed to be limited to internal-only use — and our data goes to service
providers.

**Blocks.** The gate, absolutely. This is the highest-priority build item.

**We need from you.**
1. Confirm the intended method — a real card transaction with notification to the account holder —
   is an approved method (§312.5(b)) for our facts.
2. Confirm the minors-privacy skill's working assumption that a **$0 authorisation does not
   suffice** and a real charge is required. Spec §9 flags this and it drives the pricing model: the
   under-13 band has no free trial *because* of it.
3. Tell us what the consent record must evidence. We currently store method, notice version, policy
   version, camera flag, grant/revoke timestamps and one evidence reference. Is that the right set?
4. The "transaction notification to the account holder" half needs email, which does not exist
   (Q11). Is a Stripe-sent receipt sufficient, or must the notification come from us?

---

### Q7. Birth-year-only age banding misclassifies 12-year-olds as teens

**Why it matters.** `ageBandForBirthYear` in `kaizen.config.ts` computes
`age = now.getUTCFullYear() - birthYear`. A child born in December 2013 is classified `13-17` from 1
January 2026 while actually 12 — for up to eleven months. That profile is routed **around** the
under-13 gate by `kindForBand` / `resolveLearnerStatus`, is given a teen self-login, and is offered
the 30-minute no-card trial. That is a child's personal information collected with no parental
consent, on a service with actual knowledge of the birth year.

**Blocks.** The gate, and arguably the current 13+ launch too — the exposure exists today, before the
under-13 gate ever opens.

**Our recommendation, for you to confirm.** Gate conservatively: treat the cohort as the *youngest*
possible age, i.e. `age = year - birthYear - 1` for the purposes of the under-13 decision. That
over-protects a handful of genuine 13-year-olds for part of a year, which is the right direction to
err. The alternative — collecting a full date of birth — is more precise but collects more data from
a child, which cuts against minimisation.

**We need from you.** Which trade-off you want, and whether collecting a birth month would itself
need justifying under minimisation.

---

### Q8. Is an in-product direct notice sufficient, or must it be emailed?

**Why it matters.** The direct notice is shown in the consent flow, on screen, immediately above the
consent control. The parent is the person at the screen. Whether that satisfies delivery of a direct
notice on its own, or whether it must also reach the account holder's verified email, is a judgement
we did not make. We cannot currently send email at all (Q11).

**Blocks.** The consent flow's design.

---

### Q9. Do consent records survive a deletion request?

**Why it matters.** `consents.learner_id` cascades on delete, so purging a learner destroys the proof
that consent was obtained. The live privacy page promises the opposite: that consent records are kept
"as long as the law requires us to show that consent was given". Code and text disagree.

`deletion_requests` rows already survive by design — ids and timestamps only, the record that a right
was exercised. The same reasoning may or may not extend to consents.

**Blocks.** The retention policy, and the schema follows your answer.

**We need from you.** Whether proof-of-consent retention is required or permitted after a deletion
request, and if so what minimum fields it may keep.

---

### Q10. Backups and point-in-time restore

**Why it matters.** Nothing addresses them. A deletion that removes a row from the primary but leaves
it in a database backup or a PITR window has not really deleted it, for some period. Neon's retention
settings are not recorded anywhere.

**Blocks.** An honest retention policy.

**We need from you.** Whether a stated backup window is acceptable within a deletion promise, and
what the maximum defensible window is for a child's data.

---

### Q11. There is no email provider, and several obligations depend on one

**Why it matters.** No Resend, SendGrid, Postmark, Mailgun, nodemailer or SMTP client exists in the
repository. Meanwhile: `parent_settings.weeklyEmail` defaults to `true`; the privacy policy refers to
"the emails we send"; the consent method needs a transaction notification (Q6); the direct notice may
need email delivery (Q8); breach notification needs it; the attention ladder's "notify the account
holder" rung needs it; and the terms promise 14 days' notice of adverse changes.

**Blocks.** Q6 and Q8, plus the accuracy of two published documents.

**Action.** Choose a provider, review it as a sub-processor (`vendor-data-flow.md` §9), and add it to
the recipient list before any email is sent.

---

## Tier B — blocks an accurate notice

### Q12. Is the school exception available to us? (We believe not.)

**Why it matters.** COPPA allows, in some circumstances, a school to provide consent on parents'
behalf for educational-context collection. We believe it plainly does not apply here: the account
holder is a parent, the contract is direct-to-consumer, the subscription is paid by a card the parent
enters, no school is a party, and the service is used at home for the family's own purposes. Nothing
in the product implements a school relationship.

**We are recording this rather than relying on it.** If the owner ever pursues a school or district
channel, the analysis changes completely and FERPA and state student-privacy laws attach — that is a
different product, not a new feature.

**We need from you.** Confirmation that the exception is unavailable and that no part of the current
design accidentally reaches for it.

---

### Q13. Terms: dispute resolution, liability cap, and the mixed-audience question

Three separate asks.

1. The terms draft contains **no arbitration clause, no class waiver and no jury waiver**, on
   purpose. Whether to add any of them for a children's product — where enforceability against a
   consumer and the reputational picture both matter — is your call.
2. Is a three-months-of-fees liability cap enforceable in the chosen jurisdiction for a consumer
   contract?
3. Does the service qualify as **mixed audience** rather than child-directed? Our posture (spec
   §11.2 item 1) is a neutral age screen for self-signup, parent-entered birth years on learner
   profiles, and marketing that stays teen/parent-facing. Risk §12 names "child-directed design
   creep" explicitly. If the visuals ever drift toward a kids' app, the age screen stops working as
   a shield and the whole service becomes child-directed. Confirm the posture, and tell us what
   would break it.

---

### Q14. Is the parent report wording sufficient to avoid reading as a professional assessment?

**Why it matters.** A per-skill percentage in a parent-facing report is the sentence most likely to
be read as a professional judgement about a child. The product's guards:
`lib/tutor/report/parent-report.ts` renders "on track (estimate)" and "in progress (estimate)",
reserves *mastery* for a confirmed unaided check, and `evidence_events.assisted` prevents assisted
work from confirming a skill.

**We need from you.** Whether that is enough; whether a standing disclaimer must appear on the report
surface itself rather than only in the terms and the AI disclosure; and whether any wording strays
toward a claim about ability, aptitude or a condition.

---

### Q15. Does the analytics payload stay inside "internal operations" for a child?

**Why it matters.** PostHog receives event names with the account id as distinct id plus scalars —
including `skillId`, `misconception`, `band`, `correct` and `costCents`
(`lib/tutor/analytics/events.ts`). A misconception tag is a coarse enum about a specific child's
learning. Configuration is conservative: recording, surveys, autocapture, heatmaps, dead clicks,
exception capture and external script loading are all off; `ip: false`; `respect_dnt: true`; and
**any non-adult band gets in-memory persistence — no cookie, no local storage**
(`lib/tutor/analytics/client-config.ts`).

**We need from you.** Whether that stays inside the internal-operations exception for a child, and
whether the notice's current wording ("event names with ids and timing") is accurate enough — it is
narrower than what is actually sent.

---

### Q16. What is the retention window, in months, and for `flags` specifically?

Spec §11.2 item 5 proposes 12 months after last activity, and `CLAUDE.md` requires a human to approve
any retention window, so no agent may pick it. Two decisions:

1. The general window for transcripts, student model and evidence.
2. `flags` specifically, where a child's deletion right and a safety record pull against each other.
   A flag can record that a learner disclosed self-harm or abuse. Same window as transcripts? Longer
   while a matter is open? Counsel decides.

---

## Tier C — settle before beta

### Q17. Camera: the conditions to write down now, before anyone builds it

There is no camera in the product — no `getUserMedia` with a video constraint anywhere, no
`@mediapipe/tasks-vision` dependency, `camera_sensing_enabled` seeded false, and `recordConsent`
refuses a camera consent while that gate is shut. So there is nothing to review yet.

What we would like from you is the **condition list** that a future build must satisfy, agreed in
advance: the amended COPPA biometric definition applied to on-device landmarks that never leave the
device; Texas CUBI; Illinois BIPA; whether "never transmitted, never stored" removes it from those
definitions entirely or merely reduces risk; whether a separate written biometric policy and
retention schedule would be required even for on-device processing; and whether default-on for 4-to-8
is defensible at all.

Spec §11.2 item 12 requires your review before the toggle is exposed to any minor and again before
default-on for 4–8.

### Q18. Federal drift

Spec §11.3: the House passed the KIDS Act (H.R. 7757) on 2026-06-29 with COPPA 2.0 provisions
extending protections through 17, a "should-have-known" standard, and AI-chatbot safety provisions.
It is in the Senate and is not law. D11 already builds minors' plumbing for all bands.

**We need from you.** Whether to write to that standard now, and confirmation of the monthly re-check
cadence recorded in `docs/DECISIONS.md`.

### Q19. Safe-harbour certification

Spec §11.2 item 14 defers kidSAFE / ESRB certification until revenue justifies it. Is that the right
call, or does certification materially reduce enforcement risk enough to pull forward?

### Q20. The COPPA section numbers in our skill are unverified

`.claude/skills/minors-privacy/references/coppa-checklist.md` records that the Phase 0 environment
could not fetch eCFR, the Federal Register or ftc.gov, so every section number in that skill — and
therefore every one cited in this folder — is the lead seat's recollection, not a checked citation.
The checklist lists exactly what to verify and where. Please confirm or correct the mapping, and
record the verification date at the bottom of that file.

---

## Cross-reference: code defects that create legal exposure

These are engineering fixes, not legal questions, but each one falsifies a statement a notice needs
to make. Listed so counsel can see what is being fixed in parallel.

| # | Defect | File | Falsifies |
| --- | --- | --- | --- |
| 1 | No inactivity-based deletion exists | `lib/tutor/accounts/deletion.ts` | "deleted 12 months after last activity" |
| 2 | `runDeletionJob` is never invoked; no cron | `vercel.json` | "a deletion completes within 30 days" |
| 3 | `DELETION_WINDOW_DAYS` is a floor, not a ceiling | `lib/tutor/accounts/deletion.ts` | "within 30 days" |
| 4 | Export omits `coursework`, `learner_profiles`, `attention_stats`, `recovery_events`, `flags` | `lib/tutor/accounts/export.ts` | The parental review/export right |
| 5 | Consent method is hard-coded `'checkbox'` | `components/tutor/parent/consent.tsx:243` | Verifiable parental consent |
| 6 | Age band computed from birth year alone | `kaizen.config.ts` | The under-13 gate itself |
| 7 | `/api/transcription` unauthenticated, caller-supplied `baseUrl` | `app/api/transcription/route.ts` | "audio goes only to our provider" |
| 8 | Recipient list is env-driven | `lib/server/model-routes.ts` | "we name every recipient" |
| 9 | TTS notice names ElevenLabs/Azure; code defaults to OpenAI | `app/(learner)/api/tutor/tts/route.ts:118` | The recipient list |
| 10 | Stripe customer survives account deletion | `lib/tutor/accounts/deletion.ts` | "delete the whole account" |
| 11 | `account_sessions` rows outlive the learner (`SET NULL`) | `lib/tutor/db/schema.ts` | Completeness of the purge |
| 12 | `weeklyEmail` defaults true with no email provider | `lib/tutor/accounts/settings.ts:16` | "the emails we send" |
| 13 | No written security program | `compliance/security-program.md` missing | Checklist item 9 |
