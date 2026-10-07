# Item bank review

0 of 118 items reviewed. **The tutor shows a learner nothing from this file until `reviewed_by` and `reviewed_at` are set on that item** in `lib/tutor/content/item-bank.json`. Ticking a box here changes nothing on its own; the JSON is the record.

## How to review one

For each item, four questions:

1. **Is the answer right?** Work it yourself before looking.
2. **Is exactly one option right?** A second defensible answer makes the item unusable, however good the reasoning.
3. **Does each wrong option come from a real mistake?** The tag beside it names the misconception it is meant to catch. A distractor nobody would ever pick teaches us nothing about the learner.
4. **Would the child you have in mind understand the question?** Read the stem out loud. If it needs re-reading, rewrite it.

Then set `reviewed_by` (your name or initials) and `reviewed_at` (`YYYY-MM-DD`) on that item in the JSON. Change anything you like while you are there — the wording is a draft, not a proposal.

## F1 — Fraction as part of a whole; unit fractions

0 of 8 reviewed.

### [ ] `F1-bar-001`

*single · bar · ages both*

> A chocolate bar is cut into 5 equal pieces. Sam eats 1 piece. What fraction of the bar did Sam eat?

- A. $\frac{1}{5}$ — **correct**
- B. $\frac{4}{5}$ — wrong — `computation`
- C. $\frac{5}{1}$ — wrong — `whole_number_bias`
- D. $\frac{1}{4}$ — wrong — `computation`

Why: One piece out of five equal pieces is one fifth. Four fifths is what is left, not what was eaten.

### [ ] `F1-set-002`

*single · set · ages both*

> A bag holds 12 marbles and 3 of them are red. What fraction of the marbles are red?

- A. $\frac{3}{12}$ — **correct**
- B. $\frac{12}{3}$ — wrong — `whole_number_bias`
- C. $\frac{9}{12}$ — wrong — `computation`
- D. $\frac{3}{9}$ — wrong — `computation`

Why: The denominator counts everything in the set: 12 marbles. Three of them are red, so three twelfths.

### [ ] `F1-bar-003`

*numeric · bar · ages both*

> A bar is split into equal parts, and one of those parts is $\frac{1}{7}$ of the whole bar. How many parts is the bar split into?

- Answer: 7

Why: The bottom number of a unit fraction is the number of equal parts the whole was cut into.

### [ ] `F1-word-004`

*single · word · ages both*

> Which of these is a unit fraction?

- A. $\frac{1}{9}$ — **correct**
- B. $\frac{2}{9}$ — wrong — `computation`
- C. $\frac{9}{1}$ — wrong — `whole_number_bias`
- D. $\frac{9}{9}$ — wrong — `computation`

Why: A unit fraction is one single part of a whole, so its top number is 1.

### [ ] `F1-bar-005`

*single · bar · ages both*

> Two ribbons are exactly the same length. One is cut into 3 equal pieces, the other into 8. Which single piece is longer?

- A. One piece from the ribbon cut into 3 — **correct**
- B. One piece from the ribbon cut into 8 — wrong — `denominator_magnitude`
- C. They are the same length — wrong — `denominator_magnitude`
- D. There is no way to tell — wrong — `denominator_magnitude`

Why: The same ribbon cut into more pieces gives smaller pieces. A bigger bottom number means a smaller piece.

### [ ] `F1-set-006`

*numeric · set · ages both*

> A class has 24 students and one quarter of them walk to school. How many students walk?

- Answer: 6

Why: One quarter means one of four equal groups. 24 split into 4 groups is 6 in each group.

### [ ] `F1-sym-007`

*single · symbolic · ages 13-17*

> In the fraction $\frac{3}{4}$, what does the 4 tell you?

- A. How many equal parts the whole was divided into — **correct**
- B. How many parts are being counted — wrong — `computation`
- C. That the fraction is worth 4 — wrong — `whole_number_bias`
- D. That the whole is 4 times bigger — wrong — `whole_number_bias`

Why: The bottom number names the size of the parts by saying how many of them make one whole. The top number counts them.

### [ ] `F1-nl-008`

*short · number_line · ages both*

> A number line runs from 0 to 1 and is split into 5 equal steps. What fraction sits at the first mark after 0?

- Answer: 1/5 (also accepts: 1/5, one fifth, 0.2, a fifth)

Why: Five equal steps from 0 to 1 makes each step one fifth, so the first mark is at one fifth.

## F2 — Fractions on a number line

0 of 8 reviewed.

### [ ] `F2-nl-001`

*single · number_line · ages both*

> A number line runs from 0 to 1 with 4 equal steps marked. Which fraction sits at the third mark after 0?

- A. $\frac{3}{4}$ — **correct**
- B. $\frac{3}{3}$ — wrong — `computation`
- C. $\frac{4}{3}$ — wrong — `whole_number_bias`
- D. $\frac{1}{3}$ — wrong — `computation`

Why: Four equal steps make each step one quarter. Three steps along is three quarters.

### [ ] `F2-nl-002`

*single · number_line · ages both*

> On a number line from 0 to 1, which fraction sits closest to 1?

- A. $\frac{7}{8}$ — **correct**
- B. $\frac{1}{8}$ — wrong — `computation`
- C. $\frac{1}{2}$ — wrong — `computation`
- D. $\frac{2}{3}$ — wrong — `denominator_magnitude`

Why: Seven eighths is only one eighth short of the whole, and one eighth is a very small step.

### [ ] `F2-nl-003`

*numeric · number_line · ages both*

> A number line from 0 to 2 is split into equal steps of $\frac{1}{2}$. How many steps does it take to get from 0 to 2?

- Answer: 4

Why: Two halves make one whole, so two wholes take four halves.

### [ ] `F2-nl-004`

*single · number_line · ages 13-17*

> Where does $\frac{5}{4}$ sit on a number line?

