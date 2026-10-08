# Status

> **2026-10-07 (evening): Codex's (ChatGPT's) four branches reviewed and reconciled. Queue 4 stays
> the plan of record**, with Codex's audit items added as new steps below. Start with
> [HANDOFF.md](HANDOFF.md). State as of 20:38: `foundation` is d34f845 (the content merge, pushed).
> Steps 0a and 0b are committed on a branch and are **not on `foundation` yet**. Check
> `git log foundation` before trusting a box below.

## Blocked on the owner (the human parts)

A credential is something to set up; a decision is a question to answer. Every decision below has a
default, and the default (today's behaviour) holds until you answer.

### Credentials and access

- Anthropic key + `KAIZEN_AI=anthropic` on Vercel (Preview) for the real tutor.
- Neon Postgres (`DATABASE_URL`).
- Resend (`RESEND_API_KEY`, `KAIZEN_EMAIL=resend`, an `EMAIL_FROM` on a verified domain, a real
  privacy@kaizenedu.net mailbox).
- ElevenLabs + Deepgram (+ `KAIZEN_VOICE=vendor`), and a Vercel Blob token for voice clips.
- Read access to `~/.codex/history.jsonl` for an agent (it was denied in this session), or paste
  your first message to Codex: four of your lines from it are still to be copied into DECISIONS
  word for word (step 0d).

### Hygiene (do these first)

1. **Rotate the six keys committed in the old KaizenEdu repo** (`.env.local`: OpenAI, Anthropic,
   Google, ElevenLabs, TTS/ASR OpenAI).
2. Delete the ~100 stale environment variables on the Vercel project `kaizenedu` left from the
   OpenMAIC attempt, including a sensitive `ANTHROPIC_API_KEY`.

### Decisions

Carried forward:

- a. **Voice audition:** one bilingual voice or two matched voices. No default pick; Live Tutor P1
  needs it before a vendor voice ships.
- b. **Wording of the tutor openings and the consent text.** The openings in the
  [live-tutor spec](plans/2026-10-07-live-tutor-spec.md) §2.5 are proposed (for example grades 3–9
  "Which part is tricky?"); today's wording stays until you approve them.
- c. **kaizenedu.net go-ahead.** Default: preview deploys only.
- d. **The four Codex branches and their open PRs** (#2, a draft for 0bac96a; #3 for ec7b776; #4
  for 02b84e3): comment on them or close them? Default: leave them all as the archive, untouched.
  Merging #2 would bring in the authority-doc rewrite the review rejected.

New from the Codex review (the numbers are the ones the Codex plan and specs cite; the judge's own
text is in [handoff/codex-review-2026-10-07.md](handoff/codex-review-2026-10-07.md)):

1. **Plan of record:** keep Queue 4 with Codex's audit folded in, or adopt Codex's T01–T13
   integrated-release plan? Default: Queue 4 with the audit folded in.
2. **Other vendors and processors:** any non-Anthropic model or new processor (OpenAI Astra/Sol/GPT-Live,
   Gemini Live, Muse Spark, TypeSafe Jev) for a production role that touches children's data?
   Default: Anthropic only; comparisons on synthetic or adult data. A yes needs your written sign-off
   for each processor plus a child-data/COPPA review of it.
3. **Native speech-to-speech for minors** at all, or always the cascade (recognizer → safety screen →
   name scrub → model → speech)? Default: cascade.
4. **Opening the tutor** beside a problem: does it count as help for the mastery law? Default: yes,
   as today.
5. **A wrong first answer without help:** does it start the 48-hour help wait? Default: no, as today.
6. **Read-aloud:** should it count as help for skills that measure reading itself (phonics, reading
   a passage), and can read-aloud-supported checks prove a skill for pre-readers? Default: as today,
   read-aloud is not help for any skill (the runner and the stage never mark it), and
   read-aloud-supported checks count. Nothing is built for reading skills until you answer.
7. **No answer before a try:** keep "never give the answer to the live problem before a try" as a
   hard rule, with conceptual explanations allowed on top? Default: yes.
8. **content-merge:** merge behind the Draft labels as soon as it is green, or hold it until
   per-journey review? Default: merge as you go, and it has been merged that way (d34f845, #1
   below). The merge labels nothing as reviewed. If you would rather have held it, say so.
9. **Spending:** Codex wrote that you authorized live-provider spending ("burn cash first"). Is that
   right, and what daily and monthly ceiling? Default: claimed by Codex, not confirmed. Today's caps
   stay (per learner per day 50 turns / $1, per account per month 3,000 turns / $30, per address per
   day 300 turns / $6), and no hosted benchmark run spends money.
10. **Vercel project:** which is canonical, `kaizenedu` or the new `tutornat-preview` (scope
    saitokikus-projects)? Should the other one's Git integration be disconnected? Default: no change;
    `kaizenedu` stays the deploy target PRODUCT.md names, and neither integration is disconnected.
11. **Live AI before accounts:** keep the browser-only owner/dogfood path until the pilot, or require
    database, accounts and consent everywhere? Default: keep browser-only.
12. **Adult self-use:** how does a grown-up prove it's them learning, and how often must they
    re-confirm? Codex proposed retyping the password every 2 hours. Default: today's behaviour; no
    re-prompt is built.
13. **Turns and days:** should a failed provider call cost a learner a turn, and does the daily cap
    reset at the family's local midnight or at UTC? Default: no cost, local midnight (today's code).
