// The KaizenEDU primitives. Server-safe (no "use client" here): interactive pieces live in ./kit and are
// re-exported below, so every screen imports from "@/components/ui". Usage rules: DESIGN.md → Components.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { IconAlert, IconCheckCircle, IconInfo } from "./icons";
import { btn, type Variant } from "./kit/btn";

export { btn };

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

/** A quiet arc that turns while something is on its way. Static under reduced motion; pair it with words or aria-busy. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`size-3.5 shrink-0 animate-spin ${className}`}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
      <path d="M14.25 8A6.25 6.25 0 0 0 8 1.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
      <label htmlFor={id} className="block pb-0.5 text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="k-enter flex items-start gap-1.5 text-xs font-medium text-bad">
          <IconAlert size={14} className="mt-0.5" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const TONES = {
  info: { box: "border-border bg-panel2", icon: IconInfo, mark: "text-muted" },
  good: { box: "border-good/20 bg-good/8", icon: IconCheckCircle, mark: "text-good" },
  warn: { box: "border-warn/25 bg-warn/8", icon: IconAlert, mark: "text-warn" },
  bad: { box: "border-bad/20 bg-bad/8", icon: IconAlert, mark: "text-bad" },
};

/** A sentence the reader should notice. The icon and the words carry the tone; colour only supports it. */
export function Notice({
  tone = "info",
  children,
  action,
  icon,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  action?: ReactNode;
  /** Replace the tone's icon, or `false` for none. */
  icon?: ReactNode | false;
}) {
  const { box, icon: ToneIcon, mark } = TONES[tone];
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`flex flex-wrap items-start gap-x-3 gap-y-2 rounded-sm border px-4 py-3 text-sm text-ink ${box}`}>
      {icon !== false && <span className={`mt-px shrink-0 ${mark}`}>{icon ?? <ToneIcon size={18} />}</span>}
      <div className="min-w-0 flex-1 basis-48 self-center">{children}</div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2 self-center">{action}</div>}
    </div>
  );
}

/** Nothing here yet: say what will appear and offer the one action that fills it. */
export function EmptyState({ title, body, action, art }: { title: ReactNode; body?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-border-strong bg-panel/50 px-6 py-10 text-center">
      {art && <div className="mb-4 text-muted">{art}</div>}
      <p className="font-brand text-t3 font-semibold text-ink">{title}</p>
      {body && <p className="mt-1.5 max-w-[42ch] text-sm text-muted">{body}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** A short status word: Demo, Draft, From a grown-up. Never a score. */
export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "good" | "warn" | "bad" }) {
  const t = { muted: "bg-panel2", accent: "bg-accent/10 text-accent", good: "bg-good/10 text-good", warn: "bg-warn/10 text-warn", bad: "bg-bad/10 text-bad" }[tone];
  return <span className={`k-badge ${t}`}>{children}</span>;
}

export const SUBJECT_COLOR = { math: "bg-math", science: "bg-science", english: "bg-english", other: "bg-muted" } as const;

/** The subject mark: a dot, never a fill. */
export function SubjectDot({ subject }: { subject: keyof typeof SUBJECT_COLOR }) {
  return <span aria-hidden="true" className={`k-dot inline-block size-2 shrink-0 rounded-full ${SUBJECT_COLOR[subject]}`} />;
}

/** Subject colour as a CSS value, for drawings and tints. */
export const SUBJECT_TINT = {
  math: "var(--color-math)",
  science: "var(--color-science)",
  english: "var(--color-english)",
  other: "var(--color-ink)",
} as const;

// —— The kit (additive; see DESIGN.md → Components)
export { Disclosure, IconButton, Kbd, Row, RowList, Skeleton, Stat, StatGroup, VisuallyHidden } from "./kit/display";
export { Meter, ProgressBar } from "./kit/measure";
export { Dialog, Sheet } from "./kit/overlay";
export { ConfirmButton, Segmented, Tabs } from "./kit/controls";
export { announce, toast } from "./kit/announce";
export { BandSync, bandFor, useBand } from "./kit/band";
export { PageTransition } from "./kit/motion";
