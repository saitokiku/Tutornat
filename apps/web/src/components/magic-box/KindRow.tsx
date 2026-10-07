"use client";

import { useId } from "react";
import { useT } from "@/i18n";
import { CALENDAR_KINDS, INTAKE_KINDS, type IntakeKind } from "@/lib/intake";

/**
 * The guess, as a small choice row the family can change before anything is made. Native radios: Tab
 * lands on the chosen one, arrow keys move the choice, Enter confirms (onEnter). A day off or a school
 * event joins the row only when the words point to one (`extra`) or it is the choice.
 */
export function KindRow({
  value,
  extra,
  onChange,
  onEnter,
  describedBy,
}: {
  value: IntakeKind;
  extra?: IntakeKind;
  onChange: (k: IntakeKind) => void;
  onEnter: () => void;
  describedBy?: string;
}) {
  const t = useT();
  const name = useId();
  const kinds: IntakeKind[] = [...INTAKE_KINDS, ...CALENDAR_KINDS.filter((k) => k === extra || k === value)];
  return (
    <fieldset
      aria-describedby={describedBy}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          onEnter();
        }
      }}
    >
      <legend className="text-sm font-medium text-ink">{t("intake.whatIsIt")}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {kinds.map((k) => (
          <label key={k}>
            <input type="radio" name={name} value={k} checked={value === k} onChange={() => onChange(k)} className="peer sr-only" />
            <span className="inline-flex min-h-11 cursor-pointer select-none items-center rounded-full border border-border bg-panel px-4 text-sm font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:font-semibold peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
              {t(`intake.kind.${k}`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
