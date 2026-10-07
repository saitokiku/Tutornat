# Plan

Day 0 is the spec date, 2026-09-03. Today is Day 1 (2026-09-04). Gate dates are from the spec header and §13; the YC deadline is 2026-11-02 20:00 PT.

| Day | Date | What must be true |
| --- | --- | --- |
| 1 | Sep 4 | Phase 0 done: engine merged with `upstream`, map, skills, invariants, harness, issues cut, blocking questions asked with defaults. |
| 2 | Sep 5 | A session works end to end on staging: text turn → tutor reply → whiteboard action, on Vercel with Neon and object storage behind `ACCESS_CODE`. spike-05 run with real keys; go/no-go recorded in `docs/DECISIONS.md`. |
| 7 | Sep 10 | Internal dogfood with 5 learners, thumbs ≥ 60 %. Voice loop live (VAD, streaming TTS, barge-in ≤ 300 ms), face v0 visible with idle/listening/thinking/speaking states, checks graded, WRAP writes the summary and updates the student model, accounts and learner profiles with isolation test green. |
| 12 | Sep 15 | Billing live: Stripe Checkout, Portal, webhooks, minute metering, caps and warnings, cost ceilings verified in prod. Landing page with price, bands, coach-mode rule, data rule. Pricing validated with 10 parents. |
| 14 | Sep 17 | Gate 1: beta invite to the first 20 (13+ and adults) with the face live; the Gate 1 launch checklist in `.claude/skills/release-checklist` complete; first weekly report generated. |
| 21–30 | Sep 24 – Oct 3 | Gate 2: under-13 profiles unlock after §11.2 and counsel sign-off; attention sensing opt-in for 9–12 after the network audit and the five-kid test. |
| Weeks 6–8 | mid-Oct | Second slice (R22) and the YC application draft. |
| Weeks 6–10 | mid-Oct – mid-Nov | Gate 3: ages 4–8 with the early-numeracy slice and young-kid defaults. |

## Critical path

voice loop → face → accounts and isolation → billing → landing.

1. **Voice loop** (spike-05, voice-16, voice-17, voice-18, voice-19, tutor-07, tutor-08): nothing else matters if the tutor cannot answer within 1.5 s and stop when interrupted. Base: pi runtime, streaming TTS route, Web Audio queue, VAD. Blocked today on provider keys (see blocking questions).
2. **Face** (presence-37, presence-38, presence-39): the layout and `AvatarDriver` are independent of the loop and can start now against a fake turn controller; wiring waits on tutor-07.
3. **Accounts and isolation** (auth-21, auth-22): Clerk principal, `account_id` everywhere, the read exemption closed, RLS, the cross-tenant test flipped from `it.fails` to a hard pass. Independent of the loop; start in parallel.
4. **Billing and caps** (billing-23, billing-24, guard-25): after accounts.
5. **Landing and onboarding** (growth-28): after the name decision; copy can be drafted now.

Parallel and non-blocking for Gate 1: tutor-06 prompts and evals, tutor-09/10/11/12/13/14, content-15, upload-20, parent-27, safety-26, data-29, data-30, ops-31, beta-32, infra-02/03/04.

## Tracks and owners

| Track | Owner | Day 1–14 |
| --- | --- | --- |
| A Engineering | lead seat (this session) plans and reviews; builder seats take `ready` issues; reviewer seat runs Appendix B | Issues in `docs/SPEC.md` §13, filed on GitHub with `track:*`, `gate:*`, status labels |
| B Legal / privacy | Manny with children's-privacy counsel | Counsel engaged Day 1–3; vendor review Day 1–7; notices, privacy and retention policies Day 3–10; consent flow spec to engineering Day 5; sign-off Day 18–25 |
| C Pedagogy / content | Manny (review) with the lead seat (generation) | Skill graph final Day 2 (seeded in `.claude/skills/pedagogy-fractions/references/skill-graph.json`); item bank Day 2–8 (generate, solve, review); diagnostic flow Day 6; tutor prompt evals Day 4–10; 9–12 red-team set Day 10 |

## Issues

Filed on 2026-09-04 as GitHub issues #1–#46 in `saitokiku/KaizenEdu`; the issue number equals the spec label number (`#5` is spike-05, `#46` is young-46). Labels: `track:eng` (33), `track:presence` (9), `track:legal` (4), `track:content` (2); `gate:1` (36), `gate:2` (9), `gate:3` (1); status `ready` (11: infra-02, infra-03, infra-04, tutor-06, voice-19, auth-21, safety-26, data-29, ops-31, presence-37, presence-38), `in-progress` (infra-01), `needs-manny` (7: spike-05, content-15, billing-23, growth-28, consent-33, consent-35, consent-36), `blocked` (27). Each body has scope, spec sections and skills, the acceptance criteria verbatim, expected files, a test plan, and dependencies.

## How work is picked

Only `ready` issues get picked up. An issue is `ready` when its dependencies are merged and no `needs-manny` question blocks it. Builder seats post a ≤ 10-line plan on the issue, build the thinnest vertical slice that makes every AC true, measure every number, open a PR under ~400 lines with evidence, and the reviewer seat runs Appendix B. Merged issues get one line in `docs/LOG.md`.

Milestones per gate were not created (the session's GitHub tooling cannot create milestones); the `gate:1`, `gate:2`, `gate:3` labels carry the same information. Creating the three milestones and assigning the labelled issues is a five-minute task for Manny.

## Risks watched weekly (spec §12)

Latency (go/no-go at spike-05), child-directed design creep, a vendor excluding minors, upstream drift, math hallucinations, cost runaway, voice quality on mobile Safari, regulatory drift, the engagement trap, face data leaking by accident, an uncanny avatar, low-end devices. If a gate is at risk, say so 48 hours before with the smallest cut that saves the date.
