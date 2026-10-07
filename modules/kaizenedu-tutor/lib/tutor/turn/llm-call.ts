/**
 * One non-streaming model hop for the tutor: resolves the stage's model,
 * calls `callLLM` with a tutor source label, prices the usage, and writes the
 * usage ledger line (spec R8 "cost logged per turn", R9). Every hop outside
 * the live turn (grading, diagnosis, summary, profile, extraction) goes
 * through here so the ceilings see it.
 */
import type { ModelMessage } from 'ai';

import {
  tutorModelDefault,
  tutorModelForBand,
  type AgeBand,
  type TutorModelRole,
} from '@/kaizen.config';
import { callLLM, streamLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { resolveModel } from '@/lib/server/resolve-model';
import type { LlmStage } from '@/lib/server/model-routes';
import { llmCost, recordUsageLine } from '@/lib/tutor/cost';
import { TUTOR_LLM_SOURCES, type TutorLlmSource } from '@/lib/tutor/cost/sources';
import type { Queryable } from '@/lib/tutor/db';
import type { ThinkingConfig } from '@/lib/types/provider';

const log = createLogger('tutor-llm');

export interface TutorLlmScope {
  accountId: string;
  learnerId: string | null;
  sessionId: string | null;
  turnId: string | null;
}

export interface TutorLlmCallInput {
  db: Queryable;
  scope: TutorLlmScope;
  source: TutorLlmSource;
  /**
   * The learner's band, when the caller knows it. A band with an entry in
   * `TUTOR_BAND_MODEL_ROUTES` runs on that model instead of the stage's.
   */
  band?: AgeBand | null;
  system: string;
  prompt?: string;
  messages?: ModelMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  abortSignal?: AbortSignal;
}

export interface TutorLlmCallResult {
  text: string;
  modelString: string;
  inputTokens: number;
  outputTokens: number;
  /** Integer cents charged to the ledger (rounded up so the ceiling never under-counts). */
  cents: number;
  priced: boolean;
}

const STRONG_STAGES = new Set<TutorLlmSource>([
  TUTOR_LLM_SOURCES.diagnose,
  TUTOR_LLM_SOURCES.grade,
  TUTOR_LLM_SOURCES.summary,
  TUTOR_LLM_SOURCES.modelUpdate,
]);

/**
 * Which compiled-in model a stage falls back to when the host configures none.
 * The split is the same one `STRONG_STAGES` already draws: anything the
 * learner waits on out loud takes the fast model, anything that runs behind
 * the turn takes the reasoning one.
 */
export function modelRoleFor(source: TutorLlmSource): TutorModelRole {
  return STRONG_STAGES.has(source) ? 'reasoning' : 'fast';
}

/**
 * What `resolveModel` is handed for a stage. A band override
 * (`TUTOR_BAND_MODEL_ROUTES`, reference §3) is passed without the stage so it
 * beats the stage's `MODEL_ROUTES` entry; otherwise the stage route wins,
 * then `DEFAULT_MODEL`, then the compiled-in model for the role.
 */
export function tutorModelSelection(
  source: TutorLlmSource,
  band?: AgeBand | null,
): { stage?: LlmStage; modelString: string } {
  const role = modelRoleFor(source);
  const override = tutorModelForBand(role, band);
  if (override) return { modelString: override };
  return { stage: source as LlmStage, modelString: tutorModelDefault(role) };
}

/** The live turn runs with thinking off for latency; the stronger stages keep the model default. */
export function thinkingFor(
  source: TutorLlmSource,
  routed?: ThinkingConfig,
): ThinkingConfig | undefined {
  if (routed) return routed;
  if (STRONG_STAGES.has(source)) return undefined;
  return { mode: 'disabled', enabled: false };
}

export function usageTokens(usage: unknown): { inputTokens: number; outputTokens: number } {
  const u = (usage ?? {}) as { inputTokens?: unknown; outputTokens?: unknown };
  const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  return { inputTokens: num(u.inputTokens), outputTokens: num(u.outputTokens) };
}

export async function chargeUsage(
  db: Queryable,
  scope: TutorLlmScope,
  modelString: string,
  tokens: { inputTokens: number; outputTokens: number },
): Promise<{ cents: number; priced: boolean }> {
  const priced = llmCost(modelString, tokens);
  const cents = Math.ceil(priced.cents);
  const providerId = modelString.includes(':')
    ? modelString.slice(0, modelString.indexOf(':'))
    : null;
  await recordUsageLine(db, {
    accountId: scope.accountId,
    learnerId: scope.learnerId,
    sessionId: scope.sessionId,
    turnId: scope.turnId,
    kind: 'llm',
    provider: providerId,
    model: modelString,
    quantity: tokens.inputTokens + tokens.outputTokens,
    unit: 'token',
    cents,
    priced: priced.priced,
  });
  return { cents, priced: priced.priced };
}

export async function tutorCallLLM(input: TutorLlmCallInput): Promise<TutorLlmCallResult> {
  const resolved = await resolveModel(tutorModelSelection(input.source, input.band));
  const result = await callLLM(
    {
      model: resolved.model,
      system: input.system,
      ...(input.messages ? { messages: input.messages } : { prompt: input.prompt ?? '' }),
      maxOutputTokens: input.maxOutputTokens ?? 800,
      temperature: input.temperature ?? 0.2,
      ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
    },
    input.source,
    undefined,
    thinkingFor(input.source, resolved.thinkingConfig),
  );
  const tokens = usageTokens(result.totalUsage ?? result.usage);
  const charge = await chargeUsage(input.db, input.scope, resolved.modelString, tokens);
  log.debug(
    `${input.source} ${resolved.modelString} in=${tokens.inputTokens} out=${tokens.outputTokens} cents=${charge.cents}`,
  );
  return {
    text: result.text,
    modelString: resolved.modelString,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    cents: charge.cents,
    priced: charge.priced,
  };
}

/** Same inputs as a non-streaming hop; the live turn defaults to 700 output tokens. */
export type TutorLlmStreamInput = TutorLlmCallInput;

export interface TutorLlmStreamResult {
  /**
   * Text deltas as the provider produces them. Consume it exactly once. It
   * throws at the end of the stream when the provider failed: `streamText`
   * swallows provider errors so a server cannot be crashed by one, and an
   * unreported failure would reach the learner as a silent empty turn.
   */
  textStream: AsyncIterable<string>;
  modelString: string;
  /**
   * Call after the stream is drained (or abandoned): prices the usage, writes
   * the ledger line, and answers what it cost. Idempotent per result.
   */
  settle(): Promise<{
    cents: number;
    inputTokens: number;
    outputTokens: number;
    priced: boolean;
  }>;
}

/**
 * The streaming twin of `tutorCallLLM`, for the live turn. Usage is only known
 * once the stream ends, so the ledger line is written by `settle()`; the turn
 * engine calls it in a `finally` so an aborted turn is still charged.
 */
export async function tutorStreamLLM(input: TutorLlmStreamInput): Promise<TutorLlmStreamResult> {
  const resolved = await resolveModel(tutorModelSelection(input.source, input.band));
  let streamError: unknown = null;
  const result = streamLLM(
    {
      model: resolved.model,
      system: input.system,
      ...(input.messages ? { messages: input.messages } : { prompt: input.prompt ?? '' }),
      // A turn is two or three sentences of speech plus its drawings, and one
      // whiteboard payload is 30–60 tokens of JSON. At 700 the cap was cutting
      // a `[[wb …]]` tag in half, which the parser then had to drop, so the
      // learner heard "let us draw this" and saw nothing.
      maxOutputTokens: input.maxOutputTokens ?? 1_400,
      temperature: input.temperature ?? 0.4,
      // The SDK default (2 retries with backoff) turns a rate-limited provider
      // into half a minute of silence, which in a voice session is worse than a
      // clear error: the client retries the whole turn by `clientTurnId`.
      maxRetries: 1,
      // streamText suppresses provider errors and simply ends the text stream.
      // Without this the learner would get an empty turn and no error frame.
      onError: ({ error }: { error: unknown }) => {
        streamError = error;
      },
      ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
    },
    input.source,
    thinkingFor(input.source, resolved.thinkingConfig),
  );

  async function* guardedTextStream(): AsyncIterable<string> {
    for await (const chunk of result.textStream) yield chunk;
    if (streamError !== null) {
      throw streamError instanceof Error ? streamError : new Error(String(streamError));
    }
  }

  let settled: Promise<{
    cents: number;
    inputTokens: number;
    outputTokens: number;
    priced: boolean;
  }> | null = null;

  return {
    textStream: guardedTextStream(),
    modelString: resolved.modelString,
    settle() {
      settled ??= (async () => {
        let tokens = { inputTokens: 0, outputTokens: 0 };
        try {
          tokens = usageTokens(await result.totalUsage);
        } catch {
          // A stream that failed or was aborted still costs the input tokens;
          // the ledger records the hop with what the provider reported (zero
          // when it reported nothing) so the ceiling never loses a call.
        }
        const charge = await chargeUsage(input.db, input.scope, resolved.modelString, tokens);
        log.debug(
          `${input.source} ${resolved.modelString} in=${tokens.inputTokens} out=${tokens.outputTokens} cents=${charge.cents}`,
        );
        return { ...tokens, ...charge };
      })();
      return settled;
    },
  };
}

/** The first balanced JSON object in a model reply, or null. Tolerates code fences and prose around it. */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed: unknown = JSON.parse(text.slice(start, i + 1));
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
