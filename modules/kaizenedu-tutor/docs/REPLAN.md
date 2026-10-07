# Re-plan: from a working form to a tutor a child would keep talking to

Date: 2026-09-30. Status: adopted for wave 1 (this branch); waves 2 and 3 are
sequenced, not started. Supersedes the ordering in `docs/PLAN.md` for the
learner-facing product; the gates and invariants there still hold.

The owner's brief: a national tutor, low latency, something a human tutor can
be replaced by, free to use, grades 4 to 9 first and open to anyone. The owner
looked at the live product on 2026-09-30 and said it did not look good. This
document says what they saw, why, what the evidence says a tutor like that
needs, and the order of work.

## 1. What the owner saw, and what the logs say happened

Production is up and the code path works: the 2026-09-30 07:14 UTC production
session in the Vercel logs created a guest at level `k-3`, subject `test-prep`,
got one greeting turn, and ended within a minute. Hydration, the guest cookie,
the turn route and the heartbeat all ran. The product is not broken. It is
wrong in shape.

What the screens are, read from screenshots of the production build at 1280
and 390 px (`docs/evidence/replan/` after this branch ships):

1. **The front door is a parent's settings form.** Eight grade cards with
   hints written to a grown-up, nine subject chips, a text box, a Voice/Text
   toggle, then Start. Pressing Start does not start: it lands on a second
   screen ("Ready when you are") with another button, and only then does the
   tutor say anything. A ten-year-old reads none of it.
2. **The session screen is a video call with nobody in it.** A teal pebble
   with no name, a board that says "Nothing on the board yet", a transcript
   that says "Everything said in this session appears here", a countdown
   clock, a permanent "Your camera is off" row, three "AI tutor" pills, and a
   three-row dock that takes a quarter of a phone.
3. **The tutor nags.** With no learner input, the check-in rule fired three
   tutor turns inside thirty seconds, and each one advanced the explanation
   with a new hint ("Think about where the sun is", "Imagine a flashlight").
   That is the opposite of a tutor waiting for a child to think, and it gives
   the answer away.
4. **Text mode is not respected.** A session started as "Text" still asks for
   the microphone and switches itself to hands-free on a desktop.
5. **The voice pipeline is slower than it looks on paper and never measured.**
   The Silero voice detector never loads (its assets were never copied to a
   served path, so every session silently falls back to an energy detector
   on a deprecated main-thread audio node), the 600 ms end-of-speech wait is
   fixed and the per-band thinking pause the README calls live is not wired,
   speech recognition and synthesis are both whole-clip (no streaming), and
   fourteen database round trips sit on the path to first audio. The only
   measured hop is the model's first sentence (774 ms p50). Adding the
   unmeasured hops from vendor figures puts first audio at roughly 2.4 to
   3.2 s p50 from end of speech against a 1.5 s budget.
6. **Two things block "national" outright.** The Google key is on the free
   tier (5 requests per minute per model: one learner fits, three do not), and
   the Gemini API terms, as quoted in secondary sources, bar services "likely
   to be accessed by individuals under the age of 18". Nobody has read the
   primary text. Both are owner actions (section 8).
7. **The whiteboard is not readable on a phone** (a fixed 1000 px sheet scaled
   into 358 px makes 18 px text render at about 6 px), and on desktop the
   model's labels overlap its drawings.

Also found on the way: the reviewed item bank is empty in production (0 of 118
items stamped), so every check is model-authored live; the turn route logs
`Invalid state: Controller is already closed` on every barge-in; the local
Turbopack dev server in this sandbox never hydrates client components (a
tooling fault, not a product one; screenshots must come from `next build`).

## 2. What the evidence says a tutor like this needs

Five research passes ran on 2026-09-30 (realtime voice, latency audit,
pedagogy, competitors and UX, scale and cost). Their findings are in
`docs/research/2026-09-30-*.md`. The short version:

- **Real tutoring is worth about 0.3 to 0.4 SD**, not Bloom's two sigma, and
  the gains come from dosage, structure and trained tutors. The AI tutors
  that beat classrooms in RCTs (Harvard physics, Ghana, Nigeria, LearnLM in
  the UK) share four things: answers withheld, tight scaffolding,
  curriculum-aligned content, and forced engagement. Unguarded chat lowered
  scores; Khanmigo added almost nothing because students did not use it.
  Engagement, not access, is the binding constraint.
