# Academic Companion — K–8 concept explorer (design prototype)

A local, synthetic-data prototype of a parent/student academic companion for US families, English and Spanish, kindergarten through grade 8. It is a **design prototype**: not connected to any AI service, school account, microphone, or real student; nothing is stored. It is not a product, not production-ready, and makes no curriculum-coverage or learning-gain claim.

## Current review status

**Available for design feedback, not fully approved.** The final independent Fable review approves the cross-task deadline/stale-plan fix (QC-11/QC-02). A long keyboard sequence in a headless Chrome phone-emulation probe still has an unexplained renderer timeout (`PHONE-STALL`). Ordinary phone parent flows pass separately; they do not certify that failing sequence. Both bounded quality repair cycles are complete. Another investigation requires an owner decision.

Current acceptance evidence: `COORDINATOR_QUALITY_CYCLE2.md` (coordinator reruns, unchanged tests/evidence, explicit limits) and `QUALITY_FINAL_REVIEW.md` (fresh reviewer: 50 model and 117 real-input browser checks). These supersede the historical initial-build verification notes below. All examples remain synthetic and all progress/independent checks are demonstrations or plans, not measured learning outcomes.

## Open it

```
open index.html            # macOS; or double-click. No server needed.
```

Everything is three local files (`index.html`, `styles.css`, `app.js`) plus `model.js`. No dependencies, no remote fonts, no network; a `<meta>` Content-Security-Policy blocks network connections, form submission, and frames.

## Test it

The legacy browser commands below write fixed evidence paths. Run them only from a fresh isolated copy, not over this directory's preserved evidence. The coordinator used the isolation runner at `evidence/coordinator-quality-cycle2/run_checks.py`; its completed runtime and results are retained and it refuses to overwrite an existing run. The full current model suite (40 tests) is `node --test tests/model.test.cjs tests/model.repair.test.cjs tests/quality.model.test.cjs tests/quality-cycle2.model.test.cjs`.

```
npm test        # node --test tests/model.test.cjs   (12 tests; built-in runner, zero deps)
npm run test:quality   # model + spec-repair + quality-repair model regressions (29 tests)
npm run e2e:quality    # tests/quality.e2e.cjs: real-control browser regressions for the quality findings (own headless Chrome, port 0); evidence/quality-fix/
npm run check   # node --check on model.js, app.js, tests/ui.e2e.cjs
npm run e2e     # node tests/ui.e2e.cjs  (headless local Chrome for Testing over loopback DevTools; writes evidence/ui-e2e.json + evidence/screenshots/*.png)
```

`tests/ui.e2e.cjs` needs the locally installed Chrome for Testing at `~/.agent-browser/browsers/chrome-153.0.8010.52/…` (override with `CHROME=/path`). It binds DevTools to 127.0.0.1 only and kills the browser when done.

## What the explorer contains

Top controls (all localized): **Concept** A/B/C · **Viewing as** Student/Parent · **Grade band** K–2 / 3–5 / 6–8 · **Language** English/Español · **Reset example**. Switching concept, role, or language keeps the scenario state; switching band loads that band's synthetic example.

Three genuinely different compositions of the same workflow (layout/interaction variants, not recolors):

| Concept | Student surface | Parent surface |
|---|---|---|
| **A · Today-first** (proposed default — a design suggestion, not an owner decision) | One focus task + board, companion pinned beside it, week plan as a rail | Progress/flags/ledger on top, observation + teacher-feedback side by side, draft plan below |
| **B · Workspace-first** | Companion tile · dominant shared board · plan strip (session-call layout) | Workspace replay (board + turns + ledger) with the forms in a right column |
| **C · Shared plan-first** | The week plan is primary; today's task and the companion are secondary/drawer | Same shared plan + draft plan primary; feedback, observation, ledger beside |

Surface archetypes: student plan = Operate, lesson/board = Learn, parent review = Operate/Monitor. No marketing hero, no equal-weight feature grid.

### Flows that work (all exercised by `tests/ui.e2e.cjs`)
- Student: Start → Ask for a hint (hint appears highlighted on the shared board and is recorded as `ai_hint` assistance) → write a step/answer on the board (companion checks it; never writes the answer) → Mark done → next-step button. Completion is a **self-report inside an assisted session**: the ledger moves to `needs_independent_check`, evidence `assisted_work`, with checks *planned* at 48–72 h and around day 7. Nothing is ever marked mastered.
- Voice: a **scripted, deterministic** 5-turn demonstration per band/language ("Play next turn"), labelled as such. No microphone, STT, TTS, or LLM. A simulated microphone-denied state with "Keep typing" / "Allow (simulated)" recovery. The typed path is complete on its own.
- Parent: save an observation (stored as `source: parent`, `verification: observation_unverified`) → load the sample teacher note (labelled parent-entered sample; nothing fetched) → review the extracted task, correct the deadline (correction recorded with `by: parent`, from → to) or confirm as shown → ask for a draft plan → accept (becomes the current shared plan) or decline with a note (current plan unchanged) → ask again.
- Grade 6–8: the student proposes a date change with a reason; the parent sees it word for word and approves/declines; nothing changes until approved. The student view states exactly what the parent can see.
- K–2: one short task at a time, larger text/targets, glyph cues (▶ ✎ ✓), adult scaffolding line, "Ask a grown-up" flag that the parent sees. Grades 3–5: short plan + explanations. Grades 6–8: planning/negotiation with disclosed parent visibility.
- Reset restores the synthetic example for the current settings.

