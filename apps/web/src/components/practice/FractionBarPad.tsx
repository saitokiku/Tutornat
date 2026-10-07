"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { IconMinus, IconPlus } from "@/components/icons";
import { useT } from "@/i18n";
import { barText, DEFAULT_PADS, type BarPad } from "./pad-math";

// Answer by building the fraction: split the bar into equal parts (unless the problem fixes the
// parts), then tap parts to shade them. The response is "shaded/parts", so 6/8 answers 3/4.
// Parts are buttons in a roving-tabindex group: ←/→ move, Space/Enter shade, ↑/↓ or +/− change parts.

type Props = {
  pad?: BarPad;
  value: string;
  onChange: (v: string) => void;
  young?: boolean;
  disabled?: boolean;
  tint?: string;
};

export function FractionBarPad({ pad = DEFAULT_PADS.bar, value, onChange, young, disabled, tint = "var(--color-math)" }: Props) {
  const t = useT();
  const partsLabel = useId();
  const fixed = pad.parts !== undefined;
  const max = Math.max(1, pad.maxParts, pad.parts ?? 1);
  const start = /^(\d+)\/(\d+)$/.exec(value);
  const [parts, setParts] = useState(() => (start ? Number(start[2]) : (pad.parts ?? 1)));
  const [shaded, setShaded] = useState<boolean[]>(() => Array.from({ length: parts }, (_, i) => (start ? i < Number(start[1]) : false)));
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const refocus = useRef(false);
  const count = shaded.filter(Boolean).length;

  // Redrawing the bar (new parts) keeps keyboard focus on the bar.
  useEffect(() => {
    if (refocus.current) refs.current[focus]?.focus();
    refocus.current = false;
  }, [parts, focus]);

  const report = (next: boolean[]) => {
    setShaded(next);
    onChange(barText(next.filter(Boolean).length, next.length));
  };
  const changeParts = (n: number) => {
    if (fixed || disabled) return;
    const next = Math.max(1, Math.min(max, n));
    setParts(next);
    setFocus((f) => Math.min(f, next - 1));
    report(Array<boolean>(next).fill(false));
  };
  const toggle = (i: number) => !disabled && report(shaded.map((s, k) => (k === i ? !s : s)));
  const shadeOneMore = () => {
    const i = shaded.indexOf(false);
    if (i >= 0) toggle(i);
  };
  const unshadeOne = () => {
    const i = shaded.lastIndexOf(true);
    if (i >= 0) toggle(i);
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
      ...(fixed
        ? {}
        : {
            ArrowUp: () => changeParts(parts + 1),
            ArrowDown: () => changeParts(parts - 1),
            "+": () => changeParts(parts + 1),
            "=": () => changeParts(parts + 1),
            "-": () => changeParts(parts - 1),
          }),
    };
    if (!actions[e.key]) return;
    e.preventDefault();
    refocus.current = true;
    actions[e.key]();
  };

  const stepBtn = `grid place-items-center rounded-full text-ink hover:bg-panel2 disabled:opacity-30 ${young ? "size-14" : "size-11"}`;
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {!fixed && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span id={partsLabel} className={`font-medium text-ink ${young ? "text-t3" : "text-sm"}`}>
            {t("pr.bar.parts")}
          </span>
          <div role="group" aria-labelledby={partsLabel} className="inline-flex items-center rounded-full border border-border bg-panel shadow-soft">
            <button type="button" onClick={() => changeParts(parts - 1)} disabled={disabled || parts <= 1} aria-label={t("pr.bar.fewer")} className={stepBtn}>
              <IconMinus size={18} />
            </button>
            <span className="min-w-12 text-center font-opmono text-lg tabular-nums text-ink">{parts}</span>
            <button type="button" onClick={() => changeParts(parts + 1)} disabled={disabled || parts >= max} aria-label={t("pr.bar.more")} className={stepBtn}>
              <IconPlus size={18} />
            </button>
          </div>
        </div>
      )}
      <div role="group" aria-label={t("pr.bar.group", { parts })} className={`flex gap-[3px] ${young ? "h-24" : "h-20"}`}>
        {shaded.map((on, i) => (
          <button
            key={`${parts}-${i}`}
            ref={(el) => void (refs.current[i] = el)}
            type="button"
            disabled={disabled}
            tabIndex={i === focus ? 0 : -1}
            aria-pressed={on}
            aria-label={t("pr.bar.part", { n: i + 1, total: parts })}
            onClick={() => (setFocus(i), toggle(i))}
            onKeyDown={(e) => onKey(e, i)}
            style={{ background: on ? tint : undefined, animationDelay: `${i * 18}ms` }}
            className={`min-w-0 flex-1 animate-split border transition-colors duration-150 first:rounded-l-md last:rounded-r-md focus-visible:z-10 ${
              on ? "border-transparent" : "border-border bg-panel2 hover:bg-border/60"
            }`}
          />
        ))}
      </div>
      <p aria-live="polite" className={`text-center text-ink ${young ? "text-t3" : "text-sm"}`}>
        {t("pr.bar.readout", { shaded: count, parts })}
      </p>
      {parts > 6 && (
        // Thin parts on a phone: one-tap buttons with full-size targets do the same thing.
        <div className="flex flex-wrap justify-center gap-2 sm:hidden">
          <button type="button" onClick={shadeOneMore} disabled={disabled || count === parts} className="k-btn-secondary">
            {t("pr.bar.shadeOne")}
          </button>
          <button type="button" onClick={unshadeOne} disabled={disabled || count === 0} className="k-btn-secondary">
            {t("pr.bar.unshadeOne")}
          </button>
        </div>
      )}
    </div>
  );
}
