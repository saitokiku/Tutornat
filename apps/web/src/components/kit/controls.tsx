"use client";

// Tabs, Segmented and ConfirmButton. Keyboard first: one tab stop per group (roving tabindex), arrows
// move and select, Home/End jump. The sliding mark is positioned from the DOM, not from React state.
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { useT } from "@/i18n";
import { btn } from "./btn";

/** Places the list's sliding mark (--x, --w) under the active item and keeps it there on resize. */
function useMark(listRef: RefObject<HTMLElement | null>, active: string | undefined) {
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const place = () => {
      const el = Array.from(list.querySelectorAll<HTMLElement>("[data-key]")).find((n) => n.dataset.key === active);
      if (!el) return;
      list.style.setProperty("--x", `${el.offsetLeft}px`);
      list.style.setProperty("--w", `${el.offsetWidth}px`);
      list.style.setProperty("--wn", String(el.offsetWidth));
    };
    place();
    // The mark appears in place first, and only glides on later changes.
    const ready = () => list.setAttribute("data-ready", "");
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(ready) : (ready(), 0);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    ro?.observe(list);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [listRef, active]);
}

function nextIndex(key: string, i: number, n: number, vertical = false): number | null {
  const fwd = vertical ? ["ArrowRight", "ArrowDown"] : ["ArrowRight"];
  const back = vertical ? ["ArrowLeft", "ArrowUp"] : ["ArrowLeft"];
  if (fwd.includes(key)) return (i + 1) % n;
  if (back.includes(key)) return (i - 1 + n) % n;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  return null;
}

function useChoice(value: string | undefined, defaultValue: string | undefined, onChange?: (v: string) => void) {
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;
  const choose = (v: string) => {
    if (value === undefined) setOwn(v);
    onChange?.(v);
  };
  return [current, choose] as const;
}

export type TabItem = { id: string; label: ReactNode; icon?: ReactNode; meta?: ReactNode };

/**
 * Tabs switch views of one thing (subjects, a child's page sections). A rose rule slides under the
 * selected tab. The panel renders `children(activeId)`.
 */
export function Tabs({
  label,
  items,
  value,
  defaultValue,
  onChange,
  children,
  className = "",
}: {
  label: string;
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const base = useId();
  const [picked, choose] = useChoice(value, defaultValue, onChange);
  const active = items.some((i) => i.id === picked) ? picked! : items[0]?.id;
  const listRef = useRef<HTMLDivElement>(null);
  useMark(listRef, active);
  const tabId = (id: string) => `${base}-tab-${id}`;

  const onKeyDown = (e: KeyboardEvent) => {
    const n = nextIndex(e.key, Math.max(0, items.findIndex((i) => i.id === active)), items.length);
    if (n === null) return;
    e.preventDefault();
    choose(items[n].id);
    document.getElementById(tabId(items[n].id))?.focus();
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="k-tabs relative flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)] [scrollbar-width:none]"
      >
        {items.map((it) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              id={tabId(it.id)}
              data-key={it.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${base}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => choose(it.id)}
              className="relative inline-flex min-h-target shrink-0 items-center gap-2 rounded-t-sm px-3 text-sm font-medium whitespace-nowrap text-muted transition-colors duration-(--duration-quick) hover:text-ink focus-visible:-outline-offset-2 aria-selected:text-ink"
            >
              {it.icon}
              {it.label}
              {it.meta != null && <span className="k-meta">{it.meta}</span>}
            </button>
          );
        })}
        <span aria-hidden="true" className="k-tab-rule" />
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={active ? tabId(active) : undefined} tabIndex={0} className="rounded-sm pt-5 focus-visible:outline-offset-4">
        {active !== undefined && children(active)}
      </div>
    </div>
  );
}

export type SegmentOption = { value: string; label: ReactNode; icon?: ReactNode };

/**
 * One choice among two to five, like Week / Day. Radio semantics: the group is one tab stop and the
 * arrows change the choice. A raised white thumb slides to the selection on a recessed well.
 */
export function Segmented({
  label,
  options,
  value,
  defaultValue,
  onChange,
  block = false,
  className = "",
}: {
  label: string;
  options: SegmentOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fill the row, options sharing the width. */
  block?: boolean;
  className?: string;
}) {
  const [picked, choose] = useChoice(value, defaultValue ?? options[0]?.value, onChange);
  const listRef = useRef<HTMLDivElement>(null);
  useMark(listRef, picked);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const onKeyDown = (e: KeyboardEvent) => {
    const n = nextIndex(e.key, Math.max(0, options.findIndex((o) => o.value === picked)), options.length, true);
    if (n === null) return;
    e.preventDefault();
    choose(options[n].value);
    refs.current.get(options[n].value)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`k-segmented relative max-w-full rounded-full bg-panel2 p-1 inset-shadow-well ${block ? "flex w-full" : "inline-flex"} ${className}`.trim()}
    >
      <span aria-hidden="true" className="k-seg-thumb" />
      {options.map((o) => {
        const on = o.value === picked;
        return (
          <button
            key={o.value}
            ref={(el) => {
              if (el) refs.current.set(o.value, el);
              else refs.current.delete(o.value);
            }}
            data-key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => choose(o.value)}
            className={`relative z-10 inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 text-center text-sm leading-tight font-medium text-muted transition-colors duration-(--duration-quick) hover:text-ink pointer-coarse:min-h-11 aria-checked:text-ink ${block ? "flex-1" : ""}`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A destructive action that asks once, in place, without a modal: the button becomes "Yes, delete" and
 * "Cancel". Focus moves to the confirm; Escape, Cancel or leaving the pair puts the button back.
 */
export function ConfirmButton({
  children,
  onConfirm,
  confirmLabel,
  cancelLabel,
  variant = "ghost",
  size = "sm",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "ghost" | "secondary";
  size?: "md" | "sm";
  disabled?: boolean;
  className?: string;
}) {
  const t = useT();
  const [asking, setAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pairRef = useRef<HTMLSpanElement>(null);
  const wasAsking = useRef(false);

  useEffect(() => {
    if (asking) confirmRef.current?.focus();
    else if (wasAsking.current) triggerRef.current?.focus();
    wasAsking.current = asking;
    if (!asking) return;
    // A press anywhere else puts the button back. (Blur alone can't tell: Safari doesn't focus clicked buttons.)
    const outside = (e: PointerEvent) => {
      if (!pairRef.current?.contains(e.target as Node)) setAsking(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [asking]);

  if (!asking)
    return (
      <button ref={triggerRef} type="button" disabled={disabled} onClick={() => setAsking(true)} className={btn(variant, size, className)}>
        {children}
      </button>
    );

  return (
    <span
      ref={pairRef}
      className="k-enter inline-flex flex-wrap items-center gap-2"
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        setAsking(false);
      }}
      onBlur={(e) => {
        const to = e.relatedTarget as Node | null;
        if (to && !pairRef.current?.contains(to)) setAsking(false);
      }}
    >
      <button
        ref={confirmRef}
        type="button"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className={btn("danger", size)}
      >
        {confirmLabel ?? t("common.confirmDelete")}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className={btn("ghost", size)}
      >
        {cancelLabel ?? t("common.cancel")}
      </button>
    </span>
  );
}
