# Handoff — KaizenEDU 1.0 build (closed out 2026-10-08)

Start here. Then [STATUS.md](STATUS.md) (owner-blocked list at the top, then Queue 4) and the plans:
[1.0 plan](plans/2026-10-07-kaizenedu-1.0-plan.md) · [live tutor spec](plans/2026-10-07-live-tutor-spec.md) ·
[tutor theater spec](plans/2026-10-07-tutor-theater-spec.md).

## State at close-out

- **GitHub `main` = `foundation`**, all green: lint, typecheck, 5,032 unit tests (166 files), production
  build, browser suite 185 passed / 0 failed / 17 skipped (skips need keys or a database).
- **Live:** www.kaizenedu.net (Vercel project `kaizenedu`, demo mode until keys are added). Redeployed at close-out.
- **On `main`:** all 13 feature packages; design system, shell, landing; spotlight engine; the 19 content
  packages (≈ 390 skills, ≈ 90 reading passages, 61 courses, ≈ 110 sources) with the audit fixes for
  every strand (12 fully re-verified, 7 partly — below); Codex's T01 journeys/focus fixes, safety screens on
  every AI route, durable learning evidence, its audit and specs as inputs; Live Tutor phase A (voice library:
  number speller EN/ES, voice tiers, one app voice, spoken answers checked in code, one model call per spoken
  turn, latency eval) — not wired into screens yet; the learning-loop design (plan §2.10); the tutor theater spec.

## Interrupted long tasks — how to resume each (none of this work is lost)

