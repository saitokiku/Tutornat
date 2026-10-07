<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/kaizen-research/06-evidence-integrity.md -->

**RO-5 — Evidence integrity: the existing engine can falsely confirm mastery**

**Disposition: beta blocker remains.** All three reported KaizenEdu paths reproduced with the actual source in an isolated service harness. A tutor-authored check can produce `itemId: null` evidence, reach `confirmed`, and produce the parent-facing label `mastery confirmed`. Confirmation occurs at 24 hours; a recorded hint in the preceding session is invisible. ADR-0042 §3.1 is not implemented by this engine. No repair or release approval is claimed by this report.

The concurrency and evidence tests below execute application code and SQL against a documented SQLite adapter. They are **not PostgreSQL deployment, locking, RLS, or privilege verification**. PostgreSQL initialization was blocked by the execution sandbox. That limitation does not affect the pure 24-hour rule reproduction or the demonstrated application call chain, but live database enforcement still needs independent reproduction before release.

**Scope and reproducibility**

Read first: SPEC §3.1 (`vault/40-projects/kaizenai-saas/SPEC.md:50`), [accepted ADR-0042](/Users/mann/pm/vault/30-decisions/ADR-0042-practice-buys-the-exam-seat-never-the-grade.md), prior K3 findings (`shared/artifacts/astra-plan-20260912/kaizen-second-opinion.md:59`), and prior N4 findings (`shared/artifacts/astra-plan-20260912/northstar-stress.md:61`). The evidence-model subsection is SPEC §3.1; ADR-0042 supplies the accepted decision and consequences.

Repositories inspected read-only:

| Repository | Inspected HEAD |
|---|---|
| KaizenEdu | `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe` |
| Kaizen-AI | `91af9e452c7df5867afa7249a6dc58b00003f531` |

The harness transpiles original TypeScript in memory with the locally cached TypeScript 6.0.3, running Node v22.12.0. It executes the actual turn engine, tag parser, check constructors, local grader, hint query, evidence writer, mastery service, pure student model, session load/save code, and report label/headline functions. The HTTP clock test executes the original `POST` function and its field filtering, without a network listener. It substitutes authentication and HTTP response plumbing; it is not an authentication test.

Substitutions are explicit in [ro5-reproduce.cjs](/Users/mann/pm/shared/artifacts/kaizen-research/ro5-reproduce.cjs): deterministic LLM output; a fixed skill/context; permissive safety for synthetic arithmetic inputs; a fixed entitlement and zero spending; logging and prompt loading. No live model, learner, deployed account, credentials, or production database was used. A fabricated model output tests acceptance of that output, not the likelihood that a particular model generates it. [The loader](/Users/mann/pm/shared/artifacts/kaizen-research/ro5-loader.cjs) makes no source edits.

SQLite 3.47.0 executes the emitted SQL with PostgreSQL casts removed, JSONB values decoded as node-postgres would decode them, fixture UTC time substituted for `now()`, and fixture table definitions. Evidence timestamps emulate the server default. Relevant primary keys and append-only triggers exist in the fixture, but this is not the complete PostgreSQL schema. Ordered UTC strings stand in for timestamptz; booleans are stored as integers. Concurrency tests pause calls only at real query boundaries. They prove accepted application interleavings; SQLite cannot validate PostgreSQL row-lock or role behavior. Full raw queries, parameters, final evidence, and mastery rows are saved as `ro5-trace-<case>.json` beside this report.

Every case was also run in a fresh process with a fresh in-memory database. The exact command, full output, and exit status for each are in the appendix and corresponding `ro5-output-<case>.txt`. All 17 isolated commands exited 0 because their assertions matched the observed outcomes, including expected vulnerabilities. This is **not a passing product integrity suite**. Source hashes and the machine-readable results are in [ro5-source-hashes.json](/Users/mann/pm/shared/artifacts/kaizen-research/ro5-source-hashes.json) and [ro5-isolated-results.json](/Users/mann/pm/shared/artifacts/kaizen-research/ro5-isolated-results.json).

