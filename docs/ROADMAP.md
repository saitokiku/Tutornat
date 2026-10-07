# Roadmap

Each phase swaps what's behind the screens, not the screens. Status lives in [STATUS.md](STATUS.md).

## Phase 0 — Frontend foundation (now)

Landing, account + learner profiles, student dashboard, magic box, template course generation, K–9
catalogue, lesson stage with five widgets, Growth, Family, Settings. Everything saves in the browser.
Spec: [specs/2026-10-07-foundation-design.md](specs/2026-10-07-foundation-design.md).

## Phase 1 — Depth and polish (next)

- Write lessons 2–4 of every catalogue course; add grade 9 science; more widgets where a topic needs
  one (area model, place value, sentence builder, food web, circuit).
- Visual polish pass on every screen against DESIGN.md; motion where it explains.
- Parent ↔ child loop: notes the child can see, parent-assigned courses highlighted on Home.
- Playwright journeys (parent and student, 390 px and 1440 px) in CI.

## Phase 2 — Backend

Replace the bodies of `apps/web/src/lib/{auth,profiles,courses,activity}.ts` with server calls.

- Accounts/sessions: reuse `modules/kaizenedu-tutor/lib/tutor/{auth,accounts,db}` (scrypt, cookie
  sessions, raw pg) or Supabase from `modules/kaizen-ai/supabase` — pick one, Postgres either way.
- Learner records: trellis evidence model (`modules/trellis/db`) keeps practice-with-help separate
  from independent proof — matches the Growth rules already in the UI.
- Children's privacy: COPPA consent flow, retention, export/delete (drafts in
  `modules/kaizenedu-tutor/compliance`). Required before any real child uses it.
- Deploy: Vercel project `kaizenedu` → preview first, then kaizenedu.net.

## Phase 3 — OpenMAIC engine behind the screens

The owner's bar: OpenMAIC's full teaching stage, then better.

- Generation: `generateOutline` → OpenMAIC outline + scene generators
  (`modules/openmaic-classroom/packages/@openmaic/generation`, API map in
  `docs/history/hermes-handoff/delivery/fullstack/native/UI_CONTRACT.md`). A KaizenEDU course = several
  OpenMAIC stages; a lesson = one stage.
- Stage: `/learn` renders OpenMAIC scenes (slides with narration, quiz, interactive widgets in sandboxed
  iframes, PBL), whiteboard, playback — inside our stage frame and design system.
- Model policy: server-side only, API key (not the subscription OAuth adapter), no client keys.
- Keep our own widgets as the hand-tuned K–9 set; OpenMAIC widgets for open topics.

## Phase 4 — The tutor

- Contextual chat in the tutor panel (answers the actual latest question, grounded in the scene).
- One learner-facing tutor; stage artist and learning coach as tools behind it.
- Voice after chat is proven: KaizenEdu's VAD/turn-taking (`modules/kaizenedu-tutor/lib/tutor/voice`).
- Checks → evidence: trellis grading + student model, Kaizen-AI mastery engine.

## Phase 5 — Beyond K–9

Adults (profiles already support it), more subjects, curated open curriculum with per-item rights
checks (`docs/history/discovery/delivery/fullstack/research/oer-20261003/`).
