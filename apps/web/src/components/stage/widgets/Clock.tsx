"use client";

import { useState } from "react";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear } from "../hear";
import { ClockVisual } from "../visuals-practice";
import { CheckRow } from "./CheckRow";
import { Stepper } from "./Stepper";

type Props = { widget: Extract<Widget, { kind: "clock" }>; onCheck?: (correct: boolean) => void; tint?: string };

const DAY = 12 * 60;

/** Minutes past 12:00 on a 12-hour face. */
export const toMinutes = (h: number, m: number) => (((h % 12) * 60 + m) % DAY + DAY) % DAY;
export function fromMinutes(total: number) {
  const t = ((total % DAY) + DAY) % DAY;
  return { h: Math.floor(t / 60) || 12, m: t % 60 };
}
/** "7:05": hour without a leading zero, two-digit minutes (the practice touch-pad convention). */
export const clockText = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;
/** The minute hand moves 5 minutes a press unless a start or target time needs single minutes. */
export const minuteStep = (w: { m: number; target?: { m: number } }) => (w.m % 5 === 0 && (w.target?.m ?? 0) % 5 === 0 ? 5 : 1);

/** A small clock face beside each control's name, with only that control's hand drawn. */
function Hand({ which, tint }: { which: "hour" | "minute"; tint: string }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" className="shrink-0">
      <circle cx={11} cy={11} r={9.5} fill="var(--color-panel)" stroke="var(--color-ink)" strokeWidth={1.4} />
      {which === "hour" ? (
        <line x1={11} y1={11} x2={16} y2={11} stroke="var(--color-ink)" strokeWidth={2.6} strokeLinecap="round" />
      ) : (
        <line x1={11} y1={11} x2={11} y2={3.5} stroke={tint} strokeWidth={1.8} strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * Set the hands to a time. Like a real clock, turning the minute hand past 12 moves the hour hand on;
 * the hour hand moves a whole hour a press. Buttons work by tap and keyboard; the time is read out.
 */
export function ClockWidget({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const [total, setTotal] = useState(() => toMinutes(widget.h, widget.m));
  const [result, setResult] = useState<boolean | null>(null);
  const step = minuteStep(widget);
  const { h, m } = fromMinutes(total);
  const time = clockText(h, m);
  const readout = t("stg.clock.readout", { time });
  const turn = (d: number) => (setTotal((x) => toMinutes(0, x + d)), setResult(null));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-6 sm:gap-10">
        <div className="w-full max-w-[220px]">
          <ClockVisual h={h} m={m} alt={readout} tint={tint} />
        </div>
        <p aria-hidden="true" className="font-brand text-d3 font-semibold tabular-nums text-ink">
          {time}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Stepper
          label={t("stg.clock.hour")}
          value={h}
          onMinus={() => turn(-60)}
          onPlus={() => turn(60)}
          minusLabel={t("stg.clock.hourBack")}
          plusLabel={t("stg.clock.hourFwd")}
          glyph={<Hand which="hour" tint={tint} />}
        />
        <Stepper
          label={t("stg.clock.minute")}
          value={String(m).padStart(2, "0")}
          onMinus={() => turn(-step)}
          onPlus={() => turn(step)}
          minusLabel={t("stg.clock.minBack", { n: step })}
          plusLabel={t("stg.clock.minFwd", { n: step })}
          glyph={<Hand which="minute" tint={tint} />}
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
          disabled={total === toMinutes(widget.h, widget.m)}
          result={result}
          onCheck={() => {
            const ok = toMinutes(h, m) === toMinutes(widget.target!.h, widget.target!.m);
            setResult(ok);
            onCheck?.(ok);
          }}
        />
      )}
    </div>
  );
}
