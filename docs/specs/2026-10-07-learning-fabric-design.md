# KaizenEDU learning fabric — design

2026-10-07 · supersedes nothing; extends [2026-10-07-foundation-design.md](2026-10-07-foundation-design.md).
Owner's words for this phase (recorded in [../DECISIONS.md](../DECISIONS.md)):

> "focus on getting the tutor part and dashboard and academic integration and calendar organizations,
> basically at home kumon with on demand practice gernetor and kumon at home generate lessons catered to
> you. and also talks and teaches naturally. and ai works to interface, help grow, track shadow work etc
> and keep your growth aligned and happening"

> "should also be marketed and catered for home schooling and parents who need homework/ test / tutoring
> help immediately and also students who are already good this should ease their life a lot"

> "the ultimate learning fabric in the world but start with k-9 math and English and science and as
> always use real sources for books courses and etc"

Prior work this design keeps (digests of all four earlier repos, 2026-10-07): the mastery law from
Kaizen-AI's engine and trellis (practice never proves; only unassisted, code-checked, delayed checks on
separate days do), KaizenEdu's tutor manner (short turns, ask before telling, no praise words, crisis
handled without a model), OpenMAIC's "latest message first" rules and visual-first lessons, Hermes's
quality gates (a lesson without a real visual and a real learner action is rejected, not badged).

## 1. Who it serves — four jobs, one product

| Job | Who | What they get first |
|---|---|---|
| **Help right now** | A parent at 8 pm with a stuck child; a student before a test | One tap to "Get help": type or snap the problem, the tutor works it through with them without doing it; "I have a test on…" builds a prep plan in seconds |
| **Daily practice (at-home Kumon)** | Parents who want structure | A short daily set per subject at the right level, checked instantly, with corrections, pace and honest progress |
| **Homeschool** | A parent running school at home | A skill map per subject (the scope and sequence), a weekly plan, lessons on demand, a reading log and an exportable record of dated work and proved skills |
| **Stay on top** | Students who are already good | Placement that starts at their real level and moves fast, school calendar import, assignment and test tracking, test prep that schedules itself |

Setup asks once what the family wants ("Homework help", "Daily practice", "Homeschool", "Stay
organized") and sets defaults (daily minutes, which sections lead on Today, whether school import is
offered). Everything stays available; the answer only changes emphasis.

## 2. Principles

1. **Code checks answers; AI talks.** Every practice answer is checked by `practice/answer.ts`. The
   tutor calls tools for arithmetic, hints and similar problems; it never grades.
2. **Practice is not proof.** Records keep three things apart: on your own, with help, proved later.
3. **Works without AI.** Practice, plan, calendar, school import, records and the demo tutor run with no
   provider. AI adds conversation, lesson writing, reading documents and open-topic questions — and
   everything AI-made says so.
4. **One next step.** Today shows the next thing first. Nothing piles up: missed work rolls into the
   plan once, quietly.
5. **No engagement tricks.** No streak loss, no points, no leaderboards, no "come back" nudges, no
   notifications to children.
6. **Real sources.** Facts beyond our own items link to named, free, real sources; links are checked.

## 3. Modules (all under `apps/web/src`)

| Module | Role |
|---|---|
| `practice/` | Skill map (lattice with prerequisites, CCSS/NGSS codes), seeded generators, safe algebra parser, answer checker. Pure; runs on server and client. |
| `learning/` | Evidence ledger rules, skill status, level stepping, review spacing, placement, set building. Pure functions of evidence + now. |
| `planner/` | Today plan, calendar projection, test-prep scheduling, ICS import/export, syllabus text parsing. Pure. |
| `lib/` | Store-backed actions screens call (`practice.ts`, `school.ts`, `plan.ts`, `tutor.ts`, `records.ts`). Backend-shaped: bodies become API calls later. |
| `lib/ai/` + `app/api/` | Provider resolution, prompts, tools, safety screen, routes: tutor, course, practice, extract, coach, status, ICS fetch. |
| `resources/` | Curated real sources per skill and topic (verified links). |
| `components/` | Practice runner, keypad, visuals, tutor drawer and talk mode, calendar, plan, family views. |

## 4. Practice — the at-home Kumon

**Skills.** ~130 skills: math K–9 (computed), English K–9 incl. rhetoric (draft banks), science K–9
(draft banks + computed formulas). Each has levels (difficulty steps), prerequisites and a generator
`(rng, level, locale) → item`. `content: "draft"` marks hand-written banks not yet reviewed by a teacher;
every surface reporting them says "draft questions". Spanish learners practice the Spanish equivalent of
language skills (Spanish phonics, ¿?¡!, al/del), not translated English rules.

