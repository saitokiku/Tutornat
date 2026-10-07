<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609170305-e2c-retro-committed-blind-proven-twice.md -->

---
id: 202609170305
title: E2-C retro — committed blind, proven by the PM, then by itself; the seam decision that ended three designs
tags: [kaizen, kaizenedu, retro, lesson, e2]
sources:
  - "vault/99-attachments/research/2026-09-17-blind-review-kaizenedu-pr9-c.md"
  - "vault/30-decisions/ADR-0066-one-write-path-in-sql-c-is-the-seam.md"
project: kaizenedu
---
# E2-C retro

**Numbers.** r1 44 minutes on Astra, committed with zero executed PostgreSQL assertions and a
report that said exactly that; r2 15 minutes once the cluster was reachable; blind review on
Fable 13 minutes, APPROVE, 342/342 isolation checks, 12/12 finalization races, 0 attack findings.
PM reproduced both rounds. From dispatch to merge: 1 h 20 min. First-pass verification rate:
1/1 on the criteria the builder could execute; 0/1 on the ones it could not.

**What C did right that the fleet should copy.** It could not run its own proof and it did not
pretend to. The done note listed every unexecuted criterion as unexecuted, shipped a one-command
reproducer, and flagged the integration mismatch with A and B instead of quietly building around
it. That honesty is why the PM could run the reproducer in ninety seconds, decide ADR-0066 in
one read, and re-guide in fifteen minutes.

**What the PM did wrong.** C was dispatched at 01:43 with a pack that told it to `initdb` inside
a sandbox that cannot. The correction landed at 02:10; C had no way to receive it mid-run. Forty
minutes of Astra were spent building a harness around an impossible step. Lesson: **a pack that
names infrastructure is verified by execution before the dispatch, not after** — the same rule
`verify-on-macos` already states for the machine ([ADR-0065-postgres-is-a-pm-owned-service-sandboxes-connect](../../decisions/ADR-0065-postgres-is-a-pm-owned-service-sandboxes-connect.md)).

**The seam decision.** Three parts, three role vocabularies, three lock orders, all "working".
The pack had said C owns DDL and roles; it took C's own note ("must not be mixed") to make the PM
act on it. Choosing the design that puts authority in the database rather than in JavaScript
discipline cost A and B a rebase round each and removed, by construction, three of the four
findings B's own review had just made ([ADR-0066-one-write-path-in-sql-c-is-the-seam](../../decisions/ADR-0066-one-write-path-in-sql-c-is-the-seam.md)).
Next time the team pack names the seam owner *and* freezes its interface before the others start.

Related: [202609170145-e1-retro-three-rounds-one-criterion](202609170145-e1-retro-three-rounds-one-criterion.md) · kaizen *(PM vault: `20-mocs/kaizen`)* · lessons *(PM vault: `20-mocs/lessons`)*