### Examples
Math: K–2 `7 + 5` (ten frame), 3–5 `403 − 178` (regrouping), 6–8 `3x + 7 = 25`. Literacy: K–2 sounds in a word (ship / sol), 3–5 three-sentence summary with who/what-changed/why scaffold and a synthetic passage, 6–8 essay claim scaffold. Science/history tasks are **organized only**, and the ledger says so — no instructional or assessment coverage is implied. Arithmetic was checked by calculation (`evidence/math-check.log`).

## Model (`model.js`, UMD; browser global `AcademicCompanionModel` and `require` in tests)
`validateLocale`, `validateBand`, `createSettings`, `createInitialState`, `loadExample`, `resetExample`, `selectTask`, `nextTask`, `startWork`, `requestHint`, `completeWork`, `addParentObservation`, `correctExtractedTask`, `createDraftPlan`, `acceptDraftPlan`, `declineDraftPlan`, `proposePlanChange`, `decideProposal`. Pure functions returning new state. Each behavior was added by vertical TDD: a failing test (`evidence/NN-*-red.log`) then a passing run (`evidence/NN-*-green.log`); logs 01–11 are from the previous worker and were preserved untouched, 12–31 are from this pass.

## Design source reuse vs. new
Reused from the local product source (`snapshots/KaizenEdu/components/tutor/brand/tokens.css`, `session/session.css`), as principles and values, not copied files: one teal hue (oklch hue 195) with warm-tinted neutrals; semantic success/warning tokens; audience sizing via variables (`--text-body`, `--target`, `--gap`, `--radius`) scaled for kids vs. parent; a single outside-drawn `:focus-visible` ring; `prefers-reduced-motion` collapsing all motion; the persistent "AI" label; the three-pane call-style session layout idea (Concept B) and the phone rule that the companion caption stays pinned. Upstream purple is not inherited.

New in this prototype: the three compositions, the provenance ledger table, the draft-plan accept/decline flow, the extracted-task correction flow, the proposal/negotiation flow, the K–2 cue strip and ten-frame/sound-box boards, the scripted voice demo and simulated mic states, and all copy.

## Honest boundaries
- Spanish is **draft product copy** for native-speaker review, not certified educational localization.
- The role switch is a demo control, not access control. Nothing persists (no localStorage).
- "Planned" independent checks are a design proposal; no validated mastery or curriculum claim exists anywhere in the prototype.
- Human tutors are intentionally absent (later add-on). No submissions, teacher messages, uploads, or account changes.
- Local font stack (Avenir Next → system sans). No web fonts.

## Historical initial-build verification (superseded by current review above)
- `node --test tests/model.test.cjs`: 12 tests, 12 pass, 0 fail (`evidence/30-model-final.log`).
- `node tests/ui.e2e.cjs`: 36 desktop configurations (3 concepts × 2 roles × 3 bands × 2 languages) rendered and audited for named buttons, labelled inputs, ≥2 panels, no horizontal overflow, no unsupported-grade copy, no button under 40 px; 6 mobile (390 px) configurations with no overflow; 24/24 flow checks; 0 console errors/exceptions/CSP violations; 8 screenshots (`evidence/screenshots/`, `evidence/ui-e2e.json`, `evidence/31-ui-e2e-final.log`).
- Screenshots were inspected visually at 1440 px and 390 px.

## Not verified / remaining real-system work
- Not tested in Safari/Firefox or with a real screen reader (ARIA names and a polite live region are present; announcements were verified by DOM only).
- Later coordinator/browser review measured essential input/counting-cell boundaries above 3:1, including sound boxes at 4.2:1. This is not complete accessibility or real-device certification; see `COORDINATOR_QUALITY_CYCLE1.md` and `QUALITY_UX_REREVIEW_CYCLE1.md`.
- No real AI, speech, OCR/extraction, school-account, or storage integration exists; all are explicit next-step systems.
- Concept B/C mobile layouts stack vertically; a dedicated phone composition per concept is a follow-up.
