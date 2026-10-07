# Historical concept carryover — coordinator disposition

## Decision

The bounded old-work investigation is reconciled. The old `design/` artifact is a scripted concept experiment, not the finished frontend. Preserve it, its tests, all raw failures, and outstanding issues. Continue the separately authorized connected build in `frontend/`; do not keep re-auditing the old demo as a substitute for implementation.

**PHONE-STALL: origin UNRESOLVED, not fixed.** The three saved exact-replay reports record the original phone-stage timeout. Event sampling supports an activation flood involving trusted timestamp-zero key/click events and repeated render/focus work. It does not establish whether application logic, Chrome, emulation, or the test driver initiates it. Do not present this as a proven harness defect or add speculative key suppression/focus throttling.

## What the coordinator checked

- Parsed `design/FRONTEND_PHONE_DIAGNOSIS.md`, the three `frontend-carryover-phone/run*/probe-report.json` records, and paused-event samples. The recorded trusted-click rates between the sampled pauses are 258.6/s and 251.2/s. These are calculations from existing evidence, **not a fresh coordinator reproduction or proof of cause**.
- Independently rehashed every entry in `design/evidence/frontend-baseline/manifest.json`: all 15 live historical source/test files and all 15 baseline copies match their saved hashes. New reports/evidence are outside this source snapshot.
- Salvaged and parsed the interrupted journey review's `design/evidence/frontend-carryover-review/carryover-probe.json`; inspected its actual assertion code and two saved phone screenshots. The tiny full-page K–2 thumbnail only supports a density observation, not detailed readability certification.
- Saved the executable reconciliation and enumerated results at `evidence/frontend-carryover-reconciliation/{reconcile.py,reconciliation.json}`. The script checks per-scenario declared counts against the enumerated assertions and refuses to overwrite its output.

## Interrupted journey audit: retained evidence, not approval

| Recorded scope | Pass | Fail | Skipped | Informational |
|---|---:|---:|---:|---:|
| 18 paired-role desktop scenarios (A/B/C × EN/ES × three bands) | 582 | 12 | 6 | 12 |
| 10 selected phone scenarios | 106 | 15 | 0 | 0 |

These totals describe recorded checks, not distinct defects, complete acceptance, or one verified clean run. The worker was interrupted after exceeding its original budget, and its prose report is only a partial checkpoint. No further old-demo rerun was launched to manufacture a completion claim.

1. The 12 desktop failures share an over-broad predicate: `/organi[sz]/` somewhere in all main text plus exactly two rows across **all** tables. Without inspecting the failed subconditions per scenario, this does not establish twelve product defects or prove organization-only completion is broken. Preserve and mark unadjudicated.
2. Twelve phone failures are repeated geometry assertions in four scenarios: parent content extends 37 CSS px beyond the configured 390px device width in A/es/K2, and 19px beyond 320px in A/B/C/en/35. Test against the configured emulated device width, not only `window.innerWidth`, which can expand along with the overflow. Carry forward a new-app narrow-screen regression; the old artifact is not being silently repaired.
3. The remaining three phone failures expect focus on the hint control after Start but record `#main`. Whether that violates the intended meaningful-focus behavior remains unadjudicated. Test actual Tab/Shift-Tab and Enter/Space flows in the new app rather than inheriting the old selector expectation.
4. Recorded observations include replaced decline-note history and the adult text scaffolding required by K–2. The new contract already requires historical decisions, provenance and honest non-reader limitations; native Spanish and real-family usability remain external validation gates.

## Disposition of retained tasks

- `frontend-carryover`: complete **as evidence reconciliation and triage**, not as an application fix.
- `quality-phone-stall`: open. The bounded diagnostic subtask is complete; a causal diagnosis/fix is not established. Original exact-replay evidence remains immutable.
- Old prototype/concept/band/locale/quality tasks: coverage now documented, blanket certification withheld. Keep their limitations in `BACKLOG.md`; their tests cannot certify the new frontend.
- New frontend: still requires AC-01–AC-10 verification, independent real-control journeys and a fresh quality review. A new implementation does not automatically close the historical hang.
