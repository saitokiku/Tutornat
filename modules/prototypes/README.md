# prototypes (parked source)

Four zero-build browser prototypes from the Hermes discovery/design work. All data is synthetic
and nothing calls a real AI service. They are design references, not product code. Copied on
2026-10-07. Not imported or built by `apps/web`.

| Folder | Source | Dated | What it is |
|---|---|---|---|
| `homework-companion/` | Hermes export `frontend/` | 2026-10-01 | Parent/student homework demo with an in-memory fake service: Today, Schoolwork, Workspace, Plan, Record. Acceptance status was **CHANGES_REQUIRED** (rapid Student→Parent switch on phone) |
| `concept-explorer/` | Hermes export `design/` | 2026-09-30 – 10-01 | K–8 EN/ES "Academic Companion" design prototype (examples, hints, final-answer check, parent observations, draft plans with stale-plan detection). Status: "available for design feedback, not fully approved" |
| `kaizen-redesign-candidate/` | `/Users/man/education-product-discovery/redesign/candidate/` + `redesign/handoffs/*.md` → `handoffs/` | 2026-10-01 | Homework-companion pages restyled into the Kaizen-AI dashboard interior: rail, mobile tab bar, five routes, new Learn/Activity and Plan views |
| `kaizen-ai-reference/` | `/Users/man/education-product-discovery/redesign/reference/` (minus `devtools/node_modules`) | 2026-10-01 | Static rebuild of the Kaizen-AI dashboard shell (`app/dashboard/page.js` lines 600–712) with the real `TodayView` on fixture data, bundled to `dist/` |

## What is inside

| Path | Purpose |
|---|---|
| `homework-companion/domain.js` | Pure immutable store (CommonJS + `window.Domain`): tasks, per-task sessions with steps/help/scripted replay and a whole-number check, observations, schedule, draft/accepted plans, date proposals and parent decisions, Today views |
| `homework-companion/{app,copy,demo-service}.js` | DOM app, EN/ES copy, replaceable in-memory service |
| `homework-companion/*.md` | Build contract, design note, frontend–backend contract, repair reports |
| `concept-explorer/model.js` | UMD model (`window.AcademicCompanionModel`): locale `en`/`es`, bands `K2`/`35`/`68`, `checkFinalAnswer`, work/hint flow, observations, plan-change proposals, `applyDueChange` |
| `concept-explorer/*.md` | Plans, quality reviews and fix reports from two repair cycles |
| `kaizen-redesign-candidate/app.js`, `shell-copy.js` | Redesigned shell and EN/ES nav strings. Delegates to `window.KaizenLearning` / `window.KaizenPlan` and falls back to the old views |
| `kaizen-redesign-candidate/learning-views.js`, `plan-view.js`, `*.css` | Learn (workspace) and Activity (record) pages; week grid of DUE/WORK/SUGGESTED chips with decisions |
| `kaizen-redesign-candidate/{domain,copy,demo-service}.js` | Byte-identical to `homework-companion` |
| `kaizen-redesign-candidate/handoffs/` | `REFERENCE.md` (reference build and owner questions), `LEARNING.md` (Learn/Activity, 73/73 harness checks), `PLAN.md` (Plan module; says "not integrated", but the later `app.js` does delegate to it) |
| `kaizen-ai-reference/src/entry.jsx`, `fixtures.js`, `stubs/next-link.jsx` | React `Shell` (brand rail, Today/Plan/Learn/Grades/Growth tabs, mobile bar, `TodayView`, `AppFooter`; other tabs are placeholders), fictional data, Next link stub |
| `kaizen-ai-reference/dist/` | Prebuilt `reference.js` (629 KB) + `reference.css`. `bundled-sources.txt` lists the 12 Kaizen-AI snapshot files that were bundled. The folder's own `.gitignore` re-includes `dist/` against the root `dist/` rule |
| `kaizen-ai-reference/devtools/` | `build.cjs` (esbuild), `tailwind.reference.config.cjs`, `shoot.cjs` (Playwright screenshots), `package.json` (esbuild, react, react-dom, tailwindcss) |

## Opening and tests

Every prototype opens straight from disk: `open <folder>/index.html` (`file://`, no server, CSP
blocks network). The reference loads `dist/reference.{js,css}`.

Unit tests are plain `node:test` with no installs. These were run on 2026-10-07 (Node 26.9,
scratch copies) and all passed:

```sh
cd modules/prototypes/homework-companion && node --test tests/*.test.cjs   # 72 pass
cd modules/prototypes/concept-explorer && node --test tests/*.test.cjs     # 40 pass (npm test = model.test.cjs only)
```

The `*.e2e.cjs` and `quality-cycle2.phone-probe.cjs` browser tests drive Chrome for Testing over
CDP. Set `CHROME=/path/to/chrome`; the defaults are absolute paths on the original machine. They
write `evidence/` folders, which were not copied. `kaizen-redesign-candidate` has no tests
here. Its harnesses (`redesign/tests/` in the discovery workspace) depend on that workspace's
layout and were not copied.

## Known issues

- `kaizen-ai-reference/devtools/build.cjs` and `tailwind.reference.config.cjs` hardcode
  `/Users/man/education-product-discovery/snapshots/Kaizen-AI/web`. `shoot.cjs` hardcodes
  Playwright, Chrome and output paths. To rebuild `dist/`, point them at
  `modules/kaizen-ai/web` and run `npm install` in `devtools/`. `index.html` mentions a
  `devtools/tailwind.cjs` that does not exist.
- `homework-companion/README.md` links `../FRONTEND_REPAIR2_*.md`. Those files are now in
  `docs/history/discovery/`. Its "open it" paths point at the original workspace.
- Review docs and `handoffs/LEARNING.md` contain absolute paths to the original workspace.
- None of these prototypes has accounts, persistence or real AI. Their "AI" responses are
  scripted.

## Reuse plan

- Design: `kaizen-redesign-candidate` is the closest prior attempt at "Kaizen-AI look +
  homework companion flows". Use its Plan week grid and Learn/Activity views as UX references
  for `apps/web`.
- Design: `kaizen-ai-reference` renders the owner's preferred dashboard shell without Supabase.
  It is useful for visual comparison while rebuilding the shell in `apps/web`.
- Backend reference: `homework-companion/domain.js` and `FRONTEND_BACKEND_CONTRACT.md` describe
  the task/session/plan/proposal state model the frontend expected from a backend.
- Reference: the `concept-explorer` model (`checkFinalAnswer`, stale-plan detection) and its
  review docs record the UX defects already found and fixed.
