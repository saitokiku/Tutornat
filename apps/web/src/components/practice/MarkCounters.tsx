"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { IconCheck } from "@/components/icons";
import { Hear } from "@/components/stage/hear";
import { crossPath, dotsPerRow } from "@/components/stage/visuals-practice";
import { useT } from "@/i18n";
import type { Visual } from "@/lib/types";

// Tap-to-mark counting: the dots, ten-frame or array picture drawn large enough to touch, with a
// button over every counter. Marking is a counting aid, not help: it never marks an answer as helped.
// Keyboard: arrows move between counters, Space or Enter marks. Marks belong to one problem.

export type MarkableVisual = Extract<Visual, { kind: "dots" | "ten-frame" | "array" }>;
export const isMarkable = (v?: Visual): v is MarkableVisual => v?.kind === "dots" || v?.kind === "ten-frame" || v?.kind === "array";

export type Counter = {
  /** Top-left corner of the counter's square, in px. */
  x: number;
  y: number;
  group: number;
  row: number;
  col: number;
  kind: "dot" | "box";
  /** A box with a counter in it (ten-frames); dots are always filled. */
  filled: boolean;
  /** Taken away in the picture (subtraction); not counted, so not markable. */
  crossed: boolean;
};

export type CounterLayout = { width: number; height: number; cell: number; counters: Counter[] };

const PAD = 2;

/**
 * Lays the picture out on a grid of `cell`-px squares. Groups (or ten-frames) sit side by side and
 * wrap onto the next line when the width runs out, so each counter keeps a full-size touch target.
 * Only an array, which must keep its shape, shrinks its squares to fit (never below 28 px).
 */
export function layoutCounters(v: MarkableVisual, maxWidth: number, cell: number): CounterLayout {
  type Spec = { count: number; perRow: number; kind: Counter["kind"]; filled: (i: number) => boolean; crossed: (i: number) => boolean };
  let specs: Spec[];
  let size = cell;
  if (v.kind === "dots") {
    const last = v.groups.length - 1;
    specs = v.groups.map((n, g) => ({
      count: n,
      perRow: dotsPerRow(v.groups.length, n),
      kind: "dot",
      filled: () => true,
      crossed: (i) => g === last && i >= n - (v.crossed ?? 0),
    }));
  } else if (v.kind === "ten-frame") {
    specs = Array.from({ length: v.frames ?? 1 }, (_, f) => ({ count: 10, perRow: 5, kind: "box", filled: (i) => f * 10 + i < v.filled, crossed: () => false }));
  } else {
    size = Math.max(28, Math.min(cell, Math.floor((maxWidth - PAD * 2) / v.cols)));
    specs = [{ count: v.rows * v.cols, perRow: v.cols, kind: "dot", filled: () => true, crossed: () => false }];
  }
  const gap = v.kind === "ten-frame" ? 16 : Math.round(size * 0.6);
  const room = Math.max(maxWidth - PAD * 2, 1);

  // Place groups into lines.
  const lines: { groups: { spec: Spec; g: number; w: number; h: number; x: number }[]; w: number; h: number }[] = [];
  specs.forEach((spec, g) => {
    const cols = Math.max(1, Math.min(spec.count, spec.perRow));
    const w = cols * size, h = Math.max(1, Math.ceil(spec.count / spec.perRow)) * size;
    let line = lines.at(-1);
    if (!line || (line.groups.length > 0 && line.w + gap + w > room)) lines.push((line = { groups: [], w: 0, h: 0 }));
    const x = line.groups.length ? line.w + gap : 0;
    line.groups.push({ spec, g, w, h, x });
    line.w = x + w;
    line.h = Math.max(line.h, h);
  });

  const width = Math.max(...lines.map((l) => l.w)) + PAD * 2;
  const counters: Counter[] = [];
  let y = PAD;
  for (const line of lines) {
    const shift = PAD + (width - PAD * 2 - line.w) / 2;
    for (const { spec, g, x } of line.groups)
      for (let i = 0; i < spec.count; i++)
        counters.push({
          x: shift + x + (i % spec.perRow) * size,
          y: y + Math.floor(i / spec.perRow) * size,
          group: g,
          row: Math.floor(i / spec.perRow),
          col: i % spec.perRow,
          kind: spec.kind,
          filled: spec.filled(i),
          crossed: spec.crossed(i),
        });
    y += line.h + gap;
  }
  return { width, height: y - gap + PAD, cell: size, counters };
}

