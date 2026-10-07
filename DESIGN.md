# Design

The KaizenEDU visual system, inherited from the Kaizen-AI dashboard the owner chose as the reference
(`modules/kaizen-ai/web/app/globals.css`, `tailwind.config.js`, `app/dashboard/page.js`; reconstruction
notes in `docs/history/discovery/redesign/REFERENCE.md`). Tokens live in `apps/web/src/app/globals.css`.

## World

Warm paper and white panels, near-black ink, one restrained rose. It should feel like a well-made
notebook and a quiet classroom, not a game and not a SaaS console. **Ink acts, rose marks**: every
primary action is the same ink pill; rose is for selection, the active tab rule, focus and small marks —
never the default button.

## Color

| Token | Hex | Role |
|---|---|---|
| paper | #FAFAF9 | page background |
| panel | #FFFFFF | cards, reading column, stage |
| panel2 | #F1F1EF | side rail, wells, inset groups |
| border | #E4E3DF | hairlines |
| ink | #1A1917 | text, primary buttons (16.8:1 on paper) |
| muted | #6B6862 | secondary text (5.3:1) |
| accent | #A93B5D | rose: selection, focus, marks (5.8:1) |
| good / warn / bad | #4F7A5B / #8A6412 / #B3453F | status only |
| math / science / english | #3E6E8E / #4F7A5B / #A93B5D | subject marks: a dot, a thin rule, a tinted visual — never a full-bleed fill |

## Type

- Brand / headings: **Schibsted Grotesk**, tight negative tracking (scale d1 60 · d2 44 · d3 34 · t1 26 · t2 20 · t3 17).
- Body: **Instrument Sans** 16/1.6; sm 14, xs 13.
- Figures and data labels: **IBM Plex Mono**, tabular. Mono is for numbers, counts, file rows and
  status — not a costume.
- No eyebrow/kicker labels above headings.

## Shape and depth

Inputs 10px, cards 14px, large panels 20px, buttons pill. Nothing else is rounded. Two shadows: `soft`
(cards) and `lift` (the one raised next-step card). No colored halos, no hard offset shadows.

## Composition

- App: 240px rail on panel2 (logo · primary action · tabs · footer with learner, demo status, settings).
  Active tab = white tile, soft shadow, 2px rose rule on its left edge. Content on paper in a reading
  column (max 896px). Phone: same tabs in a fixed bottom bar with a rose rule on top of the active tab.
- One job per page, one ink primary per screen. Secondary = outlined pill next to what it acts on.
  Destructive actions hide behind a confirm step.
- Rows over cards for lists: dot · title · mono meta · one action.
- The lesson stage is the one place that goes full width.

## Motion

One authored moment per surface (e.g. lessons arriving in the outline, a fraction bar splitting).
Exponential ease-out, short. Everything has a reduced-motion equivalent that keeps the same information.

## Teaching visuals

Drawn in SVG from the palette: bars, number lines, particles, the Moon, graphs. They explain the
concept; no decorative illustration, no generic dots, no text rendered as an image. Every visual has a
text description and every manipulative has buttons and keyboard control.
