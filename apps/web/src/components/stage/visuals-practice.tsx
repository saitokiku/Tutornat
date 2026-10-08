import { useId } from "react";

// Practice pictures: counters, frames, blocks, clock, arrays, column sums, shapes, a coordinate grid,
// a bar graph and a line plot. Same rules as visuals.tsx — palette colors, role="img" with the item's
// alt text, deterministic.

const INK = "var(--color-ink)";
const MUTED = "var(--color-muted)";
const LINE = "var(--color-border)";
const EMPTY = "var(--color-panel2)";
const MONO = "var(--font-opmono)";

type P = { alt: string; tint: string };

/**
 * Counters per row in a dots picture. One group counts in rows of five (ten-frame thinking); several
 * groups (equal groups) sit in two even rows. Shared with the tap-to-mark counters in practice.
 */
export const dotsPerRow = (groupCount: number, n: number) => (groupCount === 1 || n <= 5 ? 5 : Math.ceil(n / 2));

/** The two strokes of an X over a counter that was taken away. */
export const crossPath = (cx: number, cy: number, half: number) => `M${cx - half} ${cy - half} L${cx + half} ${cy + half} M${cx + half} ${cy - half} L${cx - half} ${cy + half}`;

/** Rough width of a group label at `size` px, so a long name gets room of its own. */
export const labelWidth = (label: string, size: number) => [...label].length * size * 0.6;

/**
 * Counters in rows of five; groups side by side. The last `crossed` counters of the last group are
 * taken away. `labels` puts a name or picture centred under each group.
 */
export function DotsVisual({ groups, crossed = 0, labels, alt, tint }: P & { groups: number[]; crossed?: number; labels?: string[] }) {
  const r = 11, gap = 6, cell = r * 2 + gap, groupGap = 28, font = 14, labelH = labels ? 24 : 0;
  const perRow = (n: number) => dotsPerRow(groups.length, n);
  const dotsW = groups.map((n) => Math.max(1, Math.min(n, perRow(n))) * cell - gap);
  const widths = dotsW.map((dw, g) => Math.max(dw, labels?.[g] ? labelWidth(labels[g], font) : 0));
  const rows = Math.max(1, ...groups.map((n) => Math.ceil(n / perRow(n))));
  const w = widths.reduce((a, b) => a + b, 0) + groupGap * (groups.length - 1) + 8;
  const h = rows * cell - gap + 8 + labelH;
  const lefts = widths.map((ww, g) => 4 + widths.slice(0, g).reduce((a, b) => a + b, 0) + groupGap * g + (ww - dotsW[g]) / 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={alt} className="w-full" style={{ maxWidth: Math.min(w * 1.6, 420) }}>
      {labels?.map((label, g) => (
        <text key={`l${g}`} x={lefts[g] + dotsW[g] / 2} y={h - 6} textAnchor="middle" fontSize={font} fill={INK}>
          {label}
        </text>
      ))}
      {groups.map((n, g) => {
        const left = lefts[g];
        const last = g === groups.length - 1;
        return Array.from({ length: n }, (_, i) => {
          const cx = left + (i % perRow(n)) * cell + r, cy = 4 + Math.floor(i / perRow(n)) * cell + r;
          const gone = last && i >= n - crossed;
          return (
            <g key={`${g}-${i}`}>
              <circle cx={cx} cy={cy} r={r} fill={gone ? EMPTY : tint} stroke={gone ? LINE : "none"} />
              {gone && <path d={crossPath(cx, cy, 7)} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />}
            </g>
          );
        });
      })}
    </svg>
  );
}

