# KaizenEDU foundation — design spec

Date: 2026-10-07 · Status: building · Owner decisions: [DECISIONS.md](../DECISIONS.md) · Product: [PRODUCT.md](../../PRODUCT.md)

## 1. What this phase delivers

The long-term product is a teacher machine for any learner, literate or not. This phase starts narrow:
**US students, kindergarten through 9th grade**, in **math, science and English/rhetoric**, plus a
**parent side** that tracks each child and helps them improve. Adult learners are last; the data
model and screens must still work for an adult profile.

A clean, runnable **frontend** in `apps/web`, with no AI calls and no real backend:

- landing page with a real hero
- account login (parent/guardian email + password), learner profiles under the account
- student dashboard in the Kaizen-AI interior style, and a parent dashboard
- the **magic box**: type what you want to learn and/or drop material in
- **course generation** flow: request → visible progress → editable outline → course
- course library + a hand-written K–9 starter catalogue (math, science, English/rhetoric)
- a **lesson stage** shaped like OpenMAIC's (slide / quiz / interactive / project scenes)
- an honest **Growth** record, visible to the student and to the parent
- EN/ES interface; explicit "Read aloud" for learners who can't rely on reading

Anything that needs a server or a model lives in `src/lib/` as plain functions backed by
`localStorage`, clearly labelled demo. A later phase replaces those function bodies with server calls;
screens don't change. Every reusable piece of earlier attempts is parked, unbuilt, in `modules/`.

Out of scope now: real auth, database, AI generation, the live OpenMAIC stage, voice tutor, camera,
payments, deployment to kaizenedu.net.

## 2. Repo layout

```
Tutornat/
  apps/web/            Next.js 16 app (the product)
  modules/             parked source from earlier attempts — never imported by apps/web
    openmaic-classroom/  complete OpenMAIC 1.1.1 + Kaizen delta (future stage + generation engine)
    kaizenedu-tutor/     KaizenEdu voice-tutor product code (accounts, turns, voice, parent area)
    kaizen-ai/           Kaizen-AI app (design system, magic box, engine, prompts, Supabase schema)
    trellis/             typed grading, student model, session state machine, skill graph, evidence DB
    lesson-engine/       vanilla lesson engine (local grading, archive, animated scenes)
    prototypes/          earlier vanilla dashboards, reference only
  docs/
    DECISIONS.md  ROADMAP.md  STATUS.md   (PRODUCT.md, DESIGN.md, AGENTS.md at the repo root)
    specs/  plans/  history/
```

npm workspaces (`apps/*`; `packages/*` when OpenMAIC packages are brought in).

## 3. Architecture

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4. Client-rendered app.
- `src/lib/store.ts`: one versioned `localStorage` document (`kaizenedu.v1`) with an in-memory
  fallback, a change subscription, and corrupt-data recovery (reset + visible notice).
  `useStore(selector)` via `useSyncExternalStore`.
- `src/lib/{auth,profiles,courses,generate,activity}.ts`: plain functions over the store.
  `DEMO = true` exported from `src/lib/mode.ts`; UI shows demo labels when true.
- Route protection is a client guard in the app layouts (session → profile). Moves server-side with
  real auth.

## 4. Domain model

Mirrors OpenMAIC so integration is a mapping: a **course** groups **lessons**; each lesson
corresponds to one OpenMAIC *stage* made of *scenes*.

```ts
Grade     = 'K'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'adult'
Subject   = 'math'|'science'|'english'|'other'
Account   { id, email, displayName, salt, passwordHash, createdAt }      // the parent/guardian
Profile   { id, accountId, nickname, grade, locale:'en'|'es', color, createdAt }  // a learner
Course    { id, profileId, title, goal, subject, grade, locale, origin:'generated'|'catalogue',
            catalogueId?, status:'outlining'|'ready', length:'lesson'|'short'|'full',
            sources: SourceItem[], lessons: Lesson[], template: boolean, createdAt, updatedAt }
Lesson    { id, title, summary, minutes, scenes: Scene[] }               // ≈ OpenMAIC Stage
Scene     = SlideScene | QuizScene | InteractiveScene | ProjectScene      // OpenMAIC slide|quiz|interactive|pbl
SlideScene       { id, kind:'slide', title, blocks: ({type:'text',text}|{type:'points',items}|{type:'visual',visual,alt})[] }
QuizScene        { id, kind:'quiz', title, questions: {id, prompt, choices, answer, hint, explain}[] }
InteractiveScene { id, kind:'interactive', title, prompt, widget: Widget, check?: {question, answer} }
ProjectScene     { id, kind:'project', title, brief, steps: string[] }
SourceItem       { id, name, kind:'pdf'|'image'|'doc'|'text', size }
ParentNote       { id, profileId, at, text }
ActivityEvent    { id, profileId, at, type:'course_added'|'lesson_started'|'quiz_answered'|'lesson_completed',
                   courseId, lessonId?, sceneId?, correct?, assisted?, seconds? }
```

