# Algebra I item bank — human sign-off checklist

**File under review:** `supabase/seed_kc_algebra1.sql`
**Status:** 15 concepts, 90 items, **all `status = 'draft'`** — not one of them can
be served to a student today (`check.js` selects `status = 'verified'`).
**Drafted:** 2026-08-13, branch `claude/workflows-superpowers-fixes-nf36pc`.

## Why this needs a human

`seed_kc.sql` sets the standard and this file inherits it verbatim:

> Every item here is hand-verified. That standard is not optional: a confidently
> wrong item teaches a wrong thing and destroys trust faster than a missing
> feature. **LLM-drafted items must pass solver agreement + second-model critique
> + human sign-off before status becomes 'verified'.**

Solver agreement and second-model critique are **done**. Human sign-off is **not**,
and the promotion SQL is deliberately kept out of the seed file so that running the
seed can never make this bank live by accident. `web/test/draftBank.test.mjs` fails
the build if a promotion statement or a stray `'verified'` ever appears in it.

## What was already done (so you are not re-doing it)

Each concept was authored by one pass, then **re-solved from scratch by an
independent second pass that solved before it looked at the stored key**:

- Every numeric answer back-substituted into the item's *original wording* — not
  the author's restatement of it.
- Every symbolic key round-tripped through the real verifier
  (`web/lib/engine/verify/symbolic.js`) against the forms a student would actually
  type (`3x+2`, `(1/2)x - 3`, `500-20x`, unicode minus), and against each named
  misconception value to confirm it *fails*.
- Two slices were additionally executed against a throwaway Postgres cluster with
  the real `0012` table shapes, twice, to prove the file is idempotent.

**Zero wrong answer keys were found across all 90 items.** Eleven other defects
were found and fixed: ambiguous stems ("half of a number, decreased by 3" has two
readings), two geometrically impossible area items (the requested "length" was
shorter than the width on the whole valid domain), unreachable misconception rows
whose label lookups would have stored nulls, and several false claims in the
files' own comment blocks.

## The one that decides whether you promote everything or most of it

**A symbolic verifier compares VALUES, not FORM.** On a "factor this" item, an
answer that factors nothing but is algebraically equivalent is accepted: typing
`(x^2 + 7x + 12)/(x + 3)` into the trinomial blank passes on 7 of the 10 symbolic
factoring items. The other 3 reject it for a reason with no pedagogical content —
their divisor is a monomial that is zero at a sample point, so the verifier's
domain guard bails. Same student behaviour, scored two different ways.

Mitigation applied: every factoring stem now demands "an expression in simplest
form", so the strict rejections are at least defensible and the student has notice.
The leniency on the other 7 is real and **not closed**.

**This affects `math-factor-gcf` and `math-factor-trinomial` only.** Your options:

1. Promote them anyway — a student who can produce an equivalent quotient has done
   real algebra, just not the algebra the item asked for.
2. Hold those two concepts as draft and promote the other 13.
3. Add a structural verifier (`CONFIRMING_VERIFIERS` already contemplates
   `structural`) that can see form, then promote.

Nothing else in the bank depends on that decision — the other 13 concepts grade on
values that are unambiguous.

## Other judgement calls flagged by the drafting passes

- **`math-literal-equations`:** `mathExpr.js` compiles expressions in `x` only, so
  "solve `A = lw` for `w`" is ungradeable (the answer has two free letters, and a
  correct student would be recorded as an *unassisted failure* — the worst outcome
  the engine has). Every symbolic item is therefore posed so the remaining variable
  is `x`, and the second context is reached with numeric rearrange-then-evaluate
  items. Consequence: for this concept, item kind correlates perfectly with context
  tag, so Elo selection cannot mix kinds within a context.
- **Percent items** say "answer with a number only, no percent sign" because
  `parseNumber()` reads a trailing `%` as ×0.01, so `25%` arrives as `0.25` and
  would fail against `{"value":25}`. Verified empirically, not assumed.
- **`math-solve-inequalities`:** the sign-flip rule is tested on the MC item, since
  no numeric item can distinguish `x < -5` from `x > -5` (same boundary). The two
  "the solution can be written x ≤ k" items therefore test isolation arithmetic,
  not the flip. Worth a second opinion on whether that split is right.
