# Connected frontend — coordinator initial specification review

**Verdict: CHANGES_REQUIRED.** This is a specification gate, not a completed quality review or production approval. Initial implementation has real connected state and the happy path runs, but several ordinary state-transition sequences violate the build contract. Application files stayed read-only throughout this pass. Two fresh Fable scoped spec reviewers are separately checking age/EN–ES journeys and mobile/keyboard interaction; their findings are not assumed here.

## Verified baseline and evidence

All paths below are relative to `evidence/frontend-spec-initial/` unless stated otherwise.

- `prepare.py` preserved **14** implementation/test/contract files in `snapshot/`; `source-manifest.json` contains SHA-256 hashes. All **15/15** historical design baseline hashes matched. No git initialization/staging/reset/stash/commit or original-repository edit.
- `python3 evidence/frontend-spec-initial/rerun.py` ran the preserved original tests, with raw stdout/stderr: **43/43** unit tests and **97/97** browser assertions pass. Browser report enumerates **33** screenshots and zero recorded uncaught exceptions, console errors or external requests. This reproduces the implementer's result but does not establish the complete specification.
- `node evidence/frontend-spec-initial/adversarial-domain.cjs`: **11 pass / 5 fail**, desired-behavior assertions. Raw `adversarial-domain-initial.json`. Tests use fresh stores, fixed dates and injected deterministic timers; no mock result is fabricated.
- `OUT=<absolute evidence dir>/adversarial-ui-v2 node evidence/frontend-spec-initial/adversarial-ui-v2.cjs`: **6 pass / 14 fail**. Raw report/log and eight screenshots in `adversarial-ui-v2/`.
- `OUT=<absolute evidence dir>/proposal-ui-initial node evidence/frontend-spec-initial/proposal-ui.cjs`: **3 pass / 1 fail**, raw evidence in `proposal-ui-initial/`.

The fail counts are assertions, not distinct defects. The eight groups below deduplicate the findings. Domain and UI failures corroborate one another rather than being counted as separate issues.

### Browser methodology and one corrected harness assumption

The coordinator copied only the implementer's dependency-free CDP transport/input helpers and wrote independent cases/assertions. Pointer activation and text insertion use CDP input. Select fields use a real control plus a DOM value/change event (the inherited `choose` helper); this is **not** a fully native keyboard-select test. No debug command dispatcher is used, and `window.__demo` is read only for inspection. Separate Chrome profiles use the configured scratch directory.

The first `adversarial-ui-initial/` run contains 4 pass / 9 fail, including six harness failures. Cause: `Page.navigate` to the same file with a different fragment was a same-document navigation, not a clean app reset. `adversarial-ui-v2.cjs` explicitly navigates through `about:blank` between cases; assertions are unchanged. The first script/run are retained, not deleted or counted as app defects. The corrected run has no harness failures. Every later repair rerun must use a **new OUT** directory; the scripts refuse overwrite. To test repaired live source, set `APP_ROOT=/Users/man/education-product-discovery/frontend`; default is the frozen initial snapshot.

## Confirmed specification failures

### FSP-01 — Delayed create destroys another learner's unsaved form (high; AC-04)

**Repro:** parent Cal → Add task → type `Cal unsaved draft` and valid fields; switch Bea → create `Bea pending task` under Delayed scenario; switch Cal → reopen Add task before response.

**Observed:** when Bea's create completes, Cal's form closes and its title is blank when reopened. `ui.selected['lrn-68-cal']` becomes Bea's `task-1`. The actual domain task still belongs to Bea, so this is not evidence that persisted learner ownership changed; it is UI draft erasure and invalid cross-learner selection.

**Expected:** apply to Bea's originating form/selection only; preserve Cal's active form, text, selection and focus. Source: `frontend/app.js:359` reads `ui.learnerId` inside the delayed `onOk`; `select()` also reads current learner. Inspect all analogous intake/form callbacks, not only this line. Evidence: browser v2 checks 1–4, `01-cross-learner-after.png`.

### FSP-02 — Task drafts leak and later typing is erased (high; AC-04/09)

**Repro A:** student starts sample A, types `Unsent work for task A` without submitting, opens/starts sample B. B displays A's draft. **Repro B:** return A, submit `First submitted step` under Delayed, type `Newer unsent step` before response.

**Observed:** the original submitted step is stored correctly, but the newer draft becomes empty on success. Shared per-learner `step`, `obs`, `answer`, `tally` fields are not task-bound (`app.js:18`); success clears mutable `d.step` without checking the submitted revision (`:262`).

**Expected:** task-linked drafts stay with their task; completion may clear only the exact submitted revision, never newer/unrelated work. Include observations, proposal forms, intake and edited/new-task drafts where the same callback pattern applies. Evidence: `02-task-draft-leak.png`, `03-newer-step-cleared.png`, corresponding v2 assertions. Do not fix by silently discarding drafts on navigation.

### FSP-03 — Retry skips operation-specific success handling (high; AC-03/04)

**Repro:** student writes one step, Fail once → Add step → Retry.

**Observed:** service stores the step, but input still contains the submitted text and toast says `Task created locally (demo memory).` Pressing Add step again appends an identical second contribution. `retryLast()` (`app.js:100–105`) reruns the service only, loses original callbacks/form context, and always uses the task-created message.

**Expected:** retry must use the same scoped success/error handling and truthful operation-specific feedback as the initial command, preserve newer drafts, and not leave a stale submit form implying the first action remains unfinished. This is not a request to prohibit legitimately identical future student contributions. Evidence: `04-retry.png`, v2 retry assertions. The simple service-only retry itself passes.

### FSP-04 — Record navigation can show the wrong task; All is unreachable (high; AC-01/02)

**Repro:** select task A in Record picker; go to Schoolwork, select B, click B's `Open in Record`. Then select All in Record.

