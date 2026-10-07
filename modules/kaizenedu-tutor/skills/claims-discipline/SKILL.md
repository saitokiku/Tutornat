---
name: claims-discipline
description: The rule that no public claim ships without a row that names the code making it true — the claims ledger in docs/CLAIMS.md, its verdicts, the banned false forms the CI scanner rejects, the one price literal, the one entity-name regex, and un-cleared legal markers. Load it when you write or change any sentence on the landing page, a legal page, a sign-up or billing screen, an email template, the README's product description, or a number shown to a parent, and when you build or extend tests/invariants/claims.test.ts.
---

# Claims discipline

Contract: build prompt "Copy" and "Product honesty"; `docs/MVP-REFERENCE.md` §5 (the scanner row) and §2 (the working name). Existing guards: `node .claude/skills/design-system/scripts/check-copy.mjs` (banned words, exclamation points, emoji over `app/(learner)`, `app/(parent)`, `components/tutor`), `tests/invariants/*` (the five invariants). Source of the ported rules: Kaizen-AI `docs/CLAIMS_MATRIX.md`, `web/test/claims.test.mjs`, `legalMarkers.test.mjs`, `priceTruth.test.mjs`.

## The rule

A claim is any sentence a stranger could hold us to: what the product does, what it costs, what it will not do, what happens to data, who is behind it. **No claim ships without a row in `docs/CLAIMS.md` that names the code, test or record making it true.** A row is written before the sentence, or in the same PR. A claim the code does not enforce is reworded until it does, or it is not made.

Surfaces the rule covers: `components/tutor/marketing/**` (landing, storyboard, sign-in and sign-up forms, the legal pages), `app/(learner)/legal/**`, every `page.tsx` under `app/(learner)` and `app/(parent)`, `lib/tutor/email/**` (templates), `README.md`'s product description, and the App Store-style summary anywhere it appears.

## The ledger: `docs/CLAIMS.md`

One table, one row per claim, recounted at the top with the date of the last recount.

| Surface | Claim | Verdict | Evidence | Disposition |
| --- | --- | --- | --- | --- |
| `/welcome` hero | "$29 a month, up to 3 learners, 8 hours of tutoring" | TRUE | `kaizen.config.ts` `PLAN`; `lib/tutor/billing/entitlement.ts`; `tests/tutor/entitlement-settings.test.ts` | — |

Verdicts: **TRUE** (code does this, cite the file) · **FALSE** (code contradicts it; fix or remove before the surface ships) · **PARTIAL** (true in some cases, misleading as written; reword) · **GATED** (true in code but switched off today — say so on the surface, e.g. billing before `billing_enabled`) · **RETIRED** (no longer made; row kept) · **Do not claim** (banned until a named gate clears, e.g. any under-13 sentence before `compliance/signoff.md`).

Evidence is a file path, a test name, a measured number's file under `docs/metrics/`, or a record under `compliance/`. "We intend to" is not evidence.

## Claims the code enforces today, and where

| Claim | Enforced by |
| --- | --- |
| $29 a month, 3 learner profiles, 8 pooled hours | `PLAN` in `kaizen.config.ts`; `computeEntitlement` |
| 30 minutes free, no card, for 13+ and adults | `computeEntitlement` trial branch; `tests/tutor/entitlement-settings.test.ts` |
| Cancel in one click from the portal | `lib/tutor/billing/status.ts`, Stripe Customer Portal; `lib/tutor/billing/webhook.ts` handles the cancel |
| Audio is never stored | invariant (b), `tests/invariants/` |
| Nothing from the camera leaves the browser | invariant (c), `tests/invariants/`, the no-egress audit |
| Every session has a cost ceiling and every learner a daily cap | invariant (d); `SessionBudget`, `DailyCap`; `STAFF` is finite too |
| The tutor is an AI and says so | the session header label; `lib/tutor/prompts/` disclosure; `crisisReferralText` |
| The tutor will not do their homework | `lib/tutor/session/coach.ts`, the coach-mode eval when it exists |
| Mastery means an unassisted check a day later | D17; `lib/tutor/model/service.ts`; `REPORT_MASTERY_NOTE` |
| Under-13 profiles are locked until counsel signs off | `under13_gate` in `app_settings` (fail-closed); `check-compliance-gate.mjs` |
| Built on OpenMAIC (MIT) | `/legal/credits`; `docs/OPENMAIC-README.md` |

