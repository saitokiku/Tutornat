# Frontend service-state review — shared in-memory store, local fake service contracts, race criteria

Reviewer: independent Fable service-state specialist, read-only. Refocused per owner correction: the current artifact is an early scripted prototype; the target is a **complete connected frontend** on **local fake service contracts** (fictional task create/read/edit/archive, task-linked sessions/assistance, parent observations, student proposals, shared-plan review/accept/decline, controlled empty/loading/failure/retry). Old `data-act` selectors and A/B/C compositions are **not** constraints on the new UI. No framework, no backend, no code edits here. Line references are to the live `design/app.js` (1486 lines) and `design/model.js` (377 lines); they identify what is reusable and what breaks.

Nothing here authorizes a live backend, deployment, provider, credential or real data.

---

## 1. What to keep, what to replace

**Keep as the pure domain core (model.js, extended, invariants intact):** immutable state transitions; `applyDueChange` with all-dependency plan restaling (150–186); explicit `acceptDraftPlan` refusal of stale/conflicting drafts (342–350); provenance fields (`dueSource`, `dueHistory`, `source`, `corrections`, `acceptedBy`); evidence distinctions in `completeWork` (292–314); proposal lifecycle (136–143, 188–197); `checkFinalAnswer` (49–76); `validateIsoDate` (23–30). The 40 model tests stay green because new capabilities are added as new functions/fields, not by changing these.

**Replace (app.js):** the single `ui` object with per-task `sessions`/`board` kept outside domain state (574–594); copy-keyed task lookups `task(id) → TASKS[locale][id]` assumed for every task (618; used at 881, 920, 969, 986, 1023, 1080, 1121, 1135, 1193, 1240, 1267, 1311, 673); focus-bound work writes (`syncFocusTask`, model.js 259–262); index-identified proposals (model.js 188–197; app.js 1348–1352); plan drafting limited to the one extracted task (model.js 228–239); synchronous `act()/submit()` without any operation state (1280–1437).

**Keep honest, do not upgrade:** companion hints/checker/scripted turns/mic are local scripted content for the authored sample tasks only. For user-created tasks tutoring is **explicitly unavailable** (copy, not a disabled mystery button).

---

## 2. Recommended boundary: one in-memory store, one service seam, selectors for every view

Three plain-JS files beside `model.js`, zero dependencies, UMD like model.js so node tests can require them:

```
model.js        pure domain transitions (existing + additions in §3)
store.js        createStore({ service, model }) — single in-memory source of truth for ALL views
demo-service.js createDemoService({ scenario, schedule, unschedule }) — fake service contracts; deterministic
views/*.js      render(storeSnapshot) → HTML strings; dispatch(commands) only; no state of their own except transient field text
```

### 2.1 Store (`store.js`)

```js
createStore({ service, model, initial }) → {
  getState()        → { domain, sessions, ops, settings, meta }   // frozen snapshot per change
  select            → selectors (§2.3)
  dispatch(cmd)     → { accepted: true, opId } | { accepted: false, reason }   // never throws to a view
  subscribe(fn)     → unsubscribe                                   // views re-render on change
  cancel(opId)
}
```

Store shape:

```js
domain:   model state (tasks, proposals, draftPlan, currentPlan, observations, ledger, extracted, focusTaskId, settings{locale,band})
sessions: { [taskId]: { status:'idle'|'active'|'complete', steps:[…verbatim or keyed…], turns:[…], scriptIndex } }
ops:      { byKey: { [opKey]: { opId, kind, status:'pending'|'failed'|'unavailable'|'cancelled'|'stale_result', failedAttempts, error, since } },
            epoch, seq }
meta:     { loaded:'loading'|'empty'|'ready', scenario, role, route }
```

Rules: `domain` changes only through model functions inside the store's `apply` step; views never mutate; ids are minted by the store (`u-<seq>` for user tasks, `p-<seq>` for proposals, `o-<seq>` observations) never by views; authored strings stored verbatim, generated content stored as keys + params.

### 2.2 Service seam (`demo-service.js`) — fake contracts, same vocabulary a real client would implement later

