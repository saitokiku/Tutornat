import { vi } from "vitest";

/**
 * Test helper. jsdom does no layout, so every box is zero and nothing would count as shown. This gives
 * every element a box: data-rect="x y w h" sets it, "0 0 0 0" means not laid out, default 10 10 100 40.
 */
export function fakeLayout() {
  return vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const [x, y, w, h] = (this.getAttribute("data-rect") ?? "10 10 100 40").split(/\s+/).map(Number);
    return { x, y, width: w, height: h, left: x, top: y, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect;
  });
}

/** matchMedia (jsdom has none) answering true for queries containing any of `on`. Returns the undo. */
export function mockMedia(...on: string[]) {
  const prev = window.matchMedia;
  window.matchMedia = ((q: string) => ({ matches: on.some((s) => q.includes(s)), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = prev;
  };
}