- **No `kc_alias` rows were authored.** `kcMap` cannot resolve a syllabus string
  like "combining like terms" to these concepts until aliases are added, so intake
  will not auto-map to the new chain yet.

## How to promote, once you have signed off

Not in the seed file, on purpose. Run against the database, per concept, only for
the concepts you actually reviewed:

```sql
update kc_item set status = 'verified', verified_by = '<your name>', verified_at = now()
where status = 'draft'
  and kc_id in (select id from kc where slug in ('math-combine-like-terms', ...));
```

Then re-run the live-bank check: every promoted concept must show ≥6 items across
≥2 context tags, and `issueCheck` must stop returning `noBank` for it.

## The items

Tick each row you have personally verified. `stored answer` is what the engine will
grade against.


### `math-solve-variables-both-sides` — 6 items · bare-equation ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Solve for x:   5x - 3 = 2x + 12 | `{"value":5,"misconceptionValues":[{"value":3,"misconceptionId":null}]}` | bare-equation | 1160 |
| ☐ | numeric | Solve for x:   4x - 9 = 7x + 6 | `{"value":-5}` | bare-equation | 1310 |
| ☐ | numeric | Plan A costs $30 to join plus $20 each month. Plan B costs $70 to join plus $15 each month. After how many months do the two plans cost the same tot… | `{"value":8}` | word-problem | 1240 |
| ☐ | numeric | One candle is 20 cm tall and burns down 2 cm every hour. A second candle is 32 cm tall and burns down 4 cm every hour. After how many hours are the … | `{"value":6}` | word-problem | 1300 |
| ☐ | numeric | One student has $80 saved and adds $15 each week. Another has $200 saved and spends $25 each week. After how many weeks do they have the same amount? | `{"value":3}` | word-problem | 1340 |
| ☐ | mc | Solve for x:   7x + 2 = 3x + 18 | `{"index":3}` | bare-equation | 1220 |

### `math-solve-multistep` — 6 items · bare-equation ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Solve for x:   2(3x - 1) = 4(x + 3) | `{"value":7}` | bare-equation | 1330 |
| ☐ | numeric | Solve for x:   x/3 + x/4 = 7 | `{"value":12,"misconceptionValues":[{"value":49,"misconceptionId":null}]}` | bare-equation | 1390 |
| ☐ | numeric | A rectangle is 4 cm longer than it is wide. Its perimeter is 36 cm. How wide is the rectangle, in centimeters? | `{"value":7}` | word-problem | 1290 |
| ☐ | numeric | A club charges a $12 registration fee plus $5 for each session attended. Three students each register, and each attends the same number of sessions.… | `{"value":7}` | word-problem | 1350 |
| ☐ | numeric | When 3 is subtracted from half of a number, the result is one third of that number. What is the number? | `{"value":18}` | word-problem | 1400 |
| ☐ | mc | Solve for x:   2(x + 4) = 20 | `{"index":0}` | bare-equation | 1250 |

### `math-combine-like-terms` — 6 items · bare-expression ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | symbolic | Simplify:   5x + 4 + 2x - 9 | `{"expr":"7*x - 5","acceptedForms":["7x-5"]}` | bare-expression | 1120 |
| ☐ | symbolic | Simplify:   4(x + 2) + 3x | `{"expr":"7*x + 8"}` | bare-expression | 1240 |
| ☐ | symbolic | A rectangle has width x + 5 and length 2x. Write a simplified expression for its perimeter. | `{"expr":"6*x + 10","acceptedForms":["6x+10"]}` | word-problem | 1180 |
| ☐ | symbolic | A triangle has sides of length 2x, 3x - 1 and x + 7. Write a simplified expression for its perimeter. | `{"expr":"6*x + 6"}` | word-problem | 1230 |
| ☐ | symbolic | A shop sells notebooks for x dollars each and pens for 3 dollars each. You buy 4 notebooks and 2 pens, then go back and buy 3 more notebooks. Write … | `{"expr":"7*x + 6"}` | word-problem | 1290 |
| ☐ | mc | Which expression is 5x + 3 + 2x in simplest form? | `{"index":2}` | bare-expression | 1060 |

