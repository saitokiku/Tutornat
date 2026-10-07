---
name: design-system
description: The visual and interaction rules for every Natural Tutor screen — the design read, type and color systems, motion restraint, screen states, kids' versus teens' versus parents' surfaces, banned defaults and copy, and the copy linter. Load it when you do any UI task (a new screen, component, layout, landing page, avatar tile, form, report, or email), when you write copy for product UI, and when you review taste. It loads ui-craft and design-taste-frontend first and adds only what is specific to this product.
---

# Design system

Load `ui-craft` and `design-taste-frontend` first and follow their QA checklists; this skill adds what is specific to us. Spec §5.10 A (layout), §12 (child-directed design creep), build prompt "Taste". Run `node .claude/skills/design-system/scripts/check-copy.mjs` before a UI PR; it fails on banned words, exclamation points, and emoji in product UI strings.

## The design read

A consumer product for parents and students that has to feel like a calm, competent tutor on a video call; trust-first constraints for kids override aesthetic preference. If the learner app starts looking like a kids' app, the whole service becomes child-directed and the age screen stops working as a shield (spec §12): keep visuals teen/parent-facing; the 9–12 band differs in register and session length, not in cartoons.

## Never ship these defaults

Purple-to-blue gradients, a centered hero over a dark mesh, three equal feature cards, glass effects on everything, infinite-loop micro-animations, sparkle or robot iconography to signal "AI", Inter over slate-900 as the whole identity, emoji in UI or copy, hand-drawn SVG icons, lorem ipsum, stock illustrations of smiling families, fake testimonials, "trusted by" logo rows, countdown timers, confetti. Upstream's brand primary `#722ed1` (`app/globals.css:75`) is replaced, not inherited.

## Do this instead

- **Type.** One type system chosen on purpose, loaded through `next/font` (upstream already loads Geist via `next/font`; Inter is loaded from `@fontsource` for non-Latin subsets and is not our identity). A real scale for tutor text that a ten-year-old can read at arm's length: tutor captions and check items at least 20 px on the session screen, 24 px on 4–8 surfaces. One icon family (lucide, already in 145 files), one stroke weight.
- **Color as a system.** Neutrals, one brand hue, semantic colors for states, defined as Tailwind v4 `@theme` tokens in `app/globals.css` and mirrored for `.dark`. The whiteboard is the most colorful thing on the screen, and only when the tutor is drawing.
- **Motion.** Things move because state changed. The avatar's reactions are proportional: a smile for a correct check, not fireworks. Respect `prefers-reduced-motion` everywhere; upstream's session screen has no reduced-motion handling, so add it to every `motion/react` usage in `components/tutor` and to the rig.
- **One focal point at a time.** The face when talking, the whiteboard when drawing, the learner's input on their turn. Quiet everything else rather than making the focal point louder.
- **Real content in every mockup and test.** Long names, an equation that wraps, a kid who types "idk", a parent with three learners.
- **The rig** is a stylized character with a warm, specific personality: not photoreal, not a mascot. Five kids test it before Gate 2; change it if they find it creepy or babyish.
- **Surfaces by audience.** Kids: bigger targets (≥ 56 px), fewer choices, no text the child cannot read aloud. Teens: nothing that looks like a kids' app. Parents: dense, plain, factual tables.
- **States.** Every screen ships loading, empty, error, and offline states; every form has validation, focus management, and keyboard access; semantic HTML first, ARIA only to fill gaps (CLAUDE.md).
- **Screens to review at 390 px and 1280 px, light and dark**, with screenshots in the PR.

## Copy

Say what it does, what it costs, and what it won't do. Banned words and moves: unlock, seamless, supercharge, empower, journey, delightful, effortless, revolutionize, "great question", exclamation points in product UI, questions as headlines, adjectives where a number would do. The landing page states the price, the age bands, the coach-mode rule, and the data rule about voice and camera in plain sentences; a parent should be able to read it and find nothing to distrust. The "AI tutor" label is visible in every session (`PRODUCT.aiLabel`).

## Product honesty

No fake stats, no invented social proof, no dark patterns anywhere near consent or cancellation, no "are you sure?" loops on delete. Cancellation is one click in the portal. Attention data is shown to parents, not used to keep a child on screen.

## Session layout (spec §5.10 A)

Video-call layout: tutor tile large, whiteboard tile beside (desktop) or below (mobile), learner self-view small and only when the camera is on, call controls (mute, camera, end), the persistent "AI tutor" label, and the session timer. Text input and the transcript stay available in every state. The dock (mic, type, interrupt) is the only chrome that stays on top of the focal point.
