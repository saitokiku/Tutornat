import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { read, resetMemory } from "@/lib/store";
import type { Course, Lesson, Profile } from "@/lib/types";
import { courseOrigin, hasCheck, lessonHasChecks } from "./lesson";
import { installSpeech } from "./speech-fake";
import { Stage } from "./Stage";

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return { default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => createElement("a", { href, ...rest }, children) };
});

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "5", locale: "en", color: "#000", createdAt: 0 };
const little: Profile = { ...learner, id: "p2", grade: "K" };

const lesson1: Lesson = {
  id: "l1",
  title: "Half is lit",
  summary: "Why the Moon has phases.",
  minutes: 8,
  scenes: [
    {
      id: "s1",
      kind: "slide",
      title: "Moonlight",
      blocks: [
        { type: "text", text: "Sunlight lights half the Moon." },
        { type: "visual", visual: { kind: "moon", phase: 0.25 }, alt: "A first quarter moon." },
      ],
    },
    { id: "s2", kind: "quiz", title: "Check", questions: [{ id: "q1", prompt: "What lights the Moon?", choices: ["The Sun", "Earth"], answer: 0, hint: "Think of daytime.", explain: "Sunlight." }] },
  ],
};
const lesson2: Lesson = { id: "l2", title: "Eight phases", summary: "In order.", minutes: 12, scenes: [{ id: "s1", kind: "slide", title: "Eight", blocks: [{ type: "text", text: "Eight phases." }] }] };
const course: Course = {
  id: "c1",
  profileId: "p1",
  title: "The Moon",
  goal: "moon",
  subject: "science",
  grade: "5",
  locale: "en",
  origin: "catalogue",
  catalogueId: "science-moon",
  status: "ready",
  length: "short",
  sources: [],
  lessons: [lesson1, lesson2],
  template: false,
  createdAt: 0,
  updatedAt: 0,
};

beforeEach(() => resetMemory());

describe("lesson facts", () => {
  it("names where a course came from", () => {
    expect(courseOrigin(course)).toBe("people");
    expect(courseOrigin({ ...course, origin: "generated", ai: true })).toBe("ai");
    expect(courseOrigin({ ...course, origin: "generated", citations: [{ title: "Moon", url: "https://en.wikipedia.org/wiki/Moon", source: "Wikipedia" }] })).toBe("sources");
    expect(courseOrigin({ ...course, origin: "generated", template: true })).toBe("template");
    expect(courseOrigin({ ...course, origin: "generated" })).toBeNull();
  });

  it("knows which lessons have something to check", () => {
    expect(lessonHasChecks(lesson1)).toBe(true);
    expect(lessonHasChecks(lesson2)).toBe(false);
    expect(hasCheck({ kind: "number-line", min: 0, max: 5, step: 1, start: 0 })).toBe(false);
    expect(hasCheck({ kind: "balance", xCount: 2, leftUnits: 1, rightUnits: 5 })).toBe(true);
  });
});

