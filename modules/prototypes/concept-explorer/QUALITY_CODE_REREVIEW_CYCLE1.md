# Quality code/state/privacy re-review — cycle 1

**Verdict: REQUEST_CHANGES.** One reproducible High product defect (new id **QC-11**, the cross-task stale-plan regression in `model.js applyDueChange`) blocks closure of QC-02; it is reproduced through real controls for both an accepted plan and a pending draft. QC-01, QC-03, QC-04 and QC-05 are closed through fresh real-control probes. No security/privacy defect found; no production-certification claim is made.

Reviewer: fresh independent Fable code/state/privacy reviewer (not the implementer, not the coordinator). Read-only on application, tests, prior reports and evidence. Writes limited to this file and `evidence/rereview-code-cycle1/`. No git, installs, network services, storage, AI/audio, child data, browser-default, config/routing, deployment or spending actions. `QUALITY_FIX_REPORT.md` was treated as claims only.

Source hashes at review (match `evidence/coordinator-quality-cycle1/source-manifest.json`): app.js `93e8e578…`, model.js `efa3f3df…`, index.html `eaf47a0b…`, styles.css `19b04090…`; the seven `tests/*.cjs` hashes are listed in `evidence/rereview-code-cycle1/probe.log`'s companion shell output (unchanged against the manifest).

## 1. Method

1. Read `model.js` in full and the touched `app.js` logic (hint matcher L597–606, proposal form L957–971, plan rendering L931–935, draft panel branches L1158–1179, `act` cases L1334–1347); read the QC-01…05 acceptance criteria in `QUALITY_FIX_PLAN.md` and the original repros in `QUALITY_CODE_REVIEW.md`.
2. Wrote a fresh real-control probe, `evidence/rereview-code-cycle1/probe.cjs` (harness infrastructure copied from `tests/quality.e2e.cjs`, which was not edited; explicit `ROOT = /Users/man/education-product-discovery/design`; owned headless Chrome for Testing 153, `--remote-debugging-port=0`, own `$TMPDIR` profile removed at exit — `profileRemoved: true`, no leftover Chrome process). Real `Input.dispatchMouseEvent` clicks on real buttons/submits; `Runtime.exceptionThrown`, `Log`, and `Network.requestWillBeSent` captured. Pure-model traces (`R-MODEL-*`) run on `model.js` directly. Debug-API/model-only checks are flagged `blocking: false` and never used as acceptance.
3. Ran once: `node evidence/rereview-code-cycle1/probe.cjs` → `probe.json`, `probe.log`, 8 screenshots. Counts were reconciled programmatically from `probe.json` (see §5).
4. Did not re-run the already-green coordinator suites (model 29 / spec 28 / repair 50 / ui 24 / quality 114).

## 2. Blocking finding

### QC-11 · High · An approval for an unrelated task clears the stale flag of a plan whose dates still contradict its own task (accepted plan and pending draft); the pending draft's Accept control returns and installs the contradictory plan as current

**Code location:** `model.js` L165–172 (`applyDueChange` → `restale`):

```js
const mismatch = (plan.items || []).some((i) => i && typeof i === 'object' && i.taskId === taskId && i.due !== due);
if (mismatch) return { ...plan, stale: true, ... };
if (!plan.stale) return plan;
const { stale, staleReason, staleFrom, staleTo, ...rest } = plan; // date moved back to what the plan says
return rest;
```

**Exact cause (verified by trace and by state captured in `probe.json`):** `mismatch` only compares items whose `taskId` equals the task being changed *now*. When the plan is already stale because of a different task, `mismatch` is `false`, `plan.stale` is `true`, and the third branch strips `stale/staleReason/staleFrom/staleTo` unconditionally — the "date moved back to what the plan says" comment is only true when the changed task is the plan's own task. Staleness must be evaluated against every task a plan item depends on (each `items[i].taskId` versus that task's current `due`), not against the most recently changed task. A second, contributing gap: `acceptDraftPlan` (L319–326) never checks `draftPlan.stale`, so only the UI branch at `app.js` L1161 keeps a stale draft from being accepted; once the flag is wrongly cleared nothing stops the acceptance (`R-MODEL-5`, informational).

**Scope:** any plan (accepted `currentPlan` or pending `draftPlan`, any band — the code path is band/locale independent; probed in 6–8 EN) whose task's date has moved, followed by any later `applyDueChange` for a different task: an approved student proposal (reproduced) or a parent correction of the extracted task when it is a different task than the plan's (same path, not separately probed). `declined_by_parent` drafts are correctly untouched.

