// Static teaching pictures, drawn from the palette. Each is an <svg role="img"> labelled by the
// scene's alt text, so the picture is never the only channel.
import type { Visual } from "@/lib/types";
import {
  ArrayVisual,
  BaseTenVisual,
  CircleVisual,
  ClockVisual,
  ColumnVisual,
  CoordVisual,
  DotsVisual,
  PrismVisual,
  RectVisual,
  RightTriangleVisual,
  TenFrameVisual,
  TriangleVisual,
} from "./visuals-practice";

const INK = "var(--color-ink)";
const MUTED = "var(--color-muted)";
const LINE = "var(--color-border)";

export function VisualView({ visual, alt, tint = "var(--color-math)" }: { visual: Visual; alt: string; tint?: string }) {
  switch (visual.kind) {
    case "fraction":
      return <FractionVisual parts={visual.parts} shaded={visual.shaded} alt={alt} tint={tint} />;
    case "number-line":
      return <NumberLineVisual {...visual} alt={alt} tint={tint} />;
    case "particles":
      return <ParticlesVisual state={visual.state} alt={alt} tint={tint} />;
    case "moon":
      return <MoonVisual phase={visual.phase} alt={alt} size={140} />;
    case "line-graph":
      return <LineGraphVisual {...visual} alt={alt} tint={tint} />;
    case "dots":
      return <DotsVisual {...visual} alt={alt} tint={tint} />;
    case "ten-frame":
      return <TenFrameVisual {...visual} alt={alt} tint={tint} />;
    case "base-ten":
      return <BaseTenVisual {...visual} alt={alt} tint={tint} />;
    case "clock":
      return <ClockVisual {...visual} alt={alt} tint={tint} />;
    case "array":
      return <ArrayVisual {...visual} alt={alt} tint={tint} />;
    case "column":
      return <ColumnVisual {...visual} alt={alt} tint={tint} />;
    case "rect":
      return <RectVisual {...visual} alt={alt} tint={tint} />;
    case "triangle":
      return <TriangleVisual {...visual} alt={alt} tint={tint} />;
    case "circle":
      return <CircleVisual {...visual} alt={alt} tint={tint} />;
    case "right-triangle":
      return <RightTriangleVisual {...visual} alt={alt} tint={tint} />;
    case "prism":
      return <PrismVisual {...visual} alt={alt} tint={tint} />;
    case "coord":
      return <CoordVisual {...visual} alt={alt} tint={tint} />;
  }
}

export function FractionVisual({ parts, shaded, alt, tint }: { parts: number; shaded: number; alt: string; tint: string }) {
  const w = 320, h = 56, gap = 3, seg = (w - gap * (parts - 1)) / parts;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={alt} className="w-full max-w-sm">
      {Array.from({ length: parts }, (_, i) => (
        <rect
          key={i}
          x={i * (seg + gap)}
          y={0}
          width={seg}
          height={h}
          rx={i === 0 || i === parts - 1 ? 10 : 3}
          fill={i < shaded ? tint : "var(--color-panel2)"}
          stroke={i < shaded ? "none" : LINE}
        />
      ))}
    </svg>
  );
}

/** A number as a learner reads it: true minus sign, fractions when a denominator is given. */
export function fractionLabel(value: number, denominator?: number) {
  const minus = (s: string) => s.replace("-", "\u2212");
  if (!denominator) return minus(String(Math.round(value * 100) / 100));
  const num = Math.round(value * denominator);
  if (num % denominator === 0) return minus(String(num / denominator));
  return minus(`${num}/${denominator}`);
}