- A. Between 1 and 2 — **correct**
- B. Between 0 and 1 — wrong — `whole_number_bias`
- C. Exactly at 5 — wrong — `whole_number_bias`
- D. Between 4 and 5 — wrong — `whole_number_bias`

Why: Four quarters make 1, so five quarters is one whole and a quarter more — just past 1.

### [ ] `F2-nl-005`

*single · number_line · ages both*

> Two number lines both run from 0 to 1. One is split into 3 equal steps, the other into 6. Which line has the smaller steps?

- A. The one split into 6 — **correct**
- B. The one split into 3 — wrong — `denominator_magnitude`
- C. The steps are the same size — wrong — `denominator_magnitude`
- D. It depends how long the lines are drawn — wrong — `denominator_magnitude`

Why: Both lines cover the same distance, so cutting it into more steps makes each step shorter.

### [ ] `F2-nl-006`

*short · number_line · ages both*

> A number line from 0 to 1 is split into 10 equal steps. What fraction sits halfway along it?

- Answer: 5/10 (also accepts: 5/10, 1/2, one half, 0.5, a half, five tenths)

Why: Halfway is 5 steps of the 10, which is five tenths — the same place as one half.

### [ ] `F2-nl-007`

*numeric · number_line · ages both*

> On a number line, how many steps of $\frac{1}{3}$ does it take to travel from 0 to 1?

- Answer: 3

Why: Three thirds make one whole, so it takes three steps.

### [ ] `F2-sym-008`

*single · symbolic · ages 13-17*

> Which fraction is further from 0 on a number line, $\frac{2}{5}$ or $\frac{2}{9}$?

- A. $\frac{2}{5}$ — **correct**
- B. $\frac{2}{9}$ — wrong — `denominator_magnitude`
- C. They are the same distance — wrong — `whole_number_bias`
- D. There is not enough information — wrong — `denominator_magnitude`

Why: Both count 2 pieces, but fifths are bigger pieces than ninths, so two fifths reaches further.

## F3 — Equivalent fractions

0 of 11 reviewed.

### [ ] `F3-bar-001`

*single · bar · ages both*

> Which fraction is the same amount as $\frac{1}{2}$?

- A. $\frac{3}{6}$ — **correct**
- B. $\frac{1}{6}$ — wrong — `equivalence_as_change`
- C. $\frac{2}{3}$ — wrong — `whole_number_bias`
- D. $\frac{6}{3}$ — wrong — `whole_number_bias`

Why: Cutting each half into 3 gives 6 pieces and takes 3 of them. More pieces, same amount of bar.

### [ ] `F3-sym-002`

*numeric · symbolic · ages both*

> Fill in the missing number: $\frac{2}{3} = \frac{?}{12}$

- Answer: 8

Why: Twelve is 3 multiplied by 4, so the top must also be multiplied by 4: 2 times 4 is 8.

### [ ] `F3-word-003`

*single · word · ages both*

> You multiply both the top and the bottom of a fraction by 5. What happens to its value?

- A. It stays exactly the same — **correct**
- B. It gets 5 times bigger — wrong — `equivalence_as_change`
- C. It gets 5 times smaller — wrong — `equivalence_as_change`
- D. It gets 10 times bigger — wrong — `whole_number_bias`

Why: You have cut every piece into 5 smaller pieces and taken 5 times as many. Same amount, different name.

### [ ] `F3-set-004`

*single · set · ages both*

> In a bag of 20 counters, 5 are blue. Which fraction also describes the blue share?

- A. $\frac{1}{4}$ — **correct**
- B. $\frac{1}{5}$ — wrong — `computation`
- C. $\frac{5}{15}$ — wrong — `computation`
- D. $\frac{15}{20}$ — wrong — `computation`

Why: Five out of twenty groups as one out of every four counters, so five twentieths is one quarter.

### [ ] `F3-sym-005`

*numeric · symbolic · ages 13-17*

> Fill in the missing number: $\frac{?}{15} = \frac{3}{5}$

- Answer: 9

Why: Fifteen is 5 multiplied by 3, so the top must also be multiplied by 3: 3 times 3 is 9.

### [ ] `F3-bar-006`

*single · bar · ages both*

> A bar shows $\frac{4}{8}$ shaded. Which of these is the same amount?

- A. $\frac{1}{2}$ — **correct**
- B. $\frac{1}{4}$ — wrong — `equivalence_as_change`
- C. $\frac{4}{4}$ — wrong — `computation`
- D. $\frac{8}{4}$ — wrong — `whole_number_bias`

Why: Four of eight equal pieces is exactly half the bar.

### [ ] `F3-sym-007`

*short · symbolic · ages 13-17*

> Write a fraction equivalent to $\frac{3}{4}$ with a denominator of 20.

- Answer: 15/20 (also accepts: 15/20, 15 / 20, fifteen twentieths)

Why: Twenty is 4 multiplied by 5, so the top is 3 multiplied by 5, which is 15.

### [ ] `F3-nl-008`

*single · number_line · ages 13-17*

> On a number line, where does $\frac{6}{8}$ sit compared with $\frac{3}{4}$?

- A. In exactly the same place — **correct**
- B. A little to the right of it — wrong — `equivalence_as_change`
- C. A little to the left of it — wrong — `equivalence_as_change`
- D. Twice as far along — wrong — `whole_number_bias`

Why: Six eighths and three quarters are two names for the same point.

### [ ] `F3-ka-001`

*single · symbolic · ages both*

> Which fraction is equivalent to $\frac{2}{3}$?

- A. $\frac{4}{9}$ — wrong — `equivalence_as_change`
- B. $\frac{6}{9}$ — **correct**
- C. $\frac{2}{6}$ — wrong — `equivalence_as_change`
- D. $\frac{3}{4}$ — wrong — `equivalence_as_change`

