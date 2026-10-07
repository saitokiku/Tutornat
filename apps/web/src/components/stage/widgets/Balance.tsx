"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear } from "../hear";
import { CheckRow } from "./CheckRow";
import { Act } from "./Stepper";

type BalanceWidget = Extract<Widget, { kind: "balance" }>;
type Props = { widget: BalanceWidget; onCheck?: (correct: boolean) => void; tint?: string };

/** What is on the pans: `a` x-boxes and `l` unit cubes on the left, `r` unit cubes on the right. */
export type Pans = { a: number; l: number; r: number };

/** The value of x the widget was made with: ax + b = c gives x = (c − b) / a. */
export const solutionOf = (w: BalanceWidget) => (w.rightUnits - w.leftUnits) / w.xCount;
/** Left minus right, weighing each x-box at the true value of x. Positive: the left side is heavier. */
export const tip = (p: Pans, x: number) => p.a * x + p.l - p.r;
export const equationText = (p: Pans) => `${p.a === 1 ? "" : p.a}x${p.l ? ` + ${p.l}` : ""} = ${p.r}`;
export const isSolved = (p: Pans, x: number) => p.a === 1 && p.l === 0 && tip(p, x) === 0;

/** The moves. Each returns the new pans, or null when it can't be done. Only "both" moves keep balance. */
export const MOVES = {
  both: (p: Pans) => (p.l > 0 && p.r > 0 ? { ...p, l: p.l - 1, r: p.r - 1 } : null),
  left: (p: Pans) => (p.l > 0 ? { ...p, l: p.l - 1 } : null),
  right: (p: Pans) => (p.r > 0 ? { ...p, r: p.r - 1 } : null),
  /** Share each side into `a` equal groups and keep one: needs every count to split evenly. */
  split: (p: Pans) => (p.a > 1 && p.l % p.a === 0 && p.r % p.a === 0 ? { a: 1, l: p.l / p.a, r: p.r / p.a } : null),
} satisfies Record<string, (p: Pans) => Pans | null>;
type Move = keyof typeof MOVES;

const W = 400, CX = 200, PIVOT = 30, HALF = 140, HANG = 118, TRAY = 112;

/** Cubes and x-boxes stacked on a tray, x-boxes at the bottom. */
function Load({ x, y, boxes, units, tint }: { x: number; y: number; boxes: number; units: number; tint: string }) {
  const out = [];
  const B = 24, BG = 3, U = 11, UG = 2, perB = 4, perU = 8;
  const boxRows = Math.ceil(boxes / perB);
  for (let i = 0; i < boxes; i++) {
    const row = Math.floor(i / perB), col = i % perB, inRow = Math.min(perB, boxes - row * perB);
    const bx = x - (inRow * (B + BG) - BG) / 2 + col * (B + BG), by = y - (row + 1) * (B + BG);
    out.push(
      <g key={`x${i}`}>
        <rect x={bx} y={by} width={B} height={B} rx={5} fill={tint} />
        <text x={bx + B / 2} y={by + B / 2 + 5} textAnchor="middle" fontSize="14" fontStyle="italic" fontWeight={600} fill="var(--color-panel)" fontFamily="var(--font-brand)">
          x
        </text>
      </g>,
    );
  }
  const base = y - boxRows * (B + BG);
  for (let i = 0; i < units; i++) {
    const row = Math.floor(i / perU), col = i % perU, inRow = Math.min(perU, units - row * perU);
    out.push(<rect key={`u${i}`} x={x - (inRow * (U + UG) - UG) / 2 + col * (U + UG)} y={base - (row + 1) * (U + UG)} width={U} height={U} rx={2} fill="var(--color-ink)" opacity={0.78} />);
  }
  return <>{out}</>;
}

/**
 * A balance for ax + b = c. The learner takes the same from both sides until x stands alone. Taking
 * from one side only tips the scale (x-boxes weigh the true value of x), which is the point to see;
 * Undo and Start over put it back. Every move is a button.
 */
