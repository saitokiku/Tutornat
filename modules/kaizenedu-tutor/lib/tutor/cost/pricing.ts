/**
 * Prices per provider and model, in cents. The operator fills this table (or
 * sets TUTOR_PRICING_JSON with the same shape) from the vendors' price lists;
 * nothing here is a measured or quoted number. When a model is unpriced, the
 * ledger records `priced: false` and the session budget charges the
 * conservative estimate below so the ceiling still binds (spec R9).
 */
export interface LlmPrice {
  /** Cents per 1,000,000 input tokens. */
  inputPerMillion: number;
  /** Cents per 1,000,000 output tokens. */
  outputPerMillion: number;
}

export interface PricingTable {
  llm: Record<string, LlmPrice>;
  /** Cents per 1,000 characters, keyed by TTS provider id. */
  ttsPerThousandChars: Record<string, number>;
  /** Cents per minute of audio, keyed by ASR provider id. */
  asrPerMinute: Record<string, number>;
}

/** Ceilings applied when a model or provider is unpriced. Deliberately high. */
export const UNPRICED_ESTIMATE = {
  llmCentsPerThousandTokens: 1,
  ttsCentsPerThousandChars: 3,
  asrCentsPerMinute: 1,
} as const;

const EMPTY: PricingTable = { llm: {}, ttsPerThousandChars: {}, asrPerMinute: {} };

let cached: PricingTable | null = null;

export function pricingTable(): PricingTable {
  if (cached) return cached;
  const raw = process.env.TUTOR_PRICING_JSON?.trim();
  if (!raw) {
    cached = EMPTY;
    return cached;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PricingTable>;
    cached = {
      llm: parsed.llm ?? {},
      ttsPerThousandChars: parsed.ttsPerThousandChars ?? {},
      asrPerMinute: parsed.asrPerMinute ?? {},
    };
  } catch {
    cached = EMPTY;
  }
  return cached;
}

export interface PricedAmount {
  cents: number;
  priced: boolean;
}

export function llmCost(
  modelString: string,
  usage: { inputTokens: number; outputTokens: number },
): PricedAmount {
  const price = pricingTable().llm[modelString];
  if (price) {
    return {
      cents:
        (usage.inputTokens / 1_000_000) * price.inputPerMillion +
        (usage.outputTokens / 1_000_000) * price.outputPerMillion,
      priced: true,
    };
  }
  const tokens = usage.inputTokens + usage.outputTokens;
  return { cents: (tokens / 1000) * UNPRICED_ESTIMATE.llmCentsPerThousandTokens, priced: false };
}

export function ttsCost(providerId: string, characters: number): PricedAmount {
  const rate = pricingTable().ttsPerThousandChars[providerId];
  if (rate !== undefined) return { cents: (characters / 1000) * rate, priced: true };
  return { cents: (characters / 1000) * UNPRICED_ESTIMATE.ttsCentsPerThousandChars, priced: false };
}

export function asrCost(providerId: string, seconds: number): PricedAmount {
  const rate = pricingTable().asrPerMinute[providerId];
  if (rate !== undefined) return { cents: (seconds / 60) * rate, priced: true };
  return { cents: (seconds / 60) * UNPRICED_ESTIMATE.asrCentsPerMinute, priced: false };
}