Why: Multiply top and bottom by the same number: 2 times 3 over 3 times 3 is 6 ninths. The wrong options scale only one part, or add 1 to both.

### [ ] `F3-ka-002`

*numeric · symbolic · ages both*

> Fill in the blank: $\frac{3}{4}$ = $\frac{?}{12}$

- Answer: 9

Why: Twelve is 4 times 3, so the top is 3 times 3: 9.

### [ ] `F3-ka-003`

*numeric · symbolic · ages both*

> Fill in the blank: $\frac{2}{5}$ = $\frac{8}{?}$

- Answer: 20

Why: Eight is 2 times 4, so the bottom is 5 times 4: 20.

## F4 — Comparing and ordering (common denominators, benchmarks 1/2 and 1)

0 of 13 reviewed.

### [ ] `F4-sym-001`

*single · symbolic · ages both*

> Which is bigger, $\frac{1}{3}$ or $\frac{1}{5}$?

- A. $\frac{1}{3}$ — **correct**
- B. $\frac{1}{5}$ — wrong — `denominator_magnitude`
- C. They are equal — wrong — `whole_number_bias`
- D. You cannot compare them — wrong — `denominator_magnitude`

Why: One whole shared between 3 gives a bigger piece than the same whole shared between 5.

### [ ] `F4-bar-002`

*single · bar · ages both*

> Which is bigger, $\frac{3}{4}$ or $\frac{2}{3}$?

- A. $\frac{3}{4}$ — **correct**
- B. $\frac{2}{3}$ — wrong — `denominator_magnitude`
- C. They are equal — wrong — `whole_number_bias`
- D. It depends on the size of the whole — wrong — `whole_number_bias`

Why: Three quarters is one quarter short of the whole; two thirds is a whole third short. A quarter is the smaller gap.

### [ ] `F4-word-003`

*single · word · ages both*

> Which of these fractions is more than $\frac{1}{2}$?

- A. $\frac{5}{8}$ — **correct**
- B. $\frac{3}{8}$ — wrong — `computation`
- C. $\frac{4}{9}$ — wrong — `denominator_magnitude`
- D. $\frac{2}{5}$ — wrong — `computation`

Why: Half of 8 is 4, so five eighths is past halfway.

### [ ] `F4-sym-004`

*numeric · symbolic · ages 13-17*

> What is the lowest common denominator you would use to compare $\frac{2}{3}$ and $\frac{3}{4}$?

- Answer: 12

Why: Twelve is the smallest number that both 3 and 4 divide into.

### [ ] `F4-set-005`

*single · set · ages both*

> Ana got 7 out of 10 on a quiz. Ben got 3 out of 4 on a different quiz. Who scored the higher fraction?

- A. Ben — **correct**
- B. Ana — wrong — `whole_number_bias`
- C. They scored the same — wrong — `computation`
- D. You cannot compare different quizzes — wrong — `denominator_magnitude`

Why: Seven tenths is 0.7 and three quarters is 0.75, so Ben's fraction is higher even though Ana answered more questions.

### [ ] `F4-nl-006`

*single · number_line · ages both*

> Put these in order from smallest to largest: $\frac{1}{2}$, $\frac{1}{8}$, $\frac{1}{4}$.

- A. $\frac{1}{8}$, $\frac{1}{4}$, $\frac{1}{2}$ — **correct**
- B. $\frac{1}{2}$, $\frac{1}{4}$, $\frac{1}{8}$ — wrong — `denominator_magnitude`
- C. $\frac{1}{2}$, $\frac{1}{8}$, $\frac{1}{4}$ — wrong — `denominator_magnitude`
- D. $\frac{1}{4}$, $\frac{1}{8}$, $\frac{1}{2}$ — wrong — `denominator_magnitude`

Why: With the same top number, the bigger the bottom number the smaller the piece.

### [ ] `F4-word-007`

*short · word · ages 13-17*

> Name a fraction that sits between $\frac{1}{2}$ and $\frac{3}{4}$.

- Answer: 5/8 (also accepts: 5/8, 5 / 8, 0.6, 0.625, 2/3, 5/9, 7/12)

Why: Five eighths is 0.625, which lands between 0.5 and 0.75. Two thirds also works.

### [ ] `F4-sym-008`

*numeric · symbolic · ages 13-17*

> Rewrite $\frac{2}{3}$ over a denominator of 12. What is the new numerator?

- Answer: 8

Why: Three multiplied by 4 is 12, so the top is 2 multiplied by 4, which is 8.

### [ ] `F4-ka-001`

*single · symbolic · ages both*

> Which is larger, $\frac{1}{3}$ or $\frac{1}{8}$?

- A. $\frac{1}{3}$ — **correct**
- B. $\frac{1}{8}$ — wrong — `denominator_magnitude`
- C. They are the same size — wrong — `whole_number_bias`

Why: Cutting a whole into 3 gives bigger pieces than cutting it into 8, so one third is larger. Picking 1/8 because 8 is bigger is the denominator trap; calling them equal because both tops are 1 ignores the size of the pieces.

### [ ] `F4-ka-002`

*single · symbolic · ages both*

> Which fraction is closest to 1?

- A. $\frac{3}{5}$ — wrong — `whole_number_bias`
- B. $\frac{1}{2}$ — wrong — `whole_number_bias`
- C. $\frac{2}{3}$ — wrong — `whole_number_bias`
- D. $\frac{7}{8}$ — **correct**

Why: Seven eighths is one eighth short of a whole; the others are short by two fifths, a half and a third. Judging by the size of the digits rather than the size of the gap is the whole-number trap.

### [ ] `F4-ka-003`

*short · symbolic · ages both*

> Which is larger, $\frac{3}{5}$ or $\frac{5}{8}$? Write the larger fraction.

- Answer: 5/8

Why: Over 40: 24 fortieths against 25 fortieths, so 5/8 is larger by one fortieth.

### [ ] `F4-ka-004`

