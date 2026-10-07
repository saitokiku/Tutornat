# Education product — retained work and frontend-first order

Current owner priority: build the connected frontend now; model missing backend functions locally; backend later. The owner clarified that the old artifact is only an early scripted prototype. Authority: DIRECTION.md and frontend/BUILD_CONTRACT.md; design/FRONTEND_PLAN.md is superseded. Immediate old-work triage is reconciled in COORDINATOR_CARRYOVER.md. Unknown or deferred is not completed. This file is the durable carryover ledger, not a replacement for immutable review evidence.

## 1. Older frontend work — reconciled, limitations retained

| Task ID | Scope | Current disposition / evidence |
|---|---|---|
| prototype | Independently verify the runnable synthetic prototype | Carryover evidence reconciled; blanket approval withheld; see COORDINATOR_CARRYOVER.md |
| concept-today | A Today-first complete parent/student journey | Included in partial paired-role matrix; unadjudicated predicates, narrow-screen overflow and historical stall retained |
| concept-workspace | B Workspace-first complete journey | Included in partial paired-role matrix; unadjudicated predicates, narrow-screen overflow and historical stall retained |
| concept-shared | C Shared-plan-first complete journey | Included in partial paired-role matrix; unadjudicated predicates, narrow-screen overflow and historical stall retained |
| band-k2 | Short task, adult scaffold, visual/non-reader support | Recorded K–2 paths reviewed; Spanish parent overflow retained; real non-reader validation separate |
| band-35 | Manageable plan and supported independence | Recorded paths retained; organized-only predicate, focus expectations and phone overflow unresolved |
| band-68 | Planning/negotiation and disclosed parent visibility | Recorded proposal/decision paths retained; organized-only assertion not adjudicated as a product defect |
| locale-en | Labels/examples/accessibility/error states | Recorded EN paths and authored-text survival retained; not blanket UI/accessibility certification |
| locale-es | Same EN/ES flow coverage, authored text preserved | Recorded ES paths retained; phone layout/focus expectations open; native educational Spanish review deferred |
| prototype-quality | Independent quality gate | All original QC/QUX repairs approved within scope; PHONE-STALL open |
| quality-phone-stall | Exact long desktop→phone keyboard sequence times out | Bounded diagnosis completed; three recorded exact replays stall; native activation-flood evidence, origin UNRESOLVED, not fixed |
| prototype-delivery | Reviewable local artifact plus truthful acceptance | Open for feedback; replaced as delivery target by polished frontend, not erased |
| prototype-next-decision | Next step after exhausted old repair cycles | Resolved by latest owner request: frontend-first finalization, retained carryover and simulated services |

Completed and preserved: discovery/brief, pinned repository snapshots and reports, worker-routing correction, bounded prototype specification repair, QC-01 replay/hints, QC-02/QC-11 all-dependency stale plans and model acceptance guards, QC-03 deadline provenance, QC-04 invalid/terminal proposals, QC-05 hint intent, QUX-1 focus, QUX-2 obscured focus within tested paths, QUX-3 disclosure/history parity, QUX-4 essential contrast, two old repair cycles and final targeted Fable review. Historical reports remain under design/ and evidence/. Their scoped approval does not certify PHONE-STALL or production.

## 2. Active connected-frontend build (corrected scope)

Owner clarified that the existing artifact is only a very early prototype, not a useful frontend. Current implementation contract is **frontend/BUILD_CONTRACT.md**, replacing the too-narrow cosmetic/incremental design/FRONTEND_PLAN.md scope. Preserve design/ as a concept reference and historical evidence; its green checks do not establish new frontend completion.

1. DONE: reconcile final/partial old carryover reports in COORDINATOR_CARRYOVER.md. Old demo reviewer was interrupted after exceeding its budget. Keep unresolved issues open, including PHONE-STALL; carry useful invariants and viewport/focus regressions into new acceptance without inheriting old selectors. No further unbounded certification of the old concept explorer.
2. Build frontend/ with connected Today, Schoolwork, Workspace, Plan and Record destinations, real in-memory records for user-created fictional tasks, meaningful parent/student transitions and replaceable mock-service states.
3. Original single-writer allocation is superseded by PARALLEL_DELIVERY.md: shared-state, parent-page and student-page Fable builders use exclusive live/isolated ownership and one coordinator integration. Independent learning/copy and state-contract advisors returned; coordinator adjudication is FRONTEND_ADVISOR_DECISIONS.md, backed by executed targeted reference checks. Only requirements consistent with the active contract were forwarded; legacy architecture/timing, an adult-verification gate and expanded proposal grades were not adopted. Existing prototype is reference, not a frozen architecture/selector contract.
4. Coordinator independently verifies the NEW artifact against AC-01–AC-10, including custom tasks, race/failure/cancellation, age/locale/keyboard/mobile behavior and relevant old invariants; fresh quality review follows. At most two targeted repair cycles.
5. Deliver the working new frontend with explicit mock boundaries and the retained backend/human-validation backlog. No production-readiness claim.

