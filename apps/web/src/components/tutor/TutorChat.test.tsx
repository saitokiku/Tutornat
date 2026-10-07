import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { read, resetMemory } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import { TutorChat } from "./TutorChat";

// The demo tutor in the browser: Talk with its board, the problem drawer, a young learner, a photo, and
// the safety screen. Knowledge comes through /api/know, stubbed here.

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const learner = (over: Partial<Profile> = {}): Profile => ({ id: "p1", accountId: "a1", nickname: "Ada", grade: "8", locale: "en", color: "#000", createdAt: 0, ...over });

const FALLACY = { title: "Fallacy", extract: "A fallacy is the use of invalid or otherwise faulty reasoning in an argument.", url: "https://en.wikipedia.org/wiki/Fallacy", lang: "en", license: "CC BY-SA 4.0" };
const requests: string[] = [];

beforeEach(() => {
  resetMemory(); // each test starts from an empty store, not the last test's cached copy
  push.mockReset();
  requests.length = 0;
  vi.stubGlobal("fetch", async (url: string) => {
    requests.push(String(url));
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    if (url.startsWith("/api/ai/status")) return json({ mode: "demo" });
    if (url.startsWith("/api/know/wiki")) return json({ summary: /fallac/.test(decodeURIComponent(url)) ? FALLACY : null });
    if (url.startsWith("/api/know/define")) return json({ definitions: /denominator/.test(url) ? [{ word: "denominator", partOfSpeech: "noun", text: "The number below the line in a fraction." }] : [] });
    return new Response("{}", { status: 404 });
  });
  URL.createObjectURL = vi.fn(() => "blob:local-photo");
  URL.revokeObjectURL = vi.fn();
});

/** Presses Tab until `el` has focus, as a keyboard-only learner would. */
async function tabTo(user: ReturnType<typeof userEvent.setup>, el: HTMLElement) {
  for (let i = 0; i < 40 && document.activeElement !== el; i++) await user.tab();
  expect(document.activeElement).toBe(el);
}

