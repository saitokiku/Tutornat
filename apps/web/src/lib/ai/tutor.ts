import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { TutorContext } from "./context";
import { systemPrompt } from "./prompts";
import { screen } from "./safety";
import { tutorTools } from "./tools";

// One tutor turn. The safety screen runs first and can answer without any model. Kept free of
// provider setup so tests can pass a mock model.

export const LIMITS = { messages: 40, chars: 2000 };

/** A fixed reply streamed in the same format as a model reply, so the browser shows it the same way. */
export function fixedReply(text: string, flag?: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageMetadata: flag ? { flag } : undefined });
      writer.write({ type: "text-start", id: "fixed" });
      writer.write({ type: "text-delta", id: "fixed", delta: text });
      writer.write({ type: "text-end", id: "fixed" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

const lastText = (m: UIMessage | undefined) =>
  (m?.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ");

export type TutorRequest = { messages: UIMessage[]; context: unknown };

export async function tutorTurn(body: TutorRequest, model: LanguageModel): Promise<Response> {
  const parsed = TutorContext.safeParse(body.context);
  if (!parsed.success || !Array.isArray(body.messages)) return Response.json({ error: "bad_request" }, { status: 400 });
  const ctx = parsed.data;
  const messages = body.messages.slice(-LIMITS.messages);
  const last = messages.at(-1);
  if (last?.role === "user") {
    const said = lastText(last);
    if (said.length > LIMITS.chars) return Response.json({ error: "too_long" }, { status: 413 });
    const s = screen(said, ctx.locale);
    if (s.kind !== "ok") return fixedReply(s.reply, s.kind);
  }
  const result = streamText({
    model,
    system: systemPrompt(ctx),
    messages: await convertToModelMessages(messages),
    tools: tutorTools(ctx),
    stopWhen: isStepCount(5),
    maxOutputTokens: 700,
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
