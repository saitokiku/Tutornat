import { DefaultChatTransport, readUIMessageStream, simulateReadableStream, wrapLanguageModel, type UIMessage, type UIMessageChunk } from "ai";
import { POST } from "@/app/api/tutor/route";
import { sendAi } from "@/lib/ai/client";
import { metered, type TokenUsage } from "@/lib/ai/config";
import { band } from "@/lib/ai/prompts";
import { screen } from "@/lib/ai/safety";
import { capMessage, costUsd } from "@/lib/server/budget";
import { getSkill, makeItem } from "@/practice/skills";
import type { Case } from "./cases";
import { answersOf, checkTurn, type Check, type Secret } from "./checks";
import type { Judge, Judged } from "./judge";
import { withRouteModel } from "./route-model";

// Runs one scripted conversation the way the browser and the server run it: the chat transport
// TutorChat uses, sending through the browser's own aiFetch code (sendAi: the opaque ids, every
// family name out, a message the safety screen catches sent as typed), into the real tutor route
// (spend gate, rate limit, safety screen, context, system prompt, tools, streaming, metering). It
// records what each turn sent, said, called, cost and how long the first words took.

export type Model = Parameters<typeof wrapLanguageModel>[0]["model"];
export type ToolUse = { name: string; input: unknown; output: unknown };

