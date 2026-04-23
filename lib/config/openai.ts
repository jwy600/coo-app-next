export interface OpenAIModelConfig {
  model: string;
}

export const getOpenAIModelConfig = (): OpenAIModelConfig => {
  return {
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  };
};

// Model pricing per 1M tokens (January 2026)
const MODEL_PRICING: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "gpt-5.4": { input: 2.5, cachedInput: 0.25, output: 15.0 },
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.075, output: 4.5 },
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
