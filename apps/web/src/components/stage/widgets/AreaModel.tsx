"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear } from "../hear";
import { CheckRow } from "./CheckRow";
import { Stepper } from "./Stepper";

type Props = { widget: Extract<Widget, { kind: "area-model" }>; onCheck?: (correct: boolean) => void; tint?: string };

export const AREA_MAX = 12;
const clamp = (n: number) => Math.max(1, Math.min(AREA_MAX, Math.round(n)));

/** Past 10, a side splits into ten and the rest, so 3 × 12 reads as 3 × 10 + 3 × 2 (partial products). */
export function partialProducts(rows: number, cols: number): string | null {
  if (rows <= 10 && cols <= 10) return null;
  const split = (n: number) => (n > 10 ? [10, n - 10] : [n]);
  const parts = split(rows).flatMap((r) => split(cols).map((c) => [r, c] as const));
  return `${rows} × ${cols} = ${parts.map(([r, c]) => `${r} × ${c}`).join(" + ")} = ${parts.map(([r, c]) => r * c).join(" + ")} = ${rows * cols}`;
}

/**
 * Multiplication as area: a rectangle of unit squares on a 12 × 12 board. Rows and columns change by
 * buttons (tap or keyboard); the board shows the space left so the rectangle visibly grows.
 */
export function AreaModel({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const [rows, setRows] = useState(clamp(widget.rows));
  const [cols, setCols] = useState(clamp(widget.cols));
  const [result, setResult] = useState<boolean | null>(null);
  const total = rows * cols;
  const split = partialProducts(rows, cols);
  const readout = t("stg.area.readout", { rows, cols, total });

  const U = 22, L = 26, T = 22; // cell, left label room, top label room
  const size = AREA_MAX * U;
  const cut = (n: number) => (n > 10 ? 10 : null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5 sm:gap-8">
        <svg viewBox={`0 0 ${L + size + 4} ${T + size + 4}`} role="img" aria-label={t("stg.area.picture", { rows, cols })} className="w-full max-w-[360px]">
          {Array.from({ length: AREA_MAX * AREA_MAX }, (_, k) => {
            const r = Math.floor(k / AREA_MAX), c = k % AREA_MAX;
            const on = r < rows && c < cols;
            return (
              <rect
                key={k}
                x={L + c * U + 1}
                y={T + r * U + 1}
                width={U - 2}
                height={U - 2}
                rx={3}
                fill={on ? tint : "var(--color-panel2)"}
                opacity={on ? 0.85 : 1}
                className="transition-[fill] duration-150"
              />
            );
          })}
          <rect x={L} y={T} width={cols * U} height={rows * U} fill="none" stroke="var(--color-ink)" strokeWidth={2} rx={4} />
          {cut(cols) && <line x1={L + 10 * U} x2={L + 10 * U} y1={T - 4} y2={T + rows * U + 4} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="4 3" />}
          {cut(rows) && <line y1={T + 10 * U} y2={T + 10 * U} x1={L - 4} x2={L + cols * U + 4} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="4 3" />}
          <text x={L + (cols * U) / 2} y={T - 7} textAnchor="middle" fontSize="13" fontWeight={600} fill="var(--color-ink)" fontFamily="var(--font-opmono)">
            {cols}
          </text>
          <text x={L - 8} y={T + (rows * U) / 2 + 4} textAnchor="end" fontSize="13" fontWeight={600} fill="var(--color-ink)" fontFamily="var(--font-opmono)">
            {rows}
          </text>
        </svg>
        <div className="min-w-0 space-y-2">
          <p aria-hidden="true" className="font-brand text-d3 font-semibold tabular-nums text-ink">
            {rows} × {cols} = {total}
          </p>
          {split && <p className="font-opmono text-sm tabular-nums text-muted">{split}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Stepper
          label={t("stg.area.rows")}
          value={rows}
          onMinus={() => (setRows(clamp(rows - 1)), setResult(null))}
          onPlus={() => (setRows(clamp(rows + 1)), setResult(null))}
          minusLabel={t("stg.area.fewerRows")}
          plusLabel={t("stg.area.moreRows")}
          minusDisabled={rows <= 1}
          plusDisabled={rows >= AREA_MAX}
        />
        <Stepper
          label={t("stg.area.cols")}
          value={cols}
          onMinus={() => (setCols(clamp(cols - 1)), setResult(null))}
          onPlus={() => (setCols(clamp(cols + 1)), setResult(null))}
          minusLabel={t("stg.area.fewerCols")}
          plusLabel={t("stg.area.moreCols")}
          minusDisabled={cols <= 1}
          plusDisabled={cols >= AREA_MAX}
        />
      </div>
      <div className="flex items-center gap-3">
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
        <Hear text={readout} />
      </div>

      {widget.target && (
        <CheckRow
          result={result}
          onCheck={() => {
            const ok = rows === widget.target!.rows && cols === widget.target!.cols;
            setResult(ok);
            onCheck?.(ok);
          }}
        />
      )}
    </div>
  );
}
