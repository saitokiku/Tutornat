<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609162359-manny-fable-and-astra-teams-everyone-youngest-to-oldest.md -->

---
id: 202609162359
title: Manny — Fable and Astra only, run teams, make it for everyone youngest to oldest
tags: [manny-said, kaizen, handler, routing, scope]
sources:
  - "Manny at this keyboard, 2026-09-16 23:5x CDT, three messages while E1 was being dispatched"
project: kaizenai-saas
---
# "Fable and Astra only … run teams … for everyone youngest to oldest"

Three messages in the space of a few minutes, in order, verbatim:

> "Fable is back so use fable and codex mixed. Don't worry codex limit I can reset"

> "Fable and Astra only and get actual shit fine and run teams to perfect my teaching product and
> make for everyone youngest to oldest coppa or whatever we can deal with tbh"

## What each changes

**Routing.** Fable is available again. The fleet is **Fable and Astra, mixed, and nothing else** —
no Opus, Sonnet or Haiku turns. The Codex weekly limit is his to reset, so it informs which engine
takes a task, never whether the task runs. This supersedes the Astra-only rule of
ADR-0060-astra-is-the-only-pm *(PM vault: `30-decisions/ADR-0060-astra-is-the-only-pm`)* → [ADR-0062-fable-and-astra-mixed](../../decisions/ADR-0062-fable-and-astra-mixed.md).

**"Get actual shit done."** Read plainly: two days of documents and zero code is the complaint.
E1 was dispatched at 23:58 CDT, the first builder since the repository was created.

**Teams.** He wants agent teams on the product, not single workers in series. There is no runtime
yet to fan out on — criterion 0 of E1 creates it — so tonight is one builder plus one parallel
research worker; teams start on the slab E1 lays. Recorded in ADR-0063 so the next rung is a team
by default, not by exception.

**Scope: everyone.** "Make for everyone youngest to oldest" — the product serves all ages. That
reverses the *scope* half of [ADR-0055-school-first-engine-build](../../decisions/ADR-0055-school-first-engine-build.md) ("adults are a
later product") while leaving its *build order* (engine first, primary content first) intact.
COPPA and the state minors laws are "whatever we can deal with": workstreams to clear, never a
reason to narrow who the product is for. → [ADR-0063-everyone-youngest-to-oldest](../../decisions/ADR-0063-everyone-youngest-to-oldest.md).

Related: kaizen *(PM vault: `20-mocs/kaizen`)* · [DIRECTION](../../product/direction.md) · manny-said *(PM vault: `20-mocs/manny-said`)*
