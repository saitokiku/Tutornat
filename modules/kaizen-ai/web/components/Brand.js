// Kaizen brand system — the tree.
// A single calm stroke growing upward, sakura leaves marking progress, one
// petal drifting free: small improvement, always in motion. Use KaizenMark
// alone (app icon, loaders), or KaizenLogo for mark + wordmark lockups.

export function KaizenMark({ size = 32, ink = 'rgb(var(--c-ink))', rose = 'rgb(var(--c-accent))', sakura = 'rgb(var(--c-accent) / 0.45)', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* ground — a quiet horizon */}
      <path d="M14 43.5 Q24 45.8 34 43.5" stroke={ink} strokeWidth="1.6" strokeLinecap="round" opacity="0.28" />
      {/* trunk — one patient curve */}
      <path
        d="M24 42 C24 34.5 22.6 29 23 23 C23.4 16 26 11.8 29.5 8.8"
        stroke={ink} strokeWidth="2.6" strokeLinecap="round"
      />
      {/* branches */}
      <path d="M23.2 26.5 C19.5 24 16.5 21.8 13.8 17.8" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
      <path d="M23.4 19.5 C27 18 30 17 33.6 15" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
      {/* leaves — sakura marking each branch's reach */}
      <circle cx="30.6" cy="7.6" r="3" fill={rose} />
      <circle cx="26.2" cy="10.6" r="1.8" fill={sakura} />
      <circle cx="13" cy="16.6" r="2.5" fill={sakura} />
      <circle cx="17.2" cy="21.2" r="1.6" fill={sakura} opacity="0.8" />
      <circle cx="34.8" cy="14.2" r="2.2" fill={rose} opacity="0.85" />
      {/* one petal drifting — kaizen in motion */}
      <circle cx="31.5" cy="29.5" r="1.6" fill={sakura} opacity="0.55" />
    </svg>
  );
}

// Mark + wordmark lockup. caption renders beneath the name in muted type.
export function KaizenLogo({ size = 34, caption = '', captionClass = 'text-micro text-muted', nameClass = 'text-t3', href = null }) {
  const body = (
    <span className="inline-flex items-center gap-2.5">
      <KaizenMark size={size} />
      <span className="leading-none">
        <span className={`block font-brand font-semibold tracking-tight text-ink ${nameClass}`}>Kaizen</span>
        {caption && <span className={`block mt-1 ${captionClass}`}>{caption}</span>}
      </span>
    </span>
  );
  return href ? <a href={href} className="inline-flex">{body}</a> : body;
}

// A quiet decorative branch for hero corners and empty states.
// Draw it large, at low opacity, cropped by its container.
export function SakuraBranch({ width = 300, className = '', ink = 'rgb(var(--c-ink))', rose = 'rgb(var(--c-accent))', sakura = 'rgb(var(--c-accent) / 0.45)' }) {
  return (
    <svg
      width={width}
      height={width * 0.62}
      viewBox="0 0 300 186"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M-10 170 C60 150 110 120 160 84 C200 56 240 40 300 34" stroke={ink} strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
      <path d="M120 112 C130 92 138 78 142 58" stroke={ink} strokeWidth="1.9" strokeLinecap="round" opacity="0.4" />
      <path d="M200 62 C212 52 222 46 238 42" stroke={ink} strokeWidth="1.9" strokeLinecap="round" opacity="0.4" />
      <circle cx="144" cy="54" r="5" fill={sakura} />
      <circle cx="133" cy="70" r="3" fill={sakura} opacity="0.75" />
      <circle cx="242" cy="40" r="4.4" fill={rose} opacity="0.8" />
      <circle cx="292" cy="32" r="5.4" fill={rose} />
      <circle cx="275" cy="44" r="3" fill={sakura} opacity="0.8" />
      <circle cx="180" cy="96" r="2.6" fill={sakura} opacity="0.55" />
      <circle cx="210" cy="120" r="2.2" fill={sakura} opacity="0.4" />
    </svg>
  );
}
