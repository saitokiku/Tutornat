'use client';

import type { ComponentProps, ReactNode, Ref } from 'react';

import { cn } from '@/lib/utils';

/**
 * Product form primitives: label above the control, hint in the markup, error
 * below with role="alert", `aria-describedby` and `aria-invalid` wired, and a
 * ref so a form can move focus to the first invalid field.
 */

interface FieldChrome {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}

function describedBy(id: string, hint: boolean, error: boolean): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldChrome & { children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[length:var(--nt-text-body)] font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="nt-small">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="nt-small font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'nt-target w-full rounded-(--radius) border border-input bg-card px-3 text-[length:var(--nt-text-body)] text-foreground shadow-xs placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive dark:bg-input/30';

export interface TextFieldProps
  extends
    FieldChrome,
    Omit<ComponentProps<'input'>, 'id' | 'className' | 'aria-invalid' | 'aria-describedby'> {
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ id, label, hint, error, className, ref, ...input }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        ref={ref}
        id={id}
        className={CONTROL}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        {...input}
      />
    </FieldShell>
  );
}

export interface TextAreaFieldProps
  extends
    FieldChrome,
    Omit<ComponentProps<'textarea'>, 'id' | 'className' | 'aria-invalid' | 'aria-describedby'> {
  ref?: Ref<HTMLTextAreaElement>;
}

export function TextAreaField({
  id,
  label,
  hint,
  error,
  className,
  ref,
  ...textarea
}: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        ref={ref}
        id={id}
        className={cn(CONTROL, 'min-h-28 py-2 leading-relaxed')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        {...textarea}
      />
    </FieldShell>
  );
}

export interface SelectFieldProps
  extends
    FieldChrome,
    Omit<ComponentProps<'select'>, 'id' | 'className' | 'aria-invalid' | 'aria-describedby'> {
  ref?: Ref<HTMLSelectElement>;
}

export function SelectField({
  id,
  label,
  hint,
  error,
  className,
  ref,
  children,
  ...select
}: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select
        ref={ref}
        id={id}
        className={cn(CONTROL, 'appearance-none pr-9')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
        {...select}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export interface CheckboxFieldProps extends Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'className'
> {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

export function CheckboxField({
  id,
  label,
  hint,
  error,
  className,
  ref,
  ...input
}: CheckboxFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-primary"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, Boolean(hint), Boolean(error))}
          {...input}
        />
        <span className="text-[length:var(--nt-text-body)] leading-snug">{label}</span>
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="nt-small pl-8">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="nt-small pl-8 font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Fieldset({
  legend,
  hint,
  children,
  className,
}: {
  legend: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-3', className)}>
      <legend className="mb-1 text-[length:var(--nt-text-body)] font-medium">{legend}</legend>
      {hint ? <p className="nt-small -mt-1">{hint}</p> : null}
      {children}
    </fieldset>
  );
}