**Real-control reproduction A — accepted plan (`probe.json` scenario R1; checks `R1-stale`, `R1-render`, `R1-redraft`, `R1-student`):**
Band 6–8, concept A, EN. Parent → Load sample teacher note → Confirm as shown → Ask for a draft plan → Accept plan. Student → Propose a change: Essay claim, 2026-10-09, "Need more time" → Send to parent. Parent → Approve (state now correct: `currentPlan.stale = true`, warning "This plan is out of date…", re-draft control present, no Accept — screenshot `r1-parent-after-essay-approval-stale.png`). Student → Propose a change: History timeline, 2026-10-12, "Field trip" → Send. Parent → Approve.
- Expected: essay plan remains flagged out of date (its items are Oct 1/Oct 2 while the essay task is due Oct 9); re-draft control stays; neither role sees the Oct 2 items presented as the current plan.
- Actual: `currentPlan` = `{items: [essay Oct 2 ×3], acceptedBy: 'parent'}` with **no stale fields**; task row reads "Fri, Oct 9 … deadline moved by an approved student proposal"; the parent's plan panel shows **"Accepted plan (accepted by you)"** with "Thu, Oct 1: find two pieces of evidence" and **"Fri, Oct 2: turn in the claim draft (confirmed deadline)"**, the Draft panel shows **"Accepted by parent — now the current plan"**, no out-of-date warning, no `draft-ask` control anywhere (`redraftAnywhere: 0`). Student view: "Plan accepted by your parent" with the same Oct 2 items beside the Oct 9 task. Screenshots `r1-parent-after-history-approval.png` (visually confirmed: Accepted plan with Oct 1/Oct 2 items directly under the two approved proposals Oct 2 → Oct 9 and Oct 8 → Oct 12), `r1-student-after-history-approval.png`.

**Real-control reproduction B — pending draft (`probe.json` scenario R2; checks `R2-stale`, `R2-accept`, `R2-accepted`, `R2-student`):**
Same, but stop after Ask for a draft plan (do not accept). Student proposes Essay → Oct 9; Parent approves (correct: draft stale, Accept withdrawn, re-draft/decline offered — `r2-parent-pending-stale-after-essay-approval.png`). Student proposes History → Oct 12; Parent approves.
- Expected: draft stays stale; Accept stays withdrawn.
- Actual: `draftPlan.stale` gone; the ordinary pending branch renders again and **"Accept plan" is enabled** (`acceptControl: true, acceptEnabled: true`, `r2-parent-pending-after-history-approval.png`). Clicking it installs `currentPlan` = Oct 2 items, unflagged, `draftPlan.status = accepted_by_parent`, while the essay task is due Oct 9; the student then sees "Plan accepted by your parent … Fri, Oct 2: turn in the claim draft (confirmed deadline)" (`r2-parent-after-accepting-conflicting-draft.png`, `r2-student-after-accepting-conflicting-draft.png`).

**Model confirmation:** `R-MODEL-1` (accepted) and `R-MODEL-2` (pending) fail on `model.js` alone with the same sequence; `R-MODEL-3` (second move of the same task keeps `staleFrom` Oct 2) and `R-MODEL-4` (moving the task back to Oct 2 legitimately clears stale) pass and must be preserved by the fix.

**Severity:** High. This is the QC-02 contradiction ("old dates rendered as the current confirmed plan without a warning", both roles) re-reachable with one additional, ordinary approval, and it additionally re-enables an acceptance the repair deliberately withdrew. It is a regression introduced by the cycle-1 repair (the pre-fix code never cleared staleness because it never set it).

**Independent agreement:** the coordinator's separate harness `evidence/coordinator-quality-cycle1/cross-task-probe.cjs` / `cross-task-browser.json` (4 pass / 4 fail) reports the same accepted/pending outcomes. My probe was written before reading that file and uses different checks; the two agree on cause, state and rendering.

## 3. QC status (all ids reconciled against `probe.json`)

| ID | Status | Real-control evidence (`probe.json` check ids) |
|---|---|---|
| QC-01 | **Resolved** | `QC-01-35-en-a/b`, `QC-01-K2-es-a/b`: three Play/Replay passes with an authored note and one real hint leave `assistance` = 1 `hint` + 1 `scripted_hint/scripted_demo`; board holds each scripted step once; authored note survives; hint control enabled; pill "1 …"; parent flag "1 hint", ledger `hintsUsed 1`, `evidence assisted_work`, `status needs_independent_check`, checks `48-72h,day7`; "Scripted demo" provenance visible. |
| QC-02 | **Not resolved** (QC-11) | Closed parts: `QC-02-a/b/d/e/f/g` — task/`dueSource`/extract move together (`student_proposal_approved`, `sampleDue` kept), "Deadline: Fri, Oct 2" no longer shown, pending draft stale + Accept withdrawn after the plan's own task moves, re-draft/re-accept clears stale with Oct 8/Oct 9 items, Spanish provenance copy, decline leaves draft/task/extract intact. Open: cross-task staleness (§2). |
| QC-03 | **Resolved** | `QC-03-a…f`: intake pre-fills Oct 9 with "Sample note said … Oct 2"; Confirm as shown keeps Oct 9 / `student_proposal_approved`, `corrections: []`, proposal still approved; later correction to Oct 12 records `{from: 2026-10-09, to: 2026-10-12, by: parent}`, `dueSource parent_corrected`, approval shown superseded, `dueHistory` holds both transitions in order; student sees Oct 12. |
| QC-04 | **Resolved** | `QC-04-a/b/c/f` (real controls): all-complete state offers no proposal control or form, EN/ES empty states, zero exceptions; normal 6–8 proposal path works; decided proposal shows no decision controls. `QC-04-d/e` (informational, debug API/model): empty-select submit refused without throw and with an inline message; invalid ISO date rejected; re-decide refused without throw. |
| QC-05 | **Resolved** | `QC-05-a…d`: EN/ES prose containing help/hint/pista/ayuda (3 sentences) stays prose and records 0 hints; "hint" and "¿Me das una pista?" give hints (2 total); verbatim student turns; parent flag "2 hints"; ES locale: "ayuda" alone = request, sentence containing "ayuda" = prose. Matcher is an exact-phrase list after punctuation/whitespace normalisation (`app.js` L599–606) — deterministic, documented, not NLU. |
| QC-06 | Not separately re-probed | Instructed-subject ledger fields verified under QC-01-b; organized-only early return read in `completeWork` (L280–284); coordinator's quality suite covers the browser check. |
| QC-10 | Not re-probed | `split_number` guard read at `model.js` L54; covered by the coordinator-run suite. |
| Security / privacy | No finding | `SEC-a`: `<img onerror>`/`<svg onload>`/`javascript:` payloads through typed companion, board, proposal note and parent observation render inert after an ES switch (no handler ran, 0 injected elements, 0 `on*`/`style` attributes, verbatim text in ≥2 places). `SEC-b`: 0 http(s) requests across all scenarios, `localStorage`/`sessionStorage` empty, no cookie, only local `model.js`/`app.js`, CSP `default-src 'none'`. Screenshot `r8-parent-es-payloads-inert.png`. Not a production security audit. |

