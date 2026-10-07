<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0063-everyone-youngest-to-oldest.md -->

---
title: "ADR-0063 — The product is for everyone, youngest to oldest; legal gates are workstreams; teams by default"
tags: [adr, kaizen, scope, direction]
project: kaizenai-saas
date: 2026-09-16
decided_by: manny
status: accepted — amends ADR-0055 on scope; SPEC v0.4 owed
---
# ADR-0063 — Everyone, youngest to oldest

Manny, 2026-09-16 23:5x CDT, at this keyboard: **"run teams to perfect my teaching product and make
for everyone youngest to oldest coppa or whatever we can deal with tbh"**.
Note: [202609162359-manny-fable-and-astra-teams-everyone-youngest-to-oldest](../history/notes/202609162359-manny-fable-and-astra-teams-everyone-youngest-to-oldest.md).

## Decision
1. **Scope: one product for every age.** [ADR-0055-school-first-engine-build](ADR-0055-school-first-engine-build.md) said "independently
   subscribing adults are a later product". That is withdrawn on scope: adults are in the same
   product. SPEC §1 and §2 are amended by this ADR and a v0.4 draft is owed.
2. **Build order unchanged.** Engine verification → frontend architecture → backend architecture →
   incremental build ([ADR-0053-kaizenedu-engine-first-preserve-both](ADR-0053-kaizenedu-engine-first-preserve-both.md)); primary and elementary
   *content* still leads because that is where his teaching expertise and the wedge are. E1 is
   age-agnostic and is unaffected.
3. **COPPA and the minors laws are workstreams, not fences.** [ADR-0045-coppa-from-day-one](ADR-0045-coppa-from-day-one.md) stands
   — the household is the unit, verifiable consent from day one — and RO-2's provider-terms and
   state-law gates are things to clear, never a reason to exclude an age band. What remains true
   and is not softened: nothing ships to a real learner of any age until those gates are cleared,
   and no age band is *launched* before its own gate clears. The under-13 gate and the adult path
   are two workstreams; the engine serves both.
4. **Teams by default from the next rung.** Multi-part product work runs as an agent team with the
   PM as lead and a blind reviewer per part (CLAUDE.md dispatch rules). Tonight there is no
   runtime to fan out on — E1 criterion 0 creates it — so this rung is one builder and one parallel
   research worker; the rung after E1 is planned as a team.

## What this does not decide
Price for an adult seat, the adult onboarding path, and whether "everyone" changes the first
marketing audience (parents). Those are qualia and go to him as options after E1 lands.

Links: [ADR-0055-school-first-engine-build](ADR-0055-school-first-engine-build.md) · [ADR-0045-coppa-from-day-one](ADR-0045-coppa-from-day-one.md) · kaizen *(PM vault: `20-mocs/kaizen`)* · [SPEC](../product/spec.md)