*short · symbolic · ages both*

> Which is larger, $\frac{7}{10}$ or $\frac{2}{3}$? Write the larger fraction.

- Answer: 7/10

Why: Over 30: 21 thirtieths against 20 thirtieths, so 7/10 is larger by one thirtieth.

### [ ] `F4-ka-005`

*short · word · ages both*

> One jug is $\frac{5}{6}$ full. Another is $\frac{4}{5}$ full. Which fraction is the fuller jug? Write it.

- Answer: 5/6

Why: Over 30: 25 thirtieths against 24 thirtieths, so 5/6 is fuller by one thirtieth.

## F5 — Simplifying (GCF)

0 of 11 reviewed.

### [ ] `F5-sym-001`

*single · symbolic · ages both*

> Write $\frac{6}{8}$ in its simplest form.

- A. $\frac{3}{4}$ — **correct**
- B. $\frac{2}{4}$ — wrong — `computation`
- C. $\frac{6}{4}$ — wrong — `computation`
- D. $\frac{1}{2}$ — wrong — `equivalence_as_change`

Why: Both 6 and 8 divide by 2, giving 3 and 4. Nothing divides both of those, so it is finished.

### [ ] `F5-sym-002`

*numeric · symbolic · ages both*

> What is the greatest common factor of 12 and 18?

- Answer: 6

Why: Six divides both, and nothing larger does.

### [ ] `F5-word-003`

*single · word · ages both*

> When you simplify a fraction, what happens to its value?

- A. It stays exactly the same — **correct**
- B. It gets smaller — wrong — `equivalence_as_change`
- C. It gets larger — wrong — `equivalence_as_change`
- D. It becomes a whole number — wrong — `computation`

Why: Simplifying only renames the fraction with bigger pieces. The amount does not move.

### [ ] `F5-sym-004`

*numeric · symbolic · ages 13-17*

> Simplify $\frac{15}{20}$ fully. What is the new denominator?

- Answer: 4

Why: Both divide by 5, giving three quarters.

### [ ] `F5-set-005`

*single · set · ages both*

> In a box of 30 pencils, 10 are broken. Write that fraction in its simplest form.

- A. $\frac{1}{3}$ — **correct**
- B. $\frac{10}{30}$ — wrong — `computation`
- C. $\frac{1}{10}$ — wrong — `computation`
- D. $\frac{3}{1}$ — wrong — `equivalence_as_change`

Why: Both 10 and 30 divide by 10, leaving one third. Ten thirtieths is right but not yet simplest.

### [ ] `F5-bar-006`

*single · bar · ages both*

> A bar shows $\frac{9}{12}$ shaded. What is that in simplest form?

- A. $\frac{3}{4}$ — **correct**
- B. $\frac{9}{4}$ — wrong — `computation`
- C. $\frac{1}{3}$ — wrong — `computation`
- D. $\frac{4}{3}$ — wrong — `equivalence_as_change`

Why: Both 9 and 12 divide by 3, giving three quarters.

### [ ] `F5-sym-007`

*short · symbolic · ages 13-17*

> Simplify $\frac{24}{36}$ fully.

- Answer: 2/3 (also accepts: 2/3, 2 / 3, two thirds)

Why: The greatest common factor of 24 and 36 is 12, and dividing both by it gives two thirds.

### [ ] `F5-nl-008`

*numeric · number_line · ages both*

> $\frac{4}{10}$ is marked on a number line. Simplified, its denominator is what number?

- Answer: 5

Why: Both 4 and 10 divide by 2, giving two fifths — the same point on the line.

### [ ] `F5-ka-001`

*short · symbolic · ages both*

> Write $\frac{6}{8}$ in simplest form.

- Answer: 3/4

Why: Two divides both 6 and 8: 3 over 4. The answer has to be the simplified fraction; 6/8 itself is not.

### [ ] `F5-ka-002`

*short · symbolic · ages both*

> Write $\frac{15}{25}$ in simplest form.

- Answer: 3/5

Why: Five divides both: 3 over 5.

### [ ] `F5-ka-003`

*short · symbolic · ages both*

> Write $\frac{12}{18}$ in simplest form.

- Answer: 2/3

Why: Six divides both: 2 over 3.

## F6 — Mixed numbers and improper fractions

0 of 8 reviewed.

### [ ] `F6-sym-001`

*single · symbolic · ages both*

> Write $\frac{7}{3}$ as a mixed number.

- A. $2\frac{1}{3}$ — **correct**
- B. $3\frac{1}{7}$ — wrong — `whole_number_bias`
- C. $2\frac{1}{7}$ — wrong — `computation`
- D. $1\frac{4}{3}$ — wrong — `computation`

Why: Three thirds make 1, so seven thirds is two wholes with one third left over.

### [ ] `F6-sym-002`

*numeric · symbolic · ages both*

> Write $2\frac{3}{4}$ as an improper fraction. What is the numerator?

- Answer: 11

Why: Two wholes is 8 quarters, plus 3 more quarters makes 11 quarters.

### [ ] `F6-nl-003`

*single · number_line · ages both*

> Where does $1\frac{1}{2}$ sit on a number line?

- A. Halfway between 1 and 2 — **correct**
- B. Halfway between 0 and 1 — wrong — `computation`
- C. At 11 and a bit — wrong — `whole_number_bias`
- D. Halfway between 2 and 3 — wrong — `computation`

Why: One and a half is one whole plus half of the next one.

### [ ] `F6-bar-004`

*numeric · bar · ages both*

> Bars are each split into quarters. How many quarter pieces make $1\frac{3}{4}$?

- Answer: 7

Why: One whole is 4 quarters, and 3 more makes 7.

### [ ] `F6-word-005`

*single · word · ages both*

> Which of these is an improper fraction?

