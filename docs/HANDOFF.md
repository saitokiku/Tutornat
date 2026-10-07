# Handoff — next integrated learning release

**Newest direction:** one fused learning environment across ages, visual work first, natural
low-latency voice/touch/keyboard together, future optional face/gaze, and maximum model quality before
cost optimization. Website ornamentation is later. Owner requested this planning pass before building.

Start with [the implementation plan](plans/2026-10-07-integrated-learning-release.md), then its
[product spec](specs/2026-10-07-one-learning-workspace.md),
[model/voice/Jev spec](specs/2026-10-07-models-voice-and-jev.md), and
[audit](reviews/2026-10-07-system-audit.md). T01–T13 are **not started**.
Model selection uses [independent benchmark evidence](reviews/2026-10-07-model-benchmark-evidence.md)
to shortlist, then frozen blinded product tests to choose each role. No hosted winner is claimed.

Fresh base `d8d8166`: verify passed (2,372 tests); Playwright **148 passed, 22 failed, 16 skipped**.
Remote `main` and `foundation` both pointed at that SHA during review; local `main` was stale.
Check remote state before building. Documentation lives on `codex/integrated-learning-plan`.

Preserve all Claude worktrees. The numbers-speller WIP includes untracked implementation/tests despite
the earlier “not started” label below. Recover selected polish/content fixes using the audit's table;
do not merge `content-merge` wholesale. Fresh audit evidence supersedes historical counts below.

**Completed:** review, real local browser walk, fresh checks, product/model design and exact build plan.
**Next:** T01–T04 reliability/authority, then shared workspace/attention/voice and creation.
**External dependencies:** production credentials/entitlements, child-data review, teacher/Spanish
review, device voice audition and pilot participants. These do not block synthetic/local implementation.

---

# Earlier handoff — KaizenEDU 1.0 build, stopped 2026-10-07

Historical build record; use the current sequence above where priorities conflict.
Earlier plan: [plans/2026-10-07-kaizenedu-1.0-plan.md](plans/2026-10-07-kaizenedu-1.0-plan.md).

## Where things are

| Branch / commit | State |
|---|---|
| `foundation` @ 49c6079 (pushed) | **Green**: lint, typecheck, 2,372 unit tests, production build (50 pages). e2e: 138 of 152 pass; the 14 failures (7 tests × 2 projects) are listed in [handoff/e2e-failures.txt](handoff/e2e-failures.txt). |
| `content-merge` (pushed) | `foundation` + all 19 content packages (≈ +210 skills, ≈ 90 reading passages, 48 courses, ≈ 95 sources) + one union-merge repair. **Not green**: 20 unit tests fail — [handoff/content-merge-failing-tests.txt](handoff/content-merge-failing-tests.txt) (skill map ids/prereqs, catalogue band/related-course lookups, course suggestions, tutor-demo lesson matching, grammar/reading strand tests, review/EventForm/TutorChat tests that read the catalogue). |

On `foundation`: all 13 feature packages (calendar week, Today, learner model + outcomes, family + growth + nudges, intake + item page, lesson stage + 7 widgets, courses path + source-built courses, practice touch inputs + runner, voice layer, AI infrastructure — evals, spend caps, course cache —, backend — Postgres/auth/sync/re-check/consent scaffolding —, tutor — board, knowledge cards, AI tools, photo —, trust — privacy/terms, export/delete, weekly email, /review, scrubbed logs) plus the design system (tokens, K–2 band, primitives, shell, landing) and the spotlight engine (not yet wired into screens).

## Work in progress, saved as commits (continue from these; never redo them)