14. **Voice token ceiling:** 2,000 per kind per day for the whole site, or a per-account limit with a
    high site-wide safety ceiling? Default: today's 2,000 tokens per kind per server instance per
    day, plus the per-minute limit.
15. **Same-vendor refresh:** add `claude-fable-5-1` to the teacher bake-off, and move the `quick` role
    from `claude-haiku-4-5` to Haiku 5.5? Default: no change; Fable 5.1 is listed as a candidate only.
16. **Adults:** are adults an early acceptance story now (Codex's water-use example), so "adults
    last" is dropped? Default: adults last.
17. **Taste check:** T01 made colour changes on all buttons and chips instant (no fade) so they pass
    contrast checks mid-change. Keep it? Default: keep, as shipped with 0a; the design pass can bring
    back hover fades if you'd rather.

### People

- Counsel for COPPA: consent method, profiling, voice, server-era retention periods, and each new
  processor under decision 2.
- A teacher reviewer for the draft banks (`/review`).
- A native Spanish reviewer.
- Pilot families.

## Where the checks stand

- **`foundation` d34f845** (the content merge): the full unit suite passes, 143 files / 4,088
  tests (`npx vitest run`, run 20:30 for this update), including the 11 files of the 20 tests that
  failed on `content-merge` ([list](handoff/content-merge-failing-tests.txt)). Lint, typecheck, the
  build and the browser suite were not run on d34f845 here. The T01 fixes are not on it, so expect
  the baseline's failing scenarios until 0a lands; the ~250 new skills may change others. Record the
  merge gate here when it is run.
- **Baseline d8d8166:** `npm run verify` PASS (2,372 unit tests); browser suite 148 passed / 22
  failed / 16 skipped, the 22 being 11 scenarios at both sizes
  ([baseline](reviews/2026-10-07-baseline.json)).
- **T01:** Codex measured ec7b776 at verify PASS (2,385 tests) and the browser suite at 174 passed /
  0 failed / 16 skipped ([evidence and the 16 skips](reviews/integrated-release-evidence.md)). Step
  0a's own commits (T01 code plus its fix list) have **no recorded gate yet**. Record verify and the
  full browser suite on the SHA that lands on `foundation`.

> **Owner direction (2026-10-07): the tutor first, lessons are what it makes.** "id suggest wiring up the
> tutor before making the lessons, the lessons are just an extension of the tutor itself and it will create
> more and more, its the live theater and recording or replay able experiences will remain. use openmaic
> generator its solid". So: Live Tutor (A then B) and the **tutor theater** (OpenMAIC's generator and
> playback ported behind our stage: the tutor teaches live on the stage, every session is recorded and
> replayable, lessons are saved or regenerated theater sessions) come before the learning-loop build and
> before any new lesson authoring. Existing catalogue courses stay as seeds and get fixed, not extended.

> **Owner decision (2026-10-07) on OpenMAIC:** "Take the html for sure that's the main thing I want from it
> then incorporate some project based learning and then maybe add the multi agent classroom out it behind a
> button". So the theater takes OpenMAIC's AI-written HTML interactives (sandboxed, labelled, exploration —
> proof still only from code-checked practice and checks), its project-based learning, and its multi-agent
> classroom as an opt-in mode behind a button. Amends docs/plans/2026-10-07-tutor-theater-spec.md.

## Queue 4 — the 1.0 build, in order (started 2026-10-07; owner: "build it all now", come back at the end)

