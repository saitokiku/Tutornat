import { barView, edgeBars, seenView } from "@/lib/spotlight";
import { angleTo, arrowAt, cornerRadius, dockSide, edgeAnchor, holePath, offscreen, placeCallout, ringBox, ringClip, roomiest, toBox, type Box, type Dir, type Placed, type Side, type View } from "./geometry";

// Reads the page for the spotlight layer: where the target is, what covers the screen edges (a
// sticky header, the phone tab bar, a sheet, the keyboard), how high the target sits in the stacking
// order. One measure() per animation frame while something moves.

/** 6px clear of the target, so the ring never touches the app's 2px focus outline (offset 2px). */
export const RING_PAD = 6;
export const RING_MIN = 28;
export const ARROW = 36;
/** How far the ring's glow reaches past its box; the clip leaves this much room where nothing is in the way. */
const GLOW = 32;
const DOCK_GAP = 12;

/** The highest z-index among the target's positioned ancestors: the ring sits just above it, under anything covering it. */
export function stackZ(el: Element): number {
  let z = 0;
  for (let n: Element | null = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.position !== "static" && cs.zIndex !== "auto") z = Math.max(z, Number(cs.zIndex) || 0);
  }
  return z;
}

function radiusOf(el: Element, w: number, h: number): number {
  if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return /^(circle|ellipse)$/.test(el.localName) ? Math.min(w, h) / 2 : 6;
  return cornerRadius(getComputedStyle(el).borderTopLeftRadius || "0", w, h);
}

export const bandAt = (el: Element) => el.closest("[data-band]")?.getAttribute("data-band") ?? undefined;

export type Geo = {
  vw: number;
  vh: number;
  /** The target is off screen (or scrolled out of its panel) in this direction. */
  off: Dir | null;
  ring: Box & { r: number };
  /** The ring's clip-path (see ringClip). */
  clip: string;
  z: number;
  edge: { x: number; y: number } | null;
  callout: Placed | null;
  dock: { at: "top" | "bottom"; inset: number; angle: number } | null;
  arrow: { x: number; y: number; angle: number } | null;
  hole: string | null;
};

export type Measure = {
  target: Element;
  layer: Element | null;
  callout: HTMLElement | null;
  hasCallout: boolean;
  cue: "glow" | "point";
  dim: boolean;
  phone: boolean;
  z: number;
};

function outermostSvg(el: SVGElement): SVGSVGElement | null {
  let svg = el.ownerSVGElement;
  while (svg?.ownerSVGElement) svg = svg.ownerSVGElement;
  return svg;
}

const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** What the floating caption should not cover: the question and headings, answer fields, whatever has focus. */
const KEEP = 'h1, h2, h3, [role="heading"], input:not([type="hidden"]), textarea, select';
/** What the phone bar should not cover: fields (the chat box, the answer) and whatever has focus. */
const KEEP_PHONE = 'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]';

/** Boxes on screen for these elements, plus the focused one; never the target's own parts or the layer. */
function keepClear(selector: string, target: Element, layer: Element | null, vh: number): Box[] {
  const a = document.activeElement;
  const els = [...Array.from(document.querySelectorAll(selector)), ...(a && a !== document.body ? [a] : [])];
  const out: Box[] = [];
  for (const el of els) {
    if (layer?.contains(el) || el.contains(target) || target.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height > 0 && r.bottom > 0 && r.top < vh) out.push(toBox(r));
  }
  return out;
}

/** The edge indicator sits on the edge of the panel the target scrolled out of, or of the screen if that panel is gone too. */
function edgeView(clip: View, screen: View): View {
  const v = { left: Math.max(screen.left, clip.left), right: Math.min(screen.right, clip.right), top: Math.max(screen.top, clip.top), bottom: Math.min(screen.bottom, clip.bottom) };
  return v.right - v.left < 120 || v.bottom - v.top < 96 ? screen : v;
}

/** Everything the layer draws, from one read of the page. Null when the target has no size (not laid out). */
export function measure(m: Measure): Geo | null {
  const raw = m.target.getBoundingClientRect();
  if (raw.width <= 0 && raw.height <= 0) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const t = toBox(raw);
  const bars = edgeBars();
  // The screen less the bars the target is not part of, and where the target can be seen inside that.
  const screen: View = barView(m.target, bars);
  const clip: View = seenView(m.target, bars);
  // Judged on at least 8×8 around its centre, so a 0-wide tick line still counts as on screen.
  const off = offscreen(ringBox(t, 0, 8), clip);
  // Kept 2px inside the screen, so a tab in the bottom bar or a button at the edge gets its whole ring.
  const rb = ringBox(t, RING_PAD, RING_MIN);
  const x1 = Math.max(rb.x, 2), y1 = Math.max(rb.y, 2), x2 = Math.min(rb.x + rb.w, vw - 2), y2 = Math.min(rb.y + rb.h, vh - 2);
  const r = x2 - x1 >= RING_MIN / 2 && y2 - y1 >= RING_MIN / 2 ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : rb;
  const ring = { ...r, r: radiusOf(m.target, raw.width, raw.height) + RING_PAD };
  const size = { w: m.callout?.offsetWidth ?? 0, h: m.callout?.offsetHeight ?? 0 };

  let callout: Placed | null = null;
  let dock: Geo["dock"] = null;
  if (m.hasCallout && m.phone) {
    // Docked in the free band: below any top bar, above the tab bar, a sheet, or the on-screen keyboard
    // (the visual viewport ends where the keyboard starts; position: fixed goes by the layout viewport).
    const vv = window.visualViewport;
    const top = Math.max(bars.top?.edge ?? 0, vv ? vv.offsetTop : 0);
    const bottom = Math.min(bars.bottom?.edge ?? vh, vv ? vv.offsetTop + vv.height : vh);
    const at = dockSide(off ? null : r, size.h, top, bottom, keepClear(KEEP_PHONE, m.target, m.layer, vh), DOCK_GAP);
    const barY = at === "bottom" ? bottom - DOCK_GAP - size.h / 2 : top + DOCK_GAP + size.h / 2;
    dock = { at, inset: at === "bottom" ? vh - bottom + DOCK_GAP : top + DOCK_GAP, angle: angleTo({ x: vw / 2, y: barY }, { x: r.x + r.w / 2, y: r.y + r.h / 2 }) };
  } else if (m.hasCallout && !off) {
    // A part of a drawing (a tick, a bar): the caption sits outside the whole drawing so none of it is hidden.
    const svg = m.target instanceof SVGElement && !(m.target instanceof SVGSVGElement) ? outermostSvg(m.target) : null;
    const d = svg ? toBox(svg.getBoundingClientRect()) : null;
    const anchor = d && d.w * d.h < vw * vh * 0.5 ? union(d, r) : r;
    callout = placeCallout(anchor, size, screen, { gap: m.cue === "point" ? ARROW + 10 : 12, keep: keepClear(KEEP, m.target, m.layer, vh), aim: { x: r.x + r.w / 2, y: r.y + r.h / 2 } });
  }

  const arrowSide: Side = callout?.side ?? roomiest(r, screen);
  return {
    vw,
    vh,
    off,
    ring,
    clip: ringClip(r, t, clip, screen, GLOW),
    z: Math.max(25, m.z + 1),
    edge: off ? edgeAnchor(off, edgeView(clip, screen)) : null,
    callout,
    dock,
    arrow: m.cue === "point" && !off ? arrowAt(r, arrowSide, ARROW) : null,
    hole: m.dim && !off ? holePath(vw, vh, r, ring.r) : null,
  };
}
