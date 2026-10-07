"use client";

import type { ReactNode, Ref } from "react";
import { IconMinus, IconPlus } from "@/components/icons";
import { btn } from "@/components/ui";
import { Hear, bigButton, useHear } from "../hear";

// Controls shared by the widgets. They use aria-disabled rather than disabled: a keyboard learner who
// presses a button until it runs out (the last row, the top of a list, a check just made) keeps focus
// on it instead of being dropped to the top of the page. For K–2 every one is a 56px target.

/** A round icon button: 44px, or 56px for K–2. */
export const roundButton = (young: boolean) => `grid ${young ? "size-14" : "size-11"} shrink-0 place-items-center rounded-full`;

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
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  "aria-describedby"?: string;
}) {
  const { young } = useHear();
  return (
    <button
      ref={ref}
      type="button"
      {...aria}
      aria-disabled={off || undefined}
      onClick={() => !off && onClick()}
      className={`${className ?? btn(variant, "md", bigButton(young))} aria-disabled:cursor-default aria-disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

/**
 * A labelled − value + pill, the same shape FractionBar uses for its parts. Both buttons are named; the
 * value between them is what the picture shows, so it stays visible but is not announced twice (each
 * widget has its own live readout). For K–2 the label is bigger, can be heard, and can carry a small
 * picture (a rod for tens, a cube for ones) so a child who can't read it yet knows which is which.
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
  glyph,
}: {
  label: string;
  value: string | number;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  glyph?: ReactNode;
}) {
  const { young } = useHear();
  const cls = `${roundButton(young)} text-ink hover:bg-panel2`;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className={`inline-flex min-w-14 items-center gap-1.5 font-medium ${young ? "text-body text-ink" : "text-xs text-muted"}`}>
        {glyph}
        {label}
      </span>
      <Hear text={label} />
      <div className="inline-flex items-center rounded-full border border-border bg-panel">
        <Act off={minusDisabled} onClick={onMinus} aria-label={minusLabel} className={cls}>
          <IconMinus size={young ? 22 : 18} />
        </Act>
        <span aria-hidden="true" className={`min-w-12 text-center font-opmono tabular-nums text-ink ${young ? "text-t3" : "text-sm"}`}>
          {value}
        </span>
        <Act off={plusDisabled} onClick={onPlus} aria-label={plusLabel} className={cls}>
          <IconPlus size={young ? 22 : 18} />
        </Act>
      </div>
    </div>
  );
}