**A set.** K–2: 6 problems, 3–9: 10. One skill, plus up to two review problems from proved skills that
are due, interleaved. Problems come one at a time with a progress strip; the keypad, fraction pad,
choice tiles or text box fit the answer type. Every problem can be read aloud.

- **Hint ladder:** "Help" gives the next hint (nudge → strategy → first step). After two real tries the
  worked steps are offered. Any help marks that answer "with help".
- **Corrections:** missed problems come back at the end ("Fix these"); a fixed answer counts as "with
  help", never "on your own".
- **Level stepping:** start at level 1 (or the last level used); up after 5 in a row on your own; down
  after 2 misses in a row.
- **Pace:** each problem has a comfortable time; the set shows "about N min". Grades 3+ see their time
  against the pace at the end; K–2 never see a clock. Pace never blocks.
- **Finish:** right on your own / with help / not yet, pace, and the one next step.

**Status of a skill** (pure function of evidence):

| Status | Rule | Shown as |
|---|---|---|
| new | no evidence | — |
| practicing | any practice | "Practicing" |
| ready | 10 correct on your own at the top level across the last two sets | "Check opens <day>" (48 h after the last help on this skill) / "Check ready" |
| checked once | one check passed (≥4 of 5 fresh problems, no help available) | "Passed 1 of 2 checks" — second opens 6 days later |
| proved | two checks passed on different days ≥ 6 days apart | "Proved on your own <date>" |
| refresh | a proved skill missed 2 review problems in a row | "Needs a refresh" → one set + one check restores it |

A failed check returns the skill to practicing (misses count; the next check needs 10 new clean answers
and 48 h). If a ready skill goes 14 days without a check, the plan says so plainly and the parent view
lists it ("no silent trap"). Two misses in a row at level 1 suggest the prerequisite; three sets under
60% raise a "stuck" note for the parent and offer the tutor.

**Placement** ("Find my level", optional): up to 12 problems walking the skill map by grade, starting
a grade below; the learner starts one skill below where they first miss twice. Placement answers are
recorded as placement, never as proof.

**On-demand practice:** pick any skill from the map, or type ("like 3/4 + 1/6", "my test is on
volcanoes"). Matching skills come first; open topics use AI-written questions (multiple choice with a
key, checked by index), labelled "AI-written questions" and never counted as proof.

## 5. Today, plan and calendar — the shadow work

`planner/plan.ts: planFor(profile, state, day)` is a pure function. Order:

1. Checks that are open (they outrank new work).
2. School prep: a test or quiz within 7 days with linked skills → a prep set on each of the 3 days
   before (interleaved review of those skills).
3. School work due within 2 days (tick off; "Get help" opens the tutor with it).
4. Daily sets per enabled subject: the next skill on each subject's map (lowest skill not yet ready
   whose prerequisites are ready or proved), then reviews due.
5. The course lesson in progress.
6. "If you have more time": explore (magic box), another set, a resource.

The daily minutes budget (default K–2 10, 3–5 15, 6–9 20, adult 20; parent-set) decides how much
leads; the rest folds under "If you have more time". Done markers are stored per day; nothing else
about the plan is stored, so it can never go stale.

**Calendar** = stored events (school, family) + projected items (checks opening, prep sets, daily
practice). Week view on desktop, day list on phone. Export: `.ics` download. Import: `.ics` file or
calendar feed URL (Google Classroom / Google Calendar secret iCal address, Canvas calendar feed,
Schoology), fetched by `/api/ics` with SSRF guards; events are classified (test, quiz, homework,
project, no school) and matched to classes by name; re-import updates by UID.

