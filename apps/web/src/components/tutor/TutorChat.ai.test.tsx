import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { read } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { TutorChat } from "./TutorChat";

// The AI tutor in the browser, against a stubbed /api/tutor: a photo goes as a file part with the text,
// no name goes with it, nothing of the photo is kept in the record, and tool results land on the board.

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
vi.mock("./photo", async (original) => ({ ...(await original<typeof import("./photo")>()), shrinkPhoto: vi.fn(async () => ({ url: JPEG, mediaType: "image/jpeg" })) }));

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "6", locale: "en", color: "#000", createdAt: 0 };
const bodies: { messages: { role: string; parts: { type: string; url?: string; text?: string }[] }[]; context: Record<string, unknown> }[] = [];

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
  bodies.length = 0;
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (String(url).startsWith("/api/ai/status")) return new Response(JSON.stringify({ mode: "anthropic" }), { status: 200 });
    if (String(url).startsWith("/api/tutor")) {
      bodies.push(JSON.parse(String(init?.body)));
      return reply();
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

    await user.upload(screen.getByTestId("tutor-photo"), new File(["x"], "worksheet.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText("Photo ready to send")).toBeInTheDocument();
    expect(screen.getByText("The AI tutor reads the photo to help. It isn't saved.")).toBeInTheDocument();
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