Plan: [plans/2026-10-07-kaizenedu-1.0-plan.md](plans/2026-10-07-kaizenedu-1.0-plan.md). One sequence, no side
quests. Each stage starts only when the stage before it is merged and `npm run verify` is green.
Codex's [integrated-release plan](plans/2026-10-07-integrated-learning-release.md) is an input; its
first section maps every Codex task, dogfood finding, handoff request and audit item to a step here.

1. [x] **Contracts** — shared types, append-only registries with union merge, `logAct`, review state (55cfb79).
2. [x] **Parallel build** (features and design done; content merged, its audit fixes in #2 below) (isolated worktrees from 55cfb79; each package: build → two adversarial reviews → fix)
   - Features (13): intake + item page · calendar week · Today · practice inputs + runner · courses path +
     source-built courses · growth + nudges · learner model + outcomes · lesson stage + 7 widgets + narration ·
     tutor knowledge + photo · evals + spend caps + AI course cache · backend (DB, auth, sync, re-check,
     consent) · trust (privacy, export/delete, weekly email, /review, scrubbed logs) · voice layer.
   - Content (19): math K–9 to ~150 skills, phonics K–2, grammar 3–9, ~90 original reading passages,
     science K–9 to ~86 skills, 48 catalogue courses (EN + ES), ~95 checked sources + link checker.
   - Design system (same world, max craft — owner choice): tokens, motion, primitives, K–2 band,
     shell, landing; critique + accessibility audit from real screenshots.
   - Spotlight engine (the tutor points at anything on screen).
3. [ ] **Merge as each package finishes** (owner: "merge also as you go so nothing gets lost") — cherry-pick
   onto `foundation`, typecheck + unit tests per merge, full verify + e2e per batch, push.
   Merged (2026-10-07): all 13 feature packages - calendar, today, learner, family, intake, stage, courses,
   practice, voice layer, AI infrastructure, backend, tutor, trust - plus the design system (system, shell,
   landing), the spotlight engine and the 19 content packages (d34f845). Each: build → two adversarial
   reviews → fix → merge → typecheck + unit tests; full verify + e2e per batch. Integration repairs
   merged as their own commits.
   **Use it after every batch** (owner: "use what you make … as feedback"): a hands-on pass in the browser
   as a grown-up, a K learner and an older learner; findings in [dogfood/](dogfood/) and fixed before the
   next batch. Pass 1: [dogfood/2026-10-07.md](dogfood/2026-10-07.md) (13 findings, 1 blocker; the
   blocker, #5, is fixed in T01, which reaches `foundation` with step 0a).
4. [ ] **Integration** (sequential, each one package with review):
   a+b. **Live tutor** (one package: voice conversation + spotlight wiring + the tutor cursor) — the M6
      "natural conversation" table including "not uncanny" and "moving attention": the conversation loop,
      tap-to-talk + hands-free, turn-taking, spoken math, answering by voice, K–2, fallbacks, privacy;
      `data-spot` ids on every screen, `point_at` in the AI tutor, demo-tutor hint pointing, the glow and
      cursor moving in time with speech. Starts with a critics' audit of the existing voice layer and
      spotlight; ends with a hands-on pass.
   c. Content backfill — misconception tags on the 134 original skills; switch skills to the touch pads;
      new widgets used in the catalogue; writing responses (practice-only).
   d. Design polish per screen against the new system (Today, practice, stage, Talk, calendar, item page,
      Learn, growth, family, child page, settings, auth).
5. [ ] **Cross-cutting review** — bugs, accessibility, honesty, security, privacy, persona UX (a 6-year-old,
   a 9th grader before a test, a Spanish-speaking parent on a phone); fix loop until dry.
6. [ ] **Ship the preview** — e2e + axe at 1440/390, screenshots, README/STATUS, preview deploy, push, the
   final report with the one list of human parts.

### Next, in order (the active sequence)

The steps keep the numbers HANDOFF has used (#1–#7). The Codex review added 0a–0d, 1b and 4b. A box
is ticked only when the work is on `foundation` and its check ran; write the SHA and the counts.
The judge's full fix lists for each Codex commit are in
[handoff/codex-review-2026-10-07.md](handoff/codex-review-2026-10-07.md).

- [ ] **0a. T01, code only.** Committed, **not on `foundation` yet**: branch
  `worktree-wf_8bf8e121-43e-1` (based on d8d8166) has c8dc7ab (ec7b776's `apps/web` and `DESIGN.md`,
  no docs), then its fix list: a493d06 (dogfood #5 in both orders; AnswerPad leaves focus alone
  inside the open tutor panel and never focuses the aria-live readout), 05031fc (the same-route
  Handover guard), 966650d (the journey and landing e2e fixes), df04156 (the DESIGN.md motion line).
  `foundation` has moved on (d34f845), so rebase onto it. Gate: `npm run verify`, then
  `CI=1 E2E_PORT=3291 npx playwright test` (174+ passed, 0 failed), then push and tick with the
  SHA and the counts. Until then `foundation` does not have the T01 fixes, and the four handoff
  files that say "fixed in T01" refer to this branch.
- [ ] **0b. Rule-10 fix.** Committed on the same branch, after 0a: 3bca9bb (`/api/ai/course`
  screens the goal before the course cache, the spend gate and any model call; tests show screened
  goals reach no writer) and 850a186 (extract and coach screened too; practice tested for zero model
  calls). The audit found the course route called the model with no safety screen (AGENTS.md rule
  10). It lands with 0a; tick with its SHA.
- [ ] **0c. Docs reconciliation** (this commit). Codex's audit, baseline, benchmark review, two specs
  and plan taken as inputs, with our edits; the T01 verification and skip inventory; the judge's fix
  lists; our own STATUS, HANDOFF, DECISIONS, PRODUCT, README and ROADMAP. It is written to be true
  whether 0a and 0b land before or after it. Tick with its `foundation` SHA.
- [ ] **0d. The four omitted owner lines.** Copy them from the owner's first Codex message in
  `~/.codex/history.jsonl` into [DECISIONS](DECISIONS.md) word for word, typos kept. That needs read
  access to the file, which was denied in this session (see "Credentials and access" above). Until
  then DECISIONS has only the fragments the reviews quoted.
- [ ] **1. content-merge green.** **Merged; do not redo it.** `content-merge` went into `foundation`
  as d34f845 (pushed), behind the Draft labels. The fixes were made at the root,
  not by union merge: 49cc979 (one id per skill), 083ca6e (tests prove their rules with 61 courses),
  5afb688, df9e110, 218eafd and b938901, from `worktree-wf_4d287928-e43-1` and `-3`. The full unit
  suite passes at d34f845 (see above). Left: lint, typecheck and build, plus the browser suite on the
  merged SHA, recorded above. Then tick. The audit blockers did not gate the merge: they
  lead #2.
- [ ] **1b. Evidence pass: finish Codex's 02b84e3 (T02).** It starts once 0a is on `foundation`, in a
  worktree from that `foundation`: `git diff ec7b776 02b84e3 -- apps/web | git apply --3way` (never
  checkout; expect conflicts in Runner.tsx and practice.spec.ts and keep both sides). Apply **all 15
  items** of its fix list in [the review file](handoff/codex-review-2026-10-07.md) (02b84e3), and keep
  its "keep from dropped" list. In short: a real write-ahead journal; short digest IDs (≤ 100
  characters, so generated-course answers sync); about 2,000 problems of history, about 400 bytes per
  problem and at most 2 full parses per answer; deletion clears journal keys, and `removeCourse`
  clears that course's attemptContexts, responseEvents and helpExposures; `appendEvidence` never
  wipes in-memory state; a helped check item stays helped, including the `lib/sync.ts:319`
  assisted=false bug; tutor help syncs; storage DOMExceptions kept apart from logic errors, with a
  read-aloud grown-up message for K–2 instead of "free some space"; provenance left undefined, never
  stamped "legacy-local"; `allStatuses` filtered through `getSkill`; quiz resume stores the choice
  index; outcomes' "test goes well" stops using `isSecure`, which includes refresh; untick "two-tab
  ordering" (deferred); record the refresh-episode replay in DECISIONS as a behaviour change with
  unchanged numbers. Policy: today's semantics (decisions 4–6 with their defaults; no new help
  trigger). Tutor openings stay as today (decision b). The K–2 hint-as-help mechanism can be built
  behind today's wording. Two adversarial reviews; merge after #1; verify + e2e.
- [ ] **2. Content audits.** All 19 strands are audited:
  [handoff/content-audits.json](handoff/content-audits.json) has 327 findings (20 blocker, 87 major,
  220 minor). Blockers first. **In progress**, one worktree per strand from d34f845:
  `worktree-wf_87a0a346-55c-1` to `-9` (the HANDOFF WIP table has the newest SHAs at 20:38). The
  five earlier fix WIPs were replayed into them. Continue from the newest commit on each, and run
  `git cherry` before replaying anything else.
- [ ] **3. Polish batch 1, smaller after T01** (after 0a lands). Continue 5d6ca5f's scope without its
  Handover.tsx and test; rebase 43d4b71 without the alias hunk. Scope: dogfood #1–4 and #6–13, the
  design critics' findings ([handoff/requests/design.json](handoff/requests/design.json)) and every
  package's requests ([handoff/requests/](handoff/requests/)). Audit additions: the magic box sends
  questions to `/courses/new` (and `MagicBox.test` asserts "Why is the sky blue?" does; fix the
  test); demo Talk answers "Why is 1/2 equal to 2/4?" with a lesson on naming 1/6; the tutor's
  DockContext is opening-only and hints are read through a cast; the 80dvh tutor drawer covers what
  it explains on phones. Then a hands-on dogfood pass.
- [ ] **4. Live Tutor** (P1–P5 of the [live-tutor spec](plans/2026-10-07-live-tutor-spec.md); critics'
  audits in [handoff/live-tutor-audits.json](handoff/live-tutor-audits.json)). **Phase A is in
  progress** on `worktree-wf_7704ca2c-e01-1` (locked; an agent was still committing there at
  20:37). From db7c472 it has the number speller and golden table (7b0949c), the tiered browser-voice
  picker, the shared AudioContext and player, server voice ids with Flux by default and
  reserve-then-settle tokens, Deepgram Flux with Nova-3 fallback bands, barge-in, the live loop as a
  state machine and spoken answers as pad responses (d27f31d, 20:37). Continue from the newest
  commit there, after checking `git status` in that worktree for uncommitted work; never restart
  from db7c472. Phase A covers voice tiers, one app
  voice, one model call per spoken turn and the latency eval. The spec's gates stay the authority,
  including the K–2 band. From Codex's models spec: explicit measurement boundaries (never report
  speech-synthesis API time as turn latency), a judgment result whose "unavailable" or "abstain" is
  never treated as a pass, and reserve-then-settle budgets. Phase A sets the sentence-release point
  that output admission and step 4b use. **Phase B:** `data-spot` ids on every screen, the mounted
  SpotlightLayer, screens routed through `lib/voice`, the tutor cursor in time with speech, clips;
  plus the workspace spec's items: one audio owner and one cancellation epoch, stale replies stay
  inert, only the heard part counts as delivered, the tutor never covers what it explains, the
  tutor's view built field by field (no keys in prompts, sentinel-key tests).
- [ ] **4b. M5 accounts and consent (new).** Only after decisions 11–14 are answered and Live Tutor
  phase A has fixed how replies stream. Port what is worth keeping from `codex/account-authority`
  (1b6bca5, archived), using **all 16 items** of its fix list and its "keep from dropped" list in
  [the review file](handoff/codex-review-2026-10-07.md) (1b6bca5): identity from the session cookie,
  the database budget ledger, the refusal matrix with zero provider calls, revocation plumbing. In
  short: no whole-turn buffer; one voice watcher per session; the crisis referral before any
  authority or budget check; a separate output safety policy; sync never answers 403 on a stale
  learner (clear the selection and return `learner: null`); address budgets keyed by an HMAC under a
  rotating secret, address and day rows pruned after about 48 h, budget and grant rows
  cascade-deleted with the account, and the new records in the trust retention rows; status
  endpoints stay ungated and return `{mode, authorized, reason}`; a grown-up principal for the
  parent's own tools; the concurrency test on real Postgres with two connections; drizzle 0002–0004
  squashed into one migration; the duplicate `spendGate` import in `extract/route.ts` removed;
  `voice/server.ts` maps `LearningAuthorizationError` to 403. Plus the audit's server items:
  consentGate compares the raw ID while the client sends a hashed one, and no route calls it;
  recheck does not verify level, duplicates, future dates or readiness; server-issued check grants;
  evidence lists sync; an account-delete route; budgets out of process memory. Also
  [handoff/requests/backend.json](handoff/requests/backend.json).
- [ ] **5. Learning loop.** The revision is done: plan §2.10 and the loop in the engine (§3.4) on
  `foundation` at 7327802. Build its packages (§3.4 "Build packages").
- [ ] **6. A hands-on pass after each batch** (owner rule) → findings in [dogfood/](dogfood/) → fixes.
- [ ] **7. Cross-cutting review → e2e + axe at 1440/390 → preview deploy → final report** (stages 5–6
  above). Codex's T13 browser and accessibility gates fold in here.
- Side track: **model and voice evaluation** (Codex's T10/T13) on synthetic data, from the
  [benchmark review](reviews/2026-10-07-model-benchmark-evidence.md) and
  [models spec](specs/2026-10-07-models-voice-and-jev.md). It ends in a recommendation to you, never a
  pin (decisions 2, 3, 9 and 15).

### What Codex already did (off the list once 0a lands)

- In T01 (on `foundation` with step 0a): every e2e failure in
  [handoff/e2e-failures.txt](handoff/e2e-failures.txt) and the four more failing scenarios in the
  fresh baseline; the type-after-hint half of dogfood #5; the trust request (`useWeeklyEmail` in
  AppShell); 5d6ca5f's handover bug (superseded by AppShell's HandoverScope); 43d4b71's
  `m.mult.groups` alias; review-label contrast and the settings preview frame.