export function TenFrameVisual({ filled, frames = 1, alt, tint }: P & { filled: number; frames?: 1 | 2 }) {
  const c = 34, pad = 3, fw = c * 5, fh = c * 2, gapX = 18;
  const w = frames * fw + (frames - 1) * gapX + pad * 2;
  return (
    <svg viewBox={`0 0 ${w} ${fh + pad * 2}`} role="img" aria-label={alt} className="w-full" style={{ maxWidth: frames === 2 ? 440 : 240 }}>
      {Array.from({ length: frames * 10 }, (_, k) => {
        const f = Math.floor(k / 10), i = k % 10;
        const x = pad + f * (fw + gapX) + (i % 5) * c, y = pad + Math.floor(i / 5) * c;
        return (
          <g key={k}>
            <rect x={x} y={y} width={c} height={c} fill="var(--color-panel)" stroke={INK} strokeWidth={1.5} />
            {k < filled && <circle cx={x + c / 2} cy={y + c / 2} r={c / 2 - 6} fill={tint} />}
          </g>
        );
      })}
    </svg>
  );
}

export function BaseTenVisual({ hundreds = 0, tens, ones, alt, tint }: P & { hundreds?: number; tens: number; ones: number }) {
  const u = 9, gap = 10;
  const flat = u * 10, rodW = u;
  const onesCols = Math.ceil(ones / 5);
  const w = hundreds * (flat + gap) + tens * (rodW + 6) + (tens ? gap : 0) + onesCols * (u + 4) + 8;
  const h = flat + 8;
  let x = 4;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < hundreds; i++, x += flat + gap)
    out.push(
      <g key={`h${i}`}>
        <rect x={x} y={4} width={flat} height={flat} fill={tint} opacity={0.9} rx={2} />
        {Array.from({ length: 9 }, (_, k) => (
          <g key={k} stroke="var(--color-panel)" strokeWidth={0.8} opacity={0.6}>
            <line x1={x + (k + 1) * u} x2={x + (k + 1) * u} y1={4} y2={4 + flat} />
            <line x1={x} x2={x + flat} y1={4 + (k + 1) * u} y2={4 + (k + 1) * u} />
          </g>
        ))}
      </g>,
    );
  for (let i = 0; i < tens; i++, x += rodW + 6)
    out.push(
      <g key={`t${i}`}>
        <rect x={x} y={4} width={rodW} height={flat} fill={tint} rx={2} />
        {Array.from({ length: 9 }, (_, k) => (
          <line key={k} x1={x} x2={x + rodW} y1={4 + (k + 1) * u} y2={4 + (k + 1) * u} stroke="var(--color-panel)" strokeWidth={0.8} opacity={0.6} />
        ))}
      </g>,
    );
  if (tens) x += gap - 6;
  for (let i = 0; i < ones; i++)
    out.push(<rect key={`o${i}`} x={x + Math.floor(i / 5) * (u + 4)} y={4 + flat - (i % 5 + 1) * (u + 4) + 4} width={u} height={u} fill={tint} rx={1.5} />);
  return (
    <svg viewBox={`0 0 ${Math.max(w, 40)} ${h}`} role="img" aria-label={alt} className="w-full" style={{ maxWidth: Math.min(Math.max(w, 40) * 2.2, 460) }}>
      {out}
    </svg>
  );
}

export function ClockVisual({ h, m, alt, tint }: P & { h: number; m: number }) {
  const cx = 80, cy = 80, R = 70;
  const hand = (deg: number, len: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
  };
  const [hx, hy] = hand(((h % 12) + m / 60) * 30, 36);
  const [mx, my] = hand(m * 6, 56);
  return (
    <svg viewBox="0 0 160 160" role="img" aria-label={alt} className="w-full max-w-[200px]">
      <circle cx={cx} cy={cy} r={R} fill="var(--color-panel)" stroke={INK} strokeWidth={3} />
      {Array.from({ length: 60 }, (_, i) => {
        const [x1, y1] = hand(i * 6, R - (i % 5 === 0 ? 9 : 4));
        const [x2, y2] = hand(i * 6, R - 1);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 === 0 ? INK : LINE} strokeWidth={i % 5 === 0 ? 2 : 1} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = hand((i + 1) * 30, R - 20);
        return (
          <text key={i} x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight={600} fill={INK} fontFamily="var(--font-brand)">
            {i + 1}
          </text>
        );
      })}
      <line x1={cx} y1={cy} x2={hx} y2={hy} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={mx} y2={my} stroke={tint} strokeWidth={4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={INK} />
    </svg>
  );
}

