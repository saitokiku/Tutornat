# Kaizen-AI into KaizenEdu: the integration plan

**Status:** draft for Manny's review, 2026-09-05. Nothing in this document has been built. It is the read of both repositories and the plan that read produced.
**Superseded in part, same day:** Manny's decisions are recorded in `docs/MVP-REFERENCE.md`, which is the contract for the next build run. That file withdraws this plan's phase order and its human-loop section (§3.4): no human tutors, the funnel first, the record grows in the back. The port list (§3) and the gotchas (§5) here remain the reference for anything that is carried over.
**Superseded again, 2026-09-30 (D35):** the product is now a free tutor with no account for any subject and any level, and the consolidation of all four repositories is recorded in `docs/CONSOLIDATION.md`. That record replaces the phases in §4 and the funnel-and-billing assumptions in §2 and §7 (items 1 to 9 there are answered or moot; pricing is off the public surface). What still holds here: the file-by-file port list in §3.1, §3.2 and §3.5 as the map of Kaizen-AI's engine, intake and proof code, and every gotcha in §5. Read `docs/CONSOLIDATION.md` §4 for the ranked list of what is still worth porting and §6 for the order.
**Scope:** what in `saitokiku/Kaizen-AI` is worth carrying into `saitokiku/KaizenEdu`, in what order, and what to leave behind. KaizenEdu is the product being sold first; this plan never makes it less sellable to make it bigger.
**Precedence:** `docs/SPEC.md` (D1 to D16) and `docs/DECISIONS.md` (D17 to D26) stand. Where this plan proposes changing one, it says so in section 7 and waits for a yes.

---

## 0. The answer in one paragraph

KaizenEdu already has the thing that is hard to build and easy to admire: a voice-first tutor with a face, a whiteboard that draws while it talks, a session state machine, parent-owned accounts with consent plumbing, fail-closed billing and cost guards, and an invariant suite in CI. What it does not have is the thing a parent is actually paying for and the thing a buyer of the business will ask to see: a **record of learning that cannot flatter itself**, a **planner that knows the child's real classes**, **communication that runs on that record**, and **open loops to humans** when the AI is not enough. Kaizen-AI has all four, built and adversarially reviewed, wrapped in a club business we are not selling. The plan is to lift the engine, the intake, the parent communications, the human loop and the claims discipline out of Kaizen-AI, translate them into KaizenEdu's TypeScript and Postgres, and let OpenMAIC's lesson generator become a reviewed, offline "Lesson mode" that feeds the same record. The club, the seats, the cohorts, the marketplace and the video rooms stay behind.

---

## 1. What each repository is today

### 1.1 KaizenEdu (Natural Tutor), the product

Built on OpenMAIC v1.0.0 (`6334e9a`, MIT), product code isolated under `lib/tutor/`, `components/tutor/`, `app/(learner)/`, `app/(parent)/`, gated by `TUTOR_MODE`. About 33,900 lines of product code across those paths; 33 product and invariant test files; 385 tests passing at the last log line.

**What works, verified in code.**

| Area | State |
| --- | --- |
| Voice loop (`lib/tutor/voice`, 2,454 lines) | VAD, push-to-talk, streaming sentence TTS, Web Audio queue with 20 ms fade barge-in, iOS unlock, text fallback, idempotent retries. The model hop is measured (674 ms p50 first token on `gemini-3-flash-preview` with thinking off); TTS and ASR hops are still unmeasured because the build sandbox cannot reach OpenAI. |
| Turn engine (`lib/tutor/turn`, 2,269 lines) | One streamed model call per utterance; inline tag grammar `[[wb]]`, `[[check]]`, `[[hint]]`, `[[reaction]]`; whiteboard actions validated and clamped before they reach a frame; safety pre-filter that answers a crisis without a model call; per-session ceiling and per-learner daily cap enforced before every call; `clientTurnId` replay. |
| Session loop (`lib/tutor/session`) | GREET, INTAKE, DIAGNOSE (binary search over the 12-skill graph, at most 4 items), WORK, CHECK, WRAP, one soft continue; coach mode counters in state, not only in the prompt. |
| Student model (`lib/tutor/model`) | Per-skill EMA estimate, `mastered` at 0.8 over 4 items and 2 sessions, `confirmed` only by an unassisted check at least 24 h later; misconception tags open on distractors and resolve after 3 clean items; `evidence_events` append-only by trigger. |
| Accounts and parent app | Email and password accounts, teen profiles under a parent, neutral age screen, under-13 profiles created locked, consent records, transcripts, export and delete with a retention job, parent settings, parent report with the "generated" label, staff allowlist. |
| Billing and guards | Stripe Checkout, Portal, signature-verified webhook with idempotency, minute metering, `billing_enabled` fail-closed, spend alarm that flips the kill switch. |
| Presence (`components/tutor/avatar`, `lib/tutor/presence`) | Abstract luminous presence as the default, SVG character behind a flag, Rive seam behind `NEXT_PUBLIC_RIVE_AVATAR_SRC`; backchannel, silence check-in, non-camera attention sampling and the recovery ladder as pure functions with tests. |
| Prompts | 17 prompt files: persona, four bands, coach, safety, safety-9-12, crisis, disclosure, whiteboard grammar, checks, diagnose, wrap, profile, extract. A prompt linter in the `tutor-loop` skill. |
| Compliance | A full draft pack under `compliance/` (privacy policy, direct notice, retention, vendor data flow, terms, AI disclosure, launch gate checklist, open questions), unreviewed by counsel, with a gate script that refuses `UNDER13_GATE=1` without a sign-off file. |
| CI | Five invariants as tests (cross-tenant, no audio persisted, no camera egress, cost ceiling, no client keys), a canary-secret build and bundle scan, skill validation. |

**What is missing or empty, and matters for this plan.**

