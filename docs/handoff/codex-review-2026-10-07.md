# The Codex review: the judge's fix lists (2026-10-07)

Saved from the review of Codex's four branches, which was run in the Claude Code session of
2026-10-07. Until now the only full copy sat in that session's scratchpad. The text below is the
judge's own, copied as written. Notes marked **Reconciled** record where the judge's text has been
overtaken or corrected against the code. Where this file and [STATUS](../STATUS.md) differ, STATUS
wins: STATUS holds the current step order, each owner decision's current wording and its default.

Where each branch went: `0bac96a` → step 0c (docs). `ec7b776` → step 0a (T01). `02b84e3` → step
1b (evidence pass). `1b6bca5` → step 4b (M5 accounts and consent). The four branches and PRs #2
(draft), #3 and #4 stay untouched as the archive (STATUS decision d).

## Test results on each branch tip (the review's own runs)

| Commit | `npm run verify` | Browser suite |
|---|---|---|
| d8d8166 | PASS (baseline). Lint, typecheck, 132 unit test files / 2372 tests and build all passed. | 150 passed, 20 failed, 16 skipped (2.0m). The same 10 tests failed on both desktop and phone: aiinfra.spec.ts:54 (daily cap; 'A short set, help ready' not found); family.spec.ts:116 (stuck-skill nudge stayed on /home instead of going to /practice?subject=math&again=m.frac.equiv); intake.spec.ts:68 ('0 proved · 0 practicing · 1 not started' not found); journey.spec.ts:12 (getByLabel('Grade') matched 3 elements, strict-mode violation); landing.spec.ts:75 ('Privacy notice' h1 not found); trust.spec.ts:17 (axe color-contrast on terms-es button[lang=en]); trust.spec.ts:67 (axe color-contrast on review-skill .text-good); trust.spec.ts:225 (weekly email count 0, expected 1); tutor.spec.ts:64 and tutor.spec.ts:200 (Board 'Fallacy' article matched 2 elements, strict-mode violation). Skips are environment-gated: E2E_AI_CAP unset, demo mode, and accounts tests that need DATABASE_URL. |
| 0bac96a | PASS. The commit changes docs only. Lint, typecheck, 132 files / 2372 tests and build all passed. | 150 passed, 20 failed, 16 skipped (3.5m). Same failures as baseline with one swap, which is flakiness since the commit is docs only: [phone] trust.spec.ts:17 passed this time, and [phone] stage.spec.ts:131 'a narrated slide plays, marks the word, pauses, resumes and stops' failed instead (90s timeout waiting for [data-spoken=word] after Pause). The other 19 failures are the same as baseline: aiinfra:54, family:116, intake:68, journey:12, landing:75, trust:67, trust:225, tutor:64, tutor:200 on both projects, plus [desktop] trust:17. |
| ec7b776 | PASS. Lint, typecheck, 132 files / 2385 tests and build all passed. | 174 passed, 0 failed, 16 skipped (1.7m). Fixes all 20 baseline failures and adds new practice e2e tests (190 total). |
| 02b84e3 | PASS. Lint, typecheck, 135 files / 2420 tests and build all passed. | 180 passed, 0 failed, 16 skipped (1.6m). The extra tests are the new practice and stage e2e tests. |
| 1b6bca5 | FAIL (exit 2). Lint passed. Typecheck failed with 7 errors: src/lib/ai/tutor.ts(139,29) TS2504 (ReadableStream<InferUIMessageChunk<...>> needs a [Symbol.asyncIterator]()), plus 6 TS2339 errors in src/lib/voice/server.test.ts at lines 22, 69, 71, 72, 76 and 84 ('headers' or 'json' do not exist on type Promise<Response>, because voiceStatusResponse() is now async). Verify stopped before test and build. Running npm run build on its own also failed at its TypeScript step with the same 7 errors. Running vitest on its own failed: 5 files / 27 tests failed, 2478 passed, 1 unhandled rejection. Failing files: voice/server.test.ts (15), course/route.test.ts (5), server/db/consent.test.ts (3), sync.test.ts (1), and intake.test.ts (3). intake.test.ts is not listed in the commit's handoff note: POST /api/ai/extract now returns 503 where tests expect 200 or 422. The unhandled rejection is LearningAuthorizationError: capability, thrown at src/lib/server/budget.ts:64 from spendDay in course/route.test.ts:41. No package files changed, so npm install was not needed. | NOT RUN. No build was produced: verify failed at typecheck and the separate build failed on the same type errors. |

## 0bac96a: codex/integrated-learning-plan (docs: integrated learning release plan + system audit)

**Decision:** merge-with-fixes.

