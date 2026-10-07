# Natural Tutor

A voice-first 1:1 AI tutor, free and with no account, for any subject and any level from the early years to adult, with grades 4 to 9 first. It talks, listens, draws on a whiteboard, checks whether the learner actually understood, remembers what was hard, and keeps a planner of what is due — without ever grading its own help as mastery. Live at [kaizenedu.net](https://www.kaizenedu.net).

Guest mode is decision D35 (`docs/GUEST-MODE.md`): a visitor picks a grade level, a subject and says what they want to work on, and is in a session. Nothing is asked about them. Accounts, the parent app and billing remain in the code for later and are unlinked from the public surface; `docs/CONSOLIDATION.md` records what was taken from the other repositories and what comes next.

Built on a fork of [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) (MIT). Upstream's own README is preserved at [`docs/OPENMAIC-README.md`](docs/OPENMAIC-README.md); attribution is in [`LICENSE`](LICENSE), the site footer, and `/legal/credits`.

---

## Run it

```bash
pnpm install                  # builds the @openmaic packages in postinstall
cp .env.example .env.local    # then fill in the four variables below
pnpm dev                      # http://localhost:3000
```

Node ≥ 22.19, pnpm 10.

Four variables get you a working tutor. Everything else is optional.

| Variable | Without it |
| --- | --- |
| `GOOGLE_API_KEY` | the tutor cannot think — every turn refuses with `NOT_CONFIGURED` |
| `TTS_OPENAI_API_KEY` | the tutor cannot speak |
| `ASR_OPENAI_API_KEY` | the tutor cannot hear |
| `DATABASE_URL` | no guest or account can be created; the app runs in read-only preview mode with sample data |

Then open **`/api/tutor/health`**. It answers, without printing a secret, whether this deploy can teach:

```json
{
  "ok": true,
  "tutorMode": true,
  "database": true,
  "llm": { "model": "google:gemini-3-flash-preview", "source": "built-in", "key": true },
  "tts": { "provider": "openai-tts", "key": true },
  "asr": { "provider": "openai-whisper", "key": true },
  "staffAllowlist": 1,
  "safety": { "configured": true, "staffAddresses": 2, "webhook": false, "missing": [] },
  "support": { "configured": true, "missing": [] },
  "weeklyEmail": { "configured": true, "missing": [] },
  "missing": []
}
```

Anything in `missing` is a variable still to set; `email`, `safety`, `support` and `weeklyEmail` each say whether that path reaches a person and which variable is absent if not. This route exists because the first production deploy served sign-in, sessions and progress perfectly while every single turn died — the model and the keys were the only things absent, and nothing on the screen said so.

### Without a database

Leave `DATABASE_URL` unset and the product runs in **preview mode**: real screens, a fixed sample learner, and every write refused with `PREVIEW_READ_ONLY`. Useful for design work and for showing someone the shape of the thing.

Or run `pnpm dev:db` in a second terminal. It starts an in-memory Postgres (PGlite behind a socket) and prints the `DATABASE_URL` to export before `pnpm dev`; accounts, sessions and progress then work on this machine with no Neon project, and everything is gone when the process exits.

---

## What it does, and how to use it

### Starting (no account)

The landing page at `/` is the way in, and it is one press (D36). The visitor picks a level from a row of chips (before kindergarten, K to 3, 4 to 5, 6 to 7, 8 to 9, 10 to 12, college, adult; remembered in the browser) and presses **Talk to Sol** or **Type instead**. Inside that press the page unlocks audio and asks for the microphone, `POST /api/tutor/guest` with `open: true` creates an anonymous account and learner behind the same HttpOnly cookie every account uses and starts an *open session* in the same call, and the browser moves to the live screen with `?go=1`, which starts itself. The tutor speaks first: it says its name (`PRODUCT.tutorName`, `Sol` until the owner changes it) and asks what the learner is working on; the model's `[[topic {...}]]` tag then sets the subject and the learner's words on the session. The full form (every level with its hint, a subject, what to work on in your own words, voice or text) is one disclosure under the button for grown-ups and keyboard users; it starts a topic session directly. The level picks the band (prompts, session length, safety rules), not a birth year; no name, email, birth year or password is collected. A guest gets `GUEST.dailyMinutes` tutoring minutes per UTC day and the unchanged cost ceilings; **Start over** in the header deletes every row behind the cookie now, and the weekly cron deletes any guest idle for `GUEST.retentionDays` days. `/learn` is the guest's home afterwards: start something new, the planner, the problems they added, recent sessions, progress. A reload of a session page, or a shared link, lands on a one-button ready state, because browsers only start audio inside a gesture.

### Signing up (accounts, kept for later)

The account flows below still work at their URLs for the operator; nothing on the public surface links to them.

| Who | How |
| --- | --- |
| **Adult learning for themselves** | `/sign-up`, pick "for me". One profile, no consent gate. |
| **Parent** | `/sign-up`, pick "for my child". Creates the account, then a profile per child at `/parent/learners`. |
| **Teen (13–17)** | Either way round. A parent creates the profile with a login name and password, or the teen starts at `/sign-up` themselves and the account is held until a parent finishes it from the emailed link at `/parent-invite`. The teen signs in at `/sign-in` under their own name and never sees the parent's dashboard. |
| **Under 13** | Profiles can be created but are **locked** until the verifiable-parental-consent flow has counsel sign-off recorded in `compliance/`. A locked profile collects nothing and cannot start a session. This is the `under13_gate` setting, and it fails closed. |

### A session

Start one from `/` or `/learn`. A topic session (any subject) carries `topic = { subject, text }` and runs on the subject's synthetic skill (`S-math`, `S-science`, ...; `lib/tutor/graph/subjects.ts`) so checks, the mastery estimate, evidence and the recap all work off the fractions graph; the fractions to pre-algebra sequence with its placement check is still there under "Or pick up where you left off". The screen is deliberately shaped like a video call: the tutor on one tile, the whiteboard beside it, the running record underneath.

- **Talking.** Speech is captured in the browser, and a voice-activity detector (Silero v5 on-device, from `/vad/`, copied out of `node_modules` by `scripts/copy-vad-assets.mjs` before `dev` and `build`; an energy detector is the fallback) decides when the learner has stopped. How long it waits is per age band — 1,500 ms for 4–8 down to 700 ms for adults — because a child pauses *inside* a sentence and being cut off mid-thought is worse than a tutor that takes a beat. The same figure is the `thinkingPauseMs` on the wire, and since D38 the client reads it. A session started as "Type instead" never asks for the microphone; the dock offers it.
- **Waiting.** When the learner goes quiet mid-task the tutor waits 25 s (4–8) or 40 s (everyone else), then asks once whether they are still there or want a hint, and at most once more; a check-in never teaches (D38).
- **The screen.** The tutor's name and the AI label on one tile (pinned to the top on a phone), a caption of what it is saying or of what it heard, the board, the transcript, and a one-row dock: the voice control, a text field, end, and a menu for hands-free, mute and report. Time left is words ("12 min left") until the last two minutes.
- **Barge-in.** Talking over the tutor stops its audio within 300 ms.
- **Typing instead.** A text box always works, and works when audio does not. Push-to-talk on phones.
- **The whiteboard.** The tutor emits drawing actions inline with its speech — fraction bars, number lines, steps — which appear as it talks and pause when it does. It can also point: a soft highlight over the element it is talking about, or a hand-drawn underline, tick or ring.
- **Checks.** Periodically the tutor asks a question that is graded and recorded. Every check is labelled **assisted** or **unassisted** depending on whether a hint, a worked example, or the answer came first.
- **Coach mode.** Always on. For anything that looks like graded homework the tutor withholds the final answer until the learner has tried at least one step. After a real attempt, "just show me" gets a worked example and then a similar problem to do.
- **Ending.** Sessions end on time, at the band's length. WRAP writes a recap, a short practice list, and a note for the parent.
- **Breaks and reports.** For a learner under 18, thirty minutes of silence starts a new sitting, and the tutor gives one break reminder per three-hour boundary. Every session has a "Report a problem" button; an unsafe report, like a crisis match in the safety screen, pages a person with ids and never words (`docs/SAFETY-RUNBOOK.md`).

### Bringing your own material

At `/learn`, add coursework by typing a problem in, or by photographing a worksheet — the photo is extracted to text and mathematics server-side and never stored as an image. The tutor works from what you gave it. This is the main content path today; see [Course material](#course-material) below.

### Attention (camera)

Optional, on-device, and off by default for teens and adults. When enabled, face landmarks are computed in the browser at ≤ 10 fps to estimate whether the learner is still engaged, and a recovery ladder nudges gently before pausing the session. **No camera frame, landmark, embedding, or template ever leaves the browser** — that is one of the five invariants below, and it is enforced by a test.

### The parent side

| Page | What it is for |
| --- | --- |
| `/parent` | One next action, not a wall of graphs. |
| `/parent/learners` | Add, pause, or remove a child's profile. |
| `/parent/reports` | Per-skill progress. A skill is only called **mastered** after an unassisted check, and only called **confirmed** after a second unassisted check at least 24 hours later. The wording is careful on purpose. |
| `/parent/transcripts` | Every turn of every session, readable. |
| `/parent/data` | Export everything, or delete everything. |
| `/parent/billing` | Plan, minutes used, cancel. Warns at 80 %. |
| `/parent/consent` | Consent records and their versions. |
| `/parent/settings` | Camera, session length, and per-child controls. |
| The weekly email | Monday, for each child, only for a week in which something happened, leading with what was confirmed. One click unsubscribes. |
| `/support` | A message to a person. With `SUPPORT_EMAIL` set it is delivered; without it the message is saved and the form says nobody was told. |

### Staff accounts

An operator testing the product hits a 30-minute trial, a $3 session ceiling and a $12 daily cap — correct for a nine-year-old, useless for the person building it. Put an address in `TUTOR_STAFF_EMAILS` (comma-separated) and that account gets 50,000 minutes a month, a $50 session ceiling, a $200 daily cap, 25 profiles, and ten times every request limit.

Every one of those is still a finite number, so a runaway loop stops at a bill someone can absorb. There is no way to become staff except by the deployment's own environment saying so, and an unset variable makes nobody staff rather than everybody.

---

## Architecture

### The shape of it

```
Browser                          Server                        Providers
────────────────────────────     ───────────────────────       ─────────────
mic → VAD (on-device)            /api/tutor/asr            →   speech-to-text
  │                                  │
  └── audio blob ──────────────→ transcript
                                     │
whiteboard ← actions ←─────── /api/tutor/turn (SSE)         →   LLM (streaming)
speaker    ← audio   ←─────── /api/tutor/tts (per sentence) →   text-to-speech
                                     │
camera → landmarks (on-device, never sent)
                                     ↓
                              Postgres: sessions, turns, evidence,
                              mastery, misconceptions, usage ledger
```

A turn is one `POST /api/tutor/turn` returning `text/event-stream`. Frames arrive in the order `phase` → `text_delta` / `sentence` / `action` / `check` → `usage` → `done`, or a single `error` and stop. Sentences are handed to TTS as they complete rather than at the end, which is most of the latency budget. `lib/tutor/turn/README.md` is the wire grammar.

**Budget: first tutor audio ≤ 1.5 s p50 / 3.0 s p90 after end of speech.** Measured, not aspired to — `pnpm latency` is the harness, and `docs/SPIKE-latency.md` has the numbers.

### Where the code lives

| Path | What |
| --- | --- |
| `kaizen.config.ts` | Every product constant: age bands, cost ceilings, latency budget, student model, plan, staff limits, the models each stage runs on. The spec's numbers live here, not scattered through the code. |
| `lib/tutor/turn/` | The turn engine — prompt assembly, streaming, whiteboard action parsing, cost accounting, SSE. |
| `lib/tutor/voice/` | VAD, recorder, ASR and TTS clients, the sentence splitter, the cancellable playback queue, barge-in. |
| `lib/tutor/session/` | The session state machine: greet → intake → diagnose → work → check → wrap. |
| `lib/tutor/graph/` | The skill graph, the check-item bank, misconception tags. |
| `lib/tutor/billing/`, `lib/tutor/cost/` | Entitlement and the ceilings that bind before any provider is called. |
| `lib/tutor/auth/` | Server-derived identity. No route ever trusts a client-supplied account or learner id. |
| `lib/tutor/email/`, `lib/tutor/report/` | The email wrapper (Resend over `fetch`, suppression, one-click opt-out) and its templates; the weekly report's lead and the Monday cron. |
| `lib/tutor/safety/`, `lib/tutor/support/` | The pattern screen, the paging of a person on a crisis match or an unsafe report, the sitting clock; the support inbox. |
| `lib/tutor/metrics/` | The weekly board `pnpm metrics` writes: every rate with its denominator, nothing smoothed. |
| `components/tutor/` | The session UI, the presence, the whiteboard, the parent surfaces, the marketing pages. |
| `app/(learner)/`, `app/(parent)/` | Product routes. Route groups keep URLs at `/api/tutor/*` and `/api/parent/*`. |
| `tests/invariants/` | The five invariants below, as tests. |
| `eval/` | Red team, coach mode, persona and the item-bank pipeline (`eval/README.md`); reports land in `docs/evidence/evals/`. Upstream's own evals live alongside. |
| `compliance/` | Consent records, policy versions, vendor review, counsel sign-off. **Humans only** — no agent edits this without a person in the PR. |
| `docs/` | `SPEC.md` is the contract and `MVP-REFERENCE.md` narrows it for this build. `ARCHITECTURE-MAP.md` says which upstream files we keep, patch, or strip. `DECISIONS.md`, `PLAN.md`, `LOG.md`, `DO-THIS-NEXT.md` (the operator's list). `evidence/` holds the screenshots and eval reports, `metrics/` the weekly boards and latency runs, `CLAIMS.md` the ledger behind every public sentence. |

### The presence

The tutor is shown as an abstract luminous form, not a face. That is a decision, not a placeholder: a procedurally drawn face invites a comparison to a real one every time a learner looks at it, and without an illustrator you lose that comparison. Two attempts at a character rig were both read as "weird". An abstract presence cannot be uncanny because there is nothing to compare it to.

It still says the four beats of a turn through *structure* rather than expression — the form opens while listening, draws in while thinking, deforms with the voice while speaking, leans toward the whiteboard while drawing — so it survives `prefers-reduced-motion` and reads across a room. The character rig is kept behind a flag so both can be tested with real children. `components/tutor/avatar/presence-rig.ts` has the full reasoning.

### Model routing

Each stage resolves a model in the order **`MODEL_ROUTES[stage]` → `DEFAULT_MODEL` → the constant in `kaizen.config.ts`**. The live turn defaults to a fast model (674 ms p50 to first token, measured); grading, diagnosis and the session summary default to a stronger one, because nobody is waiting on those out loud.

The last fallback exists because config that can be absent will be absent: production once served everything except turns, for hours, because `DEFAULT_MODEL` lived in a `.env` that a serverless runtime never reads.

---

## The five invariants

These are not guidelines. Each is a test, and they run in CI on every push.

1. **No request can read another account's rows** through any API route.
2. **Audio bytes are never written** to disk, database, object storage, logs, or error reports.
3. **No camera frame, face landmark, embedding, or template leaves the browser.**
4. **Every session has a cost ceiling and every learner a daily cap** — staff accounts included.
5. **Provider keys exist only server-side**, and no client bundle contains one. `pnpm audit:client-bundle` plants canary secrets in a real build and scans every static file for them.

---

## Course material

`lib/tutor/content/item-bank.json` holds **118 check items** across the twelve fractions skills: 96 written for this product, eight per skill and across all five representations, with every wrong option tagged with the misconception it is there to catch, and 22 hand-verified items carried over from Kaizen-AI's seed (ids ending `-ka-NNN`) as a cross-check on the authored ones.

They are **not live yet**. An item reaches a learner only once `reviewed_by` and `reviewed_at` are set on it, and nothing in this repository may set those: not the generation pipeline, not an agent, not a test. A gate a machine can open is not a gate, and what is on the other side of it is questions asked of somebody's nine-year-old.

```bash
pnpm item-bank:review     # writes docs/ITEM-BANK-REVIEW.md
```

That sheet lists every item with its answer, its distractors and the reasoning, grouped by skill, with four questions to ask of each. Work through it, edit anything you disagree with, then stamp the items in the JSON. Until then the tutor writes its own checks on the fly, which works but does not accumulate.

The item-bank pipeline (`pnpm eval:item-bank`) generates candidates, has a *different* model solve each one blind, drops the ones that disagree, checks coverage, and writes a review sheet for a human to work through.

Nothing is copied from a textbook or a curriculum publisher. If that changes, the source and its licence get named on `/legal/credits` before any of it reaches a session — the openly licensed curricula (Illustrative Mathematics, Open Up Resources, OpenStax, all CC BY) are usable; EngageNY, CK-12 and Khan Academy are NonCommercial and are not.

---

## Commands

| Command | What |
| --- | --- |
| `pnpm dev` | Development server. |
| `pnpm dev:db` | An in-memory Postgres for local accounts and sessions; prints the `DATABASE_URL` to export. |
| `pnpm doctor` | Reads the environment and says what is missing and what it costs you. |
| `pnpm test` | Full unit suite. |
| `pnpm test:invariants` | The five invariants, on their own. |
| `pnpm test:e2e` | Playwright. |
| `pnpm lint` · `pnpm check` | ESLint · Prettier. |
| `npx tsc --noEmit` | Typecheck. Strict; no `any` in product code. |
| `pnpm latency` | The first-audio harness. `--mock` self-tests it without spending money. |
| `pnpm eval:item-bank` | Generate, solve, validate and package check items. |
| `pnpm eval` | The red-team, coach-mode and persona suites (`eval/README.md`); the model halves need `EVAL_MODEL` and a key. Reports land in `docs/evidence/evals/`. |
| `pnpm metrics` | The weekly board for the week that just ended, from `DATABASE_URL`, into `docs/metrics/<ISO week>.md`. Run it on Mondays. |
| `pnpm eval:red-team` · `pnpm eval:coach-mode` · `pnpm eval:persona` | One suite at a time. |
| `pnpm item-bank:review` | The review sheet for the authored items (`docs/ITEM-BANK-REVIEW.md`). |
| `pnpm audit:client-bundle` | Invariant 5, against a real build. |
| `pnpm skills:validate` | Lints the project skills under `.claude/`. |

---

## Deploying

Push to `main`; Vercel builds and deploys production.

The build runs `scripts/generate-runtime-config.mjs`, which reads the tracked `.env` and compiles the product's **non-secret** defaults into the server bundle — a serverless runtime reads no repo dotfile, and this is how `TUTOR_MODE`, `DEFAULT_MODEL` and `TUTOR_STAFF_EMAILS` reach it. The generator refuses anything shaped like a credential, so a key added to `.env` by mistake cannot reach a build artifact.

**Provider keys go in the host's environment variables**, never in the repo — set them in the Vercel project for Production and Preview, then redeploy without the build cache. A variable set on the host always overrides the baked copy, so moving any value into the dashboard needs no code change.

With `TUTOR_MODE` on, nothing upstream is served: its pages and every `/api/*` route outside the product's own answer 404, except `/api/health` and the staging access-code gate. Nothing is deleted to achieve that, so the weekly upstream merge stays clean.

CI runs three workflows on every push. `ci.yml` lints, typechecks, runs the unit suites including the storage package, and drives the engine's Playwright suite against a production build with the product off. `invariants.yml` runs the five invariants, the skills lint, the copy and prompt checks, and a canary build with the bundle audit. `storage-pg-contract.yml` runs the storage package against PostgreSQL 16. All three fit GitHub's hosted runners.

---

## Upstream merges

```bash
git fetch upstream main
git checkout -b chore/upstream-$(date +%F) main
git merge upstream/main       # theirs inside their files, ours inside ours
pnpm install && pnpm test && pnpm test:invariants && npx tsc --noEmit
```

Merge weekly. Upstream files are edited only through small patches carrying a `// KAIZEN:` comment explaining why. `docs/ARCHITECTURE-MAP.md` records every keep/patch/strip decision.

---

## Environment variables

`.env.example` documents every provider variable upstream supports. These are the ones this product reads.

### The product

| Variable | Scope | Purpose |
| --- | --- | --- |
| `TUTOR_MODE` | server | `1` turns product paths on and fences upstream off. Without it every product route is a 404; with it every upstream route is, except `/api/health` and the access-code gate. |
| `NEXT_PUBLIC_TUTOR_MODE` | build | Hides upstream's own UI in the client bundle. No security meaning; the server gate above is the authority. |
| `TUTOR_STAFF_EMAILS` | server | Comma-separated allowlist of operator accounts. Unset means nobody. A guest is never staff. |
| `DATABASE_URL` | server | Postgres, pooled endpoint. Unset ⇒ preview mode. |
| `DEFAULT_MODEL`, `MODEL_ROUTES` | server | Model per stage. Both optional — `kaizen.config.ts` has a working default. |
| `TUTOR_BAND_MODEL_ROUTES` | server | Per-band override, e.g. `{"13-17":{"fast":"openai:gpt-5.4-mini"}}`, for a provider whose terms exclude a band. Beats `MODEL_ROUTES` for that band; `/api/tutor/health` shows it under `llm.bandOverrides`. |
| `TUTOR_TTS_PROVIDER`, `TUTOR_TTS_VOICE`, `TUTOR_ASR_PROVIDER` | server | Override the default voice providers. |
| `TUTOR_DAILY_CAP_CENTS` | server | Per-learner daily ceiling. Ask before changing limits. |
| `TUTOR_PRICING_JSON` | server | Per-model prices for the usage ledger. Unpriced models charge a deliberately high estimate so the ceiling still binds. |
| `ACCESS_CODE` | server | Staging gate. The billing webhook path is whitelisted from it. |
| `RESEND_API_KEY`, `EMAIL_FROM` | server | Email through Resend: password reset, the parent invitation, the weekly report. Unset ⇒ the forms say so and nothing is sent. `EMAIL_FROM` is the Resend-verified sender, e.g. `Natural Tutor <hello@your-domain>`. |
| `APP_URL` | server | The public origin in emailed links and Stripe redirects. Unset ⇒ the requesting origin, which is right everywhere except a cron. |
| `SAFETY_ALERT_EMAILS` | server | Comma-separated addresses paged (ids only, never text) on a crisis match or an unsafe report; needs email. Unset ⇒ the flag row is written and nobody is told; `/api/tutor/health` shows `safety.configured: false`. See `docs/SAFETY-RUNBOOK.md`. |
| `ALERT_WEBHOOK_URL` | server | Optional. Receives the same ids as JSON on every safety event (a Slack incoming webhook works). |
| `SUPPORT_EMAIL` | server | Where `/support` messages go; needs email. Unset ⇒ the message is saved and the form says nobody was told. |
| `CRON_SECRET` | server | Any long random string. Vercel sends it as `Authorization: Bearer` on the schedule in `vercel.json` (`/api/tutor/cron/weekly-email`, Mondays); the route is 503 without it and 401 with the wrong one. The same run deletes guests idle for `GUEST.retentionDays` days, so without it the retention promise on the landing page is not kept. |

### Providers

`<PROVIDER>_API_KEY`, `_BASE_URL`, `_MODELS` for LLMs (`GOOGLE`, `ANTHROPIC`, `OPENAI`, …); `TTS_<PROVIDER>_API_KEY` and `ASR_<PROVIDER>_API_KEY` for voice. Server-side only, always.

### Everything else

`ASSET_S3_BUCKET` + AWS SDK variables for object storage; `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` for billing; `NEXT_PUBLIC_POSTHOG_KEY` and `SENTRY_DSN` for analytics and errors, both configured to capture no session recordings or media; `LOG_LEVEL`, `LOG_FORMAT` for logging, which carries ids and never transcripts, names, or media.

---

## Where things stand

- The free tutor works end to end on a deploy with the four variables: a visitor presses one button on `/`, the tutor says hello first and asks what they are working on, the session runs on any subject with a whiteboard the tutor draws on and points at, checks are graded and labelled, progress and the planner are on `/learn`, and Start over deletes everything. The account funnel (sign-up, the parent report, export and deletion) still works at its URLs. `docs/LOG.md` is the record of what merged and what each merge measured.
- `docs/REPLAN.md` (2026-09-30) is the plan from here: what the owner saw on the live product and why, the evidence on tutoring and latency (`docs/research/2026-09-30-*.md`), decisions D36 to D39, and three waves. Wave 1 is in: the one-press front door, the tutor's name, a tutor that waits (one clock for the presence rules, a greeting that is not a check-in, a slower ladder), the on-device voice detector actually loading, and the chrome diet on the session screen. Wave 2 (streaming speech both ways, measured) needs a keyed machine and billing on the Google key; wave 3 is the pedagogy depth.
- Waiting on a person, not on code: counsel's read of the guest posture for the under-13 levels (`docs/GUEST-MODE.md`, D35); the email, safety and support variables; the item review before any authored fractions item reaches a learner; the Stripe keys before billing is ever switched on. `docs/DO-THIS-NEXT.md` lists each with its command or setting.
- Not measured yet: any real delivery, the latency budget and the drawing-to-sentence budget on a keyed machine (the 2026-09-30 audit reads the shipped path at roughly 2.4 to 3.2 s to first audio; nothing but the model hop has a real number), and the evals' model halves. Every report says so rather than passing.

---

## Contributing

Read `CLAUDE.md` first — it is the working agreement, and it is short. In summary: product code lives only in the paths listed there; upstream files change only through small `// KAIZEN:` patches; TypeScript is strict with no `any` in product code; every screen ships loading, empty, error and offline states; every number in an acceptance criterion is measured and pasted into the PR rather than estimated.

Every sentence a stranger could hold us to has a row in `docs/CLAIMS.md` naming the code that makes it true; the claims scanner and the copy checks run in CI. This README describes the current state, and any change to what the product does, its screens, its commands, its variables or a number it quotes updates it in the same PR.

`compliance/` is off limits to agents without a human in the PR. Ask before schema migrations that drop columns, before changing pricing or plan limits, before touching billing webhooks, and before changing any safety prompt.
