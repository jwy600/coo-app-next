export type ModelType = 'gpt-5.2' | 'gpt-5-mini';
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export interface Settings {
  model: ModelType;
  reasoningEffort: ReasoningEffort;
  webSearchEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  model: 'gpt-5-mini',
  reasoningEffort: 'none',
  webSearchEnabled: false,
};
