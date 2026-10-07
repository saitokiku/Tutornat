<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609170145-e1-retro-three-rounds-one-criterion.md -->

---
id: 202609170145
title: E1 retro — three rounds, one criterion, and what each round was actually for
tags: [kaizen, kaizenedu, retro, lesson, dispatch]
sources:
  - "vault/99-attachments/research/2026-09-17-blind-review-kaizenedu-pr2-r1.md"
  - "vault/99-attachments/research/2026-09-17-blind-review-kaizenedu-pr2-r2.md"
  - "vault/99-attachments/research/2026-09-17-blind-review-kaizenedu-pr2-r3.md"
project: kaizenedu
---
# E1 retro: three rounds, one criterion

**Numbers.** Builds: r1 23 min, r2 13 min, r3 13 min — 49 minutes of Fable. Blind reviews on
Astra: 19, 15, 13 minutes. PM reproduction after every round, in the worktree, before the reviewer
was launched. First-pass verification rate on E1: **0/1**. Redispatches on implement-feature v9:
**2**. Wall clock from "Get the tutor built" (23:58) to merge (01:43): **1 h 45 min.** Lines
merged: +8,700 across 63 files, `lib/` behaviour byte-identical from r1 onward.

**What each round was for.** r1 proved the *behaviour* — practice can never certify — and the
reviewer proved it harder than the builder did (117,600 transitions, ten mutants). r2 and r3 were
entirely about the *boundary*: what is in the tarball, what the compiler actually resolves, which
consumers exist. The builder's own harness never asked those questions, so the reviewer found the
bar a layer at a time — reference snapshots, then the lockfile npm never packs, then the licence
text the allowlist dropped. Nothing behavioural changed after r1.

**The lesson, now in the template (v10).** A closure criterion is proven by *exercising the
packed artifact* — pack, unpack, typecheck and run the suite inside it — and by validating the
dependency the compiler resolves, nested before hoisted. A file-list check is not closure
evidence. Had r1's brief said that, r2 and r3 would have been one round.

**What worked.** Blind review on the other model family (ADR-0062) caught what a builder-side
check would have rubber-stamped; every finding came with a reproducer. Manny's checkpoint rule —
reguide, don't restart — kept three rounds to 49 build-minutes. Cosmetic residue went to an issue
(#6) instead of an r4.

**What did not.** The worker sandbox has no GitHub credentials, so all three rounds pushed and
edited the PR outside it ([pm#48](https://github.com/gokumann-pm/pm/issues/48)). A brief header
said "codex" while the worker ran on Fable — a stale label, harmless, fixed. `--background` exec
drops stdin ([202609170007-background-exec-drops-stdin-use-a-prompt-file](202609170007-background-exec-drops-stdin-use-a-prompt-file.md)).

Related: [202609170047-e1-review-r1-containment-holds-closure-does-not](202609170047-e1-review-r1-containment-holds-closure-does-not.md) · kaizen *(PM vault: `20-mocs/kaizen`)* · PROMPTS *(PM vault: `80-prompts/PROMPTS`)*