**School.** Per learner: classes (name, subject, teacher, color), events, teacher feedback, school
results. Intake by paste (deterministic date + keyword parser; AI extraction when connected; never
invents a date, every guess is listed), by file (`.ics`), or by photo (AI only). Teacher feedback ("needs
work on borrowing") maps to skills (keywords, or AI) and becomes a feedback set in the plan. School
results are labelled "from school" and never mix with our evidence.

## 6. The tutor

One learner-facing tutor, no name until one is screened (trellis research), disclosed as a computer at
the start of every sitting. Two places: a **drawer** beside a problem or lesson scene, and **Talk**, a
full-screen conversation with a board where visuals, worked examples and practice cards appear.

**Manner** (from KaizenEdu's persona rules): at most two short sentences then one question; ask before
telling; predict first; concrete before abstract; one question per turn; never the answer to a live
problem before a try; re-teach a different way; numbers said the way you'd say them; no praise words.
Per band: K–2 five-to-ten-word sentences and pictures; 3–5 one idea per sentence; 6–9 direct, never
talks down; adults peer.

**Tools** (AI SDK v7, `streamText` + typed tools):

| Tool | Runs | Does |
|---|---|---|
| `get_problem` | server | the current problem (regenerated from its seed; the key stays server-side) |
| `next_hint` | server | the next rung of the vetted hint ladder; marks help |
| `check_answer` | server | runs the checker on what the learner said |
| `similar_problem` | server | a new problem of the same skill with worked steps |
| `show_visual` | client | draws one of the shared visuals on the board |
| `find_skill` | server | searches the skill map |
| `start_practice` | client | offers a practice card (skill or topic) |
| `find_resources` | server | real sources for a skill/topic |
| `add_to_calendar` | client | proposes an event; the person taps Add |
| `note_for_grownup` | client | leaves a note in the family view |

**Voice:** read-aloud uses the browser's speech (on by default K–2). Talking to the tutor uses the
browser's speech recognition, push-to-talk, and must be switched on per learner by a grown-up (the
browser may send audio to Apple or Google — said plainly). Replies are spoken sentence by sentence as
they stream; pressing the mic stops speech. Typing always works.

**Safety:** a pattern screen runs before any model call; self-harm or abuse gets a fixed, kind referral
(988, Childhelp 1-800-422-4453, a trusted adult) with no model call and a note for the grown-up;
off-limits topics get a one-line redirect. No personal questions, no "come back" nudges, no emotional
check-ins, a break reminder after 3 hours in a sitting, transcripts visible to grown-ups, nickname never
sent. Rate and length limits per request.

**Without AI** ("demo tutor"): the same drawer answers with the vetted hints, the worked similar problem
and practice cards, and says it is the demo tutor.

## 7. AI everywhere else

| Route | Does | Without AI |
|---|---|---|
| `POST /api/ai/course` | Lessons from the magic box, personalized by grade, interests, practicing skills and upcoming school topics; streams one lesson at a time in our Scene schema; each lesson must pass the gates (a real visual or interactive per teaching scene, a check tied to the objective, valid keys, locale) or it is retried once and otherwise left out with a note | Template outline (labelled) |
| `POST /api/ai/practice` | Questions for open topics, schema-validated, keys checked by index | Matching skills only |
| `POST /api/ai/extract` | Syllabus, assignment sheet, teacher note or photo → events, topics, skills, and a list of guesses | Paste parser + keyword mapping |
| `POST /api/ai/coach` | A short note for the parent written from computed numbers | Numbers only |
| `GET /api/ai/status` | Which provider is live | — |

Provider: `ANTHROPIC_API_KEY` (direct, preferred) → Vercel AI Gateway (`AI_GATEWAY_API_KEY` or the
deployment's OIDC token) → demo. Fixed per deployment, shown in Settings, no silent fallback.
Models: talk `claude-sonnet-5-5`, build `claude-opus-5-5`, quick `claude-haiku-4-5`; env-overridable
(`KAIZEN_MODEL_TALK`, `_BUILD`, `_QUICK`).

## 8. Resources — real sources

`resources/` holds named, free, real sources per skill family and topic, each with source, kind (video,
simulation, book, text, practice), grade band, language and a one-line description; every URL is checked
before it ships. Shown on skill pages, in lesson ends, in the tutor (`find_resources`) and in the parent
view. Includes read-aloud and picture-book libraries for pre-readers and public-domain books for older
readers. We link, never copy.

## 9. Parents and homeschool

- **Family** shows each child: today's plan status, the week in numbers (own / with help / proved),
  where help was needed, checks waiting, school coming up, tutor transcripts, notes.
- **Per-child settings:** daily minutes, subjects, timer, voice permission, goals from setup.
- **Homeschool records:** a dated log (minutes per subject per day, sets, lessons, skills proved,
  books read) with CSV export and a printable page. Never claims to satisfy a state's rules.
- **Reading log:** title, author, minutes, date; suggestions link to real free libraries.

## 10. Phases of this build

1. Practice engine + generators + visuals (done/ongoing).
2. Learning engine (status, levels, reviews, placement) + practice UI.
3. Today plan + calendar + school + ICS + paste intake.
4. AI layer + tutor drawer + Talk + voice.
5. AI course/practice/extract/coach wiring.
6. Resources, homeschool records, reading log, onboarding goals, landing for four audiences.
7. Family dashboard, settings, ES pass, e2e + a11y, docs, preview deploy.

Out of scope tonight: real accounts/database, COPPA consent flow, payments, teacher accounts,
OAuth integrations with Google Classroom/Canvas APIs (feeds only), realtime speech-to-speech.
