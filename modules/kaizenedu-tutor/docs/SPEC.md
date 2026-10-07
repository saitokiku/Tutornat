# Natural Tutor v1.1 — Product Spec

**Product:** Natural Tutor (working name) — a 1:1, voice-first AI tutor SaaS built on OpenMAIC
**Company:** Kaizen AI · **Owner:** Manny · **Date:** 2026-09-03 · **Status:** Draft v1.1 for execution
**Ship targets:** Gate 1, Day 14 (2026-09-17) — paid beta open to learners 13+ and adults, with the tutor face and presence cues (§5.10) live. Gate 2, Day 21–30 — under-13 learner profiles (9–12) unlock once the consent/privacy stack is done; attention sensing available opt-in. Gate 3, weeks 6–10 — ages 4–8 open with the early-numeracy slice and young-kid presence defaults (attention sensing on by default, parent-controlled).

v1.1 absorbs the advisor memo: parent-owned accounts from day one, OpenMAIC as engine not product, one magical outcome (diagnose → teach → verify → remember → parent report), buy commodity infrastructure, $0 on model training, and parallel product/engineering/legal/pedagogy tracks.

---

## 0. Decisions baked into this spec

Change these here, not mid-build.

| # | Decision | Why |
|---|---|---|
| D1 | Fork OpenMAIC (MIT) as the **engine**. Our own shell, onboarding, persona, progress model, parental controls, and brand wrap its components. | A parent or child should never feel they're using an open-source course generator. |
| D2 | **Conversation-first, not course-first.** The student talks; the tutor teaches in short turns and draws when useful. Batch "generate a full lesson" is P1. | OpenMAIC's full course generation is reported at ~30 min per course. A session has to start talking in seconds. |
| D3 | One tutor persona. No AI classmates by default. | "Natural" means one calm voice. Classmates become an optional "study group" mode later. |
| D4 | **Parent-owned account model from day one.** The account holder is an adult (parent or adult learner); learners are subordinate profiles with an age band. Launch bands: 9–12, 13–17, adult. | One codebase for both age bands. The under-13 band is gated by consent, not by a separate product. |
| D5 | **Under-13 profiles unlock only after the consent/privacy stack ships** (§11.2). 13+ and adults launch on Day 14. | Collecting a child's data before verifiable parental consent is the one thing that can't be simultaneous. Everything else can. |
| D6 | Ages 4–8 open at Gate 3 (weeks 6–10), not Day 14. | Pre-readers can't read or type; they need a voice-only UI, an early-numeracy/phonics slice, 10-minute sessions, and the presence layer (§5.10) working first. Same codebase, same account model. |
| D7 | Web app only (desktop + mobile browser). | No app-store cycle. |
| D8 | One paid plan. Model/TTS/ASR keys are server-side only; users never configure providers. | Simplest billing; protects cost. |
| D9 | Coach mode by default: the tutor guides before it gives answers. | Parents' first objection to AI tutors is cheating. |
| D10 | **One magical outcome, one launch slice.** The tutor helps with any homework, but mastery tracking and the parent report ship for a fixed skill graph: fractions → pre-algebra (grades 4–8). | This is what a parent pays for and what YC hears. The full mastery-evidence ledger stays a separate initiative. |
| D11 | Build minors' account plumbing (consent records, review/delete/export, retention) for **all** minors, not just under-13. | Federal law is moving toward protections through age 17 (House passed the KIDS Act with COPPA 2.0 in June 2026; it's in the Senate). Cheap to build now, expensive to retrofit. |
| D12 | $0 on training models. Money and time go into the orchestration layer (student model, pedagogy, evaluation) and into users. | Inference engines are replaceable; the accumulated student model isn't. |
| D13 | Product name contains neither "MAIC" nor "Kaizen" until the brand dispute is settled. OpenMAIC attribution kept per MIT. | Trademark hygiene. |
| D14 | **The tutor has a face and a presence.** The session looks and feels like a video call: an animated tutor who visibly listens, thinks, talks, looks at the whiteboard, and reacts — for every band, from Day 14. | "Someone is there" is what makes a kid stay in the session and an adult keep talking. It also masks model latency: a thinking face makes 1.5 s feel natural. |
| D15 | **Attention recovery, not engagement maximization.** The tutor senses when a young learner drifts and brings them back to the lesson — then the session still ends on time. No streaks, autoplay, rapid cuts, or reward loops unrelated to learning. | The Cocomelon insight (measure attention loss, respond to it) is useful; the Cocomelon outcome (maximize screen time) is what parents fear and what kids' online-safety laws are being written against. |
| D16 | **Vision is on-device only.** Camera frames, face landmarks, and any face data never leave the browser and are never stored. The server only ever sees a coarse attention state and per-session aggregates. Camera is default-on for 4–8 (parent-consented, parent-controlled), opt-in for 9–12, off for 13+. | Facial data is biometric-adjacent under the amended COPPA Rule and under Texas and Illinois biometric laws. Keeping it on-device is the difference between a feature and a liability. |

---

## 1. Problem

A parent whose 10-year-old is behind in fractions, or whose 15-year-old is stuck on Algebra at 9pm, has three options: a $60–90/hr human tutor (if one is available), a chatbot that hands over the answer, or a video that can't answer questions. None of them behave like a good tutor: ask what you're working on, watch you try, explain in small pieces, draw it out, check that you actually got it, remember it next time, and tell the parent what changed. OpenMAIC proves the classroom side (agents, whiteboard, voice, quizzes); its default is a generated lecture, not a tutor.

## 2. Goals (measured 30 days after each gate opens)

- **G1 Activation:** ≥ 60% of new learners complete a ≥ 10-minute session within 24 h.
- **G2 Habit:** paying learners average ≥ 2 sessions/week.
- **G3 Retention:** ≥ 35% of trial users return in week 2.
- **G4 Conversion:** ≥ 10% trial → paid.
- **G5 Quality:** ≥ 80% end-of-session thumbs-up; p50 time-to-first-audio ≤ 1.5 s.
- **G6 Outcome:** of learners with ≥ 4 sessions in the launch slice, ≥ 70% move at least one skill from "in progress" to "mastered"; ≥ 60% of parents open the progress report weekly.
- **G7 Economics:** fully loaded cost ≤ $1.20 per 30-min session; blended gross margin ≥ 60%; ≥ 30% even at the plan cap.

