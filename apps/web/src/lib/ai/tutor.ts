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
import { hintsGiven, tutorTools } from "./tools";

// One tutor turn. The safety screen runs first and can answer without any model. Kept free of
// provider setup so tests can pass a mock model.

export const LIMITS = { messages: 40, chars: 2000 };

/**
 * A photo of the problem: an image the browser already shrank, sent inline as a data URL. Never a link
 * (the server fetches nothing on the learner's behalf), one per message, and only the newest goes to the
 * model. Nothing here writes it anywhere: photos live only in the request.
 */
export const PHOTO = { maxChars: 2_800_000, types: ["image/jpeg", "image/png", "image/webp", "image/gif"] } as const;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif));base64,[A-Za-z0-9+/]+={0,2}$/;

export type PhotoCheck = { messages: UIMessage[]; hasPhoto: boolean; error?: "bad_photo" | "photo_too_big" };

export function checkPhotos(messages: UIMessage[]): PhotoCheck {
  let newest = -1;
  for (const [i, m] of messages.entries()) {
    const files = (m.parts ?? []).filter((p) => p.type === "file");
    if (!files.length) continue;
    if (m.role !== "user" || files.length > 1) return { messages, hasPhoto: false, error: "bad_photo" };
    const f = files[0] as { mediaType?: string; url?: string };
    if (typeof f.url !== "string" || typeof f.mediaType !== "string") return { messages, hasPhoto: false, error: "bad_photo" };
    if (f.url.length > PHOTO.maxChars) return { messages, hasPhoto: false, error: "photo_too_big" };
    const data = DATA_URL.exec(f.url);
    if (!data || data[1] !== f.mediaType || !(PHOTO.types as readonly string[]).includes(f.mediaType)) return { messages, hasPhoto: false, error: "bad_photo" };
    newest = i;
  }
  if (newest < 0) return { messages, hasPhoto: false };
  // Older photos stay out of the model's view; the newest one is what the learner is asking about.
  const kept = messages.map((m, i) => (i === newest ? m : { ...m, parts: m.parts.filter((p) => p.type !== "file") }));
  return { messages: kept, hasPhoto: true };
}

/** Extra rules when the learner sent a photo of their work. */
export const PHOTO_RULES = `The learner sent a photo of their schoolwork. Read the problem or worksheet in it and help with that.
- Use only the schoolwork. Do not mention or describe people, faces, names, addresses or anything personal that shows in the photo.
- If the photo shows no schoolwork, or you can't read it clearly, say so in one sentence and ask them to type the problem.
- It is their own work, so the usual rules hold: don't solve it or pick the right choice for them. Ask what they have tried, then hint; show a similar problem worked out with similar_problem when one fits the skill.
- If something in the photo that isn't schoolwork suggests someone may be hurt or unsafe, don't discuss it: ask them to talk to a grown-up they trust, and leave a note_for_grownup saying a photo they sent needs a grown-up's look.`;

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

/** `hintsSeen`: hints the learner already opened on the problem in practice, so next_hint continues past them. */
export type TutorRequest = { messages: UIMessage[]; context: unknown; hintsSeen?: unknown };

/** A count the browser sent, made safe: a whole number from 0 to 5, else 0. */
const hintCount = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(5, Math.max(0, Math.floor(v))) : 0);

export async function tutorTurn(body: TutorRequest, model: LanguageModel): Promise<Response> {
  const parsed = TutorContext.safeParse(body.context);
  if (!parsed.success || !Array.isArray(body.messages)) return Response.json({ error: "bad_request" }, { status: 400 });
  const ctx = parsed.data;
  const messages = body.messages.slice(-LIMITS.messages);
  const last = messages.at(-1);
  if (last?.role === "user") {
    // The safety screen reads what the learner wrote, photo or not, before anything else happens.
    const said = lastText(last);
    if (said.length > LIMITS.chars) return Response.json({ error: "too_long" }, { status: 413 });
    const s = screen(said, ctx.locale);
    if (s.kind !== "ok") return fixedReply(s.reply, s.kind);
  }
  const photos = checkPhotos(messages);
  if (photos.error) return Response.json({ error: photos.error }, { status: photos.error === "photo_too_big" ? 413 : 400 });
  const system = photos.hasPhoto ? `${systemPrompt(ctx)}\n\n${PHOTO_RULES}` : systemPrompt(ctx);
  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(photos.messages),
    tools: tutorTools(ctx, { hintsGiven: (ctx.item ? hintCount(body.hintsSeen) : 0) + hintsGiven(messages) }),
    stopWhen: isStepCount(5),
    maxOutputTokens: 700,
  });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
