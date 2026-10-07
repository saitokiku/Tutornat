# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Learners of **any age** across **open learning topics**. Entry asks for a local nickname, then a
self-reported age, then a freely typed or selected learning goal — nothing else is required to start.
Age guides difficulty, vocabulary and pacing; it is not identity, consent, eligibility, an ability
assessment, or a signal of reading ability. Parents have an explicitly labeled view of relevant
learning activity and can contribute observations. The adult owner using invented learner work is the
current **release/testing boundary**, not the audience strategy: an adult-training or workforce niche
was explicitly rejected. No account system and no real-child readiness is established.

Explicitly in the intended audience: learners who **cannot rely on reading**. The product must be
enterable and usable through visuals, spoken guidance and direct manipulation. Reach is a design and
testing goal — low-literacy efficacy and accessibility are unverified and require real-user
validation (`FS-D05`–`FS-D07`), never inferred from age or from a short owner instruction.

## Product Purpose

Teach through a connected loop: nickname/age → open goal → **course or lesson** → explanation on a
visual/spoken/manipulable stage → learner turn → check/adapt → next step → growth record. A dashboard
and lessons catalogue surround that teaching surface. A task organizer, a generated worksheet, a
chatbot-only interface or a generic admin shell is not the product.

Priority order from the newest owner direction: **isolated tutor runtime, lessons catalogue and course
generation first; teaching theater as the primary interface; decorative shell polish must not delay
teaching capability.**

**Newest owner sequencing (2026-10-03T23:18Z) — implementation order, not a scope change.** Prove, in
order: **(1) actual generated lessons, each quality-checked; (2) contextual text chat showing the
tutor answers the real latest question and adapts; (3) useful diagrams and interactive
demonstrations through the existing OpenMAIC stage.** Voice comes **after** that core is proved and is
its own gate. Podcasts stay a roadmap toolkit item — not an immediate audio implementation and not an
acceptance blocker. This is a sequence, not a reversal: visual-first intuitive teaching, text as
backup, and the long-term low-literacy reach goal all remain the product, and a chatbot-only product
is still rejected. The tutor toolkit (stage visuals, interactives, artifacts — podcasts, flashcards,
study guides, worksheets) remains requested in full; `delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md`
records each item's real status with source paths, and
`delivery/fullstack/spec/CHAT_FIRST_ADDENDUM.md` records the sequencing additively without closing or
weakening any `FS-*` row.

**Doc corrections in force (2026-10-03T23:30Z)** — four deductions in the two specs above were
unsupported and are corrected; none of them is a product blocker:

1. **Diagrams are not a missing capability.** A pipeline already exists — `scene-generator.ts:1240`
   routes `widgetType === 'diagram'` to the `diagram-content` prompt, which generates connected SVG
   nodes/edges/`revealOrder` plus a required widget `postMessage` listener, rendered by the shared
   `InteractiveIframeHost`. Diagrams ship **as** `interactive` scenes; the absence of a dedicated React
   diagram component or mermaid/d3 is **not** absence of diagram support. What is open is **quality**:
   safety, factual accuracy and live visual behaviour are unverified. No new diagram engine is called
   for.
2. **Worksheets are not blocked.** The PBL planner guardrail
   (`tests/pbl/v2/planner-prompt.test.ts:47-51`, `planner-single-call-system.md:1-11`) is scoped to
   Project-Based Learning task **fragmentation** and **answer leakage**; it does not prohibit separate
   worksheet artifacts. Keep the guardrail and its tests unchanged; no permission decision is needed to
   build owner-requested worksheets. Podcast/voice stays later by **sequencing**, not prohibition — the
   `ReadAloudNote` audio disclaimer belongs to the new Kaizen surface, not upstream.
3. **Install/boot state.** The candidate is **installed and booted** on loopback `127.0.0.1:51206`;
   earlier "uninstalled, unbooted" wording is historical. The `*:51208` instance was stopped at 23:21Z
   for binding all interfaces with `accessCodeConfigured:false`
   (`delivery/fullstack/NATIVE_CORRECTION_DECISION_20261003T2321Z.md`). A boot is **not** a live
   capability pass: unauthorized reasoning-effort reduction and a `stage_used: null` / Chinese chat
   probe are open. No billing or subscription-429 root cause is claimed from `service_tier: standard`.
4. **Human review is required for public quality claims, not for every private draft.** A learner's or
   owner's privately generated draft may be saved and reopened without per-generation human approval;
   `markStageGenerationComplete` means generation finished, not human sign-off. Structural and
   educational checks stay robust and invalid generations are still rejected, but an automated
   educational review is an **uncertain signal, not proof**. Public publication, a ready badge or any
   quality claim still needs the appropriate recorded human evidence. Truthful attempts/assistance/
   growth records are not quality claims and are not suppressed pending efficacy evidence; **false
   mastery claims remain prohibited**. A language-learning lesson may legitimately contain the language
   being taught while explanations and UI stay in the requested EN/ES locale.

