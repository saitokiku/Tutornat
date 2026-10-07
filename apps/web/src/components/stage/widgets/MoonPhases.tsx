"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import type { Widget } from "@/lib/types";
import { Hear } from "../hear";
import { MoonVisual } from "../visuals";
import { CheckRow } from "./CheckRow";
import { StepButtons } from "./Slider";

type Props = { widget: Extract<Widget, { kind: "moon-phases" }>; onCheck?: (correct: boolean) => void };

const CYCLE = 29.5;

export function phaseKey(day: number): Key {
  if (day === 0 || day === 29) return "w.moon.new";
  if (day <= 6) return "w.moon.waxingCrescent";
  if (day === 7) return "w.moon.firstQuarter";
  if (day <= 13) return "w.moon.waxingGibbous";
  if (day <= 15) return "w.moon.full";
  if (day <= 21) return "w.moon.waningGibbous";
  if (day === 22) return "w.moon.lastQuarter";
  return "w.moon.waningCrescent";
}

/**
 * Walk through the 29.5-day cycle. Left: the Moon's place in its orbit with sunlight from the left
 * (half of it always lit). Right: how much of that lit half faces Earth.
 */
export function MoonPhases({ widget, onCheck }: Props) {
  const t = useT();
  const [day, setDay] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const set = (d: number) => (setDay(Math.max(0, Math.min(29, d))), setResult(null));
  const name = t(phaseKey(day));
  const readout = t("w.moon.readout", { day, name });

  // Orbit: new moon sits between Earth and the Sun (left); the Moon travels counterclockwise.
  const a = Math.PI + (2 * Math.PI * day) / CYCLE;
  const cx = 110, cy = 110, R = 72;
  const mx = cx + R * Math.cos(a), my = cy - R * Math.sin(a);

  return (
    <div className="space-y-5">
      <div className="grid items-center gap-6 sm:grid-cols-[1.2fr_1fr]">
        <figure className="space-y-2">
          <svg viewBox="0 0 220 220" role="img" aria-label={t("w.moon.orbit")} className="w-full max-w-[300px]">
            {[40, 80, 120, 160, 200].map((y0) => (
              <path key={y0} d={`M 4 ${y0 - 18} l 18 0 m -6 -5 l 6 5 l -6 5`} stroke="#c9a227" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.8} />
            ))}
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--color-border)" strokeDasharray="3 5" />
            <circle cx={cx} cy={cy} r={16} fill="var(--color-math)" />
            <text x={cx} y={cy + 32} textAnchor="middle" fontSize="10" fill="var(--color-muted)">
              {t("w.moon.earth")}
            </text>
            <g style={{ transition: "transform 300ms cubic-bezier(0.16,1,0.3,1)", transform: `translate(${mx}px, ${my}px)` }}>
              <circle r={10} fill="#2b2a27" />
              <path d="M 0 -10 A 10 10 0 0 0 0 10 Z" fill="#f3eee2" />
              <circle r={10} fill="none" stroke="var(--color-border)" />
            </g>
          </svg>
          <figcaption className="text-xs text-muted">{t("w.moon.sun")} →</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-3 rounded-md bg-panel2 px-4 py-5">
          <MoonVisual phase={day / CYCLE} alt={`${t("w.moon.view")}: ${name}`} size={140} />
          <figcaption className="text-center font-brand text-t3 font-semibold capitalize text-ink">{name}</figcaption>
        </figure>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StepButtons onPrev={() => set(day - 1)} onNext={() => set(day + 1)} prevLabel={t("w.moon.prev")} nextLabel={t("w.moon.next")} prevDisabled={day === 0} nextDisabled={day === 29}>
          <span className="min-w-14 text-center font-opmono text-sm tabular-nums text-ink">{day}</span>
        </StepButtons>
        <input
          type="range"
          min={0}
          max={29}
          value={day}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={t("w.moon.readout", { day, name })}
          className="w-40 cursor-pointer"
          style={{ accentColor: "var(--color-ink)" }}
        />
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
        <Hear text={readout} />
      </div>
      {widget.target !== undefined && (
        <CheckRow
          disabled={day === 0}
          result={result}
          onCheck={() => {
            const ok = phaseKey(day) === phaseKey(widget.target!);
            setResult(ok);
            onCheck?.(ok);
          }}
        />
      )}
    </div>
  );
}
