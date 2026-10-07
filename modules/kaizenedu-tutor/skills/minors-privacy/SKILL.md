---
name: minors-privacy
description: The rules for any code, copy, vendor, or data flow that touches a learner under 18 — COPPA as amended (compliance date 2026-04-22), Texas SCOPE, the biometric posture for the camera, consent, notices, retention, deletion, analytics, and the compliance/ folder. Load it when you build or change learner profiles, consent, the under-13 gate, parental rights, transcripts, retention or deletion jobs, the camera or audio paths, analytics or error reporting, a vendor integration, any policy or notice text, or anything under compliance/.
---

# Minors' privacy

Spec: D4, D5, D11, D16, §5.3 (audio never persisted), §5.6, §8.5, §11.2 (the under-13 gate checklist), §11.3, R5, R10, R16, R29. Constants: `kaizen.config.ts` `BANDS`, `ageBandForBirthYear`. Verify-before-relying warning: the primary legal texts could not be fetched from the Phase 0 environment; the section numbers below come from the lead seat's knowledge of the amended Rule and are marked UNVERIFIED until a seat with web access checks them against eCFR 16 CFR Part 312 and the 2025 Federal Register final rule, and counsel confirms. `references/coppa-checklist.md` lists what to verify and where.

## Non-negotiables in code

1. **Minors' plumbing for every learner under 18** (D11): consent records, review, export, delete, retention, and revoke exist for all minor profiles, not only under-13.
2. **An under-13 profile cannot start a session until a consent record exists** (R16). Profiles are creatable but `locked` with a plain "coming soon" message and no child data collected until `UNDER13_GATE=1`, which `.claude/skills/minors-privacy/scripts/check-compliance-gate.mjs` refuses unless `compliance/signoff.md` records counsel sign-off.
3. **Audio is never persisted** (§5.3): it streams to transcription and is discarded; only the transcript is stored; no voice identification or biometrics. Invariant (b).
4. **Camera data never leaves the browser** (D16): no frame, landmark, embedding, or template is transmitted or stored anywhere; the server sees a coarse state and session aggregates. Invariant (c). Counsel reviews the camera posture against the amended COPPA biometric definition, Texas CUBI, and Illinois BIPA before the toggle is exposed to any minor, and again before default-on for 4–8.
5. **No behavioural advertising, ad SDKs, or cross-site tracking on any learner surface** (§11.2 item 8): first-party PostHog only, no session recordings, no autocapture, no surveys; Sentry with replay off and content scrubbed. The gate script scans product code for known tracker hosts.
6. **Logs and analytics carry ids, never transcripts, names, or media** (CLAUDE.md).
7. **Attention data is not engagement data** (§11.2 item 13): never used to lengthen sessions, trigger notifications to the child, or build re-engagement campaigns.
8. **Nothing in `compliance/` is edited by an agent without a human in the PR.** Policies, notices, and consent language ship only after counsel review is recorded there.
9. **Ask before** changing any safety prompt, retention window, pricing, or gate date (CLAUDE.md).

## The under-13 gate (spec §11.2, R16) — every line done, then counsel sign-off

1. Mixed-audience posture: neutral age screen for self-signup (birth year, no nudging); parent-entered birth year on learner profiles; marketing stays teen/parent-facing.
2. Direct notice to the parent before consent; online privacy policy listing categories collected, every third-party recipient by name (each AI, TTS, ASR, analytics, email, storage vendor), internal-operations use of persistent identifiers, and the audio statement (voice collected solely to respond to the learner's request, not used for any other purpose, deleted immediately).
3. Verifiable parental consent: affirmative checkbox tied to the notice version, then a card transaction with transaction notification to the account holder. Store `consents {learner_id, method, notice_version, policy_version, granted_at, revoked_at, evidence_ref}`. Revocable from settings; revoking freezes the profile. Counsel confirms whether a $0 authorization satisfies the method; assume it does not (spec §9).
4. Parental rights, self-serve: review transcripts and data, export, delete, refuse further collection; plus a support path.
5. Written, published retention policy: transcripts and model data kept while the profile is active and for a fixed window after (proposal 12 months after last activity), then deleted; audio never retained; deletion on request within the window.
6. No third-party disclosure. If ever needed, its own separate opt-in consent, never bundled.
7. Vendor review for every LLM, TTS, ASR, analytics, email, and storage vendor: terms permit minors' data, no training on inputs, confidentiality and use limited to our purposes, data-processing terms in place; the data-flow document written; any failing vendor swapped before the gate. Do this in week 1.
8. First-party analytics only (above).
9. Written security program: encryption at rest and in transit, least-privilege access, key rotation, incident response, vendor breach clauses.
10. Kid-safe model policy: band-specific prompts, provider safety settings, blocklists, escalation rules, AI disclosure, no personal-information elicitation; the 9–12 red-team set passes.
11. Records kept in `compliance/`: consent records, policy versions, vendor review, red-team results, counsel sign-off.
12. Camera and face data posture (above) in the notice; the consent flow names the camera separately; visible indicator; parent can disable at any time.
13. Attention data is not engagement data.
14. Later: COPPA safe-harbor certification (kidSAFE, ESRB) once revenue justifies it.

## Data model rules (spec §8.5)

`learners {account_id, display_name, birth_year, age_band, status: active | locked | frozen}`; `consents`; `deletion_requests`; `flags`; `attention_stats` and `recovery_events` aggregates only; `evidence_events` append-only. No audio column anywhere. No frames, landmarks, embeddings, or templates in the DB, object storage, logs, analytics, or error reports (Sentry scrubbing verified by test). Every table carries `account_id`; row-level security is the second fence.

## Copy rules for notices and UI

Say what is collected, from whom, why, who receives it, how long it is kept, and how to review, export, delete, or revoke, in plain sentences. Name the camera and the microphone separately. Never bundle a marketing or third-party consent with the primary one. No dark patterns near consent or cancellation; cancellation is one click in the portal.

## Texas and federal drift (spec §11.3)

Texas SCOPE adds obligations for known minors under 18 (parental tools, data limits); the parent-owned account model covers most of it; counsel confirms the rest before beta. The House-passed KIDS Act (COPPA 2.0 provisions, teen protections through 17, a "should-have-known" standard, AI-chatbot safety provisions) is not law; D11 builds toward it. Re-check federal status monthly and record it in `docs/DECISIONS.md`.
