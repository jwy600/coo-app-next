export interface OpenAIModelConfig {
  model: string;
}

export const getOpenAIModelConfig = (): OpenAIModelConfig => {
  return {
    model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
  };
};

// Model pricing per 1M tokens (input / cached input / output). Input and
// output are the published gpt-5.6 prices; cached input is ~10% of input
// (not published separately).
const MODEL_PRICING: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "gpt-5.6-sol": { input: 5.0, cachedInput: 0.5, output: 30.0 },
  "gpt-5.6-terra": { input: 2.5, cachedInput: 0.25, output: 15.0 },
  "gpt-5.6-luna": { input: 1.0, cachedInput: 0.1, output: 6.0 },
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
