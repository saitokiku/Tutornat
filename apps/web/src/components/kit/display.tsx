// Server-safe display primitives: no hooks, no browser APIs. Re-exported from "@/components/ui".
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { IconChevronDown } from "@/components/icons";

/** An icon-only button. The label is required: it is the button's accessible name and its tooltip. */
export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  className = "",
  title,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "secondary" | "primary";
  /** md = the band's primary target (44px, 56px in K–2); sm = 36px with a 44px target on touch (56px in K–2). */
  size?: "md" | "sm";
}) {
  const box = size === "md" ? "size-target" : "k-btn-sm size-9 min-h-0 pointer-coarse:size-11";
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      {...props}
      className={`k-btn-${variant} ${box} shrink-0 px-0 py-0 aria-pressed:bg-accent/10 aria-pressed:text-accent ${className}`.trim()}
    >
      {icon}
    </button>
  );
}

/** A list of rows in one white panel with hairlines between. */
export function RowList({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <ul aria-label={label} className={`k-rows ${className}`.trim()}>
      {children}
    </ul>
  );
}

/**
 * One line in a list: dot · title · meta · one action. With `href` the whole row opens it; the
 * action stays its own target. `done` greys the title and keeps it readable.
 */
export function Row({
  lead,
  title,
  detail,
  meta,
  action,
  href,
  done = false,
  className = "",
}: {
  lead?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  href?: string;
  done?: boolean;
  className?: string;
}) {
  const titleCls = `block font-medium ${done ? "text-muted line-through decoration-border-strong" : "text-ink"}`;
  return (
    <li
      className={`relative flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5 ${
        href ? "transition-colors duration-(--duration-quick) hover:bg-panel2/60" : ""
      } ${done ? "bg-panel2/40" : ""} ${className}`.trim()}
    >
      {lead && <span className="grid size-7 shrink-0 place-items-center">{lead}</span>}
      <span className="min-w-0 flex-1 basis-40">
        {href ? (
          <Link
            href={href}
            className={`${titleCls} outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent focus-visible:after:outline-solid`}
          >
            {title}
          </Link>
        ) : (
          <span className={titleCls}>{title}</span>
        )}
        {detail && <span className="mt-0.5 block text-xs text-muted">{detail}</span>}
      </span>
      {(meta || action) && (
        <span className="ml-auto flex shrink-0 items-center gap-3">
          {meta && <span className="k-meta">{meta}</span>}
          {action && <span className="relative z-10">{action}</span>}
        </span>
      )}
    </li>
  );
}

/** Honest numbers in a ledger strip: the figure over its plain label, so every figure in the group sits
 *  on one line. Counts, never scores or grades; four at most, so it reads at a glance. */
export function StatGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <dl className={`grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-px overflow-hidden rounded-md border border-border bg-border ${className}`.trim()}>
      {children}
    </dl>
  );
}

export function Stat({ label, value, detail }: { label: ReactNode; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-panel px-4 py-3.5">
      <dt className="line-clamp-2 text-xs text-muted">{label}</dt>
      <dd className="order-first font-brand text-t1 font-semibold text-ink tabular-nums">{value}</dd>
      {detail && <dd className="text-xs text-muted">{detail}</dd>}
    </div>
  );
}

/** A calm stand-in while real content loads. Visual only; pass `label` to tell screen readers what is coming. */
export function Skeleton({ className = "", lines, label }: { className?: string; lines?: number; label?: string }) {
  const shape = lines ? (
    <span aria-hidden="true" className={`flex flex-col gap-2.5 ${className}`.trim()}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={`k-skeleton h-3.5 ${i === lines - 1 && lines > 1 ? "w-3/5" : "w-full"}`} />
      ))}
    </span>
  ) : (
    <span aria-hidden="true" className={`k-skeleton ${className}`.trim()} />
  );
  if (!label) return shape;
  return (
    <>
      <span role="status" className="sr-only">
        {label}
      </span>
      {shape}
    </>
  );
}

/** A key on a keyboard: <Kbd>Enter</Kbd>. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="k-kbd">{children}</kbd>;
}

/** Text for screen readers only. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Show more, in place, on the native <details>: keyboard, find-in-page and print work for free. The body
 * opens with a height transition where the browser supports it, instantly elsewhere.
 */
export function Disclosure({
  summary,
  meta,
  children,
  defaultOpen,
  className = "",
}: {
  summary: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={`k-disclosure rounded-md border border-border bg-panel ${className}`.trim()}>
      <summary className="flex min-h-12 items-center gap-3 rounded-md px-4 text-sm font-medium text-ink transition-colors duration-(--duration-quick) hover:bg-panel2/50 sm:px-5">
        <span className="min-w-0 flex-1">{summary}</span>
        {meta && <span className="k-meta">{meta}</span>}
        <IconChevronDown size={18} className="k-disclosure-chevron text-muted" />
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  );
}