### `math-literal-equations` — 6 items · formula-in-context ×3 · bare-equation ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | The perimeter of a rectangle is P = 2l + 2w. Rearrange it to give w, then find w when P = 30 and l = 9. | `{"value":6,"misconceptionValues":[{"value":12,"misconceptionId":null}]}` | formula-in-context | 1150 |
| ☐ | numeric | The area of a triangle is A = (1/2)bh. Rearrange it to give h, then find h when A = 24 and b = 6. | `{"value":8}` | formula-in-context | 1230 |
| ☐ | numeric | Fahrenheit and Celsius are related by F = (9/5)C + 32. Rearrange it to give C, then find C when F = 68. | `{"value":20}` | formula-in-context | 1330 |
| ☐ | symbolic | Solve for y:  3x + y = 12.  Enter the expression for y only, without "y =". | `{"expr":"12 - 3*x","acceptedForms":["-3x + 12"]}` | bare-equation | 1080 |
| ☐ | symbolic | Solve for y:  2y - 5x = 8.  Enter the expression for y only, without "y =". | `{"expr":"(8 + 5*x)/2","acceptedForms":["4 + 2.5*x"]}` | bare-equation | 1190 |
| ☐ | symbolic | Solve for y:  4x - 2y = 10.  Enter the expression for y only, without "y =". | `{"expr":"2*x - 5","acceptedForms":["(4*x - 10)/2"]}` | bare-equation | 1300 |

### `math-solve-inequalities` — 6 items · bare-inequality ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Solve for x:  5x - 3 <= 17.  The solution can be written x <= k. What is k? | `{"value":4,"misconceptionValues":[{"value":2.8,"misconceptionId":null}]}` | bare-inequality | 1100 |
| ☐ | numeric | Solve for x:  -2x + 1 > 9.  The solution can be written x < k. What is k? | `{"value":-4}` | bare-inequality | 1250 |
| ☐ | numeric | A club charges a 12 dollar joining fee plus 4 dollars per month. You can spend at most 60 dollars in total. What is the greatest whole number of mon… | `{"value":12}` | word-problem | 1180 |
| ☐ | numeric | An empty delivery van weighs 900 kg. Loaded, it may weigh at most 1500 kg. Each box weighs 25 kg. What is the greatest number of boxes it can carry? | `{"value":24}` | word-problem | 1240 |
| ☐ | numeric | A tank contains 120 liters of water and drains at 8 liters per minute. What is the smallest whole number of minutes after which fewer than 50 liters… | `{"value":9}` | word-problem | 1360 |
| ☐ | mc | Solve for x:  -4x > 20.  Which describes every solution? | `{"index":2}` | bare-inequality | 1310 |

### `math-percent-change` — 6 items · bare-computation ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Increase 60 by 25%. What is the result? | `{"value":75}` | bare-computation | 1090 |
| ☐ | numeric | Decrease 250 by 12%. What is the result? | `{"value":220,"misconceptionValues":[{"value":30,"misconceptionId":null}]}` | bare-computation | 1170 |
| ☐ | numeric | A quantity changes from 40 to 50. What is the percent increase? Answer with a number only, no percent sign. | `{"value":25,"misconceptionValues":[{"value":20,"misconceptionId":null}]}` | bare-computation | 1250 |
| ☐ | numeric | A jacket costs 80 dollars. In a sale the price is reduced by 15%. What is the sale price, in dollars? | `{"value":68}` | word-problem | 1210 |
| ☐ | numeric | The population of a town grows from 4500 to 4860. What is the percent increase? Answer with a number only, no percent sign. | `{"value":8}` | word-problem | 1300 |
| ☐ | mc | A coat priced at 200 dollars is marked up 10%, and the new price is later marked down 10%. What is the final price? | `{"index":3}` | word-problem | 1390 |