**Observed:** B's link leaves picker on A; choosing All immediately falls back to selected B. Source: `app.js:317–320`, explicit recordTask overrides task-specific navigation, while null conflates All with no selection.

**Expected:** task-specific links select that exact record; explicit All remains All. Existing filters can be remembered without overriding explicit navigation intent. Preserve correct observation task attribution. Evidence: `05-record-route.png`, two v2 assertions.

### FSP-05 — Archived work remains writable and can resurrect without Restore (high; AC-01/04/09)

**Repro:** student starts task A; parent archives A with confirmation; navigate Workspace through the main nav, switch student; click Mark done.

**Observed:** archived Workspace still offers Add step/help/Mark done; Mark done changes status from `archived` to `done`, without Restore. Domain `requireActive` (`domain.js:195–199`) checks started state but not archive; `markComplete` (`:287–294`) writes done. Workspace (`app.js:240–279`) does not render archived read-only state.

**Expected:** archived records/history remain viewable, but mutation actions are blocked at UI AND domain boundaries until explicit restore. Undo/Restore is the restoration path. Evidence: two failing domain checks and `06-archived-workspace.png`; UI assertions verify initial archive succeeded before unintended resurrection.

### FSP-06 — Delayed approval accepts an unreviewed replacement draft (high; AC-02/04/09)

**Repro:** make draft A; Delayed → Accept A; switch Normal → request a new draft B before A's approval returns.

**Observed through controls:** reviewed `plan-5`, replacement `plan-7`, accepted current `plan-7`. Domain/service probe independently reproduces the same identity error. `acceptDraft` command carries learner ID only (`app.js:296`, `demo-service.js:37`); dependency snapshots track task generations, not the plan ID/revision being decided. Domain accepts whichever draft exists at execution.

**Expected:** approval/decline binds the exact reviewed draft ID/revision. Replacement/reset/decision invalidates an old response, rather than approving a newer plan. Preserve previous accepted plan and decision history on rejection. A disabled button alone is not the domain/service fix. Evidence: `07-draft-identity.png`, v2 and domain assertions.

### FSP-07 — Editing sample instructions retains the old answer key/help (high; AC-05/08/09)

**Repro:** edit the math sample title to `Two plus two`, instructions to `What is 2 + 2?`; student opens it and checks `225`.

**Observed:** checker remains enabled and returns `match`/green “Matches the sample answer.” Sample classification survives all edits (`domain.js:107`) and capability lookup trusts `task.sample` (`:264–270`, `app.js:247–270`).

**Expected:** a content/subject edit must detach obsolete instructional capability (organization-only with honest labels), or preserve immutable reviewed content through an explicit fork flow. Pure due-date changes need not discard a valid key. Never rewrite prior assistance/evidence to pretend the edited task was always that content. Evidence: domain assertion and `08-wrong-checker.png`; screenshot is scrolled to checker, so the edited instructions are established by DOM-driven edit and raw test state, not claimed visible in that screenshot.

### FSP-08 — Stale proposal silently overwrites a newer parent date (high; AC-04/09, true date provenance)

**Repro:** Cal proposes Oct 6 → Oct 9; parent edits task due to Oct 12; parent accepts the old proposal from Plan.

**Observed:** displayed proposal still promises Oct 6 → Oct 9, but actual change is Oct 12 → Oct 9. Domain (`domain.js:414–426`) checks archive and pending decision, not that current due still matches `fromDue`. The task-change audit retains actual before/after; the decision UI is stale, not an allegation that all stored provenance was erased.

**Expected:** reject/mark stale and request a fresh proposal or explicit conflict re-review before applying. A historical unreviewed request cannot silently overwrite the newer parent decision. Evidence: independent domain failure and `proposal-ui-initial/report.json`, before/after screenshots. Actual final due `2026-10-09`, expected preserved `2026-10-12` absent renewed approval.

## Preserved passing invariants

Strict whole-number comparison, no-help completion remaining self-report without invented assistance/mastery, unsupported custom-task grading, idempotent scripted replay, declined draft rejection, unrelated-edit staleness, archive/restore history retention, underlying originating learner routing, pending cancellation/reset invalidation, and basic service fail-once retry passed the independent domain probes. These must stay green; fixes must add coverage, not weaken old assertions.

## Visual inspection and limits

Coordinator loaded and inspected saved desktop accepted-plan, 320px parent Schoolwork, 390px student Workspace picker, archived Workspace and wrong-checker screenshots. The desktop plan has clear current/draft/schedule/history sections and explicit local provenance. The 320px list wraps actions below task text; demo chrome is tall, nav text small, and the learner select's long label clips within its control. The 390px baseline Workspace screenshot is a **task picker**, not a full work session, so it cannot certify mobile work controls. Two right-column panels on the desktop Workspace stretch to large empty areas. These observations do not replace measured contrast/target/focus or a completed mobile journey; that scoped independent review remains pending. No native device/AT/Spanish/child-usability/learning-effect validation.

Initial writer disclosed deletion of intermediate browser-run directories. Its retained final log and red unit logs do not reconstruct those deleted runs. Coordinator snapshots/raw initial and corrected runs are preserved without deletion. No claim of complete implementer evidence retention.

## Next gate

Combine the two pending scoped specification reports with these reproduced findings, adjudicate duplicates/expectation errors, and dispatch **one** Fable repair writer with an exact bounded scope (new frontend repair cycle 1 of at most 2). No new app architecture or curriculum phase is authorized. Rerun unchanged baseline and independent probes against repaired source with fresh OUT paths. Only after specification PASS may the fresh code-quality stage start. Old PHONE-STALL origin remains unresolved and historical design/ stays unchanged. Current new frontend is open in preview as **verification pending**, not finished.