- Once 1b lands: the refresh-restoration bug in `learning/engine.ts`; help and misses surviving
  reload; idempotent per-slot attempts; the tutor admission gate Live Tutor needs.

## Learning fabric — overnight queue 2 (owner asleep 2026-10-07 → morning)

Spec: [specs/2026-10-07-learning-fabric-design.md](specs/2026-10-07-learning-fabric-design.md).
Owner: "super detailed codebase … all features you can step by step … the ultimate learning fabric …
start with k-9 math and English and science … use real sources … work all night … don't ask for
permission". Work top to bottom. Tick only after `npm run verify` passed and the work is committed.
Keep production (kaizenedu.net) untouched; preview deploys only.

In progress: (none) — queue 2 finished · check-ins without a commit: 0

- [x] Q1. Practice core: types, seeded rng, safe algebra parser, answer checker, K–2 math (19 skills), registry + wide generator test.
- [x] Q2. Strands from parallel authors merged and reviewed: math 3–5, 6–7, 8–9; English K–4, 5–9; science K–5, 6–9 — 134 skills (76 math, 30 English, 28 science), each strand with independent-verification tests (724 tests total).
- [x] Q3. Visuals for practice (dots, ten-frame, base-ten, clock, array, column, rect, triangle, circle, right-triangle, prism, coord) + MathText renderer.
- [x] Q4. Learning engine (`learning/`): evidence type + store lists, skill status (practicing/ready/checked/proved/refresh), level stepping, review due, set builder, placement; unit tests.
- [x] Q5. Practice UI: `/practice` hub (subjects, skill map with status, "practice anything" search), `/practice/[setId]` runner (keypad, fraction pad, choices, text; hint ladder; steps; read-aloud; corrections; finish summary), check mode; e2e (journey test lands with Q15).
- [x] Q6. Planner: `planFor` (checks, school prep, due work, daily sets, lesson, more), Today page rewrite, done markers; unit tests.
- [x] Q7. School + calendar: classes, events, feedback, results; `/calendar` week/day views; add/edit; ICS parse + export + `/api/ics` feed fetch (SSRF-guarded); paste intake parser with review step; feedback → feedback set.
- [x] Q8. AI layer: provider resolution, `/api/ai/status`, safety screen, prompts by band, tutor route with tools, demo tutor; tests with mock model.
- [x] Q9. Tutor UI: drawer on practice + lesson stage; `/talk` full-screen with board; voice (read-aloud streaming by sentence, push-to-talk with grown-up permission); transcripts saved.
- [x] Q10. AI course generation (Scene schema + quality gates, streamed), AI open-topic practice, AI extract (syllabus/feedback/photo), coach note — all wired into existing screens with demo fallbacks.
- [x] Q11. Resources: curated real free sources per skill family/topic (URLs checked), shown on skill pages, lesson ends, tutor tool, parent view; reading log with real free libraries.
- [x] Q12. Setup goals (homework help / daily practice / homeschool / stay organized) → defaults; "Get help now" entry everywhere; homeschool records (dated log, CSV, print).
- [x] Q13. Family dashboard per child + per-child settings (minutes, subjects, timer, voice), weekly numbers, checks waiting, stuck notes, transcripts.
- [x] Q14. Landing for the four jobs; nav update (Today, Practice, Talk, Learn, Calendar, Growth).
- [x] Q15. ES pass, e2e journeys (help-now, daily practice, homeschool, school import), axe audit, screenshots, README/STATUS/ROADMAP, preview deploy, morning report.

