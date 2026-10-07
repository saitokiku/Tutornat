<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0064-e13-definitions-day-seven-contexts-clock.md -->

---
title: "ADR-0064 — E13 definitions: the day boundary, the day-seven window, two contexts, the 48-hour clock"
tags: [adr, kaizen, kaizenedu, engine, spec]
project: kaizenedu
date: 2026-09-17
decided_by: pm
status: PROPOSED — default fires 2026-09-17 12:00 CDT (17:00Z) unless Manny objects; implemented meanwhile as versioned rule parameters, no certification claimed
---
# ADR-0064 — E13 definitions

ENGINE-CONTRACT's E2 package says: "Set the unresolved E13 definitions through a recorded PM decision before implementing full qualification." SPEC v0.4 §3.1 gives the rules in words (≥48 h, two contexts, two separate days, the second check around day seven); the engine needs numbers and boundaries. These are engineering definitions with sensible defaults, not taste — so they go out as a DECISION with a default, not as an open question (ADR-0006-interrupt-cadence *(PM vault: `ADR-0006-interrupt-cadence`)*).

## Decision (proposed)
1. **Day boundary** — the household's IANA timezone, stored at account creation, changeable with an audit row. "Separate days" = different local calendar dates in that zone.
2. **Day-seven retention check** — anchor = server receipt time of the first qualifying independent success on that skill; window = local days **6–9 inclusive** (day 6 00:00 to day 9 23:59, household time). An attempt outside the window is recorded and shown; it does not count toward retention.
3. **Two contexts** — two approved items from **different content families** (E06's family id), each unfamiliar to the learner (never issued to them, in any state), presented with different recorded surface framings (`context_tag`). Same family or same tag counts as one context.
4. **48-hour eligibility** — ≥ 48 h server time since the last exposure event touching that skill; 48h−1ms fails, 48h passes (E02).
5. **Quiet window, 10 clean reps, 14-day escalation** — versioned parameters with initial values 10 / 48 h / 14 d, as §3.1.

All five are `rule_version = e2-draft-1`; a rule upgrade never re-counts an old attempt (contract). E2 parts A and B implement against these now and claim no certification until this ADR is accepted.

## Options considered
- **B) Fixed UTC days** — simpler, but a Texas household's "yesterday" would straddle two UTC dates; wrong for a product sold to families.
- **C) Day-seven = exactly day 7 ±24 h** — narrower than the engine can honestly schedule around school days; 6–9 keeps the "around day seven" intent with a real weekend in it.
- **D) Two contexts = two items, any family** — RO-5's `repeated_family` showed same-family items fake independence; rejected.

## DECISION card (sent with the merge notice)
```
DECISION kaizenedu #E13: numbers for "separate days", "day seven", "two contexts", "48 h"
A) household-timezone days · day-seven window = local days 6–9 · two contexts = two families + two tags · 48 h server time
B) UTC days · exactly day 7 ±24 h · any two items · 48 h
Recommend: A — matches how a family experiences a week; B fakes independence on same-family items.
Default: A at 2026-09-17 12:00 CDT unless you object.
Blocking: no
```

Links: [SPEC](../product/spec.md) · [ENGINE-CONTRACT](../product/engine-contract.md) · [ADR-0042-practice-buys-the-exam-seat-never-the-grade](ADR-0042-practice-buys-the-exam-seat-never-the-grade.md) · kaizen *(PM vault: `20-mocs/kaizen`)*
