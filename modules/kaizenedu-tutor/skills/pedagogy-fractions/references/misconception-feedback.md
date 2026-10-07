# Misconception feedback

Elaborated feedback names the mistake rather than saying "try again"; that is the form with the real effect size. These lines are for whoever authors items, re-teach strategies or tutor prompts. The tutor itself says these things in its own voice (`lib/tutor/prompts/`), never verbatim.

The first three are carried over from Kaizen-AI's hand-authored misconception library (`supabase/seed_kc.sql`), reworded for this product's tags; the rest are written to the same standard for the tags the library did not cover.

| Tag | What the learner does | What to say |
| --- | --- | --- |
| `add_across` | Adds numerators and denominators straight across: a/b + c/d = (a+c)/(b+d) | You added the tops and the bottoms. The bottom number names the size of the piece; it does not get added. Rewrite both fractions over the same bottom first, then add only the tops. |
| `equivalence_as_change` | Finds a common denominator but leaves the numerator alone, or scales only one part | You changed the bottom and left the top as it was. Whatever you multiplied the bottom by, the top has to be multiplied by too; otherwise you have changed the value. |
| `denominator_magnitude` | Judges size by the digits: 1/8 is bigger than 1/3 because 8 is bigger than 3 | A bigger bottom number means the whole is cut into more pieces, so each piece is smaller. Picture one bar cut into 3 and one cut into 8. |
| `whole_number_bias` | Applies whole-number rules to fractions: bigger digits mean a bigger number, equal tops mean equal fractions, the fraction closest to 1 is the one with the biggest digits | The digits are not the size. Ask how far each fraction is from a whole, or put both over the same bottom, before comparing. |
| `division_makes_smaller` | Expects dividing to make the result smaller, so 6 ÷ ½ = 3 feels right | Dividing by a fraction asks how many of that piece fit inside. Halves are small, so many of them fit: 6 ÷ ½ is 12. |
| `decimal_length` | Judges a decimal by its number of digits: 0.25 is bigger than 0.3 because it is longer | Line the decimals up by place: 0.3 is 0.30, and 30 hundredths is more than 25 hundredths. Length says nothing about size. |
| `computation` | The idea is right and the arithmetic slipped, or a move from another procedure was applied (cross-multiplying to multiply) | Say which step slipped and redo only that step. Cross-multiplying is for solving a proportion; to multiply fractions, go straight across: tops times tops, bottoms times bottoms. |

Two that Kaizen-AI catalogued for pre-algebra and that arrive with R22, not now: undoing a two-step equation in the wrong order (divide before removing the added term), and distributing to the first term only.
