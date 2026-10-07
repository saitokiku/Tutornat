// Model configuration — never hardcode model names in routes.
export const MODELS = {
  fast:  process.env.CLAUDE_MODEL_FAST  || 'claude-haiku-4-5-20251001',
  tutor: process.env.CLAUDE_MODEL_TUTOR || 'claude-sonnet-5',
  deep:  process.env.CLAUDE_MODEL_DEEP  || 'claude-opus-4-8',
};

// $ per 1M tokens (input, output) — estimates for the usage ledger
// Exported so the cost governor can price a call from REPORTED token usage
// rather than the length/4 estimate, which was blind to document/image blocks.
export const RATES = {
  [MODELS.fast]:  { in: 1,  out: 5 },
  [MODELS.tutor]: { in: 3,  out: 15 },
  [MODELS.deep]:  { in: 15, out: 75 },
};

export function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

export function estimateCost(model, inputText, outputText) {
  const r = RATES[model] || RATES[MODELS.tutor];
  const inTok = estimateTokens(inputText);
  const outTok = estimateTokens(outputText);
  return {
    input_tokens: inTok,
    output_tokens: outTok,
    usd: Number(((inTok * r.in + outTok * r.out) / 1e6).toFixed(6)),
  };
}

// Router: honor kill switches / plan tier
export function pickModel(tier, settings, plan) {
  if (tier === 'deep' && settings?.expensive_models_enabled === false) return MODELS.tutor;
  if (plan === 'free' && tier === 'deep') return MODELS.tutor;
  return MODELS[tier] || MODELS.tutor;
}