- **This codebase already has the guardrails** that matter: answer
  withholding behind a server-side attempt counter, assisted work that can
  never confirm mastery, a delayed unassisted check, misconception-driven
  re-teach, fail-closed grading. What it lacks is the front half: an opening
  that talks, a goal, a plan, spaced review beyond one 24-hour check,
  interleaving, a graph outside fractions, and a reviewed item bank.
- **The voice products parents rate open by talking.** Synthesis, Aristotle,
  COSMIQ, Speak and Duolingo start with a voice, not a form. Full-duplex
  speech-to-speech models shipped in 2026 (OpenAI, Google, Sesame) and set the
  feel people now expect: a name, a voice that starts inside a second, and a
  presence that reacts.
- **Latency.** A streaming cascade (streaming ASR with end-of-turn detection,
  the text model kept for teaching and the board, streaming TTS played from
  the first chunk) lands at roughly 0.8 to 1.6 s p50 first audio on vendor
  figures and keeps every guardrail, the tag grammar, the ceilings and the
  record. Speech-to-speech lands at 0.6 to 1.2 s but breaks the tag grammar,
  the pre-model safety screen, the per-turn ceiling, and the Vercel hosting
  model, and costs three to ten times more per session. Every figure that is
  not the model hop is a vendor or third-party number and is marked
  unverified until `pnpm latency --product` runs from a keyed machine.
- **Cost at scale.** On the cascade a 15-minute session costs about 25 to 65
  cents in vendor fees; on speech-to-speech 30 cents to a dollar sixty-five
  with caching. "Free, 120 minutes a day, no account" cannot survive national
  scale on either; the cap has to drop and a paid tier or sponsor has to
  exist. Prompt caching, a smaller static prompt and fewer database round
  trips are cost levers, not latency levers.

## 3. Decisions taken in this re-plan

These are recorded as D36 to D39 in `docs/DECISIONS.md` when wave 1 merges.

- **D36, the front door is one press and the tutor speaks first.** The
  landing hero is a level row, one big button, and a "type instead" link.
  The press unlocks audio, asks for the microphone, creates the guest and
  an open session in one call, and lands in the live session, which starts
  itself. The tutor's first words ask what the learner is working on; the
  subject is set from the answer with a `[[topic]]` tag. The full form
  (eight levels with hints, subject, words, mode) stays under a disclosure
  for grown-ups and for keyboard users.
- **D37, the tutor has a name.** `PRODUCT.tutorName` (one place to change).
  The "AI tutor" label stays beside the name, once, and the disclosure rule
  is unchanged: it says it is an AI when asked.
- **D38, the tutor waits.** Silence check-ins fire after 25 s (4 to 8) or
  40 s (everyone else), at most twice, and a check-in asks whether the
  learner is there or wants a hint; it never teaches, never advances, never
  reveals. The per-band thinking pause is the end-of-speech wait.
- **D39, latency architecture: streaming cascade first, measured before and
  after; speech-to-speech as a flagged pilot for 13+ only after the cascade
  is measured.** The order is: VAD assets and pause (wave 1), streaming TTS
  with PCM playback and fewer round trips (wave 2), streaming ASR with
  end-of-turn (wave 2), then the pilot if the cascade misses 1.5 s p50 on a
  phone.

Owner decisions still open (section 8): billing on the Google key or a
different live-turn model; the under-18 terms question; the free-minutes cap.

## 4. The target 60 seconds

0 s: the page shows a level row (already remembered on a return visit), one
big button "Talk to the tutor", and "Type instead". 1 s: the press unlocks
audio, asks for the microphone, creates the session, and the live screen
appears with the tutor's name and a ring that breathes. 2 to 3 s: the tutor
says "Hi, I'm Sol. What are you working on today?" and the words appear as a
caption under the ring. The learner talks; the ring fills toward them while
they speak; a caption shows what was heard as soon as it is recognized. Under
1.5 s after they stop, the tutor is answering, and the board draws while it
talks. Nothing counts down. Nothing asks for a camera. If the learner goes
quiet, the tutor waits half a minute and then asks, once, whether they want a
hint. At the end the tutor asks the learner to say in their own words what
they can do now, and the recap is built from that.

