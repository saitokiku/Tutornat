# QUALITY_UX_REVIEW.md — independent accessibility / child–parent UX / truthful-copy review

Reviewer: fresh Fable context (Role 2), independent of implementation, repair and the parallel code review.
Scope: `/Users/man/education-product-discovery/design` (`index.html`, `styles.css`, `app.js`, `model.js`). Read-only against the
application; everything written by this review lives in `evidence/quality-ux/` plus this file.

**Verdict: REQUEST_CHANGES** — four reproducible, small-fix defects (two keyboard/AT, one disclosure-copy, one non-text contrast).
None re-opens product discovery or asks for a redesign; none of the coordinator's green suites covered them.

## 1. Source under review (hashes re-checked at review time, unchanged)

| file | sha256 (prefix) | matches `evidence/coordinator-rereview-manifest.json` |
|---|---|---|
| index.html | af878d788fe52c5d | yes |
| styles.css | f08be10eca7ca65a | yes |
| app.js | 4d46b95f6dac29d3 | yes |
| model.js | 3a5f31d6e4219b14 | yes |

## 2. Method (what was actually exercised)

- Full read of the four source files, all EN/ES copy tables (`STR`, `TASKS`, `NOTES`, `PLAN_COPY`, `VOICE`), CSS tokens and layouts.
- Own probe `evidence/quality-ux/probe.cjs` (zero dependencies, same CDP pattern as `tests/repair.e2e.cjs`): owned headless
  local Chrome 153.0.8010.52, `--remote-debugging-port=0`, throwaway `TMPDIR` profile (removed on exit), `file://` load,
  `connect-src 'none'` CSP intact, Network/Runtime/Log monitors on. Real input only: `Input.dispatchKeyEvent` (Tab / Shift+Tab /
  Enter / Space), `Input.insertText`, `Input.dispatchMouseEvent`; `Emulation.setFocusEmulationEnabled` so `document.activeElement`
  reflects real focus; `prefers-reduced-motion` via `Emulation.setEmulatedMedia`. Viewports 1440×1000 (desktop) and 390×844 (mobile).
- Two runs (`probe-run1.log` was a scaffold run with two harness bugs — skip-link test started mid-page, and a K–2 selector that is only
  rendered after completion; both fixed in `probe.cjs`; `probe-run2.log` + `probe-report.json` are the evidence of record: 67 checks,
  0 harness errors, 0 runtime/CSP exceptions, 0 HTTP(S) requests).
- Contrast computed by calculation from real computed colours (canvas-resolved sRGB of the oklch tokens, WCAG relative luminance),
  enabled controls only; disabled controls excluded.
- 13 settled screenshots (list in §7). Vision inspection of K–2 desktop/phone, concept B student, and the phone focus-obscured state.

## 3. Blocking findings

### QUX-1 · Major · Keyboard focus is dropped to `<body>` after almost every state-changing control (both roles)
- **Source:** `app.js` `render()` lines 647–687 — `main.innerHTML = …` (line 679) replaces the whole stage; focus is restored only when
  the previously focused element still exists with the same `data-act`/`data-arg` or `id` (lines 649–655, 681–686). Controls that disappear
  (Start → In progress), become disabled (last hint), or have no `data-act`/`id` (every `<button type="submit">`) lose focus to `body`.
  `propose-open`/`propose-close` (lines 1204–1205) also make no live announcement.
- **Repro (real keys, 1440px, 3–5 / A / EN, student):** Tab to **Start**, press Enter → `document.activeElement === body`. Same for
  **Mark done**, **Next: …** (select), the board **Add** button (Space), **Try the microphone (simulated)**, the 2nd (last) **Ask for a hint**
  (Space). Parent (A/EN→ES): **Load sample teacher note**, **Save observation**, **Save correction**, **Ask for a draft plan**, **Decline**
  (Enter in the note), **Accept plan**, **Approve** (proposal). Student 6–8/C: **Propose a change** (no announcement either), **Send to parent**.
  16 of 22 keyboard activations lost focus; the 6 that kept it were: first hint, Enter inside `#board-input`/`#typed-input`,
  Language/Role segment buttons, and Tab out of the observation textarea (see `probe-report.json → keyboard[]`).
- **Expected:** after activation, focus lands on a meaningful successor (the new primary action, the new notice/form, or at minimum the
  containing panel heading), and the change is announced.
