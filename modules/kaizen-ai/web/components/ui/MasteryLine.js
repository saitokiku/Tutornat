// "4 of 11 concepts confirmed" — the one number that makes $550 legible, and
// the one this product spent its whole life not showing anybody.
//
// `familySummary.masteryLead` computes it, exports it at the top level, and
// carries a comment insisting "the demotion has to hold in the data, not only
// in the page that happens to render it today" — and /family rendered GPA,
// streak and open assignments instead. This primitive exists so the number has
// one shape wherever it appears (the parent's page, the student's dashboard,
// the Director's roster) and so the standard of proof travels with it.
//
// THE MASTERY LAW IS IN THE COPY, NOT JUST IN THE QUERY. "Confirmed" means
// unassisted, verified work, and the sub-line says so every time the figure is
// shown. A number a parent cannot interrogate is a number they will not trust,
// and this is the number the whole product is sold on (hard rule 5).
export default function MasteryLine({
  confirmed,
  total,
  moved = [],
  size = 'md',
  tone = 'day',
  className = '',
}) {
  const muted = tone === 'night' ? 'text-nightmuted' : 'text-muted';
  const figure = size === 'lg' ? 'text-d3' : 'text-t1';
  const n = Number(confirmed) || 0;
  const of = Number(total) || 0;

  // Nothing confirmed yet is the state every first family is in, and it is not
  // a failure — it is the beginning of a record. Saying "0 of 0" would read as
  // broken; saying what has to happen next reads as a product that works.
  if (of === 0) {
    return (
      <div className={className}>
        <p className={`font-opmono ${figure} tabular-nums`}>Not yet</p>
        <p className={`text-xs mt-1 ${muted}`}>
          Concepts appear here once your child has worked on them.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className={`font-opmono ${figure} tabular-nums`}>
        {n}<span className={muted}> of {of}</span>
      </p>
      <p className={`text-xs mt-1 ${muted}`}>
        concepts confirmed — done unaided, on a later day
      </p>
      {moved.length > 0 && (
        <p className="text-xs mt-2">
          {/* The week's news, named. "2 moved this week" is a statistic;
              "Distributing a negative" is something to say at dinner. */}
          <span className="font-medium">This week: </span>
          <span className={muted}>{moved.map((m) => m.title).join(', ')}</span>
        </p>
      )}
    </div>
  );
}
