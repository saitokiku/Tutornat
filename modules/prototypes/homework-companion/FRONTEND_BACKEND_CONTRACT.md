# Frontend ↔ backend contract (handoff)

The frontend talks to one boundary: `demo-service.js` `dispatch(command) → Promise<Result>` plus read queries.
A real backend replaces that module behind the same shapes. Nothing in `app.js` or `domain.js` needs to change
for the operations below if the result/error contract holds.

## Result shape

```
Result  = { ok: true,  operationId, command, data }
        | { ok: false, operationId, command, error: { code, message, errors?, retryable } }
codes   = validation | not_found | conflict | duplicate | cancelled | superseded | stale | declined
        | already_decided | not_allowed | no_tasks | service_failed (retryable) | unavailable | internal | not_retryable | duplicate
```

`errors` carries field codes (`required`, `too_long`, `invalid_date`, `invalid_subject`, `same_date`) or `{ conflicts }` for `stale`.

## Operations

| Command (frontend) | Real service operation | Must guarantee |
|---|---|---|
| `createTask {learnerId,input}` | POST task | server-side validation identical to `Domain.validateTaskInput` limits (title 80, instructions 280, ISO date, subject enum); stable `task.id`; `version: 1`; audit event |
| `editTask {taskId,changes}` | PATCH task | optimistic concurrency on `version`; reject archived; audit event with before/after |
| `archiveTask` / `restoreTask` | PATCH status | soft delete only; restore returns the same id and history |
| `loadSample {learnerId}` | n/a (demo only) | not a production operation; reviewed content would ship as curriculum fixtures with provenance |
| `startTask` / `addStep {text}` / `flagStuck` / `markComplete` | session commands | one session per task per learner; steps immutable and attributed `student`; complete = self-report, never a mastery signal |
| `requestHelp {taskId,helpType}` | help request | record request first; a reply (scripted or future model) is a separate append-only entry keyed to the request; absence of reply is a visible state, never fabricated |
| `checkAnswer {taskId,answer}` | checker | only for content with a reviewed answer key; whole-number parse must be strict; `unsupported` for everything else |
| `addObservation {taskId,text}` | POST observation | verbatim, attributed `parent`, task-linked, ≤400 chars |
| `draftPlan {learnerId}` | plan draft | deterministic or model-backed; must snapshot each dependency's due date (`items[].due`) so staleness is computable client-side |
| `acceptDraft` / `declineDraft` | plan decision | server re-checks every dependency date and archive status before accepting; declined drafts are terminal; previous accepted plan survives failed acceptance; history append-only |
| `proposeChange {learnerId,input}` | POST proposal | grade-band gate (6–8) enforced server-side; reason verbatim ≤200; `fromDue` snapshot |
| `decideProposal {proposalId,decision}` | PATCH proposal | single decision; accept applies the date through the same edit path (bumps task version, emits audit); archived task → conflict |
| `resetLearner` | n/a | demo-only destructive reset; production equivalent is account/data deletion under consent rules |

Read queries (`listTasks`, `task`, `session`, `observations`, `record`, `plans`, `planConflicts`, `proposals`, `schedule`, `todayForParent`, `todayForStudent`) become GETs scoped by authenticated learner access; Today derivations may stay client-side over fetched records.

## Identity, auth, privacy (not in the demo)

- Role and learner switches are demo controls. A real system needs guardian accounts, child profiles under a guardian, verified
  consent for any child data, and role-based access (parent sees child records; child never sees another child).
- No student free text, observation or proposal reason may leave the family scope without explicit consent; nothing is sent to a school in this product.
- Any model-backed help must be labeled by source, logged append-only, and never produce correctness judgments outside a reviewed answer key.
- Data deletion/export and retention windows are backlog items (`../BACKLOG.md`).

## Consistency and failure rules the UI relies on

1. Every command carries the originating `learnerId`/`taskId`/`proposalId`; the server must reject cross-learner access.
2. Duplicate submits: idempotency key per form submission (`requestKey`); the server must not create two records for one key.
3. Late responses: the client discards results for records changed since dispatch (`superseded`); the server must version records so this is detectable.
4. Reset/archive/edit while pending: server responses must include the record version so the client guard above works.
5. Retryable vs terminal errors must be distinguished (`retryable`); the client keeps the user's input on either.
   Retry is ONE logical operation (repair cycle 2, F2-01): `retry(operationId)` re-runs the original attempt or any retry of it with the
   ORIGINAL dependency snapshot; invalidation (learner reset, dependency edit/archive) is checked before a failure is reported and again
   before a retry runs → `superseded` (not retryable). An applied operation, or one whose chain already succeeded, → `not_retryable`;
   a retry while another retry of the same chain is in flight → `duplicate`. Nothing mutates on a rejected retry. The UI additionally
   binds every dispatch to a per-learner reset identity: a completion from before that learner's reset changes no status, error, draft,
   focus or Retry offer. Late create/intake results select their new task only while the owner's selection/role/task-bound view are unchanged.
6. Plan acceptance must fail with the exact per-dependency conflict list, not a generic error.
7. Decision history (accepted / superseded / declined plans, decided proposals) is append-only and returned with the plan.

## Release gates before any real user

Real persistence with versioning; auth + consent; privacy review of free-text fields; native-speaker review of Spanish;
assistive-technology testing with real users; K–2 validation with adults present; load/failure testing of the retry/supersede path;
removal of scenario panel, sample loader and reset from non-demo builds.


## Repair cycle 1 — contract additions

- `acceptDraft` / `declineDraft` accept an optional `planId` (the reviewed draft). The demo service fills it from the current draft at
  dispatch time when omitted, so a decision always binds the draft the parent saw. Domain: `acceptDraft(store, learnerId, { expectedPlanId })`
  fails with `replaced` (`errors: { reviewed, current }`) when the draft was replaced. Direct synchronous calls without `expectedPlanId` keep the
  original "decide the current draft now" behaviour.
- `decideProposal(..., 'accept')` fails with `stale` (`errors: { fromDue, currentDue, toDue }`) when the task's current due date differs from the
  proposal's `fromDue`; `conflict` when the task is archived. `proposalState(store, proposalId)` / `query.proposalState(id)` returns
  `{ status: pending|stale|unavailable|accepted|declined, stale, unavailable, currentDue }`.
- `editTask` with a change to `title`, `subject` or `instructions` on a sample task sets `sample: null` and
  `sampleDetached: { key, version, at, changed }`; the `edited` event carries `detail.sampleDetached`. Due-only edits leave `sample` intact.
- Every mutating work command (`startTask`, `addStep`, `requestHelp`, `checkAnswer`, `flagStuck`, `markComplete`) fails with `conflict` on an
  archived task.
- Scripted assistance entries and `help_scripted` events carry `sampleKey`, `sampleVersion`, `index`; checks carry `sampleKey`, `sampleVersion`.
  `SAMPLES[key]` has `version` and, for reading, `story` (string[]). A real backend must keep these provenance fields immutable.

## Repair cycle 2 — field authorship

`editTask.changes` is a sparse patch of intentionally authored fields, not a complete form or task snapshot. Explicitly submitting a
field that still has generated provenance makes it family-authored even when its bytes equal the canonical sample text; the edit
event records that field in `detail.changed` and `detail.authored`, removes its generated provenance, and detaches obsolete sample
capability for content changes. Omit untouched fields. A due-only patch preserves generated title/instructions and instructional
capability. Untouched generated fields retain their own key/version for display localization after another field is edited; this
display metadata never restores detached help/checker capability. Unknown or mismatched sample versions display stored text.
