export type ModelType = 'gpt-5.2' | 'gpt-5-mini';
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';
export type TranslateLanguage = 'English' | 'Chinese' | 'Spanish' | 'French';

export interface Settings {
  model: ModelType;
  reasoningEffort: ReasoningEffort;
  webSearchEnabled: boolean;
  translateLanguage: TranslateLanguage;
}

export const DEFAULT_SETTINGS: Settings = {
  model: 'gpt-5-mini',
  reasoningEffort: 'none',
  webSearchEnabled: false,
  translateLanguage: 'Chinese',
};