### `math-slope-two-points` — 6 items · bare-points ×3 · table ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Find the slope of the line through the points (1, 2) and (3, 8). | `{"value":3,"misconceptionValues":[{"value":"1/3","misconceptionId":null}]}` | bare-points | 1080 |
| ☐ | numeric | Find the slope of the line through the points (-2, 5) and (4, -7). | `{"value":-2,"misconceptionValues":[{"value":2,"misconceptionId":null}]}` | bare-points | 1180 |
| ☐ | numeric | Find the slope of the line through the points (2, 3) and (6, 9). Give your answer as a fraction. | `{"value":"3/2","misconceptionValues":[{"value":"2/3","misconceptionId":null}]}` | bare-points | 1240 |
| ☐ | numeric | A line passes through every point in this table.   x: 0, 1, 2, 3   y: 5, 8, 11, 14.   What is the slope of the line? | `{"value":3}` | table | 1150 |
| ☐ | numeric | A line passes through every point in this table.   x: 2, 5, 8   y: 10, 4, -2.   What is the slope of the line? | `{"value":-2}` | table | 1220 |
| ☐ | numeric | A line passes through every point in this table.   x: 1, 5, 9   y: 3, 5, 7.   What is the slope of the line? Give your answer as a fraction. | `{"value":"1/2"}` | table | 1300 |

### `math-slope-intercept` — 6 items · bare-equation ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | For the line y = 3x - 4, what is the slope? | `{"value":3}` | bare-equation | 1060 |
| ☐ | numeric | The equation 3x + y = 7 is rewritten in the form y = mx + b. What is the value of m? | `{"value":-3,"misconceptionValues":[{"value":3,"misconceptionId":null}]}` | bare-equation | 1280 |
| ☐ | numeric | A phone plan costs a one-time setup fee of $25 plus $12 each month. The total cost after x months is written as y = mx + b. What is the value of b? | `{"value":25,"misconceptionValues":[{"value":12,"misconceptionId":null}]}` | word-problem | 1140 |
| ☐ | symbolic | A line has slope 1/2 and crosses the y-axis at -3. Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not type the … | `{"expr":"x/2 - 3","acceptedForms":["0.5*x - 3"]}` | bare-equation | 1200 |
| ☐ | mc | A gym charges a one-time joining fee of $30 plus $15 for each month you stay. The total cost after x months is y = 15x + 30. What does the 30 tell y… | `{"index":2}` | word-problem | 1160 |
| ☐ | mc | A candle burns at a steady rate. Its height in centimetres after x hours is y = 20 - 2.5x. What does the -2.5 tell you? | `{"index":3}` | word-problem | 1300 |

### `math-write-linear-equation` — 6 items · bare-points ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | symbolic | A line has slope 4 and passes through the point (0, -1). Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not typ… | `{"expr":"4*x - 1","acceptedForms":["4x-1"]}` | bare-points | 1120 |
| ☐ | symbolic | A line has slope 2 and passes through the point (3, 7). Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not type… | `{"expr":"2*x + 1","acceptedForms":["2x+1"],"misconceptionExprs":[{"expr":"2*x + 7","misc…` | bare-points | 1250 |
| ☐ | symbolic | A line passes through the points (1, 5) and (4, 14). Write it in slope-intercept form. Type the right-hand side only, in terms of x — do not type th… | `{"expr":"3*x + 2","acceptedForms":["3x+2"],"misconceptionExprs":[{"expr":"3*x + 5","misc…` | bare-points | 1340 |
| ☐ | symbolic | A pool holds 500 liters and is draining at 20 liters per hour. Write an expression for the number of liters left after x hours. Type the expression … | `{"expr":"500 - 20*x","acceptedForms":["-20x + 500"]}` | word-problem | 1180 |
| ☐ | symbolic | An after-school club charges a $40 membership fee plus $6 for each class you attend. Write an expression for the total cost in dollars after x class… | `{"expr":"6*x + 40","acceptedForms":["6x+40"]}` | word-problem | 1220 |
| ☐ | symbolic | A print shop charges the same amount for each shirt plus one fixed setup fee. 5 shirts cost $65 and 12 shirts cost $135. Write an expression for the… | `{"expr":"10*x + 15","acceptedForms":["10x+15"]}` | word-problem | 1400 |

