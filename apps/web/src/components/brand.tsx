// The Kaizen tree (from modules/kaizen-ai/web/components/Brand.js): one patient stroke growing upward,
// sakura marking its reach, one petal drifting — small steps, every day.
// Two cuts of the same drawing: the full mark (tapered trunk, five blossoms, the drifting petal) and a
// compact cut for 20px and under (heavier strokes, three blossoms, cropped tighter) so a 16px tab icon
// stays a tree instead of a smudge. `grow` draws it once: trunk, branches, then blossoms.
import Link from "next/link";
import type { CSSProperties } from "react";

const INK = "var(--color-ink)";
const ROSE = "var(--color-accent)";
const SAKURA = "color-mix(in oklab, var(--color-accent) 45%, transparent)";
const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function KaizenMark({
  size = 32,
  className = "",
  grow = false,
  cut = "auto",
}: {
  size?: number;
  className?: string;
  /** Draw the tree on mount (static under reduced motion). */
  grow?: boolean;
  cut?: "auto" | "full" | "compact";
}) {
  const compact = cut === "compact" || (cut === "auto" && size <= 20);
  const stroke = { stroke: INK, strokeLinecap: "round" as const, pathLength: 1, className: "k-mark-stroke" };
  return (
    <svg
      width={size}
      height={size}
      viewBox={compact ? "2.5 2.5 43 43" : "0 0 48 48"}
      fill="none"
      className={`shrink-0 ${grow ? "k-grow" : ""} ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
    >
      {compact ? (
        <>
          <path d="M24 43 C24 35 22.4 29 23 22.5 C23.5 15.5 26.2 11.5 29.6 8.6" strokeWidth="4.2" {...stroke} />
          <path d="M23.1 27 C19.6 24.6 16.6 22 14.2 18.2" strokeWidth="3.4" {...stroke} style={d(160)} />
          <path d="M23.4 19.8 C27 18.2 30 17 33.2 15" strokeWidth="3.4" {...stroke} style={d(200)} />
          <circle cx="30.8" cy="7.8" r="4.6" fill={ROSE} className="k-mark-bloom" style={d(280)} />
          <circle cx="13.4" cy="16.8" r="3.6" fill={SAKURA} className="k-mark-bloom" style={d(320)} />
          <circle cx="34.6" cy="14" r="3" fill={ROSE} opacity="0.85" className="k-mark-bloom" style={d(360)} />
        </>
      ) : (
        <>
          <path d="M14 43.5 Q24 45.8 34 43.5" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.28" />
          {/* The trunk tapers: a heavier lower stroke, a lighter upper one meeting at a round joint. */}
          <path d="M24 42 C24 34.5 22.6 29 23 23" strokeWidth="2.9" {...stroke} />
          <path d="M23 23 C23.4 16 26 11.8 29.5 8.8" strokeWidth="2.3" {...stroke} style={d(110)} />
          <path d="M23.2 26.5 C19.5 24 16.5 21.8 13.8 17.8" strokeWidth="2" {...stroke} style={d(190)} />
          <path d="M23.4 19.5 C27 18 30 17 33.6 15" strokeWidth="2" {...stroke} style={d(230)} />
          <circle cx="30.6" cy="7.6" r="3" fill={ROSE} className="k-mark-bloom" style={d(290)} />
          <circle cx="26.2" cy="10.6" r="1.8" fill={SAKURA} className="k-mark-bloom" style={d(330)} />
          <circle cx="13" cy="16.6" r="2.5" fill={SAKURA} className="k-mark-bloom" style={d(360)} />
          <circle cx="17.2" cy="21.2" r="1.6" fill={SAKURA} opacity="0.8" className="k-mark-bloom" style={d(390)} />
          <circle cx="34.8" cy="14.2" r="2.2" fill={ROSE} opacity="0.85" className="k-mark-bloom" style={d(420)} />
          {/* The drifting petal: an oval turned in the air, not another dot. */}
          <ellipse cx="31.8" cy="30" rx="2" ry="1.15" transform="rotate(-32 31.8 30)" fill={SAKURA} opacity="0.7" className="k-mark-bloom" style={d(540)} />
        </>
      )}
    </svg>
  );
}

/** "KaizenEDU" set in the brand face. The name is never translated. */
export function KaizenWordmark({ size = 17, className = "" }: { size?: number; className?: string }) {
  return (
    <span translate="no" className={`font-brand leading-none font-semibold tracking-[-0.022em] whitespace-nowrap text-ink ${className}`.trim()} style={{ fontSize: size }}>
      Kaizen<span className="text-accent">EDU</span>
    </span>
  );
}

export function KaizenLogo({ size = 32, href, caption }: { size?: number; href?: string; caption?: string }) {
  // The wordmark scales with the mark so the pair keeps its proportions at every size.
  const body = (
    <span className="inline-flex items-center gap-2.5">
      <KaizenMark size={size} />
      <span className="leading-none">
        <KaizenWordmark size={Math.round(size * 0.53)} className="block" />
        {caption && <span className="mt-1 block text-xs leading-snug text-muted">{caption}</span>}
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