### Morning report (2026-10-07, learning fabric)

**Try it:** preview https://kaizenedu-63zb5wywj-saitokikus-projects.vercel.app (Vercel login needed).
kaizenedu.net is untouched. Branch `foundation` is pushed (not merged into `main`).

Make a family, add a kindergartner and an older learner, answer "What should KaizenEDU help with?",
then open each learner's Today.

**What's new tonight**
- **Practice (at-home Kumon):** 134 skills K–9 (76 math computed, 30 English and 28 science — draft
  banks, plus computed science like speed, density, atoms, Punnett squares, pH), each with a hint
  ladder, worked steps, read-aloud and EN/ES. Sets of 6 (K–2) or 10, level stepping, corrections at
  the end, pace, an honest finish. Placement ("Find my level"). Every answer checked by code.
- **The mastery law:** practicing → check ready → passed 1 of 2 checks → proved (two no-help checks on
  fresh problems, different days ≥ 6 days apart, ≥ 48 h after the last help) → reviews at 7/21/60/120
  days → "needs a refresh". Stuck and overdue-check flags for parents.
- **Today:** a plan computed fresh each day — open checks, test prep in the 3 days before a test,
  work due, teacher-note practice, a set per subject, reviews, the lesson in progress — sized to the
  learner's daily minutes. "Get help now" and "I have a test coming" for older learners.
