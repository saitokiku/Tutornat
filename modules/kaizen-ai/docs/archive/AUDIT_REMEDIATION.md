# Kaizen — Audit Remediation Log

> Companion to [`AUDIT_FINDINGS.md`](AUDIT_FINDINGS.md) (audit date 2026-07-22, **38 findings** —
> the audit's own summary table originally miscounted them as 37; corrected there).
> This log records what was done about **every** finding, in the same order, with file
> references. Statuses are honest: code that changed says *Fixed*; dormant code moved to
> `legacy/` says *Archived*; things only a human can do (set an env var, retain counsel,
> collect a W-9) say *Operational* or *Attorney* — they are **not** claimed as fixed.
>
> Remediation branch: `claude/demo-syllabus-exam-content-iufxth`. Verification for this
> wave: `npm test` (45 passing unit tests), `npm audit --omit=dev` (0 vulnerabilities),
> full `next build`, and a production-server smoke test of every public page (all 200,
> 404 handling intact), plus an adversarial multi-agent review of the whole diff.

## Status legend

| Status | Meaning |
|---|---|
| **Fixed** | Code/config change in this repo closes the finding. |
| **Fixed (partial)** | The tractable part is fixed; the remainder is explicitly deferred with rationale. |
| **Archived** | Dormant-stack finding; the stack moved to `legacy/` with the issue documented in `legacy/README.md` (and cheap in-place hardening applied where noted). |
| **Operational** | Requires a human/runtime action (env var, dashboard setting, process). The code side is ready. |
| **Attorney** | Requires counsel; no code change can close it. |

## Remediation table

| ID | Sev | Status | What was done | Where |
|----|-----|--------|---------------|-------|
| SEC-001 | Blocker | **Fixed** | Upgraded the live app off the vulnerable framework line: `next` 14.2.15 → **16.2.11**, `react`/`react-dom` 18.3.1 → **19.2.8**. `npm audit --omit=dev` now reports **0 vulnerabilities**; production build + page smoke tests green. | `web/package.json`, `web/package-lock.json` |
| LIC-001 | Blocker | **Fixed** (code) + **Attorney** (papers) | Added a proprietary `LICENSE` at the repo root; `"license": "UNLICENSED"` + `"private": true` declared in every package manifest (live + archived). IP-assignment/CLA paperwork must be executed outside the repo — flagged, not claimed. | `LICENSE`, `web/package.json`, `legacy/*/package.json` |
| REL-001 | High | **Fixed** | Webhook fulfillment now refuses to resurrect a cancelled session: on `checkout.session.completed` for a session with `status === 'cancelled'`, it issues a Stripe refund, records `refund_status`, writes a `tutoring.late_payment_refunded` audit event, and throws on refund failure so Stripe retries. `releaseAbandoned` also calls `stripe.checkout.sessions.expire()` so the stale payment link dies with the hold. | `web/app/api/billing/webhook/route.js`, `web/lib/server/maintenance.js` |
| SHIP-001 | High | **Fixed** | Test suite + CI from zero: 45 `node:test` unit tests over the pure engines (grades, math-expression compiler, intake merge, speech normalizer, session state machine, email escaping, formatters) with an `@/` alias loader; `npm test` script; GitHub Actions workflow runs `npm ci` → `npm test` → `npm run build` on every push/PR with no secrets required. | `web/test/*.test.mjs`, `web/scripts/test-loader.mjs`, `web/scripts/test-register.mjs`, `.github/workflows/ci.yml` |
| SHIP-002 | High | **Fixed** | Dormant stacks (`backend/`, `frontend/`, `client/`, `n8n/`, `docker-compose.yml`) moved wholesale to `legacy/` with a README documenting what each is, why it's dormant, and its known unfixed issues. Root `README.md` rewritten around `web/` as the product. | `legacy/`, `legacy/README.md`, `README.md` |
| SEC-002 | High | **Fixed** | Rate limiting is now distributed: Upstash Redis REST pipeline (`INCR` + `PEXPIRE NX`) when `UPSTASH_REDIS_REST_URL/TOKEN` are set, with the old in-memory map as explicit fallback and a one-time production warning when unconfigured. `checkRate`/`rateLimitResponse` became async; all 18 route call sites await them. | `web/lib/server/ratelimit.js`, `web/app/api/**/route.js` |
| SEC-003 | High | **Fixed** | `esc()` HTML-escape helper exported from the email lib and applied to **every** user-controlled interpolation in email bodies and server-rendered HTML (tutoring emails rewritten; applications, admin tutors, recap, guardian-consent pages). Subjects stay raw text (never rendered as HTML). | `web/lib/server/email.js`, `web/lib/server/tutoringEmails.js`, `web/app/api/tutoring/applications/route.js`, `web/app/api/admin/tutors/route.js`, `web/app/api/tutoring/recap/route.js`, `web/app/api/family/guardian-consent/route.js` |
| REL-002 | Medium | **Fixed** | Real state machine: `TRANSITIONS` map with terminal states, `canTransition()` enforced in PATCH (409 on illegal moves — a `completed` session can never become `cancelled`), and `refundEligible()` limits refunds to sessions that haven't happened (tutor-cancel always; student-cancel ≥24 h before start). Unit-tested. | `web/lib/server/sessionStates.js`, `web/app/api/tutoring/sessions/route.js`, `web/test/sessionStates.test.mjs` |
| REL-003 | Medium | **Fixed** | Free-intro race closed at the database: partial unique index `tutoring_sessions_one_intro_idx` on `(student_id) WHERE intro_free`, plus an insert-retry in the booking route that falls back to a paid session when the index rejects a concurrent duplicate. | `supabase/migrations/0009_hardening.sql`, `web/app/api/tutoring/sessions/route.js` |
| REL-004 | Medium | **Fixed** | Homework sync no longer prunes: `pushHomework` upserts only, and deletion happens through an explicit `deleteHomeworkItem()` called from the dashboard delete action — same pattern already used for documents. A stale device can no longer erase another device's assignments. | `web/lib/cloud.js`, `web/app/dashboard/page.js` |
| REL-005 | Medium | **Fixed** (code) + **Operational** (env) | Real cron: `/api/cron/maintenance` (Bearer `CRON_SECRET`, fail-closed) runs abandoned-hold release, T-24 h reminders for **all** users, and transcript retention purge; `vercel.json` schedules it hourly. Lazy in-request path slimmed to hold release only. Operator must set `CRON_SECRET` in Vercel. | `web/app/api/cron/maintenance/route.js`, `web/lib/server/maintenance.js`, `web/vercel.json` |
| SEC-004 | Medium | **Fixed** | Sanitizer stack patched via the framework upgrade plus `react-syntax-highlighter` → 16.1.1 and npm `overrides` (`sharp`, `postcss`); dompurify/prismjs advisories cleared — audit is clean. Mermaid keeps `securityLevel: 'strict'`. | `web/package.json` |
| SEC-005 | Medium | **Fixed** | Trial redemptions recorded in `trial_redemptions` keyed by SHA-256 of the lowercased email, **no FK** — the row survives account deletion, so delete-and-resignup no longer mints a fresh 90-day trial. Checkout consults `trialAvailable()`; disclosure added to the privacy page. | `supabase/migrations/0009_hardening.sql`, `web/lib/server/trial.js`, `web/app/api/billing/checkout/route.js`, `web/app/privacy/page.js` |
| SEC-006 | Medium | **Fixed** | STT now enforces a plan cap: `checkEntitlement(caller, 'stt_seconds', …)` before transcription, `stt_seconds` rows added to `DEFAULT_LIMITS` and `seed.sql` for every plan. | `web/app/api/voice/transcribe/route.js`, `web/lib/server/context.js`, `supabase/seed.sql` |
| SEC-007 | Medium (dormant) | **Archived** + in-place hardening | Stack archived to `legacy/backend/`. Cheap hardening applied even in the archive: `SECRET_KEY` no longer has a default (fails fast). The missing RBAC on scaffold admin endpoints and the key-in-query-param pattern are documented as known-unfixed in `legacy/README.md` — do not deploy the scaffold. | `legacy/backend/app/core/config.py`, `legacy/README.md` |
| SEC-008 | Medium | **Fixed** + Archived | Compose file now requires `N8N_PASSWORD` via `${N8N_PASSWORD:?}` (no `changeme` default); the stale root `.env.example` with placeholder secrets was replaced (see SHIP-003). Stack archived. | `legacy/docker-compose.yml`, `.env.example` |
| SHIP-003 | Medium | **Fixed** | Root `.env.example` replaced with a short pointer to `web/.env.example` (the only real configuration surface). The abandoned price points and dormant-stack keys are gone (old file preserved at `legacy/.env.example`). | `.env.example`, `legacy/.env.example` |
| SHIP-004 | Medium (dormant) | **Archived** + fixed in place | Invalid `build-backend` corrected to `setuptools.build_meta` so the archived scaffold is at least honest; `railway.toml` no longer presents it as deployable (archived out of the deploy path). | `legacy/backend/pyproject.toml`, `legacy/README.md` |
| SHIP-005 | Medium (dormant) | **Archived** | The four n8n workflows that call nonexistent endpoints are archived under `legacy/n8n/` and documented as non-functional in `legacy/README.md`. Live scheduled work now runs through the real cron endpoint (REL-005) instead. | `legacy/n8n/`, `legacy/README.md` |
| SHIP-006 | Medium | **Fixed (partial** — tooling**)** + **Operational** | Manual payouts are now auditable: `/api/admin/earnings` ledger (per-tutor accrued/paid, unpaid line items), CSV export for bookkeeping/1099 prep, and an audited mark-paid action; admin UI warns to collect a **W-9 before first payout**. Stripe Connect Express remains the endgame and is deferred until tutor count justifies it — exactly the finding's own suggested sequencing. | `web/app/api/admin/earnings/route.js`, `web/app/admin/page.js` |
| SHIP-007 | Medium (dormant) | **Archived** | Stub/mock “self-improvement loop” and handoff matcher archived; `legacy/README.md` repeats the do-not-claim marketing warning from the audit. | `legacy/README.md` |
| SHIP-008 | Medium | **Fixed** | `plus` removed from `PAID_PLANS` and `PRICE_BY_PLAN` (cannot be purchased even if its env var exists); admin grant-plan dropdown updated; the `family` ↔ “Study Circle” naming mapping is now commented at the source of truth. | `web/lib/server/stripe.js`, `web/app/api/admin/grant-plan/route.js`, `web/app/admin/page.js` |
| REL-006 | Medium | **Fixed (partial)** + **Operational** | `sendEmail` failures are no longer invisible: send errors are caught, logged server-side (status + mail kind + recipient **domain only**), and returned as `{ sent: false, error }`. The empty-catch best-effort pattern elsewhere stands (intentional). Operator action: set `NEXT_PUBLIC_SENTRY_DSN` in production. | `web/lib/server/email.js` |
| REL-007 | Low | **Fixed** | Explicit timeouts on every outbound server fetch: `AbortSignal.timeout()` on voice TTS (30 s), transcription (45 s), realtime token (15 s), Daily.co (15 s), image (45 s), Resend (15 s); all 8 Anthropic clients constructed with `{ timeout: 55_000, maxRetries: 1 }` to fit inside the 60 s function budget. | `web/app/api/voice/*`, `web/app/api/image/route.js`, `web/lib/server/daily.js`, `web/lib/server/email.js`, all Anthropic call sites |
| REL-008 | Low | **Fixed** | Admin kill-switch section now states switches “apply within ~1 minute” (the 60 s per-instance settings cache), so incident response isn't surprised. | `web/app/admin/page.js` |
| DATA-001 | Medium | **Fixed** (code) + **Attorney** (wording) | Retention is now a schedule, not a promise: tutoring transcripts and voice-session records older than **24 months** (`TRANSCRIPT_RETENTION_MONTHS`, default 24) are purged by the hourly cron; full written schedule in `docs/compliance/RETENTION.md`; privacy page updated with the concrete windows. Counsel should bless the final wording. | `web/lib/server/maintenance.js`, `docs/compliance/RETENTION.md`, `web/app/privacy/page.js` |
| DATA-002 | Low | **Fixed** | Deletion-surviving records (`audit_logs`, `safety_events`, hashed trial redemptions) are enumerated in the retention schedule with their rationale, and disclosed on the privacy page. Consistent by design, now documented for the record. | `docs/compliance/RETENTION.md`, `web/app/privacy/page.js` |
| DATA-003 | Low | **Fixed** | Analytics `identify()` now keys events to `h_<sha256(userId)[0:32]>` instead of the raw Supabase user id; opt-out behavior unchanged. | `web/lib/analytics.js` |
| LIC-002 | Low | **Fixed** | jszip's `MIT OR GPL-3.0-or-later` dual license: **MIT election** stated in both the generated notices file and the public licenses page. | `web/THIRD_PARTY_NOTICES.md`, `web/app/licenses/page.js` |
| LIC-003 | Low | **Fixed** (verified) | khroma verified: the package ships an MIT license **file** while omitting the `license` field; the notices generator reads shipped license files for exactly this case, so the inventory shows 0 UNKNOWN licenses. | `web/scripts/generate-notices.mjs`, `web/THIRD_PARTY_NOTICES.md` |
| LIC-004 | Low | **Fixed** | Attribution obligations met: `scripts/generate-notices.mjs` generates `THIRD_PARTY_NOTICES.md` (every installed package + full texts for direct deps; `npm run notices` to regenerate), and a public `/licenses` page is linked from both site footers. Note: the Next 16 upgrade (SEC-001) pulled in sharp's prebuilt libvips binaries (`@img/sharp-libvips`, **LGPL-3.0**) — used server-side, unmodified, never shipped to browsers; disclosed on the licenses page rather than claiming "no copyleft". | `web/scripts/generate-notices.mjs`, `web/THIRD_PARTY_NOTICES.md`, `web/app/licenses/page.js`, `web/app/page.js`, `web/components/MarketingShell.js` |
| LIC-005 | Low (dormant) | **Archived** | Backend Python dependency set remains unresolved/unverified — documented as a known limitation of the archived stack in `legacy/README.md`. Only matters if the scaffold ever revives; run `pip-licenses` in a resolved venv first if it does. | `legacy/README.md` |
| LIC-006 | Low | **Fixed** | Fraunces and Plus Jakarta Sans recorded as SIL OFL (via Google Fonts, self-hosted at build) on the licenses page and in the notices flow. | `web/app/licenses/page.js` |
| LIC-007 | Low | **Attorney** | AP®/College Board trademark usage in demo materials is a counsel question; no code change can close it. Demo materials untouched by this wave. | `demo-materials/` (unchanged) |
| MAINT-001 | Medium | **Fixed (partial)** | The biggest god-file split: the entire voice loop (TTS, VAD listening, interruption, cleanup) extracted from `StudySession.js` (700 → 499 lines) into a reusable `useVoiceChat` hook. Dashboard sync-engine extraction deferred: it's load-bearing, state-entangled, and the audit's own risk rationale (change risk concentrates where the product lives) argues against refactoring it without a UI test harness — revisit after component tests exist. | `web/lib/useVoiceChat.js`, `web/components/StudySession.js` |
| MAINT-002 | Low | **Fixed** | Shared `lib/format.js` (`money`, `when`); duplicate helpers in `TutorBooking` and the tutor dashboard now delegate to it. The email module keeps a private formatter deliberately (server-side locale differs from client display). | `web/lib/format.js`, `web/components/TutorBooking.js`, `web/app/tutor/page.js` |
| MAINT-003 | Low | **Fixed** | Dead config removed: `CALCOM_LINK` gone from env template, handoff API returns `schedulingLink: null` (Cal.com retired); dead backend deps left the live tree with the archive. | `web/.env.example`, `web/app/api/handoff/route.js` |
| MAINT-004 | Low | **Fixed** | Reproducibility enforced where it matters: CI installs with `npm ci` against the committed lockfile (validated in this wave); security-sensitive floors pinned via npm `overrides` (`sharp`, `postcss`). Caret ranges retained intentionally — the lockfile, not manifest pins, is the reproducibility mechanism. | `.github/workflows/ci.yml`, `web/package.json` |

## Score

| Status | Count | IDs |
|---|---|---|
| Fixed outright | 28 | SEC-001, SEC-002, SEC-003, SEC-004, SEC-005, SEC-006, SEC-008, SHIP-001, SHIP-002, SHIP-003, SHIP-004, SHIP-008, REL-001, REL-002, REL-003, REL-004, REL-005, REL-007, REL-008, DATA-002, DATA-003, LIC-002, LIC-003, LIC-004, LIC-006, MAINT-002, MAINT-003, MAINT-004 |
| Fixed with a residual human step | 5 | LIC-001 (IP papers), REL-006 (set Sentry DSN), DATA-001 (counsel blesses wording), SHIP-006 (W-9 process; Connect later), MAINT-001 (dashboard split deferred) |
| Archived with documentation | 4 | SEC-007, SHIP-005, SHIP-007, LIC-005 |
| Attorney only | 1 | LIC-007 |

Every one of the 38 findings has a disposition above (28 + 5 + 4 + 1 = 38). Nothing was
silently dropped.

## Residual operator checklist (the honest leftovers)

1. Set `CRON_SECRET` in Vercel and confirm the hourly cron fires (REL-005).
2. Set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for distributed rate limiting (SEC-002 — falls back to per-instance limits until then).
3. Set `NEXT_PUBLIC_SENTRY_DSN` in production so best-effort failures surface (REL-006).
4. Run migration `0009_hardening.sql` in Supabase before deploying this wave (REL-003, SEC-005 depend on it; the code fails safe pre-migration).
5. Collect a W-9 before any tutor's first payout; export the earnings CSV for bookkeeping (SHIP-006).
6. Counsel: IP assignment papers (LIC-001), retention-policy wording (DATA-001), AP® trademark usage (LIC-007).
7. Verify hosting-side log/backup retention windows flagged NEEDS VERIFICATION in `docs/compliance/RETENTION.md`.
