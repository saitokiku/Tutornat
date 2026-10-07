import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

type Variant = "primary" | "secondary" | "ghost";

/** Class for anything that should look like a button (Link, label, button). */
export const btn = (variant: Variant = "primary", size: "md" | "sm" = "md", extra = "") =>
  `k-btn-${variant} ${size === "sm" ? "min-h-9 px-3.5 text-xs" : ""} ${extra}`.trim();

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm"; loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={btn(variant, size, className)}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

/** Label, hint and error wired to one control through aria-describedby. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: (aria: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

const TONES = {
  info: "border-border bg-panel2 text-ink",
  good: "border-good/25 bg-good/10 text-ink",
  warn: "border-warn/25 bg-warn/10 text-ink",
  bad: "border-bad/25 bg-bad/10 text-ink",
};

export function Notice({ tone = "info", children, action }: { tone?: keyof typeof TONES; children: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`flex flex-wrap items-center gap-3 rounded-sm border px-4 py-3 text-sm ${TONES[tone]}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body, action, art }: { title: ReactNode; body?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-border px-6 py-10 text-center">
      {art}
      <p className="font-brand text-t3 font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "good" | "warn" }) {
  const t = { muted: "bg-panel2", accent: "bg-accent/10 text-accent", good: "bg-good/10 text-good", warn: "bg-warn/10 text-warn" }[tone];
  return <span className={`k-badge ${t}`}>{children}</span>;
}

export const SUBJECT_COLOR = { math: "bg-math", science: "bg-science", english: "bg-english", other: "bg-muted" } as const;

export function SubjectDot({ subject }: { subject: keyof typeof SUBJECT_COLOR }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${SUBJECT_COLOR[subject]}`} />;
}
