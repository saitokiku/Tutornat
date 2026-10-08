import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type StopCondition,
  type UIMessage,
} from "ai";
import { check } from "@/practice/answer";
import { getSkill, makeItem } from "@/practice/skills";
import { readSpoken, spokenIntent, voiceAnswerable } from "@/practice/spoken";
import { daysBetween, fromLocalDate, localDate } from "@/planner/dates";
import { TutorContext } from "./context";
import { systemParts } from "./prompts";
import { screen } from "./safety";
import { hintsGiven, tutorTools, type TutorTools } from "./tools";

// One tutor turn. The safety screen runs first and can answer without any model. Kept free of
// provider setup so tests can pass a mock model.
//
// A spoken turn follows the cascade (live tutor spec §2.1; the only path for minors): speech-to-text
// in the browser → this safety screen → names already taken out by the browser (aiFetch) → one model
// call → text-to-speech, which takes names out again. A spoken answer to a practice problem is read
// and checked here, in code, before the model call, so the reply needs that one call and no
// check_answer step.

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
  // The model sees a photo only on the turn it came with and the one right after (a follow-up about
  // it); once the learner has moved on, older photos stay out of view and the photo rules stop.
  const users = messages.flatMap((m, i) => (m.role === "user" ? [i] : []));
  if (newest < 0 || !users.slice(-2).includes(newest)) return { messages: messages.map(withoutFiles), hasPhoto: false };
  return { messages: messages.map((m, i) => (i === newest ? m : withoutFiles(m))), hasPhoto: true };
}

const withoutFiles = (m: UIMessage): UIMessage => (m.parts.some((p) => p.type === "file") ? { ...m, parts: m.parts.filter((p) => p.type !== "file") } : m);

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

/**
 * `hintsSeen`: hints the learner already opened on the problem in practice, so next_hint continues past
 * them. `today`: the learner's calendar day (YYYY-MM-DD) from their browser, so "on Friday" becomes the
 * right date.
 */
export type TutorRequest = { messages: UIMessage[]; context: unknown; hintsSeen?: unknown; today?: unknown };

/** A count the browser sent, made safe: a whole number from 0 to 5, else 0. */
const hintCount = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(5, Math.max(0, Math.floor(v))) : 0);

/** The learner's day as the browser sent it, if it is a real date within a day of ours (time zones); else ours. */
export function learnerToday(v: unknown, now = Date.now()): string {
  const ours = localDate(now);
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || localDate(fromLocalDate(v)) !== v) return ours;
  return Math.abs(daysBetween(ours, v)) <= 1 ? v : ours;
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Today, for working out the dates the learner mentions. */
export const todayLine = (today: string) =>
  `Today is ${WEEKDAY[fromLocalDate(today).getDay()]}, ${today}. Work out any day the learner mentions ("Friday", "tomorrow", "next week") from today. A school date for add_to_calendar is today or later, as YYYY-MM-DD; if they didn't say which day, ask.`;

/** Tools whose execute only echoes their input for the board: a step made only of these leaves the model nothing to read. */
export const BOARD_TOOLS = ["show_visual", "start_practice", "add_to_calendar", "note_for_grownup", "offer_replies"] as const;

/**
 * Stop after a step whose tool calls are all board tools, once the reply has its words ("Words first;
 * board tools go after your words"): another model call would only add latency. A board tool that
 * leads (a picture before any words) still gets its words, and one that sent back a note to act on
 * (a date it couldn't offer) gets read.
 */
export const afterBoardOnly: StopCondition<TutorTools> = ({ steps }) => {
  const last = steps.at(-1);
  if (!last || !last.toolCalls.length || !last.toolCalls.every((c) => (BOARD_TOOLS as readonly string[]).includes(c.toolName))) return false;
  if (!steps.some((s) => s.text.trim())) return false;
  return last.toolResults.every((r) => !(r.output && typeof r.output === "object" && "note" in r.output));
};

/**
 * A judgment that may decline (live tutor spec §2.5, models spec): "abstain" (couldn't tell what was
 * said, or it wasn't an answer) and "unavailable" (this can't be judged by voice at all) are never
 * turned into "wrong" or "right".
 */
export type JudgmentResult<T> = { status: "ok"; value: T } | { status: "abstain" | "unavailable"; reason: string; hint?: string | null };

export type SpokenVerdict = {
  transcript: string;
  /** What it was read as ("7", "3/4", "3:30", a choice's label). */
  reading: string;
  verdict: "correct" | "not-yet" | "form";
  /** The next vetted hint, when it wasn't right. */
  hint: string | null;
};

/**
 * The spoken turn on the problem on screen, checked by code: rebuilt from (skill, level, seed), read
 * by practice/spoken.ts, decided by practice/answer.ts check(). `given`: hints already given.
 *  - ok: an answer, with the verdict (and the next vetted hint when it isn't right);
 *  - abstain "unparsed": a try at an answer that couldn't be read (say it again, never "wrong");
 *  - abstain "dont-know": "I don't know", "no sé": the next vetted hint, to be turned into a choice;
 *  - abstain "talk": a question or a request ("what does plus mean?"): no verdict at all;
 *  - unavailable: no problem, or one voice can't answer ("type-it").
 */