To repeat the isolated runs, from this working directory:

```sh
node ro5-run-isolated.cjs
```

**Results and causal paths**

| Path | Verdict | Observed result |
|---|---|---|
| (a) Tutor-authored check → null item → mastery | **Reproduced** | Four generated correct checks reach `mastered`; the fifth at +24 h reaches `confirmed`. Five null item IDs, zero bank lookups, all representations null. Actual report functions label it `mastery confirmed` and count one confirmed skill. |
| (b) 24 h against required 48 h | **Reproduced** | At 24 h minus 1 ms: `mastered`; at exactly 24 h: `confirmed`. |
| (c) Help in one session, check in the next | **Reproduced** | The turn engine records a real hint event. The old session sees it; the next session does not. A check one second after that help is treated as unassisted and confirms. |
| Same-session help followed by two checks | **Reproduced** | First check is assisted and stays `mastered`; the following check, two seconds after the hint, is unassisted and confirms. |
| Assisted practice contributes to the threshold | **Reproduced** | Four assisted successes across two sessions yield estimate 0.87995 and `mastered`. Later help does not reset the deadline; one unassisted success an hour after that help confirms. |
| Completed attempt submitted again sequentially | **Not reproduced** | Second submission returns `NO_PENDING_CHECK`; one result and one counted item remain. |
| Same attempt submitted concurrently | **Reproduced in the service harness** | Both requests capture pending state; both return success. Two result rows share one check ID. Item count increases from 4 to 6. No transaction is opened. |
| Failure after evidence/mastery write, then retry | **Reproduced** | Injecting failure at session save leaves the first result persisted and the attempt pending. Retry writes a second result and counts the same attempt twice. |
| Exact same bank item repeated | **Reproduced** | Five actual turn-engine bank lookups of one fixture reviewed item lead to `confirmed`; one item ID and one representation supply all five results. |
| Different IDs from one item family | **Reproduced** | Five variants of one addition template, one representation, reach `confirmed`. Family metadata is discarded by the check constructor and absent from result evidence. |
| Client-supplied mastery clocks | **Not reproduced** | Extra `now`, `issuedAt`, `submittedAt` and 200 h of `latencyMs` do not advance the mastery clock, both through the service and the actual POST parser. HTTP result remains `mastered`. Latency telemetry is accepted as client data. |
| Generated wrong answer key | **Reproduced** | For “Compute 2 plus 2.” a generated key of 5 grades answer 5 correct and answer 4 wrong. The wrong answer reaches `confirmed`. |
| Instruction without a `hint *(PM vault: `hint`)*` tag | **Reproduced** | The engine emits a worked answer, records no hint and an unassisted turn, then confirms a check one second later in the same session. |
| Hint commits during grading | **Reproduced in the service harness** | A hint committed after the hint-query snapshot and before result insertion does not change the captured `assisted: false`; the result confirms. |
| Null/ungraded model response | **Not reproduced** | An ungradable short answer writes `ungraded: true` and returns `mastery: null`. |
| Reviewed-bank availability | **Reproduced source-data finding** | 118 authored items; zero with both review fields; the actual bank loader accepts zero reviewed items. |

For (a), turn/engine.ts:447 (`shared/repos/KaizenEdu/lib/tutor/turn/engine.ts:447`) accepts the parsed pending check directly when no `itemId` was requested. checks/prompt.ts:124 (`shared/repos/KaizenEdu/lib/tutor/checks/prompt.ts:124`) creates its key, sets `itemId: null` and `representation: null`, and checks/service.ts:104 (`shared/repos/KaizenEdu/lib/tutor/checks/service.ts:104`) persists that result. At service.ts:125 (`shared/repos/KaizenEdu/lib/tutor/checks/service.ts:125`), **any non-null grade** enters `recordCheckOutcome`; item identity, reviewer, assessment mode, context, family, scorer provenance and delay since teaching are not qualification arguments. The model’s reference answer is treated as the truth of local grading. Keeping that key off the browser is a useful existing protection; it does not establish that the key is correct or independent of the tutor.