```js
request({ opId, kind, input, failedAttempts, idempotencyKey }, settle) → handle { opId, cancel() }
settle({ opId, ok:true, result } | { opId, ok:false, error:{ code:'transient_error'|'unavailable'|'rejected', retryable, detail } })
planFor(scenario, kind, failedAttempts) → { delayMs, outcome }      // pure, deterministic, no randomness
```

Two service classes, so scenarios stay meaningful: `persist` (task/observation/proposal/plan-decision writes) and `generate` (intake extraction, plan drafting, tutoring). Scenario matrix:

| scenario | persist | generate |
|---|---|---|
| `normal` (default) | sync, ok | sync, ok |
| `delayed` | 600 ms, ok | 900 ms, ok |
| `fail_once` | first attempt per opKey `transient_error`, then ok | same |
| `generate_unavailable` | sync, ok | `unavailable` |
| `offline` | `unavailable` | `unavailable` (reads from store still work) |

`normal` settles **synchronously inside `dispatch`** (handle returned after settle) so default flows and existing tests see no asynchrony. In the mock, `cancel()` clears the timer and guarantees `settle` never fires; the store additionally ignores any settle whose `(opId, epoch)` no longer matches (§5). A later real client replaces the mock behind the same `request/settle` shape with fetch + AbortController; the store does not change.

### 2.3 Selectors (views read only these)

```
selectAttention(role)      → ordered list: pending proposals (parent), draft awaiting decision, stale plans, help flags, tasks needing independent check, failed ops needing retry
selectToday(role)          → next action: student = one open task (band-aware density), parent = next decision
selectTasks({ includeArchived }) → tasks with resolved copy (authored title verbatim OR sample copy in locale), status, due, provenance
selectTask(taskId)         → task + session + assistance + linked observations + linked proposals
selectPlan()               → currentPlan/draftPlan with per-item resolution (sample copy keys or generic EN/ES item labels around the authored title), stale info
selectProposals(role)      → by id, with decision affordance only for parent and only while pending
selectLedger()             → math/literacy rows + organized-only rows + custom tasks' evidence
selectOp(opKey)            → op status for a control (pending/failed/unavailable/cancelled/stale_result)
```

---

## 3. Command contract (fake, local) — the complete connected surface

All commands return through `dispatch`. `opKey` scopes duplicate suppression (per entity, not global). "Applied via" names the pure model function; ★ = new model function (additive).

