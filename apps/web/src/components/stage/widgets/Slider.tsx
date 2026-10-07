"use client";

import type { ReactNode } from "react";
import { useHear } from "../hear";
import { roundButton } from "./Stepper";

export function StepButtons({
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  prevDisabled,
  nextDisabled,
  children,
}: {
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  children?: ReactNode;
}) {
  const { young } = useHear();
  const cls = `${roundButton(young)} text-ink hover:bg-panel2 disabled:opacity-30`;
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-panel">
      <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={prevLabel} className={cls}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M14.5 5.5L8 12l6.5 6.5" />
        </svg>
      </button>
      {children}
      <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel} className={cls}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M9.5 5.5L16 12l-6.5 6.5" />
        </svg>
      </button>
    </div>
  );
}
