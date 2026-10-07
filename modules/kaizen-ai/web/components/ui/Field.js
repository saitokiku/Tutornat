'use client';
import { useId } from 'react';

// A labelled input. Label above, helper below the label, error below the
// control: the order never varies, and there is no placeholder-as-label
// anywhere in the product.
//
// useId() rather than a passed id because several forms can share a page and
// duplicate DOM ids silently break label association.
// controlClassName styles the control itself; className styles the wrapper. A
// caller that needs to reach the input (a file field's picker button, say) uses
// controlClassName rather than an [&_input] arbitrary variant, which Tailwind
// compiles into a malformed selector and which fails the CSS parser at build.
export default function Field({
  label,
  hint,
  error,
  as = 'input',
  className = '',
  controlClassName = '',
  children,
  ...rest
}) {
  const id = useId();
  const Control = as;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      ) : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {children || (
        <Control
          id={id}
          className={`k-input ${error ? 'border-bad focus:border-bad focus:ring-bad/20' : ''} ${controlClassName}`.trim()}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...rest}
        />
      )}
      {error ? <p id={`${id}-err`} className="text-xs text-bad">{error}</p> : null}
    </div>
  );
}