- **Calendar & school:** week view with prep days; add/edit; import by pasting a syllabus (never
  invents a date), an .ics file, or a class calendar link (Google Classroom, Canvas, Schoology —
  fetched safely on the server); classes, teacher notes that become practice, scores from school kept
  apart from proof; export .ics.
- **Tutor:** one unnamed tutor beside every problem, on the lesson stage, and full screen in Talk.
  With AI: short Socratic turns, tools for hints, checking, worked examples, pictures, practice and
  calendar cards; no answer key in its prompt. Without AI: the demo tutor (vetted hints, a similar
  problem worked out, practice and sources that fit). Read-aloud by sentence; push-to-talk only when a
  grown-up allows it. Safety screen before any model: crisis/abuse get fixed referrals (988,
  Childhelp) and a note for the family. Transcripts are on each child's page. Break reminder at 3 h.
- **AI lessons and more (live when AI is connected):** the magic box writes real lessons in our scene
  format, each passing quality gates (a real picture or interactive, a learner action, valid keys) or
  left out and named; AI questions for topics the map doesn't cover (never proof); reading a
  syllabus/teacher email/photo with every guess listed; a weekly family note from the numbers only.
- **Real sources:** ~50 free sources (PhET, Khan Academy, OpenStax, NASA, USGS, Project Gutenberg,
  Unite for Literacy, Storyline Online, Purdue OWL, ReadWorks, CommonLit, Open Library, Libby…),
  links checked, Spanish versions where they exist, shown where they help.
