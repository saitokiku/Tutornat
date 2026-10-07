# Under-13 gate checklist — DRAFT, PENDING COUNSEL REVIEW

> **This is an unreviewed draft.** Version `2026-09-05-draft`. It tracks spec §11.2 item by item and
> ties each to the code that implements it. Nothing here asserts that a requirement is *met* in law —
> only whether the code exists.
>
> **Status: the gate cannot open.** Nine of fourteen items are incomplete and the two hardest —
> verifiable parental consent and the retention job — are not implemented at all.

## What "the gate" is, mechanically

Three independent switches, all currently shut. All three must open, and the first one is the human
one.

| # | Switch | Where | Current | Opens when |
| --- | --- | --- | --- | --- |
| 1 | `compliance/signoff.md` containing `counsel sign-off: YYYY-MM-DD` | this folder | **absent** | A human records a real counsel review. **An agent must never create this file.** |
| 2 | `UNDER13_GATE=1` env, or `compliance/under13-gate.txt` reading `open` | deploy config | closed | `check-compliance-gate.mjs` passes, which requires switch 1 |
| 3 | `app_settings.under13_gate` = `true` | database | seeded `'false'::jsonb` | An operator runs `setAppSetting`; no request path can write it |

`lib/tutor/settings.ts` `getAppSetting` reads a missing or malformed row as **false** — fail-closed by
construction. `resolveLearnerStatus` in `lib/tutor/accounts/consents.ts` then returns `locked` for any
`child` profile while switch 3 is shut, and a locked profile cannot start a session.

**"Child" means under 13, which includes the 9–12 band.** `kindForBand` in
`lib/tutor/accounts/learners.ts` classifies both `4-8` and `9-12` as `child`. Spec D4's "launch bands:
9–12, 13–17, adult" reads as though 9–12 launches at Gate 1; it cannot. Gate 1 is 13–17 and adults
only.

---

## The fourteen items

### 1. Mixed-audience posture — **partly done**

- Neutral age screen for self-signup: `lib/tutor/accounts/auth-flows.ts` requires
  `ageBandForBirthYear(...) === 'adult'` for a self-signup, birth year only, no nudging. ✅
- Parent-entered birth year on learner profiles: `lib/tutor/accounts/learners.ts`. ✅
- Marketing stays teen/parent-facing: a design discipline, not a code check. Not audited. ⚠️
- **Age banding is wrong at the boundary.** `ageBandForBirthYear` computes
  `year - birthYear`, so a 12-year-old born late in the year is treated as `13-17` for up to eleven
  months and routed around this entire gate. ❌ **Blocking.** See `open-questions.md` Q7.

### 2. Direct notice + online notice — **drafted, not publishable**

- Direct notice drafted: `compliance/parent-direct-notice.md`. ⚠️ Unreviewed; operator identity
  missing; the consent-method sentence describes something not built.
- Online notice drafted and live at `/legal/privacy`. ⚠️ Unreviewed, and currently contains
  statements the code contradicts (retention, TTS vendor, camera in the present tense).
- Every third-party recipient named: ❌ the list is env-driven (Q5) and the published TTS name is
  wrong.
- Internal-operations use of persistent identifiers stated: ✅ in both drafts.
- The audio statement: ✅ drafted; ❌ unverified at the provider (Q4) and falsified by
  `/api/transcription` (Q3).

### 3. Verifiable parental consent — **not implemented** ❌ **Blocking**

- Consent table exists and is correct in shape: `consents {method, notice_version, policy_version,
  camera, granted_at, revoked_at, evidence_ref}`. ✅
- Affirmative checkbox tied to the notice version: ✅ `recordConsent` rejects a record with no notice
  or policy version.
- **Card transaction with notification to the account holder: ❌ does not exist.**
  `validate.ts` allows `checkbox_card`, but `components/tutor/parent/consent.tsx:243` hard-codes
  `method: 'checkbox'`. No Stripe step, and `evidence_ref` carries the HTTP request id.
- Revocable from settings, revoking freezes the profile: ✅ `revokeConsent`, and
  `resolveLearnerStatus` keeps a frozen profile frozen until a new consent is granted.
- Camera named separately on the record: ✅ `consents.camera`, and `recordConsent` refuses a camera
  consent while `camera_sensing_enabled` is shut.
- Counsel confirms whether a $0 authorisation suffices: ❌ Q6.

### 4. Parental rights, self-serve — **partly done**

| Right | Code | Status |
| --- | --- | --- |
| Review transcripts | `lib/tutor/report/transcripts.ts`, `components/tutor/parent/transcripts.tsx` | ✅ |
| Export | `lib/tutor/accounts/export.ts` | ❌ **incomplete** — omits `coursework`, `learner_profiles`, `attention_stats`, `recovery_events`, `flags` |
| Delete | `requestLearnerDeletion` / `requestAccountDeletion` — freezes immediately | ✅ filing; ❌ completing (item 5) |
| Refuse further collection | `revokeConsent` | ✅ |
| A support path | `SUPPORT_EMAIL` on the welcome page | ⚠️ one env var, no published address, no email capability |

### 5. Written, published retention policy — **not implemented** ❌ **Blocking**

- Written: `compliance/retention-policy.md`. ✅ (draft)
- Published: partly, in `/legal/privacy` §7. ⚠️
- **Implemented: no.** `runDeletionJob` handles only explicit deletion requests; there is no
  inactivity-based deletion anywhere, and `RETENTION_MONTHS_AFTER_LAST_ACTIVITY = 12` is a copy
  constant with no job behind it. ❌
