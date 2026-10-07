# Archive

Twenty-five documents that were true once. Nothing here is current. Nothing
here decides anything.

They are kept rather than deleted because several carry mechanics, citations or
reasoning that is still worth reading — a superseded plan often explains *why* a
thing was built, which the thing that replaced it takes for granted. Git holds
them either way; this folder means you can find them without knowing to look.

**Do not cite an archived document as a reason to do anything.** If something in
here is still true and still needed, move it back to `docs/` and say so in the
commit message.

The archive is not exempt from the price guard: `web/test/priceTruth.test.mjs`
still scans the files it pinned before the move, because a wrong price is wrong
wherever someone reads it.

---

## Superseded by `STRATEGY.md` (v0.2)

Each of these carried the same banner before it was moved — *"the canonical
business model is now docs/STRATEGY.md"*. Four documents all deferring to a
fifth is the signal that they belong here.

| Document | What it was | Read instead |
|---|---|---|
| `MINIMAL_SAAS_PLAN.md` | The AI-only SaaS model (2026-08-13), with cited unit economics. The business is now an in-person club with the AI free. | `STRATEGY.md`, `UNIT_ECONOMICS.md` |
| `PRODUCT_SPEC.md` | The "living" product spec, overtaken by the strategy rewrite. | `STRATEGY.md` |
| `ROADMAP.md` | A sequence, grounded in the code as it stood in August. | `RELEASE_PLAN.md` (v2) |
| `RAISE_NOTES.md` | Founder working notes for the raise narrative. | `STRATEGY.md`, `FINANCIAL_SCENARIOS.md` |
| `WHAT_WE_SELL.md` | 406 lines on the catalogue and what goes wrong at the register — written before the standing seat became the one recurring product. | `web/lib/server/clubPricing.js` is the catalogue; `STRATEGY.md` §5 is the argument |

## Launch documents for a launch that changed shape

| Document | What it was | Read instead |
|---|---|---|
| `LAUNCH_SPEC.md` | "Ship to Students Today" (2026-07-28), pre-club. | `RELEASE_PLAN.md` |
| `LAUNCH_ONESHOT.md` | A prompt to paste into a coding model. An artifact of how the work was done, not of the product. | — |
| `LAUNCH_RUNBOOK.md` | Go-live for the **tutoring marketplace**, which is a cut product: `/tutors` fails closed on `marketplace_enabled` and no surface offers a private 1:1. | `GO_LIVE.md` |
| `MOBILE_IPA_PLAN.md` | An iOS/Android plan. There is no mobile app and none is sequenced. | `RELEASE_PLAN.md` |

## Point-in-time reports

Snapshots. Each was accurate on its date and has been overtaken by the work it
prompted; the fixes are in the code and in `CLAIMS_MATRIX.md`.

| Document | Dated | Note |
|---|---|---|
| `AUDIT_FINDINGS.md` | 2026-07-22 | The July codebase audit. `supabase/migrations/0009_hardening.sql` still cites it for provenance. |
| `AUDIT_REMEDIATION.md` | 2026-07-22 | What was done about the above. |
| `GO_LIVE_REPORT.md` | 2026-07-26 | What stood between the repo and a paying customer, then. |
| `PRODUCTION_READINESS.md` | 2026-07-27 | Verification results and a go/no-go. Cited by `supabase/seed_kc_algebra1.sql` for the item-bank provenance. |
| `PRODUCTION_CHECKLIST.md` | 2026-07-08 | 24 lines, pre-club. |
| `PRODUCT_HARDENING.md` | 2026-07-28 | Cash-flow and readiness hardening. |

## The frozen chain

These three interlocked: a frozen technical document, an errata sheet
correcting it, and a handoff that claimed authority over both. All three now
describe a product two waves out of date — `HANDOFF.md` reports 230 tests
passing and mentions the marketplace seven times.

| Document | What it was |
|---|---|
| `TECHNICAL_SOURCE_OF_TRUTH.md` | Frozen 2026-07-28, and partly wrong even then. |
| `ERRATA.md` | The corrections to it. Meaningless without it. |
| `HANDOFF.md` | A verified-against-live snapshot at 2026-07-30, HEAD `5ed21a1`. |

The live answers are `/CLAUDE.md` for how the code is arranged, `ARCHITECTURE.md`
and `API.md` for what it does, and the wave specs for why.

## Hiring, for a deal that was not taken

Kaizen Local hired a **Program Director**: hourly, part time, no equity. These
three describe a profit-share founding-partner package, and say "online" where
the seat is in person.

`CLUB_DIRECTOR_JD.md` · `CLUB_DIRECTOR_COMP.md` · `CLUB_DIRECTOR_INTERVIEW_MANUAL.md`

Read `hiring/PROGRAM_DIRECTOR.md`. Keep these for the day equity is back on the
table — the interview manual in particular is reusable once its premise is.

## Superseded design work

The marketing-surface redesign of 2026-08-12 and the gap-report fixes of
2026-08-13. Both were absorbed by the 2026-08-22 one-system rebuild, which is
the live design system.

`superpowers/plans/2026-08-12-weekly-rhythm-marketing-redesign.md` ·
`superpowers/plans/2026-08-13-gap-report-fixes.md` ·
`superpowers/specs/2026-08-12-day-night-visual-overhaul.md` ·
`superpowers/specs/2026-08-12-weekly-rhythm-marketing-redesign-design.md`
