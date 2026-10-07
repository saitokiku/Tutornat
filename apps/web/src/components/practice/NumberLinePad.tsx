"use client";

import { useId, useMemo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { useT } from "@/i18n";
import { DEFAULT_PADS, linePoints, nearestPoint, pointOf, startPoint, type LinePad } from "./pad-math";

// Answer by placing a point on a number line: tap anywhere on the (tall) line, or use the arrow keys
// or the two step buttons. The response is the point's value ("-2", "3/4"), read by the checker.

type Props = {
  pad?: LinePad;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  young?: boolean;
  disabled?: boolean;
  tint?: string;
};

const W = 640, INSET = 28; // drawing units; the line runs from INSET to W − INSET
const at = (i: number, count: number) => INSET + (count > 1 ? i / (count - 1) : 0.5) * (W - 2 * INSET);
const pct = (i: number, count: number) => `${(at(i, count) / W) * 100}%`;

export function NumberLinePad({ pad = DEFAULT_PADS.line, value, onChange, onSubmit, young, disabled, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const desc = useId();
  const track = useRef<HTMLDivElement>(null);
  const points = useMemo(() => linePoints(pad), [pad]);
  const count = points.length;
  const index = pointOf(points, value);
  const placed = index >= 0;
  const start = startPoint(points);
  const majors = points.flatMap((p, i) => (p.major ? [i] : []));
  // PageUp/PageDown jump from one labelled point to the next.
  const jump = majors.length > 1 ? majors[1] - majors[0] : Math.max(1, Math.round(count / 10));
  // With many labels, a phone shows every other one so the numbers never collide.
  const crowded = majors.length > 6;

  const place = (i: number) => {
    if (disabled) return;
    onChange(points[Math.max(0, Math.min(count - 1, i))].response);
  };
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = track.current?.getBoundingClientRect();
    if (!box?.width) return;
    const x = ((e.clientX - box.left) / box.width) * W;
    place(nearestPoint((x - INSET) / (W - 2 * INSET), count));
  };
  const onKey = (e: KeyboardEvent) => {
    const moves: Record<string, () => number> = {
      ArrowRight: () => (placed ? index + 1 : start),
      ArrowUp: () => (placed ? index + 1 : start),
      ArrowLeft: () => (placed ? index - 1 : start),
      ArrowDown: () => (placed ? index - 1 : start),
      PageUp: () => (placed ? index + jump : start),
      PageDown: () => (placed ? index - jump : start),
      Home: () => 0,
      End: () => count - 1,
    };
    if (e.key === "Enter") {
      e.preventDefault();
      if (placed) onSubmit();
      return;
    }
    if (!moves[e.key]) return;
    e.preventDefault();
    place(moves[e.key]());
  };

  const label = placed ? points[index].label : "";
  const stepBtn = `grid shrink-0 place-items-center rounded-full border border-border bg-panel text-ink shadow-soft transition-colors hover:border-ink/30 disabled:opacity-30 ${young ? "size-14" : "size-11"}`;
  return (
    <div className="mx-auto w-full max-w-xl space-y-3">
      <p id={desc} className="sr-only">
        {pad.denominator
          ? t("pr.line.describeParts", { min: points[0].label, max: points[count - 1].label, n: pad.denominator })
          : t("pr.line.describe", { min: points[0].label, max: points[count - 1].label })}
      </p>
      <div
        ref={track}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t("pr.line.label")}
        aria-describedby={desc}
        aria-valuemin={points[0].value}
        aria-valuemax={points[count - 1].value}
        aria-valuenow={placed ? points[index].value : undefined}
        aria-valuetext={placed ? label : t("pr.line.none")}
        aria-disabled={disabled || undefined}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons && e.currentTarget.hasPointerCapture?.(e.pointerId)) fromPointer(e);
        }}
        className={`relative cursor-pointer touch-none select-none rounded-md ${young ? "h-32" : "h-28"}`}
      >
        <svg viewBox={`0 0 ${W} 40`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-10 w-full -translate-y-1/2">
          <line x1={INSET - 14} x2={W - INSET + 14} y1={20} y2={20} stroke="var(--color-ink)" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <line
              key={p.response}
              x1={at(i, count)}
              x2={at(i, count)}
              y1={p.major ? 5 : 12}
              y2={p.major ? 35 : 28}
              stroke="var(--color-ink)"
              strokeWidth={p.major ? 2 : 1.25}
              opacity={p.major ? 1 : 0.65}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-1 h-6">
          {majors.map((i, k) => (
            <span
              key={i}
              className={`absolute -translate-x-1/2 font-opmono text-xs tabular-nums text-muted sm:text-sm ${crowded && k % 2 === 1 ? "hidden sm:block" : ""}`}
              style={{ left: pct(i, count) }}
            >
              {points[i].label}
            </span>
          ))}
        </div>
        {placed && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 font-opmono text-xs font-semibold tabular-nums text-paper transition-[left] duration-150 ease-out"
              style={{ left: pct(index, count) }}
            >
              {label}
            </span>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-panel shadow-soft transition-[left] duration-150 ease-out ${young ? "size-9" : "size-7"}`}
              style={{ left: pct(index, count), background: tint }}
            />
          </>
        )}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => place(placed ? index - 1 : start)} disabled={disabled || (placed && index === 0)} aria-label={t("pr.line.left")} className={stepBtn}>
          <IconChevronLeft size={20} />
        </button>
        <p aria-live="polite" className={`min-w-0 flex-1 text-center text-ink ${young ? "text-t3" : "text-sm"}`}>
          {placed ? t("pr.line.at", { value: label }) : t("pr.line.tap")}
        </p>
        <button type="button" onClick={() => place(placed ? index + 1 : start)} disabled={disabled || (placed && index === count - 1)} aria-label={t("pr.line.right")} className={stepBtn}>
          <IconChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