| What | Commit (local worktree branch) | Notes |
|---|---|---|
| Polish: Today/family/growth | 5d6ca5f | started; dogfood #3 #10–13 |
| Polish: intake/calendar/shell/auth | 43d4b71 (wip) | started; dogfood #1 #2 #4 #9 |
| Polish: practice, learn, tutor | not started (base 8f1af04) | — |
| Live Tutor phase A | not started (base 8f1af04) | spec: [plans/2026-10-07-live-tutor-spec.md](plans/2026-10-07-live-tutor-spec.md) |
| Content fix passes | math-k2 00f7234 (wip), math-35 966198b, math-89 7348ac9 (wip), grammar-35 3ab4533, reading-35 c5267c6 | apply [handoff/content-audits.json](handoff/content-audits.json) (audit findings for 15 items; sci-69 and res-ela-sci audits not run) |
| Learning-loop design revision | not finished | panel synthesis: [handoff/learning-loop-panel-synthesis.md](handoff/learning-loop-panel-synthesis.md) — revise to the owner's rules in plan §2.10's header note before it replaces §2.10 |

Find a worktree commit with `git log --all --oneline | grep <sha>`; they live under `.claude/worktrees/` (local only, ignored).

## Next, in order (Queue 4)

1. **`content-merge` green**: fix the 20 failing tests at their root (duplicate/ordering of skill ids and prereqs across strands; catalogue tests assumed 13 courses; tutor-demo/course suggestions now see 61 courses), then merge into `foundation`, full verify + e2e.
2. **Content audits**: apply [handoff/content-audits.json](handoff/content-audits.json) (≈ 255 findings; continue the fix WIPs above); run the two missing audits.
3. **Polish batch 1**: the 13 dogfood findings ([dogfood/2026-10-07.md](dogfood/2026-10-07.md); #5 is a blocker — Enter after a hint takes another hint), the design critics' findings and follow-ups ([handoff/requests/design.json](handoff/requests/design.json)), the 14 e2e failures, and every package's cross-file `requests` ([handoff/requests/](handoff/requests/)). Five disjoint areas: practice · Today/family/growth · learn/stage/catalogue K–2 visuals · intake/calendar/shell/auth · tutor.
4. **Live Tutor** (P1–P5 of the spec; critics' raw audits in [handoff/live-tutor-audits.json](handoff/live-tutor-audits.json)): phase A = numbers speller, voice tiers, one app voice, one model call per spoken turn, latency eval (lib/server only); phase B = wire screens, the tutor cursor synced to speech, data-spot ids, clips.
5. **Learning loop**: finish the revision, replace plan §2.10, build its packages.
6. **Hands-on pass** after each batch (owner rule) → findings → fixes.
7. Cross-cutting review → e2e + axe at 1440/390 → preview deploy → final report.

How the build ran (reuse): parallel packages in isolated worktrees from a fixed SHA, each build → two adversarial reviews → fix, then cherry-pick onto `foundation` and check (`npm run verify`, `CI=1 E2E_PORT=3291 npx playwright test` from `apps/web`). Agents must clone node_modules (`cp -cR`, Turbopack refuses symlinks), commit as they go, and write big files in pieces (an author once hit the 128k output cap). Keep the main checkout's working directory inside the repo when launching worktree agents.

## Owner's rules added this session (also in the plan and memory)

- Same visual world, max craft ("most advanced UI ever"; no slop).
- The tutor points at anything on screen (spotlight); voice that isn't uncanny, real time, with attention that moves with the words.
- Gamified engagement is fine when it serves the learner's own goal — but only where evidence says it works; the product is a clean teacher replacement.
- Merge as you go; use what we build and feed it back (dogfood after every batch).
- Scope: K–9 math, science, English, EN/ES.

## Blocked on the owner (the human parts)

- **Keys / accounts:** Anthropic key + `KAIZEN_AI=anthropic` on Vercel; Neon Postgres (`DATABASE_URL`); Resend; ElevenLabs + Deepgram (+ `KAIZEN_VOICE=vendor`); a Vercel Blob token for voice clips.
- **Hygiene:** rotate the six keys committed in the old KaizenEdu repo; delete the ~100 stale env vars on the Vercel project.
- **Decisions:** voice audition pick (one bilingual voice or two matched); final wording of tutor openings and consent text.
- **People:** counsel for COPPA (consent method, profiling, voice); a teacher reviewer (draft banks → `/review`); a native Spanish reviewer; pilot families.
- **Go-ahead** for kaizenedu.net (preview deploys only until then).
