-- seed_kc_algebra1.sql — the Algebra I chain, DRAFT bank awaiting human sign-off.
-- Run AFTER 0012, 0013 and seed_kc.sql. Idempotent (upserts on slug / natural keys).
--
-- WHY THIS EXISTS
-- seed_kc.sql stops at two-step equations and the distributive property: 8
-- concepts of middle-school math. Every other subject the product talks about
-- returns noBank, so confirmed mastery — the engine's whole claim — was
-- reachable on eight concepts only. This file carries the chain forward through
-- Algebra I: 15 components, 90 items, authored at the ship floor
-- (6 items, >=2 context tags, >=3 items per tag — docs/archive/PRODUCTION_READINESS.md).
--
-- THIS BANK IS NOT LIVE, AND THAT IS DELIBERATE.
-- Every kc_item row here is status 'draft' / verified_by 'draft:llm-authored' /
-- verified_at null. check.js selects status = 'verified', so not one of these
-- items can be served to a student until a human promotes it. seed_kc.sql sets
-- the standard this follows: "LLM-drafted items must pass solver agreement +
-- second-model critique + human sign-off before status becomes 'verified'."
-- Solver agreement and critique are done (see below). The human sign-off is not,
-- and the promotion SQL is deliberately NOT included in this file.
--
-- WHAT WAS ALREADY DONE TO IT
--   - Authored per concept by one pass, then re-solved from scratch by an
--     independent second pass that never saw the stored key first.
--   - Every numeric answer back-substituted into the original wording; every
--     symbolic key round-tripped through the real verifier
--     (web/lib/engine/verify/symbolic.js) against the forms a student would
--     actually type, plus each named misconception value to confirm it fails.
--   - Zero wrong answer keys were found across all 90 items. Eleven other
--     defects were found and fixed: ambiguous stems, two geometrically
--     impossible area items, unreachable misconception rows, and false claims
--     in the files' own comments.
--
-- WHAT A HUMAN REVIEWER MUST STILL DECIDE — see
-- docs/reviews/ALGEBRA1_ITEM_BANK.md for the full checklist. The load-bearing
-- one: a symbolic verifier compares VALUES, not FORM, so on a "factor this"
-- item an unfactored but equivalent answer passes. That affects
-- math-factor-gcf and math-factor-trinomial specifically. Do not promote those
-- two concepts until you have decided whether that is acceptable.
--
-- The kc rows themselves are 'verified': the concepts are real and the
-- prerequisite graph is the product's own claim about what comes before what.
-- It is the ITEMS that await review.

-- ══ slice 1 ══════════════════════════════════════════════════════════════

-- algebra1_part1.sql — Algebra I chain, slice 1: expressions -> equations.
-- Run AFTER 0012, 0013 and seed_kc.sql (every prerequisite named here is seeded
-- there). Idempotent (upserts on slug / natural keys).
--
-- WHAT THIS ADDS
--   math-combine-like-terms          Combining like terms
--   math-solve-variables-both-sides  Equations with variables on both sides
--   math-solve-multistep             Multi-step equations with distribution and fractions
--
-- WHY THIS SLICE
-- seed_kc.sql stops at two-step equations and the distributive property. That is
-- exactly where Algebra I actually begins, and the three components below are the
-- bridge every later topic stands on: systems, inequalities, literal equations and
-- rational equations are all "collect, distribute, clear the fraction, isolate"
-- wearing different hats. A learner blocked here is blocked on the whole course:
-- policy.js keeps returning 'blocked_on_prereqs' and has nothing to offer instead.
--
-- The slice is also chosen for verifiability: every answer here is a number or an
-- expression in one variable, so no model sits in the grading path. The numeric
-- and symbolic rows are tier v1; the three MC rows are tier v2, the same split
-- seed_kc.sql uses. Answers were derived and back-substituted by hand.
--
-- STATUS: DRAFT. Per seed_kc.sql's standard — "a confidently wrong item teaches a
-- wrong thing and destroys trust faster than a missing feature" — LLM-drafted
-- items must pass solver agreement + second-model critique + human sign-off before
-- status becomes 'verified'. Every kc_item row below is status 'draft' /
-- verified_by 'draft:llm-authored' / verified_at null. check.js filters on
-- status = 'verified', so nothing here can reach a student until a human promotes
-- it. The kc rows themselves are 'verified' — the concepts are real; it is the
-- ITEMS that are unreviewed.
--
-- FLOORS MET (docs/archive/PRODUCTION_READINESS.md, "the three floors"): 6 items per
-- concept, 2 distinct context_tag values, 3 items per tag. Below 6 the second
-- check is largely a memory test of the first (elo.js:73 penalises a seen item by
-- 800); below 2 contexts the confirmation gate can never open.

-- ── Knowledge components ─────────────────────────────────────────────────────
insert into kc (slug, subject, title, type, verifiability, status) values
  ('math-combine-like-terms',         'math', 'Combining like terms',                                'skill', 'v1', 'verified'),
  ('math-solve-variables-both-sides', 'math', 'Equations with variables on both sides',              'skill', 'v1', 'verified'),
  ('math-solve-multistep',            'math', 'Multi-step equations with distribution and fractions', 'skill', 'v1', 'verified')
on conflict (slug) do update set
  title = excluded.title, type = excluded.type,
  verifiability = excluded.verifiability, status = excluded.status;

-- ── Prerequisite edges ───────────────────────────────────────────────────────
-- policy.js only makes a component eligible once every prerequisite is CONFIRMED,
-- so these edges are what stop a learner being handed 2(3x - 1) = 4(x + 3) while
-- they still cannot collect 5x + 2x. The chain reads:
--   distribute ─> combine-like-terms ─┐
--                                     ├─> variables-both-sides ─> multistep
--                 solve-two-step ─────┘
-- variables-both-sides needs BOTH parents: collecting terms is the new move, but
-- undoing the resulting two-step equation is the finish, and a learner who has
-- only one of the two fails for a reason the item cannot distinguish.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'prerequisite' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-distribute',                 'math-combine-like-terms'),
  ('math-combine-like-terms',         'math-solve-variables-both-sides'),
  ('math-solve-two-step',             'math-solve-variables-both-sides'),
  ('math-solve-variables-both-sides', 'math-solve-multistep')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- Confusable edges drive interleaving, which works by forcing the question "which
-- kind of problem is this?" — so the graph has to encode what is actually
-- confusable with what.
--
-- Simplify-versus-solve is the genuine confusion in this slice, and it runs both
-- ways. One direction: shown 5x + 3 + 2x, the learner invents an equals sign and
-- "solves" for x. The other: shown 5x + 3 = 2x, the learner combines 5x and 2x
-- straight across the equals sign as though it were one expression. Same surface
-- (x-terms and constants in a row), opposite legal moves.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'confusable' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-combine-like-terms',         'math-solve-variables-both-sides'),
  ('math-solve-variables-both-sides', 'math-combine-like-terms')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- ── Misconceptions ───────────────────────────────────────────────────────────
