# Vendor and data-flow map — DRAFT, PENDING COUNSEL REVIEW

> **This is an unreviewed draft.** It has not been read by a lawyer and is not in force. Version
> `2026-09-05-draft`.
>
> **Every vendor below is UNVERIFIED.** No terms have been read against the requirements, no DPA has
> been executed, no provider has been confirmed to permit minors' data or to refrain from training on
> inputs. The "Verified" column is `NO` on every row and it is not an oversight — it is the current
> state. Spec §11.2 item 7 says this review happens in week 1 and that any failing vendor is swapped
> **before** the under-13 gate opens.

## How to read this

For each vendor: what data reaches it, why, where it is processed, what its terms have to say, and
whether that has been checked. The requirements come from spec §11.2 item 7 and the minors-privacy
skill:

- **(R1) Minors' data permitted** — the terms must not exclude data from users under 13/18.
- **(R2) No training on inputs** — contractually, not just by a console toggle.
- **(R3) Service-provider role** — use limited to our purposes, confidentiality, no independent use.
- **(R4) Data-processing terms executed** — a signed DPA or equivalent, with sub-processor and breach
  clauses.
- **(R5) Deletion** — the vendor deletes on our instruction and on its own retention schedule; for
  audio, immediately.

A vendor that fails R1, R2 or R3 is swapped. A vendor that has not executed R4 blocks the gate.

---

## 1. Language models (the tutor's replies, grading, summaries, reading uploads)

| | |
| --- | --- |
| **Who** | Whatever `MODEL_ROUTES` / `DEFAULT_MODEL` names. Intended set per spec §8.4: Google (Gemini) for the live turn, Anthropic (Claude Sonnet-class) for diagnose/grade/summary/model-update, OpenAI where the operator routes a stage there |
| **What it receives** | The text of the conversation turn by turn, including everything the child said; the compact learner profile (subjects, recurring misconceptions, pace, what explanations worked); the extracted or raw problem; **and, for the reading stage, the uploaded image or PDF bytes themselves** |
| **Why** | To produce the tutor's reply, grade a check, diagnose a misconception, write the session summary, update the student model, and read a photo of homework |
| **Where** | Provider's US regions, assumed. **Unconfirmed** |
| **Code** | `lib/tutor/turn/llm-call.ts`, `lib/tutor/turn/engine.ts`, `lib/tutor/checks/llm-grade.ts`, `lib/tutor/wrap/service.ts`, `lib/tutor/extract/service.ts`; routing in `lib/server/model-routes.ts` |
| **Terms must say** | R1–R5. Specifically: no training on inputs or outputs; zero or minimal retention for abuse monitoring, and if there is an abuse-monitoring retention window, it must be disclosed in our notice; enterprise/API terms, not consumer terms; no human review of our traffic without contractual limits |
| **Verified** | **NO** |

> **Structural problem, blocks the gate.** The set of language-model recipients is decided by an
> environment variable at runtime. `lib/server/model-routes.ts` parses `MODEL_ROUTES` as free-form
> JSON of stage → model string, and `DEFAULT_MODEL` catches the rest; any provider `lib/ai/llm`
> supports can be selected with no code change, no review, and no update to the published notice. If
> the notice must name every recipient, an env var must not be able to add one. Needs an allowlist
> enforced at boot, or a published recipient list generated from the running configuration. See
> `open-questions.md` Q5.

> **Note for the vendor review.** The image bytes of a child's homework reach the vision model. A
> photo of a worksheet routinely carries the child's handwritten name, a teacher's name, a school
> letterhead, and sometimes a class list. That is a larger disclosure than "the text of the problem"
> and the review should treat it as such.

## 2. Speech to text (ASR)

| | |
| --- | --- |
| **Who** | Default `openai-whisper` (`app/(learner)/api/tutor/asr/route.ts:107`, falling back through `resolveServerASRProviderId()`); overridable by `TUTOR_ASR_PROVIDER`. Spec §8.4 also contemplates Azure Speech |
| **What it receives** | One utterance of the learner's voice as an audio blob, up to 8 MB / 60 s |
| **Why** | To transcribe it so the tutor can answer |
| **Where** | Provider's US regions, assumed. **Unconfirmed** |
| **Code** | `app/(learner)/api/tutor/asr/route.ts` → `lib/audio/asr-providers.ts` |
| **Terms must say** | R1–R5, and specifically that **the audio is deleted immediately after transcription and is not retained, not used for training, and not used for voice identification or biometric enrolment.** The believed audio-file exception (§312.5(c)(9)) turns on exactly this |
| **Verified** | **NO — and this is the single most load-bearing unverified claim in the pack** |

Our side is verified: the route holds the clip in memory, hands it to the provider, writes only a
seconds-counting `usage_ledger` row, and logs bytes and duration but never the transcript. What the
provider does after receipt is contract, not code, and nothing in this repository evidences it.

