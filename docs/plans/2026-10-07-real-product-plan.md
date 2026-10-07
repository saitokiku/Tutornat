# From demo to the real product — review and plan

2026-10-07, after the second overnight build. Owner's ask: "Review what you can fix, what's keeping it
from being my ideal product in reality and then write a plan to build it."

The ideal, in the owner's own words ([../DECISIONS.md](../DECISIONS.md)): a teacher machine for anyone,
literate or not, starting with US K–9 math, science and English/rhetoric · at-home Kumon with an
on-demand practice generator · lessons made for each learner · a tutor that talks and teaches
naturally · AI that does the shadow work and keeps growth aligned · honest records for parents ·
real sources · for homeschoolers, families who need help tonight, and kids who are already good ·
"full OpenMAIC put together better than its creators thought" · no AI slop.

## 1. Where it stands

33k lines in `apps/web`. 134 skills (84 computed, 50 draft banks), 13 catalogue courses, a planner,
calendar import, a tutor with tools, a lesson writer with gates, ~50 checked sources, a family
dashboard. 727 unit tests, 12 e2e runs, preview deployed. Everything lives in one browser's
localStorage. AI is built but off (no provider connected). No one outside this session has used it.

## 2. What's keeping it from the ideal — ranked by how much it matters

| # | Gap | Why it blocks the ideal | Who |
|---|---|---|---|
| 1 | **One browser, no accounts.** A parent's phone and a child's tablet don't share anything; clearing the browser deletes the family. | A daily product for a family must be the same product on every device. Until then it is a demo. | me (code) + you (provision a database) |
| 2 | **The AI isn't on.** The tutor, lesson writer and document reader have only run against a mock model. | "Talks and teaches naturally" is untested in reality. Prompt quality, tool behaviour, latency and cost are unknown. | you (a fresh key) → me (evals, fixes) |
| 3 | **No real child has used it.** | The ideal is defined by kids learning and coming back. We have zero evidence and will be wrong about things only a 6-year-old can show us. | you (3–10 families) + me (fixes) |
| 4 | **Voice is the browser's.** Robotic speech synthesis, push-to-talk, no barge-in, no streaming. | Kumon-at-home for pre-readers and "natural" conversation both need a voice that sounds like a person and listens while it speaks. | you (vendor + key) → me |
| 5 | **Content is thin where it matters most.** English 2–4 skills per grade, science 2–4, all multiple choice; 50 banks unreviewed; 1 Spanish course. Kumon has hundreds of levels per subject. | A daily set per subject for 9 grades needs ~400 skills, reading and writing practice, and teacher-reviewed banks. | me (author) + a teacher (review) + a Spanish reviewer |
| 6 | **No children's-privacy layer.** No verifiable parental consent, retention, export/delete, provider terms for minors. | We cannot legally serve under-13s, which is the primary audience. | counsel + me |
| 7 | **The lesson stage is the foundation's.** Five widgets; no narrated slides, whiteboard, generated interactives, playback. | The owner's bar is OpenMAIC-and-better. | me |
| 8 | **Shadow work stops at the plan.** No weekly parent email, no feed refresh, no "it's been 14 days" nudge to the parent, Growth page ignores practice evidence. | "AI keeps growth aligned" needs a loop that runs without anyone opening the app. | me (+ email provider) |
| 9 | **No operations.** No error tracking, backups, spend caps per learner, uptime. | A family's record must not vanish; AI cost must not surprise you. | me |
| 10 | **Pre-readers get emoji and robot speech.** | "Illiterate" learners need recorded or natural audio, real pictures, rhythm and repetition. | me (after 4) |

Smaller things I found reviewing the code (all mine to fix, no decisions needed): Growth page not on
the evidence model; no localStorage quota guard; Talk can't take a photo of homework; the child page
and calendar are long single scrolls; placement walks one subject linearly; demo password hashing;
in-memory rate limits; `recentSkills` recomputed per render on Talk.

## 3. What I can fix now vs what needs you

**Now, with nothing from you:** everything in §2 rows 7, 8, 10 (partly) and the small list above;
the data layer (schema, sync, auth) built and tested against an in-process Postgres (`pglite`) so it
only needs a connection string at the end; more skills and lessons (authored, still "draft" until
reviewed); the eval harness; the voice pipeline behind an interface (vendor plugged in later).

**Needs you (each is one action):**
1. A **database**: Neon through the Vercel Marketplace (one click, free tier) — recommended; or Supabase.
2. A **fresh Anthropic API key** with a monthly cap (the one in the Vercel project is from the old attempt).
3. A **voice vendor**: Deepgram (speech-to-text, streaming) + ElevenLabs (text-to-speech, streaming) is
   what the earlier research found fastest (~$0.25–0.65 per 15-minute session). One-vendor alternative:
   OpenAI for both. Note: Anthropic has no speech API, so this is separate from the thinking-model policy.
4. **Resend** (or any email API) for the weekly parent email.
5. A **lawyer** for the COPPA pieces (verifiable consent method, privacy policy, retention).
6. **Pilot families**, 3–10, ideally with a kindergartner, a 4th grader and a middle schooler.
7. **Reviewers:** a K–9 teacher for the draft banks; a native Spanish speaker.
8. The old keys rotated and the ~100 stale Vercel variables deleted (security hygiene).