- **The job is never invoked.** No route, no script, no cron; `vercel.json` has no `crons`. ❌
- The 30-day constant is a floor while the published text says a ceiling. ❌
- Audio never retained: ✅ verified in our code, ❌ unverified at the vendor.

### 6. No third-party disclosure — **holds**

No disclosure beyond service providers, and no bundled consent. ✅ If it ever changes it needs its
own separate opt-in.

### 7. Vendor / service-provider review — **not started** ❌ **Blocking**

`compliance/vendor-data-flow.md` maps every recipient. **Every row is unverified**: no terms read, no
DPA executed, no confirmation that any provider permits minors' data or refrains from training on
inputs. Spec §11.2 says this is week-1 work; it has not happened. Additionally, no email provider
exists at all (Q11).

### 8. No behavioural advertising, no ad SDKs, no cross-site tracking — **done** ✅

- `check-compliance-gate.mjs` scans `app/(learner)`, `app/(parent)`, `components/tutor` and
  `lib/tutor` for known tracker hosts on every run — currently clean across 259 product files.
- PostHog is first-party with recording, surveys, autocapture, heatmaps, dead clicks, exception
  capture and external script loading all off; `ip: false`; `respect_dnt: true`; **in-memory
  persistence for every non-adult band** (`lib/tutor/analytics/client-config.ts`).
- Sentry has no SDK — a hand-built envelope with no breadcrumbs, no request bodies, no replay
  (`lib/tutor/errors/sentry.ts`), and content scrubbed before send (`lib/tutor/errors/scrub.ts`).

### 9. Written security program — **missing** ❌ **Blocking**

`compliance/security-program.md` does not exist. The privacy draft's §10 is a summary of intent, not
a program. Needed: encryption at rest and in transit, least-privilege access, key rotation, incident
response, vendor breach clauses. Some of the substance is real and testable already — tenant
isolation on every query, server-only provider keys, scrubbed error reports — but it has not been
written down.

### 10. Kid-safe model policy — **partly done**

- Band-specific system prompts, provider safety settings, blocklists, escalation rules: in
  `lib/tutor/prompts` and `lib/tutor/safety`. ✅ (not audited by this pack)
- AI disclosure: ✅ `/legal/ai` and the persistent session label.
- No personal-information elicitation: ✅ in the prompt rules.
- **9–12 red-team set passes: ❌ no results recorded in `compliance/red-team/`.**

### 11. Records kept in `compliance/` — **partly done**

Present: the eight drafts in this folder. Missing: `signoff.md`, `security-program.md`, `red-team/`,
`vendor-reviews/`, `policy-versions/`.

### 12. Camera and face data posture — **not applicable yet, and that is the right state**

There is no camera. No `getUserMedia` with a video constraint anywhere in the product (the only
microphone call is `lib/tutor/voice/recorder.ts`), no `@mediapipe/tasks-vision` dependency,
`camera_sensing_enabled` seeded `false`, and `recordConsent` refuses a camera consent while it is
shut. The `attention_stats` / `recovery_events` tables hold only counts, and
`app/(learner)/api/tutor/attention/route.ts` folds samples into counts on arrival and drops them —
there is no table for a sample.

The invariant that will guard a future build already exists in
`tests/invariants/no-camera-egress.test.ts` (per `lib/tutor/presence/README.md`): it fails if any file
outside `lib/tutor/presence` or `components/tutor/presence` opens a camera, and fails if a file in
those roots that opens a camera also makes a network call.

**Do not write camera policy for a camera that does not exist.** The conditions for a future build
are in `privacy-policy.md` §4, and the review to ask counsel for is `open-questions.md` Q17.

### 13. Attention data is not engagement data — **holds by construction**

The ladder returns to the lesson, not to a reward; sessions end at their scheduled length regardless
of attention; the parent can disable individual rungs (`parent_settings.recoveryStepsDisabled`);
nothing notifies the child. No re-engagement path exists in the code. ✅

### 14. Safe-harbour certification — **deferred by decision**

Spec §11.2 item 14 defers kidSAFE / ESRB until revenue justifies it. Re-raised as `open-questions.md`
Q19.

---

## What actually blocks the gate, shortest path

1. **Q1** — operator identity, address, telephone, email. Everything else is downstream.
2. **Q7 / item 1** — fix age banding. This is a live exposure *today*, not only at the gate.
3. **Q3** — authenticate or strip `/api/transcription`.
4. **Item 3 / Q6** — build verifiable parental consent end to end.
5. **Item 5** — implement inactivity deletion, wire the cron, reconcile the 30-day semantics.
6. **Item 4** — complete the export.
7. **Item 7 / Q11** — do the vendor review; choose an email provider.
8. **Item 9** — write the security program.
9. **Item 10** — run and record the 9–12 red-team set.
10. **Q2** — jurisdictions, so the notices can be finished.
11. Counsel review of every document in this folder.
12. A human writes `compliance/signoff.md`.
13. Only then: `UNDER13_GATE=1`, then `app_settings.under13_gate = true`.

## Verification command

```
node .claude/skills/minors-privacy/scripts/check-compliance-gate.mjs
```

Run it with `UNDER13_GATE=1` before any attempt to open the gate. It must exit 0. Today:

```
$ node .claude/skills/minors-privacy/scripts/check-compliance-gate.mjs
check-compliance-gate: gate closed; scanned 259 product files for tracker hosts
exit=0

$ UNDER13_GATE=1 node .claude/skills/minors-privacy/scripts/check-compliance-gate.mjs
check-compliance-gate: gate requested; scanned 259 product files for tracker hosts
  UNDER13_GATE requested but compliance/signoff.md does not exist
exit=1
```

The second result is the correct and intended behaviour: the gate refuses to open without a recorded
counsel sign-off. It is not a failure to fix.
