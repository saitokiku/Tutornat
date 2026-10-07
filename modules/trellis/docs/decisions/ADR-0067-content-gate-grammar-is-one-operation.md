<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/30-decisions/ADR-0067-content-gate-grammar-is-one-operation.md -->

---
id: ADR-0067
title: The content gate's grammar is one operation between two fractions
status: accepted-by-default
date: 2026-09-17
decided_by: handler (default fired 06:14 CDT; Manny may override by replying A)
project: kaizenedu
tags: [adr, kaizen, kaizenedu, e2, evidence-integrity]
supersedes: none
---
# ADR-0067 — The content gate's grammar is one operation between two fractions

## Context
E2 part A carries an independent content check so that a mathematically wrong but approved answer key can never produce qualifying evidence (SPEC §3.1, criterion 4 / E07). Five consecutive blind reviews (r4–r8) each found a new way for a general arithmetic evaluator to certify a wrong key: phrasing fall-through, meaning-changing normalisation, an operator mapping table (factorial, adjacent `\frac`), floating-point key comparison, and the `÷→/` rewrite colliding with the fraction bar so chains regroup (`8÷2÷2÷2` parses as `8/2 ÷ 2/2 = 4`, keyed 4). Each fix was small and real; the class of defect — a general parser has an unbounded surface — never closed. The fixtures are elementary fractions: one operation.

## Decision
The content check verifies exactly `ATOM OP ATOM` — two unsigned exact rationals (`n` or `p/q`, q>0) and one of `+ - × * ÷` — with BigInt arithmetic and exact rational key comparison, and abstains with a recorded reason on anything else (chains, precedence, inner parentheses, unary minus, decimals, mixed numbers, any other character). The general evaluator is deleted, not narrowed. Correct keys on anything more complex abstain: recorded fail-closed behaviour, not a defect. Options considered: (A) fix associativity and keep the general parser with a differential test — another round of the same game; (B) merge with criterion 4 as residue — a wrong key could certify, rejected.

## Consequences
- The evaluator's surface is finite; a reviewer can enumerate it.
- Items beyond one operation cannot be independently verified by this gate; E3's dual-key content boundary (two independently authored keys that must agree exactly; the evaluator a third check) is the structural answer — see the E3 decision draft.
- Recorded in [DRIFT](../product/drift.md) as a disclosed choice where the SPEC is silent on grammar. Reviews: 2026-09-17-blind-review-kaizenedu-pr7-a-r8 *(PM vault: `99-attachments/research/2026-09-17-blind-review-kaizenedu-pr7-a-r8`)* and the four before it. Lesson: 202609170530-narrow-the-evaluator-fail-closed-by-construction *(PM vault: `10-notes/202609170530-narrow-the-evaluator-fail-closed-by-construction`)*.
