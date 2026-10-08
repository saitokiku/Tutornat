import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGUE } from "@/catalogue";
import { read, resetMemory, update } from "@/lib/store";
import type { Course, Lesson, Profile } from "@/lib/types";
import { AWAITING_REVIEW, checkIds, courseOrigin, hasCheck, lessonHasChecks, settle, tallyOf } from "./lesson";
import { installSpeech } from "./speech-fake";
import { Stage } from "./Stage";

// The tutor's chat is tested on its own; here only whether it is open matters.
vi.mock("./TutorPanel", () => ({ TutorPanel: () => null }));
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

beforeEach(() => {
  vi.restoreAllMocks();
  resetMemory();
  update((s) => { s.profiles.push(learner, little); s.courses.push(course); s.session = { accountId: "a1", profileId: "p1" }; });
});

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
    expect(lesson1.scenes.flatMap(checkIds)).toEqual(["s2:q1"]);
  });

  it("settles each check once: right first time, right after help or a miss, or not yet", () => {
    expect(settle(undefined, true, false)).toBe("own");
    expect(settle(undefined, true, true)).toBe("help");
    expect(settle(undefined, false, false)).toBe("missed");
    expect(settle("missed", false, true)).toBe("missed");
    expect(settle("missed", true, false)).toBe("help"); // put right after a miss
    expect(settle("own", false, false)).toBe("own"); // a later change doesn't undo it
    expect(settle("help", true, false)).toBe("help");
  });

  it("counts every check in the lesson once, and the ones never answered as not tried", () => {
    const two: Lesson = { ...lesson1, scenes: [...lesson1.scenes, { id: "s3", kind: "interactive", title: "Try", prompt: "Do it.", widget: { kind: "moon-phases", target: 14 } }] };
    expect(tallyOf(two, {})).toEqual({ own: 0, help: 0, missed: 0, untried: 2 });
    expect(tallyOf(two, { "s2:q1": "help", s3: "missed" })).toEqual({ own: 0, help: 1, missed: 1, untried: 0 });
    expect(tallyOf(lesson2, {})).toEqual({ own: 0, help: 0, missed: 0, untried: 0 });
  });

  it("every ready-made scene waiting for review is a real scene", () => {
    for (const ref of AWAITING_REVIEW) {
      const [c, l, s] = ref.split("/");
      expect(CATALOGUE.find((e) => e.id === c)?.lessons.find((x) => x.id === l)?.scenes.some((x) => x.id === s), ref).toBe(true);
    }
  });
});