export function spokenPrecheck(ctx: TutorContext, said: string, given: number): JudgmentResult<SpokenVerdict> {
  if (!ctx.item || !getSkill(ctx.item.skillId)) return { status: "unavailable", reason: "no-item" };
  const item = makeItem(ctx.item.skillId, ctx.item.level, ctx.item.seed, ctx.locale);
  if (!voiceAnswerable(ctx.item.skillId, item)) return { status: "unavailable", reason: "type-it" };
  const next = item.hints[Math.min(given, item.hints.length - 1)] ?? null;
  const r = readSpoken(said, item, ctx.locale);
  if (!r) {
    const intent = spokenIntent(said, item, ctx.locale);
    if (intent === "dont-know") return { status: "abstain", reason: "dont-know", hint: next };
    return { status: "abstain", reason: intent === "answer" ? "unparsed" : "talk" };
  }
  const v = check(item.answer, r.response);
  const verdict = v.correct ? "correct" : v.form ? "form" : "not-yet";
  return { status: "ok", value: { transcript: said, reading: r.reading, verdict, hint: verdict === "correct" ? null : next } };
}

/** The vetted hint the precheck put in the prompt this turn (counted as given), or null. */
export const precheckHint = (p: JudgmentResult<SpokenVerdict> | null) => (!p ? null : p.status === "ok" ? p.value.hint : p.reason === "dont-know" ? (p.hint ?? null) : null);

/** The precheck read and judged what was said (or said it can't be), so the model has nothing to check or look up for it. */
export const judgedAnswer = (p: JudgmentResult<SpokenVerdict> | null) => !!p && (p.status === "ok" || p.reason === "unparsed" || p.reason === "dont-know" || p.reason === "type-it");

const VERDICT = { correct: "correct", "not-yet": "not yet", form: "right value, not in simplest form" } as const;
const quote = (s: string) => s.replace(/["\r\n]+/g, " ").trim().slice(0, 200);

/** The lines a precheck adds to the system prompt. */
export function precheckPrompt(p: JudgmentResult<SpokenVerdict>): string {
  if (p.status !== "ok") {
    if (p.reason === "unparsed") return "You couldn't tell what they said as an answer. Ask them to say it again or tap it in. Never call it wrong.";
    if (p.reason === "dont-know")
      return p.hint ? `They said they don't know. Turn this vetted hint into a choice between two options, and point at the part it is about (don't call next_hint this turn): "${quote(p.hint)}"` : "They said they don't know. Offer a choice between two options about the problem.";
    return p.reason === "type-it" ? "This problem can't be answered out loud: spelling, capitals and punctuation need the pad. Ask them to tap or type the answer. Don't judge what they said." : "";
  }
  const { transcript, reading, verdict, hint } = p.value;
  return [
    `The learner answered by voice: "${quote(transcript)}". Read as ${reading}. The checker says: ${VERDICT[verdict]}. This is final: do not call check_answer for this answer.`,
    hint ? `If they need a hint, use this vetted hint (don't call next_hint this turn): "${quote(hint)}"` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

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
  const today = learnerToday(body.today);
  const voice = ctx.input === "voice";
  const given = (ctx.item ? hintCount(body.hintsSeen) : 0) + hintsGiven(messages);
  // A spoken answer is checked here, after the safety screen and before the model.
  const pre = voice && ctx.item && last?.role === "user" ? spokenPrecheck(ctx, lastText(last), given) : null;
  const supplied = precheckHint(pre);
  const gaveHint = supplied ? 1 : 0;
  // Judged in code (right, not yet, couldn't tell, "I don't know", "type it"): the prompt no longer
  // invites a check_answer or next_hint step, so the reply is one model call.
  const { stable, voice: voiceBlock, turn } = systemParts(ctx, { judged: judgedAnswer(pre) });
  const perTurn = [turn, todayLine(today), photos.hasPhoto ? PHOTO_RULES : "", pre ? precheckPrompt(pre) : ""].filter(Boolean).join("\n\n");
  // Everything the learner typed, message by message: a worked example never has the numbers of one.
  const typed = messages.filter((m) => m.role === "user").map((m) => lastText(m).slice(0, LIMITS.chars)).filter(Boolean);
  // The same tools every turn, typed or spoken, so the provider's cached prefix (tools, then the
  // system parts) holds across turns. A stray check_answer still checks in code (and reads spoken
  // forms); a stray next_hint on a turn whose hint is already in the prompt gives that same hint.
  const tools = tutorTools(ctx, { hintsGiven: given + gaveHint, typed, today, supplied: supplied ?? undefined });
  const cache = { anthropic: { cacheControl: { type: "ephemeral" as const } } };
  const result = streamText({
    model,
    // The rules, tools, band and language are the same every turn: cached by the provider. The voice
    // rules have their own breakpoint after them, so switching between typing and talking keeps the
    // first part's cache.
    system: [
      { role: "system", content: stable, providerOptions: cache },
      ...(voiceBlock ? [{ role: "system" as const, content: voiceBlock, providerOptions: cache }] : []),
      { role: "system", content: perTurn },
    ],
    messages: await convertToModelMessages(photos.messages),
    tools,
    stopWhen: [isStepCount(5), afterBoardOnly],
    maxOutputTokens: voice ? 300 : 700,
  });
  // A vetted hint given through the precheck is marked on the reply, so the next turn's ladder continues after it.
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream, messageMetadata: ({ part }) => (gaveHint && part.type === "start" ? { hintGiven: 1 } : undefined) }) });
}
