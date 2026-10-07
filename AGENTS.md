# Working in Tutornat (KaizenEDU)

Read first: [PRODUCT.md](PRODUCT.md) (what we're building and for whom), [DESIGN.md](DESIGN.md) (the
look), [docs/STATUS.md](docs/STATUS.md) (what's done), [docs/ROADMAP.md](docs/ROADMAP.md) (what's next),
[docs/DECISIONS.md](docs/DECISIONS.md) (the owner's own words).

## Layout

- `apps/web` — the product (Next.js 16.4, React 19, TypeScript, Tailwind v4).
- `modules/` — parked source from earlier attempts. **Never import it from `apps/web`.** Port pieces in
  deliberately; each module has a README saying what's worth taking.
- `docs/history/` — records from earlier attempts. Historical; may be stale.

## Commands (repo root)

```
npm install
npm run dev        # http://localhost:3000
npm run verify     # lint + typecheck + tests + production build — must pass before committing
npm test           # vitest only
npm run e2e        # Playwright journey (parent + K + ES learner) at 1440 and 390 px
```

## Rules

1. **No AI slop** (owner's top rule): no filler copy, canned praise, invented metrics, gradient text,
   eyebrow labels over headings, decorative "AI" badges. Plain, warm, specific.
2. **Honesty in the product.** Demo content says demo. Completion and answers are activity, never
   mastery. Hints and post-miss explanations mark an answer as helped. Nothing is labelled AI-made
   unless it was.
3. **Every UI string goes through `t()`** (`src/i18n/en.ts`, `es.ts`); the test fails if Spanish is
   missing a key or placeholder.
4. **Backend-shaped functions live in `src/lib/`** and screens call them. When the backend arrives,
   replace function bodies, not screens.
5. **Accessibility is not optional:** every visual has a text description, every manipulation works by
   tap and keyboard (no drag-only), 44px targets, reduced motion, 320px wide.
6. **Minimum correct code** (Ponytail): reuse what's here, native/browser features first, no
   abstractions without a second user, one runnable check for non-trivial logic.
7. Secrets never go in the repo. `.env*` is ignored except `.env.example`.

## Next.js 16.4 gotchas in this app

- Read `apps/web/node_modules/next/dist/docs/` before using an API you haven't used here; it differs
  from older Next.
- Signed-in routes read the browser store, so their layouts wrap children in `<Suspense>` +
  `BrowserOnly` (`use(browser())`) and set `export const instant = false`. Instant-navigation
  validation is limited to segments that opt in (`next.config.ts`).
- Page/layout files may only export what Next allows; put helpers in `src/components` or `src/lib`.
- No `Date.now()`/`Math.random()` during render (lint enforces purity); use state initializers.
- `npm run typecheck` runs `next typegen` first so `LayoutProps`/`PageProps` exist.
