# Status

Live checklist for the foundation build. Plan: [plans/2026-10-07-foundation-plan.md](plans/2026-10-07-foundation-plan.md) · Spec: [specs/2026-10-07-foundation-design.md](specs/2026-10-07-foundation-design.md)

Rule: a box is ticked only after its check actually ran. Note blockers under the task.

## Foundation (frontend only)

- [x] 1. Workspace, scaffold, tokens
- [x] 2. Types, store, i18n
- [x] 3. Domain functions + K–9 catalogue (12 courses; gap: no grade 9 science course yet)
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

In progress: 6 (depth, background agent) · started: 03:45 · check-ins without a commit: 0

1. [x] UX fixes A — safety & correctness: grown-up gate (Parent / manage / add), learner-scoped Settings, plurals, sign-out lands on landing, "In English/Spanish" tags, ≥40px targets, magic-box noise (counter near limit, shortcut hint), wider science keywords, Family figures + "no activity", "Choose a course", phone scene toggle. (critique #2,6,7,8,10,11,12,14,15)
2. [x] UX fixes B — stage for pre-readers: tap-to-hear on every learner text (default on for K–2), Read aloud includes widget items, tutor panel collapsed by default, larger K–2 stage type, Look/Try/Check/Do icons, finish screen without an all-zero line. (critique #1,9,13)
3. [x] UX fixes C — pictures & no dead ends: course art from each course's own visuals; K–2 Home leads with picture tiles; template lessons and outline-only courses point to the closest ready-made course. (critique #3,4,5)
4. [x] Journey test in repo: move the persona walkthrough into `apps/web/e2e/` (Playwright, local Chrome), run at 390 and 1440, review screenshots, fix what it shows.
5. [x] Polish pass, screen by screen (impeccable polish + craft floor): landing, auth, profiles, home, magic box, generation, courses, course page, stage + each widget, growth, family, settings — desktop and phone.
6. [ ] Depth: write lessons 2–4 for every catalogue course; add a grade 9 science course; keep the catalogue integrity test green.
6b. [x] Review fixes: 14 findings from the independent review (multi-tab store, gate bypass on profiles, repeat Check inflation, assisted carry-forward, builder Back deleting a course, redo finished lesson, gated delete, html lang, page titles + focus, open redirect, reorder focus, store shape validation, DST week stepping, double submit, landing strings).
7. [ ] Final: `npm run verify`, journey test, last screenshot review, update README/STATUS, write the Morning report below, delete the cron job.

## Morning report

(written at the end of the night)
