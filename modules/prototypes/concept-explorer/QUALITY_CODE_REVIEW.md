# Quality code review — Academic Companion K–8 concept explorer (design prototype)

**Verdict: REQUEST_CHANGES** — five reachable logic/consistency defects reproduced through real controls (three High, two Medium). No security defect found. All findings are reproducible with the scripts under `evidence/quality-code/`.

Reviewer: independent Fable quality reviewer, after the coordinator spec PASS. Read-only review of `index.html`, `styles.css`, `app.js`, `model.js`, `package.json`, `tests/*.cjs`. No application, test, fixture or prior report was edited; nothing was committed, installed, fetched or deployed. Only this file and `evidence/quality-code/*` were written.

Source hashes at review time (`evidence/quality-code/source-hashes-at-review.txt`) match `evidence/coordinator-rereview-manifest.json` exactly (app.js `4d46b95f…`, model.js `3a5f31d6…`, index.html `af878d78…`, styles.css `f08be10e…`, all five test files).

## 1. Method

1. Full-source read; manual trace of every person-authored input (companion text, board step, parent observation, extracted deadline, decline note, proposal task/date/note, explorer selectors) through `ui`/`state` into the four `innerHTML` sinks flagged by the manifest (`app.js` L665 boundary, L669 explorer, L677 footer, L679 `#main`).
2. Static scan (search_files) of `app.js`, `model.js`, `styles.css`, `index.html` for `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `navigator.*`, `localStorage`, `sessionStorage`, `indexedDB`, `cookie`, `eval`, `new Function`, `import(`, inline `style=`, `url(`, `@import`, `@font-face`, `srcdoc`, `javascript:` → **0 hits**.
3. Pure-model probe `model-probe.cjs` (9 probes, `model-probe.json` / `.log`).
4. Two isolated actual-control browser probes, `browser-probe.cjs` (11 scenarios) and `browser-probe-2.cjs` (6 scenarios): own headless Chrome for Testing 153 from `~/.agent-browser/browsers`, `--remote-debugging-port=0`, own `TMPDIR` profile (removed at exit; verified 0 leftovers), real `Input.dispatchMouseEvent` clicks on real controls, `Runtime.exceptionThrown`/`Network.requestWillBeSent` captured. Port 9333 was idle and never used; the desktop preview was not driven. Results: `browser-probe.json`/`.log`, `browser-probe-2.json`/`.log`, screenshots `s1-*.png`, `s3-*.png`, `s4-*.png`, `p2-*.png`, `p3-*.png`.

Line numbers below refer to the hashed `app.js` / `model.js`.

## 2. Blocking findings (logic / state consistency)

### QC-01 · High · "Replay from the start" + "Play next turn" duplicates board steps and fabricates hint evidence shown to the parent
- **Where:** `app.js` L1192 (`replay` resets only `ses.turn`/`ses.turns`), L1185–1186 (`play` calls `giveHint()` and `pushStep` again on every pass), `model.js` L222–225 (`requestHint` appends assistance unconditionally).
- **Repro (any band; shown for 3–5 and K–2):** Student → Play next turn ×5 → Replay from the start → Play next turn ×5. Switch role to Parent.
- **Expected:** replaying a scripted demo is presentation; the board and the recorded assistance are unchanged (or are reset together with the turns).
- **Actual:** after the second pass the task holds **2 hints** (`tasks[0].assistance`), the board shows **4 steps** (hint, `7 + 5 = 12`, second hint, `7 + 5 = 12` again), the pill says "2 hints used", the real **"Ask for a hint" button is disabled** (both hints consumed by replays), and the parent's Help-needed flags panel reads **"2 hints asked for in Math"**. A third pass adds a fifth duplicate step via the no-more-hints path. The scripted companion turn still says "Fill 7 first…" as if a hint were given, but no hint is added (text/evidence diverge).
- **Evidence:** `browser-probe.json` S3 (4/4 reproduced), `s3-student-after-three-replays.png`, `s3-parent-flags-after-replays.png`; K–2: `browser-probe-2.json` P2, `p2-k2-parent-after-replay.png`.
- **Why it breaks this demo:** the parent-facing hint flag and ledger hint count — the prototype's only "assistance evidence" — can be inflated to the maximum by two clicks on demo controls, and the student's genuine hint path is then blocked. Evidence attribution is a stated invariant.

### QC-02 · High · An approved student proposal moves the shared date but leaves provenance, the confirmed extract and the accepted plan contradicting it (both roles)
- **Where:** `model.js` L140–149 (`decideProposal` updates `task.due` only; never `dueSource`, `extracted.due`, `currentPlan`), `app.js` L840 (renders stale `dueSource` label), L844–845 / L1056 (render `currentPlan` items from frozen `due`/`date`), L1034 (extract shows `ex.due`).
- **Repro (band 6–8, concept A):** Parent → Load sample teacher note → Confirm as shown → Ask for a draft plan → Accept plan. Student → Propose a change → task "Essay claim", new date 2026-10-09, why "Need more time" → Send to parent. Parent → Approve.
- **Expected:** the shared task, its provenance label, the teacher-feedback deadline and the accepted plan agree (or the plan is flagged stale / a re-draft is offered); provenance says the date came from an approved student proposal.
- **Actual:** task row shows **"Fri, Oct 9 … deadline confirmed by parent"** (`dueSource` still `parent_confirmed` — the parent confirmed Oct 2, not Oct 9); the Teacher feedback panel still shows **"Deadline: Fri, Oct 2"** as the confirmed deadline; the accepted shared plan still reads **"Fri, Oct 2: turn in the claim draft (confirmed deadline)"** with no "Ask for another draft" control; the student's "This week" panel shows the same Oct 9 vs Oct 2 contradiction under "Shared plan — you and your parent see the same thing".
- **Evidence:** `browser-probe.json` S4 (4/4 reproduced), `s4-parent-stale-plan-and-extract.png`; `model-probe.json` M2.
- **Why it breaks this demo:** "Parent corrections/accepted changes must reach shared task/plan consistently and retain provenance" is a product invariant; `spec.e2e` only asserts `task.due` after approval, so this passed the spec gate.

### QC-03 · High · "Confirm as shown" after an approved proposal silently reverts the shared deadline, with no correction record and the proposal still marked Approved
- **Where:** `model.js` L159–176 (`correctExtractedTask` overwrites `task.due` with `extracted.due` regardless of later approvals; `corrections` is computed against `extracted`, not the task), `app.js` L1037 (form pre-fills `ex.due`, not the current shared task date), L1197.
- **Repro (band 6–8):** Student → Propose a change (Essay claim → 2026-10-09) → Send. Parent → Approve (task is now Oct 9). Parent → Load sample teacher note → Confirm as shown.
- **Expected:** the form shows the current shared deadline (Oct 9) or warns that it differs; confirming cannot silently undo an approval; any change is recorded with provenance.
- **Actual:** form pre-filled **2026-10-02**; after confirming, `task.due` = **2026-10-02**, `dueSource` = `parent_confirmed`, `extracted.corrections` = `[]`, and the proposal still reads **"Approved by parent"** while its effect is gone. The student's date jumps back without any trace.
- **Evidence:** `browser-probe.json` S5 (reproduced), `model-probe.json` M3.
- **Why it breaks this demo:** silent, unrecorded change of the shared deadline directly contradicts the explicit-approval/provenance invariant.

### QC-04 · Medium · Uncaught `RangeError` from the proposal form when every task is complete; no user feedback
- **Where:** `app.js` L1263 (`String(data.get('propTask'))` → `"null"` when the `<select>` has no options; no guard, no try/catch), L866–869 (`propose-open` offered even when `movable` is empty), `model.js` L134–135.
- **Repro (band 6–8):** Student → Start → Mark done → Next: essay claim → Start → Mark done → Next: timeline → Start → Mark done → Propose a change → Send to parent.
- **Expected:** the control is hidden/disabled, or a message says there is nothing to move.
- **Actual:** `Uncaught RangeError: Unknown task: null` (`model.js` L135), live region not updated, no inline message, form stays open, no proposal created. State is not corrupted (throw precedes assignment).
- **Evidence:** `browser-probe.json` S6, `browser-probe-2.json` P3 (sentinel on the live region unchanged), `p3-propose-all-complete.png`. This is the only exception captured in either probe run.

### QC-05 · Medium · Any sentence containing "help"/"hint"/"ayuda"/"pista" is scored as an AI hint and flagged to the parent
- **Where:** `app.js` L1225 (`/\b(hint|pista|help|ayuda)\b/i` on the whole message).
- **Repro (band 3–5):** Student → Start "Chapter 4 summary" → type to the companion "Rosa found the map, which would help her brother" → Send. Switch to Parent.
- **Expected:** prose is kept as the student's turn and answered as prose (default/literacy reply); a hint is only recorded when one was asked for.
- **Actual:** companion answers "Here's a hint, not the answer: Start with who and what changed.", one hint is attributed to the student (`assistance` length 1), one of the two available hints is consumed, and the parent flags panel shows **"1 hint asked for in Reading & writing"**.
- **Evidence:** `browser-probe.json` S8 (reproduced).
- **Why it matters:** parent-visible assistance evidence is mis-attributed by an incidental word; cheap fix (match only short/leading keyword messages, or label the reply as an interpretation).

## 3. Security / privacy review — no blocking findings

Verified (not just read):
- **Escaping / XSS:** payloads `<img onerror>`, `"><script>…`, `<svg onload>`, `</p><iframe>`, `<a href="javascript:…">` submitted through all five person-authored inputs; rendered verbatim as inert text in student view, after a locale switch (`es`), and in the parent replay/observation/draft/proposal panels. `document.body.dataset.pwned` never set; 0 injected `img/svg/iframe/script/b/a` elements in `#main`. (`browser-probe.json` S1–S2, `s1-student-payloads-es.png`.) `e()` escapes `& < > " '` and is applied in both text and quoted-attribute contexts; the three non-`#main` sinks (L665/L669/L677) receive only constant `STR` copy; `announce` and `document.title` use text APIs.
- **Dynamic execution / inline handlers / styles:** none in source; rendered DOM has 0 `on*` attributes and 0 `style` attributes (P6).
- **Network / storage:** CSP meta present (`default-src 'none'; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'`); 0 HTTP(S) requests across 17 scenarios; `localStorage`/`sessionStorage` length 0, empty cookie; only `model.js`/`app.js` loaded. The "nothing you type is stored" promise holds for this session model (P6; both probes' `externalRequests` empty).
- **Unescaped internal values (reviewed, not user-controlled):** `seg()` `data-arg` (constant option ids), `focusKey.arg` in the L684 selector (dataset of the focused internal control), `lang="${locale}"` (validated by `createSettings`).
- **Note (non-blocking):** `window.__companionDebug` exposes `act` and `submit` (mutators) although its comment says "no setters" (L1289–1296). Harmless in a `file://` prototype but the comment is inaccurate.

## 4. Non-blocking logic / UX issues and suggestions

- **QC-06 (Low, latent):** completing an organized-only task writes `ledger.science = { evidence: 'assisted_work', plannedChecks: [48–72h, day7] }` while the UI row says "Organized only — no instruction or assessment" (`model.js` L229–249; `app.js` L910). Not rendered today, but the model state contradicts the "other subjects organized only" invariant for any consumer of `state.ledger`. Typing any text to the companion on an organized-only task also flips it to `in_progress` (`app.js` L1223). (`browser-probe-2.json` P1, `browser-probe.json` S9, `model-probe.json` M4.)
- **QC-07 (Low):** Concept C student drawer `<details … open>` is hard-coded (`app.js` L964); closing it is undone by the next action's re-render (S10).
- **QC-08 (Low):** after "Keep typing", `ui.mic = 'typing'` renders the status "Microphone: not requested." and removes the try button for the rest of the session (`app.js` L708–711; S10). The typed alternative still works, so the voice-simulation invariant holds.
- **QC-09 (Low, model-level only):** `proposePlanChange` accepts any string as `due` (no `validateIsoDate`), and `fmtDate` would throw on it (`model-probe.json` M1). Not reachable through the real control: the `type="date" required` input coerces invalid values to `""` and blocks submission (S7 guard holds). Reachable only via `__companionDebug.submit`/direct model calls. Also model-only: `decideProposal` treats any non-`approved` decision as declined and permits re-deciding (M7; UI hides the buttons), and a proposal can be approved after its task is complete (M9; UI-unverified).
- **QC-10 (Low):** `checkFinalAnswer` whitespace stripping makes `"1 2"` match 12 and `"0225"` match 225 (M6). Commutative forms (`5+7=12`) are intentionally unparsed per the comment.
- **Suggestions:** make `replay` either restore board/assistance to the pre-script snapshot or stop re-recording hints on scripted passes (mark scripted hints `provenance:'scripted_demo'` and exclude them from flags/ledger); have `decideProposal` set `dueSource:'student_proposal_approved'`, update `extracted.due` (or mark it superseded) and mark `currentPlan`/`draftPlan` stale with a re-draft control; pre-fill the extract form from the shared task date and record a correction when it differs; hide "Propose a change" when `movable` is empty and wrap `submit` cases that call throwing model functions; tighten the hint-keyword heuristic.

## 5. Guards that held (independently verified)

Task isolation across select/play/replay (math session, board and assistance untouched by literacy play+replay; parent replay shows both boards — P4; see note below), locale switch keeps observation/decline note/proposal note verbatim and re-renders generated draft items from the corrected date in Spanish with provenance text (P5), post-completion hint is recorded and the parent ledger shows the live count (S11), K–2 ten-frame and arithmetic suffix rejections (spot-checked via M6), real date control blocks non-ISO proposals (S7).

Probe self-correction: P4's first guard printed BROKEN only because my expected turn count was wrong (I expected 2; the correct value is 3: typed "hint" → student turn + companion reply, then the board step → one more companion reply). Every isolation sub-condition in its recorded detail held (2 math steps incl. `MATH_STEP`, 1 math hint, 0 literacy hints, hint button enabled). Not re-run within budget; raw data in `browser-probe-2.json`.

## 6. Limitations / not verified

- Reviewed and probed the hashed sources only; no git history exists, so there is no diff.
- Rendering/layout, mobile, and accessibility were not re-audited (coordinator's 36/6 configurations); only desktop 1440×1000 was used.
- Reset/replay state clearing was exercised implicitly (each scenario starts from Reset and produced independent results) rather than asserted field-by-field; existing repair tests cover it.
- Spanish-locale behaviour of QC-01…QC-05 was not separately reproduced (the code paths are locale-independent).
- Existing test suites were not re-run (coordinator already did; rerunning would not add evidence).
- No production/efficacy/compliance verification is possible or claimed for this prototype.

## 7. Evidence index (`evidence/quality-code/`)

`source-hashes-at-review.txt`, `model-probe.cjs`, `model-probe.json`, `model-probe.log`, `browser-probe.cjs`, `browser-probe.json`, `browser-probe.log`, `browser-probe-2.cjs`, `browser-probe-2.json`, `browser-probe-2.log`, `s1-student-payloads-es.png`, `s3-student-after-three-replays.png`, `s3-parent-flags-after-replays.png`, `s4-parent-stale-plan-and-extract.png`, `p2-k2-parent-after-replay.png`, `p3-propose-all-complete.png`.

Rerun: `node evidence/quality-code/model-probe.cjs && node evidence/quality-code/browser-probe.cjs && node evidence/quality-code/browser-probe-2.cjs` (each browser probe starts and removes its own Chrome profile; no shared port).
