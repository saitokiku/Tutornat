import { readUIMessageStream, simulateReadableStream, wrapLanguageModel, type UIMessage, type UIMessageChunk } from "ai";
import { scrubNames } from "@/lib/ai/client";
import { metered, type TokenUsage } from "@/lib/ai/config";
import { band } from "@/lib/ai/prompts";
import { screen } from "@/lib/ai/safety";
import { tutorTurn } from "@/lib/ai/tutor";
import { costUsd } from "@/lib/server/budget";
import { getSkill, makeItem } from "@/practice/skills";
import type { Case } from "./cases";
import { answersOf, checkTurn, type Check } from "./checks";
import type { Judge, Judged } from "./judge";

// Runs one scripted conversation through the real server path (lib/ai/tutor.ts tutorTurn: context
// parsing, safety screen, system prompt, tools, streaming) the way the browser drives it, and
// records what each turn sent, said, called, cost and how long the first words took.

export type Model = Parameters<typeof wrapLanguageModel>[0]["model"];
export type ToolUse = { name: string; input: unknown; output: unknown };

export type TurnResult = {
  say: string;
  /** What the browser sent after taking the learner's name out. */
  sent: string;
  reply: string;
  flag?: string;
  status: number;
  tools: ToolUse[];
  modelCalls: number;
  /** Milliseconds from sending to the first words of the reply. */
  ttftMs: number | null;
  ms: number;
  usage: TokenUsage;
  costUsd: number;
  checks: Check[];
  judge?: Judged;
  pass: boolean;
};

export type CaseResult = { id: string; title: string; tags: string[]; turns: TurnResult[]; pass: boolean };

const ZERO: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const plus = (a: TokenUsage, b: TokenUsage): TokenUsage => ({ input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite, estimated: a.estimated || b.estimated || undefined });

/** Reads a UI message stream response (server-sent events), noting when the first words arrive. */
async function readReply(res: Response, sentAt: number): Promise<{ chunks: UIMessageChunk[]; ttftMs: number | null }> {
  const chunks: UIMessageChunk[] = [];
  let ttftMs: number | null = null;
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += value;
    let end: number;
    while ((end = buf.indexOf("\n\n")) >= 0) {
      const event = buf.slice(0, end);
      buf = buf.slice(end + 2);
      for (const line of event.split("\n")) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        const chunk = JSON.parse(line.slice(6)) as UIMessageChunk;
        if (ttftMs === null && chunk.type === "text-delta") ttftMs = performance.now() - sentAt;
        chunks.push(chunk);
      }
    }
  }
  return { chunks, ttftMs };
}

export function tagsOf(c: Case): string[] {
  const skill = c.context.item ? getSkill(c.context.item.skillId) : undefined;
  const tags = [band(c.context.grade), c.context.locale, c.context.surface, skill?.subject ?? "open"];
  if (c.turns.some((t) => t.safety)) tags.push("safety");
  if (c.extra || c.turns.some((t) => t.say.includes(c.nickname))) tags.push("name");
  return tags;
}