export type TurnResult = {
  say: string;
  /** What the browser sent of the learner's message, after taking the family's names out. */
  sent: string;
  reply: string;
  flag?: string;
  /** Message metadata from a spend cap ("day" | "month"). */
  budget?: string;
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

const hex = () => crypto.randomUUID().replace(/-/g, "");
// Each conversation comes from its own address, so the per-address rate limit and ceiling are the
// conversation's own, as they are for a family.
let hosts = 0;
const address = () => `10.77.${Math.floor(++hosts / 250)}.${hosts % 250}`;

export function tagsOf(c: Case): string[] {
  const skill = c.context.item ? getSkill(c.context.item.skillId) : undefined;
  const tags = [band(c.context.grade), c.context.locale, c.context.surface, skill?.subject ?? "open"];
  if (c.turns.some((t) => t.safety)) tags.push("safety");
  if (c.extra || c.grownups || c.turns.some((t) => t.say.includes(c.nickname))) tags.push("name");
  if (c.env) tags.push("cap");
  return tags;
}

/** Sets the case's server settings for the length of `fn`. */
async function withEnv<T>(env: Record<string, string> | undefined, fn: () => Promise<T>): Promise<T> {
  const before = Object.fromEntries(Object.keys(env ?? {}).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(before)) if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

/** `plain`: send as a screen that does not use aiFetch does today (plain fetch: no ids, nothing scrubbed). */
export type RunOptions = { priceAs?: string; judge?: Judge; plain?: boolean };

export async function runCase(c: Case, base: Model, opts: RunOptions = {}): Promise<CaseResult> {
  return withEnv(c.env, () => run(c, base, opts));
}

async function run(c: Case, base: Model, opts: RunOptions): Promise<CaseResult> {
  const item = c.context.item ? makeItem(c.context.item.skillId, c.context.item.level, c.context.item.seed, c.context.locale) : null;
  const names = [c.nickname, ...(c.grownups ?? [])];
  const secrets: Secret[] = [{ text: c.nickname, asName: c.wordName }, ...(c.secret ?? []).map((text) => ({ text }))];
  const ids = { "x-kaizen-learner": hex(), "x-kaizen-account": hex(), "x-kaizen-day": new Date().toISOString().slice(0, 10) };
  const from = address();

  // What the browser sent (after its own scrubbing), and what the route answered with.
  let browserSent: { messages: UIMessage[] } | null = null;
  let status = 0;
  const server: typeof fetch = async (input, init) => {
    let body = init?.body;
    if (typeof body === "string") {
      browserSent = JSON.parse(body) as { messages: UIMessage[] };
      // `extra`: fields a careless browser adds after scrubbing, to prove the server drops them itself.
      if (c.extra) body = JSON.stringify({ ...browserSent, context: { ...(browserSent as { context?: object }).context, ...c.extra } });
    }
    const headers = new Headers(init?.headers);
    headers.set("x-forwarded-for", from);
    const res = await POST(new Request(new URL(String(input), "http://eval.local"), { ...init, headers, body }));
    status = res.status;
    return res;
  };
  const transport = new DefaultChatTransport<UIMessage>({ api: "/api/tutor", fetch: opts.plain ? server : (input, init) => sendAi(input, init ?? {}, names, ids, server) });

  const messages: UIMessage[] = [];
  const turns: TurnResult[] = [];
  const seen: string[] = [item?.say ?? "", c.context.lastAnswer ?? "", c.context.lesson?.scene ?? "", c.context.homework ? `${c.context.homework.title} ${c.context.homework.notes ?? ""}` : ""];
  let tried = (c.context.tries ?? 0) > 0;
  const hints: { text: string; last: boolean }[] = [];

  for (const [i, turn] of c.turns.entries()) {
    messages.push({ id: `u${i}`, role: "user", parts: [{ type: "text", text: turn.say }] });
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
    const watched = metered(captured, {
      start: () => modelCalls++,
      usage: (id, u) => {
        usage = plus(usage, u);
        cost += costUsd(opts.priceAs ?? id, u);
      },
    });

    browserSent = null;
    status = 0;
    const sentAt = performance.now();
    let ttftMs: number | null = null;
    const chunks: UIMessageChunk[] = [];
    await withRouteModel(
      (_role, meter) => (meter ? metered(watched, meter) : watched),
      async () => {
        try {
          const stream = await transport.sendMessages({ trigger: "submit-message", chatId: c.id, messageId: undefined, messages, abortSignal: undefined, body: { context: c.context } });
          const reader = stream.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (ttftMs === null && value.type === "text-delta") ttftMs = performance.now() - sentAt;
            chunks.push(value);
          }
        } catch {
          // The route answered with an error status; it is recorded below.
        }
      },
    );
    const ms = performance.now() - sentAt;

    let reply = "";
    let flag: string | undefined;
    let budget: string | undefined;
    let tools: ToolUse[] = [];
    let message: UIMessage | undefined;
    for await (const m of readUIMessageStream({ stream: simulateReadableStream({ chunks }) })) message = m;
    if (message) {
      messages.push({ ...message, id: message.id || `a${i}` });
      reply = message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join(" ").replace(/\s+/g, " ").trim();
      ({ flag, budget } = (message.metadata as { flag?: string; budget?: string } | undefined) ?? {});
      tools = message.parts.flatMap((p) => {
        const part = p as { type: string; input?: unknown; output?: unknown };
        return part.type.startsWith("tool-") ? [{ name: part.type.slice(5), input: part.input, output: part.output }] : [];
      });
    }
    const sentMessages = (browserSent as { messages: UIMessage[] } | null)?.messages ?? [];
    const sent = ((sentMessages.at(-1)?.parts[0] as { text?: string } | undefined)?.text ?? "").trim();
    seen.push(sent);
    seen.push(...tools.map((t) => JSON.stringify([t.input, t.output])));

    const given = tools.flatMap((t) => {
      const o = t.output as { hint?: unknown; last?: unknown } | undefined;
      return t.name === "next_hint" && typeof o?.hint === "string" ? [{ text: o.hint, last: o.last === true }] : [];
    });
    const hint = given.length ? { text: given.at(-1)!.text, earlier: [...hints] } : undefined;
    hints.push(...given);

    // The referral is decided from what the learner typed, so a browser that hid the words fails here.
    const s = screen(turn.say, c.context.locale);
    const checks = checkTurn({
      locale: c.context.locale,
      young: band(c.context.grade) === "young",
      reply,
      flag,
      budget,
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
      capped: turn.capped && { scope: turn.capped, message: capMessage("talk", turn.capped, c.context.locale), card: !!(c.context.item ?? c.context.working?.length) },
      modelCalls,
      request: requests.join("\n"),
      names: secrets,
      sent,
      keep: turn.keep,
    });
    if (status !== 200) checks.push({ id: "short", pass: false, detail: `the tutor route answered ${status}` });
    const judged =
      opts.judge && !turn.safety && !turn.capped && reply
        ? await opts.judge({ grade: c.context.grade, locale: c.context.locale, problem: item?.say ?? null, answer: item ? answersOf(item) : [], tried, transcript: sentMessages.slice(0, -1), said: sent, reply, tools })
        : undefined;
    turns.push({ say: turn.say, sent, reply, flag, budget, status, tools, modelCalls, ttftMs, ms, usage, costUsd: cost, checks, judge: judged, pass: checks.every((k) => k.pass) });
  }
  return { id: c.id, title: c.title, tags: tagsOf(c), turns, pass: turns.every((t) => t.pass) };
}