export function ArrayVisual({ rows, cols, alt, tint }: P & { rows: number; cols: number }) {
  const c = 26, r = 9;
  return (
    <svg viewBox={`0 0 ${cols * c + 8} ${rows * c + 8}`} role="img" aria-label={alt} className="w-full" style={{ maxWidth: Math.min(cols * c * 1.4, 420) }}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <circle key={i} cx={4 + (i % cols) * c + c / 2} cy={4 + Math.floor(i / cols) * c + c / 2} r={r} fill={tint} />
      ))}
    </svg>
  );
}

/** Vertical arithmetic, digits right-aligned in columns, with an empty answer row. */
export function ColumnVisual({ op, top, bottom, alt }: P & { op: string; top: number; bottom: number }) {
  const digits = Math.max(String(top).length, String(bottom).length) + 1;
  const cw = 24, w = (digits + 1) * cw + 16, row = 34;
  const right = w - 12;
  const num = (n: number, y: number) =>
    String(n)
      .split("")
      .reverse()
      .map((d, i) => (
        <text key={i} x={right - i * cw - cw / 2} y={y} textAnchor="middle" fontSize="26" fill={INK} fontFamily={MONO}>
          {d}
        </text>
      ));
  return (
    <svg viewBox={`0 0 ${w} ${row * 3 + 10}`} role="img" aria-label={alt} className="w-full" style={{ maxWidth: Math.min(w * 1.5, 260) }}>
      {num(top, row)}
      <text x={12} y={row * 2} fontSize="26" fill={INK} fontFamily={MONO}>
        {op}
      </text>
      {num(bottom, row * 2)}
      <line x1={8} x2={right + 4} y1={row * 2 + 12} y2={row * 2 + 12} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      {Array.from({ length: digits }, (_, i) => (
        <rect key={i} x={right - (i + 1) * cw + 3} y={row * 2 + 20} width={cw - 6} height={row - 6} rx={4} fill="none" stroke={LINE} strokeDasharray="3 3" />
      ))}
    </svg>
  );
}

const label = (x: number, y: number, text: string, anchor: "start" | "middle" | "end" = "middle") => (
  <text x={x} y={y} textAnchor={anchor} fontSize="13" fill={INK} fontFamily={MONO}>
    {text}
  </text>
);

/** Keeps shapes readable: real proportions within limits, so a 1×20 rectangle is not a hairline. */
const fit = (a: number, b: number, maxA: number, maxB: number) => {
  const ratio = Math.min(Math.max(a / b, 0.35), 2.8);
  return ratio * maxB <= maxA ? [ratio * maxB, maxB] : [maxA, maxA / ratio];
};

/** Each part of a side: its length, where it starts and how long it is drawn. */
const cuts = (parts: number[], total: number, len: number) =>
  parts.map((p, i) => ({ p, at: (parts.slice(0, i).reduce((s, x) => s + x, 0) / total) * len, len: (p / total) * len }));