| Task | What is done | What is left | Where |
|---|---|---|---|
| **Content audit fixes** | 19 strands fixed and merged; 12 re-verified clean | 7 strands' re-fix was cut off: math-k2 (6 open items), eng-reading-35 (9), cat-eng-k5 (7), eng-reading-69 (12), cat-math-69 (3), cat-sci-69 (7), sci-69 (11) | open items with fixes: [handoff/content-refix-open.json](handoff/content-refix-open.json); original findings: [handoff/content-audits.json](handoff/content-audits.json). Fix on `main`, then one checker per strand. |
| **Polish batch 1** | only "a topic word links the skills at the learner's grade" (intake) landed | practice, Today/family/growth, learn/stage K–2 visuals, intake/calendar/shell/auth | inputs: [dogfood/2026-10-07.md](dogfood/2026-10-07.md) (#5 fixed), [handoff/requests/design.json](handoff/requests/design.json) (critics' findings), [handoff/requests/*.json](handoff/requests/), [reviews/2026-10-07-system-audit.md](reviews/2026-10-07-system-audit.md). Tutor-screen items go to Live Tutor B. |
| **Theater amendment** (owner: take OpenMAIC's HTML interactives, project-based learning, multi-agent classroom behind a button) | OpenMAIC maps + the amended spec, as a draft | the three attacks (browser sandbox security, child safety/privacy, teaching value) and the final spec | draft: [plans/2026-10-07-tutor-theater-amendment-draft.md](plans/2026-10-07-tutor-theater-amendment-draft.md); maps: [handoff/theater-amendment-maps.json](handoff/theater-amendment-maps.json). Attack, finalize, replace the theater spec. |
| **Live Tutor phase B** | phase A merged; wiring steps written | VoiceRoot in the root layout, every speaker through it, the tutor cursor + attention scheduler, `point_at` + data-spot ids on every screen, Talk/drawer/stage/K–2 Today states, e2e | `apps/web/src/lib/voice/WIRING.md`, live tutor spec P3–P5, `docs/spotlight.md` |
| **Account authority (Codex T03)** | archived on `origin/codex/account-authority` | finish as the M5 accounts/consent step per [handoff/codex-review-2026-10-07.md](handoff/codex-review-2026-10-07.md) | after Live Tutor B |

## Next, in order

1. Finish the 7 content strands' open items.
2. Polish batch 1 (four areas), then a hands-on pass (owner rule: use it and feed it back).
3. Theater amendment attacks → final theater spec.
4. Live Tutor phase B (screens, voice, glow and cursor together).
5. Tutor theater T0–T9 (the tutor directs; every session is recorded; lessons multiply; HTML interactives sandboxed, projects, classroom mode behind a button).
6. Learning-loop build packages (plan §2.10).
7. Account authority / consent (M5), cross-cutting review, deploy, report.

How the build ran (reuse it): packages in isolated git worktrees from a fixed SHA; build → adversarial
reviews → fix; cherry-pick onto `foundation` with `-x`; `npm run verify` and
`CI=1 E2E_PORT=3291 npx playwright test` from `apps/web` before every push; `main` fast-forwards to `foundation`.
Agents clone node_modules (`cp -cR`), commit as they go and write big files in pieces.

## Blocked on the owner

Keys (Anthropic + `KAIZEN_AI=anthropic`, Neon `DATABASE_URL`, Resend, ElevenLabs + voice ids EN/ES,
Deepgram, Vercel Blob), hygiene (rotate the six leaked keys; delete stale Vercel env vars), the decisions
listed at the top of STATUS (vendors, spend ceilings, voice pick, help-counting policy, …), counsel for
COPPA, teacher and Spanish reviewers, pilot families.

---

## Earlier handoff (2026-10-07 evening), kept for detail


Read this first, then [STATUS.md](STATUS.md) (the owner-blocked list at the top, then Queue 4's
"Next, in order") and [plans/2026-10-07-kaizenedu-1.0-plan.md](plans/2026-10-07-kaizenedu-1.0-plan.md).
Several agents were committing while this was written. The SHAs below are a snapshot from
2026-10-07 at 20:38. Check `git log foundation` and `git worktree list` before you continue anything.

## Current state

- **Plan of record: Queue 4** (the 1.0 build), carried on from where it stopped. ChatGPT/Codex worked
  on the repo in between, on four `codex/*` branches. Each was tested and reviewed twice; what was
  worth keeping is being taken onto `foundation` in pieces, never by merging the branches (the first
  one, 0bac96a, rewrote the authority docs). Codex's audit items are new Queue 4 steps; its T01–T13
  plan is a mapped input ([plan](plans/2026-10-07-integrated-learning-release.md), first section).
  Adopting it instead is the owner's decision 1. The judge's full fix lists for each Codex commit,
  its owner decisions and its integration plan are in
  [handoff/codex-review-2026-10-07.md](handoff/codex-review-2026-10-07.md).
- **`foundation`** is d34f845 (pushed): d8d8166 plus the learning-loop plan (7327802), the finished
  content audits (6914329) and the **content merge** (d34f845, Queue 4 #1: all 19 content packages,
  with root fixes for the 20 tests that failed).
- **Not on `foundation` yet:** steps 0a (T01 code plus its fix list) and 0b (the rule-10 safety
  screens), committed on `worktree-wf_8bf8e121-43e-1` and based on d8d8166. They need a rebase onto
  `foundation`, then verify and the full browser suite, then a push. Until they land, `foundation`
  lacks the T01 fixes. The four handoff files marked "fixed in T01" (e2e-failures.txt, trust.json,
  family.json, dogfood #5) describe that branch.
- **Checks:** at d34f845 the full unit suite passes (143 files, 4,088 tests, run for this update).
  Lint, typecheck, the build and the browser suite were not run on it here. Baseline d8d8166: verify
  PASS (2,372 unit tests), browser suite 148 passed / 22 failed / 16 skipped
  ([baseline](reviews/2026-10-07-baseline.json)). Codex measured T01 (ec7b776) at 174 / 0 / 16
  ([evidence and the 16 skips](reviews/integrated-release-evidence.md)). Step 0a's own gate is not
  recorded yet.
- **Learning loop:** plan §2.10 is now the revised learning loop, and §3.4 puts it in the engine
  (`foundation` 7327802). Its build packages are Queue 4 #5.
- **Owner-blocked:** credentials and access, key hygiene (rotate the six leaked keys first), 17 new
  decisions plus the carried-forward ones, and people. All of it is at the top of
  [STATUS](STATUS.md), and each decision has the default that holds until the owner answers.

## Where things are

| Branch / commit | State |
|---|---|
| `foundation` (d34f845, pushed) | d8d8166 + the learning loop (7327802) + the content audits (6914329) + the content merge (d34f845). The unit suite is green at d34f845. The browser suite was not run on it; expect at least the baseline failures until 0a lands. |
| `worktree-wf_8bf8e121-43e-1` (850a186) | Steps 0a and 0b, not on `foundation` yet. 0a: c8dc7ab (ec7b776 code, no docs), a493d06 (dogfood #5 in both orders, AnswerPad focus), 05031fc (same-route hand-over), 966650d (e2e selectors), df04156 (DESIGN.md motion line). 0b: 3bca9bb (course goal screened), 850a186 (extract and coach screened). Next: rebase onto `foundation`, verify, the full browser suite, push. |
| `content-merge` (pushed, 4a6376b) | Merged into `foundation` as d34f845, so it is no longer a separate step. Its test fixes came from `worktree-wf_4d287928-e43-1` (49cc979, 083ca6e, 5afb688) and `-3` (df9e110, 218eafd, b938901). [handoff/content-merge-failing-tests.txt](handoff/content-merge-failing-tests.txt) is the record of what failed. |

On `foundation`: all 13 feature packages (calendar week, Today, learner model + outcomes, family + growth + nudges, intake + item page, lesson stage + 7 widgets, courses path + source-built courses, practice touch inputs + runner, voice layer, AI infrastructure — evals, spend caps, course cache —, backend — Postgres/auth/sync/re-check/consent scaffolding —, tutor — board, knowledge cards, AI tools, photo —, trust — privacy/terms, export/delete, weekly email, /review, scrubbed logs) plus the design system (tokens, K–2 band, primitives, shell, landing), the spotlight engine (not yet wired into screens) and the 19 content packages (drafts behind the Draft labels).

### The Codex branches (archive; leave untouched)

| Branch (PR) | Commit | What happened to it |
|---|---|---|
| `codex/integrated-learning-plan` (PR #2, draft) | 0bac96a | Docs only. Its audit, baseline, benchmark review, two specs and plan were taken as inputs with our edits (step 0c). Its STATUS, HANDOFF, DECISIONS, PRODUCT, README and ROADMAP rewrites were not taken. Merging PR #2 would bring them in. |
| `codex/restore-learning-journeys` (PR #3) | ec7b776 | T01. Its `apps/web` and DESIGN.md taken without its docs, plus a fix list (step 0a, on `worktree-wf_8bf8e121-43e-1`, not yet on `foundation`). From its evidence doc, only the verification and the 16-skip inventory. |
| `codex/durable-learning-evidence` (PR #4) | 02b84e3 | T02. To be finished as Queue 4 #1b once 0a is on `foundation`, by `git diff ec7b776 02b84e3 -- apps/web \| git apply --3way` (never checkout, which would overwrite the T01 fixes and the course safety fix). Do not merge the stacked branch. Its 15-item fix list is in [the review file](handoff/codex-review-2026-10-07.md). |
| `codex/account-authority` | 1b6bca5 (WIP, red: 7 type errors, 27 failing tests) | Archived. Resumes as Queue 4 #4b (M5 accounts and consent) after Live Tutor phase A and the owner's decisions 11–14, by selective port, no rebase of the stack. Its 16-item fix list is in [the review file](handoff/codex-review-2026-10-07.md). Its checkpoint note (`docs/handoffs/2026-10-07-account-authority-checkpoint.md` on that branch) moves to `docs/handoff/` when ported; its voice-lease limits go into the live-tutor spec. |

Leave all four branches and the three open PRs (#2, #3, #4) as they are; comment on or close them
only with the owner's go-ahead (STATUS decision d). `origin/codex/migrate-gpt-6-astra` (PR #1,
merged) is already an ancestor of `foundation` (old, README only); ignore it.

## Work in progress, saved as commits (continue from these; never redo them)

| What | Commit (local worktree branch) | Notes |
|---|---|---|
| T01 + rule-10 fix (steps 0a, 0b) | 850a186 (`worktree-wf_8bf8e121-43e-1`) | See "Where things are". Rebase onto `foundation`, gate, push. |
| Live Tutor phase A (live-a) | d27f31d at 20:37 (`worktree-wf_7704ca2c-e01-1`, locked; an agent was still committing there) | **In progress; may have uncommitted work.** Built on db7c472: 7b0949c number speller and golden table, cf54d55 tiered browser-voice picker, 0e6ff08 shared AudioContext/player/transport, b12b1c4 server voice ids + Flux default + reserve-then-settle tokens + turn metrics, 6732361 Deepgram Flux with Nova-3 fallback bands + turn-taking for children, a443ec3 barge-in ducks first, 4bee91f the live loop as a pure state machine, d27f31d spoken answers become pad responses. Continue from the newest commit there. Check `git status` in that worktree before taking it over. Spec: [plans/2026-10-07-live-tutor-spec.md](plans/2026-10-07-live-tutor-spec.md). The old live-a worktree (`worktree-wf_70ee4360-55e-1`, db7c472) is superseded. |
| Content audit fixes (Queue 4 #2) | **In progress**, one worktree per strand from d34f845, `worktree-wf_87a0a346-55c-1` to `-9`. At 20:38: math-k2 47bd53f (`-1`), math-35 749d129 (`-2`), math-89 264360b wip (`-4`), grammar-35 fe07d42 (`-6`), grammar-69 cd7f763 (`-7`), reading-35 8391b34 (`-8`); `-3`, `-5`, `-9` had no commits yet. The five earlier fix WIPs were replayed into `-1`, `-2`, `-4`, `-6` and `-8` | Apply [handoff/content-audits.json](handoff/content-audits.json): all 19 strands audited, 327 findings (20 blocker, 87 major, 220 minor), blockers first. The originals (00f7234, a25be0c, 7348ac9, e8b86c4, c5267c6) are superseded by these replays; use `git cherry` before replaying anything else. |
| Polish: Today/family/growth (polish-home) | 5d6ca5f (`worktree-wf_d6bbc655-5ba-2`) | Its one commit is the Handover fix, superseded by T01's HandoverScope in AppShell: **do not cherry-pick Handover.tsx or its test.** The rest of its scope (dogfood #3 #10–13) continues from `foundation` after 0a. |
| Polish: intake/calendar/shell/auth (polish-intake) | 43d4b71 wip (`worktree-wf_d6bbc655-5ba-4`) | Only its `m.mult.groups` alias hunk landed (in T01). Rebase the rest (grade-aware ranking in skillmatch, intake/school edits) on top, keeping T01's alias line and its test. Dogfood #1 #2 #4 #9. |
| Polish: practice, learn, tutor | not started (base 8f1af04) | dogfood #6–8; the audit additions in STATUS #3 |
| Evidence pass (Codex T02) | 02b84e3 (`codex/durable-learning-evidence`) | Queue 4 #1b, after 0a lands; all 15 fix-list items in [the review file](handoff/codex-review-2026-10-07.md) |
| Account authority (Codex T03 WIP) | 1b6bca5 (`origin/codex/account-authority`) | Archived for Queue 4 #4b (M5); all 16 fix-list items in [the review file](handoff/codex-review-2026-10-07.md) |

Find a worktree commit with `git log --all --oneline | grep <sha>`; they live under `.claude/worktrees/` (local only, ignored).

## Next, in order (Queue 4; details and checkboxes in STATUS)

0. Steps 0a (T01 code + fixes) and 0b (rule-10 safety screens) land: rebase onto `foundation`,
   verify, the full browser suite, push, and tick them in STATUS with their SHAs and counts. This
   docs commit is 0c. 0d: copy the four omitted owner lines into DECISIONS once someone can read
   `~/.codex/history.jsonl`.
1. **`content-merge` green**: done as d34f845; only its recorded gate (verify + browser suite on the
   merged SHA) and the push are left. **1b**, once 0a is on `foundation`: finish 02b84e3 (the
   evidence pass) with today's help semantics; it merges after #1.
2. **Content audits** (in progress): apply [handoff/content-audits.json](handoff/content-audits.json)
   (327 findings, 20 blockers first) from the replayed fix WIPs above.
3. **Polish batch 1**, now smaller (after 0a): the remaining dogfood findings ([dogfood/2026-10-07.md](dogfood/2026-10-07.md) #1–4, #6–13; #5 is fixed in T01), the design critics' findings and follow-ups ([handoff/requests/design.json](handoff/requests/design.json)), every package's cross-file `requests` ([handoff/requests/](handoff/requests/)), and the audit's additions (questions routed to a course form, the demo's 1/6 answer to 1/2 = 2/4, opening-only tutor context, the 80dvh drawer). Five disjoint areas: practice · Today/family/growth · learn/stage/catalogue K–2 visuals · intake/calendar/shell/auth · tutor.
4. **Live Tutor** (P1–P5 of the spec; critics' raw audits in [handoff/live-tutor-audits.json](handoff/live-tutor-audits.json)): phase A is in progress on `worktree-wf_7704ca2c-e01-1` (see the WIP table) = numbers speller, voice tiers, one app voice, one model call per spoken turn, latency eval (lib/server only); phase B = wire screens, the tutor cursor synced to speech, data-spot ids, clips. **4b** after phase A and the owner's answers: M5 accounts and consent.
5. **Learning loop**: build the packages of plan §2.10 / §3.4 (the revision is done, 7327802).
6. **Hands-on pass** after each batch (owner rule) → findings → fixes.
7. Cross-cutting review → e2e + axe at 1440/390 → preview deploy → final report.

Side track: the model and voice evaluation (Codex T10/T13) on synthetic data, ending in a
recommendation to the owner, never a pin.

How the build ran (reuse): parallel packages in isolated worktrees from a fixed SHA, each build → two adversarial reviews → fix, then cherry-pick onto `foundation` and check (`npm run verify`, `CI=1 E2E_PORT=3291 npx playwright test` from `apps/web`). Agents must clone node_modules (`cp -cR`, Turbopack refuses symlinks), commit as they go, and write big files in pieces (an author once hit the 128k output cap). Keep the main checkout's working directory inside the repo when launching worktree agents.

## Owner's rules

The owner's rules from this build (same world and max craft; the tutor points at anything on screen;
voice that isn't uncanny, in real time, with attention that moves with the words; gamified only where
it is justified to work, the product a clean teacher replacement; merge as you go; use what we build;
K–9 math, science and English in EN/ES) are now standing decisions in
[DECISIONS.md](DECISIONS.md), in the owner's own words, next to the Codex-session quotes. Where an
agent reads a newer quote as changing one of them, it is an owner question in STATUS and today's
behaviour holds. The mastery-law numbers never change without the owner.

## Blocked on the owner (the human parts)

The full list, with a default for every decision, is at the top of [STATUS.md](STATUS.md):
credentials and access (including read access to `~/.codex/history.jsonl` for step 0d); hygiene
(rotate the six keys committed in the old KaizenEdu repo first, then delete the ~100 stale Vercel env
vars); decisions (the carried-forward ones plus 17 new ones from the Codex review); people (COPPA
counsel, a teacher reviewer, a native Spanish reviewer, pilot families).
