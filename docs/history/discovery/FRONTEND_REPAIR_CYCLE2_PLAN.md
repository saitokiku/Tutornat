# Connected frontend: FINAL repair cycle 2 execution plan

Planner: current `gpt-6-astra` coordinator. **Owner course correction: execution allocation is now `PARALLEL_DELIVERY.md` — three Fable/max builders with isolated ownership, a shared contract, and one coordinator integration.** The historical sole-writer directions below are superseded only for ownership, worker test repetition and demo availability. **Repair 2 of at most 2.** Seven adjudicated defects only; this is not a new build, backend phase or third historical-design repair. Current specification verdict is CHANGES_REQUIRED; a known-limits local demo may be shown before acceptance.

## Authority, ownership and hard stops

Workspace `/Users/man/education-product-discovery`. Active product authority is `DIRECTION.md` and `frontend/BUILD_CONTRACT.md`. `FRONTEND_REPAIR1_ADJUDICATION.md` reconciles the three returned reviews, coordinator replays and seven exact remaining defect groups. Do not change the acceptance contract to make this pass.

You alone may edit `frontend/` application source, append/update its README/design/backend-contract documentation, add NEW regression test files, create NEW evidence, and write `frontend/REPAIR_CYCLE2_REPORT.md`. Preserve all original and cycle-1 test assertions/files, cycle-1 report, existing evidence, snapshots, `design/`, root plans/backlog and original repositories. No git initialization/staging/commit/stash/reset, install/network/deploy/spending, credentials, real-child data, storage/audio/providers, new framework or curriculum. No subdelegation. Parent owns acceptance.

Remain zero-install/file-URL compatible. Family text is verbatim under documented validation, generated text is localized by known key/version, completion is self-report not mastery, arbitrary tasks have no live instructional support, Spanish is draft, and role selection is not authentication.

**Budget:** 35 tool calls OR 30 minutes, whichever arrives first. Save a substantive failing test/repaired slice within 6 calls. At the limit, save code/report and exact remaining failures, then stop. A limit is not permission to call incomplete work done. Browser probes need an internal deadline and finalization before the outer tool timeout; do not run the old twice-timed-out sweep. No fabricated output, removed red evidence or weaker assertions.

Pre-flight gate: source/tests match the repair-1 manifest; no concurrent writer. If not, checkpoint the discrepancy rather than repair an unreviewed tree. Revision gate: this is the last permitted implementation pass. Escalation gate: if it cannot meet the supplied behavior in scope/budget, return remaining failures; do not start another pass. No irreversible action is part of this plan.

## Verified starting state

`evidence/frontend-repair1-verification/source-manifest.json` names 17 files and `snapshot/` is the frozen repair-1 target. Coordinator verified both live and frozen bytes. Prior suites independently pass 49/49 unit, 16/16 original negative domain, 20/20 original negative UI, 4/4 proposal, 97/97 original journey and 73/73 compact repair. They do not cover the remaining defects.

Fresh coordinator replays under `evidence/frontend-repair1-adjudication/`: service 20/23; copy 44/52 (seven product assertions + one regex artifact); interaction 81/81 complete. Coordinator C1/C2 7/11 (`evidence/frontend-repair1-verification/coordinator-extra-v2.cjs`); supplementary copy 11/13 (`evidence/frontend-repair1-adjudication/coordinator-extra-copy.cjs`). The latter two failures are saved-tally singulars. All raw evidence remains unchanged.

Read application `demo-service.js`, `app.js`, affected `domain.js`/`copy.js`, original service tests and relevant regressions before editing. Use **vertical TDD**: one behavior's existing/new red reproduction, minimal root-cause fix, green check, then next behavior. Do not write every speculative test first or rewrite the renderer wholesale.

## 1. Repair retry identity and reset lifecycle (F2-01, R03/AC04)

Files: `frontend/demo-service.js`, `frontend/app.js`; NEW `frontend/tests/repair-cycle2.test.cjs` and `.e2e.cjs` as useful. Dependencies: none.

Observed root cause: `run()` checks fail-once before dependency invalidation; `retry()` re-dispatches history commands with fresh generations and no settled-success restriction. UI reset neither invalidates completion context nor clears the learner's failed operation. This permits pre-reset data resurrection. Existing service negatives S01/S02/S06 also show retry after version change and retry of successful addStep.

