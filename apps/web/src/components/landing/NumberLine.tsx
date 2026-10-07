import type { ReactNode } from "react";
import { fractionLabel } from "@/components/stage/visuals";

// The hero's number line, drawn from the engine's own visual (min, max, labelled marks, 1/d ticks, the
// dot). Line and ticks stretch with the sheet; labels, the dot and the pen mark stay at reading size, so a
// 320px phone reads it as clearly as a laptop. The one authored moment of the page lives here: when the
// checker says right, a rose ring is drawn around the dot like a teacher's pen and the answer is set
// above it. "Not yet" only rings the dot in a quiet dashed line: look here again.

export type Mark = "none" | "right" | "notYet";

export function HeroLine({
  min,
  max,
  marks,
  denominator,
  marker,
  alt,
  tint,
  mark,
  answer,
}: {
  min: number;
  max: number;
  marks: number[];
  denominator?: number;
  marker?: number;
  alt: string;
  tint: string;
  mark: Mark;
  /** What is set above the dot once the answer is right. */
  answer?: ReactNode;
}) {
  const at = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  const ticks = denominator
    ? Array.from({ length: Math.round((max - min) * denominator) + 1 }, (_, k) => min + k / denominator).filter((v) => !marks.some((m) => Math.abs(m - v) < 1e-9))
    : [];
  const dense = marks.length > 7;
  return (
    <div role="img" aria-label={alt} className={`relative h-28 select-none ${dense ? "px-2 sm:px-6" : "px-4 sm:px-6"}`}>
      <div aria-hidden="true" className="relative h-full">
        <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="absolute inset-x-0 top-11 h-8 w-full overflow-visible">
          <line x1="-3" x2="103" y1="16" y2="16" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {ticks.map((v) => {
            const x = ((v - min) / (max - min)) * 100;
            return <line key={`t${v}`} x1={x} x2={x} y1="9" y2="23" stroke="var(--color-ink)" strokeWidth="1.25" opacity="0.55" vectorEffect="non-scaling-stroke" />;
          })}
          {marks.map((m) => {
            const x = ((m - min) / (max - min)) * 100;
            return <line key={`m${m}`} x1={x} x2={x} y1="4" y2="28" stroke="var(--color-ink)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {marks.map((m) => (
          <span
            key={m}
            className={`absolute top-[5.25rem] -translate-x-1/2 leading-none font-medium tabular-nums ${dense ? "text-xs text-muted" : "text-body text-ink"}`}
            style={{ left: at(m) }}
          >
            {fractionLabel(m, denominator)}
          </span>
        ))}
        {marker !== undefined && (
          <span className="absolute top-15 size-12 -translate-x-1/2 -translate-y-1/2" style={{ left: at(marker) }}>
            <svg viewBox="0 0 48 48" className="size-full overflow-visible">
              {mark === "notYet" && <circle cx="24" cy="24" r="17" fill="none" stroke="var(--color-border-strong)" strokeWidth="1.75" strokeDasharray="3 4" />}
              {mark === "right" && (
                <circle cx="24" cy="24" r="17" fill="none" stroke="var(--color-accent)" strokeWidth="2.25" strokeLinecap="round" pathLength={1} transform="rotate(-100 24 24)" className="animate-draw [stroke-dasharray:1_1]" />
              )}
              <circle cx="24" cy="24" r="9" fill={tint} stroke="var(--color-panel)" strokeWidth="3" />
            </svg>
          </span>
        )}
        {marker !== undefined && mark === "right" && answer && (
          <span className="k-enter absolute -top-3 -translate-x-1/2 text-ink" style={{ left: at(marker) }}>
            {answer}
          </span>
        )}
      </div>
    </div>
  );
}

/** A fraction set the way it is written on paper: numerator over a bar over denominator. */
export function Stacked({ n, d, className = "" }: { n: number | string; d: number | string; className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none font-semibold tabular-nums ${className}`.trim()}>
      <span className="px-1 pb-1">{n}</span>
      <span className="h-0.5 w-full rounded-full bg-current" />
      <span className="px-1 pt-1">{d}</span>
    </span>
  );
}
