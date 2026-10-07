import "server-only";
import { gateway, wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";

// Which AI runs, decided once per deployment from its environment. No silent fallback: if the
// configured provider fails, the tutor says so; it never switches to another provider on its own.
//
//   ANTHROPIC_API_KEY                 → Anthropic directly (preferred). On Vercel it also needs
//                                       KAIZEN_AI=anthropic, so keys left in the project by earlier
//                                       attempts stay inert until someone means to use them.
//   AI_GATEWAY_API_KEY                → Vercel AI Gateway, Anthropic models only
//   KAIZEN_AI=gateway (on Vercel)     → AI Gateway with the deployment's own OIDC token
//   none of these                     → demo: the scripted tutor and template lessons
//
// Requests always go to Anthropic's own API address; an inherited ANTHROPIC_BASE_URL is ignored so
// learners' messages can't be routed through an unknown relay.
//
// Model per job, overridable: KAIZEN_MODEL_TALK, KAIZEN_MODEL_BUILD, KAIZEN_MODEL_QUICK.

export type AiMode = "anthropic" | "gateway" | "demo";
export type Role = "talk" | "build" | "quick";

export function aiMode(): AiMode {
  const onVercel = !!process.env.VERCEL;
  if (process.env.ANTHROPIC_API_KEY && (!onVercel || process.env.KAIZEN_AI === "anthropic")) return "anthropic";
  if (process.env.AI_GATEWAY_API_KEY || (process.env.KAIZEN_AI === "gateway" && onVercel)) return "gateway";
  return "demo";
}

const ANTHROPIC_API = "https://api.anthropic.com/v1";

const DEFAULTS: Record<Role, { anthropic: string; gateway: string }> = {
  talk: { anthropic: "claude-sonnet-5-5", gateway: "anthropic/claude-sonnet-5.5" },
  build: { anthropic: "claude-opus-5-5", gateway: "anthropic/claude-opus-5.5" },
  quick: { anthropic: "claude-haiku-4-5", gateway: "anthropic/claude-haiku-4.5" },
};

const ENV: Record<Role, string> = { talk: "KAIZEN_MODEL_TALK", build: "KAIZEN_MODEL_BUILD", quick: "KAIZEN_MODEL_QUICK" };

/** One model call's tokens as the provider reported them, or estimated when a stream stopped early. */
export type TokenUsage = { input: number; output: number; cacheRead: number; cacheWrite: number; estimated?: boolean };

/** Hears about every model call a request makes (lib/server/budget.ts `meter`). */
export type Meter = { start(): void; usage(modelId: string, u: TokenUsage): void };

/** The model for a job; with a meter, every call it makes is counted toward the spend caps. */
export async function model(role: Role, meter?: Meter): Promise<LanguageModel | null> {
  const mode = aiMode();
  if (mode === "demo") return null;
  const override = process.env[ENV[role]];
  if (mode === "anthropic") {
    // The SDK builds a default client from ANTHROPIC_BASE_URL when it loads; an inherited empty or
    // foreign value must not reach it. Loaded only when Anthropic is actually the provider.
    delete process.env.ANTHROPIC_BASE_URL;
    const { createAnthropic } = await import("@ai-sdk/anthropic");
    const m = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: ANTHROPIC_API })(override ?? DEFAULTS[role].anthropic);
    return meter ? metered(m, meter) : m;
  }
  const id = override ?? DEFAULTS[role].gateway;
  // Gateway models are limited to Anthropic's, matching the product's model policy.
  const m = gateway(id.startsWith("anthropic/") ? id : DEFAULTS[role].gateway);
  return meter ? metered(m, meter) : m;
}

type Wrappable = Parameters<typeof wrapLanguageModel>[0]["model"];
type Usage = Awaited<ReturnType<NonNullable<LanguageModelMiddleware["wrapGenerate"]>>>["usage"];
type StreamPart = Awaited<ReturnType<NonNullable<LanguageModelMiddleware["wrapStream"]>>>["stream"] extends ReadableStream<infer P> ? P : never;

/** Roughly four characters per token; only used when the provider never reported usage. */
const tokensIn = (chars: number) => Math.ceil(chars / 4);

function fromProvider(u: Usage | undefined, sentChars: number, seenChars: number): TokenUsage {
  const cacheRead = u?.inputTokens.cacheRead ?? 0;
  const cacheWrite = u?.inputTokens.cacheWrite ?? 0;
  const total = u?.inputTokens.total;
  if (total === undefined) return { input: tokensIn(sentChars), output: tokensIn(seenChars), cacheRead: 0, cacheWrite: 0, estimated: true };
  return { input: u!.inputTokens.noCache ?? Math.max(0, total - cacheRead - cacheWrite), output: u!.outputTokens.total ?? tokensIn(seenChars), cacheRead, cacheWrite };
}

/** Wraps a model so each call is reported to the meter: the turn when it starts, the tokens when it ends. */
export function metered(m: Wrappable, meter: Meter) {
  return wrapLanguageModel({
    model: m,
    middleware: {
      wrapGenerate: async ({ doGenerate, params, model: inner }) => {
        meter.start();
        const r = await doGenerate();
        meter.usage(inner.modelId, fromProvider(r.usage, JSON.stringify(params.prompt).length, 0));
        return r;
      },
      wrapStream: async ({ doStream, params, model: inner }) => {
        meter.start();
        const sent = JSON.stringify(params.prompt).length;
        const r = await doStream();
        const reader = r.stream.getReader();
        let seen = 0;
        let reported = false;
        const report = (u?: Usage) => {
          if (reported) return;
          reported = true;
          meter.usage(inner.modelId, fromProvider(u, sent, seen));
        };
        // A learner can stop a reply mid-stream; the tokens sent so far still cost, so they are estimated.
        const stream = new ReadableStream<StreamPart>({
          async pull(c) {
            try {
              const { done, value } = await reader.read();
              if (done) return (report(), c.close());
              if (value.type === "text-delta" || value.type === "reasoning-delta" || value.type === "tool-input-delta") seen += value.delta.length;
              if (value.type === "finish") report(value.usage);
              c.enqueue(value);
            } catch (err) {
              report();
              c.error(err);
            }
          },
          cancel(reason) {
            report();
            return reader.cancel(reason);
          },
        });
        return { ...r, stream };
      },
    },
  });
}