**Why:** The evidence holds up. Both reviewers checked about 30 code and count claims against d8d8166 and every one matched. The audit also finds real holes, including one current rule-10 violation: /api/ai/course calls the model with no safety screen. As written, though, the commit takes over the plan. It labels our Queue 4 and this session's owner rules 'historical/superseded'. It lets an agent choose a model vendor or a new child-data processor, and it drops 're-confirm before wiring'. It loosens 'no answer before a try' and changes what counts as help. It parks content-merge with no end date and narrows OpenMAIC parity. Do not cherry-pick or merge the commit. Take its evidence and spec files as inputs and write our own reconciled edits to the authority docs. It is docs only, so nothing in the app is at risk.

### Fix list

1. Do not merge or cherry-pick 0bac96a. Check out only these files onto foundation: docs/reviews/2026-10-07-system-audit.md, docs/reviews/2026-10-07-baseline.json, docs/reviews/2026-10-07-model-benchmark-evidence.md, docs/specs/2026-10-07-models-voice-and-jev.md, docs/specs/2026-10-07-one-learning-workspace.md, docs/plans/2026-10-07-integrated-learning-release.md
2. Plan doc header: 'Proposed by Codex 2026-10-07. Not the plan of record. Mapped into STATUS Queue 4.' Add a mapping table: T01 = done (ec7b776 code); T02 = evidence pass (02b84e3 finish); T03/T04/T12 = the M5 accounts and consent step; T05-T09 = Live Tutor A/B plus polish; T10/T13 = eval track that ends in a recommendation; T11 = content audits, not a merge gate. Map every dogfood finding, handoff/requests entry and live-tutor-audits item to a Queue 4 step, and cite the dogfood IDs the audit rediscovers (#3, #7)
   - **Reconciled:** T01 is not on `foundation` yet: it is committed for step 0a on `worktree-wf_8bf8e121-43e-1` (c8dc7ab..df04156). STATUS ticks it with its foundation SHA and gate counts when it lands.
3. Plan T10: replace 'Choose/pin the best demonstrated production roles' with 'recommend to the owner'. Add the gate: any production role that leaves native Anthropic, and any new processor (Jev included), needs the owner's written sign-off plus a child-data/COPPA review. Until then, hosted comparisons use synthetic data or consenting adults only, and lib/ai/config.ts keeps its anthropic/* restriction
4. Plan T02 and workspace spec §5: label 'opening a tutor is neutral' and 'read-aloud checks are practice-only' as OWNER DECISIONS. Current semantics stand until the owner answers: opening the tutor on a problem counts as help; read-aloud is not help except for skills that measure reading
   - **Reconciled:** Corrected against the code. Today read-aloud never counts as help for any skill (`Runner.tsx` `helped` and the stage's `QuizView` ignore it), and nothing special exists for reading skills. The default is therefore "read-aloud is not help for any skill, as today; read-aloud-supported checks count". Whether it should count for skills that measure reading is the open part of STATUS decision 6, with no implementation until the owner answers.
5. Plan T07: call it sequencing. data-spot targets on every screen stay required in the same task
6. Plan §0/T11: drop 'keep content-merge out of the release'. Content-merge merges behind the Draft labels once green (Queue 4 #1); T11 decides what counts as reviewed, not what merges
7. Plan §4: the full evaluation protocol (120 intake cases, 60 blinded conversations, two reviewers) gates only a production vendor switch. It does not hold up visible workspace or voice work. Every checkpoint shows working screens
8. Models/voice spec: say plainly that native speech-to-speech (Gemini Live, gpt-live-1, gpt-realtime-2.1) is evaluation-only on synthetic or consenting-adult audio. The production default for minors is the cascade: ASR, then safety screen, then name scrub (render.ts withoutNames/nameWords), then model, then TTS. Define JudgmentRequest redaction as that scrub plus an allowlist. Jev shadow mode runs on synthetic fixtures only
   - **Reconciled:** Corrected against the code. The tutor path's scrub is `lib/tutor.ts` `withoutNames(text, names)` fed by `familyNames` (what `TutorChat` imports). `lib/email/render.ts` `withoutNames(text, names, bare, possessive)` with `nameWords` is the separate email scrub. Jev and the cascade use the tutor-path scrub, or the two are merged into one function before Jev is wired.
9. Models/voice spec: keep no-answer-before-try (evals/checks.ts:142, prompts.ts:28) as a hard deterministic check. Relax only the two-statement 'short' rule, for conceptual 'why' and 'go deeper' turns
10. Models/voice spec: the latency table defers to docs/plans/2026-10-07-live-tutor-spec.md §2.3. Keep the K-2 end-of-turn band; the 800 ms and 250 ms figures are stretch targets. State where escalation and Jev calls sit within the one-model-call-per-spoken-turn budget
11. Models/voice spec: remove 'Keep Fable suspended / DeepSeek / OpenRouter only for Jev', or label it as developer-tooling policy from ~/.hermes, not product policy. Add claude-fable-5-1 as a teacher and deep-preparation candidate, pending owner confirmation
12. Benchmark evidence doc: relabel the TutorBench table 'selected rows' with each row's rank. Note that TutorBench covers high-school and college STEM, not K-9 or English
13. Restore 're-confirm before wiring' and the Anthropic-only policy in PRODUCT.md. Restore the success sentence ('a child can go from I want to learn X to doing and checking X with little reading, and a parent can see truthfully what happened'). Keep full OpenMAIC parity and beyond as Principle 5; the plan carries the narrower release scope
14. README: keep the sentence that the tutor never gives the answer to the learner's live problem before a try. Keep test counts out of the README and link to STATUS
15. DECISIONS.md: keep the new verbatim quotes and add the omitted lines from the same message verbatim from ~/.codex/history.jsonl ('most advanced UI/UX in the world', 'community from a cheaper available service', 'engagement produces knowledge growth, intelligence, creativity', 'dont make AI slop, be bold'). Move the 'Implementation interpretation' paragraph to the spec. Record this session's owner rules (same world/max craft, the tutor points at anything, gamified only where justified/clean teacher replacement, merge as you go, use what we build, K-9 math/science/English EN/ES) as standing decisions, with a pointer to the 1.0 plan §2.10 owner update
   - **Reconciled:** The four omitted lines are not copied yet: `~/.codex/history.jsonl` could not be read in this session. DECISIONS keeps the fragments the reviews quoted, and STATUS step 0d tracks the full copy.
16. PRODUCT.md and ROADMAP: mark 'adults last superseded' and the water-use adult story as an interpretation awaiting owner confirmation. Do not take ROADMAP's 'This supersedes...' line
17. Do not take the HANDOFF/STATUS rewrites. Write our own: Queue 4 stays the active sequence with the audit items added (see integration plan). The blocked-on-owner list stays at the top, split into credentials, hygiene (rotate the six leaked keys first), decisions (including the new ones) and people
   - **Reconciled:** Done in step 0c: our own STATUS and HANDOFF.

### Keep from what was dropped

1. docs/reviews/2026-10-07-system-audit.md, verbatim; its sections A-E become Queue 4 repair items
2. docs/reviews/2026-10-07-baseline.json as the d8d8166 baseline, noting that ec7b776 took it to 174/0
3. The 'Recover work before duplicating it' table: the numbers-speller worktree wf_70ee4360-55e-1 has uncommitted speakable.ts plus untracked numbers.ts and golden tests, so it is not 'not started'. 5d6ca5f, 43d4b71 and the five content-fix WIPs are not in content-merge; use git cherry before replaying. Union merges can duplicate IDs
4. Named regressions from T02-T04: hint_then_keyboard_fraction_submits_once, help_survives_reload_and_abandon, second_refresh_failure_requires_new_restoration, level-1-for-level-2 substitution, forged/future/duplicate checks, zero-provider-call unauthorized-route table, server-issued check grants
5. Workspace spec items for Live Tutor phase B: public observation built field by field (no keys in prompts, sentinel-key tests); one audio owner and one cancellation epoch; stale replies stay inert; only the heard prefix counts as delivered; the tutor strip never covers the object it explains (the current 80dvh drawer does); the fraction 'Split each part' example; the demo bug where 1/2=2/4 gets a lesson on naming 1/6
6. Models spec items for Live Tutor phase A: latency targets with explicit measurement boundaries; never report TTS API time as turn latency; JudgmentResult with explicit unavailable/abstain that is never coerced to a pass; reserve budget before a call and settle after; Jev's bounded roles and its never-authority list
7. The intent-routing finding: MagicBox sends questions to /courses/new, and MagicBox.test asserts 'Why is the sky blue?' does too
8. PRODUCT.md correction of the stale 'no backend' line; README dropping the stale 724-test count; the README engagement rule matching 1.0 plan §2.10

## ec7b776: codex/restore-learning-journeys (T01: e2e repairs, answer focus, handover, weekly email)

**Decision:** merge-with-fixes.

**Why:** This is our own polish-batch-1 work and it is green: verify passes, 2,385 unit tests, e2e 174 passed and 0 failed, up from 150/20. Its new tests fail on d8d8166 and pass on ec7b776, and no test was weakened. HandoverScope in AppShell is a better fix than our 5d6ca5f. AppShell calling useWeeklyEmail is the trust package's own request. No vendor, RULES, t() or demo-mode rule is touched. Two things block a plain merge. Its parent is 0bac96a, so a branch merge would bring in the plan rewrite. Its STATUS, plan and evidence hunks claim owner approval and spending authorization that nothing backs. Dogfood #5 is also only half fixed: type, then Hint, then Enter takes a second hint instead of checking.

### Fix list

1. New branch from foundation (d8d8166): git checkout ec7b776 -- apps/web DESIGN.md (0bac96a touches neither, so this applies cleanly). Commit with the original message plus '(code from codex ec7b776; docs excluded)'
2. Finish dogfood #5: after takeHint, move focus back to the pad's answer field (the focused fraction or remainder box, or the keypad target). Add the regression typed_then_hint_then_enter_checks_once in Runner.test.tsx and practice.spec.ts. Add the browser variant Hint, type '1/4', Enter with no click
3. AnswerPad: do not move focus when the keydown target is inside [role=dialog] (the open tutor panel). Do not focus the aria-live <output>; focus the Check button or a non-live wrapper instead
4. e2e/journey.spec.ts:38: choose Español by clicking (getByRole('radio', {name:'Español', exact:true}).check() or the scoped label) instead of press('Space'); keep toBeChecked
5. e2e/landing.spec.ts:78-80: add exact:true to the 'Privacy' heading lookup
6. Handover.tsx: key `from` on pathname+search, or assert in useHandover that the href's pathname differs from the current one, and add a test, so a same-route handover never blanks the page
7. globals.css reduced-motion comment and the DESIGN.md motion line: state that button and chip colour changes are instant on purpose. Note it in handoff/requests/design.json for the design pass and raise it with the owner
8. Do not take ec7b776's STATUS.md or plan-checkbox hunks. From docs/reviews/integrated-release-evidence.md keep only the verification section and the 16-skip inventory; delete 'owner approved implementation' and 'live-provider spending is authorized', or mark them 'claimed by Codex, owner to confirm'
9. Stale handoff files: e2e-failures.txt, mark all fixed in this commit. requests/trust.json, mark the useWeeklyEmail item done. requests/family.json, rewrite as 'no page-level HandoverScope; AppShell owns it' and add a comment on HandoverScope that nesting it breaks it. dogfood/2026-10-07.md, #5 fixed in this commit (both orders, once the fix above lands)
   - **Reconciled:** Written into those four files as "fixed in T01 (step 0a)", each saying it lands on `foundation` with 0a.
10. HANDOFF: from 5d6ca5f do not cherry-pick Handover.tsx or its test (superseded); the rest of 5d6ca5f continues. From 43d4b71 only the m.mult.groups alias landed; rebase the rest (grade-aware ranking, intake/school edits) on top
11. Gate: npm run verify, then CI=1 E2E_PORT=3291 npx playwright test (desktop and phone) green before fast-forwarding foundation and pushing

### Keep from what was dropped

1. Everything in apps/web and DESIGN.md: IME guards; defaultPrevented guard; fraction and remainder fields that follow real focus; HandoverScope in AppShell; useWeeklyEmail in AppShell; settings iframe mounted only while open; review answer-key label in ink; the skillmatch alias fix plus 'repeated addition'/'suma repetida'; axe failureSummary diagnostics with unchanged thresholds; the e2e selector repairs; all new regression tests
2. The 16-skip inventory table from integrated-release-evidence.md, as reference

## 02b84e3: codex/durable-learning-evidence (T02: attempt identity, help/first-response durability, tutor admission)

**Decision:** finish.

**Why:** The goal is right and part of rule 2 (honesty): a reload must not turn help into 'on your own'. It also fixes a real refresh-restoration bug in engine.ts without changing any RULES number, and the T03 work is built on top of it. It is green (2,420 unit tests, e2e 180/0), but reviewers reproduced defects that would hurt real families. Storage grows about 9x per problem and is never compacted, so after about 1-1.5k problems hints and feedback stop with a message a child cannot act on. Each answer costs O(n²). Lesson activity IDs in generated courses are 508 characters, over the server's 300 limit, so they never sync. A deleted course's answers come back. appendEvidence wipes in-memory state when storage is blocked or full. A check with one helped item stops being graded. Tutor help no longer syncs. It also quietly changes what the mastery law treats as help: opening the tutor becomes neutral, misses start the 48 h wait, and the K-2 opening hint is removed. None of these were owner decisions. Re-apply the code onto foundation and fix it in one pass. Do not merge the stacked branch.

### Fix list

1. After ec7b776's code and fixes are on foundation: worktree branch from foundation; `git diff ec7b776 02b84e3 -- apps/web | git apply --3way`. Do not use checkout, which would overwrite the ec7b776 fixes and the course safety fix. Expect conflicts in Runner.tsx and practice.spec.ts and keep both sides. Leave out docs/tutornat-preview.md, STATUS and the plan/evidence hunks
   - **Reconciled:** "After ec7b776's code and fixes are on foundation" means after step 0a has landed. The base is `foundation` at that point, which now also has the content merge (d34f845).
2. store.ts: turn the journal into a real write-ahead log. Write the journal key, save the main document, then removeItem the key once that save succeeds. On load, merge only leftover keys, using a Map by id instead of findIndex. Drop the whole-state JSON.stringify comparison and reuse write()'s reload
3. IDs: store the full AttemptSource once, in attemptContexts. Every evidence and activity ID is a short digest (for example 'att_' plus a 22-character base64url of the canonical tuple), at most 100 characters. Test: an all-UUID generated course pushes a quiz answer through the real sync path within SYNC_LIMITS.idLength
4. Regression ceilings: about 2,000 problems of history; bytes per problem stay close to the parent's (about 400) and full-document parses per answer stay at 2 or fewer
5. Deletion: write() removes journal keys for any record that leaves an evidence list, not only for removed learners. removeCourse also removes that course's scene-question attemptContexts, responseEvents and helpExposures. Test: remove, save anything, reload, rows gone
6. appendEvidence: never reload when health === 'memory' and never replace in-memory state. Fail closed only where it protects a proof (check sets); practice hints keep working in memory with the existing 'not saved on this device' status. Tests for storage blocked and quota full
7. Checks: keep mode 'check' and store assisted:true, never relabel as practice, so checksOf grades the item honestly as not on your own. In the same pass fix lib/sync.ts:319, which forces assisted=false for checks, and the stale server comment, so a helped check item stays helped on the server. Silent sets grade the saved first response, not a resubmission. Engine-level and Runner save-failure tests
8. TutorDrawer beforeHelp: write the helpExposure and also one synced mode:'tutor' assisted attempt with a deterministic id (`${attemptId}:tutor`, digest, at most 100 characters). Count local-only evidence in sign-out's 'kept' check
9. Policy stays as it is until the owner answers. Opening the tutor on a problem still counts as help (restore it). Unassisted misses do not feed lastHelpAt (revert the engine.ts helpTimes change). An abandoned hint stays help (same meaning, now durable). Grades 3-9 open neutrally ('Which part is tricky?'). K-2 opens with the first vetted hint as a gated, saved-before-shown help entry per live-tutor spec §2.5, not the exempt 'open' entry. Write the policy in the engine.ts header and record the refresh-episode replay in DECISIONS as a behaviour change with unchanged numbers
   - **Reconciled:** Opening wording: STATUS decision b keeps today's tutor openings until the owner approves the live-tutor spec §2.5 wording. So do not ship "Which part is tricky?" in this pass. The K–2 mechanism (the first vetted hint as a gated help entry, saved before it is shown) can be built behind today's wording. The other three policy lines are STATUS decisions 4–5 with today's defaults.
10. Tests go through statusesOf with real response evidence, so they assert what the app computes
11. Errors: separate storage DOMExceptions from logic errors. A stale or unknown attempt reloads the set, with a new EN/ES string through t(). K-2 learners get a read-aloud grown-up handoff message instead of 'free some space'
12. Provenance: leave it undefined when unknown, and do not stamp synced or other-device rows 'legacy-local'. Keep the new fields through mergeRemote, or add a round-trip test and correct the evidence doc
13. allStatuses: include only IDs where getSkill(id) exists. Quiz resume stores the choice index, not the 80-character truncated response
14. Audit item in the same pass: the outcomes 'test goes well' check uses isSecure, which includes refresh. Fix it with a test
15. Untick 'two-tab ordering' (deferred). Two adversarial reviews, then npm run verify plus full e2e, then merge

### Keep from what was dropped

1. learning/evidence.ts pure reducers (firstResponseOf, assistanceFrom, attemptIdentity before hashing) and the AttemptSource/HelpExposure/ResponseEvent types
2. engine.ts refresh-episode replay in time order with the second_refresh_failure_requires_new_restoration test
3. Deterministic per-slot final attempt id `${setId}:${slot}`, idempotent recordAnswer, presented-difficulty guard, openPracticeAttempt level pinning
4. Help saved before it is shown and the first response saved before feedback; Runner/QuizView restore hints, misses and helped corrections after reload; the practice.evidenceSaveFailed EN/ES string
5. Widget onCheck returning boolean|void, so feedback waits for a successful save (12 widgets plus QuizView); checkMemory seeding
6. The TutorChat admission gate: reply buttons belong to their admitted entry, and refused help never reaches the transcript
7. Learner removal and synced removals clearing the new evidence lists
8. Tests: help_survives_reload_and_abandon, miss_survives_reload, save-failure cases, lib/evidence.test.ts, TutorAdmission tests, the practice and stage reload e2e specs

## 1b6bca5: codex/account-authority (T03 WIP: server principals, DB budget ledger, capability grants)

**Decision:** finish.

**Why:** This is a self-declared WIP and it is red: 7 typecheck errors, 27 failing tests and an unhandled rejection, and it is stacked on three commits that are not merged. The direction is work the 1.0 plan's M5 already requires before any real child uses AI: identity from the session cookie and the account's own rows, a Postgres-shared budget ledger, and revocation that ends voice access. Dropping it would throw away real security work. As written, though, it breaks owner rules. It buffers the whole tutor turn, which kills real-time voice. A per-token 1 s watcher cuts voice about 15 minutes in. Crisis referrals sit behind authorization. The input keyword screen is reused on model output and wrongly refuses everyday K-9 EN/ES text. It also sets product policy nobody approved: no live AI without a database, a 2 h adult password re-prompt, parent and coach refused, a failed call costing a turn, and a UTC day. Do not continue it now. Keep the pushed branch as the saved state. After Live Tutor phase A has fixed how replies stream, port it selectively onto foundation (no rebase of the stack), once the owner has answered its decisions.

### Fix list

1. Keep origin/codex/account-authority untouched as the archive. Resume after Live Tutor phase A as the Queue 4 M5 accounts and consent step, by selective port onto foundation
2. Build green: read the UI stream with getReader() in a loop (tutor.ts:139); await voiceStatusResponse in voice/server.test.ts; rewrite the consent, course, voice, sync and intake fixtures to real signed-in accounts and DB reservations without weakening the guards; full verify plus e2e
3. Remove the whole-turn buffer. Release sentence by sentence at the live-tutor spec's release point, with the tool-name allowlist, the unbound-tool-result rejection, the byte cap and abort applied inline while streaming
4. Voice: one capability watcher per voice session, owned and disposed by useVoiceSession. Cancel only on 'revoked' or 'foreign', never when a superseded token's lease expires naturally. Poll every 10 s and tolerate transient failures (two to three in a row). authority-work: re-check at release points instead of a 1 s locked transaction
5. /api/tutor: run screen() on the last learner message before learningGate and return fixedReply with no authority or budget check. Restore the test that unauthorized, expired and revoked sessions still get the 988/Childhelp referral with zero provider calls
6. No-DB path: keep the old browser-only behaviour (allow when !serverMode) until the owner decides. Enforce authority only in server mode. Flip CONSENT_ENFORCED in the same change that ships the consent UI. This also fixes the intake.test 503s
7. Status endpoints stay ungated for configuration and return {mode, authorized, reason}; the client shows ConsentNeeded through t()
8. Grown-up principal: an account-holder principal for the parent's own tools (coach note, calendar extract), per backend.json and the GROWN_UP_ONLY rule. The 2 h adult-self re-prompt waits for an owner decision, and its UI and EN/ES copy are built before any such gate goes live
9. Safety: write a separate output policy instead of reusing the learner-input regex. Never apply crisis or abuse patterns to model text. Add school-term allowlists per subject and locale (gametes, sex cells, rubbing alcohol, 'arma' as a verb, 'bomba' for the heart). Do not screen uploaded or teacher documents as child input. Skip only validated file fields, never any string starting 'data:'. Tests with real K-9 EN/ES text
10. Sync: never 403 on a stale learner selection. Clear sessions.learnerId (revoking grants), return learner:null, and let the client reset its picker
11. Privacy: key address budgets with an HMAC under a rotating server secret. Prune address and day rows after about 48 h and holds after expiry. Cascade-delete budget and grant rows on account deletion. Add the new records to the trust retention rows; otherwise the privacy page is untrue
12. Tests: rewrite each removed budget behaviour (per-learner isolation, month before day, address ceilings, one turn per request, concurrent holds, screened messages hold no turn, crisis gets the referral, language from the body) against the DB ledger. Run the concurrency test on real Postgres with two connections, not single-connection pglite. Point consent-wiring.test at learningGate/authorizeLearningRequest and include voice/server.ts
13. Policy defaults until the owner answers: a failed provider call costs no turn (count after success or refund); the day follows the learner's local date, clamped to within a day of the server day; restore the cap env-var documentation
14. voice/server.ts: map LearningAuthorizationError to 403 with remoteFailure; count the token after the vendor succeeds; take the site-wide ceiling to the owner
15. Squash drizzle 0002-0004 into one migration before anything is applied. Remove the duplicate spendGate import in extract/route.ts
16. Move docs/handoffs/2026-10-07-account-authority-checkpoint.md into docs/handoff/. Add a row to the HANDOFF WIP table. Move its voice-lease limits into the live-tutor spec

### Keep from what was dropped

1. lib/server/authorize.ts principal model: identity from the cookie; learner refs resolved only among the account's own undeleted profiles; header hashes grant nothing; assertPrincipalLive re-checked under the account lock
2. lib/server/budget-ledger.ts: reservation, start and usage with sorted advisory key locks, idempotent start, turns counted at admission, usage settled from provider counts
3. app/api/remote-authorization.test.ts: the 9 refusal cases x 7 routes matrix asserting zero model-factory calls and zero vendor token mints; plus authorize.test.ts and budget-ledger.test.ts
4. Revocation plumbing: revokeConsent revokes capability_grants in the same transaction; setSessionLearner checks ownership under the lock and revokes grants and adult-self on handover
5. abortSignal threaded through practice, extract, coach and course generation, plus the onRemoteCancel bus in TutorChat and useVoiceSession
6. The stricter ExtractRequest.file data-URL regex (image types and PDF only)
7. metered(): admission awaited before any network call
8. The handoff's voice-lease section: ElevenLabs 15-minute single-use token, Deepgram socket outliving its token, providerRevocation unsupported

## Owner decisions (the judge's list)

STATUS "Blocked on the owner → Decisions" numbers them the same way and gives each one its
current default. Decision 6's default there has been corrected against the code (see the
0bac96a fix list, item 4).

1. Plan of record: keep Queue 4 with ChatGPT's audit folded in (our default), or adopt ChatGPT's T01-T13 integrated-release plan?
2. Any non-Anthropic model or new processor (OpenAI Astra/Sol/GPT-Live, Gemini Live, Muse Spark, TypeSafe Jev) for a production role that touches children's data? Default: Anthropic only, comparisons on synthetic or adult data.
3. Native speech-to-speech for minors at all, or always the cascade (ASR, then safety screen, then name scrub, then model, then TTS)? Default: cascade.
4. Does opening the tutor beside a problem count as help for the mastery law? Default: yes, as today.
5. Does an unassisted wrong first answer start the 48-hour help wait? Default: no, as today.
6. Does read-aloud count as help, and can read-aloud-supported checks prove a skill for pre-readers? Default: not help, except for reading skills; checks still count.
7. Keep 'never give the answer to the live problem before a try' as a hard rule, with conceptual explanations allowed on top? Default: yes.
8. Content-merge: merge behind the Draft labels as soon as it is green (Queue 4 #1), or hold it until per-journey review? Default: merge as you go.
9. ChatGPT wrote that you authorized live-provider spending ('burn cash first'). Is that right, and what daily and monthly ceiling?
10. Which Vercel project is canonical, kaizenedu or the new tutornat-preview (scope saitokikus-projects)? Should the other one's Git integration be disconnected?
11. Live AI before accounts: keep the browser-only owner/dogfood path until pilot, or require database, accounts and consent everywhere? Default: keep browser-only.
12. Adult self-use: how does a grown-up prove it's them learning, and how often must they re-confirm? ChatGPT proposed retyping the password every 2 hours.
13. Should a failed provider call cost a learner a turn, and should the daily cap reset at the family's local midnight or at UTC? Default: no cost, local midnight.
14. Voice token ceiling: 2,000 per kind per day for the whole site, or a per-account limit with a high site-wide safety ceiling?
15. Same-vendor model refresh: add claude-fable-5-1 to the teacher bake-off, and move the 'quick' role from claude-haiku-4-5 to Haiku 5.5?
16. Are adults an early acceptance story now (ChatGPT's water-use example), i.e. is 'adults last' dropped?
17. Taste check: ChatGPT made colour changes on all buttons and chips instant (no fade) to pass contrast checks. Keep it?

## Integration plan (the judge's text)

ORDER ONTO foundation (d8d8166 = main):

1. ec7b776 code only. Branch integrate/codex-t01 from foundation. Run `git checkout ec7b776 -- apps/web DESIGN.md`. Commit with the original message, marked code only. Then commit its fixList: dogfood #5 typed-then-hint, the AnswerPad dialog/live-region focus fix, the journey/landing/practice e2e fixes, the Handover same-route guard and the DESIGN.md motion line. Run `npm run verify`, then `CI=1 E2E_PORT=3291 npx playwright test` (expect 174+ passed, 0 failed). Fast-forward foundation and push.

2. Rule-10 fix, its own commit: screen() on /api/ai/course input before any model call, with a test that asserts zero model calls for screened input. Verify.

3. One docs reconciliation commit:
- From 0bac96a, take the evidence and spec files only, with the fixes in its fixList.
- From ec7b776's evidence doc, take only the verification section and the skip inventory.
- Write our own STATUS, HANDOFF, DECISIONS, PRODUCT, README and ROADMAP edits.
- Update handoff/e2e-failures.txt, requests/trust.json, requests/family.json and the dogfood #5 status.
- STATUS keeps 'Blocked on the owner' at the top, split into credentials, hygiene (rotate the six leaked keys first), decisions (the new list) and people.
Push.

4. Queue 4 #1, content-merge green. Merge the new foundation into content-merge. Fix the 20 failing tests at the root by de-duplicating skill ids and prereqs (no union duplicates). Fix the 16 audit blockers. Merge into foundation behind the Draft labels, then verify and e2e.

> **Reconciled:** Since written: `content-merge` was merged into `foundation` as d34f845, with its test fixes from `worktree-wf_4d287928-e43-1` and `-3`. The audit blockers did not gate the merge. All 19 strands are now audited, with 20 blockers (not 16), and those lead Queue 4 #2.

In parallel, in a worktree from step-3 foundation, finish 02b84e3: run `git diff ec7b776 02b84e3 -- apps/web | git apply --3way` (never checkout), apply its fixList with conservative policy defaults, then two adversarial reviews. Merge it after content-merge, then verify and e2e.

5. Queue 4 #2, content audits. Continue the five fix WIPs (use git cherry first). Run the two missing audits (sci-69, res-ela-sci).

> **Reconciled:** Since written: sci-69 and res-ela-sci are audited (6914329). Nothing is left to run. 327 findings in all: 20 blocker, 87 major, 220 minor.


6. Queue 4 #3, polish batch 1, now smaller.
Rebase 5d6ca5f without Handover.tsx and its test. Rebase 43d4b71 without the alias hunk.
Remaining scope: dogfood #1-4 and #6-13, design.json, and the per-package requests.
Plus audit additions:
- MagicBox routes questions to /courses/new (fix the test that asserts it).
- The demo Talk answers 1/2=2/4 with a 1/6 lesson.
- Tutor DockContext is opening-only and hints are read through a cast.
- The 80dvh tutor drawer covers the object it explains on phones.
Then a hands-on dogfood pass.

7. Queue 4 #4, Live Tutor.

> **Reconciled:** Since written: db7c472 is committed, and phase A has moved on from it (d27f31d at 20:37 on `worktree-wf_7704ca2c-e01-1`; HANDOFF WIP table). Continue from the newest commit there.

Phase A starts from the dirty numbers-speller worktree wf_70ee4360-55e-1 (commit it first; it is not 'not started'). The live-tutor spec's gates stay the authority, including the K-2 band. Fold in the models spec's measurement boundaries (no TTS API time as turn latency), JudgmentResult abstain/unavailable, and reserve-then-settle budgets. This phase sets the sentence-release point that output admission and 1b6bca5 will use.
Phase B: data-spot on every screen, the mounted SpotlightLayer, screens routed through lib/voice, and the workspace spec items (one audio owner and cancellation epoch, stale replies inert, heard prefix only, the tutor never covers its object).

8. New Queue 4 step, M5 accounts and consent. Only after the owner answers decisions 11-14. Port the parts of 1b6bca5 worth keeping, using its fixList.
Plus the audit's server items:
- consentGate compares the raw ID while the client sends a hashed one, and no route calls consentGate.
- recheck does not verify level, duplicate, future or readiness.
- Server-issued check grants (T04).
- Evidence lists sync (T12).
- An account-delete route.
- Budgets move out of process memory.

9. Then the existing tail: the learning-loop revision, a hands-on pass after each batch, the cross-cutting review, e2e and axe at 1440/390, the preview deploy, and the final report.
The model bake-off (T10/T13) runs as a side eval track on synthetic data and ends in a recommendation to the owner, never a pin.
Leave the four codex branches and PRs #3/#4 as the archive; comment on or close them only with the owner's go-ahead. origin/codex/migrate-gpt-6-astra is already an ancestor of foundation (old, README only), so ignore it.

> **Reconciled:** PR #2 (a draft, for `codex/integrated-learning-plan`, 0bac96a) is open too, and it stays untouched with #3 and #4. Merging it would bring in the authority-doc rewrite the judge rejected.


WHAT CHATGPT ALREADY DID (no longer on our list):
- All 14 e2e failures in handoff/e2e-failures.txt, plus the 6 more in the fresh baseline (20 total).
- The type-after-hint half of dogfood #5.
- The trust request (useWeeklyEmail in AppShell).
- 5d6ca5f's handover bug (superseded by the better AppShell fix).
- 43d4b71's m.mult.groups alias.
- Review-label contrast and the settings iframe.
Once 02b84e3 is finished, also done:
- The engine.ts refresh-restoration bug.
- Help and miss durability across reload.
- Idempotent per-slot attempts.
- The tutor admission gate that Live Tutor needs.

WHAT ITS AUDIT ADDS TO QUEUE 4:
- The course-route safety screen, now (step 2).
- Check provenance and the sync.ts:319 assisted=false bug. The assisted half goes into the 02b84e3 pass; the server half into M5.
- Consent hash mismatch, process-memory budgets and the missing account delete (M5).
- Outcomes isSecure including refresh (02b84e3 pass).
- Intent routing and the demo 1/6 bug (polish).
- Stale tutor context and the 80dvh drawer (polish/phase B).
- Spotlight not mounted and lib/voice bypassed (confirms phase B).
- The numbers-speller WIP recovery.
- The union-merge duplicate-ID risk (content-merge fix method).
- A fresh e2e baseline.
New owner decisions (listed separately) go into STATUS under 'Decisions needed from owner'. Existing credential, hygiene and people blocks carry forward unchanged.
