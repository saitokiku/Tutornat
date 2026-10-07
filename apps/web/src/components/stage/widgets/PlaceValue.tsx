"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Key } from "@/i18n/en";
import type { Widget } from "@/lib/types";
import { Hear } from "../hear";
import { BaseTenVisual } from "../visuals-practice";
import { CheckRow } from "./CheckRow";
import { Stepper } from "./Stepper";

type Props = { widget: Extract<Widget, { kind: "place-value" }>; onCheck?: (correct: boolean) => void; tint?: string };
type Place = "h" | "t" | "o";

const VALUE: Record<Place, number> = { h: 100, t: 10, o: 1 };
const COUNT: Record<Place, Key> = { h: "stg.pv.hundreds", t: "stg.pv.tens", o: "stg.pv.ones" };
const NAME: Record<Place, Key> = { h: "stg.pv.h", t: "stg.pv.t", o: "stg.pv.o" };
const ADD: Record<Place, Key> = { h: "stg.pv.addH", t: "stg.pv.addT", o: "stg.pv.addO" };
const SUB: Record<Place, Key> = { h: "stg.pv.subH", t: "stg.pv.subT", o: "stg.pv.subO" };

/** A small picture of each block beside its name: a flat, a rod, a cube. */
function Glyph({ place, tint }: { place: Place; tint: string }) {
  const lines = (n: number, along: "x" | "y", len: number) =>
    Array.from({ length: n - 1 }, (_, k) => (along === "x" ? <line key={k} x1={1 + (k + 1) * 2} x2={1 + (k + 1) * 2} y1={1} y2={1 + len} /> : <line key={k} y1={1 + (k + 1) * 2} y2={1 + (k + 1) * 2} x1={1} x2={1 + len} />));
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
      <g fill={tint} stroke="var(--color-panel)" strokeWidth={0.6}>
        {place === "h" && (
          <>
            <rect x={1} y={1} width={20} height={20} rx={1.5} />
            {lines(10, "x", 20)}
            {lines(10, "y", 20)}
          </>
        )}
        {place === "t" && (
          <g transform="translate(8 0)">
            <rect x={1} y={1} width={4} height={20} rx={1} />
            {lines(10, "y", 4)}
          </g>
        )}
        {place === "o" && <rect x={7} y={7} width={8} height={8} rx={1.5} />}
      </g>
    </svg>
  );
}

/** The largest number the blocks may make, and so which places are shown. */
export const placeMax = (w: { target: number; max?: number }) => Math.min(999, w.max ?? (w.target >= 100 ? 999 : 99));
export const placesFor = (max: number): Place[] => (max >= 100 ? ["h", "t", "o"] : max >= 10 ? ["t", "o"] : ["o"]);

/** Build a number from hundreds flats, tens rods and ones cubes. Each place holds 0 to 9 blocks. */
export function PlaceValue({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const max = placeMax(widget);
  const places = placesFor(max);
  const [n, setN] = useState<Record<Place, number>>({ h: 0, t: 0, o: 0 });
  const [result, setResult] = useState<boolean | null>(null);
  const value = n.h * 100 + n.t * 10 + n.o;
  const parts = places.map((p) => t(COUNT[p], { n: n[p] })).join(", ");
  const readout = t("stg.pv.readout", { parts, value });
  const change = (p: Place, d: number) => {
    setN({ ...n, [p]: Math.max(0, Math.min(9, n[p] + d)) });
    setResult(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5 sm:gap-8">
        <figure className="flex min-h-28 w-full min-w-0 items-center rounded-md bg-panel2 px-4 py-4 sm:w-auto sm:flex-1">
          {value === 0 ? (
            <p className="text-sm text-muted">{t("stg.pv.empty")}</p>
          ) : (
            <BaseTenVisual hundreds={n.h} tens={n.t} ones={n.o} alt={parts} tint={tint} />
          )}
        </figure>
        <table className="shrink-0 border-collapse text-center">
          <thead>
            <tr>
              {places.map((p) => (
                <th key={p} scope="col" className="border border-border bg-panel2 px-3 py-1.5 text-xs font-medium text-muted">
                  {t(NAME[p])}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {places.map((p) => (
                <td key={p} className="border border-border px-3 py-2 font-brand text-t1 font-semibold tabular-nums text-ink">
                  {n[p]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {places.map((p) => (
          <Stepper
            key={p}
            label={t(NAME[p])}
            value={n[p]}
            onMinus={() => change(p, -1)}
            onPlus={() => change(p, 1)}
            minusLabel={t(SUB[p])}
            plusLabel={t(ADD[p])}
            minusDisabled={n[p] <= 0}
            plusDisabled={n[p] >= 9 || value + VALUE[p] > max}
            glyph={<Glyph place={p} tint={tint} />}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
        <Hear text={readout} />
      </div>

      <CheckRow
        disabled={value === 0}
        result={result}
        onCheck={() => {
          const ok = value === widget.target;
          setResult(ok);
          onCheck?.(ok);
        }}
      />
    </div>
  );
}