- A. $\frac{9}{5}$ — **correct**
- B. $\frac{5}{9}$ — wrong — `whole_number_bias`
- C. $1\frac{4}{5}$ — wrong — `computation`
- D. $\frac{4}{9}$ — wrong — `computation`

Why: An improper fraction has a top number at least as big as its bottom number, so it is worth 1 or more.

### [ ] `F6-sym-006`

*single · symbolic · ages 13-17*

> Which is larger, $\frac{11}{4}$ or $2\frac{1}{2}$?

- A. $\frac{11}{4}$ — **correct**
- B. $2\frac{1}{2}$ — wrong — `computation`
- C. They are equal — wrong — `computation`
- D. You cannot compare a mixed number with an improper fraction — wrong — `whole_number_bias`

Why: Eleven quarters is two and three quarters, which is more than two and a half.

### [ ] `F6-sym-007`

*short · symbolic · ages 13-17*

> Write $\frac{17}{5}$ as a mixed number.

- Answer: 3 2/5 (also accepts: 3 2/5, 3 and 2/5, 3.4, three and two fifths)

Why: Five goes into 17 three times with 2 left over, so it is three and two fifths.

### [ ] `F6-set-008`

*numeric · set · ages both*

> Eggs come in boxes of 6. You have 15 eggs. How many full boxes can you fill?

- Answer: 2

Why: Fifteen sixths is two whole boxes with three eggs left over, which is half a box.

## F7 — Add and subtract with like denominators

0 of 8 reviewed.

### [ ] `F7-sym-001`

*numeric · symbolic · ages both*

> What is $\frac{2}{7} + \frac{3}{7}$? Give the numerator of the answer.

- Answer: 5

Why: The pieces are the same size, so count them: 2 sevenths plus 3 sevenths is 5 sevenths. The bottom number does not change.

### [ ] `F7-sym-002`

*single · symbolic · ages both*

> What is $\frac{1}{5} + \frac{2}{5}$?

- A. $\frac{3}{5}$ — **correct**
- B. $\frac{3}{10}$ — wrong — `add_across`
- C. $\frac{2}{10}$ — wrong — `add_across`
- D. $\frac{3}{25}$ — wrong — `add_across`

Why: Both are fifths, so three fifths. Adding the bottom numbers would change the size of the pieces, which addition never does.

### [ ] `F7-bar-003`

*single · bar · ages both*

> A bar is split into eighths. You shade $\frac{3}{8}$, then shade $\frac{2}{8}$ more. How much is shaded?

- A. $\frac{5}{8}$ — **correct**
- B. $\frac{5}{16}$ — wrong — `add_across`
- C. $\frac{6}{8}$ — wrong — `computation`
- D. $\frac{5}{10}$ — wrong — `add_across`

Why: The pieces stay eighths however many you shade. Three plus two is five of them.

### [ ] `F7-sym-004`

*numeric · symbolic · ages both*

> What is $\frac{7}{9} - \frac{4}{9}$? Give the numerator of the answer.

- Answer: 3

Why: Take 4 ninths away from 7 ninths and 3 ninths are left. The pieces are still ninths.

### [ ] `F7-word-005`

*single · word · ages both*

> Maya drinks $\frac{2}{6}$ of a bottle in the morning and $\frac{3}{6}$ at lunch. How much has she drunk?

- A. $\frac{5}{6}$ — **correct**
- B. $\frac{5}{12}$ — wrong — `add_across`
- C. $\frac{6}{6}$ — wrong — `computation`
- D. $\frac{5}{36}$ — wrong — `add_across`

Why: Both amounts are sixths of the same bottle, so five sixths.

### [ ] `F7-set-006`

*numeric · set · ages both*

> A tray holds 10 cookies. You take $\frac{3}{10}$, then $\frac{4}{10}$ more. How many cookies have you taken?

- Answer: 7

Why: Three tenths plus four tenths is seven tenths, and a tenth of 10 cookies is 1 cookie.

### [ ] `F7-nl-007`

*single · number_line · ages both*

> You start at $\frac{1}{4}$ on a number line and move forward $\frac{2}{4}$. Where do you land?

- A. $\frac{3}{4}$ — **correct**
- B. $\frac{3}{8}$ — wrong — `add_across`
- C. $\frac{2}{4}$ — wrong — `computation`
- D. $\frac{3}{16}$ — wrong — `add_across`

Why: Each step is a quarter. One quarter plus two more quarters lands on three quarters.

### [ ] `F7-sym-008`

*short · symbolic · ages 13-17*

> What is $\frac{5}{6} - \frac{1}{6}$? Give your answer in simplest form.

- Answer: 2/3 (also accepts: 2/3, 2 / 3, 4/6, two thirds)

Why: Five sixths minus one sixth is four sixths, and both divide by 2 to give two thirds.

## F8 — Add and subtract with unlike denominators (LCD)

0 of 12 reviewed.

### [ ] `F8-sym-001`

*single · symbolic · ages both*

> What is $\frac{1}{2} + \frac{1}{3}$?

- A. $\frac{5}{6}$ — **correct**
- B. $\frac{2}{5}$ — wrong — `add_across`
- C. $\frac{1}{6}$ — wrong — `equivalence_as_change`
- D. $\frac{2}{6}$ — wrong — `add_across`

Why: Halves and thirds are different sizes, so rewrite both as sixths: 3 sixths plus 2 sixths is 5 sixths.

### [ ] `F8-sym-002`

*numeric · symbolic · ages both*

> What is the lowest common denominator for $\frac{1}{4}$ and $\frac{1}{6}$?

- Answer: 12

Why: Twelve is the smallest number that both 4 and 6 divide into.

### [ ] `F8-bar-003`

*single · bar · ages both*

> Why can you not just add the tops and bottoms of $\frac{1}{2}$ and $\frac{1}{4}$?

- A. The pieces are different sizes, so they must be renamed first — **correct**
- B. Because the answer would be too big — wrong — `add_across`
- C. Because one of them is already simplified — wrong — `equivalence_as_change`
- D. You can, and the answer is $\frac{2}{6}$ — wrong — `add_across`

