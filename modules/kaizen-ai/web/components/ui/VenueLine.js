// Where the room is.
//
// The parent's literal first question about an in-person product, and until
// Wave 2 no public surface could answer it: `venue` existed on the row since
// 0033 and was missing from one select. Where it DID render — the admin console
// — it was a truncated 13px grey fragment after a middot.
//
// So it gets a primitive, and the primitive treats an absent venue as a real
// state rather than as an empty string. A room with no venue is not "a room";
// it is a room nobody can attend, and the console needs to see that as a
// warning while a parent must never see a blank where an address should be.
export default function VenueLine({ venue, tone = 'day', missing = null, className = '' }) {
  const muted = tone === 'night' ? 'text-nightmuted' : 'text-muted';

  if (!venue) {
    // `missing` is opt-in: a public surface passes nothing and renders nothing,
    // because "no venue set" is an operations problem, not a sentence to show a
    // family. The console passes a warning and gets one.
    if (!missing) return null;
    return <p className={`text-xs text-warn ${className}`}>{missing}</p>;
  }

  return (
    <p className={`text-xs ${muted} ${className}`}>
      <span className="sr-only">Where: </span>
      {venue}
    </p>
  );
}
