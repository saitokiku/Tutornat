# Connected frontend — adjudicated specialist recommendations

## Authority and scope

This is a clarification of `frontend/BUILD_CONTRACT.md`, not a replacement architecture or additional product phase. The application writer remains sole owner of `frontend/`. Source advisories are `design/FRONTEND_LEARNING_REVIEW.md` and `design/FRONTEND_SERVICE_REVIEW.md`; they inspect the old concept and propose requirements. Neither inspected or approved the new implementation. A reviewer writing CHANGES_REQUIRED does not establish that the new app fails.

Coordinator read both reports and evidence logs, checked the old source passages, and independently executed `evidence/frontend-advisor-reconciliation/probe.cjs`. Its ten checks verify selected historical facts, including two behaviors that must NOT be ported. Green checks here mean the historical observation was reproduced, not that the behavior is desirable or the new frontend is accepted. Raw output: `probe.json` in that directory.

Both advisors stayed below the call cap but exceeded the eight-minute time cap (reported durations 561.02s and 737.35s). The learning worker's statement “within budget” is therefore inaccurate. Their artifacts are usable scoped inputs, not grounds for extra implementation/review cycles.

## 1. Accept: honest capabilities, assistance and evidence

Maps to AC-02/05/08/09.

- Family-authored tasks support organization and authored work, **not arbitrary AI tutoring/checking**. Capability labels are derived from implemented support, not from subject alone. A family-created math task is not automatically a reviewed/checkable lesson. Do not let a manual form assign a misleading reviewed/instructed status.
- Any available sample checker explains its accepted answer form. Intermediate work remains saved and unjudged, and `1225` must not match `225`. A generic “explain/check anything” offer is unacceptable unless that action actually exists for the selected task.
- Completion is a self-report. Help requested, help delivered, scripted assistance, parent observations, and any optional adult-presence report remain distinct. Missing assistance records do not prove independent performance; equally, completion must not manufacture an assistance event. The coordinator reproduced old `completeWork` labeling zero-help work `assisted_work`; reject that unconditional classification in the new domain.
- A local help flag means “your parent can see this when they open the parent view,” not “your parent was notified.” Unavailable audio/checking must not claim to hear, speak, grade, send, or deliver help. Do not promise that a later assessment will happen; assessments are planned/unavailable and not implemented.
- Keep parent observations and authored work verbatim and attributed, visible according to the disclosed sharing rules. Do not upgrade either to verified understanding, scores, or mastery.

## 2. Accept: stable identities and race-safe local services

Maps to AC-01/03/04/09.

- Commands capture originating learner/task/proposal IDs. Never decide a proposal by a filtered array index or apply a delayed work result to whichever task is currently focused.
- Duplicate suppression exists below disabled buttons. Failure/cancellation must preserve domain records and authored input; retries have deterministic semantics.
- Real reset invalidates pending work using a non-reused generation/token or equivalent tested guard. Late results cannot resurrect cleared records. A learner switch preserves each learner's state and routes in-flight work only to its origin; it is not implicitly a reset.
- Draft generation and acceptance check all relevant task identities/revisions/dates/statuses. Archive/date edits during a pending draft make an obsolete result non-acceptable. Unrelated task changes never erase another dependency's stale warning. Previous accepted plan/history remain intact on failure.
- Declined/nonpending drafts cannot be accepted through the domain API. The coordinator reproduced this old direct-call loophole; AC-09 already explicitly requires its rejection in the new domain.

## 3. Accept: connected records, copy and reachable UI

Maps to AC-01/02/05/06/07.

- Task edits preserve identity and useful old/new provenance without rewriting prior contributions. Archive/restore preserves work history and excludes archived tasks from actionable queues, proposal targets and new drafts.
- Proposal reasons, parent decisions and declined-plan history remain visible to both roles. Cancel closes/abandons an uncommitted operation; Decline is a recorded decision, not a synonym.
- EN/ES cover controls, errors, pending/retry states and accessibility names, not just headings. Product copy switches language; family text does not. Consistent guardian-neutral terminology and correct singular/plural handling are recommended, with educational Spanish explicitly unreviewed by a native educator.
- K–2 visibly expects an adult to read and operate the text workflow with the child. Keep a short next action, large controls and simple copy. No claim of independently usable non-reader interaction.
- Async updates must preserve unrelated form text, caret/selection and meaningful focus. Do not focus destructive/decision buttons merely because a render completed. Parent-visibility disclosure must match the actual rendered data classes; deriving both from one configuration is one implementation option, not a mandated rewrite.

## 4. Do NOT import these advisory proposals as requirements

1. **No mandatory legacy architecture or synchronous mock behavior.** The service report's additive `model.js`/`store.js` layout and synchronous `normal` response recommendation are legacy-compatibility proposals. The new contract permits a clean domain/service boundary with a consistent asynchronous interface. Do not refactor working new code to preserve old demo timing, selectors, global focus state or test architecture. Old tests stay preserved for the old artifact.
2. **No new adult-verification gate.** An adult checkbox is self-report, not verification of adult presence/help. The hard gate, suppression of completion evidence while unknown, and automatic “with a grown-up” classification are not accepted as mandatory scope. If a presence control already exists, label it self-reported and do not infer assistance or independence from it. Completion remains possible without false evidence.
3. **No grade-range expansion.** Student date proposals remain grades 6–8 per the active contract; the learning report's grades 3–8 suggestion is not an approved scope change. No new curriculum/phonics feature is required by advice about old sample defects.
4. **No fabricated certainty from copy rules.** Four-word labels/two-sentence turns and exact glossary/table formats are design heuristics, not validated age thresholds or rigid acceptance tests. Natural clear Spanish and explicit limitations take precedence over mechanically shortening copy. Native educator/child validation remains deferred.
5. **No history erasure or hidden observed work.** Organization-only tasks can retain self-reported activity and authored contributions; lacking reviewed instruction is not a reason to discard their records. Never call those records independent assessment. Do not copy fixed evidence vocabularies that imply all sessions were assisted.

## Verification impact and deferred work

No new destination, backend, identity/persistence system, notification service, tutor dependency or external research phase is added. The coordinator's new-app acceptance must test task-linked custom workflows; self-report versus actual assistance; archived/reset/late-result behavior; unchanged authored content across language and learner switches; and meaningful keyboard/mobile behavior. Existing AC-01–AC-10 remain the completion gate.

Native Spanish review, real K–2/family usability, reviewed instructional content, real assessment, privacy/permissions and provider integrations remain in `BACKLOG.md`. Neither advisory closes those gates or the historical PHONE-STALL.
