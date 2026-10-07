# Product

<!-- impeccable:product-schema 1 -->

Current product authority for KaizenEDU. Sources: owner answers to Hermes/Astra (2026-09-30 → 10-04) and
owner messages of 2026-10-07, recorded verbatim in [docs/DECISIONS.md](docs/DECISIONS.md). The owner told
Claude to decide from that history rather than re-interview; facts marked *(inferred)* follow from it but
were not asked directly.

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
- **Later:** adults. The long-term goal is a teacher machine for any learner, literate or not ("K–99").
  Adult profiles must keep working, but no adult-specific work happens now.
- Human tutors are a later add-on; the product must stand alone without them.

## Jobs (2026-10-07)

Help right now (homework, a test tomorrow) · daily practice (at-home tutoring center) · homeschool
(skill maps, lessons, reading log, dated records) · staying on top (school calendar import, test prep
that schedules itself). One product; the family's setup answer changes emphasis only.

## Product Purpose

Turn anything a learner wants to learn into a short, ordered course, then teach it on a visual stage
where the learner sees the idea, manipulates it, and checks it — with text as backup, not the workload.
Around the stage sits a dashboard: the learner's courses and continue point, a parent view per child,
and an honest record of activity. Success = a child can go from "I want to learn X" to doing and
checking X with little reading, and a parent can see truthfully what happened.

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
- Output: an editable course outline → lessons → scenes (slides with pictures, interactive
  manipulatives, quick checks with hints, at-home projects).
- Parent loop: Family view per child — this week's activity, where they needed hints or missed checks,
  notes, assign a course.
- Engine roadmap: OpenMAIC's generation pipeline and teaching stage (`modules/openmaic-classroom`) become
  the engine behind the same screens; one learner-facing tutor; voice after chat is proven.

## Capabilities and Constraints

- Today: no backend; everything saves in the browser. AI runs only when the deployment has a provider
  (Anthropic key, or AI Gateway); otherwise the demo tutor and template outlines, labelled as such.
- Practice answers are checked by code. The tutor teaches with tools and has no answer keys.
- Model policy when AI connects: native Anthropic, server-side only, no client-supplied keys, no silent
  fallback provider *(from Hermes-era policy; re-confirm before wiring)*.
- EN and ES across the interface; Spanish needs native-speaker review before launch.
- Camera off. Microphone/playback only by explicit action with visible state and a typed alternative.
- Privacy: learner nicknames are local labels and never go to a model; learner conversations and answers
  never enter shared lesson content.
- Undecided: pricing, real accounts/consent for children (COPPA), retention, which curriculum sources
  may be ingested (rights checked per item).

## Brand Commitments

- Name on screen: **KaizenEDU** (owner, 2026-10-07). Kaizen = small steps, every day.
- Interior look: the Kaizen-AI dashboard the owner liked — see DESIGN.md.
- Top rule, owner's words: "dont make anything look or sound or feel like AI slop."
- Voice: plain, warm, specific. No canned praise, no hype, no "AI-powered" badges.

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
5. Reuse the strongest existing engine (OpenMAIC) behind our own screens rather than rebuilding it.

## Accessibility & Inclusion

Learners who can't rely on reading are in the audience: every lesson visual has a text description,
every slide and prompt can be read aloud on request, every manipulation works by tap and keyboard (no
drag-only), touch targets ≥ 44px, works at 320px, respects reduced motion. Low-literacy usability is a
design goal, unverified until tested with real learners.
