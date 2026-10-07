"use client";

// ProgressBar (how much of a task is done) and Meter (where a measurement sits in its range). Both say the
// real count — "3 of 10" — to people and to screen readers; neither ever shows an invented percentage.
import type { CSSProperties, ReactNode } from "react";
import { useT } from "@/i18n";

const FILL = {
  ink: "bg-ink",
  accent: "bg-accent",
  good: "bg-good",
  math: "bg-math",
  science: "bg-science",
  english: "bg-english",
} as const;

const HEIGHT = { sm: "h-1", md: "h-1.5", lg: "h-2.5" } as const;

const ratio = (value: number, min: number, max: number) => (max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0);

type Shared = {
  value: number;
  max: number;
  /** What is being counted, e.g. "Problems answered". The accessible name. */
  label: string;
  /** Visible figure; defaults to "{value} of {max}". `false` hides it (the label must then be on screen). */
  figure?: ReactNode | false;
  size?: keyof typeof HEIGHT;
  className?: string;
};

export function ProgressBar({ value, max, label, figure, size = "md", tone = "ink", className = "" }: Shared & { tone?: keyof typeof FILL }) {
  const t = useT();
  const text = t("ds.ofTotal", { n: value, total: max });
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        className={`relative min-w-12 flex-1 overflow-hidden rounded-full bg-panel2 inset-shadow-well ${HEIGHT[size]}`}
      >
        <span className={`k-progress-fill absolute inset-0 ${FILL[tone]}`} style={{ "--v": ratio(value, 0, max) } as CSSProperties} />
      </div>
      {figure !== false && <span className="k-meta shrink-0">{figure ?? text}</span>}
    </div>
  );
}

/**
 * A measurement against a range, like minutes used of today's budget. Past `high` the fill turns warn
 * (a fact, not a scold). Quarter ticks make it read as a gauge, not a task bar.
 */
export function Meter({ value, min = 0, max, high, label, figure, size = "md", className = "" }: Shared & { min?: number; high?: number }) {
  const t = useT();
  const text = t("ds.ofTotal", { n: value, total: max });
  const over = high !== undefined && value > high;
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        className={`relative min-w-12 flex-1 overflow-hidden rounded-full bg-panel2 inset-shadow-well ${HEIGHT[size]}`}
      >
        <span className={`k-meter-fill absolute inset-0 ${over ? "bg-warn" : "bg-ink/70"}`} style={{ "--v": ratio(value, min, max) } as CSSProperties} />
        {[0.25, 0.5, 0.75].map((x) => (
          <span key={x} aria-hidden="true" className="absolute inset-y-0 w-px bg-panel/80" style={{ left: `${x * 100}%` }} />
        ))}
      </div>
      {figure !== false && <span className={`k-meta shrink-0 ${over ? "text-warn" : ""}`}>{figure ?? text}</span>}
    </div>
  );
}