## 4. Classification of every failed check

- **Product defect (QC-11), 10 checks:** `R-MODEL-1`, `R-MODEL-2`, `R1-stale`, `R1-render`, `R1-redraft`, `R1-student`, `R2-stale`, `R2-accept`, `R2-accepted`, `R2-student`.
- **Over-broad reviewer assertion, 1 check:** `QC-02-c` — four of its five sub-conditions passed (stale flag set, re-draft offered, no Accept, out-of-date warning); it failed only on my `!oct2AsCurrent` sub-condition, which also matches the *historical* items the Draft panel intentionally keeps visible under the stale warning (`app.js` L1175–1177). That rendering meets the fix plan ("clearly marked stale with a re-draft path"). Not a defect; the probe is left as-run rather than edited post hoc.
- **Informational, 1 check:** `R-MODEL-5` — `acceptDraftPlan` does not refuse a stale draft at model level; today the UI branch is the only guard. Non-blocking on its own, but it is the reason reproduction B ends in an installed contradictory plan; a model-level refusal (or stale propagation into `currentPlan`) is the natural companion to the QC-11 fix.
- Harness errors 0, page exceptions 0, external requests 0.

## 5. Counts (from `probe.json`, computed programmatically)

43 checks: 31 passed, 12 failed = 10 QC-11 + 1 over-broad assertion + 1 informational. Blocking-flag failures 11 (10 QC-11 + `QC-02-c`); of these only the 10 QC-11 checks are product defects. 8 scenarios ran; 8 screenshots; profile removed.

## 6. Suggested direction (not implemented, not a requirement on wording)

In `restale`, compute `mismatch` over all items: `items.some(i => { const t = tasks.find(t => t.id === i.taskId); return t && i.due !== t.due; })` using the *updated* `tasks`, and keep `staleFrom` as the plan's own item date for the conflicting task; only clear when no item conflicts. Add a model guard in `acceptDraftPlan` that refuses (or carries `stale` into `currentPlan`). Regression tests: accepted + pending plan, unrelated approval, unrelated parent correction, plus the preserved cases `R-MODEL-3/4`.

## 7. Limitations / untested

- Only band 6–8, concept A, EN was used for QC-11 reproduction (code path is band/locale independent; not separately shown in ES or concepts B/C).
- Cross-task clearing via a parent *correction* of a different extracted task was traced statically only (same `applyDueChange` call), not probed; the sample extract always targets the plan's own task, so it may be unreachable through current controls.
- QC-06 and QC-10 rely on static reading plus the coordinator's already-green suites; no fresh browser probe.
- No rendering/accessibility re-audit (UX reviewer's scope); desktop 1440×1000 only.
- No claim of production security, screen-reader, native-Spanish, real-child or cross-browser verification.

## 8. Evidence index (`evidence/rereview-code-cycle1/`)

`probe.cjs`, `probe.json`, `probe.log`, `r1-parent-after-essay-approval-stale.png`, `r1-parent-after-history-approval.png`, `r1-student-after-history-approval.png`, `r2-parent-pending-stale-after-essay-approval.png`, `r2-parent-pending-after-history-approval.png`, `r2-parent-after-accepting-conflicting-draft.png`, `r2-student-after-accepting-conflicting-draft.png`, `r8-parent-es-payloads-inert.png`.

Rerun: `node evidence/rereview-code-cycle1/probe.cjs` (starts and removes its own Chrome profile; port 0; writes only into this directory).
