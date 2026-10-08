# Status

> **Stopped 2026-10-07 (out of tokens). Start with [HANDOFF.md](HANDOFF.md).**

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

1. [x] **Contracts** — shared types, append-only registries with union merge, `logAct`, review state (55cfb79).
2. [x] **Parallel build** (features and design done; content still in audit/fix) (isolated worktrees from 55cfb79; each package: build → two adversarial reviews → fix)
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
   landing) and the spotlight engine. Each: build → two adversarial reviews → fix → merge → typecheck + unit
   tests; full verify + e2e per batch. Integration repairs merged as their own commits.
   **Use it after every batch** (owner: "use what you make … as feedback"): a hands-on pass in the browser
   as a grown-up, a K learner and an older learner; findings in [dogfood/](dogfood/) and fixed before the
   next batch. Pass 1: [dogfood/2026-10-07.md](dogfood/2026-10-07.md) (13 findings, 1 blocker).
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

## Blocked on owner

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
