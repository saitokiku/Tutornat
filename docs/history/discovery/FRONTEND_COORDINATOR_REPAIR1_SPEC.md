# Coordinator verification of frontend repair cycle 1

## Verdict: CHANGES_REQUIRED

Cycle-1 implementation is frozen and independently rerun. The writer's reported green test counts are reproduced, **but “all R01–R22 fixed” is not supported**: two additional control-driven transition sequences still fail R01/R03 and AC04. No specification PASS, quality-stage approval, or finished-frontend claim.

## Integrity and independently rerun evidence

`evidence/frontend-repair1-verification/source-manifest.json` freezes 17 files. The original build contract and four original test files are unchanged; all 14 initial-snapshot hashes and 15 historical design-source hashes match. After the new probes, all 17 frozen hashes and all 17 corresponding live hashes still match. No application edits by coordinator/reviewers.

| Run | Enumerated result | Raw evidence beneath `evidence/frontend-repair1-verification/` |
|---|---|---|
| All unit tests (43 original + 6 new) | 49/49 | `rerun-quick/unit.stdout.log`, `unit.summary.json` |
| Original coordinator negative domain tests | 16/16 | `rerun-quick/adversarial-domain.json` |
| Original coordinator UI / stale-proposal tests | 20/20 and 4/4 | `rerun-browser/adversarial-ui/`, `proposal-ui/` |
| Unchanged original journey | 97/97, 33 PNGs | `rerun-browser/journey/` |
| Writer's compact cycle-1 browser tests | 73/73, 10 PNGs | `rerun-browser/repair-compact/` |

Four runtime JavaScript syntax checks also pass. Browser reports enumerate zero captured uncaught exceptions, console errors and external requests. Every reported screenshot file exists. These suites overlap; their assertions are not a count of distinct product guarantees. Commands and timing are in each group's `summary.json`; runner is `rerun.py quick|browser`, always against the frozen repaired snapshot with exclusive output paths.

Actual Retry keyboard focus was independently remeasured by rerunning the compact test: `:focus-visible`, solid 3px white outline, white `[255,255,255]` against error-toast `[176,12,21]`, contrast **7.217887267467933:1** at both 390 and 320. This replaces the initial failing 1.3786:1 measurement for this control only.

## Remaining gap C1 — reset can be undone by a late failed-operation Retry (High)

- **Requirement:** R03 / AC04: retry after reset respects invalidation; no late operation resurrects reset data.
- **Actual-control sequence:** parent opens a new fictional task → selects Fail once → submits → immediately Reset this learner / Confirm before the 300ms response → waits for the old failure → clicks its Retry.
- **Observed:** reset initially leaves zero tasks. The late failure still offers “retry is safe.” Retry creates `Must not return after reset` as task-1 and selects it, despite the explicit reset. Reproduced in both preserved coordinator attempts.
- **Expected:** the old operation is superseded/cancelled; neither late error nor retry can restore pre-reset work.
- **Source:** frozen `demo-service.js:96–99` reports planned failure before generation invalidation; `:134–140` retries saved commands by fresh dispatch without preserving the original dependency generation. UI `app.js:203–210` clears learner data/UI but does not invalidate an operation's later retry lifecycle. Investigate the service guard, not just hide this one button.

## Remaining gap C2 — background create displaces another active task (Medium)

- **Requirement:** R01/R02/R15 / AC04: a delayed completion preserves the active other task/form's selection, draft and focus context, including within the same learner.
- **Actual-control sequence:** create and start task B → parent submits new task A with Delayed scenario → switch to student Workspace for B → type `Unsent thought for task B` → let A finish.
- **Observed:** selected task changes from B/task-1 to A/task-4. Workspace becomes A, Not started; B's visible work field disappears. A is correctly created for Bea. Returning to B restores the stored draft, so this is **active-context displacement, not destruction of B's stored text**.
- **Expected:** A is created in the background without changing the user's subsequently chosen task B/Workspace.
- **Source:** frozen `app.js:447–449` unconditionally calls `select(data.task.id, owner)` after create. Intake also selects unconditionally at `:491`. Learner ownership alone is insufficient; callback selection must respect current task/view/form context.

## New probe and artefact adjudication

Authoritative script: `evidence/frontend-repair1-verification/coordinator-extra-v2.cjs`; cases source `coordinator-extra-cases.js`; output `coordinator-extra-v2/report.json`, per-check `partial.json`/`log.txt`, two PNGs. **11 checks: 7 pass / 4 fail, representing the two product gaps above.** Duration 10.828 seconds. Actual pointer/keyboard controls, read-only __demo queries, no app/debug writes.

The preserved initial `coordinator-extra/` also reproduced C1 but its C2 setup attempted student Start from the parent view (missing control). That is a harness error, not a third product defect. V2 adds explicit role switches; the original run was not modified or deleted. One orchestration cell lost its Python variables and raised NameError before any tool call; it was recovered by rereading the saved script, not by fabricating evidence.

## Visual inspection and limits

Coordinator inspected repaired 1440 stale-proposal, 768 parent Schoolwork, 390 sample Workspace and 320 error-Retry screenshots plus both new failure screenshots. Desktop stale proposal clearly explains the old/new dates and safe Decline path; tablet list is readable; the sampled mobile tag fits; error Retry has a distinct white focus outline. Toasts still visually overlay nonfocused page content in these frames—screenshots do not establish universal keyboard reachability. The new C1/C2 images match their final visible records; temporal ordering is proved by script/query logs, not pixels alone.

## Active reviewers and next gate

Fresh Fable/max spec batch `deleg_8864786f` has three read-only slices: state/identity `sa-0-5e51314d`, age/language `sa-1-c7bb845c`, interaction `sa-2-456076f7`. Each has a 12-call OR 15-minute budget and separate report/evidence ownership. State reviewer has the coordinator reproductions. Await returned results without polling; adjudicate decision-changing findings and consolidate the **one remaining targeted repair cycle**. Quality review starts only after specification PASS. Old PHONE-STALL origin, backend/privacy/provider work and native-Spanish/child/AT/device/learning validation remain explicitly unresolved/deferred, not silently closed.
