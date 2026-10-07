<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/kaizen-index/kaizen-ai.md -->

# Kaizen-AI — repository index

Clone indexed: `/Users/mann/pm/shared/repos/Kaizen-AI` · remote `https://github.com/saitokiku/Kaizen-AI` · HEAD `91af9e4` (2026-09-03) · indexed 2026-09-11, read-only.

## Identity

The repo calls itself an **in-person after-school academic club in Austin for students 13 and up, paired with an AI study companion that is free** (`README.md:3-4`). The owner entity is **Kaizen Academy LLC**, and `CLAUDE.md:3-4` warns it is "never 'Kaizen Tutors LLC'; a CI test fails the build on the wrong entity." One recurring product is sold: the **standing seat** — "a reserved place in the same small room, twice a week, 1:4, taught by the Program Director, at one price for every payer" (`README.md:6-9`). Around it sit a la carte drop-ins (Homework Hall, Subject Clinic) and a free Community Hall. The README deliberately prints no prices: "Every figure above lives in `web/lib/server/clubPricing.js` and nowhere else… because a README is not a price sheet and the two drift" (`README.md:14-16`). The README also states what is **not** sold and not built: "private 1:1 tutoring, a browsable marketplace of tutors, and free trials" (`README.md:25-27`). Canonical business document is `docs/STRATEGY.md` v0.2, owner Manny, last updated 2026-09-02 (`docs/STRATEGY.md:1-6`).

## Shape

| Path | Purpose | Size |
|---|---|---|
| `web/` | The entire product. Next.js 16 App Router in **JavaScript** (not TS), React 19, Tailwind 3. All API routes. Self-contained. | 3.7 MB |
| `supabase/` | 38 additive migrations (`0001`–`0038`) + `seed.sql`, `seed_kc.sql`, `seed_kc_algebra1.sql`, and `GO_LIVE.sql` (one-paste ops bundle) | 512 KB |
| `docs/` | 31 live documents + `docs/archive/` (25 superseded), `legal/`, `compliance/`, `hiring/`, `reviews/`, `superpowers/` specs and plans | 848 KB |
| `legacy/` | Archived FastAPI+LangGraph backend, old Next.js frontend, Expo client, 5 n8n workflows. Zero product dependencies; a deletion candidate per `CLAUDE.md:22-23` | 900 KB |
| `demo-materials/` | Two complete courses (Algebra II, AP Biology) used as real intake fixtures, not mock data (`demo-materials/README.md:3-6`) | 160 KB |
| `evals/tutor/` | Tutor-quality rubric (pass at ≥ 9/12, no zero in Integrity or Contract) + `sample_cases.json` | 8 KB |
| `test-results/` | Playwright output directory | 4 KB |

598 tracked files. LOC by extension, tracked: JavaScript 47,724 · mjs 12,373 (tests + scripts) · SQL 7,288 · Markdown 14,827 · tsx 3,370 (all in `legacy/`) · Python 2,473 (all in `legacy/`) · CSS 232. `legacy/` totals 16,811 lines; `docs/` totals 10,900.

**Manifests and stack.** `web/package.json` — name `kaizen`, version 0.5.0, private, license UNLICENSED. Runtime deps: `@anthropic-ai/sdk ^0.116.0`, `@supabase/supabase-js ^2.110.0`, `stripe ^22.3.0`, `@daily-co/daily-js`, `next ^16.2.11`, `react ^19.2.8`, katex/mermaid/remark stack. Dev: Playwright, eslint 9, tailwind 3, typescript 7.0.2 (typecheck only, over jsdoc). No root manifest; `legacy/backend/pyproject.toml` is the dormant Python one.

**Deploy.** Vercel with **Root Directory = `web`**, production branch `main`, domain kaizenedu.net (`CLAUDE.md:76-79`). `web/vercel.json` declares framework nextjs and one hourly cron at `/api/cron/maintenance` (`0 * * * *`), which requires `CRON_SECRET`. Supabase Postgres with RLS for data/auth/storage. No Dockerfile in the product; `legacy/backend/Dockerfile` and `legacy/docker-compose.yml` are dormant.

