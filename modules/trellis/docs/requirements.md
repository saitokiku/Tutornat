# Requirements snapshot — September 13, 2026

This is a dispatch summary, not a new SPEC. The PM owns changes to requirements.
[SPEC v0.3-school-first-build](https://github.com/gokumann-pm/pm/blob/main/vault/40-projects/kaizenai-saas/SPEC.md),
[DIRECTION](https://github.com/gokumann-pm/pm/blob/main/vault/40-projects/kaizenai-saas/DIRECTION.md)
and accepted ADR clauses govern over legacy source comments. Detailed design is still a draft.

## Accepted scope

- Household product sold to parents; primary/elementary education leads, school ages
  include younger siblings. Independently subscribing adults are a later product.
- Maths first, starting engineering demonstrations with synthetic elementary fractions.
- Mobile-first web/PWA; homework and document intake, teaching canvas, voice/text,
  learner context and honest parent reports. Frontend/backend design follows engine verification.
- Practice and assisted homework contribute zero mastery credit. Practice can earn
  assessment priority. Only restricted, independent assessment authority can qualify evidence.
- Qualifying evidence needs unfamiliar reviewed content, at least 48 hours since
  relevant instruction, two contexts and separate days, plus the later check around day seven.
  Observed help or answer exposure resets eligibility across sessions and disqualifies
  an in-progress assessment. Old assisted rows retain their history and provenance.
- Initial scheduling settings: ten clean practice repetitions earn quiet-window priority;
  inability to find a window within fourteen days requires a parent explanation.

## Decisions that constrain this repository

- [ADR-0059](https://github.com/gokumann-pm/pm/blob/main/vault/30-decisions/ADR-0059-product-repo-under-the-pm-account.md):
  private `gokumann-pm/kaizenedu`; both `saitokiku` repos are grafting sources only.
  This supersedes the older plan's source-repository/worktree destination.
- [ADR-0055](https://github.com/gokumann-pm/pm/blob/main/vault/30-decisions/ADR-0055-school-first-engine-build.md):
  school-first build authorized; engine verification precedes frontend, backend and wider slices.
- SPEC §§3.1, 4 and 5 govern evidence integrity, the household journey and reuse.
  Provider qualification and deployment are later gates; no Google routes enter the product.

## Still unresolved

- K7: who reviews the first 118 assessment items. No answer found in the PM intake
  at setup. Synthetic fixtures do not count as reviewed learner content.
- Day-seven anchor/window, day timezone, context classification and detailed assessment rubric.
  E1 must introduce no new certification authority while these remain open.
- Public brand, content approval, credentials rotation, age/consent and provider qualification,
  board provenance, measured cost and release acceptance. None blocks offline repository setup.

An engineering test pass is not evidence of educational efficacy or a child-ready release.
