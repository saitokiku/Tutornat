'use client';

// Two-tier mastery, shown as one dial.
//
//   WORKING   (pale)          — what you can do with help
//   CONFIRMED (solid)         — what you've done on your own, later, unaided
//
// Both are always visible, because the GAP is the useful information and the
// product spent its whole life conflating the two: mastery was produced by a
// model grading a transcript the same model wrote, with help freely available.
//
// The distinction is worth teaching rather than hiding — "I could follow along"
// and "I can do this" are different claims, and a student who learns to tell
// them apart has learned something that outlasts the subject.
//
// No normative comparison anywhere: progress is against the material and the
// learner's own past, never against other learners.
//
// Nothing imports this today. It stays because it is the one drawing of the
// product's central distinction, and the day a surface needs to show working
// against confirmed it should find this here rather than invent a third
// encoding. Restyled onto the token palette with the rest of the interior:
// track on border, working in accent at a third weight, confirmed solid in
// good, and the figure in the record font, tabular, like every other number the
// product asserts.

const R = 15.5;
const C = 2 * Math.PI * R;

export default function MasteryDial({ working = 0, confirmed = 0, size = 40, showLabel = true }) {
  const w = clamp01(working);
  const c = clamp01(confirmed);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size} height={size} className="-rotate-90"
        role="img"
        aria-label={`${Math.round(c * 100)} percent confirmed, ${Math.round(w * 100)} percent with help`}>
        {/* track */}
        <circle cx="20" cy="20" r={R} fill="none" stroke="currentColor" className="text-border" strokeWidth="3.5" />
        {/* working — pale: real progress, not yet proven alone */}
        <circle
          cx="20" cy="20" r={R} fill="none"
          stroke="currentColor" className="text-accent/35"
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${w * C} ${C}`}
          style={{ strokeDashoffset: 0 }}
        />
        {/* confirmed — solid, sits on top */}
        <circle
          cx="20" cy="20" r={R} fill="none"
          stroke="currentColor" className="text-good"
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${c * C} ${C}`}
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center font-opmono text-micro font-semibold tracking-normal text-ink tabular-nums">
          {Math.round(c * 100)}
        </span>
      )}
    </div>
  );
}

// One-line honest status for a concept. Never says "mastered" on working
// evidence alone.
export function masteryLabel({ working = 0, confirmed = 0, nextCheckAt = null, now = Date.now() }) {
  const w = clamp01(working);
  const c = clamp01(confirmed);
  if (c >= 0.95) return { text: 'Confirmed on your own', tone: 'text-good' };
  if (nextCheckAt && new Date(nextCheckAt).getTime() <= now && w >= 0.3) {
    return { text: 'Ready to check', tone: 'text-accent' };
  }
  if (w >= 0.7) return { text: 'Strong with help. Check it to confirm', tone: 'text-warn' };
  if (w >= 0.3) return { text: 'Getting there', tone: 'text-muted' };
  if (w > 0) return { text: 'Just started', tone: 'text-muted' };
  return { text: 'Not started', tone: 'text-muted' };
}

function clamp01(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}
