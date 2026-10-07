# Handoff — Kaizen, session ending 2026-07-30

Written for the next agent. Everything below marked **verified** was checked by
running it against the live system, not inferred. Anything I could not verify is
labelled as such. Trust this file over older docs; where it disagrees with
`docs/TECHNICAL_SOURCE_OF_TRUTH.md`, that doc is frozen and wrong (see
`docs/ERRATA.md`).

---

## State right now (all verified)

| | |
|---|---|
| Branch | `main` — clean, 0 uncommitted, everything merged and deployed |
| HEAD | `5ed21a1` |
| Commits this session | 24 |
| Tests | **230 pass, 0 fail** |
| E2E | 5 pass |
| lint / typecheck / build | all PASS by exit code |
| Migrations | 21 files, **all applied to production** |
| Production DB | 57 tables, **RLS on all 57**, 3 storage buckets, 10 auth users |
| Content bank | 8 knowledge components, 32 items |
| Live health | `ai/voice/db/billing/email` all `true` |
| Marketplace | `marketplace_enabled = false` — **deliberately gated** |

Live: <https://kaizenedu.net>

### Founder-confirmed facts (do not re-litigate)
- Legal entity is **Kaizen Academy LLC**.
- Pricing: memberships **Club $45 · Plus $79 · Max $109** per month and the AI
  ladder **AI Solo $11.99 · AI + Hall $24.99** per month. *(Corrected
  2026-08-20. This line used to state the AI Student / Study Circle pair that
  was live on 2026-07-30; the 2026-08-12 repricing retired both and nobody came
  back to re-read this file, so a "do not re-litigate" fact went stale under a
  heading that tells the next reader to trust it. `web/lib/server/clubPricing.js`
  is the only price truth; these figures are copied from it and pinned by
  `web/test/priceTruth.test.mjs`, which now scans this file. The retired pair
  survives in `docs/CLAIMS_MATRIX.md`, correctly marked **RETIRED**.)*
- Trial: the 8-week trial went with that lineup. The machinery is intact but
  dormant — `TRIAL_PLANS = []` in `api/billing/checkout` — so nothing sold
  today carries a trial. Re-enabling one is a founder decision plus a
  CLAIMS_MATRIX row.
- Tutors are **not** third-party background-checked — interviewed and approved by
  staff. Never write otherwise; `web/test/claims.test.mjs` fails the build if you do.
- Payouts wait for Stripe Connect; marketplace stays gated until then.

---

## Done this session

### Production infrastructure (was completely broken)
- **The production database was empty.** No migration had ever run; 8 auth users
  existed with no profile rows, so every authenticated call was failing. Applied
  0001→0021 + seed, verified 57 tables / RLS / buckets.
- **`SUPABASE_SERVICE_ROLE_KEY` in Vercel was stale** — every server route
  returned "Invalid API key". Found in runtime logs, not code. Replaced and verified.
- **Payments live**: real `cs_live_` sessions verified on both plans. Two defects
  caught first — the live price was **one-time, not recurring** (mode:'subscription'
  would have failed on the first customer), and the webhook had **1 of 4 events**
  (cancellations silently dropped).
- **Managed Payments** is on the Stripe account; both checkout paths were being
  rejected while `/api/health` still said `billing:true`. Fixed (see below).
- Env set + validated: `APP_URL`, `CRON_SECRET`, `DAILY_API_KEY`, `EMAIL_FROM`,
  `GEMINI_API_KEY`. Resend domain `kaizenedu.net` verified (DKIM+SPF present).

### Safety (Connect Step 1 + Phase 0.2)
- **The live voice tutor had no crisis guardrails.** Text chat carried
  `STUDENT_SAFETY`; the Realtime voice session did not. A minor disclosing
  self-harm out loud got a lesson. Fixed + `voiceSafety.test.mjs`.
- **Moderation v0** (`lib/server/moderation.js`): deterministic screen on inbound
  chat → `safety_events` + admin alert on critical. DB write path verified live.
  15 tests cover both a MISS and a FLOOD. Runbook: `docs/legal/SAFETY_RUNBOOK.md`.
- **A vetting rejection now empties the calendar** (`lib/server/tutorSafety.js`):
  cancels + refunds every live session/room/seat, emails students, alerts admins.
  Previously it was two column writes and everyone found out when nobody joined.
- **Video room re-checks vetting at join time** — a de-vetted tutor could
  previously still walk into a booked call with a minor.
- **Cron jobs isolated**: four were awaited with no catch, so one Stripe blip
  aborted the tick before `resolveGroupFill` — under-filled rooms never cancelled,
  students never refunded. Now per-job catch + 207.
- **18+ attestation** required at tutor application; gates vetting clearance.
- **SSRF-safe fetcher** (`lib/server/safeFetch.js`), written before the first
  connector needs it. Live-verified: metadata/loopback blocked, `file:` rejected,
  real URL fetches, size cap holds.

