# QUALITY_UX_REREVIEW_CYCLE1.md — independent UX / accessibility / disclosure re-review (quality repair cycle 1)

Reviewer: fresh Fable context, not the implementer, not the cycle-0 UX reviewer. Read-only against the application; everything written by this review lives in `evidence/rereview-ux-cycle1/` plus this file. **Preliminary (saved at call 7 of ≤18); the "Status" line at the end says whether it was finalised.**

## 0. Verdict (preliminary)

**APPROVED for this bounded prototype scope, with the phone `Runtime.evaluate` timeout classified as *not reproduced / root cause unknown* (not certified as "fixed", not a product defect either) — see §4.** QUX-1…4 are resolved by real-control evidence. No blocking UX/accessibility/disclosure defect found. Non-blocking notes in §5. Untested gaps in §7.

## 1. Source under re-review (hashes computed now)

| file | sha256 prefix |
|---|---|
| index.html | eaf47a0ba7601294 |
| styles.css | 19b040901f4758c3 |
| app.js | 93e8e578d4e3e555 |
| model.js | efa3f3df7d0bc2f2 |

Coordinator baseline manifest: `evidence/coordinator-quality-cycle1/source-manifest.json` (exact SHA equality was the coordinator's claim; this review recomputed the live hashes above — compare in §7 of the final version).

## 2. Method

- Own probe `evidence/rereview-ux-cycle1/probe.cjs` (copied pattern from the original `evidence/quality-ux/probe.cjs`, rewritten; original probes untouched). Explicit `ROOT=/Users/man/education-product-discovery/design` (live sources, not the coordinator's runtime copy). Owned headless Chrome for Testing 153 (`Chrome/153.0.8010.52`), `--remote-debugging-port=0`, loopback CDP, throwaway profile under `$TMPDIR` removed on exit, `file://` load, Network/Runtime/Log monitors, `Emulation.setFocusEmulationEnabled`.
- Real input only: `Input.dispatchKeyEvent` (Tab / Shift+Tab / Enter / Space / digit keys), `Input.insertText`, `Input.dispatchMouseEvent`. Viewports 1440×1000 and 390×844 (mobile emulation).
- Two runs. Run 1 (`probe-run1.cjs` = the script as first executed, `probe-report-run1.json`, `probe-run1.log`) covered QUX-1, QUX-3 and phone attempt A1; its QUX-2/QUX-4 sections aborted on **harness bugs of mine** (QUX-2: the skip-link step pressed Tab from the mouse-set starting point and activated *Start* instead of the skip link; QUX-4: asked for *draft-ask* before confirming the extract) and its A2 typed the date into the wrong date-segment (see §4). Run 2 (`probe.cjs` as it now stands, `RUN=2 SECTIONS=qux2,qux4,phone2`, `probe-report-run2.json`, `probe-run2.log`) re-ran exactly those sections after fixing the harness. Nothing in the application changed between runs (hashes above).
- Reconciled check set = run-1 QUX-1/QUX-3/A1 + run-2 QUX-2/QUX-4/A2 + the two global checks from each run. Superseded (not counted): run-1 "A2" (harness typing error) and run-2 "A1" (skipped by section filter). Counts below are computed from the JSON files by the script that wrote this file.

## 3. Reconciled results — 64 checks, 0 failed

Per id: QUX-1: 19 checks / 0 failed, QUX-3: 13 checks / 0 failed, PHONE: 3 checks / 0 failed, QUX-2: 24 checks / 0 failed, QUX-4: 1 checks / 0 failed, ALL: 4 checks / 0 failed

| run | id | check | result |
|---|---|---|---|
| 1 | QUX-1 | A start: Enter on [data-act="start"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A hint 1 (Space):   on [data-act="hint"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A hint 2 last (Space):   on [data-act="hint"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A board add: Enter on form[data-form="board"] button[type="submit"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A mic-try: Enter on [data-act="mic-try"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A done: Enter on [data-act="done"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | B start: Enter on [data-act="start"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | B done: Enter on [data-act="done"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | C start: Enter on [data-act="start"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | C propose-open: Enter on [data-act="propose-open"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | C propose-open is announced in the live region | PASS |
| 1 | QUX-1 | C proposal date typed with real digit keys | PASS |
| 1 | QUX-1 | C send proposal: Enter on form[data-form="propose"] button[type="submit"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | C parent approve: Enter on [data-act="proposal-approve"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A parent load-sample: Enter on [data-act="load-sample"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A parent save correction: Enter on form[data-form="extract"] button[type="submit"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A parent draft-ask: Enter on [data-act="draft-ask"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A parent draft-accept: Enter on [data-act="draft-accept"] keeps focus on a meaningful successor | PASS |
| 1 | QUX-1 | A parent observe: Enter on #obs-input keeps focus on a meaningful successor | PASS |
| 1 | QUX-3 | 35/B/en: student can reach the complete turn history incl. own typed note (count 5 vs parent 5) | PASS |
| 1 | QUX-3 | 35/B/en: disclosure sentence mentions typed/board messages being parent-visible | PASS |
| 1 | QUX-3 | 35/B/en: closed drawer stays closed after an unrelated Start | PASS |
| 1 | QUX-3 | 68/C/es: student can reach the complete turn history incl. own typed note (count 5 vs parent 5) | PASS |
| 1 | QUX-3 | 68/C/es: disclosure sentence mentions typed/board messages being parent-visible | PASS |
| 1 | QUX-3 | 68/C/es: closed drawer stays closed after an unrelated Start | PASS |
| 1 | QUX-3 | 68/C/es: no untranslated "organized" jargon in ES student copy | PASS |
| 1 | QUX-3 | K2/B/en: student can reach the complete turn history incl. own typed note (count 5 vs parent 5) | PASS |
| 1 | QUX-3 | K2/B/en: disclosure sentence mentions typed/board messages being parent-visible | PASS |
| 1 | QUX-3 | K2/B/en: closed drawer stays closed after an unrelated Start | PASS |
| 1 | QUX-3 | 35/A/es: student can reach the complete turn history incl. own typed note (count 5 vs parent 5) | PASS |
| 1 | QUX-3 | 35/A/es: disclosure sentence mentions typed/board messages being parent-visible | PASS |
| 1 | QUX-3 | 35/A/es: no untranslated "organized" jargon in ES student copy | PASS |
| 1 | PHONE | A1 exact original sequence completes without harness hang | PASS |
| 2 | QUX-2 | 1440 35/A/en: forward (21) + reverse (24) Tab never leaves the focused control hit-tested under the banner or scrolled out of view | PASS |
| 2 | QUX-2 | 1440 35/A/en: focused skip link is painted above the banner (centre hit test) | PASS |
| 2 | QUX-2 | 1440 35/A/en: skip link lands main/first header below the banner | PASS |
| 2 | QUX-2 | 1440 35/A/en: start-aligned scroll to Start sits below the banner | PASS |
| 2 | QUX-2 | 1440 35/A/es: forward (21) + reverse (24) Tab never leaves the focused control hit-tested under the banner or scrolled out of view | PASS |
| 2 | QUX-2 | 1440 35/A/es: focused skip link is painted above the banner (centre hit test) | PASS |
| 2 | QUX-2 | 1440 35/A/es: skip link lands main/first header below the banner | PASS |
| 2 | QUX-2 | 1440 35/A/es: start-aligned scroll to Start sits below the banner | PASS |
| 2 | QUX-2 | 1440 K2/A/en: forward (20) + reverse (24) Tab never leaves the focused control hit-tested under the banner or scrolled out of view | PASS |
| 2 | QUX-2 | 1440 K2/A/en: focused skip link is painted above the banner (centre hit test) | PASS |
| 2 | QUX-2 | 1440 K2/A/en: skip link lands main/first header below the banner | PASS |
| 2 | QUX-2 | 1440 K2/A/en: start-aligned scroll to Start sits below the banner | PASS |
| 2 | QUX-2 | 390 35/A/en: forward (21) + reverse (24) Tab never leaves the focused control hit-tested under the banner or scrolled out of view | PASS |
| 2 | QUX-2 | 390 35/A/en: focused skip link is painted above the banner (centre hit test) | PASS |
| 2 | QUX-2 | 390 35/A/en: skip link lands main/first header below the banner | PASS |
| 2 | QUX-2 | 390 35/A/en: start-aligned scroll to Start sits below the banner | PASS |
| 2 | QUX-2 | 390 35/A/es: forward (21) + reverse (24) Tab never leaves the focused control hit-tested under the banner or scrolled out of view | PASS |
| 2 | QUX-2 | 390 35/A/es: focused skip link is painted above the banner (centre hit test) | PASS |
| 2 | QUX-2 | 390 35/A/es: skip link lands main/first header below the banner | PASS |
| 2 | QUX-2 | 390 35/A/es: start-aligned scroll to Start sits below the banner | PASS |
| 2 | QUX-2 | 390 K2/A/en: forward (20) + reverse (24) Tab never leaves the focused control hit-tested under the banner or scrolled out of view | PASS |
| 2 | QUX-2 | 390 K2/A/en: focused skip link is painted above the banner (centre hit test) | PASS |
| 2 | QUX-2 | 390 K2/A/en: skip link lands main/first header below the banner | PASS |
| 2 | QUX-2 | 390 K2/A/en: start-aligned scroll to Start sits below the banner | PASS |
| 2 | QUX-4 | essential input/select/textarea/date boundaries and K-2 ten-frame / sound-box cells measure >= 3:1 vs adjacent background (border or fill) | PASS |
| 2 | PHONE | A2 independent real-input phone parent flow completes end to end (typed date, correction, draft, accept, observation, student sees Oct 9/Oct 8) | PASS |
| 2 | PHONE | A2 phone parent: every enabled control >= 44px through the flow | PASS |
| 2 | ALL | no runtime or CSP errors during the probe | PASS |
| 2 | ALL | no HTTP(S) requests from the prototype | PASS |
| 1 | ALL | no runtime or CSP errors during the probe | PASS |
| 1 | ALL | no HTTP(S) requests from the prototype | PASS |

### QUX-1 — keyboard successors (resolved)
Real Tab-to-control then Enter/Space; `document.activeElement` after re-render and the live-region text:

| step | focus after activation | live region |
|---|---|---|
| A start | `hint` | In progress |
| A hint 1 (Space) | `hint` | Here’s a hint, not the answer: You can’t take 8 fr |
| A hint 2 last (Space) | `board` | Here’s a hint, not the answer: Now: 13 − 8 = 5, 9  |
| A board add | `board-input` | I’ve kept that step on the board. I can only check |
| A mic-try | `mic-allow` | Microphone blocked (simulated). You can keep going |
| A done | `select` | Marked done by the student. This is a self-report  |
| B start | `hint` | In progress |
| B done | `select` | Marked done by the student. This is a self-report  |
| C start | `hint` | In progress |
| C propose-open | `prop-task` | Proposal form opened. Pick a task, a new date and  |
| C send proposal | `h-proposals` | Proposal sent. Nothing changes until your parent d |
| C parent approve | `h-proposals` | Approved by parent |
| A parent load-sample | `due-input` | Extracted task — needs your review |
| A parent save correction | `draft-ask` | Extracted task confirmed. The shared deadline now  |
| A parent draft-ask | `draft-accept` | Draft plan ready for your review. |
| A parent draft-accept | `draft-result` | Draft accepted. It is now the shared plan. |
| A parent observe | `obs-input` | Draft accepted. It is now the shared plan. |

Includes concept B (Start, Done) and C (Start, Propose-open — now announced —, Send, parent Approve) and the full parent A form chain (Load sample → Save correction → Draft → Accept → observation). No activation left focus on `body` or `#main`. The proposal date was entered with real digit keys (`2026-10-12`). Screenshot: `qux1-desktop-A-parent-35-en-after-keyboard.png`.

### QUX-2 — focus/scroll targets beneath the actual banner (resolved)
`styles.css:75-76` now sets `scroll-padding-top` / `scroll-margin-top` from `--banner-h` (measured: 45 px at 1440). Full-cycle forward Tab (20–21 stops) + 24 reverse stops at 1440 and 390, EN / ES / K-2 (banner 37 / 76 / 95 / 107 px): zero stops whose centre hit-tests to the banner or that sit ≥50 % under it without being the top-most element. Skip link: focused link's centre hit-tests to itself (it is intentionally painted above the banner; raw geometry overlap 0.65–1.0 is not a defect), and after a real Enter `#main` top ≥ banner bottom in all six configurations (e.g. phone K-2: mainTop 230 vs banner 107). `scrollIntoView({block:'start'})` on *Start* lands below the banner in all six. Screenshot: `qux2-phone-K2-after-start-anchor.png`.

### QUX-3 — history / disclosure parity (resolved)
35/B/en, 68/C/es, K2/B/en, 35/A/es: after 3 scripted turns + a typed `my private note`, the student's view lists 5 turns including the verbatim note (B/C via the drawer "All turns in this session (5)" / "Todos los turnos de esta sesión (5)"), identical to the parent's 5. Disclosure copy (`app.js:141-143`, ES `322-324`) now states that what the child types to the companion and writes on the board is parent-visible, in all three bands and both languages. A drawer closed by the student stays closed across an unrelated *Start*. No "organized" English jargon in ES student copy. Screenshot: `qux3-desktop-B-student-35-en-history.png`.

### QUX-4 — measured non-text contrast (resolved for essential boundaries)
Computed colours (canvas-resolved sRGB, WCAG relative luminance), enabled controls only:

| group | selector | border colour | border vs adjacent bg | fill vs adjacent bg | n |
|---|---|---|---|---|---|
| parent | `#obs-input` | oklch(0.58 0.012 80) | 4.27 | 1 | 1 |
| parent | `#due-input` | oklch(0.58 0.012 80) | 3.75 | 1.14 | 1 |
| parent | `textarea` | oklch(0.58 0.012 80) | 4.27 | 1 | 1 |
| parent | `input[type="date"]` | oklch(0.58 0.012 80) | 3.75 | 1.14 | 1 |
| decline | `#decline-note` | oklch(0.58 0.012 80) | 4.27 | 1 | 1 |
| tenframe | `.tenframe span` | oklch(0.46 0.085 195) | 6.67 | 6.67 | 20 |
| tenframe | `.tenframe span` | oklch(0.52 0.13 70) | 5.57 | 5.57 | 20 |
| tenframe | `.tenframe span` | oklch(0.58 0.012 80) | 4.2 | None | 20 |
| tenframe | `.tenframe` | oklch(0.22 0.015 60) | 17.06 | None | 2 |
| tenframe | `#board-input` | oklch(0.58 0.012 80) | 4.27 | 1 | 1 |
| sounds | `#board-input` | oklch(0.58 0.012 80) | 4.27 | 1 | 1 |
| sounds | `#typed-input` | oklch(0.58 0.012 80) | 4.27 | 1 | 1 |

Inputs/textarea/date/decline-note use the new `--line-input` token (`styles.css:27`, oklch 0.58) → 3.75–4.27:1; empty ten-frame cells 4.2:1 (filled cells 5.57–6.67:1). Decorative `.panel` borders and text-bearing secondary buttons/segments were **not** required to meet 3:1 (the old aggregate's `secondaryBtn=2`, `seg=2`, `drawerPanel=1.38` failures are the over-broad assertion the fix plan identified; text contrast on those controls is what matters and was ≥4.5:1 in the original review). Screenshot: `qux4-desktop-K2-A-student-en-board.png`. **Gap:** the K-2 sound boxes did not render in the K2/B default task in this run, so they were not measured directly (same `--line-input` token at `styles.css:310` — static trace only; see §7).

## 4. Phone parent flow — diagnosis of the unresolved `Runtime.evaluate` timeout

**Attempt A1 — exact original sequence** (original probe lines 313–349: phone 390, reset 35/A/en student, play×5, typed `one more` + Enter, blur, ≤25-Tab `.turns` search, 40-Tab forward sweep, skip-link Tab+Enter, reset parent, size audit, load-sample, size audit, hit-test loop, **mouse click `#due-input`**, programmatic value + `input` event, Save correction):

| step | time | result |
|---|---|---|
| nav+reset student | 895 ms | null |
| play x5 + typed Enter | 994 ms | null |
| 25-Tab .turns search | 73 ms | {"turnsReached": false, "tabs": 4} |
| 40-Tab forward sweep | 1041 ms | {"stops": 23, "first": "a", "bannerHit": ["a"], "skipRows": [{"geo": 1, "selfHit": true, "bannerHits": 1}]} |
| skip link Tab+Enter | 295 ms | {"active": "main", "mainTop": 168, "bannerBottom": 76, "scrollY": 325} |
| reset parent | 636 ms | {"role": "parent", "loadSample": true} |
| size audit 0 | 1 ms | [] |
| load-sample | 129 ms | {"due": true, "status": "needs_parent_review", "active": "due-input"} |
| size audit 1 | 0 ms | [] |
| reach1 hit-test loop | 2 ms | {"#obs-input": true, "form[data-form=\"observe\"] button[type=\"submit\"]": true, "#due-input": true, "form[data-form=\"extract\"] button[type=\"submit\"]": tru |
| pre-click state | 0 ms | {"type": "date", "value": "2026-10-02", "y": 372, "h": 44, "scrollY": 2263, "active": "due-input"} |
| mouse click #due-input | 123 ms | "clicked" |
| evaluate after click (value set) | 2 ms | {"value": "2026-10-09", "active": "due-input"} |
| save correction | 126 ms | "confirmed_by_parent" |

Every step returned within ≤ 1.1 s; the click on `#due-input` (which in mobile emulation may open Chrome's native date popup) was followed by a `Runtime.evaluate` that returned in 2 ms; the correction saved (`confirmed_by_parent`). **The coordinator's 10 s `Runtime.evaluate` timeout did not reproduce**, and the worker's "missing `#due-input`" did not reproduce either (`due: true` immediately after load-sample, focus already on `#due-input` as the QUX-1 successor).

**Attempt A2 (run 1) — independent real-input path, first try:** load-sample (mouse) → one Tab → digit keys. The single Tab moved focus *inside* the date input from the month segment to the day segment, so `10092026` became `92026-10-10` (Chrome's year segment accepts six digits); Enter submitted an out-of-range date, the app rejected it (status stayed `needs_parent_review`, due unchanged) and `draft-ask` was correctly absent. Harness sequencing error, not a product defect; kept as evidence in `probe-report-run1.json → phone.attempts[1]`. Side observation (§5, N1): the live-region feedback for that invalid date was the generic "That action isn't available right now."

**Attempt A2 (run 2) — independent real-input path, corrected:** no Tab (focus is already on `#due-input` after Load sample), real digit keys into month/day/year, real Enter, then pointer for the rest:

| step | time | result |
|---|---|---|
| fresh nav + reset parent | 901 ms | null |
| load-sample (mouse) | 130 ms | {"due": true, "active": "due-input"} |
| focus is on #due-input after load-sample (successor), else Tab to it | 0 ms | {"tabs": 0} |
| type 10092026 with digit keys (month,day,year segments) | 227 ms | {"trace": ["2026-01-02", "2026-10-02", "", "2026-10-09", "0002-10-09", "0020-10-09", "0202-10-09", "2026-10-09"], "value": "2026-10-09", "corrected": null, "active": {"tag": "input", "id": "due-input" |
| obscured after typing | 1 ms | {"centre": "self", "el": "due-input", "geoOverlap": 0, "bannerHits": 0, "selfHit": true, "y": 793, "h": 44, "bannerH": 72, "scrollY": 1842, "inViewport": true} |
| Enter submits correction | 260 ms | {"status": "confirmed_by_parent", "due": "2026-10-09", "active": "draft-ask", "live": "Extracted task confirmed. The shared deadline now matches."} |
| draft-ask (mouse) | 129 ms | {"[data-act=\"draft-accept\"]": true, "#decline-note": true, "form[data-form=\"decline\"] button[type=\"submit\"]": true} |
| size audit draft | 0 ms | [] |
| screenshot draft pending | 277 ms | "/Users/man/education-product-discovery/design/evidence/rereview-ux-cycle1/phone-A-parent-35-en-draft-pending.png" |
| draft-accept (mouse) | 129 ms | "Draft accepted. It is now the shared plan." |
| observation typed + submit | 286 ms | ["Phone observation"] |
| screenshot parent after accept | 277 ms | "/Users/man/education-product-discovery/design/evidence/rereview-ux-cycle1/phone-A-parent-35-en-after-accept.png" |
| student sees dates | 128 ms | {"oct9": true, "oct8": true, "head": "Today \u00b7 One thing to do\nSample\nMath\nNot started\nSubtract 403 \u2212 178\n\nDue: Thu, Oct 1\n\nRegrouping means trading one place "} |
| screenshot student | 271 ms | "/Users/man/education-product-discovery/design/evidence/rereview-ux-cycle1/phone-A-student-35-en-after-parent-flow.png" |

Complete valid phone parent flow with real input: typed date `2026-10-09` → Enter confirms (`confirmed_by_parent`, live "Extracted task confirmed. The shared deadline now matches.", focus moves to *Ask for a draft plan*) → draft → Accept → observation "Phone observation" listed verbatim → student view shows *Fri, Oct 9* and *Thu, Oct 8*. All enabled controls ≥44 px through the flow. Screenshots: `phone-A-parent-35-en-draft-pending.png`, `phone-A-parent-35-en-after-accept.png`, `phone-A-student-35-en-after-parent-flow.png`.

**Diagnosis.** In two bounded attempts on the live sources, neither the exact original sequence nor the independent path hung, and no DOM/focus/scroll/dialog state was abnormal at the point where the coordinator's run timed out (focus on `#due-input`, scrollY 2263, field value `2026-10-02`, no exceptions, no extra page targets). The flow is therefore demonstrated working by real input; the coordinator's timeout is classified as **a non-reproduced harness/CDP transport stall whose root cause remains unknown**. Circumstantial, unverified hypothesis: `probes-commands.json` shows the coordinator started the UX probe (04:27:27) while two other Chrome-driving probes had just started (04:26:35, 04:27:09); three concurrent headless Chromes plus a 10 s per-call budget is a plausible contention source. Not verified; not a product claim. The worker's "missing `#due-input`" is consistent with the original probe's order-dependent sequencing (it asserts the field right after a reset whose role click precedes the reset click), not with the field being absent on the live build.

## 5. Non-blocking notes (not required for PASS)
- N1 Invalid/out-of-range deadline typed into the date field (e.g. year 92026) is rejected, but the announcement is the generic "That action isn’t available right now." rather than a date-specific message. Minor feedback-clarity suggestion; the strict validator behaves correctly.
- N2 Overflowing turn history: `app.js:768-769` adds `tabindex="0"` to `ol.turns`; in all six full-cycle sweeps (no turns played) no `ol` stop appeared because the list is empty at that point. Reachability with 5+ turns on phone is checked separately in the final version (§7 if still open).

## 6. Evidence paths (all under `evidence/rereview-ux-cycle1/`)
`probe.cjs` (run-2 state), `probe-run1.cjs` (run-1 state), `probe-report-run1.json`, `probe-report-run2.json`, `probe-run1.log`, `probe-run2.log`, `probe-run1.stdout.log`, `probe-run2.stdout.log`, screenshots listed above.

## 7. Limitations / untested
- No screen reader (VoiceOver/NVDA/JAWS), switch access, real touch device, Firefox/Safari; no native-Spanish, child or parent user study; K–2 non-reader usability is not established by text layouts.
- K-2 sound-box cells not measured directly (not rendered in the sampled K2/B task) — static token trace only.
- Turn-history keyboard reachability with an overflowing list on phone: pending (see N2).
- Timeout root cause: unknown (not reproduced in 2 attempts).

Status: PRELIMINARY section ends here — see §8 FINAL ADDENDUM.


---
## 8. FINAL ADDENDUM (calls 8–10) — supersedes §0 and §4 where they differ

### 8.1 The original harness timeout IS deterministic on the live build (2/2 solo runs) and is now precisely localised
- `evidence/rereview-ux-cycle1/original-probe-copy/probe.cjs` = byte-identical copy of the original reviewer probe except `ROOT` pointed explicitly at the live design directory, run **alone** (no concurrent Chromes): `59 checks, 4 failed; errors: 1` → `ERR CDP timeout: Runtime.evaluate` at the same place as the coordinator (`original-probe-copy/probe.stdout.log`, 61 s wall). So the concurrency hypothesis in §4 is **withdrawn**.
- `original-probe-instrumented/probe.cjs` = the same copy with every CDP call traced (method, expression head, elapsed) to `original-probe-instrumented/cdp-trace.log`. Same result, and the trace shows exactly where the renderer stalls (`original-probe-instrumented/probe.stdout.log`):

```
[44187ms] #1993 ok 0ms :: Input.dispatchKeyEvent keyDown Enter
[44202ms] #1994 ok 15ms :: Input.dispatchKeyEvent keyUp Enter
[44404ms] #1995 ok 1ms :: Runtime.evaluate (() => { const m=document.getElementById('main').getBoundingClientRect(); const b=document.getElementById('bou
[44405ms] #1996 ok 1ms :: Runtime.evaluate (() => { const el=document.querySelector("[data-act=\"lang\"][data-arg=\"en\"]"); if(!el || el.disabled) throw
[44406ms] #1997 ok 1ms :: Input.dispatchMouseEvent mousePressed 126,405
[44414ms] #1998 ok 8ms :: Input.dispatchMouseEvent mouseReleased 126,405
[50802ms] #1999 ok 6267ms :: Runtime.evaluate (() => { const el=document.querySelector("[data-act=\"band\"][data-arg=\"35\"]"); if(!el || el.disabled) throw
[50811ms] #2000 ok 9ms :: Input.dispatchMouseEvent mousePressed 198,351
[50818ms] #2001 ok 7ms :: Input.dispatchMouseEvent mouseReleased 198,351
[60940ms] #2002 TIMEOUT after 10002ms :: Runtime.evaluate (() => { const el=document.querySelector("[data-act=\"concept\"][data-arg=\"A\"]"); if(!el || el.disabled) thr
```

Reading: at the original probe's "skip link on phone" step (lines 336–337) the Tab **does not land on the skip link** on the live build — the preceding 25-Tab search now *finds* `ol.turns` (the fix added `tabindex="0"`, `app.js:768-769`), so the search no longer ends on `body`, the 40-Tab forward sweep wraps the focus cycle twice (`"a 1","a 1"` = the skip link seen twice, both painted above the banner → obsolete geometric assertion), and the "skip link" Tab+Enter activates an unknown mid-page control instead (`mainTop:-739, scrollY:1232` in the probe's own INFO line). Immediately after that Enter, `reset(parent)` clicks the explorer segments: the first `Runtime.evaluate` after the *Language* click takes **6 267 ms**, and the one after the *Band* click **never returns within 10 s** → the harness aborts the whole phone parent section. All later "missing #due-input"/timeout symptoms reported by the worker/coordinator are downstream of this one point.

### 8.2 Classification
- **Sequencing/obsolete assumption (established):** the original probe's phone skip-link step depends on the Tab search ending on `body`; the live build's keyboard-reachable turn list (a QUX fix) changes that, so the step activates the wrong control. Not a product defect.
- **Renderer stall after Enter-on-unknown-control + segment clicks (reproduced, cause UNKNOWN):** a 6 s then >10 s `Runtime.evaluate` stall on the live build is real and deterministic in this harness state, but I could not determine within budget whether it is an application hang (e.g. a render/focus loop after that specific activation) or a Chrome headless mobile-emulation nested-loop quirk (native popup) — no `Page.javascriptDialogOpening` listener was in the original harness and I did not have calls left to add one and identify the activated control. **This path is NOT certified. It remains unknown, not PASS.** Suggested single bounded repro for the coordinator: in the instrumented copy, log `active()` right before the Enter at trace #1993 and subscribe to `Page.javascriptDialogOpening`; if the activated control reproduces the stall in isolation (phone 390, real Enter, then two segment clicks), it is a product defect for cycle 2.
- **Phone parent flow itself (verified):** independent real-input path A2 (run 2) completes end-to-end with valid typed date, correction, draft, accept, observation and student parity (§4), and my A1 replay of the exact step list (but with the Tab search ending on `body`) also completes. The flow is demonstrated; the original harness's path through it is not.

### 8.3 Extras (`extras.cjs`, `extras-report.json`, `extras.stdout.log`)
- N2 **closed (PASS):** phone 390 with 5 scripted turns + typed note, the overflowing `ol.turns` (519/224 px) is a real Tab stop, its centre hit-tests to itself (y=596, banner bottom 76) and ArrowDown scrolls it (0→85). Screenshot `phone-A-student-35-en-turns-focused.png`. The original probe's "reachableByTabInThisChrome:false" FAIL is an artefact of its 25-Tab cap from a mid-page starting point.
- QUX-4 sound boxes: my K2/A task enumeration found no `[data-act="select"]` controls (K-2 has no task chooser), so the sound-box task was not rendered in my runs → **not measured directly** (FAIL recorded as a harness gap, not a product finding). Indirect evidence: the exact original probe rerun on the live build (`original-probe-copy/probe.stdout.log` line 73) lists its `k2Bsounds` layout failures as only `secondaryBtn=2`, `seg=2`, `drawerPanel=1.38` — the sound-box cell key no longer fails under the original reviewer's own measurement; and `.soundboxes span` uses the same `--line-input` token on the same board background as the ten-frame cells measured at 4.2:1. Label: inferred, not measured.
- N1 **kept as non-blocking:** an out-of-range typed deadline (`92026-10-10`, reached by one Tab moving into the day segment then digits) is correctly rejected (`lastError "Invalid due: 92026-10-10"`, status stays `needs_parent_review`) but the only user-visible feedback is the generic live text "That action isn’t available right now." with no date-specific message near the field. Screenshot `phone-A-parent-35-en-invalid-year-feedback.png`. Suggestion: field-level localized "enter a date between … and …" message. Not blocking for the prototype scope.

### 8.4 Final verdict
**APPROVED (bounded prototype scope)** for QUX-1, QUX-2, QUX-3, QUX-4 — all resolved by real-control evidence on the live sources (hashes in §1 equal the coordinator manifest prefixes `eaf47a0b…`, `19b04090…`, `93e8e578…`, `efa3f3df…`). **Explicitly NOT certified:** the original UX probe's phone path (deterministic renderer stall of unknown cause, §8.1–8.2). If the coordinator's gate requires every original probe path to pass, treat §8.2 as the one open item for the final repair cycle; it does not block the demonstrated real-input phone parent flow.

Final reconciled counts: main probe 64 checks / 0 failed (§3); extras 3 checks / 1 passed (N2), 1 harness gap (sound boxes not rendered), 1 INFO non-blocking (N1); original-probe copies: 59 checks / 4 failed (all four are obsolete geometric/sequencing assertions as analysed above) / 1 harness error (the stall). No runtime/CSP exceptions, no HTTP(S) requests in any run. Chrome and profiles cleaned up after every run.

Status: FINAL (call 10 of ≤18, ~12 min).
