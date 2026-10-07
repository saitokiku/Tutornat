<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609170047-e1-review-r1-containment-holds-closure-does-not.md -->

---
id: 202609170047
title: E1 review r1 — the containment holds under 117,600 transitions; the closure does not
tags: [kaizen, kaizenedu, review, lesson, evidence]
sources:
  - "vault/99-attachments/research/2026-09-17-blind-review-kaizenedu-pr2-r1.md"
  - "shared/artifacts/review-kaizenedu-1/"
project: kaizenedu
---
# E1 review r1: containment holds, closure does not

Astra, blind (no PR narrative, no builder notes), 18m38s of a 60-minute box, on head `a8aea6b`.
**VERDICT: CHANGES, criterion 0 only.**

**What it established, by execution.** Practice cannot certify: 21,600 model input combinations,
96,000 long-streak transitions, 1,600 service submissions, 140 evidence-writer attempts — zero
certifications, zero qualifying rows. Legacy `confirmed` reads as unverified across 192 fixtures /
768 view checks with rows byte-identical after reads. 13,958 unaffected behaviours identical to the
baseline. 22/22 source hashes match pinned Git content. Ten compiling mutants: six killed, four
survived — three real gaps (raw-status label, raw-status weekly headline, session deadline /
diagnostic completion), one redundant guard.

**Why it fails anyway.** Criterion 0 asked for an *auditable, dependency-closed* baseline.
`npm pack --dry-run` at the head packs 131 files including eight `reference-implementations/`
snapshots — the old *certifying* student model among them — because `package.json` has no `files`
allowlist. No lockfile: `@types/node` reaches `undici-types@~6.21.0` and nothing pins it. The
consumer inventory misses a CSS selector (`[data-status='confirmed']`) and the component feeding
it. None of these is a behavioural hole today; all three are exactly the kind of thing that
becomes one at the next import. The PM reproduced the first two directly (and found `docs/` in
the tarball as well, 65 files).

**The lesson.** The builder proved the *behaviour* exhaustively and under-proved the *boundary*.
A blind reviewer on a different model family caught what a same-family reviewer might have
nodded past — the packaging check is not something the builder's own harness ever ran. ADR-0062's
"build on one engine, review on the other" paid for itself on the first PR.

Applied Manny's rule: re-guide, not restart. r2 is the three fixes plus the three mutants as
committed tests, on the same branch, 40-minute box.

Related: [ADR-0062-fable-and-astra-mixed](../../decisions/ADR-0062-fable-and-astra-mixed.md) · [202609170002-manny-branding-kit-and-the-time-box-is-a-checkpoint](202609170002-manny-branding-kit-and-the-time-box-is-a-checkpoint.md) · kaizen *(PM vault: `20-mocs/kaizen`)*