### Data correctness
- **`resolve_group_fill()` failed on every call** — declared `integer`, returned
  `bigint`. Proven with a probe. Group sessions would never confirm/cancel/refund.
- **Min-fill counted abandoned checkouts**: two closed tabs could confirm a room.
  Now counts paid seats + holds under 30 min.
- **Content bank: 4 of 8 concepts were unreachable.** `math-equivalent-fractions`
  had ONE item (needs ≥2 to issue a check) and is a prerequisite for three others,
  so `policy.js` held them at `blocked_on_prereqs` forever. Added 10 hand-verified
  items. Also: **all 3 MC items had the answer at index 0** — tapping the first
  option scored 100% on a confirming item type. Reordered.
- **Grant hygiene** (`0019`): all 57 tables granted TRUNCATE/TRIGGER/REFERENCES to
  client roles. Not exploitable (RLS + no PostgREST TRUNCATE verb) but TRUNCATE is
  the one verb RLS does not govern. Root cause fixed: default privileges now start
  **closed**, so a new table is never silently client-writable.
- **`lookupKcId` defaulted a missing subject to `'general'`**, skipping the indexed
  lookup and falling to a 200-row scan — a learner with many courses silently
  recorded no practice evidence.
- **`plan_groups` embedded-resource** read `.owner_id` off a possible array —
  Study Circle plan inheritance (a paid feature) failing quietly.

### Truth & copy (Phase 0.1 — complete)
- `docs/CLAIMS_MATRIX.md` — every public claim → code evidence or disposition.
  Built by hand after the extraction workflow failed (see Known Issues).
- **"Every session is scored"** was false (grading is a button) *and* contradicted
  the engine law that only unassisted delayed evidence confirms mastery. Rewritten.
- **Group sessions had zero legal coverage** while Terms said "private 1:1".
  Now disclosed with facts matched to code (4 students, min 2, 12h refund, 25% share).
- Entity name corrected in 10 places — including one that was **line-wrapped in
  JSX** and survived the first pass; caught by checking the deployed page.
- Free tier now states real limits; school/district solicitation removed (no
  FERPA/DPA posture exists).
- `README`, `.env.example`, `docs/ERRATA.md` corrected.
- **Two CI guards, both verified to actually fail when a bad string is injected**:
  `claims.test.mjs` (banned claims + wrong entity) and `legalMarkers.test.mjs`
  (un-cleared `[ATTORNEY REVIEW]` / `[FOUNDER INPUT REQUIRED]` in `web/app/**`).
- **Analytics `identify()`** sent no `$identify` event, so PostHog saw pre- and
  post-signup as two people — funnels broke at exactly the signup step.
- **Directory gated** with booking, so listing can never advertise a tutor whose
  Book button 503s.

---

## What's left

### P0 — before any public beta

1. **`/api/practice` ships answer keys to the browser and self-marks.**
   `verified_by:'self'`. A student can read the key from the network payload.
   The engine correctly refuses to let self-marked evidence confirm mastery, so
   this is an integrity hole, not a mastery hole — but it is the plan's Phase 1.3
   item and the most clearly wrong thing still shipping. Fix: server-side verify
   via `lib/engine/verify/*`, stop returning `answer_spec`.

2. **Landing still says "Request a human tutor"** while `marketplace_enabled=false`.
   Decide *with the founder*: flip the gate (needs Connect payouts) or soften the
   copy. Tracked as the top open item in `CLAIMS_MATRIX.md`.

3. **Content bank is 8 middle-school math concepts.** A high-schooler paying
   for any AI tier hits `noBank` on everything they actually take. This is the
   real gate on charging a high-school student and the largest remaining piece
   of work (2–4 weeks). Decision already made: **local Postgres is the item store; the
   LLM is an authoring-time tool, not a serving dependency.** Floors derived from
   enforcing code: **≥2 items to issue a check, ≥2 context tags to be confirmable,
   6 items / ≥2 tags / ≥3 per tag to ship.**

### P1 — Connect payouts (Steps 2–8 of the design)

Full plan: `/private/tmp/.../tasks/w78nvgryr.output` may be gone; the design is
summarized in commit `5fee8b2` and the step list below.
- Step 1 **DONE** (safety, shipped).
- Step 2: `0022_ledger_integrity` — `kind`/`adjusts_earning_id`, `reversed_cents`,
  `disputed_at`, immutable `amount_cents`, PI+charge stamped **at accrual**.
- Step 3: `payouts.js` accrual, per-seat group accrual, missing-accrual sweep,
  webhook idempotency, `refunds.js`.
- Step 4: Connect plumbing dark — `connect.js`, `/api/tutor/payouts`,
  return/refresh **pages** (not API routes), Connect webhook.
