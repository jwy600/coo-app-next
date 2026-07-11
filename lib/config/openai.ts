export interface OpenAIModelConfig {
  model: string;
}

export const getOpenAIModelConfig = (): OpenAIModelConfig => {
  return {
    model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
  };
};

// Model pricing per 1M tokens. Values are carryover estimates from the
// previous gpt-5.5 / gpt-5.4 / gpt-5.4-mini tiers (sol←5.5, terra←5.4,
// luna←5.4-mini) pending real gpt-5.6 pricing.
const MODEL_PRICING: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "gpt-5.6-sol": { input: 5.0, cachedInput: 0.5, output: 30.0 },
  "gpt-5.6-terra": { input: 2.5, cachedInput: 0.25, output: 15.0 },
  "gpt-5.6-luna": { input: 0.75, cachedInput: 0.075, output: 4.5 },
};

export const calculateCost = (
  model: string,
  promptTokens: number,
  completionTokens: number,
): number => {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output
  );
};
