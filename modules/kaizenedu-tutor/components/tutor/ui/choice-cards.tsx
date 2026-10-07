'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface Choice<V extends string> {
  value: V;
  label: string;
  description?: ReactNode;
  disabled?: boolean;
}

/**
 * A radio group rendered as selectable cards: a consequential choice reads
 * better as a card than as a tiny radio row (ui-craft "Finishing details").
 * Native inputs keep keyboard and screen-reader behavior.
 */
export function ChoiceCards<V extends string>({
  name,
  legend,
  value,
  onChange,
  choices,
  columns = 2,
  hint,
  error,
}: {
  name: string;
  legend: string;
  value: V | null;
  onChange: (value: V) => void;
  choices: ReadonlyArray<Choice<V>>;
  columns?: 1 | 2 | 3;
  hint?: ReactNode;
  error?: string | null;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-[length:var(--nt-text-body)] font-medium">{legend}</legend>
      {hint ? <p className="nt-small">{hint}</p> : null}
      <div
        className={cn(
          'grid gap-3',
          columns === 3 && 'sm:grid-cols-3',
          columns === 2 && 'sm:grid-cols-2',
        )}
      >
        {choices.map((choice) => {
          const id = `${name}-${choice.value}`;
          const selected = value === choice.value;
          return (
            <label
              key={choice.value}
              htmlFor={id}
              className={cn(
                'nt-target flex cursor-pointer items-start gap-3 rounded-(--radius) border bg-card p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
                selected ? 'border-primary bg-accent/60' : 'border-border hover:border-input',
                choice.disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={choice.value}
                checked={selected}
                disabled={choice.disabled}
                onChange={() => onChange(choice.value)}
                className="mt-1 size-4 shrink-0 accent-primary"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{choice.label}</span>
                {choice.description ? <span className="nt-small">{choice.description}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="nt-small font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