/** A rectangle with its sides labelled. With `splits` it is an area model: cut lines, each part's side, and its area inside it, all at one scale. */
export function RectVisual({ w, h, unit, splits, alt, tint }: P & { w: number; h: number; unit: string; splits?: { w: number[]; h: number[] } }) {
  const [rw, rh] = fit(w, h, 220, 120);
  const xs = splits ? cuts(splits.w, w, rw) : [];
  const ys = splits ? cuts(splits.h, h, rh) : [];
  return (
    <svg viewBox={`0 0 ${rw + 90} ${rh + 50}`} role="img" aria-label={alt} className="w-full max-w-sm">
      <rect x={20} y={10} width={rw} height={rh} fill={tint} fillOpacity={0.15} stroke={tint} strokeWidth={2.5} rx={2} />
      {xs.slice(1).map((c) => (
        <line key={`x${c.at}`} x1={20 + c.at} x2={20 + c.at} y1={10} y2={10 + rh} stroke={tint} strokeWidth={1.5} />
      ))}
      {ys.slice(1).map((c) => (
        <line key={`y${c.at}`} x1={20} x2={20 + rw} y1={10 + c.at} y2={10 + c.at} stroke={tint} strokeWidth={1.5} />
      ))}
      {ys.flatMap((y) => xs.map((x) => <g key={`${x.at}-${y.at}`}>{label(20 + x.at + x.len / 2, 10 + y.at + y.len / 2 + 4, String(x.p * y.p))}</g>))}
      {splits ? xs.map((x) => <g key={`w${x.at}`}>{label(20 + x.at + x.len / 2, rh + 32, String(x.p))}</g>) : label(20 + rw / 2, rh + 32, `${w} ${unit}`)}
      {splits ? ys.map((y) => <g key={`h${y.at}`}>{label(rw + 30, 10 + y.at + y.len / 2 + 4, String(y.p), "start")}</g>) : label(rw + 30, 10 + rh / 2 + 4, `${h} ${unit}`, "start")}
    </svg>
  );
}

export function TriangleVisual({ base, height, unit, alt, tint }: P & { base: number; height: number; unit: string }) {
  const [bw, bh] = fit(base, height, 220, 120);
  const apex = 20 + bw * 0.35;
  return (
    <svg viewBox={`0 0 ${bw + 100} ${bh + 50}`} role="img" aria-label={alt} className="w-full max-w-sm">
      <polygon points={`20,${bh + 10} ${20 + bw},${bh + 10} ${apex},10`} fill={tint} fillOpacity={0.15} stroke={tint} strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={apex} x2={apex} y1={10} y2={bh + 10} stroke={INK} strokeWidth={1.5} strokeDasharray="5 4" />
      <path d={`M${apex} ${bh} h10 v10`} fill="none" stroke={INK} strokeWidth={1.2} />
      {label(20 + bw / 2, bh + 32, `${base} ${unit}`)}
      {label(apex + 8, 10 + bh / 2, `${height} ${unit}`, "start")}
    </svg>
  );
}

export function CircleVisual({ r, show, unit, alt, tint }: P & { r: number; show: "r" | "d"; unit: string }) {
  return (
    <svg viewBox="0 0 220 170" role="img" aria-label={alt} className="w-full max-w-[260px]">
      <circle cx={110} cy={80} r={70} fill={tint} fillOpacity={0.12} stroke={tint} strokeWidth={2.5} />
      <circle cx={110} cy={80} r={3} fill={INK} />
      <line x1={show === "d" ? 40 : 110} x2={180} y1={80} y2={80} stroke={INK} strokeWidth={2} />
      {label(show === "d" ? 110 : 145, 72, `${show === "d" ? r * 2 : r} ${unit}`)}
      {label(110, 166, show === "d" ? "d" : "r")}
    </svg>
  );
}

export function RightTriangleVisual({ a, b, c, unit, alt, tint }: P & { a: number | null; b: number | null; c: number | null; unit: string }) {
  const t = (v: number | null) => (v === null ? "?" : `${v} ${unit}`);
  return (
    <svg viewBox="0 0 280 190" role="img" aria-label={alt} className="w-full max-w-sm">
      <polygon points="40,150 220,150 40,30" fill={tint} fillOpacity={0.12} stroke={tint} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M40 136 h14 v14" fill="none" stroke={INK} strokeWidth={1.5} />
      {label(30, 94, t(a), "end")}
      {label(130, 172, t(b))}
      {label(140, 82, t(c), "start")}
    </svg>
  );
}