type Props = { visual: MarkableVisual; alt: string; tint?: string; young?: boolean };

export function MarkCounters({ visual, alt, tint = "var(--color-math)", young }: Props) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  // Laid out for a phone first; the observer reports the real width before the first paint.
  const [room, setRoom] = useState(288);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setRoom(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const layout = useMemo(() => layoutCounters(visual, room, young ? 52 : 46), [visual, room, young]);
  const { cell, counters } = layout;
  const targets = useMemo(() => counters.flatMap((c, i) => (c.crossed ? [] : [i])), [counters]);
  const [marked, setMarked] = useState<ReadonlySet<number>>(() => new Set());
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggle = (i: number) =>
    setMarked((m) => {
      const next = new Set(m);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  const go = (k: number) => {
    if (k < 0 || k >= targets.length) return;
    setFocus(k);
    refs.current[k]?.focus();
  };
  const onKey = (e: KeyboardEvent, k: number) => {
    const c = counters[targets[k]];
    const vertical = (dir: 1 | -1) => targets.findIndex((i) => counters[i].group === c.group && counters[i].col === c.col && counters[i].row === c.row + dir);
    const moves: Record<string, () => number> = {
      ArrowRight: () => k + 1,
      ArrowLeft: () => k - 1,
      ArrowDown: () => vertical(1),
      ArrowUp: () => vertical(-1),
      Home: () => 0,
      End: () => targets.length - 1,
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    go(moves[e.key]());
  };

  const labelOf = (c: Counter, n: number) =>
    visual.kind === "array"
      ? t("pr.mark.cell", { row: c.row + 1, col: c.col + 1 })
      : c.kind === "box"
        ? t(c.filled ? "pr.mark.full" : "pr.mark.empty", { n })
        : t("pr.mark.dot", { n });
  const r = cell * (visual.kind === "ten-frame" ? 0.32 : 0.36);
  const count = marked.size;

  return (
    <div ref={box} className="w-full">
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
        <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={alt} className="block">
          {counters.map((c, i) => {
            const cx = c.x + cell / 2, cy = c.y + cell / 2;
            if (c.kind === "box")
              return (
                <g key={i}>
                  <rect x={c.x} y={c.y} width={cell} height={cell} fill="var(--color-panel)" stroke="var(--color-ink)" strokeWidth={1.5} />
                  {c.filled && <circle cx={cx} cy={cy} r={r} fill={tint} />}
                </g>
              );
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={r} fill={c.crossed ? "var(--color-panel2)" : tint} stroke={c.crossed ? "var(--color-border)" : "none"} />
                {c.crossed && <path d={crossPath(cx, cy, r * 0.62)} stroke="var(--color-ink)" strokeWidth={2.5} strokeLinecap="round" />}
              </g>
            );
          })}
        </svg>
        <div role="group" aria-label={t("pr.mark.group")} className="absolute inset-0">
          {targets.map((i, k) => {
            const c = counters[i];
            const on = marked.has(i);
            return (
              <button
                key={i}
                ref={(el) => void (refs.current[k] = el)}
                type="button"
                tabIndex={k === focus ? 0 : -1}
                aria-pressed={on}
                aria-label={labelOf(c, k + 1)}
                onClick={() => (setFocus(k), toggle(i))}
                onKeyDown={(e) => onKey(e, k)}
                className="absolute grid place-items-center rounded-full focus-visible:outline-offset-0"
                style={{ left: c.x, top: c.y, width: cell, height: cell }}
              >
                {on && (
                  // A pencil-like mark: an ink ring around the counter and a tick on it; the counter stays visible.
                  <span
                    aria-hidden="true"
                    className={`grid place-items-center rounded-full border-[3px] border-ink ${c.filled ? "text-paper" : "text-ink"}`}
                    style={{ width: r * 2 + 10, height: r * 2 + 10 }}
                  >
                    <IconCheck size={Math.round(r * 1.1)} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <p aria-live="polite" className={`text-ink ${young ? "text-t3" : "text-sm"}`}>
          {count ? t("pr.mark.count", { n: count }) : t("pr.mark.how")}
        </p>
        {!count && <Hear text={t("pr.mark.how")} />}
        {count > 0 && (
          <button
            type="button"
            onClick={() => {
              setMarked(new Set());
              refs.current[focus]?.focus();
            }}
            className="k-btn-ghost"
          >
            {t("pr.mark.clear")}
          </button>
        )}
      </div>
    </div>
  );
}
