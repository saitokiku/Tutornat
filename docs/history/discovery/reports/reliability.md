# Role D — reliability, security, privacy, and cost review

> **Coordinator update after checking newer work:** this report's source findings are pinned to the commits below. KaizenEdu main subsequently reached `c73a0e168686525cc6318ff6a575e3fb1ad65c60`; its CI, invariants and storage-contract workflows now report success. The old E2E failure is historical, not current-main status. A newer repository decision document says deployed tutor routes were overridden from Gemini to OpenAI; live deployment configuration was not independently inspected. The provider finding therefore concerns the pinned defaults and absent enforceable eligibility controls, not a verified claim that production currently sends children to Gemini. See [parent delta/CI evidence](../evidence/parent-branch-delta.json) and [final synthesis](../FINDINGS.md). The coordinator also parsed the local test logs and confirmed the runner totals below without rerunning application tests.

**Review date:** 2026-09-30  
**Decision:** **Do not release a child-facing production service from these snapshots yet.** KaizenEdu has strong tenant-scoped route patterns and meaningful PostgreSQL contract coverage, but its guest-child path conflicts with its published under-13 posture and the default Gemini provider terms; its promised deletion worker and global spend alarm are not wired. Kaizen-AI has broad test coverage and several good controls, but account export/deletion can report success after partial failure and its cost governor fails open. Trellis is a useful single-learner proof of concept, not an internet-safe multi-user service. Tutornat has no executable product at the reviewed commit.

This is an engineering risk review, **not a compliance certification or legal opinion**.

## 1. Scope and evidence standard

| Repository | Exact reviewed commit | Tracked files in exact-commit archive | Product state relevant to Role D |
|---|---:|---:|---|
| KaizenEdu | `cd3dfa82fe09dd66b1fb7e78af9375aef5fcecc3` | 3,461 | Full tutor/product surface; guest mode, auth, storage/evidence, voice, cost controls |
| Kaizen-AI | `91af9e452c7df5867afa7249a6dc58b00003f531` | 598 | Full web app; Supabase, Stripe, Anthropic, minors controls, exports/deletion |
| Tutornat | `1c2f4925215e9fb0a27ab76863ca88de931bc5d3` | 1 | README only; no executable boundary to assess |
| trellis | `41999b5dd49e5549662da8c5b42c0bb8bbe8804a` | 517 | One synthetic learner/lesson plus the E2 evidence seam |

The source snapshots remained clean and were not executed. Testable files were exported with `git archive` into `/Users/man/education-product-discovery/execution/reliability/repos`. Source and archive counts matched exactly. No package install, lifecycle install, migration, server, database, container, paid provider request, production call, or real credential was used.

Evidence labels used below:

- **Confirmed code defect:** deterministic behavior visible in source, or a reproduced test failure whose cause was isolated.
- **Setup blocker:** the attempted check stopped before the relevant assertion because a required local dependency/tool/service was absent.
- **Static source observation:** meaningful risk/control visible in source but not exercised end to end.
- **Untested claim:** cannot be established without a disposable database/service, provider contract/configuration, load test, or legal review.

## 2. Isolation and test results

### Isolation was verified before repository code ran

- Hermes Seatbelt verifier from the required scratch workdir: **11/11 correct, 0 leaks, exit 0**.
- Custom Role D profile added `(deny network*)`.
- Actual outbound `connect()` probe: **blocked with `EPERM` (`connect_errno=1`), exit 0**.
- The earlier aggregate probe exited 1 only because *socket creation* was permitted. Its individual results show: inside-workspace write allowed; outside-workspace write blocked; Hermes credential-file read blocked; pinned Node allowed; no outside-write leak. Socket creation is not a network connection; the separate `connect()` probe resolved the ambiguity.

Evidence: [`sandbox-verifier-workdir-scratch.log`](../evidence/reliability/logs/sandbox-verifier-workdir-scratch.log), [`network-write-secret-isolation.log`](../evidence/reliability/logs/network-write-secret-isolation.log), [`network-connect-isolation.log`](../evidence/reliability/logs/network-connect-isolation.log).

### Machine-counted local results