export function PrismVisual({ l, w, h, unit, alt, tint }: P & { l: number; w: number; h: number; unit: string }) {
  const L = 150, H = 90, D = 50; // drawn sizes; labels carry the real numbers
  const ox = 30, oy = 40 + D * 0.6;
  const dx = D * 0.8, dy = D * 0.6;
  return (
    <svg viewBox="0 0 290 200" role="img" aria-label={alt} className="w-full max-w-sm">
      <polygon points={`${ox},${oy} ${ox + L},${oy} ${ox + L},${oy + H} ${ox},${oy + H}`} fill={tint} fillOpacity={0.18} stroke={tint} strokeWidth={2} />
      <polygon points={`${ox},${oy} ${ox + dx},${oy - dy} ${ox + L + dx},${oy - dy} ${ox + L},${oy}`} fill={tint} fillOpacity={0.3} stroke={tint} strokeWidth={2} />
      <polygon points={`${ox + L},${oy} ${ox + L + dx},${oy - dy} ${ox + L + dx},${oy + H - dy} ${ox + L},${oy + H}`} fill={tint} fillOpacity={0.1} stroke={tint} strokeWidth={2} />
      {label(ox + L / 2, oy + H + 22, `${l} ${unit}`)}
      {label(ox + L + dx + 8, oy + H / 2 - dy / 2, `${h} ${unit}`, "start")}
      {label(ox + L + dx / 2 + 10, oy - dy / 2 + 14, `${w} ${unit}`, "start")}
    </svg>
  );
}

export function CoordVisual({ points, line, alt, tint }: P & { points: [number, number][]; line?: boolean }) {
  const clip = useId();
  const all = points.flat();
  const lim = Math.max(5, ...all.map((v) => Math.abs(v))) + 1;
  const S = 240, pad = 14, scale = (S - pad * 2) / (lim * 2);
  const X = (v: number) => pad + (v + lim) * scale, Y = (v: number) => pad + (lim - v) * scale;
  const ticks = Array.from({ length: lim * 2 + 1 }, (_, i) => i - lim);
  const step = lim > 10 ? 5 : lim > 6 ? 2 : 1;
  let seg: React.ReactNode = null;
  if (line && points.length >= 2) {
    const [[x1, y1], [x2, y2]] = points;
    if (x1 !== x2) {
      const m = (y2 - y1) / (x2 - x1), at = (x: number) => y1 + m * (x - x1);
      seg = <line x1={X(-lim)} y1={Y(at(-lim))} x2={X(lim)} y2={Y(at(lim))} stroke={tint} strokeWidth={2} opacity={0.6} />;
    } else seg = <line x1={X(x1)} y1={Y(-lim)} x2={X(x1)} y2={Y(lim)} stroke={tint} strokeWidth={2} opacity={0.6} />;
  }
  return (
    <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label={alt} className="w-full max-w-[300px]">
      <defs>
        <clipPath id={clip}>
          <rect x={pad} y={pad} width={S - pad * 2} height={S - pad * 2} />
        </clipPath>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={X(v)} x2={X(v)} y1={pad} y2={S - pad} stroke={LINE} strokeWidth={v === 0 ? 0 : 1} />
          <line y1={Y(v)} y2={Y(v)} x1={pad} x2={S - pad} stroke={LINE} strokeWidth={v === 0 ? 0 : 1} />
        </g>
      ))}
      <line x1={X(0)} x2={X(0)} y1={pad} y2={S - pad} stroke={INK} strokeWidth={1.5} />
      <line y1={Y(0)} y2={Y(0)} x1={pad} x2={S - pad} stroke={INK} strokeWidth={1.5} />
      {ticks
        .filter((v) => v !== 0 && v % step === 0 && Math.abs(v) < lim)
        .map((v) => (
          <g key={`l${v}`} fontSize="9" fill={MUTED} fontFamily={MONO}>
            <text x={X(v)} y={Y(0) + 12} textAnchor="middle">{v < 0 ? `−${-v}` : v}</text>
            <text x={X(0) - 4} y={Y(v) + 3} textAnchor="end">{v < 0 ? `−${-v}` : v}</text>
          </g>
        ))}
      <g clipPath={`url(#${clip})`}>{seg}</g>
      {points.map(([x, y]) => (
        <circle key={`${x},${y}`} cx={X(x)} cy={Y(y)} r={5} fill={tint} stroke="var(--color-panel)" strokeWidth={2} />
      ))}
    </svg>
  );
}