- Step 5: `runTransfer`, `settlePendingTransfers`, fail-closed booking gate.
- Step 6: tutor payout UI (5 states).
- Step 7: **already done** (group terms disclosed).
- Step 8: rollout + flip `marketplace_enabled`.

Three structural rules from the design, do not lose them:
- ledger row carries its Stripe charge handle **from accrual**, not from transfer;
- `payout_method` is a settlement **fact**, never a routing intent (routing is
  read from `tutors.payout_mode` at settlement time);
- `amount_cents` is **immutable**; `reversed_cents` is the only record of money
  returning. Payable = `amount − reversed`.

### P2 — Phase 0.2 remainder
- `web/scripts/audit-env.mjs` — required envs present, health exposes no secrets.
- **Authenticated smoke tests** — signup → intake → planner. E2E currently covers
  unauthenticated pages only; **RLS has never been exercised at runtime**, only
  asserted from policy definitions.
- Inline prompts → `lib/prompts.js` (2 files: `tutoring/group/brief`,
  `reports/weekly`).

### P3 — Phase 1 beta surfaces
Student Daily Care home (`lib/engine/studyPlan.js`, top-3 actions), Parent Home v1
(`/parent`, `/api/family/summary` as the sole read seam), weekly digest cron,
`0022` intake provenance (`user_corrected` must never be overwritten by AI).

---

## Known issues / traps

- **DEFERRED: `cloud.js` sync has no conflict guard.** Row-level last-write-wins;
  a stale device can clobber newer server data (`app_meta` blob; the documented
  mid-session grade-drop bug class). I did **not** fix it — it needs client-refetch
  orchestration that cannot be runtime-verified in this environment, and it touches
  live student data. Treat as the highest-risk untouched item.
- **Voice sessions are not screened** by moderation v0 (chat only). Tracked in the
  runbook.
- **Moderation v0 is pattern-based** — misses euphemism. Do not describe sessions
  as "monitored" until a staffed window exists.
- **Prompt caching is unverified.** SDK is `@anthropic-ai/sdk@0.32.1` (current is
  0.115.x) and predates `cache_control` in its types. It is guarded — on rejection
  it retries uncached and disables process-wide — so it cannot take the tutor down,
  but the ~47% saving is unproven.
- **No DMARC** on `kaizenedu.net`. DKIM+SPF are present. Add before bulk email.
- **Upstash not set** → rate limits are per-instance, so the effective cap is
  looser than intended on serverless.
- **Sentry not set** → no production error visibility.
- **Two agent workflows failed** this session (claims matrix: agent stalled, 855k
  tokens, nothing salvageable; an earlier adversarial review: all 4 agents stalled).
  Both times the fallback was hand verification, which worked. Do not assume a
  workflow result exists — check `journal.jsonl` before relying on one.
- **Stripe tax codes are my best-fit reading**, not an accountant's:
  `txcd_10103000` (SaaS) on subscriptions, `txcd_20060059` (Tutoring) on drop-ins,
  with Managed Payments **disabled per-request** on the drop-in path because every
  honest live-instruction tax code is ineligible for it. Confirm before real volume.

## Secrets hygiene

A Supabase PAT and the live Stripe secret key were pasted into this session's
chat. **Both should be rotated.** Working credentials are in the session
scratchpad (`chmod 600`, outside the repo) and were never printed or committed.

## Open founder decisions

1. Brand: resolved 2026-08-13 — unified to "Kaizen" everywhere (package name,
   email subjects, tutoring UI); the entity remains Kaizen Academy LLC.
2. Governing-law state for Terms (`[FOUNDER INPUT REQUIRED]`, `docs/legal/REVIEW_QUEUE.md`).
3. Counsel review of the whole `REVIEW_QUEUE.md` before the marketplace opens.
4. Insurance before live minor-facing tutoring at scale.

## Where to look

| | |
|---|---|
| Truth ledger | `docs/CLAIMS_MATRIX.md` |
| Frozen-doc corrections | `docs/ERRATA.md` |
| Counsel queue | `docs/legal/REVIEW_QUEUE.md` |
| Safety ops | `docs/legal/SAFETY_RUNBOOK.md` |
| Readiness history | `docs/PRODUCTION_READINESS.md` |
| Engine law | `docs/ENGINE.md` |

## Working rules that earned their keep

- **Judge gates by exit code, never by grepping output.** `next build` prints
  "✓ Compiled successfully" and *then* fails; grep reported a pass that wasn't one.
- **Verify against the deployed artifact.** The line-wrapped entity name passed a
  source grep and was still live on the page.
- **A guard you haven't seen fail is not a guard.** Every CI guard here was tested
  by injecting the bad string.
- **Don't trust a stale doc over the database.** The frozen source-of-truth was
  wrong about background checks, entity, and migration count.
