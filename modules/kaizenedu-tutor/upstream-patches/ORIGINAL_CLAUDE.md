# Natural Tutor — CLAUDE.md

Natural Tutor is a voice-first 1:1 AI tutor with a face, built on a fork of
OpenMAIC (MIT). `docs/SPEC.md` is the contract; decisions D1–D16 there are
made. Disagree in `docs/DECISIONS.md`, never by building around them.
`docs/BUILD-PROMPT.md` is the operating manual for every seat (lead, builder,
reviewer). `docs/ARCHITECTURE-MAP.md` says which upstream files we keep, patch,
or strip. `docs/PLAN.md` says what must be true at each gate.

## Repo rules

- Product code lives only in `app/(parent)/`, `app/(learner)/`, `lib/tutor/`, `components/tutor/`, `kaizen.config.ts`, `compliance/`, `eval/`. Upstream files are edited only through small patches with a `// KAIZEN:` comment explaining why. `TUTOR_MODE=1` gates every product path.
- `upstream` remote points at `THU-MAIC/OpenMAIC`; merge upstream weekly on a branch; resolve conflicts in favor of upstream inside their files and in favor of ours inside ours.
- Invariants are tests, and they run in CI: (a) no request can read another account's rows through any API route; (b) audio bytes are never written to disk, database, object storage, logs, or error reports; (c) no camera frame, face landmark, embedding, or template leaves the browser; (d) every session has a cost ceiling and every learner a daily cap; (e) provider keys exist only server-side and no client bundle contains them.
- TypeScript strict. No `any` in product code. No new dependency without a one-line justification in the PR; prefer what the repo already has.
- Every screen ships with loading, empty, error, and offline states. Every form has validation, focus management, and keyboard access. Semantic HTML first; ARIA only to fill gaps.
- Performance budgets: first tutor audio ≤ 1.5 s p50 / 3.0 s p90 after end of speech; session screen interactive ≤ 2 s on a mid-range phone; attention sensor ≤ 10 fps and disabled automatically when the device can't hold 5.
- Logs and analytics carry ids, never transcripts, names, or media. PostHog and Sentry are configured to capture no session recordings or media.
- Nothing in `compliance/` is edited by an agent without a human in the PR. Policies, notices, and consent language ship only after counsel review is recorded there.
- Commits: present-tense, one intent each; never rewrite shared history; never force-push `main`; never delete a branch you didn't create.
- Ask before: schema migrations that drop columns, changing pricing or plan limits, touching billing webhooks, changing any safety prompt, or altering a gate date.

## Skills — load before you touch the area

| Skill | Load it when |
| --- | --- |
| `openmaic-internals` | Reading or patching anything under `lib/`, `app/api/`, `components/` that upstream owns; deciding keep/patch/strip; merging upstream. |
| `tutor-loop` | Building the session state machine, prompts, checks, student model, diagnostic, coach mode, WRAP, or anything in `lib/tutor/`. |
| `voice-pipeline` | ASR, TTS, VAD, barge-in, playback queue, the latency harness, or any change to a turn's audio path. |
| `presence-layer` | The avatar (`AvatarDriver`, Rive rig), attention sensing (MediaPipe on-device), the recovery ladder, the call-style layout, the no-egress audit. |
| `minors-privacy` | Anything that touches a learner under 18: consent, notices, retention, deletion, camera, audio, vendors, analytics, `compliance/`. |
| `design-system` | Any UI work: tokens, type, motion, screen states, kids' vs teens' vs parents' surfaces. Loads `ui-craft` and `design-taste-frontend` too. |
| `pedagogy-fractions` | The skill graph, check items, misconception tags, diagnostic items, re-teach strategies, item bank pipeline, parent report wording. |
| `release-checklist` | Before any PR merge, any deploy, and the Gate 1/2/3 launch checks; the evidence and metrics report. |
| `kaizen-ai-port` | Before reading any file under the Kaizen-AI clone, any PR that ports from it, the item converter, the translation rules and gotchas. |
| `parent-comms` | The parent report wording, the weekly email, the parent invitation, password reset, token links, the email wrapper, opt-outs. |
| `claims-discipline` | Any sentence on the landing page, a legal page, a billing screen or an email; any number shown to a parent; `docs/CLAIMS.md`; the claims scanner. |

## Working agreements

- Read the issue, then the spec sections it cites, then the code you will touch. Post a ≤10-line plan on the issue before building.
- Thinnest vertical slice that makes every acceptance criterion true end to end. No stubs presented as features, no `TODO` on a shipped path, no placeholder data on a real screen, no control that does nothing.
- Measure every number in an acceptance criterion and paste it in the PR. Never fabricate, smooth, or cherry-pick a number.
- PRs under ~400 changed lines, titled with the issue, body = what changed, evidence, deferred and why, issue link. Merge only green and reviewed, then add one line to `docs/LOG.md`.
- `README.md` describes the current state. A PR that changes what the product does, its screens, its commands, its variables, or a number it quotes updates the README in the same PR.
- Commands: `pnpm dev` · `pnpm test` · `pnpm test:invariants` · `pnpm lint` · `npx tsc --noEmit` · `pnpm check` (prettier) · `pnpm test:e2e` · `pnpm eval` (see `eval/README.md`) · `pnpm latency` (see `scripts/latency-harness.ts`).