## 5. The ten highest-leverage changes, in order

Effort: S under a day, M one to three days, L a week or more. Acceptance is a
number or a screenshot, never an adjective.

| # | Change | Files | Effort | Acceptance | Wave |
| --- | --- | --- | --- | --- | --- |
| 1 | One press, tutor speaks first; open session; `[[topic]]` tag sets the subject | `components/tutor/marketing/landing.tsx`, `learn/guest-start.tsx`, `session/session-screen.tsx`, `use-tutor-session.ts`, `api/tutor/guest/route.ts`, `lib/tutor/session/{service,state,topic}.ts`, `turn/{tags,engine}.ts`, `prompts/build.ts` | M | Landing to first tutor words is one press; `firstAudioAfterStartMs` measured on the metrics overlay | 1 |
| 2 | Session chrome diet, tutor name, live caption, one-row dock, text mode respected, board first on phones | `session/{tutor-tile,dock,transcript,session-screen}.tsx`, `session.css`, `kaizen.config.ts` | M | 390 px screenshot: board readable, dock one row, one AI label; text session opens no microphone | 1 |
| 3 | The tutor waits: check-in windows, non-teaching check-in, thinking pause wired | `kaizen.config.ts`, `prompts/build.ts`, `lib/tutor/presence/rules.ts`, `voice/vad.ts`, `use-tutor-session.ts` | S | Presence tests updated; 60 s of silence produces at most one check-in that contains no hint | 1 |
| 4 | Silero VAD actually loads; end-of-speech from the model, not RMS | `scripts/copy-vad-assets.mjs`, `public/vad/`, `voice/vad.ts` | S | No 404 under `/vad/`, no ScriptProcessorNode warning, engine reports `silero` | 1 |
| 5 | Streaming TTS with PCM chunk playback, and the ledger writes off the critical path | `lib/audio/tts-providers.ts`, `api/tutor/tts/route.ts`, `voice/{tts-client,playback-queue}.ts`, `api/tutor/{asr,turn}/route.ts` | M | `tts_first` p50 under 250 ms on `pnpm latency --product`; round trips on the first-audio path 14 → 6 | 2 |
| 6 | Streaming ASR with end-of-turn, browser-direct via a short-lived token; the 600 ms hangover retired in hands-free | new `api/tutor/asr/token`, `voice/asr-client.ts`, `voice/vad.ts` | M-L | eos → first audio p50 under 1,500 ms desktop, under 2,000 ms on an iPhone over LTE | 2 |
| 7 | Live-turn model off the free tier and off a provider whose terms exclude minors; prompt caching verified | Vercel env (`TUTOR_BAND_MODEL_ROUTES`), `docs/DECISIONS.md`, `llm-call.ts` cache logging | S (owner) | `pnpm latency --product` p90 per candidate; `cachedContentTokenCount` logged | 2 |
| 8 | Opening intake that ends in a placed goal, a visible three-step plan, `[[plan]]` and `[[step_done]]` tags; wrap asks the learner to say it back | `session/state{,-machine}.ts`, `turn/{tags,engine}.ts`, `prompts/{build,wrap}.md`, session UI checklist | M | A session row carries goal and steps; the recap quotes the learner's own summary | 3 |
| 9 | Spaced review with an expanding schedule (1, 3, 7, 21, 60 days) and interleaved checks | `model/student-model.ts`, `graph/next-skill.ts`, `session/service.ts`, one additive migration | M | A confirmed skill gets a `nextCheckAt`; every third check targets another touched skill | 3 |
| 10 | Content: the 118 fraction items reviewed; grade 4 to 9 math strands, reading and science slices with tagged banks; a wheel-spinning guard | `lib/tutor/content/item-bank.json`, `graph/skill-graph.json`, `graph/next-skill.ts` | L (content) + S | `seeded N check items` with N > 0 in the production log; two misses drop to a prerequisite | 3 |

Not in the ten but cheap and done in wave 1: the SSE writer no longer throws
after a client abort; the guest Learn page for a returning guest is one
"continue" card with the rest under a disclosure.