| Command | Who | Input (validated in store before request) | opKey | Applied via (on settle ok) | Reject reasons (sync, no request) | Class |
|---|---|---|---|---|---|---|
| `app.load { source:'empty'\|'sample' }` | either | — | `app.load` | `createInitialState` / `loadExample` | — | generate-free read; `delayed` shows loading skeleton; `empty` → first-class empty state |
| `task.create { title, subject, due, by }` | parent (student in 6–8 if allowed by demo flag) | title 1–120 chars verbatim; subject ∈ enum; `validateIsoDate` | `task.create:<formNonce>` | ★`createTask(state, {id, title, subject, due, by})` → `kind:'custom'`, `authored:true`, `dueSource:'parent_entered'`★ | invalid date/title | persist |
| `task.update { taskId, patch:{ title?, subject?, due? } }` | parent | same validation; `due` → `applyDueChange(…, 'parent_corrected')` (reuses restaling) | `task.update:<taskId>` | ★`updateTask` (title/subject verbatim) + existing `applyDueChange` | archived/unknown task | persist |
| `task.archive { taskId }` / `task.restore` | parent | — | `task.archive:<taskId>` | ★`archiveTask` → `status:'archived'`, `archivedAt` step in `history` | already archived; task in an accepted plan → allowed but plan becomes `stale: true, staleReason:'task_archived'`★ | persist |
| `session.start { taskId }` | student | task open, not archived | `session:<taskId>` | `selectTask` + `startWork` | archived/complete | persist |
| `session.step { taskId, text }` | student | non-empty verbatim | `session:<taskId>` | push step; `checkFinalAnswer` only when the task has an authored `check` spec | — | persist |
| `session.hint { taskId }` | student | — | `session:<taskId>` | sample task: `requestHint`; custom task: **`{ ok:false, error:{ code:'unavailable', detail:'tutoring_not_available_for_custom_task' } }`** rendered as explicit copy | — | generate |
| `session.playScripted { taskId }` | student | sample task with script only | `session:<taskId>` | `recordScriptedHint` | custom/organized task: control not rendered; copy "scripted demo exists only for sample tasks" | local |
| `session.complete { taskId }` | student | active session | `session:<taskId>` | `completeWork` with ★evidence `'self_report'` when no companion assistance occurred, `'assisted_work'` otherwise | — | persist |
| `observation.add { text, taskId? }` | parent | non-empty verbatim; taskId optional, must exist | `observation.add:<formNonce>` | ★`addParentObservation(state, text, { taskId })` (field additive) | — | persist |
| `proposal.create { taskId, due, note }` | student | open task, valid date ≠ current | `proposal.create:<formNonce>` | `proposePlanChange` + ★id | complete/archived task; same date | persist |
| `proposal.decide { proposalId, decision }` | parent | pending proposal; task not archived | `proposal.decide:<proposalId>` | ★`decideProposalById` (wraps `decideProposal`) | already decided; task archived | persist |
| `intake.sample {}` | parent | — | `intake.sample` | sets `extracted` (sample) → review form | — | generate |
| `intake.confirm { due? }` | parent | valid date | `intake.confirm` | `correctExtractedTask` | not loaded | persist |
| `plan.draft { taskIds }` | parent | ≥1 open, non-archived task | `plan.draft` | result `{ items, basedOn:[{taskId,due}] }` → store verifies every `basedOn` against current tasks → `createDraftPlan`, else `stale_result` | none open | generate |
| `plan.accept {}` / `plan.decline { note }` | parent | draft pending | `plan.decide` | `acceptDraftPlan` (model refuses stale) / `declineDraftPlan` | no draft; stale → explained, not "unavailable" | persist |
| `settings.locale`, `settings.role`, `settings.band`, `app.reset` | either | — | — | local; `band`/`reset` **bump epoch and cancel all pending**; when user-created data exists they require an explicit confirm step | — | local |

Draft items for custom tasks: generic keyed labels rendered in EN/ES around the verbatim title (`tonight: "Tonight: start “<title>” (15 min)"`, `midway: "<date>: continue “<title>”"`, `due: "<date>: hand in “<title>” (shared deadline)"`); sample tasks keep `PLAN_COPY`. The title is never translated.

---

## 4. View composition (not A/B/C): what each surface reads

- **Parent home**: `selectAttention('parent')` first (decisions: proposals, draft, stale plan, retry-needed ops), then child's work (`selectTasks` with sessions), then forms (add task, observation, intake), then ledger/history. Every item in attention is a real control that dispatches exactly one command.
- **Student home**: `selectToday('student')` (one open task; K–2 single-card, 3–5 short list, 6–8 list + propose), workspace for the selected task (steps verbatim, hints only where available, otherwise the unavailable copy), plan (`selectPlan`), "what your parent sees".
- **Task detail** (both roles): `selectTask(id)` — status, deadline with provenance, session steps/turns, assistance ledger, linked observations/proposals, archive/edit (parent).
- **Scenario/diagnostics**: secondary, labeled "Demo service scenario — simulated, nothing is sent"; persistent in-memory disclosure at every size.

Rendering can stay string-template + delegated events. Replace `data-act` strings with `data-cmd` + `data-id` and keep the one `click`/`submit`/`input` delegation; selectors are the writer's choice.

---

## 5. Race, duplicate and recovery rules

