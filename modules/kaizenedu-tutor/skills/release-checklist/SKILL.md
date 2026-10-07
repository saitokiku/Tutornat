---
name: release-checklist
description: What must be true before a PR merges, before any deploy, and before each gate opens — the review order from the build prompt, the invariant and quality gates, the Gate 1 launch checklist, evidence and the weekly metrics report. Load it when you review a PR, prepare a merge, deploy to staging or prod, write docs/LOG.md, generate the weekly report, or check whether a gate can open.
---

# Release checklist

Run `bash .claude/skills/release-checklist/scripts/release-check.sh` for the mechanical part; it prints pass/fail for every automated gate. The rest is judgement, in the order below.

## Every PR (build prompt "Build loop" and Appendix B)

1. Every acceptance criterion in the issue is demonstrated with evidence in the PR body (screenshots at 390 px and 1280 px in light and dark, numbers, log lines), not asserted. Every number in an AC was measured and pasted.
2. The five invariants still hold and their tests ran: `pnpm test:invariants` green; the audit script green on the built bundle when the PR touches client code.
3. Product code stayed in the allowed paths; upstream edits carry a `// KAIZEN:` comment (`node .claude/skills/openmaic-internals/scripts/check-upstream-patches.mjs`).
4. Loading, empty, error, and offline states exist and were exercised.
5. Taste: no forbidden defaults, no banned copy (`check-copy.mjs`), one focal point per screen, reduced motion respected, kids' and teens' surfaces match their rules.
6. No new dependency without a one-line justification.
7. Numbers in the PR body match the code's behaviour when the reviewer runs it.
8. A PR that touches any prompt includes before/after eval results; one that touches the turn path includes a latency harness run; one that touches a minor-facing surface has the minors-privacy rules checked.
9. Under about 400 changed lines, titled with the issue, `Closes #N`.
10. Reply order: blocking issues, then high-leverage fixes, then optional polish. Approve only when blocking is empty and you ran the code yourself. Merge only green and reviewed, then add one line to `docs/LOG.md`.
11. `README.md` still describes the product as it is after the PR: screens, commands, variables, numbers. A README that lags the code is a finding, not a nit.

## Every deploy

Staging carries `ACCESS_CODE`; prod does not. `TUTOR_MODE=1` on both. Provider keys server-side only; `pnpm audit:client-bundle` green on the exact build. Sentry and PostHog receiving with recordings and replay off. Database backup verified within the last 24 h before a prod migration. Never a migration that drops a column without asking.

## Gate 1 launch (build prompt "Launch checklist" and "Definition of done")

Legal pages live and linked; billing tested with a real card and a real cancellation; webhook failure alerts; database backups and one restore drill; Sentry and PostHog receiving from prod; cost ceilings and daily caps verified in prod; a support address a human reads; the AI label visible in every session; the invariant suite green on the prod build; the beta invite sent to the first twenty with the feedback form.

Definition of done: a stranger with a phone can find the site, understand the price and the rules, sign up, hear the tutor within ten seconds, talk to it for 25 minutes with a face that listens and thinks, upload a photo of a problem, get drawn explanations, pass a check, see it on their progress page, hit the trial limit, pay, and cancel, with every invariant test green, every AC number measured, and the first weekly report generated.

## Gate 2 (under-13 unlock, attention opt-in for 9–12)

Every line of spec §11.2 done and counsel sign-off recorded in `compliance/signoff.md` (`check-compliance-gate.mjs` refuses `UNDER13_GATE` without it); vendor data-flow document complete; the 9–12 red-team set passes; the no-face-data-egress audit (`presence-layer/scripts/no-egress-audit.sh`) green including the Playwright network audit; the five-kid usability test filed in `docs/evidence/`; camera notice and consent language live and counsel-reviewed before the toggle is exposed.

## Gate 3 (ages 4–8)

R30 acceptance criteria measured; the 4–8 red-team set passes; counsel's second review of the camera default-on posture recorded; movement-break step tested with real children.

## Evidence and numbers (build prompt "Results engine")

`docs/evidence/` holds the 45-second demo script and recording, screenshots per gate, and user quotes with written permission. `scripts/metrics-report.ts` (data-29) writes `docs/metrics/YYYY-WW.md` every Monday with the same columns each week: signups, activation %, weekly active learners, sessions, minutes, paying accounts, MRR, week-over-week growth %, D7/D14 retention cohorts, trial → paid, cost per session, gross margin, thumbs %, mastery deltas, and after Gate 2 attention recoveries. `docs/YC-NOTES.md` is updated from it. Never fabricate, smooth, or cherry-pick a number.

## If a gate is at risk

Say so 48 hours before, with the smallest cut that saves the date, in `docs/DECISIONS.md` and a `needs-manny` issue.
