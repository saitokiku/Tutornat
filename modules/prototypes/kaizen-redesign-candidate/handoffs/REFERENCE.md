# Handoff — reference specialist

Scope: visual reference of the original Kaizen-AI dashboard interior + page/button map. No candidate, snapshot, config or git changes.

## Artifacts
- Reference page: `redesign/reference/index.html` (loads `reference/dist/reference.js` + `reference/dist/reference.css`).
- Sources: `reference/src/entry.jsx` (extracted shell, labelled), `reference/src/fixtures.js` (fictional), `reference/src/stubs/next-link.jsx`.
- Build/capture: `reference/devtools/build.cjs`, `tailwind.reference.config.cjs`, `shoot.cjs`; pinned deps in `reference/devtools/node_modules` (esbuild 0.24.2, react 19.1.0, tailwindcss 3.4.17, `--ignore-scripts`).
- Captures: `redesign/evidence/reference/desktop-1440x1000.png`, `desktop-1440x1000-fullpage.png`, `phone-390x844.png` (2x), `phone-390x844-fullpage.png`, `capture-report.json`.
- Docs: `redesign/REFERENCE.md` (what to keep / what differs / anchors), `redesign/BUTTON_MAP.md` (five routes, student vs parent).

## Verified by execution
- Bundle built from 12 real snapshot files (`reference/dist/bundled-sources.txt`); zero console errors or page errors at both viewports (`capture-report.json`).
- Desktop: rail 240px, body bg rgb(250,250,249), primary pill rgb(26,25,23) radius 9999px, five labels Today/Plan/Learn/Grades/Growth, sections in original order.
- Phone: rail hidden, fixed five-tab bottom bar, same content column; Done on the next-step card promotes the next item and removes a row (click test).

## Known limits
- Shell markup is a static extraction of `app/dashboard/page.js:600-712`; other tabs are placeholders; fonts are the snapshot fallback stacks (no network).
- Not a production screenshot. Fixture names, courses, counts are fictional.

## Owner questions (max two)
1. Today, student primary: Start (opens the item) or Done (check-off)? Recommend Start.
2. Parent "Mark checked" on Today: visible pill in parent role, or hidden behind ⋯? Recommend visible, parent role only.