## 3. Non-goals (v1)

- The mastery-evidence ledger (append-only, two-tier mastery law, gaming detection) → separate initiative. v1 ships a simple student model (§5.7) and emits raw evidence events (§8.5) it can consume later.
- Human-tutor marketplace, scheduling, standing seats, occupancy.
- Ages 4–8 before Gate 3; phonics/early reading beyond the early-numeracy slice.
- Engagement-maximizing design for kids: autoplay, streak pressure, variable-reward loops, rapid-cut stimulation, guilt-tripping to return. Attention recovery (§5.10) exists to serve the lesson, not to extend screen time.
- Photoreal or human-impersonating avatars. The tutor is a clearly stylized character that says it's an AI.
- Schools/districts, FERPA, SSO, LMS export, teacher dashboards.
- Native mobile apps.
- Social features, gamified economies, custom model training.
- PBL, roundtable debates, video export, OpenClaw/chat-app integration, pptx export → feature-flagged off.
- Multi-language UI → English only.

## 4. Positioning

**To parents:** "A tutor that talks *with* your kid, not at them — and shows you what changed." Voice-first, draws on a whiteboard, verifies mastery, remembers what they struggled with. Priced like one hour of a human tutor per month.

**To YC:** *An AI tutor that builds a persistent model of how each learner understands the subject and continuously generates the next best explanation, exercise, and check for that individual.* OpenMAIC is infrastructure that let us get there fast; the moat is the accumulated system around it — student model, pedagogy, skill graph, evaluation, parent trust, outcomes, interaction data. Never pitch "we're commercializing OpenMAIC."

---

## 5. The Natural Tutor — behavior spec

This is the product. Everything else in this document is plumbing.

### 5.1 Persona

- One tutor. Warm, direct, unhurried. ≤ 3 sentences per turn unless the student asks for a full explanation.
- Asks before telling: opens with a question whenever the student's state is unknown.
- Never reads slides aloud verbatim; slides and whiteboard are aids, not the script.
- Admits uncertainty; checks arithmetic before stating it.
- No sycophancy ("great question!" is banned), no filler, no lecturing when the request is "just help me with #4."
- Age-band register: shorter sentences, concrete examples, and more frequent checks for 9–12; same rules otherwise.
- Voice: one fixed default chosen in the Day-1 spike, plus 2–3 preset alternatives the learner can pick. No cloning of real people.
- Always identifies as an AI tutor when asked, and in the session header. Never claims to be human.

### 5.2 Session loop (state machine)

`GREET → INTAKE → DIAGNOSE → WORK ⇄ CHECK → WRAP`

- **GREET** (≤ 5 s): "Hey — what are you working on today?" Mic is live; text box visible. If the learner profile has an open skill in the launch slice, offer it: "Pick up equivalent fractions, or something new?"
- **INTAKE:** learner speaks/types, or uploads a photo/PDF of the problem set. Tutor restates the goal in one sentence and confirms.
- **DIAGNOSE** (1–3 turns): locate the gap. In the launch slice this is a short diagnostic against the skill graph (§5.8): 2–4 targeted items that place the learner and tag likely misconceptions.
- **WORK:** explain (≤ 3 sentences) → learner attempts → feedback. Whiteboard whenever content is symbolic, spatial, or step-based. On "I don't get it," re-teach with a *different* approach (analogy, visual model, worked example, smaller step) — never the same explanation again.
- **CHECK:** every ~10 min or at topic end, 1–2 items graded live; results update the student model.
- **WRAP:** 30-second recap, "what to practice," summary saved, student model updated, parent report refreshed. Default 25 min (15 min for 9–12) with a soft "keep going?"

### 5.3 Voice loop

- Learner → streaming ASR → tutor turn (streaming text) → sentence-level streaming TTS → playback. Every turn's text is visible as it streams.
- **Barge-in:** when the learner starts speaking, playback stops within 300 ms and queued TTS is cancelled.
- Input modes: hands-free (VAD) on desktop; push-to-talk default on mobile; text always available.
- **Latency budget (p50 / p90):** end of learner speech → first tutor audio, 1.5 s / 3.0 s.
- A whiteboard action referenced by a sentence appears within 2 s of that sentence starting.
- Audio is never persisted. It streams to transcription and is discarded; only the transcript is stored. No voice identification or biometrics, ever.

### 5.4 Coach mode (academic integrity)

- For an uploaded or pasted graded-looking problem, the tutor withholds the final answer until the learner has attempted at least one step.
- "Just show me" is allowed after one attempt: the tutor shows a worked solution, then asks the learner to do a similar one.
- No mode switch in v1.

### 5.5 Memory

- Within a session: full context.
- Across sessions: the student model (§5.7) plus a compact learner profile (subjects, recurring misconceptions, pace, explanation styles that worked), regenerated at WRAP and injected at GREET.

### 5.6 Safety (minors are present)

- Content policy in the system prompt plus provider safety settings: no sexual or violent content, no romantic roleplay, no elicitation of personal information (name, school, address, contacts); off-topic requests redirected to studying. Stricter phrasing and blocklists for the 9–12 band.
- If a learner discloses self-harm or abuse, the tutor responds with care, provides crisis resources, stops tutoring, and the session is flagged for the account holder and for review.
- Report button on every session. Parent can read any transcript for their learners.

### 5.7 Student model v0