Counts below are generated from full preserved logs by [`extract_test_counts.py`](../evidence/reliability/extract_test_counts.py), with output in [`test-counts.json`](../evidence/reliability/test-counts.json). Runs overlap; do not add them together.

| Repo / run | Selected | Pass | Fail | Interpretation |
|---|---:|---:|---:|---|
| Kaizen-AI full native `test/*.test.mjs` | 435 | 416 | 19 | All 19 failures were test-file import failures: 16 missing `@supabase/supabase-js`, 3 missing `stripe`. This is a setup blocker, not 19 product defects. |
| Kaizen-AI selected Role D subset | 60 | 60 | 0 | Native tests covering deletion/seat races, safe fetch, moderation, voice safety, legal markers, session loop, schema drift, trial, claims, notices. |
| Kaizen-AI engine policy | 31 | 31 | 0 | Native policy tests; may overlap the full glob. |
| Trellis native bindings | 4 | 4 | 0 | Pure binding/shape checks passed. |
| Trellis helper suite | 4 | 2 | 2 | Both failures stopped on missing offline `pg@8.23.0`; the two path/gate assertions passed. |
| Trellis head engine runner | 0 discovered | — | — | Stopped before cases because offline TypeScript + `@types/node` were absent. |
| KaizenEdu default `npm test` | 0 discovered | — | — | `vitest` executable absent; exit 127 before discovery. |
| Tutornat | 0 | — | — | Exact archive contains one README and no test script. |

Full logs: [`kaizen-ai-node-test-full.log`](../evidence/reliability/logs/kaizen-ai-node-test-full.log), [`kaizen-ai-role-d-native-subset.log`](../evidence/reliability/logs/kaizen-ai-role-d-native-subset.log), [`kaizen-ai-engine-policy.log`](../evidence/reliability/logs/kaizen-ai-engine-policy.log), [`trellis-native-bindings.log`](../evidence/reliability/logs/trellis-native-bindings.log), [`trellis-native-helpers.log`](../evidence/reliability/logs/trellis-native-helpers.log), [`trellis-engine-head.log`](../evidence/reliability/logs/trellis-engine-head.log), [`kaizenedu-npm-test-sandboxed.log`](../evidence/reliability/logs/kaizenedu-npm-test-sandboxed.log).

### Commit-matched CI — supporting evidence only

CI ran outside this sandbox and is **not direct product proof**.

