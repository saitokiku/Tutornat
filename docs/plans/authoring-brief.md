# KaizenEDU practice authoring brief (shared by every strand author)

> Used for the seven parallel strand authors on 2026-10-07. Reuse for M4. Replace the worktree setup
> with whatever the session uses; the rules are the point. Add rule 16 below for 1.0.

KaizenEDU is an at-home learning product for US K–9 learners (pre-readers through 9th grade), with
parents. "Practice" is the Kumon-style core: short daily sets of problems, each generated from a seed,
checked by code, with a hint ladder, a worked solution, and English + Spanish copy.

## Setup (you are in an isolated git worktree of the repo `Tutornat`)

1. `cd` to your worktree root. node_modules are NOT installed there. Run:
   `ln -s /Users/man/Documents/GitHub/Tutornat/node_modules node_modules`
   `ln -s /Users/man/Documents/GitHub/Tutornat/apps/web/node_modules apps/web/node_modules` (if the target exists)
2. Read, in your worktree: `apps/web/src/practice/types.ts`, `rng.ts`, `text.ts`, `answer.ts`,
   `expr.ts`, `skills.ts`, `skills.test.ts`, and the finished example strand `math/early.ts` (copy its
   style exactly). Read `apps/web/src/lib/types.ts` for the `Visual` union (pictures you can attach).
3. Tests: from `apps/web`, run `npx vitest run src/practice`. Type check: `npx tsc --noEmit -p .`.
   Lint: `npx eslint src/practice`.

## What you write

- ONLY your strand file (already stubbed, e.g. `src/practice/math/g3to5.ts` exporting `MATH_3_5`) and
  ONE new test file next to it (e.g. `src/practice/math/g3to5.test.ts`). Do not edit any other file.
  (If you truly need a helper, put it inside your strand file.)
- Commit your two files on your worktree branch with a clear message ending with the line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push. Report your branch name.

## Skill shape (see types.ts)

Each skill: `{ id, subject, grade, title: {en, es}, standard?, prereqs, levels, content, generate(r, level, locale) }`.
- `id`, `grade`, `standard`, `prereqs`, `levels` are given in your skill table — use them exactly.
  You may change `levels` if the table says "L≈" (approximate), between 1 and 3.
- `content: "computed"` when the answer is calculated by your code (math, unit conversions, physics
  formulas, Punnett squares…). `content: "draft"` for hand-written question banks (most English and
  science) — those are honest about not being teacher-reviewed yet.
- `generate` returns an `ItemBody`: prompt (MathPart[]), say, visual?/picture?/alt?, choices?, input,
  keys?, answer, hints, steps, seconds.

## Rules (the test enforces several; all are required)