**CI.** One workflow, `.github/workflows/ci.yml`, added because "the repo previously had zero automated checks" (audit SHIP-001, comment at `ci.yml:1-3`). On push to main and every PR: `npm ci`, `npm test`, `npm run build`, then Chromium install and the Playwright smoke specs. Its own comment records that E2E "existed but was never invoked, so its assertions (prices, checkout CTAs, the 404 path) gated nothing."

## What is actually built

**Pages (25 route segments)** under `web/app`: `/` · `/about` · `/academic-integrity` · `/admin` · `/admin/funnel` · `/ai` · `/billing` · `/contact` · `/dashboard` · `/diagnostic` · `/family` · `/forgot-password` · `/licenses` · `/pricing` · `/privacy` · `/reset-password` · `/safety` · `/schedule` · `/settings` · `/terms` · `/tutor` · `/tutoring` · `/tutors` · `/tutors/[slug]` · `/tutors/apply`.

**API: 67 route handlers** under `web/app/api`, grouped: account (3), admin (14), billing (4: checkout, portal, reconcile, webhook), club (2), cron (1), engine (4: check, placement, session, state), family (4), tutoring (18), voice (3), plus chat, circle, diagnostic, grade, handoff, health, image, intake (2), parse-syllabus, practice, reports/weekly, safety (2), support.

**Database.** 38 migrations, `0001_init` through `0038_cohorts`. The arc is readable from the filenames: grades, tutors, hiring, payments, storage intake, USA compliance, pricing, three hardening rounds, RLS hardening, KC library, evidence ledger, engine finalize, group sessions, grant hygiene, cancellation provenance, club plans, house pricing, class catalog, parent-managed accounts, hall operations, AI tiers, hall board, occupancy core, mastery-law hardening, audit hardening, ledger close, standing seat, trellis foundations, pay-band director, diagnostic orders, learner focus, cohorts. Evidence rows may never be updated — a trigger added in `0034` enforces that corrections are new rows (`CLAUDE.md:72-74`).

**Tests.** 60 unit suites in `web/test/*.test.mjs`, including the guards that matter: `clubPricing.test.mjs`, `priceTruth.test.mjs`, `claims.test.mjs`, `legalMarkers.test.mjs`, `schemaDrift.test.mjs`, `authz.test.mjs`, `masteryRecord.test.mjs`. Two Playwright specs: `web/e2e/smoke.spec.js`, `web/e2e/memberJourney.spec.js`.

**Exists but held closed, deliberately.** Selling is fail-closed on `app_settings.club_enabled`, seeded `false` (`supabase/seed.sql:149`); the storefront renders a preview state when it is false (`web/lib/server/publicSchedule.js:28-32`). The tutor marketplace is gated off on `marketplace_enabled`; `web/app/tutors/page.js:5-8` records that a browsable bench "is a Wave 2" item and that private 1:1 "is a product we cut." `ai_hall` is "built and disclosed; deliberately not wired at launch" (`web/lib/server/clubPricing.js:197`).

## Intents and designs attempted

Live documents (`docs/README.md` states the precedence: code → `STRATEGY.md` v0.2 → `RELEASE_PLAN.md` v2 → `CLAIMS_MATRIX.md` → wave specs → `CLAUDE.md`):

