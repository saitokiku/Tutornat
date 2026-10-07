"use client";

import type { ReactNode } from "react";

/** A settings group: title on the left on wide screens, content on the right. */
export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-6 gap-4 border-t border-border py-7 md:grid-cols-[14rem_1fr]">
      <h2 id={`${id}-h`} className="font-brand text-t3 font-semibold text-ink">
        {title}
      </h2>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

/** An on/off switch with its label and a line saying what it does. */
export function Switch({ on, onChange, label, body, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; body: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex min-h-14 w-full items-start gap-3 rounded-md border border-border bg-panel px-4 py-3 text-left hover:bg-panel2 disabled:opacity-60"
    >
      <span aria-hidden="true" className={`mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors ${on ? "bg-ink" : "bg-border"}`}>
        <span className={`size-5 rounded-full bg-panel shadow-soft transition-transform ${on ? "translate-x-4" : ""}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-muted">{body}</span>
      </span>
    </button>
  );
}

/** Counts of what a delete would remove, read from the record. */
export function Counts({ label, counts, labels }: { label: string; counts: Record<string, number>; labels: Record<string, string> }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Object.entries(counts).map(([k, n]) => (
        <div key={k} className="flex flex-col-reverse rounded-sm bg-panel2 px-3 py-2">
          <dt className="text-xs leading-tight text-muted">{labels[k]}</dt>
          <dd className="font-opmono text-t3 font-semibold tabular-nums text-ink">{n}</dd>
        </div>
      ))}
    </dl>
  );
}
