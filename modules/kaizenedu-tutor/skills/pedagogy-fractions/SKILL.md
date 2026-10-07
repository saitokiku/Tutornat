---
name: pedagogy-fractions
description: The launch slice's pedagogy — the fractions to pre-algebra skill graph, the misconception tags and how to diagnose them in two questions, re-teach strategies, worked and faded examples, check-item design, the item bank pipeline and its validator, and how the parent report words progress. Load it when you touch the skill graph, item bank, diagnostic, misconception tagging, re-teach logic, tutor explanations for fractions, the parent report's per-skill wording, or the early-numeracy slice at Gate 3.
---

# Pedagogy — fractions to pre-algebra

Spec §5.7 (student model), §5.8 (slice, tags, item bank), §5.9 (parent report), R12, content-15, tutor-10, young-46. Seed data: `references/skill-graph.json` (the 12 skills, prerequisites, tags). Validator: `node .claude/skills/pedagogy-fractions/scripts/validate-item-bank.mjs <items.json>`.

Sources the rules below rest on: the IES/What Works Clearinghouse practice guide *Developing Effective Fractions Instruction for Kindergarten Through 8th Grade* (NCEE 2010-4039; recommendations: build on informal sharing and proportionality, treat fractions as numbers on the number line, explain why computation procedures make sense, develop conceptual strategies for ratio and proportion before cross-multiplication) and the whole-number-bias literature (Ni & Zhou, 2005; Siegler and colleagues on number-line estimation). The guide's text could not be fetched from the Phase 0 environment; the wording here follows its published recommendations and should be re-read by the pedagogy track (Track C) before the item bank ships.

## The skill graph (spec §5.8)

Prerequisite check-ins: multiplication facts; factors and multiples.

| Id | Skill | Prereqs |
| --- | --- | --- |
| F1 | Fraction as part of a whole; unit fractions | — |
| F2 | Fractions on a number line | F1 |
| F3 | Equivalent fractions | F1, F2 |
| F4 | Comparing and ordering (common denominators, benchmarks ½ and 1) | F3 |
| F5 | Simplifying (GCF) | F3 |
| F6 | Mixed numbers ↔ improper fractions | F2 |
| F7 | Add/subtract with like denominators | F1 |
| F8 | Add/subtract with unlike denominators (LCD) | F3, F7 |
| F9 | Multiply fractions; fraction of a set | F3 |
| F10 | Divide fractions (reciprocal, and why it works) | F9 |
| F11 | Fractions ↔ decimals ↔ percents | F4 |
| F12 | Ratios and rates (bridge to pre-algebra) | F9, F11 |

Next-skill rule: the lowest unmastered skill whose prerequisites are mastered. Mastered = estimate ≥ 0.8 with ≥ 4 items across ≥ 2 sessions; always labelled "estimate" in the UI.

## Misconception tags and how to hear them

| Tag | What the learner believes | Two-question diagnosis | Re-teach that works |
| --- | --- | --- | --- |
| `denominator_magnitude` | bigger denominator = bigger fraction | "Which is bigger, 1/3 or 1/8?" then "Draw them on one number line." | Unit fractions as shares: more people sharing means smaller pieces; number line side by side. |
| `add_across` | 1/2 + 1/3 = 2/5 | "What is 1/2 + 1/2?" (answer 2/4 reveals it) then "Is 2/4 more than 1/2?" | Like denominators first (count the pieces), then why unlike ones need renaming; estimate before computing. |
| `whole_number_bias` | numerator and denominator are two separate whole numbers | "Is 3/4 closer to 0, 1/2, or 1?" then "Where does 7/8 go?" | Number line and benchmarks; fractions are one number, not two. |
| `equivalence_as_change` | scaling top and bottom changes the value | "Is 2/4 the same amount as 1/2?" then "What did we multiply by?" | Fold or cut the same bar into more pieces; multiply by n/n = 1. |
| `division_makes_smaller` | dividing always gives a smaller result | "How many halves are in 3?" then "So 3 ÷ 1/2 is bigger or smaller than 3?" | Measurement division ("how many fit"), then why invert-and-multiply works. |
| `decimal_length` | 0.25 > 0.3 because it is longer | "Which is more money, $0.25 or $0.30?" then "Put them on the number line." | Place value with money and tenths/hundredths grids. |

Diagnose in two questions: the first item is the one whose wrong answers separate the tags for that skill; the second confirms the tag with a different representation (number line, area, set, or word problem). Never ask the same representation twice in a diagnostic. Place in ≤ 4 items (R12).

## Teaching moves the tutor uses

- Ask before telling; one question per turn; ≤ 3 sentences.
- Concrete → pictorial → symbolic. The whiteboard shows the bar, the number line, or the set before the notation.
- Estimate first ("more or less than a half?") so procedures are checked against sense.
- Worked example, then a faded example (one step blank), then the learner's own; never two identical explanations in a row (spec §5.2). Track which representation worked in the learner profile.
- Language for 9–12: shorter sentences, concrete objects (pizza, chocolate bar, money, a measuring cup), frequent checks; the same rules otherwise.
- Say why a procedure works before drilling it (invert-and-multiply, common denominators, cross-multiplication only after proportional reasoning).

## Check items (spec §5.8, content-15)

≥ 8 items per skill (≥ 96 total). Item schema (`references/item-schema.json`): `id`, `skill` (F1–F12), `type` (`single`, `multiple`, `numeric`, `short`), `stem` (Markdown with `$…$` math), `options` for choice items with exactly one `correct` and a `misconception` tag on every distractor (from the six tags above, or `computation` for a pure slip), `answer` with `tolerance` and `units` for numeric, `representation` (`bar`, `number_line`, `set`, `symbolic`, `word`), `band` (`9-12`, `13-17`, `both`), `source` (`generated`, `kaizen-bank:<id>`), `reviewed_by`, `reviewed_at`. Nothing unreviewed reaches a learner.

Pipeline: generate candidates with the strong model → solve each with self-check → export a review sheet the operator clears in thirty minutes → import only reviewed items (`reviewed_at` set) with tags on every distractor → `validate-item-bank.mjs` in CI. Reuse the existing Kaizen item bank where it overlaps (open question in spec §15: which items map onto the graph).

## Parent report wording (spec §5.9)

Per learner: sessions and minutes this week; per skill, starting estimate → current estimate and status; misconceptions open and resolved; next skill; one-line tutor note per session; the learner's thumbs. Example of the intended reading: "Fractions — starting 42%, now 78%; resolved: denominator magnitude; next: equivalent fractions." Plain, dense, factual; no adjectives where a number does.

## Gate 3 early-numeracy slice (young-46)

Counting, number sense to 20, comparing, simple add and subtract; its own graph and ≥ 48 reviewed items; voice-only items with big tap targets and no text the child cannot read aloud; ten-minute sessions with one skill target. Same schema, same validator.