For (b), student-model.ts:20 (`shared/repos/KaizenEdu/lib/tutor/model/student-model.ts:20`) is literally 24 h. Lines 98 onward (`shared/repos/KaizenEdu/lib/tutor/model/student-model.ts:98`) increment estimate/items for assisted observations too; the deadline begins when `mastered` is entered, not after the last instructional exposure. Assisted success preserves that deadline. Merely replacing 24 with 48 leaves the assistance, novelty, repeated-day and authority defects intact.

For (c), evidence.ts:47 (`shared/repos/KaizenEdu/lib/tutor/model/evidence.ts:47`) restricts **both** hint and last-result subqueries to the supplied session. It also forgets a hint once a later result exists. engine.ts:411 (`shared/repos/KaizenEdu/lib/tutor/turn/engine.ts:411`) depends on the generated hint tag; engine.ts:547 (`shared/repos/KaizenEdu/lib/tutor/turn/engine.ts:547`) writes those hints. `touchSkill` updates last-seen time, without invalidating eligibility. This explains why cross-session help, untagged instruction and the next check after an assisted result all bypass the intended exposure rule.

The race is a read–grade–append–upsert–clear sequence: check service (`shared/repos/KaizenEdu/lib/tutor/checks/service.ts:44`), unlocked mastery read/upsert (`shared/repos/KaizenEdu/lib/tutor/model/service.ts:197`), and unconditional session update (`shared/repos/KaizenEdu/lib/tutor/session/service.ts:290`). The DB wrapper has a transaction helper (`shared/repos/KaizenEdu/lib/tutor/db/client.ts:67`), but the check route does not invoke it (`shared/repos/KaizenEdu/app/(learner`)/api/tutor/check/route.ts:74). The deterministic race schedule is two completed pending-state reads, first request finishes, then second proceeds using its captured pending state. This is different from a second request that starts after pending state has been cleared; that ordinary retry is correctly refused.

Novelty is not enforced by qualification. getBankItem (`shared/repos/KaizenEdu/lib/tutor/graph/items.ts:291`) accepts an ID without a novelty or review predicate; the item-bank loader’s review gate is a separate path. RawItem.context (`shared/repos/KaizenEdu/lib/tutor/graph/items.ts:36`) is explicitly not stored in `check_items`. `usedItemIds` is session state and does not give learner-wide family independence. The repeated-family fixture supplies family metadata to demonstrate its loss; the current production type does not define such a field. Exact repetition also confirms through the full turn-engine bank branch, so the defect does not depend on how “near duplicate” is defined.

The final claim is not confined to an internal score: the report label (`shared/repos/KaizenEdu/lib/tutor/report/parent-report.ts:76`) and weekly lead (`shared/repos/KaizenEdu/lib/tutor/report/lead.ts:54`) trust `confirmed`. The generated chain reaches both functions. Mastery-change evidence (`shared/repos/KaizenEdu/lib/tutor/model/service.ts:215`) contains counts and status but no qualifying-check reference or rule version. Thus the displayed assertion cannot provide the ADR-required audit proof, even though session/check result rows exist. The report’s existing categorical assurance at parent-report.ts:20 (`shared/repos/KaizenEdu/lib/tutor/report/parent-report.ts:20`) overstates what these reproductions support.

**SQL protections: useful parts, insufficient authority boundary**

These are high-confidence source findings, **not executed PostgreSQL grant/trigger tests**. Kaizen-AI is a separate implementation; its migrations do not silently protect KaizenEdu’s different table names.

