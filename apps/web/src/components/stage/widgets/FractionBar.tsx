"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconMinus, IconPlus } from "@/components/icons";
import { useT } from "@/i18n";
import type { Widget } from "@/lib/types";
import { Hear, useHear } from "../hear";
import { CheckRow } from "./CheckRow";
import { Act, roundButton } from "./Stepper";

type Props = {
  widget: Extract<Widget, { kind: "fraction-bar" }>;
  onCheck?: (correct: boolean) => void;
  tint?: string;
};

const MIN = 1, MAX = 12;

/**
 * Cut one whole into equal parts and shade some. Parts are buttons in a roving-tabindex group:
 * ←/→ move between parts, Space/Enter shade, ↑/↓ (or +/−) change how many parts.
 * Shading fills from the left so the picture always reads as a fraction.
 */
export function FractionBar({ widget, onCheck, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const { young } = useHear();
  const [parts, setParts] = useState(widget.parts);
  const [shaded, setShaded] = useState(Math.min(widget.shaded, widget.parts));
  const [focus, setFocus] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const refocus = useRef(false);

  // Changing the number of parts redraws the bar; keep keyboard focus on the same part.
  useEffect(() => {
    if (refocus.current) refs.current[focus]?.focus();
    refocus.current = false;
  }, [parts, focus]);

  const changeParts = (n: number) => {
    const next = Math.max(MIN, Math.min(MAX, n));
    setParts(next);
    setShaded((s) => Math.min(s, next));
    setFocus((f) => Math.min(f, next - 1));
    setResult(null);
  };
  const toggle = (i: number) => {
    setShaded((s) => (s === i + 1 ? i : i + 1));
    setResult(null);
  };
  const move = (i: number) => {
    const next = (i + parts) % parts;
    setFocus(next);
    refs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const actions: Record<string, () => void> = {
      ArrowRight: () => move(i + 1),
      ArrowLeft: () => move(i - 1),
      Home: () => move(0),
      End: () => move(parts - 1),
      ArrowUp: () => changeParts(parts + 1),
      ArrowDown: () => changeParts(parts - 1),
      "+": () => changeParts(parts + 1),
      "=": () => changeParts(parts + 1),
      "-": () => changeParts(parts - 1),
    };
    if (actions[e.key]) {
      e.preventDefault();
      refocus.current = true;
      actions[e.key]();
    }
  };

  const target = widget.target;
  const readout = t("w.fraction.readout", { shaded, parts });
  const step = `${roundButton(young)} text-ink hover:bg-panel2`;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5 sm:gap-7">
        <div role="group" aria-label={t("w.fraction.readout", { shaded, parts })} className="flex h-20 min-w-0 flex-1 gap-[3px] sm:h-24">
          {Array.from({ length: parts }, (_, i) => (
            <button
              key={`${parts}-${i}`}
              ref={(el) => void (refs.current[i] = el)}
              tabIndex={i === focus ? 0 : -1}
              aria-pressed={i < shaded}
              aria-label={t("w.fraction.part", { n: i + 1, state: t(i < shaded ? "w.fraction.shaded" : "w.fraction.empty") })}
              onClick={() => (setFocus(i), toggle(i))}
              onKeyDown={(e) => onKey(e, i)}
              style={{ background: i < shaded ? tint : undefined, animationDelay: `${i * 18}ms` }}
              className={`min-w-0 flex-1 animate-split border transition-colors duration-150 first:rounded-l-md last:rounded-r-md focus-visible:z-10 ${
                i < shaded ? "border-transparent" : "border-border bg-panel2 hover:bg-border/60"
              }`}
            />
          ))}
        </div>
        <Fraction top={shaded} bottom={parts} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className={`font-medium ${young ? "text-body text-ink" : "text-xs text-muted"}`}>{t("w.fraction.parts")}</span>
        <Hear text={t("w.fraction.parts")} />
        <div className="inline-flex items-center rounded-full border border-border bg-panel">
          <Act onClick={() => changeParts(parts - 1)} off={parts <= MIN} aria-label={t("w.fraction.fewer")} className={step}>
            <IconMinus size={young ? 22 : 18} />
          </Act>
          <span className="min-w-16 text-center font-opmono text-sm tabular-nums text-ink">{parts}</span>
          <Act onClick={() => changeParts(parts + 1)} off={parts >= MAX} aria-label={t("w.fraction.more")} className={step}>
            <IconPlus size={young ? 22 : 18} />
          </Act>
        </div>
        <p aria-live="polite" className="text-sm text-muted">
          {readout}
        </p>
        <Hear text={readout} />
      </div>

      {target && (
        <CheckRow
          disabled={parts === widget.parts && shaded === Math.min(widget.shaded, widget.parts)}
          result={result}
          onCheck={() => {
            const ok = parts === target.parts && shaded === target.shaded;
            setResult(ok);
            onCheck?.(ok);
          }}
        />
      )}
    </div>
  );
}

/** A typeset fraction: numerator over a rule over denominator. */
export function Fraction({ top, bottom, className = "" }: { top: number; bottom: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 flex-col items-center font-brand text-d3 font-semibold tabular-nums leading-none text-ink ${className}`}>
      <span>{top}</span>
      <span className="my-1.5 h-[3px] w-[1.4em] rounded-full bg-ink" />
      <span>{bottom}</span>
    </span>
  );
}