| Document | Date | Thesis | Status |
|---|---|---|---|
| `docs/STRATEGY.md` | v0.2, 2026-09-02 | The business model, re-verified; the seat defined; the rails re-sequenced | **live, canonical** |
| `docs/RELEASE_PLAN.md` | v2, 2026-09-02 | Ordered stages to the Wave 1 exit gate; no dates, evidence gates only | live |
| `docs/CLAIMS_MATRIX.md` | — | Every public claim, the code supporting it, its disposition; two CI tests enforce a subset | live |
| `docs/ENGINE.md` | — | The trellis and the mastery law: a skill counts only on unassisted, verified, delayed evidence | live, load-bearing |
| `docs/LAUNCH_GAPS.md` | rolling | What a customer or tutor still cannot do | live |
| `docs/UNIT_ECONOMICS.md` · `FINANCIAL_SCENARIOS.md` · `PRICING_EVIDENCE.md` | — | 8 seats break even, 14 passes the cash-cow gate, 16 is the Director's ceiling; year-one range; Austin market read | live |
| `docs/legal/REVIEW_QUEUE.md` | — | 26 items needing counsel; item 17 (seat cancellation and refund terms) gates taking money | live, open |
| `docs/superpowers/specs/2026-08-22-one-system-rebuild.md` | 2026-08-22 | The live design system | live |
| `docs/superpowers/plans/2026-08-21-anti-slop.md` | 2026-08-21 | The copy standard | live |
| `docs/superpowers/specs/2026-09-02-wave2-audit.md` + `-wave2-geometry.md` | 2026-09-02 | What was wrong with the surfaces, and the room/cohort/record nouns that replaced it | live (shipped as PR #30) |
| `docs/superpowers/specs/2026-09-03-wave3-frontend.md` | 2026-09-03 | The frontend rebuild, sequenced behind founder actions | planned, not built |
| `docs/archive/MINIMAL_SAAS_PLAN.md` | 2026-08-13 | The AI-only SaaS model with cited unit economics | **superseded** — business became an in-person club with the AI free |
| `docs/archive/WHAT_WE_SELL.md` | pre-seat | 406 lines on the catalogue and register failures | superseded by the seat |
| `docs/archive/LAUNCH_RUNBOOK.md` | — | Go-live for the tutoring marketplace | **abandoned** — marketplace is a cut product |
| `docs/archive/MOBILE_IPA_PLAN.md` | — | An iOS/Android plan | **abandoned** — "There is no mobile app and none is sequenced" (`docs/archive/README.md`) |
| `docs/archive/TECHNICAL_SOURCE_OF_TRUTH.md` + `ERRATA.md` + `HANDOFF.md` | frozen 2026-07-28/30 | A frozen technical doc, its errata, and a handoff claiming authority over both | **archived 2026-09-03**, "described a product two waves out of date"; HANDOFF mentions the marketplace seven times |
| `docs/archive/hiring/CLUB_DIRECTOR_*.md` (3) | — | A profit-share founding-partner package, "online" | **abandoned**; the hire became hourly/part-time/no-equity (`docs/hiring/PROGRAM_DIRECTOR.md`) |
| `docs/archive/` remainder | Jul 2026 | Audit findings/remediation, go-live report, production readiness/checklist, product hardening, roadmap, raise notes, product spec, launch spec, launch oneshot, 4 superseded design docs | superseded; `docs/archive/README.md` maps each to its replacement |
| `docs/AI_STRATEGY.md` | 2026-09-04 | "The AI is not the chatbot. The AI is the record." Rescued from an uncommitted scratch file | **exists only on the unmerged branch** `origin/claude/strategy-progress-assessment-rb6eju` |

### STRATEGY.md v0.1 → v0.2, and the business model (≤ 25 lines)

v0.2 is a correction pass: §0 is a table of fourteen rows where v0.1 was wrong (`docs/STRATEGY.md:24-44`). The marks are explicit — ✓ primary source, ~ single secondary, ✗ v0.1 was wrong, ? unverified — and the doc admits its research environment blocked every `.gov`, statute, news and vendor host, so Texas statutory figures are corroborated but "**not read in the statute**" (`docs/STRATEGY.md:11-21`).

- **§25F flipped meaning.** v0.1: parent-directed public money from 2027-01-01. v0.2: a **donor** tax credit, $1,700/taxpayer/yr, nonrefundable, routed through state-listed scholarship-granting organisations — "a BD motion with 2–5 Texas SGOs in 2027, not a rail to get approved on."
- **TEFA demoted.** $10,474 is the accredited-private-school tier, not the general award; homeschool/other is **$2,000**; disability up to $30,000; **public-school students are ineligible**. ~2,400 vendors listed at launch, non-exclusive, ~4–6 weeks. Conclusion: "Treat TEFA as partial subsidy and upside, never as the plan" (§5.2). A $550 seat exhausts a homeschool award in 3.6 months; the disability tier is the one TEFA segment that can carry a seat.
- **529 promoted.** K-12 tutoring qualified for distributions after 2025-07-04, $20,000/yr K-12 cap from 2026, no application, no state approval ✓ — "the larger rail, and the one that reaches Kaizen's 13+ public-school families today."
- **Credentialing is the blocker on every rail except Arizona**, so the "interviewed and approved, $22–30/hr" pool cannot bill any rail; a certified-tutor tier is a labour-model change, not a listing.
- **Effect sizes corrected down**: ~0.29 SD pooled (Nickow et al., AERJ 2024), 0.14–0.22 SD at scale; plan on 0.15–0.20 SD; the "<2% get high-quality tutoring" figure was deleted as sourceless.
- **Segments and prices (§5)**: standing seat $450–650/mo, one price for every payer, 76–85% labour-only GM; drop-ins $14 Hall / $30 Clinic / free Community Hall; diagnostic $59 one-time, ~90% GM; Kaizen Online house tutors at the same price book; marketplace 25–30% take (Wave 2); **Kaizen Home** homeschool — *no new SKU*, free AI + $11.99 Max AI + $59 diagnostic + drop-ins, and explicitly **not** 529-eligible because §529(c)(7)(E) requires tutoring "outside of the home"; Kaizen Kids moved to 2028 and optioned out of the seed narrative; Kaizen Gov priced per verification event, not per seat.
- **Seat economics**: 8.67 sessions/mo, $74.50 delivery at $27.50/hr or $108 at a certified $40/hr; breakeven ~5 seats; cash-cow gate (≥$3,000 owner profit and ≥25% margin) at ~12 seats in borrowed space; **no lease before 16 committed seats**.
- **Legal flags.** **Kaizen Certified as written is a franchise** under 16 CFR 436.1(h) ✓ — mark + control/assistance + required payment over the $735/six-month floor; three escapes are specified (UL-true audit, Prenda-shaped platform fee, or accept an FDD). **CA SB 243** (Ch. 677, effective 2026-01-01): "The shipped 13+ tutor may already owe SB 243 duties (persona, AI disclosed only 'if asked')" — and v0.1's claim that such statutes make competitors non-viable by 2028 is marked ✗ overreach. CA SB 1119 (annual child-safety risk assessments and independent audits by 2027-07-01) passed 2026-08-31, awaiting the Governor. Never print "Kaizen AI LLC".

## History

- **217 commits** on `main`, 2026-06-06 (`9cf4a94`) to 2026-09-03 (`91af9e4`).
- **Authorship (names only):** Claude 117, saitokiku 100.
- **Branches.** Local: `main` only. Remote: `origin/main` and **`origin/claude/strategy-progress-assessment-rb6eju`** — 22 commits ahead of main, 0 behind, last commit 2026-09-06, i.e. newer than main and **unmerged**. Its diff is 242 files, +4,670 / −18,541: it deletes `legacy/` entirely, splits the admin console (`web/app/admin/board/page.js`, `web/components/admin/console.js`), adds `web/lib/siteIdentity.js` with severance tests, and adds `docs/AI_STRATEGY.md`. Commit titles read as a 1→5 phase pass plus findings: "a kill switch that existed in no database, no console and no allowlist" (`5d525e9`), "finding: the mastery record has almost no way to be written" (`404d1ea`), "the study session called a practice score 'mastery', and so did the prompt" (`3e63f01`).
- **Cadence, commits per ISO week:** W23 2 · W24 3 · W27 6 · W28 35 · W30 32 · W31 25 · W33 66 · W34 26 · W35 3 · W36 19. Weeks 25, 26, 29, 32 are empty. Work arrives in bursts, with the largest in W33 (mid-August).
- **30 merge commits**, PR #2 through PR #30, all from `saitokiku/*` branches.
- **15 most meaningful commit subjects:** `59e5114` strategy(v0.2): re-verify the business model, define the seat, re-sequence the rails · `4fbdaa7` seat: the standing seat enters the price file, and the repo builds from it · `85897e0` strategy(home): the parent can be the gardener · `2771d9c` wave2 stage 1: the spine — a cohort, a room's own clock, a closed vocabulary · `a9d9c6a` wave2: the nine surfaces, rebuilt around the room and the record · `58e44bb` wave1: the product the director can sell, and the loop the founder can watch · `cd7ebdb` hire(director): the first hire enters the code, and the diagnostic gets a price · `1d3fafe` cleanup: fifty-seven documents, of which twenty were true · `93ca2cf` docs(review): full-repo audit — 102 findings across UI, backend, business, IP · `817091e` docs(strategy): The Record, Not the Answers — the AI-only SaaS plan · `7ae5766` ui(foundation): one system — unified tokens, type and radius scales, primitives · `941f4d0` copy(anti-slop): rewrite the marketing voice, make the marquee honest · `2c6a816` launch(austin): wire the live Stripe catalog, and give the storefront a crawl surface · `875e71d` product(ai): free with one upgrade · `a36e059` fix(db): migration 0031 — audit hardening (cascade, rebooking, double-pay, check lockout).
- **Deletions (`git log --diff-filter=D`):** `c69a067` (2026-07-04) removed the first dashboard components including `StubPanel.js`; `277670f` (2026-07-08) removed `web/lib/mockCanvas.js` with "remove mock demo mode"; `064cf09` (2026-08-13) removed `docs/RESUME_NOTES.md` and two committed tsbuildinfo files; `516a6e2` (2026-08-22) removed `web/components/MarketingShell.js` and `WeekStrip.js` in the one-system recompose. No `git revert` commits exist; `git log --grep=revert` matches only two commits whose bodies mention reverting behaviour (undo on complete/delete).

## Dead ends and contradictions

1. **`legacy/` is a 16,811-line dead stack kept on main.** `legacy/README.md` is candid: the FastAPI+LangGraph backend is a "Dormant scaffold. State is in-memory (nightly Celery loops are inert — worker and API don't share memory); DB layer wired but unused; no tests." Four of five n8n workflows "call backend endpoints that don't exist (audit SHIP-005)." `CLAUDE.md:22-23` calls it a deletion candidate. The unmerged branch deletes it; main still carries it.
2. **Private 1:1 is "not built" in the README but still priced in the price authority and printed on `/terms`.** `README.md:25-27` says private 1:1 tutoring is not sold and not built. `web/lib/server/clubPricing.js` carries `private30Cents`/`private60Cents` for all three retired tiers and in `RETAIL` ($35/30 min, $60/hour), and `web/app/terms/page.js:28-29,62,158-159` renders a "Private hour" column and the retail private rates. `web/app/tutors/page.js:8` states plainly that the 1:1 entry price is "a product we cut." Legally the disclosure may be required; as an index entry, the price file and the Terms still describe a product the README disowns.
3. **`GO_LIVE.sql` flips the fail-closed selling switch in committed SQL.** `CLAUDE.md:66-69` hard rule 4 says "Don't flip it in code or seed." `supabase/seed.sql:149` correctly seeds `club_enabled` false, but `supabase/GO_LIVE.sql:1432-1433` contains an uncommented `insert … ('club_enabled','true') on conflict … do update`, under a banner reading "Flip the switch: open club selling (schedule, seats, 1:1 booking)." Anyone pasting the bundle opens selling before counsel clears `REVIEW_QUEUE.md` items 10–15. The same line also describes "1:1 booking" as something the flip opens.
4. **The archive is the record of three abandoned product shapes**: the AI-only SaaS (`MINIMAL_SAAS_PLAN.md`, 2026-08-13), the tutor marketplace (`LAUNCH_RUNBOOK.md`, gated off in code), and the mobile app (`MOBILE_IPA_PLAN.md`, never sequenced). A fourth, the profit-share Club Director deal, was replaced by an hourly Program Director.
5. **Documented cleanup of its own documentation**: `1d3fafe` "fifty-seven documents, of which twenty were true." `docs/README.md:3-5` repeats the reason: "a stale document does not announce itself."
6. **A known, deliberate data-loss trap.** `CLAUDE.md:86-88`: `lib/cloud.js` sync has no conflict guard, row-level last-write-wins, "a stale device can clobber newer data. Deliberate; do not 'fix' casually."
7. **TODO/FIXME is effectively zero in the product**: 6 matches repo-wide, none in `web/` — they sit in `docs/SECURITY.md`, two archived audit docs, and `legacy/backend/app/workers/tasks/audio_cache.py`.

## Risks

- **Committed secrets: none found.** No `.env` or `.env.local` is tracked; the four tracked files are `.env.example`, `web/.env.example`, `legacy/.env.example`, `legacy/client/.env.example`. `web/.env.example` has 38 variable names, of which 5 key-shaped lines carry a non-empty right-hand side — all placeholder text in an example file, not live values. Names include `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `DAILY_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, seven `STRIPE_PRICE_*` ids, `GEMINI_API_KEY`, Sentry and PostHog keys.
- **Licence posture.** Root `LICENSE` is proprietary: "Proprietary software… © Kaizen Academy LLC" (`README.md` closing line); `web/package.json` declares `UNLICENSED`. `web/THIRD_PARTY_NOTICES.md` is generated and CI-checkable (`npm run notices:check`). `legacy/backend/pyproject.toml` uses floor pins with no lockfile and its Python dependency licences are **unverified** (audit LIC-005, `legacy/README.md`).
- **Large binaries: none.** The largest tracked files are text: `legacy/client/package-lock.json` (336 KB), `web/package-lock.json` (268 KB), `supabase/seed_kc_algebra1.sql` (128 KB), `web/app/admin/page.js` (124 KB). No images or media of consequence; `.git` is 3.3 MB.
- **Residual security notes carried in `legacy/`**: `backend/app/core/config.py` ships a default dev `DATABASE_URL` with local credentials, and `services/handoff/matcher.py` passes a Cal.com API key as a URL query parameter (SEC-007 residual, `legacy/README.md`). Dormant, but present on main.
- **Fork/upstream drift:** not applicable; this repo has a single remote and no upstream.
- **Unmerged newer work.** `origin/claude/strategy-progress-assessment-rb6eju` is the newest code in the repository (2026-09-06) and is not on main. Its findings — the kill switch that existed nowhere, the mastery record with almost no write path, a practice score called mastery — are product-correctness claims that main has not absorbed.
- **Legal gating is real and unfinished:** 26 items in `docs/legal/REVIEW_QUEUE.md`, none reviewed by counsel; item 17 (seat cancellation and refund terms) "is the one that gates taking money" (`docs/README.md`).

## Open questions only the founder can answer

1. Does the 22-commit branch `claude/strategy-progress-assessment-rb6eju` get merged, cherry-picked, or abandoned? It deletes `legacy/`, rewrites the admin console, and is the only home of `docs/AI_STRATEGY.md`.
2. Is Kaizen-AI still a product to ship, or is it now the source archive that `KaizenEdu/docs/MVP-REFERENCE.md` already declares it to be ("It is a source archive. Nothing in it ships")?
3. Should private 1:1 pricing stay in `clubPricing.js` and on `/terms` given the README disowns the product, or be removed with the Terms rewritten?
4. Who pastes `GO_LIVE.sql`, and should its `club_enabled` flip be cut out of the bundle so selling cannot be opened before counsel clears items 10–15?
5. Which of the 26 legal review items are you funding counsel for, in what order? Item 17 gates revenue.
6. Kaizen Certified: escape (A) UL-true audit, (B) Prenda-shaped platform fee, or (C) accept an FDD?
7. Has the SB 243 exposure on the shipped 13+ tutor been addressed, or is the product still live with a persona that discloses AI only "if asked"?
8. Is the Austin venue and the Program Director hire still proceeding, given `RELEASE_PLAN.md` gates on "a signed venue, cleared legal terms and a paying family" rather than code?