Why: Adding counts pieces, and you can only count pieces that are the same size. Half is 2 quarters, so the answer is 3 quarters.

### [ ] `F8-sym-004`

*numeric · symbolic · ages 13-17*

> What is $\frac{2}{3} + \frac{1}{6}$? Give the numerator when written over 6.

- Answer: 5

Why: Two thirds is four sixths, and four sixths plus one sixth is five sixths.

### [ ] `F8-word-005`

*single · word · ages both*

> A recipe needs $\frac{1}{3}$ cup of milk and $\frac{1}{4}$ cup of cream. How much liquid altogether?

- A. $\frac{7}{12}$ cup — **correct**
- B. $\frac{2}{7}$ cup — wrong — `add_across`
- C. $\frac{1}{12}$ cup — wrong — `equivalence_as_change`
- D. $\frac{2}{12}$ cup — wrong — `add_across`

Why: Over twelfths, a third is 4 twelfths and a quarter is 3 twelfths. Together that is 7 twelfths.

### [ ] `F8-sym-006`

*single · symbolic · ages 13-17*

> What is $\frac{3}{4} - \frac{1}{3}$?

- A. $\frac{5}{12}$ — **correct**
- B. $\frac{2}{1}$ — wrong — `add_across`
- C. $\frac{2}{12}$ — wrong — `add_across`
- D. $\frac{1}{12}$ — wrong — `equivalence_as_change`

Why: Over twelfths that is 9 twelfths minus 4 twelfths, which is 5 twelfths.

### [ ] `F8-sym-007`

*short · symbolic · ages 13-17*

> What is $\frac{1}{2} + \frac{2}{5}$? Give your answer as a fraction.

- Answer: 9/10 (also accepts: 9/10, 9 / 10, 0.9, nine tenths)

Why: Over tenths, a half is 5 tenths and two fifths is 4 tenths, so together nine tenths.

### [ ] `F8-nl-008`

*numeric · number_line · ages 13-17*

> You start at $\frac{1}{2}$ and move forward $\frac{1}{4}$. Written over quarters, what is the numerator where you land?

- Answer: 3

Why: A half is 2 quarters, and 2 quarters plus 1 quarter is 3 quarters.

### [ ] `F8-ka-001`

*numeric · symbolic · ages both*

> What is $\frac{1}{2}$ + $\frac{1}{3}$? Give your answer as a fraction.

- Answer: 5/6

Why: Halves and thirds become sixths: 3 sixths plus 2 sixths is 5 sixths. Adding tops and bottoms straight across gives 2/5, which is smaller than the half you started with.

### [ ] `F8-ka-002`

*numeric · symbolic · ages both*

> What is $\frac{3}{4}$ + $\frac{1}{6}$? Give your answer as a fraction.

- Answer: 11/12

Why: Twelfths fit both: 9 twelfths plus 2 twelfths is 11 twelfths. Adding straight across gives 4/10.

### [ ] `F8-ka-003`

*numeric · word · ages both*

> A recipe needs $\frac{1}{3}$ cup of oil and $\frac{1}{4}$ cup of water. How many cups of liquid is that in total?

- Answer: 7/12 cups

Why: Twelfths fit both: 4 twelfths of oil plus 3 twelfths of water is 7 twelfths of a cup.

### [ ] `F8-ka-004`

*numeric · word · ages both*

> You walk $\frac{2}{5}$ of a mile, then $\frac{1}{2}$ a mile more. How far have you walked in total?

- Answer: 9/10 miles

Why: Tenths fit both: 4 tenths plus 5 tenths is 9 tenths of a mile.

## F9 — Multiply fractions; fraction of a set

0 of 11 reviewed.

### [ ] `F9-sym-001`

*single · symbolic · ages both*

> What is $\frac{1}{2} \times \frac{1}{3}$?

- A. $\frac{1}{6}$ — **correct**
- B. $\frac{2}{5}$ — wrong — `whole_number_bias`
- C. $\frac{1}{5}$ — wrong — `computation`
- D. $\frac{3}{2}$ — wrong — `whole_number_bias`

Why: Half of a third is a sixth. Multiply the tops and multiply the bottoms.

### [ ] `F9-set-002`

*numeric · set · ages both*

> What is $\frac{3}{4}$ of 20?

- Answer: 15

Why: A quarter of 20 is 5, so three quarters is 15.

### [ ] `F9-word-003`

*single · word · ages both*

> When you multiply a whole number by a fraction smaller than 1, the answer is

- A. smaller than the whole number you started with — **correct**
- B. bigger than the whole number you started with — wrong — `whole_number_bias`
- C. always a whole number — wrong — `computation`
- D. the same as the whole number — wrong — `whole_number_bias`

Why: Taking a part of something gives less than all of it. Half of 8 is 4.

### [ ] `F9-set-004`

*numeric · set · ages both*

> A class of 28 students is $\frac{2}{7}$ girls. How many girls are in the class?

- Answer: 8

Why: A seventh of 28 is 4, so two sevenths is 8.

### [ ] `F9-bar-005`

*single · bar · ages both*

> A bar shows $\frac{2}{3}$ shaded. You take half of the shaded part. What fraction of the whole bar is that?

- A. $\frac{1}{3}$ — **correct**
- B. $\frac{1}{2}$ — wrong — `computation`
- C. $\frac{2}{6}$ is wrong and $\frac{1}{6}$ is right — wrong — `computation`
- D. $\frac{1}{5}$ — wrong — `whole_number_bias`

Why: Half of two thirds is one third: $\frac{1}{2} \times \frac{2}{3} = \frac{2}{6} = \frac{1}{3}$.

### [ ] `F9-sym-006`

*numeric · symbolic · ages 13-17*