## 6. Stop doing

- Stop shipping unmeasured latency. Every PR on the turn path pastes
  `pnpm latency --product` p50/p90 before and after, and a phone
  `?metrics=1` figure. The harness exists; it has never run with keys.
- Stop treating the free Gemini key as production. One learner at a time is
  not a product.
- Stop writing the front door to the parent. The parent gets a page of their
  own (the "What it will not do" and "Privacy in plain words" copy is the
  best in the product and moves to a "For grown-ups" page).
- Stop adding dashboard panels for a guest. A guest sees one next step.
- Stop letting a check-in teach.

## 7. Waves

**Wave 1 (this branch): looks and behaves like a tutor.** Changes 1 to 4,
the abort fix, docs. Validated with `tsc`, eslint, prettier, the tutor and
invariant suites, and production-build screenshots at 390 and 1280 px in light
and dark. No new vendor, no new key, no migration.

**Wave 2 (needs a keyed machine and billing): fast.** Phase 0 measure first
(one day, no code): Google billing on or the live turn routed to a paid
provider; `pnpm latency --product --turns 10` from a keyed machine; ten phone
turns with `?metrics=1`; both tables into `docs/SPIKE-latency.md`. Then
changes 5, 6, 7 in that order, each re-measured. Exit: eos → first audio p50
under 1.5 s on desktop and under 2 s on a phone, cost per 15-minute session
under 65 cents.

**Wave 3: teaches like the evidence says.** Changes 8, 9, 10; the parent
trust page with measured numbers; the writing and read-aloud check types;
a correctness gate on spoken arithmetic. Exit: eval parity on the new
prompts, a reviewed bank in production, spaced review live.

**Pilot (after wave 2, only if it misses):** speech-to-speech on OpenAI for
the 13 to 17 and adult bands behind `TUTOR_BAND_MODEL_ROUTES`, server-created
call plus sideband on a small always-on host, tools mirroring the tag grammar,
live metering, post-hoc safety cancel, typed checks kept server-graded.

## 8. Owner actions this week (no code can do these)

1. **Google Cloud billing on the `GOOGLE_API_KEY` project**, or route the
   live turn to a paid provider with `TUTOR_BAND_MODEL_ROUTES` (OpenAI and
   Anthropic keys exist in Vercel; the Anthropic one reads as unset at
   runtime and should be checked).
2. **Read the Gemini API terms (ai.google.dev/gemini-api/terms) for the
   under-18 clause** and decide: written clearance, Vertex AI under Google
   Cloud terms, or another provider for the 4 to 8, 9 to 12 and 13 to 17
   bands. Record it in `docs/DECISIONS.md`.
3. **Decide the free cap.** 120 minutes a day per guest is 6 to 8 dollars a
   day per heavy user on speech-to-speech and about 2 to 5 dollars on the
   cascade. Thirty minutes a day free, more with a sponsor code, is the
   working assumption for wave 2.
4. **Review the 118 fraction items** (four questions each, in
   `docs/ITEM-BANK-REVIEW.md`), or name a reviewer. Until then every check
   is model-authored and the diagnostic runs on invented items.
5. **Confirm the tutor's name.** `Sol` is the placeholder in
   `kaizen.config.ts`; it is one constant.

## 9. Numbers, and where they go

| Number | Where measured | Where recorded |
| --- | --- | --- |
| Landing press to first tutor audio | `?metrics=1` overlay, `firstAudioAfterStartMs` | `docs/metrics/<week>.md` |
| End of speech to first audio, p50/p90, desktop and phone | `pnpm latency --product`, `?metrics=1` | `docs/SPIKE-latency.md` |
| Cost per 15-minute session | `usage_ledger` sums per session | `docs/metrics/<week>.md` |
| Sessions per day, minutes per session, return rate | `sessions` table | `docs/metrics/<week>.md` |
| Check-ins per session and hints per check-in | `turns` with the silence marker | eval report |
| Checks right without help, delayed checks confirmed | `evidence` | progress page, weekly email |

Nothing in this table becomes public copy without a `docs/CLAIMS.md` row and
a file under `docs/metrics/`.
