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
    expect(within(board).getByRole("article", { name: "Attacking the person, twisting the point" })).toBeInTheDocument();
    expect(requests.some((u) => u.startsWith("/api/know/wiki?q=logical+fallacy&lang=en"))).toBe(true);
    // The cited fact leads; the reply's cards keep the tutor's order.
    expect(within(board).getAllByRole("article").map((a) => a.getAttribute("aria-label"))).toEqual(["Fallacy", "Attacking the person, twisting the point", "Practice: Spot the fallacy", "More to read and watch"]);

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

    // Start the practice in one keypress: the newest offer is the one ink button, named for its skill.
    const start = within(practice).getByRole("button", { name: "Start: Spot the fallacy" });
    expect(start.className).toContain("k-btn-primary");
    await tabTo(user, start);
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
    // The opening names the choices, in the chips' order, so a child who can't read hears what to tap.
    const chips = within(await screen.findByRole("group", { name: "Quick asks" })).getAllByRole("button");
    const labels = chips.map((c) => c.textContent);
    await waitFor(() => expect(said.slice(0, 2)).toEqual(["I'm the demo tutor.", "What do you want to learn about?"]));
    const named = labels.slice(0, -1).map((l) => l!.replace(/[?!.]+$/, ""));
    expect(said[2]).toBe(`${new Intl.ListFormat("en-US", { type: "disjunction" }).format([...named, "a poem"])}?`);
    expect(said[3]).toBe("Tap one.");
    expect(screen.getByRole("button", { name: "Reading aloud" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Reading aloud" }).className).toContain("min-h-14");
    // Reached by keyboard, a chip says its own name.
    said.length = 0;
    await user.tab();
    while (document.activeElement !== chips[0]) await user.tab();
    expect(said).toEqual([labels[0]]);
    // The speaker beside each reply is a big target too.
    expect(screen.getAllByRole("button", { name: /^Read aloud: / })[0].className).toContain("size-14");
    said.length = 0;
    await user.click(screen.getByRole("button", { name: "Read me a poem" }));
    await waitFor(() => expect(said.length).toBeGreaterThan(0));
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
    expect(await screen.findByText(/I'm the demo tutor\.\s+What do you want to learn about\? .+ or a poem\? Tap one\./)).toBeInTheDocument();
    const poem = screen.getByRole("button", { name: "Read me a poem" });
    expect(poem.className).toContain("min-h-14");
    const group = screen.getByRole("group", { name: "Quick asks" });
    const chips = within(group).getAllByRole("button").filter((b) => b !== poem);
    expect(chips.length).toBeGreaterThan(0); // the next skills on their map, to tap
    for (const c of chips) {
      expect(c.className).toContain("min-h-14");
      expect(c.querySelector("[aria-hidden=true].rounded-full")).not.toBeNull(); // its subject's mark
    }
    expect(within(group).queryByRole("button", { name: "What does … mean?" })).not.toBeInTheDocument(); // nothing that needs typing
    await user.click(chips[0]);
    const start = await screen.findAllByRole("button", { name: /^Start: / });
    expect(start[0].className).toContain("min-h-14");
    expect(screen.getByRole("region", { name: "Board" }).querySelector("article")).toHaveAccessibleName(/^Practice: /); // practice first
    expect(requests.some((u) => u.startsWith("/api/know/wiki"))).toBe(false); // a skill on the map, not a search
    expect(screen.getByRole("button", { name: "Send" }).className).toContain("size-14");
  });
});

describe("a conversation that moves on", () => {
  it("records a teaching act for each skill it turns to, and when each line was said", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner({ grade: "5" }), surface: "talk", title: "Talk" }} />);
    await user.type(await screen.findByRole("textbox"), "what is a logical fallacy{Enter}");
    await screen.findByRole("article", { name: "Fallacy" });
    now += 90_000;
    await user.type(screen.getByRole("textbox"), "3/4 + 1/6{Enter}");
    await screen.findByText(/That looks like Add and subtract fractions with unlike denominators/);
    await waitFor(() => expect(read().acts.filter((a) => a.kind === "tutor").map((a) => a.skillId)).toEqual(["e.fallacies", "m.frac.addunlike"]));
    const acts = read().acts.filter((a) => a.kind === "tutor");
    expect(acts[0].ref).toBe(acts[1].ref); // the thread
    expect(acts[0].ref).toBe(read().threads[0].id);
    const at = read().threads[0].lines.map((l) => l.at);
    expect(at[0]).toBe(1_000_000);
    expect(at.at(-1)).toBe(1_090_000);
    vi.restoreAllMocks();
  });

  it("shows a practice offer on the board once, however often it is offered", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner(), surface: "talk", title: "Talk" }} />);
    await user.type(await screen.findByRole("textbox"), "what is a logical fallacy{Enter}");
    await screen.findByRole("article", { name: "Fallacy" });
    await user.type(screen.getByRole("textbox"), "what are logical fallacies{Enter}");
    await waitFor(() => expect(screen.getAllByRole("article", { name: "Fallacy" })).toHaveLength(2));
    const board = screen.getByRole("region", { name: "Board" });
    expect(within(board).getAllByRole("article", { name: "Practice: Spot the fallacy" })).toHaveLength(1);
    // The older reply's pointer still finds it.
    const pointers = screen.getAllByRole("button", { name: /^On the board:/ });
    await user.click(pointers[0]);
    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByRole("article", { name: "Fallacy" })[1]));
  });

  it("a keyboard user keeps their place when the chip they pressed goes away", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner(), surface: "talk", title: "Talk" }} />);
    const group = await screen.findByRole("group", { name: "Quick asks" });
    const topic = within(group).getAllByRole("button").find((b) => !/…/.test(b.textContent ?? ""))!;
    await tabTo(user, topic);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(within(group).queryByText(topic.textContent!)).not.toBeInTheDocument());
    expect(document.activeElement).toBe(group);
    await user.tab();
    expect(group.contains(document.activeElement)).toBe(true); // the next Tab lands on the new chips
  });
});