/** Vertical bars against numbered scale lines from 0. A bar between two lines ends where its value falls. */
export function BarGraphVisual({ labels, values, scale, unit, alt, tint }: P & { labels: string[]; values: number[]; scale: number; unit: string }) {
  const top = (Math.floor(Math.max(scale, ...values) / scale) + 1) * scale;
  const L = 48, T = 10, W = 264, H = 150, B = T + H;
  const y = (v: number) => B - (v / top) * H;
  const lines = Array.from({ length: Math.round(top / scale) + 1 }, (_, i) => i * scale);
  const slot = W / labels.length, bar = Math.min(48, slot * 0.55);
  return (
    <svg viewBox={`0 0 ${L + W + 8} ${B + 28}`} role="img" aria-label={alt} className="w-full max-w-md">
      {lines.map((v) => (
        <g key={v}>
          <line x1={L} x2={L + W} y1={y(v)} y2={y(v)} stroke={LINE} />
          <text x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={MUTED} fontFamily={MONO}>
            {v}
          </text>
        </g>
      ))}
      {values.map((v, i) => (
        <rect key={i} x={L + slot * (i + 0.5) - bar / 2} y={y(v)} width={bar} height={B - y(v)} fill={tint} />
      ))}
      <line x1={L} x2={L} y1={T - 4} y2={B} stroke={INK} strokeWidth={1.5} />
      <line x1={L} x2={L + W} y1={B} y2={B} stroke={INK} strokeWidth={1.5} />
      {labels.map((label, i) => (
        <text key={i} x={L + slot * (i + 0.5)} y={B + 18} textAnchor="middle" fontSize="11" fill={INK}>
          {label}
        </text>
      ))}
      <text x={12} y={T + H / 2} textAnchor="middle" fontSize="11" fill={INK} transform={`rotate(-90 12 ${T + H / 2})`}>
        {unit}
      </text>
    </svg>
  );
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** k/den in lowest terms with a true minus sign: 2/8 → 1/4, 8/8 → 1. */
function lowest(k: number, den: number) {
  const g = gcd(Math.abs(k), den), sign = k < 0 ? "\u2212" : "";
  return den / g === 1 ? `${sign}${Math.abs(k) / g}` : `${sign}${Math.abs(k) / g}/${den / g}`;
}

/** A number line in 1/denominator steps, every tick labelled in lowest terms, with one X stacked above it per value. */
export function LinePlotVisual({ min, max, denominator, values, unit, alt, tint }: P & { min: number; max: number; denominator: number; values: number[]; unit: string }) {
  const first = Math.round(min * denominator), count = Math.round((max - min) * denominator);
  const stacks = new Map<number, number>();
  for (const v of values) stacks.set(Math.round(v * denominator), (stacks.get(Math.round(v * denominator)) ?? 0) + 1);
  const cell = 16, w = 360, pad = 22, axis = 10 + Math.max(1, ...stacks.values()) * cell;
  const x = (k: number) => pad + ((k - first) / count) * (w - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${axis + 46}`} role="img" aria-label={alt} className="w-full max-w-md">
      {[...stacks].map(([k, n]) =>
        Array.from({ length: n }, (_, j) => <path key={`${k}-${j}`} d={crossPath(x(k), axis - 10 - j * cell, 5.5)} stroke={tint} strokeWidth={2.5} strokeLinecap="round" />),
      )}
      <line x1={pad - 8} x2={w - pad + 8} y1={axis} y2={axis} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      {Array.from({ length: count + 1 }, (_, i) => first + i).map((k) => (
        <g key={k}>
          <line x1={x(k)} x2={x(k)} y1={axis - 6} y2={axis + 6} stroke={INK} strokeWidth={1.5} />
          <text x={x(k)} y={axis + 22} textAnchor="middle" fontSize="11" fill={MUTED} fontFamily={MONO}>
            {lowest(k, denominator)}
          </text>
        </g>
      ))}
      <text x={w / 2} y={axis + 40} textAnchor="middle" fontSize="11" fill={INK}>
        {unit}
      </text>
    </svg>
  );
}
