# Quality cycle 1 — independent re-review instructions

Planner/coordinator: Astra. Two fresh Fable reviewers; neither is the implementer. Application sources and all existing tests/reports/evidence remain read-only during this gate. No final approval from implementation self-report.

## State and invariants

Root: `/Users/man/education-product-discovery/design`. Synthetic local K–8 EN/ES parent/student concept explorer (A Today-first, B workspace-first, C shared plan-first). No actual AI/audio/school account/storage, tutor operations, child data, installs, network services, deployments, git operations, spending or routing/config changes. Private work must not route to DeepSeek. Main routing remains unchanged. Live worker routing was read back as Fable / Anthropic / requested max, with Astra → Opus → Sol fallbacks; no assertion that fallback execution was tested.

Coordinator independently executed unchanged source/test copies with exact SHA-256 equality under `evidence/coordinator-quality-cycle1/runtime/`. `source-manifest.json` records original test/evidence preservation, and `suites-verification.json` records 29 model tests, 28 spec checks, 50 repair checks, 24 original UI checks (36 desktop / 6 mobile render configurations), 114 new quality checks. All passed; original tests were not weakened. These suites are not exhaustive acceptance.

Coordinator also reran original observational reviewer probes, preserving their original files. `probes-verification.json` and `runtime/evidence/quality-{code,ux}/` are actual rerun evidence. Old code probes stop on some correctly absent controls; the UX probe still reports a phone Runtime.evaluate timeout. Neither a zero process exit nor an obsolete expectation is an acceptance verdict.

A new coordinator **model** probe found a date-lifecycle regression: accept an essay plan due October 2 → approve essay due October 9 (plan is stale) → approve an unrelated history due October 12. `applyDueChange` then removes the essay plan's stale flag even though its October 2 items still conflict with the October 9 task. Code reviewer must independently assess reachability/severity and reproduce through real controls. It is not yet claimed as browser-verified.

## Shared instructions

1. Read current source, original finding acceptance criteria (`QUALITY_FIX_PLAN.md`), and pertinent reviewer report. Treat the worker's `QUALITY_FIX_REPORT.md` as claims, not proof. Do not re-run the entire already-run regression suite.
2. Use fresh actual-control probes, focused static tracing and settled screenshots. Node/CDP harness infrastructure is available in `tests/quality.e2e.cjs` and original probe scripts. Browser uses installed Chrome for Testing 153, own port 0, own profile under `$TMPDIR`, loopback CDP. No browser default changes or package installation. Copy infrastructure into an authorized new evidence directory with explicit ROOT pointing to the live design directory; never overwrite original probes or test outputs.
3. Save substantive preliminary report/evidence within the first 8 calls; budget at most 18 tool calls or 12 minutes. Stop broad exploration when a reproducible blocker is found, but cover the named disputed issue in your role. At the limit, return explicit untested gaps rather than pretending completion. No subdelegation. No implementing repairs or closing tasks.
4. Return APPROVED only for this bounded prototype when no blocking defect remains in your scope. Otherwise REQUEST_CHANGES with exact real steps, expected/actual, code location, severity and evidence. Distinguish harness error, obsolete assertion, non-blocking suggestion and product defect. All counts must reconcile programmatically.

## Code/state/privacy reviewer

Allowed writes only: `QUALITY_CODE_REREVIEW_CYCLE1.md` and `evidence/rereview-code-cycle1/`.

- Verify QC-01…05 closure and nearby introduced regressions: replay/source attribution across genuine contributions; date approval/extract/current and pending plans; confirm after approval/correction history; terminal proposal safety; explicit versus incidental hint intent.
- Prioritize the independently observed cross-task stale-plan failure above. Cover accepted and pending plans with actual controls. Evaluate `applyDueChange` staleness against all dependent tasks, not just the task most recently changed. Record whether old Accept controls become incorrectly available.
- Review input escaping, zero network/storage boundary, and assisted-versus-independent evidence without production security claims. Optional low-priority findings must not bury a reproducible deadline contradiction.
- Return every required QC id with resolved/not-resolved/untested status; attach a real-control reproduction for any remaining blocker.

## UX/accessibility/disclosure reviewer

Allowed writes only: `QUALITY_UX_REREVIEW_CYCLE1.md` and `evidence/rereview-ux-cycle1/`.

- Verify QUX-1…4: actual Enter/Space focus successors (including B/C), forward/reverse Tab beneath actual banner, complete child/parent-visible histories and EN/ES disclosures, essential input/ten-frame/sound-box contrast.
- Diagnose the unresolved phone parent flow failure; reproduce with instrumentation and bounded attempts, not blind retries. Original probe context: after phone turn-history/Tab/skip-link steps, reset to parent → Load sample → enumerate/hit-test fields → click #due-input → correct → draft → accept → observation. Coordinator got `phone: CDP timeout: Runtime.evaluate`; worker got both missing #due-input and the timeout. Determine whether a real date-picker/focus/scroll interaction or a harness sequencing issue; verify the full flow by an independently valid real-input path and preserve exact evidence. If unknown, label unknown and do not certify that path.
- Do not require decorative panel borders or text-bearing secondary-button outlines to meet an essential-boundary criterion merely to green the over-broad old aggregate. Measure required inputs/cells; distinguish border overlap from actually obscured focus (skip link is intentionally above the banner).
- Preserve no screen-reader/native-Spanish/real-child/cross-browser certification claim. K–2 non-reader usability is a future study, not verified by text layouts.

## Coordinator gate after both reviews

Read exact reports and evidence, independently reproduce any decision-changing new finding, and re-check application/test hashes. At most one more focused quality repair cycle remains (two total). Do not deliver as verified while a required path remains blocked; no production architecture/build before the owner's interaction-direction choice.
