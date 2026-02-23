export type ModelType = "gpt-5.2" | "gpt-5-mini";
export type ReasoningEffort = "none" | "low" | "medium" | "high";
export type ResponseLanguage = "en" | "es" | "fr" | "zh" | "ja";
export type TranslateLanguage =
  | "English"
  | "Chinese"
  | "Spanish"
  | "French"
  | "Japanese";
/**
 * Single source of truth for system prompts.
 * To add a new prompt: create prompts/{key}.md, then add an entry here.
 */
export const SYSTEM_PROMPT_OPTIONS = {
  developer: {
    label: "Knowledge Assistant",
    description: "Thorough explanations with examples",
  },
  chatgpt: {
    label: "ChatGPT",
    description: "Original ChatGPT style",
  },
} as const satisfies Record<string, { label: string; description: string }>;

export type SystemPromptFile = keyof typeof SYSTEM_PROMPT_OPTIONS;

/** Maps response language codes to full language names (for prompt injection) */
export const LANGUAGE_MAP: Record<ResponseLanguage, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  zh: "Simplified Chinese",
  ja: "Japanese",
};

/** Maps TranslateLanguage display names to ResponseLanguage codes */
export const TRANSLATE_TO_RESPONSE_MAP: Record<
  TranslateLanguage,
  ResponseLanguage
> = {
  English: "en",
  Spanish: "es",
  French: "fr",
  Chinese: "zh",
  Japanese: "ja",
};

/** Check if the response and translate languages are the same (a conflict) */
export const isLanguageConflict = (
  responseLang: ResponseLanguage,
  translateLang: TranslateLanguage,
): boolean => {
  return TRANSLATE_TO_RESPONSE_MAP[translateLang] === responseLang;
};

/** Get a sensible default translate language that doesn't conflict with the response language */
export const getDefaultTranslateLanguage = (
  responseLang: ResponseLanguage,
): TranslateLanguage => {
  if (responseLang === "en") return "Chinese";
  return "English";
};

export interface Settings {
  systemPromptFile: SystemPromptFile;
  model: ModelType;
  reasoningEffort: ReasoningEffort;
  webSearchEnabled: boolean;
  responseLanguage: ResponseLanguage;
  translateLanguage: TranslateLanguage;
}

export const DEFAULT_SETTINGS: Settings = {
  systemPromptFile: "developer",
  model: "gpt-5-mini",
  reasoningEffort: "none",
  webSearchEnabled: false,
  responseLanguage: "en",
  translateLanguage: "Chinese",
};