- Per learner, per skill in the graph: a mastery **estimate** (0–1) = exponential moving average of correctness on check items for that skill (α = 0.3), plus counts and last-seen.
- Status rules: *not started* (0 items) → *in progress* → *mastered* when estimate ≥ 0.8 with ≥ 4 items across ≥ 2 sessions. Labelled "estimate" everywhere in the UI.
- Misconception tags attach to wrong answers via item distractors (§5.8) and to tutor observations; a tag is "resolved" after 3 consecutive relevant items without it.
- Next-skill selection: the lowest unmastered skill whose prerequisites are mastered.
- Upgrade path (not v1): BKT/IRT and the two-tier mastery law live in the ledger initiative; v0 emits the events they'll need.

### 5.8 Launch slice: fractions → pre-algebra (grades 4–8)

Prerequisite check-ins: multiplication facts; factors and multiples.

| # | Skill | Prereqs |
|---|---|---|
| F1 | Fraction as part of a whole; unit fractions | — |
| F2 | Fractions on a number line | F1 |
| F3 | Equivalent fractions | F1, F2 |
| F4 | Comparing and ordering (common denominators, benchmarks ½ and 1) | F3 |
| F5 | Simplifying (GCF) | F3 |
| F6 | Mixed numbers ↔ improper fractions | F2 |
| F7 | Add/subtract with like denominators | F1 |
| F8 | Add/subtract with unlike denominators (LCD) | F3, F7 |
| F9 | Multiply fractions; fraction of a set | F3 |
| F10 | Divide fractions (reciprocal, and why it works) | F9 |
| F11 | Fractions ↔ decimals ↔ percents | F4 |
| F12 | Ratios and rates (bridge to pre-algebra) | F9, F11 |

