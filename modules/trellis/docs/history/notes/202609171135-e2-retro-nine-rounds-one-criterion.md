<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609171135-e2-retro-nine-rounds-one-criterion.md -->

---
id: 202609171135
title: E2 retro — nine rounds on one criterion; an evaluator is never the last line
tags: [retro, lesson, kaizen, kaizenedu, e2, evidence-integrity]
sources: [30-decisions/ADR-0067-content-gate-grammar-is-one-operation, 99-attachments/research/2026-09-17-blind-review-kaizenedu-pr7-a-r9]
project: kaizenedu
---
# E2 retro — nine rounds on one criterion; an evaluator is never the last line

E2 landed at 06:33 CDT: PR #7 (A, assessment service) merged as `824d170` after PR #8 (B, exposure ledger) and PRs #9/#11/#12 (C, the SQL seam). A took nine Fable builds (21+8+10+16+12+5+6+4+4 min) and nine Astra blind reviews; criterion 4 — a wrong-but-approved key must never certify — failed five reviews in a row (r4–r8), each on a new class: phrasing fall-through, meaning-changing normalisation, an operator mapping table, floating-point key comparison, `÷→/` regrouping. Every fix was real and small. The class never closed until [ADR-0067-content-gate-grammar-is-one-operation](../../decisions/ADR-0067-content-gate-grammar-is-one-operation.md) deleted the general evaluator and left one regular expression: two fractions, one operator. Review r9: APPROVE, 144 division trials and 62 fresh edge cases, zero false qualifying (2026-09-17-blind-review-kaizenedu-pr7-a-r9 *(PM vault: `99-attachments/research/2026-09-17-blind-review-kaizenedu-pr7-a-r9`)*).

**Lessons**
1. *Second CHANGES on the same criterion → the next round removes the class, not the case.* [202609170145-e1-retro-three-rounds-one-criterion](202609170145-e1-retro-three-rounds-one-criterion.md) recorded three rounds on one criterion; this is the second occurrence, so it becomes a template rule (implement-feature v11), not a note.
2. *An evaluator cannot be the last line of a certification.* The structural answer is two independently authored keys that must agree exactly; the evaluator is a third check (E3-K). See 202609170530-narrow-the-evaluator-fail-closed-by-construction *(PM vault: `10-notes/202609170530-narrow-the-evaluator-fail-closed-by-construction`)*.
3. *Shrinking beats narrowing.* A finite grammar is reviewable; a general parser is a surface the reviewer will keep finding.
4. Process: the reviewer wrote r9's report into r8's directory (the vault copy saved it — file every round before the next); r9's builder left no PR-body section (the PM wrote one from the done note); r8's builder wrote a believed timestamp — "`date` before any time you write" fixed it in r9. Each is a first occurrence: watch for the second.
