'use client';

// Renders a ```graph JSON spec as a hand-drawn SVG plot. No charting library —
// just the safe expression compiler (lib/mathExpr) sampling each curve. Any
// asymptote/NaN breaks the path instead of drawing a vertical spike, and the
// y-window is chosen robustly so one blow-up can't flatten the whole curve.
//
// spec = { fns:[{expr,label?,color?}], xmin?, xmax?, ymin?, ymax?,
//          points?:[{x,y,label?}], title? }
//
// Every colour on the plot resolves from a token (see COLORS below), so a graph
// in a chat bubble and a figure on a marketing page are the same five hues. A
// spec may still name its own `color`; that override is model-supplied data and
// is left alone.

import { useMemo } from 'react';
import { compileExpr } from '@/lib/mathExpr';

const W = 480, H = 300, PAD = 30;

// The categorical series palette, derived from the tokens rather than from five
// hand-picked hex values that answered to nothing. Ordered so the two closest
// hues (accent rose and bad red) are never neighbours: a two-curve plot gets
// rose against green, a three-curve plot adds amber, a four-curve plot adds
// near-black. Written as rgb(var(--c-*)) so a token change moves the plot too.
const COLORS = [
  'rgb(var(--c-accent))',
  'rgb(var(--c-good))',
  'rgb(var(--c-warn))',
  'rgb(var(--c-ink))',
  'rgb(var(--c-bad))',
];
const INK = 'rgb(var(--c-ink))';
const MUTED = 'rgb(var(--c-muted))';
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

function robustRange(values) {
  const s = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return [-1, 1];
  // 2nd–98th percentile so a single asymptote can't dominate the window.
  const lo = s[Math.floor(s.length * 0.02)];
  const hi = s[Math.floor(s.length * 0.98)];
  let a = Math.min(lo, hi), b = Math.max(lo, hi);
  if (a === b) { a -= 1; b += 1; }
  const pad = (b - a) * 0.1;
  return [a - pad, b + pad];
}

export default function FunctionGraph({ spec }) {
  const model = useMemo(() => {
    const fns = (Array.isArray(spec?.fns) ? spec.fns : []).slice(0, 4)
      .map((f, i) => ({ f: compileExpr(String(f?.expr || '')), label: f?.label || f?.expr || '', color: f?.color || COLORS[i % COLORS.length], expr: f?.expr }))
      .filter((f) => f.f);
    if (!fns.length) return null;

    const xmin = num(spec.xmin, -10), xmax = num(spec.xmax, 10);
    if (!(xmax > xmin)) return null;
    const N = 240;
    const allY = [];
    const series = fns.map((fn) => {
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const x = xmin + ((xmax - xmin) * i) / N;
        const y = fn.f(x);
        pts.push({ x, y });
        if (Number.isFinite(y)) allY.push(y);
      }
      return { ...fn, pts };
    });

    let ymin = num(spec.ymin, NaN), ymax = num(spec.ymax, NaN);
    if (!Number.isFinite(ymin) || !Number.isFinite(ymax) || !(ymax > ymin)) {
      [ymin, ymax] = robustRange([...allY, ...(Array.isArray(spec.points) ? spec.points.map((p) => num(p?.y, NaN)) : [])]);
    }
    return { series, xmin, xmax, ymin, ymax };
  }, [spec]);

  if (!model) {
    return (
      <div className="my-3 rounded-sm border border-border bg-panel2 px-3 py-2 text-xs text-muted">
        Couldn’t plot this graph.
      </div>
    );
  }

  const { series, xmin, xmax, ymin, ymax } = model;
  const sx = (x) => PAD + ((x - xmin) / (xmax - xmin)) * (W - 2 * PAD);
  const sy = (y) => H - PAD - ((y - ymin) / (ymax - ymin)) * (H - 2 * PAD);
  const yBreak = (ymax - ymin) * 0.35;   // path break if consecutive y jump this far (asymptote)

  const pathFor = (pts) => {
    let d = '', prevY = null, moving = true;
    for (const p of pts) {
      const bad = !Number.isFinite(p.y) || p.y < ymin - yBreak || p.y > ymax + yBreak || (prevY !== null && Math.abs(p.y - prevY) > yBreak);
      if (bad) { moving = true; prevY = Number.isFinite(p.y) ? p.y : null; continue; }
      d += `${moving ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)} `;
      moving = false; prevY = p.y;
    }
    return d.trim();
  };

  const x0 = xmin <= 0 && xmax >= 0 ? sx(0) : null;
  const y0 = ymin <= 0 && ymax >= 0 ? sy(0) : null;
  const points = (Array.isArray(spec.points) ? spec.points : []).filter((p) => Number.isFinite(num(p?.x, NaN)) && Number.isFinite(num(p?.y, NaN))).slice(0, 10);

  return (
    <figure className="my-3 rounded-md border border-border bg-panel overflow-hidden">
      {spec.title && <figcaption className="font-brand text-sm font-semibold text-ink px-4 pt-3">{String(spec.title).slice(0, 120)}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-border" role="img" aria-label={spec.title || 'function graph'}>
        {/* frame */}
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
        {/* axes */}
        {y0 !== null && <line x1={PAD} y1={y0} x2={W - PAD} y2={y0} stroke={MUTED} strokeWidth="1.2" opacity="0.55" />}
        {x0 !== null && <line x1={x0} y1={PAD} x2={x0} y2={H - PAD} stroke={MUTED} strokeWidth="1.2" opacity="0.55" />}
        {/* axis end labels: figures the plot asserts, so they carry the record font */}
        <text className="font-opmono" x={W - PAD} y={(y0 ?? H - PAD) + 13} fontSize="9.5" fill={MUTED} textAnchor="end">{(+xmax.toFixed(2))}</text>
        <text className="font-opmono" x={PAD} y={(y0 ?? H - PAD) + 13} fontSize="9.5" fill={MUTED}>{(+xmin.toFixed(2))}</text>
        <text className="font-opmono" x={(x0 ?? PAD) + 4} y={PAD + 10} fontSize="9.5" fill={MUTED}>{(+ymax.toFixed(2))}</text>
        <text className="font-opmono" x={(x0 ?? PAD) + 4} y={H - PAD - 4} fontSize="9.5" fill={MUTED}>{(+ymin.toFixed(2))}</text>
        {/* curves */}
        {series.map((s, i) => <path key={i} d={pathFor(s.pts)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {/* marked points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={sx(num(p.x, 0))} cy={sy(num(p.y, 0))} r="3.2" fill={INK} />
            {p.label && <text className="font-opmono" x={sx(num(p.x, 0)) + 6} y={sy(num(p.y, 0)) - 6} fontSize="9.5" fill={INK}>{String(p.label).slice(0, 24)}</text>}
          </g>
        ))}
      </svg>
      {series.some((s) => s.label) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border px-4 py-2.5">
          {series.map((s, i) => s.label && (
            <span key={i} className="inline-flex items-center gap-2 text-xs text-muted">
              <span className="w-4 h-0.5 rounded-full" style={{ background: s.color }} />{String(s.label).slice(0, 40)}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