- **Actual:** focus on `body`. In Chrome the next Tab restarts from the beginning of `#main` (parent A: lands on the replay turn list
  `ol.turns`, i.e. a different panel than the form just submitted; after Approve it lands on *Load sample teacher note*). Screen-reader
  users are returned to the top of the document after each action; `propose-open` gives no feedback at all.
- **Evidence:** `evidence/quality-ux/probe-run2.log` (lines `KBD …-> focus LOST (body); next Tab -> …`), `probe-report.json → keyboard[]`.
- **Dimensions:** WCAG 2.4.3 Focus Order / 3.2.2 On Input (keyboard + screen-reader operability), parent forms and child task flow in all
  three concepts (shared `render()` path).
- **Minimal fix idea (not a redesign):** in `render()`, when the focused control cannot be restored, focus a sensible successor
  (e.g. the first enabled `.task-actions .btn` / the first control of the block that replaced the activated one, else the block's `h2` with
  `tabindex="-1"`), keep `preventScroll`, and announce `propose-open`/`close`.

### QUX-2 · Major on phone, Minor on desktop · Sticky boundary banner hides the focused control / scroll target (no scroll padding)
- **Source:** `styles.css` lines 100–108 (`.boundary { position: sticky; top: 0; z-index: 30 }`); no `scroll-padding-top` on `html`
  and no `scroll-margin-top` on focusable elements anywhere in the stylesheet.
- **Repro (390×844, 3–5 / A / EN, student):** focus **Send** in the companion, press Shift+Tab repeatedly. When focus reaches
  **Play next turn** (y=22, h=44) and later **Start** (y=0, h=53) the browser scrolls them to the top edge, fully under the 76 px banner
  (`hiddenFraction = 1.0`, `elementFromPoint` at their centre returns the banner). Desktop 1440: the same sweep leaves **Start** 69 %
  covered by the 37 px banner. Also on phone: after the skip link, `#main`'s first panel header sits under the banner (y=17 < 76); any
  `scrollIntoView({block:'start'})`/anchor-style scroll to **Start** puts it under the banner (B student, `hitBanner: true`).
  K–2 raises `--text-small` to 1rem, so the K–2 phone banner is ~100 px (4 lines) and hides even more (`phone-K2-A-student-en-board.png`).
- **Expected:** a focused control is never entirely hidden by author content (WCAG 2.2 2.4.11 Focus Not Obscured (Minimum), AA);
  skip-link / scroll targets land below the banner.
- **Actual:** entirely hidden on phone; 69 % hidden on desktop. The coordinator's hit-tests used `scrollIntoView({block:'center'})`,
  which cannot observe this.
- **Evidence:** `evidence/quality-ux/phone-390-student-35-A-focus-under-banner.png` (banner at top, *Play next turn* not visible, only
  *Replay from the start* below it), `desktop-1440-student-35-A-focus-under-banner.png`, `probe-report.json → obscured[]`,
  `probe-run2.log` lines "Shift+Tab never leaves the focused control hidden …" and "INFO phone …".
- **Dimensions:** keyboard/switch users on phone and desktop, skip-link users, sighted keyboard users (focus ring invisible under banner).
- **Minimal fix idea:** `html { scroll-padding-top: <banner height> }` (or `:focus-visible { scroll-margin-top: … }`), sized for the
  taller K–2/phone banner — one or two CSS lines.

### QUX-3 · Major · Child-visibility disclosure does not match the parent view (concepts B and C; 3–5 copy in all concepts)
- **Source:** `app.js` `blockCompanion(compact)` line 723 (`${compact ? '' : turns}`), called with `compact=true` for the student in
  concept B (line 945) and concept C (line 967); disclosure copy `see35`/`see68` lines 130–131 (ES 299–300); parent replay
  `blockReplay()` lines 1074–1096 always renders the full `turnsList`.
- **Repro:** 3–5 / B / EN student: play 3 scripted turns, type `my private note` into *Type to the companion*, Enter. Student screen
  shows only the last caption; no turn list (`#main .turns` count = 0). Switch *Viewing as → Parent*: *Child's work and turns* lists all
  5 turns including `Student | my private note`. Same in C. In A the student does have the list (5 = 5).
- **Expected (product boundary: "Child visibility disclosure must match parent views"):** what the student is told the parent can see is
  what the parent sees, and the student can see it too.
- **Actual:** 3–5 copy (`see35`) says the parent sees "this board — including the sample turns" — it omits that the student's own typed
  messages to the companion are shown to the parent (true in every concept). 6–8 copy (`see68`) says "the board and these turns … You
  always see here exactly what they can see" while in B and C there are no turns on the student's screen at all. Screenshot
  `desktop-B-student-35-en-companion-compact.png` (single caption, disclosure text bottom-right) vs
  `desktop-B-parent-35-en-replay-turns.png` (full list with the typed note).