export function NumberLineVisual({
  min,
  max,
  marks,
  denominator,
  alt,
  tint,
  marker,
}: {
  min: number;
  max: number;
  marks: number[];
  denominator?: number;
  alt: string;
  tint: string;
  marker?: number;
}) {
  const w = 360, pad = 20, y = 34;
  const x = (v: number) => pad + ((v - min) / (max - min)) * (w - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} 64`} role="img" aria-label={alt} className="w-full max-w-md">
      <line x1={pad - 8} x2={w - pad + 8} y1={y} y2={y} stroke={INK} strokeWidth={2} strokeLinecap="round" />
      {marks.map((m) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1={y - 7} y2={y + 7} stroke={INK} strokeWidth={1.5} />
          <text x={x(m)} y={y + 24} textAnchor="middle" fontSize="12" fill={MUTED} fontFamily="var(--font-opmono)">
            {fractionLabel(m, denominator)}
          </text>
        </g>
      ))}
      {marker !== undefined && <circle cx={x(marker)} cy={y} r={8} fill={tint} stroke="var(--color-panel)" strokeWidth={3} />}
    </svg>
  );
}

// Deterministic layouts: packed grid, a loose cluster at the bottom, spread out.
const SOLID = Array.from({ length: 20 }, (_, i) => [38 + (i % 5) * 22, 48 + Math.floor(i / 5) * 22]);
const LIQUID = [
  [34, 112], [56, 116], [80, 110], [104, 116], [128, 112], [148, 104], [44, 92], [68, 96], [92, 90], [116, 94],
  [138, 86], [30, 74], [58, 76], [84, 72], [110, 74], [132, 66], [70, 54], [98, 56], [48, 58], [124, 48],
];
const GAS = [
  [30, 30], [92, 22], [150, 36], [62, 58], [124, 70], [36, 96], [96, 92], [150, 110], [64, 124], [118, 128],
];

export function ParticlesVisual({ state, alt, tint }: { state: "solid" | "liquid" | "gas"; alt: string; tint: string }) {
  const pts = state === "solid" ? SOLID : state === "liquid" ? LIQUID : GAS;
  return (
    <svg viewBox="0 0 180 140" role="img" aria-label={alt} className="w-full max-w-[220px]">
      <rect x={4} y={4} width={172} height={132} rx={14} fill="var(--color-panel2)" stroke={LINE} />
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={9} fill={tint} opacity={0.85} />
      ))}
    </svg>
  );
}

/** Lit part of the Moon as seen from the northern hemisphere. phase: 0 new, 0.25 first quarter, 0.5 full. */
export function moonPath(phase: number, r = 40, cx = 50, cy = 50) {
  const p = ((phase % 1) + 1) % 1;
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(k) * r;
  const top = `${cx} ${cy - r}`, bottom = `${cx} ${cy + r}`;
  if (p <= 0.5) {
    // Waxing: right half lit; terminator bulges right for a crescent, left for gibbous.
    return `M ${top} A ${r} ${r} 0 0 1 ${bottom} A ${rx} ${r} 0 0 ${k > 0 ? 0 : 1} ${top} Z`;
  }
  return `M ${top} A ${r} ${r} 0 0 0 ${bottom} A ${rx} ${r} 0 0 ${k > 0 ? 1 : 0} ${top} Z`;
}

/** `size` in px; omit it to fill the parent's width. */
export function MoonVisual({ phase, alt, size }: { phase: number; alt: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size ?? "100%"} height={size} role="img" aria-label={alt} className={size ? undefined : "h-auto w-full"}>
      <circle cx={50} cy={50} r={40} fill="#2b2a27" />
      <path d={moonPath(phase)} fill="#f3eee2" />
      <circle cx={50} cy={50} r={40} fill="none" stroke={LINE} strokeWidth={1} />
    </svg>
  );
}

export function LineGraphVisual({
  points,
  xLabel,
  yLabel,
  alt,
  tint,
}: {
  points: [number, number][];
  xLabel: string;
  yLabel: string;
  alt: string;
  tint: string;
}) {
  const maxX = Math.max(1, ...points.map((p) => p[0]));
  const maxY = Math.max(1, ...points.map((p) => p[1]));
  const L = 40, B = 150, W = 260, H = 130;
  const x = (v: number) => L + (v / maxX) * W;
  const y = (v: number) => B - (v / maxY) * H;
  const ticksX = Array.from({ length: maxX + 1 }, (_, i) => i).filter((v) => maxX <= 10 || v % Math.ceil(maxX / 10) === 0);
  const stepY = Math.ceil(maxY / 6);
  const ticksY = Array.from({ length: Math.floor(maxY / stepY) + 1 }, (_, i) => i * stepY);
  return (
    <svg viewBox="0 0 320 190" role="img" aria-label={alt} className="w-full max-w-md">
      {ticksY.map((v) => (
        <g key={`y${v}`}>
          <line x1={L} x2={L + W} y1={y(v)} y2={y(v)} stroke={LINE} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill={MUTED} fontFamily="var(--font-opmono)">{v}</text>
        </g>
      ))}
      {ticksX.map((v) => (
        <text key={`x${v}`} x={x(v)} y={B + 16} textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="var(--font-opmono)">{v}</text>
      ))}
      <line x1={L} x2={L} y1={B - H - 6} y2={B} stroke={INK} strokeWidth={1.5} />
      <line x1={L} x2={L + W + 6} y1={B} y2={B} stroke={INK} strokeWidth={1.5} />
      <polyline points={points.map(([a, b]) => `${x(a)},${y(b)}`).join(" ")} fill="none" stroke={tint} strokeWidth={2.5} strokeLinejoin="round" />
      {points.map(([a, b]) => (
        <circle key={`${a}-${b}`} cx={x(a)} cy={y(b)} r={4} fill={tint} />
      ))}
      <text x={L + W / 2} y={184} textAnchor="middle" fontSize="11" fill={INK}>{xLabel}</text>
      <text x={12} y={B - H / 2} textAnchor="middle" fontSize="11" fill={INK} transform={`rotate(-90 12 ${B - H / 2})`}>{yLabel}</text>
    </svg>
  );
}