> What is $\frac{2}{5} \times \frac{5}{6}$? Give the answer's denominator in simplest form.

- Answer: 3

Why: Multiplying gives ten thirtieths, and both divide by 10 to give one third.

### [ ] `F9-sym-007`

*short · symbolic · ages 13-17*

> What is $\frac{3}{4} \times \frac{2}{9}$ in simplest form?

- Answer: 1/6 (also accepts: 1/6, 1 / 6, 6/36, one sixth)

Why: Six thirty-sixths, and both divide by 6, giving one sixth.

### [ ] `F9-nl-008`

*single · number_line · ages 13-17*

> On a number line, $\frac{1}{2} \times 6$ lands where?

- A. At 3 — **correct**
- B. At 12 — wrong — `whole_number_bias`
- C. At 6 and a half — wrong — `whole_number_bias`
- D. At $\frac{1}{12}$ — wrong — `computation`

Why: Half of 6 is 3. Multiplying by a half halves the distance from 0.

### [ ] `F9-ka-001`

*numeric · symbolic · ages both*

> What is $\frac{2}{3}$ \times $\frac{3}{5}$?

- Answer: 2/5 (also accepts: 6/15)

Why: Tops times tops and bottoms times bottoms: 6 fifteenths, which is 2 fifths. Cross-multiplying (2 times 5 over 3 times 3) gives 10/9, a move that belongs to solving a proportion, not to multiplying.

### [ ] `F9-ka-002`

*numeric · word · ages both*

> What is $\frac{3}{4}$ of $\frac{2}{9}$?

- Answer: 1/6 (also accepts: 6/36)

Why: "Of" means multiply: 3 times 2 over 4 times 9 is 6 thirty-sixths, which is 1 sixth.

### [ ] `F9-ka-003`

*numeric · word · ages both*

> A recipe needs $\frac{3}{4}$ cup of sugar. You are making half the recipe. How much sugar do you need?

- Answer: 3/8 cups

Why: Half of three quarters is three eighths: 1 times 3 over 2 times 4.

## F10 — Divide fractions (reciprocal, and why it works)

0 of 8 reviewed.

### [ ] `F10-sym-001`

*single · symbolic · ages both*

> What is $6 \div \frac{1}{2}$?

- A. 12 — **correct**
- B. 3 — wrong — `division_makes_smaller`
- C. 6 — wrong — `computation`
- D. $\frac{1}{12}$ — wrong — `division_makes_smaller`

Why: The question asks how many halves fit into 6, and each whole holds two, so 12. Dividing by a number less than 1 makes the answer bigger.

### [ ] `F10-word-002`

*single · word · ages both*

> Dividing by $\frac{1}{4}$ gives the same answer as

- A. multiplying by 4 — **correct**
- B. multiplying by $\frac{1}{4}$ — wrong — `division_makes_smaller`
- C. dividing by 4 — wrong — `division_makes_smaller`
- D. subtracting 4 — wrong — `computation`

Why: Asking how many quarters fit into something is the same as counting 4 for every whole.

### [ ] `F10-bar-003`

*numeric · bar · ages both*

> How many $\frac{1}{3}$ pieces fit into 2 whole bars?

- Answer: 6

Why: Each whole bar holds 3 thirds, so 2 bars hold 6.

### [ ] `F10-sym-004`

*single · symbolic · ages 13-17*

> What is $\frac{3}{4} \div \frac{1}{2}$?

- A. $\frac{3}{2}$ — **correct**
- B. $\frac{3}{8}$ — wrong — `division_makes_smaller`
- C. $\frac{2}{3}$ — wrong — `computation`
- D. $\frac{4}{6}$ — wrong — `computation`

Why: Flip the second fraction and multiply: three quarters times two is six quarters, which is three halves.

### [ ] `F10-word-005`

*numeric · word · ages both*

> A ribbon is 4 metres long. How many $\frac{1}{2}$ metre pieces can you cut from it?

- Answer: 8

Why: Each metre gives 2 half-metre pieces, so 4 metres gives 8.

### [ ] `F10-word-006`

*single · word · ages 13-17*

> Is $8 \div \frac{2}{3}$ bigger or smaller than 8?

- A. Bigger, because two thirds fits into 8 more than 8 times — **correct**
- B. Smaller, because dividing always makes things smaller — wrong — `division_makes_smaller`
- C. The same, because you are dividing by a fraction — wrong — `division_makes_smaller`
- D. Smaller, because two thirds is less than one — wrong — `division_makes_smaller`

Why: Dividing asks how many fit. Pieces smaller than 1 fit more than once per whole, so the count is larger than 8.

### [ ] `F10-sym-007`

*short · symbolic · ages 13-17*

> What is $\frac{2}{3} \div \frac{4}{9}$ in simplest form?

- Answer: 3/2 (also accepts: 3/2, 3 / 2, 1 1/2, 1.5, 18/12, one and a half)

Why: Flip and multiply: two thirds times nine quarters is eighteen twelfths, which simplifies to three halves.

### [ ] `F10-set-008`

*numeric · set · ages 13-17*

> You have 10 cups of flour and each loaf needs $\frac{2}{5}$ of a cup. How many loaves can you make?

- Answer: 25

Why: Each cup makes two and a half loaves, so 10 cups make 25.

## F11 — Fractions, decimals, and percents

0 of 8 reviewed.

### [ ] `F11-sym-001`

*single · symbolic · ages both*

> Which is bigger, $0.5$ or $0.25$?

- A. $0.5$ — **correct**
- B. $0.25$ — wrong — `decimal_length`
- C. They are equal — wrong — `decimal_length`
- D. You cannot compare them — wrong — `whole_number_bias`

Why: More digits does not mean more value. Half is bigger than a quarter.

### [ ] `F11-sym-002`

*numeric · symbolic · ages both*

> Write $\frac{3}{4}$ as a percentage. Give the number only.

