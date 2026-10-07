"use client";

// announce(): one polite and one assertive live region, mounted once by the root layout, for things that
// change without moving focus ("Saved", "Hint 2 of 3"). toast(): the same message, also shown for a few
// seconds. A toast is never the only place information lives — the screen must show the result too.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { IconAlert, IconCheckCircle, IconInfo, IconX } from "@/components/icons";
import { useT } from "@/i18n";

const REGION = { polite: "k-live-polite", assertive: "k-live-assertive" } as const;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function region(kind: keyof typeof REGION): HTMLElement {
  let el = document.getElementById(REGION[kind]);
  if (!el) {
    el = document.createElement("div");
    el.id = REGION[kind];
    el.className = "sr-only";
    el.setAttribute("aria-live", kind);
    el.setAttribute("aria-atomic", "true");
    document.body.append(el);
  }
  return el;
}

/** Say something to screen readers without moving focus. Repeating the same message announces it again. */
export function announce(message: string, { assertive = false }: { assertive?: boolean } = {}) {
  if (typeof document === "undefined" || !message) return;
  const kind = assertive ? "assertive" : "polite";
  const el = region(kind);
  el.textContent = "";
  clearTimeout(timers.get(kind));
  // A beat between clearing and writing makes screen readers treat a repeat as new.
  timers.set(
    kind,
    setTimeout(() => {
      el.textContent = message;
      timers.set(kind, setTimeout(() => (el.textContent = ""), 7000));
    }, 60),
  );
}

/** The two live regions, present from the first paint so the first announcement is heard. */
export function Announcer() {
  return (
    <>
      <div id={REGION.polite} className="sr-only" aria-live="polite" aria-atomic="true" />
      <div id={REGION.assertive} className="sr-only" aria-live="assertive" aria-atomic="true" />
    </>
  );
}

type Tone = "info" | "good" | "warn" | "bad";
type Toast = { id: number; message: string; tone: Tone; action?: { label: string; onClick: () => void }; leaving?: boolean };

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const EMPTY: Toast[] = [];

function remove(id: number) {
  const t = toasts.find((x) => x.id === id);
  if (!t || t.leaving) return;
  toasts = toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x));
  emit();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    emit();
  }, 180);
}

/** Show a short confirmation and announce it. `bad` is announced assertively. Returns a dismiss function. */
export function toast(message: string, opts: { tone?: Tone; action?: { label: string; onClick: () => void } } = {}) {
  const tone = opts.tone ?? "info";
  announce(message, { assertive: tone === "bad" });
  const id = ++seq;
  toasts = [...toasts.slice(-2), { id, message, tone, action: opts.action }];
  emit();
  return () => remove(id);
}

const ICON = { info: IconInfo, good: IconCheckCircle, warn: IconAlert, bad: IconAlert };
const MARK = { info: "text-muted", good: "text-good", warn: "text-warn", bad: "text-bad" };

function ToastCard({ toast: item }: { toast: Toast }) {
  const t = useT();
  const paused = useRef(false);
  useEffect(() => {
    if (item.leaving) return;
    let left = item.action ? 8000 : 5000;
    let last = Date.now();
    const tick = setInterval(() => {
      const now = Date.now();
      if (!paused.current) left -= now - last;
      last = now;
      if (left <= 0) remove(item.id);
    }, 250);
    return () => clearInterval(tick);
  }, [item.id, item.leaving, item.action]);
  const Icon = ICON[item.tone];
  return (
    <div
      data-leaving={item.leaving ? "" : undefined}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
      className="k-toast flex w-full max-w-[26rem] items-center gap-3 rounded-md border border-border bg-panel py-2 pr-2 pl-4 text-sm text-ink shadow-lift"
    >
      <Icon size={18} className={MARK[item.tone]} />
      <p className="min-w-0 flex-1 py-1.5">{item.message}</p>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action!.onClick();
            remove(item.id);
          }}
          className="k-btn-ghost min-h-9 px-3 text-xs text-ink pointer-coarse:min-h-11"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={() => remove(item.id)}
        className="k-btn-ghost size-9 min-h-0 shrink-0 px-0 py-0 pointer-coarse:size-11"
      >
        <IconX size={16} />
      </button>
    </div>
  );
}

/** Where toasts appear: bottom centre, above the phone tab bar. Mounted once by the root layout. */
export function Toaster() {
  const t = useT();
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
  if (!list.length) return null;
  return (
    <section aria-label={t("ds.toasts")} className="k-toasts">
      {list.map((item) => (
        <ToastCard key={item.id} toast={item} />
      ))}
    </section>
  );
}
