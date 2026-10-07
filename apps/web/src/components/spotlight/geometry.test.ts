import { describe, expect, it } from "vitest";
import { angleTo, arrowAt, cornerRadius, edgeAnchor, holePath, intersect, offscreen, placeCallout, ringBox, roomiest } from "./geometry";

const view = { left: 0, top: 0, right: 1440, bottom: 900 };
const size = { w: 320, h: 120 };
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("placeCallout", () => {
  it("goes below a target near the top, centred on it, with the tail at the target", () => {
    const t = { x: 600, y: 100, w: 120, h: 44 };
    const p = placeCallout(t, size, view, { gap: 12 });
    expect(p.side).toBe("bottom");
    expect(p.y).toBe(156);
    expect(p.x + p.tail).toBe(660);
    expect(overlaps(t, { x: p.x, y: p.y, ...size })).toBe(false);
  });

  it("prefers below, but takes the side that keeps the question and the answer field clear", () => {
    const t = { x: 600, y: 460, w: 100, h: 50 };
    expect(placeCallout(t, size, view, { gap: 12 }).side).toBe("bottom");
    const field = { x: 600, y: 530, w: 100, h: 50 };
    expect(placeCallout(t, size, view, { gap: 12, keep: [field] }).side).toBe("top");
    const question = { x: 400, y: 330, w: 640, h: 40 };
    expect(placeCallout(t, size, view, { gap: 12, keep: [field, question] }).side).toBe("right");
  });

  it("goes above when below has no room, beside when neither does, and stays inside the screen", () => {
    expect(placeCallout({ x: 600, y: 800, w: 120, h: 44 }, size, view, { gap: 12 }).side).toBe("top");
    const tall = { x: 40, y: 20, w: 300, h: 860 };
    const p = placeCallout(tall, size, view, { gap: 12 });
    expect(p.side).toBe("right");
    expect(overlaps(tall, { x: p.x, y: p.y, ...size })).toBe(false);
    const edge = placeCallout({ x: 1400, y: 100, w: 30, h: 30 }, size, view, { gap: 12 });
    expect(edge.x + size.w).toBeLessThanOrEqual(1440 - 12);
    expect(edge.tail).toBeLessThanOrEqual(size.w - 18);
  });

  it("beside a drawing, the tail still points at the part that is meant", () => {
    const drawing = { x: 400, y: 100, w: 400, h: 60 };
    const p = placeCallout(drawing, size, view, { gap: 12, aim: { x: 700, y: 130 } });
    expect(p.side).toBe("bottom");
    expect(p.y).toBe(172);
    expect(p.x + p.tail).toBe(700);
  });

  it("at 320px wide still fits the screen", () => {
    const phone = { left: 0, top: 0, right: 320, bottom: 640 };
    const p = placeCallout({ x: 20, y: 80, w: 60, h: 44 }, { w: 288, h: 110 }, phone, { gap: 12 });
    expect(p.x).toBeGreaterThanOrEqual(12);
    expect(p.x + 288).toBeLessThanOrEqual(320);
  });
});

describe("geometry", () => {
  it("knows which way an off-screen target lies, and that a sliver on screen counts as on screen", () => {
    expect(offscreen({ x: 10, y: 1200, w: 100, h: 40 }, view)).toBe("down");
    expect(offscreen({ x: 10, y: -300, w: 100, h: 40 }, view)).toBe("up");
    expect(offscreen({ x: -400, y: 300, w: 100, h: 40 }, view)).toBe("left");
    expect(offscreen({ x: 10, y: 880, w: 100, h: 40 }, view)).toBeNull();
    expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { left: 20, top: 0, right: 30, bottom: 10 })).toBeNull();
    // A tick line is 0 wide: judged on a small box around it, it is on screen.
    expect(offscreen(ringBox({ x: 300, y: 200, w: 0, h: 14 }, 0, 8), view)).toBeNull();
  });

  it("gives tiny targets a ring big enough to see, centred on them", () => {
    const r = ringBox({ x: 100, y: 100, w: 2, h: 10 }, 4, 28);
    expect(r).toEqual({ x: 87, y: 91, w: 28, h: 28 });
  });

  it("reads corner radii, capped at a pill", () => {
    expect(cornerRadius("14px", 200, 60)).toBe(14);
    expect(cornerRadius("9999px", 200, 44)).toBe(22);
    expect(cornerRadius("50%", 40, 40)).toBe(20);
    expect(cornerRadius("", 40, 40)).toBe(0);
  });

  it("aims the arrow at the target from the roomy side", () => {
    const t = { x: 100, y: 100, w: 40, h: 40 };
    expect(roomiest(t, view)).toBe("bottom");
    expect(arrowAt(t, "bottom", 36)).toEqual({ x: 120, y: 162, angle: -90 });
    expect(arrowAt(t, "left", 36).angle).toBe(0);
    expect(angleTo({ x: 0, y: 0 }, { x: 0, y: -10 })).toBe(-90);
  });

  it("anchors the edge button mid-edge and cuts a rounded hole for the dim", () => {
    expect(edgeAnchor("down", view)).toEqual({ x: 720, y: 888 });
    expect(edgeAnchor("left", view)).toEqual({ x: 12, y: 450 });
    const d = holePath(100, 100, { x: 10, y: 10, w: 40, h: 20 }, 8);
    expect(d.startsWith("M0 0H100V100H0Z")).toBe(true);
    expect(d).toContain("A8 8 0 0 1");
  });
});