Cycle-1 final ruling: **CHANGES_REQUIRED**, `FRONTEND_REPAIR1_ADJUDICATION.md`. Three reviews returned and coordinator replayed decisive probes: service 20/23, copy 44/52 (one regex artifact), interaction 81/81 complete; extra tally/observation/reading probe 11/13. Seven final-repair IDs F2-01–F2-07 cover retry/reset resurrection/replay, same-learner task displacement, false locale-induced edits, lost per-field generated localization, band/role disclosure and tally singulars. `FRONTEND_REPAIR_CYCLE2_PLAN.md` authorizes the one remaining targeted cycle, not another automatic loop. All original tests and historical evidence remain preserved. Spec acceptance and the separate quality gate are still pending. R05 ruling permits attributed append-only parent annotations on archived records while preserving archived work/history; this is not Restore.

**Tooling-smoke finding (open, not an extra automatic repair cycle):** newly installed Playwright reproduces a 390px phone role-switch problem: Parent click immediately after Start working returns without switching from Student. First run times out at the now-unavailable Add task; tighter second run observes Parent aria-pressed=false. The connected parent/student feedback journey passes at desktop and phone; the rapid switch case remains red. Root cause (app interaction versus automation/browser timing) is not established. Evidence: devtools/browser/runs/setup-20261001T165652684392Z/{green-live,phone-diagnostic}/, including replayable traces.

**Final cycle decision:** `FRONTEND_REPAIR2_ACCEPTANCE.md` supersedes provisional acceptance statements. Coordinator did not adopt the reviewer's conditional PASS because the required rapid phone interaction remains unresolved. No quality review or automatic third repair. Owner decision is now needed for a bounded follow-up; original backend/human-validation/historical lists below remain unchanged.

**Integrated-cycle-2 contract finding (adjudicated, not owner-approved):** the parent slice treats a submitted generated field as an authored replacement, including identical canonical text. The retained S21 assertion still fails, but ordinary due-only UI saves preserve capability because the UI omits untouched fields. This is a changed sparse-edit contract, not a reproduced due-only UI bug. Recommendation: add explicit authorship intent before any full-record/backend client is introduced. Raw22/23 service evidence is preserved. Remaining status limits: learner B reset can hide learner A's Retry, and an old generated toast can remain in the previous locale. No data loss or authored-text translation is established by those display findings.

Old task scopes in section 1 remain preserved and unresolved unless evidence supports a scoped closure. Old A/B/C modes are not a requirement to expose experimental layout switches in the new product UI. Working direction is Today-first with workspace/shared-plan destinations, not an owner selection of production architecture.

## 3. Backend and release prerequisites — deliberately deferred, not forgotten

| ID | Work | Dependency / gate |
|---|---|---|
| BE-01 | Select production foundation and reusable code from KaizenEdu/Kaizen-AI/trellis; preserve licensing/provenance; Tutornat currently README-only | Stabilized frontend contracts plus explicit production-build scope |
| BE-02 | Real identity, family membership/tenant isolation, guardian eligibility, role permissions and age-appropriate sharing | Privacy/security design and adversarial authorization tests; demo switch is not access control |
| BE-03 | Durable tasks, plans, proposals, observation provenance, assistance ledger, concurrency/idempotency and cross-device state | Frontend data/command contract; real storage integration not yet implemented |
| BE-04 | Real model/tutoring, speech and shared visual workspace services; cancellation, cost limits, failure/fallback behavior and diagnostics | Provider eligibility/terms, retention/contracts, actual runtime/cost verification |
| BE-05 | Schoolwork intake, OCR/extraction, teacher-feedback import and optional school-account integrations | Consent, correction/review flow, least-privilege access; no silent submissions/teacher messaging |
| BE-06 | Consent, retention/export/deletion lifecycle including actual destructive phase and scheduler/worker | Qualified privacy/legal review; existing deletion-freeze-only finding remains unresolved for production |
| BE-07 | Provider-side audio handling and contracts | Source not persisting audio does not verify provider retention; do not promise audio is never retained |
| BE-08 | Reviewed independent items/scoring, assisted-evidence separation, delayed checks at 48–72 hours and around day seven | Content/assessment validation; no external effect size used as product efficacy claim |
| BE-09 | Release safety, abuse/cost controls, operational monitoring, setup/deploy/rollback and real integration tests | Explicit deployment/real-user/spending authorization and satisfied release gates |

## 4. Product and human validation — still open

- VALID-01: practical family interview/pilot access. Owner previously skipped the access question; access is unknown, not unavailable. Nobody beyond the owner was reported as having used prior versions.
- VALID-02: actual K–2/non-reader and family usability, screen reader/switch/touch/real-device testing; browser-based agent checks are not this validation.
- VALID-03: native-speaker educational Spanish, appropriate reviewed K–8 math/literacy content and deliberate curriculum sequence. Broader subjects remain organization-only where instruction is not implemented.
- VALID-04: demand, willingness to use/pay, distribution, pricing, operating budget and pilot success measures. No fixed budget/deadline supplied; no unrestricted spending implied.
- VALID-05: evidence of learning/retention and appropriate parent/student agency. Task completion, assisted answers and agent agreement do not establish learning gains.

## 5. Later product scope

Human tutors/service marketplace/booking/dispatch are later additions, not prerequisites or part of current parent/student v1. Real external actions require separate permissions and approval semantics. No fake version of a real external submission should be presented as completed.
