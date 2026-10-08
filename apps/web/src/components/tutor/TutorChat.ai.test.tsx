import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { read, resetMemory, update } from "@/lib/store";
import { localDate } from "@/planner/dates";
import type { Profile } from "@/lib/types";
import { makeItem } from "@/practice/skills";
import { TutorChat } from "./TutorChat";

// The AI tutor in the browser, against a stubbed /api/tutor: a photo goes as a file part with the text,
// no name goes with it, nothing of the photo is kept in the record, and tool results land on the board.

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
vi.mock("./photo", async (original) => ({ ...(await original<typeof import("./photo")>()), shrinkPhoto: vi.fn(async () => ({ url: JPEG, mediaType: "image/jpeg" })) }));

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "6", locale: "en", color: "#000", createdAt: 0 };
const bodies: { messages: { role: string; parts: { type: string; url?: string; text?: string }[] }[]; context: Record<string, unknown>; today?: string }[] = [];
/** What /api/tutor answers next; the default is the look_up reply. */
let answer: () => Response = () => reply();

/** A streamed reply that first calls look_up (with its server result), then talks. */
function reply() {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "tool-input-available", toolCallId: "c1", toolName: "look_up", input: { topic: "ratio" } });
      writer.write({ type: "tool-output-available", toolCallId: "c1", output: { found: true, title: "Ratio", extract: "A ratio shows how many times one number contains another.", url: "https://en.wikipedia.org/wiki/Ratio", lang: "en", license: "CC BY-SA 4.0", source: "Wikipedia" } });
      writer.write({ type: "text-start", id: "t" });
      writer.write({ type: "text-delta", id: "t", delta: "What have you tried on the first one?" });
      writer.write({ type: "text-end", id: "t" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

beforeEach(() => {
  resetMemory();
  bodies.length = 0;
  answer = () => reply();
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/ai/status")) return new Response(JSON.stringify({ mode: "anthropic" }), { status: 200 });
    if (String(url).startsWith("/api/tutor")) {
      bodies.push(JSON.parse(String(init?.body)));
      return answer();
    }
    return new Response("{}", { status: 404 });
  });
});

describe("the AI tutor", () => {
  it("sends a photo of the problem with the learner's words, never their name, and draws tool results on the board", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner, surface: "talk", title: "Talk" }} />);
    await screen.findByText("What would you like to learn or work on?");
    expect(screen.queryByText(/demo tutor/)).not.toBeInTheDocument();
    expect(screen.getByText("· Replies written by AI")).toBeInTheDocument(); // AI output says so

    await user.upload(screen.getByTestId("tutor-photo"), new File(["x"], "worksheet.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText("Photo ready to send")).toBeInTheDocument();
    expect(screen.getByText("Keep your name out of the photo. The AI tutor reads it to help; KaizenEDU doesn't keep it.")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "can you check my ratio work{Enter}");

    await screen.findByText("What have you tried on the first one?");
    const sent = bodies[0];
    const last = sent.messages.at(-1)!;
    expect(last.parts).toEqual(expect.arrayContaining([expect.objectContaining({ type: "text", text: "can you check my ratio work" }), expect.objectContaining({ type: "file", url: JPEG })]));
    expect(sent.context).toMatchObject({ locale: "en", grade: "6", surface: "talk" });
    expect(JSON.stringify(sent)).not.toContain("Ada");

    expect(await screen.findByRole("article", { name: "Ratio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read the article/ })).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Ratio");

    await waitFor(() => expect(read().threads[0]?.lines.length).toBe(3));
    expect(read().threads[0].lines[1].text).toBe("Sent a photo of the problem. can you check my ratio work");
    expect(JSON.stringify(read())).not.toContain("base64"); // the photo is not kept in the record
  });

  it("a photo can be removed before sending, and only the newest photo is sent again", async () => {
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner, surface: "talk", title: "Talk" }} />);
    await screen.findByText("What would you like to learn or work on?");
    await user.upload(screen.getByTestId("tutor-photo"), new File(["x"], "a.jpg", { type: "image/jpeg" }));
    await user.click(await screen.findByRole("button", { name: "Remove the photo" }));
    expect(screen.queryByText("Photo ready to send")).not.toBeInTheDocument();

    await user.upload(screen.getByTestId("tutor-photo"), new File(["x"], "b.jpg", { type: "image/jpeg" }));
    await user.click(await screen.findByRole("button", { name: "Send" }));
    await screen.findByText("What have you tried on the first one?");
    expect(bodies[0].messages.at(-1)!.parts).toEqual(expect.arrayContaining([expect.objectContaining({ type: "text", text: "Here is a photo of my problem." })]));

    await user.type(screen.getByRole("textbox"), "the second part{Enter}");
    await waitFor(() => expect(bodies).toHaveLength(2));
    const files = bodies[1].messages.flatMap((m) => m.parts.filter((p) => p.type === "file"));
    expect(files).toHaveLength(1);
  });
});

