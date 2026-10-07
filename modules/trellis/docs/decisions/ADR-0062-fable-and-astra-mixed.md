<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0062-fable-and-astra-mixed.md -->

---
title: "ADR-0062 — Fable and Astra, mixed; nothing else"
tags: [adr, handler, routing]
project: handler
date: 2026-09-16
decided_by: manny
status: accepted — supersedes ADR-0060 on engine choice
---
# ADR-0062 — Fable and Astra, mixed

Manny, 2026-09-16 23:5x CDT, at this keyboard: **"Fable is back so use fable and codex mixed.
Don't worry codex limit I can reset"**, then **"Fable and Astra only"**.
Note: [202609162359-manny-fable-and-astra-teams-everyone-youngest-to-oldest](../history/notes/202609162359-manny-fable-and-astra-teams-everyone-youngest-to-oldest.md).

## What changes
1. **The fleet is two engines: Fable (claude-fable-5-1) and Astra (gpt-6-astra via Codex).** No
   Opus, Sonnet or Haiku turns of any kind. ADR-0060's "Astra only" is superseded on engine choice;
   its removal of Opus stands and now extends to every other Claude model but Fable.
2. **Mixed, per task, and always named.** Every dispatch carries `--engine`/`--model` explicitly.
   Manny's standing rule still orders the choice: Fable for high reasoning and large coding; Astra
   for planning, judgment and review. A build on one engine gets its blind review on the other —
   two model families cannot share a blind spot.
3. **The Codex limit informs, never refuses.** He resets it. `budget.sh` keeps reporting it; a
   direct ask is never held on it (extends ADR-0021-budget-informs-never-refuses *(PM vault: `ADR-0021-budget-informs-never-refuses`)*).
4. **The interactive PM session is Fable** — the session that took this instruction. Scheduled
   headless turns (heartbeat, standup, consolidate, intake) keep ADR-0060's `PM_ENGINE=codex`
   wiring tonight; that is a deliberate no-churn choice at midnight, not a rule, and the next
   handler-update may move any of them to Fable.

## First application
E1 (`gokumann-pm/kaizenedu#1`): builder **Fable**, run `ef463eac`, dispatched 23:58 CDT with a
65-minute hard stop; blind reviewer **Astra** once a PR exists. In parallel, Astra runs the tutor
persona name screen (`run/astra-tutor-name-screen.log`).

Links: ADR-0060-astra-is-the-only-pm *(PM vault: `ADR-0060-astra-is-the-only-pm`)* · ADR-0040-opus-voice-astra-brain *(PM vault: `ADR-0040-opus-voice-astra-brain`)* · fleet-dispatch *(PM vault: `45-areas/fleet-dispatch`)*
