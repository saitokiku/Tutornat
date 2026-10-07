# KaizenEDU foundation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Live progress is tracked in [docs/STATUS.md](../STATUS.md).

**Goal:** A runnable, frontend-only KaizenEDU app in `apps/web` for K–9 math, science and English/rhetoric: landing, login + learner profiles, student and parent dashboards, magic box, course generation flow, lesson stage, Growth.

**Architecture:** Next.js 16 App Router client app. Plain functions in `src/lib/*` over one versioned `localStorage` document, read through `useStore()` (`useSyncExternalStore`). No AI or backend calls; demo content labelled. Domain types mirror OpenMAIC (course → lesson ≈ stage → scenes).

**Tech Stack:** Next.js 16.4, React 19, TypeScript strict, Tailwind CSS v4, Vitest + Testing Library, npm workspaces.

**Spec:** [docs/specs/2026-10-07-foundation-design.md](../specs/2026-10-07-foundation-design.md)

## Global Constraints

- No calls to AI providers or backends. Demo content and template outlines say so on screen.
- Tokens exactly as spec §12; fonts Schibsted Grotesk / Instrument Sans / IBM Plex Mono; radii 10/14/20px; pill buttons; one ink primary per screen; accent marks selection only.
- Every UI string through `t()`; `es` typed against `en`.
- Nickname 1–40 trimmed; grade `K`–`9` or `adult`; password ≥ 8; goal ≤ 2000 chars.
- Magic box: ≤30 files, ≤25 MB each, ≤150 MB total; accepted `.pdf .png .jpg .jpeg .webp .gif .doc .docx .txt .md .csv .json`.
- No mastery / %-learned / streak-as-achievement copy.
- `modules/` is never imported by `apps/web`.

## Review Focus

1. Storage blocked or corrupt → app renders with a reset notice. (Task 2: `recovers from corrupt store`, `falls back to memory`.)
2. Signed in with no learners, or the active learner removed → `/profiles`, no crash. (Task 3: `removing the active profile clears selection`; Task 5 guard.)
3. Cancel / leave mid-generation → no events after abort; reload of an `outlining` draft offers rebuild. (Task 3: `abort stops the stream`; Task 7.)
4. URL to another learner's or a missing course → not-found card. (Task 3: `getCourse returns null for another profile`.)
5. Long goals, Spanish strings, 320px → no overflow, counter at limit. (Task 6: `goal is capped at 2000`; Task 11 visual pass.)

---

### Task 1: Workspace, scaffold, tokens
Root `package.json` (`workspaces: ["apps/*"]`, scripts proxy to `-w apps/web`, plus `verify`). `apps/web` from `create-next-app@16.4.0` (TS, Tailwind, ESLint, App Router, `src/`, `@/*`). `globals.css` `@theme` tokens per spec §12; fonts in `layout.tsx`; Vitest + jsdom + Testing Library. Check: `npm run verify` exits 0. Commit.

### Task 2: Types, store, i18n
`src/lib/types.ts` (spec §4), `src/lib/store.ts` (`read()`, `update(fn)`, `subscribe`, `useStore(sel)`, `health: 'ok'|'reset'|'memory'`), `src/i18n/{en,es,index}.ts` (`t`, `useT`). Tests: `recovers from corrupt store`, `falls back to memory when localStorage throws`, `es has every en key, none empty`, `t interpolates {name}`. Commit.

### Task 3: Domain functions + catalogue
`src/lib/{auth,profiles,courses,generate,activity,quiz,mode}.ts`, `src/catalogue/*` (K–9: fractions [EN+ES, full lesson], negative numbers, states of matter, why the Moon has phases, main idea, claim–evidence–reasoning; each with outline + ≥1 fully authored lesson). Tests: `signUp rejects short password`, `duplicate email case-insensitive`, `signIn wrong password fails`, `createProfile trims and validates grade`, `removing the active profile clears selection`, `outline emits steps, N lessons, done` (lesson 1 / short 4 / full 8), `abort stops the stream`, `getCourse returns null for another profile`, `summarizeWeek separates assisted`, `checkChoice`. Commit.

### Task 4: UI primitives, icons, brand
`src/components/ui/*` (Button primary/secondary/ghost + loading, Card, Field with aria-describedby, Notice, EmptyState, Chip, Badge, Label), `src/components/icons.tsx` (inline SVG), `src/components/brand/Logo.tsx`. Test: `Field links error via aria-describedby`. Commit.

### Task 5: Landing, auth, profiles, guards
`/` landing (spec §7, live FractionBar in hero), `(auth)` pages, `/profiles` (children + Parent tile, add/edit/remove with inline confirm), guards `RequireAccount`, `RequireLearner`, `RequireParent`. Test: `sign-up shows field errors without submitting`. Commit.

### Task 6: Student shell, Home, magic box
Rail/BottomBar/LearnerSwitch/DemoStatus; `/home` (greeting, MagicBox, lifted Continue card or a catalogue pick when empty, recent courses); `MagicBox` + `/courses/new`. Tests: `goal is capped at 2000`, `submit disabled until 3 chars or a file`, `31st file rejected with reason`, `chip fills but does not submit`. Commit.

### Task 7: Generation flow
`/courses/new/[id]`: StepLog (elapsed seconds, live region announces steps not ticks), lessons arrive, Cancel → back with text kept, OutlineEditor (title, rename, up/down, remove w/ confirm, add), Create course; stale `outlining` → rebuild. Commit.

### Task 8: Courses + course page
`/courses` (chips All · In progress · Finished; cards with "n of N lessons finished"; catalogue by subject and grade band), `/courses/[id]` (badges, lesson list + status, Start/Continue, delete with confirm, not-found). Commit.

### Task 9: Lesson stage
`/learn/[courseId]/[lessonId]`: SceneList, Stage, Controls (prev/next, Read aloud via `speechSynthesis` with stop), TutorPanel (not connected), scenes (Slide, Quiz, Interactive, Project, Empty), widgets (FractionBar, NumberLine, StatesOfMatter, ClaimSorter) each keyboard/click operable with a live readout; activity recording. Tests: `FractionBar arrow keys change parts and readout`, `hinted correct answer records assisted`. Commit.

### Task 10: Growth, Family, Settings
`/growth` (week nav, figures, day rows), `/family` (child cards, needed-help list, notes, assign course), `/settings` (name, language, learners link, delete local data with typed confirm, disclosures). Commit.

### Task 11: Docs, verification, review
README, AGENTS.md (+ CLAUDE.md pointer), docs/PRODUCT.md, DECISIONS.md, ROADMAP.md, STATUS.md final. `npm run verify`; browser pass 1440/390/320 through the whole journey (parent + student); one fresh whole-branch review; fix confirmed findings. Commit.
