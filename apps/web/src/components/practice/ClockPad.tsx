"use client";

import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { IconMinus, IconPlus } from "@/components/icons";
import { Hear } from "@/components/stage/hear";
import { useT } from "@/i18n";
import { angleAt, CLOCK_START, clockText, DEFAULT_PADS, handAngles, hourAt, minuteAt, stepHour, stepMinute, type ClockPadSettings } from "./pad-math";
import { hearSize } from "./targets";

// Answer by setting the hands. Tap the face to move the chosen hand there, or use each hand's −/+
// buttons, or focus a hand's number and use the arrow keys. Minutes snap to the pad's step; the hour
// hand moves between hours as the minutes pass, like a real clock. The response is "h:mm". The
// hands start at 12:00 and that time is an answer too (see responseOf), so Enter always answers.

type Props = {
  pad?: ClockPadSettings;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  young?: boolean;
  disabled?: boolean;
  tint?: string;
};

type Hand = "hour" | "minute";
const C = 100, R = 92; // drawing units

const tip = (deg: number, len: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + Math.cos(a) * len, C + Math.sin(a) * len] as const;
};

export function ClockPad({ pad = DEFAULT_PADS.clock, value, onChange, onSubmit, young, disabled, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const step = pad.stepMinutes;
  const minutesMove = step < 60;
  const time12 = /^(\d{1,2}):(\d{2})$/;
  const start = time12.exec(value) ?? time12.exec(CLOCK_START)!;
  const [h, setH] = useState(Number(start[1]));
  const [m, setM] = useState(Number(start[2]));
  const [hand, setHand] = useState<Hand>("hour");
  const face = useRef<SVGSVGElement>(null);
  const touched = value !== "";
  const time = clockText(h, m);

  const set = (nh: number, nm: number) => {
    if (disabled) return;
    setH(nh);
    setM(nm);
    onChange(clockText(nh, nm));
  };
  const nudge = (which: Hand, by: number) => {
    setHand(which);
    if (which === "hour") set(stepHour(h, by), m);
    else set(h, stepMinute(m, by, step));
  };
  const tap = (e: MouseEvent<SVGSVGElement>) => {
    const box = face.current?.getBoundingClientRect();
    if (disabled || !box?.width) return;
    const x = ((e.clientX - box.left) / box.width) * 200, y = ((e.clientY - box.top) / box.height) * 200;
    if (Math.hypot(x - C, y - C) < 14) return; // the middle points nowhere
    const deg = angleAt(x, y, C, C);
    // The short hand sits part way to the next hour as the minutes pass, so the tap is read that way.
    if (hand === "hour" || !minutesMove) set(hourAt(deg, m), m);
    else set(h, minuteAt(deg, step));
  };
  const onKey = (which: Hand) => (e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    const big = which === "hour" ? 3 : Math.max(1, Math.round(15 / step));
    const by: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: big, PageDown: -big };
    if (e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onSubmit();
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setHand(which);
      if (which === "hour") set(e.key === "Home" ? 1 : 12, m);
      else set(h, e.key === "Home" ? 0 : 60 - step);
      return;
    }
    if (by[e.key] === undefined) return;
    e.preventDefault();
    nudge(which, by[e.key]);
  };

  const angles = handAngles(h, m);
  const [hx, hy] = tip(angles.hour, R * 0.5);
  const [mx, my] = tip(angles.minute, R * 0.86);
  const size = young ? "w-64" : "w-56";
  const stepBtn = `grid shrink-0 place-items-center rounded-full border border-border bg-panel text-ink shadow-soft hover:border-ink/30 disabled:opacity-30 ${young ? "size-14" : "size-11"}`;

  // One hand: its name (a toggle choosing which hand a tap on the face moves), then − value + kept
  // on one line so the stepper never splits, even at 320 px in Spanish with K–2 sizes.
  const row = (which: Hand) => {
    const active = hand === which && (minutesMove || which === "hour");
    const shown = which === "hour" ? String(h) : String(m).padStart(2, "0");
    return (
      <div role="group" aria-label={t(which === "hour" ? "pr.clock.hourHand" : "pr.clock.minuteHand")} className="flex flex-col items-center gap-2">
        {minutesMove ? (
          <button
            type="button"
            aria-pressed={active}
            onClick={() => setHand(which)}
            disabled={disabled}
            className={`k-btn-secondary min-w-36 aria-pressed:border-accent aria-pressed:bg-accent/5 ${young ? "min-h-14 text-base" : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <line x1="12" y1="12" x2={which === "hour" ? 16 : 12} y2={which === "hour" ? 9 : 4} stroke={which === "hour" ? "var(--color-ink)" : tint} strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            {t(which === "hour" ? "pr.clock.short" : "pr.clock.long")}
          </button>
        ) : (
          <span className={`font-medium text-ink ${young ? "text-t3" : "text-sm"}`}>{t("pr.clock.short")}</span>
        )}
        <div className="flex flex-nowrap items-center gap-2">
          <button type="button" onClick={() => nudge(which, -1)} disabled={disabled} aria-label={t(which === "hour" ? "pr.clock.hourBack" : "pr.clock.minuteBack")} className={stepBtn}>
            <IconMinus size={18} />
          </button>
          <span
            role="spinbutton"
            tabIndex={disabled ? -1 : 0}
            aria-label={t(which === "hour" ? "pr.clock.hour" : "pr.clock.minutes")}
            aria-valuemin={which === "hour" ? 1 : 0}
            aria-valuemax={which === "hour" ? 12 : 59}
            aria-valuenow={which === "hour" ? h : m}
            aria-valuetext={which === "hour" ? undefined : t("pr.clock.minuteValue", { n: m })}
            aria-disabled={disabled || undefined}
            onKeyDown={onKey(which)}
            onFocus={() => minutesMove && setHand(which)}
            className={`grid min-w-14 place-items-center rounded-md border-2 bg-panel font-opmono text-xl tabular-nums text-ink ${young ? "h-14" : "h-11"} ${active ? "border-accent" : "border-border"}`}
          >
            {shown}
          </span>
          <button type="button" onClick={() => nudge(which, 1)} disabled={disabled} aria-label={t(which === "hour" ? "pr.clock.hourForward" : "pr.clock.minuteForward")} className={stepBtn}>
            <IconPlus size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      <svg
        ref={face}
        viewBox="0 0 200 200"
        role="img"
        aria-label={t("pr.clock.face", { time })}
        onClick={tap}
        className={`${size} max-w-full select-none ${disabled ? "" : "cursor-pointer"}`}
      >
        <circle cx={C} cy={C} r={R} fill="var(--color-panel)" stroke="var(--color-ink)" strokeWidth={3} />
        {Array.from({ length: 60 }, (_, i) => {
          const [x1, y1] = tip(i * 6, R - (i % 5 === 0 ? 11 : 5));
          const [x2, y2] = tip(i * 6, R - 2);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 === 0 ? "var(--color-ink)" : "var(--color-border)"} strokeWidth={i % 5 === 0 ? 2.2 : 1.2} />;
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const [x, y] = tip((i + 1) * 30, R - 30);
          return (
            <text key={i} x={x} y={y + 6} textAnchor="middle" fontSize="17" fontWeight={600} fill="var(--color-ink)" fontFamily="var(--font-brand)">
              {i + 1}
            </text>
          );
        })}
        <line x1={C} y1={C} x2={hx} y2={hy} stroke="var(--color-ink)" strokeWidth={hand === "hour" ? 9 : 7} strokeLinecap="round" />
        <line x1={C} y1={C} x2={mx} y2={my} stroke={tint} strokeWidth={hand === "minute" ? 6 : 4.5} strokeLinecap="round" />
        {minutesMove && <circle cx={hand === "hour" ? hx : mx} cy={hand === "hour" ? hy : my} r={7} fill="var(--color-panel)" stroke={hand === "hour" ? "var(--color-ink)" : tint} strokeWidth={3} />}
        <circle cx={C} cy={C} r={6} fill="var(--color-ink)" />
      </svg>
      <output aria-live="polite" className={`font-opmono font-semibold tabular-nums text-ink ${young ? "text-d3" : "text-t1"}`}>
        {time}
      </output>
      {!touched && !disabled && (
        <div className="flex items-center justify-center gap-2">
          <p className={`text-center text-muted ${young ? "text-t3" : "text-sm"}`}>{t(minutesMove ? "pr.clock.how" : "pr.clock.howHour")}</p>
          <Hear text={t(minutesMove ? "pr.clock.how" : "pr.clock.howHour")} className={hearSize(young)} />
        </div>
      )}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-10">
        {row("hour")}
        {minutesMove && row("minute")}
      </div>
    </div>
  );
}