- **Evidence:** `probe-run2.log` lines "B/C: the student can review the same turn history…", "3–5 disclosure…", "6–8 disclosure…";
  `probe-report.json → parity`.
- **Dimensions:** truthful disclosure to the child (3–5 and 6–8), concept parity for the owner's A/B/C comparison.
- **Minimal fix idea:** render the turn list for the student in B/C as well (drop `compact` or add a collapsed "Turns" drawer), and state in
  `see35`/`see68` that typed messages to the companion are visible to the parent. Copy change + one flag; not a layout redesign.

### QUX-4 · Moderate · Non-text contrast of field boundaries and K–2 counting cells is ~2:1 (WCAG 1.4.11 needs 3:1)
- **Source:** `styles.css` line 24 `--line-strong: oklch(0.78 0.012 80)` → resolves to rgb(187,183,175); used for `input[type=text]`,
  `input[type=date]`, `textarea`, `select` (305–309, 295), `.btn` (147), `.seg` (131), `.tenframe span` (239), `.soundboxes span` (297).
- **Measured (computed colours, enabled controls only):** text inputs / textarea / date / select border vs white card = **2.0:1**;
  secondary buttons (*Add*, *Send*, *Ask for a hint*) and the explorer segment border = 2.0:1 (these also have text, so lower priority);
  empty ten-frame cells and K–2 sound boxes vs board = **1.97:1**. Text contrast is fine everywhere sampled (lowest enabled text
  6.61:1); the focus ring is 5.0–5.2:1 against page/card.
- **Expected:** ≥ 3:1 for the visual boundary of inputs and for the empty cells the K–2 hint asks the child to count
  ("Count the extra boxes in the second frame").
- **Actual:** the parent's Observation/Deadline/Note fields and the child's board/typed inputs rely on a 2:1 border on a white card;
  K–2 empty cells are faint (visible in `desktop-K2-A-student-en-working.png`, `phone-K2-A-student-en-board.png`).
- **Evidence:** `probe-report.json → contrast.*.borders`, `probe-run2.log` line "non-text contrast ≥ 3:1 …".
- **Dimensions:** low-vision parents and children; K–2 counting scaffold legibility.
- **Minimal fix idea:** darken the single token (`--line-strong` ≈ oklch(0.60 0.012 80) gives ≈3.2:1) or give inputs/cells their own
  darker border token. No layout change.

## 4. Non-blocking suggestions (taste / polish — not required for PASS)
- S1 `app.js` 89, 107 (ES): "solo de organización (organized-only)" / "(organized only)" leaves English jargon in Spanish child-facing
  copy (3 occurrences in the ES organized-task screen). Drop the parenthetical or use a Spanish gloss. Footer already disclaims
  non-certified Spanish.
- S2 No `<h1>` in any layout (brand is a `span`, task title is `h2`); add a visually-quiet `h1` (brand or scenario) for AT page structure.
- S3 Skip link is 40 px tall (`.skip` padding 0.5rem) — below the project's own 44 px phone rule (buttons all pass; the `<a>` was never
  measured by the coordinator suite).
- S4 Concept C `<details class="drawer" open>` is re-rendered open after every state change, so a student who closed it sees it re-open
  on Start/hint/done (observed: closed by Enter → re-opened after Start).
- S5 Pressing Enter inside the optional *Note for the companion* field submits the **Decline** form (standard implicit submission, but
  the only Enter-reachable action in that form is the destructive one; *Accept* is a `type=button`). Consider `Accept` as the submit or an
  explicit confirm.
- S6 `<div class="board" aria-label="Shared board">` (concept A) — `aria-label` on a plain `div` is ignored by most AT; use
  `role="region"`/`<section aria-labelledby>`. B/C boards have no name at all.
- S7 ES role label "Madre/padre" vs "familia" elsewhere — consistent term choice for native review.
- S8 K–2 companion panel is dense for early readers (19 px caption, four 16 px lines of boundary/mic/typed copy below it, 201 words on
  the student stage). Scaffolding (grown-up scaffold, glyph buttons, Ready/Working/Done cues) is good; the companion column is the
  text-heavy part. Suggestion only — real non-reader usability needs children and audio.

## 5. Hypotheses (not verified in this review)
- H1 With NVDA/JAWS/VoiceOver, QUX-1 likely results in the virtual cursor returning to the document top after each action; only
  Chrome's sequential-focus-starting-point behaviour was observed (no AT available).