describe("Talk with the demo tutor", () => {
  it("keyboard only: asks what a logical fallacy is, gets a cited extract and the fallacies practice, starts it", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner(), surface: "talk", title: "Talk with the tutor" }} />);
    expect(await screen.findByText(/I'm the demo tutor: I answer from real sources/)).toBeInTheDocument();
    const box = screen.getByRole("textbox", { name: "Ask anything about what you're learning" });
    await tabTo(user, box);
    await user.keyboard("what is a logical fallacy{Enter}");

    const board = screen.getByRole("region", { name: "Board" });
    const fact = await within(board).findByRole("article", { name: "Fallacy" });
    expect(within(fact).getByText(FALLACY.extract)).toBeInTheDocument();
    expect(within(fact).getByRole("link", { name: /Read the article/ })).toHaveAttribute("href", FALLACY.url);
    expect(within(fact).getByText("Text from Wikipedia, CC BY-SA 4.0")).toBeInTheDocument();
    const practice = within(board).getByRole("article", { name: "Practice: Spot the fallacy" });
    expect(within(practice).getByText("Draft questions")).toBeInTheDocument();
    expect(within(board).getByRole("article", { name: "When appeals mislead" })).toBeInTheDocument();
    expect(requests.some((u) => u.startsWith("/api/know/wiki?q=logical+fallacy&lang=en"))).toBe(true);
    // The cited fact leads; the reply's cards keep the tutor's order.
    expect(within(board).getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual(["Fallacy", "When appeals mislead", "Practice: Spot the fallacy", "More to read and watch"]);

    // The conversation points at the board; Enter on it moves focus to the newest card.
    const pointer = screen.getByRole("button", { name: "On the board: Wikipedia, lesson, practice, sources" });
    await tabTo(user, pointer);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(fact));

    // The tutor's help on a skill is a teaching act, once per conversation; the transcript is kept.
    const s = read();
    expect(s.acts.filter((a) => a.kind === "tutor")).toEqual([expect.objectContaining({ profileId: "p1", intent: "next-try-right", skillId: "e.fallacies" })]);
    expect(s.threads[0]).toMatchObject({ profileId: "p1", surface: "talk", title: "what is a logical fallacy" });
    expect(s.threads[0].lines.map((l) => l.role)).toEqual(["tutor", "learner", "tutor"]);

    // Start the practice in one keypress.
    await tabTo(user, within(practice).getByRole("button", { name: "Start" }));
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/practice\/.+/));
    expect(read().sets.at(-1)).toMatchObject({ skillId: "e.fallacies", profileId: "p1" });
  });

  it("the board folds away on a phone and opens again from the conversation", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner(), surface: "talk", title: "Talk" }} />);
    expect(await screen.findByText("Pictures, worked examples and practice the tutor shares show up here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Board/ })).not.toBeInTheDocument(); // nothing to fold yet
    await user.type(screen.getByRole("textbox"), "what is a logical fallacy{Enter}");
    const toggle = await screen.findByRole("button", { name: "Board (4)" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("board-cards")).toHaveClass("hidden");
    await user.click(screen.getByRole("button", { name: /^On the board:/ }));
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("“What does … mean?” fills the box with the cursor in the gap", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner(), surface: "talk", title: "Talk" }} />);
    await user.click(await screen.findByRole("button", { name: "What does … mean?" }));
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    await waitFor(() => expect(document.activeElement).toBe(box));
    expect(box.value).toBe("What does  mean?");
    expect(box.selectionStart).toBe("What does ".length);
    await user.keyboard("denominator{Enter}");
    const card = await screen.findByRole("article", { name: "Meaning of “denominator”" });
    expect(within(card).getByText("The number below the line in a fraction.")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /Wiktionary/ })).toHaveAttribute("href", "https://en.wiktionary.org/wiki/denominator");
  });

  it("a photo in the demo stays on the device and the tutor asks for the problem typed", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner(), surface: "talk", title: "Talk" }} />);
    await screen.findByText(/I'm the demo tutor/);
    await user.upload(screen.getByTestId("tutor-photo"), new File(["x"], "worksheet.jpg", { type: "image/jpeg" }));
    expect(await screen.findByRole("img", { name: "Your photo of the problem" })).toHaveAttribute("src", "blob:local-photo");
    expect(screen.getByText("Reading a photo needs the AI tutor, which isn't connected here. Type the problem instead and I'll help with it.")).toBeInTheDocument();
    expect(requests.filter((u) => !u.startsWith("/api/ai/status"))).toEqual([]); // nothing was sent anywhere
    expect(read().threads[0].lines[1]).toMatchObject({ role: "learner", text: "Sent a photo of the problem." });
  });

  it("the safety screen answers a crisis with the fixed referral and tells the family", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner(), surface: "talk", title: "Talk" }} />);
    await user.type(await screen.findByRole("textbox"), "i want to die{Enter}");
    expect(await screen.findByText(/988/)).toBeInTheDocument();
    expect(read().notes).toEqual([expect.objectContaining({ profileId: "p1", from: "safety" })]);
    expect(read().threads[0].flagged).toBe(true);
    expect(requests.filter((u) => u.startsWith("/api/know"))).toEqual([]);
  });
});

