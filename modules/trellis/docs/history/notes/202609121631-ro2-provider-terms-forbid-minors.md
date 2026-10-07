<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: vault/10-notes/202609121631-ro2-provider-terms-forbid-minors.md -->

---
id: 202609121631
title: RO-2 - the model provider our code uses forbids serving minors
tags: [kaizen, legal, research, blocker]
sources: [shared/artifacts/kaizen-research/03-minors-launch-gates.md]
project: kaizenai-saas
---
# The provider route is a launch gate, not an optimisation

Astra RO-2, 2026-09-12 16:31 CDT (13.09 M input / 74 k output tokens). Full report:
`shared/artifacts/kaizen-research/03-minors-launch-gates.md`.

## The finding that changes the build
KaizenEdu is wired to Gemini (`kaizen.config.ts:235-249`: `google:gemini-3-flash-preview`,
`google:gemini-3.5-flash`). **Google's published terms carry an express under-18 application
restriction on both routes** — the Gemini Developer API Additional Terms effective 2026-03-23, which
are not limited to the free tier, and Google Cloud's generative-AI Service Specific Terms §20(d).
RO-2 notes specifically that "use Vertex instead" is **not** supported by the published text it
inspected, and that parent purchase does not change the intended teen audience.

So the current stack cannot serve 13-17s, let alone under-13s. This is contractual, not a safety
opinion, and no amount of consent flow fixes it.

## Who permits it, conditionally
- **OpenAI** (Services Agreement eff. 2026-01-01): customer applications permitted; minors require
  parent/guardian consent; we remain responsible for consents, lawful use and output review. Its
  minors guidance describes age assurance, filtering, monitoring and escalation, and a zero-data-
  retention condition tied to processing personal data below the applicable age of digital consent.
- **Anthropic** (Commercial Terms eff. 2025-06-17; minor guidance 2026-03-16, child-safety developer
  guidance 2026-06-26): affirmative permission to power customer products, with minor safeguards,
  mandatory AI/human disclosure, age verification, moderation and monitoring as the developer's
  responsibility. Consumer Claude's 18+ rule is not the API rule.

**Neither is approval.** Both are conditions we must then evidence.

## Five enacted state companion-chatbot laws
California SB 243 (BPC §§22601-22606, live 2026-01-01, reporting from 2027-07-01), Hawaii Act 248,
Washington ESHB 2225 (2027-01-01), Oregon SB 1546 (2027-01-01), Connecticut PA 26-15 §§4-6
(2027-01-01). Duties include AI disclosure, crisis protocols, known-minor break reminders, and
measures against sexual, romantic, dependency and manipulative interactions. **The education
exclusions turn on facts** — school or instructional setting, solely curriculum-aligned objectives,
no open-ended companionship — so calling ourselves an education company does not qualify us.

## Verdict, in its words
*National minor-beta eligibility remains unestablished.* Parent consent, teen-data consent and
provider permission are three separate gates. Its 50-state-plus-DC inventory marks its own incomplete
checks rather than implying clearance — the discipline the brief demanded.

## Consequences
1. **The model route moves into M0** as a launch gate.
2. **The extraction (K5) must not carry the Gemini routes forward** — that would extract a licence
   problem into the new repository.
3. It raises the stakes on the open launch-age question: the provider restriction bites at 13-17 too,
   so it is not avoided by staying above 13.

Related: [202609121628-manny-market-read-algebra-first](202609121628-manny-market-read-algebra-first.md) · [ADR-0034-kaizen-v1-definition](../../decisions/ADR-0034-kaizen-v1-definition.md) ·
[SPEC](../../product/spec.md)