Anything not in this table is a new claim and needs its row first.

## Banned forms — the scanner rejects these on every surface above

`tests/invariants/claims.test.ts` scans the surfaces (`components/tutor/**`, every page under `app/(learner)` and `app/(parent)`, `lib/tutor/email/**`, and the two living documents), comments and SQL stripped, for the affirmative false forms. Honest negatives ("we do not run background checks") use different words and are not matched.

| Pattern | Why |
| --- | --- |
| `background-?checked` | There are no tutors to check; the sentence would be about a person who does not exist |
| `(human|real|live) tutors?` in an affirmative claim | The product has none; "AI tutor" is the label |
| `click-to-cancel rule`, `negative option rule` | Vacated by the 8th Circuit in 2025; ground cancellation in ROSCA and state auto-renewal law |
| `FERPA-(ready|compliant|certified)`, `HIPAA-(ready|compliant)` | Postures the product has not established and, for HIPAA, does not apply |
| `COPPA-(compliant|certified|safe harbor)` | A badge claim; the safe-harbor certification is a later item and the under-13 gate is closed |
| `guaranteed (results|grades|improvement|to (raise|improve))`, `grades? will (go up|improve)` | The product guarantees nothing |
| `trusted by`, `join \d+`, `\d+ (families|parents|students|learners) (use|trust|love)` | Social proof that does not exist; when it does, the number comes from `docs/metrics/` and gets a row |
| `\d+% (of (students|learners|kids)|improvement|faster|better)` outside a row | An outcome statistic without a measured file |
| `\$\d` in a product surface or template | Prices are interpolated from `PLAN.priceCentsMonthly`; see below |
| A legal-entity name other than the one constant | See the entity rule |
| `[ATTORNEY REVIEW]`, `[FOUNDER INPUT REQUIRED]`, `[COUNSEL]`, `TODO`, `lorem ipsum` | Drafting markers; drafts live under `compliance/` and never render |

When a pattern fires on a sentence that is true, the fix is a row plus an allowlist entry in the test that cites the row, never a wider regex.

## One price literal

`PLAN.priceCentsMonthly` in `kaizen.config.ts` is the only place a price is typed. Product surfaces, legal pages and email templates interpolate it through the shared formatter. Documents that state current truth (`README.md`, `docs/DO-THIS-NEXT.md`, `compliance/*.md`) may quote only figures `PLAN` can produce; dated documents (`docs/LOG.md`, decisions, spike reports) describe what was true and are exempt. Changing the price is a decision Manny makes; the code does not stop it, the rule does.

## One entity name

The registered entity is not yet decided (`compliance/open-questions.md`). Until it is, no product surface or legal page names an entity; it says "the operator" and the working name. When Manny names it, it goes into one constant (`LEGAL_ENTITY` in `kaizen.config.ts`), every legal clause interpolates it, and the scanner keeps one regex that rejects any other `… LLC` or `… Inc.` string on the surfaces — Kaizen-AI shipped a liability clause naming the wrong entity because a line-wrapped JSX string escaped a plain grep. The product name (D13) is the working name until told; the scanner does not enforce the name, only the entity.

## Numbers on a page

A number shown to a parent is one of: a value the code computes for that account (their minutes, their learner's skills), a plan limit from `PLAN`, or a measurement with a file under `docs/metrics/` named in the row. Never a smoothed, rounded-up or projected figure; never a latency the harness has not produced; never an eval score without its run. A number that is not one of those three is an adjective and is cut.

## When a claim goes false

Mark the row FALSE the day it is found, with the PR that fixes or removes the sentence. The surface does not deploy with a FALSE row on it. A retired claim keeps its row with the date; history is not rewritten.

## Verify before the PR

`node .claude/skills/design-system/scripts/check-copy.mjs` · `npx vitest run tests/invariants/claims.test.ts` · every new sentence on the surfaces above has a row · every number has its source · the "AI tutor" label is visible in every session and every email footer. Both scanners run in CI (`.github/workflows/invariants.yml`).