describe("a young learner", () => {
  it("hears the tutor first, then each reply, one sentence at a time", async () => {
    const said: string[] = [];
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        lang = "";
        voice = null;
        rate = 1;
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal("speechSynthesis", { speak: (u: { text: string }) => said.push(u.text), cancel: vi.fn(), getVoices: () => [] });
    const user = userEvent.setup();
    const { unmount } = render(<TutorChat board setup={{ learner: learner({ grade: "1" }), surface: "talk", title: "Talk" }} />);
    await waitFor(() => expect(said).toEqual(["I'm the demo tutor.", "What do you want to learn about?", "Tap one."]));
    expect(screen.getByRole("button", { name: "Reading aloud" })).toHaveAttribute("aria-pressed", "true");
    // The speaker beside each reply is a big target too.
    expect(screen.getAllByRole("button", { name: /^Read aloud: / })[0].className).toContain("size-14");
    await user.click(screen.getByRole("button", { name: "Read me a poem" }));
    await waitFor(() => expect(said.length).toBeGreaterThan(3));
    unmount();

    // Older learners turn reading aloud on themselves.
    said.length = 0;
    render(<TutorChat board setup={{ learner: learner({ grade: "6" }), surface: "talk", title: "Talk" }} />);
    expect(await screen.findByRole("button", { name: "Read aloud" })).toHaveAttribute("aria-pressed", "false");
    expect(said).toEqual([]);
    cleanup(); // unmount while the fake speech is still there, then put the globals back
    vi.unstubAllGlobals();
  });

  it("is greeted first with big tap chips and needs no typing", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner({ grade: "K" }), surface: "talk", title: "Talk" }} />);
    expect(await screen.findByText(/I'm the demo tutor\.\s+What do you want to learn about\? Tap one\./)).toBeInTheDocument();
    const poem = screen.getByRole("button", { name: "Read me a poem" });
    expect(poem.className).toContain("min-h-14");
    const chips = screen.getAllByRole("button").filter((b) => b.className.includes("min-h-14") && b !== poem);
    expect(chips.length).toBeGreaterThan(0); // the next skills on their map, to tap
    await user.click(chips[0]);
    const start = await screen.findAllByRole("button", { name: "Start" });
    expect(start[0].className).toContain("min-h-14");
    expect(screen.getByRole("region", { name: "Board" }).querySelector("article")).toHaveAccessibleName(/^Practice: /); // practice first
    expect(requests.some((u) => u.startsWith("/api/know/wiki"))).toBe(false); // a skill on the map, not a search
    expect(screen.getByRole("button", { name: "Send" }).className).toContain("size-14");
  });
});

describe("dates the tutor offers", () => {
  it("adds a test in one tap, and the same date can't be added twice", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner({ grade: "4" }), surface: "talk", title: "Talk" }} />);
    await user.type(await screen.findByRole("textbox"), "I have a fractions test on Friday{Enter}");
    const card = await screen.findByRole("article", { name: "Fractions test" });
    await user.click(within(card).getByRole("button", { name: "Add to calendar" }));
    expect(within(card).getByRole("status")).toHaveTextContent("Added");
    expect(read().events).toEqual([expect.objectContaining({ profileId: "p1", title: "Fractions test", kind: "test", source: "tutor" })]);

    await user.type(screen.getByRole("textbox"), "I have a fractions test on Friday{Enter}");
    await waitFor(() => expect(screen.getAllByRole("article", { name: "Fractions test" })).toHaveLength(2));
    for (const c of screen.getAllByRole("article", { name: "Fractions test" })) expect(within(c).queryByRole("button", { name: "Add to calendar" })).not.toBeInTheDocument();
    expect(read().events).toHaveLength(1);
  });
});

describe("the tutor on the lesson stage", () => {
  it("offers another way to explain the lesson and the meaning of a word", async () => {
    render(<TutorChat setup={{ learner: learner(), surface: "lesson", lesson: { title: "When appeals mislead", scene: "False authority" }, title: "When appeals mislead" }} />);
    expect(await screen.findByRole("button", { name: "Explain it a different way" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What does … mean?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Find me a book about …" })).not.toBeInTheDocument();
  });
});

describe("the drawer beside a problem", () => {
  const item = makeItem("m.frac.addlike", 1, 7, "en");

  it("walks the vetted hints and shows a similar one worked out, by keyboard", async () => {
    const user = userEvent.setup();
    render(<TutorChat setup={{ learner: learner({ grade: "4" }), surface: "practice", item, tries: 0, title: "Fractions" }} />);
    expect(await screen.findByText(new RegExp(item.hints[0].slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
    // Opening the tutor on a problem is help on that skill: one teaching act, before anything is typed.
    await waitFor(() => expect(read().acts.filter((a) => a.kind === "tutor")).toEqual([expect.objectContaining({ profileId: "p1", intent: "next-try-right", skillId: "m.frac.addlike" })]));
    await tabTo(user, screen.getByRole("button", { name: "Give me a hint" }));
    await user.keyboard("{Enter}");
    expect(await screen.findByText(item.hints[1])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show a similar one" }));
    expect(await screen.findByText("Now try yours the same way.")).toBeInTheDocument();
    await act(async () => {});
    expect(read().acts.filter((a) => a.kind === "tutor")).toEqual([expect.objectContaining({ skillId: "m.frac.addlike" })]);
  });
});
