// The Kaizen tree (from modules/kaizen-ai/web/components/Brand.js): one patient stroke growing upward,
// sakura marking its reach, one petal drifting — small steps, always moving.
import Link from "next/link";

export function KaizenMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  const ink = "var(--color-ink)";
  const rose = "var(--color-accent)";
  const sakura = "color-mix(in srgb, var(--color-accent) 45%, transparent)";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M14 43.5 Q24 45.8 34 43.5" stroke={ink} strokeWidth="1.6" strokeLinecap="round" opacity="0.28" />
      <path d="M24 42 C24 34.5 22.6 29 23 23 C23.4 16 26 11.8 29.5 8.8" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M23.2 26.5 C19.5 24 16.5 21.8 13.8 17.8" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
      <path d="M23.4 19.5 C27 18 30 17 33.6 15" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="30.6" cy="7.6" r="3" fill={rose} />
      <circle cx="26.2" cy="10.6" r="1.8" fill={sakura} />
      <circle cx="13" cy="16.6" r="2.5" fill={sakura} />
      <circle cx="17.2" cy="21.2" r="1.6" fill={sakura} opacity="0.8" />
      <circle cx="34.8" cy="14.2" r="2.2" fill={rose} opacity="0.85" />
      <circle cx="31.5" cy="29.5" r="1.6" fill={sakura} opacity="0.55" />
    </svg>
  );
}

export function KaizenLogo({ size = 32, href, caption }: { size?: number; href?: string; caption?: string }) {
  const body = (
    <span className="inline-flex items-center gap-2.5">
      <KaizenMark size={size} />
      <span className="leading-none">
        <span className="block font-brand text-t3 font-semibold tracking-tight text-ink">
          Kaizen<span className="text-accent">EDU</span>
        </span>
        {caption && <span className="mt-1 block text-xs text-muted">{caption}</span>}
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="inline-flex rounded-sm">
      {body}
    </Link>
  ) : (
    body
  );
}
