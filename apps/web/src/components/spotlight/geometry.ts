// Placement math for the spotlight, pure so it can be tested without a browser. Coordinates are
// viewport pixels (what getBoundingClientRect returns and position: fixed uses).

export type Box = { x: number; y: number; w: number; h: number };
export type View = { left: number; top: number; right: number; bottom: number };
export type Side = "top" | "bottom" | "left" | "right";
export type Dir = "up" | "down" | "left" | "right";

export const toBox = (r: { left: number; top: number; width: number; height: number }): Box => ({ x: r.left, y: r.top, w: r.width, h: r.height });

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export function intersect(b: Box, v: View): Box | null {
  const x = Math.max(b.x, v.left), y = Math.max(b.y, v.top);
  const w = Math.min(b.x + b.w, v.right) - x, h = Math.min(b.y + b.h, v.bottom) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

/** Null while at least a sliver (4px each way) is visible, else which way the target lies. */
export function offscreen(b: Box, v: View): Dir | null {
  const seen = intersect(b, v);
  if (seen && seen.w >= 4 && seen.h >= 4) return null;
  const away: [Dir, number][] = [
    ["up", v.top - (b.y + b.h)],
    ["down", b.y - v.bottom],
    ["left", v.left - (b.x + b.w)],
    ["right", b.x - v.right],
  ];
  return away.reduce((a, c) => (c[1] > a[1] ? c : a))[0];
}

/** The ring's box: the target plus a gap, never smaller than `min` (a tick on a number line still gets a visible ring). */
export function ringBox(b: Box, pad: number, min: number): Box {
  const w = Math.max(b.w + pad * 2, min), h = Math.max(b.h + pad * 2, min);
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
}

/** A CSS border-radius ("14px", "50%", "9999px") as pixels for a w×h box, capped at a pill. */
export function cornerRadius(css: string, w: number, h: number): number {
  const v = parseFloat(css);
  if (!Number.isFinite(v)) return 0;
  const px = css.trim().endsWith("%") ? (v / 100) * Math.min(w, h) : v;
  return Math.min(px, Math.min(w, h) / 2);
}

export type Placed = { side: Side; x: number; y: number; tail: number };

const ORDER: Side[] = ["bottom", "top", "right", "left"];

/** Overlapping area of two boxes, 0 when apart. */
export const overlapArea = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

export type PlaceOptions = {
  /** Space between the target and the callout (more for the arrow cue). */
  gap: number;
  /** What it should not cover: the question, headings, the field being typed in. */
  keep?: Box[];
  /** Where the tail points, when the callout sits beside a bigger box (a drawing) than the part meant. */
  aim?: { x: number; y: number };
  margin?: number;
};

/**
 * Where the callout goes, beside `t`. Of the sides where it fits, the one that covers least of
 * `keep`; on a tie below, then above, then beside. When no side fits, the side with most room. It never
 * covers the target unless no side can hold it.
 */
export function placeCallout(t: Box, size: { w: number; h: number }, v: View, { gap, keep = [], aim, margin = 12 }: PlaceOptions): Placed {
  const room: Record<Side, number> = {
    bottom: v.bottom - (t.y + t.h) - gap - size.h - margin,
    top: t.y - v.top - gap - size.h - margin,
    right: v.right - (t.x + t.w) - gap - size.w - margin,
    left: t.x - v.left - gap - size.w - margin,
  };
  const ax = aim?.x ?? t.x + t.w / 2, ay = aim?.y ?? t.y + t.h / 2;
  const minX = v.left + margin, maxX = v.right - margin - size.w;
  const minY = v.top + margin, maxY = v.bottom - margin - size.h;
  const at = (side: Side): Placed => {
    if (side === "bottom" || side === "top") {
      const x = clamp(ax - size.w / 2, minX, maxX);
      const y = clamp(side === "bottom" ? t.y + t.h + gap : t.y - gap - size.h, minY, maxY);
      return { side, x, y, tail: clamp(ax - x, 18, size.w - 18) };
    }
    const y = clamp(ay - size.h / 2, minY, maxY);
    const x = clamp(side === "right" ? t.x + t.w + gap : t.x - gap - size.w, minX, maxX);
    return { side, x, y, tail: clamp(ay - y, 18, size.h - 18) };
  };
  const covered = (p: Placed) => keep.reduce((n, k) => n + overlapArea({ x: p.x, y: p.y, w: size.w, h: size.h }, k), 0);
  const fits = ORDER.filter((s) => room[s] >= 0).map((s) => ({ p: at(s), cost: 0 }));
  for (const f of fits) f.cost = covered(f.p);
  // A stable sort keeps the preferred order among equally clear sides.
  const best = fits.sort((a, b) => a.cost - b.cost)[0]?.p;
  return best ?? at([...ORDER].sort((a, b) => room[b] - room[a])[0]);
}

/** The side with most room for a pointing arrow when there is no callout to follow. */
export function roomiest(t: Box, v: View): Side {
  const room: Record<Side, number> = { bottom: v.bottom - (t.y + t.h), top: t.y - v.top, right: v.right - (t.x + t.w), left: t.x - v.left };
  if (Math.max(room.bottom, room.top) >= 56) return room.bottom >= room.top ? "bottom" : "top";
  return (Object.keys(room) as Side[]).sort((a, b) => room[b] - room[a])[0];
}

/** The pointing arrow: its centre and angle (0 = pointing right), tip `gap` px off the ring on `side`. */
export function arrowAt(t: Box, side: Side, len: number, gap = 4): { x: number; y: number; angle: number } {
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2, d = gap + len / 2;
  if (side === "bottom") return { x: cx, y: t.y + t.h + d, angle: -90 };
  if (side === "top") return { x: cx, y: t.y - d, angle: 90 };
  if (side === "right") return { x: t.x + t.w + d, y: cy, angle: 180 };
  return { x: t.x - d, y: cy, angle: 0 };
}

/** Anchor for the edge indicator inside `v`: the middle of the edge the target lies beyond. */
export function edgeAnchor(dir: Dir, v: View, margin = 12): { x: number; y: number } {
  const mx = (v.left + v.right) / 2, my = (v.top + v.bottom) / 2;
  if (dir === "up") return { x: mx, y: v.top + margin };
  if (dir === "down") return { x: mx, y: v.bottom - margin };
  if (dir === "left") return { x: v.left + margin, y: my };
  return { x: v.right - margin, y: my };
}

/** Degrees from one point to another, 0 = right, 90 = down (CSS rotate). */
export function angleTo(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return Math.round((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI);
}

/** Does a docked bar from y to y+h (with a little air) overlap the target? */
export const overlapsBand = (t: Box, y: number, h: number, air = 8) => t.y < y + h + air && t.y + t.h > y - air;

/**
 * Where the phone caption bar docks inside the free band [top, bottom] (below the header, above the tab
 * bar, a sheet or the keyboard): at the bottom, unless it would sit on the target or on a field (the chat
 * box, the answer) and the top is clearer; at the top when the band is too short to hold it.
 */
export function dockSide(target: Box | null, h: number, top: number, bottom: number, keep: Box[], gap: number): "top" | "bottom" {
  const low = bottom - gap - h, high = top + gap;
  if (low < high) return "top";
  const cost = (y: number) => (target && overlapsBand(target, y, h) ? 1000 : 0) + keep.filter((k) => overlapsBand(k, y, h, 0)).length;
  return cost(low) <= cost(high) ? "bottom" : "top";
}

/**
 * The ring's clip-path. On a side where the target itself is cut (scrolled under the sticky header, the
 * tab bar, or out of its panel) the ring is cut at that same edge, so it disappears with its target. On
 * other sides the glow may spill `glow` px, but never over a bar (`bars`: the screen less its bars).
 */
export function ringClip(ring: Box, t: Box, seen: View, bars: View, glow: number): string {
  const top = t.y < seen.top ? seen.top : bars.top;
  const bottom = t.y + t.h > seen.bottom ? seen.bottom : bars.bottom;
  const left = t.x < seen.left ? seen.left : bars.left;
  const right = t.x + t.w > seen.right ? seen.right : bars.right;
  const px = (n: number) => `${Math.round(Math.max(-glow, n))}px`;
  return `inset(${px(top - ring.y)} ${px(ring.x + ring.w - right)} ${px(ring.y + ring.h - bottom)} ${px(left - ring.x)})`;
}

/** A full-screen path with a rounded hole over b (even-odd fill), for the walkthrough dim. */
export function holePath(vw: number, vh: number, b: Box, radius: number): string {
  const r = Math.max(0, Math.min(radius, b.w / 2, b.h / 2));
  const { x, y, w, h } = b;
  const f = (n: number) => Math.round(n * 10) / 10;
  return (
    `M0 0H${f(vw)}V${f(vh)}H0Z` +
    `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}` +
    `H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`
  );
}
