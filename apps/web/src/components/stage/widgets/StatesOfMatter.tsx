"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear } from "../hear";
import { CheckRow } from "./CheckRow";
import { StepButtons } from "./Slider";

type State = "solid" | "liquid" | "gas";
type Props = { widget: Extract<Widget, { kind: "states-of-matter" }>; onCheck?: (correct: boolean) => void };

const MIN = -30, STEP = 10, COUNT = 17; // −30 … 130 °C
export const stateAt = (c: number): State => (c <= 0 ? "solid" : c < 100 ? "liquid" : "gas");

// Same particles, rearranged: packed in rows, sliding past each other at the bottom, spread apart.
const LAYOUT: Record<State, [number, number][]> = {
  solid: Array.from({ length: 20 }, (_, i) => [70 + (i % 5) * 22, 64 + Math.floor(i / 5) * 22] as [number, number]),
  liquid: [
    [44, 152], [68, 156], [92, 150], [116, 156], [140, 152], [164, 146], [56, 132], [80, 136], [104, 130], [128, 134],
    [152, 128], [40, 112], [68, 116], [94, 110], [120, 114], [146, 108], [176, 124], [60, 94], [90, 92], [118, 96],
  ],
  gas: [
    [34, 30], [104, 22], [178, 40], [62, 66], [140, 74], [32, 112], [100, 100], [182, 112], [64, 154], [132, 150],
    [176, 168], [30, 176], [150, 120], [96, 58], [48, 138], [160, 24], [118, 176], [184, 80], [76, 20], [20, 66],
  ],
};
const JIGGLE: Record<State, string> = { solid: "1px", liquid: "3px", gas: "6px" };

/** Change water's temperature and watch the same particles change arrangement and motion. */
export function StatesOfMatter({ widget, onCheck }: Props) {
  const t = useT();
  const [index, setIndex] = useState(Math.round((widget.startC - MIN) / STEP));
  const [result, setResult] = useState<boolean | null>(null);
  const set = (i: number) => (setIndex(Math.max(0, Math.min(COUNT - 1, i))), setResult(null));
  const temp = MIN + index * STEP;
  const shown = String(temp).replace("-", "\u2212");
  const state = stateAt(temp);
  const stateLabel = t(`w.matter.${state}` as const);
  const warmth = index / (COUNT - 1);
  const readout = t("w.matter.readout", { t: shown, state: stateLabel });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-stretch gap-5">
        <svg viewBox="0 0 212 196" className="w-full max-w-[280px]" aria-hidden="true">
          <rect x={6} y={6} width={200} height={184} rx={16} fill="var(--color-panel2)" stroke="var(--color-border)" />
          {LAYOUT[state].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={9}
              fill="var(--color-science)"
              opacity={0.88}
              className="animate-jiggle"
              style={{
                ["--j" as string]: JIGGLE[state],
                transformBox: "fill-box",
                animationDelay: `${(i % 7) * -0.13}s`,
                animationDuration: state === "gas" ? "0.7s" : state === "liquid" ? "1.1s" : "0.5s",
                transition: "cx 400ms cubic-bezier(0.16,1,0.3,1), cy 400ms cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          ))}
        </svg>
        <div className="flex min-w-40 flex-1 flex-col justify-center gap-3">
          <p className="font-brand text-d3 font-semibold tabular-nums text-ink">{shown} °C</p>
          <p className="font-brand text-t2 font-semibold capitalize text-science">{stateLabel}</p>
          <input
            type="range"
            min={0}
            max={COUNT - 1}
            step={1}
            value={index}
            onChange={(e) => set(Number(e.target.value))}
            aria-label={t("w.matter.temp")}
            aria-valuetext={t("w.matter.readout", { t: temp, state: stateLabel })}
            className="h-3 w-full cursor-pointer appearance-none rounded-full"
            style={{
              accentColor: "var(--color-ink)",
              background: `linear-gradient(to right, color-mix(in srgb, var(--color-bad) ${Math.round(warmth * 100)}%, var(--color-math)) ${warmth * 100}%, var(--color-panel2) ${warmth * 100}%)`,
            }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StepButtons
          onPrev={() => set(index - 1)}
          onNext={() => set(index + 1)}
          prevLabel={t("w.matter.colder")}
          nextLabel={t("w.matter.warmer")}
          prevDisabled={index === 0}
          nextDisabled={index === COUNT - 1}
        >
          <span className="min-w-16 text-center font-opmono text-sm tabular-nums text-ink">{shown} °C</span>
        </StepButtons>
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
        <Hear text={readout} />
      </div>
      {widget.target && (
        <CheckRow
          result={result}
          onCheck={() => {
            const ok = state === widget.target;
            setResult(ok);
            onCheck?.(ok);
          }}
        />
      )}
    </div>
  );
}