`Widget` kinds now: `fraction-bar`, `number-line`, `states-of-matter`, `claim-sorter`. Lessons without
authored scenes render "This lesson's scenes are created when the tutor is connected."

## 5. Local functions (later: server calls)

- auth: `signUp({email,password,displayName})`, `signIn`, `signOut`, `currentAccount()`,
  `requestReset(email) → token` (demo shows the link inline), `resetPassword(token, pw)`.
  Email shape check, password ≥ 8, email unique case-insensitively. SHA-256 + salt via Web Crypto —
  demo only, labelled.
- profiles: `createProfile({nickname 1–40 trimmed, grade, locale})`, `updateProfile`,
  `removeProfile` (also removes that learner's courses, activity, notes), `selectProfile(id | 'parent')`.
- generate: `generateOutline(request, signal): AsyncGenerator<GenerationEvent>`;
  events `{type:'step', step:'reading'|'planning'|'writing'}` · `{type:'lesson', lesson}` ·
  `{type:'done'}`. Same shape as OpenMAIC's `scene-outlines-stream` (one outline item per event,
  cancel by abort). Demo: deterministic template outline from goal + grade + subject, paced
  ~400–700 ms per event so progress is visible. Subject guessed from keywords, editable.
- courses: `saveCourse`, `getCourse(id, profileId)` (null if not that learner's), `removeCourse`,
  `addFromCatalogue(catalogueId, profileId)`.
- activity: `record(event)`, `progressFor(course, events)`, `summarizeWeek(events, weekStart)`.

## 6. Screens

One job and one ink primary per screen (Kaizen-AI button discipline).

| Route | Job | Primary |
|---|---|---|
| `/` | Landing: what KaizenEDU is, honestly, with a hero that shows the product | Get started |
| `/sign-in` `/sign-up` `/forgot-password` `/reset-password` | Account access | Submit |
| `/profiles` | "Who's learning?" — children's tiles + Parent tile; add/edit learners | Choose |
| `/home` | Student: start something or continue | Magic box / Continue |
| `/courses` | This learner's courses + K–9 starter catalogue | Open course |
| `/courses/new` | Magic box full page with options | Build my course |
| `/courses/new/[id]` | Watch outline arrive, edit it | Create course |
| `/courses/[id]` | Course overview, lesson list | Start / Continue |
| `/learn/[courseId]/[lessonId]` | Lesson stage | Next / Check |
| `/growth` | What actually happened this week | — |
| `/family` | Parent: each child at a glance, help-needed signals, notes, assign a course | Assign / Add note |
| `/settings` | Account, learners, language, local data | Save |

Student shell: 240px rail on `panel2` (logo, "New course" ink button, Home · Courses · Growth, footer:
current learner + switch, demo status, Settings). Phone: bottom bar Home · Courses · New · Growth ·
Me, rose top rule on active. Parent shell: same rail with Family · Courses (by child) · Settings.
Stage: focused full-width layout with a back link.

## 7. Landing

Hero: headline + one sentence + "Get started" (ink) / "Sign in". Beside it, a real, live mini
stage (not a screenshot): the fraction bar a visitor can operate, with "3 of 4 parts = 3/4" read
out. Below: three rows explaining the loop with small working visuals (type a goal → a course
appears → learn by doing), the subjects and grades covered, the parent view, and an honest note on
what's live today (demo; tutor connects next). No stock gradients, testimonials, invented stats or
"AI-powered" badges.

## 8. Magic box

- Textarea "What do you want to learn?"; placeholder by grade band (K–2, 3–5, 6–8, 9, adult).
- Example chips per band and subject (fill, never submit). Goal capped at 2000 chars with counter.
- Attach / drag-drop: `.pdf .png .jpg .jpeg .webp .gif .doc .docx .txt .md .csv .json`; caps 30 files,
  25 MB each, 150 MB total (Kaizen-AI). Mono manifest rows (`PDF · 2.1 MB`); demo: listed, not read.
- Options: length (one lesson · short course ≈4 · full course ≈8), subject (auto-guessed), language.
- Submit disabled until ≥3 chars or a file. ⌘/Ctrl+Enter submits.
- Same component on Home and `/courses/new`.

## 9. Course generation flow

1. Submit saves a draft (`status:'outlining'`) and opens `/courses/new/[id]`.
2. Step log with elapsed seconds: Reading your request → Planning lessons → Lesson n arrives. Cancel
   aborts and returns to the box with the text kept. No percentages or ETAs.
3. Outline editor: course title, rename / move up / move down / remove / add lesson.
4. Create course → `status:'ready'` → course page. Outlines from the demo generator are badged
   "Template outline".
5. Reopening an `outlining` draft whose stream is gone offers "Build outline again".

## 10. Lesson stage

- Scene list (left; drawer on phone) · stage canvas · tutor panel (right; collapsible on phone).
- Controls: previous / next, Read aloud (Web Speech `speechSynthesis`, explicit button, visible
  stop, captions are the slide text), whiteboard (disabled, says why).
- Slide: blocks. Quiz: pick → Check (local) → explanation; "Show hint" marks the attempt assisted.
  Interactive: widget + optional check. Project: brief + steps checklist.
- Widgets are keyboard and click operable, each with a live text readout.
- Records `lesson_started`, `quiz_answered {correct, assisted}`, `lesson_completed` (+seconds).
- Tutor panel: honest not-connected state; input disabled with the reason.

## 11. Growth and Family

Growth (student and parent): per week — lessons started/finished, checks right on your own, right with
help, missed, minutes; day-grouped plain-language rows. Never mastery, % learned, or streaks as
achievement.

Family (parent): one card per child — this week's figures, last activity, "Needed help with" (lessons
where checks were missed or hinted), parent notes (add/delete), "Assign a course" (adds a catalogue
course to that child). Notes are the parent's words, shown to the parent only in this phase.