- **Parents & homeschool:** each child's page (today, the week in honest numbers, proved/checks
  waiting/stuck, help needed, skill maps, school, notes, transcripts, reading log, settings), records
  with CSV and print, setup goals that change emphasis.
- **Gates:** 727 unit tests, 6 journeys + accessibility audit at 1440 and 390 px (12 runs), build.

**Needs you**
1. **Rotate the six keys from the old KaizenEdu repo.** The Vercel project `kaizenedu` also still holds
   ~100 environment variables from the OpenMAIC attempt, including a sensitive `ANTHROPIC_API_KEY`.
   KaizenEDU ignores it on Vercel on purpose. To try the real AI tutor on the preview: put a **fresh**
   Anthropic key in `ANTHROPIC_API_KEY` and add `KAIZEN_AI=anthropic` (Preview), then redeploy — and
   delete the old variables you don't need.
2. **Decide when kaizenedu.net moves** to this repo (Vercel Root Directory `apps/web`).
3. **Before any real child uses it:** accounts + database, COPPA consent, retention/delete (ROADMAP "Next").
4. **Reviews:** a teacher for the draft English/science banks (each marked "Draft questions"), a
   native speaker for Spanish (the authors flagged choices to check, e.g. "guisante" vs "chícharo").

**Next:** the review and plan in [plans/2026-10-07-real-product-plan.md](plans/2026-10-07-real-product-plan.md); waiting on the owner's go and the "needs you" list.

## Foundation build (done)

Checklist for the foundation build. Plan: [plans/2026-10-07-foundation-plan.md](plans/2026-10-07-foundation-plan.md) · Spec: [specs/2026-10-07-foundation-design.md](specs/2026-10-07-foundation-design.md)

Rule: a box is ticked only after its check actually ran. Note blockers under the task.

## Foundation (frontend only)