> **Blocks the gate, security.** `app/api/transcription/route.ts` (upstream OpenMAIC, still mounted)
> takes `apiKey` and `baseUrl` from the **multipart form body** and has **no authentication**.
> `middleware.ts` strips `x-api-key` / `x-base-url` **headers**, not form fields, and
> `isProductPath` does not cover `/api/transcription`, so the route remains reachable with
> `TUTOR_MODE=1`. That is an unlisted-recipient path for a child's voice and an open door on the
> server's ASR key. See `open-questions.md` Q3.

## 3. Text to speech (TTS)

| | |
| --- | --- |
| **Who** | Default `openai-tts`, voice `alloy` (`app/(learner)/api/tutor/tts/route.ts:118-119`); overridable by `TUTOR_TTS_PROVIDER`. Spec §8.4 also contemplates ElevenLabs and Azure |
| **What it receives** | The **tutor's** sentence text. Never the learner's words |
| **Why** | To produce the audio the learner hears |
| **Where** | Provider's US regions, assumed. **Unconfirmed** |
| **Code** | `app/(learner)/api/tutor/tts/route.ts` |
| **Terms must say** | R1–R4. Lower sensitivity than the others because the payload is our own generated text, but it is still a child-directed service and R1/R3 still apply. No voice cloning of a real person; presets only (spec §11.1) |
| **Verified** | **NO** |

> **Mismatch.** The live privacy page names "ElevenLabs or Microsoft Azure Speech" for TTS. The code
> defaults to OpenAI. Publishing the wrong recipient name is a notice defect.

## 4. Hosting and compute

| | |
| --- | --- |
| **Who** | Vercel |
| **What it receives** | Every request and response, so in practice every category in the privacy policy passes through it in transit; plus platform logs |
| **Why** | Runs the Next.js application |
| **Where** | US, per `vercel.json` and the default region. **Unconfirmed** |
| **Terms must say** | R1, R3, R4; a DPA with sub-processor list and breach notification; log retention we can state; no use of customer content |
| **Verified** | **NO** |

Our logs carry ids, byte counts and durations only (`createLogger` call sites in the tutor routes were
written to that rule), but Vercel's platform retention for those logs is a vendor setting nobody has
recorded.

## 5. Database

| | |
| --- | --- |
| **Who** | Neon (Postgres), via `DATABASE_URL` |
| **What it receives** | Everything in privacy-policy §2 — accounts, learner profiles, transcripts, coursework text, student model, evidence, consents, usage, flags, attention aggregates |
| **Why** | The system of record |
| **Where** | Whatever region the Neon project was created in. **Unconfirmed and must be recorded** |
| **Terms must say** | R1, R3, R4; encryption at rest; a DPA; deletion of backups on a stated schedule |
| **Verified** | **NO** |

> **Gap.** Backups and point-in-time restore are not addressed anywhere. A deletion that removes a
> row from the primary but leaves it in a 30-day PITR window is a real retention question, and the
> retention policy is silent on it. See `open-questions.md` Q10.

## 6. Product analytics

| | |
| --- | --- |
| **Who** | PostHog, first-party project (`POSTHOG_API_KEY`, `POSTHOG_HOST`, default `https://us.i.posthog.com`) |
| **What it receives** | Event names from a fixed vocabulary with ids and scalars: account id as distinct id, learner/session/turn ids, age band, skill id, misconception tag, latency, cost, minutes, check correctness, cap kind, error code and route |
| **Why** | To understand product usage. Internal operations |
| **Where** | US cloud, per the default host |
| **Code** | `lib/tutor/analytics/*`. `scrub.ts` drops any property whose name matches `/text\|transcript\|name\|email\|note/i`, drops strings over 200 characters or shaped like an email, and drops nested objects entirely. `client-config.ts` disables session recording, surveys, autocapture, heatmaps, dead clicks, exception capture, web experiments and external script loading; sets `ip: false`, `respect_dnt: true`, `person_profiles: 'identified_only'`; and gives **any non-adult band in-memory persistence — no cookie, no local storage** |
| **Terms must say** | R1–R4; no ad-network integration; retention we can state; a DPA |
| **Verified** | **NO** |

> **Accuracy note.** The live page describes analytics as "event names with ids and timing". The
> events also carry `skillId`, `misconception`, `band`, `correct` and `costCents`
> (`lib/tutor/analytics/events.ts`). A misconception tag is a coarse enum about a specific child's
> learning; `scrubAnalyticsProps` does not drop it because the key does not match the forbidden
> pattern. Defensible as internal operations, but the notice should describe it accurately and
> counsel should confirm it stays inside that exception for a child.

## 7. Error reporting