Misconception tags: `denominator_magnitude` (bigger denominator = bigger fraction), `add_across` (add numerators and denominators), `whole_number_bias`, `equivalence_as_change` (scaling top and bottom changes the value), `division_makes_smaller`, `decimal_length` (0.25 > 0.3 because it's longer).

Check item bank: ≥ 8 items per skill (≥ 96 total), each tagged with skill and, per distractor, a misconception tag. Candidates generated by the strong model, every item solved by the strong model with self-check and reviewed by a human before it ships. Reuse the existing Kaizen item bank where it overlaps.

### 5.9 Parent report (in-app, refreshed at every WRAP)

Per learner: sessions and minutes this week; per skill — starting estimate → current estimate and status; misconceptions open/resolved; next skill; one-line tutor note per session; learner's thumbs. Example of the intended reading: *Fractions — starting 42%, now 78%; resolved: denominator magnitude; next: equivalent fractions.*

### 5.10 Presence layer: face, voice, attention

The session is a call, not a chat window. Three parts, shipped in order.

**A. The face (Gate 1, every band)**

- Layout like a video call: tutor tile large, whiteboard tile beside or below it, learner self-view small (only when the camera is on), call controls (mute, camera, end), a persistent "AI tutor" label, session timer.
- A stylized 2D rigged character (Rive or Lottie; swappable behind an `AvatarDriver` interface with inputs `{state, mouth, gaze, expression}` so a 3D VRM rig can replace it later without touching the orchestrator). Not photoreal.
- States driven by the loop: **idle** (blinks, breathing, occasional glance at the whiteboard), **listening** (leans in, nods on pauses; triggered by VAD), **thinking** (looks up, "hmm" — shown from end-of-speech until first TTS audio, which turns the latency budget into a natural beat), **speaking** (mouth driven by TTS amplitude in v0; by visemes if the TTS provider returns word/phoneme timing), **at-whiteboard** (gaze to the board while drawing actions execute), **reacting** (short, proportional: a smile on a correct check, a soft "not quite" face, never celebration fireworks).
- Backchannels ("mm-hm", "right") only during learner utterances longer than ~6 s, at most once per utterance. Silence check-ins: if the learner goes quiet mid-task for 20 s (10 s for 4–8), the tutor asks a short question rather than restating.
- The face never claims to be a person. If asked, the tutor says it's an AI tutor with a character. No "I miss you," no guilt about leaving, no asking to come back.

**B. Attention sensing (Gate 2 opt-in for 9–12; Gate 3 default-on for 4–8; off for 13+)**

- Two signal sources, cheapest first:
  - **Non-camera signals (always on):** no response for N seconds, tab hidden or window unfocused (Page Visibility API), no pointer/touch activity, answer patterns that look like button-mashing.
  - **Camera signal (consented, on-device):** an in-browser face-landmark model (MediaPipe Face Landmarker or equivalent via WASM/WebGL) sampled at 5–10 fps produces face-present, head yaw/pitch, and eyes-open. A local scorer turns that into one of `{attending, drifting, away, no_face}` at ~2 Hz with hysteresis. **No frame, landmark, embedding, or template is transmitted or stored. Ever.** The only thing that leaves the device is the state, and the only thing persisted is per-session aggregates (attention %, number of recoveries, tactics that worked).
- A visible indicator whenever the camera is active; the learner (in kid language) and the parent both know the tutor "can tell if you're looking." Parent can turn it off at any time from settings; the tutor still works without it, using the non-camera signals.
- Device check at session start: if the landmark model can't hold 5 fps on this device, camera sensing is disabled for the session and the parent is told.

**C. Attention recovery (paired with B)**

When state is `drifting` or `away` for longer than the band threshold (8 s for 4–8, 15 s for 9–12), the tutor escalates through a ladder, one step per ~10 s, and logs which step worked:

1. Prosody + name: a change of pace and "Maya — look at this."
2. A direct, answerable question that requires a response, with the turn cut short.
3. Modality switch: draw something on the whiteboard, animate it, ask them to point or tap.
4. A 20–30-second "your turn" micro-interaction tied to the current skill (drag pieces, count, sort).
5. Movement break (4–8 only): "Stand up, stretch, count to ten with me," then back.
6. If `away` persists past 2 minutes: pause the session, save state, and notify the account holder (4–8: immediately; 9–12: in the session summary).

Rules that keep this on the right side of the line: recovery steps must return to the lesson, never to a reward; the ladder never speeds up the whole session's cut rate (no rapid-cut baseline); sessions end at their scheduled length regardless of attention; the parent report shows attention % and recoveries, and the parent can disable any step. The Cocomelon-style measurement loop is also used offline: where attention drops during an explanation is a signal to fix that explanation or visual, not to add stimulation.

**D. Young-kid defaults (Gate 3)**

Sessions ≤ 10 minutes with one skill target; voice-only interaction (no typing, big tap targets); camera sensing and the full ladder on by default under parental consent; parent notified on pause; a parent may sit in (self-view shows both) and the tutor addresses the child.

---

## 6. User stories (priority order)

**Learner**
- As a learner, I want to tell the tutor what I'm stuck on and get help within seconds, so I don't lose the 20 minutes I have.
- As a learner, I want to upload a photo of my problem set, so I don't have to type equations.
- As a learner, I want the tutor to draw the steps, so I can follow along visually.
- As a learner, I want the tutor to make me try before telling me, so I actually learn it.
- As a learner, I want to interrupt when I already get it, so I'm not stuck listening.
- As a learner, I want the tutor to remember what I struggled with, so I don't start from zero each time.
- As a learner on a bad connection, I want text to keep working when audio fails.
- As a learner, I want the tutor to look like it's listening and thinking, so it feels like someone is there and not like waiting on a spinner.
- As a young learner, I want the tutor to notice when I've wandered off and bring me back with something to do, so the session doesn't just talk past me.

**Parent (account holder)**
- As a parent, I want to add my kids as separate profiles under one subscription, so I pay once.
- As a parent, I want to see per-skill progress and what got resolved, so I know it's working.
- As a parent of a 10-year-old, I want to give consent once, understand exactly what's collected, and be able to review or delete everything.
- As a parent of a 6-year-old, I want the tutor to keep my kid on the lesson while I'm in the kitchen, and I want to know the camera never records or uploads anything.
- As a parent, I want the session to end when it's supposed to, so this doesn't become another screen my kid won't put down.
- As a parent, I want to know my teen can't run up a bill.
- As a parent, I want assurance the tutor won't just do the homework.

**Adult learner**
- As an adult learner, I want to sign up and start in under a minute without any parent flow.

**Operator**
- As the operator, I want per-session cost, latency, thumbs, and mastery deltas, so I can tune models, prompts, and pricing weekly.
- As the operator, I want a kill switch on cost and abuse, so one bug can't bankrupt the month.

---

## 7. Requirements

### P0 — Day-14 gate (13+ and adults)

- **R1 Live tutor loop** (§5.2–5.3). AC: first tutor audio ≤ 10 s after Start; a 25-min voice session completes end-to-end on desktop Chrome and iOS Safari; text fallback with mic denied; barge-in verified by a scripted test.
- **R2 Whiteboard inside conversation.** AC: whiteboard actions in ≥ 80% of fraction/algebra explanations across a 20-prompt eval set; actions match the spoken sentence.
- **R3 Problem upload.** AC: photo (jpg/png/heic) and PDF; extracted text/LaTeX shown for confirmation; retry plus typing fallback on failure. (Verify upstream's image path in the spike; if PDF-only, pass images straight to a vision-capable model.)
- **R4 Checks, summary, student model.** AC: ≥ 1 graded check per session; WRAP writes the session summary and updates `skill_mastery`; Progress reflects it within 5 s.
- **R5 Parent-owned accounts and learner profiles.** AC: adult account holder (email magic link + Google); learner profiles with birth year → age band; teen profiles get their own sign-in under the account; adult learners are their own profile; under-13 profiles are creatable but **locked** until R16 ships (clear "coming soon" message, no child data collected).
- **R6 Tenant isolation.** AC: every course/session/summary/model row partitioned by server-derived account and learner ids; `lib/persistence/server-auth.ts` replaced with real session verification (upstream's README says this is required before production); automated cross-tenant test.
- **R7 Billing & metering.** AC: Stripe Checkout, one plan covering up to 3 learner profiles, 30-minute free trial with no card for 13+/adult learners; minutes metered per session; hard stop at cap with upgrade prompt; warning at 80%; webhooks handle cancel and failed payment; Customer Portal linked.
- **R8 Provider lock-down.** AC: no client-side provider/TTS/ASR settings; keys server-side only; per-stage model routing by env; cost logged per turn.
- **R9 Cost & abuse guards.** AC: per-session cost ceiling ($3) and per-learner daily cap; global daily-spend alarm; rate limits on generation and TTS.
- **R10 Safety + AI disclosure.** AC: §5.6 behaviors verified against a 30-prompt red-team set (separate 9–12 set); report button creates a flagged record; "AI tutor" label in every session; neutral age screen for self-signup.
- **R11 Parent progress view** (§5.9). AC: per-learner page with skills, estimates, misconceptions, next skill, session notes; transcripts readable by the account holder.
- **R12 Launch-slice content.** AC: skill graph (§5.8) loaded; ≥ 96 reviewed check items; diagnostic flow places a learner in ≤ 4 items; tutor prompts reference skill and misconception context.
- **R13 Landing + onboarding.** AC: one page (value prop, 45-second demo clip, price, FAQ including "it won't do their homework" and "how we handle my kid's data"); signup → first session in ≤ 3 clicks for adults/teens; ToS, Privacy, AI disclaimer linked.
- **R14 Instrumentation.** AC: events (signup, profile_created, consent_recorded, session_start/end, turn, check_result, mastery_change, report_viewed, thumbs, upgrade, cap_hit, error) in PostHog (first-party, no ad SDKs); Sentry server and client; latency and cost per turn queryable in one dashboard.
- **R15 Deploy.** AC: staging (ACCESS_CODE) and prod on Vercel; Postgres + object storage; `upstream` remote; one-command local dev.
- **R28 Presence v0 — the face** (§5.10 A). AC: call-style layout on desktop and mobile; avatar states idle/listening/thinking/speaking/at-whiteboard/reacting driven by VAD, LLM stream start, TTS playback, and whiteboard actions; mouth moves with TTS amplitude; thinking state covers the gap from end-of-speech to first audio; backchannel and silence check-in rules verified by a scripted test; "AI tutor" label always visible; no camera involved. Non-camera attention signals (tab hidden, idle) are logged but not acted on at this gate.

### P0 — Day-21–30 gate (under-13 profiles unlock)

- **R16 Consent & privacy stack** — the checklist in §11.2, end to end. AC: an under-13 profile cannot start a session until a consent record exists; consent captured via direct notice + affirmative checkbox + a card transaction with transaction notification; parent can review, export, delete, and revoke from settings; revoke freezes the profile and deletion completes within the retention policy's window; privacy policy and written retention policy published; vendor/data-flow document complete; counsel sign-off recorded.
- **R29 Attention sensing + recovery, opt-in for 9–12** (§5.10 B–C). AC: camera pipeline runs entirely in-browser; a network audit proves no frame, landmark, or template is ever sent (only the state stream and session aggregates); visible camera indicator; parent toggle in settings; device performance check gates the feature per session; non-camera signals drive the ladder when the camera is off; ladder steps 1–4 and 6 implemented with per-step logging; recovery outcomes appear in the parent report; the camera notice and consent language in §11.2 are live and counsel-reviewed before the toggle is exposed.

### P0 — Gate 3 (weeks 6–10, ages 4–8 open)

- **R30 Young-kid mode** (§5.10 D). AC: 10-minute sessions with one skill target; voice-only UI with large tap targets; early-numeracy slice (counting, number sense to 20, comparing, simple add/subtract) with its own skill graph and ≥ 48 reviewed items; attention sensing and the full ladder including movement breaks on by default under parental consent; pause-and-notify on `away` > 2 min; a 4–8 red-team set passes.

### P1 — first fast-follows

- **R17 Mini-lesson mode** ("Teach me X"): async 5–10-minute lesson, ≤ 6 scenes, generation ≤ 2 min, plays into the same loop.
- **R18 Parent weekly email** (Resend) with the §5.9 report.
- **R19 Learner-facing progress UI** (what you struggle with, streaks).
- **R20 Self-hosted TTS** (VoxCPM2 prompt-voice) once volume justifies a GPU.
- **R21 Admin page:** accounts, learners, sessions, cost, flags, consent records.
- **R22 Second slice:** pre-algebra → Algebra I foundations (same machinery, new graph and items).
- **R23 Referral** (give a session, get a session); family plan tier.
- **R31 Viseme lip-sync and richer expressions** once the chosen TTS provider returns word/phoneme timing; 3D VRM rig behind the same `AvatarDriver` interface if the 2D rig tests poorly with kids.
- **R32 "Show me your work" camera capture:** learner holds up their paper, a single explicit snapshot goes to the vision model, is deleted after the turn, and is never associated with the attention pipeline. Disclosed separately in the notice; 13+ first, under-13 after counsel review.

### P2 — design for, don't build

- **R24** Evidence events feed the mastery ledger (append-only; §8.5).
- **R25** Phonics and early reading for 4–8 (beyond the early-numeracy slice); learned per-child recovery preferences feeding adaptation.
- **R26** "Study group" mode (AI classmates) and human-tutor handoff.
- **R27** School/district accounts; COPPA safe-harbor certification.

---

## 8. Architecture

### 8.1 Layers

```
NATURAL TUTOR
├── Parent app        subscription · learner profiles · consent & privacy controls · progress reports
├── Learner app       call-style session · tutor face (AvatarDriver) · whiteboard · checks · (P1) lessons & practice
│     Presence (client-only): VAD → avatar states · on-device attention sensor → {attending, drifting, away, no_face}
├── Tutor Orchestrator (lib/tutor)
│     session state machine · student model · skill graph & item retrieval
│     adaptation (band, pace, re-teach strategy) · attention-recovery policy (ladder, thresholds, logging)
│     safety rules · model routing · cost/latency accounting
├── OpenMAIC-derived  LangGraph director · playback & action engine · whiteboard · chat SSE
│                     TTS/ASR providers · quiz grading · document parsing · storage contracts
└── Commodity infra   Vercel · Neon Postgres · S3/R2 · Clerk · Stripe · PostHog · Sentry · Resend · LLM APIs
```

### 8.2 Fork strategy — engine, not product

- New private repo forked from `THU-MAIC/OpenMAIC`; `upstream` remote; merge upstream weekly (they release roughly monthly).
- Our shell owns routing, navigation, onboarding, session screen, parent app, and brand. OpenMAIC components are embedded where they earn it. Product code lives in isolated paths: `app/(parent)/…`, `app/(learner)/…`, `lib/tutor/…`, `components/tutor/…`, `kaizen.config.ts`. Upstream files edited only via small, commented patches; everything else gated by `TUTOR_MODE=1`.
- **Keep:** `lib/orchestration` (LangGraph director), `lib/playback`, `lib/action`, `lib/audio`, `lib/ai` (provider abstraction, per-stage routing), `components/whiteboard`, `components/chat`, `app/api/chat` (SSE), `app/api/quiz-grade`, `app/api/parse-pdf`, `app/api/transcription`, `@openmaic/storage` server persistence.
- **Strip or flag off:** PBL, roundtable, AI classmates by default, `render-service`, OpenClaw skill, pptx export (also removes the LGPL `mathml2omml` packaging question), classroom ZIP import/export from the user UI, the provider Settings panel, the upstream home page, ACCESS_CODE on prod. Rule of thumb from the memo: delete 40 of the 50 screens.

### 8.3 Services

Vercel (Next.js app) · Neon Postgres · S3-compatible object storage via `@openmaic/storage` · Clerk (auth) · Stripe (billing; card transaction doubles as the parental-consent identity check) · PostHog (first-party analytics) · Sentry · Resend (email, P1).

### 8.4 Model & voice routing (env-configured, server-side)

- **live_turn:** fast model (Gemini 3 Flash-class per upstream's own recommendation, or Claude Haiku-class). The loop lives or dies on this latency.
- **diagnose / grade / summary / model update:** stronger model (Claude Sonnet-class) with self-check on arithmetic.
- **TTS:** hosted provider with streaming, chosen in the Day-1 spike from what OpenMAIC already wires; VoxCPM2 self-hosted is P1.
- **ASR:** hosted streaming (Azure STT or OpenAI transcription — whichever hits the latency budget); FunASR local is not for v1.
- Every vendor on this list must pass the minors' data review in §11.2 before the under-13 gate opens.

### 8.5 Data model (additions to OpenMAIC's stores)

- `accounts` (adult holder) · `learners {account_id, display_name, birth_year, age_band, status: active|locked|frozen}` · `subscriptions`
- `consents {learner_id, method, notice_version, policy_version, granted_at, revoked_at, evidence_ref}`
- `skills`, `skill_edges` (prereqs), `check_items {skill_id, stem, options, correct, distractor_tags}`
- `skill_mastery {learner_id, skill_id, estimate, n_items, n_sessions, status, updated_at}` · `misconceptions {learner_id, tag, status, first_seen, resolved_at}`
- `sessions {learner_id, started_at, ended_at, minutes, mode, cost_cents, thumbs}` · `turns {session_id, role, text, audio_ms, latency_ms, model, cost_cents}` · `session_summaries` · `learner_profiles`
- `evidence_events {learner_id, session_id, type, payload, ts}` — append-only, insert-only DB grants. Seed of the mastery ledger; costs nothing to emit now.
- `usage_ledger` · `flags` · `deletion_requests`
- `attention_stats {session_id, camera_enabled, attending_pct, drift_count, away_count, recoveries}` — aggregates only.
- `recovery_events {session_id, ts, trigger_state, ladder_step, outcome}` — which tactic worked for this learner; feeds the learner profile.
- No audio column anywhere. No frames, face landmarks, embeddings, or templates anywhere — not in the DB, object storage, logs, analytics, or error reports (Sentry scrubbing verified). No third-party tracking identifiers on learner surfaces.

### 8.6 Budgets

Per 30-min session: LLM ≤ $0.60, TTS ≤ $0.40, ASR ≤ $0.20 → ≤ $1.20 target, $3.00 hard ceiling. Latency per §5.3.

---

## 9. Pricing and trials (placeholder — validate with 10 parents before Day 12)

- **Plan:** $29/month, up to 3 learner profiles, 8 hours of tutoring pooled (~16 sessions). About $3.60/hour vs. $60–90/hour for a human tutor. Worst case at cap ≈ $19 cost → ~34% margin; at a 3-hour median ≈ $7 → ~75%.
- **Trial, 13+ and adults:** 30 minutes free, no card.
- **Trial, under-13:** none before consent. The parent pays first — the card transaction is also the approved identity check for consent — with a 7-day money-back guarantee. Counsel to confirm whether a $0 card authorization would satisfy the method; assume it does not.
- Annual and family tiers later.

## 10. Success metrics (reviewed weekly)

- **Leading:** activation, sessions/learner/week, p50/p90 latency, thumbs %, cost/session, error rate, cap-hit rate, report views, diagnostic completion.
- **Lagging:** D7/D30 retention, trial → paid, churn, mastery deltas per learner-month, misconceptions resolved, NPS (one question at day 14), CAC from the Austin beta.

---

## 11. Legal, IP, compliance

### 11.1 Licensing and IP

- OpenMAIC is MIT-licensed (relicensed from AGPL-3.0 in v0.3.0); commercial use is permitted. Keep the LICENSE and copyright notice in the repo and a "Built on OpenMAIC" line in the site footer. `packages/mathml2omml` is LGPL-3.0 — not shipped once pptx export is stripped.
- Do not use "MAIC" in the product name or brand. Product name and domain decided after the Kaizen trademark question (§15).
- No voice cloning of real people; presets only.
- Built on personal time, equipment, and accounts, outside GRC's field. Confirm the employment agreement's invention-assignment and outside-work clauses before public launch.

### 11.2 Children's privacy — the under-13 gate checklist

Context: the FTC's amended COPPA Rule has been fully enforceable since April 22, 2026. It applies to services directed to children under 13 and to services with actual knowledge they collect a child's personal information. A parent-created profile with a birth year is actual knowledge. The amendments added separate consent for third-party disclosure, a written and published data retention policy, biometric identifiers as personal information, a "mixed audience" definition, new consent methods, and an audio-file notice requirement. The gate opens when every line below is done and a children's-privacy counsel has signed off.

1. **Mixed-audience posture.** Neutral age screen for self-signup (birth year, no nudging); parent-entered birth year on learner profiles. Marketing and visuals stay teen/parent-facing, not child-directed.
2. **Direct notice + online notice.** Direct notice to the parent before consent; privacy policy lists categories collected, every third-party recipient (each AI/TTS/ASR/analytics vendor by name), internal-operations use of persistent identifiers, and the audio statement: voice is collected solely to respond to the learner's request, is not used for any other purpose, and is deleted immediately.
3. **Verifiable parental consent.** Affirmative consent checkbox tied to the notice version, then a card transaction with transaction notification to the account holder (an approved method). Store the consent record. Consent is revocable from settings; revoking freezes the profile.
4. **Parental rights.** Review transcripts and data, export, delete, refuse further collection — all self-serve, plus a support path.
5. **Retention policy.** Written and published: transcripts and model data kept while the profile is active and for a fixed window after (proposal: 12 months after last activity), then deleted; audio never retained; deletion on request within the window.
6. **Third-party disclosure.** None planned. If ever needed, it requires its own separate opt-in consent that is not bundled with the primary consent.
7. **Vendor / service-provider review.** For each LLM, TTS, ASR, analytics, email, and storage vendor: terms permit minors' data, no training on inputs, confidentiality and use limited to our purposes (service-provider role), data-processing terms in place. Write the data-flow document. Any vendor that fails is swapped before the gate opens.
8. **No behavioral advertising, no ad SDKs, no cross-site tracking** on any learner surface. First-party analytics only.
9. **Security program.** Written: encryption at rest and in transit, least-privilege access, key rotation, incident response, vendor breach clauses.
10. **Kid-safe model policy.** Band-specific system prompts, provider safety settings, blocklists, escalation rules (§5.6), AI disclosure, no personal-information elicitation. Red-team set for the 9–12 band passes before the gate.
11. **Records.** Consent records, policy versions, vendor review, red-team results, and the counsel sign-off are kept in the repo's `compliance/` folder.
12. **Camera and face data.** The amended COPPA Rule treats biometric identifiers, including facial data usable for recognition, as personal information. Our posture: the camera is used only for on-device attention sensing; no image, landmark, or template is transmitted or stored; only a coarse attention state and session aggregates exist server-side. The notice says exactly that; the consent flow names the camera separately; a visible indicator runs whenever it's active; the parent can disable it at any time. Counsel reviews this against the COPPA biometric definitions, Texas's biometric identifier law (CUBI), and Illinois BIPA before the camera toggle is exposed to any minor — and again before it becomes default-on for 4–8.
13. **Attention data is not engagement data.** Attention aggregates are used to adapt the lesson and to report to parents. They are never used to lengthen sessions, trigger notifications to the child, or build re-engagement campaigns.
14. **Later, not now:** COPPA safe-harbor program certification (kidSAFE / ESRB) once revenue justifies it.

### 11.3 Texas and federal drift

- Texas's SCOPE Act adds obligations for known minors under 18 (parental tools, data limits). The parent-owned account model covers most of it; counsel confirms the rest before beta.
- Federal: the House passed the KIDS Act (H.R. 7757) on June 29, 2026, folding in COPPA 2.0 provisions that extend protections to teens through 17, add a "should-have-known" standard, and add AI-chatbot safety provisions; it was referred to the Senate in July and is not law. D11 builds to that direction now.

## 12. Risks

- **Latency kills the "natural" feel.** Day-1 spike is a go/no-go gate. If p50 > 2.5 s after tuning, cut whiteboard-per-turn and shorten turns first.
- **Child-directed design creep.** If the learner app starts looking like a kids' app, the whole service becomes child-directed and the age screen stops working as a shield. Keep visuals teen/parent-facing; the 9–12 band differs in register and session length, not in cartoons.
- **A vendor's terms exclude minors.** Found during the §11.2 review; swap the vendor. Do the review in week 1, not week 3.
- **Upstream drift.** Weekly merges, isolated paths, automated tests on the tutor loop.
- **Math hallucinations.** Grading and arithmetic through the stronger model with self-check; every check item human-reviewed; P1: sandboxed calculation.
- **Cost runaway.** R9 guards land *before* the beta invite.
- **Voice quality on mobile Safari.** Test on a real iPhone on Day 1.
- **Regulatory drift.** Build minors' plumbing for all bands (D11); re-check federal status monthly.
- **The engagement trap.** Attention tooling drifts toward retention metrics because they're easy to measure. Guard: the only attention KPI is "recovered to task and finished on time"; session length is never a success metric for minors.
- **Face data leaking by accident.** A debug log, a crash report with a canvas snapshot, an analytics screenshot. Guard: the network audit in R29 is a CI test, and Sentry/PostHog are configured to never capture media.
- **Uncanny or creepy avatar.** Kids reject a face that's almost human; parents reject one that watches too obviously. Guard: stylized rig, small proportional reactions, test with five kids before Gate 2.
- **Low-end devices.** Face-landmark models at 5–10 fps plus TTS/ASR can starve a cheap Chromebook or old iPad. Guard: the per-session device check disables camera sensing gracefully; non-camera signals still work.

---

## 13. Plan — three parallel tracks

**Gates:** Day 2 — a session works end-to-end on staging. Day 7 — internal dogfood with 5 learners, thumbs ≥ 60%; face v0 visible. Day 12 — billing live. Day 14 — beta invite to the first 20 (13+ and adults) with the face live. Day 21–30 — under-13 profiles unlock after §11.2 and counsel sign-off; attention sensing opt-in for 9–12 after the network audit and a five-kid test. Week 6–8 — second slice (R22) and the YC application draft. Weeks 6–10 — Gate 3: ages 4–8 with the early-numeracy slice and young-kid defaults.

**Track A — Engineering** (Claude Code dispatch; issues below)
**Track B — Legal / privacy** (starts Day 1, in parallel): counsel engaged Day 1–3; vendor review Day 1–7; notices, privacy and retention policies Day 3–10; consent flow spec to engineering Day 5; sign-off Day 18–25.
**Track C — Pedagogy / content** (starts Day 1): skill graph finalized Day 2; item bank Day 2–8 (generate, solve, review); diagnostic flow Day 6; tutor prompt evals Day 4–10; 9–12 red-team set Day 10.

Issues (label-number · title — acceptance criteria). Cut these straight into GitHub Issues.

- **infra-01 · Fork, upstream remote, local dev** — `pnpm dev` from a clean clone; `README.md` lists every env var.
- **infra-02 · Staging on Vercel + Neon + object storage** — a session persists across reload; ACCESS_CODE set.
- **infra-03 · Feature flags & strip list** — `TUTOR_MODE` hides PBL/roundtable/export/settings/home; upstream tests still pass.
- **infra-04 · Own app shell** — parent and learner routes, navigation, brand tokens; OpenMAIC components embedded in the session screen only.
- **spike-05 · Voice latency spike** — table of TTS/ASR/LLM combos with p50/p90; defaults picked; go/no-go recorded; tested on iPhone Safari.
- **tutor-06 · Persona + system prompts (per band) + 20-prompt eval** — turn length, no sycophancy, asks-before-tells scored by rubric.
- **tutor-07 · Session state machine (GREET → WRAP)** — visible state, band-specific timer, soft continue.
- **tutor-08 · Just-in-time whiteboard actions in live turns** — R2 AC.
- **tutor-09 · Checks + in-loop grading** — R4 AC.
- **tutor-10 · Diagnostic flow against the skill graph** — places a learner in ≤ 4 items; tags misconceptions.
- **tutor-11 · Student model v0** — `skill_mastery` and `misconceptions` update at every check and WRAP; status rules per §5.7; unit tests.
- **tutor-12 · Next-skill selection + GREET offer** — lowest unmastered skill with prereqs mastered; offered at session start.
- **tutor-13 · WRAP summary + learner profile regen** — stored; parent report refreshed.
- **tutor-14 · Coach mode rules + 15-case test** — withholds answer until an attempt; "just show me" path works.
- **content-15 · Skill graph + item bank loader** — §5.8 graph seeded; ≥ 96 reviewed items imported with tags; reuse of existing Kaizen items mapped.
- **voice-16 · Streaming sentence-level TTS + playback queue** — first audio ≤ 1.5 s p50 on staging.
- **voice-17 · Barge-in + VAD / push-to-talk** — stop ≤ 300 ms; PTT default on mobile.
- **voice-18 · Text fallback & reconnection** — mic denied and audio-error paths covered.
- **voice-19 · No-audio-persistence audit** — audio never written to disk/DB/logs; test proves it.
- **upload-20 · Photo/PDF problem intake** — R3 AC.
- **auth-21 · Clerk sign-in + accounts/learners model + replace `server-auth.ts`** — R5/R6 AC including the cross-tenant test.
- **auth-22 · Teen sign-in under a parent account; adult self-signup; neutral age screen** — R5/R10 AC.
- **billing-23 · Stripe Checkout / Portal / webhooks + plan config** — R7 AC.
- **billing-24 · Minute metering, caps, warnings** — R7/R9 AC.
- **guard-25 · Cost ceilings, rate limits, spend alarm** — R9 AC.
- **safety-26 · Safety prompts + red-team sets (13+ and 9–12) + report flag + AI label** — R10 AC.
- **parent-27 · Parent progress view + transcript access** — R11 AC.
- **growth-28 · Landing page + onboarding + legal pages** — R13 AC.
- **data-29 · PostHog events + Sentry + cost/latency/mastery query** — R14 AC.
- **data-30 · `evidence_events` (insert-only) wired into checks, turns, model updates** — a row per check, turn, and mastery change.
- **ops-31 · Prod deploy, domain, backups** — restore drill documented.
- **beta-32 · Beta invite flow + feedback form + weekly review template** — 20 invites sent; review doc filled on Day 14.
- **consent-33 · Under-13 consent flow** — direct notice → checkbox → card transaction → consent record → profile unlock; revoke freezes; R16 AC.
- **consent-34 · Parental rights: review / export / delete / revoke** — self-serve from settings; deletion job honors the retention window.
- **consent-35 · Policies + retention policy published; vendor data-flow doc; `compliance/` folder** — counsel sign-off recorded.
- **consent-36 · Under-13 gate switch** — env flag flips locked profiles to active; smoke test on a real under-13 profile with a parent tester.
- **presence-37 · Call-style session layout** — tutor tile, whiteboard tile, self-view slot, controls, AI label, timer; desktop and mobile.
- **presence-38 · AvatarDriver interface + 2D rig (Rive/Lottie)** — states idle/listening/thinking/speaking/at-whiteboard/reacting; amplitude lip-sync; swappable rig.
- **presence-39 · Wire states to the loop** — VAD → listening; LLM stream start → thinking; TTS playback → speaking; whiteboard action → gaze; check result → reaction; backchannel and silence check-in rules with tests.
- **presence-40 · Non-camera attention signals** — visibility/idle/response-timeout detectors emitting the state stream; logged only at Gate 1.
- **presence-41 · On-device attention sensor** — in-browser face-landmark model at 5–10 fps → local scorer → `{attending, drifting, away, no_face}` with hysteresis; device performance check; visible indicator; parent toggle.
- **presence-42 · No-face-data-egress CI test** — network and storage audit proving no frame/landmark/template leaves the browser; Sentry/PostHog media capture disabled.
- **presence-43 · Recovery ladder in the orchestrator** — band thresholds, steps 1–4 and 6, per-step logging to `recovery_events`, parent-disable per step, pause-and-notify.
- **presence-44 · Attention stats in the parent report** — attention %, recoveries, and which tactics worked.
- **presence-45 · Five-kid usability test (before Gate 2)** — avatar acceptance, indicator comprehension, recovery ladder felt-as-help not nag; findings filed.
- **young-46 · Early-numeracy slice + voice-only UI + movement breaks (Gate 3)** — R30 AC.

## 14. If funded (YC or otherwise)

Optimize for calendar time and existential risk, not cash burn. First money goes to: one exceptional full-stack/product engineer; one AI/agent engineer on the orchestrator and evals; one product/design person who makes the session feel excellent; fractional children's-privacy counsel; a security/privacy review before scale; and user acquisition. Still $0 on training models. Everything in §8.3 stays bought, not built. The tracks in §13 run wider, not longer.

## 15. Open questions

**Blocking**
- Product name + domain (stakeholder/legal): subdomain of kaizenedu.net vs. a fresh name, given the brand dispute.
- Counsel engaged by Day 3 (stakeholder) — the under-13 gate cannot open without it.
- TTS/ASR/LLM defaults (engineering): answered by spike-05.
- Which existing Kaizen item-bank items map onto the §5.8 graph (pedagogy).

**Non-blocking**
- Price point, learner-profile cap, and pooled hours (stakeholder + 10 parent conversations).
- Whether a $0 card authorization satisfies the consent method, or a paid first period is required (legal).
- Tutor name and voice presets (product).
- Retention window length (legal/data): 12 months proposed.
- Employment-agreement review (legal): before public launch.
- Rig choice — 2D Rive/Lottie vs. 3D VRM — and whether the chosen TTS returns timing for visemes (engineering/product; decide after spike-05 and a first rig test).
- Whether attention stats are ever shown to the learner (product): default no for 4–12.
- Camera under CUBI/BIPA when processing is strictly on-device (legal): needed before the 9–12 toggle, not before Day 14.
- Should the tutor use the learner's first name in recovery steps for 4–8 (product/legal): assumed yes with the parent-entered display name only.