| Source | What it actually supplies | What it does not establish |
|---|---|---|
| 0012, `kc_item` (`shared/repos/Kaizen-AI/supabase/migrations/0012_kc_library.sql:139`) | Item ID, context, answer specification, status/reviewer fields; client table and answer-column privileges revoked. | A reviewed item being mandatory for every qualifying write, or a separate assessment-only service principal. |
| 0013, `evidence` (`shared/repos/Kaizen-AI/supabase/migrations/0013_evidence_ledger.sql:31`) | Enumerated kinds/verifiers, assistance defaults true, own-user read policies and revocation of client writes; a derived estimate and server-owned attempt item list. | Restricted authority between tutoring/reporting and the service-role evidence writer. Item ID is nullable; evidence has no unique finalized attempt/item identity. |
| 0030 (`shared/repos/Kaizen-AI/supabase/migrations/0030_mastery_law_hardening.sql:36`) | Server-persisted independence flag, one unsubmitted check per user/KC, independent scheduling floor. | Exactly-once submission/finalization or qualifying evidence; the index controls issuance. Expiry alone does not remove a row from its predicate. |
| 0034 (`shared/repos/Kaizen-AI/supabase/migrations/0034_trellis_foundations.sql:23`) | Correction reference and UPDATE rejection on evidence. | Append authority, semantic truth of new rows, or a DELETE prohibition. The migration explicitly permits removal for deletion/retention. |
| KaizenEdu schema (`shared/repos/KaizenEdu/lib/tutor/db/schema.ts:117`) | A mutable mastery table and evidence UPDATE/DELETE trigger. | Assessment-role grants/RLS, constrained evidence classes/verifiers, a non-null item/attempt reference, duplicate-check uniqueness or rule-version proof. The trigger prevents alteration of existing rows; it accepts new false rows through the common writer. |

Kaizen-AI’s ENGINE.md (`shared/repos/Kaizen-AI/docs/ENGINE.md:44`) specifies 48 h, verified evidence and two contexts. Treat these as requirements/concepts to port, not inherited verification. Its current gradeCheck sequence (`shared/repos/Kaizen-AI/web/lib/engine/check.js:203`) reads submission state, appends evidence, then updates the attempt; its concurrency behavior was **not runtime reproduced in this task**. It needs its own PostgreSQL test if reused. Likewise, PFA’s context fallback (`shared/repos/Kaizen-AI/web/lib/engine/pfa.js:114`) can substitute item ID for missing context; that source rule must not be adopted as proof of independent contexts or families.

