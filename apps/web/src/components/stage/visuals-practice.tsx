import { useId } from "react";

// Practice pictures: counters, frames, blocks, clock, arrays, column sums, shapes and a coordinate
// grid. Same rules as visuals.tsx — palette colors, role="img" with the item's alt text, deterministic.

const INK = "var(--color-ink)";
const MUTED = "var(--color-muted)";
const LINE = "var(--color-border)";
const EMPTY = "var(--color-panel2)";
const MONO = "var(--font-opmono)";

type P = { alt: string; tint: string };

/** Counters in rows of five; groups side by side. The last `crossed` counters of the last group are taken away. */
export function DotsVisual({ groups, crossed = 0, alt, tint }: P & { groups: number[]; crossed?: number }) {
  const r = 11, gap = 6, cell = r * 2 + gap, groupGap = 28;
  // One group counts in rows of five (ten-frame thinking); several groups (equal groups) sit in two even rows.
  const perRow = (n: number) => (groups.length === 1 || n <= 5 ? 5 : Math.ceil(n / 2));
  const widths = groups.map((n) => Math.max(1, Math.min(n, perRow(n))) * cell - gap);
  const rows = Math.max(1, ...groups.map((n) => Math.ceil(n / perRow(n))));
  const w = widths.reduce((a, b) => a + b, 0) + groupGap * (groups.length - 1) + 8;
  const h = rows * cell - gap + 8;
  const lefts = widths.map((_, g) => 4 + widths.slice(0, g).reduce((a, b) => a + b, 0) + groupGap * g);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={alt} className="w-full" style={{ maxWidth: Math.min(w * 1.6, 420) }}>
      {groups.map((n, g) => {
        const left = lefts[g];
        const last = g === groups.length - 1;
        return Array.from({ length: n }, (_, i) => {
          const cx = left + (i % perRow(n)) * cell + r, cy = 4 + Math.floor(i / perRow(n)) * cell + r;
          const gone = last && i >= n - crossed;
          return (
            <g key={`${g}-${i}`}>
              <circle cx={cx} cy={cy} r={r} fill={gone ? EMPTY : tint} stroke={gone ? LINE : "none"} />
              {gone && <path d={`M${cx - 7} ${cy - 7} L${cx + 7} ${cy + 7} M${cx + 7} ${cy - 7} L${cx - 7} ${cy + 7}`} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />}
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

export function RectVisual({ w, h, unit, alt, tint }: P & { w: number; h: number; unit: string }) {
  const [rw, rh] = fit(w, h, 220, 120);
  return (
    <svg viewBox={`0 0 ${rw + 90} ${rh + 50}`} role="img" aria-label={alt} className="w-full max-w-sm">
      <rect x={20} y={10} width={rw} height={rh} fill={tint} fillOpacity={0.15} stroke={tint} strokeWidth={2.5} rx={2} />
      {label(20 + rw / 2, rh + 32, `${w} ${unit}`)}
      {label(rw + 30, 10 + rh / 2 + 4, `${h} ${unit}`, "start")}
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
