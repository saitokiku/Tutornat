// A tutor's rating, as the record holds it: marks plus the figure itself.
//
// Lifted out of MarketingShell, whose default export was dead chrome. Two
// things changed and nothing else: the five "★" text glyphs are now icons on
// the shared 24px grid, and the gold #E0A93B they were painted with (the only
// gold anywhere in the product) is now the accent token. The fill rule, the
// "New tutor" empty state, the one-decimal figure and the parenthesised count
// are unchanged, because the directory and the profile page both read them.
//
// The figure is set in mono next to the marks on purpose: the stars are the
// glanceable part, the number is the part the record actually asserts.
import { IconStar, IconStarEmpty } from '@/components/Icons';

const MARKS = [0, 1, 2, 3, 4];

export function Stars({ rating, count, size = 13 }) {
  // No rating yet is a real state, not a zero. A tutor with no reviews shows
  // as new rather than as five empty stars, which reads as a bad score.
  if (rating == null) {
    return <span className="text-xs text-muted">New tutor</span>;
  }

  const filled = Math.round(rating);

  return (
    <span className="inline-flex items-center gap-1.5">
      {/* Decorative: the figure beside it carries the same information in text,
          so a screen reader hears "4.8 (12)" once rather than five times. */}
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {MARKS.map((i) =>
          i < filled
            ? <IconStar key={i} size={size} className="text-accent" />
            : <IconStarEmpty key={i} size={size} className="text-border" />
        )}
      </span>
      <span className="font-opmono text-xs tabular-nums text-muted">
        {rating.toFixed(1)}{count != null ? ` (${count})` : ''}
      </span>
    </span>
  );
}

export default Stars;
