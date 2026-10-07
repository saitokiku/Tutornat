import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Book, Definition, WikiSummary } from "@/knowledge";
import { courseOrigin, createDraft } from "@/lib/courses";
import { SourceError, type Fetchers } from "@/lib/source-course";
import { read, resetMemory, update } from "@/lib/store";
import type { Course, CourseLength, GenerationEvent, Lesson, Profile } from "@/lib/types";
import { Draft } from "./Draft";

// The course builder screen: which way it builds (sources in demo mode, the AI writer when connected,
// sources again when the writer's lessons fail its gates), what it says when something is missing,
// and what it saves. The AI writer and the knowledge API are fakes; nothing leaves the test.

const nav = vi.hoisted(() => ({ params: { draftId: "" }, push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams("fresh=1"),
}));
const ai = vi.hoisted(() => ({ mode: "demo" as "demo" | "anthropic" }));
vi.mock("@/lib/ai/client", () => ({ aiStatus: () => Promise.resolve(ai.mode) }));
const writer = vi.hoisted(() => ({ events: [] as GenerationEvent[], asked: [] as boolean[] }));
vi.mock("@/lib/generate", async (orig) => ({
  ...(await orig<typeof import("@/lib/generate")>()),
  generateOutline: async function* (_req: unknown, _signal: AbortSignal, _pace?: number, withAi = false) {
    writer.asked.push(withAi);
    for (const e of writer.events) yield e;
  },
}));

const VOLCANO: WikiSummary = {
  title: "Volcano",
  extract: "A volcano is an opening in the ground where melted rock comes out. Melted rock below the ground is called magma. When it reaches the surface it is called lava.",
  url: "https://en.wikipedia.org/wiki/Volcano",
  lang: "en",
  license: "CC BY-SA 4.0",
};
const DICTIONARY: Record<string, Definition[]> = {
  volcano: [{ word: "volcano", partOfSpeech: "noun", text: "An opening in the ground through which magma and gases come out." }],
  lava: [{ word: "lava", partOfSpeech: "noun", text: "Molten rock that has come out onto the surface." }],
  magma: [{ word: "magma", partOfSpeech: "noun", text: "Molten rock found below the surface of the Earth." }],
};
const BOOKS: Book[] = [{ title: "Volcanoes", author: "Seymour Simon", year: 1988, url: "https://openlibrary.org/works/OL1W", source: "Open Library", kind: "borrow" }];

function sources(over: Partial<Fetchers> = {}) {
  const asked: string[] = [];
  const f: Fetchers = {
    wiki: async (q) => (asked.push(q), /volcan/i.test(q) ? VOLCANO : null),
    related: async (w) => (asked.push(w), ["lava", "magma"]),
    define: async (w) => (asked.push(w), DICTIONARY[w] ?? []),
    books: async (q) => (asked.push(q), /volcan/i.test(q) ? BOOKS : []),
    ...over,
  };
  return { f, asked };
}
const offline = () => {
  const fail = vi.fn(async () => {
    throw new SourceError("offline");
  });
  return { wiki: fail, related: fail, define: fail, books: fail } as Fetchers;
};

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const lesson = (id: string, title: string): Lesson => ({ id, title, summary: "", minutes: 5, scenes: [{ id: "s1", kind: "slide", title, blocks: [{ type: "text", text: title }] }] });

beforeEach(() => {
  update((s) => {
    s.accounts.push({ id: "a1", email: "m@example.test", displayName: "Maria Lopez", salt: "", passwordHash: "", createdAt: 0 });
    s.profiles.push(learner);
    s.session = { accountId: "a1", profileId: "p1" };
  });
  ai.mode = "demo";
  writer.events = [];
  writer.asked = [];
});
afterEach(() => (resetMemory(), nav.push.mockReset(), nav.replace.mockReset()));

/** A request from the magic box, then the builder opened on it. */
function open(goal: string, f: Fetchers, length: CourseLength = "short") {
  const draft = createDraft({ goal, grade: learner.grade, subject: "science", length, locale: "en", sources: [] }, learner.id);
  nav.params = { draftId: draft.id };
  render(<Draft fetchers={f} />);
  return draft.id;
}
const saved = (id: string) => read().courses.find((c) => c.id === id) as Course;
const log = () => within(screen.getByRole("region", { name: "Building your course" })).getAllByRole("listitem").map((li) => li.textContent);