The PostgreSQL documentation confirms that individual statements commit independently without an explicit transaction block. Therefore the check workflow needs one transaction for its authoritative finalization, rather than merely an available helper. [PostgreSQL transactions](https://www.postgresql.org/docs/18/tutorial-transactions.html)

RLS complements grants; it is not a service separation mechanism when all writers use the same powerful role. Owners normally bypass RLS, and superusers/BYPASSRLS roles always bypass it. `FORCE ROW LEVEL SECURITY` subjects an ordinary owner to policies but does not cure a runtime identity able to change those policies. `TRUNCATE` is outside RLS. [PostgreSQL row security](https://www.postgresql.org/docs/18/ddl-rowsecurity.html)

Use separate migration ownership and restricted runtime roles; revoke unwanted inherited/PUBLIC privileges, including table mutation and function execution. Owners can re-grant their own privileges, so revoking an owner’s ordinary INSERT alone is insufficient. [PostgreSQL privileges](https://www.postgresql.org/docs/18/ddl-priv.html) A `SECURITY DEFINER` append/finalize function must use a trusted `search_path`, put `pg_temp` last, qualify referenced objects, and revoke PUBLIC execution in the transaction that creates it. Grant execution only to the intended service. [PostgreSQL secure functions](https://www.postgresql.org/docs/18/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)

**Minimal repair contract — proposed, not implemented**

Changing the model prompt, adding `itemId != null`, extending the timer, or putting writes in a transaction individually cannot satisfy ADR-0042. The minimum is a small trusted assessment path plus separation of its evidence from practice. Keep the existing tutor and practice estimate where useful; remove their power to certify.

| Repair | Enforced invariant | Required proof before release |
|---|---|---|
| 1. Separate evidence authority | Only the restricted assessment service can append qualifying `unassisted-attempt` / `delayed-retention` events. Tutor may record `assisted-help` / `corrections-practice`; reporter only reads a tenant-scoped derived view. Tutor/report identities cannot execute finalization, write mastery, edit keys, or alter protection mechanisms. | Attempt qualifying inserts and finalization as learner, tutor and reporter: denied by PostgreSQL. Assessment principal succeeds only for a valid authorized attempt. Cross-tenant reads/writes fail. Test view-owner/RLS behavior and inherited privileges too. |
| 2. Protect item and scorer provenance | Every qualifying result references a server-issued attempt, immutable reviewed item/key/rubric version, trusted context/family labels, and scorer/version. The tutor cannot author/select the certifying key or feed its own reference answer into a qualifying grade. Ambiguous grading abstains pending independent adjudication. Missing/unreviewed provenance fails closed. | Generated/null-ID checks remain practice only; wrong-key fixture cannot certify; no approved items means no assessment. Exposed keys and previously used families cannot become unfamiliar merely through a new ID or session. |
| 3. Record exposures across sessions | A learner/skill exposure record covers instruction, hints and answer exposure across text, voice, board, homework and checks. Persist exposure before delivering assistance. Any help during the attempt permanently disqualifies it; reset eligibility for that skill across sessions. Use validated skill mappings; uncertain relevant exposure cannot be silently ignored. | Cross-session and untagged help reset the same skill’s 48 h clock; another skill’s help does not. A later answer/check cannot erase an attempt’s disqualification. Race help against issue/submit/finalize. |
| 4. Make finalization atomic and idempotent | One authoritative submission and qualifying base result per attempt/item. Bind attempt to tenant/learner and freeze issued content, response and rule version. Atomically claim/finalize, append evidence and update the projection. Retries return the recorded result without new credit; conflicting answers are rejected. | Reproduce duplicate, concurrent, different-answer and crash/retry cases on PostgreSQL; exactly one base result and one contribution survive. Test concurrent different attempts on one skill for lost updates as well. |
| 5. Derive qualification from versioned rules | Practice contributes **zero** to mastery. Assessment eligibility is >=48 h since last relevant instruction, measured on the server; unfamiliar qualifying evidence must span two contexts and separate days, with the second check around day seven. Sessions, item counts and representations alone are not substitutes. | 48 h minus 1 ms refuses; the boundary qualifies only when all other conditions hold. Assisted streaks never certify. Repeated items/families cannot meet independence. Early/day-seven-window/missing-retention cases produce accurate interim states. |
| 6. Make every claim replayable | A server-derived claim identifies qualifying evidence IDs, attempt/item/skill versions, assistance/exposure provenance, scorer/rubric versions, applied rule version and evaluation time. Reports use that view. Corrections append provenance/supersession, never relabel old assisted attempts. | Delete/rebuild the **test projection** from retained evidence and the stored rule version: identical claim and evidence set. Tutor/report writes cannot change it. Invalidating an item/key through an authorized correction withdraws unsupported derived claims without rewriting history. |

Suggested minimal data boundary: `assessment_attempt` (server identity, issued item/version, mode, response/submission lifecycle, assistance latch, exposure sequence snapshot); `evidence_event` (the four specified classes, immutable source/score provenance, attempt/item references and correction references); `assessment_rule_version`; and a rebuildable `mastery_projection` whose contributing IDs can be enumerated. Existing skill/item tables may be extended rather than replaced. The actual table design can differ if these invariants survive.

A transaction alone does not prevent two readers from observing pending state. Use a shared learner/skill guard row plus attempt row locking, or an equivalent checked compare-and-set with retry, and a unique constraint on the base finalized attempt/item evidence. All relevant assistance and qualification writers must share that ordering. Do not include `rule_version` in a uniqueness key in a way that lets the same attempt count twice as new evidence; re-evaluation under a new rule is a new derived decision. PostgreSQL’s default Read Committed isolation still permits separate statements to see different committed states; locking/conditional state transitions must make the workflow explicit. [PostgreSQL isolation](https://www.postgresql.org/docs/18/transaction-iso.html), [row locking](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-ROWS)

Do scoring outside long-held database locks if necessary, then revalidate the immutable response, assistance latch, exposure sequence, ownership, content version and timing in the finalization transaction. Define the attempt’s assistance-observation interval precisely. A help event after that interval restarts future eligibility; it must not retrospectively be represented as help during an already completed assessment. Equal timestamps need causal ordering, not a strict `>` query that forgets simultaneous events. Keep timing inputs server-owned. `CURRENT_TIMESTAMP`/`now()` is transaction-start time; choose the trusted event-time function deliberately and persist event order. Client latency stays untrusted telemetry. [PostgreSQL clocks](https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)

The day-seven **anchor and acceptable window**, day-boundary timezone, family/context rubric and rule-change treatment need explicit versioned definitions before release. SPEC says “around day seven” without those mechanical boundaries; inventing them inside code is not verification of the SPEC. Display an independent success with retention pending until the full chosen rule is satisfied.

Preserve ADR-0042’s access mechanism in this repair: count ten clean practice reps using a versioned rule to prioritize a quiet window; record its planned/actual start, restarted eligibility, check offer and take-up. Offer the assessment as eligibility opens. Escalate inability to obtain a quiet window within 14 days to the parent, while continuing help on other skills. Rep threshold, window length and escalation use the stored rule version. Record reps-to-first-eligible-check, offers versus takes, pass rate by rep count and escalation frequency. These events affect access and reporting, never the qualifying evidence total. This scheduling behavior was not implemented or runtime tested here.

Containment comes first: keep the no-learner gate in force and suppress unsupported mastery assurances on every surface before exposing any repaired slice. Preserve existing evidence as legacy provenance; do not grandfather old `confirmed` rows into ADR-0042 or relabel assisted history. Recompute only where retained provenance is sufficient; otherwise require fresh qualifying assessment. Reviewed content is an independent immediate dependency: closing generated checks currently leaves zero accepted bank items. Keep deletion/retention on a separately authorized path; do not give the general tutor runtime the ability to disable evidence triggers.

**What code cannot establish**

“Unassisted” can only mean **no assistance observed under the stated protocol**. Browser/session telemetry cannot prove that another person, phone, website or previously seen answer was absent. More intrusive monitoring does not turn missing observations into proof. Higher-stakes claims require an independently administered protocol and appropriately limited wording. This is already explicit in SPEC §3.1 (`vault/40-projects/kaizenai-saas/SPEC.md:59`).

An ID, family label, signature or delay does not establish that a task measures the skill, that two forms are equivalent, that a key is correct, or that observed performance generalizes to unfamiliar work. Those require content review, a defensible assessment design and empirical validation. Software can enforce the chosen protocol and preserve its limitations. Ten clean reps is a versioned product policy, not evidence of its educational optimality or efficacy.

Database restrictions protect against ordinary application identities, not a malicious database owner/superuser, compromised assessment service, false external attestation or incorrect content review. The issuer and operational controls remain part of the trust boundary. This task neither assessed actual learner outcomes nor established production deployment state.

**Confidence, limits and facts that could change the conclusion**

High confidence: the reproduced TypeScript behaviors and fixed fixture outcomes; source statements and named migrations at the recorded commits. The SQLite query adapter and deterministic interleavings bound the runtime claim; live PostgreSQL guarantees are unverified. No network was used for reproduction. Official PostgreSQL documentation was fetched for the repair analysis after local documentation was unavailable; ego-browser could not connect from this sandbox, so the web reading tool was used. No repository content was sent to an external service. The research skill requested a background review; agent startup failed, so this report is a single-agent analysis, not independent review sign-off.

Three facts that would materially change the assessment:

1. A different deployed commit or an enforced production gateway demonstrably makes these entry points unreachable. That would narrow deployment exposure, without making these source paths compliant.
2. Real PostgreSQL role, constraint, trigger and concurrent-route tests demonstrate additional enforcement outside the inspected code. That could refute database-level exploitability under that deployment, but must not be inferred from configuration or migration filenames.
3. A repaired qualification service plus independently reviewed content and successful end-to-end reproduction of the invariants above. That is closure evidence; an updated prompt, a new timer value, or a passing mock suite alone is not.

PostgreSQL startup probe (exact command and decisive output):

```text
$ /Users/mann/pm/shared/eval/pc-cli/node_modules/@embedded-postgres/darwin-x64/native/bin/initdb -D /Users/mann/pm/shared/artifacts/kaizen-research/ro5-pgdata -A trust --no-locale -U ro5_owner
running bootstrap script ... 2026-09-12 17:04:15.977 CDT [94872] FATAL:  could not create shared memory segment: Operation not permitted
2026-09-12 17:04:15.977 CDT [94872] DETAIL:  Failed system call was shmget(key=5141907, size=56, 03600).
child process exited with exit code 1
initdb: removing data directory "/Users/mann/pm/shared/artifacts/kaizen-research/ro5-pgdata"
exit=1
```

The command failed before a test PostgreSQL server existed. No live database was substituted, no sandbox escalation was attempted, and no PostgreSQL roles, transactions or migrations were claimed as executed.

**Exact isolated command/output appendix**

Run from `/Users/mann/pm/shared/artifacts/kaizen-research`. Each case starts a new process and its own fixtures. `T0` is the synthetic fixture timestamp `2026-01-01T12:00:00.000Z`, except the HTTP route clock control deliberately uses the real server clock. The check IDs in raw traces are generated by the actual random-ID function.

**`generated_chain`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs generated_chain
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"generated_chain"}
{"case":"generated_chain","verdict":"REPRODUCED","statuses":["in_progress","in_progress","in_progress","mastered","confirmed"],"nullItemRows":5,"bankLookups":0,"representations":[null,null,null,null,null],"mastery":"confirmed","parentLabel":"mastery confirmed","headline":"1 of 1 skill confirmed, 1 this week","masteryEventHasCheckId":false,"masteryEventHasRuleVersion":false,"source":"real startTurn -> pendingFromTag -> answerCheck -> recordCheckOutcome -> applyCheck -> report label/lead"}
exit=0
```

**`delay_boundary`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs delay_boundary
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"delay_boundary"}
{"case":"delay_boundary","verdict":"REPRODUCED","delayHours":24,"at24hMinus1ms":"mastered","at24h":"confirmed","requiredHours":48}
exit=0
```

**`cross_session_help`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs cross_session_help
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"cross_session_help"}
{"case":"cross_session_help","verdict":"REPRODUCED","sameSessionHint":true,"nextSessionHint":false,"secondsSinceHelp":1,"assisted":false,"status":"confirmed","hintRows":1}
exit=0
```

**`same_session_help_reset`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs same_session_help_reset
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"same_session_help_reset"}
{"case":"same_session_help_reset","verdict":"REPRODUCED","firstAssisted":true,"firstStatus":"mastered","secondAssisted":false,"secondStatus":"confirmed","secondsSinceHint":2}
exit=0
```

**`assisted_practice`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs assisted_practice
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"assisted_practice"}
{"case":"assisted_practice","verdict":"REPRODUCED","allAssistedStatus":"mastered","allAssistedEstimate":0.8799499999999998,"nItems":4,"delayResetByLaterHelp":false,"hoursSinceLaterHelp":1,"laterStatus":"confirmed"}
exit=0
```

**`duplicate_sequential`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs duplicate_sequential
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"duplicate_sequential"}
{"case":"duplicate_sequential","verdict":"NOT_REPRODUCED","firstOk":true,"secondOk":false,"secondCode":"NO_PENDING_CHECK","resultRows":1,"nItems":1}
exit=0
```

**`duplicate_concurrent`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs duplicate_concurrent
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"duplicate_concurrent"}
{"case":"duplicate_concurrent","verdict":"REPRODUCED","schedule":"both read pending; first completes; second resumes with captured pending","bothOk":[true,true],"sameCheckId":true,"resultRows":2,"nItemsBefore":4,"nItemsAfter":6,"status":"confirmed","transactions":0}
exit=0
```

**`partial_failure_retry`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs partial_failure_retry
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"partial_failure_retry"}
{"case":"partial_failure_retry","verdict":"REPRODUCED","injectedError":"injected session save failure","rowsAfterFailure":1,"rowsAfterRetry":2,"nItemsAfterRetry":2}
exit=0
```

