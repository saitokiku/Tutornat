# Product

<!-- impeccable:product-schema 1 -->

Current product authority for KaizenEDU. Sources: owner answers to Hermes/Astra (2026-09-30 → 10-04) and
owner messages of 2026-10-07, recorded verbatim in [docs/DECISIONS.md](docs/DECISIONS.md). The owner told
Claude to decide from that history rather than re-interview; facts marked *(inferred)* follow from it but
were not asked directly.

Next-build direction: [one learning workspace](docs/specs/2026-10-07-one-learning-workspace.md),
[models/voice/Jev](docs/specs/2026-10-07-models-voice-and-jev.md), and the
[implementation plan](docs/plans/2026-10-07-integrated-learning-release.md). These are proposed build
specifications; [the audit](docs/reviews/2026-10-07-system-audit.md) describes what currently works.

## Platform

web

## Stack

Next.js 16 + TypeScript + Tailwind CSS v4 in `apps/web` (owner choice, 2026-10-07). Deploy target:
Vercel project `kaizenedu`, domain kaizenedu.net (owner). The domain's current site is a discarded
attempt, not a reference.

## Users

- **Primary now:** US students in kindergarten through 9th grade, learning math, science and
  English/rhetoric at home — including children who can't yet rely on reading.
- **Parents/guardians:** own the account, add each child as a learner, follow what each child actually
  did, and act on it (notes, assigning courses). Parents are active participants, not passive viewers.
- **Same integrated product:** adults and children use the same capable learning workspace. The
  owner superseded “adults last”: substantive adult-owned use and child-intuitive/non-reading use
  must both work in the next release. K–9 remains the reviewed curriculum focus, not a capability ceiling.
- Human tutors are a later add-on; the product must stand alone without them.

## Jobs (2026-10-07)

Help right now (homework, a test tomorrow) · daily practice (at-home tutoring center) · homeschool
(skill maps, lessons, reading log, dated records) · staying on top (school calendar import, test prep
that schedules itself). One product; the family's setup answer changes emphasis only.

## Product Purpose

Help a person understand and do something more independently. A question opens useful teaching;
a request for a course opens an ordered course. One visual workspace connects demonstrations,
manipulation, natural low-latency voice, touch/keyboard input, creation and fresh practice. It retains
the goal and work across tools and visits. The same evidence supports continuation, self review and
the family view. Engagement should produce knowledge, capability and creative work, measured beyond
the performance achieved while the tutor is helping.

## Positioning

Three doors on the front — *Stuck on homework right now? A test coming? Need to keep up in general?* —
and one engine behind them. Not a chatbot (the owner's critique of Oboe: friction, chat-only, no
dashboard) and "not just a Claude and rich text": code-checked practice, real cited knowledge, an AI
tutor with tools, a visual stage and voice, all on one record, connected so learning feels frictionless
("growth mode", kept on by the shadow worker). Honest records instead of invented mastery scores.
Claims discipline: the landing promises only what works that day.

## Operating Context

- Entry: the **magic box** — type a goal, a homework question or an upcoming test; optionally drop
  a syllabus, worksheet or notes.
- Output follows intent: immediate help in shared work, practice, an editable course, or organization
  around a real deadline. A course is one path, not an obligatory form before answering a question.
- Parent loop: Family view per child — this week's activity, where they needed hints or missed checks,
  notes, assign a course.
- Engine roadmap: port verified OpenMAIC capabilities through the shared workspace contracts where
  they improve the accepted journeys. Preserve its useful depth without adding another application.

## Capabilities and Constraints

- Today: browser storage plus server auth/Postgres/sync/consent scaffolding exist. Production authority
  and data-lifecycle gates remain incomplete; the current backend is not a verified family launch.
  AI runs only when configured (Anthropic or AI Gateway); otherwise labelled demo/template behavior.
- Practice answers are checked by code. The tutor teaches with tools and has no answer keys.
- Current model route: Anthropic, server-side, no client keys or silent provider fallback. The owner
  now requests the best current model array and Jev, with **maximum quality before cost optimization**.
  Use [independent role-specific benchmarks](docs/reviews/2026-10-07-model-benchmark-evidence.md) to
  shortlist tutoring, reasoning, coding and voice models separately; frozen blinded product tests
  select production roles. Explicit processor permissions remain required. Code retains correctness/evidence authority.
- EN and ES across the interface; Spanish needs native-speaker review before launch.
- Camera off in the current/next integrated release. Later optional tutor face and face/gaze assistance
  connect through the same attention contract; they are separately evaluated and permissioned.
  Microphone/playback starts by explicit action with visible state, stop and a typed alternative.
- Privacy: learner nicknames are local labels and never go to a model; learner conversations and answers
  never enter shared lesson content.
- Undecided: pricing, real accounts/consent for children (COPPA), retention, which curriculum sources
  may be ingested (rights checked per item).

## Brand Commitments

- Name on screen: **KaizenEDU** (owner, 2026-10-07). Kaizen = small steps, every day.
- Interior look: the Kaizen-AI dashboard the owner liked — see DESIGN.md.
- Top rule, owner's words: "dont make anything look or sound or feel like AI slop."
- Voice: plain, warm, specific. No canned praise, no hype, no "AI-powered" badges.
- Meaningful visual teaching and natural voice are core. Website ornamentation comes later.

## Evidence on Hand

- Hand-written K–9 starter courses in `apps/web/src/catalogue/`.
- No users outside the owner have tried any version. No testimonials, outcome data, customer counts or
  efficacy results exist — never fabricate them.
- Prior work and its limits: `docs/history/`, `modules/*/README.md`.

## Product Principles

1. Show, let them touch it, then check — text is the backup channel.
2. Honest records: completion, answers and hints are activity, never mastery.
3. One clear next step on every screen; no organizer clutter in front of learning.
4. Parents are partners with real information, not surveillance and not scores.
5. Port verified OpenMAIC capabilities through shared workspace contracts where they improve the
   accepted journeys; preserve the existing practice, learning and planner domains.

## Accessibility & Inclusion

Learners who can't rely on reading are in the audience: every lesson visual has a text description,
every slide and prompt can be read aloud on request, every manipulation works by tap and keyboard (no
drag-only), touch targets ≥ 44px, works at 320px, respects reduced motion. Low-literacy usability is a
design goal, unverified until tested with real learners.
