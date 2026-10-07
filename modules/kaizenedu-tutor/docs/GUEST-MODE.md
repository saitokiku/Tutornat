# Guest mode: the free tutor with no account

Decision D35 in `docs/DECISIONS.md`. Owner's direction, 2026-09-30: make the
tutor free and usable by anyone from early childhood to adult, with the first
focus on grades 4 to 9, for any subject, with no account. Accounts, billing and
the parent app stay in the code and keep working; nothing on the public surface
points at them.

## What a visitor gets

1. `/` is the landing page, and since D36 it is one press: a row of levels,
   **Talk to Sol**, and **Type instead**. The full form (every level with its
   hint, a subject, what to work on in their own words, voice or text) is one
   disclosure underneath for grown-ups and keyboard users.
2. `POST /api/tutor/guest` creates an anonymous account and learner behind the
   session cookie, and starts the session in the same call: an *open* session
   (`open: true`, subject `other`, no words yet) from the button, a topic
   session from the form. The browser moves to `/session/<id>?go=1`, which
   starts itself because the press already unlocked audio and asked for the
   microphone; the tutor says its name and asks what they are working on, and
   its `[[topic {...}]]` tag sets the subject and words on the session.
3. `/learn` is their home afterwards: start something new, the planner, the
   problems they added, recent sessions, and progress. The header has no
   sign-in and no sign-out; it has **Start over**, which deletes everything
   behind the cookie right now.

## What is collected, and what is not

- No name, no email, no birth year, no password, no card. The learners row
  carries the fixed display name `You` and a representative birth year derived
  from the grade level (the level is a content setting, not a date of birth).
- The session cookie is the only identifier. It is HttpOnly and lives 30 days.
- Transcripts, checks, the mastery estimate, the planner and the coursework
  text are stored under the anonymous account, so a learner can pick up where
  they left off on the same browser. Audio is never stored (invariant b) and
  the camera stays off for guests.
- **Start over** deletes every row now (the account row cascades; evidence
  rows are removed through the same sanctioned path the deletion job uses).
- The weekly cron deletes any guest with no session in `GUEST.retentionDays`
  (30) days.

## Limits that still bind (invariant d)

- `GUEST.dailyMinutes` (120) tutoring minutes per guest per UTC day, metered
  through the same `addUsedMinutes` path as every account. The entitlement
  banner says so in the learner's words.
- The per-session cost ceiling and the per-learner daily cap in cents are
  unchanged (`COST`, `dailyCapCents`).
- The global spend alarm and kill switch are unchanged.
- Rate limits are unchanged; a guest is never staff.

## Topic sessions (any subject)

- `CreateSessionRequest.topic = { subject, text }` creates a session with
  target `topic`. No diagnostic, no next-skill selection. `sessions.skill_id`
  is the subject's synthetic skill (`S-math`, `S-reading`, ...), defined in
  `lib/tutor/graph/subjects.ts`, so checks, mastery rows, evidence and WRAP all
  work off the graph.
- The prompt names the level, the subject and the learner's words. The
  persona, band, coach, check and whiteboard rules are written for every
  subject; fractions examples remain as examples.
- Tutor-authored checks may carry the fractions misconception tags or the
  generic ones (`misread`, `vocabulary`, `procedure`, `concept`, `sign_error`,
  `guess`), each with a re-teach move in the prompt.
- The fractions sequence with its diagnostic and reviewed bank stays available
  for a learner who asks for it or for account learners exactly as before.

## The planner

`planner_items`: title, subject, optional due date, status, notes. Routes under
`/api/tutor/planner`. On `/learn` the planner groups items into overdue, today,
this week, later and done, and every open item has **Work on this**, which
starts a topic session from the item. It is the seed of the school-life
dashboard in `docs/CONSOLIDATION.md`; the imports from school systems come
later.

## Under-13 posture

The account model's under-13 gate is untouched: a parent-created child profile
still starts `locked` until counsel signs off. Guest mode collects no personal
information and asks for none, applies the 4-8 and 9-12 prompts (no personal
questions, the crisis rules, shorter sessions) to the younger levels, and
deletes everything on request or after 30 idle days. Counsel should read this
page and D35 before the next marketing push; it is the one open compliance
question this change adds, and it is the owner's call (`compliance/` is not
edited here).

## What did not change

Accounts, sign-in, sign-up, the parent app, billing, the weekly email, the
staff allowlist, the five invariants and their tests. `/sign-in` still works at
its URL for the operator.