export function Balance({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const start: Pans = { a: widget.xCount, l: widget.leftUnits, r: widget.rightUnits };
  const x = solutionOf(widget);
  const [pans, setPans] = useState<Pans>(start);
  const [history, setHistory] = useState<Pans[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const d = tip(pans, x);
  const eq = equationText(pans);
  const state = d === 0 ? t("stg.bal.level") : d > 0 ? t("stg.bal.leftHeavy") : t("stg.bal.rightHeavy");
  const solved = isSolved(pans, x);
  const readout = `${eq}. ${state}${solved ? ` ${t("stg.bal.solved", { n: pans.r })}` : ""}`;

  const act = (m: Move) => {
    const next = MOVES[m](pans);
    if (!next) return;
    setHistory([...history, pans]);
    setPans(next);
    setResult(null);
  };
  const undo = () => {
    if (!history.length) return;
    setPans(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setResult(null);
  };
  const reset = () => (setPans(start), setHistory([]), setResult(null));

  // The heavier side goes down, a little more for a bigger difference.
  const deg = Math.max(-12, Math.min(12, -d * 3));
  const rad = (deg * Math.PI) / 180;
  const dy = HALF * Math.sin(rad);
  const ease = { transition: "transform 360ms cubic-bezier(0.16, 1, 0.3, 1)" };
  const pan = (side: -1 | 1, boxes: number, units: number) => {
    const ex = CX + side * HALF;
    return (
      <g style={{ ...ease, transform: `translateY(${side * dy}px)` }}>
        <line x1={ex} x2={ex - TRAY / 2 + 8} y1={PIVOT} y2={PIVOT + HANG} stroke="var(--color-muted)" strokeWidth={1.2} />
        <line x1={ex} x2={ex + TRAY / 2 - 8} y1={PIVOT} y2={PIVOT + HANG} stroke="var(--color-muted)" strokeWidth={1.2} />
        <path d={`M ${ex - TRAY / 2} ${PIVOT + HANG} h ${TRAY} l -10 8 h ${-TRAY + 20} Z`} fill="var(--color-panel2)" stroke="var(--color-ink)" strokeWidth={1.5} strokeLinejoin="round" />
        <Load x={ex} y={PIVOT + HANG - 1} boxes={boxes} units={units} tint={tint} />
      </g>
    );
  };
  const disabled = (m: Move) => MOVES[m](pans) === null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <svg viewBox={`0 0 ${W} 200`} role="img" aria-label={`${eq}. ${state}`} className="w-full max-w-[460px]">
          <path d={`M ${CX} ${PIVOT} L ${CX} 178`} stroke="var(--color-ink)" strokeWidth={4} strokeLinecap="round" />
          <path d={`M ${CX - 34} 192 L ${CX + 34} 192 L ${CX} 172 Z`} fill="var(--color-ink)" />
          <g style={{ ...ease, transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${PIVOT}px` }}>
            <line x1={CX - HALF - 6} x2={CX + HALF + 6} y1={PIVOT} y2={PIVOT} stroke="var(--color-ink)" strokeWidth={5} strokeLinecap="round" />
          </g>
          <circle cx={CX} cy={PIVOT} r={6} fill="var(--color-accent)" />
          {pan(-1, pans.a, pans.l)}
          {pan(1, 0, pans.r)}
        </svg>
        <div className="space-y-1">
          <p aria-hidden="true" className="font-opmono text-t1 font-semibold tabular-nums text-ink">
            {eq}
          </p>
          <p aria-hidden="true" className={`text-sm font-medium ${d === 0 ? "text-good" : "text-warn"}`}>
            {state}
          </p>
          {solved && (
            <p aria-hidden="true" className="font-brand text-t2 font-semibold text-ink">
              {t("stg.bal.solved", { n: pans.r })}
            </p>
          )}
        </div>
      </div>

      {/* One side at a time sits under its pan; the moves that keep the balance come after. */}
      <div className="flex max-w-[460px] flex-wrap items-start justify-between gap-2">
        <Act onClick={() => act("left")} off={disabled("left")}>
          {t("stg.bal.takeLeft")}
        </Act>
        <Act onClick={() => act("right")} off={disabled("right")}>
          {t("stg.bal.takeRight")}
        </Act>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Act onClick={() => act("both")} off={disabled("both")}>
          {t("stg.bal.takeBoth")}
        </Act>
        {start.a > 1 && (
          <Act onClick={() => act("split")} off={disabled("split")}>
            {t("stg.bal.split", { n: pans.a > 1 ? pans.a : start.a })}
          </Act>
        )}
      </div>
      {pans.a > 1 && disabled("split") && <p className="text-xs text-muted">{t("stg.bal.splitLater", { n: pans.a })}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Act variant="ghost" onClick={undo} off={!history.length}>
          {t("stg.bal.undo")}
        </Act>
        <Act variant="ghost" onClick={reset} off={!history.length}>
          {t("stg.bal.reset")}
        </Act>
      </div>
      <div className="flex items-center gap-3">
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
        <Hear text={readout} />
      </div>

      <CheckRow
        result={result}
        onCheck={() => {
          setResult(solved);
          onCheck?.(solved);
        }}
      />
    </div>
  );
}