- **The item bank has zero items.** `eval/item-bank/` is a 2,600-line pipeline that has never produced a bank because every reachable model refused (no Anthropic credit, Gemini free-tier quota). Every check today is tutor-authored on the fly, which means the "confirmed" tier is being granted on items nobody reviewed.
- **The skill graph is 12 fractions skills.** Anything outside F1 to F12 is tracked as coursework text only; there is no record of it.
- **`evidence_events` is a JSONB payload, not a ledger.** It has `type` and `assisted` but no `verified_by`, no stored weight, no `context_tag`, no typed column for the item, no correction pointer. It can prove that something happened; it cannot be replayed into a mastery number.
- **No human loop.** No handoff route, no queue, no way for a person to write evidence, no safety review queue with an SLA. The tutor ends a crisis session and files a flag; nobody is paged.
- **No parent communication outside the app.** No Resend, no weekly email, no notification on pause or crisis.
- **No planner.** Coursework is a flat list of problems; the product does not know the child's classes, due dates or grades.
- **No operator console** (R21), no `scripts/metrics-report.ts` (the weekly numbers the build prompt requires), no claims ledger for the landing and legal copy.
- **The evals referenced by `package.json` do not exist.** `eval:persona` and `eval:red-team` point at `eval/persona/` and `eval/red-team/`, which are not in the tree. `eval/orchestration`, `eval/outline-language`, `eval/pbl-v2-planner` and `eval/whiteboard-layout` are upstream's.
- **Lesson mode (R17) is not started.** The upstream generation pipeline is present but nothing product-side reads it.
- **One documented tenancy hole is still open.** `lib/persistence/owner-bound-document-store.ts` exempts reads from the owner check, pinned as `it.fails` in the cross-tenant invariant since Phase 0 (auth-21 follow-up). Product tables do not use that store, but the fix is one line and the test flips to a hard pass.

### 1.2 Kaizen-AI, the club with an engine inside

A Next.js JavaScript app (`web/`, about 47,000 lines) plus 38 Supabase migrations, live at kaizenedu.net until KaizenEdu took the domain. Its business (`docs/STRATEGY.md` v0.2) is an in-person Austin club selling a $550 standing seat, with the AI free. That business is not what we are selling, and most of the code serves it: cohorts, rooms, series, occupancy, waitlists, Daily video, Stripe Connect plans, tutor payouts, the Program Director's console, the founder's funnel board. **None of that ports.**

What does port is the part Kaizen-AI's own strategy calls the product: **the trellis**. `web/lib/engine/` is 2,969 lines of pure, tested, adversarially reviewed code (`docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md`: 40 reviewer agents, 18 candidate findings, 9 survived and 3 were fixed) that makes one claim true: **a skill counts only on unassisted, verified, delayed, repeated evidence.** Around it sit the pieces that make a record useful: the knowledge-component library with prerequisite and confusable edges, a topic-to-KC mapper, a misconception library with elaborated feedback, deterministic answer verification with no model in the confirming path, adaptive placement, a hint ladder that charges credit, a cost governor, a parent summary that reads only confirmed mastery, a portable transcript export, a human-observation write path, a handoff route, a safety screen with a runbook, and a claims matrix with CI teeth.

Two seeded banks exist: 8 verified middle-school math concepts with 32 hand-verified items and 6 misconceptions (`supabase/seed_kc.sql`), and 15 Algebra I concepts with 90 items that passed two independent solves and await human sign-off (`supabase/seed_kc_algebra1.sql`). Five of the eight verified concepts are the same skills as KaizenEdu's F3, F4, F8, F9 and F12.

### 1.3 OpenMAIC underneath both

KaizenEdu's engine. Its strengths for us: the whiteboard canvas and action DSL, the provider layer, the pi runtime, and the lesson generator (`packages/@openmaic/generation`: outline, then scenes of type `slide`, `quiz`, `interactive`, `pbl`) with the twenty-odd authoring skills under `skills/agent-runtime/` (`curriculum-planner`, `spiral-curriculum`, `deep-interactive`, `stage-design`, `feynman-learning`, `k12-core-literacy-planning`). Its weakness for us, as `docs/ARCHITECTURE-MAP.md` established: no voice turn, no tenancy, client-supplied credentials on 17 paths, and "interactive" scenes are model-authored HTML in an iframe, which is not something to show a minor without a review gate. KaizenEdu built the voice turn, scoped every product table by `account_id`, and closed the credential-taking routes under `TUTOR_MODE` (D23); the upstream document store's unscoped read is still open on non-product paths (the `it.fails` case in `tests/invariants/cross-tenant-isolation.test.ts`). The fourth is the constraint on Lesson mode.

---

## 2. The product we are assembling

Manny's brief, restated as seven jobs. Each maps to a source.

| Job | What it means concretely | Comes from |
| --- | --- | --- |
| **Teach well** | The live voice session with a face and a board, coach mode, re-teach with a different representation, band register | KaizenEdu, as built |
| **Keep the record** | A mastery record that refuses to count assisted work; working versus confirmed; replayable from an append-only ledger; portable | Kaizen-AI engine |
| **Keep track** | The child's real classes, assignments, due dates and topics, mapped onto the record so "Chapter 7" and "equivalent fractions" are the same node | Kaizen-AI intake and `kcMap` |
| **Communicate** | A weekly parent email and an in-app report that lead with what was confirmed, name what moved this week, and say what is next; pause and crisis notifications | Kaizen-AI `familySummary`, `parentSummary`, `email.js`; KaizenEdu report |
| **Open loops to humans** | Ask for a person; a person can look at a brief that says which numbers are verified; a person can write confirming evidence; a safety queue with response times | Kaizen-AI `handoff`, `brief`, `observe`, `moderation`, safety runbook |
| **Close the loop** | Due checks outrank new material; assisted successes schedule an unassisted retry; help that is not fading raises a flag; anchors catch the engine grading its own homework | Kaizen-AI `policy`, `hints`, `calibration` |
| **Use AI everywhere it is cheap** | Photo intake (built), syllabus intake, generated weekly prose (labelled), reviewed lessons from a topic, adaptive placement, a curious mode | KaizenEdu extract; Kaizen-AI prompts; OpenMAIC generation |

The session shape does not change: sandbox (board), tutor (face, voice, chat), trellis (silent). The trellis gets real.

