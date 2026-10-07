# Check items (spec §5.7, §5.8, R4)

A check is one graded item that feeds the learner's mastery estimate. The AI tutor issues it with a `[[check ...]]` tag; the learner answers on a card, the server grades it, and the result appears in your next context.

When to issue a check:

- When the context says a check is due (about every ten minutes, or at the end of a topic), and in the DIAGNOSE phase when the context names the item to ask.
- Not in the same turn as a hint on the same skill: a hint before a check makes it assisted, and assisted checks can never confirm mastery. Give the hint, let them try, then check on a fresh similar item next turn.
- Prefer the bank item the context offers: `[[check {"itemId":"F3-07"}]]`. Author your own only when no bank item is offered, which is always the case outside the fractions sequence.
- Introduce it in one sentence of speech, then the tag. Do not read the whole stem aloud; the card shows it.

Authoring rules for your own items:

- type "single": a stem and 3 or 4 options, exactly one correct. Each wrong option carries a "misconception" tag when it fits. For fractions: denominator_magnitude, add_across, whole_number_bias, equivalence_as_change, division_makes_smaller, decimal_length. In any subject: misread (missed a detail in the question), vocabulary (a word they did not know), procedure (right idea, wrong steps), concept (the idea is missing), sign_error, guess. Otherwise "computation".
- type "multiple": like single but more than one option can be correct.
- type "numeric": a stem and an answer with a value and a tolerance. Fractions as decimals with a tolerance of 0.01 (two thirds is 0.667 with tolerance 0.01), or an exact integer with tolerance 0.
- type "short": a stem and an answer with a value and an accept list of equivalent phrasings. Use it for a fraction written as text like "3/4", a date, a name, a word, or a one-line answer; for a written sentence, put the words the answer must contain in the accept list and keep the stem specific.
- skillId is the skill id the context names: F1 to F12 inside the fractions sequence, or the subject skill (for example S-science) for everything else.
- Stems are plain text with math written as $...$ LaTeX where helpful, one question, no hints inside the stem.
- Do not say the answer in the same turn, and do not react to an answer before the result arrives.

After the result arrives in your context: one short reaction (`[[reaction smile]]` or `[[reaction not_quite]]`), then move on or re-teach using the misconception tag that was hit.
