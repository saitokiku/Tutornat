"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear, useHear } from "../hear";
import { fractionLabel } from "../visuals";
import { CheckRow } from "./CheckRow";
import { StepButtons } from "./Slider";

type Props = { widget: Extract<Widget, { kind: "number-line" }>; onCheck?: (correct: boolean) => boolean | void; tint?: string };

/** Move a marker along a number line by fixed jumps. Positions are integers so decimals never drift. */
export function NumberLineWidget({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const { locale } = useHear();
  const { min, max, step, denominator } = widget;
  const count = Math.round((max - min) / step) + 1;
  const valueAt = (i: number) => min + i * step;
  const startIndex = Math.round((widget.start - min) / step);
  const [index, setIndex] = useState(startIndex);
  const [result, setResult] = useState<boolean | null>(null);
  const set = (i: number) => (setIndex(Math.max(0, Math.min(count - 1, i))), setResult(null));
  const label = (v: number) => fractionLabel(v, denominator, locale);
  // Label round values only (at most 6 labels) so the numbers stay readable on a phone.
  const offset = Math.round(min / step);
  const every = [1, 2, 5, 10, 20, 50].find((k) => Math.floor((count - 1) / k) + 1 <= 6) ?? 100;
  const labelled = (i: number) => (((offset + i) % every) + every) % every === 0;

  const W = 640, pad = 28;
  const x = (i: number) => pad + (i / (count - 1)) * (W - pad * 2);
  const value = valueAt(index);
  const readout = t("w.number.readout", { value: label(value) });

  return (
    <div className="space-y-5">
      <div className="relative rounded-sm pb-8 pt-7 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
        {/* Line and ticks scale with the width; labels and the marker are HTML so they stay readable on phones. */}
        <svg viewBox={`0 0 ${W} 40`} preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
          <line x1={pad - 14} x2={W - pad + 14} y1={20} y2={20} stroke="var(--color-ink)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {Array.from({ length: count }, (_, i) => (
            <line key={i} x1={x(i)} x2={x(i)} y1={labelled(i) ? 8 : 13} y2={labelled(i) ? 32 : 27} stroke="var(--color-ink)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-7">
          {Array.from({ length: count }, (_, i) =>
            labelled(i) ? (
              <span key={i} className="absolute -translate-x-1/2 font-opmono text-xs tabular-nums text-muted sm:text-sm" style={{ left: `${(x(i) / W) * 100}%` }}>
                {label(valueAt(i))}
              </span>
            ) : null,
          )}
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[2.375rem] size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-panel shadow-soft transition-[left] duration-200 ease-out"
          style={{ left: `${(x(index) / W) * 100}%`, background: tint }}
        />
        <span aria-hidden="true" className="pointer-events-none absolute top-1 -translate-x-1/2 font-opmono text-xs font-semibold tabular-nums text-ink transition-[left] duration-200 ease-out" style={{ left: `${(x(index) / W) * 100}%` }}>
          {label(value)}
        </span>
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
          {readout}
        </p>
        <Hear text={readout} />
      </div>
      {widget.target !== undefined && (
        <CheckRow
          disabled={index === startIndex}
          result={result}
          onCheck={() => {
            const ok = Math.abs(value - widget.target!) < 1e-9;
            if (onCheck?.(ok) === false) return;
            setResult(ok);
          }}
        />
      )}
    </div>
  );
}
