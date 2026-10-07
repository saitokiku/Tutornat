"use client";

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { IconCheck } from "@/components/icons";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear } from "../hear";
import { CheckRow } from "./CheckRow";
import { Act } from "./Stepper";
import { signed } from "./order";

type Props = { widget: Extract<Widget, { kind: "coordinate" }>; onCheck?: (correct: boolean) => void; tint?: string };
type Pt = [number, number];

export const pointText = ([x, y]: Pt) => `(${signed(x)}, ${signed(y)})`;
const has = (list: Pt[], [x, y]: Pt) => list.some((p) => p[0] === x && p[1] === y);
/** Right when the plotted points are exactly the targets, in any order, with nothing extra. */
export const samePoints = (a: Pt[], b: Pt[]) => a.length === b.length && a.every((p) => has(b, p));
/** Toggle a point: plot it, or take it off if it is already there. */
export const togglePoint = (list: Pt[], p: Pt): Pt[] => (has(list, p) ? list.filter((q) => q[0] !== p[0] || q[1] !== p[1]) : [...list, p]);

/**
 * Plot points on a grid. A cursor moves by the arrow buttons (or arrow keys while one has focus) and
 * "Plot" places a point under it; tapping the grid plots at the nearest crossing. Every point is listed
 * in words with its own remove button.
 */
export function Coordinate({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const { min, max } = widget;
  const startAt = (v: number) => Math.max(min, Math.min(max, v));
  const [cursor, setCursor] = useState<Pt>([startAt(0), startAt(0)]);
  const [points, setPoints] = useState<Pt[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const plot = useRef<HTMLButtonElement>(null);

  const span = max - min;
  const S = 300, pad = 22, cell = (S - pad * 2) / span;
  const X = (v: number) => pad + (v - min) * cell, Y = (v: number) => S - pad - (v - min) * cell;
  const every = span > 12 ? 2 : 1;
  const ticks = Array.from({ length: span + 1 }, (_, i) => min + i);
  const changed = () => (setResult(null), setChecked(false));
  const moveBy = (dx: number, dy: number) => setCursor(([x, y]) => [startAt(x + dx), startAt(y + dy)]);
  const toggle = (p: Pt) => (setPoints((list) => togglePoint(list, p)), changed());
  const onCursor = has(points, cursor);

  const onGrid = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * S, py = ((e.clientY - r.top) / r.height) * S;
    const p: Pt = [startAt(Math.round((px - pad) / cell + min)), startAt(Math.round((S - pad - py) / cell + min))];
    setCursor(p);
    toggle(p);
  };
  const keys = (e: KeyboardEvent) => {
    const d: Record<string, Pt> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (!d[e.key]) return;
    e.preventDefault();
    moveBy(...d[e.key]);
  };
  const listed = points.length ? t("stg.coord.points", { list: points.map(pointText).join(", ") }) : t("stg.coord.none");
  const readout = `${t("stg.coord.cursor", { point: pointText(cursor) })} ${listed}`;
  const arrow = "grid size-11 place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,20rem)_1fr] sm:items-start">
        <svg
          viewBox={`0 0 ${S} ${S}`}
          role="img"
          aria-label={`${t("stg.coord.picture", { min: signed(min), max: signed(max) })} ${listed}`}
          onClick={onGrid}
          className="w-full max-w-[20rem] cursor-crosshair touch-manipulation"
        >
          <rect x={pad} y={pad} width={S - pad * 2} height={S - pad * 2} fill="var(--color-panel)" />
          {ticks.map((v) => (
            <g key={v} stroke="var(--color-border)">
              <line x1={X(v)} x2={X(v)} y1={pad} y2={S - pad} />
              <line y1={Y(v)} y2={Y(v)} x1={pad} x2={S - pad} />
            </g>
          ))}
          {min <= 0 && max >= 0 && (
            <g stroke="var(--color-ink)" strokeWidth={1.6}>
              <line x1={X(0)} x2={X(0)} y1={pad - 6} y2={S - pad + 6} />
              <line y1={Y(0)} y2={Y(0)} x1={pad - 6} x2={S - pad + 6} />
            </g>
          )}
          {ticks
            .filter((v) => v !== 0 && v % every === 0)
            .map((v) => (
              <g key={`l${v}`} fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-opmono)">
                <text x={X(v)} y={Y(Math.max(min, Math.min(max, 0))) + 14} textAnchor="middle">
                  {signed(v)}
                </text>
                <text x={X(Math.max(min, Math.min(max, 0))) - 5} y={Y(v) + 3.5} textAnchor="end">
                  {signed(v)}
                </text>
              </g>
            ))}
          {points.map((p) => {
            const wrong = checked && !has(widget.targets, p);
            return <circle key={pointText(p)} cx={X(p[0])} cy={Y(p[1])} r={7} fill={wrong ? "var(--color-bad)" : tint} stroke="var(--color-panel)" strokeWidth={2.5} />;
          })}
          <circle cx={X(cursor[0])} cy={Y(cursor[1])} r={11} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} />
        </svg>

        <div className="space-y-4">
          <div onKeyDown={keys} className="grid w-max grid-cols-3 gap-1.5" role="group" aria-label={t("stg.coord.move")}>
            <span />
            <button type="button" aria-label={t("stg.coord.up")} onClick={() => moveBy(0, 1)} className={arrow}>
              <Arrow d="M12 18V6m-5 5 5-5 5 5" />
            </button>
            <span />
            <button type="button" aria-label={t("stg.coord.left")} onClick={() => moveBy(-1, 0)} className={arrow}>
              <Arrow d="M18 12H6m5-5-5 5 5 5" />
            </button>
            <span aria-hidden="true" className="grid place-items-center font-opmono text-xs tabular-nums text-ink">
              {pointText(cursor)}
            </span>
            <button type="button" aria-label={t("stg.coord.right")} onClick={() => moveBy(1, 0)} className={arrow}>
              <Arrow d="M6 12h12m-5-5 5 5-5 5" />
            </button>
            <span />
            <button type="button" aria-label={t("stg.coord.down")} onClick={() => moveBy(0, -1)} className={arrow}>
              <Arrow d="M12 6v12m-5-5 5 5 5-5" />
            </button>
            <span />
          </div>
          <Act ref={plot} onClick={() => toggle(cursor)}>{onCursor ? t("stg.coord.remove", { point: pointText(cursor) }) : t("stg.coord.plot", { point: pointText(cursor) })}</Act>
          {points.length > 0 && (
            <ul className="space-y-1.5">
              {points.map((p) => {
                const right = checked && has(widget.targets, p);
                const wrong = checked && !right;
                return (
                  <li key={pointText(p)} className="flex items-center gap-2 text-sm text-ink">
                    <span className="font-opmono tabular-nums">{pointText(p)}</span>
                    {right && <IconCheck size={14} className="text-good" />}
                    {wrong && <span className="text-xs font-medium text-bad">{t("stg.coord.notTarget")}</span>}
                    <Act variant="ghost" onClick={() => (toggle(p), plot.current?.focus())} aria-label={t("stg.coord.remove", { point: pointText(p) })}>
                      {t("stg.coord.removeShort")}
                    </Act>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
        <Hear text={readout} />
      </div>
      <CheckRow
        disabled={!points.length}
        result={result}
        onCheck={() => {
          const ok = samePoints(points, widget.targets);
          setResult(ok);
          setChecked(true);
          onCheck?.(ok);
        }}
      />
    </div>
  );
}

function Arrow({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