- **KaizenEdu:** three runs at the exact commit: two successes and one failure.
  - Invariants: **67/67 tests passed** across 10 files.
  - PostgreSQL 16 storage contract: **1,126 passed, 6 skipped** across 32 files, followed by a separate **1/1 passed** invocation.
  - E2E: **29 passed, 1 failed of 30**. The same test failed initially and on two retries before its product assertion because `page.evaluate` lost its execution context during navigation. This establishes an unstable E2E/boot seam, not a thumbnail product defect. Run: [36710581815](https://github.com/saitokiku/KaizenEdu/actions/runs/36710581815).
- **Kaizen-AI:** one successful CI run at the exact commit: **809/809 native tests passed**; Playwright selected 12, with **11 passed and 1 skipped**; build job succeeded. Run: [33818335434](https://github.com/saitokiku/Kaizen-AI/actions/runs/33818335434).
- **Tutornat / trellis:** no CI runs matched the exact commits.

Preserved CI logs and metadata are under [`evidence/reliability/ci`](../evidence/reliability/ci/).

## 3. Confirmed code defects

### D1 — KaizenEdu promises 30-day deletion, but the deletion worker has no caller

**Severity: release-blocking for account-based collection. Confidence: high.**

- `lib/tutor/accounts/deletion.ts:192-197` explicitly says: “No scheduler is wired here; the integrator adds the cron route that calls it.”
- A machine scan of non-test TypeScript/TSX found only the `runDeletionJob` definition and no invocation ([`static-source-counts.json`](../evidence/reliability/static-source-counts.json)).
- `components/tutor/marketing/legal/privacy.tsx:254-257` says requested data “is erased after 30 days.”
- Filing a request does freeze profiles and revoke other sessions immediately (`deletion.ts:121-134`), which is useful, but without a caller the destructive half never runs.

**Required before release:** add an authenticated/secret-protected scheduled route, idempotent job monitoring, retry/dead-letter visibility, and an alert on overdue requests; then test with a disposable PostgreSQL database that account-, learner-, evidence-, flag-, and session-scoped rows are actually removed and retained billing rows are de-identified as documented.

### D2 — KaizenEdu’s documented global spend alarm is defined but never enforced

**Severity: release-blocking for public guest mode. Confidence: high.**

- A machine scan found only the `checkGlobalSpend` definition in `lib/tutor/guards/spend-alarm.ts:167`; no production caller exists.
- `docs/GUEST-MODE.md:47-50` states that the global spend alarm and kill switch are unchanged and continue to bind.
- Per-principal soft rate limits are intentionally per-instance (`lib/tutor/guards/rate-limit.ts:5-11`), while database-backed daily hop caps are shared. Guests can mint new identities via `/api/tutor/guest`; the creation limiter is also in-memory and keyed to a forwarded address (`app/(learner)/api/tutor/guest/route.ts:43-47,85-100`).

Session and daily caps limit one identity, but they do not create an operator-wide dollar ceiling. Public anonymous traffic can distribute across addresses, instances, and identities.

**Required before release:** invoke the global check before every paid provider hop, make the state durable/atomic, fail closed or degrade to scripted/free behavior when it cannot be read, and alert on warning/kill thresholds. Load-test identity minting and concurrent provider calls.

### D3 — KaizenEdu ASR cost accounting trusts a client-supplied duration

**Severity: high cost-control defect. Confidence: high.**

`app/(learner)/api/tutor/asr/route.ts:91-93` accepts any finite positive `durationMs` and only applies an upper clamp. Lines 128-145 price and gate the request from that value; lines 147-157 send the full audio blob to the provider. A caller can submit a large clip with `durationMs=1`, causing near-zero cost to be checked and recorded while the provider processes the whole clip.

The 8 MiB request cap and daily hop-count cap bound individual requests/count, but not the billed audio duration. No audio-container-derived duration or minimum duration-to-bytes consistency check is used.

**Required before release:** derive chargeable duration server-side from a bounded decode/container parser or bill the conservative maximum of declared duration, decoded duration, and a byte-rate floor. Add adversarial tests for tiny declared duration + large clip, malformed containers, parallel requests, and ledger-write failure.

### D4 — Kaizen-AI account deletion can return success after files remain or billing cancellation fails

**Severity: release-blocking privacy/billing defect. Confidence: high.**

`web/app/api/account/delete/route.js` advertises “full account + data deletion,” but:

- `purgeStorage` swallows every bucket/list/remove exception (`:22-39`) and does not inspect returned storage errors.
- Storage listing is capped at 1,000 entries at each of only two levels, with no pagination.
- Stripe cancellation exceptions are swallowed as “already gone” (`:116-123`), conflating a provider outage/permission error with a missing subscription.
- The route can then delete the auth user and return `{ok:true}` (`:126-142`).

This can strand files and, more seriously, remove the user record while an active subscription remains billable.

**Required before release:** use a durable deletion workflow/state machine. Record each external cleanup step; distinguish not-found from provider failure; retry idempotently; do not claim completion until storage and subscription states are verified; preserve an operator recovery handle until billing is confirmed stopped.

### D5 — Kaizen-AI’s “complete” export silently converts database errors to empty data

**Severity: release-blocking privacy/access defect. Confidence: high.**

`web/app/api/account/export/route.js:49-52` defines every general table read as `(await query).data || []`, discarding `.error`. Profile, tutor, tutor-session, earnings, knowledge-component, and standards reads also consume `.data` without consistently rejecting query failures (`:53-90,112-151`). The route can audit and return a successful download with omitted categories.

This directly contradicts the route’s “complete server-side data” comment (`:1-12`) and the settings UI’s “everything Kaizen stores about you” claim (`web/app/settings/page.js:255-258`). The evidence reader is better: it returns explicit not-provisioned/unavailable/truncated states, but the surrounding export does not.

**Required before release:** collect `{data,error}` for every category, fail the export atomically on unexpected errors, or emit a prominent machine-readable incomplete manifest naming each unavailable category. Test permission denial, timeout, missing migration, pagination, and >50,000 evidence rows.

### D6 — Kaizen-AI’s cost governor is fail-open and its advertised model downgrade does not downgrade the request

**Severity: high cost-control defect. Confidence: high.**

- `web/lib/engine/budget.js:173-193` returns zero spend whenever a budget read throws; normal Supabase query errors are returned in `.error` and are not checked, so missing schema/permission failures also look like zero spend.
- Accrual is explicitly best-effort and swallows failures (`:196-207`).
- `web/lib/server/aiCall.js:137-148` also ignores usage-ledger and budget-accrual rejection. Provider spend can therefore occur without advancing the guard.
- When the frontier-call cap is reached, `meteredCall` changes only `effectiveTier`; the provider request still sends the original `model` (`aiCall.js:83-103`) and then accrues the cheaper tier (`:147`). The comment says the caller “silently drops to the cheaper tier,” but no cheaper model is selected.
- Guard then accrue is not an atomic reservation, so concurrent calls can all pass from the same old balance.

**Required before release:** reserve estimated cost/frontier capacity atomically before the provider call, reconcile against reported usage, fail closed or degrade deterministically if budget state is unavailable, and map `downgradeTo` through `pickModel` before sending. Alert on reconciliation and ledger failures.

### D7 — Trellis is an unauthenticated shared-singleton API if deployed to a network

**Severity: release-blocking for any public/multi-user deployment; acceptable only as a clearly isolated demo. Confidence: high.**

- `web/app/api/turn/route.ts` performs no authentication, authorization, CSRF/origin, or rate-limit check.
- All requests read/write the hard-coded learner `ada`, household `home`, and one skill (`web/lib/lesson.ts:1-8`).
- Caller-chosen `sessionId` and `attempt` become the idempotency key (`web/lib/practice.ts:13-26`); they are not bound to an authenticated owner.
- The record endpoint returns the same learner’s aggregate to everyone.

The database capability roles and evidence seam are thoughtful, but they constrain *what this service role can write*, not *who may invoke it*.

**Required before release:** either keep it offline/demo-only with a conspicuous synthetic-data banner, or add real account/learner identity, ownership-bound sessions, CSRF/origin protection, durable rate limits, audit logs, and tenant-isolation tests.

### D8 — Trellis’s optional provider path has no timeout, cancellation, budget, or ledger

**Severity: high operational risk if enabled publicly. Confidence: high.**

`web/lib/tutor.ts:47-68` calls OpenAI with raw `fetch`, no `AbortSignal`, timeout, retry policy, request budget, token accounting, or spend record. Non-2xx and thrown errors fall back to scripted text, which is a good availability property; a connection that never completes can still tie up the request. The unauthenticated route makes paid calls available to anyone when `OPENAI_API_KEY` is set.

**Required before enabling the key:** add a hard timeout/cancel path, per-identity and global durable limits, pre-call reservation + post-call reconciliation, and structured provider-failure telemetry without prompts/answers.

## 4. External privacy/provider release blockers

### P1 — KaizenEdu guest mode exposes Pre-K through teen users to Gemini defaults prohibited for under-18 clients

**Release blocker.** `kaizen.config.ts:241-255` defaults both tutor model roles to Google Gemini. `GUEST_LEVELS` includes Pre-K with representative age four (`:373-381`), and guest mode starts voice/text sessions without an adult account (`docs/GUEST-MODE.md:1-25`). The code comment itself notes Gemini terms may forbid under-18 use but makes the alternate route optional (`kaizen.config.ts:280-290`).

Google’s official [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms), effective 2026-03-23, say the Services may not be used in an API client directed toward or likely to be accessed by individuals under 18. Current defaults therefore must not ship for those bands absent a written provider exception. A configurable override is not an enforcement control.

### P2 — “Guest mode collects no personal information” is not established

**Release blocker pending counsel and a documented data-flow decision.** Guest mode stores a 30-day persistent cookie plus transcripts, checks, mastery, planner, and coursework under an anonymous account (`docs/GUEST-MODE.md:27-40`). It can send a child’s voice clip to ASR and text to model providers. The FTC’s official [COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions) says personal information includes persistent identifiers and an audio file containing a child’s voice, and that passive tracking through a persistent identifier is collection.

The existing legal page says under-13 profiles remain locked and collect nothing beyond name/birth year (`privacy.tsx:283-296`), but the guest path bypasses that account-profile gate and stores learning content. This is a policy/product mismatch even before counsel decides legal applicability or an exception.

### P3 — Under-13 voice requires verified provider configuration, not assumptions

KaizenEdu defaults ASR/TTS to OpenAI providers (`app/(learner)/api/tutor/asr/route.ts:117-125`; `tts/route.ts:129-136`). OpenAI’s official [under-18 API guidance](https://platform.openai.com/docs/guides/safety-checks/under-18-api-guidance) says not to process personal data of children under 13 without first implementing Zero Data Retention. Its [data controls](https://platform.openai.com/docs/guides/your-data) explain that API data is not trained on by default, but abuse-monitoring logs may retain customer content for up to 30 days unless an eligible approved control applies.

Do not enable under-13 voice until the exact account/project/endpoints are confirmed ZDR-compatible, contracts and subprocessors are reviewed, and the product presents the required notice/consent flow. “We do not store audio” only describes the application database; it does not establish provider-side deletion.

### P4 — Kaizen-AI’s 13+ posture has meaningful safeguards but vendor duties remain unverified

Kaizen-AI declares 13+ in metadata, has age posture/guardian/minor prompt controls, moderation, AI disclosure markers, safety tests, and provider timeouts. Anthropic’s official [minors guidance](https://support.claude.com/en/articles/9307344) calls for age verification, appropriate moderation/filtering, monitoring/reporting, safety education, legal compliance, and disclosure. Static code and CI do not prove those controls operate end to end, that the production account has the intended retention settings, or that human escalation is staffed.

Provider/legal source notes are preserved in [`external-sources.md`](../evidence/reliability/external-sources.md).

## 5. Static source observations — controls already present and remaining gaps

### KaizenEdu

**Controls already present**

- Server-derived principal: the cookie resolves to a hashed database session and the learner is re-checked against the account (`lib/tutor/auth/session.ts:1-15,37-58`; `principal.ts:30-63`). Cookies are HttpOnly, SameSite=Lax, and Secure in production (`session.ts:79-85`).
- Tutor turn, TTS, and ASR require a learner principal. Voice routes check session ownership by account + learner before provider use (`tts/route.ts:68-87`; `asr/route.ts:53-71`).
- TTS/ASR enforce kill switch, rate limits, and a session spend check before provider calls; TTS combines caller cancellation with an explicit provider timeout.
- Voice bytes are handled in memory and application logs use IDs/lengths rather than transcript/audio content. This is a source property, not proof of provider retention.
- Per-learner daily hop counts are database-backed; unpriced providers use conservative estimates and ledger rows mark `priced:false` (`lib/tutor/cost/pricing.ts`).
- Guest “Start over” calls the sanctioned account purge and clears the cookie; idle-guest purge is called from the weekly cron. That does **not** fix the separate unwired parent deletion job.
- Evidence deletion is an explicit sanctioned exception to the append-only trigger and runs inside a transaction (`deletion.ts:143-190`).

**Remaining static risks**

- Session budget checks are read/check/call/write rather than atomic reservations. Parallel TTS/ASR/turn requests can all observe the same pre-call spend and overshoot; this needs a database concurrency test.
- ASR has no explicit provider timeout/caller signal in `lib/audio/asr-providers.ts`, unlike TTS.
- The guest identity-mint limiter trusts forwarded-address headers and lives in process memory; correctness depends on trusted proxy sanitization and does not span instances.
- Account purge intentionally retains usage-ledger billing amounts with `account_id` still present while learner/session/turn IDs are nulled. Retention purpose, access, and eventual deletion/anonymization need an explicit documented rule.
- The privacy page admits operator identity/contact, provider-contract review, written retention policy, and security program are unfinished. Those are release work, not marketing copy to leave as future tense.

### Kaizen-AI

**Controls already present**

- Most sensitive routes start with `getCaller`; service-role access is centralized. Database migrations include RLS and shared-record deletion restrictions.
- `safeFetch` and its selected tests cover SSRF-style URL handling; moderation, voice safety, legal markers, session limits, schema drift, and deletion/seat race contracts passed in the sandboxed subset.
- Anthropic client has a 55-second timeout and one retry (`web/lib/server/aiCall.js:23-29`). Prompt-cache rejection degrades to an uncached request.
- Account deletion refuses shared tutoring/payment records before irreversible cleanup; that guard is a real strength despite the external-cleanup defect.
- Export strips unsubscribe and guardian consent tokens, uses `Cache-Control: no-store`, and labels mastery evidence conservatively.
- Commit-matched CI is broad, but many native tests are contract/source-shape tests rather than live Supabase/Stripe/provider integration.

**Remaining static risks**

- Billing checkout/portal and tutoring room creation routes authenticate but do not invoke `rateLimitResponse`; repeated authenticated calls can create provider/Stripe load. The repository’s own review notes these gaps.
- The source price table is stale versus Anthropic’s official 2026-09-30 page: it records Sonnet 5 at $3/$15 per MTok versus $2/$10, and Opus 4.8 at $15/$75 versus $5/$25. This is conservative for ceilings but makes ledgers/margins materially inaccurate. Prices are mutable; automate review and version rates by effective date.
- “Best effort” telemetry is inappropriate for a hard cost ceiling. Alerting/operational ownership for RPC, ledger, moderation, email, and webhook failures was not demonstrated.

### Trellis

**Controls already present**

- Tutor and report database pools use separate capability roles; seam calls use parameterized SQL, one serializable transaction, bounded retry, and client release (`web/lib/db.ts`).
- Operation IDs make a repeated practice call idempotent for the same session/item/attempt.
- Scripted grading, not the model, determines correctness. The web tutor role cannot mint qualifying evidence; helped practice remains explicitly separate from proof (`web/lib/practice.ts`; `web/lib/record.ts`).
- Provider failure falls back to deterministic scripted tutoring.

**Remaining static risks**

- No authentication/tenancy, public health/read boundaries, deletion/export, consent, durable rate limit, global spend cap, or provider-use ledger.
- `vercel-build` can run database migration and seed when a database variable is present (`web/package.json:10-19`), coupling deployment to mutation; require explicit environment gates, backups, and rollback.
- The only product content is one synthetic nine-year-old and one three-item lesson. Reliability beyond that path is untested.

### Tutornat

The exact commit is a one-file README. There are no auth, storage, deletion, provider, cost, or operational boundaries to validate. Treat it as a concept note, not a product implementation.

## 6. Environment/setup blockers — not code defects

1. **KaizenEdu local:** no archived `node_modules`; `vitest` unavailable. Installing was prohibited, so local tests stopped before discovery.
2. **Kaizen-AI local:** 19 full-suite test files imported unavailable Supabase/Stripe packages. The other 416 tests ran. Commit-matched CI with dependencies passed 809 native tests, but that remains supporting evidence.
3. **Trellis local:** offline TypeScript + `@types/node` toolchain and `pg@8.23.0` were unavailable. PostgreSQL/database suites were not started because services and installs were prohibited.
4. **Tutornat:** no executable suite exists.
5. **Runtime parity:** local Node was v26.7.0; relevant CI used pinned workflow environments (for example, KaizenEdu Node 22). No claim of cross-version parity is made.
6. **Docker:** executable presence was known, but no daemon/service was used or required for this pass.

## 7. Untested claims and required next tests

These remain explicitly **untested**, not inferred from green source checks or CI:

- Real cross-tenant isolation under every PostgreSQL/Supabase policy, including guessed IDs, parent/learner/tutor role changes, and service-role mistakes.
- End-to-end deletion/export against a disposable seeded database, object storage, and mocked Stripe/provider failures; no orphan scan was run.
- Atomic cost ceilings under parallel requests, retries, provider timeouts, ledger/RPC outage, serverless multi-instance traffic, and identity rotation.
- Actual provider retention/ZDR, data residency, model-training controls, contractual subprocessors, and project/account configuration.
- Production secret scoping/rotation, webhook signing configuration, backup access, incident response, alert delivery, on-call ownership, restore drills, and audit-log review.
- Prompt-injection/content-safety outcomes, crisis escalation, moderation recall, voice safety, and human escalation with real minors. No real user data was used.
- Performance/SLO claims: first-audio percentiles, session stability, concurrency, provider failover, and monthly cost/margin at load.
- Dependency vulnerabilities/SBOM: no install and no networked dependency scanner were used.
- Legal applicability or compliance with COPPA, GDPR, CCPA, state child-design laws, school contracts, or biometric/voice rules. Counsel must decide.

## 8. Prioritized release gates

1. **Block all under-18 Gemini traffic now.** Enforce provider eligibility server-side by age band; do not rely on an optional environment override. Disable under-13 voice until approved provider controls/consent are proven.
2. **Align guest-child product and legal posture.** Decide whether no-account child use remains. Map each persistent identifier, transcript, voice transfer, vendor, retention period, consent/notice path, parent access/export/deletion mechanism, and operator contact. Have children’s-privacy counsel approve before collection.
3. **Wire and observe deletion.** Add the scheduler, overdue alerting, idempotent retries, and a full disposable integration test. Replace Kaizen-AI best-effort deletion with a durable verified workflow.
4. **Make exports fail loudly when incomplete.** Kaizen-AI must surface per-category errors; both products need pagination/completeness assertions and large-account tests.
5. **Make cost enforcement durable and atomic.** Wire KaizenEdu’s global alarm; fix ASR duration; reserve/reconcile spend; fix Kaizen-AI’s real model downgrade and fail-open ledger; add operator budgets and alerts.
6. **Keep Trellis demo-only or add identity.** Never expose the current singleton route with a provider key.
7. **Repair the KaizenEdu E2E boot/navigation race and require green exact-commit CI.** The failure is in test execution setup before assertion, so diagnose that seam rather than changing thumbnail behavior blindly.
8. **Run a second pass in an approved disposable environment.** Restore pinned dependencies without lifecycle scripts, provision synthetic PostgreSQL/Supabase/storage/Stripe/provider fakes, run full suites, then execute tenant/deletion/export/concurrency/provider-failure tests and an approved dependency audit.

## 9. Claim/hype audit

Treat these statements as false, incomplete, or unproven until corrected:

- **KaizenEdu guest docs:** “The global spend alarm … [is] unchanged.” The function exists but has no caller.
- **KaizenEdu privacy:** “data is erased after 30 days.” Requests freeze data, but the purge worker is not scheduled.
- **KaizenEdu privacy/guest docs:** under-13 profiles collect nothing / guest mode collects no personal information. Guest mode accepts Pre-K, sets a persistent cookie, stores transcripts/progress, and can transfer voice/text to providers.
- **KaizenEdu privacy:** “Audio is never retained.” Application source does not persist audio, but provider-side retention is explicitly still under review.
- **Kaizen-AI export:** “complete server-side data” / “everything Kaizen stores.” Query failures can become empty arrays and still return success.
- **Kaizen-AI deletion UI:** all files and active subscription are deleted/cancelled. Both operations are best-effort and failures are swallowed.
- **Kaizen-AI cost governor:** frontier callers “silently drop to the cheaper tier.” The outgoing model is unchanged; only accrual tier changes.
- **Trellis homepage:** “honest record” is well supported for the one synthetic seam, but says nothing about multi-user security, deletion, privacy, or operational readiness.
- **Any green CI label:** evidence that selected checks passed at one commit, not evidence of production correctness, compliance, safe provider configuration, or user value.

## 10. Evidence index

- Exact commands: [`evidence/reliability/commands.md`](../evidence/reliability/commands.md)
- Machine test totals: [`evidence/reliability/test-counts.json`](../evidence/reliability/test-counts.json)
- Static machine checks: [`evidence/reliability/static-source-counts.json`](../evidence/reliability/static-source-counts.json)
- Full local logs: [`evidence/reliability/logs/`](../evidence/reliability/logs/)
- Commit-matched CI records/logs: [`evidence/reliability/ci/`](../evidence/reliability/ci/)
- Official external source notes: [`evidence/reliability/external-sources.md`](../evidence/reliability/external-sources.md)
