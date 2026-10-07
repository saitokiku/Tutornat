# FRONTEND_PHONE_DIAGNOSIS — historical PHONE-STALL carryover (bounded, read-only)

Date: 2026-10-01 08:14 CDT · Worker: Fable carryover diagnostic · Parent verifies independently; worker cannot close tracked tasks.

## 0. Disposition (one paragraph)

**REPRODUCED_EXACT (3/3) · MECHANISM_ESTABLISHED · ORIGIN UNRESOLVED (not fixed).**
Classification against the four allowed labels: **UNRESOLVED** at the level of *root origin*, with the stall *mechanism* established by direct runtime evidence. It is **not** `HARNESS_DEFECT_ESTABLISHED` (the probe's key up/down pairing and CDP plumbing were verified correct and are idle during the stall) and **not** `APP_DEFECT_ESTABLISHED` (no application loop, exception, dialog or blocking call was found; the app code on the stack is ordinary click → `act()` → `render()` → `focusAfterRender()`, executed once per externally delivered activation). The stall is a **self-sustaining activation loop driven by an unbounded stream of *trusted, natively generated* `keydown`+`keypress` pairs (key `"Unidentified"`, `timeStamp 0`, `repeat:false`) that Chrome delivers to whichever segmented-control button holds focus**; every pair activates the button (trusted `click`, `detail 0`, coords 0,0 — the keyboard-activation signature), the app re-renders and, by design, re-focuses the same `[data-act][data-arg]` button, and the next native pair re-activates it (~260 activations/s). Where Chrome's synthesized key stream originates was **not** identified within budget; see §6 for the single one-variable experiment recommended next.

## 1. Sequence fidelity

* App under test: byte-verified pre-polish baseline copy `/Users/man/education-product-discovery/design/evidence/frontend-baseline/runtime` (15/15 manifest sha256 re-verified before run 1; `evidence/frontend-baseline/manifest.json`). Nothing under the live app, baseline, prior evidence or original repos was written.
* Probe: **complete** 398-line `evidence/coordinator-phone-diagnosis/probe.cjs` copied to `evidence/frontend-carryover-phone/probe-carryover.cjs`. Diff (`probe-carryover.diff`, 101 lines) changes only: `ROOT` → baseline runtime, `OUT` → per-run directory, timeout bookkeeping (`report.timeouts`), optional `Debugger`/`Performance` enable gated by `PROBE_DEBUGGER=1`, and a `diagnoseStall()` routine that runs **only after the first CDP timeout**. The full original ordering/prehistory (sections 1–7: desktop keyboard journeys, role/concept/locale switches, parity, audits, contrast, desktop sweep, mid-session `Emulation.setDeviceMetricsOverride 390×844 mobile`, phone sweeps, skip-link Enter on `ol.turns`, then `reset('35','A','en','parent')`) is byte-identical up to the stall. No obsolete assertion was weakened; the 4 FAILs of the original (non-text contrast; INFO turns-not-tab-reachable; forward-Tab under banner `a 1`; INFO skip-link header under banner) recur identically in all 3 runs and are classified separately as pre-existing assertion outcomes, not part of this stall.
* v3 (`probe-carryover-v3.cjs`, diff `probe-carryover-v3.diff`) adds one harness-only `Page.addScriptToEvaluateOnNewDocument` capture-phase ring buffer (`window.__evlog`) recording trusted-ness/target/timestamp of click/pointer/key/submit events, plus three pause/resume samples. It does not touch app files and cannot alter dispatch order.
* Commands (bounded by subprocess timeout ≤ 290 s; Chrome for Testing 153.0.8010.52, fresh profile under `$HERMES_HOME/cache/scratch`, `--remote-debugging-port=0` loopback, profile removed on exit, no leftover processes verified with `pgrep` after each run):
  ```
  PROBE_ROOT=/Users/man/education-product-discovery/design/evidence/frontend-baseline/runtime PROBE_OUT=…/run1-exact-replay                     node probe-carryover.cjs
  PROBE_ROOT=… PROBE_OUT=…/run2-exact-replay-debugger PROBE_DEBUGGER=1  node probe-carryover.cjs
  PROBE_ROOT=… PROBE_OUT=…/run3-exact-replay-debugger-evlog PROBE_DEBUGGER=1 node probe-carryover-v3.cjs
  ```
* Run count: **3 full exact-prehistory runs** (budget allowed 4; the 4th was reserved for the one-variable experiment in §6 and was not run — time budget reached). No shorter substitute flow was used.

## 2. Reproduction results (raw: `runN/probe.stdout.log`, `runN/cdp-trace.log`, `runN/probe-report.json`)

| run | stall point (first CDP timeout) | prior burst | checks |
|---|---|---|---|
| original (coordinator, live root) | `#2003 Runtime.evaluate` locating `[data-act=band][data-arg=35]` right after pointer click on `lang=en` | — | 59/4 FAIL, 1 error |
| run1 | `#2003` same step, same selector, at +57.98 s | lang-en click never returned within 10 s | 59/4 FAIL, 1 error |
| run2 | `#2008` one step later (`concept=A`): lang-en click busy **2.58 s** then returned; band-35 click → permanent | lang-en 2584 ms | 59/4 FAIL, 1 error |
| run3 | `#2009` same as run2: lang-en busy **5.58 s**, band-35 click → permanent | lang-en 5575 ms | 59/4 FAIL, 1 error |

Focused element before/after the disputed phone skip-link Enter, all runs: `ol` (the `.turns` scroller, `tabindex="0"`, y=394 h=224) → unchanged `ol`. No `Page.javascriptDialogOpening` in any run. No `Runtime.exceptionThrown`, no `Log` errors, no HTTP(S) requests. `pending` CDP map at stall time: empty except the timed-out evaluate (the probe is idle — it is not sending input during the stall).

Trace context, run1 (identical shape in run2/run3 and the original):
```
[47649ms] #1997 ok 16ms :: Input.dispatchKeyEvent keyUp Enter
[47850ms] #1998 ok 1ms :: Runtime.evaluate (() => { const a=document.activeElement; if(!a||a===document.body) return {tag:'body'}; const r=a.getBoundingC
AFTER_PHONE_SKIP_ENTER {"tag":"ol","id":"","act":"","arg":"","type":"","text":"AI companion · Scripted demoHi Sam. Toda","disabled":false,"y":394,"h":224}
[47851ms] #1999 ok 1ms :: Runtime.evaluate (() => { const m=document.getElementById('main').getBoundingClientRect(); const b=document.getElementById('bou
[47852ms] #2000 ok 1ms :: Runtime.evaluate (() => { const el=document.querySelector("[data-act=\"lang\"][data-arg=\"en\"]"); if(!el || el.disabled) throw
[47853ms] #2001 ok 1ms :: Input.dispatchMouseEvent mousePressed 126,405
[47860ms] #2002 ok 7ms :: Input.dispatchMouseEvent mouseReleased 126,405
[57983ms] #2003 TIMEOUT after 10001ms :: Runtime.evaluate (() => { const el=document.querySelector("[data-act=\"band\"][data-arg=\"35\"]"); if(!el || el.disabled) throw
```

## 3. Post-stall diagnostics (new evidence)

Dispatch-path discrimination (run1, no Debugger):
* browser `/json/version`, `/json/list`: 2 ms — browser process healthy, page target alive at `…/runtime/index.html#main`.
* `Runtime.evaluate 1+1` (main-thread task): **timeout 2 s**.
* `Performance.getMetrics` ×2, `Debugger.pause` (returns `-32000 agent not enabled` in 1 ms): interrupt path serviced → V8 **is executing JS tasks continuously**, i.e. the renderer main thread is saturated, not deadlocked/crashed.
* `Runtime.terminateExecution`: ok 3 ms → next `Runtime.evaluate 1+1` ok 32 ms; page state afterwards: `activeElement=body`, `scrollY 0`, viewport 390×844, `langPressed en:true`, state intact (`tasks 3`, `focusTaskId 35-math-regroup`), screenshot `run1-exact-replay/stall-after-terminate.png`. Breaking the JS chain ends the stall; the page is otherwise undamaged.

Stack evidence (run2/run3 `Debugger.pause`, 17 `Debugger.paused` events each, `report.pausedEvents`):
* run2 (pre-scriptParsed map, line numbers only): top frame **`app.js:1440:18`**, step trail cycles `1440→1441→1442→1443→1440…` = the `app.addEventListener('click', …)` handler being entered **again and again** from native code (each entry is a new event dispatch, not a JS loop).
* run3 (resolved URLs): `e @ app.js:611` ← `render @ app.js:723` ← `act @ app.js:1358` ← click handler `app.js:1442`; 400 ms later: `focusin` handler `app.js:1465` ← `focusAfterRender @ app.js:747` (`el.focus()`) ← `render @ app.js:727` ← `act` ← click handler; 400 ms later again `e ← render ← act ← click`. The step trail leaves `act`/the click handler (`1443:3`) and immediately re-enters native dispatch and then the `focusin` `setTimeout` callback (`1468:7`) — there is **no** JS frame below the click handler.

Event-source evidence (run3 `__evlog`, capture phase on `document`, installed before `app.js`):
```
pause#1 t=62730 ms  clicks 4974 (trusted 4974, untrusted 0)  key events 11883
pause#2 t=63136 ms  clicks 5079                               key events 12093   (+105 clicks, +210 keys in 406 ms)
pause#3 t=63542 ms  clicks 5181                               key events 12297   (+102 clicks, +204 keys in 406 ms)
last keys (every sample): keydown, keypress, keydown, keypress … target BUTTON[data-act=band][data-arg=35],
                          isTrusted:true, key:"Unidentified", repeat:false, timeStamp:0
last clicks (every sample): click on BUTTON[band=35], isTrusted:true, detail:0, clientX/Y 0/0, buttons 0, pointerType "" , timeStamp 0
first events of this document (for contrast): click on A (skip link, ts 428), pointerdown/mousedown on BUTTON[lang=en] with real coords (913,125), pointerType "mouse", ts 589.6
pause#2 `ev` in scope: focusin, trusted, target BUTTON[band=35], composedPath length 10
```
Interpretation: exactly **two native key events per activation, zero untrusted events, no pointer/mouse events during the stall**. Enter activation of a `<button>` happens in Blink's `keypress` default handler on charCode 13 regardless of `key`, which is why an `"Unidentified"` key with text `\r` still clicks. `timeStamp 0` (null platform timestamp) and `key:"Unidentified"` (no DOM key) distinguish this stream from every key the probe sends (`Input.dispatchKeyEvent` carries `key:'Enter'`/`'Tab'` and a real timestamp — visible as `Enter`/`Tab` keys earlier in the same log) and from anything page JS can create (page-created events are `isTrusted:false`).

## 4. Hypotheses, ranked, and status

1. **Native/browser-level re-activation loop (synthesized Enter-like key stream × app re-focus)** — **SUPPORTED** by §3: trusted, timestamp-less, key-less keydown/keypress pairs at ~260/s; no JS frame below the click handler; terminating JS (which drops focus to `body`) ends it.
2. Page-JS infinite loop (e.g. `render`↔`focusin`↔`scrollBy`↔`resize`) — **FALSIFIED**: `focusin` handler only schedules a `setTimeout` (`app.js:1467–1471`); `syncBannerHeight` writes a constructed stylesheet; no JS frame recursion; event counters show the work is externally driven, one `act()` per native click.
3. Input-helper pairing error (missing keyUp / stuck modifier) — **FALSIFIED** for the probe's own events: every `keyDown`/`rawKeyDown` is followed by an acked `keyUp` (trace `#1996/#1997` Enter pair), and the loop's key events are not the probe's (`Unidentified`, ts 0; nothing pending).
4. JS dialog / blocking native call — **FALSIFIED**: no dialog events in 4 traces; interrupt-path CDP answers in ≤3 ms; `Performance.getMetrics` timestamps advance.
5. Missing/disabled `#due-input` or any parent-form state — **not causal**: the stall occurs inside `reset()` on the explorer segmented buttons before any parent form exists (`observations 0`, `draftPlan null` post-terminate).

Not established (honest gap): **which Chrome component emits the synthesized key pairs**, and why the burst is sometimes finite (2.6 s / 5.6 s after the `lang=en` click in runs 2–3) and permanent after the `band=35` click. Candidate contributors that the exact prehistory uniquely combines: `Emulation.setFocusEmulationEnabled`, a ~1,900-event CDP keyboard history on the same document, the `keyDown Enter` with `text:'\r'` delivered to a non-editable focusable scroller (`ol.turns`) immediately before the first burst, and mid-session mobile device-metrics emulation. These remain hypotheses, not findings.

## 5. Application code implicated (read-only; no change made or recommended as a fix)

* `app.js:1439–1443` — delegated click handler → `act()`.
* `app.js:1358` → `render()`; `app.js:719–720` rebuild the segmented controls (`seg('band'…)`, `seg('lang'…)`) with `innerHTML`.
* `app.js:735–749 focusAfterRender()` — restores focus to the control matching `[data-act="band"][data-arg="35"]` (`:740`, `:747`). This is the loop's **re-arm step**: it is correct accessibility behaviour (focus must not be lost when a control re-renders), and it is only a problem because an external trusted Enter stream keeps arriving. **No app defect is established**; a page that re-focuses an activated toggle button would behave identically under the same input stream.

## 6. Narrow readiness recommendation

* The historical PHONE-STALL is **not evidence of an application logic defect** and should **not block frontend polish**. It is reproducible only via the long CDP-driven prehistory, never appeared in the five shorter final-worker variants, and leaves app state intact when the input stream stops.
* Keep the stall **open as UNRESOLVED-origin** on the harness/browser side with one bounded next experiment (max 1 run, one variable): replay the exact prehistory with `Emulation.setFocusEmulationEnabled` **omitted** (or, alternatively, the phone skip-link Enter sent as `rawKeyDown`+`char` with an explicit `timestamp`). A green result isolates the Chrome-side trigger; a red result keeps it UNRESOLVED and the probe should instead abort the run when `__evlog` sees >50 trusted `Unidentified` keypresses/s, so future sweeps fail fast instead of timing out.
* Do **not** add app-side suppression of `Unidentified` keys or focus-restore throttling to “fix” this; that would mask a harness/browser artefact with an accessibility regression.

## 7. Artefacts (all new, under `evidence/frontend-carryover-phone/`)

* `probe-carryover.cjs`, `probe-carryover.diff` (vs original), `probe-carryover-v3.cjs`, `probe-carryover-v3.diff` (vs v2)
* `run1-exact-replay/`, `run2-exact-replay-debugger/`, `run3-exact-replay-debugger-evlog/`: `probe.stdout.log`, `cdp-trace.log`, `probe-report.json` (incl. `timeouts`, `stall`, `pausedEvents`, `pausedSamples`), screenshots (`stall-after-terminate.png` in run1/run3, plus the probe's usual desktop/phone PNGs), `phone.cpuprofile` (run1 only — Profiler.stop times out while the loop runs in run2/run3).
* Run metadata: `{"run1-exact-replay": {"started": "2026-10-01T13:01:03.050Z", "finished": "2026-10-01T13:02:04.532Z", "checks": {"total": 59, "failed": 4, "errors": ["phone: CDP timeout: Runtime.evaluate"]}, "timeouts": [[2003, "Runtime.evaluate (() => { const el=document.querySelector(\"[data-act=\\", 57983], [2004, "Runtime.evaluate 1+1", 59988]], "stall_at": 57983}, "run2-exact-replay-debugger": {"started": "2026-10-01T13:02:30.699Z", "finished": "2026-10-01T13:04:12.875Z", "checks": {"total": 59, "failed": 4, "errors": ["phone: CDP timeout: Runtime.evaluate"]}, "timeouts": [[2008, "Runtime.evaluate (() => { const el=document.querySelector(\"[data-act=\\", 58680], [2009, "Runtime.evaluate 1+1", 60686], [2030, "Runtime.terminateExecution", 66791], [2032, "Runtime.evaluate 1+1", 71794], [2033, "Runtime.evaluate (() => { const a=document.activeElement; const d=wind", 81796], [2034, "Page.captureScreenshot", 92049], [2035, "Profiler.stop", 102051]], "stall_at": 58681}, "run3-exact-replay-debugger-evlog": {"started": "2026-10-01T13:07:47.364Z", "finished": "2026-10-01T13:08:57.161Z", "checks": {"total": 59, "failed": 4, "errors": ["phone: CDP timeout: Runtime.evaluate"]}, "timeouts": [[2009, "Runtime.evaluate (() => { const el=document.querySelector(\"[data-act=\\", 60422], [2010, "Runtime.evaluate 1+1", 62426], [2038, "Runtime.terminateExecution", 69322]], "stall_at": 60422}}`
* Prior evidence untouched: `evidence/coordinator-phone-diagnosis/*`, `evidence/frontend-baseline/*` (hashes re-verified).

## 8. What was / was not proven

Proven: exact reproduction (3/3) at the same step; renderer busy not hung; stall = externally delivered trusted keyboard activations × app focus restore; probe idle and correctly paired; no dialog/exception/network; app state intact after termination; `#due-input` not involved.
Not proven: the Chromium-internal origin of the synthesized `Unidentified` key stream; why bursts self-terminate after the `lang` click but not after the `band` click. No fix was implemented or validated.
