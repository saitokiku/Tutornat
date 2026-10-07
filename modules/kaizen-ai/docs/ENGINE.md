# The Evidence Engine — the trellis

What it is, why it exists, and the one rule everything else follows.

**Vocabulary (docs/STRATEGY.md §2).** This engine *is* the trellis. The
**knowledge lattice** is `kc` + `kc_edge` (prerequisite and confusable edges,
0012) with the `kc_standard` crosswalk (0034). The **mastery record** is the
`evidence` ledger (append-only by trigger since 0034; corrections are new rows
via `adjusts_evidence_id`) and the derived `kc_estimate`. The **growth tip** is
the reachable set `policy.js` computes. Table names do not change; the words do.

## The rule

**Only unassisted, verified, delayed evidence may produce confirmed mastery.**

Everything in `web/lib/engine/` exists to make that true and hard to bypass.

## Why

Kaizen never had an assessment layer — it had an opinion layer. Mastery came from
`GRADING_SYSTEM_PROMPT`: Claude scoring a transcript that Claude wrote, in a mode
("Teach me") that hands over a full worked example before asking a check question.
The prompt tried to control for this and could not — the task itself was
scaffolded, and the scaffolding was neither bounded nor recorded.

That is the configuration Bastani et al. (2024) measured in the field at **+48%
assisted performance, −17% unassisted exam performance**. Its consequence here was
perverse: the mastery number rose fastest for the students being helped the most.

Three further defects fed the same problem:

- **`/api/practice`** shipped the answer key to the browser, compared it
  client-side, let the learner self-mark short answers, and accepted a
  client-computed `quality` with only a range clamp.
- **Concept identity was a mutable display string** with an unstable id —
  `pushConcepts` never sent `c.id`, so a sync landing mid-session silently
  dropped the grade.
- **The human tutor session wrote nothing.** A tutor's only input was a free-text
  box; it became `recap_md`, read by one confirmation card and an email.

## The two tiers

| | Moves on | Shown as | Leaves the product |
|---|---|---|---|
| **Working** | any evidence, including assisted chat | pale, dashed | never |
| **Confirmed** | unassisted + verified + delayed + repeated | solid | yes — this only |

Confirmed requires **all** of: `kind ∈ {check, tutor_observation}`, `assisted =
false`, `verified_by ∈ {symbolic, structural, human_tutor}`, **≥48h** since the
last instruction (`config.js` `mastery.minDelayMs`; raised from 24h — this
sentence said 24h until 2026-09-02, which is exactly the kind of drift a
ministry audit finds first; a separate **36h post-session check floor** is set by
the tutor observe route and is a different rule), k-of-n recent passes across ≥2 surface contexts, and enough
recency-weighted mass that year-old evidence can't keep certifying anyone.

Parent summaries, weekly reports, tutor briefs and any future school view use
**confirmed only** for every mastery NUMBER they state. Narrowed 2026-08-13 after
an adversarial review (`docs/reviews/ENGINE_ADVERSARIAL_REVIEW.md`) found the
sentence overstated as written: the tutor brief's generated prose and the weekly
report also read legacy, client-writable tables for colour (what the student has
been working on, their own self-ratings). Those surfaces must never present such
material as a mastery claim, and the structured figures beside them come from
`kc_estimate`.

## Layout

```
web/lib/engine/
  types.js            the vocabulary + the law (isConfirming, weightOf)
  pfa.js              mastery estimate — pure, replayable
  elo.js              difficulty targeting + item selection
  hlr.js              when it comes back
  scheduler.js        THE SEAM — swap the algorithm here
  ledger.js           append / read / replay          (server only)
  policy.js           what to do next — pure
  check.js            issue + grade                    (server only)
  verify/symbolic.js  server-side answer checking — pure
web/lib/server/kcMap.js   topic string -> canonical KC (server only)
```

Routes: `/api/engine/state`, `/api/engine/check`, `/api/tutoring/observe`.
Migrations: `0012_kc_library.sql`, `0013_evidence_ledger.sql`, seed `seed_kc.sql`.

## The ledger is the source of truth

`kc_estimate` is a **cache**. `estimate()` is a pure function of the evidence
array with `now` injected — no clock reads, no module state. That single property
is what makes the scheduler swappable: when the algorithm changes you *replay* the
ledger, you don't migrate learner state.

Four rules keep it that way:

1. `estimate` stays pure.
2. All tunables live in one config object.
3. Every scheduler declares a `version`, stamped on each `kc_estimate` row; a
   mismatch triggers replay.
4. Nothing outside `web/lib/engine/` imports `pfa`/`elo`/`hlr` directly.

## The harmony loop

This is the part neither an AI-only nor a marketplace-only product can build.

```
evidence ledger ──> brief (structured, not prose) ──> tutor sees the numbers
                                                          │
                                                    rates each KC (3 taps)
                                                          │
                          human_tutor evidence <───────────┘
                          (unassisted, CONFIRMING class)
                                    │
                          confirmed mastery moves
                                    │
                    delayed unassisted check scheduled (+36h)
                                    │
                        ─> did the session actually work?
                        ─> per-tutor effectiveness on real learning
```

A tutor watching a student work unaided is the **strongest signal in the system** —
they can tell understanding from pattern-matching, which no transcript grader can.
So `tutor_observation` is a confirming class, not a note.

The reverse edge matters too: a tutor naming the real blocker writes a labelled
misconception, which improves the AI's diagnosis for every other student on that
knowledge component.

## Verifiability tiers

Kaizen is any-subject, so verifiability is a property of the KC and the engine is
honest about it:

- **v1** numeric / symbolic — CAS-style comparison. Weight 1.0.
- **v2** MC / order / cloze — index comparison. Weight 1.0.
- **v3** open response — model rubric, `verified_by='model'`, **weight 0.4 and
  never sufficient alone**. Surfaces carry an "assessed by AI judgement" marker.

## Assistance dose

Tracked per (learner, KC). Checks are dose-zero by construction. The **slope must
trend negative** — a flat or rising slope means the learner is leaning on the
system rather than outgrowing it, and it raises `human_recommended`.

## What we will not do

Primary progress metric is confirmed concepts — not streak, time-on-app, or
messages sent. Streak is a neutral, pausable history with no loss framing. No
variable rewards, no leaderboards, no normative comparison, no person-praise, no
engagement-optimised notifications, and no experiments on minors with retention as
the optimisation target.

## Open and honest

- **Check adherence is the top risk.** Students used to tap "Grade" and get a
  number; now there's a short unaided check, later. If they skip it, confirmed
  mastery stays empty and the engine's claim goes unrealised. Measure
  check-completion rate from day one.
- **Item quality is existential.** One confidently-wrong item destroys trust
  faster than a missing feature. Nothing reaches `status='verified'` without
  solver agreement, a second-model critique, and human sign-off.
- **HLR's published validation is vocabulary recall**, not procedural or
  conceptual material. Check calibration on real data; fall back to a simple
  expanding ladder if it overfits.
- **The scheduler default is a placeholder.** PFA + Elo + HLR is defensible and
  buildable today; the interface exists so it can be replaced without touching
  anything else.