### `math-systems-substitution` — 6 items · bare-system ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Solve this system by substitution:  y = 2x + 1  and  3x + y = 11.  What is the value of x? | `{"value":2,"misconceptionValues":[{"value":2.2,"misconceptionId":null}]}` | bare-system | 1080 |
| ☐ | numeric | Solve this system by substitution:  y = x - 4  and  2x + 3y = 3.  What is the value of y? | `{"value":-1,"misconceptionValues":[{"value":3,"misconceptionId":null}]}` | bare-system | 1190 |
| ☐ | numeric | Solve this system by substitution:  x = 3y + 2  and  2x - y = 14.  What is the value of x? | `{"value":8,"misconceptionValues":[{"value":2,"misconceptionId":null}]}` | bare-system | 1270 |
| ☐ | numeric | Two numbers add up to 30. The larger number is 3 more than twice the smaller number. What is the smaller number? | `{"value":9}` | word-problem | 1150 |
| ☐ | numeric | Adult tickets cost 12 dollars and student tickets cost 8 dollars. A group buys 10 tickets in total, all of them adult or student, and pays 96 dollar… | `{"value":4}` | word-problem | 1250 |
| ☐ | numeric | The perimeter of a rectangle is 54 cm. Its length is 5 cm more than its width. What is the width, in cm? | `{"value":11}` | word-problem | 1330 |

### `math-systems-elimination` — 6 items · bare-system ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Solve this system by elimination:  3x + 4y = 10  and  5x - 4y = 6.  What is the value of x? | `{"value":2,"misconceptionValues":[{"value":1.25,"misconceptionId":null}]}` | bare-system | 1100 |
| ☐ | numeric | Solve this system by elimination:  x + 3y = 13  and  2x - y = 5.  What is the value of x? | `{"value":4,"misconceptionValues":[{"value":7,"misconceptionId":null}]}` | bare-system | 1310 |
| ☐ | numeric | The sum of two numbers is 54 and their difference is 12. What is the larger number? | `{"value":33}` | word-problem | 1160 |
| ☐ | numeric | One evening a theater sold only adult and child tickets: 90 tickets in total, for 870 dollars. Adult tickets cost 11 dollars and child tickets cost … | `{"value":60}` | word-problem | 1270 |
| ☐ | numeric | Three coffees and two teas cost 18 dollars. Three coffees and five teas cost 27 dollars. What does one coffee cost, in dollars? | `{"value":4}` | word-problem | 1350 |
| ☐ | mc | Which single move eliminates a variable from this system in one step?  4x + 3y = 11  and  2x - 3y = 1 | `{"index":2}` | bare-system | 1210 |

### `math-exponent-rules` — 6 items · numeric-evaluate ×3 · symbolic-simplify ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | What is 2^3 * 2^4? Give your answer as a whole number. | `{"value":128,"misconceptionValues":[{"value":4096,"misconceptionId":null}]}` | numeric-evaluate | 1080 |
| ☐ | numeric | What is 3^5 / 3^3? Give your answer as a whole number. | `{"value":9,"misconceptionValues":[{"value":"1/9","misconceptionId":null}]}` | numeric-evaluate | 1190 |
| ☐ | numeric | What is (3^2)^3? Give your answer as a whole number. | `{"value":729,"misconceptionValues":[{"value":243,"misconceptionId":null}]}` | numeric-evaluate | 1280 |
| ☐ | symbolic | Simplify:  x^3 * x^4.  Write your answer as a single power of x. | `{"expr":"x^7","misconceptionExprs":[{"expr":"x^12","misconceptionId":null}]}` | symbolic-simplify | 1050 |
| ☐ | symbolic | Simplify:  x^9 / x^4.  Write your answer as a single power of x. | `{"expr":"x^5","misconceptionExprs":[{"expr":"1/x^5","misconceptionId":null}]}` | symbolic-simplify | 1170 |
| ☐ | mc | Which expression is equivalent to (2x^3)^2? | `{"index":3}` | symbolic-simplify | 1300 |