1. **Correct, always.** A wrong answer key is the worst possible bug. Use exact integer/rational
   arithmetic (no floating-point surprises: build problems backward from integer answers, e.g. pick x
   then compute the equation's constant). For decimals, round with care and choose numbers that are
   exact in binary-decimal display (e.g. keep to 1–2 decimal places and compute via integers ÷ 10^k).
2. **Independent verification in your test file.** For every computed skill, test 200+ seeds per level
   and verify the answer by a DIFFERENT route than the generator used: substitute the solution back into
   the equation, multiply back after dividing, expand a factored answer and compare with
   `equivalent(parse(a), parse(b))` from `expr.ts`, evaluate the displayed expression string, compare a
   fraction result with floating-point of the original operands, check a remainder by q*d + r = n, etc.
   For draft banks: assert every bank entry has ≥3 choices (≥2 for true/false-type), a valid answer
   index, distinct choice labels, non-empty EN and ES, and that each level has ≥12 distinct items.
3. **Both languages.** Every string the learner sees or hears exists in English and Spanish (neutral
   Latin-American Spanish, the kind a US bilingual family reads). Use `tr(locale, en, es)`. For banks,
   store `{ en, es }` per entry so a seed picks the same entry in both languages. Spanish answers for
   text input must be what a Spanish speaker would type (accept both with and without accents — the
   checker already ignores accents).
4. **Kid language by grade.** K–2: very short sentences (≤ 10 words), concrete. 3–5: plain, one idea per
   sentence. 6–9: direct, never talks down. No praise words, no exclamation marks, no "Great job",
   no filler. Warm, plain, specific.
5. **`say`** is the read-aloud line: natural speech, NO notation (no "3/4", "^", "x²", braces). Use
   `sayFrac`, `sayNum`, and words ("x squared", "3 fourths", "times"). The test rejects /\^|\d\/\d|\{|\}/.
6. **Prompt** uses `MathPart[]`: strings, `{ frac: [n, d] }` for stacked fractions, `{ sup: [base, exp] }`
   for powers, `{ blank: true }` for the answer box. Use the true minus sign "−" and "×", "÷" in
   displayed text. Use `show(n)` for negative numbers in text.
7. **Hints**: exactly 3, smallest first: (1) a nudge or question that points at the key idea, (2) the
   strategy, (3) the first step done — never the final answer itself. Specific to THIS problem's numbers.
8. **Steps**: the worked solution, 1–4 short lines, ending with the answer.
9. **Input**: `choices` (2–4 options; required for K and for most banks; each choice may have `say` and a
   `picture` emoji), `keypad` (whole numbers; add `keys: ["-"]` for negatives, `keys: ["."]` for
   decimals), `fraction` (answers that are fractions/mixed numbers — answer kind "fraction"; set
   `simplest: true` when the prompt asks for simplest form, and SAY so in the prompt), `expr` (algebra;
   answer kind "expr", optionally `form: "factored" | "expanded"`), `remainder` (long division, answer
   kind "remainder"), `text` (one short word; answer kind "text" with all acceptable spellings).
   Answer kinds "set" (several solutions, e.g. quadratic roots) and "pair" (x, y) use input `text`.
10. **Choices** must be distinct; distractors must be plausible and each wrong for a clear reason (the
    common mistake), never silly. Put the correct one in a random position (`r.shuffle`).
11. **Visuals/pictures**: attach a `visual` (see the Visual union in lib/types.ts: dots, ten-frame,
    base-ten, clock, array, column, fraction, number-line {marker?}, rect, triangle, circle,
    right-triangle, prism, coord, particles, moon, line-graph) whenever a picture genuinely helps,
    always with `alt` (a full text description that does NOT give away the answer). Pre-reader English
    and K–2 science should use `picture` (a single common emoji, e.g. "🐶") plus `alt`, and choice
    pictures, so a child who can't read can still answer by listening and looking.
12. **seconds**: a comfortable pace for a learner who knows the skill (fact recall 4–6 s, multi-step
    arithmetic 20–45 s, word problems 45–90 s, reading items 20–60 s).
13. Keep numbers kid-sized and realistic. Word problems: everyday US contexts, no brand names, no
    violence, no stereotypes; vary names across cultures.
14. **No AI slop**: no filler, no "Let's dive in", no emojis in text (emojis only as `picture`).
15. Use exactly the skill ids/prereqs given. The shared "skill map" test may fail ONLY because a
    prerequisite belongs to another strand that is still an empty stub in your worktree — that is
    expected; list those ids in your report. Everything else must pass: your test file, the per-skill
    generator tests, tsc and eslint with zero errors and zero warnings in your files.

16. **Misconception tags.** Every wrong choice carries a short tag naming the mistake it represents
    (e.g. `"added-denominators"`, `"forgot-to-flip-sign"`, `"counted-crossed-out"`), as `why` on the
    `Choice`, so a miss becomes a diagnosis in the learner model. Keypad items name the most likely wrong
    values with tags in `wrong: [{ value, why }]`. Tags are kebab-case, reused across items of a skill.

## Report back (short)

Branch name, list of skill ids with levels and content type, test counts, anything you were unsure
about (factual or pedagogical), and any prerequisite-ordering failures that are expected.