## 4. The plan

Eight phases. 1–2 are the floor; 3–8 can run in parallel with each other where noted. Each task ends
with a check that must pass before it is ticked. Estimates assume me plus parallel authoring agents,
and you unblocked within a day of being asked.

### Phase 1 — Real for one family (accounts, database, sync) · ~2 weeks

The screens stay as they are; `src/lib/*` bodies change. The client store becomes a cache of the
server's record.

- **1.1 Schema.** `apps/web/db/schema.ts` (Drizzle) mirroring `StoreState`: `accounts`, `sessions`,
  `profiles`, `courses`, `activity`, `notes`, `attempts`, `sets`, `events`, `classes`, `feedback`,
  `results`, `plan_done`, `reading`, `threads`, each with `account_id`, `updated_at`, `deleted_at`.
  Append-only trigger on `attempts` (port of trellis's invariant). Check: migrations apply to `pglite`
  in a test; inserting then updating an attempt fails.
- **1.2 Auth.** scrypt + httpOnly cookie sessions ported from
  `modules/kaizenedu-tutor/lib/tutor/auth`; routes `/api/auth/{sign-up,sign-in,sign-out,reset}`;
  rate-limited; password reset by email (stub until 4). Check: e2e sign-up → new browser context →
  sign-in sees the same family.
- **1.3 Sync.** `src/lib/store.ts` keeps its `update()` contract; each `update` computes the changed
  records (by id and list) and POSTs them to `/api/sync`; `GET /api/state` on load and on focus;
  append-only lists merge by id, mutable records last-write-wins by `updated_at`, offline queue in
  IndexedDB replayed on reconnect. Check: unit tests for merge; e2e: two browser contexts, a child
  finishes a set on one, the parent's page on the other shows it after refresh.
- **1.4 Server-side truth for what matters.** Answers are still checked in the browser for speed, but
  `/api/sync` re-checks every `attempt` from its (skill, level, seed, response) before storing it, and
  checks are regenerated server-side. Check: a forged "correct" attempt is stored as incorrect.
- **1.5 Preview with the database.** `DATABASE_URL` on Vercel Preview; smoke test. Check: the four
  e2e journeys pass against the preview URL (`BASE_URL` env).

### Phase 2 — Turn the AI on and make the tutor good · ~1–2 weeks (needs key)

- **2.1 Eval harness.** `apps/web/evals/`: 40 scripted conversations (K hint-seeking in Spanish, grade 4
  wrong answer, "just tell me", off-topic, homework photo, lesson question, crisis, adult) with
  deterministic judges (no answer before a try, ≤2 sentences + 1 question, no praise words, tool used
  for arithmetic, Spanish reply) and a model judge for tone. `npm run evals` prints pass/fail, median
  latency and cost per turn. Check: runs green on the mock; then against the real model, fix prompts
  and tools until ≥ 90% deterministic pass.
- **2.2 Spend caps.** Per-learner daily token budget in the DB; `/api/tutor` refuses past the cap with
  a plain message; monthly cap per account. Check: unit test and a forced-cap e2e.
- **2.3 Photo of the problem.** Talk and the drawer accept an image (Claude vision): the tutor reads
  the problem, confirms it in words, then teaches. Check: eval case with a photographed worksheet.
- **2.4 Lesson writer in reality.** Run the writer on 30 goals × 3 grades; measure gate pass rate and
  time; tune prompts; cache lessons by (goal, grade, locale) so the second family gets it instantly.
  Check: ≥ 80% of lessons pass gates first try; median time to first lesson < 40 s.
- **2.5 Document reader in reality.** 20 real syllabi/emails/photos; measure date accuracy; keep the
  review step. Check: no invented dates in 20/20.

### Phase 3 — A voice that feels like a person · ~1–2 weeks (needs vendor) — parallel with 4

- **3.1 Speech interface.** `src/lib/voice/{stt,tts}.ts` behind `SpeechIn`/`SpeechOut` interfaces;
  browser implementations stay as the fallback.
- **3.2 Streaming TTS.** Sentence-by-sentence as the reply streams; per-band voice and pace; stop on
  barge-in. Check: first audio < 1.5 s after the reply starts (measured in the eval harness).
- **3.3 Streaming STT with end-of-turn detection** and a mic self-test with a level meter; push-to-talk
  stays on phones. Check: a child's "mhm" does not end the tutor's sentence (backchannel test clips).
- **3.4 K–2 mode:** the tutor speaks first, repeats on request, rhythm and counting chants (recorded
  once per language, cached). Check: a pre-reader journey done without reading anything.
- Under-13 voice goes live only after Phase 5 (audio to a vendor needs consent and zero retention).

### Phase 4 — Content depth: the Kumon ladder · 3–4 weeks of parallel authoring, then review

Target: ~400 skills, every grade with a full daily year in each subject.
- **4.1 Math:** 10–15 skills per grade; fluency drills with Kumon "standard times" (shown after, never
  a countdown); word problems themed by interests (computed, templated); K–2 picture problems.
- **4.2 English:** a phonics sequence K–2 (30 skills, every item with audio); reading passages 3–9
  (200 short originals, with comprehension, main idea, inference, vocabulary in context); grammar and
  usage to 10 per grade; **writing practice** (short responses graded by rubric with AI feedback,
  labelled, practice-only; a human-reviewed exemplar per prompt); rhetoric and argument 7–9.
- **4.3 Science:** NGSS-mapped banks 6–8 per grade; more computed skills (unit conversion, graphs,
  Punnett, circuits, moon phase from date); "explain" items with AI feedback (practice-only).
- **4.4 Spanish:** every bank's Spanish side reviewed; Spanish catalogue lessons for every strand.
- **4.5 Review workflow:** a `/review` page for a signed-in reviewer: items by skill, approve/flag,
  stored as `reviewed_by/at`; "Draft questions" badge disappears per skill when all items are approved.
  Check: the badge is gone for the first 20 reviewed skills.
- **4.6 Catalogue:** one human-reviewed course per strand (AI-written with the key, reviewed, committed).
- **4.7 Resources:** 150 sources; a link checker in CI.

### Phase 5 — Children's privacy and launch gates · ~2 weeks + counsel — parallel with 3/4

- **5.1 Parent-first onboarding:** no child data before verified consent; consent receipts (purpose,
  policy version, method, time); separate consent for voice (audio to a vendor).
- **5.2 Verifiable consent method** chosen with counsel (a small card charge is the COPPA-listed route).
- **5.3 Privacy policy, terms, retention policy pages;** export (JSON/CSV) and delete-everything
  (account, children, transcripts) with a job that also purges vendor-side data.
- **5.4 Provider terms:** Anthropic's minors conditions (disclosure, age assurance, moderation) in
  writing; voice vendor zero-retention in writing.
- **5.5 Ops:** error tracking with PII scrubbing (no names, no transcripts), daily DB backups,
  uptime check, cost dashboard. Check: a drill restores a backup to a preview.

### Phase 6 — The stage beyond OpenMAIC · ~2–3 weeks — after 2

- **6.1 Narrated slides:** every slide block can be spoken by the tutor's voice with word-level
  highlights; playback controls (play, pause, speed).
- **6.2 Whiteboard:** the tutor draws our SVG visuals and simple strokes live during Talk (`show_visual`
  → animated reveal), with a text equivalent.
- **6.3 Generated interactives:** port `@openmaic/dsl` types and the sandboxed iframe host
  (`modules/openmaic-classroom/components/scene-renderers/InteractiveIframeHost.tsx`); the lesson
  writer may emit an interactive HTML scene that passes static checks (no network, no storage, size
  cap) and the gates; observation bridge for evidence. Check: 20 generated interactives run in the
  sandbox with no console errors.
- **6.4 Rhythm and repetition for K–2:** counting songs, call-and-response checks, "say it with me".
- **6.5 Lesson playback** as a short video-like run (narration + reveals) for review and sharing.

### Phase 7 — Shadow work that runs itself · ~1 week — after 1

- **7.1 Growth page on the evidence model:** skills over time, proved/practicing per subject, help slope.
- **7.2 Weekly parent email** from computed facts (opt-in, nothing for an empty week); no email to children.
- **7.3 Feed refresh:** linked class calendars re-read nightly; new tests appear on the plan.
- **7.4 Parent nudges (email only):** a check waiting 14 days, a stuck skill, a test in 3 days with no prep done.
- **7.5 Placement v2:** cross-grade, per subject, resumable.

### Phase 8 — Real families · continuous, from the end of Phase 1

- 3–10 families on the preview (with Phase 5 done for any under-13).
- Measure only: return without prompting, check completion rate, minutes per day, help slope, where
  they quit. Watch two sessions a week (recorded with consent, or sitting beside them).
- Fix the top three frictions every week. Then move kaizenedu.net.

## 5. Order and estimate

```
Week 1–2   Phase 1 (data) ──────────────┐  Phase 4 authoring starts (agents), Phase 7.1 now
Week 3–4   Phase 2 (AI on) ─────────────┤  Phase 5 with counsel, Phase 4 continues
Week 5–6   Phase 3 (voice) + Phase 6 ───┤  Phase 8 pilot starts (older kids first)
Week 7–8   Phase 6, 7, review fixes ────┘  Phase 4 review, Phase 8 fixes
Week 9–10  Buffer, pilot feedback, kaizenedu.net
```

About ten weeks to a product real families use daily, if the "needs you" list is cleared in the
first week. Without the AI key, voice vendor and database, the ceiling is the demo you have now.

## 6. What I would start tomorrow, in order

1. Phase 1.1–1.4 (buildable and testable with `pglite` before you provision anything).
2. Phase 7.1 and the small fixes from §2.
3. Phase 4 authoring in parallel agents (math depth first, then phonics with audio scripts).
4. Phase 2.1 eval harness on the mock, so the day the key arrives we measure instead of guess.
