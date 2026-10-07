# Strategy integration — "the AI is the record"

Source: Manny's AI strategy from the sibling project (`AI_STRATEGY.md`, 2026-09-04). This note says what changes in the Natural Tutor plan as a result, and what does not. Decisions D1–D16 stand; the additions below are D17–D20 in `docs/DECISIONS.md`.

## The claim we adopt

Every competitor has a Socratic chatbot; it is a commodity. What is not a commodity is a system that refuses to count its own tutoring as learning. One law, and everything else is downstream of it: **a skill counts only on unassisted, verified, delayed evidence.** A hint given is a hint recorded. Evidence rows are physically un-updatable. Sell the ledger; the conversation is how the ledger gets fed.

## What changes in v1 (D17)

The spec kept the mastery-evidence ledger as a separate initiative (§3, D10) and shipped a simple estimate (§5.7). We now ship a thin ledger inside v1, because it is the sales sentence and it is cheap once `evidence_events` exists:

| Piece | Spec v0 | v1 with the ledger |
| --- | --- | --- |
| `evidence_events` | emitted, append-only grants | present from day one with a database trigger that raises on UPDATE or DELETE; every check, hint, diagnostic, and mastery change writes a row with an `assisted` flag |
| Mastery status | not started → in progress → mastered (estimate ≥ 0.8, ≥ 4 items, ≥ 2 sessions) | the same statuses, labelled "estimate", plus **confirmed**: granted only when an unassisted check, scheduled ≥ 24 h after `mastered` (`next_check_at`), is passed. A parent report uses the word mastery only for `confirmed`. |
| Hints and worked examples | prompt behaviour | recorded as `hint` evidence; any check that follows a hint in the same skill and session is `assisted: true` and cannot move status to `confirmed` |
| Parent view | estimates | estimates plus the confirmed list, the next delayed check date, and the sentence "the tutor never grades its own help as mastery" |
| Next skill | lowest unmastered with prerequisites mastered | unchanged; the delayed check for a `mastered` skill is offered at GREET when due |

## Four laws, as tests

1. **Never confirm mastery from assisted work.** Unit test on the student model: an assisted check cannot produce `confirmed`; a delayed unassisted one can.
2. **Never claim a human said something a human did not say.** Generated summaries and reports are labelled generated; there is no human rating in v1 (the human-tutor loop is R26).
3. **Behave to the age band, enforced server-side.** The band comes from the learner row through `requirePrincipal`, never from the client; prompts are selected by that band.
4. **Never render un-reviewed model-authored HTML to a child.** The upstream interactive scenes (iframes of generated HTML) stay stripped from learner surfaces. Whiteboard actions are structured data validated against the DSL, not HTML.

## The session shape (three panes)

The sandbox (whiteboard), the tutor (face plus chat and voice, one tutor in two modalities), and the trellis (silent: evidence in, mastery out, the next reachable thing). Voice and text both reach the same turn route with the same contract.

## Who sees what (v1 subset)

| Portal | Sees | Can do | Never |
| --- | --- | --- | --- |
| Learner | own coursework, sessions, progress estimates, next up | learn, practise, upload, ask, flag | see another learner |
| Parent | their learners, the record, the seat, billing | add learners, consent, read transcripts, pay, cancel | certify mastery |
| Operator | everything | everything | — |

Tutor, Director, and School portals belong to the sibling product and are out of scope (R26, R27).

## The hole we do not repeat

The sibling project's intake wrote topics to the browser and never reached the server, so no evidence was ever written. Here every coursework upload and every diagnostic runs server-side and maps to the fixed skill graph (F1–F12) on the server; `lib/tutor/model` is the only writer of `skill_mastery`, and the invariant suite checks that product routes derive identity server-side.

## Metering and fail-closed gates

Every priced hop asks the budget first (`lib/tutor/cost`), exactly like the sibling's `checkEntitlement`. Gates (`under13_gate`, `camera_sensing_enabled`, `billing_enabled`, `ai_kill_switch`) are rows in `app_settings`; an absent row is shut.

## Not adopted

- Free AI with a paid human seat. Our plan stays one paid plan (D8, §9) until Manny changes pricing; changing it requires asking (CLAUDE.md).
- The generated-lesson "sandbox" as a roadmap item: the whiteboard is the sandbox, and lessons stay conversation-first (D2).
- Tutor and Director roles.
