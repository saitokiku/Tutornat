import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/types";
import { installSpeech } from "@/components/stage/speech-fake";
import { TutorChat } from "./TutorChat";

const chat = vi.hoisted(() => ({ messages: [] as UIMessage[], sendMessage: vi.fn(), stop: vi.fn(), setMessages: vi.fn() }));
vi.mock("@ai-sdk/react", () => ({ useChat: () => ({ ...chat, status: "ready", error: undefined }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/ai/client", async (original) => ({ ...await original<typeof import("@/lib/ai/client")>(), useAiMode: () => "anthropic" }));

const learner: Profile = { id: "p", accountId: "a", nickname: "Ada", grade: "K", locale: "en", color: "#000", createdAt: 0 };
const reply = "Split it into four parts";
function modelReply(withText: boolean) {
  chat.messages = [{ id: "instruction", role: "assistant", parts: [
    ...(withText ? [{ type: "text" as const, text: "Try splitting the shape." }] : []),
    { type: "tool-offer_replies", toolCallId: "reply-1", state: "output-available", input: { replies: [reply] }, output: { ok: true } },
  ] }];
}
beforeEach(() => vi.clearAllMocks());

describe("AI suggested-reply admission", () => {
  for (const withText of [true, false]) it(`withholds model reply buttons and audio when help admission fails (${withText ? "text" : "reply only"})`, async () => {
    modelReply(withText);
    const speech = installSpeech();
    const beforeHelp = vi.fn((): true | "stale" => "stale");
    render(<TutorChat setup={{ learner, surface: "lesson", lesson: { title: "Parts", scene: "A square." }, title: "Parts", beforeHelp }} />);
    expect(screen.queryByRole("button", { name: reply })).toBeNull();
    await waitFor(() => expect(beforeHelp).toHaveBeenCalledWith("instruction"));
    expect(screen.queryByRole("button", { name: reply })).toBeNull();
    expect(speech.spoken.map((u) => u.text)).not.toContain(reply);
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("releases a reply-only button after its originating entry is admitted", async () => {
    modelReply(false);
    const beforeHelp = vi.fn((): true => true);
    render(<TutorChat setup={{ learner, surface: "lesson", lesson: { title: "Parts", scene: "A square." }, title: "Parts", beforeHelp }} />);
    const button = await screen.findByRole("button", { name: reply });
    expect(beforeHelp).toHaveBeenCalledWith("instruction");
    await userEvent.click(button);
    expect(chat.sendMessage).toHaveBeenCalled();
  });
});
