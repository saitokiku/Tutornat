# The documents

Thirty-one live documents, and one archive. This page exists because there were
fifty-seven and roughly twenty of them were true — which is worse than having
none, because a stale document does not announce itself. If you read only one
thing here, read `STRATEGY.md`.

## Precedence, when two documents disagree

1. **The code**, for anything the code decides: prices (`web/lib/server/clubPricing.js`), entitlements (`web/lib/server/context.js`), what is for sale (`SALE_STATUS`). A document that names a price is a document that can drift; the CI guard `web/test/priceTruth.test.mjs` exists because several did.
2. **`STRATEGY.md`** (v0.2), for the business model. Anything that contradicts it is out of date, including anything in this folder.
3. **`RELEASE_PLAN.md`** (v2), for the sequence — what ships in which wave and what gates it.
4. **`CLAIMS_MATRIX.md`**, for what may be said to a customer. No public claim ships without a row. Two CI tests enforce a subset.
5. **The wave specs** in `superpowers/specs/`, for why a given surface looks the way it does.
6. **`/CLAUDE.md`** at the repo root, for how to work in the codebase.

Everything else is reference material and is subordinate to those.

## Where to look

**What is the business?** `STRATEGY.md` — the model, the market, the five research domains it was verified against. `UNIT_ECONOMICS.md` for the arithmetic (8 seats break even, 14 passes the cash-cow gate, 16 is the Director's ceiling), `FINANCIAL_SCENARIOS.md` for the year-one range, `PRICING_EVIDENCE.md` for the Austin market read behind each figure — read its warning at the top before quoting any competitor number.

**What are we allowed to say?** `CLAIMS_MATRIX.md`. Every public claim, the code that supports it, and its disposition. Two bans live there: comparisons to a named competitor's price, and any statement of tax treatment.

**What ships next?** `RELEASE_PLAN.md` for the sequence, `LAUNCH_GAPS.md` for what a customer or tutor still cannot do, `superpowers/specs/2026-09-03-wave3-frontend.md` for the frontend rebuild.

**How does the product actually work?** `ARCHITECTURE.md` for the shape, `API.md` for the routes, `ENGINE.md` for the trellis and the mastery law — that one is load-bearing: a skill counts only on unassisted, verified, delayed evidence, and no surface may score assisted work as mastery.

**Why does this screen look like this?** `superpowers/specs/2026-08-22-one-system-rebuild.md` is the design system, `superpowers/plans/2026-08-21-anti-slop.md` is the copy standard, and the two wave-2 specs — `2026-09-02-wave2-audit.md` (what was wrong) and `2026-09-02-wave2-geometry.md` (what replaced it) — are why the room, the cohort and the record are the nouns.

**How do I ship it?** `DEPLOYMENT.md`, `PROVISIONING.md`, `ENVIRONMENT.md`, `GO_LIVE.md`. The last one is the ordered runbook; `supabase/GO_LIVE.sql` is its one-paste bundle.

**What is legally unresolved?** `legal/REVIEW_QUEUE.md` — twenty-six items, and item 17 (seat cancellation and refund terms) is the one that gates taking money. `legal/SAFETY_RUNBOOK.md` for escalation, `compliance/` for retention and the USA launch checklist, `SECURITY.md` and `SAFETY.md` for posture.

**Who runs the room?** `hiring/PROGRAM_DIRECTOR.md` — the deal, the week, and the dial.

**How do I know it works?** `TEST_PLAN.md`, `AI_EVALS.md`, and the three reviews in `reviews/`.

## The archive

`archive/` holds twenty-five documents that were true once. They are kept
because they carry mechanics and history worth reading, not because they are
current — every one of them is superseded by something in the list above.
`archive/README.md` says what each was and what replaced it.

Do not cite an archived document as a reason to do anything. If you find
something in there that is still true and still needed, move it back and say so
in the commit.
