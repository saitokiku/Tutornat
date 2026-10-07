# KaizenEDU

A tutor, a daily practice plan and a school organizer for families. Starting with US students in
kindergarten through 9th grade in math, science and English (including rhetoric), with a parent view
that shows truthfully what happened. Final home: kaizenedu.net.

It serves four jobs in one product: **help right now** (homework, a test tomorrow), **daily practice**
(an at-home tutoring center), **homeschool** (skill maps, lessons, reading log, dated records) and
**staying on top** (school calendar import, test prep that schedules itself).

**Next build:** [one integrated learning workspace](docs/plans/2026-10-07-integrated-learning-release.md)
with visual teaching, natural voice, shared attention and meaningful use across ages. Read the
[product design](docs/specs/2026-10-07-one-learning-workspace.md) and
[quality-first model/voice/Jev strategy](docs/specs/2026-10-07-models-voice-and-jev.md).

**Current evidence:** the practice/stage/tutor and server scaffolding are substantial, but the
[audit](docs/reviews/2026-10-07-system-audit.md) found broken handoffs and evidence/authorization gaps.
At `d8d8166`, verify passes (2,372 tests); the full browser suite has 148 passes, 22 failures and
16 skips. Live-family readiness and natural voice have not been established. See
[docs/STATUS.md](docs/STATUS.md) for completed work versus external release gates.

| | |
|---|---|
| ![Landing](docs/screens/desktop-landing.jpg) | ![Today: the plan, school coming up](docs/screens/desktop-today.jpg) |
| ![Practice with the hint ladder](docs/screens/desktop-practice-hint.jpg) | ![The tutor beside a problem](docs/screens/desktop-tutor.jpg) |
| ![Calendar with prep before each test](docs/screens/desktop-calendar.jpg) | ![One child's page for parents](docs/screens/desktop-family-child.jpg) |

Phone: [Today (K)](docs/screens/phone-today-k.jpg) · [a K practice set](docs/screens/phone-practice-k.jpg) ·
[Today](docs/screens/phone-today.jpg) · [Talk](docs/screens/phone-talk.jpg) · [records](docs/screens/phone-records.jpg)

## Run it

Requires Node 20.9+.

```
npm install
npm run dev
```

Open http://localhost:3000 → Get started → create a family account (stored only in your browser) →
add learners → pick what you want help with → open a learner's Today.

To turn on the AI tutor and lesson writer, put **one** of these in `apps/web/.env.local` (never commit
it) or in the Vercel project's environment:

```
ANTHROPIC_API_KEY=…            # Anthropic directly (preferred); on Vercel also set KAIZEN_AI=anthropic
AI_GATEWAY_API_KEY=…           # or Vercel AI Gateway, Anthropic models only
KAIZEN_AI=gateway              # or, on Vercel, the deployment's own OIDC token through AI Gateway
```

See `apps/web/.env.example`. On Vercel an Anthropic key is ignored unless `KAIZEN_AI=anthropic` is set,
because the project still holds keys from earlier attempts; requests always go to Anthropic's own API.

Settings shows which one is configured. `npm run verify` runs lint, type check, unit tests and a
production build. `npm run e2e` runs journeys and accessibility checks at desktop and phone
sizes (`CI=1 npm run e2e` when a dev server is already running).

## What's here

| Path | What |
|---|---|
| `apps/web/src/practice` | The skill map (134 skills: 76 math, 30 English, 28 science, K–9, CCSS/NGSS codes), seeded problem generators with hint ladders and worked steps in EN/ES, a safe algebra parser and the answer checker. Every answer is checked by code. |
| `apps/web/src/learning` | The learning engine: skill status (practicing → check ready → passed one check → proved → needs a refresh), level stepping, review spacing, stuck and overdue flags, placement, set building. |
| `apps/web/src/planner` | Today's plan, calendar dates, `.ics` import/export, reading pasted school text, matching school words to skills. |
| `apps/web/src/lib/ai` | The tutor (prompts by grade band, tools, safety screen), the lesson writer with quality gates, AI practice, document reading, the family note. |
| `apps/web/src/resources` | Named free sources per skill and topic (PhET, Khan Academy, OpenStax, NASA, Project Gutenberg, Purdue OWL…), links checked. |
| `apps/web/src/catalogue` | Hand-written K–9 courses for the lesson stage. |
| `modules/` | Everything reusable from the earlier attempts — parked, not built. |
| `docs/` | Decisions, specs, plans, roadmap, status; `docs/history/` for earlier attempts. |

## Intended product rules

These are requirements; the audit identifies enforcement gaps to close in the next build.

- **Practice is not proof.** Answers are on your own, with help, or not yet. A skill is *proved* only
  by two short checks with no help available, on fresh problems, on different days at least six days
  apart, the first at least 48 hours after the last help.
- **Code checks answers; the tutor teaches.** Help responds to the actual question and can explain,
  demonstrate or invite a try. Assessment help is explicitly recorded. No answer key is in the prompt.
- **Safety before any model.** A crisis or abuse disclosure gets a fixed referral (988, Childhelp) and
  a note for the family. Names never reach a model. Transcripts are visible to grown-ups.
- **Engagement serves learning.** Prediction, manipulation and creative work should lead to greater
  independence. Measure outcomes; do not substitute time spent or returning for demonstrated learning.
