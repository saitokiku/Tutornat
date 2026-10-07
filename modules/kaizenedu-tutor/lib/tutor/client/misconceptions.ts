/** Misconception tags (spec §5.8) in plain words for learners and parents. */
const COPY: Record<string, { learner: string; parent: string }> = {
  denominator_magnitude: {
    learner: 'A bigger bottom number does not mean a bigger fraction.',
    parent: 'Treats a larger denominator as a larger fraction.',
  },
  add_across: {
    learner: 'Adding fractions is not adding the tops and the bottoms.',
    parent: 'Adds numerators and denominators straight across.',
  },
  whole_number_bias: {
    learner: 'Fractions do not follow all the whole-number rules.',
    parent: 'Applies whole-number rules to fractions.',
  },
  equivalence_as_change: {
    learner: 'Scaling the top and bottom by the same number keeps the value the same.',
    parent: 'Believes scaling numerator and denominator changes the value.',
  },
  division_makes_smaller: {
    learner: 'Dividing by a fraction can make a number bigger.',
    parent: 'Expects division to always make the result smaller.',
  },
  decimal_length: {
    learner: 'A longer decimal is not always a bigger one.',
    parent: 'Judges decimal size by the number of digits.',
  },
};

function humanize(tag: string): string {
  const words = tag.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unlabelled';
}

export function describeMisconception(tag: string, audience: 'learner' | 'parent'): string {
  return COPY[tag]?.[audience] ?? humanize(tag);
}

export function misconceptionTitle(tag: string): string {
  return humanize(tag);
}
