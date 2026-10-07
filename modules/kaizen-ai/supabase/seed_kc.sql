-- seed_kc.sql — a real, verified knowledge-component bank to start from.
-- Run AFTER 0012 and 0013. Idempotent (upserts on slug / natural keys).
--
-- WHY THIS EXISTS AND WHY IT IS SMALL
-- Without verified items, issueCheck() returns noBank for every concept and the
-- entire engine is inert — no check can be taken, so no mastery can ever be
-- confirmed. This seeds enough of the fractions -> linear-equations chain to
-- exercise the whole loop end to end.
--
-- The chain is chosen deliberately: early fraction knowledge is the best-
-- documented predictor of later algebra achievement, the misconceptions are
-- extensively catalogued (which makes diagnosis cheap to author), and every
-- answer is mechanically checkable — so this bank is tier v1/v2 throughout and
-- needs no model in the grading path.
--
-- Every item here is hand-verified. That standard is not optional: a confidently
-- wrong item teaches a wrong thing and destroys trust faster than a missing
-- feature. LLM-drafted items must pass solver agreement + second-model critique
-- + human sign-off before status becomes 'verified'.

-- ── Knowledge components ─────────────────────────────────────────────────────
insert into kc (slug, subject, title, type, verifiability, status) values
  ('math-equivalent-fractions',  'math', 'Equivalent fractions',            'skill',     'v1', 'verified'),
  ('math-compare-fractions',     'math', 'Comparing fractions',             'principle', 'v1', 'verified'),
  ('math-add-fractions-unlike',  'math', 'Adding fractions, unlike denominators', 'skill', 'v1', 'verified'),
  ('math-multiply-fractions',    'math', 'Multiplying fractions',           'skill',     'v1', 'verified'),
  ('math-ratio-basics',          'math', 'Ratios and equivalent ratios',    'skill',     'v1', 'verified'),
  ('math-solve-one-step',        'math', 'Solving one-step equations',      'skill',     'v1', 'verified'),
  ('math-solve-two-step',        'math', 'Solving two-step equations',      'skill',     'v1', 'verified'),
  ('math-distribute',            'math', 'Distributive property',           'skill',     'v1', 'verified')
on conflict (slug) do update set
  title = excluded.title, type = excluded.type,
  verifiability = excluded.verifiability, status = excluded.status;

-- ── Prerequisite edges ───────────────────────────────────────────────────────
-- The policy engine will not teach a component until its prerequisites are
-- CONFIRMED, so these edges are what stop a learner being handed two-step
-- equations while one-step is still shaky.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'prerequisite' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-equivalent-fractions', 'math-compare-fractions'),
  ('math-equivalent-fractions', 'math-add-fractions-unlike'),
  ('math-equivalent-fractions', 'math-ratio-basics'),
  ('math-solve-one-step',       'math-solve-two-step'),
  ('math-distribute',           'math-solve-two-step')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- Confusable edges drive interleaving. Interleaving works by forcing the
-- question "which kind of problem is this?", so the graph has to encode what is
-- actually confusable with what — ordering alone is not enough.
insert into kc_edge (from_kc, to_kc, kind)
select f.id, t.id, 'confusable' from kc f, kc t
where (f.slug, t.slug) in (
  ('math-add-fractions-unlike', 'math-multiply-fractions'),
  ('math-multiply-fractions',   'math-add-fractions-unlike'),
  ('math-compare-fractions',    'math-ratio-basics')
)
on conflict (from_kc, to_kc, kind) do nothing;

