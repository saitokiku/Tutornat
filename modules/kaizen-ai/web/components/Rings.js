'use client';

// Concentric progress rings: outer → inner.
//
// ring = { pct: 0-1, color, track }. Colors are NOT a caller's free choice:
// they arrive as palette references (`rgb(var(--c-*))`) so a ring can never
// carry a hex that drifts from the token set. RING_TONES below is the whole
// vocabulary — a caller picks a tone, it does not type a color.

export const RING_TONES = {
  accent: { color: 'rgb(var(--c-accent))', track: 'rgb(var(--c-accent) / 0.12)' },
  good: { color: 'rgb(var(--c-good))', track: 'rgb(var(--c-good) / 0.12)' },
  ink: { color: 'rgb(var(--c-ink))', track: 'rgb(var(--c-ink) / 0.09)' },
  warn: { color: 'rgb(var(--c-warn))', track: 'rgb(var(--c-warn) / 0.12)' },
};

// Gap between rings, in px. One number, so the stack stays even at any stroke.
const GAP = 4;

export default function Rings({ rings, size = 148, stroke = 12, children }) {
  const center = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Decorative: every figure the rings encode is also written out beside
          them, so a screen reader loses nothing by skipping this. */}
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {rings.map((ring, i) => {
          const r = center - stroke / 2 - i * (stroke + GAP);
          const circ = 2 * Math.PI * r;
          const pct = Math.max(0, Math.min(1, ring.pct));
          return (
            <g key={i}>
              <circle
                cx={center} cy={center} r={r}
                fill="none" stroke={ring.track} strokeWidth={stroke}
              />
              <circle
                cx={center} cy={center} r={r}
                fill="none" stroke={ring.color} strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </g>
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