| Situation | Required behavior | Mechanism |
|---|---|---|
| Double submit (Add task / Send proposal / Ask draft) | Exactly one entity; second activation announces "already saving" (polite); form inputs preserved | `opKey` per form nonce; button disabled while `selectOp(key).status==='pending'`; `dispatch` refuses a duplicate opKey (covers programmatic dispatch) |
| Two edits to the same task while the first is pending | Second refused with "still saving the previous change"; field text kept | per-entity opKey `task.update:<id>`; no queueing in v1 |
| Edits to different tasks concurrently | Both proceed independently | per-entity opKeys |
| Reset or band switch while anything is pending | Nothing from before lands: no state change, no announcement, timers cleared; if user-created data exists, a confirm step precedes | `epoch += 1` (monotonic, never reassigned), cancel all handles, settle guard `(opId, epoch)` |
| Locale switch while pending | Request continues; pending/failed/settle copy in the new locale; authored titles/notes/steps unchanged | copy resolved at render/settle time; items are keys |
| Role switch while pending | Request continues; the other role sees shared consequences only (e.g. "a draft awaits a parent's decision"); no focus moves | ops live in the store, not in a view |
| Deadline moved (edit or approved proposal) or task archived while a plan draft is pending | Result not installed as an acceptable draft; `stale_result` with "ask again"; existing draft/currentPlan untouched | `basedOn` per item verified at settle; `applyDueChange` restaling for installed plans; ★`task_archived` staleness |
| Proposal decided for a task archived meanwhile | Refused with explanation; proposal stays pending until parent declines or restores task | store guard before request |
| Session command on an archived task | Refused ("archived"); historical steps remain readable | store guard |
| Failure of any write | Entity list unchanged; form retains text; error `role="alert"` beside the control; same control relabeled "Try again"; `failedAttempts` increments; cancel never counts as failure | `settle ok:false` → op status only; `domain` touched only on `ok:true` |
| Failure of plan draft after prior accepted plan + declined draft with note | `currentPlan`, `draftPlan.parentNote`, observations, proposals, `dueHistory` deep-equal unchanged | same |
| Cancel | Pending cleared, mock timer cleared, "Cancelled — nothing in this demo changed", focus to the originating control | `store.cancel(opId)`; copy must not claim the request was stopped server-side |
| Late settle while typing elsewhere | Text, caret and focus preserved; result still applied and announced politely | render preserves active element by id, restores `selectionStart/End`; no focus move from asynchronous settles unless focus is inside the affected panel |
| Throw inside apply | Never uncaught; op cleared first, then error surfaced | try/catch in store apply; op removed before apply |

Cancellation token vs. network cancellation: the store's `(opId, epoch)` guard is the UI's correctness mechanism and always works; `handle.cancel()` is best-effort transport cancel (mock: timer cleared; later real client: abort, server may have committed → every write carries `idempotencyKey = opId`, and drafts are non-persisting or discardable). UI copy after cancel promises only "nothing changed here".

Accessibility: pending = `aria-busy` on the affected panel + visible `role="status"`; one polite live announcement at start and settle (existing `#live`, index.html:39); failures `role="alert"`; retry/cancel/ask-again are native buttons; no auto-dismiss; no focus theft.

---

## 6. Risks and hazards (exact references)

| # | Severity | Hazard | Reference | Mitigation |
|---|---|---|---|---|
| H1 | High | Every renderer resolves task copy via `TASKS[locale][id]`; a user-created task yields `undefined` → TypeError across views | app.js:618; 881, 920, 969, 986, 1023, 1080, 1121, 1135, 1193, 1240, 1267, 1311; `planItemText` 673 | Task record carries `title` (verbatim) + `kind:'custom'`; a single `taskCopy(t)` resolves authored-vs-sample; regression: create task → every view renders |
| H2 | High | Work/assistance writes are bound to `focusTaskId` (`syncFocusTask`); a command for another task would record on the wrong task | model.js:259–262, 264–282, 293–295 | Store calls `selectTask(taskId)` before session commands, or add taskId-explicit variants; test: hint for task B while A is focused lands on B |
| H3 | High | Proposals identified by array index; filtering/archiving shifts indexes → wrong proposal decided | model.js:188–197; app.js:1348–1352 | `id` on proposals; `decideProposalById` |
| H4 | High | "Open" means `status !== 'complete'` everywhere; archived tasks would be next/movable/draftable | model.js:256, 137–139; app.js:959, 1427 | `isOpen(t)` = not complete and not archived, used by model and selectors |
| H5 | Medium | `derivePlanItems` only drafts from `extracted`; plan must cover selected tasks incl. custom | model.js:228–239 | ★`derivePlanItemsFor(state, taskIds)`; items keep `{taskId, due, key, date}` so restaling/conflict checks keep working |
| H6 | Medium | `completeWork` labels completion `assisted_work` even when no companion assistance occurred (custom tasks never have hints) | model.js:293–314 | evidence `'self_report'` vs `'assisted_work'` by actual assistance; ledger copy for both; never "mastered" |
| H7 | Medium | Store/epoch reset: any explicit field list (today `freshUi` 592–594) that forgets ops/epoch, or resets epoch to 0, lets a stale settle match | app.js:592–594 | `epoch += 1`; unit test: old settle after two resets is dropped |
| H8 | Medium | Default must settle synchronously; a microtask "immediate" breaks `dispatch(...)` followed by synchronous reads and changes announce/focus order | app.js:1358 pattern | `planFor('normal').delayMs === 0` → settle before `request` returns |
| H9 | Medium | Asynchronous re-renders rebuild the stage and lose caret/IME state mid-typing | app.js:691–750, 1450–1453 | preserve selection; defer focus moves |
| H10 | Low | Authored titles in attribute contexts (ids, `data-*`, `aria-label`) | app.js `e()` 610–612 covers text/attrs | always `e()`; test: title `<img src=x onerror=alert(1)>` and `"` render inert |
| H11 | Low | Successor focus landing on a decision control (today `draft-ask` → Accept, 1339) lets key-repeat accept a plan | app.js:1339 | successors are headings/status, never accept/decline/archive |
| H12 | Low | Honesty drift: "Saved", "Sent", "Stopped" | FRONTEND_PLAN §2 | fixed copy family "in-memory demo; nothing is sent"; custom-task tutoring says unavailable, not disabled |

