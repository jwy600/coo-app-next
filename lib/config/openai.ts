export interface OpenAIModelConfig {
  model: string;
  chatTemperature: number;
  blockActionTemperature: number;
}

export const getOpenAIModelConfig = (): OpenAIModelConfig => {
  return {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    chatTemperature: 0.7,
    blockActionTemperature: 0.5,
  };
};

// Model pricing per 1M tokens (January 2025)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

export const calculateCost = (
  model: string,
  promptTokens: number,
  completionTokens: number
): number => {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (promptTokens / 1_000_000) * pricing.input +
         (completionTokens / 1_000_000) * pricing.output;
};