-- ── Misconceptions ───────────────────────────────────────────────────────────
-- Named, diagnosable error patterns. These make feedback ELABORATED ("you added
-- the denominators") rather than bare "try again" — which is the form with the
-- real effect size. Tutors add to this library from real sessions.
insert into kc_misconception (kc_id, label, description, feedback_md, source)
select kc.id, m.label, m.description, m.feedback_md, 'authored'
from kc join (values
  ('math-add-fractions-unlike', 'Added denominators',
   'Adds numerators and denominators straight across: a/b + c/d = (a+c)/(b+d).',
   'You added the tops **and** the bottoms. The denominator names the size of the piece — it does not get added. Rewrite both fractions over the same denominator first, then add only the tops.'),
  ('math-add-fractions-unlike', 'Common denominator without scaling numerator',
   'Finds a common denominator but forgets to scale the numerator with it.',
   'You found the common denominator, then left the top unchanged. Whatever you multiplied the bottom by, the top has to be multiplied by too — otherwise you have changed the value.'),
  ('math-compare-fractions', 'Whole-number bias',
   'Judges fraction size by the size of the digits: 1/8 > 1/3 because 8 > 3.',
   'Bigger denominator means the whole is cut into **more** pieces, so each piece is **smaller**. Picture one pizza cut into 3 versus 8.'),
  ('math-multiply-fractions', 'Cross-multiplied instead of multiplying across',
   'Applies the cross-multiplication move from solving proportions to a product.',
   'Cross-multiplying is for solving a proportion, not for multiplying. To multiply, go straight across: tops times tops, bottoms times bottoms.'),
  ('math-solve-two-step', 'Wrong order of operations when undoing',
   'Divides before undoing the addition, e.g. 2x + 6 = 10 -> x + 6 = 5.',
   'When you undo, you reverse the order: strip the added term first, then divide. You divided while the +6 was still attached to the 2x.'),
  ('math-distribute', 'Distributed to the first term only',
   'a(b + c) = ab + c — multiplies the first term and drops the second.',
   'The multiplier outside reaches **every** term in the bracket, not just the first one.')
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
-- contexts, so a bank whose items all share one context can never confirm.

-- Adding fractions (numeric, with named wrong answers that diagnose)
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, i.kind, 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'verified', 'seed:hand-verified', now()
from kc join (values
  ('math-add-fractions-unlike', 'numeric', 'What is 1/2 + 1/3? Give your answer as a fraction.',
   '{"value":"5/6","misconceptionValues":[{"value":"2/5","misconceptionId":null}]}', 'bare-computation', 1150),
  ('math-add-fractions-unlike', 'numeric', 'What is 3/4 + 1/6? Give your answer as a fraction.',
   '{"value":"11/12","misconceptionValues":[{"value":"4/10","misconceptionId":null}]}', 'bare-computation', 1250),
  ('math-add-fractions-unlike', 'numeric',
   'A recipe needs 1/3 cup of oil and 1/4 cup of water. How many cups of liquid in total?',
   '{"value":"7/12"}', 'word-problem', 1300),
  ('math-add-fractions-unlike', 'numeric',
   'You walk 2/5 of a mile, then 1/2 a mile more. How far have you walked?',
   '{"value":"9/10"}', 'word-problem', 1280),

  ('math-multiply-fractions', 'numeric', 'What is 2/3 x 3/5?',
   '{"value":"6/15","acceptedForms":["2/5"]}', 'bare-computation', 1150),
  ('math-multiply-fractions', 'numeric', 'What is 3/4 of 2/9?',
   '{"value":"6/36","acceptedForms":["1/6"]}', 'word-problem', 1260),

  ('math-solve-one-step', 'numeric', 'Solve for x:  x + 7 = 12', '{"value":5}', 'bare-equation', 1080),
  ('math-solve-one-step', 'numeric', 'Solve for x:  4x = 36', '{"value":9}', 'bare-equation', 1120),
  ('math-solve-one-step', 'numeric',
   'A number increased by 13 gives 31. What is the number?', '{"value":18}', 'word-problem', 1180),

  ('math-solve-two-step', 'numeric', 'Solve for x:  2x + 6 = 10', '{"value":2}', 'bare-equation', 1200),
  ('math-solve-two-step', 'numeric', 'Solve for x:  5x - 3 = 22', '{"value":5}', 'bare-equation', 1240),
  ('math-solve-two-step', 'numeric',
   'A taxi charges $3 to start plus $2 per mile. A ride cost $17. How many miles?',
   '{"value":7}', 'word-problem', 1320),

  ('math-ratio-basics', 'numeric',
   'If 3 pencils cost $1.20, what do 5 pencils cost, in dollars?', '{"value":2,"relTol":0.001}', 'word-problem', 1250),
  ('math-ratio-basics', 'numeric',
   'The ratio of red to blue marbles is 2:3. There are 12 red. How many blue?', '{"value":18}', 'word-problem', 1220),
  -- A second surface context is REQUIRED, not decorative: the mastery gate needs
  -- passes across >= 2 contexts, so a concept banked in one context only can
  -- never reach confirmed however well the learner does.
  ('math-ratio-basics', 'numeric',
   'Solve the proportion for x:   2/5 = x/20', '{"value":8}', 'bare-computation', 1200),
  ('math-ratio-basics', 'numeric',
   'Solve the proportion for x:   x/6 = 9/2', '{"value":27}', 'bare-computation', 1280)
) as i(slug, kind, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Symbolic items — the distributive property, checked by expression equivalence
insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, 'symbolic', 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'verified', 'seed:hand-verified', now()
from kc join (values
  ('math-distribute', 'Expand:  3(x + 4)',
   '{"expr":"3*x + 12","acceptedForms":["3x+12"]}', 'expand', 1150),
  ('math-distribute', 'Expand:  5(2x - 1)',
   '{"expr":"10*x - 5"}', 'expand', 1230),
  ('math-distribute', 'Write an equivalent expression:  2(x + 3) + x',
   '{"expr":"3*x + 6"}', 'simplify', 1310)
) as i(slug, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- Multiple choice — distractors are index-aligned with distractor_misconceptions,
-- so a wrong pick names the actual error instead of just failing.
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
  i.context_tag, i.elo, 'verified', 'seed:hand-verified', now()
from kc join (values
  ('math-compare-fractions', 'Which is larger?',
   '["1/3","1/8","They are equal","Cannot tell"]', '{"index":0}', 'Whole-number bias', 'compare', 1120),
  ('math-compare-fractions', 'Which fraction is closest to 1?',
   '["7/8","1/2","2/3","3/5"]', '{"index":0}', 'Whole-number bias', 'estimate', 1240),
  ('math-equivalent-fractions', 'Which fraction is equivalent to 2/3?',
   '["6/9","2/6","3/4","4/9"]', '{"index":0}', 'Whole-number bias', 'recognise', 1100)
) as i(slug, body, choices, answer_spec, d1, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- ── Aliases ──────────────────────────────────────────────────────────────────
-- What a real syllabus actually calls these, so kcMap resolves common topic
-- strings with zero model calls. Every entry here is one adjudication never paid
-- for, which is the whole economic argument for a shared library.
insert into kc_alias (kc_id, alias_norm, alias_text, subject, confidence, source)
select kc.id, a.norm, a.text, 'math', 1, 'seed'
from kc join (values
  ('math-add-fractions-unlike', 'adding fractions',            'Adding fractions'),
  ('math-add-fractions-unlike', 'adding and subtracting fractions', 'Adding and Subtracting Fractions'),
  ('math-add-fractions-unlike', 'fraction addition',           'Fraction addition'),
  ('math-multiply-fractions',   'multiplying fractions',       'Multiplying fractions'),
  ('math-compare-fractions',    'comparing fractions',         'Comparing fractions'),
  ('math-compare-fractions',    'ordering fractions',          'Ordering fractions'),
  ('math-equivalent-fractions', 'equivalent fractions',        'Equivalent fractions'),
  ('math-equivalent-fractions', 'simplifying fractions',       'Simplifying fractions'),
  ('math-ratio-basics',         'ratios',                      'Ratios'),
  ('math-ratio-basics',         'ratios and proportions',      'Ratios and Proportions'),
  ('math-solve-one-step',       'one step equations',          'One-step equations'),
  ('math-solve-two-step',       'two step equations',          'Two-step equations'),
  ('math-solve-two-step',       'solving linear equations',    'Solving linear equations'),
  ('math-distribute',           'distributive property',       'Distributive property'),
  ('math-distribute',           'expanding brackets',          'Expanding brackets')
) as a(slug, norm, text) on kc.slug = a.slug
on conflict (alias_norm, subject) do nothing;

-- ── Bank repair: clearing the 2-item floor ───────────────────────────────────
-- Found against the live database, not by reading this file.
--
-- math-equivalent-fractions shipped with exactly ONE item. check.js:48 refuses to
-- issue a check on a bank of fewer than two ("bank.length < 2 -> noBank"), so the
-- concept could never be checked, therefore never confirmed. It is also a
-- PREREQUISITE for three of the other seven (add-fractions-unlike,
-- compare-fractions, ratio-basics), and policy.js:62-66 only makes a concept
-- eligible when every prerequisite is confirmed. One missing item silently
-- disabled HALF the seeded curriculum -- the learner just gets
-- 'blocked_on_prereqs' forever with nothing to do about it.
--
-- Neither test caught it. seedBank.test.mjs:128 (the context-coverage test) uses
-- a regex requiring answer_spec immediately before context_tag, and MC rows
-- interpose their choices array -- so the sole equivalent-fractions item was
-- invisible to it. And nothing asserted a minimum item COUNT per concept.
-- web/test/bankInvariants.test.mjs now does both, over every item kind.
--
-- Targets, from the enforcing code rather than taste:
--   >=2 items          check.js:48,77   (below this the concept is a dead end)
--   >=2 context tags   pfa.js:114 + CONFIRM_MIN_CONTEXTS  (below this, unconfirmable)
--   >=6 items ideally  CONFIRM_REQUIRED=4 over ITEMS_PER_KC=3 means two checks are
--                      needed, and elo.js:73 penalises a seen item by 800 -- so
--                      fewer than 6 makes the second check largely a memory test
--                      of the first. Treat 6 as the ship floor, 2 as survival.
--
-- Every answer below is hand-verified arithmetic, tier v1, mechanically checkable.

insert into kc_item (kc_id, kind, tier, body, answer_spec, context_tag, difficulty_elo, status, verified_by, verified_at)
select kc.id, i.kind, 'v1', i.body, i.answer_spec::jsonb, i.context_tag, i.elo, 'verified', 'seed:hand-verified', now()
from kc join (values
  -- math-equivalent-fractions: had 1 item ('recognise'). Add 'generate' + 'simplify'.
  ('math-equivalent-fractions', 'numeric', 'Fill in the blank:  3/4 = ?/12',
   '{"value":"9"}', 'generate', 1090),
  ('math-equivalent-fractions', 'numeric', 'Fill in the blank:  2/5 = 8/?',
   '{"value":"20"}', 'generate', 1170),
  ('math-equivalent-fractions', 'numeric', 'Write 6/8 in simplest form.',
   '{"value":"3/4"}', 'simplify', 1120),
  ('math-equivalent-fractions', 'numeric', 'Write 15/25 in simplest form.',
   '{"value":"3/5"}', 'simplify', 1200),
  ('math-equivalent-fractions', 'numeric', 'Write 12/18 in simplest form.',
   '{"value":"2/3"}', 'simplify', 1240),

  -- math-compare-fractions: had 2 (compare, estimate). A wrong pick here is the
  -- whole-number-bias misconception, already catalogued for this KC.
  ('math-compare-fractions', 'numeric',
   'Which is larger, 3/5 or 5/8? Write the larger fraction.',
   '{"value":"5/8"}', 'compare', 1210),
  ('math-compare-fractions', 'numeric',
   'Which is larger, 7/10 or 2/3? Write the larger fraction.',
   '{"value":"7/10"}', 'compare', 1260),
  ('math-compare-fractions', 'numeric',
   'A jug is 5/6 full. Another is 4/5 full. Which fraction is the fuller jug?',
   '{"value":"5/6"}', 'word-problem', 1300),

  -- math-multiply-fractions: had 2.
  ('math-multiply-fractions', 'numeric',
   'What is 2/3 x 3/5? Give your answer as a fraction in simplest form.',
   '{"value":"2/5"}', 'bare-computation', 1180),
  ('math-multiply-fractions', 'numeric',
   'A recipe needs 3/4 cup of sugar. You are making half the recipe. How much sugar?',
   '{"value":"3/8"}', 'word-problem', 1250)
) as i(slug, kind, body, answer_spec, context_tag, elo) on kc.slug = i.slug
where not exists (select 1 from kc_item x where x.kc_id = kc.id and x.body = i.body);

-- ── MC validity: the correct answer was ALWAYS choice 0 ──────────────────────
-- Verified against the live database: all three seeded multiple-choice items had
-- answer_spec = {"index":0}. A learner who always taps the first option scores
-- 100% on every MC item in the bank -- and MC is a tier-v2 CONFIRMING kind, so
-- that fabricates confirmed mastery from no knowledge at all. It is the same
-- class of defect as leaking the answer key, just quieter.
--
-- Reordered to indices 2, 3, 1. `distractor_misconceptions` is index-aligned with
-- `choices` (position 1 carries "Whole-number bias"), so each new ordering keeps
-- the misconception distractor at position 1 and moves only the correct answer.
-- A wrong pick therefore still diagnoses rather than merely failing.
--
-- Guarded on index = '0' so re-running the seed does not shuffle them again.

update kc_item set
  choices = '["They are equal","1/8","1/3","Cannot tell"]'::jsonb,
  answer_spec = jsonb_set(answer_spec, '{index}', '2'::jsonb)
where kind = 'mc' and body = 'Which is larger?' and answer_spec->>'index' = '0';

update kc_item set
  choices = '["3/5","1/2","2/3","7/8"]'::jsonb,
  answer_spec = jsonb_set(answer_spec, '{index}', '3'::jsonb)
where kind = 'mc' and body = 'Which fraction is closest to 1?' and answer_spec->>'index' = '0';

-- This one's distractor_misconceptions is all-null (its lookup found no matching
-- misconception on equivalent-fractions), so only the ordering changes.
update kc_item set
  choices = '["4/9","6/9","2/6","3/4"]'::jsonb,
  answer_spec = jsonb_set(answer_spec, '{index}', '1'::jsonb)
where kind = 'mc' and body = 'Which fraction is equivalent to 2/3?' and answer_spec->>'index' = '0';
