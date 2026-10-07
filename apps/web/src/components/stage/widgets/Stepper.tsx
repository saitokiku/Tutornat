"use client";

import type { ReactNode, Ref } from "react";
import { IconMinus, IconPlus } from "@/components/icons";
import { btn } from "@/components/ui";

// Controls shared by the widgets. They use aria-disabled rather than disabled: a keyboard learner who
// presses a button until it runs out (the last row, the top of a list) keeps focus on it instead of
// being dropped to the top of the page.

/** A button that stays focusable when it can't act. `className` replaces the default pill look. */
export function Act({
  off,
  onClick,
  variant = "secondary",
  className,
  children,
  ref,
  ...aria
}: {
  off?: boolean;
  onClick: () => void;
  variant?: "secondary" | "ghost";
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      ref={ref}
      type="button"
      {...aria}
      aria-disabled={off || undefined}
      onClick={() => !off && onClick()}
      className={`${className ?? btn(variant)} aria-disabled:cursor-default aria-disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

/**
 * A labelled − value + pill, the same shape FractionBar uses for its parts. Both buttons are 44px and
 * named; the value between them is what the picture shows, so it stays visible but is not announced
 * twice (each widget has its own live readout).
 */
export function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
  minusDisabled,
  plusDisabled,
}: {
  label: string;
  value: string | number;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
}) {
  const cls = "grid size-11 place-items-center rounded-full text-ink hover:bg-panel2";
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span aria-hidden="true" className="min-w-14 text-xs font-medium text-muted">
        {label}
      </span>
      <div className="inline-flex items-center rounded-full border border-border bg-panel">
        <Act off={minusDisabled} onClick={onMinus} aria-label={minusLabel} className={cls}>
          <IconMinus size={18} />
        </Act>
        <span aria-hidden="true" className="min-w-12 text-center font-opmono text-sm tabular-nums text-ink">
          {value}
        </span>
        <Act off={plusDisabled} onClick={onPlus} aria-label={plusLabel} className={cls}>
          <IconPlus size={18} />
        </Act>
      </div>
    </div>
  );
}