- Answer: 75

Why: Three quarters of 100 is 75.

### [ ] `F11-word-003`

*single · word · ages both*

> Which of these is the same as $\frac{1}{5}$?

- A. $20\%$ — **correct**
- B. $5\%$ — wrong — `whole_number_bias`
- C. $15\%$ — wrong — `computation`
- D. $1.5\%$ — wrong — `decimal_length`

Why: A fifth of 100 is 20, so one fifth is 20 percent.

### [ ] `F11-sym-004`

*numeric · symbolic · ages both*

> Write $\frac{1}{4}$ as a decimal.

- Answer: 0.25

Why: One quarter of 1 is 0.25.

### [ ] `F11-nl-005`

*single · number_line · ages both*

> Which of these sits furthest to the right on a number line?

- A. $0.7$ — **correct**
- B. $0.07$ — wrong — `decimal_length`
- C. $0.007$ — wrong — `decimal_length`
- D. $0.0007$ — wrong — `decimal_length`

Why: Each extra zero after the point makes the number ten times smaller, not bigger.

### [ ] `F11-set-006`

*numeric · set · ages both*

> A shirt costs $40. It is 25% off. How many dollars do you save?

- Answer: 10 dollars

Why: Twenty-five percent is a quarter, and a quarter of 40 is 10.

### [ ] `F11-sym-007`

*short · symbolic · ages 13-17*

> Write $0.6$ as a fraction in simplest form.

- Answer: 3/5 (also accepts: 3/5, 3 / 5, 6/10, three fifths)

Why: Six tenths, and both divide by 2 to give three fifths.

### [ ] `F11-bar-008`

*single · bar · ages 13-17*

> A bar shows $\frac{2}{5}$ shaded. What percentage is that?

- A. $40\%$ — **correct**
- B. $25\%$ — wrong — `computation`
- C. $2\%$ — wrong — `whole_number_bias`
- D. $50\%$ — wrong — `computation`

Why: A fifth is 20 percent, so two fifths is 40 percent.

## F12 — Ratios and rates (bridge to pre-algebra)

0 of 12 reviewed.

### [ ] `F12-set-001`

*numeric · set · ages both*

> A recipe uses 2 cups of flour for every 3 cups of milk. If you use 6 cups of flour, how many cups of milk do you need?

- Answer: 9

Why: Six cups of flour is three lots of 2, so you need three lots of 3 cups of milk.

### [ ] `F12-word-002`

*single · word · ages both*

> A car travels 120 miles in 2 hours. What is its speed?

- A. 60 miles per hour — **correct**
- B. 240 miles per hour — wrong — `whole_number_bias`
- C. 120 miles per hour — wrong — `computation`
- D. 2 miles per hour — wrong — `whole_number_bias`

Why: A rate per hour means dividing the distance by the hours: 120 divided by 2.

### [ ] `F12-set-003`

*numeric · set · ages both*

> In a class the ratio of cats to dogs owned is 3 to 5. If there are 9 cats, how many dogs are there?

- Answer: 15

Why: Nine cats is three lots of 3, so there are three lots of 5 dogs.

### [ ] `F12-word-004`

*single · word · ages 13-17*

> Which is the better value: 4 apples for $2, or 10 apples for $4?

- A. 10 apples for $4 — **correct**
- B. 4 apples for $2 — wrong — `whole_number_bias`
- C. They are the same value — wrong — `computation`
- D. You cannot compare different amounts — wrong — `whole_number_bias`

Why: Per apple that is 50 cents against 40 cents, so the larger bag is cheaper each.

### [ ] `F12-sym-005`

*numeric · symbolic · ages 13-17*

> Solve for the missing value: $\frac{3}{4} = \frac{x}{20}$

- Answer: 15

Why: Twenty is 4 multiplied by 5, so x is 3 multiplied by 5.

### [ ] `F12-bar-006`

*single · bar · ages both*

> A ratio of 1 to 4 means

- A. 1 part of the first for every 4 parts of the second — **correct**
- B. the first is 4 times bigger — wrong — `whole_number_bias`
- C. there are 5 of the first — wrong — `computation`
- D. the two amounts are equal — wrong — `whole_number_bias`

Why: A ratio compares parts. One to four means five parts in total, one of them the first thing.

### [ ] `F12-word-007`

*short · word · ages 13-17*

> A printer prints 45 pages in 3 minutes. How many pages does it print per minute?

- Answer: 15 (also accepts: 15, 15 pages, fifteen)

Why: Divide by the number of minutes: 45 divided by 3 is 15 pages a minute.

### [ ] `F12-nl-008`

*numeric · number_line · ages 13-17*

> On a map, 1 centimetre stands for 25 kilometres. Two towns are 6 centimetres apart on the map. How many kilometres apart are they?

- Answer: 150 kilometres

Why: Six lots of 25 kilometres is 150.

### [ ] `F12-ka-001`

*numeric · word · ages both*

> If 3 pencils cost $1.20, what do 5 pencils cost, in dollars?

- Answer: 2 dollars

Why: One pencil costs 40 cents, so five cost 2 dollars.

### [ ] `F12-ka-002`

*numeric · word · ages both*

> The ratio of red to blue marbles is 2:3. There are 12 red marbles. How many blue marbles are there?

- Answer: 18

Why: Twelve red is six lots of 2, so there are six lots of 3 blue: 18.

### [ ] `F12-ka-003`

*numeric · symbolic · ages both*

> Solve the proportion for $x$: $\frac{2}{5}$ = $\frac{x}{20}$

- Answer: 8

Why: Twenty is 5 times 4, so x is 2 times 4: 8.

### [ ] `F12-ka-004`

*numeric · symbolic · ages both*

> Solve the proportion for $x$: $\frac{x}{6}$ = $\frac{9}{2}$

- Answer: 27

Why: Six is 2 times 3, so x is 9 times 3: 27.