**`repeated_item`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs repeated_item
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"repeated_item"}
{"case":"repeated_item","verdict":"REPRODUCED","resultRows":5,"distinctItemIds":1,"distinctRepresentations":1,"status":"confirmed","nItems":5,"bankLookups":5,"qualificationHasFamilyId":false}
exit=0
```

**`repeated_family`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs repeated_family
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"repeated_family"}
{"case":"repeated_family","verdict":"REPRODUCED","resultRows":5,"distinctItemIds":5,"fixtureFamilies":1,"distinctRepresentations":1,"persistedFamilyFields":0,"status":"confirmed"}
exit=0
```

**`generated_wrong_key`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs generated_wrong_key
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"generated_wrong_key"}
{"case":"generated_wrong_key","verdict":"REPRODUCED","stem":"Compute 2 plus 2.","generatedKey":5,"trueAnswer":4,"wrongAnswerGrade":true,"trueAnswerGrade":false,"itemId":null,"status":"confirmed"}
exit=0
```

**`client_clock`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs client_clock
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"client_clock"}
{"case":"client_clock","verdict":"NOT_REPRODUCED","attack":"client now/issuedAt/submittedAt/latencyMs force elapsed delay","status":"mastered","latencyAccepted":720000000,"masteryClock":"2026-01-01T12:00:00.000Z","serverClock":"2026-01-01T12:00:00.000Z","note":"route field filtering tested separately"}
exit=0
```

