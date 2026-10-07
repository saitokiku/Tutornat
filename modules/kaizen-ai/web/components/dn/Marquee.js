// One marquee, max one per page (taste rule). Pure CSS animation with a
// duplicated track; prefers-reduced-motion stops it (globals.css collapses all
// animation durations). Server component.
//
// Rebuild note: the items are phrases, not figures, so they left the mono face
// (mono carries times, prices, counts and percentages only) and became a
// hairline-separated ticker in the body voice. The edges fade into the page
// with the surface token rather than a mask, so the strip ends instead of
// getting cut off mid-word.
export default function Marquee({ items = [], tone = 'day', className = '' }) {
  const night = tone === 'night';
  const row = (key) => (
    <div key={key} aria-hidden={key > 0} className="flex shrink-0 items-center animate-marquee">
      {items.map((item, i) => (
        <span
          key={i}
          className={`whitespace-nowrap border-l px-6 sm:px-8 text-sm ${
            night ? 'border-nightline text-nightmuted' : 'border-border text-muted'
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
  return (
    <div
      className={`relative flex overflow-hidden border-y py-4 ${night ? 'border-nightline' : 'border-border'} ${className}`}
      role="marquee"
      aria-label={items.join(', ')}
    >
      {row(0)}
      {row(1)}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 bg-gradient-to-r to-transparent ${
          night ? 'from-coal' : 'from-paper'
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 bg-gradient-to-l to-transparent ${
          night ? 'from-coal' : 'from-paper'
        }`}
      />
    </div>
  );
}