**Source base.** Reliable **human-authored / human-curated** material is the content base; the model
**selects and adapts** from it with provenance, rights and quality recorded. **No bulk ingestion is
authorized yet** — existing ingest surfaces are per-request and owner-scoped and must not be
repurposed into a corpus pipeline. Survey lane: `delivery/fullstack/research/oer-20261003/`.

## Operating Context

The pinned complete upstream OpenMAIC application is the **candidate foundation**, reused after
inspection rather than rebuilt piecemeal and rather than rewritten wholesale:

- `upstream/OpenMAIC/` — read-only pinned checkout, SHA `5312c2b4b4bcb2e7db07cacabcdac8bfddc827fa`.
  Never an edit target. MIT notices preserved.
- `classroom/` — the editable complete copy, same SHA, clean tree. Reuse its runtime, model-slot
  policy, director loop, scene/generation/storage layers. Nothing is integrated yet.
- `delivery/fullstack/UPSTREAM_MANIFEST.json` — read-only hashes for all 3352 tracked files.
- `lesson/` — the existing working vanilla-JS/Node lesson workspace. Retained and made compatible;
  its library and metadata/feedback contract carry forward. It is **not** the only surface — a
  vanilla-only delivery contradicts the owner's "entire stack" instruction.
- `snapshots/Kaizen-AI/web/` + `delivery/kaizen-interior-extract.md` — the pinned dashboard interior
  reference (paper/panel/ink/rose, existing type, 240px desktop rail, mobile navigation).
- `.local-data/lesson-library/` — the durable owner library: 8 files (3 `.json`, 3 `.rec`, 2 `.fb`),
  baselined in `delivery/fullstack/baseline-20261003T223400Z/manifest.json`.

Original repositories, prior frontends, tests, frozen evidence and checkpoints are preserved
unmodified. A verified access-controlled Vercel preview must precede any update to kaizenedu.net;
production is untouched.

## Capabilities and Constraints

**Requested capabilities.** Isolated tutor runtime; lessons catalogue; course generation with start
and continuation; age-aware open-topic teaching; a visual/spoken/direct-manipulation teaching theater
with text as backup; contextual lesson chat that answers the actual latest question first;
dashboard/library/continue/growth plus parent and student views; saved work with honest growth
records; per-lesson-version thumbs-up/down as **reported helpfulness**; extensive lesson metadata
(model provenance, measured timing, application instructions, coarse device type); opt-in two-way
voice; original animated teaching scenes with pause/replay; EN/ES.

**Three roles must function, not merely appear.** One learner-facing conversational voice (tutor); a
stage artist producing accurate topic-appropriate visuals coordinated with the current turn; a
background learning coach tracking actual attempts, assistance and evidenced misconceptions and
proposing next practice. They share versioned lesson state (`lessonId`/`turnId`/`revision`), take
bounded actions, support cancellation, and reject stale results. The coach is not a second
conversational voice and not surveillance: no emotion or attention inference, no engagement targets,
no hidden collection. The tutor never claims to be human or to have feelings and acknowledges
uncertainty.

**Theater over text.** More visuals must mean more explanatory value. Prose, bullet lists, headings
or text rasterised into an image do **not** count as a visual explanation. Generic repeated counter
dots, decorative density and arbitrary animation are rejected; the recorded 11-dot fallback for an
electron-shell request is a defect, not a near-miss. Every manipulation has a keyboard and
click-only alternative; every spoken output has a caption or transcript; every visual has an
accessible description.

**Model and routing policy.** Native Anthropic `claude-opus-5`, locked server-side on every reachable
route, at maximum supported reasoning, with **no fallback provider or model**. Client-supplied model,
provider, key, base URL or auth header is refused or dropped. Credentials are read only in server
process memory; no credential store is bundled or deployed. Raw provider errors never reach logs or
the client (a 429 is not "credits exhausted"). **Fable is suspended** until the owner re-enables it —
historical Fable names in preserved documents, fixtures and test assertions are records, not calls.
OpenRouter is TypeSafe Jev finite decisions only, never generation. No DeepSeek or other vendor.
Astra plans; native Opus implements, tests, reviews, acts as the test tutor, and covers necessary
writing while Fable is unavailable. Observed model identity is never inferred from a label: requested,
actual-request, configured and provider-reported identities stay distinct, and an unobserved value is
omitted or null — never backfilled.

**Privacy and data.** Nickname stays local and is excluded from provider prompts, tool arguments,
cache keys and operational logs. Learner conversations and typed answers never enter the shared
lesson library. Camera is OFF; no attention or affect signal is collected, scored or inferred. Camera
input is recorded as **future direction only** — if designed it requires an explicit visible signal,
opt-in consent, a stated retention boundary, a non-camera equivalent path and validation, and
attention is never treated as evidence of learning. Microphone and playback require explicit action,
visible state and a typed alternative; nothing activates automatically. Local-only transcription must
not silently switch to a cloud recognizer. The coarse `{browser, os, type}` device descriptor is
excluded from the cache key; no user-agent, IP, hardware ID, screen geometry or fingerprint is
collected. Generated content is never executed same-origin. Unreviewed upstream surfaces (upload, web
search, arbitrary tools, other vendors, cloud speech, public access) stay disabled.