| | |
| --- | --- |
| **Who** | Sentry (`SENTRY_DSN`) |
| **What it receives** | A scrubbed message and stack, a scrubbed error type, ids as tags (account, learner, session, turn), the route path, a short machine code, and the **account id as the Sentry user id** |
| **Why** | To diagnose failures |
| **Where** | Sentry's US region, assumed. **Unconfirmed** |
| **Code** | `lib/tutor/errors/*`. There is no Sentry SDK — `sentry.ts` builds the envelope by hand and posts it, so there are no breadcrumbs, no request bodies and no replay by construction. `scrub.ts` removes bearer tokens, secret query params, key-shaped strings, emails, long opaque tokens and **quoted passages of 20+ characters** (the shape a transcript takes inside a provider error), then truncates to 500 characters |
| **Terms must say** | R1, R3, R4; retention we can state; a DPA |
| **Verified** | **NO** |

The client-side reporter (`app/(learner)/api/tutor/error-report/route.ts`) accepts only a short code
matching `/^[A-Za-z0-9_.-]{1,64}$/`, a path with the query string stripped, and a session id — it
cannot carry content by construction.

## 8. Payments

| | |
| --- | --- |
| **Who** | Stripe |
| **What it receives** | The account holder's card details and billing address, entered on Stripe's own pages; email and customer metadata |
| **What we receive back** | A customer id, a subscription id, plan and status, period dates (`subscriptions`), and webhook event ids (`stripe_events`) |
| **Why** | Subscription billing. Spec §11.2 item 3 also intends the card transaction to be the parental-consent verification step |
| **Where** | US. **Unconfirmed** |
| **Terms must say** | R3, R4. Stripe acts as an independent controller for parts of payment processing — counsel to confirm how that is described in the notice |
| **Verified** | **NO** |

Two notes. First, the payment data is the **parent's**, not the child's — a different analysis.
Second, **Stripe is not in the deletion path**: `purgeAccount` deletes our `subscriptions` row, and
the Stripe customer survives.

## 9. Email

| | |
| --- | --- |
| **Who** | **None. No email provider exists in this repository.** No Resend, SendGrid, Postmark, Mailgun, nodemailer or SMTP client. Spec §8.3 lists Resend as a P1 item |
| **What this breaks** | `parent_settings.weeklyEmail` defaults to `true` (`lib/tutor/accounts/settings.ts:16`) and the privacy policy refers to "the emails we send". Neither can be true today |
| **Also blocked by this** | The believed consent method of a card transaction "with transaction notification to the account holder"; any delivery of the direct notice by email; breach notification to account holders; the "notify the account holder" rung of the attention-recovery ladder |
| **Verified** | n/a — **the vendor does not exist yet, which itself blocks the gate** |

## 10. Object storage

**Not used.** Spec §8.3 lists S3-compatible object storage via `@openmaic/storage`, but no tutor code
path writes to it. Audio and uploaded images are handled in memory and never persisted. If storage is
ever introduced on a learner path it is a new sub-processor and a new notice line.

## 11. Authentication

**No third-party auth provider.** Spec §8.3 lists Clerk; the code implements its own
`accounts` / `account_sessions` with password hashing (`lib/tutor/auth/password.ts`) and hashed
session tokens. No identity vendor receives data. Spec §8.3 is stale on this point.

---

## Summary table

| Vendor | Role | Child data? | R1 | R2 | R3 | R4 | Verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Google / Anthropic / OpenAI (per `MODEL_ROUTES`) | LLM | Yes — transcripts, homework images, student model | ? | ? | ? | ? | **NO** |
| OpenAI Whisper (default) | ASR | Yes — the child's voice | ? | ? | ? | ? | **NO** |
| OpenAI TTS (default) | TTS | No — tutor text only | ? | ? | ? | ? | **NO** |
| Vercel | Hosting | Yes — everything in transit | ? | n/a | ? | ? | **NO** |
| Neon | Database | Yes — everything at rest | ? | n/a | ? | ? | **NO** |
| PostHog | Analytics | Yes — ids and coarse learning tags | ? | ? | ? | ? | **NO** |
| Sentry | Errors | Ids only | ? | ? | ? | ? | **NO** |
| Stripe | Payments | Parent's data, not the child's | ? | n/a | ? | ? | **NO** |
| *(none)* | Email | — | — | — | — | — | **Does not exist** |

## What to do with this document

1. Pin the actual provider for every stage — no more "or", no more env-var ambiguity.
2. Read each vendor's current terms and DPA against R1–R5 and fill in the table.
3. Save the terms extract and the executed DPA under `compliance/vendor-reviews/<vendor>/`.
4. Swap anything that fails R1, R2 or R3.
5. Record the processing region for each.
6. Choose an email provider and add it here before any email is sent.
7. Only then can the privacy policy's recipient list and the direct notice be published as true.