/** A reply that asks a young learner a question and offers answers to tap. */
function replyWithTaps() {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: "t" });
      writer.write({ type: "text-delta", id: "t", delta: "How many dots do you see?" });
      writer.write({ type: "text-end", id: "t" });
      writer.write({ type: "tool-input-available", toolCallId: "r1", toolName: "offer_replies", input: { replies: ["I see 5", "I don't know"] } });
      writer.write({ type: "tool-output-available", toolCallId: "r1", output: { shown: true } });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

describe("what the AI tutor is sent", () => {
  it("no family name, even in a teacher's note or typed by the child; and the learner's today", async () => {
    update((st) => {
      st.accounts.push({ id: "a1", email: "m@example.test", displayName: "Maria Lopez", salt: "", passwordHash: "", createdAt: 0 });
      st.profiles.push(learner, { ...learner, id: "p2", nickname: "Leo" });
    });
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner, surface: "homework", homework: { title: "Ada's science fair", notes: "Ada and Leo still need the poster. Mrs. Lopez says hi." }, title: "Science fair" }} />);
    await screen.findByText(/Let's look at/);
    await user.type(screen.getByRole("textbox"), "my name is Ada and my brother is LEO{Enter}");
    await screen.findByText("What have you tried on the first one?");
    const sent = JSON.stringify(bodies[0]);
    for (const name of ["Ada", "Leo", "LEO", "Maria", "Lopez"]) expect(sent, name).not.toContain(name);
    expect(bodies[0].context).toMatchObject({ homework: { title: "[name]'s science fair", notes: "[name] and [name] still need the poster. Mrs. [name] says hi." } });
    expect(bodies[0].messages.at(-1)!.parts.find((p) => p.type === "text")?.text).toBe("my name is [name] and my brother is [name]");
    expect(screen.getByText("my name is Ada and my brother is LEO")).toBeInTheDocument(); // the screen keeps what they wrote
    expect(bodies[0].today).toBe(localDate(Date.now()));
  });

  it("a photo the server refuses is taken off, so the next turn doesn't send it again", async () => {
    answer = () => new Response(JSON.stringify({ error: "photo_too_big" }), { status: 413 });
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner, surface: "talk", title: "Talk" }} />);
    await screen.findByText("What would you like to learn or work on?");
    await user.upload(screen.getByTestId("tutor-photo"), new File(["x"], "a.jpg", { type: "image/jpeg" }));
    await screen.findByText("Photo ready to send");
    await user.type(screen.getByRole("textbox"), "number 4{Enter}");
    expect(await screen.findByText("That photo is too large to send. Try one taken closer to the problem.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("img", { name: "Your photo of the problem" })).not.toBeInTheDocument());

    answer = () => reply();
    await user.type(screen.getByRole("textbox"), "can you help with number 4{Enter}");
    await screen.findByText("What have you tried on the first one?");
    expect(bodies[1].messages.flatMap((m) => m.parts).some((p) => p.type === "file")).toBe(false);
  });

  it("beside a K–2 problem the opening is the next vetted hint, saved as help before it shows, and the ladder continues after it", async () => {
    const item = makeItem("m.add.5", 1, 7, "en");
    const beforeHelp = vi.fn((): true => true);
    const user = userEvent.setup();
    render(<TutorChat setup={{ learner: { ...learner, grade: "1" }, surface: "practice", item, hintsSeen: 1, tries: 0, title: "Adding", beforeHelp }} />);
    expect(await screen.findByText(item.hints[1])).toBeInTheDocument();
    expect(beforeHelp).toHaveBeenCalledWith("open-hint");
    await user.click(screen.getByRole("button", { name: "Give me a hint" }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect((bodies[0] as unknown as { hintsSeen: number }).hintsSeen).toBe(2);
  });

  it("a young learner taps one of the answers the tutor offers instead of typing", async () => {
    answer = () => replyWithTaps();
    const user = userEvent.setup();
    render(<TutorChat board setup={{ learner: { ...learner, grade: "K" }, surface: "talk", title: "Talk" }} />);
    const group = await screen.findByRole("group", { name: "Quick asks" });
    await user.click(within(group).getAllByRole("button")[0]);
    await screen.findByText("How many dots do you see?");
    const tap = await within(group).findByRole("button", { name: "I see 5" });
    expect(tap.className).toContain("min-h-14");
    expect(within(group).getByRole("button", { name: "I don't know" })).toBeInTheDocument();
    await user.click(tap);
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].messages.at(-1)!.parts.find((p) => p.type === "text")?.text).toBe("I see 5");
  });
});
