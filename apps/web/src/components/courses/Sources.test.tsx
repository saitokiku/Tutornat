import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sourceLine } from "@/components/generation/steps";
import { t } from "@/i18n";
import { read, resetMemory } from "@/lib/store";
import type { Course, Profile } from "@/lib/types";
import { Catalogue } from "./Catalogue";
import { OriginBadge } from "./Origin";
import { CoursePractice, CourseSources } from "./Sources";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => (resetMemory(), push.mockReset()));

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const course: Course = {
  id: "c1",
  profileId: "p1",
  title: "Volcanoes",
  goal: "volcanoes",
  subject: "science",
  grade: "4",
  locale: "en",
  origin: "generated",
  status: "ready",
  length: "short",
  sources: [],
  lessons: [],
  template: false,
  citations: [
    { title: "Volcano", url: "https://en.wikipedia.org/wiki/Volcano", source: "Wikipedia" },
    { title: "magma", url: "https://en.wiktionary.org/wiki/magma", source: "Wiktionary" },
    { title: "Volcanoes, Seymour Simon (1988)", url: "https://openlibrary.org/works/OL1W", source: "Open Library" },
    { title: "CK-12 science and math", url: "https://www.ck12.org/", source: "CK-12 Foundation" },
  ],
  createdAt: 0,
  updatedAt: 0,
};