### `math-solve-quadratic-factoring` — 6 items · bare-equation ×3 · word-problem ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | numeric | Solve by factoring:  x^2 - 7x + 12 = 0.  Write the LARGER of the two solutions. | `{"value":4,"misconceptionValues":[{"value":3,"misconceptionId":null}]}` | bare-equation | 1200 |
| ☐ | numeric | Solve by factoring:  x^2 + 5x = 0.  Write the solution that is not zero. | `{"value":-5,"misconceptionValues":[{"value":5,"misconceptionId":null}]}` | bare-equation | 1240 |
| ☐ | numeric | The product of two consecutive positive integers is 72. What is the smaller integer? | `{"value":8}` | word-problem | 1260 |
| ☐ | numeric | A rectangle is 3 units longer than it is wide, and its area is 40 square units. How many units wide is it? | `{"value":5,"misconceptionValues":[{"value":8,"misconceptionId":null}]}` | word-problem | 1290 |
| ☐ | numeric | A ball is thrown upward from the ground. Its height in feet after t seconds is -16t^2 + 32t. At what time t, with t greater than 0, is the ball back… | `{"value":2,"misconceptionValues":[{"value":0,"misconceptionId":null}]}` | word-problem | 1340 |
| ☐ | mc | The equation (x - 3)(x + 5) = 0 is already factored. Which is the complete solution? | `{"index":3}` | bare-equation | 1130 |

### `math-factor-gcf` — 6 items · bare-expression ×3 · area-model ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | symbolic | Fill in the blank with an expression in simplest form so both sides are equal:  6x + 9 = 3(____) | `{"expr":"2*x + 3","acceptedForms":["2x+3"],"misconceptionExprs":[{"expr":"2*x + 9","misc…` | bare-expression | 1070 |
| ☐ | symbolic | Fill in the blank with an expression in simplest form so both sides are equal:  10x^2 - 15x = 5x(____) | `{"expr":"2*x - 3","acceptedForms":["2x-3"],"misconceptionExprs":[{"expr":"2*x^2 - 3","mi…` | bare-expression | 1170 |
| ☐ | symbolic | A rectangle has area 6x^2 + 15x square units and width 3x units. Write an expression in simplest form for its length. | `{"expr":"2*x + 5","acceptedForms":["2x+5"]}` | area-model | 1230 |
| ☐ | symbolic | A rectangular banner has area 20x^2 - 12x square units and width 4x units. Write an expression in simplest form for its length. | `{"expr":"5*x - 3","acceptedForms":["5x-3"]}` | area-model | 1270 |
| ☐ | symbolic | A rectangle has area 7x^2 + 28x square units and one side is (x + 4) units. Write an expression in simplest form for the other side. | `{"expr":"7*x","acceptedForms":["7x"]}` | area-model | 1330 |
| ☐ | mc | Which of these shows 8x^2 + 12x factored with the GREATEST common factor pulled out? | `{"index":2}` | bare-expression | 1210 |

### `math-factor-trinomial` — 6 items · bare-expression ×3 · area-model ×3

| ✓ | kind | item | stored answer | tag | elo |
|---|---|---|---|---|---|
| ☐ | symbolic | Fill in the blank with an expression in simplest form so both sides are equal:  x^2 + 7x + 12 = (x + 3)(____) | `{"expr":"x + 4","acceptedForms":["(x+4)"]}` | bare-expression | 1120 |
| ☐ | symbolic | Fill in the blank with an expression in simplest form so both sides are equal:  x^2 - 2x - 15 = (x - 5)(____) | `{"expr":"x + 3","acceptedForms":["(x+3)"],"misconceptionExprs":[{"expr":"x - 3","misconc…` | bare-expression | 1250 |
| ☐ | symbolic | A rectangle has area x^2 + 9x + 20 square units and width (x + 4) units. Write an expression in simplest form for its length. | `{"expr":"x + 5","acceptedForms":["(x+5)"]}` | area-model | 1240 |
| ☐ | symbolic | A rectangle has area x^2 + 3x - 10 square units and one side is (x + 5) units. Write an expression in simplest form for the other side. | `{"expr":"x - 2","acceptedForms":["(x-2)"]}` | area-model | 1310 |
| ☐ | symbolic | A rectangular rug has area x^2 - 7x + 10 square units and length (x - 2) units. Write an expression in simplest form for its width. | `{"expr":"x - 5","acceptedForms":["(x-5)"]}` | area-model | 1350 |
| ☐ | mc | Which is the correct factorization of x^2 + 8x + 12? | `{"index":1}` | bare-expression | 1190 |
