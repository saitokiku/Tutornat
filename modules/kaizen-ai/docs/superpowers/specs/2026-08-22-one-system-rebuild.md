# One system: the 2026-08-22 UI rebuild

Supersedes `2026-08-12-day-night-visual-overhaul.md` and closes the anti-slop plan's
un-executed Wave B. Founder brief: the UI is "imbalanced, inconsistent, sloppy" while
the idea and the backend are solid. So: every function survives, every pixel is
reconsidered.

## Why the last system failed

It renamed the palette instead of migrating it. `base`/`paper`, `panel2`/`linen`,
`border`/`dayline`, `ink`/`coal2` were eight names for four identical values, so a
component written for the app could not be dropped on a marketing page even though it
would render identically. That made every marketing element a hand-typed one-off, and
the drift followed mechanically: eight h1 sizes in two weights, twelve h2 sizes, 39
arbitrary `text-[Npx]` literals, seven container widths, no repeated section rhythm,
25 button recipes, four "Our pick" badges, nine corner radii, eight page shells.

The lesson the rebuild is built on: **a design system is not a set of names, it is a
set of decisions that are hard to re-make locally.** Anything a page can retype, a
page eventually will.

## The idea

Kaizen's one true claim is that it keeps an honest record: a skill counts only on
unassisted, verified, delayed evidence. So the product reads as **a well-kept record**
— editorial, precise, numerate — not as a glowing AI toy. Mono carries every time,
price, and percentage, because those are the things the record asserts.

Dials: VARIANCE 5 · MOTION 3 · DENSITY 4. Trust-first, because the audience is a
parent deciding whether to hand us their kid, and a teen who has to want to open it.

## Rules

1. **One theme, locked.** The product is light. Exactly one surface is dark: `/ai`,
   full page, top to bottom. No mid-page inversions anywhere, ever. This retires the
   day/night dual-token split and makes tone leakage structurally impossible.
2. **One palette.** Tokens below are the whole vocabulary. No raw hex or rgba in a
   component; no `text-white` where `text-paper` is meant. Every pair ships verified
   against WCAG (script in the rebuild commit): ink 16.8:1, muted 5.3:1, accent
   5.8:1, ember-on-coal 7.3:1.
3. **One type scale.** `text-d1..d3`, `t1..t3`, `body`, `sm`, `xs`, `micro`. An
   arbitrary `text-[Npx]` in a page is a bug.
4. **One radius scale.** `rounded-sm` (10px) inputs, `rounded-md` (14px) cards,
   `rounded-lg` (20px) large panels, `rounded-full` buttons. Nothing else is rounded.
5. **One primitive per job.** `components/ui/` holds Button, Section, Eyebrow, Badge,
   Card, Input, Notice, Stat, AppHeader. A page that needs a variant adds it to the
   primitive; it does not retype the utility string.
6. **Ink acts, rose marks.** Primary actions are the ink pill on every surface, so
   crossing `/pricing → /billing` no longer changes the action color. Rose is for
   selection, links, and the brand mark.
7. **Motion is one primitive.** `Reveal`/`RevealGroup` only, preserving their existing
   contracts exactly (see below). No scroll hijack, no pinning, no parallax.
8. **Eyebrows are rationed**: at most one per three sections, hero counts as one.
9. **Zero em-dashes** in marketing and app chrome. Legal prose is exempt.
10. **Icons, not glyphs.** `Icons.js` replaces every literal `→ ✓ ★ ↺ 🌸`.

## Tokens

Surfaces `paper #FAFAF9` · `panel #FFFFFF` · `panel2 #F1F1EF` · `border #E4E3DF`
Text `ink #1A1917` · `muted #6B6862`
Brand `accent #A93B5D`
Status `good #4F7A5B` · `warn #8A6412` · `bad #B3453F`
Dark surface (`/ai` only) `coal #141310` · `coal2 #1F1D19` · `nightline #33302A` ·
`ember #E8859F` · `nightmuted #98938A`

Type: Schibsted Grotesk (display) · Instrument Sans (body) · IBM Plex Mono (record).
Retired: sakura, teal, blossom, sage, plum, haze, linen, dayline, base.

## What must not change

The rebuild is visual. These are behavioral contracts, documented in code and pinned
by tests, and they survive verbatim:

- `Reveal`/`GlowLine`: server HTML never carries `opacity: 0`; already-painted pixels
  are never re-hidden; the entrance is decided once per element after mount; never
  branch on `useReducedMotion()` in a render body. Fail toward visible.
- The three-state law: LIVE / HELD / EMPTY is derived from `publicSchedule`, never
  hand-edited. Held surfaces expose zero booking affordances and zero
  `/billing?plan=` links.
- One email capture per page; held cards link to it rather than embedding a second.
- Prices are interpolated from `lib/server/clubPricing.js`. `/terms` contains no
  dollar literal at all.
- The `✓`-prefix message convention (settings, family, admin, BookModal): tone and
  icon derive from the prefix, which is then stripped.
- Refusals render in the error channel, never the success channel.
- `navigateWithFlush` links stay full-page navigations so debounced cloud writes flush.
- Copy pinned by `payoutSurfaces`, `guardianGate`, `sessionLoop`, `entitlements`,
  `claims`, `priceTruth`, and the e2e smoke specs.
- No person-praise, shame, or streak-loss framing anywhere a student can read.