-- Named, diagnosable error patterns. These make feedback ELABORATED ("you moved
-- the 2 across without changing its sign") rather than bare "try again". The MC
-- inserts below look these up by label on the same kc_id, so a label typo here
-- silently degrades a diagnosing distractor into a plain wrong answer — the
-- lookup returns null rather than failing.
insert into kc_misconception (kc_id, label, description, feedback_md, source)
select kc.id, m.label, m.description, m.feedback_md, 'authored'
from kc join (values
  ('math-combine-like-terms', 'Combined unlike terms',
   'Treats a constant, or a different power of x, as a like term: 5x + 3 + 2x = 10x.',
   'Only terms with the **exact same variable part** combine. 5x and 2x are like terms, so they make 7x — but the 3 has no x attached, so it cannot join them. The answer keeps two pieces: 7x + 3.'),
  ('math-solve-variables-both-sides', 'Moved a term without changing its sign',
   'Carries a term across the equals sign keeping its sign: 7x + 2 = 3x + 18 becomes 4x = 20.',
   'Nothing "moves" across an equals sign — you do the same operation to both sides. Taking 2 off the left means taking 2 off the right too, so the right becomes 18 - 2 = 16, not 18 + 2.'),
  ('math-solve-multistep', 'Distributed to the first term only',
   'a(b + c) = ab + c: 2(x + 4) = 20 becomes 2x + 4 = 20.',
   'The multiplier outside reaches **every** term in the bracket. 2(x + 4) is 2x + 8, not 2x + 4.'),
  ('math-solve-multistep', 'Added the denominators when combining fraction terms',
   'Treats x/3 + x/4 as x/7, importing the add-the-bottoms error from fraction arithmetic.',
   'The denominator names the size of the piece and does not get added. Rewrite both terms over 12 first: x/3 + x/4 = 4x/12 + 3x/12 = 7x/12.')
) as m(slug, label, description, feedback_md) on kc.slug = m.slug
where not exists (
  select 1 from kc_misconception x where x.kc_id = kc.id and x.label = m.label
);

-- ── Items ────────────────────────────────────────────────────────────────────
-- answer_spec is revoked from clients at column level in 0012 and stripped again
-- by publicItem() before serialization. Two independent guards, because this is
-- the exact field whose leak made the old practice flow untrustworthy.
--
-- context_tag matters: the mastery gate requires passes across >= 2 surface
-- contexts, so a bank whose items all share one context can never confirm. The
-- two tags used here are real surface differences — a bare symbol string to
-- manipulate versus a situation the learner has to model first — and not two
-- names for the same page.
--
-- Every row: status 'draft', verified_by 'draft:llm-authored', verified_at null.

-- Solving items (numeric) — variables-both-sides and multi-step.
-- Each answer was derived and then back-substituted into the ORIGINAL equation;
-- misconceptionValues carry the wrong number a named error actually produces, so
-- a numeric item diagnoses as precisely as an MC. The ids are null exactly as in
-- seed_kc.sql: kc_misconception ids are generated, so linking them needs a lookup
-- this insert shape has no room for.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, 'numeric', 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  -- math-solve-variables-both-sides, bare-equation. x = 5: 25 - 3 = 22 = 10 + 12.
  -- The named wrong value 3 is the sign error: 12 - 3 instead of 12 + 3.
  ('math-solve-variables-both-sides', 'Solve for x:   5x - 3 = 2x + 12',
   '{"value":5,"misconceptionValues":[{"value":3,"misconceptionId":null}]}', 'bare-equation', 1160),
  -- x = -5: 4(-5) - 9 = -29, and 7(-5) + 6 = -29. Negative on purpose — collecting
  -- the variable on the side with the SMALLER coefficient is where sign errors live.
  ('math-solve-variables-both-sides', 'Solve for x:   4x - 9 = 7x + 6',
   '{"value":-5}', 'bare-equation', 1310),

  -- math-solve-variables-both-sides, word-problem. 30 + 20m = 70 + 15m -> 5m = 40,
  -- m = 8; both plans cost $190 at 8 months.
  ('math-solve-variables-both-sides',
   'Plan A costs $30 to join plus $20 each month. Plan B costs $70 to join plus $15 each month. After how many months do the two plans cost the same total?',
   '{"value":8}', 'word-problem', 1240),
  -- 20 - 2t = 32 - 4t -> 2t = 12, t = 6; both candles stand 8 cm tall at 6 hours.
  ('math-solve-variables-both-sides',
   'One candle is 20 cm tall and burns down 2 cm every hour. A second candle is 32 cm tall and burns down 4 cm every hour. After how many hours are the two candles the same height?',
   '{"value":6}', 'word-problem', 1300),
  -- 80 + 15w = 200 - 25w -> 40w = 120, w = 3; both hold $125 after 3 weeks. One
  -- side rises while the other falls, so the equation cannot be read off by pattern.
  ('math-solve-variables-both-sides',
   'One student has $80 saved and adds $15 each week. Another has $200 saved and spends $25 each week. After how many weeks do they have the same amount?',
   '{"value":3}', 'word-problem', 1340),

  -- math-solve-multistep, bare-equation. 6x - 2 = 4x + 12 -> 2x = 14, x = 7;
  -- both sides equal 40. Distribution on BOTH sides before collecting.
  ('math-solve-multistep', 'Solve for x:   2(3x - 1) = 4(x + 3)',
   '{"value":7}', 'bare-equation', 1330),
  -- x/3 + x/4 = 7 -> 7x/12 = 7, x = 12; 4 + 3 = 7. The named wrong value 49 is
  -- x/7 = 7, the add-the-denominators error carried over from fractions.
  ('math-solve-multistep', 'Solve for x:   x/3 + x/4 = 7',
   '{"value":12,"misconceptionValues":[{"value":49,"misconceptionId":null}]}', 'bare-equation', 1390),

  -- math-solve-multistep, word-problem. 2w + 2(w + 4) = 36 -> 4w + 8 = 36, w = 7;
  -- sides 7 and 11 give a perimeter of 36.
  ('math-solve-multistep',
   'A rectangle is 4 cm longer than it is wide. Its perimeter is 36 cm. How wide is the rectangle, in centimeters?',
   '{"value":7}', 'word-problem', 1290),
  -- 3(12 + 5s) = 141 -> 36 + 15s = 141, 15s = 105, s = 7; 3 x (12 + 35) = 141.
  ('math-solve-multistep',
   'A club charges a $12 registration fee plus $5 for each session attended. Three students each register, and each attends the same number of sessions. Altogether they pay $141. How many sessions did each student attend?',
   '{"value":7}', 'word-problem', 1350),
  -- x/2 - 3 = x/3 -> multiply through by 6: 3x - 18 = 2x, x = 18; 9 - 3 = 6 = 18/3.
  -- Phrased "3 is subtracted from half of a number" on purpose. The shorter
  -- "half of a number, decreased by 3" also reads as (x - 3)/2, which gives 9 —
  -- a second defensible answer, so the comma was carrying the whole item.
  ('math-solve-multistep',
   'When 3 is subtracted from half of a number, the result is one third of that number. What is the number?',
   '{"value":18}', 'word-problem', 1400)
) as i(slug, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Simplifying items (symbolic) — combining like terms, checked by expression
-- equivalence. verify/symbolic.js samples both expressions at 21 points in ONE
-- variable, so every answer here is written in x and nothing else; acceptedForms
-- are unnecessary for equivalence (the sampler already accepts 7x+8, 8+7x and
-- x*7+8) and are given only where the intended surface form is worth pinning.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, 'symbolic', 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  -- 5x + 2x = 7x; 4 - 9 = -5.
  ('math-combine-like-terms', 'Simplify:   5x + 4 + 2x - 9',
   '{"expr":"7*x - 5","acceptedForms":["7x-5"]}', 'bare-expression', 1120),
  -- 4(x + 2) + 3x = 4x + 8 + 3x = 7x + 8. Leans on the distribute prerequisite,
  -- which is why that edge exists.
  ('math-combine-like-terms', 'Simplify:   4(x + 2) + 3x',
   '{"expr":"7*x + 8"}', 'bare-expression', 1240),

  -- Perimeter = 2(x + 5) + 2(2x) = 2x + 10 + 4x = 6x + 10.
  ('math-combine-like-terms',
   'A rectangle has width x + 5 and length 2x. Write a simplified expression for its perimeter.',
   '{"expr":"6*x + 10","acceptedForms":["6x+10"]}', 'word-problem', 1180),
  -- 2x + (3x - 1) + (x + 7) = 6x + 6.
  ('math-combine-like-terms',
   'A triangle has sides of length 2x, 3x - 1 and x + 7. Write a simplified expression for its perimeter.',
   '{"expr":"6*x + 6"}', 'word-problem', 1230),
  -- 4x + 2(3) + 3x = 4x + 6 + 3x = 7x + 6. The constant arrives from a product,
  -- so the learner has to build the constant term before deciding it is unlike.
  ('math-combine-like-terms',
   'A shop sells notebooks for x dollars each and pens for 3 dollars each. You buy 4 notebooks and 2 pens, then go back and buy 3 more notebooks. Write a simplified expression for the total cost in dollars.',
   '{"expr":"7*x + 6"}', 'word-problem', 1290)
) as i(slug, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Multiple choice — used sparingly, and only where a distractor carries a NAMED
-- misconception, so a wrong pick diagnoses instead of merely failing.
--
-- Two invariants hold across these three rows:
--   1. distractor_misconceptions is index-aligned with choices, and the
--      diagnosing distractor is pinned at position 1 — same convention as
--      seed_kc.sql, so only the correct answer moves.
--   2. The correct index differs across the rows (2, 3, 0). Every seeded MC item
--      once sat at index 0; a learner who always taps the first option then
--      scores 100% on a CONFIRMING tier-v2 kind, fabricating mastery from no
--      knowledge at all. web/test/bankInvariants.test.mjs asserts against it.
-- The nulls are cast explicitly — bare NULL in jsonb_build_array leaves Postgres
-- unable to resolve the polymorphic argument type.
insert into kc_item (kc_id, kind, tier, body, choices, answer_spec, distractor_misconceptions, context_tag, difficulty_elo, status, verified_by, verified_at)
select
  kc.id, 'mc', 'v2', i.body, i.choices::jsonb, i.answer_spec::jsonb,
  jsonb_build_array(
    null::text,
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d1),
    null::text, null::text
  ),
  i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  -- 5x + 3 + 2x = 7x + 3. Distractors: "7x + 5" folds the 3 into the coefficient
  -- 2; "10x" is the named unlike-terms error; "5x + 5" combines 3 and 2 and drops
  -- the second x-term. Correct at index 2.
  ('math-combine-like-terms', 'Which expression is 5x + 3 + 2x in simplest form?',
   '["7x + 5","10x","7x + 3","5x + 5"]', '{"index":2}', 'Combined unlike terms', 'bare-expression', 1060),
  -- 7x + 2 = 3x + 18 -> 4x = 16, x = 4; both sides equal 30. Distractors: 8 is
  -- 16 divided by the constant 2 instead of the coefficient 4; 5 is the named
  -- sign error (4x = 18 + 2); 16 stops before the final division. Correct index 3.
  ('math-solve-variables-both-sides', 'Solve for x:   7x + 2 = 3x + 18',
   '["8","5","16","4"]', '{"index":3}', 'Moved a term without changing its sign', 'bare-equation', 1220),
  -- 2(x + 4) = 20 -> 2x + 8 = 20, x = 6. Distractors: 8 is the named
  -- distribute-the-first-term-only error (2x + 4 = 20); 12 subtracts 8 but never
  -- divides; 16 ignores the 2 entirely. Correct at index 0.
  ('math-solve-multistep', 'Solve for x:   2(x + 4) = 20',
   '["6","8","12","16"]', '{"index":0}', 'Distributed to the first term only', 'bare-equation', 1250)
) as i(slug, body, choices, answer_spec, d1, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- ── Self-check (counts, as authored) ─────────────────────────────────────────
--   math-combine-like-terms          6 items = bare-expression 3 + word-problem 3
--   math-solve-variables-both-sides  6 items = bare-equation   3 + word-problem 3
--   math-solve-multistep             6 items = bare-equation   3 + word-problem 3
-- 18 items, every context_tag non-null, MC correct indices {2, 3, 0}, no row
-- carries status 'verified'. Verify after loading:
--
--   select k.slug, i.context_tag, count(*)
--     from kc_item i join kc k on k.id = i.kc_id
--    where k.slug in ('math-combine-like-terms','math-solve-variables-both-sides','math-solve-multistep')
--    group by 1, 2 order by 1, 2;

-- ══ slice 2 ══════════════════════════════════════════════════════════════

-- algebra1_part2.sql — Algebra I chain, slice 2: rearranging, inequalities, percent change.
-- Run AFTER 0012, 0013 and seed_kc.sql (it depends on math-solve-two-step and
-- math-ratio-basics already existing). Idempotent (upserts on slug / natural keys).
--
-- THE THREE COMPONENTS
--   math-literal-equations   Rearranging formulas for a variable
--   math-solve-inequalities  Solving linear inequalities (incl. the sign-flip rule)
--   math-percent-change      Percent increase and decrease
--
-- WHY THIS SLICE
-- Two-step equations are where a learner stops being stuck and starts being able
-- to do algebra; these three are what that ability is immediately spent on.
--   * Literal equations are the bridge from solving for a NUMBER to solving for a
--     RELATIONSHIP. Every later thing in the chain — slope-intercept form, a
--     function rule, any science formula — assumes the learner can isolate a
--     variable that is surrounded by other letters rather than digits. A learner
--     who can solve 2x + 6 = 10 but not 2y - 5x = 8 will read y = mx + b as
--     notation to memorise instead of a rearrangement they could have done.
--   * Inequalities carry the single rule students most reliably get wrong:
--     multiplying or dividing by a negative REVERSES the direction. It is worth
--     its own component because it is not a harder version of equation-solving,
--     it is equation-solving plus one discontinuous rule — and a bank that only
--     ever asks for the boundary value k cannot see the error at all, since
--     x < -5 and x > -5 share the same k. So the flip is tested by items whose
--     ANSWER carries a direction, not by arithmetic alone.
--   * Percent change is the highest-frequency adult use of ratio reasoning, and
--     its central misconception (measuring the change against the NEW value
--     instead of the original) survives school untouched. It hangs off
--     math-ratio-basics rather than off the equations line: it is proportional
--     reasoning wearing a percent sign.
--
-- STATUS: DRAFT. Every kc_item row below is status 'draft',
-- verified_by 'draft:llm-authored', verified_at null. seed_kc.sql sets the bar —
-- "LLM-drafted items must pass solver agreement + second-model critique + human
-- sign-off before status becomes 'verified'" — and this file is only the first of
-- those three steps. check.js:46 selects the bank with .eq('status','verified'),
-- so nothing here can reach a student until a human promotes it. That is the
-- point, not a limitation.
-- The kc rows themselves ARE verified: the concepts are real and their place in
-- the graph is not in question. It is the ITEMS that are unreviewed.
--
-- A CONSTRAINT WORTH STATING, because it shapes every literal-equation item:
-- verify/symbolic.js grades a symbolic answer by compiling it with
-- lib/mathExpr.js and sampling it — and that compiler knows exactly ONE variable,
-- x. So "solve A = l*w for w" is not gradeable here; the answer A/l has two free
-- letters and the verifier would silently return null and mark a correct student
-- wrong. Every symbolic item below is therefore posed so the variable that
-- REMAINS is x, and the second context reaches the same skill through numeric
-- items that rearrange first and then evaluate. The alternative — a model in the
-- grading path — would drop these off tier v1, which is the whole point of them.

-- ── Knowledge components ─────────────────────────────────────────────────────
insert into kc (slug, subject, title, type, verifiability, status) values
  ('math-literal-equations',  'math', 'Rearranging formulas for a variable', 'skill', 'v1', 'verified'),
  ('math-solve-inequalities', 'math', 'Solving linear inequalities',         'skill', 'v1', 'verified'),
  ('math-percent-change',     'math', 'Percent increase and decrease',       'skill', 'v1', 'verified')
on conflict (slug) do update set
  title = excluded.title, type = excluded.type,
  verifiability = excluded.verifiability, status = excluded.status;

-- ── Prerequisite edges ───────────────────────────────────────────────────────
-- The policy engine will not teach a component until its prerequisites are
-- CONFIRMED. Both algebra components hang off two-step equations because the
-- rearranging move IS the two-step move — strip the added term, then divide —
-- performed on letters instead of digits; a learner whose two-step is shaky will
-- read the failure as "I cannot do formulas" rather than "I cannot yet undo in
-- order". Percent change hangs off ratios, not off equations, because that is
-- where its reasoning actually comes from.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'prerequisite' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-solve-two-step', 'math-literal-equations'),
  ('math-solve-two-step', 'math-solve-inequalities'),
  ('math-ratio-basics',   'math-percent-change')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- Confusable edges drive interleaving. Interleaving works by forcing the question
-- "which kind of problem is this?", so the graph has to encode what is actually
-- confusable with what.
--
-- literal-equations <-> solve-inequalities is the real one here, and it is
-- bidirectional: the two procedures are visually identical (isolate the variable)
-- and differ only in one rule that fires on one condition. A learner who has just
-- practised rearranging will apply the same moves to -4x > 20 and never think to
-- flip; a learner drilled on flipping will start flipping in equations, where
-- there is nothing to flip. Only mixing them makes "equation or inequality?" a
-- question the learner has to ask.
--
-- percent-change -> ratio-basics is one-directional: the percent surface is the
-- one that gets misread as a plain proportion (the wrong-base error IS a
-- correctly-executed proportion set up against the wrong quantity), while ratio
-- items are rarely mistaken for percent-change items.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'confusable' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-solve-inequalities', 'math-literal-equations'),
  ('math-literal-equations',  'math-solve-inequalities'),
  ('math-percent-change',     'math-ratio-basics')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- ── Misconceptions ───────────────────────────────────────────────────────────
-- Named, diagnosable error patterns, so feedback is ELABORATED ("you divided the
-- 8 but not the 5x") rather than bare "try again". The two flip misconceptions
-- are deliberately BOTH directions of the same confusion: never flipping, and
-- flipping whenever a minus sign is visible anywhere. Tutors add to this library
-- from real sessions.
insert into kc_misconception (kc_id, label, description, feedback_md, source)
select kc.id, m.label, m.description, m.feedback_md, 'authored'
from kc join (values
  ('math-literal-equations', 'Divided only one term by the coefficient',
   'From 2y - 5x = 8 writes y = 4 + 5x: divides the constant by 2 and leaves the x-term untouched.',
   'You divided by 2, but only on part of the side. Dividing has to hit **every** term you divide into — 8 and 5x both. Write the whole side over 2 first, then simplify each piece.'),
  ('math-literal-equations', 'Moved a term without changing its sign',
   'From 3x + y = 12 writes y = 12 + 3x: shifts the term across the equals sign and keeps its sign.',
   'A term does not simply move across the equals sign — you subtract it from **both** sides. 3x was being added, so it arrives on the other side as a subtraction.'),
  ('math-solve-inequalities', 'Did not flip the inequality sign',
   'Divides or multiplies both sides by a negative number and keeps the direction: -4x > 20 gives x > -5.',
   'Dividing by a negative reverses the direction. Test it on numbers you already trust: 2 < 6, but multiply both sides by -1 and -2 is **greater** than -6. Same move, same reversal.'),
  ('math-solve-inequalities', 'Flipped the sign for a negative constant',
   'Reverses the inequality whenever a minus sign appears anywhere: x - 3 < 5 becomes x > 8.',
   'The direction only reverses when you multiply or divide **both sides** by a negative. Subtracting 3 from both sides is not that move, so the direction stays as it was.'),
  ('math-percent-change', 'Percent change taken from the wrong base',
   'Divides the change by the new value rather than the original: 40 to 50 gives 10/50 = 20%.',
   'Percent change is always measured against where you **started**. The change is 10 and the starting value is 40, so it is 10/40 — the 50 is the finish line, not the ruler.'),
  ('math-percent-change', 'Successive percent changes cancel',
   'Treats +10% followed by -10% as returning to the original amount.',
   'The second percent is taken from a **different** number than the first. The 10% you added was 10% of 200; the 10% you then removed was 10% of 220. They are not the same amount, so they cannot cancel.')
) as m(slug, label, description, feedback_md) on kc.slug = m.slug
where not exists (
  select 1 from kc_misconception x where x.kc_id = kc.id and x.label = m.label
);

-- ── Items ────────────────────────────────────────────────────────────────────
-- answer_spec is revoked from clients at column level in 0012 and stripped again
-- by publicItem() before serialization.
--
-- Each component is banked at exactly 6 items over exactly 2 context tags, 3 per
-- tag — the ship floor from docs/archive/PRODUCTION_READINESS.md. The tags are real
-- surface differences, not two names for one surface: pfa.js keys the
-- >=2-contexts confirmation gate on them, so a bank with cosmetic tag diversity
-- manufactures confirmed mastery out of one repeated surface.

-- Numeric items. Every answer below was derived by hand and re-derived before
-- being written down; the derivation is stated in the comment above each group
-- so a reviewer can check the answer without re-doing the algebra.
--
-- Comments INSIDE a values body stay free of parentheses and apostrophes on
-- purpose. web/test/bankInvariants.test.mjs parses these tuples positionally and
-- does not strip SQL comments: to it, a bracketed aside looks like another tuple
-- and a lone apostrophe opens a string that swallows the rows after it. Prose
-- that needs either goes above the insert, where the parser never looks.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, i.kind, 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  -- math-literal-equations, context "formula-in-context". These are rearrange-
  -- THEN-evaluate: the learner must isolate the wanted variable before any number
  -- helps, but the answer is a single number the verifier can check exactly. This
  -- is how the concept gets a second surface without leaving tier v1, given the
  -- one-variable limit in mathExpr.js noted at the top of this file.
  --   P = 2l + 2w    ->  w = P/2 - l = 15 - 9 = 6
  --   A = bh/2       ->  h = 2A/b = 48/6 = 8
  --   F = 9C/5 + 32  ->  C = 5 x 36/9 = 20, since F - 32 = 36
  ('math-literal-equations', 'numeric',
   'The perimeter of a rectangle is P = 2l + 2w. Rearrange it to give w, then find w when P = 30 and l = 9.',
   '{"value":6,"misconceptionValues":[{"value":12,"misconceptionId":null}]}', 'formula-in-context', 1150),
  ('math-literal-equations', 'numeric',
   'The area of a triangle is A = (1/2)bh. Rearrange it to give h, then find h when A = 24 and b = 6.',
   '{"value":8}', 'formula-in-context', 1230),
  ('math-literal-equations', 'numeric',
   'Fahrenheit and Celsius are related by F = (9/5)C + 32. Rearrange it to give C, then find C when F = 68.',
   '{"value":20}', 'formula-in-context', 1330),

  -- math-solve-inequalities, context "bare-inequality". The direction is STATED
  -- in these two so the answer is a single number; what they test is the
  -- arithmetic of isolating, including dividing by a negative correctly. The
  -- direction itself is tested by the multiple-choice item further down, which is
  -- the only shape whose answer can carry a direction the verifier can compare.
  --   5x - 3 <= 17  ->  5x <= 20  ->  x <= 4,   so k = 4
  --   -2x + 1 > 9   ->  -2x > 8   ->  x < -4,   so k = -4, divided by -2 and flipped
  -- The named wrong answer 2.8 on the first is 14/5: subtracting the 3 instead of
  -- adding it back, which is the two-step undo error already in the library.
  ('math-solve-inequalities', 'numeric',
   'Solve for x:  5x - 3 <= 17.  The solution can be written x <= k. What is k?',
   '{"value":4,"misconceptionValues":[{"value":2.8,"misconceptionId":null}]}', 'bare-inequality', 1100),
  ('math-solve-inequalities', 'numeric',
   'Solve for x:  -2x + 1 > 9.  The solution can be written x < k. What is k?',
   '{"value":-4}', 'bare-inequality', 1250),

  -- math-solve-inequalities, context "word-problem". Each of these is an
  -- inequality the learner has to build before solving, and each ends in a
  -- greatest or smallest WHOLE number so there is exactly one defensible answer
  -- rather than an interval a text box cannot hold.
  --   12 + 4m <= 60      ->  4m <= 48    ->  m <= 12,  greatest whole number 12
  --   900 + 25b <= 1500  ->  25b <= 600  ->  b <= 24,  greatest whole number 24
  --   120 - 8m < 50      ->  -8m < -70   ->  m > 8.75, smallest whole number 9
  -- Checked on the third: at 9 minutes 120 - 72 = 48, which is under 50; at 8
  -- minutes 120 - 64 = 56, which is not. The boundary 8.75 is deliberately not a
  -- whole number, so there is no tie for a learner to argue about.
  ('math-solve-inequalities', 'numeric',
   'A club charges a 12 dollar joining fee plus 4 dollars per month. You can spend at most 60 dollars in total. What is the greatest whole number of months you can pay for?',
   '{"value":12}', 'word-problem', 1180),
  ('math-solve-inequalities', 'numeric',
   'An empty delivery van weighs 900 kg. Loaded, it may weigh at most 1500 kg. Each box weighs 25 kg. What is the greatest number of boxes it can carry?',
   '{"value":24}', 'word-problem', 1240),
  ('math-solve-inequalities', 'numeric',
   'A tank contains 120 liters of water and drains at 8 liters per minute. What is the smallest whole number of minutes after which fewer than 50 liters remain?',
   '{"value":9}', 'word-problem', 1360),

  -- math-percent-change, context "bare-computation".
  --   60 x 1.25 = 75
  --   250 x 0.88 = 220     -- the decrease alone is 30, named as a wrong answer
  --   50 - 40 = 10, and 10/40 = 0.25 = 25%  -- the wrong base gives 10/50 = 20,
  --                                            also named
  -- The two percent-valued answers say "no percent sign" on purpose: parseNumber
  -- in verify/symbolic.js reads a trailing % as a x0.01 multiplier, so "25%"
  -- arrives as 0.25 and a correct learner is marked wrong. Say what the box wants
  -- rather than let the parser decide it.
  ('math-percent-change', 'numeric',
   'Increase 60 by 25%. What is the result?',
   '{"value":75}', 'bare-computation', 1090),
  ('math-percent-change', 'numeric',
   'Decrease 250 by 12%. What is the result?',
   '{"value":220,"misconceptionValues":[{"value":30,"misconceptionId":null}]}', 'bare-computation', 1170),
  ('math-percent-change', 'numeric',
   'A quantity changes from 40 to 50. What is the percent increase? Answer with a number only, no percent sign.',
   '{"value":25,"misconceptionValues":[{"value":20,"misconceptionId":null}]}', 'bare-computation', 1250),

  -- math-percent-change, context "word-problem".
  --   80 x 0.85 = 68
  --   4860 - 4500 = 360, and 360/4500 = 0.08 = 8%
  ('math-percent-change', 'numeric',
   'A jacket costs 80 dollars. In a sale the price is reduced by 15%. What is the sale price, in dollars?',
   '{"value":68}', 'word-problem', 1210),
  ('math-percent-change', 'numeric',
   'The population of a town grows from 4500 to 4860. What is the percent increase? Answer with a number only, no percent sign.',
   '{"value":8}', 'word-problem', 1300)
) as i(slug, kind, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Symbolic items — literal equations, checked by expression equivalence.
-- Posed so the remaining variable is x (see the constraint note at the top): the
-- learner isolates y, and what is left is an expression in x that
-- expressionsEquivalent() can sample. The body says to enter the right-hand side
-- only, because compileExpr() rejects "=" outright — an answer typed as
-- "y = 12 - 3x" is correct mathematics that would be recorded as unassisted
-- failure, which is the worst outcome this bank can produce.
--   3x + y = 12   ->  y = 12 - 3x
--   2y - 5x = 8   ->  2y = 8 + 5x  ->  y = (8 + 5x)/2 = 4 + 2.5x
--   4x - 2y = 10  ->  4x - 10 = 2y ->  y = 2x - 5
--     (the third is the one that catches sign errors: dividing -2y = 10 - 4x by
--      -2 rewards handling both signs, and the accepted form keeps the
--      unsimplified but correct answer from being marked wrong.)
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, 'symbolic', 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  ('math-literal-equations',
   'Solve for y:  3x + y = 12.  Enter the expression for y only, without "y =".',
   '{"expr":"12 - 3*x","acceptedForms":["-3x + 12"]}', 'bare-equation', 1080),
  ('math-literal-equations',
   'Solve for y:  2y - 5x = 8.  Enter the expression for y only, without "y =".',
   '{"expr":"(8 + 5*x)/2","acceptedForms":["4 + 2.5*x"]}', 'bare-equation', 1190),
  ('math-literal-equations',
   'Solve for y:  4x - 2y = 10.  Enter the expression for y only, without "y =".',
   '{"expr":"2*x - 5","acceptedForms":["(4*x - 10)/2"]}', 'bare-equation', 1300)
) as i(slug, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Multiple choice — used twice in this file and only twice, for the two questions
-- whose ANSWER cannot be a number. An inequality solution carries a direction
-- (x < -5 and x > -5 share the boundary -5, so no numeric item can tell the flip
-- error from a correct answer), and the up-then-down price question is worth
-- asking precisely because the wrong answer is the intuitive one. Distractors are
-- index-aligned with distractor_misconceptions, so a wrong pick names the actual
-- error instead of just failing.
--
-- The correct answers sit at indices 2 and 3 — never all in one slot. Every
-- seeded MC item in seed_kc.sql once had {"index":0}, which let a learner score
-- 100% on the whole MC bank by always tapping the first option; MC is a
-- confirming tier-v2 kind, so that fabricates confirmed mastery from nothing.
--
--   -4x > 20  ->  divide by -4 and reverse  ->  x < -5
--     (choice 1, "x > -5", is that division done without reversing)
--   200 x 1.1 = 220, then 220 x 0.9 = 198
--     (choice 0 is the markdown alone, choice 1 is the cancellation belief,
--      choice 2 is stopping after the markup)
insert into kc_item (kc_id, kind, tier, body, choices, answer_spec, distractor_misconceptions, context_tag, difficulty_elo, status, verified_by, verified_at)
select
  kc.id, 'mc', 'v2', i.body, i.choices::jsonb, i.answer_spec::jsonb,
  -- Index-aligned with `choices`: position 1 is the distractor that carries a
  -- named misconception, so a wrong pick diagnoses instead of just failing.
  -- The nulls are cast explicitly — bare NULL in jsonb_build_array leaves
  -- Postgres unable to resolve the polymorphic argument type.
  jsonb_build_array(
    null::text,
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d1),
    null::text, null::text
  ),
  i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  ('math-solve-inequalities', 'Solve for x:  -4x > 20.  Which describes every solution?',
   '["x > 5","x > -5","x < -5","x < 5"]', '{"index":2}',
   'Did not flip the inequality sign', 'bare-inequality', 1310),
  ('math-percent-change',
   'A coat priced at 200 dollars is marked up 10%, and the new price is later marked down 10%. What is the final price?',
   '["180 dollars","200 dollars","220 dollars","198 dollars"]', '{"index":3}',
   'Successive percent changes cancel', 'word-problem', 1390)
) as i(slug, body, choices, answer_spec, d1, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- ── Bank shape, stated so the next reader does not have to count ─────────────
--   math-literal-equations   6 items — bare-equation 3 (symbolic),
--                                      formula-in-context 3 (numeric)
--   math-solve-inequalities  6 items — bare-inequality 3 (2 numeric + 1 mc),
--                                      word-problem 3 (numeric)
--   math-percent-change      6 items — bare-computation 3 (numeric),
--                                      word-problem 3 (2 numeric + 1 mc)
-- 18 items: 13 numeric, 3 symbolic, 2 mc. All tier v1 except the two mc rows
-- (v2). All status 'draft'. No row in this file is verified, and none should be
-- promoted without a second solver agreeing item by item.

-- ══ slice 3 ══════════════════════════════════════════════════════════════

-- algebra1_part3.sql — the linear-function slice of the Algebra I chain.
-- Run AFTER 0012, 0013 and seed_kc.sql. Idempotent (upserts on slug / natural keys).
--
-- WHAT THIS ADDS
--   math-slope-two-points      Slope from two points          (skill)
--   math-slope-intercept       Slope-intercept form           (principle)
--   math-write-linear-equation Writing a linear equation      (skill)
--
-- WHY THIS SLICE
-- seed_kc.sql stops at two-step equations and the distributive property: the
-- learner can solve for a number but cannot yet describe a RELATIONSHIP. These
-- three components are the hinge. Slope is where arithmetic becomes rate of
-- change; slope-intercept is the first form a student reads as meaning rather
-- than as a procedure ("what does the 30 stand for?"); writing the equation is
-- the first time the student produces the model instead of consuming it. Nearly
-- every later Algebra I topic — systems, inequalities in two variables,
-- functions, regression lines — assumes all three, so a gap here is a gap in
-- everything downstream. Every answer below is mechanically checkable, so the
-- whole slice is tier v1/v2 and needs no model in the grading path.
--
-- STATUS: THESE ITEMS ARE DRAFTS.
-- seed_kc.sql: "LLM-drafted items must pass solver agreement + second-model
-- critique + human sign-off before status becomes 'verified'." This file is the
-- drafting step and nothing more. Every kc_item row is status 'draft',
-- verified_by 'draft:llm-authored', verified_at null. check.js filters to
-- status='verified', so nothing here can reach a student until a human promotes
-- it — which is the point. A confidently wrong item teaches a wrong thing and
-- destroys trust faster than a missing feature.
--
-- The kc ROWS are 'verified': the concepts themselves are real and their place
-- in the graph is not in doubt. It is the ITEMS that await sign-off.
--
-- Every answer was re-derived by hand, and every symbolic answer_spec was run
-- through web/lib/engine/verify/symbolic.js (expressionsEquivalent) against the
-- forms a student would actually type — "3x+2", "0.5x-3", "(1/2)x - 3",
-- "-20x+500" — before it was written down here.

-- ── Knowledge components ─────────────────────────────────────────────────────
insert into kc (slug, subject, title, type, verifiability, status) values
  ('math-slope-two-points',      'math', 'Slope from two points',                    'skill',     'v1', 'verified'),
  ('math-slope-intercept',       'math', 'Slope-intercept form',                     'principle', 'v1', 'verified'),
  ('math-write-linear-equation', 'math', 'Writing a linear equation from information','skill',     'v1', 'verified')
on conflict (slug) do update set
  title = excluded.title, type = excluded.type,
  verifiability = excluded.verifiability, status = excluded.status;

-- ── Prerequisite edges ───────────────────────────────────────────────────────
-- policy.js only makes a component eligible once every prerequisite is
-- CONFIRMED, so these edges are what stop a learner being handed "write the
-- equation of the line" while solving for b in 7 = 2(3) + b is still shaky.
-- The chain is strictly one-directional: subtract-and-divide (one-step) ->
-- compute a rate (slope) -> read that rate inside a form (slope-intercept) ->
-- produce the form from scratch (write the equation).
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'prerequisite' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-solve-one-step',   'math-slope-two-points'),
  ('math-slope-two-points', 'math-slope-intercept'),
  ('math-slope-intercept',  'math-write-linear-equation')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- Confusable edges drive interleaving, which works by forcing the question
-- "which kind of problem is this?" — so the graph has to encode what is actually
-- confusable with what.
--
-- Slope-from-two-points and slope-intercept-form are the real collision here.
-- Both hand the student a pile of numbers and ask for "the slope", and the two
-- procedures are incompatible: from (1, 2) and (3, 8) you subtract and divide;
-- from y = 3x - 4 you read a coefficient and touch nothing. Students who learn
-- them back to back subtract the numbers in the equation, or read a coordinate
-- as the y-intercept. Interleaved practice is the fix, so both directions.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'confusable' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-slope-two-points', 'math-slope-intercept'),
  ('math-slope-intercept',  'math-slope-two-points')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- ── Misconceptions ───────────────────────────────────────────────────────────
-- Named, diagnosable error patterns, so feedback is ELABORATED ("you divided the
-- run by the rise") rather than bare "try again". The multiple-choice items
-- below are index-aligned to these; without them an MC distractor is just a
-- wrong answer, which is why MC is used here only twice.
insert into kc_misconception (kc_id, label, description, feedback_md, source)
select kc.id, m.label, m.description, m.feedback_md, 'authored'
from kc join (values
  ('math-slope-two-points', 'Run over rise',
   'Inverts the ratio: computes (x2 - x1) / (y2 - y1) instead of the change in y over the change in x.',
   'You divided the across by the up. Slope answers "how much does y change for each 1 that x changes", so the change in **y** goes on top.'),
  ('math-slope-two-points', 'Inconsistent subtraction order',
   'Subtracts the y-values in one order and the x-values in the other, flipping the sign of the slope.',
   'Check which point you started from. If you took y from the second point first, you have to take x from the second point first too — mixing the order flips the sign.'),
  ('math-slope-intercept', 'Swapped slope and intercept',
   'Reads b as the rate of change and m as the starting value in y = mx + b.',
   'The number stuck to the x is the **rate** — it is what gets multiplied by how far you have gone. The lonely number is the **starting value**, what you have when x is still 0.'),
  ('math-slope-intercept', 'Read the coefficient without rearranging',
   'Takes the coefficient of x straight out of a standard-form equation such as 3x + y = 7 and calls it the slope.',
   'You can only read the slope off the equation once y is alone on one side. Get to y = mx + b first — the sign usually changes on the way.'),
  ('math-write-linear-equation', 'Used the given y-value as the intercept',
   'Given slope 2 through (3, 7), writes y = 2x + 7 — substitutes the point y-value for b without solving.',
   'b is the value of y when x is **0**, and your point is not at x = 0. Put the point into y = mx + b and solve for b.')
) as m(slug, label, description, feedback_md) on kc.slug = m.slug
where not exists (
  select 1 from kc_misconception x where x.kc_id = kc.id and x.label = m.label
);

-- ── Items ────────────────────────────────────────────────────────────────────
-- Every row below: status 'draft', verified_by 'draft:llm-authored',
-- verified_at null. Drafts are invisible to check.js, which selects on
-- status='verified'. Promotion is a human act, performed after solver agreement
-- and a second-model critique — not something this file may do.
--
-- Shape of the bank, per docs/archive/PRODUCTION_READINESS.md ("the three floors"):
-- 6 items per component, >= 2 distinct context_tag values, >= 3 items per tag.
-- Each of the three ships exactly 6 as 3 + 3. The tags are genuine surface
-- differences (coordinate pairs vs a table of values; a bare equation vs a
-- situation in words), never two names for one surface — pfa.js keys the
-- >=2-contexts confirmation gate on context_tag, so fake diversity would
-- manufacture fake mastery, which is worse than no bank at all.
--
-- answer_spec is revoked from clients at column level in 0012 and stripped again
-- by publicItem() before serialization.

-- Numeric — slope values and the parameters of y = mx + b. Graded by
-- parseNumber + numbersEqual, so "3/2", "1.5" and "6/4" all pass; the fraction
-- in a spec is for the reader, not the grader.
-- misconceptionValues carry misconceptionId null for the same reason seed_kc.sql
-- does: the uuid does not exist until the insert above has run. Wiring them is a
-- follow-up update, and a null id still costs the learner nothing — the answer
-- is wrong either way, it simply fails to say why yet.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, i.kind, 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null::timestamptz
from kc join (values
  -- math-slope-two-points, context 1 of 2: bare coordinate pairs.
  ('math-slope-two-points', 'numeric',
   'Find the slope of the line through the points (1, 2) and (3, 8).',
   '{"value":3,"misconceptionValues":[{"value":"1/3","misconceptionId":null}]}', 'bare-points', 1080),
  ('math-slope-two-points', 'numeric',
   'Find the slope of the line through the points (-2, 5) and (4, -7).',
   '{"value":-2,"misconceptionValues":[{"value":2,"misconceptionId":null}]}', 'bare-points', 1180),
  ('math-slope-two-points', 'numeric',
   'Find the slope of the line through the points (2, 3) and (6, 9). Give your answer as a fraction.',
   '{"value":"3/2","misconceptionValues":[{"value":"2/3","misconceptionId":null}]}', 'bare-points', 1240),

  -- math-slope-two-points, context 2 of 2: the same computation read out of a
  -- table. A learner who has only ever seen bracketed pairs often cannot start
  -- here, which is exactly what the >=2-contexts gate is for.
  ('math-slope-two-points', 'numeric',
   'A line passes through every point in this table.   x: 0, 1, 2, 3   y: 5, 8, 11, 14.   What is the slope of the line?',
   '{"value":3}', 'table', 1150),
  ('math-slope-two-points', 'numeric',
   'A line passes through every point in this table.   x: 2, 5, 8   y: 10, 4, -2.   What is the slope of the line?',
   '{"value":-2}', 'table', 1220),
  ('math-slope-two-points', 'numeric',
   'A line passes through every point in this table.   x: 1, 5, 9   y: 3, 5, 7.   What is the slope of the line? Give your answer as a fraction.',
   '{"value":"1/2"}', 'table', 1300),

  -- math-slope-intercept, context 1 of 2: bare equations. The second item is
  -- standard form, where the coefficient of x is NOT the slope until y is alone.
  ('math-slope-intercept', 'numeric',
   'For the line y = 3x - 4, what is the slope?',
   '{"value":3}', 'bare-equation', 1060),
  ('math-slope-intercept', 'numeric',
   'The equation 3x + y = 7 is rewritten in the form y = mx + b. What is the value of m?',
   '{"value":-3,"misconceptionValues":[{"value":3,"misconceptionId":null}]}', 'bare-equation', 1280),

  -- math-slope-intercept, context 2 of 2: the same form carrying meaning.
  ('math-slope-intercept', 'numeric',
   'A phone plan costs a one-time setup fee of $25 plus $12 each month. The total cost after x months is written as y = mx + b. What is the value of b?',
   '{"value":25,"misconceptionValues":[{"value":12,"misconceptionId":null}]}', 'word-problem', 1140)
) as i(slug, kind, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Symbolic — checked by expression equivalence (sampled agreement in
-- expressionsEquivalent), so "3x+2", "3*x + 2" and "2+3x" all pass.
--
-- IMPORTANT AUTHORING CONSTRAINT, learned from the grader rather than guessed:
-- compileExpr accepts exactly one variable, x, and no '=' sign. An answer typed
-- as "y = 3x + 2" fails to parse and is scored as an unassisted MISS — the worst
-- failure mode there is, because the learner got it right and the ledger records
-- otherwise. So every body below asks explicitly for the right-hand side only,
-- and says so in the words a 13-year-old will read.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, 'symbolic', 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null::timestamptz
from kc join (values
  -- math-slope-intercept: the third bare-equation item — build the form rather
  -- than read it. Slope 1/2, y-intercept -3.
  ('math-slope-intercept',
   'A line has slope 1/2 and crosses the y-axis at -3. Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not type the y = part.',
   '{"expr":"x/2 - 3","acceptedForms":["0.5*x - 3"]}', 'bare-equation', 1200),

  -- math-write-linear-equation, context 1 of 2: slope and points given outright.
  ('math-write-linear-equation',
   'A line has slope 4 and passes through the point (0, -1). Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not type the y = part.',
   '{"expr":"4*x - 1","acceptedForms":["4x-1"]}', 'bare-points', 1120),
  -- misconceptionExprs is the symbolic twin of misconceptionValues. symbolic.js
  -- tries it only after every accepted form has already missed, so a named wrong
  -- expression can never mask a correct answer. Without it the misconception
  -- 'Used the given y-value as the intercept' inserted above is dead weight: it
  -- is the only named misconception on this component, and these two items are
  -- exactly the ones that provoke it, so with no expression to match on the
  -- learner who makes precisely that error gets a bare "wrong" — the failure
  -- mode the misconception library exists to prevent.
  -- NB: no parentheses in comments inside a `values` body — bankInvariants.test
  -- .mjs splits tuples on parens without stripping comments first.
  ('math-write-linear-equation',
   'A line has slope 2 and passes through the point (3, 7). Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not type the y = part.',
   '{"expr":"2*x + 1","acceptedForms":["2x+1"],"misconceptionExprs":[{"expr":"2*x + 7","misconceptionId":null}]}', 'bare-points', 1250),
  ('math-write-linear-equation',
   'A line passes through the points (1, 5) and (4, 14). Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not type the y = part.',
   '{"expr":"3*x + 2","acceptedForms":["3x+2"],"misconceptionExprs":[{"expr":"3*x + 5","misconceptionId":null},{"expr":"3*x + 14","misconceptionId":null}]}', 'bare-points', 1340),

  -- math-write-linear-equation, context 2 of 2: the situation is in words and
  -- the student has to decide which number is the rate and which is the start.
  -- The last one gives neither directly — two data points inside a sentence.
  ('math-write-linear-equation',
   'A pool holds 500 liters and is draining at 20 liters per hour. Write an expression for the number of liters left after x hours. Type the expression only, in terms of x.',
   '{"expr":"500 - 20*x","acceptedForms":["-20x + 500"]}', 'word-problem', 1180),
  ('math-write-linear-equation',
   'An after-school club charges a $40 membership fee plus $6 for each class you attend. Write an expression for the total cost in dollars after x classes. Type the expression only, in terms of x.',
   '{"expr":"6*x + 40","acceptedForms":["6x+40"]}', 'word-problem', 1220),
  ('math-write-linear-equation',
   'A print shop charges the same amount for each shirt plus one fixed setup fee. 5 shirts cost $65 and 12 shirts cost $135. Write an expression for the cost in dollars of x shirts. Type the expression only, in terms of x.',
   '{"expr":"10*x + 15","acceptedForms":["10x+15"]}', 'word-problem', 1400)
) as i(slug, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Multiple choice — used twice in this whole file, and only where the wrong
-- options are the misconception itself. "What does the 30 mean?" has no typed
-- answer a machine can grade, and the swap of slope for intercept is the single
-- most common error on this component, so MC earns its place here.
--
-- distractor_misconceptions is index-aligned with choices: position 1 carries
-- the named misconception, so a wrong pick DIAGNOSES instead of merely failing.
-- The nulls are cast explicitly — bare NULL in jsonb_build_array leaves Postgres
-- unable to resolve the polymorphic argument type.
--
-- The correct answers sit at index 2 and index 3, never at 0. Every seeded MC
-- item in seed_kc.sql originally had {"index":0}, which meant always tapping the
-- first option scored 100% on a CONFIRMING tier-v2 kind — mastery fabricated out
-- of nothing. web/test/bankInvariants.test.mjs now asserts the indices vary.
insert into kc_item (kc_id, kind, tier, body, choices, answer_spec, distractor_misconceptions, context_tag, difficulty_elo, status, verified_by, verified_at)
select
  kc.id, 'mc', 'v2', i.body, i.choices::jsonb, i.answer_spec::jsonb,
  jsonb_build_array(
    null::text,
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d1),
    null::text, null::text
  ),
  i.context_tag, i.elo, 'draft', 'draft:llm-authored', null::timestamptz
from kc join (values
  ('math-slope-intercept',
   'A gym charges a one-time joining fee of $30 plus $15 for each month you stay. The total cost after x months is y = 15x + 30. What does the 30 tell you?',
   '["The number of months in the plan","The amount the total goes up each month","The cost before any months have gone by","The total cost of the whole plan"]',
   '{"index":2}', 'Swapped slope and intercept', 'word-problem', 1160),
  ('math-slope-intercept',
   'A candle burns at a steady rate. Its height in centimetres after x hours is y = 20 - 2.5x. What does the -2.5 tell you?',
   '["The candle is 2.5 cm tall when it goes out","The height of the candle before it was lit","The candle burns for 2.5 hours","The height drops by 2.5 cm every hour"]',
   '{"index":3}', 'Swapped slope and intercept', 'word-problem', 1300)
) as i(slug, body, choices, answer_spec, d1, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- ── Aliases ──────────────────────────────────────────────────────────────────
-- What a real syllabus actually calls these, so kcMap resolves common topic
-- strings with zero model calls. Every entry here is one adjudication never paid
-- for, which is the whole economic argument for a shared library.
insert into kc_alias (kc_id, alias_norm, alias_text, subject, confidence, source)
select kc.id, a.norm, a.text, 'math', 1, 'seed'
from kc join (values
  ('math-slope-two-points',      'slope',                        'Slope'),
  ('math-slope-two-points',      'finding slope',                'Finding slope'),
  ('math-slope-two-points',      'slope from two points',        'Slope from two points'),
  ('math-slope-two-points',      'rate of change',               'Rate of change'),
  ('math-slope-intercept',       'slope intercept form',         'Slope-intercept form'),
  ('math-slope-intercept',       'y mx b',                       'y = mx + b'),
  -- No 'graphing linear equations' alias: nothing in this bank asks a student to
  -- read or draw a graph, and routing a graphing topic here would promise
  -- evidence the items cannot produce.
  ('math-write-linear-equation', 'writing linear equations',     'Writing linear equations'),
  ('math-write-linear-equation', 'equation of a line',           'Equation of a line'),
  ('math-write-linear-equation', 'point slope form',             'Point-slope form')
) as a(slug, norm, text) on kc.slug = a.slug
on conflict (alias_norm, subject) do nothing;

-- ══ slice 4 ══════════════════════════════════════════════════════════════

-- algebra1_part4.sql — Algebra I chain, slice 4: systems of equations + exponent rules.
-- Run AFTER 0012, 0013, seed_kc.sql and algebra1_part1.sql (it depends on
-- math-multiply-fractions from the seed and math-solve-variables-both-sides from
-- slice 1 already existing). Idempotent (upserts on slug / natural keys).
--
-- THE THREE COMPONENTS
--   math-systems-substitution  Systems of equations by substitution   (skill)
--   math-systems-elimination   Systems of equations by elimination    (skill)
--   math-exponent-rules        Exponent rules: product, quotient, power (principle)
--
-- WHY THIS SLICE
-- Slice 1 ended with a learner who can solve ONE equation in ONE unknown. Systems
-- are where that stops being enough, and they are the first place in the course
-- where the learner must choose a METHOD rather than execute one. That choice is
-- the whole difficulty: substitution and elimination solve the same problems, and
-- a student who only ever practises them in separate blocked chapters can perform
-- both and select neither. They are banked here as two components, joined by a
-- prerequisite edge and a confusable edge, precisely so the scheduler can
-- interleave them and make "which method fits this system?" a question the learner
-- actually has to answer.
--
-- Exponent rules sit on the other branch. They are typed 'principle', not 'skill',
-- deliberately: the object being learned is not a procedure but three statements
-- about what multiplying, dividing and nesting powers DO to the exponents, and
-- every classic error here is a rule applied to the wrong operation
-- x^3 * x^4 read as x^12, or x^4 cubed read as x^7. A learner who has memorised
-- the moves without the principle produces exactly those answers, which is why the
-- items below are built to distinguish them by name.
--
-- Exponent rules hang off math-multiply-fractions rather than off the equations
-- line. That is not an ordering convenience: the quotient rule IS fraction
-- cancellation with letters, x^9 / x^4 reduces the same way 18/12 does, and a
-- learner who cannot see 4 factors of x cancel against 9 will memorise
-- "subtract the exponents" as an unmotivated instruction and then subtract them in
-- the wrong order the first time the smaller power is on top.
--
-- STATUS: DRAFT. seed_kc.sql sets the standard — "a confidently wrong item teaches
-- a wrong thing and destroys trust faster than a missing feature", and
-- "LLM-drafted items must pass solver agreement + second-model critique + human
-- sign-off before status becomes 'verified'". This file is the first of those
-- three steps and nothing more. Every kc_item row below is status 'draft' /
-- verified_by 'draft:llm-authored' / verified_at null; check.js selects the bank
-- with .eq('status','verified'), so no item here can reach a student until a human
-- promotes it. That is the design, not a shortfall.
-- The kc rows themselves ARE 'verified': the three concepts are real and their
-- place in the graph is not in question. It is the ITEMS that are unreviewed.
--
-- FLOORS MET (docs/archive/PRODUCTION_READINESS.md, "the three floors"): 6 items per
-- concept, 2 distinct context_tag values, 3 items per tag. Below 6, elo.js:73
-- penalises a seen item by 800 and the second check degenerates into a memory test
-- of the first; below 2 contexts, the pfa.js confirmation gate can never open.
--
-- TWO AUTHORING CONSTRAINTS THAT SHAPED EVERY ITEM HERE, both from
-- web/lib/engine/verify/symbolic.js:
--   1. A symbolic answer is compiled by lib/mathExpr.js, which knows exactly ONE
--      variable, x. The solution of a system is a PAIR, so no system item can be
--      symbolic — the verifier has no way to hold a y. Every systems item is
--      therefore numeric and names which single value it wants, or is multiple
--      choice where the answer is a method rather than a number. Asking for
--      "x = 3, y = 2" in a numeric box would mark a fully correct learner wrong,
--      which is the worst outcome a bank can produce: unassisted failure recorded
--      against work that was right.
--   2. expressionsEquivalent samples both expressions on the same 21 points and
--      rejects a candidate whose DOMAIN differs, and one of those points is x = 0.
--      So x^9 / x^4 is not interchangeable with x^5 as far as the grader is
--      concerned — the quotient form is undefined at 0. The exponent items say
--      "write your answer as a single power of x" for that reason, and no
--      acceptedForms entry below carries a division that the answer itself does
--      not have.

-- ── Knowledge components ─────────────────────────────────────────────────────
insert into kc (slug, subject, title, type, verifiability, status) values
  ('math-systems-substitution', 'math', 'Systems of equations by substitution',   'skill',     'v1', 'verified'),
  ('math-systems-elimination',  'math', 'Systems of equations by elimination',    'skill',     'v1', 'verified'),
  ('math-exponent-rules',       'math', 'Exponent rules: product, quotient, power', 'principle', 'v1', 'verified')
on conflict (slug) do update set
  title = excluded.title, type = excluded.type,
  verifiability = excluded.verifiability, status = excluded.status;

-- ── Prerequisite edges ───────────────────────────────────────────────────────
-- policy.js only makes a component eligible once every prerequisite is CONFIRMED,
-- so these edges are what stop a learner being handed a system while the single
-- equation it collapses into is still shaky. The chain reads:
--   variables-both-sides ──> systems-substitution ──> systems-elimination
--   multiply-fractions   ──> exponent-rules
--
-- substitution depends on variables-both-sides, not merely on two-step equations:
-- every substitution ends by solving something like 3x + 2x + 1 = 11, where the
-- x-terms arrive separated and have to be collected before anything can be undone.
-- A learner who fails there fails for a reason the item cannot distinguish from
-- "does not understand substitution", and the feedback would name the wrong thing.
--
-- elimination depends on substitution rather than sitting beside it. Both methods
-- need the same ending, but elimination has one extra idea — that you may add two
-- equations to each other at all — and it is far more legible once the learner has
-- already seen a two-variable system collapse to one variable by another route.
-- Ordering them also gives the confusable edge below something to interleave.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'prerequisite' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-solve-variables-both-sides', 'math-systems-substitution'),
  ('math-systems-substitution',       'math-systems-elimination'),
  ('math-multiply-fractions',         'math-exponent-rules')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- Confusable edges drive interleaving. Interleaving works by forcing the question
-- "which kind of problem is this?", so the graph has to encode what is actually
-- confusable with what — ordering alone is not enough.
--
-- substitution <-> elimination is the strongest confusable pair in this whole
-- chain, and it is bidirectional because the confusion runs both ways and is
-- genuinely symmetric. The two methods accept the SAME input and produce the SAME
-- output; they differ only in which move is cheap for the system in front of you.
-- A learner drilled on substitution will isolate a variable out of 3x + 4y = 10
-- and drag a fraction through the rest of the problem, when adding the second
-- equation would have deleted the y outright. A learner drilled on elimination
-- will hunt for matching coefficients in a system where one equation already reads
-- y = 2x + 1 and nothing needs eliminating at all. Neither error is arithmetic —
-- both are method selection, and method selection is invisible until the two are
-- mixed in the same session.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'confusable' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-systems-substitution', 'math-systems-elimination'),
  ('math-systems-elimination',  'math-systems-substitution')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- ── Misconceptions ───────────────────────────────────────────────────────────
-- Named, diagnosable error patterns, so feedback is ELABORATED ("you multiplied
-- only the term you wanted to cancel") rather than bare "try again". The exponent
-- entries are deliberately the three swaps of one rule for another: multiplying
-- exponents where they should be added, adding where they should be multiplied,
-- and leaving the coefficient behind when the whole product is raised. Naming them
-- separately is what lets a wrong answer say which rule fired, instead of just
-- "wrong". Tutors add to this library from real sessions.
-- The library is deliberately wider than the current bank can detect: "Substituted
-- back into the same equation" has no item below that produces a single wrong
-- NUMBER for it — the error ends in a true statement like 11 = 11, not in a value —
-- so it exists for the tutor and feedback paths to name, not for the grader.
insert into kc_misconception (kc_id, label, description, feedback_md, source)
select kc.id, m.label, m.description, m.feedback_md, 'authored'
from kc join (values
  ('math-systems-substitution', 'Dropped part of the substituted expression',
   'With y = 2x + 1, replaces y in 3x + y = 11 by 2x alone, losing the constant term.',
   'The whole expression takes the place of the letter, not just its first piece. y stands for **2x + 1**, so 3x + y becomes 3x + 2x + 1 — brackets around what you substitute will keep the rest of it attached.'),
  ('math-systems-substitution', 'Stopped after the first variable',
   'Solves for one variable and reports that number, without substituting back to find the other.',
   'You found one of the two numbers. A system has a **pair** of answers, and the question asked for the other one — put the value you found back into either original equation and finish the job.'),
  ('math-systems-substitution', 'Substituted back into the same equation',
   'Puts the isolated expression into the equation it came from, gets a statement true for every value, and reads it as no solution or infinite solutions.',
   'You put the expression back into the equation you took it from, so of course it came out true — that equation cannot tell you anything new. Substitute into the **other** equation.'),
  ('math-systems-elimination', 'Combined the left sides but not the right',
   'Adds or subtracts the variable terms of the two equations but leaves one of the constants untouched.',
   'Adding two equations means adding both sides of both of them. If you added the left sides, the right sides have to be added too — otherwise the new line is not a true equation any more.'),
  ('math-systems-elimination', 'Multiplied only the term being eliminated',
   'Scales just the term whose coefficient needs to match, e.g. turns x + 3y = 13 into 2x + 3y = 13.',
   'Multiplying an equation by 2 doubles **everything** in it — every term on the left and the number on the right. Doubling one term alone changes what the equation says.'),
  ('math-systems-elimination', 'Subtracted when the coefficients were already opposites',
   'Sees matching numbers on the y-terms and subtracts, even though the signs are opposite, so nothing cancels.',
   'Look at the signs, not just the numbers. +3y and -3y are already opposites, so **adding** cancels them. Subtracting turns the -3y into +3y and doubles it instead.'),
  ('math-exponent-rules', 'Multiplied the exponents when multiplying powers',
   'Reads x^3 * x^4 as x^12: applies the power-of-a-power rule to a product of powers.',
   'Multiplying powers of the same base **adds** the exponents. Count the factors: three x factors next to four x factors is seven x factors, so x^7. Multiplying exponents is what happens when a power is raised to a power.'),
  ('math-exponent-rules', 'Added the exponents when raising a power to a power',
   'Reads a fourth power cubed as x^7: applies the product rule to a nested power.',
   'A power raised to a power **multiplies** the exponents. Three copies of x^4 multiplied together is 4 + 4 + 4 factors, which is 4 times 3, so x^12.'),
  ('math-exponent-rules', 'Did not raise the coefficient to the power',
   'Squares the variable part but leaves the number in front alone, so 2x^3 squared is written 2x^6.',
   'The exponent outside reaches **every** factor inside, the number included. Squaring 2x^3 squares the 2 as well, so the coefficient becomes 4, not 2.'),
  ('math-exponent-rules', 'Subtracted the exponents in the wrong order',
   'Computes bottom exponent minus top exponent when dividing powers.',
   'When you divide, the exponent on the **top** comes first: top minus bottom. Cancel the factors and see which side runs out — nine x factors over four leaves five on top.')
) as m(slug, label, description, feedback_md) on kc.slug = m.slug
where not exists (
  select 1 from kc_misconception x where x.kc_id = kc.id and x.label = m.label
);

-- ── Items ────────────────────────────────────────────────────────────────────
-- answer_spec is revoked from clients at column level in 0012 and stripped again
-- by publicItem() before serialization. Two independent guards, because this is
-- the exact field whose leak made the old practice flow untrustworthy.
--
-- Each component is banked at exactly 6 items over exactly 2 context tags, 3 per
-- tag. The tags name real surface differences, not two words for one surface:
-- pfa.js keys the >=2-contexts confirmation gate on them, so cosmetic tag
-- diversity manufactures confirmed mastery out of a single repeated surface. For
-- the systems components the split is a stated system versus a situation the
-- learner has to translate into one — the translation is where systems are
-- actually hard, and a bank without it certifies only the arithmetic. For exponent
-- rules the split is a letter base the learner must simplify versus a number base
-- they must evaluate: the same three rules, but one surface can be finished by
-- symbol-pushing and the other cannot, since 2^3 * 2^4 mishandled as 2^12 has to
-- be written out as 4096, a number visibly nowhere near 128.
--
-- misconceptionId is null on every named wrong value below. The ids are generated
-- uuids and the values body has no way to look one up per tuple in this insert
-- shape; the wrong ANSWER is still captured and diagnosable, and wiring the ids is
-- part of the human promotion step, not of drafting.

-- Numeric items. Every answer was derived by hand and then back-substituted into
-- the ORIGINAL equations, not into the rearranged ones — a sign slip during the
-- rearrangement survives a check against its own output. Derivations:
--
--   math-systems-substitution, bare-system
--     y = 2x + 1, 3x + y = 11   ->  3x + 2x + 1 = 11  ->  5x = 10   ->  x = 2, y = 5
--        check: 3*2 + 5 = 11 and 5 = 2*2 + 1. Named wrong value 2.2 is 11/5, the
--        result of substituting 2x and losing the +1.
--     y = x - 4, 2x + 3y = 3    ->  2x + 3x - 12 = 3  ->  5x = 15   ->  x = 3, y = -1
--        check: 2*3 + 3*(-1) = 3 and -1 = 3 - 4. Asked for y; the named wrong
--        value 3 is x, reported by a learner who stopped at the first variable.
--     x = 3y + 2, 2x - y = 14   ->  6y + 4 - y = 14   ->  5y = 10   ->  y = 2, x = 8
--        check: 2*8 - 2 = 14 and 8 = 3*2 + 2. Asked for x; named wrong value 2 is y.
--
--   math-systems-substitution, word-problem
--     s + l = 30, l = 2s + 3    ->  3s + 3 = 30  ->  s = 9,  l = 21
--        check: 9 + 21 = 30 and 21 = 2*9 + 3.
--     a + c = 10, 12a + 8c = 96 ->  12a + 80 - 8a = 96  ->  4a = 16  ->  a = 4, c = 6
--        check: 4 + 6 = 10 and 12*4 + 8*6 = 48 + 48 = 96.
--     l = w + 5, 2w + 2l = 54   ->  4w + 10 = 54  ->  w = 11, l = 16
--        check: 2*11 + 2*16 = 54 and 16 = 11 + 5.
--
--   math-systems-elimination, bare-system
--     3x + 4y = 10, 5x - 4y = 6 ->  add: 8x = 16  ->  x = 2, then 6 + 4y = 10, y = 1
--        check: 3*2 + 4*1 = 10 and 5*2 - 4*1 = 6. Named wrong value 1.25 is 10/8,
--        from adding the left sides and copying only one right side.
--     x + 3y = 13, 2x - y = 5   ->  double the first: 2x + 6y = 26, subtract the
--        second: 7y = 21  ->  y = 3, x = 13 - 9 = 4
--        check: 4 + 3*3 = 13 and 2*4 - 3 = 5. Named wrong value 7 comes from
--        writing 2x + 3y = 13, which gives 4y = 8, y = 2 and then x = 7.
--
--   math-systems-elimination, word-problem
--     L + S = 54, L - S = 12    ->  add: 2L = 66  ->  L = 33, S = 21
--        check: 33 + 21 = 54 and 33 - 21 = 12.
--     a + c = 90, 11a + 7c = 870 -> times 7: 7a + 7c = 630, subtract: 4a = 240
--        ->  a = 60, c = 30.  check: 60 + 30 = 90 and 11*60 + 7*30 = 660 + 210 = 870.
--     3c + 2t = 18, 3c + 5t = 27 -> subtract: 3t = 9  ->  t = 3, then 3c = 12, c = 4
--        check: 3*4 + 2*3 = 18 and 3*4 + 5*3 = 27. Asked for the coffee price, so
--        the item cannot be finished by the elimination step alone.
--
--   math-exponent-rules, numeric-evaluate
--     2^3 * 2^4 = 2^7 = 128.  Named wrong value 4096 is 2^12, the exponents
--        multiplied. Both are computed here rather than quoted: 2^7 = 128 and
--        2^12 = 4096.
--     3^5 / 3^3 = 243/27 = 9.  Named wrong value 1/9 is 3^-2, the subtraction done
--        bottom minus top.
--     (3^2)^3 = 9^3 = 729.  Named wrong value 243 is 3^5, the exponents added
--        instead of multiplied.
--
-- Comments INSIDE a values body stay free of parentheses and apostrophes on
-- purpose: web/test/bankInvariants.test.mjs parses these tuples positionally and
-- does not strip SQL comments, so a bracketed aside reads as another tuple and a
-- lone apostrophe opens a string that swallows every row after it. Prose needing
-- either goes above the insert, where the parser never looks.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, i.kind, 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  -- math-systems-substitution, context bare-system. Each names the ONE value it
  -- wants, because a numeric box cannot hold a pair and the verifier has no y.
  -- The second and third ask for the variable found LAST, so neither can be
  -- finished without substituting back.
  ('math-systems-substitution', 'numeric',
   'Solve this system by substitution:  y = 2x + 1  and  3x + y = 11.  What is the value of x?',
   '{"value":2,"misconceptionValues":[{"value":2.2,"misconceptionId":null}]}', 'bare-system', 1080),
  ('math-systems-substitution', 'numeric',
   'Solve this system by substitution:  y = x - 4  and  2x + 3y = 3.  What is the value of y?',
   '{"value":-1,"misconceptionValues":[{"value":3,"misconceptionId":null}]}', 'bare-system', 1190),
  ('math-systems-substitution', 'numeric',
   'Solve this system by substitution:  x = 3y + 2  and  2x - y = 14.  What is the value of x?',
   '{"value":8,"misconceptionValues":[{"value":2,"misconceptionId":null}]}', 'bare-system', 1270),

  -- math-systems-substitution, context word-problem. Nothing is set up for the
  -- learner here: the two relationships have to be written down before either
  -- method exists to apply. That translation is the surface difference the
  -- >=2-contexts gate is meant to demand, not a change of wording.
  ('math-systems-substitution', 'numeric',
   'Two numbers add up to 30. The larger number is 3 more than twice the smaller number. What is the smaller number?',
   '{"value":9}', 'word-problem', 1150),
  ('math-systems-substitution', 'numeric',
   'Adult tickets cost 12 dollars and student tickets cost 8 dollars. A group buys 10 tickets in total, all of them adult or student, and pays 96 dollars. How many adult tickets did they buy?',
   '{"value":4}', 'word-problem', 1250),
  ('math-systems-substitution', 'numeric',
   'The perimeter of a rectangle is 54 cm. Its length is 5 cm more than its width. What is the width, in cm?',
   '{"value":11}', 'word-problem', 1330),

  -- math-systems-elimination, context bare-system. The first is the plain case
  -- where the y-terms are already opposites and adding finishes it; the second
  -- needs one equation scaled first, which is where the method stops being
  -- mechanical. The third bare-system item is the multiple choice further down.
  ('math-systems-elimination', 'numeric',
   'Solve this system by elimination:  3x + 4y = 10  and  5x - 4y = 6.  What is the value of x?',
   '{"value":2,"misconceptionValues":[{"value":1.25,"misconceptionId":null}]}', 'bare-system', 1100),
  ('math-systems-elimination', 'numeric',
   'Solve this system by elimination:  x + 3y = 13  and  2x - y = 5.  What is the value of x?',
   '{"value":4,"misconceptionValues":[{"value":7,"misconceptionId":null}]}', 'bare-system', 1310),

  -- math-systems-elimination, context word-problem. The sum-and-difference item is
  -- the one place elimination is obviously the cheaper method, which is exactly
  -- the discrimination the confusable edge above is there to train.
  ('math-systems-elimination', 'numeric',
   'The sum of two numbers is 54 and their difference is 12. What is the larger number?',
   '{"value":33}', 'word-problem', 1160),
  ('math-systems-elimination', 'numeric',
   'One evening a theater sold only adult and child tickets: 90 tickets in total, for 870 dollars. Adult tickets cost 11 dollars and child tickets cost 7 dollars. How many adult tickets were sold?',
   '{"value":60}', 'word-problem', 1270),
  ('math-systems-elimination', 'numeric',
   'Three coffees and two teas cost 18 dollars. Three coffees and five teas cost 27 dollars. What does one coffee cost, in dollars?',
   '{"value":4}', 'word-problem', 1350),

  -- math-exponent-rules, context numeric-evaluate. A number base is a different
  -- surface from a letter base, not a restatement of one: the answer is a single
  -- integer the learner can sanity-check by counting factors, so a rule swapped
  -- for another rule produces a number that is visibly wrong rather than a tidy
  -- looking symbol. Each says whole number so the box is unambiguous.
  ('math-exponent-rules', 'numeric',
   'What is 2^3 * 2^4? Give your answer as a whole number.',
   '{"value":128,"misconceptionValues":[{"value":4096,"misconceptionId":null}]}', 'numeric-evaluate', 1080),
  ('math-exponent-rules', 'numeric',
   'What is 3^5 / 3^3? Give your answer as a whole number.',
   '{"value":9,"misconceptionValues":[{"value":"1/9","misconceptionId":null}]}', 'numeric-evaluate', 1190),
  ('math-exponent-rules', 'numeric',
   'What is (3^2)^3? Give your answer as a whole number.',
   '{"value":729,"misconceptionValues":[{"value":243,"misconceptionId":null}]}', 'numeric-evaluate', 1280)
) as i(slug, kind, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Symbolic items — the product and quotient rules on a letter base, checked by
-- expression equivalence rather than by string match, so x^7 and x^3*x^4 both
-- pass while x^12 does not.
--
-- Both bodies say "as a single power of x" for a grading reason, not a stylistic
-- one: expressionsEquivalent rejects a candidate whose domain differs from the
-- key, and x = 0 is one of its sample points, so an answer left as x^9/x^4 is
-- undefined exactly where x^5 is defined and would be marked wrong. Say what the
-- box wants rather than let the sampler decide it.
--
-- misconceptionExprs carry the two named rule-swaps, so a wrong answer here
-- diagnoses as precisely as a multiple-choice distractor:
--   x^12 on the product item  — exponents multiplied instead of added
--   1/x^5 on the quotient item — exponents subtracted bottom minus top, which is
--     what a learner types as x^-5, and the sampler treats those as the same
--     expression, both undefined at 0.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, 'symbolic', 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  ('math-exponent-rules',
   'Simplify:  x^3 * x^4.  Write your answer as a single power of x.',
   '{"expr":"x^7","misconceptionExprs":[{"expr":"x^12","misconceptionId":null}]}', 'symbolic-simplify', 1050),
  ('math-exponent-rules',
   'Simplify:  x^9 / x^4.  Write your answer as a single power of x.',
   '{"expr":"x^5","misconceptionExprs":[{"expr":"1/x^5","misconceptionId":null}]}', 'symbolic-simplify', 1170)
) as i(slug, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Multiple choice — used twice in this file and only twice, for the two questions
-- whose answer cannot be a number the verifier can compare.
--
-- The elimination item asks which MOVE works, which is the actual skill the
-- confusable edge exists to train and is not a quantity at all. Its choices were
-- each checked against the system 4x + 3y = 11 and 2x - 3y = 1:
--   multiply the first by 3       -> 12x + 9y = 33, nothing matches or opposes
--   subtract the second from the first -> 2x + 6y = 10, the y-terms doubled
--   add the two equations         -> 6x = 12, the y-terms cancel   CORRECT
--   multiply the second by 2 then add -> 8x - 3y = 13, nothing cancels
-- Exactly one option eliminates a variable in one step. The system also happens to
-- solve to x = 2, y = 1, checked in both equations, so a learner who ignores the
-- question and solves it outright is not punished by ugly numbers.
--
-- The exponent item asks which expression is equivalent to (2x^3)^2. Working:
-- squaring multiplies the exponent by 2 and squares the coefficient, so 4x^6.
--   4x^5 is the coefficient squared with the exponents added
--   2x^6 is the exponent handled correctly and the coefficient left behind
--   2x^5 is both errors at once
-- It is multiple choice rather than symbolic because the three wrong forms are
-- worth SHOWING side by side — the learner has to look at a coefficient and decide
-- whether the outside power reached it, which a blank box does not ask.
--
-- The correct answers sit at indices 2 and 3, never both in one slot. Every MC
-- item originally seeded in seed_kc.sql had index 0, which let a learner score
-- 100% on the whole MC bank by always tapping the first option; MC is a confirming
-- tier-v2 kind, so that fabricates confirmed mastery out of nothing.
insert into kc_item (kc_id, kind, tier, body, choices, answer_spec, distractor_misconceptions, context_tag, difficulty_elo, status, verified_by, verified_at)
select
  kc.id, 'mc', 'v2', i.body, i.choices::jsonb, i.answer_spec::jsonb,
  -- Index-aligned with `choices`: position 1 is the distractor that carries a
  -- named misconception, so a wrong pick diagnoses instead of just failing.
  -- The nulls are cast explicitly — bare NULL in jsonb_build_array leaves
  -- Postgres unable to resolve the polymorphic argument type.
  jsonb_build_array(
    null::text,
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d1),
    null::text, null::text
  ),
  i.context_tag, i.elo, 'draft', 'draft:llm-authored', null
from kc join (values
  ('math-systems-elimination',
   'Which single move eliminates a variable from this system in one step?  4x + 3y = 11  and  2x - 3y = 1',
   '["Multiply the first equation by 3","Subtract the second equation from the first","Add the two equations","Multiply the second equation by 2, then add"]',
   '{"index":2}', 'Subtracted when the coefficients were already opposites', 'bare-system', 1210),
  ('math-exponent-rules',
   'Which expression is equivalent to (2x^3)^2?',
   '["4x^5","2x^6","2x^5","4x^6"]',
   '{"index":3}', 'Did not raise the coefficient to the power', 'symbolic-simplify', 1300)
) as i(slug, body, choices, answer_spec, d1, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- ── Aliases ──────────────────────────────────────────────────────────────────
-- What a real syllabus calls these, so kcMap resolves common topic strings with
-- zero model calls. Every entry is one adjudication never paid for.
-- The method-neutral names — "systems of equations", "simultaneous equations" —
-- point at substitution deliberately: it is the entry point of the pair, and
-- elimination is unreachable until substitution is confirmed anyway, so resolving
-- an ambiguous topic string to the later component would hand the learner a
-- blocked_on_prereqs dead end for a topic they just asked to study. Only the names
-- that state a method resolve to elimination.
insert into kc_alias (kc_id, alias_norm, alias_text, subject, confidence, source)
select kc.id, a.norm, a.text, 'math', 1, 'seed'
from kc join (values
  ('math-systems-substitution', 'systems of equations',            'Systems of equations'),
  ('math-systems-substitution', 'substitution method',             'Substitution method'),
  ('math-systems-substitution', 'solving systems by substitution', 'Solving systems by substitution'),
  ('math-systems-substitution', 'simultaneous equations',          'Simultaneous equations'),
  ('math-systems-elimination',  'elimination method',              'Elimination method'),
  ('math-systems-elimination',  'solving systems by elimination',  'Solving systems by elimination'),
  ('math-systems-elimination',  'linear combination method',       'Linear combination method'),
  ('math-exponent-rules',       'exponent rules',                  'Exponent rules'),
  ('math-exponent-rules',       'laws of exponents',               'Laws of exponents'),
  ('math-exponent-rules',       'properties of exponents',         'Properties of exponents'),
  ('math-exponent-rules',       'exponents',                       'Exponents')
) as a(slug, norm, text) on kc.slug = a.slug
on conflict (alias_norm, subject) do nothing;

-- ── Bank shape, stated so the next reader does not have to count ─────────────
--   math-systems-substitution  6 items — bare-system 3 numeric,
--                                        word-problem 3 numeric
--   math-systems-elimination   6 items — bare-system 3, being 2 numeric + 1 mc,
--                                        word-problem 3 numeric
--   math-exponent-rules        6 items — symbolic-simplify 3, being 2 symbolic
--                                        + 1 mc, numeric-evaluate 3 numeric
-- 18 items: 14 numeric, 2 symbolic, 2 mc. Tier v1 everywhere except the two mc
-- rows, which are v2. Difficulty runs 1050 to 1350 and rises with the number of
-- steps an item takes, not with its position in the file — both mc rows appear
-- last only because the inserts are grouped by kind the way seed_kc.sql groups
-- them. By elo the elimination mc sits in the middle of bare-system at 1210,
-- between 1100 and 1310; the exponent mc sits at the TOP of symbolic-simplify at
-- 1300, above 1050 and 1170, because it is the only item in that context needing
-- two rules at once — the power of a power AND the coefficient raised with it.
--
-- Every row is status 'draft', verified_by 'draft:llm-authored', verified_at null.
-- Nothing in this file is verified and nothing should be promoted without a second
-- solver agreeing item by item — in particular re-deriving the three systems whose
-- named wrong values encode a specific misstep, since a wrong value labelled with
-- the wrong misconception teaches the learner to distrust the feedback.

-- ══ slice 5 ══════════════════════════════════════════════════════════════

-- algebra1_part5.sql — Algebra I chain, slice 5: factoring, and the first
-- equation that is not linear.
-- Run AFTER 0012, 0013 and seed_kc.sql (it hangs off math-distribute, which the
-- seed already ships). Idempotent (upserts on slug / natural keys).
--
-- THE THREE COMPONENTS
--   math-factor-gcf                Factoring out the greatest common factor   (skill)
--   math-factor-trinomial          Factoring trinomials, leading coefficient 1 (skill)
--   math-solve-quadratic-factoring Solving quadratics by factoring            (skill)
--
-- WHY THIS SLICE
-- Everything the learner has solved so far comes apart by undoing operations one
-- at a time: strip the constant, divide by the coefficient, done. x^2 - 7x + 12 = 0
-- does not yield to that, and no amount of two-step practice makes it. The move
-- that works is a different idea entirely — rewrite one side as a PRODUCT, then use
-- the fact that a product is zero only when a factor is zero. Factoring is the only
-- road to it, which is why these three sit in one slice and in this order.
--
-- The chain is deliberately short and strictly ordered. GCF first, because pulling
-- out a common factor is literally math-distribute run backwards and the learner
-- already owns the forward direction; the seed even catalogues the mirrored error
-- ("Distributed to the first term only" -> here, "divided only the first term").
-- Trinomials next, because the search for a factor pair is only tractable once the
-- learner reflexively strips the common factor first. Solving last, because the
-- zero-product step is trivial to state and worthless to a learner who cannot
-- produce the factors it consumes. A learner handed quadratics before factoring is
-- confirmed is being handed an unsolvable problem, and policy.js:62-66 is what
-- stops that — but only if the prerequisite edges below actually exist.
--
-- STATUS: DRAFT. seed_kc.sql sets the standard — "a confidently wrong item teaches
-- a wrong thing and destroys trust faster than a missing feature", and "LLM-drafted
-- items must pass solver agreement + second-model critique + human sign-off before
-- status becomes 'verified'". This file is the first of those three steps and
-- nothing else. Every kc_item row below is status 'draft', verified_by
-- 'draft:llm-authored', verified_at null; check.js:46 selects the bank with
-- .eq('status','verified'), so nothing here can reach a student until a human
-- promotes it. That is the design, not a shortfall.
-- The kc rows themselves ARE 'verified': these three concepts are real and their
-- place in the graph is not in question. It is the ITEMS that are unreviewed.
--
-- FLOORS MET (docs/archive/PRODUCTION_READINESS.md, "the three floors"): 6 items per
-- concept, 2 distinct context_tag values, 3 items per tag. Below 6, elo.js:73
-- penalises a seen item by 800 and the second check degenerates into a memory test
-- of the first; below 2 contexts the pfa.js confirmation gate can never open, so a
-- one-context concept is unconfirmable however well the learner does.
--
-- THE AUTHORING CONSTRAINT THAT SHAPED EVERY SYMBOLIC ITEM HERE
-- verify/symbolic.js grades a symbolic answer with expressionsEquivalent(), which
-- samples both expressions at 21 points and compares values. It tests EQUIVALENCE,
-- not FORM. So the obvious item — "Factor completely: 6x + 9" — is graded correct
-- when the student types back "6x + 9", because that expression is equivalent to
-- 3(2x + 3) at every point in the universe. The verifier is not broken; factored
-- form is a syntactic property and this verifier is semantic by construction.
-- Every symbolic item below therefore asks for a factor the student does not
-- already have in front of them:
--   "6x + 9 = 3(____)"                      -> the blank is 2x + 3 and nothing else
--   "area 6x^2 + 15x, width 3x, find length" -> the length is 2x + 5 and nothing else
-- Where the question genuinely is "which of these is the fully factored form", the
-- item is multiple choice, where form can be compared because the options are
-- literal strings.
--
-- WHAT THIS DOES NOT BUY, MEASURED RATHER THAN ASSUMED (second-solver finding).
-- An earlier draft of this header claimed "restating the problem cannot pass".
-- That is FALSE, and the false half is load-bearing, so it is corrected here
-- rather than left for the promoting reviewer to discover. A student who never
-- factors anything and simply writes the quotient — "(x^2 + 7x + 12)/(x + 3)" for
-- the trinomial blank, "(6x + 9)/3" for the GCF blank — is typing an expression
-- equivalent to the key, and expressionsEquivalent() accepts it. Run against the
-- real verifier, 7 of the 10 symbolic items below accept that quotient.
-- The other 3 REJECT it, and they reject it for a reason that has nothing to do
-- with pedagogy: their divisor is a monomial (3x, 4x, 5x) which is zero at x = 0,
-- x = 0 is one of the 21 sample points, so the two expressions differ in DOMAIN
-- and expressionsEquivalent() bails at the `aOk !== bOk` guard. A divisor of
-- (x + 4) has its pole outside the sample window and sails through.
-- So the split is an artifact of where the sampler happens to look, and on those
-- 3 items it marks a mathematically correct answer WRONG — the outcome this
-- file's own numeric-item note calls the worst the engine has.
-- Mitigation applied: every symbolic stem below now states the required answer
-- form ("in simplest form"), which is what makes rejecting an unsimplified answer
-- defensible instead of arbitrary. It does NOT close the leniency on the other 7;
-- a value-comparing verifier cannot. Closing it needs either a form-aware check or
-- items whose answer is a number, and that is a decision for the human reviewer,
-- flagged here so it is made deliberately.
--
-- Second constraint, same file: lib/mathExpr.js knows exactly ONE variable, x. All
-- symbolic answers below are in x. The quadratic-solving items ask for a NUMBER
-- (a named root), never a pair, because a numeric box cannot hold "x = 3 or x = 4"
-- and marking a fully correct learner wrong is the worst outcome the engine has —
-- it writes unassisted FAILURE into a ledger that is the source of truth.

-- ── Knowledge components ─────────────────────────────────────────────────────
-- All three are 'skill': the object being learned is a procedure with a verifiable
-- product, not a statement about why it works. All three are verifiability 'v1' —
-- every answer is a number or an expression in x, so grading is numeric or
-- symbolic comparison with no model anywhere in the path.
insert into kc (slug, subject, title, type, verifiability, status) values
  ('math-factor-gcf',                'math', 'Factoring out the greatest common factor',       'skill', 'v1', 'verified'),
  ('math-factor-trinomial',          'math', 'Factoring trinomials with leading coefficient 1', 'skill', 'v1', 'verified'),
  ('math-solve-quadratic-factoring', 'math', 'Solving quadratics by factoring',                 'skill', 'v1', 'verified')
on conflict (slug) do update set
  title = excluded.title, type = excluded.type,
  verifiability = excluded.verifiability, status = excluded.status;

-- ── Prerequisite edges ───────────────────────────────────────────────────────
-- The policy engine will not teach a component until its prerequisites are
-- CONFIRMED. This is the chain that stops a learner being shown x^2 - 7x + 12 = 0
-- with no way to produce (x - 3)(x - 4).
--
-- math-distribute -> math-factor-gcf is the load-bearing one. Factoring out a
-- common factor is the distributive property read right to left; a learner who
-- cannot reliably expand 3(2x + 3) has no way to check their own factoring, and
-- checking is the entire self-correction loop for this skill.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'prerequisite' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-distribute',       'math-factor-gcf'),
  ('math-factor-gcf',       'math-factor-trinomial'),
  ('math-factor-trinomial', 'math-solve-quadratic-factoring')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- Confusable edges drive interleaving. Interleaving works by forcing the question
-- "which kind of problem is this?", so the graph has to encode what is actually
-- confusable with what — ordering alone is not enough.
--
-- GCF <-> trinomial is the real one, and it runs BOTH ways because the confusion
-- does: a learner fresh off trinomials hunts for a factor pair in 6x + 9 (there is
-- no pair; it is a two-term expression), and a learner fresh off GCF pulls a 1 out
-- of x^2 + 7x + 12 and declares it done. Practised in separate blocked chapters
-- both procedures look fluent and neither gets selected correctly under mixed
-- conditions, which is precisely the failure interleaving is for.
--
-- trinomial -> solve-quadratic is the other live confusion, in one direction:
-- students asked to FACTOR x^2 + 7x + 12 answer "x = -3, x = -4", solving an
-- equation nobody wrote. The expression was never equal to zero.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'confusable' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-factor-gcf',       'math-factor-trinomial'),
  ('math-factor-trinomial', 'math-factor-gcf'),
  ('math-factor-trinomial', 'math-solve-quadratic-factoring')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- ── Misconceptions ───────────────────────────────────────────────────────────
-- Named, diagnosable error patterns. These make feedback ELABORATED ("you pulled
-- out a common factor, but not the greatest one") rather than bare "try again" —
-- which is the form with the real effect size. They are also what makes the
-- multiple-choice items below worth their tier-v2 weight: each distractor is a
-- named error, so a wrong tap diagnoses instead of merely failing.
insert into kc_misconception (kc_id, label, description, feedback_md, source)
select kc.id, m.label, m.description, m.feedback_md, 'authored'
from kc join (values
  ('math-factor-gcf', 'Partial GCF pulled out',
   'Factors out a common factor that is not the greatest one: 8x^2 + 12x = 2x(4x + 6).',
   'What you pulled out **is** a common factor, and your product is correct — but it is not the **greatest** one. Look at what is left inside: 4x + 6 still has a 2 in both terms, so there was more to take. Take the largest number that divides both coefficients and the highest power of x present in **every** term.'),
  ('math-factor-gcf', 'Numeric GCF only',
   'Pulls out the common number and leaves the shared variable behind: 8x^2 + 12x = 4(2x^2 + 3x).',
   'You found the number part, then stopped. Both terms also contain an x, so the x comes out too. The GCF has a number part **and** a variable part.'),
  ('math-factor-gcf', 'Exponent not reduced when dividing',
   'Divides 8x^2 by 4x and writes 2x^2 — keeps the exponent instead of subtracting.',
   'When you pull 4x out of 8x^2, you are dividing: 8x^2 divided by 4x is 2x, not 2x^2. Check by expanding your answer — if it does not rebuild the original expression, the exponent is where it went wrong.'),
  ('math-factor-gcf', 'Divided only the first term',
   'Divides the first term by the GCF and copies the rest unchanged: 6x + 9 = 3(2x + 9).',
   'The factor you pulled out came from **every** term, so every term inside the bracket has to be divided by it. This is the mirror image of distributing to the first term only.'),
  ('math-factor-trinomial', 'Factor pair with the wrong sum',
   'Picks a pair that multiplies to c but ignores the requirement that it add to b: x^2 + 8x + 12 read as (x + 3)(x + 4).',
   'Your two numbers multiply to 12, which is half the job. They also have to **add** to the middle coefficient. 3 and 4 give 7x in the middle, not 8x — expand it and you can see the middle term change.'),
  ('math-factor-trinomial', 'Signs flipped on both factors',
   'Writes (x - p)(x - q) where (x + p)(x + q) is required, ignoring that the middle term is positive.',
   'Both your numbers are negative, so the middle term comes out negative too. With a positive constant **and** a positive middle term, both numbers must be positive.'),
  ('math-factor-trinomial', 'Used b and c as the factors',
   'Copies the coefficients straight into the brackets: x^2 + 8x + 12 read as (x + 8)(x + 12).',
   'The numbers in the brackets are not b and c. They are the pair that **multiplies** to c and **adds** to b. Expand (x + 8)(x + 12) and you get a constant of 96.'),
  ('math-factor-trinomial', 'Wrong sign on the second factor',
   'Gets the size of the second number right but not its sign, so the constant term comes out with the wrong sign.',
   'Check the constant: the two numbers have to multiply to it, sign included. A negative constant means one number is positive and one is negative.'),
  ('math-solve-quadratic-factoring', 'Only one root reported',
   'Sets the first factor to zero, solves, and stops — reports one solution where there are two.',
   'A product is zero when **either** factor is zero, so each factor gives you a solution. You stopped after the first one.'),
  ('math-solve-quadratic-factoring', 'Root sign not flipped',
   'Reads the solution straight out of the bracket: (x + 5) = 0 read as x = 5.',
   'Solve the little equation instead of reading it. x + 5 = 0 means x = -5. The sign in the bracket is the opposite of the solution.'),
  ('math-solve-quadratic-factoring', 'Solved the product instead of each factor',
   'Multiplies the constants together, or treats the whole product as one expression to evaluate, rather than setting each factor to zero.',
   'Do not multiply the brackets back together. The reason the factored form is useful is that a product equals zero **only** when one of the factors equals zero — take them one at a time.')
) as m(slug, label, description, feedback_md) on kc.slug = m.slug
where not exists (
  select 1 from kc_misconception x where x.kc_id = kc.id and x.label = m.label
);

-- ── Items ────────────────────────────────────────────────────────────────────
-- answer_spec is revoked from clients at column level in 0012 and stripped again
-- by publicItem() before serialization. Two independent guards, because this is
-- the exact field whose leak made the old practice flow untrustworthy.
--
-- context_tag matters: the mastery gate requires passes across >= 2 surface
-- contexts, so a bank whose items all share one context can never confirm. The two
-- contexts used here are real surface differences, not two names for one surface:
--   bare-expression / bare-equation  the algebra is handed to the learner already
--                                    written; the only work is the procedure
--   area-model / word-problem        the learner has to build the algebra first,
--                                    then run the procedure, then say which
--                                    quantity the number they found actually is
-- The second is where transfer lives, and it is the one a learner drilled on bare
-- symbols fails. That is exactly what the >= 2-contexts gate exists to catch.

-- Numeric items — solving quadratics. Each names the ONE value it wants, because a
-- numeric box cannot hold a pair of roots and parseNumber() would reject "3 or 4"
-- outright, marking a fully correct learner wrong.
--
-- misconceptionValues carry misconceptionId null: the ids are not resolvable from
-- inside a values list. Wiring each to the named misconception above is a promotion
-- step for the human reviewer — a wrong value labelled with the wrong misconception
-- teaches the learner to distrust the feedback, so it is better left null than
-- guessed.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, i.kind, 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null::timestamptz
from kc join (values
  -- context bare-equation: the quadratic is already written and already equal to
  -- zero. Both name which root they want, so each has exactly one right answer.
  ('math-solve-quadratic-factoring', 'numeric',
   'Solve by factoring:  x^2 - 7x + 12 = 0.  Write the LARGER of the two solutions.',
   '{"value":4,"misconceptionValues":[{"value":3,"misconceptionId":null}]}', 'bare-equation', 1200),
  -- No constant term, so the factor is x itself. This is the case learners lose:
  -- many divide both sides by x, destroy the root x = 0, and never see it again.
  ('math-solve-quadratic-factoring', 'numeric',
   'Solve by factoring:  x^2 + 5x = 0.  Write the solution that is not zero.',
   '{"value":-5,"misconceptionValues":[{"value":5,"misconceptionId":null}]}', 'bare-equation', 1240),

  -- context word-problem: no equation is given. The learner has to name the
  -- unknown, build the quadratic, factor it, and then decide which root is the
  -- answer to the question actually asked — the step bare-symbol drill never
  -- exercises.
  ('math-solve-quadratic-factoring', 'numeric',
   'The product of two consecutive positive integers is 72. What is the smaller integer?',
   '{"value":8}', 'word-problem', 1260),
  ('math-solve-quadratic-factoring', 'numeric',
   'A rectangle is 3 units longer than it is wide, and its area is 40 square units. How many units wide is it?',
   '{"value":5,"misconceptionValues":[{"value":8,"misconceptionId":null}]}', 'word-problem', 1290),
  -- The negative root is thrown away by the physical setup, and t = 0 is the throw
  -- rather than the landing, so "t greater than 0" is stated to leave exactly one
  -- defensible answer. Every item in this bank has to survive that test.
  ('math-solve-quadratic-factoring', 'numeric',
   'A ball is thrown upward from the ground. Its height in feet after t seconds is -16t^2 + 32t. At what time t, with t greater than 0, is the ball back on the ground?',
   '{"value":2,"misconceptionValues":[{"value":0,"misconceptionId":null}]}', 'word-problem', 1340)
) as i(slug, kind, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Symbolic items — factoring, checked by expression equivalence.
--
-- Read the header note before adding to this block. expressionsEquivalent() compares
-- VALUE, not FORM, so "Factor 6x + 9" would accept "6x + 9". Each item below asks
-- for a factor the learner does not already possess: the contents of a bracket
-- whose outside factor is given, or the missing side of a rectangle whose area and
-- one side are given. Restating the problem cannot pass, and the answer is unique.
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, 'symbolic', 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'draft', 'draft:llm-authored', null::timestamptz
from kc join (values
  -- math-factor-gcf, context bare-expression. The outside factor is supplied, so
  -- the item tests dividing every term by it — which is the step that fails.
  ('math-factor-gcf',
   'Fill in the blank with an expression in simplest form so both sides are equal:  6x + 9 = 3(____)',
   '{"expr":"2*x + 3","acceptedForms":["2x+3"],"misconceptionExprs":[{"expr":"2*x + 9","misconceptionId":null}]}',
   'bare-expression', 1070),
  -- The outside factor now carries an x, so the second term drops its variable
  -- entirely and the first drops one power. Both are the classic slips.
  ('math-factor-gcf',
   'Fill in the blank with an expression in simplest form so both sides are equal:  10x^2 - 15x = 5x(____)',
   '{"expr":"2*x - 3","acceptedForms":["2x-3"],"misconceptionExprs":[{"expr":"2*x^2 - 3","misconceptionId":null}]}',
   'bare-expression', 1170),

  -- math-factor-gcf, context area-model. Same procedure, but the learner has to
  -- recognise that "area divided by one side" is what factoring is doing here.
  ('math-factor-gcf',
   'A rectangle has area 6x^2 + 15x square units and width 3x units. Write an expression in simplest form for its length.',
   '{"expr":"2*x + 5","acceptedForms":["2x+5"]}', 'area-model', 1230),
  ('math-factor-gcf',
   'A rectangular banner has area 20x^2 - 12x square units and width 4x units. Write an expression in simplest form for its length.',
   '{"expr":"5*x - 3","acceptedForms":["5x-3"]}', 'area-model', 1270),
  -- Reversed: the binomial side is the one given, so the GCF itself is the answer.
  -- A learner who only ever divides by the monomial has not met this shape.
  ('math-factor-gcf',
   'A rectangle has area 7x^2 + 28x square units and one side is (x + 4) units. Write an expression in simplest form for the other side.',
   '{"expr":"7*x","acceptedForms":["7x"]}', 'area-model', 1330),

  -- math-factor-trinomial, context bare-expression. One factor is given, so the
  -- item isolates the pair search: which number multiplies with the given one to
  -- make c and adds with it to make b.
  ('math-factor-trinomial',
   'Fill in the blank with an expression in simplest form so both sides are equal:  x^2 + 7x + 12 = (x + 3)(____)',
   '{"expr":"x + 4","acceptedForms":["(x+4)"]}', 'bare-expression', 1120),
  -- Negative constant, so the two numbers have opposite signs — the case where the
  -- size is usually right and the sign is not.
  ('math-factor-trinomial',
   'Fill in the blank with an expression in simplest form so both sides are equal:  x^2 - 2x - 15 = (x - 5)(____)',
   '{"expr":"x + 3","acceptedForms":["(x+3)"],"misconceptionExprs":[{"expr":"x - 3","misconceptionId":null}]}',
   'bare-expression', 1250),

  -- math-factor-trinomial, context area-model.
  ('math-factor-trinomial',
   'A rectangle has area x^2 + 9x + 20 square units and width (x + 4) units. Write an expression in simplest form for its length.',
   '{"expr":"x + 5","acceptedForms":["(x+5)"]}', 'area-model', 1240),
  ('math-factor-trinomial',
   'A rectangle has area x^2 + 3x - 10 square units and one side is (x + 5) units. Write an expression in simplest form for the other side.',
   '{"expr":"x - 2","acceptedForms":["(x-2)"]}', 'area-model', 1310),
  ('math-factor-trinomial',
   'A rectangular rug has area x^2 - 7x + 10 square units and length (x - 2) units. Write an expression in simplest form for its width.',
   '{"expr":"x - 5","acceptedForms":["(x-5)"]}', 'area-model', 1350)
) as i(slug, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Multiple choice — used in exactly the three places where the question is about
-- FORM or about a COMPLETE solution set, neither of which a value-comparing
-- verifier can judge:
--   "which is factored with the GREATEST common factor"  — 2x(4x + 6) is a correct
--     factorization and an equivalent expression; only its FORM is wrong, and only
--     a literal string comparison can say so
--   "which is the correct factorization"                 — same reason
--   "which is the complete solution"                     — a numeric box takes one
--     number, so it cannot distinguish "x = 3" from "x = 3 or x = -5"; dropping a
--     root is the single most common error here and would otherwise be unaskable
--
-- The correct answers sit at indices 2, 1 and 3 — never all in one slot. Every MC
-- item originally seeded in seed_kc.sql had index 0, which let a learner score 100%
-- on the whole MC bank by always tapping the first option; MC is a confirming
-- tier-v2 kind, so that fabricates confirmed mastery out of nothing.
insert into kc_item (kc_id, kind, tier, body, choices, answer_spec, distractor_misconceptions, context_tag, difficulty_elo, status, verified_by, verified_at)
select
  kc.id, 'mc', 'v2', i.body, i.choices::jsonb, i.answer_spec::jsonb,
  -- Index-aligned with `choices`, looked up per position rather than at the single
  -- position 1 the seed uses: the correct answer here moves between slots, so no
  -- one slot is reliably a distractor, and each of the three wrong options carries
  -- a DIFFERENT named error worth naming. The null in each row is the slot holding
  -- the correct answer — check.js only reads dm[picked] on a wrong pick, so that
  -- entry is never consulted. Labels resolve to null if the misconception insert
  -- above has not run; the item still grades, it just stops diagnosing.
  jsonb_build_array(
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d0),
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d1),
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d2),
    (select m.id::text from kc_misconception m where m.kc_id = kc.id and m.label = i.d3)
  ),
  i.context_tag, i.elo, 'draft', 'draft:llm-authored', null::timestamptz
from kc join (values
  -- 8x^2 + 12x. Options 0 and 1 are both equivalent to the original and both are
  -- genuine factorizations — they are wrong only against "greatest", which is why
  -- the word is capitalised in the stem. Option 3 is not even equal.
  ('math-factor-gcf',
   'Which of these shows 8x^2 + 12x factored with the GREATEST common factor pulled out?',
   '["2x(4x + 6)","4(2x^2 + 3x)","4x(2x + 3)","4x(2x^2 + 3)"]',
   '{"index":2}',
   'Partial GCF pulled out', 'Numeric GCF only', null, 'Exponent not reduced when dividing',
   'bare-expression', 1210),
  -- x^2 + 8x + 12 factors as x + 2 times x + 6. Option 0 multiplies to 12 but adds
  -- to 7, option 2 has both signs flipped, option 3 copies b and c into the
  -- brackets. Written without parentheses on purpose: the bank parser in
  -- web/test/bankInvariants.test.mjs reads tuples out of the values body without
  -- stripping comments, so a parenthesised aside in here is read as a tuple.
  ('math-factor-trinomial',
   'Which is the correct factorization of x^2 + 8x + 12?',
   '["(x + 3)(x + 4)","(x + 2)(x + 6)","(x - 2)(x - 6)","(x + 8)(x + 12)"]',
   '{"index":1}',
   'Factor pair with the wrong sum', null, 'Signs flipped on both factors', 'Used b and c as the factors',
   'bare-expression', 1190),
  -- Already factored, so this isolates the zero-product step itself: option 0 stops
  -- at the first factor, option 1 reads the roots straight out of the brackets,
  -- option 2 multiplies the constants instead of setting each factor to zero.
  ('math-solve-quadratic-factoring',
   'The equation (x - 3)(x + 5) = 0 is already factored. Which is the complete solution?',
   '["x = 3 only","x = -3 or x = 5","x = -15","x = 3 or x = -5"]',
   '{"index":3}',
   'Only one root reported', 'Root sign not flipped', 'Solved the product instead of each factor', null,
   'bare-equation', 1130)
) as i(slug, body, choices, answer_spec, d0, d1, d2, d3, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- ── Aliases ──────────────────────────────────────────────────────────────────
-- What a real syllabus actually calls these, so kcMap resolves common topic strings
-- with zero model calls. Every entry here is one adjudication never paid for.
-- Note what "factoring quadratics" is pointed at: math-factor-trinomial, the
-- expression skill, not the equation skill. The bare phrase almost always means
-- "turn the trinomial into brackets", and resolving it to the later component would
-- hand a learner blocked_on_prereqs with nothing to do about it.
insert into kc_alias (kc_id, alias_norm, alias_text, subject, confidence, source)
select kc.id, a.norm, a.text, 'math', 1, 'seed'
from kc join (values
  ('math-factor-gcf',                'factoring out the gcf',          'Factoring out the GCF'),
  ('math-factor-gcf',                'greatest common factor',         'Greatest common factor'),
  ('math-factor-gcf',                'common factors',                 'Common factors'),
  ('math-factor-trinomial',          'factoring trinomials',           'Factoring trinomials'),
  ('math-factor-trinomial',          'factoring quadratics',           'Factoring quadratics'),
  ('math-factor-trinomial',          'factoring',                      'Factoring'),
  ('math-solve-quadratic-factoring', 'solving quadratic equations',    'Solving quadratic equations'),
  ('math-solve-quadratic-factoring', 'solving quadratics by factoring','Solving quadratics by factoring'),
  ('math-solve-quadratic-factoring', 'zero product property',          'Zero product property')
) as a(slug, norm, text) on kc.slug = a.slug
on conflict (alias_norm, subject) do nothing;

-- ── Bank shape, stated so the next reader does not have to count ─────────────
--   math-factor-gcf                6 items — bare-expression 3 (2 symbolic + 1 mc),
--                                            area-model     3 symbolic
--   math-factor-trinomial          6 items — bare-expression 3 (2 symbolic + 1 mc),
--                                            area-model     3 symbolic
--   math-solve-quadratic-factoring 6 items — bare-equation   3 (2 numeric + 1 mc),
--                                            word-problem    3 numeric
-- 18 items: 5 numeric, 10 symbolic, 3 mc. Tier v1 everywhere except the three mc
-- rows, which are v2. Difficulty runs 1070 to 1350, ascending within each context
-- across the symbolic/numeric rows; the mc row of a context is authored separately
-- and lands mid-range, not last — trinomial bare-expression is 1120, 1250 with its
-- mc at 1190, and solve bare-equation is 1200, 1240 with its mc at 1130. Both are
-- deliberate: an mc row carries a 25% guess floor, so it is not the hardest item in
-- its context even when its content is.
-- MC correct answers sit at indices 2, 1, 3.
--
-- Every row is status 'draft', verified_by 'draft:llm-authored', verified_at null.
-- Nothing in this file is verified, and nothing should be promoted without a second
-- solver agreeing item by item.
--
-- SECOND-SOLVER PASS (independent re-derivation of all 18, run against the real
-- verify/symbolic.js rather than by eye):
--   * All 18 answer_specs re-derive correctly. Every factoring identity was
--     re-expanded and every root re-solved; the 3 mc keys point at the genuinely
--     correct option and all 9 distractors are index-aligned with their named
--     misconception.
--   * The header's old claim that "restating the problem cannot pass" was FALSE.
--     See the corrected note at the top of this file: 7 of 10 symbolic items accept
--     the unsimplified quotient, and the 3 that reject it reject it because of where
--     the sampler looks, not because of anything pedagogical. Every symbolic stem now
--     states "in simplest form" so that rejection is defensible; the leniency on the
--     other 7 is real and unclosed, and is the first thing to decide on promotion.
--   * Two area-model stems labelled the shorter side "length" and the longer one
--     "width" for every value of x that makes the figure exist. Relabelled; the
--     answers did not change.
-- Still to re-derive by hand before promoting:
--   1. the five named wrong values and the three named wrong expressions — each is
--      an arithmetically reachable error, but every misconceptionId is still null, so
--      no wrong answer diagnoses anything until a human wires them up;
--   2. the two "GREATEST common factor" / "correct factorization" MC stems — their
--      distractors are deliberately equivalent expressions, so the wording is the
--      only thing making one option right, and it has to hold up to a hostile read.

