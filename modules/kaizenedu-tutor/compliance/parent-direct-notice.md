# Direct notice to a parent — DRAFT, PENDING COUNSEL REVIEW

> **This is an unreviewed draft.** It has not been read by a lawyer and is not in force. Version
> `2026-09-05-draft`. It is a **different document from the privacy policy** and has its own
> required content (believed §312.4(c) of the COPPA Rule — unverified; see
> `.claude/skills/minors-privacy/references/coppa-checklist.md`).
>
> **This notice cannot be delivered to anyone until `app_settings.under13_gate` is true, and that
> switch is blocked on `compliance/signoff.md`.** See `launch-gate-checklist.md`.

## What this document is, and when it is shown

A direct notice is given **to the parent, before any personal information is collected from the
child**. It is short, it is separate from the privacy policy, and it must be readable without
following a link. It is shown in the consent flow
(`components/tutor/parent/consent.tsx`) immediately above the consent control — the notice comes
first, the affirmative act second.

The consent record stores which version of this notice was shown
(`consents.notice_version`), so a material change to the words below requires a version bump and a
fresh ask.

**Delivery method — open question.** The Rule contemplates a direct notice reaching the parent, and
the parent is the person operating the screen in our flow. Whether an in-product notice at the
moment of consent satisfies delivery on its own, or whether it must also be emailed to the account
holder's verified address, is for counsel (`open-questions.md` Q8). We currently have no way to send
email at all.

---

## The notice text (draft)

### About your child's Natural Tutor profile

You are creating a tutoring profile for a child under 13. Before we collect anything from your
child, here is what will happen, in full.

**Who we are.** `[[legal entity name]]`, `[[registered address]]`. Questions:
`[[privacy contact email]]`, `[[telephone number]]`.

**We have collected from you already, to reach this screen:** your email address, a name to call
you, and the display name and birth year you typed for your child. Nothing else about your child
exists yet.

**What we will collect from your child once you consent**

- **What your child says and types during a session, as text.** Speech is turned into text; the
  words are kept, the recording is not.
- **What the tutor says back**, and anything drawn on the whiteboard during the lesson.
- **Homework your child uploads** — a photo or a PDF. We keep the text we read out of it. We do not
  keep the picture.
- **Answers to check questions**, whether they were right, and which misunderstanding a wrong answer
  points to.
- **A progress estimate for each skill**, and a short note of which explanations worked, so the tutor
  does not start over every session.
- **Session length and timing**, and what each session cost us, so we can meter your plan.
- **A profile identifier and a session identifier**, used internally to keep the account secure, to
  meter usage, and to diagnose errors.

**About the microphone.** Your child's voice is collected **only to answer what your child is
asking.** The recording is sent to our transcription provider, turned into text, and discarded. We
do not keep audio files. We do not use the voice to identify anyone. We do not create a voiceprint
or any other biometric identifier. It is not used for any other purpose and it is not disclosed to
anyone other than that provider.

**About the camera.** **The camera is not used.** There is no camera feature in this product today.
If we ever build one, we will tell you before it is offered, ask you about it separately from this
consent, and never bundle it with your consent to use the service. Nothing about a camera is being
asked for here.

**Who receives your child's information.** Only the service providers who run the product for us,
listed by name in our privacy policy at `/legal/privacy`: the language-model provider that writes
the tutor's replies, the speech-to-text and text-to-speech providers, our hosting provider, our
database provider, our first-party analytics and error-reporting tools, and our payment processor.
Each of them processes your child's information only for us and only to run the service. **We do not
sell your child's information, we do not disclose it to anyone else, and we do not use it to train
AI models.** If that ever changed, we would ask you again, separately, and you could say no and keep
using the service.

**No advertising.** There is no advertising in this product, no ad network, no ad software, and no
tracking of your child across other websites or apps.

**How long we keep it.** While the profile is active, and for `[[retention window — see
retention-policy.md]]` after the last session, then it is deleted. Audio is never kept. You can
delete sooner at any time.

**What you can do, at any time, from the parent dashboard**

- **Read** every transcript and everything we hold about your child.
- **Download** it as a file.
- **Delete** the profile, or the whole account.
- **Refuse any further collection** by revoking this consent, which freezes the profile immediately.
  Revoking does not delete what already exists — use Delete for that.

**You do not have to agree to more than the tutoring needs.** We do not condition your child's use
of the service on giving us information beyond what is reasonably necessary to tutor them.

**If you consent.** You will be asked to confirm, and then to complete a verification step so that
we know you are the parent and not the child. `[[verification step — not yet built; see
open-questions.md Q6]]`

Our full privacy policy is at `/legal/privacy`. It says the same things at greater length, plus
everything that applies to your own account.

---

## Required-content checklist for counsel

Each row is what the draft above is trying to satisfy. The section numbers are the lead seat's
belief and are **unverified**.

| Required element (believed §312.4(c)) | Where in the draft | Confident? |
| --- | --- | --- |
| That we have collected the parent's online contact information for the purpose of obtaining consent | "We have collected from you already…" | Weak — the draft states the fact but not the purpose in the Rule's terms. Counsel to reword |
| That we wish to collect personal information from the child | "What we will collect from your child once you consent" | Yes |
| That the parent's consent is required, and that the child may not participate without it | Not stated explicitly | **No — gap.** Counsel to supply the sentence |
| The specific personal information to be collected and how it may be used | The bulleted list, plus "Who receives…" | Yes |
| That the information will be disclosed to third parties, or that it will not | "We do not sell… we do not disclose it to anyone else" plus the service-provider list | Yes, but the service-provider/third-party distinction needs counsel's wording |
| A hyperlink to the online privacy policy | `/legal/privacy`, twice | Yes |
| The means by which the parent can give consent | "If you consent…" | **No — the means does not exist yet.** Blocked on Q6 |
| That the parent can refuse consent, and how to have the information deleted | "What you can do, at any time" | Partly — refusal *before* consenting is not addressed, only revocation after |
| The audio-file statement: collected solely to respond to a specific request, not used for any other purpose, not disclosed, deleted immediately (believed §312.5(c)(9)) | "About the microphone" | Draft says "discarded"; the Rule's word may be "immediately". Counsel to confirm the exact phrasing, and see Q4 on whether the provider deletes immediately |
| Operator name, address, telephone, email | Header — **all four are `[[placeholders]]`** | **No — blocking.** See Q1 |

## What this notice must not do

- It must not be shown to the child, or worded for the child.
- It must not bundle the camera, marketing email, or any third-party disclosure with the primary
  consent. Each is its own ask.
- It must not sit behind a link on the consent screen. The notice comes before the act.
- It must not use a dark pattern near the consent or the revoke control: no pre-ticked box, no
  styling that makes "no" harder to find than "yes", no interstitial that delays revocation.
