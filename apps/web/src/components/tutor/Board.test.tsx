import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { read } from "@/lib/store";
import type { BoardCard } from "@/lib/tutor";
import type { Profile } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import { Board, CardView } from "./Board";

// Every card on the tutor's board names where it came from and links there; the lesson and the date
// it offers are one tap away.

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const learner = (over: Partial<Profile> = {}): Profile => ({ id: "p1", accountId: "a1", nickname: "Ada", grade: "8", locale: "en", color: "#000", createdAt: 0, ...over });
const card = (c: BoardCard, p = learner()) => render(<CardView card={c} learner={p} />);
const newTab = (link: HTMLElement) => {
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  expect(link).toHaveTextContent("(opens in a new tab)");
};

beforeEach(() => push.mockReset());

describe("knowledge cards carry their source", () => {
  it("a Wikipedia extract: quoted as written, licensed, linked, marked with its own language", () => {
    card({ type: "fact", title: "Falacia", extract: "Una falacia es un argumento que parece válido.", url: "https://es.wikipedia.org/wiki/Falacia", lang: "es" }, learner({ locale: "es" }));
    const article = screen.getByRole("article", { name: "Falacia" });
    expect(within(article).getByText("Una falacia es un argumento que parece válido.").closest("blockquote")).toHaveAttribute("lang", "es");
    expect(within(article).getByText("Text from Wikipedia, CC BY-SA 4.0")).toBeInTheDocument();
    const link = within(article).getByRole("link", { name: /Read the article/ });
    expect(link).toHaveAttribute("href", "https://es.wikipedia.org/wiki/Falacia");
    newTab(link);
  });

  it("a definition, a poem and a standard each link to their source", () => {
    card({ type: "definition", word: "denominator", senses: [{ partOfSpeech: "noun", text: "The number below the line in a fraction." }], url: "https://en.wiktionary.org/wiki/denominator" });
    newTab(screen.getByRole("link", { name: /Wiktionary, through Datamuse/ }));
    card({ type: "poem", title: "Hope is the thing with feathers", author: "Emily Dickinson", lines: ["Hope is the thing with feathers", "That perches in the soul"], url: "https://poetrydb.org/title/Hope" });
    const poem = screen.getByRole("article", { name: "Hope is the thing with feathers" });
    expect(within(poem).getByText("by Emily Dickinson")).toBeInTheDocument();
    expect(within(poem).getByRole("link", { name: /Public domain, from PoetryDB/ })).toHaveAttribute("href", "https://poetrydb.org/title/Hope");
    card({ type: "standard", code: "4.NF.A.1", text: "Explain why a fraction a/b is equivalent to a fraction (n × a)/(n × b).", subject: "Mathematics", url: "https://www.thecorestandards.org/Math/Content/4/NF/A/1/" });
    expect(within(screen.getByRole("article", { name: "Standard 4.NF.A.1" })).getByRole("link", { name: /Common Core State Standards/ })).toHaveAttribute("href", "https://www.thecorestandards.org/Math/Content/4/NF/A/1/");
  });

  it("books say where to borrow, read or listen", () => {
    card({
      type: "books",
      topic: "spiders",
      list: [
        { title: "Charlotte's Web", author: "E. B. White", year: 1952, url: "https://openlibrary.org/works/OL483391W", source: "Open Library", kind: "borrow" },
        { title: "The Secret Garden", url: "https://librivox.org/the-secret-garden", source: "LibriVox", kind: "audio" },
      ],
    });
    const books = screen.getByRole("article", { name: "Books about spiders" });
    const [first, second] = within(books).getAllByRole("link");
    expect(first).toHaveAttribute("href", "https://openlibrary.org/works/OL483391W");
    expect(first).toHaveTextContent("by E. B. White · 1952 · Open Library: Borrow or read");
    expect(second).toHaveTextContent("LibriVox: Listen");
  });
});

describe("one tap to what the tutor offers", () => {
  it("opens our lesson from its key points, adding the course once", async () => {
    const user = userEvent.setup();
    card({ type: "lesson", catalogueId: "english-rhetoric", courseTitle: "Rhetoric", lessonId: "misused-appeals", lessonTitle: "When appeals mislead", points: ["False authority"] });
    const lesson = screen.getByRole("article", { name: "When appeals mislead" });
    expect(within(lesson).getByText("False authority")).toBeInTheDocument();
    await user.click(within(lesson).getByRole("button", { name: "Open the lesson" }));
    await user.click(within(lesson).getByRole("button", { name: "Open the lesson" }));
    const courses = read().courses.filter((c) => c.catalogueId === "english-rhetoric" && c.profileId === "p1");
    expect(courses).toHaveLength(1);
    expect(push).toHaveBeenLastCalledWith(`/learn/${courses[0].id}/misused-appeals`);
  });

  it("a date with no day opens the calendar's add form for that kind", () => {
    card({ type: "calendar", key: "q", title: "Spelling quiz", kind: "quiz" });
    expect(screen.getByRole("link", { name: "Add it with the date" })).toHaveAttribute("href", "/calendar?add=quiz");
    card({ type: "calendar", key: "e", title: "Science fair", kind: "event" });
    expect(screen.getAllByRole("link", { name: "Add it with the date" })[1]).toHaveAttribute("href", "/calendar?add=other");
  });

  it("a worked example shows the picture a pre-reader needs, described", () => {
    const item = makeItem("e.letter.sounds", 1, 42, "en");
    card({ type: "worked", item }, learner({ grade: "K" }));
    expect(item.picture).toBeTruthy();
    expect(screen.getByRole("img", { name: item.alt })).toHaveTextContent(item.picture!);
    for (const step of item.steps) expect(screen.getByText(step)).toBeInTheDocument();
  });
});

describe("the board", () => {
  it("says what will appear before anything has", () => {
    render(<Board items={[]} learner={learner()} open onToggle={() => {}} />);
    expect(screen.getByRole("region", { name: "Board" })).toHaveTextContent("Pictures, worked examples and practice the tutor shares show up here.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