---

## 3. The port list

Verdicts: **PORT** (translate as is, JS to TS, Supabase client to `pg` queries), **ADAPT** (the idea and the tests, reshaped for KaizenEdu's schema), **SKIP** (club business, or already better in KaizenEdu). Phases are defined in section 4.

### 3.1 The record (the evidence engine)

| Kaizen-AI asset | What it is | Becomes in KaizenEdu | Verdict | Phase |
| --- | --- | --- | --- | --- |
| `web/lib/engine/types.js` | The mastery law as data: confirming kinds and verifiers, verifier weights, the assisted discount, `isConfirming`, `weightOf`, the activity ladder | `lib/tutor/engine/types.ts`, the one place the law lives; `contracts.ts` imports from it | PORT | 1 |
| `web/lib/engine/config.js` | Every pedagogical threshold in one deep-frozen, versioned, A/B-able policy object (4-of-5 across 2 contexts, 48 h delay, hint credit, independent share, gaming, dependency alarm, calibration) | `lib/tutor/engine/config.ts`; the numbers that currently sit in `kaizen.config.ts` `STUDENT_MODEL` move here or reference it | PORT | 1 |
| `web/lib/engine/pfa.js` | Performance Factors Analysis: working and confirmed estimates with recency decay, the k-of-n gate, freshness, confidence, dose slope | `lib/tutor/engine/pfa.ts` | PORT | 1 |
| `web/lib/engine/hlr.js` | Half-life regression: when a concept comes back, when a confirming check may be offered | `lib/tutor/engine/hlr.ts` | PORT | 1 |
| `web/lib/engine/elo.js` | Difficulty targeting and item selection with exposure control | `lib/tutor/engine/elo.ts` | PORT | 1 |
| `web/lib/engine/scheduler.js` | The seam: `estimate`, `schedule`, `pickItem`, `rate`, a `version` stamped on every estimate row so a bump replays the ledger | `lib/tutor/engine/scheduler.ts` | PORT | 1 |
| `web/lib/engine/ledger.js` | `appendEvidence`, `recomputeEstimates`, `replayLearner`, `readState`; weight stored at write time; `check_floor_at` honoured as a lower bound | `lib/tutor/engine/ledger.ts` over `getTutorDb()`; replaces `lib/tutor/model/evidence.ts` as the only writer | ADAPT | 1 |
| `web/lib/engine/policy.js` | `nextAction` (safety, caps, due checks, prerequisites, ladder), `reachableSet` (the growth tip), `detectGaming` | `lib/tutor/engine/policy.ts`; `graph/next-skill.ts` becomes a thin call to `reachableSet` | PORT | 1 |
| `web/lib/engine/verify/symbolic.js` + `web/lib/mathExpr.js` | Deterministic grading: mc, order, numeric (fractions, mixed numbers, percents, tolerance, named wrong values), symbolic (implicit multiplication, sample-point equivalence), cloze, short with required keywords; `publicItem` allowlist | `lib/tutor/engine/verify.ts`, `lib/tutor/engine/math-expr.ts`; supersedes `checks/grading.ts` (a strict subset) | PORT | 1 |
| `web/lib/engine/check.js` | Server-issued checks: items recorded before the learner sees them, one live attempt per concept, resume on reload, TTL, at least 2 surface contexts, exposure penalty, grading against the recorded list, predict-then-check calibration | `lib/tutor/engine/check.ts`; the delayed confirming check in `session/service.ts` and the check route use it | ADAPT | 1 |
| `web/lib/engine/hints.js` | The hint ladder (orient, teach the step, solution), credit per hint, bottom-out, isomorph scheduling, independent blocks | `lib/tutor/engine/hints.ts`; `[[hint]]` in the turn engine records the level, not only the fact | ADAPT | 1 |
| `web/lib/engine/placement.js` | Adaptive Elo placement, 10 to 15 items, stops on convergence, breadth-first across concepts, seeds working mastery and never confirms | `lib/tutor/engine/placement.ts`; the standalone placement for a new learner or a new subject. The in-session 4-item binary search stays for the fractions slice | PORT | 2 |
| `web/lib/engine/calibration.js` | Anchor gap (our confirmed mastery versus released external items), prediction gap, when to slip an anchor into a session | `lib/tutor/engine/calibration.ts` | PORT | 5 |
| `web/lib/engine/budget.js` | Monthly inference ceiling per plan, frontier-call caps, deterministic-rate telemetry, cost from reported tokens including cache reads | `lib/tutor/cost/monthly.ts` as a fourth guard beside the session ceiling, the daily cap and the global alarm | ADAPT | 5 |
| `web/lib/engine/session.js` | The practice loop: worked example, completion, independent, check; isomorphs due; gaming response; tier-0 content | `lib/tutor/engine/practice.ts` behind a "Practice" entry on `/learn` (text and board, no voice needed). This is the between-sessions loop the parent report needs | ADAPT | 2 |
| Migrations 0012, 0013, 0015, 0030, 0031, 0034, 0037 | `kc`, `kc_edge` (prerequisite and confusable), `kc_alias`, `kc_misconception`, `kc_item` with `answer_spec` server-only, `learner_kc`, typed `evidence`, `kc_estimate`, `check_attempt`, `item_attempt`, `learning_session`, `kc_content`, `anchor_item`, `kc_standard` (TEKS and CCSS with CASE URIs), `learner_focus`, the append-only trigger with `adjusts_evidence_id` | Additive statements in `lib/tutor/db/schema.ts`, `account_id` on every learner-scoped row. `evidence_events` stays for history; new writes go to `evidence` | ADAPT | 1 |
| `supabase/seed_kc.sql`, `seed_kc_algebra1.sql` | 8 verified concepts, 32 items, 6 misconceptions; 15 Algebra I concepts, 90 draft items | F1 to F12 seeded as `kc` rows with edges; the 5 overlapping concepts get the verified items immediately (converted to `kc_item` shape); Algebra I is the R22 second slice, still awaiting a human review | ADAPT | 1, then R22 |
| `web/test/engine.test.mjs`, `enginePolicy`, `verify`, `checkAttempts`, `masteryRecord`, `bankInvariants`, `draftBank`, `seedBank`, `mathExpr` | The tests that pin the law | `tests/tutor/engine/*.test.ts` on Vitest; the first assertion ported is "assisted evidence can never confirm mastery, however much of it there is" | PORT | 1 |
| `docs/ENGINE.md`, `docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md` | The law, the harmony loop, verifiability tiers, and the review record | `docs/ENGINE.md` in KaizenEdu, rewritten for this schema; the review kept verbatim as history | PORT | 1 |

**What changes for the learner and the parent.** The tutor keeps using the EMA estimate in session (it is cheap and it is what the prompt already reads). The word "confirmed" moves from "one unassisted check 24 h later" to "four of the last five unassisted, verified checks across two surface contexts, at least 48 h after instruction, with enough recent mass". That is stricter, it is the sentence Kaizen-AI's strategy sells, and it is the tightening D17 deferred. Section 7 asks for the yes.

### 3.2 Keep track

| Kaizen-AI asset | What it is | Becomes in KaizenEdu | Verdict | Phase |
| --- | --- | --- | --- | --- |
| `web/lib/prompts.js` `INTAKE_PROMPT`, `web/lib/server/intakeCore.js`, `app/api/intake/route.js` | Universal intake: a pasted syllabus, a brain dump, a photo, a PDF or a Word file becomes courses, topics, assignments with due dates, grade categories, and honest `notes` about every guess | Stage `tutor-intake` on `callLLM`; `POST /api/tutor/intake`; coursework v2 rows: `courses`, `assignments`, topics. The existing photo extract (`lib/tutor/extract`) stays as the single-problem path | ADAPT | 2 |
| `web/lib/server/kcMap.js` + `kc_alias` | Topic string to canonical concept: alias cache, one LLM adjudication per novel string, a local draft concept when nothing matches | `lib/tutor/engine/kc-map.ts`, stage `tutor-kc-map`; writes `learner_kc`. This is what lets "any homework" have a stable node while only reviewed banks can confirm it | PORT | 2 |
| `web/lib/grades.js`, `lib/intake.js` (`applyIntake`) | Course grade from weighted categories, GPA, the merge of an intake patch into courses and concepts | `lib/tutor/planner/*.ts`; grades are self-reported and labelled so on every surface | ADAPT | 2 |
| `app/api/engine/state/route.js` | The two-tier mastery map plus the growth tip plus the focus, shaped for a screen | `GET /api/tutor/progress` gains `growthTip`, `confirmed`, `working`, `checksDue`, `dependencyAlarms`; the parent report reads the same shape | ADAPT | 1 |
| `learner_focus` (0037) + the `focus` action on `/api/engine/session` | A parent or learner points the loop at one reachable concept; assignment, never assessment, `certifies: false` on the wire | `parent_settings` gains nothing; a `learner_focus` table and `PATCH /api/parent/focus`. This is Kaizen Home in one route: the parent sees everything, assigns anything, certifies nothing | PORT | 2 |
| `components/TodayView`, `CalendarView`, `GradesView` | The planner surfaces | Not ported as code (three generations of primitives, localStorage sync trap). Rebuilt small on `components/tutor/ui` as one "This week" panel on `/learn` and one "Classes" section on the parent report | SKIP code, ADAPT the questions | 2 |
| `lib/appState.js`, `lib/cloud.js` | The localStorage working copy and its last-write-wins sync | Never. KaizenEdu is server-authoritative and stays that way | SKIP | |

### 3.3 Communicate

| Kaizen-AI asset | What it is | Becomes in KaizenEdu | Verdict | Phase |
| --- | --- | --- | --- | --- |
| `web/lib/server/email.js` | Resend wrapper: `esc`, essential versus promotional kinds, opt-out suppression, List-Unsubscribe headers, domain-only logging, explicit not-configured state | `lib/tutor/email/*.ts`; R18 needs it; `RESEND_API_KEY` is already reserved in `README-KAIZEN.md` | PORT | 4 |
| `web/lib/server/familySummary.js` (`masteryLead`) | The parent's headline computed only from confirmed mastery; "moved this week" answered by replaying the ledger at both ends of the window; a `notTracked` state that never prints a confident zero | `lib/tutor/report/lead.ts`; the first sentence of the parent report and the weekly email | PORT | 4 |
| `web/lib/server/parentSummary.js` | The monthly email, idempotent through the ledger, skipped when nothing happened so parents keep opening real ones | `lib/tutor/email/weekly.ts` (weekly, per spec R18) plus a monthly roll-up; a cron route under `/api/tutor/cron` with `CRON_SECRET` | ADAPT | 4 |
| `app/api/reports/weekly/route.js` | Generated prose over a stats snapshot, stored | Stage `tutor-summary` already exists; the weekly narrative is generated from the server-computed lead, never from a client snapshot, and carries `GENERATED_LABEL` | ADAPT | 4 |
| `web/lib/server/tutoringEmails.js`, `billingEmails.js` | Booking and billing mail | Billing receipts only (Stripe sends its own); no booking mail | SKIP | |
| Pause-and-notify (`presence-43`), crisis flag | Exists as a flag row | The same email path: a parent is told within a minute when a session pauses on `away` or ends on a crisis, and a human is paged on a critical safety event | ADAPT | 4 |

### 3.4 Open loops to humans

| Kaizen-AI asset | What it is | Becomes in KaizenEdu | Verdict | Phase |
| --- | --- | --- | --- | --- |
| `app/api/handoff/route.js`, `human_handoff_requests`, the admin queue | "Send this to a person": course, concept, urgency, note, a transcript summary; rate-limited; admin mail; honest `delivered` flag | `POST /api/tutor/handoff`; a `handoffs` table; the "Ask for a person" button in the session and on the parent report; the queue on the operator console | PORT | 4 |
| `kc_estimate.human_recommended`, dose slope, consecutive unassisted failures | The dependency alarm: help that is not fading, or three unassisted misses, flags the concept for a human | Comes with the engine port; surfaces as "the tutor recommends a person on this" in the parent report and the operator queue | PORT | 1 |
| `app/api/tutoring/brief/route.js` | A brief for a human with two halves that are never blended: `verified` (the ledger) and `selfReported` (planner entries), with a provenance line the route writes itself | `lib/tutor/human/brief.ts`; read by whoever picks up a handoff (Manny at first, a hired tutor later) | ADAPT | 4 |
| `app/api/tutoring/observe/route.js`, `tutoring_session_kc`, `session_effect` | A human's per-concept rating (got it, shaky, not yet) written as confirming evidence, a 36 h post-session check floor, per-tutor effectiveness measured by the delayed check, misconception counting | `POST /api/tutor/observe` for a role `tutor` that does not exist yet; the parent can never call it. Ship the route and the role after the queue has a human in it | ADAPT | 4 |
| `web/lib/server/moderation.js`, `safety_events`, `docs/legal/SAFETY_RUNBOOK.md` | A deterministic pattern screen (self-harm, abuse, grooming and off-platform, sexual, violence) that records an event with a 280-character snippet, pages a human on critical, and a runbook with response times | KaizenEdu's `lib/tutor/safety/patterns.ts` already screens before the model. Port the recording, the paging and the runbook: a `safety_events` view over `flags`, `ALERT_WEBHOOK_URL` and email on critical, `docs/SAFETY-RUNBOOK.md` with the SLAs | ADAPT | 4 |
| `web/lib/server/tutorSafety.js` (`pullTutorFromMarket`) | Pulling a tutor and refunding students | Nothing to pull | SKIP | |
| `web/lib/prompts.js` `sittingClock`, `MINOR_AI_DISCLOSURE`, `MINOR_BREAK_REMINDER` | The known-minor duties: disclosure unasked at the start of a sitting, a break reminder every three hours of continuing interaction, sittings reconstructed from the ledger | `lib/tutor/session/sitting.ts` (pure) read at session creation: a 25-minute session cannot cross three hours alone, but three sessions in an evening can. The disclosure prompt already exists | PORT | 4 |
| The Program Director console, exit ratings, group briefs | Club operations | SKIP | |

### 3.5 Close the loop and prove it

| Kaizen-AI asset | What it is | Becomes in KaizenEdu | Verdict | Phase |
| --- | --- | --- | --- | --- |
| `app/api/admin/funnel/route.js` (`buildBoard`) | Stage-to-stage conversion with the denominator in words; zero-data states designed, not tolerated; missing tables reported as "not provisioned", never as zero | `scripts/metrics-report.ts` (the build prompt's Monday report) and the operator console's first screen. Columns per `release-checklist`: signups, activation, weekly active learners, sessions, minutes, paying accounts, MRR, growth, D7 and D14 retention, trial to paid, cost per session, gross margin, thumbs, mastery deltas, **verified mastery events per learner per week** | ADAPT | 5 |
| `app/api/account/export/route.js` (`buildMasteryRecord`) | `kaizen-mastery-record/v1`: confirmed concepts with their demonstrations, the standard of proof printed inside the file, the raw ledger labelled as observations, paged so it never truncates silently | The parent data export gains the record section; later the OB 3.0 shape from Kaizen-AI's strategy §4.4. This is the artefact a buyer of the business and a next teacher both read | PORT | 5 |
| `docs/CLAIMS_MATRIX.md`, `web/test/claims.test.mjs`, `legalMarkers.test.mjs`, `priceTruth.test.mjs` | Every public claim has a row with the code that makes it true; CI bans the false forms (background-checked, guaranteed grades, FERPA and HIPAA postures, the wrong entity name, the vacated click-to-cancel rule); un-cleared legal markers fail the build; prices are interpolated from one file | `docs/CLAIMS.md` plus `tests/invariants/claims.test.ts` scanning `components/tutor/marketing/**`, the legal pages and the email templates; `PLAN.priceCentsMonthly` becomes the only price literal. `check-copy.mjs` already bans the slop words; this adds the false claims | PORT | 5 |
| `evals/tutor/rubric.md`, `sample_cases.json` | A 6-dimension rubric (integrity, contract, diagnosis, context use, honesty, tone) and 10 behavioural cases | The missing `eval/persona` and `eval/red-team` runners in the `docs/TESTING.md` shape, seeded with these cases plus the 15 coach-mode cases spec §13 asks for | ADAPT | 5 |
| `docs/superpowers/plans/2026-08-21-anti-slop.md`, `specs/2026-08-22-one-system-rebuild.md` | The copy standard (one contrast per page, metaphors single-use, show the mechanism before the claim) and the "well-kept record" aesthetic (mono for every number, time and price) | Two paragraphs added to the `design-system` skill; no code | ADAPT | 5 |

### 3.6 OpenMAIC as Lesson mode

Not a port from Kaizen-AI, but Kaizen-AI's overhaul plan (Phase 7b) already made the right call for a minors-facing product and it transfers unchanged: **extract the pipeline, not the app.** Run `@openmaic/generation` as an offline job that emits scene JSON validated against a schema we own, anchored to `kc` ids, stored, reviewed, and played by the session shell. No LangGraph in the learner's bundle, no iframe of model-authored HTML for a minor, and the artefact is reviewable before a child sees it.

| Piece | Plan |
| --- | --- |
| Generator | `tools/lesson-gen/` (Node 22 job, server keys only) calling `@openmaic/generation` outline and scene builders with the `curriculum-planner` and `stage-design` skills as prompts; `spiral-curriculum` for multi-lesson units; `deep-interactive` only for the adult band until a review gate for interactive scenes exists |
| Schema | `lib/tutor/lessons/schema.ts`: a lesson is an ordered list of scenes of type `slide` (text, LaTeX, image), `board` (a script of validated `wb_*` actions with narration), `quiz` (items in `kc_item` shape); each scene names its `kc_id`; interactive scenes are rejected for bands under adult |
| Storage and review | `lessons` and `lesson_scenes` tables with `status` draft, verified, retired; the same promotion discipline as items (two solves, a human stamp); an operator page to preview and stamp |
| Playback | R17 "Teach me X": the session shell plays the lesson through the same face, voice and board, with the tutor narrating and pausing for the learner; the lesson's quizzes are graded by the engine as **assisted** evidence (a lesson is instruction); the delayed unassisted check still decides confirmation |
| Feed-forward | Lesson quiz items become candidates for the item-bank pipeline, so every reviewed lesson grows the check bank |

---

## 4. Phases

Each phase ends on evidence, not a date. Nothing here runs before the four operator items in `docs/DO-THIS-NEXT.md` (keys in Vercel, a funded model for the item bank, the real latency rows, counsel engaged); those unblock Gate 1 and this plan cannot substitute for them.

### Phase 1: the record

**Goal.** Kaizen-AI's engine runs under KaizenEdu with its tests green, and "confirmed" on the parent report is computed by it.

1. Add the engine tables to `lib/tutor/db/schema.ts` (additive, every learner row carries `account_id`, RLS-equivalent scoping in queries as today). Seed F1 to F12 into `kc` and `kc_edge`; add the confusable edges Kaizen-AI's seed already carries (F8 with F9, F4 with F12).
2. Port the pure modules in this order, each with its tests: `types`, `config`, `pfa`, `hlr`, `elo`, `scheduler`, `policy`, `hints`, `verify` with `math-expr`. No database yet.
3. Port `ledger` and `check` over `getTutorDb()`. Dual-write from `recordCheckOutcome`: the EMA row as today, plus a typed `evidence` row and a `recomputeEstimates` on that concept.
4. Convert the five overlapping verified concepts' items from `seed_kc.sql` into `kc_item`; wire `pickBankItem` to prefer `kc_item` and fall back to `check_items`.
5. Switch the confirming path: the delayed check becomes `issueCheck` and `gradeCheck` (recorded items, one live attempt, two contexts, dose zero). Tutor-authored `[[check]]` items grade as `practice` evidence, `assisted` when a hint preceded them, and never confirm.
6. `progress` and the parent report read `kc_estimate`; the growth tip replaces `selectNextSkill`; the dependency alarm surfaces as a sentence.
7. `docs/ENGINE.md` written for this repo; the adversarial review filed under `docs/reviews/`.

**Exit.** `tests/tutor/engine` green including the ported "assisted evidence can never confirm mastery" and the 12-fail-then-6-pass case from the review filed as a known open decision; `pnpm test:invariants` green; a learner's `confirmed` count on the report equals a replay of their ledger; the item bank pipeline's output imports into `kc_item` unchanged.

### Phase 2: keep track

**Goal.** The product knows the child's classes and can track any topic, while only reviewed banks confirm.

1. `tutor-intake` stage and route; `courses`, `assignments`; the planner panel on `/learn` ("this week"); the parent report's "Classes" section, labelled self-reported.
2. `kc-map` with `kc_alias`; every intake topic and every coursework upload maps to a `kc`, local when unmatched; `learner_kc` is the learner's own slice of the lattice.
3. `learner_focus` and the parent's assign action (Kaizen Home).
4. The practice loop (`engine/practice.ts`) as a text-and-board activity between sessions: worked example, completion, independent, isomorphs, hint ladder with credit. The tutor's `[[hint]]` tag records the level.
5. Adaptive placement (`engine/placement.ts`) for a new subject or a new learner outside the fractions slice.

**Exit.** A pasted syllabus becomes courses and assignments with honest guess notes; every topic has a `kc` id; a parent can point a child at a reachable concept and the next session opens on it; the practice loop writes assisted and unassisted evidence correctly under a test that tries to relabel one as the other.

### Phase 3: Lesson mode

**Goal.** "Teach me equivalent fractions" plays a reviewed lesson in the same session, and the lesson's quizzes feed the record.

1. `tools/lesson-gen` and the schema; generate one lesson per F skill; review and stamp them.
2. `lessons` tables and the operator preview page.
3. Playback in the session shell (R17), assisted evidence, the delayed check unchanged.
4. Quiz items into the item-bank pipeline.

**Exit.** Twelve reviewed lessons, one per skill, playable on desktop Chrome and a physical iPhone; no interactive scene reachable by a minor; a lesson's quiz result appears in the ledger as assisted and never moves `confirmed`.

### Phase 4: communication and the human loop

**Goal.** A parent hears from the product without opening it, and a person is in the loop where the AI is not enough.

1. Resend wrapper; weekly email from `masteryLead` with the generated label; monthly roll-up; pause and crisis notifications; cron route with `CRON_SECRET`.
2. Handoff route, `handoffs` table, the button in the session and on the report, the queue on the operator console; `human_recommended` in the report.
3. The brief with provenance; the `tutor` role and the observe route, dormant until a human exists.
4. Safety recording and paging; the runbook with SLAs; the sitting clock.

**Exit.** A weekly email arrives with a confirmed-only headline and no email when nothing happened; a handoff reaches Manny's inbox within a minute with a brief whose verified half is empty when nothing is verified; a critical safety event pages within a minute; the sitting clock reminds a minor at three hours in a test.

### Phase 5: proof and sale-readiness

**Goal.** The numbers a buyer asks for exist every Monday, and no public sentence is unsupported.

1. `scripts/metrics-report.ts` and the operator console's board; verified mastery events per learner per week as the lead metric.
2. `kaizen-mastery-record/v1` in the export.
3. Claims ledger and the CI scanner; legal markers; the entity name; prices interpolated.
4. `eval/persona`, `eval/coach-mode`, `eval/red-team` runners seeded from Kaizen-AI's cases; the pre-merge rule in `release-checklist` becomes enforceable.
5. The monthly cost governor per plan; calibration anchors (released NAEP and TIMSS items) on the confirmed concepts.

**Exit.** `docs/metrics/YYYY-WW.md` generated by the script for two consecutive weeks; the export validates against its own standard of proof; `claims.test.ts` green with at least the six Kaizen-AI bans; three eval runners with before and after results pasted in a PR.

### Presence, in parallel

Manny asked for natural sprites from Rive. The seam is built (`components/tutor/avatar/rive-rig.ts`, switched by `NEXT_PUBLIC_TUTOR_PRESENCE=rive` and `NEXT_PUBLIC_RIVE_AVATAR_SRC`). The decision recorded in `components/tutor/avatar/README.md` is that a procedurally drawn face reads as uncanny and an abstract presence ships by default; the character rig was tried twice and rejected by the owner. The way to a face is not more code: **commission a `.riv` character from an illustrator** with a state machine exposing exactly the `AvatarDriver` inputs (`state`, `mouth`, `gaze`, `expression`), drop it in behind the flag, and run the five-kid test (presence-45) before Gate 2. Word-timed visemes (R31) need ElevenLabs, the only candidate that returns timing. None of this touches the loop.

---

## 5. Things that will bite the port

Learned from Kaizen-AI's own review history; each one cost them a round.

- **Store the weight at write time.** `weightOf` is computed in `appendEvidence` and stored; `pfa.counts` prefers the stored value. Recomputing on read squares the assisted discount and silently suppresses every estimate.
- **`context_tag` must be `NOT NULL` on new items.** The two-contexts gate falls back to `item_id` when the tag is null, which manufactures fake diversity. Kaizen-AI's database permits what its tests forbid; ours should not.
- **One live check attempt per concept**, enforced by a partial unique index, and `issueCheck` resumes rather than mints. Without it a learner burst-issues attempts while the gate is open and banks a month of spaced checks in a sitting (the review's critical finding).
- **Never read `independentBlock` from the request.** It is decided at issue time and persisted on the attempt row. The client field was the review's second finding.
- **`check_floor_at` is a floor, not a value.** `recomputeEstimates` overwrites `next_check_at` from the ledger on every append; a deliberate post-session delay lives in the floor column and recompute honours it as a lower bound.
- **Failures are costless to the k-of-n gate today.** Twelve failing checks followed by six passes confirms. Filed, not fixed, in Kaizen-AI because it is a product decision; section 7 puts it to Manny with the review's option 3 (passes must span distinct days).
- **Generated prose reads legacy tables.** Kaizen-AI's `ENGINE.md` had to be narrowed after the review: the structured numbers are confirmed-only, the generated sentences beside them are not. KaizenEdu's `GENERATED_LABEL` rule already handles this; keep the prose and the numbers in separate fields on every wire shape.
- **`kc_estimate` is a cache.** Its `confirmed` is recomputed only when evidence arrives, while a replay applies recency decay. "Moved this week" therefore replays both ends of the window; comparing the cache against a decayed replay reports a dormant concept as news every week.
- **Placement evidence is `assisted: true`** by construction. A twelve-item adaptive probe says where to start, never what the learner can do unaided next week.
- **Supabase to `pg`.** Kaizen-AI code checks `{ data, error }` on every call because supabase-js resolves instead of rejecting; a naive port that drops the `error` check turns a failed read into a confident zero (their `family/summary` route documents exactly this bug). KaizenEdu's `db.query` throws, which is the safer default; keep it.
- **JavaScript to strict TypeScript, no `any`.** Every engine function takes and returns plain shapes; type them from `contracts.ts` once and let the compiler list the call sites.
- **The item schemas differ.** Kaizen-AI `kc_item` kinds are `mc`, `numeric`, `symbolic`, `short`, `order`, `cloze` with an `answer_spec`; KaizenEdu `check_items` types are `single`, `multiple`, `numeric`, `short` with `options` and `answer`. The engine's shape is the superset; write the converter once in the item-bank package step and keep the pipeline's authoring schema as is.
- **Prompt caching.** Kaizen-AI calls Anthropic directly with `cache_control` on system prompts at least 2,048 characters long, self-disabling on rejection. KaizenEdu calls every model through `callLLM` on the AI SDK; the live-turn system prompt is well over that size and is rebuilt every turn. Check whether the AI SDK path caches the prefix; if not, that is the single cheapest cost lever left.
- **Do not port the localStorage sync.** `CLAUDE.md` in Kaizen-AI names it as a known trap; KaizenEdu is server-authoritative and every fact the parent sees must stay that way.

---

## 6. Skills

### 6.1 Load these for the work above

Project skills in `.claude/skills/` (indexed in `CLAUDE.md`), plus the global skills that fit.

| Change | Load |
| --- | --- |
| Any engine or evidence file, the mastery law, the parent report's numbers | **`evidence-engine`** (new, section 6.2), then `tutor-loop` |
| Anything under `lib/tutor` that is not voice, presence, auth or cost | `tutor-loop` |
| Reusing or patching an upstream OpenMAIC file, the lesson generator, the whiteboard DSL | `openmaic-internals`, then **`lesson-generator`** (new) |
| The turn's audio path, TTS and ASR routes, the latency harness | `voice-pipeline` |
| The avatar, the Rive rig, the ladder, the camera | `presence-layer` |
| Consent, profiles, transcripts, retention, deletion, any vendor, any notice text, `compliance/` | `minors-privacy` |
| Any screen, any product copy, the landing page, the email templates | `design-system` (which loads `ui-craft` and `design-taste-frontend`) |
| The skill graph, items, misconception tags, the diagnostic, lesson content | `pedagogy-fractions`, then **`content-ops`** (new) |
| Anthropic or model-choice questions, prompt caching, tool use, pricing | `claude-api` (read it before touching `callLLM` call sites) |
| Neon and Postgres questions, indexes, the pooled connection | `neon-postgres` |
| Charts on the parent report, the metrics report, the operator board | `dataviz` |
| Before merging anything that writes evidence, money, consent or auth | `security-review`, then `release-checklist` |
| Reviewing a PR | `code-review`; `simplify` after a large port lands |
| Creating or improving any skill below | `skill-creator` |

### 6.2 Skills to create before the port starts

Each under 300 lines, imperative, with `references/` for the long material and `scripts/` for the deterministic checks, validated with `pnpm skills:validate`.

| Skill | Loads when | Carries |
| --- | --- | --- |
| **`evidence-engine`** | Any file under `lib/tutor/engine`, `lib/tutor/model`, `lib/tutor/report`, the check route, the progress route, any sentence that names mastery | The law in one paragraph; the scheduler contract (pure `estimate`, one config object, a version on every row, nothing outside the engine imports `pfa`, `elo`, `hlr`); what leaves the product is confirmed-only; the two tiers and the verifiability tiers; the gotchas in section 5 as a checklist. `references/`: Kaizen-AI `ENGINE.md` and the adversarial review, verbatim. `scripts/`: a replay-determinism check (recompute every learner from the ledger and diff against `kc_estimate`), and a scan that no route reads `answer_spec` or writes `evidence` outside the ledger module |
| **`kaizen-ai-port`** | Any task that names Kaizen-AI, `web/lib/engine`, `web/lib/server`, or a Supabase migration | The file-by-file map in section 3 kept current as each row lands; the JS-to-TS and supabase-js-to-`pg` translation rules; the SKIP list with reasons so nobody re-discovers the club; where each Kaizen-AI test went |
| **`lesson-generator`** | Lesson mode, `tools/lesson-gen`, `lib/tutor/lessons`, any scene schema or playback change, any OpenMAIC generation skill | The offline-job rule; the scene schema and what each band may see; the review and promotion discipline; how a lesson plays through the turn engine; how quiz items reach the bank; the `curriculum-planner`, `stage-design`, `spiral-curriculum` and `deep-interactive` prompts and when each applies |
| **`content-ops`** | The item bank, `kc` seeds, misconception feedback, standards crosswalk, promotion of anything from draft to verified | Two independent solves plus a human stamp; `context_tag` on every item and at least two per concept; TEKS and CCSS tagging through CASE identifiers; the converter between the pipeline's authoring schema and `kc_item`; the Algebra I review checklist from Kaizen-AI's `docs/reviews/ALGEBRA1_ITEM_BANK.md` |
| **`parent-comms`** | The weekly email, the monthly roll-up, notifications, report wording, anything Resend | Confirmed-only headlines; "moved this week" by replay; the generated label on every generated sentence; essential versus promotional and suppression; no engagement nudges to a child, ever; the email templates as the one place brand hex values may appear |
| **`human-loop`** | The handoff route and queue, the brief, the observe route, the safety queue and runbook, the operator console | The provenance rule (verified and self-reported never blended); a human's rating is confirming evidence with a 36 h floor and a parent's is not; the SLAs; what a snippet may contain |
| **`claims-discipline`** | The landing page, legal pages, emails, any sentence a stranger reads, the claims scanner | The matrix format (surface, claim, verdict, evidence, disposition); the banned forms; the entity name; the rule that a claim ships only with a row |

`design-system` gains two paragraphs from Kaizen-AI's anti-slop standard and the "well-kept record" aesthetic. `pedagogy-fractions` stays as is and `content-ops` sits beside it for everything that is not fractions.

---

## 7. Decisions only Manny can make

1. **Adopt the full mastery law.** Replace the single 24 h delayed check with the engine's gate (four of the last five unassisted, verified checks across two contexts, 48 h after instruction, fresh). Recommendation: yes. It is the sentence that sells the record, the code exists and was reviewed, and the tutor keeps the cheap EMA in session.
2. **Failures and the gate.** Choose the review's option 3 (the k-of-n passes must span distinct days) or option 1 (failure mass decays the gate). Recommendation: option 3; it also re-imposes spacing independently of the schedule.
3. **Any subject or the fixed slice.** With `kc-map`, the tutor can track any homework as working mastery and confirm only where a reviewed bank exists, with an "assessed by AI judgement" marker elsewhere. Recommendation: yes from Phase 2; it is what makes the product usable for a parent whose child is not in fractions this month.
4. **Lesson mode scope for minors.** Slides, board scripts and quizzes only; interactive scenes for adults until a review gate exists. Recommendation: yes; it is Kaizen-AI's Phase 7b call and the CSP and COPPA reasons have not changed.
5. **Who is the human.** The handoff queue needs an inbox and a response time. At first that is Manny; later a hired tutor with the `tutor` role. A parent never certifies. Recommendation: ship the queue and the brief first, the observe route when a person exists.
6. **The item bank.** Phase 1 cannot end with an empty bank. Either fund the pipeline (one console action per `docs/DO-THIS-NEXT.md` item 3) or accept Kaizen-AI's 32 verified items for five skills as the first bank and author the other seven by hand. Recommendation: both, this week.
7. **Pricing and plan limits are unchanged** ($29, 3 profiles, 8 pooled hours). The monthly cost governor's ceilings derive from that price. Any change is Manny's call before Phase 5.
8. **The name (D13).** Still open. The claims scanner needs the entity name (Kaizen Academy LLC is CI-enforced in Kaizen-AI) and the landing page needs a product name. Nothing in this plan depends on the answer except the scanner's one regex.
9. **Kaizen-AI's future.** Recommendation: freeze it as the source archive once Phase 1 lands. Its overhaul plan (`docs/superpowers/plans/2026-09-03-overhaul.md`, Phases 7a and 7b) is superseded by this document; nothing else in it should be executed.

---

## 8. What this plan did not verify

- No code in either repository was run in this session; every claim above comes from reading. KaizenEdu's last logged test run (385 passed, 1 expected fail) and Kaizen-AI's last logged suite (808 tests, lint clean) are taken from their own `docs/LOG.md` and `docs/superpowers/plans/2026-09-03-overhaul.md`.
- The overlap between Kaizen-AI's verified items and F1 to F12 was judged by concept title, not by solving the items against the skill definitions. `content-ops` does that before an item is served.
- Whether the AI SDK path caches the system prompt prefix (section 5) was not checked; it needs the `claude-api` skill and one measured call.
- Kaizen-AI's competitor pricing figures are marked unverified in its own `docs/PRICING_EVIDENCE.md` and are not used anywhere here.
