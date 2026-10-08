import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkCounters, isMarkable } from "@/components/practice/MarkCounters";
import { VisualView } from "@/components/stage/visuals";
import { makeItem } from "../skills";

// The K–2 pictures as drawn: the item's numbers read back from the SVG the learner sees.
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7919 + 5);
const num = (el: Element, a: string) => Number(el.getAttribute(a));

describe("K–2 pictures, rendered", () => {
  it("the ruler draws the thing as one bar from its start mark to its end mark", () => {
    for (const level of [1, 2, 3])
      for (const seed of SEEDS) {
        const it = makeItem("m.measure.ruler", level, seed, "en");
        const v = it.visual!;
        if (v.kind !== "number-line" || !v.span) throw new Error("expected a ruler with a span");
        const { container, unmount } = render(<VisualView visual={v} alt={it.alt!} />);
        // Each labelled tick, by its label: the bar must start and end exactly on the ticks for its ends.
        const tickAt = new Map([...container.querySelectorAll("g")].map((g) => [g.querySelector("text")!.textContent, num(g.querySelector("line")!, "x1")]));
        const bars = container.querySelectorAll("rect");
        expect(bars.length).toBe(1);
        const [s, end] = v.span;
        expect(num(bars[0], "x")).toBeCloseTo(tickAt.get(String(s))!, 6);
        expect(num(bars[0], "x") + num(bars[0], "width")).toBeCloseTo(tickAt.get(String(end))!, 6);
        unmount();
      }
  });

  it("an unequal cut is drawn with unequal parts, an equal cut with equal ones", () => {
    let unequal = 0;
    for (const id of ["m.shares.halves", "m.shares.thirds"])
      for (const level of [1, 2])
        for (const seed of SEEDS) {
          const it = makeItem(id, level, seed, "en");
          const v = it.visual;
          if (v?.kind !== "fraction") continue;
          const { container, unmount } = render(<VisualView visual={v} alt={it.alt!} />);
          const widths = [...container.querySelectorAll("rect")].map((r) => num(r, "width"));
          expect(widths.length).toBe(v.parts);
          const sizes = v.sizes ?? Array<number>(v.parts).fill(1);
          // Widths in the same proportion as the sizes asked for.
          for (let i = 1; i < widths.length; i++) expect(widths[i] / widths[0]).toBeCloseTo(sizes[i] / sizes[0], 6);
          if (v.sizes) unequal++;
          unmount();
        }
    expect(unequal).toBeGreaterThan(5);
  });

  it("each named group is drawn with its label under it, in the plain picture and in tap-to-mark counters", () => {
    for (const [id, level] of [["m.compare.groups", 1], ["m.data.picture", 1], ["m.data.picture", 3]] as const)
      for (const seed of SEEDS.slice(0, 10)) {
        const it = makeItem(id, level, seed, "en");
        const v = it.visual!;
        if (v.kind !== "dots" || !v.labels || !isMarkable(v)) throw new Error(`${id}: expected labelled dots`);
        for (const view of [<VisualView key="plain" visual={v} alt={it.alt!} />, <MarkCounters key="marked" visual={v} alt={it.alt!} young />]) {
          const { container, unmount } = render(view);
          const texts = [...container.querySelectorAll("svg text")];
          expect(texts.map((t) => t.textContent)).toEqual(v.labels);
          // Every label sits below every counter of its own group.
          const circles = [...container.querySelectorAll("svg circle")];
          expect(circles.length).toBe(v.groups.reduce((a, b) => a + b, 0));
          let k = 0;
          v.groups.forEach((n, g) => {
            const mine = circles.slice(k, (k += n));
            const lowest = Math.max(...mine.map((c) => num(c, "cy") + num(c, "r")));
            const [minX, maxX] = [Math.min(...mine.map((c) => num(c, "cx"))), Math.max(...mine.map((c) => num(c, "cx")))];
            const label = texts[g];
            expect(num(label, "y")).toBeGreaterThan(lowest);
            expect(num(label, "x")).toBeGreaterThanOrEqual(minX - 1e-6);
            expect(num(label, "x")).toBeLessThanOrEqual(maxX + 1e-6);
          });
          unmount();
        }
      }
  });
});