**Three data concepts, kept apart.** (a) reusable content, sources and provenance — shareable;
(b) versioned teaching plan, objectives, prerequisites and applied instructions — shareable, versioned;
(c) the private learner record of attempts, assistance received, uncertainties and evidenced
misconceptions with proposed next practice — **never shareable**. These reuse the existing stores with
explicit boundaries; **no new database infrastructure is introduced.** Mapping to actual tables and
stores: `delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md` §3.

**Honesty.** Never fabricate model responses, growth, device success, accounts, integrations or
efficacy. Feedback is self-reported helpfulness, never learning or mastery; thumbs and completion are
not demonstrated understanding. Assistance and independent checks are shown distinctly. Generated
answer keys can be wrong. Saving may be browser-local, but lesson requests and submitted work still
go to Anthropic, and both disclosures must be visible and consistent. A local filesystem archive does
not cover future multi-instance/serverless users; public auth, tenant isolation, retention and consent
remain separate unmet gates.

Implementation is **incomplete**. No part of the full-stack candidate is installed, booted or
integrated. Open defects and unexecuted gates are listed in `lesson/STATUS.md` and
`delivery/fullstack/spec/ACCEPTANCE_MATRIX.md`.

## Brand Commitments

Name: Kaizen. Preserve the earlier Kaizen dashboard's interior composition and tokens, not a new
generic AI dashboard — but shell fidelity never substitutes for working catalogue, course and theater
capability. The owner's governing taste rule: **nothing should look, sound or feel like AI slop.**
Original age-appropriate visual demonstrations, useful repetition and learner turns — not copied
entertainment characters, attention scoring, forced engagement, filler copy, invented progress
metrics, canned praise, or preschool styling for every age. Oboe's friction and chatbot feel are the
owner's assessment, not an established comparative finding; the intended distinction is a natural live
tutor and a useful interactive stage inside a real dashboard.

## Evidence on Hand

- **Acceptance matrix (controlling, authored before implementation):**
  `delivery/fullstack/spec/ACCEPTANCE_MATRIX.md`, with executable `static-gate.mjs` and
  `runtime-gate.mjs` in the same directory.
- **Retained open gate:** `delivery/verification/opus-cache-spec-20261003T192837Z/SPEC.md`
  Group E (E1–E14), live-provider + durable-archive. Still **UNEXECUTED**; metadata unit tests do
  not replace it.
- **Wire contract:** `delivery/LESSON_METADATA_CONTRACT.md`.
- **Baseline:** `delivery/fullstack/baseline-20261003T223400Z/manifest.json` — 8 library files,
  49 lesson source/test files.
- **Restored historical preview:** `http://127.0.0.1:51206/`, PID 60528, serving the frozen
  `delivery/checkpoints/lesson-metadata-candidate-20261003T202130Z/source`. Coordinator readback
  `delivery/fullstack/restored-preview-20261003/readback.json`: health 200, configured Opus, served
  `app.mjs`/`core.mjs`/`styles.css` matching the frozen source, all 8 original library hashes
  unchanged. This is a **restored historical preview with no new generation acceptance** — not
  evidence for any current gate.
- **Open reproduced defects:** U1 (selected thumb lost on reload) and M2 (configured identity
  impersonating requested). A third probe failure, P7b, was the reviewer's own invalid regex matching
  legitimate "provenance" copy — a harness defect, not an application defect.
- Prior passing synthetic suites do not establish live-provider, microphone, device or deployment
  behaviour. Vercel authentication and domain ownership were read back; production replacement has
  not been performed.

## Product Principles

1. Working teaching capability — catalogue, course, theater — before shell polish or platform features.
2. Reuse the pinned upstream runtime, the existing lesson engine, browser-native controls and
   installed dependencies before writing anything new.
3. Visual, spoken and manipulable explanation is the primary channel; text is the backup, never the
   workload.
4. Make loading, failure, persistence and assistance understandable.
5. Ground growth in actual activity without implying measured mastery.
6. Preserve learner control, privacy, and accessible non-drag/non-voice/typed alternatives.
7. Report exact unresolved gates instead of inventing results.

## Accessibility & Inclusion

Keyboard-operable controls with visible focus; semantic labels; readable EN/ES error and empty states;
reduced-motion support; pause/replay; mobile use down to 320px. Non-text affordances (icon, image,
spoken label) accompany — never replace — text labels on catalogue entry, course goal selection, start
and continue, so those paths do not silently require fluent reading. Every direct manipulation has a
keyboard and click-only equivalent; every voice action has a typed equivalent; every spoken output has
a caption or transcript; every visual has an accessible description. Real assistive-technology,
real-device speech and **real low-literacy learner validation remain separate, currently unmet
release evidence.**
