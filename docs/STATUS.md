# Status

## Learning fabric — overnight queue 2 (owner asleep 2026-10-07 → morning)

Spec: [specs/2026-10-07-learning-fabric-design.md](specs/2026-10-07-learning-fabric-design.md).
Owner: "super detailed codebase … all features you can step by step … the ultimate learning fabric …
start with k-9 math and English and science … use real sources … work all night … don't ask for
permission". Work top to bottom. Tick only after `npm run verify` passed and the work is committed.
Keep production (kaizenedu.net) untouched; preview deploys only.

In progress: Q14 · check-ins without a commit: 0

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
- [ ] Q14. Landing for the four jobs; nav update (Today, Practice, Talk, Learn, Calendar, Growth).
- [ ] Q15. ES pass, e2e journeys (help-now, daily practice, homeschool, school import), axe audit, screenshots, README/STATUS/ROADMAP, preview deploy, morning report.

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
