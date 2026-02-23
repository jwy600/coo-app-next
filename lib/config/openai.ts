export interface OpenAIModelConfig {
  model: string;
}

export const getOpenAIModelConfig = (): OpenAIModelConfig => {
  return {
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
  };
};

// System prompts loaded from .md files via lib/config/prompts.ts
export {
  getChatPrompt,
  getDeveloperPrompt,
  getBlockActionPrompt,
  getTranslatePrompt,
} from "./prompts";

// Model pricing per 1M tokens (January 2026)
export const MODEL_PRICING: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "gpt-5.2": { input: 1.75, cachedInput: 0.175, output: 14.0 },
  "gpt-5.1": { input: 1.25, cachedInput: 0.125, output: 10.0 },
  "gpt-5": { input: 1.25, cachedInput: 0.125, output: 10.0 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
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