describe("CourseSources", () => {
  it("links every source, grouped, credits Wikipedia's licence, and says the links open a new tab", () => {
    render(<CourseSources course={course} />);
    const wiki = screen.getByRole("link", { name: /^Volcano\s+\(opens in a new tab\)$/ });
    expect(wiki).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Volcano");
    expect(wiki).toHaveAttribute("target", "_blank");
    expect(wiki).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("The overview quotes the opening of the article as written.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^License: CC BY-SA 4.0/ })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
    expect(screen.getByRole("heading", { name: "Definitions from Wiktionary, through Datamuse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^magma/ })).toHaveAttribute("href", "https://en.wiktionary.org/wiki/magma");
    expect(screen.getByRole("link", { name: /^Volcanoes, Seymour Simon/ })).toHaveAttribute("href", "https://openlibrary.org/works/OL1W");
    expect(screen.getByText("CK-12 Foundation")).toBeInTheDocument();
  });

  it("shows nothing for a course without citations", () => {
    const { container } = render(<CourseSources course={{ ...course, citations: undefined }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("OriginBadge", () => {
  it("names all three origins, and a template", () => {
    const { rerender } = render(<OriginBadge course={course} />);
    expect(screen.getByText("Built from Wikipedia and real sources")).toBeInTheDocument();
    rerender(<OriginBadge course={{ ...course, citations: [] }} />);
    expect(screen.getByText("Built from real sources")).toBeInTheDocument();
    rerender(<OriginBadge course={{ origin: "catalogue" }} />);
    expect(screen.getByText("Written by people")).toBeInTheDocument();
    rerender(<OriginBadge course={{ origin: "generated", ai: true }} />);
    expect(screen.getByText("Written by AI")).toBeInTheDocument();
    rerender(<OriginBadge course={{ origin: "generated" }} />);
    expect(screen.getByText("Template outline")).toBeInTheDocument();
  });
});

describe("CoursePractice", () => {
  it("lists the skills that fit, nearest the learner's grade first, with status, draft label and a way to practice", async () => {
    render(<CoursePractice course={course} learner={learner} />);
    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("Rocks, fossils and erosion")).toBeInTheDocument();
    expect(within(rows[0]).queryByText(/Usually taught in/)).toBeNull();
    // Plate boundaries is a grade 7 skill: still offered, and labelled with its grade.
    const row = screen.getByText("Plate boundaries").closest("li")!;
    expect(within(row).getByText("Usually taught in Grade 7")).toBeInTheDocument();
    expect(within(row).getByText("Not started")).toBeInTheDocument();
    expect(within(row).getByText("Draft questions")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Practice Plate boundaries" }));
    const set = read().sets[0];
    expect(set).toMatchObject({ kind: "pick", skillId: "s.plate.tectonics", profileId: "p1" });
    expect(push).toHaveBeenCalledWith(`/practice/${set.id}`);
  });

  it("shows nothing when no skill fits", () => {
    const { container } = render(<CoursePractice course={{ ...course, goal: "knitting", subject: "other", citations: [] }} learner={learner} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Catalogue", () => {
  it("adds a course from the keyboard and keeps focus on its new Open link", async () => {
    render(<Catalogue learner={learner} />);
    const add = screen.getAllByRole("button", { name: "Add" })[0];
    add.focus();
    await userEvent.keyboard("{Enter}");
    const added = read().courses[0];
    const open = await screen.findByRole("link", { name: "Open" });
    expect(open).toHaveAttribute("href", `/courses/${added.id}`);
    await vi.waitFor(() => expect(open).toHaveFocus());
  });
});

describe("sourceLine", () => {
  const say = (s: Parameters<typeof sourceLine>[0], locale: "en" | "es" = "en") => {
    const l = sourceLine(s, "volcanoes", locale);
    return [t(locale, l.key, l.vars), l.tone];
  };
  it("says what was found, what wasn't, and why", () => {
    expect(say({ part: "article", title: "Volcano" })).toEqual(["Found Wikipedia's article “Volcano”", "found"]);
    expect(say({ part: "article", title: "Volcano", withheld: true })).toEqual(["Left out Wikipedia's article “Volcano”: it covers things that aren't for children", "none"]);
    expect(say({ part: "article" })).toEqual(["Wikipedia has no article that matches “volcanoes”", "none"]);
    expect(say({ part: "article", failed: "offline" })).toEqual(["Couldn't reach Wikipedia: this device seems to be offline", "failed"]);
    expect(say({ part: "terms", count: 1 })).toEqual(["Found 1 key word with a definition", "found"]);
    expect(say({ part: "terms", count: 0, englishOnly: true })[0]).toMatch(/English only/);
    expect(say({ part: "terms", count: 0, failed: "unavailable" })).toEqual(["Datamuse didn't answer just now", "failed"]);
    expect(say({ part: "lesson", titles: [] })).toEqual(["No ready-made lesson is close enough to add", "none"]);
    expect(say({ part: "lesson", titles: ["Melting and freezing"] })).toEqual(["Added the ready-made lesson “Melting and freezing”", "found"]);
    expect(say({ part: "lesson", titles: ["A", "B"] })[0]).toBe("Added the ready-made lessons “A” and “B”");
    expect(say({ part: "lesson", titles: ["A", "B"] }, "es")[0]).toBe("Se agregaron las lecciones listas “A” y “B”");
    expect(say({ part: "lesson", titles: ["A"], leftOut: true })).toEqual(["Left out the ready-made lesson “A”: it's a whole lesson, and this course is one sitting", "none"]);
    expect(say({ part: "practice", skills: ["Rocks, fossils and erosion"], questions: 3 })).toEqual(["Added questions from the skill map: Rocks, fossils and erosion", "found"]);
    expect(say({ part: "practice", skills: ["Plate boundaries"], questions: 0 })[0]).toBe("Matched the skill map: Plate boundaries. Practice it from the course page.");
    expect(say({ part: "practice", skills: ["Plate boundaries"], questions: 0, grade: "7" })).toEqual([
      "The closest skill on the map, Plate boundaries, is usually taught in Grade 7, so its questions aren't in the lessons. It's on the course page.",
      "none",
    ]);
    expect(say({ part: "practice", skills: [], questions: 0 })[1]).toBe("none");
    expect(say({ part: "books", count: 3 })[0]).toBe("Found 3 children's books to borrow");
    expect(say({ part: "books", count: 0 })[0]).toBe("No children's books found to borrow");
  });
});
