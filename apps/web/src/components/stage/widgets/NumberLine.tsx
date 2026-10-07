"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { fractionLabel } from "../visuals";
import { CheckRow } from "./CheckRow";
import { StepButtons } from "./Slider";

type Props = { widget: Extract<Widget, { kind: "number-line" }>; onCheck?: (correct: boolean) => void; tint?: string };

/** Move a marker along a number line by fixed jumps. Positions are integers so decimals never drift. */
export function NumberLineWidget({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const { min, max, step, denominator } = widget;
  const count = Math.round((max - min) / step) + 1;
  const valueAt = (i: number) => min + i * step;
  const [index, setIndex] = useState(Math.round((widget.start - min) / step));
  const [result, setResult] = useState<boolean | null>(null);
  const set = (i: number) => (setIndex(Math.max(0, Math.min(count - 1, i))), setResult(null));
  const label = (v: number) => fractionLabel(v, denominator);
  const every = count <= 13 ? 1 : count <= 25 ? 2 : 5;

  const W = 640, pad = 28, y = 46;
  const x = (i: number) => pad + (i / (count - 1)) * (W - pad * 2);
  const value = valueAt(index);

  return (
    <div className="space-y-5">
      <div className="relative rounded-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
        <svg viewBox={`0 0 ${W} 96`} className="w-full" aria-hidden="true">
          <line x1={pad - 14} x2={W - pad + 14} y1={y} y2={y} stroke="var(--color-ink)" strokeWidth={2.5} strokeLinecap="round" />
          {Array.from({ length: count }, (_, i) => (
            <g key={i} onClick={() => set(i)} className="cursor-pointer">
              <rect x={x(i) - 12} y={y - 26} width={24} height={64} fill="transparent" />
              <line x1={x(i)} x2={x(i)} y1={y - (i % every === 0 ? 10 : 6)} y2={y + (i % every === 0 ? 10 : 6)} stroke="var(--color-ink)" strokeWidth={1.5} />
              {i % every === 0 && (
                <text x={x(i)} y={y + 32} textAnchor="middle" fontSize="15" fill="var(--color-muted)" fontFamily="var(--font-opmono)">
                  {label(valueAt(i))}
                </text>
              )}
            </g>
          ))}
          <g style={{ transform: `translateX(${x(index)}px)`, transition: "transform 220ms cubic-bezier(0.16,1,0.3,1)" }}>
            <circle cx={0} cy={y} r={13} fill={tint} stroke="var(--color-panel)" strokeWidth={4} />
            <path d={`M -7 ${y - 24} L 7 ${y - 24} L 0 ${y - 15} Z`} fill={tint} />
          </g>
        </svg>
        <input
          type="range"
          min={0}
          max={count - 1}
          step={1}
          value={index}
          onChange={(e) => set(Number(e.target.value))}
          aria-label={t("w.number.slider")}
          aria-valuetext={label(value)}
          className="absolute inset-y-0 cursor-pointer opacity-0"
          style={{ left: `${((pad - 12) / W) * 100}%`, right: `${((pad - 12) / W) * 100}%`, width: "auto" }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StepButtons
          onPrev={() => set(index - 1)}
          onNext={() => set(index + 1)}
          prevLabel={t("w.number.left")}
          nextLabel={t("w.number.right")}
          prevDisabled={index === 0}
          nextDisabled={index === count - 1}
        >
          <span className="min-w-14 text-center font-opmono text-sm tabular-nums text-ink">{label(value)}</span>
        </StepButtons>
        <p aria-live="polite" className="text-sm text-muted">
          {t("w.number.readout", { value: label(value) })}
        </p>
      </div>
      {widget.target !== undefined && (
        <CheckRow
          result={result}
          onCheck={() => {
            const ok = Math.abs(value - widget.target!) < 1e-9;
            setResult(ok);
            onCheck?.(ok);
          }}
        />
      )}
    </div>
  );
}