- [x] 1. Workspace, scaffold, tokens
- [x] 2. Types, store, i18n
- [x] 3. Domain functions + K–9 catalogue (13 courses, every lesson written; grade 9 science added overnight)
- [x] 4. UI primitives, icons, brand
- [x] 5. Landing, auth, profiles, guards
- [x] 6. Student shell, Home, magic box
- [x] 7. Generation flow
- [x] 8. Courses + course page
- [x] 9. Lesson stage
- [x] 10. Growth, Family, Settings
- [x] 11. Docs, verification (verify passes; review folded into the overnight queue below)

## Parallel

- [x] modules/ and docs/history/ assembled (background agent)

## Blocked on owner (foundation era; the current list is at the top)

- Rotate the six provider keys committed in KaizenEdu `.env.local` (OpenAI, Anthropic, Google, ElevenLabs, TTS/ASR OpenAI).

## Overnight queue (owner asleep 2026-10-07 → morning)

Owner: "make something good finished and polished that i would like full." Work strictly top to bottom.
Tick an item only after its check ran and the work is committed. One item in progress at a time.

In progress: (none) — overnight queue finished · check-ins without a commit: 0

1. [x] UX fixes A — safety & correctness: grown-up gate (Parent / manage / add), learner-scoped Settings, plurals, sign-out lands on landing, "In English/Spanish" tags, ≥40px targets, magic-box noise (counter near limit, shortcut hint), wider science keywords, Family figures + "no activity", "Choose a course", phone scene toggle. (critique #2,6,7,8,10,11,12,14,15)
2. [x] UX fixes B — stage for pre-readers: tap-to-hear on every learner text (default on for K–2), Read aloud includes widget items, tutor panel collapsed by default, larger K–2 stage type, Look/Try/Check/Do icons, finish screen without an all-zero line. (critique #1,9,13)
3. [x] UX fixes C — pictures & no dead ends: course art from each course's own visuals; K–2 Home leads with picture tiles; template lessons and outline-only courses point to the closest ready-made course. (critique #3,4,5)
4. [x] Journey test in repo: move the persona walkthrough into `apps/web/e2e/` (Playwright, local Chrome), run at 390 and 1440, review screenshots, fix what it shows.
5. [x] Polish pass, screen by screen (impeccable polish + craft floor): landing, auth, profiles, home, magic box, generation, courses, course page, stage + each widget, growth, family, settings — desktop and phone.
6. [x] Depth: write lessons 2–4 for every catalogue course; add a grade 9 science course; keep the catalogue integrity test green.
6b. [x] Review fixes: 14 findings from the independent review (multi-tab store, gate bypass on profiles, repeat Check inflation, assisted carry-forward, builder Back deleting a course, redo finished lesson, gated delete, html lang, page titles + focus, open redirect, reorder focus, store shape validation, DST week stepping, double submit, landing strings).
7. [x] Final: `npm run verify`, journey test, last screenshot review, update README/STATUS, write the Morning report below, delete the cron job.

## Morning report (2026-10-07)

**Try it — 2 minutes**
1. `cd ~/Documents/GitHub/Tutornat && npm install && npm run dev` → open http://localhost:3000
2. Get started → create a family account (stays in this browser) → add a kindergartner and a grade 4 learner.
3. Tap the kindergartner → picture tiles → "First, next, last" → tap a speaker button to hear any line, sort the story, check it.
4. Switch → Parent → answer the times-table question → Family shows exactly what happened.

**What works now**
- Landing with a live fraction-bar hero; EN/ES everywhere (toggle on landing and sign-in).
- Family account → learner profiles; grown-up gate in front of Parent, manage learners, delete.
- K–2 home is picture-first with tap-to-hear; grade 3+ home leads with the magic box.
- 13 hand-written courses, 52 lessons, 5 interactive widgets; honest Growth + Family record.
- Magic box builds a template outline (labelled), offers a matching ready-made course, never dead-ends.
- Gates green: 45 unit tests, journey + axe accessibility audit at 1440 and 390 px, production build.

**Not done / needs you**
- AI tutor and real course writing (OpenMAIC) — not connected; outlines from the box are templates.
- Real accounts/database — demo saves in the browser only.
- Deploy to kaizenedu.net — waiting for your go-ahead. Preview of `foundation` is live (Vercel login
  required): https://kaizenedu-5ki2fsmjn-saitokikus-projects.vercel.app
- `foundation` is pushed to GitHub (not merged into `main`).
- Rotate the six provider keys committed in the old KaizenEdu repo.
- Spanish copy needs a native-speaker read before launch.

**Next:** pick the backend (ROADMAP Phase 2) — accounts, database and child-privacy consent come before any AI.