## 12. Design system

Ported from Kaizen-AI (`modules/kaizen-ai/web/app/globals.css`, `tailwind.config.js`).

| Token | Hex | Use |
|---|---|---|
| paper | #FAFAF9 | page |
| panel | #FFFFFF | cards, reading column |
| panel2 | #F1F1EF | rail, wells |
| border | #E4E3DF | rules |
| ink | #1A1917 | text, primary buttons |
| muted | #6B6862 | secondary text |
| accent (rose) | #A93B5D | selection marks, eyebrows — not default actions |
| good / warn / bad | #4F7A5B / #8A6412 / #B3453F | status only |

Subject marks: math #3E6E8E, science #4F7A5B, english #A93B5D. Fonts: Schibsted Grotesk (brand),
Instrument Sans (body), IBM Plex Mono (labels/figures). Radii 10 / 14 / 20px, pill buttons.
Visible focus, 44px touch targets, `prefers-reduced-motion`, text alternative for every visual,
button alternative for every drag, works at 320px.

## 13. Language

`src/i18n/en.ts` + `es.ts` (`es` typed against `en` keys). Locale follows the active learner;
signed-out pages use the browser language with a toggle. Spanish is a draft pending native review.
Catalogue content is EN; the fractions course also ships in ES.

## 14. Honesty and privacy

Nothing is labelled AI-generated unless it was. Demo content says demo. Completion and quiz results
are activity, not mastery. Nicknames are local labels and will never be sent to a model. "Saved on
this device" in demo mode.

## 15. Verification

- Vitest: store recovery, auth rules, profile rules, generator sequence + abort, getCourse ownership,
  week summary (assisted separate), quiz check, i18n key parity, magic box caps.
- `npm run verify` = lint + typecheck + test + build.
- Browser pass at 1440, 390 and 320px through the whole journey, parent and student.

## 16. How later phases plug in

| Phase | Replace | Source in modules/ |
|---|---|---|
| Backend | bodies of `src/lib/{auth,profiles,courses,activity}.ts` → API + Postgres | kaizenedu-tutor `lib/tutor/{auth,accounts,db}`, kaizen-ai `supabase/`, trellis `db/` |
| OpenMAIC generation | `generateOutline` → OpenMAIC outline + scene generators | openmaic-classroom `packages/@openmaic/generation`, `lib/server`, history `UI_CONTRACT.md` |
| OpenMAIC stage | `/learn` renderer → OpenMAIC stage, playback, whiteboard | openmaic-classroom `components/stage*`, `lib/playback`, `lib/action` |
| Tutor | tutor panel → contextual chat, then voice | openmaic-classroom `lib/chat`; kaizenedu-tutor `lib/tutor/{turn,voice}` |
| Checks & growth | local checks → engine | trellis `lib/tutor/{checks,model}`; kaizen-ai `lib/engine` |