**`client_clock_route`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs client_clock_route
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"client_clock_route"}
{"case":"client_clock_route","verdict":"NOT_REPRODUCED","httpStatus":200,"status":"mastered","usedActualServerClock":true,"clientFutureHours":200,"latencyAccepted":720000000}
exit=0
```

**`untagged_instruction`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs untagged_instruction
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"untagged_instruction"}
{"case":"untagged_instruction","verdict":"REPRODUCED","hintRows":0,"turnAssisted":false,"secondsSinceInstruction":1,"assisted":false,"status":"confirmed"}
exit=0
```

**`help_during_grading`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs help_during_grading
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"help_during_grading"}
{"case":"help_during_grading","verdict":"REPRODUCED","schedule":"hint commits after hint SELECT snapshot, before check_result insert","hintRows":1,"resultAssisted":false,"status":"confirmed"}
exit=0
```

**`ungraded_control`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs ungraded_control
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"ungraded_control"}
{"case":"ungraded_control","verdict":"NOT_REPRODUCED","attack":"ungraded/null model response earns mastery","mastery":null,"ungraded":true}
exit=0
```

**`item_bank_review`**

```text
$ node --no-warnings --experimental-sqlite ro5-reproduce.cjs item_bank_review
{"runtime":"v22.12.0","typescript":"6.0.3","database":"SQLite 3.47.0; not PostgreSQL","selection":"item_bank_review"}
{"case":"item_bank_review","verdict":"REPRODUCED","authored":118,"withBothReviewFields":0,"validReviewedItems":0,"validationProblems":118}
exit=0
```

**Final artifact verification**

Clock read with `date`: `2026-09-12 17:20:02 CDT`. Work began at `2026-09-12 17:01:15 CDT`; this report is within the 45-minute box. All 17 isolated cases exited 0; 36 loaded source files still match their SHA-256 hashes. Both repository HEADs match the scope table and both final `git status --porcelain=v1` outputs are empty. Only working-directory research artifacts were written. The vault, STATE, SPEC and DIRECTION were not modified. [Verification record](/Users/mann/pm/shared/artifacts/kaizen-research/ro5-final-repo-verification.json).
