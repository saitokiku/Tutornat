import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogueEntry } from "@/catalogue";
import { CourseArt } from "./CourseArt";

describe("CourseArt", () => {
  it("draws the Pythagorean courses from their first picture, the 5 × 5 square of counters", () => {
    for (const id of ["math-pythagorean", "math-pythagorean-es"]) {
      const entry = catalogueEntry(id)!;
      const { container, unmount } = render(<CourseArt lessons={entry.lessons} subject={entry.subject} />);
      // 25 counters, not the sorting cards meant for reading and writing courses.
      expect(container.querySelectorAll("circle"), id).toHaveLength(25);
      expect(container.querySelectorAll("rect"), id).toHaveLength(0);
      unmount();
    }
  });
});