Required behavior:
- Initial attempts and every retry retain the **original** learner/task dependency snapshot and decision identity. Check invalidation before returning an actionable failure as well as before applying success.
- Retry may execute an eligible failed/cancelled operation only while its original dependencies remain valid. A reset/edit/archive cannot be bypassed by capturing fresh generations. Reject successful, superseded or otherwise ineligible operations without mutation.
- Preserve one logical operation across a retry chain. Concurrent duplicate retries and retrying the original failed ID after a descendant already succeeded must not apply again. Test **createTask as well as addStep**; a create has no existing task generation to accidentally save it. An intentionally separate future dispatch with identical text remains allowed. Keep the protected cancel→retry and fail-once→retry public contracts.
- The UI captures a per-learner reset identity at dispatch. Reset removes that learner's stale retry reference; a late obsolete completion cannot reintroduce Retry, change current form errors/status, clear new drafts or focus. Always settle/remove only the matching pending operation. Other learner operations still work.
- Preserve original command, callbacks, submitted draft revision and operation-specific feedback on eligible retry. Reset-before-failure and failure-before-reset must both remain safe.

Verification: run unchanged coordinator C1 actual controls; service negatives S01/S02/S06 become safe. Add red/green tests for duplicate create retries, successful descendant then old-ID retry, valid cancel retry, cross-learner reset isolation and retry while newer text is typed. Preserve old assertions. Document rejection semantics if a new error code is introduced and provide EN/ES mapping.

## 2. Preserve newer same-learner active task on create/intake (F2-02, R01/AC04)

Files: `frontend/app.js`, new browser regression. Depends on step 1's origin handling.

Observed: createTask success unconditionally selects its result; intake-confirm uses the same pattern. Existing origin learner ownership is necessary but insufficient.

Capture the submission's learner, form revision, selection and navigation intent. Automatic selection/focus is allowed only when the user has not moved to a newer task/context; otherwise create the task for its owner without replacing the current selection/view/draft. Apply this to both manual creation and intake confirmation, including retries. Continue clearing only the submitted originating form revision. Do not suppress the underlying record creation or discard later typing to hide the bug.

Verification: unchanged coordinator C2: create/start B, submit delayed A, switch to student Workspace B and type; A exists, B remains active and its text/focus survives. Add the intake variant and same-role task-selection variant; unchanged-context create still selects its new task with meaningful focus. Retain the prior cross-learner edit/intake/create and pending-input regression results.

## 3. Separate edit-field provenance from displayed locale and capability (F2-03/F2-04, R12/AC09)

Files: `frontend/app.js`; only necessary provenance changes in `domain.js`/`copy.js`; new regression tests. Depends on origin/revision discipline above.

**F2-03 / G1:** opening a generated sample edit in ES, switching EN, changing due only and saving currently emits title/instructions changes because comparison is against the *current* locale. Capture the edit draft's original field values/provenance (or explicit field dirtiness) at open time; do not reconstruct its baseline from current rendering at submit. Untouched generated fields are never submitted as family edits merely because language changed. Preserve dirty user text through locale/role/route changes and delayed retry; do not reset the form on locale change. Due-only save keeps canonical title/instructions, attached story/help/checker and records only the due edit.

**F2-04 / G2:** an actual instructions-only family edit detaches the old sample capability but must not erase generated provenance for the untouched title. Localize untouched generated fields using valid original sample key/version even after detachment. Family-edited fields remain verbatim. Keep a reliable per-field distinction through subsequent edits, not a heuristic that translates anything resembling a known sample string. A deliberately authored field equal to a canonical EN/ES sample string must not be silently treated as generated. Guard unknown/mismatched sample versions conservatively.

**Critical separation:** display provenance is NOT instructional capability. Do not broaden the existing `sampleOf()` used by Workspace to return detached samples, which would accidentally restore old help/story/checker. Use a rendering-only path or equivalent separation. Content/title/subject changes still invalidate support; due-only does not. Never rewrite prior assistance/events or relabel them as newly authored.

Verification: reviewer copy S2/S3 exact sequences, both ES→EN and EN→ES due-only variants, a genuinely typed field across locale switches, instructions-only/title-only edits, a subsequent second edit, and explicit authored-string coincidence. Inspect stored task bytes, event `changed/from/to` and all affected renderers (Today, Schoolwork/detail, Workspace, Plan, Record picker/edit form). Keep R07 obsolete checker and immutable assistance tests green. Snapshot current form baseline/revision; don't submit untouched stale fields over unrelated newer changes.

## 4. Correct bounded copy defects (F2-05/F2-06/F2-07, R13/R14)

Files: `frontend/copy.js`, localized label call sites in `app.js`; new control-driven assertions. Depends on step 3 only for shared rendering regression.