describe("Stage", () => {
  it("shows the course's origin in the header", () => {
    const { unmount } = render(<Stage course={course} lesson={lesson1} learner={learner} />);
    expect(screen.getByText("Written by people")).toBeInTheDocument();
    unmount();
    render(<Stage course={{ ...course, origin: "generated", ai: true }} lesson={lesson1} learner={learner} />);
    expect(screen.getByText("Written by AI")).toBeInTheDocument();
  });

  it("logs one lesson act per day when a lesson with checks starts", () => {
    const { unmount } = render(<Stage course={course} lesson={lesson1} learner={learner} />);
    unmount();
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    const acts = read().acts;
    expect(acts).toHaveLength(1);
    expect(acts[0]).toMatchObject({ profileId: "p1", kind: "lesson", intent: "lesson-checks-pass", ref: "c1/l1" });
    expect(acts[0]).not.toHaveProperty("outcome");
    expect(read().activity.filter((e) => e.type === "lesson_started")).toHaveLength(1);
  });

  it("logs no act for a lesson with nothing to check", () => {
    render(<Stage course={course} lesson={lesson2} learner={learner} />);
    expect(read().acts).toHaveLength(0);
  });

  it("finishes honestly: tally with help, a clean stop to Today, the next lesson only offered", async () => {
    render(<Stage course={{ ...course, origin: "generated", citations: [{ title: "Moon", url: "https://en.wikipedia.org/wiki/Moon", source: "Wikipedia" }] }} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByLabelText("Earth"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(screen.getByRole("button", { name: "Why" }));
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(screen.getByRole("button", { name: /Finish lesson/ }));

    expect(screen.getByRole("heading", { name: "Lesson finished" })).toBeInTheDocument();
    const row = (label: string) => screen.getByText(label).parentElement!.querySelector("dd")!.textContent;
    // Missed first, then right after reading why: one not yet, one with help, none on their own.
    expect([row("Right on your own"), row("Right with help"), row("Not yet")]).toEqual(["0", "1", "1"]);
    expect(screen.getByText("Checks in a lesson are practice. A skill is proved by checks on different days.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /I'm done for today/ })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: /Start the next lesson/ })).toHaveAttribute("href", "/learn/c1/l2");
    expect(screen.getByText("Eight phases")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Moon\s*Wikipedia$/ })).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Moon");

    // Nothing opens the next lesson by itself: no start recorded for it, still on the finish.
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(read().activity.some((e) => e.lessonId === "l2")).toBe(false);
    expect(read().activity.filter((e) => e.type === "lesson_completed")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Lesson finished" })).toBeInTheDocument();
  });

  it("the last lesson says so instead of offering another", async () => {
    render(<Stage course={course} lesson={lesson2} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /Finish lesson/ }));
    expect(screen.getByText("That was the last lesson in this course.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Start the next lesson/ })).toBeNull();
    expect(screen.getByText("No checks answered this time.")).toBeInTheDocument();
  });

  it("K–2: pictures first, every line can be heard, big primary actions", () => {
    render(<Stage course={{ ...course, profileId: "p2" }} lesson={lesson1} learner={little} />);
    const figure = document.querySelector("figure")!;
    const text = screen.getByText("Sunlight lights half the Moon.");
    expect(figure.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const line of ["Moonlight", "Sunlight lights half the Moon.", "A first quarter moon."]) expect(screen.getByRole("button", { name: `Read aloud: ${line}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Next/ }).className).toContain("min-h-14");
  });
});

describe("narrated slides on the stage", () => {
  let fake: ReturnType<typeof installSpeech>;
  beforeEach(() => {
    fake = installSpeech();
  });
  afterEach(() => {
    cleanup();
    fake.uninstall();
  });

  it("plays, marks the word being read, pauses and resumes from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    const toggle = screen.getByRole("button", { name: "Read aloud" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(fake.last().text).toBe("Moonlight");
    fake.end();
    expect(fake.last().text).toBe("Sunlight lights half the Moon.");
    fake.word(9, 6);
    expect(document.querySelector("[data-spoken=word]")?.textContent).toBe("lights");

    await user.keyboard("{Enter}"); // same button, now Pause
    expect(document.activeElement).toBe(toggle);
    expect(toggle).toHaveAccessibleName("Resume");
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(document.querySelector("[data-spoken=word]")?.textContent).toBe("lights");

    await user.keyboard("{Enter}"); // Resume
    expect(fake.last().text).toBe("lights half the Moon.");
    expect(toggle).toHaveAccessibleName("Pause");

    await user.click(screen.getByRole("button", { name: "Stop reading" }));
    expect(toggle).toHaveAccessibleName("Read aloud");
    expect(document.querySelector("[data-spoken]")).toBeNull();
  });

  it("describes the picture aloud and shows the words while it does", async () => {
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    fake.end();
    fake.end();
    expect(fake.last().text).toBe("A first quarter moon.");
    expect(document.querySelector("figcaption")?.textContent).toBe("A first quarter moon.");
  });

  it("offers Say it with me to K–2 on slides", async () => {
    render(<Stage course={{ ...course, profileId: "p2" }} lesson={lesson1} learner={little} />);
    await userEvent.click(screen.getByRole("button", { name: "Say it with me" }));
    expect(fake.last().text).toBe("Moonlight");
    fake.end();
    expect(screen.getByText("Your turn. Say it out loud.")).toBeInTheDocument();
  });

  it("stops reading when the learner moves to another scene", async () => {
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeInTheDocument();
  });
});

describe("without speech", () => {
  it("hides the read-aloud control and keeps the text", () => {
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    expect(screen.queryByRole("button", { name: "Read aloud" })).toBeNull();
    expect(screen.getByText("Sunlight lights half the Moon.")).toBeInTheDocument();
  });
});
