# Integrated frontend — coordinator verification

Status: **CHANGES_REQUIRED.** Fresh review is complete; `FRONTEND_REPAIR2_ACCEPTANCE.md` is the controlling coordinator decision and corrects the provisional S21 regression classification below. This report retains independent execution evidence, not worker self-approval or quality-stage acceptance. Same final repair cycle2; no third automatic repair. The existing local demo remains available.

## Source and integration

Frozen source: `evidence/frontend-repair2-integration/run-20261001T171113252686Z/snapshot/`. `manifest.json` records 24 source/test/doc hashes; 16 existing core/protected files remained unchanged during integration and 17 historical snapshot files match their manifest. Final live/source hashes matched at the end of all runs. The four allowed edited files were app.js, domain.js, copy.js and FRONTEND_BACKEND_CONTRACT.md. Four new test files were copied byte-identically from the page builders.

Only parent delta hunks were integrated: sparse authored-field detection, pure display-provenance helper, and refresh of untouched edit fields with their baseline. Core retry/reset and late-create selection code was preserved. Student source fixes were verified line-identical and required no overwrite. The sparse-patch interpretation is documented, but documentation alone cannot waive an earlier no-op invariant.

Before integrating, the coordinator reproduced the existing-sample canonical-title defect (one test, one expected failure; `parent-coincidence-before.log`). That case is green in the combined unit run. No old tests or red evidence were weakened/deleted.

## Independently executed suites

Every suite ran once on the same frozen integrated tree, not separately on worker copies. Counts were enumerated from checks/tests and reconciled with declared totals. Several legacy harnesses return exit 0 with failed checks; the table uses actual report contents.

| Suite | Passed / checked |
|---|---|
| unit | 72/72 |
| service | 22/23 |
| adversarial-domain | 16/16 |
| parent-pages | 54/54 |
| student-pages | 21/21 |
| repair-cycle2 | 60/61 |
| adversarial-ui | 20/20 |
| proposal-ui | 4/4 |
| journey | 97/97 |
| repair-cycle1 | 71/73 |
| coordinator-state | 11/11 |
| coordinator-copy | 13/13 |
| copy-review | 51/52 |
| interaction | 81/81 |
| playwright | 3/4 |

Raw commands, logs, parsed check lists and source checks: `evidence/frontend-repair2-integration/run-20261001T171113252686Z/results.json` and per-suite summaries. The coordinator runner returned 1 because failures remain; it completed without a run timeout. Legacy browser summaries report no page exceptions, console errors or external requests. This is scoped to those harnesses, not a claim about all possible use.

## Seven repair items

| Item | Integrated behavior / evidence | Disposition |
|---|---|---|
| F2-01 | Original dependency/logical retry identity, reset invalidation, duplicate suppression; cycle2 core controls, coordinator-state and unit regressions | Core behavior passes enumerated checks; cross-learner Retry-toast visibility limit retained |
| F2-02 | Delayed create/intake does not replace newer task/draft in tested controls; coordinator-state and desktop Playwright case | Tested core cases pass; rapid phone setup route fails before the delayed-create portion |
| F2-03 | Due-only ES↔EN edits preserve canonical storage/capability and true changed-field event; parent pages 54/54 | Required authored-draft safety passes; one intermediate core assertion expects untouched text to stay in its opening language, unlike the new refresh behavior |
| F2-04 | Untouched generated field localizes after detach; typed canonical coincidence stays authored; old help/checker does not return | Parent cases pass, but new generic unchanged-title detachment fails retained service S21; unresolved contract regression |
| F2-05 | Actual grade-aware EN/ES Record disclosure, no proposals for3–5, proposals/decisions for6–8, K–2 retained | Student tests pass; independent named student-pages adapter replaces neither old tests nor raw failures |
| F2-06 | Parent Workspace uses shared-record heading in EN/ES, student disclosure remains student-facing | Student tests pass |
| F2-07 | Exact saved tally0/1/2 singular/plural EN/ES; old text/event history retained | Student tests and coordinator-copy pass |