export async function runCase(c: Case, base: Model, opts: { priceAs?: string; judge?: Judge } = {}): Promise<CaseResult> {
  const item = c.context.item ? makeItem(c.context.item.skillId, c.context.item.level, c.context.item.seed, c.context.locale) : null;
  // The browser's side of the contract, with the browser's own code: aiFetch (lib/ai/client.ts) runs
  // scrubNames over the whole request body. `extra` is added after it, as fields a careless browser
  // might send unscrubbed, to prove the server drops them on its own.
  const scrub = <T,>(v: T) => scrubNames(v, [c.nickname]);
  const context = { ...scrub(c.context), ...c.extra };
  const messages: UIMessage[] = [];
  const turns: TurnResult[] = [];
  const seen: string[] = [item?.say ?? "", c.context.lastAnswer ?? "", c.context.lesson?.scene ?? "", c.context.homework ? `${c.context.homework.title} ${c.context.homework.notes ?? ""}` : ""];
  let tried = (c.context.tries ?? 0) > 0;
  const hints: { text: string; last: boolean }[] = [];

  for (const [i, turn] of c.turns.entries()) {
    messages.push({ id: `u${i}`, role: "user", parts: [{ type: "text", text: turn.say }] });
    const body = scrub({ messages });
    const sent = (body.messages.at(-1)!.parts[0] as { text: string }).text;
    seen.push(sent);
    tried ||= !!turn.attempt;

    const requests: string[] = [];
    let usage = ZERO;
    let cost = 0;
    let modelCalls = 0;
    const captured = wrapLanguageModel({
      model: base,
      middleware: {
        transformParams: async ({ params }) => {
          requests.push(JSON.stringify({ prompt: params.prompt, tools: params.tools }));
          return params;
        },
      },
    });
    const model = metered(captured, {
      start: () => modelCalls++,
      usage: (id, u) => {
        usage = plus(usage, u);
        cost += costUsd(opts.priceAs ?? id, u);
      },
    });

    const sentAt = performance.now();
    const res = await tutorTurn({ messages: body.messages, context }, model);
    let reply = "";
    let flag: string | undefined;
    let tools: ToolUse[] = [];
    let ttftMs: number | null = null;
    if (res.ok && res.body) {
      const read = await readReply(res, sentAt);
      ttftMs = read.ttftMs;
      let message: UIMessage | undefined;
      for await (const m of readUIMessageStream({ stream: simulateReadableStream({ chunks: read.chunks }) })) message = m;
      if (message) {
        messages.push({ ...message, id: message.id || `a${i}` });
        reply = message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join(" ").replace(/\s+/g, " ").trim();
        flag = (message.metadata as { flag?: string } | undefined)?.flag;
        tools = message.parts.flatMap((p) => {
          const part = p as { type: string; input?: unknown; output?: unknown };
          return part.type.startsWith("tool-") ? [{ name: part.type.slice(5), input: part.input, output: part.output }] : [];
        });
      }
    }
    const ms = performance.now() - sentAt;
    seen.push(...tools.map((t) => JSON.stringify([t.input, t.output])));

    const given = tools.flatMap((t) => {
      const o = t.output as { hint?: unknown; last?: unknown } | undefined;
      return t.name === "next_hint" && typeof o?.hint === "string" ? [{ text: o.hint, last: o.last === true }] : [];
    });
    const hint = given.length ? { text: given.at(-1)!.text, earlier: [...hints] } : undefined;
    hints.push(...given);

    const s = screen(sent, c.context.locale);
    const checks = checkTurn({
      locale: c.context.locale,
      young: band(c.context.grade) === "young",
      reply,
      flag,
      tried,
      answers: item ? answersOf(item) : [],
      problem: item?.say ?? "",
      sources: seen.join("\n"),
      tools: tools.map((t) => t.name),
      needsCheck: !!turn.attempt && !!item,
      expectTools: turn.tools ?? [],
      safety: turn.safety,
      hint,
      referral: s.kind === "ok" ? undefined : s.reply,
      modelCalls,
      request: requests.join("\n"),
      nickname: c.nickname,
    });
    if (!res.ok) checks.push({ id: "short", pass: false, detail: `the tutor route answered ${res.status}` });
    const judged =
      opts.judge && !turn.safety && reply
        ? await opts.judge({ grade: c.context.grade, locale: c.context.locale, problem: item?.say ?? null, answer: item ? answersOf(item) : [], tried, transcript: scrub(messages.slice(0, -1)), said: sent, reply, tools })
        : undefined;
    turns.push({ say: turn.say, sent, reply, flag, status: res.status, tools, modelCalls, ttftMs, ms, usage, costUsd: cost, checks, judge: judged, pass: checks.every((k) => k.pass) });
  }
  return { id: c.id, title: c.title, tags: tagsOf(c), turns, pass: turns.every((t) => t.pass) };
}