- **F2-05 / G3:** grades 3–5 student Record disclosure omits date proposals/decisions unavailable to that band. Grades 6–8 includes them. Retain actual work/help/scripted reply/check/stuck/done/observation visibility; preserve age-appropriate K–2 wording. Do not expand proposal eligibility to fix the copy.
- **F2-06 / G4:** parent Workspace counts use a parent-facing “Shared record for this task” equivalent in EN/ES, not “What your parent can see”. Student disclosure stays student-facing.
- **F2-07:** saving tally 0/1/2 produces `Tally: 0 marks`, `Tally: 1 mark`, `Tally: 2 marks`; ES `Conteo: 0 marcas`, `Conteo: 1 marca`, `Conteo: 2 marcas`. Use existing plural infrastructure or a small correct equivalent at save time. Preserve old saved text/history and all other counter behavior.

Verification: actual role/band/locale controls; reviewer G3/G4 plus coordinator supplementary tally assertions. The primary copy probe's “Bea · 2 tasks shown” failure is an adjudicated regex artifact, NOT a required product change. Preserve its original evidence; put any corrected semantic test in a new adapter, including learner prefix. Do not label raw 52/52 unless actually enumerated.

## 5. Run regressions, document boundaries, stop writing

Depends on all four slices. All commands run from workspace root. Use a NEW absolute OUT directory/file per run under `frontend/evidence/repair-cycle2/`; never overwrite earlier runs. `APP_ROOT=/Users/man/education-product-discovery/frontend` must target repaired source, not the frozen repair-1 baseline. Preserve exact commands and stdout/stderr with the JSON reports.

Required evidence:
1. `node --test frontend/tests/*.test.cjs` (original 49 plus new assertions); `node --check` each changed JS/test file. Original tests remain byte-identical.
2. `APP_ROOT=<frontend> OUT=<new json> node evidence/frontend-spec-initial/adversarial-domain.cjs`; original `adversarial-ui-v2.cjs` and `proposal-ui.cjs` with new OUT directories; original `frontend/tests/journey.e2e.cjs` and `frontend/tests/repair-cycle1.e2e.cjs` with new OUT directories. Don't relax existing assertions for changed behavior.
3. Unchanged `evidence/frontend-repair1-verification/coordinator-extra-v2.cjs` and `evidence/frontend-repair1-adjudication/coordinator-extra-copy.cjs` with repaired APP_ROOT and new OUT. New cycle-2 regressions cover the additional step-specific variants above.
4. Reviewer service script `evidence/frontend-repair1-state-review/service-negatives.cjs` writes its JSON beside itself. **Never run it in place.** Copy its bytes to a new cycle-2 evidence folder and run that copy with repaired APP_ROOT. Likewise preserve reviewer copy probe and its regex artifact; use a separately named new adapter only for the known prefix mistake. No assertion weakening. Rerun bounded interaction `evidence/frontend-repair1-interaction-review/spec-check-r15-r22.cjs` with repaired APP_ROOT and new OUT (about 76 seconds, hard watchdog 150 seconds), not the old long sweep.
5. Inspect actual 1440/768/390/320 screenshots from the bounded tests and record what was inspected. Update README/DESIGN_NOTE/FRONTEND_BACKEND_CONTRACT only where semantics changed. Record R05 ruling: archived work cannot mutate, but append-only attributed parent observations are permitted without restoration or history rewriting. Write `frontend/REPAIR_CYCLE2_REPORT.md` mapping **all seven F2 IDs individually** to tests, red/green paths, counts and remaining limits. Include source/test hashes, honest untested scope and no whole-product self-certification. Stop application writes after return.

Legacy compatibility and coverage: original 43 unit tests plus six repair-1 tests, original browser and repair-1 test files must not be edited. If a control legitimately changes, preserve the old failing run, add a separately named adapter retaining the behavioral assertion, and explain it. No deleting intermediate outputs. Existing sample/role/local-storage/CSP boundaries must remain intact.

## Parent acceptance after handback (not writer self-approval)

Coordinator freezes and hashes final source, independently reruns baseline and adversarial evidence, and commissions fresh read-only specification review. Preserve the explicit interaction coverage limits in `FRONTEND_REPAIR1_ADJUDICATION.md`; independent final acceptance can cover the remaining phone routes without expanding implementation scope. Only a SPEC PASS permits separate fresh quality/security review. Any remaining blocking defect after this cycle triggers an honest unresolved report and owner escalation, not a third automatic repair. Backend, real-user/device/AT/native-Spanish/curriculum/learning-effect checks and historical PHONE-STALL origin stay in the retained backlog.