## Failures and reconciliations

1. **S21 remains open.** Service update `editTask({title: current.title})` now detaches the generated sample, whereas the retained service invariant treats it as a no-op. The parent fix infers authorship from field presence rather than a separate intention signal. Deliberately authored text coinciding with canonical storage and an ordinary no-op must be distinguished; worker intent or a newly added contract note is not sufficient to discard a retained test. Fresh reviewer is adjudicating. Due-only behavior still passes.
2. **Rapid phone role switch remains reproducibly broken in the automated path.** Playwright's Parent click immediately after Start working leaves `aria-pressed=false`; the assertion fails at connected.spec.cjs:46. Ordinary connected parent→student→parent feedback passes on both desktop and phone. The underlying app-versus-browser/input timing cause is not established. No more repeat attempts or automatic repair are authorized. Current trace/screenshot are under this run's `playwright/` directory.
3. **Intermediate core assertion:** repair-cycle2's opening-language assertion fails because untouched generated edit fields now follow the selected locale while baseline and value move together. Parent tests separately verify unchanged stored bytes, due-only event and dirty authored draft persistence. This is an implementation-specific expectation conflict pending fresh review, not grounds to rewrite old evidence or claim61/61.
4. **Two obsolete grade3–5 proposal assertions:** protected repair-cycle1 demands proposals/decisions in Bea's disclosure. F2-05 explicitly forbids that unavailable feature promise. `student-pages.test.cjs` checks all actual sharing terms; `student-pages.e2e.cjs` exercises EN/ES grade3–5 absence and grade6–8 presence with real controls. Preserve raw71/73.
5. **Known count regex artifact:** copy-review expects only a numeric count and rejects the truthful learner prefix in `Bea · 2 tasks shown`. Preserve raw51/52. The rendered count is visible in the inspected screenshot; no product change is justified by that regex.

Cross-learner status-toast Retry visibility remains an explicit limitation: resetting B replaces the status/Retry UI for A's retained failure; A's draft/state survives and resubmission works. No universal recovery claim.

## Screenshots actually inspected

- `parent-pages/f2-03-before-save.png` (1440): EN edit form, title/instructions and due entry readable; a previously generated Spanish sample-load toast remains visible after switching to EN. That mixed-language transient status is a visible limitation, not authored text and not proof of stored corruption.
- `student-pages/F2-05-es-bea-record.png` (1440): Spanish student disclosure names work/help/checks/stuck/done/observations without a date-proposal promise; no fabricated mastery shown. Copy remains draft, not native educator validation.
- `journey/15-768-schoolwork-parent.png`: task list and edit/archive/add controls readable; stacked detail/intake panels; bottom controls continue below viewport.
- `journey/15-390-workspace-student.png`: task chooser and Open controls fit; this capture has no selected task, so it is not evidence of a completed narrow-screen workspace session.
- `journey/15-320-schoolwork-parent.png`: task rows wrap and first-row controls are visible; native learner select truncates part of its selected label and the demo controls occupy much of the first viewport. Vertical continuation is expected. No claim of real-touch or full-page certification.

These are visual inspections for specification evidence, not a taste or quality PASS. No redesign was hidden in the functional repair.

## What is next

Fresh read-only Fable spec review: `deleg_7b78509c` / `sa-0-b296af4c`, target report `FRONTEND_REPAIR2_FINAL_SPEC.md`. It must adjudicate the preserved failures. Quality review is gated on SPEC PASS; no quality review has started. Remaining blockers after this final cycle require an owner decision, not a silently expanded task list.

Backend, identity/persistence/privacy/provider work, actual child/non-reader/device/assistive-technology/native-Spanish/curriculum/efficacy validation and the historical design/ PHONE-STALL remain in BACKLOG.md. Local synthetic/memory-only demo is not production delivery.