describe("Stage", () => {
  it("storage full: a lesson check still answers, and the page says work isn't being saved", async () => {
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByLabelText("The Sun"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByText("That's right.")).toBeInTheDocument();
    expect(screen.getByText("This browser isn't letting KaizenEDU save. Work will be lost when the tab closes.")).toBeInTheDocument();
    expect(read().activity.filter((e) => e.type === "quiz_answered")).toEqual([expect.objectContaining({ correct: true, assisted: false })]);
  });

  it("K–2, storage full: the learner hears that a grown-up is needed, and the grown-up reads why", async () => {
    const speech = installSpeech();
    render(<Stage course={{ ...course, profileId: "p2" }} lesson={lesson1} learner={little} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    const young = "This device can't save your work right now. Please get a grown-up.";
    expect(screen.getByText(young)).toBeInTheDocument();
    expect(screen.getByText("This browser isn't letting KaizenEDU save. Work will be lost when the tab closes.")).toBeInTheDocument();
    await vi.waitFor(() => expect(speech.spoken.map((u) => u.text)).toContain(young));
  });

  it("an answer for a learner removed in another tab isn't taken, and the page reads the change", async () => {
    const interactive: Lesson = { ...lesson1, scenes: [{ id: "f", kind: "interactive", title: "Shade", prompt: "Make three fourths.", widget: { kind: "fraction-bar", parts: 4, shaded: 2, target: { parts: 4, shaded: 3 } } }] };
    render(<Stage course={course} lesson={interactive} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Part 3, not shaded" }));
    const doc = JSON.parse(localStorage.getItem("kaizenedu.v1")!);
    doc.profiles = doc.profiles.filter((p: Profile) => p.id !== learner.id);
    localStorage.setItem("kaizenedu.v1", JSON.stringify(doc));
    await userEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(screen.queryByText("That's right.")).toBeNull();
    expect(screen.getByText("This changed in another tab, so it has been loaded again.")).toBeInTheDocument();
    expect(read().activity.filter((e) => e.type === "quiz_answered")).toEqual([]);
  });

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
    // Missed first, then right after reading why: the one check counts once, as right with help.
    expect([row("Right on your own"), row("Right with help"), row("Not yet")]).toEqual(["0", "1", "0"]);
    expect(screen.queryByText("Not tried")).toBeNull();
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
    expect(screen.getByText("This lesson has nothing to check.")).toBeInTheDocument();
  });

  it("skipped checks show as not tried, not as a clean lesson", async () => {
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByRole("button", { name: /Finish lesson/ }));
    const row = (label: string) => screen.getByText(label).parentElement!.querySelector("dd")!.textContent;
    expect(row("Not tried")).toBe("1");
    expect(row("Right on your own")).toBe("0");
  });

  it("an answer given while the tutor is open on that scene counts as helped", async () => {
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByRole("button", { name: "Show tutor" }));
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(read().activity.find((e) => e.type === "quiz_answered")).toMatchObject({ correct: true, assisted: true });
    expect(screen.getByText("That's right, with help.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Finish lesson/ }));
    const row = (label: string) => screen.getByText(label).parentElement!.querySelector("dd")!.textContent;
    expect([row("Right on your own"), row("Right with help")]).toEqual(["0", "1"]);
  });

  it("the tutor opened on one scene and kept open marks the next scene's checks too, and that help is saved", async () => {
    const first = render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Show tutor" }));
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(read().helpExposures).toEqual([expect.objectContaining({ kind: "tutor" })]);
    // A reload before answering keeps it helped.
    first.unmount();
    resetMemory();
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(read().activity.find((e) => e.type === "quiz_answered")).toMatchObject({ correct: true, assisted: true });
  });

  it("scene help survives a reload before answering", async () => {
    const first = render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByRole("button", { name: /Show a hint/ }));
    first.unmount();
    resetMemory();
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByText("Think of daytime.")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(read().activity.find((e) => e.type === "quiz_answered")).toMatchObject({ correct: true, assisted: true });
    expect(read().helpExposures).toEqual([expect.objectContaining({ kind: "hint" })]);
    expect(read().attemptContexts).toEqual([expect.objectContaining({ kind: "scene-question", courseId: "c1", questionId: "s2:q1" })]);
  });

  it("scene miss survives reload, and a later visit cannot record that check twice", async () => {
    const first = render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByLabelText("Earth"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    first.unmount();
    resetMemory();
    const next = render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    // The miss comes back picked, with its verdict.
    expect(screen.getByLabelText("Earth")).toBeChecked();
    expect(screen.getByText("Not quite yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(read().activity.filter((e) => e.type === "quiz_answered")).toEqual([
      expect.objectContaining({ correct: false, assisted: false, response: "Earth", choice: 1 }),
      expect.objectContaining({ correct: true, assisted: true, response: "The Sun", choice: 0 }),
    ]);
    next.unmount();
    resetMemory();
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    // A completed answer is restored, with its original assistance, rather than asked again.
    expect(screen.getByText("That's right, with help.")).toBeInTheDocument();
    expect(read().activity.filter((e) => e.type === "quiz_answered")).toHaveLength(2);
  });

  it("a ready-made scene written by AI says so until a teacher reviews it", async () => {
    const entry = CATALOGUE.find((c) => c.id === "science-moon")!;
    const daytime = entry.lessons.find((l) => l.id === "moon-in-daytime")!;
    render(<Stage course={{ ...course, lessons: entry.lessons }} lesson={daytime} learner={learner} />);
    expect(screen.queryByText("This part was written by AI. A teacher hasn't checked it yet.")).toBeNull();
    while (screen.queryByRole("button", { name: /^Next/ })) await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByRole("heading", { level: 2, name: "Tomorrow's moonrise" })).toBeInTheDocument();
    expect(screen.getByText("This part was written by AI. A teacher hasn't checked it yet.")).toBeInTheDocument();
  });

  it("K–2: pictures first, every line can be heard, big primary actions", () => {
    render(<Stage course={{ ...course, profileId: "p2" }} lesson={lesson1} learner={little} />);
    const figure = document.querySelector("figure")!;
    const text = screen.getByText("Sunlight lights half the Moon.");
    expect(figure.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const line of ["Moonlight", "Sunlight lights half the Moon.", "A first quarter moon."]) {
      const hear = screen.getByRole("button", { name: `Read aloud: ${line}` });
      expect(hear.className).toContain("size-14");
    }
    expect(screen.getByRole("button", { name: /^Next/ }).className).toContain("min-h-14");
  });

  it("K–2: a later picture stays beside the words it follows", () => {
    const pair: Lesson = {
      ...lesson2,
      scenes: [
        {
          id: "s1",
          kind: "slide",
          title: "Melting",
          blocks: [
            { type: "text", text: "Ice is solid." },
            { type: "visual", visual: { kind: "moon", phase: 0 }, alt: "Before." },
            { type: "text", text: "Heat makes the bits move more." },
            { type: "visual", visual: { kind: "moon", phase: 0.5 }, alt: "After." },
          ],
        },
      ],
    };
    render(<Stage course={{ ...course, profileId: "p2" }} lesson={pair} learner={little} />);
    const order = ["Before.", "Ice is solid.", "Heat makes the bits move more.", "After."].map((name) => screen.getByRole("button", { name: `Read aloud: ${name}` }));
    for (let i = 1; i < order.length; i++) expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("K–2: every line of the finish can be heard", async () => {
    render(<Stage course={{ ...course, profileId: "p2" }} lesson={lesson1} learner={little} />);
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(screen.getByRole("button", { name: /Finish lesson/ }));
    for (const line of [
      "Lesson finished",
      "Here's what happened in this lesson.",
      "1 right on your own, 0 right with help, 0 not yet.",
      "Checks in a lesson are practice. A skill is proved by checks on different days.",
      "I'm done for today",
      "Start the next lesson: Eight phases",
    ])
      expect(screen.getByRole("button", { name: `Read aloud: ${line}`.slice(0, 72) })).toBeInTheDocument();
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

  it("offers Say it with me to K–2 on slides, and says when it is their turn", async () => {
    render(<Stage course={{ ...course, profileId: "p2" }} lesson={lesson1} learner={little} />);
    await userEvent.click(screen.getByRole("button", { name: "Say it with me" }));
    expect(fake.last().text).toBe("Moonlight");
    fake.end();
    // A child who can't read hears the cue and sees a speaking mark by the line to say back.
    expect(fake.last().text).toBe("Your turn.");
    expect(screen.getByText("Your turn. Say it out loud.")).toBeInTheDocument();
    expect(document.querySelector("[data-spoken=turn]")).not.toBeNull();
    expect(document.querySelector("[data-spoken=segment]")?.textContent).toBe("Moonlight");
  });

  it("stops reading when the learner moves to the next question", async () => {
    const two: Lesson = {
      ...lesson1,
      scenes: [
        {
          id: "s2",
          kind: "quiz",
          title: "Check",
          questions: [
            { id: "q1", prompt: "What lights the Moon?", choices: ["The Sun", "Earth"], answer: 0, hint: "h", explain: "Sunlight." },
            { id: "q2", prompt: "How much of the Moon is lit?", choices: ["Half", "All"], answer: 0, hint: "h", explain: "Half." },
          ],
        },
      ],
    };
    render(<Stage course={course} lesson={two} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    expect(fake.last().text).toBe("What lights the Moon? 1. The Sun. 2. Earth.");
    fake.word(0, 4);
    await userEvent.click(screen.getByLabelText("The Sun"));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByRole("button", { name: "Read aloud" })).toBeInTheDocument();
    expect(document.querySelector("[data-spoken]")).toBeNull();
    // The next read starts with the new question.
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    expect(fake.last().text).toBe("How much of the Moon is lit? 1. Half. 2. All.");
  });

  it("reads a sequence's steps in the order they stand on screen", async () => {
    const steps: Lesson = {
      ...lesson2,
      scenes: [{ id: "s1", kind: "interactive", title: "Order", prompt: "Put them in order.", widget: { kind: "sequence", items: [{ id: "a", text: "Seed" }, { id: "b", text: "Sprout" }, { id: "c", text: "Flower" }] } }],
    };
    render(<Stage course={course} lesson={steps} learner={learner} />);
    const shown = screen.getAllByRole("listitem").flatMap((li) => li.querySelector("p")?.textContent?.replace(/^Step \d+: /, "") ?? []);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    const read = [fake.last().text];
    for (let i = 0; i < 4; i++) {
      fake.end();
      read.push(fake.last().text);
    }
    expect(read).toEqual(["Order", "Put them in order.", ...shown]);
  });

  it("says so when the browser can't speak, and keeps the words", async () => {
    render(<Stage course={course} lesson={lesson1} learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Read aloud" }));
    act(() => fake.last().onerror?.({ error: "synthesis-failed" }));
    expect(screen.getByText("This browser couldn't read aloud just now. Everything is still on the screen.")).toHaveAttribute("role", "status");
    expect(screen.getByText("Sunlight lights half the Moon.")).toBeInTheDocument();
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