describe("dates the tutor offers", () => {
  it("adds a test in one tap, and the same date can't be added twice", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: learner({ grade: "4" }), surface: "talk", title: "Talk" }} />);
    await user.type(await screen.findByRole("textbox"), "I have a fractions test on Friday{Enter}");
    const card = await screen.findByRole("article", { name: "Fractions test" });
    await user.click(within(card).getByRole("button", { name: /^Add to calendar: Fractions test, Friday, / }));
    expect(within(card).getByRole("status")).toHaveTextContent("Added");
    expect(read().events).toEqual([expect.objectContaining({ profileId: "p1", title: "Fractions test", kind: "test", source: "tutor" })]);

    await user.type(screen.getByRole("textbox"), "I have a fractions test on Friday{Enter}");
    await waitFor(() => expect(screen.getAllByRole("article", { name: "Fractions test" })).toHaveLength(2));
    for (const c of screen.getAllByRole("article", { name: "Fractions test" })) expect(within(c).queryByRole("button", { name: /^Add to calendar/ })).not.toBeInTheDocument();
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
    expect(await screen.findByRole("button", { name: "Give me a hint" })).toBeInTheDocument();
    expect(screen.queryByText(item.hints[0])).not.toBeInTheDocument();
    expect(read().acts.filter((a) => a.kind === "tutor")).toEqual([]);
    await tabTo(user, screen.getByRole("button", { name: "Give me a hint" }));
    await user.keyboard("{Enter}");
    expect(await screen.findByText(item.hints[0])).toBeInTheDocument();
    await waitFor(() => expect(read().acts.filter((a) => a.kind === "tutor")).toEqual([expect.objectContaining({ profileId: "p1", intent: "next-try-right", skillId: "m.frac.addlike" })]));
    await user.click(screen.getByRole("button", { name: "Show a similar one" }));
    expect(await screen.findByText("Now try yours the same way.")).toBeInTheDocument();
    await act(async () => {});
    expect(read().acts.filter((a) => a.kind === "tutor")).toEqual([expect.objectContaining({ skillId: "m.frac.addlike" })]);
  });

  it("opening a problem chat is neutral; help is admitted before instructional text appears", async () => {
    const released: string[] = [];
    const beforeHelp = vi.fn((id: string) => {
      expect(screen.queryByText(item.hints[0])).not.toBeInTheDocument();
      released.push(id);
      return true;
    });
    render(<TutorChat setup={{ learner: learner({ grade: "4" }), surface: "practice", item, tries: 0, title: "Fractions", beforeHelp }} />);
    expect(await screen.findByRole("button", { name: "Give me a hint" })).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(item.hints[0].slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).not.toBeInTheDocument();
    expect(beforeHelp).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Give me a hint" }));
    expect(await screen.findByText(item.hints[0])).toBeInTheDocument();
    expect(released).toHaveLength(1);
  });

  it("refused help is neither displayed nor saved to the transcript", async () => {
    render(<TutorChat setup={{ learner: learner({ grade: "4" }), surface: "practice", item, tries: 0, title: "Fractions", beforeHelp: () => false }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Give me a hint" }));
    await act(async () => {});
    expect(screen.queryByText(item.hints[0])).not.toBeInTheDocument();
    expect(read().threads.flatMap((thread) => thread.lines).some((line) => line.text.includes(item.hints[0]))).toBe(false);
  });
});