- H2 Chrome made the overflowing `.turns` list keyboard-focusable (no `tabindex`); Firefox/Safari may not, leaving long histories
  unreachable by keyboard at phone width (overflow observed: 519 px content in a 224 px box).
- H3 Ten-frame colours teal (a) vs warm brown (b) have 1.2:1 luminance contrast between them; distinguishable by hue for common
  colour-vision deficiencies but not verified with simulation. The `role="img"` label is accurate.

## 6. Verified OK (independent evidence, not inherited from FIX_REPORT)
- Reduced motion: `.fade` animation 0.22 s → 1e-06 s under `prefers-reduced-motion: reduce`.
- Skip link: first Tab reaches it, it becomes visible, Enter moves focus to `#main` (fresh document).
- Labels/roles: no duplicate ids, no dangling `aria-labelledby/describedby`, no unnamed buttons, no unlabelled fields in 10
  band/concept/role/locale layouts (incl. parent after sample load); `role="img"` ten-frame label present and accurate.
- Live region: every state change except `propose-open/close` produces a polite announcement (texts in `probe-report.json`).
- Text contrast: all sampled enabled text ≥ 4.5:1 (min 6.61:1); focus ring 5.0:1 / 5.2:1 vs page / card.
- Phone 390: every enabled `button/input/textarea/select/summary` ≥ 44 px in both dimensions across student K–2/A, 6–8/C-ES (with the
  proposal form open), 3–5/B, and the parent intake → correction → draft → accept → observation flow; all centre-scrolled hit-tests
  reach the control (only the skip link `<a>` is 40 px).
- Parent→student sequence with real controls (keyboard on desktop, pointer on phone): load sample → correct deadline to 2026-10-09 →
  draft → decline with note → draft again → accept; student then sees *Fri, Oct 9* and *Thu, Oct 8* in the same concept; observation
  listed verbatim with the "Parent-reported · not verified" pill; ES locale keeps the student's English note verbatim while generated turns
  re-render in Spanish.
- 6–8 negotiation: proposal (2026-10-12, note "Game on Thursday") recorded verbatim and pending; parent Approve moves the deadline;
  student sees "Approved by parent" and "Mon, Oct 12".
- Assisted-vs-independent copy: match reply, done note, ledger ("Self-report inside an assisted session", "Needs independent check",
  "Planned: 48–72 h, then around day 7"), observation pill and K–2 scaffold ("a way to count, not the answer") never claim mastery or
  correctness of self-reports; voice caption says no sound is played; mic flow is labelled simulated throughout.
- No runtime/CSP errors and no HTTP(S) requests across the whole probe.

## 7. Evidence paths (all under `evidence/quality-ux/`)
`probe.cjs`, `probe-run1.log` (scaffold run, superseded), `probe-run2.log`, `probe-report.json`,
`desktop-1440-student-35-A-focus-under-banner.png`, `phone-390-student-35-A-focus-under-banner.png`,
`desktop-A-student-35-es-after-keyboard-journey.png`, `desktop-A-parent-35-es-after-forms.png`,
`desktop-C-student-68-en-proposal-sent.png`, `desktop-B-parent-35-en-replay-turns.png`,
`desktop-B-student-35-en-companion-compact.png`, `desktop-K2-A-student-en-working.png`,
`phone-A-student-35-en-top.png`, `phone-A-parent-35-en-draft-pending.png`, `phone-K2-A-student-en-board.png`,
`phone-C-student-68-es-propose.png`, `phone-B-student-35-en-start-at-top-edge.png`.

## 8. Limitations / coverage gaps
- No screen reader (VoiceOver/NVDA/JAWS), no switch access, no real touch device; headless Chrome 153 only (no Firefox/Safari).
- No native Spanish-speaker certification and no child or parent user study; K–2 non-reader usability remains unestablished (needs
  children and live audio, which this prototype intentionally excludes).
- Contrast measured on sampled selectors per layout (five layouts), not every element; sizes 1440 and 390 only.
- Keyboard journey exercised one full student path (3–5/A), the parent forms (A), the 6–8 proposal (C) and the C drawer; B/C student
  keyboard paths share the same `render()` and were checked structurally and by pointer, not by a full key-by-key run.
- Phone forward-Tab sweep covered 40 stops from the top of 3–5/A; Shift+Tab sweeps covered the companion→focus-task region.
- Prior test logs/reports were not re-run or relied upon; this review did not inspect the parallel code-review directory.