describe("Draft: demo mode builds from real sources", () => {
  it("says what each source gave, labels it, keeps every name on the account at home, and creates it from the keyboard", async () => {
    const { f, asked } = sources();
    const id = open("Ada and Maria want to learn about volcanoes", f);
    await screen.findByRole("button", { name: /Create course/ });
    expect(log().join("\n")).toMatch(/Found Wikipedia's article “Volcano”[\s\S]*Found 3 key words with definitions[\s\S]*Found 1 children's book to borrow/);
    expect(asked.join(" ")).not.toMatch(/ada|maria|lopez/i);
    expect(writer.asked).toEqual([]); // no template, no writer
    expect(screen.getByText("Built from Wikipedia and real sources")).toBeInTheDocument();
    expect(screen.getByText(/^Built without AI from Wikipedia, Wiktionary \(through Datamuse\), .*Open Library.* The links are on the course page\.$/)).toBeInTheDocument();
    expect(screen.queryByText(/Demo: this outline comes from a template/)).toBeNull();
    // Saved as a source-built draft right away, so a reload keeps it.
    expect(saved(id)).toMatchObject({ status: "outlining", template: false, ai: undefined });
    expect(courseOrigin(saved(id))).toBe("sources");

    const create = screen.getByRole("button", { name: /Create course/ });
    create.focus();
    await userEvent.keyboard("{Enter}");
    const course = saved(id);
    expect(course.status).toBe("ready");
    expect(course.citations?.map((c) => c.source)).toEqual(expect.arrayContaining(["Wikipedia", "Wiktionary", "Open Library"]));
    expect(read().acts).toEqual([expect.objectContaining({ kind: "course", intent: "course-finished", ref: id, profileId: "p1" })]);
    expect(nav.push).toHaveBeenCalledWith(`/courses/${id}`);
  });

  it("lessons removed before Create course take their sources with them, and the label follows", async () => {
    const id = open("volcanoes", sources().f);
    await screen.findByRole("button", { name: /Create course/ });
    await userEvent.click(screen.getByRole("button", { name: "Remove “Start here: Volcano”" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove “Find out more”" }));
    expect(screen.getByText("Built from real sources")).toBeInTheDocument();
    expect(screen.queryByText("Built from Wikipedia and real sources")).toBeNull();
    expect(screen.getByText(/^Built without AI from Wiktionary/)).not.toHaveTextContent("Wikipedia,");
    await userEvent.click(screen.getByRole("button", { name: /Create course/ }));
    const sourcesLeft = saved(id).citations!.map((c) => c.source);
    expect(sourcesLeft).not.toContain("Wikipedia");
    expect(sourcesLeft).not.toContain("Open Library");
    expect(sourcesLeft).toContain("Wiktionary");
  });

  it("offline with nothing on the device says offline, not that the topic has no sources", async () => {
    const id = open("knitting", offline());
    expect(await screen.findByText(/This device seems to be offline, and nothing saved on it matches this request/)).toBeInTheDocument();
    expect(screen.queryByText(/There wasn't enough from real sources/)).toBeNull();
    expect(log()[0]).toMatch(/^Couldn't reach Wikipedia: this device seems to be offline/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change my request" })).toBeInTheDocument();
    // Nothing was built, so nothing was saved as a course.
    expect(saved(id).lessons).toEqual([]);

    // The template is a way forward, and it says it's a template.
    writer.events = [{ type: "lesson", lesson: lesson("t1", "Start here: Knitting") }, { type: "lesson", lesson: lesson("t2", "Try it yourself") }, { type: "done" }];
    await userEvent.click(screen.getByRole("button", { name: "Use a template instead" }));
    expect(await screen.findByText("Template outline")).toBeInTheDocument();
    expect(writer.asked).toEqual([false]);
    expect(saved(id)).toMatchObject({ template: true, citations: undefined });
  });

  it("offline with something on the device keeps it and says what's missing", async () => {
    open("volcanoes", offline());
    expect(await screen.findByText(/This device seems to be offline, so there's no Wikipedia overview/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create course/ })).toBeInTheDocument();
    expect(screen.getByText("Built from real sources")).toBeInTheDocument();
    expect(screen.queryByText(/Change my request/, { selector: "[role=status] button" })).toBeNull();
  });

  it("online with nothing anywhere says so plainly", async () => {
    open("zzqx blorp", sources().f);
    expect(await screen.findByText("There wasn't enough from real sources to build a course about this.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create course/ })).toBeNull();
    expect(screen.queryByText(/offline/)).toBeNull();
  });

  it("a build that breaks says something went wrong and offers a way on", async () => {
    open(
      "volcanoes",
      sources({
        define: () => {
          throw new Error("broken");
        },
      }).f,
    );
    expect(await screen.findByText("Something went wrong while building this course. Try again, or start from a template you can edit.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use a template instead" })).toBeInTheDocument();
  });
});

describe("Draft: with the AI writer", () => {
  it("every lesson failing the writer's gates: built from real sources instead, and it says so", async () => {
    ai.mode = "anthropic";
    writer.events = [{ type: "step", step: "reading" }, { type: "mode", ai: true }, { type: "skipped", title: "Lava" }, { type: "skipped", title: "Ash" }, { type: "done" }];
    const id = open("volcanoes", sources().f);
    expect(await screen.findByText(/The AI lesson writer's lessons didn't pass the quality check, so this course was built from real sources instead\./)).toBeInTheDocument();
    expect(screen.getByText("Left out because they didn't pass the quality check: Lava, Ash.")).toBeInTheDocument();
    expect(writer.asked).toEqual([true]);
    expect(screen.getByText("Built from Wikipedia and real sources")).toBeInTheDocument();
    expect(screen.queryByText("Written by AI")).toBeNull();
    expect(saved(id)).toMatchObject({ ai: undefined, template: false });
    expect(saved(id).citations?.length).toBeGreaterThan(0);
  });

  it("lessons that pass are the AI writer's, labelled so, with no citations", async () => {
    ai.mode = "anthropic";
    writer.events = [{ type: "lesson", lesson: lesson("a1", "What lava is") }, { type: "done" }];
    const id = open("volcanoes", sources().f);
    expect(await screen.findByText("Written by AI")).toBeInTheDocument();
    expect(saved(id)).toMatchObject({ ai: true, template: false, citations: undefined });
    expect(screen.queryByText(/stopped after/)).toBeNull();
  });

  it("a writer that breaks off keeps what arrived and says it stopped", async () => {
    ai.mode = "anthropic";
    writer.events = [{ type: "lesson", lesson: lesson("a1", "What lava is") }, { type: "lesson", lesson: lesson("a2", "Where volcanoes are") }, { type: "error", error: "model" }];
    const id = open("volcanoes", sources().f);
    expect(await screen.findByText("The lesson writer stopped after 2 lessons. You can create the course with these, or try again.")).toBeInTheDocument();
    expect(saved(id).lessons.map((l) => l.title)).toEqual(["What lava is", "Where volcanoes are"]);
  });

  it("a stream that ends without finishing is said too", async () => {
    ai.mode = "anthropic";
    writer.events = [{ type: "lesson", lesson: lesson("a1", "What lava is") }];
    open("volcanoes", sources().f);
    expect(await screen.findByText("The lesson writer stopped after 1 lesson. You can create the course with it, or try again.")).toBeInTheDocument();
  });

  it("a writer error offers real sources, and that builds without AI", async () => {
    ai.mode = "anthropic";
    writer.events = [{ type: "error", error: "model" }];
    const id = open("volcanoes", sources().f);
    expect(await screen.findByText("The lesson writer couldn't finish. Try again, or start from a template you can edit.")).toBeInTheDocument();
    const other = screen.getByRole("button", { name: "Build from real sources instead" });
    other.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("Built from Wikipedia and real sources")).toBeInTheDocument();
    expect(writer.asked).toEqual([true]);
    expect(courseOrigin(saved(id))).toBe("sources");
  });

  it("a request that is only files has nothing to look up: the error offers the template, not sources", async () => {
    ai.mode = "anthropic";
    writer.events = [{ type: "error", error: "model" }];
    const draft = createDraft({ goal: "", grade: "4", subject: "science", length: "short", locale: "en", sources: [{ id: "f1", name: "notes.pdf", size: 10, kind: "pdf" }] }, learner.id);
    nav.params = { draftId: draft.id };
    render(<Draft fetchers={sources().f} />);
    await screen.findByText(/The lesson writer couldn't finish/);
    expect(screen.queryByRole("button", { name: "Build from real sources instead" })).toBeNull();
    expect(screen.getByRole("button", { name: "Use a template instead" })).toBeInTheDocument();
  });
});

describe("Draft: the safety screen", () => {
  it("an off-limits request asks no source anything, keeps no draft and leaves no note", async () => {
    const { f, asked } = sources();
    const id = open("drugs", f);
    expect(await screen.findByText("That's not something I can help with. Want to get back to what you're learning?")).toBeInTheDocument();
    expect(asked).toEqual([]);
    expect(writer.asked).toEqual([]);
    expect(read().courses.some((c) => c.id === id)).toBe(false);
    expect(read().notes).toEqual([]);
    expect(screen.getByRole("link", { name: "Ask for something else" })).toHaveAttribute("href", "/courses/new");
  });

  it("a crisis message gets the fixed referral and a note for the grown-ups, and is never looked up", async () => {
    const { f, asked } = sources();
    open("I want to kill myself", f);
    expect(await screen.findByText(/call or text 988/)).toBeInTheDocument();
    expect(asked).toEqual([]);
    expect(read().notes).toEqual([expect.objectContaining({ profileId: "p1", from: "safety" })]);
  });
});