Not flagged: nonreachable model edges (legacy string plan items, decided-proposal re-decision already guarded at app.js:1350).

---

## 7. Acceptance criteria (5 groups)

**AC-1 Boundary and parity.** 40 model tests pass unchanged; new model functions covered by node tests; `store.dispatch` in `normal` is synchronous (state readable immediately); views contain no state writes (grep: no assignment to store internals outside store.js); static scan finds no `fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|BroadcastChannel`; CSP unchanged (`connect-src 'none'`).

**AC-2 Task lifecycle flows through every view.** Parent creates "Science fair outline" (custom) → appears in student Today/plan, parent attention/work list, task detail, ledger (organized-only or self-report row); edit due → `dueHistory` entry, provenance shown, any accepted plan naming it becomes stale with old→new dates in both roles; archive → gone from Today/next/proposal targets/draft candidates, visible under history with restore; restore → returns; user title rendered verbatim in EN and ES; XSS probe inert (H10).

**AC-3 Sessions, assistance, honesty.** Custom task: Start → steps verbatim → "Ask for a hint" yields explicit unavailable copy and records no assistance; no scripted play control; Mark done → `evidence:'self_report'`, "needs independent check", never "mastered". Sample task: hints/scripted/checker behave as today (replay idempotence, hint accounting). Hint for non-focused task lands on the right task (H2).

**AC-4 Plans, proposals, observations connected.** Draft over selected tasks incl. custom → generic EN/ES items around verbatim titles; Accept explicit and refused when stale (explained, not "unavailable"); Decline keeps note and current plan; student proposal by id → parent decides once; approval moves the shared deadline and restales plans; decision refused for archived task; task-linked observation appears in task detail and parent history as "parent-reported · not verified".

**AC-5 Service states and races.** For each command class × scenario: empty, loading (skeleton + `aria-busy` + status), success, invalid input (sync reject, field preserved), failure (`role="alert"`, Try again = same control, `failedAttempts`), unavailable (generate ops; writes still work), offline (all writes refused honestly, reads fine), cancel. Race set from §5 reproduced with real controls: double submit → one entity; two edits same task → second refused; reset/band during pending → nothing lands, epoch +1, confirm step shown when user data exists; locale switch mid-pending → new-locale copy, verbatim titles; role switch mid-pending → shared consequences only; deadline/archive during pending draft → `stale_result`; typing in observation across a settle → text/caret/focus preserved. Keyboard-only pass with asserted focus after each command; all new strings present in both locales.

---

## 8. Scope limitations

Read-only, source-grounded; no execution, screenshots, phone/visual, translation or learning review. No UI selectors or layouts are prescribed; the writer owns them. Spanish copy proposals inherit the "draft for native review" caveat. Backend items BE-02…BE-09 remain deferred; §2.2/§3 are interface vocabulary, not provider contracts.
